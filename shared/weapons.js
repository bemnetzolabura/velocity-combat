const WEAPONS = {
  machinegun: {
    id: 'machinegun',
    name: 'Machine Gun',
    damage: 8,
    fireRate: 150,
    range: 80,
    speed: 100,
    ammo: Infinity,
    projectileSize: 0.1,
    color: 0xffaa00,
    knockback: 5,
    spread: 0.05
  },
  missile: {
    id: 'missile',
    name: 'Missile',
    damage: 40,
    fireRate: 2000,
    range: 100,
    speed: 35,
    ammo: 5,
    projectileSize: 0.3,
    color: 0xff3333,
    knockback: 20,
    lockTime: 1000,
    turnSpeed: 2,
    explosionRadius: 8,
    aoeDamage: 20
  }
};

const PICKUPS = {
  health: { color: 0x2ecc71, healAmount: 30, respawnTime: 10000 },
  nitro: { color: 0x9b59b6, nitroAmount: 50, respawnTime: 8000 },
  ammo: { color: 0xe67e22, ammoAmount: 3, respawnTime: 12000 }
};

module.exports = { WEAPONS, PICKUPS };
