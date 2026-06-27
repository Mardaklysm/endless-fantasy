import { LANDMARK_FOOTPRINT } from "../../app/config";
import type { LocationDef } from "../../data/gameDataTypes";
import type { Vec } from "../../scene/sceneTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function interact(this: CrystalOathSceneContext) {
  if (this.worldControlLockReason === "boatTravel") return;
  if (this.mode === "world") {
    const loc = this.locationAt(this.worldPos.x, this.worldPos.y) ?? this.facingLocation();
    if (loc) {
      this.activateWorldLocation(loc);
    }
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
    this.enterPoiVisit(poiId, { mode: "world", locationId: loc.id });
    if (newlyVisited) this.saveGame();
    return;
  }
  if (loc.kind === "gate") {
    if (this.hasAllRelics() && !this.flags.gateOpen) {
      this.flags.gateOpen = true;
      this.flags.skyship = true;
      this.say([
        "The four Star Relics rise into a single dawn-colored ring.",
        "A sky-vessel of glass and cedar descends without a sound.",
        "Starfall Gate opens. The Eclipse Spire can now be reached."
      ]);
    } else {
      this.say([loc.name]);
    }
    this.saveGame();
    return;
  }
  if (loc.kind === "town") {
    this.say([`${loc.name}: This settlement is available through authored POI scenes only.`]);
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
  return this.locationByTileKey.get(`${x},${y}`);
}

export function facingLocation(this: CrystalOathSceneContext): LocationDef | undefined {
  return this.locationAt(this.worldPos.x + this.lastMoveDir.x, this.worldPos.y + this.lastMoveDir.y);
}

export function activateWorldLocation(this: CrystalOathSceneContext, loc: LocationDef) {
  if (this.worldControlLockReason === "boatTravel") return;
  if (loc.kind === "harbor" || loc.kind === "landmark") this.interactWorldLocation(loc);
  else this.enterLocation(loc);
}
