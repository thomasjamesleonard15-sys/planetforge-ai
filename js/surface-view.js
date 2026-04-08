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
import { SoldierSystem } from './soldiers.js';
import { DayNightCycle } from './day-night.js';
import { EncounterCutscene } from './encounter-cutscene.js';
import { VictoryCutscene } from './victory-cutscene.js';
import { renderFPS } from './fps-renderer.js';
import { WildlifeSystem } from './wildlife.js';

export class SurfaceView {
  constructor(isHome = true) {
    this.isHome = isHome;
    this.isGasStation = false;
    this.refueled = false;
    this.camera = new Camera();
    this.tileMap = new TileMap();
    this.player = new Player();
    this.projectiles = new ProjectileSystem();
    this.enemies = isHome ? null : new EnemySystem();
    this.turretAI = new TurretAI();
    this.particles = new ParticleSystem();
    this.resources = new Resources();
    this.hud = new HUD();
    this.soldiers = new SoldierSystem();
    this.dayNight = new DayNightCycle();
    this.screenW = 0;
    this.screenH = 0;
    this.gameOver = false;
    this.chestsEarned = 0;
    this.soldierCount = 0;
    this.chestMessage = '';
    this.chestMessageTimer = 0;
    this.encounterCutscene = null;
    this.encounterPlayed = false;
    this.jokerPlayed = false;
    this.cookingPlayed = false;
    this.victoryCutscene = null;
    this.wonGame = false;
    this.dialogue = null;
    this.dialogueTimer = 0;
    this.screenShake = 0;
    this.dustTimer = 0;
    this.lastPlayerHealth = 100;
    this.fpsMode = false;
    this.fpsBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.player.fpsAngle = 0;
    // Ambient floating particles (pollen/dust in the air)
    this.ambientParticles = [];
    for (let i = 0; i < 60; i++) {
      this.ambientParticles.push({
        x: Math.random() * 2000, y: Math.random() * 2000,
        vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 5 - 3,
        r: Math.random() * 1.2 + 0.3, a: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    this.grainSeed = 0;
    this.wildlife = new WildlifeSystem();
    // Rain drops
    this.rainDrops = [];
    for (let i = 0; i < 120; i++) {
      this.rainDrops.push({
        x: Math.random() * 2000, y: Math.random() * 2000,
        len: 8 + Math.random() * 6, speed: 400 + Math.random() * 200,
      });
    }
    // Grass sway phase
    this.windPhase = 0;
  }

  resize(w, h) {
    this.screenW = w;
    this.screenH = h;
    this.camera.resize(w, h);
  }

  handleTouchStart(sx, sy) {
    // Skip victory cutscene
    if (this.victoryCutscene) {
      this.victoryCutscene.done = true;
      try { speechSynthesis.cancel(); } catch (_) {}
      return;
    }
    // Skip encounter cutscene
    if (this.encounterCutscene) {
      this.encounterCutscene.done = true;
      this.encounterCutscene = null;
      try { speechSynthesis.cancel(); } catch (_) {}
      return;
    }
    // Refuel button at gas station
    if (this.isGasStation && !this.refueled) {
      const bw = 160, bh = 44;
      const bx = this.screenW / 2 - bw / 2, by = this.screenH / 2 + 50;
      if (sx >= bx && sx <= bx + bw && sy >= by && sy <= by + bh) {
        this.refueled = true;
        this.hud.showMessage('Tank full! Ready to fly!');
        this.particles.emit(this.player.x, this.player.y, 15, {
          color: '#44ff88', speed: 80, life: 0.5, radius: 4,
        });
        return;
      }
    }
    // Sleep button
    if (this.dayNight.canSleep(this.player.x, this.player.y, this.tileMap)) {
      const sbx = this.screenW / 2 - 70, sby = this.screenH / 2 + 40;
      if (sx >= sbx && sx <= sbx + 140 && sy >= sby && sy <= sby + 44) {
        this.dayNight.sleep();
        return;
      }
    }
    // Scan button
    if (this.wildlife.handleScanTap(sx, sy)) return;
    // FPS toggle button
    const fb = this.fpsBtnRect;
    if (fb.w > 0 && sx >= fb.x && sx <= fb.x + fb.w && sy >= fb.y && sy <= fb.y + fb.h) {
      this.fpsMode = !this.fpsMode;
      return;
    }
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

    // Skin switch button
    const skinBtnY = wpnBtnY - btnSize - 12;
    if (sx >= btnX && sx <= btnX + btnSize && sy >= skinBtnY && sy <= skinBtnY + btnSize) {
      this.player.cycleSkin();
      this.hud.showMessage(`Skin: ${this.player.skin.name}`);
      return;
    }

    // Dialogue response buttons
    if (this.dialogue && this.dialogue.phase === 'question') {
      const dx = this.screenW / 2;
      const dy = this.screenH / 2;
      // "I'm Batman" button
      if (sx >= dx - 140 && sx <= dx - 10 && sy >= dy + 20 && sy <= dy + 60) {
        this.dialogue.phase = 'answer';
        this.dialogue.answer = "I'm Batman.";
        this.dialogue.timer = 3;
        try {
          const u = new SpeechSynthesisUtterance("I'm Batman.");
          u.pitch = 0.1; u.rate = 0.6; u.volume = 1;
          speechSynthesis.speak(u);
        } catch (_) {}
        return;
      }
      // "Doing nothing" button
      if (sx >= dx + 10 && sx <= dx + 140 && sy >= dy + 20 && sy <= dy + 60) {
        this.dialogue.phase = 'answer';
        this.dialogue.answer = "Doing nothing.";
        this.dialogue.timer = 3;
        try {
          const u = new SpeechSynthesisUtterance("Doing nothing.");
          u.pitch = 0.2; u.rate = 0.7; u.volume = 1;
          speechSynthesis.speak(u);
        } catch (_) {}
        return;
      }
      // Tap anywhere else closes
      this.dialogue = null;
      return;
    }

    // Tap on soldier to talk (non-build mode)
    if (!this.hud.showBuildMenu && this.soldiers.activeCount() > 0) {
      const world = this.camera.screenToWorld(sx, sy);
      for (const s of this.soldiers.pool) {
        if (!s.active) continue;
        const ddx = world.x - s.x, ddy = world.y - s.y;
        if (ddx * ddx + ddy * ddy < 900) {
          this.dialogue = { phase: 'question', soldierX: s.x, soldierY: s.y, answer: '', timer: 0 };
          try {
            const u = new SpeechSynthesisUtterance("What you doing?");
            u.pitch = 0.8; u.rate = 0.9; u.volume = 1;
            speechSynthesis.speak(u);
          } catch (_) {}
          return;
        }
      }
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

  fpsLook(dx, dy) {
    if (!this.fpsMode) return;
    this.player.fpsAngle += dx * 0.005;
    this.fpsManualLook = 0.5;
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
      const existing = this.tileMap.get(tx, ty);
      // Mine rocks for metal
      if (existing === TILE.ROCK) {
        this.tileMap.set(tx, ty, TILE.EMPTY);
        this.resources.add('metal', 15);
        this.particles.emit(
          tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2,
          8, { color: '#aaaaaa', speed: 80, life: 0.3, radius: 3 }
        );
        this.hud.showMessage('+15 Metal!');
        return;
      }
      // Demolish buildings — get half resources back
      if (existing >= TILE.FARM && existing !== TILE.ROCK && existing !== TILE.WATER) {
        const cost = BUILDING_COSTS[existing];
        if (cost) {
          this.resources.add('food', Math.ceil((cost.food || 0) / 2));
          this.resources.add('metal', Math.ceil((cost.metal || 0) / 2));
          this.resources.add('energy', Math.ceil((cost.energy || 0) / 2));
        }
        this.tileMap.set(tx, ty, TILE.EMPTY);
        this.particles.emit(
          tx * TILE_SIZE + TILE_SIZE / 2, ty * TILE_SIZE + TILE_SIZE / 2,
          8, { color: '#ff8844', speed: 70, life: 0.3, radius: 3 }
        );
        const refund = [];
        if (cost && cost.metal) refund.push(`+${Math.ceil(cost.metal / 2)} Metal`);
        if (cost && cost.energy) refund.push(`+${Math.ceil(cost.energy / 2)} Energy`);
        if (cost && cost.food) refund.push(`+${Math.ceil(cost.food / 2)} Food`);
        this.hud.showMessage(refund.length ? `Demolished! ${refund.join(' ')}` : 'Demolished!');
        return;
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

  tryPunch() {
    if (this.player.punchCooldown > 0) return;
    this.player.punchCooldown = 0.4;
    this.player.punchAnim = 1;
    const range = this.player.radius + 30;
    let hit = false;
    if (this.enemies) {
      for (const e of this.enemies.pool) {
        if (!e.active) continue;
        const dx = e.x - this.player.x, dy = e.y - this.player.y;
        if (dx * dx + dy * dy < (range + e.radius) ** 2) {
          e.health -= 30;
          hit = true;
          // Knockback
          const a = Math.atan2(dy, dx);
          e.x += Math.cos(a) * 20;
          e.y += Math.sin(a) * 20;
          this.particles.emit(e.x, e.y, 8, { color: '#ffdd44', speed: 150, life: 0.3, radius: 3 });
          if (e.health <= 0) {
            e.active = false;
            this.resources.add('metal', e.reward);
            this.resources.score += e.reward;
          }
        }
      }
    }
    if (hit) {
      this.screenShake = Math.max(this.screenShake, 4);
    }
  }

  tryShoot(sx, sy) {
    if (!this.player.canFire()) return;
    let angle;
    if (this.fpsMode) {
      angle = this.player.fpsAngle;
    } else {
      const world = this.camera.screenToWorld(sx, sy);
      angle = Math.atan2(world.y - this.player.y, world.x - this.player.x);
    }
    this.projectiles.fire(this.player.x, this.player.y, angle, this.player.weapon, true);
    this.player.fire();
    this.particles.emit(this.player.x, this.player.y, 3, {
      angle, spread: 0.3, color: this.player.weapon.color, speed: 150, life: 0.15, radius: 2,
    });
  }

  update(dt) {
    if (this.gameOver) return;

    if (this.fpsMode) {
      // FPS mode — joystick Y = forward/back, joystick X = strafe
      if (this.fpsManualLook > 0) this.fpsManualLook -= dt;
      const fwd = -this.hud.joystickY;
      const strafe = this.hud.joystickX;
      const cos = Math.cos(this.player.fpsAngle), sin = Math.sin(this.player.fpsAngle);
      const moveX = cos * fwd - sin * strafe;
      const moveY = sin * fwd + cos * strafe;
      this.player.update(dt, moveX, moveY);
    } else {
      this.player.update(dt, this.hud.joystickX, this.hud.joystickY);
    }
    this.camera.follow(this.player.x, this.player.y);
    this.camera.update(dt);
    this.tileMap.update(dt, this.resources);

    // Damage detect — screen shake
    if (this.player.health < this.lastPlayerHealth) {
      this.screenShake = Math.max(this.screenShake, 6);
    }
    this.lastPlayerHealth = this.player.health;
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 20);

    // Wind/grass sway
    this.windPhase += dt * 2;

    // Rain
    for (const d of this.rainDrops) {
      d.x += 80 * dt;
      d.y += d.speed * dt;
      const sp = this.camera.worldToScreen(d.x, d.y);
      if (sp.y > this.screenH + 10) d.y -= this.screenH + 30;
      if (sp.x > this.screenW + 10) d.x -= this.screenW + 30;
    }

    // Ambient particles drift
    for (const p of this.ambientParticles) {
      p.x += p.vx * dt + Math.sin(p.phase) * 5 * dt;
      p.y += p.vy * dt;
      p.phase += dt * 2;
      // Wrap around camera
      const screenP = this.camera.worldToScreen(p.x, p.y);
      if (screenP.x < -50) p.x += this.screenW + 100;
      if (screenP.x > this.screenW + 50) p.x -= this.screenW + 100;
      if (screenP.y < -50) p.y += this.screenH + 100;
      if (screenP.y > this.screenH + 50) p.y -= this.screenH + 100;
    }

    // Walking dust
    const moving = Math.abs(this.hud.joystickX) > 0.1 || Math.abs(this.hud.joystickY) > 0.1;
    if (moving) {
      this.dustTimer += dt;
      if (this.dustTimer > 0.15) {
        this.dustTimer = 0;
        this.particles.emit(this.player.x, this.player.y + this.player.radius + 4, 2, {
          color: '#a89880', speed: 30, life: 0.4, radius: 1.5,
        });
      }
    }
    // Victory cutscene pauses gameplay
    if (this.victoryCutscene) {
      this.victoryCutscene.update(dt);
      return;
    }

    // Encounter cutscene pauses gameplay
    if (this.encounterCutscene) {
      this.encounterCutscene.update(dt);
      if (this.encounterCutscene.done) this.encounterCutscene = null;
      return;
    }

    if (this.enemies && !this.isGasStation) {
      const prevWave = this.enemies.wave;
      this.enemies.update(dt, this.player, this.tileMap, this.resources, this.particles);
      // Trigger encounter cutscene on first wave
      if (!this.encounterPlayed && this.enemies.wave === 1 && prevWave === 0) {
        this.encounterPlayed = true;
        this.encounterCutscene = new EncounterCutscene(this.screenW, this.screenH, 'intro');
      }
      // Trigger joker cutscene at wave 5
      if (!this.jokerPlayed && this.enemies.wave === 5 && prevWave === 4) {
        this.jokerPlayed = true;
        this.encounterCutscene = new EncounterCutscene(this.screenW, this.screenH, 'joker');
      }
      // Cooking cutscene at wave 10
      if (!this.cookingPlayed && this.enemies.wave === 10 && prevWave === 9) {
        this.cookingPlayed = true;
        this.encounterCutscene = new EncounterCutscene(this.screenW, this.screenH, 'cooking');
      }
      // Victory at wave 20
      if (!this.wonGame && this.enemies.wave === 20 && prevWave === 19) {
        this.wonGame = true;
        this.victoryCutscene = new VictoryCutscene(this.screenW, this.screenH);
      }
      if (this.enemies.wave > prevWave && this.enemies.wave % 10 === 0) {
        this.earnChest();
        this.player.health = this.player.maxHealth;
        this.hud.showMessage('Full health restored!');
      }
    }
    this.wildlife.update(dt, this.player);
    this.turretAI.update(dt, this.tileMap, this.enemies, this.projectiles, this.dayNight.nightMonsters);
    this.dayNight.update(dt, this.player, this.particles);
    this.soldiers.update(dt, this.player.x, this.player.y, this.enemies, this.projectiles, this.dayNight.nightMonsters);
    this.projectiles.update(dt);
    this.particles.update(dt);
    this.hud.update(dt);
    this.checkCollisions();

    if (this.chestMessageTimer > 0) this.chestMessageTimer -= dt;
    if (this.dialogue && this.dialogue.phase === 'answer') {
      this.dialogue.timer -= dt;
      if (this.dialogue.timer <= 0) this.dialogue = null;
    }

    if (!this.isHome && this.player.health <= 0) {
      this.gameOver = true;
      this.hud.showMessage('GAME OVER — Tap to respawn at home');
      this.hud.messageTimer = 999;
    }
    if (this.isHome) this.player.health = this.player.maxHealth;
  }

  earnChest() {
    this.chestsEarned++;
    this.soldierCount++;
    this.resources.add('metal', 50);
    this.resources.add('food', 30);
    this.resources.add('energy', 20);
    this.chestMessage = `🎁 CHEST! +1 Soldier for home, +50 Metal, +30 Food, +20 Energy`;
    this.chestMessageTimer = 5;
    this.particles.emit(this.player.x, this.player.y, 25, {
      color: '#ffdd44', speed: 150, life: 1, radius: 5,
    });
    this.particles.emit(this.player.x, this.player.y, 15, {
      color: '#ffffff', speed: 100, life: 0.8, radius: 3,
    });
  }

  checkCollisions() {
    for (const p of this.projectiles.getActive()) {
      if (!p.friendly) continue;
      let hit = false;
      // vs wave enemies
      if (this.enemies) {
        for (const e of this.enemies.pool) {
          if (!e.active) continue;
          const dx = p.x - e.x, dy = p.y - e.y;
          if (dx * dx + dy * dy < (p.radius + e.radius) ** 2) {
            e.health -= p.damage; p.active = false; hit = true;
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
      if (hit) continue;
      // vs night monsters
      for (const m of this.dayNight.nightMonsters) {
        if (!m.active) continue;
        const dx = p.x - m.x, dy = p.y - m.y;
        if (dx * dx + dy * dy < (p.radius + m.radius) ** 2) {
          m.health -= p.damage; p.active = false;
          this.particles.emit(p.x, p.y, 4, { color: m.color, speed: 60, life: 0.2, radius: 2 });
          if (m.health <= 0) {
            m.active = false;
            this.resources.add('metal', m.reward);
            this.resources.score += m.reward;
            this.particles.emit(m.x, m.y, 15, { color: '#ffdd44', speed: 120, life: 0.5, radius: 4 });
          }
          break;
        }
      }
    }
  }

  render(ctx) {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, this.screenW, this.screenH);

    // Screen shake
    const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 2 : 0;
    const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * this.screenShake * 2 : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);

    if (this.fpsMode) {
      renderFPS(ctx, this);
    } else {
      this.tileMap.render(ctx, this.camera);
      this.player.render(ctx, this.camera);
      this.soldiers.render(ctx, this.camera);
      if (this.enemies) this.enemies.render(ctx, this.camera);
      // Dynamic lights under bullets (additive glow on the ground)
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.projectiles.pool) {
        if (!p.active) continue;
        const sp = this.camera.worldToScreen(p.x, p.y);
        const lightG = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 40);
        lightG.addColorStop(0, `${p.color}44`);
        lightG.addColorStop(1, 'transparent');
        ctx.fillStyle = lightG;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 40, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';

      this.wildlife.render(ctx, this.camera, this.player);
      this.projectiles.render(ctx, this.camera);
      this.particles.render(ctx, this.camera);
      this.dayNight.render(ctx, this.camera, this.screenW, this.screenH);

      // Rain drops (on top of world, behind HUD)
      ctx.strokeStyle = 'rgba(180, 200, 255, 0.5)';
      ctx.lineWidth = 1;
      for (const d of this.rainDrops) {
        const sp = this.camera.worldToScreen(d.x, d.y);
        if (sp.x < -20 || sp.x > this.screenW + 20 || sp.y < -20 || sp.y > this.screenH + 20) continue;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(sp.x - 2, sp.y - d.len);
        ctx.stroke();
      }
      // Ambient floating particles (pollen/dust)
      for (const p of this.ambientParticles) {
        const sp = this.camera.worldToScreen(p.x, p.y);
        if (sp.x < -10 || sp.x > this.screenW + 10 || sp.y < -10 || sp.y > this.screenH + 10) continue;
        const tw = p.a * (0.6 + Math.sin(p.phase) * 0.4);
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, p.r * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 180, ${tw * 0.15})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 240, 200, ${tw})`;
        ctx.fill();
      }
    }
    ctx.restore();

    // Post-processing: color grading (warm tint)
    ctx.fillStyle = 'rgba(255, 200, 120, 0.04)';
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillRect(0, 0, this.screenW, this.screenH);
    ctx.globalCompositeOperation = 'source-over';

    // Film grain
    this.grainSeed++;
    const grainAlpha = 0.03;
    const grainSize = 2;
    for (let i = 0; i < 80; i++) {
      const gx = (Math.random() * this.screenW) | 0;
      const gy = (Math.random() * this.screenH) | 0;
      ctx.fillStyle = `rgba(255,255,255,${grainAlpha})`;
      ctx.fillRect(gx, gy, grainSize, grainSize);
      ctx.fillStyle = `rgba(0,0,0,${grainAlpha})`;
      ctx.fillRect(gx + 3, gy + 3, grainSize, grainSize);
    }

    // Chromatic aberration on edges (subtle)
    const aw = this.screenW * 0.05;
    const cag = ctx.createLinearGradient(0, 0, aw, 0);
    cag.addColorStop(0, 'rgba(255, 50, 50, 0.08)');
    cag.addColorStop(1, 'rgba(255, 50, 50, 0)');
    ctx.fillStyle = cag;
    ctx.fillRect(0, 0, aw, this.screenH);
    const cag2 = ctx.createLinearGradient(this.screenW - aw, 0, this.screenW, 0);
    cag2.addColorStop(0, 'rgba(50, 50, 255, 0)');
    cag2.addColorStop(1, 'rgba(50, 50, 255, 0.08)');
    ctx.fillStyle = cag2;
    ctx.fillRect(this.screenW - aw, 0, aw, this.screenH);

    // FPS toggle button
    const fbW = 80, fbH = 36;
    const fbX = this.screenW - fbW - 16, fbY = 60;
    this.fpsBtnRect = { x: fbX, y: fbY, w: fbW, h: fbH };
    ctx.fillStyle = this.fpsMode ? 'rgba(60, 100, 60, 0.9)' : 'rgba(20, 20, 40, 0.85)';
    ctx.beginPath();
    ctx.roundRect(fbX, fbY, fbW, fbH, 8);
    ctx.fill();
    ctx.strokeStyle = this.fpsMode ? '#88ff88' : 'rgba(100, 120, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.fpsMode ? '#ccffcc' : '#aab';
    ctx.fillText(this.fpsMode ? '👁 FPS' : '👁 FPS', fbX + fbW / 2, fbY + fbH / 2 + 5);
    ctx.textAlign = 'left';

    // Vignette overlay
    const vg = ctx.createRadialGradient(this.screenW / 2, this.screenH / 2, this.screenH * 0.3, this.screenW / 2, this.screenH / 2, this.screenH * 0.85);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.7, 'rgba(0,0,0,0.25)');
    vg.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.screenW, this.screenH);

    // Damage flash
    if (this.player.invulnTimer > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${this.player.invulnTimer * 0.3})`;
      ctx.fillRect(0, 0, this.screenW, this.screenH);
    }

    // Skin button
    const btnSize = 56;
    const btnX = this.screenW - btnSize - 16;
    const btnY = this.screenH - btnSize - 90;
    const wpnBtnY = btnY - btnSize - 12;
    const skinBtnY = wpnBtnY - btnSize - 12;
    ctx.fillStyle = '#334';
    ctx.strokeStyle = this.player.skin.body1;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, skinBtnY, btnSize, btnSize, 10);
    ctx.fill();
    ctx.stroke();
    ctx.font = '24px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('👤', btnX + btnSize / 2, skinBtnY + btnSize / 2 + 8);
    ctx.textAlign = 'left';
    this.hud.render(ctx, this.screenW, this.screenH, this.resources, this.player);
    this.wildlife.renderHUD(ctx, this.screenW, this.screenH);
    // Sleep button
    if (this.dayNight.canSleep(this.player.x, this.player.y, this.tileMap)) {
      const sbw = 140, sbh = 44;
      const sbx = this.screenW / 2 - sbw / 2, sby = this.screenH / 2 + 40;
      ctx.fillStyle = 'rgba(30, 30, 80, 0.9)';
      ctx.beginPath();
      ctx.roundRect(sbx, sby, sbw, sbh, 10);
      ctx.fill();
      ctx.strokeStyle = '#8888cc';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '18px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ccccff';
      ctx.fillText('💤 Sleep', this.screenW / 2, sby + sbh / 2 + 6);
      ctx.textAlign = 'left';
    }
    if (this.isGasStation) {
      ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffaa44';
      ctx.fillText('⛽ GAS STATION — Explore & Refuel', this.screenW / 2, 68);
      ctx.textAlign = 'left';
      // Fuel pump in center of screen
      const px = this.screenW / 2, py = this.screenH / 2;
      // Pump body
      ctx.fillStyle = '#cc3333';
      ctx.fillRect(px - 20, py - 30, 40, 60);
      ctx.fillStyle = '#aa2222';
      ctx.fillRect(px - 16, py - 26, 32, 20);
      // Screen
      ctx.fillStyle = '#222';
      ctx.fillRect(px - 12, py - 22, 24, 12);
      ctx.fillStyle = this.refueled ? '#44ff44' : '#ffaa44';
      ctx.font = '10px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.refueled ? 'FULL' : 'FUEL', px, py - 13);
      // Nozzle
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + 20, py - 10);
      ctx.lineTo(px + 35, py - 15);
      ctx.lineTo(px + 38, py - 5);
      ctx.stroke();
      // Refuel button
      if (!this.refueled) {
        const bw = 160, bh = 44;
        const bx = this.screenW / 2 - bw / 2, by = this.screenH / 2 + 50;
        ctx.fillStyle = 'rgba(40, 80, 40, 0.9)';
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 10);
        ctx.fill();
        ctx.strokeStyle = '#44ff88';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = '18px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#ccffcc';
        ctx.fillText('⛽ Refuel (Free)', this.screenW / 2, by + bh / 2 + 6);
      } else {
        ctx.font = '16px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#44ff88';
        ctx.fillText('Tank full! Use ← Back to fly away', this.screenW / 2, this.screenH / 2 + 70);
      }
      ctx.textAlign = 'left';
    } else if (this.isHome) {
      ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#44ff88';
      ctx.fillText(`🏠 HOME — Safe Zone  🪖 Soldiers: ${this.soldiers.activeCount()}`, this.screenW / 2, 68);
      ctx.textAlign = 'left';
    } else {
      ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff6644';
      ctx.fillText(`⚠️ HOSTILE TERRITORY  🪖 Soldiers: ${this.soldiers.activeCount()}`, this.screenW / 2, 68);
      ctx.textAlign = 'left';
    }
    // Victory cutscene overlay
    if (this.victoryCutscene) {
      this.victoryCutscene.render(ctx);
    }

    // Encounter cutscene overlay
    if (this.encounterCutscene) {
      this.encounterCutscene.render(ctx);
    }

    // Soldier dialogue
    if (this.dialogue) {
      const cx = this.screenW / 2, cy = this.screenH / 2;
      // Darken background
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, this.screenW, this.screenH);

      // Soldier portrait (left)
      ctx.beginPath();
      ctx.arc(cx - 100, cy - 40, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#44aa66';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - 100, cy - 43, 14, Math.PI, 0);
      ctx.fillStyle = '#336644';
      ctx.fill();
      ctx.fillStyle = '#888';
      ctx.fillRect(cx - 100 + 12, cy - 42, 16, 5);

      // Soldier speech bubble
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.roundRect(cx - 60, cy - 65, 180, 34, 10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 55, cy - 45);
      ctx.lineTo(cx - 70, cy - 35);
      ctx.lineTo(cx - 45, cy - 45);
      ctx.fill();
      ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#333';
      ctx.fillText('What you doing?', cx + 30, cy - 42);

      if (this.dialogue.phase === 'question') {
        // Response buttons
        // "I'm Batman" button
        ctx.fillStyle = 'rgba(30, 30, 80, 0.9)';
        ctx.beginPath();
        ctx.roundRect(cx - 140, cy + 20, 130, 40, 8);
        ctx.fill();
        ctx.strokeStyle = '#66ccff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#66ccff';
        ctx.fillText("I'm Batman", cx - 75, cy + 44);

        // "Doing nothing" button
        ctx.fillStyle = 'rgba(30, 30, 80, 0.9)';
        ctx.beginPath();
        ctx.roundRect(cx + 10, cy + 20, 130, 40, 8);
        ctx.fill();
        ctx.strokeStyle = '#aabb88';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#aabb88';
        ctx.fillText('Doing nothing', cx + 75, cy + 44);
      } else if (this.dialogue.phase === 'answer') {
        // Player response bubble
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.roundRect(cx - 60, cy + 10, 180, 34, 10);
        ctx.fill();
        ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = this.dialogue.answer === "I'm Batman." ? '#2266aa' : '#666';
        ctx.fillText(this.dialogue.answer, cx + 30, cy + 33);

        // Soldier reaction
        ctx.font = '13px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#aaa';
        const reaction = this.dialogue.answer === "I'm Batman." ? 'Soldier: Whoa... THE Batman?!' : 'Soldier: Alright then...';
        ctx.fillText(reaction, cx + 30, cy + 60);
      }
      ctx.textAlign = 'left';
    }

    // Chest message
    if (this.chestMessageTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.chestMessageTimer);
      ctx.font = 'bold 20px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffdd44';
      ctx.fillText(this.chestMessage, this.screenW / 2, this.screenH / 2 - 60);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }
}
