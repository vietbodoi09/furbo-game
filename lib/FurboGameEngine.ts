import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { connection } from "./connection";

// 🔥 PROGRAM ID của bạn
export const FURBO_PROGRAM_ID = new PublicKey('Z7wmp9MFSQ8HxoYV1xzj5MfzVBFsRUV9vVP3kUsWbEa');

// ========== DISCORDINATORS CHÍNH XÁC ==========
// Tính bằng cách hash "global:<method_name>" và lấy 8 byte đầu
import { sha256 } from 'js-sha256';

function computeDiscriminator(methodName) {
  const namespace = "global";
  const preimage = `${namespace}:${methodName}`;
  const hash = sha256.digest(preimage);
  return Buffer.from(hash.slice(0, 8));
}

// 🔥 DISCRIMINATORS CHÍNH XÁC cho tất cả functions
const DISCRIMINATORS = {
  initialize_game: computeDiscriminator("initialize_game"),
  register_player: computeDiscriminator("register_player"),
  game_action: computeDiscriminator("game_action"),
  end_game: computeDiscriminator("end_game"),
  update_session: computeDiscriminator("update_session"),
  batch_actions: computeDiscriminator("batch_actions"),
};

// In ra để debug
console.log("🎯 Discriminators computed:", 
  Object.keys(DISCRIMINATORS).map(k => `${k}: ${DISCRIMINATORS[k].toString('hex')}`)
);

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

// ========== INSTRUCTION BUILDERS CHÍNH XÁC ==========

// 🔥 Anchor serialize string: length (u32) + bytes
function serializeString(str) {
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
  
  // ✅ Chỉ có discriminator, không có arguments
  const data = DISCRIMINATORS.initialize_game;
  
  const keys = [
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: signer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  console.log("🔧 Initialize Game Instruction - DATA:", data.toString('hex'));
  
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
  
  // ✅ Anchor format: discriminator + string + pubkey
  const nameBuffer = serializeString(name); // length + string
  const sessionKeyBuffer = sessionKey.toBuffer(); // 32 bytes
  
  const data = Buffer.concat([
    DISCRIMINATORS.register_player,
    nameBuffer,
    sessionKeyBuffer
  ]);
  
  console.log("📝 Register Player Instruction Data:", data.toString('hex'));
  
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
  
  // ✅ discriminator + u8 + u16 + u16
  const data = Buffer.alloc(8 + 1 + 2 + 2); // 13 bytes
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
  
  // ✅ discriminator + u64 + u32 + u32
  const data = Buffer.alloc(8 + 8 + 4 + 4); // 24 bytes
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

// 5. update_session - new_session_key: Pubkey
export const createUpdateSessionIx = (
  playerPDA: PublicKey,
  signer: PublicKey,
  newSessionKey: PublicKey
): TransactionInstruction => {
  
  // ✅ discriminator + pubkey (32 bytes)
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

// ========== SIMPLE GAME ENGINE ==========

export class FurboGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sessionState?: EstablishedSessionState;
  
  private playerName: string = '';
  private isRegistered: boolean = false;
  private playerPDA?: PublicKey;
  private gameStatePDA?: PublicKey;
  
  private score: number = 0;
  private kills: number = 0;
  private shots: number = 0;
  private isRunning: boolean = false;
  
  private player = { x: 0, y: 0, width: 70, height: 80, speed: 8 };
  private bullets: Array<any> = [];
  private enemies: Array<any> = [];
  private keysPressed: { [key: string]: boolean } = {};
  
  // Callbacks
  private onScoreUpdate?: (score: number) => void;
  private onGameTimeUpdate?: (time: number) => void;
  private onChainUpdate?: (data: any) => void;
  private onTransactionFeedUpdate?: (tx: any) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    
    // Setup
    this.player.x = canvas.width / 2 - 35;
    this.player.y = canvas.height - 100;
    
    this.setupEventListeners();
    this.render();
  }

  // ========== PUBLIC API ==========
  
  setCallbacks(callbacks: {
    onScoreUpdate?: (score: number) => void;
    onGameTimeUpdate?: (time: number) => void;
    onChainUpdate?: (data: any) => void;
    onTransactionFeedUpdate?: (tx: any) => void;
  }) {
    this.onScoreUpdate = callbacks.onScoreUpdate;
    this.onGameTimeUpdate = callbacks.onGameTimeUpdate;
    this.onChainUpdate = callbacks.onChainUpdate;
    this.onTransactionFeedUpdate = callbacks.onTransactionFeedUpdate;
  }

  updateSession(sessionState: EstablishedSessionState | undefined) {
    this.sessionState = sessionState;
    this.updateChainState();
  }

  setPlayerName(name: string) {
    this.playerName = name.trim();
    console.log("🎮 Player name set to:", this.playerName);
  }

  // 🔥 CORE FUNCTION: REGISTER PLAYER
  async registerPlayer(): Promise<boolean> {
    console.log("🎯 ====== REGISTER PLAYER ======");
    
    // 1. Validate
    if (!this.sessionState) {
      alert("⚠️ Please connect wallet first!");
      return false;
    }
    
    if (!this.playerName || this.playerName.length < 3) {
      alert("Player name must be 3-20 characters!");
      return false;
    }
    
    const sessionKey = this.sessionState.sessionPublicKey;
    console.log("🔑 Session Key:", sessionKey.toString());
    
    try {
      // 2. Calculate PDAs
      const [playerPDA] = getPlayerPDA(sessionKey);
      const [gameStatePDA] = getGameStatePDA();
      
      this.playerPDA = playerPDA;
      this.gameStatePDA = gameStatePDA;
      
      console.log("📍 PDA Addresses:", {
        player: playerPDA.toString(),
        game: gameStatePDA.toString()
      });
      
      // 3. Check if already registered
      const playerInfo = await connection.getAccountInfo(playerPDA);
      if (playerInfo) {
        console.log("✅ Player already registered!");
        this.isRegistered = true;
        this.updateChainState();
        return true;
      }
      
      // 4. Check/Initialize game state
      const gameInfo = await connection.getAccountInfo(gameStatePDA);
      if (!gameInfo) {
        console.log("🔄 Initializing game state first...");
        await this.initializeGame();
      }
      
      // 5. Create and send register transaction
      const instruction = createRegisterPlayerIx(
        playerPDA,
        gameStatePDA,
        sessionKey,
        this.playerName,
        sessionKey
      );
      
      console.log("📤 Sending registration transaction...");
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { 
          skipPreflight: false, // ✅ QUAN TRỌNG: false để validate
          commitment: 'confirmed',
          maxRetries: 3
        }
      );
      
      console.log("⏳ Waiting for confirmation...");
      await connection.confirmTransaction(signature, 'confirmed');
      
      console.log("✅ Registration successful! Signature:", signature);
      
      // 6. Update state
      this.isRegistered = true;
      this.updateChainState();
      
      this.onTransactionFeedUpdate?.({
        type: 'register',
        status: 'confirmed',
        signature,
        message: 'Player registered successfully!',
        details: `Name: ${this.playerName}`
      });
      
      alert(`✅ Registration successful!\nPlayer: ${this.playerName}`);
      return true;
      
    } catch (error: any) {
      console.error("💥 Registration error:", error);
      
      let errorMsg = "Registration failed";
      if (error.message?.includes("already in use")) {
        errorMsg = "Player already registered";
        this.isRegistered = true;
        this.updateChainState();
        return true;
      } else if (error.message?.includes("AccountNotInitialized")) {
        errorMsg = "Game state not initialized";
      } else if (error.message?.includes("Invalid instruction data")) {
        errorMsg = "Instruction data error - check discriminators";
        console.error("Discriminator used:", DISCRIMINATORS.register_player.toString('hex'));
      }
      
      this.onTransactionFeedUpdate?.({
        type: 'register',
        status: 'failed',
        message: errorMsg,
        details: error.message
      });
      
      alert(`❌ ${errorMsg}\n${error.message?.substring(0, 100) || ""}`);
      return false;
    }
  }

  // 🔥 Initialize Game State
  async initializeGame(): Promise<boolean> {
    if (!this.sessionState) {
      console.error("❌ No session for initialization");
      return false;
    }
    
    try {
      const [gameStatePDA] = getGameStatePDA();
      
      // Check if already initialized
      const gameInfo = await connection.getAccountInfo(gameStatePDA);
      if (gameInfo) {
        console.log("✅ Game already initialized");
        return true;
      }
      
      console.log("🔄 Creating game state account...");
      
      const instruction = createInitializeGameIx(
        gameStatePDA,
        this.sessionState.sessionPublicKey
      );
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { skipPreflight: false, commitment: 'confirmed' }
      );
      
      await connection.confirmTransaction(signature, 'confirmed');
      console.log("✅ Game initialized:", signature);
      return true;
      
    } catch (error: any) {
      console.error("❌ Game initialization failed:", error);
      return false;
    }
  }

  // Start game
  start() {
    if (!this.isRegistered) {
      alert("❌ Please register player first!");
      return;
    }
    
    console.log("🎮 Starting game...");
    this.isRunning = true;
    this.reset();
    this.gameLoop();
  }

  // Reset game
  reset() {
    this.score = 0;
    this.kills = 0;
    this.shots = 0;
    this.bullets = [];
    this.enemies = [];
    this.player.x = this.canvas.width / 2 - 35;
    
    this.onScoreUpdate?.(this.score);
    this.onGameTimeUpdate?.(0);
  }

  // Shoot action
  async shoot() {
    if (!this.isRunning || !this.canSendAction()) return;
    
    // Create bullet
    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 4,
      y: this.player.y - 20,
      width: 8,
      height: 20,
      speed: 15
    });
    
    this.shots++;
    this.onScoreUpdate?.(this.score);
    
    // Send to chain
    try {
      const instruction = createGameActionIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,
        1, // action_type = shoot
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
      console.log("🎯 Game saved to chain!");
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  // ========== PRIVATE METHODS ==========
  
  private updateChainState() {
    if (!this.sessionState) {
      this.isRegistered = false;
      this.onChainUpdate?.({ isRegistered: false });
      return;
    }
    
    const [playerPDA] = getPlayerPDA(this.sessionState.sessionPublicKey);
    const [gameStatePDA] = getGameStatePDA();
    
    this.playerPDA = playerPDA;
    this.gameStatePDA = gameStatePDA;
    
    // Check registration
    this.checkRegistration();
  }

  private async checkRegistration() {
    if (!this.sessionState || !this.playerPDA) return;
    
    try {
      const accountInfo = await connection.getAccountInfo(this.playerPDA);
      this.isRegistered = !!accountInfo;
      
      this.onChainUpdate?.({
        isRegistered: this.isRegistered,
        playerName: this.playerName
      });
      
    } catch (error) {
      console.error("Check registration error:", error);
    }
  }

  private canSendAction(): boolean {
    return !!(this.sessionState && this.isRegistered && this.playerPDA && this.gameStatePDA);
  }

  private async sendTransaction(instruction: TransactionInstruction, type: string): Promise<string | null> {
    if (!this.sessionState) return null;
    
    try {
      this.onTransactionFeedUpdate?.({
        type: type as any,
        status: 'pending',
        message: `${type} sending...`
      });
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { skipPreflight: false }
      );
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      this.onTransactionFeedUpdate?.({
        type: type as any,
        status: 'confirmed',
        signature,
        message: `${type} confirmed!`
      });
      
      return signature;
      
    } catch (error: any) {
      console.error(`${type} failed:`, error);
      
      this.onTransactionFeedUpdate?.({
        type: type as any,
        status: 'failed',
        message: `${type} failed`,
        details: error.message
      });
      
      return null;
    }
  }

  // ========== GAME LOGIC ==========
  
  private gameLoop() {
    if (!this.isRunning) return;
    
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
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
          this.onScoreUpdate?.(this.score);
          
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
      
      // Check collision with player
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
        2, // action_type = kill
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction(instruction, 'kill');
    } catch (error) {
      console.error('Kill action failed:', error);
    }
  }

  private async sendMoveAction() {
    if (!this.canSendAction()) return;
    
    try {
      const instruction = createGameActionIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,
        0, // action_type = move
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction(instruction, 'move');
    } catch (error) {
      console.error('Move action failed:', error);
    }
  }

  private checkCollision(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  private gameOver() {
    this.isRunning = false;
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
    this.ctx.fillStyle = '#00d4ff';
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x + 35, this.player.y);
    this.ctx.lineTo(this.player.x, this.player.y + 80);
    this.ctx.lineTo(this.player.x + 70, this.player.y + 80);
    this.ctx.closePath();
    this.ctx.fill();
    
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

  private drawUI() {
    // Score panel
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 200, 120);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 35);
    this.ctx.fillText(`KILLS: ${this.kills}`, 20, 60);
    this.ctx.fillText(`SHOTS: ${this.shots}`, 20, 85);
    
    if (this.playerName) {
      this.ctx.fillStyle = this.isRegistered ? '#00ff88' : '#ffde59';
      this.ctx.font = '16px Arial';
      this.ctx.fillText(`${this.playerName}`, 20, 110);
    }
    
    // Connection status
    const status = this.sessionState ? '🟢 CONNECTED' : '🔴 DISCONNECTED';
    const color = this.sessionState ? '#00ff88' : '#ff4444';
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(this.canvas.width - 200, 10, 190, 50);
    
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(status, this.canvas.width - 15, 30);
    
    if (this.sessionState) {
      const regStatus = this.isRegistered ? '✅ REGISTERED' : '⚠️ NOT REGISTERED';
      const regColor = this.isRegistered ? '#00ff88' : '#ffde59';
      
      this.ctx.fillStyle = regColor;
      this.ctx.font = '12px Arial';
      this.ctx.fillText(regStatus, this.canvas.width - 15, 50);
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
          alert("Please register player first!");
        }
      } else {
        this.shoot();
      }
      return;
    }
    
    if (this.isRunning) {
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
    this.isRunning = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}

export default FurboGameEngine;
