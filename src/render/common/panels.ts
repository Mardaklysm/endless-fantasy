import Phaser from "phaser";
import { HEIGHT, LAYER_UI_IMAGE, PIXEL_ART_SCALE, TILE, WIDTH } from "../../app/config";
import type { Vec } from "../../scene/sceneTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";
import { SEMANTIC_BIOME, SEMANTIC_WATER, type SemanticWorld } from "../../world/semantic/semanticTypes";

const COMPACT_PANEL_BG = 0x06111f;
const COMPACT_PANEL_INNER = 0x0b1b30;
const COMPACT_PANEL_GOLD = 0xb88b43;
const COMPACT_PANEL_SHADOW = 0x020612;
const WORLD_MINIMAP_FRAME_WIDTH = 112;
const WORLD_MINIMAP_MAP_WIDTH = 104;
const WORLD_MINIMAP_TOP = 10;

interface WorldMinimapLayout {
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  mapX: number;
  mapY: number;
  mapWidth: number;
  mapHeight: number;
}

export function drawPanel(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number) {
  if (this.hasTexture("ui_window_panel")) {
    const c = 12;
    const mid = 24;
    const iw = Math.max(1, w - c * 2);
    const ih = Math.max(1, h - c * 2);
    this.ui.fillStyle(0x020714, 0.58).fillRect(x + 4, y + 5, w, h);
    this.drawCroppedTexture("ui_window_panel", x, y, 0, 0, c, c, c, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + c, y, c, 0, mid, c, iw, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + w - c, y, c + mid, 0, c, c, c, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x, y + c, 0, c, c, mid, c, ih, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + c, y + c, c, c, mid, mid, iw, ih, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + w - c, y + c, c + mid, c, c, mid, c, ih, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x, y + h - c, 0, c + mid, c, c, c, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + c, y + h - c, c, c + mid, mid, c, iw, c, LAYER_UI_IMAGE);
    this.drawCroppedTexture("ui_window_panel", x + w - c, y + h - c, c + mid, c + mid, c, c, c, c, LAYER_UI_IMAGE);
    return;
  }
  this.ui.fillStyle(0x020714, 0.55).fillRect(x + 4, y + 5, w, h);
  this.ui.fillStyle(0x10275a, 0.98).fillRect(x, y, w, h);
  this.ui.fillStyle(0x0b1733, 0.98).fillRect(x + 7, y + 7, w - 14, h - 14);
  this.ui.fillStyle(0x1f56ac, 0.34).fillRect(x + 8, y + 8, w - 16, Math.min(18, h - 16));
  this.ui.lineStyle(3, 0xe8f2ff, 1).strokeRect(x, y, w, h);
  this.ui.lineStyle(1, 0x77a5ff, 0.9).strokeRect(x + 7, y + 7, w - 14, h - 14);
  this.ui.lineStyle(1, 0x031026, 0.85).strokeRect(x + 3, y + 3, w - 6, h - 6);
}

export function drawCompactHudPanel(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number, alpha = 0.78) {
  this.ui.fillStyle(COMPACT_PANEL_SHADOW, 0.48).fillRect(x + 2, y + 2, w, h);
  this.ui.fillStyle(COMPACT_PANEL_BG, alpha).fillRect(x, y, w, h);
  this.ui.fillStyle(COMPACT_PANEL_INNER, Math.min(0.72, alpha + 0.08)).fillRect(x + 2, y + 2, w - 4, h - 4);
  this.ui.fillStyle(0x18314f, 0.36).fillRect(x + 3, y + 3, w - 6, Math.min(7, Math.max(2, h - 6)));
  this.ui.fillStyle(0x020714, 0.34).fillRect(x + 3, y + h - 5, w - 6, 2);
  this.ui.lineStyle(1, COMPACT_PANEL_GOLD, 0.95).strokeRect(x, y, w, h);
  this.ui.lineStyle(1, 0x3a2712, 0.82).strokeRect(x + 1, y + 1, w - 2, h - 2);
}

export function drawBar(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number, value: number, max: number, color: number) {
  const pct = Phaser.Math.Clamp(value / Math.max(1, max), 0, 1);
  if (this.hasTexture("ui_status_bar_empty") && this.hasTexture("ui_hp_bar")) {
    this.drawTexture("ui_status_bar_empty", x, y, w, h, LAYER_UI_IMAGE);
    const filledWidth = Math.floor(w * pct);
    if (filledWidth > 0) {
      this.drawCroppedTexture("ui_hp_bar", x, y, 0, 0, Math.max(1, Math.floor(64 * pct)), 8, filledWidth, h, LAYER_UI_IMAGE + 1, 1, color);
    }
    this.ui.lineStyle(1, 0xffffff, 0.55).strokeRect(x, y, w, h);
    return;
  }
  this.ui.fillStyle(0x0a0d14, 1).fillRect(x, y, w, h);
  this.ui.fillStyle(color, 1).fillRect(x, y, Math.floor(w * pct), h);
  this.ui.lineStyle(1, 0xffffff, 0.55).strokeRect(x, y, w, h);
}

export function drawHud(this: CrystalOathSceneContext, place: string) {
  this.drawPanel(12, 10, 286, 56);
  this.text(28, 18, place, 17, "#fff2a8", "left", { wordWrapWidth: 250 });
  this.text(28, 42, `Gold ${this.gold}  Relics ${this.relicCount()}/4`, 12, "#e7efff", "left", { wordWrapWidth: 250 });

  const rightW = 318;
  const rightX = WIDTH - rightW - 12;
  this.drawPanel(rightX, 10, rightW, 56);
  this.text(rightX + 16, 19, `Enc ${this.settings.encounters ? "ON" : "OFF"}  XP ${this.settings.xpMultiplier}x`, 13, "#e7efff", "left", {
    wordWrapWidth: rightW - 32
  });
  const seedText = import.meta.env.DEV ? `Seed ${this.worldSeed}` : `${this.settings.muted ? "Muted" : "Audio"}  Esc Menu`;
  this.text(rightX + 16, 41, seedText, 11, "#c5d2f2", "left", { wordWrapWidth: rightW - 32 });
}

export function drawWorldClock(this: CrystalOathSceneContext) {
  const w = 142;
  const h = 40;
  const x = Math.floor(WIDTH / 2 - w / 2);
  const y = 14;
  this.drawPanel(x, y, w, h);
  this.ui.fillStyle(0x071225, 0.42).fillRect(x + 10, y + 9, w - 20, h - 18);
  this.ui.lineStyle(1, 0x8f7241, 0.72).strokeRect(x + 9, y + 8, w - 18, h - 16);
  this.text(x + w / 2, y + 10, this.worldClockText(), 18, "#eaf4ff", "center", {
    stroke: "#020714",
    strokeThickness: 2,
    wordWrapWidth: w - 24
  });
}

export function drawOverworldHud(this: CrystalOathSceneContext) {
  const x = 10;
  const y = 8;
  const w = 174;
  const h = 30;
  this.drawCompactHudPanel(x, y, w, h, 0.68);
  this.text(x + 7, y + 4, this.currentIslandName(), 9, "#fff0a6", "left", { wordWrapWidth: 112, strokeThickness: 1 });
  this.text(x + w - 43, y + 4, this.worldClockText(), 8, "#d7ecff", "left", { wordWrapWidth: 38, strokeThickness: 1 });
  this.text(x + 7, y + 17, `Gold ${this.gold} | Relics ${this.relicCount()}/4`, 7, "#dfe9ff", "left", {
    wordWrapWidth: w - 14,
    strokeThickness: 1
  });
  drawFaintOverworldDebug.call(this);
}

export function drawWorldMinimap(this: CrystalOathSceneContext) {
  if (!this.generatedWorld) return;
  const layout = worldMinimapLayout.call(this);
  this.ui.fillStyle(COMPACT_PANEL_SHADOW, 0.3).fillRect(layout.frameX + 2, layout.frameY + 2, layout.frameWidth, layout.frameHeight);
  this.ui.fillStyle(COMPACT_PANEL_BG, 0.18).fillRect(layout.frameX, layout.frameY, layout.frameWidth, layout.frameHeight);
  this.ui.lineStyle(1, COMPACT_PANEL_GOLD, 0.82).strokeRect(layout.frameX, layout.frameY, layout.frameWidth, layout.frameHeight);
  this.ui.lineStyle(1, 0x020714, 0.45).strokeRect(layout.frameX + 1, layout.frameY + 1, layout.frameWidth - 2, layout.frameHeight - 2);
  if (
    this.worldMinimapCacheSeed !== this.worldSeed ||
    this.worldMinimapCacheWidth !== layout.mapWidth ||
    this.worldMinimapCacheHeight !== layout.mapHeight ||
    !this.textures.exists(this.worldMinimapCacheKey)
  ) {
    this.rebuildWorldMinimapCache(layout.mapWidth, layout.mapHeight);
  }
  if (this.textures.exists(this.worldMinimapCacheKey)) {
    const image = this.add.image(layout.mapX * PIXEL_ART_SCALE, layout.mapY * PIXEL_ART_SCALE, this.worldMinimapCacheKey);
    image.setOrigin(0, 0);
    image.setDisplaySize(layout.mapWidth * PIXEL_ART_SCALE, layout.mapHeight * PIXEL_ART_SCALE);
    image.setDepth(LAYER_UI_IMAGE);
    image.setScrollFactor(0);
    this.images.push(image);
  }
  drawVisitedLocationMarkers.call(this, layout);
  drawMinimapPlayerMarker.call(this, layout);
}

export function rebuildWorldMinimapCache(this: CrystalOathSceneContext, mapWidth: number, mapHeight: number) {
  const world = this.generatedWorld;
  if (!world || mapWidth <= 0 || mapHeight <= 0) return;
  const canvas = document.createElement("canvas");
  canvas.width = mapWidth;
  canvas.height = mapHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, mapWidth, mapHeight);
  ctx.imageSmoothingEnabled = false;
  for (let py = 0; py < mapHeight; py += 1) {
    const wy = Math.min(world.height - 1, Math.floor((py / mapHeight) * world.height));
    for (let px = 0; px < mapWidth; px += 1) {
      const wx = Math.min(world.width - 1, Math.floor((px / mapWidth) * world.width));
      if (!minimapCellDrawsOverTransparentSea(world.semantic, wx, wy)) continue;
      ctx.fillStyle = "rgba(2, 7, 20, 0.48)";
      ctx.fillRect(px - 1, py, 3, 1);
      ctx.fillRect(px, py - 1, 1, 3);
    }
  }
  for (let py = 0; py < mapHeight; py += 1) {
    const wy = Math.min(world.height - 1, Math.floor((py / mapHeight) * world.height));
    for (let px = 0; px < mapWidth; px += 1) {
      const wx = Math.min(world.width - 1, Math.floor((px / mapWidth) * world.width));
      const color = minimapColorForSemanticCell(world.semantic, wx, wy);
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, 1, 1);
    }
  }
  if (this.textures.exists(this.worldMinimapCacheKey)) this.textures.remove(this.worldMinimapCacheKey);
  this.textures.addCanvas(this.worldMinimapCacheKey, canvas);
  this.textures.get(this.worldMinimapCacheKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
  this.worldMinimapCacheSeed = this.worldSeed;
  this.worldMinimapCacheWidth = mapWidth;
  this.worldMinimapCacheHeight = mapHeight;
}

export function drawPrompt(this: CrystalOathSceneContext, text: string) {
  const w = 326;
  const h = 42;
  const x = WIDTH - w - 24;
  const y = HEIGHT - h - 18;
  this.drawPanel(x, y, w, h);
  this.text(x + 18, y + 12, text, 16, "#ffffff", "left", { wordWrapWidth: w - 36 });
}

export function cameraFor(this: CrystalOathSceneContext, pos: Vec, mapW: number, mapH: number): Vec {
  const mapPixelW = mapW * TILE;
  const mapPixelH = mapH * TILE;
  return {
    x:
      mapPixelW <= WIDTH
        ? -(WIDTH - mapPixelW) / 2
        : Phaser.Math.Clamp(pos.x * TILE - WIDTH / 2 + TILE / 2, 0, mapPixelW - WIDTH),
    y:
      mapPixelH <= HEIGHT
        ? -(HEIGHT - mapPixelH) / 2
        : Phaser.Math.Clamp(pos.y * TILE - HEIGHT / 2 + TILE / 2, 0, mapPixelH - HEIGHT)
  };
}

function worldMinimapLayout(this: CrystalOathSceneContext): WorldMinimapLayout {
  const mapWidth = WORLD_MINIMAP_MAP_WIDTH;
  const worldWidth = this.generatedWorld?.width ?? 288;
  const worldHeight = this.generatedWorld?.height ?? 192;
  const mapHeight = Math.max(60, Math.min(78, Math.round(mapWidth * (worldHeight / Math.max(1, worldWidth)))));
  const frameWidth = WORLD_MINIMAP_FRAME_WIDTH;
  const frameHeight = mapHeight + 8;
  const frameX = WIDTH - frameWidth - 10;
  const frameY = WORLD_MINIMAP_TOP;
  return {
    frameX,
    frameY,
    frameWidth,
    frameHeight,
    mapX: frameX + 4,
    mapY: frameY + 4,
    mapWidth,
    mapHeight
  };
}

function minimapColorForSemanticCell(world: SemanticWorld, x: number, y: number): string | undefined {
  const i = y * world.width + x;
  const water = world.layers.waterClass[i];
  if (world.layers.lakeMap[i] || world.layers.riverMap[i]) return "rgba(36, 159, 188, 0.78)";
  if (!world.layers.landMask[i]) {
    if (water === SEMANTIC_WATER.SHALLOW) return "rgba(39, 169, 192, 0.44)";
    return undefined;
  }
  if (world.layers.roadMap[i]) return "#9b7743";
  if (world.layers.mountainMap[i]) return world.layers.biome[i] === SEMANTIC_BIOME.ICE ? "#d6edf5" : "#696c62";
  if (world.layers.forestMap[i]) return "#246237";
  if (world.layers.biome[i] === SEMANTIC_BIOME.BEACH) return "#d9bd74";
  if (world.layers.biome[i] === SEMANTIC_BIOME.SAND) return "#c69c50";
  if (world.layers.biome[i] === SEMANTIC_BIOME.ICE) return "#b6dbe6";
  return "#5aa249";
}

function minimapCellDrawsOverTransparentSea(world: SemanticWorld, x: number, y: number): boolean {
  const i = y * world.width + x;
  return !!world.layers.landMask[i] || !!world.layers.lakeMap[i] || !!world.layers.riverMap[i] || world.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW;
}

function drawVisitedLocationMarkers(this: CrystalOathSceneContext, layout: WorldMinimapLayout) {
  if (!this.generatedWorld) return;
  for (const loc of this.locations()) {
    if (!this.isLocationVisited(loc.id)) continue;
    const point = minimapPointForWorldPos(layout, this.generatedWorld.width, this.generatedWorld.height, loc);
    drawUiPixelRect.call(this, point.x - 2, point.y - 2, 3, 3, 0x241705, 0.78, LAYER_UI_IMAGE + 1);
    drawUiPixelRect.call(this, point.x - 1, point.y - 1, 1, 1, 0xffdc64, 1, LAYER_UI_IMAGE + 2);
  }
}

function drawMinimapPlayerMarker(this: CrystalOathSceneContext, layout: WorldMinimapLayout) {
  if (!this.generatedWorld) return;
  const pos = this.boatTravel?.boatPos ?? this.visualExplorePos("world");
  const point = minimapPointForWorldPos(layout, this.generatedWorld.width, this.generatedWorld.height, pos);
  drawUiPixelRect.call(this, point.x - 2, point.y - 2, 5, 5, 0x210708, 0.9, LAYER_UI_IMAGE + 3);
  drawUiPixelRect.call(this, point.x - 1, point.y - 1, 3, 3, 0xe82938, 1, LAYER_UI_IMAGE + 4);
  drawUiPixelRect.call(this, point.x - 1, point.y - 1, 2, 2, 0xff8b8e, 1, LAYER_UI_IMAGE + 5);
}

function drawFaintOverworldDebug(this: CrystalOathSceneContext) {
  const alpha = this.semanticDebugOverlay !== "off" ? 0.85 : 0.32;
  const debugText = this.text(WIDTH - 10, HEIGHT - 40, `Mode ${currentTravelModeLabel.call(this)}  Enc ${this.settings.encounters ? "ON" : "OFF"}  XP ${this.settings.xpMultiplier}x\nSeed ${this.worldSeed}`, 7, "#9eabc6", "left", {
    wordWrapWidth: 230,
    stroke: "#020714",
    strokeThickness: 1
  });
  debugText.setOrigin(1, 0);
  debugText.setAlpha(alpha);
}

function currentTravelModeLabel(this: CrystalOathSceneContext): "On Foot" | "Boat" | "Airship" {
  if ((this as CrystalOathSceneContext & { airshipTravel?: unknown }).airshipTravel) return "Airship";
  if (this.boatTravel) return "Boat";
  return "On Foot";
}

function minimapPointForWorldPos(layout: WorldMinimapLayout, worldWidth: number, worldHeight: number, pos: Vec): Vec {
  const nx = Phaser.Math.Clamp((pos.x + 0.5) / Math.max(1, worldWidth), 0, 1);
  const ny = Phaser.Math.Clamp((pos.y + 0.5) / Math.max(1, worldHeight), 0, 1);
  return {
    x: Math.round(layout.mapX + nx * (layout.mapWidth - 1)),
    y: Math.round(layout.mapY + ny * (layout.mapHeight - 1))
  };
}

function drawUiPixelRect(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number, color: number, alpha: number, depth: number) {
  const rect = this.add.rectangle(
    Math.round(x) * PIXEL_ART_SCALE,
    Math.round(y) * PIXEL_ART_SCALE,
    Math.max(1, Math.round(w)) * PIXEL_ART_SCALE,
    Math.max(1, Math.round(h)) * PIXEL_ART_SCALE,
    color,
    alpha
  );
  rect.setOrigin(0, 0);
  rect.setDepth(depth);
  rect.setScrollFactor(0);
  this.images.push(rect);
}

export function markDirty(this: CrystalOathSceneContext) {
  this.dirty = true;
}
