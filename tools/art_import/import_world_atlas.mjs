import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const SOURCE_ATLAS = "C:/Users/Marku/Downloads/master_overworld_tileset_atlas_10x10.png";
const OUTPUT_DIR = path.join(PROJECT_ROOT, "src", "assets", "world");
const SOURCE_COPY_DIR = path.join(OUTPUT_DIR, "source");
const REPORT_DIR = path.join(PROJECT_ROOT, "docs", "debug", "world-atlas");
const DATA_OUTPUT = path.join(PROJECT_ROOT, "src", "data", "worldTiles.ts");
const RUNTIME_ATLAS_FILENAME = "world_atlas.normalized.png";
const SOURCE_COPY_FILENAME = "master_overworld_tileset_atlas_10x10.png";
const LABELED_PREVIEW_FILENAME = "world_atlas.labeled-preview.png";

const COLUMNS = 10;
const ROWS = 10;

const TILE_ROWS = [
  row("grassland / meadow", [
    tile("bright_grass", "grassland", "plains", true, 1, ["grass", "land"]),
    tile("medium_grass", "grassland", "plains", true, 1, ["grass", "land"]),
    tile("dark_grass", "grassland", "plains", true, 1, ["grass", "land"]),
    tile("flower_meadow", "grassland", "plains", true, 1, ["grass", "flowers", "land"]),
    tile("clover_lush_grass", "grassland", "plains", true, 1, ["grass", "lush", "land"]),
    tile("trampled_grass", "grassland", "plains", true, 1, ["grass", "worn", "land"]),
    tile("weeds_grass", "grassland", "plains", true, 1.1, ["grass", "weeds", "land"]),
    tile("dirt_patch", "grassland", "plains", true, 1, ["dirt", "grass", "land"]),
    tile("grass_stones", "grassland", "plains", true, 1.2, ["grass", "rocks", "land"]),
    tile("fertile_field_grass", "grassland", "plains", true, 1, ["grass", "field", "land"])
  ]),
  row("woodland / forest", [
    tile("forest_floor", "forest", "forest", true, 1.4, ["forest", "land"]),
    tile("dark_forest_floor", "forest", "forest", true, 1.6, ["forest", "dark", "land"]),
    tile("mossy_forest_ground", "forest", "forest", true, 1.4, ["forest", "moss", "land"]),
    tile("dense_leafy_woodland", "forest", "forest", true, 2.1, ["forest", "dense", "land"]),
    tile("bush_hedge", "forest", "forest", true, 1.8, ["forest", "bush", "land"]),
    tile("tree_covered_green", "forest", "forest", true, 2.2, ["forest", "dense", "land"]),
    tile("rooty_forest_earth", "forest", "forest", true, 1.7, ["forest", "roots", "land"]),
    tile("autumn_woodland", "forest", "forest", true, 1.5, ["forest", "autumn", "land"]),
    tile("enchanted_forest_ground", "forest", "forest", true, 1.5, ["forest", "magic", "land"]),
    tile("forest_path", "forest", "road", true, 0.75, ["forest", "road", "path", "land"])
  ]),
  row("desert / dryland", [
    tile("bright_sand", "desert", "sand", true, 1.35, ["sand", "desert", "land"]),
    tile("golden_sand", "desert", "sand", true, 1.35, ["sand", "desert", "land"]),
    tile("dune_sand", "desert", "sand", true, 1.55, ["sand", "desert", "dune", "land"]),
    tile("rocky_sand", "desert", "sand", true, 1.65, ["sand", "desert", "rocks", "land"]),
    tile("cracked_dry_earth", "desert", "sand", true, 1.45, ["desert", "dry", "land"]),
    tile("reddish_desert_soil", "desert", "sand", true, 1.45, ["desert", "red", "land"]),
    tile("cactus_scrub", "desert", "sand", true, 1.8, ["desert", "scrub", "land"]),
    tile("oasis_edge", "desert", "sand", true, 1.3, ["desert", "oasis", "shore", "land"]),
    tile("sandstone_floor", "desert", "sand", true, 1.2, ["desert", "stone", "land"]),
    tile("desert_path", "desert", "road", true, 0.85, ["desert", "road", "path", "land"])
  ]),
  row("snow / ice", [
    tile("clean_snow", "snow", "hills", true, 1.45, ["snow", "land"]),
    tile("packed_snow", "snow", "hills", true, 1.3, ["snow", "packed", "land"]),
    tile("icy_snow", "snow", "hills", true, 1.55, ["snow", "ice", "land"]),
    tile("frozen_ground", "snow", "hills", true, 1.5, ["snow", "frozen", "land"]),
    tile("frosty_sparkle_snow", "snow", "hills", true, 1.45, ["snow", "sparkle", "land"]),
    tile("snow_rock", "snow", "hills", true, 1.9, ["snow", "rocks", "land"]),
    tile("frozen_lake_ice", "snow", "water", false, 99, ["water", "ice"], "Blocked ice by current movement rules."),
    tile("cracked_ice", "snow", "water", false, 99, ["water", "ice", "cracked"], "Blocked ice by current movement rules."),
    tile("glacier_ice", "snow", "water", false, 99, ["water", "ice", "glacier"], "Blocked ice by current movement rules."),
    tile("snowy_path", "snow", "road", true, 0.9, ["snow", "road", "path", "land"])
  ]),
  row("darkland / swamp / cursed land", [
    tile("dark_grassland", "darkland", "final", true, 1.5, ["darkland", "grass", "land"]),
    tile("dead_earth", "darkland", "final", true, 1.45, ["darkland", "dead", "land"]),
    tile("muddy_swamp", "darkland", "final", true, 1.9, ["darkland", "swamp", "mud", "land"]),
    tile("boggy_wetland", "darkland", "final", true, 2.1, ["darkland", "swamp", "bog", "land"]),
    tile("toxic_marsh", "darkland", "water", false, 99, ["water", "toxic", "swamp"], "Blocked toxic water."),
    tile("ash_ground", "darkland", "final", true, 1.55, ["darkland", "ash", "land"]),
    tile("cursed_purple_soil", "darkland", "final", true, 1.6, ["darkland", "cursed", "land"]),
    tile("blackened_wasteland", "darkland", "final", true, 1.7, ["darkland", "wasteland", "land"]),
    tile("sickly_corrupted_ground", "darkland", "final", true, 1.8, ["darkland", "corrupt", "land"]),
    tile("haunted_dead_forest_floor", "darkland", "final", true, 1.9, ["darkland", "forest", "land"])
  ]),
  row("water / shore / bridge", [
    tile("deep_ocean_water", "water", "water", false, 99, ["water", "ocean", "deep"]),
    tile("light_water", "water", "water", false, 99, ["water"]),
    tile("river_water", "water", "water", false, 99, ["water", "river"]),
    tile("shallow_water", "water", "water", false, 99, ["water", "shallow"]),
    tile("swamp_water", "water", "water", false, 99, ["water", "swamp"]),
    tile("beach_shore", "water", "road", true, 1.15, ["shore", "beach", "land"]),
    tile("wooden_bridge_horizontal", "water", "road", true, 0.7, ["bridge", "road", "land"]),
    tile("wooden_bridge_vertical", "water", "road", true, 0.7, ["bridge", "road", "land"]),
    tile("stone_bridge_horizontal", "water", "road", true, 0.65, ["bridge", "road", "land"]),
    tile("stone_bridge_vertical", "water", "road", true, 0.65, ["bridge", "road", "land"])
  ]),
  row("mountain / hill / rock / cliff", [
    tile("rocky_hill_ground", "mountain", "hills", true, 2.1, ["rock", "hill", "land"]),
    tile("mountain_foothill", "mountain", "hills", true, 2.4, ["mountain", "foothill", "land"]),
    tile("dark_mountain_ground", "mountain", "hills", false, 99, ["mountain", "blocked"]),
    tile("gravel_stone_ground", "mountain", "hills", true, 1.8, ["rock", "gravel", "land"]),
    tile("cliff_top_rock", "mountain", "hills", false, 99, ["cliff", "blocked"]),
    tile("canyon_stone", "mountain", "hills", false, 99, ["canyon", "cliff", "blocked"]),
    tile("mossy_rock", "mountain", "hills", true, 2, ["rock", "moss", "land"]),
    tile("volcanic_stone", "mountain", "final", false, 99, ["lava", "volcanic", "blocked"]),
    tile("crystal_rock", "mountain", "hills", false, 99, ["crystal", "blocked"]),
    tile("cave_rock_entrance", "mountain", "hills", false, 99, ["cave", "entrance", "blocked"], "Blocked unless a POI trigger overlays it.")
  ]),
  row("road / special / extra biomes", [
    tile("dirt_road", "road", "road", true, 0.65, ["road", "land"]),
    tile("worn_path", "road", "road", true, 0.75, ["road", "path", "land"]),
    tile("cobblestone_road", "road", "road", true, 0.55, ["road", "stone", "land"]),
    tile("ancient_ruin_floor", "road", "road", true, 0.9, ["road", "ruin", "land"]),
    tile("lava_cracked_ground", "road", "final", false, 99, ["lava", "blocked"]),
    tile("tropical_lush_ground", "road", "plains", true, 1.2, ["grass", "tropical", "land"]),
    tile("tropical_beach_sand", "road", "sand", true, 1.15, ["beach", "tropical", "land"]),
    tile("magical_crystal_field", "road", "final", true, 1.6, ["magic", "crystal", "land"]),
    tile("graveyard_earth", "road", "final", true, 1.45, ["darkland", "graveyard", "land"]),
    tile("mixed_utility_terrain", "road", "road", true, 1.3, ["mixed", "land"])
  ]),
  row("transitions / edges / natural blends", [
    tile("grass_to_dirt_transition", "transition", "plains", true, 1.05, ["grass", "dirt", "transition", "land"]),
    tile("grass_to_forest_transition", "transition", "forest", true, 1.2, ["grass", "forest", "transition", "land"]),
    tile("grass_to_sand_transition", "transition", "sand", true, 1.15, ["grass", "sand", "transition", "land"]),
    tile("grass_to_snow_transition", "transition", "hills", true, 1.2, ["grass", "snow", "transition", "land"]),
    tile("grass_to_darkland_transition", "transition", "final", true, 1.25, ["grass", "darkland", "transition", "land"]),
    tile("beach_to_water_transition", "transition", "water", true, 1.15, ["shore", "beach", "transition", "land"]),
    tile("rocky_shore_to_water_transition", "transition", "water", true, 1.25, ["shore", "rock", "transition", "land"]),
    tile("riverbank_grass_edge", "transition", "plains", true, 1.1, ["riverbank", "grass", "transition", "land"]),
    tile("riverbank_dirt_edge", "transition", "plains", true, 1.1, ["riverbank", "dirt", "transition", "land"]),
    tile("snow_to_ice_transition", "transition", "hills", true, 1.25, ["snow", "ice", "transition", "land"])
  ]),
  row("roads / rivers / connectors / map utility", [
    tile("dirt_road_horizontal", "road", "road", true, 0.6, ["road", "connector", "horizontal", "land"]),
    tile("dirt_road_vertical", "road", "road", true, 0.6, ["road", "connector", "vertical", "land"]),
    tile("dirt_road_corner", "road", "road", true, 0.65, ["road", "connector", "corner", "land"]),
    tile("dirt_road_t_junction", "road", "road", true, 0.6, ["road", "connector", "junction", "land"]),
    tile("dirt_road_crossroads", "road", "road", true, 0.55, ["road", "connector", "crossroads", "land"]),
    tile("river_straight", "water", "water", false, 99, ["water", "river", "connector"]),
    tile("river_bend", "water", "water", false, 99, ["water", "river", "connector"]),
    tile("river_t_junction", "water", "water", false, 99, ["water", "river", "connector", "junction"]),
    tile("shallow_ford_stepping_stones", "road", "road", true, 0.9, ["ford", "river", "road", "land"]),
    tile("ruined_stone_entrance_ground", "road", "road", true, 1, ["ruin", "entrance", "land"])
  ])
].map((rowData, rowIndex) => ({ ...rowData, row: rowIndex }));

function row(family, tiles) {
  return { family, tiles };
}

function tile(id, biome, encounterFamily, walkable, movementCost, tags, notes) {
  return { id, biome, encounterFamily, walkable, movementCost, tags, notes };
}

function main() {
  ensureDir(SOURCE_COPY_DIR);
  ensureDir(OUTPUT_DIR);
  ensureDir(REPORT_DIR);
  ensureDir(path.dirname(DATA_OUTPUT));
  if (!fs.existsSync(SOURCE_ATLAS)) throw new Error(`Missing source atlas: ${SOURCE_ATLAS}`);

  const sourceImage = readPng(SOURCE_ATLAS);
  const { tileWidth, tileHeight } = assertAtlasGrid(sourceImage);
  const sourceHash = fileHash(SOURCE_ATLAS);

  const copiedSource = path.join(SOURCE_COPY_DIR, SOURCE_COPY_FILENAME);
  const runtimeAtlas = path.join(OUTPUT_DIR, RUNTIME_ATLAS_FILENAME);
  removeStaleSources();
  fs.copyFileSync(SOURCE_ATLAS, copiedSource);
  fs.copyFileSync(SOURCE_ATLAS, runtimeAtlas);

  const runtimeImage = readPng(runtimeAtlas);
  assertAtlasGrid(runtimeImage);

  const cells = buildCells(tileWidth, tileHeight);
  const labeledPreview = cloneImage(sourceImage);
  for (const cell of cells) {
    drawRect(labeledPreview, cell.sourceRect.x, cell.sourceRect.y, tileWidth - 1, tileHeight - 1, [255, 230, 128, 255]);
    drawTinyLabel(labeledPreview, cell.sourceRect.x + 5, cell.sourceRect.y + 5, `${cell.row},${cell.col}`, [255, 255, 255, 255]);
    drawTinyLabel(labeledPreview, cell.sourceRect.x + 5, cell.sourceRect.y + 18, cell.id.slice(0, 18), [180, 232, 255, 255]);
  }

  const labeledPreviewPath = path.join(REPORT_DIR, LABELED_PREVIEW_FILENAME);
  const reportPath = path.join(REPORT_DIR, "world_atlas.import-report.md");
  writePng(labeledPreviewPath, labeledPreview);
  fs.writeFileSync(DATA_OUTPUT, buildTypeScriptManifest(tileWidth, tileHeight), "utf8");
  fs.writeFileSync(reportPath, buildReport(sourceImage, cells, tileWidth, tileHeight, copiedSource, runtimeAtlas, labeledPreviewPath, sourceHash), "utf8");

  console.log(`Imported final world atlas ${sourceImage.width}x${sourceImage.height}.`);
  console.log(`Runtime atlas: ${relative(runtimeAtlas)}`);
  console.log(`Source copy: ${relative(copiedSource)}`);
  console.log(`Tile manifest: ${relative(DATA_OUTPUT)}`);
  console.log(`Tile size: ${tileWidth}x${tileHeight}; grid ${COLUMNS}x${ROWS}`);
}

function removeStaleSources() {
  for (const filename of fs.readdirSync(SOURCE_COPY_DIR)) {
    if (filename === SOURCE_COPY_FILENAME) continue;
    fs.rmSync(path.join(SOURCE_COPY_DIR, filename), { force: true });
  }
}

function assertAtlasGrid(image) {
  if (image.width !== image.height) throw new Error(`World atlas must be square; got ${image.width}x${image.height}.`);
  if (image.width % COLUMNS !== 0) throw new Error(`World atlas width ${image.width} is not divisible by ${COLUMNS}.`);
  if (image.height % ROWS !== 0) throw new Error(`World atlas height ${image.height} is not divisible by ${ROWS}.`);
  const tileWidth = image.width / COLUMNS;
  const tileHeight = image.height / ROWS;
  if (!Number.isInteger(tileWidth) || !Number.isInteger(tileHeight)) throw new Error(`World atlas tile size must be integer; got ${tileWidth}x${tileHeight}.`);
  if (tileWidth !== tileHeight) throw new Error(`World atlas tiles must be square; got ${tileWidth}x${tileHeight}.`);
  if (TILE_ROWS.length !== ROWS) throw new Error(`Manifest row count ${TILE_ROWS.length} does not match atlas rows ${ROWS}.`);
  for (const rowData of TILE_ROWS) {
    if (rowData.tiles.length !== COLUMNS) throw new Error(`Manifest row ${rowData.row} has ${rowData.tiles.length} tiles; expected ${COLUMNS}.`);
  }
  return { tileWidth, tileHeight };
}

function buildCells(tileWidth, tileHeight) {
  const cells = [];
  for (const rowData of TILE_ROWS) {
    for (let col = 0; col < rowData.tiles.length; col += 1) {
      const tileData = rowData.tiles[col];
      cells.push({
        ...tileData,
        row: rowData.row,
        rowFamily: rowData.family,
        col,
        sourceRect: {
          x: col * tileWidth,
          y: rowData.row * tileHeight,
          width: tileWidth,
          height: tileHeight
        }
      });
    }
  }
  return cells;
}

function buildReport(image, cells, tileWidth, tileHeight, copiedSource, runtimeAtlas, labeledPreviewPath, sourceHash) {
  const walkable = cells.filter((cell) => cell.walkable).length;
  const blocked = cells.length - walkable;
  const rowFamilies = TILE_ROWS.map((rowData) => `- Row ${rowData.row}: ${rowData.family}`).join("\n");
  return `# World Atlas Import Report

Source: \`${SOURCE_ATLAS}\`
Copied source: \`${relative(copiedSource)}\`
Source SHA-256: \`${sourceHash}\`
Source dimensions: ${image.width}x${image.height}
Source color: ${image.sourceColorType}
Grid size: ${COLUMNS} columns x ${ROWS} rows
Tile size: ${tileWidth}x${tileHeight}
Runtime atlas path: \`${relative(runtimeAtlas)}\`
Manifest path: \`${relative(DATA_OUTPUT)}\`
Labeled preview: \`${relative(labeledPreviewPath)}\`

## Import Method

The source PNG is already a clean 10x10 square atlas with no gutters, borders, or grid lines. The importer copies it exactly to the runtime atlas path and slices it with integer rectangles only:

\`\`\`ts
sx = col * tileWidth;
sy = row * tileHeight;
sw = tileWidth;
sh = tileHeight;
\`\`\`

No proportional slicing, border cleanup, scaling, padding, or edge bleed is applied.

## Row Families

${rowFamilies}

## Walkability Summary

- Walkable tiles: ${walkable}
- Blocked tiles: ${blocked}
- Water-family blocked tiles: ${cells.filter((cell) => cell.tags.includes("water") && !cell.walkable).length}
- Bridge tiles: ${cells.filter((cell) => cell.tags.includes("bridge")).length}, all walkable

## Visual Interpretation Deviations

None. Visual inspection matched the requested 10-row interpretation.

## Cells

| ID | Row | Col | Biome | Tags | Walkable | Movement Cost | Source Rect | Notes |
|---|---:|---:|---|---|---:|---:|---|---|
${cells
  .map(
    (cell) =>
      `| \`${cell.id}\` | ${cell.row} | ${cell.col} | ${cell.biome} | ${cell.tags.join(", ")} | ${cell.walkable} | ${cell.movementCost} | ${cell.sourceRect.x},${cell.sourceRect.y},${cell.sourceRect.width},${cell.sourceRect.height} | ${cell.notes ?? ""} |`
  )
  .join("\n")}
`;
}

function buildTypeScriptManifest(tileWidth, tileHeight) {
  const defs = buildCells(tileWidth, tileHeight).map((cell) => {
    const def = {
      id: cell.id,
      row: cell.row,
      col: cell.col,
      biome: cell.biome,
      encounterFamily: cell.encounterFamily,
      walkable: cell.walkable,
      movementCost: cell.movementCost,
      tags: cell.tags
    };
    if (cell.notes) def.notes = cell.notes;
    return def;
  });
  return `export const WORLD_ATLAS = {
  textureKey: "world_atlas",
  image: "src/assets/world/${RUNTIME_ATLAS_FILENAME}",
  sourceCopy: "src/assets/world/source/${SOURCE_COPY_FILENAME}",
  columns: ${COLUMNS},
  rows: ${ROWS},
  tileWidth: ${tileWidth},
  tileHeight: ${tileHeight},
  sheetWidth: ${COLUMNS * tileWidth},
  sheetHeight: ${ROWS * tileHeight}
} as const;

export type WorldBiome =
  | "grassland"
  | "forest"
  | "desert"
  | "snow"
  | "darkland"
  | "water"
  | "mountain"
  | "road"
  | "transition";

export type WorldEncounterFamily = "plains" | "forest" | "hills" | "sand" | "water" | "final" | "road";

export interface WorldTileDefinition {
  id: WorldTileId;
  row: number;
  col: number;
  biome: WorldBiome;
  encounterFamily: WorldEncounterFamily;
  walkable: boolean;
  movementCost: number;
  tags: readonly string[];
  notes?: string;
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

export function worldTileIdsMatching(predicate: (tile: WorldTileDefinition) => boolean): WorldTileId[] {
  return WORLD_TILE_DEFINITIONS.filter((tile) => predicate(tile)).map((tile) => tile.id);
}
`;
}

function cloneImage(image) {
  return { width: image.width, height: image.height, sourceColorType: image.sourceColorType, data: Buffer.from(image.data) };
}

function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
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

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function relative(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
}

main();
