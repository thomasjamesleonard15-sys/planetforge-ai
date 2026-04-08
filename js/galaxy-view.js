import { Planet, PLANET_TYPES } from './planet.js';

const GALAXY_NAMES = [
  'Milky Way',
  'Andromeda',
  'Nebula X',
  'Dark Rift',
  'Crystal Void',
];

const GALAXY_COLORS = [
  '#aaccff',
  '#ffaacc',
  '#aaffcc',
  '#ffccaa',
  '#ccaaff',
];

export class GalaxyView {
  constructor() {
    this.galaxies = [];
    this.currentGalaxy = 0;
    this.selectedPlanet = -1;
    this.createButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    this.enterButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    this.flyButtonRect = { x: 0, y: 0, w: 0, h: 0 };
    this.warpLeftRect = { x: 0, y: 0, w: 0, h: 0 };
    this.warpRightRect = { x: 0, y: 0, w: 0, h: 0 };
    this.multiplayerRect = { x: 0, y: 0, w: 0, h: 0 };
    this.showTypePicker = false;
    this.typePickerRects = [];
    this.typePickerClose = { x: 0, y: 0, w: 0, h: 0 };
    this.time = 0;
    this.warpAnim = 0;

    // Create first galaxy (home)
    this.addGalaxy();
    this.galaxies[0].planets[0].name = 'Terra Prime';
    this.addPlanet('Gas Station');
    this.addPlanet('Batplanet');
    this.addPlanet('The Unknown');

    // Create second galaxy
    this.addGalaxy();
    this.addPlanetTo(1, 'Zyphor Prime');
    this.addPlanetTo(1, 'Red Dwarf Station');
    this.addPlanetTo(1, 'Pixel Arena');
  }

  addGalaxy() {
    this.galaxies.push({ planets: [], name: GALAXY_NAMES[this.galaxies.length % GALAXY_NAMES.length] });
    const idx = this.galaxies.length - 1;
    this.addPlanetTo(idx, 'Planet ' + (idx + 1));
  }

  get planets() {
    return this.galaxies[this.currentGalaxy].planets;
  }

  get galaxyName() {
    return this.galaxies[this.currentGalaxy].name;
  }

  addPlanet(name) {
    this.addPlanetTo(this.currentGalaxy, name);
  }

  addPlanetTo(galaxyIdx, name) {
    const colors = [
      { ocean: '#1e6091', land: '#2d8a4e', ice: '#c8e6f0' },
      { ocean: '#8b2252', land: '#cc6633', ice: '#ffccaa' },
      { ocean: '#2a1a5e', land: '#6633aa', ice: '#ccaaff' },
      { ocean: '#1a4a3a', land: '#33aa66', ice: '#aaffcc' },
      { ocean: '#5a3a1a', land: '#aa8833', ice: '#ffddaa' },
    ];
    const atmospheres = [
      'rgba(100, 180, 255, 0.15)',
      'rgba(255, 150, 100, 0.15)',
      'rgba(200, 150, 255, 0.15)',
      'rgba(150, 255, 200, 0.15)',
      'rgba(255, 200, 100, 0.15)',
      'rgba(150, 255, 150, 0.15)',
      'rgba(100, 200, 255, 0.18)',
      'rgba(200, 180, 140, 0.12)',
      'rgba(150, 255, 80, 0.18)',
    ];
    const g = this.galaxies[galaxyIdx];
    const idx = g.planets.length;
    const c = colors[idx % colors.length];
    const p = new Planet(0, 0, 80);
    // Auto-assign a type if not a special planet
    const specialMap = {
      'Terra Prime': 'earth',
      'Gas Station': 'rock',
      'Batplanet': 'rock',
      'The Unknown': 'toxic',
      'Pixel Arena': 'desert',
      'Zyphor Prime': 'lava',
      'Red Dwarf Station': 'ice',
    };
    p.type = specialMap[name] || PLANET_TYPES[idx % PLANET_TYPES.length];
    p.seed = Math.random() * 1000;
    p.colors = { ...c, atmosphere: atmospheres[PLANET_TYPES.indexOf(p.type) % atmospheres.length] || atmospheres[0] };
    p.name = name;
    p.rotationSpeed = 0.08 + Math.random() * 0.15;
    g.planets.push(p);
  }

  handleTap(sx, sy, screenW, screenH) {
    // Type picker modal — handle first if open
    if (this.showTypePicker) {
      const cl = this.typePickerClose;
      if (sx >= cl.x && sx <= cl.x + cl.w && sy >= cl.y && sy <= cl.y + cl.h) {
        this.showTypePicker = false;
        return 'none';
      }
      for (let i = 0; i < this.typePickerRects.length; i++) {
        const r = this.typePickerRects[i];
        if (sx >= r.x && sx <= r.x + r.w && sy >= r.y && sy <= r.y + r.h) {
          const names = ['Nova', 'Aether', 'Crimson', 'Jade', 'Ember', 'Frost', 'Void', 'Neon', 'Kairos'];
          const name = names[this.planets.length % names.length] + ' ' + (this.planets.length + 1);
          this.addPlanet(name);
          // Set the type to the chosen one
          this.planets[this.planets.length - 1].type = PLANET_TYPES[i];
          this.showTypePicker = false;
          return 'created';
        }
      }
      return 'none';
    }

    // Warp left
    const wl = this.warpLeftRect;
    if (this.currentGalaxy > 0 && sx >= wl.x && sx <= wl.x + wl.w && sy >= wl.y && sy <= wl.y + wl.h) {
      this.currentGalaxy--;
      this.selectedPlanet = -1;
      this.warpAnim = 1;
      return 'warp';
    }

    // Warp right
    const wr = this.warpRightRect;
    if (sx >= wr.x && sx <= wr.x + wr.w && sy >= wr.y && sy <= wr.y + wr.h) {
      if (this.currentGalaxy < this.galaxies.length - 1) {
        this.currentGalaxy++;
      } else {
        this.addGalaxy();
        this.currentGalaxy = this.galaxies.length - 1;
      }
      this.selectedPlanet = -1;
      this.warpAnim = 1;
      return 'warp';
    }

    // Create planet button — open type picker
    const cb = this.createButtonRect;
    if (sx >= cb.x && sx <= cb.x + cb.w && sy >= cb.y && sy <= cb.y + cb.h) {
      this.showTypePicker = true;
      return 'none';
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

    // Multiplayer button
    const mb = this.multiplayerRect;
    if (sx >= mb.x && sx <= mb.x + mb.w && sy >= mb.y && sy <= mb.y + mb.h) {
      return 'multiplayer';
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
    if (this.warpAnim > 0) this.warpAnim = Math.max(0, this.warpAnim - dt * 2);
    for (const p of this.planets) p.update(dt);
  }

  render(ctx, w, h) {
    // Warp flash
    if (this.warpAnim > 0) {
      ctx.fillStyle = `rgba(150, 180, 255, ${this.warpAnim * 0.4})`;
      ctx.fillRect(0, 0, w, h);
    }

    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(w, h) * 0.12;

    for (let i = 0; i < this.planets.length; i++) {
      const p = this.planets[i];
      if (!this.use3D) {
        const orbitR = 120 + i * (baseRadius * 1.2);
        const angle = this.time * (0.15 - i * 0.02) + i * 1.5;
        p.x = cx + Math.cos(angle) * orbitR;
        p.y = cy + Math.sin(angle) * orbitR * 0.5;
        p.radius = baseRadius * (0.6 + i * 0.1);

        ctx.beginPath();
        ctx.ellipse(cx, cy, orbitR, orbitR * 0.5, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 120, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        p.render(ctx);
      }

      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = i === this.selectedPlanet ? '#88aaff' : '#667';
      ctx.fillText(p.name, p.x, p.y + p.radius + 20);
    }

    // Selected planet info
    if (this.selectedPlanet >= 0) {
      const sp = this.planets[this.selectedPlanet];
      const bw = 160, bh = 40;
      const bx = sp.x - bw / 2, by = sp.y + sp.radius + 40;
      this.enterButtonRect = { x: bx, y: by, w: bw, h: bh };
      ctx.fillStyle = 'rgba(50, 80, 150, 0.8)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.fillStyle = '#dde';
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.fillText('⬇ Land Here', sp.x, by + bh / 2 + 5);
    }

    // Bottom buttons row
    const btnW = 130;
    const btnH = 44;
    const gap = 12;
    const totalW = btnW * 3 + gap * 2;
    const startX = w / 2 - totalW / 2;
    const btnY = h - 80;

    // Create planet
    this.createButtonRect = { x: startX, y: btnY, w: btnW, h: btnH };
    ctx.fillStyle = 'rgba(40, 60, 120, 0.9)';
    ctx.beginPath();
    ctx.roundRect(startX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.strokeStyle = '#6688cc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#dde';
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('+ Planet', startX + btnW / 2, btnY + btnH / 2 + 5);

    // Fly ship
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
    ctx.fillText('🚀 Fly', flyX + btnW / 2, btnY + btnH / 2 + 5);

    // Warp right (next galaxy / new galaxy)
    const warpX = flyX + btnW + gap;
    this.warpRightRect = { x: warpX, y: btnY, w: btnW, h: btnH };
    const isNew = this.currentGalaxy >= this.galaxies.length - 1;
    ctx.fillStyle = isNew ? 'rgba(80, 40, 100, 0.9)' : 'rgba(60, 40, 100, 0.9)';
    ctx.beginPath();
    ctx.roundRect(warpX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.strokeStyle = '#aa66ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ddccff';
    ctx.fillText(isNew ? '🌀 New Galaxy' : '🌀 Next →', warpX + btnW / 2, btnY + btnH / 2 + 5);

    // Warp left (previous galaxy)
    if (this.currentGalaxy > 0) {
      const wlW = 100, wlH = 36;
      const wlX = 16, wlY = h - 80;
      this.warpLeftRect = { x: wlX, y: wlY, w: wlW, h: wlH };
      ctx.fillStyle = 'rgba(60, 40, 100, 0.9)';
      ctx.beginPath();
      ctx.roundRect(wlX, wlY, wlW, wlH, 8);
      ctx.fill();
      ctx.strokeStyle = '#aa66ff';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#ddccff';
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillText('← Back', wlX + wlW / 2, wlY + wlH / 2 + 5);
    } else {
      this.warpLeftRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    // Multiplayer button (top right)
    const mpW = 110, mpH = 36;
    const mpX = w - mpW - 16, mpY = 16;
    this.multiplayerRect = { x: mpX, y: mpY, w: mpW, h: mpH };
    ctx.fillStyle = 'rgba(60, 30, 100, 0.9)';
    ctx.beginPath();
    ctx.roundRect(mpX, mpY, mpW, mpH, 8);
    ctx.fill();
    ctx.strokeStyle = '#aa66ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ddccff';
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Multiplayer', mpX + mpW / 2, mpY + mpH / 2 + 5);

    ctx.textAlign = 'left';

    // Title with galaxy name
    const gColor = GALAXY_COLORS[this.currentGalaxy % GALAXY_COLORS.length];
    ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = gColor;
    ctx.fillText(`🌌 ${this.galaxyName}`, w / 2, 45);
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#667';
    ctx.fillText(`Galaxy ${this.currentGalaxy + 1} of ${this.galaxies.length}`, w / 2, 65);
    ctx.textAlign = 'left';

    if (this.showTypePicker) this.renderTypePicker(ctx, w, h);
  }

  renderTypePicker(ctx, w, h) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, w, h);

    const pw = Math.min(480, w - 32), ph = Math.min(540, h - 60);
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.97)';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 14);
    ctx.fill();
    ctx.strokeStyle = '#4466aa';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#88aaff';
    ctx.fillText('🌍 Choose Planet Type', w / 2, py + 36);

    const types = [
      { key: 'earth', name: 'Earth', desc: 'Oceans & continents', icon: '🌍' },
      { key: 'lava', name: 'Lava', desc: 'Molten & fiery', icon: '🌋' },
      { key: 'ice', name: 'Ice', desc: 'Frozen wasteland', icon: '🧊' },
      { key: 'gas', name: 'Gas Giant', desc: 'Bands & rings', icon: '🪐' },
      { key: 'desert', name: 'Desert', desc: 'Sandy dunes', icon: '🏜️' },
      { key: 'forest', name: 'Forest', desc: 'Lush & green', icon: '🌲' },
      { key: 'ocean', name: 'Ocean', desc: 'Water world', icon: '🌊' },
      { key: 'rock', name: 'Rock', desc: 'Craters & ridges', icon: '🪨' },
      { key: 'toxic', name: 'Toxic', desc: 'Dangerous swirls', icon: '☣️' },
    ];

    this.typePickerRects = [];
    const cols = 3;
    const cardW = (pw - 40) / cols - 8;
    const cardH = 100;
    const startX = px + 20;
    const startY = py + 60;
    for (let i = 0; i < types.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + 8);
      const cy = startY + row * (cardH + 8);
      this.typePickerRects.push({ x: cx, y: cy, w: cardW, h: cardH });

      ctx.fillStyle = 'rgba(30, 30, 60, 0.9)';
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 10);
      ctx.fill();
      ctx.strokeStyle = '#4466aa';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '32px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(types[i].icon, cx + cardW / 2, cy + 38);
      ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#cce';
      ctx.fillText(types[i].name, cx + cardW / 2, cy + 62);
      ctx.font = '10px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText(types[i].desc, cx + cardW / 2, cy + 80);
    }

    // Close button
    const cbw = 32, cbh = 32;
    const cbx = px + pw - cbw - 12, cby = py + 10;
    this.typePickerClose = { x: cbx, y: cby, w: cbw, h: cbh };
    ctx.fillStyle = '#442222';
    ctx.beginPath();
    ctx.roundRect(cbx, cby, cbw, cbh, 6);
    ctx.fill();
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('✕', cbx + cbw / 2, cby + cbh / 2 + 6);

    ctx.textAlign = 'left';
  }
}
