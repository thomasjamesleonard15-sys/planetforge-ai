import { TILE, TILE_SIZE, MAP_SIZE } from './constants.js';

const TURRET_RANGE = 200;
const TURRET_FIRE_RATE = 0.8;
const TURRET_DAMAGE = 12;
const TURRET_BULLET_SPEED = 500;

export class TurretAI {
  constructor() {
    this.cooldowns = new Map();
  }

  update(dt, tileMap, enemies, projectiles, nightMonsters) {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        if (tileMap.get(x, y) !== TILE.TURRET) continue;

        const key = y * MAP_SIZE + x;
        const cd = this.cooldowns.get(key) || 0;
        if (cd > 0) {
          this.cooldowns.set(key, cd - dt);
          continue;
        }

        const tx = x * TILE_SIZE + TILE_SIZE / 2;
        const ty = y * TILE_SIZE + TILE_SIZE / 2;

        let closest = null;
        let closestDist = TURRET_RANGE;

        if (enemies) {
          for (const e of enemies.pool) {
            if (!e.active) continue;
            const dx = e.x - tx, dy = e.y - ty;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) { closestDist = dist; closest = e; }
          }
        }
        if (nightMonsters) {
          for (const m of nightMonsters) {
            if (!m.active) continue;
            const dx = m.x - tx, dy = m.y - ty;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) { closestDist = dist; closest = m; }
          }
        }

        if (closest) {
          const angle = Math.atan2(closest.y - ty, closest.x - tx);
          projectiles.fire(tx, ty, angle, {
            damage: TURRET_DAMAGE,
            bulletSpeed: TURRET_BULLET_SPEED,
            spread: 0.05,
            color: '#44ddff',
            pellets: 1,
          }, true);
          this.cooldowns.set(key, TURRET_FIRE_RATE);
        }
      }
    }
  }
}
