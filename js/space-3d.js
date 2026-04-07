import * as THREE from 'three';

export class Space3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(devicePixelRatio);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);
    this.scene.fog = new THREE.FogExp2(0x050510, 0.0008);

    this.camera = new THREE.PerspectiveCamera(60, 1, 1, 5000);
    this.camera.position.set(0, 200, 400);
    this.camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(500, 800, 300);
    this.scene.add(sun);
    const fill = new THREE.PointLight(0x6688ff, 0.5, 2000);
    fill.position.set(-300, 100, -200);
    this.scene.add(fill);

    // Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 1500 + Math.random() * 1500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: true });
    this.stars = new THREE.Points(starGeo, starMat);
    this.scene.add(this.stars);

    // Ship
    this.shipGroup = new THREE.Group();
    const shipGeo = new THREE.ConeGeometry(15, 40, 8);
    shipGeo.rotateX(Math.PI / 2);
    const shipMat = new THREE.MeshPhongMaterial({ color: 0x66ccff, emissive: 0x224466, shininess: 80 });
    this.shipMesh = new THREE.Mesh(shipGeo, shipMat);
    this.shipGroup.add(this.shipMesh);
    const cockpitGeo = new THREE.SphereGeometry(6, 12, 12);
    const cockpitMat = new THREE.MeshPhongMaterial({ color: 0xaaeeff, emissive: 0x4488aa });
    const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
    cockpit.position.set(0, 0, -8);
    this.shipGroup.add(cockpit);
    // Wings
    const wingGeo = new THREE.BoxGeometry(40, 2, 12);
    const wing = new THREE.Mesh(wingGeo, shipMat);
    wing.position.set(0, 0, 8);
    this.shipGroup.add(wing);
    // Engine glow
    const engineGeo = new THREE.SphereGeometry(8, 8, 8);
    const engineMat = new THREE.MeshBasicMaterial({ color: 0xff8833, transparent: true, opacity: 0.8 });
    this.engineGlow = new THREE.Mesh(engineGeo, engineMat);
    this.engineGlow.position.set(0, 0, 22);
    this.shipGroup.add(this.engineGlow);
    this.scene.add(this.shipGroup);

    // Asteroid pool
    this.asteroidMeshes = [];
    for (let i = 0; i < 40; i++) {
      const r = 15 + Math.random() * 25;
      const geo = new THREE.IcosahedronGeometry(r, 0);
      // Distort vertices
      const pos = geo.attributes.position;
      for (let j = 0; j < pos.count; j++) {
        pos.setXYZ(j, pos.getX(j) * (0.7 + Math.random() * 0.5), pos.getY(j) * (0.7 + Math.random() * 0.5), pos.getZ(j) * (0.7 + Math.random() * 0.5));
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshPhongMaterial({ color: 0x665544, flatShading: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.asteroidMeshes.push(mesh);
    }

    // Planets
    this.planetMeshes = [];

    // Bullet pool
    this.bulletMeshes = [];
    for (let i = 0; i < 100; i++) {
      const geo = new THREE.SphereGeometry(3, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.bulletMeshes.push(mesh);
    }

    // Alien pool
    this.alienMeshes = [];
    for (let i = 0; i < 15; i++) {
      const r = 18;
      const geo = new THREE.SphereGeometry(r, 12, 12);
      const mat = new THREE.MeshPhongMaterial({ color: 0xff44ff, emissive: 0x441144 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.alienMeshes.push(mesh);
    }
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
      const geo = new THREE.SphereGeometry(p.radius || 50, 32, 32);
      const oceanColor = new THREE.Color(p.colors ? p.colors.ocean : '#1e6091');
      const mat = new THREE.MeshPhongMaterial({
        color: oceanColor,
        emissive: oceanColor.clone().multiplyScalar(0.2),
        shininess: 50,
      });
      const mesh = new THREE.Mesh(geo, mat);
      // Atmosphere glow
      const atmoGeo = new THREE.SphereGeometry((p.radius || 50) * 1.15, 32, 32);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: 0x66aaff, transparent: true, opacity: 0.15, side: THREE.BackSide,
      });
      const atmo = new THREE.Mesh(atmoGeo, atmoMat);
      mesh.add(atmo);
      this.scene.add(mesh);
      this.planetMeshes.push(mesh);
    }
  }

  syncFromView(view) {
    // Convert 2D screen coords to 3D world coords
    // Map screen-space to world-space: x stays, y becomes -z (up=back)
    const cx = view.screenW / 2 / devicePixelRatio;
    const cy = view.screenH / 2 / devicePixelRatio;
    const sx = (view.shipX / devicePixelRatio - cx);
    const sy = -(view.shipY / devicePixelRatio - cy);

    this.shipGroup.position.set(sx, 0, -sy);
    this.shipGroup.rotation.y = -view.shipAngle - Math.PI / 2;
    this.engineGlow.visible = view.shipThrust;
    if (view.shipThrust) {
      this.engineGlow.scale.setScalar(0.8 + Math.random() * 0.5);
    }

    // Camera follows ship
    this.camera.position.x = sx;
    this.camera.position.y = 220;
    this.camera.position.z = -sy + 250;
    this.camera.lookAt(sx, 0, -sy - 50);

    // Planets
    for (let i = 0; i < view.planets.length && i < this.planetMeshes.length; i++) {
      const p = view.planets[i];
      const px = (p.spaceX / devicePixelRatio - cx);
      const py = -(p.spaceY / devicePixelRatio - cy);
      const m = this.planetMeshes[i];
      m.position.set(px, 0, -py);
      m.rotation.y += 0.003;
      m.scale.setScalar(p.radius / 50);
    }

    // Asteroids
    for (let i = 0; i < this.asteroidMeshes.length; i++) {
      const a = view.asteroids[i];
      const m = this.asteroidMeshes[i];
      if (a && a.active) {
        m.visible = true;
        m.position.set((a.x / devicePixelRatio - cx), (Math.sin(a.x * 0.01) * 20), -(a.y / devicePixelRatio - cy));
        m.rotation.x = a.rot;
        m.rotation.y = a.rot * 0.7;
        m.scale.setScalar(a.r / 25);
      } else {
        m.visible = false;
      }
    }

    // Bullets
    for (let i = 0; i < this.bulletMeshes.length; i++) {
      const b = view.bullets[i];
      const m = this.bulletMeshes[i];
      if (b && b.active) {
        m.visible = true;
        m.position.set((b.x / devicePixelRatio - cx), 5, -(b.y / devicePixelRatio - cy));
        m.material.color.set(b.color);
      } else {
        m.visible = false;
      }
    }

    // Aliens
    for (let i = 0; i < this.alienMeshes.length; i++) {
      const a = view.aliens.pool[i];
      const m = this.alienMeshes[i];
      if (a && a.active) {
        m.visible = true;
        m.position.set((a.x / devicePixelRatio - cx), 0, -(a.y / devicePixelRatio - cy));
        m.material.color.set(a.color);
        m.material.emissive.set(a.color).multiplyScalar(0.3);
        m.scale.setScalar(a.radius / 18);
      } else {
        m.visible = false;
      }
    }

    // Rotate stars slowly
    this.stars.rotation.y += 0.0001;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  show() { this.canvas.style.display = 'block'; }
  hide() { this.canvas.style.display = 'none'; }
}
