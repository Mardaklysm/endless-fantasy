import atlasV3ManifestJson from "../assets/world/atlasV3.manifest.json" with { type: "json" };

export type WorldBiome = "grassland" | "forest" | "desert" | "snow" | "darkland" | "water" | "mountain" | "lava";
export type WorldEncounterFamily = "plains" | "forest" | "sand" | "hills" | "water" | "final";
export type WorldBlendGroup = "grass" | "desert" | "snow" | "ice" | "dark" | "water" | "rock" | "lava";
export type WorldTileId = string;

export interface WorldSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ATLAS_V3_SOURCE_INSET = 3;

interface AtlasV3BaseCell {
  row: number;
  col: number;
  empty: boolean;
  source: WorldSourceRect;
  emptyRatio: number;
  notes?: string;
}

interface AtlasV3TileCell extends AtlasV3BaseCell {
  empty: false;
  id: WorldTileId;
  biome: WorldBiome;
  category: string;
  blendGroup: WorldBlendGroup;
  encounterFamily: WorldEncounterFamily;
  walkable: boolean;
  movementCost: number;
  tags: string[];
}

interface AtlasV3EmptyCell extends AtlasV3BaseCell {
  empty: true;
}

type AtlasV3Cell = AtlasV3TileCell | AtlasV3EmptyCell;

interface AtlasV3Manifest {
  schemaVersion: number;
  id: "atlas_v3";
  sourceImage: string;
  runtimeImage: string;
  columns: 8;
  rows: 8;
  tileWidth: number;
  tileHeight: number;
  image: {
    width: number;
    height: number;
    runtimeFormat: string;
    sourceFormat: string;
  };
  emptyDetection: {
    nearBlackLuminance: number;
    nearBlackMaxChannel: number;
    emptyPixelRatio: number;
  };
  cells: AtlasV3Cell[];
  tiles: Record<string, AtlasV3TileCell>;
}

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
  sourceRect: WorldSourceRect;
  emptyRatio: number;
  notes?: string;
}

export const ATLAS_V3_MANIFEST = atlasV3ManifestJson as AtlasV3Manifest;

export const WORLD_ATLAS = {
  id: ATLAS_V3_MANIFEST.id,
  textureKey: "atlas_v3",
  image: ATLAS_V3_MANIFEST.runtimeImage,
  manifest: "src/assets/world/atlasV3.manifest.json",
  sourceImage: ATLAS_V3_MANIFEST.sourceImage,
  sourceInset: ATLAS_V3_SOURCE_INSET,
  columns: ATLAS_V3_MANIFEST.columns,
  rows: ATLAS_V3_MANIFEST.rows,
  tileWidth: ATLAS_V3_MANIFEST.tileWidth,
  tileHeight: ATLAS_V3_MANIFEST.tileHeight,
  sheetWidth: ATLAS_V3_MANIFEST.image.width,
  sheetHeight: ATLAS_V3_MANIFEST.image.height,
  emptyCellsActive: false,
  oldGeneratedAtlasActive: false,
  usingOld10x10Atlas: false,
  usingClassicSpecialTileset: false
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

export const ATLAS_V3_CELLS = ATLAS_V3_MANIFEST.cells as readonly AtlasV3Cell[];
export const ATLAS_V3_EMPTY_CELLS = ATLAS_V3_CELLS.filter((cell): cell is AtlasV3EmptyCell => cell.empty);
export const ATLAS_V3_NON_EMPTY_CELLS = ATLAS_V3_CELLS.filter((cell): cell is AtlasV3TileCell => !cell.empty);
export const ATLAS_V3_EMPTY_CELL_KEYS = new Set(ATLAS_V3_EMPTY_CELLS.map((cell) => cellKey(cell.row, cell.col)));

export const WORLD_TILE_DEFINITIONS = ATLAS_V3_NON_EMPTY_CELLS.map(
  (cell): WorldTileDefinition => ({
    id: cell.id,
    row: cell.row,
    col: cell.col,
    biome: cell.biome,
    category: cell.category,
    blendGroup: worldTileBlendGroup(cell.id),
    encounterFamily: cell.encounterFamily,
    walkable: cell.walkable,
    movementCost: cell.movementCost,
    tags: cell.tags,
    sourceRect: {
      x: cell.source.x,
      y: cell.source.y,
      width: cell.source.width,
      height: cell.source.height
    },
    emptyRatio: cell.emptyRatio,
    notes: cell.notes
  })
) as readonly WorldTileDefinition[];

export const WORLD_TILES = Object.fromEntries(WORLD_TILE_DEFINITIONS.map((tile) => [tile.id, tile])) as Record<WorldTileId, WorldTileDefinition>;
export const WORLD_TILE_ID_SET = new Set(Object.keys(WORLD_TILES));

export function isAtlasV3TileId(tileId?: string): tileId is WorldTileId {
  return !!tileId && WORLD_TILE_ID_SET.has(tileId);
}

export function isAtlasV3EmptyCell(row: number, col: number): boolean {
  return ATLAS_V3_EMPTY_CELL_KEYS.has(cellKey(row, col));
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

export function atlasV3SourceRectWithInset(sourceRect: WorldSourceRect, inset = ATLAS_V3_SOURCE_INSET): WorldSourceRect {
  if (!Number.isInteger(inset) || inset < 0) {
    throw new Error(`atlas_v3 source inset must be a non-negative integer; got ${inset}.`);
  }
  if (inset * 2 >= sourceRect.width || inset * 2 >= sourceRect.height) {
    throw new Error(`atlas_v3 source inset ${inset} is too large for source rect ${sourceRect.width}x${sourceRect.height}.`);
  }
  return {
    x: sourceRect.x + inset,
    y: sourceRect.y + inset,
    width: sourceRect.width - inset * 2,
    height: sourceRect.height - inset * 2
  };
}

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}
