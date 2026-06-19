import dungeonAtlasManifestJson from "../assets/world/dungeonAtlas.manifest.json" with { type: "json" };

export type DungeonTileId = string;
export type DungeonTileCategory = "floor" | "wall" | "object" | "exit" | "gate" | "stairs" | "seal";
export type DungeonTheme = "medieval" | "cave" | "ice" | "volcanic" | "cursed" | "ruin" | "object";

export interface DungeonSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DungeonTileCell {
  row: number;
  col: number;
  source: DungeonSourceRect;
  id: DungeonTileId;
  category: DungeonTileCategory;
  theme: DungeonTheme;
  tags: string[];
  notes?: string;
}

interface DungeonAtlasManifest {
  schemaVersion: number;
  id: "dungeon_atlas";
  sourceImage: string;
  sourceSha256: string;
  runtimeImage: string;
  columns: 8;
  rows: 8;
  tileWidth: number;
  tileHeight: number;
  image: {
    width: number;
    height: number;
    runtimeFormat: string;
    sourceFormat: string;
  };
  sourceInset: number;
  cells: DungeonTileCell[];
  tiles: Record<string, DungeonTileCell>;
}

export const DUNGEON_ATLAS_SOURCE_INSET = 3;

export const DUNGEON_ATLAS_MANIFEST = dungeonAtlasManifestJson as DungeonAtlasManifest;

export const DUNGEON_ATLAS = {
  id: DUNGEON_ATLAS_MANIFEST.id,
  textureKey: "dungeon_atlas",
  image: DUNGEON_ATLAS_MANIFEST.runtimeImage,
  manifest: "src/assets/world/dungeonAtlas.manifest.json",
  sourceImage: DUNGEON_ATLAS_MANIFEST.sourceImage,
  sourceInset: DUNGEON_ATLAS_SOURCE_INSET,
  columns: DUNGEON_ATLAS_MANIFEST.columns,
  rows: DUNGEON_ATLAS_MANIFEST.rows,
  tileWidth: DUNGEON_ATLAS_MANIFEST.tileWidth,
  tileHeight: DUNGEON_ATLAS_MANIFEST.tileHeight,
  sheetWidth: DUNGEON_ATLAS_MANIFEST.image.width,
  sheetHeight: DUNGEON_ATLAS_MANIFEST.image.height
} as const;

export const DUNGEON_TILE_IDS = {
  plainGrayStoneFloor: "plain_gray_stone_floor",
  crackedGrayStoneFloor: "cracked_gray_stone_floor",
  mossyStoneFloor: "mossy_stone_floor",
  darkWornStoneFloor: "dark_worn_stone_floor",
  stoneFloorDebris: "stone_floor_debris",
  stoneFloorDrainageCracks: "stone_floor_drainage_cracks",
  stoneFloorMagicMarks: "stone_floor_magic_marks",
  stoneFloorShadow: "stone_floor_shadow",
  grayStoneWall: "gray_stone_wall",
  crackedStoneWall: "cracked_stone_wall",
  mossyStoneWall: "mossy_stone_wall",
  darkStoneWall: "dark_stone_wall",
  torchStoneWall: "torch_stone_wall",
  ironBarWall: "iron_bar_wall",
  brokenStoneRubbleWall: "broken_stone_rubble_wall",
  heavyStonePillar: "heavy_stone_pillar",
  dirtCaveFloor: "dirt_cave_floor",
  rockyCaveFloor: "rocky_cave_floor",
  mossyCaveFloor: "mossy_cave_floor",
  dampCaveFloor: "damp_cave_floor",
  caveFloorPebbles: "cave_floor_pebbles",
  caveFloorRoots: "cave_floor_roots",
  glowingMushroomCaveFloor: "glowing_mushroom_cave_floor",
  caveFloorShadow: "cave_floor_shadow",
  roughCaveWall: "rough_cave_wall",
  darkCaveWall: "dark_cave_wall",
  mossyCaveWall: "mossy_cave_wall",
  wetCaveWall: "wet_cave_wall",
  rootCaveWall: "root_cave_wall",
  crystalCaveWall: "crystal_cave_wall",
  caveRubbleBlocker: "cave_rubble_blocker",
  caveEntranceExit: "cave_entrance_exit",
  paleIceFloor: "pale_ice_floor",
  crackedIceFloor: "cracked_ice_floor",
  frostyStoneFloor: "frosty_stone_floor",
  snowyIceFloor: "snowy_ice_floor",
  slipperyBlueIceFloor: "slippery_blue_ice_floor",
  frozenCrackIceFloor: "frozen_crack_ice_floor",
  snowDriftIceFloor: "snow_drift_ice_floor",
  iceFloorShadow: "ice_floor_shadow",
  iceWallBlock: "ice_wall_block",
  crackedIceWall: "cracked_ice_wall",
  frostedStoneWall: "frosted_stone_wall",
  darkBlueIceWall: "dark_blue_ice_wall",
  frozenCrystalWall: "frozen_crystal_wall",
  snowCoveredWall: "snow_covered_wall",
  icePillarBlocker: "ice_pillar_blocker",
  frozenDoorwayExit: "frozen_doorway_exit",
  closedTreasureChestTile: "closed_treasure_chest_tile",
  openTreasureChestTile: "open_treasure_chest_tile",
  lockedIronGateClosed: "locked_iron_gate_closed",
  openIronGate: "open_iron_gate",
  stairwayDown: "stairway_down",
  stairwayUp: "stairway_up",
  floorSwitchPressurePlate: "floor_switch_pressure_plate",
  glowingBossRelicSeal: "glowing_boss_relic_seal",
  lavaCrackedStoneFloor: "lava_cracked_stone_floor",
  volcanicStoneWall: "volcanic_stone_wall",
  cursedPurpleStoneFloor: "cursed_purple_stone_floor",
  cursedPurpleWall: "cursed_purple_wall",
  ancientRuinFloor: "ancient_ruin_floor",
  ancientRuinWall: "ancient_ruin_wall",
  magicPortalExit: "magic_portal_exit",
  ornateBossDoorGate: "ornate_boss_door_gate"
} as const satisfies Record<string, DungeonTileId>;

export const DUNGEON_TILE_CELLS = DUNGEON_ATLAS_MANIFEST.cells;
export const DUNGEON_TILES = DUNGEON_ATLAS_MANIFEST.tiles;
export const DUNGEON_TILE_ID_SET = new Set(Object.keys(DUNGEON_TILES));

export function dungeonTileById(id: DungeonTileId | undefined): DungeonTileCell | undefined {
  if (!id) return undefined;
  return DUNGEON_TILES[id];
}

export function dungeonAtlasSourceRectWithInset(sourceRect: DungeonSourceRect, inset = DUNGEON_ATLAS_SOURCE_INSET): DungeonSourceRect {
  if (!Number.isInteger(inset) || inset < 0) {
    throw new Error(`dungeon_atlas source inset must be a non-negative integer; got ${inset}.`);
  }
  if (inset * 2 >= sourceRect.width || inset * 2 >= sourceRect.height) {
    throw new Error(`dungeon_atlas source inset ${inset} is too large for source rect ${sourceRect.width}x${sourceRect.height}.`);
  }
  return {
    x: sourceRect.x + inset,
    y: sourceRect.y + inset,
    width: sourceRect.width - inset * 2,
    height: sourceRect.height - inset * 2
  };
}
