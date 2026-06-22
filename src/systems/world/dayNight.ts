import Phaser from "phaser";
import { HEIGHT, LAYER_WORLD_LIGHTING, MOVE_DURATION_MS, PIXEL_ART_SCALE, WIDTH } from "../../app/config";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export type WorldDayPhaseId = "dawn" | "morning" | "day" | "evening" | "night" | "lateNight";

interface WorldDayPhaseConfig {
  id: WorldDayPhaseId;
  label: string;
  startProgress: number;
  overlayColor: number;
  overlayAlpha: number;
}

interface WorldLightingVisual {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

export interface WorldLightingSnapshot {
  dayProgress: number;
  dayTick: number;
  dayNumber: number;
  phase: WorldDayPhaseId;
  phaseLabel: string;
  phaseProgress: number;
  visual: WorldLightingVisual;
}

export const WORLD_TIME_TICKS_PER_FULL_DAY = 320;

export const WORLD_DAY_PHASES: readonly WorldDayPhaseConfig[] = [
  { id: "dawn", label: "Dawn", startProgress: 0, overlayColor: 0x5f7fd0, overlayAlpha: 0.18 },
  { id: "morning", label: "Morning", startProgress: 0.1, overlayColor: 0xffbe68, overlayAlpha: 0.09 },
  { id: "day", label: "Day", startProgress: 0.2, overlayColor: 0xfff8df, overlayAlpha: 0.015 },
  { id: "evening", label: "Evening", startProgress: 0.55, overlayColor: 0xd0698f, overlayAlpha: 0.2 },
  { id: "night", label: "Night", startProgress: 0.7, overlayColor: 0x173775, overlayAlpha: 0.36 },
  { id: "lateNight", label: "Late Night", startProgress: 0.9, overlayColor: 0x101f52, overlayAlpha: 0.3 }
];

const WORLD_LIGHTING_TWEEN_MS = Math.max(120, MOVE_DURATION_MS);

export function createWorldLightingLayer(this: CrystalOathSceneContext) {
  const snapshot = worldLightingSnapshotForTicks(this.worldTimeTicks);
  this.applyWorldLightingSnapshot(snapshot);
  this.worldLightingVisual = { ...snapshot.visual };
  this.worldLightingOverlay = this.add.rectangle(
    0,
    0,
    WIDTH * PIXEL_ART_SCALE,
    HEIGHT * PIXEL_ART_SCALE,
    rgbToColor(snapshot.visual),
    snapshot.visual.alpha
  );
  this.worldLightingOverlay.setOrigin(0, 0);
  this.worldLightingOverlay.setScrollFactor(0);
  this.worldLightingOverlay.setDepth(LAYER_WORLD_LIGHTING);
  this.syncWorldLightingLayer();
}

export function syncWorldLightingLayer(this: CrystalOathSceneContext) {
  if (!this.worldLightingOverlay) return;
  this.worldLightingOverlay.setVisible(this.mode === "world");
  this.worldLightingOverlay.setDepth(LAYER_WORLD_LIGHTING);
  this.renderWorldLightingLayer();
}

export function renderWorldLightingLayer(this: CrystalOathSceneContext) {
  if (!this.worldLightingOverlay) return;
  const visual = this.worldLightingVisual;
  this.worldLightingOverlay.setFillStyle(rgbToColor(visual), Phaser.Math.Clamp(visual.alpha, 0, 1));
}

export function setWorldTimeTicks(this: CrystalOathSceneContext, ticks: number) {
  this.worldTimeTicks = normalizeWorldTimeTicks(ticks);
  const snapshot = worldLightingSnapshotForTicks(this.worldTimeTicks);
  this.applyWorldLightingSnapshot(snapshot);
  this.worldLightingTween?.stop();
  this.worldLightingTween = undefined;
  this.worldLightingVisual = { ...snapshot.visual };
  this.renderWorldLightingLayer();
}

export function advanceWorldTimeTick(this: CrystalOathSceneContext) {
  this.worldTimeTicks = normalizeWorldTimeTicks(this.worldTimeTicks + 1);
  const snapshot = worldLightingSnapshotForTicks(this.worldTimeTicks);
  this.applyWorldLightingSnapshot(snapshot);
  this.tweenWorldLightingTo(snapshot.visual);
}

export function applyWorldLightingSnapshot(this: CrystalOathSceneContext, snapshot: WorldLightingSnapshot) {
  this.currentDayPhase = snapshot.phase;
  this.currentDayPhaseProgress = snapshot.phaseProgress;
}

export function tweenWorldLightingTo(this: CrystalOathSceneContext, target: WorldLightingVisual) {
  this.worldLightingTween?.stop();
  this.worldLightingTween = this.tweens.add({
    targets: this.worldLightingVisual,
    red: target.red,
    green: target.green,
    blue: target.blue,
    alpha: target.alpha,
    duration: WORLD_LIGHTING_TWEEN_MS,
    ease: "Sine.easeInOut",
    onUpdate: () => this.renderWorldLightingLayer(),
    onComplete: () => {
      this.worldLightingVisual = { ...target };
      this.renderWorldLightingLayer();
      this.worldLightingTween = undefined;
    }
  });
}

export function worldTimeDebugText(this: CrystalOathSceneContext): string {
  const snapshot = worldLightingSnapshotForTicks(this.worldTimeTicks);
  const phasePercent = Math.round(snapshot.phaseProgress * 100);
  return `Time ${this.worldTimeTicks}  Day ${snapshot.dayNumber + 1} ${snapshot.phaseLabel} ${phasePercent}%  tick ${snapshot.dayTick}/${WORLD_TIME_TICKS_PER_FULL_DAY}`;
}

export function worldLightingSnapshotForTicks(ticks: number): WorldLightingSnapshot {
  const normalizedTicks = normalizeWorldTimeTicks(ticks);
  const dayTick = normalizedTicks % WORLD_TIME_TICKS_PER_FULL_DAY;
  const dayNumber = Math.floor(normalizedTicks / WORLD_TIME_TICKS_PER_FULL_DAY);
  const dayProgress = dayTick / WORLD_TIME_TICKS_PER_FULL_DAY;
  const phaseIndex = phaseIndexForProgress(dayProgress);
  const phase = WORLD_DAY_PHASES[phaseIndex];
  const nextPhase = WORLD_DAY_PHASES[(phaseIndex + 1) % WORLD_DAY_PHASES.length];
  const phaseStart = phase.startProgress;
  const nextStart = nextPhase.startProgress > phaseStart ? nextPhase.startProgress : nextPhase.startProgress + 1;
  const adjustedProgress = dayProgress < phaseStart ? dayProgress + 1 : dayProgress;
  const phaseProgress = Phaser.Math.Clamp((adjustedProgress - phaseStart) / Math.max(0.0001, nextStart - phaseStart), 0, 1);
  const easedProgress = Phaser.Math.Easing.Sine.InOut(phaseProgress);

  return {
    dayProgress,
    dayTick,
    dayNumber,
    phase: phase.id,
    phaseLabel: phase.label,
    phaseProgress,
    visual: interpolateVisual(phase, nextPhase, easedProgress)
  };
}

function normalizeWorldTimeTicks(ticks: number): number {
  if (!Number.isFinite(ticks)) return 0;
  return Math.max(0, Math.floor(ticks));
}

function phaseIndexForProgress(progress: number): number {
  for (let index = WORLD_DAY_PHASES.length - 1; index >= 0; index -= 1) {
    if (progress >= WORLD_DAY_PHASES[index].startProgress) return index;
  }
  return 0;
}

function interpolateVisual(from: WorldDayPhaseConfig, to: WorldDayPhaseConfig, progress: number): WorldLightingVisual {
  const fromColor = Phaser.Display.Color.IntegerToColor(from.overlayColor);
  const toColor = Phaser.Display.Color.IntegerToColor(to.overlayColor);
  return {
    red: Phaser.Math.Linear(fromColor.red, toColor.red, progress),
    green: Phaser.Math.Linear(fromColor.green, toColor.green, progress),
    blue: Phaser.Math.Linear(fromColor.blue, toColor.blue, progress),
    alpha: Phaser.Math.Linear(from.overlayAlpha, to.overlayAlpha, progress)
  };
}

function rgbToColor(visual: WorldLightingVisual): number {
  return Phaser.Display.Color.GetColor(Math.round(visual.red), Math.round(visual.green), Math.round(visual.blue));
}
