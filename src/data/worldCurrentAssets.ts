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

export type WorldPremiumV2PoiCategory =
  | "harbor"
  | "camp"
  | "cave"
  | "ice_palace"
  | "village"
  | "dark_fortress"
  | "desert_ruins"
  | "desert_settlement"
  | "volcanic_fortress"
  | "farming_settlement";

export interface WorldPremiumV2PoiClassification {
  textureKey: string;
  category: WorldPremiumV2PoiCategory;
  sourceFolder: "objects_premium_v2";
  visualSummary: string;
  preferredPoiRoles: string[];
  unusedReason?: string;
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

const WORLD_CURRENT_PREMIUM_V2_RECORDS = [
  v2Asset("premium_v2_harbor_fishing_village", "Fantasy_JRPG_POI_asset_202606221516.png", "harbor", "Fishing village with huts, dock, boat, and water edge.", ["harbor", "coastal settlement"], 0.98),
  v2Asset("premium_v2_adventurer_camp", "Fantasy_JRPG_POI_asset_202606221516_2.png", "camp", "Canvas tents around a campfire on dry ground.", ["camp", "settlement", "minor harbor fallback"], 0.9),
  v2Asset("premium_v2_sandy_cave_bones", "Fantasy_JRPG_POI_asset_202606221516_3.png", "cave", "Sandy cave mouth with bones and clawlike remains.", ["cave", "desert cave"], 0.9),
  v2Asset("premium_v2_ice_palace", "Fantasy_JRPG_POI_asset_202606221516_4.png", "ice_palace", "Blue ice palace framed by frozen spires.", ["ice dungeon", "snow landmark"], 0.96),
  v2Asset("premium_v2_greenhaven_village", "Fantasy_JRPG_POI_asset_202606221516_5.png", "village", "Bright grassland village with cottages and trees.", ["starting village", "grass settlement"], 1),
  v2Asset("premium_v2_moss_cave", "Fantasy_JRPG_POI_asset_202606221516_6.png", "cave", "Mossy green cave entrance in a rocky hill.", ["cave", "grass dungeon"], 0.95),
  v2Asset("premium_v2_dark_fortress", "Fantasy_JRPG_POI_asset_202606221516_7.png", "dark_fortress", "Black spired evil fortress with a dark gate.", ["final", "dark fortress", "major danger"], 0.97),
  v2Asset("premium_v2_desert_ruins", "Fantasy_JRPG_POI_asset_202606221516_8.png", "desert_ruins", "Sandstone ruin/cave structure with palms.", ["desert ruins", "sand dungeon"], 0.94),
  v2Asset("premium_v2_desert_town_market", "premium_desert_town_market.png_202606221516.png", "desert_settlement", "Desert market town with domes, palms, and stalls.", ["desert settlement", "sand town"], 0.96, undefined, 512),
  v2Asset("premium_v2_volcanic_fortress", "premium_volcanic_fortress.png_202606221516.png", "volcanic_fortress", "Volcanic black fortress with lava and red-lit towers.", ["volcanic dungeon", "fire landmark"], 0.98, undefined, 512),
  v2Asset("premium_v2_sandy_cave_arch", "Use_the_first_attached_image_202606221516.png", "cave", "Large sandy cave arch with a dark entrance.", ["cave", "desert cave"], 0.9),
  v2Asset(
    "premium_v2_farming_village",
    "Use_the_first_attached_image_202606221516_2.png",
    "farming_settlement",
    "Farm village with barn, silo, cottages, and fields.",
    ["farm settlement", "grass settlement"],
    0.95,
    "No non-starting grass settlement slot exists in the current campaign; Greenhaven is hard-pinned to premium_v2_greenhaven_village."
  )
] as const satisfies readonly WorldCurrentAssetRecord[];

export const WORLD_CURRENT_PREMIUM_V2_CLASSIFICATIONS = Object.fromEntries(
  WORLD_CURRENT_PREMIUM_V2_RECORDS.map((asset) => [
    asset.textureKey,
    {
      textureKey: asset.textureKey,
      category: asset.subcategory,
      sourceFolder: "objects_premium_v2",
      visualSummary: asset.visualRationale,
      preferredPoiRoles: asset.tags ?? [],
      unusedReason: asset.notes.startsWith("Potentially unused: ") ? asset.notes.replace("Potentially unused: ", "") : undefined
    }
  ])
) as Record<string, WorldPremiumV2PoiClassification>;

export const WORLD_CURRENT_ASSET_MANIFEST = worldAssetManifestJson as WorldCurrentAssetManifest;
export const WORLD_CURRENT_ASSETS = [...WORLD_CURRENT_ASSET_MANIFEST.assets, ...WORLD_CURRENT_PREMIUM_V2_RECORDS] as readonly WorldCurrentAssetRecord[];
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
  const premiumV2Key = worldCurrentPremiumV2PoiTextureKeyFor(poi);
  if (premiumV2Key) return premiumV2Key;
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

export function worldCurrentPremiumV2PoiTextureKeyFor(poi: WorldCurrentPoiDescriptor): string | undefined {
  const exact = premiumV2ExactTextureKeyFor(poi);
  if (exact) return exact;
  const islandId = poi.islandId ?? "";
  if (poi.kind === "harbor") return existingTextureKey("world_current_object_premium_v2_harbor_fishing_village");
  if (poi.kind === "town") {
    if (islandId === "coralreach") return existingTextureKey("world_current_object_premium_v2_desert_town_market");
    if (islandId === "highspire") return existingTextureKey("world_current_object_premium_v2_adventurer_camp");
  }
  if (poi.kind === "dungeon") {
    if (islandId === "frostmere") return existingTextureKey("world_current_object_premium_v2_ice_palace");
    if (islandId === "coralreach") return existingTextureKey("world_current_object_premium_v2_desert_ruins");
    if (islandId === "highspire") return existingTextureKey("world_current_object_premium_v2_volcanic_fortress");
    if (islandId === "greenhaven") return existingTextureKey("world_current_object_premium_v2_moss_cave");
  }
  if (poi.kind === "final") return existingTextureKey("world_current_object_premium_v2_dark_fortress");
  if (poi.landmarkKind === "cave") return deterministicPremiumV2CaveTextureKeyFor(poi);
  if (poi.landmarkKind === "ruins" && (islandId === "coralreach" || poi.id?.toLowerCase().includes("tide"))) {
    return existingTextureKey("world_current_object_premium_v2_desert_ruins");
  }
  return undefined;
}

export function worldCurrentPoiAssetDebugLine(poi: WorldCurrentPoiDescriptor): string {
  const textureKey = worldCurrentPoiTextureKeyFor(poi);
  const asset = worldCurrentAssetByTextureKey(textureKey);
  const v2 = textureKey ? WORLD_CURRENT_PREMIUM_V2_CLASSIFICATIONS[textureKey] : undefined;
  const sourceFolder = asset?.filename.includes("/") ? asset.filename.split("/")[0] : "generated";
  const visual = v2 ? ` (${v2.category}: ${v2.visualSummary})` : "";
  return `${poi.id ?? "unknown"} [${poi.kind ?? poi.landmarkKind ?? "unknown"}] -> ${textureKey ?? "generated fallback"} from ${sourceFolder}${visual}`;
}

export function worldCurrentPremiumV2UnusedNotesFor(pois: readonly WorldCurrentPoiDescriptor[]): string[] {
  const used = new Set(pois.map((poi) => worldCurrentPoiTextureKeyFor(poi)).filter((key): key is string => !!key));
  return WORLD_CURRENT_PREMIUM_V2_RECORDS.filter((asset) => !used.has(asset.textureKey)).map((asset) => {
    const classification = WORLD_CURRENT_PREMIUM_V2_CLASSIFICATIONS[asset.textureKey];
    const reason = classification.unusedReason ?? `No generated POI in this seed matched ${classification.preferredPoiRoles.join(", ")} without visual mismatch.`;
    return `${asset.textureKey} (${classification.category}) unused: ${reason}`;
  });
}

function premiumV2ExactTextureKeyFor(poi: WorldCurrentPoiDescriptor): string | undefined {
  const byId: Record<string, string> = {
    dawnford: "world_current_object_premium_v2_greenhaven_village",
    greenhavenHarbor: "world_current_object_premium_v2_harbor_fishing_village",
    mossCave: "world_current_object_premium_v2_moss_cave",
    brinewick: "world_current_object_premium_v2_desert_town_market",
    coralreachHarbor: "world_current_object_premium_v2_harbor_fishing_village",
    tideShrine: "world_current_object_premium_v2_desert_ruins",
    elderleaf: "world_current_object_premium_snow_village",
    frostmereHarbor: "world_current_object_premium_v2_harbor_fishing_village",
    skyglassTower: "world_current_object_premium_v2_ice_palace",
    sunbarrow: "world_current_object_premium_v2_adventurer_camp",
    highspireHarbor: "world_current_object_premium_v2_harbor_fishing_village",
    ashenKeep: "world_current_object_premium_v2_volcanic_fortress",
    eclipseSpire: "world_current_object_premium_v2_dark_fortress"
  };
  return existingTextureKey(poi.id ? byId[poi.id] : undefined);
}

function deterministicPremiumV2CaveTextureKeyFor(poi: WorldCurrentPoiDescriptor): string | undefined {
  const caveKeys =
    poi.islandId === "greenhaven"
      ? ["world_current_object_premium_v2_moss_cave", "world_current_object_premium_v2_sandy_cave_bones", "world_current_object_premium_v2_sandy_cave_arch"]
      : ["world_current_object_premium_v2_sandy_cave_arch", "world_current_object_premium_v2_sandy_cave_bones", "world_current_object_premium_v2_moss_cave"];
  const basis = `${poi.id ?? "cave"}:${poi.islandId ?? ""}:${poi.x ?? 0}:${poi.y ?? 0}`;
  const offset = stableHash(basis) % caveKeys.length;
  for (let index = 0; index < caveKeys.length; index += 1) {
    const key = caveKeys[(offset + index) % caveKeys.length];
    const existing = existingTextureKey(key);
    if (existing) return existing;
  }
  return undefined;
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

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

function mergeTextureMaps<T extends Record<string, string>>(fallback: T, preferred?: Record<string, string>): T {
  return { ...fallback, ...(preferred ?? {}) } as T;
}

function v2Asset(
  id: string,
  filename: string,
  category: WorldPremiumV2PoiCategory,
  visualRationale: string,
  tags: string[],
  recommendedScale: number,
  unusedReason?: string,
  dimensions = 1024
): WorldCurrentAssetRecord {
  return {
    id,
    textureKey: `world_current_object_${id}`,
    sourceFilename: filename,
    sourceSemanticId: id,
    newCanonicalFilename: `objects_premium_v2/${filename}`,
    filename: `objects_premium_v2/${filename}`,
    category: "premium_v2_poi",
    subcategory: category,
    semanticRole: `poi:${category}`,
    intendedRuntimeUsage: tags.join(", "),
    assetKind: "world object",
    dimensions: { width: dimensions, height: dimensions },
    transparencyStatus: "alpha",
    magentaKeyRemovalNeeded: false,
    scaleCropPadNeeded: "none",
    placeholder: false,
    qualityFlag: "approved",
    selectedSourceFile: filename,
    selectedSourceRow: null,
    selectedSourceCol: null,
    visualRationale,
    backgroundRemovalMethod: "alpha_preserved",
    anchorX: 0.5,
    anchorY: 0.92,
    footprintWidth: 2,
    footprintHeight: 2,
    recommendedScale,
    placementLayer: "poi",
    tags,
    source: "objects_premium_v2",
    premium: true,
    qualityBucket: "premium_v2",
    integrationRole: `poi:${category}`,
    integrationStatus: "integrated",
    notes: unusedReason ? `Potentially unused: ${unusedReason}` : "Premium v2 visually classified POI asset; preferred before objects_premium and objects fallbacks."
  };
}
