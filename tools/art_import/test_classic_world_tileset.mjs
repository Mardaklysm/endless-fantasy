import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const MANIFEST_PATH = path.join(PROJECT_ROOT, "src", "assets", "world", "tilesets", "classicWorldTileset.manifest.json");
const TILE_DIR = path.join(PROJECT_ROOT, "src", "assets", "world", "tilesets", "classic", "extracted", "tiles");
const OBJECT_DIR = path.join(PROJECT_ROOT, "src", "assets", "world", "tilesets", "classic", "extracted", "objects");
const LANDMARK_DIR = path.join(PROJECT_ROOT, "src", "assets", "world", "tilesets", "classic", "extracted", "landmarks");
const DEBUG_DIR = path.join(PROJECT_ROOT, "docs", "debug", "world-tileset-import");
const CHROMA = [0, 177, 0];

assert(fs.existsSync(MANIFEST_PATH), `Missing classic world tileset manifest: ${relative(MANIFEST_PATH)}`);

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
const cleanedPath = path.join(PROJECT_ROOT, manifest.sourceImage);
const copiedSourcePath = path.join(PROJECT_ROOT, manifest.copiedSource);

assert.equal(manifest.schemaVersion, 1, "Unexpected manifest schema version.");
assert.equal(manifest.id, "classic_world_tileset", "Unexpected tileset id.");
assert(fs.existsSync(cleanedPath), `Missing cleaned source PNG: ${manifest.sourceImage}`);
assert(fs.existsSync(copiedSourcePath), `Missing copied source PNG: ${manifest.copiedSource}`);
assert.equal(manifest.image.width, 832, "Source width changed unexpectedly.");
assert.equal(manifest.image.height, 1072, "Source height changed unexpectedly.");
assert.equal(manifest.image.backgroundMode, "chroma-key", "Expected exact chroma-key cleanup for this source.");
assert.equal(manifest.image.transparentColor, "#00B100", "Unexpected transparent color.");
assert.equal(manifest.baseGrid.chosenTileSize, 16, "Expected 16px base grid.");
assert.equal(manifest.baseGrid.columns, 52, "Expected 52 source columns at 16px.");
assert.equal(manifest.baseGrid.rows, 67, "Expected 67 source rows at 16px.");
assert.equal(Object.keys(manifest.groups).length, 12, "Expected 12 major source groups.");

const cleaned = readPng(cleanedPath);
assert.equal(cleaned.width, manifest.image.width, "Cleaned PNG width does not match manifest.");
assert.equal(cleaned.height, manifest.image.height, "Cleaned PNG height does not match manifest.");
assert(countTransparent(cleaned) > 0, "Cleaned PNG has no transparent pixels.");
assert.equal(countOpaqueChroma(cleaned), 0, "Cleaned PNG still has opaque #00B100 pixels.");

for (const [id, group] of Object.entries(manifest.groups)) {
  assertRectInImage(group.sourceRect, cleaned, `Group ${id}`);
}

const tileEntries = Object.entries(manifest.tiles);
const objectEntries = Object.entries(manifest.objects);
assert(tileEntries.length > 0, "Manifest has no extracted tiles.");
assert(objectEntries.length > 0, "Manifest has no extracted objects.");
assert.equal(tileEntries.length, manifest.analysis.uniqueExtractedTiles16, "Tile count does not match manifest analysis.");
assert.equal(manifest.analysis.ungroupedOpaquePixels, 0, "Some opaque pixels are not covered by a major group.");

const sourceCells = new Set();
for (const [id, tile] of tileEntries) {
  assert.equal(tile.source.width, 16, `Tile ${id} is not 16px wide.`);
  assert.equal(tile.source.height, 16, `Tile ${id} is not 16px high.`);
  assertRectInImage(tile.source, cleaned, `Tile ${id}`);
  assert(Array.isArray(tile.sourceOccurrences) && tile.sourceOccurrences.length >= 1, `Tile ${id} has no source occurrences.`);
  for (const occurrence of tile.sourceOccurrences) {
    assertRectInImage({ x: occurrence.x, y: occurrence.y, width: 16, height: 16 }, cleaned, `Tile occurrence ${id}`);
    sourceCells.add(`${occurrence.row}:${occurrence.col}`);
  }
  assert(["terrain_tile", "autotile_piece", "city_piece"].includes(tile.kind), `Tile ${id} has unexpected kind ${tile.kind}.`);
  assert(["walkable", "blocked", "water", "bridge", "poi_entry", "decorative_overlay"].includes(tile.walkability), `Tile ${id} has unexpected walkability ${tile.walkability}.`);
  const extractedPath = path.join(TILE_DIR, `${id}.png`);
  assert(fs.existsSync(extractedPath), `Missing extracted tile PNG: ${relative(extractedPath)}`);
  const extracted = readPng(extractedPath);
  assert.equal(extracted.width, tile.source.width, `Extracted tile ${id} width mismatch.`);
  assert.equal(extracted.height, tile.source.height, `Extracted tile ${id} height mismatch.`);
  assert.equal(countOpaqueChroma(extracted), 0, `Extracted tile ${id} contains opaque chroma-key pixels.`);
}
assert.equal(sourceCells.size, manifest.analysis.nonEmptySourceCells16, "Not all non-empty 16px source cells are represented by tile occurrences.");

for (const [id, object] of objectEntries) {
  assertRectInImage(object.source, cleaned, `Object ${id}`);
  assert(["object", "landmark", "poi", "decoration"].includes(object.kind), `Object ${id} has unexpected kind ${object.kind}.`);
  assert(["walkable", "blocked", "water", "bridge", "poi_entry", "decorative_overlay"].includes(object.walkability), `Object ${id} has unexpected walkability ${object.walkability}.`);
  const outDir = object.kind === "landmark" || object.kind === "poi" ? LANDMARK_DIR : OBJECT_DIR;
  const extractedPath = path.join(outDir, `${id}.png`);
  assert(fs.existsSync(extractedPath), `Missing extracted object PNG: ${relative(extractedPath)}`);
  const extracted = readPng(extractedPath);
  assert.equal(extracted.width, object.source.width, `Extracted object ${id} width mismatch.`);
  assert.equal(extracted.height, object.source.height, `Extracted object ${id} height mismatch.`);
  assert.equal(countOpaqueChroma(extracted), 0, `Extracted object ${id} contains opaque chroma-key pixels.`);
}

for (const file of [
  "source-analysis.md",
  "classic-world-tileset-report.md",
  "group-detection.png",
  "terrain-tiles-contact-sheet.png",
  "objects-contact-sheet.png",
  "landmarks-contact-sheet.png"
]) {
  assert(fs.existsSync(path.join(DEBUG_DIR, file)), `Missing debug output: docs/debug/world-tileset-import/${file}`);
}

assertRuntimeLoadsClassicTileset();

console.log(`Classic world tileset validation passed: ${tileEntries.length} unique tiles, ${objectEntries.length} objects/landmarks.`);

function assertRuntimeLoadsClassicTileset() {
  const runtimeFiles = ["src/main.ts", "src/world/worldGenerator.ts", "src/data/worldTiles.ts"];
  const mainSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/main.ts"), "utf8");
  assert(mainSource.includes("classic_world_tileset.cleaned.png"), "src/main.ts must explicitly load the active classic tileset image.");
  assert(mainSource.includes("classicWorldTileset.manifest.json"), "src/main.ts must explicitly load the active classic tileset manifest.");
  assert(mainSource.includes("classic_world_tileset"), "src/main.ts must use the classic texture key.");
  for (const file of runtimeFiles) {
    const text = fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8");
    assert(!text.includes("57105.png"), `${file} must not load the raw source tileset.`);
    assert(!text.replace("!./assets/world/world_atlas.normalized.png", "").includes("world_atlas.normalized.png"), `${file} must not load the old generated atlas.`);
  }
}

function assertRectInImage(rect, image, label) {
  assert(Number.isInteger(rect.x) && Number.isInteger(rect.y) && Number.isInteger(rect.width) && Number.isInteger(rect.height), `${label} source rect must use integers.`);
  assert(rect.width > 0 && rect.height > 0, `${label} source rect must be positive.`);
  assert(rect.x >= 0 && rect.y >= 0, `${label} source rect starts outside image.`);
  assert(rect.x + rect.width <= image.width, `${label} source rect exceeds image width.`);
  assert(rect.y + rect.height <= image.height, `${label} source rect exceeds image height.`);
}

function countTransparent(image) {
  let count = 0;
  for (let i = 3; i < image.data.length; i += 4) {
    if (image.data[i] === 0) count += 1;
  }
  return count;
}

function countOpaqueChroma(image) {
  let count = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i + 3] > 0 && image.data[i] === CHROMA[0] && image.data[i + 1] === CHROMA[1] && image.data[i + 2] === CHROMA[2]) count += 1;
  }
  return count;
}

function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error(`Not a PNG: ${filePath}`);
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

function relative(targetPath) {
  return path.relative(PROJECT_ROOT, targetPath).replace(/\\/g, "/");
}
