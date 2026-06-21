import cloudManifestJson from "../assets/world/current/clouds/cloud_manifest.json" with { type: "json" };
import type { IslandId, IslandTheme } from "../world/worldGenerator.ts";

export interface WorldCloudAsset {
  id: string;
  textureKey: string;
  filename: string;
  path: string;
  topBand: boolean;
  dimensions: {
    width: number;
    height: number;
  };
  sourceFile?: string;
  cleanupMethod?: string;
  notes?: string;
}

export interface WorldCloudTintConfig {
  tint: string;
  alpha: number;
  speedMultiplier: number;
  tintStrength?: number;
}

export interface WorldCloudManifest {
  schemaVersion: number;
  id: string;
  runtimeRoot: string;
  sourceFolder: string;
  fallbackTheme: string;
  baseClouds: WorldCloudAsset[];
  themeCloudPools?: Record<string, WorldCloudAsset[]>;
  themeTints: Record<string, WorldCloudTintConfig>;
  islandThemeMap: Record<string, string>;
  semanticThemeMap: Record<string, string>;
  fallbackRules: string[];
}

export interface WorldCloudContext {
  islandId?: IslandId | string;
  islandName?: string;
  islandTheme?: IslandTheme | string;
  biomeTheme?: string;
}

export interface WorldCloudThemeResolution {
  themeName: string;
  tintConfig: WorldCloudTintConfig;
  requestedThemeNames: string[];
  usedFallbackTheme: boolean;
}

export interface WorldCloudPoolResolution extends WorldCloudThemeResolution {
  poolName: string;
  assets: readonly WorldCloudAsset[];
  usedBaseClouds: boolean;
}

export const WORLD_CLOUD_MANIFEST = cloudManifestJson as WorldCloudManifest;

export const WORLD_CLOUD_ASSETS = uniqueCloudAssets([
  ...WORLD_CLOUD_MANIFEST.baseClouds,
  ...Object.values(WORLD_CLOUD_MANIFEST.themeCloudPools ?? {}).flat()
]);

export const WORLD_CLOUD_ASSET_BY_TEXTURE_KEY = Object.fromEntries(WORLD_CLOUD_ASSETS.map((asset) => [asset.textureKey, asset])) as Record<string, WorldCloudAsset>;

export function worldCloudThemeForContext(context: WorldCloudContext): WorldCloudThemeResolution {
  const requestedThemeNames = cloudThemeCandidates(context);
  for (const themeName of requestedThemeNames) {
    const tintConfig = WORLD_CLOUD_MANIFEST.themeTints[themeName];
    if (tintConfig) {
      return {
        themeName,
        tintConfig,
        requestedThemeNames,
        usedFallbackTheme: themeName === WORLD_CLOUD_MANIFEST.fallbackTheme && requestedThemeNames[0] !== themeName
      };
    }
  }
  const fallback = WORLD_CLOUD_MANIFEST.fallbackTheme;
  return {
    themeName: fallback,
    tintConfig: WORLD_CLOUD_MANIFEST.themeTints[fallback] ?? { tint: "#FFFFFF", alpha: 0.5, speedMultiplier: 1, tintStrength: 0 },
    requestedThemeNames,
    usedFallbackTheme: true
  };
}

export function worldCloudPoolForContext(context: WorldCloudContext): WorldCloudPoolResolution {
  const theme = worldCloudThemeForContext(context);
  const themedPool = WORLD_CLOUD_MANIFEST.themeCloudPools?.[theme.themeName] ?? [];
  if (themedPool.length) {
    return {
      ...theme,
      poolName: theme.themeName,
      assets: themedPool,
      usedBaseClouds: false
    };
  }
  return {
    ...theme,
    poolName: "baseClouds",
    assets: WORLD_CLOUD_MANIFEST.baseClouds,
    usedBaseClouds: true
  };
}

function cloudThemeCandidates(context: WorldCloudContext): string[] {
  const candidates: string[] = [];
  addCandidate(candidates, mappedTheme(context.islandId));
  addCandidate(candidates, context.islandId);
  addCandidate(candidates, mappedTheme(context.islandName));
  addCandidate(candidates, context.islandName);
  addCandidate(candidates, mappedTheme(context.islandTheme));
  addCandidate(candidates, context.islandTheme);
  addCandidate(candidates, mappedTheme(context.biomeTheme));
  addCandidate(candidates, context.biomeTheme);
  addCandidate(candidates, WORLD_CLOUD_MANIFEST.fallbackTheme);
  return candidates;
}

function mappedTheme(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return (
    WORLD_CLOUD_MANIFEST.islandThemeMap[value] ??
    WORLD_CLOUD_MANIFEST.islandThemeMap[value.toLowerCase()] ??
    WORLD_CLOUD_MANIFEST.semanticThemeMap[value] ??
    WORLD_CLOUD_MANIFEST.semanticThemeMap[value.toLowerCase()]
  );
}

function addCandidate(candidates: string[], themeName: string | undefined): void {
  if (!themeName || candidates.includes(themeName)) return;
  candidates.push(themeName);
}

function uniqueCloudAssets(assets: WorldCloudAsset[]): readonly WorldCloudAsset[] {
  const byKey = new Map<string, WorldCloudAsset>();
  for (const asset of assets) byKey.set(asset.textureKey, asset);
  return [...byKey.values()];
}
