const { CARS, getCarStats } = require('../shared/cars');

const AI_NAMES = [
  'NitroBot', 'DriftKing', 'RoadRage', 'SpeedDemon',
  'CrashTest', 'TurboTim', 'ApexPred', 'Burnout',
  'FlashFire', 'ShadowX', 'Thunder', 'BlitzKrieg',
  'RocketM', 'ViperX', 'GhostRider', 'Cyclone'
];

const CAR_IDS = ['street', 'muscle', 'hyper'];

function createAIPlayers(roomId, count) {
  const aiPlayers = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    let name;
    do {
      name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)] + (Math.floor(Math.random() * 999) + 1);
    } while (usedNames.has(name));
    usedNames.add(name);

    const carId = CAR_IDS[Math.floor(Math.random() * CAR_IDS.length)];
    const skinIndex = Math.floor(Math.random() * 3);

    aiPlayers.push({
      id: `ai_${roomId}_${i}_${Date.now()}`,
      username: name,
      carId,
      skinIndex,
      isAI: true,
      roomId,
      state: 'lobby',
      xp: 0,
      wins: 0,
      kills: 0,
      deaths: 0
    });
  }

  return aiPlayers;
}

function updateAI(gamePlayer, trackWaypoints, deltaTime) {
  if (!gamePlayer || gamePlayer.state !== 'alive') return;

  const target = getNextWaypoint(gamePlayer, trackWaypoints);
  if (!target) return;

  const dx = target.x - gamePlayer.position.x;
  const dz = target.z - gamePlayer.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  const angleToTarget = Math.atan2(dx, dz);
  let angleDiff = angleToTarget - gamePlayer.rotation;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  const steer = Math.max(-1, Math.min(1, angleDiff * 2));

  let throttle = 1;
  if (dist < 5) throttle = 0.3;
  if (dist > 50) throttle = 1;

  let brake = 0;
  if (Math.abs(angleDiff) > 0.8) {
    brake = 0.3;
    throttle = 0.5;
  }

  const shooting = Math.random() < 0.05;
  const nitro = gamePlayer.nitro >= 80 && Math.random() < 0.1;
  const missile = Math.random() < 0.02 && gamePlayer.missilesLeft > 0;

  gamePlayer.input = {
    throttle,
    brake,
    steer,
    shooting,
    missile,
    nitro,
    aimDirection: { x: dx / dist, z: dz / dist },
    timestamp: Date.now()
  };

  if (gamePlayer.aiState === null) {
    gamePlayer.aiState = {
      aggression: 0.3 + Math.random() * 0.4,
      skill: 0.5 + Math.random() * 0.5,
      targetPlayer: null
    };
  }
}

function getNextWaypoint(gamePlayer, waypoints) {
  if (!waypoints || waypoints.length === 0) return null;

  let closest = 0;
  let closestDist = Infinity;

  for (let i = 0; i < waypoints.length; i++) {
    const dx = waypoints[i].x - gamePlayer.position.x;
    const dz = waypoints[i].z - gamePlayer.position.z;
    const dist = dx * dx + dz * dz;
    if (dist < closestDist) {
      closestDist = dist;
      closest = i;
    }
  }

  const nextIdx = (closest + 1) % waypoints.length;
  return waypoints[nextIdx];
}

module.exports = { createAIPlayers, updateAI, getNextWaypoint };
