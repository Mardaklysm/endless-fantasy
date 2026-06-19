import atlasV3ManifestJson from "../assets/world/atlasV3.manifest.json" with { type: "json" };

export type WorldBiome = "grassland" | "forest" | "desert" | "snow" | "darkland" | "water" | "mountain" | "lava";
export type WorldEncounterFamily = "plains" | "forest" | "sand" | "hills" | "water" | "final";
export type WorldTileId = string;

export interface WorldSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  brightSand: "bright_sand",
  duneSand: "dune_sand",
  rockySand: "rocky_sand",
  crackedDryEarth: "cracked_dry_earth",
  reddishDesertSoil: "reddish_desert_soil",
  cactusSand: "cactus_sand",
  desertScrub: "desert_scrub",
  cleanSnow: "clean_snow",
  packedSnow: "packed_snow",
  icySnow: "icy_snow",
  snowRocks: "snow_rocks",
  frozenLakeIce: "frozen_lake_ice",
  crackedIce: "cracked_ice",
  deadCrackedEarth: "dead_cracked_earth",
  ashBlackGround: "ash_black_ground",
  cursedPurpleGround: "cursed_purple_ground",
  deepWater: "deep_water",
  rockyMountainGround: "rocky_mountain_ground",
  gravelStoneGround: "gravel_stone_ground",
  volcanoMound: "volcano_mound",
  lavaCrackedGround: "lava_cracked_ground"
} as const satisfies Record<string, WorldTileId>;

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

export function worldTileEncounterFamily(tileId?: WorldTileId): WorldEncounterFamily | undefined {
  return worldTileById(tileId)?.encounterFamily;
}

export function worldTileIdsMatching(predicate: (tile: WorldTileDefinition) => boolean): WorldTileId[] {
  return WORLD_TILE_DEFINITIONS.filter(predicate).map((tile) => tile.id);
}

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}
