import { WEAPONS } from './constants.js';
import { Planet } from './planet.js';
import { renderSpaceWorld, renderShip, renderSpaceHUD } from './space-renderer.js';
import { createAsteroidPool, createBulletPool, createParticlePool, spawnAsteroid, spawnChildAsteroid, emitParticles } from './space-pools.js';

const SHIP_SPEED = 280;
const SHIP_DRAG = 0.98;
const ASTEROID_SPAWN_RATE = 1.2;
const LAND_RANGE = 1.6;

export class SpaceView {
  constructor(galaxyPlanets) {
    this.shipX = 0; this.shipY = 0; this.shipVX = 0; this.shipVY = 0;
    this.shipAngle = -Math.PI / 2; this.shipRadius = 18; this.shipHealth = 100;
    this.shipThrust = false; this.screenW = 0; this.screenH = 0;
    this.score = 0; this.metal = 0; this.weaponIndex = 0;
    this.fireCooldown = 0; this.gameOver = false;
    this.landTarget = -1; this.wantLand = false;
    this.planets = []; this.initPlanets(galaxyPlanets);
    this.asteroids = createAsteroidPool(40);
    this.bullets = createBulletPool(100);
    this.particles = createParticlePool(300);
    this.stars = []; this.spawnTimer = 0;
    this.joystickActive = false;
    this.joystickOX = 0; this.joystickOY = 0; this.joyX = 0; this.joyY = 0;
  }

  initPlanets(galaxyPlanets) {
    const colorSets = [
      { ocean: '#1e6091', land: '#2d8a4e', ice: '#c8e6f0' },
      { ocean: '#8b2252', land: '#cc6633', ice: '#ffccaa' },
      { ocean: '#2a1a5e', land: '#6633aa', ice: '#ccaaff' },
      { ocean: '#1a4a3a', land: '#33aa66', ice: '#aaffcc' },
      { ocean: '#5a3a1a', land: '#aa8833', ice: '#ffddaa' },
    ];
    for (let i = 0; i < galaxyPlanets.length; i++) {
      const c = colorSets[i % colorSets.length];
      const p = new Planet(0, 0, 50);
      p.colors = { ...c, atmosphere: 'rgba(100, 180, 255, 0.12)' };
      p.name = galaxyPlanets[i].name;
      p.rotationSpeed = 0.1 + Math.random() * 0.15;
      p.spaceX = 0; p.spaceY = 0; p.galaxyIndex = i;
      this.planets.push(p);
    }
  }

  resize(w, h) {
    this.screenW = w; this.screenH = h;
    this.shipX = w / 2; this.shipY = h / 2;
    this.stars = [];
    for (let i = 0; i < 150; i++) {
      this.stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.5 + 0.3, a: Math.random() * 0.6 + 0.2 });
    }
    this.placePlanets();
  }

  placePlanets() {
    const m = 120;
    for (const p of this.planets) {
      p.radius = 40 + this.planets.indexOf(p) * 8;
      p.spaceX = m + Math.random() * (this.screenW - m * 2);
      p.spaceY = m + Math.random() * (this.screenH - m * 2);
      p.x = p.spaceX; p.y = p.spaceY;
    }
  }

  get weapon() { return WEAPONS[this.weaponIndex]; }

  handleTouchStart(sx, sy) {
    const btnS = 56;
    if (sx >= this.screenW - btnS - 16 && sx <= this.screenW - 16 && sy >= this.screenH - btnS - 90 && sy <= this.screenH - 34) {
      this.weaponIndex = (this.weaponIndex + 1) % WEAPONS.length; return;
    }
    if (this.landTarget >= 0) {
      const lbx = this.screenW / 2 - 80, lby = this.screenH - 70;
      if (sx >= lbx && sx <= lbx + 160 && sy >= lby && sy <= lby + 44) { this.wantLand = true; return; }
    }
    if (sx < this.screenW * 0.4) {
      this.joystickActive = true; this.joystickOX = sx; this.joystickOY = sy;
      this.joyX = 0; this.joyY = 0;
    } else { this.shoot(sx, sy); }
  }

  handleTouchMove(sx, sy) {
    if (!this.joystickActive) return;
    const dx = sx - this.joystickOX, dy = sy - this.joystickOY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) { const c = Math.min(dist, 60); this.joyX = (dx / dist) * (c / 60); this.joyY = (dy / dist) * (c / 60); }
  }

  handleTouchEnd() { this.joystickActive = false; this.joyX = 0; this.joyY = 0; }

  shoot(sx, sy) {
    if (this.fireCooldown > 0) return;
    const angle = Math.atan2(sy - this.shipY, sx - this.shipX);
    const w = this.weapon;
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const b = this.bullets.find(b => !b.active);
      if (!b) break;
      const a = angle + (Math.random() - 0.5) * w.spread;
      b.active = true; b.x = this.shipX + Math.cos(a) * 22; b.y = this.shipY + Math.sin(a) * 22;
      b.vx = Math.cos(a) * w.bulletSpeed + this.shipVX * 0.3;
      b.vy = Math.sin(a) * w.bulletSpeed + this.shipVY * 0.3;
      b.life = 1.8; b.color = w.color; b.r = pellets > 1 ? 2 : 3; b.damage = w.damage;
    }
    this.fireCooldown = w.fireRate;
    emitParticles(this.particles, this.shipX, this.shipY, 3, angle, 0.3, w.color, 120, 2);
  }

  update(dt, keyMoveX, keyMoveY) {
    if (this.gameOver) return;
    let mx = this.joyX + keyMoveX, my = this.joyY + keyMoveY;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) { mx /= len; my /= len; }
    if (len > 0.1) {
      this.shipVX += mx * SHIP_SPEED * dt; this.shipVY += my * SHIP_SPEED * dt;
      this.shipAngle = Math.atan2(my, mx); this.shipThrust = true;
    } else { this.shipThrust = false; }

    this.shipVX *= SHIP_DRAG; this.shipVY *= SHIP_DRAG;
    this.shipX += this.shipVX * dt; this.shipY += this.shipVY * dt;
    if (this.shipX < -30) this.shipX = this.screenW + 30;
    if (this.shipX > this.screenW + 30) this.shipX = -30;
    if (this.shipY < -30) this.shipY = this.screenH + 30;
    if (this.shipY > this.screenH + 30) this.shipY = -30;
    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { spawnAsteroid(this.asteroids, this.screenW, this.screenH); this.spawnTimer = ASTEROID_SPAWN_RATE; }

    for (const a of this.asteroids) {
      if (!a.active) continue;
      a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.rotSpeed * dt;
      if (a.x < -80 || a.x > this.screenW + 80 || a.y < -80 || a.y > this.screenH + 80) a.active = false;
    }
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > this.screenW + 20 || b.y < -20 || b.y > this.screenH + 20) b.active = false;
    }
    for (const p of this.particles) {
      if (!p.active) continue;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
    if (this.shipThrust && Math.random() > 0.5) {
      const ba = this.shipAngle + Math.PI;
      emitParticles(this.particles, this.shipX + Math.cos(ba) * 16, this.shipY + Math.sin(ba) * 16, 1, ba, 0.3, '#ff8833', 80, 3);
    }

    this.landTarget = -1;
    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i]; p.update(dt);
      const dx = this.shipX - p.spaceX, dy = this.shipY - p.spaceY;
      if (Math.sqrt(dx * dx + dy * dy) < p.radius * LAND_RANGE) this.landTarget = i;
    }
    this.checkCollisions();
  }

  checkCollisions() {
    for (const b of this.bullets) {
      if (!b.active) continue;
      for (const a of this.asteroids) {
        if (!a.active) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx * dx + dy * dy < (b.r + a.r) ** 2) {
          b.active = false; a.hp -= (b.damage || 10) / 5;
          emitParticles(this.particles, b.x, b.y, 4, Math.atan2(dy, dx), 0.25, '#ffaa44', 100, 2);
          if (a.hp <= 0) {
            a.active = false; this.score += Math.ceil(a.r); this.metal += Math.ceil(a.r / 5);
            emitParticles(this.particles, a.x, a.y, 12, 0, 0.5, '#aaa', 150, 4);
            if (a.r > 22) { for (let i = 0; i < 2; i++) spawnChildAsteroid(this.asteroids, a); }
          }
          break;
        }
      }
    }
    for (const a of this.asteroids) {
      if (!a.active) continue;
      const dx = this.shipX - a.x, dy = this.shipY - a.y;
      if (dx * dx + dy * dy < (this.shipRadius + a.r) ** 2) {
        this.shipHealth -= 15; a.active = false;
        emitParticles(this.particles, a.x, a.y, 10, 0, 0.4, '#ff4444', 120, 3);
        const pa = Math.atan2(dy, dx);
        this.shipVX += Math.cos(pa) * 150; this.shipVY += Math.sin(pa) * 150;
        if (this.shipHealth <= 0) { this.shipHealth = 0; this.gameOver = true; }
      }
    }
  }

  render(ctx) {
    renderSpaceWorld(ctx, this);
    renderShip(ctx, this);
    renderSpaceHUD(ctx, this);
  }
}
