import type { AssetKey } from "../assets/assetTypes";
import type { Vec } from "../scene/sceneTypes";

export type PoiCategory = "village" | "dungeonEntrance" | "shrine" | "camp" | "ruin" | "landmark" | "cave" | "bossGate" | "storyLocation";
export type PoiFacing = "up" | "down" | "left" | "right";

export interface PoiRectZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  note?: string;
}

export interface PoiCircleZone {
  x: number;
  y: number;
  radius: number;
}

export type PoiTriggerShape =
  | ({ kind: "circle" } & PoiCircleZone)
  | ({ kind: "rect" } & Omit<PoiRectZone, "id" | "note">);

export type PoiAction =
  | { kind: "openShop"; shopId: "weapons" | "armor" | "items" | string; townId?: string }
  | { kind: "openInn"; townId?: string }
  | { kind: "openChurch"; townId?: string }
  | { kind: "openDialog"; lines: string[] }
  | { kind: "inspect"; lines: string[] }
  | { kind: "transitionToPoi"; poiId: string; entryPointId?: string }
  | { kind: "startDungeon"; dungeonId: string }
  | { kind: "triggerEvent"; eventId: string }
  | { kind: "returnToOverworld" };

export interface PoiInteraction {
  id: string;
  type: "shop" | "service" | "inspect" | "dialog" | "npc" | "transition" | string;
  label: string;
  prompt: string;
  shape: PoiTriggerShape;
  action: PoiAction;
  priority?: number;
}

export type PoiExitDestination =
  | { kind: "returnToOverworld" }
  | { kind: "returnToCaller" }
  | { kind: "transitionToPoi"; poiId: string; entryPointId?: string };

export interface PoiExitZone extends PoiRectZone {
  label: string;
  prompt: string;
  destination: PoiExitDestination;
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
  collision: {
    mode: "walkableWithSolids";
    walkableZones: PoiRectZone[];
    solidZones: PoiRectZone[];
  };
  interactions: PoiInteraction[];
  exits: PoiExitZone[];
  npcs: PoiNpcMarker[];
  debugNotes?: string[];
}

// Image-driven POI coordinates are authored in source image pixels.
// To tune this map, adjust rectangles and hotspot circles here while the F6 "pois"
// overlay is active in the POI scene.
export const POI_METADATA: PoiMetadata[] = [
  {
    id: "starting_grassland_village",
    displayName: "Grassland Village",
    type: "village",
    sourceLocationId: "dawnford",
    serviceTownId: "dawnford",
    background: {
      key: "poi_starting_grassland_village",
      path: "assets/poi/starting_grassland_village.jpeg",
      width: 2752,
      height: 1536
    },
    spawn: { x: 1545, y: 1115, facing: "down" },
    movement: { stepSize: 24 },
    collision: {
      mode: "walkableWithSolids",
      walkableZones: [
        { id: "central-village-field", x: 470, y: 600, width: 1545, height: 775 },
        { id: "north-service-field", x: 690, y: 250, width: 1725, height: 555 },
        { id: "west-service-field", x: 175, y: 520, width: 960, height: 735 },
        { id: "south-path-field", x: 210, y: 1075, width: 2300, height: 370 },
        { id: "east-service-field", x: 1620, y: 610, width: 950, height: 730 },
        { id: "items-front-field", x: 1800, y: 1010, width: 710, height: 390 },
        { id: "south-path-exit", x: 1320, y: 1325, width: 520, height: 125 },
        { id: "east-path-exit", x: 2440, y: 950, width: 165, height: 330 }
      ],
      solidZones: [
        { id: "inn-main", x: 1070, y: 35, width: 645, height: 725, note: "Large inn body and roof." },
        { id: "inn-annex", x: 1555, y: 320, width: 315, height: 360 },
        { id: "weapons-smithy", x: 330, y: 345, width: 525, height: 365 },
        { id: "church", x: 330, y: 910, width: 500, height: 385 },
        { id: "armor-shop", x: 1930, y: 420, width: 455, height: 445 },
        { id: "item-stall", x: 2050, y: 1060, width: 470, height: 310 },
        { id: "central-well", x: 1265, y: 920, width: 280, height: 315 },
        { id: "left-upper-trees", x: 120, y: 250, width: 290, height: 390 },
        { id: "left-lower-trees", x: 120, y: 790, width: 280, height: 430 },
        { id: "top-center-tree", x: 720, y: 95, width: 300, height: 335 },
        { id: "top-right-tree-line", x: 1900, y: 95, width: 500, height: 300 },
        { id: "right-upper-trees", x: 2320, y: 220, width: 280, height: 410 },
        { id: "right-lower-trees", x: 2260, y: 830, width: 300, height: 330 },
        { id: "barrel-crates-east", x: 2400, y: 690, width: 150, height: 185 },
        { id: "crates-south-east", x: 2225, y: 1240, width: 300, height: 170 }
      ]
    },
    interactions: [
      {
        id: "church",
        type: "service",
        label: "Church",
        prompt: "Visit Church?",
        shape: { kind: "circle", x: 900, y: 1305, radius: 220 },
        action: { kind: "openChurch", townId: "dawnford" }
      },
      {
        id: "weapons",
        type: "shop",
        label: "Weapons",
        prompt: "Enter Weapons?",
        shape: { kind: "circle", x: 940, y: 820, radius: 225 },
        action: { kind: "openShop", shopId: "weapons", townId: "dawnford" }
      },
      {
        id: "armor",
        type: "shop",
        label: "Armor",
        prompt: "Enter Armor?",
        shape: { kind: "circle", x: 1950, y: 845, radius: 215 },
        action: { kind: "openShop", shopId: "armor", townId: "dawnford" }
      },
      {
        id: "items",
        type: "shop",
        label: "Items",
        prompt: "Browse Items?",
        shape: { kind: "circle", x: 2150, y: 1265, radius: 260 },
        action: { kind: "openShop", shopId: "items", townId: "dawnford" }
      },
      {
        id: "inn",
        type: "service",
        label: "Inn",
        prompt: "Enter Inn?",
        shape: { kind: "circle", x: 1340, y: 735, radius: 180 },
        action: { kind: "openInn", townId: "dawnford" }
      }
    ],
    exits: [
      {
        id: "south_path",
        label: "South Path",
        prompt: "Leave this area?",
        x: 1350,
        y: 1360,
        width: 440,
        height: 95,
        destination: { kind: "returnToOverworld" }
      },
      {
        id: "east_path",
        label: "East Path",
        prompt: "Leave this area?",
        x: 2480,
        y: 990,
        width: 120,
        height: 280,
        destination: { kind: "returnToOverworld" }
      }
    ],
    npcs: [],
    debugNotes: [
      "NPC markers are intentionally data-ready but not rendered yet.",
      "Collision is broad rectangle geometry over the authored image, not procedural village generation."
    ]
  }
];

export function getPoiMetadata(id: string): PoiMetadata | undefined {
  return POI_METADATA.find((poi) => poi.id === id);
}

export function poiIdForWorldLocation(locationId: string): string | undefined {
  return POI_METADATA.find((poi) => poi.sourceLocationId === locationId)?.id;
}
