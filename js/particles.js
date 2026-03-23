const MAX_PARTICLES = 500;

export class ParticleSystem {
  constructor() {
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0, color: '' });
    }
  }

  emit(x, y, count, config) {
    let spawned = 0;
    for (const p of this.particles) {
      if (spawned >= count) break;
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      const angle = (config.angle ?? Math.random() * Math.PI * 2) + (Math.random() - 0.5) * (config.spread ?? Math.PI * 2);
      const speed = (config.speed ?? 100) * (0.5 + Math.random() * 0.5);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = config.life ?? 0.5;
      p.maxLife = p.life;
      p.r = config.radius ?? 3;
      p.color = config.color ?? '#ffffff';
      spawned++;
    }
  }

  update(dt) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  render(ctx, camera) {
    for (const p of this.particles) {
      if (!p.active) continue;
      if (!camera.isVisible(p.x, p.y)) continue;
      const s = camera.worldToScreen(p.x, p.y);
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.r * alpha, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
