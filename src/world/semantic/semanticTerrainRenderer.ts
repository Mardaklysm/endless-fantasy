import type Phaser from "phaser";
import { hashNoise } from "../seededRng.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER, type SemanticWorld } from "./semanticTypes.ts";

export interface SemanticTerrainRenderOptions {
  tileSize: number;
  textureKey?: string;
  debug?: boolean;
}

export interface SemanticTerrainRenderPlan {
  width: number;
  height: number;
  tileSize: number;
  pixelStep: number;
  landCells: number;
  shallowCells: number;
  beachCells: number;
  biomeBoundaryCells: number;
  coastlineCells: number;
}

type Rgb = [number, number, number];

const COLORS = {
  deepOcean: [18, 65, 103] as Rgb,
  deepOceanDark: [11, 46, 82] as Rgb,
  shallow: [54, 153, 184] as Rgb,
  shallowLight: [83, 187, 205] as Rgb,
  foam: [226, 251, 244] as Rgb,
  wetSand: [198, 170, 111] as Rgb,
  beach: [232, 204, 138] as Rgb,
  beachLight: [247, 228, 170] as Rgb,
  grass: [87, 163, 76] as Rgb,
  grassLight: [110, 184, 87] as Rgb,
  grassDark: [61, 128, 62] as Rgb,
  sand: [196, 163, 91] as Rgb,
  sandLight: [219, 190, 116] as Rgb,
  ice: [205, 235, 236] as Rgb,
  iceBlue: [164, 211, 226] as Rgb,
  edgeShadow: [116, 88, 57] as Rgb
};

export function createSemanticTerrainTexture(scene: Phaser.Scene, world: SemanticWorld, options: SemanticTerrainRenderOptions): string {
  const textureKey = options.textureKey ?? `semantic-terrain-${world.seed}`;
  const canvas = createSemanticTerrainCanvas(world, options);
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  scene.textures.addCanvas(textureKey, canvas);
  return textureKey;
}

export function createSemanticTerrainCanvas(world: SemanticWorld, options: SemanticTerrainRenderOptions): HTMLCanvasElement {
  const plan = describeSemanticTerrainRenderPlan(world, options);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create semantic terrain canvas.");
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < plan.height; y += plan.pixelStep) {
    for (let x = 0; x < plan.width; x += plan.pixelStep) {
      const color = terrainColorAtPixel(world, x + plan.pixelStep / 2, y + plan.pixelStep / 2, plan.tileSize);
      ctx.fillStyle = rgbCss(color);
      ctx.fillRect(x, y, plan.pixelStep, plan.pixelStep);
    }
  }

  return canvas;
}

export function describeSemanticTerrainRenderPlan(world: SemanticWorld, options: SemanticTerrainRenderOptions): SemanticTerrainRenderPlan {
  const tileSize = Math.max(1, Math.floor(options.tileSize));
  const pixelStep = Math.max(1, Math.floor(tileSize / 8));
  let landCells = 0;
  let shallowCells = 0;
  let beachCells = 0;
  let biomeBoundaryCells = 0;
  let coastlineCells = 0;

  forEachCell(world, (x, y, i) => {
    if (world.layers.landMask[i]) landCells += 1;
    if (world.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW) shallowCells += 1;
    if (world.layers.biome[i] === SEMANTIC_BIOME.BEACH) beachCells += 1;
    if (touchesDifferentBiome(world, x, y)) biomeBoundaryCells += 1;
    if (touchesLandWaterBoundary(world, x, y)) coastlineCells += 1;
  });

  return {
    width: world.width * tileSize,
    height: world.height * tileSize,
    tileSize,
    pixelStep,
    landCells,
    shallowCells,
    beachCells,
    biomeBoundaryCells,
    coastlineCells
  };
}

function terrainColorAtPixel(world: SemanticWorld, px: number, py: number, tileSize: number): Rgb {
  const gx = px / tileSize - 0.5;
  const gy = py / tileSize - 0.5;
  const land = sampleScalar(world, world.layers.landMask, gx, gy);
  const dLand = sampleScalar(world, world.layers.distanceToLand, gx, gy);
  const dWater = sampleScalar(world, world.layers.distanceToWater, gx, gy);
  const noise = sampleNoise(world.seed, gx, gy);
  const landThreshold = 0.5 + (noise - 0.5) * 0.16;
  const isLand = land > landThreshold;
  const coastBand = clamp01(1 - Math.abs(land - 0.5) / 0.2);

  if (!isLand) {
    const shallow = clamp01(1 - dLand / 5.2) * 0.82 + clamp01((land - 0.12) / 0.4) * 0.34;
    let color = mixColor(COLORS.deepOceanDark, COLORS.deepOcean, 0.66 + noise * 0.2);
    color = mixColor(color, mixColor(COLORS.shallow, COLORS.shallowLight, noise * 0.5), clamp01(shallow));
    if (coastBand > 0.2) color = mixColor(color, COLORS.foam, coastBand * 0.38);
    return addNoise(color, noise, 8);
  }

  const weights = biomeWeights(world, gx, gy);
  const nearCoastBeach = clamp01(1 - dWater / 2.2);
  weights.beach = Math.max(weights.beach, nearCoastBeach * 0.86);
  const total = weights.beach + weights.grass + weights.sand + weights.ice || 1;
  const normalized = {
    beach: weights.beach / total,
    grass: weights.grass / total,
    sand: weights.sand / total,
    ice: weights.ice / total
  };

  let color = weightedColor([
    [mixColor(COLORS.beach, COLORS.beachLight, noise * 0.55), normalized.beach],
    [mixColor(COLORS.grassDark, COLORS.grassLight, 0.35 + noise * 0.45), normalized.grass],
    [mixColor(COLORS.sand, COLORS.sandLight, noise * 0.56), normalized.sand],
    [mixColor(COLORS.iceBlue, COLORS.ice, 0.42 + noise * 0.4), normalized.ice]
  ]);

  if (normalized.beach > 0.18 && normalized.beach < 0.74) {
    color = mixColor(color, COLORS.wetSand, 0.16);
  }
  if (coastBand > 0.18) {
    color = mixColor(color, COLORS.foam, coastBand * 0.22);
    color = mixColor(color, COLORS.edgeShadow, coastBand * 0.08);
  }
  const boundaryStrength = 1 - Math.max(normalized.beach, normalized.grass, normalized.sand, normalized.ice);
  if (boundaryStrength > 0.22) color = mixColor(color, COLORS.beachLight, boundaryStrength * 0.16);
  return addNoise(color, noise, 10);
}

function biomeWeights(world: SemanticWorld, gx: number, gy: number) {
  return {
    beach: sampleBiome(world, gx, gy, SEMANTIC_BIOME.BEACH),
    grass: sampleBiome(world, gx, gy, SEMANTIC_BIOME.GRASS),
    sand: sampleBiome(world, gx, gy, SEMANTIC_BIOME.SAND),
    ice: sampleBiome(world, gx, gy, SEMANTIC_BIOME.ICE)
  };
}

function sampleBiome(world: SemanticWorld, gx: number, gy: number, biome: number): number {
  return sampleVirtualScalar(world, gx, gy, (i) => (world.layers.biome[i] === biome ? 1 : 0));
}

function sampleScalar(world: SemanticWorld, array: ArrayLike<number>, gx: number, gy: number): number {
  return sampleVirtualScalar(world, gx, gy, (i) => array[i]);
}

function sampleVirtualScalar(world: SemanticWorld, gx: number, gy: number, valueAt: (i: number) => number): number {
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const tx = gx - x0;
  const ty = gy - y0;
  const v00 = valueAt(clampedIndex(world, x0, y0));
  const v10 = valueAt(clampedIndex(world, x0 + 1, y0));
  const v01 = valueAt(clampedIndex(world, x0, y0 + 1));
  const v11 = valueAt(clampedIndex(world, x0 + 1, y0 + 1));
  const top = lerp(v00, v10, tx);
  const bottom = lerp(v01, v11, tx);
  return lerp(top, bottom, ty);
}

function clampedIndex(world: SemanticWorld, x: number, y: number): number {
  const cx = Math.max(0, Math.min(world.width - 1, x));
  const cy = Math.max(0, Math.min(world.height - 1, y));
  return cy * world.width + cx;
}

function sampleNoise(seed: string, gx: number, gy: number): number {
  const bx = Math.floor(gx * 2);
  const by = Math.floor(gy * 2);
  const tx = gx * 2 - bx;
  const ty = gy * 2 - by;
  const n00 = hashNoise(`${seed}:semantic-terrain`, bx, by);
  const n10 = hashNoise(`${seed}:semantic-terrain`, bx + 1, by);
  const n01 = hashNoise(`${seed}:semantic-terrain`, bx, by + 1);
  const n11 = hashNoise(`${seed}:semantic-terrain`, bx + 1, by + 1);
  return lerp(lerp(n00, n10, smooth(tx)), lerp(n01, n11, smooth(tx)), smooth(ty));
}

function touchesDifferentBiome(world: SemanticWorld, x: number, y: number): boolean {
  const i = y * world.width + x;
  if (!world.layers.landMask[i]) return false;
  const biome = world.layers.biome[i];
  return neighbors4(x, y).some((next) => {
    if (!inBounds(world, next.x, next.y)) return false;
    const ni = next.y * world.width + next.x;
    return world.layers.landMask[ni] && world.layers.biome[ni] !== biome;
  });
}

function touchesLandWaterBoundary(world: SemanticWorld, x: number, y: number): boolean {
  const i = y * world.width + x;
  return neighbors4(x, y).some((next) => {
    if (!inBounds(world, next.x, next.y)) return false;
    const ni = next.y * world.width + next.x;
    return world.layers.landMask[i] !== world.layers.landMask[ni];
  });
}

function forEachCell(world: SemanticWorld, fn: (x: number, y: number, i: number) => void) {
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) fn(x, y, y * world.width + x);
  }
}

function neighbors4(x: number, y: number) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y }
  ];
}

function inBounds(world: SemanticWorld, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.width && y < world.height;
}

function weightedColor(entries: [Rgb, number][]): Rgb {
  let total = 0;
  const color: Rgb = [0, 0, 0];
  for (const [entryColor, weight] of entries) {
    total += weight;
    color[0] += entryColor[0] * weight;
    color[1] += entryColor[1] * weight;
    color[2] += entryColor[2] * weight;
  }
  if (total <= 0) return COLORS.grass;
  return [color[0] / total, color[1] / total, color[2] / total].map(clamp255) as Rgb;
}

function mixColor(a: Rgb, b: Rgb, t: number): Rgb {
  const value = clamp01(t);
  return [lerp(a[0], b[0], value), lerp(a[1], b[1], value), lerp(a[2], b[2], value)].map(clamp255) as Rgb;
}

function addNoise(color: Rgb, noise: number, amount: number): Rgb {
  const delta = (noise - 0.5) * amount;
  return [color[0] + delta, color[1] + delta, color[2] + delta].map(clamp255) as Rgb;
}

function rgbCss(color: Rgb): string {
  return `rgb(${color[0]},${color[1]},${color[2]})`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
