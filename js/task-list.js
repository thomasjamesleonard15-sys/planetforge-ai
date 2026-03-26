const TASKS = [
  { id: 'land1', name: 'First Landing', desc: 'Land on any planet', icon: '🌍' },
  { id: 'build5', name: 'Builder', desc: 'Build 5 structures', icon: '🔨' },
  { id: 'kill10', name: 'Defender', desc: 'Kill 10 enemies', icon: '⚔️' },
  { id: 'wave5', name: 'Wave Survivor', desc: 'Reach wave 5', icon: '🌊' },
  { id: 'fly', name: 'Pilot', desc: 'Fly a spaceship', icon: '🚀' },
  { id: 'kill50', name: 'Warrior', desc: 'Kill 50 enemies', icon: '💀' },
  { id: 'asteroid10', name: 'Miner', desc: 'Destroy 10 asteroids', icon: '☄️' },
  { id: 'race', name: 'Racer', desc: 'Complete a space race', icon: '🏁' },
  { id: 'qte', name: 'Champion', desc: 'Beat Dark Lord Vexor', icon: '👊' },
  { id: 'batman5', name: 'Dark Knight', desc: 'Reach wave 5 on Batplanet', icon: '🦇' },
  { id: 'batman10', name: 'Gotham Hero', desc: 'Reach wave 10 on Batplanet', icon: '🦇' },
  { id: 'coop1', name: 'Team Player', desc: 'Beat a co-op boss', icon: '🤝' },
  { id: 'coopall', name: 'Boss Slayer', desc: 'Beat all co-op bosses', icon: '👑' },
  { id: 'galaxy2', name: 'Explorer', desc: 'Visit a second galaxy', icon: '🌌' },
  { id: 'wave10', name: 'Unstoppable', desc: 'Reach wave 10', icon: '🔥' },
  { id: 'kill200', name: 'Legend', desc: 'Kill 200 enemies', icon: '⭐' },
];

const STORAGE_KEY = 'pforge-tasks';

export class TaskList {
  constructor() {
    this.completed = new Set();
    this.showPanel = false;
    this.btnRect = { x: 0, y: 0, w: 0, h: 0 };
    this.closeRect = { x: 0, y: 0, w: 0, h: 0 };
    this.newComplete = '';
    this.newCompleteTimer = 0;
    this.totalKills = 0;
    this.totalBuilds = 0;
    this.totalAsteroids = 0;
    this.load();
  }

  load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && data.completed) {
        for (const id of data.completed) this.completed.add(id);
      }
      if (data) {
        this.totalKills = data.totalKills || 0;
        this.totalBuilds = data.totalBuilds || 0;
        this.totalAsteroids = data.totalAsteroids || 0;
      }
    } catch (_) {}
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        completed: [...this.completed],
        totalKills: this.totalKills,
        totalBuilds: this.totalBuilds,
        totalAsteroids: this.totalAsteroids,
      }));
    } catch (_) {}
  }

  complete(id) {
    if (this.completed.has(id)) return;
    const task = TASKS.find(t => t.id === id);
    if (!task) return;
    this.completed.add(id);
    this.newComplete = `${task.icon} ${task.name}`;
    this.newCompleteTimer = 3;
    this.save();
  }

  addKill() {
    this.totalKills++;
    if (this.totalKills >= 10) this.complete('kill10');
    if (this.totalKills >= 50) this.complete('kill50');
    if (this.totalKills >= 200) this.complete('kill200');
  }

  addBuild() {
    this.totalBuilds++;
    if (this.totalBuilds >= 5) this.complete('build5');
  }

  addAsteroid() {
    this.totalAsteroids++;
    if (this.totalAsteroids >= 10) this.complete('asteroid10');
  }

  handleTap(x, y) {
    const b = this.btnRect;
    if (b.w > 0 && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      this.showPanel = !this.showPanel;
      return true;
    }
    if (this.showPanel) {
      const c = this.closeRect;
      if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
        this.showPanel = false;
        return true;
      }
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.newCompleteTimer > 0) this.newCompleteTimer -= dt;
  }

  render(ctx, w, h) {
    // Task button — top left area below back/mute
    const bw = 36, bh = 36;
    const bx = 12, by = 142;
    this.btnRect = { x: bx, y: by, w: bw, h: bh };
    ctx.fillStyle = this.showPanel ? 'rgba(60, 40, 100, 0.9)' : 'rgba(20, 20, 40, 0.8)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100, 120, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ddd';
    ctx.fillText('📋', bx + bw / 2, by + bh / 2 + 6);

    // Completion popup
    if (this.newCompleteTimer > 0) {
      const alpha = Math.min(1, this.newCompleteTimer);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      const tw = ctx.measureText(this.newComplete).width + 40;
      ctx.beginPath();
      ctx.roundRect(w / 2 - tw / 2, h * 0.15 - 18, tw, 40, 10);
      ctx.fill();
      ctx.strokeStyle = '#44ff88';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = 'bold 16px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = '#44ff88';
      ctx.fillText('COMPLETE: ' + this.newComplete, w / 2, h * 0.15 + 6);
      ctx.globalAlpha = 1;
    }

    if (this.showPanel) this.renderPanel(ctx, w, h);
    ctx.textAlign = 'left';
  }

  renderPanel(ctx, w, h) {
    const pw = Math.min(340, w - 32), ph = Math.min(500, h - 60);
    const px = w / 2 - pw / 2, py = h / 2 - ph / 2;

    ctx.fillStyle = 'rgba(10, 5, 20, 0.95)';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 12);
    ctx.fill();
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 18px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#88aaff';
    ctx.fillText('TASKS', px + pw / 2, py + 26);

    const done = this.completed.size;
    ctx.font = '12px -apple-system, system-ui, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText(`${done}/${TASKS.length} complete`, px + pw / 2, py + 44);

    // Close button
    const clw = 30, clh = 30;
    const clx = px + pw - clw - 8, cly = py + 6;
    this.closeRect = { x: clx, y: cly, w: clw, h: clh };
    ctx.fillStyle = '#442222';
    ctx.beginPath();
    ctx.roundRect(clx, cly, clw, clh, 6);
    ctx.fill();
    ctx.fillStyle = '#ff6666';
    ctx.font = '16px -apple-system, system-ui, sans-serif';
    ctx.fillText('✕', clx + clw / 2, cly + clh / 2 + 5);

    // Task list
    ctx.textAlign = 'left';
    let ty = py + 60;
    const rowH = 28;
    for (const task of TASKS) {
      if (ty + rowH > py + ph - 10) break;
      const isDone = this.completed.has(task.id);
      ctx.globalAlpha = isDone ? 0.5 : 1;
      ctx.font = '14px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = isDone ? '#44ff88' : '#aaaacc';
      ctx.fillText(`${task.icon} ${isDone ? '✓' : '○'} ${task.name}`, px + 14, ty + 8);
      ctx.font = '11px -apple-system, system-ui, sans-serif';
      ctx.fillStyle = isDone ? '#448855' : '#666688';
      ctx.fillText(task.desc, px + 38, ty + 22);
      ty += rowH;
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
