import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PNG } = require("pngjs");

const DEFAULT_TILE = 128;
const DEFAULT_COUNT = 6;
const LEGACY_GRID = 9;
const THUMBNAIL_TILE_SIZE = 32;

const DIRECTIONS = [
  { bit: 1, dx: 0, dy: -1 },
  { bit: 2, dx: 1, dy: -1 },
  { bit: 4, dx: 1, dy: 0 },
  { bit: 8, dx: 1, dy: 1 },
  { bit: 16, dx: 0, dy: 1 },
  { bit: 32, dx: -1, dy: 1 },
  { bit: 64, dx: -1, dy: 0 },
  { bit: 128, dx: -1, dy: -1 }
];
const LEGACY_SEMANTIC_COORDS = {
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

const LEGACY_DIRECTIONAL_MASKS = {
  ws_n: 124,
  ws_ne: 112,
  ws_e: 241,
  ws_se: 193,
  ws_s: 199,
  ws_sw: 7,
  ws_w: 31,
  ws_nw: 28,
  sg_n: 124,
  sg_ne: 112,
  sg_e: 241,
  sg_se: 193,
  sg_s: 199,
  sg_sw: 7,
  sg_w: 31,
  sg_nw: 28
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

  if (!fs.existsSync(inputPath)) throw new Error(`Input file does not exist: ${inputPath}`);
  if (path.extname(inputPath).toLowerCase() === ".zip") {
    throw new Error("Zip input is not read directly. Extract the package and pass the PNG with --manifest <manifest.json>.");
  }

  const manifest = loadManifest(options.manifest, inputPath);
  const grid = options.grid ?? manifest?.grid?.columns ?? LEGACY_GRID;
  const rows = manifest?.grid?.rows ?? grid;
  const tile = options.tile ?? manifest?.grid?.tileSizePx ?? DEFAULT_TILE;
  const expectedWidth = grid * tile;
  const expectedHeight = rows * tile;

  if (grid !== rows) throw new Error(`Only square kernels are supported; got ${grid}x${rows}.`);
  fs.mkdirSync(outputDir, { recursive: true });

  const source = readPng(inputPath);
  validateSourceDimensions(source, expectedWidth, expectedHeight, options.resize);
  const normalized = source.width === expectedWidth && source.height === expectedHeight
    ? clonePng(source)
    : resizeBilinear(source, expectedWidth, expectedHeight);

  const slices = sliceKernel(normalized, grid, rows, tile, manifest);
  const sourceTiles = manifest ? buildManifestTileSource(slices, manifest) : buildLegacyTileSource(slices, grid);
  const renderStats = createRenderStats();

  const outputs = [];
  outputs.push(writeOutput(outputDir, "00_source_normalized.png", normalized));
  outputs.push(writeOutput(outputDir, "01_slices_debug.png", composeDebugSheet(slices, grid, rows, tile)));
  const recomposed = composeSlices(slices, grid, rows, tile);
  outputs.push(writeOutput(outputDir, "02_kernel_recomposed.png", recomposed));

  if (manifest) {
    outputs.push(writeOutput(outputDir, "03_single_island_manifest_shape.png", renderManifestShapePreview(sourceTiles, tile, manifest, renderStats)));
  } else {
    outputs.push(writeOutput(outputDir, "03_single_island_legacy_shape.png", renderPreview(sourceTiles, tile, 15, 15, [
      { centerX: 7.5, centerY: 7.6, radiusX: 4.55, radiusY: 4.15, grassScale: 0.43, seed: `${options.seed}:single` }
    ], renderStats)));
  }
  outputs.push(writeOutput(outputDir, "04_generated_island_medium.png", renderPreview(sourceTiles, tile, 21, 17, [
    { centerX: 10.5, centerY: 8.5, radiusX: 7.0, radiusY: 5.2, grassScale: 0.42, seed: `${options.seed}:medium` }
  ], renderStats)));
  outputs.push(writeOutput(outputDir, "05_generated_island_large.png", renderPreview(sourceTiles, tile, 33, 25, [
    { centerX: 16.6, centerY: 12.4, radiusX: 11.8, radiusY: 8.0, grassScale: 0.44, seed: `${options.seed}:large` }
  ], renderStats)));

  const archipelago = renderArchipelago(sourceTiles, tile, options.seed, options.count, renderStats);
  outputs.push(writeOutput(outputDir, "06_archipelago_preview.png", archipelago.image));
  outputs.push(writeOutput(outputDir, "07_thumbnail_preview.png", resizeNearest(
    archipelago.image,
    Math.round((archipelago.image.width / tile) * THUMBNAIL_TILE_SIZE),
    Math.round((archipelago.image.height / tile) * THUMBNAIL_TILE_SIZE)
  )));

  const recomposedMatches = samePixelData(normalized, recomposed);
  console.log("Island Kernel Lab");
  console.log(`Input: ${inputPath}`);
  console.log(`Manifest: ${manifest ? path.resolve(options.manifest || siblingManifestPath(inputPath)) : "<legacy 9x9 mapping>"}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Source dimensions: ${source.width}x${source.height}`);
  console.log(`Normalized dimensions: ${normalized.width}x${normalized.height}`);
  console.log(`Tile size: ${tile}x${tile}`);
  console.log(`Grid size: ${grid}x${rows}`);
  console.log(`Slices: ${slices.length}`);
  console.log(`Water-to-sand masks: ${sourceTiles.wsByMask.size}`);
  console.log(`Sand-to-grass masks: ${sourceTiles.sgByMask.size}`);
  console.log(`Seed: ${options.seed}`);
  console.log(`Requested preview count: ${options.count}`);
  console.log(`Archipelago islands: ${archipelago.islandCount}`);
  console.log("Preview renderer: organic masks + strict manifest-driven 8-neighbor autotiling");
  console.log(`Kernel recomposed pixel match: ${recomposedMatches ? "yes" : "no"}`);
  console.log(`Missing water-to-sand masks: ${formatMaskSet(renderStats.missingWs)}`);
  console.log(`Missing sand-to-grass masks: ${formatMaskSet(renderStats.missingSg)}`);
  if (renderStats.missingWs.size > 0 || renderStats.missingSg.size > 0) {
    console.log("WARNING: Generated previews contain magenta diagnostic tiles where this kernel package lacks the exact transition mask.");
    console.log("Preview status: FAILED for arbitrary generated islands. The source can be sliced/recomposed, but the package is not complete enough for these generated shapes.");
    process.exitCode = 1;
  }
  console.log("Generated output files:");
  for (const output of outputs) console.log(`- ${output}`);
}

function parseArgs(args) {
  const parsed = {
    input: "",
    manifest: "",
    out: "",
    grid: undefined,
    tile: undefined,
    resize: false,
    seed: "greenhaven-kernel-lab",
    count: DEFAULT_COUNT
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) throw new Error(`Unexpected positional argument: ${arg}`);
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
      case "manifest":
        parsed.manifest = value;
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

function loadManifest(manifestOption, inputPath) {
  const manifestPath = manifestOption ? path.resolve(manifestOption) : siblingManifestPath(inputPath);
  if (!manifestPath || !fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  validateManifest(manifest, manifestPath);
  return manifest;
}

function siblingManifestPath(inputPath) {
  const ext = path.extname(inputPath);
  const base = inputPath.slice(0, inputPath.length - ext.length);
  const direct = `${base}_manifest.json`;
  if (fs.existsSync(direct)) return direct;
  const compact = base.replace(/_v\d+$/i, "");
  const alternate = `${compact}_manifest.json`;
  return fs.existsSync(alternate) ? alternate : direct;
}

function validateManifest(manifest, manifestPath) {
  if (!manifest.grid || !Number.isInteger(manifest.grid.columns) || !Number.isInteger(manifest.grid.rows)) {
    throw new Error(`Manifest is missing grid columns/rows: ${manifestPath}`);
  }
  if (!Number.isInteger(manifest.grid.tileSizePx) || manifest.grid.tileSizePx <= 0) {
    throw new Error(`Manifest is missing a positive grid.tileSizePx: ${manifestPath}`);
  }
  if (!Array.isArray(manifest.layout) || manifest.layout.length !== manifest.grid.rows) {
    throw new Error(`Manifest layout row count does not match grid.rows in ${manifestPath}.`);
  }
  for (const row of manifest.layout) {
    if (!Array.isArray(row) || row.length !== manifest.grid.columns) {
      throw new Error(`Manifest layout columns do not match grid.columns in ${manifestPath}.`);
    }
  }
}

function validateSourceDimensions(source, expectedWidth, expectedHeight, resizeRequested) {
  if (source.width !== source.height) throw new Error(`Input image must be square, got ${source.width}x${source.height}.`);
  if (!resizeRequested && (source.width !== expectedWidth || source.height !== expectedHeight)) {
    throw new Error(
      `Input image must be ${expectedWidth}x${expectedHeight}; got ${source.width}x${source.height}. ` +
      "Pass --resize to normalize square generated images before slicing."
    );
  }
}

function sliceKernel(image, columns, rows, tileSize, manifest) {
  if (image.width !== columns * tileSize || image.height !== rows * tileSize) {
    throw new Error(`Cannot slice ${image.width}x${image.height} into ${columns}x${rows} tiles of ${tileSize}px.`);
  }

  const slices = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const tile = createPng(tileSize, tileSize);
      copyPixels(image, tile, col * tileSize, row * tileSize, 0, 0, tileSize, tileSize);
      slices.push({
        row,
        col,
        role: manifest?.layout?.[row]?.[col] ?? "",
        image: tile
      });
    }
  }

  if (slices.length !== columns * rows) throw new Error(`Expected ${columns * rows} slices, got ${slices.length}.`);
  return slices;
}

function buildManifestTileSource(slices, manifest) {
  const source = emptyTileSource();
  const fillCandidates = {
    water: [],
    sand_fill: [],
    grass_fill: []
  };

  for (const slice of slices) {
    const role = slice.role;
    const legend = manifest.roleLegend?.[role];
    const type = legend?.type ?? role;
    addRoleTile(source.rolesById, role, slice.image);
    if (type === "water" || role === "W") fillCandidates.water.push(slice);
    else if (type === "sand_fill" || role === "S_FILL") fillCandidates.sand_fill.push(slice);
    else if (type === "grass_fill" || role === "G_FILL") fillCandidates.grass_fill.push(slice);
    else if (type === "ws_transition" && Number.isInteger(legend.canonicalMask)) addMaskTile(source.wsByMask, legend.canonicalMask, slice.image);
    else if (type === "sg_transition" && Number.isInteger(legend.canonicalMask)) addMaskTile(source.sgByMask, legend.canonicalMask, slice.image);
  }

  source.waterFill = chooseFillTiles(fillCandidates.water, manifest, "water", { singleSafest: true });
  source.sandFill = chooseFillTiles(fillCandidates.sand_fill, manifest, "sand_fill");
  source.grassFill = chooseFillTiles(fillCandidates.grass_fill, manifest, "grass_fill");

  validateTileSource(source);
  return source;
}

function chooseFillTiles(candidates, manifest, type, options = {}) {
  const interior = candidates.filter((slice) => isInteriorManifestFill(manifest, slice.row, slice.col, type));
  const chosen = interior.length > 0 ? interior : candidates;
  if (options.singleSafest && chosen.length > 0) return [safestFillTile(chosen, manifest, type).image];
  return chosen.map((slice) => slice.image);
}

function safestFillTile(candidates, manifest, type) {
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = distanceToDifferentManifestType(manifest, candidate.row, candidate.col, type);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function distanceToDifferentManifestType(manifest, row, col, type) {
  const maxRadius = Math.max(manifest.grid.columns, manifest.grid.rows);
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let y = row - radius; y <= row + radius; y += 1) {
      for (let x = col - radius; x <= col + radius; x += 1) {
        if (Math.max(Math.abs(y - row), Math.abs(x - col)) !== radius) continue;
        if (manifestTypeAt(manifest, y, x) && manifestTypeAt(manifest, y, x) !== type) return radius;
      }
    }
  }
  return maxRadius + 1;
}

function isInteriorManifestFill(manifest, row, col, type) {
  for (let y = row - 1; y <= row + 1; y += 1) {
    for (let x = col - 1; x <= col + 1; x += 1) {
      if (y === row && x === col) continue;
      if (manifestTypeAt(manifest, y, x) !== type) return false;
    }
  }
  return true;
}

function manifestTypeAt(manifest, row, col) {
  const role = manifest.layout?.[row]?.[col];
  if (!role) return "";
  return manifest.roleLegend?.[role]?.type ?? role;
}

function buildLegacyTileSource(slices, grid) {
  if (grid !== LEGACY_GRID) throw new Error("A manifest is required for non-legacy kernels.");
  const byCoord = new Map(slices.map((slice) => [`${slice.row + 1},${slice.col + 1}`, slice.image]));
  const source = emptyTileSource();
  source.waterFill.push(tileAt(byCoord, LEGACY_SEMANTIC_COORDS.waterFill, "waterFill"));
  source.sandFill.push(tileAt(byCoord, LEGACY_SEMANTIC_COORDS.sandFill, "sandFill"));
  source.grassFill.push(tileAt(byCoord, LEGACY_SEMANTIC_COORDS.grassFill, "grassFill"));
  for (const [key, mask] of Object.entries(LEGACY_DIRECTIONAL_MASKS)) {
    const coord = LEGACY_SEMANTIC_COORDS[key];
    if (!coord) continue;
    addMaskTile(key.startsWith("ws_") ? source.wsByMask : source.sgByMask, mask, tileAt(byCoord, coord, key));
  }
  validateTileSource(source);
  return source;
}

function emptyTileSource() {
  return {
    rolesById: new Map(),
    waterFill: [],
    sandFill: [],
    grassFill: [],
    wsByMask: new Map(),
    sgByMask: new Map()
  };
}

function validateTileSource(source) {
  if (source.waterFill.length === 0) throw new Error("Kernel has no water fill tiles.");
  if (source.sandFill.length === 0) throw new Error("Kernel has no sand fill tiles.");
  if (source.grassFill.length === 0) throw new Error("Kernel has no grass fill tiles.");
  if (source.wsByMask.size === 0) throw new Error("Kernel has no water-to-sand transition masks.");
  if (source.sgByMask.size === 0) throw new Error("Kernel has no sand-to-grass transition masks.");
}

function addRoleTile(map, role, tile) {
  if (!map.has(role)) map.set(role, []);
  map.get(role).push(tile);
}

function addMaskTile(map, mask, tile) {
  if (!map.has(mask)) map.set(mask, []);
  map.get(mask).push(tile);
}

function tileAt(byCoord, coord, name) {
  const tile = byCoord.get(`${coord[0]},${coord[1]}`);
  if (!tile) throw new Error(`Missing legacy semantic tile ${name} at row ${coord[0]}, col ${coord[1]}.`);
  return tile;
}

function createRenderStats() {
  return {
    missingWs: new Set(),
    missingSg: new Set()
  };
}

function renderPreview(source, tileSize, widthTiles, heightTiles, islandSpecs, stats = createRenderStats()) {
  const canvas = createTileCanvas(widthTiles, heightTiles, tileSize, source);
  for (const spec of islandSpecs) {
    const landMask = createOrganicMask(widthTiles, heightTiles, spec, `${spec.seed}:land`);
    const landDistance = computeDistanceFromEdge(landMask);
    const grassMask = createGrassMask(landMask, landDistance, spec, `${spec.seed}:grass`);
    drawAutotiledIsland(canvas, source, landMask, grassMask, stats);
  }
  return canvas.image;
}

function renderArchipelago(source, tileSize, seed, requestedCount, stats = createRenderStats()) {
  const rng = mulberry32(hashSeed(seed));
  const islandCount = clamp(requestedCount, 3, 5);
  const slots = [
    { centerX: 7.0, centerY: 5.6, radiusX: 3.8, radiusY: 2.9 },
    { centerX: 30.5, centerY: 6.4, radiusX: 4.5, radiusY: 3.0 },
    { centerX: 20.4, centerY: 14.2, radiusX: 4.0, radiusY: 3.4 },
    { centerX: 8.4, centerY: 22.1, radiusX: 3.4, radiusY: 2.6 },
    { centerX: 31.4, centerY: 22.0, radiusX: 3.5, radiusY: 2.7 }
  ];
  const islands = [];

  for (let i = 0; i < islandCount; i += 1) {
    const slot = slots[i];
    islands.push({
      centerX: slot.centerX + randomRange(rng, -0.45, 0.45),
      centerY: slot.centerY + randomRange(rng, -0.35, 0.35),
      radiusX: slot.radiusX * randomRange(rng, 0.88, 1.15),
      radiusY: slot.radiusY * randomRange(rng, 0.88, 1.15),
      grassScale: randomRange(rng, 0.34, 0.46),
      seed: `${seed}:archipelago:${i}`
    });
  }

  return {
    image: renderPreview(source, tileSize, 40, 28, islands, stats),
    islandCount
  };
}

function renderManifestShapePreview(source, tileSize, manifest, stats = createRenderStats()) {
  const widthTiles = manifest.grid.columns;
  const heightTiles = manifest.grid.rows;
  const canvas = createTileCanvas(widthTiles, heightTiles, tileSize, source);
  const landMask = createBooleanGrid(widthTiles, heightTiles, false);
  const grassMask = createBooleanGrid(widthTiles, heightTiles, false);

  for (let y = 0; y < heightTiles; y += 1) {
    for (let x = 0; x < widthTiles; x += 1) {
      const type = manifestTypeAt(manifest, y, x);
      landMask[y][x] = type !== "water" && type !== "";
      grassMask[y][x] = type === "sg_transition" || type === "grass_fill";
    }
  }

  drawAutotiledIsland(canvas, source, landMask, grassMask, stats);
  return canvas.image;
}

function createTileCanvas(widthTiles, heightTiles, tileSize, source) {
  const image = createPng(widthTiles * tileSize, heightTiles * tileSize);
  const canvas = { image, widthTiles, heightTiles, tileSize };
  for (let y = 0; y < heightTiles; y += 1) {
    for (let x = 0; x < widthTiles; x += 1) drawVariantTile(canvas, source.waterFill, x, y, "water");
  }
  return canvas;
}

function drawAutotiledIsland(canvas, source, landMask, grassMask, stats) {
  for (let y = 0; y < canvas.heightTiles; y += 1) {
    for (let x = 0; x < canvas.widthTiles; x += 1) {
      if (!landMask[y][x]) continue;
      if (grassMask[y][x]) continue;
      const mask = canonicalNeighborMask(landMask, x, y);
      if (mask === 255) {
        drawVariantTile(canvas, source.sandFill, x, y, `sand:${mask}`);
      } else if (source.wsByMask.has(mask)) {
        drawVariantTile(canvas, source.wsByMask.get(mask), x, y, `sand:${mask}`);
      } else {
        stats.missingWs.add(mask);
        drawMissingMaskTile(canvas, x, y, mask);
      }
    }
  }

  for (let y = 0; y < canvas.heightTiles; y += 1) {
    for (let x = 0; x < canvas.widthTiles; x += 1) {
      if (!grassMask[y][x]) continue;
      const mask = canonicalNeighborMask(grassMask, x, y);
      if (mask === 255) {
        drawVariantTile(canvas, source.grassFill, x, y, `grass:${mask}`);
      } else if (source.sgByMask.has(mask)) {
        drawVariantTile(canvas, source.sgByMask.get(mask), x, y, `grass:${mask}`);
      } else {
        stats.missingSg.add(mask);
        drawMissingMaskTile(canvas, x, y, mask);
      }
    }
  }
}

function createOrganicMask(width, height, spec, seed) {
  const rng = mulberry32(hashSeed(seed));
  const mask = createBooleanGrid(width, height, false);
  const phaseA = randomRange(rng, 0, Math.PI * 2);
  const phaseB = randomRange(rng, 0, Math.PI * 2);
  const phaseC = randomRange(rng, 0, Math.PI * 2);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = x + 0.5;
      const py = y + 0.5;
      const dx = (px - spec.centerX) / spec.radiusX;
      const dy = (py - spec.centerY) / spec.radiusY;
      const angle = Math.atan2(dy, dx);
      const wobble =
        Math.sin(angle * 2 + phaseA) * 0.12 +
        Math.sin(angle * 3 + phaseB) * 0.09 +
        Math.sin(angle * 5 + phaseC) * 0.05 +
        (randomCellValue(x, y, phaseA) - 0.5) * 0.12;
      mask[y][x] = Math.sqrt(dx * dx + dy * dy) <= 1 + wobble;
    }
  }

  for (let i = 0; i < 3; i += 1) smoothMask(mask);
  return keepLargestComponent(mask);
}

function createGrassMask(landMask, landDistance, spec, seed) {
  const height = landMask.length;
  const width = landMask[0].length;
  const scale = spec.grassScale ?? 0.42;
  const rng = mulberry32(hashSeed(seed));
  const grassSpec = {
    centerX: spec.centerX + randomRange(rng, -0.3, 0.3),
    centerY: spec.centerY + randomRange(rng, -0.25, 0.25),
    radiusX: spec.radiusX * randomRange(rng, scale * 0.82, scale * 1.18),
    radiusY: spec.radiusY * randomRange(rng, scale * 0.82, scale * 1.18)
  };
  const rawGrass = createOrganicMask(width, height, grassSpec, seed);
  const grass = createBooleanGrid(width, height, false);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      grass[y][x] = rawGrass[y][x] && landMask[y][x] && landDistance[y][x] >= 3;
    }
  }

  const kept = polishInnerMask(keepLargestComponent(grass), landDistance, 3);
  if (countTrue(kept) >= 3) return kept;

  const fallback = createBooleanGrid(width, height, false);
  let best = { x: Math.floor(spec.centerX), y: Math.floor(spec.centerY), distance: -1 };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (landDistance[y][x] > best.distance) best = { x, y, distance: landDistance[y][x] };
    }
  }
  for (let y = best.y - 1; y <= best.y + 1; y += 1) {
    for (let x = best.x - 1; x <= best.x + 1; x += 1) {
      if (landDistance[y]?.[x] >= 3) fallback[y][x] = true;
    }
  }
  return fallback;
}

function polishInnerMask(mask, distance, minimumDistance) {
  let current = cloneBooleanGrid(mask);
  for (let i = 0; i < 2; i += 1) {
    const next = cloneBooleanGrid(current);
    for (let y = 0; y < current.length; y += 1) {
      for (let x = 0; x < current[0].length; x += 1) {
        const cardinalCount = countCardinalLand(current, x, y);
        if (current[y][x] && (distance[y][x] < minimumDistance || cardinalCount < 2)) next[y][x] = false;
        if (!current[y][x] && distance[y][x] >= minimumDistance && cardinalCount >= 3 && countNeighborLand(current, x, y) >= 5) {
          next[y][x] = true;
        }
      }
    }
    current = keepLargestComponent(next);
  }
  return current;
}

function smoothMask(mask) {
  const height = mask.length;
  const width = mask[0].length;
  const next = cloneBooleanGrid(mask);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const neighbors = countNeighborLand(mask, x, y);
      if (mask[y][x] && neighbors <= 1) next[y][x] = false;
      if (!mask[y][x] && neighbors >= 7) next[y][x] = true;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) mask[y][x] = next[y][x];
  }
}

function computeDistanceFromEdge(mask) {
  const height = mask.length;
  const width = mask[0].length;
  const distances = Array.from({ length: height }, () => Array.from({ length: width }, () => 0));
  const queue = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y][x]) continue;
      if (hasOutsideNeighbor(mask, x, y)) {
        distances[y][x] = 1;
        queue.push({ x, y });
      }
    }
  }

  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head];
    for (const next of cardinalNeighbors(current.x, current.y)) {
      if (!mask[next.y]?.[next.x] || distances[next.y][next.x] !== 0) continue;
      distances[next.y][next.x] = distances[current.y][current.x] + 1;
      queue.push(next);
    }
  }

  return distances;
}

function neighborMask(mask, x, y) {
  let value = 0;
  for (const dir of DIRECTIONS) {
    if (mask[y + dir.dy]?.[x + dir.dx]) value |= dir.bit;
  }
  return value;
}

function canonicalNeighborMask(mask, x, y) {
  const raw = neighborMask(mask, x, y);
  let canonical = raw & (1 | 4 | 16 | 64);
  if ((raw & 2) && (raw & 1) && (raw & 4)) canonical |= 2;
  if ((raw & 8) && (raw & 4) && (raw & 16)) canonical |= 8;
  if ((raw & 32) && (raw & 16) && (raw & 64)) canonical |= 32;
  if ((raw & 128) && (raw & 64) && (raw & 1)) canonical |= 128;
  return canonical;
}

function createBooleanGrid(width, height, value) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => value));
}

function cloneBooleanGrid(grid) {
  return grid.map((row) => row.slice());
}

function countNeighborLand(mask, x, y) {
  let count = 0;
  for (let yy = y - 1; yy <= y + 1; yy += 1) {
    for (let xx = x - 1; xx <= x + 1; xx += 1) {
      if (xx === x && yy === y) continue;
      if (mask[yy]?.[xx]) count += 1;
    }
  }
  return count;
}

function countCardinalLand(mask, x, y) {
  let count = 0;
  for (const neighbor of cardinalNeighbors(x, y)) {
    if (mask[neighbor.y]?.[neighbor.x]) count += 1;
  }
  return count;
}

function keepLargestComponent(mask) {
  const height = mask.length;
  const width = mask[0].length;
  const seen = createBooleanGrid(width, height, false);
  let largest = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y][x] || seen[y][x]) continue;
      const component = [];
      const queue = [{ x, y }];
      seen[y][x] = true;
      for (let head = 0; head < queue.length; head += 1) {
        const current = queue[head];
        component.push(current);
        for (const next of cardinalNeighbors(current.x, current.y)) {
          if (!mask[next.y]?.[next.x] || seen[next.y][next.x]) continue;
          seen[next.y][next.x] = true;
          queue.push(next);
        }
      }
      if (component.length > largest.length) largest = component;
    }
  }

  const cleaned = createBooleanGrid(width, height, false);
  for (const cell of largest) cleaned[cell.y][cell.x] = true;
  return cleaned;
}

function hasOutsideNeighbor(mask, x, y) {
  return cardinalNeighbors(x, y).some((neighbor) => !mask[neighbor.y]?.[neighbor.x]);
}

function cardinalNeighbors(x, y) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y }
  ];
}

function countTrue(mask) {
  let count = 0;
  for (const row of mask) {
    for (const value of row) if (value) count += 1;
  }
  return count;
}

function drawVariantTile(canvas, variants, col, row, salt) {
  drawTile(canvas, chooseVariant(variants, col, row, salt), col, row);
}

function chooseVariant(variants, x, y, salt) {
  if (!Array.isArray(variants) || variants.length === 0) throw new Error(`Missing tile variants for ${salt}.`);
  return variants[hashSeed(`${salt}:${x}:${y}`) % variants.length];
}

function drawTile(canvas, tile, col, row) {
  copyPixels(tile, canvas.image, 0, 0, col * canvas.tileSize, row * canvas.tileSize, canvas.tileSize, canvas.tileSize);
}

function drawMissingMaskTile(canvas, col, row, mask) {
  const x = col * canvas.tileSize;
  const y = row * canvas.tileSize;
  fillRect(canvas.image, x, y, canvas.tileSize, canvas.tileSize, [228, 0, 170, 255]);
  const block = Math.max(8, Math.floor(canvas.tileSize / 8));
  for (let yy = 0; yy < canvas.tileSize; yy += block) {
    for (let xx = 0; xx < canvas.tileSize; xx += block) {
      const checker = ((xx / block) + (yy / block)) % 2 === 0;
      if (checker) fillRect(canvas.image, x + xx, y + yy, block, block, [40, 0, 40, 255]);
    }
  }
  const label = String(mask);
  drawTinyText(canvas.image, label, x + 6, y + 6, 3, [255, 255, 255, 255]);
}

function composeDebugSheet(slices, columns, rows, tileSize) {
  const sheet = composeSlices(slices, columns, rows, tileSize);
  for (let x = 0; x <= columns; x += 1) {
    const pos = Math.min(x * tileSize, sheet.width - 1);
    drawLine(sheet, pos, 0, pos, sheet.height - 1, [255, 255, 255, 220]);
    if (pos + 1 < sheet.width) drawLine(sheet, pos + 1, 0, pos + 1, sheet.height - 1, [0, 0, 0, 150]);
  }
  for (let y = 0; y <= rows; y += 1) {
    const pos = Math.min(y * tileSize, sheet.height - 1);
    drawLine(sheet, 0, pos, sheet.width - 1, pos, [255, 255, 255, 220]);
    if (pos + 1 < sheet.height) drawLine(sheet, 0, pos + 1, sheet.width - 1, pos + 1, [0, 0, 0, 150]);
  }
  for (const slice of slices) {
    const label = `${slice.row + 1},${slice.col + 1}`;
    const x = slice.col * tileSize + 6;
    const y = slice.row * tileSize + 6;
    drawTinyText(sheet, label, x + 1, y + 1, 2, [0, 0, 0, 230]);
    drawTinyText(sheet, label, x, y, 2, [255, 255, 255, 255]);
  }
  return sheet;
}

function composeSlices(slices, columns, rows, tileSize) {
  const sheet = createPng(columns * tileSize, rows * tileSize);
  for (const slice of slices) {
    copyPixels(slice.image, sheet, 0, 0, slice.col * tileSize, slice.row * tileSize, tileSize, tileSize);
  }
  return sheet;
}

function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  try {
    return PNG.sync.read(buffer);
  } catch (error) {
    throw new Error(`Could not read PNG input ${filePath}: ${error.message}`);
  }
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
  if (sourceX < 0 || sourceY < 0 || targetX < 0 || targetY < 0) throw new Error("copyPixels received negative coordinates.");
  if (sourceX + width > source.width || sourceY + height > source.height) throw new Error("copyPixels source rectangle exceeds source image.");
  if (targetX + width > target.width || targetY + height > target.height) throw new Error("copyPixels target rectangle exceeds target image.");
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

function resizeNearest(source, width, height) {
  const target = createPng(width, height);
  const xRatio = source.width / width;
  const yRatio = source.height / height;
  for (let y = 0; y < height; y += 1) {
    const sourceY = clamp(Math.floor(y * yRatio), 0, source.height - 1);
    for (let x = 0; x < width; x += 1) {
      const sourceX = clamp(Math.floor(x * xRatio), 0, source.width - 1);
      const sourceOffset = (sourceY * source.width + sourceX) * 4;
      const targetOffset = (y * width + x) * 4;
      target.data[targetOffset] = source.data[sourceOffset];
      target.data[targetOffset + 1] = source.data[sourceOffset + 1];
      target.data[targetOffset + 2] = source.data[sourceOffset + 2];
      target.data[targetOffset + 3] = source.data[sourceOffset + 3];
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

function formatMaskSet(maskSet) {
  if (maskSet.size === 0) return "none";
  return [...maskSet].sort((a, b) => a - b).join(", ");
}

function parsePositiveInteger(value, name) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) throw new Error(`${name} must be a positive integer, got ${value}.`);
  return numberValue;
}

function parseBoolean(value, name) {
  if (value === "true" || value === "1" || value === "yes") return true;
  if (value === "false" || value === "0" || value === "no") return false;
  throw new Error(`${name} must be a boolean when a value is supplied, got ${value}.`);
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

function randomRange(rng, min, max) {
  return min + rng() * (max - min);
}

function randomCellValue(x, y, salt) {
  const raw = Math.sin(x * 127.1 + y * 311.7 + salt * 17.13) * 43758.5453123;
  return raw - Math.floor(raw);
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
