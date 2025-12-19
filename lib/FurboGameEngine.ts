import { EstablishedSessionState } from '@fogo/sessions-sdk-react';
import { TransactionInstruction, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { connection } from "./connection";

// 🔥 PROGRAM ID 
export const FURBO_PROGRAM_ID = new PublicKey('Z7wmp9MFSQ8HxoYV1xzj5MfzVBFsRUV9vVP3kUsWbEa');

// ========== DISCORDINATORS ==========
const DISCRIMINATORS = {
  game_action: Buffer.from('ab88c62f782cec7c', 'hex'),
  end_game: Buffer.from('e087f56343af79fc', 'hex'),
};

// ========== PDA FUNCTIONS (ĐƠN GIẢN HÓA) ==========
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

// ========== INSTRUCTION BUILDERS (CHỈ CẦN GAME ACTION) ==========
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

// ========== SIMPLE GAME ENGINE (SKIP REGISTER, FOCUS ON GAMEPLAY) ==========

export class FurboGameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sessionState: EstablishedSessionState | null = null;
  
  // 🔥 THÊM TEST MODE
  private testMode: boolean = true;
  private playerName: string = 'TestPlayer';
  private isRegistered: boolean = false; // Luôn false trong test mode
  
  // Game state
  private score: number = 0;
  private kills: number = 0;
  private shots: number = 0;
  private isRunning: boolean = false;
  private gameLoopId: number | null = null;
  
  // Player và game objects
  private player = { x: 0, y: 0, width: 70, height: 80, speed: 8 };
  private bullets: { x: number, y: number, width: number, height: number, speed: number }[] = [];
  private enemies: { x: number, y: number, width: number, height: number, speed: number }[] = [];
  private keysPressed: { [key: string]: boolean } = {};
  
  // On-chain state (dùng mock trong test mode)
  private playerPDA: PublicKey | null = null;
  private gameStatePDA: PublicKey | null = null;
  
  // Action queue để xử lý on-chain actions không đồng bộ
  private actionQueue: { action: string, x: number, y: number }[] = [];
  private isProcessingAction: boolean = false;

  pause() {
    console.log('⏸️ Game paused');
    this.stop(); // Gọi stop() để tạm dừng game
  }
  
  // Method stop() đã tồn tại
  stop() {
    this.isRunning = false;
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
    console.log('🛑 Game stopped');
  }
  
  // 🔥 CŨNG THÊM CÁC METHOD KHÁC CÓ THỂ BỊ THIẾU
  updateSession(sessionState: EstablishedSessionState | null) {
    console.log('🔄 updateSession called (redirecting to setSession)');
    this.setSession(sessionState);
  }
  
  setSession(sessionState: EstablishedSessionState | null) {
    this.sessionState = sessionState;
    if (sessionState) {
      console.log('🔗 Session connected:', sessionState.sessionPublicKey.toString());
      this.initializeMockPDAs(sessionState.sessionPublicKey);
    } else {
      console.log('🔗 Session disconnected');
    }
  }
  setPlayerName(name: string) {
    console.log('👤 setPlayerName called:', name);
    this.setName(name); // Gọi setName() hiện có
  }
  
  setName(name: string) {
    this.playerName = name.trim();
    console.log('👤 Player name set:', this.playerName);
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    
    // Center player
    this.player.x = canvas.width / 2 - 35;
    this.player.y = canvas.height - 100;
    
    this.setupEventListeners();
    this.render();
    
    console.log('🎮 Game Engine initialized (TEST MODE)');
    console.log('🧪 Skip register enabled - Focus on gameplay');
  }
  
  // 🔥 PUBLIC API ĐƠN GIẢN
  
  setSession(sessionState: EstablishedSessionState | null) {
    this.sessionState = sessionState;
    if (sessionState) {
      console.log('🔗 Session connected:', sessionState.sessionPublicKey.toString());
      // Trong test mode, vẫn tạo PDAs nhưng không check registration
      this.initializeMockPDAs(sessionState.sessionPublicKey);
    } else {
      console.log('🔗 Session disconnected');
    }
  }

  setName(name: string) {
    this.playerName = name.trim();
    console.log('👤 Player name:', this.playerName);
  }
  
  // 🔥 BỎ QUA REGISTER - LUÔN TRẢ VỀ TRUE
  async registerPlayer(): Promise<boolean> {
    console.log('🧪 SKIP REGISTER - Direct to gameplay');
    this.isRegistered = true; // Đánh dấu là đã "đăng ký" trong test mode
    return true;
  }

  // Start game ngay lập tức
  start() {
    if (this.isRunning) return;
    
    console.log('🎮 Starting game (No registration required)');
    console.log('👤 Player:', this.playerName);
    console.log('🎯 Score: 0');
    
    this.isRunning = true;
    this.reset();
    this.gameLoop();
    
    // Tự động spawn enemies sau 1 giây
    setTimeout(() => this.startEnemySpawning(), 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = null;
    }
    console.log('🛑 Game stopped');
  }

  // 🔥 SHOOT FUNCTION (VỚI ON-CHAIN ACTION)
  async shoot() {
    if (!this.isRunning) return;
    
    // Tạo bullet
    this.bullets.push({
      x: this.player.x + this.player.width / 2 - 4,
      y: this.player.y - 20,
      width: 8,
      height: 20,
      speed: 15
    });
    
    this.shots++;
    console.log('🔫 Shoot! Total shots:', this.shots);
    
    // 🔥 GỬI ON-CHAIN ACTION (SHOOT)
    if (this.sessionState && this.testMode) {
      this.sendOnChainAction(1, this.player.x, this.player.y, 'shoot');
    }
  }

  // 🔥 MOVE FUNCTIONS (VỚI ON-CHAIN ACTION KHI DI CHUYỂN)
  moveLeft() {
    this.player.x = Math.max(0, this.player.x - this.player.speed);
    if (this.sessionState && this.testMode) {
      this.sendOnChainAction(3, this.player.x, this.player.y, 'move_left'); // actionType 3 cho move
    }
  }

  moveRight() {
    this.player.x = Math.min(this.canvas.width - this.player.width, this.player.x + this.player.speed);
    if (this.sessionState && this.testMode) {
      this.sendOnChainAction(4, this.player.x, this.player.y, 'move_right'); // actionType 4 cho move
    }
  }

  // ========== PRIVATE GAME LOGIC ==========
  
  private initializeMockPDAs(sessionKey: PublicKey) {
    // Tạo mock PDAs cho test
    const [playerPDA] = getPlayerPDA(sessionKey);
    const [gameStatePDA] = getGameStatePDA();
    
    this.playerPDA = playerPDA;
    this.gameStatePDA = gameStatePDA;
    
    console.log('🎯 Mock PDAs created for gameplay');
  }

  private reset() {
    this.score = 0;
    this.kills = 0;
    this.shots = 0;
    this.bullets = [];
    this.enemies = [];
    this.player.x = this.canvas.width / 2 - 35;
  }

  private startEnemySpawning() {
    if (!this.isRunning) return;
    
    // Spawn enemy mỗi 1-3 giây
    const spawnEnemy = () => {
      if (!this.isRunning) return;
      
      this.enemies.push({
        x: Math.random() * (this.canvas.width - 50),
        y: -50,
        width: 50,
        height: 50,
        speed: 1 + Math.random() * 2
      });
      
      console.log('👾 Enemy spawned. Total:', this.enemies.length);
      
      // Lên lịch spawn tiếp
      setTimeout(spawnEnemy, 1000 + Math.random() * 2000);
    };
    
    spawnEnemy();
  }

  private gameLoop() {
    if (!this.isRunning) return;
    
    // Update game state
    this.update();
    
    // Render
    this.render();
    
    // Process on-chain action queue
    this.processActionQueue();
    
    // Continue loop
    this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
  }

  private update() {
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
          
          console.log('💥 Enemy killed! Score:', this.score, 'Kills:', this.kills);
          
          // 🔥 GỬI ON-CHAIN ACTION (KILL)
          if (this.sessionState && this.testMode) {
            this.sendOnChainAction(2, this.player.x, this.player.y, 'kill');
          }
          
          return false;
        }
      }
      
      return bullet.y > -bullet.height;
    });
    
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
    
    // Handle continuous key presses
    if (this.keysPressed['ArrowLeft']) this.moveLeft();
    if (this.keysPressed['ArrowRight']) this.moveRight();
  }

  private checkCollision(rect1: any, rect2: any): boolean {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  private gameOver() {
    this.stop();
    console.log('💀 Game Over!');
    console.log('📊 Final Score:', this.score);
    console.log('🎯 Kills:', this.kills);
    console.log('🔫 Shots:', this.shots);
    
    alert(`Game Over!\n\nScore: ${this.score}\nKills: ${this.kills}\nShots: ${this.shots}`);
    
    // 🔥 GỬI ON-CHAIN ACTION (GAME OVER)
    if (this.sessionState && this.testMode) {
      this.sendOnChainAction(5, this.player.x, this.player.y, 'game_over');
    }
  }

  // 🔥 ON-CHAIN ACTION HANDLING
  private async sendOnChainAction(actionType: number, x: number, y: number, actionName: string) {
    if (!this.sessionState || !this.playerPDA || !this.gameStatePDA) {
      console.log('⚠️ Cannot send on-chain action: Missing session or PDAs');
      return;
    }
    
    // Thêm vào queue để xử lý không đồng bộ
    this.actionQueue.push({ action: actionName, x, y });
    
    // Nếu đang xử lý action khác, đợi
    if (this.isProcessingAction) return;
    
    this.processActionQueue();
  }

  private async processActionQueue() {
    if (this.isProcessingAction || this.actionQueue.length === 0) return;
    
    this.isProcessingAction = true;
    
    while (this.actionQueue.length > 0) {
      const { action, x, y } = this.actionQueue.shift()!;
      
      try {
        console.log(`📤 Sending on-chain ${action} action...`);
        
        // Tạo instruction
        const instruction = createGameActionIx(
          this.playerPDA!,
          this.gameStatePDA!,
          this.sessionState!.sessionPublicKey,
          this.getActionType(action), // Map action name to type
          Math.floor(x),
          Math.floor(y)
        );
        
        // Gửi transaction
        const result = await this.sessionState!.sendTransaction(
          [instruction],
          { skipPreflight: true }
        );
        
        const signature = typeof result === 'string' ? result : 
                         result?.signature || 'unknown';
        
        console.log(`✅ ${action} sent to chain:`, signature.slice(0, 16) + '...');
        
        // Delay nhỏ giữa các action để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error: any) {
        console.error(`❌ Failed to send ${action} action:`, error.message);
        // Không dừng queue vì lỗi
      }
    }
    
    this.isProcessingAction = false;
  }

  private getActionType(actionName: string): number {
    const actionMap: { [key: string]: number } = {
      'shoot': 1,
      'kill': 2,
      'move_left': 3,
      'move_right': 4,
      'game_over': 5
    };
    return actionMap[actionName] || 0;
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
    // Draw player as a triangle (spaceship)
    this.ctx.fillStyle = '#00d4ff';
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x + 35, this.player.y);
    this.ctx.lineTo(this.player.x, this.player.y + 80);
    this.ctx.lineTo(this.player.x + 70, this.player.y + 80);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Draw player name above
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.playerName, this.player.x + 35, this.player.y - 10);
  }

  private drawUI() {
    // Score panel background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 120);
    
    // Score text
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'left';
    
    this.ctx.fillText(`PLAYER: ${this.playerName}`, 20, 30);
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 55);
    this.ctx.fillText(`KILLS: ${this.kills}`, 20, 80);
    this.ctx.fillText(`SHOTS: ${this.shots}`, 20, 105);
    
    // Mode indicator
    this.ctx.fillStyle = this.testMode ? '#ffde59' : '#00ff88';
    this.ctx.fillText(this.testMode ? '🧪 TEST MODE' : '🔗 CHAIN MODE', 20, 125);
    
    // Controls help
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.font = '12px Arial';
    this.ctx.fillText('CONTROLS: ← → to move, SPACE to shoot', 10, this.canvas.height - 10);
  }

  // ========== EVENT HANDLERS ==========
  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!this.isRunning) {
        this.start(); // Bắt đầu game nếu chưa chạy
      } else {
        this.shoot(); // Bắn nếu game đang chạy
      }
    } else {
      this.keysPressed[e.code] = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysPressed[e.code] = false;
  };

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    
    // Thêm touch/mobile controls nếu cần
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touchX = e.touches[0].clientX;
      if (touchX < this.canvas.width / 2) {
        this.moveLeft();
      } else {
        this.moveRight();
      }
    });
  }
  
  // 🔥 UTILITY FUNCTIONS
  enableTestMode(enable: boolean = true) {
    this.testMode = enable;
    console.log(enable ? '🧪 Test Mode ENABLED' : '🔗 Chain Mode ENABLED');
  }
  
  getGameStats() {
    return {
      player: this.playerName,
      score: this.score,
      kills: this.kills,
      shots: this.shots,
      isRunning: this.isRunning,
      testMode: this.testMode
    };
  }
  
  destroy() {
    this.stop();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    console.log('🎮 Game Engine destroyed');
  }
}

export default FurboGameEngine;
