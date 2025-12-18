import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram, Connection } from '@solana/web3.js';
import { Buffer } from 'buffer';

// 🔥 PROGRAM ID THỰC
export const FURBO_PROGRAM_ID = new PublicKey('3LVJhB8fFqHQWuWF694R1U15ZP1SFuKRmwB8U5JbvUYY');

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

// 🔥 MANUAL INSTRUCTION BUILDERS CHUẨN XÁC
export const createInitializeGameIx = (
  gameStatePDA: PublicKey,
  authority: PublicKey
): TransactionInstruction => {
  const data = Buffer.alloc(8);
  data.writeUInt8(0, 0); // instruction index = 0 (initialize_game)
  
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
  
  // instruction index = 1 (register_player)
  data.writeUInt8(1, offset); offset += 1;
  
  // name length (4 bytes)
  data.writeUInt32LE(nameBuffer.length, offset); offset += 4;
  
  // name
  nameBuffer.copy(data, offset); offset += nameBuffer.length;
  
  // session key (32 bytes)
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
  
  // instruction index = 2 (update_session)
  data.writeUInt8(2, offset); offset += 1;
  
  // new_session_key (32 bytes)
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
  // GameData struct: action_type (1) + x (2) + y (2) + direction (1) + timestamp (8) = 14 bytes
  const data = Buffer.alloc(8 + 1 + 14);
  let offset = 0;
  
  // instruction index = 3 (game_action)
  data.writeUInt8(3, offset); offset += 1;
  
  // action_type (1 byte)
  data.writeUInt8(actionType, offset); offset += 1;
  
  // GameData struct
  // action_type (redundant but matches Rust)
  data.writeUInt8(gameData.action_type, offset); offset += 1;
  
  // x (2 bytes)
  data.writeUInt16LE(gameData.x, offset); offset += 2;
  
  // y (2 bytes)
  data.writeUInt16LE(gameData.y, offset); offset += 2;
  
  // direction (1 byte)
  data.writeUInt8(gameData.direction, offset); offset += 1;
  
  // timestamp (8 bytes) - i64
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
  
  // instruction index = 4 (end_game)
  data.writeUInt8(4, offset); offset += 1;
  
  // final_score (8 bytes) - u64
  data.writeBigUInt64LE(BigInt(finalScore), offset); offset += 8;
  
  // final_kills (4 bytes) - u32
  data.writeUInt32LE(finalKills, offset); offset += 4;
  
  // final_shots (4 bytes) - u32
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
    actionsDataSize += 1 + 8 + 4 + action.data.length; // action_type + timestamp + data_len + data
  });
  
  const data = Buffer.alloc(8 + 4 + actionsDataSize);
  let offset = 0;
  
  // instruction index = 5 (batch_actions)
  data.writeUInt8(5, offset); offset += 1;
  
  // actions length (4 bytes) - u32
  data.writeUInt32LE(actions.length, offset); offset += 4;
  
  // Serialize each action
  for (const action of actions) {
    // action_type (1 byte)
    data.writeUInt8(action.action_type, offset); offset += 1;
    
    // timestamp (8 bytes) - i64
    const timestampBuffer = Buffer.alloc(8);
    timestampBuffer.writeBigInt64LE(BigInt(action.timestamp));
    timestampBuffer.copy(data, offset); offset += 8;
    
    // data length (4 bytes) - u32
    data.writeUInt32LE(action.data.length, offset); offset += 4;
    
    // data
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

// 🔥 TYPES
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
  onTransactionComplete: (type: string, success: boolean, signature?: string) => void;
}

// 🔥 DECODE FUNCTIONS
export const decodePlayerData = (data: Buffer) => {
  try {
    let offset = 0;
    
    // wallet (32 bytes)
    const wallet = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // session_key (32 bytes)
    const sessionKey = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // name length (4 bytes) - u32
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    
    // name (variable length)
    const name = data.slice(offset, offset + nameLength).toString('utf8');
    offset += nameLength;
    
    // score (8 bytes) - u64
    const score = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // high_score (8 bytes) - u64
    const highScore = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // kills (8 bytes) - u64
    const kills = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // shots (8 bytes) - u64
    const shots = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // games_played (4 bytes) - u32
    const gamesPlayed = data.readUInt32LE(offset);
    offset += 4;
    
    // registered_at (8 bytes) - i64
    const registeredAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    
    // last_active (8 bytes) - i64
    const lastActive = Number(data.readBigInt64LE(offset));
    offset += 8;
    
    // is_active (1 byte) - bool
    const isActive = data.readUInt8(offset) === 1;
    
    return {
      wallet: wallet.toString(),
      sessionKey: sessionKey.toString(),
      name,
      score,
      highScore,
      kills,
      shots,
      gamesPlayed,
      registeredAt,
      lastActive,
      isActive
    };
  } catch (error) {
    console.error('Error decoding player data:', error);
    return null;
  }
};

export const decodeGameStateData = (data: Buffer) => {
  try {
    let offset = 0;
    
    // bump (1 byte) - u8
    const bump = data.readUInt8(offset);
    offset += 1;
    
    // authority (32 bytes)
    const authority = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    
    // created_at (8 bytes) - i64
    const createdAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    
    // updated_at (8 bytes) - i64
    const updatedAt = Number(data.readBigInt64LE(offset));
    offset += 8;
    
    // total_players (8 bytes) - u64
    const totalPlayers = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // total_games (8 bytes) - u64
    const totalGames = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // total_shots (8 bytes) - u64
    const totalShots = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // total_kills (8 bytes) - u64
    const totalKills = Number(data.readBigUInt64LE(offset));
    offset += 8;
    
    // leaderboard (array of 10 PlayerScore)
    const leaderboard = [];
    for (let i = 0; i < 10; i++) {
      const player = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      const wallet = new PublicKey(data.slice(offset, offset + 32));
      offset += 32;
      
      const nameLength = data.readUInt32LE(offset);
      offset += 4;
      
      const name = data.slice(offset, offset + nameLength).toString('utf8');
      offset += nameLength;
      
      const score = Number(data.readBigUInt64LE(offset));
      offset += 8;
      
      const updatedAt = Number(data.readBigInt64LE(offset));
      offset += 8;
      
      leaderboard.push({
        player: player.toString(),
        wallet: wallet.toString(),
        name,
        score,
        updatedAt
      });
    }
    
    return {
      bump,
      authority: authority.toString(),
      createdAt,
      updatedAt,
      totalPlayers,
      totalGames,
      totalShots,
      totalKills,
      leaderboard
    };
  } catch (error) {
    console.error('Error decoding game state:', error);
    return null;
  }
};

// 🔥 MAIN GAME ENGINE CLASS
export class FurboGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sessionState?: EstablishedSessionState;
  private callbacks: GameCallbacks;
  private gameLoopId?: number;
  
  // Game objects
  private player: { x: number; y: number; width: number; height: number; speed: number };
  private bullets: Array<{ x: number; y: number; width: number; height: number; speed: number }>;
  private enemies: Array<{ x: number; y: number; width: number; height: number; speed: number }>;
  private keysPressed: { [key: string]: boolean };
  
  // Game state
  private score: number = 0;
  private gameTime: number = 0;
  private isRunning: boolean = false;
  private playerName: string = '';
  private isRegistered: boolean = false;
  private kills: number = 0;
  private shots: number = 0;
  private pendingActions: BatchAction[] = [];
  
  // Performance tracking
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

  // Chain state
  private playerPDA?: PublicKey;
  private gameStatePDA?: PublicKey;
  private lastChainUpdate: number = 0;
  private lastBatchTime: number = 0;
  private batchInterval: number = 5000; // Send batch every 5 seconds

  constructor(
    canvas: HTMLCanvasElement,
    sessionState: EstablishedSessionState | undefined,
    callbacks: GameCallbacks
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.sessionState = sessionState;
    this.callbacks = callbacks;
    
    // Initialize game objects
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
    
    // Start batch processing
    this.startBatchProcessing();
  }

  updateSession(sessionState: EstablishedSessionState | undefined) {
    const oldSessionState = this.sessionState;
    this.sessionState = sessionState;
    
    if (sessionState && oldSessionState?.walletPublicKey.toString() !== sessionState.walletPublicKey.toString()) {
      this.initializeChainState();
      
      // Update session key if player was already registered
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
    
    // Calculate PDAs
    const [playerPDA] = getPlayerPDA(this.sessionState.walletPublicKey);
    const [gameStatePDA] = getGameStatePDA();
    
    this.playerPDA = playerPDA;
    this.gameStatePDA = gameStatePDA;
    
    // Try to fetch player data from chain
    this.fetchPlayerData();
  }

  private async fetchPlayerData() {
    if (!this.sessionState || !this.playerPDA) return;
    
    try {
      const connection = this.sessionState.connection;
      const accountInfo = await connection.getAccountInfo(this.playerPDA);
      
      if (accountInfo?.data) {
        const playerData = decodePlayerData(accountInfo.data);
        if (playerData) {
          this.isRegistered = true;
          this.playerName = playerData.name;
          this.score = playerData.score;
          this.kills = playerData.kills;
          this.shots = playerData.shots;
          
          this.callbacks.onChainUpdate({
            playerScore: playerData.score,
            playerKills: playerData.kills,
            playerShots: playerData.shots,
            playerName: playerData.name,
            isRegistered: true
          });
          
          console.log('Player data loaded from chain:', playerData);
        }
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
      this.callbacks.onTransactionComplete('register', false);
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
        
        // Update local state
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
      this.callbacks.onTransactionComplete('register', false);
      return false;
    }
  }

  async initializeGameOnChain(): Promise<boolean> {
    if (!this.sessionState || !this.gameStatePDA) return false;
    
    try {
      const instruction = createInitializeGameIx(
        this.gameStatePDA,
        this.sessionState.walletPublicKey
      );
      
      await this.sendTransaction(instruction, 'initialize_game');
      return true;
    } catch (error) {
      console.error('Game initialization failed:', error);
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
    
    // Send any pending actions
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

    // Update game logic
    this.update();
    
    // Render
    this.render();
    
    // Continue loop
    this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
    const currentTime = Date.now();
    
    // Update game time
    this.gameTime += 16; // ~60fps
    
    // Player movement
    if (this.keysPressed['ArrowLeft']) {
      this.player.x = Math.max(0, this.player.x - this.player.speed);
      
      // Add move action to batch (throttled)
      if (currentTime % 100 === 0) {
        this.addPendingAction(0, 'left'); // 0 = move
      }
    }
    
    if (this.keysPressed['ArrowRight']) {
      this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + this.player.speed);
      
      // Add move action to batch (throttled)
      if (currentTime % 100 === 0) {
        this.addPendingAction(0, 'right'); // 0 = move
      }
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
          
          // Add kill action to batch
          this.addPendingAction(2, 'kill'); // 2 = kill
          
          return false; // Remove bullet
        }
      }
      
      return bullet.y > -bullet.height;
    });
    
    // Spawn enemies
    if (Math.random() < 0.02 && this.enemies.length < 10) {
      this.spawnEnemy();
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
    
    // Update callbacks
    this.callbacks.onScoreUpdate(this.score);
    this.callbacks.onGameTimeUpdate(Math.floor(this.gameTime / 1000));
    
    // Check if we should send batch
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
    
    // Update stats
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
      // Re-add actions to pending if failed
      // In production, you might want more sophisticated retry logic
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

    // Create bullet
    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 4,
      y: this.player.y - 20,
      width: 8,
      height: 20,
      speed: 15
    });

    this.shots++;
    
    // Add shoot action to batch
    this.addPendingAction(1, 'shoot'); // 1 = shoot
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
      
      // Reset local stats after successful save
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
      this.callbacks.onTransactionComplete(type, false);
      return null;
    }

    const startTime = performance.now();

    try {
      this.performanceStats.pendingTx++;
      this.updatePerformance();
      
      const signature = await this.sessionState.sendTransaction([instruction]);
      
      const confirmTime = performance.now() - startTime;
      this.performanceStats.confirmationTimes.push(confirmTime);
      
      // Keep only last 50 confirmation times
      if (this.performanceStats.confirmationTimes.length > 50) {
        this.performanceStats.confirmationTimes.shift();
      }
      
      this.performanceStats.pendingTx--;
      this.updatePerformance();
      
      console.log(`✅ ${type} tx confirmed in ${confirmTime.toFixed(0)}ms: ${signature}`);
      this.callbacks.onTransactionComplete(type, true, signature);
      
      return signature;
      
    } catch (error) {
      this.performanceStats.pendingTx--;
      this.updatePerformance();
      
      console.error(`❌ ${type} tx failed:`, error);
      this.callbacks.onTransactionComplete(type, false);
      
      return null;
    }
  }

  private startBatchProcessing() {
    // Process batches every 5 seconds
    setInterval(() => {
      if (this.isRunning && this.pendingActions.length > 0) {
        this.flushPendingActions();
      }
    }, this.batchInterval);
  }

  private updatePerformance() {
    // Calculate average confirmation time
    if (this.performanceStats.confirmationTimes.length > 0) {
      this.performanceStats.avgConfirm = Math.floor(
        this.performanceStats.confirmationTimes.reduce((a, b) => a + b, 0) /
        this.performanceStats.confirmationTimes.length
      );
    }
    
    // Calculate success rate
    const totalTransactions = this.performanceStats.movesSent + 
                             this.performanceStats.shotsSent + 
                             this.performanceStats.killsSent;
    
    // Simplified success rate - assume all confirmed are successful
    const successfulTransactions = Math.min(
      this.performanceStats.confirmationTimes.length,
      totalTransactions
    );
    
    this.performanceStats.successRate = totalTransactions > 0 ? 
      (successfulTransactions / totalTransactions) * 100 : 100;
    
    // Calculate chain speed based on recent batch activity
    const recentActivity = this.pendingActions.length;
    this.performanceStats.chainSpeed = Math.min(recentActivity * 10, 100);
    
    this.callbacks.onPerformanceUpdate({ ...this.performanceStats });
  }

  private render() {
    // Clear canvas
    this.ctx.fillStyle = '#0a1929';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw game elements
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
    // Player ship
    this.ctx.fillStyle = '#00d4ff';
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x + 35, this.player.y);
    this.ctx.lineTo(this.player.x, this.player.y + 80);
    this.ctx.lineTo(this.player.x + 70, this.player.y + 80);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Border
    this.ctx.strokeStyle = 'white';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Cockpit
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(this.player.x + 35, this.player.y + 20, 10, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Engine glow
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
      
      // Eyes
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(enemy.x + 15, enemy.y + 15, 5, 0, Math.PI * 2);
      this.ctx.arc(enemy.x + 35, enemy.y + 15, 5, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Mouth
      this.ctx.beginPath();
      this.ctx.arc(enemy.x + 25, enemy.y + 35, 8, 0, Math.PI);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#ff416c';
    });
    
    this.ctx.shadowBlur = 0;
  }

  private drawUI() {
    // Score background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(10, 10, 200, 140);
    
    // Score
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 35);
    this.ctx.fillText(`TIME: ${Math.floor(this.gameTime / 1000)}s`, 20, 60);
    this.ctx.fillText(`KILLS: ${this.kills}`, 20, 85);
    this.ctx.fillText(`SHOTS: ${this.shots}`, 20, 110);
    
    // Player name
    if (this.playerName) {
      this.ctx.fillStyle = this.isRegistered ? '#00ff88' : '#ffde59';
      this.ctx.font = '16px Arial';
      this.ctx.fillText(`${this.playerName}`, 20, 135);
    }
    
    // Pending actions
    if (this.pendingActions.length > 0) {
      this.ctx.fillStyle = '#ffde59';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(`📤 ${this.pendingActions.length} pending`, 20, 155);
    }
  }

  private drawConnectionStatus() {
    const status = this.sessionState ? '🟢 FOGO CHAIN' : '🔴 DISCONNECTED';
    const color = this.sessionState ? '#00ff88' : '#ff4444';
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(this.canvas.width - 200, 10, 190, 30);
    
    // Text
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(status, this.canvas.width - 15, 30);
    
    // Registration status
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

  private setupEventListeners() {
    const handleKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
    const handleKeyUp = (e: KeyboardEvent) => this.handleKeyUp(e);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Store references for cleanup
    this.handleKeyDown = handleKeyDown;
    this.handleKeyUp = handleKeyUp;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.isRunning) return;

    this.keysPressed[e.code] = true;

    if (e.code === 'Space') {
      e.preventDefault();
      this.shoot();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keysPressed[e.code] = false;
  }

  // Store event handlers for cleanup
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;

  destroy() {
    this.pause();
    
    // Send any remaining actions
    this.flushPendingActions();
    
    // Remove event listeners
    if (this.handleKeyDown) {
      window.removeEventListener('keydown', this.handleKeyDown);
    }
    if (this.handleKeyUp) {
      window.removeEventListener('keyup', this.handleKeyUp);
    }
  }
}
