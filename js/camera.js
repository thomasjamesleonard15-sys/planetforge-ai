import { TILE_SIZE, MAP_SIZE } from './constants.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.screenW = 0;
    this.screenH = 0;
    this.smoothing = 8;
  }

  follow(targetX, targetY) {
    this.targetX = targetX;
    this.targetY = targetY;
  }

  update(dt) {
    this.x += (this.targetX - this.screenW / 2 - this.x) * this.smoothing * dt;
    this.y += (this.targetY - this.screenH / 2 - this.y) * this.smoothing * dt;

    const maxX = MAP_SIZE * TILE_SIZE - this.screenW;
    const maxY = MAP_SIZE * TILE_SIZE - this.screenH;
    this.x = Math.max(0, Math.min(maxX, this.x));
    this.y = Math.max(0, Math.min(maxY, this.y));
  }

  resize(w, h) {
    this.screenW = w;
    this.screenH = h;
  }

  worldToScreen(wx, wy) {
    return { x: wx - this.x, y: wy - this.y };
  }

  screenToWorld(sx, sy) {
    return { x: sx + this.x, y: sy + this.y };
  }

  isVisible(wx, wy, margin = 50) {
    const sx = wx - this.x;
    const sy = wy - this.y;
    return sx > -margin && sx < this.screenW + margin &&
           sy > -margin && sy < this.screenH + margin;
  }
}
