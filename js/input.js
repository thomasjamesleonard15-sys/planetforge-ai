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
    this.gamepadActive = false;
    this.gamepadName = '';

    this.gamepadLog = [];
    const log = (msg) => {
      const t = new Date().toTimeString().slice(0, 8);
      this.gamepadLog.unshift(`${t} ${msg}`);
      if (this.gamepadLog.length > 6) this.gamepadLog.pop();
      console.log('[gamepad]', msg);
    };
    this.gamepadLogger = log;
    log('API ' + (navigator.getGamepads ? 'supported' : 'NOT SUPPORTED'));
    log('userAgent: ' + navigator.userAgent.slice(0, 60));

    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadConnected = true;
      this.gamepadName = e.gamepad ? e.gamepad.id : 'Gamepad';
      log('CONNECTED: ' + this.gamepadName.slice(0, 40));
      log(`buttons=${e.gamepad.buttons.length} axes=${e.gamepad.axes.length} map=${e.gamepad.mapping}`);
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      this.gamepadConnected = false;
      this.gamepadAxes.x = 0; this.gamepadAxes.y = 0;
      this.gamepadFire = false; this.gamepadPunch = false;
      log('DISCONNECTED: ' + (e.gamepad ? e.gamepad.id : '?'));
    });

    // Poll gamepad independently in RAF loop (in case game isn't updating every frame)
    const pollLoop = () => {
      this.pollGamepad();
      requestAnimationFrame(pollLoop);
    };
    requestAnimationFrame(pollLoop);

    // Focus the canvas aggressively so Gamepad API sees page gestures
    const focusCanvas = () => { try { canvas.focus(); } catch (_) {} };
    window.addEventListener('click', focusCanvas);
    window.addEventListener('touchstart', focusCanvas);
    window.addEventListener('keydown', focusCanvas);
    // Also focus on load
    setTimeout(focusCanvas, 100);
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
    // Find the first connected gamepad with any active input
    let gp = null;
    for (const g of gps) {
      if (!g || !g.connected) continue;
      gp = g;
      break;
    }
    if (!gp) {
      this.gamepadConnected = false;
      this.gamepadAxes.x = 0; this.gamepadAxes.y = 0;
      this.gamepadLookAxes.x = 0; this.gamepadLookAxes.y = 0;
      this.gamepadFire = false; this.gamepadPunch = false;
      this.gamepadJustFire = false; this.gamepadJustPunch = false;
      return;
    }
    this.gamepadConnected = true;
    this.gamepadName = gp.id;

    const dead = 0.18;
    const axes = gp.axes || [];
    const buttons = gp.buttons || [];

    // Left stick — move (axes[0], axes[1])
    const lx = axes[0] || 0;
    const ly = axes[1] || 0;
    this.gamepadAxes.x = Math.abs(lx) > dead ? lx : 0;
    this.gamepadAxes.y = Math.abs(ly) > dead ? ly : 0;

    // Right stick — look (axes[2], axes[3])
    const rx = axes[2] || 0;
    const ry = axes[3] || 0;
    this.gamepadLookAxes.x = Math.abs(rx) > dead ? rx : 0;
    this.gamepadLookAxes.y = Math.abs(ry) > dead ? ry : 0;

    // Helper — check button with fallback to value (for triggers that report as buttons with 0-1 value)
    const isPressed = (idx) => {
      const b = buttons[idx];
      if (!b) return false;
      if (b.pressed) return true;
      if (b.value !== undefined && b.value > 0.5) return true;
      return false;
    };

    // Fire = A (0) OR RB (5) OR RT (7)
    // Also support trigger as axis (Safari reports LT/RT as axes[6]/axes[7] on some pads)
    let triggerFire = false;
    if (axes.length > 6 && axes[7] !== undefined && axes[7] > 0) triggerFire = true;
    const fire = isPressed(0) || isPressed(5) || isPressed(7) || triggerFire;
    this.gamepadJustFire = fire && !this.lastGamepadFire;
    this.lastGamepadFire = fire;
    this.gamepadFire = fire;

    // Punch = X (2) OR B (1)
    const punch = isPressed(2) || isPressed(1);
    this.gamepadJustPunch = punch && !this.lastGamepadPunch;
    this.lastGamepadPunch = punch;
    this.gamepadPunch = punch;

    // Start (9) or Select (8) = Enter / interact
    const start = isPressed(9) || isPressed(8);
    if (start && !this.lastGamepadEnter) this.enterPressed = true;
    this.lastGamepadEnter = start;

    // D-pad (buttons 12-15) — override stick if pressed
    if (isPressed(12)) this.gamepadAxes.y = -1;
    if (isPressed(13)) this.gamepadAxes.y = 1;
    if (isPressed(14)) this.gamepadAxes.x = -1;
    if (isPressed(15)) this.gamepadAxes.x = 1;

    // Mark that we've seen activity (for debug)
    if (fire || punch || start || Math.abs(lx) > 0.1 || Math.abs(ly) > 0.1 || Math.abs(rx) > 0.1 || Math.abs(ry) > 0.1) {
      this.gamepadActive = true;
    }
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
