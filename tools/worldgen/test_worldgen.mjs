import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateWorld } from "../../src/world/worldGenerator.ts";
import {
  ATLAS_V3_CELLS,
  ATLAS_V3_EMPTY_CELLS,
  ATLAS_V3_MANIFEST,
  ATLAS_V3_NON_EMPTY_CELLS,
  ATLAS_V3_SOURCE_INSET,
  WORLD_ATLAS,
  WORLD_TILE_DEFINITIONS,
  WORLD_TILE_ID_SET,
  WORLD_TILE_IDS,
  atlasV3SourceRectWithInset,
  isWorldTileWalkable,
  worldTileById,
  worldTileHasTag
} from "../../src/data/worldTiles.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

validateAtlasV3();
validateAtlasV3SourceInset();
validateRuntimeReferences();
validateRuntimeDebugInsetConsistency();
validateWorldgen();

console.log("atlas_v3 source inset, worldgen, and runtime reference validation passed.");

function validateAtlasV3() {
  const runtimeAtlasPath = path.join(PROJECT_ROOT, WORLD_ATLAS.image);
  const manifestPath = path.join(PROJECT_ROOT, WORLD_ATLAS.manifest);
  assert(fs.existsSync(runtimeAtlasPath), `Runtime atlas does not exist: ${WORLD_ATLAS.image}`);
  assert(fs.existsSync(manifestPath), `Runtime manifest does not exist: ${WORLD_ATLAS.manifest}`);

  const dimensions = readPngDimensions(runtimeAtlasPath);
  assert(WORLD_ATLAS.id === "atlas_v3", `Active world tileset is ${WORLD_ATLAS.id}, expected atlas_v3.`);
  assert(WORLD_ATLAS.textureKey === "atlas_v3", `Active world texture key is ${WORLD_ATLAS.textureKey}, expected atlas_v3.`);
  assert(WORLD_ATLAS.columns === 8 && WORLD_ATLAS.rows === 8, `World atlas grid is ${WORLD_ATLAS.columns}x${WORLD_ATLAS.rows}, expected 8x8.`);
  assert(WORLD_ATLAS.sourceInset === ATLAS_V3_SOURCE_INSET, "WORLD_ATLAS source inset does not match the shared inset constant.");
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

function validateAtlasV3SourceInset() {
  assert(ATLAS_V3_SOURCE_INSET >= 0, `atlas_v3 source inset must be non-negative, got ${ATLAS_V3_SOURCE_INSET}.`);
  assert(ATLAS_V3_SOURCE_INSET * 2 < WORLD_ATLAS.tileWidth, `atlas_v3 source inset ${ATLAS_V3_SOURCE_INSET} is too wide for ${WORLD_ATLAS.tileWidth}px tiles.`);
  assert(ATLAS_V3_SOURCE_INSET * 2 < WORLD_ATLAS.tileHeight, `atlas_v3 source inset ${ATLAS_V3_SOURCE_INSET} is too tall for ${WORLD_ATLAS.tileHeight}px tiles.`);

  const sample = atlasV3SourceRectWithInset({ x: 128, y: 256, width: 128, height: 128 }, 2);
  assert(sample.x === 130, `Expected inset sample sx 130, got ${sample.x}.`);
  assert(sample.y === 258, `Expected inset sample sy 258, got ${sample.y}.`);
  assert(sample.width === 124, `Expected inset sample width 124, got ${sample.width}.`);
  assert(sample.height === 124, `Expected inset sample height 124, got ${sample.height}.`);

  for (const testInset of [1, 2, 3, 4]) {
    const rect = atlasV3SourceRectWithInset({ x: 0, y: 0, width: WORLD_ATLAS.tileWidth, height: WORLD_ATLAS.tileHeight }, testInset);
    assert(rect.x === testInset && rect.y === testInset, `Inset ${testInset} did not offset x/y correctly.`);
    assert(rect.width === WORLD_ATLAS.tileWidth - testInset * 2, `Inset ${testInset} did not shrink width correctly.`);
    assert(rect.height === WORLD_ATLAS.tileHeight - testInset * 2, `Inset ${testInset} did not shrink height correctly.`);
  }

  for (const tile of WORLD_TILE_DEFINITIONS) {
    const rect = atlasV3SourceRectWithInset(tile.sourceRect);
    assert(rect.x === tile.sourceRect.x + ATLAS_V3_SOURCE_INSET, `Tile ${tile.id} inset source x is wrong.`);
    assert(rect.y === tile.sourceRect.y + ATLAS_V3_SOURCE_INSET, `Tile ${tile.id} inset source y is wrong.`);
    assert(rect.width === tile.sourceRect.width - ATLAS_V3_SOURCE_INSET * 2, `Tile ${tile.id} inset source width is wrong.`);
    assert(rect.height === tile.sourceRect.height - ATLAS_V3_SOURCE_INSET * 2, `Tile ${tile.id} inset source height is wrong.`);
    assert(rect.x >= tile.sourceRect.x && rect.y >= tile.sourceRect.y, `Tile ${tile.id} inset source starts outside the manifest rect.`);
    assert(rect.x + rect.width <= tile.sourceRect.x + tile.sourceRect.width, `Tile ${tile.id} inset source exceeds manifest width.`);
    assert(rect.y + rect.height <= tile.sourceRect.y + tile.sourceRect.height, `Tile ${tile.id} inset source exceeds manifest height.`);
    assert(rect.x + rect.width <= WORLD_ATLAS.sheetWidth, `Tile ${tile.id} inset source exceeds atlas width.`);
    assert(rect.y + rect.height <= WORLD_ATLAS.sheetHeight, `Tile ${tile.id} inset source exceeds atlas height.`);
  }
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

  const gameplayRuntime = fs.readFileSync(path.join(PROJECT_ROOT, "src/main.ts"), "utf8");
  assert(!gameplayRuntime.includes("terrainBlending"), "Runtime still imports or references terrainBlending.");
  assert(!gameplayRuntime.includes("repairBlackSeamsImageData"), "Runtime still calls map-level black seam repair.");
  assert(!gameplayRuntime.includes("BLACK_SEAM_REPAIR"), "Runtime still references black seam repair settings.");
  assert(!fs.existsSync(path.join(PROJECT_ROOT, "src/world/terrainBlending.ts")), "terrainBlending.ts still exists in active runtime source.");

  const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"));
  assert(!packageJson.scripts.test.includes("test_classic_world_tileset"), "npm test still runs the classic world tileset test.");
}

function validateRuntimeDebugInsetConsistency() {
  const dataText = fs.readFileSync(path.join(PROJECT_ROOT, "src/data/worldTiles.ts"), "utf8");
  const runtimeText = fs.readFileSync(path.join(PROJECT_ROOT, "src/main.ts"), "utf8");
  const debugText = fs.readFileSync(path.join(PROJECT_ROOT, "tools/worldgen/write_worldgen_debug.mjs"), "utf8");

  assert(/export const ATLAS_V3_SOURCE_INSET = [1234]/.test(dataText), "Shared atlas_v3 source inset should stay easy to test with 1, 2, 3, or 4.");
  assert(runtimeText.includes("ATLAS_V3_SOURCE_INSET"), "Runtime does not import/use the shared atlas_v3 source inset.");
  assert(runtimeText.includes("atlasV3SourceRectWithInset"), "Runtime does not use the shared inset source rect helper.");
  assert(debugText.includes("ATLAS_V3_SOURCE_INSET"), "Debug preview writer does not import/use the shared atlas_v3 source inset.");
  assert(debugText.includes("atlasV3SourceRectWithInset"), "Debug preview writer does not use the shared inset source rect helper.");
  assert(!debugText.includes("repairBlackSeamsImageData"), "Debug preview writer still runs map-level seam repair.");
  assert(!debugText.includes("from \"../../src/world/terrainBlending.ts\""), "Debug preview writer still imports terrainBlending.");
}

function validateWorldgen() {
  const worldCount = 80;
  let firstSignature = "";
  let sawDifferentWorld = false;

  for (let i = 0; i < worldCount; i += 1) {
    const world = generateWorld({ seed: `atlas-v3-worldgen-test-${i}` });
    assert(world.mode === "atlas_v3_archipelago_world", `World ${i} mode is ${world.mode}.`);
    assert(world.validation.valid, `World ${i} failed validation: ${world.validation.errors.join("; ")}`);
    assert(world.islands.length >= 3, `World ${i} generated only ${world.islands.length} islands.`);
    assert(world.roads.length > 0, `World ${i} did not generate roads.`);
    assert(world.rivers.length === 0, `World ${i} generated rivers.`);
    assert(world.bridges.length > 0, `World ${i} did not generate harbor dock/bridge markers.`);
    assert(world.shallows.length > 0, `World ${i} did not track shallow water.`);
    assert(world.reefs.length > 0, `World ${i} did not add ocean details.`);
    assert(world.seaRoutes.length >= 2, `World ${i} did not add sea routes.`);
    assert(isWorldTileWalkable(world.tiles[world.startPosition.y][world.startPosition.x]), `World ${i} start is blocked.`);
    assert(worldTileById(world.tiles[world.startPosition.y][world.startPosition.x])?.biome === "grassland", `World ${i} start is not grassland.`);
    assert(world.islandByTile[world.startPosition.y][world.startPosition.x] === "greenhaven", `World ${i} start is not on Greenhaven.`);

    for (const island of world.islands) {
      assert(island.id && island.name, `World ${i} has an unnamed island.`);
      assert(island.tileMap.length > 0, `World ${i} island ${island.id} has no tile map.`);
      assert(island.townPosition.x > 0 && island.harborPosition.x > 0, `World ${i} island ${island.id} is missing town or harbor position.`);
      assert(island.dungeonPositions.length > 0, `World ${i} island ${island.id} has no dungeon position.`);
      assert(island.specialLandmarkPositions.length > 0, `World ${i} island ${island.id} has no landmarks.`);
    }

    for (const poi of world.pois) {
      const tile = world.tiles[poi.y][poi.x];
      assert(!worldTileHasTag(tile, "water"), `World ${i} POI ${poi.id} was placed on water.`);
      assert(isWorldTileWalkable(tile), `World ${i} POI ${poi.id} was placed on blocked terrain.`);
      assert(world.validation.reachablePoiIds.includes(poi.id), `World ${i} POI ${poi.id} was not reachable.`);
      if (poi.kind === "harbor") assert(hasAdjacentWater(world, poi), `World ${i} harbor ${poi.id} is not coastal.`);
    }

    let sawWater = false;
    let sawBlocked = false;
    let sawBeach = false;
    let sawForestBiome = false;
    for (let y = 0; y < world.tiles.length; y += 1) {
      const row = world.tiles[y];
      for (let x = 0; x < row.length; x += 1) {
        const tile = row[x];
        const isWorldEdge = x === 0 || y === 0 || x === world.width - 1 || y === world.height - 1;
        assert(WORLD_TILE_ID_SET.has(tile), `World ${i} generated unknown or empty tile ID ${tile}.`);
        const def = worldTileById(tile);
        assert(def, `World ${i} generated an atlas cell without a tile definition: ${tile}.`);
        if (isWorldEdge) {
          assert(tile === WORLD_TILE_IDS.deepWater, `World ${i} edge ${x},${y} is ${tile}, expected ocean border.`);
          assert(!isWorldTileWalkable(tile), `World ${i} edge ${x},${y} is walkable.`);
        }
        if (worldTileHasTag(tile, "water")) {
          sawWater = true;
          assert(!isWorldTileWalkable(tile), `World ${i} water tile ${tile} is walkable.`);
        }
        if (worldTileHasTag(tile, "blocked")) {
          sawBlocked = true;
          assert(!isWorldTileWalkable(tile), `World ${i} blocked tile ${tile} is walkable.`);
        }
        if (worldTileHasTag(tile, "sand")) sawBeach = true;
        if (world.biomes[y][x] === "forest") sawForestBiome = true;
      }
    }
    assert(sawWater, `World ${i} did not generate water.`);
    assert(sawBlocked, `World ${i} did not generate blocked terrain.`);
    assert(sawBeach, `World ${i} did not generate beaches.`);
    assert(sawForestBiome, `World ${i} did not generate forest/jungle biome hooks.`);

    const signature = world.tiles.map((row) => row.join(",")).join("|");
    if (i === 0) firstSignature = signature;
    else if (signature !== firstSignature) sawDifferentWorld = true;
  }

  const stableA = generateWorld({ seed: "atlas-v3-stable-seed" });
  const stableB = generateWorld({ seed: "atlas-v3-stable-seed" });
  const different = generateWorld({ seed: "atlas-v3-different-seed" });
  assert(JSON.stringify(stableA.tiles) === JSON.stringify(stableB.tiles), "Same seed produced different tile grids.");
  assert(JSON.stringify(stableA.pois) === JSON.stringify(stableB.pois), "Same seed produced different POIs.");
  assert(JSON.stringify(stableA.islands) === JSON.stringify(stableB.islands), "Same seed produced different islands.");
  assert(JSON.stringify(stableA.tiles) !== JSON.stringify(different.tiles), "Different seeds produced the same tile grid.");
  assert(sawDifferentWorld, "Generated worlds did not vary across different seeds.");
}

function hasAdjacentWater(world, poi) {
  for (let yy = poi.y - 1; yy <= poi.y + 1; yy += 1) {
    for (let xx = poi.x - 1; xx <= poi.x + 1; xx += 1) {
      const neighbors = [
        [xx + 1, yy],
        [xx - 1, yy],
        [xx, yy + 1],
        [xx, yy - 1]
      ];
      for (const [x, y] of neighbors) {
        if (worldTileHasTag(world.tiles[y]?.[x], "water")) return true;
      }
    }
  }
  return false;
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
