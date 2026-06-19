import type { WorldTileId } from "../data/worldTiles.ts";

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
  minEdgeSampleInset: number;
  maxEdgeSampleInset: number;
  replacementMode: "dual-side-mix";
  pixelsInspected: number;
  pixelsReplaced: number;
  replacedPixelCount: number;
  replacementRatio: number;
  replacedPixelPercent: number;
  verticalPixelsRepaired: number;
  horizontalPixelsRepaired: number;
  intersectionPixelsRepaired: number;
  settings: BlackSeamRepairSettings;
  mask?: Uint8Array;
}

export const SEAM_SEARCH_RADIUS = 4;
export const INTERSECTION_SEARCH_RADIUS = 5;
export const MIN_EDGE_SAMPLE_INSET = 3;
export const MAX_EDGE_SAMPLE_INSET = 6;
export const NEAR_BLACK_LUMINANCE_THRESHOLD = 32;
export const BLACK_SEAM_REPAIR_MAX_REPLACEMENT_RATIO = 0.12;

export const BLACK_SEAM_REPAIR_DEFAULTS: BlackSeamRepairSettings = {
  enabled: true,
  debugView: false,
  seamSearchRadius: SEAM_SEARCH_RADIUS,
  intersectionSearchRadius: INTERSECTION_SEARCH_RADIUS,
  nearBlackThreshold: NEAR_BLACK_LUMINANCE_THRESHOLD,
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
    minEdgeSampleInset: settings.minEdgeSampleInset,
    maxEdgeSampleInset: settings.maxEdgeSampleInset,
    replacementMode: "dual-side-mix",
    pixelsInspected: 0,
    pixelsReplaced: 0,
    replacedPixelCount: 0,
    replacementRatio: 0,
    replacedPixelPercent: 0,
    verticalPixelsRepaired: 0,
    horizontalPixelsRepaired: 0,
    intersectionPixelsRepaired: 0,
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
  for (let tileY = 0; tileY < mapHeight; tileY += 1) {
    for (let tileX = 1; tileX < mapWidth; tileX += 1) {
      repairVerticalSeam(image, source, repairedMask, tileX, tileY, options.tileSize, settings, report);
    }
  }
  for (let tileY = 1; tileY < mapHeight; tileY += 1) {
    for (let tileX = 0; tileX < mapWidth; tileX += 1) {
      repairHorizontalSeam(image, source, repairedMask, tileX, tileY, options.tileSize, settings, report);
    }
  }
  for (let tileY = 1; tileY < mapHeight; tileY += 1) {
    for (let tileX = 1; tileX < mapWidth; tileX += 1) {
      repairIntersection(image, source, repairedMask, tileX, tileY, options.tileSize, settings, report);
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
minEdgeSampleInset: ${report.minEdgeSampleInset}px
maxEdgeSampleInset: ${report.maxEdgeSampleInset}px
replacementMode: ${report.replacementMode}
Pixels inspected: ${report.pixelsInspected}
Pixels replaced: ${report.pixelsReplaced}
replacedPixelCount: ${report.replacedPixelCount}
Replacement percentage: ${percent}%
replacedPixelPercent: ${percent}%
Vertical seam pixels repaired: ${report.verticalPixelsRepaired}
Horizontal seam pixels repaired: ${report.horizontalPixelsRepaired}
Intersection pixels repaired: ${report.intersectionPixelsRepaired}
Enabled: ${report.enabled}
Debug view: ${report.settings.debugView}
Max replacement ratio guard: ${(report.settings.maxReplacementRatio * 100).toFixed(2)}%
`;
}

function repairVerticalSeam(
  image: TerrainImageDataLike,
  source: Uint8Array,
  repairedMask: Uint8Array,
  tileX: number,
  tileY: number,
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

  for (let y = y0; y <= y1; y += 1) {
    const sampleY = clampInt(y, sampleYMin, sampleYMax);
    for (let dx = -settings.seamSearchRadius; dx <= settings.seamSearchRadius; dx += 1) {
      const x = seamX + dx;
      if (x < 0 || x >= image.width) continue;
      report.pixelsInspected += 1;
      if (!isNearBlack(source, image.width, x, y, settings.nearBlackThreshold)) continue;
      const left = findVerticalSource(source, image.width, seamX, sampleY, -1, leftBounds, settings);
      const right = findVerticalSource(source, image.width, seamX, sampleY, 1, rightBounds, settings);
      const replacement = mixedReplacement(left, right, sideWeight(dx, settings.seamSearchRadius));
      if (writeRepairPixel(image, repairedMask, x, y, replacement)) report.pixelsReplaced += 1;
      report.verticalPixelsRepaired += 1;
    }
  }
}

function repairHorizontalSeam(
  image: TerrainImageDataLike,
  source: Uint8Array,
  repairedMask: Uint8Array,
  tileX: number,
  tileY: number,
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

  for (let x = x0; x <= x1; x += 1) {
    const sampleX = clampInt(x, sampleXMin, sampleXMax);
    for (let dy = -settings.seamSearchRadius; dy <= settings.seamSearchRadius; dy += 1) {
      const y = seamY + dy;
      if (y < 0 || y >= image.height) continue;
      report.pixelsInspected += 1;
      if (!isNearBlack(source, image.width, x, y, settings.nearBlackThreshold)) continue;
      const top = findHorizontalSource(source, image.width, sampleX, seamY, -1, topBounds, settings);
      const bottom = findHorizontalSource(source, image.width, sampleX, seamY, 1, bottomBounds, settings);
      const replacement = mixedReplacement(top, bottom, sideWeight(dy, settings.seamSearchRadius));
      if (writeRepairPixel(image, repairedMask, x, y, replacement)) report.pixelsReplaced += 1;
      report.horizontalPixelsRepaired += 1;
    }
  }
}

function repairIntersection(
  image: TerrainImageDataLike,
  source: Uint8Array,
  repairedMask: Uint8Array,
  tileX: number,
  tileY: number,
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

  for (let dy = -settings.intersectionSearchRadius; dy <= settings.intersectionSearchRadius; dy += 1) {
    for (let dx = -settings.intersectionSearchRadius; dx <= settings.intersectionSearchRadius; dx += 1) {
      const x = cornerX + dx;
      const y = cornerY + dy;
      if (x < 0 || y < 0 || x >= image.width || y >= image.height) continue;
      report.pixelsInspected += 1;
      if (!isNearBlack(source, image.width, x, y, settings.nearBlackThreshold)) continue;
      const nw = findCornerSource(source, image.width, cornerX, cornerY, -1, -1, nwBounds, settings);
      const ne = findCornerSource(source, image.width, cornerX, cornerY, 1, -1, neBounds, settings);
      const sw = findCornerSource(source, image.width, cornerX, cornerY, -1, 1, swBounds, settings);
      const se = findCornerSource(source, image.width, cornerX, cornerY, 1, 1, seBounds, settings);
      const replacement = cornerReplacement(dx, dy, settings.intersectionSearchRadius, nw, ne, sw, se);
      if (writeRepairPixel(image, repairedMask, x, y, replacement)) report.pixelsReplaced += 1;
      report.intersectionPixelsRepaired += 1;
    }
  }
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
    const sample = sampleCleanPatch(source, imageWidth, x, y, sourceBounds, settings.nearBlackThreshold);
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
    const sample = sampleCleanPatch(source, imageWidth, x, y, sourceBounds, settings.nearBlackThreshold);
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
    const sample = sampleCleanPatch(source, imageWidth, x, y, sourceBounds, settings.nearBlackThreshold);
    if (sample) return sample;
  }
  return undefined;
}

function sampleCleanPatch(
  source: Uint8Array,
  imageWidth: number,
  centerX: number,
  centerY: number,
  sourceBounds: PixelBounds,
  nearBlackThreshold: number
): readonly [number, number, number] | undefined {
  const colors: [number, number, number][] = [];
  for (let y = centerY - 1; y <= centerY + 1; y += 1) {
    if (y < sourceBounds.minY || y > sourceBounds.maxY) continue;
    for (let x = centerX - 1; x <= centerX + 1; x += 1) {
      if (x < sourceBounds.minX || x > sourceBounds.maxX) continue;
      const offset = pixelOffset(imageWidth, x, y);
      const color: [number, number, number] = [source[offset], source[offset + 1], source[offset + 2]];
      if (luminance(color[0], color[1], color[2]) < nearBlackThreshold) continue;
      colors.push(color);
    }
  }
  if (!colors.length) return undefined;
  return medianColor(colors);
}

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

function isNearBlack(source: Uint8Array, width: number, x: number, y: number, threshold: number): boolean {
  const offset = pixelOffset(width, x, y);
  return luminance(source[offset], source[offset + 1], source[offset + 2]) < threshold;
}

function samplePixel(source: Uint8Array, width: number, x: number, y: number): readonly [number, number, number] {
  const offset = pixelOffset(width, x, y);
  return [source[offset], source[offset + 1], source[offset + 2]];
}

function mixColor(a: readonly [number, number, number], b: readonly [number, number, number], t: number): readonly [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function resolveSettings(options: BlackSeamRepairOptions): BlackSeamRepairSettings {
  return {
    enabled: options.enabled ?? BLACK_SEAM_REPAIR_DEFAULTS.enabled,
    debugView: options.debugView ?? BLACK_SEAM_REPAIR_DEFAULTS.debugView,
    seamSearchRadius: options.seamSearchRadius ?? BLACK_SEAM_REPAIR_DEFAULTS.seamSearchRadius,
    intersectionSearchRadius: options.intersectionSearchRadius ?? BLACK_SEAM_REPAIR_DEFAULTS.intersectionSearchRadius,
    nearBlackThreshold: options.nearBlackThreshold ?? BLACK_SEAM_REPAIR_DEFAULTS.nearBlackThreshold,
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
