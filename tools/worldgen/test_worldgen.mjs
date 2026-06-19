import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateWorld } from "../../src/world/worldGenerator.ts";
import { CLASSIC_WORLD_TILE_IDS, WORLD_ATLAS, WORLD_TILE_DEFINITIONS, isWorldTileWalkable, worldTileHasTag } from "../../src/data/worldTiles.ts";

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

console.log(`Classic atlas and worldgen validation passed for ${worldCount} generated worlds.`);

function validateWorldAtlas() {
  const runtimeAtlasPath = path.join(PROJECT_ROOT, WORLD_ATLAS.image);
  const manifestPath = path.join(PROJECT_ROOT, WORLD_ATLAS.manifest);
  assert(fs.existsSync(runtimeAtlasPath), `Runtime atlas does not exist: ${WORLD_ATLAS.image}`);
  assert(fs.existsSync(manifestPath), `Runtime manifest does not exist: ${WORLD_ATLAS.manifest}`);
  assert(WORLD_ATLAS.id === "classic_world_tileset", `Active world tileset is ${WORLD_ATLAS.id}, expected classic_world_tileset.`);
  assert(WORLD_ATLAS.textureKey === "classic_world_tileset", `Active world texture key is ${WORLD_ATLAS.textureKey}, expected classic_world_tileset.`);
  assert(WORLD_ATLAS.oldGeneratedAtlasActive === false, "Old generated atlas is still marked active.");

  const dimensions = readPngDimensions(runtimeAtlasPath);
  assert(dimensions.width === WORLD_ATLAS.sheetWidth, `Runtime atlas width ${dimensions.width} does not match manifest width ${WORLD_ATLAS.sheetWidth}.`);
  assert(dimensions.height === WORLD_ATLAS.sheetHeight, `Runtime atlas height ${dimensions.height} does not match manifest height ${WORLD_ATLAS.sheetHeight}.`);
  assert(WORLD_ATLAS.baseTileSize === 16, `Classic base tile size is ${WORLD_ATLAS.baseTileSize}, expected 16.`);
  assert(WORLD_ATLAS.sourceColumns === 52 && WORLD_ATLAS.sourceRows === 67, `Classic source grid is ${WORLD_ATLAS.sourceColumns}x${WORLD_ATLAS.sourceRows}, expected 52x67.`);
  assert(WORLD_TILE_DEFINITIONS.length >= 40, `Curated catalog has too few active terrain entries: ${WORLD_TILE_DEFINITIONS.length}.`);
  assert(WORLD_TILE_DEFINITIONS.length < 1885, "Curated catalog appears to include every extracted tile.");

  const classicManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert(classicManifest.sourceImage.endsWith("classic_world_tileset.cleaned.png"), "Classic manifest does not point to the cleaned PNG.");

  const seen = new Set();
  for (const tile of WORLD_TILE_DEFINITIONS) {
    assert(!seen.has(tile.id), `Duplicate tile ID in manifest: ${tile.id}`);
    seen.add(tile.id);
    assert(classicManifest.tiles[tile.manifestId], `Tile ${tile.id} references missing classic manifest tile ${tile.manifestId}.`);
    const { x, y, width, height } = tile.sourceRect;
    assert(Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(width) && Number.isInteger(height), `Tile ${tile.id} source rect is fractional.`);
    assert(width > 0 && height > 0, `Tile ${tile.id} source rect must be positive.`);
    assert(x + width <= dimensions.width, `Tile ${tile.id} source rect exceeds atlas width.`);
    assert(y + height <= dimensions.height, `Tile ${tile.id} source rect exceeds atlas height.`);
  }

  for (const tileId of [CLASSIC_WORLD_TILE_IDS.deepWater, CLASSIC_WORLD_TILE_IDS.lightWater, CLASSIC_WORLD_TILE_IDS.riverWater, CLASSIC_WORLD_TILE_IDS.shallowWater]) {
    assert(!isWorldTileWalkable(tileId), `${tileId} must be blocked.`);
  }
  for (const tileId of [
    CLASSIC_WORLD_TILE_IDS.woodBridgeHorizontal,
    CLASSIC_WORLD_TILE_IDS.woodBridgeVertical,
    CLASSIC_WORLD_TILE_IDS.stoneBridgeHorizontal,
    CLASSIC_WORLD_TILE_IDS.stoneBridgeVertical
  ]) {
    assert(isWorldTileWalkable(tileId), `${tileId} must be walkable.`);
    assert(worldTileHasTag(tileId, "bridge"), `${tileId} must carry the bridge tag.`);
  }

  const runtimeFiles = ["src/main.ts", "src/data/worldTiles.ts", "src/world/worldGenerator.ts", "src/world/classicWorldTileCatalog.ts"];
  const deprecated = [
    "world_atlas.normalized.png",
    "master_overworld_tileset_atlas_10x10.png",
    ["D:/Projects", "new_artwork", "atlas.png"].join("/"),
    ["D:\\Projects", "new_artwork", "atlas.png"].join("\\"),
    ["redo", "this", "please", "2K", "202606182350.jpeg"].join("_"),
    ["redo", "this", "please", "2k", "202606182233.jpeg"].join("_"),
    ["world", "atlas.debug.png"].join("_")
  ];
  for (const file of runtimeFiles) {
    const text = fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8");
    for (const value of deprecated) assertNoActiveDeprecatedAtlasReference(file, text, value);
  }

  const mainSource = fs.readFileSync(path.join(PROJECT_ROOT, "src/main.ts"), "utf8");
  assert(mainSource.includes("classic_world_tileset.cleaned.png"), "src/main.ts does not explicitly import/load the classic tileset image.");
  assert(mainSource.includes("classicWorldTileset.manifest.json"), "src/main.ts does not explicitly import/load the classic manifest.");
  const drawWorldTileBlock = mainSource.slice(mainSource.indexOf("  private drawWorldTile("), mainSource.indexOf("  private worldTerrainAt("));
  assert(!drawWorldTileBlock.includes("strokeRect"), "drawWorldTile contains strokeRect grid/debug drawing.");
  assert(!drawWorldTileBlock.includes("tile.row") && !drawWorldTileBlock.includes("tile.col"), "drawWorldTile still uses old row/col atlas slicing.");
  assert(!drawWorldTileBlock.includes("world_atlas"), "drawWorldTile still references the old world_atlas texture key.");
}

function assertNoActiveDeprecatedAtlasReference(file, text, value) {
  const allowedNegativeGlob = `!./assets/world/${value}`;
  const activeText = text.replace(allowedNegativeGlob, "");
  assert(!activeText.includes(value), `${file} still references deprecated atlas path ${value}.`);
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
