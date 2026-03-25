import { multiplayer } from './multiplayer.js';

const MAX_MESSAGES = 20;
const MESSAGE_LIFE = 12;
const KB_ROWS = [
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];

export class Chat {
  constructor() {
    this.messages = [];
    this.inputActive = false;
    this.inputText = '';
    this.shiftOn = false;
    this.chatBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.sendBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.closeBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.keyRects = [];
    this.shiftRect = { x: 0, y: 0, w: 0, h: 0 };
    this.backspaceRect = { x: 0, y: 0, w: 0, h: 0 };
    this.spaceRect = { x: 0, y: 0, w: 0, h: 0 };
    this.quickRects = [];
    this.quickMessages = ['GG', 'Help!', 'Follow me', 'Nice!', 'Wait', 'Go!'];
  }

  addMessage(name, text) {
    this.messages.push({ name, text, time: MESSAGE_LIFE });
    if (this.messages.length > MAX_MESSAGES) this.messages.shift();
  }

  sendMessage(text) {
    if (!text || !multiplayer.connected) return;
    this.addMessage('You', text);
    for (const conn of multiplayer.connections) {
      if (conn.open) {
        try { conn.send({ type: 'chat', name: 'Player', text }); } catch (_) {}
      }
    }
  }

  handleTap(x, y) {
    const cb = this.chatBtnRect;
    if (cb.w > 0 && x >= cb.x && x <= cb.x + cb.w && y >= cb.y && y <= cb.y + cb.h) {
      this.inputActive = !this.inputActive;
      return true;
    }
    if (!this.inputActive) return false;

    const cl = this.closeBtnRect;
    if (x >= cl.x && x <= cl.x + cl.w && y >= cl.y && y <= cl.y + cl.h) {
      this.inputActive = false;
      return true;
    }

    const sb = this.sendBtnRect;
    if (sb.w > 0 && x >= sb.x && x <= sb.x + sb.w && y >= sb.y && y <= sb.y + sb.h) {
      if (this.inputText.length > 0) { this.sendMessage(this.inputText); this.inputText = ''; }
      return true;
    }

    for (let i = 0; i < this.quickRects.length; i++) {
      const qr = this.quickRects[i];
      if (x >= qr.x && x <= qr.x + qr.w && y >= qr.y && y <= qr.y + qr.h) {
        this.sendMessage(this.quickMessages[i]);
        return true;
      }
    }

    for (const kr of this.keyRects) {
      if (x >= kr.x && x <= kr.x + kr.w && y >= kr.y && y <= kr.y + kr.h) {
        const ch = this.shiftOn ? kr.key.toUpperCase() : kr.key;
        this.inputText += ch;
        this.shiftOn = false;
        return true;
      }
    }

    const sh = this.shiftRect;
    if (sh.w > 0 && x >= sh.x && x <= sh.x + sh.w && y >= sh.y && y <= sh.y + sh.h) {
      this.shiftOn = !this.shiftOn;
      return true;
    }

    const bs = this.backspaceRect;
    if (bs.w > 0 && x >= bs.x && x <= bs.x + bs.w && y >= bs.y && y <= bs.y + bs.h) {
      this.inputText = this.inputText.slice(0, -1);
      return true;
    }

    const sp = this.spaceRect;
    if (sp.w > 0 && x >= sp.x && x <= sp.x + sp.w && y >= sp.y && y <= sp.y + sp.h) {
      this.inputText += ' ';
      return true;
    }

    return true;
  }

  handleKey(key) {
    if (!this.inputActive) return false;
    if (key === 'Enter') {
      if (this.inputText.length > 0) { this.sendMessage(this.inputText); this.inputText = ''; }
      return true;
    }
    if (key === 'Backspace') { this.inputText = this.inputText.slice(0, -1); return true; }
    if (key === 'Escape') { this.inputActive = false; return true; }
    if (key.length === 1 && this.inputText.length < 200) { this.inputText += key; return true; }
    return false;
  }

  update(dt) {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      this.messages[i].time -= dt;
      if (this.messages[i].time <= 0) this.messages.splice(i, 1);
    }
  }

  render(ctx, w, h) {
    const btnSize = 40;
    const bx = 12, by = h - btnSize - 16;
    this.chatBtnRect = { x: bx, y: by, w: btnSize, h: btnSize };
    ctx.fillStyle = this.inputActive ? 'rgba(60, 40, 100, 0.9)' : 'rgba(30, 20, 50, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bx, by, btnSize, btnSize, 10);
    ctx.fill();
    ctx.strokeStyle = '#aa66ff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '20px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ddd';
    ctx.fillText('💬', bx + btnSize / 2, by + btnSize / 2 + 7);

    if (!this.inputActive) {
      const recentMsgs = this.messages.slice(-5);
      let my = h - 70;
      ctx.textAlign = 'left';
      for (let i = recentMsgs.length - 1; i >= 0; i--) {
        const m = recentMsgs[i];
        ctx.globalAlpha = Math.min(1, m.time / 2);
        ctx.font = '16px -apple-system, system-ui, sans-serif';
        const tw = ctx.measureText(`${m.name}: ${m.text}`).width + 16;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.roundRect(12, my - 14, tw, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#ffaa44';
        ctx.fillText(`${m.name}:`, 18, my);
        ctx.fillStyle = '#ddd';
        ctx.fillText(m.text, 18 + ctx.measureText(`${m.name}: `).width, my);
        my -= 26;
      }
      ctx.globalAlpha = 1;
    }

    if (this.inputActive) this.renderPanel(ctx, w, h);
    ctx.textAlign = 'left';
  }

  renderPanel(ctx, w, h) {
    const pw = Math.min(500, w - 16), ph = h * 0.92;
    const px = w / 2 - pw / 2, py = h - ph - 10;

    ctx.fillStyle = 'rgba(10, 5, 20, 0.97)';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.strokeStyle = '#6644aa';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title + close
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aa88ff';
    ctx.fillText('CHAT', px + pw / 2, py + 22);

    const clw = 30, clh = 30, clx = px + pw - clw - 8, cly = py + 6;
    this.closeBtnRect = { x: clx, y: cly, w: clw, h: clh };
    ctx.fillStyle = '#442222';
    ctx.beginPath();
    ctx.roundRect(clx, cly, clw, clh, 6);
    ctx.fill();
    ctx.fillStyle = '#ff6666';
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillText('✕', clx + clw / 2, cly + clh / 2 + 5);

    // Messages
    ctx.textAlign = 'left';
    const msgY = py + 36, msgH = 70;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(px + 8, msgY, pw - 16, msgH, 6);
    ctx.fill();

    const visible = this.messages.slice(-4);
    let my = msgY + 16;
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    for (const m of visible) {
      ctx.fillStyle = '#ffaa44';
      ctx.fillText(`${m.name}:`, px + 14, my);
      ctx.fillStyle = '#ddd';
      ctx.fillText(m.text, px + 14 + ctx.measureText(`${m.name}: `).width, my);
      my += 16;
    }

    // Input + send
    const iy = msgY + msgH + 6;
    const iw = pw - 80, ih = 30;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(px + 8, iy, iw, ih, 6);
    ctx.fill();
    ctx.strokeStyle = '#5566aa';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = this.inputText ? '#fff' : '#666';
    const displayText = this.inputText.length > 25 ? '...' + this.inputText.slice(-22) : this.inputText;
    ctx.fillText(displayText || 'Type...', px + 14, iy + 20);

    const sbw = 56, sbh = ih, sbx = px + 8 + iw + 6, sby = iy;
    this.sendBtnRect = { x: sbx, y: sby, w: sbw, h: sbh };
    ctx.fillStyle = this.inputText ? '#3b82f6' : '#333';
    ctx.beginPath();
    ctx.roundRect(sbx, sby, sbw, sbh, 6);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px -apple-system, system-ui, sans-serif';
    ctx.fillText('Send', sbx + sbw / 2, sby + sbh / 2 + 4);

    // Quick messages
    const qy = iy + ih + 6;
    this.quickRects = [];
    let qx = px + 8;
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    for (let i = 0; i < this.quickMessages.length; i++) {
      const txt = this.quickMessages[i];
      const tw = ctx.measureText(txt).width + 14;
      const qh = 24;
      if (qx + tw > px + pw - 8) { qx = px + 8; }
      this.quickRects.push({ x: qx, y: qy, w: tw, h: qh });
      ctx.fillStyle = '#2a2a4e';
      ctx.beginPath();
      ctx.roundRect(qx, qy, tw, qh, 5);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#aaa';
      ctx.fillText(txt, qx + tw / 2, qy + qh / 2 + 4);
      qx += tw + 4;
    }

    // Keyboard
    this.renderKeyboard(ctx, px, pw, qy + 30);
    ctx.textAlign = 'left';
  }

  renderKeyboard(ctx, px, pw, startY) {
    this.keyRects = [];
    const gap = 4;
    const kh = 44;

    for (let r = 0; r < KB_ROWS.length; r++) {
      const row = KB_ROWS[r];
      const kw = Math.floor((pw - 16 - (row.length - 1) * gap) / row.length);
      const indent = r === 1 ? 12 : r === 2 ? 36 : 0;
      const ky = startY + r * (kh + gap);

      for (let c = 0; c < row.length; c++) {
        const kx = px + 8 + indent + c * (kw + gap);
        const ch = row[c];
        this.keyRects.push({ x: kx, y: ky, w: kw, h: kh, key: ch });

        ctx.fillStyle = '#222244';
        ctx.beginPath();
        ctx.roundRect(kx, ky, kw, kh, 6);
        ctx.fill();
        ctx.strokeStyle = '#444466';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ddd';
        ctx.font = 'bold 20px -apple-system, system-ui, sans-serif';
        ctx.fillText(this.shiftOn ? ch.toUpperCase() : ch, kx + kw / 2, ky + kh / 2 + 7);
      }

      // Shift on row 2, backspace on row 2
      if (r === 2) {
        const shW = 30;
        const shX = px + 8;
        this.shiftRect = { x: shX, y: ky, w: shW, h: kh };
        ctx.fillStyle = this.shiftOn ? '#4444aa' : '#222244';
        ctx.beginPath();
        ctx.roundRect(shX, ky, shW, kh, 6);
        ctx.fill();
        ctx.strokeStyle = '#444466';
        ctx.stroke();
        ctx.fillStyle = '#aaa';
        ctx.font = '14px -apple-system, system-ui, sans-serif';
        ctx.fillText('⇧', shX + shW / 2, ky + kh / 2 + 5);

      }
    }

    // Space bar + backspace row
    const spY = startY + 3 * (kh + gap);
    const bsW = pw * 0.2;
    const spW = pw * 0.5, spH = kh;
    const spX = px + 8;
    this.spaceRect = { x: spX, y: spY, w: spW, h: spH };
    ctx.fillStyle = '#222244';
    ctx.beginPath();
    ctx.roundRect(spX, spY, spW, spH, 6);
    ctx.fill();
    ctx.strokeStyle = '#444466';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.fillText('space', spX + spW / 2, spY + spH / 2 + 5);

    const bsX = px + pw - 8 - bsW;
    this.backspaceRect = { x: bsX, y: spY, w: bsW, h: spH };
    ctx.fillStyle = '#4a3020';
    ctx.beginPath();
    ctx.roundRect(bsX, spY, bsW, spH, 6);
    ctx.fill();
    ctx.strokeStyle = '#6a5030';
    ctx.stroke();
    ctx.fillStyle = '#ddaa77';
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.fillText('⌫ delete', bsX + bsW / 2, spY + spH / 2 + 6);
  }
}
