import { speak as speakV } from './voices.js';

const TITLE = 'PlanetForge AI';
const SUBTITLE = 'Create planets. Farm. Build. Defend. Conquer.';

export class IntroCutscene {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.done = false;
    this.timer = 0;

    this.letters = [];
    for (let i = 0; i < TITLE.length; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(screenW, screenH);
      this.letters.push({
        ch: TITLE[i],
        startX: screenW / 2 + Math.cos(angle) * dist,
        startY: screenH / 2 + Math.sin(angle) * dist,
        x: 0, y: 0,
        targetX: 0, targetY: 0,
        delay: 0.3 + i * 0.12,
        arrived: false,
        rot: (Math.random() - 0.5) * 4,
        targetRot: 0,
      });
    }

    this.shipX = -60;
    this.shipY = screenH * 0.55;
    this.shipPhase = 'fly';
    this.shipSpeed = 500;

    this.asteroid = { x: screenW * 0.6, y: screenH * 0.55, r: 35, alive: true, rot: 0 };
    this.explosion = [];
    for (let i = 0; i < 60; i++) {
      this.explosion.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0, color: '' });
    }

    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * screenW,
        y: Math.random() * screenH,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.6 + 0.2,
        speed: 10 + Math.random() * 30,
      });
    }

    this.subtitleAlpha = 0;
    this.tapAlpha = 0;
    this.showTap = false;
    this.flash = 0;

    this.bullets = [];
    for (let i = 0; i < 5; i++) {
      this.bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
    }
  }

  handleTap() {
    if (this.showTap) this.done = true;
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;

    for (const s of this.stars) {
      s.x -= s.speed * dt;
      if (s.x < -5) { s.x = this.screenW + 5; s.y = Math.random() * this.screenH; }
    }

    const cx = this.screenW / 2;
    const cy = this.screenH * 0.3;
    const totalW = TITLE.length * 38;
    for (let i = 0; i < this.letters.length; i++) {
      const L = this.letters[i];
      L.targetX = cx - totalW / 2 + i * 38 + 19;
      L.targetY = cy;
      const t = Math.max(0, this.timer - L.delay);
      if (t > 0) {
        const p = Math.min(1, t / 0.6);
        const ease = 1 - Math.pow(1 - p, 3);
        L.x = L.startX + (L.targetX - L.startX) * ease;
        L.y = L.startY + (L.targetY - L.startY) * ease;
        L.rot = L.rot * (1 - ease);
        if (p >= 1 && !L.arrived) { L.arrived = true; this.flash = 0.1; }
      } else {
        L.x = L.startX;
        L.y = L.startY;
      }
    }

    if (this.shipPhase === 'fly') {
      this.shipX += this.shipSpeed * dt;
      if (this.shipX > this.asteroid.x - 120 && this.bullets.every(b => !b.active)) {
        for (const b of this.bullets) {
          b.active = true;
          b.x = this.shipX + 20;
          b.y = this.shipY;
          b.vx = 700 + Math.random() * 100;
          b.vy = (Math.random() - 0.5) * 40;
          b.life = 1;
          break;
        }
      }
      if (this.shipX > this.screenW + 80) this.shipPhase = 'gone';
    }

    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) b.active = false;
      if (this.asteroid.alive) {
        const dx = b.x - this.asteroid.x, dy = b.y - this.asteroid.y;
        if (dx * dx + dy * dy < (this.asteroid.r + 5) ** 2) {
          b.active = false;
          this.asteroid.alive = false;
          this.flash = 0.3;
          this.explodeAsteroid();
        }
      }
    }

    if (this.asteroid.alive) this.asteroid.rot += dt * 0.8;

    for (const p of this.explosion) {
      if (p.life > 0) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 50 * dt; }
    }

    if (this.flash > 0) this.flash -= dt * 2;

    const allArrived = this.letters.every(L => L.arrived);
    if (allArrived) this.subtitleAlpha = Math.min(1, this.subtitleAlpha + dt * 2);
    if (!this.asteroid.alive && this.timer > 4) {
      this.showTap = true;
      this.tapAlpha = Math.min(1, this.tapAlpha + dt * 2);
    }
  }

  explodeAsteroid() {
    const ax = this.asteroid.x, ay = this.asteroid.y;
    const colors = ['#ff6633', '#ffaa22', '#ff4400', '#ffdd44', '#aaaaaa', '#887766'];
    for (const p of this.explosion) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 300;
      p.x = ax + (Math.random() - 0.5) * 20;
      p.y = ay + (Math.random() - 0.5) * 20;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.6 + Math.random() * 1.2;
      p.maxLife = p.life;
      p.r = 2 + Math.random() * 7;
      p.color = colors[Math.floor(Math.random() * colors.length)];
    }
    speakV("Boom!", { role: 'deep', pitch: 0.3, rate: 0.7, volume: 0.9 });
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;
    const t = this.timer;

    // Deep space gradient
    const bg = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h));
    bg.addColorStop(0, '#0a0820');
    bg.addColorStop(0.4, '#050510');
    bg.addColorStop(1, '#020208');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Nebula clouds
    const neb1 = ctx.createRadialGradient(w * 0.25 + Math.sin(t * 0.3) * 20, h * 0.35, 30, w * 0.25, h * 0.35, 350);
    neb1.addColorStop(0, 'rgba(110, 60, 200, 0.35)');
    neb1.addColorStop(0.5, 'rgba(60, 20, 130, 0.15)');
    neb1.addColorStop(1, 'rgba(40, 10, 80, 0)');
    ctx.fillStyle = neb1;
    ctx.fillRect(0, 0, w, h);

    const neb2 = ctx.createRadialGradient(w * 0.75 - Math.cos(t * 0.4) * 25, h * 0.65, 30, w * 0.75, h * 0.65, 320);
    neb2.addColorStop(0, 'rgba(50, 130, 220, 0.3)');
    neb2.addColorStop(0.5, 'rgba(20, 50, 130, 0.1)');
    neb2.addColorStop(1, 'rgba(10, 20, 60, 0)');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, w, h);

    const neb3 = ctx.createRadialGradient(w * 0.55 + Math.sin(t * 0.2) * 30, h * 0.85, 30, w * 0.55, h * 0.85, 280);
    neb3.addColorStop(0, 'rgba(200, 60, 130, 0.25)');
    neb3.addColorStop(1, 'rgba(80, 20, 50, 0)');
    ctx.fillStyle = neb3;
    ctx.fillRect(0, 0, w, h);

    // Stars with glow + twinkle
    for (const s of this.stars) {
      const tw = s.a * (0.7 + Math.sin(t * 5 + s.x * 0.05) * 0.3);
      if (s.r > 1) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${tw * 0.15})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${tw})`;
      ctx.fill();
    }

    if (this.asteroid.alive) {
      ctx.save();
      ctx.translate(this.asteroid.x, this.asteroid.y);
      ctx.rotate(this.asteroid.rot);
      ctx.beginPath();
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.asteroid.r * (0.75 + Math.sin(i * 3.7) * 0.25);
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      // Shaded fill
      const ag = ctx.createRadialGradient(-this.asteroid.r * 0.3, -this.asteroid.r * 0.3, 5, 0, 0, this.asteroid.r * 1.2);
      ag.addColorStop(0, '#a89880');
      ag.addColorStop(0.5, '#665544');
      ag.addColorStop(1, '#221a10');
      ctx.fillStyle = ag;
      ctx.fill();
      ctx.strokeStyle = '#332211';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Craters
      for (let i = 0; i < 4; i++) {
        const ca = i * 1.6 + 0.5;
        const cd = this.asteroid.r * 0.45;
        const cx = Math.cos(ca) * cd;
        const cy = Math.sin(ca) * cd;
        ctx.beginPath();
        ctx.arc(cx, cy, this.asteroid.r * (0.08 + (i % 2) * 0.05), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 10, 0, 0.5)';
        ctx.fill();
      }
      ctx.restore();
    }

    for (const p of this.explosion) {
      if (p.life <= 0) continue;
      const f = p.life / p.maxLife;
      // Outer glow
      ctx.globalAlpha = f * 0.3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * f * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      // Core
      ctx.globalAlpha = f;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * f, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.shipPhase === 'fly') {
      ctx.save();
      ctx.translate(this.shipX, this.shipY);
      // Engine flame trail behind ship
      const tg0 = ctx.createRadialGradient(-22, 0, 2, -22, 0, 32);
      tg0.addColorStop(0, 'rgba(255,200,80,0.6)');
      tg0.addColorStop(0.5, 'rgba(255,100,30,0.3)');
      tg0.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = tg0;
      ctx.beginPath();
      ctx.arc(-22, 0, 32, 0, Math.PI * 2);
      ctx.fill();
      const tg = ctx.createRadialGradient(-18, 0, 2, -18, 0, 16);
      tg.addColorStop(0, 'rgba(255,255,200,0.95)');
      tg.addColorStop(0.4, 'rgba(255,180,80,0.7)');
      tg.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.arc(-18, 0, 14 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(-16, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      // Ship body
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-14, -12);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-6, 5);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      const sg = ctx.createLinearGradient(0, -12, 0, 12);
      sg.addColorStop(0, '#1a3a66');
      sg.addColorStop(0.5, '#88ddff');
      sg.addColorStop(1, '#1a3a66');
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = '#aaeeff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Wing accents
      ctx.fillStyle = '#1a2a44';
      ctx.beginPath();
      ctx.moveTo(-14, -12);
      ctx.lineTo(-10, -7);
      ctx.lineTo(-6, -5);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-14, 12);
      ctx.lineTo(-10, 7);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();
      // Hull stripe
      ctx.strokeStyle = '#ffaa44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-8, 0);
      ctx.stroke();
      // Cockpit with halo
      ctx.beginPath();
      ctx.arc(8, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(170,238,255,0.4)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, 0, 4, 0, Math.PI * 2);
      const cg = ctx.createRadialGradient(7, -2, 0, 8, 0, 4);
      cg.addColorStop(0, '#ffffff');
      cg.addColorStop(0.5, '#aaeeff');
      cg.addColorStop(1, '#4488cc');
      ctx.fillStyle = cg;
      ctx.fill();
      ctx.restore();
    }

    // Bullets — multi-layer glow
    for (const b of this.bullets) {
      if (!b.active) continue;
      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdd44';
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdd44';
      ctx.fill();
      // Trail
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(b.x - b.vx * 0.012, b.y - b.vy * 0.012, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdd44';
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    for (const L of this.letters) {
      if (!L.arrived && this.timer < L.delay) continue;
      ctx.save();
      ctx.translate(L.x, L.y);
      ctx.rotate(L.rot);
      ctx.font = 'bold 48px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Glow halo
      if (L.arrived) {
        ctx.shadowColor = '#6ee7b7';
        ctx.shadowBlur = 20;
      }
      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillText(L.ch, 3, 3);
      // Main letter with gradient
      ctx.shadowBlur = 0;
      const grd = ctx.createLinearGradient(-20, -20, 20, 20);
      grd.addColorStop(0, '#a8f0d0');
      grd.addColorStop(0.4, '#6ee7b7');
      grd.addColorStop(0.7, '#3b82f6');
      grd.addColorStop(1, '#a78bfa');
      ctx.fillStyle = grd;
      ctx.fillText(L.ch, 0, 0);
      // Stroke for definition
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeText(L.ch, 0, 0);
      ctx.restore();
    }

    if (this.subtitleAlpha > 0) {
      ctx.globalAlpha = this.subtitleAlpha;
      ctx.font = '20px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText(SUBTITLE, w / 2 + 1, h * 0.3 + 51);
      ctx.fillStyle = '#aaccee';
      ctx.fillText(SUBTITLE, w / 2, h * 0.3 + 50);
      ctx.globalAlpha = 1;
    }

    if (this.showTap) {
      ctx.globalAlpha = this.tapAlpha * (0.6 + Math.sin(this.timer * 4) * 0.4);
      ctx.shadowColor = '#88ddff';
      ctx.shadowBlur = 15;
      ctx.font = 'bold 26px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Tap to Start', w / 2, h * 0.78);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,200,100,${this.flash})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
