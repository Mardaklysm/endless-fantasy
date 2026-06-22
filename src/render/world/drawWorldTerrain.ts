import Phaser from "phaser";
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  ASPECT_RATIO,
  PIXEL_ART_SCALE,
  LAYOUT_WIDTH,
  LAYOUT_HEIGHT,
  WIDTH,
  HEIGHT,
  TILE,
  TITLE_MENU_START_Y,
  TITLE_MENU_ROW_HEIGHT,
  DEBUG_WORLD_LAYOUT,
  SAVE_KEY,
  WORLD_W,
  WORLD_H,
  MOVE_DURATION_MS,
  FAST_MOVE_DURATION_MS,
  MOVE_TILES_PER_MS,
  FAST_MOVE_TILES_PER_MS,
  BATTLE_ACTION_DELAY_MS,
  BATTLE_TURN_DELAY_MS,
  WORLD_PLAYER_BASE_SPRITE_WIDTH,
  EXPLORE_PLAYER_SPRITE_WIDTH,
  LANDMARK_FOOTPRINT,
  TILE_FRAME,
  LAYER_WORLD_IMAGE,
  LAYER_OBJECT_IMAGE,
  LAYER_CHARACTER_IMAGE,
  LAYER_BATTLE_IMAGE,
  LAYER_UI_GRAPHICS,
  LAYER_UI_IMAGE,
  LAYER_TEXT,
  ASSET_PATHS,
  ASSET_URLS,
  WORLD_CURRENT_ASSET_MODULES,
  WORLD_CURRENT_ASSETS,
  WORLD_CLOUD_ASSETS,
  WORLD_CLOUD_MANIFEST,
  WORLD_CURRENT_ASSET_MANIFEST,
  WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID,
  WORLD_CURRENT_ROUTE_TEXTURE_KEYS,
  WORLD_CURRENT_TERRAIN_TEXTURE_KEYS,
  worldCurrentAssetByTextureKey,
  worldCurrentObjectTextureKey,
  worldCurrentPoiTextureKeyFor,
  DUNGEON_ATLAS,
  DUNGEON_ATLAS_SOURCE_INSET,
  DUNGEON_TILE_ID_SET,
  DUNGEON_TILE_IDS,
  dungeonAtlasSourceRectWithInset,
  dungeonTileById,
  DUNGEON_FLOOR_TEXTURES,
  DUNGEON_THEME_TILES,
  DEFAULT_DUNGEON_THEME_TILES,
  TOWN_ATLAS_FLOOR_TILES,
  TOWN_ATLAS_WALL_TILES,
  TOWN_SHOP_PAD_TILES,
  LOCATION_TEXTURES,
  TOWN_SERVICE_TEXTURES,
  TOWN_PROP_TEXTURES,
  CHARACTER_CLASS_TEXTURES,
  PARTY_CLASS,
  ENEMY_TEXTURES,
  PORTRAIT_TEXTURES,
  NPC_TEXTURES,
  TOWN_SERVICES,
  ITEMS,
  SPELLS,
  PLAYER_SKILLS,
  WEAPONS,
  ARMORS,
  GEAR,
  ENEMIES,
  WORLD_TABLES,
  CHARACTER_SPRITES,
  generateDungeonFloors,
  createSemanticMaskTerrainTexture,
  createSemanticRouteOverlayTexture,
  SEMANTIC_BIOME,
  SEMANTIC_WATER,
  hashNoise,
  ACTIVE_WORLDGEN_MODE,
  createWorldSeed,
  generateWorld,
  getIslandAt,
  isWorldPositionWalkable,
  WORLD_TILES,
  isWorldTileWalkable,
  worldTileEncounterFamily,
  worldTileHasTag,
  isUp,
  isDown,
  isLeft,
  isRight,
  isConfirm,
  isCancel,
  directionNameForEvent,
  keyDirection,
  wrap,
  seededNoise,
  OverworldCloudOverlay,
  type AssetKey,
  type Mode,
  type ExploreMode,
  type DirectionName,
  type Terrain,
  type Vec,
  type ExploreStep,
  type MenuOption,
  type ActiveMenu,
  type Dialogue,
  type ElementType,
  type TargetKind,
  type StatusState,
  type CharacterState,
  type ItemDef,
  type SpellDef,
  type PlayerSkillDef,
  type GearDef,
  type EnemyMove,
  type EnemyIntentKind,
  type EnemyIntent,
  type EnemyDef,
  type EnemyState,
  type LocationDef,
  type TownDef,
  type DungeonDef,
  type TravelDestination,
  type ServiceKind,
  type TownServiceDef,
  type BattleAction,
  type BattleAnimation,
  type BattlePhase,
  type InitiativeEntry,
  type BattleState,
  type DungeonThemeTiles,
  type WorldCurrentAssetRecord,
  type WorldObjectId,
  type WorldTileId,
  type GeneratedWorld,
  type IslandId,
  type IslandTheme,
  type RoadRotation,
  type WorldRoadVisual,
  type WorldLandmarkKind,
  type WorldPoiKind,
  type SemanticMaskTerrainClass,
  type SemanticMaskTerrainSources,
  type SemanticRouteOverlayMode,
  type CharacterSpriteClass,
  type CharacterSpriteFrameName,
  type DungeonTileId
} from "../../scene/sceneGlobals";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function worldTerrainAt(this: CrystalOathSceneContext, x: number, y: number): Terrain | undefined {
  return this.world[y]?.[x];
}

export function isWaterTerrain(this: CrystalOathSceneContext, terrain?: Terrain): boolean {
  return worldTileHasTag(terrain, "water");
}

export function isLandTerrain(this: CrystalOathSceneContext, terrain?: Terrain): boolean {
  return !!terrain && !this.isWaterTerrain(terrain);
}

export function drawWorldPlainsTile(this: CrystalOathSceneContext, sx: number, sy: number, x: number, y: number) {
  const n = seededNoise(x, y, 11);
  this.g.fillStyle(n > 0.55 ? 0x58b347 : 0x4fab43, 1).fillRect(sx, sy, TILE, TILE);
  this.g.fillStyle(0x78cf5b, 0.5).fillRect(sx + 2, sy + 2, TILE - 4, 3);
  this.g.fillStyle(0x2f7b34, 0.4).fillRect(sx + 1, sy + TILE - 5, TILE - 2, 4);
  for (let i = 0; i < 4; i += 1) {
    const gx = sx + 3 + Math.floor(seededNoise(x + i, y, 21) * 24);
    const gy = sy + 6 + Math.floor(seededNoise(x, y + i, 22) * 18);
    this.g.fillStyle(i % 2 ? 0x84db67 : 0x347e36, 0.72).fillRect(gx, gy, i % 2 ? 8 : 5, 2);
  }
}

export function drawWorldForestTile(this: CrystalOathSceneContext, sx: number, sy: number, x: number, y: number) {
  this.g.fillStyle(0x235c32, 1).fillRect(sx, sy, TILE, TILE);
  this.g.fillStyle(0x153b24, 1).fillRect(sx, sy + 23, TILE, 9);
  for (let i = 0; i < 5; i += 1) {
    const tx = sx + 2 + Math.floor(seededNoise(x + i, y, 31) * 22);
    const ty = sy + 2 + Math.floor(seededNoise(x, y + i, 32) * 17);
    this.g.fillStyle(0x12351f, 1).fillRect(tx + 2, ty + 10, 5, 12);
    this.g.fillStyle(i % 2 ? 0x2f8a3e : 0x1f6f34, 1).fillCircle(tx + 6, ty + 7, 9);
    this.g.fillStyle(0x62b84e, 0.7).fillRect(tx + 4, ty + 2, 6, 3);
  }
  this.g.fillStyle(0x0e2419, 0.45).fillRect(sx, sy + 27, TILE, 5);
}

export function drawWorldHillsTile(this: CrystalOathSceneContext, sx: number, sy: number, x: number, y: number) {
  this.g.fillStyle(0x77a44f, 1).fillRect(sx, sy, TILE, TILE);
  this.g.fillStyle(0x947848, 1).fillEllipse(sx + 12, sy + 20, 28, 16);
  this.g.fillStyle(0xb79a5a, 1).fillEllipse(sx + 20, sy + 16, 22, 13);
  this.g.fillStyle(0x4f6d34, 0.5).fillRect(sx + 1, sy + 25, TILE - 2, 5);
  if (seededNoise(x, y, 41) > 0.45) {
    this.g.lineStyle(2, 0xe6cc80, 0.72).lineBetween(sx + 7, sy + 15, sx + 19, sy + 10);
  }
}

export function drawWorldMountainTile(this: CrystalOathSceneContext, sx: number, sy: number, x: number, y: number) {
  this.g.fillStyle(0x5d674f, 1).fillRect(sx, sy, TILE, TILE);
  this.g.fillStyle(0x3f3c37, 1).fillTriangle(sx + 1, sy + 29, sx + 12, sy + 5, sx + 24, sy + 29);
  this.g.fillStyle(0x5d584e, 1).fillTriangle(sx + 9, sy + 30, sx + 22, sy + 2, sx + 32, sy + 30);
  this.g.fillStyle(0xcfcfbf, 1).fillTriangle(sx + 9, sy + 11, sx + 12, sy + 5, sx + 16, sy + 12);
  this.g.fillStyle(0xf2f2db, 1).fillTriangle(sx + 19, sy + 9, sx + 22, sy + 2, sx + 26, sy + 10);
  this.g.fillStyle(0x2c2b2a, 0.38).fillRect(sx + 2, sy + 27, TILE - 4, 4);
  if (seededNoise(x, y, 44) > 0.62) this.g.fillStyle(0x806f4d, 0.55).fillRect(sx + 5, sy + 24, 7, 3);
}

export function drawWorldWaterTile(this: CrystalOathSceneContext, deep: boolean, sx: number, sy: number, x: number, y: number) {
  this.g.fillStyle(deep ? 0x174a9c : 0x237cc5, 1).fillRect(sx, sy, TILE, TILE);
  this.g.fillStyle(deep ? 0x0d2d68 : 0x155da1, 0.45).fillRect(sx, sy + 23, TILE, 9);
  for (let i = 0; i < 3; i += 1) {
    const wx = sx + 3 + Math.floor(seededNoise(x + i, y, 51) * 20);
    const wy = sy + 5 + i * 8 + Math.floor(seededNoise(x, y + i, 52) * 3);
    this.g.lineStyle(2, deep ? 0x5f8dea : 0x8ee8ff, 0.75).lineBetween(wx, wy, wx + 9, wy - 2);
    this.g.lineStyle(1, deep ? 0x0b244d : 0x0e4f88, 0.45).lineBetween(wx + 3, wy + 4, wx + 14, wy + 3);
  }
}

export function drawWorldSandTile(this: CrystalOathSceneContext, sx: number, sy: number, x: number, y: number) {
  const n = seededNoise(x, y, 61);
  this.g.fillStyle(n > 0.5 ? 0xe8cd69 : 0xe1bf59, 1).fillRect(sx, sy, TILE, TILE);
  this.g.fillStyle(0xffe98a, 0.52).fillRect(sx + 2, sy + 2, TILE - 4, 3);
  this.g.lineStyle(2, 0xb89043, 0.45).lineBetween(sx + 4, sy + 13, sx + 16, sy + 10);
  this.g.lineStyle(2, 0xf7df7a, 0.5).lineBetween(sx + 13, sy + 22, sx + 28, sy + 18);
  if (n > 0.68) this.g.fillStyle(0xb4883d, 0.4).fillRect(sx + 6, sy + 25, 6, 2);
}

export function drawWorldRoadTile(this: CrystalOathSceneContext, sx: number, sy: number, x: number, y: number) {
  this.g.fillStyle(0x70a64b, 1).fillRect(sx, sy, TILE, TILE);
  this.g.fillStyle(0xb69863, 1).fillRect(sx, sy + 9, TILE, 15);
  this.g.fillStyle(0xd2bb82, 0.78).fillRect(sx, sy + 10, TILE, 3);
  this.g.fillStyle(0x7d643f, 0.42).fillRect(sx, sy + 21, TILE, 3);
  if (seededNoise(x, y, 71) > 0.5) this.g.fillStyle(0x5b4a35, 0.5).fillRect(sx + 18, sy + 17, 4, 3);
}

export function drawWorldCoastEdges(this: CrystalOathSceneContext, terrain: Terrain, sx: number, sy: number, x: number, y: number) {
  const edges = [
    { dx: -1, dy: 0, side: "left" },
    { dx: 1, dy: 0, side: "right" },
    { dx: 0, dy: -1, side: "top" },
    { dx: 0, dy: 1, side: "bottom" }
  ] as const;
  for (const edge of edges) {
    const neighbor = this.worldTerrainAt(x + edge.dx, y + edge.dy);
    if (this.isLandTerrain(terrain) && this.isWaterTerrain(neighbor)) {
      this.g.fillStyle(0xe8c36b, 1);
      if (edge.side === "left") this.g.fillRect(sx, sy, 4, TILE);
      if (edge.side === "right") this.g.fillRect(sx + TILE - 4, sy, 4, TILE);
      if (edge.side === "top") this.g.fillRect(sx, sy, TILE, 4);
      if (edge.side === "bottom") this.g.fillRect(sx, sy + TILE - 4, TILE, 4);
    }
    if (this.isWaterTerrain(terrain) && this.isLandTerrain(neighbor)) {
      this.g.fillStyle(0x9cf3ff, 0.72);
      if (edge.side === "left") this.g.fillRect(sx, sy, 3, TILE);
      if (edge.side === "right") this.g.fillRect(sx + TILE - 3, sy, 3, TILE);
      if (edge.side === "top") this.g.fillRect(sx, sy, TILE, 3);
      if (edge.side === "bottom") this.g.fillRect(sx, sy + TILE - 3, TILE, 3);
    }
  }
}
