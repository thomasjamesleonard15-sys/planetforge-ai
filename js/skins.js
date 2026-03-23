export const SKINS = [
  {
    name: 'Astronaut',
    body1: '#66ccff', body2: '#2266aa',
    visor: '#aaeeff',
    detail: null,
  },
  {
    name: 'Batman',
    body1: '#444444', body2: '#111111',
    visor: '#ffffff',
    detail: 'cape',
  },
  {
    name: 'Fire',
    body1: '#ff8833', body2: '#cc2200',
    visor: '#ffdd44',
    detail: 'flames',
  },
  {
    name: 'Alien',
    body1: '#44ff66', body2: '#118833',
    visor: '#000000',
    detail: 'antennae',
  },
  {
    name: 'Robot',
    body1: '#aaaaaa', body2: '#555555',
    visor: '#ff2222',
    detail: 'bolts',
  },
  {
    name: 'Ninja',
    body1: '#222222', body2: '#000000',
    visor: '#ff4444',
    detail: 'headband',
  },
  {
    name: 'Gold',
    body1: '#ffdd44', body2: '#cc9900',
    visor: '#ffffff',
    detail: 'crown',
  },
  {
    name: 'Ice',
    body1: '#88ddff', body2: '#4488cc',
    visor: '#ffffff',
    detail: 'crystals',
  },
];

export function renderSkinDetail(ctx, sx, sy, r, skin) {
  if (!skin.detail) return;

  switch (skin.detail) {
    case 'cape':
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.moveTo(sx - r * 0.8, sy + 2);
      ctx.lineTo(sx - r * 1.2, sy + r + 10);
      ctx.lineTo(sx - r * 0.3, sy + r + 5);
      ctx.lineTo(sx, sy + r + 10);
      ctx.lineTo(sx + r * 0.3, sy + r + 5);
      ctx.lineTo(sx + r * 1.2, sy + r + 10);
      ctx.lineTo(sx + r * 0.8, sy + 2);
      ctx.closePath();
      ctx.fill();
      break;

    case 'flames':
      for (let i = 0; i < 5; i++) {
        const angle = -Math.PI / 2 + (i - 2) * 0.4;
        const len = r * 0.6 + Math.sin(Date.now() / 80 + i) * 4;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(angle) * r * 0.7, sy + Math.sin(angle) * r * 0.7);
        ctx.lineTo(sx + Math.cos(angle) * (r + len), sy + Math.sin(angle) * (r + len));
        ctx.lineWidth = 3;
        ctx.strokeStyle = i % 2 === 0 ? '#ff8833' : '#ffdd44';
        ctx.stroke();
      }
      break;

    case 'antennae':
      ctx.strokeStyle = '#44ff66';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 4, sy - r);
      ctx.lineTo(sx - 8, sy - r - 10);
      ctx.moveTo(sx + 4, sy - r);
      ctx.lineTo(sx + 8, sy - r - 10);
      ctx.stroke();
      ctx.fillStyle = '#88ff88';
      ctx.beginPath();
      ctx.arc(sx - 8, sy - r - 10, 3, 0, Math.PI * 2);
      ctx.arc(sx + 8, sy - r - 10, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'bolts':
      ctx.fillStyle = '#777';
      ctx.beginPath();
      ctx.arc(sx - r * 0.5, sy, 2.5, 0, Math.PI * 2);
      ctx.arc(sx + r * 0.5, sy, 2.5, 0, Math.PI * 2);
      ctx.arc(sx, sy + r * 0.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'headband':
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 0.85, Math.PI + 0.5, -0.5);
      ctx.stroke();
      // Trailing ends
      ctx.beginPath();
      ctx.moveTo(sx + r * 0.7, sy - r * 0.3);
      ctx.lineTo(sx + r * 1.3, sy - r * 0.1);
      ctx.moveTo(sx + r * 0.7, sy - r * 0.3);
      ctx.lineTo(sx + r * 1.2, sy - r * 0.6);
      ctx.stroke();
      break;

    case 'crown':
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy - r + 2);
      ctx.lineTo(sx - 10, sy - r - 8);
      ctx.lineTo(sx - 5, sy - r - 3);
      ctx.lineTo(sx, sy - r - 10);
      ctx.lineTo(sx + 5, sy - r - 3);
      ctx.lineTo(sx + 10, sy - r - 8);
      ctx.lineTo(sx + 8, sy - r + 2);
      ctx.closePath();
      ctx.fill();
      break;

    case 'crystals':
      const t = Date.now() / 500;
      for (let i = 0; i < 3; i++) {
        const a = t + i * 2.1;
        const cx = sx + Math.cos(a) * (r + 5);
        const cy = sy + Math.sin(a) * (r + 5);
        ctx.fillStyle = `rgba(136, 221, 255, ${0.4 + Math.sin(t + i) * 0.2})`;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 5);
        ctx.lineTo(cx - 3, cy);
        ctx.lineTo(cx, cy + 5);
        ctx.lineTo(cx + 3, cy);
        ctx.closePath();
        ctx.fill();
      }
      break;
  }
}
