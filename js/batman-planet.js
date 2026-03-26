import { TILE_SIZE, MAP_SIZE } from './constants.js';
import { Camera } from './camera.js';
import { Player } from './player.js';
import { ProjectileSystem } from './projectiles.js';
import { ParticleSystem } from './particles.js';
import { HUD } from './hud.js';
import { renderSkinDetail } from './skins.js';

const BAT_WEAPONS = [
  { name: 'Batarang', damage: 15, fireRate: 0.3, bulletSpeed: 700, spread: 0.04, color: '#ffdd44' },
  { name: 'Grapple Gun', damage: 25, fireRate: 0.7, bulletSpeed: 900, spread: 0.01, color: '#aaaaaa' },
  { name: 'Smoke Pellets', damage: 8, fireRate: 0.5, bulletSpeed: 400, spread: 0.4, pellets: 6, color: '#888888' },
  { name: 'Explosive Gel', damage: 40, fireRate: 1.0, bulletSpeed: 350, spread: 0.02, color: '#ff4444' },
];

const VILLAINS = [
  { name: 'Joker Thug', health: 25, speed: 55, damage: 6, radius: 10, color: '#44cc44', reward: 8, hat: 'clown' },
  { name: 'Penguin Goon', health: 40, speed: 40, damage: 10, radius: 12, color: '#334455', reward: 12, hat: 'tophat' },
  { name: 'Riddler Bot', health: 15, speed: 80, damage: 4, radius: 8, color: '#44ff44', reward: 6, hat: 'question' },
  { name: 'Bane Soldier', health: 80, speed: 30, damage: 18, radius: 18, color: '#886644', reward: 20, hat: 'mask' },
  { name: 'Mr. Freeze Drone', health: 50, speed: 45, damage: 12, radius: 14, color: '#88ccff', reward: 15, hat: 'ice' },
];

const BOSSES = [
  { name: 'THE JOKER', health: 500, speed: 55, damage: 25, radius: 28, color: '#22cc44', reward: 100, hat: 'joker', wave: 20, msg: 'THE JOKER HAS ARRIVED!' },
  { name: 'THE PENGUIN', health: 600, speed: 35, damage: 30, radius: 30, color: '#223344', reward: 120, hat: 'tophat', wave: 40, msg: 'THE PENGUIN WADDLES IN!' },
  { name: 'THE RIDDLER', health: 400, speed: 75, damage: 20, radius: 24, color: '#22ff22', reward: 110, hat: 'question', wave: 60, msg: 'THE RIDDLER CHALLENGES YOU!' },
  { name: 'BANE', health: 900, speed: 40, damage: 40, radius: 35, color: '#775533', reward: 150, hat: 'mask', wave: 80, msg: 'BANE WILL BREAK YOU!' },
  { name: 'MR. FREEZE', health: 700, speed: 45, damage: 35, radius: 30, color: '#66aaee', reward: 130, hat: 'ice', wave: 100, msg: 'MR. FREEZE — CHILL OUT!' },
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
    const maxType = Math.min(VILLAINS.length - 1, Math.floor(this.wave / 4));
    const t = VILLAINS[Math.floor(Math.random() * (maxType + 1))];
    this.spawnEnemy(t, this.wave * 3);
  }

  spawnBoss(boss) {
    this.spawnEnemy(boss, this.wave * 5);
    this.bossActive = true;
    this.bossAnnounce = boss.msg;
    this.bossAnnounceTimer = 3;
    try {
      const u = new SpeechSynthesisUtterance(boss.msg);
      u.pitch = 0.3; u.rate = 0.6;
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  spawnAllBosses() {
    this.finalBoss = true;
    this.bossActive = true;
    this.bossAnnounce = 'ALL VILLAINS ATTACK!';
    this.bossAnnounceTimer = 4;
    for (const boss of BOSSES) {
      this.spawnEnemy(boss, this.wave * 5);
    }
    try {
      const u = new SpeechSynthesisUtterance("They're all here! Every last one of them!");
      u.pitch = 0.2; u.rate = 0.6;
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  activeEnemyCount() {
    let c = 0;
    for (const e of this.enemies) if (e.active) c++;
    return c;
  }

  update(dt) {
    if (this.gameOver) return;
    this.player.update(dt, this.hud.joystickX, this.hud.joystickY);
    this.camera.follow(this.player.x, this.player.y);
    this.camera.update(dt);
    this.projectiles.update(dt);
    this.particles.update(dt);
    this.hud.update(dt);

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
      const boss = BOSSES.find(b => b.wave === this.wave);
      if (this.wave > 100 && !this.finalBoss) {
        this.spawnAllBosses();
        this.spawnQueue = 0;
      } else if (boss) {
        this.spawnBoss(boss);
        this.spawnQueue = 3 + Math.floor(this.wave / 10);
        this.waveTimer = 999;
      } else {
        this.spawnQueue = 4 + this.wave * 2;
        this.waveTimer = 15 + this.wave;
        this.hud.showMessage(`Wave ${this.wave} — Gotham needs you!`);
      }
      this.spawnCooldown = 0;
    }

    if (this.spawnQueue > 0 && !this.bossActive) {
      this.spawnCooldown -= dt;
      if (this.spawnCooldown <= 0) {
        this.spawnVillain();
        this.spawnQueue--;
        this.spawnCooldown = 0.5;
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
    ctx.fillStyle = '#0a0a15';
    ctx.fillRect(0, 0, w, h);

    for (const b of this.buildings) {
      if (!this.camera.isVisible(b.x, b.y, 200)) continue;
      const s = this.camera.worldToScreen(b.x, b.y);
      ctx.fillStyle = '#151520';
      ctx.fillRect(s.x, s.y - b.h, b.w, b.h);
      ctx.strokeStyle = '#222233';
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x, s.y - b.h, b.w, b.h);
      for (let wy = 0; wy < b.h - 15; wy += 20) {
        for (let wx = 8; wx < b.w - 8; wx += 16) {
          const lit = Math.sin(b.x * 3 + wx + wy) > 0.3;
          ctx.fillStyle = lit ? '#ffdd66' : '#111118';
          ctx.fillRect(s.x + wx, s.y - b.h + wy + 8, 8, 10);
        }
      }
    }

    this.renderEnemies(ctx);
    this.player.render(ctx, this.camera);
    this.projectiles.render(ctx, this.camera);
    this.particles.render(ctx, this.camera);

    this.renderBatHUD(ctx, w, h);
    this.hud.render(ctx, w, h, { food: 0, metal: this.score, energy: 0, wave: this.wave, score: this.score }, this.player);

    if (this.bossAnnounceTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.bossAnnounceTimer);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, h * 0.35, w, h * 0.15);
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4444';
      ctx.fillText(this.bossAnnounce, w / 2, h * 0.44);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
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
