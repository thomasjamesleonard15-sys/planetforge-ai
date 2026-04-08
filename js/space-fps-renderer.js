const FOV = Math.PI / 2.5;

export function renderSpaceFPS(ctx, view) {
  const w = view.screenW;
  const h = view.screenH;
  const cx = w / 2;
  const cy = h / 2;
  const focal = (w / 2) / Math.tan(FOV / 2);

  // Background — deep space
  const bg = ctx.createRadialGradient(cx, cy, 50, cx, cy, Math.max(w, h));
  bg.addColorStop(0, '#0a0820');
  bg.addColorStop(0.5, '#050510');
  bg.addColorStop(1, '#020208');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const angle = view.shipAngle;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  // Helper: project world point relative to ship
  function project(wx, wy) {
    const dx = wx - view.shipX;
    const dy = wy - view.shipY;
    // Ship looks along angle, so forward = (cosA, sinA), right = (-sinA, cosA)
    const forward = dx * cosA + dy * sinA;
    const right = -dx * sinA + dy * cosA;
    if (forward < 5) return null;
    const sx = cx + (right * focal) / forward;
    return { sx, depth: forward };
  }

  // Stars — generated from view.stars but projected
  const t = Date.now() / 1000;
  for (const s of view.stars) {
    // Treat stars as faraway points around the ship at fixed angles
    const sa = (s.x / w) * Math.PI * 2;
    const sd = 1000 + (s.y / h) * 2000;
    const wx = view.shipX + Math.cos(sa) * sd;
    const wy = view.shipY + Math.sin(sa) * sd;
    const p = project(wx, wy);
    if (!p) continue;
    const ssize = (s.r * focal * 0.3) / Math.max(p.depth, 100);
    if (p.sx < -5 || p.sx > w + 5) continue;
    const screenY = cy + Math.sin(s.x * 0.013 + s.y * 0.007) * h * 0.4;
    ctx.beginPath();
    ctx.arc(p.sx, screenY, Math.max(0.5, ssize), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.fill();
  }

  // Streaking stars when moving fast (warp lines)
  const speed = Math.sqrt(view.shipVX * view.shipVX + view.shipVY * view.shipVY);
  if (speed > 50) {
    const streakCount = 30;
    for (let i = 0; i < streakCount; i++) {
      const sa = (i / streakCount) * Math.PI * 2 + t * 0.1;
      const sd = 200 + ((i * 73) % 800);
      const ssx = cx + Math.cos(sa) * sd * 0.3;
      const ssy = cy + Math.sin(sa) * sd * 0.3;
      const len = speed * 0.1;
      const dx = (ssx - cx) / sd * len;
      const dy = (ssy - cy) / sd * len;
      ctx.strokeStyle = `rgba(180, 200, 255, ${Math.min(0.8, speed / 300)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ssx, ssy);
      ctx.lineTo(ssx + dx, ssy + dy);
      ctx.stroke();
    }
  }

  // Collect renderable objects
  const sprites = [];
  for (const a of view.asteroids) {
    if (!a.active) continue;
    sprites.push({ type: 'asteroid', x: a.x, y: a.y, r: a.r, color: '#776655', a });
  }
  for (const a of view.aliens.pool) {
    if (!a.active) continue;
    sprites.push({ type: 'alien', x: a.x, y: a.y, r: a.radius, color: a.color, a });
  }
  for (let i = 0; i < view.planets.length; i++) {
    const p = view.planets[i];
    sprites.push({ type: 'planet', x: p.spaceX, y: p.spaceY, r: p.radius, color: p.colors ? p.colors.ocean : '#3aa3e8', name: p.name, idx: i });
  }
  // Portal
  sprites.push({ type: 'portal', x: view.portal.x, y: view.portal.y, r: view.portal.radius });

  // Project & sort
  for (const sp of sprites) {
    const proj = project(sp.x, sp.y);
    sp.proj = proj;
  }
  sprites.sort((a, b) => (b.proj ? b.proj.depth : 0) - (a.proj ? a.proj.depth : 0));

  for (const sp of sprites) {
    if (!sp.proj) continue;
    const { sx, depth } = sp.proj;
    if (sx < -200 || sx > w + 200) continue;
    const size = (sp.r * 2 * focal) / depth;
    if (size < 1) continue;
    const screenY = cy + (size * 0.05);
    const distFade = Math.max(0.2, 1 - depth / 3000);

    if (sp.type === 'planet') {
      // Big planet sphere
      const grad = ctx.createRadialGradient(sx - size * 0.3, screenY - size * 0.3, size * 0.05, sx, screenY, size);
      grad.addColorStop(0, '#88ddff');
      grad.addColorStop(0.3, '#3aa3e8');
      grad.addColorStop(0.7, sp.color);
      grad.addColorStop(1, '#000511');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, screenY, size, 0, Math.PI * 2);
      ctx.fill();
      // Atmosphere
      const atmo = ctx.createRadialGradient(sx, screenY, size * 0.95, sx, screenY, size * 1.15);
      atmo.addColorStop(0, 'rgba(100, 180, 255, 0.3)');
      atmo.addColorStop(1, 'rgba(100, 180, 255, 0)');
      ctx.fillStyle = atmo;
      ctx.beginPath();
      ctx.arc(sx, screenY, size * 1.15, 0, Math.PI * 2);
      ctx.fill();
      if (size > 30) {
        ctx.font = '12px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = sp.idx === view.landTarget ? '#88ff88' : 'rgba(180,200,220,0.7)';
        ctx.fillText(sp.name, sx, screenY + size + 15);
        ctx.textAlign = 'left';
      }
    } else if (sp.type === 'asteroid') {
      ctx.beginPath();
      ctx.arc(sx, screenY, size, 0, Math.PI * 2);
      const ag = ctx.createRadialGradient(sx - size * 0.3, screenY - size * 0.3, 1, sx, screenY, size);
      ag.addColorStop(0, '#a89880');
      ag.addColorStop(0.5, '#665544');
      ag.addColorStop(1, '#221a10');
      ctx.fillStyle = ag;
      ctx.fill();
      ctx.strokeStyle = '#332211';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (sp.type === 'alien') {
      // Glow
      const glow = ctx.createRadialGradient(sx, screenY, size * 0.5, sx, screenY, size * 1.8);
      glow.addColorStop(0, sp.color + '55');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, screenY, size * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx, screenY, size, 0, Math.PI * 2);
      const ag = ctx.createRadialGradient(sx - size * 0.3, screenY - size * 0.3, 1, sx, screenY, size);
      ag.addColorStop(0, '#fff');
      ag.addColorStop(0.4, sp.color);
      ag.addColorStop(1, '#000');
      ctx.fillStyle = ag;
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx - size * 0.3, screenY - size * 0.2, size * 0.2, 0, Math.PI * 2);
      ctx.arc(sx + size * 0.3, screenY - size * 0.2, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(sx - size * 0.3, screenY - size * 0.2, size * 0.1, 0, Math.PI * 2);
      ctx.arc(sx + size * 0.3, screenY - size * 0.2, size * 0.1, 0, Math.PI * 2);
      ctx.fill();
      // Health bar
      if (sp.a && sp.a.hp < sp.a.maxHp) {
        const bw = size * 1.5;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(sx - bw / 2, screenY - size - 10, bw, 4);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(sx - bw / 2, screenY - size - 10, bw * (sp.a.hp / sp.a.maxHp), 4);
      }
    } else if (sp.type === 'portal') {
      const pg = ctx.createRadialGradient(sx, screenY, size * 0.2, sx, screenY, size * 1.5);
      pg.addColorStop(0, 'rgba(150, 80, 255, 0.5)');
      pg.addColorStop(0.5, 'rgba(80, 30, 160, 0.2)');
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(sx, screenY, size * 1.5, 0, Math.PI * 2);
      ctx.fill();
      for (let r = 0; r < 4; r++) {
        ctx.beginPath();
        ctx.arc(sx, screenY, size * (0.5 + r * 0.2), t * 2 + r * 0.8, t * 2 + r * 0.8 + Math.PI * 1.2);
        ctx.strokeStyle = `rgba(${150 + r * 25}, ${80 + r * 20}, 255, ${0.6 - r * 0.1})`;
        ctx.lineWidth = 3 - r * 0.5;
        ctx.stroke();
      }
    }
  }

  // Player bullets — projected
  for (const b of view.bullets) {
    if (!b.active) continue;
    const proj = project(b.x, b.y);
    if (!proj) continue;
    const size = (b.r * 4 * focal) / proj.depth;
    if (size < 0.5) continue;
    const screenY = cy + size * 0.1;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(proj.sx, screenY, size * 2, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(proj.sx, screenY, size, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }
  // Enemy bullets
  for (const b of view.enemyBullets) {
    if (!b.active) continue;
    const proj = project(b.x, b.y);
    if (!proj) continue;
    const size = (b.r * 4 * focal) / proj.depth;
    if (size < 0.5) continue;
    const screenY = cy + size * 0.1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(proj.sx, screenY, size * 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ff2244';
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(proj.sx, screenY, size, 0, Math.PI * 2);
    ctx.fillStyle = '#ffaaaa';
    ctx.fill();
  }

  // Cockpit overlay
  drawCockpit(ctx, w, h, view);
}

function drawCockpit(ctx, w, h, view) {
  // Cockpit frame — darker borders
  const frame = ctx.createLinearGradient(0, 0, 0, h);
  frame.addColorStop(0, 'rgba(20, 30, 50, 0.8)');
  frame.addColorStop(0.15, 'rgba(20, 30, 50, 0)');
  frame.addColorStop(0.85, 'rgba(20, 30, 50, 0)');
  frame.addColorStop(1, 'rgba(20, 30, 50, 0.95)');
  ctx.fillStyle = frame;
  ctx.fillRect(0, 0, w, h);

  // Side panels
  const sideL = ctx.createLinearGradient(0, 0, w * 0.18, 0);
  sideL.addColorStop(0, 'rgba(20, 30, 50, 0.95)');
  sideL.addColorStop(1, 'rgba(20, 30, 50, 0)');
  ctx.fillStyle = sideL;
  ctx.fillRect(0, 0, w * 0.18, h);
  const sideR = ctx.createLinearGradient(w * 0.82, 0, w, 0);
  sideR.addColorStop(0, 'rgba(20, 30, 50, 0)');
  sideR.addColorStop(1, 'rgba(20, 30, 50, 0.95)');
  ctx.fillStyle = sideR;
  ctx.fillRect(w * 0.82, 0, w * 0.18, h);

  // Bottom dashboard
  ctx.fillStyle = 'rgba(10, 20, 40, 0.95)';
  ctx.fillRect(0, h - 100, w, 100);
  ctx.strokeStyle = '#4488cc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h - 100);
  ctx.lineTo(w, h - 100);
  ctx.stroke();

  // Dashboard lights
  const cx = w / 2, cy = h / 2;
  ctx.font = '10px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#88ccff';
  ctx.fillText('VEL', 30, h - 80);
  const speed = Math.sqrt(view.shipVX * view.shipVX + view.shipVY * view.shipVY);
  ctx.fillStyle = '#44ff88';
  ctx.fillText((speed | 0) + ' u/s', 30, h - 64);
  ctx.fillStyle = '#88ccff';
  ctx.fillText('FUEL', 100, h - 80);
  ctx.fillStyle = view.fuel > 20 ? '#44ff88' : '#ff4444';
  ctx.fillText((view.fuel | 0) + '%', 100, h - 64);
  ctx.fillStyle = '#88ccff';
  ctx.fillText('HP', 170, h - 80);
  ctx.fillStyle = view.shipHealth > 30 ? '#44ff88' : '#ff4444';
  ctx.fillText((view.shipHealth | 0), 170, h - 64);
  ctx.fillStyle = '#88ccff';
  ctx.fillText('WPN', w - 100, h - 80);
  ctx.fillStyle = view.weapon.color;
  ctx.fillText(view.weapon.name, w - 100, h - 64);

  // Crosshair
  ctx.strokeStyle = 'rgba(100, 255, 150, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy); ctx.lineTo(cx - 14, cy);
  ctx.moveTo(cx + 14, cy); ctx.lineTo(cx + 18, cy);
  ctx.moveTo(cx, cy - 18); ctx.lineTo(cx, cy - 14);
  ctx.moveTo(cx, cy + 14); ctx.lineTo(cx, cy + 18);
  ctx.stroke();
  ctx.fillStyle = '#44ff88';
  ctx.fillRect(cx - 1, cy - 1, 2, 2);

  // Vignette
  const vg = ctx.createRadialGradient(cx, cy, h * 0.3, cx, cy, h * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}
