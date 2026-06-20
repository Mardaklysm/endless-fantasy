export interface SemanticVec {
  x: number;
  y: number;
}

export const SEMANTIC_BIOME = {
  WATER: 0,
  GRASS: 1,
  SAND: 2,
  ICE: 3,
  BEACH: 4
} as const;

export const SEMANTIC_WATER = {
  NONE: 0,
  DEEP: 1,
  SHALLOW: 2,
  RIVER: 3,
  LAKE: 4
} as const;

export type SemanticBiomeValue = (typeof SEMANTIC_BIOME)[keyof typeof SEMANTIC_BIOME];
export type SemanticWaterValue = (typeof SEMANTIC_WATER)[keyof typeof SEMANTIC_WATER];

export type MajorIslandId = "greenhaven" | "coralreach" | "frostmere" | "highspire";
export type SemanticIslandId = MajorIslandId | `minor_${number}`;
export type IslandTheme = "grassland" | "sand_coast" | "ice" | "mixed_highland" | "minor";
export type IslandRole = "starter" | "coastal_trade" | "snow_shrine" | "mountain_ruins" | "harbor" | "treasure" | "shrine" | "cave" | "resource";

export type SemanticPoiType =
  | "town"
  | "village"
  | "port"
  | "cave"
  | "shrine"
  | "ruins"
  | "tower"
  | "final"
  | "gate"
  | "treasure"
  | "resource";

export interface WorldProfile {
  id: string;
  name: string;
  majorIslands: IslandProfile[];
  minorIslandCount: { min: number; max: number };
  minorRoles: IslandRole[];
  startingIslandId: MajorIslandId;
}

export interface IslandProfile {
  id: MajorIslandId;
  name: string;
  role: IslandRole;
  theme: IslandTheme;
  zone: { x: number; y: number; width: number; height: number };
  radius: { x: number; y: number };
  sizeBias: number;
  dryBias: number;
  coldBias: number;
  mountainBias: number;
  forestBias: number;
  requiredPois: RequiredPoiSpec[];
  requiredHarbors: number;
  allowRoads: boolean;
  allowRivers: boolean;
}

export interface RequiredPoiSpec {
  id: string;
  name: string;
  type: SemanticPoiType;
  role: "settlement" | "port" | "dungeon" | "gate" | "final" | "landmark";
  preferredBiome?: "grass" | "sand" | "ice" | "beach";
  nearMountains?: boolean;
  nearForest?: boolean;
}

export interface SemanticIslandRecord {
  id: SemanticIslandId;
  name: string;
  role: IslandRole;
  theme: IslandTheme;
  order: number;
  major: boolean;
  area: number;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  center: SemanticVec;
  profile?: IslandProfile;
  dryBias: number;
  coldBias: number;
  mountainBias: number;
  forestBias: number;
  requiredPois: RequiredPoiSpec[];
  requiredHarbors: number;
  allowRoads: boolean;
  allowRivers: boolean;
}

export interface SemanticMountain extends SemanticVec {
  kind: "mountain" | "snow_mountain";
  islandId: SemanticIslandId;
  elevation: number;
  ridge: number;
}

export interface SemanticLake extends SemanticVec {
  radius: number;
  cells: SemanticVec[];
}

export interface SemanticRiver {
  id: string;
  islandId: SemanticIslandId;
  source: SemanticVec;
  mouth: SemanticVec;
  path: SemanticVec[];
}

export interface SemanticPoi extends SemanticVec {
  id: string;
  name: string;
  type: SemanticPoiType;
  role: "settlement" | "port" | "dungeon" | "gate" | "final" | "landmark";
  islandId: SemanticIslandId;
  difficultyTier: number;
}

export interface SemanticRoadEdge {
  from: string;
  to: string;
  connected: boolean;
  length: number;
  path: SemanticVec[];
}

export interface SemanticValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export interface SemanticWorldLayers {
  elevation: Float32Array;
  landMask: Uint8Array;
  islandId: Int16Array;
  distanceToLand: Int16Array;
  distanceToWater: Int16Array;
  waterClass: Uint8Array;
  biome: Uint8Array;
  moisture: Float32Array;
  temperature: Float32Array;
  coldness: Float32Array;
  ridge: Float32Array;
  mountainMap: Uint8Array;
  lakeMap: Uint8Array;
  riverMap: Uint8Array;
  forestMap: Uint8Array;
  roadMap: Uint8Array;
  walkability: Uint8Array;
}

export interface SemanticWorldStats {
  landCells: number;
  deepWaterCells: number;
  shallowWaterCells: number;
  beachCells: number;
  grassCells: number;
  sandCells: number;
  iceCells: number;
  mountainCells: number;
  forestCells: number;
  roadCells: number;
  riverCells: number;
}

export interface SemanticWorld {
  seed: string;
  width: number;
  height: number;
  profile: WorldProfile;
  islands: SemanticIslandRecord[];
  islandIndexToId: Map<number, SemanticIslandId>;
  layers: SemanticWorldLayers;
  mountains: SemanticMountain[];
  lakes: SemanticLake[];
  rivers: SemanticRiver[];
  poiList: SemanticPoi[];
  harbors: SemanticPoi[];
  roadGraph: { edges: SemanticRoadEdge[] };
  stats: SemanticWorldStats;
  validation: SemanticValidationResult;
}
