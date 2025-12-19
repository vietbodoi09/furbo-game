import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { connection } from "./connection";

// Import từ file gameInstructions.ts riêng biệt
import { 
  FURBO_PROGRAM_ID, 
  getGameStatePDA, 
  getPlayerPDA, 
  createInitializeGameIx, 
  createRegisterPlayerIx,
  createGameActionIx,
  createEndGameIx,
  ACCOUNT_SIZES
} from "./gameInstructions";

// ========== FURBO GAME ENGINE ==========

export class FurboGameEngine {
  // ========== PROPERTIES ==========
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sessionState: EstablishedSessionState | null = null;
  
  // Game state
  private playerName: string = '';
  private isRegistered: boolean = false;
  private playerPDA: PublicKey | null = null;
  private gameStatePDA: PublicKey | null = null;
  
  // Game stats
  private score: number = 0;
  private kills: number = 0;
  private shots: number = 0;
  private isRunning: boolean = false;
  private gameLoopId: number | null = null;
  
  // Game objects
  private player = { x: 0, y: 0, width: 70, height: 80, speed: 8 };
  private bullets: any[] = [];
  private enemies: any[] = [];
  private keysPressed: { [key: string]: boolean } = {};
  
  // Flags
  private isRegistering: boolean = false;
  private isInitializing: boolean = false;
  updateSession(sessionState: EstablishedSessionState | null) {
    // Đơn giản gọi setSession (hoặc logic riêng nếu cần)
    this.setSession(sessionState);
    console.log('🔄 Session updated via updateSession method');
  }
  setPlayerName(name: string): void {
    this.playerName = name.trim();
    console.log('👤 Player name set to:', this.playerName);
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    
    // Center player
    this.player.x = canvas.width / 2 - 35;
    this.player.y = canvas.height - 100;
    
    this.setupEventListeners();
    this.render();
    
    console.log('🎮 FurboGameEngine initialized');
  }

  // ========== PUBLIC API ==========

  setSession(sessionState: EstablishedSessionState | null) {
    this.sessionState = sessionState;
    if (sessionState) {
      console.log('🔗 Session connected:', sessionState.sessionPublicKey.toString());
      this.updateChainState();
    } else {
      console.log('🔗 Session disconnected');
      this.isRegistered = false;
      this.playerPDA = null;
      this.gameStatePDA = null;
    }
  }

  setName(name: string) {
    this.playerName = name.trim();
    console.log('👤 Player name set to:', this.playerName);
  }

  pause() {
    this.stop();
  }

  // ========== CORE GAME FUNCTIONS ==========

  /**
   * REGISTER PLAYER - Main function
   */
  async registerPlayer(): Promise<boolean> {
    console.log('🚀 REGISTER PLAYER - CORRECT VERSION');
    
    if (this.isRegistering) return false;
    this.isRegistering = true;
    
    try {
      // 1. VALIDATE
      if (!this.sessionState) {
        alert('⚠️ Please connect wallet first!');
        return false;
      }
      
      if (!this.playerName || this.playerName.length < 3 || this.playerName.length > 20) {
        alert('Player name must be 3-20 characters!');
        return false;
      }
      
      const sessionKey = this.sessionState.sessionPublicKey;
      console.log('🔑 Session Key:', sessionKey.toString());
      
      // 2. CALCULATE PDAs
      console.log('\n🎯 Calculating PDAs:');
      const [playerPDA, playerBump] = getPlayerPDA(sessionKey);
      const [gameStatePDA, gameStateBump] = getGameStatePDA();
      
      this.playerPDA = playerPDA;
      this.gameStatePDA = gameStatePDA;
      
      console.log('✅ Player PDA:', playerPDA.toString());
      console.log('✅ GameState PDA:', gameStatePDA.toString());
      
      // 3. CHECK IF ALREADY REGISTERED
      console.log('\n🔍 Checking existing player...');
      const existingPlayer = await connection.getAccountInfo(playerPDA);
      
      if (existingPlayer) {
        console.log('✅ Player already registered');
        this.isRegistered = true;
        alert('✅ Player already registered!');
        return true;
      }
      
      // 4. CHECK IF GAME STATE EXISTS
      const existingGameState = await connection.getAccountInfo(gameStatePDA);
      console.log('GameState exists:', !!existingGameState);
      
      // 5. CREATE INSTRUCTIONS
      const instructions: TransactionInstruction[] = [];
      
      // Nếu GameState chưa tồn tại, thêm initialize instruction
      if (!existingGameState) {
        console.log('\n🔄 Adding InitializeGame instruction...');
        const initIx = createInitializeGameIx(gameStatePDA, sessionKey);
        instructions.push(initIx);
      }
      
      // THÊM DUY NHẤT RegisterPlayer instruction
      // ✅ Anchor sẽ tự động tạo account!
      console.log('\n📝 Adding RegisterPlayer instruction...');
      const registerIx = createRegisterPlayerIx(
        playerPDA,
        gameStatePDA,
        sessionKey,
        this.playerName,
        sessionKey
      );
      instructions.push(registerIx);
      
      console.log('📦 Total instructions:', instructions.length);
      
      // 6. GỬI TRANSACTION - Paymaster sẽ sign và trả phí GAS
      // ✅ Phần rent sẽ được trừ từ SOL trong session wallet
      console.log('\n📤 Sending transaction via Fogo Sessions...');
      console.log('💡 Paymaster will sign and pay for GAS');
      console.log('💰 Rent (~0.01 SOL) will come from session wallet balance');
      
      // HIỂN THỊ THÔNG TIN CHO USER
      const userConfirmed = window.confirm(
        `Register player "${this.playerName}"?\n\n` +
        `✅ Transaction fees: Covered by Fogo Paymaster\n` +
        `💰 Account creation: Needs ~0.01 SOL from your wallet\n\n` +
        `Make sure you have SOL in your session wallet!`
      );
      
      if (!userConfirmed) {
        console.log('User cancelled registration');
        return false;
      }
      
      const result = await this.sessionState.sendTransaction(
        instructions,
        { 
          skipPreflight: false,
          maxRetries: 3,
          commitment: 'confirmed'
        }
      );
      
      // 7. WAIT FOR CONFIRMATION
      console.log('⏳ Waiting for confirmation...');
      const signature = typeof result === 'string' ? result : result?.signature || result?.txid;
      
      if (!signature) {
        throw new Error('No transaction signature returned');
      }
      
      console.log('✅ Transaction sent:', signature);
      
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      // 8. UPDATE STATE
      this.isRegistered = true;
      console.log('🎉 Player registered successfully!');
      alert('✅ Player registered successfully!\n\nAll transaction fees covered by Fogo Paymaster.');
      
      return true;
      
    } catch (error: any) {
      console.error('💥 REGISTRATION FAILED:', error);
      
      // XỬ LÝ LỖI CỤ THỂ
      if (error.message?.includes('insufficient funds') || 
          error.message?.includes('0x0') ||
          error.message?.includes('InsufficientFundsForRent')) {
        
        console.error('❌ INSUFFICIENT SOL FOR RENT!');
        alert(
          '❌ Registration failed!\n\n' +
          'Your session wallet needs SOL for account creation (rent).\n\n' +
          '🔧 Quick fix:\n' +
          '1. Go to: https://solfaucet.com/\n' +
          '2. Enter your session address:\n' +
          '   ' + this.sessionState?.sessionPublicKey.toString() + '\n' +
          '3. Get 0.05 SOL (free)\n' +
          '4. Try again!\n\n' +
          '💡 Transaction fees are already covered by Fogo Paymaster.'
        );
        
      } else if (error.message?.includes('custom program error: 0x0')) {
        console.error('❌ Program error - check instruction data');
        alert('Registration failed: Program rejected the transaction. Check console for details.');
      } else {
        alert('Registration failed: ' + error.message);
      }
      
      return false;
    } finally {
      this.isRegistering = false;
    }
  }

  // Start game
  start() {
    if (!this.isRegistered) {
      alert('❌ Please register player first!');
      return;
    }
    
    if (this.isRunning) return;
    
    console.log('🎮 Starting game...');
    this.isRunning = true;
    this.reset();
    this.gameLoop();
  }

  // Stop game
  stop() {
    this.isRunning = false;
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
  }

  // Reset game state
  reset() {
    this.score = 0;
    this.kills = 0;
    this.shots = 0;
    this.bullets = [];
    this.enemies = [];
    this.player.x = this.canvas.width / 2 - 35;
  }

  // Shoot action
  async shoot() {
    if (!this.isRunning || !this.canSendAction()) return;
    
    // Add bullet locally
    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 4,
      y: this.player.y - 20,
      width: 8,
      height: 20,
      speed: 15
    });
    
    this.shots++;
    
    // Send to chain
    try {
      const instruction = createGameActionIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,
        1, // shoot action
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction(instruction, 'shoot');
    } catch (error) {
      console.error('Shoot action failed:', error);
    }
  }

  // End game and save score
  async endGame() {
    if (!this.canSendAction()) return;
    
    try {
      const instruction = createEndGameIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,
        this.score,
        this.kills,
        this.shots
      );
      
      await this.sendTransaction(instruction, 'end_game');
      console.log('🎯 Game saved to chain');
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  // Cleanup
  destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  // ========== PRIVATE METHODS ==========

  private updateChainState() {
    if (!this.sessionState) return;
    
    const [playerPDA] = getPlayerPDA(this.sessionState.sessionPublicKey);
    const [gameStatePDA] = getGameStatePDA();
    
    this.playerPDA = playerPDA;
    this.gameStatePDA = gameStatePDA;
    
    this.checkRegistration();
  }

  private async checkRegistration() {
    if (!this.sessionState || !this.playerPDA) return;
    
    try {
      const accountInfo = await connection.getAccountInfo(this.playerPDA);
      this.isRegistered = !!accountInfo;
      
      if (this.isRegistered) {
        console.log('✅ Player is registered on-chain');
      }
      
    } catch (error) {
      console.error('Check registration error:', error);
    }
  }

  private canSendAction(): boolean {
    return !!(this.sessionState && this.isRegistered && this.playerPDA && this.gameStatePDA);
  }

  private async sendTransaction(instruction: TransactionInstruction, type: string): Promise<string | null> {
    if (!this.sessionState) return null;
    
    try {
      console.log(`📤 Sending ${type} action...`);
      
      const result = await this.sessionState.sendTransaction(
        [instruction],
        { skipPreflight: true }
      );
      
      const signature = typeof result === 'string' ? result : result?.signature || result?.txid;
      
      if (signature) {
        console.log(`✅ ${type} sent:`, signature.slice(0, 16) + '...');
        
        // Confirm asynchronously
        setTimeout(async () => {
          try {
            await connection.confirmTransaction(signature, 'confirmed');
            console.log(`✅ ${type} confirmed`);
          } catch (error) {
            console.warn(`⚠️ ${type} confirmation failed:`, error);
          }
        }, 1000);
        
        return signature;
      }
      
      return null;
      
    } catch (error: any) {
      console.error(`❌ ${type} failed:`, error);
      return null;
    }
  }

  // ========== GAME LOGIC ==========

  private gameLoop() {
    if (!this.isRunning) return;
    
    this.update();
    this.render();
    this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    // Move player
    if (this.keysPressed['ArrowLeft']) {
      this.player.x = Math.max(0, this.player.x - this.player.speed);
    }
    if (this.keysPressed['ArrowRight']) {
      this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + this.player.speed);
    }
    
    // Update bullets
    this.bullets = this.bullets.filter(bullet => {
      bullet.y -= bullet.speed;
      
      // Check collision with enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (this.checkCollision(bullet, enemy)) {
          this.enemies.splice(i, 1);
          this.score += 100;
          this.kills++;
          
          this.sendKillAction();
          return false;
        }
      }
      
      return bullet.y > -bullet.height;
    });
    
    // Spawn enemies
    if (Math.random() < 0.02 && this.enemies.length < 10) {
      this.enemies.push({
        x: Math.random() * (this.canvas.width - 50),
        y: -50,
        width: 50,
        height: 50,
        speed: 1 + Math.random() * 2
      });
    }
    
    // Update enemies
    this.enemies = this.enemies.filter(enemy => {
      enemy.y += enemy.speed;
      
      if (this.checkCollision(this.player, enemy)) {
        this.gameOver();
        return false;
      }
      
      return enemy.y < this.canvas.height;
    });
  }

  private async sendKillAction() {
    if (!this.canSendAction()) return;
    
    try {
      const instruction = createGameActionIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,
        2, // kill action
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction(instruction, 'kill');
    } catch (error) {
      console.error('Kill action failed:', error);
    }
  }

  private checkCollision(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  private gameOver() {
    this.stop();
    this.endGame();
    alert(`Game Over!\nScore: ${this.score}\nKills: ${this.kills}\nShots: ${this.shots}`);
  }

  // ========== RENDERING ==========

  private render() {
    // Clear canvas
    this.ctx.fillStyle = '#0a1929';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw grid
    this.drawGrid();
    
    // Draw player
    this.drawPlayer();
    
    // Draw bullets
    this.ctx.fillStyle = '#ffde59';
    this.bullets.forEach(bullet => {
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    // Draw enemies
    this.ctx.fillStyle = '#ff416c';
    this.enemies.forEach(enemy => {
      this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
    
    // Draw UI
    this.drawUI();
  }

  private drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 212, 255, 0.05)';
    this.ctx.lineWidth = 1;
    
    const gridSize = 50;
    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawPlayer() {
    this.ctx.fillStyle = '#00d4ff';
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x + 35, this.player.y);
    this.ctx.lineTo(this.player.x, this.player.y + 80);
    this.ctx.lineTo(this.player.x + 70, this.player.y + 80);
    this.ctx.closePath();
    this.ctx.fill();
  }

  private drawUI() {
    // Score panel
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 200, 100);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 30);
    this.ctx.fillText(`KILLS: ${this.kills}`, 20, 50);
    this.ctx.fillText(`SHOTS: ${this.shots}`, 20, 70);
    
    if (this.playerName) {
      this.ctx.fillStyle = this.isRegistered ? '#00ff88' : '#ffde59';
      this.ctx.fillText(`PLAYER: ${this.playerName}`, 20, 90);
      this.ctx.fillStyle = this.isRegistered ? '#00ff88' : '#ff4444';
      this.ctx.fillText(`STATUS: ${this.isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}`, 20, 110);
    }
  }

  // ========== EVENT HANDLERS ==========

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.isRunning) {
        if (this.isRegistered) {
          this.start();
        } else {
          alert('Please register player first!');
        }
      } else {
        this.shoot();
      }
    } else if (this.isRunning) {
      this.keysPressed[e.code] = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = false;
  };

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }
}

export default FurboGameEngine;
