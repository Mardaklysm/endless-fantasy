import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateWorld } from "../../src/world/worldGenerator.ts";
import {
  ATLAS_V3_CELLS,
  ATLAS_V3_EMPTY_CELLS,
  ATLAS_V3_MANIFEST,
  ATLAS_V3_NON_EMPTY_CELLS,
  WORLD_ATLAS,
  WORLD_TILE_DEFINITIONS,
  WORLD_TILE_ID_SET,
  WORLD_TILE_IDS,
  isWorldTileWalkable,
  worldTileById,
  worldTileHasTag
} from "../../src/data/worldTiles.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

validateAtlasV3();
validateRuntimeReferences();
validateWorldgen();

console.log("atlas_v3 atlas and worldgen validation passed.");

function validateAtlasV3() {
  const runtimeAtlasPath = path.join(PROJECT_ROOT, WORLD_ATLAS.image);
  const manifestPath = path.join(PROJECT_ROOT, WORLD_ATLAS.manifest);
  assert(fs.existsSync(runtimeAtlasPath), `Runtime atlas does not exist: ${WORLD_ATLAS.image}`);
  assert(fs.existsSync(manifestPath), `Runtime manifest does not exist: ${WORLD_ATLAS.manifest}`);

  const dimensions = readPngDimensions(runtimeAtlasPath);
  assert(WORLD_ATLAS.id === "atlas_v3", `Active world tileset is ${WORLD_ATLAS.id}, expected atlas_v3.`);
  assert(WORLD_ATLAS.textureKey === "atlas_v3", `Active world texture key is ${WORLD_ATLAS.textureKey}, expected atlas_v3.`);
  assert(WORLD_ATLAS.columns === 8 && WORLD_ATLAS.rows === 8, `World atlas grid is ${WORLD_ATLAS.columns}x${WORLD_ATLAS.rows}, expected 8x8.`);
  assert(WORLD_ATLAS.emptyCellsActive === false, "Empty atlas cells are marked active.");
  assert(WORLD_ATLAS.usingClassicSpecialTileset === false, "Classic special tileset is marked active.");
  assert(WORLD_ATLAS.usingOld10x10Atlas === false, "Old 10x10 atlas is marked active.");
  assert(WORLD_ATLAS.oldGeneratedAtlasActive === false, "Old generated atlas is marked active.");
  assert(dimensions.width === WORLD_ATLAS.sheetWidth, `Runtime atlas width ${dimensions.width} does not match manifest width ${WORLD_ATLAS.sheetWidth}.`);
  assert(dimensions.height === WORLD_ATLAS.sheetHeight, `Runtime atlas height ${dimensions.height} does not match manifest height ${WORLD_ATLAS.sheetHeight}.`);
  assert(dimensions.width === 1024 && dimensions.height === 1024, `atlas_v3 dimensions changed unexpectedly: ${dimensions.width}x${dimensions.height}.`);
  assert(dimensions.width % 8 === 0 && dimensions.height % 8 === 0, "atlas_v3 dimensions are not divisible by 8.");
  assert(WORLD_ATLAS.tileWidth === 128 && WORLD_ATLAS.tileHeight === 128, `atlas_v3 tile size is ${WORLD_ATLAS.tileWidth}x${WORLD_ATLAS.tileHeight}, expected 128x128.`);
  assert(WORLD_ATLAS.tileWidth === WORLD_ATLAS.tileHeight, "atlas_v3 tile width and height differ.");

  assert(ATLAS_V3_MANIFEST.cells.length === 64, `Manifest has ${ATLAS_V3_MANIFEST.cells.length} cells, expected 64.`);
  assert(ATLAS_V3_CELLS.length === 64, `Runtime cell list has ${ATLAS_V3_CELLS.length} cells, expected 64.`);
  assert(ATLAS_V3_NON_EMPTY_CELLS.length === WORLD_TILE_DEFINITIONS.length, "Non-empty manifest cells do not match tile definitions.");
  assert(ATLAS_V3_NON_EMPTY_CELLS.length === 29, `Expected 29 non-empty atlas_v3 cells, got ${ATLAS_V3_NON_EMPTY_CELLS.length}.`);
  assert(ATLAS_V3_EMPTY_CELLS.length === 35, `Expected 35 empty atlas_v3 cells, got ${ATLAS_V3_EMPTY_CELLS.length}.`);

  const seenIds = new Set();
  for (const cell of ATLAS_V3_CELLS) {
    assert(cell.row >= 0 && cell.row < 8 && cell.col >= 0 && cell.col < 8, `Cell ${cell.row},${cell.col} is out of the 8x8 grid.`);
    assert(cell.source.x === cell.col * WORLD_ATLAS.tileWidth, `Cell ${cell.row},${cell.col} source x is not col * tileWidth.`);
    assert(cell.source.y === cell.row * WORLD_ATLAS.tileHeight, `Cell ${cell.row},${cell.col} source y is not row * tileHeight.`);
    assert(cell.source.width === WORLD_ATLAS.tileWidth && cell.source.height === WORLD_ATLAS.tileHeight, `Cell ${cell.row},${cell.col} source size is not the atlas tile size.`);
    assert(cell.source.x + cell.source.width <= dimensions.width, `Cell ${cell.row},${cell.col} exceeds atlas width.`);
    assert(cell.source.y + cell.source.height <= dimensions.height, `Cell ${cell.row},${cell.col} exceeds atlas height.`);
    if (cell.empty) {
      assert(cell.emptyRatio > 0.9, `Empty cell ${cell.row},${cell.col} has near-black ratio ${cell.emptyRatio}.`);
      assert(!("id" in cell), `Empty cell ${cell.row},${cell.col} has an ID.`);
    } else {
      assert(cell.emptyRatio <= 0.9, `Non-empty cell ${cell.id} was detected as mostly black.`);
      assert(!seenIds.has(cell.id), `Duplicate atlas_v3 tile ID: ${cell.id}`);
      seenIds.add(cell.id);
      assert(WORLD_TILE_ID_SET.has(cell.id), `Non-empty cell ${cell.id} is missing from world tile IDs.`);
      assert(worldTileById(cell.id), `Non-empty cell ${cell.id} is missing from WORLD_TILES.`);
    }
  }

  assert(!isWorldTileWalkable(WORLD_TILE_IDS.deepWater), "deep_water must be blocked.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.rockyMountainGround), "rocky_mountain_ground must be blocked.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.volcanoMound), "volcano_mound must be blocked.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.lavaCrackedGround), "lava_cracked_ground must be blocked.");
  assert(isWorldTileWalkable(WORLD_TILE_IDS.gravelStoneGround), "gravel_stone_ground must be walkable.");
}

function validateRuntimeReferences() {
  const runtimeFiles = ["src/main.ts", "src/data/worldTiles.ts", "src/world/worldGenerator.ts"];
  const deprecated = [
    "classic_world_tileset.cleaned.png",
    "classicWorldTileset.manifest.json",
    "classicIsland",
    "generic10x10",
    "world_atlas.normalized.png",
    "classicLocationObjectFor"
  ];
  for (const file of runtimeFiles) {
    const text = fs.readFileSync(path.join(PROJECT_ROOT, file), "utf8");
    for (const value of deprecated) assertNoActiveDeprecatedReference(file, text, value);
  }

  const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"));
  assert(!packageJson.scripts.test.includes("test_classic_world_tileset"), "npm test still runs the classic world tileset test.");
}

function validateWorldgen() {
  const worldCount = 80;
  let firstSignature = "";
  let sawDifferentWorld = false;

  for (let i = 0; i < worldCount; i += 1) {
    const world = generateWorld({ seed: `atlas-v3-worldgen-test-${i}` });
    assert(world.mode === "atlas_v3_tile_world", `World ${i} mode is ${world.mode}.`);
    assert(world.validation.valid, `World ${i} failed validation: ${world.validation.errors.join("; ")}`);
    assert(world.roads.length === 0, `World ${i} generated roads.`);
    assert(world.rivers.length === 0, `World ${i} generated rivers.`);
    assert(world.bridges.length === 0, `World ${i} generated bridges.`);
    assert(isWorldTileWalkable(world.tiles[world.startPosition.y][world.startPosition.x]), `World ${i} start is blocked.`);
    assert(worldTileById(world.tiles[world.startPosition.y][world.startPosition.x])?.biome === "grassland", `World ${i} start is not grassland.`);

    for (const poi of world.pois) {
      const tile = world.tiles[poi.y][poi.x];
      assert(!worldTileHasTag(tile, "water"), `World ${i} POI ${poi.id} was placed on water.`);
      assert(isWorldTileWalkable(tile), `World ${i} POI ${poi.id} was placed on blocked terrain.`);
      assert(world.validation.reachablePoiIds.includes(poi.id), `World ${i} POI ${poi.id} was not reachable.`);
    }

    let sawWater = false;
    let sawBlocked = false;
    for (const row of world.tiles) {
      for (const tile of row) {
        assert(WORLD_TILE_ID_SET.has(tile), `World ${i} generated unknown or empty tile ID ${tile}.`);
        const def = worldTileById(tile);
        assert(def && !def.empty, `World ${i} generated an empty atlas cell ${tile}.`);
        if (worldTileHasTag(tile, "water")) {
          sawWater = true;
          assert(!isWorldTileWalkable(tile), `World ${i} water tile ${tile} is walkable.`);
        }
        if (worldTileHasTag(tile, "blocked")) {
          sawBlocked = true;
          assert(!isWorldTileWalkable(tile), `World ${i} blocked tile ${tile} is walkable.`);
        }
      }
    }
    assert(sawWater, `World ${i} did not generate water.`);
    assert(sawBlocked, `World ${i} did not generate blocked terrain.`);

    const signature = world.tiles.map((row) => row.join(",")).join("|");
    if (i === 0) firstSignature = signature;
    else if (signature !== firstSignature) sawDifferentWorld = true;
  }

  const stableA = generateWorld({ seed: "atlas-v3-stable-seed" });
  const stableB = generateWorld({ seed: "atlas-v3-stable-seed" });
  const different = generateWorld({ seed: "atlas-v3-different-seed" });
  assert(JSON.stringify(stableA.tiles) === JSON.stringify(stableB.tiles), "Same seed produced different tile grids.");
  assert(JSON.stringify(stableA.pois) === JSON.stringify(stableB.pois), "Same seed produced different POIs.");
  assert(JSON.stringify(stableA.tiles) !== JSON.stringify(different.tiles), "Different seeds produced the same tile grid.");
  assert(sawDifferentWorld, "Generated worlds did not vary across different seeds.");
}

function assertNoActiveDeprecatedReference(file, text, value) {
  let activeText = text;
  activeText = activeText.replace(`"!./assets/world/${value}"`, "");
  activeText = activeText.replace(`"Using ${value}: false"`, "");
  activeText = activeText.replace(`Using ${value}: false`, "");
  assert(!activeText.includes(value), `${file} still references deprecated active value ${value}.`);
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
