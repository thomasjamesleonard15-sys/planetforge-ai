export class Resources {
  constructor() {
    this.food = 50;
    this.metal = 30;
    this.energy = 20;
    this.score = 0;
    this.wave = 0;
  }

  canAfford(cost) {
    return this.food >= (cost.food || 0) &&
           this.metal >= (cost.metal || 0) &&
           this.energy >= (cost.energy || 0);
  }

  spend(cost) {
    if (!this.canAfford(cost)) return false;
    this.food -= cost.food || 0;
    this.metal -= cost.metal || 0;
    this.energy -= cost.energy || 0;
    return true;
  }

  add(type, amount) {
    this[type] = (this[type] || 0) + amount;
  }
}
