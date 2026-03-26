export class ArcadeMenu {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.done = false;
    this.choice = '';
    this.timer = 0;
    this.buttons = [];
    this.backRect = { x: 0, y: 0, w: 0, h: 0 };
  }

  handleTap(x, y) {
    for (const btn of this.buttons) {
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.done = true;
        this.choice = btn.id;
        return;
      }
    }
    const b = this.backRect;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      this.done = true;
      this.choice = 'back';
    }
  }

  update(dt) {
    this.timer += dt;
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a0015');
    bg.addColorStop(0.5, '#1a0030');
    bg.addColorStop(1, '#050010');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(150, 50, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      const gy = h * 0.6 + i * 25;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    ctx.font = 'bold 32px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff44ff';
    ctx.fillText('PIXEL ARENA', w / 2, h * 0.12);
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#aa88cc';
    ctx.fillText('Choose your game', w / 2, h * 0.12 + 28);

    this.buttons = [];
    const games = [
      { id: 'qte', name: 'BOSS FIGHT', desc: 'Spam Y to defeat Dark Lord Vexor!', color: '#ff4444', icon: '👊' },
      { id: 'race', name: 'SPACE RACE', desc: 'Fly through rings as fast as you can!', color: '#44ff88', icon: '🏁' },
      { id: 'coop', name: 'CO-OP BOSS', desc: 'Fight mega bosses with friends!', color: '#ff88ff', icon: '🤝' },
    ];

    const cardW = Math.min(280, w * 0.7);
    const cardH = 90;
    const gap = 16;
    const startY = h * 0.28;

    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      const cx = w / 2 - cardW / 2;
      const cy = startY + i * (cardH + gap);
      this.buttons.push({ x: cx, y: cy, w: cardW, h: cardH, id: g.id });

      const pulse = 0.9 + Math.sin(this.timer * 3 + i * 1.5) * 0.1;
      ctx.fillStyle = 'rgba(20, 10, 40, 0.9)';
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 12);
      ctx.fill();
      ctx.strokeStyle = g.color;
      ctx.lineWidth = 2 * pulse;
      ctx.stroke();

      ctx.font = '28px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(g.icon, cx + 16, cy + 45);

      ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = g.color;
      ctx.fillText(g.name, cx + 56, cy + 35);

      ctx.font = '12px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#8888aa';
      ctx.fillText(g.desc, cx + 56, cy + 55);
    }

    const bw = 80, bh = 36;
    const bx = 16, by = 16;
    this.backRect = { x: bx, y: by, w: bw, h: bh };
    ctx.fillStyle = 'rgba(40, 20, 60, 0.9)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aab';
    ctx.fillText('← Back', bx + bw / 2, by + bh / 2 + 5);

    ctx.textAlign = 'left';
  }
}
