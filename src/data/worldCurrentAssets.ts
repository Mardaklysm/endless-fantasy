import worldAssetManifestJson from "../assets/world/current/world_asset_manifest.json" with { type: "json" };
import type { SemanticMaskTerrainClass } from "../world/semantic/semanticMaskTerrainRenderer.ts";

export type WorldCurrentAssetKind = "terrain fill" | "overlay sprite" | "POI sprite" | "route/river asset" | "world object" | "debug-only";

export interface WorldCurrentAssetRecord {
  id: string;
  textureKey: string;
  sourceFilename: string;
  sourceSemanticId: string | null;
  newCanonicalFilename: string;
  filename: string;
  category: string;
  subcategory?: string;
  semanticRole: string;
  intendedRuntimeUsage: string;
  assetKind: WorldCurrentAssetKind;
  dimensions: {
    width: number;
    height: number;
  };
  transparencyStatus: "opaque" | "alpha";
  magentaKeyRemovalNeeded: boolean;
  scaleCropPadNeeded: string;
  placeholder: boolean;
  qualityFlag: "approved" | "placeholder";
  selectedSourceFile: string | null;
  selectedSourceRow: number | null;
  selectedSourceCol: number | null;
  visualRationale: string;
  backgroundRemovalMethod?: string;
  anchorX?: number;
  anchorY?: number;
  footprintWidth?: number;
  footprintHeight?: number;
  recommendedScale?: number;
  placementLayer?: string;
  tags?: string[];
  source?: string;
  premium?: boolean;
  qualityBucket?: string;
  integrationRole?: string;
  integrationStatus?: string;
  notes: string;
}

export interface WorldCurrentAssetManifest {
  schemaVersion: number;
  id: string;
  runtimeRoot: string;
  sourcePack: {
    approvedMaterialsFolder: string;
    approvedMetadata: string;
    approvedTerrainMaterialCount: number;
    selectionStandard: string;
    approvedObjectsFolder?: string;
    approvedObjectsMetadata?: string;
    approvedWorldObjectCount?: number;
    objectSelectionStandard?: string;
    relaxedObjectsFolder?: string;
    relaxedTouchupObjectsFolder?: string;
    relaxedObjectsMetadata?: string;
    relaxedGameReadyObjectCount?: number;
    relaxedTouchupObjectCount?: number;
    backupWorldObjectCount?: number;
    premiumSourceFolder?: string;
    premiumRuntimeFolder?: string;
    premiumWorldObjectCount?: number;
  };
  rendererContract: {
    semanticWorldGenerationIsGameplayTruth: boolean;
    baseTerrainUsesSemanticMaskFills: boolean;
    roadsRiversCoastsMountainsForestsPoisAreOverlays: boolean;
    randomBaseTerrainVariantSpam: boolean;
    giantTransitionTilesets: boolean;
  };
  semanticTerrain: Record<SemanticMaskTerrainClass, string>;
  routeMappings: Record<string, string>;
  premiumRouteMappings?: Record<string, string>;
  poiMappings: Record<string, string>;
  premiumPoiMappings?: Record<string, string>;
  poiVariantMappings?: Record<string, string[]>;
  premiumPoiVariantMappings?: Record<string, string[]>;
  locationIdMappings: Record<string, string>;
  premiumLocationIdMappings?: Record<string, string>;
  objectMappings: Record<string, string>;
  premiumObjectMappings?: Record<string, string>;
  deprecatedRuntimeSources: string[];
  missingRuntimeRoles: Array<{
    role: string;
    status: string;
    notes: string;
  }>;
  assets: WorldCurrentAssetRecord[];
}

export const WORLD_CURRENT_ASSET_MANIFEST = worldAssetManifestJson as WorldCurrentAssetManifest;
export const WORLD_CURRENT_ASSETS = WORLD_CURRENT_ASSET_MANIFEST.assets as readonly WorldCurrentAssetRecord[];
export const WORLD_CURRENT_ASSET_BY_TEXTURE_KEY = Object.fromEntries(WORLD_CURRENT_ASSETS.map((asset) => [asset.textureKey, asset])) as Record<
  string,
  WorldCurrentAssetRecord
>;
export const WORLD_CURRENT_TEXTURE_KEY_SET = new Set(WORLD_CURRENT_ASSETS.map((asset) => asset.textureKey));
export const WORLD_CURRENT_TERRAIN_TEXTURE_KEYS = WORLD_CURRENT_ASSET_MANIFEST.semanticTerrain;
export const WORLD_CURRENT_BACKUP_ROUTE_TEXTURE_KEYS = WORLD_CURRENT_ASSET_MANIFEST.routeMappings;
export const WORLD_CURRENT_BACKUP_POI_TEXTURE_KEYS = WORLD_CURRENT_ASSET_MANIFEST.poiMappings;
export const WORLD_CURRENT_BACKUP_OBJECT_TEXTURE_KEY_BY_ID = WORLD_CURRENT_ASSET_MANIFEST.objectMappings;
export const WORLD_CURRENT_BACKUP_LOCATION_TEXTURE_KEY_BY_ID = WORLD_CURRENT_ASSET_MANIFEST.locationIdMappings;
export const WORLD_CURRENT_ROUTE_TEXTURE_KEYS = mergeTextureMaps(WORLD_CURRENT_BACKUP_ROUTE_TEXTURE_KEYS, WORLD_CURRENT_ASSET_MANIFEST.premiumRouteMappings);
export const WORLD_CURRENT_POI_TEXTURE_KEYS = mergeTextureMaps(WORLD_CURRENT_BACKUP_POI_TEXTURE_KEYS, WORLD_CURRENT_ASSET_MANIFEST.premiumPoiMappings);
export const WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID = mergeTextureMaps(
  WORLD_CURRENT_BACKUP_OBJECT_TEXTURE_KEY_BY_ID,
  WORLD_CURRENT_ASSET_MANIFEST.premiumObjectMappings
);
export const WORLD_CURRENT_LOCATION_TEXTURE_KEY_BY_ID = mergeTextureMaps(
  WORLD_CURRENT_BACKUP_LOCATION_TEXTURE_KEY_BY_ID,
  WORLD_CURRENT_ASSET_MANIFEST.premiumLocationIdMappings
);

export interface WorldCurrentPoiDescriptor {
  id?: string;
  kind?: string;
  islandId?: string;
  landmarkKind?: string;
  objectId?: string;
  x?: number;
  y?: number;
}

export function worldCurrentAssetByTextureKey(textureKey?: string): WorldCurrentAssetRecord | undefined {
  return textureKey ? WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey] : undefined;
}

export function worldCurrentObjectTextureKey(objectId?: string): string | undefined {
  if (!objectId) return undefined;
  return WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID[objectId];
}

export function worldCurrentPoiTextureKeyFor(poi: WorldCurrentPoiDescriptor): string | undefined {
  const themedKey = worldCurrentThemedPoiTextureKeyFor(poi);
  if (themedKey) return themedKey;
  if (poi.id && WORLD_CURRENT_LOCATION_TEXTURE_KEY_BY_ID[poi.id]) return WORLD_CURRENT_LOCATION_TEXTURE_KEY_BY_ID[poi.id];
  if (poi.kind === "landmark" && poi.landmarkKind && WORLD_CURRENT_POI_TEXTURE_KEYS[poi.landmarkKind]) {
    return WORLD_CURRENT_POI_TEXTURE_KEYS[poi.landmarkKind];
  }
  const variantKey = worldCurrentPoiVariantTextureKeyFor(poi);
  if (variantKey) return variantKey;
  if (poi.kind && WORLD_CURRENT_POI_TEXTURE_KEYS[poi.kind]) return WORLD_CURRENT_POI_TEXTURE_KEYS[poi.kind];
  return worldCurrentObjectTextureKey(poi.objectId);
}

function worldCurrentThemedPoiTextureKeyFor(poi: WorldCurrentPoiDescriptor): string | undefined {
  const byId: Record<string, string> = {
    dawnford: "world_current_object_premium_farming_village_silos",
    mossCave: "world_current_object_premium_cave_rock_entrance",
    greenhavenShrine: "world_current_object_premium_small_temple",
    brinewick: "world_current_object_premium_desert_oasis_town",
    coralreachHarbor: "world_current_object_premium_dock_village_small",
    tideShrine: "world_current_object_premium_desert_ruins_city",
    coralreachWreck: "world_current_object_premium_shipwreck_ruin",
    elderleaf: "world_current_object_premium_snow_village",
    frostmereHarbor: "world_current_object_premium_dock_village_small",
    skyglassTower: "world_current_object_premium_ice_palace",
    frostmereShrine: "world_current_object_premium_ice_temple",
    sunbarrow: "world_current_object_premium_stone_village_gray",
    highspireHarbor: "world_current_object_premium_dock_village_small",
    ashenKeep: "world_current_object_premium_volcanic_fortress",
    starfallGate: "world_current_object_premium_sealed_gate_chained",
    eclipseSpire: "world_current_object_premium_dark_haunted_castle"
  };
  const exact = poi.id ? existingTextureKey(byId[poi.id]) : undefined;
  if (exact) return exact;

  const islandId = poi.islandId ?? "";
  if (islandId === "frostmere") {
    if (poi.kind === "town") return existingTextureKey("world_current_object_premium_snow_village");
    if (poi.kind === "dungeon" || poi.kind === "gate" || poi.kind === "final") return existingTextureKey("world_current_object_premium_snow_castle");
    if (poi.landmarkKind === "shrine") return existingTextureKey("world_current_object_premium_ice_temple");
    if (poi.landmarkKind === "cave") return existingTextureKey("world_current_object_premium_snow_cave_entrance");
  }
  if (islandId === "coralreach") {
    if (poi.kind === "town") return existingTextureKey("world_current_object_premium_desert_oasis_town");
    if (poi.kind === "harbor") return existingTextureKey("world_current_object_premium_dock_village_small");
    if (poi.kind === "dungeon" || poi.landmarkKind === "ruins") return existingTextureKey("world_current_object_premium_desert_ruins_city");
    if (poi.landmarkKind === "shrine") return existingTextureKey("world_current_object_premium_jungle_temple_village");
  }
  if (islandId === "highspire") {
    if (poi.kind === "town") return existingTextureKey("world_current_object_premium_stone_village_gray");
    if (poi.kind === "dungeon") return existingTextureKey("world_current_object_premium_volcanic_fortress");
    if (poi.kind === "gate") return existingTextureKey("world_current_object_premium_sealed_gate_chained");
    if (poi.kind === "final") return existingTextureKey("world_current_object_premium_dark_haunted_castle");
    if (poi.landmarkKind === "ruins") return existingTextureKey("world_current_object_premium_ruin_arch_blocks");
  }
  if (islandId === "greenhaven") {
    if (poi.kind === "town") return existingTextureKey("world_current_object_premium_farming_village_silos");
    if (poi.kind === "dungeon") return existingTextureKey("world_current_object_premium_cave_rock_entrance");
    if (poi.landmarkKind === "shrine") return existingTextureKey("world_current_object_premium_small_temple");
  }
  if (poi.kind === "town") return existingTextureKey("world_current_object_premium_village_plain_houses");
  if (poi.kind === "harbor") return existingTextureKey("world_current_object_premium_dock_village_small");
  if (poi.landmarkKind === "cave") return existingTextureKey("world_current_object_premium_cave_rock_entrance");
  if (poi.landmarkKind === "ruins") return existingTextureKey("world_current_object_premium_ruin_columns");
  if (poi.landmarkKind === "shrine") return existingTextureKey("world_current_object_premium_small_temple");
  return undefined;
}

function existingTextureKey(textureKey?: string): string | undefined {
  return textureKey && WORLD_CURRENT_ASSET_BY_TEXTURE_KEY[textureKey] ? textureKey : undefined;
}

function worldCurrentPoiVariantTextureKeyFor(poi: WorldCurrentPoiDescriptor): string | undefined {
  const backupVariantsByRole = WORLD_CURRENT_ASSET_MANIFEST.poiVariantMappings;
  const premiumVariantsByRole = WORLD_CURRENT_ASSET_MANIFEST.premiumPoiVariantMappings;
  if ((!backupVariantsByRole && !premiumVariantsByRole) || !poi.kind) return undefined;
  const role = poi.kind === "harbor" ? "harbor" : poi.kind === "town" ? "settlement" : poi.landmarkKind;
  if (!role) return undefined;
  const variants = premiumVariantsByRole?.[role] ?? backupVariantsByRole?.[role];
  if (!variants?.length) return undefined;
  const basis = `${poi.id ?? poi.kind}:${poi.x ?? 0}:${poi.y ?? 0}`;
  let hash = 0;
  for (let index = 0; index < basis.length; index += 1) hash = (hash * 31 + basis.charCodeAt(index)) >>> 0;
  return variants[hash % variants.length];
}

function mergeTextureMaps<T extends Record<string, string>>(fallback: T, preferred?: Record<string, string>): T {
  return { ...fallback, ...(preferred ?? {}) } as T;
}
