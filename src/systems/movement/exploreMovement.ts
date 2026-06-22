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

export function clearHeldMovement(this: CrystalOathSceneContext) {
  this.heldDirections = [];
  this.cancelActiveStep();
}

export function cancelActiveStep(this: CrystalOathSceneContext) {
  if (!this.activeStep) return;
  const mode = this.activeStep.mode;
  this.setVisualExplorePos(mode, this.currentExploreTile(mode));
  this.activeStep = undefined;
}

export function currentHeldDirection(this: CrystalOathSceneContext): Vec | undefined {
  const direction = this.heldDirections[this.heldDirections.length - 1];
  if (direction === "up") return { x: 0, y: -1 };
  if (direction === "down") return { x: 0, y: 1 };
  if (direction === "left") return { x: -1, y: 0 };
  if (direction === "right") return { x: 1, y: 0 };
  return undefined;
}

export function updateMovement(this: CrystalOathSceneContext, delta: number) {
  this.blockedMoveCooldown = Math.max(0, this.blockedMoveCooldown - delta);
  this.playerMoving = false;
  if (!this.isExploreMode(this.mode)) {
    this.walkAnimElapsed = 0;
    this.activeStep = undefined;
    return;
  }
  if (this.activeStep) {
    this.lastMoveDir = { ...this.activeStep.dir };
    this.playerMoving = true;
    this.walkAnimElapsed += delta;
    this.advanceExploreStep(delta);
    this.markDirty();
    return;
  }
  const dir = this.currentHeldDirection();
  if (!dir) {
    this.walkAnimElapsed = 0;
    return;
  }
  this.lastMoveDir = { ...dir };
  if (!this.beginExploreStep(this.mode, dir)) {
    if (this.blockedMoveCooldown <= 0) {
      this.audio.blip("error");
      this.blockedMoveCooldown = 150;
    }
    this.walkAnimElapsed = 0;
    return;
  }
  this.playerMoving = true;
  this.walkAnimElapsed += delta;
  this.advanceExploreStep(delta);
  this.markDirty();
}

export function beginExploreStep(this: CrystalOathSceneContext, mode: ExploreMode, dir: Vec): boolean {
  if (!this.isExploreMode(this.mode)) return false;
  if (this.activeStep) return true;
  const from = this.currentExploreTile(mode);
  if (mode === "town" && dir.y > 0 && this.isTownExitTile(from)) {
    this.exitTownToWorld();
    return true;
  }
  const to = { x: from.x + dir.x, y: from.y + dir.y };
  if (!this.canOccupyExploreTile(mode, to.x, to.y)) {
    if (mode === "world") {
      const loc = this.locationAt(to.x, to.y);
      if (loc) {
        this.activateWorldLocation(loc);
        return true;
      }
    }
    return false;
  }
  this.setVisualExplorePos(mode, from);
  this.activeStep = { mode, from, to, dir: { ...dir } };
  return true;
}

export function advanceExploreStep(this: CrystalOathSceneContext, delta: number) {
  const step = this.activeStep;
  if (!step || !this.isExploreMode(this.mode) || this.mode !== step.mode) {
    this.activeStep = undefined;
    return;
  }
  const speed = (this.shiftHeld ? FAST_MOVE_TILES_PER_MS : MOVE_TILES_PER_MS) * delta;
  if (speed <= 0) return;
  const pos = this.visualExplorePos(step.mode);
  const remaining = Math.abs(step.to.x - pos.x) + Math.abs(step.to.y - pos.y);
  if (remaining <= speed) {
    this.setVisualExplorePos(step.mode, step.to);
    this.completeExploreStep(step);
    return;
  }
  this.setVisualExplorePos(step.mode, { x: pos.x + step.dir.x * speed, y: pos.y + step.dir.y * speed });
}

export function currentExploreTile(this: CrystalOathSceneContext, mode: ExploreMode): Vec {
  if (mode === "world") return { ...this.worldPos };
  if (mode === "town") return { ...this.townPos };
  return { ...this.dungeonPos };
}

export function setCurrentExploreTile(this: CrystalOathSceneContext, mode: ExploreMode, tile: Vec) {
  const next = { ...tile };
  if (mode === "world") this.worldPos = next;
  else if (mode === "town") this.townPos = next;
  else this.dungeonPos = next;
}

export function canOccupyExploreTile(this: CrystalOathSceneContext, mode: ExploreMode, x: number, y: number): boolean {
  if (mode === "world") {
    if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return false;
    if (this.generatedWorld) return isWorldPositionWalkable(this.generatedWorld, x, y);
    return this.canEnterTerrain(this.world[y][x]) || !!this.locationAt(x, y);
  }
  if (mode === "town") return x >= 1 && x <= 19 && y >= 1 && y <= 13;
  const floor = this.dungeonFloorRows(this.currentDungeon, this.dungeonFloor);
  const tile = floor[y]?.[x] ?? "#";
  return this.isDungeonTileWalkable(this.currentDungeon, tile);
}

export function dungeonFloorRows(this: CrystalOathSceneContext, dungeonId = this.currentDungeon, floorIndex = this.dungeonFloor): string[] {
  const dungeon = this.dungeons()[dungeonId];
  if (!dungeon) return [];
  const clampedFloor = Math.max(0, Math.min(floorIndex, dungeon.floors.length - 1));
  return dungeon.floors[clampedFloor] ?? [];
}

export function isDungeonTileWalkable(this: CrystalOathSceneContext, dungeonId: string, tile?: string): boolean {
  return !!tile && tile !== "#" && !(tile === "D" && !this.puzzleFlags.has(`${dungeonId}-switch`));
}

export function findDungeonTilePosition(this: CrystalOathSceneContext, floor: string[], values: string[]): Vec | undefined {
  for (let y = 0; y < floor.length; y += 1) {
    for (let x = 0; x < floor[y].length; x += 1) {
      if (values.includes(floor[y][x])) return { x, y };
    }
  }
  return undefined;
}

export function nearestDungeonWalkableTile(this: CrystalOathSceneContext, dungeonId: string, floor: string[], target: Vec): Vec {
  const width = floor[0]?.length ?? 0;
  const height = floor.length;
  const queue = [target];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (current.x >= 0 && current.y >= 0 && current.x < width && current.y < height) {
      const tile = floor[current.y]?.[current.x];
      if (this.isDungeonTileWalkable(dungeonId, tile)) return current;
      queue.push({ x: current.x + 1, y: current.y });
      queue.push({ x: current.x - 1, y: current.y });
      queue.push({ x: current.x, y: current.y + 1 });
      queue.push({ x: current.x, y: current.y - 1 });
    }
  }
  return { x: 1, y: 1 };
}

export function dungeonMarkerSpawn(this: CrystalOathSceneContext, dungeonId: string, floorIndex: number, markerTiles: string[], fallback: Vec): Vec {
  const floor = this.dungeonFloorRows(dungeonId, floorIndex);
  const marker = this.findDungeonTilePosition(floor, markerTiles) ?? fallback;
  return this.nearestDungeonWalkableTile(dungeonId, floor, marker);
}

export function dungeonEntranceSpawn(this: CrystalOathSceneContext, dungeonId: string): Vec {
  return this.dungeonMarkerSpawn(dungeonId, 0, ["E"], { x: 1, y: 1 });
}

export function dungeonStairSpawn(this: CrystalOathSceneContext, dungeonId: string, floorIndex: number): Vec {
  return this.dungeonMarkerSpawn(dungeonId, floorIndex, ["S"], floorIndex === 0 ? { x: 19, y: 12 } : { x: 2, y: 12 });
}

export function ensureValidDungeonPosition(this: CrystalOathSceneContext) {
  const dungeon = this.dungeons()[this.currentDungeon];
  if (!dungeon) {
    this.currentDungeon = "mossCave";
    this.dungeonFloor = 0;
    this.dungeonPos = this.dungeonEntranceSpawn(this.currentDungeon);
    return;
  }
  this.dungeonFloor = Math.max(0, Math.min(this.dungeonFloor, dungeon.floors.length - 1));
  if (!this.canOccupyExploreTile("dungeon", this.dungeonPos.x, this.dungeonPos.y)) {
    this.dungeonPos = this.dungeonFloor === 0 ? this.dungeonEntranceSpawn(this.currentDungeon) : this.dungeonStairSpawn(this.currentDungeon, this.dungeonFloor);
  }
}

export function completeExploreStep(this: CrystalOathSceneContext, step: ExploreStep) {
  if (!this.isExploreMode(this.mode) || this.mode !== step.mode) {
    this.activeStep = undefined;
    return;
  }
  this.setCurrentExploreTile(step.mode, step.to);
  this.activeStep = undefined;
  this.lastStepFrame += 1;
  this.handleCompletedExploreTile(step.mode, step.to, step.dir);
}

export function handleCompletedExploreTile(this: CrystalOathSceneContext, mode: ExploreMode, tile: Vec, dir: Vec) {
  if (!this.isExploreMode(this.mode) || this.mode !== mode) return;
  if (mode === "world") {
    this.applyWalkPoison();
    this.syncCurrentIslandFromWorldPos();
    const loc = this.locationAt(tile.x, tile.y);
    if (loc) this.activateWorldLocation(loc);
    else this.maybeEncounter();
    return;
  }
  if (mode === "town") {
    if (dir.y > 0 && this.isTownExitTile(tile)) this.exitTownToWorld();
    return;
  }
  const dungeon = this.dungeons()[this.currentDungeon];
  const floor = dungeon.floors[this.dungeonFloor];
  const dungeonTile = floor[tile.y]?.[tile.x] ?? "#";
  this.applyWalkPoison();
  if (dungeonTile === "E") {
    this.clearHeldMovement();
    this.mode = "world";
    this.syncAllVisualPositions();
    this.audio.setMode("world");
    return;
  }
  if (dungeonTile === "S") {
    this.clearHeldMovement();
    this.dungeonFloor = this.dungeonFloor === 0 ? 1 : 0;
    this.dungeonPos = this.dungeonStairSpawn(this.currentDungeon, this.dungeonFloor);
    this.syncAllVisualPositions();
    return;
  }
  if (dungeonTile === "B") {
    this.startBossBattle(dungeon);
    return;
  }
  if (dungeonTile === "C" || dungeonTile === "K") {
    this.interact();
    return;
  }
  this.maybeDungeonEncounter(dungeon);
}

export function setVisualExplorePos(this: CrystalOathSceneContext, mode: ExploreMode, pos: Vec) {
  const next = { ...pos };
  if (mode === "world") this.visualWorldPos = next;
  else if (mode === "town") this.visualTownPos = next;
  else this.visualDungeonPos = next;
}

export function syncAllVisualPositions(this: CrystalOathSceneContext) {
  this.activeStep = undefined;
  this.visualWorldPos = { ...this.worldPos };
  this.visualTownPos = { ...this.townPos };
  this.visualDungeonPos = { ...this.dungeonPos };
}

export function visualExplorePos(this: CrystalOathSceneContext, mode: ExploreMode): Vec {
  if (mode === "world") return { ...this.visualWorldPos };
  if (mode === "town") return { ...this.visualTownPos };
  return { ...this.visualDungeonPos };
}

export function isTownExitTile(this: CrystalOathSceneContext, tile: Vec): boolean {
  return tile.y >= 13 && tile.x >= 9 && tile.x <= 11;
}

export function exitTownToWorld(this: CrystalOathSceneContext) {
  this.clearHeldMovement();
  const loc = this.locations().find((candidate) => candidate.id === this.currentTown);
  if (loc) {
    this.worldPos = this.worldReturnTileForLocation(loc);
  }
  this.mode = "world";
  this.syncAllVisualPositions();
  this.audio.setMode("world");
  this.saveGame();
  this.markDirty();
}

export function interact(this: CrystalOathSceneContext) {
  if (this.mode === "world") {
    const loc = this.locationAt(this.worldPos.x, this.worldPos.y) ?? this.facingLocation();
    if (loc) {
      this.activateWorldLocation(loc);
    }
    return;
  }
  if (this.mode === "town") {
    this.interactTown();
    return;
  }
  if (this.mode === "dungeon") {
    this.interactDungeon();
  }
}

export function worldReturnTileForLocation(this: CrystalOathSceneContext, loc: LocationDef): Vec {
  const bounds = this.locationFootprintBounds(loc);
  const centerX = Math.floor((bounds.minX + bounds.maxX) / 2);
  const centerY = Math.floor((bounds.minY + bounds.maxY) / 2);
  const candidates: Vec[] = [
    { x: centerX, y: bounds.maxY + 1 },
    { x: bounds.minX, y: bounds.maxY + 1 },
    { x: bounds.maxX, y: bounds.maxY + 1 },
    { x: bounds.minX - 1, y: centerY },
    { x: bounds.maxX + 1, y: centerY },
    { x: centerX, y: bounds.minY - 1 }
  ];
  for (const candidate of candidates) {
    if (this.canOccupyExploreTile("world", candidate.x, candidate.y)) return candidate;
  }
  for (let searchRadius = 1; searchRadius <= 5; searchRadius += 1) {
    for (let y = bounds.minY - searchRadius; y <= bounds.maxY + searchRadius; y += 1) {
      for (let x = bounds.minX - searchRadius; x <= bounds.maxX + searchRadius; x += 1) {
        const outsideRing = x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY;
        if (!outsideRing) continue;
        if (x > bounds.minX - searchRadius && x < bounds.maxX + searchRadius && y > bounds.minY - searchRadius && y < bounds.maxY + searchRadius) continue;
        if (this.canOccupyExploreTile("world", x, y)) return { x, y };
      }
    }
  }
  return { x: loc.x, y: loc.y };
}

export function interactTown(this: CrystalOathSceneContext) {
  const town = this.towns()[this.currentTown];
  const p = this.townPos;
  const facing = { x: p.x + this.lastMoveDir.x, y: p.y + this.lastMoveDir.y };
  const facedNpc = town.npcs.find((npc) => npc.x === facing.x && npc.y === facing.y);
  if (facedNpc) {
    this.say(facedNpc.lines);
    return;
  }
  for (const npc of town.npcs) {
    if (Math.abs(npc.x - p.x) + Math.abs(npc.y - p.y) <= 1) {
      this.say(npc.lines);
      return;
    }
  }
  const service = this.serviceAt(facing.x, facing.y) ?? this.serviceAt(p.x, p.y);
  if (service === "inn") this.openInn(town);
  else if (service === "clinic") this.openClinic(town);
  else if (service === "item") this.openShop(`${town.name} Item Shop`, town.itemStock.map((id) => ({ id, type: "item" as const })));
  else if (service === "arms") {
    const stock = [
      ...town.weaponStock.map((id) => ({ id, type: "gear" as const })),
      ...town.armorStock.map((id) => ({ id, type: "gear" as const }))
    ];
    this.openShop(`${town.name} Arms`, stock);
  } else if (service === "magic") this.openMagicShop(town);
  else this.say([`${town.name}: The road waits outside the south gate.`]);
}

export function interactDungeon(this: CrystalOathSceneContext) {
  const dungeon = this.dungeons()[this.currentDungeon];
  const tile = dungeon.floors[this.dungeonFloor][this.dungeonPos.y]?.[this.dungeonPos.x];
  if (tile === "K") {
    this.puzzleFlags.add(`${this.currentDungeon}-switch`);
    this.say([dungeon.puzzleText]);
    return;
  }
  if (tile === "C") {
    this.openDungeonChest(dungeon);
    return;
  }
  if (tile === "D" && !this.puzzleFlags.has(`${this.currentDungeon}-switch`)) {
    this.say(["The sealed door will not move. A switch must feed it power."]);
    return;
  }
  this.say([`${dungeon.name}: The air is heavy with old danger.`]);
}

export function enterLocation(this: CrystalOathSceneContext, loc: LocationDef) {
  this.clearHeldMovement();
  if (loc.islandId) this.currentIslandId = loc.islandId;
  if (loc.kind === "harbor" || loc.kind === "landmark") {
    this.interactWorldLocation(loc);
    return;
  }
  if (loc.requires && !loc.requires()) {
    this.say([loc.lockedText ?? "A strange force blocks the way."]);
    return;
  }
  if (loc.kind === "gate") {
    this.currentTown = "starfallGate";
    this.townPos = { x: 10, y: 12 };
    this.mode = "town";
    this.syncAllVisualPositions();
    this.audio.setMode("world");
    this.towns().starfallGate.arrival?.();
    this.saveGame();
    return;
  }
  if (loc.kind === "town") {
    this.currentTown = loc.id;
    this.townPos = { x: 10, y: 12 };
    this.mode = "town";
    this.syncAllVisualPositions();
    this.audio.setMode("world");
    this.towns()[loc.id].arrival?.();
    this.saveGame();
    return;
  }
  this.currentDungeon = loc.id;
  this.dungeonFloor = 0;
  this.dungeonPos = this.dungeonEntranceSpawn(this.currentDungeon);
  this.mode = "dungeon";
  this.syncAllVisualPositions();
  this.audio.setMode("dungeon");
  this.encounterCounter = 7;
  this.saveGame();
}

export function openDungeonChest(this: CrystalOathSceneContext, dungeon: DungeonDef) {
  const chestIndex = this.countDungeonChestAtCurrentOrNearest(dungeon);
  const reward = dungeon.chestRewards[chestIndex % dungeon.chestRewards.length];
  const chestId = `${dungeon.id}-${this.dungeonFloor}-${this.dungeonPos.x}-${this.dungeonPos.y}-${reward.id}`;
  if (this.openedChests.has(chestId)) {
    this.say(["The chest is empty."]);
    return;
  }
  this.openedChests.add(chestId);
  if (reward.item) {
    this.inventory[reward.item] = (this.inventory[reward.item] ?? 0) + 1;
    this.say([`Found ${ITEMS[reward.item].name}!`]);
  } else if (reward.gear) {
    this.gearBag[reward.gear] = (this.gearBag[reward.gear] ?? 0) + 1;
    this.say([`Found ${GEAR[reward.gear].name}!`]);
  } else if (reward.gold) {
    this.gold += reward.gold;
    this.say([`Found ${reward.gold} gold!`]);
  }
}

export function countDungeonChestAtCurrentOrNearest(this: CrystalOathSceneContext, dungeon: DungeonDef): number {
  let count = 0;
  for (let f = 0; f <= this.dungeonFloor; f += 1) {
    const floor = dungeon.floors[f];
    for (let y = 0; y < floor.length; y += 1) {
      for (let x = 0; x < floor[y].length; x += 1) {
        if (floor[y][x] === "C") {
          if (f === this.dungeonFloor && x === this.dungeonPos.x && y === this.dungeonPos.y) return count;
          count += 1;
        }
      }
    }
  }
  return count;
}

export function locationFootprint(this: CrystalOathSceneContext, loc: LocationDef): number {
  return loc.footprint ?? LANDMARK_FOOTPRINT;
}

export function locationFootprintBounds(this: CrystalOathSceneContext, loc: LocationDef): { minX: number; maxX: number; minY: number; maxY: number } {
  const footprint = this.locationFootprint(loc);
  const offset = Math.floor((footprint - 1) / 2);
  const minX = loc.x - offset;
  const minY = loc.y - offset;
  return { minX, minY, maxX: minX + footprint - 1, maxY: minY + footprint - 1 };
}

export function locationContainsTile(this: CrystalOathSceneContext, loc: LocationDef, x: number, y: number): boolean {
  const bounds = this.locationFootprintBounds(loc);
  return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}

export function locationAt(this: CrystalOathSceneContext, x: number, y: number): LocationDef | undefined {
  return this.locations().find((loc) => this.locationContainsTile(loc, x, y));
}

export function facingLocation(this: CrystalOathSceneContext): LocationDef | undefined {
  return this.locationAt(this.worldPos.x + this.lastMoveDir.x, this.worldPos.y + this.lastMoveDir.y);
}

export function activateWorldLocation(this: CrystalOathSceneContext, loc: LocationDef) {
  if (loc.kind === "harbor" || loc.kind === "landmark") this.interactWorldLocation(loc);
  else this.enterLocation(loc);
}

export function canEnterTerrain(this: CrystalOathSceneContext, terrain: Terrain): boolean {
  return isWorldTileWalkable(terrain);
}

export function terrainEncounterKey(this: CrystalOathSceneContext, terrain: Terrain): keyof typeof WORLD_TABLES | undefined {
  if (worldTileHasTag(terrain, "road") || worldTileHasTag(terrain, "bridge")) return undefined;
  return worldTileEncounterFamily(terrain) as keyof typeof WORLD_TABLES | undefined;
}

export function worldEncounterKeyAt(this: CrystalOathSceneContext, x: number, y: number): keyof typeof WORLD_TABLES | undefined {
  const terrain = this.world[y]?.[x];
  if (!terrain || this.isRoadAt(x, y)) return undefined;
  const islandId = this.generatedWorld?.islandByTile[y]?.[x] ?? this.currentIslandId;
  const biome = this.generatedWorld?.biomes[y]?.[x];
  if (biome === "forest") return islandId === "coralreach" ? "forest" : "forest";
  if (islandId === "highspire" && (biome === "darkland" || biome === "lava" || biome === "mountain")) return "final";
  if (islandId === "frostmere" && (biome === "snow" || biome === "mountain")) return "hills";
  if (islandId === "coralreach" && biome === "desert") return "sand";
  return this.terrainEncounterKey(terrain);
}

export function isRoadAt(this: CrystalOathSceneContext, x: number, y: number): boolean {
  return !!this.generatedWorld?.roads.some((road) => road.x === x && road.y === y);
}

export function syncCurrentIslandFromWorldPos(this: CrystalOathSceneContext) {
  const island = this.generatedWorld ? getIslandAt(this.generatedWorld, this.worldPos.x, this.worldPos.y) : undefined;
  if (island) this.currentIslandId = island.id;
}

export function currentIslandName(this: CrystalOathSceneContext): string {
  return this.generatedWorld?.islands.find((island) => island.id === this.currentIslandId)?.name ?? "Open Sea";
}

export function currentIslandTheme(this: CrystalOathSceneContext): IslandTheme | undefined {
  return this.generatedWorld?.islands.find((island) => island.id === this.currentIslandId)?.theme;
}

export function interactWorldLocation(this: CrystalOathSceneContext, loc: LocationDef) {
  if (loc.islandId) this.currentIslandId = loc.islandId;
  if (loc.kind === "harbor") {
    this.openHarborMenu(loc);
    return;
  }
  if (loc.kind === "landmark") this.discoverLandmark(loc);
}

export function openHarborMenu(this: CrystalOathSceneContext, loc: LocationDef) {
  this.rememberMenuReturnMode();
  const options: MenuOption[] = this.getAvailableDestinations(loc.islandId ?? this.currentIslandId).map((destination) => ({
    label: () => {
      const locked = this.isDestinationLocked(destination);
      return `${destination.displayName} - ${destination.costGold}g${locked ? " (locked)" : ""}`;
    },
    action: () => {
      if (this.isDestinationLocked(destination)) {
        this.flashMessage("The Harbor Master needs a proper chart for that route.");
        return;
      }
      this.travelToIsland(destination);
    }
  }));
  options.push({ label: "Leave harbor", action: () => this.closeMenuTo("world") });
  this.openMenu(`${loc.name}`, options, () => this.closeMenuTo("world"), () => `Gold ${this.gold} | Seed ${this.worldSeed}`);
}

export function getAvailableDestinations(this: CrystalOathSceneContext, currentIslandId: IslandId): TravelDestination[] {
  if (currentIslandId === "greenhaven") {
    return [
      { destinationIslandId: "coralreach", displayName: "Coralreach", costGold: 10, requiredUnlockFlag: "unlockedIsland2" },
      { destinationIslandId: "highspire", displayName: "Highspire", costGold: 18, requiredUnlockFlag: "unlockedHighspire" }
    ];
  }
  if (currentIslandId === "coralreach") {
    return [
      { destinationIslandId: "greenhaven", displayName: "Greenhaven", costGold: 10 },
      { destinationIslandId: "frostmere", displayName: "Frostmere", costGold: 14, requiredUnlockFlag: "unlockedFrostmere" },
      { destinationIslandId: "highspire", displayName: "Highspire", costGold: 18, requiredUnlockFlag: "unlockedHighspire" }
    ];
  }
  if (currentIslandId === "frostmere") {
    return [
      { destinationIslandId: "coralreach", displayName: "Coralreach", costGold: 14 },
      { destinationIslandId: "highspire", displayName: "Highspire", costGold: 18, requiredUnlockFlag: "unlockedHighspire" },
      { destinationIslandId: "greenhaven", displayName: "Greenhaven", costGold: 14 }
    ];
  }
  return [
    { destinationIslandId: "frostmere", displayName: "Frostmere", costGold: 18 },
    { destinationIslandId: "coralreach", displayName: "Coralreach", costGold: 18 },
    { destinationIslandId: "greenhaven", displayName: "Greenhaven", costGold: 18 }
  ];
}

export function isDestinationLocked(this: CrystalOathSceneContext, destination: TravelDestination): boolean {
  if (!destination.requiredUnlockFlag) return false;
  return !this.flags.travel[destination.requiredUnlockFlag];
}

export function travelToIsland(this: CrystalOathSceneContext, destination: TravelDestination) {
  if (this.gold < destination.costGold) {
    this.flashMessage(`You need ${destination.costGold} gold for passage.`);
    return;
  }
  this.gold -= destination.costGold;
  this.flags.boat = true;
  if (destination.destinationIslandId === "coralreach") this.flags.travel.visitedIsland2 = true;
  if (destination.destinationIslandId === "frostmere") this.flags.travel.visitedFrostmere = true;
  if (destination.destinationIslandId === "highspire") {
    this.flags.travel.visitedIsland3 = true;
    this.flags.travel.visitedHighspire = true;
  }
  this.currentIslandId = destination.destinationIslandId;
  this.worldPos = this.arrivalTileForIsland(destination.destinationIslandId);
  this.mode = "world";
  this.menu = undefined;
  this.syncAllVisualPositions();
  this.audio.setMode("world");
  this.saveGame();
  this.say([`You board the boat and sail across the glittering sea to ${destination.displayName}.`], () => {
    this.mode = "world";
    this.audio.setMode("world");
  });
}

export function arrivalTileForIsland(this: CrystalOathSceneContext, islandId: IslandId): Vec {
  const island = this.generatedWorld?.islands.find((candidate) => candidate.id === islandId);
  const harbor = island?.harborPosition;
  if (!harbor) return this.generatedWorld?.startPosition ?? { x: 10, y: 22 };
  const harborLoc = this.locations().find((loc) => loc.islandId === islandId && loc.kind === "harbor");
  const bounds = harborLoc ? this.locationFootprintBounds(harborLoc) : { minX: harbor.x, maxX: harbor.x, minY: harbor.y, maxY: harbor.y };
  const centerX = Math.floor((bounds.minX + bounds.maxX) / 2);
  const centerY = Math.floor((bounds.minY + bounds.maxY) / 2);
  const candidates = [
    { x: centerX, y: bounds.maxY + 1 },
    { x: bounds.minX - 1, y: centerY },
    { x: bounds.maxX + 1, y: centerY },
    { x: centerX, y: bounds.minY - 1 }
  ];
  return candidates.find((pos) => this.canOccupyExploreTile("world", pos.x, pos.y)) ?? harbor;
}

export function discoverLandmark(this: CrystalOathSceneContext, loc: LocationDef) {
  const landmarkKind = loc.landmarkKind ?? "ruins";
  if (this.discoveredPois.has(loc.id)) {
    if (landmarkKind === "secretMerchant") {
      this.openShop(`${loc.name}`, [
        { id: "potion", type: "item" },
        { id: "phoenixAsh", type: "item" },
        { id: "etherleaf", type: "item" },
        { id: "smokeBomb", type: "item" },
        { id: "glassWand", type: "gear" }
      ]);
    }
    return;
  }
  this.discoveredPois.add(loc.id);
  const tier = loc.difficultyTier ?? 1;
  const rewardGold = 10 + tier * 8;
  if (landmarkKind === "shipwreck") {
    this.gold += rewardGold;
    this.saveGame();
    if (Phaser.Math.Between(1, 100) <= 35) {
      this.say([`The shipwreck yields ${rewardGold} gold, but something coils beneath the planks.`], () => this.startRandomBattle(["reefCrab", "seaSerpent"], undefined));
    } else this.say([`You search the shipwreck and recover ${rewardGold} gold.`]);
    return;
  }
  if (landmarkKind === "shrine") {
    for (const member of this.party) if (member.hp > 0) member.hp = Math.min(member.maxHp, member.hp + Math.floor(member.maxHp * 0.4));
    this.saveGame();
    this.say([`${loc.name} glows softly. The party's wounds close.`]);
    return;
  }
  if (landmarkKind === "hiddenChest") {
    this.gold += rewardGold;
    this.inventory.etherleaf = (this.inventory.etherleaf ?? 0) + 1;
    this.saveGame();
    this.say([`A hidden cache snaps open. Found ${rewardGold} gold and Etherleaf.`]);
    return;
  }
  if (landmarkKind === "monsterNest") {
    this.gold += Math.floor(rewardGold / 2);
    this.saveGame();
    this.say([`${loc.name} stirs. Clearing it should make the island safer.`], () => this.startRandomBattle(this.currentIslandId === "highspire" ? ["ashGolem", "coalKnight"] : ["greenWolf", "bandit"], undefined));
    return;
  }
  if (landmarkKind === "secretMerchant") {
    this.openShop(`${loc.name}`, [
      { id: "potion", type: "item" },
      { id: "phoenixAsh", type: "item" },
      { id: "etherleaf", type: "item" },
      { id: "smokeBomb", type: "item" },
      { id: "glassWand", type: "gear" }
    ]);
    return;
  }
  if (landmarkKind === "resourceNode") {
    this.gearBag.ringMail = (this.gearBag.ringMail ?? 0) + 1;
    this.saveGame();
    this.say([`You mine glittering ore and shape it into usable Ring Mail.`]);
    return;
  }
  if (landmarkKind === "ancientDoor") {
    this.saveGame();
    this.say([this.hasAllRelics() ? "The ancient door hums with fourfold light, pointing toward Starfall Gate." : "The ancient door waits for four relic lights."]);
    return;
  }
  this.gold += rewardGold;
  this.saveGame();
  this.say([`${loc.name} whispers old island lore. Found ${rewardGold} gold among the stones.`]);
}

export function maybeEncounter(this: CrystalOathSceneContext) {
  if (!this.settings.encounters) return;
  const tableKey = this.worldEncounterKeyAt(this.worldPos.x, this.worldPos.y);
  if (!tableKey) return;
  this.encounterCounter -= tableKey === "forest" || tableKey === "hills" || tableKey === "final" ? 2 : 1;
  if (this.encounterCounter <= 0) {
    this.encounterCounter = Phaser.Math.Between(7, 15);
    this.startRandomBattle(WORLD_TABLES[tableKey]);
  }
}

export function maybeDungeonEncounter(this: CrystalOathSceneContext, dungeon: DungeonDef) {
  if (!this.settings.encounters) return;
  this.encounterCounter -= 1;
  if (this.encounterCounter <= 0) {
    this.encounterCounter = Phaser.Math.Between(6, 12);
    this.startRandomBattle(dungeon.encounterTable, dungeon.id);
  }
}
