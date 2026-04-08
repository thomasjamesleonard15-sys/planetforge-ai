import { TILE_SIZE, MAP_SIZE } from './constants.js';
import { Camera } from './camera.js';
import { Player } from './player.js';
import { ProjectileSystem } from './projectiles.js';
import { ParticleSystem } from './particles.js';
import { HUD } from './hud.js';
import { renderSkinDetail } from './skins.js';
import { speak as speakV } from './voices.js';

const BAT_WEAPONS = [
  { name: 'Batarang', damage: 15, fireRate: 0.3, bulletSpeed: 700, spread: 0.04, color: '#ffdd44' },
  { name: 'Grapple Gun', damage: 25, fireRate: 0.7, bulletSpeed: 900, spread: 0.01, color: '#aaaaaa' },
  { name: 'Smoke Pellets', damage: 8, fireRate: 0.5, bulletSpeed: 400, spread: 0.4, pellets: 6, color: '#888888' },
  { name: 'Explosive Gel', damage: 40, fireRate: 1.0, bulletSpeed: 350, spread: 0.02, color: '#ff4444' },
];

const VILLAINS = [
  { name: 'Joker Thug', health: 35, speed: 65, damage: 8, radius: 10, color: '#44cc44', reward: 8, hat: 'clown' },
  { name: 'Penguin Goon', health: 55, speed: 50, damage: 12, radius: 12, color: '#334455', reward: 12, hat: 'tophat' },
  { name: 'Riddler Bot', health: 20, speed: 95, damage: 6, radius: 8, color: '#44ff44', reward: 6, hat: 'question' },
  { name: 'Bane Soldier', health: 100, speed: 40, damage: 22, radius: 18, color: '#886644', reward: 20, hat: 'mask' },
  { name: 'Mr. Freeze Drone', health: 65, speed: 55, damage: 15, radius: 14, color: '#88ccff', reward: 15, hat: 'ice' },
];

const BOSSES = [
  { name: 'THE JOKER', health: 600, speed: 60, damage: 30, radius: 28, color: '#22cc44', reward: 100, hat: 'joker', wave: 10, msg: 'THE JOKER HAS ARRIVED!' },
  { name: 'THE PENGUIN', health: 700, speed: 40, damage: 35, radius: 30, color: '#223344', reward: 120, hat: 'tophat', wave: 20, msg: 'THE PENGUIN WADDLES IN!' },
  { name: 'THE RIDDLER', health: 500, speed: 80, damage: 25, radius: 24, color: '#22ff22', reward: 110, hat: 'question', wave: 30, msg: 'THE RIDDLER CHALLENGES YOU!' },
  { name: 'BANE', health: 1000, speed: 45, damage: 45, radius: 35, color: '#775533', reward: 150, hat: 'mask', wave: 40, msg: 'BANE WILL BREAK YOU!' },
  { name: 'MR. FREEZE', health: 800, speed: 50, damage: 40, radius: 30, color: '#66aaee', reward: 130, hat: 'ice', wave: 50, msg: 'MR. FREEZE — CHILL OUT!' },
];

const MAX_ENEMIES = 40;

export class BatmanPlanet {
  constructor() {
    this.camera = new Camera();
    this.player = new Player();
    this.player.skinIndex = 1;
    this.player.health = 150;
    this.player.maxHealth = 150;
    this.projectiles = new ProjectileSystem();
    this.particles = new ParticleSystem();
    this.hud = new HUD();
    this.screenW = 0;
    this.screenH = 0;
    this.gameOver = false;
    this.weaponIndex = 0;
    this.wave = 0;
    this.waveTimer = 3;
    this.spawnQueue = 0;
    this.spawnCooldown = 0;
    this.kills = 0;
    this.score = 0;
    this.done = false;
    this.bossActive = false;
    this.bossAnnounce = '';
    this.bossAnnounceTimer = 0;
    this.finalBoss = false;
    this.soldiers = 0;
    // Combo system
    this.combo = 0;
    this.comboTimer = 0;
    this.comboFlash = 0;
    this.hitStop = 0;
    this.cameraShake = 0;
    this.cameraZoom = 1.6; // closer zoom for third-person feel

    this.enemies = [];
    for (let i = 0; i < MAX_ENEMIES; i++) {
      this.enemies.push({
        active: false, x: 0, y: 0, health: 0, maxHealth: 0,
        speed: 0, damage: 0, radius: 0, color: '', reward: 0,
        attackCooldown: 0, hat: '', name: '',
      });
    }

    this.buildings = [];
    for (let i = 0; i < 30; i++) {
      this.buildings.push({
        x: Math.random() * MAP_SIZE * TILE_SIZE,
        y: Math.random() * MAP_SIZE * TILE_SIZE,
        w: 40 + Math.random() * 60,
        h: 80 + Math.random() * 120,
      });
    }
  }

  get weapon() { return BAT_WEAPONS[this.weaponIndex]; }

  resize(w, h) {
    this.screenW = w;
    this.screenH = h;
    this.camera.resize(w, h);
  }

  handleTouchStart(sx, sy) {
    const btnSize = 56;
    const btnX = this.screenW - btnSize - 16;
    const wpnBtnY = this.screenH - btnSize - 90;
    if (sx >= btnX && sx <= btnX + btnSize && sy >= wpnBtnY && sy <= wpnBtnY + btnSize) {
      this.weaponIndex = (this.weaponIndex + 1) % BAT_WEAPONS.length;
      this.hud.showMessage(this.weapon.name);
      return;
    }
    if (sx < this.screenW * 0.4) {
      this.hud.joystickActive = true;
      this.hud.joystickOriginX = sx;
      this.hud.joystickOriginY = sy;
      this.hud.joystickX = 0;
      this.hud.joystickY = 0;
    } else {
      this.tryShoot(sx, sy);
    }
  }

  handleTouchMove(sx, sy) {
    if (this.hud.joystickActive) {
      const dx = sx - this.hud.joystickOriginX;
      const dy = sy - this.hud.joystickOriginY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const c = Math.min(dist, 60);
        this.hud.joystickX = (dx / dist) * (c / 60);
        this.hud.joystickY = (dy / dist) * (c / 60);
      }
    }
  }

  handleTouchEnd() {
    this.hud.joystickActive = false;
    this.hud.joystickX = 0;
    this.hud.joystickY = 0;
  }

  tryShoot(sx, sy) {
    if (this.player.fireCooldown > 0) return;
    const world = this.camera.screenToWorld(sx, sy);
    const angle = Math.atan2(world.y - this.player.y, world.x - this.player.x);
    this.projectiles.fire(this.player.x, this.player.y, angle, this.weapon, true);
    this.player.fireCooldown = this.weapon.fireRate;
    this.particles.emit(this.player.x, this.player.y, 3, {
      color: this.weapon.color, speed: 100, life: 0.15, radius: 2,
    });
  }

  tryCombo() {
    // Freeflow-style melee: find closest enemy in range, dash-punch them
    const range = 100;
    let closest = null;
    let closestDist = range * range;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = e.x - this.player.x, dy = e.y - this.player.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < closestDist) { closest = e; closestDist = dSq; }
    }
    if (!closest) return;
    // Dash toward target
    const dx = closest.x - this.player.x, dy = closest.y - this.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const pushDist = Math.max(0, dist - this.player.radius - closest.radius - 2);
    this.player.x += (dx / dist) * pushDist * 0.85;
    this.player.y += (dy / dist) * pushDist * 0.85;
    // Damage with combo scaling
    const baseDmg = 40;
    const comboMul = 1 + this.combo * 0.1;
    closest.health -= baseDmg * comboMul;
    // Knockback
    closest.x += (dx / dist) * 12;
    closest.y += (dy / dist) * 12;
    // Combo
    this.combo++;
    this.comboTimer = 2.5;
    this.comboFlash = 0.5;
    this.hitStop = 0.08;
    this.cameraShake = Math.max(this.cameraShake, 6);
    this.player.punchAnim = 1;
    // Particles
    this.particles.emit(closest.x, closest.y, 12, { color: '#ffdd44', speed: 180, life: 0.4, radius: 3 });
    this.particles.emit(closest.x, closest.y, 8, { color: '#ffffff', speed: 120, life: 0.3, radius: 2 });
    if (closest.health <= 0) {
      closest.active = false;
      this.kills++;
      this.score += closest.reward * (1 + Math.floor(this.combo / 5));
      this.particles.emit(closest.x, closest.y, 20, { color: closest.color, speed: 200, life: 0.5, radius: 4 });
    }
  }

  spawnEnemy(t, scaling) {
    const e = this.enemies.find(e => !e.active);
    if (!e) return;
    const mapPx = MAP_SIZE * TILE_SIZE;
    const side = Math.random() * 4 | 0;
    if (side === 0) { e.x = Math.random() * mapPx; e.y = -20; }
    else if (side === 1) { e.x = mapPx + 20; e.y = Math.random() * mapPx; }
    else if (side === 2) { e.x = Math.random() * mapPx; e.y = mapPx + 20; }
    else { e.x = -20; e.y = Math.random() * mapPx; }
    e.active = true;
    e.health = t.health + scaling;
    e.maxHealth = e.health;
    e.speed = t.speed;
    e.damage = t.damage;
    e.radius = t.radius;
    e.color = t.color;
    e.reward = t.reward;
    e.hat = t.hat;
    e.name = t.name;
    e.attackCooldown = 0;
  }

  spawnVillain() {
    const maxType = Math.min(VILLAINS.length - 1, Math.floor(this.wave / 3));
    const t = VILLAINS[Math.floor(Math.random() * (maxType + 1))];
    this.spawnEnemy(t, this.wave * 6);
  }

  spawnBoss(boss) {
    this.spawnEnemy(boss, this.wave * 5);
    this.bossActive = true;
    this.bossAnnounce = boss.msg;
    this.bossAnnounceTimer = 3;
    const villainProfile = boss.name.includes('JOKER') ? 'joker' : 'villain';
    speakV(boss.msg, villainProfile);
  }

  spawnAllBosses() {
    this.finalBoss = true;
    this.bossActive = true;
    this.bossAnnounce = 'ALL VILLAINS ATTACK!';
    this.bossAnnounceTimer = 4;
    for (const boss of BOSSES) {
      this.spawnEnemy(boss, this.wave * 5);
    }
    speakV("They're all here! Every last one of them!", 'batman');
  }

  activeEnemyCount() {
    let c = 0;
    for (const e of this.enemies) if (e.active) c++;
    return c;
  }

  update(dt) {
    if (this.gameOver) return;
    // Hit stop — briefly freeze time on impact
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt *= 0.15;
    }
    this.player.update(dt, this.hud.joystickX, this.hud.joystickY);
    this.camera.follow(this.player.x, this.player.y);
    this.camera.update(dt);
    this.projectiles.update(dt);
    this.particles.update(dt);
    this.hud.update(dt);
    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.comboFlash > 0) this.comboFlash -= dt * 2;
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 20);

    if (this.bossAnnounceTimer > 0) this.bossAnnounceTimer -= dt;
    if (this.bossActive && this.activeEnemyCount() === 0) {
      this.bossActive = false;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 50);
      this.hud.showMessage('Boss defeated! +50 HP restored!');
      if (this.finalBoss) {
        this.hud.showMessage('GOTHAM IS SAVED FOREVER!');
        this.done = true;
        return;
      }
    }

    this.waveTimer -= dt;
    if (!this.bossActive && this.waveTimer <= 0 && this.spawnQueue <= 0 && this.activeEnemyCount() === 0) {
      this.wave++;
      if (this.wave % 5 === 0) {
        this.soldiers++;
        this.hud.showMessage(`+1 Soldier! (${this.soldiers} total)`);
      }
      const boss = BOSSES.find(b => b.wave === this.wave);
      if (this.wave > 50 && !this.finalBoss) {
        this.spawnAllBosses();
        this.spawnQueue = 0;
      } else if (boss) {
        this.spawnBoss(boss);
        this.spawnQueue = 5 + Math.floor(this.wave / 5);
        this.waveTimer = 999;
      } else {
        this.spawnQueue = 6 + this.wave * 3;
        this.waveTimer = 12 + this.wave;
        this.hud.showMessage(`Wave ${this.wave} — Gotham needs you!`);
      }
      this.spawnCooldown = 0;
    }

    if (this.spawnQueue > 0 && !this.bossActive) {
      this.spawnCooldown -= dt;
      if (this.spawnCooldown <= 0) {
        this.spawnVillain();
        this.spawnQueue--;
        this.spawnCooldown = 0.35;
      }
    }

    for (const e of this.enemies) {
      if (!e.active) continue;
      const dx = this.player.x - e.x, dy = this.player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > e.radius + this.player.radius) {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      } else {
        e.attackCooldown -= dt;
        if (e.attackCooldown <= 0) {
          this.player.takeDamage(e.damage);
          e.attackCooldown = 1;
          this.particles.emit(this.player.x, this.player.y, 5, {
            color: '#ff4444', speed: 80, life: 0.3, radius: 3,
          });
        }
      }
    }

    for (const p of this.projectiles.pool) {
      if (!p.active || !p.friendly) continue;
      for (const e of this.enemies) {
        if (!e.active) continue;
        const dx = p.x - e.x, dy = p.y - e.y;
        if (dx * dx + dy * dy < (p.radius + e.radius) ** 2) {
          e.health -= p.damage;
          p.active = false;
          this.particles.emit(p.x, p.y, 4, { color: e.color, speed: 60, life: 0.2, radius: 2 });
          if (e.health <= 0) {
            e.active = false;
            this.kills++;
            this.score += e.reward;
            this.particles.emit(e.x, e.y, 15, { color: e.color, speed: 120, life: 0.5, radius: 4 });
            if (e.hat === 'joker') {
              this.hud.showMessage('THE JOKER IS DOWN! +' + e.reward + ' pts');
            }
          }
          break;
        }
      }
    }

    if (this.player.health <= 0) {
      this.gameOver = true;
      this.done = true;
    }

  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;
    const t = Date.now() / 1000;
    // Camera shake
    const shakeX = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake * 2 : 0;
    const shakeY = this.cameraShake > 0 ? (Math.random() - 0.5) * this.cameraShake * 2 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Deep night sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#050508');
    sky.addColorStop(0.4, '#0a0a18');
    sky.addColorStop(0.7, '#18101a');
    sky.addColorStop(1, '#0a0510');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Full moon with cloudy halo
    const moonX = w * 0.75, moonY = h * 0.15;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 20, moonX, moonY, 140);
    moonGlow.addColorStop(0, 'rgba(230, 220, 180, 0.35)');
    moonGlow.addColorStop(0.5, 'rgba(180, 170, 140, 0.1)');
    moonGlow.addColorStop(1, 'rgba(100, 100, 120, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 140, 0, Math.PI * 2);
    ctx.fill();
    // Moon body
    const moonBody = ctx.createRadialGradient(moonX - 10, moonY - 10, 5, moonX, moonY, 35);
    moonBody.addColorStop(0, '#fff5d8');
    moonBody.addColorStop(0.6, '#d8d0b0');
    moonBody.addColorStop(1, '#8a8270');
    ctx.fillStyle = moonBody;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 35, 0, Math.PI * 2);
    ctx.fill();
    // Moon craters
    ctx.fillStyle = 'rgba(100, 95, 70, 0.4)';
    ctx.beginPath();
    ctx.arc(moonX - 8, moonY - 5, 6, 0, Math.PI * 2);
    ctx.arc(moonX + 12, moonY + 8, 4, 0, Math.PI * 2);
    ctx.arc(moonX - 2, moonY + 15, 3, 0, Math.PI * 2);
    ctx.fill();

    // Distant city silhouette layer 1 (farthest)
    this.renderCitySkyline(ctx, w, h, h * 0.55, 0.4, '#0a0612', 1.8);
    // Mid layer
    this.renderCitySkyline(ctx, w, h, h * 0.62, 0.65, '#110818', 2.3);
    // Close layer
    this.renderCitySkyline(ctx, w, h, h * 0.7, 0.9, '#18101e', 2.7);

    // Fog layer
    const fog = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.85);
    fog.addColorStop(0, 'rgba(80, 70, 100, 0)');
    fog.addColorStop(0.5, 'rgba(80, 70, 100, 0.2)');
    fog.addColorStop(1, 'rgba(50, 40, 70, 0.4)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, h * 0.55, w, h * 0.3);

    // Rooftop floor — wet asphalt
    const floorY = h * 0.7;
    const floorG = ctx.createLinearGradient(0, floorY, 0, h);
    floorG.addColorStop(0, '#10101a');
    floorG.addColorStop(0.3, '#181825');
    floorG.addColorStop(1, '#08080f');
    ctx.fillStyle = floorG;
    ctx.fillRect(0, floorY, w, h - floorY);

    // Floor tile grid lines for perspective
    ctx.strokeStyle = 'rgba(60, 60, 90, 0.3)';
    ctx.lineWidth = 1;
    const cx = w / 2;
    // Horizontal lines receding
    for (let i = 1; i < 20; i++) {
      const y = floorY + (i * i) * 3;
      if (y > h) break;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Vanishing-point perspective lines
    for (let i = -10; i <= 10; i++) {
      const endX = cx + i * w * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx, floorY);
      ctx.lineTo(endX, h);
      ctx.stroke();
    }

    // Wet puddle reflections of the moon
    const puddleX = w * 0.2, puddleY = h * 0.85;
    const puddleG = ctx.createRadialGradient(puddleX, puddleY, 5, puddleX, puddleY, 40);
    puddleG.addColorStop(0, 'rgba(230, 220, 180, 0.25)');
    puddleG.addColorStop(1, 'rgba(230, 220, 180, 0)');
    ctx.fillStyle = puddleG;
    ctx.beginPath();
    ctx.ellipse(puddleX, puddleY, 40, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const puddle2X = w * 0.6, puddle2Y = h * 0.92;
    const puddle2G = ctx.createRadialGradient(puddle2X, puddle2Y, 5, puddle2X, puddle2Y, 35);
    puddle2G.addColorStop(0, 'rgba(180, 160, 140, 0.2)');
    puddle2G.addColorStop(1, 'rgba(180, 160, 140, 0)');
    ctx.fillStyle = puddle2G;
    ctx.beginPath();
    ctx.ellipse(puddle2X, puddle2Y, 35, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rain splashes on the floor
    for (let i = 0; i < 15; i++) {
      const sx = (i * 71 + t * 300) % w;
      const sy = floorY + ((i * 37 + t * 500) % (h - floorY));
      const age = ((t * 2 + i) % 1);
      const alpha = (1 - age) * 0.4;
      ctx.strokeStyle = `rgba(180, 200, 230, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, 3 + age * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rain behind the playfield
    ctx.strokeStyle = 'rgba(180, 200, 230, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 80; i++) {
      const rx = (i * 73 + t * 400) % w;
      const ry = (i * 131 + t * 700) % h;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry - 10);
      ctx.stroke();
    }

    // Player-scale buildings
    for (const b of this.buildings) {
      if (!this.camera.isVisible(b.x, b.y, 200)) continue;
      const s = this.camera.worldToScreen(b.x, b.y);
      // Shadow/side
      ctx.fillStyle = '#080812';
      ctx.fillRect(s.x - 2, s.y - b.h, b.w + 4, b.h);
      // Main body gradient
      const bg = ctx.createLinearGradient(s.x, s.y - b.h, s.x + b.w, s.y - b.h);
      bg.addColorStop(0, '#1a1a28');
      bg.addColorStop(0.5, '#222236');
      bg.addColorStop(1, '#101018');
      ctx.fillStyle = bg;
      ctx.fillRect(s.x, s.y - b.h, b.w, b.h);
      ctx.strokeStyle = '#0a0a14';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x, s.y - b.h, b.w, b.h);
      // Windows with flicker
      for (let wy = 0; wy < b.h - 15; wy += 20) {
        for (let wx = 8; wx < b.w - 8; wx += 16) {
          const lit = Math.sin(b.x * 3 + wx + wy) > 0.3;
          const flicker = lit && Math.sin(t * 3 + wx + wy) > -0.8;
          ctx.fillStyle = flicker ? '#ffcc55' : '#0a0a14';
          ctx.fillRect(s.x + wx, s.y - b.h + wy + 8, 8, 10);
          if (flicker) {
            ctx.fillStyle = 'rgba(255, 200, 80, 0.15)';
            ctx.fillRect(s.x + wx - 2, s.y - b.h + wy + 6, 12, 14);
          }
        }
      }
      // Rooftop antenna (random)
      if ((b.x | 0) % 3 === 0) {
        ctx.strokeStyle = '#0a0a14';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x + b.w / 2, s.y - b.h);
        ctx.lineTo(s.x + b.w / 2, s.y - b.h - 12);
        ctx.stroke();
        ctx.fillStyle = '#ff2222';
        ctx.beginPath();
        ctx.arc(s.x + b.w / 2, s.y - b.h - 12, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.renderEnemies(ctx);

    // Batman with flowing cape (replace player render)
    this.renderBatman(ctx);

    this.projectiles.render(ctx, this.camera);
    this.particles.render(ctx, this.camera);

    // Lightning flash occasionally
    const flash = Math.sin(t * 0.3) > 0.995 ? 1 : 0;
    if (flash > 0) {
      ctx.fillStyle = `rgba(200, 220, 255, ${flash * 0.4})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Heavy vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.9);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();

    this.renderBatHUD(ctx, w, h);
    this.hud.render(ctx, w, h, { food: 0, metal: this.score, energy: 0, wave: this.wave, score: this.score }, this.player);

    // Combo counter — big and cinematic
    if (this.combo > 0) {
      const scale = 1 + this.comboFlash * 0.5;
      ctx.save();
      ctx.translate(w - 140, h / 2);
      ctx.scale(scale, scale);
      ctx.font = 'bold 72px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillText(this.combo, 2, 2);
      const grd = ctx.createLinearGradient(0, -40, 0, 40);
      grd.addColorStop(0, '#ffdd44');
      grd.addColorStop(1, '#ff6622');
      ctx.fillStyle = grd;
      ctx.fillText(this.combo, 0, 0);
      ctx.font = 'bold 20px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#ffaa44';
      ctx.fillText('HIT COMBO', 0, 30);
      // Combo timer bar
      ctx.fillStyle = 'rgba(255,170,68,0.8)';
      ctx.fillRect(-60, 42, 120 * (this.comboTimer / 2.5), 4);
      ctx.restore();
    }

    if (this.bossAnnounceTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.bossAnnounceTimer);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, h * 0.35, w, h * 0.15);
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4444';
      ctx.fillText(this.bossAnnounce, w / 2, h * 0.44);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  renderCitySkyline(ctx, w, h, baseY, parallax, color, scale) {
    const t = Date.now() / 10000;
    const offset = (this.camera.x * parallax * 0.05) % 200;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    // Procedural building heights
    let x = -offset;
    let idx = 0;
    while (x < w + 40) {
      const hash = Math.sin(idx * 73.7) * 10000;
      const buildingH = (20 + (hash - Math.floor(hash)) * 60) * scale;
      const buildingW = (15 + ((Math.cos(idx * 41.3) + 1) * 20)) * scale;
      const variant = idx % 4;
      ctx.lineTo(x, baseY);
      ctx.lineTo(x, baseY - buildingH);
      // Roof decoration
      if (variant === 0) {
        // Flat with antenna
        ctx.lineTo(x + buildingW * 0.3, baseY - buildingH);
        ctx.lineTo(x + buildingW * 0.3, baseY - buildingH - 8 * scale);
        ctx.lineTo(x + buildingW * 0.4, baseY - buildingH - 8 * scale);
        ctx.lineTo(x + buildingW * 0.4, baseY - buildingH);
        ctx.lineTo(x + buildingW, baseY - buildingH);
      } else if (variant === 1) {
        // Stepped
        ctx.lineTo(x + buildingW * 0.2, baseY - buildingH);
        ctx.lineTo(x + buildingW * 0.2, baseY - buildingH - 10 * scale);
        ctx.lineTo(x + buildingW * 0.8, baseY - buildingH - 10 * scale);
        ctx.lineTo(x + buildingW * 0.8, baseY - buildingH);
        ctx.lineTo(x + buildingW, baseY - buildingH);
      } else if (variant === 2) {
        // Peaked roof
        ctx.lineTo(x + buildingW / 2, baseY - buildingH - 12 * scale);
        ctx.lineTo(x + buildingW, baseY - buildingH);
      } else {
        // Plain
        ctx.lineTo(x + buildingW, baseY - buildingH);
      }
      ctx.lineTo(x + buildingW, baseY);
      x += buildingW;
      idx++;
    }
    ctx.lineTo(w, baseY);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Sparse lit windows in the silhouette
    if (parallax > 0.5) {
      ctx.fillStyle = 'rgba(255, 200, 80, 0.4)';
      x = -offset;
      idx = 0;
      while (x < w) {
        const hash = Math.sin(idx * 73.7) * 10000;
        const buildingH = (20 + (hash - Math.floor(hash)) * 60) * scale;
        const buildingW = (15 + ((Math.cos(idx * 41.3) + 1) * 20)) * scale;
        if (idx % 3 === 0) {
          for (let wy = 10; wy < buildingH - 10; wy += 14) {
            for (let wx = 4; wx < buildingW - 4; wx += 10) {
              if (Math.sin(idx * 7 + wy * 3 + wx) > 0.4) {
                ctx.fillRect(x + wx, baseY - buildingH + wy, 3, 4);
              }
            }
          }
        }
        x += buildingW;
        idx++;
      }
    }
  }

  renderBatman(ctx) {
    const s = this.camera.worldToScreen(this.player.x, this.player.y);
    const blink = this.player.invulnTimer > 0 && Math.sin(this.player.invulnTimer * 30) > 0;
    if (blink) return;
    const t = Date.now() / 150;
    const walk = Math.sin(t) * 2;
    const r = this.player.radius;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.ellipse(s.x + 6, s.y + r + 22, r * 1.7, r * 0.4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Flowing cape behind — animated with wind
    const capeTime = Date.now() / 400;
    ctx.save();
    ctx.translate(s.x, s.y + 2);
    ctx.fillStyle = '#0a0a14';
    ctx.beginPath();
    ctx.moveTo(-r * 0.9, 0);
    // Left side waves
    for (let i = 0; i <= 5; i++) {
      const ti = i / 5;
      const px = -r * 1.5 + Math.sin(capeTime + i * 0.8) * 4 - ti * r * 0.3;
      const py = ti * r * 2.2 + Math.cos(capeTime * 1.3 + i) * 2;
      ctx.lineTo(px, py);
    }
    // Bottom jagged edge
    for (let i = 0; i < 6; i++) {
      const px = -r * 1.2 + i * r * 0.5 + Math.sin(capeTime + i) * 3;
      const py = r * 2.2 + (i % 2) * 6 + Math.sin(capeTime * 2 + i) * 2;
      ctx.lineTo(px, py);
    }
    // Right side
    for (let i = 5; i >= 0; i--) {
      const ti = i / 5;
      const px = r * 1.5 - Math.sin(capeTime + i * 0.8) * 4 + ti * r * 0.3;
      const py = ti * r * 2.2 + Math.cos(capeTime * 1.3 + i) * 2;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(r * 0.9, 0);
    ctx.closePath();
    ctx.fill();
    // Cape highlight
    ctx.strokeStyle = '#222236';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Inner cape shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.5);
    ctx.lineTo(r * 0.5, r * 0.5);
    ctx.lineTo(0, r * 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.fillStyle = '#111';
    ctx.fillRect(s.x - 6, s.y + r + 4, 4, 12 + walk);
    ctx.fillRect(s.x + 2, s.y + r + 4, 4, 12 - walk);
    ctx.fillStyle = '#222';
    ctx.fillRect(s.x - 7, s.y + r + 14 + walk, 6, 4);
    ctx.fillRect(s.x + 1, s.y + r + 14 - walk, 6, 4);

    // Torso — dark armor
    const torsoY = s.y + r - 2;
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.9, torsoY);
    ctx.quadraticCurveTo(s.x - r * 1.05, torsoY + 7, s.x - r, torsoY + 14);
    ctx.lineTo(s.x + r, torsoY + 14);
    ctx.quadraticCurveTo(s.x + r * 1.05, torsoY + 7, s.x + r * 0.9, torsoY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Bat emblem on chest (original simple silhouette — pointed oval with wings)
    ctx.fillStyle = '#ffdd22';
    ctx.beginPath();
    ctx.ellipse(s.x, torsoY + 7, r * 0.5, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.4, torsoY + 7);
    ctx.lineTo(s.x - r * 0.15, torsoY + 3);
    ctx.lineTo(s.x - r * 0.1, torsoY + 6);
    ctx.lineTo(s.x, torsoY + 4);
    ctx.lineTo(s.x + r * 0.1, torsoY + 6);
    ctx.lineTo(s.x + r * 0.15, torsoY + 3);
    ctx.lineTo(s.x + r * 0.4, torsoY + 7);
    ctx.lineTo(s.x + r * 0.3, torsoY + 10);
    ctx.lineTo(s.x, torsoY + 9);
    ctx.lineTo(s.x - r * 0.3, torsoY + 10);
    ctx.closePath();
    ctx.fill();
    // Belt
    ctx.fillStyle = '#ffdd22';
    ctx.fillRect(s.x - r * 0.9, torsoY + 11, r * 1.8, 3);

    // Arms
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath();
    ctx.arc(s.x - r * 0.95 - 2, torsoY + 4 - walk * 0.5, 4.5, 0, Math.PI * 2);
    ctx.arc(s.x + r * 0.95 + 2, torsoY + 4 + walk * 0.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.stroke();
    // Gauntlet fins
    ctx.fillStyle = '#0a0a14';
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.95 - 6, torsoY + 8 - walk * 0.5);
    ctx.lineTo(s.x - r * 0.95 - 10, torsoY + 10 - walk * 0.5);
    ctx.lineTo(s.x - r * 0.95 - 4, torsoY + 12 - walk * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s.x + r * 0.95 + 6, torsoY + 8 + walk * 0.5);
    ctx.lineTo(s.x + r * 0.95 + 10, torsoY + 10 + walk * 0.5);
    ctx.lineTo(s.x + r * 0.95 + 4, torsoY + 12 + walk * 0.5);
    ctx.closePath();
    ctx.fill();

    // Head — cowl with ears
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    const cowlG = ctx.createRadialGradient(s.x - r * 0.4, s.y - r * 0.5, r * 0.05, s.x, s.y, r * 1.1);
    cowlG.addColorStop(0, '#2a2a38');
    cowlG.addColorStop(0.5, '#15151e');
    cowlG.addColorStop(1, '#050508');
    ctx.fillStyle = cowlG;
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Pointed ears
    ctx.fillStyle = '#0a0a12';
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.6, s.y - r * 0.6);
    ctx.lineTo(s.x - r * 0.4, s.y - r * 1.4);
    ctx.lineTo(s.x - r * 0.2, s.y - r * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s.x + r * 0.6, s.y - r * 0.6);
    ctx.lineTo(s.x + r * 0.4, s.y - r * 1.4);
    ctx.lineTo(s.x + r * 0.2, s.y - r * 0.7);
    ctx.closePath();
    ctx.fill();
    // White eye slits
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(s.x - r * 0.3, s.y - 2, r * 0.18, r * 0.08, -0.2, 0, Math.PI * 2);
    ctx.ellipse(s.x + r * 0.3, s.y - 2, r * 0.18, r * 0.08, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Mouth line
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.3, s.y + r * 0.3);
    ctx.lineTo(s.x + r * 0.3, s.y + r * 0.3);
    ctx.stroke();

    // Health bar
    const barW = 32;
    const hpPct = this.player.health / this.player.maxHealth;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(s.x - barW / 2 - 1, s.y - r - 12, barW + 2, 7);
    ctx.fillStyle = hpPct > 0.5 ? '#44ff66' : hpPct > 0.25 ? '#ffaa22' : '#ff4444';
    ctx.fillRect(s.x - barW / 2, s.y - r - 11, barW * hpPct, 5);
  }

  renderEnemies(ctx) {
    for (const e of this.enemies) {
      if (!e.active) continue;
      if (!this.camera.isVisible(e.x, e.y, 40)) continue;
      const s = this.camera.worldToScreen(e.x, e.y);

      ctx.beginPath();
      ctx.arc(s.x, s.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.fill();

      if (e.hat === 'joker' || e.hat === 'clown') {
        ctx.beginPath();
        ctx.arc(s.x, s.y - e.radius - 3, e.radius * 0.5, Math.PI, 0);
        ctx.fillStyle = '#22cc44';
        ctx.fill();
        ctx.strokeStyle = '#ff2222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y + 3, e.radius * 0.4, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else if (e.hat === 'tophat') {
        ctx.fillStyle = '#222';
        ctx.fillRect(s.x - 6, s.y - e.radius - 12, 12, 12);
        ctx.fillRect(s.x - 9, s.y - e.radius - 2, 18, 4);
      } else if (e.hat === 'question') {
        ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#44ff44';
        ctx.fillText('?', s.x, s.y + 4);
      } else if (e.hat === 'mask') {
        ctx.fillStyle = '#443322';
        ctx.fillRect(s.x - e.radius * 0.6, s.y - 4, e.radius * 1.2, 8);
      } else if (e.hat === 'ice') {
        ctx.fillStyle = 'rgba(136, 204, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(s.x, s.y, e.radius + 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x - e.radius * 0.3, s.y - 2, 2.5, 0, Math.PI * 2);
      ctx.arc(s.x + e.radius * 0.3, s.y - 2, 2.5, 0, Math.PI * 2);
      ctx.fill();

      const barW = e.radius * 2, barH = 3;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(s.x - barW / 2, s.y - e.radius - 8, barW, barH);
      const hpPct = e.health / e.maxHealth;
      ctx.fillStyle = hpPct > 0.3 ? '#44ff66' : '#ff4444';
      ctx.fillRect(s.x - barW / 2, s.y - e.radius - 8, barW * hpPct, barH);

      ctx.font = '8px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(e.name, s.x, s.y + e.radius + 10);
    }
    ctx.textAlign = 'left';
  }

  renderBatHUD(ctx, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, 44);
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(`Wave: ${this.wave}`, 16, 28);
    ctx.fillStyle = '#44ff88';
    ctx.fillText(`Kills: ${this.kills}`, 120, 28);
    ctx.fillStyle = '#ffaa44';
    ctx.fillText(`Score: ${this.score}`, 220, 28);
    ctx.fillStyle = '#88aaff';
    ctx.fillText(`Soldiers: ${this.soldiers}`, 360, 28);
    ctx.fillStyle = this.weapon.color;
    ctx.fillText(this.weapon.name, w - 140, 28);

    const btnSize = 56;
    const btnX = w - btnSize - 16;
    const wpnBtnY = h - btnSize - 90;
    ctx.fillStyle = '#222';
    ctx.strokeStyle = this.weapon.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, wpnBtnY, btnSize, btnSize, 10);
    ctx.fill();
    ctx.stroke();
    ctx.font = '24px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('🦇', btnX + btnSize / 2, wpnBtnY + btnSize / 2 + 8);
    ctx.textAlign = 'left';

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4444';
      ctx.fillText('BATMAN HAS FALLEN', w / 2, h / 2 - 20);
      ctx.font = '18px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aab';
      ctx.fillText(`Score: ${this.score}  Kills: ${this.kills}`, w / 2, h / 2 + 15);
      ctx.fillText('Tap to return to Gotham', w / 2, h / 2 + 45);
      ctx.textAlign = 'left';
    }
  }
}
