import { TILE, BUILDING_COSTS, COLORS } from './constants.js';

const BUILD_OPTIONS = [
  { type: TILE.FARM, label: 'Farm', icon: '🌾' },
  { type: TILE.TURRET, label: 'Turret', icon: '🔫' },
  { type: TILE.WALL, label: 'Wall', icon: '🧱' },
  { type: TILE.SOLAR, label: 'Solar', icon: '⚡' },
];

export class HUD {
  constructor() {
    this.selectedBuild = 0;
    this.showBuildMenu = false;
    this.joystickActive = false;
    this.joystickX = 0;
    this.joystickY = 0;
    this.joystickOriginX = 0;
    this.joystickOriginY = 0;
    this.message = '';
    this.messageTimer = 0;
  }

  get selectedTileType() {
    return BUILD_OPTIONS[this.selectedBuild].type;
  }

  showMessage(msg) {
    this.message = msg;
    this.messageTimer = 2;
  }

  update(dt) {
    if (this.messageTimer > 0) this.messageTimer -= dt;
  }

  handleBuildMenuTap(sx, sy, screenW, screenH) {
    if (!this.showBuildMenu) return -1;
    const menuY = screenH - 160;
    const menuH = 70;
    if (sy < menuY || sy > menuY + menuH) return -1;
    const totalW = BUILD_OPTIONS.length * 80;
    const startX = (screenW - totalW) / 2;
    const idx = ((sx - startX) / 80) | 0;
    if (idx >= 0 && idx < BUILD_OPTIONS.length) {
      this.selectedBuild = idx;
      return idx;
    }
    return -1;
  }

  render(ctx, w, h, resources, player) {
    // Top bar - resources
    ctx.fillStyle = COLORS.hud;
    ctx.fillRect(0, 0, w, 52);
    ctx.strokeStyle = COLORS.hudBorder;
    ctx.strokeRect(0, 0, w, 52);

    ctx.font = `${Math.min(20, w * 0.03)}px -apple-system, system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    const y = 28;
    const items = [
      `🌾 ${resources.food | 0}`,
      `⛏️ ${resources.metal | 0}`,
      `⚡ ${resources.energy | 0}`,
      `🏆 ${resources.score}`,
      `👾 Wave ${resources.wave}`,
    ];
    let tx = 16;
    for (const item of items) {
      ctx.fillStyle = '#dde';
      ctx.fillText(item, tx, y);
      tx += ctx.measureText(item).width + 20;
    }

    // Weapon indicator
    ctx.fillStyle = player.weapon.color;
    ctx.fillText(`🔫 ${player.weapon.name}`, w - 160, y);

    // Build toggle button
    const btnSize = 56;
    const btnX = w - btnSize - 16;
    const btnY = h - btnSize - 90;
    ctx.fillStyle = this.showBuildMenu ? '#4466aa' : '#334';
    ctx.strokeStyle = '#6688cc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnSize, btnSize, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#dde';
    ctx.font = '24px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🔨', btnX + btnSize / 2, btnY + btnSize / 2 + 2);
    ctx.textAlign = 'left';

    // Weapon switch button
    const wpnBtnX = w - btnSize - 16;
    const wpnBtnY = btnY - btnSize - 12;
    ctx.fillStyle = '#334';
    ctx.strokeStyle = player.weapon.color;
    ctx.beginPath();
    ctx.roundRect(wpnBtnX, wpnBtnY, btnSize, btnSize, 10);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillText('🔄', wpnBtnX + btnSize / 2, wpnBtnY + btnSize / 2 + 2);
    ctx.textAlign = 'left';

    // Build menu
    if (this.showBuildMenu) {
      this.renderBuildMenu(ctx, w, h, resources);
    }

    // Virtual joystick
    if (this.joystickActive) {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(this.joystickOriginX, this.joystickOriginY, 60, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(
        this.joystickOriginX + this.joystickX * 40,
        this.joystickOriginY + this.joystickY * 40,
        25, 0, Math.PI * 2
      );
      ctx.fillStyle = '#aaccff';
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Message
    if (this.messageTimer > 0) {
      ctx.globalAlpha = Math.min(1, this.messageTimer);
      ctx.font = '22px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffdd44';
      ctx.fillText(this.message, w / 2, h / 2 - 100);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  renderBuildMenu(ctx, w, h, resources) {
    const menuY = h - 160;
    ctx.fillStyle = COLORS.hud;
    ctx.fillRect(0, menuY, w, 80);
    ctx.strokeStyle = COLORS.hudBorder;
    ctx.strokeRect(0, menuY, w, 80);

    const totalW = BUILD_OPTIONS.length * 80;
    const startX = (w - totalW) / 2;

    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < BUILD_OPTIONS.length; i++) {
      const opt = BUILD_OPTIONS[i];
      const ox = startX + i * 80 + 40;
      const oy = menuY + 30;
      const cost = BUILDING_COSTS[opt.type];
      const canAfford = resources.canAfford(cost);

      ctx.fillStyle = i === this.selectedBuild ? '#445588' : '#223';
      ctx.strokeStyle = i === this.selectedBuild ? '#88aaff' : '#445';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(ox - 34, oy - 24, 68, 58, 8);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = canAfford ? 1 : 0.4;
      ctx.font = '22px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(opt.icon, ox, oy - 4);
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aab';
      ctx.fillText(opt.label, ox, oy + 22);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}
