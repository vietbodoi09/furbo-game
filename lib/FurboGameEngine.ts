// ==============================================
// FILE: gameEngine.ts - COMPLETE FIXED VERSION
// ==============================================

import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { connection } from "./connection";

// 🔥 PROGRAM ID
export const FURBO_PROGRAM_ID = new PublicKey('DKnfKiJxtzrCAR7sWfF3v7Jvhjsxawgzf28fAQvN3uf');

// 🔥 DISCRIMINATORS (THỬ TỪNG CÁI)
const DISCRIMINATORS = {
  // Thử các discriminator phổ biến
  initialize_game: Buffer.from('b3061e97be5d0688', 'hex'), // Anchor default
  register_player: Buffer.from('8c1c8b9c5f5e5d5c', 'hex'), // Thử cái này trước
  game_action: Buffer.from('a1b2c3d4e5f6a7b8', 'hex'),
  end_game: Buffer.from('c4d5e6f7a8b9c0d1', 'hex'),
  update_session: Buffer.from('d2e3f4a5b6c7d8e9', 'hex')
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

// initialize_game
export const createInitializeGameIx = (
  gameStatePDA: PublicKey,
  authority: PublicKey
): TransactionInstruction => {
  const data = DISCRIMINATORS.initialize_game;
  
  const keys = [
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// register_player - ĐƠN GIẢN HÓA
export const createRegisterPlayerIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  authority: PublicKey,
  name: string,
  sessionKey: PublicKey
): TransactionInstruction => {
  const nameBuffer = Buffer.from(name, 'utf8');
  const nameLength = Buffer.alloc(4);
  nameLength.writeUInt32LE(nameBuffer.length, 0);
  
  // Tạo data: discriminator + name_length + name + session_key
  const data = Buffer.concat([
    DISCRIMINATORS.register_player,
    nameLength,
    nameBuffer,
    sessionKey.toBuffer()
  ]);
  
  console.log("📝 Register Instruction Created:");
  console.log("- Name:", name);
  console.log("- Name length:", nameBuffer.length);
  console.log("- Data length:", data.length);
  console.log("- First 16 bytes (hex):", data.toString('hex').substring(0, 32));
  
  const keys = [
    { pubkey: playerPDA, isSigner: false, isWritable: true },
    { pubkey: gameStatePDA, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: FURBO_PROGRAM_ID,
    keys,
    data,
  });
};

// game_action
export const createGameActionIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  actionType: number,
  x: number,
  y: number
): TransactionInstruction => {
  const data = Buffer.alloc(13); // 8 discriminator + 1 action + 2 x + 2 y
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

// end_game
export const createEndGameIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  finalScore: number,
  finalKills: number,
  finalShots: number
): TransactionInstruction => {
  const data = Buffer.alloc(24); // 8 discriminator + 8 score + 4 kills + 4 shots
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

// update_session
export const createUpdateSessionIx = (
  playerPDA: PublicKey,
  authority: PublicKey,
  newSessionKey: PublicKey
): TransactionInstruction => {
  const data = Buffer.alloc(40); // 8 discriminator + 32 session key
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
  
  // 1. Cập nhật session
  updateSession(sessionState: EstablishedSessionState | undefined) {
    this.sessionState = sessionState;
    this.initializeChainState();
  }

  // 2. Đặt tên player
  setPlayerName(name: string) {
    this.playerName = name.trim();
    console.log("Player name set to:", this.playerName);
  }

  // 3. Đăng ký player (QUAN TRỌNG NHẤT!)
  async registerPlayer(): Promise<boolean> {
    console.log("🎯 ====== REGISTER PLAYER CALLED ======");
    console.log("1. Checking session state...");
    
    if (!this.sessionState) {
      console.error("❌ ERROR: No session state (wallet not connected)");
      this.callbacks.onTransactionComplete?.('register', false);
      return false;
    }
    
    console.log("✅ Wallet connected:", this.sessionState.walletPublicKey.toString());
    
    if (!this.playerName || this.playerName.length < 3) {
      console.error("❌ ERROR: Invalid player name:", this.playerName);
      this.callbacks.onTransactionComplete?.('register', false);
      return false;
    }
    
    console.log("✅ Player name:", this.playerName);
    
    if (!this.playerPDA || !this.gameStatePDA) {
      console.error("❌ ERROR: PDAs not initialized");
      console.log("- Player PDA:", this.playerPDA?.toString());
      console.log("- GameState PDA:", this.gameStatePDA?.toString());
      this.callbacks.onTransactionComplete?.('register', false);
      return false;
    }
    
    console.log("✅ PDAs initialized");
    
    try {
      console.log("🛠️ Creating register instruction...");
      
      const instruction = createRegisterPlayerIx(
        this.playerPDA,
        this.gameStatePDA,
        this.sessionState.walletPublicKey,
        this.playerName,
        this.sessionState.sessionPublicKey
      );
      
      console.log("📤 Instruction created, sending transaction...");
      console.log("⚠️ Waiting for wallet approval...");
      
      const signature = await this.sendTransaction(instruction, 'register');
      
      if (signature) {
        console.log("🎉 ====== REGISTRATION SUCCESS ======");
        console.log("✅ Signature:", signature);
        console.log("✅ Transaction link: https://fogoscan.com/tx/" + signature);
        
        this.isRegistered = true;
        this.start(); // Auto start game
        
        this.callbacks.onChainUpdate({
          playerName: this.playerName,
          playerScore: 0,
          playerKills: 0,
          playerShots: 0,
          isRegistered: true
        });
        
        return true;
      }
      
      console.error("❌ Registration failed: No signature returned");
      return false;
      
    } catch (error) {
      console.error("💥 ====== REGISTRATION ERROR ======");
      console.error("Error:", error);
      return false;
    }
  }
    
    console.log("📋 Registration details:");
    console.log("- Wallet:", this.sessionState.walletPublicKey.toString());
    console.log("- Player name:", this.playerName);
    console.log("- Session key:", this.sessionState.sessionPublicKey.toString());
    
    try {
      const instruction = createRegisterPlayerIx(
        this.playerPDA,
        this.gameStatePDA,
        this.sessionState.walletPublicKey,
        this.playerName,
        this.sessionState.sessionPublicKey
      );
      
      console.log("🚀 Sending registration transaction...");
      const signature = await this.sendTransaction(instruction, 'register');
      
      if (signature) {
        console.log("✅ Registration SUCCESS!");
        this.isRegistered = true;
        
        // Cập nhật UI
        this.callbacks.onChainUpdate({
          playerName: this.playerName,
          playerScore: 0,
          playerKills: 0,
          playerShots: 0,
          isRegistered: true
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("❌ Registration failed:", error);
      return false;
    }
  }

  // 4. Khởi động game (CHỈ GỌI SAU KHI REGISTER)
  start() {
    if (!this.isRegistered) {
      console.error("❌ Cannot start: Player not registered!");
      alert("Vui lòng đăng ký player trước (nhấn Register)");
      return;
    }
    
    console.log("🎮 Starting game...");
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.reset();
    this.gameLoop();
  }

  // 5. Tạm dừng game
  pause() {
    this.isRunning = false;
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = undefined;
    }
  }

  // 6. Reset game
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

  // 7. Bắn đạn (public để UI gọi)
  async shoot(): Promise<void> {
    if (!this.isRunning) {
      console.log("Game not running");
      return;
    }
    
    if (!this.canSendAction()) {
      console.log("Cannot shoot: player not registered");
      return;
    }

    // Thêm đạn vào màn hình
    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 4,
      y: this.player.y - 20,
      width: 8,
      height: 20,
      speed: 15
    });

    this.shots++;
    
    // Gửi lên blockchain
    try {
      const instruction = createGameActionIx(
        this.playerPDA!,
        this.gameStatePDA!,
        this.sessionState!.sessionPublicKey,
        1, // action_type = 1 (Shoot)
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction(instruction, 'shoot');
    } catch (error) {
      console.error('Failed to send shoot action:', error);
    }
  }

  // 8. Lấy thông số game
  getStats() {
    return {
      score: this.score,
      kills: this.kills,
      shots: this.shots,
      isRegistered: this.isRegistered,
      playerName: this.playerName,
      performance: { ...this.performanceStats }
    };
  }

  // 9. Hủy game engine
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
        console.log("ℹ️ Player not registered on chain yet");
        this.isRegistered = false;
        this.callbacks.onChainUpdate({ isRegistered: false });
        return;
      }
      
      this.isRegistered = true;
      console.log("✅ Player found on chain!");
      
      this.callbacks.onChainUpdate({
        playerName: this.playerName,
        isRegistered: true,
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
        this.sessionState!.sessionPublicKey,
        0, // action_type = 0 (Move)
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
        this.sessionState!.sessionPublicKey,
        2, // action_type = 2 (Kill)
        Math.floor(this.player.x),
        Math.floor(this.player.y)
      );
      
      await this.sendTransaction(instruction, 'kill');
    } catch (error) {
      console.error('Failed to send kill action:', error);
    }
  }

  private canSendAction(): boolean {
    const canSend = !!(this.sessionState && this.isRegistered && this.playerPDA && this.gameStatePDA);
    
    if (!canSend) {
      console.log("🔒 Action blocked. Check:");
      console.log("- Has session?", !!this.sessionState);
      console.log("- Is registered?", this.isRegistered);
      console.log("- Has PDAs?", !!(this.playerPDA && this.gameStatePDA));
    }
    
    return canSend;
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
    
    // Di chuyển player
    let moved = false;
    if (this.keysPressed['ArrowLeft']) {
      this.player.x = Math.max(0, this.player.x - this.player.speed);
      moved = true;
    }
    if (this.keysPressed['ArrowRight']) {
      this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + this.player.speed);
      moved = true;
    }
    
    // Gửi move action (debounce)
    if (moved && currentTime - this.lastMoveTime > this.moveDebounceMs) {
      this.sendMoveAction();
      this.lastMoveTime = currentTime;
    }
    
    // Cập nhật đạn
    this.bullets = this.bullets.filter(bullet => {
      bullet.y -= bullet.speed;
      
      // Kiểm tra va chạm với kẻ địch
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (this.checkCollision(bullet, enemy)) {
          this.enemies.splice(i, 1);
          this.score += 100;
          this.kills++;
          
          // Gửi kill action
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
    
    // Tạo kẻ địch ngẫu nhiên
    if (Math.random() < 0.02 && this.enemies.length < 10) {
      this.spawnEnemy();
    }
    
    // Cập nhật kẻ địch
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
        this.sessionState!.sessionPublicKey,
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
      console.error("No session state");
      return null;
    }

    const startTime = performance.now();
    
    // Cập nhật UI
    this.callbacks.onTransactionFeedUpdate?.({
      type: type as any,
      status: 'pending',
      message: `${type} sending...`,
      details: `Score: ${this.score}`
    });

    try {
      this.performanceStats.pendingTx++;
      this.performanceStats.totalActions++;
      
      const signature = await this.sessionState.sendTransaction([instruction]);
      
      const confirmTime = performance.now() - startTime;
      this.performanceStats.confirmationTimes.push(confirmTime);
      
      // Cập nhật performance
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
        // Space để start nếu game chưa chạy
        if (this.isRegistered) {
          this.start();
        } else {
          console.log("⚠️ Register player first!");
        }
      } else {
        // Space để bắn khi game đang chạy
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
