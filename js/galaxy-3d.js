import * as THREE from 'three';

export class Galaxy3D {
  constructor(renderer, canvas) {
    this.canvas = canvas;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000005);

    this.camera = new THREE.PerspectiveCamera(60, 1, 1, 5000);
    this.camera.position.set(0, 350, 600);
    this.camera.lookAt(0, 0, 0);

    // Lighting — sun in middle
    const sunLight = new THREE.PointLight(0xffeebb, 4, 5000);
    sunLight.position.set(0, 200, 0);
    this.scene.add(sunLight);
    const ambient = new THREE.AmbientLight(0x444466, 0.4);
    this.scene.add(ambient);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.4);
    fill.position.set(-300, 200, -300);
    this.scene.add(fill);

    // Sun
    const sunGeo = new THREE.SphereGeometry(60, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    this.sun = new THREE.Mesh(sunGeo, sunMat);
    this.sun.position.set(0, 0, 0);
    this.scene.add(this.sun);
    // Sun glow halo
    const sunGlowGeo = new THREE.SphereGeometry(80, 32, 32);
    const sunGlowMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.25, depthWrite: false });
    this.sunGlow = new THREE.Mesh(sunGlowGeo, sunGlowMat);
    this.scene.add(this.sunGlow);
    const sunGlow2Geo = new THREE.SphereGeometry(120, 32, 32);
    const sunGlow2Mat = new THREE.MeshBasicMaterial({ color: 0xff8822, transparent: true, opacity: 0.1, depthWrite: false });
    this.sunGlow2 = new THREE.Mesh(sunGlow2Geo, sunGlow2Mat);
    this.scene.add(this.sunGlow2);

    // Starfield
    this.makeStars(2000, 3000, 4);
    this.makeStars(800, 1800, 6);

    // Nebulas
    this.makeNebula(0x4422aa, -1200, 100, -1500, 1500);
    this.makeNebula(0x224488, 1500, -200, -1300, 1400);
    this.makeNebula(0xaa3366, 0, 400, 1800, 1200);

    this.planetMeshes = [];
    this.orbitRings = [];
  }

  makeStars(count, radius, size) {
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
    const mat = new THREE.PointsMaterial({ size, vertexColors: true, sizeAttenuation: true });
    this.scene.add(new THREE.Points(geo, mat));
  }

  makeNebula(color, x, y, z, size) {
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.lookAt(0, 0, 0);
    this.scene.add(mesh);
  }

  setupPlanets(planets) {
    for (const m of this.planetMeshes) this.scene.remove(m);
    for (const r of this.orbitRings) this.scene.remove(r);
    this.planetMeshes = [];
    this.orbitRings = [];

    for (let i = 0; i < planets.length; i++) {
      const p = planets[i];
      const grp = new THREE.Group();
      const r = 30 + i * 6;
      const bodyGeo = new THREE.SphereGeometry(r, 48, 48);
      const oceanColor = new THREE.Color(p.colors ? p.colors.ocean : '#1e6091');
      const landColor = new THREE.Color(p.colors ? p.colors.land : '#2d8a4e');
      const mixed = oceanColor.clone().lerp(landColor, 0.3);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: mixed, emissive: oceanColor.clone().multiplyScalar(0.1),
        roughness: 0.85, metalness: 0.1,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      grp.add(body);
      // Atmosphere
      const atmoGeo = new THREE.SphereGeometry(r * 1.1, 48, 48);
      const atmoMat = new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false });
      grp.add(new THREE.Mesh(atmoGeo, atmoMat));
      // Clouds
      const cloudGeo = new THREE.SphereGeometry(r * 1.04, 48, 48);
      const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false });
      const clouds = new THREE.Mesh(cloudGeo, cloudMat);
      grp.add(clouds);
      grp.userData = { body, clouds, radius: r, idx: i };
      this.scene.add(grp);
      this.planetMeshes.push(grp);

      // Orbit ring
      const orbitR = 180 + i * 100;
      const ringGeo = new THREE.RingGeometry(orbitR - 1, orbitR + 1, 128);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x4466aa, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);
      this.orbitRings.push(ring);

      grp.userData.orbitR = orbitR;
    }
  }

  resize(w, h) {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  syncFromView(view, screenW, screenH) {
    const t = view.time;
    const sw = screenW / devicePixelRatio;
    const sh = screenH / devicePixelRatio;
    for (let i = 0; i < this.planetMeshes.length && i < view.planets.length; i++) {
      const p = view.planets[i];
      const m = this.planetMeshes[i];
      const orbitR = m.userData.orbitR;
      const speed = 0.15 - i * 0.02;
      const angle = t * speed + i * 1.5;
      m.position.set(Math.cos(angle) * orbitR, Math.sin(t * 0.3 + i) * 10, Math.sin(angle) * orbitR);
      if (m.userData.body) m.userData.body.rotation.y += 0.005;
      if (m.userData.clouds) m.userData.clouds.rotation.y += 0.008;

      // Highlight selected planet
      const isSelected = i === view.selectedPlanet;
      if (isSelected && m.userData.body) {
        m.userData.body.material.emissive.setHex(0x88ff88);
        m.userData.body.material.emissiveIntensity = 0.4;
      } else if (m.userData.body) {
        m.userData.body.material.emissiveIntensity = 0.5;
      }

      // Sync 2D planet position for tap detection (project 3D to screen)
      const v = m.position.clone().project(this.camera);
      p.x = (v.x * 0.5 + 0.5) * sw * devicePixelRatio;
      p.y = (-v.y * 0.5 + 0.5) * sh * devicePixelRatio;
      p.radius = Math.max(20, m.userData.radius * 2 * (1 - v.z) * 1.2) * devicePixelRatio;
    }

    // Slowly orbit camera
    const camR = 700;
    const camA = t * 0.05;
    this.camera.position.x = Math.cos(camA) * camR;
    this.camera.position.z = Math.sin(camA) * camR;
    this.camera.position.y = 350;
    this.camera.lookAt(0, 0, 0);

    // Sun pulses
    const pulse = 1 + Math.sin(t * 2) * 0.05;
    this.sunGlow.scale.setScalar(pulse);
    this.sunGlow2.scale.setScalar(1 + Math.sin(t * 1.3) * 0.08);
  }

  render() { this.renderer.render(this.scene, this.camera); }
  show() { this.canvas.style.display = 'block'; }
  hide() { this.canvas.style.display = 'none'; }
}
