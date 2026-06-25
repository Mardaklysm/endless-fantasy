import type Phaser from "phaser";
import { fbm, hashNoise } from "../seededRng.ts";
import { DEFAULT_ROAD_PROFILE } from "./semanticRoadProfiles.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER, type IslandRoadProfile, type IslandRoadVisualConfig, type SemanticWorld } from "./semanticTypes.ts";

export type SemanticMaskTerrainClass = "deepOcean" | "shallowWater" | "freshWater" | "road" | "beach" | "grassland" | "sand" | "ash" | "ice";
export type SemanticMaskTerrainSources = Partial<Record<SemanticMaskTerrainClass, CanvasImageSource & { width: number; height: number }>>;

export interface SemanticMaskTerrainRenderOptions {
  tileSize: number;
  textureKey?: string;
  terrainSources?: SemanticMaskTerrainSources;
  terrainSourceLabels?: Partial<Record<SemanticMaskTerrainClass, string>>;
  maskPixelsPerCell?: number;
  collectStats?: boolean;
  renderArea?: { x: number; y: number; width: number; height: number };
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

interface MaterialPatchAccent {
  textureClass?: SemanticMaskTerrainClass;
  textureAlpha?: number;
  color: Rgb;
  alpha: number;
  fleckColor?: Rgb;
  fleckChance?: number;
}

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
  grassLush: [72, 166, 73] as Rgb,
  grassDark: [54, 119, 51] as Rgb,
  grassFlower: [182, 220, 111] as Rgb,
  dirtPatch: [139, 111, 67] as Rgb,
  scrubGreen: [110, 138, 74] as Rgb,
  roadEdge: [159, 120, 67] as Rgb,
  roadDust: [214, 169, 103] as Rgb,
  roadPebble: [119, 103, 84] as Rgb,
  roadGrassFleck: [92, 139, 64] as Rgb,
  sandEdge: [167, 129, 66] as Rgb,
  duneLight: [224, 186, 100] as Rgb,
  rockySand: [128, 111, 84] as Rgb,
  ashEdge: [68, 62, 56] as Rgb,
  cinderDark: [42, 38, 36] as Rgb,
  emberSoil: [132, 70, 48] as Rgb,
  iceEdge: [134, 190, 207] as Rgb,
  frost: [231, 251, 252] as Rgb,
  blueIce: [168, 224, 236] as Rgb,
  coldMoss: [95, 142, 112] as Rgb,
  snowShadow: [177, 202, 210] as Rgb
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
    if (terrainClass === "deepOcean") continue;
    if (plan.classSamples[terrainClass] <= 0) continue;
    if (terrainClass === "road") drawRoadMaskedTerrainClass(ctx, world, plan, classGrid);
    else drawMaskedTerrainClass(ctx, plan, classGrid, TERRAIN_CLASS_IDS[terrainClass], fillStyles[terrainClass]);
  }
  drawTerrainMaterialPatchAccents(ctx, world, plan, classGrid, fillStyles);
  drawMaskBoundaryAccents(ctx, world, plan, classGrid);

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
  const classGrid = buildMaskClassGrid(
    world,
    {
      originX: renderArea.x,
      originY: renderArea.y,
      maskPixelsPerCell,
      maskWidth,
      maskHeight
    },
    classSamples
  );
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

  const roadEdgeNoise = hashNoise(`${world.seed}:mask-road-edge`, noiseX, noiseY, 1);
  const roadHit = routeCellAt(world, world.layers.roadMap, Math.floor(sampleX), Math.floor(sampleY)) && roadMaskSample(world, sampleX, sampleY, roadEdgeNoise, roadProfileAt(world, sampleX, sampleY));
  const riverHit = riverMaskSample(world, sampleX, sampleY);
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
  if (islandAtSample(world, sampleX, sampleY)?.theme === "ashfall" && sandScore >= grassScore && sandScore >= iceScore) return TERRAIN_CLASS_IDS.ash;
  if (iceScore >= grassScore && iceScore >= sandScore) return TERRAIN_CLASS_IDS.ice;
  if (sandScore >= grassScore && sandScore >= iceScore) return TERRAIN_CLASS_IDS.sand;
  return TERRAIN_CLASS_IDS.grassland;
}

function drawTerrainMaterialPatchAccents(
  ctx: CanvasRenderingContext2D,
  world: SemanticWorld,
  plan: SemanticMaskTerrainRenderPlan,
  classGrid: Uint8Array,
  fillStyles: Record<SemanticMaskTerrainClass, CanvasPattern | string>
): void {
  ctx.save();
  for (let my = 0; my < plan.maskHeight; my += 1) {
    for (let mx = 0; mx < plan.maskWidth; mx += 1) {
      const terrainClass = terrainClassAt(classGrid, my * plan.maskWidth + mx);
      const sampleX = plan.originX + (mx + 0.5) / plan.maskPixelsPerCell;
      const sampleY = plan.originY + (my + 0.5) / plan.maskPixelsPerCell;
      const accent = materialPatchAccentForSample(world, terrainClass, sampleX, sampleY);
      if (!accent) continue;

      const screenX = mx * plan.pixelBlock;
      const screenY = my * plan.pixelBlock;
      const grain = hashNoise(`${world.seed}:terrain-material-grain`, Math.floor(sampleX * 5), Math.floor(sampleY * 5), terrainClass);
      if (grain < 0.07) continue;
      if (accent.textureClass && accent.textureAlpha && accent.textureAlpha > 0) {
        ctx.globalAlpha = accent.textureAlpha * (0.72 + grain * 0.42);
        ctx.fillStyle = fillStyles[accent.textureClass];
        ctx.fillRect(screenX, screenY, plan.pixelBlock, plan.pixelBlock);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = rgbaCss(accent.color, accent.alpha * (0.74 + grain * 0.38));
      ctx.fillRect(screenX, screenY, plan.pixelBlock, plan.pixelBlock);
      if (accent.fleckColor && grain > 1 - (accent.fleckChance ?? 0)) {
        ctx.fillStyle = rgbaCss(accent.fleckColor, Math.min(0.52, accent.alpha * 1.8));
        const fleckSize = Math.max(1, plan.pixelBlock * 0.42);
        ctx.fillRect(screenX + (plan.pixelBlock - fleckSize) * 0.5, screenY + (plan.pixelBlock - fleckSize) * 0.5, fleckSize, fleckSize);
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function materialPatchAccentForSample(world: SemanticWorld, terrainClass: TerrainClassId, sampleX: number, sampleY: number): MaterialPatchAccent | undefined {
  if (!isMaterialPatchTerrainClass(terrainClass)) return undefined;
  if (!isMaterialPatchEligible(world, terrainClass, sampleX, sampleY)) return undefined;

  const moisture = sampleNumeric(world, world.layers.moisture, sampleX, sampleY);
  const coldness = sampleNumeric(world, world.layers.coldness, sampleX, sampleY);
  const elevation = sampleNumeric(world, world.layers.elevation, sampleX, sampleY);
  const ridge = sampleNumeric(world, world.layers.ridge, sampleX, sampleY);
  const distanceToWater = sampleNumeric(world, world.layers.distanceToWater, sampleX, sampleY);
  const island = islandAtSample(world, sampleX, sampleY);
  const islandSalt = island?.id ?? "world";

  if (terrainClass === TERRAIN_CLASS_IDS.grassland) {
    const dryScore = patchScore(world, islandSalt, "grass-dry-meadow", sampleX, sampleY, 15, 3.8) + (0.5 - moisture) * 0.26 + (distanceToWater > 6 ? 0.035 : 0);
    if (dryScore > 0.735) {
      return { textureClass: "road", textureAlpha: 0.16, color: COLORS.dirtPatch, alpha: 0.2, fleckColor: COLORS.rockySand, fleckChance: 0.045 };
    }

    const lushScore = patchScore(world, islandSalt, "grass-lush-clover", sampleX, sampleY, 11.5, 2.9) + (moisture - 0.48) * 0.28 - coldness * 0.09;
    if (lushScore > 0.72) {
      return { textureClass: "grassland", textureAlpha: 0.08, color: COLORS.grassLush, alpha: 0.18, fleckColor: COLORS.grassFlower, fleckChance: 0.05 };
    }

    const meadowScore = patchScore(world, islandSalt, "grass-flower-meadow", sampleX, sampleY, 7.5, 2.4) - Math.max(0, ridge - 0.5) * 0.1;
    if (meadowScore > 0.765) {
      return { textureClass: "grassland", textureAlpha: 0.06, color: COLORS.grassFlower, alpha: 0.12, fleckColor: COLORS.frost, fleckChance: 0.032 };
    }
  }

  if (terrainClass === TERRAIN_CLASS_IDS.sand) {
    const duneScore = patchScore(world, islandSalt, "sand-dune-ribs", sampleX, sampleY, 10.5, 2.8) + (0.52 - moisture) * 0.2;
    if (duneScore > 0.69) {
      return { textureClass: "beach", textureAlpha: 0.11, color: COLORS.duneLight, alpha: 0.16 };
    }

    const rockScore = patchScore(world, islandSalt, "sand-rocky-scrub", sampleX, sampleY, 8.5, 2.3) + ridge * 0.16 + elevation * 0.08;
    if (rockScore > 0.75) {
      return { textureClass: "road", textureAlpha: 0.11, color: COLORS.rockySand, alpha: 0.15, fleckColor: COLORS.roadPebble, fleckChance: 0.06 };
    }

    const scrubScore = patchScore(world, islandSalt, "sand-coastal-scrub", sampleX, sampleY, 12, 3.2) + (moisture - 0.44) * 0.24;
    if (scrubScore > 0.755) {
      return { textureClass: "grassland", textureAlpha: 0.08, color: COLORS.scrubGreen, alpha: 0.14, fleckColor: COLORS.grassDark, fleckChance: 0.04 };
    }
  }

  if (terrainClass === TERRAIN_CLASS_IDS.ice) {
    const exposedRock = patchScore(world, islandSalt, "ice-rocky-outcrop", sampleX, sampleY, 9.5, 2.4) + ridge * 0.18 + elevation * 0.1 - coldness * 0.07;
    if (exposedRock > 0.77) {
      return { textureClass: "road", textureAlpha: 0.12, color: COLORS.snowShadow, alpha: 0.18, fleckColor: COLORS.rockySand, fleckChance: 0.05 };
    }

    const blueIce = patchScore(world, islandSalt, "ice-blue-windpack", sampleX, sampleY, 12.5, 2.8) + coldness * 0.16;
    if (blueIce > 0.73) {
      return { textureClass: "ice", textureAlpha: 0.08, color: COLORS.blueIce, alpha: 0.18, fleckColor: COLORS.frost, fleckChance: 0.04 };
    }

    const thaw = patchScore(world, islandSalt, "ice-tundra-moss", sampleX, sampleY, 10, 2.6) + moisture * 0.14 - coldness * 0.18;
    if (thaw > 0.735) {
      return { textureClass: "grassland", textureAlpha: 0.07, color: COLORS.coldMoss, alpha: 0.13, fleckColor: COLORS.grassDark, fleckChance: 0.035 };
    }
  }

  if (terrainClass === TERRAIN_CLASS_IDS.ash) {
    const cinder = patchScore(world, islandSalt, "ash-cinder-crust", sampleX, sampleY, 9, 2.2) + ridge * 0.12;
    if (cinder > 0.68) {
      return { textureClass: "ash", textureAlpha: 0.1, color: COLORS.cinderDark, alpha: 0.2, fleckColor: COLORS.roadPebble, fleckChance: 0.06 };
    }

    const ember = patchScore(world, islandSalt, "ash-ember-soil", sampleX, sampleY, 13, 3.4) + (0.55 - moisture) * 0.12;
    if (ember > 0.76) {
      return { textureClass: "sand", textureAlpha: 0.07, color: COLORS.emberSoil, alpha: 0.14 };
    }
  }

  if (terrainClass === TERRAIN_CLASS_IDS.beach) {
    const wetScore = patchScore(world, islandSalt, "beach-wet-shells", sampleX, sampleY, 8.5, 2.2) + Math.max(0, 1.8 - distanceToWater) * 0.18;
    if (wetScore > 0.69) {
      return { textureClass: "freshWater", textureAlpha: 0.05, color: COLORS.wetSand, alpha: 0.18, fleckColor: COLORS.foam, fleckChance: 0.025 };
    }
  }

  return undefined;
}

function isMaterialPatchTerrainClass(value: TerrainClassId): boolean {
  return value === TERRAIN_CLASS_IDS.grassland || value === TERRAIN_CLASS_IDS.sand || value === TERRAIN_CLASS_IDS.ice || value === TERRAIN_CLASS_IDS.ash || value === TERRAIN_CLASS_IDS.beach;
}

function isMaterialPatchEligible(world: SemanticWorld, terrainClass: TerrainClassId, sampleX: number, sampleY: number): boolean {
  const x = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const y = clampInt(Math.floor(sampleY), 0, world.height - 1);
  const i = y * world.width + x;
  if (!world.layers.landMask[i]) return false;
  if (world.layers.roadMap[i] || world.layers.riverMap[i] || world.layers.lakeMap[i]) return false;
  if (world.layers.mountainMap[i]) return false;
  if (terrainClass !== TERRAIN_CLASS_IDS.beach && world.layers.distanceToWater[i] < 2) return false;
  const margin = terrainClass === TERRAIN_CLASS_IDS.beach ? 1 : 2;
  return !nearPoiFootprint(world, x, y, margin);
}

function nearPoiFootprint(world: SemanticWorld, x: number, y: number, margin: number): boolean {
  for (const poi of world.poiList) {
    const footprint = poi.footprint;
    if (x >= footprint.minX - margin && x <= footprint.maxX + margin && y >= footprint.minY - margin && y <= footprint.maxY + margin) return true;
  }
  return false;
}

function patchScore(world: SemanticWorld, islandSalt: string, salt: string, sampleX: number, sampleY: number, macroScale: number, detailScale: number): number {
  const domainWarpX = fbm(`${world.seed}:terrain-material:${islandSalt}:${salt}:warp-x`, sampleX / 31, sampleY / 31, 3) - 0.5;
  const domainWarpY = fbm(`${world.seed}:terrain-material:${islandSalt}:${salt}:warp-y`, sampleX / 31, sampleY / 31, 3) - 0.5;
  const warpedX = sampleX + domainWarpX * macroScale * 0.72;
  const warpedY = sampleY + domainWarpY * macroScale * 0.72;
  const macro = fbm(`${world.seed}:terrain-material:${islandSalt}:${salt}:macro`, warpedX / macroScale, warpedY / macroScale, 4);
  const detail = fbm(`${world.seed}:terrain-material:${islandSalt}:${salt}:detail`, warpedX / detailScale, warpedY / detailScale, 3);
  const cellular = cellularPatchValue(world, islandSalt, salt, sampleX, sampleY, macroScale * 0.58);
  return macro * 0.64 + detail * 0.23 + cellular * 0.13;
}

function cellularPatchValue(world: SemanticWorld, islandSalt: string, salt: string, sampleX: number, sampleY: number, cellSize: number): number {
  const cx = Math.floor(sampleX / cellSize);
  const cy = Math.floor(sampleY / cellSize);
  let best = 0;
  for (let y = cy - 1; y <= cy + 1; y += 1) {
    for (let x = cx - 1; x <= cx + 1; x += 1) {
      const featureX = (x + hashNoise(`${world.seed}:terrain-material:${islandSalt}:${salt}:feature-x`, x, y)) * cellSize;
      const featureY = (y + hashNoise(`${world.seed}:terrain-material:${islandSalt}:${salt}:feature-y`, x, y)) * cellSize;
      const distance = Math.hypot(sampleX - featureX, sampleY - featureY) / Math.max(1, cellSize);
      const seedStrength = hashNoise(`${world.seed}:terrain-material:${islandSalt}:${salt}:feature-strength`, x, y);
      const strength = seedStrength * Math.max(0, 1 - distance);
      best = Math.max(best, strength);
    }
  }
  return best;
}

function roadMaskSample(world: SemanticWorld, sampleX: number, sampleY: number, edgeNoise: number, profile: IslandRoadProfile): boolean {
  const coreWidth = 0.108 * profile.visual.widthScale * profile.visual.centerContinuity;
  const edgeWidth = 0.148 * profile.visual.widthScale;
  const coreHit = routeMaskSample(world, world.layers.roadMap, sampleX, sampleY, coreWidth);
  if (coreHit) return true;
  const polishHit = roadPolishPatchHit(world, sampleX, sampleY, edgeNoise, profile);
  if (polishHit) return true;
  return edgeNoise > 1 - profile.visual.edgeBreakup && routeMaskSample(world, world.layers.roadMap, sampleX, sampleY, edgeWidth);
}

function roadPolishPatchHit(world: SemanticWorld, sampleX: number, sampleY: number, edgeNoise: number, profile: IslandRoadProfile): boolean {
  const x = clampInt(Math.floor(sampleX), 0, world.width - 1);
  const y = clampInt(Math.floor(sampleY), 0, world.height - 1);
  if (!routeCellAt(world, world.layers.roadMap, x, y)) return false;
  const localX = sampleX - x;
  const localY = sampleY - y;
  const dx = localX - 0.5;
  const dy = localY - 0.5;
  const centerDistance = Math.hypot(dx, dy);
  const north = routeCellAt(world, world.layers.roadMap, x, y - 1);
  const east = routeCellAt(world, world.layers.roadMap, x + 1, y);
  const south = routeCellAt(world, world.layers.roadMap, x, y + 1);
  const west = routeCellAt(world, world.layers.roadMap, x - 1, y);
  const northEast = routeCellAt(world, world.layers.roadMap, x + 1, y - 1);
  const southEast = routeCellAt(world, world.layers.roadMap, x + 1, y + 1);
  const southWest = routeCellAt(world, world.layers.roadMap, x - 1, y + 1);
  const northWest = routeCellAt(world, world.layers.roadMap, x - 1, y - 1);
  const neighborCount = [north, east, south, west, northEast, southEast, southWest, northWest].filter(Boolean).length;
  const cardinalCount = [north, east, south, west].filter(Boolean).length;
  const raggedEdge = edgeNoise > 0.18 ? 0.018 : -0.006;
  const endpointScale = profile.generation.endpointApronScale;
  const junctionScale = profile.generation.junctionPatchScale;

  if (neighborCount <= 1 && centerDistance <= 0.235 * endpointScale + raggedEdge) return true;
  if (cardinalCount >= 3 && centerDistance <= 0.255 * junctionScale + raggedEdge) return true;
  if (isAdjacentToBridgeCrossing(world, x, y) && centerDistance <= 0.23 * endpointScale + raggedEdge) return true;

  if (north && east && !south && !west && roundedRoadCornerHit(localX, localY, 1, -1, 0.225 * junctionScale + raggedEdge)) return true;
  if (east && south && !west && !north && roundedRoadCornerHit(localX, localY, 1, 1, 0.225 * junctionScale + raggedEdge)) return true;
  if (south && west && !north && !east && roundedRoadCornerHit(localX, localY, -1, 1, 0.225 * junctionScale + raggedEdge)) return true;
  if (west && north && !east && !south && roundedRoadCornerHit(localX, localY, -1, -1, 0.225 * junctionScale + raggedEdge)) return true;

  return false;
}

function roundedRoadCornerHit(localX: number, localY: number, dx: -1 | 1, dy: -1 | 1, radius: number): boolean {
  const cornerX = 0.5 + dx * 0.17;
  const cornerY = 0.5 + dy * 0.17;
  if (dx > 0 && localX < 0.5) return false;
  if (dx < 0 && localX > 0.5) return false;
  if (dy > 0 && localY < 0.5) return false;
  if (dy < 0 && localY > 0.5) return false;
  const distance = Math.hypot(localX - cornerX, localY - cornerY);
  return distance <= radius && Math.abs((localX - 0.5) - dx * (localY - 0.5) * dy) <= 0.42;
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
  if (source) return createTerrainPattern(ctx, source, tileSize, COLORS.roadDust);
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

function drawRoadMaskedTerrainClass(ctx: CanvasRenderingContext2D, world: SemanticWorld, plan: SemanticMaskTerrainRenderPlan, classGrid: Uint8Array) {
  for (let my = 0; my < plan.maskHeight; my += 1) {
    for (let mx = 0; mx < plan.maskWidth; mx += 1) {
      if (terrainClassAt(classGrid, my * plan.maskWidth + mx) !== TERRAIN_CLASS_IDS.road) continue;
      const sampleX = plan.originX + (mx + 0.5) / plan.maskPixelsPerCell;
      const sampleY = plan.originY + (my + 0.5) / plan.maskPixelsPerCell;
      const profile = roadProfileAt(world, sampleX, sampleY);
      const visual = profile.visual;
      const coreWidth = 0.108 * visual.widthScale * visual.centerContinuity;
      const coreHit = routeMaskSample(world, world.layers.roadMap, sampleX, sampleY, coreWidth);
      const globalMx = Math.floor(plan.originX * plan.maskPixelsPerCell) + mx;
      const globalMy = Math.floor(plan.originY * plan.maskPixelsPerCell) + my;
      const textureNoise = hashNoise(`${world.seed}:mask-road-texture:${profile.profileId}`, globalMx, globalMy);
      const edgeNoise = hashNoise(`${world.seed}:mask-road-edge-texture:${profile.profileId}`, globalMx, globalMy);
      const color = roadSampleColor(visual, coreHit, textureNoise, edgeNoise);
      const alpha = visual.alpha * (coreHit ? 1 : 0.86);
      ctx.fillStyle = rgbaCss(color, alpha);
      ctx.fillRect(mx * plan.pixelBlock, my * plan.pixelBlock, plan.pixelBlock, plan.pixelBlock);
    }
  }
}

function roadSampleColor(visual: IslandRoadVisualConfig, coreHit: boolean, textureNoise: number, edgeNoise: number): Rgb {
  if (!coreHit && visual.terrainFleckColor && edgeNoise < visual.edgeBreakup * 0.16) return hexRgb(visual.terrainFleckColor, COLORS.roadGrassFleck);
  if (textureNoise < visual.pebbleNoise) return hexRgb(visual.darkNoiseColor, COLORS.roadPebble);
  if (textureNoise > 1 - visual.pebbleNoise * 1.8) return hexRgb(visual.lightNoiseColor, COLORS.roadDust);
  return hexRgb(coreHit ? visual.centerColor : visual.edgeColor, coreHit ? COLORS.roadDust : COLORS.roadEdge);
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

function boundaryKind(a: TerrainClassId, b: TerrainClassId): BoundaryKind | undefined {
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
