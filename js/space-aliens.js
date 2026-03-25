const MAX_ALIENS = 15;
const ALIEN_BULLET_SPEED = 350;
const ALIEN_BULLET_DAMAGE = 8;

const ALIEN_TYPES = [
  { name: 'Scout', hp: 30, speed: 120, fireRate: 1.5, radius: 12, color: '#44ff44', reward: 10 },
  { name: 'Fighter', hp: 60, speed: 80, fireRate: 0.8, radius: 16, color: '#ff44ff', reward: 25 },
  { name: 'Bomber', hp: 100, speed: 50, fireRate: 2.0, radius: 22, color: '#ff8800', reward: 40 },
];

export class SpaceAliens {
  constructor() {
    this.pool = [];
    for (let i = 0; i < MAX_ALIENS; i++) {
      this.pool.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        hp: 0, maxHp: 0, speed: 0, fireRate: 0, fireCooldown: 0,
        radius: 0, color: '', reward: 0, type: 0, angle: 0, aggro: false,
      });
    }
    this.spawnTimer = 10;
    this.wave = 0;
    this.waveTimer = 45;
    this.kills = 0;
    this.syncedByHost = false;
  }

  aggroAll() {
    for (const a of this.pool) if (a.active) a.aggro = true;
  }

  activeCount() {
    let c = 0;
    for (const a of this.pool) if (a.active) c++;
    return c;
  }

  spawn(screenW, screenH) {
    const a = this.pool.find(a => !a.active);
    if (!a) return;
    const maxType = Math.min(ALIEN_TYPES.length - 1, (this.wave / 2) | 0);
    const t = ALIEN_TYPES[(Math.random() * (maxType + 1)) | 0];
    const side = (Math.random() * 4) | 0;
    if (side === 0) { a.x = Math.random() * screenW; a.y = -30; }
    else if (side === 1) { a.x = screenW + 30; a.y = Math.random() * screenH; }
    else if (side === 2) { a.x = Math.random() * screenW; a.y = screenH + 30; }
    else { a.x = -30; a.y = Math.random() * screenH; }
    a.active = true;
    a.hp = t.hp + this.wave * 5;
    a.maxHp = a.hp;
    a.speed = t.speed;
    a.fireRate = t.fireRate;
    a.fireCooldown = t.fireRate * Math.random();
    a.radius = t.radius;
    a.color = t.color;
    a.reward = t.reward;
    a.type = ALIEN_TYPES.indexOf(t);
    a.angle = 0; a.aggro = false;
    a.vx = 0; a.vy = 0;
  }

  update(dt, shipX, shipY, screenW, screenH, bullets, particles) {
    if (!this.syncedByHost) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.wave++;
        this.waveTimer = 50 + this.wave * 5;
      }

      this.spawnTimer -= dt;
      const maxAliens = 2 + this.wave;
      if (this.spawnTimer <= 0 && this.activeCount() < maxAliens) {
        this.spawn(screenW, screenH);
        this.spawnTimer = Math.max(5, 12 - this.wave);
      }
    }

    for (const a of this.pool) {
      if (!a.active) continue;

      const dx = shipX - a.x, dy = shipY - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (!a.aggro) {
        // Passive: drift slowly, ignore player completely
        if (Math.abs(a.vx) < 1 && Math.abs(a.vy) < 1) {
          const driftAngle = Math.random() * Math.PI * 2;
          a.vx = Math.cos(driftAngle) * a.speed * 0.3;
          a.vy = Math.sin(driftAngle) * a.speed * 0.3;
        }
        a.angle = Math.atan2(a.vy, a.vx);
      } else {
        // Hostile: orbit and strafe around player
        a.angle = Math.atan2(dy, dx);
        if (dist > 250) {
          a.vx += (dx / dist) * a.speed * dt * 2;
          a.vy += (dy / dist) * a.speed * dt * 2;
        } else if (dist < 150) {
          a.vx -= (dx / dist) * a.speed * dt * 2;
          a.vy -= (dy / dist) * a.speed * dt * 2;
        } else {
          a.vx += (-dy / dist) * a.speed * dt * 1.5;
          a.vy += (dx / dist) * a.speed * dt * 1.5;
        }
      }

      a.vx *= 0.97; a.vy *= 0.97;
      a.x += a.vx * dt; a.y += a.vy * dt;

      // Wrap
      if (a.x < -60) a.x = screenW + 60;
      if (a.x > screenW + 60) a.x = -60;
      if (a.y < -60) a.y = screenH + 60;
      if (a.y > screenH + 60) a.y = -60;

      // Shoot at player (only when aggro)
      a.fireCooldown -= dt;
      if (a.aggro && a.fireCooldown <= 0 && dist < 500) {
        a.fireCooldown = a.fireRate;
        const spread = (Math.random() - 0.5) * 0.15;
        const ba = a.angle + spread;
        const b = bullets.find(b => !b.active);
        if (b) {
          b.active = true;
          b.x = a.x + Math.cos(ba) * (a.radius + 5);
          b.y = a.y + Math.sin(ba) * (a.radius + 5);
          b.vx = Math.cos(ba) * ALIEN_BULLET_SPEED;
          b.vy = Math.sin(ba) * ALIEN_BULLET_SPEED;
          b.life = 2.5;
          b.color = '#ff2244';
          b.r = 4;
          b.damage = ALIEN_BULLET_DAMAGE + this.wave;
          b.friendly = false;
        }
      }
    }
  }

  render(ctx) {
    for (const a of this.pool) {
      if (!a.active) continue;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle + Math.PI / 2);

      // Wings
      ctx.beginPath();
      ctx.moveTo(-a.radius, a.radius * 0.6);
      ctx.lineTo(-a.radius * 0.4, -a.radius * 0.3);
      ctx.lineTo(a.radius * 0.4, -a.radius * 0.3);
      ctx.lineTo(a.radius, a.radius * 0.6);
      ctx.closePath();
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Body
      ctx.beginPath();
      ctx.moveTo(0, -a.radius);
      ctx.lineTo(-a.radius * 0.5, a.radius * 0.5);
      ctx.lineTo(0, a.radius * 0.3);
      ctx.lineTo(a.radius * 0.5, a.radius * 0.5);
      ctx.closePath();
      ctx.fillStyle = a.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Cockpit glow
      ctx.beginPath();
      ctx.arc(0, -a.radius * 0.3, a.radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ff0033';
      ctx.fill();

      ctx.restore();

      // Health bar
      if (a.hp < a.maxHp) {
        const bw = a.radius * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(a.x - bw / 2, a.y - a.radius - 10, bw, 3);
        ctx.fillStyle = a.color;
        ctx.fillRect(a.x - bw / 2, a.y - a.radius - 10, bw * (a.hp / a.maxHp), 3);
      }
    }
  }
}
