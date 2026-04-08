import { WEAPONS } from './constants.js';
import { Planet } from './planet.js';
import { renderSpaceWorld, renderShip, renderSpaceHUD } from './space-renderer.js';
import { renderSpaceFPS } from './space-fps-renderer.js';
import { createAsteroidPool, createBulletPool, createParticlePool, spawnAsteroid, spawnChildAsteroid, emitParticles } from './space-pools.js';
import { SpaceAliens } from './space-aliens.js';
import { ShipUpgrades } from './ship-upgrades.js';

const SHIP_SPEED = 280;
const SHIP_DRAG = 0.98;
const ASTEROID_SPAWN_RATE = 1.2;
const LAND_RANGE = 1.6;
const BOARD_RANGE = 80;

export class SpaceView {
  constructor(galaxyPlanets) {
    this.shipX = 0; this.shipY = 0; this.shipVX = 0; this.shipVY = 0;
    this.shipAngle = -Math.PI / 2; this.shipRadius = 18; this.shipHealth = 100;
    this.shipThrust = false; this.screenW = 0; this.screenH = 0;
    this.score = 0; this.metal = 0; this.weaponIndex = 0;
    this.fireCooldown = 0; this.gameOver = false;
    this.fuel = 100; this.maxFuel = 100; this.outOfFuel = false;
    this.landTarget = -1; this.wantLand = false;
    this.portal = { x: 0, y: 0, radius: 45, rot: 0 };
    this.nearPortal = false; this.wantWarp = false;
    this.boardTarget = -1; this.hijacked = null; this.hijackTimer = 0;
    this.planets = []; this.initPlanets(galaxyPlanets);
    this.asteroids = createAsteroidPool(40);
    this.bullets = createBulletPool(100);
    this.enemyBullets = createBulletPool(80);
    this.particles = createParticlePool(300);
    this.aliens = new SpaceAliens();
    this.upgrades = new ShipUpgrades();
    this.stars = []; this.spawnTimer = 0;
    this.joystickActive = false;
    this.joystickOX = 0; this.joystickOY = 0; this.joyX = 0; this.joyY = 0;
    this.blackHole = null;
    this.blackHoleCheck = 0;
    this.blackHoleEvent = false;
    this.totalSpaceTime = 0;
    this.fpsMode = false;
    this.fpsBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.eva = false;
    this.evaX = 0; this.evaY = 0;
    this.evaVX = 0; this.evaVY = 0;
    this.evaRadius = 10;
    this.parkedShipX = 0; this.parkedShipY = 0;
    this.miningTarget = -1; this.miningTimer = 0;
    this.evaBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.boardShipRect = { x: 0, y: 0, w: 0, h: 0 };
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
    // Place portal in top-right area away from planets
    this.portal.x = this.screenW - 100;
    this.portal.y = 120;
  }

  get weapon() { return WEAPONS[this.weaponIndex]; }

  handleTouchStart(sx, sy) {
    // Warp button when near portal
    if (this.nearPortal) {
      const wbx = this.screenW / 2 - 80, wby = this.screenH - 130;
      if (sx >= wbx && sx <= wbx + 160 && sy >= wby && sy <= wby + 44) {
        this.wantWarp = true; return;
      }
    }
    const btnS = 56;
    // Upgrade menu button (above weapon switch)
    const upgBtnX = this.screenW - btnS - 16;
    const upgBtnY = this.screenH - btnS * 2 - 102;
    if (sx >= upgBtnX && sx <= upgBtnX + btnS && sy >= upgBtnY && sy <= upgBtnY + btnS) {
      this.upgrades.showMenu = !this.upgrades.showMenu; return;
    }
    // Upgrade menu interactions
    if (this.upgrades.showMenu) {
      const idx = this.upgrades.handleTap(sx, sy, this.screenW, this.screenH, this.metal);
      if (idx >= 0) {
        const keys = ['speed', 'damage', 'maxHp', 'fireRate'];
        const cost = this.upgrades.getCost(keys[idx]);
        this.metal -= cost;
        this.upgrades.upgrade(keys[idx]);
        // Apply max HP upgrade immediately
        if (keys[idx] === 'maxHp') {
          this.shipHealth = Math.min(this.upgrades.getMaxHp(), this.shipHealth + 20);
        }
      }
      return;
    }
    // Weapon switch
    if (sx >= this.screenW - btnS - 16 && sx <= this.screenW - 16 && sy >= this.screenH - btnS - 90 && sy <= this.screenH - 34) {
      this.weaponIndex = (this.weaponIndex + 1) % WEAPONS.length; return;
    }
    if (this.landTarget >= 0) {
      const lbx = this.screenW / 2 - 80, lby = this.screenH - 70;
      if (sx >= lbx && sx <= lbx + 160 && sy >= lby && sy <= lby + 44) { this.wantLand = true; return; }
    }
    if (this.boardTarget >= 0) {
      const bby = this.landTarget >= 0 ? this.screenH - 130 : this.screenH - 70;
      const bbx = this.screenW / 2 - 80;
      if (sx >= bbx && sx <= bbx + 160 && sy >= bby && sy <= bby + 44) { this.boardAlien(); return; }
    }
    // FPS toggle button
    const fb = this.fpsBtnRect;
    if (fb.w > 0 && sx >= fb.x && sx <= fb.x + fb.w && sy >= fb.y && sy <= fb.y + fb.h) {
      this.fpsMode = !this.fpsMode;
      return;
    }
    // EVA button
    const eb = this.evaBtnRect;
    if (eb.w > 0 && sx >= eb.x && sx <= eb.x + eb.w && sy >= eb.y && sy <= eb.y + eb.h) {
      if (!this.eva) {
        this.eva = true;
        this.parkedShipX = this.shipX; this.parkedShipY = this.shipY;
        this.evaX = this.shipX; this.evaY = this.shipY;
        this.evaVX = this.shipVX * 0.3; this.evaVY = this.shipVY * 0.3;
      }
      return;
    }
    // Board ship button
    const bs = this.boardShipRect;
    if (bs.w > 0 && sx >= bs.x && sx <= bs.x + bs.w && sy >= bs.y && sy <= bs.y + bs.h) {
      this.eva = false;
      this.shipX = this.parkedShipX; this.shipY = this.parkedShipY;
      this.shipVX = 0; this.shipVY = 0;
      return;
    }
    if (sx < this.screenW * 0.4) {
      this.joystickActive = true; this.joystickOX = sx; this.joystickOY = sy;
      this.joyX = 0; this.joyY = 0;
    } else if (!this.eva) { this.shoot(sx, sy); }
  }

  handleTouchMove(sx, sy) {
    if (!this.joystickActive) return;
    const dx = sx - this.joystickOX, dy = sy - this.joystickOY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) { const c = Math.min(dist, 60); this.joyX = (dx / dist) * (c / 60); this.joyY = (dy / dist) * (c / 60); }
  }

  handleTouchEnd() { this.joystickActive = false; this.joyX = 0; this.joyY = 0; }

  fpsLook(dx, dy) {
    if (!this.fpsMode) return;
    this.shipAngle += dx * 0.005;
  }

  boardAlien() {
    const a = this.aliens.pool[this.boardTarget];
    if (!a || !a.active) return;
    // Hijack the alien ship
    this.hijacked = { color: a.color, radius: a.radius, type: a.type };
    this.hijackTimer = 15;
    this.shipHealth = Math.min(this.upgrades.getMaxHp() + 50, this.shipHealth + 50);
    this.shipRadius = a.radius;
    this.score += a.reward * 3;
    this.metal += a.reward;
    // Kill the alien
    a.active = false;
    this.aliens.kills++;
    emitParticles(this.particles, a.x, a.y, 20, 0, 0.8, '#ffffff', 200, 5);
    emitParticles(this.particles, a.x, a.y, 15, 0, 0.5, a.color, 150, 4);
    // Snap ship to alien position
    this.shipX = a.x; this.shipY = a.y;
    this.shipVX = a.vx; this.shipVY = a.vy;
    this.boardTarget = -1;
  }

  shoot(sx, sy) {
    if (this.fireCooldown > 0) return;
    const angle = this.fpsMode ? this.shipAngle : Math.atan2(sy - this.shipY, sx - this.shipX);
    const w = this.weapon;
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const b = this.bullets.find(b => !b.active);
      if (!b) break;
      const a = angle + (Math.random() - 0.5) * w.spread;
      b.active = true; b.x = this.shipX + Math.cos(a) * 22; b.y = this.shipY + Math.sin(a) * 22;
      b.vx = Math.cos(a) * w.bulletSpeed + this.shipVX * 0.3;
      b.vy = Math.sin(a) * w.bulletSpeed + this.shipVY * 0.3;
      b.life = 1.8; b.color = w.color; b.r = pellets > 1 ? 2 : 3;
      b.damage = w.damage * this.upgrades.getDamageMultiplier();
    }
    this.fireCooldown = w.fireRate * this.upgrades.getFireRateMultiplier();
    emitParticles(this.particles, this.shipX, this.shipY, 3, angle, 0.3, w.color, 120, 2);
  }

  update(dt, keyMoveX, keyMoveY) {
    if (this.gameOver) return;
    let mx = this.joyX + keyMoveX, my = this.joyY + keyMoveY;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) { mx /= len; my /= len; }

    if (this.eva) {
      this.updateEVA(dt, mx, my, len);
    } else if (this.fpsMode) {
      // FPS ship: joystick X = turn, joystick Y = thrust
      this.shipAngle += mx * 2 * dt;
      const speed = SHIP_SPEED * this.upgrades.getSpeedMultiplier();
      if (this.fuel <= 0) {
        this.shipThrust = false;
        this.outOfFuel = true;
      } else if (my < -0.1) {
        // Forward thrust along ship angle
        this.shipVX += Math.cos(this.shipAngle) * speed * (-my) * dt;
        this.shipVY += Math.sin(this.shipAngle) * speed * (-my) * dt;
        this.shipThrust = true;
        this.fuel -= dt * 0.8;
        if (this.fuel < 0) this.fuel = 0;
      } else if (my > 0.1) {
        // Reverse thrust
        this.shipVX -= Math.cos(this.shipAngle) * speed * 0.4 * my * dt;
        this.shipVY -= Math.sin(this.shipAngle) * speed * 0.4 * my * dt;
        this.shipThrust = true;
        this.fuel -= dt * 0.5;
        if (this.fuel < 0) this.fuel = 0;
      } else { this.shipThrust = false; }
    } else {
      const speed = SHIP_SPEED * this.upgrades.getSpeedMultiplier();
      if (this.fuel <= 0) {
        this.shipThrust = false;
        this.outOfFuel = true;
      } else if (len > 0.1) {
        this.shipVX += mx * speed * dt; this.shipVY += my * speed * dt;
        this.shipAngle = Math.atan2(my, mx); this.shipThrust = true;
        this.fuel -= dt * 0.8;
        if (this.fuel < 0) this.fuel = 0;
      } else { this.shipThrust = false; }
    }

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

    // Update aliens — only pass bullet pool if any are aggro
    const anyAggro = this.aliens.pool.some(a => a.active && a.aggro);
    this.aliens.update(dt, this.shipX, this.shipY, this.screenW, this.screenH, anyAggro ? this.enemyBullets : [], this.particles);

    // Update enemy bullets (deactivate all if no aggro aliens)
    for (const b of this.enemyBullets) {
      if (!b.active) continue;
      if (!anyAggro) { b.active = false; continue; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > this.screenW + 20 || b.y < -20 || b.y > this.screenH + 20) b.active = false;
    }

    // Hijack timer
    if (this.hijackTimer > 0) {
      this.hijackTimer -= dt;
      if (this.hijackTimer <= 0) {
        this.hijacked = null;
        this.shipRadius = 18;
      }
    }

    // Check for boardable aliens (damaged and nearby)
    this.boardTarget = -1;
    for (let i = 0; i < this.aliens.pool.length; i++) {
      const a = this.aliens.pool[i];
      if (!a.active) continue;
      const dx = this.shipX - a.x, dy = this.shipY - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < a.radius + BOARD_RANGE && a.hp < a.maxHp * 0.75) {
        this.boardTarget = i;
        break;
      }
    }

    this.landTarget = -1;
    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i]; p.update(dt);
      const dx = this.shipX - p.spaceX, dy = this.shipY - p.spaceY;
      if (Math.sqrt(dx * dx + dy * dy) < p.radius * LAND_RANGE) this.landTarget = i;
    }

    // Portal
    this.portal.rot += dt * 2;
    const pdx = this.shipX - this.portal.x, pdy = this.shipY - this.portal.y;
    this.nearPortal = Math.sqrt(pdx * pdx + pdy * pdy) < this.portal.radius * 2;

    // Black hole 1% event — only after 20 minutes
    this.totalSpaceTime += dt;
    if (!this.blackHole && !this.blackHoleEvent && this.totalSpaceTime >= 1200) {
      this.blackHoleCheck += dt;
      if (this.blackHoleCheck >= 1) {
        this.blackHoleCheck = 0;
        if (Math.random() < 0.01) {
          this.blackHole = {
            x: this.screenW * (0.2 + Math.random() * 0.6),
            y: this.screenH * (0.2 + Math.random() * 0.6),
            radius: 0, maxRadius: 80, rot: 0, timer: 0, phase: 'grow',
          };
        }
      }
    }
    if (this.blackHole) {
      const bh = this.blackHole;
      bh.timer += dt;
      bh.rot += dt * 4;
      if (bh.phase === 'grow') {
        bh.radius = Math.min(bh.maxRadius, bh.radius + dt * 60);
        if (bh.radius >= bh.maxRadius) bh.phase = 'pull';
      }
      if (bh.phase === 'pull') {
        const dx = bh.x - this.shipX, dy = bh.y - this.shipY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 5) {
          const pull = 400 / Math.max(dist, 50);
          this.shipVX += (dx / dist) * pull * dt * 60;
          this.shipVY += (dy / dist) * pull * dt * 60;
        }
        if (dist < bh.radius * 0.5) {
          bh.phase = 'swallow';
          bh.timer = 0;
        }
        emitParticles(this.particles, bh.x + (Math.random() - 0.5) * bh.radius, bh.y + (Math.random() - 0.5) * bh.radius, 1, 0, 0.4, '#8844ff', 60, 3);
      }
      if (bh.phase === 'swallow') {
        if (bh.timer > 1) {
          this.blackHoleEvent = true;
          this.blackHole = null;
        }
      }
    }

    this.checkCollisions();
  }

  updateEVA(dt, mx, my, len) {
    const EVA_SPEED = 150;
    if (len > 0.1) {
      this.evaVX += mx * EVA_SPEED * dt;
      this.evaVY += my * EVA_SPEED * dt;
    }
    this.evaVX *= 0.96; this.evaVY *= 0.96;
    this.evaX += this.evaVX * dt;
    this.evaY += this.evaVY * dt;
    if (this.evaX < -10) this.evaX = this.screenW + 10;
    if (this.evaX > this.screenW + 10) this.evaX = -10;
    if (this.evaY < -10) this.evaY = this.screenH + 10;
    if (this.evaY > this.screenH + 10) this.evaY = -10;

    // Mining — find nearest asteroid
    this.miningTarget = -1;
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      if (!a.active) continue;
      const dx = this.evaX - a.x, dy = this.evaY - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < a.r + 30) {
        this.miningTarget = i;
        this.miningTimer += dt;
        if (this.miningTimer >= 1.5) {
          this.miningTimer = 0;
          const reward = Math.ceil(a.r);
          this.metal += reward;
          this.score += Math.ceil(reward / 2);
          a.hp -= 3;
          emitParticles(this.particles, a.x + (Math.random() - 0.5) * a.r, a.y + (Math.random() - 0.5) * a.r, 6, 0, 0.4, '#ffaa44', 80, 3);
          if (a.hp <= 0) {
            a.active = false;
            this.metal += Math.ceil(a.r * 2);
            emitParticles(this.particles, a.x, a.y, 15, 0, 0.6, '#aaa', 150, 4);
          }
        }
        break;
      }
    }
    if (this.miningTarget < 0) this.miningTimer = 0;
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
            a.active = false; this.score += Math.ceil(a.r); this.metal += Math.ceil(a.r / 2);
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
    // Player bullets vs aliens
    for (const b of this.bullets) {
      if (!b.active) continue;
      for (const a of this.aliens.pool) {
        if (!a.active) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (dx * dx + dy * dy < (b.r + a.radius) ** 2) {
          b.active = false; a.hp -= b.damage; a.aggro = true;
          emitParticles(this.particles, b.x, b.y, 4, Math.atan2(dy, dx), 0.25, a.color, 100, 2);
          if (a.hp <= 0) {
            a.active = false; this.score += a.reward; this.metal += Math.ceil(a.reward / 2);
            this.aliens.kills++;
            this.aliens.aggroAll();
            emitParticles(this.particles, a.x, a.y, 18, 0, 0.6, a.color, 160, 5);
          }
          break;
        }
      }
    }
    // Enemy bullets vs ship
    for (const b of this.enemyBullets) {
      if (!b.active) continue;
      const dx = b.x - this.shipX, dy = b.y - this.shipY;
      if (dx * dx + dy * dy < (b.r + this.shipRadius) ** 2) {
        b.active = false;
        this.shipHealth -= b.damage;
        emitParticles(this.particles, b.x, b.y, 6, Math.atan2(dy, dx), 0.3, '#ff2244', 80, 3);
        if (this.shipHealth <= 0) { this.shipHealth = 0; this.gameOver = true; }
      }
    }
    // Alien body contact vs ship (only aggro aliens deal contact damage)
    for (const a of this.aliens.pool) {
      if (!a.active || !a.aggro) continue;
      const dx = this.shipX - a.x, dy = this.shipY - a.y;
      if (dx * dx + dy * dy < (this.shipRadius + a.radius) ** 2) {
        this.shipHealth -= 10;
        emitParticles(this.particles, a.x, a.y, 6, 0, 0.3, a.color, 80, 3);
        const pa = Math.atan2(dy, dx);
        this.shipVX += Math.cos(pa) * 120; this.shipVY += Math.sin(pa) * 120;
        a.vx -= Math.cos(pa) * 120; a.vy -= Math.sin(pa) * 120;
        if (this.shipHealth <= 0) { this.shipHealth = 0; this.gameOver = true; }
      }
    }
  }

  render(ctx) {
    if (this.fpsMode) {
      renderSpaceFPS(ctx, this);
    } else {
      renderSpaceWorld(ctx, this);
      renderShip(ctx, this);
    }
    renderSpaceHUD(ctx, this);

    // FPS toggle button (top-right area, below back/mute)
    const fbW = 80, fbH = 36;
    const fbX = this.screenW - fbW - 16, fbY = 60;
    this.fpsBtnRect = { x: fbX, y: fbY, w: fbW, h: fbH };
    ctx.fillStyle = this.fpsMode ? 'rgba(60, 100, 60, 0.9)' : 'rgba(20, 20, 40, 0.85)';
    ctx.beginPath();
    ctx.roundRect(fbX, fbY, fbW, fbH, 8);
    ctx.fill();
    ctx.strokeStyle = this.fpsMode ? '#88ff88' : 'rgba(100, 120, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.fpsMode ? '#ccffcc' : '#aab';
    ctx.fillText('🚀 FPS', fbX + fbW / 2, fbY + fbH / 2 + 5);
    ctx.textAlign = 'left';
  }
}
