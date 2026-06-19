import {
  WORLD_TILE_IDS,
  WORLD_TILES,
  isAtlasV3TileId,
  isWorldTileWalkable,
  worldTileById,
  worldTileEncounterFamily,
  worldTileHasTag,
  worldTileIdsMatching,
  type WorldBiome,
  type WorldEncounterFamily,
  type WorldTileId
} from "../data/worldTiles.ts";

export const DEFAULT_WORLD_WIDTH = 96;
export const DEFAULT_WORLD_HEIGHT = 64;
export const ACTIVE_WORLDGEN_MODE = "atlas_v3_tile_world" as const;

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
  mode: typeof ACTIVE_WORLDGEN_MODE;
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

interface PoiBlueprint {
  id: string;
  name: string;
  kind: WorldPoiKind;
  target: WorldVec;
  footprint: number;
  preferredBiomes: WorldBiome[];
}

interface Patch {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  biome: WorldBiome;
  tiles: readonly WorldTileId[];
  falloff?: number;
}

const POI_BLUEPRINTS: PoiBlueprint[] = [
  { id: "dawnford", name: "Dawnford", kind: "town", target: { x: 0.18, y: 0.52 }, footprint: 3, preferredBiomes: ["grassland"] },
  { id: "brinewick", name: "Brinewick", kind: "town", target: { x: 0.28, y: 0.7 }, footprint: 3, preferredBiomes: ["grassland"] },
  { id: "elderleaf", name: "Elderleaf", kind: "town", target: { x: 0.24, y: 0.25 }, footprint: 3, preferredBiomes: ["grassland"] },
  { id: "sunbarrow", name: "Sunbarrow", kind: "town", target: { x: 0.66, y: 0.48 }, footprint: 3, preferredBiomes: ["desert"] },
  { id: "starfallGate", name: "Starfall Gate", kind: "gate", target: { x: 0.82, y: 0.64 }, footprint: 3, preferredBiomes: ["darkland", "grassland"] },
  { id: "mossCave", name: "Moss Cave", kind: "dungeon", target: { x: 0.34, y: 0.42 }, footprint: 3, preferredBiomes: ["grassland", "mountain"] },
  { id: "ashenKeep", name: "Ashen Keep", kind: "dungeon", target: { x: 0.62, y: 0.34 }, footprint: 3, preferredBiomes: ["mountain", "desert"] },
  { id: "tideShrine", name: "Tide Shrine", kind: "dungeon", target: { x: 0.72, y: 0.75 }, footprint: 3, preferredBiomes: ["grassland"] },
  { id: "skyglassTower", name: "Skyglass Tower", kind: "dungeon", target: { x: 0.74, y: 0.2 }, footprint: 3, preferredBiomes: ["snow", "mountain"] },
  { id: "eclipseSpire", name: "Eclipse Spire", kind: "final", target: { x: 0.9, y: 0.18 }, footprint: 3, preferredBiomes: ["darkland", "mountain"] }
];

const GRASS_TILES = tilePool("grassland", (tile) => tile.biome === "grassland" && tile.walkable);
const DESERT_TILES = tilePool("desert", (tile) => tile.biome === "desert" && tile.walkable);
const SNOW_TILES = tilePool("snow", (tile) => tile.biome === "snow" && tile.walkable);
const DARK_TILES = tilePool("darkland", (tile) => tile.biome === "darkland" && tile.walkable);
const ROCK_WALKABLE_TILES = tilePool("walkable rock", (tile) => tile.id === WORLD_TILE_IDS.gravelStoneGround);
const WATER_TILES = tilePool("blocked water", (tile) => tile.id === WORLD_TILE_IDS.deepWater && !tile.walkable);
const MOUNTAIN_BLOCKERS = tilePool("blocked mountain", (tile) => tile.id === WORLD_TILE_IDS.rockyMountainGround && !tile.walkable);
const VOLCANO_BLOCKERS = tilePool("blocked volcano", (tile) => tile.id === WORLD_TILE_IDS.volcanoMound && !tile.walkable);
const LAVA_BLOCKERS = tilePool("blocked lava", (tile) => tile.id === WORLD_TILE_IDS.lavaCrackedGround && !tile.walkable);

function tilePool(label: string, predicate: Parameters<typeof worldTileIdsMatching>[0]): WorldTileId[] {
  const ids = worldTileIdsMatching(predicate);
  if (!ids.length) throw new Error(`atlas_v3 manifest has no usable ${label} tiles.`);
  return ids;
}

export function createWorldSeed(): string {
  return `asterra-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
}

export function generateWorld(options: { seed?: string; width?: number; height?: number; maxAttempts?: number } = {}): GeneratedWorld {
  const baseSeed = options.seed ?? createWorldSeed();
  const width = options.width ?? DEFAULT_WORLD_WIDTH;
  const height = options.height ?? DEFAULT_WORLD_HEIGHT;
  const maxAttempts = options.maxAttempts ?? 32;
  let lastWorld: GeneratedWorld | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const seed = attempt === 0 ? baseSeed : `${baseSeed}:${attempt}`;
    const world = generateWorldAttempt(seed, width, height);
    world.validation = validateGeneratedWorld(world);
    lastWorld = world;
    if (world.validation.valid) return world;
  }

  const errors = lastWorld?.validation.errors.join("; ") || "unknown validation failure";
  throw new Error(`Unable to generate a valid atlas_v3 world after ${maxAttempts} attempts: ${errors}`);
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

export function worldEncounterFamilyForTile(tileId: WorldTileId): WorldEncounterFamily | undefined {
  return worldTileEncounterFamily(tileId);
}

export function validateGeneratedWorld(world: GeneratedWorld): WorldValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const biomeCounts: Record<string, number> = {};
  let walkableCount = 0;
  let waterCount = 0;

  if (world.mode !== ACTIVE_WORLDGEN_MODE) errors.push(`Unexpected worldgen mode: ${world.mode}.`);

  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = world.tiles[y]?.[x];
      const def = worldTileById(tile);
      if (!tile || !def || !isAtlasV3TileId(tile)) {
        errors.push(`Generated tile ${tile ?? "<missing>"} at ${x},${y} is not a non-empty atlas_v3 tile.`);
        continue;
      }
      biomeCounts[def.biome] = (biomeCounts[def.biome] ?? 0) + 1;
      if (def.walkable) walkableCount += 1;
      if (worldTileHasTag(tile, "water")) waterCount += 1;
    }
  }

  const startTile = getWorldTileAt(world, world.startPosition.x, world.startPosition.y);
  if (!isWorldPositionWalkable(world, world.startPosition.x, world.startPosition.y)) errors.push("Start position is not walkable.");
  if (worldTileById(startTile)?.biome !== "grassland") errors.push("Start position is not on grassland.");
  if (walkableCount < world.width * world.height * 0.68) errors.push("Generated world does not have enough walkable land.");
  if (waterCount < 8) warnings.push("Generated world has very little water.");

  for (const requiredBiome of ["grassland", "desert", "snow", "darkland", "water", "mountain", "lava"]) {
    if (!biomeCounts[requiredBiome]) warnings.push(`Generated world has no ${requiredBiome} tiles.`);
  }

  for (const poi of world.pois) {
    const tile = getWorldTileAt(world, poi.x, poi.y);
    if (!tile) errors.push(`${poi.name} is outside the map.`);
    else {
      if (worldTileHasTag(tile, "water")) errors.push(`${poi.name} is on water.`);
      if (!isWorldTileWalkable(tile)) errors.push(`${poi.name} is not on a walkable tile.`);
    }
    if (!poiHasWalkableApproach(world, poi)) errors.push(`${poi.name} has no walkable footprint tile.`);
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
Road tiles carved: ${world.roads.length}
River count: ${world.rivers.length}
Bridge count: ${world.bridges.length}

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
  const rng = makeRng(seed);
  const tiles = makeGrassBase(seed, width, height);
  const biomes = tiles.map((row) => row.map((tile) => WORLD_TILES[tile].biome));

  applyPatch(seed, tiles, biomes, {
    cx: Math.round(width * 0.66 + (rng() - 0.5) * 5),
    cy: Math.round(height * 0.5 + (rng() - 0.5) * 4),
    rx: 9 + Math.floor(rng() * 3),
    ry: 6 + Math.floor(rng() * 2),
    biome: "desert",
    tiles: DESERT_TILES
  });
  applyPatch(seed, tiles, biomes, {
    cx: Math.round(width * 0.74 + (rng() - 0.5) * 5),
    cy: Math.round(height * 0.2 + (rng() - 0.5) * 3),
    rx: 8 + Math.floor(rng() * 3),
    ry: 5 + Math.floor(rng() * 2),
    biome: "snow",
    tiles: SNOW_TILES
  });
  applyPatch(seed, tiles, biomes, {
    cx: Math.round(width * 0.84 + (rng() - 0.5) * 4),
    cy: Math.round(height * 0.3 + (rng() - 0.5) * 4),
    rx: 7 + Math.floor(rng() * 3),
    ry: 6 + Math.floor(rng() * 3),
    biome: "darkland",
    tiles: DARK_TILES
  });

  addLake(seed, tiles, biomes, Math.round(width * 0.22 + (rng() - 0.5) * 7), Math.round(height * 0.72 + (rng() - 0.5) * 4), 4 + Math.floor(rng() * 3), 3 + Math.floor(rng() * 2));
  addLake(seed, tiles, biomes, Math.round(width * 0.76 + (rng() - 0.5) * 5), Math.round(height * 0.76 + (rng() - 0.5) * 3), 5 + Math.floor(rng() * 3), 3 + Math.floor(rng() * 2));

  addMountainCluster(seed, tiles, biomes, Math.round(width * 0.34), Math.round(height * 0.4), 5, 3, false);
  addMountainCluster(seed, tiles, biomes, Math.round(width * 0.62), Math.round(height * 0.34), 6, 4, true);
  addMountainCluster(seed, tiles, biomes, Math.round(width * 0.78), Math.round(height * 0.19), 5, 3, false);
  addMountainBorder(tiles, biomes);

  const pois = placePois(seed, tiles, biomes);
  carvePoiFootprints(tiles, biomes, pois);
  const dawnford = pois.find((poi) => poi.id === "dawnford") ?? pois[0];
  const startPosition = findStartPosition(tiles, biomes, dawnford);
  const entryTriggers = pois.flatMap((poi) => poiFootprintTiles(poi).map((tile) => ({ poiId: poi.id, x: tile.x, y: tile.y })));

  return {
    mode: ACTIVE_WORLDGEN_MODE,
    width,
    height,
    seed,
    tiles,
    biomes,
    pois,
    roads: [],
    rivers: [],
    bridges: [],
    startPosition,
    entryTriggers,
    validation: { valid: false, errors: [], warnings: [], reachablePoiIds: [], biomeCounts: {} }
  };
}

function makeGrassBase(seed: string, width: number, height: number): WorldTileId[][] {
  const tiles: WorldTileId[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: WorldTileId[] = [];
    for (let x = 0; x < width; x += 1) {
      const detail = fbm(`${seed}:grass`, x / 10, y / 10, 3, 2.1);
      if (detail > 0.86) row.push(WORLD_TILE_IDS.flowerMeadowGrass);
      else if (detail > 0.75) row.push(WORLD_TILE_IDS.lushCloverGrass);
      else if (detail > 0.62) row.push(WORLD_TILE_IDS.mediumGrass);
      else if (detail < 0.18) row.push(WORLD_TILE_IDS.weedsGrass);
      else if (detail < 0.29) row.push(WORLD_TILE_IDS.darkGrass);
      else row.push(WORLD_TILE_IDS.brightGrass);
    }
    tiles.push(row);
  }
  return tiles;
}

function applyPatch(seed: string, tiles: WorldTileId[][], biomes: WorldBiome[][], patch: Patch) {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const nx = (x - patch.cx) / patch.rx;
      const ny = (y - patch.cy) / patch.ry;
      const distance = Math.sqrt(nx * nx + ny * ny);
      const wobble = (hashNoise(`${seed}:${patch.biome}`, x, y) - 0.5) * 0.32;
      if (distance + wobble > (patch.falloff ?? 1)) continue;
      tiles[y][x] = pickPatchTile(patch.tiles, seed, x, y);
      biomes[y][x] = patch.biome;
    }
  }
}

function addLake(seed: string, tiles: WorldTileId[][], biomes: WorldBiome[][], cx: number, cy: number, rx: number, ry: number) {
  applyPatch(seed, tiles, biomes, { cx, cy, rx, ry, biome: "water", tiles: WATER_TILES, falloff: 0.85 });
}

function addMountainCluster(seed: string, tiles: WorldTileId[][], biomes: WorldBiome[][], cx: number, cy: number, rx: number, ry: number, volcanic: boolean) {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const distance = Math.hypot((x - cx) / rx, (y - cy) / ry);
      const noise = hashNoise(`${seed}:mountains`, x, y);
      if (distance > 1 + (noise - 0.5) * 0.28) continue;
      if (volcanic && distance < 0.34 && noise > 0.35) {
        tiles[y][x] = noise > 0.75 ? LAVA_BLOCKERS[0] : VOLCANO_BLOCKERS[0];
        biomes[y][x] = tiles[y][x] === LAVA_BLOCKERS[0] ? "lava" : "mountain";
      } else if (distance < 0.65 || noise > 0.62) {
        tiles[y][x] = MOUNTAIN_BLOCKERS[0];
        biomes[y][x] = "mountain";
      } else {
        tiles[y][x] = ROCK_WALKABLE_TILES[0];
        biomes[y][x] = "mountain";
      }
    }
  }
}

function addMountainBorder(tiles: WorldTileId[][], biomes: WorldBiome[][]) {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
      tiles[y][x] = MOUNTAIN_BLOCKERS[0];
      biomes[y][x] = "mountain";
    }
  }
}

function pickPatchTile(pool: readonly WorldTileId[], seed: string, x: number, y: number): WorldTileId {
  return pool[Math.floor(hashNoise(`${seed}:pick`, x, y) * pool.length) % pool.length];
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
  const radius = Math.floor(blueprint.footprint / 2);
  let best: { pos: WorldVec; score: number } | undefined;

  for (let y = radius + 2; y < height - radius - 2; y += 1) {
    for (let x = radius + 2; x < width - radius - 2; x += 1) {
      if (!canPlacePoiAt(tiles, x, y, radius)) continue;
      let score = Math.hypot(x - target.x, y - target.y);
      if (!blueprint.preferredBiomes.includes(biomes[y][x])) score += 10;
      for (const other of placed) {
        const distance = Math.hypot(x - other.x, y - other.y);
        if (distance < 7) score += (7 - distance) * 10;
      }
      score += rng() * 1.8;
      if (!best || score < best.score) best = { pos: { x, y }, score };
    }
  }

  return best?.pos ?? nearestWalkable(tiles, target, radius);
}

function canPlacePoiAt(tiles: WorldTileId[][], x: number, y: number, radius: number): boolean {
  const height = tiles.length;
  const width = tiles[0].length;
  if (!inBounds(width, height, x, y)) return false;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(width, height, xx, yy)) return false;
      if (!isWorldTileWalkable(tiles[yy][xx]) || worldTileHasTag(tiles[yy][xx], "water")) return false;
    }
  }
  return true;
}

function nearestWalkable(tiles: WorldTileId[][], target: WorldVec, radius: number): WorldVec {
  const height = tiles.length;
  const width = tiles[0].length;
  for (let distance = 0; distance < Math.max(width, height); distance += 1) {
    for (let y = target.y - distance; y <= target.y + distance; y += 1) {
      for (let x = target.x - distance; x <= target.x + distance; x += 1) {
        if (Math.abs(x - target.x) !== distance && Math.abs(y - target.y) !== distance) continue;
        if (canPlacePoiAt(tiles, x, y, radius)) return { x, y };
      }
    }
  }
  return target;
}

function carvePoiFootprints(tiles: WorldTileId[][], biomes: WorldBiome[][], pois: WorldPoi[]) {
  for (const poi of pois) {
    const tile = poi.kind === "final" ? WORLD_TILE_IDS.cursedPurpleGround : poi.kind === "dungeon" ? WORLD_TILE_IDS.grassStones : WORLD_TILE_IDS.trampledGrass;
    const biome = WORLD_TILES[tile].biome;
    for (const pos of poiFootprintTiles(poi)) {
      if (!tiles[pos.y]?.[pos.x]) continue;
      tiles[pos.y][pos.x] = tile;
      biomes[pos.y][pos.x] = biome;
    }
  }
}

function findStartPosition(tiles: WorldTileId[][], biomes: WorldBiome[][], dawnford: WorldPoi): WorldVec {
  const radius = Math.floor(dawnford.footprint / 2);
  const candidates = [
    { x: dawnford.x, y: dawnford.y + radius + 1 },
    { x: dawnford.x - 1, y: dawnford.y + radius + 1 },
    { x: dawnford.x + 1, y: dawnford.y + radius + 1 },
    { x: dawnford.x, y: dawnford.y }
  ];
  for (const pos of candidates) {
    if (!tiles[pos.y]?.[pos.x]) continue;
    tiles[pos.y][pos.x] = WORLD_TILE_IDS.brightGrass;
    biomes[pos.y][pos.x] = "grassland";
    return pos;
  }
  return { x: dawnford.x, y: dawnford.y };
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

function neighbors4(x: number, y: number): WorldVec[] {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 }
  ];
}

function inBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
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
