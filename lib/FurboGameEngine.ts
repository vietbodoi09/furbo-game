import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { connection } from "./connection";

// 🔥 PROGRAM ID của bạn
export const FURBO_PROGRAM_ID = new PublicKey('Z7wmp9MFSQ8HxoYV1xzj5MfzVBFsRUV9vVP3kUsWbEa');

// ========== DISCORDINATORS TỪ LOG TRƯỚC (ĐÃ TÍNH) ==========
const DISCRIMINATORS = {
  initialize_game: Buffer.from('2c3e66f77ed082d7', 'hex'),
  register_player: Buffer.from('f292c2eaea91e42a', 'hex'),
  game_action: Buffer.from('ab88c62f782cec7c', 'hex'),
  end_game: Buffer.from('e087f56343af79fc', 'hex'),
  update_session: Buffer.from('ad19eb4f28d99b67', 'hex'),
  batch_actions: Buffer.from('1dd472db841b1ee1', 'hex')
};

// ========== PDA FUNCTIONS ==========
export const getGameStatePDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('game_state')],
    FURBO_PROGRAM_ID
  );
};

export const getPlayerPDA = (sessionKey: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('player'), sessionKey.toBuffer()],
    FURBO_PROGRAM_ID
  );
};

// ========== INSTRUCTION BUILDERS ==========

// 🔥 Anchor serialize string: length (u32) + bytes
function serializeString(str: string): Buffer {
  const buffer = Buffer.from(str, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(buffer.length, 0);
  return Buffer.concat([lengthBuffer, buffer]);
}

// 1. initialize_game - NO ARGUMENTS
export const createInitializeGameIx = (
  gameStatePDA: PublicKey,
  signer: PublicKey
): TransactionInstruction => {
  const data = DISCRIMINATORS.initialize_game;
  
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

// 2. register_player - name: String, session_key: Pubkey
export const createRegisterPlayerIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  name: string,
  sessionKey: PublicKey
): TransactionInstruction => {
  
  const nameBuffer = serializeString(name);
  const sessionKeyBuffer = sessionKey.toBuffer();
  
  const data = Buffer.concat([
    DISCRIMINATORS.register_player,
    nameBuffer,
    sessionKeyBuffer
  ]);
  
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

// 3. game_action - action_type: u8, _x: u16, _y: u16
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
  
  data.writeUInt8(actionType, offset);
  offset += 1;
  
  data.writeUInt16LE(x, offset);
  offset += 2;
  
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

// 4. end_game - final_score: u64, final_kills: u32, final_shots: u32
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
  
  data.writeBigUInt64LE(BigInt(finalScore), offset);
  offset += 8;
  
  data.writeUInt32LE(finalKills, offset);
  offset += 4;
  
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

// ========== SIMPLE GAME ENGINE ==========

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
    
    console.log('🎮 Game Engine initialized');
  }

  // ========== PUBLIC API ==========
  
  setSession(sessionState: EstablishedSessionState | null) {
    this.sessionState = sessionState;
    if (sessionState) {
      this.updateChainState();
    } else {
      this.isRegistered = false;
      this.playerPDA = null;
      this.gameStatePDA = null;
    }
  }

  setName(name: string) {
    this.playerName = name.trim();
    console.log('👤 Player name:', this.playerName);
  }

  // 🔥 CORE: REGISTER PLAYER
  async registerPlayer(): Promise<boolean> {
    console.log('🚀 Starting player registration...');
    
    // Validate
    if (!this.sessionState) {
      alert('⚠️ Please connect wallet first!');
      return false;
    }
    
    if (!this.playerName || this.playerName.length < 3) {
      alert('Player name must be 3-20 characters!');
      return false;
    }
    
    try {
      const sessionKey = this.sessionState.sessionPublicKey;
      
      // Calculate PDAs
      const [playerPDA] = getPlayerPDA(sessionKey);
      const [gameStatePDA] = getGameStatePDA();
      
      this.playerPDA = playerPDA;
      this.gameStatePDA = gameStatePDA;
      
      console.log('📍 PDA Addresses:', {
        player: playerPDA.toString(),
        game: gameStatePDA.toString()
      });
      
      // Check if already registered
      const playerInfo = await connection.getAccountInfo(playerPDA);
      if (playerInfo) {
        console.log('✅ Player already registered');
        this.isRegistered = true;
        return true;
      }
      
      // Check/initialize game state
      const gameInfo = await connection.getAccountInfo(gameStatePDA);
      if (!gameInfo) {
        console.log('🔄 Initializing game state...');
        await this.initializeGame();
      }
      
      // Create and send transaction
      const instruction = createRegisterPlayerIx(
        playerPDA,
        gameStatePDA,
        sessionKey,
        this.playerName,
        sessionKey
      );
      
      console.log('📤 Sending registration transaction...');
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { 
          skipPreflight: true,  // ✅ Đặt true để test nhanh
          commitment: 'confirmed'
        }
      );
      
      console.log('⏳ Waiting for confirmation...');
      const result = await connection.confirmTransaction(signature, 'confirmed');
      
      if (result.value.err) {
        console.error('❌ Transaction failed:', result.value.err);
        alert('Registration failed! Check console for details.');
        return false;
      }
      
      console.log('✅ Registration successful!');
      this.isRegistered = true;
      
      alert(`🎉 Registration successful!\nPlayer: ${this.playerName}`);
      return true;
      
    } catch (error: any) {
      console.error('💥 Registration error:', error);
      
      let errorMsg = 'Registration failed';
      if (error.message?.includes('already in use')) {
        errorMsg = 'Player already registered';
        this.isRegistered = true;
        return true;
      } else if (error.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient SOL for transaction';
      } else if (error.message?.includes('Invalid instruction data')) {
        errorMsg = 'Program instruction error';
      }
      
      alert(`❌ ${errorMsg}\n${error.message?.substring(0, 100) || ''}`);
      return false;
    }
  }

  // Initialize game state
  async initializeGame(): Promise<boolean> {
    if (!this.sessionState) return false;
    
    try {
      const [gameStatePDA] = getGameStatePDA();
      
      // Check if already exists
      const gameInfo = await connection.getAccountInfo(gameStatePDA);
      if (gameInfo) {
        console.log('✅ Game already initialized');
        return true;
      }
      
      console.log('🔄 Creating game state...');
      
      const instruction = createInitializeGameIx(
        gameStatePDA,
        this.sessionState.sessionPublicKey
      );
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { skipPreflight: true, commitment: 'confirmed' }
      );
      
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('✅ Game initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Game initialization failed:', error);
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
        1,
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
      console.log(`📤 Sending ${type} transaction...`);
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { skipPreflight: true }
      );
      
      await connection.confirmTransaction(signature, 'confirmed');
      console.log(`✅ ${type} confirmed: ${signature}`);
      return signature;
      
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
        2,
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
    alert(`Game Over! Score: ${this.score}`);
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
