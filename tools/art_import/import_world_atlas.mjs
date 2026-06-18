import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const SOURCE_ATLAS = "C:/Users/Marku/Downloads/redo_this_please_2K_202606182233.jpeg";
const SOURCE_COPY_DIR = path.join(PROJECT_ROOT, "assets_v2", "source_sheets", "world_atlas");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "assets_v2", "world");
const REPORT_DIR = path.join(PROJECT_ROOT, "docs", "debug", "world-atlas");
const DATA_OUTPUT = path.join(PROJECT_ROOT, "src", "data", "worldTiles.ts");

const COLUMNS = 10;
const ROWS = 8;
const SOURCE_COLUMNS = 10;
const SOURCE_ROWS = 10;
const SOURCE_ROWS_FOR_OUTPUT = [0, 1, 2, 3, 4, 5, 7, 9];

const TILE_ROWS = [
  {
    row: 0,
    biome: "grassland",
    family: "plains",
    tiles: [
      ["bright_grass", true, 1, ["grass", "land"]],
      ["medium_grass", true, 1, ["grass", "land"]],
      ["dark_grass", true, 1, ["grass", "land"]],
      ["flower_meadow", true, 1, ["grass", "flowers", "land"]],
      ["clover_lush_grass", true, 1, ["grass", "lush", "land"]],
      ["trampled_grass", true, 1, ["grass", "worn", "land"]],
      ["weeds_grass", true, 1.1, ["grass", "weeds", "land"]],
      ["dirt_patch", true, 1, ["dirt", "land"]],
      ["grass_stones", true, 1.2, ["grass", "rocks", "land"]],
      ["yellow_flower_grass", true, 1, ["grass", "flowers", "land"]]
    ]
  },
  {
    row: 1,
    biome: "forest",
    family: "forest",
    tiles: [
      ["forest_floor", true, 1.4, ["forest", "land"]],
      ["dark_forest_floor", true, 1.6, ["forest", "dark", "land"]],
      ["mossy_forest_ground", true, 1.4, ["forest", "moss", "land"]],
      ["dense_leafy_woodland", true, 2.1, ["forest", "dense", "land"]],
      ["bush_hedge", true, 1.8, ["forest", "bush", "land"]],
      ["tree_covered_green", true, 2.2, ["forest", "dense", "land"]],
      ["rooty_forest_earth", true, 1.7, ["forest", "roots", "land"]],
      ["autumn_woodland", true, 1.5, ["forest", "autumn", "land"]],
      ["enchanted_forest_ground", true, 1.5, ["forest", "magic", "land"]],
      ["forest_path", true, 0.75, ["forest", "road", "path", "land"]]
    ]
  },
  {
    row: 2,
    biome: "desert",
    family: "sand",
    tiles: [
      ["bright_sand", true, 1.35, ["sand", "desert", "land"]],
      ["golden_sand", true, 1.35, ["sand", "desert", "land"]],
      ["dune_sand", true, 1.55, ["sand", "desert", "dune", "land"]],
      ["rocky_sand", true, 1.65, ["sand", "desert", "rocks", "land"]],
      ["cracked_dry_earth", true, 1.45, ["desert", "dry", "land"]],
      ["reddish_desert_soil", true, 1.45, ["desert", "red", "land"]],
      ["cactus_scrub", true, 1.8, ["desert", "scrub", "land"]],
      ["oasis", false, 99, ["water", "oasis"]],
      ["sandstone_floor", true, 1.2, ["desert", "stone", "land"]],
      ["desert_scrub_path", true, 0.85, ["desert", "road", "path", "land"]]
    ]
  },
  {
    row: 3,
    biome: "snow",
    family: "hills",
    tiles: [
      ["clean_snow", true, 1.45, ["snow", "land"]],
      ["packed_snow", true, 1.3, ["snow", "packed", "land"]],
      ["icy_snow", true, 1.55, ["snow", "ice", "land"]],
      ["frozen_ground", true, 1.5, ["snow", "frozen", "land"]],
      ["frosty_sparkle_snow", true, 1.45, ["snow", "sparkle", "land"]],
      ["snow_rock", true, 1.9, ["snow", "rocks", "land"]],
      ["frozen_lake_ice", false, 99, ["water", "ice"]],
      ["cracked_ice", false, 99, ["water", "ice"]],
      ["glacier_ice", false, 99, ["water", "ice", "glacier"]],
      ["snowy_path", true, 0.9, ["snow", "road", "path", "land"]]
    ]
  },
  {
    row: 4,
    biome: "darkland",
    family: "final",
    tiles: [
      ["darkland_grass", true, 1.5, ["darkland", "grass", "land"]],
      ["dead_earth", true, 1.45, ["darkland", "dead", "land"]],
      ["muddy_swamp", true, 1.9, ["darkland", "swamp", "land"]],
      ["boggy_wetland", true, 2.1, ["darkland", "swamp", "land"]],
      ["toxic_marsh", false, 99, ["water", "toxic", "swamp"]],
      ["ash_ground", true, 1.55, ["darkland", "ash", "land"]],
      ["cursed_purple_soil", true, 1.6, ["darkland", "cursed", "land"]],
      ["blackened_wasteland", true, 1.7, ["darkland", "wasteland", "land"]],
      ["sickly_corrupted_ground", true, 1.8, ["darkland", "corrupt", "land"]],
      ["haunted_dead_forest_floor", true, 1.9, ["darkland", "forest", "land"]]
    ]
  },
  {
    row: 5,
    biome: "water",
    family: "water",
    tiles: [
      ["deep_ocean_water", false, 99, ["water", "ocean", "deep"]],
      ["light_water", false, 99, ["water"]],
      ["river_water", false, 99, ["water", "river"]],
      ["shallow_water", false, 99, ["water", "shallow"]],
      ["swamp_water", false, 99, ["water", "swamp"]],
      ["beach_shore", true, 1.15, ["shore", "beach", "land"]],
      ["wooden_bridge_horizontal", true, 0.7, ["bridge", "road", "land"]],
      ["wooden_bridge_vertical", true, 0.7, ["bridge", "road", "land"]],
      ["stone_bridge_horizontal", true, 0.65, ["bridge", "road", "land"]],
      ["stone_bridge_vertical", true, 0.65, ["bridge", "road", "land"]]
    ]
  },
  {
    row: 6,
    biome: "mountain",
    family: "hills",
    tiles: [
      ["rocky_hill_ground", true, 2.1, ["rock", "hill", "land"]],
      ["mountain_foothill", true, 2.4, ["mountain", "foothill", "land"]],
      ["dark_mountain_ground", false, 99, ["mountain", "blocked"]],
      ["gravel_stone_ground", true, 1.8, ["rock", "gravel", "land"]],
      ["cliff_top_rock", false, 99, ["cliff", "blocked"]],
      ["canyon_stone", false, 99, ["canyon", "blocked"]],
      ["mossy_rock", true, 2, ["rock", "moss", "land"]],
      ["volcanic_stone", false, 99, ["lava", "volcanic", "blocked"]],
      ["crystal_rock", false, 99, ["crystal", "blocked"]],
      ["cave_rock", true, 2.2, ["cave", "rock", "land"]]
    ]
  },
  {
    row: 7,
    biome: "road",
    family: "road",
    tiles: [
      ["dirt_road", true, 0.65, ["road", "land"]],
      ["worn_path", true, 0.75, ["road", "path", "land"]],
      ["cobblestone_road", true, 0.55, ["road", "stone", "land"]],
      ["ancient_ruin_floor", true, 0.9, ["road", "ruin", "land"]],
      ["lava_cracked_ground", false, 99, ["lava", "blocked"]],
      ["tropical_lush_ground", true, 1.2, ["grass", "tropical", "land"]],
      ["tropical_beach_sand", true, 1.15, ["beach", "tropical", "land"]],
      ["magical_crystal_field", true, 1.6, ["magic", "crystal", "land"]],
      ["graveyard_earth", true, 1.45, ["darkland", "graveyard", "land"]],
      ["mixed_utility_terrain", true, 1.3, ["mixed", "land"]]
    ]
  }
];

function main() {
  ensureDir(SOURCE_COPY_DIR);
  ensureDir(OUTPUT_DIR);
  ensureDir(REPORT_DIR);
  ensureDir(path.dirname(DATA_OUTPUT));
  if (!fs.existsSync(SOURCE_ATLAS)) throw new Error(`Missing source atlas: ${SOURCE_ATLAS}`);

  const copiedSource = path.join(SOURCE_COPY_DIR, "redo_this_please_2k_202606182233.jpeg");
  fs.rmSync(path.join(SOURCE_COPY_DIR, "atlas.png"), { force: true });
  fs.copyFileSync(SOURCE_ATLAS, copiedSource);

  const image = readSourceImage(SOURCE_ATLAS);
  const columnBoundaries = detectBoundaries(image, SOURCE_COLUMNS, "x");
  const rowBoundaries = detectBoundaries(image, SOURCE_ROWS, "y");
  const sourceCells = [];
  for (let row = 0; row < ROWS; row += 1) {
    const sourceRow = SOURCE_ROWS_FOR_OUTPUT[row];
    for (let col = 0; col < COLUMNS; col += 1) {
      sourceCells.push({
        row,
        col,
        sourceRow,
        id: TILE_ROWS[row].tiles[col][0],
        sourceRect: {
          x: columnBoundaries[col].end + 1,
          y: rowBoundaries[sourceRow].end + 1,
          width: columnBoundaries[col + 1].start - columnBoundaries[col].end - 1,
          height: rowBoundaries[sourceRow + 1].start - rowBoundaries[sourceRow].end - 1
        }
      });
    }
  }
  const normalizedTileSize = chooseTileSize(sourceCells);
  const normalized = makeImage(COLUMNS * normalizedTileSize, ROWS * normalizedTileSize, [0, 0, 0, 255]);
  const debug = makeImage(normalized.width, normalized.height, [8, 12, 20, 255]);
  const cells = [];

  for (const cell of sourceCells) {
    const destRect = {
      x: cell.col * normalizedTileSize,
      y: cell.row * normalizedTileSize,
      width: normalizedTileSize,
      height: normalizedTileSize
    };
    drawScaledNearest(image, normalized, cell.sourceRect, destRect);
    drawScaledNearest(image, debug, cell.sourceRect, destRect);
    drawRect(debug, destRect.x, destRect.y, destRect.width - 1, destRect.height - 1, [255, 230, 128, 255]);
    drawTinyLabel(debug, destRect.x + 5, destRect.y + 5, `${cell.row},${cell.col} src${cell.sourceRow}`, [255, 255, 255, 255]);
    drawTinyLabel(debug, destRect.x + 5, destRect.y + 18, cell.id.slice(0, 17), [180, 232, 255, 255]);
    cells.push({ ...cell, destRect });
  }

  const normalizedPath = path.join(OUTPUT_DIR, "world_atlas_normalized.png");
  const debugPath = path.join(REPORT_DIR, "world_atlas.debug.png");
  const reportPath = path.join(REPORT_DIR, "world_atlas.import-report.md");
  writePng(normalizedPath, normalized);
  writePng(debugPath, debug);
  fs.writeFileSync(reportPath, buildReport(image, columnBoundaries, rowBoundaries, cells, normalizedTileSize, copiedSource), "utf8");
  fs.writeFileSync(DATA_OUTPUT, buildTypeScriptManifest(normalizedTileSize), "utf8");

  console.log(`Imported world atlas ${image.width}x${image.height}.`);
  console.log(`Normalized atlas: ${relative(normalizedPath)} (${normalized.width}x${normalized.height})`);
  console.log(`Tile manifest: ${relative(DATA_OUTPUT)}`);
  console.log(`Tile size: ${normalizedTileSize}x${normalizedTileSize}; grid ${COLUMNS}x${ROWS}`);
}

function chooseTileSize(cells) {
  const sizes = cells.flatMap((cell) => [cell.sourceRect.width, cell.sourceRect.height]).sort((a, b) => a - b);
  return Math.max(...sizes);
}

function detectBoundaries(image, divisions, axis) {
  const size = axis === "x" ? image.width : image.height;
  const other = axis === "x" ? image.height : image.width;
  const bpp = 4;
  const boundaries = [];
  for (let i = 0; i <= divisions; i += 1) {
    const expected = (i * (size - 1)) / divisions;
    const min = Math.max(0, Math.floor(expected - 3));
    const max = Math.min(size - 1, Math.ceil(expected + 3));
    let best = min;
    let bestScore = Infinity;
    for (let p = min; p <= max; p += 1) {
      let brightness = 0;
      for (let q = 0; q < other; q += 1) {
        const x = axis === "x" ? p : q;
        const y = axis === "x" ? q : p;
        const offset = (y * image.width + x) * bpp;
        brightness += (image.data[offset] + image.data[offset + 1] + image.data[offset + 2]) / 3;
      }
      brightness /= other;
      if (brightness < bestScore) {
        bestScore = brightness;
        best = p;
      }
    }
    let start = best;
    let end = best;
    while (start > 0 && averageLineBrightness(image, start - 1, axis) < bestScore + 14 && Math.abs(start - 1 - expected) <= 4) start -= 1;
    while (end < size - 1 && averageLineBrightness(image, end + 1, axis) < bestScore + 14 && Math.abs(end + 1 - expected) <= 4) end += 1;
    boundaries.push({ index: i, expected: Math.round(expected * 100) / 100, start, end, averageBrightness: Math.round(bestScore * 10) / 10 });
  }
  return boundaries;
}

function averageLineBrightness(image, p, axis) {
  const other = axis === "x" ? image.height : image.width;
  let brightness = 0;
  for (let q = 0; q < other; q += 1) {
    const x = axis === "x" ? p : q;
    const y = axis === "x" ? q : p;
    const offset = (y * image.width + x) * 4;
    brightness += (image.data[offset] + image.data[offset + 1] + image.data[offset + 2]) / 3;
  }
  return brightness / other;
}

function buildReport(image, columnBoundaries, rowBoundaries, cells, normalizedTileSize, copiedSource) {
  const sourceCellWidths = cells.map((cell) => cell.sourceRect.width);
  const sourceCellHeights = cells.map((cell) => cell.sourceRect.height);
  return `# World Atlas Import Report

Source: \`${SOURCE_ATLAS}\`
Copied source: \`${relative(copiedSource)}\`
Source dimensions: ${image.width}x${image.height}
Source color: ${image.sourceColorType}
Detected source grid: ${SOURCE_COLUMNS} columns x ${SOURCE_ROWS} rows
Runtime grid: ${COLUMNS} columns x ${ROWS} rows
Normalized tile size: ${normalizedTileSize}x${normalizedTileSize}
Normalized atlas: \`${relative(path.join(OUTPUT_DIR, "world_atlas_normalized.png"))}\`
Debug preview: \`${relative(path.join(REPORT_DIR, "world_atlas.debug.png"))}\`

## Separator Detection

The source is a square ${SOURCE_COLUMNS}x${SOURCE_ROWS} JPEG atlas with separator/border lines. Dark separator lines were detected near the expected grid boundaries and excluded from each runtime tile before nearest-neighbor normalization.

The game uses the requested ${COLUMNS}x${ROWS} logical terrain model. Source rows ${SOURCE_ROWS_FOR_OUTPUT.join(", ")} were selected for runtime rows 0-${ROWS - 1}; duplicate/detail rows not in that list are kept only in the copied source/debug provenance.

Column boundaries:

${columnBoundaries.map((b) => `- ${b.index}: expected ${b.expected}, separator ${b.start}-${b.end}, avg ${b.averageBrightness}`).join("\n")}

Row boundaries:

${rowBoundaries.map((b) => `- ${b.index}: expected ${b.expected}, separator ${b.start}-${b.end}, avg ${b.averageBrightness}`).join("\n")}

Source crop widths: ${Math.min(...sourceCellWidths)}-${Math.max(...sourceCellWidths)}
Source crop heights: ${Math.min(...sourceCellHeights)}-${Math.max(...sourceCellHeights)}

## Cells

| Runtime Row | Source Row | Col | Tile ID | Source Rect | Normalized Rect |
|---:|---:|---:|---|---|---|
${cells
  .map(
    (cell) =>
      `| ${cell.row} | ${cell.sourceRow} | ${cell.col} | \`${cell.id}\` | ${cell.sourceRect.x},${cell.sourceRect.y},${cell.sourceRect.width},${cell.sourceRect.height} | ${cell.destRect.x},${cell.destRect.y},${cell.destRect.width},${cell.destRect.height} |`
  )
  .join("\n")}
`;
}

function buildTypeScriptManifest(normalizedTileSize) {
  const defs = [];
  for (const row of TILE_ROWS) {
    for (let col = 0; col < row.tiles.length; col += 1) {
      const [id, walkable, movementCost, tags] = row.tiles[col];
      defs.push({
        id,
        row: row.row,
        col,
        biome: row.biome,
        encounterFamily: row.family,
        walkable,
        movementCost,
        tags
      });
    }
  }
  return `export const WORLD_ATLAS = {
  textureKey: "world_atlas",
  image: "assets_v2/world/world_atlas_normalized.png",
  sourceCopy: "assets_v2/source_sheets/world_atlas/redo_this_please_2k_202606182233.jpeg",
  columns: ${COLUMNS},
  rows: ${ROWS},
  sourceColumns: ${SOURCE_COLUMNS},
  sourceRows: ${SOURCE_ROWS},
  selectedSourceRows: ${JSON.stringify(SOURCE_ROWS_FOR_OUTPUT)},
  tileWidth: ${normalizedTileSize},
  tileHeight: ${normalizedTileSize},
  sheetWidth: ${COLUMNS * normalizedTileSize},
  sheetHeight: ${ROWS * normalizedTileSize}
} as const;

export type WorldBiome =
  | "grassland"
  | "forest"
  | "desert"
  | "snow"
  | "darkland"
  | "water"
  | "mountain"
  | "road";

export type WorldEncounterFamily = "plains" | "forest" | "hills" | "sand" | "water" | "final" | "road";

export interface WorldTileDefinition {
  id: WorldTileId;
  row: number;
  col: number;
  biome: WorldBiome;
  encounterFamily: WorldEncounterFamily;
  walkable: boolean;
  movementCost: number;
  tags: string[];
}

export const WORLD_TILE_DEFINITIONS = ${JSON.stringify(defs, null, 2)} as const;

export type WorldTileId = (typeof WORLD_TILE_DEFINITIONS)[number]["id"];

export const WORLD_TILES = Object.fromEntries(
  WORLD_TILE_DEFINITIONS.map((tile) => [tile.id, tile])
) as unknown as Record<WorldTileId, WorldTileDefinition>;

export function getWorldTileDefinition(tileId: WorldTileId): WorldTileDefinition {
  return WORLD_TILES[tileId];
}

export function isWorldTileWalkable(tileId: WorldTileId): boolean {
  return WORLD_TILES[tileId]?.walkable ?? false;
}

export function worldTileMovementCost(tileId: WorldTileId): number {
  return WORLD_TILES[tileId]?.movementCost ?? 99;
}

export function worldTileHasTag(tileId: WorldTileId | undefined, tag: string): boolean {
  return !!tileId && !!WORLD_TILES[tileId]?.tags.includes(tag);
}

export function worldTileEncounterFamily(tileId: WorldTileId): WorldEncounterFamily | undefined {
  const family = WORLD_TILES[tileId]?.encounterFamily;
  return family === "road" ? undefined : family;
}
`;
}

function drawScaledNearest(source, target, sourceRect, destRect) {
  for (let y = 0; y < destRect.height; y += 1) {
    const sy = sourceRect.y + Math.min(sourceRect.height - 1, Math.floor((y / destRect.height) * sourceRect.height));
    for (let x = 0; x < destRect.width; x += 1) {
      const sx = sourceRect.x + Math.min(sourceRect.width - 1, Math.floor((x / destRect.width) * sourceRect.width));
      const sourceOffset = (sy * source.width + sx) * 4;
      const targetOffset = ((destRect.y + y) * target.width + destRect.x + x) * 4;
      target.data[targetOffset] = source.data[sourceOffset];
      target.data[targetOffset + 1] = source.data[sourceOffset + 1];
      target.data[targetOffset + 2] = source.data[sourceOffset + 2];
      target.data[targetOffset + 3] = 255;
    }
  }
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

function readSourceImage(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return readPng(filePath);
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    const tmpPng = path.join(REPORT_DIR, ".world-atlas-source.tmp.png");
    convertJpegToPng(filePath, tmpPng);
    try {
      const image = readPng(tmpPng);
      return { ...image, sourceColorType: "JPEG RGB converted through Windows imaging" };
    } finally {
      fs.rmSync(tmpPng, { force: true });
    }
  }
  throw new Error(`Unsupported atlas format: ${filePath}`);
}

function convertJpegToPng(source, dest) {
  const script = `
Add-Type -AssemblyName System.Drawing
$src = ${psQuote(source)}
$dst = ${psQuote(dest)}
$img = [System.Drawing.Image]::FromFile($src)
try {
  $img.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
} finally {
  $img.Dispose()
}
`;
  execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { stdio: "pipe" });
}

function psQuote(value) {
  return `'${value.replace(/'/g, "''")}'`;
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
  if (bitDepth !== 8 || !sourceBpp) {
    throw new Error(`Unsupported PNG format in ${filePath}; expected 8-bit RGB/RGBA, got bitDepth=${bitDepth}, colorType=${colorType}`);
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const raw = unfilter(inflated, width, height, sourceBpp);
  const rgba = makeImage(width, height, [0, 0, 0, 255]);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    rgba.data[pixel * 4] = raw[pixel * sourceBpp];
    rgba.data[pixel * 4 + 1] = raw[pixel * sourceBpp + 1];
    rgba.data[pixel * 4 + 2] = raw[pixel * sourceBpp + 2];
    rgba.data[pixel * 4 + 3] = sourceBpp === 4 ? raw[pixel * sourceBpp + 3] : 255;
  }
  return { ...rgba, sourceColorType: colorType === 6 ? "RGBA" : "RGB" };
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

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * 4;
  image.data[offset] = color[0];
  image.data[offset + 1] = color[1];
  image.data[offset + 2] = color[2];
  image.data[offset + 3] = color[3];
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function relative(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
}

main();
