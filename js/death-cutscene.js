import { speak as speakV } from './voices.js';

const PHASE_FALL = 0;
const PHASE_CRAWL = 1;
const PHASE_ENTER = 2;
const PHASE_LIFTOFF = 3;
const PHASE_DONE = 4;

export class DeathCutscene {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.phase = PHASE_FALL;
    this.timer = 0;
    this.done = false;

    this.playerX = screenW / 2;
    this.playerY = screenH * 0.55;
    this.playerAlpha = 1;
    this.playerFlash = 0;

    this.shipX = screenW / 2 + 120;
    this.shipY = screenH * 0.45;
    this.shipTargetY = this.shipY;

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

    this.spokeVoiceLine = false;
    this.showHelp = 0;
    this.fadeOut = 0;
    this.screenShake = 0;
  }

  sayHelp() {
    this.showHelp = 2.5;
    speakV('Help!', { role: 'male', pitch: 1.3, rate: 1.1, volume: 1 });
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;
    if (this.showHelp > 0) this.showHelp -= dt;
    if (this.screenShake > 0) this.screenShake -= dt;

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 30 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    switch (this.phase) {
      case PHASE_FALL:
        // Player falls and flashes red
        this.playerFlash = Math.sin(this.timer * 15) > 0 ? 0.6 : 0;
        this.screenShake = 0.3;
        // Damage particles
        if (Math.random() > 0.5) {
          this.particles.push({
            x: this.playerX + (Math.random() - 0.5) * 20,
            y: this.playerY + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 40,
            life: 0.5, maxLife: 0.5, r: 3, color: '#ff4444',
          });
        }
        if (this.timer > 1.5) {
          this.phase = PHASE_CRAWL;
          this.timer = 0;
        }
        break;

      case PHASE_CRAWL:
        // Crawl toward ship
        this.playerX += (this.shipX - 30 - this.playerX) * 1.2 * dt;
        this.playerY += (this.shipY + 15 - this.playerY) * 1.2 * dt;
        // Wobble to look like crawling
        this.playerY += Math.sin(this.timer * 8) * 1.5;
        if (!this.spokeVoiceLine && this.timer > 0.3) {
          this.spokeVoiceLine = true;
          this.sayHelp();
        }
        if (this.timer > 2) {
          this.phase = PHASE_ENTER;
          this.timer = 0;
        }
        break;

      case PHASE_ENTER:
        // Player fades into ship
        this.playerAlpha = Math.max(0, 1 - this.timer / 0.6);
        this.playerX += (this.shipX - this.playerX) * 3 * dt;
        this.playerY += (this.shipY - this.playerY) * 3 * dt;
        if (this.timer > 1) {
          this.phase = PHASE_LIFTOFF;
          this.timer = 0;
        }
        break;

      case PHASE_LIFTOFF:
        // Ship takes off
        this.shipY -= 200 * dt * (1 + this.timer);
        // Engine particles
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

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * 8;
      shakeY = (Math.random() - 0.5) * 8;
    }
    ctx.save();
    ctx.translate(shakeX, shakeY);

    // Background — apocalyptic red sunset
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#080020');
    bg.addColorStop(0.3, '#3a0a3a');
    bg.addColorStop(0.55, '#7a2020');
    bg.addColorStop(0.62, '#aa3010');
    bg.addColorStop(0.65, '#3a1010');
    bg.addColorStop(1, '#1a0808');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Red nebula glow
    const neb = ctx.createRadialGradient(w * 0.5, h * 0.3, 20, w * 0.5, h * 0.3, 350);
    neb.addColorStop(0, 'rgba(200, 50, 50, 0.3)');
    neb.addColorStop(1, 'rgba(80, 0, 0, 0)');
    ctx.fillStyle = neb;
    ctx.fillRect(0, 0, w, h);

    // Stars with glow
    for (const s of this.stars) {
      if (s.r > 0.8) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,200,200,${s.a * 0.15})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,220,${s.a})`;
      ctx.fill();
    }

    // Distant mountains
    const groundY = h * 0.65;
    ctx.fillStyle = '#1a0508';
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    for (let i = 0; i <= 10; i++) {
      const mx = (i / 10) * w;
      const my = groundY - 25 - Math.abs(Math.sin(i * 1.7)) * 35;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(w, groundY);
    ctx.closePath();
    ctx.fill();

    // Ground with shading
    const gg = ctx.createLinearGradient(0, groundY, 0, h);
    gg.addColorStop(0, '#5a2818');
    gg.addColorStop(0.3, '#3a1810');
    gg.addColorStop(1, '#1a0808');
    ctx.fillStyle = gg;
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = '#7a3018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY); ctx.lineTo(w, groundY);
    ctx.stroke();

    // Particles
    for (const p of this.particles) {
      ctx.globalAlpha = p.life / p.maxLife * 0.7;
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

    // Engine glow during liftoff
    if (this.phase === PHASE_LIFTOFF) {
      const g = ctx.createRadialGradient(0, 28 * ss, 2, 0, 28 * ss, 20);
      g.addColorStop(0, 'rgba(255,136,50,0.8)');
      g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 28 * ss, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ship body
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

    // Landing legs (before liftoff)
    if (this.phase < PHASE_LIFTOFF) {
      ctx.strokeStyle = '#667';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10 * ss, 14 * ss); ctx.lineTo(-16 * ss, 26 * ss);
      ctx.moveTo(10 * ss, 14 * ss); ctx.lineTo(16 * ss, 26 * ss);
      ctx.stroke();
    }

    ctx.restore();

    // Player character
    if (this.playerAlpha > 0) {
      ctx.globalAlpha = this.playerAlpha;
      // Red flash overlay
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, 12, 0, Math.PI * 2);
      const pg = ctx.createRadialGradient(this.playerX - 2, this.playerY - 2, 1, this.playerX, this.playerY, 12);
      pg.addColorStop(0, '#66ccff');
      pg.addColorStop(1, '#2266aa');
      ctx.fillStyle = pg;
      ctx.fill();
      if (this.playerFlash > 0) {
        ctx.globalAlpha = this.playerFlash;
        ctx.beginPath();
        ctx.arc(this.playerX, this.playerY, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#ff2222';
        ctx.fill();
      }
      ctx.globalAlpha = this.playerAlpha;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY - 3, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#aaeeff';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Speech bubble
    if (this.showHelp > 0 && this.playerAlpha > 0.3) {
      ctx.globalAlpha = Math.min(1, this.showHelp);
      const bx = this.playerX + 18, by = this.playerY - 40;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.roundRect(bx - 5, by - 14, 72, 28, 8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx + 5, by + 14);
      ctx.lineTo(bx - 5, by + 22);
      ctx.lineTo(bx + 15, by + 14);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#cc2222';
      ctx.fillText('Help?!', bx + 8, by + 5);
      ctx.globalAlpha = 1;
    }

    ctx.restore(); // shake

    // Title text
    if (this.phase <= PHASE_CRAWL) {
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4444';
      ctx.fillText('DEFEATED', w / 2, h * 0.18);
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aa6666';
      ctx.fillText('Retreating to home planet...', w / 2, h * 0.18 + 30);
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
