import { TILE, TILE_SIZE, MAP_SIZE, COLORS, CROP_STAGES, CROP_GROW_TIME, CROP_HARVEST_VALUE } from './constants.js';

export class TileMap {
  constructor() {
    this.tiles = new Array(MAP_SIZE * MAP_SIZE).fill(0);
    this.tileData = new Array(MAP_SIZE * MAP_SIZE).fill(null);
    this.generate();
  }

  generate() {
    for (let i = 0; i < this.tiles.length; i++) {
      const x = i % MAP_SIZE;
      const y = (i / MAP_SIZE) | 0;
      const cx = MAP_SIZE / 2;
      const cy = MAP_SIZE / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

      if (Math.random() < 0.04 && dist > 5) {
        this.tiles[i] = TILE.ROCK;
      } else {
        this.tiles[i] = TILE.EMPTY;
      }
    }
  }

  get(x, y) {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return TILE.WATER;
    return this.tiles[y * MAP_SIZE + x];
  }

  getData(x, y) {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return null;
    return this.tileData[y * MAP_SIZE + x];
  }

  set(x, y, type, data = null) {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return;
    this.tiles[y * MAP_SIZE + x] = type;
    this.tileData[y * MAP_SIZE + x] = data;
  }

  isBuildable(x, y) {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return false;
    const t = this.get(x, y);
    return t === TILE.EMPTY || t === TILE.WATER;
  }

  update(dt, resources) {
    for (let i = 0; i < this.tiles.length; i++) {
      if (this.tiles[i] !== TILE.FARM) continue;
      const d = this.tileData[i];
      if (!d || d.stage >= CROP_STAGES) continue;
      d.timer += dt;
      if (d.timer >= CROP_GROW_TIME) {
        d.timer = 0;
        d.stage++;
      }
    }
    // Solar panels generate energy
    for (let i = 0; i < this.tiles.length; i++) {
      if (this.tiles[i] === TILE.SOLAR) {
        resources.add('energy', 0.5 * dt);
      }
    }
  }

  render(ctx, camera) {
    const startX = Math.max(0, (camera.x / TILE_SIZE | 0) - 1);
    const startY = Math.max(0, (camera.y / TILE_SIZE | 0) - 1);
    const endX = Math.min(MAP_SIZE, ((camera.x + camera.screenW) / TILE_SIZE | 0) + 2);
    const endY = Math.min(MAP_SIZE, ((camera.y + camera.screenH) / TILE_SIZE | 0) + 2);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const wx = x * TILE_SIZE;
        const wy = y * TILE_SIZE;
        const s = camera.worldToScreen(wx, wy);
        const tile = this.get(x, y);
        this.renderTile(ctx, s.x, s.y, tile, this.tileData[y * MAP_SIZE + x]);
      }
    }
  }

  renderTile(ctx, sx, sy, tile, data) {
    const ts = TILE_SIZE;
    switch (tile) {
      case TILE.EMPTY: {
        // Subtle grass tile with noise
        const seed = ((sx * 13) ^ (sy * 7)) & 7;
        const base = seed > 3 ? '#3a4a25' : '#324019';
        ctx.fillStyle = base;
        ctx.fillRect(sx, sy, ts, ts);
        // Grass blades
        ctx.fillStyle = seed > 5 ? '#4a5a30' : '#3a4a22';
        for (let i = 0; i < 3; i++) {
          const gx = sx + ((seed * 11 + i * 17) % ts);
          const gy = sy + ((seed * 7 + i * 13) % ts);
          ctx.fillRect(gx, gy, 2, 3);
        }
        break;
      }
      case TILE.WATER: {
        const wg = ctx.createLinearGradient(sx, sy, sx, sy + ts);
        wg.addColorStop(0, '#1a4a8a');
        wg.addColorStop(0.5, '#1a3a6a');
        wg.addColorStop(1, '#0a2a5a');
        ctx.fillStyle = wg;
        ctx.fillRect(sx, sy, ts, ts);
        // Wave shimmer
        const t = Date.now() / 800;
        ctx.fillStyle = `rgba(150,200,255,${0.1 + Math.sin(t + sx * 0.05) * 0.1})`;
        ctx.fillRect(sx + 4, sy + 8, ts - 8, 2);
        ctx.fillRect(sx + 8, sy + 20, ts - 16, 2);
        break;
      }
      case TILE.ROCK: {
        ctx.fillStyle = '#2a3015';
        ctx.fillRect(sx, sy, ts, ts);
        // Shaded rock
        const cx = sx + ts / 2, cy = sy + ts / 2;
        const rg = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, ts * 0.45);
        rg.addColorStop(0, '#9a9a9a');
        rg.addColorStop(0.6, '#5a5a5a');
        rg.addColorStop(1, '#2a2a2a');
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.stroke();
        // Crack
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 6);
        ctx.lineTo(cx + 2, cy + 4);
        ctx.stroke();
        break;
      }
      case TILE.FARM:
        ctx.fillStyle = COLORS.farmDirt;
        ctx.fillRect(sx, sy, ts, ts);
        if (data) this.renderCrop(ctx, sx, sy, data);
        break;
      case TILE.TURRET:
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx + 7, sy + 7, ts - 8, ts - 8);
        ctx.fillStyle = COLORS.turret;
        ctx.fillRect(sx + 4, sy + 4, ts - 8, ts - 8);
        // Highlight
        ctx.fillStyle = '#6a8aaa';
        ctx.fillRect(sx + 4, sy + 4, ts - 8, 4);
        ctx.fillStyle = '#88aacc';
        ctx.fillRect(sx + ts / 2 - 3, sy + 2, 6, ts / 2);
        break;
      case TILE.WALL:
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx + 3, sy + 3, ts, ts);
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#8a8a9a';
        ctx.fillRect(sx, sy, ts, 4);
        ctx.strokeStyle = '#4a4a5a';
        ctx.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4);
        break;
      case TILE.BARRACKS:
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(sx + 6, sy + 6, ts - 6, ts - 6);
        ctx.fillStyle = COLORS.barracks;
        ctx.fillRect(sx + 3, sy + 3, ts - 6, ts - 6);
        // Roof highlight
        ctx.fillStyle = '#aa8866';
        ctx.fillRect(sx + 3, sy + 3, ts - 6, 5);
        ctx.fillStyle = '#aa7755';
        ctx.fillRect(sx + ts / 2 - 4, sy + ts - 10, 8, 8);
        break;
      case TILE.SOLAR:
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx + 9, sy + 9, ts - 12, ts - 12);
        ctx.fillStyle = COLORS.solar;
        ctx.fillRect(sx + 6, sy + 6, ts - 12, ts - 12);
        ctx.fillStyle = '#5588cc';
        ctx.fillRect(sx + 10, sy + 10, ts - 20, ts - 20);
        // Glint
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(sx + 12, sy + 12, 4, 4);
        break;
      case TILE.BED:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = '#7a5533';
        ctx.fillRect(sx + 4, sy + 8, ts - 8, ts - 12);
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(sx + 6, sy + 10, ts - 12, ts - 18);
        ctx.fillStyle = '#eeddcc';
        ctx.fillRect(sx + 8, sy + 10, 14, 10);
        break;
      case TILE.CARPET:
        ctx.fillStyle = '#882233';
        ctx.fillRect(sx, sy, ts, ts);
        // Pattern
        ctx.strokeStyle = '#aa4455';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 4, sy + 4, ts - 8, ts - 8);
        ctx.strokeRect(sx + 8, sy + 8, ts - 16, ts - 16);
        // Diamond center
        ctx.fillStyle = '#cc6644';
        ctx.beginPath();
        ctx.moveTo(sx + ts / 2, sy + 12);
        ctx.lineTo(sx + ts - 12, sy + ts / 2);
        ctx.lineTo(sx + ts / 2, sy + ts - 12);
        ctx.lineTo(sx + 12, sy + ts / 2);
        ctx.closePath();
        ctx.fill();
        break;
      case TILE.TV:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        // TV body
        ctx.fillStyle = '#222';
        ctx.fillRect(sx + 4, sy + 6, ts - 8, ts - 16);
        // Screen
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(sx + 6, sy + 8, ts - 12, ts - 22);
        // Batman on screen!
        const t = Date.now() / 400;
        // Batman silhouette
        ctx.fillStyle = '#111133';
        ctx.fillRect(sx + 6, sy + 8, ts - 12, ts - 22);
        // Moon
        ctx.beginPath();
        ctx.arc(sx + ts - 14, sy + 14, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffdd88';
        ctx.fill();
        // Batman body
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(sx + ts / 2, sy + 12);
        ctx.lineTo(sx + ts / 2 - 6, sy + ts - 14);
        ctx.lineTo(sx + ts / 2 + 6, sy + ts - 14);
        ctx.closePath();
        ctx.fill();
        // Ears
        ctx.fillRect(sx + ts / 2 - 5, sy + 10, 3, 5);
        ctx.fillRect(sx + ts / 2 + 2, sy + 10, 3, 5);
        // Cape
        ctx.beginPath();
        ctx.moveTo(sx + ts / 2 - 4, sy + 16);
        ctx.lineTo(sx + ts / 2 - 10, sy + ts - 14);
        ctx.lineTo(sx + ts / 2 + 10, sy + ts - 14);
        ctx.lineTo(sx + ts / 2 + 4, sy + 16);
        ctx.closePath();
        ctx.fill();
        // Stand
        ctx.fillStyle = '#444';
        ctx.fillRect(sx + ts / 2 - 6, sy + ts - 10, 12, 4);
        ctx.fillRect(sx + ts / 2 - 2, sy + ts - 14, 4, 4);
        break;
      case TILE.LAMP:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        // Pole
        ctx.fillStyle = '#888';
        ctx.fillRect(sx + ts / 2 - 2, sy + 14, 4, ts - 20);
        // Base
        ctx.fillStyle = '#666';
        ctx.fillRect(sx + ts / 2 - 8, sy + ts - 8, 16, 4);
        // Shade
        ctx.fillStyle = '#ddcc88';
        ctx.beginPath();
        ctx.moveTo(sx + ts / 2 - 10, sy + 16);
        ctx.lineTo(sx + ts / 2 + 10, sy + 16);
        ctx.lineTo(sx + ts / 2 + 6, sy + 6);
        ctx.lineTo(sx + ts / 2 - 6, sy + 6);
        ctx.closePath();
        ctx.fill();
        // Glow
        ctx.beginPath();
        ctx.arc(sx + ts / 2, sy + 12, 14, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 240, 150, 0.15)';
        ctx.fill();
        break;
      case TILE.PLANT:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        // Pot
        ctx.fillStyle = '#aa6633';
        ctx.fillRect(sx + ts / 2 - 8, sy + ts - 16, 16, 12);
        ctx.fillStyle = '#884422';
        ctx.fillRect(sx + ts / 2 - 10, sy + ts - 16, 20, 4);
        // Leaves
        ctx.fillStyle = '#33aa44';
        ctx.beginPath();
        ctx.arc(sx + ts / 2, sy + ts - 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + ts / 2 - 6, sy + ts - 24, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + ts / 2 + 6, sy + ts - 24, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx + ts / 2, sy + ts - 28, 5, 0, Math.PI * 2);
        ctx.fill();
        break;
      case TILE.TROPHY:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        // Base
        ctx.fillStyle = '#665544';
        ctx.fillRect(sx + ts / 2 - 10, sy + ts - 10, 20, 6);
        ctx.fillStyle = '#554433';
        ctx.fillRect(sx + ts / 2 - 4, sy + ts - 16, 8, 6);
        // Cup
        ctx.fillStyle = '#ffcc22';
        ctx.beginPath();
        ctx.moveTo(sx + ts / 2 - 8, sy + 10);
        ctx.lineTo(sx + ts / 2 - 6, sy + ts - 18);
        ctx.lineTo(sx + ts / 2 + 6, sy + ts - 18);
        ctx.lineTo(sx + ts / 2 + 8, sy + 10);
        ctx.closePath();
        ctx.fill();
        // Rim
        ctx.fillStyle = '#ffdd44';
        ctx.fillRect(sx + ts / 2 - 10, sy + 8, 20, 4);
        // Handles
        ctx.strokeStyle = '#ffcc22';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx + ts / 2 - 10, sy + 18, 5, Math.PI * 0.5, Math.PI * 1.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx + ts / 2 + 10, sy + 18, 5, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.stroke();
        // Star
        ctx.fillStyle = '#fff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', sx + ts / 2, sy + 24);
        ctx.textAlign = 'left';
        break;
    }
  }

  renderCrop(ctx, sx, sy, data) {
    const ts = TILE_SIZE;
    const stage = data.stage;
    const h = 4 + stage * 6;
    const green = stage >= CROP_STAGES ? '#ffdd44' : `rgb(${40 + stage * 30}, ${120 + stage * 30}, ${30 + stage * 10})`;
    ctx.fillStyle = green;
    for (let i = 0; i < 3; i++) {
      const ox = 8 + i * 12;
      ctx.fillRect(sx + ox, sy + ts - h - 4, 4, h);
      if (stage >= 2) {
        ctx.beginPath();
        ctx.arc(sx + ox + 2, sy + ts - h - 4, 3 + stage, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
