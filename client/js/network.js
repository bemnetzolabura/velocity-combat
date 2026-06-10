/**
 * Network layer - Socket.io client
 */
const Network = (() => {
  let socket = null;
  let connected = false;
  let serverUrl = '';

  const callbacks = {};

  function connect(url) {
    serverUrl = url || window.location.origin.replace(':3000', ':3001');
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      serverUrl = 'http://localhost:3001';
    }

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socket.on('connect', () => {
      console.log('Connected to server');
      connected = true;
      if (callbacks.onConnect) callbacks.onConnect();
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      connected = false;
      if (callbacks.onDisconnect) callbacks.onDisconnect();
    });

    socket.on('game_starting', (data) => {
      if (callbacks.onGameStarting) callbacks.onGameStarting(data);
    });

    socket.on('game_start', () => {
      if (callbacks.onGameStart) callbacks.onGameStart();
    });

    socket.on('game_state', (data) => {
      if (callbacks.onGameState) callbacks.onGameState(data);
    });

    socket.on('game_over', (data) => {
      if (callbacks.onGameOver) callbacks.onGameOver(data);
    });

    socket.on('player_left', (data) => {
      if (callbacks.onPlayerLeft) callbacks.onPlayerLeft(data);
    });

    socket.on('player_destroyed', (data) => {
      if (callbacks.onPlayerDestroyed) callbacks.onPlayerDestroyed(data);
    });

    socket.on('player_respawned', (data) => {
      if (callbacks.onPlayerRespawned) callbacks.onPlayerRespawned(data);
    });

    socket.on('player_finished', (data) => {
      if (callbacks.onPlayerFinished) callbacks.onPlayerFinished(data);
    });

    socket.on('explosion', (data) => {
      if (callbacks.onExplosion) callbacks.onExplosion(data);
    });

    socket.on('leaderboard_data', (data) => {
      if (callbacks.onLeaderboard) callbacks.onLeaderboard(data);
    });

    socket.on('error_message', (data) => {
      if (callbacks.onError) callbacks.onError(data);
    });

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
    });
  }

  function joinGame(data) {
    if (!socket) return;
    socket.emit('join_game', data);
  }

  function sendInput(data) {
    if (!socket || !connected) return;
    socket.emit('player_input', data);
  }

  function requestLeaderboard() {
    if (!socket) return;
    socket.emit('request_leaderboard');
  }

  function saveStats(data) {
    if (!socket) return;
    socket.emit('save_stats', data);
  }

  function on(event, cb) { callbacks[event] = cb; }
  function isConnected() { return connected; }
  function getSocketId() { return socket ? socket.id : null; }

  return { connect, joinGame, sendInput, requestLeaderboard, saveStats, on, isConnected, getSocketId };
})();
