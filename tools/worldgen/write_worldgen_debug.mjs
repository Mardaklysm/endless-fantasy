import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { WORLD_TILES, worldTileHasTag } from "../../src/data/worldTiles.ts";
import { buildWorldDebugReport, generateWorld } from "../../src/world/worldGenerator.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const REPORT_DIR = path.join(PROJECT_ROOT, "docs", "debug", "worldgen");
const TILE_SIZE = 8;

const seed = process.argv[2] ?? "debug-world";
const world = generateWorld({ seed });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const safeSeed = world.seed.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80);
const previewPath = path.join(REPORT_DIR, `world-preview-seed-${safeSeed}.png`);
const reportPath = path.join(REPORT_DIR, "latest-worldgen-report.md");

writePng(previewPath, renderPreview(world));
fs.writeFileSync(reportPath, `${buildWorldDebugReport(world)}\nPreview: \`${relative(previewPath)}\`\n`, "utf8");

console.log(`Wrote ${relative(reportPath)}`);
console.log(`Wrote ${relative(previewPath)}`);

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
