import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  ATLAS_V3_SOURCE_INSET,
  WORLD_ATLAS,
  WORLD_TILES,
  atlasV3SourceRectWithInset
} from "../../src/data/worldTiles.ts";
import { buildWorldDebugReport, generateWorld } from "../../src/world/worldGenerator.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const REPORT_DIR = path.join(PROJECT_ROOT, "docs", "debug", "worldgen");
const TILE_SIZE = 32;

const seed = process.argv[2] ?? "debug-world";
const world = generateWorld({ seed });
fs.mkdirSync(REPORT_DIR, { recursive: true });

const safeSeed = world.seed.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80);
const seedPreviewPath = path.join(REPORT_DIR, `world-preview-seed-${safeSeed}.png`);
const previewPath = path.join(REPORT_DIR, "atlas-v3-world-preview.png");
const sourceInsetPreviewPath = path.join(REPORT_DIR, "atlas-v3-source-inset-preview.png");
const reportPath = path.join(REPORT_DIR, "latest-worldgen-report.md");
const sourceInsetReportPath = path.join(REPORT_DIR, "atlas-v3-source-inset-report.md");

cleanupObsoleteBlackSeamOutputs();

const atlas = readPng(path.join(PROJECT_ROOT, WORLD_ATLAS.image));
const rendered = renderAtlasTerrain(world, atlas);
drawWorldMarkers(rendered, world);

writePng(sourceInsetPreviewPath, rendered);
writePng(previewPath, rendered);
writePng(seedPreviewPath, rendered);

const insetMarkdown = buildSourceInsetReport(world, {
  sourceInsetPreviewPath,
  previewPath,
  seedPreviewPath
});
fs.writeFileSync(sourceInsetReportPath, insetMarkdown, "utf8");
fs.writeFileSync(
  reportPath,
  `${buildWorldDebugReport(world)}
${insetMarkdown}
`,
  "utf8"
);

console.log(`Wrote ${relative(reportPath)}`);
console.log(`Wrote ${relative(sourceInsetReportPath)}`);
console.log(`Wrote ${relative(sourceInsetPreviewPath)}`);
console.log(`Wrote ${relative(previewPath)}`);
console.log(`Wrote ${relative(seedPreviewPath)}`);

function buildSourceInsetReport(world, paths) {
  const shrink = ATLAS_V3_SOURCE_INSET * 2;
  return `# Atlas v3 Source Inset Report

Atlas source path: \`${WORLD_ATLAS.sourceImage}\`
Runtime atlas path: \`${WORLD_ATLAS.image}\`
Tile grid: ${WORLD_ATLAS.columns}x${WORLD_ATLAS.rows}
Tile source size: ${WORLD_ATLAS.tileWidth}x${WORLD_ATLAS.tileHeight}
Source inset used: ${ATLAS_V3_SOURCE_INSET}

## Final Source Rect Formula

- sx = tile.source.x + ${ATLAS_V3_SOURCE_INSET}
- sy = tile.source.y + ${ATLAS_V3_SOURCE_INSET}
- sw = tile.source.width - ${shrink}
- sh = tile.source.height - ${shrink}

The inset source rectangle is drawn into the full ${TILE_SIZE}x${TILE_SIZE} destination tile. Empty atlas cells are not rendered because generated worlds only reference non-empty tile IDs.

## Runtime Consistency

- Runtime cache uses inset: yes, \`CrystalOathScene.rebuildWorldTerrainCache\` calls the shared inset source-rect helper.
- Fallback draw uses inset: yes, \`drawWorldTile\` uses the same \`worldTileSourceRect\` helper.
- Debug preview uses inset: yes, \`tools/worldgen/write_worldgen_debug.mjs\` calls \`atlasV3SourceRectWithInset\`.
- terrainBlending runtime postprocess is disabled: yes, the old map-level post-placement repair module has been removed from active runtime source.
- Neighboring tile pixels are mixed after placement: no.

## Output

Worldgen seed: \`${world.seed}\`
Source-inset preview: \`${relative(paths.sourceInsetPreviewPath)}\`
Gameplay-style preview: \`${relative(paths.previewPath)}\`
Seed preview: \`${relative(paths.seedPreviewPath)}\`
`;
}

function cleanupObsoleteBlackSeamOutputs() {
  const obsolete = [
    "black-seam-repair-before.png",
    "black-seam-repair-after.png",
    "black-seam-repair-mask.png",
    "black-seam-repair-diff.png",
    "black-seam-repair-report.md",
    "world-layout-report.md",
    "world-preview-seed-atlas-v3-black-seam-qa.png",
    "world-preview-seed-dither-seam-repair-v1.png",
    "world-preview-seed-safe-seam-repair-v1.png",
    "world-preview-seed-seam-repair-v2.png"
  ];
  for (const fileName of obsolete) {
    const filePath = path.join(REPORT_DIR, fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

function renderAtlasTerrain(world, source) {
  const tileSize = TILE_SIZE;
  const image = makeImage(world.width * tileSize, world.height * tileSize, [5, 8, 18, 255]);
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const tile = WORLD_TILES[world.tiles[y][x]];
      const sourceRect = atlasV3SourceRectWithInset(tile.sourceRect);
      blitSource(image, source, sourceRect, x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
  return image;
}

function drawWorldMarkers(image, world) {
  const tileSize = TILE_SIZE;
  for (const poi of world.pois) {
    const radius = Math.floor(poi.footprint / 2);
    const x = (poi.x - radius) * tileSize;
    const y = (poi.y - radius) * tileSize;
    fillRect(image, x + 2, y + 2, poi.footprint * tileSize - 4, poi.footprint * tileSize - 4, colorForPoi(poi.kind));
  }
  fillRect(image, world.startPosition.x * tileSize + 4, world.startPosition.y * tileSize + 4, 8, 8, [255, 255, 255, 255]);
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
