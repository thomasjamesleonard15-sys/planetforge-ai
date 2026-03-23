export function createAsteroidPool(max) {
  const pool = [];
  for (let i = 0; i < max; i++) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, r: 0, rot: 0, rotSpeed: 0, hp: 0, vertices: [] });
  }
  return pool;
}

export function createBulletPool(max) {
  const pool = [];
  for (let i = 0; i < max; i++) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff', r: 3, damage: 0 });
  }
  return pool;
}

export function createParticlePool(max) {
  const pool = [];
  for (let i = 0; i < max; i++) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, r: 0, color: '' });
  }
  return pool;
}

export function spawnAsteroid(pool, screenW, screenH, wave) {
  const a = pool.find(a => !a.active);
  if (!a) return;
  const side = Math.random() * 4 | 0;
  if (side === 0) { a.x = Math.random() * screenW; a.y = -40; }
  else if (side === 1) { a.x = screenW + 40; a.y = Math.random() * screenH; }
  else if (side === 2) { a.x = Math.random() * screenW; a.y = screenH + 40; }
  else { a.x = -40; a.y = Math.random() * screenH; }
  const tx = screenW * (0.2 + Math.random() * 0.6);
  const ty = screenH * (0.2 + Math.random() * 0.6);
  const ang = Math.atan2(ty - a.y, tx - a.x);
  const spd = 40 + Math.random() * 80;
  a.vx = Math.cos(ang) * spd;
  a.vy = Math.sin(ang) * spd;
  a.r = 18 + Math.random() * 35;
  a.rot = 0;
  a.rotSpeed = (Math.random() - 0.5) * 2;
  a.hp = Math.ceil(a.r / 10);
  a.active = true;
  a.vertices = [];
  const n = 7 + (Math.random() * 5 | 0);
  for (let i = 0; i < n; i++) a.vertices.push(0.7 + Math.random() * 0.3);
}

export function spawnChildAsteroid(pool, parent) {
  const c = pool.find(a => !a.active);
  if (!c) return;
  c.active = true;
  c.x = parent.x + (Math.random() - 0.5) * 20;
  c.y = parent.y + (Math.random() - 0.5) * 20;
  const a = Math.random() * Math.PI * 2;
  const spd = 50 + Math.random() * 60;
  c.vx = Math.cos(a) * spd;
  c.vy = Math.sin(a) * spd;
  c.r = parent.r * 0.5;
  c.rot = 0;
  c.rotSpeed = (Math.random() - 0.5) * 3;
  c.hp = Math.ceil(c.r / 10);
  c.vertices = [];
  const n = 6 + (Math.random() * 4 | 0);
  for (let i = 0; i < n; i++) c.vertices.push(0.7 + Math.random() * 0.3);
}

export function emitParticles(pool, x, y, count, angle, life, color, speed, radius) {
  let s = 0;
  for (const p of pool) {
    if (s >= count) break;
    if (p.active) continue;
    const a = angle + (Math.random() - 0.5) * Math.PI;
    const spd = speed * (0.3 + Math.random() * 0.7);
    p.active = true;
    p.x = x; p.y = y;
    p.vx = Math.cos(a) * spd;
    p.vy = Math.sin(a) * spd;
    p.life = life * (0.5 + Math.random() * 0.5);
    p.maxLife = p.life;
    p.r = radius;
    p.color = color;
    s++;
  }
}
