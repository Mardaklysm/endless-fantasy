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
import { WORLD_CLOUD_ASSET_BY_TEXTURE_KEY, WORLD_CLOUD_ASSETS, WORLD_CLOUD_MANIFEST, worldCloudPoolForContext, worldCloudThemeForContext } from "../../src/data/worldCloudAssets.ts";
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
  validateWorldCloudManifest();
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
  assert(!WORLD_CURRENT_ASSET_MANIFEST.rendererContract.roadsRiversCoastsMountainsForestsPoisAreOverlays, "current world manifest must not mark roads/rivers as normal overlays.");
  assert(!WORLD_CURRENT_ASSET_MANIFEST.rendererContract.randomBaseTerrainVariantSpam, "current world manifest must keep random base terrain variants disabled.");
  assert(WORLD_CURRENT_ASSET_MANIFEST.sourcePack.approvedTerrainMaterialCount === 37, "current world manifest should record 37 approved terrain fills.");
  const terrainAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.assetKind === "terrain fill");
  const approvedTerrainAssets = terrainAssets.filter((asset) => asset.filename.startsWith("terrain/"));
  const restoredV1TerrainAssets = terrainAssets.filter((asset) => asset.filename.startsWith("terrain_v1/"));
  assert(
    approvedTerrainAssets.length === WORLD_CURRENT_ASSET_MANIFEST.sourcePack.approvedTerrainMaterialCount,
    `Expected ${WORLD_CURRENT_ASSET_MANIFEST.sourcePack.approvedTerrainMaterialCount} approved current terrain fills, got ${approvedTerrainAssets.length}.`
  );
  assert(restoredV1TerrainAssets.length > 0, "Expected restored terrain_v1 fills for selected old atlas-style water/sand/snow materials.");
  for (const textureKey of Object.values(WORLD_CURRENT_TERRAIN_TEXTURE_KEYS)) {
    assert(WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey]?.assetKind === "terrain fill", `Semantic terrain texture ${textureKey} should resolve to a terrain fill asset.`);
  }
  const worldObjectAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.assetKind === "world object");
  const premiumWorldObjectAssets = worldObjectAssets.filter((asset) => asset.premium);
  const backupWorldObjectAssets = worldObjectAssets.filter((asset) => !asset.premium);
  assert(worldObjectAssets.length > 0, "Expected approved current-folder world object assets.");
  assert(
    WORLD_CURRENT_ASSET_MANIFEST.sourcePack.approvedWorldObjectCount === worldObjectAssets.length,
    `Current manifest approved object count does not match object assets (${WORLD_CURRENT_ASSET_MANIFEST.sourcePack.approvedWorldObjectCount} vs ${worldObjectAssets.length}).`
  );
  assert(
    WORLD_CURRENT_ASSET_MANIFEST.sourcePack.premiumWorldObjectCount === premiumWorldObjectAssets.length,
    `Current manifest premium object count does not match premium assets (${WORLD_CURRENT_ASSET_MANIFEST.sourcePack.premiumWorldObjectCount} vs ${premiumWorldObjectAssets.length}).`
  );
  assert(
    WORLD_CURRENT_ASSET_MANIFEST.sourcePack.backupWorldObjectCount === backupWorldObjectAssets.length,
    `Current manifest backup object count does not match backup assets (${WORLD_CURRENT_ASSET_MANIFEST.sourcePack.backupWorldObjectCount} vs ${backupWorldObjectAssets.length}).`
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
        asset.source === "world_objects_v2" || asset.source === "world_objects_v2_relaxed" || asset.source === "premium_bg_output",
        `${asset.id} should record an approved world object source.`
      );
      assert(asset.transparencyStatus === "alpha", `${asset.id} world object should be transparent.`);
      assert(asset.backgroundRemovalMethod, `${asset.id} should record its background removal method.`);
      if (asset.premium) {
        assert(asset.source === "premium_bg_output", `${asset.id} premium object should record premium_bg_output as its source.`);
        assert(asset.filename.startsWith("objects_premium/"), `${asset.id} premium object should live in objects_premium.`);
        assert(
          asset.dimensions.width >= 64 && asset.dimensions.width <= 1024 && asset.dimensions.height >= 64 && asset.dimensions.height <= 1024,
          `${asset.id} premium object should keep sane runtime dimensions, got ${asset.dimensions.width}x${asset.dimensions.height}.`
        );
      } else {
        assert(asset.filename.startsWith("objects/"), `${asset.id} backup object should live in objects/.`);
        assert(asset.dimensions.width === 256 && asset.dimensions.height === 256, `${asset.id} backup world object must be normalized to 256x256.`);
      }
      if (asset.source === "world_objects_v2_relaxed") {
        assert(asset.qualityBucket === "game_ready", `${asset.id} relaxed runtime objects must be game_ready.`);
      }
    }
  }
  const approvedObjectFilenames = new Set(worldObjectAssets.map((asset) => asset.filename.replaceAll("\\", "/")));
  const runtimeObjectFiles = [];
  for (const folder of ["objects", "objects_premium"]) {
    const objectRuntimeFolder = path.join(PROJECT_ROOT, WORLD_CURRENT_ASSET_MANIFEST.runtimeRoot, folder);
    const filenames = fs.existsSync(objectRuntimeFolder) ? fs.readdirSync(objectRuntimeFolder).filter((filename) => filename.endsWith(".png")) : [];
    for (const filename of filenames) runtimeObjectFiles.push(`${folder}/${filename}`);
  }
  assert(runtimeObjectFiles.length === worldObjectAssets.length, `Runtime object folders have ${runtimeObjectFiles.length} PNGs, expected ${worldObjectAssets.length}.`);
  for (const filename of runtimeObjectFiles) {
    assert(approvedObjectFilenames.has(filename), `Runtime object folders contain unmanifested object file ${filename}.`);
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
    assert(WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey].premium, `POI kind ${poiKind} should prefer the premium object mapping.`);
  }
  for (const routeKey of ["dockHorizontal", "dockVertical", "bridgeHorizontal", "bridgeVertical"]) {
    const textureKey = WORLD_CURRENT_ROUTE_TEXTURE_KEYS[routeKey];
    assert(textureKey && WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey], `Route key ${routeKey} lacks a current texture mapping.`);
    assert(WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey].premium, `Route key ${routeKey} should prefer the premium object mapping.`);
  }
  assert(WORLD_CURRENT_ROUTE_TEXTURE_KEYS.riverRendering === "semantic_mask_freshwater", "Current manifest should render rivers through the semantic terrain mask.");
  assert(WORLD_CURRENT_ROUTE_TEXTURE_KEYS.riverFreshwater === "world_current_terrain_freshwater", "Current manifest should map riverFreshwater to the freshwater terrain asset.");
  assert(WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[WORLD_CURRENT_ROUTE_TEXTURE_KEYS.riverFreshwater], "River freshwater texture key must resolve to a current asset.");
  assert(WORLD_CURRENT_ROUTE_TEXTURE_KEYS.roadRendering === "semantic_mask_packed_dirt", "Current manifest should render roads through the semantic terrain mask.");
  assert(WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.road === "world_current_terrain_packed_dirt_surface", "Current terrain manifest should map road to the packed dirt material.");
  for (const textureKey of [
    WORLD_CURRENT_POI_TEXTURE_KEYS.town,
    WORLD_CURRENT_POI_TEXTURE_KEYS.harbor,
    WORLD_CURRENT_POI_TEXTURE_KEYS.shrine,
    WORLD_CURRENT_POI_TEXTURE_KEYS.ruins,
    WORLD_CURRENT_POI_TEXTURE_KEYS.tower
  ]) {
    const asset = WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey];
    assert(
      asset?.source === "world_objects_v2_relaxed" || asset?.source === "premium_bg_output",
      `Settlement-corrected POI texture ${textureKey} should come from the relaxed or premium game-ready set.`
    );
  }
  assert(
    WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[WORLD_CURRENT_ROUTE_TEXTURE_KEYS.bridgeHorizontal].source === "premium_bg_output",
    "Horizontal bridge route stamp should map to the premium bridge object."
  );
  assert(
    WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[WORLD_CURRENT_ROUTE_TEXTURE_KEYS.dockHorizontal].assetKind === "world object",
    "Horizontal dock route stamp should map to the approved object pack."
  );
  assert(WORLD_CURRENT_ASSET_MANIFEST.premiumObjectMappings.small_mountain_peak, "Premium mountain mapping should be present.");
  assert(
    WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID.small_mountain_peak === WORLD_CURRENT_ASSET_MANIFEST.premiumObjectMappings.small_mountain_peak,
    "Resolved mountain object mapping should prefer the premium asset."
  );
  const islandFortressTextureKey = "world_current_object_premium_island_fortress";
  for (const role of ["city", "fortification", "harbor", "settlement"]) {
    const variants = WORLD_CURRENT_ASSET_MANIFEST.premiumPoiVariantMappings?.[role] ?? [];
    assert(!variants.includes(islandFortressTextureKey), `Island fortress must not appear in land/harbor premium POI variant role ${role}.`);
  }
}

function validateWorldCloudManifest() {
  assert(WORLD_CLOUD_MANIFEST.fallbackTheme === "grassland", "Cloud manifest should use grassland as the fallback tint theme.");
  assert(WORLD_CLOUD_MANIFEST.baseClouds?.length === 5, `Expected 5 reusable base clouds, got ${WORLD_CLOUD_MANIFEST.baseClouds?.length ?? 0}.`);
  for (const themeName of ["grassland", "jungle", "snow", "desert", "swamp", "volcanic", "deadland"]) {
    assert(WORLD_CLOUD_MANIFEST.themeTints[themeName], `Cloud manifest should define a ${themeName} tint.`);
    assert(typeof WORLD_CLOUD_MANIFEST.themeTints[themeName].alpha === "number", `${themeName} cloud tint should define alpha.`);
    assert(typeof WORLD_CLOUD_MANIFEST.themeTints[themeName].speedMultiplier === "number", `${themeName} cloud tint should define speed multiplier.`);
    assert(Array.isArray(WORLD_CLOUD_MANIFEST.themeCloudPools[themeName]), `Cloud manifest should define a future ${themeName} cloud pool.`);
  }
  for (const asset of WORLD_CLOUD_ASSETS) {
    assert(WORLD_CLOUD_ASSET_BY_TEXTURE_KEY[asset.textureKey] === asset, `Cloud texture key lookup failed for ${asset.textureKey}.`);
    assert(asset.id.startsWith("cloud_base_"), `${asset.id} should be a reusable base cloud mask.`);
    assert(asset.filename.startsWith("clouds/"), `${asset.id} should live under current/clouds.`);
    assert(asset.topBand, `${asset.id} should be marked as a top-band overlay.`);
    assertPng(path.join(WORLD_CLOUD_MANIFEST.runtimeRoot, asset.filename), asset.dimensions.width, asset.dimensions.height, `world cloud ${asset.id}`);
  }
  assert(worldCloudThemeForContext({ islandId: "greenhaven", islandName: "Greenhaven", islandTheme: "grassland" }).themeName === "grassland", "Greenhaven should use grassland cloud tint.");
  const coralreachClouds = worldCloudPoolForContext({ islandId: "coralreach", islandName: "Coralreach", islandTheme: "sand_coast" });
  assert(coralreachClouds.themeName === "jungle" && coralreachClouds.usedBaseClouds, "Coralreach should use jungle cloud tint with the reusable base cloud pool.");
  const frostmereClouds = worldCloudPoolForContext({ islandId: "frostmere", islandName: "Frostmere", islandTheme: "ice" });
  assert(frostmereClouds.themeName === "snow" && frostmereClouds.usedBaseClouds, "Frostmere should use snow cloud tint with the reusable base cloud pool.");
  const unknownClouds = worldCloudPoolForContext({ islandId: "unknown-island", islandTheme: "unknown-theme" });
  assert(unknownClouds.themeName === "grassland" && unknownClouds.usedFallbackTheme, "Unknown cloud themes should gracefully fall back to grassland tint.");
  assert(unknownClouds.usedBaseClouds, "Unknown cloud themes should still use the reusable base cloud pool.");
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
  const mainText = fs.readFileSync(path.join(PROJECT_ROOT, "src/main.ts"), "utf8");
  assert(!mainText.includes("createSemanticRiverTileOverlayTexture"), "Runtime main scene must not rebuild the old river overlay texture.");
  assert(!mainText.includes("drawCachedWorldRiverOverlay"), "Runtime main scene must not draw the old river overlay cache.");
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
  assert(!isWorldPositionWalkable(worldA, greenhavenSettlement.x, greenhavenSettlement.y), "Greenhaven settlement body should block walking.");
  assert(hasAdjacentWalkablePoiApproach(worldA, greenhavenSettlement), "Greenhaven settlement has no walkable approach.");

  for (const id of MAJOR_ISLAND_IDS) {
    const harbor = worldA.pois.find((poi) => poi.islandId === id && poi.kind === "harbor");
    assert(harbor, `${id} has no harbor/travel point.`);
    assert(poiFootprintCells(harbor).some((cell) => hasAdjacentWater(worldA, cell.x, cell.y, SEMANTIC_WATER.SHALLOW)), `${harbor.id} is not adjacent to shallow water.`);
  }

  assert(worldA.roads.length > 0, "No runtime road overlays were generated.");
  assert(worldA.rivers.length > 0, "No runtime river overlays were generated.");
  assert(worldA.semantic.roadGraph.edges.length > 0, "Semantic road graph data is missing.");
  assert(worldA.semantic.rivers.length > 0, "Semantic river data is missing.");
  assert(worldA.objectOverlays.some((overlay) => overlay.objectId === "small_mountain_peak" || overlay.objectId === "snowy_mountain_peak"), "No mountain overlays were generated.");
  const mountainVisualOverlays = worldA.objectOverlays.filter((overlay) => overlay.id.startsWith("mountain-"));
  assert(mountainVisualOverlays.length === worldA.semantic.mountains.length, "Every semantic mountain cell should get exactly one mountain sprite.");
  assert(mountainVisualOverlays.every((overlay) => overlay.collisionPolicy === "visualOnly"), "Mountain sprites must be visual-only; semantic mountainMap owns collision.");
  assert(mountainVisualOverlays.every((overlay) => overlay.scale === 1), "Mountain sprites should render at normal unscaled size.");
  assert(mountainVisualOverlays.every((overlay) => (overlay.offsetX ?? 0) === 0 && (overlay.offsetY ?? 0) === 0), "Mountain sprites should stay centered on their semantic cell.");
  const mountainVisualKeys = new Set(mountainVisualOverlays.map((overlay) => `${overlay.x},${overlay.y}`));
  assert(mountainVisualKeys.size === mountainVisualOverlays.length, "Mountain sprites should not duplicate the same semantic cell.");
  for (const mountain of worldA.semantic.mountains) {
    assert(mountainVisualKeys.has(`${mountain.x},${mountain.y}`), `Mountain cell ${mountain.x},${mountain.y} is missing a visible mountain sprite.`);
  }
  for (const range of worldA.semantic.mountainRanges) {
    const tileVisuals = mountainVisualOverlays.filter((overlay) => overlay.id.startsWith(`mountain-${range.id}-tile-`));
    assert(tileVisuals.length === range.cells.length, `${range.id} should get one visible mountain sprite per mask cell.`);
    for (const cell of range.cells) {
      assert(tileVisuals.some((overlay) => overlay.x === cell.x && overlay.y === cell.y), `${range.id} is missing a mountain sprite at ${cell.x},${cell.y}.`);
    }
  }
  assert(worldA.objectOverlays.some((overlay) => overlay.objectId === "broadleaf_tree" || overlay.objectId === "dark_pine_tree" || overlay.objectId === "palm_tree"), "No forest overlays were generated.");
  validateForestOverlayInvariant(worldA);
  const mountainIndex = worldA.semantic.layers.mountainMap.findIndex((value) => value === 1);
  assert(mountainIndex >= 0, "No semantic mountain collision cells were generated.");
  assert(!isWorldPositionWalkable(worldA, mountainIndex % worldA.width, Math.floor(mountainIndex / worldA.width)), "Semantic mountain mask cell should block walking.");
  assert(worldA.semantic.layers.overlayCollisionPolicy[mountainIndex] === "hardBlock", "Semantic mountain mask cell should be tagged hardBlock.");
  validateMountainCollisionInvariant(worldA);
  const forestIndex = worldA.semantic.layers.forestMap.findIndex((value, index) => value === 1 && worldA.semantic.layers.roadMap[index] === 0 && worldA.semantic.layers.overlayCollisionPolicy[index] === "softTerrain");
  assert(forestIndex >= 0, "No semantic forest soft-terrain cells were generated.");
  assert(isWorldPositionWalkable(worldA, forestIndex % worldA.width, Math.floor(forestIndex / worldA.width)), "Forest overlay cell should stay walkable.");
  assert(worldA.semantic.layers.overlayCollisionPolicy[forestIndex] === "softTerrain", "Forest overlay should be tagged softTerrain.");
  const bridgeKeys = new Set(worldA.semantic.bridgeCandidates.map((bridge) => `${bridge.x},${bridge.y}`));
  const blockedRiverIndex = worldA.semantic.layers.riverMap.findIndex((value, index) => {
    const x = index % worldA.width;
    const y = Math.floor(index / worldA.width);
    return value === 1 && !bridgeKeys.has(`${x},${y}`);
  });
  assert(blockedRiverIndex >= 0, "No non-bridge river cells were available for collision validation.");
  assert(!isWorldPositionWalkable(worldA, blockedRiverIndex % worldA.width, Math.floor(blockedRiverIndex / worldA.width)), "Non-bridge river cells should block walking.");
  assert(worldA.semantic.layers.overlayCollisionPolicy[blockedRiverIndex] === "hardBlock", "Non-bridge river cells should be tagged hardBlock.");
  for (const bridge of worldA.semantic.bridgeCandidates) {
    const i = bridge.y * worldA.width + bridge.x;
    assert(worldA.semantic.layers.riverMap[i] === 1 && worldA.semantic.layers.roadMap[i] === 1, `Bridge ${bridge.id} should sit at a road-river crossing.`);
    assert(isWorldPositionWalkable(worldA, bridge.x, bridge.y), `Bridge ${bridge.id} should keep the road crossing walkable.`);
    assert(
      worldA.semantic.layers.overlayCollisionPolicy[i] === "visualOnly" || worldA.semantic.layers.overlayCollisionPolicy[i] === "poiBlock",
      `Bridge ${bridge.id} crossing should be tagged visualOnly or poiBlock when it sits in a POI footprint.`
    );
  }
  assert(worldA.routeBridgeCandidates.length === worldA.semantic.bridgeCandidates.length, "Runtime bridge candidates should mirror semantic road-river crossings.");
  assert(worldA.bridges.length === worldA.semantic.bridgeCandidates.length, "Visible bridge overlays should only come from road-river crossings by default.");
  for (const bridge of worldA.bridges) {
    const i = bridge.y * worldA.width + bridge.x;
    assert(bridge.kind === "roadRiverCrossing", `Visible bridge at ${bridge.x},${bridge.y} should be a road-river crossing, not decoration.`);
    assert(worldA.semantic.layers.roadMap[i] === 1 && worldA.semantic.layers.riverMap[i] === 1, `Visible bridge at ${bridge.x},${bridge.y} should sit on road and river masks.`);
    assert(worldA.semantic.layers.riverCrossingMap[i] === 1, `Visible bridge at ${bridge.x},${bridge.y} should be marked in riverCrossingMap.`);
  }
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

function validateMountainCollisionInvariant(world) {
  let mountainCells = 0;
  let blockedByMountain = 0;
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = y * world.width + x;
      if (world.semantic.layers.mountainMap[i]) {
        mountainCells += 1;
        assert(!isWorldPositionWalkable(world, x, y), `Mountain mask cell ${x},${y} should block walking.`);
        assert(world.semantic.layers.overlayCollisionPolicy[i] === "hardBlock", `Mountain mask cell ${x},${y} should carry hardBlock policy.`);
        blockedByMountain += 1;
      } else if (world.semantic.layers.landMask[i] && world.semantic.layers.waterClass[i] === SEMANTIC_WATER.NONE && !world.semantic.layers.lakeMap[i] && !world.semantic.layers.riverMap[i]) {
        assert(world.semantic.layers.overlayCollisionPolicy[i] !== "hardBlock", `Non-mountain land cell ${x},${y} should not be mountain hard-blocked.`);
      }
    }
  }
  assert(mountainCells > 0, "Expected semantic mountain mask cells for collision validation.");
  assert(blockedByMountain === mountainCells, "Blocked mountain cells should exactly match semantic mountain mask cells.");
}

function validateForestOverlayInvariant(world) {
  const forestOverlays = world.objectOverlays.filter((overlay) => String(overlay.id ?? "").startsWith("forest-"));
  const forestCells = [];
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = y * world.width + x;
      if (world.semantic.layers.forestMap[i]) forestCells.push({ x, y });
    }
  }
  assert(forestOverlays.length === forestCells.length, "Every semantic forest cell should get exactly one tree sprite.");
  assert(forestOverlays.every((overlay) => overlay.collisionPolicy === "softTerrain"), "Forest sprites should remain softTerrain.");
  assert(forestOverlays.every((overlay) => overlay.scale === 1), "Forest sprites should render at normal unscaled size.");
  assert(forestOverlays.every((overlay) => (overlay.offsetX ?? 0) === 0 && (overlay.offsetY ?? 0) === 0), "Forest sprites should stay centered on their semantic cell.");
  const overlayKeys = new Set(forestOverlays.map((overlay) => `${overlay.x},${overlay.y}`));
  assert(overlayKeys.size === forestOverlays.length, "Forest sprites should not duplicate the same semantic cell.");
  for (const cell of forestCells) {
    const i = cell.y * world.width + cell.x;
    assert(overlayKeys.has(`${cell.x},${cell.y}`), `Forest cell ${cell.x},${cell.y} is missing a visible tree sprite.`);
    assert(isWorldPositionWalkable(world, cell.x, cell.y), `Forest cell ${cell.x},${cell.y} should stay walkable.`);
    assert(world.semantic.layers.landMask[i], `Forest cell ${cell.x},${cell.y} should be on land.`);
    assert(world.semantic.layers.waterClass[i] === SEMANTIC_WATER.NONE, `Forest cell ${cell.x},${cell.y} should not be on ocean/coast water.`);
    assert(!world.semantic.layers.lakeMap[i], `Forest cell ${cell.x},${cell.y} should not be on lake water.`);
    assert(!world.semantic.layers.riverMap[i], `Forest cell ${cell.x},${cell.y} should not be on river water.`);
    assert(!hasNearbyWaterFeature(world, cell.x, cell.y, 1), `Forest cell ${cell.x},${cell.y} should not visually crowd water.`);
  }
  const components = connectedMaskComponents(world, world.semantic.layers.forestMap);
  assert(components.every((component) => component.length >= 6), "Forest semantic components should not be isolated tiny tree fragments.");
}

function validateIslandOverlayRules(world) {
  const mountainCounts = new Map();
  const snowCounts = new Map();
  const rangeCellCount = world.semantic.mountainRanges.reduce((sum, range) => sum + range.cells.length, 0);
  assert(world.semantic.mountainRanges.length > 0, "No semantic mountain ranges were generated.");
  assert(rangeCellCount === world.semantic.mountains.length, "Mountain range cells do not match flat semantic mountain cells.");
  assert(world.semantic.mountainDebug.singletonComponents === 0, "Mountain cleanup left singleton components.");
  assert(world.semantic.mountainDebug.componentCount === world.semantic.mountainRanges.length, "Mountain debug component count does not match ranges.");
  for (const range of world.semantic.mountainRanges) {
    const island = world.semantic.islands.find((candidate) => candidate.id === range.islandId);
    assert(island, `Mountain range references missing island ${range.islandId}.`);
    assert(range.cells.length >= minimumMountainComponentSize(island.id), `${range.id} is below the minimum massif size.`);
    assert(rangeIsConnected(range.cells), `${range.id} is not contiguous.`);
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
  assert((snowCounts.get("greenhaven") ?? 0) === 0, "Greenhaven must not have snow mountains.");
  assert((snowCounts.get("coralreach") ?? 0) === 0, "Coralreach must not have snow mountains.");
  assert((mountainCounts.get("highspire") ?? 0) >= 24, "Highspire should keep a readable mountain region.");
}

function validateCanonicalTerrainPalette(world) {
  assert(TERRAIN_VARIANT_MODE === "off", `Normal terrain variant mode must be off, got ${TERRAIN_VARIANT_MODE}.`);
  const tilesBySemantic = {
    deepOcean: new Set(),
    shallowWater: new Set(),
    beach: new Set(),
    grassland: new Set(),
    sand: new Set(),
    ice: new Set(),
    mountain: new Set()
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
      if (world.semantic.layers.mountainMap[i]) {
        tilesBySemantic.mountain.add(tile);
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
  assert(tilesBySemantic.mountain.has(SEMANTIC_BASE_TILE_PALETTE.mountain), "Mountain cells should include the canonical rocky mountain tile.");
  for (const tile of tilesBySemantic.mountain) {
    assert(tile === SEMANTIC_BASE_TILE_PALETTE.mountain || tile === WORLD_TILE_IDS.snowyMountainGround, `Unexpected mountain tile ${tile}.`);
  }
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
    assert(poi.footprint >= 2, `POI ${poi.id} should render with at least a 2x2 footprint.`);
    for (const cell of poiFootprintCells(poi)) {
      const i = cell.y * world.width + cell.x;
      assert(world.semantic.layers.waterClass[i] === SEMANTIC_WATER.NONE, `POI ${poi.id} spawned on blocked water at ${cell.x},${cell.y}.`);
      assert(world.semantic.layers.landMask[i] === 1, `POI ${poi.id} footprint is not on land at ${cell.x},${cell.y}.`);
      assert(!world.semantic.layers.mountainMap[i], `POI ${poi.id} footprint overlaps mountain at ${cell.x},${cell.y}.`);
      assert(!world.semantic.layers.riverMap[i], `POI ${poi.id} footprint overlaps river at ${cell.x},${cell.y}.`);
      assert(!world.semantic.layers.roadMap[i], `POI ${poi.id} footprint contains road at ${cell.x},${cell.y}.`);
      assert(!world.semantic.layers.forestMap[i], `POI ${poi.id} footprint overlaps forest at ${cell.x},${cell.y}.`);
      assert(world.semantic.layers.overlayCollisionPolicy[i] === "poiBlock", `POI ${poi.id} footprint is not tagged poiBlock at ${cell.x},${cell.y}.`);
      assert(!isWorldPositionWalkable(world, cell.x, cell.y), `POI ${poi.id} body cell ${cell.x},${cell.y} should block walking.`);
    }
    assert(hasAdjacentWalkablePoiApproach(world, poi), `POI ${poi.id} has no walkable approach.`);
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
  const bridgeKeys = new Set(world.semantic.bridgeCandidates.map((bridge) => `${bridge.x},${bridge.y}`));
  let blockedRiverCells = 0;
  let bridgeRiverCells = 0;
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
        if (bridgeKeys.has(`${x},${y}`)) {
          bridgeRiverCells += 1;
          assert(isWorldPositionWalkable(world, x, y), `Bridge river crossing at ${x},${y} should be walkable.`);
        } else {
          blockedRiverCells += 1;
          assert(!isWorldPositionWalkable(world, x, y), `River at ${x},${y} should block walking unless bridged.`);
        }
      }
      if (world.semantic.layers.forestMap[i]) {
        assert(isWorldPositionWalkable(world, x, y), `Forest at ${x},${y} blocks walking.`);
      }
    }
  }
  assert(blockedRiverCells > 0, "Expected at least one blocking river cell.");
  assert(bridgeRiverCells === world.semantic.bridgeCandidates.length, "Bridge crossing count should match semantic bridge candidates.");
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
  assert(plan.waterGrassBoundarySamples + plan.waterIceBoundarySamples > 0, "Semantic mask terrain plan found no inland water/land boundaries.");
  assert(plan.roadBoundarySamples > 0, "Semantic mask terrain plan found no road terrain boundaries.");
  assert(plan.sandGrassBoundarySamples > 0, "Semantic mask terrain plan found no sand/grass boundaries.");
  assert(before === after, "Semantic mask terrain planning mutated the generated world.");
}

function validateSemanticRouteRendererPlan(world) {
  const normalPlan = describeSemanticRouteRenderPlan(world.semantic, { tileSize: 32 });
  assert(normalPlan.width === world.width * 32, `Semantic route overlay texture width expected ${world.width * 32}, got ${normalPlan.width}.`);
  assert(normalPlan.height === world.height * 32, `Semantic route overlay texture height expected ${world.height * 32}, got ${normalPlan.height}.`);
  assert(normalPlan.routeOverlayMode === "hidden", "Normal route overlay should not render road bodies.");
  assert(normalPlan.riverOverlayMode === "hidden", "Normal route overlay should not render river bodies.");
  assert(normalPlan.styledRoadPathCount === 0, "Normal route overlay should report zero styled road paths.");
  assert(normalPlan.styledRiverPathCount === 0, "Normal route overlay should report zero styled river paths.");
  assert(normalPlan.roadCellCount > 0, "Route renderer plan found no semantic road cells.");
  assert(normalPlan.riverCellCount > 0, "Route renderer plan found no semantic river cells.");
  assert(!normalPlan.debugMarkersVisible, "Normal route renderer should not show debug markers.");

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

function hasNearbyWaterFeature(world, x, y, radius) {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (xx < 0 || yy < 0 || xx >= world.width || yy >= world.height) continue;
      const i = yy * world.width + xx;
      if (world.semantic.layers.waterClass[i] !== SEMANTIC_WATER.NONE || world.semantic.layers.lakeMap[i] || world.semantic.layers.riverMap[i]) return true;
    }
  }
  return false;
}

function hasAdjacentWalkable(world, x, y) {
  return neighbors4(x, y).some((next) => {
    if (next.x < 0 || next.y < 0 || next.x >= world.width || next.y >= world.height) return false;
    return isWorldPositionWalkable(world, next.x, next.y);
  });
}

function hasAdjacentWalkablePoiApproach(world, poi) {
  const footprintKeys = new Set(poiFootprintCells(poi).map((cell) => `${cell.x},${cell.y}`));
  return poiFootprintCells(poi).some((cell) =>
    neighbors4(cell.x, cell.y).some((next) => {
      if (next.x < 0 || next.y < 0 || next.x >= world.width || next.y >= world.height || footprintKeys.has(`${next.x},${next.y}`)) return false;
      return isWorldPositionWalkable(world, next.x, next.y);
    })
  );
}

function poiFootprintCells(poi) {
  const offset = Math.floor((poi.footprint - 1) / 2);
  const minX = poi.x - offset;
  const minY = poi.y - offset;
  const cells = [];
  for (let y = minY; y < minY + poi.footprint; y += 1) {
    for (let x = minX; x < minX + poi.footprint; x += 1) cells.push({ x, y });
  }
  return cells;
}

function connectedMaskComponents(world, mask) {
  const seen = new Set();
  const components = [];
  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i] || seen.has(i)) continue;
    const component = [];
    const queue = [{ x: i % world.width, y: Math.floor(i / world.width) }];
    seen.add(i);
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      component.push(cell);
      for (const next of neighbors4(cell.x, cell.y)) {
        if (next.x < 0 || next.y < 0 || next.x >= world.width || next.y >= world.height) continue;
        const ni = next.y * world.width + next.x;
        if (!mask[ni] || seen.has(ni)) continue;
        seen.add(ni);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components;
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

function minimumMountainComponentSize(islandId) {
  if (islandId === "highspire") return 24;
  if (islandId === "frostmere") return 18;
  if (islandId === "greenhaven" || islandId === "coralreach") return 8;
  return 8;
}

function rangeIsConnected(cells) {
  if (cells.length <= 1) return true;
  const keys = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
  const seen = new Set([`${cells[0].x},${cells[0].y}`]);
  const queue = [cells[0]];
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head];
    for (const next of neighbors4(cell.x, cell.y)) {
      const key = `${next.x},${next.y}`;
      if (!keys.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen.size === cells.length;
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
