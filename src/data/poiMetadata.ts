import type { AssetKey } from "../assets/assetTypes";
import type { Vec } from "../scene/sceneTypes";

export type PoiCategory = "village" | "dungeonEntrance" | "shrine" | "camp" | "ruin" | "landmark" | "cave" | "bossGate" | "storyLocation";
export type PoiFacing = "up" | "down" | "left" | "right";
export type PoiActivation = "interact" | "confirm" | "auto";

export interface PoiRectShape {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PoiCircleShape {
  type: "circle";
  x: number;
  y: number;
  radius: number;
}

export interface PoiPolygonShape {
  type: "polygon";
  points: Vec[];
}

export type PoiShape = PoiRectShape | PoiCircleShape | PoiPolygonShape;

export interface PoiZone {
  id: string;
  shape: PoiShape;
  note?: string;
}

export type PoiExitDestination =
  | { kind: "returnToOverworld" }
  | { kind: "returnToCaller" }
  | { kind: "transitionToPoi"; poiId: string; entryPointId?: string };

export type PoiAction =
  | { kind: "openShop"; shopId: "weapons" | "armor" | "items" | string; townId?: string }
  | { kind: "openInn"; townId?: string }
  | { kind: "openChurch"; townId?: string }
  | { kind: "openDialog"; lines: string[] }
  | { kind: "inspect"; lines: string[] }
  | { kind: "transitionToPoi"; poiId: string; entryPointId?: string }
  | { kind: "startDungeon"; dungeonId: string }
  | { kind: "triggerEvent"; eventId: string }
  | { kind: "returnToOverworld" }
  | { kind: "exitPoi"; destination?: PoiExitDestination };

export interface PoiEventZone {
  id: string;
  type: "shop" | "service" | "inspect" | "dialog" | "npc" | "transition" | "exit" | string;
  label: string;
  prompt: string;
  shape: PoiShape;
  activation: PoiActivation;
  action: PoiAction;
  priority?: number;
}

export interface PoiNpcMarker {
  id: string;
  x: number;
  y: number;
  facing?: PoiFacing;
  dialogId?: string;
}

export interface PoiMetadata {
  id: string;
  displayName: string;
  type: PoiCategory;
  sourceLocationId?: string;
  serviceTownId?: string;
  background: {
    key: AssetKey;
    path: string;
    width: number;
    height: number;
  };
  spawn: Vec & { facing?: PoiFacing };
  movement: {
    stepSize: number;
  };
  walkableZones: PoiZone[];
  eventZones: PoiEventZone[];
  npcs: PoiNpcMarker[];
  debugNotes?: string[];
}

const POI_MODULES = import.meta.glob("./pois/*.json", { eager: true, import: "default" }) as Record<string, PoiMetadata>;

export const POI_METADATA: PoiMetadata[] = Object.values(POI_MODULES);

export function getPoiMetadata(id: string): PoiMetadata | undefined {
  return POI_METADATA.find((poi) => poi.id === id);
}

export function poiIdForWorldLocation(locationId: string): string | undefined {
  return POI_METADATA.find((poi) => poi.sourceLocationId === locationId)?.id;
}
