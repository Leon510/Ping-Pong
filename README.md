# Ping-Pong

A simple online multiplayer Pong game with friend codes. Built with TypeScript, WebSockets, and HTML Canvas.

## Features

- 🎮 Classic Pong gameplay (2 paddles, 1 ball, score tracking)
- 🌐 Online multiplayer via WebSockets
- 🔑 Friend code system for easy matchmaking
- ⚡ Server-authoritative game logic
- 🎨 Retro black/white minimalist design
- 🎯 Smooth 60 FPS gameplay

## Tech Stack

- **Server**: Node.js, TypeScript, WebSockets (ws library)
- **Client**: TypeScript, HTML Canvas, WebSockets
- **Architecture**: Server-authoritative, clients send only inputs

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Start

Run the server:
```bash
npm start
```

The server will start on `http://localhost:3000`

For development (build + start):
```bash
npm run dev
```

## How to Play

1. **Create a room**: Click "CREATE ROOM" to start a new game
2. **Share the code**: The 6-character code will be displayed
3. **Friend joins**: Your friend enters the code and clicks "JOIN ROOM"
4. **Game starts**: The game begins automatically when both players are connected
5. **Controls**: 
   - W = Move paddle up
   - S = Move paddle down

## Gameplay

- Classic Pong mechanics with two paddles and a ball
- First player is on the left, second player is on the right
- Ball bounces off paddles and walls
- Score a point when the ball goes past the opponent's paddle
- Game continues until players disconnect

---

Made with ❤️ using TypeScript