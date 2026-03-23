export const TILE_SIZE = 48;
export const MAP_SIZE = 40;

export const TILE = {
  EMPTY: 0,
  FARM: 1,
  TURRET: 2,
  WALL: 3,
  BARRACKS: 4,
  SOLAR: 5,
  ROCK: 6,
  WATER: 7,
};

export const CROP_STAGES = 4;
export const CROP_GROW_TIME = 8; // seconds per stage
export const CROP_HARVEST_VALUE = 25;

export const BUILDING_COSTS = {
  [TILE.FARM]: { food: 0, metal: 0, energy: 0 },
  [TILE.TURRET]: { food: 0, metal: 30, energy: 10 },
  [TILE.WALL]: { food: 0, metal: 15, energy: 0 },
  [TILE.BARRACKS]: { food: 20, metal: 40, energy: 20 },
  [TILE.SOLAR]: { food: 0, metal: 20, energy: 0 },
};

export const WEAPONS = [
  { name: 'Pistol', damage: 10, fireRate: 0.35, bulletSpeed: 600, spread: 0.05, color: '#ffdd44' },
  { name: 'Rifle', damage: 8, fireRate: 0.12, bulletSpeed: 800, spread: 0.08, color: '#44ffdd' },
  { name: 'Shotgun', damage: 6, fireRate: 0.6, bulletSpeed: 500, spread: 0.3, pellets: 5, color: '#ff8844' },
  { name: 'Plasma', damage: 25, fireRate: 0.8, bulletSpeed: 400, spread: 0.02, color: '#aa44ff' },
];

export const ENEMY_TYPES = [
  { name: 'Drone', health: 20, speed: 60, damage: 5, radius: 10, color: '#ff4444', reward: 5 },
  { name: 'Brute', health: 60, speed: 35, damage: 15, radius: 16, color: '#ff6622', reward: 15 },
  { name: 'Swarm', health: 8, speed: 90, damage: 3, radius: 6, color: '#ffaa44', reward: 2 },
  { name: 'Tank', health: 150, speed: 20, damage: 25, radius: 22, color: '#cc2222', reward: 30 },
];

export const COLORS = {
  dirt: '#3a2e1f',
  dirtLight: '#4a3e2f',
  grass: '#2a5a1a',
  water: '#1a4a7a',
  rock: '#5a5a5a',
  farmDirt: '#5a4a2a',
  wall: '#6a6a7a',
  turret: '#4a6a8a',
  barracks: '#6a4a3a',
  solar: '#3a5a8a',
  hud: 'rgba(10, 10, 30, 0.85)',
  hudBorder: 'rgba(100, 120, 255, 0.3)',
  health: '#44ff66',
  damage: '#ff4444',
};
