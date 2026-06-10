const CARS = {
  street: {
    id: 'street',
    name: 'Street Racer',
    description: 'Balanced speed and handling',
    speed: 45,
    acceleration: 35,
    handling: 80,
    health: 100,
    width: 1.8,
    height: 1.2,
    length: 4.0,
    color: 0x3498db,
    maxSpeed: 55,
    boostMultiplier: 1.6,
    mass: 800
  },
  muscle: {
    id: 'muscle',
    name: 'Muscle Tank',
    description: 'Slow but tough, hits hard',
    speed: 35,
    acceleration: 25,
    handling: 50,
    health: 150,
    width: 2.0,
    height: 1.3,
    length: 4.5,
    color: 0xe74c3c,
    maxSpeed: 45,
    boostMultiplier: 1.4,
    mass: 1200
  },
  hyper: {
    id: 'hyper',
    name: 'Hyper Strike',
    description: 'Extreme speed, fragile',
    speed: 60,
    acceleration: 50,
    handling: 60,
    health: 70,
    width: 1.6,
    height: 1.0,
    length: 3.8,
    color: 0xf1c40f,
    maxSpeed: 75,
    boostMultiplier: 1.8,
    mass: 600
  }
};

const SKINS = {
  street: [
    { name: 'Classic Blue', color: 0x3498db },
    { name: 'Night Shadow', color: 0x2c3e50 },
    { name: 'Cheetah Gold', color: 0xf39c12 }
  ],
  muscle: [
    { name: 'Hell Red', color: 0xe74c3c },
    { name: 'Brutal Black', color: 0x1a1a2e },
    { name: 'Patriot', color: 0x2ecc71 }
  ],
  hyper: [
    { name: 'Lightning Yellow', color: 0xf1c40f },
    { name: 'Phantom White', color: 0xecf0f1 },
    { name: 'Circuit Purple', color: 0x9b59b6 }
  ]
};

const XP_TABLE = [
  0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500
];

function getCarStats(carId) {
  return CARS[carId] || CARS.street;
}

function getSkin(carId, skinIndex) {
  const carSkins = SKINS[carId];
  if (!carSkins || !carSkins[skinIndex]) return carSkins[0];
  return carSkins[skinIndex];
}

module.exports = { CARS, SKINS, XP_TABLE, getCarStats, getSkin };
