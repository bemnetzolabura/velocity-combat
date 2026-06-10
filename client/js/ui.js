/**
 * UI management - HUD, scoreboard, minimap, kill feed
 */
const UIManager = (() => {
  let localPlayerId = null;
  let players = [];
  let animFrame = null;

  function init() {
    updateLobby([]);
  }

  function setLocalPlayer(id) { localPlayerId = id; }

  function updateLobby(playerList) {
    const container = document.getElementById('lobby-players');
    container.innerHTML = '';
    playerList.forEach(p => {
      const div = document.createElement('div');
      div.className = 'lobby-player';
      div.innerHTML = `<span class="status-dot"></span>${p.username}${p.isAI ? '<span class="ai-badge">AI</span>' : ''}`;
      container.appendChild(div);
    });
  }

  function showCountdown(num) {
    document.getElementById('countdown-overlay').classList.remove('hidden');
    document.getElementById('countdown-number').textContent = num;
  }

  function hideCountdown() {
    document.getElementById('countdown-overlay').classList.add('hidden');
  }

  function updateHUD(speed, health, maxHealth, nitro, maxNitro, laparams, missilesLeft) {
    document.getElementById('speed-value').textContent = Math.round(speed);

    const healthPct = Math.max(0, (health / maxHealth) * 100);
    document.getElementById('health-fill').style.width = healthPct + '%';
    document.getElementById('health-text').textContent = Math.round(health);

    const nitroPct = (nitro / maxNitro) * 100;
    document.getElementById('nitro-fill').style.width = nitroPct + '%';
    document.getElementById('nitro-text').textContent = Math.round(nitro);

    document.getElementById('lap-current').textContent = laparams || 0;
    document.getElementById('missile-count').textContent = missilesLeft || 0;
  }

  function updateScoreboard(serverPlayers, localId) {
    const list = document.getElementById('scoreboard-list');
    const sorted = [...serverPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
    const top = sorted.slice(0, 8);

    list.innerHTML = top.map(p => {
      const isSelf = p.id === localId;
      return `<div class="scoreboard-item${isSelf ? ' sb-self' : ''}">
        <span class="sb-name">${p.username || 'Unknown'}${p.isAI ? ' [AI]' : ''}</span>
        <span class="sb-kills">${p.kills || 0}K</span>
        <span class="sb-score">${p.score || 0}</span>
      </div>`;
    }).join('');
  }

  function updateMinimap(serverPlayers, localId) {
    const canvas = document.getElementById('minimap-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);

    // Draw track outline
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const trackPoints = [
      [-70,-60],[-50,-68],[-20,-70],[20,-70],[50,-68],[70,-55],
      [75,-30],[75,0],[75,30],[70,55],[50,68],[20,70],
      [-20,70],[-50,68],[-70,55],[-75,30],[-75,0],[-75,-30],[-70,-60]
    ];
    trackPoints.forEach((pt, i) => {
      const x = (pt[0] + 75) / 150 * w;
      const y = (pt[1] + 70) / 140 * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();

    serverPlayers.forEach(p => {
      const x = (p.position.x + 75) / 150 * w;
      const y = (p.position.z + 70) / 140 * h;
      if (x < 0 || x > w || y < 0 || y > h) return;

      const isSelf = p.id === localId;
      ctx.fillStyle = isSelf ? '#f1c40f' : (p.isAI ? '#9b59b6' : '#e74c3c');
      ctx.beginPath();
      ctx.arc(x, y, isSelf ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();

      if (isSelf) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }

  function addKillFeed(killerName, victimName) {
    const feed = document.getElementById('kill-feed');
    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerHTML = `<span style="color:#e74c3c">${killerName}</span> <span style="color:#fff">killed</span> <span style="color:#f1c40f">${victimName}</span>`;
    feed.appendChild(item);
    setTimeout(() => item.remove(), 3000);
    if (feed.children.length > 5) feed.firstChild.remove();
  }

  function showGameOver(results, winner) {
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('gameover-winner').textContent = `${winner} wins!`;

    const container = document.getElementById('gameover-results');
    container.innerHTML = '';
    const sorted = [...results].sort((a, b) => (b.score || 0) - (a.score || 0));
    sorted.forEach((r, i) => {
      const div = document.createElement('div');
      div.className = `go-result${i === 0 ? ' go-winner' : ''}`;
      div.innerHTML = `<span class="go-pos">#${i + 1}</span><span>${r.username}${r.isAI ? ' [AI]' : ''}</span><span>${r.kills}K / ${r.deaths}D</span>`;
      container.appendChild(div);
    });
  }

  function hideGameOver() {
    document.getElementById('gameover-screen').classList.add('hidden');
  }

  function showMissileLock(show) {
    document.getElementById('missile-lock-indicator').classList.toggle('hidden', !show);
  }

  return {
    init, setLocalPlayer, updateLobby, showCountdown, hideCountdown,
    updateHUD, updateScoreboard, updateMinimap, addKillFeed,
    showGameOver, hideGameOver, showMissileLock
  };
})();
