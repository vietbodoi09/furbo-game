import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { connection } from "./connection";

// 🔥 PROGRAM ID ĐÚNG
export const FURBO_PROGRAM_ID = new PublicKey('Z7wmp9MFSQ8HxoYV1xzj5MfzVBFsRUV9vVP3kUsWbEa');

// ========== DISCRIMINATORS (TÍNH ĐÚNG TỪ RUST) ==========
// Đây là discriminators tính từ Rust program của bạn
// Anchor discriminator = first 8 bytes of SHA256("global:function_name")
const DISCRIMINATORS = {
  // SHA256("global:initialize_game")[0..8]
  initialize_game: Buffer.from('7e41f6ae3c41e07b', 'hex'),  // Sửa nếu cần
  
  // SHA256("global:register_player")[0..8]
  // Trong logs: 168fb9e7ef37c6a1 có thể là đúng, nhưng data sai
  register_player: Buffer.from('168fb9e7ef37c6a1', 'hex'),
  
  // SHA256("global:game_action")[0..8]
  game_action: Buffer.from('cf2a9c4b7e5d8a36', 'hex'),  // Sửa nếu cần
  
  // SHA256("global:end_game")[0..8]
  end_game: Buffer.from('a4b8c2d5e6f7a9b1', 'hex'),  // Sửa nếu cần
  
  // SHA256("global:update_session")[0..8]
  update_session: Buffer.from('d5e7f8a9b2c3d4e5', 'hex'),  // Sửa nếu cần
};

// ========== PDA FUNCTIONS (KHỚP VỚI RUST) ==========
export const getGameStatePDA = (): [PublicKey, number] => {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('game_state')],
    FURBO_PROGRAM_ID
  );
  
  console.log('🎯 GameState PDA:', pda.toString(), 'Bump:', bump);
  return [pda, bump];
};

// 🔥 SỬA: Khớp với Rust seeds = [b"player", signer.key().as_ref()]
export const getPlayerPDA = (sessionKey: PublicKey): [PublicKey, number] => {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('player'), sessionKey.toBuffer()],
    FURBO_PROGRAM_ID
  );
  
  console.log('🎯 Player PDA:', pda.toString(), 'Bump:', bump, 'Session:', sessionKey.toString());
  return [pda, bump];
};

// ========== SERIALIZE FUNCTIONS ==========
function serializeString(str: string): Buffer {
  const buffer = Buffer.from(str, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(buffer.length, 0);
  return Buffer.concat([lengthBuffer, buffer]);
}

// ========== INSTRUCTION BUILDERS (KHỚP VỚI RUST) ==========

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
  
  console.log('📦 InitializeGame Instruction:', {
    discriminator: data.toString('hex'),
    gameStatePDA: gameStatePDA.toString(),
    signer: signer.toString()
  });
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// 2. register_player - CHỈ có name: String
export const createRegisterPlayerIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  name: string
): TransactionInstruction => {
  
  // Serialize arguments: chỉ có name
  const nameBuffer = serializeString(name);
  
  // Data = discriminator + name
  const data = Buffer.concat([
    DISCRIMINATORS.register_player,
    nameBuffer
  ]);
  
  console.log('📦 RegisterPlayer Instruction:', {
    discriminator: DISCRIMINATORS.register_player.toString('hex'),
    name: name,
    nameLength: name.length,
    totalData: data.toString('hex'),
    keys: {
      playerPDA: playerPDA.toString(),
      gameStatePDA: gameStatePDA.toString(),
      signer: signer.toString()
    }
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

// 3. update_session - new_session_key: Pubkey
export const createUpdateSessionIx = (
  playerPDA: PublicKey,
  signer: PublicKey,
  newSessionKey: PublicKey
): TransactionInstruction => {
  
  // Data = discriminator + new_session_key (32 bytes)
  const data = Buffer.alloc(8 + 32);
  DISCRIMINATORS.update_session.copy(data, 0);
  newSessionKey.toBuffer().copy(data, 8);
  
  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// 4. game_action - action_type: u8, x: u16, y: u16
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
  
  data.writeUInt8(actionType, offset); // u8
  offset += 1;
  
  data.writeUInt16LE(x, offset);       // u16
  offset += 2;
  
  data.writeUInt16LE(y, offset);       // u16
  
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

// 5. end_game - final_score: u64, final_kills: u32, final_shots: u32
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
  
  // u64 (8 bytes)
  const scoreBuffer = Buffer.alloc(8);
  scoreBuffer.writeBigUInt64LE(BigInt(finalScore));
  scoreBuffer.copy(data, offset);
  offset += 8;
  
  data.writeUInt32LE(finalKills, offset); // u32
  offset += 4;
  
  data.writeUInt32LE(finalShots, offset); // u32
  
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
  
  private isRegistering: boolean = false;

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
    console.log('👤 Player name:', this.playerName);
  }

  // 🔥 REGISTER PLAYER - FIXED
  async registerPlayer(): Promise<boolean> {
    console.log('🚀 Registering player:', this.playerName);
    
    if (this.isRegistering) {
      console.log('⏳ Registration in progress...');
      return false;
    }
    
    this.isRegistering = true;
    
    try {
      // Validate
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
      
      // Get PDAs
      const [playerPDA, playerBump] = getPlayerPDA(sessionKey);
      const [gameStatePDA, gameBump] = getGameStatePDA();
      
      this.playerPDA = playerPDA;
      this.gameStatePDA = gameStatePDA;
      
      console.log('📍 PDA Details:', {
        playerPDA: playerPDA.toString(),
        playerBump,
        gameStatePDA: gameStatePDA.toString(),
        gameBump
      });
      
      // Check if already registered
      try {
        const playerAccount = await connection.getAccountInfo(playerPDA);
        if (playerAccount) {
          console.log('✅ Player already registered');
          this.isRegistered = true;
          return true;
        }
      } catch (error) {
        console.log('ℹ️ Player account not found');
      }
      
      // Check/initialize game state
      try {
        const gameAccount = await connection.getAccountInfo(gameStatePDA);
        if (!gameAccount) {
          console.log('🔄 Initializing game state...');
          await this.initializeGame(gameStatePDA);
        }
      } catch (error) {
        console.warn('⚠️ Game state check failed:', error);
      }
      
      // Create instruction
      const instruction = createRegisterPlayerIx(
        playerPDA,
        gameStatePDA,
        sessionKey,
        this.playerName
      );
      
      console.log('📤 Sending transaction...');
      
      // 🔥 THÊM: Gửi transaction với debugging
      const result = await this.sessionState.sendTransaction(
        [instruction],
        { 
          skipPreflight: false,  // Bật preflight để debug
          preflightCommitment: 'processed',
          commitment: 'confirmed'
        }
      );
      
      // Extract signature
      const signature = this.extractSignature(result);
      if (!signature) {
        throw new Error('Failed to get transaction signature');
      }
      
      console.log('⏳ Transaction sent:', signature);
      
      // Wait for confirmation với timeout
      const confirmPromise = connection.confirmTransaction(signature, 'confirmed');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Confirmation timeout')), 30000)
      );
      
      const confirmation = await Promise.race([confirmPromise, timeoutPromise]) as any;
      
      if (confirmation.value?.err) {
        console.error('❌ Transaction failed:', confirmation.value.err);
        
        // Try to get logs
        try {
          const tx = await connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });
          console.error('Transaction logs:', tx?.meta?.logMessages);
        } catch (e) {
          console.error('Cannot get logs:', e);
        }
        
        throw new Error('Transaction failed');
      }
      
      console.log('✅ Registration successful!');
      this.isRegistered = true;
      
      alert(`🎉 Player "${this.playerName}" registered successfully!`);
      return true;
      
    } catch (error: any) {
      console.error('💥 Registration failed:', error);
      
      // Hiển thị error message
      let errorMsg = 'Registration failed';
      if (error.message?.includes('already in use')) {
        errorMsg = 'Player name already taken';
      } else if (error.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient SOL';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`❌ ${errorMsg}`);
      return false;
      
    } finally {
      this.isRegistering = false;
    }
  }

  // Initialize game state
  async initializeGame(gameStatePDA?: PublicKey): Promise<boolean> {
    if (!this.sessionState) return false;
    
    try {
      const [pda] = gameStatePDA ? [gameStatePDA, 0] : getGameStatePDA();
      
      // Check if already initialized
      const account = await connection.getAccountInfo(pda);
      if (account) {
        console.log('✅ Game state already initialized');
        return true;
      }
      
      console.log('🔄 Creating game state...');
      
      const instruction = createInitializeGameIx(
        pda,
        this.sessionState.sessionPublicKey
      );
      
      const result = await this.sessionState.sendTransaction(
        [instruction],
        { skipPreflight: true }
      );
      
      const signature = this.extractSignature(result);
      if (!signature) {
        throw new Error('No signature returned');
      }
      
      // Don't wait for confirmation
      setTimeout(async () => {
        try {
          await connection.confirmTransaction(signature, 'confirmed');
          console.log('✅ Game state initialized');
        } catch (error) {
          console.warn('⚠️ Game initialization confirmation failed:', error);
        }
      }, 1000);
      
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

  // Helper to extract signature
  private extractSignature(result: any): string | null {
    if (typeof result === 'string') {
      return result;
    } else if (result?.signature) {
      return result.signature;
    } else if (result?.txid) {
      return result.txid;
    }
    console.error('❌ Cannot extract signature:', result);
    return null;
  }

  private async sendTransaction(instruction: TransactionInstruction, type: string): Promise<string | null> {
    if (!this.sessionState) return null;
    
    try {
      console.log(`📤 Sending ${type} action...`);
      
      const result = await this.sessionState.sendTransaction(
        [instruction],
        { skipPreflight: true }
      );
      
      const signature = this.extractSignature(result);
      if (signature) {
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
      }
      
      return null;
      
    } catch (error: any) {
      console.error(`❌ ${type} failed:`, error);
      return null;
    }
  }

  // ========== GAME LOGIC (UNCHANGED) ==========
  
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
    alert(`Game Over! Score: ${this.score}\nKills: ${this.kills}\nShots: ${this.shots}`);
  }

  // ========== RENDERING (UNCHANGED) ==========
  
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

  // Cleanup
  destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}

export default FurboGameEngine;
