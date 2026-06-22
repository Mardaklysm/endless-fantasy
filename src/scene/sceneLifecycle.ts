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
} from "./sceneGlobals";
import type { CrystalOathSceneContext } from "./sceneContext";

export function preload(this: CrystalOathSceneContext) {
  for (const [key, url] of Object.entries(ASSET_URLS) as [AssetKey, string | undefined][]) {
    if (url) this.load.image(key, url);
  }
  for (const asset of WORLD_CURRENT_ASSETS) {
    const url = WORLD_CURRENT_ASSET_MODULES[`./world/current/${asset.filename}`];
    if (url) this.load.image(asset.textureKey, url);
    else console.warn(`Missing current world asset module for ${asset.filename}`);
  }
  for (const cloud of WORLD_CLOUD_ASSETS) {
    const url = WORLD_CURRENT_ASSET_MODULES[`./world/current/${cloud.filename}`];
    if (url) this.load.image(cloud.textureKey, url);
    else console.warn(`Missing current world cloud asset module for ${cloud.filename}`);
  }
}

export function create(this: CrystalOathSceneContext) {
  this.g = this.add.graphics();
  this.g.setDepth(0);
  this.worldOverlay = this.add.graphics();
  this.worldOverlay.setDepth(LAYER_WORLD_IMAGE + 0.5);
  this.ui = this.add.graphics();
  this.ui.setDepth(LAYER_UI_GRAPHICS);
  this.cloudOverlay = new OverworldCloudOverlay(this);
  this.configureRenderResolution();
  this.logActiveWorldTileset();
  this.buildWorldFromSeed(this.worldSeed);
  this.configureTextureFiltering();
  this.input.keyboard?.on("keydown", (event: KeyboardEvent) => this.handleKey(event));
  this.input.keyboard?.on("keyup", (event: KeyboardEvent) => this.handleKeyUp(event));
  this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer));
  this.draw();
}

export function configureRenderResolution(this: CrystalOathSceneContext) {
  this.cameras.main.roundPixels = true;
  this.g.setScale(PIXEL_ART_SCALE);
  this.worldOverlay.setScale(PIXEL_ART_SCALE);
  this.ui.setScale(PIXEL_ART_SCALE);
}

export function logActiveWorldTileset(this: CrystalOathSceneContext) {
  if (!import.meta.env.DEV) return;
  const terrainAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.assetKind === "terrain fill");
  const worldObjectAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.assetKind === "world object");
  const premiumWorldObjectAssets = worldObjectAssets.filter((asset) => asset.premium);
  const placeholderAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.placeholder);
  console.info(
    [
      "Active world art set: current selected asset manifest",
      `Worldgen mode: ${ACTIVE_WORLDGEN_MODE}`,
      `Manifest: ${WORLD_CURRENT_ASSET_MANIFEST.runtimeRoot}/world_asset_manifest.json`,
      `Approved terrain fills: ${terrainAssets.length}`,
      `Premium world objects: ${premiumWorldObjectAssets.length}`,
      `Backup world objects: ${worldObjectAssets.length - premiumWorldObjectAssets.length}`,
      `Cloud overlay fallback theme: ${WORLD_CLOUD_MANIFEST.fallbackTheme} (${WORLD_CLOUD_ASSETS.length} loaded base cloud assets)`,
      `Temporary current-folder placeholders: ${placeholderAssets.length}`,
      "World object resolution: premium objects_premium first, backup objects second, generated fallback last",
      `Deep ocean: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.deepOcean}`,
      `Shallow water: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.shallowWater}`,
      `Beach: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.beach}`,
      `Grassland: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.grassland}`,
      `Sand: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.sand}`,
      `Ice/snow: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.ice}`,
      `Freshwater terrain: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.freshWater}`,
      "Deprecated overworld atlases active: false",
      "Random base terrain variants active: false",
      "Roads, rivers, and lakes render through the semantic terrain mask; mountain sprites, forests, and POIs remain overlays",
      `Dungeon atlas: ${DUNGEON_ATLAS.image}`,
      `Dungeon atlas source inset: ${DUNGEON_ATLAS_SOURCE_INSET}`,
      `Dungeon atlas entries: ${DUNGEON_TILE_ID_SET.size}`
    ].join("\n")
  );
}

export function update(this: CrystalOathSceneContext, _time: number, delta: number) {
  const dt = Math.min(delta, 50);
  this.updateMovement(dt);
  this.updateBattleFlow(dt);
  if (this.dirty) this.draw();
  this.updateCloudOverlay(dt);
}
