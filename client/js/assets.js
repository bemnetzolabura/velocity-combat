/**
 * Procedural asset generation - no external files needed
 */
const Assets = (() => {
  function createCarBody(carId, skinColor) {
    const group = new THREE.Group();
    const bodyColor = skinColor || getCarColor(carId);

    const bodyGeo = new THREE.BoxGeometry(1.8, 0.5, 3.8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      metalness: 0.6,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.5, 0.35, 2.0);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.7
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.7, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wheelPositions = [
      [-0.9, 0.15, -1.2], [0.9, 0.15, -1.2],
      [-0.9, 0.15, 1.2], [0.9, 0.15, 1.2]
    ];
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 8), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      group.add(wheel);
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xf1c40f,
      emissiveIntensity: 0.3
    });
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 3.0), accentMat);
    stripe.position.set(0, 0.6, 0);
    group.add(stripe);

    group.userData = { carId, bodyColor };
    return group;
  }

  function getCarColor(carId) {
    const colors = { street: 0x3498db, muscle: 0xe74c3c, hyper: 0xf1c40f };
    return colors[carId] || 0x3498db;
  }

  function createTrack() {
    const group = new THREE.Group();

    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.9,
      metalness: 0.0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    group.add(ground);

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.1
    });

    const roadPoints = [
      [-80, -65, 80, -65], [-80, -65, -80, 65],
      [-80, 65, 80, 65], [80, -65, 80, 65],
      [-80, -65, -70, -55], [80, -65, 70, -55],
      [-80, 65, -70, 55], [80, 65, 70, 55]
    ];

    roadPoints.forEach(rp => {
      const w = Math.abs(rp[2] - rp[0]) || 6;
      const d = Math.abs(rp[3] - rp[1]) || 6;
      const road = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.max(w, 6), Math.max(d, 6)),
        roadMat
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set((rp[0] + rp[2]) / 2, 0.01, (rp[1] + rp[3]) / 2);
      group.add(road);
    });

    const trackLoop = [
      [-70, -60], [-50, -68], [-20, -70], [20, -70], [50, -68], [70, -55],
      [75, -30], [75, 0], [75, 30], [70, 55], [50, 68], [20, 70],
      [-20, 70], [-50, 68], [-70, 55], [-75, 30], [-75, 0], [-75, -30], [-70, -60]
    ];

    for (let i = 0; i < trackLoop.length - 1; i++) {
      const p1 = trackLoop[i];
      const p2 = trackLoop[i + 1];
      const dx = p2[0] - p1[0];
      const dz = p2[1] - p1[1];
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const seg = new THREE.Mesh(
        new THREE.PlaneGeometry(12, len + 1),
        new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 })
      );
      seg.rotation.x = -Math.PI / 2;
      seg.position.set((p1[0] + p2[0]) / 2, 0.02, (p1[1] + p2[1]) / 2);
      seg.rotation.z = angle;
      group.add(seg);
    }

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.7 });
    const barrierPositions = [
      [-70, -60], [-30, -70], [30, -70], [70, -50],
      [75, 0], [70, 50], [30, 70], [-30, 70],
      [-70, 50], [-75, 0]
    ];
    barrierPositions.forEach(pos => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.5), wallMat);
      wall.position.set(pos[0], 1, pos[1]);
      wall.castShadow = true;
      group.add(wall);
    });

    // Arena walls
    const wallMat2 = new THREE.MeshStandardMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.3,
      roughness: 0.5
    });
    const wd = 200, wh = 3;
    const wallDefs = [
      { x: 0, z: -100, sx: wd + 2, sz: 1 },
      { x: 0, z: 100, sx: wd + 2, sz: 1 },
      { x: -100, z: 0, sx: 1, sz: wd + 2 },
      { x: 100, z: 0, sx: 1, sz: wd + 2 }
    ];
    wallDefs.forEach(w => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w.sx, wh, w.sz), wallMat2);
      wall.position.set(w.x, wh / 2, w.z);
      group.add(wall);
    });

    return group;
  }

  function createBoostPad(position) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf1c40f,
      emissive: 0xf1c40f,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8
    });
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), mat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(0, 0.05, 0);
    group.add(pad);

    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 0.3
    });
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 3), arrowMat);
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0.1, 0);
    group.add(arrow);

    group.position.copy(position);
    return group;
  }

  function createExplosiveBarrel(position) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      roughness: 0.6,
      metalness: 0.3
    });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.5, 8), mat);
    barrel.position.y = 0.75;
    barrel.castShadow = true;
    group.add(barrel);

    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff6600,
      emissiveIntensity: 0.2
    });
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 8), stripeMat);
    stripe.position.y = 1.1;
    group.add(stripe);

    const stripe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 8), stripeMat);
    stripe2.position.y = 0.4;
    group.add(stripe2);

    group.position.copy(position);
    return group;
  }

  function createPickup(type) {
    const group = new THREE.Group();
    const colors = { health: 0x2ecc71, nitro: 0x9b59b6, ammo: 0xe67e22 };
    const color = colors[type] || 0xffffff;

    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8
    });

    if (type === 'health') {
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.2), mat);
      cross.position.y = 0.5;
      group.add(cross);
      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), mat);
      cross2.position.y = 0.5;
      group.add(cross2);
    } else if (type === 'nitro') {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), mat);
      gem.position.y = 0.5;
      group.add(gem);
    } else {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), mat);
      box.position.y = 0.3;
      group.add(box);
    }

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 })
    );
    glow.position.y = 0.5;
    group.add(glow);

    return group;
  }

  function createExplosion(radius) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff4400,
      transparent: true,
      opacity: 0.8
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 12), mat);
    group.add(sphere);

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.9
    });
    const inner = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.4, 8, 8), innerMat);
    group.add(inner);

    return group;
  }

  return { createCarBody, createTrack, createBoostPad, createExplosiveBarrel, createPickup, createExplosion };
})();
