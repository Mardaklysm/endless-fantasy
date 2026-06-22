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

export function drawDungeon(this: CrystalOathSceneContext) {
  const dungeon = this.dungeons()[this.currentDungeon];
  this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
  const floor = dungeon.floors[this.dungeonFloor];
  const leaderPos = this.visualExplorePos("dungeon");
  const cam = this.cameraFor(leaderPos, floor[0].length, floor.length);
  const mapScreenX = -cam.x;
  const mapScreenY = -cam.y;
  this.g.fillStyle(0x070d18, 1).fillRect(mapScreenX - 10, mapScreenY - 10, floor[0].length * TILE + 20, floor.length * TILE + 20);
  for (let y = 0; y < floor.length; y += 1) {
    for (let x = 0; x < floor[y].length; x += 1) {
      const sx = x * TILE - cam.x;
      const sy = y * TILE - cam.y;
      if (sx < -TILE || sy < -TILE || sx > WIDTH || sy > HEIGHT) continue;
      this.drawDungeonTile(floor[y][x], sx, sy, dungeon, x, y);
    }
  }
  this.drawLeader(leaderPos.x * TILE - cam.x + 4, leaderPos.y * TILE - cam.y + 3, "dungeon");
  this.drawHud(`${dungeon.name} F${this.dungeonFloor + 1}`);
  this.drawPrompt("Explore / interact");
}

export function dungeonObjectTexture(this: CrystalOathSceneContext, tile: string, dungeon: DungeonDef, tileX: number, tileY: number): AssetKey | undefined {
  if (tile === "C") return this.isDungeonChestOpen(dungeon, this.dungeonFloor, tileX, tileY) ? "chest_open" : "chest_closed";
  if (tile === "K") return "switch_floor";
  if (tile === "D") return this.puzzleFlags.has(`${this.currentDungeon}-switch`) ? "dungeon_gate_open" : "dungeon_gate_closed";
  if (tile === "S") return "dungeon_stairs";
  if (tile === "E") return "dungeon_exit";
  if (tile === "B") return "boss_relic_seal";
  return undefined;
}

export function isDungeonChestOpen(this: CrystalOathSceneContext, dungeon: DungeonDef, floorIndex: number, tileX: number, tileY: number): boolean {
  let count = 0;
  for (let f = 0; f <= floorIndex; f += 1) {
    const floor = dungeon.floors[f];
    for (let y = 0; y < floor.length; y += 1) {
      for (let x = 0; x < floor[y].length; x += 1) {
        if (floor[y][x] !== "C") continue;
        if (f === floorIndex && x === tileX && y === tileY) {
          const reward = dungeon.chestRewards[count % dungeon.chestRewards.length];
          return this.openedChests.has(`${dungeon.id}-${floorIndex}-${tileX}-${tileY}-${reward.id}`);
        }
        count += 1;
      }
    }
  }
  return false;
}

export function drawDungeonTile(this: CrystalOathSceneContext, tile: string, sx: number, sy: number, dungeon: DungeonDef, tileX: number, tileY: number) {
  const theme = this.dungeonThemeTiles(dungeon);
  if (tile === "#") {
    if (!this.isDungeonWallEdge(tileX, tileY)) {
      this.g.fillStyle(0x050812, 1).fillRect(sx, sy, TILE, TILE);
      return;
    }
    const wallTile = this.pickDungeonAtlasTile(theme.walls, dungeon, tileX, tileY, 19);
    if (this.drawDungeonAtlasTile(wallTile, sx, sy)) return;
    if (this.drawTileTexture("dungeon_wall_base", sx, sy)) return;
    this.g.fillStyle(dungeon.palette.wall, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(dungeon.palette.accent, 0.25).fillRect(sx + 4, sy + 4, 7, 7);
    return;
  }
  const floorTile = this.pickDungeonAtlasTile(theme.floors, dungeon, tileX, tileY, 7);
  const drewFloor =
    this.drawDungeonAtlasTile(floorTile, sx, sy) ||
    this.drawTileTexture(DUNGEON_FLOOR_TEXTURES[dungeon.id] ?? "dungeon_floor_moss", sx, sy);
  if (!drewFloor) {
    this.g.fillStyle(dungeon.palette.floor, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(0xffffff, 0.05).fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
  }
  const atlasObjectTile = this.dungeonAtlasObjectTile(tile, dungeon, tileX, tileY);
  if (this.drawDungeonAtlasTile(atlasObjectTile, sx, sy, LAYER_OBJECT_IMAGE)) return;
  const objectKey = this.dungeonObjectTexture(tile, dungeon, tileX, tileY);
  if (this.drawTileTexture(objectKey, sx, sy, LAYER_OBJECT_IMAGE, false, tile === "S")) return;
  if (tile === "C") {
    this.g.fillStyle(dungeon.palette.chest, 1).fillRect(sx + 7, sy + 10, 18, 14);
    this.g.fillStyle(0x3a2111, 1).fillRect(sx + 7, sy + 17, 18, 3);
  }
  if (tile === "K") {
    this.g.fillStyle(dungeon.palette.accent, 1).fillRect(sx + 10, sy + 9, 12, 16);
    this.g.fillStyle(0xffffff, 0.55).fillRect(sx + 14, sy + 6, 4, 7);
  }
  if (tile === "D") {
    const open = this.puzzleFlags.has(`${this.currentDungeon}-switch`);
    this.g.fillStyle(open ? dungeon.palette.floor : dungeon.palette.gate, 1).fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
    if (!open) this.g.fillStyle(0x000000, 0.35).fillRect(sx + 14, sy + 3, 4, TILE - 6);
  }
  if (tile === "S") {
    this.g.fillStyle(dungeon.palette.accent, 1).fillRect(sx + 8, sy + 8, 16, 16);
    this.g.fillStyle(0x050812, 0.5).fillRect(sx + 12, sy + 12, 8, 8);
  }
  if (tile === "E") {
    this.g.fillStyle(0x050812, 0.7).fillRect(sx + 5, sy + 3, 22, 26);
  }
  if (tile === "B") {
    this.g.fillStyle(0xf5e17d, 0.7).fillRect(sx + 9, sy + 7, 14, 18);
  }
}

export function isDungeonWallEdge(this: CrystalOathSceneContext, tileX: number, tileY: number): boolean {
  const dungeon = this.dungeons()[this.currentDungeon];
  const floor = dungeon.floors[this.dungeonFloor];
  for (let yy = tileY - 1; yy <= tileY + 1; yy += 1) {
    for (let xx = tileX - 1; xx <= tileX + 1; xx += 1) {
      if (xx === tileX && yy === tileY) continue;
      const neighbor = floor[yy]?.[xx];
      if (neighbor && neighbor !== "#") return true;
    }
  }
  return false;
}
