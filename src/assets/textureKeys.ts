import type { CharacterSpriteClass } from "../data/characterSprites";
import { DUNGEON_TILE_IDS, type DungeonTileId } from "../data/dungeonTiles";
import type { CharacterState, ServiceKind } from "../data/gameDataTypes";
import type { AssetKey } from "./assetTypes";

export interface DungeonThemeTiles {
  floors: DungeonTileId[];
  walls: DungeonTileId[];
  exit: DungeonTileId;
  gateClosed: DungeonTileId;
  gateOpen: DungeonTileId;
  stairsDown: DungeonTileId;
  stairsUp: DungeonTileId;
  chestClosed: DungeonTileId;
  chestOpen: DungeonTileId;
  switch: DungeonTileId;
  bossSeal: DungeonTileId;
}

export const DUNGEON_FLOOR_TEXTURES: Record<string, AssetKey> = {
  mossCave: "dungeon_floor_moss",
  ashenKeep: "dungeon_floor_fire",
  tideShrine: "dungeon_floor_tide",
  skyglassTower: "dungeon_floor_gale",
  eclipseSpire: "dungeon_floor_eclipse"
};

export const DUNGEON_THEME_TILES: Record<string, DungeonThemeTiles> = {
  mossCave: {
    floors: [
      DUNGEON_TILE_IDS.dirtCaveFloor,
      DUNGEON_TILE_IDS.rockyCaveFloor,
      DUNGEON_TILE_IDS.mossyCaveFloor,
      DUNGEON_TILE_IDS.caveFloorPebbles,
      DUNGEON_TILE_IDS.caveFloorRoots,
      DUNGEON_TILE_IDS.glowingMushroomCaveFloor
    ],
    walls: [
      DUNGEON_TILE_IDS.roughCaveWall,
      DUNGEON_TILE_IDS.darkCaveWall,
      DUNGEON_TILE_IDS.mossyCaveWall,
      DUNGEON_TILE_IDS.rootCaveWall,
      DUNGEON_TILE_IDS.caveRubbleBlocker
    ],
    exit: DUNGEON_TILE_IDS.caveEntranceExit,
    gateClosed: DUNGEON_TILE_IDS.lockedIronGateClosed,
    gateOpen: DUNGEON_TILE_IDS.openIronGate,
    stairsDown: DUNGEON_TILE_IDS.stairwayDown,
    stairsUp: DUNGEON_TILE_IDS.stairwayUp,
    chestClosed: DUNGEON_TILE_IDS.closedTreasureChestTile,
    chestOpen: DUNGEON_TILE_IDS.openTreasureChestTile,
    switch: DUNGEON_TILE_IDS.floorSwitchPressurePlate,
    bossSeal: DUNGEON_TILE_IDS.glowingBossRelicSeal
  },
  tideShrine: {
    floors: [
      DUNGEON_TILE_IDS.ancientRuinFloor,
      DUNGEON_TILE_IDS.mossyStoneFloor,
      DUNGEON_TILE_IDS.stoneFloorDebris,
      DUNGEON_TILE_IDS.dampCaveFloor,
      DUNGEON_TILE_IDS.stoneFloorMagicMarks
    ],
    walls: [
      DUNGEON_TILE_IDS.ancientRuinWall,
      DUNGEON_TILE_IDS.mossyStoneWall,
      DUNGEON_TILE_IDS.brokenStoneRubbleWall,
      DUNGEON_TILE_IDS.crackedStoneWall,
      DUNGEON_TILE_IDS.crystalCaveWall
    ],
    exit: DUNGEON_TILE_IDS.magicPortalExit,
    gateClosed: DUNGEON_TILE_IDS.lockedIronGateClosed,
    gateOpen: DUNGEON_TILE_IDS.openIronGate,
    stairsDown: DUNGEON_TILE_IDS.stairwayDown,
    stairsUp: DUNGEON_TILE_IDS.stairwayUp,
    chestClosed: DUNGEON_TILE_IDS.closedTreasureChestTile,
    chestOpen: DUNGEON_TILE_IDS.openTreasureChestTile,
    switch: DUNGEON_TILE_IDS.floorSwitchPressurePlate,
    bossSeal: DUNGEON_TILE_IDS.glowingBossRelicSeal
  },
  ashenKeep: {
    floors: [
      DUNGEON_TILE_IDS.lavaCrackedStoneFloor,
      DUNGEON_TILE_IDS.darkWornStoneFloor,
      DUNGEON_TILE_IDS.stoneFloorShadow,
      DUNGEON_TILE_IDS.cursedPurpleStoneFloor
    ],
    walls: [
      DUNGEON_TILE_IDS.volcanicStoneWall,
      DUNGEON_TILE_IDS.darkStoneWall,
      DUNGEON_TILE_IDS.ironBarWall,
      DUNGEON_TILE_IDS.heavyStonePillar
    ],
    exit: DUNGEON_TILE_IDS.magicPortalExit,
    gateClosed: DUNGEON_TILE_IDS.ornateBossDoorGate,
    gateOpen: DUNGEON_TILE_IDS.openIronGate,
    stairsDown: DUNGEON_TILE_IDS.stairwayDown,
    stairsUp: DUNGEON_TILE_IDS.stairwayUp,
    chestClosed: DUNGEON_TILE_IDS.closedTreasureChestTile,
    chestOpen: DUNGEON_TILE_IDS.openTreasureChestTile,
    switch: DUNGEON_TILE_IDS.floorSwitchPressurePlate,
    bossSeal: DUNGEON_TILE_IDS.glowingBossRelicSeal
  },
  skyglassTower: {
    floors: [
      DUNGEON_TILE_IDS.paleIceFloor,
      DUNGEON_TILE_IDS.crackedIceFloor,
      DUNGEON_TILE_IDS.frostyStoneFloor,
      DUNGEON_TILE_IDS.slipperyBlueIceFloor,
      DUNGEON_TILE_IDS.frozenCrackIceFloor,
      DUNGEON_TILE_IDS.snowDriftIceFloor
    ],
    walls: [
      DUNGEON_TILE_IDS.iceWallBlock,
      DUNGEON_TILE_IDS.crackedIceWall,
      DUNGEON_TILE_IDS.frostedStoneWall,
      DUNGEON_TILE_IDS.darkBlueIceWall,
      DUNGEON_TILE_IDS.frozenCrystalWall,
      DUNGEON_TILE_IDS.icePillarBlocker
    ],
    exit: DUNGEON_TILE_IDS.frozenDoorwayExit,
    gateClosed: DUNGEON_TILE_IDS.lockedIronGateClosed,
    gateOpen: DUNGEON_TILE_IDS.openIronGate,
    stairsDown: DUNGEON_TILE_IDS.stairwayDown,
    stairsUp: DUNGEON_TILE_IDS.stairwayUp,
    chestClosed: DUNGEON_TILE_IDS.closedTreasureChestTile,
    chestOpen: DUNGEON_TILE_IDS.openTreasureChestTile,
    switch: DUNGEON_TILE_IDS.floorSwitchPressurePlate,
    bossSeal: DUNGEON_TILE_IDS.glowingBossRelicSeal
  },
  eclipseSpire: {
    floors: [
      DUNGEON_TILE_IDS.cursedPurpleStoneFloor,
      DUNGEON_TILE_IDS.darkWornStoneFloor,
      DUNGEON_TILE_IDS.stoneFloorMagicMarks,
      DUNGEON_TILE_IDS.stoneFloorShadow,
      DUNGEON_TILE_IDS.lavaCrackedStoneFloor
    ],
    walls: [
      DUNGEON_TILE_IDS.cursedPurpleWall,
      DUNGEON_TILE_IDS.darkStoneWall,
      DUNGEON_TILE_IDS.ironBarWall,
      DUNGEON_TILE_IDS.heavyStonePillar,
      DUNGEON_TILE_IDS.volcanicStoneWall
    ],
    exit: DUNGEON_TILE_IDS.magicPortalExit,
    gateClosed: DUNGEON_TILE_IDS.ornateBossDoorGate,
    gateOpen: DUNGEON_TILE_IDS.openIronGate,
    stairsDown: DUNGEON_TILE_IDS.stairwayDown,
    stairsUp: DUNGEON_TILE_IDS.stairwayUp,
    chestClosed: DUNGEON_TILE_IDS.closedTreasureChestTile,
    chestOpen: DUNGEON_TILE_IDS.openTreasureChestTile,
    switch: DUNGEON_TILE_IDS.floorSwitchPressurePlate,
    bossSeal: DUNGEON_TILE_IDS.glowingBossRelicSeal
  }
};

export const DEFAULT_DUNGEON_THEME_TILES: DungeonThemeTiles = DUNGEON_THEME_TILES.mossCave;

export const TOWN_ATLAS_FLOOR_TILES: DungeonTileId[] = [
  DUNGEON_TILE_IDS.plainGrayStoneFloor,
  DUNGEON_TILE_IDS.crackedGrayStoneFloor,
  DUNGEON_TILE_IDS.mossyStoneFloor,
  DUNGEON_TILE_IDS.stoneFloorDebris,
  DUNGEON_TILE_IDS.stoneFloorDrainageCracks
];

export const TOWN_ATLAS_WALL_TILES: DungeonTileId[] = [
  DUNGEON_TILE_IDS.grayStoneWall,
  DUNGEON_TILE_IDS.crackedStoneWall,
  DUNGEON_TILE_IDS.mossyStoneWall,
  DUNGEON_TILE_IDS.torchStoneWall
];

export const TOWN_SHOP_PAD_TILES: Record<ServiceKind, DungeonTileId> = {
  inn: DUNGEON_TILE_IDS.mossyStoneFloor,
  item: DUNGEON_TILE_IDS.stoneFloorDebris,
  arms: DUNGEON_TILE_IDS.stoneFloorDrainageCracks,
  magic: DUNGEON_TILE_IDS.stoneFloorMagicMarks,
  clinic: DUNGEON_TILE_IDS.plainGrayStoneFloor
};

export const LOCATION_TEXTURES: Record<string, AssetKey> = {
  dawnford: "marker_castle",
  brinewick: "marker_port",
  elderleaf: "marker_town",
  sunbarrow: "marker_town",
  starfallGate: "marker_gate",
  mossCave: "marker_cave",
  ashenKeep: "marker_keep",
  tideShrine: "marker_shrine",
  skyglassTower: "marker_tower",
  eclipseSpire: "marker_final_spire"
};

export const TOWN_SERVICE_TEXTURES: Record<ServiceKind, AssetKey> = {
  inn: "town_service_inn",
  item: "town_service_items",
  arms: "town_service_arms",
  magic: "town_service_magic",
  clinic: "town_service_clinic"
};

export const TOWN_PROP_TEXTURES = {
  table: "town_prop_table",
  crate: "town_prop_crate",
  barrel: "town_prop_barrel",
  lamp: "town_prop_lamp",
  rug: "town_prop_rug"
} as const satisfies Record<string, AssetKey>;

export const CHARACTER_CLASS_TEXTURES: Record<CharacterSpriteClass, AssetKey> = {
  fighter: "hero_fighter_sprite",
  priest: "hero_priest_sprite",
  mage: "hero_mage_sprite"
};

export const PARTY_CLASS: Record<CharacterState["id"], CharacterSpriteClass> = {
  fighter: "fighter",
  priest: "priest",
  mage: "mage"
};

export const ENEMY_TEXTURES: Record<string, AssetKey> = {
  slimebud: "enemy_slimebud",
  bristleRat: "enemy_bristle_rat",
  fieldImp: "enemy_field_imp",
  thornWisp: "enemy_thorn_wisp",
  mossling: "enemy_mossling",
  venomMoth: "enemy_venom_moth",
  pebbleGnawer: "enemy_pebble_gnawer",
  caveBat: "enemy_cave_bat",
  ironBeetle: "enemy_iron_beetle",
  cinderPup: "enemy_cinder_pup",
  ashSprite: "enemy_ash_sprite",
  coalKnight: "enemy_coal_knight",
  reefFang: "enemy_reef_fang",
  bubbleEye: "enemy_bubble_eye",
  drownedHusk: "enemy_drowned_husk",
  skyMite: "enemy_sky_mite",
  galeHarpy: "enemy_gale_harpy",
  glassRoc: "enemy_glass_roc",
  eclipseShade: "enemy_eclipse_shade",
  crownGuard: "enemy_crown_guard",
  voidSerpent: "enemy_void_serpent",
  rootboundTroll: "boss_rootbound_troll",
  emberTyrant: "boss_ember_tyrant",
  tideOracle: "boss_tide_oracle",
  galeChimera: "boss_gale_chimera",
  eclipseCrown: "boss_eclipse_crown"
};

export const PORTRAIT_TEXTURES: Record<CharacterState["id"], AssetKey> = {
  fighter: "hero_fighter_portrait",
  priest: "hero_priest_portrait",
  mage: "hero_mage_portrait"
};

export const NPC_TEXTURES: AssetKey[] = ["npc_guard", "npc_merchant", "npc_elder", "npc_villager", "npc_sage"];
