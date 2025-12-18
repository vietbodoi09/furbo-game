import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';

// 🔥 PROGRAM ID THỰC
export const FURBO_PROGRAM_ID = new PublicKey('DKnfKiJxtzrCAR7sWbWf3v7Jvhjsxawgzf28fAQvN3uf');

// 🔥 PDAs HELPER FUNCTIONS
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

// 🔥 TYPES (Đặt lên trước)
export interface GameData {
  action_type: number;
  x: number;
  y: number;
  direction: number;
  timestamp: number;
}

export interface BatchAction {
  action_type: number;
  timestamp: number;
  data: Buffer;
}

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
}

// 🔥 MANUAL INSTRUCTION BUILDERS CHUẨN XÁC
export const createInitializeGameIx = (
  gameStatePDA: PublicKey,
  authority: PublicKey
): TransactionInstruction => {
  const data = Buffer.alloc(8);
  data.writeUInt8(0, 0);
  
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

export const createRegisterPlayerIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  authority: PublicKey,
  name: string,
  sessionKey: PublicKey
): TransactionInstruction => {
  const nameBuffer = Buffer.from(name, 'utf8');
  const data = Buffer.alloc(8 + 4 + nameBuffer.length + 32);
  let offset = 0;
  
  data.writeUInt8(1, offset); offset += 1;
  data.writeUInt32LE(nameBuffer.length, offset); offset += 4;
  nameBuffer.copy(data, offset); offset += nameBuffer.length;
  sessionKey.toBuffer().copy(data, offset); offset += 32;
  
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

export const createUpdateSessionIx = (
  playerPDA: PublicKey,
  authority: PublicKey,
  newSessionKey: PublicKey
): TransactionInstruction => {
  const data = Buffer.alloc(8 + 32);
  let offset = 0;
  
  data.writeUInt8(2, offset); offset += 1;
  newSessionKey.toBuffer().copy(data, offset); offset += 32;
  
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

export const createGameActionIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  actionType: number,
  gameData: GameData
): TransactionInstruction => {
  const data = Buffer.alloc(8 + 1 + 14);
  let offset = 0;
  
  data.writeUInt8(3, offset); offset += 1;
  data.writeUInt8(actionType, offset); offset += 1;
  data.writeUInt8(gameData.action_type, offset); offset += 1;
  data.writeUInt16LE(gameData.x, offset); offset += 2;
  data.writeUInt16LE(gameData.y, offset); offset += 2;
  data.writeUInt8(gameData.direction, offset); offset += 1;
  
  const timestampBuffer = Buffer.alloc(8);
  timestampBuffer.writeBigInt64LE(BigInt(gameData.timestamp));
  timestampBuffer.copy(data, offset); offset += 8;
  
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
  
  data.writeUInt8(4, offset); offset += 1;
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

export const createBatchActionsIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  actions: BatchAction[]
): TransactionInstruction => {
  // Calculate total data size
  let actionsDataSize = 0;
  actions.forEach(action => {
    actionsDataSize += 1 + 8 + 4 + action.data.length;
  });
  
  const data = Buffer.alloc(8 + 4 + actionsDataSize);
  let offset = 0;
  
  data.writeUInt8(5, offset); offset += 1;
  data.writeUInt32LE(actions.length, offset); offset += 4;
  
  for (const action of actions) {
    data.writeUInt8(action.action_type, offset); offset += 1;
    
    const timestampBuffer = Buffer.alloc(8);
    timestampBuffer.writeBigInt64LE(BigInt(action.timestamp));
    timestampBuffer.copy(data, offset); offset += 8;
    
    data.writeUInt32LE(action.data.length, offset); offset += 4;
    action.data.copy(data, offset); offset += action.data.length;
  }
  
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

// 🔥 MAIN GAME ENGINE CLASS
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
  private pendingActions: BatchAction[] = [];
  
  private performanceStats = {
    movesSent: 0,
    shotsSent: 0,
    killsSent: 0,
    avgConfirm: 0,
    successRate: 100,
    pendingTx: 0,
    chainSpeed: 0,
    confirmationTimes: [] as number[]
  };

  private playerPDA?: PublicKey;
  private gameStatePDA?: PublicKey;
  private lastChainUpdate: number = 0;
  private lastBatchTime: number = 0;
  private batchInterval: number = 5000;

  constructor(
    canvas: HTMLCanvasElement,
    sessionState: EstablishedSessionState | undefined,
    callbacks: GameCallbacks
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
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
    
    this.startBatchProcessing();
  }

  updateSession(sessionState: EstablishedSessionState | undefined) {
    const oldSessionState = this.sessionState;
    this.sessionState = sessionState;
    
    if (sessionState && oldSessionState?.walletPublicKey.toString() !== sessionState.walletPublicKey.toString()) {
      this.initializeChainState();
      
      if (this.isRegistered && this.playerPDA) {
        this.updateSessionKey();
      }
    }
  }

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
      const connection = this.sessionState.connection;
      const accountInfo = await connection.getAccountInfo(this.playerPDA);
      
      if (accountInfo?.data) {
        // In thực tế cần decode đúng format
        this.isRegistered = true;
        this.playerName = "Loaded Player"; // Placeholder
        this.score = 0;
        this.kills = 0;
        this.shots = 0;
        
        this.callbacks.onChainUpdate({
          playerScore: 0,
          playerKills: 0,
          playerShots: 0,
          playerName: "Loaded Player",
          isRegistered: true
        });
        
        console.log('Player data loaded from chain');
      } else {
        console.log('Player not registered on chain yet');
        this.callbacks.onChainUpdate({
          isRegistered: false
        });
      }
    } catch (error) {
      console.error('Error fetching player data:', error);
    }
  }

  async updateSessionKey(): Promise<boolean> {
    if (!this.sessionState || !this.playerPDA) return false;
    
    try {
      const instruction = createUpdateSessionIx(
        this.playerPDA,
        this.sessionState.walletPublicKey,
        this.sessionState.sessionPublicKey
      );
      
      await this.sendTransaction(instruction, 'update_session');
      return true;
    } catch (error) {
      console.error('Failed to update session key:', error);
      return false;
    }
  }

  setPlayerName(name: string) {
    this.playerName = name.trim();
  }

  async registerPlayer(): Promise<boolean> {
    if (!this.sessionState || !this.playerName || this.playerName.length < 3) {
      this.callbacks.onTransactionComplete?.('register', false);
      return false;
    }

    try {
      if (!this.playerPDA || !this.gameStatePDA) {
        throw new Error('PDAs not initialized');
      }

      const instruction = createRegisterPlayerIx(
        this.playerPDA,
        this.gameStatePDA,
        this.sessionState.walletPublicKey,
        this.playerName,
        this.sessionState.sessionPublicKey
      );

      const signature = await this.sendTransaction(instruction, 'register_player');
      
      if (signature) {
        this.isRegistered = true;
        
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
      console.error('Registration failed:', error);
      this.callbacks.onTransactionComplete?.('register', false);
      return false;
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastChainUpdate = Date.now();
    this.lastBatchTime = Date.now();
    this.gameLoop();
  }

  pause() {
    this.isRunning = false;
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }
    
    this.flushPendingActions();
  }

  reset() {
    this.score = 0;
    this.gameTime = 0;
    this.kills = 0;
    this.shots = 0;
    this.bullets = [];
    this.enemies = [];
    this.pendingActions = [];
    this.player.x = this.canvas.width / 2 - 35;
    this.callbacks.onScoreUpdate(this.score);
    this.callbacks.onGameTimeUpdate(0);
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
    
    if (this.keysPressed['ArrowLeft']) {
      this.player.x = Math.max(0, this.player.x - this.player.speed);
      if (currentTime % 100 === 0) {
        this.addPendingAction(0, 'left');
      }
    }
    
    if (this.keysPressed['ArrowRight']) {
      this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + this.player.speed);
      if (currentTime % 100 === 0) {
        this.addPendingAction(0, 'right');
      }
    }
    
    this.bullets = this.bullets.filter(bullet => {
      bullet.y -= bullet.speed;
      
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (this.checkCollision(bullet, enemy)) {
          this.enemies.splice(i, 1);
          this.score += 100;
          this.kills++;
          this.addPendingAction(2, 'kill');
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
    
    this.callbacks.onScoreUpdate(this.score);
    this.callbacks.onGameTimeUpdate(Math.floor(this.gameTime / 1000));
    
    if (currentTime - this.lastBatchTime > this.batchInterval) {
      this.flushPendingActions();
      this.lastBatchTime = currentTime;
    }
  }

  private spawnEnemy() {
    const enemy = {
      x: Math.random() * (this.canvas.width - 50),
      y: -50,
      width: 50,
      height: 50,
      speed: 1 + Math.random() * 2
    };
    this.enemies.push(enemy);
  }

  private addPendingAction(actionType: number, direction: string = '') {
    if (!this.sessionState || !this.isRegistered) return;
    
    const actionData = Buffer.alloc(1);
    actionData.writeUInt8(direction === 'left' ? 0 : 1, 0);
    
    this.pendingActions.push({
      action_type: actionType,
      timestamp: Math.floor(Date.now() / 1000),
      data: actionData
    });
    
    if (actionType === 0) this.performanceStats.movesSent++;
    if (actionType === 1) this.performanceStats.shotsSent++;
    if (actionType === 2) this.performanceStats.killsSent++;
    
    this.updatePerformance();
  }

  private async flushPendingActions() {
    if (this.pendingActions.length === 0 || !this.sessionState || !this.playerPDA || !this.gameStatePDA) {
      return;
    }
    
    try {
      const actions = [...this.pendingActions];
      this.pendingActions = [];
      
      const instruction = createBatchActionsIx(
        this.playerPDA,
        this.gameStatePDA,
        this.sessionState.sessionPublicKey,
        actions
      );
      
      await this.sendTransaction(instruction, 'batch_actions');
      
    } catch (error) {
      console.error('Failed to send batch actions:', error);
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
    this.pause();
    this.sendGameOverToChain();
  }

  async shoot(): Promise<void> {
    if (!this.isRunning) return;

    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 4,
      y: this.player.y - 20,
      width: 8,
      height: 20,
      speed: 15
    });

    this.shots++;
    this.addPendingAction(1, 'shoot');
  }

  private async sendGameOverToChain() {
    if (!this.sessionState || !this.playerPDA || !this.gameStatePDA) return;

    try {
      const instruction = createEndGameIx(
        this.playerPDA,
        this.gameStatePDA,
        this.sessionState.sessionPublicKey,
        this.score,
        this.kills,
        this.shots
      );

      await this.sendTransaction(instruction, 'end_game');
      
      this.score = 0;
      this.kills = 0;
      this.shots = 0;
      this.callbacks.onScoreUpdate(this.score);
      
    } catch (error) {
      console.error('Failed to save game over:', error);
    }
  }

  private async sendTransaction(instruction: TransactionInstruction, type: string): Promise<string | null> {
    if (!this.sessionState) {
      this.callbacks.onTransactionComplete?.(type, false);
      return null;
    }

    const startTime = performance.now();

    try {
      this.performanceStats.pendingTx++;
      this.updatePerformance();
      
      const signature = await this.sessionState.sendTransaction([instruction]);
      
      const confirmTime = performance.now() - startTime;
      this.performanceStats.confirmationTimes.push(confirmTime);
      
      if (this.performanceStats.confirmationTimes.length > 50) {
        this.performanceStats.confirmationTimes.shift();
      }
      
      this.performanceStats.pendingTx--;
      this.updatePerformance();
      
      console.log(`✅ ${type} tx confirmed in ${confirmTime.toFixed(0)}ms: ${signature}`);
      this.callbacks.onTransactionComplete?.(type, true, signature);
      
      return signature;
      
    } catch (error) {
      this.performanceStats.pendingTx--;
      this.updatePerformance();
      
      console.error(`❌ ${type} tx failed:`, error);
      this.callbacks.onTransactionComplete?.(type, false);
      
      return null;
    }
  }

  private startBatchProcessing() {
    setInterval(() => {
      if (this.isRunning && this.pendingActions.length > 0) {
        this.flushPendingActions();
      }
    }, this.batchInterval);
  }

  private updatePerformance() {
    if (this.performanceStats.confirmationTimes.length > 0) {
      this.performanceStats.avgConfirm = Math.floor(
        this.performanceStats.confirmationTimes.reduce((a, b) => a + b, 0) /
        this.performanceStats.confirmationTimes.length
      );
    }
    
    const totalTransactions = this.performanceStats.movesSent + 
                             this.performanceStats.shotsSent + 
                             this.performanceStats.killsSent;
    
    const successfulTransactions = this.performanceStats.confirmationTimes.length;
    this.performanceStats.successRate = totalTransactions > 0 ? 
      Math.min((successfulTransactions / totalTransactions) * 100, 100) : 100;
    
    const recentActivity = this.pendingActions.length;
    this.performanceStats.chainSpeed = Math.min(100 - (recentActivity * 5), 100);
    
    this.callbacks.onPerformanceUpdate({ ...this.performanceStats });
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
    
    if (this.pendingActions.length > 0) {
      this.ctx.fillStyle = '#ffde59';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(`📤 ${this.pendingActions.length} pending`, 20, 155);
    }
  }

  private drawConnectionStatus() {
    const status = this.sessionState ? '🟢 FOGO CHAIN' : '🔴 DISCONNECTED';
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
    if (!this.isRunning) return;
    this.keysPressed[e.code] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      this.shoot();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = false;
  };

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy() {
    this.pause();
    this.flushPendingActions();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
