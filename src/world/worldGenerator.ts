import {
  buildWorldDebugReport as buildClassicIslandWorldDebugReport,
  classicOverlayBlocksTile,
  createWorldSeed as createClassicIslandWorldSeed,
  generateWorld as generateClassicIslandWorld,
  getPoiAt as getClassicIslandPoiAt,
  getWorldTileAt as getClassicIslandWorldTileAt,
  isWorldPositionWalkable as isClassicIslandWorldPositionWalkable,
  validateGeneratedWorld as validateClassicIslandWorld,
  worldEncounterFamilyForTile as classicIslandEncounterFamilyForTile,
  type GeneratedWorld as ClassicIslandGeneratedWorld,
  type WorldOverlay,
} from "./classicIslandWorldGenerator.ts";
import {
  buildWorldDebugReport as buildGenericAtlasWorldDebugReport,
  createWorldSeed as createGenericAtlasWorldSeed,
  generateWorld as generateGenericAtlasWorld,
  getPoiAt as getGenericAtlasPoiAt,
  getWorldTileAt as getGenericAtlasWorldTileAt,
  isWorldPositionWalkable as isGenericAtlasWorldPositionWalkable,
  validateGeneratedWorld as validateGenericAtlasWorld,
  worldEncounterFamilyForTile as genericAtlasEncounterFamilyForTile,
  type GeneratedWorld as GenericAtlasGeneratedWorld,
} from "./genericAtlasWorldGenerator.ts";
import { DEFAULT_WORLDGEN_MODE, type WorldgenMode } from "./worldgenConfig.ts";
import type { WorldEncounterFamily, WorldTileId } from "../data/worldTiles.ts";

export type {
  WorldEntryTrigger,
  WorldPoi,
  WorldPoiKind,
  WorldValidationResult,
  WorldVec,
  WorldBridge,
} from "./classicIslandWorldGenerator.ts";
export type { WorldOverlay } from "./classicIslandWorldGenerator.ts";

export type GeneratedWorld = ClassicIslandGeneratedWorld | GenericAtlasGeneratedWorld;

export interface GenerateWorldOptions {
  seed?: string;
  width?: number;
  height?: number;
  maxAttempts?: number;
  mode?: WorldgenMode;
}

export function createWorldSeed(mode: WorldgenMode = DEFAULT_WORLDGEN_MODE): string {
  return mode === "classicIsland" ? createClassicIslandWorldSeed() : createGenericAtlasWorldSeed();
}

export function generateWorld(options: GenerateWorldOptions = {}): GeneratedWorld {
  const mode = options.mode ?? DEFAULT_WORLDGEN_MODE;
  return mode === "classicIsland" ? generateClassicIslandWorld(options) : generateGenericAtlasWorld(options);
}

export function getWorldTileAt(world: GeneratedWorld, x: number, y: number): WorldTileId | undefined {
  return world.mode === "classicIsland"
    ? (getClassicIslandWorldTileAt(world, x, y) as WorldTileId | undefined)
    : (getGenericAtlasWorldTileAt(world, x, y) as WorldTileId | undefined);
}

export function isWorldPositionWalkable(world: GeneratedWorld, x: number, y: number): boolean {
  return world.mode === "classicIsland"
    ? isClassicIslandWorldPositionWalkable(world, x, y)
    : isGenericAtlasWorldPositionWalkable(world, x, y);
}

export function getPoiAt(world: GeneratedWorld, x: number, y: number) {
  return world.mode === "classicIsland" ? getClassicIslandPoiAt(world, x, y) : getGenericAtlasPoiAt(world, x, y);
}

export function worldEncounterFamilyForTile(tileId: WorldTileId): WorldEncounterFamily | undefined {
  return (
    classicIslandEncounterFamilyForTile(tileId as never) ??
    genericAtlasEncounterFamilyForTile(tileId as never)
  ) as WorldEncounterFamily | undefined;
}

export function validateGeneratedWorld(world: GeneratedWorld) {
  return world.mode === "classicIsland" ? validateClassicIslandWorld(world) : validateGenericAtlasWorld(world);
}

export function buildWorldDebugReport(world: GeneratedWorld): string {
  return world.mode === "classicIsland"
    ? buildClassicIslandWorldDebugReport(world)
    : buildGenericAtlasWorldDebugReport(world);
}

export function worldOverlayBlocksTile(world: GeneratedWorld, x: number, y: number): boolean {
  return world.mode === "classicIsland" ? classicOverlayBlocksTile(world, x, y) : false;
}

export function worldOverlays(world: GeneratedWorld): readonly WorldOverlay[] {
  return world.mode === "classicIsland" ? world.overlays : [];
}
