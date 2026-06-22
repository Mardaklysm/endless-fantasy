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

export function drawPanel(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number) {
  if (this.hasTexture("ui_window_panel")) {
    const c = 12;
    const mid = 24;
    const iw = Math.max(1, w - c * 2);
    const ih = Math.max(1, h - c * 2);
    this.ui.fillStyle(0x020714, 0.58).fillRect(x + 4, y + 5, w, h);
    this.drawCroppedTexture("ui_window_panel", x, y, 0, 0, c, c, c, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + c, y, c, 0, mid, c, iw, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + w - c, y, c + mid, 0, c, c, c, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x, y + c, 0, c, c, mid, c, ih, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + c, y + c, c, c, mid, mid, iw, ih, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + w - c, y + c, c + mid, c, c, mid, c, ih, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x, y + h - c, 0, c + mid, c, c, c, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + c, y + h - c, c, c + mid, mid, c, iw, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + w - c, y + h - c, c + mid, c + mid, c, c, c, c, LAYER_UI_IMAGE);
    return;
  }
  this.ui.fillStyle(0x020714, 0.55).fillRect(x + 4, y + 5, w, h);
  this.ui.fillStyle(0x10275a, 0.98).fillRect(x, y, w, h);
  this.ui.fillStyle(0x0b1733, 0.98).fillRect(x + 7, y + 7, w - 14, h - 14);
  this.ui.fillStyle(0x1f56ac, 0.34).fillRect(x + 8, y + 8, w - 16, Math.min(18, h - 16));
  this.ui.lineStyle(3, 0xe8f2ff, 1).strokeRect(x, y, w, h);
  this.ui.lineStyle(1, 0x77a5ff, 0.9).strokeRect(x + 7, y + 7, w - 14, h - 14);
  this.ui.lineStyle(1, 0x031026, 0.85).strokeRect(x + 3, y + 3, w - 6, h - 6);
}

export function drawBar(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number, value: number, max: number, color: number) {
  const pct = Phaser.Math.Clamp(value / Math.max(1, max), 0, 1);
  if (this.hasTexture("ui_status_bar_empty") && this.hasTexture("ui_hp_bar")) {
    this.drawTexture("ui_status_bar_empty", x, y, w, h, LAYER_UI_IMAGE);
    const filledWidth = Math.floor(w * pct);
    if (filledWidth > 0) {
      this.drawCroppedTexture("ui_hp_bar", x, y, 0, 0, Math.max(1, Math.floor(64 * pct)), 8, filledWidth, h, LAYER_UI_IMAGE + 1, 1, color);
    }
    this.ui.lineStyle(1, 0xffffff, 0.55).strokeRect(x, y, w, h);
    return;
  }
  this.ui.fillStyle(0x0a0d14, 1).fillRect(x, y, w, h);
  this.ui.fillStyle(color, 1).fillRect(x, y, Math.floor(w * pct), h);
  this.ui.lineStyle(1, 0xffffff, 0.55).strokeRect(x, y, w, h);
}

export function drawHud(this: CrystalOathSceneContext, place: string) {
  const travel = this.flags.skyship ? "Skyship" : this.flags.boat ? "Boat" : "On Foot";
  this.drawPanel(12, 10, 286, 56);
  this.text(28, 18, place, 17, "#fff2a8", "left", { wordWrapWidth: 250 });
  this.text(28, 42, `Gold ${this.gold}  Relics ${this.relicCount()}/4  ${travel}`, 12, "#e7efff", "left", { wordWrapWidth: 250 });

  const rightW = 318;
  const rightX = WIDTH - rightW - 12;
  this.drawPanel(rightX, 10, rightW, 56);
  this.text(rightX + 16, 19, `Enc ${this.settings.encounters ? "ON" : "OFF"}  XP ${this.settings.xpMultiplier}x`, 13, "#e7efff", "left", {
    wordWrapWidth: rightW - 32
  });
  const seedText = import.meta.env.DEV ? `Seed ${this.worldSeed}` : `${this.settings.muted ? "Muted" : "Audio"}  Esc Menu`;
  this.text(rightX + 16, 41, seedText, 11, "#c5d2f2", "left", { wordWrapWidth: rightW - 32 });
}

export function drawPrompt(this: CrystalOathSceneContext, text: string) {
  const w = 326;
  const h = 42;
  const x = WIDTH - w - 24;
  const y = HEIGHT - h - 18;
  this.drawPanel(x, y, w, h);
  this.text(x + 18, y + 12, text, 16, "#ffffff", "left", { wordWrapWidth: w - 36 });
}

export function cameraFor(this: CrystalOathSceneContext, pos: Vec, mapW: number, mapH: number): Vec {
  const mapPixelW = mapW * TILE;
  const mapPixelH = mapH * TILE;
  return {
    x:
      mapPixelW <= WIDTH
        ? -(WIDTH - mapPixelW) / 2
        : Phaser.Math.Clamp(pos.x * TILE - WIDTH / 2 + TILE / 2, 0, mapPixelW - WIDTH),
    y:
      mapPixelH <= HEIGHT
        ? -(HEIGHT - mapPixelH) / 2
        : Phaser.Math.Clamp(pos.y * TILE - HEIGHT / 2 + TILE / 2, 0, mapPixelH - HEIGHT)
  };
}

export function markDirty(this: CrystalOathSceneContext) {
  this.dirty = true;
}
