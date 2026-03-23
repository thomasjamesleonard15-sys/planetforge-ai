export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.onTap = null;
    this.onDragStart = null;
    this.onDrag = null;
    this.onDragEnd = null;
    this.keys = new Set();
    this.primaryTouch = null;

    canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    window.addEventListener('keydown', (e) => this.keys.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
  }

  getPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * devicePixelRatio,
      y: (clientY - rect.top) * devicePixelRatio,
    };
  }

  handleTouchStart(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    const pos = this.getPos(t.clientX, t.clientY);
    this.primaryTouch = t.identifier;
    if (this.onDragStart) this.onDragStart(pos.x, pos.y);
    if (this.onTap) this.onTap(pos.x, pos.y);
  }

  handleTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this.primaryTouch) {
        const pos = this.getPos(t.clientX, t.clientY);
        if (this.onDrag) this.onDrag(pos.x, pos.y);
      }
    }
  }

  handleTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.primaryTouch) {
        this.primaryTouch = null;
        if (this.onDragEnd) this.onDragEnd();
      }
    }
  }

  handleMouseDown(e) {
    const pos = this.getPos(e.clientX, e.clientY);
    this.mouseDown = true;
    if (this.onDragStart) this.onDragStart(pos.x, pos.y);
    if (this.onTap) this.onTap(pos.x, pos.y);
  }

  handleMouseMove(e) {
    if (!this.mouseDown) return;
    const pos = this.getPos(e.clientX, e.clientY);
    if (this.onDrag) this.onDrag(pos.x, pos.y);
  }

  handleMouseUp() {
    this.mouseDown = false;
    if (this.onDragEnd) this.onDragEnd();
  }

  getMoveVector() {
    let mx = 0;
    let my = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) my -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) my += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1;
    return { x: mx, y: my };
  }
}
