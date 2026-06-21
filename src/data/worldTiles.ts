export type WorldBiome = "grassland" | "forest" | "desert" | "snow" | "darkland" | "water" | "mountain" | "lava";
export type WorldEncounterFamily = "plains" | "forest" | "sand" | "hills" | "water" | "final";
export type WorldBlendGroup = "grass" | "desert" | "snow" | "ice" | "dark" | "water" | "rock" | "lava";
export type WorldTileId = string;

export interface WorldTileDefinition {
  id: WorldTileId;
  row: number;
  col: number;
  biome: WorldBiome;
  category: string;
  blendGroup: WorldBlendGroup;
  encounterFamily: WorldEncounterFamily;
  walkable: boolean;
  movementCost: number;
  tags: readonly string[];
  notes?: string;
}

export const WORLD_TILE_RUNTIME_SOURCE = {
  id: "semantic_current_world_materials",
  manifest: "src/assets/world/current/world_asset_manifest.json",
  deprecatedAtlasActive: false
} as const;

export const WORLD_TILE_IDS = {
  brightGrass: "bright_grass",
  mediumGrass: "medium_grass",
  darkGrass: "dark_grass",
  flowerMeadowGrass: "flower_meadow_grass",
  lushCloverGrass: "lush_clover_grass",
  weedsGrass: "weeds_grass",
  trampledGrass: "trampled_grass",
  grassStones: "grass_stones",
  beachSand: "beach_sand",
  wetBeachSand: "wet_beach_sand",
  grassSandCoast: "grass_sand_coast",
  sandWaterEdge: "sand_water_edge",
  sandWaterCorner: "sand_water_corner",
  shallowWater: "shallow_water",
  foamyShallowWater: "foamy_shallow_water",
  coveCoast: "cove_coast",
  brightSand: "bright_sand",
  duneSand: "dune_sand",
  rockySand: "rocky_sand",
  crackedDryEarth: "cracked_dry_earth",
  reddishDesertSoil: "reddish_desert_soil",
  cactusSand: "cactus_sand",
  desertScrub: "desert_scrub",
  desertRoadCrossroads: "desert_road_crossroads",
  cleanSnow: "clean_snow",
  packedSnow: "packed_snow",
  icySnow: "icy_snow",
  snowRocks: "snow_rocks",
  frozenLakeIce: "frozen_lake_ice",
  crackedIce: "cracked_ice",
  snowyForest: "snowy_forest",
  snowMountain: "snow_mountain",
  lightForest: "light_forest",
  denseForest: "dense_forest",
  jungle: "jungle",
  deadCrackedEarth: "dead_cracked_earth",
  ashBlackGround: "ash_black_ground",
  cursedPurpleGround: "cursed_purple_ground",
  deadForest: "dead_forest",
  ashForest: "ash_forest",
  deepWater: "deep_water",
  roadHorizontal: "road_horizontal",
  roadVertical: "road_vertical",
  roadCornerSw: "road_corner_sw",
  roadTSouth: "road_t_s",
  roadCrossroads: "road_crossroads",
  roadDeadEndEast: "road_dead_end_e",
  softGrassTrail: "soft_grass_trail",
  rockyMountainGround: "rocky_mountain_ground",
  gravelStoneGround: "gravel_stone_ground",
  rockyHills: "rocky_hills",
  snowyMountainGround: "snowy_mountain_ground",
  volcanoMound: "volcano_mound",
  roadCornerSe: "road_corner_se",
  roadCornerNe: "road_corner_ne",
  roadCornerNw: "road_corner_nw",
  lavaCrackedGround: "lava_cracked_ground",
  cooledLavaRock: "cooled_lava_rock",
  volcanicAshGround: "volcanic_ash_ground",
  lavaRockTransition: "lava_rock_transition",
  roadTEast: "road_t_e",
  roadTNorth: "road_t_n",
  roadTWest: "road_t_w",
  roadDeadEndWest: "road_dead_end_w"
} as const satisfies Record<string, WorldTileId>;

export const WORLD_TILE_BLEND_GROUPS = {
  [WORLD_TILE_IDS.brightGrass]: "grass",
  [WORLD_TILE_IDS.mediumGrass]: "grass",
  [WORLD_TILE_IDS.darkGrass]: "grass",
  [WORLD_TILE_IDS.flowerMeadowGrass]: "grass",
  [WORLD_TILE_IDS.lushCloverGrass]: "grass",
  [WORLD_TILE_IDS.weedsGrass]: "grass",
  [WORLD_TILE_IDS.trampledGrass]: "grass",
  [WORLD_TILE_IDS.grassStones]: "grass",
  [WORLD_TILE_IDS.beachSand]: "desert",
  [WORLD_TILE_IDS.wetBeachSand]: "desert",
  [WORLD_TILE_IDS.grassSandCoast]: "desert",
  [WORLD_TILE_IDS.sandWaterEdge]: "desert",
  [WORLD_TILE_IDS.sandWaterCorner]: "desert",
  [WORLD_TILE_IDS.shallowWater]: "water",
  [WORLD_TILE_IDS.foamyShallowWater]: "water",
  [WORLD_TILE_IDS.coveCoast]: "desert",
  [WORLD_TILE_IDS.brightSand]: "desert",
  [WORLD_TILE_IDS.duneSand]: "desert",
  [WORLD_TILE_IDS.rockySand]: "desert",
  [WORLD_TILE_IDS.crackedDryEarth]: "desert",
  [WORLD_TILE_IDS.reddishDesertSoil]: "desert",
  [WORLD_TILE_IDS.cactusSand]: "desert",
  [WORLD_TILE_IDS.desertScrub]: "desert",
  [WORLD_TILE_IDS.desertRoadCrossroads]: "desert",
  [WORLD_TILE_IDS.cleanSnow]: "snow",
  [WORLD_TILE_IDS.packedSnow]: "snow",
  [WORLD_TILE_IDS.icySnow]: "snow",
  [WORLD_TILE_IDS.snowRocks]: "snow",
  [WORLD_TILE_IDS.frozenLakeIce]: "ice",
  [WORLD_TILE_IDS.crackedIce]: "ice",
  [WORLD_TILE_IDS.snowyForest]: "snow",
  [WORLD_TILE_IDS.snowMountain]: "rock",
  [WORLD_TILE_IDS.lightForest]: "grass",
  [WORLD_TILE_IDS.denseForest]: "grass",
  [WORLD_TILE_IDS.jungle]: "grass",
  [WORLD_TILE_IDS.deadCrackedEarth]: "dark",
  [WORLD_TILE_IDS.ashBlackGround]: "dark",
  [WORLD_TILE_IDS.cursedPurpleGround]: "dark",
  [WORLD_TILE_IDS.deadForest]: "dark",
  [WORLD_TILE_IDS.ashForest]: "dark",
  [WORLD_TILE_IDS.deepWater]: "water",
  [WORLD_TILE_IDS.roadHorizontal]: "grass",
  [WORLD_TILE_IDS.roadVertical]: "grass",
  [WORLD_TILE_IDS.roadCornerSw]: "grass",
  [WORLD_TILE_IDS.roadTSouth]: "grass",
  [WORLD_TILE_IDS.roadCrossroads]: "grass",
  [WORLD_TILE_IDS.roadDeadEndEast]: "grass",
  [WORLD_TILE_IDS.softGrassTrail]: "grass",
  [WORLD_TILE_IDS.rockyMountainGround]: "rock",
  [WORLD_TILE_IDS.gravelStoneGround]: "rock",
  [WORLD_TILE_IDS.rockyHills]: "rock",
  [WORLD_TILE_IDS.snowyMountainGround]: "rock",
  [WORLD_TILE_IDS.volcanoMound]: "lava",
  [WORLD_TILE_IDS.roadCornerSe]: "grass",
  [WORLD_TILE_IDS.roadCornerNe]: "grass",
  [WORLD_TILE_IDS.roadCornerNw]: "grass",
  [WORLD_TILE_IDS.lavaCrackedGround]: "lava",
  [WORLD_TILE_IDS.cooledLavaRock]: "lava",
  [WORLD_TILE_IDS.volcanicAshGround]: "dark",
  [WORLD_TILE_IDS.lavaRockTransition]: "lava",
  [WORLD_TILE_IDS.roadTEast]: "grass",
  [WORLD_TILE_IDS.roadTNorth]: "grass",
  [WORLD_TILE_IDS.roadTWest]: "grass",
  [WORLD_TILE_IDS.roadDeadEndWest]: "grass"
} as const satisfies Record<string, WorldBlendGroup>;

const FOREST_TILES = new Set<WorldTileId>([
  WORLD_TILE_IDS.lightForest,
  WORLD_TILE_IDS.denseForest,
  WORLD_TILE_IDS.jungle,
  WORLD_TILE_IDS.snowyForest,
  WORLD_TILE_IDS.deadForest,
  WORLD_TILE_IDS.ashForest
]);

const WATER_TILES = new Set<WorldTileId>([
  WORLD_TILE_IDS.deepWater,
  WORLD_TILE_IDS.shallowWater,
  WORLD_TILE_IDS.foamyShallowWater
]);

const MOUNTAIN_TILES = new Set<WorldTileId>([
  WORLD_TILE_IDS.snowMountain,
  WORLD_TILE_IDS.rockyMountainGround,
  WORLD_TILE_IDS.gravelStoneGround,
  WORLD_TILE_IDS.rockyHills,
  WORLD_TILE_IDS.snowyMountainGround
]);

const BLOCKED_TILES = new Set<WorldTileId>([
  ...WATER_TILES,
  WORLD_TILE_IDS.snowMountain,
  WORLD_TILE_IDS.rockyMountainGround,
  WORLD_TILE_IDS.gravelStoneGround,
  WORLD_TILE_IDS.volcanoMound,
  WORLD_TILE_IDS.lavaCrackedGround,
  WORLD_TILE_IDS.cooledLavaRock,
  WORLD_TILE_IDS.lavaRockTransition,
  WORLD_TILE_IDS.frozenLakeIce,
  WORLD_TILE_IDS.crackedIce
]);

const ROAD_TILES = new Set<WorldTileId>([
  WORLD_TILE_IDS.desertRoadCrossroads,
  WORLD_TILE_IDS.roadHorizontal,
  WORLD_TILE_IDS.roadVertical,
  WORLD_TILE_IDS.roadCornerSw,
  WORLD_TILE_IDS.roadTSouth,
  WORLD_TILE_IDS.roadCrossroads,
  WORLD_TILE_IDS.roadDeadEndEast,
  WORLD_TILE_IDS.softGrassTrail,
  WORLD_TILE_IDS.roadCornerSe,
  WORLD_TILE_IDS.roadCornerNe,
  WORLD_TILE_IDS.roadCornerNw,
  WORLD_TILE_IDS.roadTEast,
  WORLD_TILE_IDS.roadTNorth,
  WORLD_TILE_IDS.roadTWest,
  WORLD_TILE_IDS.roadDeadEndWest
]);

const DARK_TILES = new Set<WorldTileId>([
  WORLD_TILE_IDS.deadCrackedEarth,
  WORLD_TILE_IDS.ashBlackGround,
  WORLD_TILE_IDS.cursedPurpleGround,
  WORLD_TILE_IDS.deadForest,
  WORLD_TILE_IDS.ashForest,
  WORLD_TILE_IDS.volcanicAshGround
]);

export const WORLD_TILE_DEFINITIONS = Object.values(WORLD_TILE_IDS).map(makeWorldTileDefinition) as readonly WorldTileDefinition[];
export const WORLD_TILES = Object.fromEntries(WORLD_TILE_DEFINITIONS.map((tile) => [tile.id, tile])) as Record<WorldTileId, WorldTileDefinition>;
export const WORLD_TILE_ID_SET = new Set(Object.keys(WORLD_TILES));

export function isCurrentWorldTileId(tileId?: string): tileId is WorldTileId {
  return !!tileId && WORLD_TILE_ID_SET.has(tileId);
}

export function worldTileById(tileId?: WorldTileId): WorldTileDefinition | undefined {
  if (!tileId) return undefined;
  return WORLD_TILES[tileId];
}

export function isWorldTileWalkable(tileId?: WorldTileId): boolean {
  return worldTileById(tileId)?.walkable ?? false;
}

export function worldTileMovementCost(tileId?: WorldTileId): number {
  return worldTileById(tileId)?.movementCost ?? 99;
}

export function worldTileHasTag(tileId: WorldTileId | undefined, tag: string): boolean {
  return worldTileById(tileId)?.tags.includes(tag) ?? false;
}

export function worldTileBlendGroup(tileId?: WorldTileId): WorldBlendGroup | undefined {
  if (!tileId) return undefined;
  return WORLD_TILE_BLEND_GROUPS[tileId];
}

export function worldTileEncounterFamily(tileId?: WorldTileId): WorldEncounterFamily | undefined {
  return worldTileById(tileId)?.encounterFamily;
}

export function worldTileIdsMatching(predicate: (tile: WorldTileDefinition) => boolean): WorldTileId[] {
  return WORLD_TILE_DEFINITIONS.filter(predicate).map((tile) => tile.id);
}

function makeWorldTileDefinition(tileId: WorldTileId, index: number): WorldTileDefinition {
  const blendGroup = WORLD_TILE_BLEND_GROUPS[tileId];
  const biome = biomeForTile(tileId, blendGroup);
  const tags = tagsForTile(tileId, biome, blendGroup);
  const walkable = !BLOCKED_TILES.has(tileId);
  return {
    id: tileId,
    row: Math.floor(index / 8),
    col: index % 8,
    biome,
    category: categoryForTile(tileId, biome),
    blendGroup,
    encounterFamily: encounterFamilyForTile(tileId, biome),
    walkable,
    movementCost: movementCostForTile(tileId, biome, walkable),
    tags,
    notes: "Semantic compatibility tile ID. Runtime pixels come from src/assets/world/current/world_asset_manifest.json, not an atlas cell."
  };
}

function biomeForTile(tileId: WorldTileId, blendGroup: WorldBlendGroup): WorldBiome {
  if (WATER_TILES.has(tileId)) return "water";
  if (MOUNTAIN_TILES.has(tileId)) return "mountain";
  if (tileId === WORLD_TILE_IDS.volcanoMound || blendGroup === "lava") return "lava";
  if (FOREST_TILES.has(tileId)) return "forest";
  if (DARK_TILES.has(tileId)) return "darkland";
  if (blendGroup === "snow" || blendGroup === "ice") return "snow";
  if (blendGroup === "desert") return "desert";
  return "grassland";
}

function categoryForTile(tileId: WorldTileId, biome: WorldBiome): string {
  if (ROAD_TILES.has(tileId)) return "route";
  if (tileId.includes("coast") || tileId.includes("edge") || tileId.includes("corner")) return "legacy_transition_id";
  return biome;
}

function encounterFamilyForTile(tileId: WorldTileId, biome: WorldBiome): WorldEncounterFamily {
  if (ROAD_TILES.has(tileId)) return "plains";
  if (biome === "water") return "water";
  if (biome === "forest") return "forest";
  if (biome === "desert") return "sand";
  if (biome === "darkland" || biome === "lava") return "final";
  if (biome === "mountain" || biome === "snow") return "hills";
  return "plains";
}

function movementCostForTile(tileId: WorldTileId, biome: WorldBiome, walkable: boolean): number {
  if (!walkable) return 99;
  if (ROAD_TILES.has(tileId)) return 1;
  if (biome === "forest" || biome === "desert" || biome === "snow" || biome === "mountain") return 2;
  return 1;
}

function tagsForTile(tileId: WorldTileId, biome: WorldBiome, blendGroup: WorldBlendGroup): string[] {
  const tags: string[] = [biome, blendGroup];
  if (WATER_TILES.has(tileId)) tags.push("water");
  if (tileId === WORLD_TILE_IDS.deepWater) tags.push("deep");
  if (tileId === WORLD_TILE_IDS.shallowWater || tileId === WORLD_TILE_IDS.foamyShallowWater) tags.push("shallow");
  if (BLOCKED_TILES.has(tileId)) tags.push("blocked");
  if (MOUNTAIN_TILES.has(tileId)) tags.push("mountain", "cliff");
  if (FOREST_TILES.has(tileId)) tags.push("forest");
  if (ROAD_TILES.has(tileId)) tags.push("road");
  if (tileId.includes("snow") || blendGroup === "snow" || blendGroup === "ice") tags.push("snow");
  if (blendGroup === "lava") tags.push("lava");
  if (tileId.includes("coast") || tileId.includes("edge") || tileId.includes("corner")) tags.push("legacy_transition_id");
  return [...new Set(tags)];
}
