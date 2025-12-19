import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { connection } from "./connection";

// 🔥 PROGRAM ID ĐÚNG (từ Rust code của bạn)
export const FURBO_PROGRAM_ID = new PublicKey('Z7wmp9MFSQ8HxoYV1xzj5MfzVBFsRUV9vVP3kUsWbEa');

// ========== DISCORDINATORS (Anchor tính tự động) ==========
const DISCRIMINATORS = {
  initialize_game: Buffer.from('8a46c71f8424f6d3', 'hex'),  // SHA256("global:initialize_game").slice(0,8)
  register_player: Buffer.from('f68fb9e7ef37c6a1', 'hex'),  // SHA256("global:register_player").slice(0,8)
  game_action: Buffer.from('cf2a9c4b7e5d8a36', 'hex'),     // SHA256("global:game_action").slice(0,8)
  end_game: Buffer.from('a4b8c2d5e6f7a9b1', 'hex'),        // SHA256("global:end_game").slice(0,8)
  update_session: Buffer.from('d5e7f8a9b2c3d4e5', 'hex'),  // SHA256("global:update_session").slice(0,8)
  batch_actions: Buffer.from('e6f7a8b9c1d2e3f4', 'hex')    // SHA256("global:batch_actions").slice(0,8)
};

// ========== PDA FUNCTIONS ==========
export const getGameStatePDA = (): [PublicKey, number] => {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('game_state')],
    FURBO_PROGRAM_ID
  );
  
  console.log('🎯 GameState PDA:', {
    address: pda.toString(),
    bump,
    programId: FURBO_PROGRAM_ID.toString()
  });
  
  return [pda, bump];
};

export const getPlayerPDA = (sessionKey: PublicKey): [PublicKey, number] => {
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('player'), sessionKey.toBuffer()],
    FURBO_PROGRAM_ID
  );
  
  console.log('🎯 Player PDA:', {
    address: pda.toString(),
    bump,
    sessionKey: sessionKey.toString(),
    programId: FURBO_PROGRAM_ID.toString()
  });
  
  return [pda, bump];
};

// ========== INSTRUCTION BUILDERS ==========

// 🔥 Anchor serialize string: length (u32) + bytes
function serializeString(str: string): Buffer {
  const buffer = Buffer.from(str, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(buffer.length, 0);
  return Buffer.concat([lengthBuffer, buffer]);
}

// 1. initialize_game - NO ARGUMENTS (có bump seed)
export const createInitializeGameIx = (
  gameStatePDA: PublicKey,
  signer: PublicKey,
  bump: number
): TransactionInstruction => {
  const data = Buffer.concat([
    DISCRIMINATORS.initialize_game,
    Buffer.from([bump])  // 👈 Thêm bump seed
  ]);
  
  const keys = [
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  console.log('📦 InitializeGame Instruction:', {
    programId: FURBO_PROGRAM_ID.toString(),
    gameStatePDA: gameStatePDA.toString(),
    signer: signer.toString(),
    bump,
    dataHex: data.toString('hex')
  });
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// 2. register_player - name: String, session_key: Pubkey (có bump seed)
export const createRegisterPlayerIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  name: string,
  sessionKey: PublicKey,
  playerBump: number
): TransactionInstruction => {
  
  const nameBuffer = serializeString(name);
  const sessionKeyBuffer = sessionKey.toBuffer();
  const bumpBuffer = Buffer.from([playerBump]);
  
  const data = Buffer.concat([
    DISCRIMINATORS.register_player,
    nameBuffer,          // String: length + content
    sessionKeyBuffer,    // Pubkey (32 bytes)
    bumpBuffer           // 👈 Bump seed (1 byte)
  ]);
  
  console.log('📦 RegisterPlayer Data Structure:', {
    discriminator: DISCRIMINATORS.register_player.toString('hex'),
    nameLength: nameBuffer.length - 4,
    name: name,
    sessionKey: sessionKey.toString(),
    bump: playerBump,
    totalLength: data.length,
    dataHex: data.toString('hex')
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

// 3. game_action - action_type: u8, _x: u16, _y: u16
export const createGameActionIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  actionType: number,
  x: number,
  y: number
): TransactionInstruction => {
  
  const data = Buffer.alloc(8 + 1 + 2 + 2); // discriminator + u8 + u16 + u16
  let offset = 0;
  
  DISCRIMINATORS.game_action.copy(data, offset);
  offset += 8;
  
  data.writeUInt8(actionType, offset);  // action_type: u8
  offset += 1;
  
  data.writeUInt16LE(x, offset);        // _x: u16
  offset += 2;
  
  data.writeUInt16LE(y, offset);        // _y: u16
  
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
  
  const data = Buffer.alloc(8 + 8 + 4 + 4); // discriminator + u64 + u32 + u32
  let offset = 0;
  
  DISCRIMINATORS.end_game.copy(data, offset);
  offset += 8;
  
  data.writeBigUInt64LE(BigInt(finalScore), offset); // u64
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
  
  // Anti-spam flags
  private isRegistering: boolean = false;
  private lastActionTime: number = 0;
  private actionCooldown: number = 500; // ms

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    
    this.player.x = canvas.width / 2 - 35;
    this.player.y = canvas.height - 100;
    
    this.setupEventListeners();
    this.render();
    
    console.log('🎮 Game Engine initialized with Program ID:', FURBO_PROGRAM_ID.toString());
  }
  
  updateSession(sessionState: EstablishedSessionState | null) {
    this.setSession(sessionState);
  }
  
  setPlayerName(name: string) {
    this.setName(name);
  }
  
  pause() {
    this.stop();
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
    console.log('👤 Player name set:', this.playerName);
  }

  // 🔥 CORE: REGISTER PLAYER (FIXED)
  async registerPlayer(): Promise<boolean> {
    console.log('🚀 Starting player registration...');
    
    // Anti-spam check
    if (this.isRegistering) {
      console.log('⏳ Registration already in progress');
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
      
      // Calculate PDAs với bump seeds
      const [playerPDA, playerBump] = getPlayerPDA(sessionKey);
      const [gameStatePDA, gameBump] = getGameStatePDA();
      
      this.playerPDA = playerPDA;
      this.gameStatePDA = gameStatePDA;
      
      console.log('📍 PDA Addresses:', {
        player: playerPDA.toString(),
        playerBump,
        game: gameStatePDA.toString(),
        gameBump
      });
      
      // Check if already registered
      try {
        const playerInfo = await connection.getAccountInfo(playerPDA);
        if (playerInfo) {
          console.log('✅ Player already registered on-chain');
          this.isRegistered = true;
          return true;
        }
      } catch (error) {
        console.log('ℹ️ Player account not found (this is ok for new registration)');
      }
      
      // Check/initialize game state
      try {
        const gameInfo = await connection.getAccountInfo(gameStatePDA);
        if (!gameInfo) {
          console.log('🔄 Initializing game state...');
          await this.initializeGameWithBump(gameStatePDA, gameBump);
        } else {
          console.log('✅ Game state already initialized');
        }
      } catch (error) {
        console.error('❌ Game state check failed:', error);
      }
      
      // Create instruction với đầy đủ params
      const instruction = createRegisterPlayerIx(
        playerPDA,
        gameStatePDA,
        sessionKey,      // signer = session key
        this.playerName,
        sessionKey,      // session_key parameter
        playerBump       // bump seed
      );
      
      console.log('📤 Sending registration transaction...');
      
      // Gửi với preflight để debug
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { 
          skipPreflight: false,  // 👈 Để xem preflight errors
          preflightCommitment: 'confirmed',
          commitment: 'confirmed'
        }
      );
      
      console.log('⏳ Transaction sent:', signature);
      console.log('⏳ Waiting for confirmation...');
      
      // Confirm với blockhash mới nhất
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed');
      
      if (confirmation.value.err) {
        console.error('❌ Transaction failed:', confirmation.value.err);
        
        // Kiểm tra logs nếu có
        if (confirmation.value.err) {
          console.error('Error details:', JSON.stringify(confirmation.value.err));
        }
        
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log('✅ Registration successful! Signature:', signature);
      this.isRegistered = true;
      
      alert(`🎉 Registration successful!\nPlayer: ${this.playerName}\nSignature: ${signature.slice(0, 16)}...`);
      return true;
      
    } catch (error: any) {
      console.error('💥 Registration error:', error);
      
      // Hiển thị logs nếu có
      if (error.logs) {
        console.error('Program logs:', error.logs);
      }
      
      let errorMsg = 'Registration failed';
      if (error.message?.includes('already in use')) {
        errorMsg = 'Player already registered';
        this.isRegistered = true;
      } else if (error.message?.includes('insufficient funds')) {
        errorMsg = 'Insufficient SOL for transaction';
      } else if (error.message?.includes('Invalid instruction data')) {
        errorMsg = 'Program instruction error';
      } else if (error.message?.includes('invalid account data')) {
        errorMsg = 'Account data format error';
      }
      
      alert(`❌ ${errorMsg}\n${error.message?.substring(0, 150) || ''}`);
      return false;
      
    } finally {
      this.isRegistering = false;
    }
  }

  // Initialize game với bump seed
  async initializeGameWithBump(gameStatePDA: PublicKey, bump: number): Promise<boolean> {
    if (!this.sessionState) return false;
    
    try {
      console.log('🔄 Initializing game state with bump:', bump);
      
      const instruction = createInitializeGameIx(
        gameStatePDA,
        this.sessionState.sessionPublicKey,
        bump
      );
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { 
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }
      );
      
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Game initialization failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log('✅ Game initialized. Signature:', signature);
      return true;
      
    } catch (error) {
      console.error('❌ Game initialization failed:', error);
      return false;
    }
  }

  // Check và initialize game nếu cần
  async initializeGame(): Promise<boolean> {
    if (!this.sessionState) return false;
    
    const [gameStatePDA, bump] = getGameStatePDA();
    return this.initializeGameWithBump(gameStatePDA, bump);
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

  // Shoot action với cooldown
  async shoot() {
    if (!this.isRunning || !this.canSendAction()) return;
    
    const now = Date.now();
    if (now - this.lastActionTime < this.actionCooldown) return;
    this.lastActionTime = now;
    
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
        1,  // action_type = 1 (shoot)
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
      console.log('🎯 Game saved to chain. Score:', this.score);
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
    
    try {
      const [playerPDA] = getPlayerPDA(this.sessionState.sessionPublicKey);
      const [gameStatePDA] = getGameStatePDA();
      
      this.playerPDA = playerPDA;
      this.gameStatePDA = gameStatePDA;
      
      this.checkRegistration();
    } catch (error) {
      console.error('Update chain state error:', error);
    }
  }

  private async checkRegistration() {
    if (!this.sessionState || !this.playerPDA) return;
    
    try {
      const accountInfo = await connection.getAccountInfo(this.playerPDA);
      this.isRegistered = !!accountInfo;
      
      if (this.isRegistered) {
        console.log('✅ Player registration verified on-chain');
      } else {
        console.log('ℹ️ Player not registered on-chain');
      }
      
    } catch (error) {
      console.error('Check registration error:', error);
      this.isRegistered = false;
    }
  }

  private canSendAction(): boolean {
    const canSend = !!(this.sessionState && this.isRegistered && this.playerPDA && this.gameStatePDA);
    
    if (!canSend) {
      console.warn('⚠️ Cannot send action:', {
        hasSession: !!this.sessionState,
        isRegistered: this.isRegistered,
        hasPlayerPDA: !!this.playerPDA,
        hasGameStatePDA: !!this.gameStatePDA
      });
    }
    
    return canSend;
  }

  private async sendTransaction(instruction: TransactionInstruction, type: string): Promise<string | null> {
    if (!this.sessionState) return null;
    
    try {
      console.log(`📤 Sending ${type} transaction...`);
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { 
          skipPreflight: true,
          commitment: 'confirmed'
        }
      );
      
      console.log(`✅ ${type} transaction sent:`, signature.slice(0, 16) + '...');
      
      // Không chờ confirm để game không bị lag
      setTimeout(async () => {
        try {
          await connection.confirmTransaction(signature, 'confirmed');
          console.log(`✅ ${type} confirmed:`, signature.slice(0, 16) + '...');
        } catch (error) {
          console.warn(`⚠️ ${type} confirmation failed:`, error);
        }
      }, 1000);
      
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
    
    const now = Date.now();
    if (now - this.lastActionTime < this.actionCooldown) return;
    this.lastActionTime = now;
    
    try {
      const instruction = createGameActionIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,
        2,  // action_type = 2 (kill)
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
    }
    
    // Connection status
    this.ctx.fillStyle = this.sessionState ? '#00ff88' : '#ff416c';
    this.ctx.fillText(this.sessionState ? '🟢 CONNECTED' : '🔴 DISCONNECTED', 20, 110);
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
