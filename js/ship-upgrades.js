const UPGRADES = [
  { key: 'speed', label: 'Speed', icon: '💨', baseCost: 20, perLevel: 15, max: 10, desc: 'Thrust power' },
  { key: 'damage', label: 'Damage', icon: '💥', baseCost: 25, perLevel: 20, max: 10, desc: 'Bullet damage' },
  { key: 'maxHp', label: 'Armor', icon: '🛡️', baseCost: 20, perLevel: 15, max: 10, desc: 'Max health' },
  { key: 'fireRate', label: 'Fire Rate', icon: '🔥', baseCost: 30, perLevel: 20, max: 10, desc: 'Shoot faster' },
];

export class ShipUpgrades {
  constructor() {
    this.levels = { speed: 0, damage: 0, maxHp: 0, fireRate: 0 };
    this.showMenu = false;
  }

  getCost(key) {
    const u = UPGRADES.find(u => u.key === key);
    return u.baseCost + this.levels[key] * u.perLevel;
  }

  canUpgrade(key, metal) {
    const u = UPGRADES.find(u => u.key === key);
    return this.levels[key] < u.max && metal >= this.getCost(key);
  }

  upgrade(key) {
    this.levels[key]++;
  }

  getSpeedMultiplier() { return 1 + this.levels.speed * 0.12; }
  getDamageMultiplier() { return 1 + this.levels.damage * 0.15; }
  getMaxHp() { return 100 + this.levels.maxHp * 20; }
  getFireRateMultiplier() { return 1 - this.levels.fireRate * 0.07; }

  handleTap(sx, sy, screenW, screenH, metal) {
    if (!this.showMenu) return -1;
    const panelW = 280;
    const panelH = UPGRADES.length * 56 + 20;
    const px = screenW / 2 - panelW / 2;
    const py = screenH / 2 - panelH / 2;

    for (let i = 0; i < UPGRADES.length; i++) {
      const u = UPGRADES[i];
      const btnX = px + panelW - 70;
      const btnY = py + 14 + i * 56;
      if (sx >= btnX && sx <= btnX + 60 && sy >= btnY && sy <= btnY + 40) {
        if (this.canUpgrade(u.key, metal)) {
          return i;
        }
        return -1;
      }
    }
    return -1;
  }

  render(ctx, w, h, metal) {
    if (!this.showMenu) return;

    const panelW = 280;
    const panelH = UPGRADES.length * 56 + 20;
    const px = w / 2 - panelW / 2;
    const py = h / 2 - panelH / 2;

    // Backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);

    // Panel
    ctx.fillStyle = 'rgba(15, 15, 40, 0.95)';
    ctx.beginPath();
    ctx.roundRect(px, py - 40, panelW, panelH + 50, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 120, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title
    ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aaccff';
    ctx.fillText('⬆ Ship Upgrades', w / 2, py - 16);
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(`⛏️ Metal: ${metal | 0}`, w / 2, py);
    ctx.textAlign = 'left';

    for (let i = 0; i < UPGRADES.length; i++) {
      const u = UPGRADES[i];
      const uy = py + 14 + i * 56;
      const level = this.levels[u.key];
      const cost = this.getCost(u.key);
      const canBuy = this.canUpgrade(u.key, metal);
      const maxed = level >= u.max;

      // Row
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#dde';
      ctx.fillText(`${u.icon} ${u.label}`, px + 12, uy + 16);

      // Level pips
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#778';
      ctx.fillText(u.desc, px + 12, uy + 32);

      for (let j = 0; j < u.max; j++) {
        ctx.fillStyle = j < level ? '#66aaff' : '#333';
        ctx.fillRect(px + 100 + j * 14, uy + 24, 10, 6);
      }

      // Buy button
      const btnX = px + panelW - 70;
      if (maxed) {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.roundRect(btnX, uy, 60, 40, 6);
        ctx.fill();
        ctx.fillStyle = '#666';
        ctx.font = '12px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MAX', btnX + 30, uy + 24);
      } else {
        ctx.fillStyle = canBuy ? 'rgba(40, 80, 40, 0.9)' : 'rgba(40, 40, 40, 0.9)';
        ctx.beginPath();
        ctx.roundRect(btnX, uy, 60, 40, 6);
        ctx.fill();
        ctx.strokeStyle = canBuy ? '#44ff88' : '#444';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = '11px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = canBuy ? 1 : 0.4;
        ctx.fillStyle = '#dde';
        ctx.fillText(`⛏️${cost}`, btnX + 30, uy + 24);
        ctx.globalAlpha = 1;
      }
      ctx.textAlign = 'left';
    }

    // Close hint
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#667';
    ctx.fillText('Tap ⬆ button to close', w / 2, py + panelH + 4);
    ctx.textAlign = 'left';
  }
}
