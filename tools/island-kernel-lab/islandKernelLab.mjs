import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const DEFAULT_GRID = 9;
const DEFAULT_TILE = 128;
const DEFAULT_COUNT = 6;
const THUMBNAIL_TILE_SIZE = 32;

// Coordinates below are documented as 1-based row/column positions in the
// Greenhaven 9x9 kernel. Code converts them to 0-based tile indexes.
const SEMANTIC_COORDS = {
  waterFill: [1, 1],
  sandFill: [3, 3],
  grassFill: [5, 5],

  ws_nw: [2, 2],
  ws_n: [2, 3],
  ws_ne: [2, 8],
  ws_w: [3, 2],
  ws_e: [3, 8],
  ws_sw: [8, 2],
  ws_s: [8, 3],
  ws_se: [8, 8],

  sg_nw: [4, 4],
  sg_n: [4, 5],
  sg_ne: [4, 6],
  sg_w: [5, 4],
  sg_e: [5, 6],
  sg_sw: [6, 4],
  sg_s: [6, 5],
  sg_se: [6, 6]
};

const FONT_3X5 = {
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
  ",": ["000", "000", "000", "010", "100"]
};

main().catch((error) => {
  console.error(`Island Kernel Lab error: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(options.input);
  const outputDir = path.resolve(options.out ?? path.join("tmp", "island-kernel-lab", timestampSlug()));
  const expectedSize = options.grid * options.tile;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }

  if (options.grid !== DEFAULT_GRID) {
    throw new Error("Island semantic rendering currently requires --grid 9 for the Greenhaven kernel format.");
  }

  if (options.tile !== DEFAULT_TILE) {
    throw new Error("Island semantic rendering currently requires --tile 128 for the Greenhaven kernel format.");
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const source = readPng(inputPath);
  validateSourceDimensions(source, expectedSize, options.resize);
  const normalized = source.width === expectedSize && source.height === expectedSize
    ? clonePng(source)
    : resizeBilinear(source, expectedSize, expectedSize);

  const slices = sliceKernel(normalized, options.grid, options.tile);
  const semanticTiles = mapSemanticTiles(slices, options.grid);

  const outputs = [];
  outputs.push(writeOutput(outputDir, "00_source_normalized.png", normalized));

  const slicesDebug = composeDebugSheet(slices, options.grid, options.tile);
  outputs.push(writeOutput(outputDir, "01_slices_debug.png", slicesDebug));

  const recomposed = composeSlices(slices, options.grid, options.tile);
  outputs.push(writeOutput(outputDir, "02_kernel_recomposed.png", recomposed));

  const singleIsland = createWaterGrid(9, 9, options.tile, semanticTiles);
  placeIsland(singleIsland, semanticTiles, { x: 1, y: 1, width: 7, height: 7, grassWidth: 3, grassHeight: 3 });
  outputs.push(writeOutput(outputDir, "03_single_island_9x9.png", singleIsland.image));

  const mediumIsland = createWaterGrid(17, 13, options.tile, semanticTiles);
  placeIsland(mediumIsland, semanticTiles, { x: 2, y: 2, width: 13, height: 9, grassWidth: 7, grassHeight: 3 });
  outputs.push(writeOutput(outputDir, "04_generated_island_medium.png", mediumIsland.image));

  const largeIsland = createWaterGrid(27, 21, options.tile, semanticTiles);
  placeIsland(largeIsland, semanticTiles, { x: 3, y: 3, width: 21, height: 15, grassWidth: 11, grassHeight: 7 });
  outputs.push(writeOutput(outputDir, "05_generated_island_large.png", largeIsland.image));

  const archipelago = createArchipelago(semanticTiles, options.tile, options.seed, options.count);
  outputs.push(writeOutput(outputDir, "06_archipelago_preview.png", archipelago.image));

  const thumbnail = resizeBilinear(
    archipelago.image,
    Math.round((archipelago.image.width / options.tile) * THUMBNAIL_TILE_SIZE),
    Math.round((archipelago.image.height / options.tile) * THUMBNAIL_TILE_SIZE)
  );
  outputs.push(writeOutput(outputDir, "07_thumbnail_preview.png", thumbnail));

  const recomposedMatches = samePixelData(normalized, recomposed);

  console.log("Island Kernel Lab");
  console.log(`Input: ${inputPath}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Source dimensions: ${source.width}x${source.height}`);
  console.log(`Normalized dimensions: ${normalized.width}x${normalized.height}`);
  console.log(`Tile size: ${options.tile}x${options.tile}`);
  console.log(`Grid size: ${options.grid}x${options.grid}`);
  console.log(`Slices: ${slices.length}`);
  console.log(`Seed: ${options.seed}`);
  console.log(`Requested preview count: ${options.count}`);
  console.log(`Archipelago islands: ${archipelago.islandCount}`);
  console.log(`Kernel recomposed pixel match: ${recomposedMatches ? "yes" : "no"}`);
  console.log("Generated output files:");
  for (const output of outputs) console.log(`- ${output}`);
}

function parseArgs(args) {
  const parsed = {
    input: "",
    out: "",
    grid: DEFAULT_GRID,
    tile: DEFAULT_TILE,
    resize: false,
    seed: "greenhaven-kernel-lab",
    count: DEFAULT_COUNT
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();
    const takesValue = !["resize"].includes(key);
    let value = inlineValue;

    if (takesValue && value === undefined) {
      i += 1;
      value = args[i];
      if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    }

    switch (key) {
      case "input":
        parsed.input = value;
        break;
      case "out":
        parsed.out = value;
        break;
      case "grid":
        parsed.grid = parsePositiveInteger(value, "--grid");
        break;
      case "tile":
        parsed.tile = parsePositiveInteger(value, "--tile");
        break;
      case "resize":
        parsed.resize = value === undefined ? true : parseBoolean(value, "--resize");
        break;
      case "seed":
        parsed.seed = value;
        break;
      case "count":
        parsed.count = parsePositiveInteger(value, "--count");
        break;
      default:
        throw new Error(`Unknown option: --${key}`);
    }
  }

  if (!parsed.input) throw new Error("Missing required --input <path>.");
  return parsed;
}

function parsePositiveInteger(value, name) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${name} must be a positive integer, got ${value}.`);
  }
  return numberValue;
}

function parseBoolean(value, name) {
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  throw new Error(`${name} must be a boolean when a value is supplied, got ${value}.`);
}

function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  try {
    return PNG.sync.read(buffer);
  } catch (error) {
    throw new Error(`Could not read PNG input ${filePath}: ${error.message}`);
  }
}

function validateSourceDimensions(source, expectedSize, resizeRequested) {
  if (source.width !== source.height) {
    throw new Error(`Input image must be square, got ${source.width}x${source.height}.`);
  }

  if (!resizeRequested && (source.width !== expectedSize || source.height !== expectedSize)) {
    throw new Error(
      `Input image must be ${expectedSize}x${expectedSize}; got ${source.width}x${source.height}. ` +
      "Pass --resize to normalize square generated images before slicing."
    );
  }
}

function sliceKernel(image, grid, tileSize) {
  const expectedSize = grid * tileSize;
  if (image.width !== expectedSize || image.height !== expectedSize) {
    throw new Error(`Cannot slice ${image.width}x${image.height} into ${grid}x${grid} tiles of ${tileSize}px.`);
  }

  const slices = [];
  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      const tile = createPng(tileSize, tileSize);
      copyPixels(image, tile, col * tileSize, row * tileSize, 0, 0, tileSize, tileSize);
      if (tile.width !== tileSize || tile.height !== tileSize) {
        throw new Error(`Slice row ${row + 1}, col ${col + 1} is ${tile.width}x${tile.height}, expected ${tileSize}x${tileSize}.`);
      }
      slices.push({ row, col, image: tile });
    }
  }

  if (slices.length !== grid * grid) {
    throw new Error(`Expected ${grid * grid} slices, got ${slices.length}.`);
  }

  return slices;
}

function mapSemanticTiles(slices, grid) {
  const byKey = new Map(slices.map((slice) => [`${slice.row},${slice.col}`, slice.image]));
  const mapped = {};

  for (const [name, [oneBasedRow, oneBasedCol]] of Object.entries(SEMANTIC_COORDS)) {
    const row = oneBasedRow - 1;
    const col = oneBasedCol - 1;
    if (row < 0 || row >= grid || col < 0 || col >= grid) {
      throw new Error(`Semantic tile ${name} at row ${oneBasedRow}, col ${oneBasedCol} is outside the ${grid}x${grid} grid.`);
    }
    const image = byKey.get(`${row},${col}`);
    if (!image) throw new Error(`Missing semantic tile ${name} at row ${oneBasedRow}, col ${oneBasedCol}.`);
    mapped[name] = image;
  }

  return mapped;
}

function composeDebugSheet(slices, grid, tileSize) {
  const sheet = composeSlices(slices, grid, tileSize);

  for (let i = 0; i <= grid; i += 1) {
    const pos = Math.min(i * tileSize, sheet.width - 1);
    drawLine(sheet, pos, 0, pos, sheet.height - 1, [255, 255, 255, 220]);
    drawLine(sheet, 0, pos, sheet.width - 1, pos, [255, 255, 255, 220]);
    if (pos + 1 < sheet.width) drawLine(sheet, pos + 1, 0, pos + 1, sheet.height - 1, [0, 0, 0, 160]);
    if (pos + 1 < sheet.height) drawLine(sheet, 0, pos + 1, sheet.width - 1, pos + 1, [0, 0, 0, 160]);
  }

  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      const label = `${row + 1},${col + 1}`;
      const x = col * tileSize + 6;
      const y = row * tileSize + 6;
      drawTinyText(sheet, label, x + 1, y + 1, 2, [0, 0, 0, 230]);
      drawTinyText(sheet, label, x, y, 2, [255, 255, 255, 255]);
    }
  }

  return sheet;
}

function composeSlices(slices, grid, tileSize) {
  const sheet = createPng(grid * tileSize, grid * tileSize);
  for (const slice of slices) {
    copyPixels(slice.image, sheet, 0, 0, slice.col * tileSize, slice.row * tileSize, tileSize, tileSize);
  }
  return sheet;
}

function createWaterGrid(widthTiles, heightTiles, tileSize, tiles) {
  const image = createPng(widthTiles * tileSize, heightTiles * tileSize);
  const grid = { image, widthTiles, heightTiles, tileSize };
  for (let y = 0; y < heightTiles; y += 1) {
    for (let x = 0; x < widthTiles; x += 1) {
      drawTile(grid, tiles.waterFill, x, y);
    }
  }
  return grid;
}

function placeIsland(grid, tiles, rect) {
  const coast = normalizeIslandRect(grid, rect);
  const grass = centeredGrassRect(coast, rect.grassWidth, rect.grassHeight);

  for (let y = coast.y + 1; y < coast.y + coast.height - 1; y += 1) {
    for (let x = coast.x + 1; x < coast.x + coast.width - 1; x += 1) {
      drawTile(grid, tiles.sandFill, x, y);
    }
  }

  drawPerimeter(grid, tiles, coast, "ws");
  drawPerimeter(grid, tiles, grass, "sg");

  for (let y = grass.y + 1; y < grass.y + grass.height - 1; y += 1) {
    for (let x = grass.x + 1; x < grass.x + grass.width - 1; x += 1) {
      drawTile(grid, tiles.grassFill, x, y);
    }
  }
}

function normalizeIslandRect(grid, rect) {
  const coast = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  };

  if (coast.width < 7 || coast.height < 7) {
    throw new Error(`Island coast rectangle must be at least 7x7 tiles, got ${coast.width}x${coast.height}.`);
  }

  if (coast.x < 0 || coast.y < 0 || coast.x + coast.width > grid.widthTiles || coast.y + coast.height > grid.heightTiles) {
    throw new Error(`Island coast rectangle ${JSON.stringify(coast)} exceeds ${grid.widthTiles}x${grid.heightTiles} canvas.`);
  }

  return coast;
}

function centeredGrassRect(coast, requestedWidth, requestedHeight) {
  const maxWidth = coast.width - 4;
  const maxHeight = coast.height - 4;
  const width = clamp(requestedWidth ?? maxWidth, 3, maxWidth);
  const height = clamp(requestedHeight ?? maxHeight, 3, maxHeight);
  const x = coast.x + Math.floor((coast.width - width) / 2);
  const y = coast.y + Math.floor((coast.height - height) / 2);

  if (x < coast.x + 2 || y < coast.y + 2 || x + width > coast.x + coast.width - 2 || y + height > coast.y + coast.height - 2) {
    throw new Error("Grass transition rectangle must leave at least one full sand tile between coast and grass.");
  }

  return { x, y, width, height };
}

function drawPerimeter(grid, tiles, rect, prefix) {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      const north = y === rect.y;
      const south = y === rect.y + rect.height - 1;
      const west = x === rect.x;
      const east = x === rect.x + rect.width - 1;
      if (!north && !south && !west && !east) continue;

      let suffix = "";
      if (north && west) suffix = "nw";
      else if (north && east) suffix = "ne";
      else if (south && west) suffix = "sw";
      else if (south && east) suffix = "se";
      else if (north) suffix = "n";
      else if (south) suffix = "s";
      else if (west) suffix = "w";
      else if (east) suffix = "e";

      drawTile(grid, tiles[`${prefix}_${suffix}`], x, y);
    }
  }
}

function drawTile(grid, tile, col, row) {
  if (!tile) throw new Error(`Missing tile while drawing at ${col},${row}.`);
  copyPixels(tile, grid.image, 0, 0, col * grid.tileSize, row * grid.tileSize, grid.tileSize, grid.tileSize);
}

function createArchipelago(tiles, tileSize, seed, requestedCount) {
  const rng = mulberry32(hashSeed(seed));
  const archipelago = createWaterGrid(40, 28, tileSize, tiles);
  const islandCount = clamp(requestedCount, 3, 5);
  const slots = [
    { x: 2, y: 2, maxWidth: 9, maxHeight: 8 },
    { x: 25, y: 3, maxWidth: 11, maxHeight: 8 },
    { x: 15, y: 12, maxWidth: 10, maxHeight: 10 },
    { x: 4, y: 19, maxWidth: 8, maxHeight: 7 },
    { x: 29, y: 19, maxWidth: 8, maxHeight: 7 }
  ];

  for (let i = 0; i < islandCount; i += 1) {
    const slot = slots[i];
    const width = randomInt(rng, 7, slot.maxWidth);
    const height = randomInt(rng, 7, slot.maxHeight);
    const x = slot.x + Math.floor((slot.maxWidth - width) / 2);
    const y = slot.y + Math.floor((slot.maxHeight - height) / 2);
    const grassWidth = randomInt(rng, 3, Math.max(3, width - 4));
    const grassHeight = randomInt(rng, 3, Math.max(3, height - 4));
    placeIsland(archipelago, tiles, { x, y, width, height, grassWidth, grassHeight });
  }

  return { image: archipelago.image, islandCount };
}

function createPng(width, height, fill = [0, 0, 0, 0]) {
  const image = new PNG({ width, height });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = fill[0];
    image.data[i + 1] = fill[1];
    image.data[i + 2] = fill[2];
    image.data[i + 3] = fill[3];
  }
  return image;
}

function clonePng(image) {
  const clone = createPng(image.width, image.height);
  image.data.copy(clone.data);
  return clone;
}

function copyPixels(source, target, sourceX, sourceY, targetX, targetY, width, height) {
  if (sourceX < 0 || sourceY < 0 || targetX < 0 || targetY < 0) {
    throw new Error("copyPixels received negative coordinates.");
  }
  if (sourceX + width > source.width || sourceY + height > source.height) {
    throw new Error("copyPixels source rectangle exceeds source image.");
  }
  if (targetX + width > target.width || targetY + height > target.height) {
    throw new Error("copyPixels target rectangle exceeds target image.");
  }

  for (let y = 0; y < height; y += 1) {
    const sourceOffset = ((sourceY + y) * source.width + sourceX) * 4;
    const targetOffset = ((targetY + y) * target.width + targetX) * 4;
    source.data.copy(target.data, targetOffset, sourceOffset, sourceOffset + width * 4);
  }
}

function resizeBilinear(source, width, height) {
  const target = createPng(width, height);
  const xRatio = source.width / width;
  const yRatio = source.height / height;

  for (let y = 0; y < height; y += 1) {
    const sourceY = (y + 0.5) * yRatio - 0.5;
    const y0 = clamp(Math.floor(sourceY), 0, source.height - 1);
    const y1 = clamp(y0 + 1, 0, source.height - 1);
    const yWeight = sourceY - y0;

    for (let x = 0; x < width; x += 1) {
      const sourceX = (x + 0.5) * xRatio - 0.5;
      const x0 = clamp(Math.floor(sourceX), 0, source.width - 1);
      const x1 = clamp(x0 + 1, 0, source.width - 1);
      const xWeight = sourceX - x0;
      const targetOffset = (y * width + x) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const top = lerp(pixelChannel(source, x0, y0, channel), pixelChannel(source, x1, y0, channel), xWeight);
        const bottom = lerp(pixelChannel(source, x0, y1, channel), pixelChannel(source, x1, y1, channel), xWeight);
        target.data[targetOffset + channel] = Math.round(lerp(top, bottom, yWeight));
      }
    }
  }

  return target;
}

function pixelChannel(image, x, y, channel) {
  return image.data[(y * image.width + x) * 4 + channel];
}

function drawLine(image, x0, y0, x1, y1, color) {
  if (x0 === x1) {
    for (let y = y0; y <= y1; y += 1) setPixel(image, x0, y, color);
    return;
  }
  if (y0 === y1) {
    for (let x = x0; x <= x1; x += 1) setPixel(image, x, y0, color);
    return;
  }
  throw new Error("drawLine only supports horizontal or vertical lines.");
}

function drawTinyText(image, text, x, y, scale, color) {
  let cursorX = x;
  for (const character of text) {
    const glyph = FONT_3X5[character];
    if (!glyph) {
      cursorX += 4 * scale;
      continue;
    }
    for (let gy = 0; gy < glyph.length; gy += 1) {
      for (let gx = 0; gx < glyph[gy].length; gx += 1) {
        if (glyph[gy][gx] !== "1") continue;
        fillRect(image, cursorX + gx * scale, y + gy * scale, scale, scale, color);
      }
    }
    cursorX += 4 * scale;
  }
}

function fillRect(image, x, y, width, height, color) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) setPixel(image, xx, yy, color);
  }
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * 4;
  image.data[offset] = color[0];
  image.data[offset + 1] = color[1];
  image.data[offset + 2] = color[2];
  image.data[offset + 3] = color[3];
}

function writeOutput(outputDir, fileName, image) {
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, PNG.sync.write(image));
  return filePath;
}

function samePixelData(a, b) {
  if (a.width !== b.width || a.height !== b.height || a.data.length !== b.data.length) return false;
  return Buffer.compare(a.data, b.data) === 0;
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng, min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return low + Math.floor(rng() * (high - low + 1));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
