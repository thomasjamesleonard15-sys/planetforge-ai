const SAVE_KEY = 'planetforge_home';

export function saveHome(surface) {
  const data = {
    tiles: Array.from(surface.tileMap.tiles),
    tileData: surface.tileMap.tileData.map(d => d ? { ...d } : null),
    food: surface.resources.food,
    metal: surface.resources.metal,
    energy: surface.resources.energy,
    score: surface.resources.score,
    soldiers: surface.soldierCount,
    skinIndex: surface.player.skinIndex,
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (_) {}
}

export function loadHome(surface) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    for (let i = 0; i < data.tiles.length && i < surface.tileMap.tiles.length; i++) {
      surface.tileMap.tiles[i] = data.tiles[i];
    }
    for (let i = 0; i < data.tileData.length && i < surface.tileMap.tileData.length; i++) {
      surface.tileMap.tileData[i] = data.tileData[i];
    }
    surface.resources.food = data.food ?? 50;
    surface.resources.metal = data.metal ?? 30;
    surface.resources.energy = data.energy ?? 20;
    surface.resources.score = data.score ?? 0;
    surface.soldierCount = data.soldiers ?? 0;
    surface.player.skinIndex = data.skinIndex ?? 0;
    if (surface.soldierCount > 0) {
      surface.soldiers.setCount(surface.soldierCount, surface.player.x, surface.player.y);
    }
    return true;
  } catch (_) {
    return false;
  }
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}
