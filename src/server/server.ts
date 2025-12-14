import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { Game } from './game';
import { MessageType, Message, GameRoom } from './types';

const PORT = process.env.PORT || 3000;
const GAME_TICK_RATE = 1000 / 120; // 60 FPS

class PongServer {
  private wss: WebSocketServer;
  private server: http.Server;
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<WebSocket, string> = new Map();
  private playerIds: WeakMap<WebSocket, string> = new WeakMap();
  private nextPlayerId: number = 0;

  constructor() {
    this.server = http.createServer(this.handleHttpRequest.bind(this));
    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on('connection', this.handleConnection.bind(this));
    this.startGameLoop();
  }

  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const filePath = req.url === '/' ? '/index.html' : req.url;
    const publicPath = path.join(__dirname, '../../public', filePath || '');
    const extname = path.extname(publicPath);
    
    const contentTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json'
    };

    const contentType = contentTypes[extname] || 'text/plain';

    fs.readFile(publicPath, (err, content) => {
      if (err) {
        if (err.code === 'ENOENT') {
          res.writeHead(404);
          res.end('File not found');
        } else {
          res.writeHead(500);
          res.end('Server error');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }

  private handleConnection(ws: WebSocket): void {
    console.log('New client connected');

    ws.on('message', (data: Buffer) => {
      try {
        const message: Message = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      this.handleDisconnect(ws);
    });
  }

  private handleMessage(ws: WebSocket, message: Message): void {
    switch (message.type) {
      case MessageType.CREATE_ROOM:
        this.createRoom(ws);
        break;
      case MessageType.JOIN_ROOM:
        this.joinRoom(ws, message.data.code);
        break;
      case MessageType.PLAYER_INPUT:
        this.handlePlayerInput(ws, message.data);
        break;
    }
  }

  private createRoom(ws: WebSocket): void {
    const code = this.generateRoomCode();
    const game = new Game();
    
    const room: GameRoom = {
      code,
      players: new Map(),
      gameState: game.getState(),
      lastUpdate: Date.now()
    };

    room.players.set(ws as any, { game, isPlayer1: true });
    this.rooms.set(code, room);
    this.playerRooms.set(ws, code);

    game.setPlayerReady(this.getPlayerId(ws), true);

    this.send(ws, {
      type: MessageType.ROOM_CREATED,
      data: { code }
    });

    console.log(`Room created: ${code}`);
  }

  private joinRoom(ws: WebSocket, code: string): void {
    const room = this.rooms.get(code);

    if (!room) {
      this.send(ws, {
        type: MessageType.ERROR,
        data: { message: 'Room not found' }
      });
      return;
    }

    if (room.players.size >= 2) {
      this.send(ws, {
        type: MessageType.ERROR,
        data: { message: 'Room is full' }
      });
      return;
    }

    const game = Array.from(room.players.values())[0].game;
    room.players.set(ws as any, { game, isPlayer1: false });
    this.playerRooms.set(ws, code);

    game.setPlayerReady(this.getPlayerId(ws), false);

    this.send(ws, {
      type: MessageType.ROOM_JOINED,
      data: { code, isPlayer1: false }
    });

    // Notify first player
    const firstPlayer = Array.from(room.players.keys())[0];
    this.send(firstPlayer, {
      type: MessageType.ROOM_JOINED,
      data: { code, isPlayer1: true }
    });

    // Start game
    game.startGame();
    this.broadcast(room, {
      type: MessageType.GAME_START,
      data: {}
    });

    console.log(`Player joined room: ${code}`);
  }

  private handlePlayerInput(ws: WebSocket, input: { up: boolean; down: boolean }): void {
    const roomCode = this.playerRooms.get(ws);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    const playerData = room.players.get(ws as any);
    if (!playerData) return;

    playerData.game.handlePlayerInput(this.getPlayerId(ws), input);
  }

  private handleDisconnect(ws: WebSocket): void {
    const roomCode = this.playerRooms.get(ws);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (!room) return;

    room.players.delete(ws as any);
    this.playerRooms.delete(ws);

    // Notify remaining players
    this.broadcast(room, {
      type: MessageType.PLAYER_LEFT,
      data: {}
    });

    // Delete room if empty
    if (room.players.size === 0) {
      this.rooms.delete(roomCode);
      console.log(`Room deleted: ${roomCode}`);
    }
  }

  private startGameLoop(): void {
    setInterval(() => {
      this.rooms.forEach((room, code) => {
        if (room.players.size === 2) {
          const game = Array.from(room.players.values())[0].game;
          game.update();

          this.broadcast(room, {
            type: MessageType.GAME_STATE,
            data: game.getState()
          });
        }
      });
    }, GAME_TICK_RATE);
  }

  private broadcast(room: GameRoom, message: Message): void {
    const data = JSON.stringify(message);
    room.players.forEach((_, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  private send(ws: WebSocket, message: Message): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.rooms.has(code) ? this.generateRoomCode() : code;
  }

  private getPlayerId(ws: WebSocket): string {
    let id = this.playerIds.get(ws);
    if (!id) {
      id = `player_${this.nextPlayerId++}`;
      this.playerIds.set(ws, id);
    }
    return id;
  }

  public listen(): void {
    this.server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

const server = new PongServer();
server.listen();
