import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEMANTIC_BASE_TILE_PALETTE, TERRAIN_VARIANT_MODE, generateWorld, getIslandAt, isWorldPositionWalkable } from "../../src/world/worldGenerator.ts";
import { WORLD_TILE_IDS, isWorldTileWalkable, worldTileById } from "../../src/data/worldTiles.ts";
import { WORLD_OBJECT_ID_SET } from "../../src/data/worldObjects.ts";
import {
  WORLD_CURRENT_ASSET_BY_TEXTURE_KEY,
  WORLD_CURRENT_ASSET_MANIFEST,
  WORLD_CURRENT_ASSETS,
  WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID,
  WORLD_CURRENT_POI_TEXTURE_KEYS,
  WORLD_CURRENT_ROUTE_TEXTURE_KEYS,
  WORLD_CURRENT_TERRAIN_TEXTURE_KEYS,
  worldCurrentPoiTextureKeyFor
} from "../../src/data/worldCurrentAssets.ts";
import { DUNGEON_ATLAS } from "../../src/data/dungeonTiles.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER } from "../../src/world/semantic/semanticTypes.ts";
import { SEMANTIC_MASK_TERRAIN_CLASSES, describeSemanticMaskTerrainRenderPlan } from "../../src/world/semantic/semanticMaskTerrainRenderer.ts";
import { describeSemanticRouteRenderPlan } from "../../src/world/semantic/semanticRouteRenderer.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const MAJOR_ISLAND_IDS = ["greenhaven", "coralreach", "frostmere", "highspire"];

validateRuntimeAssets();
validateSemanticWorldgen();

console.log("semantic worldgen runtime validation passed.");

function validateRuntimeAssets() {
  assertPng(DUNGEON_ATLAS.image, 1024, 1024, "active dungeon atlas");
  validateCurrentWorldAssetManifest();
  validateNoDeprecatedRuntimeAtlasReferences();
  assert(worldTileById(WORLD_TILE_IDS.deepWater), "deep water tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.shallowWater), "shallow water tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.beachSand), "beach tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.mediumGrass), "grass tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.brightSand), "sand tile is missing.");
  assert(worldTileById(WORLD_TILE_IDS.cleanSnow), "snow tile is missing.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.deepWater), "deep water must block walking.");
  assert(!isWorldTileWalkable(WORLD_TILE_IDS.shallowWater), "shallow water must block walking.");
  assert(isWorldTileWalkable(WORLD_TILE_IDS.beachSand), "beach must be walkable.");
  assert(WORLD_OBJECT_ID_SET.has("small_mountain_peak"), "world object registry lacks mountain overlay ID.");
  assert(WORLD_OBJECT_ID_SET.has("broadleaf_tree"), "world object registry lacks forest overlay ID.");
  assert(WORLD_OBJECT_ID_SET.has("harbor_signpost"), "world object registry lacks harbor overlay ID.");
}

function validateCurrentWorldAssetManifest() {
  assert(WORLD_CURRENT_ASSET_MANIFEST.rendererContract.semanticWorldGenerationIsGameplayTruth, "current world manifest must preserve semantic worldgen as truth.");
  assert(WORLD_CURRENT_ASSET_MANIFEST.rendererContract.baseTerrainUsesSemanticMaskFills, "current world manifest must mark semantic mask terrain fills active.");
  assert(WORLD_CURRENT_ASSET_MANIFEST.rendererContract.roadsRiversCoastsMountainsForestsPoisAreOverlays, "current world manifest must keep roads/rivers/POIs as overlays.");
  assert(!WORLD_CURRENT_ASSET_MANIFEST.rendererContract.randomBaseTerrainVariantSpam, "current world manifest must keep random base terrain variants disabled.");
  assert(WORLD_CURRENT_ASSET_MANIFEST.sourcePack.approvedTerrainMaterialCount === 37, "current world manifest should record 37 approved terrain fills.");
  const terrainAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.assetKind === "terrain fill");
  assert(terrainAssets.length === 37, `Expected 37 current terrain fill assets, got ${terrainAssets.length}.`);
  const worldObjectAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.assetKind === "world object");
  assert(worldObjectAssets.length > 0, "Expected approved current-folder world object assets.");
  assert(
    WORLD_CURRENT_ASSET_MANIFEST.sourcePack.approvedWorldObjectCount === worldObjectAssets.length,
    `Current manifest approved object count does not match object assets (${WORLD_CURRENT_ASSET_MANIFEST.sourcePack.approvedWorldObjectCount} vs ${worldObjectAssets.length}).`
  );
  assert(
    WORLD_CURRENT_ASSET_MANIFEST.missingRuntimeRoles.length > 0,
    "Current world manifest should document roles that still rely on existing-object or procedural fallbacks."
  );
  for (const asset of WORLD_CURRENT_ASSETS) {
    assert(WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[asset.textureKey] === asset, `Texture key lookup failed for ${asset.textureKey}.`);
    assert(!asset.magentaKeyRemovalNeeded, `${asset.id} should not need runtime magenta removal.`);
    assert(asset.scaleCropPadNeeded === "none", `${asset.id} should not require runtime scaling/cropping/padding normalization.`);
    assertPng(path.join(WORLD_CURRENT_ASSET_MANIFEST.runtimeRoot, asset.filename), asset.dimensions.width, asset.dimensions.height, `current world asset ${asset.id}`);
    if (asset.assetKind === "terrain fill") {
      assert(asset.qualityFlag === "approved" && !asset.placeholder, `${asset.id} must be an approved terrain fill, not a placeholder.`);
      assert(asset.dimensions.width === 256 && asset.dimensions.height === 256, `${asset.id} terrain fill must be 256x256.`);
    }
    if (asset.assetKind === "world object") {
      assert(asset.qualityFlag === "approved" && !asset.placeholder, `${asset.id} must be an approved world object, not a placeholder.`);
      assert(
        asset.source === "world_objects_v2" || asset.source === "world_objects_v2_relaxed",
        `${asset.id} should record an approved world object source.`
      );
      assert(asset.transparencyStatus === "alpha", `${asset.id} world object should be transparent.`);
      assert(asset.dimensions.width === 256 && asset.dimensions.height === 256, `${asset.id} world object must be normalized to 256x256.`);
      assert(asset.backgroundRemovalMethod, `${asset.id} should record its background removal method.`);
      if (asset.source === "world_objects_v2_relaxed") {
        assert(asset.qualityBucket === "game_ready", `${asset.id} relaxed runtime objects must be game_ready.`);
      }
    }
  }
  const approvedObjectFilenames = new Set(worldObjectAssets.map((asset) => path.basename(asset.filename)));
  const objectRuntimeFolder = path.join(PROJECT_ROOT, WORLD_CURRENT_ASSET_MANIFEST.runtimeRoot, "objects");
  const runtimeObjectFiles = fs.existsSync(objectRuntimeFolder) ? fs.readdirSync(objectRuntimeFolder).filter((filename) => filename.endsWith(".png")) : [];
  assert(runtimeObjectFiles.length === worldObjectAssets.length, `Runtime object folder has ${runtimeObjectFiles.length} PNGs, expected ${worldObjectAssets.length}.`);
  for (const filename of runtimeObjectFiles) {
    assert(approvedObjectFilenames.has(filename), `Runtime object folder contains unapproved object file ${filename}.`);
  }
  for (const terrainClass of SEMANTIC_MASK_TERRAIN_CLASSES) {
    const textureKey = WORLD_CURRENT_TERRAIN_TEXTURE_KEYS[terrainClass];
    const asset = WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey];
    assert(asset, `${terrainClass} is not mapped to a current world asset.`);
    assert(asset.assetKind === "terrain fill" && asset.qualityFlag === "approved", `${terrainClass} must map to an approved terrain fill.`);
  }
  for (const objectId of [
    "small_mountain_peak",
    "snowy_mountain_peak",
    "broadleaf_tree",
    "dark_pine_tree",
    "dense_jungle_bush",
    "harbor_signpost",
    "supply_crates",
    "barrel_stack",
    "thorn_bramble"
  ]) {
    const textureKey = WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID[objectId];
    const asset = textureKey ? WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey] : undefined;
    assert(asset, `Object ${objectId} lacks a current texture mapping.`);
    if (objectId !== "harbor_signpost") {
      assert(asset.assetKind === "world object" && asset.qualityFlag === "approved", `Object ${objectId} should map to an approved world object.`);
    }
  }
  for (const poiKind of ["town", "harbor", "cave", "shrine", "ruins", "tower", "gate", "final"]) {
    const textureKey = WORLD_CURRENT_POI_TEXTURE_KEYS[poiKind];
    assert(textureKey && WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey], `POI kind ${poiKind} lacks a current texture mapping.`);
  }
  for (const routeKey of ["dockHorizontal", "dockVertical", "bridgeHorizontal", "bridgeVertical"]) {
    const textureKey = WORLD_CURRENT_ROUTE_TEXTURE_KEYS[routeKey];
    assert(textureKey && WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey], `Route key ${routeKey} lacks a current texture mapping.`);
  }
  for (const textureKey of [
    WORLD_CURRENT_POI_TEXTURE_KEYS.town,
    WORLD_CURRENT_POI_TEXTURE_KEYS.harbor,
    WORLD_CURRENT_POI_TEXTURE_KEYS.shrine,
    WORLD_CURRENT_POI_TEXTURE_KEYS.ruins,
    WORLD_CURRENT_POI_TEXTURE_KEYS.tower
  ]) {
    const asset = WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey];
    assert(asset?.source === "world_objects_v2_relaxed", `Settlement-corrected POI texture ${textureKey} should come from the relaxed game-ready set.`);
  }
  assert(
    WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[WORLD_CURRENT_ROUTE_TEXTURE_KEYS.bridgeHorizontal].source === "world_objects_v2_relaxed",
    "Horizontal bridge route stamp should map to the relaxed game-ready bridge object."
  );
  assert(
    WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[WORLD_CURRENT_ROUTE_TEXTURE_KEYS.dockHorizontal].assetKind === "world object",
    "Horizontal dock route stamp should map to the approved object pack."
  );
}

function validateNoDeprecatedRuntimeAtlasReferences() {
  const activeFiles = [
    "src/main.ts",
    "src/world/semantic/semanticMaskTerrainRenderer.ts",
    "src/data/worldTiles.ts",
    "src/data/worldObjects.ts",
    "src/data/worldCurrentAssets.ts"
  ];
  const forbidden = ["atlas_v3", "world_objects", "pier_atlas", "WORLD_ATLAS", "WORLD_OBJECT_ATLAS", "atlasV3SourceRectWithInset", "SEMANTIC_MASK_TEXTURE_TILE_IDS"];
  for (const relativePath of activeFiles) {
    const text = fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
    for (const token of forbidden) {
      assert(!text.includes(token), `${relativePath} still references deprecated runtime atlas token ${token}.`);
    }
  }
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
  assert(!hasNearbyMountain(worldA, worldA.startPosition.x, worldA.startPosition.y, 2), "Starter spawn is too close to mountain collision.");

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
  assert(worldA.semantic.roadGraph.edges.length > 0, "Semantic road graph data is missing.");
  assert(worldA.semantic.rivers.length > 0, "Semantic river data is missing.");
  assert(worldA.objectOverlays.some((overlay) => overlay.objectId === "small_mountain_peak" || overlay.objectId === "snowy_mountain_peak"), "No mountain overlays were generated.");
  assert(worldA.objectOverlays.some((overlay) => overlay.objectId === "broadleaf_tree" || overlay.objectId === "dark_pine_tree"), "No forest overlays were generated.");
  const mountainIndex = worldA.semantic.layers.mountainMap.findIndex((value) => value === 1);
  assert(mountainIndex >= 0, "No semantic mountain collision cells were generated.");
  assert(!isWorldPositionWalkable(worldA, mountainIndex % worldA.width, Math.floor(mountainIndex / worldA.width)), "Mountain overlay cell should block walking.");
  assert(worldA.semantic.layers.overlayCollisionPolicy[mountainIndex] === "hardBlock", "Mountain overlay should be tagged hardBlock.");
  const forestIndex = worldA.semantic.layers.forestMap.findIndex((value, index) => value === 1 && worldA.semantic.layers.roadMap[index] === 0 && worldA.semantic.layers.overlayCollisionPolicy[index] === "softTerrain");
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
  validateSemanticRouteRendererPlan(worldA);
}

function validateIslandOverlayRules(world) {
  const mountainCounts = new Map();
  const snowCounts = new Map();
  const rangeCellCount = world.semantic.mountainRanges.reduce((sum, range) => sum + range.cells.length, 0);
  assert(world.semantic.mountainRanges.length > 0, "No semantic mountain ranges were generated.");
  assert(rangeCellCount === world.semantic.mountains.length, "Mountain range cells do not match flat mountain overlays.");
  if (world.semantic.mountains.length >= 4) {
    assert(world.semantic.mountainRanges.length < world.semantic.mountains.length, "Mountains were not grouped into multi-cell ranges.");
  }
  for (const range of world.semantic.mountainRanges) {
    const island = world.semantic.islands.find((candidate) => candidate.id === range.islandId);
    assert(island, `Mountain range references missing island ${range.islandId}.`);
    assert(range.cells.length >= 2 || range.smallOutcrop, `${range.id} is a one-cell range without explicit smallOutcrop.`);
    assert(range.collisionCells.length === range.cells.length, `${range.id} collision cells should match accepted mountain cells.`);
    assert(range.bounds.minX <= range.bounds.maxX && range.bounds.minY <= range.bounds.maxY, `${range.id} has invalid bounds.`);
    if (range.kind === "snow_mountain") assert(island.overlayRules.allowSnowMountains, `${range.id} is snowy on a non-snow island.`);
    for (const cell of range.collisionCells) {
      const i = cell.y * world.width + cell.x;
      assert(world.semantic.layers.mountainMap[i] === 1, `${range.id} collision cell is not hard-blocked in mountainMap.`);
    }
  }
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
  assert((mountainCounts.get("coralreach") ?? 0) <= 3, "Coralreach has too many mountains.");
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
    const textureKey = worldCurrentPoiTextureKeyFor(poi);
    assert(textureKey && WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey], `POI ${poi.id} lacks a current texture mapping.`);
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
      if (world.semantic.layers.riverMap[i]) {
        assert(!world.semantic.layers.mountainMap[i], `Mountain overlaps river at ${x},${y}.`);
      }
      if (world.semantic.layers.forestMap[i]) {
        assert(isWorldPositionWalkable(world, x, y), `Forest at ${x},${y} blocks walking.`);
      }
    }
  }
}

function validateSemanticMaskTerrainRendererPlan(world) {
  const before = stableSummary(world);
  const plan = describeSemanticMaskTerrainRenderPlan(world.semantic, { tileSize: 32, maskPixelsPerCell: 16, terrainSourceLabels: WORLD_CURRENT_TERRAIN_TEXTURE_KEYS });
  const after = stableSummary(world);
  assert(plan.width === world.width * 32, `Semantic mask terrain texture width expected ${world.width * 32}, got ${plan.width}.`);
  assert(plan.height === world.height * 32, `Semantic mask terrain texture height expected ${world.height * 32}, got ${plan.height}.`);
  assert(plan.maskPixelsPerCell === 16, `Semantic mask terrain should render 16 mask samples per cell, got ${plan.maskPixelsPerCell}.`);
  assert(plan.pixelBlock === 2, `Semantic mask terrain should render 2px mask blocks at 32px tiles, got ${plan.pixelBlock}.`);
  for (const terrainClass of SEMANTIC_MASK_TERRAIN_CLASSES) {
    const textureKey = WORLD_CURRENT_TERRAIN_TEXTURE_KEYS[terrainClass];
    assert(textureKey, `${terrainClass} mask texture source should be mapped to a current material.`);
    assert(plan.textureSourceLabels[terrainClass] === textureKey, `${terrainClass} mask texture source should match the current material manifest.`);
    assert(SEMANTIC_BASE_TILE_PALETTE[terrainClass], `${terrainClass} should still have a semantic compatibility tile ID.`);
    assert(plan.classSamples[terrainClass] > 0, `Semantic mask terrain plan found no ${terrainClass} samples.`);
  }
  assert(plan.waterBeachBoundarySamples > 0, "Semantic mask terrain plan found no water/beach boundaries.");
  assert(plan.sandGrassBoundarySamples > 0, "Semantic mask terrain plan found no sand/grass boundaries.");
  assert(before === after, "Semantic mask terrain planning mutated the generated world.");
}

function validateSemanticRouteRendererPlan(world) {
  const styledPlan = describeSemanticRouteRenderPlan(world.semantic, { tileSize: 32 });
  assert(styledPlan.width === world.width * 32, `Semantic route overlay texture width expected ${world.width * 32}, got ${styledPlan.width}.`);
  assert(styledPlan.height === world.height * 32, `Semantic route overlay texture height expected ${world.height * 32}, got ${styledPlan.height}.`);
  assert(styledPlan.styledRoadPathCount > 0, "Styled route renderer found no road paths.");
  assert(styledPlan.styledRiverPathCount > 0, "Styled route renderer found no river paths.");
  assert(styledPlan.roadCellCount > 0, "Styled route renderer found no road cells.");
  assert(styledPlan.riverCellCount > 0, "Styled route renderer found no river cells.");
  assert(!styledPlan.debugMarkersVisible, "Styled route renderer should not show debug markers in normal mode.");

  const debugPlan = describeSemanticRouteRenderPlan(world.semantic, { tileSize: 32, routeOverlayMode: "debug", riverOverlayMode: "debug" });
  assert(debugPlan.debugMarkersVisible, "Debug route renderer plan should expose route/river diagnostics.");
}

function stableSummary(world) {
  return JSON.stringify({
    seed: world.seed,
    tiles: world.tiles,
    islands: world.islands.map((island) => ({ id: island.id, bounds: island.bounds, town: island.townPosition, harbor: island.harborPosition })),
    pois: world.pois.map((poi) => ({ id: poi.id, kind: poi.kind, islandId: poi.islandId, x: poi.x, y: poi.y })),
    mountainRanges: world.semantic.mountainRanges.map((range) => ({ id: range.id, islandId: range.islandId, kind: range.kind, cells: range.cells.length, smallOutcrop: !!range.smallOutcrop })),
    roads: world.roads,
    rivers: world.rivers.map((river) => river.length),
    bridgeCandidates: world.semantic.bridgeCandidates.length,
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

function hasNearbyMountain(world, x, y, radius) {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (xx < 0 || yy < 0 || xx >= world.width || yy >= world.height || Math.hypot(xx - x, yy - y) > radius) continue;
      if (world.semantic.layers.mountainMap[yy * world.width + xx]) return true;
    }
  }
  return false;
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
