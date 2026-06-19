import {
  CLASSIC_WORLD_TILESET_ID,
  CLASSIC_WORLD_TILESET_IMAGE,
  CLASSIC_WORLD_TILESET_MANIFEST,
  CLASSIC_WORLD_TILESET_MANIFEST_PATH,
  CLASSIC_WORLD_TILESET_TEXTURE_KEY,
  CLASSIC_WORLD_TILE_DEFINITIONS,
  CLASSIC_WORLD_TILE_IDS,
  type ClassicSourceRect,
  type ClassicWorldBiome,
  type ClassicWorldEncounterFamily,
  type ClassicWorldTerrainDefinition,
  type ClassicWorldTileId,
} from "../world/classicGrasslandRegionCatalog.ts";
import {
  GENERIC_WORLD_ATLAS,
  GENERIC_WORLD_TILE_DEFINITIONS,
  GENERIC_WORLD_TILE_IDS,
  type GenericSourceRect,
  type GenericWorldBiome,
  type GenericWorldEncounterFamily,
  type GenericWorldTileDefinition,
  type GenericWorldTileId,
} from "../world/genericAtlasWorldCatalog.ts";

export { CLASSIC_WORLD_TILE_IDS, GENERIC_WORLD_TILE_IDS };

export type WorldBiome = ClassicWorldBiome | GenericWorldBiome;
export type WorldEncounterFamily = ClassicWorldEncounterFamily | GenericWorldEncounterFamily;
export type WorldTileId = ClassicWorldTileId | GenericWorldTileId;
export type WorldSourceRect = ClassicSourceRect | GenericSourceRect;

export interface WorldAtlasDefinition {
  id: string;
  textureKey: string;
  image: string;
  manifest?: string;
  sourceCopy?: string;
  sheetWidth: number;
  sheetHeight: number;
  baseTileSize: number;
  sourceColumns: number;
  sourceRows: number;
  backgroundMode?: string;
  transparentColor?: string;
  slicing: "manifestSourceRect" | "generic10x10Grid";
  oldGeneratedAtlasActive: boolean;
}

export interface WorldTileDefinition {
  id: WorldTileId;
  displayName: string;
  biome: WorldBiome;
  encounterFamily: WorldEncounterFamily;
  walkable: boolean;
  movementCost: number;
  tags: readonly string[];
  sourceRect: WorldSourceRect;
  textureKey: string;
  atlasId: string;
  notes?: string;
  row?: number;
  col?: number;
  macroRegion?: number;
  manifestId?: string;
}

export const WORLD_ATLASES = {
  classicIsland: {
    id: CLASSIC_WORLD_TILESET_ID,
    textureKey: CLASSIC_WORLD_TILESET_TEXTURE_KEY,
    image: CLASSIC_WORLD_TILESET_IMAGE,
    manifest: CLASSIC_WORLD_TILESET_MANIFEST_PATH,
    sheetWidth: CLASSIC_WORLD_TILESET_MANIFEST.image.width,
    sheetHeight: CLASSIC_WORLD_TILESET_MANIFEST.image.height,
    baseTileSize: CLASSIC_WORLD_TILESET_MANIFEST.baseGrid.chosenTileSize,
    sourceColumns: CLASSIC_WORLD_TILESET_MANIFEST.baseGrid.columns,
    sourceRows: CLASSIC_WORLD_TILESET_MANIFEST.baseGrid.rows,
    backgroundMode: CLASSIC_WORLD_TILESET_MANIFEST.image.backgroundMode,
    transparentColor: CLASSIC_WORLD_TILESET_MANIFEST.image.transparentColor,
    slicing: "manifestSourceRect",
    oldGeneratedAtlasActive: false,
  },
  generic10x10: {
    id: GENERIC_WORLD_ATLAS.id,
    textureKey: GENERIC_WORLD_ATLAS.textureKey,
    image: GENERIC_WORLD_ATLAS.image,
    sourceCopy: GENERIC_WORLD_ATLAS.sourceCopy,
    sheetWidth: GENERIC_WORLD_ATLAS.sheetWidth,
    sheetHeight: GENERIC_WORLD_ATLAS.sheetHeight,
    baseTileSize: GENERIC_WORLD_ATLAS.tileWidth,
    sourceColumns: GENERIC_WORLD_ATLAS.columns,
    sourceRows: GENERIC_WORLD_ATLAS.rows,
    slicing: "generic10x10Grid",
    oldGeneratedAtlasActive: false,
  },
} as const satisfies Record<string, WorldAtlasDefinition>;

export const WORLD_ATLAS = WORLD_ATLASES.classicIsland;

export const WORLD_ATLASES_BY_TEXTURE_KEY = Object.fromEntries(
  Object.values(WORLD_ATLASES).map((atlas) => [atlas.textureKey, atlas]),
) as Record<string, WorldAtlasDefinition>;

function classicTileToWorldTile(tile: ClassicWorldTerrainDefinition<ClassicWorldTileId>): WorldTileDefinition {
  return {
    id: tile.id,
    displayName: tile.displayName,
    biome: tile.biome,
    encounterFamily: tile.encounterFamily,
    walkable: tile.walkable,
    movementCost: tile.movementCost,
    tags: tile.tags,
    sourceRect: tile.sourceRect,
    textureKey: CLASSIC_WORLD_TILESET_TEXTURE_KEY,
    atlasId: CLASSIC_WORLD_TILESET_ID,
    notes: tile.notes,
    macroRegion: tile.macroRegion,
    manifestId: tile.manifestId,
  };
}

function genericTileToWorldTile(tile: GenericWorldTileDefinition<GenericWorldTileId>): WorldTileDefinition {
  return {
    id: tile.id,
    displayName: tile.displayName,
    biome: tile.biome,
    encounterFamily: tile.encounterFamily,
    walkable: tile.walkable,
    movementCost: tile.movementCost,
    tags: tile.tags,
    sourceRect: tile.sourceRect,
    textureKey: tile.textureKey,
    atlasId: tile.atlasId,
    notes: tile.notes,
    row: tile.row,
    col: tile.col,
  };
}

export const WORLD_TILE_DEFINITIONS = [
  ...CLASSIC_WORLD_TILE_DEFINITIONS.map((tile) => classicTileToWorldTile(tile as ClassicWorldTerrainDefinition<ClassicWorldTileId>)),
  ...GENERIC_WORLD_TILE_DEFINITIONS.map((tile) => genericTileToWorldTile(tile as GenericWorldTileDefinition<GenericWorldTileId>)),
] as readonly WorldTileDefinition[];

export const WORLD_TILES = Object.fromEntries(WORLD_TILE_DEFINITIONS.map((tile) => [tile.id, tile])) as Record<
  WorldTileId,
  WorldTileDefinition
>;

export function isWorldTileWalkable(tileId?: WorldTileId): boolean {
  if (!tileId) return false;
  return WORLD_TILES[tileId]?.walkable ?? false;
}

export function worldTileMovementCost(tileId?: WorldTileId): number {
  if (!tileId) return 99;
  return WORLD_TILES[tileId]?.movementCost ?? 99;
}

export function worldTileHasTag(tileId: WorldTileId | undefined, tag: string): boolean {
  if (!tileId) return false;
  return WORLD_TILES[tileId]?.tags.includes(tag) ?? false;
}

export function worldTileEncounterFamily(tileId?: WorldTileId): WorldEncounterFamily | undefined {
  if (!tileId) return undefined;
  const family = WORLD_TILES[tileId]?.encounterFamily;
  return family === "road" ? undefined : family;
}

export function worldTileIdsMatching(predicate: (tile: WorldTileDefinition) => boolean): WorldTileId[] {
  return WORLD_TILE_DEFINITIONS.filter(predicate).map((tile) => tile.id);
}
