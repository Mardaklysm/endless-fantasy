import {
  SEMANTIC_BIOME,
  SEMANTIC_WATER,
  type MajorIslandId,
  type SemanticPoi,
  type SemanticWorld
} from "./semanticTypes.ts";

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
  if (world.stats.mountainCells > landCount * 0.16) warnings.push("Mountain mask cells cover more than 16% of land.");
  if (world.rivers.some((river) => hasDuplicateCells(river.path))) errors.push("A river path contains a loop.");
  if (world.rivers.length === 0) warnings.push("No rivers survived validation.");
  validateMountainRules(world, errors, warnings);

  const starterIsland = world.islands.find((island) => island.id === world.profile.startingIslandId);
  if (!starterIsland) errors.push(`Starter island ${world.profile.startingIslandId} is missing.`);
  const starterSettlement = world.poiList.find((poi) => poi.islandId === world.profile.startingIslandId && poi.role === "settlement");
  if (!starterSettlement) errors.push(`Starter island ${world.profile.startingIslandId} has no settlement.`);
  else if (!hasAdjacentWalkableToPoiFootprint(world, starterSettlement)) errors.push(`Starter settlement ${starterSettlement.id} has no walkable approach.`);

  for (const id of MAJOR_ISLAND_IDS) {
    const harbor = world.harbors.find((poi) => poi.islandId === id);
    if (!harbor) errors.push(`Major island ${id} has no harbor/travel point.`);
  }

  for (const poi of world.poiList) validatePoi(world, poi, errors);
  for (const edge of world.roadGraph.edges) {
    if (!edge.connected) warnings.push(`Road edge ${edge.from} -> ${edge.to} could not be connected.`);
  }
  validatePortRoadConnectivity(world, errors);
  validateBeachBuffer(world, errors);
  validateOverlaySpacingAndWalkability(world, errors);

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
  validatePoiFootprint(world, poi, errors);
  if (!hasAdjacentWalkableToPoiFootprint(world, poi)) errors.push(`POI ${poi.id} has no adjacent walkable approach cell.`);
  if (poi.type === "port" && !poiFootprintCells(poi).some((cell) => hasAdjacentWater(world, cell.x, cell.y, SEMANTIC_WATER.SHALLOW))) {
    errors.push(`Port ${poi.id} is not adjacent to shallow water.`);
  }
}

function validatePoiFootprint(world: SemanticWorld, poi: SemanticPoi, errors: string[]) {
  for (const cell of poiFootprintCells(poi)) {
    if (!inBounds(world, cell.x, cell.y)) {
      errors.push(`POI ${poi.id} footprint is out of bounds at ${cell.x},${cell.y}.`);
      continue;
    }
    const i = index(world.width, cell.x, cell.y);
    if (!world.layers.landMask[i] || world.layers.waterClass[i] !== SEMANTIC_WATER.NONE || world.layers.lakeMap[i] || world.layers.riverMap[i]) {
      errors.push(`POI ${poi.id} footprint touches invalid water terrain at ${cell.x},${cell.y}.`);
    }
    if (world.layers.mountainMap[i]) errors.push(`POI ${poi.id} footprint overlaps mountain terrain at ${cell.x},${cell.y}.`);
    if (world.layers.roadMap[i]) errors.push(`POI ${poi.id} footprint contains road terrain at ${cell.x},${cell.y}.`);
    if (world.layers.forestMap[i]) errors.push(`POI ${poi.id} footprint overlaps forest terrain at ${cell.x},${cell.y}.`);
    if (world.layers.overlayCollisionPolicy[i] !== "poiBlock") errors.push(`POI ${poi.id} footprint cell ${cell.x},${cell.y} is not tagged poiBlock.`);
    if (world.layers.walkability[i]) errors.push(`POI ${poi.id} footprint cell ${cell.x},${cell.y} is walkable.`);
  }
}

function validateMountainRules(world: SemanticWorld, errors: string[], warnings: string[]) {
  if (world.mountainDebug.singletonComponents > 0) errors.push(`Mountain cleanup left ${world.mountainDebug.singletonComponents} singleton component(s).`);
  for (const island of world.islands) {
    const islandMountains = world.mountains.filter((mountain) => mountain.islandId === island.id);
    const islandRanges = world.mountainRanges.filter((range) => range.islandId === island.id);
    const snowMountains = islandMountains.filter((mountain) => mountain.kind === "snow_mountain");
    if (!island.overlayRules.allowSnowMountains && snowMountains.length) {
      errors.push(`${island.id} has snow mountains but its theme does not allow them.`);
    }
    for (const mountain of snowMountains) {
      const i = index(world.width, mountain.x, mountain.y);
      if (world.layers.biome[i] !== SEMANTIC_BIOME.ICE) errors.push(`Snow mountain on ${island.id} at ${mountain.x},${mountain.y} is not on ice/snow terrain.`);
    }
    if (island.id === "highspire" && islandMountains.length < 24) warnings.push("Highspire has fewer than 24 mountain mask cells.");
    for (const range of islandRanges) {
      const minimumSize = minimumMountainComponentSize(island.id);
      if (range.cells.length < minimumSize) errors.push(`${range.id} has ${range.cells.length} mountain cells, below minimum ${minimumSize}.`);
      if (!rangeIsConnected(range.cells)) errors.push(`${range.id} is not a contiguous mountain component.`);
      if (!island.overlayRules.allowSnowMountains && range.kind === "snow_mountain") errors.push(`${range.id} is snowy but ${island.id} does not allow snow mountains.`);
      for (const cell of range.collisionCells) {
        const i = index(world.width, cell.x, cell.y);
        if (world.layers.mountainMap[i] !== 1) errors.push(`${range.id} collision cell ${cell.x},${cell.y} is missing from the mountain collision map.`);
      }
    }
  }
}

function minimumMountainComponentSize(islandId: string): number {
  if (islandId === "highspire") return 24;
  if (islandId === "frostmere") return 18;
  if (islandId === "greenhaven" || islandId === "coralreach") return 8;
  return 8;
}

function rangeIsConnected(cells: { x: number; y: number }[]): boolean {
  if (cells.length <= 1) return true;
  const keys = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
  const seen = new Set<string>();
  const queue = [cells[0]];
  seen.add(`${cells[0].x},${cells[0].y}`);
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head];
    for (const next of neighbors4(cell.x, cell.y)) {
      const key = `${next.x},${next.y}`;
      if (!keys.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen.size === cells.length;
}

function validatePortRoadConnectivity(world: SemanticWorld, errors: string[]) {
  for (const island of world.islands.filter((candidate) => candidate.major)) {
    const settlement = world.poiList.find((poi) => poi.islandId === island.id && poi.role === "settlement");
    const port = world.harbors.find((poi) => poi.islandId === island.id);
    if (!settlement || !port) continue;
    const edge = world.roadGraph.edges.find((candidate) => {
      return (candidate.from === settlement.id && candidate.to === port.id) || (candidate.from === port.id && candidate.to === settlement.id);
    });
    if (!edge?.connected) errors.push(`Port ${port.id} is not road-connected to settlement ${settlement.id}.`);
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

function validateOverlaySpacingAndWalkability(world: SemanticWorld, errors: string[]) {
  const bridgeKeys = new Set(world.bridgeCandidates.map((bridge) => `${bridge.x},${bridge.y}`));
  for (let i = 0; i < world.layers.forestMap.length; i += 1) {
    const x = i % world.width;
    const y = Math.floor(i / world.width);
    if (world.layers.forestMap[i] && !world.layers.walkability[i]) errors.push(`Forest soft-terrain cell blocks walking at ${x},${y}.`);
    if (world.layers.forestMap[i] && nearbyCount(world, world.layers.roadMap, x, y, 1) > 0) errors.push(`Forest overlaps or crowds a road corridor at ${x},${y}.`);
    if (world.layers.roadMap[i] && !world.layers.walkability[i]) errors.push(`Road cell is blocked by terrain or overlay at ${x},${y}.`);
    if (world.layers.roadMap[i] && world.layers.mountainMap[i]) errors.push(`Mountain overlaps road at ${x},${y}.`);
    if (world.layers.riverMap[i]) {
      const isBridge = bridgeKeys.has(`${x},${y}`);
      if (isBridge && !world.layers.walkability[i]) errors.push(`Bridge river crossing is blocked at ${x},${y}.`);
      if (!isBridge && world.layers.walkability[i]) errors.push(`Unbridged river cell is walkable at ${x},${y}.`);
    }
  }
  for (const poi of world.poiList) {
    const clearance = poi.role === "settlement" || poi.role === "port" ? 2 : 1;
    if (nearbyCount(world, world.layers.mountainMap, poi.x, poi.y, clearance) > 0) errors.push(`Mountain crowds POI ${poi.id}.`);
    if (nearbyCount(world, world.layers.forestMap, poi.x, poi.y, 1) > 0) errors.push(`Forest crowds POI ${poi.id}.`);
  }
}

function hasAdjacentWalkableToPoiFootprint(world: SemanticWorld, poi: SemanticPoi): boolean {
  const footprintKeys = new Set(poiFootprintCells(poi).map((cell) => `${cell.x},${cell.y}`));
  for (const cell of poiFootprintCells(poi)) {
    for (const next of neighbors4(cell.x, cell.y)) {
      if (!inBounds(world, next.x, next.y) || footprintKeys.has(`${next.x},${next.y}`)) continue;
      if (isWalkable(world, next.x, next.y)) return true;
    }
  }
  return false;
}

function poiFootprintCells(poi: SemanticPoi): { x: number; y: number }[] {
  const size = poi.role === "settlement" || poi.role === "final" ? 3 : 2;
  const offset = Math.floor((size - 1) / 2);
  const minX = poi.x - offset;
  const minY = poi.y - offset;
  const cells: { x: number; y: number }[] = [];
  for (let y = minY; y < minY + size; y += 1) {
    for (let x = minX; x < minX + size; x += 1) cells.push({ x, y });
  }
  return cells;
}

function isWalkable(world: SemanticWorld, x: number, y: number): boolean {
  return world.layers.walkability[index(world.width, x, y)] === 1;
}

function hasAdjacentWater(world: SemanticWorld, x: number, y: number, value: number): boolean {
  return neighbors4(x, y).some((next) => inBounds(world, next.x, next.y) && world.layers.waterClass[index(world.width, next.x, next.y)] === value);
}

function nearbyCount(world: SemanticWorld, map: Uint8Array, x: number, y: number, radius: number): number {
  let count = 0;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(world, xx, yy)) continue;
      if (Math.hypot(xx - x, yy - y) <= radius && map[index(world.width, xx, yy)]) count += 1;
    }
  }
  return count;
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
