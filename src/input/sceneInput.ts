import Phaser from "phaser";
import {
  HEIGHT,
  PIXEL_ART_SCALE,
  SAVE_KEY,
  TITLE_MENU_ROW_HEIGHT,
  TITLE_MENU_START_Y,
  WIDTH
} from "../app/config";
import {
  directionNameForEvent,
  isCancel,
  isConfirm,
  isDown,
  isLeft,
  isRight,
  isUp,
  keyDirection
} from "./keyboard";
import type { DirectionName, Vec } from "../scene/sceneTypes";
import type { CrystalOathSceneContext } from "../scene/sceneContext";
import { ITEMS } from "../data/items";
import { SPELLS } from "../data/spells";

export function handleKey(this: CrystalOathSceneContext, event: KeyboardEvent) {
  this.audio.start();
  if (this.isGameControlKey(event)) event.preventDefault();
  this.shiftHeld = event.shiftKey || event.code === "ShiftLeft" || event.code === "ShiftRight";
  const directionName = directionNameForEvent(event);
  if (directionName && this.isExploreMode(this.mode) && this.worldControlLockReason !== "boatTravel") {
    this.rememberHeldDirection(directionName);
  }
  if (event.code === "KeyM") {
    this.settings.muted = !this.settings.muted;
    this.audio.setMuted(this.settings.muted);
    this.markDirty();
    return;
  }
  if (event.code === "KeyF") {
    if (this.scale.isFullscreen) this.scale.stopFullscreen();
    else this.scale.startFullscreen();
    return;
  }
  if (this.worldControlLockReason === "boatTravel") return;
  if (event.code === "F9" && this.mode !== "battle") {
    this.openDebugMenu();
    return;
  }
  if (event.code === "F6") {
    this.cycleSemanticDebugOverlay();
    return;
  }
  if (event.code === "F7") {
    this.cloudOverlayEnabled = !this.cloudOverlayEnabled;
    this.flashMessage(`Cloud overlay: ${this.cloudOverlayEnabled ? "on" : "off"}`);
    this.updateCloudOverlay(0);
    this.markDirty();
    return;
  }
  if (this.mode === "battle" && this.battle && (event.code === "KeyL" || event.code === "Backquote")) {
    this.battle.debugLogVisible = !this.battle.debugLogVisible;
    this.markDirty();
    return;
  }

  if (this.mode === "title") this.handleTitle(event);
  else if (this.mode === "dialogue") this.handleDialogue(event);
  else if (this.mode === "menu") this.handleMenu(event);
  else if (this.mode === "battle") this.handleBattle(event);
  else if (this.mode === "gameOver") this.handleGameOver(event);
  else if (this.mode === "ending") this.handleEnding(event);
  else this.handleExplore(event);
}

export function handleKeyUp(this: CrystalOathSceneContext, event: KeyboardEvent) {
  if (this.isGameControlKey(event)) event.preventDefault();
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") this.shiftHeld = event.shiftKey;
  const directionName = directionNameForEvent(event);
  if (!directionName) return;
  this.heldDirections = this.heldDirections.filter((dir) => dir !== directionName);
}

export function isGameControlKey(this: CrystalOathSceneContext, event: KeyboardEvent): boolean {
  return (
    !!directionNameForEvent(event) ||
    isConfirm(event) ||
    isCancel(event) ||
    event.code === "KeyM" ||
    event.code === "KeyF" ||
    event.code === "KeyL" ||
    event.code === "Backquote" ||
    event.code === "F6" ||
    event.code === "F7" ||
    event.code === "F9"
  );
}

export function cycleSemanticDebugOverlay(this: CrystalOathSceneContext) {
  const modes = ["off", "edgeDebug", "rawTiles", "masks", "terrainVariants", "distance", "grid", "walkability", "policy", "mountains", "forests", "islands", "pois", "roads", "rivers"] as const;
  const current = modes.indexOf(this.semanticDebugOverlay);
  this.semanticDebugOverlay = modes[(current + 1) % modes.length];
  this.flashMessage(`Semantic debug: ${this.semanticDebugOverlay}`);
  this.markDirty();
}

export function rememberHeldDirection(this: CrystalOathSceneContext, direction: DirectionName) {
  this.heldDirections = this.heldDirections.filter((dir) => dir !== direction);
  this.heldDirections.push(direction);
}

export function handleTitle(this: CrystalOathSceneContext, event: KeyboardEvent) {
  if (isUp(event)) this.adjustTitle(-1);
  else if (isDown(event)) this.adjustTitle(1);
  else if (isConfirm(event)) this.confirmTitleSelection();
  this.markDirty();
}

export function handlePointer(this: CrystalOathSceneContext, pointer: Phaser.Input.Pointer) {
  this.audio.start();
  if (this.worldControlLockReason === "boatTravel") return;
  const point = this.pointerToLayout(pointer);
  if (this.mode === "title" && this.handleTitlePointer(point)) return;
  if (this.mode === "battle" && this.handleBattlePointer(point)) return;
  this.audio.blip("confirm");
}

export function pointerToLayout(this: CrystalOathSceneContext, pointer: Phaser.Input.Pointer): Vec {
  return { x: pointer.x / PIXEL_ART_SCALE, y: pointer.y / PIXEL_ART_SCALE };
}

export function handleTitlePointer(this: CrystalOathSceneContext, point: Vec): boolean {
  const optionIndex = this.titleOptions.findIndex((_, idx) => {
    const rowY = TITLE_MENU_START_Y + idx * TITLE_MENU_ROW_HEIGHT;
    return Math.abs(point.x - WIDTH / 2) <= 180 && point.y >= rowY - 8 && point.y <= rowY + 28;
  });
  if (optionIndex < 0) return false;
  this.titleSelected = optionIndex;
  const option = this.titleOptions[this.titleSelected];
  if (option === "Continue" && !localStorage.getItem(SAVE_KEY)) {
    this.audio.blip("error");
    this.markDirty();
    return true;
  }
  this.confirmTitleSelection();
  this.markDirty();
  return true;
}

export function handleBattlePointer(this: CrystalOathSceneContext, point: Vec): boolean {
  if (!this.battle) return false;
  if (this.battle.phase === "resolving") return false;
  if (this.battle.phase === "victory") {
    this.finishBattle(true);
    this.markDirty();
    return true;
  }
  if (this.battle.phase === "log") {
    this.advanceBattleLog();
    this.markDirty();
    return true;
  }

  const commandIndex = battleCommandIndexAt(point);
  if (commandIndex >= 0) {
    this.battle.phase = "command";
    this.battle.pendingAction = undefined;
    this.battle.menuReturnSelected = undefined;
    this.battle.selected = commandIndex;
    this.confirmBattleSelection();
    this.markDirty();
    return true;
  }

  const submenuIndex = battleSubmenuIndexAt(point, battleVisibleSubmenuOptionCount.call(this));
  if (submenuIndex >= 0) {
    if (this.battle.phase === "target" || this.battle.phase === "allyTarget") {
      const source = this.battle.pendingAction?.type;
      if (source === "skill" || source === "spell" || source === "item") {
        this.battle.phase = source;
        this.battle.pendingAction = undefined;
        this.battle.menuReturnSelected = undefined;
      } else {
        return false;
      }
    }
    if (!["skill", "spell", "item"].includes(this.battle.phase)) return false;
    const options = this.battleOptions();
    if (submenuIndex >= options.length) return false;
    this.battle.selected = submenuIndex;
    this.confirmBattleSelection();
    this.markDirty();
    return true;
  }

  return false;
}

function battleCommandIndexAt(point: Vec): number {
  const optionW = 74;
  const h = 36;
  const x = 70;
  const y = HEIGHT - h - 5;
  const commands = 6;
  for (let idx = 0; idx < commands; idx += 1) {
    const optionX = x + 5 + idx * optionW;
    const optionY = y + 5;
    if (point.x >= optionX && point.x <= optionX + optionW - 2 && point.y >= optionY && point.y <= optionY + 26) return idx;
  }
  return -1;
}

function battleSubmenuIndexAt(point: Vec, optionCount: number): number {
  if (optionCount <= 0) return -1;
  const commandOptionW = 74;
  const commandW = commandOptionW * 6 + 10;
  const commandX = 70;
  const rowH = 26;
  const w = 170;
  const h = 24 + optionCount * rowH + 8;
  const x = commandX + commandW + 28;
  const y = HEIGHT - h - 5;
  for (let idx = 0; idx < optionCount; idx += 1) {
    const rowY = y + 24 + idx * rowH;
    if (point.x >= x + 7 && point.x <= x + w - 7 && point.y >= rowY && point.y <= rowY + 22) return idx;
  }
  return -1;
}

function battleVisibleSubmenuOptionCount(this: CrystalOathSceneContext): number {
  if (!this.battle) return 0;
  const actor = this.currentBattleActor();
  if (!actor) return 0;
  const source = this.battle.phase === "target" || this.battle.phase === "allyTarget" ? this.battle.pendingAction?.type : this.battle.phase;
  if (source === "skill") return this.skillsForActor(actor).length;
  if (source === "spell") return actor.spells.filter((id) => actor.level >= SPELLS[id].minLevel).length;
  if (source === "item") return Object.keys(ITEMS).filter((id) => ITEMS[id].battle && (this.inventory[id] ?? 0) > 0).length;
  return 0;
}

export function confirmTitleSelection(this: CrystalOathSceneContext) {
  const option = this.titleOptions[this.titleSelected];
  if (option === "Continue") {
    if (this.loadGame()) this.audio.blip("confirm");
    else {
      this.audio.blip("error");
      this.flashMessage("No save found.");
    }
    return;
  }
  this.audio.blip("confirm");
  if (option === "New Game") this.newGame();
}

export function handleGameOver(this: CrystalOathSceneContext, event: KeyboardEvent) {
  if (isConfirm(event)) {
    if (!this.loadGame()) {
      this.mode = "title";
      this.audio.setMode("title");
    }
    this.markDirty();
  } else if (isCancel(event)) {
    this.mode = "title";
    this.audio.setMode("title");
    this.markDirty();
  }
}

export function handleEnding(this: CrystalOathSceneContext, event: KeyboardEvent) {
  if (isConfirm(event) || isCancel(event)) {
    this.mode = "title";
    this.audio.setMode("title");
    this.markDirty();
  }
}

export function handleDialogue(this: CrystalOathSceneContext, event: KeyboardEvent) {
  if (!isConfirm(event) && !isCancel(event)) return;
  if (!this.dialogue) return;
  this.audio.blip("confirm");
  if (this.dialogue.index < this.dialogue.lines.length - 1) {
    this.dialogue.index += 1;
  } else {
    const done = this.dialogue.done;
    this.dialogue = undefined;
    try {
      done();
    } finally {
      this.markDirty();
    }
    return;
  }
  this.markDirty();
}

export function handleMenu(this: CrystalOathSceneContext, event: KeyboardEvent) {
  if (!this.menu) return;
  if (isUp(event)) this.adjustMenu(-1);
  else if (isDown(event)) this.adjustMenu(1);
  else if (isCancel(event)) {
    this.audio.blip("cancel");
    this.menu.cancel();
  } else if (isConfirm(event)) {
    const option = this.menu.options[this.menu.selected];
    if (!option || option.disabled?.()) {
      this.audio.blip("error");
    } else {
      this.audio.blip("confirm");
      option.action();
    }
  }
  this.markDirty();
}

export function handleExplore(this: CrystalOathSceneContext, event: KeyboardEvent) {
  if (this.activeStep) return;
  if (isCancel(event)) {
    this.clearHeldMovement();
    this.openMainMenu();
    return;
  }
  if (isConfirm(event)) {
    this.interact();
    return;
  }
  const dir = keyDirection(event);
  if (!dir) return;
  this.lastMoveDir = { ...dir };
  this.markDirty();
}

export function handleBattle(this: CrystalOathSceneContext, event: KeyboardEvent) {
  if (!this.battle) return;
  if (this.battle.phase === "resolving") return;
  if (this.battle.phase === "victory") {
    if (isConfirm(event)) this.finishBattle(true);
    this.markDirty();
    return;
  }
  if (this.battle.phase === "log") {
    if (isConfirm(event) || isCancel(event)) {
      this.advanceBattleLog();
    }
    this.markDirty();
    return;
  }
  if (isBattleBack(event)) {
    this.cancelBattleSubmenu();
    this.markDirty();
    return;
  }
  if (isUp(event)) this.adjustBattleSelection("up");
  else if (isDown(event)) this.adjustBattleSelection("down");
  else if (isLeft(event)) this.adjustBattleSelection("left");
  else if (isRight(event)) this.adjustBattleSelection("right");
  else if (isCancel(event)) this.cancelBattleSubmenu();
  else if (isConfirm(event)) this.confirmBattleSelection();
  this.markDirty();
}

function isBattleBack(event: KeyboardEvent) {
  return isCancel(event);
}
