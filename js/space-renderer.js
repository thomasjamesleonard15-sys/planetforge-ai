const LAND_RANGE = 1.6;

export function renderSpaceWorld(ctx, view) {
  // Pitch-black deep space
  const bg = ctx.createRadialGradient(view.screenW / 2, view.screenH / 2, 0, view.screenW / 2, view.screenH / 2, Math.max(view.screenW, view.screenH));
  bg.addColorStop(0, '#020208');
  bg.addColorStop(0.5, '#010104');
  bg.addColorStop(1, '#000000');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, view.screenW, view.screenH);

  // Nebula clouds (parallax — slowest)
  const t = Date.now() / 10000;
  ctx.save();
  const neb1X = (view.screenW * 0.3 - view.shipVX * 0.005 + Math.sin(t) * 30);
  const neb1Y = (view.screenH * 0.3 - view.shipVY * 0.005);
  const neb1 = ctx.createRadialGradient(neb1X, neb1Y, 20, neb1X, neb1Y, 250);
  neb1.addColorStop(0, 'rgba(60, 20, 100, 0.12)');
  neb1.addColorStop(0.5, 'rgba(30, 10, 60, 0.05)');
  neb1.addColorStop(1, 'rgba(20, 5, 40, 0)');
  ctx.fillStyle = neb1;
  ctx.fillRect(0, 0, view.screenW, view.screenH);

  const neb2X = (view.screenW * 0.7 - view.shipVX * 0.004 - Math.cos(t * 0.8) * 40);
  const neb2Y = (view.screenH * 0.6 - view.shipVY * 0.004);
  const neb2 = ctx.createRadialGradient(neb2X, neb2Y, 20, neb2X, neb2Y, 220);
  neb2.addColorStop(0, 'rgba(30, 60, 110, 0.1)');
  neb2.addColorStop(0.5, 'rgba(10, 25, 60, 0.04)');
  neb2.addColorStop(1, 'rgba(5, 10, 30, 0)');
  ctx.fillStyle = neb2;
  ctx.fillRect(0, 0, view.screenW, view.screenH);

  const neb3X = (view.screenW * 0.5 - view.shipVX * 0.003 + Math.sin(t * 0.5) * 50);
  const neb3Y = (view.screenH * 0.8 - view.shipVY * 0.003);
  const neb3 = ctx.createRadialGradient(neb3X, neb3Y, 20, neb3X, neb3Y, 180);
  neb3.addColorStop(0, 'rgba(100, 30, 60, 0.08)');
  neb3.addColorStop(1, 'rgba(40, 10, 20, 0)');
  ctx.fillStyle = neb3;
  ctx.fillRect(0, 0, view.screenW, view.screenH);
  ctx.restore();

  // Parallax stars — 3 layers
  for (const s of view.stars) {
    const layer = s.r > 1.2 ? 0.04 : s.r > 0.8 ? 0.025 : 0.012;
    const sx = ((s.x - view.shipVX * layer) % view.screenW + view.screenW) % view.screenW;
    const sy = ((s.y - view.shipVY * layer) % view.screenH + view.screenH) % view.screenH;
    const twinkle = s.a * (0.7 + Math.sin(t * 50 + s.x * 0.1) * 0.3);
    // Glow halo
    if (s.r > 1) {
      ctx.beginPath();
      ctx.arc(sx, sy, s.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.15})`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${twinkle})`;
    ctx.fill();
  }

  // Portal
  const pp = view.portal;
  ctx.save();
  ctx.translate(pp.x, pp.y);
  // Outer glow
  const glow = ctx.createRadialGradient(0, 0, pp.radius * 0.3, 0, 0, pp.radius * 1.5);
  glow.addColorStop(0, 'rgba(150, 80, 255, 0.3)');
  glow.addColorStop(0.5, 'rgba(100, 50, 200, 0.15)');
  glow.addColorStop(1, 'rgba(80, 30, 160, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, pp.radius * 1.5, 0, Math.PI * 2);
  ctx.fill();
  // Swirl rings
  for (let r = 0; r < 4; r++) {
    ctx.beginPath();
    const ringR = pp.radius * (0.4 + r * 0.2);
    const startA = pp.rot + r * 0.8;
    ctx.arc(0, 0, ringR, startA, startA + Math.PI * 1.2);
    ctx.strokeStyle = `rgba(${150 + r * 25}, ${80 + r * 20}, 255, ${0.6 - r * 0.1})`;
    ctx.lineWidth = 3 - r * 0.5;
    ctx.stroke();
  }
  // Center void
  const voidGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, pp.radius * 0.4);
  voidGrad.addColorStop(0, '#1a0a2a');
  voidGrad.addColorStop(1, 'rgba(80, 30, 160, 0.5)');
  ctx.fillStyle = voidGrad;
  ctx.beginPath();
  ctx.arc(0, 0, pp.radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Sparkles
  for (let s = 0; s < 6; s++) {
    const sa = pp.rot * 1.5 + s * Math.PI / 3;
    const sr = pp.radius * (0.5 + Math.sin(pp.rot * 3 + s) * 0.3);
    ctx.fillStyle = `rgba(200, 150, 255, ${0.5 + Math.sin(pp.rot * 4 + s) * 0.3})`;
    ctx.beginPath();
    ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Label
  ctx.font = '13px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = view.nearPortal ? '#cc88ff' : '#7755aa';
  ctx.fillText('🌀 Galaxy Portal', pp.x, pp.y + pp.radius + 16);
  if (view.nearPortal) {
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, pp.radius * 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150, 80, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.textAlign = 'left';

  // Planets
  for (let i = 0; i < view.planets.length; i++) {
    const p = view.planets[i];
    p.x = p.spaceX;
    p.y = p.spaceY;
    p.render(ctx);
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = i === view.landTarget ? '#88ff88' : '#7788aa';
    ctx.fillText(p.name, p.spaceX, p.spaceY + p.radius + 18);
    if (i === view.landTarget) {
      ctx.beginPath();
      ctx.arc(p.spaceX, p.spaceY, p.radius * LAND_RANGE, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,255,100,0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.textAlign = 'left';

  // Black hole
  if (view.blackHole) {
    const bh = view.blackHole;
    ctx.save();
    ctx.translate(bh.x, bh.y);
    const outerGlow = ctx.createRadialGradient(0, 0, bh.radius * 0.2, 0, 0, bh.radius * 2);
    outerGlow.addColorStop(0, 'rgba(40, 0, 80, 0.9)');
    outerGlow.addColorStop(0.4, 'rgba(80, 20, 160, 0.4)');
    outerGlow.addColorStop(1, 'rgba(60, 0, 120, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, bh.radius * 2, 0, Math.PI * 2);
    ctx.fill();
    for (let r = 0; r < 6; r++) {
      ctx.beginPath();
      const ringR = bh.radius * (0.3 + r * 0.15);
      const startA = bh.rot * (1 + r * 0.3) + r * 1.2;
      ctx.arc(0, 0, ringR, startA, startA + Math.PI * 1.5);
      ctx.strokeStyle = `rgba(${120 + r * 20}, ${40 + r * 15}, 255, ${0.7 - r * 0.08})`;
      ctx.lineWidth = 3 - r * 0.3;
      ctx.stroke();
    }
    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, bh.radius * 0.3);
    core.addColorStop(0, '#000000');
    core.addColorStop(1, 'rgba(20, 0, 40, 0.8)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, bh.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cc66ff';
    ctx.fillText('??? BLACK HOLE ???', bh.x, bh.y + bh.radius + 20);
    ctx.textAlign = 'left';
  }

  // Asteroids with shading and craters
  for (const a of view.asteroids) {
    if (!a.active) continue;
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.beginPath();
    const n = a.vertices.length;
    for (let i = 0; i <= n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const dist = a.r * a.vertices[i % n];
      const px = Math.cos(ang) * dist;
      const py = Math.sin(ang) * dist;
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.closePath();
    // Shaded fill
    const grad = ctx.createRadialGradient(-a.r * 0.3, -a.r * 0.3, a.r * 0.1, 0, 0, a.r * 1.2);
    grad.addColorStop(0, '#a89880');
    grad.addColorStop(0.5, '#665544');
    grad.addColorStop(1, '#332211');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#443322';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Craters
    const craterCount = 3;
    for (let i = 0; i < craterCount; i++) {
      const ca = (i * 2.1) + 0.7;
      const cd = a.r * 0.4;
      const cx = Math.cos(ca) * cd;
      const cy = Math.sin(ca) * cd;
      const cr = a.r * (0.1 + (i % 2) * 0.05);
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 10, 0, 0.4)';
      ctx.fill();
    }
    ctx.restore();
  }

  // Bullets with multi-layer glow
  for (const b of view.bullets) {
    if (!b.active) continue;
    // Outer halo
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 5, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    // Mid glow
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    // Trail
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(b.x - b.vx * 0.012, b.y - b.vy * 0.012, b.r * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    // Core
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Aliens
  view.aliens.render(ctx);

  // Enemy bullets with red glow
  for (const b of view.enemyBullets) {
    if (!b.active) continue;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0022';
    ctx.fill();
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2244';
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffaaaa';
    ctx.fill();
  }

  // Particles
  for (const p of view.particles) {
    if (!p.active) continue;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function renderShip(ctx, view) {
  ctx.save();
  ctx.translate(view.shipX, view.shipY);
  ctx.rotate(view.shipAngle + Math.PI / 2);

  if (view.shipThrust) {
    // Outer flame
    const g0 = ctx.createRadialGradient(0, 18, 2, 0, 18, 28);
    g0.addColorStop(0, 'rgba(255,200,80,0.6)');
    g0.addColorStop(0.4, 'rgba(255,100,30,0.3)');
    g0.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g0;
    ctx.beginPath();
    ctx.arc(0, 18, 28, 0, Math.PI * 2);
    ctx.fill();
    // Inner flame
    const g = ctx.createRadialGradient(0, 14, 2, 0, 14, 16);
    g.addColorStop(0, 'rgba(255,255,200,0.95)');
    g.addColorStop(0.3, 'rgba(255,180,80,0.8)');
    g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 14 + Math.random() * 3, 14 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
    // Hot core
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(0, 12, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (view.hijacked) {
    const h = view.hijacked;
    const r = h.radius;
    // Hijacked alien body with player cockpit color
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6);
    ctx.lineTo(-r * 0.4, -r * 0.3);
    ctx.lineTo(r * 0.4, -r * 0.3);
    ctx.lineTo(r, r * 0.6);
    ctx.closePath();
    ctx.fillStyle = h.color;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(-r * 0.5, r * 0.5);
    ctx.lineTo(0, r * 0.3);
    ctx.lineTo(r * 0.5, r * 0.5);
    ctx.closePath();
    ctx.fillStyle = h.color;
    ctx.fill();
    ctx.strokeStyle = '#88ddff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Player cockpit
    ctx.beginPath();
    ctx.arc(0, -r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#66ccff';
    ctx.fill();
    // Timer ring
    const pct = view.hijackTimer / 15;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
    ctx.strokeStyle = `rgba(100,200,255,${0.3 + pct * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    // Hull shadow underneath
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Main hull
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-15, 16);
    ctx.lineTo(-6, 10);
    ctx.lineTo(0, 14);
    ctx.lineTo(6, 10);
    ctx.lineTo(15, 16);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-15, 0, 15, 0);
    grad.addColorStop(0, '#1a3a66');
    grad.addColorStop(0.4, '#66ccff');
    grad.addColorStop(0.6, '#88ddff');
    grad.addColorStop(1, '#1a3a66');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#aaeeff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Wing accents
    ctx.fillStyle = '#1a2a44';
    ctx.beginPath();
    ctx.moveTo(-12, 12);
    ctx.lineTo(-15, 16);
    ctx.lineTo(-8, 14);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 12);
    ctx.lineTo(15, 16);
    ctx.lineTo(8, 14);
    ctx.closePath();
    ctx.fill();
    // Hull stripe
    ctx.strokeStyle = '#ffaa44';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 8);
    ctx.stroke();
    // Cockpit glow
    ctx.beginPath();
    ctx.arc(0, -6, 7, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(170, 238, 255, 0.4)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    const cg = ctx.createRadialGradient(-1, -8, 0, 0, -6, 5);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.5, '#aaeeff');
    cg.addColorStop(1, '#4488cc');
    ctx.fillStyle = cg;
    ctx.fill();
    // Highlight
    ctx.beginPath();
    ctx.arc(-2, -8, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  ctx.restore();

  // EVA character
  if (view.eva) {
    // Parked ship indicator
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(view.parkedShipX, view.parkedShipY, 24, 0, Math.PI * 2);
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // EVA astronaut
    const ex = view.evaX, ey = view.evaY;
    ctx.beginPath();
    ctx.arc(ex, ey, view.evaRadius, 0, Math.PI * 2);
    const eg = ctx.createRadialGradient(ex - 2, ey - 2, 2, ex, ey, view.evaRadius);
    eg.addColorStop(0, '#66ccff');
    eg.addColorStop(1, '#2255aa');
    ctx.fillStyle = eg;
    ctx.fill();
    ctx.strokeStyle = '#88ddff';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Visor
    ctx.beginPath();
    ctx.arc(ex, ey - 3, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#aaeeff';
    ctx.fill();
    // Jetpack glow
    if (Math.abs(view.evaVX) > 5 || Math.abs(view.evaVY) > 5) {
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(ex, ey + 8, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff8833';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Mining indicator
    if (view.miningTarget >= 0) {
      const a = view.asteroids[view.miningTarget];
      if (a && a.active) {
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffaa44';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        // Mining progress bar
        const pct = view.miningTimer / 1.5;
        const bw = 40;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(a.x - bw / 2, a.y - a.r - 14, bw, 6);
        ctx.fillStyle = '#ffaa44';
        ctx.fillRect(a.x - bw / 2, a.y - a.r - 14, bw * pct, 6);
        ctx.font = '10px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffdd88';
        ctx.fillText('Mining...', a.x, a.y - a.r - 18);
        ctx.textAlign = 'left';
      }
    }

    // Tether line to ship
    ctx.strokeStyle = 'rgba(100,150,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(view.parkedShipX, view.parkedShipY);
    ctx.stroke();
  }
}

export function renderSpaceHUD(ctx, view) {
  const w = view.screenW;
  const h = view.screenH;

  ctx.fillStyle = 'rgba(10,10,30,0.85)';
  ctx.fillRect(0, 0, w, 52);
  ctx.font = `${Math.min(20, w * 0.03)}px -apple-system, system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#dde';
  ctx.fillText(`☄️ Score: ${view.score}`, 16, 28);
  ctx.fillText(`⛏️ Metal: ${view.metal}`, 200, 28);
  ctx.fillStyle = '#ff6666';
  ctx.fillText(`👾 Wave ${view.aliens.wave}`, 380, 28);
  const fuelColor = view.fuel > 20 ? '#44ff88' : view.fuel > 5 ? '#ffaa44' : '#ff4444';
  ctx.fillStyle = fuelColor;
  ctx.fillText(`⛽ ${view.fuel | 0}%`, 530, 28);
  ctx.fillStyle = '#dde';
  ctx.fillStyle = view.weapon.color;
  ctx.fillText(`🔫 ${view.weapon.name}`, w - 180, 28);

  const bw = 140;
  const bx = w / 2 - bw / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, 16, bw, 12);
  const hpPct = view.shipHealth / view.upgrades.getMaxHp();
  ctx.fillStyle = hpPct > 0.3 ? '#44ff66' : '#ff4444';
  ctx.fillRect(bx, 16, bw * hpPct, 12);
  ctx.strokeStyle = 'rgba(100,120,255,0.3)';
  ctx.strokeRect(bx, 16, bw, 12);
  ctx.fillStyle = '#fff';
  ctx.font = '10px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`HP ${view.shipHealth | 0}`, w / 2, 23);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const btnS = 56;
  const btnX = w - btnS - 16;
  const btnY = h - btnS - 90;
  ctx.fillStyle = '#334';
  ctx.strokeStyle = view.weapon.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnS, btnS, 10);
  ctx.fill();
  ctx.stroke();
  ctx.font = '24px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('🔄', btnX + btnS / 2, btnY + btnS / 2 + 8);
  ctx.textAlign = 'left';

  // Upgrade button
  const upgBtnY = btnY - btnS - 12;
  ctx.fillStyle = view.upgrades.showMenu ? '#445588' : '#334';
  ctx.strokeStyle = '#88aaff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(btnX, upgBtnY, btnS, btnS, 10);
  ctx.fill();
  ctx.stroke();
  ctx.font = '24px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('⬆', btnX + btnS / 2, upgBtnY + btnS / 2 + 8);
  ctx.textAlign = 'left';

  if (view.landTarget >= 0) {
    const lbw = 160;
    const lbh = 44;
    const lbx = w / 2 - lbw / 2;
    const lby = h - 70;
    ctx.fillStyle = 'rgba(30, 100, 50, 0.9)';
    ctx.beginPath();
    ctx.roundRect(lbx, lby, lbw, lbh, 10);
    ctx.fill();
    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ccffcc';
    ctx.fillText(`⏎ Land on ${view.planets[view.landTarget].name}`, w / 2, lby + lbh / 2 + 6);
    ctx.textAlign = 'left';
  }

  // Board button
  if (view.boardTarget >= 0) {
    const alien = view.aliens.pool[view.boardTarget];
    const bbw = 160, bbh = 44;
    const bbx = w / 2 - bbw / 2;
    const bby = view.landTarget >= 0 ? h - 130 : h - 70;
    ctx.fillStyle = 'rgba(120, 40, 120, 0.9)';
    ctx.beginPath();
    ctx.roundRect(bbx, bby, bbw, bbh, 10);
    ctx.fill();
    ctx.strokeStyle = alien.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffccff';
    ctx.fillText('⏎ Board Ship', w / 2, bby + bbh / 2 + 6);
    ctx.textAlign = 'left';
    // Indicator ring on the alien
    ctx.beginPath();
    ctx.arc(alien.x, alien.y, alien.radius + 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,100,255,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Warp button when near portal
  if (view.nearPortal) {
    const wbw = 160, wbh = 44;
    const wbx = w / 2 - wbw / 2, wby = h - 130;
    ctx.fillStyle = 'rgba(80, 30, 120, 0.9)';
    ctx.beginPath();
    ctx.roundRect(wbx, wby, wbw, wbh, 10);
    ctx.fill();
    ctx.strokeStyle = '#aa66ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ddccff';
    ctx.fillText('⏎ Warp Galaxy', w / 2, wby + wbh / 2 + 6);
    ctx.textAlign = 'left';
  }

  // Hijack status
  if (view.hijacked) {
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = view.hijacked.color;
    ctx.fillText(`🏴‍☠️ HIJACKED — ${view.hijackTimer.toFixed(1)}s`, w / 2, 48);
    ctx.textAlign = 'left';
  }

  // EVA button
  if (!view.eva && !view.gameOver) {
    const ebw = 100, ebh = 36;
    const ebx = 12, eby = h - ebh - 16;
    view.evaBtnRect = { x: ebx, y: eby, w: ebw, h: ebh };
    ctx.fillStyle = 'rgba(30, 60, 80, 0.9)';
    ctx.beginPath(); ctx.roundRect(ebx, eby, ebw, ebh, 8); ctx.fill();
    ctx.strokeStyle = '#44aaff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#88ccff';
    ctx.fillText('🧑‍🚀 EVA', ebx + ebw / 2, eby + ebh / 2 + 5);
    ctx.textAlign = 'left';
  } else {
    view.evaBtnRect = { x: 0, y: 0, w: 0, h: 0 };
  }

  // Board ship button
  if (view.eva) {
    const dx = view.evaX - view.parkedShipX, dy = view.evaY - view.parkedShipY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 60) {
      const bsw = 140, bsh = 40;
      const bsx = w / 2 - bsw / 2, bsy = h - bsh - 70;
      view.boardShipRect = { x: bsx, y: bsy, w: bsw, h: bsh };
      ctx.fillStyle = 'rgba(30, 80, 50, 0.9)';
      ctx.beginPath(); ctx.roundRect(bsx, bsy, bsw, bsh, 8); ctx.fill();
      ctx.strokeStyle = '#44ff88';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ccffcc';
      ctx.fillText('⏎ Board Ship', bsx + bsw / 2, bsy + bsh / 2 + 5);
      ctx.textAlign = 'left';
    } else {
      view.boardShipRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#88ccff';
    ctx.fillText('EVA MODE — Mine asteroids!', w / 2, h - 16);
    ctx.textAlign = 'left';
  }

  if (view.joystickActive) {
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(view.joystickOX, view.joystickOY, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(view.joystickOX + view.joyX * 40, view.joystickOY + view.joyY * 40, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#aaccff';
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (view.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 36px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff4444';
    ctx.fillText('SHIP DESTROYED', w / 2, h / 2 - 30);
    ctx.font = '20px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#aab';
    ctx.fillText(`Score: ${view.score}  Metal: ${view.metal}`, w / 2, h / 2 + 10);
    ctx.fillText('Tap to respawn at home', w / 2, h / 2 + 40);
    ctx.textAlign = 'left';
  }

  // Upgrade menu (on top of everything)
  view.upgrades.render(ctx, w, h, view.metal);
}
