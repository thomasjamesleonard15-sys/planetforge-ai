const LAND_RANGE = 1.6;

export function renderSpaceWorld(ctx, view) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, view.screenW, view.screenH);

  for (const s of view.stars) {
    const sx = ((s.x - view.shipVX * 0.02) % view.screenW + view.screenW) % view.screenW;
    const sy = ((s.y - view.shipVY * 0.02) % view.screenH + view.screenH) % view.screenH;
    ctx.beginPath();
    ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
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

  // Asteroids
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
    ctx.fillStyle = '#665544';
    ctx.fill();
    ctx.strokeStyle = '#998877';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // Bullets
  for (const b of view.bullets) {
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

  // Aliens
  view.aliens.render(ctx);

  // Enemy bullets
  for (const b of view.enemyBullets) {
    if (!b.active) continue;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0022';
    ctx.fill();
    ctx.globalAlpha = 1;
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
    const g = ctx.createRadialGradient(0, 14, 2, 0, 14, 16);
    g.addColorStop(0, 'rgba(255,136,50,0.8)');
    g.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 14, 16, 0, Math.PI * 2);
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
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-14, 16);
    ctx.lineTo(-6, 10);
    ctx.lineTo(0, 14);
    ctx.lineTo(6, 10);
    ctx.lineTo(14, 16);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, -20, 0, 16);
    grad.addColorStop(0, '#66ccff');
    grad.addColorStop(1, '#2255aa');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#88ddff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -6, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#aaeeff';
    ctx.fill();
  }

  ctx.restore();
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
