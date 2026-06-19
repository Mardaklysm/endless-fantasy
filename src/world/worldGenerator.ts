import {
  WORLD_TILE_IDS,
  WORLD_TILES,
  isAtlasV3TileId,
  isWorldTileWalkable,
  worldTileById,
  worldTileHasTag,
  type WorldBiome,
  type WorldEncounterFamily,
  type WorldTileId
} from "../data/worldTiles.ts";
import { WORLD_OBJECT_IDS, type WorldObjectId } from "../data/worldObjects.ts";
import { createSeededRng, fbm, hashNoise, type SeededRng } from "./seededRng.ts";

export const DEFAULT_WORLD_WIDTH = 96;
export const DEFAULT_WORLD_HEIGHT = 64;
export const ACTIVE_WORLDGEN_MODE = "atlas_v3_archipelago_world" as const;

export interface WorldVec {
  x: number;
  y: number;
}

export type IslandId = "greenhaven" | "coralreach" | "ashfang";
export type IslandTheme = "temperate" | "tropical" | "volcanic";
export type WorldPoiKind = "town" | "harbor" | "dungeon" | "gate" | "final" | "landmark";
export type WorldLandmarkKind =
  | "shipwreck"
  | "shrine"
  | "hiddenChest"
  | "monsterNest"
  | "ruins"
  | "cave"
  | "resourceNode"
  | "secretMerchant"
  | "ancientDoor";

export interface WorldPoi {
  id: string;
  name: string;
  kind: WorldPoiKind;
  islandId: IslandId;
  x: number;
  y: number;
  footprint: number;
  landmarkKind?: WorldLandmarkKind;
  objectId?: WorldObjectId;
  difficultyTier: number;
}

export interface WorldObjectOverlay extends WorldVec {
  id: string;
  objectId: WorldObjectId;
  scale: number;
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

export type RoadRotation = 0 | 90 | 180 | 270;

export interface WorldRoadVisual extends WorldVec {
  mask: number;
  roadMask: number;
  endpointMask: number;
  sourceMask: number;
  sourceTileId: WorldTileId;
  rotation: RoadRotation;
}

export interface GeneratedIsland {
  id: IslandId;
  name: string;
  difficultyTier: number;
  theme: IslandTheme;
  bounds: { x: number; y: number; width: number; height: number };
  tileMap: WorldTileId[][];
  townPosition: WorldVec;
  harborPosition: WorldVec;
  dungeonPositions: WorldVec[];
  specialLandmarkPositions: WorldVec[];
}

export interface WorldValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  reachablePoiIds: string[];
  biomeCounts: Record<string, number>;
}

export interface GeneratedWorld {
  mode: typeof ACTIVE_WORLDGEN_MODE;
  width: number;
  height: number;
  seed: string;
  tiles: WorldTileId[][];
  biomes: WorldBiome[][];
  islands: GeneratedIsland[];
  islandByTile: (IslandId | null)[][];
  pois: WorldPoi[];
  roads: WorldVec[];
  roadVisuals: WorldRoadVisual[];
  rivers: WorldVec[][];
  bridges: WorldBridge[];
  objectOverlays: WorldObjectOverlay[];
  shallows: WorldVec[];
  reefs: WorldVec[];
  seaRoutes: WorldVec[][];
  startPosition: WorldVec;
  entryTriggers: WorldEntryTrigger[];
  validation: WorldValidationResult;
}

interface IslandTemplate {
  id: IslandId;
  name: string;
  difficultyTier: number;
  theme: IslandTheme;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  centerJitter: number;
  dungeonIds: string[];
  townId: string;
  townName: string;
  harborId: string;
  harborName: string;
  landmarkKinds: WorldLandmarkKind[];
}

interface IslandBuildState {
  template: IslandTemplate;
  center: WorldVec;
  land: Set<string>;
  coast: WorldVec[];
  pois: WorldPoi[];
}

const ISLAND_TEMPLATES: IslandTemplate[] = [
  {
    id: "greenhaven",
    name: "Greenhaven",
    difficultyTier: 1,
    theme: "temperate",
    cx: 0.23,
    cy: 0.54,
    rx: 14,
    ry: 10,
    centerJitter: 4,
    dungeonIds: ["mossCave"],
    townId: "dawnford",
    townName: "Greenhaven",
    harborId: "greenhavenHarbor",
    harborName: "Greenhaven Harbor",
    landmarkKinds: ["shipwreck", "shrine", "hiddenChest", "monsterNest"]
  },
  {
    id: "coralreach",
    name: "Coralreach",
    difficultyTier: 2,
    theme: "tropical",
    cx: 0.56,
    cy: 0.66,
    rx: 16,
    ry: 10,
    centerJitter: 5,
    dungeonIds: ["tideShrine"],
    townId: "brinewick",
    townName: "Coralreach",
    harborId: "coralreachHarbor",
    harborName: "Coralreach Harbor",
    landmarkKinds: ["shipwreck", "ruins", "secretMerchant", "monsterNest"]
  },
  {
    id: "ashfang",
    name: "Ashfang Isle",
    difficultyTier: 3,
    theme: "volcanic",
    cx: 0.76,
    cy: 0.31,
    rx: 15,
    ry: 11,
    centerJitter: 4,
    dungeonIds: ["ashenKeep", "skyglassTower", "starfallGate", "eclipseSpire"],
    townId: "sunbarrow",
    townName: "Ashfang Camp",
    harborId: "ashfangHarbor",
    harborName: "Ashfang Harbor",
    landmarkKinds: ["cave", "shrine", "resourceNode", "ancientDoor"]
  }
];

const MAIN_GRASS_TILE = WORLD_TILE_IDS.mediumGrass;
const GRASS_PATCH_TILES = [
  WORLD_TILE_IDS.brightGrass,
  WORLD_TILE_IDS.flowerMeadowGrass,
  WORLD_TILE_IDS.lushCloverGrass,
  WORLD_TILE_IDS.weedsGrass,
  WORLD_TILE_IDS.trampledGrass
];
const FOREST_TILES = [WORLD_TILE_IDS.lightForest, WORLD_TILE_IDS.denseForest];
const JUNGLE_TILES = [WORLD_TILE_IDS.jungle, WORLD_TILE_IDS.denseForest];
const BEACH_TILES = [WORLD_TILE_IDS.beachSand];
const ROAD_TILE = WORLD_TILE_IDS.roadHorizontal;
const ROAD_N = 1;
const ROAD_E = 2;
const ROAD_S = 4;
const ROAD_W = 8;
const HILL_TILES = [WORLD_TILE_IDS.grassStones, WORLD_TILE_IDS.gravelStoneGround, WORLD_TILE_IDS.rockyHills];
const ASH_WALKABLE_TILES = [WORLD_TILE_IDS.deadCrackedEarth, WORLD_TILE_IDS.ashBlackGround, WORLD_TILE_IDS.volcanicAshGround, WORLD_TILE_IDS.ashForest];
const MOUNTAIN_TILE = WORLD_TILE_IDS.rockyMountainGround;
const LAVA_TILE = WORLD_TILE_IDS.lavaCrackedGround;
const WATER_TILE = WORLD_TILE_IDS.deepWater;
const SHALLOW_WATER_TILES = [WORLD_TILE_IDS.shallowWater];

export function createWorldSeed(): string {
  return `archipelago-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}

export function generateWorld(options: { seed?: string; width?: number; height?: number; maxAttempts?: number } = {}): GeneratedWorld {
  const baseSeed = options.seed ?? createWorldSeed();
  const width = options.width ?? DEFAULT_WORLD_WIDTH;
  const height = options.height ?? DEFAULT_WORLD_HEIGHT;
  const maxAttempts = options.maxAttempts ?? 32;
  let lastWorld: GeneratedWorld | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = attempt === 0 ? baseSeed : `${baseSeed}:attempt:${attempt}`;
    const world = generateWorldAttempt(seed, width, height);
    world.validation = validateGeneratedWorld(world);
    lastWorld = world;
    if (world.validation.valid) return world;
  }

  const errors = lastWorld?.validation.errors.join("; ") || "unknown validation failure";
  throw new Error(`Unable to generate a valid archipelago world after ${maxAttempts} attempts: ${errors}`);
}

export function getWorldTileAt(world: GeneratedWorld, x: number, y: number): WorldTileId | undefined {
  return world.tiles[y]?.[x];
}

export function isWorldPositionWalkable(world: GeneratedWorld, x: number, y: number): boolean {
  return isWorldTileWalkable(getWorldTileAt(world, x, y));
}

export function getPoiAt(world: GeneratedWorld, x: number, y: number): WorldPoi | undefined {
  return world.pois.find((poi) => pointInPoiFootprint(poi, x, y));
}

export function getIslandAt(world: GeneratedWorld, x: number, y: number): GeneratedIsland | undefined {
  const islandId = world.islandByTile[y]?.[x];
  return islandId ? world.islands.find((island) => island.id === islandId) : undefined;
}

export function worldEncounterFamilyForTile(tileId: WorldTileId): WorldEncounterFamily | undefined {
  return worldTileById(tileId)?.encounterFamily;
}

export function validateGeneratedWorld(world: GeneratedWorld): WorldValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const biomeCounts: Record<string, number> = {};
  let landCount = 0;
  let waterCount = 0;
  let beachCount = 0;

  if (world.mode !== ACTIVE_WORLDGEN_MODE) errors.push(`Unexpected worldgen mode: ${world.mode}.`);
  if (world.islands.length < 3) errors.push("World must contain at least three islands.");

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[y]?.[x];
      const biome = world.biomes[y]?.[x];
      const def = worldTileById(tile);
      if (!tile || !def || !isAtlasV3TileId(tile)) {
        errors.push(`Generated tile ${tile ?? "<missing>"} at ${x},${y} is not a non-empty atlas_v3 tile.`);
        continue;
      }
      biomeCounts[biome ?? def.biome] = (biomeCounts[biome ?? def.biome] ?? 0) + 1;
      if (worldTileHasTag(tile, "water")) waterCount += 1;
      else landCount += 1;
      if (worldTileHasTag(tile, "sand")) beachCount += 1;
      if ((x === 0 || y === 0 || x === world.width - 1 || y === world.height - 1) && !worldTileHasTag(tile, "water")) {
        errors.push(`Land touches the outer border at ${x},${y}.`);
      }
    }
  }

  if (waterCount < world.width * world.height * 0.48) errors.push("Archipelago is not ocean-dominant enough.");
  if (landCount < world.width * world.height * 0.16) warnings.push("Generated islands are quite small.");
  if (beachCount < 24) errors.push("Generated islands do not have enough beach/coast sand.");
  if (world.shallows.length < 60) errors.push("Generated world did not create enough shallow water.");
  if (world.roads.length < 18) errors.push("Generated world did not create enough roads/paths.");
  if (world.reefs.length < 8) warnings.push("Generated world has few ocean details.");

  const startTile = getWorldTileAt(world, world.startPosition.x, world.startPosition.y);
  if (!isWorldPositionWalkable(world, world.startPosition.x, world.startPosition.y)) errors.push("Start position is not walkable.");
  if (world.islandByTile[world.startPosition.y]?.[world.startPosition.x] !== "greenhaven") errors.push("Start position is not on Greenhaven.");
  if (worldTileHasTag(startTile, "water")) errors.push("Start position is on water.");

  for (const island of world.islands) {
    const islandPois = world.pois.filter((poi) => poi.islandId === island.id);
    const town = islandPois.find((poi) => poi.kind === "town");
    const harbor = islandPois.find((poi) => poi.kind === "harbor");
    const dungeons = islandPois.filter((poi) => poi.kind === "dungeon" || poi.kind === "gate" || poi.kind === "final");
    if (!town) errors.push(`${island.name} has no town.`);
    if (!harbor) errors.push(`${island.name} has no harbor.`);
    if (!dungeons.length) errors.push(`${island.name} has no dungeon.`);
    if (harbor && !hasAdjacentWater(world, harbor)) errors.push(`${harbor.name} is not on or near the coast.`);
    if (!town) continue;
    const reachable = floodReachable(world, town, island.id);
    for (const poi of islandPois) {
      const tile = getWorldTileAt(world, poi.x, poi.y);
      if (!tile) errors.push(`${poi.name} is outside the map.`);
      else {
        if (worldTileHasTag(tile, "water")) errors.push(`${poi.name} is on water.`);
        if (!isWorldTileWalkable(tile)) errors.push(`${poi.name} is not on a walkable tile.`);
      }
      if (!poiFootprintTiles(poi).some((pos) => reachable.has(posKey(pos)))) errors.push(`${poi.name} is not reachable on ${island.name}.`);
    }
  }

  const reachablePoiIds = world.pois
    .filter((poi) => {
      const island = world.islands.find((candidate) => candidate.id === poi.islandId);
      if (!island) return false;
      const start = world.pois.find((candidate) => candidate.islandId === island.id && candidate.kind === "town") ?? island.townPosition;
      const reachable = floodReachable(world, start, island.id);
      return poiFootprintTiles(poi).some((pos) => reachable.has(posKey(pos)));
    })
    .map((poi) => poi.id);

  const roadValidation = validateRoadVisuals(world);
  errors.push(...roadValidation.errors);
  warnings.push(...roadValidation.warnings);

  return { valid: errors.length === 0, errors, warnings, reachablePoiIds, biomeCounts };
}

function validateRoadVisuals(world: GeneratedWorld): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const roadKeys = new Set(world.roads.map(posKey));
  const visualByKey = new Map(world.roadVisuals.map((visual) => [posKey(visual), visual]));
  if (world.roadVisuals.length !== world.roads.length) {
    errors.push(`Road visual count ${world.roadVisuals.length} does not match road count ${world.roads.length}.`);
  }
  for (const road of world.roads) {
    const key = posKey(road);
    const visual = visualByKey.get(key);
    if (!visual) {
      errors.push(`Road ${key} has no visual mask.`);
      continue;
    }
    const roadMask = roadNeighborMask(roadKeys, road.x, road.y);
    if (visual.roadMask !== roadMask) errors.push(`Road ${key} road mask ${visual.roadMask} does not match neighbor road mask ${roadMask}.`);
    if ((visual.roadMask | visual.endpointMask) !== visual.mask) errors.push(`Road ${key} visual mask ${visual.mask} does not equal road+endpoint masks.`);
    if (rotateRoadMask(visual.sourceMask, visual.rotation) !== visual.mask) {
      errors.push(`Road ${key} source ${visual.sourceTileId} rotation ${visual.rotation} renders mask ${rotateRoadMask(visual.sourceMask, visual.rotation)}, expected ${visual.mask}.`);
    }
    if (visual.mask === 0) warnings.push(`Road ${key} has zero connections.`);
    for (const bit of [ROAD_N, ROAD_E, ROAD_S, ROAD_W]) {
      if ((visual.mask & bit) === 0) continue;
      const next = stepForRoadBit(road, bit);
      const nextKey = posKey(next);
      if (roadKeys.has(nextKey)) continue;
      if ((visual.endpointMask & bit) !== 0 && isPoiFootprintAt(world.pois, next.x, next.y)) continue;
      errors.push(`Road ${key} visually connects toward ${roadBitName(bit)} into invalid terrain at ${next.x},${next.y}.`);
    }
    const connectionCount = roadConnectionCount(visual.mask);
    if (connectionCount >= 3 && roadConnectionCount(visual.roadMask | visual.endpointMask) !== connectionCount) {
      errors.push(`Road ${key} uses a branch visual without a real logical branch.`);
    }
  }
  return { errors, warnings };
}

export function buildWorldDebugReport(world: GeneratedWorld): string {
  const validation = world.validation.valid ? "valid" : "invalid";
  const islandLines = world.islands
    .map(
      (island) =>
        `- ${island.name} (${island.id}) tier ${island.difficultyTier}, theme ${island.theme}, town ${island.townPosition.x},${island.townPosition.y}, harbor ${island.harborPosition.x},${island.harborPosition.y}`
    )
    .join("\n");
  const poiLines = world.pois
    .map((poi) => `- ${poi.name} (${poi.id}, ${poi.kind}${poi.landmarkKind ? `/${poi.landmarkKind}` : ""}${poi.objectId ? `, object ${poi.objectId}` : ""}) on ${poi.islandId} at ${poi.x},${poi.y}`)
    .join("\n");
  const biomeLines = Object.entries(world.validation.biomeCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([biome, count]) => `- ${biome}: ${count}`)
    .join("\n");
  return `# Generated World Debug Report

Worldgen mode: \`${world.mode}\`
Active world tileset: \`atlas_v3\`
Grid: 8x8
Using empty cells: false
Using classic special tileset: false
Using old 10x10 atlas: false
Seed: \`${world.seed}\`
Map size: ${world.width}x${world.height}
Validation: ${validation}
Start position: ${world.startPosition.x},${world.startPosition.y}
Island count: ${world.islands.length}
Road tiles carved: ${world.roads.length}
Shallow-water tiles tracked: ${world.shallows.length}
Reef/detail tiles tracked: ${world.reefs.length}
Object overlays: ${world.objectOverlays.length}
Sea route count: ${world.seaRoutes.length}
Bridge/dock count: ${world.bridges.length}

## Islands

${islandLines}

## POIs

${poiLines}

## Biome Counts

${biomeLines}

## Reachability

Reachable POIs: ${world.validation.reachablePoiIds.join(", ")}

## Validation Errors

${world.validation.errors.map((error) => `- ${error}`).join("\n") || "- none"}

## Validation Warnings

${world.validation.warnings.map((warning) => `- ${warning}`).join("\n") || "- none"}
`;
}

function generateWorldAttempt(seed: string, width: number, height: number): GeneratedWorld {
  const rng = createSeededRng(seed);
  const tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => WATER_TILE));
  const biomes = Array.from({ length: height }, () => Array.from({ length: width }, () => "water" as WorldBiome));
  const islandByTile = Array.from({ length: height }, () => Array.from<IslandId | null>({ length: width }).fill(null));
  const states = ISLAND_TEMPLATES.map((template) => buildIslandMask(seed, width, height, template, rng.fork(template.id)));

  for (const state of states) paintIsland(seed, tiles, biomes, islandByTile, state);
  addTinyIslets(seed, tiles, biomes, islandByTile, rng.fork("islets"));

  const pois: WorldPoi[] = [];
  const roadKeys = new Set<string>();
  const roadEndpointMasks = new Map<string, number>();
  const bridges: WorldBridge[] = [];
  for (const state of states) {
    const islandPois = placeIslandPois(seed, tiles, biomes, islandByTile, state, rng.fork(`${state.template.id}:pois`));
    state.pois = islandPois;
    pois.push(...islandPois);
    carvePoiFootprints(tiles, biomes, islandByTile, islandPois);
    carveIslandRoads(tiles, biomes, islandByTile, state.template.id, islandPois, roadKeys, roadEndpointMasks);
    bridges.push(...dockTilesForHarbor(tiles, state.template.id, islandPois.find((poi) => poi.kind === "harbor")));
  }
  const roadVisuals = orientRoadTiles(tiles, biomes, roadKeys, roadEndpointMasks);
  const roads = roadVisuals.map(({ x, y }) => ({ x, y }));

  const shallows = markShallowWater(tiles, biomes);
  const reefs = decorateOcean(seed, tiles, pois, shallows, rng.fork("ocean-details"));
  const objectOverlays = buildWorldObjectOverlays(seed, reefs);
  const seaRoutes = buildSeaRoutes(pois);
  const islands = buildGeneratedIslands(tiles, states, pois);
  const dawnford = pois.find((poi) => poi.id === "dawnford") ?? pois[0];
  const startPosition = findStartPosition(tiles, biomes, islandByTile, dawnford);
  const entryTriggers = pois.flatMap((poi) => poiFootprintTiles(poi).map((tile) => ({ poiId: poi.id, x: tile.x, y: tile.y })));

  return {
    mode: ACTIVE_WORLDGEN_MODE,
    width,
    height,
    seed,
    tiles,
    biomes,
    islands,
    islandByTile,
    pois,
    roads,
    roadVisuals,
    rivers: [],
    bridges,
    objectOverlays,
    shallows,
    reefs,
    seaRoutes,
    startPosition,
    entryTriggers,
    validation: { valid: false, errors: [], warnings: [], reachablePoiIds: [], biomeCounts: {} }
  };
}

function buildIslandMask(seed: string, width: number, height: number, template: IslandTemplate, rng: SeededRng): IslandBuildState {
  const center = {
    x: Math.round(template.cx * (width - 1) + rng.int(-template.centerJitter, template.centerJitter)),
    y: Math.round(template.cy * (height - 1) + rng.int(-template.centerJitter, template.centerJitter))
  };
  const land = new Set<string>();
  const margin = 4;
  for (let y = margin; y < height - margin; y += 1) {
    for (let x = margin; x < width - margin; x += 1) {
      const nx = (x - center.x) / template.rx;
      const ny = (y - center.y) / template.ry;
      const distance = Math.sqrt(nx * nx + ny * ny);
      const coastNoise = fbm(`${seed}:${template.id}:coast`, x / 5.2, y / 5.2, 4, 2.08);
      const coveNoise = fbm(`${seed}:${template.id}:coves`, x / 2.9, y / 2.9, 2, 2.2);
      const lobe = Math.sin(Math.atan2(ny, nx) * 3 + hashNoise(seed, template.rx, template.ry) * Math.PI) * 0.06;
      if (distance < 0.94 + (coastNoise - 0.5) * 0.34 + (coveNoise - 0.5) * 0.12 + lobe) land.add(posKey({ x, y }));
    }
  }
  smoothIslandMask(land, width, height);
  const coast = [...land].map(parseKey).filter((pos) => neighbors8(pos.x, pos.y).some((next) => !land.has(posKey(next))));
  return { template, center, land, coast, pois: [] };
}

function smoothIslandMask(land: Set<string>, width: number, height: number) {
  for (let pass = 0; pass < 2; pass += 1) {
    const next = new Set<string>();
    for (let y = 2; y < height - 2; y += 1) {
      for (let x = 2; x < width - 2; x += 1) {
        const key = `${x},${y}`;
        const count = neighbors8(x, y).filter((pos) => land.has(posKey(pos))).length;
        if (land.has(key) ? count >= 3 : count >= 5) next.add(key);
      }
    }
    land.clear();
    next.forEach((key) => land.add(key));
  }
}

function paintIsland(
  seed: string,
  tiles: WorldTileId[][],
  biomes: WorldBiome[][],
  islandByTile: (IslandId | null)[][],
  state: IslandBuildState
) {
  const { template, land } = state;
  for (const key of land) {
    const { x, y } = parseKey(key);
    const detail = fbm(`${seed}:${template.id}:detail`, x / 12, y / 12, 3, 2);
    const hill = fbm(`${seed}:${template.id}:hills`, x / 9.5, y / 9.5, 3, 2.1);
    const volcanic = fbm(`${seed}:${template.id}:volcano`, x / 7.5, y / 7.5, 3, 2.2);
    const coastal = isCoastalLand(land, x, y);
    islandByTile[y][x] = template.id;
    if (coastal) {
      setWorldTile(tiles, biomes, x, y, beachTileFor(seed, x, y), "desert");
      continue;
    }
    if (template.theme === "volcanic") {
      if (volcanic > 0.9) setWorldTile(tiles, biomes, x, y, pickByNoise([LAVA_TILE, WORLD_TILE_IDS.lavaRockTransition], seed, x, y), "lava");
      else if (volcanic > 0.78) setWorldTile(tiles, biomes, x, y, MOUNTAIN_TILE, "mountain");
      else if (hill > 0.77) setWorldTile(tiles, biomes, x, y, WORLD_TILE_IDS.gravelStoneGround, "mountain");
      else if (detail > 0.71) setWorldTile(tiles, biomes, x, y, pickByNoise(ASH_WALKABLE_TILES, seed, x, y), "darkland");
      else setWorldTile(tiles, biomes, x, y, WORLD_TILE_IDS.volcanicAshGround, "darkland");
    } else if (template.theme === "tropical") {
      if (hill > 0.84) setWorldTile(tiles, biomes, x, y, WORLD_TILE_IDS.gravelStoneGround, "mountain");
      else if (detail > 0.57) setWorldTile(tiles, biomes, x, y, pickByNoise(JUNGLE_TILES, seed, x, y), "forest");
      else if (detail < 0.22) setWorldTile(tiles, biomes, x, y, grassPatchTileFor(seed, x, y), "grassland");
      else setWorldTile(tiles, biomes, x, y, MAIN_GRASS_TILE, "grassland");
    } else {
      if (hill > 0.84) setWorldTile(tiles, biomes, x, y, pickByNoise(HILL_TILES, seed, x, y), "mountain");
      else if (detail > 0.62) setWorldTile(tiles, biomes, x, y, pickByNoise(FOREST_TILES, seed, x, y), "forest");
      else if (detail < 0.18) setWorldTile(tiles, biomes, x, y, grassPatchTileFor(seed, x, y), "grassland");
      else setWorldTile(tiles, biomes, x, y, MAIN_GRASS_TILE, "grassland");
    }
  }
  ensureIslandGrove(seed, tiles, biomes, state);
}

function isCoastalLand(land: Set<string>, x: number, y: number): boolean {
  const cardinalWater = neighbors4(x, y).some((pos) => !land.has(posKey(pos)));
  if (cardinalWater) return true;
  const diagonalWater = neighbors8(x, y).filter((pos) => !land.has(posKey(pos))).length;
  return diagonalWater >= 2;
}

function beachTileFor(seed: string, x: number, y: number): WorldTileId {
  return BEACH_TILES[0];
}

function grassPatchTileFor(seed: string, x: number, y: number): WorldTileId {
  return pickByNoise(GRASS_PATCH_TILES, `${seed}:grass-patch`, x, y);
}

function ensureIslandGrove(seed: string, tiles: WorldTileId[][], biomes: WorldBiome[][], state: IslandBuildState) {
  if (state.template.theme === "volcanic") return;
  const land = [...state.land].map(parseKey);
  const forestCount = land.filter((pos) => biomes[pos.y]?.[pos.x] === "forest").length;
  const targetCount = Math.max(8, Math.floor(land.length * 0.035));
  if (forestCount >= targetCount) return;

  const candidates = land
    .filter((pos) => !isCoastalLand(state.land, pos.x, pos.y) && isWorldTileWalkable(tiles[pos.y]?.[pos.x]))
    .map((pos) => ({ pos, score: fbm(`${seed}:${state.template.id}:grove`, pos.x / 7, pos.y / 7, 3, 2) }))
    .sort((a, b) => b.score - a.score);
  const center = candidates[0]?.pos ?? state.center;
  const pool = state.template.theme === "tropical" ? JUNGLE_TILES : FOREST_TILES;
  const radius = state.template.theme === "tropical" ? 3 : 2;
  for (let y = center.y - radius; y <= center.y + radius; y += 1) {
    for (let x = center.x - radius; x <= center.x + radius; x += 1) {
      if (!state.land.has(posKey({ x, y })) || isCoastalLand(state.land, x, y)) continue;
      const d = Math.hypot(x - center.x, y - center.y);
      if (d > radius + 0.15) continue;
      setWorldTile(tiles, biomes, x, y, pickByNoise(pool, `${seed}:${state.template.id}:grove-pick`, x, y), "forest");
    }
  }
}

function addTinyIslets(
  seed: string,
  tiles: WorldTileId[][],
  biomes: WorldBiome[][],
  islandByTile: (IslandId | null)[][],
  rng: SeededRng
) {
  for (let i = 0; i < 8; i += 1) {
    const x = rng.int(5, tiles[0].length - 6);
    const y = rng.int(5, tiles.length - 6);
    if (nearestLandDistance(tiles, x, y, 6) < 5) continue;
    const radius = rng.int(1, 2);
    for (let yy = y - radius; yy <= y + radius; yy += 1) {
      for (let xx = x - radius; xx <= x + radius; xx += 1) {
        if (Math.hypot(xx - x, yy - y) > radius + 0.25 || !inBounds(tiles[0].length, tiles.length, xx, yy)) continue;
        islandByTile[yy][xx] = null;
        const beach = rng.chance(0.55);
        setWorldTile(tiles, biomes, xx, yy, beach ? WORLD_TILE_IDS.beachSand : MAIN_GRASS_TILE, beach ? "desert" : "grassland");
      }
    }
  }
}

function placeIslandPois(
  seed: string,
  tiles: WorldTileId[][],
  biomes: WorldBiome[][],
  islandByTile: (IslandId | null)[][],
  state: IslandBuildState,
  rng: SeededRng
): WorldPoi[] {
  const template = state.template;
  const placed: WorldPoi[] = [];
  const town = findInteriorPoiTile(tiles, islandByTile, state.center, template.id, placed, 3);
  placed.push(makePoi(template.townId, template.townName, "town", template, town, 3));

  const harbor = findHarborTile(tiles, islandByTile, state, placed, rng);
  placed.push(makePoi(template.harborId, template.harborName, "harbor", template, harbor, 3));

  for (const dungeonId of template.dungeonIds) {
    const target = farthestValidTile(tiles, islandByTile, template.id, [town, harbor, ...placed.map((poi) => ({ x: poi.x, y: poi.y }))], placed, 3);
    placed.push(makePoi(dungeonId, dungeonNameForId(dungeonId), dungeonKindForId(dungeonId), template, target, 3));
  }

  for (let i = 0; i < template.landmarkKinds.length; i += 1) {
    const kind = template.landmarkKinds[i];
    const target =
      kind === "shipwreck"
        ? findHarborTile(tiles, islandByTile, state, placed, rng)
        : farthestValidTile(tiles, islandByTile, template.id, placed.map((poi) => ({ x: poi.x, y: poi.y })), placed, 3);
    placed.push({
      ...makePoi(`${template.id}-${kind}-${i}`, landmarkName(kind, template.name), "landmark", template, target, 3),
      landmarkKind: kind,
      objectId: landmarkObjectForKind(kind, template.id, i)
    });
  }

  return placed;
}

function makePoi(id: string, name: string, kind: WorldPoiKind, template: IslandTemplate, pos: WorldVec, footprint: number): WorldPoi {
  const objectId = poiObjectForId(id, kind);
  return {
    id,
    name,
    kind,
    islandId: template.id,
    x: pos.x,
    y: pos.y,
    footprint,
    difficultyTier: template.difficultyTier,
    ...(objectId ? { objectId } : {})
  };
}

function poiObjectForId(id: string, kind: WorldPoiKind): WorldObjectId | undefined {
  if (kind === "town") return undefined;
  if (kind === "harbor") return WORLD_OBJECT_IDS.harborSignpost;
  if (id === "mossCave") return WORLD_OBJECT_IDS.mossyCaveEntrance;
  if (id === "tideShrine") return WORLD_OBJECT_IDS.jungleRuinsStairs;
  if (id === "ashenKeep") return WORLD_OBJECT_IDS.volcanicTempleEntrance;
  if (id === "skyglassTower") return WORLD_OBJECT_IDS.ancientStandingStones;
  if (id === "starfallGate") return WORLD_OBJECT_IDS.ancientSealedDoor;
  if (id === "eclipseSpire") return WORLD_OBJECT_IDS.darkBossPortal;
  if (kind === "gate") return WORLD_OBJECT_IDS.ancientSealedDoor;
  if (kind === "final") return WORLD_OBJECT_IDS.darkBossPortal;
  if (kind === "dungeon") return WORLD_OBJECT_IDS.mossyCaveEntrance;
  return undefined;
}

function landmarkObjectForKind(kind: WorldLandmarkKind, islandId: IslandId, index: number): WorldObjectId {
  if (kind === "shipwreck") return index % 2 === 0 ? WORLD_OBJECT_IDS.shipwreckDebris : WORLD_OBJECT_IDS.brokenMast;
  if (kind === "shrine") return islandId === "coralreach" ? WORLD_OBJECT_IDS.jungleIdolShrine : WORLD_OBJECT_IDS.glowingMagicShrine;
  if (kind === "hiddenChest") return WORLD_OBJECT_IDS.mossyLockedCache;
  if (kind === "monsterNest") return WORLD_OBJECT_IDS.monsterNest;
  if (kind === "ruins") return index % 2 === 0 ? WORLD_OBJECT_IDS.ruinedArchway : WORLD_OBJECT_IDS.smallBrokenRuins;
  if (kind === "cave") return WORLD_OBJECT_IDS.pirateGrottoEntrance;
  if (kind === "resourceNode") return islandId === "ashfang" ? WORLD_OBJECT_IDS.blackAshRockCluster : WORLD_OBJECT_IDS.oreNode;
  if (kind === "secretMerchant") return WORLD_OBJECT_IDS.secretMerchantTent;
  if (kind === "ancientDoor") return WORLD_OBJECT_IDS.ancientSealedDoor;
  return WORLD_OBJECT_IDS.discoverySparkle;
}

function dungeonKindForId(id: string): WorldPoiKind {
  if (id === "starfallGate") return "gate";
  if (id === "eclipseSpire") return "final";
  return "dungeon";
}

function dungeonNameForId(id: string): string {
  return (
    {
      mossCave: "Mossy Cave",
      tideShrine: "Coralreach Ruins",
      ashenKeep: "Ashfang Keep",
      skyglassTower: "Skyglass Tower",
      starfallGate: "Starfall Gate",
      eclipseSpire: "Eclipse Spire"
    }[id] ?? id
  );
}

function landmarkName(kind: WorldLandmarkKind, islandName: string): string {
  const names: Record<WorldLandmarkKind, string> = {
    shipwreck: "Weathered Shipwreck",
    shrine: "Saltwind Shrine",
    hiddenChest: "Hidden Cache",
    monsterNest: "Monster Nest",
    ruins: "Old Ruins",
    cave: "Blackstone Cave",
    resourceNode: "Glittering Ore",
    secretMerchant: "Secret Merchant",
    ancientDoor: "Ancient Door"
  };
  return `${islandName} ${names[kind]}`;
}

function findInteriorPoiTile(
  tiles: WorldTileId[][],
  islandByTile: (IslandId | null)[][],
  target: WorldVec,
  islandId: IslandId,
  placed: WorldPoi[],
  footprint: number
): WorldVec {
  const width = tiles[0].length;
  const height = tiles.length;
  let best: { pos: WorldVec; score: number } | undefined;
  for (let y = 3; y < height - 3; y += 1) {
    for (let x = 3; x < width - 3; x += 1) {
      if (!canPlacePoiAt(tiles, islandByTile, islandId, x, y, footprint, placed)) continue;
      if (hasAdjacentWaterAt(tiles, x, y, 2)) continue;
      const score = Math.hypot(x - target.x, y - target.y);
      if (!best || score < best.score) best = { pos: { x, y }, score };
    }
  }
  return best?.pos ?? target;
}

function findHarborTile(
  tiles: WorldTileId[][],
  islandByTile: (IslandId | null)[][],
  state: IslandBuildState,
  placed: WorldPoi[],
  rng: SeededRng
): WorldVec {
  const candidates: { pos: WorldVec; score: number }[] = [];
  for (const pos of state.coast) {
    if (islandByTile[pos.y]?.[pos.x] !== state.template.id || !isWorldTileWalkable(tiles[pos.y][pos.x])) continue;
    if (placed.some((other) => Math.hypot(pos.x - other.x, pos.y - other.y) < 7)) continue;
    if (!hasAdjacentWaterAt(tiles, pos.x, pos.y, 1)) continue;
    const facingScore = state.template.id === "greenhaven" ? -pos.x : state.template.id === "coralreach" ? Math.abs(pos.x - state.center.x) - pos.y * 0.2 : -pos.y;
    candidates.push({ pos, score: facingScore + rng.float(0, 3) });
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0]?.pos ?? findInteriorPoiTile(tiles, islandByTile, state.center, state.template.id, placed, 3);
}

function farthestValidTile(
  tiles: WorldTileId[][],
  islandByTile: (IslandId | null)[][],
  islandId: IslandId,
  anchors: WorldVec[],
  placed: WorldPoi[],
  footprint: number
): WorldVec {
  let best: { pos: WorldVec; score: number } | undefined;
  for (let y = 3; y < tiles.length - 3; y += 1) {
    for (let x = 3; x < tiles[y].length - 3; x += 1) {
      if (!canPlacePoiAt(tiles, islandByTile, islandId, x, y, footprint, placed)) continue;
      if (hasAdjacentWaterAt(tiles, x, y, 1)) continue;
      const score = anchors.reduce((sum, anchor) => sum + Math.hypot(x - anchor.x, y - anchor.y), 0);
      if (!best || score > best.score) best = { pos: { x, y }, score };
    }
  }
  return best?.pos ?? anchors[0] ?? { x: 8, y: 8 };
}

function canPlacePoiAt(
  tiles: WorldTileId[][],
  islandByTile: (IslandId | null)[][],
  islandId: IslandId,
  x: number,
  y: number,
  footprint: number,
  placed: WorldPoi[]
): boolean {
  const radius = Math.floor(footprint / 2);
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(tiles[0].length, tiles.length, xx, yy)) return false;
      if (isWaterTile(tiles[yy][xx]) || islandByTile[yy][xx] !== islandId) return false;
    }
  }
  for (const other of placed) {
    if (Math.hypot(x - other.x, y - other.y) < 7) return false;
  }
  return true;
}

function carvePoiFootprints(
  tiles: WorldTileId[][],
  biomes: WorldBiome[][],
  islandByTile: (IslandId | null)[][],
  pois: WorldPoi[]
) {
  for (const poi of pois) {
    const tile = poiFootprintGroundTile(poi);
    const biome = WORLD_TILES[tile].biome;
    for (const pos of poiFootprintTiles(poi)) {
      if (!tiles[pos.y]?.[pos.x]) continue;
      if (poi.kind === "harbor" && isWaterTile(tiles[pos.y][pos.x])) continue;
      setWorldTile(tiles, biomes, pos.x, pos.y, tile, biome);
      islandByTile[pos.y][pos.x] = poi.islandId;
    }
  }
}

function poiFootprintGroundTile(poi: WorldPoi): WorldTileId {
  if (poi.kind === "harbor") return WORLD_TILE_IDS.beachSand;
  if (poi.kind === "town") return poi.islandId === "ashfang" ? WORLD_TILE_IDS.volcanicAshGround : MAIN_GRASS_TILE;
  if (poi.kind === "final") return WORLD_TILE_IDS.cursedPurpleGround;
  if (poi.kind === "gate" || poi.kind === "dungeon") return WORLD_TILE_IDS.grassStones;
  if (poi.landmarkKind === "shipwreck") return WORLD_TILE_IDS.rockySand;
  if (poi.landmarkKind === "resourceNode") return WORLD_TILE_IDS.gravelStoneGround;
  if (poi.landmarkKind === "monsterNest") return WORLD_TILE_IDS.weedsGrass;
  if (poi.landmarkKind === "secretMerchant") return WORLD_TILE_IDS.trampledGrass;
  if (poi.landmarkKind === "ancientDoor") return WORLD_TILE_IDS.grassStones;
  return poi.islandId === "ashfang" ? WORLD_TILE_IDS.volcanicAshGround : MAIN_GRASS_TILE;
}

function carveIslandRoads(
  tiles: WorldTileId[][],
  biomes: WorldBiome[][],
  islandByTile: (IslandId | null)[][],
  islandId: IslandId,
  pois: WorldPoi[],
  roadKeys: Set<string>,
  roadEndpointMasks: Map<string, number>
) {
  const town = pois.find((poi) => poi.kind === "town");
  const harbor = pois.find((poi) => poi.kind === "harbor");
  const important = pois.filter((poi) => poi.kind === "dungeon" || poi.kind === "gate" || poi.kind === "final");
  if (!town || !harbor) return;

  const footprintKeys = poiFootprintKeySet(pois);
  const islandRoadKeys = new Set<string>();
  const destinations = [harbor, ...important].sort((a, b) => {
    const rank = (poi: WorldPoi) => (poi.kind === "harbor" ? 0 : poi.kind === "dungeon" ? 1 : poi.kind === "gate" ? 2 : 3);
    return rank(a) - rank(b) || Math.hypot(a.x - town.x, a.y - town.y) - Math.hypot(b.x - town.x, b.y - town.y);
  });
  const townApproach = roadApproachPoint(tiles, islandByTile, islandId, town, harbor, footprintKeys);
  addIslandRoadTile(tiles, biomes, islandByTile, islandId, townApproach, roadKeys, islandRoadKeys, footprintKeys);
  addRoadEndpointConnection(roadEndpointMasks, townApproach, town);

  for (const destination of destinations) {
    const destinationApproach = roadApproachPoint(tiles, islandByTile, islandId, destination, townApproach, footprintKeys);
    const start = nearestRoadAnchor(islandRoadKeys, destinationApproach) ?? townApproach;
    const path = findIslandRoadPath(tiles, islandByTile, islandId, start, destinationApproach, {
      roadKeys: islandRoadKeys,
      blockedKeys: footprintKeys
    });
    for (const pos of path) {
      addIslandRoadTile(tiles, biomes, islandByTile, islandId, pos, roadKeys, islandRoadKeys, footprintKeys);
    }
    addRoadEndpointConnection(roadEndpointMasks, destinationApproach, destination);
  }
}

function poiFootprintKeySet(pois: WorldPoi[]): Set<string> {
  const keys = new Set<string>();
  for (const poi of pois) {
    for (const pos of poiFootprintTiles(poi)) keys.add(posKey(pos));
  }
  return keys;
}

function roadApproachPoint(
  tiles: WorldTileId[][],
  islandByTile: (IslandId | null)[][],
  islandId: IslandId,
  poi: WorldPoi,
  anchor: WorldVec,
  blockedKeys: Set<string>
): WorldVec {
  const footprint = poiFootprintTiles(poi);
  const footprintKeys = new Set(footprint.map(posKey));
  const candidates: WorldVec[] = [];
  for (const tile of footprint) {
    for (const next of neighbors4(tile.x, tile.y)) {
      const key = posKey(next);
      if (footprintKeys.has(key) || blockedKeys.has(key)) continue;
      if (!canRoadUseTile(tiles, islandByTile, islandId, next, key, "", "")) continue;
      candidates.push(next);
    }
  }
  if (candidates.length) {
    return candidates.sort((a, b) => {
      const da = Math.hypot(a.x - anchor.x, a.y - anchor.y);
      const db = Math.hypot(b.x - anchor.x, b.y - anchor.y);
      return da - db || a.y - b.y || a.x - b.x;
    })[0];
  }
  return (
    footprint.find((pos) => {
      const key = posKey(pos);
      return canRoadUseTile(tiles, islandByTile, islandId, pos, key, key, key);
    }) ?? { x: poi.x, y: poi.y }
  );
}

function addIslandRoadTile(
  tiles: WorldTileId[][],
  biomes: WorldBiome[][],
  islandByTile: (IslandId | null)[][],
  islandId: IslandId,
  pos: WorldVec,
  roadKeys: Set<string>,
  islandRoadKeys: Set<string>,
  blockedKeys: Set<string>
) {
  const key = posKey(pos);
  if (!canRoadUseTile(tiles, islandByTile, islandId, pos, key, "", "")) return;
  if (blockedKeys.has(key)) return;
  setWorldTile(tiles, biomes, pos.x, pos.y, ROAD_TILE, "grassland");
  roadKeys.add(key);
  islandRoadKeys.add(key);
}

function nearestRoadAnchor(roadKeys: Set<string>, goal: WorldVec): WorldVec | undefined {
  return [...roadKeys]
    .map(parseKey)
    .sort((a, b) => Math.hypot(a.x - goal.x, a.y - goal.y) - Math.hypot(b.x - goal.x, b.y - goal.y) || a.y - b.y || a.x - b.x)[0];
}

function addRoadEndpointConnection(roadEndpointMasks: Map<string, number>, roadPos: WorldVec, poi: WorldPoi) {
  const key = posKey(roadPos);
  const footprintKeys = new Set(poiFootprintTiles(poi).map(posKey));
  let mask = roadEndpointMasks.get(key) ?? 0;
  for (const next of neighbors4(roadPos.x, roadPos.y)) {
    if (footprintKeys.has(posKey(next))) mask |= directionMask(roadPos, next);
  }
  if (mask) roadEndpointMasks.set(key, mask);
}

function orientRoadTiles(tiles: WorldTileId[][], biomes: WorldBiome[][], roadKeys: Set<string>, roadEndpointMasks: Map<string, number>): WorldRoadVisual[] {
  const visuals: WorldRoadVisual[] = [];
  for (const key of roadKeys) {
    const pos = parseKey(key);
    if (!worldTileHasTag(tiles[pos.y]?.[pos.x], "road")) continue;
    const roadMask = roadNeighborMask(roadKeys, pos.x, pos.y);
    const endpointMask = roadEndpointMasks.get(key) ?? 0;
    const mask = roadMask | endpointMask;
    const visual = roadVisualForMask(mask);
    setWorldTile(tiles, biomes, pos.x, pos.y, visual.sourceTileId, WORLD_TILES[visual.sourceTileId].biome);
    visuals.push({ ...pos, mask, roadMask, endpointMask, ...visual });
  }
  return visuals.sort((a, b) => a.y - b.y || a.x - b.x);
}

function roadNeighborMask(roadKeys: Set<string>, x: number, y: number): number {
  let mask = 0;
  if (roadKeys.has(posKey({ x, y: y - 1 }))) mask |= ROAD_N;
  if (roadKeys.has(posKey({ x: x + 1, y }))) mask |= ROAD_E;
  if (roadKeys.has(posKey({ x, y: y + 1 }))) mask |= ROAD_S;
  if (roadKeys.has(posKey({ x: x - 1, y }))) mask |= ROAD_W;
  return mask;
}

function roadVisualForMask(mask: number): Pick<WorldRoadVisual, "sourceMask" | "sourceTileId" | "rotation"> {
  switch (mask & 15) {
    case ROAD_N:
      return { sourceTileId: WORLD_TILE_IDS.roadDeadEndEast, sourceMask: ROAD_W, rotation: 90 };
    case ROAD_E:
      return { sourceTileId: WORLD_TILE_IDS.roadDeadEndEast, sourceMask: ROAD_W, rotation: 180 };
    case ROAD_S:
      return { sourceTileId: WORLD_TILE_IDS.roadDeadEndEast, sourceMask: ROAD_W, rotation: 270 };
    case ROAD_W:
      return { sourceTileId: WORLD_TILE_IDS.roadDeadEndEast, sourceMask: ROAD_W, rotation: 0 };
    case ROAD_N | ROAD_S:
      return { sourceTileId: WORLD_TILE_IDS.roadVertical, sourceMask: ROAD_N | ROAD_S, rotation: 0 };
    case ROAD_E | ROAD_W:
      return { sourceTileId: WORLD_TILE_IDS.roadHorizontal, sourceMask: ROAD_E | ROAD_W, rotation: 0 };
    case ROAD_N | ROAD_E:
      return { sourceTileId: WORLD_TILE_IDS.roadCornerSw, sourceMask: ROAD_E | ROAD_S, rotation: 270 };
    case ROAD_E | ROAD_S:
      return { sourceTileId: WORLD_TILE_IDS.roadCornerSw, sourceMask: ROAD_E | ROAD_S, rotation: 0 };
    case ROAD_S | ROAD_W:
      return { sourceTileId: WORLD_TILE_IDS.roadCornerSw, sourceMask: ROAD_E | ROAD_S, rotation: 90 };
    case ROAD_W | ROAD_N:
      return { sourceTileId: WORLD_TILE_IDS.roadCornerSw, sourceMask: ROAD_E | ROAD_S, rotation: 180 };
    case ROAD_N | ROAD_E | ROAD_S:
      return { sourceTileId: WORLD_TILE_IDS.roadTEast, sourceMask: ROAD_N | ROAD_E | ROAD_S, rotation: 0 };
    case ROAD_E | ROAD_S | ROAD_W:
      return { sourceTileId: WORLD_TILE_IDS.roadTEast, sourceMask: ROAD_N | ROAD_E | ROAD_S, rotation: 90 };
    case ROAD_S | ROAD_W | ROAD_N:
      return { sourceTileId: WORLD_TILE_IDS.roadTEast, sourceMask: ROAD_N | ROAD_E | ROAD_S, rotation: 180 };
    case ROAD_W | ROAD_N | ROAD_E:
      return { sourceTileId: WORLD_TILE_IDS.roadTEast, sourceMask: ROAD_N | ROAD_E | ROAD_S, rotation: 270 };
    case ROAD_N | ROAD_E | ROAD_S | ROAD_W:
      return { sourceTileId: WORLD_TILE_IDS.roadCrossroads, sourceMask: ROAD_N | ROAD_E | ROAD_S | ROAD_W, rotation: 0 };
    default:
      return { sourceTileId: WORLD_TILE_IDS.roadHorizontal, sourceMask: ROAD_E | ROAD_W, rotation: 0 };
  }
}

function directionMask(from: WorldVec, to: WorldVec): number {
  if (to.x === from.x && to.y === from.y - 1) return ROAD_N;
  if (to.x === from.x + 1 && to.y === from.y) return ROAD_E;
  if (to.x === from.x && to.y === from.y + 1) return ROAD_S;
  if (to.x === from.x - 1 && to.y === from.y) return ROAD_W;
  return 0;
}

function rotateRoadMask(mask: number, rotation: RoadRotation): number {
  let rotated = mask;
  for (let i = 0; i < rotation / 90; i += 1) {
    let next = 0;
    if (rotated & ROAD_N) next |= ROAD_E;
    if (rotated & ROAD_E) next |= ROAD_S;
    if (rotated & ROAD_S) next |= ROAD_W;
    if (rotated & ROAD_W) next |= ROAD_N;
    rotated = next;
  }
  return rotated;
}

function stepForRoadBit(pos: WorldVec, bit: number): WorldVec {
  if (bit === ROAD_N) return { x: pos.x, y: pos.y - 1 };
  if (bit === ROAD_E) return { x: pos.x + 1, y: pos.y };
  if (bit === ROAD_S) return { x: pos.x, y: pos.y + 1 };
  return { x: pos.x - 1, y: pos.y };
}

function roadBitName(bit: number): string {
  if (bit === ROAD_N) return "north";
  if (bit === ROAD_E) return "east";
  if (bit === ROAD_S) return "south";
  return "west";
}

function roadConnectionCount(mask: number): number {
  return [ROAD_N, ROAD_E, ROAD_S, ROAD_W].filter((bit) => (mask & bit) !== 0).length;
}

function isPoiFootprintAt(pois: WorldPoi[], x: number, y: number): boolean {
  return pois.some((poi) => pointInPoiFootprint(poi, x, y));
}

function findIslandRoadPath(
  tiles: WorldTileId[][],
  islandByTile: (IslandId | null)[][],
  islandId: IslandId,
  start: WorldVec,
  goal: WorldVec,
  options: { roadKeys: Set<string>; blockedKeys: Set<string> }
): WorldVec[] {
  const startKey = posKey(start);
  const goalKey = posKey(goal);
  const queue: { pos: WorldVec; score: number }[] = [{ pos: start, score: 0 }];
  const cameFrom = new Map<string, string>();
  const costByKey = new Map<string, number>([[startKey, 0]]);
  const seen = new Set<string>();
  while (queue.length) {
    queue.sort((a, b) => a.score - b.score || a.pos.y - b.pos.y || a.pos.x - b.pos.x);
    const current = queue.shift()!.pos;
    const currentKey = posKey(current);
    if (seen.has(currentKey)) continue;
    seen.add(currentKey);
    if (currentKey === goalKey) break;
    const nextSteps = neighbors4(current.x, current.y).sort((a, b) => Math.hypot(a.x - goal.x, a.y - goal.y) - Math.hypot(b.x - goal.x, b.y - goal.y));
    for (const next of nextSteps) {
      const key = posKey(next);
      if (!canRoadUseTile(tiles, islandByTile, islandId, next, key, startKey, goalKey)) continue;
      if (options.blockedKeys.has(key) && key !== startKey && key !== goalKey) continue;
      const currentCost = costByKey.get(currentKey) ?? 0;
      const nextCost = currentCost + roadStepCost(tiles[next.y][next.x], options.roadKeys.has(key)) + roadTurnCost(cameFrom, currentKey, key);
      if (nextCost >= (costByKey.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      costByKey.set(key, nextCost);
      cameFrom.set(key, currentKey);
      queue.push({ pos: next, score: nextCost + Math.hypot(next.x - goal.x, next.y - goal.y) });
    }
  }
  if (!cameFrom.has(goalKey)) return carveLinePath(start, goal);
  const path: WorldVec[] = [];
  let current = goalKey;
  while (current !== startKey) {
    path.push(parseKey(current));
    current = cameFrom.get(current)!;
  }
  path.push(start);
  return path.reverse();
}

function canRoadUseTile(
  tiles: WorldTileId[][],
  islandByTile: (IslandId | null)[][],
  islandId: IslandId,
  pos: WorldVec,
  key: string,
  startKey: string,
  goalKey: string
): boolean {
  if (!inBounds(tiles[0].length, tiles.length, pos.x, pos.y)) return false;
  if (key !== startKey && key !== goalKey && islandByTile[pos.y][pos.x] !== islandId) return false;
  const tile = tiles[pos.y][pos.x];
  return !isWaterTile(tile) && isWorldTileWalkable(tile);
}

function roadStepCost(tile: WorldTileId, existingRoad: boolean): number {
  if (existingRoad || worldTileHasTag(tile, "road")) return 0.2;
  if (worldTileHasTag(tile, "forest")) return 3.1;
  if (worldTileHasTag(tile, "sand")) return 2.6;
  if (worldTileHasTag(tile, "rock")) return 2.2;
  if (worldTileHasTag(tile, "grass")) return 1;
  return 1.45;
}

function roadTurnCost(cameFrom: Map<string, string>, currentKey: string, nextKey: string): number {
  const previousKey = cameFrom.get(currentKey);
  if (!previousKey) return 0;
  const previous = parseKey(previousKey);
  const current = parseKey(currentKey);
  const next = parseKey(nextKey);
  const dirA = { x: current.x - previous.x, y: current.y - previous.y };
  const dirB = { x: next.x - current.x, y: next.y - current.y };
  return dirA.x === dirB.x && dirA.y === dirB.y ? 0 : 0.55;
}

function dockTilesForHarbor(tiles: WorldTileId[][], islandId: IslandId, harbor?: WorldPoi): WorldBridge[] {
  if (!harbor) return [];
  const result: WorldBridge[] = [];
  for (const next of neighbors4(harbor.x, harbor.y)) {
    if (!inBounds(tiles[0].length, tiles.length, next.x, next.y) || !isWaterTile(tiles[next.y][next.x])) continue;
    result.push({ ...next, orientation: next.x === harbor.x ? "vertical" : "horizontal", material: islandId === "ashfang" ? "stone" : "wood" });
    break;
  }
  return result;
}

function markShallowWater(tiles: WorldTileId[][], biomes: WorldBiome[][]): WorldVec[] {
  const shallows: WorldVec[] = [];
  for (let y = 1; y < tiles.length - 1; y += 1) {
    for (let x = 1; x < tiles[y].length - 1; x += 1) {
      if (!isWaterTile(tiles[y][x])) continue;
      const nearLand = nearestLandDistance(tiles, x, y, 3);
      if (nearLand > 0 && nearLand <= 2) {
        shallows.push({ x, y });
        setWorldTile(tiles, biomes, x, y, pickByNoise(SHALLOW_WATER_TILES, "shallows", x, y), "water");
      }
    }
  }
  return shallows;
}

function decorateOcean(seed: string, tiles: WorldTileId[][], pois: WorldPoi[], shallows: WorldVec[], rng: SeededRng): WorldVec[] {
  const reefs: WorldVec[] = [];
  const shallowKeys = new Set(shallows.map(posKey));
  for (const pos of rng.shuffle(shallows).slice(0, 18)) {
    if (rng.chance(0.55)) reefs.push(pos);
  }
  for (let i = 0; i < 18; i += 1) {
    const pos = { x: rng.int(3, tiles[0].length - 4), y: rng.int(3, tiles.length - 4) };
    if (!isWaterTile(tiles[pos.y][pos.x]) || shallowKeys.has(posKey(pos))) continue;
    if (pois.some((poi) => Math.hypot(pos.x - poi.x, pos.y - poi.y) < 5)) continue;
    if (hashNoise(`${seed}:reef`, pos.x, pos.y) > 0.34) reefs.push(pos);
  }
  return reefs;
}

function buildWorldObjectOverlays(seed: string, reefs: WorldVec[]): WorldObjectOverlay[] {
  return reefs.map((pos, index) => ({
    id: `ocean-object-${index}-${pos.x}-${pos.y}`,
    x: pos.x,
    y: pos.y,
    objectId: oceanObjectForPosition(seed, pos, index),
    scale: 1.24
  }));
}

function oceanObjectForPosition(seed: string, pos: WorldVec, index: number): WorldObjectId {
  const noise = hashNoise(`${seed}:world-object-overlay:${index}`, pos.x, pos.y);
  if (noise > 0.94) return WORLD_OBJECT_IDS.whirlpoolSwirl;
  if (noise > 0.85) return WORLD_OBJECT_IDS.floatingTreasureBarrel;
  if (noise > 0.75) return WORLD_OBJECT_IDS.brokenMast;
  if (noise > 0.61) return WORLD_OBJECT_IDS.shipwreckDebris;
  if (noise > 0.49) return WORLD_OBJECT_IDS.octopusCache;
  return WORLD_OBJECT_IDS.coralClusterBlue;
}

function buildSeaRoutes(pois: WorldPoi[]): WorldVec[][] {
  const harbor = (id: string) => pois.find((poi) => poi.id === id)!;
  return [
    carveLinePath(harbor("greenhavenHarbor"), harbor("coralreachHarbor")),
    carveLinePath(harbor("coralreachHarbor"), harbor("ashfangHarbor"))
  ];
}

function buildGeneratedIslands(tiles: WorldTileId[][], states: IslandBuildState[], pois: WorldPoi[]): GeneratedIsland[] {
  return states.map((state) => {
    const land = [...state.land].map(parseKey);
    const minX = Math.min(...land.map((pos) => pos.x));
    const maxX = Math.max(...land.map((pos) => pos.x));
    const minY = Math.min(...land.map((pos) => pos.y));
    const maxY = Math.max(...land.map((pos) => pos.y));
    const islandPois = pois.filter((poi) => poi.islandId === state.template.id);
    return {
      id: state.template.id,
      name: state.template.name,
      difficultyTier: state.template.difficultyTier,
      theme: state.template.theme,
      bounds: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
      tileMap: tiles.slice(minY, maxY + 1).map((row) => row.slice(minX, maxX + 1)),
      townPosition: pickPoiPosition(islandPois, "town"),
      harborPosition: pickPoiPosition(islandPois, "harbor"),
      dungeonPositions: islandPois.filter((poi) => poi.kind === "dungeon" || poi.kind === "gate" || poi.kind === "final").map((poi) => ({ x: poi.x, y: poi.y })),
      specialLandmarkPositions: islandPois.filter((poi) => poi.kind === "landmark").map((poi) => ({ x: poi.x, y: poi.y }))
    };
  });
}

function pickPoiPosition(pois: WorldPoi[], kind: WorldPoiKind): WorldVec {
  const poi = pois.find((candidate) => candidate.kind === kind);
  return poi ? { x: poi.x, y: poi.y } : { x: 0, y: 0 };
}

function findStartPosition(
  tiles: WorldTileId[][],
  biomes: WorldBiome[][],
  islandByTile: (IslandId | null)[][],
  dawnford: WorldPoi
): WorldVec {
  const candidates = [
    { x: dawnford.x, y: dawnford.y + 2 },
    { x: dawnford.x - 1, y: dawnford.y + 2 },
    { x: dawnford.x + 1, y: dawnford.y + 2 },
    { x: dawnford.x, y: dawnford.y }
  ];
  for (const pos of candidates) {
    if (!tiles[pos.y]?.[pos.x] || isWaterTile(tiles[pos.y][pos.x])) continue;
    if (!worldTileHasTag(tiles[pos.y][pos.x], "road")) setWorldTile(tiles, biomes, pos.x, pos.y, MAIN_GRASS_TILE, "grassland");
    islandByTile[pos.y][pos.x] = "greenhaven";
    return pos;
  }
  return { x: dawnford.x, y: dawnford.y };
}

function floodReachable(world: GeneratedWorld, start: WorldVec, islandId: IslandId): Set<string> {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    const key = posKey(current);
    if (seen.has(key)) continue;
    if (!inBounds(world.width, world.height, current.x, current.y)) continue;
    if (world.islandByTile[current.y][current.x] !== islandId || !isWorldPositionWalkable(world, current.x, current.y)) continue;
    seen.add(key);
    for (const next of neighbors4(current.x, current.y)) {
      if (!seen.has(posKey(next))) queue.push(next);
    }
  }
  return seen;
}

function hasAdjacentWater(world: GeneratedWorld, poi: WorldPoi): boolean {
  return poiFootprintTiles(poi).some((tile) => neighbors4(tile.x, tile.y).some((next) => isWaterTile(world.tiles[next.y]?.[next.x])));
}

function hasAdjacentWaterAt(tiles: WorldTileId[][], x: number, y: number, radius: number): boolean {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(tiles[0].length, tiles.length, xx, yy)) continue;
      if (isWaterTile(tiles[yy][xx])) return true;
    }
  }
  return false;
}

function nearestLandDistance(tiles: WorldTileId[][], x: number, y: number, maxDistance: number): number {
  for (let distance = 1; distance <= maxDistance; distance += 1) {
    for (let yy = y - distance; yy <= y + distance; yy += 1) {
      for (let xx = x - distance; xx <= x + distance; xx += 1) {
        if (!inBounds(tiles[0].length, tiles.length, xx, yy)) continue;
        if (Math.abs(xx - x) !== distance && Math.abs(yy - y) !== distance) continue;
        if (!isWaterTile(tiles[yy][xx])) return distance;
      }
    }
  }
  return 0;
}

function poiFootprintTiles(poi: Pick<WorldPoi, "x" | "y" | "footprint">): WorldVec[] {
  const radius = Math.floor(poi.footprint / 2);
  const tiles: WorldVec[] = [];
  for (let y = poi.y - radius; y <= poi.y + radius; y += 1) {
    for (let x = poi.x - radius; x <= poi.x + radius; x += 1) tiles.push({ x, y });
  }
  return tiles;
}

function pointInPoiFootprint(poi: WorldPoi, x: number, y: number): boolean {
  const radius = Math.floor(poi.footprint / 2);
  return x >= poi.x - radius && x <= poi.x + radius && y >= poi.y - radius && y <= poi.y + radius;
}

function carveLinePath(from: WorldVec, to: WorldVec): WorldVec[] {
  const path: WorldVec[] = [];
  let x = from.x;
  let y = from.y;
  path.push({ x, y });
  while (x !== to.x || y !== to.y) {
    const dx = to.x - x;
    const dy = to.y - y;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) x += Math.sign(dx);
    else if (dy !== 0) y += Math.sign(dy);
    path.push({ x, y });
  }
  return path;
}

function setWorldTile(tiles: WorldTileId[][], biomes: WorldBiome[][], x: number, y: number, tile: WorldTileId, biome?: WorldBiome) {
  if (!tiles[y]?.[x]) return;
  tiles[y][x] = tile;
  biomes[y][x] = biome ?? WORLD_TILES[tile].biome;
}

function pickByNoise(pool: readonly WorldTileId[], seed: string, x: number, y: number): WorldTileId {
  return pool[Math.floor(hashNoise(`${seed}:pick`, x, y) * pool.length) % pool.length];
}

function isWaterTile(tile?: WorldTileId): boolean {
  return worldTileHasTag(tile, "water");
}

function neighbors4(x: number, y: number): WorldVec[] {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];
}

function neighbors8(x: number, y: number): WorldVec[] {
  return [
    ...neighbors4(x, y),
    { x: x + 1, y: y + 1 },
    { x: x - 1, y: y - 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y + 1 }
  ];
}

function inBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function posKey(pos: WorldVec): string {
  return `${pos.x},${pos.y}`;
}

function parseKey(key: string): WorldVec {
  const [x, y] = key.split(",").map((value) => Number(value));
  return { x, y };
}
