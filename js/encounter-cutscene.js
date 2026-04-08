import { speak as speakV } from './voices.js';

export const DIALOGUES = {
  intro: [
    { speaker: 'enemy', text: 'Who are you?!', color: '#ff4444', delay: 0 },
    { speaker: 'player', text: "I'm Batman.", color: '#66ccff', delay: 2.5 },
  ],
  joker: [
    { speaker: 'player', text: "I'm Batman still!", color: '#66ccff', delay: 0 },
    { speaker: 'enemy', text: "I'm Joker!", color: '#44ff44', delay: 2.5 },
  ],
  cooking: [
    { speaker: 'player', text: "I'm cooking!", color: '#ffaa44', delay: 0 },
    { speaker: 'enemy', text: 'Stop the cap!', color: '#ff4444', delay: 2.5 },
  ],
};

export class EncounterCutscene {
  constructor(screenW, screenH, dialogueKey = 'intro') {
    this.screenW = screenW;
    this.screenH = screenH;
    this.lines = DIALOGUES[dialogueKey] || DIALOGUES.intro;
    this.isJoker = dialogueKey === 'joker';
    this.timer = 0;
    this.done = false;
    this.lineIndex = 0;
    this.lineTimer = 0;
    this.spokeLines = this.lines.map(() => false);
    this.fadeIn = 0;
    this.fadeOut = 0;
  }

  speak(text, pitch, rate) {
    // Pitch < 0.5 = batman; pitch > 1.0 = excited (joker-ish); else villain
    if (pitch < 0.4) speakV(text, 'batman');
    else if (pitch > 1.0) speakV(text, 'joker');
    else speakV(text, 'villain');
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;
    this.fadeIn = Math.min(1, this.timer / 0.5);

    // Show lines based on timing
    for (let i = 0; i < this.lines.length; i++) {
      if (this.timer > this.lines[i].delay && !this.spokeLines[i]) {
        this.spokeLines[i] = true;
        this.lineIndex = i;
        this.lineTimer = 0;
        const line = this.lines[i];
        if (line.speaker === 'enemy') {
          this.speak(line.text, 1.2, 1.0);
        } else {
          this.speak(line.text, 0.1, 0.6);
        }
      }
    }
    this.lineTimer += dt;

    // End after last line
    if (this.timer > 5) {
      this.fadeOut = Math.min(1, (this.timer - 5) / 0.5);
    }
    if (this.timer > 5.5) {
      this.done = true;
    }
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;

    // Cinematic bars + darken
    ctx.globalAlpha = this.fadeIn * (1 - this.fadeOut);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);

    // Cinematic letterbox bars
    const barH = h * 0.12;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, barH);
    ctx.fillRect(0, h - barH, w, barH);

    // Enemy on left
    const ex = w * 0.25, ey = h * 0.5;
    if (this.isJoker) {
      // Joker - green hair, white face, red smile
      ctx.beginPath();
      ctx.arc(ex, ey, 35, 0, Math.PI * 2);
      ctx.fillStyle = '#eeddcc';
      ctx.fill();
      // Green hair
      ctx.beginPath();
      ctx.arc(ex, ey - 15, 30, Math.PI + 0.3, -0.3);
      ctx.fillStyle = '#22cc44';
      ctx.fill();
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex - 10, ey - 4, 6, 0, Math.PI * 2);
      ctx.arc(ex + 10, ey - 4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(ex - 10, ey - 4, 3, 0, Math.PI * 2);
      ctx.arc(ex + 10, ey - 4, 3, 0, Math.PI * 2);
      ctx.fill();
      // Red smile
      ctx.strokeStyle = '#ff2222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ex, ey + 6, 14, 0.2, Math.PI - 0.2);
      ctx.stroke();
      // Suit
      ctx.fillStyle = '#6622aa';
      ctx.fillRect(ex - 25, ey + 30, 50, 20);
    } else {
      // Regular enemy
      ctx.beginPath();
      ctx.arc(ex, ey, 35, 0, Math.PI * 2);
      ctx.fillStyle = '#ff4444';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ex - 10, ey - 6, 6, 0, Math.PI * 2);
      ctx.arc(ex + 10, ey - 6, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(ex - 8, ey - 6, 3, 0, Math.PI * 2);
      ctx.arc(ex + 12, ey - 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ex, ey + 8, 10, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }

    // Player on right
    const px = w * 0.75, py = h * 0.5;
    ctx.beginPath();
    ctx.arc(px, py, 30, 0, Math.PI * 2);
    const pg = ctx.createRadialGradient(px - 5, py - 5, 3, px, py, 30);
    pg.addColorStop(0, '#66ccff');
    pg.addColorStop(1, '#2255aa');
    ctx.fillStyle = pg;
    ctx.fill();
    // Visor
    ctx.beginPath();
    ctx.arc(px, py - 6, 10, 0, Math.PI * 2);
    ctx.fillStyle = '#aaeeff';
    ctx.fill();
    // Cape hint (batman!)
    ctx.fillStyle = '#223';
    ctx.beginPath();
    ctx.moveTo(px - 25, py + 10);
    ctx.lineTo(px - 35, py + 45);
    ctx.lineTo(px - 15, py + 35);
    ctx.lineTo(px, py + 45);
    ctx.lineTo(px + 15, py + 35);
    ctx.lineTo(px + 35, py + 45);
    ctx.lineTo(px + 25, py + 10);
    ctx.closePath();
    ctx.fill();

    // Speech bubbles
    for (let i = 0; i <= this.lineIndex; i++) {
      if (!this.spokeLines[i]) continue;
      const line = this.lines[i];
      const isEnemy = line.speaker === 'enemy';
      const bx = isEnemy ? ex + 50 : px - 50;
      const by = (isEnemy ? ey : py) - 60;
      const tw = ctx.measureText ? 14 * line.text.length * 0.55 : 120;
      const bw = Math.max(80, tw + 20);

      // Bubble
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.roundRect(bx - (isEnemy ? 10 : bw - 10), by - 16, bw, 34, 10);
      ctx.fill();

      // Tail
      ctx.beginPath();
      if (isEnemy) {
        ctx.moveTo(bx, by + 18);
        ctx.lineTo(bx - 15, by + 30);
        ctx.lineTo(bx + 10, by + 18);
      } else {
        ctx.moveTo(bx - 5, by + 18);
        ctx.lineTo(bx + 10, by + 30);
        ctx.lineTo(bx - 15, by + 18);
      }
      ctx.fill();

      // Text
      ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
      ctx.textAlign = isEnemy ? 'left' : 'right';
      ctx.fillStyle = line.color;
      const tx = isEnemy ? bx - 5 : bx + 5;
      ctx.fillText(line.text, tx, by + 5);
    }

    ctx.textAlign = 'left';

    // Skip hint
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(150,150,170,0.6)';
    ctx.fillText('Tap to skip', w / 2, h - barH / 2 + 4);
    ctx.textAlign = 'left';

    ctx.globalAlpha = 1;
  }
}
