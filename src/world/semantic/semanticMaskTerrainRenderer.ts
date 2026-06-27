import type Phaser from "phaser";
import { hashNoise } from "../seededRng.ts";
import { DEFAULT_ROAD_PROFILE } from "./semanticRoadProfiles.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER, type IslandRoadProfile, type IslandRoadVisualConfig, type Rgb, type SemanticWorld } from "./semanticTypes.ts";
import {
  surfaceHasRole,
  surfaceColors,
  surfaceAllowsVariants,
  surfaceVariantMaxAlpha,
  surfaceShorelineProfile,
  classifyBoundary,
  type MetadataBoundaryKind
} from "./semanticSurfaceDefinitions.ts";

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
  streakAlpha: number;
  scuffAlpha: number;
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
  boundarySamples: Record<MetadataBoundaryKind, number>;
  textureSourceLabels: Record<SemanticMaskTerrainClass, string>;
}

type TerrainClassId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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

// ---------------------------------------------------------------------------
// Color helpers — all lookup through surface definitions, never hardcoded
// per material name. Texture assets are never inspected for behavior.
// ---------------------------------------------------------------------------

const DEFAULT_FILL_COLOR: Rgb = [64, 64, 64];
const DEFAULT_EDGE_COLOR: Rgb = [96, 96, 96];
const FALLBACK_WET_BLEND: Rgb = [178, 146, 86];
const FALLBACK_FOAM: Rgb = [234, 251, 237];
const FALLBACK_SHALLOW_EDGE: Rgb = [93, 196, 213];

function surfaceFillColor(terrainClass: string): Rgb {
  return surfaceColors(terrainClass)?.fill ?? DEFAULT_FILL_COLOR;
}

function surfaceEdgeColor(terrainClass: string): Rgb {
  return surfaceColors(terrainClass)?.edge ?? DEFAULT_EDGE_COLOR;
}

// Legacy road palette colors (road rendering is its own system)
const ROAD_DUST: Rgb = [214, 169, 103];
const ROAD_PEBBLE: Rgb = [119, 103, 84];
const ROAD_GRASS_FLECK: Rgb = [92, 139, 64];

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
  const boundarySamples: Record<MetadataBoundaryKind, number> = {
    waterDeepShallow: 0,
    waterShoreline: 0,
    waterLand: 0,
    routeBoundary: 0,
    genericLand: 0
  };

  if (options.collectStats ?? true) {
    for (let y = 0; y < maskHeight; y += 1) {
      for (let x = 0; x < maskWidth; x += 1) {
        const current = terrainClassAt(classGrid, y * maskWidth + x);
        const countPair = (a: TerrainClassId, b: TerrainClassId) => {
          if (a === b) return;
          const meta = classifyBoundary(a, b);
          if (meta) boundarySamples[meta.kind] += 1;
        };
        if (x < maskWidth - 1) {
          countPair(current, terrainClassAt(classGrid, y * maskWidth + x + 1));
        }
        if (y < maskHeight - 1) {
          countPair(current, terrainClassAt(classGrid, (y + 1) * maskWidth + x));
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
      boundarySamples,
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
    deepOcean: createTerrainPattern(ctx, terrainSources?.deepOcean, tileSize, surfaceFillColor("deepOcean")),
    shallowWater: createTerrainPattern(ctx, terrainSources?.shallowWater, tileSize, surfaceFillColor("shallowWater")),
    freshWater: createTerrainPattern(ctx, terrainSources?.freshWater, tileSize, surfaceFillColor("freshWater")),
    road: createRoadTrailPattern(ctx, terrainSources?.road, tileSize),
    beach: createTerrainPattern(ctx, terrainSources?.beach, tileSize, surfaceFillColor("beach")),
    grassland: createTerrainPattern(ctx, terrainSources?.grassland, tileSize, surfaceFillColor("grassland")),
    sand: createTerrainPattern(ctx, terrainSources?.sand, tileSize, surfaceFillColor("sand")),
    ash: createTerrainPattern(ctx, terrainSources?.ash, tileSize, surfaceFillColor("ash")),
    ice: createTerrainPattern(ctx, terrainSources?.ice, tileSize, surfaceFillColor("ice"))
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
  if (!patternCtx) return rgbCss(ROAD_DUST);
  patternCtx.imageSmoothingEnabled = false;
  if (source) patternCtx.drawImage(source, 0, 0, source.width, source.height, 0, 0, tileSize, tileSize);
  else {
    patternCtx.fillStyle = rgbCss(ROAD_DUST);
    patternCtx.fillRect(0, 0, tileSize, tileSize);
  }
  const block = Math.max(1, Math.floor(tileSize / 16));
  for (let y = 0; y < tileSize; y += block) {
    for (let x = 0; x < tileSize; x += block) {
      const noise = hashNoise("semantic-road-trail-pattern", x, y);
      if (noise < 0.035) patternCtx.fillStyle = rgbaCss(ROAD_PEBBLE, 0.36);
      else if (noise > 0.9) patternCtx.fillStyle = "rgba(246, 205, 132, 0.22)";
      else continue;
      patternCtx.fillRect(x, y, block, block);
    }
  }
  return ctx.createPattern(patternCanvas, "repeat") ?? rgbCss(ROAD_DUST);
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
  if (!surfaceAllowsVariants(terrainClass)) return;
  const terrainClassId = TERRAIN_CLASS_IDS[terrainClass];
  for (let slotIndex = 0; slotIndex < Math.min(3, variantSources.length); slotIndex += 1) {
    const fillStyle = createTerrainPattern(ctx, variantSources[slotIndex], plan.tileSize, surfaceFillColor("grassland"));
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
  if (!surfaceAllowsVariants(terrainClass)) return [];
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
  const bodyTintCanvas = createLayerCanvas(plan);
  const centerTintCanvas = createLayerCanvas(plan);
  const highlightCanvas = createLayerCanvas(plan);
  const detailsCanvas = createLayerCanvas(plan);
  const shadowCtx = shadowCanvas.getContext("2d");
  const edgeCtx = edgeCanvas.getContext("2d");
  const bodyTintCtx = bodyTintCanvas.getContext("2d");
  const centerTintCtx = centerTintCanvas.getContext("2d");
  const highlightCtx = highlightCanvas.getContext("2d");
  const detailsCtx = detailsCanvas.getContext("2d");
  if (!shadowCtx || !edgeCtx || !bodyTintCtx || !centerTintCtx || !highlightCtx || !detailsCtx) throw new Error("Unable to create semantic road ribbon canvases.");
  for (const layerCtx of [shadowCtx, edgeCtx, bodyTintCtx, centerTintCtx, highlightCtx, detailsCtx]) layerCtx.imageSmoothingEnabled = false;

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
            bodyTintCtx.fillStyle = rgbaCss(palette.body, sample.bodyAlpha * palette.bodyAlpha);
            bodyTintCtx.fillRect(mx * plan.pixelBlock, my * plan.pixelBlock, plan.pixelBlock, plan.pixelBlock);
            bodyCtx.fillStyle = `rgba(255, 255, 255, ${sample.bodyAlpha.toFixed(3)})`;
            bodyCtx.fillRect(mx, my, 1, 1);
          }
          if (sample.centerAlpha > 0) {
            centerTintCtx.fillStyle = rgbaCss(palette.center, sample.centerAlpha * palette.centerAlpha);
            centerTintCtx.fillRect(mx * plan.pixelBlock, my * plan.pixelBlock, plan.pixelBlock, plan.pixelBlock);
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
  ctx.drawImage(bodyTintCanvas, 0, 0);
  drawMaskedPatternLayer(ctx, plan, fillStyles.road, bodyMask, 0.16);
  ctx.drawImage(centerTintCanvas, 0, 0);
  drawMaskedPatternLayer(ctx, plan, fillStyles.road, centerMask, 0.07);
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
  const sampleX = plan.originX + (mx + 0.5) / plan.maskPixelsPerCell;
  const sampleY = plan.originY + (my + 0.5) / plan.maskPixelsPerCell;
  const along = sampleX * sample.tangentX + sampleY * sample.tangentY;
  const lateral = sampleX * -sample.tangentY + sampleY * sample.tangentX;
  const directionNoise = hashNoise(`road-ribbon-direction-detail:${sample.roadTheme}`, Math.floor(along * 9), Math.floor(lateral * 17));
  if (sample.streakAlpha > 0) {
    ctx.fillStyle = rgbaCss(palette.streak, sample.streakAlpha);
    if (Math.abs(sample.tangentX) >= Math.abs(sample.tangentY)) {
      ctx.fillRect(x, y + Math.floor(width / 2), width, Math.max(1, Math.ceil(width / 3)));
    } else {
      ctx.fillRect(x + Math.floor(width / 2), y, Math.max(1, Math.ceil(width / 3)), width);
    }
  }
  if (sample.scuffAlpha > 0 && directionNoise > 0.28) {
    ctx.fillStyle = rgbaCss(palette.scuff, sample.scuffAlpha);
    ctx.fillRect(x, y, width, width);
  }
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
  const tuning = roadRibbonThemeTuning(sample.theme);
  const lateral = roadSignedLateral(sampleX, sampleY, sample.closestX, sample.closestY, sample.tangentX, sample.tangentY);
  const along = sample.closestX * sample.tangentX + sample.closestY * sample.tangentY;
  const edgeNoise = hashNoise(`${world.seed}:road-ribbon-edge:${sample.profile.profileId}`, Math.floor(sampleX * 31), Math.floor(sampleY * 31));
  const outerEdgeBand = clamp01(smoothstepRange(sample.halfWidth - 0.08, sample.halfWidth + 0.11, sample.distance));
  const edgeBreakFactor = 1 - clamp01((edgeNoise - 0.34) * 1.7) * outerEdgeBand * visual.edgeBreakup * 0.34;
  const bodyAlpha = clamp01((1 - smoothstepRange(sample.bodyHalfWidth, sample.bodyHalfWidth + edgeBand, sample.distance)) * Math.max(0.88, visual.alpha));
  const centerAlpha = clamp01((1 - smoothstepRange(sample.centerHalfWidth * 0.68, sample.centerHalfWidth, sample.distance)) * tuning.centerAlpha);
  const edgeAlpha = clamp01((1 - smoothstepRange(sample.halfWidth, sample.halfWidth + edgeBand * 1.15, sample.distance)) * (1 - bodyAlpha * 0.22) * tuning.edgeAlpha * edgeBreakFactor);
  const shadowAlpha = clamp01((1 - smoothstepRange(sample.halfWidth + 0.015, sample.halfWidth + edgeBand * 1.35, sample.distance)) * tuning.shadowAlpha * edgeBreakFactor);
  const highlightNoise = hashNoise(`${world.seed}:road-ribbon-highlight:${sample.profile.profileId}`, Math.floor(along * 7), Math.floor(Math.abs(lateral) * 23));
  const highlightAlpha = clamp01(centerAlpha * (tuning.highlightBase + tuning.highlightNoise * highlightNoise));
  const rutBand = Math.max(0, 1 - smoothstepRange(0.035, 0.095, Math.abs(Math.abs(lateral) - sample.centerHalfWidth * 0.52)));
  const detailNoise = hashNoise(`${world.seed}:road-ribbon-detail:${sample.profile.profileId}`, Math.floor(along * 29), Math.floor((lateral + 12) * 23));
  const rutAlpha = clamp01(rutBand * bodyAlpha * tuning.rutAlpha * (0.7 + detailNoise * 0.55));
  const pebbleAlpha = detailNoise < visual.pebbleNoise * tuning.pebbleRate && bodyAlpha > 0.66 ? clamp01(bodyAlpha * tuning.pebbleAlpha) : 0;
  const centerBand = 1 - smoothstepRange(sample.centerHalfWidth * 0.18, sample.centerHalfWidth * 0.92, Math.abs(lateral));
  const lowFrequency = 0.5 + 0.5 * Math.sin(along * tuning.streakFrequency + hashNoise(`${world.seed}:road-ribbon-streak-phase`, Math.floor(along / 8), Math.floor(sampleY / 8)) * Math.PI * 2);
  const streakAlpha = clamp01(centerBand * centerAlpha * tuning.streakAlpha * (0.55 + lowFrequency * 0.45));
  const scuffNoise = hashNoise(`${world.seed}:road-ribbon-scuff:${sample.profile.profileId}`, Math.floor(along * 4), Math.floor((lateral + 8) * 7));
  const scuffAlpha = scuffNoise > tuning.scuffThreshold && bodyAlpha > 0.62 ? clamp01(bodyAlpha * tuning.scuffAlpha * (scuffNoise - tuning.scuffThreshold) / (1 - tuning.scuffThreshold)) : 0;
  const fleckNoise = hashNoise(`${world.seed}:road-ribbon-fleck:${sample.profile.profileId}`, Math.floor(along * 17), Math.floor((lateral + 8) * 19));
  const edgeOnly = clamp01((edgeAlpha + outerEdgeBand * 0.12) * (1 - bodyAlpha) * 1.5);
  const terrainFleckAlpha = fleckNoise > tuning.fleckThreshold && edgeOnly > 0.04 ? clamp01(edgeOnly * tuning.fleckAlpha) : 0;
  return {
    distance: signedDistance,
    centerAlpha,
    bodyAlpha,
    edgeAlpha,
    shadowAlpha,
    highlightAlpha,
    rutAlpha,
    pebbleAlpha,
    streakAlpha,
    scuffAlpha,
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
  radiusX: number;
  radiusY: number;
  bodyScale: number;
  centerScale: number;
  edgeBand: number;
  tangentX: number;
  tangentY: number;
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
    streakAlpha: 0,
    scuffAlpha: 0,
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
    const dx = sampleX - node.x;
    const dy = sampleY - node.y;
    const along = dx * node.tangentX + dy * node.tangentY;
    const lateral = dx * -node.tangentY + dy * node.tangentX;
    const normalizedDistance = Math.hypot(along / node.radiusX, lateral / node.radiusY);
    const averageRadius = (node.radiusX + node.radiusY) / 2;
    if (normalizedDistance > 1 + (node.edgeBand * 2) / averageRadius) continue;
    const distance = normalizedDistance * averageRadius;
    if (!best || distance - averageRadius < best.distance - best.halfWidth) {
      best = {
        distance,
        halfWidth: averageRadius,
        bodyHalfWidth: averageRadius * node.bodyScale,
        centerHalfWidth: averageRadius * node.centerScale,
        edgeBand: node.edgeBand,
        closestX: node.x,
        closestY: node.y,
        tangentX: node.tangentX,
        tangentY: node.tangentY,
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
      const tangent = roadNodeTangent(info);
      nodes.push({
        x: x + 0.5,
        y: y + 0.5,
        radiusX: radius * (info.neighborCount <= 1 ? 1.08 : 1),
        radiusY: radius * (info.neighborCount <= 1 ? 0.9 : 1),
        bodyScale: 0.76,
        centerScale: 0.42,
        edgeBand: 0.065,
        tangentX: tangent.x,
        tangentY: tangent.y,
        profile,
        theme: roadThemeForProfile(profile)
      });
    }
  }
  for (const poi of world.poiList) {
    const profile = roadProfileAt(world, poi.approachTile.x + 0.5, poi.approachTile.y + 0.5);
    const tangent = normalizeVec(poi.approachTile.x - poi.entranceTile.x, poi.approachTile.y - poi.entranceTile.y, 1, 0);
    const apron = roadPoiApronShape(poi.type, profile);
    nodes.push({
      x: poi.approachTile.x + 0.5,
      y: poi.approachTile.y + 0.5,
      radiusX: apron.radiusX,
      radiusY: apron.radiusY,
      bodyScale: apron.bodyScale,
      centerScale: apron.centerScale,
      edgeBand: 0.065,
      tangentX: tangent.x,
      tangentY: tangent.y,
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
  return cache.nodes.some((node) => Math.abs(node.x - x) <= radius + node.radiusX && Math.abs(node.y - y) <= radius + node.radiusY);
}

function roadNodeTangent(info: ReturnType<typeof roadNeighborInfo>): RoadRibbonPoint {
  if (info.neighbors.length === 0) return { x: 1, y: 0 };
  const primary = info.neighbors.reduce(
    (sum, neighbor) => ({ x: sum.x + neighbor.dx, y: sum.y + neighbor.dy }),
    { x: 0, y: 0 }
  );
  if (Math.hypot(primary.x, primary.y) > 0.01) return normalizeVec(primary.x, primary.y, 1, 0);
  const first = info.neighbors[0];
  return normalizeVec(first.dx, first.dy, 1, 0);
}

function roadPoiApronShape(type: SemanticWorld["poiList"][number]["type"], profile: IslandRoadProfile): { radiusX: number; radiusY: number; bodyScale: number; centerScale: number } {
  const base = profile.visual.widthScale * profile.generation.endpointApronScale;
  if (type === "town" || type === "village") return { radiusX: clamp(0.84 * base, 0.62, 0.98), radiusY: clamp(0.62 * base, 0.5, 0.82), bodyScale: 0.8, centerScale: 0.45 };
  if (type === "port") return { radiusX: clamp(0.68 * base, 0.5, 0.82), radiusY: clamp(0.44 * base, 0.36, 0.62), bodyScale: 0.78, centerScale: 0.42 };
  if (type === "cave") return { radiusX: clamp(0.58 * base, 0.46, 0.74), radiusY: clamp(0.4 * base, 0.34, 0.56), bodyScale: 0.76, centerScale: 0.4 };
  return { radiusX: clamp(0.62 * base, 0.48, 0.82), radiusY: clamp(0.5 * base, 0.4, 0.68), bodyScale: 0.78, centerScale: 0.42 };
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
  body: Rgb;
  center: Rgb;
  shadow: Rgb;
  edge: Rgb;
  highlight: Rgb;
  rut: Rgb;
  pebble: Rgb;
  fleck: Rgb;
  streak: Rgb;
  scuff: Rgb;
  bodyAlpha: number;
  centerAlpha: number;
}

function roadRibbonPalette(theme: SemanticRoadRibbonTheme, visual: IslandRoadVisualConfig): RoadRibbonPalette {
  if (theme === "desertSand") {
    return { body: [202, 170, 101], center: [234, 206, 137], shadow: [135, 105, 66], edge: [190, 157, 91], highlight: [246, 222, 155], rut: [151, 119, 74], pebble: [132, 104, 70], fleck: [229, 200, 124], streak: [243, 215, 145], scuff: [178, 143, 84], bodyAlpha: 0.88, centerAlpha: 0.34 };
  }
  if (theme === "snowPack") {
    return { body: [190, 202, 198], center: [225, 229, 214], shadow: [88, 113, 124], edge: [169, 185, 184], highlight: [238, 245, 239], rut: [91, 108, 118], pebble: [139, 132, 116], fleck: [232, 242, 240], streak: [235, 240, 231], scuff: [160, 147, 122], bodyAlpha: 0.82, centerAlpha: 0.42 };
  }
  if (theme === "ashCinder") {
    return { body: [82, 76, 68], center: [118, 105, 86], shadow: [40, 37, 34], edge: [98, 89, 76], highlight: [143, 125, 98], rut: [36, 34, 32], pebble: [119, 101, 84], fleck: [132, 69, 44], streak: [130, 115, 93], scuff: [61, 57, 52], bodyAlpha: 0.9, centerAlpha: 0.28 };
  }
  if (theme === "highlandGravel") {
    return { body: [147, 128, 89], center: [193, 174, 122], shadow: [76, 68, 56], edge: [133, 119, 88], highlight: [209, 191, 134], rut: [78, 72, 62], pebble: [111, 106, 92], fleck: [103, 119, 80], streak: [200, 181, 126], scuff: [111, 101, 82], bodyAlpha: 0.88, centerAlpha: 0.3 };
  }
  const center = mixRgb(hexRgb(visual.lightNoiseColor, [240, 199, 131]), [255, 226, 160], 0.18);
  return {
    body: mixRgb(hexRgb(visual.centerColor, [214, 169, 103]), [222, 181, 113], 0.24),
    center,
    shadow: mixRgb(hexRgb(visual.darkNoiseColor, [112, 79, 47]), [89, 66, 44], 0.18),
    edge: mixRgb(hexRgb(visual.edgeColor, [159, 120, 67]), [142, 104, 61], 0.12),
    highlight: center,
    rut: hexRgb(visual.darkNoiseColor, ROAD_PEBBLE),
    pebble: hexRgb(visual.darkNoiseColor, ROAD_PEBBLE),
    fleck: visual.terrainFleckColor ? hexRgb(visual.terrainFleckColor, ROAD_GRASS_FLECK) : ROAD_GRASS_FLECK,
    streak: mixRgb(center, [255, 235, 174], 0.2),
    scuff: mixRgb(hexRgb(visual.edgeColor, [159, 120, 67]), [178, 135, 80], 0.2),
    bodyAlpha: 0.9,
    centerAlpha: 0.34
  };
}

interface RoadRibbonThemeTuning {
  centerAlpha: number;
  edgeAlpha: number;
  shadowAlpha: number;
  highlightBase: number;
  highlightNoise: number;
  rutAlpha: number;
  pebbleAlpha: number;
  pebbleRate: number;
  fleckAlpha: number;
  fleckThreshold: number;
  streakAlpha: number;
  streakFrequency: number;
  scuffAlpha: number;
  scuffThreshold: number;
}

function roadRibbonThemeTuning(theme: SemanticRoadRibbonTheme): RoadRibbonThemeTuning {
  if (theme === "desertSand") {
    return { centerAlpha: 0.94, edgeAlpha: 0.2, shadowAlpha: 0.1, highlightBase: 0.12, highlightNoise: 0.08, rutAlpha: 0.12, pebbleAlpha: 0.16, pebbleRate: 1.15, fleckAlpha: 0.22, fleckThreshold: 0.86, streakAlpha: 0.22, streakFrequency: 3.1, scuffAlpha: 0.12, scuffThreshold: 0.8 };
  }
  if (theme === "snowPack") {
    return { centerAlpha: 0.9, edgeAlpha: 0.18, shadowAlpha: 0.12, highlightBase: 0.14, highlightNoise: 0.06, rutAlpha: 0.18, pebbleAlpha: 0.08, pebbleRate: 0.72, fleckAlpha: 0.18, fleckThreshold: 0.88, streakAlpha: 0.2, streakFrequency: 2.7, scuffAlpha: 0.08, scuffThreshold: 0.88 };
  }
  if (theme === "ashCinder") {
    return { centerAlpha: 0.92, edgeAlpha: 0.26, shadowAlpha: 0.16, highlightBase: 0.08, highlightNoise: 0.06, rutAlpha: 0.2, pebbleAlpha: 0.2, pebbleRate: 1.35, fleckAlpha: 0.14, fleckThreshold: 0.93, streakAlpha: 0.12, streakFrequency: 2.4, scuffAlpha: 0.16, scuffThreshold: 0.82 };
  }
  if (theme === "highlandGravel") {
    return { centerAlpha: 0.94, edgeAlpha: 0.26, shadowAlpha: 0.14, highlightBase: 0.1, highlightNoise: 0.07, rutAlpha: 0.18, pebbleAlpha: 0.24, pebbleRate: 1.55, fleckAlpha: 0.24, fleckThreshold: 0.86, streakAlpha: 0.16, streakFrequency: 2.6, scuffAlpha: 0.14, scuffThreshold: 0.82 };
  }
  return { centerAlpha: 0.96, edgeAlpha: 0.26, shadowAlpha: 0.12, highlightBase: 0.14, highlightNoise: 0.08, rutAlpha: 0.16, pebbleAlpha: 0.16, pebbleRate: 1.25, fleckAlpha: 0.3, fleckThreshold: 0.82, streakAlpha: 0.16, streakFrequency: 2.8, scuffAlpha: 0.1, scuffThreshold: 0.84 };
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

function normalizeVec(x: number, y: number, fallbackX: number, fallbackY: number): RoadRibbonPoint {
  const length = Math.hypot(x, y);
  if (length <= 0.0001) return { x: fallbackX, y: fallbackY };
  return { x: x / length, y: y / length };
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
  const boundary = classifyBoundary(current, next);
  if (!boundary) return;
  const x = side === "e" ? (mx + 1) * plan.pixelBlock : mx * plan.pixelBlock;
  const y = side === "s" ? (my + 1) * plan.pixelBlock : my * plan.pixelBlock;
  const length = plan.pixelBlock;
  const globalMx = Math.floor(plan.originX * plan.maskPixelsPerCell) + mx;
  const globalMy = Math.floor(plan.originY * plan.maskPixelsPerCell) + my;
  const noise = hashNoise(`${world.seed}:mask-boundary-accent`, globalMx, globalMy, side === "e" ? 1 : 2);

  // Only suppress noise for water boundaries — generic land boundaries use noise rejection
  const isWaterBoundary = boundary.kind === "waterShoreline" || boundary.kind === "waterLand" || boundary.kind === "waterDeepShallow";
  if (noise < 0.08 && !isWaterBoundary) return;

  drawMetadataBoundary(ctx, world, plan, mx, my, side, x, y, length, lineWidth, accentWidth, boundary, current, next);
}

function drawMetadataBoundary(
  ctx: CanvasRenderingContext2D,
  world: SemanticWorld,
  plan: SemanticMaskTerrainRenderPlan,
  mx: number,
  my: number,
  side: "e" | "s",
  x: number,
  y: number,
  length: number,
  lineWidth: number,
  accentWidth: number,
  boundary: ReturnType<typeof classifyBoundary>,
  currentId: TerrainClassId,
  nextId: TerrainClassId
) {
  if (!boundary) return;

  if (boundary.kind === "waterDeepShallow") {
    const shallowEdge = surfaceColors(boundary.waterSide ?? "shallowWater")?.shallowEdge ?? FALLBACK_SHALLOW_EDGE;
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, shallowEdge, 0.2);
    return;
  }

  if (boundary.kind === "waterShoreline") {
    const waterSide = boundary.waterSide ?? "shallowWater";
    const landSide = boundary.landSide ?? "beach";
    const landDefColors = surfaceColors(landSide);
    const shallowEdge = surfaceColors(waterSide)?.shallowEdge ?? FALLBACK_SHALLOW_EDGE;
    const foam = landDefColors?.foam ?? FALLBACK_FOAM;
    const wetBlend = landDefColors?.wetBlend ?? FALLBACK_WET_BLEND;
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, shallowEdge, 0.2);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, foam, 0.72);
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, wetBlend, 0.22);
    return;
  }

  if (boundary.kind === "waterLand") {
    const waterSide = boundary.waterSide ?? "shallowWater";
    const landSide = boundary.landSide ?? "grassland";
    const shallowEdge = surfaceColors(waterSide)?.shallowEdge ?? FALLBACK_SHALLOW_EDGE;
    const wetBlend = surfaceColors(landSide)?.wetBlend ?? FALLBACK_WET_BLEND;
    const landEdge = surfaceEdgeColor(landSide);
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, shallowEdge, 0.18);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, wetBlend, 0.2);
    drawBoundaryStrip(ctx, x, y, side, length, accentWidth, landEdge, 0.2);
    return;
  }

  if (boundary.kind === "routeBoundary") {
    const roadVisual = roadProfileAt(world, plan.originX + (mx + 0.5) / plan.maskPixelsPerCell, plan.originY + (my + 0.5) / plan.maskPixelsPerCell).visual;
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, hexRgb(roadVisual.edgeColor, [159, 120, 67]), 0.1 * roadVisual.alpha);
    drawBoundaryStrip(ctx, x, y, side, length, lineWidth, hexRgb(roadVisual.centerColor, ROAD_DUST), 0.12 * roadVisual.alpha);
    if (roadVisual.terrainFleckColor) drawBoundaryStrip(ctx, x, y, side, length, accentWidth, hexRgb(roadVisual.terrainFleckColor, ROAD_GRASS_FLECK), 0.08 * roadVisual.alpha);
    return;
  }

  if (boundary.kind === "genericLand") {
    drawGenericLandBoundary(ctx, x, y, side, length, lineWidth, accentWidth, currentId, nextId);
    return;
  }
}

function drawGenericLandBoundary(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: "e" | "s",
  length: number,
  lineWidth: number,
  accentWidth: number,
  currentId: TerrainClassId,
  nextId: TerrainClassId
) {
  // Generic land ↔ land boundary: accent using both sides' edge colors.
  // No texture names, paths, or atlas slots are inspected — only surface metadata.
  const classA = classNameForId(currentId);
  const classB = classNameForId(nextId);
  const colorA = surfaceEdgeColor(classA);
  const colorB = surfaceEdgeColor(classB);
  drawBoundaryStrip(ctx, x, y, side, length, accentWidth, colorA, 0.2);
  drawBoundaryStrip(ctx, x, y, side, length, lineWidth, colorB, 0.2);
}

function drawBoundaryStrip(ctx: CanvasRenderingContext2D, x: number, y: number, side: "e" | "s", length: number, width: number, color: Rgb, alpha: number) {
  ctx.fillStyle = rgbaCss(color, alpha);
  if (side === "e") ctx.fillRect(x - Math.floor(width / 2), y, width, length);
  else ctx.fillRect(x, y - Math.floor(width / 2), length, width);
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
  return surfaceVariantMaxAlpha(terrainClass);
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

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const amount = clamp01(t);
  return [
    Math.round(a[0] + (b[0] - a[0]) * amount),
    Math.round(a[1] + (b[1] - a[1]) * amount),
    Math.round(a[2] + (b[2] - a[2]) * amount)
  ];
}

function rgbCss(color: Rgb): string {
  return `rgb(${color[0]},${color[1]},${color[2]})`;
}

function rgbaCss(color: Rgb, alpha: number): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${Math.max(0, Math.min(1, alpha))})`;
}
