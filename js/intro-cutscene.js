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
    try {
      const u = new SpeechSynthesisUtterance("Boom!");
      u.pitch = 0.1; u.rate = 0.5; u.volume = 0.8;
      speechSynthesis.speak(u);
    } catch (_) {}
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

    if (this.asteroid.alive) {
      ctx.save();
      ctx.translate(this.asteroid.x, this.asteroid.y);
      ctx.rotate(this.asteroid.rot);
      ctx.beginPath();
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.asteroid.r * (0.8 + Math.sin(i * 3.7) * 0.2);
        i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = '#665544';
      ctx.fill();
      ctx.strokeStyle = '#998877';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.explosion) {
      if (p.life <= 0) continue;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (this.shipPhase === 'fly') {
      ctx.save();
      ctx.translate(this.shipX, this.shipY);
      const tg = ctx.createRadialGradient(-16, 0, 2, -16, 0, 14);
      tg.addColorStop(0, 'rgba(255,136,50,0.8)');
      tg.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.arc(-16, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(20, 0);
      ctx.lineTo(-14, -12);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-6, 5);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      const sg = ctx.createLinearGradient(-14, 0, 20, 0);
      sg.addColorStop(0, '#2255aa');
      sg.addColorStop(1, '#66ccff');
      ctx.fillStyle = sg;
      ctx.fill();
      ctx.strokeStyle = '#88ddff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(8, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#aaeeff';
      ctx.fill();
      ctx.restore();
    }

    for (const b of this.bullets) {
      if (!b.active) continue;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdd44';
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdd44';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    for (const L of this.letters) {
      if (!L.arrived && this.timer < L.delay) continue;
      ctx.save();
      ctx.translate(L.x, L.y);
      ctx.rotate(L.rot);
      ctx.font = 'bold 42px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const grd = ctx.createLinearGradient(-20, -20, 20, 20);
      grd.addColorStop(0, '#6ee7b7');
      grd.addColorStop(0.5, '#3b82f6');
      grd.addColorStop(1, '#a78bfa');
      ctx.fillStyle = grd;
      ctx.fillText(L.ch, 0, 0);
      ctx.restore();
    }

    if (this.subtitleAlpha > 0) {
      ctx.globalAlpha = this.subtitleAlpha;
      ctx.font = '18px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8888aa';
      ctx.fillText(SUBTITLE, w / 2, h * 0.3 + 40);
      ctx.globalAlpha = 1;
    }

    if (this.showTap) {
      ctx.globalAlpha = this.tapAlpha * (0.6 + Math.sin(this.timer * 4) * 0.4);
      ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Tap to Start', w / 2, h * 0.75);
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
