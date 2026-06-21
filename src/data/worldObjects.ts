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

export interface WorldObjectDefinition {
  id: WorldObjectId;
  category: WorldObjectCategory;
  tags: readonly string[];
  notes?: string;
}

export const WORLD_OBJECT_RUNTIME_SOURCE = {
  id: "current_world_individual_sprites",
  manifest: "src/assets/world/current/world_asset_manifest.json",
  deprecatedAtlasActive: false
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

const TREASURE_OBJECTS = new Set<WorldObjectId>([
  WORLD_OBJECT_IDS.closedTreasureChest,
  WORLD_OBJECT_IDS.openTreasureChest,
  WORLD_OBJECT_IDS.stoneGuardianCache,
  WORLD_OBJECT_IDS.supplyCrates,
  WORLD_OBJECT_IDS.barrelStack,
  WORLD_OBJECT_IDS.octopusCache,
  WORLD_OBJECT_IDS.jeweledMagicCache,
  WORLD_OBJECT_IDS.mossyLockedCache,
  WORLD_OBJECT_IDS.floatingTreasureBarrel
]);

const WATER_OBJECTS = new Set<WorldObjectId>([
  WORLD_OBJECT_IDS.fishingSpot,
  WORLD_OBJECT_IDS.coralClusterBlue,
  WORLD_OBJECT_IDS.shipwreckDebris,
  WORLD_OBJECT_IDS.brokenMast,
  WORLD_OBJECT_IDS.whirlpoolSwirl
]);

const NATURE_OBJECTS = new Set<WorldObjectId>([
  WORLD_OBJECT_IDS.herbBush,
  WORLD_OBJECT_IDS.broadleafTree,
  WORLD_OBJECT_IDS.darkPineTree,
  WORLD_OBJECT_IDS.palmTree,
  WORLD_OBJECT_IDS.denseJungleBush,
  WORLD_OBJECT_IDS.thornBramble,
  WORLD_OBJECT_IDS.fallenLog,
  WORLD_OBJECT_IDS.giantMushroomCluster,
  WORLD_OBJECT_IDS.vinesOverStone
]);

const ROCK_OBJECTS = new Set<WorldObjectId>([
  WORLD_OBJECT_IDS.grayBoulderPile,
  WORLD_OBJECT_IDS.rockyHillObject,
  WORLD_OBJECT_IDS.smallMountainPeak,
  WORLD_OBJECT_IDS.snowyMountainPeak
]);

const VOLCANIC_OBJECTS = new Set<WorldObjectId>([
  WORLD_OBJECT_IDS.volcanoCone,
  WORLD_OBJECT_IDS.lavaVentRocks,
  WORLD_OBJECT_IDS.blackAshRockCluster
]);

export const WORLD_OBJECTS = Object.fromEntries(
  Object.values(WORLD_OBJECT_IDS).map((id) => [
    id,
    {
      id,
      category: categoryForObject(id),
      tags: tagsForObject(id),
      notes: "Rendered from src/assets/world/current/world_asset_manifest.json; no atlas source rect is active."
    } satisfies WorldObjectDefinition
  ])
) as Record<WorldObjectId, WorldObjectDefinition>;

export const WORLD_OBJECT_ID_SET = new Set(Object.keys(WORLD_OBJECTS));

export function worldObjectById(id: WorldObjectId): WorldObjectDefinition | undefined {
  return WORLD_OBJECTS[id];
}

function categoryForObject(id: WorldObjectId): WorldObjectCategory {
  if (id.includes("cave") || id.includes("entrance") || id.includes("door")) return "dungeonEntrance";
  if (id.includes("shrine") || id.includes("obelisk") || id.includes("stones") || id.includes("statue")) return "landmark";
  if (TREASURE_OBJECTS.has(id)) return "treasure";
  if (id === WORLD_OBJECT_IDS.oreNode) return "resource";
  if (WATER_OBJECTS.has(id)) return "waterOverlay";
  if (id.includes("harbor") || id.includes("rowboat") || id.includes("mooring") || id.includes("anchor") || id.includes("dock") || id.includes("net")) return "harbor";
  if (id.includes("merchant") || id.includes("market")) return "merchant";
  if (id.includes("monster")) return "encounter";
  if (id.includes("campfire")) return "camp";
  if (id.includes("sparkle") || id.includes("smoke")) return "effect";
  if (NATURE_OBJECTS.has(id)) return "nature";
  if (ROCK_OBJECTS.has(id)) return "rock";
  if (VOLCANIC_OBJECTS.has(id)) return "volcanic";
  if (id.includes("crystal")) return "crystal";
  return "prop";
}

function tagsForObject(id: WorldObjectId): string[] {
  const tags: string[] = [];
  const category = categoryForObject(id);
  tags.push(category);
  if (category === "rock" || category === "volcanic") tags.push("hardBlock");
  if (category === "nature") tags.push("overlay");
  if (category === "waterOverlay") tags.push("water");
  if (id.includes("snowy")) tags.push("snow");
  return tags;
}
