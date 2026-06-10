/**
 * Menu system - main menu, lobby, game over, leaderboard
 */
const Menu = (() => {
  let selectedCar = 'street';
  let selectedSkin = 0;
  let currentUsername = 'Player';

  function init() {
    document.getElementById('play-btn').addEventListener('click', play);
    document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
    document.getElementById('return-menu-btn').addEventListener('click', returnToMenu);
    document.getElementById('leaderboard-back-btn').addEventListener('click', () => {
      document.getElementById('leaderboard-screen').classList.add('hidden');
      document.getElementById('menu-screen').classList.remove('hidden');
    });

    document.querySelectorAll('.car-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.car-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedCar = opt.dataset.car;
      });
    });

    const savedName = localStorage.getItem('vc_username');
    if (savedName) {
      document.getElementById('username-input').value = savedName;
    }

    UIManager.init();
  }

  function play() {
    currentUsername = document.getElementById('username-input').value.trim() || 'Player';
    localStorage.setItem('vc_username', currentUsername);
    AudioManager.ensureResumed();
    AudioManager.stopMenuMusic();
    AudioManager.init();

    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');

    Network.joinGame({
      username: currentUsername,
      carId: selectedCar,
      skinIndex: selectedSkin
    });
  }

  function returnToMenu() {
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    Game.stop();
    AudioManager.playMenuMusic();
  }

  function showLeaderboard() {
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('leaderboard-screen').classList.remove('hidden');
    document.getElementById('leaderboard-list').innerHTML = '<p style="color:rgba(255,255,255,0.5)">Loading...</p>';
    Network.requestLeaderboard();
  }

  function displayLeaderboard(data) {
    const container = document.getElementById('leaderboard-list');
    if (!data || data.length === 0) {
      container.innerHTML = '<p style="color:rgba(255,255,255,0.5)">No data yet. Play a game!</p>';
      return;
    }
    container.innerHTML = data.map((entry, i) => {
      const rankClass = i === 0 ? 'lb-top1' : i === 1 ? 'lb-top2' : i === 2 ? 'lb-top3' : '';
      return `<div class="lb-entry ${rankClass}">
        <span class="lb-rank">#${i + 1}</span>
        <span class="lb-name">${entry.username}</span>
        <span class="lb-stats">${entry.wins}W ${entry.kills}K ${entry.xp}XP</span>
      </div>`;
    }).join('');
  }

  function getSelectedCar() { return selectedCar; }
  function getUsername() { return currentUsername; }

  return { init, displayLeaderboard, getSelectedCar, getUsername };
})();
