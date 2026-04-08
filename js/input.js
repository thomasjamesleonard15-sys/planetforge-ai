export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.onTap = null;
    this.onDragStart = null;
    this.onDrag = null;
    this.onDragEnd = null;
    this.onSecondTap = null;
    this.onKey = null;
    this.onActionDrag = null;
    this.actionLastX = 0;
    this.actionLastY = 0;
    this.gamepadAxes = { x: 0, y: 0 };
    this.gamepadFire = false;
    this.gamepadPunch = false;
    this.gamepadJustPunch = false;
    this.lastGamepadPunch = false;

    window.addEventListener('gamepadconnected', () => {});
    this.keys = new Set();
    this.joystickTouchId = null;
    this.actionTouchId = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.spaceDown = false;
    this.enterPressed = false;
    this.yPressed = false;
    this.punchPressed = false;

    canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));
    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    window.addEventListener('keydown', (e) => {
      const isSpace = e.key === ' ' || e.code === 'Space';
      if (isSpace) { e.preventDefault(); this.spaceDown = true; }
      if (e.key === 'Enter') this.enterPressed = true;
      if (e.key === 'y' || e.key === 'Y') this.yPressed = true;
      if (e.key === 'f' || e.key === 'F') this.punchPressed = true;
      this.keys.add(e.key.toLowerCase());
      if (this.onKey) this.onKey(e.key);
    });
    window.addEventListener('keyup', (e) => {
      const isSpace = e.key === ' ' || e.code === 'Space';
      if (isSpace) this.spaceDown = false;
      this.keys.delete(e.key.toLowerCase());
    });
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
    for (const t of e.changedTouches) {
      const pos = this.getPos(t.clientX, t.clientY);
      const isLeftSide = pos.x < this.canvas.width * 0.4;

      if (isLeftSide && this.joystickTouchId === null) {
        this.joystickTouchId = t.identifier;
        if (this.onDragStart) this.onDragStart(pos.x, pos.y);
        if (this.onTap) this.onTap(pos.x, pos.y);
      } else if (this.actionTouchId === null) {
        this.actionTouchId = t.identifier;
        this.actionLastX = pos.x;
        this.actionLastY = pos.y;
        if (this.onTap) this.onTap(pos.x, pos.y);
        if (this.onSecondTap) this.onSecondTap(pos.x, pos.y);
      } else {
        if (this.onTap) this.onTap(pos.x, pos.y);
      }
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier === this.joystickTouchId) {
        const pos = this.getPos(t.clientX, t.clientY);
        if (this.onDrag) this.onDrag(pos.x, pos.y);
      } else if (t.identifier === this.actionTouchId) {
        const pos = this.getPos(t.clientX, t.clientY);
        const dx = pos.x - this.actionLastX;
        const dy = pos.y - this.actionLastY;
        this.actionLastX = pos.x;
        this.actionLastY = pos.y;
        if (this.onActionDrag) this.onActionDrag(dx, dy);
      }
    }
  }

  handleTouchEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        if (this.onDragEnd) this.onDragEnd();
      }
      if (t.identifier === this.actionTouchId) {
        this.actionTouchId = null;
      }
    }
  }

  handleMouseDown(e) {
    const pos = this.getPos(e.clientX, e.clientY);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    this.mouseDown = true;
    if (this.onDragStart) this.onDragStart(pos.x, pos.y);
    if (this.onTap) this.onTap(pos.x, pos.y);
  }

  handleMouseMove(e) {
    const pos = this.getPos(e.clientX, e.clientY);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    if (this.mouseDown && this.onDrag) this.onDrag(pos.x, pos.y);
  }

  handleMouseUp() {
    this.mouseDown = false;
    if (this.onDragEnd) this.onDragEnd();
  }

  pollGamepad() {
    if (!navigator.getGamepads) return;
    const gps = navigator.getGamepads();
    let gp = null;
    for (const g of gps) { if (g) { gp = g; break; } }
    if (!gp) { this.gamepadAxes.x = 0; this.gamepadAxes.y = 0; this.gamepadFire = false; this.gamepadPunch = false; return; }
    const dead = 0.15;
    const ax = gp.axes[0] || 0;
    const ay = gp.axes[1] || 0;
    this.gamepadAxes.x = Math.abs(ax) > dead ? ax : 0;
    this.gamepadAxes.y = Math.abs(ay) > dead ? ay : 0;
    // Right trigger or R1 / A button = fire
    const fire = (gp.buttons[7] && gp.buttons[7].pressed) || (gp.buttons[5] && gp.buttons[5].pressed) || (gp.buttons[0] && gp.buttons[0].pressed);
    this.gamepadFire = fire;
    // X button (index 2) = punch
    const punch = gp.buttons[2] && gp.buttons[2].pressed;
    this.gamepadJustPunch = punch && !this.lastGamepadPunch;
    this.lastGamepadPunch = punch;
    this.gamepadPunch = punch;
    // Start button = Enter
    if (gp.buttons[9] && gp.buttons[9].pressed) this.enterPressed = true;
    // Update spaceDown for shooting
    if (fire) this.spaceDown = true;
  }

  getMoveVector() {
    this.pollGamepad();
    let mx = 0;
    let my = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) my -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) my += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) mx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) mx += 1;
    mx += this.gamepadAxes.x;
    my += this.gamepadAxes.y;
    return { x: mx, y: my };
  }
}
