import { multiplayer } from './multiplayer.js';

const KB_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

export class DMTools {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.storyText = '';
    this.choice1 = '';
    this.choice2 = '';
    this.editing = 'story';
    this.sent = false;
    this.sentTimer = 0;
    this.playerChoices = new Map();
    this.playerSheets = new Map();

    this.sendRect = { x: 0, y: 0, w: 0, h: 0 };
    this.storyRect = { x: 0, y: 0, w: 0, h: 0 };
    this.c1Rect = { x: 0, y: 0, w: 0, h: 0 };
    this.c2Rect = { x: 0, y: 0, w: 0, h: 0 };
    this.keyRects = [];
    this.spaceRect = { x: 0, y: 0, w: 0, h: 0 };
    this.delRect = { x: 0, y: 0, w: 0, h: 0 };
    this.shiftOn = false;
    this.shiftRect = { x: 0, y: 0, w: 0, h: 0 };
  }

  sendStory() {
    if (!this.storyText) return;
    const data = {
      action: 'dm-story',
      text: this.storyText,
      choice1: this.choice1 || null,
      choice2: this.choice2 || null,
    };
    multiplayer.broadcastHostState(data);
    this.sent = true;
    this.sentTimer = 2;
    this.playerChoices.clear();
  }

  receiveChoice(peerId, choiceIdx) {
    this.playerChoices.set(peerId, choiceIdx);
  }

  receiveSheet(peerId, sheet) {
    this.playerSheets.set(peerId, sheet);
  }

  handleTap(x, y) {
    if (this.hitR(x, y, this.storyRect)) { this.editing = 'story'; return true; }
    if (this.hitR(x, y, this.c1Rect)) { this.editing = 'c1'; return true; }
    if (this.hitR(x, y, this.c2Rect)) { this.editing = 'c2'; return true; }
    if (this.hitR(x, y, this.sendRect)) { this.sendStory(); return true; }

    for (let i = 0; i < this.keyRects.length; i++) {
      const r = this.keyRects[i];
      if (this.hitR(x, y, r)) {
        const ch = this.shiftOn ? r.key.toUpperCase() : r.key;
        this.typeChar(ch);
        this.shiftOn = false;
        return true;
      }
    }
    if (this.hitR(x, y, this.spaceRect)) { this.typeChar(' '); return true; }
    if (this.hitR(x, y, this.delRect)) { this.deleteChar(); return true; }
    if (this.hitR(x, y, this.shiftRect)) { this.shiftOn = !this.shiftOn; return true; }
    return true;
  }

  handleKey(key) {
    if (key === 'Tab') {
      if (this.editing === 'story') this.editing = 'c1';
      else if (this.editing === 'c1') this.editing = 'c2';
      else this.editing = 'story';
      return true;
    }
    if (key === 'Enter' && this.editing === 'story') { this.sendStory(); return true; }
    if (key === 'Backspace') { this.deleteChar(); return true; }
    if (key.length === 1) { this.typeChar(key); return true; }
    return false;
  }

  typeChar(ch) {
    if (this.editing === 'story' && this.storyText.length < 200) this.storyText += ch;
    else if (this.editing === 'c1' && this.choice1.length < 40) this.choice1 += ch;
    else if (this.editing === 'c2' && this.choice2.length < 40) this.choice2 += ch;
  }

  deleteChar() {
    if (this.editing === 'story') this.storyText = this.storyText.slice(0, -1);
    else if (this.editing === 'c1') this.choice1 = this.choice1.slice(0, -1);
    else if (this.editing === 'c2') this.choice2 = this.choice2.slice(0, -1);
  }

  hitR(x, y, r) { return r.w > 0 && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }

  update(dt) {
    if (this.sentTimer > 0) { this.sentTimer -= dt; if (this.sentTimer <= 0) this.sent = false; }
  }

  render(ctx, w, h) {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    ctx.font = 'bold 20px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff88ff';
    ctx.fillText('DUNGEON MASTER', w / 2, 28);

    // Player sheets
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#888';
    let py = 42;
    for (const [pid, sheet] of this.playerSheets) {
      ctx.fillStyle = sheet.color || '#aaa';
      ctx.fillText(`${sheet.name} — ${sheet.className} (HP:${sheet.hp})`, 16, py);
      py += 14;
    }

    // Story text box
    const stY = Math.max(py + 8, 70);
    this.renderField(ctx, 'Story text:', this.storyText, 12, stY, w - 24, 60, this.editing === 'story', this.storyRect);
    this.renderField(ctx, 'Choice 1 (optional):', this.choice1, 12, stY + 80, w / 2 - 18, 32, this.editing === 'c1', this.c1Rect);
    this.renderField(ctx, 'Choice 2 (optional):', this.choice2, w / 2 + 6, stY + 80, w / 2 - 18, 32, this.editing === 'c2', this.c2Rect);

    // Send button
    const sbw = 160, sbh = 40;
    const sbx = w / 2 - sbw / 2, sby = stY + 126;
    this.sendRect = { x: sbx, y: sby, w: sbw, h: sbh };
    ctx.fillStyle = this.sent ? '#22aa44' : (this.storyText ? '#3b82f6' : '#333');
    ctx.beginPath(); ctx.roundRect(sbx, sby, sbw, sbh, 8); ctx.fill();
    ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(this.sent ? 'Sent!' : 'Send to Players', sbx + sbw / 2, sby + sbh / 2 + 6);

    // Player responses
    if (this.playerChoices.size > 0) {
      let ry = sby + sbh + 16;
      ctx.font = '13px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#aa88ff';
      ctx.fillText('Responses:', w / 2, ry);
      ry += 18;
      for (const [pid, idx] of this.playerChoices) {
        const sheet = this.playerSheets.get(pid);
        const name = sheet ? sheet.name : 'Player';
        const choice = idx === 0 ? (this.choice1 || 'Choice 1') : (this.choice2 || 'Choice 2');
        ctx.fillStyle = '#ddd';
        ctx.fillText(`${name} chose: "${choice}"`, w / 2, ry);
        ry += 16;
      }
    }

    // Keyboard
    this.renderKeyboard(ctx, 8, w - 16, h * 0.58);
    ctx.textAlign = 'left';
  }

  renderField(ctx, label, text, x, y, fw, fh, active, rect) {
    rect.x = x; rect.y = y; rect.w = fw; rect.h = fh + 16;
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#888';
    ctx.fillText(label, x + 4, y);
    ctx.fillStyle = active ? '#1a1a3e' : '#111122';
    ctx.beginPath(); ctx.roundRect(x, y + 4, fw, fh, 6); ctx.fill();
    ctx.strokeStyle = active ? '#6644aa' : '#333';
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = text ? '#ddd' : '#555';
    const display = text || (active ? '' : 'Tap to type...');
    const maxChars = Math.floor(fw / 7);
    const lines = [];
    for (let i = 0; i < display.length; i += maxChars) lines.push(display.slice(i, i + maxChars));
    if (lines.length === 0) lines.push(display);
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      ctx.fillText(lines[i], x + 6, y + 20 + i * 16);
    }
  }

  renderKeyboard(ctx, px, pw, startY) {
    this.keyRects = [];
    const gap = 3, kh = 34;
    for (let r = 0; r < KB_ROWS.length; r++) {
      const row = KB_ROWS[r];
      const kw = Math.floor((pw - (row.length - 1) * gap) / row.length);
      const indent = r === 1 ? 10 : r === 2 ? 28 : 0;
      const ky = startY + r * (kh + gap);
      for (let c = 0; c < row.length; c++) {
        const kx = px + indent + c * (kw + gap);
        this.keyRects.push({ x: kx, y: ky, w: kw, h: kh, key: row[c] });
        ctx.fillStyle = '#1a1a33';
        ctx.beginPath(); ctx.roundRect(kx, ky, kw, kh, 5); ctx.fill();
        ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ccc';
        ctx.fillText(this.shiftOn ? row[c].toUpperCase() : row[c], kx + kw / 2, ky + kh / 2 + 6);
      }
      if (r === 2) {
        const shW = 24, shX = px;
        this.shiftRect = { x: shX, y: ky, w: shW, h: kh };
        ctx.fillStyle = this.shiftOn ? '#4444aa' : '#1a1a33';
        ctx.beginPath(); ctx.roundRect(shX, ky, shW, kh, 5); ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = '13px -apple-system, system-ui, sans-serif';
        ctx.fillText('⇧', shX + shW / 2, ky + kh / 2 + 5);
      }
    }
    const spY = startY + 3 * (kh + gap);
    const spW = pw * 0.45;
    const spX = px + pw / 2 - spW / 2;
    this.spaceRect = { x: spX, y: spY, w: spW, h: kh };
    ctx.fillStyle = '#1a1a33';
    ctx.beginPath(); ctx.roundRect(spX, spY, spW, kh, 5); ctx.fill();
    ctx.fillStyle = '#888';
    ctx.font = '13px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('space', spX + spW / 2, spY + kh / 2 + 5);

    const dw = pw * 0.18;
    const dx = spX + spW + 8;
    this.delRect = { x: dx, y: spY, w: dw, h: kh };
    ctx.fillStyle = '#3a2820';
    ctx.beginPath(); ctx.roundRect(dx, spY, dw, kh, 5); ctx.fill();
    ctx.fillStyle = '#ddaa77';
    ctx.fillText('⌫', dx + dw / 2, spY + kh / 2 + 5);
    ctx.textAlign = 'left';
  }
}
