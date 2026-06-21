import { createRequire } from "node:module";
import { BIOME, WATER } from "./generator.mjs";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

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
  ice: [213, 239, 239, 255],
  iceAlt: [182, 222, 232, 255],
  river: [31, 139, 196, 255],
  lake: [38, 129, 177, 255],
  road: [179, 132, 65, 255],
  roadDark: [127, 92, 54, 255],
  mountain: [136, 95, 59, 255],
  mountainDark: [91, 64, 47, 255],
  mountainSnow: [238, 251, 255, 255],
  forest: [32, 102, 55, 255],
  forestLight: [43, 136, 67, 255],
  poi: [81, 64, 78, 255],
  poiRoof: [163, 65, 65, 255],
  port: [117, 79, 44, 255],
  debugRoad: [255, 186, 76, 255],
  debugRiver: [14, 96, 255, 255],
  debugPoi: [255, 46, 108, 255]
};

export function renderAllPreviews(world, options = {}) {
  const scale = options.scale ?? 6;
  return {
    semanticMap: renderSemanticMap(world, scale),
    distanceBands: renderDistanceBands(world, scale),
    elevation: renderElevation(world, scale),
    riversRoads: renderRiversRoads(world, scale),
    renderedWorld: renderWorldPreview(world, scale)
  };
}

export function renderSemanticMap(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, COLORS.deepOcean);
  forEachCell(world, (x, y, i) => {
    let color = COLORS.deepOcean;
    if (world.layers.waterClass[i] === WATER.SHALLOW) color = COLORS.shallow;
    if (world.layers.landMask[i]) {
      if (world.layers.biome[i] === BIOME.BEACH) color = COLORS.beach;
      else if (world.layers.biome[i] === BIOME.GRASS) color = COLORS.grass;
      else if (world.layers.biome[i] === BIOME.SAND) color = COLORS.sand;
      else if (world.layers.biome[i] === BIOME.ICE) color = COLORS.ice;
    }
    fillCell(image, x, y, scale, color);
  });
  overlayMask(image, world, world.layers.riverMap, scale, COLORS.river);
  overlayMask(image, world, world.layers.roadMap, scale, COLORS.road);
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

export function renderRiversRoads(world, scale = 6) {
  const image = renderSemanticMap(world, scale);
  for (const river of world.rivers) drawPath(image, river.path, scale, COLORS.debugRiver, Math.max(1, Math.floor(scale / 2)));
  for (const edge of world.roadGraph.edges) {
    if (edge.connected) drawPath(image, edge.path, scale, COLORS.debugRoad, Math.max(1, Math.floor(scale / 2)));
  }
  for (const poi of world.poiList) {
    const color = poi.type === "port" ? [255, 230, 96, 255] : COLORS.debugPoi;
    drawMarkerSquare(image, poi.x, poi.y, scale, color);
  }
  return image;
}

export function renderWorldPreview(world, scale = 6) {
  const image = makeImage(world.width * scale, world.height * scale, COLORS.deepOcean);
  renderOcean(image, world, scale);
  renderLand(image, world, scale);
  renderCoastOutline(image, world, scale);
  renderLakes(image, world, scale);
  renderRivers(image, world, scale);
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
    let color = COLORS.grass;
    if (world.layers.biome[i] === BIOME.BEACH) color = n > 0.5 ? COLORS.beachLight : COLORS.beach;
    else if (world.layers.biome[i] === BIOME.GRASS) color = n > 0.5 ? COLORS.grassAlt : COLORS.grass;
    else if (world.layers.biome[i] === BIOME.SAND) color = n > 0.5 ? COLORS.sandAlt : COLORS.sand;
    else if (world.layers.biome[i] === BIOME.ICE) color = n > 0.5 ? COLORS.iceAlt : COLORS.ice;
    fillCell(image, x, y, scale, color);
    if (world.layers.biome[i] !== BIOME.BEACH && (x * 7 + y * 13 + Math.floor(n * 17)) % 31 === 0) {
      const dot = world.layers.biome[i] === BIOME.ICE ? [235, 255, 255, 95] : [66, 116, 50, 75];
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
    if (!isLand(world, x, y - 1)) drawLine(image, px, py, px + scale - 1, py, [251, 237, 180, 210]);
    if (!isLand(world, x + 1, y)) drawLine(image, px + scale - 1, py, px + scale - 1, py + scale - 1, [164, 126, 80, 190]);
    if (!isLand(world, x, y + 1)) drawLine(image, px, py + scale - 1, px + scale - 1, py + scale - 1, [164, 126, 80, 190]);
    if (!isLand(world, x - 1, y)) drawLine(image, px, py, px, py + scale - 1, [251, 237, 180, 210]);
  });
}

function renderLakes(image, world, scale) {
  overlayMask(image, world, world.layers.lakeMap, scale, COLORS.lake);
}

function renderRivers(image, world, scale) {
  for (const river of world.rivers) {
    drawPath(image, river.path, scale, [16, 94, 145, 255], Math.max(1, Math.floor(scale / 2) + 1));
    drawPath(image, river.path, scale, COLORS.river, Math.max(1, Math.floor(scale / 2)));
  }
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
  const sorted = [...world.mountains].sort((a, b) => a.y - b.y);
  for (const mountain of sorted) {
    const cx = mountain.x * scale + Math.floor(scale / 2);
    const cy = mountain.y * scale + Math.floor(scale / 2);
    const h = Math.max(5, Math.floor(scale * 1.45));
    const w = Math.max(5, Math.floor(scale * 1.25));
    drawTriangle(image, cx, cy - Math.floor(h * 0.65), cx - w, cy + Math.floor(h * 0.55), cx + w, cy + Math.floor(h * 0.55), COLORS.mountainDark);
    drawTriangle(image, cx, cy - Math.floor(h * 0.72), cx - Math.floor(w * 0.72), cy + Math.floor(h * 0.45), cx + Math.floor(w * 0.72), cy + Math.floor(h * 0.45), COLORS.mountain);
    if (mountain.kind === "snow_mountain") {
      drawTriangle(image, cx, cy - Math.floor(h * 0.72), cx - Math.floor(w * 0.28), cy - Math.floor(h * 0.12), cx + Math.floor(w * 0.28), cy - Math.floor(h * 0.12), COLORS.mountainSnow);
    }
  }
}

function renderRoads(image, world, scale) {
  for (const edge of world.roadGraph.edges) {
    if (!edge.connected) continue;
    drawPath(image, edge.path, scale, COLORS.roadDark, Math.max(1, Math.floor(scale / 3) + 1));
    drawPath(image, edge.path, scale, COLORS.road, Math.max(1, Math.floor(scale / 3)));
  }
}

function renderPois(image, world, scale) {
  const sorted = [...world.poiList].sort((a, b) => a.y - b.y);
  for (const poi of sorted) {
    if (poi.type === "port") drawPort(image, poi.x, poi.y, scale);
    else if (poi.type === "cave") drawCave(image, poi.x, poi.y, scale);
    else if (poi.type === "ice_shrine") drawShrine(image, poi.x, poi.y, scale, [172, 224, 238, 255]);
    else if (poi.type === "desert_ruin") drawShrine(image, poi.x, poi.y, scale, [187, 143, 77, 255]);
    else if (poi.type === "tower") drawTower(image, poi.x, poi.y, scale);
    else drawTown(image, poi.x, poi.y, scale);
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

function drawDebugDot(image, x, y, scale, color) {
  const c = cellCenter({ x, y }, scale);
  drawCircle(image, c.x, c.y, Math.max(2, Math.floor(scale / 2)), color);
}

function drawMarkerSquare(image, x, y, scale, color) {
  fillRect(image, x * scale + 1, y * scale + 1, Math.max(2, scale - 2), Math.max(2, scale - 2), color);
}

function touchesWater(world, x, y) {
  return !isLand(world, x - 1, y) || !isLand(world, x + 1, y) || !isLand(world, x, y - 1) || !isLand(world, x, y + 1);
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
