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
  type ClassicWorldTileId
} from "../world/classicWorldTileCatalog.ts";

export { CLASSIC_WORLD_TILE_IDS };

export type WorldBiome = ClassicWorldBiome;
export type WorldEncounterFamily = ClassicWorldEncounterFamily;
export type WorldTileId = ClassicWorldTileId;

export interface WorldTileDefinition extends ClassicWorldTerrainDefinition<WorldTileId> {
  sourceRect: ClassicSourceRect;
}

export const WORLD_ATLAS = {
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
  oldGeneratedAtlasActive: false
} as const;

export const WORLD_TILE_DEFINITIONS = CLASSIC_WORLD_TILE_DEFINITIONS as readonly WorldTileDefinition[];

export const WORLD_TILES = Object.fromEntries(WORLD_TILE_DEFINITIONS.map((tile) => [tile.id, tile])) as Record<WorldTileId, WorldTileDefinition>;

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
  return WORLD_TILES[tileId]?.encounterFamily;
}

export function worldTileIdsMatching(predicate: (tile: WorldTileDefinition) => boolean): WorldTileId[] {
  return WORLD_TILE_DEFINITIONS.filter(predicate).map((tile) => tile.id);
}
