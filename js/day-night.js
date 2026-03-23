import { TILE, TILE_SIZE, MAP_SIZE } from './constants.js';

const DAY_LENGTH = 600; // 10 minutes
const NIGHT_LENGTH = 120; // 2 minutes
const CYCLE_LENGTH = DAY_LENGTH + NIGHT_LENGTH;
const MONSTER_COUNT = 2;

const MONSTER = {
  name: 'Night Terror',
  health: 120,
  speed: 45,
  damage: 20,
  radius: 20,
  color: '#8833aa',
  reward: 25,
};

export class DayNightCycle {
  constructor() {
    this.time = 0;
    this.isNight = false;
    this.nightMonsters = [];
    this.monstersSpawned = false;
    this.nightCount = 0;
    this.sleeping = false;
    this.sleepTimer = 0;

    for (let i = 0; i < 6; i++) {
      this.nightMonsters.push({
        active: false, x: 0, y: 0, health: 0, maxHealth: 0,
        speed: 0, damage: 0, radius: 0, color: '', reward: 0,
        attackCooldown: 0,
      });
    }
  }

  isNearBed(playerX, playerY, tileMap) {
    const tx = (playerX / TILE_SIZE) | 0;
    const ty = (playerY / TILE_SIZE) | 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (tileMap.get(tx + dx, ty + dy) === TILE.BED) return true;
      }
    }
    return false;
  }

  canSleep(playerX, playerY, tileMap) {
    if (this.sleeping) return false;
    const cyclePos = this.time % CYCLE_LENGTH;
    const nearNight = cyclePos > DAY_LENGTH - 30 || this.isNight;
    return nearNight && this.isNearBed(playerX, playerY, tileMap);
  }

  sleep() {
    this.sleeping = true;
    this.sleepTimer = 2;
    // Kill all monsters
    for (const m of this.nightMonsters) m.active = false;
  }

  activeMonsterCount() {
    let c = 0;
    for (const m of this.nightMonsters) if (m.active) c++;
    return c;
  }

  spawnMonsters(playerX, playerY) {
    const count = MONSTER_COUNT + Math.floor(this.nightCount / 3);
    for (let i = 0; i < count; i++) {
      const m = this.nightMonsters.find(m => !m.active);
      if (!m) break;
      const angle = Math.random() * Math.PI * 2;
      const dist = 300 + Math.random() * 200;
      m.active = true;
      m.x = playerX + Math.cos(angle) * dist;
      m.y = playerY + Math.sin(angle) * dist;
      m.health = MONSTER.health + this.nightCount * 15;
      m.maxHealth = m.health;
      m.speed = MONSTER.speed + this.nightCount * 3;
      m.damage = MONSTER.damage + this.nightCount * 2;
      m.radius = MONSTER.radius;
      m.color = MONSTER.color;
      m.reward = MONSTER.reward;
      m.attackCooldown = 0;
      // Clamp to map
      const max = MAP_SIZE * TILE_SIZE - 30;
      m.x = Math.max(30, Math.min(max, m.x));
      m.y = Math.max(30, Math.min(max, m.y));
    }
    this.monstersSpawned = true;
  }

  update(dt, player, particles) {
    // Handle sleeping — fast forward to next dawn
    if (this.sleeping) {
      this.sleepTimer -= dt;
      if (this.sleepTimer <= 0) {
        const currentCycle = Math.floor(this.time / CYCLE_LENGTH);
        this.time = (currentCycle + 1) * CYCLE_LENGTH;
        this.sleeping = false;
        for (const m of this.nightMonsters) m.active = false;
      }
      return;
    }

    this.time += dt;
    const cyclePos = this.time % CYCLE_LENGTH;
    const wasNight = this.isNight;
    this.isNight = cyclePos >= DAY_LENGTH;

    // Night just started
    if (this.isNight && !wasNight) {
      this.monstersSpawned = false;
      this.nightCount++;
    }

    // Spawn monsters shortly after night begins
    if (this.isNight && !this.monstersSpawned && cyclePos > DAY_LENGTH + 3) {
      this.spawnMonsters(player.x, player.y);
    }

    // Update monsters
    for (const m of this.nightMonsters) {
      if (!m.active) continue;
      const dx = player.x - m.x;
      const dy = player.y - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > m.radius + player.radius) {
        m.x += (dx / dist) * m.speed * dt;
        m.y += (dy / dist) * m.speed * dt;
      } else {
        m.attackCooldown -= dt;
        if (m.attackCooldown <= 0) {
          player.takeDamage(m.damage);
          m.attackCooldown = 1.2;
          particles.emit(player.x, player.y, 8, {
            color: '#8833aa', speed: 80, life: 0.3, radius: 3,
          });
        }
      }
    }

    // Dawn kills remaining monsters
    if (!this.isNight && wasNight) {
      for (const m of this.nightMonsters) {
        if (!m.active) continue;
        m.active = false;
        particles.emit(m.x, m.y, 12, {
          color: '#ffdd44', speed: 100, life: 0.5, radius: 4,
        });
      }
    }
  }

  getDarkness() {
    if (this.sleeping) return 0.85;
    if (!this.isNight) {
      const cyclePos = this.time % CYCLE_LENGTH;
      // Fade to dark in last 10s of day
      if (cyclePos > DAY_LENGTH - 10) {
        return (cyclePos - (DAY_LENGTH - 10)) / 10 * 0.6;
      }
      return 0;
    }
    const nightPos = (this.time % CYCLE_LENGTH) - DAY_LENGTH;
    // Fade in first 5s, fade out last 10s
    if (nightPos < 5) return (nightPos / 5) * 0.6;
    if (nightPos > NIGHT_LENGTH - 10) return ((NIGHT_LENGTH - nightPos) / 10) * 0.6;
    return 0.6;
  }

  render(ctx, camera, screenW, screenH) {
    // Darkness overlay
    const dark = this.getDarkness();
    if (dark > 0) {
      ctx.fillStyle = `rgba(5, 0, 20, ${dark})`;
      ctx.fillRect(0, 0, screenW, screenH);
    }

    // Render monsters
    for (const m of this.nightMonsters) {
      if (!m.active) continue;
      if (!camera.isVisible(m.x, m.y, m.radius + 10)) continue;
      const s = camera.worldToScreen(m.x, m.y);

      // Shadow aura
      ctx.beginPath();
      ctx.arc(s.x, s.y, m.radius + 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80, 20, 120, 0.3)';
      ctx.fill();

      // Body
      ctx.beginPath();
      ctx.arc(s.x, s.y, m.radius, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(s.x, s.y - 4, 3, s.x, s.y, m.radius);
      g.addColorStop(0, '#bb55ee');
      g.addColorStop(1, '#552288');
      ctx.fillStyle = g;
      ctx.fill();

      // Glowing eyes
      ctx.fillStyle = '#ff44ff';
      ctx.beginPath();
      ctx.arc(s.x - 6, s.y - 4, 3, 0, Math.PI * 2);
      ctx.arc(s.x + 6, s.y - 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      if (m.health < m.maxHealth) {
        const bw = m.radius * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(s.x - bw / 2, s.y - m.radius - 10, bw, 4);
        ctx.fillStyle = '#aa44ff';
        ctx.fillRect(s.x - bw / 2, s.y - m.radius - 10, bw * (m.health / m.maxHealth), 4);
      }
    }

    // Sleeping overlay
    if (this.sleeping) {
      ctx.fillStyle = 'rgba(0, 0, 10, 0.85)';
      ctx.fillRect(0, 0, screenW, screenH);
      ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8888cc';
      ctx.fillText('💤 Sleeping...', screenW / 2, screenH / 2 - 10);
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#6666aa';
      ctx.fillText('Skipping to dawn', screenW / 2, screenH / 2 + 20);
      ctx.textAlign = 'left';
      return;
    }

    // Night indicator
    if (this.isNight) {
      ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#cc88ff';
      ctx.fillText(`🌙 NIGHT — ${this.activeMonsterCount()} monsters remaining`, screenW / 2, 88);
      ctx.textAlign = 'left';
    } else {
      const cyclePos = this.time % CYCLE_LENGTH;
      const secsLeft = Math.ceil(DAY_LENGTH - cyclePos);
      if (secsLeft <= 30 && secsLeft > 0) {
        ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff8844';
        ctx.fillText(`⚠️ Night in ${secsLeft}s`, screenW / 2, 88);
        ctx.textAlign = 'left';
      }
    }
  }
}
