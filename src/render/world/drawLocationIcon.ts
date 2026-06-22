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

export function locationTextureForKind(this: CrystalOathSceneContext, loc: LocationDef): AssetKey | undefined {
  if (loc.kind === "harbor") return "marker_port";
  if (loc.landmarkKind === "shrine") return "marker_shrine";
  if (loc.landmarkKind === "cave") return "marker_cave";
  if (loc.landmarkKind === "ruins" || loc.landmarkKind === "ancientDoor") return "marker_gate";
  if (loc.landmarkKind === "secretMerchant") return "marker_town";
  return undefined;
}

export function drawLocationIcon(this: CrystalOathSceneContext, loc: LocationDef, footprintX: number, footprintY: number) {
  const footprint = this.locationFootprint(loc);
  const footprintSize = footprint * TILE;
  const currentPoiTexture = worldCurrentPoiTextureKeyFor(loc);
  const currentPoiAsset = worldCurrentAssetByTextureKey(currentPoiTexture);
  const size = this.locationVisualSize(loc, footprintSize, currentPoiAsset);
  const centerX = footprintX + footprintSize / 2;
  const baselineY = footprintY + footprintSize - this.locationVisualLift(loc);
  const sx = centerX - size * (currentPoiAsset?.anchorX ?? 0.5);
  const sy = baselineY - size * (currentPoiAsset?.anchorY ?? 1);
  const fallbackSx = centerX - size / 2;
  const fallbackSy = baselineY - size;
  const cx = centerX;
  const bottom = baselineY - 6;
  this.drawActorShadow(cx, bottom, size * 0.72, Math.max(10, size * 0.16));
  if (currentPoiTexture && this.hasTexture(currentPoiTexture)) {
    this.drawTexture(currentPoiTexture, sx, sy - 2, size, size, LAYER_OBJECT_IMAGE);
    return;
  }
  if (this.drawWorldObjectCell(loc.objectId, fallbackSx, fallbackSy - 2, size, size)) return;
  const locationTexture = LOCATION_TEXTURES[loc.id] ?? this.locationTextureForKind(loc);
  if (locationTexture && this.hasTexture(locationTexture)) {
    this.drawTexture(locationTexture, fallbackSx, fallbackSy - 2, size, size, LAYER_OBJECT_IMAGE);
    return;
  }
  const syGenerated = fallbackSy;
  const sxGenerated = fallbackSx;
  const u = size / 96;
  if (loc.kind === "harbor") {
    this.g.fillStyle(0x9a6a3d, 1).fillRect(sxGenerated + 18 * u, syGenerated + 54 * u, 60 * u, 12 * u);
    this.g.fillStyle(0xe8c36b, 1).fillRect(sxGenerated + 24 * u, syGenerated + 42 * u, 48 * u, 18 * u);
    this.g.fillStyle(0x2f8db8, 1).fillTriangle(sxGenerated + 34 * u, syGenerated + 42 * u, sxGenerated + 50 * u, syGenerated + 18 * u, sxGenerated + 66 * u, syGenerated + 42 * u);
    this.g.fillStyle(0xf7f2d0, 1).fillRect(sxGenerated + 47 * u, syGenerated + 20 * u, 5 * u, 38 * u);
    return;
  }
  if (loc.kind === "landmark") {
    const color = loc.landmarkKind === "shrine" ? 0x95e7ff : loc.landmarkKind === "monsterNest" ? 0xd96b55 : 0xffdf78;
    this.g.fillStyle(0x1b2430, 1).fillRect(sxGenerated + 24 * u, syGenerated + 44 * u, 48 * u, 32 * u);
    this.g.fillStyle(color, 1).fillTriangle(sxGenerated + 18 * u, syGenerated + 48 * u, cx, syGenerated + 18 * u, sxGenerated + 78 * u, syGenerated + 48 * u);
    this.g.fillStyle(0x07101d, 1).fillRect(cx - 9 * u, syGenerated + 56 * u, 18 * u, 20 * u);
    return;
  }
  if (loc.id === "dawnford" || loc.kind === "town") {
    const roof = loc.id === "brinewick" ? 0x4c9fc7 : loc.id === "sunbarrow" ? 0xf08a2e : 0xd9542e;
    this.g.fillStyle(0x1a2334, 0.55).fillRect(sxGenerated + 18 * u, syGenerated + 54 * u, 60 * u, 24 * u);
    this.g.fillStyle(0xf2eee0, 1).fillRect(sxGenerated + 26 * u, syGenerated + 42 * u, 44 * u, 34 * u);
    this.g.fillStyle(roof, 1).fillTriangle(sxGenerated + 18 * u, syGenerated + 44 * u, cx, syGenerated + 22 * u, sxGenerated + 78 * u, syGenerated + 44 * u);
    this.g.fillStyle(0x283044, 1).fillRect(cx - 8 * u, syGenerated + 57 * u, 16 * u, 20 * u);
    this.g.fillStyle(0xffefbd, 1).fillRect(sxGenerated + 32 * u, syGenerated + 52 * u, 8 * u, 8 * u);
    this.g.fillRect(sxGenerated + 56 * u, syGenerated + 52 * u, 8 * u, 8 * u);
    return;
  }
  if (loc.kind === "gate") {
    this.g.fillStyle(0x4b467a, 1).fillRect(sxGenerated + 24 * u, syGenerated + 28 * u, 16 * u, 50 * u);
    this.g.fillRect(sxGenerated + 56 * u, syGenerated + 28 * u, 16 * u, 50 * u);
    this.g.fillStyle(0xffdf76, 1).fillCircle(cx, syGenerated + 26 * u, 12 * u);
    this.g.lineStyle(5 * u, 0xd5c8ff, 1).lineBetween(sxGenerated + 32 * u, syGenerated + 32 * u, sxGenerated + 64 * u, syGenerated + 32 * u);
    return;
  }
  if (loc.id === "mossCave") {
    this.g.fillStyle(0x4a5744, 1).fillTriangle(sxGenerated + 12 * u, syGenerated + 78 * u, cx, syGenerated + 20 * u, sxGenerated + 84 * u, syGenerated + 78 * u);
    this.g.fillStyle(0x142018, 1).fillRect(cx - 17 * u, syGenerated + 48 * u, 34 * u, 30 * u);
    this.g.fillStyle(0x4aa44d, 1).fillRect(sxGenerated + 22 * u, syGenerated + 64 * u, 14 * u, 10 * u);
    return;
  }
  if (loc.id === "ashenKeep") {
    this.g.fillStyle(0x454044, 1).fillRect(sxGenerated + 16 * u, syGenerated + 34 * u, 64 * u, 44 * u);
    this.g.fillStyle(0xdf5a2e, 1).fillRect(sxGenerated + 28 * u, syGenerated + 20 * u, 12 * u, 22 * u);
    this.g.fillRect(sxGenerated + 58 * u, syGenerated + 20 * u, 12 * u, 22 * u);
    this.g.fillStyle(0x111018, 1).fillRect(cx - 10 * u, syGenerated + 56 * u, 20 * u, 22 * u);
    return;
  }
  if (loc.id === "tideShrine") {
    this.g.fillStyle(0xdfe8ef, 1).fillRect(sxGenerated + 20 * u, syGenerated + 40 * u, 56 * u, 36 * u);
    this.g.fillStyle(0x4ab3d1, 1).fillTriangle(sxGenerated + 14 * u, syGenerated + 42 * u, cx, syGenerated + 18 * u, sxGenerated + 82 * u, syGenerated + 42 * u);
    this.g.fillStyle(0x1a5e80, 1).fillRect(sxGenerated + 32 * u, syGenerated + 55 * u, 10 * u, 22 * u);
    this.g.fillRect(sxGenerated + 56 * u, syGenerated + 55 * u, 10 * u, 22 * u);
    return;
  }
  if (loc.id === "skyglassTower") {
    this.g.fillStyle(0x647081, 1).fillRect(cx - 13 * u, syGenerated + 20 * u, 26 * u, 58 * u);
    this.g.fillStyle(0x98edf7, 1).fillTriangle(cx - 20 * u, syGenerated + 30 * u, cx, syGenerated + 6 * u, cx + 20 * u, syGenerated + 30 * u);
    this.g.fillStyle(0x273548, 1).fillRect(cx - 6 * u, syGenerated + 58 * u, 12 * u, 20 * u);
    return;
  }
  this.g.fillStyle(0x2a1d3d, 1).fillTriangle(sxGenerated + 20 * u, syGenerated + 80 * u, cx, syGenerated + 12 * u, sxGenerated + 76 * u, syGenerated + 80 * u);
  this.g.fillStyle(0xb388ff, 1).fillRect(cx - 8 * u, syGenerated + 28 * u, 16 * u, 44 * u);
  this.g.fillStyle(0xffdf78, 1).fillRect(cx - 14 * u, syGenerated + 18 * u, 28 * u, 10 * u);
}

export function locationVisualSize(this: CrystalOathSceneContext, loc: LocationDef, footprintSize: number, asset?: WorldCurrentAssetRecord): number {
  if (asset && !asset.placeholder) {
    const scale = this.locationManifestScale(loc, asset);
    const maxSize =
      loc.kind === "town" || loc.kind === "harbor"
        ? footprintSize * 1.04
        : loc.kind === "final"
          ? footprintSize * 1.04
          : loc.kind === "gate"
            ? footprintSize
            : loc.kind === "dungeon"
              ? footprintSize
              : footprintSize;
    const minSize =
      loc.kind === "town" || loc.kind === "harbor"
        ? Math.min(footprintSize, TILE * 2.25)
        : loc.kind === "final"
          ? Math.min(footprintSize, TILE * 2.4)
          : Math.min(footprintSize, TILE * 2);
    return Math.min(maxSize, Math.max(minSize, footprintSize * scale));
  }
  const byKind: Record<WorldPoiKind, number> = {
    town: 2.65,
    harbor: 2.25,
    dungeon: 2,
    gate: 2,
    final: 2.65,
    landmark: 2
  };
  return Math.min(footprintSize, TILE * (byKind[loc.kind] ?? 1.75));
}

export function locationManifestScale(this: CrystalOathSceneContext, loc: LocationDef, asset: WorldCurrentAssetRecord): number {
  const recommended = asset.recommendedScale ?? 0.9;
  const roleText = `${asset.category} ${asset.subcategory ?? ""} ${asset.placementLayer ?? ""} ${asset.integrationRole ?? ""} ${asset.semanticRole}`;
  if (
    loc.kind === "town" ||
    loc.kind === "harbor" ||
    roleText.includes("settlement") ||
    roleText.includes("village") ||
    roleText.includes("town") ||
    roleText.includes("city") ||
    roleText.includes("harbor") ||
    roleText.includes("castle") ||
    roleText.includes("fort")
  ) {
    return Math.max(recommended, 0.96);
  }
  if (loc.kind === "gate" || loc.kind === "final") return Math.max(recommended, 0.86);
  if (loc.kind === "dungeon") return Math.min(Math.max(recommended, 0.76), 1.05);
  return Math.min(Math.max(recommended, 0.68), 0.98);
}

export function locationVisualLift(this: CrystalOathSceneContext, loc: LocationDef): number {
  if (loc.kind === "town" || loc.kind === "final") return 4;
  if (loc.kind === "dungeon" || loc.kind === "gate") return 2;
  return 8;
}
