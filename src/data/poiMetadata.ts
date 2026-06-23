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
    movement: { stepSize: 32 },
    collision: {
      mode: "walkableWithSolids",
      walkableZones: [
        { id: "central-green", x: 470, y: 610, width: 1510, height: 760 },
        { id: "north-green", x: 700, y: 250, width: 1700, height: 530 },
        { id: "west-green", x: 175, y: 520, width: 890, height: 700 },
        { id: "south-green", x: 210, y: 1075, width: 2290, height: 360 },
        { id: "east-green", x: 1620, y: 610, width: 930, height: 710 },
        { id: "south-path-exit", x: 1320, y: 1325, width: 520, height: 125 },
        { id: "east-path-exit", x: 2440, y: 950, width: 165, height: 330 }
      ],
      solidZones: [
        { id: "inn-main", x: 1070, y: 35, width: 645, height: 725, note: "Large inn body and roof." },
        { id: "inn-annex", x: 1555, y: 320, width: 315, height: 360 },
        { id: "weapons-smithy", x: 315, y: 365, width: 610, height: 525 },
        { id: "church", x: 330, y: 910, width: 520, height: 425 },
        { id: "armor-shop", x: 1840, y: 420, width: 560, height: 500 },
        { id: "item-stall", x: 1955, y: 1030, width: 575, height: 360 },
        { id: "central-well", x: 1290, y: 970, width: 210, height: 245 },
        { id: "clothesline-and-anvil", x: 905, y: 755, width: 310, height: 170 },
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
        shape: { kind: "circle", x: 860, y: 1240, radius: 145 },
        action: { kind: "openChurch", townId: "dawnford" }
      },
      {
        id: "weapons",
        type: "shop",
        label: "Weapons",
        prompt: "Enter Weapons?",
        shape: { kind: "circle", x: 840, y: 720, radius: 150 },
        action: { kind: "openShop", shopId: "weapons", townId: "dawnford" }
      },
      {
        id: "armor",
        type: "shop",
        label: "Armor",
        prompt: "Enter Armor?",
        shape: { kind: "circle", x: 1800, y: 800, radius: 145 },
        action: { kind: "openShop", shopId: "armor", townId: "dawnford" }
      },
      {
        id: "items",
        type: "shop",
        label: "Items",
        prompt: "Browse Items?",
        shape: { kind: "circle", x: 1925, y: 1165, radius: 165 },
        action: { kind: "openShop", shopId: "items", townId: "dawnford" }
      },
      {
        id: "inn",
        type: "service",
        label: "Inn",
        prompt: "Enter Inn?",
        shape: { kind: "circle", x: 1335, y: 765, radius: 140 },
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
