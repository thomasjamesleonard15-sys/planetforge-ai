import { TILE_SIZE, MAP_SIZE, WEAPONS } from './constants.js';
import { SKINS, renderSkinDetail } from './skins.js';

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
    this.punchCooldown = 0;
    this.punchAnim = 0;
    this.invulnTimer = 0;
    this.skinIndex = 0;
  }

  get weapon() {
    return WEAPONS[this.weaponIndex];
  }

  get skin() {
    return SKINS[this.skinIndex];
  }

  cycleWeapon() {
    this.weaponIndex = (this.weaponIndex + 1) % WEAPONS.length;
  }

  cycleSkin() {
    this.skinIndex = (this.skinIndex + 1) % SKINS.length;
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
    if (this.punchCooldown > 0) this.punchCooldown -= dt;
    if (this.punchAnim > 0) this.punchAnim -= dt * 4;
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

    const sk = this.skin;
    const r = this.radius;
    const t = Date.now() / 150;
    const walk = Math.sin(t) * 2;

    // Cast shadow — flattened body silhouette stretched to lower-right
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(s.x + 8, s.y + r + 20, r * 1.6, r * 0.4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Darker core under feet
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + r + 18, r * 0.7, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    const legColor = this.darken(sk.body2, 0.2);
    ctx.fillStyle = legColor;
    ctx.fillRect(s.x - 6, s.y + r + 4, 4, 12 + walk);
    ctx.fillRect(s.x + 2, s.y + r + 4, 4, 12 - walk);
    // Boots
    ctx.fillStyle = '#222';
    ctx.fillRect(s.x - 7, s.y + r + 14 + walk, 6, 4);
    ctx.fillRect(s.x + 1, s.y + r + 14 - walk, 6, 4);

    // Detail behind body (cape, etc)
    if (sk.detail === 'cape') {
      renderSkinDetail(ctx, s.x, s.y, r, sk);
    }

    // Torso — chest armor
    const torsoY = s.y + r - 2;
    const torsoG = ctx.createLinearGradient(s.x - r, torsoY, s.x + r, torsoY);
    torsoG.addColorStop(0, this.darken(sk.body1, 0.3));
    torsoG.addColorStop(0.5, sk.body1);
    torsoG.addColorStop(1, this.darken(sk.body1, 0.4));
    ctx.fillStyle = torsoG;
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.85, torsoY);
    ctx.lineTo(s.x - r * 0.95, torsoY + 14);
    ctx.lineTo(s.x + r * 0.95, torsoY + 14);
    ctx.lineTo(s.x + r * 0.85, torsoY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = this.darken(sk.body2, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Chest detail
    ctx.fillStyle = sk.visor;
    ctx.fillRect(s.x - 2, torsoY + 2, 4, 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, torsoY);
    ctx.lineTo(s.x, torsoY + 14);
    ctx.stroke();

    // Arms
    ctx.fillStyle = sk.body1;
    ctx.beginPath();
    ctx.arc(s.x - r * 0.95 - 2, torsoY + 6 - walk * 0.5, 4, 0, Math.PI * 2);
    ctx.arc(s.x + r * 0.95 + 2, torsoY + 6 + walk * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.darken(sk.body2, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    // Hands
    ctx.fillStyle = '#eecc99';
    ctx.beginPath();
    ctx.arc(s.x - r * 0.95 - 2, torsoY + 11 - walk * 0.5, 2.5, 0, Math.PI * 2);
    ctx.arc(s.x + r * 0.95 + 2, torsoY + 11 + walk * 0.5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Head sphere with strong shading
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(s.x - r * 0.4, s.y - r * 0.5, r * 0.05, s.x, s.y, r * 1.1);
    grad.addColorStop(0, this.lighten(sk.body1, 0.4));
    grad.addColorStop(0.4, sk.body1);
    grad.addColorStop(1, sk.body2);
    ctx.fillStyle = grad;
    ctx.fill();
    // Outline
    ctx.strokeStyle = this.darken(sk.body2, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Helmet rim highlight
    ctx.beginPath();
    ctx.arc(s.x, s.y, r - 1, Math.PI + 0.4, Math.PI * 2 - 0.4);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Visor — bigger, more reflective
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 2, r * 0.55, r * 0.4, 0, 0, Math.PI * 2);
    const visGrad = ctx.createLinearGradient(s.x, s.y - r * 0.4, s.x, s.y + r * 0.4);
    visGrad.addColorStop(0, this.lighten(sk.visor, 0.5));
    visGrad.addColorStop(0.5, sk.visor);
    visGrad.addColorStop(1, this.darken(sk.visor, 0.5));
    ctx.fillStyle = visGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Visor highlight
    ctx.beginPath();
    ctx.ellipse(s.x - r * 0.2, s.y - r * 0.2, r * 0.15, r * 0.08, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();

    // Detail on top of body
    if (sk.detail && sk.detail !== 'cape') {
      renderSkinDetail(ctx, s.x, s.y, r, sk);
    }

    // Health bar above head
    const barW = 32;
    const barH = 5;
    const hpPct = this.health / this.maxHealth;
    const hpColor = hpPct > 0.5 ? '#44ff66' : hpPct > 0.25 ? '#ffaa22' : '#ff4444';
    if (hpPct < 0.3) {
      ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3;
      ctx.fillStyle = hpColor;
      ctx.fillRect(s.x - barW / 2 - 2, s.y - r - 13, barW + 4, barH + 4);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(s.x - barW / 2 - 1, s.y - r - 12, barW + 2, barH + 2);
    ctx.fillStyle = hpColor;
    ctx.fillRect(s.x - barW / 2, s.y - r - 11, barW * hpPct, barH);

    // Name below legs
    ctx.font = 'bold 10px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillText(sk.name, s.x + 1, s.y + r + 30);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(sk.name, s.x, s.y + r + 29);
    ctx.textAlign = 'left';
  }

  lighten(hex, amt) {
    const c = this.parseHex(hex);
    return `rgb(${Math.min(255, c[0] + 255 * amt) | 0},${Math.min(255, c[1] + 255 * amt) | 0},${Math.min(255, c[2] + 255 * amt) | 0})`;
  }
  darken(hex, amt) {
    const c = this.parseHex(hex);
    return `rgb(${Math.max(0, c[0] - 255 * amt) | 0},${Math.max(0, c[1] - 255 * amt) | 0},${Math.max(0, c[2] - 255 * amt) | 0})`;
  }
  parseHex(hex) {
    if (!hex || hex[0] !== '#') return [128, 128, 128];
    const h = hex.replace('#', '');
    if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
}
