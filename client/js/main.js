/**
 * Main entry point - wires all systems together
 */
(function() {
  let gameState = {
    phase: 'loading',
    players: [],
    localPlayerId: null,
    connected: false
  };

  function init() {
    AudioManager.init();
    Menu.init();
    Controls.init();
    Game.init();

    setupNetworkCallbacks();

    showLoading(0);
    setTimeout(() => showLoading(30), 200);
    setTimeout(() => showLoading(60), 400);
    setTimeout(() => showLoading(90), 600);

    Network.connect();

    setTimeout(() => {
      showLoading(100);
      setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('menu-screen').classList.remove('hidden');
        AudioManager.playMenuMusic();
      }, 500);
    }, 1000);

    window.addEventListener('beforeunload', () => {
      AudioManager.stopMenuMusic();
      AudioManager.stopEngine();
    });
  }

  function showLoading(pct) {
    document.getElementById('loading-bar').style.width = pct + '%';
    if (pct < 30) document.getElementById('loading-text').textContent = 'Initializing engine...';
    else if (pct < 60) document.getElementById('loading-text').textContent = 'Building arena...';
    else if (pct < 90) document.getElementById('loading-text').textContent = 'Preparing vehicles...';
    else document.getElementById('loading-text').textContent = 'Ready!';
  }

  function setupNetworkCallbacks() {
    Network.on('onConnect', () => {
      gameState.connected = true;
      console.log('Connected to game server');
    });

    Network.on('onDisconnect', () => {
      gameState.connected = false;
      console.log('Disconnected from game server');
    });

    Network.on('onGameStarting', (data) => {
      console.log('Game starting:', data);
      gameState.players = data.players || [];
      gameState.localPlayerId = null;

      UIManager.updateLobby(data.players);

      let count = data.countdown || 5;
      UIManager.showCountdown(count);
      AudioManager.playMenuMusic();

      const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
          UIManager.showCountdown(count);
        } else {
          clearInterval(countInterval);
          UIManager.hideCountdown();
        }
      }, 1000);
    });

    Network.on('onGameStart', () => {
      console.log('Game started!');
      document.getElementById('lobby-screen').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');

      const mySocketId = Network.getSocketId();
      const me = gameState.players.find(p => p.id === mySocketId);
      gameState.localPlayerId = me ? me.id : mySocketId;

      Game.start(gameState.localPlayerId);

      gameState.players.forEach(p => {
        if (p.id !== gameState.localPlayerId) {
          Game.addPlayer(p);
        }
      });
    });

    Network.on('onGameState', (data) => {
      Game.updateGameState(data);

      if (data.explosions) {
        data.explosions.forEach(exp => WeaponRenderer.showExplosion(exp));
      }
    });

    Network.on('onGameOver', (data) => {
      console.log('Game over:', data);
      Game.stop();
      AudioManager.stopEngine();
      UIManager.showGameOver(data.results, data.winner);

      Network.saveStats({ xp: 0, wins: 0, kills: 0, deaths: 0 });
    });

    Network.on('onPlayerLeft', (data) => {
      Game.removePlayer(data.id);
    });

    Network.on('onPlayerDestroyed', (data) => {
      const victim = gameState.players.find(p => p.id === data.playerId);
      const killer = gameState.players.find(p => p.id === data.killerId);
      if (victim && killer) {
        UIManager.addKillFeed(killer.username, victim.username);
      } else if (victim) {
        UIManager.addKillFeed('???', victim.username);
      }
      if (data.playerId === gameState.localPlayerId) {
        AudioManager.playExplosion();
      }
    });

    Network.on('onPlayerRespawned', (data) => {
      console.log('Player respawned:', data.playerId);
    });

    Network.on('onPlayerFinished', (data) => {
      const player = gameState.players.find(p => p.id === data.playerId);
      if (player) {
        UIManager.addKillFeed('🏁', player.username + ' finished!');
      }
    });

    Network.on('onExplosion', (data) => {
      WeaponRenderer.showExplosion(data);
    });

    Network.on('onLeaderboard', (data) => {
      Menu.displayLeaderboard(data);
    });

    Network.on('onError', (data) => {
      console.error('Server error:', data);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
