import { TILE_SIZE, MAP_SIZE } from './constants.js';
import { Camera } from './camera.js';
import { Player } from './player.js';
import { ProjectileSystem } from './projectiles.js';
import { ParticleSystem } from './particles.js';
import { HUD } from './hud.js';
import { multiplayer } from './multiplayer.js';

const COOP_WEAPONS = [
  { name: 'Laser', damage: 12, fireRate: 0.2, bulletSpeed: 800, spread: 0.03, color: '#44ddff' },
  { name: 'Cannon', damage: 35, fireRate: 0.8, bulletSpeed: 500, spread: 0.02, color: '#ff8844' },
  { name: 'Spread', damage: 8, fireRate: 0.4, bulletSpeed: 600, spread: 0.25, pellets: 4, color: '#ffdd44' },
];

const MEGA_BOSSES = [
  {
    name: 'TITAN WORM', health: 2000, speed: 30, radius: 50,
    color: '#ff4488', damage: 20, reward: 200,
    msg: 'THE TITAN WORM EMERGES!', attack: 'charge',
  },
  {
    name: 'VOID KING', health: 3000, speed: 45, radius: 45,
    color: '#8844ff', damage: 25, reward: 300,
    msg: 'THE VOID KING DESCENDS!', attack: 'teleport',
  },
  {
    name: 'STAR EATER', health: 5000, speed: 35, radius: 60,
    color: '#ff8800', damage: 30, reward: 500,
    msg: 'THE STAR EATER AWAKENS!', attack: 'laser',
  },
];

export class CoopBoss {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.camera = new Camera();
    this.player = new Player();
    this.projectiles = new ProjectileSystem();
    this.particles = new ParticleSystem();
    this.hud = new HUD();
    this.weaponIndex = 0;
    this.done = false;
    this.gameOver = false;
    this.bossIndex = 0;
    this.announceTimer = 0;
    this.announceText = '';
    this.victory = false;
    this.victoryTimer = 0;

    this.boss = null;
    this.bossAttackTimer = 0;
    this.bossLaser = null;
    this.bossChargeTarget = null;

    this.totalDamageDealt = 0;
    this.spawnBoss(0);
  }

  get weapon() { return COOP_WEAPONS[this.weaponIndex]; }

  resize(w, h) {
    this.screenW = w;
    this.screenH = h;
    this.camera.resize(w, h);
  }

  spawnBoss(idx) {
    if (idx >= MEGA_BOSSES.length) {
      this.victory = true;
      this.victoryTimer = 0;
      this.announceText = 'ALL BOSSES DEFEATED!';
      this.announceTimer = 5;
      try {
        const u = new SpeechSynthesisUtterance('Victory! All bosses defeated!');
        u.pitch = 0.3; u.rate = 0.7; speechSynthesis.speak(u);
      } catch (_) {}
      return;
    }
    this.bossIndex = idx;
    const b = MEGA_BOSSES[idx];
    const mapCenter = MAP_SIZE * TILE_SIZE / 2;
    this.boss = {
      x: mapCenter + 200, y: mapCenter,
      health: b.health, maxHealth: b.health,
      speed: b.speed, radius: b.radius,
      color: b.color, damage: b.damage,
      name: b.name, attack: b.attack,
      reward: b.reward, hitFlash: 0, shakeTimer: 0,
    };
    this.bossAttackTimer = 3;
    this.bossLaser = null;
    this.bossChargeTarget = null;
    this.announceText = b.msg;
    this.announceTimer = 3;
    try {
      const u = new SpeechSynthesisUtterance(b.msg);
      u.pitch = 0.2; u.rate = 0.6; speechSynthesis.speak(u);
    } catch (_) {}
  }

  handleTouchStart(sx, sy) {
    const btnSize = 56;
    const btnX = this.screenW - btnSize - 16;
    const wpnBtnY = this.screenH - btnSize - 90;
    if (sx >= btnX && sx <= btnX + btnSize && sy >= wpnBtnY && sy <= wpnBtnY + btnSize) {
      this.weaponIndex = (this.weaponIndex + 1) % COOP_WEAPONS.length;
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
    if (!this.hud.joystickActive) return;
    const dx = sx - this.hud.joystickOriginX, dy = sy - this.hud.joystickOriginY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const c = Math.min(dist, 60);
      this.hud.joystickX = (dx / dist) * (c / 60);
      this.hud.joystickY = (dy / dist) * (c / 60);
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
  }

  syncBossState() {
    if (!this.boss) return;
    if (multiplayer.isHost) {
      multiplayer.broadcastHostState({
        action: 'coop-boss',
        bossHealth: this.boss.health,
        bossX: this.boss.x, bossY: this.boss.y,
        bossIndex: this.bossIndex,
        laserActive: this.bossLaser !== null,
        laserAngle: this.bossLaser ? this.bossLaser.angle : 0,
      });
    }
  }

  applyHostState(data) {
    if (!this.boss || data.action !== 'coop-boss') return;
    if (data.bossIndex !== this.bossIndex) {
      this.spawnBoss(data.bossIndex);
    }
    if (this.boss) {
      this.boss.health = data.bossHealth;
      this.boss.x = data.bossX;
      this.boss.y = data.bossY;
    }
  }

  update(dt) {
    if (this.victory) {
      this.victoryTimer += dt;
      if (this.announceTimer > 0) this.announceTimer -= dt;
      if (this.victoryTimer > 5) this.done = true;
      return;
    }
    if (this.gameOver) return;

    this.player.update(dt, this.hud.joystickX, this.hud.joystickY);
    this.camera.follow(this.player.x, this.player.y);
    this.camera.update(dt);
    this.projectiles.update(dt);
    this.particles.update(dt);
    this.hud.update(dt);
    if (this.announceTimer > 0) this.announceTimer -= dt;

    if (this.boss) {
      if (this.boss.hitFlash > 0) this.boss.hitFlash -= dt * 4;
      if (this.boss.shakeTimer > 0) this.boss.shakeTimer -= dt * 10;

      const dx = this.player.x - this.boss.x, dy = this.player.y - this.boss.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (this.boss.attack === 'charge') {
        if (!this.bossChargeTarget) {
          this.boss.x += (dx / Math.max(dist, 1)) * this.boss.speed * dt;
          this.boss.y += (dy / Math.max(dist, 1)) * this.boss.speed * dt;
          this.bossAttackTimer -= dt;
          if (this.bossAttackTimer <= 0) {
            this.bossChargeTarget = { x: this.player.x, y: this.player.y };
            this.bossAttackTimer = 2;
          }
        } else {
          const cdx = this.bossChargeTarget.x - this.boss.x;
          const cdy = this.bossChargeTarget.y - this.boss.y;
          const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
          this.boss.x += (cdx / Math.max(cdist, 1)) * this.boss.speed * 4 * dt;
          this.boss.y += (cdy / Math.max(cdist, 1)) * this.boss.speed * 4 * dt;
          if (cdist < 20) { this.bossChargeTarget = null; this.bossAttackTimer = 2; }
        }
      } else if (this.boss.attack === 'teleport') {
        this.boss.x += (dx / Math.max(dist, 1)) * this.boss.speed * dt;
        this.boss.y += (dy / Math.max(dist, 1)) * this.boss.speed * dt;
        this.bossAttackTimer -= dt;
        if (this.bossAttackTimer <= 0) {
          this.boss.x = this.player.x + (Math.random() - 0.5) * 300;
          this.boss.y = this.player.y + (Math.random() - 0.5) * 300;
          this.particles.emit(this.boss.x, this.boss.y, 20, { color: '#8844ff', speed: 150, life: 0.5, radius: 5 });
          this.bossAttackTimer = 2.5;
        }
      } else if (this.boss.attack === 'laser') {
        this.boss.x += (dx / Math.max(dist, 1)) * this.boss.speed * 0.5 * dt;
        this.boss.y += (dy / Math.max(dist, 1)) * this.boss.speed * 0.5 * dt;
        this.bossAttackTimer -= dt;
        if (this.bossAttackTimer <= 0) {
          this.bossLaser = { angle: Math.atan2(dy, dx), timer: 1.5 };
          this.bossAttackTimer = 4;
        }
      }

      if (this.bossLaser) {
        this.bossLaser.timer -= dt;
        const la = this.bossLaser.angle;
        const ldx = Math.cos(la), ldy = Math.sin(la);
        const pdx = this.player.x - this.boss.x, pdy = this.player.y - this.boss.y;
        const proj = pdx * ldx + pdy * ldy;
        if (proj > 0) {
          const perpDist = Math.abs(pdx * ldy - pdy * ldx);
          if (perpDist < 25) this.player.takeDamage(dt * 40);
        }
        if (this.bossLaser.timer <= 0) this.bossLaser = null;
      }

      if (dist < this.boss.radius + this.player.radius + 5) {
        this.player.takeDamage(this.boss.damage * dt * 2);
      }

      for (const p of this.projectiles.pool) {
        if (!p.active || !p.friendly) continue;
        const bdx = p.x - this.boss.x, bdy = p.y - this.boss.y;
        if (bdx * bdx + bdy * bdy < (p.radius + this.boss.radius) ** 2) {
          this.boss.health -= p.damage;
          this.totalDamageDealt += p.damage;
          p.active = false;
          this.boss.hitFlash = 0.2;
          this.boss.shakeTimer = 3;
          this.particles.emit(p.x, p.y, 5, { color: this.boss.color, speed: 80, life: 0.3, radius: 3 });
        }
      }

      if (this.boss.health <= 0) {
        this.particles.emit(this.boss.x, this.boss.y, 40, { color: this.boss.color, speed: 200, life: 1, radius: 6 });
        this.particles.emit(this.boss.x, this.boss.y, 20, { color: '#ffffff', speed: 150, life: 0.8, radius: 4 });
        this.hud.showMessage(`${this.boss.name} DEFEATED! +${this.boss.reward}`);
        this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
        this.spawnBoss(this.bossIndex + 1);
      }
    }

    if (this.player.health <= 0) {
      this.gameOver = true;
      this.done = true;
    }
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;
    ctx.fillStyle = '#08080f';
    ctx.fillRect(0, 0, w, h);

    if (this.boss) this.renderBoss(ctx);
    this.player.render(ctx, this.camera);
    this.projectiles.render(ctx, this.camera);
    this.particles.render(ctx, this.camera);

    this.renderHUD(ctx, w, h);
    this.hud.render(ctx, w, h, { food: 0, metal: 0, energy: 0, wave: this.bossIndex + 1, score: this.totalDamageDealt }, this.player);

    if (this.announceTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.announceTimer);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, h * 0.35, w, h * 0.15);
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = this.victory ? '#44ff88' : '#ff4488';
      ctx.fillText(this.announceText, w / 2, h * 0.44);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    if (this.victory) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, h * 0.3, w, h * 0.25);
      ctx.font = 'bold 36px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#44ff88';
      ctx.fillText('VICTORY!', w / 2, h * 0.40);
      ctx.font = '18px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#ffdd44';
      ctx.fillText(`Total Damage: ${this.totalDamageDealt}`, w / 2, h * 0.47);
      ctx.textAlign = 'left';
    }
  }

  renderBoss(ctx) {
    const b = this.boss;
    const s = this.camera.worldToScreen(b.x, b.y);
    const shake = b.shakeTimer > 0 ? (Math.random() - 0.5) * b.shakeTimer : 0;

    if (this.bossLaser) {
      const la = this.bossLaser.angle;
      ctx.strokeStyle = `rgba(255,50,50,${0.5 + Math.sin(Date.now() / 50) * 0.3})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(la) * 2000, s.y + Math.sin(la) * 2000);
      ctx.stroke();
      ctx.strokeStyle = '#ffaaaa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(la) * 2000, s.y + Math.sin(la) * 2000);
      ctx.stroke();
    }

    const glow = ctx.createRadialGradient(s.x, s.y, b.radius * 0.5, s.x, s.y, b.radius * 2);
    glow.addColorStop(0, b.color + '44');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, b.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(s.x + shake, s.y + shake, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = b.hitFlash > 0 ? '#ffffff' : b.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s.x - b.radius * 0.3 + shake, s.y - b.radius * 0.2, b.radius * 0.2, 0, Math.PI * 2);
    ctx.arc(s.x + b.radius * 0.3 + shake, s.y - b.radius * 0.2, b.radius * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(s.x - b.radius * 0.3 + shake, s.y - b.radius * 0.2, b.radius * 0.1, 0, Math.PI * 2);
    ctx.arc(s.x + b.radius * 0.3 + shake, s.y - b.radius * 0.2, b.radius * 0.1, 0, Math.PI * 2);
    ctx.fill();

    const hpW = 200, hpH = 14;
    const hpX = this.screenW / 2 - hpW / 2, hpY = 60;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(hpX - 4, hpY - 4, hpW + 8, hpH + 8, 6);
    ctx.fill();
    ctx.fillStyle = '#220000';
    ctx.fillRect(hpX, hpY, hpW, hpH);
    const pct = b.health / b.maxHealth;
    ctx.fillStyle = pct > 0.5 ? '#ff4488' : pct > 0.25 ? '#ff8800' : '#ff0000';
    ctx.fillRect(hpX, hpY, hpW * pct, hpH);
    ctx.strokeStyle = '#ff4488';
    ctx.lineWidth = 1;
    ctx.strokeRect(hpX, hpY, hpW, hpH);
    ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${b.name} — ${Math.max(0, Math.floor(b.health))} HP`, this.screenW / 2, hpY + hpH + 16);
    ctx.textAlign = 'left';
  }

  renderHUD(ctx, w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, 50);
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ff88ff';
    ctx.fillText(`Boss ${this.bossIndex + 1}/${MEGA_BOSSES.length}`, 16, 28);
    ctx.fillStyle = '#ffaa44';
    ctx.fillText(`Damage: ${this.totalDamageDealt}`, 150, 28);
    ctx.fillStyle = this.weapon.color;
    ctx.fillText(this.weapon.name, w - 120, 28);

    const players = multiplayer.connected ? multiplayer.playerCount : 1;
    ctx.fillStyle = '#88aaff';
    ctx.fillText(`${players} player${players > 1 ? 's' : ''}`, 300, 28);

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
    ctx.fillText('🔄', btnX + btnSize / 2, wpnBtnY + btnSize / 2 + 8);
    ctx.textAlign = 'left';

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4444';
      ctx.fillText('YOU FELL IN BATTLE', w / 2, h / 2 - 20);
      ctx.font = '18px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aab';
      ctx.fillText(`Total Damage: ${this.totalDamageDealt}`, w / 2, h / 2 + 15);
      ctx.fillText('Tap to return', w / 2, h / 2 + 45);
      ctx.textAlign = 'left';
    }
  }
}
