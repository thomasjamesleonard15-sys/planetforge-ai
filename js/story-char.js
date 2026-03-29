export class CharacterSheet {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.done = false;
    this.name = '';
    this.classIndex = 0;
    this.classes = [
      { name: 'Pilot', desc: 'Fast ship, weak weapons', color: '#44ddff', icon: '🚀', hp: 80, speed: 150, damage: 8 },
      { name: 'Soldier', desc: 'Balanced all-around', color: '#ff8844', icon: '⚔️', hp: 100, speed: 100, damage: 12 },
      { name: 'Tank', desc: 'Slow but tough', color: '#88ff44', icon: '🛡️', hp: 150, speed: 60, damage: 10 },
      { name: 'Rogue', desc: 'High damage, low HP', color: '#ff44ff', icon: '🗡️', hp: 60, speed: 120, damage: 18 },
    ];
    this.step = 0;
    this.nameRects = [];
    this.classRects = [];
    this.startRect = { x: 0, y: 0, w: 0, h: 0 };
    this.delRect = { x: 0, y: 0, w: 0, h: 0 };
    this.letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    this.letterRects = [];
  }

  get selectedClass() { return this.classes[this.classIndex]; }

  handleTap(x, y) {
    if (this.step === 0) {
      for (let i = 0; i < this.letterRects.length; i++) {
        const r = this.letterRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          if (this.name.length < 12) this.name += this.letters[i];
          return;
        }
      }
      const d = this.delRect;
      if (d.w > 0 && x >= d.x && x <= d.x + d.w && y >= d.y && y <= d.y + d.h) {
        this.name = this.name.slice(0, -1);
        return;
      }
      const s = this.startRect;
      if (this.name.length > 0 && x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        this.step = 1;
        return;
      }
    } else if (this.step === 1) {
      for (let i = 0; i < this.classRects.length; i++) {
        const r = this.classRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          this.classIndex = i;
        }
      }
      const s = this.startRect;
      if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) {
        this.done = true;
      }
    }
  }

  handleKey(key) {
    if (this.step === 0) {
      if (key === 'Backspace') { this.name = this.name.slice(0, -1); return true; }
      if (key === 'Enter' && this.name.length > 0) { this.step = 1; return true; }
      if (key.length === 1 && this.name.length < 12 && /[a-zA-Z]/.test(key)) {
        this.name += key.toUpperCase();
        return true;
      }
    } else if (this.step === 1) {
      if (key === 'Enter') { this.done = true; return true; }
    }
    return false;
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    ctx.font = 'bold 24px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aa88ff';
    ctx.fillText('CREATE YOUR CHARACTER', w / 2, h * 0.08);

    if (this.step === 0) {
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aaaacc';
      ctx.fillText('Enter your name:', w / 2, h * 0.16);

      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.roundRect(w / 2 - 110, h * 0.19, 220, 44, 8);
      ctx.fill();
      ctx.strokeStyle = '#6644aa';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(this.name + (Date.now() % 1000 < 500 ? '|' : ''), w / 2, h * 0.19 + 30);

      this.letterRects = [];
      const cols = 9;
      const kw = 32, kh = 36, gap = 4;
      const totalW = cols * (kw + gap) - gap;
      const startX = w / 2 - totalW / 2;
      const startY = h * 0.30;
      for (let i = 0; i < this.letters.length; i++) {
        const col = i % cols, row = Math.floor(i / cols);
        const kx = startX + col * (kw + gap), ky = startY + row * (kh + gap);
        this.letterRects.push({ x: kx, y: ky, w: kw, h: kh });
        ctx.fillStyle = '#222244';
        ctx.beginPath();
        ctx.roundRect(kx, ky, kw, kh, 6);
        ctx.fill();
        ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#ddd';
        ctx.fillText(this.letters[i], kx + kw / 2, ky + kh / 2 + 6);
      }

      const dw = 60, dh = 36;
      const dx = w / 2 + totalW / 2 - dw, dy = startY + 3 * (kh + gap);
      this.delRect = { x: dx, y: dy, w: dw, h: dh };
      ctx.fillStyle = '#4a3020';
      ctx.beginPath();
      ctx.roundRect(dx, dy, dw, dh, 6);
      ctx.fill();
      ctx.fillStyle = '#ddaa77';
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillText('⌫', dx + dw / 2, dy + dh / 2 + 5);

      const sbw = 160, sbh = 44;
      const sbx = w / 2 - sbw / 2, sby = h * 0.75;
      this.startRect = { x: sbx, y: sby, w: sbw, h: sbh };
      ctx.fillStyle = this.name.length > 0 ? '#3b82f6' : '#333';
      ctx.beginPath();
      ctx.roundRect(sbx, sby, sbw, sbh, 10);
      ctx.fill();
      ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('Next →', sbx + sbw / 2, sby + sbh / 2 + 6);
    } else {
      ctx.font = '16px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aaaacc';
      ctx.fillText(`${this.name}, choose your class:`, w / 2, h * 0.16);

      this.classRects = [];
      const cardW = Math.min(280, w - 40), cardH = 70, gap = 10;
      const startY = h * 0.22;
      for (let i = 0; i < this.classes.length; i++) {
        const c = this.classes[i];
        const cx = w / 2 - cardW / 2, cy = startY + i * (cardH + gap);
        this.classRects.push({ x: cx, y: cy, w: cardW, h: cardH });
        ctx.fillStyle = i === this.classIndex ? 'rgba(40, 30, 80, 0.9)' : 'rgba(20, 15, 40, 0.8)';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, cardH, 10);
        ctx.fill();
        ctx.strokeStyle = i === this.classIndex ? c.color : '#333';
        ctx.lineWidth = i === this.classIndex ? 2 : 1;
        ctx.stroke();
        ctx.font = '24px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(c.icon, cx + 12, cy + 35);
        ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = c.color;
        ctx.fillText(c.name, cx + 48, cy + 28);
        ctx.font = '12px -apple-system, system-ui, sans-serif';
        ctx.fillStyle = '#888';
        ctx.fillText(c.desc, cx + 48, cy + 45);
        ctx.fillStyle = '#666';
        ctx.fillText(`HP:${c.hp}  SPD:${c.speed}  DMG:${c.damage}`, cx + 48, cy + 60);
        ctx.textAlign = 'center';
      }

      const sbw = 180, sbh = 50;
      const sbx = w / 2 - sbw / 2, sby = h * 0.85;
      this.startRect = { x: sbx, y: sby, w: sbw, h: sbh };
      ctx.fillStyle = '#22cc44';
      ctx.beginPath();
      ctx.roundRect(sbx, sby, sbw, sbh, 10);
      ctx.fill();
      ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('Begin', sbx + sbw / 2, sby + sbh / 2 + 6);
    }
    ctx.textAlign = 'left';
  }
}
