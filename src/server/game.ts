import { GameState, Ball, Player } from './types';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const PADDLE_SPEED = 12; // Erhöht für flüssigere Bewegung
const INITIAL_BALL_SPEED = 3.5;
const BALL_SPEED_INCREASE = 0.08; // Sehr sanfte, kontinuierliche Beschleunigung
const MAX_BALL_SPEED = 10; // Reduziert für kontrolliertere, flüssigere Beschleunigung

export class Game {
  private gameState: GameState;
  private player1Input: { up: boolean; down: boolean } = { up: false, down: false };
  private player2Input: { up: boolean; down: boolean } = { up: false, down: false };
  private player1Velocity: number = 0;
  private player2Velocity: number = 0;
  private readonly PADDLE_ACCELERATION = 1.2;
  private readonly PADDLE_FRICTION = 0.85;
  private readonly MAX_PADDLE_VELOCITY = 15;
  // Ball-Physik Eigenschaften für ultra-flüssige Bewegung
  private ballSpeedMultiplier: number = 1;
  private ballAcceleration: number = 0;
  private lastPaddleHit: number = 0;

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
    
    if (isPlayer1) {
      this.player1Input = input;
    } else {
      this.player2Input = input;
    }
  }

  public update(): void {
    if (!this.gameState.gameStarted) return;

    // Sanfte Paddle-Bewegung mit Beschleunigung
    this.updatePaddleMovement();
    this.updateBallPhysics();
    this.checkCollisions();
    this.checkScore();
  }

  private updatePaddleMovement(): void {
    // Player 1 Paddle mit sanfter Beschleunigung
    if (this.player1Input.up) {
      this.player1Velocity = Math.max(-this.MAX_PADDLE_VELOCITY, 
        this.player1Velocity - this.PADDLE_ACCELERATION);
    } else if (this.player1Input.down) {
      this.player1Velocity = Math.min(this.MAX_PADDLE_VELOCITY, 
        this.player1Velocity + this.PADDLE_ACCELERATION);
    } else {
      this.player1Velocity *= this.PADDLE_FRICTION; // Reibung für sanftes Stoppen
    }

    // Player 2 Paddle mit sanfter Beschleunigung
    if (this.player2Input.up) {
      this.player2Velocity = Math.max(-this.MAX_PADDLE_VELOCITY, 
        this.player2Velocity - this.PADDLE_ACCELERATION);
    } else if (this.player2Input.down) {
      this.player2Velocity = Math.min(this.MAX_PADDLE_VELOCITY, 
        this.player2Velocity + this.PADDLE_ACCELERATION);
    } else {
      this.player2Velocity *= this.PADDLE_FRICTION; // Reibung für sanftes Stoppen
    }

    // Anwenden der Geschwindigkeiten mit Grenzprüfung
    this.gameState.player1.paddleY = Math.max(0, 
      Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, 
        this.gameState.player1.paddleY + this.player1Velocity));
    
    this.gameState.player2.paddleY = Math.max(0, 
      Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, 
        this.gameState.player2.paddleY + this.player2Velocity));
  }

  private updateBallPhysics(): void {
    const ball = this.gameState.ball;
    
    // Kontinuierliche, sanfte Ball-Beschleunigung über Zeit
    if (this.ballAcceleration > 0) {
      this.ballAcceleration *= 0.998; // Sanftes Abklingen der Beschleunigung
      const currentSpeed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
      if (currentSpeed < MAX_BALL_SPEED) {
        const accelFactor = 1 + (this.ballAcceleration * 0.001);
        ball.velocityX *= accelFactor;
        ball.velocityY *= accelFactor;
      }
    }
    
    // Ultra-präzise Ball-Bewegung mit Sub-Pixel-Genauigkeit
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // Sanfte, realistische Wand-Kollisionen mit Energie-Erhaltung
    if (ball.y <= 0) {
      ball.y = 0;
      ball.velocityY = Math.abs(ball.velocityY) * 0.98; // Minimaler Energieverlust
    }
    if (ball.y >= CANVAS_HEIGHT - BALL_SIZE) {
      ball.y = CANVAS_HEIGHT - BALL_SIZE;
      ball.velocityY = -Math.abs(ball.velocityY) * 0.98; // Minimaler Energieverlust
    }
  }

  private checkCollisions(): void {
    const ball = this.gameState.ball;

    // Paddle collision - Player 1 (left) mit verbesserter Physik
    if (
      ball.x <= PADDLE_WIDTH &&
      ball.y + BALL_SIZE >= this.gameState.player1.paddleY &&
      ball.y <= this.gameState.player1.paddleY + PADDLE_HEIGHT
    ) {
      ball.x = PADDLE_WIDTH; // Verhindere Ball-Durchdringung
      
      const hitPos = ((ball.y + BALL_SIZE/2) - (this.gameState.player1.paddleY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
      const bounceAngle = hitPos * Math.PI / 4; // Realistischerer Winkel (0-45 Grad)
      
      const speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
      ball.velocityX = Math.abs(speed * Math.cos(bounceAngle));
      ball.velocityY = speed * Math.sin(bounceAngle);
      
      // Paddle-Velocity hinzufügen für realistischere Physik
      ball.velocityY += this.player1Velocity * 0.1;
      
      // Sanfte, kontinuierliche Ball-Beschleunigung
      this.increaseBallSpeed();
      this.lastPaddleHit = Date.now();
    }

    // Paddle collision - Player 2 (right) mit verbesserter Physik
    if (
      ball.x >= CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE &&
      ball.y + BALL_SIZE >= this.gameState.player2.paddleY &&
      ball.y <= this.gameState.player2.paddleY + PADDLE_HEIGHT
    ) {
      ball.x = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE; // Verhindere Ball-Durchdringung
      
      const hitPos = ((ball.y + BALL_SIZE/2) - (this.gameState.player2.paddleY + PADDLE_HEIGHT/2)) / (PADDLE_HEIGHT/2);
      const bounceAngle = hitPos * Math.PI / 4; // Realistischerer Winkel (0-45 Grad)
      
      const speed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
      ball.velocityX = -Math.abs(speed * Math.cos(bounceAngle));
      ball.velocityY = speed * Math.sin(bounceAngle);
      
      // Paddle-Velocity hinzufügen für realistischere Physik
      ball.velocityY += this.player2Velocity * 0.1;
      
      // Sanfte, kontinuierliche Ball-Beschleunigung
      this.increaseBallSpeed();
      this.lastPaddleHit = Date.now();
    }
  }

  private checkScore(): void {
    const ball = this.gameState.ball;

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

  private increaseBallSpeed(): void {
    const ball = this.gameState.ball;
    const currentSpeed = Math.sqrt(ball.velocityX * ball.velocityX + ball.velocityY * ball.velocityY);
    
    // Ultra-sanfte, kontinuierliche Beschleunigung
    if (currentSpeed < MAX_BALL_SPEED) {
      // Kontinuierliche Beschleunigung basierend auf aktueller Geschwindigkeit
      const accelerationFactor = 1 + BALL_SPEED_INCREASE * (1 - currentSpeed / MAX_BALL_SPEED);
      ball.velocityX *= accelerationFactor;
      ball.velocityY *= accelerationFactor;
      
      // Füge kontinuierliche Beschleunigung hinzu für ultra-flüssigen Übergang
      this.ballAcceleration = Math.min(100, this.ballAcceleration + 10);
    }
    
    // Ball-Geschwindigkeit-Multiplier für sanfte Steigerung
    this.ballSpeedMultiplier = Math.min(1.5, this.ballSpeedMultiplier + 0.02);
  }

  private resetBall(): void {
    // Reset Ball-Physik-Eigenschaften
    this.ballSpeedMultiplier = 1;
    this.ballAcceleration = 0;
    this.lastPaddleHit = 0;
    
    // Sanfte, zufällige Ball-Initialisierung
    const angle = (Math.random() - 0.5) * Math.PI / 3; // -30 bis +30 Grad
    const direction = Math.random() > 0.5 ? 1 : -1;
    
    this.gameState.ball = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      velocityX: direction * INITIAL_BALL_SPEED * Math.cos(angle),
      velocityY: INITIAL_BALL_SPEED * Math.sin(angle)
    };
  }

  public reset(): void {
    this.gameState = this.createInitialState();
  }
}
