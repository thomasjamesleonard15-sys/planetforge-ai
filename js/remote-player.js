import { SKINS, renderSkinDetail } from './skins.js';

const MAX_REMOTE = 8;

export class RemotePlayerPool {
  constructor() {
    this.pool = [];
    for (let i = 0; i < MAX_REMOTE; i++) {
      this.pool.push({
        active: false, peerId: '',
        x: 0, y: 0, targetX: 0, targetY: 0,
        radius: 14, health: 100, maxHealth: 100,
        skinIndex: 0, name: '',
      });
    }
    this.remoteBullets = [];
    for (let i = 0; i < 80; i++) {
      this.remoteBullets.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        life: 0, color: '#ff4444', radius: 3, damage: 10,
      });
    }
  }

  updateFromStates(remoteStates, localPlanet) {
    const seen = new Set();
    for (const [peerId, state] of remoteStates) {
      if (state.view !== 'surface' || state.planet !== localPlanet) continue;
      seen.add(peerId);
      let rp = this.pool.find(p => p.active && p.peerId === peerId);
      if (!rp) {
        rp = this.pool.find(p => !p.active);
        if (!rp) continue;
        rp.active = true;
        rp.peerId = peerId;
        rp.x = state.x;
        rp.y = state.y;
      }
      rp.targetX = state.x;
      rp.targetY = state.y;
      rp.health = state.health || 100;
      rp.maxHealth = state.maxHealth || 100;
      rp.skinIndex = state.skinIndex || 0;
      rp.name = state.name || 'Player';

      if (state.bullets) {
        for (const sb of state.bullets) {
          const b = this.remoteBullets.find(b => !b.active);
          if (!b) break;
          b.active = true;
          b.x = sb.x; b.y = sb.y;
          b.vx = sb.vx; b.vy = sb.vy;
          b.life = sb.life || 1.8;
          b.color = sb.color || '#ff4444';
          b.radius = sb.radius || 3;
          b.damage = sb.damage || 10;
        }
      }
    }
    for (const rp of this.pool) {
      if (rp.active && !seen.has(rp.peerId)) rp.active = false;
    }
  }

  update(dt) {
    for (const rp of this.pool) {
      if (!rp.active) continue;
      const lerpSpeed = 18 * dt;
      rp.x += (rp.targetX - rp.x) * lerpSpeed;
      rp.y += (rp.targetY - rp.y) * lerpSpeed;
    }
    for (const b of this.remoteBullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) b.active = false;
    }
  }

  checkHits(playerX, playerY, playerRadius, particles) {
    let totalDamage = 0;
    for (const b of this.remoteBullets) {
      if (!b.active) continue;
      const dx = b.x - playerX, dy = b.y - playerY;
      if (dx * dx + dy * dy < (b.radius + playerRadius) ** 2) {
        b.active = false;
        totalDamage += b.damage;
        if (particles) {
          particles.emit(b.x, b.y, 4, { color: '#ff2244', speed: 80, life: 0.3, radius: 2 });
        }
      }
    }
    return totalDamage;
  }

  render(ctx, camera) {
    for (const rp of this.pool) {
      if (!rp.active) continue;
      const s = camera.worldToScreen(rp.x, rp.y);
      const sk = SKINS[rp.skinIndex % SKINS.length];

      if (sk.detail === 'cape') renderSkinDetail(ctx, s.x, s.y, rp.radius, sk);

      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(s.x, s.y, rp.radius, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(s.x - 3, s.y - 3, 2, s.x, s.y, rp.radius);
      grad.addColorStop(0, sk.body1);
      grad.addColorStop(1, sk.body2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(s.x, s.y - 3, 5, 0, Math.PI * 2);
      ctx.fillStyle = sk.visor;
      ctx.fill();

      if (sk.detail && sk.detail !== 'cape') renderSkinDetail(ctx, s.x, s.y, rp.radius, sk);

      const barW = 30, barH = 4;
      const hpPct = rp.health / rp.maxHealth;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(s.x - barW / 2, s.y - rp.radius - 10, barW, barH);
      ctx.fillStyle = hpPct > 0.3 ? '#44ff66' : '#ff4444';
      ctx.fillRect(s.x - barW / 2, s.y - rp.radius - 10, barW * hpPct, barH);

      ctx.font = '9px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,200,100,0.7)';
      ctx.fillText(rp.name || sk.name, s.x, s.y + rp.radius + 12);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    for (const b of this.remoteBullets) {
      if (!b.active) continue;
      if (!camera.isVisible(b.x, b.y)) continue;
      const s = camera.worldToScreen(b.x, b.y);
      ctx.beginPath();
      ctx.arc(s.x, s.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(s.x, s.y, b.radius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
