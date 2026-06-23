import { LANDMARK_FOOTPRINT } from "../../app/config";
import type { LocationDef } from "../../data/gameDataTypes";
import { perfStartEnterOverworld } from "../../debug/perf";
import type { Vec } from "../../scene/sceneTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function isTownExitTile(this: CrystalOathSceneContext, tile: Vec): boolean {
  return tile.y >= 13 && tile.x >= 9 && tile.x <= 11;
}

export function exitTownToWorld(this: CrystalOathSceneContext) {
  perfStartEnterOverworld(this, "townExit");
  this.clearHeldMovement();
  const loc = this.locations().find((candidate) => candidate.id === this.currentTown);
  if (loc) {
    this.worldPos = this.worldReturnTileForLocation(loc);
  }
  this.mode = "world";
  this.syncAllVisualPositions();
  this.prewarmWorldTerrainChunksForCurrentView(1);
  this.audio.setMode("world");
  this.saveGame();
  this.markDirty();
}

export function interact(this: CrystalOathSceneContext) {
  if (this.worldControlLockReason === "boatTravel") return;
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
  if (this.mode === "poi") {
    this.interactPoi();
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

export function enterLocation(this: CrystalOathSceneContext, loc: LocationDef) {
  this.clearHeldMovement();
  if (loc.islandId) this.currentIslandId = loc.islandId;
  const newlyVisited = this.markLocationVisited(loc.id);
  if (loc.kind === "harbor" || loc.kind === "landmark") {
    if (newlyVisited) this.saveGame();
    this.interactWorldLocation(loc);
    return;
  }
  if (loc.requires && !loc.requires()) {
    if (newlyVisited) this.saveGame();
    this.say([loc.lockedText ?? "A strange force blocks the way."]);
    return;
  }
  if (loc.kind === "dungeon" || loc.kind === "final") {
    this.enterDungeonLocation(loc, newlyVisited);
    return;
  }
  const poiId = this.poiIdForWorldLocation(loc.id);
  if (poiId) {
    if (loc.kind === "town" || loc.kind === "gate") this.currentTown = loc.id;
    this.enterPoiVisit(poiId, { mode: "world", locationId: loc.id });
    if (newlyVisited) this.saveGame();
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
  this.enterDungeonLocation(loc, newlyVisited);
}

export function enterDungeonLocation(this: CrystalOathSceneContext, loc: LocationDef, newlyVisited = false) {
  const dungeon = this.dungeons()[loc.id];
  if (!dungeon) {
    console.error(`Missing dungeon definition for world location "${loc.id}" (${loc.name}).`);
    if (newlyVisited) this.saveGame();
    this.say([`${loc.name}: The entrance is unstable. Dungeon data is missing.`]);
    return;
  }
  this.clearHeldMovement();
  this.menu = undefined;
  this.dialogue = undefined;
  this.currentDungeon = dungeon.id;
  this.dungeonFloor = 0;
  this.dungeonPos = this.dungeonEntranceSpawn(this.currentDungeon);
  this.mode = "dungeon";
  this.previousMode = "dungeon";
  this.syncAllVisualPositions();
  this.audio.setMode("dungeon");
  this.encounterCounter = 7;
  this.saveGame();
  this.markDirty();
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
  if (this.worldControlLockReason === "boatTravel") return;
  if (loc.kind === "harbor" || loc.kind === "landmark") this.interactWorldLocation(loc);
  else this.enterLocation(loc);
}
