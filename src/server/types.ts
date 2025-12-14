export interface Player {
  id: string;
  paddleY: number;
  score: number;
  ready: boolean;
}

export interface Ball {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
}

export interface GameState {
  player1: Player;
  player2: Player;
  ball: Ball;
  gameStarted: boolean;
}

export interface PlayerData {
  game: import('./game').Game;
  isPlayer1: boolean;
}

export interface GameRoom {
  code: string;
  players: Map<any, PlayerData>;
  gameState: GameState;
  lastUpdate: number;
}

export enum MessageType {
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

export interface Message {
  type: MessageType;
  data?: any;
}
