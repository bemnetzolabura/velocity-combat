/**
 * Input controls - PC (WASD + mouse) and mobile (touch joysticks)
 */
const Controls = (() => {
  const keys = {};
  let mouseDown = false;
  let mouseDownTime = 0;
  let mouseX = 0, mouseY = 0;
  let missileHeld = false;
  let isMobile = false;
  let pointerLocked = false;

  // Mobile joystick state
  const joysticks = {
    steer: { x: 0, y: 0, active: false, touchId: -1 },
    throttle: { x: 0, y: 0, active: false, touchId: -1 }
  };

  const callbacks = {};

  function init() {
    isMobile = /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);

    document.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') e.preventDefault();
    });

    document.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
    });

    const canvas = document.getElementById('game-canvas');

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        mouseDown = true;
        mouseDownTime = Date.now();
        missileHeld = false;
      }
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        const held = Date.now() - mouseDownTime;
        mouseDown = false;
        if (held >= 1000) {
          missileHeld = true;
          if (callbacks.onMissileFire) callbacks.onMissileFire();
        }
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (pointerLocked) {
        mouseX += e.movementX;
        mouseY += e.movementY;
      } else {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left - rect.width / 2;
        mouseY = e.clientY - rect.top - rect.height / 2;
      }
    });

    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === canvas;
    });

    canvas.addEventListener('click', () => {
      if (!pointerLocked && !isMobile) {
        canvas.requestPointerLock();
      }
    });

    if (isMobile) {
      initMobileControls();
    }

    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  function initMobileControls() {
    const mobileControls = document.getElementById('mobile-controls');
    mobileControls.classList.remove('hidden');

    const steerArea = document.getElementById('steer-joystick');
    const throttleArea = document.getElementById('throttle-joystick');
    const steerKnob = document.getElementById('joystick-knob');
    const throttleKnob = document.getElementById('throttle-knob');

    function handleJoystick(id, joystick, knob, e) {
      const touch = e.touches ? e.touches[0] : e;
      const rect = joystick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const maxDist = rect.width / 2 - 10;

      let dx = touch.clientX - cx;
      let dy = touch.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }

      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      joystick.x = dx / maxDist;
      joystick.y = dy / maxDist;
    }

    steerArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      joysticks.steer.active = true;
      joysticks.steer.touchId = e.changedTouches[0].identifier;
      handleJoystick('steer', joysticks.steer, steerKnob, e);
    });

    steerArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handleJoystick('steer', joysticks.steer, steerKnob, e);
    });

    steerArea.addEventListener('touchend', (e) => {
      e.preventDefault();
      joysticks.steer.active = false;
      joysticks.steer.x = 0;
      joysticks.steer.y = 0;
      steerKnob.style.transform = 'translate(0, 0)';
    });

    throttleArea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      joysticks.throttle.active = true;
      joysticks.throttle.touchId = e.changedTouches[0].identifier;
      handleJoystick('throttle', joysticks.throttle, throttleKnob, e);
    });

    throttleArea.addEventListener('touchmove', (e) => {
      e.preventDefault();
      handleJoystick('throttle', joysticks.throttle, throttleKnob, e);
    });

    throttleArea.addEventListener('touchend', (e) => {
      e.preventDefault();
      joysticks.throttle.active = false;
      joysticks.throttle.x = 0;
      joysticks.throttle.y = 0;
      throttleKnob.style.transform = 'translate(0, 0)';
    });

    document.getElementById('mobile-shoot').addEventListener('touchstart', (e) => {
      e.preventDefault();
      mouseDown = true;
      mouseDownTime = Date.now();
    });
    document.getElementById('mobile-shoot').addEventListener('touchend', (e) => {
      e.preventDefault();
      const held = Date.now() - mouseDownTime;
      mouseDown = false;
      if (held >= 1000) {
        missileHeld = true;
        if (callbacks.onMissileFire) callbacks.onMissileFire();
      }
    });

    document.getElementById('mobile-nitro').addEventListener('touchstart', (e) => {
      e.preventDefault();
      keys[' '] = true;
    });
    document.getElementById('mobile-nitro').addEventListener('touchend', (e) => {
      e.preventDefault();
      keys[' '] = false;
    });

    document.getElementById('mobile-missile').addEventListener('touchstart', (e) => {
      e.preventDefault();
      missileHeld = true;
      if (callbacks.onMissileFire) callbacks.onMissileFire();
    });
  }

  function getInput() {
    let throttle = 0;
    let brake = 0;
    let steer = 0;

    if (isMobile) {
      steer = joysticks.steer.x;
      throttle = Math.max(0, -joysticks.throttle.y);
      brake = Math.max(0, joysticks.throttle.y);
    }

    if (keys['w'] || keys['arrowup']) throttle = 1;
    if (keys['s'] || keys['arrowdown']) brake = 1;
    if (keys['a'] || keys['arrowleft']) steer = -1;
    if (keys['d'] || keys['arrowright']) steer = 1;

    const shooting = mouseDown;
    const nitro = keys[' '] || false;
    const missile = missileHeld;

    if (missileHeld) missileHeld = false;

    // Calculate aim direction from mouse
    const aimX = mouseX;
    const aimZ = -mouseY;
    const aimLen = Math.sqrt(aimX * aimX + aimZ * aimZ);
    const aimDirection = aimLen > 0.01
      ? { x: aimX / aimLen, z: aimZ / aimLen }
      : { x: 0, z: 1 };

    return { throttle, brake, steer, shooting, nitro, missile, aimDirection };
  }

  function reset() {
    mouseDown = false;
    missileHeld = false;
    Object.keys(keys).forEach(k => keys[k] = false);
  }

  function on(event, cb) { callbacks[event] = cb; }

  return { init, getInput, reset, on, isMobile: () => isMobile };
})();
