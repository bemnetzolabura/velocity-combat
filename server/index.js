const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createGameLoop } = require('./gameLoop');
const { createMatchmaking } = require('./matchmaking');
const { MAX_PLAYERS, SERVER_TICK_RATE, TICK_MS, TRACKS } = require('../shared/constants');
const { CARS } = require('../shared/cars');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, '..', 'client')));

const gameState = {
  players: new Map(),
  rooms: new Map(),
  projectiles: [],
  pickups: [],
  track: TRACKS.DESERT_CANYON
};

const matchmaking = createMatchmaking(io, gameState);
const gameLoop = createGameLoop(io, gameState, matchmaking);

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('join_game', (data) => {
    const { username, carId, skinIndex } = data;
    if (!username || !carId) return;

    const player = {
      id: socket.id,
      username: username.substring(0, 20),
      carId: carId,
      skinIndex: skinIndex || 0,
      state: 'lobby',
      xp: 0,
      wins: 0,
      kills: 0,
      deaths: 0
    };

    gameState.players.set(socket.id, player);
    matchmaking.addToQueue(socket, player);
  });

  socket.on('player_input', (data) => {
    const player = gameState.players.get(socket.id);
    if (!player || !player.roomId) return;
    const room = gameState.rooms.get(player.roomId);
    if (!room) return;

    const gamePlayer = room.gamePlayers.get(socket.id);
    if (!gamePlayer) return;

    gamePlayer.input = {
      throttle: data.throttle || 0,
      brake: data.brake || 0,
      steer: data.steer || 0,
      shooting: data.shooting || false,
      missile: data.missile || false,
      nitro: data.nitro || false,
      aimDirection: data.aimDirection || { x: 0, z: 1 },
      timestamp: Date.now()
    };
  });

  socket.on('request_leaderboard', () => {
    const allPlayers = Array.from(gameState.players.values());
    const sorted = allPlayers
      .filter(p => p.wins > 0 || p.kills > 0)
      .sort((a, b) => b.wins - a.wins || b.kills - a.kills)
      .slice(0, 50)
      .map(p => ({
        username: p.username,
        wins: p.wins,
        kills: p.kills,
        deaths: p.deaths,
        xp: p.xp
      }));
    socket.emit('leaderboard_data', sorted);
  });

  socket.on('save_stats', (data) => {
    const player = gameState.players.get(socket.id);
    if (!player) return;
    if (data.xp) player.xp = data.xp;
    if (data.wins) player.wins = data.wins;
    if (data.kills) player.kills = data.kills;
    if (data.deaths) player.deaths = data.deaths;
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    const player = gameState.players.get(socket.id);
    if (player && player.roomId) {
      const room = gameState.rooms.get(player.roomId);
      if (room) {
        room.gamePlayers.delete(socket.id);
        io.to(player.roomId).emit('player_left', { id: socket.id });
        if (room.gamePlayers.size <= 1 && room.state !== 'lobby') {
          matchmaking.endGame(room);
        }
      }
    }
    gameState.players.delete(socket.id);
    matchmaking.removeFromQueue(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Velocity Combat server running on port ${PORT}`);
  setInterval(() => gameLoop.tick(), TICK_MS);
});
