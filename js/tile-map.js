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

      if (dist > MAP_SIZE * 0.45) {
        this.tiles[i] = TILE.WATER;
      } else if (Math.random() < 0.06 && dist > 5) {
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
    const t = this.get(x, y);
    return t === TILE.EMPTY;
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
      case TILE.EMPTY:
        ctx.fillStyle = ((sx + sy) & 1) ? COLORS.dirt : COLORS.dirtLight;
        ctx.fillRect(sx, sy, ts, ts);
        break;
      case TILE.WATER:
        ctx.fillStyle = COLORS.water;
        ctx.fillRect(sx, sy, ts, ts);
        break;
      case TILE.ROCK:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = COLORS.rock;
        ctx.beginPath();
        ctx.arc(sx + ts / 2, sy + ts / 2, ts * 0.35, 0, Math.PI * 2);
        ctx.fill();
        break;
      case TILE.FARM:
        ctx.fillStyle = COLORS.farmDirt;
        ctx.fillRect(sx, sy, ts, ts);
        if (data) this.renderCrop(ctx, sx, sy, data);
        break;
      case TILE.TURRET:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = COLORS.turret;
        ctx.fillRect(sx + 4, sy + 4, ts - 8, ts - 8);
        ctx.fillStyle = '#88aacc';
        ctx.fillRect(sx + ts / 2 - 3, sy + 2, 6, ts / 2);
        break;
      case TILE.WALL:
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(sx, sy, ts, ts);
        ctx.strokeStyle = '#8a8a9a';
        ctx.strokeRect(sx + 2, sy + 2, ts - 4, ts - 4);
        break;
      case TILE.BARRACKS:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = COLORS.barracks;
        ctx.fillRect(sx + 3, sy + 3, ts - 6, ts - 6);
        ctx.fillStyle = '#aa7755';
        ctx.fillRect(sx + ts / 2 - 4, sy + ts - 10, 8, 8);
        break;
      case TILE.SOLAR:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        ctx.fillStyle = COLORS.solar;
        ctx.fillRect(sx + 6, sy + 6, ts - 12, ts - 12);
        ctx.fillStyle = '#5588cc';
        ctx.fillRect(sx + 10, sy + 10, ts - 20, ts - 20);
        break;
      case TILE.BED:
        ctx.fillStyle = COLORS.dirt;
        ctx.fillRect(sx, sy, ts, ts);
        // Frame
        ctx.fillStyle = '#7a5533';
        ctx.fillRect(sx + 4, sy + 8, ts - 8, ts - 12);
        // Mattress
        ctx.fillStyle = '#cc4444';
        ctx.fillRect(sx + 6, sy + 10, ts - 12, ts - 18);
        // Pillow
        ctx.fillStyle = '#eeddcc';
        ctx.fillRect(sx + 8, sy + 10, 14, 10);
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
