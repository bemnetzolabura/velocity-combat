const { MAX_PLAYERS, GAME_STATES, TRACKS } = require('../shared/constants');
const { CARS, getCarStats } = require('../shared/cars');
const { createAIPlayers } = require('./ai');
const { initPhysicsWorld, createTrackColliders } = require('./physics');

function createMatchmaking(io, gameState) {
  const queue = [];
  let roomCounter = 0;

  function addToQueue(socket, player) {
    queue.push({ socket, player });
    console.log(`${player.username} joined queue (${queue.length}/${MAX_PLAYERS})`);
    tryMatch();
  }

  function removeFromQueue(socketId) {
    const idx = queue.findIndex(q => q.socket.id === socketId);
    if (idx !== -1) queue.splice(idx, 1);
  }

  function tryMatch() {
    if (queue.length > 0) startGame();
  }

  function startGame() {
    roomCounter++;
    const roomId = `game_${roomCounter}_${Date.now()}`;
    const room = {
      id: roomId,
      state: GAME_STATES.LOBBY,
      players: [],
      gamePlayers: new Map(),
      projectiles: [],
      pickups: [],
      physics: null,
      countdown: 5,
      finishedPlayers: [],
      startTime: 0
    };

    const queuedPlayers = queue.splice(0, MAX_PLAYERS);

    queuedPlayers.forEach(({ socket, player }) => {
      socket.join(roomId);
      player.roomId = roomId;
      player.state = 'lobby';
    });

    const aiCount = MAX_PLAYERS - queuedPlayers.length;
    const aiPlayers = createAIPlayers(roomId, aiCount);

    aiPlayers.forEach(ai => {
      ai.roomId = roomId;
      ai.state = 'lobby';
      gameState.players.set(ai.id, ai);
    });

    const allPlayers = [...queuedPlayers.map(q => q.player), ...aiPlayers];

    const spawnPositions = generateSpawnPositions(allPlayers.length);

    allPlayers.forEach((player, index) => {
      const carStats = getCarStats(player.carId);
      const spawn = spawnPositions[index];
      const gp = {
        id: player.id,
        username: player.username,
        carId: player.carId,
        skinIndex: player.skinIndex || 0,
        state: 'alive',
        position: { ...spawn },
        rotation: 0,
        velocity: { x: 0, y: 0, z: 0 },
        health: carStats.health,
        maxHealth: carStats.health,
        nitro: 0,
        maxNitro: 100,
        speed: 0,
        boostActive: false,
        input: { throttle: 0, brake: 0, steer: 0, shooting: false, missile: false, nitro: false, aimDirection: { x: 0, z: 1 } },
        score: 0,
        kills: 0,
        deaths: 0,
        laps: 0,
        lapProgress: 0,
        finished: false,
        finishedAt: 0,
        respawnTimer: 0,
        isAI: player.isAI || false,
        aiState: null,
        lastFireTime: 0,
        lastMissileTime: 0,
        missilesLeft: 5,
        driftAngle: 0,
        invincibleUntil: 0
      };

      room.gamePlayers.set(player.id, gp);
    });

    room.physics = initPhysicsWorld();
    createTrackColliders(room.physics.world, room.physics.bodies);

    gameState.rooms.set(roomId, room);
    console.log(`Game ${roomId} started with ${allPlayers.length} players (${queuedPlayers.length} real, ${aiCount} AI)`);

    io.to(roomId).emit('game_starting', {
      roomId,
      players: allPlayers.map(p => ({
        id: p.id,
        username: p.username,
        carId: p.carId,
        skinIndex: p.skinIndex || 0,
        state: 'alive',
        isAI: p.isAI || false
      })),
      track: TRACKS.DESERT_CANYON,
      countdown: 5
    });

    room.state = GAME_STATES.COUNTDOWN;
    room.startTime = Date.now() + 5000;

    setTimeout(() => {
      room.state = GAME_STATES.RACING;
      io.to(roomId).emit('game_start');
    }, 5000);
  }

  function generateSpawnPositions(count) {
    const positions = [];
    const startX = -80;
    const spacing = 3.5;
    const startZBase = -15;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 4);
      const col = i % 4;
      positions.push({
        x: startX + col * spacing - (spacing * 1.5),
        y: 0.5,
        z: startZBase + row * 4
      });
    }
    return positions;
  }

  function endGame(room) {
    if (!room || room.state === GAME_STATES.FINISHED) return;
    room.state = GAME_STATES.FINISHED;
    const players = Array.from(room.gamePlayers.values());
    const results = players.map(p => ({
      id: p.id,
      username: p.username,
      kills: p.kills,
      deaths: p.deaths,
      laps: p.laps,
      finished: p.finished,
      isAI: p.isAI || false
    })).sort((a, b) => b.laps - a.laps || (b.finished ? 1 : -1));

    const winner = results[0];
    if (winner && !winner.isAI) {
      const player = gameState.players.get(winner.id);
      if (player) player.wins = (player.wins || 0) + 1;
    }

    results.forEach(r => {
      if (!r.isAI) {
        const player = gameState.players.get(r.id);
        if (player) {
          player.xp = (player.xp || 0) + r.kills * 20 + (r.finished ? 50 : 0) + (r === winner ? 100 : 0);
          player.kills = (player.kills || 0) + r.kills;
          player.deaths = (player.deaths || 0) + r.deaths;
        }
      }
    });

    io.to(room.id).emit('game_over', { results, winner: winner ? winner.username : 'Nobody' });
    setTimeout(() => {
      gameState.rooms.delete(room.id);
    }, 10000);
  }

  return { addToQueue, removeFromQueue, startGame, endGame };
}

module.exports = { createMatchmaking };
