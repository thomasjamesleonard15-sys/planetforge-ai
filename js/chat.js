import { multiplayer } from './multiplayer.js';

const MAX_MESSAGES = 20;
const MESSAGE_LIFE = 12;

export class Chat {
  constructor() {
    this.messages = [];
    this.inputActive = false;
    this.inputText = '';
    this.chatBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.sendBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.closeBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.quickRects = [];
    this.quickMessages = ['GG', 'Help!', 'Follow me', 'Nice!', 'Wait', 'Go go go!'];
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

    if (this.inputActive) {
      const cl = this.closeBtnRect;
      if (x >= cl.x && x <= cl.x + cl.w && y >= cl.y && y <= cl.y + cl.h) {
        this.inputActive = false;
        return true;
      }

      const sb = this.sendBtnRect;
      if (sb.w > 0 && x >= sb.x && x <= sb.x + sb.w && y >= sb.y && y <= sb.y + sb.h) {
        if (this.inputText.length > 0) {
          this.sendMessage(this.inputText);
          this.inputText = '';
        }
        return true;
      }

      for (let i = 0; i < this.quickRects.length; i++) {
        const qr = this.quickRects[i];
        if (x >= qr.x && x <= qr.x + qr.w && y >= qr.y && y <= qr.y + qr.h) {
          this.sendMessage(this.quickMessages[i]);
          return true;
        }
      }
      return true;
    }
    return false;
  }

  handleKey(key) {
    if (!this.inputActive) return false;
    if (key === 'Enter') {
      if (this.inputText.length > 0) {
        this.sendMessage(this.inputText);
        this.inputText = '';
      }
      return true;
    }
    if (key === 'Backspace') {
      this.inputText = this.inputText.slice(0, -1);
      return true;
    }
    if (key === 'Escape') {
      this.inputActive = false;
      return true;
    }
    if (key.length === 1 && this.inputText.length < 50) {
      this.inputText += key;
      return true;
    }
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

    const recentMsgs = this.messages.slice(-5);
    if (recentMsgs.length > 0 && !this.inputActive) {
      let my = h - 160;
      ctx.textAlign = 'left';
      for (let i = recentMsgs.length - 1; i >= 0; i--) {
        const m = recentMsgs[i];
        const alpha = Math.min(1, m.time / 2);
        ctx.globalAlpha = alpha;
        ctx.font = '12px -apple-system, system-ui, sans-serif';
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

    if (this.inputActive) {
      this.renderChatPanel(ctx, w, h);
    }

    ctx.textAlign = 'left';
  }

  renderChatPanel(ctx, w, h) {
    const pw = Math.min(320, w - 32), ph = 280;
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2;

    ctx.fillStyle = 'rgba(10, 5, 20, 0.95)';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.strokeStyle = '#6644aa';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aa88ff';
    ctx.fillText('CHAT', px + pw / 2, py + 24);

    const clw = 30, clh = 30;
    const clx = px + pw - clw - 8, cly = py + 6;
    this.closeBtnRect = { x: clx, y: cly, w: clw, h: clh };
    ctx.fillStyle = '#442222';
    ctx.beginPath();
    ctx.roundRect(clx, cly, clw, clh, 6);
    ctx.fill();
    ctx.fillStyle = '#ff6666';
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillText('✕', clx + clw / 2, cly + clh / 2 + 5);

    ctx.textAlign = 'left';
    const msgArea = { x: px + 10, y: py + 40, w: pw - 20, h: 100 };
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(msgArea.x, msgArea.y, msgArea.w, msgArea.h, 6);
    ctx.fill();

    const visible = this.messages.slice(-5);
    let my = msgArea.y + 16;
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    for (const m of visible) {
      ctx.fillStyle = '#ffaa44';
      ctx.fillText(`${m.name}:`, msgArea.x + 6, my);
      ctx.fillStyle = '#ddd';
      ctx.fillText(m.text, msgArea.x + 6 + ctx.measureText(`${m.name}: `).width, my);
      my += 18;
    }

    const inputY = msgArea.y + msgArea.h + 10;
    const inputW = pw - 80, inputH = 34;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(px + 10, inputY, inputW, inputH, 6);
    ctx.fill();
    ctx.strokeStyle = '#5566aa';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = this.inputText ? '#fff' : '#666';
    ctx.fillText(this.inputText || 'Type a message...', px + 18, inputY + 22);

    const sbw = 56, sbh = 34;
    const sbx = px + 10 + inputW + 6, sby = inputY;
    this.sendBtnRect = { x: sbx, y: sby, w: sbw, h: sbh };
    ctx.fillStyle = this.inputText ? '#3b82f6' : '#333';
    ctx.beginPath();
    ctx.roundRect(sbx, sby, sbw, sbh, 6);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
    ctx.fillText('Send', sbx + sbw / 2, sby + sbh / 2 + 5);

    const qy = inputY + inputH + 12;
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#8888aa';
    ctx.fillText('Quick:', px + pw / 2, qy);

    this.quickRects = [];
    const qGap = 6;
    let qx = px + 10;
    const qRow = qy + 8;
    for (let i = 0; i < this.quickMessages.length; i++) {
      const txt = this.quickMessages[i];
      const tw = ctx.measureText(txt).width + 16;
      const qh = 28;
      if (qx + tw > px + pw - 10) { qx = px + 10; }
      this.quickRects.push({ x: qx, y: qRow, w: tw, h: qh });
      ctx.fillStyle = '#2a2a4e';
      ctx.beginPath();
      ctx.roundRect(qx, qRow, tw, qh, 6);
      ctx.fill();
      ctx.strokeStyle = '#5566aa';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ddd';
      ctx.fillText(txt, qx + tw / 2, qRow + qh / 2 + 4);
      qx += tw + qGap;
    }

    ctx.textAlign = 'left';
  }
}
