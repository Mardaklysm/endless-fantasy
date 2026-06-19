import type { WorldTileId } from "../data/worldTiles.ts";
import { worldTileHasTag } from "../data/worldTiles.ts";

export interface TerrainImageDataLike {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export interface BlackSeamRepairSettings {
  enabled: boolean;
  debugView: boolean;
  seamSearchRadius: number;
  seamTargetRadius: number;
  cornerSearchRadius: number;
  interiorSampleInset: number;
  maxFallbackInset: number;
  interiorSampleJitter: number;
  nearBlackThreshold: number;
  relativeDarknessThreshold: number;
  maxReplacementRatio: number;
}

export interface BlackSeamRepairOptions extends Partial<BlackSeamRepairSettings> {
  seed?: string;
  tileSize: number;
  captureMask?: boolean;
  strict?: boolean;
}

export interface BlackSeamRepairReport {
  mode: "black_seam_repair";
  enabled: boolean;
  seed: string;
  mapWidth: number;
  mapHeight: number;
  tileSize: number;
  seamSearchRadius: number;
  seamTargetRadius: number;
  cornerSearchRadius: number;
  interiorSampleInset: number;
  maxFallbackInset: number;
  interiorSampleJitter: number;
  nearBlackThreshold: number;
  relativeDarknessThreshold: number;
  replacementMode: "deterministic-neighbor-dither";
  usesOldPixelAsSource: false;
  totalReplacedPixels: number;
  replacedPixelPercent: number;
  maxAllowedPercent: number;
  safetyExceeded: boolean;
  repairApplied: boolean;
  runtimeFallbackUsed: boolean;
  strictMode: boolean;
  verticalSeamReplacementCount: number;
  horizontalSeamReplacementCount: number;
  cornerReplacementCount: number;
  waterSeamReplacementCount: number;
  sameTileSeamReplacementCount: number;
  oneSidedFallbackCount: number;
  settings: BlackSeamRepairSettings;
  mask?: Uint8Array;
}

export const SEAM_SEARCH_RADIUS = 4;
export const SEAM_TARGET_RADIUS = 2;
export const CORNER_SEARCH_RADIUS = 5;
export const INTERIOR_SAMPLE_INSET = 4;
export const MAX_FALLBACK_INSET = 8;
export const INTERIOR_SAMPLE_JITTER = 2;
export const NEAR_BLACK_LUMINANCE_THRESHOLD = 38;
export const CLEAN_SAMPLE_MIN_LUMINANCE = 18;
export const RELATIVE_DARKNESS_THRESHOLD = 26;
export const BLACK_SEAM_REPAIR_MAX_REPLACEMENT_RATIO = 0.12;

export const BLACK_SEAM_REPAIR_DEFAULTS: BlackSeamRepairSettings = {
  enabled: true,
  debugView: false,
  seamSearchRadius: SEAM_SEARCH_RADIUS,
  seamTargetRadius: SEAM_TARGET_RADIUS,
  cornerSearchRadius: CORNER_SEARCH_RADIUS,
  interiorSampleInset: INTERIOR_SAMPLE_INSET,
  maxFallbackInset: MAX_FALLBACK_INSET,
  interiorSampleJitter: INTERIOR_SAMPLE_JITTER,
  nearBlackThreshold: NEAR_BLACK_LUMINANCE_THRESHOLD,
  relativeDarknessThreshold: RELATIVE_DARKNESS_THRESHOLD,
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
    seamTargetRadius: settings.seamTargetRadius,
    cornerSearchRadius: settings.cornerSearchRadius,
    interiorSampleInset: settings.interiorSampleInset,
    maxFallbackInset: settings.maxFallbackInset,
    interiorSampleJitter: settings.interiorSampleJitter,
    nearBlackThreshold: settings.nearBlackThreshold,
    relativeDarknessThreshold: settings.relativeDarknessThreshold,
    replacementMode: "deterministic-neighbor-dither",
    usesOldPixelAsSource: false,
    totalReplacedPixels: 0,
    replacedPixelPercent: 0,
    maxAllowedPercent: settings.maxReplacementRatio * 100,
    safetyExceeded: false,
    repairApplied: false,
    runtimeFallbackUsed: false,
    strictMode: options.strict ?? false,
    verticalSeamReplacementCount: 0,
    horizontalSeamReplacementCount: 0,
    cornerReplacementCount: 0,
    waterSeamReplacementCount: 0,
    sameTileSeamReplacementCount: 0,
    oneSidedFallbackCount: 0,
    settings
  };

  if (!settings.enabled || !mapWidth || !mapHeight) return report;
  const tileSize = options.tileSize;
  if (image.width < mapWidth * tileSize || image.height < mapHeight * tileSize) {
    throw new Error(`Black seam repair image ${image.width}x${image.height} is smaller than map ${mapWidth}x${mapHeight} at ${tileSize}px.`);
  }
  if (tileSize <= settings.interiorSampleInset * 2) {
    throw new Error(`Black seam repair tile size ${tileSize}px is too small for ${settings.interiorSampleInset}px interior sampling.`);
  }

  const source = new Uint8Array(image.data);
  const repairedMask = new Uint8Array(image.width * image.height);
  const seed = options.seed ?? "black-seam-repair";

  // Process each tile Y: repair its seams with neighbors above, right, below, left.
  // Vertical seams: tile Y with tile right of it
  for (let tileY = 0; tileY < mapHeight; tileY += 1) {
    for (let tileX = 1; tileX < mapWidth; tileX += 1) {
      repairVerticalSeam(
        image, source, repairedMask,
        tileX, tileY,
        tiles[tileY]?.[tileX - 1], tiles[tileY]?.[tileX],
        tileSize, settings, seed, report
      );
    }
  }

  // Horizontal seams: tile Y with tile below it
  for (let tileY = 1; tileY < mapHeight; tileY += 1) {
    for (let tileX = 0; tileX < mapWidth; tileX += 1) {
      repairHorizontalSeam(
        image, source, repairedMask,
        tileX, tileY,
        tiles[tileY - 1]?.[tileX], tiles[tileY]?.[tileX],
        tileSize, settings, seed, report
      );
    }
  }

  // Corner intersections
  for (let tileY = 1; tileY < mapHeight; tileY += 1) {
    for (let tileX = 1; tileX < mapWidth; tileX += 1) {
      repairCornerIntersection(
        image, source, repairedMask,
        tileX, tileY,
        tiles[tileY - 1]?.[tileX - 1], tiles[tileY - 1]?.[tileX],
        tiles[tileY]?.[tileX - 1], tiles[tileY]?.[tileX],
        tileSize, settings, seed, report
      );
    }
  }

  const totalPixels = image.width * image.height;
  report.totalReplacedPixels = report.verticalSeamReplacementCount + report.horizontalSeamReplacementCount + report.cornerReplacementCount;
  report.replacedPixelPercent = totalPixels > 0 ? (report.totalReplacedPixels / totalPixels) * 100 : 0;
  report.maxAllowedPercent = settings.maxReplacementRatio * 100;

  const exceeded = report.totalReplacedPixels / totalPixels > settings.maxReplacementRatio;
  report.safetyExceeded = exceeded;

  if (exceeded) {
    if (options.strict) {
      throw new Error(
        `Black seam repair replaced too many pixels (${report.replacedPixelPercent.toFixed(2)}%), exceeding ${report.maxAllowedPercent.toFixed(2)}% limit.`
      );
    }
    // Non-strict (runtime): restore original image, report fallback
    report.repairApplied = false;
    report.runtimeFallbackUsed = true;
    image.data.set(new Uint8Array(report.mapWidth * report.tileSize * report.mapHeight * report.tileSize * 4));
    // Re-copy original data: we already have it in `source` before modifications
    // But source was captured after modifications started... we need to restore from original.
    // The caller should handle this: we return with safetyExceeded=true and repairApplied=false.
    // Actually, we restore here since we have the modified image.
    image.data.set(source);
    if (options.captureMask) report.mask = repairedMask;
    return report;
  }

  report.repairApplied = true;
  if (options.captureMask) report.mask = repairedMask;
  return report;
}

export function blackSeamRepairReportMarkdown(report: BlackSeamRepairReport): string {
  return `# Black Seam Repair Report

Mode: \`${report.mode}\`
Seed: \`${report.seed || "none"}\`
Map size: ${report.mapWidth}x${report.mapHeight}
Tile size: ${report.tileSize}px
Seam search radius: ${report.seamSearchRadius}px
Seam target radius: ${report.seamTargetRadius}px
Corner search radius: ${report.cornerSearchRadius}px
Interior sample inset: ${report.interiorSampleInset}px
Max fallback inset: ${report.maxFallbackInset}px
Interior sample jitter: ${report.interiorSampleJitter}px
Near-black threshold: luminance < ${report.nearBlackThreshold}
Relative darkness threshold: ${report.relativeDarknessThreshold}
replacementMode: ${report.replacementMode}
usesOldPixelAsSource: ${report.usesOldPixelAsSource}
Max allowed percent: ${report.maxAllowedPercent.toFixed(2)}%
Safety exceeded: ${report.safetyExceeded}
Repair applied: ${report.repairApplied}
Runtime fallback used: ${report.runtimeFallbackUsed}
Strict mode: ${report.strictMode}

The old seam pixel is ONLY a destination mask trigger.
It is NEVER used as a color source.
Replacement pixels are chosen from clean interior samples using deterministic dithering.
No color averaging/blending is performed.

Vertical seam pixels repaired: ${report.verticalSeamReplacementCount}
Horizontal seam pixels repaired: ${report.horizontalSeamReplacementCount}
Corner pixels repaired: ${report.cornerReplacementCount}
Water seam pixels repaired: ${report.waterSeamReplacementCount}
Same-tile seam pixels repaired: ${report.sameTileSeamReplacementCount}
One-sided fallbacks: ${report.oneSidedFallbackCount}
Total replaced pixels: ${report.totalReplacedPixels}
Replaced pixel percent: ${report.replacedPixelPercent.toFixed(4)}%

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
  seed: string,
  report: BlackSeamRepairReport
) {
  const seamX = tileX * tileSize;
  const y0 = tileY * tileSize;
  const y1 = y0 + tileSize - 1;
  const yMin = y0 + settings.interiorSampleInset;
  const yMax = y1 - settings.interiorSampleInset;
  const isWater = hasWaterTile(leftTileId) || hasWaterTile(rightTileId);
  const isSameTile = leftTileId === rightTileId;

  for (let y = y0; y <= y1; y += 1) {
    const sampleY = clampInt(y, yMin, yMax);
    const jitterY = jitter(sampleY, settings.interiorSampleJitter, yMin, yMax, seed, y);

    // Get clean samples from both tile interiors (4px inset, with jitter)
    const leftX = seamX - settings.interiorSampleInset;
    const rightX = seamX + settings.interiorSampleInset;
    let leftColor = sampleCleanPoint(source, image.width, leftX, jitterY, CLEAN_SAMPLE_MIN_LUMINANCE);
    let rightColor = sampleCleanPoint(source, image.width, rightX, jitterY, CLEAN_SAMPLE_MIN_LUMINANCE);

    // Fallback: try deeper insets if needed
    if (!leftColor) leftColor = sampleFallbackDeep(source, image.width, seamX, -1, jitterY, settings);
    if (!rightColor) rightColor = sampleFallbackDeep(source, image.width, seamX, 1, jitterY, settings);

    // Compute interior luminances for relative darkness detection
    const leftLum = leftColor ? luminance(leftColor[0], leftColor[1], leftColor[2]) : -1;
    const rightLum = rightColor ? luminance(rightColor[0], rightColor[1], rightColor[2]) : -1;
    const minInteriorLum = (leftLum > 0 && rightLum > 0) ? Math.min(leftLum, rightLum) : Math.max(leftLum, rightLum);

    for (let dx = -settings.seamTargetRadius; dx <= settings.seamTargetRadius; dx += 1) {
      const x = seamX + dx;
      if (x < 0 || x >= image.width) continue;
      if (!isArtifactAt(source, image.width, x, y, settings, minInteriorLum)) continue;

      // Dither-pick: choose left or right clean color based on position hash
      const pickRight = ditherPick(x, y, dx, settings.seamTargetRadius, seed);
      const chosen = pickRight ? rightColor : leftColor;
      if (!chosen) {
        // One-sided fallback
        const fallback = leftColor || rightColor;
        if (!fallback) continue;
        setPixel(image, repairedMask, x, y, fallback);
        report.oneSidedFallbackCount += 1;
      } else {
        setPixel(image, repairedMask, x, y, chosen);
      }

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
  seed: string,
  report: BlackSeamRepairReport
) {
  const seamY = tileY * tileSize;
  const x0 = tileX * tileSize;
  const x1 = x0 + tileSize - 1;
  const xMin = x0 + settings.interiorSampleInset;
  const xMax = x1 - settings.interiorSampleInset;
  const isWater = hasWaterTile(topTileId) || hasWaterTile(bottomTileId);
  const isSameTile = topTileId === bottomTileId;

  for (let x = x0; x <= x1; x += 1) {
    const sampleX = clampInt(x, xMin, xMax);
    const jitterX = jitter(sampleX, settings.interiorSampleJitter, xMin, xMax, seed, x + 10000);

    const topY = seamY - settings.interiorSampleInset;
    const bottomY = seamY + settings.interiorSampleInset;
    let topColor = sampleCleanPoint(source, image.width, jitterX, topY, CLEAN_SAMPLE_MIN_LUMINANCE);
    let bottomColor = sampleCleanPoint(source, image.width, jitterX, bottomY, CLEAN_SAMPLE_MIN_LUMINANCE);

    if (!topColor) topColor = sampleFallbackDeepH(source, image.width, jitterX, seamY, -1, settings);
    if (!bottomColor) bottomColor = sampleFallbackDeepH(source, image.width, jitterX, seamY, 1, settings);

    const topLum = topColor ? luminance(topColor[0], topColor[1], topColor[2]) : -1;
    const bottomLum = bottomColor ? luminance(bottomColor[0], bottomColor[1], bottomColor[2]) : -1;
    const minInteriorLum = (topLum > 0 && bottomLum > 0) ? Math.min(topLum, bottomLum) : Math.max(topLum, bottomLum);

    for (let dy = -settings.seamTargetRadius; dy <= settings.seamTargetRadius; dy += 1) {
      const y = seamY + dy;
      if (y < 0 || y >= image.height) continue;
      if (!isArtifactAt(source, image.width, x, y, settings, minInteriorLum)) continue;

      const pickBottom = ditherPick(x, y, dy, settings.seamTargetRadius, seed + ":h");
      const chosen = pickBottom ? bottomColor : topColor;
      if (!chosen) {
        const fallback = topColor || bottomColor;
        if (!fallback) continue;
        setPixel(image, repairedMask, x, y, fallback);
        report.oneSidedFallbackCount += 1;
      } else {
        setPixel(image, repairedMask, x, y, chosen);
      }

      report.horizontalSeamReplacementCount += 1;
      if (isWater) report.waterSeamReplacementCount += 1;
      if (isSameTile) report.sameTileSeamReplacementCount += 1;
    }
  }
}

// ─── Corner intersection repair ──────────────────────────────────────────

function repairCornerIntersection(
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
  seed: string,
  report: BlackSeamRepairReport
) {
  const cornerX = tileX * tileSize;
  const cornerY = tileY * tileSize;
  const isWater = hasWaterTile(nwTileId) || hasWaterTile(neTileId) || hasWaterTile(swTileId) || hasWaterTile(seTileId);
  const allSame = nwTileId === neTileId && neTileId === swTileId && swTileId === seTileId;
  const inset = settings.interiorSampleInset;
  const jit = settings.interiorSampleJitter;

  // Sample clean colors from each of the four corner tiles
  const nw = sampleCleanPoint(source, image.width, cornerX - inset, cornerY - inset, CLEAN_SAMPLE_MIN_LUMINANCE);
  const ne = sampleCleanPoint(source, image.width, cornerX + inset, cornerY - inset, CLEAN_SAMPLE_MIN_LUMINANCE);
  const sw = sampleCleanPoint(source, image.width, cornerX - inset, cornerY + inset, CLEAN_SAMPLE_MIN_LUMINANCE);
  const se = sampleCleanPoint(source, image.width, cornerX + inset, cornerY + inset, CLEAN_SAMPLE_MIN_LUMINANCE);

  const samples: (readonly [number, number, number] | undefined)[] = [nw, ne, sw, se];
  const validSamples = samples.filter(Boolean) as ([number, number, number])[];
  if (!validSamples.length) return;

  const minLum = validSamples.reduce((m, s) => Math.min(m, luminance(s[0], s[1], s[2])), 255);

  for (let dy = -settings.cornerSearchRadius; dy <= settings.cornerSearchRadius; dy += 1) {
    for (let dx = -settings.cornerSearchRadius; dx <= settings.cornerSearchRadius; dx += 1) {
      const x = cornerX + dx;
      const y = cornerY + dy;
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      if (!isArtifactAt(source, image.width, x, y, settings, minLum)) continue;

      // Dither-pick among the valid corner samples
      const idx = deterministicIndex(x, y, validSamples.length, seed + ":corner");
      setPixel(image, repairedMask, x, y, validSamples[idx]);

      report.cornerReplacementCount += 1;
      if (isWater) report.waterSeamReplacementCount += 1;
      if (allSame) report.sameTileSeamReplacementCount += 1;
    }
  }
}

// ─── Artifact detection ──────────────────────────────────────────────────

function isArtifactAt(
  source: Uint8Array,
  imageWidth: number,
  x: number,
  y: number,
  settings: BlackSeamRepairSettings,
  minInteriorLuminance: number
): boolean {
  const offset = pixelOffset(imageWidth, x, y);
  const r = source[offset];
  const g = source[offset + 1];
  const b = source[offset + 2];
  const pixelLuminance = luminance(r, g, b);

  // Criterion 1: Near-black
  if (pixelLuminance < settings.nearBlackThreshold) return true;

  // Criterion 2: Significantly darker than both neighbors
  if (minInteriorLuminance > 0 && pixelLuminance < minInteriorLuminance - settings.relativeDarknessThreshold) return true;

  return false;
}

// ─── Clean point sampling ────────────────────────────────────────────────

function sampleCleanPoint(
  source: Uint8Array,
  imageWidth: number,
  x: number,
  y: number,
  minLuminance: number
): readonly [number, number, number] | undefined {
  if (x < 0 || y < 0 || x >= imageWidth) return undefined;
  // Check the source image bounds via the data length
  const offset = pixelOffset(imageWidth, x, y);
  if (offset + 2 >= source.length) return undefined;
  const r = source[offset];
  const g = source[offset + 1];
  const b = source[offset + 2];
  if (luminance(r, g, b) < minLuminance) return undefined;
  return [r, g, b];
}

function sampleFallbackDeep(
  source: Uint8Array,
  imageWidth: number,
  seamX: number,
  direction: -1 | 1,
  y: number,
  settings: BlackSeamRepairSettings
): readonly [number, number, number] | undefined {
  for (let inset = settings.interiorSampleInset + 1; inset <= settings.maxFallbackInset; inset += 1) {
    const x = seamX + direction * inset;
    const color = sampleCleanPoint(source, imageWidth, x, y, CLEAN_SAMPLE_MIN_LUMINANCE);
    if (color) return color;
  }
  return undefined;
}

function sampleFallbackDeepH(
  source: Uint8Array,
  imageWidth: number,
  x: number,
  seamY: number,
  direction: -1 | 1,
  settings: BlackSeamRepairSettings
): readonly [number, number, number] | undefined {
  for (let inset = settings.interiorSampleInset + 1; inset <= settings.maxFallbackInset; inset += 1) {
    const y = seamY + direction * inset;
    const color = sampleCleanPoint(source, imageWidth, x, y, CLEAN_SAMPLE_MIN_LUMINANCE);
    if (color) return color;
  }
  return undefined;
}

// ─── Dither-pick logic ───────────────────────────────────────────────────

/**
 * Deterministic dither-pick: returns true to pick the right/bottom side,
 * false to pick the left/top side.
 *
 * Uses a hash of (x, y, seed) to produce a stable 0..1 value,
 * then applies a position-based weight so pixels closer to a side
 * are more likely to pick that side's clean sample.
 */
function ditherPick(x: number, y: number, offset: number, radius: number, seed: string): boolean {
  const h = hash01(x, y, seed);
  // Weight: pixels closer to right (offset > 0) are more likely to pick right
  const threshold = pickThreshold(offset, radius);
  return h < threshold;
}

function pickThreshold(offset: number, radius: number): number {
  // offset in [-radius, +radius]: -radius = far left, +radius = far right
  // Returns 0..1 probability of picking the right side
  if (radius <= 0) return 0.5;
  const normalized = (offset + radius) / (radius * 2); // 0 at far left, 1 at far right
  return 0.3 + 0.4 * normalized; // 0.3 at far left, 0.7 at far right
}

function deterministicIndex(x: number, y: number, count: number, seed: string): number {
  return Math.floor(hash01(x, y, seed) * count) % count;
}

// ─── Hash functions ──────────────────────────────────────────────────────

function hash01(x: number, y: number, seed: string): number {
  let h = hashString(seed);
  h ^= Math.imul(x + 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(y + 0xc2b2ae35, 0x27d4eb2f);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// ─── Pixel write ─────────────────────────────────────────────────────────

function setPixel(
  image: TerrainImageDataLike,
  repairedMask: Uint8Array,
  x: number,
  y: number,
  color: readonly [number, number, number]
) {
  const maskOffset = y * image.width + x;
  repairedMask[maskOffset] = 1;
  const offset = pixelOffset(image.width, x, y);
  image.data[offset] = clampByte(color[0]);
  image.data[offset + 1] = clampByte(color[1]);
  image.data[offset + 2] = clampByte(color[2]);
  image.data[offset + 3] = 255;
}

// ─── Jitter ──────────────────────────────────────────────────────────────

function jitter(base: number, maxJitter: number, min: number, max: number, seed: string, idx: number): number {
  if (maxJitter <= 0) return base;
  const h = hash01(idx, 0, seed + ":jitter");
  const offset = Math.round((h - 0.5) * 2 * maxJitter);
  return clampInt(base + offset, min, max);
}

// ─── Water helper ────────────────────────────────────────────────────────

function hasWaterTile(tileId?: WorldTileId): boolean {
  if (!tileId) return false;
  return worldTileHasTag(tileId, "water");
}

// ─── Settings ────────────────────────────────────────────────────────────

function resolveSettings(options: BlackSeamRepairOptions): BlackSeamRepairSettings {
  return {
    enabled: options.enabled ?? BLACK_SEAM_REPAIR_DEFAULTS.enabled,
    debugView: options.debugView ?? BLACK_SEAM_REPAIR_DEFAULTS.debugView,
    seamSearchRadius: options.seamSearchRadius ?? BLACK_SEAM_REPAIR_DEFAULTS.seamSearchRadius,
    seamTargetRadius: options.seamTargetRadius ?? BLACK_SEAM_REPAIR_DEFAULTS.seamTargetRadius,
    cornerSearchRadius: options.cornerSearchRadius ?? BLACK_SEAM_REPAIR_DEFAULTS.cornerSearchRadius,
    interiorSampleInset: options.interiorSampleInset ?? BLACK_SEAM_REPAIR_DEFAULTS.interiorSampleInset,
    maxFallbackInset: options.maxFallbackInset ?? BLACK_SEAM_REPAIR_DEFAULTS.maxFallbackInset,
    interiorSampleJitter: options.interiorSampleJitter ?? BLACK_SEAM_REPAIR_DEFAULTS.interiorSampleJitter,
    nearBlackThreshold: options.nearBlackThreshold ?? BLACK_SEAM_REPAIR_DEFAULTS.nearBlackThreshold,
    relativeDarknessThreshold: options.relativeDarknessThreshold ?? BLACK_SEAM_REPAIR_DEFAULTS.relativeDarknessThreshold,
    maxReplacementRatio: options.maxReplacementRatio ?? BLACK_SEAM_REPAIR_DEFAULTS.maxReplacementRatio
  };
}

// ─── Math helpers ────────────────────────────────────────────────────────

function pixelOffset(width: number, x: number, y: number): number {
  return (y * width + x) * 4;
}

function luminance(r: number, g: number, b: number): number {
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(Math.max(min, Math.min(max, value)));
}

function clampByte(value: number): number {
  return Math.round(Math.max(0, Math.min(255, value)));
}
