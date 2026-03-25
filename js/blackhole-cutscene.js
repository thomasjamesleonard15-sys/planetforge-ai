const PHASE_WARP = 0;
const PHASE_PLANET = 1;
const PHASE_EXPLORE = 2;
const PHASE_EXPLODE = 3;
const PHASE_DONE = 4;

export class BlackHoleCutscene {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.done = false;
    this.phase = PHASE_WARP;
    this.timer = 0;
    this.fadeIn = 0;
    this.fadeOut = 0;
    this.spoke = false;
    this.spokeExplore = false;
    this.spokeExplode = false;
    this.shakeAmount = 0;
    this.planetRot = 0;
    this.particles = [];
    for (let i = 0; i < 40; i++) {
      this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0, color: '' });
    }
  }

  speak(text, pitch, rate) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch; u.rate = rate; u.volume = 1;
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;
    this.planetRot += dt * 0.5;

    for (const p of this.particles) {
      if (p.life > 0) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 100 * dt; }
    }

    if (this.phase === PHASE_WARP) {
      this.fadeIn = Math.min(1, this.timer / 1);
      if (!this.spoke && this.timer > 0.5) {
        this.spoke = true;
        this.speak("What is this place?", 0.3, 0.6);
      }
      if (this.timer > 3) { this.phase = PHASE_PLANET; this.timer = 0; }
    } else if (this.phase === PHASE_PLANET) {
      if (!this.spokeExplore && this.timer > 1) {
        this.spokeExplore = true;
        this.speak("A secret planet... Planet X!", 0.4, 0.7);
      }
      if (this.timer > 4) { this.phase = PHASE_EXPLORE; this.timer = 0; }
    } else if (this.phase === PHASE_EXPLORE) {
      if (!this.spokeExplode && this.timer > 1) {
        this.spokeExplode = true;
        this.speak("Wait... something's wrong!", 0.6, 0.9);
      }
      this.shakeAmount = Math.min(8, this.timer * 2);
      if (this.timer > 3) { this.phase = PHASE_EXPLODE; this.timer = 0; this.emitExplosion(); }
    } else if (this.phase === PHASE_EXPLODE) {
      this.shakeAmount = Math.max(0, 12 - this.timer * 4);
      if (this.timer > 3) this.fadeOut = Math.min(1, (this.timer - 3) / 1);
      if (this.timer > 4) this.done = true;
    }
  }

  emitExplosion() {
    const cx = this.screenW / 2, cy = this.screenH * 0.45;
    for (const p of this.particles) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 300;
      p.x = cx + (Math.random() - 0.5) * 30;
      p.y = cy + (Math.random() - 0.5) * 30;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.8 + Math.random() * 1;
      p.maxLife = p.life;
      p.r = 3 + Math.random() * 6;
      const colors = ['#ff4400', '#ffaa00', '#ff0044', '#ffff44', '#ff6600'];
      p.color = colors[Math.floor(Math.random() * colors.length)];
    }
    this.speak("AHHHHH!", 0.2, 0.5);
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;
    const sx = this.shakeAmount * (Math.random() - 0.5) * 2;
    const sy = this.shakeAmount * (Math.random() - 0.5) * 2;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.globalAlpha = this.fadeIn * (1 - this.fadeOut);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#050005');
    bg.addColorStop(0.5, '#100520');
    bg.addColorStop(1, '#050005');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 50; i++) {
      const sx2 = (Math.sin(i * 7.3 + this.planetRot) * 0.5 + 0.5) * w;
      const sy2 = (Math.cos(i * 4.1 + this.planetRot * 0.7) * 0.5 + 0.5) * h;
      ctx.fillStyle = `rgba(200,100,255,${0.2 + Math.sin(i + this.planetRot * 3) * 0.15})`;
      ctx.beginPath();
      ctx.arc(sx2, sy2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.phase >= PHASE_PLANET && this.phase < PHASE_EXPLODE) {
      this.renderSecretPlanet(ctx, w, h);
    }

    if (this.phase === PHASE_EXPLODE && this.timer < 2) {
      ctx.fillStyle = `rgba(255,200,50,${Math.max(0, 1 - this.timer)})`;
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.45, 60 + this.timer * 200, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of this.particles) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = (p.life / p.maxLife) * this.fadeIn * (1 - this.fadeOut);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = this.fadeIn * (1 - this.fadeOut);

    const barH2 = h * 0.08;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, barH2);
    ctx.fillRect(0, h - barH2, w, barH2);

    ctx.textAlign = 'center';
    if (this.phase === PHASE_WARP) {
      ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#cc66ff';
      ctx.fillText('Warping through the void...', w / 2, h * 0.2);
    } else if (this.phase === PHASE_PLANET || this.phase === PHASE_EXPLORE) {
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#ff44ff';
      ctx.fillText('PLANET X', w / 2, h * 0.13);
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aa88cc';
      ctx.fillText('The Forbidden World', w / 2, h * 0.13 + 22);
    } else if (this.phase === PHASE_EXPLODE) {
      ctx.font = 'bold 32px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#ff4400';
      ctx.fillText('PLANET X EXPLODES!', w / 2, h * 0.2);
    }

    ctx.textAlign = 'left';
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  renderSecretPlanet(ctx, w, h) {
    const cx = w / 2, cy = h * 0.45, r = 55;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const pg = ctx.createRadialGradient(cx - 10, cy - 10, 5, cx, cy, r);
    pg.addColorStop(0, '#ff22aa');
    pg.addColorStop(0.5, '#440066');
    pg.addColorStop(1, '#110022');
    ctx.fillStyle = pg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    for (let i = 0; i < 5; i++) {
      const lx = Math.sin(this.planetRot + i * 1.3) * r * 0.6;
      const ly = Math.cos(this.planetRot * 0.7 + i * 2.1) * r * 0.4;
      ctx.fillStyle = `rgba(255,0,${100 + i * 30},0.3)`;
      ctx.beginPath();
      ctx.ellipse(cx + lx, cy + ly, 20 + i * 5, 10 + i * 3, this.planetRot + i, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    const atmo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.3);
    atmo.addColorStop(0, 'rgba(255,0,150,0)');
    atmo.addColorStop(0.5, 'rgba(255,0,150,0.15)');
    atmo.addColorStop(1, 'rgba(255,0,150,0)');
    ctx.fillStyle = atmo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff66cc';
    ctx.fillText('??? UNKNOWN ???', cx, cy + r + 18);
  }
}
