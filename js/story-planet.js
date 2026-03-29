import { CharacterSheet } from './story-char.js';

const FADE_SPEED = 1.5;

export class StoryPlanet {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.done = false;
    this.phase = 'char';
    this.charSheet = new CharacterSheet(screenW, screenH);
    this.playerName = '';
    this.playerClass = null;

    this.dialogueText = '';
    this.dialogueQueue = [];
    this.typedText = '';
    this.typeTimer = 0;
    this.typeIndex = 0;
    this.typing = false;
    this.speaker = '';
    this.portrait = '';

    this.choices = [];
    this.choiceRects = [];
    this.choiceCallback = null;

    this.fadeAlpha = 0;
    this.fadeDir = 0;
    this.fadeCallback = null;

    this.timer = 0;
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({ x: Math.random() * screenW, y: Math.random() * screenH, r: Math.random() * 1.5 + 0.5, a: Math.random() * 0.5 + 0.2 });
    }

    this.shipX = 0; this.shipY = 0; this.shipAngle = 0;
    this.shipFlying = false; this.shipSpeed = 200;
    this.aliens = [];
    this.floatingInSpace = false;
    this.spaceTimer = 0;
    this.spoken = new Set();
    this.voiceIndex = 0;
  }

  speak(text, pitch, rate, vol) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch; u.rate = rate; u.volume = vol || 1;
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  npcVoice(text) {
    const moods = [
      { pitch: 0.2, rate: 0.5 },
      { pitch: 0.4, rate: 0.65 },
      { pitch: 0.1, rate: 0.4 },
      { pitch: 0.6, rate: 0.8 },
      { pitch: 0.15, rate: 0.55 },
      { pitch: 0.5, rate: 0.9 },
      { pitch: 0.05, rate: 0.35 },
      { pitch: 0.35, rate: 0.7 },
    ];
    if (/shh/i.test(text)) return { pitch: 0.05, rate: 0.3 };
    if (/\?$/.test(text)) return { pitch: 0.5, rate: 0.75 };
    if (/!$/.test(text)) return { pitch: 0.6, rate: 0.9 };
    if (/long time/i.test(text)) return { pitch: 0.1, rate: 0.35 };
    if (/bold/i.test(text)) return { pitch: 0.4, rate: 0.6 };
    if (/smart/i.test(text)) return { pitch: 0.45, rate: 0.7 };
    if (/game over/i.test(text)) return { pitch: 0.15, rate: 0.45 };
    if (/welcome/i.test(text)) return { pitch: 0.55, rate: 0.8 };
    const m = moods[this.voiceIndex % moods.length];
    this.voiceIndex++;
    return m;
  }

  showDialogue(speaker, text, portrait, callback) {
    this.dialogueText = text;
    this.typedText = '';
    this.typeIndex = 0;
    this.typing = true;
    this.speaker = speaker;
    this.portrait = portrait || '';
    this.choices = [];
    this.choiceCallback = callback || null;
    if (!this.spoken.has(text)) {
      this.spoken.add(text);
      if (speaker === '???') {
        const v = this.npcVoice(text);
        this.speak(text, v.pitch, v.rate);
      } else {
        this.speak(text, 0.8, 0.8);
      }
    }
  }

  showChoices(options, callback) {
    this.choices = options;
    this.choiceCallback = callback;
  }

  fadeOut(callback) {
    this.fadeDir = 1;
    this.fadeCallback = callback;
  }

  fadeIn(callback) {
    this.fadeAlpha = 1;
    this.fadeDir = -1;
    this.fadeCallback = callback;
  }

  handleTap(x, y) {
    if (this.phase === 'char') {
      this.charSheet.handleTap(x, y);
      return;
    }

    if (this.typing) { this.typedText = this.dialogueText; this.typing = false; return; }

    if (this.choices.length > 0) {
      for (let i = 0; i < this.choiceRects.length; i++) {
        const r = this.choiceRects[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          const cb = this.choiceCallback;
          const choice = this.choices[i];
          this.choices = [];
          this.choiceCallback = null;
          if (cb) cb(choice, i);
          return;
        }
      }
      return;
    }

    if (this.choiceCallback) {
      const cb = this.choiceCallback;
      this.choiceCallback = null;
      cb();
    }
  }

  handleKey(key) {
    if (this.phase === 'char') return this.charSheet.handleKey(key);
    return false;
  }

  startStory() {
    this.phase = 'meet';
    this.showDialogue('???', 'Hey you... want to play a game?', 'mysterious', () => {
      this.showChoices(['Ya!', 'No...'], (choice, idx) => {
        if (idx === 1) {
          this.showDialogue('You', '*walks away*', '', () => { this.done = true; });
        } else {
          this.fadeOut(() => {
            this.phase = 'intro';
            this.fadeIn(() => {
              this.showDialogue('???', 'It started a long time ago...', 'mysterious', () => {
                this.showDialogue('You', 'What...?', '', () => {
                  this.showDialogue('???', 'Shhhh... ok lets start.', 'mysterious', () => {
                    this.showDialogue('???', 'You\'re in a spaceship. Aliens are everywhere. You need to find them.', 'mysterious', () => {
                      this.phase = 'ship';
                      this.shipX = this.screenW / 2;
                      this.shipY = this.screenH * 0.6;
                      this.shipFlying = true;
                      this.spawnAliens();
                      this.showDialogue('???', 'Do you want to get out of your ship... or keep flying?', 'mysterious', () => {
                        this.showChoices(['Keep flying', 'Get out!'], (c, i) => {
                          if (i === 0) {
                            this.showDialogue('???', 'Smart. The void is no place to walk. Fly on, ' + this.playerName + '.', 'mysterious', () => {
                              this.phase = 'flying';
                            });
                          } else {
                            this.showDialogue('You', '*jumps out of ship*', '', () => {
                              this.shipFlying = false;
                              this.floatingInSpace = true;
                              this.showDialogue('???', 'Bold move, ' + this.playerName + '. Very bold. You\'re floating in space now.', 'mysterious', () => {
                                this.phase = 'floating';
                              });
                            });
                          }
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        }
      });
    });
  }

  spawnAliens() {
    for (let i = 0; i < 6; i++) {
      this.aliens.push({
        x: Math.random() * this.screenW, y: Math.random() * this.screenH * 0.5,
        vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 20,
        r: 8 + Math.random() * 6, color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        eyeSize: 2 + Math.random() * 2,
      });
    }
  }

  update(dt) {
    this.timer += dt;

    if (this.fadeDir !== 0) {
      this.fadeAlpha += this.fadeDir * FADE_SPEED * dt;
      if (this.fadeAlpha >= 1) { this.fadeAlpha = 1; this.fadeDir = 0; if (this.fadeCallback) { const cb = this.fadeCallback; this.fadeCallback = null; cb(); } }
      if (this.fadeAlpha <= 0) { this.fadeAlpha = 0; this.fadeDir = 0; if (this.fadeCallback) { const cb = this.fadeCallback; this.fadeCallback = null; cb(); } }
    }

    if (this.typing) {
      this.typeTimer += dt;
      if (this.typeTimer > 0.03) {
        this.typeTimer = 0;
        this.typeIndex++;
        this.typedText = this.dialogueText.slice(0, this.typeIndex);
        if (this.typeIndex >= this.dialogueText.length) this.typing = false;
      }
    }

    if (this.phase === 'char') {
      if (this.charSheet.done) {
        this.playerName = this.charSheet.name;
        this.playerClass = this.charSheet.selectedClass;
        this.startStory();
      }
    }

    for (const a of this.aliens) {
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.x < 0 || a.x > this.screenW) a.vx *= -1;
      if (a.y < 0 || a.y > this.screenH * 0.5) a.vy *= -1;
    }

    if (this.phase === 'flying') {
      this.spaceTimer += dt;
      this.shipY -= this.shipSpeed * dt * 0.3;
      this.shipX += Math.sin(this.timer * 0.5) * 30 * dt;
      if (this.spaceTimer > 5) {
        this.showDialogue('???', 'You see something ahead... what do you do?', 'mysterious', () => {
          this.showChoices(['Approach it', 'Turn around'], (c, i) => {
            if (i === 0) {
              this.showDialogue('???', 'Brave. Very brave, ' + this.playerName + '. The aliens welcome you.', 'mysterious', () => {
                this.showDialogue('???', 'Game over. You won.', 'mysterious', () => { this.done = true; });
              });
            } else {
              this.showDialogue('???', 'Perhaps another time then...', 'mysterious', () => { this.done = true; });
            }
          });
        });
        this.phase = 'flying-wait';
      }
    }

    if (this.phase === 'floating') {
      this.spaceTimer += dt;
      if (this.spaceTimer > 4) {
        this.showDialogue('???', 'An alien ship approaches... they see you floating.', 'mysterious', () => {
          this.showChoices(['Wave at them', 'Play dead'], (c, i) => {
            if (i === 0) {
              this.showDialogue('???', 'They pick you up! You made alien friends, ' + this.playerName + '!', 'mysterious', () => {
                this.showDialogue('???', 'Game over. You won.', 'mysterious', () => { this.done = true; });
              });
            } else {
              this.showDialogue('???', 'They think you\'re space junk... and fly away. You\'re alone.', 'mysterious', () => {
                this.showDialogue('???', 'Game over. Maybe next time.', 'mysterious', () => { this.done = true; });
              });
            }
          });
        });
        this.phase = 'floating-wait';
      }
    }
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;

    if (this.phase === 'char') {
      this.charSheet.render(ctx);
      return;
    }

    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, w, h);

    for (const s of this.stars) {
      ctx.beginPath();
      ctx.arc(s.x, (s.y + this.timer * 10 * s.a) % h, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }

    if (this.phase === 'meet') this.renderMeet(ctx, w, h);
    if (this.phase === 'intro') this.renderIntro(ctx, w, h);
    if (this.phase === 'ship' || this.phase === 'flying' || this.phase === 'flying-wait') this.renderShip(ctx, w, h);
    if (this.floatingInSpace) this.renderFloating(ctx, w, h);

    for (const a of this.aliens) {
      if (this.phase !== 'ship' && this.phase !== 'flying' && this.phase !== 'flying-wait' && this.phase !== 'floating' && this.phase !== 'floating-wait') continue;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = a.color;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(a.x - a.r * 0.3, a.y - 2, a.eyeSize, 0, Math.PI * 2);
      ctx.arc(a.x + a.r * 0.3, a.y - 2, a.eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(a.x - a.r * 0.3, a.y - 2, a.eyeSize * 0.5, 0, Math.PI * 2);
      ctx.arc(a.x + a.r * 0.3, a.y - 2, a.eyeSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    this.renderDialogue(ctx, w, h);

    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  renderMeet(ctx, w, h) {
    const mx = w * 0.5, my = h * 0.35;
    ctx.save();
    ctx.translate(mx, my);
    const bob = Math.sin(this.timer * 2) * 5;
    ctx.translate(0, bob);
    ctx.beginPath();
    ctx.arc(0, -20, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#2a1a3a';
    ctx.fill();
    ctx.fillStyle = '#440066';
    ctx.beginPath();
    ctx.moveTo(-20, -8); ctx.lineTo(-30, 40); ctx.lineTo(0, 35); ctx.lineTo(30, 40); ctx.lineTo(20, -8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -20, 25, -2.8, -0.3);
    ctx.strokeStyle = '#660088';
    ctx.lineWidth = 4;
    ctx.stroke();
    const eyeGlow = ctx.createRadialGradient(-7, -22, 1, -7, -22, 8);
    eyeGlow.addColorStop(0, '#ff00ff');
    eyeGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeGlow;
    ctx.fillRect(-15, -30, 16, 16);
    const eyeGlow2 = ctx.createRadialGradient(7, -22, 1, 7, -22, 8);
    eyeGlow2.addColorStop(0, '#ff00ff');
    eyeGlow2.addColorStop(1, 'transparent');
    ctx.fillStyle = eyeGlow2;
    ctx.fillRect(-1, -30, 16, 16);
    ctx.fillStyle = '#ff00ff';
    ctx.beginPath();
    ctx.arc(-7, -22, 3, 0, Math.PI * 2);
    ctx.arc(7, -22, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#aa00aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -12, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.font = '11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8866aa';
    ctx.fillText('???', 0, 58);
    ctx.restore();
  }

  renderIntro(ctx, w, h) {
    ctx.globalAlpha = 0.3 + Math.sin(this.timer) * 0.15;
    const nebula = ctx.createRadialGradient(w * 0.4, h * 0.35, 20, w * 0.4, h * 0.35, 200);
    nebula.addColorStop(0, '#330066');
    nebula.addColorStop(0.5, '#110033');
    nebula.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, w, h);
    const nebula2 = ctx.createRadialGradient(w * 0.7, h * 0.5, 10, w * 0.7, h * 0.5, 150);
    nebula2.addColorStop(0, '#003366');
    nebula2.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula2;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  renderShip(ctx, w, h) {
    ctx.save();
    ctx.translate(this.shipX, this.shipY);
    ctx.rotate(Math.sin(this.timer) * 0.05);
    const tg = ctx.createRadialGradient(0, 16, 2, 0, 16, 16);
    tg.addColorStop(0, `rgba(${this.playerClass.color.slice(1).match(/../g).map(h => parseInt(h, 16)).join(',')},0.8)`);
    tg.addColorStop(1, 'transparent');
    ctx.fillStyle = tg;
    ctx.beginPath(); ctx.arc(0, 16, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(-14, 16); ctx.lineTo(-6, 10); ctx.lineTo(0, 14); ctx.lineTo(6, 10); ctx.lineTo(14, 16);
    ctx.closePath();
    const sg = ctx.createLinearGradient(0, -20, 0, 16);
    sg.addColorStop(0, this.playerClass.color);
    sg.addColorStop(1, '#222');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = this.playerClass.color + '88';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -5, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#aaeeff';
    ctx.fill();
    ctx.restore();
  }

  renderFloating(ctx, w, h) {
    const px = this.shipX + Math.sin(this.timer * 0.8) * 20;
    const py = this.shipY + Math.cos(this.timer * 0.6) * 15;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.sin(this.timer * 0.3) * 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    const pg = ctx.createRadialGradient(-2, -2, 2, 0, 0, 12);
    pg.addColorStop(0, this.playerClass.color);
    pg.addColorStop(1, '#222');
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.beginPath(); ctx.arc(0, -3, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#aaeeff';
    ctx.fill();
    ctx.restore();
    ctx.font = '10px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.playerClass.color;
    ctx.fillText(this.playerName, px, py + 22);
    ctx.textAlign = 'left';
  }

  renderDialogue(ctx, w, h) {
    if (!this.typedText && this.choices.length === 0) return;
    const boxH = 120;
    const boxY = h - boxH - 20;
    ctx.fillStyle = 'rgba(5, 2, 15, 0.92)';
    ctx.beginPath();
    ctx.roundRect(16, boxY, w - 32, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = '#6644aa';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (this.portrait === 'mysterious') {
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(50, boxY + 35, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a3a';
      ctx.beginPath();
      ctx.arc(50, boxY + 35, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(45, boxY + 33, 3, 0, Math.PI * 2);
      ctx.arc(55, boxY + 33, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const textX = this.portrait ? 80 : 30;
    ctx.font = 'bold 13px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = this.speaker === '???' ? '#cc66ff' : '#88aaff';
    ctx.textAlign = 'left';
    ctx.fillText(this.speaker, textX, boxY + 22);
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#ddd';
    const maxW = w - textX - 40;
    this.wrapText(ctx, this.typedText, textX, boxY + 42, maxW, 18);

    if (this.choices.length > 0 && !this.typing) {
      this.choiceRects = [];
      const cw = Math.min(200, w / 2 - 30), ch = 40;
      const startX = w / 2 - (this.choices.length * (cw + 10)) / 2;
      const cy = boxY - ch - 12;
      for (let i = 0; i < this.choices.length; i++) {
        const cx = startX + i * (cw + 10);
        this.choiceRects.push({ x: cx, y: cy, w: cw, h: ch });
        ctx.fillStyle = i === 0 ? '#2244aa' : '#662244';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cw, ch, 8);
        ctx.fill();
        ctx.strokeStyle = i === 0 ? '#4488ff' : '#aa4488';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = 'bold 15px -apple-system, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText(this.choices[i], cx + cw / 2, cy + ch / 2 + 5);
      }
      ctx.textAlign = 'left';
    } else if (!this.typing && this.choiceCallback) {
      ctx.font = '12px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillStyle = `rgba(150,150,180,${0.5 + Math.sin(this.timer * 3) * 0.3})`;
      ctx.fillText('Tap to continue ▶', w - 30, boxY + boxH - 10);
      ctx.textAlign = 'left';
    }
  }

  wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let ly = y;
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, ly);
        line = word + ' ';
        ly += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, ly);
  }
}
