import { createRequire } from "node:module";
import { BIOME, WATER } from "./generator.mjs";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const RIVER_NORTH = 1;
const RIVER_EAST = 2;
const RIVER_SOUTH = 4;
const RIVER_WEST = 8;

const COLORS = {
  deepOcean: [18, 73, 111, 255],
  deepOceanAlt: [14, 61, 96, 255],
  shallow: [53, 147, 177, 255],
  shallowAlt: [67, 164, 190, 255],
  beach: [232, 206, 143, 255],
  beachLight: [247, 229, 174, 255],
  grass: [89, 168, 75, 255],
  grassAlt: [109, 186, 84, 255],
  sand: [196, 166, 96, 255],
  sandAlt: [215, 186, 118, 255],
  ash: [69, 61, 53, 255],
  ashAlt: [88, 78, 65, 255],
  ashMountain: [58, 56, 52, 255],
  ashMountainLight: [96, 84, 70, 255],
  ice: [213, 239, 239, 255],
  iceAlt: [182, 222, 232, 255],
  river: [31, 139, 196, 255],
  lake: [38, 129, 177, 255],
  road: [179, 132, 65, 255],
  roadDark: [127, 92, 54, 255],
  mountain: [136, 95, 59, 255],
  mountainDark: [91, 64, 47, 255],
  mountainLight: [172, 128, 86, 255],
  mountainSand: [164, 132, 82, 255],
  mountainSandLight: [206, 176, 116, 255],
  mountainSnow: [238, 251, 255, 255],
  mountainSnowShade: [147, 178, 194, 255],
  forest: [32, 102, 55, 255],
  forestLight: [43, 136, 67, 255],
  poi: [81, 64, 78, 255],
  poiRoof: [163, 65, 65, 255],
  port: [117, 79, 44, 255],
  debugRoad: [255, 186, 76, 255],
  debugRiver: [14, 96, 255, 255],
  debugPoi: [255, 46, 108, 255],
  debugMountainBlock: [255, 104, 54, 255],
  debugOverlayBounds: [214, 72, 255, 255],
  debugShippingLane: [116, 230, 255, 145],
  debugBoatRoute: [255, 239, 120, 255]
};

export function renderAllPreviews(world, options = {}) {
  const scale = options.scale ?? 6;
  return {
    semanticMap: renderSemanticMap(world, scale),
    distanceBands: renderDistanceBands(world, scale),
    elevation: renderElevation(world, scale),
    mountainMask: renderMountainMaskDebug(world, scale),
    mountainCollision: renderMountainCollisionDebug(world, scale),
    forestMask: renderForestMaskDebug(world, scale),
    poiFootprints: renderPoiFootprintsDebug(world, scale),
    passability: renderPassabilityDebug(world, scale),
    riverMask: renderRiverMaskDebug(world, scale),
    riverConnectivity: renderRiverConnectivityDebug(world, scale),
    riversRoads: renderRiversRoads(world, scale),
    shippingLanes: renderShippingLanesDebug(world, scale),
    renderedWorld: renderWorldPreview(world, scale)
  };
}

export function renderSemanticMap(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, COLORS.deepOcean);
  forEachCell(world, (x, y, i) => {
    let color = COLORS.deepOcean;
    if (world.layers.waterClass[i] === WATER.SHALLOW) color = COLORS.shallow;
    if (world.layers.landMask[i]) {
      if (isAshfallCell(world, i)) color = COLORS.ash;
      else if (world.layers.biome[i] === BIOME.BEACH) color = COLORS.beach;
      else if (world.layers.biome[i] === BIOME.GRASS) color = COLORS.grass;
      else if (world.layers.biome[i] === BIOME.SAND) color = COLORS.sand;
      else if (world.layers.biome[i] === BIOME.ICE) color = COLORS.ice;
    }
    if (world.layers.mountainMap[i]) color = mountainCellColor(world, x, y, i);
    fillCell(image, x, y, scale, color);
  });
  overlayMask(image, world, world.layers.riverMap, scale, COLORS.river);
  overlayRoadMask(image, world, scale, COLORS.road);
  renderBridgeCrossings(image, world, scale);
  for (const poi of world.poiList) drawDebugDot(image, poi.x, poi.y, scale, COLORS.debugPoi);
  return image;
}

export function renderDistanceBands(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, [0, 0, 0, 255]);
  forEachCell(world, (x, y, i) => {
    let color;
    if (!world.layers.landMask[i]) {
      color = world.layers.waterClass[i] === WATER.SHALLOW ? [60, 164, 199, 255] : [12, 52, 94, 255];
    } else if (world.layers.distanceToWater[i] <= 2) {
      color = [237, 212, 142, 255];
    } else if (world.layers.distanceToWater[i] <= 5) {
      color = [144, 194, 95, 255];
    } else {
      const v = clamp(80 + world.layers.distanceToWater[i] * 7, 90, 220);
      color = [54, v, 80, 255];
    }
    fillCell(image, x, y, scale, color);
  });
  return image;
}

export function renderElevation(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, [18, 28, 42, 255]);
  forEachCell(world, (x, y, i) => {
    if (!world.layers.landMask[i]) {
      fillCell(image, x, y, scale, [15, 46, 75, 255]);
      return;
    }
    const e = world.layers.elevation[i];
    const r = world.layers.ridge[i];
    const shade = Math.round(60 + e * 155);
    const color = [shade + Math.round(r * 35), shade, Math.round(70 + e * 100), 255];
    fillCell(image, x, y, scale, color);
  });
  for (const mountain of world.mountains) drawDebugDot(image, mountain.x, mountain.y, scale, mountain.kind === "snow_mountain" ? [230, 250, 255, 255] : [80, 46, 30, 255]);
  return image;
}

export function renderMountainMaskDebug(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, [9, 15, 24, 255]);
  forEachCell(world, (x, y, i) => {
    if (!world.layers.landMask[i]) {
      fillCell(image, x, y, scale, world.layers.waterClass[i] === WATER.SHALLOW ? [24, 82, 104, 255] : [8, 36, 61, 255]);
      return;
    }
    const score = world.layers.mountainCandidateScore[i];
    const heat = clamp(Math.round(score * 70), 0, 95);
    fillCell(image, x, y, scale, [44 + heat, 55 + Math.floor(heat * 0.45), 50, 255]);
    if (world.layers.biome[i] === BIOME.ICE) fillCell(image, x, y, scale, [70 + Math.floor(heat * 0.6), 96 + Math.floor(heat * 0.6), 106 + Math.floor(heat * 0.9), 255]);
  });
  const palette = [
    [94, 49, 32, 255],
    [128, 76, 43, 255],
    [103, 82, 67, 255],
    [80, 101, 119, 255],
    [142, 111, 73, 255],
    [92, 66, 116, 255]
  ];
  world.mountainRanges.forEach((range, rangeIndex) => {
    const color = range.kind === "snow_mountain" ? [231, 251, 255, 255] : palette[rangeIndex % palette.length];
    for (const cell of range.cells) {
      fillCell(image, cell.x, cell.y, scale, color);
      drawCellOutline(image, cell.x, cell.y, scale, range.kind === "snow_mountain" ? [55, 89, 103, 255] : [36, 26, 23, 255]);
    }
  });
  overlayMask(image, world, world.layers.roadMap, scale, [245, 184, 86, 255]);
  overlayMask(image, world, world.layers.riverMap, scale, [38, 144, 213, 255]);
  for (const poi of world.poiList) {
    const color = poi.role === "settlement" || poi.role === "port" ? [255, 72, 116, 255] : [238, 210, 96, 255];
    drawMarkerSquare(image, poi.x, poi.y, scale, color);
  }
  return image;
}

export function renderMountainCollisionDebug(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, [11, 16, 24, 255]);
  forEachCell(world, (x, y, i) => {
    if (!world.layers.landMask[i]) {
      fillCell(image, x, y, scale, world.layers.waterClass[i] === WATER.SHALLOW ? [26, 73, 84, 255] : [8, 34, 56, 255]);
      return;
    }
    let color = [52, 78, 55, 255];
    if (world.layers.biome[i] === BIOME.BEACH || world.layers.biome[i] === BIOME.SAND) color = [91, 77, 52, 255];
    else if (world.layers.biome[i] === BIOME.ICE) color = [71, 92, 103, 255];
    if (world.layers.lakeMap[i] || world.layers.riverMap[i]) color = [23, 91, 128, 255];
    fillCell(image, x, y, scale, color);
    if (world.layers.mountainMap[i]) {
      fillCell(image, x, y, scale, mountainCellColor(world, x, y, i));
      drawCellOutline(image, x, y, scale, COLORS.debugMountainBlock);
      const walkable = world.layers.walkability[i] === 1;
      const blockedByPolicy = world.layers.overlayCollisionPolicy[i] === "hardBlock";
      if (!blockedByPolicy || walkable) {
        drawLine(image, x * scale, y * scale, (x + 1) * scale - 1, (y + 1) * scale - 1, [255, 255, 255, 255]);
        drawLine(image, (x + 1) * scale - 1, y * scale, x * scale, (y + 1) * scale - 1, [255, 255, 255, 255]);
      }
    } else if (!world.layers.walkability[i]) {
      fillRect(image, x * scale + 1, y * scale + 1, Math.max(1, scale - 2), Math.max(1, scale - 2), [58, 36, 48, 160]);
    }
  });

  for (const overlay of mountainObjectOverlays(world)) {
    const displaySize = Math.max(1, scale * overlay.scale);
    const centerX = (overlay.x + (overlay.offsetX ?? 0)) * scale + scale / 2;
    const centerY = (overlay.y + (overlay.offsetY ?? 0)) * scale + scale / 2;
    const left = centerX - displaySize / 2;
    const top = centerY - displaySize / 2;
    const color = overlay.collisionPolicy === "visualOnly" ? COLORS.debugOverlayBounds : [255, 42, 92, 255];
    drawRectOutline(image, left, top, displaySize, displaySize, color);
    drawLine(image, centerX - 2, centerY, centerX + 2, centerY, color);
    drawLine(image, centerX, centerY - 2, centerX, centerY + 2, color);
  }
  return image;
}

export function renderForestMaskDebug(world, scale = 6) {
  const image = renderSemanticMap(world, scale);
  forEachCell(world, (x, y, i) => {
    if (!world.layers.forestMap[i]) return;
    fillCell(image, x, y, scale, [20, 156, 78, 180]);
    drawCellOutline(image, x, y, scale, [6, 76, 36, 255]);
  });
  return image;
}

export function renderPoiFootprintsDebug(world, scale = 6) {
  const image = renderSemanticMap(world, scale);
  for (const poi of world.poiList) {
    const color = poi.role === "settlement" || poi.role === "port" ? [255, 72, 116, 190] : [238, 210, 96, 185];
    for (const cell of poiFootprintCells(poi)) {
      fillCell(image, cell.x, cell.y, scale, color);
      drawCellOutline(image, cell.x, cell.y, scale, [86, 28, 64, 255]);
    }
    drawDebugDot(image, poi.x, poi.y, scale, [255, 255, 255, 255]);
  }
  return image;
}

export function renderPassabilityDebug(world, scale = 6) {
  const image = renderSemanticMap(world, scale);
  forEachCell(world, (x, y, i) => {
    fillCell(image, x, y, scale, world.layers.walkability[i] ? [82, 236, 118, 92] : [255, 49, 86, 110]);
  });
  for (const poi of world.poiList) {
    for (const cell of poiFootprintCells(poi)) drawCellOutline(image, cell.x, cell.y, scale, [255, 222, 118, 255]);
  }
  return image;
}

export function renderRiverMaskDebug(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, [9, 15, 24, 255]);
  forEachCell(world, (x, y, i) => {
    if (!world.layers.landMask[i]) {
      fillCell(image, x, y, scale, world.layers.waterClass[i] === WATER.SHALLOW ? [24, 82, 104, 255] : [8, 36, 61, 255]);
      return;
    }
    const base = world.layers.biome[i] === BIOME.ICE ? [68, 92, 102, 255] : world.layers.biome[i] === BIOME.SAND ? [95, 83, 55, 255] : [47, 72, 50, 255];
    fillCell(image, x, y, scale, base);
  });
  forEachRiverTile(world, (x, y) => {
    const kind = riverTileKindForMask(riverConnectivityMaskAt(world, x, y));
    const color =
      kind === "straight"
        ? [50, 171, 220, 255]
        : kind === "corner"
          ? [77, 211, 222, 255]
          : kind === "junction"
            ? [154, 226, 248, 255]
            : kind === "cross"
              ? [245, 245, 255, 255]
              : [41, 113, 205, 255];
    fillCell(image, x, y, scale, color);
    drawCellOutline(image, x, y, scale, [7, 42, 76, 255]);
  });
  for (const bridge of world.bridgeCandidates ?? []) drawMarkerSquare(image, bridge.x, bridge.y, scale, [240, 183, 91, 255]);
  return image;
}

export function renderRiverConnectivityDebug(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, [12, 20, 30, 255]);
  forEachCell(world, (x, y, i) => {
    if (world.layers.landMask[i]) fillCell(image, x, y, scale, [42, 56, 46, 255]);
    if (world.layers.waterClass[i] !== WATER.NONE && !world.layers.landMask[i]) fillCell(image, x, y, scale, [14, 54, 90, 255]);
  });
  forEachRiverTile(world, (x, y) => {
    const mask = riverConnectivityMaskAt(world, x, y);
    const center = cellCenter({ x, y }, scale);
    fillCell(image, x, y, scale, [22, 83, 138, 255]);
    if (mask & RIVER_NORTH) drawLine(image, center.x, center.y, center.x, y * scale, [141, 231, 255, 255]);
    if (mask & RIVER_EAST) drawLine(image, center.x, center.y, (x + 1) * scale - 1, center.y, [141, 231, 255, 255]);
    if (mask & RIVER_SOUTH) drawLine(image, center.x, center.y, center.x, (y + 1) * scale - 1, [141, 231, 255, 255]);
    if (mask & RIVER_WEST) drawLine(image, center.x, center.y, x * scale, center.y, [141, 231, 255, 255]);
    drawMarkerSquare(image, x, y, scale, riverTileKindColor(riverTileKindForMask(mask)));
  });
  for (const bridge of world.bridgeCandidates ?? []) drawMarkerSquare(image, bridge.x, bridge.y, scale, [251, 188, 83, 255]);
  return image;
}

export function renderRiversRoads(world, scale = 6) {
  const image = renderSemanticMap(world, scale);
  overlayMask(image, world, world.layers.riverMap, scale, COLORS.river);
  for (const edge of world.roadGraph.edges) {
    if (edge.connected) {
      for (const segment of splitPathAroundRiver(world, edge.path)) drawStyledRoadPath(image, segment, scale);
    }
  }
  renderBridgeCrossings(image, world, scale);
  for (const poi of world.poiList) {
    const color = poi.type === "port" ? [255, 230, 96, 255] : COLORS.debugPoi;
    drawMarkerSquare(image, poi.x, poi.y, scale, color);
  }
  return image;
}

export function renderShippingLanesDebug(world, scale = 6) {
  const image = renderSemanticMap(world, scale);
  overlayMask(image, world, world.layers.reservedBoatRouteMap, scale, COLORS.debugShippingLane);
  for (const route of world.boatRoutes ?? []) {
    drawPath(image, route.path ?? [], scale, COLORS.debugBoatRoute, Math.max(1, Math.round(scale * 0.35)));
    drawMarkerSquare(image, route.sourceWaterTile.x, route.sourceWaterTile.y, scale, [98, 255, 174, 255]);
    drawMarkerSquare(image, route.destinationWaterTile.x, route.destinationWaterTile.y, scale, [255, 162, 98, 255]);
  }
  for (const harbor of world.harbors ?? []) drawMarkerSquare(image, harbor.x, harbor.y, scale, [255, 255, 255, 255]);
  return image;
}

export function renderWorldPreview(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, COLORS.deepOcean);
  renderOcean(image, world, scale);
  renderLand(image, world, scale);
  renderCoastOutline(image, world, scale);
  renderRoads(image, world, scale);
  renderForests(image, world, scale);
  renderMountains(image, world, scale);
  renderPois(image, world, scale);
  return image;
}

export function writePng(filePath, image, fs) {
  fs.writeFileSync(filePath, PNG.sync.write(image));
}

function renderOcean(image, world, scale) {
  forEachCell(world, (x, y, i) => {
    const n = noise(world.seed, x, y);
    let color = n > 0.54 ? COLORS.deepOceanAlt : COLORS.deepOcean;
    if (world.layers.waterClass[i] === WATER.SHALLOW) color = n > 0.5 ? COLORS.shallowAlt : COLORS.shallow;
    if (world.layers.lakeMap[i]) color = COLORS.lake;
    if (world.layers.riverMap[i]) color = n > 0.52 ? COLORS.shallow : COLORS.river;
    fillCell(image, x, y, scale, color);
    if (!world.layers.landMask[i] && (x + y * 3 + Math.floor(n * 11)) % 17 === 0) {
      const px = x * scale + Math.floor(scale * 0.25);
      const py = y * scale + Math.floor(scale * 0.25);
      drawLine(image, px, py, px + Math.max(1, Math.floor(scale / 2)), py - 1, [97, 184, 210, 95]);
    }
  });
}

function renderLand(image, world, scale) {
  forEachCell(world, (x, y, i) => {
    if (!world.layers.landMask[i]) return;
    const n = noise(`${world.seed}:land`, x, y);
    if (world.layers.lakeMap[i] || world.layers.riverMap[i]) {
      fillCell(image, x, y, scale, world.layers.lakeMap[i] ? COLORS.lake : n > 0.52 ? COLORS.shallow : COLORS.river);
      return;
    }
    if (world.layers.roadMap[i]) {
      fillCell(image, x, y, scale, n > 0.52 ? [196, 151, 83, 255] : COLORS.road);
      return;
    }
    let color = COLORS.grass;
    if (isAshfallCell(world, i)) color = n > 0.5 ? COLORS.ashAlt : COLORS.ash;
    else if (world.layers.biome[i] === BIOME.BEACH) color = n > 0.5 ? COLORS.beachLight : COLORS.beach;
    else if (world.layers.biome[i] === BIOME.GRASS) color = n > 0.5 ? COLORS.grassAlt : COLORS.grass;
    else if (world.layers.biome[i] === BIOME.SAND) color = n > 0.5 ? COLORS.sandAlt : COLORS.sand;
    else if (world.layers.biome[i] === BIOME.ICE) color = n > 0.5 ? COLORS.iceAlt : COLORS.ice;
    fillCell(image, x, y, scale, color);
    if (world.layers.biome[i] !== BIOME.BEACH && (x * 7 + y * 13 + Math.floor(n * 17)) % 31 === 0) {
      const dot = isAshfallCell(world, i) ? [35, 31, 28, 90] : world.layers.biome[i] === BIOME.ICE ? [235, 255, 255, 95] : [66, 116, 50, 75];
      fillRect(image, x * scale + Math.floor(scale / 2), y * scale + Math.floor(scale / 2), 1, 1, dot);
    }
  });
}

function renderCoastOutline(image, world, scale) {
  forEachCell(world, (x, y, i) => {
    if (!world.layers.landMask[i]) return;
    if (!touchesWater(world, x, y)) return;
    const px = x * scale;
    const py = y * scale;
    if (isWaterForOutline(world, x, y - 1)) drawLine(image, px, py, px + scale - 1, py, [251, 237, 180, 210]);
    if (isWaterForOutline(world, x + 1, y)) drawLine(image, px + scale - 1, py, px + scale - 1, py + scale - 1, [164, 126, 80, 190]);
    if (isWaterForOutline(world, x, y + 1)) drawLine(image, px, py + scale - 1, px + scale - 1, py + scale - 1, [164, 126, 80, 190]);
    if (isWaterForOutline(world, x - 1, y)) drawLine(image, px, py, px, py + scale - 1, [251, 237, 180, 210]);
  });
}

function renderForests(image, world, scale) {
  forEachCell(world, (x, y, i) => {
    if (!world.layers.forestMap[i]) return;
    const cx = x * scale + Math.floor(scale / 2);
    const cy = y * scale + Math.floor(scale / 2);
    drawCircle(image, cx, cy + 1, Math.max(1, Math.floor(scale * 0.42)), [22, 76, 42, 210]);
    drawCircle(image, cx, cy, Math.max(1, Math.floor(scale * 0.34)), noise(`${world.seed}:forest`, x, y) > 0.5 ? COLORS.forestLight : COLORS.forest);
  });
}

function renderMountains(image, world, scale) {
  let visuals = mountainObjectOverlays(world).map((overlay) => ({
    x: overlay.x,
    y: overlay.y,
    kind: mountainKindForOverlay(world, overlay),
    scaleBoost: 1
  }));
  if (!visuals.length) visuals = fallbackMountainVisuals(world);
  visuals.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const mountain of visuals) drawMountainSymbol(image, mountain.x, mountain.y, scale, mountain.kind, mountain.scaleBoost);
}

function mountainObjectOverlays(world) {
  return (world.objectOverlays ?? []).filter((overlay) => String(overlay.id ?? "").startsWith("mountain-"));
}

function mountainKindForOverlay(world, overlay) {
  const x = Math.round(overlay.x);
  const y = Math.round(overlay.y);
  const i = y * world.width + x;
  if ((x >= 0 && y >= 0 && x < world.width && y < world.height && world.layers.biome[i] === BIOME.ICE) || String(overlay.objectId ?? "").includes("snow")) return "snow_mountain";
  return "mountain";
}

function fallbackMountainVisuals(world) {
  const visuals = [];
  for (const range of world.mountainRanges) {
    for (const cell of [...range.cells].sort((a, b) => a.y - b.y || a.x - b.x)) visuals.push({ x: cell.x, y: cell.y, kind: range.kind, scaleBoost: 1 });
  }
  return visuals;
}

function mountainCellColor(world, x, y, i = y * world.width + x) {
  const n = noise(`${world.seed}:mountain-cell`, x, y);
  if (isAshfallCell(world, i)) return n > 0.54 ? COLORS.ashMountainLight : COLORS.ashMountain;
  if (world.layers.biome[i] === BIOME.ICE) return n > 0.56 ? COLORS.mountainSnow : COLORS.mountainSnowShade;
  if (world.layers.biome[i] === BIOME.BEACH || world.layers.biome[i] === BIOME.SAND) return n > 0.54 ? COLORS.mountainSandLight : COLORS.mountainSand;
  return n > 0.56 ? COLORS.mountainLight : COLORS.mountain;
}

function isAshfallCell(world, i) {
  const islandNumber = world.layers.islandId[i];
  const island = world.islands?.find((candidate) => candidate.order + 1 === islandNumber);
  return island?.theme === "ashfall";
}

function renderRoads(image, world, scale) {
  renderBridgeCrossings(image, world, scale);
}

function drawStyledRoadPath(image, path, scale) {
  if (path.length < 2) return;
  drawPath(image, path, scale, [72, 83, 47, 92], Math.max(3, Math.round(scale * 0.78)));
  drawPath(image, path, scale, COLORS.roadDark, Math.max(2, Math.round(scale * 0.55)));
  drawPath(image, path, scale, COLORS.road, Math.max(1, Math.round(scale * 0.34)));
}

function splitPathAroundRiver(world, path) {
  const segments = [];
  let current = [];
  for (const cell of path) {
    const i = cell.y * world.width + cell.x;
    if (world.layers.riverMap[i]) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
      continue;
    }
    current.push(cell);
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

function renderBridgeCrossings(image, world, scale) {
  for (const bridge of world.bridgeCandidates ?? []) {
    const px = bridge.x * scale;
    const py = bridge.y * scale;
    const wood = [174, 130, 78, 255];
    const shadow = [64, 43, 31, 180];
    if (bridge.orientation === "vertical") {
      fillRect(image, px + Math.floor(scale * 0.22), py - 1, Math.max(2, Math.round(scale * 0.56)), scale + 2, shadow);
      fillRect(image, px + Math.floor(scale * 0.3), py - 1, Math.max(1, Math.round(scale * 0.4)), scale + 2, wood);
    } else {
      fillRect(image, px - 1, py + Math.floor(scale * 0.22), scale + 2, Math.max(2, Math.round(scale * 0.56)), shadow);
      fillRect(image, px - 1, py + Math.floor(scale * 0.3), scale + 2, Math.max(1, Math.round(scale * 0.4)), wood);
    }
  }
}

function drawMountainSymbol(image, x, y, scale, kind, scaleBoost = 1) {
  const cx = Math.round(x * scale + scale / 2);
  const cy = Math.round(y * scale + scale / 2);
  const h = Math.max(5, Math.floor(scale * 1.45 * scaleBoost));
  const w = Math.max(5, Math.floor(scale * 1.18 * scaleBoost));
  drawTriangle(image, cx, cy - Math.floor(h * 0.65), cx - w, cy + Math.floor(h * 0.55), cx + w, cy + Math.floor(h * 0.55), COLORS.mountainDark);
  drawTriangle(image, cx, cy - Math.floor(h * 0.72), cx - Math.floor(w * 0.72), cy + Math.floor(h * 0.45), cx + Math.floor(w * 0.72), cy + Math.floor(h * 0.45), COLORS.mountain);
  if (kind === "snow_mountain") {
    drawTriangle(image, cx, cy - Math.floor(h * 0.72), cx - Math.floor(w * 0.28), cy - Math.floor(h * 0.12), cx + Math.floor(w * 0.28), cy - Math.floor(h * 0.12), COLORS.mountainSnow);
  }
}

function renderPois(image, world, scale) {
  const sorted = [...world.poiList].sort((a, b) => poiFootprintBounds(a).minY - poiFootprintBounds(b).minY || poiFootprintBounds(a).minX - poiFootprintBounds(b).minX);
  for (const poi of sorted) {
    const bounds = poiFootprintBounds(poi);
    const footprint = poiFootprintSize(poi);
    const drawScale = scale * footprint;
    const drawX = bounds.minX / footprint;
    const drawY = bounds.minY / footprint;
    if (poi.type === "port") drawPort(image, drawX, drawY, drawScale);
    else if (poi.type === "cave") drawCave(image, drawX, drawY, drawScale);
    else if (poi.type === "ice_shrine") drawShrine(image, drawX, drawY, drawScale, [172, 224, 238, 255]);
    else if (poi.type === "desert_ruin") drawShrine(image, drawX, drawY, drawScale, [187, 143, 77, 255]);
    else if (poi.type === "tower") drawTower(image, drawX, drawY, drawScale);
    else drawTown(image, drawX, drawY, drawScale);
  }
}

function drawTown(image, x, y, scale) {
  const px = x * scale;
  const py = y * scale;
  fillRect(image, px + 1, py + 2, scale - 1, scale - 1, COLORS.poi);
  drawTriangle(image, px, py + 3, px + Math.floor(scale / 2), py - 2, px + scale, py + 3, COLORS.poiRoof);
  fillRect(image, px + Math.floor(scale / 2), py + Math.floor(scale / 2), 2, Math.max(2, scale / 2), [231, 205, 135, 255]);
}

function drawPort(image, x, y, scale) {
  drawTown(image, x, y, scale);
  const px = x * scale;
  const py = y * scale;
  drawLine(image, px + Math.floor(scale / 2), py + scale, px + Math.floor(scale / 2), py + scale + Math.floor(scale * 1.5), COLORS.port);
  drawLine(image, px + Math.floor(scale / 2), py + scale + 1, px + scale + Math.floor(scale / 2), py + scale + 1, COLORS.port);
}

function drawCave(image, x, y, scale) {
  const px = x * scale;
  const py = y * scale;
  drawTriangle(image, px + Math.floor(scale / 2), py - 1, px, py + scale, px + scale, py + scale, [98, 72, 52, 255]);
  drawCircle(image, px + Math.floor(scale / 2), py + Math.floor(scale * 0.62), Math.max(2, Math.floor(scale / 3)), [31, 27, 26, 255]);
}

function drawShrine(image, x, y, scale, color) {
  const px = x * scale;
  const py = y * scale;
  fillRect(image, px + 1, py + 1, scale - 1, scale - 1, [91, 82, 92, 255]);
  fillRect(image, px + 2, py + 2, Math.max(2, scale - 3), Math.max(2, scale - 3), color);
}

function drawTower(image, x, y, scale) {
  const px = x * scale;
  const py = y * scale;
  fillRect(image, px + Math.floor(scale / 3), py - Math.floor(scale / 2), Math.max(2, Math.floor(scale / 2)), scale + Math.floor(scale / 2), [98, 86, 99, 255]);
  drawTriangle(image, px + Math.floor(scale / 2), py - scale, px + 1, py, px + scale, py, [143, 67, 89, 255]);
}

function poiFootprintCells(poi) {
  const bounds = poiFootprintBounds(poi);
  const cells = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) cells.push({ x, y });
  }
  return cells;
}

function poiFootprintBounds(poi) {
  const size = poiFootprintSize(poi);
  const offset = Math.floor((size - 1) / 2);
  const minX = poi.x - offset;
  const minY = poi.y - offset;
  return { minX, minY, maxX: minX + size - 1, maxY: minY + size - 1 };
}

function poiFootprintSize(poi) {
  return poi.role === "settlement" || poi.role === "final" ? 3 : 2;
}

function drawPath(image, path, scale, color, width) {
  for (let i = 1; i < path.length; i += 1) {
    const a = cellCenter(path[i - 1], scale);
    const b = cellCenter(path[i], scale);
    drawThickLine(image, a.x, a.y, b.x, b.y, color, width);
  }
}

function overlayMask(image, world, mask, scale, color) {
  forEachCell(world, (x, y, i) => {
    if (mask[i]) fillCell(image, x, y, scale, color);
  });
}

function overlayRoadMask(image, world, scale, color) {
  forEachCell(world, (x, y, i) => {
    if (!world.layers.roadMap[i]) return;
    if (world.layers.riverMap[i] && !world.layers.riverCrossingMap?.[i]) return;
    fillCell(image, x, y, scale, color);
  });
}

function forEachRiverTile(world, callback) {
  forEachCell(world, (x, y, i) => {
    if (world.layers.riverMap[i]) callback(x, y, i);
  });
}

function riverConnectivityMaskAt(world, x, y) {
  let mask = 0;
  if (isRiverTile(world, x, y - 1)) mask |= RIVER_NORTH;
  if (isRiverTile(world, x + 1, y)) mask |= RIVER_EAST;
  if (isRiverTile(world, x, y + 1)) mask |= RIVER_SOUTH;
  if (isRiverTile(world, x - 1, y)) mask |= RIVER_WEST;
  return mask;
}

function isRiverTile(world, x, y) {
  return x >= 0 && y >= 0 && x < world.width && y < world.height && world.layers.riverMap[y * world.width + x] === 1;
}

function riverTileKindForMask(mask) {
  const count = bitCount(mask);
  if (count === 0) return "isolated";
  if (count === 1) return "end";
  if (count === 2) return mask === (RIVER_NORTH | RIVER_SOUTH) || mask === (RIVER_EAST | RIVER_WEST) ? "straight" : "corner";
  if (count === 3) return "junction";
  return "cross";
}

function riverTileKindColor(kind) {
  if (kind === "straight") return [53, 193, 224, 255];
  if (kind === "corner") return [89, 228, 218, 255];
  if (kind === "junction") return [172, 244, 255, 255];
  if (kind === "cross") return [255, 255, 255, 255];
  return [62, 135, 228, 255];
}

function bitCount(value) {
  let count = 0;
  let working = value;
  while (working > 0) {
    count += working & 1;
    working >>= 1;
  }
  return count;
}

function drawCellOutline(image, x, y, scale, color) {
  const px = x * scale;
  const py = y * scale;
  drawLine(image, px, py, px + scale - 1, py, color);
  drawLine(image, px, py + scale - 1, px + scale - 1, py + scale - 1, color);
  drawLine(image, px, py, px, py + scale - 1, color);
  drawLine(image, px + scale - 1, py, px + scale - 1, py + scale - 1, color);
}

function drawRectOutline(image, x, y, width, height, color) {
  const left = Math.round(x);
  const top = Math.round(y);
  const right = Math.round(x + width);
  const bottom = Math.round(y + height);
  drawLine(image, left, top, right, top, color);
  drawLine(image, right, top, right, bottom, color);
  drawLine(image, right, bottom, left, bottom, color);
  drawLine(image, left, bottom, left, top, color);
}

function drawDebugDot(image, x, y, scale, color) {
  const c = cellCenter({ x, y }, scale);
  drawCircle(image, c.x, c.y, Math.max(2, Math.floor(scale / 2)), color);
}

function drawMarkerSquare(image, x, y, scale, color) {
  fillRect(image, x * scale + 1, y * scale + 1, Math.max(2, scale - 2), Math.max(2, scale - 2), color);
}

function touchesWater(world, x, y) {
  return isWaterForOutline(world, x - 1, y) || isWaterForOutline(world, x + 1, y) || isWaterForOutline(world, x, y - 1) || isWaterForOutline(world, x, y + 1);
}

function isWaterForOutline(world, x, y) {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return true;
  const i = y * world.width + x;
  return !world.layers.landMask[i] || world.layers.lakeMap[i] || world.layers.riverMap[i];
}

function isLand(world, x, y) {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return false;
  return Boolean(world.layers.landMask[y * world.width + x]);
}

function cellCenter(cell, scale) {
  return {
    x: cell.x * scale + Math.floor(scale / 2),
    y: cell.y * scale + Math.floor(scale / 2)
  };
}

function forEachCell(world, fn) {
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) fn(x, y, y * world.width + x);
  }
}

function makeImage(width, height, fill = [0, 0, 0, 255]) {
  const image = new PNG({ width, height });
  fillRect(image, 0, 0, width, height, fill);
  return image;
}

function fillCell(image, x, y, scale, color) {
  fillRect(image, x * scale, y * scale, scale, scale, color);
}

function fillRect(image, x, y, width, height, color) {
  for (let yy = Math.floor(y); yy < Math.floor(y + height); yy += 1) {
    for (let xx = Math.floor(x); xx < Math.floor(x + width); xx += 1) setPixel(image, xx, yy, color);
  }
}

function drawLine(image, x0, y0, x1, y1, color) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPixel(image, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function drawThickLine(image, x0, y0, x1, y1, color, width) {
  const radius = Math.max(0, Math.floor(width / 2));
  for (let oy = -radius; oy <= radius; oy += 1) {
    for (let ox = -radius; ox <= radius; ox += 1) drawLine(image, x0 + ox, y0 + oy, x1 + ox, y1 + oy, color);
  }
}

function drawCircle(image, cx, cy, radius, color) {
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= radius * radius) setPixel(image, cx + x, cy + y, color);
    }
  }
}

function drawTriangle(image, x1, y1, x2, y2, x3, y3, color) {
  const minX = Math.floor(Math.min(x1, x2, x3));
  const maxX = Math.ceil(Math.max(x1, x2, x3));
  const minY = Math.floor(Math.min(y1, y2, y3));
  const maxY = Math.ceil(Math.max(y1, y2, y3));
  const area = edge(x1, y1, x2, y2, x3, y3);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const w0 = edge(x2, y2, x3, y3, x, y);
      const w1 = edge(x3, y3, x1, y1, x, y);
      const w2 = edge(x1, y1, x2, y2, x, y);
      if ((area >= 0 && w0 >= 0 && w1 >= 0 && w2 >= 0) || (area < 0 && w0 <= 0 && w1 <= 0 && w2 <= 0)) {
        setPixel(image, x, y, color);
      }
    }
  }
}

function edge(x1, y1, x2, y2, x3, y3) {
  return (x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1);
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (Math.floor(y) * image.width + Math.floor(x)) * 4;
  image.data[offset] = color[0];
  image.data[offset + 1] = color[1];
  image.data[offset + 2] = color[2];
  image.data[offset + 3] = color[3];
}

function noise(seed, x, y) {
  let h = 2166136261;
  const value = `${seed}:${x}:${y}`;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
