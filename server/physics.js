const CANNON = require('cannon-es');
const { ARENA } = require('../shared/constants');

function initPhysicsWorld() {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -20, 0),
    allowSleep: true,
    broadphase: new CANNON.SAPBroadphase()
  });

  world.defaultContactMaterial.friction = 0.8;
  world.defaultContactMaterial.restitution = 0.2;

  const groundMaterial = new CANNON.Material('ground');
  const carMaterial = new CANNON.Material('car');
  const groundCarContact = new CANNON.ContactMaterial(groundMaterial, carMaterial, {
    friction: 0.9,
    restitution: 0.1
  });
  world.addContactMaterial(groundCarContact);

  const bodies = [];

  const ground = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
    material: groundMaterial
  });
  ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
  world.addBody(ground);
  bodies.push(ground);

  return { world, bodies };
}

function createTrackColliders(world, bodies) {
  const wallHeight = ARENA.wallHeight;
  const tw = ARENA.width;
  const td = ARENA.depth;

  const wallThickness = 1;

  const walls = [
    { x: 0, z: -td / 2 - wallThickness / 2, w: tw + wallThickness * 2, d: wallThickness },
    { x: 0, z: td / 2 + wallThickness / 2, w: tw + wallThickness * 2, d: wallThickness },
    { x: -tw / 2 - wallThickness / 2, z: 0, w: wallThickness, d: td },
    { x: tw / 2 + wallThickness / 2, z: 0, w: wallThickness, d: td }
  ];

  walls.forEach(w => {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(w.w / 2, wallHeight / 2, w.d / 2))
    });
    body.position.set(w.x, wallHeight / 2, w.z);
    world.addBody(body);
    bodies.push(body);
  });

  const barrierPositions = [
    // Track curve barriers
    { x: -60, z: -40 }, { x: -40, z: -60 }, { x: 20, z: -65 },
    { x: 60, z: -40 }, { x: 65, z: 0 }, { x: 60, z: 40 },
    { x: 40, z: 60 }, { x: -20, z: 65 }, { x: -60, z: 40 },
    { x: -65, z: 0 }
  ];

  barrierPositions.forEach(p => {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Cylinder(1, 1, 2, 8)
    });
    body.position.set(p.x, 1, p.z);
    world.addBody(body);
    bodies.push(body);
  });
}

function applyCarPhysics(gamePlayer, deltaTime) {
  if (!gamePlayer || gamePlayer.state !== 'alive') return;

  const carStats = require('../shared/cars').getCarStats(gamePlayer.carId);
  const input = gamePlayer.input;

  const speed = carStats.speed;
  const accel = carStats.acceleration;
  const handling = carStats.handling;

  let throttleForce = 0;
  if (input.throttle > 0) {
    throttleForce = accel * input.throttle * deltaTime * 10;
  }
  if (input.brake > 0) {
    throttleForce = -speed * 0.5 * input.brake * deltaTime * 5;
  }

  const currentSpeed = Math.sqrt(
    gamePlayer.velocity.x * gamePlayer.velocity.x +
    gamePlayer.velocity.z * gamePlayer.velocity.z
  );

  let maxSpeed = carStats.maxSpeed;
  if (gamePlayer.boostActive) {
    maxSpeed *= carStats.boostMultiplier;
  }

  if (throttleForce > 0 && currentSpeed < maxSpeed) {
    const forwardX = Math.sin(gamePlayer.rotation) * throttleForce;
    const forwardZ = Math.cos(gamePlayer.rotation) * throttleForce;
    gamePlayer.velocity.x += forwardX;
    gamePlayer.velocity.z += forwardZ;
  } else if (throttleForce < 0) {
    const forwardX = Math.sin(gamePlayer.rotation) * throttleForce;
    const forwardZ = Math.cos(gamePlayer.rotation) * throttleForce;
    gamePlayer.velocity.x += forwardX;
    gamePlayer.velocity.z += forwardZ;
  }

  const friction = 0.98;
  gamePlayer.velocity.x *= friction;
  gamePlayer.velocity.z *= friction;

  const rotSpeed = handling * 0.02;
  if (currentSpeed > 0.5) {
    gamePlayer.rotation += input.steer * rotSpeed * (currentSpeed / maxSpeed);
  }

  gamePlayer.position.x += gamePlayer.velocity.x * deltaTime;
  gamePlayer.position.z += gamePlayer.velocity.z * deltaTime;

  gamePlayer.speed = currentSpeed;

  // Drift mechanics for nitro
  if (Math.abs(input.steer) > 0.3 && currentSpeed > 5) {
    gamePlayer.driftAngle += Math.abs(input.steer) * currentSpeed * 0.01 * deltaTime;
    gamePlayer.nitro = Math.min(gamePlayer.maxNitro, gamePlayer.nitro + Math.abs(input.steer) * 2 * deltaTime);
  } else {
    gamePlayer.driftAngle *= 0.95;
  }

  // Nitro boost
  if (input.nitro && gamePlayer.nitro > 0 && gamePlayer.boostActive) {
    const boostForce = carStats.speed * 0.5;
    const forwardX = Math.sin(gamePlayer.rotation) * boostForce * deltaTime;
    const forwardZ = Math.cos(gamePlayer.rotation) * boostForce * deltaTime;
    gamePlayer.velocity.x += forwardX;
    gamePlayer.velocity.z += forwardZ;
    gamePlayer.nitro = Math.max(0, gamePlayer.nitro - 2);
    if (gamePlayer.nitro <= 0) gamePlayer.boostActive = false;
  } else {
    gamePlayer.boostActive = false;
  }
}

function checkCollisions(gamePlayer, room, deltaTime) {
  if (!gamePlayer || gamePlayer.state !== 'alive') return;

  const gp = gamePlayer;
  const { ARENA } = require('../shared/constants');

  const halfSize = ARENA.width / 2 - 1;
  const halfDepth = ARENA.depth / 2 - 1;

  if (Math.abs(gp.position.x) > halfSize) {
    gp.position.x = Math.sign(gp.position.x) * halfSize;
    gp.velocity.x *= -0.3;
  }
  if (Math.abs(gp.position.z) > halfDepth) {
    gp.position.z = Math.sign(gp.position.z) * halfDepth;
    gp.velocity.z *= -0.3;
  }

  // Check barrel collisions
  room.gamePlayers.forEach((other) => {
    if (other.id === gp.id || other.state !== 'alive') return;
    const dx = gp.position.x - other.position.x;
    const dz = gp.position.z - other.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = 2.0;

    if (dist < minDist) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const nz = dz / dist;
      gp.position.x += nx * overlap * 0.5;
      gp.position.z += nz * overlap * 0.5;
      other.position.x -= nx * overlap * 0.5;
      other.position.z -= nz * overlap * 0.5;

      const relVelX = gp.velocity.x - other.velocity.x;
      const relVelZ = gp.velocity.z - other.velocity.z;
      const relVel = relVelX * nx + relVelZ * nz;

      if (relVel > 1) {
        const impulse = relVel * 0.3;
        gp.velocity.x -= nx * impulse;
        gp.velocity.z -= nz * impulse;
        other.velocity.x += nx * impulse;
        other.velocity.z += nz * impulse;

        const damage = Math.min(15, relVel * 2);
        gp.health = Math.max(0, gp.health - damage * 0.5);
        other.health = Math.max(0, other.health - damage * 0.5);
      }
    }
  });

  return true;
}

module.exports = { initPhysicsWorld, createTrackColliders, applyCarPhysics, checkCollisions };
