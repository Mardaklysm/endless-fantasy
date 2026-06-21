import Phaser from "phaser";
import { worldCloudPoolForContext, type WorldCloudAsset, type WorldCloudTintConfig } from "../data/worldCloudAssets.ts";
import { createSeededRng, type SeededRng } from "./seededRng.ts";
import type { IslandId, IslandTheme } from "./worldGenerator.ts";

export const CLOUD_OVERLAY_OPACITY = 0.5;

const CLOUD_MIN_SPEED = 12;
const CLOUD_MAX_SPEED = 25;
const CLOUD_MIN_OPACITY = 0.32;
const CLOUD_MAX_OPACITY = 0.62;
const CLOUD_TOP_BAND_MAX = 0.24;
const CLOUD_TINT_TRANSITION_MS = 3500;
const WHITE_RGB: Rgb = { r: 255, g: 255, b: 255 };

export interface OverworldCloudOverlayContext {
  active: boolean;
  worldSeed: string;
  islandId?: IslandId | string;
  islandName?: string;
  islandTheme?: IslandTheme | string;
  viewportWidth: number;
  viewportHeight: number;
  pixelScale: number;
  depth: number;
  enabled: boolean;
}

export interface OverworldCloudDebugState {
  enabled: boolean;
  active: boolean;
  poolName?: string;
  themeName?: string;
  activeTint?: string;
  activeCloudId?: string;
  activeCloudCount: number;
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface RuntimeCloud {
  image: Phaser.GameObjects.Image;
  asset: WorldCloudAsset;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  baseSpeed: number;
  alphaOffset: number;
}

export class OverworldCloudOverlay {
  private clouds: RuntimeCloud[] = [];
  private rng: SeededRng = createSeededRng("world-cloud-overlay");
  private rngKey = "";
  private activePoolName?: string;
  private activeThemeName?: string;
  private activePool: readonly WorldCloudAsset[] = [];
  private lastEnabled = true;
  private currentTint: Rgb = { ...WHITE_RGB };
  private targetTint: Rgb = { ...WHITE_RGB };
  private currentAlpha = CLOUD_OVERLAY_OPACITY;
  private targetAlpha = CLOUD_OVERLAY_OPACITY;
  private currentSpeedMultiplier = 1;
  private targetSpeedMultiplier = 1;

  constructor(private readonly scene: Phaser.Scene) {}

  update(deltaMs: number, context: OverworldCloudOverlayContext): void {
    this.lastEnabled = context.enabled;
    const resolution = worldCloudPoolForContext({
      islandId: context.islandId,
      islandName: context.islandName,
      islandTheme: context.islandTheme
    });
    this.activePoolName = resolution.poolName;
    this.activeThemeName = resolution.themeName;
    this.activePool = resolution.assets;
    this.updateTargetTheme(resolution.tintConfig);

    const active = context.active && context.enabled && resolution.assets.length > 0;
    if (!active) {
      this.destroyClouds();
      return;
    }

    const rngKey = `${context.worldSeed}:${resolution.themeName}:${context.islandId ?? context.islandName ?? "open"}`;
    if (this.rngKey !== rngKey) {
      this.rngKey = rngKey;
      this.rng = createSeededRng(rngKey);
    }

    this.advanceThemeTransition(deltaMs);
    this.moveClouds(deltaMs, context);
    this.removeExitedClouds(context.viewportWidth);
    if (this.clouds.length === 0) this.spawnCloud(context);
    else if (this.clouds.length < 2 && this.clouds[0].x >= 0) {
      this.spawnCloud(context);
    }
  }

  debugState(): OverworldCloudDebugState {
    return {
      enabled: this.lastEnabled,
      active: this.clouds.length > 0,
      poolName: this.activePoolName,
      themeName: this.activeThemeName,
      activeTint: rgbToHex(this.currentTint),
      activeCloudId: this.clouds[0]?.asset.id,
      activeCloudCount: this.clouds.length
    };
  }

  destroy(): void {
    this.destroyClouds();
  }

  private updateTargetTheme(config: WorldCloudTintConfig): void {
    this.targetTint = blendedThemeTint(config);
    this.targetAlpha = clamp(config.alpha ?? CLOUD_OVERLAY_OPACITY, CLOUD_MIN_OPACITY, CLOUD_MAX_OPACITY);
    this.targetSpeedMultiplier = clamp(config.speedMultiplier ?? 1, 0.5, 1.5);
  }

  private advanceThemeTransition(deltaMs: number): void {
    const amount = deltaMs <= 0 ? 0 : clamp(deltaMs / CLOUD_TINT_TRANSITION_MS, 0, 1);
    this.currentTint = lerpRgb(this.currentTint, this.targetTint, amount);
    this.currentAlpha = lerp(this.currentAlpha, this.targetAlpha, amount);
    this.currentSpeedMultiplier = lerp(this.currentSpeedMultiplier, this.targetSpeedMultiplier, amount);
  }

  private moveClouds(deltaMs: number, context: OverworldCloudOverlayContext): void {
    const seconds = deltaMs / 1000;
    for (const cloud of this.clouds) {
      cloud.x += cloud.baseSpeed * this.currentSpeedMultiplier * seconds;
      cloud.image.setPosition(cloud.x * context.pixelScale, cloud.y * context.pixelScale);
      cloud.image.setDepth(context.depth);
      this.applyCloudVisuals(cloud);
      cloud.image.setVisible(true);
    }
  }

  private removeExitedClouds(viewportWidth: number): void {
    const remaining: RuntimeCloud[] = [];
    for (const cloud of this.clouds) {
      if (cloud.x > viewportWidth + 32) {
        cloud.image.destroy();
        continue;
      }
      remaining.push(cloud);
    }
    this.clouds = remaining;
  }

  private spawnCloud(context: OverworldCloudOverlayContext): void {
    const viableAssets = this.activePool.filter((asset) => this.scene.textures.exists(asset.textureKey));
    if (!viableAssets.length) return;
    const asset = this.rng.pick(viableAssets);
    const aspect = Math.max(1, asset.dimensions.width / Math.max(1, asset.dimensions.height));
    const scaleVariation = this.rng.float(0.85, 1.15);
    const displayWidth = context.viewportWidth * this.rng.float(0.32, 0.48) * scaleVariation;
    const displayHeight = displayWidth / aspect;
    const maxTopBandY = Math.max(8, context.viewportHeight * CLOUD_TOP_BAND_MAX - displayHeight * 0.55);
    const y = this.rng.float(-displayHeight * 0.35, maxTopBandY);
    const x = -displayWidth - this.rng.float(24, 80);
    const baseSpeed = this.rng.float(CLOUD_MIN_SPEED, CLOUD_MAX_SPEED) * this.rng.float(0.85, 1.15);
    const alphaOffset = this.rng.float(-0.06, 0.06);
    const image = this.scene.add.image(x * context.pixelScale, y * context.pixelScale, asset.textureKey);
    image.setOrigin(0, 0);
    image.setDisplaySize(displayWidth * context.pixelScale, displayHeight * context.pixelScale);
    image.setDepth(context.depth);
    image.setScrollFactor(0);
    const cloud: RuntimeCloud = { image, asset, x, y, displayWidth, displayHeight, baseSpeed, alphaOffset };
    this.applyCloudVisuals(cloud);
    this.clouds.push(cloud);
  }

  private applyCloudVisuals(cloud: RuntimeCloud): void {
    cloud.image.setTint(rgbToNumber(this.currentTint));
    cloud.image.setAlpha(clamp(this.currentAlpha + cloud.alphaOffset, CLOUD_MIN_OPACITY, CLOUD_MAX_OPACITY));
  }

  private destroyClouds(): void {
    for (const cloud of this.clouds) cloud.image.destroy();
    this.clouds = [];
  }
}

function blendedThemeTint(config: WorldCloudTintConfig): Rgb {
  const strength = clamp(config.tintStrength ?? 0.45, 0, 0.75);
  return lerpRgb(WHITE_RGB, parseHexColor(config.tint), strength);
}

function parseHexColor(value: string): Rgb {
  const normalized = value.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { ...WHITE_RGB };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function lerpRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  return {
    r: lerp(from.r, to.r, amount),
    g: lerp(from.g, to.g, amount),
    b: lerp(from.b, to.b, amount)
  };
}

function rgbToNumber(color: Rgb): number {
  return (Math.round(color.r) << 16) + (Math.round(color.g) << 8) + Math.round(color.b);
}

function rgbToHex(color: Rgb): string {
  return `#${rgbToNumber(color).toString(16).padStart(6, "0").toUpperCase()}`;
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
