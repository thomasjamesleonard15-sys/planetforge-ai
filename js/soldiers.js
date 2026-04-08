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

      // Directional shadow
      ctx.save();
      ctx.translate(sc.x, sc.y + 12);
      ctx.transform(1, 0, -0.4, 0.3, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.lineTo(5, -22);
      ctx.lineTo(-5, -22);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -22, 5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Body with shading
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, 10, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(sc.x - 3, sc.y - 3, 1, sc.x, sc.y, 11);
      grad.addColorStop(0, '#88dd99');
      grad.addColorStop(0.5, '#44aa66');
      grad.addColorStop(1, '#225533');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#113322';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Body armor lines
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sc.x - 6, sc.y + 2);
      ctx.lineTo(sc.x + 6, sc.y + 2);
      ctx.stroke();

      // Helmet with shading
      ctx.beginPath();
      ctx.arc(sc.x, sc.y - 3, 6, Math.PI, 0);
      const hg = ctx.createLinearGradient(sc.x - 6, sc.y - 8, sc.x + 6, sc.y);
      hg.addColorStop(0, '#225533');
      hg.addColorStop(0.5, '#447755');
      hg.addColorStop(1, '#113322');
      ctx.fillStyle = hg;
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Helmet stripe
      ctx.strokeStyle = '#88aa66';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sc.x - 5, sc.y - 4);
      ctx.lineTo(sc.x + 5, sc.y - 4);
      ctx.stroke();

      // Visor slit
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(sc.x - 4, sc.y - 2, 8, 1);

      // Gun
      ctx.fillStyle = '#222';
      ctx.fillRect(sc.x + 5, sc.y - 2, 10, 3);
      ctx.fillStyle = '#666';
      ctx.fillRect(sc.x + 5, sc.y - 2, 10, 1);
      // Muzzle
      ctx.fillStyle = '#444';
      ctx.fillRect(sc.x + 14, sc.y - 1, 2, 1);
    }
  }
}
