import type { WorldTileId } from "../data/worldTiles";

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
