import { TILE_SIZE, MAP_SIZE } from './constants.js';

const CREATURE_TYPES = [
  { name: 'Grazer', color: '#aa6633', size: 12, speed: 25, shape: 'quad', temperament: 'passive' },
  { name: 'Crawler', color: '#446622', size: 9, speed: 40, shape: 'bug', temperament: 'skittish' },
  { name: 'Hopper', color: '#cc88aa', size: 8, speed: 55, shape: 'round', temperament: 'skittish' },
  { name: 'Stalker', color: '#222244', size: 14, speed: 35, shape: 'quad', temperament: 'passive' },
  { name: 'Flutterling', color: '#ffaa44', size: 6, speed: 60, shape: 'winged', temperament: 'skittish' },
  { name: 'Shimmerfish', color: '#44aaff', size: 10, speed: 45, shape: 'round', temperament: 'passive' },
  { name: 'Glowworm', color: '#88ff44', size: 7, speed: 20, shape: 'worm', temperament: 'passive' },
  { name: 'Spikehead', color: '#cc4422', size: 13, speed: 30, shape: 'spiked', temperament: 'passive' },
];

const MAX = 12;
const STORAGE_KEY = 'pforge-discoveries';

export class WildlifeSystem {
  constructor() {
    this.pool = [];
    for (let i = 0; i < MAX; i++) {
      this.pool.push({
        active: false, x: 0, y: 0, vx: 0, vy: 0, wanderTimer: 0,
        type: null, color: '', size: 0, speed: 0, shape: '', scanned: false,
        name: '', bob: 0,
      });
    }
    this.discoveries = new Set();
    this.credits = 0;
    this.scanActive = false;
    this.scanRadius = 0;
    this.scanMaxRadius = 250;
    this.scanCooldown = 0;
    this.load();
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data) {
        if (data.discoveries) for (const d of data.discoveries) this.discoveries.add(d);
        this.credits = data.credits || 0;
      }
    } catch (_) {}
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        discoveries: [...this.discoveries], credits: this.credits,
      }));
    } catch (_) {}
  }

  spawn(planetName) {
    // Pick 2-4 creature types for this planet based on name hash
    let hash = 0;
    for (let i = 0; i < planetName.length; i++) hash = ((hash << 5) - hash + planetName.charCodeAt(i)) | 0;
    const typesForPlanet = [];
    const typeCount = 2 + (Math.abs(hash) % 3);
    for (let i = 0; i < typeCount; i++) typesForPlanet.push(CREATURE_TYPES[(Math.abs(hash) + i * 3) % CREATURE_TYPES.length]);

    for (const c of this.pool) {
      const t = typesForPlanet[Math.floor(Math.random() * typesForPlanet.length)];
      c.active = true;
      c.x = Math.random() * MAP_SIZE * TILE_SIZE;
      c.y = Math.random() * MAP_SIZE * TILE_SIZE;
      c.vx = 0; c.vy = 0;
      c.wanderTimer = Math.random() * 2;
      c.type = t.name;
      c.color = t.color;
      c.size = t.size;
      c.speed = t.speed;
      c.shape = t.shape;
      c.temperament = t.temperament;
      c.scanned = this.discoveries.has(`${planetName}:${t.name}`);
      c.name = `${t.name}`;
      c.bob = Math.random() * Math.PI * 2;
      c.planet = planetName;
    }
  }

  update(dt, player) {
    if (this.scanActive) {
      this.scanRadius += 400 * dt;
      if (this.scanRadius >= this.scanMaxRadius) {
        this.scanActive = false;
        this.scanRadius = 0;
      }
    }
    if (this.scanCooldown > 0) this.scanCooldown -= dt;

    for (const c of this.pool) {
      if (!c.active) continue;
      c.wanderTimer -= dt;
      c.bob += dt * 4;
      if (c.wanderTimer <= 0) {
        c.wanderTimer = 1 + Math.random() * 3;
        const a = Math.random() * Math.PI * 2;
        c.vx = Math.cos(a) * c.speed;
        c.vy = Math.sin(a) * c.speed;
      }
      // Flee from player if skittish
      const dx = player.x - c.x, dy = player.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (c.temperament === 'skittish' && dist < 120) {
        c.vx = -(dx / dist) * c.speed * 1.8;
        c.vy = -(dy / dist) * c.speed * 1.8;
      }
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      // Bounce off map edges
      if (c.x < 20) { c.x = 20; c.vx = Math.abs(c.vx); }
      if (c.x > MAP_SIZE * TILE_SIZE - 20) { c.x = MAP_SIZE * TILE_SIZE - 20; c.vx = -Math.abs(c.vx); }
      if (c.y < 20) { c.y = 20; c.vy = Math.abs(c.vy); }
      if (c.y > MAP_SIZE * TILE_SIZE - 20) { c.y = MAP_SIZE * TILE_SIZE - 20; c.vy = -Math.abs(c.vy); }

      // If scan wave reaches creature, discover it
      if (this.scanActive && !c.scanned) {
        const sDist = Math.sqrt(dx * dx + dy * dy);
        if (sDist < this.scanRadius) {
          c.scanned = true;
          const key = `${c.planet}:${c.type}`;
          if (!this.discoveries.has(key)) {
            this.discoveries.add(key);
            this.credits += 100;
            this.save();
          }
        }
      }
    }
  }

  triggerScan() {
    if (this.scanCooldown > 0) return;
    this.scanActive = true;
    this.scanRadius = 0;
    this.scanCooldown = 2;
  }

  render(ctx, camera, player) {
    for (const c of this.pool) {
      if (!c.active) continue;
      if (!camera.isVisible(c.x, c.y, 30)) continue;
      const s = camera.worldToScreen(c.x, c.y);
      const bob = Math.sin(c.bob) * 2;
      const r = c.size;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(s.x + 3, s.y + r * 0.8, r * 0.7, r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body shape
      ctx.save();
      ctx.translate(s.x, s.y + bob);
      if (c.shape === 'quad') {
        // 4-legged creature
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Head
        ctx.beginPath();
        ctx.arc(r * 0.7, -r * 0.2, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
        ctx.stroke();
        // Legs
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.5 + i * r * 0.3, r * 0.3);
          ctx.lineTo(-r * 0.5 + i * r * 0.3, r * 0.7);
          ctx.stroke();
        }
        // Eye
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(r * 0.8, -r * 0.25, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.shape === 'bug') {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Segments
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-r + i * r * 0.7, -r * 0.8);
          ctx.lineTo(-r + i * r * 0.7, r * 0.8);
          ctx.stroke();
        }
        // Antennae
        ctx.beginPath();
        ctx.moveTo(r * 0.8, -r * 0.3); ctx.lineTo(r * 1.3, -r * 0.7);
        ctx.moveTo(r * 0.8, r * 0.3); ctx.lineTo(r * 1.3, r * 0.7);
        ctx.stroke();
      } else if (c.shape === 'round') {
        const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.4, c.color);
        g.addColorStop(1, '#000');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-r * 0.25, -r * 0.1, 1.5, 0, Math.PI * 2);
        ctx.arc(r * 0.25, -r * 0.1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.shape === 'winged') {
        const flap = Math.sin(c.bob * 4) * 0.5;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Wings
        ctx.save();
        ctx.fillStyle = c.color + 'cc';
        ctx.beginPath();
        ctx.ellipse(-r * 0.8, 0, r, r * 0.4, flap, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(r * 0.8, 0, r, r * 0.4, -flap, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (c.shape === 'worm') {
        ctx.strokeStyle = c.color;
        ctx.lineWidth = r * 0.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const wx = -r + i * r * 0.7;
          const wy = Math.sin(c.bob + i) * 3;
          if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
        }
        ctx.stroke();
        // Glow
        ctx.fillStyle = c.color + 'aa';
        ctx.beginPath();
        ctx.arc(r * 1.1, 0, r * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.shape === 'spiked') {
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        // Spikes
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + c.bob;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.lineTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
          ctx.stroke();
        }
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Scanned indicator
      if (c.scanned) {
        ctx.fillStyle = '#44ff88';
        ctx.font = '9px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓ ' + c.type, s.x, s.y - r - 6);
      }
    }

    // Scan pulse wave
    if (this.scanActive) {
      const ps = camera.worldToScreen(player.x, player.y);
      ctx.strokeStyle = `rgba(100, 255, 180, ${1 - this.scanRadius / this.scanMaxRadius})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, this.scanRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(200, 255, 220, ${(1 - this.scanRadius / this.scanMaxRadius) * 0.5})`;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, this.scanRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.textAlign = 'left';
  }

  renderHUD(ctx, w, h) {
    // Credits display
    ctx.fillStyle = 'rgba(20, 30, 50, 0.85)';
    ctx.beginPath();
    ctx.roundRect(w - 180, 150, 164, 34, 8);
    ctx.fill();
    ctx.strokeStyle = '#44aaff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#88ccff';
    ctx.fillText(`💠 ${this.credits}  📖 ${this.discoveries.size}`, w - 170, 172);

    // Scan button
    const sbw = 60, sbh = 38;
    const sbx = w - sbw - 16, sby = 195;
    this.scanBtnRect = { x: sbx, y: sby, w: sbw, h: sbh };
    ctx.fillStyle = this.scanCooldown > 0 ? 'rgba(40, 40, 60, 0.7)' : 'rgba(20, 60, 80, 0.9)';
    ctx.beginPath();
    ctx.roundRect(sbx, sby, sbw, sbh, 8);
    ctx.fill();
    ctx.strokeStyle = this.scanCooldown > 0 ? '#666' : '#44ddff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = this.scanCooldown > 0 ? '#888' : '#aaeeff';
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.fillText('📡', sbx + sbw / 2, sby + 22);
    ctx.font = '9px -apple-system, system-ui, sans-serif';
    ctx.fillText(this.scanCooldown > 0 ? this.scanCooldown.toFixed(1) + 's' : 'SCAN', sbx + sbw / 2, sby + 33);
    ctx.textAlign = 'left';
  }

  handleScanTap(x, y) {
    const r = this.scanBtnRect;
    if (r && r.w > 0 && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      this.triggerScan();
      return true;
    }
    return false;
  }
}
