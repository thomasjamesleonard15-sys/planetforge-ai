const MAX_SOLDIERS = 20;
const SOLDIER_SPEED = 140;
const SOLDIER_RANGE = 180;
const SOLDIER_FIRE_RATE = 0.6;
const SOLDIER_DAMAGE = 8;
const SOLDIER_BULLET_SPEED = 450;

export class SoldierSystem {
  constructor() {
    this.pool = [];
    for (let i = 0; i < MAX_SOLDIERS; i++) {
      this.pool.push({
        active: false, x: 0, y: 0, fireCooldown: 0,
      });
    }
  }

  activeCount() {
    let c = 0;
    for (const s of this.pool) if (s.active) c++;
    return c;
  }

  addSoldier(x, y) {
    const s = this.pool.find(s => !s.active);
    if (!s) return;
    s.active = true;
    s.x = x + (Math.random() - 0.5) * 40;
    s.y = y + (Math.random() - 0.5) * 40;
    s.fireCooldown = 0;
  }

  setCount(count, centerX, centerY) {
    let active = this.activeCount();
    for (let i = active; i < count && i < MAX_SOLDIERS; i++) {
      this.addSoldier(centerX, centerY);
    }
  }

  update(dt, playerX, playerY, enemies, projectiles, nightMonsters) {
    for (const s of this.pool) {
      if (!s.active) continue;

      // Follow player loosely
      const dx = playerX - s.x;
      const dy = playerY - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 60) {
        s.x += (dx / dist) * SOLDIER_SPEED * dt;
        s.y += (dy / dist) * SOLDIER_SPEED * dt;
      }

      // Shoot nearest enemy or night monster
      s.fireCooldown -= dt;
      if (s.fireCooldown > 0) continue;

      let closest = null;
      let closestDist = SOLDIER_RANGE;
      if (enemies) {
        for (const e of enemies.pool) {
          if (!e.active) continue;
          const ex = e.x - s.x, ey = e.y - s.y;
          const ed = Math.sqrt(ex * ex + ey * ey);
          if (ed < closestDist) { closestDist = ed; closest = e; }
        }
      }
      if (nightMonsters) {
        for (const m of nightMonsters) {
          if (!m.active) continue;
          const mx = m.x - s.x, my = m.y - s.y;
          const md = Math.sqrt(mx * mx + my * my);
          if (md < closestDist) { closestDist = md; closest = m; }
        }
      }

      if (closest) {
        const angle = Math.atan2(closest.y - s.y, closest.x - s.x);
        const b = projectiles.pool.find(p => !p.active);
        if (b) {
          b.active = true;
          b.x = s.x; b.y = s.y;
          b.vx = Math.cos(angle) * SOLDIER_BULLET_SPEED;
          b.vy = Math.sin(angle) * SOLDIER_BULLET_SPEED;
          b.damage = SOLDIER_DAMAGE;
          b.friendly = true;
          b.life = 1.5;
          b.color = '#88ffaa';
          b.radius = 3;
        }
        s.fireCooldown = SOLDIER_FIRE_RATE;
      }
    }
  }

  render(ctx, camera) {
    for (const s of this.pool) {
      if (!s.active) continue;
      if (!camera.isVisible(s.x, s.y)) continue;
      const sc = camera.worldToScreen(s.x, s.y);

      // Body
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#44aa66';
      ctx.fill();

      // Helmet
      ctx.beginPath();
      ctx.arc(sc.x, sc.y - 3, 5, Math.PI, 0);
      ctx.fillStyle = '#336644';
      ctx.fill();

      // Gun
      ctx.fillStyle = '#888';
      ctx.fillRect(sc.x + 5, sc.y - 2, 8, 3);
    }
  }
}
