// fogo-game-engine.ts
import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { 
  TransactionInstruction, 
  PublicKey, 
  SystemProgram,
  Connection 
} from '@solana/web3.js';
import { Buffer } from 'buffer';

// 🔥 PROGRAM CONFIG
export const FURBO_PROGRAM_ID = new PublicKey('Z7wmp9MFSQ8HxoYV1xzj5MfzVBFsRUV9vVP3kUsWbEa');
export const connection = new Connection('https://testnet.fogo.io', 'confirmed');

// 🔥 DISCIMINATORS - FROM YOUR LOGS
const DISCRIMINATORS = {
  // 🔴 TODO: Run test in Rust to get correct discriminators
  // Run: anchor test --skip-local-validator
  initialize_game: Buffer.from('2c3e66f77ed082d7', 'hex'),  // Placeholder
  register_player: Buffer.from('f292c2eaea91e42a', 'hex'), // ✅ From your logs
  game_action: Buffer.from('ab88c62f782cec7c', 'hex'),     // Placeholder
  end_game: Buffer.from('e087f56343af79fc', 'hex'),       // Placeholder
  update_session: Buffer.from('ad19eb4f28d99b67', 'hex'), // Placeholder
  batch_actions: Buffer.from('1dd472db841b1ee1', 'hex')   // Placeholder
};

// ========== PDA FUNCTIONS ==========
export const getGameStatePDA = (): [PublicKey, number] => {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('game_state')],
    FURBO_PROGRAM_ID
  );
  return [pda, bump];
};

export const getPlayerPDA = (sessionKey: PublicKey): [PublicKey, number] => {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('player'), sessionKey.toBuffer()],
    FURBO_PROGRAM_ID
  );
  return [pda, bump];
};

// ========== INSTRUCTION BUILDERS ==========

// Helper: Serialize string for Anchor (length-prefixed)
function serializeString(str: string): Buffer {
  const strBuffer = Buffer.from(str, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(strBuffer.length, 0);
  return Buffer.concat([lengthBuffer, strBuffer]);
}

// 1. initialize_game
export const createInitializeGameIx = (
  gameStatePDA: PublicKey,
  signer: PublicKey
): TransactionInstruction => {
  const data = DISCRIMINATORS.initialize_game; // Only discriminator
  
  const keys = [
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// 2. register_player - CRITICAL: MUST MATCH YOUR RUST CODE
export const createRegisterPlayerIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  name: string,
  sessionKey: PublicKey
): TransactionInstruction => {
  // Data format: discriminator + name + session_key
  const data = Buffer.concat([
    DISCRIMINATORS.register_player,  // 8 bytes
    serializeString(name),           // 4 bytes length + name bytes
    sessionKey.toBuffer()            // 32 bytes session key
  ]);
  
  console.log('📊 RegisterPlayer Instruction Data:', {
    discriminator: DISCRIMINATORS.register_player.toString('hex'),
    name: name,
    nameLength: name.length,
    sessionKey: sessionKey.toString(),
    totalDataLength: data.length,
    dataHex: data.toString('hex').substring(0, 50) + '...'
  });
  
  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// 3. game_action
export const createGameActionIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  actionType: number,
  x: number,
  y: number
): TransactionInstruction => {
  const data = Buffer.alloc(8 + 1 + 2 + 2);
  let offset = 0;
  
  DISCRIMINATORS.game_action.copy(data, offset);
  offset += 8;
  data.writeUInt8(actionType, offset); offset += 1;
  data.writeUInt16LE(x, offset); offset += 2;
  data.writeUInt16LE(y, offset);
  
  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// 4. end_game
export const createEndGameIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  finalScore: number,
  finalKills: number,
  finalShots: number
): TransactionInstruction => {
  const data = Buffer.alloc(8 + 8 + 4 + 4);
  let offset = 0;
  
  DISCRIMINATORS.end_game.copy(data, offset);
  offset += 8;
  data.writeBigUInt64LE(BigInt(finalScore), offset); offset += 8;
  data.writeUInt32LE(finalKills, offset); offset += 4;
  data.writeUInt32LE(finalShots, offset);
  
  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// ========== GAME ENGINE ==========

export class FurboGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sessionState: EstablishedSessionState | null = null;
  
  private playerName: string = '';
  private isRegistered: boolean = false;
  private playerPDA: PublicKey | null = null;
  private gameStatePDA: PublicKey | null = null;
  
  private score: number = 0;
  private kills: number = 0;
  private shots: number = 0;
  private isRunning: boolean = false;
  private gameLoopId: number | null = null;
  
  private player = { x: 0, y: 0, width: 70, height: 80, speed: 8 };
  private bullets: any[] = [];
  private enemies: any[] = [];
  private keysPressed: { [key: string]: boolean } = {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    
    this.player.x = canvas.width / 2 - 35;
    this.player.y = canvas.height - 100;
    
    this.setupEventListeners();
    this.render();
    
    console.log('🎮 Furbo Game Engine initialized');
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

  setPlayerName(name: string) {
    this.playerName = name.trim();
    console.log('👤 Player name:', this.playerName);
  }

  // 🔥 FIXED: registerPlayer with proper error handling
  async registerPlayer(): Promise<boolean> {
    console.log('🚀 Registering player:', this.playerName);
    
    try {
      // 1. Validate inputs
      if (!this.sessionState) {
        alert('⚠️ Please connect wallet first!');
        return false;
      }
      
      if (!this.playerName || this.playerName.length < 3) {
        alert('⚠️ Name must be 3-20 characters!');
        return false;
      }
      
      const sessionKey = this.sessionState.sessionPublicKey;
      console.log('🔑 Using session key:', sessionKey.toString());
      
      // 2. Get PDAs
      const [playerPDA] = getPlayerPDA(sessionKey);
      const [gameStatePDA] = getGameStatePDA();
      
      console.log('📍 Player PDA:', playerPDA.toString());
      console.log('📍 GameState PDA:', gameStatePDA.toString());
      
      // 3. Check if already registered
      const existingPlayer = await connection.getAccountInfo(playerPDA);
      if (existingPlayer) {
        console.log('✅ Player already registered');
        this.isRegistered = true;
        this.playerPDA = playerPDA;
        this.gameStatePDA = gameStatePDA;
        return true;
      }
      
      // 4. Check if game state exists, initialize if not
      const existingGameState = await connection.getAccountInfo(gameStatePDA);
      if (!existingGameState) {
        console.log('🔄 Game state not found, initializing...');
        try {
          const initIx = createInitializeGameIx(gameStatePDA, sessionKey);
          await this.sendTransaction([initIx], 'initialize_game');
          console.log('✅ Game state initialized');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
        } catch (initError) {
          console.error('❌ Failed to initialize game state:', initError);
        }
      }
      
      // 5. Create register instruction
      const registerIx = createRegisterPlayerIx(
        playerPDA,
        gameStatePDA,
        sessionKey,
        this.playerName,
        sessionKey
      );
      
      console.log('📤 Sending register instruction...');
      
      // 6. Send transaction via Session SDK
      const signature = await this.sendTransaction([registerIx], 'register_player');
      if (!signature) {
        throw new Error('Transaction failed');
      }
      
      console.log('✅ Registration submitted! TX:', signature);
      console.log('🔗 Explorer:', `https://fogoscan.com/tx/${signature}`);
      
      // 7. Verify account was created
      await new Promise(resolve => setTimeout(resolve, 2000));
      const finalAccount = await connection.getAccountInfo(playerPDA);
      if (!finalAccount) {
        console.error('❌ Player account not created after transaction!');
        return false;
      }
      
      this.isRegistered = true;
      this.playerPDA = playerPDA;
      this.gameStatePDA = gameStatePDA;
      
      console.log('🎉 Player registered successfully!');
      return true;
      
    } catch (error: any) {
      console.error('💥 Registration failed:', error);
      
      // Log detailed error info
      if (error.logs) {
        console.error('📋 Program logs:', error.logs);
      }
      
      if (error.message?.includes('3012')) {
        console.error('💡 FIX: Program expects #[account(init)] in Rust or account creation failed');
        alert('❌ Account initialization failed. Check program configuration.');
      }
      
      if (error.message?.includes('400')) {
        console.error('💡 FIX: Paymaster rejected transaction. Sponsor may need more SOL.');
        alert('❌ Transaction rejected by paymaster.');
      }
      
      return false;
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

  // Reset game
  reset() {
    this.score = 0;
    this.kills = 0;
    this.shots = 0;
    this.bullets = [];
    this.enemies = [];
    this.player.x = this.canvas.width / 2 - 35;
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
      
      await this.sendTransaction([instruction], 'end_game');
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
        console.log('✅ Player is registered');
      }
    } catch (error) {
      console.error('Check registration error:', error);
    }
  }

  private canSendAction(): boolean {
    return !!(this.sessionState && this.isRegistered && this.playerPDA && this.gameStatePDA);
  }

  // Helper to send transaction via Session SDK
  private async sendTransaction(
    instructions: TransactionInstruction[], 
    type: string
  ): Promise<string | null> {
    if (!this.sessionState) return null;
    
    try {
      console.log(`📤 Sending ${type}...`);
      
      // Session SDK handles: building, signing, fee payment via paymaster
      const result = await this.sessionState.sendTransaction(
        instructions,
        { 
          skipPreflight: false, // Keep false for debugging
          maxRetries: 2
        }
      );
      
      // Extract signature from response
      let signature: string;
      if (typeof result === 'string') {
        signature = result;
      } else if (result?.signature) {
        signature = result.signature;
      } else {
        console.error('❌ Invalid response:', result);
        return null;
      }
      
      console.log(`✅ ${type} sent:`, signature.slice(0, 16) + '...');
      
      // Confirm async
      setTimeout(async () => {
        try {
          await connection.confirmTransaction(signature, 'confirmed');
          console.log(`✅ ${type} confirmed`);
        } catch (error) {
          console.warn(`⚠️ ${type} confirmation failed:`, error);
        }
      }, 1000);
      
      return signature;
      
    } catch (error: any) {
      console.error(`❌ ${type} failed:`, error);
      
      if (error.logs) {
        console.error('📋 Error logs:', error.logs);
      }
      
      throw error;
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
          
          // Send kill action to chain
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
      
      await this.sendTransaction([instruction], 'kill');
    } catch (error) {
      console.error('Kill action failed:', error);
    }
  }

  // Shoot action
  async shoot() {
    if (!this.isRunning || !this.canSendAction()) return;
    
    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 4,
      y: this.player.y - 20,
      width: 8,
      height: 20,
      speed: 15
    });
    
    this.shots++;
    
    try {
      const instruction = createGameActionIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,
        1, // shoot action
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction([instruction], 'shoot');
    } catch (error) {
      console.error('Shoot action failed:', error);
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
    this.ctx.fillRect(10, 10, 180, 90);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 30);
    this.ctx.fillText(`KILLS: ${this.kills}`, 20, 50);
    this.ctx.fillText(`SHOTS: ${this.shots}`, 20, 70);
    
    if (this.playerName) {
      this.ctx.fillStyle = this.isRegistered ? '#00ff88' : '#ffde59';
      this.ctx.fillText(this.playerName, 20, 90);
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
