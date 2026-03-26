import { multiplayer } from './multiplayer.js';

export class Lobby {
  constructor() {
    this.mode = 'menu';
    this.joinCode = '';
    this.cursorBlink = 0;
    this.createBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.joinBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.backBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.confirmBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.startBtnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.soloRect = { x: 0, y: 0, w: 0, h: 0 };
    this.numRects = [];
    for (let i = 0; i < 10; i++) this.numRects.push({ x: 0, y: 0, w: 0, h: 0 });
    this.delRect = { x: 0, y: 0, w: 0, h: 0 };
    this.done = false;
    this.result = '';
    this.copyRect = { x: 0, y: 0, w: 0, h: 0 };
    this.copied = false;
    this.copiedTimer = 0;
  }

  handleTap(x, y) {
    if (this.mode === 'menu') {
      if (this.hitRect(x, y, this.createBtnRect)) {
        multiplayer.createRoom();
        this.mode = 'hosting';
      } else if (this.hitRect(x, y, this.joinBtnRect)) {
        this.mode = 'joining';
        this.joinCode = '';
      } else if (this.hitRect(x, y, this.soloRect)) {
        this.done = true;
        this.result = 'solo';
      }
    } else if (this.mode === 'joining') {
      if (this.hitRect(x, y, this.backBtnRect)) {
        this.mode = 'menu';
        this.joinCode = '';
      } else if (this.hitRect(x, y, this.confirmBtnRect) && this.joinCode.length === 5) {
        multiplayer.joinRoom(this.joinCode);
        this.mode = 'connecting';
      } else if (this.hitRect(x, y, this.delRect) && this.joinCode.length > 0) {
        this.joinCode = this.joinCode.slice(0, -1);
      } else {
        for (let i = 0; i < 10; i++) {
          if (this.hitRect(x, y, this.numRects[i]) && this.joinCode.length < 5) {
            this.joinCode += String(i);
            break;
          }
        }
      }
    } else if (this.mode === 'hosting') {
      if (this.hitRect(x, y, this.backBtnRect)) {
        multiplayer.destroy();
        this.mode = 'menu';
      } else if (this.hitRect(x, y, this.copyRect) && multiplayer.roomCode) {
        const url = `${location.origin}${location.pathname}?room=${multiplayer.roomCode}`;
        try { navigator.clipboard.writeText(url); } catch (_) {}
        this.copied = true;
        this.copiedTimer = 2;
      } else if (this.hitRect(x, y, this.startBtnRect) && multiplayer.connected) {
        this.done = true;
        this.result = 'host';
      }
    } else if (this.mode === 'connecting' || this.mode === 'joined') {
      if (this.hitRect(x, y, this.backBtnRect)) {
        multiplayer.destroy();
        this.mode = 'menu';
      } else if (this.mode === 'joined' && this.hitRect(x, y, this.startBtnRect)) {
        this.done = true;
        this.result = 'client';
      }
    }
  }

  handleKey(key) {
    if (this.mode === 'joining') {
      if (key >= '0' && key <= '9' && this.joinCode.length < 5) {
        this.joinCode += key;
      } else if (key === 'Backspace' && this.joinCode.length > 0) {
        this.joinCode = this.joinCode.slice(0, -1);
      } else if (key === 'Enter' && this.joinCode.length === 5) {
        multiplayer.joinRoom(this.joinCode);
        this.mode = 'connecting';
      }
    }
  }

  hitRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  update(dt) {
    this.cursorBlink += dt;
    if (this.copiedTimer > 0) { this.copiedTimer -= dt; if (this.copiedTimer <= 0) this.copied = false; }
    if (this.mode === 'connecting' && multiplayer.connected) {
      this.mode = 'joined';
    }
  }

  render(ctx, w, h) {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    ctx.font = 'bold 28px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#aa88ff';
    ctx.fillText('MULTIPLAYER', w / 2, h * 0.12);

    if (this.mode === 'menu') this.renderMenu(ctx, w, h);
    else if (this.mode === 'joining') this.renderJoin(ctx, w, h);
    else if (this.mode === 'hosting') this.renderHost(ctx, w, h);
    else if (this.mode === 'connecting') this.renderConnecting(ctx, w, h);
    else if (this.mode === 'joined') this.renderJoined(ctx, w, h);

    if (multiplayer.error) {
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#ff4444';
      ctx.fillText(multiplayer.error, w / 2, h * 0.92);
    }

    ctx.textAlign = 'left';
  }

  renderMenu(ctx, w, h) {
    const bw = 220, bh = 50, cx = w / 2;
    this.drawBtn(ctx, cx, h * 0.35, bw, bh, 'Create Room', '#3b82f6', this.createBtnRect);
    this.drawBtn(ctx, cx, h * 0.50, bw, bh, 'Join Room', '#6366f1', this.joinBtnRect);
    this.drawBtn(ctx, cx, h * 0.65, bw, bh, 'Play Solo', '#555', this.soloRect);
  }

  renderJoin(ctx, w, h) {
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText('Enter 5-digit room code:', w / 2, h * 0.25);

    const codeW = 220, codeH = 50;
    const cx = w / 2 - codeW / 2, cy = h * 0.30;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(cx, cy, codeW, codeH, 10);
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = '#ffffff';
    const display = this.joinCode + (this.cursorBlink % 1 < 0.5 ? '|' : '');
    ctx.fillText(display, w / 2, cy + 35);

    this.renderNumpad(ctx, w, h * 0.48);

    const ready = this.joinCode.length === 5;
    this.drawBtn(ctx, w / 2, h * 0.85, 180, 44, 'Connect', ready ? '#22cc44' : '#333', this.confirmBtnRect);
    this.drawBtn(ctx, w / 2 - 120, h * 0.12, 80, 36, '← Back', '#444', this.backBtnRect);
  }

  renderNumpad(ctx, w, startY) {
    const btnW = 56, btnH = 46, gap = 8;
    const cols = 5;
    const totalW = cols * btnW + (cols - 1) * gap;
    const startX = w / 2 - totalW / 2;

    for (let i = 0; i < 10; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = startX + col * (btnW + gap);
      const by = startY + row * (btnH + gap);
      this.numRects[i] = { x: bx, y: by, w: btnW, h: btnH };

      ctx.fillStyle = '#2a2a4e';
      ctx.beginPath();
      ctx.roundRect(bx, by, btnW, btnH, 8);
      ctx.fill();
      ctx.strokeStyle = '#5566aa';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = 'bold 22px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#ddd';
      ctx.fillText(String(i), bx + btnW / 2, by + btnH / 2 + 8);
    }

    const delX = startX + totalW + gap;
    const delY = startY;
    this.delRect = { x: delX, y: delY, w: btnW, h: btnH };
    ctx.fillStyle = '#442222';
    ctx.beginPath();
    ctx.roundRect(delX, delY, btnW, btnH, 8);
    ctx.fill();
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ff6666';
    ctx.fillText('DEL', delX + btnW / 2, delY + btnH / 2 + 6);
  }

  renderHost(ctx, w, h) {
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText('Share this code with your friends:', w / 2, h * 0.28);

    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#44ff88';
    ctx.fillText(multiplayer.roomCode || '...', w / 2, h * 0.42);

    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#8888aa';
    const count = multiplayer.playerCount;
    ctx.fillText(count + ' player' + (count > 1 ? 's' : '') + ' in room', w / 2, h * 0.52);

    if (multiplayer.connecting) {
      ctx.fillStyle = '#ffaa44';
      ctx.fillText('Setting up room...', w / 2, h * 0.60);
    } else if (multiplayer.connected) {
      ctx.fillStyle = '#44ff88';
      ctx.fillText('Room ready!', w / 2, h * 0.60);
    }

    // Share link
    if (multiplayer.roomCode) {
      const url = `${location.origin}${location.pathname}?room=${multiplayer.roomCode}`;
      ctx.font = '11px monospace';
      ctx.fillStyle = '#6666aa';
      ctx.fillText(url, w / 2, h * 0.64);
      this.drawBtn(ctx, w / 2, h * 0.69, 140, 36, this.copied ? 'Copied!' : 'Copy Link', this.copied ? '#22aa44' : '#4466aa', this.copyRect);
    }

    const canStart = multiplayer.connected && !multiplayer.connecting;
    this.drawBtn(ctx, w / 2, h * 0.78, 180, 50, 'START GAME', canStart ? '#22cc44' : '#333', this.startBtnRect);
    this.drawBtn(ctx, w / 2 - 120, h * 0.12, 80, 36, '← Back', '#444', this.backBtnRect);
  }

  renderConnecting(ctx, w, h) {
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    if (multiplayer.error) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText(multiplayer.error, w / 2, h * 0.42);
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aaaacc';
      ctx.fillText('Tap back and try again', w / 2, h * 0.50);
    } else {
      ctx.fillStyle = '#ffaa44';
      ctx.fillText('Connecting to room ' + this.joinCode + '...', w / 2, h * 0.45);
    }
    this.drawBtn(ctx, w / 2 - 120, h * 0.12, 80, 36, '← Back', '#444', this.backBtnRect);
  }

  renderJoined(ctx, w, h) {
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#44ff88';
    ctx.fillText('Connected to room ' + multiplayer.roomCode, w / 2, h * 0.38);

    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#aaaacc';
    ctx.fillText('Waiting for host to start...', w / 2, h * 0.48);

    this.drawBtn(ctx, w / 2 - 120, h * 0.12, 80, 36, '← Back', '#444', this.backBtnRect);
  }

  drawBtn(ctx, cx, cy, bw, bh, text, color, rect) {
    const bx = cx - bw / 2;
    const by = cy - bh / 2;
    rect.x = bx;
    rect.y = by;
    rect.w = bw;
    rect.h = bh;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 10);
    ctx.fill();
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, cx, cy + 6);
  }
}
