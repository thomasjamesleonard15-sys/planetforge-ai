const PHASE_CELEBRATE = 0;
const PHASE_SPEECH = 1;
const PHASE_WALK = 2;
const PHASE_ENTER = 3;
const PHASE_LIFTOFF = 4;
const PHASE_DONE = 5;

export class VictoryCutscene {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.phase = PHASE_CELEBRATE;
    this.timer = 0;
    this.done = false;

    this.playerX = screenW / 2;
    this.playerY = screenH * 0.55;
    this.playerAlpha = 1;

    this.shipX = screenW / 2 + 140;
    this.shipY = screenH * 0.42;

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

    this.spokeWin = false;
    this.spokeBatman = false;
    this.showBubble = '';
    this.bubbleTimer = 0;
    this.fadeOut = 0;
    this.confettiTimer = 0;
  }

  speak(text, pitch, rate) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch;
      u.rate = rate;
      u.volume = 1;
      const voices = speechSynthesis.getVoices();
      const v = voices.find(v => /male/i.test(v.name) && !/female/i.test(v.name)) || voices[0];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  spawnConfetti() {
    for (let i = 0; i < 8; i++) {
      const colors = ['#ffdd44', '#44ffdd', '#ff44aa', '#44aaff', '#aaff44', '#ffaa44'];
      this.particles.push({
        x: this.playerX + (Math.random() - 0.5) * 60,
        y: this.playerY - 20,
        vx: (Math.random() - 0.5) * 200,
        vy: -Math.random() * 150 - 50,
        life: 1.5, maxLife: 1.5,
        r: 3 + Math.random() * 3,
        color: colors[(Math.random() * colors.length) | 0],
      });
    }
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;
    if (this.bubbleTimer > 0) this.bubbleTimer -= dt;

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    switch (this.phase) {
      case PHASE_CELEBRATE:
        this.confettiTimer -= dt;
        if (this.confettiTimer <= 0) {
          this.spawnConfetti();
          this.confettiTimer = 0.15;
        }
        if (!this.spokeWin && this.timer > 0.5) {
          this.spokeWin = true;
          this.speak('I win!', 0.2, 0.7);
          this.showBubble = 'I win!';
          this.bubbleTimer = 2;
        }
        if (this.timer > 3) {
          this.phase = PHASE_SPEECH;
          this.timer = 0;
        }
        break;

      case PHASE_SPEECH:
        if (!this.spokeBatman && this.timer > 0.3) {
          this.spokeBatman = true;
          this.speak("And I'm Batman.", 0.1, 0.55);
          this.showBubble = "And I'm Batman.";
          this.bubbleTimer = 2.5;
        }
        if (this.timer > 3) {
          this.phase = PHASE_WALK;
          this.timer = 0;
        }
        break;

      case PHASE_WALK:
        this.playerX += (this.shipX - 25 - this.playerX) * 2 * dt;
        this.playerY += (this.shipY + 15 - this.playerY) * 2 * dt;
        if (this.timer > 1.5) {
          this.phase = PHASE_ENTER;
          this.timer = 0;
        }
        break;

      case PHASE_ENTER:
        this.playerAlpha = Math.max(0, 1 - this.timer / 0.5);
        this.playerX += (this.shipX - this.playerX) * 4 * dt;
        this.playerY += (this.shipY - this.playerY) * 4 * dt;
        if (this.timer > 0.8) {
          this.phase = PHASE_LIFTOFF;
          this.timer = 0;
        }
        break;

      case PHASE_LIFTOFF:
        this.shipY -= 180 * dt * (1 + this.timer);
        if (Math.random() > 0.3) {
          this.particles.push({
            x: this.shipX + (Math.random() - 0.5) * 15,
            y: this.shipY + 40,
            vx: (Math.random() - 0.5) * 40,
            vy: Math.random() * 50 + 30,
            life: 0.5, maxLife: 0.5, r: 3 + Math.random() * 3, color: '#ff8833',
          });
        }
        if (this.timer > 1.5) {
          this.fadeOut = Math.min(1, (this.timer - 1.5) / 0.8);
        }
        if (this.timer > 2.3) {
          this.phase = PHASE_DONE;
          this.done = true;
        }
        break;
    }
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a0a2a');
    bg.addColorStop(0.4, '#1a1a3a');
    bg.addColorStop(0.65, '#1a2a1a');
    bg.addColorStop(1, '#3a2e1f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (const s of this.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }

    // Ground
    const groundY = h * 0.65;
    ctx.fillStyle = '#3a2e1f';
    ctx.fillRect(0, groundY, w, h - groundY);

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ship
    ctx.save();
    ctx.translate(this.shipX, this.shipY);
    const ss = 2.5;
    if (this.phase === PHASE_LIFTOFF) {
      const g = ctx.createRadialGradient(0, 28 * ss, 2, 0, 28 * ss, 20);
      g.addColorStop(0, 'rgba(255,136,50,0.8)');
      g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 28 * ss, 20, 0, Math.PI * 2);
      ctx.fill();
    }
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
    if (this.phase < PHASE_LIFTOFF) {
      ctx.strokeStyle = '#667';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10 * ss, 14 * ss); ctx.lineTo(-16 * ss, 26 * ss);
      ctx.moveTo(10 * ss, 14 * ss); ctx.lineTo(16 * ss, 26 * ss);
      ctx.stroke();
    }
    ctx.restore();

    // Player
    if (this.playerAlpha > 0) {
      ctx.globalAlpha = this.playerAlpha;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, 14, 0, Math.PI * 2);
      const pg = ctx.createRadialGradient(this.playerX - 3, this.playerY - 3, 2, this.playerX, this.playerY, 14);
      pg.addColorStop(0, '#66ccff');
      pg.addColorStop(1, '#2266aa');
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY - 4, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#aaeeff';
      ctx.fill();
      // Cape
      ctx.fillStyle = '#223';
      ctx.beginPath();
      ctx.moveTo(this.playerX - 12, this.playerY + 5);
      ctx.lineTo(this.playerX - 18, this.playerY + 25);
      ctx.lineTo(this.playerX - 6, this.playerY + 18);
      ctx.lineTo(this.playerX, this.playerY + 25);
      ctx.lineTo(this.playerX + 6, this.playerY + 18);
      ctx.lineTo(this.playerX + 18, this.playerY + 25);
      ctx.lineTo(this.playerX + 12, this.playerY + 5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Speech bubble
    if (this.bubbleTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.bubbleTimer);
      const bx = this.playerX + 22, by = this.playerY - 45;
      const tw = this.showBubble.length * 9 + 20;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.roundRect(bx - 5, by - 16, tw, 32, 10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx + 5, by + 16);
      ctx.lineTo(bx - 8, by + 26);
      ctx.lineTo(bx + 15, by + 16);
      ctx.fill();
      ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#222';
      ctx.fillText(this.showBubble, bx + 5, by + 6);
      ctx.globalAlpha = 1;
    }

    // Title
    if (this.phase <= PHASE_SPEECH) {
      ctx.font = 'bold 36px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffdd44';
      ctx.fillText('VICTORY!', w / 2, h * 0.15);
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aabb88';
      ctx.fillText('Planet conquered — returning home', w / 2, h * 0.15 + 30);
      ctx.textAlign = 'left';
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
