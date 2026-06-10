/**
 * Car rendering and management
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const CarRenderer = (() => {
  const cars = new Map();
  let scene = null;

  const CAR_COLORS = {
    street: 0x3498db,
    muscle: 0xe74c3c,
    hyper: 0xf1c40f
  };

  const SKIN_COLORS = {
    street: [0x3498db, 0x2c3e50, 0xf39c12],
    muscle: [0xe74c3c, 0x1a1a2e, 0x2ecc71],
    hyper: [0xf1c40f, 0xecf0f1, 0x9b59b6]
  };

  function init(s) { scene = s; }

  function addCar(playerId, playerData) {
    const color = getSkinColor(playerData.carId, playerData.skinIndex);
    const mesh = Assets.createCarBody(playerData.carId, color);

    const spawnPos = { x: -70 + Math.random() * 10, y: 0.5, z: -60 + Math.random() * 10 };
    mesh.position.set(spawnPos.x, spawnPos.y, spawnPos.z);

    if (playerData.isAI) {
      mesh.traverse(child => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.emissive = new THREE.Color(0x9b59b6);
          child.material.emissiveIntensity = 0.1;
        }
      });
    }

    scene.add(mesh);

    const nameTag = createNameTag(playerData.username, playerData.isAI);
    nameTag.position.copy(mesh.position);
    nameTag.position.y += 2;
    scene.add(nameTag);

    cars.set(playerId, {
      mesh,
      nameTag,
      username: playerData.username,
      carId: playerData.carId,
      isAI: playerData.isAI || false,
      lastPosition: new THREE.Vector3(),
      lastHealth: 100,
      lastNitro: 0
    });
  }

  function getSkinColor(carId, skinIndex) {
    const skins = SKIN_COLORS[carId];
    if (skins && skins[skinIndex]) return skins[skinIndex];
    return CAR_COLORS[carId] || 0x3498db;
  }

  function createNameTag(name, isAI) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = isAI ? 'rgba(155,89,182,0.4)' : 'rgba(0,0,0,0.6)';
    roundRect(ctx, 0, 0, 256, 64, 8);
    ctx.fill();

    ctx.fillStyle = isAI ? '#9b59b6' : '#ffffff';
    ctx.font = 'bold 28px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 34);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    return new THREE.Sprite(spriteMat);
  }

  function updateCars(players, localPlayerId) {
    players.forEach(player => {
      let car = cars.get(player.id);
      if (!car) return;

      const pos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
      car.mesh.position.copy(pos);
      car.mesh.position.y = 0.35;
      car.mesh.rotation.y = -player.rotation;

      car.nameTag.position.copy(pos);
      car.nameTag.position.y += 2.5;

      if (player.id === localPlayerId) {
        car.lastPosition.copy(pos);
        car.lastHealth = player.health;
        car.lastNitro = player.nitro;
      }

      if (player.boostActive) {
        const boostMat = car.mesh.children[0].material;
        if (boostMat.emissive) {
          boostMat.emissiveIntensity = 0.5;
        }
      } else {
        const normalMat = car.mesh.children[0].material;
        if (normalMat.emissive) {
          normalMat.emissiveIntensity = 0;
        }
      }
    });
  }

  function removeCar(playerId) {
    const car = cars.get(playerId);
    if (!car) return;
    scene.remove(car.mesh);
    scene.remove(car.nameTag);
    cars.delete(playerId);
  }

  function removeAll() {
    cars.forEach((car) => {
      scene.remove(car.mesh);
      scene.remove(car.nameTag);
    });
    cars.clear();
  }

  function getCarPosition(playerId) {
    const car = cars.get(playerId);
    return car ? car.mesh.position : null;
  }

  function getCarMesh(playerId) {
    const car = cars.get(playerId);
    return car ? car.mesh : null;
  }

  return { init, addCar, updateCars, removeCar, removeAll, getCarPosition, getCarMesh, _getCarMesh: getCarMesh };
})();
