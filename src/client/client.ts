enum MessageType {
  CREATE_ROOM = 'CREATE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  ROOM_CREATED = 'ROOM_CREATED',
  ROOM_JOINED = 'ROOM_JOINED',
  GAME_START = 'GAME_START',
  GAME_STATE = 'GAME_STATE',
  PLAYER_INPUT = 'PLAYER_INPUT',
  ERROR = 'ERROR',
  PLAYER_LEFT = 'PLAYER_LEFT'
}

interface GameState {
  player1: {
    paddleY: number;
    score: number;
  };
  player2: {
    paddleY: number;
    score: number;
  };
  ball: {
    x: number;
    y: number;
  };
  gameStarted: boolean;
}

class PongClient {
  private ws: WebSocket | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState | null = null;
  private isPlayer1: boolean = false;
  private keys: { [key: string]: boolean } = {};
  private roomCode: string = '';

  // Canvas dimensions
  private readonly CANVAS_WIDTH = 800;
  private readonly CANVAS_HEIGHT = 600;
  private readonly PADDLE_HEIGHT = 100;
  private readonly PADDLE_WIDTH = 10;
  private readonly BALL_SIZE = 10;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.canvas.width = this.CANVAS_WIDTH;
    this.canvas.height = this.CANVAS_HEIGHT;

    this.setupEventListeners();
    this.render();
  }

  private setupEventListeners(): void {
    // Keyboard input
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.sendInput();
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.sendInput();
    });

    // UI buttons
    document.getElementById('createRoomBtn')?.addEventListener('click', () => {
      this.createRoom();
    });

    document.getElementById('joinRoomBtn')?.addEventListener('click', () => {
      const input = document.getElementById('roomCodeInput') as HTMLInputElement;
      const code = input.value.trim().toUpperCase();
      if (code) {
        this.joinRoom(code);
      }
    });
  }

  private connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to server');
      this.updateStatus('Connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.updateStatus('Disconnected');
      this.showMenu();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateStatus('Connection error');
    };
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case MessageType.ROOM_CREATED:
        this.roomCode = message.data.code;
        this.isPlayer1 = true;
        this.showWaitingScreen(message.data.code);
        break;

      case MessageType.ROOM_JOINED:
        this.roomCode = message.data.code;
        this.isPlayer1 = message.data.isPlayer1;
        if (this.isPlayer1) {
          this.updateStatus('Player 2 joined! Starting game...');
        }
        break;

      case MessageType.GAME_START:
        this.startGame();
        break;

      case MessageType.GAME_STATE:
        this.gameState = message.data;
        break;

      case MessageType.ERROR:
        alert(message.data.message);
        this.showMenu();
        break;

      case MessageType.PLAYER_LEFT:
        alert('Other player left the game');
        this.showMenu();
        this.disconnect();
        break;
    }
  }

  private createRoom(): void {
    this.connect();
    setTimeout(() => {
      this.send({
        type: MessageType.CREATE_ROOM
      });
    }, 100);
  }

  private joinRoom(code: string): void {
    this.connect();
    setTimeout(() => {
      this.send({
        type: MessageType.JOIN_ROOM,
        data: { code }
      });
    }, 100);
  }

  private startGame(): void {
    document.getElementById('menu')!.style.display = 'none';
    document.getElementById('game')!.style.display = 'block';
    this.updateStatus('Game started! W=Up, S=Down');
  }

  private showWaitingScreen(code: string): void {
    this.updateStatus(`Waiting for player 2... Share code: ${code}`);
  }

  private showMenu(): void {
    document.getElementById('menu')!.style.display = 'flex';
    document.getElementById('game')!.style.display = 'none';
    this.gameState = null;
  }

  private sendInput(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const input = {
      up: this.keys['w'] || false,
      down: this.keys['s'] || false
    };

    this.send({
      type: MessageType.PLAYER_INPUT,
      data: input
    });
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private updateStatus(message: string): void {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  private render(): void {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

    if (this.gameState) {
      // Draw center line
      this.ctx.strokeStyle = '#fff';
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.CANVAS_WIDTH / 2, 0);
      this.ctx.lineTo(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Draw paddles
      this.ctx.fillStyle = '#fff';
      // Player 1 (left)
      this.ctx.fillRect(0, this.gameState.player1.paddleY, this.PADDLE_WIDTH, this.PADDLE_HEIGHT);
      // Player 2 (right)
      this.ctx.fillRect(
        this.CANVAS_WIDTH - this.PADDLE_WIDTH,
        this.gameState.player2.paddleY,
        this.PADDLE_WIDTH,
        this.PADDLE_HEIGHT
      );

      // Draw ball
      this.ctx.fillRect(
        this.gameState.ball.x,
        this.gameState.ball.y,
        this.BALL_SIZE,
        this.BALL_SIZE
      );

      // Draw scores
      this.ctx.font = '32px monospace';
      this.ctx.fillText(
        this.gameState.player1.score.toString(),
        this.CANVAS_WIDTH / 4,
        50
      );
      this.ctx.fillText(
        this.gameState.player2.score.toString(),
        (3 * this.CANVAS_WIDTH) / 4,
        50
      );
    } else {
      // Draw title screen
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '48px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PONG', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2);
      this.ctx.font = '24px monospace';
      this.ctx.fillText('Use menu to start', this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT / 2 + 50);
    }

    requestAnimationFrame(() => this.render());
  }
}

// Initialize client when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PongClient();
});
