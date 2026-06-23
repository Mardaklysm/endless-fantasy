import {
  SEMANTIC_BIOME,
  SEMANTIC_WATER,
  type MajorIslandId,
  type SemanticPoi,
  type SemanticWorld
} from "./semanticTypes.ts";
import {
  REQUIRED_MAJOR_HARBOR_ROUTE_PAIRS,
  findHarborWaterTile,
  harborPointFromPoi,
  isBoatNavigableTile,
  validateBoatPath
} from "./boatNavigation.ts";

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
  validateMajorIslandSeparation(world, errors);
  validateBoatRoutes(world, errors);

  for (const poi of world.poiList) validatePoi(world, poi, errors);
  for (const edge of world.roadGraph.edges) {
    if (!edge.connected) warnings.push(`Road edge ${edge.from} -> ${edge.to} could not be connected.`);
  }
  validatePortRoadConnectivity(world, errors);
  validateBeachBuffer(world, errors);
  validateOverlaySpacingAndWalkability(world, errors);
  validateRiverCrossings(world, errors);
  validateRiverConnectivity(world, errors);
  validateRoadShape(world, warnings);
  validateMountainShape(world, warnings);

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
  validatePoiRoadAnchor(world, poi, errors);
  validatePoiFootprint(world, poi, errors);
  if (!hasAdjacentWalkableToPoiFootprint(world, poi)) errors.push(`POI ${poi.id} has no adjacent walkable approach cell.`);
  if (poi.type === "port" && countPoiFootprintShallowWater(world, poi) < PORT_MIN_SHALLOW_WATER_TILES) {
    errors.push(`Port ${poi.id} does not place at least ${PORT_MIN_SHALLOW_WATER_TILES} footprint tiles in shallow water.`);
  }
}

function validatePoiFootprint(world: SemanticWorld, poi: SemanticPoi, errors: string[]) {
  for (const cell of poiFootprintCells(poi)) {
    if (!inBounds(world, cell.x, cell.y)) {
      errors.push(`POI ${poi.id} footprint is out of bounds at ${cell.x},${cell.y}.`);
      continue;
    }
    const i = index(world.width, cell.x, cell.y);
    if (poi.type === "port") {
      const isShallowWater = !world.layers.landMask[i] && world.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW;
      const isLand = world.layers.landMask[i] && world.layers.waterClass[i] === SEMANTIC_WATER.NONE;
      if ((!isLand && !isShallowWater) || world.layers.lakeMap[i] || world.layers.riverMap[i]) {
        errors.push(`POI ${poi.id} footprint touches invalid harbor terrain at ${cell.x},${cell.y}.`);
      }
    } else if (!world.layers.landMask[i] || world.layers.waterClass[i] !== SEMANTIC_WATER.NONE || world.layers.lakeMap[i] || world.layers.riverMap[i]) {
      errors.push(`POI ${poi.id} footprint touches invalid water terrain at ${cell.x},${cell.y}.`);
    }
    if (world.layers.mountainMap[i]) errors.push(`POI ${poi.id} footprint overlaps mountain terrain at ${cell.x},${cell.y}.`);
    if (world.layers.roadMap[i] && !isPoiEntranceTile(poi, cell.x, cell.y)) errors.push(`POI ${poi.id} footprint contains non-entrance road terrain at ${cell.x},${cell.y}.`);
    if (world.layers.forestMap[i]) errors.push(`POI ${poi.id} footprint overlaps forest terrain at ${cell.x},${cell.y}.`);
    if (world.layers.overlayCollisionPolicy[i] !== "poiBlock") errors.push(`POI ${poi.id} footprint cell ${cell.x},${cell.y} is not tagged poiBlock.`);
    if (world.layers.walkability[i]) errors.push(`POI ${poi.id} footprint cell ${cell.x},${cell.y} is walkable.`);
  }
}

function validatePoiRoadAnchor(world: SemanticWorld, poi: SemanticPoi, errors: string[]) {
  if (!isInsidePoiFootprint(poi, poi.entranceTile.x, poi.entranceTile.y)) errors.push(`POI ${poi.id} entrance tile is outside its footprint.`);
  if (isInsidePoiFootprint(poi, poi.approachTile.x, poi.approachTile.y)) errors.push(`POI ${poi.id} approach tile is inside its footprint.`);
  if (Math.abs(poi.entranceTile.x - poi.approachTile.x) + Math.abs(poi.entranceTile.y - poi.approachTile.y) !== 1) {
    errors.push(`POI ${poi.id} approach tile is not adjacent to its entrance tile.`);
  }
  if (!inBounds(world, poi.entranceTile.x, poi.entranceTile.y)) errors.push(`POI ${poi.id} entrance tile is out of bounds.`);
  if (!inBounds(world, poi.approachTile.x, poi.approachTile.y)) errors.push(`POI ${poi.id} approach tile is out of bounds.`);
  if (inBounds(world, poi.approachTile.x, poi.approachTile.y) && !isWalkable(world, poi.approachTile.x, poi.approachTile.y)) {
    errors.push(`POI ${poi.id} approach tile is not walkable.`);
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

function validateBoatRoutes(world: SemanticWorld, errors: string[]) {
  const harborByIsland = new Map(world.harbors.map((harbor) => [harbor.islandId, harbor]));
  for (const id of MAJOR_ISLAND_IDS) {
    const harbor = harborByIsland.get(id);
    if (!harbor) continue;
    if (!hasAdjacentWalkableToPoiFootprint(world, harbor)) errors.push(`Harbor ${harbor.id} has no walkable land arrival tile.`);
    const waterTile = findHarborWaterTile(world, harborPointFromPoi(harbor), undefined, 16);
    if (!waterTile) errors.push(`Harbor ${harbor.id} has no valid boat embark water tile.`);
  }

  for (const [fromIslandId, toIslandId] of REQUIRED_MAJOR_HARBOR_ROUTE_PAIRS) {
    const route = world.boatRoutes.find((candidate) => {
      return (
        (candidate.fromIslandId === fromIslandId && candidate.toIslandId === toIslandId) ||
        (candidate.fromIslandId === toIslandId && candidate.toIslandId === fromIslandId)
      );
    });
    if (!route) {
      errors.push(`Missing required boat route ${fromIslandId} <-> ${toIslandId}.`);
      continue;
    }
    for (const error of validateBoatPath(world, route.path)) errors.push(`${route.fromHarborId} -> ${route.toHarborId}: ${error}`);
    for (let i = 1; i < route.waypoints.length; i += 1) {
      if (!isLegalWaypointSegment(route.waypoints[i - 1], route.waypoints[i])) {
        errors.push(`Boat route ${route.fromHarborId} -> ${route.toHarborId} has arbitrary-angle waypoint segment.`);
      }
    }
    for (const cell of route.path) {
      const i = index(world.width, cell.x, cell.y);
      if (!world.layers.reservedBoatRouteMap[i]) errors.push(`Boat route ${route.fromHarborId} -> ${route.toHarborId} is not reserved at ${cell.x},${cell.y}.`);
      if (!isBoatNavigableTile(world, cell.x, cell.y)) errors.push(`Boat route ${route.fromHarborId} -> ${route.toHarborId} crosses blocked terrain at ${cell.x},${cell.y}.`);
    }
  }
}

function validateMajorIslandSeparation(world: SemanticWorld, errors: string[]) {
  const components = majorIslandComponents(world);
  if (components.length !== 4) errors.push(`Expected exactly 4 separated major island land components, got ${components.length}.`);
  for (let a = 0; a < components.length; a += 1) {
    for (let b = a + 1; b < components.length; b += 1) {
      const gap = minimumChebyshevGap(components[a].cells, components[b].cells);
      if (gap < 10) {
        errors.push(`Major islands ${components[a].ids.join("+")} and ${components[b].ids.join("+")} have only ${gap} open-sea tile(s) between them.`);
      }
    }
  }
}

function majorIslandComponents(world: SemanticWorld): { ids: string[]; cells: { x: number; y: number }[] }[] {
  const majorIds = new Set<MajorIslandId>(MAJOR_ISLAND_IDS);
  const seen = new Uint8Array(world.width * world.height);
  const components: { ids: string[]; cells: { x: number; y: number }[] }[] = [];
  for (let i = 0; i < world.layers.landMask.length; i += 1) {
    if (!world.layers.landMask[i] || seen[i]) continue;
    const islandId = world.islandIndexToId.get(world.layers.islandId[i]);
    if (!majorIds.has(islandId as MajorIslandId)) continue;
    const ids = new Set<string>();
    const cells: { x: number; y: number }[] = [];
    const queue = [{ x: i % world.width, y: Math.floor(i / world.width) }];
    seen[i] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      const ci = index(world.width, cell.x, cell.y);
      const id = world.islandIndexToId.get(world.layers.islandId[ci]);
      if (id) ids.add(id);
      cells.push(cell);
      for (const next of neighbors4(cell.x, cell.y)) {
        if (!inBounds(world, next.x, next.y)) continue;
        const ni = index(world.width, next.x, next.y);
        if (seen[ni] || !world.layers.landMask[ni]) continue;
        const nextIslandId = world.islandIndexToId.get(world.layers.islandId[ni]);
        if (!majorIds.has(nextIslandId as MajorIslandId)) continue;
        seen[ni] = 1;
        queue.push(next);
      }
    }
    components.push({ ids: [...ids].sort(), cells });
  }
  return components;
}

function minimumChebyshevGap(a: { x: number; y: number }[], b: { x: number; y: number }[]): number {
  let best = Infinity;
  for (const ca of a) {
    for (const cb of b) {
      const distance = Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y)) - 1;
      if (distance < best) best = distance;
    }
  }
  return Math.max(0, best);
}

function isLegalWaypointSegment(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  return (dx !== 0 || dy !== 0) && (dx === 0 || dy === 0 || dx === dy);
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
    if (world.layers.forestMap[i] && nearbyWaterFeature(world, x, y, 1)) errors.push(`Forest cell crowds water at ${x},${y}.`);
    if (world.layers.forestMap[i] && nearbyCount(world, world.layers.roadMap, x, y, 1) > 0) errors.push(`Forest overlaps or crowds a road corridor at ${x},${y}.`);
    if (world.layers.roadMap[i] && !world.layers.walkability[i] && !isPoiEntranceRoadCell(world, x, y)) errors.push(`Road cell is blocked by terrain or overlay at ${x},${y}.`);
    if (world.layers.roadMap[i] && world.layers.mountainMap[i]) errors.push(`Mountain overlaps road at ${x},${y}.`);
    if (world.layers.riverMap[i]) {
      const isBridge = bridgeKeys.has(`${x},${y}`);
      if (isBridge && !world.layers.walkability[i]) errors.push(`Bridge river crossing is blocked at ${x},${y}.`);
      if (!isBridge && world.layers.walkability[i]) errors.push(`Unbridged river cell is walkable at ${x},${y}.`);
    }
    if (world.layers.riverCrossingMap[i] && !bridgeKeys.has(`${x},${y}`)) errors.push(`River crossing map contains non-bridge cell at ${x},${y}.`);
  }
  for (const poi of world.poiList) {
    const clearance = poi.role === "settlement" || poi.role === "port" ? 2 : 1;
    if (nearbyCount(world, world.layers.mountainMap, poi.x, poi.y, clearance) > 0) errors.push(`Mountain crowds POI ${poi.id}.`);
    if (nearbyCount(world, world.layers.forestMap, poi.x, poi.y, 1) > 0) errors.push(`Forest crowds POI ${poi.id}.`);
  }
}

function validateRiverCrossings(world: SemanticWorld, errors: string[]) {
  const bridgeKeys = new Set(world.bridgeCandidates.map((bridge) => `${bridge.x},${bridge.y}`));
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = index(world.width, x, y);
      if (world.layers.roadMap[i] && world.layers.riverMap[i] && !bridgeKeys.has(`${x},${y}`)) {
        errors.push(`Road overlaps normal river water without a crossing at ${x},${y}.`);
      }
    }
  }
  for (const bridge of world.bridgeCandidates) {
    const i = index(world.width, bridge.x, bridge.y);
    if (!world.layers.roadMap[i] || !world.layers.riverMap[i]) errors.push(`Bridge ${bridge.id} is not on a road-river overlap.`);
    if (!world.layers.riverCrossingMap[i]) errors.push(`Bridge ${bridge.id} is missing from riverCrossingMap.`);
    if (world.layers.waterClass[i] !== SEMANTIC_WATER.NONE || !world.layers.landMask[i]) errors.push(`Bridge ${bridge.id} is on ocean/coast water.`);
    const orientation = crossingOrientationAt(world, bridge.x, bridge.y);
    if (!orientation) errors.push(`Bridge ${bridge.id} is not on a straight one-tile river segment.`);
    else if (orientation !== bridge.orientation) errors.push(`Bridge ${bridge.id} orientation ${bridge.orientation} does not match river crossing ${orientation}.`);
    if (!hasCrossingRoadContinuation(world, bridge.x, bridge.y, bridge.orientation)) errors.push(`Bridge ${bridge.id} lacks road continuation on both sides.`);
  }
}

function validateRiverConnectivity(world: SemanticWorld, errors: string[]) {
  for (const river of world.rivers) {
    if (!river.path.length) {
      errors.push(`River ${river.id} has an empty path.`);
      continue;
    }
    for (let i = 1; i < river.path.length; i += 1) {
      if (Math.abs(river.path[i].x - river.path[i - 1].x) + Math.abs(river.path[i].y - river.path[i - 1].y) !== 1) {
        errors.push(`River ${river.id} is disconnected between ${river.path[i - 1].x},${river.path[i - 1].y} and ${river.path[i].x},${river.path[i].y}.`);
      }
    }
  }
}

function validateRoadShape(world: SemanticWorld, warnings: string[]) {
  let roadCells = 0;
  let twoByTwoBlocks = 0;
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = index(world.width, x, y);
      if (world.layers.roadMap[i]) roadCells += 1;
      if (x >= world.width - 1 || y >= world.height - 1) continue;
      if (
        world.layers.roadMap[i] &&
        world.layers.roadMap[index(world.width, x + 1, y)] &&
        world.layers.roadMap[index(world.width, x, y + 1)] &&
        world.layers.roadMap[index(world.width, x + 1, y + 1)]
      ) {
        twoByTwoBlocks += 1;
      }
    }
  }
  if (roadCells > 0 && twoByTwoBlocks / roadCells > 0.035) warnings.push(`Road mask has ${twoByTwoBlocks} dense 2x2 block(s), suggesting roads are getting too wide.`);
}

function validateMountainShape(world: SemanticWorld, warnings: string[]) {
  for (const range of world.mountainRanges) {
    if (range.cells.length < 10) continue;
    const width = range.bounds.maxX - range.bounds.minX + 1;
    const height = range.bounds.maxY - range.bounds.minY + 1;
    const rectArea = width * height;
    const fillRatio = range.cells.length / Math.max(1, rectArea);
    const edgeCells = range.cells.filter((cell) => maskNeighborCount(world, world.layers.mountainMap, cell.x, cell.y) < 4).length;
    if (rectArea >= 12 && fillRatio > 0.88) warnings.push(`${range.id} is ${Math.round(fillRatio * 100)}% rectangle-filled; mountain outline may be too grid-like.`);
    if (edgeCells / range.cells.length < 0.24) warnings.push(`${range.id} has very few edge cells; mountain cluster may be too solid.`);
  }
}

function crossingOrientationAt(world: SemanticWorld, x: number, y: number): "horizontal" | "vertical" | undefined {
  const north = isRiverTile(world, x, y - 1);
  const east = isRiverTile(world, x + 1, y);
  const south = isRiverTile(world, x, y + 1);
  const west = isRiverTile(world, x - 1, y);
  if (north && south && !east && !west) return "horizontal";
  if (east && west && !north && !south) return "vertical";
  return undefined;
}

function hasCrossingRoadContinuation(world: SemanticWorld, x: number, y: number, orientation: "horizontal" | "vertical"): boolean {
  const cells = orientation === "horizontal" ? [{ x: x - 1, y }, { x: x + 1, y }] : [{ x, y: y - 1 }, { x, y: y + 1 }];
  return cells.every((cell) => inBounds(world, cell.x, cell.y) && world.layers.roadMap[index(world.width, cell.x, cell.y)] === 1 && world.layers.riverMap[index(world.width, cell.x, cell.y)] === 0);
}

function isRiverTile(world: SemanticWorld, x: number, y: number): boolean {
  return inBounds(world, x, y) && world.layers.riverMap[index(world.width, x, y)] === 1;
}

function maskNeighborCount(world: SemanticWorld, map: Uint8Array, x: number, y: number): number {
  let count = 0;
  for (const next of neighbors4(x, y)) {
    if (inBounds(world, next.x, next.y) && map[index(world.width, next.x, next.y)]) count += 1;
  }
  return count;
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
  const cells: { x: number; y: number }[] = [];
  for (let y = poi.footprint.minY; y <= poi.footprint.maxY; y += 1) {
    for (let x = poi.footprint.minX; x <= poi.footprint.maxX; x += 1) cells.push({ x, y });
  }
  return cells;
}

function isInsidePoiFootprint(poi: SemanticPoi, x: number, y: number): boolean {
  return x >= poi.footprint.minX && x <= poi.footprint.maxX && y >= poi.footprint.minY && y <= poi.footprint.maxY;
}

function isPoiEntranceTile(poi: SemanticPoi, x: number, y: number): boolean {
  return poi.entranceTile.x === x && poi.entranceTile.y === y;
}

function isPoiEntranceRoadCell(world: SemanticWorld, x: number, y: number): boolean {
  return world.poiList.some((poi) => isPoiEntranceTile(poi, x, y));
}

const PORT_MIN_SHALLOW_WATER_TILES = 3;

function countPoiFootprintShallowWater(world: SemanticWorld, poi: SemanticPoi): number {
  let waterTiles = 0;
  for (const cell of poiFootprintCells(poi)) {
    if (!inBounds(world, cell.x, cell.y)) continue;
    if (world.layers.waterClass[index(world.width, cell.x, cell.y)] === SEMANTIC_WATER.SHALLOW) waterTiles += 1;
  }
  return waterTiles;
}

function isWalkable(world: SemanticWorld, x: number, y: number): boolean {
  return world.layers.walkability[index(world.width, x, y)] === 1;
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

function nearbyWaterFeature(world: SemanticWorld, x: number, y: number, radius: number): boolean {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(world, xx, yy)) continue;
      const i = index(world.width, xx, yy);
      if (world.layers.waterClass[i] !== SEMANTIC_WATER.NONE || world.layers.lakeMap[i] || world.layers.riverMap[i]) return true;
    }
  }
  return false;
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
