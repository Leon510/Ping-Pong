import { GameState, Ball, Player } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const PADDLE_SPEED = 5;
const INITIAL_BALL_SPEED = 5;

export class Game {
  private gameState: GameState;

  constructor() {
    this.gameState = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      player1: {
        id: '',
        paddleY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        score: 0,
        ready: false
      },
      player2: {
        id: '',
        paddleY: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        score: 0,
        ready: false
      },
      ball: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        velocityX: INITIAL_BALL_SPEED,
        velocityY: INITIAL_BALL_SPEED
      },
      gameStarted: false
    };
  }

  public getState(): GameState {
    return this.gameState;
  }

  public setPlayerReady(playerId: string, isPlayer1: boolean): void {
    if (isPlayer1) {
      this.gameState.player1.id = playerId;
      this.gameState.player1.ready = true;
    } else {
      this.gameState.player2.id = playerId;
      this.gameState.player2.ready = true;
    }
  }

  public startGame(): void {
    this.gameState.gameStarted = true;
  }

  public handlePlayerInput(playerId: string, input: { up: boolean; down: boolean }): void {
    const isPlayer1 = this.gameState.player1.id === playerId;
    const player = isPlayer1 ? this.gameState.player1 : this.gameState.player2;

    if (input.up && player.paddleY > 0) {
      player.paddleY -= PADDLE_SPEED;
    }
    if (input.down && player.paddleY < CANVAS_HEIGHT - PADDLE_HEIGHT) {
      player.paddleY += PADDLE_SPEED;
    }
  }

  public update(): void {
    if (!this.gameState.gameStarted) return;

    const ball = this.gameState.ball;

    // Move ball
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // Top and bottom wall collision
    if (ball.y <= 0 || ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      ball.velocityY = -ball.velocityY;
    }

    // Paddle collision - Player 1 (left)
    if (
      ball.x <= PADDLE_WIDTH &&
      ball.y >= this.gameState.player1.paddleY &&
      ball.y <= this.gameState.player1.paddleY + PADDLE_HEIGHT
    ) {
      ball.velocityX = Math.abs(ball.velocityX);
      const hitPos = (ball.y - this.gameState.player1.paddleY) / PADDLE_HEIGHT;
      ball.velocityY = (hitPos - 0.5) * 10;
    }

    // Paddle collision - Player 2 (right)
    if (
      ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
      ball.y >= this.gameState.player2.paddleY &&
      ball.y <= this.gameState.player2.paddleY + PADDLE_HEIGHT
    ) {
      ball.velocityX = -Math.abs(ball.velocityX);
      const hitPos = (ball.y - this.gameState.player2.paddleY) / PADDLE_HEIGHT;
      ball.velocityY = (hitPos - 0.5) * 10;
    }

    // Score points
    if (ball.x < 0) {
      this.gameState.player2.score++;
      this.resetBall();
    }
    if (ball.x > CANVAS_WIDTH) {
      this.gameState.player1.score++;
      this.resetBall();
    }
  }

  private resetBall(): void {
    this.gameState.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      velocityX: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      velocityY: INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1)
    };
  }

  public reset(): void {
    this.gameState = this.createInitialState();
  }
}
