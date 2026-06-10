const { GAME_STATES, PLAYER_STATES, ARENA, MAX_HEALTH, RESPAWN_TIME, TICK_MS } = require('../shared/constants');
const { WEAPONS } = require('../shared/weapons');
const { CARS, getCarStats } = require('../shared/cars');
const { applyCarPhysics, checkCollisions } = require('./physics');
const { updateAI } = require('./ai');

const TRACK_WAYPOINTS = [
  { x: -70, z: -60 }, { x: -30, z: -70 }, { x: 30, z: -70 },
  { x: 70, z: -50 }, { x: 75, z: 0 }, { x: 70, z: 50 },
  { x: 30, z: 70 }, { x: -30, z: 70 }, { x: -70, z: 50 },
  { x: -75, z: 0 }, { x: -70, z: -60 }
];

const BOOST_PADS = [
  { x: -50, z: -50 }, { x: 0, z: -70 }, { x: 50, z: -50 },
  { x: 70, z: 0 }, { x: 50, z: 50 }, { x: 0, z: 70 },
  { x: -50, z: 50 }, { x: -70, z: 0 }
];

const EXPLOSIVE_BARRELS = [
  { x: -40, z: -20 }, { x: 20, z: -40 }, { x: 0, z: 0 },
  { x: 40, z: 20 }, { x: -20, z: 40 }, { x: 30, z: -30 },
  { x: -30, z: 30 }, { x: 10, z: -10 }, { x: -10, z: 10 }
];

function createGameLoop(io, gameState, matchmaking) {
  let tickCount = 0;

  function tick() {
    tickCount++;
    gameState.rooms.forEach((room, roomId) => {
      if (room.state !== GAME_STATES.RACING) return;

      const deltaTime = TICK_MS / 1000;

      room.gamePlayers.forEach((gp, playerId) => {
        if (gp.isAI) {
          updateAI(gp, TRACK_WAYPOINTS, deltaTime);
        }

        if (gp.state === PLAYER_STATES.ALIVE) {
          if (gp.invincibleUntil > Date.now()) {
            gp.invincibleUntil = Math.max(gp.invincibleUntil, Date.now() + 50);
          }

          if (gp.input.nitro && gp.nitro > 0) {
            gp.boostActive = true;
          } else {
            gp.boostActive = false;
          }

          applyCarPhysics(gp, deltaTime);
          checkCollisions(gp, room, deltaTime);
          checkPickups(gp, room);
          checkBoostPads(gp, deltaTime);
          checkBarrelCollisions(gp, room, deltaTime);

          if (gp.input.shooting) {
            handleShooting(gp, room, deltaTime);
          }
          if (gp.input.missile) {
            handleMissile(gp, room, deltaTime);
          }

          updateLapProgress(gp, deltaTime);
          gp.score = gp.kills * 100 + gp.laps * 1000 + Math.floor(gp.lapProgress);
        }

        if (gp.state === PLAYER_STATES.DEAD) {
          gp.respawnTimer -= TICK_MS;
          if (gp.respawnTimer <= 0) {
            respawnPlayer(gp, room);
          }
        }
      });

      updateProjectiles(room, deltaTime);
      updatePickups(room, deltaTime);

      const stateSnapshot = buildStateSnapshot(room);
      io.to(roomId).emit('game_state', stateSnapshot);

      const playersAlive = countAlive(room);
      const finishedCount = countFinished(room);
      if (finishedCount >= room.gamePlayers.size || playersAlive <= 1) {
        matchmaking.endGame(room);
      }
    });
  }

  function countAlive(room) {
    let count = 0;
    room.gamePlayers.forEach(gp => {
      if (gp.state === 'alive') count++;
    });
    return count;
  }

  function countFinished(room) {
    let count = 0;
    room.gamePlayers.forEach(gp => {
      if (gp.state === 'finished') count++;
    });
    return count;
  }

  function buildStateSnapshot(room) {
    const players = [];
    room.gamePlayers.forEach(gp => {
      players.push({
        id: gp.id,
        position: { x: Math.round(gp.position.x * 100) / 100, y: Math.round(gp.position.y * 100) / 100, z: Math.round(gp.position.z * 100) / 100 },
        rotation: Math.round(gp.rotation * 100) / 100,
        velocity: { x: Math.round(gp.velocity.x * 100) / 100, y: 0, z: Math.round(gp.velocity.z * 100) / 100 },
        health: Math.round(gp.health),
        maxHealth: gp.maxHealth,
        nitro: Math.round(gp.nitro),
        maxNitro: gp.maxNitro,
        speed: Math.round(gp.speed),
        boostActive: gp.boostActive,
        state: gp.state,
        lapProgress: gp.lapProgress,
        kills: gp.kills,
        score: gp.score,
        username: gp.username,
        carId: gp.carId,
        skinIndex: gp.skinIndex,
        isAI: gp.isAI || false,
        missilesLeft: gp.missilesLeft
      });
    });

    const projs = room.projectiles.filter(p => p.active).map(p => ({
      id: p.id,
      position: p.position,
      velocity: p.velocity,
      type: p.type,
      ownerId: p.ownerId,
      color: p.color
    }));

    const pickups = room.pickups.filter(p => p.active).map(p => ({
      id: p.id,
      position: p.position,
      type: p.type
    }));

    const explosions = room.projectiles.filter(p => p.exploding && p.explosionTimer > 0).map(p => ({
      position: p.position,
      radius: p.explosionRadius || 8,
      timer: p.explosionTimer
    }));

    return { players, projectiles: projs, pickups, explosions };
  }

  function checkPickups(gp, room) {
    if (gp.state !== 'alive') return;
    room.pickups.forEach(pickup => {
      if (!pickup.active) return;
      const dx = gp.position.x - pickup.position.x;
      const dz = gp.position.z - pickup.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 2.5) {
        pickup.active = false;
        pickup.respawnTimer = pickup.respawnTime || 10000;
        if (pickup.type === 'health') {
          gp.health = Math.min(gp.maxHealth, gp.health + 30);
        } else if (pickup.type === 'nitro') {
          gp.nitro = Math.min(gp.maxNitro, gp.nitro + 50);
        } else if (pickup.type === 'ammo') {
          gp.missilesLeft = Math.min(10, (gp.missilesLeft || 0) + 3);
        }
      }
    });
  }

  function checkBoostPads(gp, deltaTime) {
    if (gp.state !== 'alive') return;
    BOOST_PADS.forEach(pad => {
      const dx = gp.position.x - pad.x;
      const dz = gp.position.z - pad.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 3) {
        const boostForce = 20 * deltaTime;
        const forwardX = Math.sin(gp.rotation) * boostForce;
        const forwardZ = Math.cos(gp.rotation) * boostForce;
        gp.velocity.x += forwardX;
        gp.velocity.z += forwardZ;
      }
    });
  }

  function checkBarrelCollisions(gp, room, deltaTime) {
    if (gp.state !== 'alive') return;
    EXPLOSIVE_BARRELS.forEach((barrel, idx) => {
      const dx = gp.position.x - barrel.x;
      const dz = gp.position.z - barrel.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 2.5) {
        const damage = 30;
        gp.health = Math.max(0, gp.health - damage);
        addExplosion(room, barrel.x, 0.5, barrel.z, 8);
        EXPLOSIVE_BARRELS.splice(idx, 1);
        setTimeout(() => EXPLOSIVE_BARRELS.push(barrel), 15000);
        if (gp.health <= 0) {
          killPlayer(gp, room, null);
        }
      }
    });
  }

  function handleShooting(gp, room, deltaTime) {
    const now = Date.now();
    const weapon = WEAPONS.machinegun;
    if (now - gp.lastFireTime < weapon.fireRate) return;
    gp.lastFireTime = now;

    const dir = gp.input.aimDirection || { x: 0, z: 1 };
    const len = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    const nx = dir.x / len;
    const nz = dir.z / len;

    const spread = (Math.random() - 0.5) * weapon.spread;
    const sx = Math.cos(spread) * nx - Math.sin(spread) * nz;
    const sz = Math.sin(spread) * nx + Math.cos(spread) * nz;

    room.projectiles.push({
      id: `proj_${now}_${Math.random()}`,
      type: 'machinegun',
      position: { x: gp.position.x, y: 0.8, z: gp.position.z },
      velocity: { x: sx * weapon.speed, y: 0, z: sz * weapon.speed },
      ownerId: gp.id,
      damage: weapon.damage,
      range: weapon.range,
      color: weapon.color,
      active: true,
      distanceTraveled: 0,
      exploding: false,
      explosionTimer: 0
    });
  }

  function handleMissile(gp, room, deltaTime) {
    const now = Date.now();
    const weapon = WEAPONS.missile;
    if (now - gp.lastMissileTime < weapon.lockTime) return;
    if (gp.missilesLeft <= 0) return;

    gp.lastMissileTime = now;
    gp.missilesLeft--;

    const dir = gp.input.aimDirection || { x: 0, z: 1 };
    const len = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
    const nx = dir.x / len;
    const nz = dir.z / len;

    room.projectiles.push({
      id: `msl_${now}_${Math.random()}`,
      type: 'missile',
      position: { x: gp.position.x, y: 1.0, z: gp.position.z },
      velocity: { x: nx * weapon.speed, y: 0, z: nz * weapon.speed },
      ownerId: gp.id,
      damage: weapon.damage,
      range: weapon.range,
      color: weapon.color,
      active: true,
      distanceTraveled: 0,
      exploding: false,
      explosionTimer: 0,
      explosionRadius: weapon.explosionRadius,
      aoeDamage: weapon.aoeDamage,
      turnSpeed: weapon.turnSpeed,
      target: findNearestEnemy(gp, room)
    });
  }

  function findNearestEnemy(gp, room) {
    let nearest = null;
    let nearestDist = Infinity;
    room.gamePlayers.forEach(other => {
      if (other.id === gp.id || other.state !== 'alive') return;
      const dx = other.position.x - gp.position.x;
      const dz = other.position.z - gp.position.z;
      const dist = dx * dx + dz * dz;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    });
    return nearest;
  }

  function updateProjectiles(room, deltaTime) {
    room.projectiles.forEach(proj => {
      if (!proj.active) return;

      if (proj.type === 'missile' && proj.target) {
        const t = proj.target;
        if (t.state === 'alive') {
          const dx = t.position.x - proj.position.x;
          const dz = t.position.z - proj.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist > 0.1) {
            const desired = { x: dx / dist, z: dz / dist };
            const currentLen = Math.sqrt(proj.velocity.x * proj.velocity.x + proj.velocity.z * proj.velocity.z);
            const cux = proj.velocity.x / currentLen;
            const cuz = proj.velocity.z / currentLen;
            const turnRate = proj.turnSpeed * deltaTime;
            const newUx = cux + (desired.x - cux) * turnRate;
            const newUz = cuz + (desired.z - cuz) * turnRate;
            const newLen = Math.sqrt(newUx * newUx + newUz * newUz);
            if (newLen > 0.01) {
              const speed = Math.sqrt(proj.velocity.x * proj.velocity.x + proj.velocity.z * proj.velocity.z);
              proj.velocity.x = (newUx / newLen) * speed;
              proj.velocity.z = (newUz / newLen) * speed;
            }
          }
        }
      }

      proj.position.x += proj.velocity.x * deltaTime;
      proj.position.z += proj.velocity.z * deltaTime;
      proj.distanceTraveled += Math.sqrt(
        proj.velocity.x * proj.velocity.x + proj.velocity.z * proj.velocity.z
      ) * deltaTime;

      if (proj.distanceTraveled > proj.range) {
        proj.active = false;
        return;
      }

      if (Math.abs(proj.position.x) > ARENA.width / 2 || Math.abs(proj.position.z) > ARENA.depth / 2) {
        if (proj.type === 'missile') {
          addExplosion(room, proj.position.x, proj.position.y, proj.position.z, proj.explosionRadius || 8);
        }
        proj.active = false;
        return;
      }

      room.gamePlayers.forEach(gp => {
        if (!proj.active) return;
        if (gp.id === proj.ownerId) return;
        if (gp.state !== 'alive') return;

        const dx = gp.position.x - proj.position.x;
        const dz = gp.position.z - proj.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        const hitRadius = proj.type === 'missile' ? 1.5 : 0.8;
        if (dist < hitRadius) {
          if (proj.type === 'missile') {
            addExplosion(room, proj.position.x, proj.position.y, proj.position.z, proj.explosionRadius || 8);
            room.gamePlayers.forEach(otherGp => {
              if (otherGp.id === proj.ownerId) return;
              if (otherGp.state !== 'alive') return;
              const ex = otherGp.position.x - proj.position.x;
              const ez = otherGp.position.z - proj.position.z;
              const eDist = Math.sqrt(ex * ex + ez * ez);
              if (eDist < (proj.explosionRadius || 8)) {
                const dmg = proj.aoeDamage * (1 - eDist / (proj.explosionRadius || 8));
                otherGp.health = Math.max(0, otherGp.health - dmg);
                if (otherGp.health <= 0) {
                  killPlayer(otherGp, room, proj.ownerId);
                }
              }
            });
          } else {
            gp.health = Math.max(0, gp.health - proj.damage);
            if (gp.health <= 0) {
              killPlayer(gp, room, proj.ownerId);
            }
          }
          proj.active = false;
        }
      });
    });

    room.projectiles = room.projectiles.filter(p => {
      if (p.exploding) {
        p.explosionTimer = (p.explosionTimer || 500) - TICK_MS;
        return p.explosionTimer > 0;
      }
      return p.active;
    });
  }

  function addExplosion(room, x, y, z, radius) {
    if (!room) return;
    const id = `explosion_${Date.now()}_${Math.random()}`;
    room.projectiles.push({
      id,
      active: false,
      exploding: true,
      position: { x, y, z },
      explosionRadius: radius,
      explosionTimer: 500
    });
    io.to(room.id).emit('explosion', { id, position: { x, y, z }, radius });
  }

  function killPlayer(gp, room, killerId) {
    gp.state = PLAYER_STATES.DEAD;
    gp.deaths++;
    gp.respawnTimer = RESPAWN_TIME;
    gp.velocity = { x: 0, y: 0, z: 0 };

    if (killerId) {
      const killer = room.gamePlayers.get(killerId);
      if (killer && killer.id !== gp.id) {
        killer.kills++;
      }
    }

    addExplosion(room, gp.position.x, 0.5, gp.position.z, 6);
    io.to(room.id).emit('player_destroyed', { playerId: gp.id, killerId });
  }

  function respawnPlayer(gp, room) {
    const spawns = [
      { x: -70, z: -60 }, { x: 70, z: -50 }, { x: 70, z: 50 },
      { x: -70, z: 50 }, { x: 0, z: -70 }, { x: 0, z: 70 },
      { x: -40, z: -30 }, { x: 40, z: 30 }
    ];
    const spawn = spawns[Math.floor(Math.random() * spawns.length)];
    const carStats = getCarStats(gp.carId);

    gp.position = { ...spawn, y: 0.5 };
    gp.velocity = { x: 0, y: 0, z: 0 };
    gp.rotation = 0;
    gp.health = carStats.health;
    gp.state = PLAYER_STATES.ALIVE;
    gp.invincibleUntil = Date.now() + 2000;
    gp.boostActive = false;

    io.to(room.id).emit('player_respawned', { playerId: gp.id, position: gp.position });
  }

  function updateLapProgress(gp, deltaTime) {
    if (gp.state !== 'alive') return;

    const checkpoints = [
      { x: -70, z: -60 }, { x: 70, z: 0 }
    ];

    checkpoints.forEach((cp, idx) => {
      const dx = gp.position.x - cp.x;
      const dz = gp.position.z - cp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 10) {
        gp.lapProgress = Math.max(gp.lapProgress, (idx + 1) / checkpoints.length);
      }
    });

    const startLine = { x: -70, z: -60 };
    const sdx = gp.position.x - startLine.x;
    const sdz = gp.position.z - startLine.z;
    const sDist = Math.sqrt(sdx * sdx + sdz * sdz);

    if (sDist < 10 && gp.lapProgress > 0.8) {
      gp.laps++;
      gp.lapProgress = 0;
      if (gp.laps >= 3) {
        gp.state = PLAYER_STATES.FINISHED;
        gp.finished = true;
        gp.finishedAt = Date.now();
        io.to(room.id).emit('player_finished', { playerId: gp.id, position: gp.laps });
      }
    }
  }

  function updatePickups(room, deltaTime) {
    const types = ['health', 'nitro', 'ammo'];
    const pickupPositions = [
      { x: -40, z: -30 }, { x: 0, z: -20 }, { x: 40, z: -30 },
      { x: -30, z: 0 }, { x: 30, z: 0 },
      { x: -40, z: 30 }, { x: 0, z: 20 }, { x: 40, z: 30 }
    ];

    const existingCount = room.pickups.filter(p => p.active).length;
    if (existingCount < 4 && Math.random() < 0.02) {
      const pos = pickupPositions[Math.floor(Math.random() * pickupPositions.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      room.pickups.push({
        id: `pu_${Date.now()}_${Math.random()}`,
        type,
        position: pos,
        active: true,
        respawnTime: type === 'health' ? 10000 : type === 'nitro' ? 8000 : 12000,
        respawnTimer: 0
      });
    }

    room.pickups.forEach(pu => {
      if (!pu.active) {
        pu.respawnTimer -= TICK_MS;
        if (pu.respawnTimer <= 0) {
          pu.active = true;
        }
      }
    });
  }

  return { tick };
}

module.exports = { createGameLoop };
