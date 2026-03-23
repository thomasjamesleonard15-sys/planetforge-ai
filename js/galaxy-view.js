import { Planet } from './planet.js';

export class GalaxyView {
  constructor() {
    this.planets = [];
    this.selectedPlanet = -1;
    this.createButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    this.enterButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    this.flyButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    this.time = 0;

    this.addPlanet('Terra Prime');
  }

  addPlanet(name) {
    const colors = [
      { ocean: '#1e6091', land: '#2d8a4e', ice: '#c8e6f0' },
      { ocean: '#8b2252', land: '#cc6633', ice: '#ffccaa' },
      { ocean: '#2a1a5e', land: '#6633aa', ice: '#ccaaff' },
      { ocean: '#1a4a3a', land: '#33aa66', ice: '#aaffcc' },
      { ocean: '#5a3a1a', land: '#aa8833', ice: '#ffddaa' },
    ];
    const c = colors[this.planets.length % colors.length];
    const p = new Planet(0, 0, 80);
    p.colors = { ...c, atmosphere: 'rgba(100, 180, 255, 0.12)' };
    p.name = name;
    p.rotationSpeed = 0.1 + Math.random() * 0.2;
    this.planets.push(p);
  }

  handleTap(sx, sy, screenW, screenH) {
    // Create planet button
    const cb = this.createButtonRect;
    if (sx >= cb.x && sx <= cb.x + cb.w && sy >= cb.y && sy <= cb.y + cb.h) {
      const names = ['Nova', 'Aether', 'Crimson', 'Jade', 'Ember', 'Frost', 'Void', 'Neon'];
      this.addPlanet(names[this.planets.length % names.length] + ' ' + (this.planets.length + 1));
      return 'created';
    }

    // Enter planet
    const eb = this.enterButtonRect;
    if (this.selectedPlanet >= 0 && sx >= eb.x && sx <= eb.x + eb.w && sy >= eb.y && sy <= eb.y + eb.h) {
      return 'enter';
    }

    // Fly spaceship button
    const fb = this.flyButtonRect;
    if (sx >= fb.x && sx <= fb.x + fb.w && sy >= fb.y && sy <= fb.y + fb.h) {
      return 'fly';
    }

    // Planet selection
    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i];
      const dx = sx - p.x;
      const dy = sy - p.y;
      if (dx * dx + dy * dy < p.radius * p.radius) {
        this.selectedPlanet = i;
        return 'selected';
      }
    }

    this.selectedPlanet = -1;
    return 'none';
  }

  update(dt) {
    this.time += dt;
    for (const p of this.planets) p.update(dt);
  }

  render(ctx, w, h) {
    // Position planets in orbit
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.12;

    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i];
      const orbitR = 120 + i * (baseRadius * 1.2);
      const angle = this.time * (0.15 - i * 0.02) + i * 1.5;
      p.x = cx + Math.cos(angle) * orbitR;
      p.y = cy + Math.sin(angle) * orbitR * 0.5;
      p.radius = baseRadius * (0.6 + i * 0.1);

      // Orbit line
      ctx.beginPath();
      ctx.ellipse(cx, cy, orbitR, orbitR * 0.5, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 120, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      p.render(ctx);

      // Planet name
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = i === this.selectedPlanet ? '#88aaff' : '#667';
      ctx.fillText(p.name, p.x, p.y + p.radius + 20);
    }

    // Selected planet info
    if (this.selectedPlanet >= 0) {
      const sp = this.planets[this.selectedPlanet];
      const bw = 160;
      const bh = 40;
      const bx = sp.x - bw / 2;
      const by = sp.y + sp.radius + 40;
      this.enterButtonRect = { x: bx, y: by, w: bw, h: bh };
      ctx.fillStyle = 'rgba(50, 80, 150, 0.8)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = '#dde';
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.fillText('⬇ Land Here', sp.x, by + bh / 2 + 5);
    }

    // Bottom buttons
    const btnW = 180;
    const btnH = 44;
    const gap = 16;
    const totalW = btnW * 2 + gap;
    const startX = w / 2 - totalW / 2;
    const btnY = h - 80;

    // Create planet button
    this.createButtonRect = { x: startX, y: btnY, w: btnW, h: btnH };
    ctx.fillStyle = 'rgba(40, 60, 120, 0.9)';
    ctx.beginPath();
    ctx.roundRect(startX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.strokeStyle = '#6688cc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#dde';
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.fillText('+ Create Planet', startX + btnW / 2, btnY + btnH / 2 + 6);

    // Fly ship button
    const flyX = startX + btnW + gap;
    this.flyButtonRect = { x: flyX, y: btnY, w: btnW, h: btnH };
    ctx.fillStyle = 'rgba(100, 50, 30, 0.9)';
    ctx.beginPath();
    ctx.roundRect(flyX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.strokeStyle = '#ff8844';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffe0cc';
    ctx.fillText('🚀 Fly Ship', flyX + btnW / 2, btnY + btnH / 2 + 6);

    ctx.textAlign = 'left';

    // Title
    ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaccff';
    ctx.fillText('🌌 Galaxy Map', w / 2, 50);
    ctx.textAlign = 'left';
  }
}
