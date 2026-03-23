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
      // Body
      ctx.beginPath();
      ctx.arc(s.x, s.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = e.color;
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(s.x - e.radius * 0.3, s.y - e.radius * 0.2, e.radius * 0.2, 0, Math.PI * 2);
      ctx.arc(s.x + e.radius * 0.3, s.y - e.radius * 0.2, e.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();
      // Health
      if (e.health < e.maxHealth) {
        const bw = e.radius * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(s.x - bw / 2, s.y - e.radius - 8, bw, 3);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(s.x - bw / 2, s.y - e.radius - 8, bw * (e.health / e.maxHealth), 3);
      }
    }
  }
}
