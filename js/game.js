import { InputHandler } from './input.js';
import { GalaxyView } from './galaxy-view.js';
import { SurfaceView } from './surface-view.js';
import { SpaceView } from './space-view.js';

const STATE = { TITLE: 0, GALAXY: 1, SURFACE: 2, SPACE: 3 };

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.state = STATE.TITLE;
    this.input = new InputHandler(canvas);
    this.galaxy = new GalaxyView();
    this.surface = null;
    this.space = null;
    this.cameFromSpace = false;
    this.width = 0;
    this.height = 0;
    this.lastTime = 0;
    this.stars = null;

    this.input.onTap = (x, y) => this.handleTap(x, y);
    this.input.onDragStart = (_x, _y) => {};
    this.input.onDrag = (x, y) => this.handleDrag(x, y);
    this.input.onDragEnd = () => this.handleDragEnd();
  }

  start() {
    this.state = STATE.GALAXY;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    if (this.surface) this.surface.resize(w, h);
    if (this.space) this.space.resize(w, h);
  }

  handleTap(x, y) {
    if (this.state === STATE.GALAXY) {
      const result = this.galaxy.handleTap(x, y, this.width, this.height);
      if (result === 'enter') this.enterSurface();
      else if (result === 'fly') this.enterSpace();
    } else if (this.state === STATE.SURFACE) {
      if (x >= 12 && x <= 92 && y >= 60 && y <= 96) {
        this.leaveSurface();
        return;
      }
      if (this.surface.gameOver) {
        this.leaveSurface();
        return;
      }
      this.surface.handleTouchStart(x, y);
    } else if (this.state === STATE.SPACE) {
      if (x >= 12 && x <= 92 && y >= 60 && y <= 96) {
        this.state = STATE.GALAXY;
        this.space = null;
        return;
      }
      if (this.space.gameOver) {
        this.state = STATE.GALAXY;
        this.space = null;
        return;
      }
      this.space.handleTouchStart(x, y);
    }
  }

  handleDrag(x, y) {
    if (this.state === STATE.SURFACE) {
      this.surface.handleTouchMove(x, y);
    } else if (this.state === STATE.SPACE) {
      this.space.handleTouchMove(x, y);
    }
  }

  handleDragEnd() {
    if (this.state === STATE.SURFACE) {
      this.surface.handleTouchEnd();
    } else if (this.state === STATE.SPACE) {
      this.space.handleTouchEnd();
    }
  }

  enterSurface() {
    this.cameFromSpace = this.state === STATE.SPACE;
    this.surface = new SurfaceView();
    this.surface.resize(this.width, this.height);
    this.state = STATE.SURFACE;
  }

  leaveSurface() {
    this.surface = null;
    if (this.cameFromSpace && this.space) {
      this.state = STATE.SPACE;
    } else {
      this.state = STATE.GALAXY;
    }
    this.cameFromSpace = false;
  }

  enterSpace() {
    this.space = new SpaceView(this.galaxy.planets);
    this.space.resize(this.width, this.height);
    this.state = STATE.SPACE;
  }

  loop(time) {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    const move = this.input.getMoveVector();
    if (this.state === STATE.GALAXY) {
      this.galaxy.update(dt);
    } else if (this.state === STATE.SURFACE) {
      if (move.x !== 0 || move.y !== 0) {
        this.surface.player.update(dt, move.x, move.y);
      }
      this.surface.update(dt);
    } else if (this.state === STATE.SPACE) {
      this.space.update(dt, move.x, move.y);
      if (this.space.wantLand) {
        this.space.wantLand = false;
        this.enterSurface();
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.state === STATE.GALAXY) {
      this.renderStars(ctx);
      this.galaxy.render(ctx, this.width, this.height);
    } else if (this.state === STATE.SURFACE) {
      this.surface.render(ctx);
      this.renderBackButton(ctx);
    } else if (this.state === STATE.SPACE) {
      this.space.render(ctx);
      this.renderBackButton(ctx);
    }
  }

  renderBackButton(ctx) {
    ctx.fillStyle = 'rgba(20, 20, 40, 0.8)';
    ctx.beginPath();
    ctx.roundRect(12, 60, 80, 36, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 120, 255, 0.3)';
    ctx.stroke();
    ctx.fillStyle = '#aab';
    ctx.font = '14px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← Back', 52, 82);
    ctx.textAlign = 'left';
  }

  renderStars(ctx) {
    if (!this.stars) {
      this.stars = [];
      for (let i = 0; i < 200; i++) {
        this.stars.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          r: Math.random() * 1.5 + 0.5,
          a: Math.random() * 0.8 + 0.2,
        });
      }
    }
    for (const s of this.stars) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }
  }
}
