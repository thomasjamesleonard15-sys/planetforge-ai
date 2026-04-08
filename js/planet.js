const TYPES = ['earth', 'lava', 'ice', 'gas', 'desert', 'forest', 'ocean', 'rock', 'toxic'];

export class Planet {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.rotation = 0;
    this.rotationSpeed = 0.15;
    this.type = 'earth';
    this.seed = Math.random() * 1000;
    this.colors = {
      ocean: '#1e6091',
      land: '#2d8a4e',
      ice: '#c8e6f0',
      atmosphere: 'rgba(100, 180, 255, 0.12)',
    };
  }

  update(dt) {
    this.rotation += this.rotationSpeed * dt;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    const r = this.radius;

    // Outer glow halo — atmosphere color
    const halo = ctx.createRadialGradient(0, 0, r, 0, 0, r * 1.5);
    halo.addColorStop(0, this.colors.atmosphere || 'rgba(100, 180, 255, 0.2)');
    halo.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Gas giant rings — draw behind the planet
    if (this.type === 'gas') {
      ctx.save();
      ctx.rotate(-0.3);
      ctx.scale(1, 0.2);
      const ring = ctx.createRadialGradient(0, 0, r * 1.2, 0, 0, r * 2.2);
      ring.addColorStop(0, 'rgba(0,0,0,0)');
      ring.addColorStop(0.1, 'rgba(220,180,120,0.4)');
      ring.addColorStop(0.3, 'rgba(180,140,80,0.5)');
      ring.addColorStop(0.6, 'rgba(220,200,160,0.3)');
      ring.addColorStop(0.85, 'rgba(160,120,80,0.2)');
      ring.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Planet body base
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.05, 0, 0, r * 1.1);
    const { c0, c1, c2, c3 } = this.getBaseColors();
    grad.addColorStop(0, c0);
    grad.addColorStop(0.2, c1);
    grad.addColorStop(0.6, c2);
    grad.addColorStop(1, c3);
    ctx.fillStyle = grad;
    ctx.fill();

    // Surface detail clipped to planet
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    this.renderSurface(ctx, r);
    ctx.restore();

    // Specular highlight
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    const spec = ctx.createRadialGradient(-r * 0.4, -r * 0.4, 0, -r * 0.4, -r * 0.4, r * 0.6);
    spec.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = spec;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    // Terminator shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    const term = ctx.createRadialGradient(r * 0.4, r * 0.4, 0, r * 0.4, r * 0.4, r * 1.3);
    term.addColorStop(0, 'rgba(0, 0, 0, 0)');
    term.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    ctx.fillStyle = term;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();

    // Atmosphere ring
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
    const atmoGrad = ctx.createRadialGradient(0, 0, r, 0, 0, r * 1.1);
    atmoGrad.addColorStop(0, this.colors.atmosphere);
    atmoGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = atmoGrad;
    ctx.fill();

    // Gas giant rings front (in front of planet)
    if (this.type === 'gas') {
      ctx.save();
      ctx.rotate(-0.3);
      ctx.scale(1, 0.2);
      const ring = ctx.createRadialGradient(0, 0, r * 1.2, 0, 0, r * 2.2);
      ring.addColorStop(0, 'rgba(0,0,0,0)');
      ring.addColorStop(0.1, 'rgba(220,180,120,0.35)');
      ring.addColorStop(0.3, 'rgba(180,140,80,0.25)');
      ring.addColorStop(0.6, 'rgba(220,200,160,0.2)');
      ring.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.2, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  getBaseColors() {
    switch (this.type) {
      case 'lava': return { c0: '#ffcc66', c1: '#ff6622', c2: '#aa2200', c3: '#110000' };
      case 'ice': return { c0: '#ffffff', c1: '#aaddff', c2: '#4488cc', c3: '#001133' };
      case 'gas': return { c0: '#ffddaa', c1: '#ddaa66', c2: '#aa6633', c3: '#331100' };
      case 'desert': return { c0: '#ffeeaa', c1: '#ddaa55', c2: '#885522', c3: '#220f00' };
      case 'forest': return { c0: '#aaffaa', c1: '#44aa44', c2: '#226622', c3: '#001100' };
      case 'ocean': return { c0: '#88ccff', c1: '#3388cc', c2: '#114466', c3: '#000022' };
      case 'rock': return { c0: '#ccaa88', c1: '#775544', c2: '#332211', c3: '#100500' };
      case 'toxic': return { c0: '#ccff66', c1: '#66aa22', c2: '#224411', c3: '#001100' };
      default: return { c0: '#88ddff', c1: '#3aa3e8', c2: this.colors.ocean, c3: '#000511' };
    }
  }

  renderSurface(ctx, r) {
    const rot = this.rotation;
    const offset = Math.cos(rot) * r * 0.5;
    switch (this.type) {
      case 'lava': {
        // Cracked dark crust with glowing lava veins
        ctx.fillStyle = '#220500';
        for (let i = 0; i < 6; i++) {
          const a = (i * 1.3 + this.seed) + rot * 0.3;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.5 + offset * 0.2, Math.sin(a * 1.3) * r * 0.5, r * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
        // Glowing veins
        ctx.strokeStyle = '#ff6622';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const a = (i * 1.5 + this.seed) + rot * 0.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
          ctx.quadraticCurveTo(Math.cos(a + 1) * r * 0.4, Math.sin(a + 1) * r * 0.4, Math.cos(a + 2) * r * 0.6, Math.sin(a + 2) * r * 0.4);
          ctx.stroke();
        }
        ctx.strokeStyle = '#ffdd44';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 4; i++) {
          const a = (i * 1.5 + this.seed) + rot * 0.5;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
          ctx.quadraticCurveTo(Math.cos(a + 1) * r * 0.4, Math.sin(a + 1) * r * 0.4, Math.cos(a + 2) * r * 0.6, Math.sin(a + 2) * r * 0.4);
          ctx.stroke();
        }
        break;
      }
      case 'ice': {
        // Ice cracks
        ctx.strokeStyle = '#88ccee';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 8; i++) {
          const a = i * 0.9 + this.seed;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
          ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
          ctx.stroke();
        }
        // Snow patches
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
          const a = i * 1.2 + this.seed + rot * 0.2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.5 + offset * 0.3, Math.sin(a * 1.2) * r * 0.5, r * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }
        // Blue glow spots
        ctx.fillStyle = 'rgba(150,220,255,0.6)';
        for (let i = 0; i < 3; i++) {
          const a = i * 2 + this.seed;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'gas': {
        // Horizontal bands
        for (let i = -4; i <= 4; i++) {
          const y = (i / 4) * r * 0.9;
          const alpha = 0.25 + (i % 2) * 0.15;
          const w = Math.sqrt(r * r - y * y) * 2;
          ctx.fillStyle = `rgba(${180 + (i % 2) * 40}, ${120 + (i % 2) * 40}, 60, ${alpha})`;
          ctx.fillRect(-w / 2, y - 3, w, 6);
        }
        // Great red spot
        const spotX = Math.cos(rot) * r * 0.4;
        const spotY = r * 0.2;
        if (spotX > -r * 0.7) {
          ctx.beginPath();
          ctx.ellipse(spotX, spotY, r * 0.18, r * 0.1, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#cc3322';
          ctx.fill();
        }
        break;
      }
      case 'desert': {
        // Sand dunes — curved bands
        ctx.strokeStyle = 'rgba(180, 130, 60, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          ctx.beginPath();
          const yOff = -r + (i / 8) * r * 2;
          ctx.moveTo(-r, yOff);
          ctx.quadraticCurveTo(0, yOff + 5 + Math.sin(i + this.seed) * 3, r, yOff);
          ctx.stroke();
        }
        // Darker spots (oases or canyons)
        ctx.fillStyle = '#664422';
        for (let i = 0; i < 3; i++) {
          const a = i * 2 + this.seed + rot * 0.2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.5 + offset * 0.3, Math.sin(a) * r * 0.5, r * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'forest': {
        // Large continents with darker forest spots
        ctx.fillStyle = '#226622';
        for (let i = 0; i < 5; i++) {
          const a = i * 1.4 + this.seed;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.4 + offset * 0.5, Math.sin(a * 1.1) * r * 0.4, r * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#44aa44';
        for (let i = 0; i < 8; i++) {
          const a = i * 0.8 + this.seed;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.5 + offset * 0.3, Math.sin(a * 1.3) * r * 0.5, r * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        // Rivers
        ctx.strokeStyle = '#3388aa';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
          const a = i * 3 + this.seed;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
          ctx.quadraticCurveTo(Math.cos(a + 1) * r * 0.5, Math.sin(a + 1) * r * 0.5, Math.cos(a + 2) * r * 0.8, Math.sin(a + 2) * r * 0.3);
          ctx.stroke();
        }
        break;
      }
      case 'ocean': {
        // Small islands
        ctx.fillStyle = '#66aa66';
        for (let i = 0; i < 4; i++) {
          const a = i * 1.6 + this.seed + rot * 0.2;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.5 + offset * 0.3, Math.sin(a * 1.2) * r * 0.5, r * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        // Wave shimmer
        ctx.strokeStyle = 'rgba(200,230,255,0.4)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 6; i++) {
          const a = i * 1.1 + rot;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.08, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 'rock': {
        // Craters
        for (let i = 0; i < 7; i++) {
          const a = i * 1.0 + this.seed;
          const cx = Math.cos(a) * r * 0.55 + offset * 0.2;
          const cy = Math.sin(a * 1.3) * r * 0.55;
          const cr = r * (0.08 + (i % 3) * 0.04);
          ctx.beginPath();
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
          ctx.fillStyle = '#443322';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx - cr * 0.3, cy - cr * 0.3, cr * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = '#221100';
          ctx.fill();
        }
        // Mountain ridges
        ctx.strokeStyle = '#ccaa88';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          const a = i * 2 + this.seed;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
          ctx.lineTo(Math.cos(a + 0.5) * r * 0.7, Math.sin(a + 0.5) * r * 0.7);
          ctx.stroke();
        }
        break;
      }
      case 'toxic': {
        // Toxic green swirls
        ctx.strokeStyle = '#88cc22';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.5 + rot * 0.5;
          ctx.beginPath();
          for (let j = 0; j < 20; j++) {
            const t = j / 20;
            const ang = a + t * Math.PI;
            const rad = r * (0.2 + t * 0.5);
            const px = Math.cos(ang) * rad;
            const py = Math.sin(ang) * rad;
            if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
        // Bubbling spots
        ctx.fillStyle = '#aaff44';
        for (let i = 0; i < 5; i++) {
          const a = i * 1.3 + this.seed + rot;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.05 + Math.sin(rot * 3 + i) * r * 0.02, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      default: {
        // Earth-like: continents + ice caps
        const patches = [
          { cx: 0.3, cy: -0.2, r: 0.25 },
          { cx: -0.4, cy: 0.3, r: 0.2 },
          { cx: 0.1, cy: 0.5, r: 0.15 },
          { cx: -0.2, cy: -0.5, r: 0.18 },
        ];
        for (const p of patches) {
          ctx.beginPath();
          ctx.arc(p.cx * r + offset, p.cy * r, p.r * r, 0, Math.PI * 2);
          ctx.fillStyle = this.colors.land;
          ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.85, r * 0.4, r * 0.15, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.ice;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, r * 0.88, r * 0.35, r * 0.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.colors.ice;
        ctx.fill();
        break;
      }
    }
  }
}

export const PLANET_TYPES = TYPES;
