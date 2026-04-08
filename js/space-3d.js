import * as THREE from 'three';

export class Space3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000005);

    this.camera = new THREE.PerspectiveCamera(60, 1, 1, 8000);
    this.camera.position.set(0, 250, 350);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    const hemi = new THREE.HemisphereLight(0x4488ff, 0x000022, 0.4);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.5);
    sun.position.set(800, 600, 400);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
    rim.position.set(-500, 200, -400);
    this.scene.add(rim);
    const accent = new THREE.PointLight(0xff66aa, 1, 3000);
    accent.position.set(0, 500, -800);
    this.scene.add(accent);

    // Skybox starfield — multi-layered
    this.makeStars(2500, 4000, 4, 1);
    this.makeStars(800, 2500, 6, 0.8);
    this.makeStars(300, 1500, 10, 0.6);

    // Distant nebula sprites (planes facing camera)
    this.makeNebula(0x6622aa, -1500, 200, -2000, 1200);
    this.makeNebula(0x2266aa, 1800, -400, -1800, 1400);
    this.makeNebula(0xaa3366, -800, 600, 2200, 900);

    // Ship
    this.shipGroup = new THREE.Group();
    // Hull
    const hullGeo = new THREE.ConeGeometry(14, 50, 16);
    hullGeo.rotateX(Math.PI / 2);
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x4488dd, metalness: 0.7, roughness: 0.3, emissive: 0x0a1a33 });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    this.shipGroup.add(hull);
    // Cockpit dome
    const domeGeo = new THREE.SphereGeometry(8, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x88ddff, emissive: 0x4488aa, metalness: 0.5, roughness: 0.1, transparent: true, opacity: 0.85 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 4, -6);
    this.shipGroup.add(dome);
    // Wings
    const wingGeo = new THREE.BoxGeometry(50, 3, 14);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x335588, metalness: 0.8, roughness: 0.4 });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.set(0, -2, 8);
    this.shipGroup.add(wings);
    // Wing tips with thrusters
    for (const xOff of [-22, 22]) {
      const tipGeo = new THREE.BoxGeometry(8, 6, 12);
      const tip = new THREE.Mesh(tipGeo, hullMat);
      tip.position.set(xOff, -2, 10);
      this.shipGroup.add(tip);
    }
    // Engine glow
    const engineGeo = new THREE.SphereGeometry(10, 12, 12);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0xff8833 });
    this.engineGlow = new THREE.Mesh(engineGeo, engineMat);
    this.engineGlow.position.set(0, 0, 28);
    this.shipGroup.add(this.engineGlow);
    // Engine light
    this.engineLight = new THREE.PointLight(0xff8833, 2, 200);
    this.engineLight.position.set(0, 0, 28);
    this.shipGroup.add(this.engineLight);
    this.scene.add(this.shipGroup);

    // Pools
    this.asteroidMeshes = [];
    for (let i = 0; i < 40; i++) {
      const r = 18 + Math.random() * 30;
      const geo = new THREE.IcosahedronGeometry(r, 1);
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        pos.setXYZ(j, pos.getX(j) * (0.7 + Math.random() * 0.5), pos.getY(j) * (0.7 + Math.random() * 0.5), pos.getZ(j) * (0.7 + Math.random() * 0.5));
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.95, flatShading: true, metalness: 0.1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.asteroidMeshes.push(mesh);
    }

    this.bulletMeshes = [];
    for (let i = 0; i < 100; i++) {
      const grp = new THREE.Group();
      // Core bullet
      const coreGeo = new THREE.SphereGeometry(5, 10, 10);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
      const core = new THREE.Mesh(coreGeo, coreMat);
      grp.add(core);
      // Glow halo
      const glowGeo = new THREE.SphereGeometry(12, 10, 10);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xffdd44, transparent: true, opacity: 0.4, depthWrite: false });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      grp.add(glow);
      // Trail
      const trailGeo = new THREE.SphereGeometry(8, 8, 8);
      const trailMat = new THREE.MeshBasicMaterial({ color: 0xffaa22, transparent: true, opacity: 0.3, depthWrite: false });
      const trail = new THREE.Mesh(trailGeo, trailMat);
      trail.position.set(0, 0, 0);
      grp.add(trail);
      // Point light
      const light = new THREE.PointLight(0xffdd44, 1, 80);
      grp.add(light);
      grp.userData = { core, glow, trail, light };
      grp.visible = false;
      this.scene.add(grp);
      this.bulletMeshes.push(grp);
    }

    // Muzzle flash on ship
    const flashGeo = new THREE.SphereGeometry(15, 12, 12);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffff88, transparent: true, opacity: 0, depthWrite: false });
    this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlash.position.set(0, 0, -30);
    this.shipGroup.add(this.muzzleFlash);
    this.muzzleLight = new THREE.PointLight(0xffff88, 0, 200);
    this.muzzleLight.position.set(0, 0, -30);
    this.shipGroup.add(this.muzzleLight);
    this.muzzleTimer = 0;
    this.lastFireCD = 0;

    this.alienMeshes = [];
    for (let i = 0; i < 15; i++) {
      const grp = new THREE.Group();
      const bodyGeo = new THREE.SphereGeometry(20, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff44ff, emissive: 0x441144, roughness: 0.4, metalness: 0.5 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      grp.add(body);
      const eyeGeo = new THREE.SphereGeometry(4, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-7, 5, 16);
      grp.add(eyeL);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(7, 5, 16);
      grp.add(eyeR);
      grp.visible = false;
      grp.userData.body = body;
      this.scene.add(grp);
      this.alienMeshes.push(grp);
    }

    this.planetMeshes = [];
  }

  makeStars(count, radius, size, alpha) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = radius * (0.8 + Math.random() * 0.4);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const tint = Math.random();
      if (tint < 0.7) { col[i * 3] = 1; col[i * 3 + 1] = 1; col[i * 3 + 2] = 1; }
      else if (tint < 0.85) { col[i * 3] = 1; col[i * 3 + 1] = 0.9; col[i * 3 + 2] = 0.6; }
      else { col[i * 3] = 0.6; col[i * 3 + 1] = 0.8; col[i * 3 + 2] = 1; }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, opacity: alpha, sizeAttenuation: true });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
  }

  makeNebula(color, x, y, z, size) {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    this.scene.add(mesh);
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = (w / devicePixelRatio) + 'px';
    this.canvas.style.height = (h / devicePixelRatio) + 'px';
    this.renderer.setSize(w / devicePixelRatio, h / devicePixelRatio, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setupPlanets(planets) {
    for (const m of this.planetMeshes) this.scene.remove(m);
    this.planetMeshes = [];
    for (const p of planets) {
      const grp = new THREE.Group();
      const r = p.radius || 50;
      // Planet body
      const bodyGeo = new THREE.SphereGeometry(r, 48, 48);
      const oceanColor = new THREE.Color(p.colors ? p.colors.ocean : '#1e6091');
      const landColor = new THREE.Color(p.colors ? p.colors.land : '#2d8a4e');
      const mixedColor = oceanColor.clone().lerp(landColor, 0.3);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: mixedColor,
        emissive: oceanColor.clone().multiplyScalar(0.15),
        roughness: 0.8,
        metalness: 0.1,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      grp.add(body);
      // Atmosphere shell
      const atmoGeo = new THREE.SphereGeometry(r * 1.08, 48, 48);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false,
      });
      const atmo = new THREE.Mesh(atmoGeo, atmoMat);
      grp.add(atmo);
      // Cloud shell
      const cloudGeo = new THREE.SphereGeometry(r * 1.02, 48, 48);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false,
      });
      const clouds = new THREE.Mesh(cloudGeo, cloudMat);
      grp.add(clouds);
      grp.userData.body = body;
      grp.userData.clouds = clouds;
      this.scene.add(grp);
      this.planetMeshes.push(grp);
    }
  }

  syncFromView(view) {
    const cx = view.screenW / 2 / devicePixelRatio;
    const cy = view.screenH / 2 / devicePixelRatio;
    const sx = (view.shipX / devicePixelRatio - cx) * 1.5;
    const sy = -(view.shipY / devicePixelRatio - cy) * 1.5;

    this.shipGroup.position.set(sx, 0, -sy);
    this.shipGroup.rotation.y = -view.shipAngle - Math.PI / 2;
    this.shipGroup.rotation.z = Math.sin(Date.now() / 800) * 0.05;

    if (view.shipThrust) {
      this.engineGlow.scale.setScalar(1 + Math.random() * 0.4);
      this.engineGlow.material.color.setHex(0xffaa44);
      this.engineLight.intensity = 3;
    } else {
      this.engineGlow.scale.setScalar(0.5);
      this.engineGlow.material.color.setHex(0xff6622);
      this.engineLight.intensity = 1;
    }

    // Camera follows ship from behind/above
    const cosA = Math.cos(view.shipAngle);
    const sinA = Math.sin(view.shipAngle);
    const camDist = 280;
    const camHeight = 200;
    const targetX = sx - cosA * camDist;
    const targetZ = -sy - sinA * camDist;
    this.camera.position.x += (targetX - this.camera.position.x) * 0.1;
    this.camera.position.y += (camHeight - this.camera.position.y) * 0.1;
    this.camera.position.z += (targetZ - this.camera.position.z) * 0.1;
    this.camera.lookAt(sx + cosA * 100, 0, -sy - sinA * 100);

    // Planets
    for (let i = 0; i < view.planets.length && i < this.planetMeshes.length; i++) {
      const p = view.planets[i];
      const px = (p.spaceX / devicePixelRatio - cx) * 1.5;
      const py = -(p.spaceY / devicePixelRatio - cy) * 1.5;
      const m = this.planetMeshes[i];
      m.position.set(px, 0, -py);
      if (m.userData.body) m.userData.body.rotation.y += 0.002;
      if (m.userData.clouds) m.userData.clouds.rotation.y += 0.0035;
      m.scale.setScalar((p.radius / 50) * 1.2);
    }

    // Asteroids
    for (let i = 0; i < this.asteroidMeshes.length; i++) {
      const a = view.asteroids[i];
      const m = this.asteroidMeshes[i];
      if (a && a.active) {
        m.visible = true;
        m.position.set((a.x / devicePixelRatio - cx) * 1.5, Math.sin(a.x * 0.01) * 30, -(a.y / devicePixelRatio - cy) * 1.5);
        m.rotation.x = a.rot;
        m.rotation.y = a.rot * 0.7;
        m.scale.setScalar(a.r / 25);
      } else {
        m.visible = false;
      }
    }

    // Bullets with glow + trail
    for (let i = 0; i < this.bulletMeshes.length; i++) {
      const b = view.bullets[i];
      const m = this.bulletMeshes[i];
      if (b && b.active) {
        m.visible = true;
        m.position.set((b.x / devicePixelRatio - cx) * 1.5, 4, -(b.y / devicePixelRatio - cy) * 1.5);
        // Orient trail behind based on velocity
        const vAngle = Math.atan2(b.vy, b.vx);
        m.userData.trail.position.set(-Math.cos(vAngle) * 12, 0, Math.sin(vAngle) * 12);
        const c = b.color || '#ffdd44';
        m.userData.core.material.color.setStyle('#ffffff');
        m.userData.glow.material.color.setStyle(c);
        m.userData.trail.material.color.setStyle(c);
        m.userData.light.color.setStyle(c);
        // Pulse
        const p = 0.9 + Math.sin(Date.now() / 50) * 0.2;
        m.userData.glow.scale.setScalar(p);
      } else {
        m.visible = false;
      }
    }

    // Muzzle flash — detect new shot
    if (view.fireCooldown > this.lastFireCD + 0.01) {
      this.muzzleTimer = 0.12;
    }
    this.lastFireCD = view.fireCooldown;
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= 0.016;
      this.muzzleFlash.material.opacity = Math.max(0, this.muzzleTimer * 8);
      this.muzzleFlash.scale.setScalar(1 + Math.random() * 0.5);
      this.muzzleLight.intensity = this.muzzleTimer * 30;
    } else {
      this.muzzleFlash.material.opacity = 0;
      this.muzzleLight.intensity = 0;
    }

    // Aliens
    for (let i = 0; i < this.alienMeshes.length; i++) {
      const a = view.aliens.pool[i];
      const m = this.alienMeshes[i];
      if (a && a.active) {
        m.visible = true;
        m.position.set((a.x / devicePixelRatio - cx) * 1.5, Math.sin(Date.now() / 400 + i) * 15, -(a.y / devicePixelRatio - cy) * 1.5);
        if (m.userData.body) {
          m.userData.body.material.color.set(a.color);
          m.userData.body.material.emissive.set(a.color).multiplyScalar(0.3);
        }
        m.scale.setScalar(a.radius / 18);
        m.rotation.y += 0.02;
      } else {
        m.visible = false;
      }
    }
  }

  render() { this.renderer.render(this.scene, this.camera); }
  show() { this.canvas.style.display = 'block'; }
  hide() { this.canvas.style.display = 'none'; }
}
