import {
  CLASSIC_GRASSLAND_OBJECTS_BY_CATEGORY,
  CLASSIC_GRASSLAND_SELECTED_ASSET_COUNTS,
  CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY,
  CLASSIC_WORLD_TILE_IDS,
  classicWorldObjectFor,
  classicWorldTileFor,
  type ClassicWorldBiome,
  type ClassicWorldEncounterFamily,
  type ClassicWorldObjectId,
  type ClassicWorldTileId,
} from "./classicGrasslandRegionCatalog.ts";

export const DEFAULT_WORLD_WIDTH = 64;
export const DEFAULT_WORLD_HEIGHT = 40;

export interface WorldVec {
  x: number;
  y: number;
}

export type WorldPoiKind = "town" | "dungeon" | "gate" | "final";

export interface WorldPoi {
  id: string;
  name: string;
  kind: WorldPoiKind;
  x: number;
  y: number;
  footprint: number;
  objectId?: ClassicWorldObjectId;
}

export interface WorldEntryTrigger {
  poiId: string;
  x: number;
  y: number;
}

export interface WorldBridge extends WorldVec {
  orientation: "horizontal" | "vertical";
  material: "wood" | "stone";
}

export interface WorldOverlay {
  id: string;
  assetId: ClassicWorldObjectId;
  x: number;
  y: number;
  footprint: { widthTiles: number; heightTiles: number };
  blocksMovement: boolean;
  entry?: WorldVec;
  layer: "forest" | "mountain" | "poi" | "dock" | "decoration";
}

export interface WorldValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  reachablePoiIds: string[];
  biomeCounts: Record<string, number>;
}

export interface ClassicIslandCompositionStats {
  landTiles: number;
  waterTiles: number;
  shoreTiles: number;
  forestClusterCount: number;
  mountainClusterCount: number;
  poiCount: number;
  pathLength: number;
  satelliteIslandCount: number;
  selectedAssetCounts: typeof CLASSIC_GRASSLAND_SELECTED_ASSET_COUNTS;
}

export interface GeneratedWorld {
  mode: "classicIsland";
  width: number;
  height: number;
  seed: string;
  tiles: ClassicWorldTileId[][];
  biomes: ClassicWorldBiome[][];
  pois: WorldPoi[];
  overlays: WorldOverlay[];
  roads: WorldVec[];
  rivers: WorldVec[][];
  bridges: WorldBridge[];
  startPosition: WorldVec;
  entryTriggers: WorldEntryTrigger[];
  validation: WorldValidationResult;
  composition: ClassicIslandCompositionStats;
}

interface IslandMask {
  land: boolean[][];
  mainLand: Set<string>;
  satelliteIslandCount: number;
}

interface PoiBlueprint {
  id: string;
  name: string;
  kind: WorldPoiKind;
  objectId: ClassicWorldObjectId;
  target: WorldVec;
  footprint: { widthTiles: number; heightTiles: number };
  prefer: "clear" | "forest" | "mountain" | "coast";
}

const CLASSIC_POI_BLUEPRINTS: PoiBlueprint[] = [
  {
    id: "start_village",
    name: "Start Village",
    kind: "town",
    objectId: "classic_region_village_small_blue_01",
    target: { x: 0.26, y: 0.58 },
    footprint: { widthTiles: 4, heightTiles: 3 },
    prefer: "clear",
  },
  {
    id: "forest_village",
    name: "Forest Village",
    kind: "town",
    objectId: "classic_region_village_small_red_01",
    target: { x: 0.68, y: 0.63 },
    footprint: { widthTiles: 4, heightTiles: 3 },
    prefer: "forest",
  },
  {
    id: "mountain_cave",
    name: "Mountain Cave",
    kind: "dungeon",
    objectId: "classic_region_cave_mountain_entrance_01",
    target: { x: 0.56, y: 0.28 },
    footprint: { widthTiles: 3, heightTiles: 2 },
    prefer: "mountain",
  },
  {
    id: "castle_or_keep",
    name: "Castle Keep",
    kind: "town",
    objectId: "classic_region_castle_or_town_01",
    target: { x: 0.46, y: 0.45 },
    footprint: { widthTiles: 4, heightTiles: 4 },
    prefer: "clear",
  },
  {
    id: "port_or_dock",
    name: "Harbor Dock",
    kind: "town",
    objectId: "classic_region_dock_or_port_01",
    target: { x: 0.78, y: 0.72 },
    footprint: { widthTiles: 2, heightTiles: 1 },
    prefer: "coast",
  },
  {
    id: "shrine_or_landmark",
    name: "Old Shrine",
    kind: "dungeon",
    objectId: "classic_region_special_landmark_02",
    target: { x: 0.32, y: 0.25 },
    footprint: { widthTiles: 3, heightTiles: 4 },
    prefer: "clear",
  },
];

const GRASS_BASE = CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY.grassBase.map((tile) => tile.id);
const GRASS_VARIANTS = CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY.grassVariants.map((tile) => tile.id);
const FOREST_GROUND = CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY.forestGround.map((tile) => tile.id);
const SHORE = CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY.shore.map((tile) => tile.id);
const SHALLOW_WATER = CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY.shallowWater.map((tile) => tile.id);
const DEEP_WATER = CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY.deepWater.map((tile) => tile.id);
const MOUNTAIN_BASE = CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY.mountainBase.map((tile) => tile.id);
const PATH = CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY.path.map((tile) => tile.id);

const FOREST_OVERLAYS = [
  ...CLASSIC_GRASSLAND_OBJECTS_BY_CATEGORY.forestClusters,
  ...CLASSIC_GRASSLAND_OBJECTS_BY_CATEGORY.smallTreeClusters,
].map((object) => object.id);
const MOUNTAIN_OVERLAYS = [
  ...CLASSIC_GRASSLAND_OBJECTS_BY_CATEGORY.mountainTops,
  ...CLASSIC_GRASSLAND_OBJECTS_BY_CATEGORY.mountainDetails,
].map((object) => object.id);

export function createWorldSeed(): string {
  return `classic-island-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}

export function generateWorld(options: { seed?: string; width?: number; height?: number; maxAttempts?: number } = {}): GeneratedWorld {
  const baseSeed = options.seed ?? createWorldSeed();
  const width = options.width ?? DEFAULT_WORLD_WIDTH;
  const height = options.height ?? DEFAULT_WORLD_HEIGHT;
  const maxAttempts = options.maxAttempts ?? 24;
  let lastWorld: GeneratedWorld | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = attempt === 0 ? baseSeed : `${baseSeed}:${attempt}`;
    const world = generateWorldAttempt(seed, width, height);
    world.validation = validateGeneratedWorld(world);
    lastWorld = world;
    if (world.validation.valid) return world;
  }

  const errors = lastWorld?.validation.errors.join("; ") || "unknown validation failure";
  throw new Error(`Unable to generate a valid classic island world after ${maxAttempts} attempts: ${errors}`);
}

export function getWorldTileAt(world: GeneratedWorld, x: number, y: number): ClassicWorldTileId | undefined {
  return world.tiles[y]?.[x];
}

export function isWorldPositionWalkable(world: GeneratedWorld, x: number, y: number): boolean {
  const tile = getWorldTileAt(world, x, y);
  if (!tile || !isClassicTileWalkable(tile)) return false;
  return !classicOverlayBlocksTile(world, x, y);
}

export function getPoiAt(world: GeneratedWorld, x: number, y: number): WorldPoi | undefined {
  return world.pois.find((poi) => pointInPoiFootprint(poi, x, y));
}

export function worldEncounterFamilyForTile(tileId: ClassicWorldTileId): ClassicWorldEncounterFamily | undefined {
  return classicWorldTileFor(tileId)?.encounterFamily;
}

export function classicOverlayBlocksTile(world: GeneratedWorld, x: number, y: number): boolean {
  return world.overlays.some((overlay) => {
    if (!overlay.blocksMovement) return false;
    if (overlay.entry && overlay.entry.x === x && overlay.entry.y === y) return false;
    return pointInOverlayFootprint(overlay, x, y);
  });
}

export function validateGeneratedWorld(world: GeneratedWorld): WorldValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const biomeCounts: Record<string, number> = {};
  let walkableCount = 0;
  let waterCount = 0;
  let mountainCount = 0;

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[y][x];
      const definition = classicWorldTileFor(tile);
      const biome = definition?.biome ?? "unknown";
      biomeCounts[biome] = (biomeCounts[biome] ?? 0) + 1;
      if (isWorldPositionWalkable(world, x, y)) walkableCount += 1;
      if (classicTileHasTag(tile, "water")) waterCount += 1;
      if (classicTileHasTag(tile, "mountain")) mountainCount += 1;
    }
  }

  if (!isWorldPositionWalkable(world, world.startPosition.x, world.startPosition.y)) {
    errors.push("Classic player_start is not walkable.");
  }
  if (walkableCount < world.width * world.height * 0.2) errors.push("Classic island has too little walkable land.");
  if (waterCount < world.width * world.height * 0.3) errors.push("Classic island does not have enough surrounding ocean.");
  if (mountainCount < 8) warnings.push("Classic island generated very few mountain tiles.");
  if (world.pois.length > 6) errors.push("Classic island should not force the old ten-POI progression layout.");

  for (const poi of world.pois) {
    const tile = getWorldTileAt(world, poi.x, poi.y);
    if (!tile) errors.push(`${poi.name} is outside the map.`);
    else if (classicTileHasTag(tile, "water")) errors.push(`${poi.name} is on water.`);
    if (!isWorldPositionWalkable(world, poi.x, poi.y)) errors.push(`${poi.name} entry tile is blocked.`);
  }

  const reachable = floodReachable(world, world.startPosition);
  const reachablePoiIds = world.pois.filter((poi) => reachable.has(posKey(poi))).map((poi) => poi.id);
  for (const poi of world.pois) {
    if (!reachablePoiIds.includes(poi.id)) errors.push(`${poi.name} is not reachable from player_start.`);
  }

  return { valid: errors.length === 0, errors, warnings, reachablePoiIds, biomeCounts };
}

export function buildWorldDebugReport(world: GeneratedWorld): string {
  const validation = world.validation.valid ? "valid" : "invalid";
  const poiLines = world.pois
    .map((poi) => `- ${poi.name} (${poi.id}, ${poi.kind}) entry ${poi.x},${poi.y}, object ${poi.objectId ?? "none"}`)
    .join("\n");
  const biomeLines = Object.entries(world.validation.biomeCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([biome, count]) => `- ${biome}: ${count}`)
    .join("\n");
  const categoryLines = Object.entries(CLASSIC_GRASSLAND_SELECTED_ASSET_COUNTS.byTerrainCategory)
    .map(([category, count]) => `- terrain.${category}: ${count}`)
    .concat(
      Object.entries(CLASSIC_GRASSLAND_SELECTED_ASSET_COUNTS.byObjectCategory).map(
        ([category, count]) => `- overlays.${category}: ${count}`,
      ),
    )
    .join("\n");
  const landPct = ((world.composition.landTiles / (world.width * world.height)) * 100).toFixed(1);
  const waterPct = ((world.composition.waterTiles / (world.width * world.height)) * 100).toFixed(1);

  return `# Classic Island Worldgen Report

Worldgen mode: \`classicIsland\`
Seed: \`${world.seed}\`
Map size: ${world.width}x${world.height}
Validation: ${validation}
Player start: ${world.startPosition.x},${world.startPosition.y}
Land/water: ${landPct}% land, ${waterPct}% water
Shore tiles: ${world.composition.shoreTiles}
Forest clusters: ${world.composition.forestClusterCount}
Mountain clusters: ${world.composition.mountainClusterCount}
POIs: ${world.composition.poiCount}
Path length: ${world.composition.pathLength}
Satellite islands: ${world.composition.satelliteIslandCount}
Using full 1885 classic pool directly: false
Legacy ten POI layout: false

## Classic POIs

${poiLines}

## Biome Counts

${biomeLines}

## Selected 7+10 Asset Counts

${categoryLines}

## Reachability

Reachable POIs: ${world.validation.reachablePoiIds.join(", ")}

## Validation Errors

${world.validation.errors.map((error) => `- ${error}`).join("\n") || "- none"}

## Validation Warnings

${world.validation.warnings.map((warning) => `- ${warning}`).join("\n") || "- none"}
`;
}

function generateWorldAttempt(seed: string, width: number, height: number): GeneratedWorld {
  const rng = makeRng(seed);
  const mask = createIslandMask(seed, width, height);
  const tiles = buildBaseTerrain(seed, mask, width, height);
  const biomes = tiles.map((row) => row.map((tile) => classicWorldTileFor(tile)?.biome ?? "grassland"));
  const overlays: WorldOverlay[] = [];
  const protectedTiles = new Set<string>();
  const roads: WorldVec[] = [];
  const rivers: WorldVec[][] = [];
  const bridges: WorldBridge[] = [];

  const mountainClusterCount = placeMountainClusters(seed, tiles, biomes, mask, overlays, protectedTiles, rng);
  const forestClusterCount = placeForestClusters(seed, tiles, biomes, mask, overlays, protectedTiles, rng);
  const pois = placeClassicPois(seed, tiles, biomes, mask, overlays, protectedTiles, rng);
  carvePoiClearings(tiles, biomes, pois, overlays);
  const startVillage = pois.find((poi) => poi.id === "start_village") ?? pois[0];
  const startPosition = findStartPosition(tiles, overlays, startVillage);
  protectedTiles.add(posKey(startPosition));
  connectPaths(seed, tiles, biomes, overlays, pois, startPosition, roads);
  const entryTriggers = pois.map((poi) => ({ poiId: poi.id, x: poi.x, y: poi.y }));
  const composition = buildCompositionStats(tiles, forestClusterCount, mountainClusterCount, pois, roads, mask);

  return {
    mode: "classicIsland",
    width,
    height,
    seed,
    tiles,
    biomes,
    pois,
    overlays,
    roads,
    rivers,
    bridges,
    startPosition,
    entryTriggers,
    validation: { valid: false, errors: [], warnings: [], reachablePoiIds: [], biomeCounts: {} },
    composition,
  };
}

function createIslandMask(seed: string, width: number, height: number): IslandMask {
  const rng = makeRng(`${seed}:islands`);
  const blobs = [
    { x: 0.48 + (rng() - 0.5) * 0.08, y: 0.5 + (rng() - 0.5) * 0.08, rx: 0.34, ry: 0.32 },
    { x: 0.28 + rng() * 0.08, y: 0.56 + (rng() - 0.5) * 0.12, rx: 0.18, ry: 0.16 },
    { x: 0.65 + rng() * 0.08, y: 0.42 + (rng() - 0.5) * 0.14, rx: 0.18, ry: 0.16 },
  ];
  const satelliteCount = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < satelliteCount; i += 1) {
    blobs.push({
      x: rng() < 0.5 ? 0.12 + rng() * 0.18 : 0.75 + rng() * 0.16,
      y: 0.18 + rng() * 0.68,
      rx: 0.06 + rng() * 0.05,
      ry: 0.05 + rng() * 0.05,
    });
  }

  let land = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (x < 2 || y < 2 || x > width - 3 || y > height - 3) return false;
      const nx = x / Math.max(1, width - 1);
      const ny = y / Math.max(1, height - 1);
      const best = Math.min(
        ...blobs.map((blob) => ((nx - blob.x) / blob.rx) ** 2 + ((ny - blob.y) / blob.ry) ** 2),
      );
      const edgeNoise = fbm(`${seed}:coast`, nx * 5.4, ny * 5.4, 4, 2.1) - 0.5;
      return best < 1 + edgeNoise * 0.78;
    }),
  );

  for (let i = 0; i < 3; i += 1) land = smoothLandMask(land);
  const components = findLandComponents(land);
  components.sort((a, b) => b.length - a.length);
  const keep = new Set<string>();
  for (const [index, component] of components.entries()) {
    if (index === 0 || component.length >= 8) {
      for (const tile of component) keep.add(posKey(tile));
    }
  }
  land = land.map((row, y) => row.map((value, x) => value && keep.has(posKey({ x, y }))));
  const finalComponents = findLandComponents(land).sort((a, b) => b.length - a.length);
  const mainLand = new Set(finalComponents[0]?.map(posKey) ?? []);
  return { land, mainLand, satelliteIslandCount: Math.max(0, finalComponents.length - 1) };
}

function smoothLandMask(land: boolean[][]): boolean[][] {
  const height = land.length;
  const width = land[0]?.length ?? 0;
  return land.map((row, y) =>
    row.map((value, x) => {
      if (x < 2 || y < 2 || x > width - 3 || y > height - 3) return false;
      const neighbors = neighbors8(x, y).filter((tile) => land[tile.y]?.[tile.x]).length;
      if (value) return neighbors >= 3;
      return neighbors >= 5;
    }),
  );
}

function buildBaseTerrain(seed: string, mask: IslandMask, width: number, height: number): ClassicWorldTileId[][] {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x): ClassicWorldTileId => {
      const pos = { x, y };
      const noise = fbm(`${seed}:terrain`, x / 8, y / 8, 3, 2);
      if (!mask.land[y][x]) {
        const distance = distanceToLand(mask.land, x, y, 3);
        return pickFrom(distance <= 2 ? SHALLOW_WATER : DEEP_WATER, x, y, noise);
      }
      if (isShoreCell(mask.land, x, y)) return pickFrom(SHORE, x, y, noise);
      if (noise > 0.86) return pickFrom(GRASS_VARIANTS, x, y, noise);
      return pickFrom(GRASS_BASE, x, y, noise);
    }),
  );
}

function placeForestClusters(
  seed: string,
  tiles: ClassicWorldTileId[][],
  biomes: ClassicWorldBiome[][],
  mask: IslandMask,
  overlays: WorldOverlay[],
  protectedTiles: Set<string>,
  rng: () => number,
): number {
  const clusterCount = 5 + Math.floor(rng() * 4);
  let placed = 0;
  for (let i = 0; i < clusterCount; i += 1) {
    const center = findInlandTile(mask, tiles, protectedTiles, rng, i % 2 ? "any" : "nearMountain");
    if (!center) continue;
    const radius = 3 + Math.floor(rng() * 3);
    placed += 1;
    for (let y = center.y - radius; y <= center.y + radius; y += 1) {
      for (let x = center.x - radius; x <= center.x + radius; x += 1) {
        if (!tiles[y]?.[x] || !mask.mainLand.has(posKey({ x, y }))) continue;
        if (protectedTiles.has(posKey({ x, y })) || isShoreOrWater(tiles[y][x])) continue;
        const d = Math.hypot(x - center.x, y - center.y);
        if (d > radius + (hashNoise(seed, x, y, i) - 0.5) * 1.6) continue;
        tiles[y][x] = pickFrom(FOREST_GROUND, x, y, hashNoise(`${seed}:forest`, x, y, i));
        biomes[y][x] = "forest";
        if (hashNoise(`${seed}:forestOverlay`, x, y, i) > 0.42) {
          const assetId = pickFrom(FOREST_OVERLAYS, x, y, hashNoise(`${seed}:forestObject`, x, y, i));
          overlays.push({
            id: `forest_${i}_${x}_${y}`,
            assetId,
            x,
            y,
            footprint: { widthTiles: 1, heightTiles: 1 },
            blocksMovement: false,
            layer: "forest",
          });
        }
      }
    }
  }
  return placed;
}

function placeMountainClusters(
  seed: string,
  tiles: ClassicWorldTileId[][],
  biomes: ClassicWorldBiome[][],
  mask: IslandMask,
  overlays: WorldOverlay[],
  protectedTiles: Set<string>,
  rng: () => number,
): number {
  const clusterCount = 2 + Math.floor(rng() * 2);
  let placed = 0;
  for (let i = 0; i < clusterCount; i += 1) {
    const center = findInlandTile(mask, tiles, protectedTiles, rng, "any");
    if (!center) continue;
    const radius = 2 + Math.floor(rng() * 2);
    placed += 1;
    for (let y = center.y - radius; y <= center.y + radius; y += 1) {
      for (let x = center.x - radius; x <= center.x + radius; x += 1) {
        if (!tiles[y]?.[x] || !mask.mainLand.has(posKey({ x, y }))) continue;
        if (protectedTiles.has(posKey({ x, y })) || isShoreOrWater(tiles[y][x])) continue;
        const d = Math.hypot(x - center.x, y - center.y);
        if (d > radius - 0.25 + (hashNoise(seed, x, y, i) - 0.5) * 0.8) continue;
        tiles[y][x] = pickFrom(MOUNTAIN_BASE, x, y, hashNoise(`${seed}:mountain`, x, y, i));
        biomes[y][x] = "mountain";
        if (hashNoise(`${seed}:mountainOverlay`, x, y, i) > 0.5) {
          overlays.push({
            id: `mountain_${i}_${x}_${y}`,
            assetId: pickFrom(MOUNTAIN_OVERLAYS, x, y, hashNoise(`${seed}:mountainObject`, x, y, i)),
            x,
            y,
            footprint: { widthTiles: 1, heightTiles: 1 },
            blocksMovement: false,
            layer: "mountain",
          });
        }
      }
    }
  }
  return placed;
}

function placeClassicPois(
  seed: string,
  tiles: ClassicWorldTileId[][],
  biomes: ClassicWorldBiome[][],
  mask: IslandMask,
  overlays: WorldOverlay[],
  protectedTiles: Set<string>,
  rng: () => number,
): WorldPoi[] {
  const pois: WorldPoi[] = [];
  for (const blueprint of CLASSIC_POI_BLUEPRINTS) {
    const entry = findPoiEntry(blueprint, tiles, mask, protectedTiles, rng);
    const poi: WorldPoi = {
      id: blueprint.id,
      name: blueprint.name,
      kind: blueprint.kind,
      x: entry.x,
      y: entry.y,
      footprint: 1,
      objectId: blueprint.objectId,
    };
    pois.push(poi);
    const object = classicWorldObjectFor(blueprint.objectId);
    const footprint = object?.footprint ?? blueprint.footprint;
    const overlayCenter = {
      x: entry.x,
      y: entry.y - (footprint.heightTiles - 1) + Math.floor(footprint.heightTiles / 2),
    };
    overlays.push({
      id: `poi_${blueprint.id}`,
      assetId: blueprint.objectId,
      x: overlayCenter.x,
      y: overlayCenter.y,
      footprint,
      blocksMovement: blueprint.id !== "port_or_dock",
      entry,
      layer: blueprint.id === "port_or_dock" ? "dock" : "poi",
    });
    for (const tile of rectangleAround(overlayCenter, footprint.widthTiles, footprint.heightTiles)) {
      protectedTiles.add(posKey(tile));
      if (tiles[tile.y]?.[tile.x] && !classicTileHasTag(tiles[tile.y][tile.x], "water")) {
        tiles[tile.y][tile.x] = CLASSIC_WORLD_TILE_IDS.townGround;
        biomes[tile.y][tile.x] = "road";
      }
    }
  }
  return pois;
}

function findPoiEntry(
  blueprint: PoiBlueprint,
  tiles: ClassicWorldTileId[][],
  mask: IslandMask,
  protectedTiles: Set<string>,
  rng: () => number,
): WorldVec {
  const height = tiles.length;
  const width = tiles[0].length;
  const target = {
    x: Math.round(blueprint.target.x * (width - 1)),
    y: Math.round(blueprint.target.y * (height - 1)),
  };
  let best: { pos: WorldVec; score: number } | undefined;
  for (let y = 3; y < height - 3; y += 1) {
    for (let x = 3; x < width - 3; x += 1) {
      const pos = { x, y };
      if (!mask.mainLand.has(posKey(pos))) continue;
      if (protectedTiles.has(posKey(pos))) continue;
      if (isShoreOrWater(tiles[y][x]) && blueprint.prefer !== "coast") continue;
      if (!isClassicTileWalkable(tiles[y][x])) continue;
      const area = rectangleAround(pos, blueprint.footprint.widthTiles, blueprint.footprint.heightTiles);
      if (area.some((tile) => !tiles[tile.y]?.[tile.x] || classicTileHasTag(tiles[tile.y][tile.x], "water"))) {
        continue;
      }
      let score = Math.hypot(x - target.x, y - target.y);
      if (blueprint.prefer === "coast") score += distanceToTag(tiles, x, y, "shore", 8) * 2.2;
      if (blueprint.prefer === "mountain") score += distanceToTag(tiles, x, y, "mountain", 10) * 1.2;
      if (blueprint.prefer === "forest") score += distanceToBiome(tiles, x, y, "forest", 8) * 1.1;
      for (const protectedKey of protectedTiles) {
        const [px, py] = protectedKey.split(",").map(Number);
        const dist = Math.hypot(x - px, y - py);
        if (dist < 7) score += (7 - dist) * 6;
      }
      score += rng() * 2.5;
      if (!best || score < best.score) best = { pos, score };
    }
  }
  return best?.pos ?? target;
}

function carvePoiClearings(
  tiles: ClassicWorldTileId[][],
  biomes: ClassicWorldBiome[][],
  pois: WorldPoi[],
  overlays: WorldOverlay[],
) {
  for (const poi of pois) {
    const overlay = overlays.find((candidate) => candidate.id === `poi_${poi.id}`);
    const footprint = overlay?.footprint ?? { widthTiles: 3, heightTiles: 3 };
    for (const tile of rectangleAround(overlay ?? poi, footprint.widthTiles + 2, footprint.heightTiles + 2)) {
      if (!tiles[tile.y]?.[tile.x] || classicTileHasTag(tiles[tile.y][tile.x], "water")) continue;
      tiles[tile.y][tile.x] = CLASSIC_WORLD_TILE_IDS.townGround;
      biomes[tile.y][tile.x] = "road";
    }
  }
}

function findStartPosition(tiles: ClassicWorldTileId[][], overlays: WorldOverlay[], startVillage: WorldPoi): WorldVec {
  const candidates = [
    { x: startVillage.x, y: startVillage.y + 2 },
    { x: startVillage.x - 1, y: startVillage.y + 2 },
    { x: startVillage.x + 1, y: startVillage.y + 2 },
    { x: startVillage.x, y: startVillage.y + 1 },
    { x: startVillage.x, y: startVillage.y },
  ];
  for (const pos of candidates) {
    if (!tiles[pos.y]?.[pos.x] || classicTileHasTag(tiles[pos.y][pos.x], "water")) continue;
    if (overlays.some((overlay) => overlay.blocksMovement && pointInOverlayFootprint(overlay, pos.x, pos.y))) continue;
    tiles[pos.y][pos.x] = CLASSIC_WORLD_TILE_IDS.mainRoad;
    return pos;
  }
  return { x: startVillage.x, y: startVillage.y };
}

function connectPaths(
  seed: string,
  tiles: ClassicWorldTileId[][],
  biomes: ClassicWorldBiome[][],
  overlays: WorldOverlay[],
  pois: WorldPoi[],
  start: WorldVec,
  roads: WorldVec[],
) {
  const startVillage = pois.find((poi) => poi.id === "start_village") ?? pois[0];
  const connections = [{ from: start, to: startVillage }];
  for (const poi of pois) {
    if (poi.id === startVillage.id) continue;
    connections.push({ from: startVillage, to: poi });
  }
  for (const [index, connection] of connections.entries()) {
    const path = findPath(seed, tiles, overlays, connection.from, connection.to, index);
    for (const pos of path) {
      if (!tiles[pos.y]?.[pos.x] || classicTileHasTag(tiles[pos.y][pos.x], "water")) continue;
      if (classicTileHasTag(tiles[pos.y][pos.x], "mountain")) continue;
      tiles[pos.y][pos.x] = pickFrom(PATH, pos.x, pos.y, hashNoise(`${seed}:path`, pos.x, pos.y, index));
      biomes[pos.y][pos.x] = "road";
      roads.push({ ...pos });
    }
  }
}

function findPath(
  seed: string,
  tiles: ClassicWorldTileId[][],
  overlays: WorldOverlay[],
  start: WorldVec,
  end: WorldVec,
  index: number,
): WorldVec[] {
  const height = tiles.length;
  const width = tiles[0].length;
  const open: WorldVec[] = [start];
  const came = new Map<string, WorldVec>();
  const gScore = new Map<string, number>([[posKey(start), 0]]);
  const fScore = new Map<string, number>([[posKey(start), manhattan(start, end)]]);

  while (open.length) {
    open.sort((a, b) => (fScore.get(posKey(a)) ?? Infinity) - (fScore.get(posKey(b)) ?? Infinity));
    const current = open.shift()!;
    if (current.x === end.x && current.y === end.y) return reconstructPath(came, current);
    for (const next of neighbors4(current.x, current.y)) {
      if (!inBounds(width, height, next.x, next.y)) continue;
      const tile = tiles[next.y][next.x];
      if (classicTileHasTag(tile, "water")) continue;
      if (classicTileHasTag(tile, "mountain") && !(next.x === end.x && next.y === end.y)) continue;
      if (overlays.some((overlay) => overlay.blocksMovement && !overlay.entry && pointInOverlayFootprint(overlay, next.x, next.y))) {
        continue;
      }
      const noiseCost = hashNoise(`${seed}:path:${index}`, next.x, next.y) * 1.8;
      const shoreCost = classicTileHasTag(tile, "shore") ? 1.8 : 0;
      const tentative = (gScore.get(posKey(current)) ?? Infinity) + classicTileMovementCost(tile) + noiseCost + shoreCost;
      const key = posKey(next);
      if (tentative >= (gScore.get(key) ?? Infinity)) continue;
      came.set(key, current);
      gScore.set(key, tentative);
      fScore.set(key, tentative + manhattan(next, end) * 1.05);
      if (!open.some((tile) => tile.x === next.x && tile.y === next.y)) open.push(next);
    }
  }
  return [start, end];
}

function buildCompositionStats(
  tiles: ClassicWorldTileId[][],
  forestClusterCount: number,
  mountainClusterCount: number,
  pois: WorldPoi[],
  roads: WorldVec[],
  mask: IslandMask,
): ClassicIslandCompositionStats {
  let landTiles = 0;
  let waterTiles = 0;
  let shoreTiles = 0;
  for (const row of tiles) {
    for (const tile of row) {
      if (classicTileHasTag(tile, "water")) waterTiles += 1;
      else landTiles += 1;
      if (classicTileHasTag(tile, "shore")) shoreTiles += 1;
    }
  }
  return {
    landTiles,
    waterTiles,
    shoreTiles,
    forestClusterCount,
    mountainClusterCount,
    poiCount: pois.length,
    pathLength: roads.length,
    satelliteIslandCount: mask.satelliteIslandCount,
    selectedAssetCounts: CLASSIC_GRASSLAND_SELECTED_ASSET_COUNTS,
  };
}

function isClassicTileWalkable(tileId?: ClassicWorldTileId): boolean {
  if (!tileId) return false;
  return classicWorldTileFor(tileId)?.walkable ?? false;
}

function classicTileMovementCost(tileId?: ClassicWorldTileId): number {
  if (!tileId) return 99;
  return classicWorldTileFor(tileId)?.movementCost ?? 99;
}

function classicTileHasTag(tileId: ClassicWorldTileId | undefined, tag: string): boolean {
  if (!tileId) return false;
  return classicWorldTileFor(tileId)?.tags.includes(tag) ?? false;
}

function pickFrom<T extends string>(values: readonly T[], x: number, y: number, noise: number): T {
  if (!values.length) throw new Error("Classic island catalog category is empty.");
  const index = Math.abs(Math.floor((noise + hashNoise("pick", x, y)) * values.length)) % values.length;
  return values[index];
}

function findInlandTile(
  mask: IslandMask,
  tiles: ClassicWorldTileId[][],
  protectedTiles: Set<string>,
  rng: () => number,
  mode: "any" | "nearMountain",
): WorldVec | undefined {
  const candidates: WorldVec[] = [];
  for (let y = 3; y < tiles.length - 3; y += 1) {
    for (let x = 3; x < tiles[0].length - 3; x += 1) {
      const pos = { x, y };
      if (!mask.mainLand.has(posKey(pos))) continue;
      if (protectedTiles.has(posKey(pos))) continue;
      if (isShoreOrWater(tiles[y][x])) continue;
      if (mode === "nearMountain" && distanceToTag(tiles, x, y, "mountain", 7) > 7) continue;
      candidates.push(pos);
    }
  }
  if (!candidates.length && mode === "nearMountain") return findInlandTile(mask, tiles, protectedTiles, rng, "any");
  return candidates[Math.floor(rng() * candidates.length)];
}

function isShoreCell(land: boolean[][], x: number, y: number): boolean {
  if (!land[y]?.[x]) return false;
  return neighbors8(x, y).some((tile) => !land[tile.y]?.[tile.x]);
}

function isShoreOrWater(tile: ClassicWorldTileId): boolean {
  return classicTileHasTag(tile, "water") || classicTileHasTag(tile, "shore");
}

function distanceToLand(land: boolean[][], x: number, y: number, maxDistance: number): number {
  for (let distance = 0; distance <= maxDistance; distance += 1) {
    for (let yy = y - distance; yy <= y + distance; yy += 1) {
      for (let xx = x - distance; xx <= x + distance; xx += 1) {
        if (manhattan({ x, y }, { x: xx, y: yy }) <= distance && land[yy]?.[xx]) return distance;
      }
    }
  }
  return maxDistance + 1;
}

function distanceToTag(tiles: ClassicWorldTileId[][], x: number, y: number, tag: string, maxDistance: number): number {
  for (let distance = 0; distance <= maxDistance; distance += 1) {
    for (let yy = y - distance; yy <= y + distance; yy += 1) {
      for (let xx = x - distance; xx <= x + distance; xx += 1) {
        if (!tiles[yy]?.[xx]) continue;
        if (manhattan({ x, y }, { x: xx, y: yy }) <= distance && classicTileHasTag(tiles[yy][xx], tag)) return distance;
      }
    }
  }
  return maxDistance + 1;
}

function distanceToBiome(
  tiles: ClassicWorldTileId[][],
  x: number,
  y: number,
  biome: ClassicWorldBiome,
  maxDistance: number,
): number {
  for (let distance = 0; distance <= maxDistance; distance += 1) {
    for (let yy = y - distance; yy <= y + distance; yy += 1) {
      for (let xx = x - distance; xx <= x + distance; xx += 1) {
        const tile = tiles[yy]?.[xx];
        if (!tile) continue;
        if (manhattan({ x, y }, { x: xx, y: yy }) <= distance && classicWorldTileFor(tile)?.biome === biome) {
          return distance;
        }
      }
    }
  }
  return maxDistance + 1;
}

function floodReachable(world: GeneratedWorld, start: WorldVec): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    const key = posKey(current);
    if (seen.has(key)) continue;
    if (!isWorldPositionWalkable(world, current.x, current.y)) continue;
    seen.add(key);
    for (const next of neighbors4(current.x, current.y)) {
      if (inBounds(world.width, world.height, next.x, next.y) && !seen.has(posKey(next))) queue.push(next);
    }
  }
  return seen;
}

function findLandComponents(land: boolean[][]): WorldVec[][] {
  const height = land.length;
  const width = land[0]?.length ?? 0;
  const seen = new Set<string>();
  const components: WorldVec[][] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = { x, y };
      if (!land[y][x] || seen.has(posKey(start))) continue;
      const component: WorldVec[] = [];
      const queue = [start];
      while (queue.length) {
        const current = queue.shift()!;
        const key = posKey(current);
        if (seen.has(key) || !land[current.y]?.[current.x]) continue;
        seen.add(key);
        component.push(current);
        for (const next of neighbors4(current.x, current.y)) {
          if (inBounds(width, height, next.x, next.y) && !seen.has(posKey(next))) queue.push(next);
        }
      }
      components.push(component);
    }
  }
  return components;
}

function rectangleAround(center: WorldVec, widthTiles: number, heightTiles: number): WorldVec[] {
  const halfW = Math.floor(widthTiles / 2);
  const halfH = Math.floor(heightTiles / 2);
  const tiles: WorldVec[] = [];
  for (let y = center.y - halfH; y < center.y - halfH + heightTiles; y += 1) {
    for (let x = center.x - halfW; x < center.x - halfW + widthTiles; x += 1) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

function pointInPoiFootprint(poi: WorldPoi, x: number, y: number): boolean {
  const radius = Math.floor(poi.footprint / 2);
  return x >= poi.x - radius && x <= poi.x + radius && y >= poi.y - radius && y <= poi.y + radius;
}

function pointInOverlayFootprint(overlay: WorldOverlay, x: number, y: number): boolean {
  return rectangleAround(overlay, overlay.footprint.widthTiles, overlay.footprint.heightTiles).some(
    (tile) => tile.x === x && tile.y === y,
  );
}

function reconstructPath(came: Map<string, WorldVec>, current: WorldVec): WorldVec[] {
  const path = [current];
  while (came.has(posKey(current))) {
    current = came.get(posKey(current))!;
    path.push(current);
  }
  return path.reverse();
}

function neighbors4(x: number, y: number): WorldVec[] {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
}

function neighbors8(x: number, y: number): WorldVec[] {
  return [
    ...neighbors4(x, y),
    { x: x + 1, y: y + 1 },
    { x: x - 1, y: y + 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y - 1 },
  ];
}

function inBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function manhattan(a: WorldVec, b: WorldVec): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function posKey(pos: WorldVec): string {
  return `${pos.x},${pos.y}`;
}

function fbm(seed: string, x: number, y: number, octaves: number, lacunarity: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise(seed, x * frequency, y * frequency, octave) * amplitude;
    total += amplitude;
    amplitude *= 0.52;
    frequency *= lacunarity;
  }
  return value / total;
}

function valueNoise(seed: string, x: number, y: number, octave: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hashNoise(seed, x0, y0, octave);
  const b = hashNoise(seed, x1, y0, octave);
  const c = hashNoise(seed, x0, y1, octave);
  const d = hashNoise(seed, x1, y1, octave);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hashNoise(seed: string, x: number, y: number, z = 0): number {
  let h = hashString(seed);
  h ^= Math.imul(x + 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(y + 0xc2b2ae35, 0x27d4eb2f);
  h ^= Math.imul(z + 0x165667b1, 0x9e3779b1);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

function makeRng(seed: string): () => number {
  let state = hashString(seed) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
