import worldObjectManifestJson from "../assets/world/worldObjectAtlas.manifest.json" with { type: "json" };

export type WorldObjectId = string;
export type WorldObjectCategory =
  | "dungeonEntrance"
  | "landmark"
  | "treasure"
  | "prop"
  | "resource"
  | "waterOverlay"
  | "harbor"
  | "merchant"
  | "encounter"
  | "camp"
  | "effect"
  | "nature"
  | "rock"
  | "volcanic"
  | "crystal";

export interface WorldObjectSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorldObjectCell {
  row: number;
  col: number;
  source: WorldObjectSourceRect;
  id: WorldObjectId;
  category: WorldObjectCategory;
  tags: string[];
  notes?: string;
}

interface WorldObjectAtlasManifest {
  schemaVersion: number;
  id: "world_objects";
  sourceImage: string;
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
  backgroundRemoval: {
    method: string;
    tool: string;
    sampledBackground: string;
    fuzzPercent: number;
    reason: string;
  };
  cells: WorldObjectCell[];
  objects: Record<string, WorldObjectCell>;
}

export const WORLD_OBJECT_ATLAS_MANIFEST = worldObjectManifestJson as WorldObjectAtlasManifest;

export const WORLD_OBJECT_ATLAS = {
  id: WORLD_OBJECT_ATLAS_MANIFEST.id,
  textureKey: "world_objects",
  image: WORLD_OBJECT_ATLAS_MANIFEST.runtimeImage,
  manifest: "src/assets/world/worldObjectAtlas.manifest.json",
  sourceImage: WORLD_OBJECT_ATLAS_MANIFEST.sourceImage,
  columns: WORLD_OBJECT_ATLAS_MANIFEST.columns,
  rows: WORLD_OBJECT_ATLAS_MANIFEST.rows,
  tileWidth: WORLD_OBJECT_ATLAS_MANIFEST.tileWidth,
  tileHeight: WORLD_OBJECT_ATLAS_MANIFEST.tileHeight,
  sheetWidth: WORLD_OBJECT_ATLAS_MANIFEST.image.width,
  sheetHeight: WORLD_OBJECT_ATLAS_MANIFEST.image.height
} as const;

export const WORLD_OBJECT_IDS = {
  mossyCaveEntrance: "mossy_cave_entrance",
  banditHideoutDoor: "bandit_hideout_door",
  jungleRuinsStairs: "jungle_ruins_stairs",
  pirateGrottoEntrance: "pirate_grotto_entrance",
  volcanicTempleEntrance: "volcanic_temple_entrance",
  cursedFortressGate: "cursed_fortress_gate",
  ancientSealedDoor: "ancient_sealed_door",
  darkBossPortal: "dark_boss_portal",
  smallBrokenRuins: "small_broken_ruins",
  ruinedArchway: "ruined_archway",
  crackedStoneObelisk: "cracked_stone_obelisk",
  mossyStatue: "mossy_statue",
  jungleIdolShrine: "jungle_idol_shrine",
  glowingMagicShrine: "glowing_magic_shrine",
  ancientStandingStones: "ancient_standing_stones",
  graveMarkerCluster: "grave_marker_cluster",
  closedTreasureChest: "closed_treasure_chest",
  openTreasureChest: "open_treasure_chest",
  stoneGuardianCache: "stone_guardian_cache",
  supplyCrates: "supply_crates",
  barrelStack: "barrel_stack",
  oreNode: "ore_node",
  herbBush: "herb_bush",
  fishingSpot: "fishing_spot",
  octopusCache: "octopus_cache",
  coralClusterBlue: "coral_cluster_blue",
  jeweledMagicCache: "jeweled_magic_cache",
  mossyLockedCache: "mossy_locked_cache",
  shipwreckDebris: "shipwreck_debris",
  brokenMast: "broken_mast",
  floatingTreasureBarrel: "floating_treasure_barrel",
  whirlpoolSwirl: "whirlpool_swirl",
  harborSignpost: "harbor_signpost",
  woodenRowboat: "wooden_rowboat",
  mooringPostRope: "mooring_post_rope",
  anchor: "anchor",
  dockLanternPost: "dock_lantern_post",
  fishingNetsStack: "fishing_nets_stack",
  travelFlagMarker: "travel_flag_marker",
  coastalMarketStall: "coastal_market_stall",
  monsterNest: "monster_nest",
  campfireCookpot: "campfire_cookpot",
  secretMerchantTent: "secret_merchant_tent",
  lockedIronGate: "locked_iron_gate",
  ancientKeyPedestal: "ancient_key_pedestal",
  discoverySparkle: "discovery_sparkle",
  smokePlume: "smoke_plume",
  questNoticeBoard: "quest_notice_board",
  broadleafTree: "broadleaf_tree",
  darkPineTree: "dark_pine_tree",
  palmTree: "palm_tree",
  denseJungleBush: "dense_jungle_bush",
  thornBramble: "thorn_bramble",
  fallenLog: "fallen_log",
  giantMushroomCluster: "giant_mushroom_cluster",
  vinesOverStone: "vines_over_stone",
  grayBoulderPile: "gray_boulder_pile",
  rockyHillObject: "rocky_hill_object",
  smallMountainPeak: "small_mountain_peak",
  snowyMountainPeak: "snowy_mountain_peak",
  volcanoCone: "volcano_cone",
  lavaVentRocks: "lava_vent_rocks",
  blackAshRockCluster: "black_ash_rock_cluster",
  cursedPurpleCrystalCluster: "cursed_purple_crystal_cluster"
} as const satisfies Record<string, WorldObjectId>;

export const WORLD_OBJECT_CELLS = WORLD_OBJECT_ATLAS_MANIFEST.cells;
export const WORLD_OBJECTS = WORLD_OBJECT_ATLAS_MANIFEST.objects;
export const WORLD_OBJECT_ID_SET = new Set(Object.keys(WORLD_OBJECTS));

export function worldObjectById(id: WorldObjectId): WorldObjectCell | undefined {
  return WORLD_OBJECTS[id];
}
