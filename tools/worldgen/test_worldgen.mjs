import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  GENERIC_WORLD_TILE_IDS,
  WORLD_ATLASES,
  WORLD_TILE_DEFINITIONS,
  isWorldTileWalkable,
  worldTileHasTag,
} from "../../src/data/worldTiles.ts";
import {
  CLASSIC_GRASSLAND_ACTIVE_MACRO_REGIONS,
  CLASSIC_GRASSLAND_SELECTED_ASSET_COUNTS,
  CLASSIC_GRASSLAND_USES_FULL_TILE_POOL,
  CLASSIC_GRASSLAND_USES_REFERENCE_IMAGE_AS_RUNTIME_ASSET,
  CLASSIC_WORLD_TILE_DEFINITIONS,
} from "../../src/world/classicGrasslandRegionCatalog.ts";
import { generateWorld } from "../../src/world/worldGenerator.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

validateAtlases();
validateClassicCatalog();
validateClassicIslandMode();
validateGenericMode();
validateRuntimeReferences();

console.log("Worldgen mode validation passed for classicIsland and generic10x10.");

function validateAtlases() {
  for (const atlas of Object.values(WORLD_ATLASES)) {
    const runtimeAtlasPath = path.join(PROJECT_ROOT, atlas.image);
    assert(fs.existsSync(runtimeAtlasPath), `Runtime atlas does not exist: ${atlas.image}`);
    const dimensions = readPngDimensions(runtimeAtlasPath);
    assert(dimensions.width === atlas.sheetWidth, `${atlas.id} width ${dimensions.width} does not match ${atlas.sheetWidth}.`);
    assert(dimensions.height === atlas.sheetHeight, `${atlas.id} height ${dimensions.height} does not match ${atlas.sheetHeight}.`);
    if (atlas.slicing === "generic10x10Grid") {
      assert(atlas.sourceColumns === 10 && atlas.sourceRows === 10, `${atlas.id} must be a 10x10 atlas.`);
      assert(atlas.sheetWidth % 10 === 0 && atlas.sheetHeight % 10 === 0, `${atlas.id} dimensions must divide by 10.`);
    }
  }
}

function validateClassicCatalog() {
  assert(CLASSIC_GRASSLAND_ACTIVE_MACRO_REGIONS.join("+") === "7+10", "Classic catalog is not limited to macro regions 7+10.");
  assert(CLASSIC_GRASSLAND_USES_FULL_TILE_POOL === false, "Classic mode must not use the full 1885 tile pool.");
  assert(CLASSIC_GRASSLAND_USES_REFERENCE_IMAGE_AS_RUNTIME_ASSET === false, "Reference image must not be a runtime asset.");
  assert(CLASSIC_WORLD_TILE_DEFINITIONS.length < 100, "Classic active catalog is too broad for the focused 7+10 pass.");
  assert(CLASSIC_WORLD_TILE_DEFINITIONS.every((tile) => tile.macroRegion === 7 || tile.macroRegion === 10), "Classic terrain includes assets outside regions 7+10.");
  for (const [category, count] of Object.entries(CLASSIC_GRASSLAND_SELECTED_ASSET_COUNTS.byTerrainCategory)) {
    assert(count > 0, `Classic terrain category ${category} is empty.`);
  }
  for (const [category, count] of Object.entries(CLASSIC_GRASSLAND_SELECTED_ASSET_COUNTS.byObjectCategory)) {
    assert(count > 0, `Classic object category ${category} is empty.`);
  }
}

function validateClassicIslandMode() {
  const worldCount = 25;
  let firstSignature = "";
  let sawDifferentWorld = false;
  const manifestIds = new Set(WORLD_TILE_DEFINITIONS.map((tile) => tile.id));

  for (let i = 0; i < worldCount; i += 1) {
    const world = generateWorld({ mode: "classicIsland", seed: `classic-island-test-${i}` });
    assert(world.mode === "classicIsland", `Expected classicIsland mode, got ${world.mode}.`);
    assert(world.validation.valid, `Classic world ${i} failed validation: ${world.validation.errors.join("; ")}`);
    assert(world.pois.length >= 4 && world.pois.length <= 6, `Classic world ${i} has unexpected POI count ${world.pois.length}.`);
    assert(!world.pois.some((poi) => ["dawnford", "brinewick", "elderleaf", "sunbarrow", "starfallGate", "mossCave", "ashenKeep", "tideShrine", "skyglassTower", "eclipseSpire"].includes(poi.id)), `Classic world ${i} reused legacy ten-POI IDs.`);
    assert(world.composition.waterTiles > world.width * world.height * 0.3, `Classic world ${i} lacks ocean.`);
    assert(world.composition.shoreTiles > 20, `Classic world ${i} lacks a visible shore ring.`);
    assert(world.composition.forestClusterCount >= 3, `Classic world ${i} lacks forest clusters.`);
    assert(world.composition.mountainClusterCount >= 2, `Classic world ${i} lacks mountain clusters.`);
    assert(world.composition.pathLength > 12, `Classic world ${i} did not connect POIs with paths.`);

    for (const row of world.tiles) {
      for (const tile of row) {
        assert(manifestIds.has(tile), `Classic world ${i} generated unknown tile ID ${tile}.`);
        if (worldTileHasTag(tile, "water")) assert(!isWorldTileWalkable(tile), `Classic world ${i} water tile ${tile} is walkable.`);
      }
    }

    for (const poi of world.pois) {
      const tile = world.tiles[poi.y][poi.x];
      assert(!worldTileHasTag(tile, "water"), `Classic world ${i} POI ${poi.id} is on water.`);
      assert(world.validation.reachablePoiIds.includes(poi.id), `Classic world ${i} POI ${poi.id} is not reachable.`);
    }

    for (const overlay of world.overlays) {
      assert(overlay.assetId.startsWith("classic_region_"), `Classic world ${i} overlay ${overlay.id} uses non-curated asset ${overlay.assetId}.`);
    }

    const signature = world.tiles.map((row) => row.join(",")).join("|");
    if (i === 0) firstSignature = signature;
    else if (signature !== firstSignature) sawDifferentWorld = true;
  }

  const stableA = generateWorld({ mode: "classicIsland", seed: "classic-stable-seed" });
  const stableB = generateWorld({ mode: "classicIsland", seed: "classic-stable-seed" });
  assert(JSON.stringify(stableA.tiles) === JSON.stringify(stableB.tiles), "Classic same seed produced different tile grids.");
  assert(JSON.stringify(stableA.pois) === JSON.stringify(stableB.pois), "Classic same seed produced different POIs.");
  assert(sawDifferentWorld, "Classic different seeds did not vary.");
}

function validateGenericMode() {
  const world = generateWorld({ mode: "generic10x10", seed: "generic-mode-test" });
  assert(world.mode === "generic10x10", `Expected generic10x10 mode, got ${world.mode}.`);
  assert(world.validation.valid, `Generic world failed validation: ${world.validation.errors.join("; ")}`);
  assert(world.pois.length === 10, `Generic mode should keep the legacy ten-POI layout; got ${world.pois.length}.`);
  assert(world.bridges.length > 0, "Generic mode should preserve bridge generation.");
  for (const tileId of [
    GENERIC_WORLD_TILE_IDS.deepWater,
    GENERIC_WORLD_TILE_IDS.lightWater,
    GENERIC_WORLD_TILE_IDS.riverWater,
    GENERIC_WORLD_TILE_IDS.shallowWater,
  ]) {
    assert(!isWorldTileWalkable(tileId), `${tileId} must be blocked.`);
  }
  for (const tileId of [
    GENERIC_WORLD_TILE_IDS.woodBridgeHorizontal,
    GENERIC_WORLD_TILE_IDS.woodBridgeVertical,
    GENERIC_WORLD_TILE_IDS.stoneBridgeHorizontal,
    GENERIC_WORLD_TILE_IDS.stoneBridgeVertical,
  ]) {
    assert(isWorldTileWalkable(tileId), `${tileId} must be walkable.`);
    assert(worldTileHasTag(tileId, "bridge"), `${tileId} must carry the bridge tag.`);
  }
}

function validateRuntimeReferences() {
  const mainSource = fs.readFileSync(path.join(PROJECT_ROOT, "src", "main.ts"), "utf8");
  assert(mainSource.includes("resolveWorldgenMode"), "src/main.ts does not use the worldgen mode selector.");
  assert(mainSource.includes("classic_world_tileset.cleaned.png"), "src/main.ts does not explicitly load the classic tileset.");
  assert(mainSource.includes("world_atlas.normalized.png"), "src/main.ts does not explicitly load the generic 10x10 atlas.");
  assert(!mainSource.includes("ctworldmap1000ad.png"), "Reference map was imported into runtime code.");
  const drawWorldTileBlock = mainSource.slice(mainSource.indexOf("  private drawWorldTile("), mainSource.indexOf("  private worldTerrainAt("));
  assert(!drawWorldTileBlock.includes("strokeRect"), "drawWorldTile contains strokeRect grid/debug drawing.");
  assert(drawWorldTileBlock.includes("tile.textureKey"), "drawWorldTile is not atlas-aware.");
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", `Runtime atlas is not a PNG: ${filePath}`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
