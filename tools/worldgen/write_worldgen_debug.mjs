import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { WORLD_ATLAS, WORLD_TILES, worldTileHasTag } from "../../src/data/worldTiles.ts";
import { classicLocationObjectFor } from "../../src/world/classicWorldTileCatalog.ts";
import { buildWorldDebugReport, generateWorld } from "../../src/world/worldGenerator.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const REPORT_DIR = path.join(PROJECT_ROOT, "docs", "debug", "worldgen");
const TILE_SIZE = 8;
const CLASSIC_PREVIEW_TILE_SIZE = 16;

const seed = process.argv[2] ?? "debug-world";
const world = generateWorld({ seed });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const safeSeed = world.seed.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80);
const previewPath = path.join(REPORT_DIR, `world-preview-seed-${safeSeed}.png`);
const classicPreviewPath = path.join(REPORT_DIR, "classic-active-world-preview.png");
const reportPath = path.join(REPORT_DIR, "latest-worldgen-report.md");

writePng(previewPath, renderPreview(world));
writePng(classicPreviewPath, renderClassicPreview(world, readPng(path.join(PROJECT_ROOT, WORLD_ATLAS.image))));
fs.writeFileSync(reportPath, `${buildWorldDebugReport(world)}\nPreview: \`${relative(previewPath)}\`\nClassic active preview: \`${relative(classicPreviewPath)}\`\n`, "utf8");

console.log(`Wrote ${relative(reportPath)}`);
console.log(`Wrote ${relative(previewPath)}`);
console.log(`Wrote ${relative(classicPreviewPath)}`);

function renderPreview(world) {
  const image = makeImage(world.width * TILE_SIZE, world.height * TILE_SIZE, [0, 0, 0, 255]);
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      fillRect(image, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, colorForTile(world.tiles[y][x]));
    }
  }
  for (const bridge of world.bridges) fillRect(image, bridge.x * TILE_SIZE + 2, bridge.y * TILE_SIZE + 2, 4, 4, [255, 230, 150, 255]);
  for (const poi of world.pois) fillRect(image, poi.x * TILE_SIZE - 2, poi.y * TILE_SIZE - 2, 12, 12, colorForPoi(poi.kind));
  fillRect(image, world.startPosition.x * TILE_SIZE + 1, world.startPosition.y * TILE_SIZE + 1, 6, 6, [255, 255, 255, 255]);
  return image;
}

function renderClassicPreview(world, source) {
  const tileSize = CLASSIC_PREVIEW_TILE_SIZE;
  const image = makeImage(world.width * tileSize, world.height * tileSize, [5, 8, 18, 255]);
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = WORLD_TILES[world.tiles[y][x]];
      blitSource(image, source, tile.sourceRect, x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
  for (const poi of world.pois) {
    const object = classicLocationObjectFor(poi.id);
    if (!object) continue;
    const footprint = poi.footprint * tileSize;
    const sx = poi.x * tileSize - Math.floor(footprint / 2);
    const sy = poi.y * tileSize - Math.floor(footprint / 2);
    const rect = object.sourceRect;
    const aspect = rect.width / rect.height;
    let width = footprint;
    let height = footprint;
    if (aspect > 1) height = Math.max(1, Math.floor(width / aspect));
    else width = Math.max(1, Math.floor(height * aspect));
    const dx = Math.floor(sx + footprint * object.anchor.x - width * object.anchor.x);
    const dy = Math.floor(sy + footprint * object.anchor.y - height * object.anchor.y);
    blitSource(image, source, rect, dx, dy, width, height);
  }
  return image;
}

function colorForTile(tileId) {
  if (worldTileHasTag(tileId, "bridge")) return [172, 132, 72, 255];
  if (worldTileHasTag(tileId, "road")) return [173, 139, 87, 255];
  if (worldTileHasTag(tileId, "water")) return [40, 112, 190, 255];
  const biome = WORLD_TILES[tileId].biome;
  if (biome === "forest") return [37, 105, 50, 255];
  if (biome === "desert") return [211, 166, 83, 255];
  if (biome === "snow") return [218, 232, 238, 255];
  if (biome === "darkland") return [74, 58, 82, 255];
  if (biome === "mountain") return [102, 101, 92, 255];
  return [83, 161, 70, 255];
}

function colorForPoi(kind) {
  if (kind === "town") return [255, 110, 70, 255];
  if (kind === "gate") return [255, 216, 90, 255];
  if (kind === "final") return [183, 114, 255, 255];
  return [130, 205, 255, 255];
}

function makeImage(width, height, fill) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return { width, height, data };
}

function fillRect(image, x, y, width, height, color) {
  for (let yy = Math.max(0, y); yy < Math.min(image.height, y + height); yy += 1) {
    for (let xx = Math.max(0, x); xx < Math.min(image.width, x + width); xx += 1) {
      const offset = (yy * image.width + xx) * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = color[3];
    }
  }
}

function blitSource(dest, source, rect, dx, dy, displayWidth, displayHeight) {
  for (let yy = 0; yy < displayHeight; yy += 1) {
    const targetY = dy + yy;
    if (targetY < 0 || targetY >= dest.height) continue;
    const srcY = rect.y + Math.min(rect.height - 1, Math.floor((yy / displayHeight) * rect.height));
    for (let xx = 0; xx < displayWidth; xx += 1) {
      const targetX = dx + xx;
      if (targetX < 0 || targetX >= dest.width) continue;
      const srcX = rect.x + Math.min(rect.width - 1, Math.floor((xx / displayWidth) * rect.width));
      const sourceOffset = (srcY * source.width + srcX) * 4;
      const destOffset = (targetY * dest.width + targetX) * 4;
      blendPixel(dest.data, destOffset, source.data[sourceOffset], source.data[sourceOffset + 1], source.data[sourceOffset + 2], source.data[sourceOffset + 3]);
    }
  }
}

function blendPixel(data, offset, r, g, b, a) {
  if (a === 255) {
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = 255;
    return;
  }
  if (a === 0) return;
  const alpha = a / 255;
  data[offset] = Math.round(r * alpha + data[offset] * (1 - alpha));
  data[offset + 1] = Math.round(g * alpha + data[offset + 1] * (1 - alpha));
  data[offset + 2] = Math.round(b * alpha + data[offset + 2] * (1 - alpha));
  data[offset + 3] = 255;
}

function writePng(filePath, image) {
  const rowBytes = image.width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const dest = y * (rowBytes + 1);
    raw[dest] = 0;
    image.data.copy(raw, dest + 1, y * rowBytes, y * rowBytes + rowBytes);
  }
  const chunks = [
    pngChunk("IHDR", ihdr(image.width, image.height)),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ];
  fs.writeFileSync(filePath, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), ...chunks]));
}

function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`Not a PNG: ${filePath}`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  const sourceBpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bitDepth !== 8 || !sourceBpp) throw new Error(`Unsupported PNG format in ${filePath}.`);
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const raw = unfilter(inflated, width, height, sourceBpp);
  const rgba = Buffer.alloc(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    rgba[pixel * 4] = raw[pixel * sourceBpp];
    rgba[pixel * 4 + 1] = raw[pixel * sourceBpp + 1];
    rgba[pixel * 4 + 2] = raw[pixel * sourceBpp + 2];
    rgba[pixel * 4 + 3] = sourceBpp === 4 ? raw[pixel * sourceBpp + 3] : 255;
  }
  return { width, height, data: rgba };
}

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * bpp);
  let input = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[input++];
    const rowStart = y * stride;
    const prevRowStart = rowStart - stride;
    for (let x = 0; x < stride; x += 1) {
      const rawValue = raw[input++];
      const left = x >= bpp ? out[rowStart + x - bpp] : 0;
      const up = y > 0 ? out[prevRowStart + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[prevRowStart + x - bpp] : 0;
      let value = rawValue;
      if (filter === 1) value = rawValue + left;
      else if (filter === 2) value = rawValue + up;
      else if (filter === 3) value = rawValue + Math.floor((left + up) / 2);
      else if (filter === 4) value = rawValue + paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter type: ${filter}`);
      out[rowStart + x] = value & 0xff;
    }
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function relative(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
}
