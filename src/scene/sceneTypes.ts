import type { WorldTileId } from "../data/worldTiles";
import type { IslandId } from "../world/worldGenerator";

export type Mode =
  | "title"
  | "world"
  | "town"
  | "dungeon"
  | "dialogue"
  | "menu"
  | "battle"
  | "gameOver"
  | "ending";

export type ExploreMode = "world" | "town" | "dungeon";
export type DirectionName = "up" | "down" | "left" | "right";
export type Terrain = WorldTileId;

export function isExploreModeValue(mode: Mode): mode is ExploreMode {
  return mode === "world" || mode === "town" || mode === "dungeon";
}

export interface Vec {
  x: number;
  y: number;
}

export interface ExploreStep {
  mode: ExploreMode;
  from: Vec;
  to: Vec;
  dir: Vec;
}

export type WorldControlLockReason = "boatTravel";
export type BoatTravelDirection = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export interface BoatTravelState {
  sourceIslandId: IslandId;
  destinationIslandId: IslandId;
  destinationName: string;
  costGold: number;
  previousBoatFlag: boolean;
  departureTile: Vec;
  arrivalTile: Vec;
  sourceDockTile: Vec;
  destinationDockTile: Vec;
  sourceWaterTile: Vec;
  destinationWaterTile: Vec;
  rawPath: Vec[];
  rawPathDistances: number[];
  waypoints: Vec[];
  path: Vec[];
  pathDistances: number[];
  routeLength: number;
  progressTiles: number;
  nextWorldTimeRouteIndex: number;
  segmentIndex: number;
  boatPos: Vec;
  direction: BoatTravelDirection;
}

export interface MenuOption {
  label: string | (() => string);
  action: () => void;
  disabled?: () => boolean;
}

export interface ActiveMenu {
  title: string;
  options: MenuOption[];
  selected: number;
  cancel: () => void;
  footer?: string | (() => string);
}

export interface Dialogue {
  lines: string[];
  index: number;
  done: () => void;
}
