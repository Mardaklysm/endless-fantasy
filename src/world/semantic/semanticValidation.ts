import { SEMANTIC_BIOME, SEMANTIC_WATER, type MajorIslandId, type SemanticPoi, type SemanticWorld } from "./semanticTypes.ts";

const MAJOR_ISLAND_IDS: MajorIslandId[] = ["greenhaven", "coralreach", "frostmere", "highspire"];

export function validateSemanticWorld(world: SemanticWorld) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const landCount = countValues(world.layers.landMask, 1);
  const shallowCount = countValues(world.layers.waterClass, SEMANTIC_WATER.SHALLOW);
  const beachCount = countValues(world.layers.biome, SEMANTIC_BIOME.BEACH);
  const majorIslands = world.islands.filter((island) => island.major);

  if (landCount === 0) errors.push("No land was generated.");
  if (majorIslands.length !== 4) errors.push(`Expected exactly 4 major islands, got ${majorIslands.length}.`);
  for (const id of MAJOR_ISLAND_IDS) {
    const island = world.islands.find((candidate) => candidate.id === id);
    if (!island) errors.push(`Major island ${id} is missing.`);
    else if (island.area < 80) errors.push(`Major island ${id} is too small (${island.area} cells).`);
  }
  if (shallowCount === 0) errors.push("No shallow coastal water was generated.");
  if (beachCount === 0) errors.push("No beach band was generated.");
  if (world.stats.mountainCells > landCount * 0.16) warnings.push("Mountain overlays cover more than 16% of land.");
  if (world.rivers.some((river) => hasDuplicateCells(river.path))) errors.push("A river path contains a loop.");
  if (world.rivers.length === 0) warnings.push("No rivers survived validation.");

  const starterIsland = world.islands.find((island) => island.id === world.profile.startingIslandId);
  if (!starterIsland) errors.push(`Starter island ${world.profile.startingIslandId} is missing.`);
  const starterSettlement = world.poiList.find((poi) => poi.islandId === world.profile.startingIslandId && poi.role === "settlement");
  if (!starterSettlement) errors.push(`Starter island ${world.profile.startingIslandId} has no settlement.`);
  else if (!isWalkable(world, starterSettlement.x, starterSettlement.y)) errors.push(`Starter settlement ${starterSettlement.id} is not walkable.`);

  for (const id of MAJOR_ISLAND_IDS) {
    const harbor = world.harbors.find((poi) => poi.islandId === id);
    if (!harbor) errors.push(`Major island ${id} has no harbor/travel point.`);
  }

  for (const poi of world.poiList) validatePoi(world, poi, errors);
  for (const edge of world.roadGraph.edges) {
    if (!edge.connected) warnings.push(`Road edge ${edge.from} -> ${edge.to} could not be connected.`);
  }
  validateBeachBuffer(world, errors);
  validateForestRoadSeparation(world, errors);

  return { ok: errors.length === 0, errors, warnings };
}

function validatePoi(world: SemanticWorld, poi: SemanticPoi, errors: string[]) {
  const i = index(world.width, poi.x, poi.y);
  if (poi.x < 0 || poi.y < 0 || poi.x >= world.width || poi.y >= world.height) {
    errors.push(`POI ${poi.id} is out of bounds.`);
    return;
  }
  if (!world.layers.landMask[i] && poi.type !== "port") errors.push(`POI ${poi.id} is not on land.`);
  if (world.layers.waterClass[i] !== SEMANTIC_WATER.NONE) errors.push(`POI ${poi.id} is on blocked water.`);
  if (poi.type === "port" && !hasAdjacentWater(world, poi.x, poi.y, SEMANTIC_WATER.SHALLOW)) {
    errors.push(`Port ${poi.id} is not adjacent to shallow water.`);
  }
}

function validateBeachBuffer(world: SemanticWorld, errors: string[]) {
  for (let y = 1; y < world.height - 1; y += 1) {
    for (let x = 1; x < world.width - 1; x += 1) {
      const i = index(world.width, x, y);
      if (!world.layers.landMask[i]) continue;
      const touchesWater = neighbors4(x, y).some((next) => world.layers.waterClass[index(world.width, next.x, next.y)] !== SEMANTIC_WATER.NONE);
      if (touchesWater && world.layers.biome[i] !== SEMANTIC_BIOME.BEACH) errors.push(`Non-beach land touches water at ${x},${y}.`);
    }
  }
}

function validateForestRoadSeparation(world: SemanticWorld, errors: string[]) {
  for (let i = 0; i < world.layers.forestMap.length; i += 1) {
    if (world.layers.forestMap[i] && world.layers.roadMap[i]) errors.push("Forest overlaps a road.");
  }
}

function isWalkable(world: SemanticWorld, x: number, y: number): boolean {
  return world.layers.walkability[index(world.width, x, y)] === 1;
}

function hasAdjacentWater(world: SemanticWorld, x: number, y: number, value: number): boolean {
  return neighbors4(x, y).some((next) => inBounds(world, next.x, next.y) && world.layers.waterClass[index(world.width, next.x, next.y)] === value);
}

function hasDuplicateCells(path: { x: number; y: number }[]): boolean {
  const seen = new Set<string>();
  for (const cell of path) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function countValues(array: Uint8Array, value: number): number {
  let count = 0;
  for (const item of array) if (item === value) count += 1;
  return count;
}

function neighbors4(x: number, y: number) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y }
  ];
}

function inBounds(world: SemanticWorld, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.width && y < world.height;
}

function index(width: number, x: number, y: number): number {
  return y * width + x;
}
