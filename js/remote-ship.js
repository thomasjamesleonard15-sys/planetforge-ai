const MAX_REMOTE = 8;

export class RemoteShipPool {
  constructor() {
    this.pool = [];
    for (let i = 0; i < MAX_REMOTE; i++) {
      this.pool.push({
        active: false, peerId: '',
        x: 0, y: 0, targetX: 0, targetY: 0,
        angle: 0, targetAngle: 0,
        thrust: false, health: 100, maxHealth: 100,
        hijacked: null, name: '',
      });
    }
    this.remoteBullets = [];
    for (let i = 0; i < 60; i++) {
      this.remoteBullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '', r: 3 });
    }
  }

  updateFromStates(remoteStates, localGalaxy) {
    const seen = new Set();
    for (const [peerId, state] of remoteStates) {
      if (state.view !== 'space' || state.galaxy !== localGalaxy) continue;
      seen.add(peerId);
      let rs = this.pool.find(s => s.active && s.peerId === peerId);
      if (!rs) {
        rs = this.pool.find(s => !s.active);
        if (!rs) continue;
        rs.active = true;
        rs.peerId = peerId;
        rs.x = state.x;
        rs.y = state.y;
      }
      rs.targetX = state.x;
      rs.targetY = state.y;
      rs.targetAngle = state.angle || 0;
      rs.thrust = state.thrust || false;
      rs.health = state.health || 100;
      rs.maxHealth = state.maxHealth || 100;
      rs.hijacked = state.hijacked || null;
      rs.name = state.name || 'Player';

      if (state.bullets) {
        for (const sb of state.bullets) {
          const b = this.remoteBullets.find(b => !b.active);
          if (!b) break;
          b.active = true;
          b.x = sb.x; b.y = sb.y;
          b.vx = sb.vx; b.vy = sb.vy;
          b.life = sb.life || 1.5;
          b.color = sb.color || '#ff4444';
          b.r = sb.r || 3;
          b.damage = sb.damage || 10;
        }
      }
    }
    for (const rs of this.pool) {
      if (rs.active && !seen.has(rs.peerId)) rs.active = false;
    }
  }

  update(dt) {
    const lerp = 15 * dt;
    for (const rs of this.pool) {
      if (!rs.active) continue;
      rs.x += (rs.targetX - rs.x) * lerp;
      rs.y += (rs.targetY - rs.y) * lerp;
      let da = rs.targetAngle - rs.angle;
      if (da > Math.PI) da -= Math.PI * 2;
      if (da < -Math.PI) da += Math.PI * 2;
      rs.angle += da * lerp;
    }
    for (const b of this.remoteBullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) b.active = false;
    }
  }

  checkHits(shipX, shipY, shipRadius, particles, emitFn) {
    let totalDamage = 0;
    for (const b of this.remoteBullets) {
      if (!b.active) continue;
      const dx = b.x - shipX, dy = b.y - shipY;
      if (dx * dx + dy * dy < (b.r + shipRadius) ** 2) {
        b.active = false;
        totalDamage += b.damage || 10;
        if (emitFn) emitFn(particles, b.x, b.y, 5, Math.atan2(dy, dx), 0.3, '#ff2244', 80, 3);
      }
    }
    return totalDamage;
  }

  render(ctx) {
    for (const rs of this.pool) {
      if (!rs.active) continue;
      ctx.save();
      ctx.translate(rs.x, rs.y);
      ctx.rotate(rs.angle + Math.PI / 2);

      if (rs.thrust) {
        const g = ctx.createRadialGradient(0, 14, 2, 0, 14, 14);
        g.addColorStop(0, 'rgba(255,100,50,0.6)');
        g.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 14, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(-12, 14);
      ctx.lineTo(-5, 9);
      ctx.lineTo(0, 12);
      ctx.lineTo(5, 9);
      ctx.lineTo(12, 14);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, -18, 0, 14);
      grad.addColorStop(0, '#ff8844');
      grad.addColorStop(1, '#aa3311');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#ffaa66';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, -5, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcc88';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      const hpPct = rs.health / rs.maxHealth;
      const barW = 30, barH = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(rs.x - barW / 2, rs.y - 28, barW, barH);
      ctx.fillStyle = hpPct > 0.3 ? '#44ff66' : '#ff4444';
      ctx.fillRect(rs.x - barW / 2, rs.y - 28, barW * hpPct, barH);

      ctx.font = '9px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,200,100,0.7)';
      ctx.fillText(rs.name, rs.x, rs.y + 26);
      ctx.textAlign = 'left';
    }

    for (const b of this.remoteBullets) {
      if (!b.active) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
