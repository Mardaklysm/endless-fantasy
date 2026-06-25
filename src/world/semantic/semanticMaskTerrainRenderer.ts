import type Phaser from "phaser";
import { hashNoise } from "../seededRng.ts";
import { DEFAULT_ROAD_PROFILE } from "./semanticRoadProfiles.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER, type IslandRoadProfile, type IslandRoadVisualConfig, type SemanticWorld } from "./semanticTypes.ts";

export type SemanticMaskTerrainClass = "deepOcean" | "shallowWater" | "freshWater" | "road" | "beach" | "grassland" | "sand" | "ash" | "ice";
export type SemanticMaskTerrainSources = Partial<Record<SemanticMaskTerrainClass, CanvasImageSource & { width: number; height: number }>>;
export type SemanticMaskTerrainVariantSources = Partial<Record<SemanticMaskTerrainClass, Array<CanvasImageSource & { width: number; height: number }>>>;

// Normal gameplay terrain material changes must be rendered through mask/splat transitions.
// Do not draw terrain variants as hard tile rectangles. Hard variant cell edges are a regression.
export interface SemanticMaskTerrainRenderOptions {
  tileSize: number;
  textureKey?: string;
  terrainSources?: SemanticMaskTerrainSources;
  terrainSourceLabels?: Partial<Record<SemanticMaskTerrainClass, string>>;
  terrainVariantSources?: SemanticMaskTerrainVariantSources;
  terrainVariantSourceLabels?: Partial<Record<SemanticMaskTerrainClass, string[]>>;
  maskPixelsPerCell?: number;
  collectStats?: boolean;
  renderArea?: { x: number; y: number; width: number; height: number };
}

export interface SemanticTerrainVariantWeight {
  variantSlot: 1 | 2 | 3;
  weight: number;
}

export type SemanticRoadRibbonTheme = "grassDirt" | "desertSand" | "snowPack" | "highlandGravel" | "ashCinder";

export interface SemanticRoadRibbonSample {
  distance: number;
  centerAlpha: number;
  bodyAlpha: number;
  edgeAlpha: number;
  shadowAlpha: number;
  highlightAlpha: number;
  rutAlpha: number;
  pebbleAlpha: number;
  terrainFleckAlpha: number;
  tangentX: number;
  tangentY: number;
  roadTheme: SemanticRoadRibbonTheme;
  crossing: boolean;
}

export interface SemanticRoadRibbonDebugSegment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export interface SemanticRoadSplatSample {
  center: number;
  shoulder: number;
  fringe: number;
  rut: number;
  pebble: number;
  terrainFleck: number;
  crossing: boolean;
}

export interface SemanticMaskTerrainRenderPlan {
  originX: number;
  originY: number;
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

type TerrainClassId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
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
  ash: 7,
  ice: 8
} as const satisfies Record<SemanticMaskTerrainClass, TerrainClassId>;

const TERRAIN_CLASSES = ["deepOcean", "shallowWater", "freshWater", "road", "beach", "grassland", "sand", "ash", "ice"] as const satisfies readonly SemanticMaskTerrainClass[];

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
  ashEdge: [68, 62, 56] as Rgb,
  iceEdge: [134, 190, 207] as Rgb,
  frost: [231, 251, 252] as Rgb
};

const HEX_COLOR_CACHE = new Map<string, Rgb>();

export function createSemanticMaskTerrainTexture(scene: Phaser.Scene, world: SemanticWorld, options: SemanticMaskTerrainRenderOptions): string {
  const textureKey = options.textureKey ?? `semantic-mask-terrain-${world.seed}`;
  const canvas = createSemanticMaskTerrainCanvas(world, options);
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  scene.textures.addCanvas(textureKey, canvas);
  return textureKey;
}

export function createSemanticMaskTerrainCanvas(world: SemanticWorld, options: SemanticMaskTerrainRenderOptions): HTMLCanvasElement {
  const { plan, classGrid } = prepareSemanticMaskTerrainRender(world, options);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create semantic mask terrain canvas.");
  ctx.imageSmoothingEnabled = false;

  const fillStyles = createTerrainFillStyles(ctx, options.terrainSources, plan.tileSize);
  fillFullTerrain(ctx, fillStyles.deepOcean, plan.width, plan.height);
  for (const terrainClass of TERRAIN_CLASSES) {
    if (terrainClass === "deepOcean" || terrainClass === "road") continue;
    if (plan.classSamples[terrainClass] <= 0) continue;
    drawMaskedTerrainClass(ctx, plan, classGrid, TERRAIN_CLASS_IDS[terrainClass], fillStyles[terrainClass]);
    drawTerrainVariantSplatsForClass(ctx, world, plan, classGrid, terrainClass, options.terrainVariantSources?.[terrainClass]);
  }
  drawMaskBoundaryAccents(ctx, world, plan, classGrid);
  drawRoadRibbonLayer(ctx, world, plan, fillStyles);

  return canvas;
}

export function describeSemanticMaskTerrainRenderPlan(world: SemanticWorld, options: SemanticMaskTerrainRenderOptions): SemanticMaskTerrainRenderPlan {
  return prepareSemanticMaskTerrainRender(world, options).plan;
}

function prepareSemanticMaskTerrainRender(
  world: SemanticWorld,
  options: SemanticMaskTerrainRenderOptions
): { plan: SemanticMaskTerrainRenderPlan; classGrid: Uint8Array } {
  const tileSize = Math.max(1, Math.floor(options.tileSize));
  const maskPixelsPerCell = chooseMaskPixelsPerCell(tileSize, options.maskPixelsPerCell ?? 16);
  const renderArea = normalizedRenderArea(world, options.renderArea);
  const pixelBlock = tileSize / maskPixelsPerCell;
  const maskWidth = renderArea.width * maskPixelsPerCell;
  const maskHeight = renderArea.height * maskPixelsPerCell;
  const classSamples = emptyClassSamples();
  const classGrid = buildMaskClassGrid(world, {
    originX: renderArea.x,
    originY: renderArea.y,
    maskPixelsPerCell,
    maskWidth,
    maskHeight
  }, classSamples);
  let waterBeachBoundarySamples = 0;
  let waterGrassBoundarySamples = 0;
  let waterIceBoundarySamples = 0;
  let roadBoundarySamples = 0;
  let sandGrassBoundarySamples = 0;
  let sandIceBoundarySamples = 0;
  let grassIceBoundarySamples = 0;

  if (options.collectStats ?? true) {
    for (let y = 0; y < maskHeight; y += 1) {
      for (let x = 0; x < maskWidth; x += 1) {
        const current = terrainClassAt(classGrid, y * maskWidth + x);
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
  }

  return {
    plan: {
      originX: renderArea.x,
      originY: renderArea.y,
      width: renderArea.width * tileSize,
      height: renderArea.height * tileSize,
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
    },
    classGrid
  };
}

function normalizedRenderArea(world: SemanticWorld, area: SemanticMaskTerrainRenderOptions["renderArea"]): { x: number; y: number; width: number; height: number } {
  const x = clampInt(Math.floor(area?.x ?? 0), 0, Math.max(0, world.width - 1));
  const y = clampInt(Math.floor(area?.y ?? 0), 0, Math.max(0, world.height - 1));
  const maxWidth = Math.max(1, world.width - x);
  const maxHeight = Math.max(1, world.height - y);
  const width = clampInt(Math.floor(area?.width ?? world.width), 1, maxWidth);
  const height = clampInt(Math.floor(area?.height ?? world.height), 1, maxHeight);
  return { x, y, width, height };
}

function buildMaskClassGrid(
  world: SemanticWorld,
  plan: Pick<SemanticMaskTerrainRenderPlan, "originX" | "originY" | "maskWidth" | "maskHeight" | "maskPixelsPerCell">,
  classSamples?: Record<SemanticMaskTerrainClass, number>
): Uint8Array {
  const classGrid = new Uint8Array(plan.maskWidth * plan.maskHeight);
  for (let my = 0; my < plan.maskHeight; my += 1) {
    for (let mx = 0; mx < plan.maskWidth; mx += 1) {
      const sampleX = plan.originX + (mx + 0.5) / plan.maskPixelsPerCell;
      const sampleY = plan.originY + (my + 0.5) / plan.maskPixelsPerCell;
      const terrainClass = classifySample(world, sampleX, sampleY);
      classGrid[my * plan.maskWidth + mx] = terrainClass;
      if (classSamples) classSamples[classNameForId(terrainClass)] += 1;
    }
  }
  return classGrid;
}

function classifySample(world: SemanticWorld, sampleX: number, sampleY: number): TerrainClassId {
  const noiseX = Math.floor(sampleX * 8);
  const noiseY = Math.floor(sampleY * 8);
  const boundaryNoise = hashNoise(`${world.seed}:mask-terrain-boundary`, noiseX, noiseY, 0) - 0.5;
  const riverHit = riverMaskSample(world, sampleX, sampleY);

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
  if (islandAtSample(world, sampleX, sampleY)?.theme === "ashfall" && sandScore >= grassScore && sandScore >= iceScore) return TERRAIN_CLASS_IDS.ash;
  if (iceScore >= grassScore && iceScore >= sandScore) return TERRAIN_CLASS_IDS.ice;
  if (sandScore >= grassScore && sandScore >= iceScore) return TERRAIN_CLASS_IDS.sand;
  return TERRAIN_CLASS_IDS.grassland;
}

function isAdjacentToBridgeCrossing(world: SemanticWorld, x: number, y: number): boolean {
  return (
    routeCellAt(world, world.layers.riverCrossingMap, x, y) ||
    routeCellAt(world, world.layers.riverCrossingMap, x + 1, y) ||
    routeCellAt(world, world.layers.riverCrossingMap, x - 1, y) ||
    routeCellAt(world, world.layers.riverCrossingMap, x, y + 1) ||
    routeCellAt(world, world.layers.riverCrossingMap, x, y - 1)
  );
}

function routeMaskSample(world: SemanticWorld, values: ArrayLike<number>, sampleX: number, sampleY: number, halfWidth: number): boolean {
  const x = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const y = clampInt(Math.floor(sampleY), 0, world.height - 1);
  if (values[y * world.width + x] <= 0) return false;
  return routeMaskSampleFromCell(world, values, x, y, sampleX, sampleY, halfWidth);
}

function riverMaskSample(world: SemanticWorld, sampleX: number, sampleY: number): boolean {
  const sampleCellX = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const sampleCellY = clampInt(Math.floor(sampleY), 0, world.height - 1);
  const noiseX = Math.floor(sampleX * 8);
  const noiseY = Math.floor(sampleY * 8);
  const edgeNoise = hashNoise(`${world.seed}:mask-river-edge`, noiseX, noiseY, 0) - 0.5;
  for (let y = sampleCellY - 2; y <= sampleCellY + 2; y += 1) {
    for (let x = sampleCellX - 2; x <= sampleCellX + 2; x += 1) {
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
      const riverValue = world.layers.riverMap[y * world.width + x];
      if (riverValue <= 0) continue;
      const halfWidth = riverHalfWidth(riverValue) + edgeNoise * 0.045;
      if (routeMaskSampleFromCell(world, world.layers.riverMap, x, y, sampleX, sampleY, halfWidth)) return true;
    }
  }
  return false;
}

function riverHalfWidth(value: number): number {
  if (value >= 3) return 1.35;
  if (value >= 2) return 0.84;
  return 0.46;
}

function routeMaskSampleFromCell(world: SemanticWorld, values: ArrayLike<number>, x: number, y: number, sampleX: number, sampleY: number, halfWidth: number): boolean {
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
  if (north && centeredX <= halfWidth && localY <= 0.5 && localY >= -halfWidth) return true;
  if (south && centeredX <= halfWidth && localY >= 0.5 && localY <= 1 + halfWidth) return true;
  if (west && centeredY <= halfWidth && localX <= 0.5 && localX >= -halfWidth) return true;
  if (east && centeredY <= halfWidth && localX >= 0.5 && localX <= 1 + halfWidth) return true;
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

function roadProfileAt(world: SemanticWorld, sampleX: number, sampleY: number): IslandRoadProfile {
  const x = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const y = clampInt(Math.floor(sampleY), 0, world.height - 1);
  const islandNumber = world.layers.islandId[y * world.width + x];
  const island = islandForLayerId(world, islandNumber);
  return island?.road ?? DEFAULT_ROAD_PROFILE;
}

function islandAtSample(world: SemanticWorld, sampleX: number, sampleY: number): SemanticWorld["islands"][number] | undefined {
  const x = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const y = clampInt(Math.floor(sampleY), 0, world.height - 1);
  const islandNumber = world.layers.islandId[y * world.width + x];
  return islandForLayerId(world, islandNumber);
}

function islandForLayerId(world: SemanticWorld, islandNumber: number): SemanticWorld["islands"][number] | undefined {
  if (islandNumber <= 0) return undefined;
  const indexed = world.islands[islandNumber - 1];
  if (indexed?.order + 1 === islandNumber) return indexed;
  return world.islands.find((candidate) => candidate.order + 1 === islandNumber);
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
    road: createRoadTrailPattern(ctx, terrainSources?.road, tileSize),
    beach: createTerrainPattern(ctx, terrainSources?.beach, tileSize, COLORS.beachEdge),
    grassland: createTerrainPattern(ctx, terrainSources?.grassland, tileSize, COLORS.grassEdge),
    sand: createTerrainPattern(ctx, terrainSources?.sand, tileSize, COLORS.sandEdge),
    ash: createTerrainPattern(ctx, terrainSources?.ash, tileSize, COLORS.ashEdge),
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

function createRoadTrailPattern(
  ctx: CanvasRenderingContext2D,
  source: (CanvasImageSource & { width: number; height: number }) | undefined,
  tileSize: number
): CanvasPattern | string {
  const patternCanvas = document.createElement("canvas");
  patternCanvas.width = tileSize;
  patternCanvas.height = tileSize;
  const patternCtx = patternCanvas.getContext("2d");
  if (!patternCtx) return rgbCss(COLORS.roadDust);
  patternCtx.imageSmoothingEnabled = false;
  if (source) patternCtx.drawImage(source, 0, 0, source.width, source.height, 0, 0, tileSize, tileSize);
  else {
    patternCtx.fillStyle = rgbCss(COLORS.roadDust);
    patternCtx.fillRect(0, 0, tileSize, tileSize);
  }
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
    ash: terrainTextureSourceLabel(options, "ash"),
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
  maskCanvas.width = plan.maskWidth;
  maskCanvas.height = plan.maskHeight;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) throw new Error("Unable to create semantic terrain mask canvas.");
  maskCtx.imageSmoothingEnabled = false;
  maskCtx.fillStyle = "#ffffff";
  for (let my = 0; my < plan.maskHeight; my += 1) {
    for (let mx = 0; mx < plan.maskWidth; mx += 1) {
      if (terrainClassAt(classGrid, my * plan.maskWidth + mx) !== terrainClass) continue;
      maskCtx.fillRect(mx, my, 1, 1);
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
  layerCtx.drawImage(maskCanvas, 0, 0, plan.width, plan.height);
  layerCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(layerCanvas, 0, 0);
}

function drawTerrainVariantSplatsForClass(
  ctx: CanvasRenderingContext2D,
  world: SemanticWorld,
  plan: SemanticMaskTerrainRenderPlan,
  classGrid: Uint8Array,
  terrainClass: SemanticMaskTerrainClass,
  variantSources: Array<CanvasImageSource & { width: number; height: number }> | undefined
) {
  if (!variantSources?.length || !world.layers.terrainVariant || !world.layers.terrainPatchStrength) return;
  if (terrainClass === "road" || isWater(TERRAIN_CLASS_IDS[terrainClass])) return;
  const terrainClassId = TERRAIN_CLASS_IDS[terrainClass];
  for (let slotIndex = 0; slotIndex < Math.min(3, variantSources.length); slotIndex += 1) {
    const fillStyle = createTerrainPattern(ctx, variantSources[slotIndex], plan.tileSize, COLORS.grassEdge);
    drawTerrainVariantSplatLayer(ctx, world, plan, classGrid, terrainClassId, terrainClass, slotIndex + 1, fillStyle);
  }
}

function drawTerrainVariantSplatLayer(
  ctx: CanvasRenderingContext2D,
  world: SemanticWorld,
  plan: SemanticMaskTerrainRenderPlan,
  classGrid: Uint8Array,
  terrainClassId: TerrainClassId,
  terrainClass: SemanticMaskTerrainClass,
  variantSlot: number,
  fillStyle: CanvasPattern | string
) {
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = plan.maskWidth;
  maskCanvas.height = plan.maskHeight;
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) throw new Error("Unable to create semantic terrain variant mask canvas.");
  maskCtx.imageSmoothingEnabled = false;

  for (let my = 0; my < plan.maskHeight; my += 1) {
    for (let mx = 0; mx < plan.maskWidth; mx += 1) {
      if (terrainClassAt(classGrid, my * plan.maskWidth + mx) !== terrainClassId) continue;
      const sampleX = plan.originX + (mx + 0.5) / plan.maskPixelsPerCell;
      const sampleY = plan.originY + (my + 0.5) / plan.maskPixelsPerCell;
      const weight = terrainVariantWeightsAt(world, terrainClass, sampleX, sampleY).find((candidate) => candidate.variantSlot === variantSlot)?.weight ?? 0;
      if (weight <= 0.01) continue;
      maskCtx.fillStyle = `rgba(255, 255, 255, ${weight.toFixed(3)})`;
      maskCtx.fillRect(mx, my, 1, 1);
    }
  }

  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = plan.width;
  layerCanvas.height = plan.height;
  const layerCtx = layerCanvas.getContext("2d");
  if (!layerCtx) throw new Error("Unable to create semantic terrain variant layer canvas.");
  layerCtx.imageSmoothingEnabled = false;
  layerCtx.fillStyle = fillStyle;
  layerCtx.fillRect(0, 0, plan.width, plan.height);
  layerCtx.globalCompositeOperation = "destination-in";
  layerCtx.drawImage(maskCanvas, 0, 0, plan.width, plan.height);
  layerCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(layerCanvas, 0, 0);
}

export function terrainVariantWeightsAt(
  world: SemanticWorld,
  terrainClass: SemanticMaskTerrainClass,
  sampleX: number,
  sampleY: number
): SemanticTerrainVariantWeight[] {
  if (terrainClass === "road" || terrainClass === "deepOcean" || terrainClass === "shallowWater" || terrainClass === "freshWater") return [];
  if (!world.layers.terrainVariant || !world.layers.terrainPatchStrength) return [];
  if (!sampleIsLandTerrainClass(world, terrainClass, sampleX, sampleY)) return [];

  const variantTotals = [0, 0, 0, 0];
  let baseTotal = 0;
  let kernelTotal = 0;
  const centerX = Math.floor(sampleX);
  const centerY = Math.floor(sampleY);
  const radius = 1.6;
  for (let y = centerY - 2; y <= centerY + 2; y += 1) {
    for (let x = centerX - 2; x <= centerX + 2; x += 1) {
      if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
      const cellIndex = y * world.width + x;
      if (terrainClassForCell(world, x, y, cellIndex) !== terrainClass) continue;
      if (world.layers.riverMap[cellIndex] || world.layers.lakeMap[cellIndex]) continue;
      const dx = Math.abs(sampleX - (x + 0.5));
      const dy = Math.abs(sampleY - (y + 0.5));
      const kernel = smoothstepRange(0, 1, clamp01(1 - Math.hypot(dx, dy) / radius));
      if (kernel <= 0) continue;
      kernelTotal += kernel;
      const variantSlot = world.layers.terrainVariant[cellIndex];
      const strength = clamp01(world.layers.terrainPatchStrength[cellIndex]);
      if (variantSlot >= 1 && variantSlot <= 3 && strength > 0) {
        variantTotals[variantSlot] += kernel * strength;
        baseTotal += kernel * (1 - strength);
      } else {
        baseTotal += kernel;
      }
    }
  }
  const total = baseTotal + variantTotals[1] + variantTotals[2] + variantTotals[3];
  if (kernelTotal <= 0 || total <= 0) return [];

  const maximumAlpha = terrainVariantMaxAlpha(terrainClass);
  const weights: SemanticTerrainVariantWeight[] = [];
  for (let variantSlot = 1; variantSlot <= 3; variantSlot += 1) {
    const raw = variantTotals[variantSlot] / total;
    if (raw <= 0.025) continue;
    const bandNoise = hashNoise(`${world.seed}:terrain-variant-splat:${terrainClass}:${variantSlot}`, Math.floor(sampleX * 17), Math.floor(sampleY * 17));
    const breakup = raw > 0.08 && raw < 0.72 ? (bandNoise - 0.5) * 0.16 : 0;
    const feathered = smoothstepRange(0.08, 0.72, clamp01(raw + breakup));
    const weight = clamp01(feathered * maximumAlpha);
    if (weight > 0.01) weights.push({ variantSlot: variantSlot as 1 | 2 | 3, weight });
  }

  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight > maximumAlpha && totalWeight > 0) {
    const scale = maximumAlpha / totalWeight;
    for (const item of weights) item.weight *= scale;
  }
  return weights;
}

function drawRoadRibbonLayer(
  ctx: CanvasRenderingContext2D,
  world: SemanticWorld,
  plan: SemanticMaskTerrainRenderPlan,
  fillStyles: Record<SemanticMaskTerrainClass, CanvasPattern | string>
) {
  const bodyMask = createMaskCanvas(plan);
  const centerMask = createMaskCanvas(plan);
  const bodyCtx = bodyMask.getContext("2d");
  const centerCtx = centerMask.getContext("2d");
  if (!bodyCtx || !centerCtx) throw new Error("Unable to create semantic road ribbon mask canvases.");
  bodyCtx.imageSmoothingEnabled = false;
  centerCtx.imageSmoothingEnabled = false;

  const shadowCanvas = createLayerCanvas(plan);
  const edgeCanvas = createLayerCanvas(plan);
  const highlightCanvas = createLayerCanvas(plan);
  const detailsCanvas = createLayerCanvas(plan);
  const shadowCtx = shadowCanvas.getContext("2d");
  const edgeCtx = edgeCanvas.getContext("2d");
  const highlightCtx = highlightCanvas.getContext("2d");
  const detailsCtx = detailsCanvas.getContext("2d");
  if (!shadowCtx || !edgeCtx || !highlightCtx || !detailsCtx) throw new Error("Unable to create semantic road ribbon canvases.");
  for (const layerCtx of [shadowCtx, edgeCtx, highlightCtx, detailsCtx]) layerCtx.imageSmoothingEnabled = false;

  const visited = new Uint8Array(plan.maskWidth * plan.maskHeight);
  const cache = roadRibbonCacheFor(world);
  const minCellX = clampInt(Math.floor(plan.originX) - 3, 0, world.width - 1);
  const minCellY = clampInt(Math.floor(plan.originY) - 3, 0, world.height - 1);
  const maxCellX = clampInt(Math.ceil(plan.originX + plan.maskWidth / plan.maskPixelsPerCell) + 3, 0, world.width - 1);
  const maxCellY = clampInt(Math.ceil(plan.originY + plan.maskHeight / plan.maskPixelsPerCell) + 3, 0, world.height - 1);
  for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      if (!world.layers.roadMap[cellY * world.width + cellX] && !nearRoadNode(cache, cellX + 0.5, cellY + 0.5, 1.2)) continue;
      const minMx = clampInt(Math.floor((cellX - plan.originX - 1.45) * plan.maskPixelsPerCell), 0, plan.maskWidth - 1);
      const maxMx = clampInt(Math.ceil((cellX - plan.originX + 2.45) * plan.maskPixelsPerCell), 0, plan.maskWidth - 1);
      const minMy = clampInt(Math.floor((cellY - plan.originY - 1.45) * plan.maskPixelsPerCell), 0, plan.maskHeight - 1);
      const maxMy = clampInt(Math.ceil((cellY - plan.originY + 2.45) * plan.maskPixelsPerCell), 0, plan.maskHeight - 1);
      for (let my = minMy; my <= maxMy; my += 1) {
        for (let mx = minMx; mx <= maxMx; mx += 1) {
          const maskIndex = my * plan.maskWidth + mx;
          if (visited[maskIndex]) continue;
          visited[maskIndex] = 1;
          const sampleX = plan.originX + (mx + 0.5) / plan.maskPixelsPerCell;
          const sampleY = plan.originY + (my + 0.5) / plan.maskPixelsPerCell;
          const sample = roadRibbonSampleAt(world, sampleX, sampleY);
          if (sample.bodyAlpha <= 0 && sample.edgeAlpha <= 0 && sample.shadowAlpha <= 0 && sample.rutAlpha <= 0 && sample.pebbleAlpha <= 0 && sample.terrainFleckAlpha <= 0) continue;
          const profile = roadProfileAt(world, sampleX, sampleY);
          const palette = roadRibbonPalette(sample.roadTheme, profile.visual);
          if (sample.shadowAlpha > 0) {
            shadowCtx.fillStyle = rgbaCss(palette.shadow, sample.shadowAlpha);
            shadowCtx.fillRect(mx * plan.pixelBlock, my * plan.pixelBlock, plan.pixelBlock, plan.pixelBlock);
          }
          if (sample.edgeAlpha > 0) {
            edgeCtx.fillStyle = rgbaCss(palette.edge, sample.edgeAlpha);
            edgeCtx.fillRect(mx * plan.pixelBlock, my * plan.pixelBlock, plan.pixelBlock, plan.pixelBlock);
          }
          if (sample.bodyAlpha > 0) {
            bodyCtx.fillStyle = `rgba(255, 255, 255, ${sample.bodyAlpha.toFixed(3)})`;
            bodyCtx.fillRect(mx, my, 1, 1);
          }
          if (sample.centerAlpha > 0) {
            centerCtx.fillStyle = `rgba(255, 255, 255, ${sample.centerAlpha.toFixed(3)})`;
            centerCtx.fillRect(mx, my, 1, 1);
          }
          if (sample.highlightAlpha > 0) {
            highlightCtx.fillStyle = rgbaCss(palette.highlight, sample.highlightAlpha);
            highlightCtx.fillRect(mx * plan.pixelBlock, my * plan.pixelBlock, plan.pixelBlock, plan.pixelBlock);
          }
          drawRoadRibbonDetails(detailsCtx, plan, mx, my, sample, palette);
        }
      }
    }
  }

  ctx.drawImage(shadowCanvas, 0, 0);
  ctx.drawImage(edgeCanvas, 0, 0);
  drawMaskedPatternLayer(ctx, plan, fillStyles.road, bodyMask, 0.96);
  drawMaskedPatternLayer(ctx, plan, fillStyles.road, centerMask, 0.72);
  ctx.drawImage(highlightCanvas, 0, 0);
  ctx.drawImage(detailsCanvas, 0, 0);
}

function createMaskCanvas(plan: SemanticMaskTerrainRenderPlan): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = plan.maskWidth;
  canvas.height = plan.maskHeight;
  return canvas;
}

function createLayerCanvas(plan: SemanticMaskTerrainRenderPlan): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  return canvas;
}

function drawMaskedPatternLayer(
  ctx: CanvasRenderingContext2D,
  plan: SemanticMaskTerrainRenderPlan,
  fillStyle: CanvasPattern | string,
  maskCanvas: HTMLCanvasElement,
  opacity: number
) {
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = plan.width;
  layerCanvas.height = plan.height;
  const layerCtx = layerCanvas.getContext("2d");
  if (!layerCtx) throw new Error("Unable to create semantic road layer canvas.");
  layerCtx.imageSmoothingEnabled = false;
  layerCtx.fillStyle = fillStyle;
  layerCtx.globalAlpha = opacity;
  layerCtx.fillRect(0, 0, plan.width, plan.height);
  layerCtx.globalAlpha = 1;
  layerCtx.globalCompositeOperation = "destination-in";
  layerCtx.drawImage(maskCanvas, 0, 0, plan.width, plan.height);
  layerCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(layerCanvas, 0, 0);
}

function drawRoadRibbonDetails(
  ctx: CanvasRenderingContext2D,
  plan: SemanticMaskTerrainRenderPlan,
  mx: number,
  my: number,
  sample: SemanticRoadRibbonSample,
  palette: RoadRibbonPalette
) {
  const x = mx * plan.pixelBlock;
  const y = my * plan.pixelBlock;
  const width = Math.max(1, plan.pixelBlock);
  if (sample.terrainFleckAlpha > 0) {
    ctx.fillStyle = rgbaCss(palette.fleck, sample.terrainFleckAlpha);
    ctx.fillRect(x, y, width, width);
  }
  if (sample.rutAlpha > 0) {
    ctx.fillStyle = rgbaCss(palette.rut, sample.rutAlpha);
    ctx.fillRect(x, y, width, width);
  }
  if (sample.pebbleAlpha > 0) {
    ctx.fillStyle = rgbaCss(palette.highlight, sample.pebbleAlpha * 0.45);
    ctx.fillRect(x, y, width, width);
    ctx.fillStyle = rgbaCss(palette.pebble, sample.pebbleAlpha);
    ctx.fillRect(x + Math.floor(width / 2), y + Math.floor(width / 2), Math.max(1, Math.ceil(width / 2)), Math.max(1, Math.ceil(width / 2)));
  }
}

export function roadRibbonSampleAt(world: SemanticWorld, sampleX: number, sampleY: number): SemanticRoadRibbonSample {
  const empty = emptyRoadRibbonSample(world, sampleX, sampleY);
  if (sampleX < 0 || sampleY < 0 || sampleX >= world.width || sampleY >= world.height) return empty;
  const cellX = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const cellY = clampInt(Math.floor(sampleY), 0, world.height - 1);
  const cellIndex = cellY * world.width + cellX;
  const crossing = roadCrossingRibbonAt(world, sampleX, sampleY) > 0;
  if ((world.layers.riverMap[cellIndex] || world.layers.lakeMap[cellIndex] || !world.layers.landMask[cellIndex]) && !crossing) return { ...empty, crossing };

  const sample = roadRibbonDistanceAt(world, sampleX, sampleY);
  if (!sample) return { ...empty, crossing };
  const visual = sample.profile.visual;
  const signedDistance = sample.distance - sample.halfWidth;
  const edgeBand = sample.edgeBand;
  const bodyAlpha = clamp01((1 - smoothstepRange(sample.bodyHalfWidth, sample.bodyHalfWidth + edgeBand, sample.distance)) * Math.max(0.88, visual.alpha));
  const centerAlpha = clamp01((1 - smoothstepRange(sample.centerHalfWidth * 0.72, sample.centerHalfWidth, sample.distance)) * 0.92);
  const edgeAlpha = clamp01((1 - smoothstepRange(sample.halfWidth, sample.halfWidth + edgeBand * 1.15, sample.distance)) * (1 - bodyAlpha * 0.22) * 0.3);
  const shadowAlpha = clamp01((1 - smoothstepRange(sample.halfWidth + 0.015, sample.halfWidth + edgeBand * 1.35, sample.distance)) * 0.18);
  const highlightAlpha = clamp01(centerAlpha * (0.12 + 0.08 * hashNoise(`${world.seed}:road-ribbon-highlight:${sample.profile.profileId}`, Math.floor(sampleX * 11), Math.floor(sampleY * 11))));
  const lateral = roadSignedLateral(sampleX, sampleY, sample.closestX, sample.closestY, sample.tangentX, sample.tangentY);
  const rutBand = Math.max(0, 1 - smoothstepRange(0.035, 0.095, Math.abs(Math.abs(lateral) - sample.centerHalfWidth * 0.52)));
  const detailNoise = hashNoise(`${world.seed}:road-ribbon-detail:${sample.profile.profileId}`, Math.floor(sampleX * 29), Math.floor(sampleY * 29));
  const rutAlpha = clamp01(rutBand * bodyAlpha * (0.16 + detailNoise * 0.08));
  const pebbleAlpha = detailNoise < visual.pebbleNoise * 1.5 && bodyAlpha > 0.68 ? clamp01(bodyAlpha * 0.28) : 0;
  const fleckNoise = hashNoise(`${world.seed}:road-ribbon-fleck:${sample.profile.profileId}`, Math.floor(sampleX * 19), Math.floor(sampleY * 19));
  const edgeOnly = clamp01(edgeAlpha * (1 - bodyAlpha) * 1.4);
  const terrainFleckAlpha = fleckNoise > 0.82 && edgeOnly > 0.04 ? clamp01(edgeOnly * 0.45) : 0;
  return {
    distance: signedDistance,
    centerAlpha,
    bodyAlpha,
    edgeAlpha,
    shadowAlpha,
    highlightAlpha,
    rutAlpha,
    pebbleAlpha,
    terrainFleckAlpha,
    tangentX: sample.tangentX,
    tangentY: sample.tangentY,
    roadTheme: sample.theme,
    crossing
  };
}

export function roadSplatAt(world: SemanticWorld, sampleX: number, sampleY: number): SemanticRoadSplatSample {
  const ribbon = roadRibbonSampleAt(world, sampleX, sampleY);
  return {
    center: ribbon.centerAlpha,
    shoulder: ribbon.bodyAlpha,
    fringe: ribbon.edgeAlpha,
    rut: ribbon.rutAlpha,
    pebble: ribbon.pebbleAlpha,
    terrainFleck: ribbon.terrainFleckAlpha,
    crossing: ribbon.crossing
  };
}

export function roadRibbonDebugSegments(world: SemanticWorld): SemanticRoadRibbonDebugSegment[] {
  return roadRibbonCacheFor(world).segments.map((segment) => ({ ax: segment.ax, ay: segment.ay, bx: segment.bx, by: segment.by }));
}

interface RoadRibbonDistanceSample {
  distance: number;
  halfWidth: number;
  bodyHalfWidth: number;
  centerHalfWidth: number;
  edgeBand: number;
  closestX: number;
  closestY: number;
  tangentX: number;
  tangentY: number;
  profile: IslandRoadProfile;
  theme: SemanticRoadRibbonTheme;
}

interface RoadRibbonPoint {
  x: number;
  y: number;
}

interface RoadRibbonSegment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  halfWidth: number;
  bodyHalfWidth: number;
  centerHalfWidth: number;
  edgeBand: number;
  tangentX: number;
  tangentY: number;
  profile: IslandRoadProfile;
  theme: SemanticRoadRibbonTheme;
}

interface RoadRibbonNode {
  x: number;
  y: number;
  radius: number;
  bodyRadius: number;
  centerRadius: number;
  edgeBand: number;
  profile: IslandRoadProfile;
  theme: SemanticRoadRibbonTheme;
}

interface RoadRibbonCache {
  segments: RoadRibbonSegment[];
  nodes: RoadRibbonNode[];
}

const ROAD_RIBBON_CACHE = new WeakMap<SemanticWorld, RoadRibbonCache>();

function emptyRoadRibbonSample(world: SemanticWorld, sampleX: number, sampleY: number): SemanticRoadRibbonSample {
  const profile = roadProfileAt(world, sampleX, sampleY);
  return {
    distance: Number.POSITIVE_INFINITY,
    centerAlpha: 0,
    bodyAlpha: 0,
    edgeAlpha: 0,
    shadowAlpha: 0,
    highlightAlpha: 0,
    rutAlpha: 0,
    pebbleAlpha: 0,
    terrainFleckAlpha: 0,
    tangentX: 1,
    tangentY: 0,
    roadTheme: roadThemeForProfile(profile),
    crossing: false
  };
}

function roadRibbonDistanceAt(world: SemanticWorld, sampleX: number, sampleY: number): RoadRibbonDistanceSample | undefined {
  const cache = roadRibbonCacheFor(world);
  let best: RoadRibbonDistanceSample | undefined;
  for (const segment of cache.segments) {
    if (!segmentNearSample(segment, sampleX, sampleY)) continue;
    const projection = closestPointOnSegment(sampleX, sampleY, segment.ax, segment.ay, segment.bx, segment.by);
    if (!best || projection.distance - segment.halfWidth < best.distance - best.halfWidth) {
      best = {
        distance: projection.distance,
        halfWidth: segment.halfWidth,
        bodyHalfWidth: segment.bodyHalfWidth,
        centerHalfWidth: segment.centerHalfWidth,
        edgeBand: segment.edgeBand,
        closestX: projection.x,
        closestY: projection.y,
        tangentX: segment.tangentX,
        tangentY: segment.tangentY,
        profile: segment.profile,
        theme: segment.theme
      };
    }
  }
  for (const node of cache.nodes) {
    const distance = Math.hypot(sampleX - node.x, sampleY - node.y);
    if (distance > node.radius + node.edgeBand * 2) continue;
    if (!best || distance - node.radius < best.distance - best.halfWidth) {
      best = {
        distance,
        halfWidth: node.radius,
        bodyHalfWidth: node.bodyRadius,
        centerHalfWidth: node.centerRadius,
        edgeBand: node.edgeBand,
        closestX: node.x,
        closestY: node.y,
        tangentX: 1,
        tangentY: 0,
        profile: node.profile,
        theme: node.theme
      };
    }
  }
  return best;
}

function roadRibbonCacheFor(world: SemanticWorld): RoadRibbonCache {
  const cached = ROAD_RIBBON_CACHE.get(world);
  if (cached) return cached;
  const cache = buildRoadRibbonCache(world);
  ROAD_RIBBON_CACHE.set(world, cache);
  return cache;
}

function buildRoadRibbonCache(world: SemanticWorld): RoadRibbonCache {
  const segments: RoadRibbonSegment[] = [];
  const nodes: RoadRibbonNode[] = [];
  const segmentKeys = new Set<string>();
  for (const edge of world.roadGraph.edges) {
    if (!edge.connected || edge.path.length < 2) continue;
    const points = smoothedRoadRibbonPoints(world, edge.path);
    for (let i = 0; i < points.length - 1; i += 1) {
      addRoadRibbonSegment(world, segments, segmentKeys, points[i], points[i + 1]);
    }
  }
  addRoadRibbonNodes(world, nodes);
  addUncoveredRoadFallbacks(world, segments, segmentKeys);
  return { segments, nodes };
}

function smoothedRoadRibbonPoints(world: SemanticWorld, path: Array<{ x: number; y: number }>): RoadRibbonPoint[] {
  return path.map((cell, index) => {
    const base = { x: cell.x + 0.5, y: cell.y + 0.5 };
    if (index === 0 || index === path.length - 1) return base;
    const previous = path[index - 1];
    const next = path[index + 1];
    const prevPoint = { x: previous.x + 0.5, y: previous.y + 0.5 };
    const nextPoint = { x: next.x + 0.5, y: next.y + 0.5 };
    const tangentX = nextPoint.x - prevPoint.x;
    const tangentY = nextPoint.y - prevPoint.y;
    const length = Math.hypot(tangentX, tangentY) || 1;
    const unitX = tangentX / length;
    const unitY = tangentY / length;
    const perpX = -unitY;
    const perpY = unitX;
    const diagonalRun = Math.abs(unitX) > 0.48 && Math.abs(unitY) > 0.48;
    const phase = hashNoise(`${world.seed}:road-ribbon-meander-phase`, path[0].x, path[0].y) * Math.PI * 2;
    const looseWiggle = (hashNoise(`${world.seed}:road-ribbon-meander`, cell.x, cell.y) - 0.5) * (diagonalRun ? 0.22 : 0.16);
    const runWiggle = Math.sin(index * (diagonalRun ? 1.35 : 0.82) + phase) * (diagonalRun ? 0.24 : 0.06);
    const wiggle = looseWiggle + runWiggle;
    const smoothed = {
      x: base.x * 0.58 + (prevPoint.x + nextPoint.x) * 0.21 + perpX * wiggle,
      y: base.y * 0.58 + (prevPoint.y + nextPoint.y) * 0.21 + perpY * wiggle
    };
    return constrainRoadRibbonPoint(world, smoothed, base, diagonalRun ? 0.4 : 0.3);
  });
}

function constrainRoadRibbonPoint(world: SemanticWorld, candidate: RoadRibbonPoint, fallback: RoadRibbonPoint, maxOffset: number): RoadRibbonPoint {
  const dx = candidate.x - fallback.x;
  const dy = candidate.y - fallback.y;
  const distance = Math.hypot(dx, dy);
  const limited = distance > maxOffset ? { x: fallback.x + (dx / distance) * maxOffset, y: fallback.y + (dy / distance) * maxOffset } : candidate;
  const x = clampInt(Math.floor(limited.x), 0, world.width - 1);
  const y = clampInt(Math.floor(limited.y), 0, world.height - 1);
  const i = y * world.width + x;
  if ((world.layers.riverMap[i] || world.layers.lakeMap[i] || !world.layers.landMask[i]) && !world.layers.riverCrossingMap[i]) return fallback;
  return limited;
}

function addRoadRibbonSegment(
  world: SemanticWorld,
  segments: RoadRibbonSegment[],
  segmentKeys: Set<string>,
  a: RoadRibbonPoint,
  b: RoadRibbonPoint
) {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  if (length < 0.05) return;
  const key = `${Math.round(a.x * 16)},${Math.round(a.y * 16)}:${Math.round(b.x * 16)},${Math.round(b.y * 16)}`;
  const reverseKey = `${Math.round(b.x * 16)},${Math.round(b.y * 16)}:${Math.round(a.x * 16)},${Math.round(a.y * 16)}`;
  if (segmentKeys.has(key) || segmentKeys.has(reverseKey)) return;
  segmentKeys.add(key);
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  const profile = roadProfileAt(world, midX, midY);
  const tangentX = (b.x - a.x) / length;
  const tangentY = (b.y - a.y) / length;
  const width = roadRibbonWidthForSegment(profile, tangentX, tangentY);
  const halfWidth = width / 2;
  segments.push({
    ax: a.x,
    ay: a.y,
    bx: b.x,
    by: b.y,
    halfWidth,
    bodyHalfWidth: halfWidth * 0.74,
    centerHalfWidth: halfWidth * 0.42,
    edgeBand: 0.065,
    tangentX,
    tangentY,
    profile,
    theme: roadThemeForProfile(profile)
  });
}

function addRoadRibbonNodes(world: SemanticWorld, nodes: RoadRibbonNode[]) {
  const seen = new Set<string>();
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = y * world.width + x;
      if (!world.layers.roadMap[i]) continue;
      const info = roadNeighborInfo(world, x, y);
      const important = info.neighborCount <= 1 || info.cardinalCount >= 3 || info.neighborCount >= 4 || info.cornerCount > 0 || isAdjacentToBridgeCrossing(world, x, y);
      if (!important) continue;
      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const profile = roadProfileAt(world, x + 0.5, y + 0.5);
      const width = roadRibbonWidthForSegment(profile, 1, 0);
      const endpointBoost = info.neighborCount <= 1 ? profile.generation.endpointApronScale * 0.14 : 0;
      const junctionBoost = info.cardinalCount >= 3 || info.neighborCount >= 4 ? profile.generation.junctionPatchScale * 0.18 : 0;
      const bridgeBoost = isAdjacentToBridgeCrossing(world, x, y) ? 0.12 : 0;
      const radius = clamp(width * 0.58 + endpointBoost + junctionBoost + bridgeBoost, 0.46, 0.88);
      nodes.push({
        x: x + 0.5,
        y: y + 0.5,
        radius,
        bodyRadius: radius * 0.76,
        centerRadius: radius * 0.42,
        edgeBand: 0.065,
        profile,
        theme: roadThemeForProfile(profile)
      });
    }
  }
  for (const poi of world.poiList) {
    const profile = roadProfileAt(world, poi.approachTile.x + 0.5, poi.approachTile.y + 0.5);
    const radius = clamp(0.62 * profile.visual.widthScale * profile.generation.endpointApronScale, 0.48, 0.82);
    nodes.push({
      x: poi.approachTile.x + 0.5,
      y: poi.approachTile.y + 0.5,
      radius,
      bodyRadius: radius * 0.78,
      centerRadius: radius * 0.42,
      edgeBand: 0.065,
      profile,
      theme: roadThemeForProfile(profile)
    });
  }
}

function addUncoveredRoadFallbacks(world: SemanticWorld, segments: RoadRibbonSegment[], segmentKeys: Set<string>) {
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      if (!world.layers.roadMap[y * world.width + x]) continue;
      const center = { x: x + 0.5, y: y + 0.5 };
      const covered = segments.some((segment) => {
        if (Math.abs(((segment.ax + segment.bx) / 2) - center.x) > 2 || Math.abs(((segment.ay + segment.by) / 2) - center.y) > 2) return false;
        return closestPointOnSegment(center.x, center.y, segment.ax, segment.ay, segment.bx, segment.by).distance <= segment.halfWidth * 0.72;
      });
      if (covered) continue;
      for (const neighbor of roadNeighborInfo(world, x, y).neighbors) {
        addRoadRibbonSegment(world, segments, segmentKeys, center, { x: x + neighbor.dx + 0.5, y: y + neighbor.dy + 0.5 });
      }
    }
  }
}

function roadRibbonWidthForSegment(profile: IslandRoadProfile, tangentX: number, tangentY: number): number {
  const vertical = Math.abs(tangentY) > Math.abs(tangentX) * 1.4;
  const diagonal = Math.abs(tangentX) > 0.35 && Math.abs(tangentY) > 0.35;
  const orientationScale = vertical ? 1.28 : diagonal ? 1.12 : 1;
  return clamp(1.04 * profile.visual.widthScale * orientationScale, 0.82, 1.34);
}

function roadNeighborInfo(world: SemanticWorld, x: number, y: number) {
  const neighbors = [
    { dx: 0, dy: -1, cardinal: true },
    { dx: 1, dy: 0, cardinal: true },
    { dx: 0, dy: 1, cardinal: true },
    { dx: -1, dy: 0, cardinal: true },
    { dx: 1, dy: -1, cardinal: false },
    { dx: 1, dy: 1, cardinal: false },
    { dx: -1, dy: 1, cardinal: false },
    { dx: -1, dy: -1, cardinal: false }
  ].filter((neighbor) => routeCellAt(world, world.layers.roadMap, x + neighbor.dx, y + neighbor.dy));
  const cardinalCount = neighbors.filter((neighbor) => neighbor.cardinal).length;
  return {
    neighbors,
    neighborCount: neighbors.length,
    cardinalCount,
    cornerCount: Math.max(0, neighbors.length - cardinalCount)
  };
}

function nearRoadNode(cache: RoadRibbonCache, x: number, y: number, radius: number): boolean {
  return cache.nodes.some((node) => Math.abs(node.x - x) <= radius && Math.abs(node.y - y) <= radius);
}

function segmentNearSample(segment: RoadRibbonSegment, sampleX: number, sampleY: number): boolean {
  const margin = segment.halfWidth + segment.edgeBand * 2 + 0.08;
  return (
    sampleX >= Math.min(segment.ax, segment.bx) - margin &&
    sampleX <= Math.max(segment.ax, segment.bx) + margin &&
    sampleY >= Math.min(segment.ay, segment.by) - margin &&
    sampleY <= Math.max(segment.ay, segment.by) + margin
  );
}

function roadThemeForProfile(profile: IslandRoadProfile): SemanticRoadRibbonTheme {
  if (profile.profileId.includes("snow")) return "snowPack";
  if (profile.profileId.includes("sand") || profile.profileId.includes("coastal")) return "desertSand";
  if (profile.profileId.includes("ash") || profile.profileId.includes("volcanic")) return "ashCinder";
  if (profile.profileId.includes("gravel")) return "highlandGravel";
  return "grassDirt";
}

interface RoadRibbonPalette {
  shadow: Rgb;
  edge: Rgb;
  highlight: Rgb;
  rut: Rgb;
  pebble: Rgb;
  fleck: Rgb;
}

function roadRibbonPalette(theme: SemanticRoadRibbonTheme, visual: IslandRoadVisualConfig): RoadRibbonPalette {
  if (theme === "desertSand") {
    return { shadow: [133, 101, 58], edge: [191, 154, 85], highlight: [238, 207, 135], rut: [143, 112, 67], pebble: [117, 93, 61], fleck: [222, 190, 117] };
  }
  if (theme === "snowPack") {
    return { shadow: [90, 117, 126], edge: [162, 181, 182], highlight: [232, 244, 240], rut: [93, 111, 117], pebble: [119, 135, 137], fleck: [224, 239, 237] };
  }
  if (theme === "ashCinder") {
    return { shadow: [38, 35, 32], edge: [88, 80, 70], highlight: [132, 116, 94], rut: [34, 32, 31], pebble: [110, 91, 76], fleck: [121, 66, 45] };
  }
  if (theme === "highlandGravel") {
    return { shadow: [74, 65, 52], edge: [137, 120, 84], highlight: [197, 178, 123], rut: [75, 68, 57], pebble: [103, 96, 82], fleck: [99, 117, 75] };
  }
  return {
    shadow: hexRgb(visual.darkNoiseColor, [112, 79, 47]),
    edge: hexRgb(visual.edgeColor, [159, 120, 67]),
    highlight: hexRgb(visual.lightNoiseColor, [240, 199, 131]),
    rut: hexRgb(visual.darkNoiseColor, COLORS.roadPebble),
    pebble: hexRgb(visual.darkNoiseColor, COLORS.roadPebble),
    fleck: visual.terrainFleckColor ? hexRgb(visual.terrainFleckColor, COLORS.roadGrassFleck) : COLORS.roadGrassFleck
  };
}

function roadCrossingRibbonAt(world: SemanticWorld, sampleX: number, sampleY: number): number {
  const centerX = Math.floor(sampleX);
  const centerY = Math.floor(sampleY);
  let best = 0;
  for (let y = centerY - 1; y <= centerY + 1; y += 1) {
    for (let x = centerX - 1; x <= centerX + 1; x += 1) {
      if (!routeCellAt(world, world.layers.riverCrossingMap, x, y)) continue;
      const distance = Math.hypot(sampleX - (x + 0.5), sampleY - (y + 0.5));
      best = Math.max(best, 1 - smoothstepRange(0.36, 0.72, distance));
    }
  }
  return best;
}

function closestPointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): { x: number; y: number; distance: number } {
  const vx = bx - ax;
  const vy = by - ay;
  const lengthSq = vx * vx + vy * vy;
  if (lengthSq <= 0) return { x: ax, y: ay, distance: Math.hypot(px - ax, py - ay) };
  const t = clamp01(((px - ax) * vx + (py - ay) * vy) / lengthSq);
  const x = ax + vx * t;
  const y = ay + vy * t;
  return { x, y, distance: Math.hypot(px - x, py - y) };
}

function roadSignedLateral(px: number, py: number, cx: number, cy: number, tangentX: number, tangentY: number): number {
  const nx = -tangentY;
  const ny = tangentX;
  return (px - cx) * nx + (py - cy) * ny;
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
  const globalMx = Math.floor(plan.originX * plan.maskPixelsPerCell) + mx;
  const globalMy = Math.floor(plan.originY * plan.maskPixelsPerCell) + my;
  const noise = hashNoise(`${world.seed}:mask-boundary-accent`, globalMx, globalMy, side === "e" ? 1 : 2);
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
    const roadVisual = roadProfileAt(world, plan.originX + (mx + 0.5) / plan.maskPixelsPerCell, plan.originY + (my + 0.5) / plan.maskPixelsPerCell).visual;
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, hexRgb(roadVisual.edgeColor, COLORS.roadEdge), 0.1 * roadVisual.alpha);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, hexRgb(roadVisual.centerColor, COLORS.roadDust), 0.12 * roadVisual.alpha);
    if (roadVisual.terrainFleckColor) drawBoundaryStrip(ctx, x, y, side, length, accentWidth, hexRgb(roadVisual.terrainFleckColor, COLORS.roadGrassFleck), 0.08 * roadVisual.alpha);
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
  return value === TERRAIN_CLASS_IDS.beach || value === TERRAIN_CLASS_IDS.sand || value === TERRAIN_CLASS_IDS.ash;
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
    case TERRAIN_CLASS_IDS.ash:
      return "ash";
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

function sampleIsLandTerrainClass(world: SemanticWorld, terrainClass: SemanticMaskTerrainClass, sampleX: number, sampleY: number): boolean {
  const x = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const y = clampInt(Math.floor(sampleY), 0, world.height - 1);
  const i = y * world.width + x;
  if (world.layers.riverMap[i] || world.layers.lakeMap[i]) return false;
  return terrainClassForCell(world, x, y, i) === terrainClass;
}

function terrainClassForCell(world: SemanticWorld, x: number, y: number, i = y * world.width + x): SemanticMaskTerrainClass {
  if (world.layers.riverMap[i] || world.layers.lakeMap[i]) return "freshWater";
  if (!world.layers.landMask[i]) return world.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW ? "shallowWater" : "deepOcean";
  const biome = world.layers.biome[i];
  if (biome === SEMANTIC_BIOME.BEACH) return "beach";
  if (biome === SEMANTIC_BIOME.ICE) return "ice";
  if (biome === SEMANTIC_BIOME.SAND) {
    const island = islandForLayerId(world, world.layers.islandId[i]);
    return island?.theme === "ashfall" ? "ash" : "sand";
  }
  return "grassland";
}

function terrainVariantMaxAlpha(terrainClass: SemanticMaskTerrainClass): number {
  if (terrainClass === "ash") return 0.82;
  if (terrainClass === "ice") return 0.76;
  if (terrainClass === "sand" || terrainClass === "beach") return 0.7;
  return 0.68;
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
    ash: 0,
    ice: 0
  };
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstepRange(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexRgb(value: string, fallback: Rgb): Rgb {
  const normalized = value.trim().replace(/^#/, "");
  const cached = HEX_COLOR_CACHE.get(normalized);
  if (cached) return cached;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;
  const color: Rgb = [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16)
  ];
  HEX_COLOR_CACHE.set(normalized, color);
  return color;
}

function rgbCss(color: Rgb): string {
  return `rgb(${color[0]},${color[1]},${color[2]})`;
}

function rgbaCss(color: Rgb, alpha: number): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0, Math.min(1, alpha))})`;
}
