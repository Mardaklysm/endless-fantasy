import type Phaser from "phaser";
import { hashNoise } from "../seededRng.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER, type SemanticWorld } from "./semanticTypes.ts";

export type SemanticMaskTerrainClass = "deepOcean" | "shallowWater" | "freshWater" | "road" | "beach" | "grassland" | "sand" | "ice";
export type SemanticMaskTerrainSources = Partial<Record<SemanticMaskTerrainClass, CanvasImageSource & { width: number; height: number }>>;

export interface SemanticMaskTerrainRenderOptions {
  tileSize: number;
  textureKey?: string;
  terrainSources?: SemanticMaskTerrainSources;
  terrainSourceLabels?: Partial<Record<SemanticMaskTerrainClass, string>>;
  maskPixelsPerCell?: number;
}

export interface SemanticMaskTerrainRenderPlan {
  width: number;
  height: number;
  tileSize: number;
  maskPixelsPerCell: number;
  pixelBlock: number;
  maskWidth: number;
  maskHeight: number;
  classSamples: Record<SemanticMaskTerrainClass, number>;
  waterBeachBoundarySamples: number;
  waterGrassBoundarySamples: number;
  waterIceBoundarySamples: number;
  roadBoundarySamples: number;
  sandGrassBoundarySamples: number;
  sandIceBoundarySamples: number;
  grassIceBoundarySamples: number;
  textureSourceLabels: Record<SemanticMaskTerrainClass, string>;
}

type TerrainClassId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Rgb = [number, number, number];
type BoundaryKind =
  | "deepShallow"
  | "waterBeach"
  | "waterGrass"
  | "waterIce"
  | "roadBoundary"
  | "sandGrass"
  | "sandIce"
  | "grassIce";

const TERRAIN_CLASS_IDS = {
  deepOcean: 0,
  shallowWater: 1,
  freshWater: 2,
  road: 3,
  beach: 4,
  grassland: 5,
  sand: 6,
  ice: 7
} as const satisfies Record<SemanticMaskTerrainClass, TerrainClassId>;

const TERRAIN_CLASSES = ["deepOcean", "shallowWater", "freshWater", "road", "beach", "grassland", "sand", "ice"] as const satisfies readonly SemanticMaskTerrainClass[];

export const SEMANTIC_MASK_TERRAIN_CLASSES = TERRAIN_CLASSES;

const COLORS = {
  deepOcean: [12, 54, 92] as Rgb,
  shallowWater: [52, 149, 179] as Rgb,
  freshWater: [54, 147, 183] as Rgb,
  shallowEdge: [93, 196, 213] as Rgb,
  foam: [234, 251, 237] as Rgb,
  wetSand: [178, 146, 86] as Rgb,
  beachEdge: [202, 158, 87] as Rgb,
  grassEdge: [70, 138, 58] as Rgb,
  roadEdge: [159, 120, 67] as Rgb,
  roadDust: [214, 169, 103] as Rgb,
  roadPebble: [119, 103, 84] as Rgb,
  roadGrassFleck: [92, 139, 64] as Rgb,
  sandEdge: [167, 129, 66] as Rgb,
  iceEdge: [134, 190, 207] as Rgb,
  frost: [231, 251, 252] as Rgb
};

export function createSemanticMaskTerrainTexture(scene: Phaser.Scene, world: SemanticWorld, options: SemanticMaskTerrainRenderOptions): string {
  const textureKey = options.textureKey ?? `semantic-mask-terrain-${world.seed}`;
  const canvas = createSemanticMaskTerrainCanvas(world, options);
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  scene.textures.addCanvas(textureKey, canvas);
  return textureKey;
}

export function createSemanticMaskTerrainCanvas(world: SemanticWorld, options: SemanticMaskTerrainRenderOptions): HTMLCanvasElement {
  const plan = describeSemanticMaskTerrainRenderPlan(world, options);
  const classGrid = buildMaskClassGrid(world, plan);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create semantic mask terrain canvas.");
  ctx.imageSmoothingEnabled = false;

  const fillStyles = createTerrainFillStyles(ctx, options.terrainSources, plan.tileSize);
  fillFullTerrain(ctx, fillStyles.deepOcean, plan.width, plan.height);
  for (const terrainClass of TERRAIN_CLASSES) {
    if (terrainClass === "deepOcean") continue;
    drawMaskedTerrainClass(ctx, plan, classGrid, TERRAIN_CLASS_IDS[terrainClass], fillStyles[terrainClass]);
  }
  drawMaskBoundaryAccents(ctx, world, plan, classGrid);

  return canvas;
}

export function describeSemanticMaskTerrainRenderPlan(world: SemanticWorld, options: SemanticMaskTerrainRenderOptions): SemanticMaskTerrainRenderPlan {
  const tileSize = Math.max(1, Math.floor(options.tileSize));
  const maskPixelsPerCell = chooseMaskPixelsPerCell(tileSize, options.maskPixelsPerCell ?? 16);
  const pixelBlock = tileSize / maskPixelsPerCell;
  const maskWidth = world.width * maskPixelsPerCell;
  const maskHeight = world.height * maskPixelsPerCell;
  const classGrid = buildMaskClassGrid(world, {
    maskPixelsPerCell,
    maskWidth,
    maskHeight
  });
  const classSamples = emptyClassSamples();
  let waterBeachBoundarySamples = 0;
  let waterGrassBoundarySamples = 0;
  let waterIceBoundarySamples = 0;
  let roadBoundarySamples = 0;
  let sandGrassBoundarySamples = 0;
  let sandIceBoundarySamples = 0;
  let grassIceBoundarySamples = 0;

  for (let y = 0; y < maskHeight; y += 1) {
    for (let x = 0; x < maskWidth; x += 1) {
      const current = terrainClassAt(classGrid, y * maskWidth + x);
      classSamples[classNameForId(current)] += 1;
      if (x < maskWidth - 1) {
        const east = terrainClassAt(classGrid, y * maskWidth + x + 1);
        const boundary = boundaryKind(current, east);
        if (boundary === "waterBeach") waterBeachBoundarySamples += 1;
        if (boundary === "waterGrass") waterGrassBoundarySamples += 1;
        if (boundary === "waterIce") waterIceBoundarySamples += 1;
        if (boundary === "roadBoundary") roadBoundarySamples += 1;
        if (boundary === "sandGrass") sandGrassBoundarySamples += 1;
        if (boundary === "sandIce") sandIceBoundarySamples += 1;
        if (boundary === "grassIce") grassIceBoundarySamples += 1;
      }
      if (y < maskHeight - 1) {
        const south = terrainClassAt(classGrid, (y + 1) * maskWidth + x);
        const boundary = boundaryKind(current, south);
        if (boundary === "waterBeach") waterBeachBoundarySamples += 1;
        if (boundary === "waterGrass") waterGrassBoundarySamples += 1;
        if (boundary === "waterIce") waterIceBoundarySamples += 1;
        if (boundary === "roadBoundary") roadBoundarySamples += 1;
        if (boundary === "sandGrass") sandGrassBoundarySamples += 1;
        if (boundary === "sandIce") sandIceBoundarySamples += 1;
        if (boundary === "grassIce") grassIceBoundarySamples += 1;
      }
    }
  }

  return {
    width: world.width * tileSize,
    height: world.height * tileSize,
    tileSize,
    maskPixelsPerCell,
    pixelBlock,
    maskWidth,
    maskHeight,
    classSamples,
    waterBeachBoundarySamples,
    waterGrassBoundarySamples,
    waterIceBoundarySamples,
    roadBoundarySamples,
    sandGrassBoundarySamples,
    sandIceBoundarySamples,
    grassIceBoundarySamples,
    textureSourceLabels: terrainTextureSourceLabels(options)
  };
}

function buildMaskClassGrid(world: SemanticWorld, plan: Pick<SemanticMaskTerrainRenderPlan, "maskWidth" | "maskHeight" | "maskPixelsPerCell">): Uint8Array {
  const classGrid = new Uint8Array(plan.maskWidth * plan.maskHeight);
  for (let my = 0; my < plan.maskHeight; my += 1) {
    for (let mx = 0; mx < plan.maskWidth; mx += 1) {
      const sampleX = (mx + 0.5) / plan.maskPixelsPerCell;
      const sampleY = (my + 0.5) / plan.maskPixelsPerCell;
      classGrid[my * plan.maskWidth + mx] = classifySample(world, sampleX, sampleY);
    }
  }
  return classGrid;
}

function classifySample(world: SemanticWorld, sampleX: number, sampleY: number): TerrainClassId {
  const noiseX = Math.floor(sampleX * 8);
  const noiseY = Math.floor(sampleY * 8);
  const boundaryNoise = hashNoise(`${world.seed}:mask-terrain-boundary`, noiseX, noiseY, 0) - 0.5;

  const roadEdgeNoise = hashNoise(`${world.seed}:mask-road-edge`, noiseX, noiseY, 1);
  const roadCoreHit = routeMaskSample(world, world.layers.roadMap, sampleX, sampleY, 0.105);
  const roadEdgeHit = !roadCoreHit && roadEdgeNoise > 0.34 && routeMaskSample(world, world.layers.roadMap, sampleX, sampleY, 0.152);
  const roadHit = roadCoreHit || roadEdgeHit;
  const riverHit = routeMaskSample(world, world.layers.riverMap, sampleX, sampleY, 0.27);
  const crossingHit = routeMaskSample(world, world.layers.riverCrossingMap, sampleX, sampleY, 0.18);
  if (roadHit && (!riverHit || crossingHit)) return TERRAIN_CLASS_IDS.road;

  const lakeScore = samplePredicate(world, world.layers.lakeMap, sampleX, sampleY, (value) => value > 0);
  if (riverHit || lakeScore + boundaryNoise * 0.08 > 0.32) {
    return TERRAIN_CLASS_IDS.freshWater;
  }

  const landScore = samplePredicate(world, world.layers.landMask, sampleX, sampleY, (value) => value > 0);
  if (landScore + boundaryNoise * 0.14 < 0.48) {
    const shallowScore = samplePredicate(world, world.layers.waterClass, sampleX, sampleY, (value) => value === SEMANTIC_WATER.SHALLOW || value === SEMANTIC_WATER.LAKE);
    return shallowScore + boundaryNoise * 0.08 > 0.36 ? TERRAIN_CLASS_IDS.shallowWater : TERRAIN_CLASS_IDS.deepOcean;
  }

  const beachScore = sampleBiome(world, sampleX, sampleY, SEMANTIC_BIOME.BEACH);
  const grassScore = sampleBiome(world, sampleX, sampleY, SEMANTIC_BIOME.GRASS);
  const sandScore = sampleBiome(world, sampleX, sampleY, SEMANTIC_BIOME.SAND);
  const iceScore = sampleBiome(world, sampleX, sampleY, SEMANTIC_BIOME.ICE);
  const distanceToWater = sampleNumeric(world, world.layers.distanceToWater, sampleX, sampleY);
  const coastBoost = Math.max(0, 2.2 - distanceToWater) * 0.13;
  const beachValue = beachScore + coastBoost + boundaryNoise * 0.08;
  const inlandMax = Math.max(grassScore, sandScore, iceScore);
  if (beachValue > 0.28 && beachValue >= inlandMax - 0.14) return TERRAIN_CLASS_IDS.beach;
  if (iceScore >= grassScore && iceScore >= sandScore) return TERRAIN_CLASS_IDS.ice;
  if (sandScore >= grassScore && sandScore >= iceScore) return TERRAIN_CLASS_IDS.sand;
  return TERRAIN_CLASS_IDS.grassland;
}

function routeMaskSample(world: SemanticWorld, values: ArrayLike<number>, sampleX: number, sampleY: number, halfWidth: number): boolean {
  const x = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const y = clampInt(Math.floor(sampleY), 0, world.height - 1);
  if (values[y * world.width + x] <= 0) return false;
  const localX = sampleX - x;
  const localY = sampleY - y;
  const centeredX = Math.abs(localX - 0.5);
  const centeredY = Math.abs(localY - 0.5);
  const north = routeCellAt(world, values, x, y - 1);
  const east = routeCellAt(world, values, x + 1, y);
  const south = routeCellAt(world, values, x, y + 1);
  const west = routeCellAt(world, values, x - 1, y);
  const northEast = routeCellAt(world, values, x + 1, y - 1);
  const southEast = routeCellAt(world, values, x + 1, y + 1);
  const southWest = routeCellAt(world, values, x - 1, y + 1);
  const northWest = routeCellAt(world, values, x - 1, y - 1);
  const hasNeighbor = north || east || south || west || northEast || southEast || southWest || northWest;
  if (!hasNeighbor) return Math.hypot(centeredX, centeredY) <= halfWidth * 1.45;
  if (Math.hypot(centeredX, centeredY) <= halfWidth * 1.2) return true;
  if (north && centeredX <= halfWidth && localY <= 0.5) return true;
  if (south && centeredX <= halfWidth && localY >= 0.5) return true;
  if (west && centeredY <= halfWidth && localX <= 0.5) return true;
  if (east && centeredY <= halfWidth && localX >= 0.5) return true;
  if (northEast && diagonalRouteHit(localX, localY, 1, -1, halfWidth)) return true;
  if (southEast && diagonalRouteHit(localX, localY, 1, 1, halfWidth)) return true;
  if (southWest && diagonalRouteHit(localX, localY, -1, 1, halfWidth)) return true;
  if (northWest && diagonalRouteHit(localX, localY, -1, -1, halfWidth)) return true;
  return false;
}

function diagonalRouteHit(localX: number, localY: number, dx: -1 | 1, dy: -1 | 1, halfWidth: number): boolean {
  const ax = 0.5;
  const ay = 0.5;
  const vx = dx;
  const vy = dy;
  const projection = ((localX - ax) * vx + (localY - ay) * vy) / 2;
  if (projection < 0 || projection > 0.5) return false;
  const closestX = ax + vx * projection;
  const closestY = ay + vy * projection;
  return Math.hypot(localX - closestX, localY - closestY) <= halfWidth;
}

function routeCellAt(world: SemanticWorld, values: ArrayLike<number>, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.width && y < world.height && values[y * world.width + x] > 0;
}

function createTerrainFillStyles(
  ctx: CanvasRenderingContext2D,
  terrainSources: SemanticMaskTerrainSources | undefined,
  tileSize: number
): Record<SemanticMaskTerrainClass, CanvasPattern | string> {
  return {
    deepOcean: createTerrainPattern(ctx, terrainSources?.deepOcean, tileSize, COLORS.deepOcean),
    shallowWater: createTerrainPattern(ctx, terrainSources?.shallowWater, tileSize, COLORS.shallowWater),
    freshWater: createTerrainPattern(ctx, terrainSources?.freshWater, tileSize, COLORS.freshWater),
    road: createRoadTrailPattern(ctx, tileSize),
    beach: createTerrainPattern(ctx, terrainSources?.beach, tileSize, COLORS.beachEdge),
    grassland: createTerrainPattern(ctx, terrainSources?.grassland, tileSize, COLORS.grassEdge),
    sand: createTerrainPattern(ctx, terrainSources?.sand, tileSize, COLORS.sandEdge),
    ice: createTerrainPattern(ctx, terrainSources?.ice, tileSize, COLORS.frost)
  };
}

function createTerrainPattern(
  ctx: CanvasRenderingContext2D,
  source: (CanvasImageSource & { width: number; height: number }) | undefined,
  tileSize: number,
  fallbackColor: Rgb
): CanvasPattern | string {
  if (!source) return rgbCss(fallbackColor);
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = tileSize;
  patternCanvas.height = tileSize;
  const patternCtx = patternCanvas.getContext("2d");
  if (!patternCtx) return rgbCss(fallbackColor);
  patternCtx.imageSmoothingEnabled = false;
  patternCtx.drawImage(source, 0, 0, source.width, source.height, 0, 0, tileSize, tileSize);
  return ctx.createPattern(patternCanvas, "repeat") ?? rgbCss(fallbackColor);
}

function createRoadTrailPattern(ctx: CanvasRenderingContext2D, tileSize: number): CanvasPattern | string {
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = tileSize;
  patternCanvas.height = tileSize;
  const patternCtx = patternCanvas.getContext("2d");
  if (!patternCtx) return rgbCss(COLORS.roadDust);
  patternCtx.imageSmoothingEnabled = false;
  patternCtx.fillStyle = rgbCss(COLORS.roadDust);
  patternCtx.fillRect(0, 0, tileSize, tileSize);
  const block = Math.max(1, Math.floor(tileSize / 16));
  for (let y = 0; y < tileSize; y += block) {
    for (let x = 0; x < tileSize; x += block) {
      const noise = hashNoise("semantic-road-trail-pattern", x, y);
      if (noise < 0.035) patternCtx.fillStyle = rgbaCss(COLORS.roadPebble, 0.36);
      else if (noise > 0.9) patternCtx.fillStyle = "rgba(246, 205, 132, 0.22)";
      else continue;
      patternCtx.fillRect(x, y, block, block);
    }
  }
  return ctx.createPattern(patternCanvas, "repeat") ?? rgbCss(COLORS.roadDust);
}

function terrainTextureSourceLabels(options: SemanticMaskTerrainRenderOptions): Record<SemanticMaskTerrainClass, string> {
  return {
    deepOcean: terrainTextureSourceLabel(options, "deepOcean"),
    shallowWater: terrainTextureSourceLabel(options, "shallowWater"),
    freshWater: terrainTextureSourceLabel(options, "freshWater"),
    road: terrainTextureSourceLabel(options, "road"),
    beach: terrainTextureSourceLabel(options, "beach"),
    grassland: terrainTextureSourceLabel(options, "grassland"),
    sand: terrainTextureSourceLabel(options, "sand"),
    ice: terrainTextureSourceLabel(options, "ice")
  };
}

function terrainTextureSourceLabel(options: SemanticMaskTerrainRenderOptions, terrainClass: SemanticMaskTerrainClass): string {
  return options.terrainSourceLabels?.[terrainClass] ?? (options.terrainSources?.[terrainClass] ? "runtime-texture" : "fallback-color");
}

function fillFullTerrain(ctx: CanvasRenderingContext2D, fillStyle: CanvasPattern | string, width: number, height: number) {
  ctx.save();
  ctx.fillStyle = fillStyle;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawMaskedTerrainClass(
  ctx: CanvasRenderingContext2D,
  plan: SemanticMaskTerrainRenderPlan,
  classGrid: Uint8Array,
  terrainClass: TerrainClassId,
  fillStyle: CanvasPattern | string
) {
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = plan.width;
  maskCanvas.height = plan.height;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) throw new Error("Unable to create semantic terrain mask canvas.");
  maskCtx.imageSmoothingEnabled = false;
  maskCtx.fillStyle = "#ffffff";
  for (let my = 0; my < plan.maskHeight; my += 1) {
    for (let mx = 0; mx < plan.maskWidth; mx += 1) {
      if (terrainClassAt(classGrid, my * plan.maskWidth + mx) !== terrainClass) continue;
      maskCtx.fillRect(mx * plan.pixelBlock, my * plan.pixelBlock, plan.pixelBlock, plan.pixelBlock);
    }
  }

  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = plan.width;
  layerCanvas.height = plan.height;
  const layerCtx = layerCanvas.getContext("2d");
  if (!layerCtx) throw new Error("Unable to create semantic terrain layer canvas.");
  layerCtx.imageSmoothingEnabled = false;
  layerCtx.fillStyle = fillStyle;
  layerCtx.fillRect(0, 0, plan.width, plan.height);
  layerCtx.globalCompositeOperation = "destination-in";
  layerCtx.drawImage(maskCanvas, 0, 0);
  layerCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(layerCanvas, 0, 0);
}

function drawMaskBoundaryAccents(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticMaskTerrainRenderPlan, classGrid: Uint8Array) {
  const lineWidth = Math.max(1, Math.floor(plan.pixelBlock));
  const accentWidth = Math.max(1, Math.floor(plan.pixelBlock * 2));
  for (let my = 0; my < plan.maskHeight; my += 1) {
    for (let mx = 0; mx < plan.maskWidth; mx += 1) {
      const current = terrainClassAt(classGrid, my * plan.maskWidth + mx);
      if (mx < plan.maskWidth - 1) {
        const east = terrainClassAt(classGrid, my * plan.maskWidth + mx + 1);
        if (current !== east) drawBoundaryPair(ctx, world, plan, mx, my, "e", current, east, lineWidth, accentWidth);
      }
      if (my < plan.maskHeight - 1) {
        const south = terrainClassAt(classGrid, (my + 1) * plan.maskWidth + mx);
        if (current !== south) drawBoundaryPair(ctx, world, plan, mx, my, "s", current, south, lineWidth, accentWidth);
      }
    }
  }
}

function drawBoundaryPair(
  ctx: CanvasRenderingContext2D,
  world: SemanticWorld,
  plan: SemanticMaskTerrainRenderPlan,
  mx: number,
  my: number,
  side: "e" | "s",
  current: TerrainClassId,
  next: TerrainClassId,
  lineWidth: number,
  accentWidth: number
) {
  const boundary = boundaryKind(current, next);
  if (!boundary) return;
  const x = side === "e" ? (mx + 1) * plan.pixelBlock : mx * plan.pixelBlock;
  const y = side === "s" ? (my + 1) * plan.pixelBlock : my * plan.pixelBlock;
  const length = plan.pixelBlock;
  const noise = hashNoise(`${world.seed}:mask-boundary-accent`, mx, my, side === "e" ? 1 : 2);
  if (noise < 0.08 && boundary !== "waterBeach" && boundary !== "waterGrass" && boundary !== "waterIce") return;

  if (boundary === "deepShallow") {
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, COLORS.shallowEdge, 0.2);
    return;
  }
  if (boundary === "waterBeach") {
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.shallowEdge, 0.2);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, COLORS.foam, 0.72);
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.wetSand, 0.22);
    return;
  }
  if (boundary === "waterGrass") {
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.shallowEdge, 0.18);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, COLORS.wetSand, 0.2);
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.grassEdge, 0.2);
    return;
  }
  if (boundary === "waterIce") {
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.shallowEdge, 0.18);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, COLORS.frost, 0.44);
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.iceEdge, 0.2);
    return;
  }
  if (boundary === "roadBoundary") {
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, COLORS.roadEdge, 0.1);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, COLORS.roadDust, 0.12);
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.roadGrassFleck, 0.08);
    return;
  }
  if (boundary === "sandGrass") {
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.beachEdge, 0.32);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, COLORS.grassEdge, 0.28);
    return;
  }
  if (boundary === "sandIce") {
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.frost, 0.38);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, COLORS.sandEdge, 0.26);
    return;
  }
  if (boundary === "grassIce") {
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, COLORS.iceEdge, 0.34);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, COLORS.frost, 0.24);
    return;
  }
}

function drawBoundaryStrip(ctx: CanvasRenderingContext2D, x: number, y: number, side: "e" | "s", length: number, width: number, color: Rgb, alpha: number) {
  ctx.fillStyle = rgbaCss(color, alpha);
  if (side === "e") ctx.fillRect(x - Math.floor(width / 2), y, width, length);
  else ctx.fillRect(x, y - Math.floor(width / 2), length, width);
}

function boundaryKind(
  a: TerrainClassId,
  b: TerrainClassId
): BoundaryKind | undefined {
  if ((a === TERRAIN_CLASS_IDS.deepOcean && b === TERRAIN_CLASS_IDS.shallowWater) || (b === TERRAIN_CLASS_IDS.deepOcean && a === TERRAIN_CLASS_IDS.shallowWater)) return "deepShallow";
  if ((isWater(a) && isSandLike(b)) || (isWater(b) && isSandLike(a))) return "waterBeach";
  if ((isWater(a) && b === TERRAIN_CLASS_IDS.grassland) || (isWater(b) && a === TERRAIN_CLASS_IDS.grassland)) return "waterGrass";
  if ((isWater(a) && b === TERRAIN_CLASS_IDS.ice) || (isWater(b) && a === TERRAIN_CLASS_IDS.ice)) return "waterIce";
  if ((a === TERRAIN_CLASS_IDS.road && b !== TERRAIN_CLASS_IDS.road) || (b === TERRAIN_CLASS_IDS.road && a !== TERRAIN_CLASS_IDS.road)) return "roadBoundary";
  if ((isSandLike(a) && b === TERRAIN_CLASS_IDS.grassland) || (isSandLike(b) && a === TERRAIN_CLASS_IDS.grassland)) return "sandGrass";
  if ((isSandLike(a) && b === TERRAIN_CLASS_IDS.ice) || (isSandLike(b) && a === TERRAIN_CLASS_IDS.ice)) return "sandIce";
  if ((a === TERRAIN_CLASS_IDS.grassland && b === TERRAIN_CLASS_IDS.ice) || (b === TERRAIN_CLASS_IDS.grassland && a === TERRAIN_CLASS_IDS.ice)) return "grassIce";
  return undefined;
}

function isWater(value: TerrainClassId): boolean {
  return value === TERRAIN_CLASS_IDS.deepOcean || value === TERRAIN_CLASS_IDS.shallowWater || value === TERRAIN_CLASS_IDS.freshWater;
}

function isSandLike(value: TerrainClassId): boolean {
  return value === TERRAIN_CLASS_IDS.beach || value === TERRAIN_CLASS_IDS.sand;
}

function classNameForId(value: number): SemanticMaskTerrainClass {
  switch (value) {
    case TERRAIN_CLASS_IDS.shallowWater:
      return "shallowWater";
    case TERRAIN_CLASS_IDS.freshWater:
      return "freshWater";
    case TERRAIN_CLASS_IDS.road:
      return "road";
    case TERRAIN_CLASS_IDS.beach:
      return "beach";
    case TERRAIN_CLASS_IDS.grassland:
      return "grassland";
    case TERRAIN_CLASS_IDS.sand:
      return "sand";
    case TERRAIN_CLASS_IDS.ice:
      return "ice";
    case TERRAIN_CLASS_IDS.deepOcean:
    default:
      return "deepOcean";
  }
}

function terrainClassAt(classGrid: Uint8Array, index: number): TerrainClassId {
  return classGrid[index] as TerrainClassId;
}

function sampleBiome(world: SemanticWorld, sampleX: number, sampleY: number, biome: number): number {
  return samplePredicate(world, world.layers.biome, sampleX, sampleY, (value) => value === biome);
}

function samplePredicate(world: SemanticWorld, values: ArrayLike<number>, sampleX: number, sampleY: number, predicate: (value: number) => boolean): number {
  return sampleNumeric(world, values, sampleX, sampleY, (value) => (predicate(value) ? 1 : 0));
}

function sampleNumeric(world: SemanticWorld, values: ArrayLike<number>, sampleX: number, sampleY: number, mapValue: (value: number) => number = (value) => value): number {
  const x0 = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const y0 = clampInt(Math.floor(sampleY), 0, world.height - 1);
  const x1 = clampInt(x0 + 1, 0, world.width - 1);
  const y1 = clampInt(y0 + 1, 0, world.height - 1);
  const tx = Math.max(0, Math.min(1, sampleX - x0));
  const ty = Math.max(0, Math.min(1, sampleY - y0));
  const a = mapValue(values[y0 * world.width + x0]);
  const b = mapValue(values[y0 * world.width + x1]);
  const c = mapValue(values[y1 * world.width + x0]);
  const d = mapValue(values[y1 * world.width + x1]);
  const top = lerp(a, b, tx);
  const bottom = lerp(c, d, tx);
  return lerp(top, bottom, ty);
}

function chooseMaskPixelsPerCell(tileSize: number, requested: number): number {
  const clamped = Math.max(1, Math.min(tileSize, Math.floor(requested)));
  for (let value = clamped; value >= 1; value -= 1) {
    if (tileSize % value === 0) return value;
  }
  return 1;
}

function emptyClassSamples(): Record<SemanticMaskTerrainClass, number> {
  return {
    deepOcean: 0,
    shallowWater: 0,
    freshWater: 0,
    road: 0,
    beach: 0,
    grassland: 0,
    sand: 0,
    ice: 0
  };
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rgbCss(color: Rgb): string {
  return `rgb(${color[0]},${color[1]},${color[2]})`;
}

function rgbaCss(color: Rgb, alpha: number): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0, Math.min(1, alpha))})`;
}
