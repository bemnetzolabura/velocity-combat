/**
 * Weapon projectiles and effects rendering
 */
const WeaponRenderer = (() => {
  let scene = null;
  const projectiles = new Map();
  const explosions = new Map();

  function init(s) { scene = s; }

  function updateProjectiles(serverProjectiles) {
    const activeIds = new Set();

    serverProjectiles.forEach(proj => {
      activeIds.add(proj.id);
      let p = projectiles.get(proj.id);
      if (!p) {
        const color = proj.color || 0xffaa00;
        const size = proj.type === 'missile' ? 0.3 : 0.1;
        const geo = new THREE.SphereGeometry(size, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.9
        });
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);

        if (proj.type === 'missile') {
          const trailMat = new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.3
          });
          const trail = new THREE.Mesh(new THREE.SphereGeometry(0.5, 4, 4), trailMat);
          mesh.add(trail);
        }

        p = { mesh, type: proj.type };
        projectiles.set(proj.id, p);
      }

      p.mesh.position.set(proj.position.x, proj.position.y, proj.position.z);
      p.mesh.visible = true;
    });

    projectiles.forEach((p, id) => {
      if (!activeIds.has(id)) {
        scene.remove(p.mesh);
        projectiles.delete(id);
      }
    });
  }

  function showExplosion(data) {
    const pos = data.position;
    const radius = data.radius || 8;
    const exp = Assets.createExplosion(radius);
    exp.position.set(pos.x, pos.y || 0.5, pos.z);
    scene.add(exp);

    const startTime = Date.now();
    const duration = 500;

    function animate() {
      const elapsed = Date.now() - startTime;
      const t = elapsed / duration;
      if (t >= 1) {
        scene.remove(exp);
        return;
      }
      exp.scale.setScalar(1 + t * 2);
      exp.children.forEach(child => {
        if (child.material) {
          child.material.opacity = 1 - t;
        }
      });
      requestAnimationFrame(animate);
    }
    animate();

    AudioManager.playExplosion();
  }

  function clearAll() {
    projectiles.forEach((p) => scene.remove(p.mesh));
    projectiles.clear();
    explosions.forEach((e) => scene.remove(e));
    explosions.clear();
  }

  return { init, updateProjectiles, showExplosion, clearAll };
})();
