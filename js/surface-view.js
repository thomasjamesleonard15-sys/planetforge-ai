import { TILE, TILE_SIZE, BUILDING_COSTS, CROP_STAGES, CROP_HARVEST_VALUE } from './constants.js';
import { Camera } from './camera.js';
import { TileMap } from './tile-map.js';
import { Player } from './player.js';
import { ProjectileSystem } from './projectiles.js';
import { EnemySystem } from './enemies.js';
import { TurretAI } from './turret-ai.js';
import { ParticleSystem } from './particles.js';
import { Resources } from './resources.js';
import { HUD } from './hud.js';

export class SurfaceView {
  constructor() {
    this.camera = new Camera();
    this.tileMap = new TileMap();
    this.player = new Player();
    this.projectiles = new ProjectileSystem();
    this.enemies = new EnemySystem();
    this.turretAI = new TurretAI();
    this.particles = new ParticleSystem();
    this.resources = new Resources();
    this.hud = new HUD();
    this.screenW = 0;
    this.screenH = 0;
    this.gameOver = false;
  }

  resize(w, h) {
    this.screenW = w;
    this.screenH = h;
    this.camera.resize(w, h);
  }

  handleTouchStart(sx, sy) {
    // Build toggle button
    const btnSize = 56;
    const btnX = this.screenW - btnSize - 16;
    const btnY = this.screenH - btnSize - 90;
    if (sx >= btnX && sx <= btnX + btnSize && sy >= btnY && sy <= btnY + btnSize) {
      this.hud.showBuildMenu = !this.hud.showBuildMenu;
      return;
    }

    // Weapon switch button
    const wpnBtnY = btnY - btnSize - 12;
    if (sx >= btnX && sx <= btnX + btnSize && sy >= wpnBtnY && sy <= wpnBtnY + btnSize) {
      this.player.cycleWeapon();
      this.hud.showMessage(this.player.weapon.name);
      return;
    }

    // Build menu tap
    if (this.hud.showBuildMenu) {
      const idx = this.hud.handleBuildMenuTap(sx, sy, this.screenW, this.screenH);
      if (idx >= 0) return;
    }

    // Left half = joystick, right half = shoot or build
    if (sx < this.screenW * 0.4) {
      this.hud.joystickActive = true;
      this.hud.joystickOriginX = sx;
      this.hud.joystickOriginY = sy;
      this.hud.joystickX = 0;
      this.hud.joystickY = 0;
    } else {
      this.handleAction(sx, sy);
    }
  }

  handleTouchMove(sx, sy) {
    if (this.hud.joystickActive) {
      const dx = sx - this.hud.joystickOriginX;
      const dy = sy - this.hud.joystickOriginY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 60;
      if (dist > 0) {
        const clamp = Math.min(dist, maxDist);
        this.hud.joystickX = (dx / dist) * (clamp / maxDist);
        this.hud.joystickY = (dy / dist) * (clamp / maxDist);
      }
    }
  }

  handleTouchEnd() {
    this.hud.joystickActive = false;
    this.hud.joystickX = 0;
    this.hud.joystickY = 0;
  }

  handleAction(sx, sy) {
    const world = this.camera.screenToWorld(sx, sy);
    const tx = (world.x / TILE_SIZE) | 0;
    const ty = (world.y / TILE_SIZE) | 0;

    if (this.hud.showBuildMenu) {
      this.tryBuild(tx, ty);
    } else {
      this.tryShoot(sx, sy);
    }
  }

  tryBuild(tx, ty) {
    const type = this.hud.selectedTileType;

    // Harvest mature crops
    if (this.tileMap.get(tx, ty) === TILE.FARM) {
      const data = this.tileMap.getData(tx, ty);
      if (data && data.stage >= CROP_STAGES) {
        this.resources.add('food', CROP_HARVEST_VALUE);
        this.tileMap.set(tx, ty, TILE.FARM, { stage: 0, timer: 0 });
        this.particles.emit(
          tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2,
          10, { color: '#ffdd44', speed: 60, life: 0.4, radius: 4 }
        );
        this.hud.showMessage(`+${CROP_HARVEST_VALUE} Food!`);
        return;
      }
    }

    if (!this.tileMap.isBuildable(tx, ty)) {
      // Mine rocks for metal
      if (this.tileMap.get(tx, ty) === TILE.ROCK) {
        this.tileMap.set(tx, ty, TILE.EMPTY);
        this.resources.add('metal', 15);
        this.particles.emit(
          tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2,
          8, { color: '#aaaaaa', speed: 80, life: 0.3, radius: 3 }
        );
        this.hud.showMessage('+15 Metal!');
      }
      return;
    }

    const cost = BUILDING_COSTS[type];
    if (!this.resources.spend(cost)) {
      this.hud.showMessage('Not enough resources!');
      return;
    }

    const data = type === TILE.FARM ? { stage: 0, timer: 0 } : null;
    this.tileMap.set(tx, ty, type, data);
    this.particles.emit(
      tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2,
      6, { color: '#88aaff', speed: 50, life: 0.3, radius: 3 }
    );
  }

  tryShoot(sx, sy) {
    if (!this.player.canFire()) return;
    const world = this.camera.screenToWorld(sx, sy);
    const angle = Math.atan2(world.y - this.player.y, world.x - this.player.x);
    this.projectiles.fire(this.player.x, this.player.y, angle, this.player.weapon, true);
    this.player.fire();
    this.particles.emit(this.player.x, this.player.y, 3, {
      angle, spread: 0.3, color: this.player.weapon.color, speed: 150, life: 0.15, radius: 2,
    });
  }

  update(dt) {
    if (this.gameOver) return;

    this.player.update(dt, this.hud.joystickX, this.hud.joystickY);
    this.camera.follow(this.player.x, this.player.y);
    this.camera.update(dt);
    this.tileMap.update(dt, this.resources);
    this.enemies.update(dt, this.player, this.tileMap, this.resources, this.particles);
    this.turretAI.update(dt, this.tileMap, this.enemies, this.projectiles);
    this.projectiles.update(dt);
    this.particles.update(dt);
    this.hud.update(dt);
    this.checkCollisions();

    if (this.player.health <= 0) {
      this.gameOver = true;
      this.hud.showMessage('GAME OVER — Tap to return to galaxy');
      this.hud.messageTimer = 999;
    }
  }

  checkCollisions() {
    for (const p of this.projectiles.getActive()) {
      if (!p.friendly) continue;
      for (const e of this.enemies.pool) {
        if (!e.active) continue;
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        if (dx * dx + dy * dy < (p.radius + e.radius) ** 2) {
          e.health -= p.damage;
          p.active = false;
          this.particles.emit(p.x, p.y, 4, { color: e.color, speed: 60, life: 0.2, radius: 2 });
          if (e.health <= 0) {
            e.active = false;
            this.resources.add('metal', e.reward);
            this.resources.score += e.reward;
            this.particles.emit(e.x, e.y, 15, { color: e.color, speed: 120, life: 0.5, radius: 4 });
          }
          break;
        }
      }
    }
  }

  render(ctx) {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, this.screenW, this.screenH);
    this.tileMap.render(ctx, this.camera);
    this.player.render(ctx, this.camera);
    this.enemies.render(ctx, this.camera);
    this.projectiles.render(ctx, this.camera);
    this.particles.render(ctx, this.camera);
    this.hud.render(ctx, this.screenW, this.screenH, this.resources, this.player);
  }
}
