import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEMANTIC_BASE_TILE_PALETTE, TERRAIN_VARIANT_MODE, generateWorld, getIslandAt, isWorldPositionWalkable } from "../../src/world/worldGenerator.ts";
import { WORLD_ATLAS, WORLD_TILE_IDS, isWorldTileWalkable, worldTileById } from "../../src/data/worldTiles.ts";
import { WORLD_OBJECT_ATLAS, WORLD_OBJECT_ID_SET } from "../../src/data/worldObjects.ts";
import { DUNGEON_ATLAS } from "../../src/data/dungeonTiles.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER } from "../../src/world/semantic/semanticTypes.ts";
import { SEMANTIC_MASK_TEXTURE_TILE_IDS, describeSemanticMaskTerrainRenderPlan } from "../../src/world/semantic/semanticMaskTerrainRenderer.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const MAJOR_ISLAND_IDS = ["greenhaven", "coralreach", "frostmere", "highspire"];

validateRuntimeAssets();
validateSemanticWorldgen();

console.log("semantic worldgen runtime validation passed.");

function validateRuntimeAssets() {
  assertPng(WORLD_ATLAS.image, 1024, 1024, "active world atlas");
  assertPng(WORLD_OBJECT_ATLAS.image, 1024, 1024, "active world object atlas");
  assertPng(DUNGEON_ATLAS.image, 1024, 1024, "active dungeon atlas");
  assert(worldTileById(WORLD_TILE_IDS.deepWater), "deep water tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.shallowWater), "shallow water tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.beachSand), "beach tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.mediumGrass), "grass tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.brightSand), "sand tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.cleanSnow), "snow tile is missing.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.deepWater), "deep water must block walking.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.shallowWater), "shallow water must block walking.");
  assert(isWorldTileWalkable(WORLD_TILE_IDS.beachSand), "beach must be walkable.");
  assert(WORLD_OBJECT_ID_SET.has("small_mountain_peak"), "world object atlas lacks mountain overlay.");
  assert(WORLD_OBJECT_ID_SET.has("broadleaf_tree"), "world object atlas lacks forest overlay.");
  assert(WORLD_OBJECT_ID_SET.has("harbor_signpost"), "world object atlas lacks harbor overlay.");
}

function validateSemanticWorldgen() {
  const seed = "semantic-runtime-test-greenhaven";
  const worldA = generateWorld({ seed });
  const worldB = generateWorld({ seed });
  const worldC = generateWorld({ seed: "semantic-runtime-test-different" });

  assert(worldA.validation.valid, `Semantic validation failed: ${worldA.validation.errors.join("; ")}`);
  assert(worldA.semantic.validation.ok, `Semantic core validation failed: ${worldA.semantic.validation.errors.join("; ")}`);
  assert(stableSummary(worldA) === stableSummary(worldB), "Same seed did not reproduce the same semantic world.");
  assert(stableSummary(worldA) !== stableSummary(worldC), "Different seeds produced the same semantic world summary.");

  const majorIslands = worldA.islands.filter((island) => island.major);
  assert(majorIslands.length === 4, `Expected exactly 4 major islands, got ${majorIslands.length}.`);
  for (const id of MAJOR_ISLAND_IDS) {
    assert(majorIslands.some((island) => island.id === id), `Missing major island ${id}.`);
  }

  const starterIsland = worldA.islands.find((island) => island.id === "greenhaven");
  assert(starterIsland, "Starter island Greenhaven is missing.");
  assert(getIslandAt(worldA, worldA.startPosition.x, worldA.startPosition.y)?.id === "greenhaven", "Start position is not on Greenhaven.");
  assert(isWorldPositionWalkable(worldA, worldA.startPosition.x, worldA.startPosition.y), "Starter spawn is not walkable.");
  assert(!worldA.pois.some((poi) => poi.x === worldA.startPosition.x && poi.y === worldA.startPosition.y), "Starter spawn is on top of a POI.");

  const greenhavenSettlement = worldA.pois.find((poi) => poi.islandId === "greenhaven" && poi.kind === "town");
  assert(greenhavenSettlement, "Greenhaven has no settlement POI.");
  assert(isWorldPositionWalkable(worldA, greenhavenSettlement.x, greenhavenSettlement.y), "Greenhaven settlement is not walkable.");

  for (const id of MAJOR_ISLAND_IDS) {
    const harbor = worldA.pois.find((poi) => poi.islandId === id && poi.kind === "harbor");
    assert(harbor, `${id} has no harbor/travel point.`);
    assert(hasAdjacentWater(worldA, harbor.x, harbor.y, SEMANTIC_WATER.SHALLOW), `${harbor.id} is not adjacent to shallow water.`);
  }

  assert(worldA.roads.length > 0, "No runtime road overlays were generated.");
  assert(worldA.rivers.length > 0, "No runtime river overlays were generated.");
  assert(worldA.objectOverlays.some((overlay) => overlay.objectId === "small_mountain_peak" || overlay.objectId === "snowy_mountain_peak"), "No mountain overlays were generated.");
  assert(worldA.objectOverlays.some((overlay) => overlay.objectId === "broadleaf_tree" || overlay.objectId === "dark_pine_tree"), "No forest overlays were generated.");
  const mountainIndex = worldA.semantic.layers.mountainMap.findIndex((value) => value === 1);
  assert(mountainIndex >= 0, "No semantic mountain collision cells were generated.");
  assert(!isWorldPositionWalkable(worldA, mountainIndex % worldA.width, Math.floor(mountainIndex / worldA.width)), "Mountain overlay cell should block walking.");
  assert(worldA.semantic.layers.overlayCollisionPolicy[mountainIndex] === "hardBlock", "Mountain overlay should be tagged hardBlock.");
  const forestIndex = worldA.semantic.layers.forestMap.findIndex((value, index) => value === 1 && worldA.semantic.layers.roadMap[index] === 0);
  assert(forestIndex >= 0, "No semantic forest soft-terrain cells were generated.");
  assert(isWorldPositionWalkable(worldA, forestIndex % worldA.width, Math.floor(forestIndex / worldA.width)), "Forest overlay cell should stay walkable.");
  assert(worldA.semantic.layers.overlayCollisionPolicy[forestIndex] === "softTerrain", "Forest overlay should be tagged softTerrain.");
  const poiPolicyIndex = worldA.pois[0].y * worldA.width + worldA.pois[0].x;
  assert(worldA.semantic.layers.overlayCollisionPolicy[poiPolicyIndex] === "poiBlock", "POI cells should be tagged poiBlock for debug/interaction policy.");
  assert(worldA.objectOverlays.every((overlay) => ["visualOnly", "softTerrain", "hardBlock", "poiBlock"].includes(overlay.collisionPolicy)), "Object overlays are missing collision policies.");

  validateIslandOverlayRules(worldA);
  validateCanonicalTerrainPalette(worldA);
  validateBeachBand(worldA);
  validatePois(worldA);
  validateRoadConnections(worldA);
  validateRoadAndForestPolicies(worldA);
  validateSemanticMaskTerrainRendererPlan(worldA);
}

function validateIslandOverlayRules(world) {
  const mountainCounts = new Map();
  const snowCounts = new Map();
  for (const mountain of world.semantic.mountains) {
    mountainCounts.set(mountain.islandId, (mountainCounts.get(mountain.islandId) ?? 0) + 1);
    if (mountain.kind === "snow_mountain") snowCounts.set(mountain.islandId, (snowCounts.get(mountain.islandId) ?? 0) + 1);
    const island = world.semantic.islands.find((candidate) => candidate.id === mountain.islandId);
    assert(island, `Mountain references missing island ${mountain.islandId}.`);
    const i = mountain.y * world.width + mountain.x;
    if (mountain.kind === "snow_mountain") {
      assert(island.overlayRules.allowSnowMountains, `Snow mountain appeared on non-snow island ${island.id}.`);
      assert(world.semantic.layers.biome[i] === SEMANTIC_BIOME.ICE, `Snow mountain on ${island.id} is not on snow/ice terrain.`);
    }
  }
  for (const island of world.semantic.islands) {
    assert((mountainCounts.get(island.id) ?? 0) <= island.overlayRules.mountainCap, `${island.id} exceeded mountain cap.`);
  }
  assert((snowCounts.get("greenhaven") ?? 0) === 0, "Greenhaven must not have snow mountains.");
  assert((snowCounts.get("coralreach") ?? 0) === 0, "Coralreach must not have snow mountains.");
  assert((mountainCounts.get("greenhaven") ?? 0) <= 2, "Greenhaven has too many mountains.");
}

function validateCanonicalTerrainPalette(world) {
  assert(TERRAIN_VARIANT_MODE === "off", `Normal terrain variant mode must be off, got ${TERRAIN_VARIANT_MODE}.`);
  const tilesBySemantic = {
    deepOcean: new Set(),
    shallowWater: new Set(),
    beach: new Set(),
    grassland: new Set(),
    sand: new Set(),
    ice: new Set()
  };
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = y * world.width + x;
      const tile = world.tiles[y][x];
      if (!world.semantic.layers.landMask[i]) {
        if (world.semantic.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW) tilesBySemantic.shallowWater.add(tile);
        else tilesBySemantic.deepOcean.add(tile);
        continue;
      }
      if (world.semantic.layers.lakeMap[i]) {
        tilesBySemantic.shallowWater.add(tile);
        continue;
      }
      const biome = world.semantic.layers.biome[i];
      if (biome === SEMANTIC_BIOME.BEACH) tilesBySemantic.beach.add(tile);
      else if (biome === SEMANTIC_BIOME.SAND) tilesBySemantic.sand.add(tile);
      else if (biome === SEMANTIC_BIOME.ICE) tilesBySemantic.ice.add(tile);
      else if (biome === SEMANTIC_BIOME.GRASS) tilesBySemantic.grassland.add(tile);
    }
  }
  assertSingleTileSet(tilesBySemantic.deepOcean, SEMANTIC_BASE_TILE_PALETTE.deepOcean, "deep ocean");
  assertSingleTileSet(tilesBySemantic.shallowWater, SEMANTIC_BASE_TILE_PALETTE.shallowWater, "shallow water");
  assertSingleTileSet(tilesBySemantic.beach, SEMANTIC_BASE_TILE_PALETTE.beach, "beach");
  assertSingleTileSet(tilesBySemantic.grassland, SEMANTIC_BASE_TILE_PALETTE.grassland, "grassland");
  assertSingleTileSet(tilesBySemantic.sand, SEMANTIC_BASE_TILE_PALETTE.sand, "sand/desert");
  assertSingleTileSet(tilesBySemantic.ice, SEMANTIC_BASE_TILE_PALETTE.ice, "ice/snow");
}

function validateBeachBand(world) {
  for (let y = 1; y < world.height - 1; y += 1) {
    for (let x = 1; x < world.width - 1; x += 1) {
      const i = y * world.width + x;
      if (!world.semantic.layers.landMask[i]) continue;
      const touchesWater = neighbors4(x, y).some((next) => world.semantic.layers.waterClass[next.y * world.width + next.x] !== SEMANTIC_WATER.NONE);
      if (touchesWater) {
        assert(world.semantic.layers.biome[i] === SEMANTIC_BIOME.BEACH, `Non-beach land touches water at ${x},${y}.`);
      }
    }
  }
}

function validatePois(world) {
  for (const poi of world.pois) {
    const i = poi.y * world.width + poi.x;
    assert(world.semantic.layers.waterClass[i] === SEMANTIC_WATER.NONE, `POI ${poi.id} spawned on blocked water.`);
    assert(world.semantic.layers.landMask[i] === 1, `POI ${poi.id} is not on land.`);
    assert(isWorldPositionWalkable(world, poi.x, poi.y), `POI ${poi.id} is not reachable/walkable.`);
    assert(hasAdjacentWalkable(world, poi.x, poi.y) || isWorldPositionWalkable(world, poi.x, poi.y), `POI ${poi.id} has no walkable approach.`);
  }
}

function validateRoadConnections(world) {
  const requiredEdges = world.semantic.roadGraph.edges.filter((edge) => {
    const from = world.semantic.poiList.find((poi) => poi.id === edge.from);
    const to = world.semantic.poiList.find((poi) => poi.id === edge.to);
    return from?.role === "settlement" && (to?.role === "port" || to?.role === "dungeon" || to?.role === "gate" || to?.role === "final");
  });
  assert(requiredEdges.length >= 4, "Expected road graph edges from settlements to important POIs.");
  for (const edge of requiredEdges) {
    assert(edge.connected, `Required road edge ${edge.from} -> ${edge.to} is disconnected.`);
    assert(edge.path.length > 1, `Required road edge ${edge.from} -> ${edge.to} has no path.`);
  }
  for (const islandId of MAJOR_ISLAND_IDS) {
    const settlement = world.semantic.poiList.find((poi) => poi.islandId === islandId && poi.role === "settlement");
    const port = world.semantic.poiList.find((poi) => poi.islandId === islandId && poi.role === "port");
    assert(settlement && port, `${islandId} is missing settlement or port.`);
    const edge = world.semantic.roadGraph.edges.find((candidate) => candidate.from === settlement.id && candidate.to === port.id);
    assert(edge?.connected, `${islandId} settlement is not road-connected to its port.`);
  }
}

function validateRoadAndForestPolicies(world) {
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = y * world.width + x;
      if (world.semantic.layers.roadMap[i]) {
        assert(isWorldPositionWalkable(world, x, y), `Road at ${x},${y} is blocked.`);
        assert(!world.semantic.layers.mountainMap[i], `Mountain overlaps road at ${x},${y}.`);
        assert(!world.semantic.layers.forestMap[i], `Forest overlaps road at ${x},${y}.`);
      }
      if (world.semantic.layers.forestMap[i]) {
        assert(isWorldPositionWalkable(world, x, y), `Forest at ${x},${y} blocks walking.`);
      }
    }
  }
}

function validateSemanticMaskTerrainRendererPlan(world) {
  const before = stableSummary(world);
  const plan = describeSemanticMaskTerrainRenderPlan(world.semantic, { tileSize: 32, maskPixelsPerCell: 16 });
  const after = stableSummary(world);
  assert(plan.width === world.width * 32, `Semantic mask terrain texture width expected ${world.width * 32}, got ${plan.width}.`);
  assert(plan.height === world.height * 32, `Semantic mask terrain texture height expected ${world.height * 32}, got ${plan.height}.`);
  assert(plan.maskPixelsPerCell === 16, `Semantic mask terrain should render 16 mask samples per cell, got ${plan.maskPixelsPerCell}.`);
  assert(plan.pixelBlock === 2, `Semantic mask terrain should render 2px mask blocks at 32px tiles, got ${plan.pixelBlock}.`);
  for (const [terrainClass, tileId] of Object.entries(SEMANTIC_MASK_TEXTURE_TILE_IDS)) {
    assert(tileId === SEMANTIC_BASE_TILE_PALETTE[terrainClass] || (terrainClass === "shallowWater" && tileId === SEMANTIC_BASE_TILE_PALETTE.shallowWater), `${terrainClass} mask texture source should match the canonical palette.`);
    assert(plan.classSamples[terrainClass] > 0, `Semantic mask terrain plan found no ${terrainClass} samples.`);
  }
  assert(plan.waterBeachBoundarySamples > 0, "Semantic mask terrain plan found no water/beach boundaries.");
  assert(plan.sandGrassBoundarySamples > 0, "Semantic mask terrain plan found no sand/grass boundaries.");
  assert(before === after, "Semantic mask terrain planning mutated the generated world.");
}

function stableSummary(world) {
  return JSON.stringify({
    seed: world.seed,
    tiles: world.tiles,
    islands: world.islands.map((island) => ({ id: island.id, bounds: island.bounds, town: island.townPosition, harbor: island.harborPosition })),
    pois: world.pois.map((poi) => ({ id: poi.id, kind: poi.kind, islandId: poi.islandId, x: poi.x, y: poi.y })),
    roads: world.roads,
    rivers: world.rivers.map((river) => river.length),
    start: world.startPosition,
    stats: world.semantic.stats
  });
}

function hasAdjacentWater(world, x, y, value) {
  return neighbors4(x, y).some((next) => {
    if (next.x < 0 || next.y < 0 || next.x >= world.width || next.y >= world.height) return false;
    return world.semantic.layers.waterClass[next.y * world.width + next.x] === value;
  });
}

function hasAdjacentWalkable(world, x, y) {
  return neighbors4(x, y).some((next) => {
    if (next.x < 0 || next.y < 0 || next.x >= world.width || next.y >= world.height) return false;
    return isWorldPositionWalkable(world, next.x, next.y);
  });
}

function neighbors4(x, y) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y }
  ];
}

function assertPng(relativePath, expectedWidth, expectedHeight, label) {
  const filePath = path.join(PROJECT_ROOT, relativePath);
  assert(fs.existsSync(filePath), `${label} is missing at ${relativePath}.`);
  const dimensions = readPngDimensions(filePath);
  assert(dimensions.width === expectedWidth && dimensions.height === expectedHeight, `${label} expected ${expectedWidth}x${expectedHeight}, got ${dimensions.width}x${dimensions.height}.`);
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert(buffer.toString("ascii", 1, 4) === "PNG", `${filePath} is not a PNG.`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertSingleTileSet(tileSet, expectedTileId, label) {
  assert(tileSet.size > 0, `No ${label} cells were found for canonical tile validation.`);
  assert(tileSet.size === 1 && tileSet.has(expectedTileId), `${label} should use only ${expectedTileId}; got ${[...tileSet].join(", ")}.`);
}
