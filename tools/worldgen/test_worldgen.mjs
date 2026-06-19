import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateWorld } from "../../src/world/worldGenerator.ts";
import { WORLD_ATLAS, WORLD_TILE_DEFINITIONS, WORLD_TILES, isWorldTileWalkable, worldTileHasTag } from "../../src/data/worldTiles.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

validateWorldAtlas();

const worldCount = 100;
let firstSignature = "";
let sawDifferentWorld = false;
const manifestIds = new Set(WORLD_TILE_DEFINITIONS.map((tile) => tile.id));

for (let i = 0; i < worldCount; i += 1) {
  const world = generateWorld({ seed: `worldgen-test-${i}` });
  assert(world.validation.valid, `World ${i} failed validation: ${world.validation.errors.join("; ")}`);
  assert(isWorldTileWalkable(world.tiles[world.startPosition.y][world.startPosition.x]), `World ${i} start is blocked.`);
  assert(world.bridges.length > 0, `World ${i} did not create a bridge.`);

  for (const poi of world.pois) {
    const tile = world.tiles[poi.y][poi.x];
    assert(!worldTileHasTag(tile, "water"), `World ${i} POI ${poi.id} was placed on water.`);
    assert(isWorldTileWalkable(tile), `World ${i} POI ${poi.id} was placed on blocked terrain.`);
    assert(world.validation.reachablePoiIds.includes(poi.id), `World ${i} POI ${poi.id} was not reachable.`);
  }

  for (const row of world.tiles) {
    for (const tile of row) {
      assert(manifestIds.has(tile), `World ${i} generated unknown tile ID ${tile}.`);
      if (worldTileHasTag(tile, "water") && !worldTileHasTag(tile, "bridge")) {
        assert(!isWorldTileWalkable(tile), `World ${i} water tile ${tile} is walkable.`);
      }
      if (worldTileHasTag(tile, "bridge")) {
        assert(isWorldTileWalkable(tile), `World ${i} bridge tile ${tile} is not walkable.`);
      }
    }
  }

  const signature = world.tiles.map((row) => row.join(",")).join("|");
  if (i === 0) firstSignature = signature;
  else if (signature !== firstSignature) sawDifferentWorld = true;
}

const stableA = generateWorld({ seed: "worldgen-stable-seed" });
const stableB = generateWorld({ seed: "worldgen-stable-seed" });
assert(JSON.stringify(stableA.tiles) === JSON.stringify(stableB.tiles), "Same seed produced different tile grids.");
assert(JSON.stringify(stableA.pois) === JSON.stringify(stableB.pois), "Same seed produced different POIs.");
assert(sawDifferentWorld, "Different seeds did not produce meaningfully different tile grids.");

console.log(`Atlas and worldgen validation passed for ${worldCount} generated worlds.`);

function validateWorldAtlas() {
  const runtimeAtlasPath = path.join(PROJECT_ROOT, WORLD_ATLAS.image);
  assert(fs.existsSync(runtimeAtlasPath), `Runtime atlas does not exist: ${WORLD_ATLAS.image}`);
  const dimensions = readPngDimensions(runtimeAtlasPath);
  assert(dimensions.width === dimensions.height, `Runtime atlas must be square; got ${dimensions.width}x${dimensions.height}.`);
  assert(dimensions.width % 10 === 0, `Runtime atlas width ${dimensions.width} is not divisible by 10.`);
  assert(dimensions.height % 10 === 0, `Runtime atlas height ${dimensions.height} is not divisible by 10.`);
  assert(WORLD_ATLAS.columns === 10 && WORLD_ATLAS.rows === 10, `Manifest grid is ${WORLD_ATLAS.columns}x${WORLD_ATLAS.rows}, expected 10x10.`);
  assert(WORLD_ATLAS.tileWidth === WORLD_ATLAS.tileHeight, `Manifest tile size is not square: ${WORLD_ATLAS.tileWidth}x${WORLD_ATLAS.tileHeight}.`);
  assert(WORLD_ATLAS.tileWidth === dimensions.width / 10, `Manifest tile width ${WORLD_ATLAS.tileWidth} does not match runtime atlas width ${dimensions.width}.`);
  assert(WORLD_ATLAS.tileHeight === dimensions.height / 10, `Manifest tile height ${WORLD_ATLAS.tileHeight} does not match runtime atlas height ${dimensions.height}.`);
  assert(WORLD_TILE_DEFINITIONS.length === 100, `Manifest has ${WORLD_TILE_DEFINITIONS.length} tiles, expected 100.`);

  const seen = new Set();
  for (const tile of WORLD_TILE_DEFINITIONS) {
    assert(!seen.has(tile.id), `Duplicate tile ID in manifest: ${tile.id}`);
    seen.add(tile.id);
    assert(tile.row >= 0 && tile.row < 10, `Tile ${tile.id} row ${tile.row} is outside 0..9.`);
    assert(tile.col >= 0 && tile.col < 10, `Tile ${tile.id} col ${tile.col} is outside 0..9.`);
    const sx = tile.col * WORLD_ATLAS.tileWidth;
    const sy = tile.row * WORLD_ATLAS.tileHeight;
    const sw = WORLD_ATLAS.tileWidth;
    const sh = WORLD_ATLAS.tileHeight;
    assert(Number.isInteger(sx) && Number.isInteger(sy) && Number.isInteger(sw) && Number.isInteger(sh), `Tile ${tile.id} source rect is fractional.`);
    assert(sx + sw <= dimensions.width, `Tile ${tile.id} source rect exceeds atlas width.`);
    assert(sy + sh <= dimensions.height, `Tile ${tile.id} source rect exceeds atlas height.`);
  }

  for (const tileId of ["deep_ocean_water", "light_water", "river_water", "shallow_water", "swamp_water"]) {
    assert(!isWorldTileWalkable(tileId), `${tileId} must be blocked.`);
  }
  for (const tileId of ["wooden_bridge_horizontal", "wooden_bridge_vertical", "stone_bridge_horizontal", "stone_bridge_vertical", "shallow_ford_stepping_stones"]) {
    assert(isWorldTileWalkable(tileId), `${tileId} must be walkable.`);
  }

  const runtimeFiles = ["src/main.ts", "src/data/worldTiles.ts", "src/world/worldGenerator.ts", "tools/art_import/import_world_atlas.mjs"];
  const deprecated = [
    ["D:/Projects", "new_artwork", "atlas.png"].join("/"),
    ["D:\\Projects", "new_artwork", "atlas.png"].join("\\"),
    ["redo", "this", "please", "2K", "202606182350.jpeg"].join("_"),
    ["redo", "this", "please", "2k", "202606182233.jpeg"].join("_"),
    ["world", "atlas.debug.png"].join("_")
  ];
  for (const file of runtimeFiles) {
    const text = fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8");
    for (const value of deprecated) assert(!text.includes(value), `${file} still references deprecated atlas path ${value}.`);
  }

  const mainSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/main.ts"), "utf8");
  const drawWorldTileBlock = mainSource.slice(mainSource.indexOf("  private drawWorldTile("), mainSource.indexOf("  private worldTerrainAt("));
  assert(!drawWorldTileBlock.includes("strokeRect"), "drawWorldTile contains strokeRect grid/debug drawing.");
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", `Runtime atlas is not a PNG: ${filePath}`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
