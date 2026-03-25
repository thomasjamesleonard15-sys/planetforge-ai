import { multiplayer } from './multiplayer.js';

const WORLD_SYNC_RATE = 1000 / 10;

export class WorldSync {
  constructor() {
    this.syncTimer = 0;
    this.planetPositions = null;
    this.portalPos = null;
  }

  hostSyncSurface(dt, enemies) {
    this.syncTimer += dt * 1000;
    if (this.syncTimer < WORLD_SYNC_RATE) return;
    this.syncTimer = 0;
    if (!enemies) return;

    const enemyData = [];
    for (const e of enemies.pool) {
      if (!e.active) continue;
      enemyData.push({ x: e.x, y: e.y, health: e.health, maxHealth: e.maxHealth, color: e.color, radius: e.radius, type: e.type });
    }

    multiplayer.broadcastHostState({
      action: 'world-surface',
      wave: enemies.wave,
      waveTimer: enemies.waveTimer,
      enemies: enemyData,
    });
  }

  hostSyncSpace(dt, space) {
    this.syncTimer += dt * 1000;
    if (this.syncTimer < WORLD_SYNC_RATE) return;
    this.syncTimer = 0;

    const planets = [];
    for (const p of space.planets) {
      planets.push({ spaceX: p.spaceX, spaceY: p.spaceY, radius: p.radius, name: p.name });
    }

    const aliens = [];
    for (const a of space.aliens.pool) {
      if (!a.active) continue;
      aliens.push({ x: a.x, y: a.y, hp: a.hp, maxHp: a.maxHp, color: a.color, radius: a.radius, aggro: a.aggro });
    }

    multiplayer.broadcastHostState({
      action: 'world-space',
      planets,
      portal: { x: space.portal.x, y: space.portal.y },
      alienWave: space.aliens.wave,
      aliens,
    });
  }

  applySurface(data, enemies) {
    if (!enemies || data.action !== 'world-surface') return;
    enemies.wave = data.wave;
    enemies.waveTimer = data.waveTimer;

    for (const e of enemies.pool) e.active = false;

    if (data.enemies) {
      for (let i = 0; i < data.enemies.length && i < enemies.pool.length; i++) {
        const src = data.enemies[i];
        const e = enemies.pool[i];
        e.active = true;
        e.x = src.x; e.y = src.y;
        e.health = src.health; e.maxHealth = src.maxHealth;
        e.color = src.color; e.radius = src.radius;
        e.type = src.type;
      }
    }
  }

  applySpace(data, space) {
    if (!space || data.action !== 'world-space') return;

    if (data.planets) {
      for (let i = 0; i < data.planets.length && i < space.planets.length; i++) {
        const src = data.planets[i];
        space.planets[i].spaceX = src.spaceX;
        space.planets[i].spaceY = src.spaceY;
        space.planets[i].radius = src.radius;
        space.planets[i].x = src.spaceX;
        space.planets[i].y = src.spaceY;
      }
    }

    if (data.portal) {
      space.portal.x = data.portal.x;
      space.portal.y = data.portal.y;
    }

    if (data.alienWave !== undefined) {
      space.aliens.wave = data.alienWave;
    }

    if (data.aliens) {
      for (const a of space.aliens.pool) a.active = false;
      for (let i = 0; i < data.aliens.length && i < space.aliens.pool.length; i++) {
        const src = data.aliens[i];
        const a = space.aliens.pool[i];
        a.active = true;
        a.x = src.x; a.y = src.y;
        a.hp = src.hp; a.maxHp = src.maxHp;
        a.color = src.color; a.radius = src.radius;
        a.aggro = src.aggro;
      }
    }
  }
}
