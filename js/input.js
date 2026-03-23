export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.pointers = new Map();

    // Touch events
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

    // Mouse events (desktop)
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  getCanvasPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * devicePixelRatio,
      y: (clientY - rect.top) * devicePixelRatio,
    };
  }

  onTouchStart(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      this.pointers.set(touch.identifier, this.getCanvasPos(touch.clientX, touch.clientY));
    }
  }

  onTouchMove(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      this.pointers.set(touch.identifier, this.getCanvasPos(touch.clientX, touch.clientY));
    }
  }

  onTouchEnd(e) {
    for (const touch of e.changedTouches) {
      this.pointers.delete(touch.identifier);
    }
  }

  onMouseDown(e) {
    this.pointers.set('mouse', this.getCanvasPos(e.clientX, e.clientY));
    this.mouseDown = true;
  }

  onMouseMove(e) {
    if (this.mouseDown) {
      this.pointers.set('mouse', this.getCanvasPos(e.clientX, e.clientY));
    }
  }

  onMouseUp() {
    this.pointers.delete('mouse');
    this.mouseDown = false;
  }
}
