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
    this.gamepadLookAxes = { x: 0, y: 0 };
    this.gamepadFire = false;
    this.gamepadPunch = false;
    this.gamepadJustPunch = false;
    this.gamepadJustFire = false;
    this.lastGamepadPunch = false;
    this.lastGamepadFire = false;
    this.lastGamepadEnter = false;
    this.gamepadConnected = false;
    this.gamepadName = '';

    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadConnected = true;
      this.gamepadName = e.gamepad ? e.gamepad.id : 'Gamepad';
      console.log('Gamepad connected:', this.gamepadName);
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepadConnected = false;
      this.gamepadAxes.x = 0; this.gamepadAxes.y = 0;
      this.gamepadFire = false; this.gamepadPunch = false;
    });
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
    if (!gp) {
      this.gamepadConnected = false;
      this.gamepadAxes.x = 0; this.gamepadAxes.y = 0;
      this.gamepadLookAxes.x = 0; this.gamepadLookAxes.y = 0;
      this.gamepadFire = false; this.gamepadPunch = false;
      this.gamepadJustFire = false; this.gamepadJustPunch = false;
      return;
    }
    this.gamepadConnected = true;

    const dead = 0.18;
    // Left stick — move
    const lx = gp.axes[0] || 0;
    const ly = gp.axes[1] || 0;
    this.gamepadAxes.x = Math.abs(lx) > dead ? lx : 0;
    this.gamepadAxes.y = Math.abs(ly) > dead ? ly : 0;
    // Right stick — look/aim
    const rx = gp.axes[2] || 0;
    const ry = gp.axes[3] || 0;
    this.gamepadLookAxes.x = Math.abs(rx) > dead ? rx : 0;
    this.gamepadLookAxes.y = Math.abs(ry) > dead ? ry : 0;

    // Fire — any of: RT (7), RB (5), A (0)
    const bFire = gp.buttons;
    const fire =
      (bFire[7] && (bFire[7].pressed || bFire[7].value > 0.5)) ||
      (bFire[5] && bFire[5].pressed) ||
      (bFire[0] && bFire[0].pressed);
    this.gamepadJustFire = fire && !this.lastGamepadFire;
    this.lastGamepadFire = fire;
    this.gamepadFire = fire;

    // Punch — X (2)
    const punch = gp.buttons[2] && gp.buttons[2].pressed;
    this.gamepadJustPunch = punch && !this.lastGamepadPunch;
    this.lastGamepadPunch = punch;
    this.gamepadPunch = punch;

    // Start (9) = Enter
    const start = gp.buttons[9] && gp.buttons[9].pressed;
    if (start && !this.lastGamepadEnter) this.enterPressed = true;
    this.lastGamepadEnter = start;

    // D-pad as directional fallback (buttons 12=up, 13=down, 14=left, 15=right)
    if (bFire[12] && bFire[12].pressed) this.gamepadAxes.y = -1;
    if (bFire[13] && bFire[13].pressed) this.gamepadAxes.y = 1;
    if (bFire[14] && bFire[14].pressed) this.gamepadAxes.x = -1;
    if (bFire[15] && bFire[15].pressed) this.gamepadAxes.x = 1;
  }

  isFiring() {
    return this.spaceDown || this.gamepadFire;
  }

  consumePunch() {
    if (this.punchPressed || this.gamepadJustPunch) {
      this.punchPressed = false;
      this.gamepadJustPunch = false;
      return true;
    }
    return false;
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
    // Clamp to unit circle
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 1) { mx /= len; my /= len; }
    return { x: mx, y: my };
  }
}
