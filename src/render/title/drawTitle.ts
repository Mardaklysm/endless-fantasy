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

export function drawTitle(this: CrystalOathSceneContext) {
  this.g.fillStyle(0x000000, 1).fillRect(0, 0, WIDTH, HEIGHT);
  const hasTitleScreen = this.hasTexture("title_screen");
  if (hasTitleScreen) this.drawContainedTexture("title_screen", 0, 0, WIDTH, HEIGHT, LAYER_WORLD_IMAGE);
  else {
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 120; i += 1) {
      const x = (i * 73) % WIDTH;
      const y = (i * 41) % HEIGHT;
      const c = i % 3 === 0 ? 0xfff0a8 : i % 3 === 1 ? 0x83d6ff : 0xffffff;
      this.g.fillStyle(c, i % 5 === 0 ? 0.42 : 0.28).fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
    }
    if (this.hasTexture("title_four_crystals")) this.drawTexture("title_four_crystals", WIDTH / 2 - 96, 48, 192, 64, LAYER_WORLD_IMAGE);
    else this.drawPixelCrystal(WIDTH / 2 - 24, 48, 2.4);
    const hasTitleLogo = this.hasTexture("title_logo");
    if (hasTitleLogo) this.drawTexture("title_logo", WIDTH / 2 - 210, 128, 420, 96, LAYER_WORLD_IMAGE);
    else {
      this.text(WIDTH / 2, 178, "CRYSTAL OATH", 44, "#fff2a8", "center");
      this.text(WIDTH / 2, 226, "Dawn of the Four Stars", 24, "#a8ddff", "center");
    }
  }
  const hasSave = !!localStorage.getItem(SAVE_KEY);
  this.titleOptions.forEach((option, idx) => {
    const disabled = option === "Continue" && !hasSave;
    const prefix = idx === this.titleSelected ? ">" : " ";
    this
      .text(WIDTH / 2, TITLE_MENU_START_Y + idx * TITLE_MENU_ROW_HEIGHT, `${prefix} ${option}`, 22, disabled ? "#8a91a2" : "#ffffff", "center")
      .setStroke("#02040a", 5)
      .setShadow(0, 2, "#02040a", 4, true, true);
  });
}
