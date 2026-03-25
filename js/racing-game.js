const TRACK_LENGTH = 20;
const RING_SPACING = 400;
const SHIP_ACCEL = 600;
const SHIP_MAX_SPEED = 500;
const SHIP_DRAG = 0.985;
const RING_RADIUS = 60;

export class RacingGame {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.done = false;
    this.won = false;
    this.phase = 'countdown';
    this.timer = 0;
    this.countdown = 3;
    this.raceTime = 0;
    this.bestTime = 0;

    this.shipX = screenW / 2;
    this.shipY = screenH * 0.8;
    this.shipVX = 0;
    this.shipVY = 0;
    this.shipAngle = -Math.PI / 2;
    this.boost = 0;

    this.cameraY = 0;
    this.rings = [];
    for (let i = 0; i < TRACK_LENGTH; i++) {
      const wobble = Math.sin(i * 0.7) * (screenW * 0.3);
      this.rings.push({
        x: screenW / 2 + wobble,
        y: -i * RING_SPACING - 200,
        passed: false,
        radius: RING_RADIUS,
      });
    }
    this.ringsHit = 0;
    this.totalRings = TRACK_LENGTH;

    this.joystickActive = false;
    this.joyOX = 0;
    this.joyOY = 0;
    this.joyX = 0;
    this.joyY = 0;

    this.particles = [];
    for (let i = 0; i < 50; i++) {
      this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0, color: '' });
    }

    this.homeBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.score = 0;
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * screenW,
        y: Math.random() * screenH * 3 - screenH * 2,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.6 + 0.2,
      });
    }
  }

  handleTap(sx, sy) {
    if (this.phase === 'finished') {
      const b = this.homeBtnRect;
      if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
        this.done = true;
        this.won = true;
      }
      return;
    }
    if (sx < this.screenW * 0.4) {
      this.joystickActive = true;
      this.joyOX = sx; this.joyOY = sy;
      this.joyX = 0; this.joyY = 0;
    } else {
      this.boost = 0.5;
    }
  }

  handleMove(sx, sy) {
    if (!this.joystickActive) return;
    const dx = sx - this.joyOX, dy = sy - this.joyOY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const c = Math.min(dist, 60);
      this.joyX = (dx / dist) * (c / 60);
      this.joyY = (dy / dist) * (c / 60);
    }
  }

  handleEnd() {
    this.joystickActive = false;
    this.joyX = 0; this.joyY = 0;
  }

  emitTrail() {
    for (const p of this.particles) {
      if (p.life > 0) continue;
      p.x = this.shipX + (Math.random() - 0.5) * 10;
      p.y = this.shipY + 15;
      p.vx = (Math.random() - 0.5) * 30;
      p.vy = 50 + Math.random() * 50;
      p.life = 0.3 + Math.random() * 0.2;
      p.maxLife = p.life;
      p.r = 2 + Math.random() * 3;
      p.color = this.boost > 0 ? '#44ddff' : '#ff8833';
      break;
    }
  }

  update(dt, keyMoveX, keyMoveY) {
    this.timer += dt;

    for (const p of this.particles) {
      if (p.life > 0) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    }

    if (this.phase === 'countdown') {
      this.countdown = Math.max(0, 3 - this.timer);
      if (this.timer >= 3) { this.phase = 'racing'; this.timer = 0; }
      return;
    }

    if (this.phase === 'finished') {
      return;
    }

    this.raceTime += dt;
    let mx = this.joyX + keyMoveX;
    const accel = this.boost > 0 ? SHIP_ACCEL * 1.5 : SHIP_ACCEL;
    this.shipVX += mx * accel * dt;
    this.shipVY -= accel * dt * 0.5;

    if (this.boost > 0) { this.boost -= dt; this.shipVY -= accel * dt * 0.3; }

    const speed = Math.sqrt(this.shipVX * this.shipVX + this.shipVY * this.shipVY);
    if (speed > SHIP_MAX_SPEED) {
      this.shipVX *= SHIP_MAX_SPEED / speed;
      this.shipVY *= SHIP_MAX_SPEED / speed;
    }

    this.shipVX *= SHIP_DRAG;
    this.shipVY *= SHIP_DRAG;
    this.shipX += this.shipVX * dt;
    this.shipY += this.shipVY * dt;

    if (this.shipX < 20) { this.shipX = 20; this.shipVX = Math.abs(this.shipVX) * 0.5; }
    if (this.shipX > this.screenW - 20) { this.shipX = this.screenW - 20; this.shipVX = -Math.abs(this.shipVX) * 0.5; }

    this.cameraY += (this.shipY - this.screenH * 0.7 - this.cameraY) * 8 * dt;

    if (speed > 100) this.emitTrail();

    for (const ring of this.rings) {
      if (ring.passed) continue;
      const ry = ring.y - this.cameraY;
      const dx = this.shipX - ring.x;
      const dy = (this.shipY - this.cameraY) - ry;
      const screenDy = this.shipY - ring.y;
      if (Math.abs(screenDy) < 30 && Math.abs(dx) < ring.radius) {
        ring.passed = true;
        this.ringsHit++;
        this.boost = Math.max(this.boost, 0.3);
        for (let i = 0; i < 8; i++) {
          for (const p of this.particles) {
            if (p.life > 0) continue;
            const a = Math.random() * Math.PI * 2;
            p.x = ring.x; p.y = ring.y;
            p.vx = Math.cos(a) * 100; p.vy = Math.sin(a) * 100;
            p.life = 0.4; p.maxLife = 0.4;
            p.r = 3; p.color = '#44ff88';
            break;
          }
        }
      }
    }

    if (this.ringsHit >= this.totalRings) {
      this.phase = 'finished';
      this.timer = 0;
      this.bestTime = this.raceTime;
      const timeBonus = Math.max(0, Math.floor((60 - this.raceTime) * 100));
      const ringBonus = this.ringsHit * 500;
      const missedPenalty = (this.totalRings - this.ringsHit) * 200;
      this.score = Math.max(0, timeBonus + ringBonus - missedPenalty);
      try {
        const u = new SpeechSynthesisUtterance("Race complete!");
        u.pitch = 0.3; u.rate = 0.7;
        speechSynthesis.speak(u);
      } catch (_) {}
    }
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);

    for (const s of this.stars) {
      const sy = ((s.y - this.cameraY * 0.3) % (h * 3) + h * 3) % (h * 3) - h;
      ctx.beginPath();
      ctx.arc(s.x, sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }

    for (const ring of this.rings) {
      const ry = ring.y - this.cameraY;
      if (ry < -100 || ry > h + 100) continue;
      ctx.beginPath();
      ctx.ellipse(ring.x, ry, ring.radius, ring.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = ring.passed ? 'rgba(68,255,136,0.3)' : '#44ff88';
      ctx.lineWidth = ring.passed ? 1 : 3;
      ctx.stroke();
      if (!ring.passed) {
        ctx.beginPath();
        ctx.ellipse(ring.x, ry, ring.radius + 5, ring.radius * 0.3 + 5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(68,255,136,0.15)';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
    }

    for (const p of this.particles) {
      if (p.life <= 0) continue;
      const py = p.y - this.cameraY;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, py, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const sy = this.shipY - this.cameraY;
    ctx.save();
    ctx.translate(this.shipX, sy);
    const tiltAngle = this.shipVX * 0.002;
    ctx.rotate(tiltAngle);

    if (this.boost > 0) {
      const g = ctx.createRadialGradient(0, 16, 2, 0, 16, 18);
      g.addColorStop(0, 'rgba(68,221,255,0.8)');
      g.addColorStop(1, 'rgba(68,221,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 16, 18, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(-12, 14);
    ctx.lineTo(-5, 9);
    ctx.lineTo(0, 12);
    ctx.lineTo(5, 9);
    ctx.lineTo(12, 14);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, -18, 0, 14);
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
    ctx.restore();

    this.renderHUD(ctx, w, h);
  }

  renderHUD(ctx, w, h) {
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#44ff88';
    ctx.fillText(`${this.ringsHit} / ${this.totalRings} rings`, w / 2, 30);
    ctx.fillStyle = '#ffaa44';
    ctx.fillText(this.raceTime.toFixed(1) + 's', w / 2, 52);

    if (this.boost > 0) {
      ctx.fillStyle = '#44ddff';
      ctx.fillText('BOOST!', w / 2, 75);
    }

    if (this.phase === 'countdown') {
      ctx.font = 'bold 64px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      const num = Math.ceil(this.countdown);
      ctx.fillText(num > 0 ? String(num) : 'GO!', w / 2, h / 2);
    }

    if (this.phase === 'finished') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, h * 0.2, w, h * 0.55);

      ctx.font = 'bold 32px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#44ff88';
      ctx.fillText('RACE COMPLETE!', w / 2, h * 0.30);

      ctx.font = 'bold 48px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#ffdd44';
      ctx.fillText(String(this.score), w / 2, h * 0.40);
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aaaacc';
      ctx.fillText('SCORE', w / 2, h * 0.43);

      ctx.font = '18px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#ffaa44';
      ctx.fillText(`Time: ${this.bestTime.toFixed(2)}s`, w / 2, h * 0.50);
      ctx.fillStyle = '#44ff88';
      ctx.fillText(`Rings: ${this.ringsHit}/${this.totalRings}`, w / 2, h * 0.55);

      const missed = this.totalRings - this.ringsHit;
      if (missed > 0) {
        ctx.fillStyle = '#ff6666';
        ctx.fillText(`Missed: ${missed} (-${missed * 200} pts)`, w / 2, h * 0.60);
      }

      const bw = 180, bh = 48;
      const bx = w / 2 - bw / 2, by = h * 0.65;
      this.homeBtnRect = { x: bx, y: by, w: bw, h: bh };
      ctx.fillStyle = '#22cc44';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      ctx.fill();
      ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('Return Home', w / 2, by + bh / 2 + 6);
    }

    if (this.joystickActive) {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(this.joyOX, this.joyOY, 60, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(this.joyOX + this.joyX * 40, this.joyOY + this.joyY * 40, 25, 0, Math.PI * 2);
      ctx.fillStyle = '#aaccff';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'left';
  }
}
