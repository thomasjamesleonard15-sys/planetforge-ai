import { TILE_SIZE, MAP_SIZE, ENEMY_TYPES, TILE } from './constants.js';

const MAX_ENEMIES = 80;

export class EnemySystem {
  constructor() {
    this.pool = [];
    for (let i = 0; i < MAX_ENEMIES; i++) {
      this.pool.push({
        active: false, x: 0, y: 0, health: 0, maxHealth: 0,
        speed: 0, damage: 0, radius: 0, color: '', reward: 0,
        attackCooldown: 0, type: 0,
      });
    }
    this.waveTimer = 15;
    this.wave = 0;
    this.spawnQueue = 0;
    this.spawnCooldown = 0;
    this.syncedByHost = false;
  }

  startWave(wave) {
    this.wave = wave;
    const count = 5 + wave * 3;
    this.spawnQueue = count;
    this.spawnCooldown = 0;
  }

  activeCount() {
    let c = 0;
    for (const e of this.pool) if (e.active) c++;
    return c;
  }

  spawn(typeIndex) {
    const e = this.pool.find(e => !e.active);
    if (!e) return;
    const t = ENEMY_TYPES[typeIndex];
    const side = Math.random() * 4 | 0;
    const mapPx = MAP_SIZE * TILE_SIZE;
    if (side === 0) { e.x = Math.random() * mapPx; e.y = -20; }
    else if (side === 1) { e.x = mapPx + 20; e.y = Math.random() * mapPx; }
    else if (side === 2) { e.x = Math.random() * mapPx; e.y = mapPx + 20; }
    else { e.x = -20; e.y = Math.random() * mapPx; }
    e.active = true;
    e.health = t.health + this.wave * 5;
    e.maxHealth = e.health;
    e.speed = t.speed;
    e.damage = t.damage;
    e.radius = t.radius;
    e.color = t.color;
    e.reward = t.reward;
    e.attackCooldown = 0;
    e.type = typeIndex;
  }

  update(dt, player, tileMap, resources, particles) {
    if (!this.syncedByHost) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0 && this.spawnQueue <= 0 && this.activeCount() === 0) {
        this.wave++;
        resources.wave = this.wave;
        this.startWave(this.wave);
        this.waveTimer = 20 + this.wave * 2;
      }

      if (this.spawnQueue > 0) {
        this.spawnCooldown -= dt;
        if (this.spawnCooldown <= 0) {
          const maxType = Math.min(ENEMY_TYPES.length - 1, (this.wave / 3) | 0);
          this.spawn(Math.random() * (maxType + 1) | 0);
          this.spawnQueue--;
          this.spawnCooldown = 0.4;
        }
      }
    }

    for (const e of this.pool) {
      if (!e.active) continue;
      // AI: move toward player
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > e.radius + player.radius) {
        e.x += (dx / dist) * e.speed * dt;
        e.y += (dy / dist) * e.speed * dt;
      } else {
        e.attackCooldown -= dt;
        if (e.attackCooldown <= 0) {
          player.takeDamage(e.damage);
          e.attackCooldown = 1;
          particles.emit(player.x, player.y, 8, { color: '#ff4444', speed: 80, life: 0.3, radius: 3 });
        }
      }
    }
  }

  render(ctx, camera) {
    for (const e of this.pool) {
      if (!e.active) continue;
      if (!camera.isVisible(e.x, e.y, e.radius + 10)) continue;
      const s = camera.worldToScreen(e.x, e.y);
      const r = e.radius;
      const t = Date.now() / 200;
      const bob = Math.sin(t + e.x * 0.01) * 1.5;

      // Directional shadow
      ctx.save();
      ctx.translate(s.x, s.y + r + 1);
      ctx.transform(1, 0, -0.4, 0.3, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, -r * 1.8, r * 0.7, r * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, 0);
      ctx.lineTo(r * 0.6, 0);
      ctx.lineTo(r * 0.5, -r * 1.8);
      ctx.lineTo(-r * 0.5, -r * 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Glow aura
      const aura = ctx.createRadialGradient(s.x, s.y + bob, r, s.x, s.y + bob, r * 1.6);
      aura.addColorStop(0, e.color + '55');
      aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(s.x, s.y + bob, r * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Body with shading
      ctx.beginPath();
      ctx.arc(s.x, s.y + bob, r, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(s.x - r * 0.4, s.y - r * 0.4 + bob, r * 0.05, s.x, s.y + bob, r * 1.1);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, e.color);
      grad.addColorStop(1, '#000000');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Spikes around the body for menace
      for (let i = 0; i < 6; i++) {
        const sa = (i / 6) * Math.PI * 2 + t * 0.3;
        ctx.beginPath();
        ctx.moveTo(s.x + Math.cos(sa) * r, s.y + bob + Math.sin(sa) * r);
        ctx.lineTo(s.x + Math.cos(sa) * (r + 4), s.y + bob + Math.sin(sa) * (r + 4));
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Eyes — angry red with glow
      const eyeGlowL = ctx.createRadialGradient(s.x - r * 0.3, s.y - r * 0.2 + bob, 0, s.x - r * 0.3, s.y - r * 0.2 + bob, r * 0.4);
      eyeGlowL.addColorStop(0, 'rgba(255,50,50,0.9)');
      eyeGlowL.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGlowL;
      ctx.fillRect(s.x - r * 0.7, s.y - r * 0.6 + bob, r * 0.8, r * 0.8);
      const eyeGlowR = ctx.createRadialGradient(s.x + r * 0.3, s.y - r * 0.2 + bob, 0, s.x + r * 0.3, s.y - r * 0.2 + bob, r * 0.4);
      eyeGlowR.addColorStop(0, 'rgba(255,50,50,0.9)');
      eyeGlowR.addColorStop(1, 'transparent');
      ctx.fillStyle = eyeGlowR;
      ctx.fillRect(s.x - r * 0.1, s.y - r * 0.6 + bob, r * 0.8, r * 0.8);
      // Eye whites
      ctx.fillStyle = '#ffeeee';
      ctx.beginPath();
      ctx.arc(s.x - r * 0.3, s.y - r * 0.2 + bob, r * 0.22, 0, Math.PI * 2);
      ctx.arc(s.x + r * 0.3, s.y - r * 0.2 + bob, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      // Pupils
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(s.x - r * 0.3, s.y - r * 0.2 + bob, r * 0.1, 0, Math.PI * 2);
      ctx.arc(s.x + r * 0.3, s.y - r * 0.2 + bob, r * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Mouth
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(s.x, s.y + r * 0.2 + bob, r * 0.3, 0.3, Math.PI - 0.3);
      ctx.stroke();

      // Health bar with backdrop
      if (e.health < e.maxHealth) {
        const bw = e.radius * 2.2;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(s.x - bw / 2 - 1, s.y - e.radius - 9, bw + 2, 5);
        const hpPct = e.health / e.maxHealth;
        ctx.fillStyle = hpPct > 0.5 ? '#ffaa22' : '#ff4444';
        ctx.fillRect(s.x - bw / 2, s.y - e.radius - 8, bw * hpPct, 3);
      }
    }
  }
}
