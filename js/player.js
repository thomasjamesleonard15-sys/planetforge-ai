import { TILE_SIZE, MAP_SIZE, WEAPONS } from './constants.js';

export class Player {
  constructor() {
    this.x = MAP_SIZE * TILE_SIZE / 2;
    this.y = MAP_SIZE * TILE_SIZE / 2;
    this.radius = 14;
    this.speed = 180;
    this.health = 100;
    this.maxHealth = 100;
    this.weaponIndex = 0;
    this.fireCooldown = 0;
    this.invulnTimer = 0;
  }

  get weapon() {
    return WEAPONS[this.weaponIndex];
  }

  cycleWeapon() {
    this.weaponIndex = (this.weaponIndex + 1) % WEAPONS.length;
  }

  update(dt, moveX, moveY) {
    const len = Math.sqrt(moveX * moveX + moveY * moveY);
    if (len > 0.1) {
      this.x += (moveX / len) * this.speed * dt;
      this.y += (moveY / len) * this.speed * dt;
    }

    const margin = this.radius;
    const max = MAP_SIZE * TILE_SIZE - margin;
    this.x = Math.max(margin, Math.min(max, this.x));
    this.y = Math.max(margin, Math.min(max, this.y));

    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.invulnTimer > 0) this.invulnTimer -= dt;
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0) return;
    this.health -= amount;
    this.invulnTimer = 0.3;
    if (this.health <= 0) this.health = 0;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  canFire() {
    return this.fireCooldown <= 0;
  }

  fire() {
    this.fireCooldown = this.weapon.fireRate;
  }

  render(ctx, camera) {
    const s = camera.worldToScreen(this.x, this.y);
    const blink = this.invulnTimer > 0 && Math.sin(this.invulnTimer * 30) > 0;
    if (blink) return;

    // Body
    ctx.beginPath();
    ctx.arc(s.x, s.y, this.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(s.x - 3, s.y - 3, 2, s.x, s.y, this.radius);
    grad.addColorStop(0, '#66ccff');
    grad.addColorStop(1, '#2266aa');
    ctx.fillStyle = grad;
    ctx.fill();

    // Visor
    ctx.beginPath();
    ctx.arc(s.x, s.y - 3, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#aaeeff';
    ctx.fill();

    // Health bar
    const barW = 30;
    const barH = 4;
    const hpPct = this.health / this.maxHealth;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(s.x - barW / 2, s.y - this.radius - 10, barW, barH);
    ctx.fillStyle = hpPct > 0.3 ? '#44ff66' : '#ff4444';
    ctx.fillRect(s.x - barW / 2, s.y - this.radius - 10, barW * hpPct, barH);
  }
}
