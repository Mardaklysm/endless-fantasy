import {
  WORLD_TILES,
  isWorldTileWalkable,
  worldTileEncounterFamily,
  worldTileHasTag,
  worldTileMovementCost,
  type WorldBiome,
  type WorldEncounterFamily,
  type WorldTileId
} from "../data/worldTiles.ts";

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

export interface WorldValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  reachablePoiIds: string[];
  biomeCounts: Record<string, number>;
}

export interface GeneratedWorld {
  width: number;
  height: number;
  seed: string;
  tiles: WorldTileId[][];
  biomes: WorldBiome[][];
  pois: WorldPoi[];
  roads: WorldVec[];
  rivers: WorldVec[][];
  bridges: WorldBridge[];
  startPosition: WorldVec;
  entryTriggers: WorldEntryTrigger[];
  validation: WorldValidationResult;
}

interface FieldMap {
  elevation: number[][];
  moisture: number[][];
  temperature: number[][];
  detail: number[][];
}

interface PoiBlueprint {
  id: string;
  name: string;
  kind: WorldPoiKind;
  target: WorldVec;
  footprint: number;
  preferredBiomes: WorldBiome[];
  nearWater?: boolean;
  nearMountain?: boolean;
}

const POI_BLUEPRINTS: PoiBlueprint[] = [
  { id: "dawnford", name: "Dawnford", kind: "town", target: { x: 0.18, y: 0.52 }, footprint: 3, preferredBiomes: ["grassland"] },
  { id: "brinewick", name: "Brinewick", kind: "town", target: { x: 0.28, y: 0.7 }, footprint: 3, preferredBiomes: ["grassland", "water"], nearWater: true },
  { id: "elderleaf", name: "Elderleaf", kind: "town", target: { x: 0.24, y: 0.25 }, footprint: 3, preferredBiomes: ["forest"] },
  { id: "sunbarrow", name: "Sunbarrow", kind: "town", target: { x: 0.66, y: 0.48 }, footprint: 3, preferredBiomes: ["desert"] },
  { id: "starfallGate", name: "Starfall Gate", kind: "gate", target: { x: 0.82, y: 0.64 }, footprint: 3, preferredBiomes: ["darkland", "grassland"] },
  { id: "mossCave", name: "Moss Cave", kind: "dungeon", target: { x: 0.34, y: 0.42 }, footprint: 3, preferredBiomes: ["forest", "mountain"], nearMountain: true },
  { id: "ashenKeep", name: "Ashen Keep", kind: "dungeon", target: { x: 0.62, y: 0.34 }, footprint: 3, preferredBiomes: ["mountain", "desert"], nearMountain: true },
  { id: "tideShrine", name: "Tide Shrine", kind: "dungeon", target: { x: 0.72, y: 0.75 }, footprint: 3, preferredBiomes: ["grassland", "water"], nearWater: true },
  { id: "skyglassTower", name: "Skyglass Tower", kind: "dungeon", target: { x: 0.74, y: 0.2 }, footprint: 3, preferredBiomes: ["snow", "mountain"], nearMountain: true },
  { id: "eclipseSpire", name: "Eclipse Spire", kind: "final", target: { x: 0.9, y: 0.18 }, footprint: 3, preferredBiomes: ["darkland", "mountain"], nearMountain: true }
];

const GRASSLAND_TILES: WorldTileId[] = [
  "bright_grass",
  "medium_grass",
  "dark_grass",
  "flower_meadow",
  "clover_lush_grass",
  "weeds_grass",
  "grass_stones",
  "yellow_flower_grass"
];

const FOREST_TILES: WorldTileId[] = [
  "forest_floor",
  "dark_forest_floor",
  "mossy_forest_ground",
  "dense_leafy_woodland",
  "bush_hedge",
  "tree_covered_green",
  "rooty_forest_earth",
  "autumn_woodland",
  "enchanted_forest_ground"
];

const DESERT_TILES: WorldTileId[] = [
  "bright_sand",
  "golden_sand",
  "dune_sand",
  "rocky_sand",
  "cracked_dry_earth",
  "reddish_desert_soil",
  "cactus_scrub",
  "sandstone_floor"
];

const SNOW_TILES: WorldTileId[] = ["clean_snow", "packed_snow", "icy_snow", "frozen_ground", "frosty_sparkle_snow", "snow_rock"];
const DARKLAND_TILES: WorldTileId[] = [
  "darkland_grass",
  "dead_earth",
  "muddy_swamp",
  "boggy_wetland",
  "ash_ground",
  "cursed_purple_soil",
  "blackened_wasteland",
  "sickly_corrupted_ground",
  "haunted_dead_forest_floor"
];
const MOUNTAIN_TILES: WorldTileId[] = [
  "rocky_hill_ground",
  "mountain_foothill",
  "dark_mountain_ground",
  "gravel_stone_ground",
  "cliff_top_rock",
  "canyon_stone",
  "mossy_rock",
  "cave_rock"
];

const WATER_TILES: WorldTileId[] = ["deep_ocean_water", "light_water", "shallow_water"];

export function createWorldSeed(): string {
  return `asterra-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
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
  throw new Error(`Unable to generate a valid world after ${maxAttempts} attempts: ${errors}`);
}

export function getWorldTileAt(world: GeneratedWorld, x: number, y: number): WorldTileId | undefined {
  return world.tiles[y]?.[x];
}

export function isWorldPositionWalkable(world: GeneratedWorld, x: number, y: number): boolean {
  const tile = getWorldTileAt(world, x, y);
  return !!tile && isWorldTileWalkable(tile);
}

export function getPoiAt(world: GeneratedWorld, x: number, y: number): WorldPoi | undefined {
  return world.pois.find((poi) => pointInPoiFootprint(poi, x, y));
}

export function worldEncounterFamilyForTile(tileId: WorldTileId): WorldEncounterFamily | undefined {
  return worldTileEncounterFamily(tileId);
}

export function validateGeneratedWorld(world: GeneratedWorld): WorldValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const biomeCounts: Record<string, number> = {};
  let walkableCount = 0;
  let waterCount = 0;

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[y][x];
      const biome = WORLD_TILES[tile].biome;
      biomeCounts[biome] = (biomeCounts[biome] ?? 0) + 1;
      if (isWorldTileWalkable(tile)) walkableCount += 1;
      if (worldTileHasTag(tile, "water")) waterCount += 1;
    }
  }

  if (!isWorldPositionWalkable(world, world.startPosition.x, world.startPosition.y)) errors.push("Start position is not walkable.");
  if (walkableCount < world.width * world.height * 0.48) errors.push("Generated world does not have enough walkable land.");
  if (waterCount < world.width * world.height * 0.08) warnings.push("Generated world has little water.");
  if (Object.keys(biomeCounts).filter((key) => biomeCounts[key] > 12).length < 6) errors.push("Generated world does not have enough biome variety.");

  for (const poi of world.pois) {
    const tile = getWorldTileAt(world, poi.x, poi.y);
    if (!tile) errors.push(`${poi.name} is outside the map.`);
    else {
      if (worldTileHasTag(tile, "water")) errors.push(`${poi.name} is on water.`);
      if (!isWorldTileWalkable(tile)) errors.push(`${poi.name} is not on a walkable tile.`);
    }
    if (!poiHasWalkableApproach(world, poi)) errors.push(`${poi.name} has no walkable approach tile.`);
  }

  for (const bridge of world.bridges) {
    const tile = getWorldTileAt(world, bridge.x, bridge.y);
    if (!tile || !isWorldTileWalkable(tile) || !worldTileHasTag(tile, "bridge")) errors.push(`Bridge at ${bridge.x},${bridge.y} is not walkable bridge terrain.`);
    const forwardA = bridge.orientation === "horizontal" ? { x: bridge.x - 1, y: bridge.y } : { x: bridge.x, y: bridge.y - 1 };
    const forwardB = bridge.orientation === "horizontal" ? { x: bridge.x + 1, y: bridge.y } : { x: bridge.x, y: bridge.y + 1 };
    if (!isWorldPositionWalkable(world, forwardA.x, forwardA.y) || !isWorldPositionWalkable(world, forwardB.x, forwardB.y)) {
      errors.push(`Bridge at ${bridge.x},${bridge.y} is not connected to walkable route tiles.`);
    }
  }

  const reachable = floodReachable(world, world.startPosition);
  const reachablePoiIds = world.pois.filter((poi) => poiFootprintTiles(poi).some((tile) => reachable.has(posKey(tile)))).map((poi) => poi.id);
  for (const poi of world.pois) {
    if (!reachablePoiIds.includes(poi.id)) errors.push(`${poi.name} is not reachable from the start.`);
  }

  return { valid: errors.length === 0, errors, warnings, reachablePoiIds, biomeCounts };
}

export function buildWorldDebugReport(world: GeneratedWorld): string {
  const validation = world.validation.valid ? "valid" : "invalid";
  const poiLines = world.pois.map((poi) => `- ${poi.name} (${poi.id}, ${poi.kind}) at ${poi.x},${poi.y}, footprint ${poi.footprint}`).join("\n");
  const biomeLines = Object.entries(world.validation.biomeCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([biome, count]) => `- ${biome}: ${count}`)
    .join("\n");
  return `# Generated World Debug Report

Seed: \`${world.seed}\`
Map size: ${world.width}x${world.height}
Validation: ${validation}
Start position: ${world.startPosition.x},${world.startPosition.y}
Road tiles carved: ${world.roads.length}
River count: ${world.rivers.length}
Bridge count: ${world.bridges.length}

## POIs

${poiLines}

## Biome Counts

${biomeLines}

## Reachability

Reachable POIs: ${world.validation.reachablePoiIds.join(", ")}

## Bridges

${world.bridges.map((bridge) => `- ${bridge.material} ${bridge.orientation} bridge at ${bridge.x},${bridge.y}`).join("\n") || "- none"}

## Validation Errors

${world.validation.errors.map((error) => `- ${error}`).join("\n") || "- none"}

## Validation Warnings

${world.validation.warnings.map((warning) => `- ${warning}`).join("\n") || "- none"}
`;
}

function generateWorldAttempt(seed: string, width: number, height: number): GeneratedWorld {
  const fields = createFields(seed, width, height);
  const rng = makeRng(seed);
  const tiles: WorldTileId[][] = [];
  const biomes: WorldBiome[][] = [];

  for (let y = 0; y < height; y += 1) {
    const tileRow: WorldTileId[] = [];
    const biomeRow: WorldBiome[] = [];
    for (let x = 0; x < width; x += 1) {
      const biome = classifyBiome(fields, width, height, x, y);
      biomeRow.push(biome);
      tileRow.push(pickBiomeTile(biome, fields.detail[y][x], rng));
    }
    tiles.push(tileRow);
    biomes.push(biomeRow);
  }

  smoothIsolatedWater(tiles, biomes);
  const rivers = carveRivers(seed, tiles, biomes, fields);
  const pois = placePois(seed, tiles, biomes);
  carvePoiFootprints(tiles, pois);
  const dawnford = pois.find((poi) => poi.id === "dawnford") ?? pois[0];
  const startPosition = findStartPosition(tiles, dawnford);
  const roads: WorldVec[] = [];
  const bridges: WorldBridge[] = [];
  connectRoads(seed, tiles, biomes, pois, startPosition, roads, bridges);
  ensureAtLeastOneRoadBridge(tiles, pois, startPosition, roads, rivers, bridges);
  const entryTriggers = pois.flatMap((poi) => poiFootprintTiles(poi).map((tile) => ({ poiId: poi.id, x: tile.x, y: tile.y })));
  const world: GeneratedWorld = {
    width,
    height,
    seed,
    tiles,
    biomes,
    pois,
    roads,
    rivers,
    bridges,
    startPosition,
    entryTriggers,
    validation: { valid: false, errors: [], warnings: [], reachablePoiIds: [], biomeCounts: {} }
  };
  return world;
}

function createFields(seed: string, width: number, height: number): FieldMap {
  const elevation: number[][] = [];
  const moisture: number[][] = [];
  const temperature: number[][] = [];
  const detail: number[][] = [];
  for (let y = 0; y < height; y += 1) {
    const eRow: number[] = [];
    const mRow: number[] = [];
    const tRow: number[] = [];
    const dRow: number[] = [];
    for (let x = 0; x < width; x += 1) {
      const nx = x / Math.max(1, width - 1);
      const ny = y / Math.max(1, height - 1);
      const edgeDistance = Math.min(x, y, width - 1 - x, height - 1 - y) / Math.min(width, height);
      const edgePenalty = clamp(0.36 - edgeDistance * 1.25, 0, 0.36);
      const ridge = Math.abs(fbm(seed, nx * 3.2 + 12, ny * 3.2 - 4, 4, 2.05) - 0.5) * 2;
      const e = clamp(fbm(seed, nx * 2.1, ny * 2.1, 5, 2) * 0.72 + ridge * 0.28 - edgePenalty, 0, 1);
      const m = clamp(fbm(`${seed}:moisture`, nx * 2.5 + 4, ny * 2.5 + 9, 5, 2) * 0.88 + (0.42 - e) * 0.18, 0, 1);
      const t = clamp(1 - ny * 0.92 - e * 0.2 + fbm(`${seed}:temperature`, nx * 1.8 - 8, ny * 1.8, 4, 2) * 0.35 - 0.12, 0, 1);
      eRow.push(e);
      mRow.push(m);
      tRow.push(t);
      dRow.push(fbm(`${seed}:detail`, nx * 10, ny * 10, 3, 2));
    }
    elevation.push(eRow);
    moisture.push(mRow);
    temperature.push(tRow);
    detail.push(dRow);
  }
  return { elevation, moisture, temperature, detail };
}

function classifyBiome(fields: FieldMap, width: number, height: number, x: number, y: number): WorldBiome {
  const nx = x / Math.max(1, width - 1);
  const ny = y / Math.max(1, height - 1);
  const e = fields.elevation[y][x];
  const m = fields.moisture[y][x];
  const t = fields.temperature[y][x];
  const desertPatch = radialInfluence(nx, ny, 0.7, 0.5, 0.24);
  const snowPatch = radialInfluence(nx, ny, 0.72, 0.18, 0.2);
  const darkPatch = radialInfluence(nx, ny, 0.84, 0.24, 0.24);
  const forestPatch = radialInfluence(nx, ny, 0.25, 0.26, 0.26);

  if (e < 0.22) return "water";
  if (e < 0.27 && fields.detail[y][x] < 0.45) return "water";
  if (e > 0.77 || (e > 0.68 && fields.detail[y][x] > 0.62)) return "mountain";
  if (darkPatch > 0.58 || (m > 0.78 && e < 0.42 && nx > 0.55)) return "darkland";
  if (snowPatch > 0.6 || t < 0.25 || (e > 0.62 && t < 0.42)) return "snow";
  if (desertPatch > 0.52 || (t > 0.63 && m < 0.42)) return "desert";
  if (forestPatch > 0.5 || m > 0.57) return "forest";
  return "grassland";
}

function pickBiomeTile(biome: WorldBiome, detail: number, rng: () => number): WorldTileId {
  if (biome === "water") return detail < 0.48 ? "deep_ocean_water" : detail < 0.72 ? "light_water" : "shallow_water";
  if (biome === "forest") return pickWeighted(FOREST_TILES, detail, rng);
  if (biome === "desert") return pickWeighted(DESERT_TILES, detail, rng);
  if (biome === "snow") return pickWeighted(SNOW_TILES, detail, rng);
  if (biome === "darkland") return pickWeighted(DARKLAND_TILES, detail, rng);
  if (biome === "mountain") return pickWeighted(MOUNTAIN_TILES, detail, rng);
  return pickWeighted(GRASSLAND_TILES, detail, rng);
}

function pickWeighted(tiles: WorldTileId[], detail: number, rng: () => number): WorldTileId {
  const value = (detail * 0.65 + rng() * 0.35) * tiles.length;
  return tiles[Math.min(tiles.length - 1, Math.floor(value))];
}

function smoothIsolatedWater(tiles: WorldTileId[][], biomes: WorldBiome[][]) {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  const next = tiles.map((row) => [...row]);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const waterNeighbors = neighbors4(x, y).filter((p) => worldTileHasTag(tiles[p.y][p.x], "water")).length;
      if (worldTileHasTag(tiles[y][x], "water") && waterNeighbors <= 1) {
        next[y][x] = biomes[y][x] === "desert" ? "bright_sand" : "medium_grass";
      }
      if (!worldTileHasTag(tiles[y][x], "water") && waterNeighbors >= 4) next[y][x] = "light_water";
    }
  }
  for (let y = 0; y < height; y += 1) tiles[y] = next[y];
}

function carveRivers(seed: string, tiles: WorldTileId[][], biomes: WorldBiome[][], fields: FieldMap): WorldVec[][] {
  const height = tiles.length;
  const width = tiles[0].length;
  const starts: WorldVec[] = [];
  for (let y = 3; y < height - 3; y += 1) {
    for (let x = 3; x < width - 3; x += 1) {
      if (fields.elevation[y][x] > 0.68 && biomes[y][x] === "mountain") starts.push({ x, y });
    }
  }
  starts.sort((a, b) => fields.elevation[b.y][b.x] - fields.elevation[a.y][a.x]);
  const rng = makeRng(`${seed}:rivers`);
  const rivers: WorldVec[][] = [];
  for (const start of starts) {
    if (rivers.length >= 4) break;
    if (rivers.some((river) => river.some((tile) => manhattan(tile, start) < 10))) continue;
    const river = traceRiver(start, tiles, fields, rng);
    if (river.length < 8) continue;
    for (const tile of river) {
      if (worldTileHasTag(tiles[tile.y][tile.x], "water") && tiles[tile.y][tile.x] !== "river_water") continue;
      tiles[tile.y][tile.x] = "river_water";
      biomes[tile.y][tile.x] = "water";
    }
    rivers.push(river);
  }
  return rivers;
}

function traceRiver(start: WorldVec, tiles: WorldTileId[][], fields: FieldMap, rng: () => number): WorldVec[] {
  const height = tiles.length;
  const width = tiles[0].length;
  const path: WorldVec[] = [];
  const seen = new Set<string>();
  let current = start;
  for (let i = 0; i < width + height; i += 1) {
    path.push(current);
    seen.add(posKey(current));
    if (i > 4 && (worldTileHasTag(tiles[current.y][current.x], "water") || current.x <= 1 || current.y <= 1 || current.x >= width - 2 || current.y >= height - 2)) break;
    const options = neighbors8(current.x, current.y)
      .filter((p) => inBounds(width, height, p.x, p.y) && !seen.has(posKey(p)))
      .map((p) => {
        const edge = Math.min(p.x, p.y, width - 1 - p.x, height - 1 - p.y);
        const score = fields.elevation[p.y][p.x] + edge * 0.012 + rng() * 0.08;
        return { p, score };
      })
      .sort((a, b) => a.score - b.score);
    if (!options.length) break;
    current = options[0].p;
  }
  return path;
}

function placePois(seed: string, tiles: WorldTileId[][], biomes: WorldBiome[][]): WorldPoi[] {
  const rng = makeRng(`${seed}:pois`);
  const placed: WorldPoi[] = [];
  for (const blueprint of POI_BLUEPRINTS) {
    const tile = findPoiTile(blueprint, tiles, biomes, placed, rng);
    placed.push({ id: blueprint.id, name: blueprint.name, kind: blueprint.kind, x: tile.x, y: tile.y, footprint: blueprint.footprint });
  }
  return placed;
}

function findPoiTile(blueprint: PoiBlueprint, tiles: WorldTileId[][], biomes: WorldBiome[][], placed: WorldPoi[], rng: () => number): WorldVec {
  const height = tiles.length;
  const width = tiles[0].length;
  const target = { x: Math.round(blueprint.target.x * (width - 1)), y: Math.round(blueprint.target.y * (height - 1)) };
  let best: { pos: WorldVec; score: number } | undefined;
  const radius = Math.floor(blueprint.footprint / 2);

  for (let y = radius + 2; y < height - radius - 2; y += 1) {
    for (let x = radius + 2; x < width - radius - 2; x += 1) {
      if (!canPlacePoiAt(tiles, x, y, radius)) continue;
      const tile = tiles[y][x];
      const biome = WORLD_TILES[tile].biome;
      let score = Math.hypot(x - target.x, y - target.y);
      if (!blueprint.preferredBiomes.includes(biome)) score += 12;
      if (blueprint.nearWater) score += distanceToTag(tiles, x, y, "water", 8) * 0.9;
      if (blueprint.nearMountain) score += distanceToBiome(tiles, x, y, "mountain", 8) * 0.8;
      for (const other of placed) {
        const dist = Math.hypot(x - other.x, y - other.y);
        if (dist < 7) score += (7 - dist) * 12;
      }
      score += rng() * 2.5;
      if (!best || score < best.score) best = { pos: { x, y }, score };
    }
  }

  return best?.pos ?? target;
}

function canPlacePoiAt(tiles: WorldTileId[][], x: number, y: number, radius: number): boolean {
  const height = tiles.length;
  const width = tiles[0].length;
  if (!inBounds(width, height, x, y)) return false;
  const center = tiles[y][x];
  if (worldTileHasTag(center, "water") || !isWorldTileWalkable(center)) return false;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(width, height, xx, yy)) return false;
      if (worldTileHasTag(tiles[yy][xx], "water")) return false;
    }
  }
  return true;
}

function carvePoiFootprints(tiles: WorldTileId[][], pois: WorldPoi[]) {
  for (const poi of pois) {
    const tile: WorldTileId = poi.kind === "town" || poi.kind === "gate" ? "cobblestone_road" : "ancient_ruin_floor";
    for (const pos of poiFootprintTiles(poi)) {
      if (tiles[pos.y]?.[pos.x]) tiles[pos.y][pos.x] = tile;
    }
  }
}

function findStartPosition(tiles: WorldTileId[][], dawnford: WorldPoi): WorldVec {
  const radius = Math.floor(dawnford.footprint / 2);
  const candidates = [
    { x: dawnford.x, y: dawnford.y + radius + 1 },
    { x: dawnford.x - 1, y: dawnford.y + radius + 1 },
    { x: dawnford.x + 1, y: dawnford.y + radius + 1 },
    { x: dawnford.x, y: dawnford.y }
  ];
  for (const pos of candidates) {
    if (tiles[pos.y]?.[pos.x]) {
      tiles[pos.y][pos.x] = "dirt_road";
      return pos;
    }
  }
  return { x: dawnford.x, y: dawnford.y };
}

function connectRoads(seed: string, tiles: WorldTileId[][], biomes: WorldBiome[][], pois: WorldPoi[], start: WorldVec, roads: WorldVec[], bridges: WorldBridge[]) {
  const dawnford = pois.find((poi) => poi.id === "dawnford") ?? pois[0];
  const connections = [{ from: start, to: { x: dawnford.x, y: dawnford.y }, main: true }];
  for (const poi of pois) {
    if (poi.id === dawnford.id) continue;
    connections.push({ from: { x: dawnford.x, y: dawnford.y }, to: { x: poi.x, y: poi.y }, main: poi.kind === "town" || poi.kind === "gate" || poi.kind === "final" });
  }
  for (const [index, connection] of connections.entries()) {
    const path = findRoadPath(seed, tiles, connection.from, connection.to, index);
    carveRoadPath(tiles, biomes, path, connection.main, roads, bridges);
  }
}

function findRoadPath(seed: string, tiles: WorldTileId[][], start: WorldVec, end: WorldVec, index: number): WorldVec[] {
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
      if (!roadCanCrossTile(tiles[next.y][next.x], next, end)) continue;
      const tile = tiles[next.y][next.x];
      const bridgeCost = tile === "river_water" ? 9 : 0;
      const noiseCost = hashNoise(`${seed}:road:${index}`, next.x, next.y) * 1.2;
      const tentative = (gScore.get(posKey(current)) ?? Infinity) + worldTileMovementCost(tile) + bridgeCost + noiseCost;
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

function roadCanCrossTile(tile: WorldTileId, pos: WorldVec, end: WorldVec): boolean {
  if (pos.x === end.x && pos.y === end.y) return true;
  if (tile === "river_water") return true;
  if (worldTileHasTag(tile, "water")) return false;
  if (worldTileHasTag(tile, "lava") || worldTileHasTag(tile, "cliff")) return false;
  return isWorldTileWalkable(tile);
}

function reconstructPath(came: Map<string, WorldVec>, current: WorldVec): WorldVec[] {
  const path = [current];
  while (came.has(posKey(current))) {
    current = came.get(posKey(current))!;
    path.push(current);
  }
  return path.reverse();
}

function carveRoadPath(
  tiles: WorldTileId[][],
  biomes: WorldBiome[][],
  path: WorldVec[],
  main: boolean,
  roads: WorldVec[],
  bridges: WorldBridge[]
) {
  for (let i = 0; i < path.length; i += 1) {
    const pos = path[i];
    const original = tiles[pos.y][pos.x];
    if (original === "river_water") {
      const prev = path[Math.max(0, i - 1)];
      const next = path[Math.min(path.length - 1, i + 1)];
      const orientation = Math.abs(next.x - prev.x) >= Math.abs(next.y - prev.y) ? "horizontal" : "vertical";
      const material = main ? "stone" : "wood";
      tiles[pos.y][pos.x] =
        material === "stone"
          ? orientation === "horizontal"
            ? "stone_bridge_horizontal"
            : "stone_bridge_vertical"
          : orientation === "horizontal"
            ? "wooden_bridge_horizontal"
            : "wooden_bridge_vertical";
      bridges.push({ ...pos, orientation, material });
    } else if (!worldTileHasTag(original, "bridge")) {
      tiles[pos.y][pos.x] = roadTileForBiome(biomes[pos.y][pos.x], main);
    }
    roads.push({ ...pos });
  }
}

function ensureAtLeastOneRoadBridge(
  tiles: WorldTileId[][],
  pois: WorldPoi[],
  start: WorldVec,
  roads: WorldVec[],
  rivers: WorldVec[][],
  bridges: WorldBridge[]
) {
  if (bridges.length > 0) return;
  const protectedTiles = new Set<string>([posKey(start)]);
  for (const poi of pois) {
    for (const tile of poiFootprintTiles(poi)) protectedTiles.add(posKey(tile));
  }
  const height = tiles.length;
  const width = tiles[0].length;
  for (const road of roads) {
    if (protectedTiles.has(posKey(road))) continue;
    if (road.x < 3 || road.y < 3 || road.x > width - 4 || road.y > height - 4) continue;
    const left = { x: road.x - 1, y: road.y };
    const right = { x: road.x + 1, y: road.y };
    const up = { x: road.x, y: road.y - 1 };
    const down = { x: road.x, y: road.y + 1 };
    if (![left, right, up, down].every((pos) => inBounds(width, height, pos.x, pos.y))) continue;
    if (!isWorldTileWalkable(tiles[left.y][left.x]) || !isWorldTileWalkable(tiles[right.y][right.x])) continue;
    if (protectedTiles.has(posKey(up)) || protectedTiles.has(posKey(down))) continue;
    if (worldTileHasTag(tiles[up.y][up.x], "bridge") || worldTileHasTag(tiles[down.y][down.x], "bridge")) continue;
    if (worldTileHasTag(tiles[up.y][up.x], "water") || worldTileHasTag(tiles[down.y][down.x], "water")) continue;
    tiles[road.y][road.x] = "stone_bridge_horizontal";
    tiles[up.y][up.x] = "river_water";
    tiles[down.y][down.x] = "river_water";
    bridges.push({ ...road, orientation: "horizontal", material: "stone" });
    rivers.push([up, road, down]);
    return;
  }
}

function roadTileForBiome(biome: WorldBiome, main: boolean): WorldTileId {
  if (main) return "cobblestone_road";
  if (biome === "forest") return "forest_path";
  if (biome === "desert") return "desert_scrub_path";
  if (biome === "snow") return "snowy_path";
  return "worn_path";
}

function poiHasWalkableApproach(world: GeneratedWorld, poi: WorldPoi): boolean {
  return poiFootprintTiles(poi).some((tile) => isWorldPositionWalkable(world, tile.x, tile.y));
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

function poiFootprintTiles(poi: WorldPoi): WorldVec[] {
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

function distanceToTag(tiles: WorldTileId[][], x: number, y: number, tag: string, maxDistance: number): number {
  for (let distance = 0; distance <= maxDistance; distance += 1) {
    for (let yy = y - distance; yy <= y + distance; yy += 1) {
      for (let xx = x - distance; xx <= x + distance; xx += 1) {
        if (!tiles[yy]?.[xx]) continue;
        if (manhattan({ x, y }, { x: xx, y: yy }) <= distance && worldTileHasTag(tiles[yy][xx], tag)) return distance;
      }
    }
  }
  return maxDistance + 1;
}

function distanceToBiome(tiles: WorldTileId[][], x: number, y: number, biome: WorldBiome, maxDistance: number): number {
  for (let distance = 0; distance <= maxDistance; distance += 1) {
    for (let yy = y - distance; yy <= y + distance; yy += 1) {
      for (let xx = x - distance; xx <= x + distance; xx += 1) {
        if (!tiles[yy]?.[xx]) continue;
        if (manhattan({ x, y }, { x: xx, y: yy }) <= distance && WORLD_TILES[tiles[yy][xx]].biome === biome) return distance;
      }
    }
  }
  return maxDistance + 1;
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
    { x: x - 1, y: y + 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y - 1 }
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

function radialInfluence(x: number, y: number, cx: number, cy: number, radius: number): number {
  return clamp(1 - Math.hypot(x - cx, y - cy) / radius, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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
