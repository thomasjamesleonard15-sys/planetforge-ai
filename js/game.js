import { InputHandler } from './input.js';
import { Planet } from './planet.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.planet = new Planet(0, 0, 120);
    this.input = new InputHandler(canvas);
    this.lastTime = 0;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resize(w, h) {
    this.width = w;
    this.height = h;
    this.planet.x = w / 2;
    this.planet.y = h / 2;
    this.planet.radius = Math.min(w, h) * 0.2;
  }

  loop(time) {
    if (!this.running) return;
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.planet.update(dt);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Starfield background
    this.renderStars(ctx);

    // Planet
    this.planet.render(ctx);
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
