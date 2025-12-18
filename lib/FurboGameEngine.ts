import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { connection } from "./connection";
import { sha256 } from 'js-sha256';

// 🔥 PROGRAM ID THỰC
export const FURBO_PROGRAM_ID = new PublicKey('DKnfKiJxtzrCAR7sWfF3v7Jvhjsxawgzf28fAQvN3uf');

// 🔥 ANCHOR DISCRIMINATOR HELPER
function getAnchorDiscriminator(instructionName: string): Buffer {
  const namespace = "global";
  const preimage = `${namespace}:${instructionName}`;
  const hash = sha256(preimage);
  // Lấy 8 bytes đầu (16 chars hex)
  return Buffer.from(hash.slice(0, 16), 'hex');
}

// 🔥 PDAs HELPER FUNCTIONS (Giữ nguyên)
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

// 🔥 TYPES (Giữ nguyên)
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

// 🔥 FIXED INSTRUCTION BUILDERS - ANCHOR FORMAT

// initialize_game - Anchor format
export const createInitializeGameIx = (
  gameStatePDA: PublicKey,
  authority: PublicKey
): TransactionInstruction => {
  const discriminator = getAnchorDiscriminator("initialize_game");
  const data = Buffer.alloc(8); // Chỉ discriminator
  
  discriminator.copy(data, 0);
  
  console.log("InitializeGame discriminator:", discriminator.toString('hex'));
  
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

// register_player - Anchor format
export const createRegisterPlayerIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  authority: PublicKey,
  name: string,
  sessionKey: PublicKey
): TransactionInstruction => {
  const discriminator = getAnchorDiscriminator("register_player");
  const nameBuffer = Buffer.from(name, 'utf8');
  
  // Anchor format: discriminator(8) + name_len(4) + name + session_key(32)
  const data = Buffer.alloc(8 + 4 + nameBuffer.length + 32);
  let offset = 0;
  
  // Discriminator
  discriminator.copy(data, offset); offset += 8;
  
  // Name length (u32)
  data.writeUInt32LE(nameBuffer.length, offset); offset += 4;
  
  // Name bytes
  nameBuffer.copy(data, offset); offset += nameBuffer.length;
  
  // Session key
  sessionKey.toBuffer().copy(data, offset); offset += 32;
  
  console.log("RegisterPlayer Anchor data:", {
    discriminator: discriminator.toString('hex'),
    nameLength: nameBuffer.length,
    totalBytes: data.length,
    hexPreview: data.toString('hex').substring(0, 50) + '...'
  });
  
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

// update_session - Anchor format
export const createUpdateSessionIx = (
  playerPDA: PublicKey,
  authority: PublicKey,
  newSessionKey: PublicKey
): TransactionInstruction => {
  const discriminator = getAnchorDiscriminator("update_session");
  
  // Anchor format: discriminator(8) + session_key(32)
  const data = Buffer.alloc(8 + 32);
  let offset = 0;
  
  discriminator.copy(data, offset); offset += 8;
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

// game_action - Anchor format
export const createGameActionIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  actionType: number, // 0=Move, 1=Shoot, 2=Kill
  x: number, // 0-65535
  y: number  // 0-65535
): TransactionInstruction => {
  const discriminator = getAnchorDiscriminator("game_action");
  
  // Anchor format: discriminator(8) + action_type(1) + x(2) + y(2)
  const data = Buffer.alloc(8 + 1 + 2 + 2);
  let offset = 0;
  
  discriminator.copy(data, offset); offset += 8;
  data.writeUInt8(actionType, offset); offset += 1;
  data.writeUInt16LE(x, offset); offset += 2;
  data.writeUInt16LE(y, offset); offset += 2;
  
  console.log(`GameAction data (hex): ${data.toString('hex')}`);
  
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

// end_game - Anchor format
export const createEndGameIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  finalScore: number,
  finalKills: number,
  finalShots: number
): TransactionInstruction => {
  const discriminator = getAnchorDiscriminator("end_game");
  
  // Anchor format: discriminator(8) + score(8) + kills(4) + shots(4)
  const data = Buffer.alloc(8 + 8 + 4 + 4);
  let offset = 0;
  
  discriminator.copy(data, offset); offset += 8;
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

// batch_actions - Anchor format (tuỳ chọn)
export const createBatchActionsIx = (
  playerPDA: PublicKey,
  gameStatePDA: PublicKey,
  signer: PublicKey,
  actions: Array<{ action_type: number, timestamp: number }>
): TransactionInstruction => {
  const discriminator = getAnchorDiscriminator("batch_actions");
  
  // Mỗi action: 1 byte (action_type) + 8 bytes (timestamp)
  const actionsSize = actions.length * (1 + 8);
  const data = Buffer.alloc(8 + 4 + actionsSize);
  let offset = 0;
  
  discriminator.copy(data, offset); offset += 8;
  
  // Number of actions (u32)
  data.writeUInt32LE(actions.length, offset); offset += 4;
  
  for (const action of actions) {
    data.writeUInt8(action.action_type, offset); offset += 1;
    
    const timestampBuffer = Buffer.alloc(8);
    timestampBuffer.writeBigInt64LE(BigInt(action.timestamp));
    timestampBuffer.copy(data, offset); offset += 8;
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

// 🔥 MAIN GAME ENGINE CLASS - ĐÃ FIX ANCHOR FORMAT
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
  
  // Performance tracking
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

  // Chain state
  private playerPDA?: PublicKey;
  private gameStatePDA?: PublicKey;
  
  // Debouncing
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
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;
    this.sessionState = sessionState;
    this.callbacks = callbacks;
    
    // Player setup
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
      const accountInfo = await connection.getAccountInfo(this.playerPDA);

      if (!accountInfo) {
        console.log("Player not registered on chain yet");
        this.isRegistered = false;
        
        this.callbacks.onChainUpdate({
          isRegistered: false,
        });
        return;
      }

      // TODO: Parse player data từ account
      this.isRegistered = true;
      
      this.callbacks.onChainUpdate({
        playerScore: 0,
        playerKills: 0,
        playerShots: 0,
        playerName: this.playerName,
        isRegistered: true,
      });

      console.log("Player data loaded from chain");
    } catch (error) {
      console.error("Error fetching player data:", error);
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

      console.log("Creating Anchor register instruction...");
      const instruction = createRegisterPlayerIx(
        this.playerPDA,
        this.gameStatePDA,
        this.sessionState.walletPublicKey,
        this.playerName,
        this.sessionState.sessionPublicKey
      );

      console.log("Sending registration transaction...");
      const signature = await this.sendTransaction(instruction, 'register');
      
      if (signature) {
        this.isRegistered = true;
        this.start(); // Auto start game after registration
        
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

  // ========== GAME CONTROL ==========
  
  start() {
    console.log("Starting game... isRunning was:", this.isRunning);
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("Game started successfully");
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

  private gameLoop() {
    if (!this.isRunning) return;

    this.update();
    this.render();
    this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const currentTime = Date.now();
    this.gameTime += 16; // ~60 FPS
    
    let moved = false;
    
    // Handle movement
    if (this.keysPressed['ArrowLeft']) {
      this.player.x = Math.max(0, this.player.x - this.player.speed);
      moved = true;
    }
    
    if (this.keysPressed['ArrowRight']) {
      this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + this.player.speed);
      moved = true;
    }
    
    // Send move action với debouncing
    if (moved && currentTime - this.lastMoveTime > this.moveDebounceMs) {
      this.sendMoveAction();
      this.lastMoveTime = currentTime;
    }
    
    // Update bullets
    this.bullets = this.bullets.filter(bullet => {
      bullet.y -= bullet.speed;
      
      // Check collisions với enemies
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (this.checkCollision(bullet, enemy)) {
          this.enemies.splice(i, 1);
          this.score += 100;
          this.kills++;
          
          // Send kill action
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
    
    // Spawn enemies randomly
    if (Math.random() < 0.02 && this.enemies.length < 10) {
      this.spawnEnemy();
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
    
    this.callbacks.onGameTimeUpdate(Math.floor(this.gameTime / 1000));
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
  
  private checkCollision(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  // ========== BLOCKCHAIN ACTIONS ==========

  private async sendMoveAction(): Promise<void> {
    if (!this.canSendAction()) {
      console.log("Cannot send move: action blocked");
      return;
    }
    
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
      this.performanceStats.movesSent++;
      this.updatePerformance();
      
    } catch (error) {
      console.error('Failed to send move action:', error);
    }
  }

  async shoot(): Promise<void> {
    if (!this.isRunning) {
      console.log("Game is not running, cannot shoot");
      return;
    }
    
    if (!this.canSendAction()) {
      console.log("Cannot shoot: action blocked");
      return;
    }

    // Add bullet visually
    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 4,
      y: this.player.y - 20,
      width: 8,
      height: 20,
      speed: 15
    });

    this.shots++;
    
    // Send shoot action
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
      this.performanceStats.shotsSent++;
      this.updatePerformance();
      
    } catch (error) {
      console.error('Failed to send shoot action:', error);
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
      this.performanceStats.killsSent++;
      this.updatePerformance();
      
    } catch (error) {
      console.error('Failed to send kill action:', error);
    }
  }

  private canSendAction(): boolean {
    const canSend = !!(this.sessionState && this.isRegistered && this.playerPDA && this.gameStatePDA);
    console.log("canSendAction:", { 
      hasSession: !!this.sessionState, 
      isRegistered: this.isRegistered,
      hasPlayerPDA: !!this.playerPDA,
      hasGameStatePDA: !!this.gameStatePDA,
      result: canSend
    });
    return canSend;
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
      
      // Reset local stats
      this.score = 0;
      this.kills = 0;
      this.shots = 0;
      this.callbacks.onScoreUpdate(this.score);
      
    } catch (error) {
      console.error('Failed to save game over:', error);
    }
  }

  private gameOver() {
    this.isRunning = false;
    this.pause();
    this.sendGameOverToChain();
    alert(`Game Over! Final Score: ${this.score}`);
  }

  private async sendTransaction(instruction: TransactionInstruction, type: string): Promise<string | null> {
    if (!this.sessionState) {
      console.error("No session state for transaction");
      this.callbacks.onTransactionComplete?.(type, false);
      this.callbacks.onTransactionFeedUpdate?.({
        type: type as any,
        status: 'failed',
        message: `${type.replace('_', ' ')} failed`,
        details: 'Wallet not connected'
      });      
      return null;
    }

    const startTime = performance.now();

    const actionType = type === 'move' ? 'move' : 
                   type === 'shoot' ? 'shoot' : 
                   type === 'kill' ? 'kill' : 
                   type === 'register' ? 'register' : 
                   type === 'end_game' ? 'end_game' : 'update_session';
    
    this.callbacks.onTransactionFeedUpdate?.({
      type: actionType,
      status: 'pending',
      message: `${actionType.replace('_', ' ')} sending...`,
      details: type === 'move' ? `position: (${Math.floor(this.player.x)}, ${Math.floor(this.player.y)})` : 
               type === 'shoot' ? `shots: ${this.shots}` :
               type === 'kill' ? `total kills: ${this.kills}` : 
               type === 'register' ? `name: ${this.playerName}` : undefined
    });

    try {
      this.performanceStats.pendingTx++;
      this.performanceStats.totalActions++;
      this.updatePerformance();
      
      const signature = await this.sessionState.sendTransaction([instruction]);
      
      const confirmTime = performance.now() - startTime;
      this.performanceStats.confirmationTimes.push(confirmTime);

      this.callbacks.onTransactionFeedUpdate?.({
        type: actionType,
        status: 'confirmed',
        signature: signature,
        message: type === 'move' ? 'Move action confirmed' :
                 type === 'shoot' ? 'Shoot action confirmed' :
                 type === 'kill' ? 'Enemy killed! +100 points' :
                 type === 'register' ? 'Player registered successfully' :
                 type === 'end_game' ? 'Game saved to blockchain' :
                 'Session updated',
        details: type === 'move' ? `position: (${Math.floor(this.player.x)}, ${Math.floor(this.player.y)})` : 
                 type === 'shoot' ? `total shots: ${this.shots}` :
                 type === 'kill' ? `total kills: ${this.kills}` :
                 type === 'register' ? `name: ${this.playerName}` :
                 type === 'end_game' ? `final score: ${this.score}` :
                 'session key updated'
      });
      
      if (this.performanceStats.confirmationTimes.length > 50) {
        this.performanceStats.confirmationTimes.shift();
      }
      
      this.performanceStats.pendingTx--;
      this.updatePerformance();
      
      console.log(`✅ ${type} tx confirmed in ${confirmTime.toFixed(0)}ms: ${signature}`);
      console.log(`   Signature: https://fogoscan.com/tx/${signature}?cluster=testnet`);
      
      this.callbacks.onTransactionComplete?.(type, true, signature);
      
      return signature;
      
    } catch (error) {
      this.performanceStats.pendingTx--;
      this.performanceStats.failedActions++;
      this.updatePerformance();
      
      console.error(`❌ ${type} tx failed:`, error);
      this.callbacks.onTransactionComplete?.(type, false);

      this.callbacks.onTransactionFeedUpdate?.({
        type: actionType,
        status: 'failed',
        message: `${actionType.replace('_', ' ')} failed`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return null;
    }
  }

  private updatePerformance() {
    if (this.performanceStats.confirmationTimes.length > 0) {
      const sum = this.performanceStats.confirmationTimes.reduce((a, b) => a + b, 0);
      this.performanceStats.avgConfirm = Math.floor(sum / this.performanceStats.confirmationTimes.length);
    }
    
    const totalAttempted = this.performanceStats.totalActions;
    const successful = this.performanceStats.confirmationTimes.length;
    this.performanceStats.successRate = totalAttempted > 0 ? 
      Math.round((successful / totalAttempted) * 100) : 100;
    
    this.callbacks.onPerformanceUpdate({ ...this.performanceStats });
  }

  // ========== RENDERING (Giữ nguyên) ==========
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

  // ========== EVENT HANDLERS ==========

  private handleKeyDown = (e: KeyboardEvent) => {
    console.log("Key pressed:", e.code, "isRunning:", this.isRunning);
    
    if (!this.isRunning) {
      // Cho phép space để start game nếu chưa running
      if (e.code === 'Space') {
        e.preventDefault();
        if (!this.isRunning && this.isRegistered) {
          this.start();
          this.reset();
        }
      }
      return;
    }
    
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
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  // ========== PUBLIC UTILITY METHODS ==========

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

  async initializeGame(): Promise<boolean> {
    if (!this.sessionState || !this.gameStatePDA) return false;
    
    try {
      const instruction = createInitializeGameIx(
        this.gameStatePDA,
        this.sessionState.walletPublicKey
      );
      
      await this.sendTransaction(instruction, 'initialize_game');
      return true;
    } catch (error) {
      console.error('Failed to initialize game:', error);
      return false;
    }
  }
}
