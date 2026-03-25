export function renderQTEBackground(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0a0015');
  bg.addColorStop(0.5, '#1a0030');
  bg.addColorStop(1, '#050010');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(150, 50, 255, 0.15)';
  ctx.lineWidth = 1;
  const gridY = h * 0.65;
  for (let i = 0; i < 20; i++) {
    const gy = gridY + i * 20;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  for (let i = 0; i < 30; i++) {
    const gx = (i / 30) * w;
    ctx.beginPath();
    ctx.moveTo(gx, gridY);
    ctx.lineTo(gx + (gx - w / 2) * 0.5, h);
    ctx.stroke();
  }

  const barH = h * 0.08;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, barH);
  ctx.fillRect(0, h - barH, w, barH);
}

export function renderVillain(ctx, w, h, villainHealth, villainHit, villainShake) {
  const vx = w * 0.3 + (Math.random() - 0.5) * villainShake;
  const vy = h * 0.45;
  const hitFlash = villainHit > 0;

  ctx.fillStyle = hitFlash ? '#ff6666' : '#220033';
  ctx.beginPath();
  ctx.moveTo(vx - 30, vy + 10);
  ctx.lineTo(vx - 45, vy + 70);
  ctx.lineTo(vx - 20, vy + 60);
  ctx.lineTo(vx, vy + 75);
  ctx.lineTo(vx + 20, vy + 60);
  ctx.lineTo(vx + 45, vy + 70);
  ctx.lineTo(vx + 30, vy + 10);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(vx, vy, 32, 0, Math.PI * 2);
  ctx.fillStyle = hitFlash ? '#ffaaaa' : '#442255';
  ctx.fill();

  const eyeGlow = ctx.createRadialGradient(vx - 10, vy - 5, 1, vx - 10, vy - 5, 10);
  eyeGlow.addColorStop(0, '#ff0000');
  eyeGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = eyeGlow;
  ctx.fillRect(vx - 20, vy - 15, 20, 20);
  const eyeGlow2 = ctx.createRadialGradient(vx + 10, vy - 5, 1, vx + 10, vy - 5, 10);
  eyeGlow2.addColorStop(0, '#ff0000');
  eyeGlow2.addColorStop(1, 'transparent');
  ctx.fillStyle = eyeGlow2;
  ctx.fillRect(vx, vy - 15, 20, 20);

  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(vx - 10, vy - 5, 4, 0, Math.PI * 2);
  ctx.arc(vx + 10, vy - 5, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hitFlash ? '#ff8888' : '#aa00aa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(vx, vy + 10, 12, 0.3, Math.PI - 0.3);
  ctx.stroke();

  ctx.fillStyle = hitFlash ? '#ff8888' : '#660066';
  ctx.beginPath();
  ctx.moveTo(vx - 20, vy - 25);
  ctx.lineTo(vx - 30, vy - 55);
  ctx.lineTo(vx - 10, vy - 28);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(vx + 20, vy - 25);
  ctx.lineTo(vx + 30, vy - 55);
  ctx.lineTo(vx + 10, vy - 28);
  ctx.closePath();
  ctx.fill();

  const hbW = 80, hbH = 8;
  const hbX = vx - hbW / 2, hbY = vy + 82;
  ctx.fillStyle = '#220022';
  ctx.fillRect(hbX, hbY, hbW, hbH);
  const hpPct = villainHealth / 150;
  const hpColor = hpPct > 0.5 ? '#ff4444' : hpPct > 0.25 ? '#ff8800' : '#ff0000';
  ctx.fillStyle = hpColor;
  ctx.fillRect(hbX, hbY, hbW * hpPct, hbH);
  ctx.strokeStyle = '#aa0044';
  ctx.lineWidth = 1;
  ctx.strokeRect(hbX, hbY, hbW, hbH);

  ctx.font = '10px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6666';
  ctx.fillText('DARK LORD VEXOR', vx, hbY + 20);
}

export function renderPlayer(ctx, w, h, playerPunch, playerHit, playerHealth) {
  const px = w * 0.7 - (playerPunch > 0 ? 30 : 0);
  const py = h * 0.45;
  const hit = playerHit > 0;

  ctx.beginPath();
  ctx.arc(px, py, 26, 0, Math.PI * 2);
  if (hit) {
    ctx.fillStyle = '#ff6666';
  } else {
    const pg = ctx.createRadialGradient(px - 5, py - 5, 3, px, py, 26);
    pg.addColorStop(0, '#66ccff');
    pg.addColorStop(1, '#2255aa');
    ctx.fillStyle = pg;
  }
  ctx.fill();

  ctx.beginPath();
  ctx.arc(px, py - 5, 9, 0, Math.PI * 2);
  ctx.fillStyle = hit ? '#ffaaaa' : '#aaeeff';
  ctx.fill();

  if (playerPunch > 0) {
    ctx.fillStyle = '#66ccff';
    ctx.beginPath();
    ctx.arc(px - 30, py, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aaeeff';
    ctx.beginPath();
    ctx.arc(px - 30, py, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (playerHealth !== undefined) {
    const hbW = 80, hbH = 8;
    const hbX = w * 0.7 - hbW / 2, hbY = py + 42;
    ctx.fillStyle = '#001122';
    ctx.fillRect(hbX, hbY, hbW, hbH);
    const hpPct = playerHealth / 80;
    ctx.fillStyle = hpPct > 0.5 ? '#44ff66' : hpPct > 0.25 ? '#ffaa22' : '#ff4444';
    ctx.fillRect(hbX, hbY, hbW * hpPct, hbH);
    ctx.strokeStyle = '#2266aa';
    ctx.lineWidth = 1;
    ctx.strokeRect(hbX, hbY, hbW, hbH);
    ctx.font = '10px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#66ccff';
    ctx.fillText('YOU', w * 0.7, hbY + 20);
  }
}

export function renderYButton(ctx, w, h, pulse, yButtonRect) {
  const btnSize = 70;
  const bx = w / 2 - btnSize / 2;
  const by = h * 0.92 + 10;
  yButtonRect.x = bx;
  yButtonRect.y = by;
  yButtonRect.w = btnSize;
  yButtonRect.h = btnSize;

  const s = 0.9 + (pulse - 1) * 0.1;
  ctx.save();
  ctx.translate(bx + btnSize / 2, by + btnSize / 2);
  ctx.scale(s, s);

  ctx.fillStyle = 'rgba(255, 255, 68, 0.25)';
  ctx.beginPath();
  ctx.roundRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 16);
  ctx.fill();
  ctx.strokeStyle = '#ffff44';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-btnSize / 2, -btnSize / 2, btnSize, btnSize, 16);
  ctx.stroke();

  ctx.font = 'bold 36px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffff44';
  ctx.fillText('Y', 0, 12);
  ctx.restore();
}

export function renderIntroUI(ctx, w, h, timer, fadeIn, yButtonRect) {
  ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff44ff';
  ctx.fillText('PIXEL ARENA', w / 2, h * 0.15);
  ctx.font = '18px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = '#aaaacc';
  ctx.fillText('BOSS FIGHT', w / 2, h * 0.15 + 30);

  if (timer > 1.5) {
    const pulse = 0.7 + Math.sin(timer * 6) * 0.3;
    ctx.globalAlpha = pulse * fadeIn;
    ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffff44';
    ctx.fillText('PRESS Y TO START!', w / 2, h * 0.82);
    renderYButton(ctx, w, h, pulse, yButtonRect);
    ctx.globalAlpha = fadeIn;
  }
}

export function renderFightUI(ctx, w, h, state) {
  const { power, maxPower, timeLimit, fightTimer, comboCount, yPromptPulse, yButtonRect } = state;
  const barW = w * 0.4, barHt = 24;
  const barX = w / 2 - barW / 2, barY = h * 0.88;
  ctx.fillStyle = '#110022';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barHt, 6);
  ctx.fill();

  const pct = power / maxPower;
  const powerColor = pct > 0.8 ? '#ff4444' : pct > 0.5 ? '#ffaa22' : '#44aaff';
  const powerGrad = ctx.createLinearGradient(barX, barY, barX + barW * pct, barY);
  powerGrad.addColorStop(0, powerColor);
  powerGrad.addColorStop(1, '#ffffff');
  ctx.fillStyle = powerGrad;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * pct, barHt, 6);
  ctx.fill();

  ctx.strokeStyle = '#6644aa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barHt, 6);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 68, 68, 0.6)';
  ctx.setLineDash([4, 4]);
  const threshX = barX + barW * 0.8;
  ctx.beginPath();
  ctx.moveTo(threshX, barY - 4);
  ctx.lineTo(threshX, barY + barHt + 4);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '12px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#aaaacc';
  ctx.fillText('POWER', w / 2, barY - 6);

  const remaining = Math.max(0, timeLimit - fightTimer);
  ctx.font = 'bold 20px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = remaining < 5 ? '#ff4444' : '#ffaa44';
  ctx.fillText(Math.ceil(remaining) + 's', w / 2, h * 0.12);

  if (comboCount > 3) {
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ffdd44';
    ctx.fillText(comboCount + ' COMBO!', w * 0.7, h * 0.35);
  }

  const pulse = 1 + yPromptPulse * 2;
  ctx.save();
  ctx.translate(w / 2, h * 0.75);
  ctx.scale(pulse, pulse);
  ctx.font = 'bold 32px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = '#ffff44';
  ctx.fillText('SPAM Y!', 0, 0);
  ctx.restore();

  renderYButton(ctx, w, h, pulse, yButtonRect);
}

export function renderEndUI(ctx, w, h, isWin) {
  ctx.font = 'bold 36px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = isWin ? '#44ff44' : '#ff4444';
  ctx.fillText(isWin ? 'VICTORY!' : 'DEFEATED', w / 2, h * 0.3);
  ctx.font = '18px -apple-system, system-ui, sans-serif';
  ctx.fillStyle = isWin ? '#aaffaa' : '#ffaaaa';
  const msg = isWin ? 'Dark Lord Vexor has been defeated!' : 'You were too slow...';
  ctx.fillText(msg, w / 2, h * 0.3 + 35);
}

export function renderSpeechBubble(ctx, w, h, villainLine, villainLineTimer) {
  if (villainLineTimer <= 0 || !villainLine) return;
  const vx = w * 0.3, vy = h * 0.25;
  const tw = villainLine.length * 8 + 20;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.beginPath();
  ctx.roundRect(vx - tw / 2, vy - 18, tw, 36, 10);
  ctx.fill();
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6666';
  ctx.fillText(villainLine, vx, vy + 5);
}
