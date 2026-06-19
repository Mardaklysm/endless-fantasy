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
import {
  WORLD_OBJECT_ATLAS,
  WORLD_OBJECT_CELLS,
  WORLD_OBJECT_ID_SET,
  WORLD_OBJECTS,
  worldObjectById
} from "../../src/data/worldObjects.ts";
import {
  DUNGEON_ATLAS,
  DUNGEON_ATLAS_SOURCE_INSET,
  DUNGEON_TILE_CELLS,
  DUNGEON_TILE_ID_SET,
  DUNGEON_TILE_IDS,
  DUNGEON_TILES,
  dungeonAtlasSourceRectWithInset,
  dungeonTileById
} from "../../src/data/dungeonTiles.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const ROAD_N = 1;
const ROAD_E = 2;
const ROAD_S = 4;
const ROAD_W = 8;
const ROAD_BITS = [ROAD_N, ROAD_E, ROAD_S, ROAD_W];

validateAtlasV3();
validateWorldObjects();
validateDungeonAtlas();
validateAtlasV3SourceInset();
validateRuntimeReferences();
validateRuntimeDebugInsetConsistency();
validateWorldgen();

console.log("atlas_v3, world object overlays, dungeon atlas, worldgen, and runtime reference validation passed.");

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
  assert(ATLAS_V3_NON_EMPTY_CELLS.length === 64, `Expected 64 non-empty atlas_v3 cells, got ${ATLAS_V3_NON_EMPTY_CELLS.length}.`);
  assert(ATLAS_V3_EMPTY_CELLS.length === 0, `Expected 0 empty atlas_v3 cells, got ${ATLAS_V3_EMPTY_CELLS.length}.`);

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
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.shallowWater), "shallow_water must be blocked.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.foamyShallowWater), "foamy_shallow_water must be blocked.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.rockyMountainGround), "rocky_mountain_ground must be blocked.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.volcanoMound), "volcano_mound must be blocked.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.lavaCrackedGround), "lava_cracked_ground must be blocked.");
  assert(isWorldTileWalkable(WORLD_TILE_IDS.gravelStoneGround), "gravel_stone_ground must be walkable.");
  assert(isWorldTileWalkable(WORLD_TILE_IDS.roadHorizontal), "road_horizontal must be walkable.");
  assert(isWorldTileWalkable(WORLD_TILE_IDS.beachSand), "beach_sand must be walkable.");
  assert(isWorldTileWalkable(WORLD_TILE_IDS.lightForest), "light_forest must be walkable.");
}

function validateWorldObjects() {
  const runtimeAtlasPath = path.join(PROJECT_ROOT, WORLD_OBJECT_ATLAS.image);
  const manifestPath = path.join(PROJECT_ROOT, WORLD_OBJECT_ATLAS.manifest);
  assert(fs.existsSync(runtimeAtlasPath), `Runtime world object atlas does not exist: ${WORLD_OBJECT_ATLAS.image}`);
  assert(fs.existsSync(manifestPath), `Runtime world object manifest does not exist: ${WORLD_OBJECT_ATLAS.manifest}`);

  const dimensions = readPngDimensions(runtimeAtlasPath);
  assert(WORLD_OBJECT_ATLAS.id === "world_objects", `Active world object atlas is ${WORLD_OBJECT_ATLAS.id}, expected world_objects.`);
  assert(WORLD_OBJECT_ATLAS.textureKey === "world_objects", `World object texture key is ${WORLD_OBJECT_ATLAS.textureKey}, expected world_objects.`);
  assert(WORLD_OBJECT_ATLAS.columns === 8 && WORLD_OBJECT_ATLAS.rows === 8, `World object grid is ${WORLD_OBJECT_ATLAS.columns}x${WORLD_OBJECT_ATLAS.rows}, expected 8x8.`);
  assert(WORLD_OBJECT_ATLAS.tileWidth === 128 && WORLD_OBJECT_ATLAS.tileHeight === 128, `World object cells are ${WORLD_OBJECT_ATLAS.tileWidth}x${WORLD_OBJECT_ATLAS.tileHeight}, expected 128x128.`);
  assert(dimensions.width === 1024 && dimensions.height === 1024, `world_objects dimensions changed unexpectedly: ${dimensions.width}x${dimensions.height}.`);
  assert(dimensions.colorType === 6 || dimensions.colorType === 4, `world_objects PNG color type ${dimensions.colorType} does not include alpha.`);
  assert(WORLD_OBJECT_CELLS.length === 64, `World object manifest has ${WORLD_OBJECT_CELLS.length} cells, expected 64.`);
  assert(Object.keys(WORLD_OBJECTS).length === 64, `World object manifest has ${Object.keys(WORLD_OBJECTS).length} objects, expected 64.`);

  const seenIds = new Set();
  for (const cell of WORLD_OBJECT_CELLS) {
    assert(cell.row >= 0 && cell.row < 8 && cell.col >= 0 && cell.col < 8, `World object ${cell.id} is outside the 8x8 grid.`);
    assert(cell.source.x === cell.col * WORLD_OBJECT_ATLAS.tileWidth, `World object ${cell.id} source x is not col * tileWidth.`);
    assert(cell.source.y === cell.row * WORLD_OBJECT_ATLAS.tileHeight, `World object ${cell.id} source y is not row * tileHeight.`);
    assert(cell.source.width === WORLD_OBJECT_ATLAS.tileWidth && cell.source.height === WORLD_OBJECT_ATLAS.tileHeight, `World object ${cell.id} source size is not 128x128.`);
    assert(!seenIds.has(cell.id), `Duplicate world object id: ${cell.id}`);
    seenIds.add(cell.id);
    assert(WORLD_OBJECT_ID_SET.has(cell.id), `World object ID set is missing ${cell.id}.`);
    assert(worldObjectById(cell.id), `World object lookup is missing ${cell.id}.`);
    assert(Array.isArray(cell.tags) && cell.tags.length > 0, `World object ${cell.id} has no tags.`);
  }
}

function validateDungeonAtlas() {
  const runtimeAtlasPath = path.join(PROJECT_ROOT, DUNGEON_ATLAS.image);
  const manifestPath = path.join(PROJECT_ROOT, DUNGEON_ATLAS.manifest);
  assert(fs.existsSync(runtimeAtlasPath), `Runtime dungeon atlas does not exist: ${DUNGEON_ATLAS.image}`);
  assert(fs.existsSync(manifestPath), `Runtime dungeon manifest does not exist: ${DUNGEON_ATLAS.manifest}`);

  const dimensions = readPngDimensions(runtimeAtlasPath);
  assert(DUNGEON_ATLAS.id === "dungeon_atlas", `Active dungeon atlas is ${DUNGEON_ATLAS.id}, expected dungeon_atlas.`);
  assert(DUNGEON_ATLAS.textureKey === "dungeon_atlas", `Dungeon texture key is ${DUNGEON_ATLAS.textureKey}, expected dungeon_atlas.`);
  assert(DUNGEON_ATLAS.columns === 8 && DUNGEON_ATLAS.rows === 8, `Dungeon grid is ${DUNGEON_ATLAS.columns}x${DUNGEON_ATLAS.rows}, expected 8x8.`);
  assert(DUNGEON_ATLAS.tileWidth === 128 && DUNGEON_ATLAS.tileHeight === 128, `Dungeon atlas cells are ${DUNGEON_ATLAS.tileWidth}x${DUNGEON_ATLAS.tileHeight}, expected 128x128.`);
  assert(DUNGEON_ATLAS.sourceInset === DUNGEON_ATLAS_SOURCE_INSET, "DUNGEON_ATLAS source inset does not match the shared inset constant.");
  assert(dimensions.width === 1024 && dimensions.height === 1024, `dungeon_atlas dimensions changed unexpectedly: ${dimensions.width}x${dimensions.height}.`);
  assert(dimensions.colorType === 2 || dimensions.colorType === 6, `dungeon_atlas PNG color type ${dimensions.colorType} should be opaque RGB or RGBA.`);
  assert(DUNGEON_TILE_CELLS.length === 64, `Dungeon atlas manifest has ${DUNGEON_TILE_CELLS.length} cells, expected 64.`);
  assert(Object.keys(DUNGEON_TILES).length === 64, `Dungeon atlas manifest has ${Object.keys(DUNGEON_TILES).length} tiles, expected 64.`);

  const required = [
    DUNGEON_TILE_IDS.plainGrayStoneFloor,
    DUNGEON_TILE_IDS.roughCaveWall,
    DUNGEON_TILE_IDS.paleIceFloor,
    DUNGEON_TILE_IDS.closedTreasureChestTile,
    DUNGEON_TILE_IDS.lockedIronGateClosed,
    DUNGEON_TILE_IDS.stairwayDown,
    DUNGEON_TILE_IDS.glowingBossRelicSeal,
    DUNGEON_TILE_IDS.lavaCrackedStoneFloor,
    DUNGEON_TILE_IDS.magicPortalExit
  ];
  for (const id of required) assert(DUNGEON_TILE_ID_SET.has(id), `Dungeon atlas is missing required tile ${id}.`);

  const seenIds = new Set();
  for (const cell of DUNGEON_TILE_CELLS) {
    assert(cell.row >= 0 && cell.row < 8 && cell.col >= 0 && cell.col < 8, `Dungeon tile ${cell.id} is outside the 8x8 grid.`);
    assert(cell.source.x === cell.col * DUNGEON_ATLAS.tileWidth, `Dungeon tile ${cell.id} source x is not col * tileWidth.`);
    assert(cell.source.y === cell.row * DUNGEON_ATLAS.tileHeight, `Dungeon tile ${cell.id} source y is not row * tileHeight.`);
    assert(cell.source.width === DUNGEON_ATLAS.tileWidth && cell.source.height === DUNGEON_ATLAS.tileHeight, `Dungeon tile ${cell.id} source size is not 128x128.`);
    assert(!seenIds.has(cell.id), `Duplicate dungeon tile id: ${cell.id}`);
    seenIds.add(cell.id);
    assert(DUNGEON_TILE_ID_SET.has(cell.id), `Dungeon tile ID set is missing ${cell.id}.`);
    assert(dungeonTileById(cell.id), `Dungeon tile lookup is missing ${cell.id}.`);
    assert(Array.isArray(cell.tags) && cell.tags.length > 0, `Dungeon tile ${cell.id} has no tags.`);
    const rect = dungeonAtlasSourceRectWithInset(cell.source);
    assert(rect.x === cell.source.x + DUNGEON_ATLAS_SOURCE_INSET, `Dungeon tile ${cell.id} inset source x is wrong.`);
    assert(rect.y === cell.source.y + DUNGEON_ATLAS_SOURCE_INSET, `Dungeon tile ${cell.id} inset source y is wrong.`);
    assert(rect.width === cell.source.width - DUNGEON_ATLAS_SOURCE_INSET * 2, `Dungeon tile ${cell.id} inset source width is wrong.`);
    assert(rect.height === cell.source.height - DUNGEON_ATLAS_SOURCE_INSET * 2, `Dungeon tile ${cell.id} inset source height is wrong.`);
  }
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
  const runtimeFiles = ["src/main.ts", "src/data/worldTiles.ts", "src/data/worldObjects.ts", "src/data/dungeonTiles.ts", "src/world/worldGenerator.ts"];
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
  assert(packageJson.scripts["import:dungeon-atlas"]?.includes("import_dungeon_atlas.mjs"), "package.json is missing the dungeon atlas import script.");

  const mainRuntime = fs.readFileSync(path.join(PROJECT_ROOT, "src/main.ts"), "utf8");
  const worldGeneratorRuntime = fs.readFileSync(path.join(PROJECT_ROOT, "src/world/worldGenerator.ts"), "utf8");
  assert(mainRuntime.includes("dungeonAtlasImageUrl"), "Runtime does not import the dungeon atlas image URL.");
  assert(mainRuntime.includes("DUNGEON_ATLAS_SOURCE_INSET"), "Runtime does not import/use the shared dungeon atlas source inset.");
  assert(mainRuntime.includes("dungeonAtlasSourceRectWithInset"), "Runtime does not use the dungeon atlas source rect helper.");
  assert(mainRuntime.includes("drawDungeonAtlasTile"), "Runtime does not have the dungeon atlas draw path.");
  assert(mainRuntime.includes("TOWN_SHOP_PAD_TILES"), "Runtime does not use dungeon atlas shop pads in towns.");
  assert(mainRuntime.includes("isDungeonWallEdge"), "Runtime does not cull unused dungeon wall filler into void.");
  assert(mainRuntime.includes("mapPixelW <= WIDTH"), "Runtime camera no longer centers maps smaller than the viewport.");
  assert(mainRuntime.includes("locationVisualSize"), "Runtime does not decouple overworld POI visual size from interaction footprint.");
  assert(mainRuntime.includes("dungeonEntranceSpawn"), "Runtime does not spawn dungeon entry from generated entrance markers.");
  assert(mainRuntime.includes("dungeonStairSpawn"), "Runtime does not spawn dungeon stairs from generated stair markers.");
  assert(mainRuntime.includes("ensureValidDungeonPosition"), "Runtime does not recover invalid dungeon positions.");
  assert(!mainRuntime.includes("You have already searched this place"), "Runtime still repeats cleared landmark messages.");
  assert(mainRuntime.includes("roadVisualsByKey"), "Runtime does not use generated road visual masks.");
  assert(mainRuntime.includes("drawRotatedWorldTileToCache"), "Runtime does not rotate missing road orientations in the terrain cache.");
  assert(mainRuntime.includes("roadVisual?.rotation"), "Runtime fallback tile drawing does not honor road visual rotation.");
  assert(worldGeneratorRuntime.includes("roadApproachPoint"), "Worldgen does not keep roads out of POI footprints.");
  assert(worldGeneratorRuntime.includes("findIslandRoadPath"), "Worldgen does not use the weighted road route finder.");
  assert(worldGeneratorRuntime.includes("validateRoadVisuals"), "Worldgen does not validate road visual masks.");
  assert(worldGeneratorRuntime.includes("roadVisualForMask"), "Worldgen does not map road masks through explicit visual specs.");
  const verticalStraightRoadCase = worldGeneratorRuntime.match(/case ROAD_N \| ROAD_S:[\s\S]*?(?=\n    case |\n    default:)/)?.[0] ?? "";
  assert(verticalStraightRoadCase.includes("WORLD_TILE_IDS.roadHorizontal") && verticalStraightRoadCase.includes("rotation: 90"), "N+S roads must use the clean horizontal road source rotated 90 degrees.");
  assert(!verticalStraightRoadCase.includes("WORLD_TILE_IDS.roadVertical"), "N+S roads still use the visually dirty road_vertical source cell.");
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
    assert(world.objectOverlays.length > 0, `World ${i} did not generate world object overlays.`);
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
      if (poi.kind !== "town") {
        assert(poi.objectId && WORLD_OBJECT_ID_SET.has(poi.objectId), `World ${i} POI ${poi.id} has invalid object overlay ${poi.objectId}.`);
      }
    }

    for (const overlay of world.objectOverlays) {
      assert(WORLD_OBJECT_ID_SET.has(overlay.objectId), `World ${i} object overlay ${overlay.id} has invalid object ${overlay.objectId}.`);
      assert(worldTileHasTag(world.tiles[overlay.y]?.[overlay.x], "water"), `World ${i} object overlay ${overlay.id} was not placed on water.`);
    }

    const roadKeys = new Set(world.roads.map((pos) => `${pos.x},${pos.y}`));
    const roadVisualsByKey = new Map(world.roadVisuals.map((visual) => [`${visual.x},${visual.y}`, visual]));
    assert(roadKeys.size === world.roads.length, `World ${i} recorded duplicate road tiles.`);
    assert(world.roadVisuals.length === world.roads.length, `World ${i} road visual count does not match road count.`);
    for (const road of world.roads) {
      const tile = world.tiles[road.y]?.[road.x];
      assert(worldTileHasTag(tile, "road"), `World ${i} road record ${road.x},${road.y} points at non-road tile ${tile}.`);
      assert(!worldTileHasTag(tile, "water"), `World ${i} road record ${road.x},${road.y} points at water.`);
      const visual = roadVisualsByKey.get(`${road.x},${road.y}`);
      assert(visual, `World ${i} road ${road.x},${road.y} has no visual.`);
      assert(visual.mask > 0, `World ${i} road ${road.x},${road.y} has no logical connections.`);
      assert(visual.roadMask === roadNeighborMask(roadKeys, road.x, road.y), `World ${i} road ${road.x},${road.y} has stale road neighbor mask.`);
      assert((visual.roadMask | visual.endpointMask) === visual.mask, `World ${i} road ${road.x},${road.y} visual mask is not road+endpoint mask.`);
      assert(rotateRoadMask(visual.sourceMask, visual.rotation) === visual.mask, `World ${i} road ${road.x},${road.y} source/rotation does not match mask.`);
      for (const bit of ROAD_BITS) {
        if ((visual.mask & bit) === 0) continue;
        const next = roadStep(road, bit);
        if (roadKeys.has(`${next.x},${next.y}`)) continue;
        assert((visual.endpointMask & bit) !== 0 && isAnyPoiFootprint(world.pois, next.x, next.y), `World ${i} road ${road.x},${road.y} visually connects into invalid ${roadBitName(bit)} tile ${next.x},${next.y}.`);
      }
    }
    for (const poi of world.pois) {
      for (const footprint of poiFootprintTiles(poi)) {
        const tile = world.tiles[footprint.y]?.[footprint.x];
        assert(!worldTileHasTag(tile, "road"), `World ${i} road was carved inside ${poi.id}'s footprint at ${footprint.x},${footprint.y}.`);
      }
    }

    let sawWater = false;
    let sawBlocked = false;
    let sawBeach = false;
    let sawForestBiome = false;
    let greenhavenGrassBase = 0;
    let greenhavenGrassPatch = 0;
    const directionalCoastTiles = new Set([
      WORLD_TILE_IDS.wetBeachSand,
      WORLD_TILE_IDS.grassSandCoast,
      WORLD_TILE_IDS.sandWaterEdge,
      WORLD_TILE_IDS.sandWaterCorner,
      WORLD_TILE_IDS.coveCoast,
      WORLD_TILE_IDS.foamyShallowWater
    ]);
    const greenhavenGrassPatchTiles = new Set([
      WORLD_TILE_IDS.brightGrass,
      WORLD_TILE_IDS.flowerMeadowGrass,
      WORLD_TILE_IDS.lushCloverGrass,
      WORLD_TILE_IDS.weedsGrass,
      WORLD_TILE_IDS.trampledGrass
    ]);
    for (let y = 0; y < world.tiles.length; y += 1) {
      const row = world.tiles[y];
      for (let x = 0; x < row.length; x += 1) {
        const tile = row[x];
        const isWorldEdge = x === 0 || y === 0 || x === world.width - 1 || y === world.height - 1;
        assert(WORLD_TILE_ID_SET.has(tile), `World ${i} generated unknown or empty tile ID ${tile}.`);
        const def = worldTileById(tile);
        assert(def, `World ${i} generated an atlas cell without a tile definition: ${tile}.`);
        assert(!directionalCoastTiles.has(tile), `World ${i} used directional coast/foam tile ${tile} directly in worldgen.`);
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
        if (world.islandByTile[y][x] === "greenhaven") {
          if (tile === WORLD_TILE_IDS.mediumGrass) greenhavenGrassBase += 1;
          if (greenhavenGrassPatchTiles.has(tile)) greenhavenGrassPatch += 1;
        }
        if (worldTileHasTag(tile, "sand")) sawBeach = true;
        if (world.biomes[y][x] === "forest") sawForestBiome = true;
      }
    }
    assert(sawWater, `World ${i} did not generate water.`);
    assert(sawBlocked, `World ${i} did not generate blocked terrain.`);
    assert(sawBeach, `World ${i} did not generate beaches.`);
    assert(sawForestBiome, `World ${i} did not generate forest/jungle biome hooks.`);
    assert(greenhavenGrassBase > greenhavenGrassPatch, `World ${i} Greenhaven overuses grass variants (${greenhavenGrassBase} base vs ${greenhavenGrassPatch} patch).`);

    const signature = world.tiles.map((row) => row.join(",")).join("|");
    if (i === 0) firstSignature = signature;
    else if (signature !== firstSignature) sawDifferentWorld = true;
  }

  const stableA = generateWorld({ seed: "atlas-v3-stable-seed" });
  const stableB = generateWorld({ seed: "atlas-v3-stable-seed" });
  const different = generateWorld({ seed: "atlas-v3-different-seed" });
  assert(JSON.stringify(stableA.tiles) === JSON.stringify(stableB.tiles), "Same seed produced different tile grids.");
  assert(JSON.stringify(stableA.pois) === JSON.stringify(stableB.pois), "Same seed produced different POIs.");
  assert(JSON.stringify(stableA.objectOverlays) === JSON.stringify(stableB.objectOverlays), "Same seed produced different object overlays.");
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

function poiFootprintTiles(poi) {
  const radius = Math.floor((poi.footprint ?? 1) / 2);
  const tiles = [];
  for (let y = poi.y - radius; y <= poi.y + radius; y += 1) {
    for (let x = poi.x - radius; x <= poi.x + radius; x += 1) tiles.push({ x, y });
  }
  return tiles;
}

function roadNeighborMask(roadKeys, x, y) {
  let mask = 0;
  if (roadKeys.has(`${x},${y - 1}`)) mask |= ROAD_N;
  if (roadKeys.has(`${x + 1},${y}`)) mask |= ROAD_E;
  if (roadKeys.has(`${x},${y + 1}`)) mask |= ROAD_S;
  if (roadKeys.has(`${x - 1},${y}`)) mask |= ROAD_W;
  return mask;
}

function rotateRoadMask(mask, rotation) {
  let rotated = mask;
  for (let i = 0; i < rotation / 90; i += 1) {
    let next = 0;
    if (rotated & ROAD_N) next |= ROAD_E;
    if (rotated & ROAD_E) next |= ROAD_S;
    if (rotated & ROAD_S) next |= ROAD_W;
    if (rotated & ROAD_W) next |= ROAD_N;
    rotated = next;
  }
  return rotated;
}

function roadStep(pos, bit) {
  if (bit === ROAD_N) return { x: pos.x, y: pos.y - 1 };
  if (bit === ROAD_E) return { x: pos.x + 1, y: pos.y };
  if (bit === ROAD_S) return { x: pos.x, y: pos.y + 1 };
  return { x: pos.x - 1, y: pos.y };
}

function roadBitName(bit) {
  if (bit === ROAD_N) return "north";
  if (bit === ROAD_E) return "east";
  if (bit === ROAD_S) return "south";
  return "west";
}

function isAnyPoiFootprint(pois, x, y) {
  return pois.some((poi) => poiFootprintTiles(poi).some((tile) => tile.x === x && tile.y === y));
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
    height: buffer.readUInt32BE(20),
    colorType: buffer[25]
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
