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

    // Cast shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(s.x + 10, s.y + r + 22, r * 1.7, r * 0.45, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + r + 20, r * 0.75, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs with knee/thigh shading
    const legDark = this.darken(sk.body2, 0.3);
    const legMid = this.darken(sk.body1, 0.2);
    const legLeft = { x: s.x - 6, wob: walk };
    const legRight = { x: s.x + 2, wob: -walk };
    for (const lg of [legLeft, legRight]) {
      // Thigh
      const lgrad = ctx.createLinearGradient(lg.x, s.y + r + 4, lg.x + 4, s.y + r + 4);
      lgrad.addColorStop(0, legDark);
      lgrad.addColorStop(0.5, legMid);
      lgrad.addColorStop(1, legDark);
      ctx.fillStyle = lgrad;
      ctx.fillRect(lg.x, s.y + r + 4, 4, 8);
      // Shin
      ctx.fillStyle = legDark;
      ctx.fillRect(lg.x, s.y + r + 12 + lg.wob, 4, 6);
      // Knee pad
      ctx.fillStyle = this.darken(sk.body2, 0.5);
      ctx.fillRect(lg.x - 1, s.y + r + 11, 6, 3);
    }
    // Boots with gradient
    for (const lg of [legLeft, legRight]) {
      const bx = lg.x - 1, by = s.y + r + 17 + lg.wob;
      ctx.fillStyle = '#111';
      ctx.fillRect(bx, by, 6, 5);
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by, 6, 1);
    }

    // Cape behind
    if (sk.detail === 'cape') {
      renderSkinDetail(ctx, s.x, s.y, r, sk);
    }

    // Torso — armored chest plate with curve
    const torsoY = s.y + r - 2;
    const torsoG = ctx.createLinearGradient(s.x - r, torsoY, s.x + r, torsoY);
    torsoG.addColorStop(0, this.darken(sk.body1, 0.4));
    torsoG.addColorStop(0.3, sk.body1);
    torsoG.addColorStop(0.5, this.lighten(sk.body1, 0.2));
    torsoG.addColorStop(0.7, sk.body1);
    torsoG.addColorStop(1, this.darken(sk.body1, 0.5));
    ctx.fillStyle = torsoG;
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.88, torsoY);
    ctx.quadraticCurveTo(s.x - r * 1.0, torsoY + 7, s.x - r * 0.95, torsoY + 14);
    ctx.lineTo(s.x + r * 0.95, torsoY + 14);
    ctx.quadraticCurveTo(s.x + r * 1.0, torsoY + 7, s.x + r * 0.88, torsoY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = this.darken(sk.body2, 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Chest plate seam
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x, torsoY + 1);
    ctx.lineTo(s.x, torsoY + 13);
    ctx.stroke();
    // Chest energy core
    ctx.fillStyle = sk.visor;
    ctx.beginPath();
    ctx.arc(s.x, torsoY + 5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(s.x - 0.5, torsoY + 4.5, 1, 0, Math.PI * 2);
    ctx.fill();
    // Belt
    ctx.fillStyle = '#222';
    ctx.fillRect(s.x - r * 0.9, torsoY + 10, r * 1.8, 3);
    ctx.fillStyle = '#ffaa44';
    ctx.fillRect(s.x - 2, torsoY + 10, 4, 3);

    // Arms with segments
    const armY = torsoY + 4;
    // Left arm
    const lArmX = s.x - r * 0.95 - 3;
    ctx.fillStyle = sk.body1;
    ctx.beginPath();
    ctx.arc(lArmX, armY + 2 - walk * 0.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.darken(sk.body2, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    // Forearm
    ctx.fillStyle = this.darken(sk.body1, 0.15);
    ctx.fillRect(lArmX - 3, armY + 4 - walk * 0.5, 6, 6);
    // Hand
    ctx.fillStyle = '#eecc99';
    ctx.beginPath();
    ctx.arc(lArmX, armY + 12 - walk * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#775533';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Right arm — holds weapon
    const rArmX = s.x + r * 0.95 + 3;
    ctx.fillStyle = sk.body1;
    ctx.beginPath();
    ctx.arc(rArmX, armY + 2 + walk * 0.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.darken(sk.body2, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = this.darken(sk.body1, 0.15);
    ctx.fillRect(rArmX - 3, armY + 4 + walk * 0.5, 6, 6);
    ctx.fillStyle = '#eecc99';
    ctx.beginPath();
    ctx.arc(rArmX, armY + 12 + walk * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#775533';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Weapon held in right hand
    const gunX = rArmX + 3;
    const gunY = armY + 10 + walk * 0.5;
    const weaponColor = this.weapon.color;
    // Gun body
    ctx.fillStyle = '#222';
    ctx.fillRect(gunX, gunY - 1, 10, 4);
    ctx.fillStyle = '#555';
    ctx.fillRect(gunX, gunY - 1, 10, 1);
    // Barrel tip
    ctx.fillStyle = '#111';
    ctx.fillRect(gunX + 9, gunY, 3, 2);
    // Weapon accent color (matches weapon color)
    ctx.fillStyle = weaponColor;
    ctx.fillRect(gunX + 2, gunY, 3, 2);
    // Muzzle flash when firing
    if (this.fireCooldown > this.weapon.fireRate * 0.7) {
      const flashG = ctx.createRadialGradient(gunX + 12, gunY + 1, 0, gunX + 12, gunY + 1, 8);
      flashG.addColorStop(0, 'rgba(255,255,200,1)');
      flashG.addColorStop(0.3, 'rgba(255,200,80,0.8)');
      flashG.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = flashG;
      ctx.beginPath();
      ctx.arc(gunX + 12, gunY + 1, 8, 0, Math.PI * 2);
      ctx.fill();
    }

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
    ctx.ellipse(s.x, s.y - 2, r * 0.6, r * 0.42, 0, 0, Math.PI * 2);
    const visGrad = ctx.createLinearGradient(s.x, s.y - r * 0.4, s.x, s.y + r * 0.4);
    visGrad.addColorStop(0, this.lighten(sk.visor, 0.5));
    visGrad.addColorStop(0.4, sk.visor);
    visGrad.addColorStop(0.7, this.darken(sk.visor, 0.3));
    visGrad.addColorStop(1, this.darken(sk.visor, 0.6));
    ctx.fillStyle = visGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Face behind visor (subtle glow)
    ctx.fillStyle = 'rgba(255,200,150,0.25)';
    ctx.beginPath();
    ctx.ellipse(s.x, s.y - 1, r * 0.35, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    // HUD lines on visor
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(s.x - r * 0.5, s.y - 2);
    ctx.lineTo(s.x + r * 0.5, s.y - 2);
    ctx.stroke();
    // Main visor highlight
    ctx.beginPath();
    ctx.ellipse(s.x - r * 0.22, s.y - r * 0.22, r * 0.18, r * 0.09, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fill();
    // Small secondary highlight
    ctx.beginPath();
    ctx.arc(s.x + r * 0.3, s.y + r * 0.05, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
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
