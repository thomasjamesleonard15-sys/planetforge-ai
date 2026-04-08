import { TILE, TILE_SIZE, MAP_SIZE } from './constants.js';

const FOV = Math.PI / 3;
const NUM_RAYS = 120;
const MAX_DEPTH = 25 * TILE_SIZE;
const WALL_HEIGHT = 1.0;

const TILE_COLORS = {
  [TILE.WALL]: '#6a6a7a',
  [TILE.ROCK]: '#5a5a5a',
  [TILE.BARRACKS]: '#6a4a3a',
  [TILE.TURRET]: '#4a6a8a',
  [TILE.SOLAR]: '#3a5a8a',
  [TILE.BED]: '#7a5533',
  [TILE.TV]: '#222222',
  [TILE.PLANT]: '#2a6a3a',
  [TILE.LAMP]: '#aaaa66',
  [TILE.TROPHY]: '#ccaa44',
  [TILE.CARPET]: '#882233',
};

export function renderFPS(ctx, view) {
  const w = view.screenW;
  const h = view.screenH;
  const cx = w / 2;
  const cy = h / 2;

  // Sky
  const skyG = ctx.createLinearGradient(0, 0, 0, cy);
  skyG.addColorStop(0, '#0a0820');
  skyG.addColorStop(0.6, '#3a2848');
  skyG.addColorStop(1, '#a05030');
  ctx.fillStyle = skyG;
  ctx.fillRect(0, 0, w, cy);

  // Ground
  const groundG = ctx.createLinearGradient(0, cy, 0, h);
  groundG.addColorStop(0, '#3a2818');
  groundG.addColorStop(1, '#1a0808');
  ctx.fillStyle = groundG;
  ctx.fillRect(0, cy, w, cy);

  const px = view.player.x;
  const py = view.player.y;
  const angle = view.player.fpsAngle || 0;

  const rayStep = FOV / NUM_RAYS;
  const stripW = w / NUM_RAYS;
  const halfFov = FOV / 2;
  const projDist = (w / 2) / Math.tan(halfFov);

  // Cast rays for walls
  const depths = new Array(NUM_RAYS);
  for (let i = 0; i < NUM_RAYS; i++) {
    const rayA = angle - halfFov + i * rayStep;
    const cos = Math.cos(rayA);
    const sin = Math.sin(rayA);

    let dist = 0;
    let hitTile = 0;
    let side = 0;
    const stepSize = 4;
    while (dist < MAX_DEPTH) {
      dist += stepSize;
      const tx = (px + cos * dist) / TILE_SIZE | 0;
      const ty = (py + sin * dist) / TILE_SIZE | 0;
      if (tx < 0 || tx >= MAP_SIZE || ty < 0 || ty >= MAP_SIZE) { hitTile = TILE.WALL; break; }
      const t = view.tileMap.tiles[ty * MAP_SIZE + tx];
      if (t === TILE.WALL || t === TILE.ROCK || t === TILE.BARRACKS || t === TILE.TURRET || t === TILE.SOLAR) {
        hitTile = t;
        // Determine side for shading
        const fx = (px + cos * dist) % TILE_SIZE;
        const fy = (py + sin * dist) % TILE_SIZE;
        side = Math.abs(fx - TILE_SIZE / 2) > Math.abs(fy - TILE_SIZE / 2) ? 0 : 1;
        break;
      }
    }

    // Fix fisheye
    const correctedDist = dist * Math.cos(rayA - angle);
    depths[i] = correctedDist;

    if (hitTile) {
      const wallH = (TILE_SIZE * WALL_HEIGHT * projDist) / Math.max(correctedDist, 1);
      const wallY = cy - wallH / 2;
      const baseColor = TILE_COLORS[hitTile] || '#666';
      const shadeMul = side === 0 ? 1 : 0.7;
      const distFade = Math.max(0.2, 1 - correctedDist / MAX_DEPTH);
      const c = parseColor(baseColor);
      const r = (c[0] * shadeMul * distFade) | 0;
      const g = (c[1] * shadeMul * distFade) | 0;
      const b = (c[2] * shadeMul * distFade) | 0;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(i * stripW, wallY, stripW + 1, wallH);
    }
  }

  // Render enemies as billboards (sorted by distance, far to near)
  const sprites = [];
  if (view.enemies) {
    for (const e of view.enemies.pool) {
      if (!e.active) continue;
      sprites.push({ x: e.x, y: e.y, r: e.radius, color: e.color, type: 'enemy', e });
    }
  }
  for (const s of view.soldiers.pool) {
    if (!s.active) continue;
    sprites.push({ x: s.x, y: s.y, r: 10, color: '#44aa66', type: 'soldier' });
  }

  for (const sp of sprites) {
    const dx = sp.x - px;
    const dy = sp.y - py;
    sp.dist = Math.sqrt(dx * dx + dy * dy);
    sp.spriteAngle = Math.atan2(dy, dx);
  }
  sprites.sort((a, b) => b.dist - a.dist);

  for (const sp of sprites) {
    let relA = sp.spriteAngle - angle;
    while (relA < -Math.PI) relA += Math.PI * 2;
    while (relA > Math.PI) relA -= Math.PI * 2;
    if (Math.abs(relA) > halfFov + 0.3) continue;

    const screenX = cx + Math.tan(relA) * projDist;
    const correctedDist = sp.dist * Math.cos(relA);
    if (correctedDist < 10) continue;
    const size = (sp.r * 2 * projDist) / correctedDist;
    const top = cy - size / 2;

    // Depth check vs wall depth at this column
    const colIdx = Math.max(0, Math.min(NUM_RAYS - 1, Math.floor((screenX / w) * NUM_RAYS)));
    if (depths[colIdx] && correctedDist > depths[colIdx]) continue;

    const distFade = Math.max(0.3, 1 - correctedDist / MAX_DEPTH);
    const c = parseColor(sp.color);
    const r = (c[0] * distFade) | 0;
    const g = (c[1] * distFade) | 0;
    const b = (c[2] * distFade) | 0;

    // Body
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(screenX, top + size * 0.4, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(screenX - size * 0.12, top + size * 0.35, size * 0.08, 0, Math.PI * 2);
    ctx.arc(screenX + size * 0.12, top + size * 0.35, size * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(screenX - size * 0.12, top + size * 0.35, size * 0.04, 0, Math.PI * 2);
    ctx.arc(screenX + size * 0.12, top + size * 0.35, size * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // Body below head
    ctx.fillStyle = `rgb(${r * 0.7 | 0},${g * 0.7 | 0},${b * 0.7 | 0})`;
    ctx.fillRect(screenX - size * 0.3, top + size * 0.7, size * 0.6, size * 0.5);
    // Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(screenX, top + size * 1.2, size * 0.4, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    if (sp.e && sp.e.health < sp.e.maxHealth) {
      const barW = size * 0.8, barH = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(screenX - barW / 2, top - 8, barW, barH);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(screenX - barW / 2, top - 8, barW * (sp.e.health / sp.e.maxHealth), barH);
    }
  }

  // Weapon overlay (gun in front)
  const gunBob = Math.sin(Date.now() / 200) * 4;
  const gunY = h - 80 + gunBob;
  ctx.fillStyle = '#222';
  ctx.fillRect(cx - 30, gunY, 60, 40);
  ctx.fillStyle = '#666';
  ctx.fillRect(cx - 25, gunY + 5, 50, 8);
  ctx.fillStyle = view.player.weapon.color;
  ctx.fillRect(cx - 4, gunY - 12, 8, 12);
  // Muzzle flash
  if (view.player.fireCooldown > view.player.weapon.fireRate * 0.7) {
    const flash = ctx.createRadialGradient(cx, gunY - 14, 0, cx, gunY - 14, 30);
    flash.addColorStop(0, 'rgba(255,255,200,0.9)');
    flash.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = flash;
    ctx.beginPath();
    ctx.arc(cx, gunY - 14, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crosshair
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy); ctx.lineTo(cx - 3, cy);
  ctx.moveTo(cx + 3, cy); ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy - 3);
  ctx.moveTo(cx, cy + 3); ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  // Vignette
  const vg = ctx.createRadialGradient(cx, cy, h * 0.3, cx, cy, h * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

function parseColor(hex) {
  if (!hex || hex[0] !== '#') return [128, 128, 128];
  const h = hex.replace('#', '');
  if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
