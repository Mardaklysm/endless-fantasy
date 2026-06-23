import { FAST_MOVE_TILES_PER_MS, HEIGHT, MOVE_TILES_PER_MS, TILE, WIDTH } from "../../app/config";
import { getPoiMetadata, poiIdForWorldLocation as poiIdForLocation, type PoiAction, type PoiExitZone, type PoiInteraction, type PoiMetadata, type PoiRectZone, type PoiTriggerShape } from "../../data/poiMetadata";
import type { TownDef } from "../../data/gameDataTypes";
import type { ExploreMode, Vec } from "../../scene/sceneTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

const POI_EXIT_REARM_MARGIN = 54;

export interface PoiVisitReturn {
  mode: ExploreMode;
  locationId?: string;
  position?: Vec;
}

export function currentPoi(this: CrystalOathSceneContext): PoiMetadata | undefined {
  return this.currentPoiId ? getPoiMetadata(this.currentPoiId) : undefined;
}

export function poiIdForWorldLocation(this: CrystalOathSceneContext, locationId: string): string | undefined {
  return poiIdForLocation(locationId);
}

export function enterPoiVisit(this: CrystalOathSceneContext, poiId: string, returnState?: PoiVisitReturn) {
  const poi = getPoiMetadata(poiId);
  if (!poi) {
    this.say([`Unknown point of interest: ${poiId}`]);
    return;
  }
  this.clearHeldMovement();
  this.currentPoiId = poi.id;
  this.poiPos = { x: poi.spawn.x, y: poi.spawn.y };
  this.visualPoiPos = { ...this.poiPos };
  const currentMode = this.mode;
  const fallbackReturnMode: ExploreMode =
    currentMode === "world" || currentMode === "town" || currentMode === "poi" || currentMode === "dungeon" ? currentMode : "world";
  this.poiReturn = returnState ?? { mode: fallbackReturnMode };
  this.suppressedPoiExitIds = new Set();
  this.lastMoveDir = facingToVector(poi.spawn.facing);
  this.mode = "poi";
  this.previousMode = "poi";
  this.audio.setMode("world");
  this.markDirty();
}

export function poiStepSize(this: CrystalOathSceneContext): number {
  return this.currentPoi()?.movement.stepSize ?? 32;
}

export function poiUnitsPerMs(this: CrystalOathSceneContext, fast: boolean): number {
  const scale = Math.max(0.01, this.poiRenderScale());
  return (TILE / scale) * (fast ? FAST_MOVE_TILES_PER_MS : MOVE_TILES_PER_MS);
}

export function poiRenderScale(this: CrystalOathSceneContext): number {
  const poi = this.currentPoi();
  if (!poi) return 1;
  return Math.min(WIDTH / poi.background.width, HEIGHT / poi.background.height);
}

export function poiRenderLayout(this: CrystalOathSceneContext, poi: PoiMetadata) {
  const scale = Math.min(WIDTH / poi.background.width, HEIGHT / poi.background.height);
  const width = poi.background.width * scale;
  const height = poi.background.height * scale;
  return {
    x: Math.floor((WIDTH - width) / 2),
    y: Math.floor((HEIGHT - height) / 2),
    width,
    height,
    scale
  };
}

export function poiToScreen(this: CrystalOathSceneContext, point: Vec): Vec {
  const poi = this.currentPoi();
  if (!poi) return { ...point };
  const layout = this.poiRenderLayout(poi);
  return {
    x: layout.x + point.x * layout.scale,
    y: layout.y + point.y * layout.scale
  };
}

export function canOccupyPoiPoint(this: CrystalOathSceneContext, x: number, y: number): boolean {
  const poi = this.currentPoi();
  if (!poi) return false;
  if (x < 0 || y < 0 || x > poi.background.width || y > poi.background.height) return false;
  if (!poi.collision.walkableZones.some((zone) => pointInRect({ x, y }, zone))) return false;
  return !poi.collision.solidZones.some((zone) => pointInRect({ x, y }, zone));
}

export function activePoiInteraction(this: CrystalOathSceneContext): PoiInteraction | undefined {
  const poi = this.currentPoi();
  if (!poi) return undefined;
  return poi.interactions
    .map((interaction, index) => ({
      interaction,
      index,
      distance: distanceToShape(this.poiPos, interaction.shape),
      active: pointInShape(this.poiPos, interaction.shape)
    }))
    .filter((candidate) => candidate.active)
    .sort((a, b) => (b.interaction.priority ?? 0) - (a.interaction.priority ?? 0) || a.distance - b.distance || a.index - b.index)[0]?.interaction;
}

export function interactPoi(this: CrystalOathSceneContext) {
  const interaction = this.activePoiInteraction();
  if (!interaction) {
    this.audio.blip("error");
    return;
  }
  this.activatePoiAction(interaction.action, interaction.label);
}

export function activatePoiAction(this: CrystalOathSceneContext, action: PoiAction, label: string) {
  if (action.kind === "openShop") {
    const town = this.poiServiceTown(action.townId);
    if (!town) {
      this.say([`${label}: Shop stock is not configured yet.`]);
      return;
    }
    if (action.shopId === "weapons") {
      this.openShop(`${town.name} Weapons`, town.weaponStock.map((id) => ({ id, type: "gear" as const })));
      return;
    }
    if (action.shopId === "armor") {
      this.openShop(`${town.name} Armor`, town.armorStock.map((id) => ({ id, type: "gear" as const })));
      return;
    }
    if (action.shopId === "items") {
      this.openShop(`${town.name} Items`, town.itemStock.map((id) => ({ id, type: "item" as const })));
      return;
    }
    this.say([`${label}: This shop type is ready for metadata, but its stock hook is still TODO.`]);
    return;
  }
  if (action.kind === "openInn") {
    const town = this.poiServiceTown(action.townId);
    if (town) this.openInn(town);
    else this.say([`${label}: Inn service is not configured yet.`]);
    return;
  }
  if (action.kind === "openChurch") {
    const town = this.poiServiceTown(action.townId);
    if (town) this.openPoiChurch(town);
    else this.say([`${label}: Church service is not configured yet.`]);
    return;
  }
  if (action.kind === "openDialog" || action.kind === "inspect") {
    this.say(action.lines);
    return;
  }
  if (action.kind === "returnToOverworld") {
    this.leavePoiVisit();
    return;
  }
  if (action.kind === "transitionToPoi") {
    this.enterPoiVisit(action.poiId, { mode: "poi", locationId: this.poiReturn?.locationId, position: this.poiPos });
    return;
  }
  if (action.kind === "startDungeon") {
    this.say([`${label}: Dungeon transition hook for ${action.dungeonId} is TODO.`]);
    return;
  }
  this.say([`${label}: Event hook ${action.eventId} is TODO.`]);
}

export function poiServiceTown(this: CrystalOathSceneContext, townId?: string): TownDef | undefined {
  const poi = this.currentPoi();
  const id = townId ?? poi?.serviceTownId ?? this.currentTown;
  return this.towns()[id];
}

export function openPoiChurch(this: CrystalOathSceneContext, town: TownDef) {
  const returnMode = this.serviceReturnMode();
  const revivePrice = town.clinicPrice;
  const blessingPrice = Math.max(1, Math.floor(town.clinicPrice / 2));
  this.openMenu(
    `${town.name} Church`,
    [
      {
        label: `Revive and cleanse (${revivePrice} gold)`,
        action: () => {
          const needsAid = this.party.some((member) => member.hp <= 0 || member.statuses.poison || member.statuses.sleep);
          if (!needsAid) {
            this.flashMessage("The party is already steady.");
            return;
          }
          if (this.gold < revivePrice) {
            this.flashMessage("Not enough gold.");
            return;
          }
          this.gold -= revivePrice;
          for (const member of this.party) {
            if (member.hp <= 0) member.hp = Math.floor(member.maxHp * 0.5);
            delete member.statuses.poison;
            delete member.statuses.sleep;
          }
          this.saveGame();
          this.say(["A quiet bell rings. Fallen allies rise, and lingering ailments fade."], () => this.closeMenuTo(returnMode));
        }
      },
      {
        label: `Receive blessing (${blessingPrice} gold)`,
        action: () => {
          if (this.gold < blessingPrice) {
            this.flashMessage("Not enough gold.");
            return;
          }
          this.gold -= blessingPrice;
          for (const member of this.party) {
            if (member.hp > 0) member.hp = Math.min(member.maxHp, member.hp + Math.floor(member.maxHp * 0.35));
          }
          this.saveGame();
          this.say(["Warm candlelight settles over the party. HP is partly restored."], () => this.closeMenuTo(returnMode));
        }
      },
      { label: "Leave", action: () => this.closeMenuTo(returnMode) }
    ],
    () => this.closeMenuTo(returnMode),
    "TODO: story-specific blessings and church events can attach here."
  );
}

export function handlePoiStepComplete(this: CrystalOathSceneContext, tile: Vec) {
  this.rearmSuppressedPoiExits(tile);
  const exit = this.poiExitAt(tile);
  if (!exit || this.suppressedPoiExitIds.has(exit.id)) return;
  this.openPoiExitConfirmation(exit);
}

export function poiExitAt(this: CrystalOathSceneContext, point: Vec): PoiExitZone | undefined {
  return this.currentPoi()?.exits.find((exit) => pointInRect(point, exit));
}

export function rearmSuppressedPoiExits(this: CrystalOathSceneContext, point: Vec) {
  const poi = this.currentPoi();
  if (!poi || this.suppressedPoiExitIds.size === 0) return;
  for (const exit of poi.exits) {
    if (!this.suppressedPoiExitIds.has(exit.id)) continue;
    if (!pointInInflatedRect(point, exit, POI_EXIT_REARM_MARGIN)) this.suppressedPoiExitIds.delete(exit.id);
  }
}

export function openPoiExitConfirmation(this: CrystalOathSceneContext, exit: PoiExitZone) {
  this.clearHeldMovement();
  this.openMenu(
    exit.prompt,
    [
      { label: "Yes", action: () => this.followPoiExit(exit) },
      { label: "No", action: () => this.suppressPoiExit(exit.id) }
    ],
    () => this.suppressPoiExit(exit.id),
    exit.label
  );
}

export function suppressPoiExit(this: CrystalOathSceneContext, exitId: string) {
  this.suppressedPoiExitIds.add(exitId);
  this.closeMenuTo("poi");
}

export function followPoiExit(this: CrystalOathSceneContext, exit: PoiExitZone) {
  if (exit.destination.kind === "transitionToPoi") {
    this.enterPoiVisit(exit.destination.poiId, { mode: "poi", locationId: this.poiReturn?.locationId, position: this.poiPos });
    return;
  }
  this.leavePoiVisit();
}

export function leavePoiVisit(this: CrystalOathSceneContext) {
  const returnState = this.poiReturn ?? { mode: "world" as ExploreMode };
  this.clearHeldMovement();
  this.menu = undefined;
  if (returnState.mode === "world") {
    const loc = returnState.locationId ? this.locations().find((candidate) => candidate.id === returnState.locationId) : undefined;
    this.worldPos = returnState.position ? { ...returnState.position } : loc ? this.worldReturnTileForLocation(loc) : this.worldPos;
    this.mode = "world";
    this.syncAllVisualPositions();
    this.syncCurrentIslandFromWorldPos();
    this.prewarmWorldTerrainChunksForCurrentView(1);
    this.audio.setMode("world");
    this.saveGame();
    this.markDirty();
    return;
  }
  this.setCurrentExploreTile(returnState.mode, returnState.position ?? this.currentExploreTile(returnState.mode));
  this.mode = returnState.mode;
  this.syncAllVisualPositions();
  this.saveGame();
  this.markDirty();
}

function facingToVector(facing: "up" | "down" | "left" | "right" | undefined): Vec {
  if (facing === "up") return { x: 0, y: -1 };
  if (facing === "left") return { x: -1, y: 0 };
  if (facing === "right") return { x: 1, y: 0 };
  return { x: 0, y: 1 };
}

function pointInShape(point: Vec, shape: PoiTriggerShape): boolean {
  if (shape.kind === "circle") return distanceSq(point, shape) <= shape.radius * shape.radius;
  return pointInRect(point, { id: "shape", x: shape.x, y: shape.y, width: shape.width, height: shape.height });
}

function distanceToShape(point: Vec, shape: PoiTriggerShape): number {
  if (shape.kind === "circle") return distanceSq(point, shape);
  const closestX = Math.max(shape.x, Math.min(point.x, shape.x + shape.width));
  const closestY = Math.max(shape.y, Math.min(point.y, shape.y + shape.height));
  return distanceSq(point, { x: closestX, y: closestY });
}

function pointInRect(point: Vec, rect: PoiRectZone): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function pointInInflatedRect(point: Vec, rect: PoiRectZone, inflate: number): boolean {
  return point.x >= rect.x - inflate && point.x <= rect.x + rect.width + inflate && point.y >= rect.y - inflate && point.y <= rect.y + rect.height + inflate;
}

function distanceSq(a: Vec, b: Vec): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}
