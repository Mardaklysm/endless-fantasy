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

  drawTerrainFill(ctx, world, plan);
  drawShallowEdgeOverlay(ctx, world, plan);
  drawCoastEdgeOverlay(ctx, world, plan);
  drawBeachInlandEdgeOverlay(ctx, world, plan);
  drawBiomeBoundaryOverlay(ctx, world, plan);

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

function drawTerrainFill(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticTerrainRenderPlan) {
  ctx.fillStyle = rgbCss(COLORS.deepOceanDark);
  ctx.fillRect(0, 0, plan.width, plan.height);

  forEachCell(world, (x, y, i) => {
    const color = baseColorForCell(world, i);
    const sx = x * plan.tileSize;
    const sy = y * plan.tileSize;
    ctx.fillStyle = rgbCss(color);
    ctx.fillRect(sx, sy, plan.tileSize, plan.tileSize);
    drawCellPattern(ctx, world, x, y, i, plan);
  });
}

function baseColorForCell(world: SemanticWorld, i: number): Rgb {
  if (!world.layers.landMask[i]) {
    return world.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW ? COLORS.shallow : COLORS.deepOcean;
  }
  switch (world.layers.biome[i]) {
    case SEMANTIC_BIOME.BEACH:
      return COLORS.beach;
    case SEMANTIC_BIOME.SAND:
      return COLORS.sand;
    case SEMANTIC_BIOME.ICE:
      return COLORS.ice;
    case SEMANTIC_BIOME.GRASS:
    default:
      return COLORS.grass;
  }
}

function drawCellPattern(ctx: CanvasRenderingContext2D, world: SemanticWorld, x: number, y: number, i: number, plan: SemanticTerrainRenderPlan) {
  const unit = plan.pixelStep;
  const sx = x * plan.tileSize;
  const sy = y * plan.tileSize;
  const n0 = hashNoise(`${world.seed}:terrain-crisp`, x, y, 0);

  if (!world.layers.landMask[i]) {
    const shallow = world.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW;
    ctx.fillStyle = rgbaCss(shallow ? COLORS.shallowLight : COLORS.deepWave, shallow ? 0.32 : 0.24);
    const waves = shallow ? 2 : 3;
    for (let n = 0; n < waves; n += 1) {
      const noise = hashNoise(`${world.seed}:terrain-water`, x, y, n);
      const px = sx + snap(Math.floor(noise * plan.tileSize), unit);
      const py = sy + snap(Math.floor(hashNoise(`${world.seed}:terrain-water-y`, x, y, n) * plan.tileSize), unit);
      const length = Math.max(unit * 2, Math.min(plan.tileSize - unit, unit * (2 + Math.floor(noise * 3))));
      ctx.fillRect(px, py, length, unit);
    }
    if (n0 > 0.74) {
      ctx.fillStyle = rgbaCss(shallow ? COLORS.shallowDark : COLORS.deepOceanDark, 0.22);
      ctx.fillRect(sx + unit, sy + plan.tileSize - unit * 2, plan.tileSize - unit * 2, unit);
    }
    return;
  }

  const biome = world.layers.biome[i];
  if (biome === SEMANTIC_BIOME.GRASS) {
    ctx.fillStyle = rgbaCss(n0 > 0.5 ? COLORS.grassLight : COLORS.grassDark, 0.32);
    for (let n = 0; n < 4; n += 1) {
      const px = sx + snap(Math.floor(hashNoise(`${world.seed}:terrain-grass-x`, x, y, n) * plan.tileSize), unit);
      const py = sy + snap(Math.floor(hashNoise(`${world.seed}:terrain-grass-y`, x, y, n) * plan.tileSize), unit);
      ctx.fillRect(px, py, unit * (n % 2 === 0 ? 2 : 1), unit);
    }
    return;
  }

  if (biome === SEMANTIC_BIOME.BEACH || biome === SEMANTIC_BIOME.SAND) {
    ctx.fillStyle = rgbaCss(biome === SEMANTIC_BIOME.BEACH ? COLORS.beachLight : COLORS.sandLight, 0.25);
    for (let n = 0; n < 3; n += 1) {
      const px = sx + snap(Math.floor(hashNoise(`${world.seed}:terrain-sand-x`, x, y, n) * plan.tileSize), unit);
      const py = sy + snap(Math.floor(hashNoise(`${world.seed}:terrain-sand-y`, x, y, n) * plan.tileSize), unit);
      ctx.fillRect(px, py, unit, unit);
    }
    if (n0 < 0.34) {
      ctx.fillStyle = rgbaCss(biome === SEMANTIC_BIOME.BEACH ? COLORS.beachDark : COLORS.sandDark, 0.24);
      ctx.fillRect(sx + unit * 2, sy + unit * 4, unit * 2, unit);
    }
    return;
  }

  if (biome === SEMANTIC_BIOME.ICE) {
    ctx.fillStyle = rgbaCss(n0 > 0.5 ? COLORS.iceLight : COLORS.iceBlue, 0.28);
    for (let n = 0; n < 3; n += 1) {
      const px = sx + snap(Math.floor(hashNoise(`${world.seed}:terrain-ice-x`, x, y, n) * plan.tileSize), unit);
      const py = sy + snap(Math.floor(hashNoise(`${world.seed}:terrain-ice-y`, x, y, n) * plan.tileSize), unit);
      ctx.fillRect(px, py, unit * 2, unit);
      if (unit > 1) ctx.fillRect(px + unit, py + unit, unit, unit);
    }
  }
}

function drawShallowEdgeOverlay(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticTerrainRenderPlan) {
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

function drawCoastEdgeOverlay(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticTerrainRenderPlan) {
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

function drawBeachInlandEdgeOverlay(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticTerrainRenderPlan) {
  const width = Math.max(1, plan.pixelStep);
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
        drawDitheredEdgeStrip(ctx, world, x, y, direction.side, COLORS.beachLight, 0.32, width, plan, 30);
      }
      if (biome !== SEMANTIC_BIOME.BEACH && neighborBiome === SEMANTIC_BIOME.BEACH) {
        drawDitheredEdgeStrip(ctx, world, x, y, direction.side, biomeEdgeColor(biome), 0.34, width, plan, 31);
      }
    }
  });
}

function drawBiomeBoundaryOverlay(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticTerrainRenderPlan) {
  const width = Math.max(1, plan.pixelStep);
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
      drawDitheredEdgeStrip(ctx, world, x, y, direction.side, biomeBoundaryColor(biome, neighborBiome), 0.28, width, plan, 40);
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
  plan: SemanticTerrainRenderPlan,
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

function snap(value: number, unit: number): number {
  return Math.floor(value / unit) * unit;
}

function rgbCss(color: Rgb): string {
  return `rgb(${color[0]},${color[1]},${color[2]})`;
}

function rgbaCss(color: Rgb, alpha: number): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0, Math.min(1, alpha))})`;
}
