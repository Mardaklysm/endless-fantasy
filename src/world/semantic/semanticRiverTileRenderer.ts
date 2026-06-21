import type Phaser from "phaser";
import type { SemanticWorld } from "./semanticTypes.ts";

export type SemanticRiverTileKind = "isolated" | "end" | "straight" | "corner" | "junction" | "cross";

export interface SemanticRiverTileSource {
  image: CanvasImageSource;
  width: number;
  height: number;
  cellSize?: number;
  label?: string;
}

export interface SemanticRiverTileRenderOptions {
  tileSize: number;
  textureKey?: string;
  riverTileSource?: SemanticRiverTileSource;
}

export interface SemanticRiverTileRenderPlan {
  width: number;
  height: number;
  tileSize: number;
  riverTileCount: number;
  sourceEndTileCount: number;
  cornerTileCount: number;
  straightTileCount: number;
  junctionTileCount: number;
  crossingTileCount: number;
  bridgeTileCount: number;
  sourceMappedTileCount: number;
  fallbackTileCount: number;
  oldProgrammaticRiverSegments: number;
  connectivityCounts: Record<string, number>;
}

const RIVER_NORTH = 1;
const RIVER_EAST = 2;
const RIVER_SOUTH = 4;
const RIVER_WEST = 8;
const DEFAULT_SOURCE_CELL_SIZE = 32;
type RiverFillStyle = CanvasPattern | string;

export function createSemanticRiverTileOverlayTexture(scene: Phaser.Scene, world: SemanticWorld, options: SemanticRiverTileRenderOptions): string {
  const textureKey = options.textureKey ?? `semantic-river-tile-overlay-${world.seed}`;
  const canvas = createSemanticRiverTileOverlayCanvas(world, options);
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  scene.textures.addCanvas(textureKey, canvas);
  return textureKey;
}

export function createSemanticRiverTileOverlayCanvas(world: SemanticWorld, options: SemanticRiverTileRenderOptions): HTMLCanvasElement {
  const plan = describeSemanticRiverTileRenderPlan(world, options);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create semantic river tile overlay canvas.");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, plan.width, plan.height);

  const source = normalizedRiverTileSource(options.riverTileSource);
  const riverFill = createRiverMaterialFill(ctx, source);
  const waterWidth = Math.max(10, Math.round(plan.tileSize * 0.52));
  const bankWidth = Math.max(1, Math.min(Math.max(1, plan.tileSize - 2), Math.max(waterWidth + 6, Math.round(plan.tileSize * 0.72))));
  const highlightWidth = Math.max(3, Math.round(waterWidth * 0.28));
  forEachRiverTile(world, (x, y) => {
    const mask = riverConnectivityMaskAt(world, x, y);
    const px = x * plan.tileSize;
    const py = y * plan.tileSize;
    drawDirectionalRiverShape(ctx, px, py, plan.tileSize, mask, bankWidth, "rgba(20, 79, 111, 0.52)");
    drawDirectionalRiverShape(ctx, px, py, plan.tileSize, mask, waterWidth, riverFill);
    drawDirectionalRiverShape(ctx, px, py, plan.tileSize, mask, highlightWidth, "rgba(169, 225, 235, 0.22)");
  });

  return canvas;
}

export function describeSemanticRiverTileRenderPlan(world: SemanticWorld, options: SemanticRiverTileRenderOptions): SemanticRiverTileRenderPlan {
  const tileSize = Math.max(1, Math.floor(options.tileSize));
  const bridgeKeys = new Set(world.bridgeCandidates.map((bridge) => `${bridge.x},${bridge.y}`));
  const connectivityCounts: Record<string, number> = {};
  let riverTileCount = 0;
  let sourceEndTileCount = 0;
  let cornerTileCount = 0;
  let straightTileCount = 0;
  let junctionTileCount = 0;
  let crossingTileCount = 0;
  let bridgeTileCount = 0;
  forEachRiverTile(world, (x, y) => {
    riverTileCount += 1;
    if (bridgeKeys.has(`${x},${y}`)) bridgeTileCount += 1;
    const mask = riverConnectivityMaskAt(world, x, y);
    connectivityCounts[mask.toString(16)] = (connectivityCounts[mask.toString(16)] ?? 0) + 1;
    const kind = riverTileKindForMask(mask);
    if (kind === "end" || kind === "isolated") sourceEndTileCount += 1;
    else if (kind === "corner") cornerTileCount += 1;
    else if (kind === "straight") straightTileCount += 1;
    else if (kind === "junction") junctionTileCount += 1;
    else if (kind === "cross") crossingTileCount += 1;
  });
  const source = normalizedRiverTileSource(options.riverTileSource);
  return {
    width: world.width * tileSize,
    height: world.height * tileSize,
    tileSize,
    riverTileCount,
    sourceEndTileCount,
    cornerTileCount,
    straightTileCount,
    junctionTileCount,
    crossingTileCount,
    bridgeTileCount,
    sourceMappedTileCount: source ? riverTileCount : 0,
    fallbackTileCount: source ? 0 : riverTileCount,
    oldProgrammaticRiverSegments: 0,
    connectivityCounts
  };
}

export function riverConnectivityMaskAt(world: SemanticWorld, x: number, y: number): number {
  let mask = 0;
  if (isRiverTile(world, x, y - 1)) mask |= RIVER_NORTH;
  if (isRiverTile(world, x + 1, y)) mask |= RIVER_EAST;
  if (isRiverTile(world, x, y + 1)) mask |= RIVER_SOUTH;
  if (isRiverTile(world, x - 1, y)) mask |= RIVER_WEST;
  return mask;
}

export function riverTileKindForMask(mask: number): SemanticRiverTileKind {
  const count = bitCount(mask);
  if (count === 0) return "isolated";
  if (count === 1) return "end";
  if (count === 2) return mask === (RIVER_NORTH | RIVER_SOUTH) || mask === (RIVER_EAST | RIVER_WEST) ? "straight" : "corner";
  if (count === 3) return "junction";
  return "cross";
}

function normalizedRiverTileSource(source?: SemanticRiverTileSource): Required<SemanticRiverTileSource> | undefined {
  if (!source || source.width <= 0 || source.height <= 0) return undefined;
  const cellSize = Math.max(1, Math.floor(source.cellSize ?? DEFAULT_SOURCE_CELL_SIZE));
  return {
    ...source,
    cellSize,
    label: source.label ?? "freshwater"
  };
}

function createRiverMaterialFill(ctx: CanvasRenderingContext2D, source?: Required<SemanticRiverTileSource>): RiverFillStyle {
  if (!source) return "#2c8fbe";
  return ctx.createPattern(source.image, "repeat") ?? "#2c8fbe";
}

function drawDirectionalRiverShape(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  tileSize: number,
  mask: number,
  width: number,
  fillStyle: RiverFillStyle
) {
  const half = Math.floor(tileSize / 2);
  const radius = Math.floor(width / 2);
  const centerX = px + half;
  const centerY = py + half;
  const left = centerX - radius;
  const top = centerY - radius;
  const size = Math.max(1, width);

  ctx.fillStyle = fillStyle;
  ctx.fillRect(left, top, size, size);
  if (mask === 0) return;
  if (mask & RIVER_NORTH) ctx.fillRect(left, py, size, half + radius);
  if (mask & RIVER_EAST) ctx.fillRect(centerX - radius, top, half + radius, size);
  if (mask & RIVER_SOUTH) ctx.fillRect(left, centerY - radius, size, tileSize - half + radius);
  if (mask & RIVER_WEST) ctx.fillRect(px, top, half + radius, size);
}

function forEachRiverTile(world: SemanticWorld, callback: (x: number, y: number, i: number) => void) {
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = y * world.width + x;
      if (world.layers.riverMap[i]) callback(x, y, i);
    }
  }
}

function isRiverTile(world: SemanticWorld, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.width && y < world.height && world.layers.riverMap[y * world.width + x] === 1;
}

function bitCount(value: number): number {
  let count = 0;
  let working = value;
  while (working > 0) {
    count += working & 1;
    working >>= 1;
  }
  return count;
}
