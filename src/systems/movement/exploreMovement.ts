import { FAST_MOVE_TILES_PER_MS, MOVE_TILES_PER_MS, WORLD_H, WORLD_W } from "../../app/config";
import { isExploreModeValue, type ExploreMode, type ExploreStep, type Vec } from "../../scene/sceneTypes";
import { isWorldPositionWalkable } from "../../world/worldGenerator";
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
  if (this.worldControlLockReason === "boatTravel") {
    this.walkAnimElapsed = 0;
    this.activeStep = undefined;
    return;
  }
  const mode = this.mode;
  if (!isExploreModeValue(mode)) {
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
  if (!this.beginExploreStep(mode, dir)) {
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
  if (this.worldControlLockReason === "boatTravel") return false;
  if (!this.isExploreMode(this.mode)) return false;
  if (this.activeStep) return true;
  const from = this.currentExploreTile(mode);
  if (mode === "town" && dir.y > 0 && this.isTownExitTile(from)) {
    this.exitTownToWorld();
    return true;
  }
  const stepSize = this.exploreStepSize(mode);
  const to = { x: from.x + dir.x * stepSize, y: from.y + dir.y * stepSize };
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
  const speed = this.exploreUnitsPerMs(step.mode, this.shiftHeld) * delta;
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
  if (mode === "poi") return { ...this.poiPos };
  return { ...this.dungeonPos };
}

export function setCurrentExploreTile(this: CrystalOathSceneContext, mode: ExploreMode, tile: Vec) {
  const next = { ...tile };
  if (mode === "world") this.worldPos = next;
  else if (mode === "town") this.townPos = next;
  else if (mode === "poi") this.poiPos = next;
  else this.dungeonPos = next;
}

export function canOccupyExploreTile(this: CrystalOathSceneContext, mode: ExploreMode, x: number, y: number): boolean {
  if (mode === "world") {
    const worldWidth = this.generatedWorld?.width ?? WORLD_W;
    const worldHeight = this.generatedWorld?.height ?? WORLD_H;
    if (x < 0 || y < 0 || x >= worldWidth || y >= worldHeight) return false;
    if (this.generatedWorld) return isWorldPositionWalkable(this.generatedWorld, x, y);
    return this.canEnterTerrain(this.world[y][x]) || !!this.locationAt(x, y);
  }
  if (mode === "town") return x >= 1 && x <= 19 && y >= 1 && y <= 13;
  if (mode === "poi") return this.canOccupyPoiPoint(x, y);
  const floor = this.dungeonFloorRows(this.currentDungeon, this.dungeonFloor);
  const tile = floor[y]?.[x] ?? "#";
  return this.isDungeonTileWalkable(this.currentDungeon, tile);
}

export function completeExploreStep(this: CrystalOathSceneContext, step: ExploreStep) {
  if (!this.isExploreMode(this.mode) || this.mode !== step.mode) {
    this.activeStep = undefined;
    return;
  }
  this.setCurrentExploreTile(step.mode, step.to);
  this.activeStep = undefined;
  this.lastStepFrame += 1;
  if (step.mode === "world") this.advanceWorldTimeTick();
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
  if (mode === "poi") {
    this.handlePoiStepComplete(tile);
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
  else if (mode === "poi") this.visualPoiPos = next;
  else this.visualDungeonPos = next;
}

export function syncAllVisualPositions(this: CrystalOathSceneContext) {
  this.activeStep = undefined;
  this.visualWorldPos = { ...this.worldPos };
  this.visualTownPos = { ...this.townPos };
  this.visualPoiPos = { ...this.poiPos };
  this.visualDungeonPos = { ...this.dungeonPos };
}

export function visualExplorePos(this: CrystalOathSceneContext, mode: ExploreMode): Vec {
  if (mode === "world") return { ...this.visualWorldPos };
  if (mode === "town") return { ...this.visualTownPos };
  if (mode === "poi") return { ...this.visualPoiPos };
  return { ...this.visualDungeonPos };
}

export function exploreStepSize(this: CrystalOathSceneContext, mode: ExploreMode): number {
  if (mode === "poi") return this.poiStepSize();
  return 1;
}

export function exploreUnitsPerMs(this: CrystalOathSceneContext, mode: ExploreMode, fast: boolean): number {
  if (mode === "poi") return this.poiUnitsPerMs(fast);
  return fast ? FAST_MOVE_TILES_PER_MS : MOVE_TILES_PER_MS;
}
