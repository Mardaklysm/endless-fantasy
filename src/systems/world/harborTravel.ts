import type { LocationDef, TravelDestination } from "../../data/gameDataTypes";
import type { MenuOption, Vec } from "../../scene/sceneTypes";
import type { IslandId } from "../../world/worldGenerator";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

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
