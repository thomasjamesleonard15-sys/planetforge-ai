export class Planet {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.rotation = 0;
    this.rotationSpeed = 0.15; // radians per second
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

    // Planet body
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, this.radius * 0.1,
      0, 0, this.radius
    );
    grad.addColorStop(0, '#3aa3e8');
    grad.addColorStop(0.5, this.colors.ocean);
    grad.addColorStop(1, '#0d3b66');
    ctx.fillStyle = grad;
    ctx.fill();

    // Simple land masses (rotating)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.clip();

    const landPatches = [
      { cx: 0.3, cy: -0.2, r: 0.25 },
      { cx: -0.4, cy: 0.3, r: 0.2 },
      { cx: 0.1, cy: 0.5, r: 0.15 },
      { cx: -0.2, cy: -0.5, r: 0.18 },
    ];

    for (const patch of landPatches) {
      const offsetX = Math.cos(this.rotation) * this.radius * 0.5;
      ctx.beginPath();
      ctx.arc(
        patch.cx * this.radius + offsetX,
        patch.cy * this.radius,
        patch.r * this.radius,
        0, Math.PI * 2
      );
      ctx.fillStyle = this.colors.land;
      ctx.fill();
    }

    // Ice caps
    ctx.beginPath();
    ctx.ellipse(0, -this.radius * 0.85, this.radius * 0.4, this.radius * 0.15, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.colors.ice;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, this.radius * 0.88, this.radius * 0.35, this.radius * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.colors.ice;
    ctx.fill();

    ctx.restore();

    // Atmosphere glow
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.08, 0, Math.PI * 2);
    const atmoGrad = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius * 1.08);
    atmoGrad.addColorStop(0, this.colors.atmosphere);
    atmoGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = atmoGrad;
    ctx.fill();

    ctx.restore();
  }
}
