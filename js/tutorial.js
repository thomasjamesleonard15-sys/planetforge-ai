const STORAGE_KEY = 'pforge-tut-seen';

const PAGES = [
  {
    title: 'Welcome!',
    lines: [
      'Fight aliens, build a base,',
      'explore planets, and save the galaxy.',
    ],
  },
  {
    title: 'Movement',
    lines: [
      '📱 Touch: left side joystick',
      '⌨️  Keyboard: WASD or arrow keys',
      '🎮 Gamepad: left stick',
    ],
  },
  {
    title: 'Shooting',
    lines: [
      '📱 Touch: tap right side',
      '⌨️  Keyboard: Space bar',
      '🎮 Gamepad: R2 / A button',
    ],
  },
  {
    title: 'Fist Fighting',
    lines: [
      'Punch enemies at close range!',
      '⌨️  Keyboard: F key',
      '🎮 Gamepad: X button',
      'No ammo needed — pure power.',
    ],
  },
  {
    title: 'Galaxy Map',
    lines: [
      'Tap planets to select them.',
      'Tap "Land Here" to explore.',
      'Fly to space to fight aliens.',
    ],
  },
  {
    title: 'Special Planets',
    lines: [
      '🦇 Batplanet — Batman vs DC villains',
      '🎮 Pixel Arena — arcade games',
      '❓ The Unknown — interactive story',
    ],
  },
  {
    title: 'Multiplayer',
    lines: [
      'Create a room with a 5-digit code',
      'Share the link with friends to play co-op!',
      'Fight together, chat, and explore.',
    ],
  },
  {
    title: 'Good Luck!',
    lines: [
      'Tap anywhere to start playing.',
      'Tap 📖 button to see tutorial again.',
    ],
  },
];

export class Tutorial {
  constructor() {
    this.show = false;
    this.page = 0;
    this.btnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.closeRect = { x: 0, y: 0, w: 0, h: 0 };
    this.nextRect = { x: 0, y: 0, w: 0, h: 0 };
    this.prevRect = { x: 0, y: 0, w: 0, h: 0 };
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        this.show = true;
      }
    } catch (_) {}
  }

  open() { this.show = true; this.page = 0; }

  handleTap(x, y) {
    if (!this.show) {
      const b = this.btnRect;
      if (b.w > 0 && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.open();
        return true;
      }
      return false;
    }
    const c = this.closeRect;
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      this.close();
      return true;
    }
    const n = this.nextRect;
    if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) {
      if (this.page < PAGES.length - 1) this.page++;
      else this.close();
      return true;
    }
    const p = this.prevRect;
    if (p.w > 0 && x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
      if (this.page > 0) this.page--;
      return true;
    }
    return true;
  }

  close() {
    this.show = false;
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
  }

  render(ctx, w, h) {
    // Help button always visible
    const bw = 36, bh = 36;
    const bx = 12, by = 190;
    this.btnRect = { x: bx, y: by, w: bw, h: bh };
    ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 120, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ddd';
    ctx.fillText('📖', bx + bw / 2, by + bh / 2 + 6);

    if (!this.show) return;

    // Modal backdrop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, w, h);

    const pw = Math.min(420, w - 32), ph = Math.min(420, h - 80);
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2;

    ctx.fillStyle = 'rgba(15, 10, 30, 0.97)';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 16);
    ctx.fill();
    ctx.strokeStyle = '#6644aa';
    ctx.lineWidth = 3;
    ctx.stroke();

    const page = PAGES[this.page];
    ctx.font = 'bold 26px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aa88ff';
    ctx.fillText(page.title, w / 2, py + 60);

    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ddd';
    let ly = py + 110;
    for (const line of page.lines) {
      ctx.fillText(line, w / 2, ly);
      ly += 28;
    }

    // Page indicator
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`${this.page + 1} / ${PAGES.length}`, w / 2, py + ph - 80);

    // Nav buttons
    const bw2 = 90, bh2 = 40;
    if (this.page > 0) {
      const pbx = w / 2 - bw2 - 10, pby = py + ph - 60;
      this.prevRect = { x: pbx, y: pby, w: bw2, h: bh2 };
      ctx.fillStyle = '#334';
      ctx.beginPath();
      ctx.roundRect(pbx, pby, bw2, bh2, 8);
      ctx.fill();
      ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('← Back', pbx + bw2 / 2, pby + bh2 / 2 + 5);
    } else {
      this.prevRect = { x: 0, y: 0, w: 0, h: 0 };
    }

    const nbx = this.page > 0 ? w / 2 + 10 : w / 2 - bw2 / 2;
    const nby = py + ph - 60;
    this.nextRect = { x: nbx, y: nby, w: bw2, h: bh2 };
    ctx.fillStyle = this.page < PAGES.length - 1 ? '#3b82f6' : '#22cc44';
    ctx.beginPath();
    ctx.roundRect(nbx, nby, bw2, bh2, 8);
    ctx.fill();
    ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.page < PAGES.length - 1 ? 'Next →' : 'Start!', nbx + bw2 / 2, nby + bh2 / 2 + 5);

    // Close button
    const cbw = 30, cbh = 30;
    const cbx = px + pw - cbw - 10, cby = py + 10;
    this.closeRect = { x: cbx, y: cby, w: cbw, h: cbh };
    ctx.fillStyle = '#442222';
    ctx.beginPath();
    ctx.roundRect(cbx, cby, cbw, cbh, 6);
    ctx.fill();
    ctx.fillStyle = '#ff6666';
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillText('✕', cbx + cbw / 2, cby + cbh / 2 + 5);
    ctx.textAlign = 'left';
  }
}
