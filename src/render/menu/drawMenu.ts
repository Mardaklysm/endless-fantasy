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

export function drawMenuScreen(this: CrystalOathSceneContext) {
  if (this.previousMode === "world") this.drawWorld();
  else if (this.previousMode === "town") this.drawTown();
  else if (this.previousMode === "dungeon") this.drawDungeon();
  else this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
  if (!this.menu) return;
  this.clearText();
  this.ui.fillStyle(0x02040a, 0.72).fillRect(0, 0, WIDTH, HEIGHT);
  this.drawPanel(155, 58, 650, 430);
  this.text(184, 96, this.menu.title, 24, "#fff2a8");
  const startY = 144;
  this.menu.options.forEach((option, idx) => {
    const disabled = option.disabled?.() ?? false;
    const label = typeof option.label === "function" ? option.label() : option.label;
    const selected = idx === this.menu!.selected;
    if (selected) this.drawCursor(176, startY + idx * 28 + 4);
    const prefix = selected && !this.hasTexture("ui_cursor_arrow") ? ">" : " ";
    this.text(194, startY + idx * 28, `${prefix} ${label}`, 18, disabled ? "#6f7486" : "#ffffff");
  });
  if (this.menu.footer) {
    const footer = typeof this.menu.footer === "function" ? this.menu.footer() : this.menu.footer;
    this.text(184, 454, footer, 14, "#b8c4e0");
  }
}

export function drawDialogue(this: CrystalOathSceneContext) {
  if (this.previousMode === "dungeon") this.drawDungeon();
  else if (this.previousMode === "town") this.drawTown();
  else if (this.previousMode === "title") this.drawTitle();
  else this.drawWorld();
  if (!this.dialogue) return;
  this.clearText();
  this.ui.fillStyle(0x02040a, 0.38).fillRect(0, 0, WIDTH, HEIGHT);
  this.drawPanel(56, 324, WIDTH - 112, 184);
  this.text(84, 356, this.dialogue.lines[this.dialogue.index], 20, "#ffffff");
  this.text(WIDTH - 256, 474, "Enter / Z", 14, "#aab3c8");
}

export function drawGameOver(this: CrystalOathSceneContext) {
  this.g.fillStyle(0x050407, 1).fillRect(0, 0, WIDTH, HEIGHT);
  this.text(WIDTH / 2, 190, "GAME OVER", 46, "#f07178", "center");
  this.text(WIDTH / 2, 270, "Enter loads your last save. Escape returns to title.", 20, "#ffffff", "center");
}

export function drawEnding(this: CrystalOathSceneContext) {
  this.g.fillStyle(0x07111a, 1).fillRect(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 80; i += 1) {
    this.g.fillStyle(i % 2 ? 0xffeaa8 : 0x95e7ff, 0.55).fillRect((i * 97) % WIDTH, (i * 53) % HEIGHT, 3, 3);
  }
  this.drawPixelCrystal(WIDTH / 2 - 28, 72, 3);
  this.text(WIDTH / 2, 170, "Asterra Wakes", 40, "#fff2a8", "center");
  this.text(WIDTH / 2, 240, "The Root drinks, the Flame warms, the Tide sings, and the Gale carries dawn.", 20, "#ffffff", "center");
  this.text(WIDTH / 2, 310, "Arlen, Mira, and Kael return their oath to the road, where new stories wait.", 20, "#dce9ff", "center");
  this.text(WIDTH / 2, 430, "Enter returns to title.", 16, "#aab3c8", "center");
}
