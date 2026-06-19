import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const SOURCE_ATLAS = "D:/Projects/new_artwork/atlas_v3.jpeg";
const RUNTIME_ATLAS = path.join(PROJECT_ROOT, "src", "assets", "world", "atlas_v3.png");
const MANIFEST_PATH = path.join(PROJECT_ROOT, "src", "assets", "world", "atlasV3.manifest.json");
const DEBUG_DIR = path.join(PROJECT_ROOT, "docs", "debug", "world-atlas-v3");
const LABELED_ATLAS_PATH = path.join(DEBUG_DIR, "atlas-v3-labeled.png");
const REPORT_PATH = path.join(DEBUG_DIR, "atlas-v3-import-report.md");

const COLUMNS = 8;
const ROWS = 8;
const NEAR_BLACK_LUMINANCE = 20;
const NEAR_BLACK_MAX_CHANNEL = 34;
const EMPTY_PIXEL_RATIO = 0.9;

const CELL_CLASSIFICATION = [
  [
    tile("bright_grass", "grassland", "grassland", "plains", true, 1, ["grass", "land", "base"], "Bright open grass."),
    tile("medium_grass", "grassland", "grassland", "plains", true, 1, ["grass", "land", "base"], "Medium open grass."),
    tile("dark_grass", "grassland", "grassland", "plains", true, 1.05, ["grass", "land", "dark"], "Darker grass variant."),
    tile("flower_meadow_grass", "grassland", "grassland", "plains", true, 1, ["grass", "flowers", "land"], "Flower meadow grass."),
    tile("lush_clover_grass", "grassland", "grassland", "plains", true, 1, ["grass", "clover", "lush", "land"], "Lush clover ground."),
    tile("weeds_grass", "grassland", "grassland", "plains", true, 1.1, ["grass", "weeds", "land"], "Sparse weed clusters on grass."),
    tile("trampled_grass", "grassland", "grassland", "plains", true, 1, ["grass", "trampled", "land"], "Trampled grass patch."),
    tile("grass_stones", "grassland", "grassland", "plains", true, 1.15, ["grass", "stones", "land"], "Grass with scattered stones.")
  ],
  emptyRow(),
  [
    tile("bright_sand", "desert", "dryland", "sand", true, 1.25, ["sand", "desert", "land"], "Bright sand."),
    tile("dune_sand", "desert", "dryland", "sand", true, 1.35, ["sand", "desert", "dune", "land"], "Wind-shaped dune sand."),
    tile("rocky_sand", "desert", "dryland", "sand", true, 1.45, ["sand", "desert", "rocks", "land"], "Rocky sand."),
    tile("cracked_dry_earth", "desert", "dryland", "sand", true, 1.35, ["dry", "cracked", "desert", "land"], "Cracked dry earth."),
    tile("reddish_desert_soil", "desert", "dryland", "sand", true, 1.35, ["desert", "red", "rocks", "land"], "Reddish desert soil."),
    tile("cactus_sand", "desert", "dryland", "sand", true, 1.6, ["desert", "cactus", "sand", "land"], "Cactus sand; walkable with higher movement cost."),
    tile("desert_scrub", "desert", "dryland", "sand", true, 1.45, ["desert", "scrub", "land"], "Dry scrubland."),
    null
  ],
  [
    tile("clean_snow", "snow", "snow", "hills", true, 1.35, ["snow", "land"], "Clean snow."),
    tile("packed_snow", "snow", "snow", "hills", true, 1.25, ["snow", "packed", "land"], "Packed snow."),
    tile("icy_snow", "snow", "snow", "hills", true, 1.45, ["snow", "ice", "land"], "Icy snow."),
    tile("snow_rocks", "snow", "snow", "hills", true, 1.6, ["snow", "rocks", "land"], "Snow with rocks."),
    tile("frozen_lake_ice", "snow", "ice", "hills", true, 1.35, ["ice", "frozen", "land"], "Frozen lake ice used as walkable frozen ground, not water."),
    tile("cracked_ice", "snow", "ice", "hills", true, 1.5, ["ice", "cracked", "frozen", "land"], "Cracked ice used as walkable frozen ground, not water."),
    null,
    null
  ],
  [
    null,
    null,
    null,
    tile("dead_cracked_earth", "darkland", "cursed", "final", true, 1.5, ["darkland", "dead", "cracked", "land"], "Dead cracked earth."),
    tile("ash_black_ground", "darkland", "cursed", "final", true, 1.55, ["darkland", "ash", "blackened", "land"], "Ash-black ground."),
    tile("cursed_purple_ground", "darkland", "cursed", "final", true, 1.6, ["darkland", "cursed", "purple", "land"], "Cursed purple ground."),
    null,
    null
  ],
  [
    tile("deep_water", "water", "water", "water", false, 99, ["water", "deep", "blocked"], "Deep water is blocked."),
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ],
  [
    tile("rocky_mountain_ground", "mountain", "rock", "hills", false, 99, ["mountain", "rock", "blocked"], "Rocky mountain ground is a blocker."),
    tile("gravel_stone_ground", "mountain", "rock", "hills", true, 1.7, ["rock", "gravel", "stone", "land"], "Walkable gravel and stone ground."),
    null,
    null,
    tile("volcano_mound", "mountain", "volcano", "final", false, 99, ["volcano", "lava", "blocked"], "Volcano mound is blocked."),
    null,
    null,
    null
  ],
  [
    tile("lava_cracked_ground", "lava", "lava", "final", false, 99, ["lava", "blocked"], "Lava cracked ground is blocked."),
    null,
    null,
    null,
    null,
    null,
    null,
    null
  ]
];

function tile(id, biome, category, encounterFamily, walkable, movementCost, tags, notes) {
  return { id, biome, category, encounterFamily, walkable, movementCost, tags, notes };
}

function emptyRow() {
  return Array.from({ length: COLUMNS }, () => null);
}

function main() {
  ensureDir(path.dirname(RUNTIME_ATLAS));
  ensureDir(DEBUG_DIR);
  if (!fs.existsSync(SOURCE_ATLAS)) throw new Error(`Missing atlas source: ${SOURCE_ATLAS}`);
  assertClassificationGrid();

  convertJpegToPng(SOURCE_ATLAS, RUNTIME_ATLAS);
  const image = readPng(RUNTIME_ATLAS);
  const { tileWidth, tileHeight } = assertAtlasGrid(image);
  const cells = buildCells(image, tileWidth, tileHeight);
  const nonEmptyCells = cells.filter((cell) => !cell.empty);
  const emptyCells = cells.filter((cell) => cell.empty);

  const manifest = {
    schemaVersion: 1,
    id: "atlas_v3",
    generatedBy: "tools/art_import/import_atlas_v3.mjs",
    sourceImage: SOURCE_ATLAS,
    sourceSha256: fileHash(SOURCE_ATLAS),
    runtimeImage: "src/assets/world/atlas_v3.png",
    columns: COLUMNS,
    rows: ROWS,
    tileWidth,
    tileHeight,
    image: {
      width: image.width,
      height: image.height,
      runtimeFormat: "png",
      sourceFormat: "jpeg"
    },
    emptyDetection: {
      nearBlackLuminance: NEAR_BLACK_LUMINANCE,
      nearBlackMaxChannel: NEAR_BLACK_MAX_CHANNEL,
      emptyPixelRatio: EMPTY_PIXEL_RATIO
    },
    cells,
    tiles: Object.fromEntries(nonEmptyCells.map((cell) => [cell.id, cell]))
  };

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writePng(LABELED_ATLAS_PATH, renderLabeledAtlas(image, cells));
  fs.writeFileSync(REPORT_PATH, buildReport(image, cells, tileWidth, tileHeight), "utf8");

  console.log(`Imported atlas_v3 ${image.width}x${image.height}.`);
  console.log(`Runtime atlas: ${relative(RUNTIME_ATLAS)}`);
  console.log(`Manifest: ${relative(MANIFEST_PATH)}`);
  console.log(`Tile size: ${tileWidth}x${tileHeight}; grid ${COLUMNS}x${ROWS}`);
  console.log(`Non-empty cells: ${nonEmptyCells.length}; empty cells: ${emptyCells.length}`);
}

function assertClassificationGrid() {
  if (CELL_CLASSIFICATION.length !== ROWS) throw new Error(`Classification has ${CELL_CLASSIFICATION.length} rows; expected ${ROWS}.`);
  for (let row = 0; row < ROWS; row += 1) {
    if (CELL_CLASSIFICATION[row].length !== COLUMNS) throw new Error(`Classification row ${row} has ${CELL_CLASSIFICATION[row].length} cells; expected ${COLUMNS}.`);
  }
}

function convertJpegToPng(source, output) {
  const sourceLiteral = powerShellLiteral(source);
  const outputLiteral = powerShellLiteral(output);
  const command = [
    "Add-Type -AssemblyName System.Drawing;",
    `$source=${sourceLiteral};`,
    `$output=${outputLiteral};`,
    "$image=[System.Drawing.Image]::FromFile($source);",
    "try {",
    "$image.Save($output, [System.Drawing.Imaging.ImageFormat]::Png);",
    "} finally { $image.Dispose(); }"
  ].join(" ");
  execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command], { stdio: "pipe" });
}

function powerShellLiteral(value) {
  return `'${value.replace(/'/g, "''")}'`;
}

function assertAtlasGrid(image) {
  if (image.width !== image.height) throw new Error(`atlas_v3 must be square; got ${image.width}x${image.height}.`);
  if (image.width % COLUMNS !== 0) throw new Error(`atlas_v3 width ${image.width} is not divisible by ${COLUMNS}.`);
  if (image.height % ROWS !== 0) throw new Error(`atlas_v3 height ${image.height} is not divisible by ${ROWS}.`);
  const tileWidth = image.width / COLUMNS;
  const tileHeight = image.height / ROWS;
  if (!Number.isInteger(tileWidth) || !Number.isInteger(tileHeight)) throw new Error(`atlas_v3 tile size must be integer; got ${tileWidth}x${tileHeight}.`);
  if (tileWidth !== tileHeight) throw new Error(`atlas_v3 tiles must be square; got ${tileWidth}x${tileHeight}.`);
  return { tileWidth, tileHeight };
}

function buildCells(image, tileWidth, tileHeight) {
  const cells = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const classification = CELL_CLASSIFICATION[row][col];
      const source = {
        x: col * tileWidth,
        y: row * tileHeight,
        width: tileWidth,
        height: tileHeight
      };
      const emptyRatio = nearBlackRatio(image, source);
      const detectedEmpty = emptyRatio > EMPTY_PIXEL_RATIO;
      if (detectedEmpty && classification) throw new Error(`Cell ${row},${col} (${classification.id}) was classified as a tile but detected as ${formatPercent(emptyRatio)} black.`);
      if (!detectedEmpty && !classification) throw new Error(`Cell ${row},${col} was classified empty but detected as only ${formatPercent(emptyRatio)} black.`);
      if (detectedEmpty) {
        cells.push({
          row,
          col,
          empty: true,
          source,
          emptyRatio: roundRatio(emptyRatio),
          notes: "Unused black atlas slot; ignored by worldgen."
        });
        continue;
      }
      cells.push({
        row,
        col,
        empty: false,
        id: classification.id,
        biome: classification.biome,
        category: classification.category,
        encounterFamily: classification.encounterFamily,
        walkable: classification.walkable,
        movementCost: classification.movementCost,
        tags: classification.tags,
        source,
        emptyRatio: roundRatio(emptyRatio),
        notes: classification.notes
      });
    }
  }
  return cells;
}

function nearBlackRatio(image, rect) {
  let nearBlack = 0;
  let total = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const offset = (y * image.width + x) * 4;
      const r = image.data[offset];
      const g = image.data[offset + 1];
      const b = image.data[offset + 2];
      const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
      if (luminance <= NEAR_BLACK_LUMINANCE && Math.max(r, g, b) <= NEAR_BLACK_MAX_CHANNEL) nearBlack += 1;
      total += 1;
    }
  }
  return nearBlack / total;
}

function buildReport(image, cells, tileWidth, tileHeight) {
  const nonEmpty = cells.filter((cell) => !cell.empty);
  const empty = cells.filter((cell) => cell.empty);
  const walkable = nonEmpty.filter((cell) => cell.walkable);
  const blocked = nonEmpty.filter((cell) => !cell.walkable);
  const classifiedRows = cells
    .map((cell) => {
      if (cell.empty) return `- Row ${cell.row}, col ${cell.col}: empty (${formatPercent(cell.emptyRatio)} near-black)`;
      return `- Row ${cell.row}, col ${cell.col}: ${cell.id} (${cell.biome}/${cell.category}; ${cell.walkable ? "walkable" : "blocked"}; tags: ${cell.tags.join(", ")})`;
    })
    .join("\n");

  return `# Atlas V3 Import Report

Source path: \`${SOURCE_ATLAS}\`
Source SHA-256: \`${fileHash(SOURCE_ATLAS)}\`
Source dimensions: ${image.width}x${image.height}
Runtime atlas path: \`${relative(RUNTIME_ATLAS)}\`
Manifest path: \`${relative(MANIFEST_PATH)}\`
Labeled atlas: \`${relative(LABELED_ATLAS_PATH)}\`

## Grid

- Grid size: ${COLUMNS}x${ROWS}
- Logical cells: ${COLUMNS * ROWS}
- Tile size: ${tileWidth}x${tileHeight}
- Source rectangle formula: \`sx = col * tileWidth; sy = row * tileHeight; sw = tileWidth; sh = tileHeight\`

## Empty Cell Detection

- Near-black luminance threshold: ${NEAR_BLACK_LUMINANCE}
- Near-black max-channel threshold: ${NEAR_BLACK_MAX_CHANNEL}
- Empty ratio threshold: > ${Math.round(EMPTY_PIXEL_RATIO * 100)}%
- Non-empty tiles: ${nonEmpty.length}
- Empty cells: ${empty.length}

Black/empty cells are unused atlas slots. They are not transparency and are ignored by worldgen.

## Walkability Summary

- Walkable non-empty tiles: ${walkable.length}
- Blocked non-empty tiles: ${blocked.length}
- Blocked water tiles: ${blocked.filter((cell) => cell.tags.includes("water")).length}
- Blocked mountain/volcano/lava tiles: ${blocked.filter((cell) => cell.tags.some((tag) => ["mountain", "volcano", "lava"].includes(tag))).length}

## Classified Cells

${classifiedRows}
`;
}

function renderLabeledAtlas(source, cells) {
  const image = cloneImage(source);
  for (const cell of cells) {
    const color = cell.empty ? [255, 80, 80, 255] : cell.walkable ? [120, 255, 170, 255] : [255, 205, 80, 255];
    drawRect(image, cell.source.x, cell.source.y, cell.source.width - 1, cell.source.height - 1, color);
    drawTinyLabel(image, cell.source.x + 5, cell.source.y + 5, `${cell.row},${cell.col}`, [255, 255, 255, 255]);
    drawTinyLabel(image, cell.source.x + 5, cell.source.y + 18, cell.empty ? "empty" : cell.id.slice(0, 24), color);
  }
  return image;
}

function cloneImage(image) {
  return { width: image.width, height: image.height, data: Buffer.from(image.data) };
}

function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
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
  const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bitDepth !== 8 || !bpp) throw new Error(`Unsupported PNG format in ${filePath}; expected 8-bit RGB/RGBA, got bitDepth=${bitDepth}, colorType=${colorType}.`);
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const raw = unfilter(inflated, width, height, bpp);
  const image = makeImage(width, height, [0, 0, 0, 255]);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    image.data[pixel * 4] = raw[pixel * bpp];
    image.data[pixel * 4 + 1] = raw[pixel * bpp + 1];
    image.data[pixel * 4 + 2] = raw[pixel * bpp + 2];
    image.data[pixel * 4 + 3] = bpp === 4 ? raw[pixel * bpp + 3] : 255;
  }
  return image;
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

function makeImage(width, height, fill = [0, 0, 0, 0]) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return { width, height, data };
}

function writePng(filePath, image) {
  ensureDir(path.dirname(filePath));
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

function drawRect(image, x, y, width, height, color) {
  for (let xx = x; xx <= x + width; xx += 1) {
    setPixel(image, xx, y, color);
    setPixel(image, xx, y + height, color);
  }
  for (let yy = y; yy <= y + height; yy += 1) {
    setPixel(image, x, yy, color);
    setPixel(image, x + width, yy, color);
  }
}

const FONT = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
  ",": ["000", "000", "000", "010", "100"],
  "_": ["000", "000", "000", "000", "111"],
  "-": ["000", "000", "111", "000", "000"],
  " ": ["000", "000", "000", "000", "000"]
};

function drawTinyLabel(image, x, y, text, color) {
  let px = x;
  for (const char of text.toLowerCase()) {
    const glyph = FONT[char] ?? letterGlyph(char);
    for (let gy = 0; gy < glyph.length; gy += 1) {
      for (let gx = 0; gx < glyph[gy].length; gx += 1) {
        if (glyph[gy][gx] === "1") setPixel(image, px + gx, y + gy, color);
      }
    }
    px += 4;
  }
}

function letterGlyph(char) {
  const code = char.charCodeAt(0);
  if (code < 97 || code > 122) return ["000", "000", "000", "000", "000"];
  const n = code - 97;
  return [
    `${n & 1 ? "1" : "0"}11`,
    `1${n & 2 ? "1" : "0"}1`,
    "111",
    `1${n & 4 ? "1" : "0"}1`,
    `1${n & 8 ? "1" : "0"}1`
  ];
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * 4;
  image.data[offset] = color[0];
  image.data[offset + 1] = color[1];
  image.data[offset + 2] = color[2];
  image.data[offset + 3] = color[3];
}

function roundRatio(value) {
  return Math.round(value * 10000) / 10000;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function relative(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
}

main();
