/**
 * Core Three.js game engine - arena rendering, camera, game loop
 */
const Game = (() => {
  let renderer, scene, camera;
  let localPlayerId = null;
  let gameRunning = false;
  let animFrameId = null;

  const BOOST_PAD_POSITIONS = [
    { x: -50, z: -50 }, { x: 0, z: -70 }, { x: 50, z: -50 },
    { x: 70, z: 0 }, { x: 50, z: 50 }, { x: 0, z: 70 },
    { x: -50, z: 50 }, { x: -70, z: 0 }
  ];

  const BARREL_POSITIONS = [
    { x: -40, z: -20 }, { x: 20, z: -40 }, { x: 0, z: 0 },
    { x: 40, z: 20 }, { x: -20, z: 40 }, { x: 30, z: -30 },
    { x: -30, z: 30 }, { x: 10, z: -10 }, { x: -10, z: 10 }
  ];

  let arenaGroup = null;
  let boostPads = [];
  let barrels = [];
  let pickupMeshes = new Map();

  // Input send throttling
  let lastInputSend = 0;
  const INPUT_SEND_INTERVAL = 50;

  function init() {
    const canvas = document.getElementById('game-canvas');

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 200);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 300);
    camera.position.set(0, 25, -15);
    camera.lookAt(0, 0, 0);

    setupLights();

    arenaGroup = Assets.createTrack();
    scene.add(arenaGroup);

    BOOST_PAD_POSITIONS.forEach(pos => {
      const pad = Assets.createBoostPad(new THREE.Vector3(pos.x, 0, pos.z));
      scene.add(pad);
      boostPads.push(pad);
    });

    BARREL_POSITIONS.forEach(pos => {
      const barrel = Assets.createExplosiveBarrel(new THREE.Vector3(pos.x, 0, pos.z));
      scene.add(barrel);
      barrels.push(barrel);
    });

    CarRenderer.init(scene);
    WeaponRenderer.init(scene);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function setupLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.camera.left = -100;
    dirLight.shadow.camera.right = 100;
    dirLight.shadow.camera.top = 100;
    dirLight.shadow.camera.bottom = -100;
    scene.add(dirLight);

    const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
    fill.position.set(-30, 40, -20);
    scene.add(fill);

    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.4);
    scene.add(hemi);
  }

  function start(localId) {
    localPlayerId = localId;
    gameRunning = true;
    UIManager.setLocalPlayer(localId);
    Controls.reset();
    AudioManager.startEngine();
    lastInputSend = 0;
    gameLoop();
  }

  let lastCameraPos = new THREE.Vector3(0, 20, 15);

  function gameLoop() {
    if (!gameRunning) return;
    animFrameId = requestAnimationFrame(gameLoop);

    const cameraTarget = CarRenderer.getCarPosition(localPlayerId);
    if (cameraTarget) {
      const carMesh = CarRenderer._getCarMesh(localPlayerId);
      let carRot = 0;
      if (carMesh) carRot = carMesh.rotation.y;

      const behind = new THREE.Vector3(0, 14, 12);
      const rotated = behind.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), carRot);
      const targetPos = cameraTarget.clone().add(rotated);

      lastCameraPos.lerp(targetPos, 0.08);
      camera.position.copy(lastCameraPos);
      camera.lookAt(cameraTarget);
    }

    sendPlayerInput();
    renderer.render(scene, camera);
  }

  function sendPlayerInput() {
    const now = Date.now();
    if (now - lastInputSend < INPUT_SEND_INTERVAL) return;
    lastInputSend = now;

    const input = Controls.getInput();

    if (input.missile) {
      UIManager.showMissileLock(false);
      AudioManager.playMissile();
    }

    if (input.shooting && now - (lastShootSound || 0) > 200) {
      lastShootSound = now;
      AudioManager.playShoot();
    }

    Network.sendInput(input);
  }

  let lastShootSound = 0;

  function updateGameState(data) {
    if (!gameRunning || !data) return;

    const { players, projectiles, pickups, explosions } = data;

    CarRenderer.updateCars(players, localPlayerId);

    WeaponRenderer.updateProjectiles(projectiles || []);

    const localPlayer = players.find(p => p.id === localPlayerId);
    if (localPlayer) {
      UIManager.updateHUD(
        localPlayer.speed || 0,
        localPlayer.health || 100,
        localPlayer.maxHealth || 100,
        localPlayer.nitro || 0,
        localPlayer.maxNitro || 100,
        localPlayer.lapProgress || 0,
        localPlayer.missilesLeft || 5
      );
      AudioManager.updateEngine(localPlayer.speed || 0);
    }

    UIManager.updateScoreboard(players, localPlayerId);
    UIManager.updateMinimap(players, localPlayerId);
  }

  function addPlayer(playerData) {
    CarRenderer.addCar(playerData.id, playerData);
  }

  function removePlayer(playerId) {
    CarRenderer.removeCar(playerId);
  }

  function stop() {
    gameRunning = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    AudioManager.stopEngine();
    CarRenderer.removeAll();
    WeaponRenderer.clearAll();
    boostPads.forEach(p => scene.remove(p));
    boostPads = [];
    barrels.forEach(b => scene.remove(b));
    barrels = [];
    if (arenaGroup) scene.remove(arenaGroup);
    arenaGroup = null;
    localPlayerId = null;
  }

  function getLocalPlayerId() { return localPlayerId; }

  return { init, start, stop, updateGameState, addPlayer, removePlayer, getLocalPlayerId };
})();
