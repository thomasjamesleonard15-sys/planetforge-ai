const PHASE_DESCENT = 0;
const PHASE_LANDED = 1;
const PHASE_EXIT = 2;
const PHASE_WALK = 3;
const PHASE_DONE = 4;

export class LandingCutscene {
  constructor(screenW, screenH, planetName) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.planetName = planetName;
    this.phase = PHASE_DESCENT;
    this.timer = 0;
    this.done = false;

    this.shipX = screenW / 2;
    this.shipY = -60;
    this.shipTargetY = screenH * 0.45;
    this.shipAngle = 0;
    this.shipScale = 1;

    this.playerX = screenW / 2;
    this.playerY = screenH * 0.45;
    this.playerAlpha = 0;
    this.playerTargetX = screenW / 2;
    this.playerTargetY = screenH * 0.6;

    this.dustParticles = [];
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * screenW,
        y: Math.random() * screenH,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.5 + 0.1,
      });
    }

    this.textAlpha = 0;
    this.fadeOut = 0;
    this.spokeVoiceLine = false;
    this.showLetsGo = 0;
  }

  sayLetsGo() {
    this.showLetsGo = 2;
    try {
      const u = new SpeechSynthesisUtterance("Let's go");
      u.pitch = 0.3;
      u.rate = 0.7;
      u.volume = 1;
      const voices = speechSynthesis.getVoices();
      const deep = voices.find(v => /male/i.test(v.name) && !/female/i.test(v.name)) || voices[0];
      if (deep) u.voice = deep;
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;

    switch (this.phase) {
      case PHASE_DESCENT:
        this.shipY += (this.shipTargetY - this.shipY) * 1.5 * dt;
        this.shipAngle = Math.sin(this.timer * 2) * 0.03;
        // Engine particles
        if (Math.random() > 0.3) {
          this.dustParticles.push({
            x: this.shipX + (Math.random() - 0.5) * 20,
            y: this.shipY + 30,
            vx: (Math.random() - 0.5) * 60,
            vy: Math.random() * 40 + 20,
            life: 0.6, maxLife: 0.6, r: 3 + Math.random() * 3,
          });
        }
        if (this.timer > 2.5) {
          this.phase = PHASE_LANDED;
          this.timer = 0;
          // Landing dust burst
          for (let i = 0; i < 20; i++) {
            const a = Math.random() * Math.PI * 2;
            this.dustParticles.push({
              x: this.shipX, y: this.shipTargetY + 25,
              vx: Math.cos(a) * (40 + Math.random() * 80),
              vy: Math.sin(a) * 20 - Math.random() * 30,
              life: 0.8, maxLife: 0.8, r: 2 + Math.random() * 4,
            });
          }
        }
        break;

      case PHASE_LANDED:
        this.textAlpha = Math.min(1, this.timer / 0.5);
        if (this.timer > 1.2) {
          this.phase = PHASE_EXIT;
          this.timer = 0;
        }
        break;

      case PHASE_EXIT:
        if (!this.spokeVoiceLine) {
          this.spokeVoiceLine = true;
          this.sayLetsGo();
        }
        this.playerAlpha = Math.min(1, this.timer / 0.4);
        this.playerX = this.shipX + 25;
        this.playerY = this.shipTargetY + 10;
        if (this.timer > 0.8) {
          this.phase = PHASE_WALK;
          this.timer = 0;
        }
        break;

      case PHASE_WALK:
        this.playerX += (this.playerTargetX - this.playerX) * 2 * dt;
        this.playerY += (this.playerTargetY - this.playerY) * 2 * dt;
        if (this.timer > 1.5) {
          this.fadeOut = Math.min(1, (this.timer - 1.5) / 0.8);
        }
        if (this.timer > 2.3) {
          this.phase = PHASE_DONE;
          this.done = true;
        }
        break;
    }

    if (this.showLetsGo > 0) this.showLetsGo -= dt;

    // Update particles
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 40 * dt;
      p.life -= dt;
      if (p.life <= 0) this.dustParticles.splice(i, 1);
    }
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;

    // Background — sky gradient with sunset
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#050518');
    bg.addColorStop(0.3, '#1a1545');
    bg.addColorStop(0.55, '#5a2a4a');
    bg.addColorStop(0.62, '#a04030');
    bg.addColorStop(0.65, '#3a2018');
    bg.addColorStop(1, '#1a0f08');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Distant nebula glow
    const neb = ctx.createRadialGradient(w * 0.25, h * 0.2, 20, w * 0.25, h * 0.2, 250);
    neb.addColorStop(0, 'rgba(150, 80, 200, 0.3)');
    neb.addColorStop(1, 'rgba(80, 30, 120, 0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);

    // Stars with glow
    for (const s of this.stars) {
      if (s.r > 0.8) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${s.a * 0.15})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }

    // Distant mountains silhouette
    const groundY = h * 0.65;
    ctx.fillStyle = '#1a0f1a';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let i = 0; i <= 10; i++) {
      const mx = (i / 10) * w;
      const my = groundY - 20 - Math.abs(Math.sin(i * 1.7)) * 30;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();

    // Ground with shaded gradient
    const gg = ctx.createLinearGradient(0, groundY, 0, h);
    gg.addColorStop(0, '#5a3a20');
    gg.addColorStop(0.3, '#3a2a18');
    gg.addColorStop(1, '#1a0f08');
    ctx.fillStyle = gg;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Ground texture lines
    ctx.strokeStyle = 'rgba(80, 50, 30, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(0, groundY + 10 + i * 20);
      ctx.lineTo(w, groundY + 10 + i * 20);
      ctx.stroke();
    }
    ctx.strokeStyle = '#7a5a35';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // Dust particles
    for (const p of this.dustParticles) {
      ctx.globalAlpha = p.life / p.maxLife * 0.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = '#aa9977';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ship
    ctx.save();
    ctx.translate(this.shipX, this.shipY);
    ctx.rotate(this.shipAngle);
    const ss = 2.5;

    // Engine glow during descent — multi-layer
    if (this.phase === PHASE_DESCENT) {
      const g0 = ctx.createRadialGradient(0, 32 * ss, 2, 0, 32 * ss, 50);
      g0.addColorStop(0, 'rgba(255,200,80,0.6)');
      g0.addColorStop(0.5, 'rgba(255,100,30,0.3)');
      g0.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g0;
      ctx.beginPath();
      ctx.arc(0, 32 * ss, 50, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(0, 28 * ss, 2, 0, 28 * ss, 24);
      g.addColorStop(0, 'rgba(255,255,200,0.95)');
      g.addColorStop(0.4, 'rgba(255,180,80,0.7)');
      g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 28 * ss + Math.random() * 4, 22 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(0, 26 * ss, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ship body — metallic with stripe
    ctx.beginPath();
    ctx.moveTo(0, -22 * ss);
    ctx.lineTo(-15 * ss, 16 * ss);
    ctx.lineTo(-6 * ss, 10 * ss);
    ctx.lineTo(0, 14 * ss);
    ctx.lineTo(6 * ss, 10 * ss);
    ctx.lineTo(15 * ss, 16 * ss);
    ctx.closePath();
    const grad = ctx.createLinearGradient(-15 * ss, 0, 15 * ss, 0);
    grad.addColorStop(0, '#1a3a66');
    grad.addColorStop(0.4, '#66ccff');
    grad.addColorStop(0.6, '#88ddff');
    grad.addColorStop(1, '#1a3a66');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#aaeeff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Wing accents
    ctx.fillStyle = '#1a2a44';
    ctx.beginPath();
    ctx.moveTo(-12 * ss, 12 * ss);
    ctx.lineTo(-15 * ss, 16 * ss);
    ctx.lineTo(-8 * ss, 14 * ss);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12 * ss, 12 * ss);
    ctx.lineTo(15 * ss, 16 * ss);
    ctx.lineTo(8 * ss, 14 * ss);
    ctx.closePath();
    ctx.fill();
    // Hull stripe
    ctx.strokeStyle = '#ffaa44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -18 * ss);
    ctx.lineTo(0, 8 * ss);
    ctx.stroke();

    // Cockpit with halo
    ctx.beginPath();
    ctx.arc(0, -6 * ss, 9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(170,238,255,0.4)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -6 * ss, 6, 0, Math.PI * 2);
    const cg = ctx.createRadialGradient(-2, -8 * ss, 0, 0, -6 * ss, 6);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(0.5, '#aaeeff');
    cg.addColorStop(1, '#4488cc');
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-2, -8 * ss, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Landing legs (after landing)
    if (this.phase >= PHASE_LANDED) {
      ctx.strokeStyle = '#667';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10 * ss, 14 * ss); ctx.lineTo(-16 * ss, 26 * ss);
      ctx.moveTo(10 * ss, 14 * ss); ctx.lineTo(16 * ss, 26 * ss);
      ctx.stroke();
    }

    ctx.restore();

    // Player character exiting — full body
    if (this.playerAlpha > 0) {
      ctx.globalAlpha = this.playerAlpha;
      const px = this.playerX, py = this.playerY;
      const r = 12;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(px, py + r + 18, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Legs
      ctx.fillStyle = '#1a3a66';
      ctx.fillRect(px - 5, py + r + 4, 4, 12);
      ctx.fillRect(px + 1, py + r + 4, 4, 12);
      ctx.fillStyle = '#222';
      ctx.fillRect(px - 6, py + r + 14, 5, 4);
      ctx.fillRect(px + 1, py + r + 14, 5, 4);
      // Torso
      ctx.fillStyle = '#3388cc';
      ctx.beginPath();
      ctx.moveTo(px - r * 0.85, py + r - 2);
      ctx.lineTo(px - r * 0.95, py + r + 12);
      ctx.lineTo(px + r * 0.95, py + r + 12);
      ctx.lineTo(px + r * 0.85, py + r - 2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1a3a66';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#aaeeff';
      ctx.fillRect(px - 2, py + r, 4, 4);
      // Arms
      ctx.fillStyle = '#3388cc';
      ctx.beginPath();
      ctx.arc(px - r * 0.95 - 2, py + r + 4, 4, 0, Math.PI * 2);
      ctx.arc(px + r * 0.95 + 2, py + r + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      const pg = ctx.createRadialGradient(px - 4, py - 4, 1, px, py, r);
      pg.addColorStop(0, '#88ddff');
      pg.addColorStop(0.5, '#66ccff');
      pg.addColorStop(1, '#2266aa');
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.strokeStyle = '#1a3a66';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Visor
      ctx.beginPath();
      ctx.ellipse(px, py - 2, 5, 4, 0, 0, Math.PI * 2);
      const vg = ctx.createLinearGradient(px, py - 5, px, py + 2);
      vg.addColorStop(0, '#ffffff');
      vg.addColorStop(0.5, '#aaeeff');
      vg.addColorStop(1, '#4488cc');
      ctx.fillStyle = vg;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Speech bubble
    if (this.showLetsGo > 0 && this.playerAlpha > 0) {
      ctx.globalAlpha = Math.min(1, this.showLetsGo);
      const bx = this.playerX + 20, by = this.playerY - 35;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.roundRect(bx - 5, by - 14, 90, 28, 8);
      ctx.fill();
      // Tail
      ctx.beginPath();
      ctx.moveTo(bx + 5, by + 14);
      ctx.lineTo(bx - 5, by + 22);
      ctx.lineTo(bx + 15, by + 14);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#222';
      ctx.fillText("Let's go!", bx + 5, by + 5);
      ctx.globalAlpha = 1;
    }

    // Planet name text
    if (this.textAlpha > 0) {
      ctx.globalAlpha = this.textAlpha * (1 - this.fadeOut);
      ctx.font = 'bold 32px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ddeeff';
      ctx.fillText(`Landing on ${this.planetName}`, w / 2, h * 0.2);
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#8899aa';
      ctx.fillText('Preparing for deployment...', w / 2, h * 0.2 + 35);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }

    // Fade out to gameplay
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
