import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_WORLD_HEIGHT, DEFAULT_WORLD_WIDTH, SEMANTIC_BASE_TILE_PALETTE, TERRAIN_VARIANT_MODE, generateWorld, getIslandAt, isWorldPositionWalkable } from "../../src/world/worldGenerator.ts";
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
  WORLD_CURRENT_TERRAIN_VARIANT_TEXTURE_KEYS,
  worldCurrentPoiTextureKeyFor
} from "../../src/data/worldCurrentAssets.ts";
import { WORLD_CLOUD_ASSET_BY_TEXTURE_KEY, WORLD_CLOUD_ASSETS, WORLD_CLOUD_MANIFEST, worldCloudPoolForContext, worldCloudThemeForContext } from "../../src/data/worldCloudAssets.ts";
import { DUNGEON_TILE_ASSETS, DUNGEON_TILESET } from "../../src/data/dungeonTiles.ts";
import { generateDungeonFloors, validateDungeonFloorsConnectivity } from "../../src/world/dungeonGenerator.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER } from "../../src/world/semantic/semanticTypes.ts";
import {
  SEMANTIC_MASK_TERRAIN_CLASSES,
  describeSemanticMaskTerrainRenderPlan,
  roadRibbonDebugSegments,
  roadRibbonSampleAt,
  terrainMaterialWeightsAt,
  terrainVariantWeightsAt
} from "../../src/world/semantic/semanticMaskTerrainRenderer.ts";
import { describeSemanticRouteRenderPlan } from "../../src/world/semantic/semanticRouteRenderer.ts";
import { REQUIRED_MAJOR_HARBOR_ROUTE_PAIRS, isBoatNavigableTile, validateBoatPath } from "../../src/world/semantic/boatNavigation.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const MAJOR_ISLAND_IDS = ["greenhaven", "coralreach", "frostmere", "highspire", "ashfall"];

validateRuntimeAssets();
validateSemanticWorldgen();
validateDungeonGeneration();

console.log("semantic worldgen runtime validation passed.");

function validateRuntimeAssets() {
  validateDungeonTileAssets();
  validateCurrentWorldAssetManifest();
  validateWorldCloudManifest();
  validateNoDeprecatedRuntimeAtlasReferences();
  validateTerrainVariantRendererSourceGuard();
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

function validateDungeonTileAssets() {
  assert(DUNGEON_TILE_ASSETS.length === 64, `Expected 64 dungeon tile images, got ${DUNGEON_TILE_ASSETS.length}.`);
  for (const tile of DUNGEON_TILE_ASSETS) {
    assertPng(
      path.join("src", "assets", "world", tile.filename),
      DUNGEON_TILESET.tileWidth,
      DUNGEON_TILESET.tileHeight,
      `dungeon tile ${tile.id}`
    );
  }
}

function validateDungeonGeneration() {
  const dungeonCases = [
    { dungeonId: "mossCave", tier: 1 },
    { dungeonId: "ashenKeep", tier: 3 },
    { dungeonId: "tideShrine", tier: 2 },
    { dungeonId: "skyglassTower", tier: 3 },
    { dungeonId: "eclipseSpire", tier: 4, final: true }
  ];
  const seeds = [
    "semantic-runtime-test-greenhaven",
    "semantic-runtime-test-different",
    "semantic-mqpn3h9e-g7a5av",
    "semantic-mapofs5-mypv2s"
  ];
  for (const seed of seeds) {
    for (const dungeon of dungeonCases) {
      const floors = generateDungeonFloors({ seed, ...dungeon });
      const validation = validateDungeonFloorsConnectivity(floors);
      assert(validation.ok, `${dungeon.dungeonId} generated an unreachable floor for ${seed}: ${validation.errors.join("; ")}`);
    }
  }
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
        asset.source === "world_objects_v2" || asset.source === "world_objects_v2_relaxed" || asset.source === "premium_bg_output" || asset.source === "objects_premium_v2",
        `${asset.id} should record an approved world object source.`
      );
      assert(asset.transparencyStatus === "alpha", `${asset.id} world object should be transparent.`);
      assert(asset.backgroundRemovalMethod, `${asset.id} should record its background removal method.`);
      if (asset.premium) {
        assert(asset.source === "premium_bg_output" || asset.source === "objects_premium_v2", `${asset.id} premium object should record an approved premium source.`);
        assert(asset.filename.startsWith("objects_premium/") || asset.filename.startsWith("objects_premium_v2/"), `${asset.id} premium object should live in a premium object folder.`);
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
  for (const folder of ["objects", "objects_premium", "objects_premium_v2"]) {
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

function validateTerrainVariantRendererSourceGuard() {
  const rendererText = fs.readFileSync(path.join(PROJECT_ROOT, "src/world/semantic/semanticMaskTerrainRenderer.ts"), "utf8");
  const forbiddenTokens = ["drawHardTerrainVariant", "drawTerrainVariantTile", "variantCtx.fillRect(cell", "drawHardAshfall", "drawHardLava"];
  for (const token of forbiddenTokens) {
    assert(!rendererText.includes(token), `Semantic terrain variant renderer contains forbidden hard-edge token ${token}.`);
  }
  assert(rendererText.includes("terrainVariantWeightsAt"), "Semantic terrain variant renderer must expose the generalized variant splat sampler.");
  assert(rendererText.includes("terrainMaterialWeightsAt"), "Semantic terrain renderer must expose generalized material-layer weights for regression tests.");
  assert(rendererText.includes("ashfallTransitionWeightsAt"), "Ashfall material rendering must use the shared transition sampler, not a hard-cell bypass.");
  const variantFunctionMatches = rendererText.match(/function\s+\w*TerrainVariant\w*[\s\S]*?(?=\nfunction\s|\nexport function\s|\nexport interface\s|$)/g) ?? [];
  for (const body of variantFunctionMatches) {
    assert(!body.includes("TILE, TILE"), "Terrain variant draw functions must not draw full TILE-sized variant rectangles.");
    assert(!/drawImage\([^;]*(?:TILE|tileSize)[^;]*(?:TILE|tileSize)/.test(body), "Terrain variant draw functions must not draw variant textures directly per terrain cell.");
  }
  const materialFunctionMatches = rendererText.match(/function\s+\w*(?:Ashfall|Lava|Cinder|Scorched|Material)\w*[\s\S]*?(?=\nfunction\s|\nexport function\s|\nexport interface\s|$)/g) ?? [];
  for (const body of materialFunctionMatches) {
    assert(!body.includes("TILE, TILE"), "Biome-specific terrain material functions must not draw full TILE-sized material rectangles.");
    assert(!/fillRect\([^;]*(?:plan\.tileSize|tileSize)[^;]*(?:plan\.tileSize|tileSize)/.test(body), "Biome-specific material functions must not fill full terrain cells.");
  }
  const hardCellPatterns = [
    /terrainVariant[\s\S]{0,140}\.fillRect\([^;]*(?:TILE|tileSize)[^;]*(?:TILE|tileSize)/,
    /terrainVariant[\s\S]{0,180}\.drawImage\([^;]*(?:TILE|tileSize)[^;]*(?:TILE|tileSize)/,
    /(?:ash|lava|cinder|scorched)[\s\S]{0,180}\.drawImage\([^;]*(?:TILE|tileSize)[^;]*(?:TILE|tileSize)/i
  ];
  for (const pattern of hardCellPatterns) {
    assert(!pattern.test(rendererText), `Semantic terrain renderer contains an obvious hard-cell material draw path: ${pattern}.`);
  }
  const forbiddenRoadTokens = ["drawRoadMaskedTerrainClass", "roadCtx.fillRect(cell"];
  for (const token of forbiddenRoadTokens) {
    assert(!rendererText.includes(token), `Semantic road renderer contains forbidden hard-edge token ${token}.`);
  }
  const roadFunctionMatches = rendererText.match(/function\s+\w*Road\w*[\s\S]*?(?=\nfunction\s|\nexport function\s|\nexport interface\s|$)/g) ?? [];
  for (const body of roadFunctionMatches) {
    assert(!body.includes("TILE, TILE"), "Road renderer functions must not draw full TILE-sized road rectangles.");
  }
}

function validateSemanticWorldgen() {
  const seed = "semantic-runtime-test-greenhaven";
  const worldA = generateWorld({ seed });
  const worldB = generateWorld({ seed });
  const worldC = generateWorld({ seed: "semantic-runtime-test-different" });
  const transitionSeeds = [
    "semantic-mqvfh3bw-1vel28p",
    "semantic-runtime-test-greenhaven",
    "semantic-frostmere-transition-test",
    "semantic-coralreach-transition-test",
    "semantic-ashfall-transition-test"
  ];
  const transitionWorlds = transitionSeeds.map((transitionSeed) => (transitionSeed === seed ? worldA : generateWorld({ seed: transitionSeed })));
  const roadRibbonWorlds = [
    worldA,
    generateWorld({ seed: "semantic-mqppkkk6-1o7hs8" }),
    generateWorld({ seed: "semantic-mqyyhhs2-sfpp5" }),
    generateWorld({ seed: "semantic-mqjk1ki9-2jsaw" })
  ];

  assert(worldA.width === DEFAULT_WORLD_WIDTH && worldA.height === DEFAULT_WORLD_HEIGHT, `Default world size should be ${DEFAULT_WORLD_WIDTH}x${DEFAULT_WORLD_HEIGHT}, got ${worldA.width}x${worldA.height}.`);
  assert(worldA.validation.valid, `Semantic validation failed: ${worldA.validation.errors.join("; ")}`);
  assert(worldA.semantic.validation.ok, `Semantic core validation failed: ${worldA.semantic.validation.errors.join("; ")}`);
  assert(stableSummary(worldA) === stableSummary(worldB), "Same seed did not reproduce the same semantic world.");
  assert(stableSummary(worldA) !== stableSummary(worldC), "Different seeds produced the same semantic world summary.");

  const majorIslands = worldA.islands.filter((island) => island.major);
  assert(majorIslands.length === MAJOR_ISLAND_IDS.length, `Expected exactly ${MAJOR_ISLAND_IDS.length} major islands, got ${majorIslands.length}.`);
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
  assert(mountainVisualOverlays.length <= worldA.semantic.mountains.length, "Scaled mountain patches should not create more sprites than semantic mountain cells.");
  assert(mountainVisualOverlays.every((overlay) => overlay.collisionPolicy === "visualOnly"), "Mountain sprites must be visual-only; semantic mountainMap owns collision.");
  assert(mountainVisualOverlays.every((overlay) => Number.isInteger(overlay.scale) && overlay.scale >= 1 && overlay.scale <= 5), "Mountain sprites should render as integer-scaled patch overlays.");
  assert(mountainVisualOverlays.every((overlay) => overlay.objectId === "small_mountain_peak" || overlay.objectId === "snowy_mountain_peak"), "Mountain patch overlays should only use real mountain peak sprites.");
  assert(mountainVisualOverlays.some((overlay) => overlay.scale > 1), "Expected at least one mountain range to collapse into a scaled multi-cell peak.");
  const mountainVisualCoverage = new Map();
  for (const overlay of mountainVisualOverlays) {
    const minX = overlay.x - (overlay.scale - 1) / 2;
    const minY = overlay.y - (overlay.scale - 1) / 2;
    assert(Number.isInteger(minX) && Number.isInteger(minY), `Mountain patch ${overlay.id} is not aligned to semantic cells.`);
    for (let y = minY; y < minY + overlay.scale; y += 1) {
      for (let x = minX; x < minX + overlay.scale; x += 1) {
        const key = `${x},${y}`;
        assert(!mountainVisualCoverage.has(key), `Mountain visual patches overlap at ${key}.`);
        mountainVisualCoverage.set(key, overlay.id);
      }
    }
  }
  for (const mountain of worldA.semantic.mountains) {
    assert(mountainVisualCoverage.has(`${mountain.x},${mountain.y}`), `Mountain cell ${mountain.x},${mountain.y} is missing visible mountain patch coverage.`);
  }
  assert(mountainVisualCoverage.size === worldA.semantic.mountains.length, "Mountain visual patches should cover exactly the semantic mountain cells.");
  for (const range of worldA.semantic.mountainRanges) {
    const tileVisuals = mountainVisualOverlays.filter((overlay) => overlay.id.startsWith(`mountain-${range.id}-patch-`));
    assert(tileVisuals.length > 0, `${range.id} should get at least one visible mountain patch.`);
    for (const cell of range.cells) {
      assert(mountainVisualCoverage.has(`${cell.x},${cell.y}`), `${range.id} is missing mountain patch coverage at ${cell.x},${cell.y}.`);
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
    return value > 0 && !bridgeKeys.has(`${x},${y}`);
  });
  assert(blockedRiverIndex >= 0, "No non-bridge river cells were available for collision validation.");
  assert(!isWorldPositionWalkable(worldA, blockedRiverIndex % worldA.width, Math.floor(blockedRiverIndex / worldA.width)), "Non-bridge river cells should block walking.");
  assert(worldA.semantic.layers.overlayCollisionPolicy[blockedRiverIndex] === "hardBlock", "Non-bridge river cells should be tagged hardBlock.");
  for (const bridge of worldA.semantic.bridgeCandidates) {
    const i = bridge.y * worldA.width + bridge.x;
    assert(worldA.semantic.layers.riverMap[i] > 0 && worldA.semantic.layers.roadMap[i] === 1, `Bridge ${bridge.id} should sit at a road-river crossing.`);
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
    assert(worldA.semantic.layers.roadMap[i] === 1 && worldA.semantic.layers.riverMap[i] > 0, `Visible bridge at ${bridge.x},${bridge.y} should sit on road and river masks.`);
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
  validateBoatRoutesAndIslandSeparation(worldA);
  validateRoadAndForestPolicies(worldA);
  validateSemanticMaskTerrainRendererPlan(worldA);
  validateSemanticRouteRendererPlan(worldA);
  for (const world of transitionWorlds) {
    validateAllTerrainMaterialTransitionInvariant(world);
    validateAshfallMaterialTransitions(world);
  }
  for (const world of roadRibbonWorlds) validateRoadRibbonVisualInvariant(world);
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
    ash: new Set(),
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
      else if (biome === SEMANTIC_BIOME.SAND && world.semantic.islandIndexToId.get(world.semantic.layers.islandId[i]) === "ashfall") tilesBySemantic.ash.add(tile);
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
  assertSingleTileSet(tilesBySemantic.ash, WORLD_TILE_IDS.volcanicAshGround, "ashfall ash");
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
    if (poi.kind === "harbor") assert(poi.footprint === 3, `Harbor ${poi.id} should render with a 3x3 footprint.`);
    let harborWaterTiles = 0;
    for (const cell of poiFootprintCells(poi)) {
      const i = cell.y * world.width + cell.x;
      if (poi.kind === "harbor") {
        const isShallowWater = world.semantic.layers.landMask[i] === 0 && world.semantic.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW;
        const isLand = world.semantic.layers.landMask[i] === 1 && world.semantic.layers.waterClass[i] === SEMANTIC_WATER.NONE;
        if (isShallowWater) harborWaterTiles += 1;
        assert(isLand || isShallowWater, `Harbor ${poi.id} footprint is not land or shallow water at ${cell.x},${cell.y}.`);
      } else {
        assert(world.semantic.layers.waterClass[i] === SEMANTIC_WATER.NONE, `POI ${poi.id} spawned on blocked water at ${cell.x},${cell.y}.`);
        assert(world.semantic.layers.landMask[i] === 1, `POI ${poi.id} footprint is not on land at ${cell.x},${cell.y}.`);
      }
      assert(!world.semantic.layers.mountainMap[i], `POI ${poi.id} footprint overlaps mountain at ${cell.x},${cell.y}.`);
      assert(!world.semantic.layers.riverMap[i], `POI ${poi.id} footprint overlaps river at ${cell.x},${cell.y}.`);
      assert(!world.semantic.layers.roadMap[i] || isPoiEntranceTile(poi, cell.x, cell.y), `POI ${poi.id} footprint contains non-entrance road at ${cell.x},${cell.y}.`);
      assert(!world.semantic.layers.forestMap[i], `POI ${poi.id} footprint overlaps forest at ${cell.x},${cell.y}.`);
      assert(world.semantic.layers.overlayCollisionPolicy[i] === "poiBlock", `POI ${poi.id} footprint is not tagged poiBlock at ${cell.x},${cell.y}.`);
      assert(!isWorldPositionWalkable(world, cell.x, cell.y), `POI ${poi.id} body cell ${cell.x},${cell.y} should block walking.`);
    }
    if (poi.kind === "harbor") assert(harborWaterTiles >= 3, `Harbor ${poi.id} should place at least 3 footprint tiles in shallow water.`);
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
    const fromPoi = world.pois.find((poi) => poi.id === edge.from);
    const toPoi = world.pois.find((poi) => poi.id === edge.to);
    assert(fromPoi && toPoi, `Required road edge ${edge.from} -> ${edge.to} is missing runtime POI data.`);
    assert(roadEdgeTouchesPoiApproach(world, edge, fromPoi), `Required road edge ${edge.from} -> ${edge.to} does not touch ${edge.from}'s approach ring.`);
    assert(roadEdgeTouchesPoiApproach(world, edge, toPoi), `Required road edge ${edge.from} -> ${edge.to} does not touch ${edge.to}'s approach ring.`);
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
        assert(isWorldPositionWalkable(world, x, y) || isPoiEntranceRoadCell(world, x, y), `Road at ${x},${y} is blocked.`);
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
    if (terrainClass === "road") {
      assert(plan.classSamples[terrainClass] === 0, "Road must not replace base terrain as an opaque normal gameplay terrain class.");
    } else {
      assert(plan.classSamples[terrainClass] > 0, `Semantic mask terrain plan found no ${terrainClass} samples.`);
    }
  }
  assert(plan.waterBeachBoundarySamples > 0, "Semantic mask terrain plan found no water/beach boundaries.");
  assert(plan.waterGrassBoundarySamples + plan.waterIceBoundarySamples > 0, "Semantic mask terrain plan found no inland water/land boundaries.");
  assert(plan.roadBoundarySamples === 0, "Normal terrain plan should not contain hard road terrain boundaries.");
  assert(plan.sandGrassBoundarySamples > 0, "Semantic mask terrain plan found no sand/grass boundaries.");
  assert(before === after, "Semantic mask terrain planning mutated the generated world.");
}

function validateAllTerrainMaterialTransitionInvariant(world) {
  const classesWithVariants = new Set(Object.keys(WORLD_CURRENT_TERRAIN_VARIANT_TEXTURE_KEYS));
  if (classesWithVariants.size === 0) return;

  const greenhavenGrassStats = terrainVariantCoverageFor(world, "greenhaven", "grassland");
  if (classesWithVariants.has("grassland") && world.seed === "semantic-runtime-test-greenhaven") {
    assert(greenhavenGrassStats.total > 0, `${world.seed}: Greenhaven has no grassland cells for terrain variant validation.`);
    const coverage = greenhavenGrassStats.variant / greenhavenGrassStats.total;
    assert(coverage >= 0.08 && coverage <= 0.3, `${world.seed}: Greenhaven grassland variant coverage should stay between 8% and 30%, got ${(coverage * 100).toFixed(1)}%.`);
  }

  const edgeStats = terrainVariantBoundaryStats(world, classesWithVariants);
  assert(edgeStats.total > 0, `${world.seed}: no terrain variant boundaries were available for transition validation.`);
  assert(edgeStats.intermediate / edgeStats.total >= 0.68, `${world.seed}: expected at least 68% blended terrain material boundaries, got ${edgeStats.intermediate}/${edgeStats.total}.`);
  assert(edgeStats.directOpaqueJumps === 0, `${world.seed}: terrain material alpha jumped directly from invisible to opaque on ${edgeStats.directOpaqueJumps} sampled edges.`);
  assert(edgeStats.maxHardRun <= 3, `${world.seed}: found ${edgeStats.maxHardRun} consecutive hard terrain variant boundary cells.`);
  for (const [terrainClass, classStats] of edgeStats.byClass) {
    if (classStats.total < 12) continue;
    assert(
      classStats.intermediate / classStats.total >= 0.62,
      `${world.seed}: expected at least 62% blended ${terrainClass} material boundaries, got ${classStats.intermediate}/${classStats.total}.`
    );
  }
  if (classesWithVariants.has("grassland") && world.seed === "semantic-runtime-test-greenhaven") {
    assert(edgeStats.greenhavenGrassTotal > 0, `${world.seed}: Greenhaven grassland variants exist but no Greenhaven grassland boundaries were found.`);
    assert(
      edgeStats.greenhavenGrassIntermediate / edgeStats.greenhavenGrassTotal >= 0.6,
      `${world.seed}: expected at least 60% blended Greenhaven grassland boundaries, got ${edgeStats.greenhavenGrassIntermediate}/${edgeStats.greenhavenGrassTotal}.`
    );
  }
}

function validateAshfallMaterialTransitions(world) {
  const semantic = world.semantic;
  const ashfall = world.islands.find((island) => island.id === "ashfall" || island.theme === "ashfall");
  assert(ashfall, `${world.seed}: Ashfall island is missing for material transition validation.`);

  const ashfallLayerId = [...semantic.islandIndexToId.entries()].find(([, islandId]) => islandId === "ashfall")?.[0];
  assert(ashfallLayerId, `${world.seed}: Ashfall semantic island layer is missing.`);
  const slotCoverage = new Map([
    [1, 0],
    [2, 0],
    [3, 0]
  ]);
  let ashCells = 0;
  for (let y = 0; y < semantic.height; y += 1) {
    for (let x = 0; x < semantic.width; x += 1) {
      const i = y * semantic.width + x;
      if (semantic.layers.islandId[i] !== ashfallLayerId) continue;
      if (semanticTerrainClassAtCell(semantic, x, y) !== "ash") continue;
      ashCells += 1;
      const slot = semantic.layers.terrainVariant[i] ?? 0;
      if (slot >= 1 && slot <= 3) slotCoverage.set(slot, (slotCoverage.get(slot) ?? 0) + 1);
    }
  }
  const variantCells = [...slotCoverage.values()].reduce((sum, value) => sum + value, 0);
  assert(ashCells > 0, `${world.seed}: Ashfall has no ash terrain cells for material transition validation.`);
  if (variantCells <= 0) return;

  const stats = ashfallMaterialBoundaryStats(world, ashfallLayerId);
  assert(stats.total > 0, `${world.seed}: Ashfall variants exist but no ash/cinder/lava/rock material boundaries were found.`);
  assert(
    stats.intermediate / stats.total >= 0.7,
    `${world.seed}: expected at least 70% blended Ashfall material boundaries, got ${stats.intermediate}/${stats.total}.`
  );
  assert(stats.maxHardRun <= 3, `${world.seed}: found ${stats.maxHardRun} consecutive hard Ashfall material boundary cells.`);
  assert(stats.fullOpaqueTiles === 0, `${world.seed}: ${stats.fullOpaqueTiles} Ashfall variant cells sampled as full opaque TILE x TILE rectangles.`);
  if ((slotCoverage.get(3) ?? 0) > 0) {
    assert(stats.lavaBoundaryTotal > 0, `${world.seed}: Ashfall lava/crust variants exist but no lava/crust boundaries were sampled.`);
    assert(
      stats.lavaTransitionRing / stats.lavaBoundaryTotal >= 0.7,
      `${world.seed}: expected lava/crust edges to expose scorch/cinder/ash transition rings, got ${stats.lavaTransitionRing}/${stats.lavaBoundaryTotal}.`
    );
  }
}

function ashfallMaterialBoundaryStats(world, ashfallLayerId) {
  const semantic = world.semantic;
  const stats = { total: 0, intermediate: 0, lavaBoundaryTotal: 0, lavaTransitionRing: 0, fullOpaqueTiles: 0, maxHardRun: 0 };
  const hardHorizontal = new Map();
  const hardVertical = new Map();
  for (let y = 0; y < semantic.height; y += 1) {
    for (let x = 0; x < semantic.width; x += 1) {
      const i = y * semantic.width + x;
      if (semantic.layers.islandId[i] !== ashfallLayerId) continue;
      if (semanticTerrainClassAtCell(semantic, x, y) !== "ash") continue;
      const currentVariant = semantic.layers.terrainVariant[i] ?? 0;
      if (currentVariant >= 1 && currentVariant <= 3 && ashfallVariantCellIsFullOpaque(world, x, y, currentVariant)) stats.fullOpaqueTiles += 1;
      for (const edge of [
        { dx: 1, dy: 0, orientation: "v" },
        { dx: 0, dy: 1, orientation: "h" }
      ]) {
        const nx = x + edge.dx;
        const ny = y + edge.dy;
        if (nx >= semantic.width || ny >= semantic.height) continue;
        const ni = ny * semantic.width + nx;
        if (semantic.layers.islandId[ni] !== ashfallLayerId) continue;
        if (semanticTerrainClassAtCell(semantic, nx, ny) !== "ash") continue;
        const nextVariant = semantic.layers.terrainVariant[ni] ?? 0;
        if (currentVariant === nextVariant || (currentVariant === 0 && nextVariant === 0)) continue;
        const variantSlots = [currentVariant, nextVariant].filter((slot) => slot > 0);
        const result = terrainVariantEdgeHasTransition(world, "ash", x, y, edge.dx, edge.dy, variantSlots);
        stats.total += 1;
        if (result.intermediate) stats.intermediate += 1;
        if (!result.intermediate && result.hardJump) {
          const key = edge.orientation === "v" ? y : x;
          const position = edge.orientation === "v" ? x : y;
          const runs = edge.orientation === "v" ? hardVertical : hardHorizontal;
          const positions = runs.get(key) ?? [];
          positions.push(position);
          runs.set(key, positions);
        }
        if (variantSlots.includes(3)) {
          stats.lavaBoundaryTotal += 1;
          if (ashfallLavaBoundaryHasTransitionRing(world, x, y, edge.dx, edge.dy)) stats.lavaTransitionRing += 1;
        }
      }
    }
  }
  stats.maxHardRun = Math.max(maxConsecutiveRun(hardHorizontal), maxConsecutiveRun(hardVertical));
  return stats;
}

function ashfallVariantCellIsFullOpaque(world, x, y, variantSlot) {
  for (const offsetY of [0.18, 0.38, 0.62, 0.82]) {
    for (const offsetX of [0.18, 0.38, 0.62, 0.82]) {
      const weight = terrainVariantWeightsAt(world.semantic, "ash", x + offsetX, y + offsetY).find((item) => item.variantSlot === variantSlot)?.weight ?? 0;
      if (weight < 0.9) return false;
    }
  }
  return true;
}

function ashfallLavaBoundaryHasTransitionRing(world, x, y, dx, dy) {
  const boundaryX = x + (dx === 1 ? 1 : 0.5);
  const boundaryY = y + (dy === 1 ? 1 : 0.5);
  for (const across of [-0.85, -0.62, -0.4, -0.22, -0.08, 0.08, 0.22, 0.4, 0.62, 0.85]) {
    for (const along of [-0.3, 0, 0.3]) {
      const sampleX = dx === 1 ? boundaryX + across : boundaryX + along;
      const sampleY = dy === 1 ? boundaryY + along : boundaryY + across;
      const transitionWeights = terrainMaterialWeightsAt(world.semantic, "ash", sampleX, sampleY).filter((item) => item.role === "transition" && item.variantSlot === 3);
      if (transitionWeights.some((item) => ["ash", "cinder", "scorchedEarth", "rock"].includes(item.family) && item.weight >= 0.035)) return true;
    }
  }
  return false;
}

function terrainVariantCoverageFor(world, islandId, terrainClass) {
  const semantic = world.semantic;
  const stats = { total: 0, variant: 0 };
  for (let y = 0; y < semantic.height; y += 1) {
    for (let x = 0; x < semantic.width; x += 1) {
      const i = y * semantic.width + x;
      if (semantic.islandIndexToId.get(semantic.layers.islandId[i]) !== islandId) continue;
      if (semanticTerrainClassAtCell(semantic, x, y) !== terrainClass) continue;
      stats.total += 1;
      if (semantic.layers.terrainVariant[i] > 0) stats.variant += 1;
    }
  }
  return stats;
}

function terrainVariantBoundaryStats(world, classesWithVariants) {
  const semantic = world.semantic;
  const stats = { total: 0, intermediate: 0, directOpaqueJumps: 0, greenhavenGrassTotal: 0, greenhavenGrassIntermediate: 0, maxHardRun: 0, byClass: new Map() };
  const hardHorizontal = new Map();
  const hardVertical = new Map();
  for (let y = 0; y < semantic.height; y += 1) {
    for (let x = 0; x < semantic.width; x += 1) {
      const currentClass = semanticTerrainClassAtCell(semantic, x, y);
      if (!currentClass || !classesWithVariants.has(currentClass)) continue;
      const i = y * semantic.width + x;
      for (const edge of [
        { dx: 1, dy: 0, orientation: "v" },
        { dx: 0, dy: 1, orientation: "h" }
      ]) {
        const nx = x + edge.dx;
        const ny = y + edge.dy;
        if (nx >= semantic.width || ny >= semantic.height) continue;
        const nextClass = semanticTerrainClassAtCell(semantic, nx, ny);
        if (nextClass !== currentClass) continue;
        const ni = ny * semantic.width + nx;
        if (semantic.layers.islandId[i] !== semantic.layers.islandId[ni]) continue;
        const currentVariant = semantic.layers.terrainVariant[i] ?? 0;
        const nextVariant = semantic.layers.terrainVariant[ni] ?? 0;
        if (currentVariant === nextVariant || (currentVariant === 0 && nextVariant === 0)) continue;
        const result = terrainVariantEdgeHasTransition(world, currentClass, x, y, edge.dx, edge.dy, [currentVariant, nextVariant].filter((slot) => slot > 0));
        stats.total += 1;
        if (result.intermediate) stats.intermediate += 1;
        if (result.directOpaqueJump) stats.directOpaqueJumps += 1;
        const classStats = stats.byClass.get(currentClass) ?? { total: 0, intermediate: 0 };
        classStats.total += 1;
        if (result.intermediate) classStats.intermediate += 1;
        stats.byClass.set(currentClass, classStats);
        const islandId = semantic.islandIndexToId.get(semantic.layers.islandId[i]);
        if (islandId === "greenhaven" && currentClass === "grassland") {
          stats.greenhavenGrassTotal += 1;
          if (result.intermediate) stats.greenhavenGrassIntermediate += 1;
        }
        if (!result.intermediate && result.hardJump) {
          const key = edge.orientation === "v" ? y : x;
          const position = edge.orientation === "v" ? x : y;
          const runs = edge.orientation === "v" ? hardVertical : hardHorizontal;
          const positions = runs.get(key) ?? [];
          positions.push(position);
          runs.set(key, positions);
        }
      }
    }
  }
  stats.maxHardRun = Math.max(maxConsecutiveRun(hardHorizontal), maxConsecutiveRun(hardVertical));
  return stats;
}

function terrainVariantEdgeHasTransition(world, terrainClass, x, y, dx, dy, variantSlots) {
  const boundaryX = x + (dx === 1 ? 1 : 0.5);
  const boundaryY = y + (dy === 1 ? 1 : 0.5);
  const acrossOffsets = [-0.92, -0.68, -0.46, -0.28, -0.14, -0.05, 0.05, 0.14, 0.28, 0.46, 0.68, 0.92];
  const alongOffsets = [-0.35, 0, 0.35];
  let intermediate = false;
  let hardJump = false;
  let directOpaqueJump = false;
  let visibleBoundary = false;
  for (const slot of new Set(variantSlots)) {
    const values = [];
    for (const across of acrossOffsets) {
      let sum = 0;
      for (const along of alongOffsets) {
        const sampleX = dx === 1 ? boundaryX + across : boundaryX + along;
        const sampleY = dy === 1 ? boundaryY + across : boundaryY + along;
        sum += terrainVariantWeightsAt(world.semantic, terrainClass, sampleX, sampleY).find((weight) => weight.variantSlot === slot)?.weight ?? 0;
      }
      values.push(sum / alongOffsets.length);
    }
    const low = Math.min(...values);
    const high = Math.max(...values);
    if (high < 0.14) continue;
    visibleBoundary = true;
    if (values.some((value) => value > Math.max(0.05, low + 0.04) && value < Math.min(0.9, high - 0.04))) intermediate = true;
    for (let i = 1; i < values.length; i += 1) {
      if (Math.abs(values[i] - values[i - 1]) > 0.32) hardJump = true;
      if (
        (values[i - 1] <= 0.05 && values[i] >= 0.9) ||
        (values[i] <= 0.05 && values[i - 1] >= 0.9)
      ) {
        directOpaqueJump = true;
      }
    }
  }
  if (!visibleBoundary) return { intermediate: true, hardJump: false, directOpaqueJump: false };
  return { intermediate, hardJump, directOpaqueJump };
}

function maxConsecutiveRun(lines) {
  let best = 0;
  for (const positions of lines.values()) {
    positions.sort((a, b) => a - b);
    let run = 0;
    let previous = Number.NEGATIVE_INFINITY;
    for (const position of positions) {
      run = position === previous + 1 ? run + 1 : 1;
      previous = position;
      best = Math.max(best, run);
    }
  }
  return best;
}

function semanticTerrainClassAtCell(semantic, x, y) {
  if (x < 0 || y < 0 || x >= semantic.width || y >= semantic.height) return undefined;
  const i = y * semantic.width + x;
  if (semantic.layers.riverMap[i] || semantic.layers.lakeMap[i]) return undefined;
  if (!semantic.layers.landMask[i]) return undefined;
  if (semantic.layers.biome[i] === SEMANTIC_BIOME.BEACH) return "beach";
  if (semantic.layers.biome[i] === SEMANTIC_BIOME.ICE) return "ice";
  if (semantic.layers.biome[i] === SEMANTIC_BIOME.SAND) return semantic.islandIndexToId.get(semantic.layers.islandId[i]) === "ashfall" ? "ash" : "sand";
  return "grassland";
}

function validateRoadRibbonVisualInvariant(world) {
  const semantic = world.semantic;
  const stats = roadRibbonBoundaryStats(world);
  const visualEdgeStats = roadRibbonNormalEdgeStats(semantic);
  assert(stats.total > 0, `${world.seed}: no road edges were available for road ribbon validation.`);
  assert(visualEdgeStats.total > 0, `${world.seed}: no road ribbon segments were available for visual edge validation.`);
  assert(stats.strongCenter / stats.total >= 0.78, `${world.seed}: expected most road centers to have strong body alpha, got ${stats.strongCenter}/${stats.total}.`);
  assert(stats.narrowEdges / stats.total >= 0.58, `${world.seed}: expected semantic road edges to stay mostly compact, got ${stats.narrowEdges}/${stats.total}.`);
  assert(visualEdgeStats.compact / visualEdgeStats.total >= 0.86, `${world.seed}: expected compact visual ribbon edges, got ${visualEdgeStats.compact}/${visualEdgeStats.total}.`);
  assert(visualEdgeStats.strongCenter / visualEdgeStats.total >= 0.92, `${world.seed}: expected visual road centers to stay strong, got ${visualEdgeStats.strongCenter}/${visualEdgeStats.total}.`);
  assert(stats.maxHardRun <= 3, `${world.seed}: found ${stats.maxHardRun} consecutive hard road edge cells.`);
  assert(stats.centerDominates >= Math.ceil(stats.total * 0.86), `${world.seed}: road center samples were not consistently stronger than edge samples.`);
  assert(maxLongDiagonalRibbonSegmentRun(semantic) <= 8, `${world.seed}: road ribbon contains a long unsmoothed 45-degree visual segment run.`);

  let roadCells = 0;
  let visibleRoadCells = 0;
  let waterLeakCells = 0;
  for (let y = 0; y < semantic.height; y += 1) {
    for (let x = 0; x < semantic.width; x += 1) {
      const i = y * semantic.width + x;
      const road = semantic.layers.roadMap[i] > 0;
      if (road) {
        roadCells += 1;
        const sample = roadRibbonSampleAt(semantic, x + 0.5, y + 0.5);
        if (sample.bodyAlpha + sample.edgeAlpha >= 0.26 || sample.crossing) visibleRoadCells += 1;
      }
      const blockedWater = (semantic.layers.riverMap[i] > 0 || semantic.layers.lakeMap[i] > 0) && !semantic.layers.riverCrossingMap[i];
      if (blockedWater) {
        const sample = roadRibbonSampleAt(semantic, x + 0.5, y + 0.5);
        if (sample.bodyAlpha + sample.edgeAlpha + sample.shadowAlpha > 0.04) waterLeakCells += 1;
      }
    }
  }
  assert(roadCells > 0, `${world.seed}: semantic road map has no road cells.`);
  assert(visibleRoadCells === roadCells, `${world.seed}: ${roadCells - visibleRoadCells} semantic road cells lack visible center/shoulder road coverage.`);
  assert(waterLeakCells === 0, `${world.seed}: road splat leaked onto ${waterLeakCells} non-crossing river/lake cells.`);

  for (const poi of semantic.poiList) {
    const apron = roadApronCoverageAtPoi(semantic, poi);
    if (apron.hasNearbyRoad) {
      assert(apron.coverage >= 0.34, `${world.seed}: POI ${poi.id} approach lacks visible road ribbon apron coverage (${apron.coverage.toFixed(3)}).`);
    }
  }

  for (const bridge of semantic.bridgeCandidates) {
    const sample = roadRibbonSampleAt(semantic, bridge.x + 0.5, bridge.y + 0.5);
    assert(sample.crossing, `${world.seed}: bridge ${bridge.id} is not marked as a road ribbon crossing.`);
    assert(sample.bodyAlpha + sample.edgeAlpha >= 0.2, `${world.seed}: bridge ${bridge.id} lacks visible road taper coverage.`);
  }

  const roundedJunctions = roundedRoadJunctionStats(semantic);
  if (roundedJunctions.total > 0) {
    assert(roundedJunctions.rounded / roundedJunctions.total >= 0.7, `${world.seed}: expected rounded road junction coverage, got ${roundedJunctions.rounded}/${roundedJunctions.total}.`);
  }
  const widthStats = roadRibbonOrientationWidthStats(semantic);
  if (widthStats.horizontal > 0 && widthStats.vertical > 0) {
    assert(widthStats.vertical >= widthStats.horizontal * 0.85, `${world.seed}: vertical road width ${widthStats.vertical.toFixed(2)} is too thin compared with horizontal ${widthStats.horizontal.toFixed(2)}.`);
  }
}

function roadRibbonBoundaryStats(world) {
  const semantic = world.semantic;
  const stats = { total: 0, strongCenter: 0, narrowEdges: 0, centerDominates: 0, maxHardRun: 0 };
  const hardHorizontal = new Map();
  const hardVertical = new Map();
  for (let y = 0; y < semantic.height; y += 1) {
    for (let x = 0; x < semantic.width; x += 1) {
      const i = y * semantic.width + x;
      if (!semantic.layers.roadMap[i]) continue;
      for (const edge of [
        { dx: 1, dy: 0, orientation: "v" },
        { dx: -1, dy: 0, orientation: "v" },
        { dx: 0, dy: 1, orientation: "h" },
        { dx: 0, dy: -1, orientation: "h" }
      ]) {
        const nx = x + edge.dx;
        const ny = y + edge.dy;
        if (nx < 0 || ny < 0 || nx >= semantic.width || ny >= semantic.height) continue;
        const ni = ny * semantic.width + nx;
        if (semantic.layers.roadMap[ni] || !semantic.layers.landMask[ni] || semantic.layers.riverMap[ni] || semantic.layers.lakeMap[ni]) continue;
        const result = roadRibbonEdgeSampleStats(semantic, x, y, edge.dx, edge.dy);
        stats.total += 1;
        if (result.strongCenter) stats.strongCenter += 1;
        if (result.narrowEdge) stats.narrowEdges += 1;
        if (result.centerDominates) stats.centerDominates += 1;
        if (!result.narrowEdge && result.hardJump) {
          const key = edge.orientation === "v" ? y : x;
          const position = edge.orientation === "v" ? x : y;
          const runs = edge.orientation === "v" ? hardVertical : hardHorizontal;
          const positions = runs.get(key) ?? [];
          positions.push(position);
          runs.set(key, positions);
        }
      }
    }
  }
  stats.maxHardRun = Math.max(maxConsecutiveRun(hardHorizontal), maxConsecutiveRun(hardVertical));
  return stats;
}

function roadRibbonEdgeSampleStats(semantic, x, y, dx, dy) {
  const offsets = [0, 0.18, 0.34, 0.52, 0.7, 0.92, 1.16];
  const alongOffsets = [-0.28, 0, 0.28];
  const values = [];
  const centerValues = [];
  const edgeValues = [];
  for (const offset of offsets) {
    let total = 0;
    let center = 0;
    let edge = 0;
    for (const along of alongOffsets) {
      const sampleX = x + 0.5 + dx * offset + (dy !== 0 ? along : 0);
      const sampleY = y + 0.5 + dy * offset + (dx !== 0 ? along : 0);
      const sample = roadRibbonSampleAt(semantic, sampleX, sampleY);
      total += Math.min(1, sample.bodyAlpha + sample.edgeAlpha + sample.shadowAlpha);
      center += sample.bodyAlpha + sample.centerAlpha * 0.35;
      edge += sample.edgeAlpha + sample.shadowAlpha;
    }
    values.push(total / alongOffsets.length);
    centerValues.push(center / alongOffsets.length);
    edgeValues.push(edge / alongOffsets.length);
  }
  const high = Math.max(...values);
  const low = Math.min(...values);
  const strongCenter = values[0] >= 0.7 || values[1] >= 0.7;
  const narrowEdge = high < 0.18 || (strongCenter && values.some((value, index) => index >= 3 && value <= 0.24) && values[values.length - 1] <= 0.12);
  let hardJump = false;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] >= 0.9 && values[i] <= 0.05) hardJump = true;
    if (Math.abs(values[i] - values[i - 1]) > 0.68 && low <= 0.05 && high >= 0.72) hardJump = true;
  }
  return {
    strongCenter,
    narrowEdge,
    hardJump,
    centerDominates: centerValues[0] > edgeValues[edgeValues.length - 1] + 0.24
  };
}

function roadRibbonNormalEdgeStats(semantic) {
  const stats = { total: 0, compact: 0, strongCenter: 0 };
  for (const segment of roadRibbonDebugSegments(semantic)) {
    const dx = segment.bx - segment.ax;
    const dy = segment.by - segment.ay;
    const length = Math.hypot(dx, dy);
    if (length < 0.35) continue;
    const midX = (segment.ax + segment.bx) / 2;
    const midY = (segment.ay + segment.by) / 2;
    if (nearRoadRibbonApronOrJunction(semantic, midX, midY)) continue;
    const nx = -dy / length;
    const ny = dx / length;
    for (const side of [-1, 1]) {
      const values = [0, 0.32, 0.52, 0.68, 0.84, 1.0].map((offset) => {
        const sample = roadRibbonSampleAt(semantic, midX + nx * side * offset, midY + ny * side * offset);
        return Math.min(1, sample.bodyAlpha + sample.edgeAlpha + sample.shadowAlpha);
      });
      const centerStrong = values[0] >= 0.7;
      const compact = centerStrong && values[4] <= 0.18 && values[5] <= 0.12;
      stats.total += 1;
      if (centerStrong) stats.strongCenter += 1;
      if (compact) stats.compact += 1;
    }
  }
  return stats;
}

function nearRoadRibbonApronOrJunction(semantic, sampleX, sampleY) {
  for (const poi of semantic.poiList) {
    if (Math.hypot(sampleX - (poi.approachTile.x + 0.5), sampleY - (poi.approachTile.y + 0.5)) <= 1.5) return true;
  }
  for (const bridge of semantic.bridgeCandidates) {
    if (Math.hypot(sampleX - (bridge.x + 0.5), sampleY - (bridge.y + 0.5)) <= 1.35) return true;
  }
  const minX = Math.max(0, Math.floor(sampleX) - 2);
  const minY = Math.max(0, Math.floor(sampleY) - 2);
  const maxX = Math.min(semantic.width - 1, Math.floor(sampleX) + 2);
  const maxY = Math.min(semantic.height - 1, Math.floor(sampleY) + 2);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const i = y * semantic.width + x;
      if (!semantic.layers.roadMap[i]) continue;
      const neighbors = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
        [1, -1],
        [1, 1],
        [-1, 1],
        [-1, -1]
      ].filter(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < semantic.width && ny < semantic.height && semantic.layers.roadMap[ny * semantic.width + nx] > 0;
      });
      const cardinal = neighbors.filter(([dx, dy]) => dx === 0 || dy === 0).length;
      const important = neighbors.length <= 1 || cardinal >= 3 || neighbors.length >= 4 || neighbors.length > cardinal;
      if (important && Math.hypot(sampleX - (x + 0.5), sampleY - (y + 0.5)) <= 1.35) return true;
    }
  }
  return false;
}

function roadApronCoverageAtPoi(semantic, poi) {
  const samples = [];
  let hasNearbyRoad = false;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const x = poi.approachTile.x + dx;
      const y = poi.approachTile.y + dy;
      if (x < 0 || y < 0 || x >= semantic.width || y >= semantic.height) continue;
      const i = y * semantic.width + x;
      if (semantic.layers.roadMap[i]) hasNearbyRoad = true;
      samples.push([dx + 0.5, dy + 0.5], [dx + 0.25, dy + 0.5], [dx + 0.75, dy + 0.5], [dx + 0.5, dy + 0.25], [dx + 0.5, dy + 0.75]);
    }
  }
  let best = 0;
  for (const [ox, oy] of samples) {
    const sample = roadRibbonSampleAt(semantic, poi.approachTile.x + ox, poi.approachTile.y + oy);
    best = Math.max(best, sample.bodyAlpha + sample.edgeAlpha);
  }
  return { coverage: best, hasNearbyRoad };
}

function roundedRoadJunctionStats(semantic) {
  const stats = { total: 0, rounded: 0 };
  for (let y = 1; y < semantic.height - 1; y += 1) {
    for (let x = 1; x < semantic.width - 1; x += 1) {
      const i = y * semantic.width + x;
      if (!semantic.layers.roadMap[i]) continue;
      const cardinal = [
        semantic.layers.roadMap[(y - 1) * semantic.width + x],
        semantic.layers.roadMap[y * semantic.width + x + 1],
        semantic.layers.roadMap[(y + 1) * semantic.width + x],
        semantic.layers.roadMap[y * semantic.width + x - 1]
      ].filter(Boolean).length;
      if (cardinal < 3) continue;
      stats.total += 1;
      const samples = [
        [0.5, -0.42],
        [0.92, 0.5],
        [0.5, 0.92],
        [-0.42, 0.5],
        [0.84, 0.16],
        [0.84, 0.84],
        [0.16, 0.84],
        [0.16, 0.16]
      ];
      const covered = samples.filter(([ox, oy]) => {
        const sample = roadRibbonSampleAt(semantic, x + ox, y + oy);
        return sample.bodyAlpha + sample.edgeAlpha >= 0.22;
      }).length;
      if (covered >= 6) stats.rounded += 1;
    }
  }
  return stats;
}

function roadRibbonOrientationWidthStats(semantic) {
  const verticalWidths = [];
  const horizontalWidths = [];
  for (let y = 2; y < semantic.height - 2; y += 1) {
    for (let x = 2; x < semantic.width - 2; x += 1) {
      const i = y * semantic.width + x;
      if (!semantic.layers.roadMap[i]) continue;
      const north = semantic.layers.roadMap[(y - 1) * semantic.width + x];
      const south = semantic.layers.roadMap[(y + 1) * semantic.width + x];
      const east = semantic.layers.roadMap[y * semantic.width + x + 1];
      const west = semantic.layers.roadMap[y * semantic.width + x - 1];
      if (north && south && !east && !west && verticalWidths.length < 24) verticalWidths.push(visibleRoadWidthAt(semantic, x, y, "vertical"));
      if (east && west && !north && !south && horizontalWidths.length < 24) horizontalWidths.push(visibleRoadWidthAt(semantic, x, y, "horizontal"));
    }
  }
  return {
    vertical: averagePositive(verticalWidths),
    horizontal: averagePositive(horizontalWidths)
  };
}

function visibleRoadWidthAt(semantic, x, y, orientation) {
  const offsets = [];
  for (let offset = -1.2; offset <= 1.2001; offset += 0.08) offsets.push(offset);
  const visible = offsets.filter((offset) => {
    const sampleX = orientation === "vertical" ? x + 0.5 + offset : x + 0.5;
    const sampleY = orientation === "horizontal" ? y + 0.5 + offset : y + 0.5;
    const sample = roadRibbonSampleAt(semantic, sampleX, sampleY);
    return sample.bodyAlpha + sample.edgeAlpha >= 0.18;
  });
  return visible.length * 0.08;
}

function averagePositive(values) {
  const positive = values.filter((value) => value > 0);
  if (positive.length === 0) return 0;
  return positive.reduce((sum, value) => sum + value, 0) / positive.length;
}

function maxLongDiagonalRibbonSegmentRun(semantic) {
  let longest = 0;
  let currentSlope = "";
  let currentRun = 0;
  for (const segment of roadRibbonDebugSegments(semantic)) {
    const dx = segment.bx - segment.ax;
    const dy = segment.by - segment.ay;
    const diagonal = Math.abs(dx) > 0.35 && Math.abs(dy) > 0.35;
    const slope = diagonal ? `${Math.round((dy / dx) * 10) / 10}` : "";
    if (diagonal && slope === currentSlope) currentRun += Math.hypot(dx, dy);
    else currentRun = diagonal ? Math.hypot(dx, dy) : 0;
    currentSlope = slope;
    longest = Math.max(longest, currentRun);
  }
  return longest;
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
    islands: world.islands.map((island) => ({ id: island.id, bounds: island.bounds, settlement: island.settlementPosition, harbor: island.harborPosition })),
    pois: world.pois.map((poi) => ({ id: poi.id, kind: poi.kind, islandId: poi.islandId, x: poi.x, y: poi.y })),
    mountainRanges: world.semantic.mountainRanges.map((range) => ({ id: range.id, islandId: range.islandId, kind: range.kind, cells: range.cells.length, smallOutcrop: !!range.smallOutcrop })),
    roads: world.roads,
    rivers: world.rivers.map((river) => river.length),
    bridgeCandidates: world.semantic.bridgeCandidates.length,
    boatRoutes: world.semantic.boatRoutes.map((route) => ({
      from: route.fromIslandId,
      to: route.toIslandId,
      length: route.length,
      nodes: route.path.length,
      waypoints: route.waypoints.length
    })),
    start: world.startPosition,
    stats: world.semantic.stats
  });
}

function validateBoatRoutesAndIslandSeparation(world) {
  assert(world.semantic.boatRoutes.length === REQUIRED_MAJOR_HARBOR_ROUTE_PAIRS.length, `Expected ${REQUIRED_MAJOR_HARBOR_ROUTE_PAIRS.length} required boat routes, got ${world.semantic.boatRoutes.length}.`);
  for (const route of world.semantic.boatRoutes) {
    const routeErrors = validateBoatPath(world.semantic, route.path);
    assert(routeErrors.length === 0, `Boat route ${route.fromHarborId} -> ${route.toHarborId} failed terrain validation: ${routeErrors.join("; ")}`);
    assert(route.waypoints.length >= 2, `Boat route ${route.fromHarborId} -> ${route.toHarborId} has no compass waypoints.`);
    for (let i = 1; i < route.waypoints.length; i += 1) {
      assert(isLegalBoatSegment(route.waypoints[i - 1], route.waypoints[i]), `Boat route ${route.fromHarborId} -> ${route.toHarborId} has arbitrary-angle segment ${route.waypoints[i - 1].x},${route.waypoints[i - 1].y} -> ${route.waypoints[i].x},${route.waypoints[i].y}.`);
    }
    for (const cell of route.path) {
      const index = cell.y * world.width + cell.x;
      assert(isBoatNavigableTile(world.semantic, cell.x, cell.y), `Boat route ${route.fromHarborId} -> ${route.toHarborId} crosses non-water at ${cell.x},${cell.y}.`);
      assert(world.semantic.layers.reservedBoatRouteMap[index] === 1, `Boat route ${route.fromHarborId} -> ${route.toHarborId} is not reserved at ${cell.x},${cell.y}.`);
    }
  }

  const components = majorIslandComponents(world);
  assert(components.length === MAJOR_ISLAND_IDS.length, `Expected ${MAJOR_ISLAND_IDS.length} major island components, got ${components.length}.`);
  for (let a = 0; a < components.length; a += 1) {
    for (let b = a + 1; b < components.length; b += 1) {
      const gap = minimumChebyshevGap(components[a], components[b]);
      assert(gap >= 10, `Major islands ${components[a].id} and ${components[b].id} are only ${gap} open-sea tiles apart.`);
    }
  }
}

function majorIslandComponents(world) {
  const seen = new Set();
  const components = [];
  const majorIds = new Set(MAJOR_ISLAND_IDS);
  for (let i = 0; i < world.width * world.height; i += 1) {
    const islandId = world.semantic.islandIndexToId.get(world.semantic.layers.islandId[i]);
    if (!majorIds.has(islandId) || seen.has(i)) continue;
    const component = { id: islandId, cells: [] };
    const queue = [{ x: i % world.width, y: Math.floor(i / world.width) }];
    seen.add(i);
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      component.cells.push(cell);
      for (const next of neighbors4(cell.x, cell.y)) {
        if (next.x < 0 || next.y < 0 || next.x >= world.width || next.y >= world.height) continue;
        const ni = next.y * world.width + next.x;
        if (seen.has(ni) || world.semantic.islandIndexToId.get(world.semantic.layers.islandId[ni]) !== islandId) continue;
        seen.add(ni);
        queue.push(next);
      }
    }
    components.push(component);
  }
  return components;
}

function minimumChebyshevGap(a, b) {
  let minimum = Number.POSITIVE_INFINITY;
  for (const ac of a.cells) {
    for (const bc of b.cells) {
      const gap = Math.max(Math.abs(ac.x - bc.x), Math.abs(ac.y - bc.y)) - 1;
      if (gap < minimum) minimum = gap;
    }
  }
  return minimum;
}

function isLegalBoatSegment(from, to) {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  return (dx !== 0 || dy !== 0) && (dx === 0 || dy === 0 || dx === dy);
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

function roadEdgeTouchesPoiApproach(world, edge, poi) {
  const semanticPoi = world.semantic.poiList.find((candidate) => candidate.id === poi.id);
  assert(semanticPoi, `POI ${poi.id} is missing semantic anchor data.`);
  return edge.path.some((cell) => cell.x === semanticPoi.approachTile.x && cell.y === semanticPoi.approachTile.y);
}

function isPoiEntranceTile(poi, x, y) {
  const semanticPoi = "entranceTile" in poi ? poi : undefined;
  return semanticPoi ? semanticPoi.entranceTile.x === x && semanticPoi.entranceTile.y === y : false;
}

function isPoiEntranceRoadCell(world, x, y) {
  return world.semantic.poiList.some((poi) => poi.entranceTile.x === x && poi.entranceTile.y === y);
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
