const MAX_PROJECTILES = 200;

export class ProjectileSystem {
  constructor() {
    this.pool = [];
    for (let i = 0; i < MAX_PROJECTILES; i++) {
      this.pool.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        damage: 0, friendly: true, life: 0, color: '#fff', radius: 3,
      });
    }
  }

  fire(x, y, angle, weapon, friendly = true) {
    const pellets = weapon.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const p = this.pool.find(p => !p.active);
      if (!p) return;
      const a = angle + (Math.random() - 0.5) * weapon.spread;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * weapon.bulletSpeed;
      p.vy = Math.sin(a) * weapon.bulletSpeed;
      p.damage = weapon.damage;
      p.friendly = friendly;
      p.life = 2;
      p.color = weapon.color;
      p.radius = pellets > 1 ? 2 : 3;
    }
  }

  update(dt) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  getActive() {
    return this.pool.filter(p => p.active);
  }

  render(ctx, camera) {
    for (const p of this.pool) {
      if (!p.active) continue;
      if (!camera.isVisible(p.x, p.y)) continue;
      const s = camera.worldToScreen(p.x, p.y);
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      // Glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.radius * 2.5, 0, Math.PI * 2);
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
