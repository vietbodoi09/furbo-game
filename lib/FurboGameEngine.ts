import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { connection } from "./connection";

// 🔥 CRITICAL: USE YOUR PROGRAM ID
export const FURBO_PROGRAM_ID = new PublicKey('DKnfKiJxtzrCAR7sWbWf3v7Jvhjsxawgzf28fAQvN3uf');

// ⚠️ IMPORTANT: Discriminators must be extracted from Anchor IDL
const DISCRIMINATORS = {
  initialize_game: Buffer.from([0x3b, 0x5d, 0x2f, 0x9a, 0x1c, 0x7e, 0x8f, 0x4d]),
  register_player: Buffer.from([0x4d, 0x8b, 0x8c, 0x9d, 0x2f, 0x1a, 0x7b, 0x3c]),
  game_action: Buffer.from([0x6f, 0xad, 0xbe, 0xcf, 0x4c, 0x3c, 0x7d, 0x8e]),
  end_game: Buffer.from([0x7f, 0xbe, 0xcf, 0xdf, 0x5d, 0x4d, 0x8e, 0x9f]),
  update_session: Buffer.from([0x5e, 0x9c, 0xad, 0xbe, 0x3f, 0x2b, 0x6c, 0x7d]),
  batch_actions: Buffer.from([0x8f, 0xcf, 0xdf, 0xef, 0x6e, 0x5e, 0x9f, 0xaf])
};

// 🔥 PDA FUNCTIONS
export const getGameStatePDA = (): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('game_state')],
    FURBO_PROGRAM_ID
  );
};

export const getPlayerPDA = (wallet: PublicKey): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('player'), wallet.toBuffer()],
    FURBO_PROGRAM_ID
  );
};

// 🔥 TYPES
export interface ChainData {
  playerScore?: number;
  playerKills?: number;
  playerShots?: number;
  playerRank?: number;
  playerName?: string;
  isRegistered?: boolean;
}

export interface GameCallbacks {
  onScoreUpdate: (score: number) => void;
  onGameTimeUpdate: (time: number) => void;
  onPerformanceUpdate: (stats: any) => void;
  onChainUpdate: (data: ChainData) => void;
  onTransactionComplete?: (type: string, success: boolean, signature?: string) => void;
  onTransactionFeedUpdate?: (transaction: {
    type: 'move' | 'shoot' | 'kill' | 'register' | 'end_game' | 'update_session';
    status: 'pending' | 'confirmed' | 'failed';
    signature?: string;
    message: string;
    details?: string;
  }) => void;
}

// ========== INSTRUCTION BUILDERS ==========

// ⚠️ QUAN TRỌNG: Rust program yêu cầu AUTHORITY (WALLET) phải ký
// Session chỉ được dùng cho game_action, end_game

// initialize_game - WALLET phải ký
export const createInitializeGameIx = (
  gameStatePDA: PublicKey,
  authority: PublicKey  // ⚠️ WALLET phải là signer
): TransactionInstruction => {
  const data = DISCRIMINATORS.initialize_game;
  
  const keys = [
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: true },  // ⚠️ Wallet signs
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// register_player - WALLET phải ký
export const createRegisterPlayerIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  authority: PublicKey,    // ⚠️ Wallet signs (authority)
  name: string,
  sessionKey: PublicKey    // Session key to store
): TransactionInstruction => {
  
  const nameBuffer = Buffer.from(name, 'utf8');
  const nameLength = Buffer.alloc(4);
  nameLength.writeUInt32LE(nameBuffer.length, 0);
  
  const data = Buffer.concat([
    DISCRIMINATORS.register_player,
    nameLength,
    nameBuffer,
    sessionKey.toBuffer()
  ]);
  
  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: true },  // ⚠️ Wallet signs
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// game_action - SESSION có thể ký
export const createGameActionIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,  // Session key có thể sign
  actionType: number,
  x: number,
  y: number
): TransactionInstruction => {
  const data = Buffer.alloc(13);
  let offset = 0;
  
  DISCRIMINATORS.game_action.copy(data, offset); offset += 8;
  data.writeUInt8(actionType, offset); offset += 1;
  data.writeUInt16LE(x, offset); offset += 2;
  data.writeUInt16LE(y, offset); offset += 2;
  
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

// end_game - SESSION có thể ký
export const createEndGameIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,  // Session key có thể sign
  finalScore: number,
  finalKills: number,
  finalShots: number
): TransactionInstruction => {
  const data = Buffer.alloc(24);
  let offset = 0;
  
  DISCRIMINATORS.end_game.copy(data, offset); offset += 8;
  data.writeBigUInt64LE(BigInt(finalScore), offset); offset += 8;
  data.writeUInt32LE(finalKills, offset); offset += 4;
  data.writeUInt32LE(finalShots, offset); offset += 4;
  
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

// update_session - WALLET hoặc SESSION cũ có thể ký
export const createUpdateSessionIx = (
  playerPDA: PublicKey,
  authority: PublicKey,  // Wallet hoặc session key cũ
  newSessionKey: PublicKey
): TransactionInstruction => {
  const data = Buffer.alloc(40);
  DISCRIMINATORS.update_session.copy(data, 0);
  newSessionKey.toBuffer().copy(data, 8);
  
  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// ========== GAME ENGINE CLASS ==========

export class FurboGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sessionState?: EstablishedSessionState;
  private callbacks: GameCallbacks;
  private gameLoopId?: number;
  
  private player: { x: number; y: number; width: number; height: number; speed: number };
  private bullets: Array<{ x: number; y: number; width: number; height: number; speed: number }>;
  private enemies: Array<{ x: number; y: number; width: number; height: number; speed: number }>;
  private keysPressed: { [key: string]: boolean };
  
  private score: number = 0;
  private gameTime: number = 0;
  private isRunning: boolean = false;
  private playerName: string = '';
  private isRegistered: boolean = false;
  private kills: number = 0;
  private shots: number = 0;
  
  private performanceStats = {
    movesSent: 0,
    shotsSent: 0,
    killsSent: 0,
    avgConfirm: 0,
    successRate: 100,
    pendingTx: 0,
    confirmationTimes: [] as number[],
    totalActions: 0,
    failedActions: 0
  };

  private playerPDA?: PublicKey;
  private gameStatePDA?: PublicKey;
  
  private lastMoveTime: number = 0;
  private moveDebounceMs: number = 500;
  private lastKillTime: number = 0;
  private killDebounceMs: number = 100;

  constructor(
    canvas: HTMLCanvasElement,
    sessionState: EstablishedSessionState | undefined,
    callbacks: GameCallbacks
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    
    this.ctx = ctx;
    this.sessionState = sessionState;
    this.callbacks = callbacks;
    
    this.player = {
      x: canvas.width / 2 - 35,
      y: canvas.height - 100,
      width: 70,
      height: 80,
      speed: 8
    };
    
    this.bullets = [];
    this.enemies = [];
    this.keysPressed = {};
    
    this.setupEventListeners();
    this.initializeChainState();
    this.render();
  }

  // ========== PUBLIC API ==========
  
  updateSession(sessionState: EstablishedSessionState | undefined) {
    this.sessionState = sessionState;
    this.initializeChainState();
  }

  setPlayerName(name: string) {
    this.playerName = name.trim();
    console.log("Player name set to:", this.playerName);
  }

  // ✅ FIXED: ĐÚNG CÁCH - Wallet ký cho register
  async registerPlayer(): Promise<boolean> {
    console.log("🎯 ====== REGISTER PLAYER ======");
    
    if (!this.sessionState) {
      console.error("❌ ERROR: No session state");
      alert("⚠️ Please connect wallet first!");
      return false;
    }
    
    // Kiểm tra wallet có thể ký không
    console.log("🔍 Checking wallet:", {
      wallet: this.sessionState.walletPublicKey?.toString(),
      sessionKey: this.sessionState.sessionPublicKey?.toString()
    });
    
    if (!this.playerName || this.playerName.length < 3) {
      alert("Player name must be at least 3 characters!");
      return false;
    }
    
    try {
      // Tạo PDAs
      const [playerPDA] = getPlayerPDA(this.sessionState.walletPublicKey);
      const [gameStatePDA] = getGameStatePDA();
      
      this.playerPDA = playerPDA;
      this.gameStatePDA = gameStatePDA;
      
      console.log("📍 PDA Addresses:", {
        player: playerPDA.toString(),
        game: gameStatePDA.toString()
      });
      
      // Kiểm tra đã đăng ký chưa
      const playerInfo = await connection.getAccountInfo(playerPDA);
      if (playerInfo) {
        console.log("✅ Player already registered!");
        this.isRegistered = true;
        alert("Player already registered!");
        return true;
      }
      
      // Kiểm tra game state
      const gameInfo = await connection.getAccountInfo(gameStatePDA);
      if (!gameInfo) {
        console.log("⚠️ Game not initialized yet");
        // Game chưa initialized không sao, vẫn register được
      }
      
      // Tạo instruction - ⚠️ WALLET phải là authority
      const instruction = createRegisterPlayerIx(
        playerPDA,
        gameStatePDA,
        this.sessionState.walletPublicKey,  // ⚠️ WALLET làm authority
        this.playerName,
        this.sessionState.sessionPublicKey   // Lưu session key
      );
      
      console.log("📤 Sending registration...");
      
      // Gửi qua Fogo session
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        {
          skipPreflight: true,  // ⚠️ QUAN TRỌNG: true để tránh lỗi
          commitment: 'confirmed'
        }
      );
      
      console.log("✅ Transaction sent:", signature);
      
      // Chờ confirm
      await connection.confirmTransaction(signature, 'confirmed');
      
      // Cập nhật state
      this.isRegistered = true;
      
      this.callbacks.onTransactionComplete?.('register', true, signature);
      this.callbacks.onChainUpdate({
        isRegistered: true,
        playerName: this.playerName
      });
      
      alert(`✅ Registration successful!\nPlayer: ${this.playerName}`);
      return true;
      
    } catch (error: any) {
      console.error("💥 Registration error:", error);
      
      let errorMsg = "Registration failed";
      if (error.message?.includes("already in use")) {
        errorMsg = "Player already registered";
        this.isRegistered = true;
        return true;
      } else if (error.message?.includes("insufficient funds")) {
        errorMsg = "Insufficient SOL for fees";
      } else if (error.message?.includes("Invalid instruction data")) {
        errorMsg = "Instruction format error";
      }
      
      alert(`❌ ${errorMsg}\n${error.message || ""}`);
      return false;
    }
  }

  // Hàm initialize game riêng (gọi thủ công khi cần)
  async initializeGame(): Promise<boolean> {
    if (!this.sessionState) return false;
    
    try {
      const [gameStatePDA] = getGameStatePDA();
      const gameInfo = await connection.getAccountInfo(gameStatePDA);
      
      if (gameInfo) {
        console.log("✅ Game already initialized");
        return true;
      }
      
      console.log("🔄 Initializing game...");
      const instruction = createInitializeGameIx(
        gameStatePDA,
        this.sessionState.walletPublicKey  // ⚠️ Wallet signs
      );
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { skipPreflight: true }
      );
      
      await connection.confirmTransaction(signature, 'confirmed');
      console.log("✅ Game initialized:", signature);
      return true;
      
    } catch (error) {
      console.error("❌ Game initialization failed:", error);
      return false;
    }
  }

  start() {
    if (!this.isRegistered) {
      console.error("❌ Cannot start: Player not registered!");
      alert("❌ Please register player first!");
      return;
    }
    
    console.log("🎮 Starting game...");
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.reset();
    this.gameLoop();
  }

  pause() {
    this.isRunning = false;
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = undefined;
    }
  }

  reset() {
    this.score = 0;
    this.gameTime = 0;
    this.kills = 0;
    this.shots = 0;
    this.bullets = [];
    this.enemies = [];
    this.player.x = this.canvas.width / 2 - 35;
    
    this.callbacks.onScoreUpdate(this.score);
    this.callbacks.onGameTimeUpdate(0);
  }

  async shoot(): Promise<void> {
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
        this.sessionState!.sessionPublicKey,  // ✅ Session signs
        1,
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction(instruction, 'shoot');
    } catch (error) {
      console.error('Failed to send shoot action:', error);
    }
  }

  getStats() {
    return {
      score: this.score,
      kills: this.kills,
      shots: this.shots,
      isRegistered: this.isRegistered,
      playerName: this.playerName
    };
  }

  destroy() {
    this.pause();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  // ========== PRIVATE METHODS ==========
  
  private initializeChainState() {
    if (!this.sessionState) {
      this.playerPDA = undefined;
      this.gameStatePDA = undefined;
      this.isRegistered = false;
      return;
    }
    
    const [playerPDA] = getPlayerPDA(this.sessionState.walletPublicKey);
    const [gameStatePDA] = getGameStatePDA();
    
    this.playerPDA = playerPDA;
    this.gameStatePDA = gameStatePDA;
    
    this.fetchPlayerData();
  }

  private async fetchPlayerData() {
    if (!this.sessionState || !this.playerPDA) return;

    try {
      const accountInfo = await connection.getAccountInfo(this.playerPDA);
      
      if (!accountInfo) {
        this.isRegistered = false;
        this.callbacks.onChainUpdate({ isRegistered: false });
        return;
      }
      
      this.isRegistered = true;
      this.callbacks.onChainUpdate({
        isRegistered: true,
        playerName: this.playerName
      });
    } catch (error) {
      console.error("Error fetching player data:", error);
    }
  }

  private async sendMoveAction(): Promise<void> {
    if (!this.canSendAction()) return;
    
    try {
      const instruction = createGameActionIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,  // ✅ Session signs
        0,
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction(instruction, 'move');
    } catch (error) {
      console.error('Failed to send move action:', error);
    }
  }

  private async sendKillAction(): Promise<void> {
    if (!this.canSendAction()) return;
    
    try {
      const instruction = createGameActionIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,  // ✅ Session signs
        2,
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction(instruction, 'kill');
    } catch (error) {
      console.error('Failed to send kill action:', error);
    }
  }

  private canSendAction(): boolean {
    return !!(this.sessionState && this.isRegistered && this.playerPDA && this.gameStatePDA);
  }

  private gameLoop() {
    if (!this.isRunning) return;

    this.update();
    this.render();
    this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const currentTime = Date.now();
    this.gameTime += 16;
    
    let moved = false;
    if (this.keysPressed['ArrowLeft']) {
      this.player.x = Math.max(0, this.player.x - this.player.speed);
      moved = true;
    }
    if (this.keysPressed['ArrowRight']) {
      this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + this.player.speed);
      moved = true;
    }
    
    if (moved && currentTime - this.lastMoveTime > this.moveDebounceMs) {
      this.sendMoveAction();
      this.lastMoveTime = currentTime;
    }
    
    this.bullets = this.bullets.filter(bullet => {
      bullet.y -= bullet.speed;
      
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (this.checkCollision(bullet, enemy)) {
          this.enemies.splice(i, 1);
          this.score += 100;
          this.kills++;
          
          if (currentTime - this.lastKillTime > this.killDebounceMs) {
            this.sendKillAction();
            this.lastKillTime = currentTime;
          }
          
          this.callbacks.onScoreUpdate(this.score);
          return false;
        }
      }
      
      return bullet.y > -bullet.height;
    });
    
    if (Math.random() < 0.02 && this.enemies.length < 10) {
      this.spawnEnemy();
    }
    
    this.enemies = this.enemies.filter(enemy => {
      enemy.y += enemy.speed;
      
      if (this.checkCollision(this.player, enemy)) {
        this.gameOver();
        return false;
      }
      
      return enemy.y < this.canvas.height;
    });
    
    this.callbacks.onGameTimeUpdate(Math.floor(this.gameTime / 1000));
  }

  private spawnEnemy() {
    this.enemies.push({
      x: Math.random() * (this.canvas.width - 50),
      y: -50,
      width: 50,
      height: 50,
      speed: 1 + Math.random() * 2
    });
  }

  private checkCollision(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  private async sendGameOverToChain() {
    if (!this.canSendAction()) return;

    try {
      const instruction = createEndGameIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,  // ✅ Session signs
        this.score,
        this.kills,
        this.shots
      );

      await this.sendTransaction(instruction, 'end_game');
    } catch (error) {
      console.error('Failed to save game over:', error);
    }
  }

  private gameOver() {
    this.isRunning = false;
    this.pause();
    this.sendGameOverToChain();
    alert(`Game Over! Score: ${this.score}`);
  }

  private async sendTransaction(instruction: TransactionInstruction, type: string): Promise<string | null> {
    if (!this.sessionState) {
      console.error("No session state available");
      return null;
    }

    const startTime = performance.now();
    
    this.callbacks.onTransactionFeedUpdate?.({
      type: type as any,
      status: 'pending',
      message: `${type} sending...`,
      details: `Score: ${this.score}`
    });

    try {
      this.performanceStats.pendingTx++;
      this.performanceStats.totalActions++;
      
      const signature = await this.sessionState.sendTransaction(
        [instruction],
        { skipPreflight: true }
      );
      
      const confirmTime = performance.now() - startTime;
      this.performanceStats.confirmationTimes.push(confirmTime);
      
      if (this.performanceStats.confirmationTimes.length > 0) {
        const sum = this.performanceStats.confirmationTimes.reduce((a, b) => a + b, 0);
        this.performanceStats.avgConfirm = Math.floor(sum / this.performanceStats.confirmationTimes.length);
      }
      
      this.performanceStats.pendingTx--;
      
      console.log(`✅ ${type} confirmed in ${confirmTime.toFixed(0)}ms: ${signature}`);
      
      this.callbacks.onTransactionFeedUpdate?.({
        type: type as any,
        status: 'confirmed',
        signature: signature,
        message: `${type} confirmed!`,
        details: `Time: ${confirmTime.toFixed(0)}ms`
      });
      
      return signature;
      
    } catch (error) {
      this.performanceStats.pendingTx--;
      this.performanceStats.failedActions++;
      
      console.error(`❌ ${type} failed:`, error);
      
      this.callbacks.onTransactionFeedUpdate?.({
        type: type as any,
        status: 'failed',
        message: `${type} failed`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return null;
    }
  }

  private render() {
    this.ctx.fillStyle = '#0a1929';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawGrid();
    this.drawPlayer();
    this.drawBullets();
    this.drawEnemies();
    this.drawUI();
    this.drawConnectionStatus();
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
    
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x + 35, this.player.y + 20, 10, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#ffde59';
    this.ctx.beginPath();
    this.ctx.ellipse(this.player.x + 35, this.player.y + 85, 15, 5, 0, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawBullets() {
    this.ctx.fillStyle = '#ffde59';
    this.ctx.shadowColor = '#ffde59';
    this.ctx.shadowBlur = 10;
    
    this.bullets.forEach(bullet => {
      this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
    
    this.ctx.shadowBlur = 0;
  }

  private drawEnemies() {
    this.ctx.fillStyle = '#ff416c';
    this.ctx.shadowColor = '#ff416c';
    this.ctx.shadowBlur = 10;
    
    this.enemies.forEach(enemy => {
      this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(enemy.x + 15, enemy.y + 15, 5, 0, Math.PI * 2);
      this.ctx.arc(enemy.x + 35, enemy.y + 15, 5, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.beginPath();
      this.ctx.arc(enemy.x + 25, enemy.y + 35, 8, 0, Math.PI);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#ff416c';
    });
    
    this.ctx.shadowBlur = 0;
  }

  private drawUI() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 200, 140);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 35);
    this.ctx.fillText(`TIME: ${Math.floor(this.gameTime / 1000)}s`, 20, 60);
    this.ctx.fillText(`KILLS: ${this.kills}`, 20, 85);
    this.ctx.fillText(`SHOTS: ${this.shots}`, 20, 110);
    
    if (this.playerName) {
      this.ctx.fillStyle = this.isRegistered ? '#00ff88' : '#ffde59';
      this.ctx.font = '16px Arial';
      this.ctx.fillText(`${this.playerName}`, 20, 135);
    }
  }

  private drawConnectionStatus() {
    const status = this.sessionState ? '🟢 CONNECTED' : '🔴 DISCONNECTED';
    const color = this.sessionState ? '#00ff88' : '#ff4444';
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(this.canvas.width - 200, 10, 190, 30);
    
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(status, this.canvas.width - 15, 30);
    
    if (this.sessionState) {
      const regStatus = this.isRegistered ? '✅ REGISTERED' : '⚠️ NOT REGISTERED';
      const regColor = this.isRegistered ? '#00ff88' : '#ffde59';
      
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(this.canvas.width - 200, 45, 190, 25);
      
      this.ctx.fillStyle = regColor;
      this.ctx.font = '12px Arial';
      this.ctx.fillText(regStatus, this.canvas.width - 15, 62);
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.isRunning) {
        if (this.isRegistered) {
          this.start();
        } else {
          console.log("⚠️ Please register player first!");
          alert("Please register player before starting game!");
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
}

// ========== EXPORT DEFAULT ==========
export default FurboGameEngine;
