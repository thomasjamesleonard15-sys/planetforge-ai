import {
  renderQTEBackground, renderVillain, renderPlayer,
  renderIntroUI, renderFightUI, renderEndUI, renderSpeechBubble,
} from './qte-renderer.js';

const PHASE_INTRO = 0;
const PHASE_FIGHT = 1;
const PHASE_WIN = 2;
const PHASE_LOSE = 3;

const VILLAIN_LINES = [
  "You dare challenge me?!", "Pathetic!", "Is that all you've got?",
  "I'll crush you!", "You're nothing!", "Feel my power!",
  "Give up already!", "Hahahaha!",
];

const WIN_LINES = ["No... impossible!", "How could I lose to YOU?!"];

export class QTEPlanet {
  constructor(screenW, screenH) {
    this.screenW = screenW;
    this.screenH = screenH;
    this.done = false;
    this.won = false;
    this.phase = PHASE_INTRO;
    this.timer = 0;
    this.fadeIn = 0;
    this.fadeOut = 0;

    this.power = 0;
    this.maxPower = 100;
    this.powerDrain = 18;
    this.powerPerPress = 5;
    this.timeLimit = 12;
    this.fightTimer = 0;

    this.villainHealth = 150;
    this.villainHit = 0;
    this.villainShake = 0;
    this.villainLine = '';
    this.villainLineTimer = 0;
    this.nextTaunt = 2;
    this.tauntIndex = 0;

    this.playerHealth = 80;
    this.playerHit = 0;
    this.playerPunch = 0;
    this.screenShake = 0;
    this.comboCount = 0;
    this.lastPressTime = 0;
    this.yPromptPulse = 0;
    this.nextAttack = 1.0;
    this.attackDamage = 16;
    this.spokeIntro = false;
    this.yButtonRect = { x: 0, y: 0, w: 0, h: 0 };

    this.particles = [];
    for (let i = 0; i < 60; i++) {
      this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0, color: '' });
    }
  }

  speak(text, pitch, rate) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch;
      u.rate = rate;
      u.volume = 1;
      const voices = speechSynthesis.getVoices();
      const v = voices.find(v => /male/i.test(v.name) && !/female/i.test(v.name)) || voices[0];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (_) {}
  }

  pressY() {
    if (this.phase === PHASE_INTRO && this.timer > 1.5) {
      this.phase = PHASE_FIGHT;
      this.fightTimer = 0;
      this.timer = 0;
      return;
    }
    if (this.phase !== PHASE_FIGHT) return;

    this.power = Math.min(this.maxPower, this.power + this.powerPerPress);
    this.playerPunch = 0.2;
    this.comboCount++;
    this.lastPressTime = this.timer;
    this.yPromptPulse = 0.3;

    if (this.power >= this.maxPower * 0.8) {
      const dmg = 4 + Math.floor(this.comboCount / 5);
      this.villainHealth = Math.max(0, this.villainHealth - dmg);
      this.villainHit = 0.25;
      this.villainShake = 6;
      this.screenShake = 4;
      this.emitHitParticles();
    }

    if (this.villainHealth <= 0) {
      this.phase = PHASE_WIN;
      this.won = true;
      this.timer = 0;
      this.fadeOut = 0;
      this.villainLine = WIN_LINES[Math.floor(Math.random() * WIN_LINES.length)];
      this.speak(this.villainLine, 1.5, 0.8);
    }
  }

  handleTap(x, y) {
    const b = this.yButtonRect;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      this.pressY();
    }
  }

  emitHitParticles() {
    const cx = this.screenW * 0.3, cy = this.screenH * 0.45;
    for (const p of this.particles) {
      if (p.life <= 0) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 200;
        p.x = cx + (Math.random() - 0.5) * 20;
        p.y = cy + (Math.random() - 0.5) * 20;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.life = 0.4 + Math.random() * 0.4;
        p.maxLife = p.life;
        p.r = 2 + Math.random() * 4;
        p.color = Math.random() > 0.5 ? '#ff4444' : '#ffaa22';
        break;
      }
    }
  }

  update(dt) {
    if (this.done) return;
    this.timer += dt;

    for (const p of this.particles) {
      if (p.life > 0) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; }
    }

    if (this.villainHit > 0) this.villainHit = Math.max(0, this.villainHit - dt * 4);
    if (this.villainShake > 0) this.villainShake = Math.max(0, this.villainShake - dt * 30);
    if (this.playerHit > 0) this.playerHit = Math.max(0, this.playerHit - dt * 4);
    if (this.playerPunch > 0) this.playerPunch = Math.max(0, this.playerPunch - dt * 4);
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 20);
    if (this.yPromptPulse > 0) this.yPromptPulse = Math.max(0, this.yPromptPulse - dt * 3);

    if (this.phase === PHASE_INTRO) {
      this.fadeIn = Math.min(1, this.timer / 0.5);
      if (!this.spokeIntro && this.timer > 0.5) {
        this.spokeIntro = true;
        this.villainLine = "You dare challenge me?!";
        this.speak(this.villainLine, 0.6, 0.7);
        this.villainLineTimer = 3;
      }
      if (this.villainLineTimer > 0) this.villainLineTimer -= dt;
    }

    if (this.phase === PHASE_FIGHT) {
      this.fadeIn = 1;
      this.fightTimer += dt;
      this.power = Math.max(0, this.power - this.powerDrain * dt);
      if (this.timer - this.lastPressTime > 1.5) this.comboCount = 0;

      this.villainLineTimer -= dt;
      if (this.villainLineTimer <= 0 && this.fightTimer > this.nextTaunt) {
        this.villainLine = VILLAIN_LINES[this.tauntIndex % VILLAIN_LINES.length];
        this.villainLineTimer = 2;
        this.tauntIndex++;
        this.nextTaunt = this.fightTimer + 2 + Math.random() * 2;
        this.speak(this.villainLine, 0.6, 0.8);
      }

      if (this.fightTimer >= this.nextAttack) {
        const blocked = this.power >= this.maxPower * 0.6;
        const dmg = blocked ? Math.floor(this.attackDamage * 0.25) : this.attackDamage;
        this.playerHealth = Math.max(0, this.playerHealth - dmg);
        this.playerHit = 0.3;
        this.screenShake = blocked ? 2 : 6;
        const interval = Math.max(0.6, 1.4 - this.fightTimer * 0.06);
        this.nextAttack = this.fightTimer + interval + Math.random() * 0.5;
        if (this.fightTimer > 5) this.attackDamage = 20;
        if (this.fightTimer > 9) this.attackDamage = 25;
      }

      if (this.playerHealth <= 0) {
        this.phase = PHASE_LOSE;
        this.won = false;
        this.timer = 0;
        this.villainLine = "You are nothing!";
        this.speak(this.villainLine, 0.6, 0.6);
      } else if (this.fightTimer >= this.timeLimit && this.villainHealth > 0) {
        this.phase = PHASE_LOSE;
        this.won = false;
        this.timer = 0;
        this.villainLine = "Too slow! You lose!";
        this.speak(this.villainLine, 0.6, 0.6);
      }
    }

    if (this.phase === PHASE_WIN || this.phase === PHASE_LOSE) {
      if (this.timer > 3) this.fadeOut = Math.min(1, (this.timer - 3) / 0.5);
      if (this.timer > 3.5) this.done = true;
    }
  }

  render(ctx) {
    const w = this.screenW, h = this.screenH;
    const sx = this.screenShake * (Math.random() - 0.5) * 2;
    const sy = this.screenShake * (Math.random() - 0.5) * 2;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.globalAlpha = this.fadeIn * (1 - this.fadeOut);

    renderQTEBackground(ctx, w, h);
    renderVillain(ctx, w, h, this.villainHealth, this.villainHit, this.villainShake);
    renderPlayer(ctx, w, h, this.playerPunch, this.playerHit, this.playerHealth);

    for (const p of this.particles) {
      if (p.life > 0) {
        ctx.globalAlpha = (p.life / p.maxLife) * this.fadeIn * (1 - this.fadeOut);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
    }
    ctx.globalAlpha = this.fadeIn * (1 - this.fadeOut);

    if (this.phase === PHASE_INTRO) renderIntroUI(ctx, w, h, this.timer, this.fadeIn, this.yButtonRect);
    else if (this.phase === PHASE_FIGHT) renderFightUI(ctx, w, h, this);
    else renderEndUI(ctx, w, h, this.phase === PHASE_WIN);

    renderSpeechBubble(ctx, w, h, this.villainLine, this.villainLineTimer);
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
