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
  poiMappings: Record<string, string>;
  poiVariantMappings?: Record<string, string[]>;
  locationIdMappings: Record<string, string>;
  objectMappings: Record<string, string>;
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
export const WORLD_CURRENT_ROUTE_TEXTURE_KEYS = WORLD_CURRENT_ASSET_MANIFEST.routeMappings;
export const WORLD_CURRENT_POI_TEXTURE_KEYS = WORLD_CURRENT_ASSET_MANIFEST.poiMappings;
export const WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID = WORLD_CURRENT_ASSET_MANIFEST.objectMappings;
export const WORLD_CURRENT_LOCATION_TEXTURE_KEY_BY_ID = WORLD_CURRENT_ASSET_MANIFEST.locationIdMappings;

export interface WorldCurrentPoiDescriptor {
  id?: string;
  kind?: string;
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
  if (poi.id && WORLD_CURRENT_LOCATION_TEXTURE_KEY_BY_ID[poi.id]) return WORLD_CURRENT_LOCATION_TEXTURE_KEY_BY_ID[poi.id];
  if (poi.kind === "landmark" && poi.landmarkKind && WORLD_CURRENT_POI_TEXTURE_KEYS[poi.landmarkKind]) {
    return WORLD_CURRENT_POI_TEXTURE_KEYS[poi.landmarkKind];
  }
  const variantKey = worldCurrentPoiVariantTextureKeyFor(poi);
  if (variantKey) return variantKey;
  if (poi.kind && WORLD_CURRENT_POI_TEXTURE_KEYS[poi.kind]) return WORLD_CURRENT_POI_TEXTURE_KEYS[poi.kind];
  return worldCurrentObjectTextureKey(poi.objectId);
}

function worldCurrentPoiVariantTextureKeyFor(poi: WorldCurrentPoiDescriptor): string | undefined {
  const variantsByRole = WORLD_CURRENT_ASSET_MANIFEST.poiVariantMappings;
  if (!variantsByRole || !poi.kind) return undefined;
  const role = poi.kind === "harbor" ? "harbor" : poi.kind === "town" ? "settlement" : poi.landmarkKind;
  if (!role) return undefined;
  const variants = variantsByRole[role];
  if (!variants?.length) return undefined;
  const basis = `${poi.id ?? poi.kind}:${poi.x ?? 0}:${poi.y ?? 0}`;
  let hash = 0;
  for (let index = 0; index < basis.length; index += 1) hash = (hash * 31 + basis.charCodeAt(index)) >>> 0;
  return variants[hash % variants.length];
}
