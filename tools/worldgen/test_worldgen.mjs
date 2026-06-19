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
  worldTileBlendGroup,
  worldTileById,
  worldTileHasTag
} from "../../src/data/worldTiles.ts";
import {
  BLACK_SEAM_REPAIR_DEV_OPTIONS,
  MAX_EDGE_SAMPLE_INSET,
  MIN_EDGE_SAMPLE_INSET,
  NEAR_BLACK_LUMINANCE_THRESHOLD,
  RELATIVE_DARKNESS_THRESHOLD,
  SEAM_SEARCH_RADIUS,
  repairBlackSeamsImageData
} from "../../src/world/terrainBlending.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

validateAtlasV3();
validateBlackSeamRepairMetadata();
validateRuntimeReferences();
validateWorldgen();
validateBlackSeamRepair();

console.log("atlas_v3 atlas, worldgen, and black seam repair validation passed.");

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

function validateBlackSeamRepairMetadata() {
  assert(BLACK_SEAM_REPAIR_DEV_OPTIONS.enabled === true, "Black seam repair should be enabled by default.");
  assert(BLACK_SEAM_REPAIR_DEV_OPTIONS.debugView === false, "Black seam repair debug view should be off by default.");
  assert(SEAM_SEARCH_RADIUS === 4, `Expected seam search radius 4, got ${SEAM_SEARCH_RADIUS}.`);
  assert(MIN_EDGE_SAMPLE_INSET === 3, `Expected min edge sample inset 3, got ${MIN_EDGE_SAMPLE_INSET}.`);
  assert(MAX_EDGE_SAMPLE_INSET === 8, `Expected max edge sample inset 8, got ${MAX_EDGE_SAMPLE_INSET}.`);
  assert(NEAR_BLACK_LUMINANCE_THRESHOLD === 38, `Expected near-black threshold 38, got ${NEAR_BLACK_LUMINANCE_THRESHOLD}.`);
  assert(RELATIVE_DARKNESS_THRESHOLD === 26, `Expected relative darkness threshold 26, got ${RELATIVE_DARKNESS_THRESHOLD}.`);
  assert(BLACK_SEAM_REPAIR_DEV_OPTIONS.seamSearchRadius === SEAM_SEARCH_RADIUS, "Black seam repair default search radius mismatch.");
  assert(BLACK_SEAM_REPAIR_DEV_OPTIONS.minEdgeSampleInset === MIN_EDGE_SAMPLE_INSET, "Black seam repair default min edge inset mismatch.");
  assert(BLACK_SEAM_REPAIR_DEV_OPTIONS.maxEdgeSampleInset === MAX_EDGE_SAMPLE_INSET, "Black seam repair default max edge inset mismatch.");
  assert(BLACK_SEAM_REPAIR_DEV_OPTIONS.nearBlackThreshold === NEAR_BLACK_LUMINANCE_THRESHOLD, "Black seam repair default threshold mismatch.");

  for (const tile of WORLD_TILE_DEFINITIONS) {
    assert(worldTileBlendGroup(tile.id), `Tile ${tile.id} has no blend group.`);
    assert(tile.blendGroup === worldTileBlendGroup(tile.id), `Tile ${tile.id} blend group does not match helper.`);
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

function validateBlackSeamRepair() {
  validateOnlyBlackSeamPixelsChange();
  validateInteriorSampleReplacement();
  validateNoBroadBandModification();
  validateSameTileSeamRepair();
  validateDarkTerrainSafety();
  validateDisabledRepairIsNoop();
  validateWaterVerticalLineRepair();
  validateWaterSameTileSeamRepair();
  validateOldPixelNotUsedAsSource();
  validateMaskIsThinLines();
}

function validateOnlyBlackSeamPixelsChange() {
  const tileSize = 32;
  const seamX = tileSize;
  const image = makeTwoTileImage(tileSize, [220, 40, 30, 255], [30, 180, 70, 255]);
  blackenRect(image, seamX - 1, 0, 3, tileSize);
  const before = cloneImage(image);
  const report = repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.brightGrass, WORLD_TILE_IDS.darkGrass]], {
    seed: "black-seam-only",
    tileSize,
    captureMask: true,
    enabled: true,
    debugView: false
  });
  assert(report.pixelsReplaced === 3 * tileSize, `Expected exactly the 3px black seam to be repaired, got ${report.pixelsReplaced}.`);
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const wasBlackSeam = x >= seamX - 1 && x <= seamX + 1;
      if (wasBlackSeam) {
        assert(report.mask[y * image.width + x] === 1, `Black seam pixel ${x},${y} was not marked repaired.`);
      } else {
        assertPixelsEqual(image, before, x, y, `Non-black pixel ${x},${y} was changed.`);
      }
    }
  }
}

function validateInteriorSampleReplacement() {
  const tileSize = 32;
  const seamX = tileSize;
  const leftInterior = [111, 12, 13, 255];
  const rightInterior = [17, 122, 19, 255];
  const image = makeTwoTileImage(tileSize, [200, 80, 70, 255], [50, 210, 90, 255]);
  fillRect(image, seamX - MIN_EDGE_SAMPLE_INSET - 1, 0, 3, tileSize, leftInterior);
  fillRect(image, seamX + MIN_EDGE_SAMPLE_INSET - 1, 0, 3, tileSize, rightInterior);
  blackenRect(image, seamX - 1, 0, 3, tileSize);
  repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.brightGrass, WORLD_TILE_IDS.darkGrass]], { seed: "interior-source", tileSize });
  assertColorEquals(pixelColor(image, seamX - 1, 16), weightedColor(leftInterior, rightInterior, sideWeight(-1)), "Left seam pixel did not mix both interior sources.");
  assertColorEquals(pixelColor(image, seamX, 16), weightedColor(leftInterior, rightInterior, sideWeight(0)), "Center seam pixel did not mix interior sources.");
  assertColorEquals(pixelColor(image, seamX + 1, 16), weightedColor(leftInterior, rightInterior, sideWeight(1)), "Right seam pixel did not mix both interior sources.");
}

function validateNoBroadBandModification() {
  const tileSize = 32;
  const seamX = tileSize;
  const image = makeTwoTileImage(tileSize, [160, 120, 80, 255], [70, 150, 210, 255]);
  blackenRect(image, seamX, 0, 1, tileSize);
  const before = cloneImage(image);
  const report = repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.brightGrass, WORLD_TILE_IDS.deepWater]], {
    seed: "no-broad-band",
    tileSize,
    captureMask: true
  });
  assert(report.pixelsReplaced === tileSize, `Expected one black seam column repaired, got ${report.pixelsReplaced}.`);
  assert(report.replacementRatio < 0.02, `Repair changed too many pixels: ${report.replacementRatio}.`);
  for (let y = 0; y < image.height; y += 1) {
    for (const x of [seamX - 2, seamX - 1, seamX + 1, seamX + 2]) {
      assertPixelsEqual(image, before, x, y, `Non-black seam-band pixel ${x},${y} was changed.`);
    }
  }
}

function validateSameTileSeamRepair() {
  const tileSize = 32;
  const seamX = tileSize;
  const image = makeTwoTileImage(tileSize, [84, 166, 70, 255], [84, 166, 70, 255]);
  blackenRect(image, seamX, 0, 1, tileSize);
  const report = repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.brightGrass, WORLD_TILE_IDS.brightGrass]], { seed: "same-tile-repair", tileSize });
  assert(report.pixelsReplaced === tileSize, "Same-tile black seam was not repaired exactly.");
  for (let y = 0; y < tileSize; y += 1) {
    assert(luminance(pixelColor(image, seamX, y)) > NEAR_BLACK_LUMINANCE_THRESHOLD, `Same-tile seam remains near black at y=${y}.`);
  }
}

function validateDarkTerrainSafety() {
  const tileSize = 32;
  const seamX = tileSize;
  const darkDetail = [42, 42, 42, 255];
  const image = makeTwoTileImage(tileSize, [64, 54, 72, 255], [70, 60, 76, 255]);
  fillRect(image, seamX - 2, 8, 1, 8, darkDetail);
  blackenRect(image, seamX, 0, 1, tileSize);
  blackenRect(image, 4, 4, 2, 2);
  const before = cloneImage(image);
  repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.ashBlackGround, WORLD_TILE_IDS.cursedPurpleGround]], { seed: "dark-safety", tileSize });
  for (let y = 8; y < 16; y += 1) {
    assertPixelsEqual(image, before, seamX - 2, y, `Non-black dark seam detail ${seamX - 2},${y} was changed.`);
  }
  for (let y = 4; y < 6; y += 1) {
    for (let x = 4; x < 6; x += 1) {
      assertPixelsEqual(image, before, x, y, `Near-black pixel away from a seam ${x},${y} was changed.`);
    }
  }
  assert(luminance(pixelColor(image, seamX, 16)) > NEAR_BLACK_LUMINANCE_THRESHOLD, "Actual black seam on dark terrain was not repaired.");
}

function validateDisabledRepairIsNoop() {
  const tileSize = 32;
  const seamX = tileSize;
  const image = makeTwoTileImage(tileSize, [100, 120, 80, 255], [80, 120, 160, 255]);
  blackenRect(image, seamX, 0, 1, tileSize);
  const before = cloneImage(image);
  const report = repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.brightGrass, WORLD_TILE_IDS.darkGrass]], { seed: "disabled", tileSize, enabled: false });
  assert(report.pixelsReplaced === 0, "Disabled repair should not replace pixels.");
  assert(Buffer.compare(image.data, before.data) === 0, "Disabled repair changed pixels.");
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

function makeSyntheticTerrainImage(world, tileSize) {
  const image = {
    width: world.width * tileSize,
    height: world.height * tileSize,
    data: Buffer.alloc(world.width * tileSize * world.height * tileSize * 4)
  };
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const color = colorForBlendGroup(worldTileBlendGroup(world.tiles[y][x]));
      fillSyntheticTile(image, x * tileSize, y * tileSize, tileSize, color);
    }
  }
  return image;
}

function fillSyntheticTile(image, x, y, tileSize, color) {
  for (let yy = 0; yy < tileSize; yy += 1) {
    for (let xx = 0; xx < tileSize; xx += 1) {
      const offset = ((y + yy) * image.width + x + xx) * 4;
      image.data[offset] = color[0] + ((xx + yy) % 2);
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = 255;
    }
  }
}

function colorForBlendGroup(group) {
  if (group === "desert") return [210, 168, 83];
  if (group === "snow") return [218, 232, 238];
  if (group === "ice") return [154, 204, 226];
  if (group === "dark") return [74, 58, 82];
  if (group === "water") return [40, 112, 190];
  if (group === "rock") return [102, 101, 92];
  if (group === "lava") return [210, 76, 42];
  return [83, 161, 70];
}

function cloneImage(image) {
  return { width: image.width, height: image.height, data: Buffer.from(image.data) };
}

function makeTwoTileImage(tileSize, leftColor, rightColor) {
  const image = makeSolidImage(tileSize * 2, tileSize, leftColor);
  fillRect(image, tileSize, 0, tileSize, tileSize, rightColor);
  return image;
}

function makeSolidImage(width, height, color) {
  const image = { width, height, data: Buffer.alloc(width * height * 4) };
  fillRect(image, 0, 0, width, height, color);
  return image;
}

function fillRect(image, x, y, width, height, color) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      const offset = (yy * image.width + xx) * 4;
      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = color[3];
    }
  }
}

function blackenRect(image, x, y, width, height) {
  fillRect(image, x, y, width, height, [0, 0, 0, 255]);
}

function pixelColor(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
}

function luminance(color) {
  return color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
}

function weightedColor(a, b, secondWeight) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * secondWeight),
    Math.round(a[1] + (b[1] - a[1]) * secondWeight),
    Math.round(a[2] + (b[2] - a[2]) * secondWeight)
  ];
}

function sideWeight(offset) {
  const normalized = Math.max(0, Math.min(1, (offset + SEAM_SEARCH_RADIUS) / (SEAM_SEARCH_RADIUS * 2)));
  return 0.3 + (0.7 - 0.3) * normalized;
}

function assertPixelsEqual(a, b, x, y, message) {
  const offset = (y * a.width + x) * 4;
  for (let channel = 0; channel < 4; channel += 1) {
    assert(a.data[offset + channel] === b.data[offset + channel], message);
  }
}

function assertColorEquals(actual, expected, message) {
  assert(actual[0] === expected[0] && actual[1] === expected[1] && actual[2] === expected[2], `${message} Got ${actual.join(",")}, expected ${expected.slice(0, 3).join(",")}.`);
}

// ─── New tests for improved seam repair ──────────────────────────────────

function validateWaterVerticalLineRepair() {
  // Simulate water tiles with a dark-but-not-black vertical seam line.
  // The dark line should be detected via relative darkness, not just near-black.
  const tileSize = 32;
  const seamX = tileSize;
  const waterBase = [30, 90, 150, 255];   // dark blue water
  const seamDark = [15, 55, 105, 255];     // darker seam line (not pure black)
  const image = makeTwoTileImage(tileSize, waterBase, waterBase);
  // Draw a 3px darker vertical line at the seam
  fillRect(image, seamX - 1, 0, 3, tileSize, seamDark);
  const before = cloneImage(image);

  const report = repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.deepWater, WORLD_TILE_IDS.deepWater]], {
    seed: "water-vertical-line",
    tileSize,
    captureMask: true,
    enabled: true
  });

  // The dark 3px seam line should be repaired
  assert(report.verticalSeamReplacementCount > 0, "Water vertical seam had no repairs.");
  assert(report.waterSeamReplacementCount > 0, "Water seam replacement counter not incremented.");

  // Verify the seam pixels were actually changed (not left dark)
  const repairedSeamLuminances = [];
  for (let y = 4; y < tileSize - 4; y += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const lum = luminance(pixelColor(image, seamX + dx, y));
      repairedSeamLuminances.push(lum);
    }
  }
  const avgRepairedLuminance = repairedSeamLuminances.reduce((a, b) => a + b, 0) / repairedSeamLuminances.length;
  const seamDarkLuminance = luminance(seamDark);
  assert(avgRepairedLuminance > seamDarkLuminance + 5, `Water seam still dark after repair (avg ${avgRepairedLuminance.toFixed(1)} vs dark ${seamDarkLuminance.toFixed(1)}).`);

  // Non-seam water pixels away from seam should be unchanged
  for (let y = 4; y < tileSize - 4; y += 1) {
    for (const distX of [5, 10, 20]) {
      assertPixelsEqual(image, before, seamX - distX, y, `Water pixel ${seamX - distX},${y} was changed away from seam.`);
      assertPixelsEqual(image, before, seamX + distX, y, `Water pixel ${seamX + distX},${y} was changed away from seam.`);
    }
  }

  // Mask should mark repaired pixels
  const repairedCount = countMaskPixels(report.mask, image.width, image.height);
  assert(repairedCount > 0, "Mask has no repaired pixels for water seam.");
  assert(repairedCount <= 5 * tileSize, `Mask has too many repaired pixels: ${repairedCount}.`);
}

function validateWaterSameTileSeamRepair() {
  // Same water tile next to itself with a dark seam.
  // Both sides are identical water, but the atlas edge creates a visible line.
  const tileSize = 32;
  const seamX = tileSize;
  const waterColor = [35, 95, 155, 255];
  const image = makeTwoTileImage(tileSize, waterColor, waterColor);
  // Darken the seam line (simulating atlas edge artifact)
  fillRect(image, seamX, 0, 2, tileSize, [18, 60, 110, 255]);
  const before = cloneImage(image);

  const report = repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.deepWater, WORLD_TILE_IDS.deepWater]], {
    seed: "water-same-tile",
    tileSize,
    captureMask: true,
    enabled: true
  });

  assert(report.sameTileSeamReplacementCount > 0, "Same-tile water seam counter not incremented.");
  assert(report.waterSeamReplacementCount > 0, "Water seam counter not incremented for same-tile.");

  // Seam should be repaired
  for (let y = 4; y < tileSize - 4; y += 1) {
    const seamLuminance = luminance(pixelColor(image, seamX, y));
    assert(seamLuminance > NEAR_BLACK_LUMINANCE_THRESHOLD, `Same-tile water seam at y=${y} still dark (lum=${seamLuminance.toFixed(1)}).`);
  }

  // Interior pixels unchanged
  for (let y = 4; y < tileSize - 4; y += 1) {
    for (const distX of [8, 16, 24]) {
      assertPixelsEqual(image, before, seamX - distX, y, `Same-tile water pixel left changed.`);
      assertPixelsEqual(image, before, seamX + distX, y, `Same-tile water pixel right changed.`);
    }
  }
}

function validateOldPixelNotUsedAsSource() {
  // The old seam pixel color must never appear in the replacement.
  // We verify by checking the repaired pixel is NOT a lerp from black.
  const tileSize = 32;
  const seamX = tileSize;
  const leftColor = [200, 50, 50, 255];   // bright red
  const rightColor = [50, 200, 50, 255];  // bright green
  const image = makeTwoTileImage(tileSize, leftColor, rightColor);
  // Pure black seam
  blackenRect(image, seamX, 0, 1, tileSize);

  repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.brightGrass, WORLD_TILE_IDS.darkGrass]], {
    seed: "no-old-pixel-source",
    tileSize,
    enabled: true
  });

  // The repaired seam should be a mix of red and green (≈ yellow/brown),
  // NOT a mix of black with either side (which would be dark red or dark green).
  for (let y = 4; y < tileSize - 4; y += 1) {
    const color = pixelColor(image, seamX, y);
    const lum = luminance(color);
    // If old black was used, luminance would be low. If clean mix, it should be bright.
    assert(lum > 60, `Repaired seam pixel at y=${y} appears to mix old black: ${color.join(",")} lum=${lum.toFixed(1)}.`);
    // The green channel should be significant (from right tile)
    assert(color[1] > 40, `Repaired seam pixel missing green component at y=${y}: ${color.join(",")}.`);
    // The red channel should be significant (from left tile)
    assert(color[0] > 40, `Repaired seam pixel missing red component at y=${y}: ${color.join(",")}.`);
  }
}

function validateMaskIsThinLines() {
  // The repair mask should show only thin seam lines, not broad bands.
  const tileSize = 32;
  const image = makeTwoTileImage(tileSize, [100, 160, 80, 255], [80, 120, 200, 255]);
  blackenRect(image, tileSize, 0, 1, tileSize);

  const report = repairBlackSeamsImageData(image, [[WORLD_TILE_IDS.brightGrass, WORLD_TILE_IDS.deepWater]], {
    seed: "mask-sanity",
    tileSize,
    captureMask: true,
    enabled: true
  });

  const maskWidth = image.width;
  const maskHeight = image.height;

  // Count mask pixels per column — the mask should be concentrated at the seam
  const colCounts = new Array(maskWidth).fill(0);
  for (let y = 0; y < maskHeight; y += 1) {
    for (let x = 0; x < maskWidth; x += 1) {
      if (report.mask[y * maskWidth + x]) colCounts[x] += 1;
    }
  }

  // The seam column should have the most repairs
  const seamColCount = colCounts[tileSize];
  assert(seamColCount >= tileSize * 0.8, `Seam column only has ${seamColCount}/${tileSize} mask pixels.`);

  // Columns more than 2px away from seam should have zero repairs
  for (let x = 0; x < maskWidth; x += 1) {
    if (Math.abs(x - tileSize) <= 2) continue;
    assert(colCounts[x] === 0, `Column ${x} has ${colCounts[x]} mask pixels outside seam band.`);
  }

  // Overall replacement ratio should be small
  assert(report.replacementRatio < 0.05, `Repair ratio ${report.replacementRatio.toFixed(4)} too high (expected < 5%).`);
}

function countMaskPixels(mask, width, height) {
  let count = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x]) count += 1;
    }
  }
  return count;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
