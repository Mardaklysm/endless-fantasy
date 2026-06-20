import type Phaser from "phaser";
import { hashNoise } from "../seededRng.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER, type SemanticWorld } from "./semanticTypes.ts";

export interface SemanticEdgeOverlayRenderOptions {
  tileSize: number;
  textureKey?: string;
  debug?: boolean;
}

export interface SemanticEdgeOverlayRenderPlan {
  width: number;
  height: number;
  tileSize: number;
  pixelStep: number;
  landCells: number;
  shallowCells: number;
  beachCells: number;
  biomeBoundaryCells: number;
  coastlineCells: number;
  waterBeachBoundaryCells: number;
  sandGrassBoundaryCells: number;
  sandIceBoundaryCells: number;
  grassIceBoundaryCells: number;
}

type Rgb = [number, number, number];
type EdgeSide = "n" | "e" | "s" | "w";

const COLORS = {
  deepOcean: [17, 71, 111] as Rgb,
  deepOceanDark: [9, 43, 78] as Rgb,
  deepWave: [33, 94, 134] as Rgb,
  shallow: [48, 145, 174] as Rgb,
  shallowLight: [91, 190, 208] as Rgb,
  shallowDark: [32, 111, 151] as Rgb,
  foam: [230, 252, 239] as Rgb,
  wetSand: [190, 163, 101] as Rgb,
  beach: [229, 202, 133] as Rgb,
  beachLight: [245, 224, 162] as Rgb,
  beachDark: [182, 146, 82] as Rgb,
  grass: [83, 156, 71] as Rgb,
  grassLight: [107, 180, 82] as Rgb,
  grassDark: [54, 121, 55] as Rgb,
  grassEdge: [72, 136, 55] as Rgb,
  sand: [194, 160, 87] as Rgb,
  sandLight: [218, 188, 112] as Rgb,
  sandDark: [158, 126, 67] as Rgb,
  ice: [203, 234, 235] as Rgb,
  iceLight: [228, 247, 247] as Rgb,
  iceBlue: [151, 203, 222] as Rgb,
  iceEdge: [126, 178, 199] as Rgb,
  edgeShadow: [106, 82, 55] as Rgb
};

const DIRECTIONS: { side: EdgeSide; dx: number; dy: number }[] = [
  { side: "n", dx: 0, dy: -1 },
  { side: "e", dx: 1, dy: 0 },
  { side: "s", dx: 0, dy: 1 },
  { side: "w", dx: -1, dy: 0 }
];

export function createSemanticEdgeOverlayTexture(scene: Phaser.Scene, world: SemanticWorld, options: SemanticEdgeOverlayRenderOptions): string {
  const textureKey = options.textureKey ?? `semantic-edge-overlay-${world.seed}`;
  const canvas = createSemanticEdgeOverlayCanvas(world, options);
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  scene.textures.addCanvas(textureKey, canvas);
  return textureKey;
}

export function createSemanticEdgeOverlayCanvas(world: SemanticWorld, options: SemanticEdgeOverlayRenderOptions): HTMLCanvasElement {
  const plan = describeSemanticEdgeOverlayRenderPlan(world, options);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create semantic edge overlay canvas.");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, plan.width, plan.height);

  drawShallowEdgeOverlay(ctx, world, plan);
  drawCoastEdgeOverlay(ctx, world, plan);
  drawBeachInlandEdgeOverlay(ctx, world, plan);
  drawBiomeBoundaryOverlay(ctx, world, plan);

  return canvas;
}

export function describeSemanticEdgeOverlayRenderPlan(world: SemanticWorld, options: SemanticEdgeOverlayRenderOptions): SemanticEdgeOverlayRenderPlan {
  const tileSize = Math.max(1, Math.floor(options.tileSize));
  const pixelStep = Math.max(1, Math.floor(tileSize / 8));
  let landCells = 0;
  let shallowCells = 0;
  let beachCells = 0;
  let biomeBoundaryCells = 0;
  let coastlineCells = 0;
  let waterBeachBoundaryCells = 0;
  let sandGrassBoundaryCells = 0;
  let sandIceBoundaryCells = 0;
  let grassIceBoundaryCells = 0;

  forEachCell(world, (x, y, i) => {
    if (world.layers.landMask[i]) landCells += 1;
    if (world.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW) shallowCells += 1;
    if (world.layers.biome[i] === SEMANTIC_BIOME.BEACH) beachCells += 1;
    if (touchesDifferentBiome(world, x, y)) biomeBoundaryCells += 1;
    if (touchesLandWaterBoundary(world, x, y)) coastlineCells += 1;
    if (touchesWaterBeachBoundary(world, x, y)) waterBeachBoundaryCells += 1;
    if (touchesBiomePair(world, x, y, isSandLikeBiome, (value) => value === SEMANTIC_BIOME.GRASS)) sandGrassBoundaryCells += 1;
    if (touchesBiomePair(world, x, y, isSandLikeBiome, (value) => value === SEMANTIC_BIOME.ICE)) sandIceBoundaryCells += 1;
    if (touchesBiomePair(world, x, y, (value) => value === SEMANTIC_BIOME.GRASS, (value) => value === SEMANTIC_BIOME.ICE)) grassIceBoundaryCells += 1;
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
    coastlineCells,
    waterBeachBoundaryCells,
    sandGrassBoundaryCells,
    sandIceBoundaryCells,
    grassIceBoundaryCells
  };
}

function drawShallowEdgeOverlay(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticEdgeOverlayRenderPlan) {
  const width = Math.max(1, plan.pixelStep);
  forEachCell(world, (x, y, i) => {
    if (world.layers.landMask[i] || world.layers.waterClass[i] !== SEMANTIC_WATER.SHALLOW) return;
    for (const direction of DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;
      if (!inBounds(world, nx, ny)) continue;
      const ni = indexOf(world, nx, ny);
      if (!world.layers.landMask[ni] && world.layers.waterClass[ni] !== SEMANTIC_WATER.SHALLOW) {
        drawDitheredEdgeStrip(ctx, world, x, y, direction.side, COLORS.shallowLight, 0.34, width, plan, 10);
      }
    }
  });
}

function drawCoastEdgeOverlay(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticEdgeOverlayRenderPlan) {
  const wetWidth = Math.max(2, plan.pixelStep);
  const foamWidth = Math.max(1, Math.floor(plan.pixelStep / 2) || 1);
  forEachCell(world, (x, y, i) => {
    if (!world.layers.landMask[i]) return;
    for (const direction of DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;
      if (!inBounds(world, nx, ny)) continue;
      const ni = indexOf(world, nx, ny);
      if (world.layers.landMask[ni]) continue;
      drawDitheredEdgeStrip(ctx, world, x, y, direction.side, COLORS.wetSand, 0.5, wetWidth, plan, 20);
      drawDitheredEdgeStrip(ctx, world, nx, ny, oppositeSide(direction.side), COLORS.foam, 0.78, foamWidth, plan, 21);
      drawDitheredEdgeStrip(ctx, world, nx, ny, oppositeSide(direction.side), COLORS.shallowLight, 0.24, wetWidth + foamWidth, plan, 22);
    }
  });
}

function drawBeachInlandEdgeOverlay(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticEdgeOverlayRenderPlan) {
  const width = Math.max(2, plan.pixelStep * 2);
  forEachCell(world, (x, y, i) => {
    if (!world.layers.landMask[i]) return;
    const biome = world.layers.biome[i];
    for (const direction of DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;
      if (!inBounds(world, nx, ny)) continue;
      const ni = indexOf(world, nx, ny);
      if (!world.layers.landMask[ni]) continue;
      const neighborBiome = world.layers.biome[ni];
      if (biome === SEMANTIC_BIOME.BEACH && neighborBiome !== SEMANTIC_BIOME.BEACH) {
        drawDitheredEdgeStrip(ctx, world, x, y, direction.side, COLORS.beachDark, 0.42, width, plan, 30);
      }
      if (biome !== SEMANTIC_BIOME.BEACH && neighborBiome === SEMANTIC_BIOME.BEACH) {
        drawDitheredEdgeStrip(ctx, world, x, y, direction.side, biomeEdgeColor(biome), 0.48, width, plan, 31);
      }
    }
  });
}

function drawBiomeBoundaryOverlay(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticEdgeOverlayRenderPlan) {
  const width = Math.max(2, plan.pixelStep * 2);
  forEachCell(world, (x, y, i) => {
    if (!world.layers.landMask[i]) return;
    const biome = world.layers.biome[i];
    if (biome === SEMANTIC_BIOME.BEACH) return;
    for (const direction of DIRECTIONS) {
      const nx = x + direction.dx;
      const ny = y + direction.dy;
      if (!inBounds(world, nx, ny)) continue;
      const ni = indexOf(world, nx, ny);
      if (!world.layers.landMask[ni]) continue;
      const neighborBiome = world.layers.biome[ni];
      if (neighborBiome === biome || neighborBiome === SEMANTIC_BIOME.BEACH) continue;
      drawDitheredEdgeStrip(ctx, world, x, y, direction.side, biomeBoundaryColor(biome, neighborBiome), 0.38, width, plan, 40);
    }
  });
}

function drawDitheredEdgeStrip(
  ctx: CanvasRenderingContext2D,
  world: SemanticWorld,
  x: number,
  y: number,
  side: EdgeSide,
  color: Rgb,
  alpha: number,
  width: number,
  plan: SemanticEdgeOverlayRenderPlan,
  z: number
) {
  const stripWidth = Math.max(1, Math.min(width, Math.floor(plan.tileSize / 3)));
  drawEdgeStrip(ctx, x, y, side, color, alpha * 0.45, stripWidth, plan.tileSize);
  const unit = plan.pixelStep;
  const segments = Math.max(1, Math.ceil(plan.tileSize / unit));
  ctx.fillStyle = rgbaCss(color, alpha);
  for (let s = 0; s < segments; s += 1) {
    const noise = hashNoise(`${world.seed}:terrain-edge`, x * 7 + s, y * 11 + side.charCodeAt(0), z);
    if (noise < 0.34) continue;
    const length = unit * (noise > 0.78 ? 2 : 1);
    const segmentWidth = Math.max(1, stripWidth - (noise > 0.62 ? 0 : Math.floor(stripWidth / 2)));
    drawEdgeSegment(ctx, x, y, side, s * unit, length, segmentWidth, plan.tileSize);
  }
}

function drawEdgeStrip(ctx: CanvasRenderingContext2D, x: number, y: number, side: EdgeSide, color: Rgb, alpha: number, width: number, tileSize: number) {
  ctx.fillStyle = rgbaCss(color, alpha);
  const sx = x * tileSize;
  const sy = y * tileSize;
  switch (side) {
    case "n":
      ctx.fillRect(sx, sy, tileSize, width);
      break;
    case "e":
      ctx.fillRect(sx + tileSize - width, sy, width, tileSize);
      break;
    case "s":
      ctx.fillRect(sx, sy + tileSize - width, tileSize, width);
      break;
    case "w":
      ctx.fillRect(sx, sy, width, tileSize);
      break;
  }
}

function drawEdgeSegment(ctx: CanvasRenderingContext2D, x: number, y: number, side: EdgeSide, offset: number, length: number, width: number, tileSize: number) {
  const sx = x * tileSize;
  const sy = y * tileSize;
  const clippedLength = Math.max(1, Math.min(length, tileSize - offset));
  switch (side) {
    case "n":
      ctx.fillRect(sx + offset, sy, clippedLength, width);
      break;
    case "e":
      ctx.fillRect(sx + tileSize - width, sy + offset, width, clippedLength);
      break;
    case "s":
      ctx.fillRect(sx + offset, sy + tileSize - width, clippedLength, width);
      break;
    case "w":
      ctx.fillRect(sx, sy + offset, width, clippedLength);
      break;
  }
}

function biomeEdgeColor(biome: number): Rgb {
  switch (biome) {
    case SEMANTIC_BIOME.SAND:
      return COLORS.sandDark;
    case SEMANTIC_BIOME.ICE:
      return COLORS.iceEdge;
    case SEMANTIC_BIOME.GRASS:
    default:
      return COLORS.grassEdge;
  }
}

function biomeBoundaryColor(biome: number, neighborBiome: number): Rgb {
  if (biome === SEMANTIC_BIOME.ICE || neighborBiome === SEMANTIC_BIOME.ICE) return COLORS.iceEdge;
  if (biome === SEMANTIC_BIOME.SAND || neighborBiome === SEMANTIC_BIOME.SAND) return COLORS.sandDark;
  return COLORS.grassDark;
}

function touchesDifferentBiome(world: SemanticWorld, x: number, y: number): boolean {
  const i = indexOf(world, x, y);
  if (!world.layers.landMask[i]) return false;
  const biome = world.layers.biome[i];
  return DIRECTIONS.some((direction) => {
    const nx = x + direction.dx;
    const ny = y + direction.dy;
    if (!inBounds(world, nx, ny)) return false;
    const ni = indexOf(world, nx, ny);
    return world.layers.landMask[ni] && world.layers.biome[ni] !== biome;
  });
}

function touchesLandWaterBoundary(world: SemanticWorld, x: number, y: number): boolean {
  const i = indexOf(world, x, y);
  return DIRECTIONS.some((direction) => {
    const nx = x + direction.dx;
    const ny = y + direction.dy;
    if (!inBounds(world, nx, ny)) return false;
    const ni = indexOf(world, nx, ny);
    return world.layers.landMask[i] !== world.layers.landMask[ni];
  });
}

function touchesWaterBeachBoundary(world: SemanticWorld, x: number, y: number): boolean {
  const i = indexOf(world, x, y);
  if (!world.layers.landMask[i] || !isSandLikeBiome(world.layers.biome[i])) return false;
  return DIRECTIONS.some((direction) => {
    const nx = x + direction.dx;
    const ny = y + direction.dy;
    return inBounds(world, nx, ny) && !world.layers.landMask[indexOf(world, nx, ny)];
  });
}

function touchesBiomePair(world: SemanticWorld, x: number, y: number, isA: (value: number) => boolean, isB: (value: number) => boolean): boolean {
  const i = indexOf(world, x, y);
  if (!world.layers.landMask[i]) return false;
  const biome = world.layers.biome[i];
  if (!isA(biome) && !isB(biome)) return false;
  return DIRECTIONS.some((direction) => {
    const nx = x + direction.dx;
    const ny = y + direction.dy;
    if (!inBounds(world, nx, ny)) return false;
    const ni = indexOf(world, nx, ny);
    if (!world.layers.landMask[ni]) return false;
    const neighborBiome = world.layers.biome[ni];
    return (isA(biome) && isB(neighborBiome)) || (isB(biome) && isA(neighborBiome));
  });
}

function isSandLikeBiome(value: number): boolean {
  return value === SEMANTIC_BIOME.BEACH || value === SEMANTIC_BIOME.SAND;
}

function forEachCell(world: SemanticWorld, fn: (x: number, y: number, i: number) => void) {
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) fn(x, y, indexOf(world, x, y));
  }
}

function indexOf(world: SemanticWorld, x: number, y: number): number {
  return y * world.width + x;
}

function inBounds(world: SemanticWorld, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.width && y < world.height;
}

function oppositeSide(side: EdgeSide): EdgeSide {
  switch (side) {
    case "n":
      return "s";
    case "e":
      return "w";
    case "s":
      return "n";
    case "w":
      return "e";
  }
}

function rgbaCss(color: Rgb, alpha: number): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0, Math.min(1, alpha))})`;
}
