import { WORLD_TILE_IDS, WORLD_TILES, isWorldTileWalkable, type WorldBiome, type WorldTileId } from "../data/worldTiles.ts";
import { WORLD_OBJECT_IDS, type WorldObjectId } from "../data/worldObjects.ts";
import { hashNoise } from "./seededRng.ts";
import { generateSemanticWorld } from "./semantic/semanticGenerator.ts";
import { CAMPAIGN_WORLD_PROFILE } from "./semantic/semanticProfiles.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER, type OverlayCollisionPolicy, type SemanticPoi, type SemanticVec, type SemanticWorld } from "./semantic/semanticTypes.ts";

export const DEFAULT_WORLD_WIDTH = 96;
export const DEFAULT_WORLD_HEIGHT = 64;
export const ACTIVE_WORLDGEN_MODE = "semantic_campaign_archipelago_world" as const;

export interface WorldVec {
  x: number;
  y: number;
}

export type IslandId = "greenhaven" | "coralreach" | "frostmere" | "highspire" | `minor_${number}`;
export type IslandTheme = "grassland" | "sand_coast" | "ice" | "mixed_highland" | "minor";
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
  collisionPolicy: OverlayCollisionPolicy;
  offsetX?: number;
  offsetY?: number;
  alpha?: number;
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
  major: boolean;
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
  routeBridgeCandidates: WorldBridge[];
  objectOverlays: WorldObjectOverlay[];
  shallows: WorldVec[];
  reefs: WorldVec[];
  seaRoutes: WorldVec[][];
  startPosition: WorldVec;
  entryTriggers: WorldEntryTrigger[];
  validation: WorldValidationResult;
  semantic: SemanticWorld;
}

const ROAD_N = 1;
const ROAD_E = 2;
const ROAD_S = 4;
const ROAD_W = 8;

export type TerrainVariantMode = "off" | "sparse" | "patches";

export const TERRAIN_VARIANT_MODE: TerrainVariantMode = "off";

export const SEMANTIC_BASE_TILE_PALETTE = {
  deepOcean: WORLD_TILE_IDS.deepWater,
  shallowWater: WORLD_TILE_IDS.shallowWater,
  freshWater: WORLD_TILE_IDS.shallowWater,
  road: WORLD_TILE_IDS.roadCrossroads,
  lake: WORLD_TILE_IDS.shallowWater,
  beach: WORLD_TILE_IDS.beachSand,
  grassland: WORLD_TILE_IDS.mediumGrass,
  sand: WORLD_TILE_IDS.brightSand,
  ice: WORLD_TILE_IDS.cleanSnow
} as const satisfies Record<string, WorldTileId>;

export function createWorldSeed(): string {
  const random = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `semantic-${Date.now().toString(36)}-${random}`;
}

export function generateWorld(options: { seed?: string; width?: number; height?: number; maxAttempts?: number } = {}): GeneratedWorld {
  const requestedSeed = options.seed ?? createWorldSeed();
  const width = options.width ?? DEFAULT_WORLD_WIDTH;
  const height = options.height ?? DEFAULT_WORLD_HEIGHT;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  let lastWorld: GeneratedWorld | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = attempt === 0 ? requestedSeed : `${requestedSeed}:retry:${attempt}`;
    const semantic = generateSemanticWorld({ seed, profile: CAMPAIGN_WORLD_PROFILE, width, height });
    const world = adaptSemanticWorld(semantic);
    if (world.validation.valid) return world;
    lastWorld = world;
  }
  return lastWorld!;
}

export function getWorldTileAt(world: GeneratedWorld, x: number, y: number): WorldTileId | undefined {
  return world.tiles[y]?.[x];
}

export function isWorldPositionWalkable(world: GeneratedWorld, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return false;
  if (world.semantic) return world.semantic.layers.walkability[y * world.width + x] === 1;
  return isWorldTileWalkable(getWorldTileAt(world, x, y));
}

export function getPoiAt(world: GeneratedWorld, x: number, y: number): WorldPoi | undefined {
  return world.pois.find((poi) => pointInPoiFootprint(poi, x, y));
}

export function getIslandAt(world: GeneratedWorld, x: number, y: number): GeneratedIsland | undefined {
  const id = world.islandByTile[y]?.[x];
  return id ? world.islands.find((island) => island.id === id) : undefined;
}

export function validateGeneratedWorld(world: GeneratedWorld): WorldValidationResult {
  return buildValidationResult(world.semantic, world.pois);
}

export function buildWorldDebugReport(world: GeneratedWorld): string {
  const lines = [
    `# Semantic World Debug Report`,
    ``,
    `Mode: ${world.mode}`,
    `Seed: ${world.seed}`,
    `Size: ${world.width}x${world.height}`,
    `Islands: ${world.islands.length}`,
    `Major islands: ${world.islands.filter((island) => island.major).map((island) => island.name).join(", ")}`,
    `POIs: ${world.pois.length}`,
    `Harbors: ${world.pois.filter((poi) => poi.kind === "harbor").length}`,
    `Road cells: ${world.roads.length}`,
    `Rivers: ${world.rivers.length}`,
    `Shallows: ${world.shallows.length}`,
    ``,
    `## Validation`,
    ``,
    `Valid: ${world.validation.valid ? "yes" : "no"}`,
    `Errors: ${world.validation.errors.length ? world.validation.errors.join("; ") : "none"}`,
    `Warnings: ${world.validation.warnings.length ? world.validation.warnings.join("; ") : "none"}`
  ];
  return `${lines.join("\n")}\n`;
}

function adaptSemanticWorld(semantic: SemanticWorld): GeneratedWorld {
  const tiles = buildTiles(semantic);
  const biomes = buildBiomes(semantic);
  const islandByTile = buildIslandByTile(semantic);
  const pois = semantic.poiList.map((poi) => adaptPoi(poi));
  const roadVisuals = buildRoadVisuals(semantic);
  const roads = roadVisuals.map(({ x, y }) => ({ x, y }));
  const rivers = semantic.rivers.map((river) => river.path.map((cell) => ({ x: cell.x, y: cell.y })));
  const shallows = collectCells(semantic, (i) => semantic.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW);
  const reefs = pickReefs(semantic, shallows);
  const objectOverlays = buildObjectOverlays(semantic, reefs);
  const dockBridges = buildDockTiles(semantic, pois, tiles);
  const routeBridgeCandidates: WorldBridge[] = semantic.bridgeCandidates.map((bridge) => ({
    x: bridge.x,
    y: bridge.y,
    orientation: bridge.orientation,
    material: bridge.islandId === "highspire" || bridge.islandId === "frostmere" ? "stone" : "wood"
  }));
  const bridges = [...dockBridges, ...routeBridgeCandidates];
  const seaRoutes = buildSeaRoutes(pois);
  const entryTriggers = pois.map((poi) => ({ poiId: poi.id, x: poi.x, y: poi.y }));
  const islands = semantic.islands.map((island) => adaptIsland(semantic, tiles, pois, island.id as IslandId));
  const startPosition = chooseStartPosition(semantic, pois);
  const world: GeneratedWorld = {
    mode: ACTIVE_WORLDGEN_MODE,
    width: semantic.width,
    height: semantic.height,
    seed: semantic.seed,
    tiles,
    biomes,
    islands,
    islandByTile,
    pois,
    roads,
    roadVisuals,
    rivers,
    bridges,
    routeBridgeCandidates,
    objectOverlays,
    shallows,
    reefs,
    seaRoutes,
    startPosition,
    entryTriggers,
    validation: buildValidationResult(semantic, pois),
    semantic
  };
  return world;
}

function buildTiles(semantic: SemanticWorld): WorldTileId[][] {
  const rows: WorldTileId[][] = [];
  for (let y = 0; y < semantic.height; y += 1) {
    const row: WorldTileId[] = [];
    for (let x = 0; x < semantic.width; x += 1) row.push(tileForSemanticCell(semantic, x, y));
    rows.push(row);
  }
  return rows;
}

function tileForSemanticCell(semantic: SemanticWorld, x: number, y: number): WorldTileId {
  const i = y * semantic.width + x;
  if (semantic.layers.lakeMap[i]) return SEMANTIC_BASE_TILE_PALETTE.lake;
  if (!semantic.layers.landMask[i]) {
    return semantic.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW ? SEMANTIC_BASE_TILE_PALETTE.shallowWater : SEMANTIC_BASE_TILE_PALETTE.deepOcean;
  }
  if (TERRAIN_VARIANT_MODE === "off") return canonicalTileForBiome(semantic.layers.biome[i]);
  return variantTileForSemanticCell(semantic, x, y, i);
}

function canonicalTileForBiome(biome: number): WorldTileId {
  if (biome === SEMANTIC_BIOME.BEACH) return SEMANTIC_BASE_TILE_PALETTE.beach;
  if (biome === SEMANTIC_BIOME.SAND) return SEMANTIC_BASE_TILE_PALETTE.sand;
  if (biome === SEMANTIC_BIOME.ICE) return SEMANTIC_BASE_TILE_PALETTE.ice;
  return SEMANTIC_BASE_TILE_PALETTE.grassland;
}

function variantTileForSemanticCell(semantic: SemanticWorld, x: number, y: number, i: number): WorldTileId {
  if (semantic.layers.biome[i] === SEMANTIC_BIOME.BEACH) return SEMANTIC_BASE_TILE_PALETTE.beach;
  if (semantic.layers.biome[i] === SEMANTIC_BIOME.SAND) return pickByNoise([WORLD_TILE_IDS.brightSand, WORLD_TILE_IDS.duneSand, WORLD_TILE_IDS.rockySand], semantic.seed, "sand", x, y);
  if (semantic.layers.biome[i] === SEMANTIC_BIOME.ICE) return pickByNoise([WORLD_TILE_IDS.cleanSnow, WORLD_TILE_IDS.packedSnow, WORLD_TILE_IDS.icySnow], semantic.seed, "ice", x, y);
  return pickByNoise([WORLD_TILE_IDS.mediumGrass, WORLD_TILE_IDS.brightGrass, WORLD_TILE_IDS.lushCloverGrass, WORLD_TILE_IDS.flowerMeadowGrass], semantic.seed, "grass", x, y, [0.76, 0.08, 0.1, 0.06]);
}

function buildBiomes(semantic: SemanticWorld): WorldBiome[][] {
  const rows: WorldBiome[][] = [];
  for (let y = 0; y < semantic.height; y += 1) {
    const row: WorldBiome[] = [];
    for (let x = 0; x < semantic.width; x += 1) {
      const i = y * semantic.width + x;
      if (!semantic.layers.landMask[i] || semantic.layers.waterClass[i] !== SEMANTIC_WATER.NONE || semantic.layers.lakeMap[i]) row.push("water");
      else if (semantic.layers.mountainMap[i]) row.push("mountain");
      else if (semantic.layers.forestMap[i]) row.push("forest");
      else if (semantic.layers.biome[i] === SEMANTIC_BIOME.SAND || semantic.layers.biome[i] === SEMANTIC_BIOME.BEACH) row.push("desert");
      else if (semantic.layers.biome[i] === SEMANTIC_BIOME.ICE) row.push("snow");
      else row.push("grassland");
    }
    rows.push(row);
  }
  return rows;
}

function buildIslandByTile(semantic: SemanticWorld): (IslandId | null)[][] {
  const rows: (IslandId | null)[][] = [];
  for (let y = 0; y < semantic.height; y += 1) {
    const row: (IslandId | null)[] = [];
    for (let x = 0; x < semantic.width; x += 1) {
      const numericId = semantic.layers.islandId[y * semantic.width + x];
      row.push((semantic.islandIndexToId.get(numericId) as IslandId | undefined) ?? null);
    }
    rows.push(row);
  }
  return rows;
}

function adaptPoi(poi: SemanticPoi): WorldPoi {
  return {
    id: poi.id,
    name: poi.name,
    kind: poiKind(poi),
    islandId: poi.islandId as IslandId,
    x: poi.x,
    y: poi.y,
    footprint: poi.type === "port" ? 3 : poi.role === "landmark" ? 3 : 3,
    landmarkKind: landmarkKind(poi),
    objectId: objectIdForPoi(poi),
    difficultyTier: poi.difficultyTier
  };
}

function poiKind(poi: SemanticPoi): WorldPoiKind {
  if (poi.type === "port") return "harbor";
  if (poi.role === "settlement") return "town";
  if (poi.role === "gate") return "gate";
  if (poi.role === "final") return "final";
  if (poi.role === "dungeon") return "dungeon";
  return "landmark";
}

function landmarkKind(poi: SemanticPoi): WorldLandmarkKind | undefined {
  if (poi.role !== "landmark") return undefined;
  if (poi.type === "shrine") return "shrine";
  if (poi.type === "cave") return "cave";
  if (poi.type === "ruins") return "ruins";
  if (poi.type === "resource") return "resourceNode";
  if (poi.type === "treasure") return poi.id.toLowerCase().includes("wreck") ? "shipwreck" : "hiddenChest";
  return "ruins";
}

function objectIdForPoi(poi: SemanticPoi): WorldObjectId | undefined {
  if (poi.type === "port") return WORLD_OBJECT_IDS.harborSignpost;
  if (poi.id === "mossCave") return WORLD_OBJECT_IDS.mossyCaveEntrance;
  if (poi.id === "tideShrine") return WORLD_OBJECT_IDS.jungleRuinsStairs;
  if (poi.id === "ashenKeep") return WORLD_OBJECT_IDS.cursedFortressGate;
  if (poi.id === "skyglassTower") return WORLD_OBJECT_IDS.glowingMagicShrine;
  if (poi.id === "starfallGate") return WORLD_OBJECT_IDS.ancientSealedDoor;
  if (poi.id === "eclipseSpire") return WORLD_OBJECT_IDS.darkBossPortal;
  if (poi.type === "shrine") return poi.islandId === "frostmere" ? WORLD_OBJECT_IDS.ancientStandingStones : WORLD_OBJECT_IDS.glowingMagicShrine;
  if (poi.type === "ruins") return WORLD_OBJECT_IDS.ruinedArchway;
  if (poi.type === "cave") return WORLD_OBJECT_IDS.mossyCaveEntrance;
  if (poi.type === "resource") return WORLD_OBJECT_IDS.oreNode;
  if (poi.type === "treasure") return poi.id.toLowerCase().includes("wreck") ? WORLD_OBJECT_IDS.shipwreckDebris : WORLD_OBJECT_IDS.closedTreasureChest;
  return undefined;
}

function adaptIsland(semantic: SemanticWorld, tiles: WorldTileId[][], pois: WorldPoi[], islandId: IslandId): GeneratedIsland {
  const island = semantic.islands.find((candidate) => candidate.id === islandId)!;
  const islandNumber = island.order + 1;
  const tileMap: WorldTileId[][] = [];
  for (let y = island.bounds.minY; y <= island.bounds.maxY; y += 1) {
    const row: WorldTileId[] = [];
    for (let x = island.bounds.minX; x <= island.bounds.maxX; x += 1) {
      row.push(semantic.layers.islandId[y * semantic.width + x] === islandNumber ? tiles[y][x] : WORLD_TILE_IDS.deepWater);
    }
    tileMap.push(row);
  }
  const islandPois = pois.filter((poi) => poi.islandId === islandId);
  const town = islandPois.find((poi) => poi.kind === "town") ?? islandPois[0];
  const harbor = islandPois.find((poi) => poi.kind === "harbor") ?? town;
  return {
    id: islandId,
    name: island.name,
    difficultyTier: island.major ? island.order + 1 : 1,
    theme: island.theme,
    major: island.major,
    bounds: {
      x: island.bounds.minX,
      y: island.bounds.minY,
      width: island.bounds.maxX - island.bounds.minX + 1,
      height: island.bounds.maxY - island.bounds.minY + 1
    },
    tileMap,
    townPosition: town ? { x: town.x, y: town.y } : { x: Math.round(island.center.x), y: Math.round(island.center.y) },
    harborPosition: harbor ? { x: harbor.x, y: harbor.y } : { x: Math.round(island.center.x), y: Math.round(island.center.y) },
    dungeonPositions: islandPois.filter((poi) => poi.kind === "dungeon" || poi.kind === "gate" || poi.kind === "final").map((poi) => ({ x: poi.x, y: poi.y })),
    specialLandmarkPositions: islandPois.filter((poi) => poi.kind === "landmark").map((poi) => ({ x: poi.x, y: poi.y }))
  };
}

function buildRoadVisuals(semantic: SemanticWorld): WorldRoadVisual[] {
  const visuals: WorldRoadVisual[] = [];
  for (let y = 0; y < semantic.height; y += 1) {
    for (let x = 0; x < semantic.width; x += 1) {
      const i = y * semantic.width + x;
      if (!semantic.layers.roadMap[i]) continue;
      const roadMask = roadMaskAt(semantic, x, y);
      const endpointMask = endpointMaskAt(semantic, x, y);
      const mask = roadMask | endpointMask;
      const visual = roadVisualForMask(mask || ROAD_E | ROAD_W);
      visuals.push({ x, y, mask, roadMask, endpointMask, sourceMask: visual.sourceMask, sourceTileId: visual.sourceTileId, rotation: visual.rotation });
    }
  }
  return visuals;
}

function roadMaskAt(semantic: SemanticWorld, x: number, y: number): number {
  let mask = 0;
  if (isRoad(semantic, x, y - 1)) mask |= ROAD_N;
  if (isRoad(semantic, x + 1, y)) mask |= ROAD_E;
  if (isRoad(semantic, x, y + 1)) mask |= ROAD_S;
  if (isRoad(semantic, x - 1, y)) mask |= ROAD_W;
  return mask;
}

function endpointMaskAt(semantic: SemanticWorld, x: number, y: number): number {
  let mask = 0;
  for (const poi of semantic.poiList) {
    if (Math.abs(poi.x - x) + Math.abs(poi.y - y) !== 1) continue;
    if (poi.y === y - 1) mask |= ROAD_N;
    if (poi.x === x + 1) mask |= ROAD_E;
    if (poi.y === y + 1) mask |= ROAD_S;
    if (poi.x === x - 1) mask |= ROAD_W;
  }
  return mask;
}

function isRoad(semantic: SemanticWorld, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < semantic.width && y < semantic.height && semantic.layers.roadMap[y * semantic.width + x] === 1;
}

function roadVisualForMask(mask: number): Pick<WorldRoadVisual, "sourceMask" | "sourceTileId" | "rotation"> {
  switch (mask) {
    case ROAD_N:
      return { sourceTileId: WORLD_TILE_IDS.roadDeadEndEast, sourceMask: ROAD_W, rotation: 90 };
    case ROAD_E:
      return { sourceTileId: WORLD_TILE_IDS.roadDeadEndEast, sourceMask: ROAD_W, rotation: 180 };
    case ROAD_S:
      return { sourceTileId: WORLD_TILE_IDS.roadDeadEndEast, sourceMask: ROAD_W, rotation: 270 };
    case ROAD_W:
      return { sourceTileId: WORLD_TILE_IDS.roadDeadEndEast, sourceMask: ROAD_W, rotation: 0 };
    case ROAD_N | ROAD_S:
      return { sourceTileId: WORLD_TILE_IDS.roadHorizontal, sourceMask: ROAD_E | ROAD_W, rotation: 90 };
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

function collectCells(semantic: SemanticWorld, predicate: (i: number) => boolean): WorldVec[] {
  const cells: WorldVec[] = [];
  for (let y = 0; y < semantic.height; y += 1) {
    for (let x = 0; x < semantic.width; x += 1) {
      const i = y * semantic.width + x;
      if (predicate(i)) cells.push({ x, y });
    }
  }
  return cells;
}

function pickReefs(semantic: SemanticWorld, shallows: WorldVec[]): WorldVec[] {
  return shallows.filter((pos) => hashNoise(`${semantic.seed}:reef`, pos.x, pos.y) > 0.92).slice(0, 22);
}

function buildObjectOverlays(semantic: SemanticWorld, reefs: WorldVec[]): WorldObjectOverlay[] {
  const overlays: WorldObjectOverlay[] = [];
  for (const range of [...semantic.mountainRanges].sort((a, b) => a.bounds.maxY - b.bounds.maxY || a.bounds.minX - b.bounds.minX)) {
    overlays.push(...buildMountainPatchOverlays(semantic, range));
  }
  for (let y = 0; y < semantic.height; y += 1) {
    for (let x = 0; x < semantic.width; x += 1) {
      const i = y * semantic.width + x;
      if (!semantic.layers.forestMap[i]) continue;
      const objectId = semantic.layers.biome[i] === SEMANTIC_BIOME.ICE ? WORLD_OBJECT_IDS.darkPineTree : hashNoise(`${semantic.seed}:forest-object`, x, y) > 0.78 ? WORLD_OBJECT_IDS.denseJungleBush : WORLD_OBJECT_IDS.broadleafTree;
      overlays.push({ id: `forest-${x}-${y}`, x, y, objectId, scale: 0.92, collisionPolicy: "softTerrain" });
    }
  }
  reefs.forEach((pos, index) => {
    const roll = hashNoise(`${semantic.seed}:ocean-object:${index}`, pos.x, pos.y);
    const objectId =
      roll > 0.88 ? WORLD_OBJECT_IDS.shipwreckDebris : roll > 0.72 ? WORLD_OBJECT_IDS.brokenMast : roll > 0.48 ? WORLD_OBJECT_IDS.coralClusterBlue : WORLD_OBJECT_IDS.fishingSpot;
    overlays.push({ id: `reef-${index}-${pos.x}-${pos.y}`, x: pos.x, y: pos.y, objectId, scale: 1.15, collisionPolicy: "visualOnly" });
  });
  return overlays;
}

function buildMountainPatchOverlays(semantic: SemanticWorld, range: SemanticWorld["mountainRanges"][number]): WorldObjectOverlay[] {
  const cells = [...range.cells].sort((a, b) => a.y - b.y || a.x - b.x);
  if (!cells.length) return [];
  const overlays: WorldObjectOverlay[] = [];
  const rangeObjectId = mountainRangeObjectId(semantic, range);
  for (let visualIndex = 0; visualIndex < cells.length; visualIndex += 1) {
    const anchor = cells[visualIndex];
    const scaleRoll = hashNoise(`${semantic.seed}:mountain-patch-scale:${range.id}:${visualIndex}`, anchor.x, anchor.y);
    const offsetRollX = hashNoise(`${semantic.seed}:mountain-patch-offset-x:${range.id}:${visualIndex}`, anchor.x, anchor.y);
    const offsetRollY = hashNoise(`${semantic.seed}:mountain-patch-offset-y:${range.id}:${visualIndex}`, anchor.x, anchor.y);
    const normalizedY = range.bounds.maxY === range.bounds.minY ? 0.5 : (anchor.y - range.bounds.minY) / (range.bounds.maxY - range.bounds.minY);
    const largeBackPeakBias = 1 - normalizedY;
    overlays.push({
      id: `mountain-${range.id}-patch-${visualIndex}`,
      x: anchor.x,
      y: anchor.y,
      objectId: rangeObjectId,
      scale: range.smallOutcrop ? 1.02 + scaleRoll * 0.1 : 1.14 + largeBackPeakBias * 0.08 + scaleRoll * 0.08,
      offsetX: (offsetRollX - 0.5) * (range.smallOutcrop ? 0.12 : 0.18),
      offsetY: (offsetRollY - 0.5) * (range.smallOutcrop ? 0.1 : 0.14) - largeBackPeakBias * 0.04,
      alpha: 0.96,
      collisionPolicy: "hardBlock"
    });
  }
  return overlays;
}

function mountainRangeObjectId(
  semantic: SemanticWorld,
  range: SemanticWorld["mountainRanges"][number]
): WorldObjectId {
  const snowCells = range.cells.filter((cell) => semantic.layers.biome[cell.y * semantic.width + cell.x] === SEMANTIC_BIOME.ICE).length;
  if (range.kind === "snow_mountain" || snowCells >= range.cells.length / 2) return WORLD_OBJECT_IDS.snowyMountainPeak;
  return WORLD_OBJECT_IDS.smallMountainPeak;
}

function buildDockTiles(semantic: SemanticWorld, pois: WorldPoi[], tiles: WorldTileId[][]): WorldBridge[] {
  const bridges: WorldBridge[] = [];
  for (const harbor of pois.filter((poi) => poi.kind === "harbor")) {
    for (const next of neighbors4(harbor.x, harbor.y)) {
      if (!inBounds(semantic.width, semantic.height, next.x, next.y)) continue;
      if (!isWaterTile(tiles[next.y][next.x])) continue;
      bridges.push({
        x: next.x,
        y: next.y,
        orientation: next.x === harbor.x ? "vertical" : "horizontal",
        material: harbor.islandId === "highspire" || harbor.islandId === "frostmere" ? "stone" : "wood"
      });
      break;
    }
  }
  return bridges;
}

function buildSeaRoutes(pois: WorldPoi[]): WorldVec[][] {
  const harborByIsland = new Map(pois.filter((poi) => poi.kind === "harbor").map((poi) => [poi.islandId, poi]));
  const routePairs: [IslandId, IslandId][] = [
    ["greenhaven", "coralreach"],
    ["coralreach", "frostmere"],
    ["frostmere", "highspire"],
    ["highspire", "greenhaven"]
  ];
  return routePairs
    .map(([fromId, toId]) => {
      const from = harborByIsland.get(fromId);
      const to = harborByIsland.get(toId);
      return from && to ? carveLinePath(from, to) : [];
    })
    .filter((route) => route.length > 0);
}

function chooseStartPosition(semantic: SemanticWorld, pois: WorldPoi[]): WorldVec {
  const starterTown = pois.find((poi) => poi.islandId === CAMPAIGN_WORLD_PROFILE.startingIslandId && poi.kind === "town");
  if (starterTown) {
    const candidates = [
      { x: starterTown.x, y: starterTown.y + 2 },
      { x: starterTown.x - 2, y: starterTown.y },
      { x: starterTown.x + 2, y: starterTown.y },
      { x: starterTown.x, y: starterTown.y - 2 },
      { x: starterTown.x, y: starterTown.y + 1 },
      { x: starterTown.x - 1, y: starterTown.y },
      { x: starterTown.x + 1, y: starterTown.y }
    ];
    const poiKeys = new Set(pois.map((poi) => `${poi.x},${poi.y}`));
    const isValidStart = (candidate: WorldVec) => isSemanticWalkable(semantic, candidate.x, candidate.y) && !poiKeys.has(`${candidate.x},${candidate.y}`);
    const clear = candidates.find((candidate) => isValidStart(candidate) && !hasNearbySemanticMountain(semantic, candidate.x, candidate.y, 2));
    if (clear) return clear;
    const valid = candidates.find(isValidStart);
    if (valid) return valid;
  }
  const starterIsland = semantic.islands.find((island) => island.id === CAMPAIGN_WORLD_PROFILE.startingIslandId);
  if (starterIsland) {
    let firstWalkable: WorldVec | undefined;
    for (let radius = 0; radius < 14; radius += 1) {
      for (let y = Math.round(starterIsland.center.y) - radius; y <= Math.round(starterIsland.center.y) + radius; y += 1) {
        for (let x = Math.round(starterIsland.center.x) - radius; x <= Math.round(starterIsland.center.x) + radius; x += 1) {
          if (!isSemanticWalkable(semantic, x, y)) continue;
          firstWalkable ??= { x, y };
          if (!hasNearbySemanticMountain(semantic, x, y, 2)) return { x, y };
        }
      }
    }
    if (firstWalkable) return firstWalkable;
  }
  return { x: 10, y: 22 };
}

function buildValidationResult(semantic: SemanticWorld, pois: WorldPoi[]): WorldValidationResult {
  const biomeCounts: Record<string, number> = {};
  for (const row of buildBiomes(semantic)) {
    for (const biome of row) biomeCounts[biome] = (biomeCounts[biome] ?? 0) + 1;
  }
  const reachablePoiIds = pois.filter((poi) => isSemanticWalkable(semantic, poi.x, poi.y)).map((poi) => poi.id);
  const errors = [...semantic.validation.errors];
  const warnings = [...semantic.validation.warnings];
  const start = chooseStartPosition(semantic, pois);
  if (!isSemanticWalkable(semantic, start.x, start.y)) errors.push("Start position is not walkable.");
  if (hasNearbySemanticMountain(semantic, start.x, start.y, 2)) errors.push("Start position is too close to mountain collision.");
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    reachablePoiIds,
    biomeCounts
  };
}

function isSemanticWalkable(semantic: SemanticWorld, x: number, y: number): boolean {
  return inBounds(semantic.width, semantic.height, x, y) && semantic.layers.walkability[y * semantic.width + x] === 1;
}

function hasNearbySemanticMountain(semantic: SemanticWorld, x: number, y: number, radius: number): boolean {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(semantic.width, semantic.height, xx, yy) || Math.hypot(xx - x, yy - y) > radius) continue;
      if (semantic.layers.mountainMap[yy * semantic.width + xx]) return true;
    }
  }
  return false;
}

function pointInPoiFootprint(poi: WorldPoi, x: number, y: number): boolean {
  const radius = Math.floor(poi.footprint / 2);
  return x >= poi.x - radius && x <= poi.x + radius && y >= poi.y - radius && y <= poi.y + radius;
}

function pickByNoise(ids: WorldTileId[], seed: string, salt: string, x: number, y: number, weights?: number[]): WorldTileId {
  const value = hashNoise(`${seed}:${salt}`, x, y);
  if (!weights?.length) return ids[Math.floor(value * ids.length) % ids.length];
  let total = 0;
  for (const weight of weights) total += weight;
  let cursor = value * total;
  for (let i = 0; i < ids.length; i += 1) {
    cursor -= weights[i] ?? 0;
    if (cursor <= 0) return ids[i];
  }
  return ids[0];
}

function isWaterTile(tile: WorldTileId | undefined): boolean {
  return !!tile && WORLD_TILES[tile]?.biome === "water";
}

function neighbors4(x: number, y: number): WorldVec[] {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y }
  ];
}

function carveLinePath(from: WorldVec, to: WorldVec): WorldVec[] {
  const path: WorldVec[] = [];
  let x = from.x;
  let y = from.y;
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y), 1);
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    x = Math.round(from.x + (to.x - from.x) * t);
    y = Math.round(from.y + (to.y - from.y) * t);
    const current = { x, y };
    if (!path.some((cell) => cell.x === current.x && cell.y === current.y)) path.push(current);
  }
  return path;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function inBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}
