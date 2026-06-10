/**
 * Procedural audio using Web Audio API - no external files
 */
const AudioManager = (() => {
  let ctx = null;
  let masterGain = null;
  let engineOsc = null;
  let engineGain = null;
  let musicOsc = null;
  let musicGain = null;
  let initialized = false;
  let muted = false;

  function init() {
    if (initialized) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(ctx.destination);
      initialized = true;
    } catch (e) {
      console.warn('Audio not available');
    }
  }

  function ensureResumed() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function startEngine() {
    if (!ctx) return;
    ensureResumed();
    if (engineOsc) return;

    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 80;
    engineGain.gain.value = 0.08;
    engineOsc.connect(engineGain);
    engineGain.connect(masterGain);
    engineOsc.start();
  }

  function updateEngine(speed) {
    if (!engineOsc || !engineGain) return;
    const freq = 60 + (speed / 100) * 120;
    engineOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
    const vol = 0.03 + (speed / 100) * 0.08;
    engineGain.gain.setTargetAtTime(vol, ctx.currentTime, 0.05);
  }

  function stopEngine() {
    if (engineOsc) {
      try { engineOsc.stop(); } catch(e) {}
      engineOsc = null;
      engineGain = null;
    }
  }

  function playShoot() {
    if (!ctx) return;
    ensureResumed();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  function playMissile() {
    if (!ctx) return;
    ensureResumed();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

  function playExplosion() {
    if (!ctx) return;
    ensureResumed();
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    source.start();
  }

  function playNitro() {
    if (!ctx) return;
    ensureResumed();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  function playMenuMusic() {
    if (!ctx || musicOsc) return;
    ensureResumed();
    musicOsc = ctx.createOscillator();
    musicGain = ctx.createGain();
    musicOsc.type = 'triangle';
    musicOsc.frequency.value = 110;
    musicGain.gain.value = 0.05;
    musicOsc.connect(musicGain);
    musicGain.connect(masterGain);
    musicOsc.start();

    const notes = [110, 130.81, 146.83, 164.81, 174.61, 196, 220];
    let noteIdx = 0;
    const interval = setInterval(() => {
      if (!musicOsc) { clearInterval(interval); return; }
      musicOsc.frequency.setTargetAtTime(notes[noteIdx % notes.length], ctx.currentTime, 0.1);
      noteIdx++;
    }, 400);
    musicOsc.userData = { interval };
  }

  function stopMenuMusic() {
    if (musicOsc) {
      if (musicOsc.userData && musicOsc.userData.interval) {
        clearInterval(musicOsc.userData.interval);
      }
      try { musicOsc.stop(); } catch(e) {}
      musicOsc = null;
      musicGain = null;
    }
  }

  function setMasterVolume(v) { if (masterGain) masterGain.gain.value = v; }
  function toggleMute() { muted = !muted; setMasterVolume(muted ? 0 : 0.3); return muted; }

  return {
    init, startEngine, updateEngine, stopEngine,
    playShoot, playMissile, playExplosion, playNitro,
    playMenuMusic, stopMenuMusic, toggleMute, ensureResumed
  };
})();
