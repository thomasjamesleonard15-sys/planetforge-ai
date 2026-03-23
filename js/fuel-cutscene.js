const PHASE_SPUTTER = 0;
const PHASE_DRIFT = 1;
const PHASE_TEXT = 2;
const PHASE_DONE = 3;

export class FuelCutscene {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.phase = PHASE_SPUTTER;
    this.timer = 0;
    this.done = false;

    this.shipX = screenW / 2;
    this.shipY = screenH * 0.4;
    this.shipAngle = 0;
    this.sputterTimer = 0;

    this.particles = [];
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * screenW,
        y: Math.random() * screenH,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.5 + 0.1,
      });
    }

    this.spoke = false;
    this.showBubble = 0;
    this.fadeOut = 0;
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;
    if (this.showBubble > 0) this.showBubble -= dt;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    switch (this.phase) {
      case PHASE_SPUTTER:
        this.shipAngle = Math.sin(this.timer * 6) * 0.15;
        this.sputterTimer -= dt;
        if (this.sputterTimer <= 0) {
          this.sputterTimer = 0.2;
          if (Math.random() > 0.4) {
            this.particles.push({
              x: this.shipX + (Math.random() - 0.5) * 10,
              y: this.shipY + 30,
              vx: (Math.random() - 0.5) * 30,
              vy: Math.random() * 20 + 10,
              life: 0.3, maxLife: 0.3, r: 2, color: '#664422',
            });
          }
        }
        if (this.timer > 2) {
          this.phase = PHASE_DRIFT;
          this.timer = 0;
        }
        break;

      case PHASE_DRIFT:
        this.shipAngle *= 0.98;
        this.shipY += 5 * dt;
        if (!this.spoke) {
          this.spoke = true;
          this.showBubble = 3;
          try {
            const u = new SpeechSynthesisUtterance("I need gas!");
            u.pitch = 0.2; u.rate = 0.7; u.volume = 1;
            speechSynthesis.speak(u);
          } catch (_) {}
        }
        if (this.timer > 3) {
          this.phase = PHASE_TEXT;
          this.timer = 0;
        }
        break;

      case PHASE_TEXT:
        if (this.timer > 1) {
          this.fadeOut = Math.min(1, (this.timer - 1) / 0.8);
        }
        if (this.timer > 1.8) {
          this.phase = PHASE_DONE;
          this.done = true;
        }
        break;
    }
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);

    for (const s of this.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ship
    ctx.save();
    ctx.translate(this.shipX, this.shipY);
    ctx.rotate(this.shipAngle);
    const ss = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -20 * ss);
    ctx.lineTo(-14 * ss, 16 * ss);
    ctx.lineTo(-6 * ss, 10 * ss);
    ctx.lineTo(0, 14 * ss);
    ctx.lineTo(6 * ss, 10 * ss);
    ctx.lineTo(14 * ss, 16 * ss);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, -20 * ss, 0, 16 * ss);
    grad.addColorStop(0, '#66ccff');
    grad.addColorStop(1, '#2255aa');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#88ddff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -6 * ss, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#aaeeff';
    ctx.fill();
    ctx.restore();

    // Empty fuel icon flashing
    if (Math.sin(this.timer * 5) > 0) {
      ctx.font = 'bold 40px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4444';
      ctx.fillText('⛽', w / 2, h * 0.2);
    }

    // Speech bubble
    if (this.showBubble > 0) {
      ctx.globalAlpha = Math.min(1, this.showBubble);
      const bx = this.shipX + 50, by = this.shipY - 30;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.roundRect(bx - 5, by - 16, 120, 32, 10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx, by + 16);
      ctx.lineTo(bx - 15, by + 26);
      ctx.lineTo(bx + 10, by + 16);
      ctx.fill();
      ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#cc4422';
      ctx.fillText('I need gas!', bx + 8, by + 6);
      ctx.globalAlpha = 1;
    }

    // Heading to gas station text
    if (this.phase === PHASE_TEXT) {
      ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffaa44';
      ctx.fillText('Heading to Gas Station...', w / 2, h * 0.75);
    }

    // Fade out
    if (this.fadeOut > 0) {
      ctx.fillStyle = `rgba(10, 10, 26, ${this.fadeOut})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Skip button
    const sbx = w - 130, sby = h - 60;
    ctx.fillStyle = 'rgba(40, 40, 60, 0.8)';
    ctx.beginPath();
    ctx.roundRect(sbx, sby, 120, 44, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,150,200,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aab';
    ctx.fillText('Skip ⏭', sbx + 60, sby + 26);
    ctx.textAlign = 'left';
  }
}
