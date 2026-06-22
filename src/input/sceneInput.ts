import Phaser from "phaser";
import {
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

export function handleKey(this: CrystalOathSceneContext, event: KeyboardEvent) {
  this.audio.start();
  if (this.isGameControlKey(event)) event.preventDefault();
  this.shiftHeld = event.shiftKey || event.code === "ShiftLeft" || event.code === "ShiftRight";
  const directionName = directionNameForEvent(event);
  if (directionName && this.isExploreMode(this.mode)) {
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
    event.code === "F6" ||
    event.code === "F7" ||
    event.code === "F9"
  );
}

export function cycleSemanticDebugOverlay(this: CrystalOathSceneContext) {
  const modes = ["off", "edgeDebug", "rawTiles", "masks", "distance", "grid", "walkability", "policy", "mountains", "forests", "islands", "pois", "roads", "rivers"] as const;
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
  const point = this.pointerToLayout(pointer);
  if (this.mode === "title" && this.handleTitlePointer(point)) return;
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
    done();
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
  if (this.battle.phase === "log") {
    if (isConfirm(event) || isCancel(event)) {
      this.advanceBattleLog();
    }
    this.markDirty();
    return;
  }
  if (isUp(event)) this.adjustBattleSelection(-1);
  else if (isDown(event)) this.adjustBattleSelection(1);
  else if (isLeft(event)) this.adjustBattleSelection(-1);
  else if (isRight(event)) this.adjustBattleSelection(1);
  else if (isCancel(event)) this.cancelBattleSubmenu();
  else if (isConfirm(event)) this.confirmBattleSelection();
  this.markDirty();
}
