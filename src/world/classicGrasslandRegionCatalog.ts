import classicWorldTilesetManifestJson from "../assets/world/tilesets/classicWorldTileset.manifest.json" with { type: "json" };

export const CLASSIC_WORLD_TILESET_ID = "classic_world_tileset" as const;
export const CLASSIC_WORLD_TILESET_TEXTURE_KEY = "classic_world_tileset" as const;
export const CLASSIC_WORLD_TILESET_IMAGE = "src/assets/world/tilesets/classic_world_tileset.cleaned.png" as const;
export const CLASSIC_WORLD_TILESET_MANIFEST_PATH = "src/assets/world/tilesets/classicWorldTileset.manifest.json" as const;

export const CLASSIC_GRASSLAND_REGION_CATALOG_ID = "classic_grassland_regions_07_10" as const;
export const CLASSIC_GRASSLAND_ACTIVE_MACRO_REGIONS = [7, 10] as const;
export const CLASSIC_GRASSLAND_WORLDGEN_MODE = "island grassland composition" as const;
export const CLASSIC_GRASSLAND_USES_FULL_TILE_POOL = false as const;
export const CLASSIC_GRASSLAND_USES_REFERENCE_IMAGE_AS_RUNTIME_ASSET = false as const;
export const CLASSIC_GRASSLAND_REFERENCE_IMAGE_PATH = "C:/Users/Marku/Downloads/ctworldmap1000ad.png" as const;

export type ClassicGrasslandMacroRegion = (typeof CLASSIC_GRASSLAND_ACTIVE_MACRO_REGIONS)[number];
export type ClassicManifestKind =
  | "terrain_tile"
  | "autotile_piece"
  | "object"
  | "landmark"
  | "poi"
  | "decoration"
  | "connector"
  | "city_piece";

export type ClassicWorldBiome =
  | "grassland"
  | "forest"
  | "shore"
  | "desert"
  | "snow"
  | "darkland"
  | "water"
  | "mountain"
  | "road"
  | "city"
  | "special";

export type ClassicWorldEncounterFamily =
  | "plains"
  | "forest"
  | "hills"
  | "sand"
  | "water"
  | "road"
  | "final";

export type ClassicWorldWalkability =
  | "walkable"
  | "blocked"
  | "water"
  | "bridge"
  | "poi_entry"
  | "decorative_overlay";

export type ClassicGrasslandTerrainCategory =
  | "grassBase"
  | "grassVariants"
  | "path"
  | "shore"
  | "shallowWater"
  | "deepWater"
  | "mountainBase"
  | "forestGround";

export type ClassicGrasslandObjectCategory =
  | "forestClusters"
  | "smallTreeClusters"
  | "mountainTops"
  | "mountainDetails"
  | "villagePieces"
  | "stairsOrDocks"
  | "decorativeLandmarks"
  | "villageSmall"
  | "villageLarge"
  | "castleOrTown"
  | "caveOrMountainEntrance"
  | "dockOrPort"
  | "specialLandmark";

export interface ClassicSourceRect {
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ClassicManifestAsset {
  id?: string;
  displayName?: string;
  kind?: ClassicManifestKind;
  group: string;
  biome?: string;
  source: ClassicSourceRect;
  anchor?: { x: number; y: number };
  footprint?: { widthTiles: number; heightTiles: number };
  walkability?: ClassicWorldWalkability;
  worldgen?: {
    weight?: number;
    tags?: string[];
    compatibleWith?: string[];
    canRepeat?: boolean;
    [key: string]: unknown;
  };
  notes?: string;
  confidence?: "high" | "medium" | "low";
}

interface ClassicWorldTilesetManifest {
  schemaVersion: number;
  sourceImage: string;
  originalSource: string;
  image: {
    width: number;
    height: number;
    hasAlpha: boolean;
    backgroundMode: "alpha" | "chroma-key";
    transparentColor: string;
  };
  baseGrid: {
    detectedTileSizes?: number[];
    chosenTileSize: number;
    columns: number;
    rows: number;
    notes?: string;
  };
  groups: Record<
    string,
    {
      displayName: string;
      biome: string;
      sourceRect: { x: number; y: number; width: number; height: number };
      description: string;
    }
  >;
  tiles: Record<string, ClassicManifestAsset>;
  objects: Record<string, ClassicManifestAsset>;
}

export const CLASSIC_WORLD_TILESET_MANIFEST =
  classicWorldTilesetManifestJson as ClassicWorldTilesetManifest;

export interface ClassicWorldTerrainDefinition<TId extends string = string> {
  id: TId;
  manifestId: string;
  manifestKind: ClassicManifestKind;
  sourceAssetId: string;
  displayName: string;
  kind: Extract<ClassicManifestKind, "terrain_tile" | "autotile_piece" | "connector">;
  category: ClassicGrasslandTerrainCategory;
  macroRegion: ClassicGrasslandMacroRegion;
  group: string;
  biome: ClassicWorldBiome;
  source: ClassicSourceRect;
  sourceRect: ClassicSourceRect;
  walkable: boolean;
  walkability: ClassicWorldWalkability;
  movementCost: number;
  encounterFamily: ClassicWorldEncounterFamily;
  tags: string[];
  confidence: "high" | "medium";
  placement: {
    compatibleWith: string[];
    canRepeat: boolean;
    avoidOn?: string[];
  };
  notes: string;
}

export interface ClassicWorldObjectDefinition<TId extends string = string> {
  id: TId;
  manifestId: string;
  sourceAssetId: string;
  displayName: string;
  kind: ClassicManifestKind;
  category: ClassicGrasslandObjectCategory;
  macroRegion: ClassicGrasslandMacroRegion;
  group: string;
  biome: ClassicWorldBiome;
  source: ClassicSourceRect;
  sourceRect: ClassicSourceRect;
  anchor: { x: number; y: number };
  footprint: { widthTiles: number; heightTiles: number };
  walkability: ClassicWorldWalkability;
  tags: string[];
  confidence: "high" | "medium";
  placement: {
    allowedOn: string[];
    avoidOn: string[];
    minSpacing: number;
    canRepeat: boolean;
    blocksMovement: boolean;
    unique?: boolean;
  };
  worldgen: {
    weight: number;
    tags: string[];
    requiresNeighborLogic: boolean;
    poiType?: string;
    entryOffset?: { x: number; y: number };
  };
  notes: string;
}

const MACRO_REGION_BY_GROUP: Record<string, ClassicGrasslandMacroRegion | undefined> = {
  red_blue_town_landmarks: 7,
  west_coast_forest_terrain: 10,
};

function macroRegionFor(asset: ClassicManifestAsset, sourceAssetId: string): ClassicGrasslandMacroRegion {
  const macroRegion = MACRO_REGION_BY_GROUP[asset.group];
  if (!macroRegion) {
    throw new Error(
      `Classic grassland catalog may only use macro regions 7 and 10; ${sourceAssetId} belongs to ${asset.group}.`,
    );
  }
  return macroRegion;
}

function manifestTerrain(sourceAssetId: string): ClassicManifestAsset {
  const asset = CLASSIC_WORLD_TILESET_MANIFEST.tiles[sourceAssetId];
  if (!asset) {
    throw new Error(`Classic grassland terrain asset not found in manifest: ${sourceAssetId}`);
  }
  return asset;
}

function manifestObject(sourceAssetId: string): ClassicManifestAsset {
  const asset =
    CLASSIC_WORLD_TILESET_MANIFEST.objects[sourceAssetId] ??
    CLASSIC_WORLD_TILESET_MANIFEST.tiles[sourceAssetId];
  if (!asset) {
    throw new Error(`Classic grassland object asset not found in manifest: ${sourceAssetId}`);
  }
  return asset;
}

function withCommonTags(tags: string[], category: string, macroRegion: ClassicGrasslandMacroRegion): string[] {
  return Array.from(new Set([...tags, category, `macro_region_${macroRegion}`, "classic_grassland_region_7_10"]));
}

function terrain<TId extends string>(definition: {
  id: TId;
  sourceAssetId: string;
  displayName: string;
  category: ClassicGrasslandTerrainCategory;
  biome: ClassicWorldBiome;
  walkable: boolean;
  walkability?: ClassicWorldWalkability;
  movementCost: number;
  encounterFamily: ClassicWorldEncounterFamily;
  tags: string[];
  confidence?: "high" | "medium";
  compatibleWith: string[];
  avoidOn?: string[];
  notes: string;
}): ClassicWorldTerrainDefinition<TId> {
  const asset = manifestTerrain(definition.sourceAssetId);
  const macroRegion = macroRegionFor(asset, definition.sourceAssetId);
  return {
    id: definition.id,
    manifestId: definition.sourceAssetId,
    manifestKind: asset.kind ?? "terrain_tile",
    sourceAssetId: definition.sourceAssetId,
    displayName: definition.displayName,
    kind: (asset.kind === "autotile_piece" || asset.kind === "connector" ? asset.kind : "terrain_tile") as
      | "terrain_tile"
      | "autotile_piece"
      | "connector",
    category: definition.category,
    macroRegion,
    group: asset.group,
    biome: definition.biome,
    source: asset.source,
    sourceRect: asset.source,
    walkable: definition.walkable,
    walkability:
      definition.walkability ?? (definition.walkable ? ("walkable" as const) : ("blocked" as const)),
    movementCost: definition.movementCost,
    encounterFamily: definition.encounterFamily,
    tags: withCommonTags(definition.tags, definition.category, macroRegion),
    confidence: definition.confidence ?? "high",
    placement: {
      compatibleWith: definition.compatibleWith,
      canRepeat: true,
      avoidOn: definition.avoidOn,
    },
    notes: definition.notes,
  };
}

function objectAsset<TId extends string>(definition: {
  id: TId;
  sourceAssetId: string;
  displayName: string;
  kind?: ClassicManifestKind;
  category: ClassicGrasslandObjectCategory;
  biome: ClassicWorldBiome;
  anchor?: { x: number; y: number };
  footprint?: { widthTiles: number; heightTiles: number };
  walkability: ClassicWorldWalkability;
  tags: string[];
  confidence?: "high" | "medium";
  allowedOn: string[];
  avoidOn: string[];
  minSpacing?: number;
  canRepeat?: boolean;
  blocksMovement?: boolean;
  unique?: boolean;
  weight?: number;
  requiresNeighborLogic?: boolean;
  poiType?: string;
  entryOffset?: { x: number; y: number };
  notes: string;
}): ClassicWorldObjectDefinition<TId> {
  const asset = manifestObject(definition.sourceAssetId);
  const macroRegion = macroRegionFor(asset, definition.sourceAssetId);
  return {
    id: definition.id,
    manifestId: definition.sourceAssetId,
    sourceAssetId: definition.sourceAssetId,
    displayName: definition.displayName,
    kind: definition.kind ?? asset.kind ?? "object",
    category: definition.category,
    macroRegion,
    group: asset.group,
    biome: definition.biome,
    source: asset.source,
    sourceRect: asset.source,
    anchor: definition.anchor ?? asset.anchor ?? { x: 0.5, y: 1 },
    footprint: definition.footprint ?? asset.footprint ?? { widthTiles: 1, heightTiles: 1 },
    walkability: definition.walkability,
    tags: withCommonTags(definition.tags, definition.category, macroRegion),
    confidence: definition.confidence ?? "high",
    placement: {
      allowedOn: definition.allowedOn,
      avoidOn: definition.avoidOn,
      minSpacing: definition.minSpacing ?? 0,
      canRepeat: definition.canRepeat ?? true,
      blocksMovement:
        definition.blocksMovement ??
        (definition.walkability === "blocked" || definition.walkability === "water"),
      unique: definition.unique,
    },
    worldgen: {
      weight: definition.weight ?? 1,
      tags: withCommonTags(definition.tags, definition.category, macroRegion),
      requiresNeighborLogic: definition.requiresNeighborLogic ?? false,
      poiType: definition.poiType,
      entryOffset: definition.entryOffset,
    },
    notes: definition.notes,
  };
}

export const CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY = {
  grassBase: [
    terrain({
      id: "classic_region_grass_base_01",
      sourceAssetId: "west_coast_forest_grass_tile_052",
      displayName: "Region 10 Open Grass Base 01",
      category: "grassBase",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "land", "base"],
      compatibleWith: ["grassland", "forest", "road"],
      notes: "Stable open grass from region 10, used as the primary island interior tile.",
    }),
    terrain({
      id: "classic_region_grass_base_02",
      sourceAssetId: "west_coast_forest_grass_tile_053",
      displayName: "Region 10 Open Grass Base 02",
      category: "grassBase",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "land", "base"],
      compatibleWith: ["grassland", "forest", "road"],
      notes: "Near-match grass base for patch variation without noisy tile soup.",
    }),
    terrain({
      id: "classic_region_grass_base_03",
      sourceAssetId: "west_coast_forest_grass_tile_054",
      displayName: "Region 10 Open Grass Base 03",
      category: "grassBase",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "land", "base"],
      compatibleWith: ["grassland", "forest", "road"],
      notes: "Low-contrast grass tile for larger coherent grass patches.",
    }),
    terrain({
      id: "classic_region_grass_base_04",
      sourceAssetId: "west_coast_forest_grass_tile_057",
      displayName: "Region 10 Open Grass Base 04",
      category: "grassBase",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "land", "base"],
      compatibleWith: ["grassland", "forest", "road"],
      notes: "Companion open grass tile from the same macro-region patch.",
    }),
    terrain({
      id: "classic_region_grass_base_05",
      sourceAssetId: "west_coast_forest_grass_tile_074",
      displayName: "Region 10 Open Grass Base 05",
      category: "grassBase",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "land", "base"],
      compatibleWith: ["grassland", "forest", "road"],
      notes: "Southern region 10 grass, used sparingly as a base tile.",
    }),
    terrain({
      id: "classic_region_grass_base_06",
      sourceAssetId: "west_coast_forest_grass_tile_079",
      displayName: "Region 10 Open Grass Base 06",
      category: "grassBase",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "land", "base"],
      compatibleWith: ["grassland", "forest", "road"],
      notes: "Used for broad grass fill after shoreline and paths are applied.",
    }),
  ],
  grassVariants: [
    terrain({
      id: "classic_region_grass_variant_01",
      sourceAssetId: "west_coast_forest_grass_tile_015",
      displayName: "Region 10 Grass Texture Variant 01",
      category: "grassVariants",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "variant", "land"],
      compatibleWith: ["grassland"],
      notes: "Subtle terrain variation used in slow, coherent patches.",
    }),
    terrain({
      id: "classic_region_grass_variant_02",
      sourceAssetId: "west_coast_forest_grass_tile_016",
      displayName: "Region 10 Grass Texture Variant 02",
      category: "grassVariants",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "variant", "land"],
      compatibleWith: ["grassland"],
      notes: "Companion grass variant; not used as a random single-cell scatter.",
    }),
    terrain({
      id: "classic_region_grass_variant_03",
      sourceAssetId: "west_coast_forest_grass_tile_020",
      displayName: "Region 10 Grass Texture Variant 03",
      category: "grassVariants",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "variant", "land"],
      compatibleWith: ["grassland"],
      notes: "Selected from the same region 10 grass cluster to keep palette consistent.",
    }),
    terrain({
      id: "classic_region_grass_variant_04",
      sourceAssetId: "west_coast_forest_grass_tile_021",
      displayName: "Region 10 Grass Texture Variant 04",
      category: "grassVariants",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "variant", "land"],
      compatibleWith: ["grassland"],
      notes: "Patchy grass accent, suitable for meadows and clearings.",
    }),
    terrain({
      id: "classic_region_grass_variant_05",
      sourceAssetId: "west_coast_forest_grass_tile_022",
      displayName: "Region 10 Grass Texture Variant 05",
      category: "grassVariants",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "variant", "land"],
      compatibleWith: ["grassland"],
      notes: "Used for larger organic grass clusters, not checkerboard alternation.",
    }),
    terrain({
      id: "classic_region_grass_variant_06",
      sourceAssetId: "west_coast_forest_grass_tile_073",
      displayName: "Region 10 Grass Texture Variant 06",
      category: "grassVariants",
      biome: "grassland",
      walkable: true,
      movementCost: 1,
      encounterFamily: "plains",
      tags: ["grass", "variant", "land"],
      compatibleWith: ["grassland"],
      notes: "Compatible region 10 grass accent for inland variation.",
    }),
  ],
  path: [
    terrain({
      id: "classic_region_path_01",
      sourceAssetId: "west_coast_forest_grass_tile_065",
      displayName: "Region 10 Worn Dirt Path 01",
      category: "path",
      biome: "road",
      walkable: true,
      movementCost: 0.85,
      encounterFamily: "road",
      tags: ["road", "path", "dirt"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Tan path-like tile used for organic routes between POIs.",
    }),
    terrain({
      id: "classic_region_path_02",
      sourceAssetId: "west_coast_forest_grass_tile_066",
      displayName: "Region 10 Worn Dirt Path 02",
      category: "path",
      biome: "road",
      walkable: true,
      movementCost: 0.85,
      encounterFamily: "road",
      tags: ["road", "path", "dirt"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Companion path tile for curved, uneven trail segments.",
    }),
    terrain({
      id: "classic_region_path_03",
      sourceAssetId: "west_coast_forest_grass_tile_067",
      displayName: "Region 10 Worn Dirt Path 03",
      category: "path",
      biome: "road",
      walkable: true,
      movementCost: 0.85,
      encounterFamily: "road",
      tags: ["road", "path", "dirt"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Used for intersections and wider clearings.",
    }),
    terrain({
      id: "classic_region_path_04",
      sourceAssetId: "west_coast_forest_grass_tile_068",
      displayName: "Region 10 Worn Dirt Path 04",
      category: "path",
      biome: "road",
      walkable: true,
      movementCost: 0.85,
      encounterFamily: "road",
      tags: ["road", "path", "dirt", "poi_ground"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Used under and around settlements so POIs sit in clearings.",
    }),
    terrain({
      id: "classic_region_path_05",
      sourceAssetId: "west_coast_forest_grass_tile_037",
      displayName: "Region 10 Pale Path 01",
      category: "path",
      biome: "road",
      walkable: true,
      movementCost: 0.85,
      encounterFamily: "road",
      tags: ["road", "path", "pale_dirt"],
      compatibleWith: ["grassland", "shore"],
      notes: "Light path/clearing tile useful near beaches and docks.",
    }),
    terrain({
      id: "classic_region_path_06",
      sourceAssetId: "west_coast_forest_grass_tile_038",
      displayName: "Region 10 Pale Path 02",
      category: "path",
      biome: "road",
      walkable: true,
      movementCost: 0.85,
      encounterFamily: "road",
      tags: ["road", "path", "pale_dirt"],
      compatibleWith: ["grassland", "shore"],
      notes: "Second pale path tile used for beach-adjacent trails.",
    }),
  ],
  shore: [
    terrain({
      id: "classic_region_shore_01",
      sourceAssetId: "west_coast_coast_mixed_tile_052",
      displayName: "Region 10 Sandy Shore 01",
      category: "shore",
      biome: "shore",
      walkable: true,
      movementCost: 1.15,
      encounterFamily: "sand",
      tags: ["shore", "beach", "coast"],
      compatibleWith: ["grassland", "water"],
      notes: "Primary walkable sand/coast ring tile.",
    }),
    terrain({
      id: "classic_region_shore_02",
      sourceAssetId: "west_coast_coast_mixed_tile_053",
      displayName: "Region 10 Sandy Shore 02",
      category: "shore",
      biome: "shore",
      walkable: true,
      movementCost: 1.15,
      encounterFamily: "sand",
      tags: ["shore", "beach", "coast"],
      compatibleWith: ["grassland", "water"],
      notes: "Companion sand/coast tile for coastline variation.",
    }),
    terrain({
      id: "classic_region_shore_03",
      sourceAssetId: "west_coast_coast_mixed_tile_057",
      displayName: "Region 10 Sandy Shore 03",
      category: "shore",
      biome: "shore",
      walkable: true,
      movementCost: 1.15,
      encounterFamily: "sand",
      tags: ["shore", "beach", "coast"],
      compatibleWith: ["grassland", "water"],
      notes: "Used only on land cells adjacent to water.",
    }),
    terrain({
      id: "classic_region_shore_04",
      sourceAssetId: "west_coast_coast_mixed_tile_052",
      displayName: "Region 10 Sandy Shore 04",
      category: "shore",
      biome: "shore",
      walkable: true,
      movementCost: 1.15,
      encounterFamily: "sand",
      tags: ["shore", "beach", "coast"],
      compatibleWith: ["grassland", "water"],
      notes: "Adds broken coastline detail without using random scraps.",
    }),
    terrain({
      id: "classic_region_shore_05",
      sourceAssetId: "west_coast_coast_mixed_tile_053",
      displayName: "Region 10 Sandy Shore 05",
      category: "shore",
      biome: "shore",
      walkable: true,
      movementCost: 1.15,
      encounterFamily: "sand",
      tags: ["shore", "beach", "coast"],
      compatibleWith: ["grassland", "water"],
      notes: "Pale coast tile used for irregular beach ring patches.",
    }),
    terrain({
      id: "classic_region_shore_06",
      sourceAssetId: "west_coast_coast_mixed_tile_057",
      displayName: "Region 10 Sandy Shore 06",
      category: "shore",
      biome: "shore",
      walkable: true,
      movementCost: 1.15,
      encounterFamily: "sand",
      tags: ["shore", "beach", "coast"],
      compatibleWith: ["grassland", "water"],
      notes: "Used as an alternate shore face in the coastline ring.",
    }),
    terrain({
      id: "classic_region_shore_07",
      sourceAssetId: "west_coast_coast_mixed_tile_052",
      displayName: "Region 10 Sandy Shore 07",
      category: "shore",
      biome: "shore",
      walkable: true,
      movementCost: 1.15,
      encounterFamily: "sand",
      tags: ["shore", "beach", "coast"],
      compatibleWith: ["grassland", "water"],
      notes: "Coastline accent used sparingly on exposed corners.",
    }),
    terrain({
      id: "classic_region_shore_08",
      sourceAssetId: "west_coast_coast_mixed_tile_053",
      displayName: "Region 10 Rocky Shore 01",
      category: "shore",
      biome: "shore",
      walkable: true,
      movementCost: 1.2,
      encounterFamily: "sand",
      tags: ["shore", "beach", "rocky_coast"],
      compatibleWith: ["grassland", "water", "mountain"],
      notes: "Rockier shore piece used near mountains and rugged coast.",
    }),
  ],
  shallowWater: [
    terrain({
      id: "classic_region_shallow_water_01",
      sourceAssetId: "west_coast_coast_mixed_tile_031",
      displayName: "Region 10 Coastal Water 01",
      category: "shallowWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "shallow", "coastal"],
      compatibleWith: ["water", "shore"],
      avoidOn: ["land"],
      notes: "Near-shore water halo around coastlines; blocked for movement.",
    }),
    terrain({
      id: "classic_region_shallow_water_02",
      sourceAssetId: "west_coast_coast_mixed_tile_032",
      displayName: "Region 10 Coastal Water 02",
      category: "shallowWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "shallow", "coastal"],
      compatibleWith: ["water", "shore"],
      avoidOn: ["land"],
      notes: "Second near-shore water tile for organic water edges.",
    }),
    terrain({
      id: "classic_region_shallow_water_03",
      sourceAssetId: "west_coast_coast_mixed_tile_029",
      displayName: "Region 10 Coastal Water 03",
      category: "shallowWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "shallow", "coastal"],
      compatibleWith: ["water", "shore"],
      avoidOn: ["land"],
      notes: "Light water used within two cells of land.",
    }),
    terrain({
      id: "classic_region_shallow_water_04",
      sourceAssetId: "west_coast_coast_mixed_tile_030",
      displayName: "Region 10 Coastal Water 04",
      category: "shallowWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "shallow", "coastal"],
      compatibleWith: ["water", "shore"],
      avoidOn: ["land"],
      notes: "Coastal water variant; never used inland as random water.",
    }),
    terrain({
      id: "classic_region_shallow_water_05",
      sourceAssetId: "west_coast_coast_mixed_tile_041",
      displayName: "Region 10 Coastal Water 05",
      category: "shallowWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "shallow", "coastal"],
      compatibleWith: ["water", "shore"],
      avoidOn: ["land"],
      notes: "Softer near-shore water tile.",
    }),
    terrain({
      id: "classic_region_shallow_water_06",
      sourceAssetId: "west_coast_coast_mixed_tile_047",
      displayName: "Region 10 Coastal Water 06",
      category: "shallowWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "shallow", "coastal"],
      compatibleWith: ["water", "shore"],
      avoidOn: ["land"],
      notes: "Coastal water variant used in shallow halos.",
    }),
  ],
  deepWater: [
    terrain({
      id: "classic_region_deep_water_01",
      sourceAssetId: "west_coast_coast_mixed_tile_024",
      displayName: "Region 10 Deep Ocean 01",
      category: "deepWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "deep"],
      compatibleWith: ["water"],
      avoidOn: ["land"],
      notes: "Dark ocean fill outside the islands.",
    }),
    terrain({
      id: "classic_region_deep_water_02",
      sourceAssetId: "west_coast_coast_mixed_tile_028",
      displayName: "Region 10 Deep Ocean 02",
      category: "deepWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "deep"],
      compatibleWith: ["water"],
      avoidOn: ["land"],
      notes: "Deep ocean companion tile.",
    }),
    terrain({
      id: "classic_region_deep_water_03",
      sourceAssetId: "west_coast_coast_mixed_tile_025",
      displayName: "Region 10 Deep Ocean 03",
      category: "deepWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "deep"],
      compatibleWith: ["water"],
      avoidOn: ["land"],
      notes: "Used away from coastlines to keep ocean visually dark.",
    }),
    terrain({
      id: "classic_region_deep_water_04",
      sourceAssetId: "west_coast_coast_mixed_tile_035",
      displayName: "Region 10 Deep Ocean 04",
      category: "deepWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "deep"],
      compatibleWith: ["water"],
      avoidOn: ["land"],
      notes: "Deep ocean variant for broad water fields.",
    }),
    terrain({
      id: "classic_region_deep_water_05",
      sourceAssetId: "west_coast_coast_mixed_tile_038",
      displayName: "Region 10 Deep Ocean 05",
      category: "deepWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "deep"],
      compatibleWith: ["water"],
      avoidOn: ["land"],
      notes: "Deep water tile for ocean variation.",
    }),
    terrain({
      id: "classic_region_deep_water_06",
      sourceAssetId: "west_coast_coast_mixed_tile_069",
      displayName: "Region 10 Deep Ocean 06",
      category: "deepWater",
      biome: "water",
      walkable: false,
      walkability: "water",
      movementCost: 99,
      encounterFamily: "water",
      tags: ["water", "ocean", "deep"],
      compatibleWith: ["water"],
      avoidOn: ["land"],
      notes: "Used by the deep-ocean patch picker outside shallow coast rings.",
    }),
  ],
  mountainBase: [
    terrain({
      id: "classic_region_mountain_base_01",
      sourceAssetId: "west_coast_lava_tile_066",
      displayName: "Region 10 Mountain Base 01",
      category: "mountainBase",
      biome: "mountain",
      walkable: false,
      walkability: "blocked",
      movementCost: 99,
      encounterFamily: "hills",
      tags: ["mountain", "blocked", "ridge"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Importer classified this as lava by palette; visually it belongs to the brown mountain/base cluster in region 10.",
    }),
    terrain({
      id: "classic_region_mountain_base_02",
      sourceAssetId: "west_coast_lava_tile_067",
      displayName: "Region 10 Mountain Base 02",
      category: "mountainBase",
      biome: "mountain",
      walkable: false,
      walkability: "blocked",
      movementCost: 99,
      encounterFamily: "hills",
      tags: ["mountain", "blocked", "ridge"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Manual override: brown mountain base, not active lava terrain.",
    }),
    terrain({
      id: "classic_region_mountain_base_03",
      sourceAssetId: "west_coast_lava_tile_068",
      displayName: "Region 10 Mountain Base 03",
      category: "mountainBase",
      biome: "mountain",
      walkable: false,
      walkability: "blocked",
      movementCost: 99,
      encounterFamily: "hills",
      tags: ["mountain", "blocked", "ridge"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Mountain/ridge base tile used only in clustered groups.",
    }),
    terrain({
      id: "classic_region_mountain_base_04",
      sourceAssetId: "west_coast_lava_tile_071",
      displayName: "Region 10 Mountain Base 04",
      category: "mountainBase",
      biome: "mountain",
      walkable: false,
      walkability: "blocked",
      movementCost: 99,
      encounterFamily: "hills",
      tags: ["mountain", "blocked", "ridge"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Used in the center of mountain clusters.",
    }),
    terrain({
      id: "classic_region_mountain_base_05",
      sourceAssetId: "west_coast_lava_tile_072",
      displayName: "Region 10 Mountain Base 05",
      category: "mountainBase",
      biome: "mountain",
      walkable: false,
      walkability: "blocked",
      movementCost: 99,
      encounterFamily: "hills",
      tags: ["mountain", "blocked", "ridge"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Mountain group variation; never used as flat base terrain.",
    }),
    terrain({
      id: "classic_region_mountain_base_06",
      sourceAssetId: "west_coast_lava_tile_073",
      displayName: "Region 10 Mountain Base 06",
      category: "mountainBase",
      biome: "mountain",
      walkable: false,
      walkability: "blocked",
      movementCost: 99,
      encounterFamily: "hills",
      tags: ["mountain", "blocked", "ridge"],
      compatibleWith: ["grassland", "forest", "shore"],
      notes: "Cluster-only mountain base tile.",
    }),
  ],
  forestGround: [
    terrain({
      id: "classic_region_forest_ground_01",
      sourceAssetId: "west_coast_forest_grass_tile_047",
      displayName: "Region 10 Forest Ground 01",
      category: "forestGround",
      biome: "forest",
      walkable: true,
      movementCost: 1.25,
      encounterFamily: "forest",
      tags: ["forest", "woods", "ground"],
      compatibleWith: ["grassland", "forest"],
      notes: "Ground layer under clustered forest overlays.",
    }),
    terrain({
      id: "classic_region_forest_ground_02",
      sourceAssetId: "west_coast_forest_grass_tile_048",
      displayName: "Region 10 Forest Ground 02",
      category: "forestGround",
      biome: "forest",
      walkable: true,
      movementCost: 1.25,
      encounterFamily: "forest",
      tags: ["forest", "woods", "ground"],
      compatibleWith: ["grassland", "forest"],
      notes: "Forest floor variation used in blobs, not scattered dots.",
    }),
    terrain({
      id: "classic_region_forest_ground_03",
      sourceAssetId: "west_coast_forest_grass_tile_055",
      displayName: "Region 10 Forest Ground 03",
      category: "forestGround",
      biome: "forest",
      walkable: true,
      movementCost: 1.25,
      encounterFamily: "forest",
      tags: ["forest", "woods", "ground"],
      compatibleWith: ["grassland", "forest"],
      notes: "Darker green forest floor for coherent wooded patches.",
    }),
    terrain({
      id: "classic_region_forest_ground_04",
      sourceAssetId: "west_coast_forest_grass_tile_056",
      displayName: "Region 10 Forest Ground 04",
      category: "forestGround",
      biome: "forest",
      walkable: true,
      movementCost: 1.25,
      encounterFamily: "forest",
      tags: ["forest", "woods", "ground"],
      compatibleWith: ["grassland", "forest"],
      notes: "Companion forest floor tile.",
    }),
    terrain({
      id: "classic_region_forest_ground_05",
      sourceAssetId: "west_coast_forest_grass_tile_057",
      displayName: "Region 10 Forest Ground 05",
      category: "forestGround",
      biome: "forest",
      walkable: true,
      movementCost: 1.25,
      encounterFamily: "forest",
      tags: ["forest", "woods", "ground"],
      compatibleWith: ["grassland", "forest"],
      notes: "Used toward forest edges and mountain-adjacent woods.",
    }),
    terrain({
      id: "classic_region_forest_ground_06",
      sourceAssetId: "west_coast_forest_grass_tile_058",
      displayName: "Region 10 Forest Ground 06",
      category: "forestGround",
      biome: "forest",
      walkable: true,
      movementCost: 1.25,
      encounterFamily: "forest",
      tags: ["forest", "woods", "ground"],
      compatibleWith: ["grassland", "forest"],
      notes: "Forest ground accent used inside cluster masks.",
    }),
  ],
} as const satisfies Record<ClassicGrasslandTerrainCategory, readonly ClassicWorldTerrainDefinition[]>;

export const CLASSIC_GRASSLAND_OBJECTS_BY_CATEGORY = {
  forestClusters: [
    objectAsset({
      id: "classic_region_forest_cluster_01",
      sourceAssetId: "red_blue_town_settlement_tile_009",
      displayName: "Region 7 Dense Forest Cluster 01",
      kind: "decoration",
      category: "forestClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "tree_cluster", "overlay"],
      allowedOn: ["forest", "grassland"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Tree canopy/top piece from region 7 used above forest ground.",
    }),
    objectAsset({
      id: "classic_region_forest_cluster_02",
      sourceAssetId: "red_blue_town_settlement_tile_010",
      displayName: "Region 7 Dense Forest Cluster 02",
      kind: "decoration",
      category: "forestClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "tree_cluster", "overlay"],
      allowedOn: ["forest", "grassland"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Canopy variant used inside forest blobs.",
    }),
    objectAsset({
      id: "classic_region_forest_cluster_03",
      sourceAssetId: "red_blue_town_settlement_tile_011",
      displayName: "Region 7 Dense Forest Cluster 03",
      kind: "decoration",
      category: "forestClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "tree_cluster", "overlay"],
      allowedOn: ["forest", "grassland"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Forest canopy top used in coherent clusters.",
    }),
    objectAsset({
      id: "classic_region_forest_cluster_04",
      sourceAssetId: "red_blue_town_settlement_tile_022",
      displayName: "Region 7 Dense Forest Cluster 04",
      kind: "decoration",
      category: "forestClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "tree_cluster", "overlay"],
      allowedOn: ["forest", "grassland"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Darker tree mass crop from the same region 7 cluster.",
    }),
    objectAsset({
      id: "classic_region_forest_cluster_05",
      sourceAssetId: "red_blue_town_settlement_tile_023",
      displayName: "Region 7 Dense Forest Cluster 05",
      kind: "decoration",
      category: "forestClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "tree_cluster", "overlay"],
      allowedOn: ["forest", "grassland"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Tree mass crop used sparingly at forest edges.",
    }),
    objectAsset({
      id: "classic_region_forest_cluster_06",
      sourceAssetId: "red_blue_town_settlement_tile_034",
      displayName: "Region 7 Dense Forest Cluster 06",
      kind: "decoration",
      category: "forestClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "tree_cluster", "overlay"],
      allowedOn: ["forest", "grassland"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Interior forest tile from region 7, used only in blob masks.",
    }),
  ],
  smallTreeClusters: [
    objectAsset({
      id: "classic_region_small_trees_01",
      sourceAssetId: "red_blue_town_settlement_tile_015",
      displayName: "Region 7 Small Tree Cluster 01",
      kind: "decoration",
      category: "smallTreeClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "small_trees", "overlay"],
      allowedOn: ["grassland", "forest"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Small tree strip used as sparse edge decoration near forest blobs.",
    }),
    objectAsset({
      id: "classic_region_small_trees_02",
      sourceAssetId: "red_blue_town_settlement_tile_016",
      displayName: "Region 7 Small Tree Cluster 02",
      kind: "decoration",
      category: "smallTreeClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "small_trees", "overlay"],
      allowedOn: ["grassland", "forest"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Small tree variant, not used as base terrain.",
    }),
    objectAsset({
      id: "classic_region_small_trees_03",
      sourceAssetId: "red_blue_town_settlement_tile_027",
      displayName: "Region 7 Small Tree Cluster 03",
      kind: "decoration",
      category: "smallTreeClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "small_trees", "overlay"],
      allowedOn: ["grassland", "forest"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Edge tree crop for breaking up forest silhouettes.",
    }),
    objectAsset({
      id: "classic_region_small_trees_04",
      sourceAssetId: "red_blue_town_settlement_tile_028",
      displayName: "Region 7 Small Tree Cluster 04",
      kind: "decoration",
      category: "smallTreeClusters",
      biome: "forest",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["forest", "small_trees", "overlay"],
      allowedOn: ["grassland", "forest"],
      avoidOn: ["water", "shore", "mountain", "road"],
      canRepeat: true,
      notes: "Small tree overlay used outside dense forest centers.",
    }),
  ],
  mountainTops: [
    objectAsset({
      id: "classic_region_mountain_top_01",
      sourceAssetId: "red_blue_town_red_roof_city_tile_034",
      displayName: "Region 7 Mountain Top Detail 01",
      kind: "decoration",
      category: "mountainTops",
      biome: "mountain",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["mountain", "peak", "overlay"],
      allowedOn: ["mountain"],
      avoidOn: ["water", "shore", "road"],
      canRepeat: true,
      notes: "Mountain top crop used above blocked mountain base tiles.",
    }),
    objectAsset({
      id: "classic_region_mountain_top_02",
      sourceAssetId: "red_blue_town_red_roof_city_tile_035",
      displayName: "Region 7 Mountain Top Detail 02",
      kind: "decoration",
      category: "mountainTops",
      biome: "mountain",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["mountain", "peak", "overlay"],
      allowedOn: ["mountain"],
      avoidOn: ["water", "shore", "road"],
      canRepeat: true,
      notes: "Companion mountain detail crop.",
    }),
    objectAsset({
      id: "classic_region_mountain_top_03",
      sourceAssetId: "red_blue_town_red_roof_city_tile_036",
      displayName: "Region 7 Mountain Top Detail 03",
      kind: "decoration",
      category: "mountainTops",
      biome: "mountain",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["mountain", "peak", "overlay"],
      allowedOn: ["mountain"],
      avoidOn: ["water", "shore", "road"],
      canRepeat: true,
      notes: "Mountain top accent for ridge clusters.",
    }),
  ],
  mountainDetails: [
    objectAsset({
      id: "classic_region_mountain_detail_01",
      sourceAssetId: "red_blue_town_red_roof_city_tile_043",
      displayName: "Region 7 Mountain Detail 01",
      kind: "decoration",
      category: "mountainDetails",
      biome: "mountain",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["mountain", "ridge", "overlay"],
      allowedOn: ["mountain"],
      avoidOn: ["water", "shore", "road"],
      canRepeat: true,
      notes: "Brown mountain/detail crop used within mountain groups.",
    }),
    objectAsset({
      id: "classic_region_mountain_detail_02",
      sourceAssetId: "red_blue_town_red_roof_city_tile_044",
      displayName: "Region 7 Mountain Detail 02",
      kind: "decoration",
      category: "mountainDetails",
      biome: "mountain",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["mountain", "ridge", "overlay"],
      allowedOn: ["mountain"],
      avoidOn: ["water", "shore", "road"],
      canRepeat: true,
      notes: "Mountain detail tile for clusters, not standalone terrain.",
    }),
    objectAsset({
      id: "classic_region_mountain_detail_03",
      sourceAssetId: "red_blue_town_red_roof_city_tile_045",
      displayName: "Region 7 Mountain Detail 03",
      kind: "decoration",
      category: "mountainDetails",
      biome: "mountain",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["mountain", "ridge", "overlay"],
      allowedOn: ["mountain"],
      avoidOn: ["water", "shore", "road"],
      canRepeat: true,
      notes: "Additional mountain detail crop for ridge variation.",
    }),
  ],
  villagePieces: [
    objectAsset({
      id: "classic_region_village_piece_blue_keep",
      sourceAssetId: "red_blue_town_settlement_object_001",
      displayName: "Region 7 Blue Keep Village Piece",
      category: "villagePieces",
      biome: "city",
      footprint: { widthTiles: 2, heightTiles: 3 },
      walkability: "poi_entry",
      tags: ["town", "village", "blue_roof", "poi_piece"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 8,
      canRepeat: true,
      poiType: "town",
      notes: "Medium settlement piece from region 7 for recognizable villages.",
    }),
    objectAsset({
      id: "classic_region_village_piece_blue_tower",
      sourceAssetId: "red_blue_town_red_roof_city_object_001",
      displayName: "Region 7 Blue Tower Village Piece",
      category: "villagePieces",
      biome: "city",
      footprint: { widthTiles: 2, heightTiles: 3 },
      walkability: "poi_entry",
      tags: ["town", "village", "blue_roof", "tower", "poi_piece"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 8,
      canRepeat: true,
      poiType: "town",
      notes: "Tall town/castle tower piece used as a landmark overlay.",
    }),
  ],
  stairsOrDocks: [
    objectAsset({
      id: "classic_region_stairs_or_dock_01",
      sourceAssetId: "red_blue_town_settlement_object_002",
      displayName: "Region 7 Stairs or Dock 01",
      category: "stairsOrDocks",
      biome: "road",
      footprint: { widthTiles: 1, heightTiles: 2 },
      walkability: "bridge",
      tags: ["stairs", "dock", "bridge", "path"],
      allowedOn: ["shore", "road"],
      avoidOn: ["mountain", "forest"],
      minSpacing: 8,
      canRepeat: true,
      blocksMovement: false,
      notes: "Small stair/dock-like object reserved for deliberate coast or path placement.",
    }),
    objectAsset({
      id: "classic_region_stairs_or_dock_02",
      sourceAssetId: "red_blue_town_red_roof_city_object_006",
      displayName: "Region 7 Stairs or Dock 02",
      category: "stairsOrDocks",
      biome: "road",
      footprint: { widthTiles: 2, heightTiles: 1 },
      walkability: "bridge",
      tags: ["stairs", "dock", "bridge", "path"],
      allowedOn: ["shore", "road"],
      avoidOn: ["mountain", "forest"],
      minSpacing: 8,
      canRepeat: true,
      blocksMovement: false,
      notes: "Horizontal dock/stair accent used near ports when available.",
    }),
  ],
  decorativeLandmarks: [
    objectAsset({
      id: "classic_region_decorative_landmark_01",
      sourceAssetId: "red_blue_town_red_roof_city_decoration_001",
      displayName: "Region 7 Small Landmark Decoration 01",
      category: "decorativeLandmarks",
      biome: "special",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["decoration", "landmark", "small"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      canRepeat: false,
      notes: "Small region 7 decoration, used sparingly near POIs.",
    }),
    objectAsset({
      id: "classic_region_decorative_landmark_02",
      sourceAssetId: "red_blue_town_red_roof_city_decoration_003",
      displayName: "Region 7 Small Landmark Decoration 02",
      category: "decorativeLandmarks",
      biome: "special",
      footprint: { widthTiles: 1, heightTiles: 1 },
      walkability: "decorative_overlay",
      tags: ["decoration", "landmark", "small"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      canRepeat: false,
      notes: "Small region 7 decorative point used near clearings.",
    }),
  ],
  villageSmall: [
    objectAsset({
      id: "classic_region_village_small_blue_01",
      sourceAssetId: "red_blue_town_settlement_poi_001",
      displayName: "Region 7 Small Blue Village",
      category: "villageSmall",
      biome: "city",
      footprint: { widthTiles: 4, heightTiles: 3 },
      walkability: "poi_entry",
      tags: ["town", "village", "poi", "blue_roof"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 10,
      canRepeat: true,
      poiType: "town",
      entryOffset: { x: 0, y: 2 },
      notes: "Compact blue-roof settlement for grassland villages.",
    }),
    objectAsset({
      id: "classic_region_village_small_red_01",
      sourceAssetId: "red_blue_town_red_roof_city_poi_003",
      displayName: "Region 7 Small Red Village",
      category: "villageSmall",
      biome: "city",
      footprint: { widthTiles: 4, heightTiles: 3 },
      walkability: "poi_entry",
      tags: ["town", "village", "poi", "red_roof"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 10,
      canRepeat: true,
      poiType: "town",
      entryOffset: { x: 0, y: 2 },
      notes: "Small red-roof settlement used as a secondary POI.",
    }),
  ],
  villageLarge: [
    objectAsset({
      id: "classic_region_village_large_blue_01",
      sourceAssetId: "red_blue_town_red_roof_city_poi_001",
      displayName: "Region 7 Large Blue Town",
      category: "villageLarge",
      biome: "city",
      footprint: { widthTiles: 5, heightTiles: 3 },
      walkability: "poi_entry",
      tags: ["town", "village", "poi", "blue_roof", "large"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 12,
      canRepeat: true,
      poiType: "town",
      entryOffset: { x: 0, y: 2 },
      notes: "Large settlement overlay, rendered as an intentional map landmark.",
    }),
    objectAsset({
      id: "classic_region_village_large_red_01",
      sourceAssetId: "red_blue_town_red_roof_city_poi_002",
      displayName: "Region 7 Large Red Town",
      category: "villageLarge",
      biome: "city",
      footprint: { widthTiles: 5, heightTiles: 4 },
      walkability: "poi_entry",
      tags: ["town", "village", "poi", "red_roof", "large"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 12,
      canRepeat: true,
      poiType: "town",
      entryOffset: { x: 0, y: 3 },
      notes: "Large red-roof settlement used for important towns.",
    }),
  ],
  castleOrTown: [
    objectAsset({
      id: "classic_region_castle_or_town_01",
      sourceAssetId: "red_blue_town_red_roof_city_poi_005",
      displayName: "Region 7 Castle or Town Landmark 01",
      category: "castleOrTown",
      biome: "city",
      footprint: { widthTiles: 4, heightTiles: 4 },
      walkability: "poi_entry",
      tags: ["castle", "town", "poi", "landmark"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 14,
      canRepeat: true,
      poiType: "town",
      entryOffset: { x: 0, y: 3 },
      notes: "Prominent settlement/castle-scale object used for important POIs.",
    }),
    objectAsset({
      id: "classic_region_castle_or_town_02",
      sourceAssetId: "red_blue_town_red_roof_city_poi_004",
      displayName: "Region 7 Castle or Mountain Town Landmark 02",
      category: "castleOrTown",
      biome: "city",
      footprint: { widthTiles: 4, heightTiles: 4 },
      walkability: "poi_entry",
      tags: ["castle", "town", "poi", "landmark"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 14,
      canRepeat: true,
      poiType: "town",
      entryOffset: { x: 0, y: 3 },
      notes: "Large recognizable region 7 landmark, reserved for placed POIs.",
    }),
  ],
  caveOrMountainEntrance: [
    objectAsset({
      id: "classic_region_cave_mountain_entrance_01",
      sourceAssetId: "west_coast_lava_landmark_001",
      displayName: "Region 10 Cave or Mountain Entrance",
      category: "caveOrMountainEntrance",
      biome: "mountain",
      footprint: { widthTiles: 3, heightTiles: 2 },
      walkability: "poi_entry",
      tags: ["cave", "mountain", "dungeon", "poi"],
      allowedOn: ["mountain", "grassland"],
      avoidOn: ["water", "shore", "road"],
      minSpacing: 12,
      canRepeat: false,
      unique: true,
      poiType: "dungeon",
      entryOffset: { x: 0, y: 1 },
      notes: "Manual use of the region 10 landmark as a cave/mountain entrance near clustered mountains.",
    }),
  ],
  dockOrPort: [
    objectAsset({
      id: "classic_region_dock_or_port_01",
      sourceAssetId: "red_blue_town_red_roof_city_object_006",
      displayName: "Region 7 Dock or Port",
      category: "dockOrPort",
      biome: "road",
      footprint: { widthTiles: 2, heightTiles: 1 },
      walkability: "bridge",
      tags: ["dock", "port", "bridge", "shore"],
      allowedOn: ["shore", "road"],
      avoidOn: ["mountain", "forest"],
      minSpacing: 10,
      canRepeat: true,
      blocksMovement: false,
      poiType: "dock",
      notes: "Dock-like piece used deliberately near a coastal town, never as random terrain.",
    }),
  ],
  specialLandmark: [
    objectAsset({
      id: "classic_region_special_landmark_01",
      sourceAssetId: "red_blue_town_settlement_object_001",
      displayName: "Region 7 Special Blue Keep",
      category: "specialLandmark",
      biome: "special",
      footprint: { widthTiles: 3, heightTiles: 4 },
      walkability: "poi_entry",
      tags: ["special", "tower", "gate", "poi"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 14,
      canRepeat: false,
      poiType: "gate",
      entryOffset: { x: 0, y: 3 },
      notes: "Special-purpose landmark for gate/shrine style POIs.",
    }),
    objectAsset({
      id: "classic_region_special_landmark_02",
      sourceAssetId: "red_blue_town_red_roof_city_object_001",
      displayName: "Region 7 Special Blue Tower",
      category: "specialLandmark",
      biome: "special",
      footprint: { widthTiles: 3, heightTiles: 4 },
      walkability: "poi_entry",
      tags: ["special", "tower", "gate", "poi"],
      allowedOn: ["grassland", "road"],
      avoidOn: ["water", "shore", "mountain", "forest"],
      minSpacing: 14,
      canRepeat: false,
      poiType: "gate",
      entryOffset: { x: 0, y: 3 },
      notes: "Tall landmark used for shrine/tower/gate POIs.",
    }),
  ],
} as const satisfies Record<ClassicGrasslandObjectCategory, readonly ClassicWorldObjectDefinition[]>;

export const CLASSIC_WORLD_TILE_DEFINITIONS = Object.values(CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY).flat();
export const CLASSIC_GRASSLAND_OBJECT_DEFINITIONS = Object.values(CLASSIC_GRASSLAND_OBJECTS_BY_CATEGORY).flat();

export type ClassicWorldTileId = (typeof CLASSIC_WORLD_TILE_DEFINITIONS)[number]["id"];
export type ClassicWorldObjectId = (typeof CLASSIC_GRASSLAND_OBJECT_DEFINITIONS)[number]["id"];

export const CLASSIC_WORLD_TILE_IDS = {
  grassBase: "classic_region_grass_base_01",
  grassVariant: "classic_region_grass_variant_01",
  forestGround: "classic_region_forest_ground_01",
  forestPath: "classic_region_path_01",
  mainRoad: "classic_region_path_01",
  wornRoad: "classic_region_path_02",
  crossroads: "classic_region_path_03",
  townGround: "classic_region_path_04",
  ruinGround: "classic_region_path_05",
  shore: "classic_region_shore_01",
  beach: "classic_region_shore_02",
  desertFallback: "classic_region_shore_03",
  deepWater: "classic_region_deep_water_01",
  lightWater: "classic_region_shallow_water_01",
  riverWater: "classic_region_shallow_water_02",
  shallowWater: "classic_region_shallow_water_03",
  stoneBridgeHorizontal: "classic_region_path_05",
  stoneBridgeVertical: "classic_region_path_06",
  bridgeDeck: "classic_region_path_06",
  bridgeApproach: "classic_region_path_05",
  mountainBase: "classic_region_mountain_base_01",
  mountainFoothill: "classic_region_mountain_base_02",
  caveEntrance: "classic_region_mountain_base_03",
  snowFallback: "classic_region_grass_base_04",
  swampFallback: "classic_region_forest_ground_03",
  darklandFallback: "classic_region_mountain_base_04",
  finalGround: "classic_region_path_06",
} as const satisfies Record<string, ClassicWorldTileId>;

const TILE_DEFINITION_BY_ID = new Map(
  CLASSIC_WORLD_TILE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const OBJECT_DEFINITION_BY_ID = new Map(
  CLASSIC_GRASSLAND_OBJECT_DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function classicWorldTileFor(tileId: string): ClassicWorldTerrainDefinition | undefined {
  return TILE_DEFINITION_BY_ID.get(tileId);
}

export function classicWorldObjectFor(objectId: string): ClassicWorldObjectDefinition | undefined {
  return OBJECT_DEFINITION_BY_ID.get(objectId);
}

export const CLASSIC_LOCATION_OBJECT_IDS = {
  start_village: "classic_region_village_small_blue_01",
  forest_village: "classic_region_village_small_red_01",
  mountain_cave: "classic_region_cave_mountain_entrance_01",
  castle_or_keep: "classic_region_castle_or_town_01",
  port_or_dock: "classic_region_dock_or_port_01",
  shrine_or_landmark: "classic_region_special_landmark_02",
} as const satisfies Record<string, ClassicWorldObjectId>;

export const CLASSIC_LOCATION_OBJECTS = Object.fromEntries(
  Object.entries(CLASSIC_LOCATION_OBJECT_IDS).map(([locationId, objectId]) => [
    locationId,
    classicWorldObjectFor(objectId),
  ]),
) as Record<keyof typeof CLASSIC_LOCATION_OBJECT_IDS, ClassicWorldObjectDefinition | undefined>;

export function classicLocationObjectFor(locationId: string): ClassicWorldObjectDefinition | undefined {
  return CLASSIC_LOCATION_OBJECTS[locationId as keyof typeof CLASSIC_LOCATION_OBJECTS];
}

export const CLASSIC_GRASSLAND_SELECTED_ASSET_COUNTS = {
  terrain: CLASSIC_WORLD_TILE_DEFINITIONS.length,
  objects: CLASSIC_GRASSLAND_OBJECT_DEFINITIONS.length,
  byTerrainCategory: Object.fromEntries(
    Object.entries(CLASSIC_GRASSLAND_TERRAIN_BY_CATEGORY).map(([category, assets]) => [
      category,
      assets.length,
    ]),
  ) as Record<ClassicGrasslandTerrainCategory, number>,
  byObjectCategory: Object.fromEntries(
    Object.entries(CLASSIC_GRASSLAND_OBJECTS_BY_CATEGORY).map(([category, assets]) => [
      category,
      assets.length,
    ]),
  ) as Record<ClassicGrasslandObjectCategory, number>,
} as const;

export const CLASSIC_GRASSLAND_SELECTED_ASSETS = [
  ...CLASSIC_WORLD_TILE_DEFINITIONS.map((definition) => ({
    id: definition.id,
    sourceAssetId: definition.sourceAssetId,
    displayName: definition.displayName,
    category: definition.category,
    macroRegion: definition.macroRegion,
    kind: definition.kind,
    source: definition.source,
    notes: definition.notes,
  })),
  ...CLASSIC_GRASSLAND_OBJECT_DEFINITIONS.map((definition) => ({
    id: definition.id,
    sourceAssetId: definition.sourceAssetId,
    displayName: definition.displayName,
    category: definition.category,
    macroRegion: definition.macroRegion,
    kind: definition.kind,
    source: definition.source,
    notes: definition.notes,
  })),
] as const;
