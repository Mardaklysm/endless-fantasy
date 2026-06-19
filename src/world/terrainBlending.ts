import type { WorldTileId } from "../data/worldTiles.ts";
import { WORLD_TILES, worldTileHasTag } from "../data/worldTiles.ts";

export interface TerrainImageDataLike {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export interface BlackSeamRepairSettings {
  enabled: boolean;
  debugView: boolean;
  seamSearchRadius: number;
  intersectionSearchRadius: number;
  nearBlackThreshold: number;
  cleanSampleMinLuminance: number;
  relativeDarknessThreshold: number;
  minEdgeSampleInset: number;
  maxEdgeSampleInset: number;
  maxReplacementRatio: number;
}

export interface BlackSeamRepairOptions extends Partial<BlackSeamRepairSettings> {
  seed?: string;
  tileSize: number;
  captureMask?: boolean;
}

export interface BlackSeamRepairReport {
  mode: "black_seam_repair";
  enabled: boolean;
  seed: string;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  seamSearchRadius: number;
  seamSearchWidth: number;
  seamWriteWidth: number;
  intersectionSearchRadius: number;
  nearBlackThreshold: number;
  cleanSampleMinLuminance: number;
  relativeDarknessThreshold: number;
  minEdgeSampleInset: number;
  maxEdgeSampleInset: number;
  replacementMode: "clean-neighbor-dual-mix";
  pixelsInspected: number;
  pixelsReplaced: number;
  replacedPixelCount: number;
  replacementRatio: number;
  replacedPixelPercent: number;
  verticalSeamReplacementCount: number;
  horizontalSeamReplacementCount: number;
  cornerReplacementCount: number;
  oneSidedFallbackCount: number;
  waterSeamReplacementCount: number;
  sameTileSeamReplacementCount: number;
  settings: BlackSeamRepairSettings;
  mask?: Uint8Array;
}

export const SEAM_SEARCH_RADIUS = 4;
export const INTERSECTION_SEARCH_RADIUS = 5;
export const MIN_EDGE_SAMPLE_INSET = 3;
export const MAX_EDGE_SAMPLE_INSET = 8;
export const NEAR_BLACK_LUMINANCE_THRESHOLD = 38;
export const CLEAN_SAMPLE_MIN_LUMINANCE = 20;
export const RELATIVE_DARKNESS_THRESHOLD = 26;
export const BLACK_SEAM_REPAIR_MAX_REPLACEMENT_RATIO = 0.12;

export const BLACK_SEAM_REPAIR_DEFAULTS: BlackSeamRepairSettings = {
  enabled: true,
  debugView: false,
  seamSearchRadius: SEAM_SEARCH_RADIUS,
  intersectionSearchRadius: INTERSECTION_SEARCH_RADIUS,
  nearBlackThreshold: NEAR_BLACK_LUMINANCE_THRESHOLD,
  cleanSampleMinLuminance: CLEAN_SAMPLE_MIN_LUMINANCE,
  relativeDarknessThreshold: RELATIVE_DARKNESS_THRESHOLD,
  minEdgeSampleInset: MIN_EDGE_SAMPLE_INSET,
  maxEdgeSampleInset: MAX_EDGE_SAMPLE_INSET,
  maxReplacementRatio: BLACK_SEAM_REPAIR_MAX_REPLACEMENT_RATIO
};

export const BLACK_SEAM_REPAIR_DEV_OPTIONS: BlackSeamRepairSettings = { ...BLACK_SEAM_REPAIR_DEFAULTS };

export function repairBlackSeamsImageData(
  image: TerrainImageDataLike,
  tiles: readonly (readonly WorldTileId[])[],
  options: BlackSeamRepairOptions
): BlackSeamRepairReport {
  const settings = resolveSettings(options);
  const mapHeight = tiles.length;
  const mapWidth = tiles[0]?.length ?? 0;
  const report: BlackSeamRepairReport = {
    mode: "black_seam_repair",
    enabled: settings.enabled,
    seed: options.seed ?? "",
    mapWidth,
    mapHeight,
    tileSize: options.tileSize,
    seamSearchRadius: settings.seamSearchRadius,
    seamSearchWidth: settings.seamSearchRadius * 2 + 1,
    seamWriteWidth: settings.seamSearchRadius * 2 + 1,
    intersectionSearchRadius: settings.intersectionSearchRadius,
    nearBlackThreshold: settings.nearBlackThreshold,
    cleanSampleMinLuminance: settings.cleanSampleMinLuminance,
    relativeDarknessThreshold: settings.relativeDarknessThreshold,
    minEdgeSampleInset: settings.minEdgeSampleInset,
    maxEdgeSampleInset: settings.maxEdgeSampleInset,
    replacementMode: "clean-neighbor-dual-mix",
    pixelsInspected: 0,
    pixelsReplaced: 0,
    replacedPixelCount: 0,
    replacementRatio: 0,
    replacedPixelPercent: 0,
    verticalSeamReplacementCount: 0,
    horizontalSeamReplacementCount: 0,
    cornerReplacementCount: 0,
    oneSidedFallbackCount: 0,
    waterSeamReplacementCount: 0,
    sameTileSeamReplacementCount: 0,
    settings
  };

  if (!settings.enabled || !mapWidth || !mapHeight) return report;
  if (image.width < mapWidth * options.tileSize || image.height < mapHeight * options.tileSize) {
    throw new Error(`Black seam repair image ${image.width}x${image.height} is smaller than map ${mapWidth}x${mapHeight} at ${options.tileSize}px.`);
  }
  if (settings.minEdgeSampleInset < 1 || settings.maxEdgeSampleInset < settings.minEdgeSampleInset) {
    throw new Error(`Black seam repair sample insets are invalid: ${settings.minEdgeSampleInset}..${settings.maxEdgeSampleInset}.`);
  }
  if (options.tileSize <= settings.maxEdgeSampleInset * 2) {
    throw new Error(`Black seam repair tile size ${options.tileSize}px is too small for ${settings.maxEdgeSampleInset}px interior sampling.`);
  }

  const source = new Uint8Array(image.data);
  const repairedMask = new Uint8Array(image.width * image.height);

  // Phase 1: Vertical seams
  for (let tileY = 0; tileY < mapHeight; tileY += 1) {
    for (let tileX = 1; tileX < mapWidth; tileX += 1) {
      const leftTileId = tiles[tileY]?.[tileX - 1];
      const rightTileId = tiles[tileY]?.[tileX];
      repairVerticalSeam(image, source, repairedMask, tileX, tileY, leftTileId, rightTileId, options.tileSize, settings, report);
    }
  }

  // Phase 2: Horizontal seams
  for (let tileY = 1; tileY < mapHeight; tileY += 1) {
    for (let tileX = 0; tileX < mapWidth; tileX += 1) {
      const topTileId = tiles[tileY - 1]?.[tileX];
      const bottomTileId = tiles[tileY]?.[tileX];
      repairHorizontalSeam(image, source, repairedMask, tileX, tileY, topTileId, bottomTileId, options.tileSize, settings, report);
    }
  }

  // Phase 3: Intersections (corners)
  for (let tileY = 1; tileY < mapHeight; tileY += 1) {
    for (let tileX = 1; tileX < mapWidth; tileX += 1) {
      const nw = tiles[tileY - 1]?.[tileX - 1];
      const ne = tiles[tileY - 1]?.[tileX];
      const sw = tiles[tileY]?.[tileX - 1];
      const se = tiles[tileY]?.[tileX];
      repairIntersection(image, source, repairedMask, tileX, tileY, nw, ne, sw, se, options.tileSize, settings, report);
    }
  }

  report.replacementRatio = report.pixelsReplaced / (image.width * image.height);
  report.replacedPixelCount = report.pixelsReplaced;
  report.replacedPixelPercent = report.replacementRatio * 100;
  if (report.replacementRatio > settings.maxReplacementRatio) {
    throw new Error(
      `Black seam repair replaced ${(report.replacementRatio * 100).toFixed(2)}% of pixels, exceeding the ${(settings.maxReplacementRatio * 100).toFixed(2)}% safety limit.`
    );
  }
  if (options.captureMask) report.mask = repairedMask;
  return report;
}

export function blackSeamRepairReportMarkdown(report: BlackSeamRepairReport): string {
  const percent = (report.replacementRatio * 100).toFixed(4);
  return `# Black Seam Repair Report

Mode: \`${report.mode}\`
Seed: \`${report.seed || "none"}\`
Map size: ${report.mapWidth}x${report.mapHeight}
Tile size: ${report.tileSize}px
Seam search radius: ${report.seamSearchRadius}px
seamSearchWidth: ${report.seamSearchWidth}px
seamWriteWidth: ${report.seamWriteWidth}px
Intersection search radius: ${report.intersectionSearchRadius}px
Near-black threshold: luminance < ${report.nearBlackThreshold}
Clean sample min luminance: ${report.cleanSampleMinLuminance}
Relative darkness threshold: ${report.relativeDarknessThreshold}
minEdgeSampleInset: ${report.minEdgeSampleInset}px
maxEdgeSampleInset: ${report.maxEdgeSampleInset}px
replacementMode: ${report.replacementMode}
Pixels inspected: ${report.pixelsInspected}
Pixels replaced: ${report.pixelsReplaced}
replacedPixelCount: ${report.replacedPixelCount}
Replacement percentage: ${percent}%
replacedPixelPercent: ${percent}%
Vertical seam pixels repaired: ${report.verticalSeamReplacementCount}
Horizontal seam pixels repaired: ${report.horizontalSeamReplacementCount}
Corner pixels repaired: ${report.cornerReplacementCount}
Water seam pixels repaired: ${report.waterSeamReplacementCount}
Same-tile seam pixels repaired: ${report.sameTileSeamReplacementCount}
One-sided fallbacks: ${report.oneSidedFallbackCount}

The old seam pixel is only used for candidate detection and never as a color source.
Replacement colors are always mixed from clean interior samples of neighboring tiles.

Enabled: ${report.enabled}
Debug view: ${report.settings.debugView}
Max replacement ratio guard: ${(report.settings.maxReplacementRatio * 100).toFixed(2)}%
`;
}

// ─── Vertical seam repair ────────────────────────────────────────────────

function repairVerticalSeam(
  image: TerrainImageDataLike,
  source: Uint8Array,
  repairedMask: Uint8Array,
  tileX: number,
  tileY: number,
  leftTileId: WorldTileId | undefined,
  rightTileId: WorldTileId | undefined,
  tileSize: number,
  settings: BlackSeamRepairSettings,
  report: BlackSeamRepairReport
) {
  const seamX = tileX * tileSize;
  const y0 = tileY * tileSize;
  const y1 = y0 + tileSize - 1;
  const sampleYMin = y0 + settings.minEdgeSampleInset;
  const sampleYMax = y1 - settings.minEdgeSampleInset;
  const leftBounds = bounds(seamX - tileSize, seamX - 1, y0, y1);
  const rightBounds = bounds(seamX, seamX + tileSize - 1, y0, y1);
  const isWater = hasWaterTile(leftTileId) || hasWaterTile(rightTileId);
  const isSameTile = leftTileId === rightTileId;

  for (let y = y0; y <= y1; y += 1) {
    const sampleY = clampInt(y, sampleYMin, sampleYMax);

    // Pre-sample clean interiors once per row for relative darkness check
    let avgInteriorLum = -1;
    let leftCleanCache: ReturnType<typeof sampleCleanPatch> | undefined;
    let rightCleanCache: ReturnType<typeof sampleCleanPatch> | undefined;

    for (let dx = -settings.seamSearchRadius; dx <= settings.seamSearchRadius; dx += 1) {
      const x = seamX + dx;
      if (x < 0 || x >= image.width) continue;
      report.pixelsInspected += 1;

      if (!isSeamArtifactPixel(source, image.width, x, y, settings, sewVerticalRepairContext(
        source, image.width, sampleY, seamX, leftBounds, rightBounds, settings
      ))) continue;

      // Get clean samples (cache per row)
      if (!leftCleanCache) leftCleanCache = findVerticalSource(source, image.width, seamX, sampleY, -1, leftBounds, settings);
      if (!rightCleanCache) rightCleanCache = findVerticalSource(source, image.width, seamX, sampleY, 1, rightBounds, settings);

      const leftClean = leftCleanCache;
      const rightClean = rightCleanCache;
      const bothSides = leftClean && rightClean;

      let replacement: readonly [number, number, number];
      if (leftClean && rightClean) {
        replacement = mixColor(leftClean, rightClean, sideWeight(dx, settings.seamSearchRadius));
      } else if (leftClean || rightClean) {
        replacement = leftClean || rightClean || [48, 48, 48];
        report.oneSidedFallbackCount += 1;
      } else {
        continue;
      }

      if (writeRepairPixel(image, repairedMask, x, y, replacement)) report.pixelsReplaced += 1;
      report.verticalSeamReplacementCount += 1;
      if (isWater) report.waterSeamReplacementCount += 1;
      if (isSameTile) report.sameTileSeamReplacementCount += 1;
    }
  }
}

// ─── Horizontal seam repair ──────────────────────────────────────────────

function repairHorizontalSeam(
  image: TerrainImageDataLike,
  source: Uint8Array,
  repairedMask: Uint8Array,
  tileX: number,
  tileY: number,
  topTileId: WorldTileId | undefined,
  bottomTileId: WorldTileId | undefined,
  tileSize: number,
  settings: BlackSeamRepairSettings,
  report: BlackSeamRepairReport
) {
  const seamY = tileY * tileSize;
  const x0 = tileX * tileSize;
  const x1 = x0 + tileSize - 1;
  const sampleXMin = x0 + settings.minEdgeSampleInset;
  const sampleXMax = x1 - settings.minEdgeSampleInset;
  const topBounds = bounds(x0, x1, seamY - tileSize, seamY - 1);
  const bottomBounds = bounds(x0, x1, seamY, seamY + tileSize - 1);
  const isWater = hasWaterTile(topTileId) || hasWaterTile(bottomTileId);
  const isSameTile = topTileId === bottomTileId;

  for (let x = x0; x <= x1; x += 1) {
    const sampleX = clampInt(x, sampleXMin, sampleXMax);

    let topCleanCache: ReturnType<typeof sampleCleanPatch> | undefined;
    let bottomCleanCache: ReturnType<typeof sampleCleanPatch> | undefined;

    for (let dy = -settings.seamSearchRadius; dy <= settings.seamSearchRadius; dy += 1) {
      const y = seamY + dy;
      if (y < 0 || y >= image.height) continue;
      report.pixelsInspected += 1;

      if (!isSeamArtifactPixel(source, image.width, x, y, settings, sewHorizontalRepairContext(
        source, image.width, sampleX, seamY, topBounds, bottomBounds, settings
      ))) continue;

      if (!topCleanCache) topCleanCache = findHorizontalSource(source, image.width, sampleX, seamY, -1, topBounds, settings);
      if (!bottomCleanCache) bottomCleanCache = findHorizontalSource(source, image.width, sampleX, seamY, 1, bottomBounds, settings);

      const topClean = topCleanCache;
      const bottomClean = bottomCleanCache;

      let replacement: readonly [number, number, number];
      if (topClean && bottomClean) {
        replacement = mixColor(topClean, bottomClean, sideWeight(dy, settings.seamSearchRadius));
      } else if (topClean || bottomClean) {
        replacement = topClean || bottomClean || [48, 48, 48];
        report.oneSidedFallbackCount += 1;
      } else {
        continue;
      }

      if (writeRepairPixel(image, repairedMask, x, y, replacement)) report.pixelsReplaced += 1;
      report.horizontalSeamReplacementCount += 1;
      if (isWater) report.waterSeamReplacementCount += 1;
      if (isSameTile) report.sameTileSeamReplacementCount += 1;
    }
  }
}

// ─── Intersection repair ─────────────────────────────────────────────────

function repairIntersection(
  image: TerrainImageDataLike,
  source: Uint8Array,
  repairedMask: Uint8Array,
  tileX: number,
  tileY: number,
  nwTileId: WorldTileId | undefined,
  neTileId: WorldTileId | undefined,
  swTileId: WorldTileId | undefined,
  seTileId: WorldTileId | undefined,
  tileSize: number,
  settings: BlackSeamRepairSettings,
  report: BlackSeamRepairReport
) {
  const cornerX = tileX * tileSize;
  const cornerY = tileY * tileSize;
  const nwBounds = bounds(cornerX - tileSize, cornerX - 1, cornerY - tileSize, cornerY - 1);
  const neBounds = bounds(cornerX, cornerX + tileSize - 1, cornerY - tileSize, cornerY - 1);
  const swBounds = bounds(cornerX - tileSize, cornerX - 1, cornerY, cornerY + tileSize - 1);
  const seBounds = bounds(cornerX, cornerX + tileSize - 1, cornerY, cornerY + tileSize - 1);

  const isWater = hasWaterTile(nwTileId) || hasWaterTile(neTileId) || hasWaterTile(swTileId) || hasWaterTile(seTileId);
  const allSame = nwTileId === neTileId && neTileId === swTileId && swTileId === seTileId;

  for (let dy = -settings.intersectionSearchRadius; dy <= settings.intersectionSearchRadius; dy += 1) {
    for (let dx = -settings.intersectionSearchRadius; dx <= settings.intersectionSearchRadius; dx += 1) {
      const x = cornerX + dx;
      const y = cornerY + dy;
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      report.pixelsInspected += 1;

      if (!isIntersectionArtifact(source, image.width, x, y, cornerX, cornerY, settings, nwBounds, neBounds, swBounds, seBounds)) continue;

      const nw = findCornerSource(source, image.width, cornerX, cornerY, -1, -1, nwBounds, settings);
      const ne = findCornerSource(source, image.width, cornerX, cornerY, 1, -1, neBounds, settings);
      const sw = findCornerSource(source, image.width, cornerX, cornerY, -1, 1, swBounds, settings);
      const se = findCornerSource(source, image.width, cornerX, cornerY, 1, 1, seBounds, settings);

      const validCount = [nw, ne, sw, se].filter(Boolean).length;
      let replacement: readonly [number, number, number];
      if (validCount >= 2) {
        replacement = cornerReplacement(dx, dy, settings.intersectionSearchRadius, nw, ne, sw, se);
      } else if (validCount === 1) {
        replacement = nw || ne || sw || se || [48, 48, 48];
        report.oneSidedFallbackCount += 1;
      } else {
        continue;
      }

      if (writeRepairPixel(image, repairedMask, x, y, replacement)) report.pixelsReplaced += 1;
      report.cornerReplacementCount += 1;
      if (isWater) report.waterSeamReplacementCount += 1;
      if (allSame) report.sameTileSeamReplacementCount += 1;
    }
  }
}

// ─── Artifact detection ──────────────────────────────────────────────────

interface SeamArtifactContext {
  getOwnSideInteriorLuminance(x: number, y: number): number;
}

function sewVerticalRepairContext(
  source: Uint8Array,
  imageWidth: number,
  sampleY: number,
  seamX: number,
  leftBounds: PixelBounds,
  rightBounds: PixelBounds,
  settings: BlackSeamRepairSettings
): () => SeamArtifactContext {
  let cachedLeftLuminance = -1;
  let cachedRightLuminance = -1;
  return () => {
    if (cachedLeftLuminance < 0) {
      cachedLeftLuminance = avgLuminance3x3(source, imageWidth, seamX - settings.minEdgeSampleInset, sampleY, leftBounds);
    }
    if (cachedRightLuminance < 0) {
      cachedRightLuminance = avgLuminance3x3(source, imageWidth, seamX + settings.minEdgeSampleInset, sampleY, rightBounds);
    }
    return {
      getOwnSideInteriorLuminance: (x: number, _y: number) => (x < seamX) ? cachedLeftLuminance : cachedRightLuminance
    };
  };
}

function sewHorizontalRepairContext(
  source: Uint8Array,
  imageWidth: number,
  sampleX: number,
  seamY: number,
  topBounds: PixelBounds,
  bottomBounds: PixelBounds,
  settings: BlackSeamRepairSettings
): () => SeamArtifactContext {
  let cachedTopLuminance = -1;
  let cachedBottomLuminance = -1;
  return () => {
    if (cachedTopLuminance < 0) {
      cachedTopLuminance = avgLuminance3x3(source, imageWidth, sampleX, seamY - settings.minEdgeSampleInset, topBounds);
    }
    if (cachedBottomLuminance < 0) {
      cachedBottomLuminance = avgLuminance3x3(source, imageWidth, sampleX, seamY + settings.minEdgeSampleInset, bottomBounds);
    }
    return {
      getOwnSideInteriorLuminance: (_x: number, y: number) => (y < seamY) ? cachedTopLuminance : cachedBottomLuminance
    };
  };
}

/**
 * Check if a pixel is a seam artifact candidate.
 *
 * Detection criteria (any one is sufficient):
 * 1. Near-black: luminance < nearBlackThreshold (38)
 * 2. Relative darkness: pixel is significantly darker than the clean interior
 *    of the tile it belongs to (not the average of both).
 *
 * The old seam pixel is NEVER used as a color source — only for detection.
 */
function isSeamArtifactPixel(
  source: Uint8Array,
  imageWidth: number,
  x: number,
  y: number,
  settings: BlackSeamRepairSettings,
  contextFactory: () => SeamArtifactContext
): boolean {
  const offset = pixelOffset(imageWidth, x, y);
  const r = source[offset];
  const g = source[offset + 1];
  const b = source[offset + 2];
  const pixelLuminance = luminance(r, g, b);

  // Criterion 1: Near-black
  if (pixelLuminance < settings.nearBlackThreshold) return true;

  // Criterion 2: Relative darkness — compare against own side's interior
  const context = contextFactory();
  const ownSideLuminance = context.getOwnSideInteriorLuminance(x, y);
  if (ownSideLuminance > 0 && pixelLuminance < ownSideLuminance - settings.relativeDarknessThreshold) return true;

  return false;
}

/**
 * Intersection artifact detection.
 * Corners often have dark cross-shaped artifacts.
 */
function isIntersectionArtifact(
  source: Uint8Array,
  imageWidth: number,
  x: number,
  y: number,
  cornerX: number,
  cornerY: number,
  settings: BlackSeamRepairSettings,
  nwBounds: PixelBounds,
  neBounds: PixelBounds,
  swBounds: PixelBounds,
  seBounds: PixelBounds
): boolean {
  const offset = pixelOffset(imageWidth, x, y);
  const r = source[offset];
  const g = source[offset + 1];
  const b = source[offset + 2];
  const pixelLuminance = luminance(r, g, b);

  // Near-black at corner
  if (pixelLuminance < settings.nearBlackThreshold) return true;

  // Relative darkness vs surrounding tiles at this corner
  const samples: number[] = [];
  const nw = findCornerSource(source, imageWidth, cornerX, cornerY, -1, -1, nwBounds, settings);
  const ne = findCornerSource(source, imageWidth, cornerX, cornerY, 1, -1, neBounds, settings);
  const sw = findCornerSource(source, imageWidth, cornerX, cornerY, -1, 1, swBounds, settings);
  const se = findCornerSource(source, imageWidth, cornerX, cornerY, 1, 1, seBounds, settings);
  for (const sample of [nw, ne, sw, se]) {
    if (sample) samples.push(luminance(sample[0], sample[1], sample[2]));
  }
  if (samples.length > 0) {
    const avgLuminance = samples.reduce((a, b) => a + b, 0) / samples.length;
    if (pixelLuminance < avgLuminance - settings.relativeDarknessThreshold) return true;
  }

  return false;
}

// ─── Clean interior sampling ─────────────────────────────────────────────

interface PixelBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function bounds(minX: number, maxX: number, minY: number, maxY: number): PixelBounds {
  return { minX, maxX, minY, maxY };
}

function findVerticalSource(
  source: Uint8Array,
  imageWidth: number,
  seamX: number,
  y: number,
  direction: -1 | 1,
  sourceBounds: PixelBounds,
  settings: BlackSeamRepairSettings
): readonly [number, number, number] | undefined {
  for (let inset = settings.minEdgeSampleInset; inset <= settings.maxEdgeSampleInset; inset += 1) {
    const x = seamX + direction * inset;
    const sample = sampleCleanPatch(source, imageWidth, x, y, sourceBounds, settings.cleanSampleMinLuminance);
    if (sample) return sample;
  }
  return undefined;
}

function findHorizontalSource(
  source: Uint8Array,
  imageWidth: number,
  x: number,
  seamY: number,
  direction: -1 | 1,
  sourceBounds: PixelBounds,
  settings: BlackSeamRepairSettings
): readonly [number, number, number] | undefined {
  for (let inset = settings.minEdgeSampleInset; inset <= settings.maxEdgeSampleInset; inset += 1) {
    const y = seamY + direction * inset;
    const sample = sampleCleanPatch(source, imageWidth, x, y, sourceBounds, settings.cleanSampleMinLuminance);
    if (sample) return sample;
  }
  return undefined;
}

function findCornerSource(
  source: Uint8Array,
  imageWidth: number,
  cornerX: number,
  cornerY: number,
  directionX: -1 | 1,
  directionY: -1 | 1,
  sourceBounds: PixelBounds,
  settings: BlackSeamRepairSettings
): readonly [number, number, number] | undefined {
  for (let inset = settings.minEdgeSampleInset; inset <= settings.maxEdgeSampleInset; inset += 1) {
    const x = cornerX + directionX * inset;
    const y = cornerY + directionY * inset;
    const sample = sampleCleanPatch(source, imageWidth, x, y, sourceBounds, settings.cleanSampleMinLuminance);
    if (sample) return sample;
  }
  return undefined;
}

/**
 * Sample a small 3×3 patch around (centerX, centerY) within sourceBounds.
 * Excludes near-black pixels. Returns the median color, or undefined if no clean pixels found.
 */
function sampleCleanPatch(
  source: Uint8Array,
  imageWidth: number,
  centerX: number,
  centerY: number,
  sourceBounds: PixelBounds,
  minLuminance: number
): readonly [number, number, number] | undefined {
  const colors: [number, number, number][] = [];
  for (let y = centerY - 1; y <= centerY + 1; y += 1) {
    if (y < sourceBounds.minY || y > sourceBounds.maxY) continue;
    for (let x = centerX - 1; x <= centerX + 1; x += 1) {
      if (x < sourceBounds.minX || x > sourceBounds.maxX) continue;
      const offset = pixelOffset(imageWidth, x, y);
      const color: [number, number, number] = [source[offset], source[offset + 1], source[offset + 2]];
      if (luminance(color[0], color[1], color[2]) < minLuminance) continue;
      colors.push(color);
    }
  }
  if (!colors.length) return undefined;
  return medianColor(colors);
}

/**
 * Compute average luminance of a 3×3 patch for relative darkness comparison.
 */
function avgLuminance3x3(
  source: Uint8Array,
  imageWidth: number,
  centerX: number,
  centerY: number,
  sourceBounds: PixelBounds
): number {
  const luminances: number[] = [];
  for (let y = centerY - 1; y <= centerY + 1; y += 1) {
    if (y < sourceBounds.minY || y > sourceBounds.maxY) continue;
    for (let x = centerX - 1; x <= centerX + 1; x += 1) {
      if (x < sourceBounds.minX || x > sourceBounds.maxX) continue;
      const offset = pixelOffset(imageWidth, x, y);
      luminances.push(luminance(source[offset], source[offset + 1], source[offset + 2]));
    }
  }
  if (!luminances.length) return -1;
  return luminances.reduce((a, b) => a + b, 0) / luminances.length;
}

// ─── Color math ──────────────────────────────────────────────────────────

function medianColor(colors: readonly (readonly [number, number, number])[]): readonly [number, number, number] {
  return [
    channelMedian(colors, 0),
    channelMedian(colors, 1),
    channelMedian(colors, 2)
  ];
}

function channelMedian(colors: readonly (readonly [number, number, number])[], channel: 0 | 1 | 2): number {
  const values = colors.map((color) => color[channel]).sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function mixColor(a: readonly [number, number, number], b: readonly [number, number, number], t: number): readonly [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function cornerReplacement(
  dx: number,
  dy: number,
  radius: number,
  nw?: readonly [number, number, number],
  ne?: readonly [number, number, number],
  sw?: readonly [number, number, number],
  se?: readonly [number, number, number]
): readonly [number, number, number] {
  const top = mixedReplacement(nw, ne, sideWeight(dx, radius));
  const bottom = mixedReplacement(sw, se, sideWeight(dx, radius));
  return mixedReplacement(top, bottom, sideWeight(dy, radius));
}

function mixedReplacement(
  a: readonly [number, number, number] | undefined,
  b: readonly [number, number, number] | undefined,
  secondWeight: number
): readonly [number, number, number] {
  if (a && b) return mixColor(a, b, secondWeight);
  if (a) return a;
  if (b) return b;
  return [48, 48, 48];
}

function sideWeight(offset: number, radius: number): number {
  if (radius <= 0) return 0.5;
  const normalized = clamp((offset + radius) / (radius * 2), 0, 1);
  return lerp(0.3, 0.7, normalized);
}

function writeRepairPixel(
  image: TerrainImageDataLike,
  repairedMask: Uint8Array,
  x: number,
  y: number,
  color: readonly [number, number, number]
): boolean {
  const maskOffset = y * image.width + x;
  const isFirstRepair = repairedMask[maskOffset] === 0;
  repairedMask[maskOffset] = 1;
  const offset = pixelOffset(image.width, x, y);
  image.data[offset] = clampByte(color[0]);
  image.data[offset + 1] = clampByte(color[1]);
  image.data[offset + 2] = clampByte(color[2]);
  image.data[offset + 3] = 255;
  return isFirstRepair;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function hasWaterTile(tileId?: WorldTileId): boolean {
  if (!tileId) return false;
  return !!WORLD_TILES[tileId] && worldTileHasTag(tileId, "water");
}

function isNearBlack(source: Uint8Array, width: number, x: number, y: number, threshold: number): boolean {
  const offset = pixelOffset(width, x, y);
  return luminance(source[offset], source[offset + 1], source[offset + 2]) < threshold;
}

function resolveSettings(options: BlackSeamRepairOptions): BlackSeamRepairSettings {
  return {
    enabled: options.enabled ?? BLACK_SEAM_REPAIR_DEFAULTS.enabled,
    debugView: options.debugView ?? BLACK_SEAM_REPAIR_DEFAULTS.debugView,
    seamSearchRadius: options.seamSearchRadius ?? BLACK_SEAM_REPAIR_DEFAULTS.seamSearchRadius,
    intersectionSearchRadius: options.intersectionSearchRadius ?? BLACK_SEAM_REPAIR_DEFAULTS.intersectionSearchRadius,
    nearBlackThreshold: options.nearBlackThreshold ?? BLACK_SEAM_REPAIR_DEFAULTS.nearBlackThreshold,
    cleanSampleMinLuminance: options.cleanSampleMinLuminance ?? BLACK_SEAM_REPAIR_DEFAULTS.cleanSampleMinLuminance,
    relativeDarknessThreshold: options.relativeDarknessThreshold ?? BLACK_SEAM_REPAIR_DEFAULTS.relativeDarknessThreshold,
    minEdgeSampleInset: options.minEdgeSampleInset ?? BLACK_SEAM_REPAIR_DEFAULTS.minEdgeSampleInset,
    maxEdgeSampleInset: options.maxEdgeSampleInset ?? BLACK_SEAM_REPAIR_DEFAULTS.maxEdgeSampleInset,
    maxReplacementRatio: options.maxReplacementRatio ?? BLACK_SEAM_REPAIR_DEFAULTS.maxReplacementRatio
  };
}

function pixelOffset(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

function luminance(r: number, g: number, b: number): number {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function clampByte(value: number): number {
  return Math.round(clamp(value, 0, 255));
}
