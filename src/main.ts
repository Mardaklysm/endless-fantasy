import Phaser from "phaser";
import { CHARACTER_SPRITES, type CharacterSpriteClass, type CharacterSpriteFrameName } from "./data/characterSprites";
import atlasV3ImageUrl from "./assets/world/atlas_v3.png";
import dungeonAtlasImageUrl from "./assets/world/dungeon_atlas.png";
import pierAtlasImageUrl from "./assets/world/pier_atlas.png";
import worldObjectsImageUrl from "./assets/world/world_objects.png";
import atlasV3Manifest from "./assets/world/atlasV3.manifest.json" with { type: "json" };
import {
  DUNGEON_ATLAS,
  DUNGEON_ATLAS_SOURCE_INSET,
  DUNGEON_TILE_ID_SET,
  DUNGEON_TILE_IDS,
  dungeonAtlasSourceRectWithInset,
  dungeonTileById,
  type DungeonTileId
} from "./data/dungeonTiles.ts";
import {
  WORLD_OBJECT_ATLAS,
  WORLD_OBJECTS,
  worldObjectById,
  type WorldObjectId
} from "./data/worldObjects.ts";
import {
  ATLAS_V3_SOURCE_INSET,
  WORLD_ATLAS,
  WORLD_TILES,
  atlasV3SourceRectWithInset,
  isWorldTileWalkable,
  worldTileEncounterFamily,
  worldTileHasTag,
  type WorldTileDefinition,
  type WorldTileId
} from "./data/worldTiles.ts";
import { generateDungeonFloors } from "./world/dungeonGenerator.ts";
import {
  ACTIVE_WORLDGEN_MODE,
  createWorldSeed,
  generateWorld,
  getIslandAt,
  type GeneratedWorld,
  type IslandId,
  type RoadRotation,
  type WorldRoadVisual,
  type WorldLandmarkKind,
  type WorldPoiKind
} from "./world/worldGenerator.ts";
import "./style.css";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const ASPECT_RATIO = 16 / 9;
const PIXEL_ART_SCALE = 2;
const LAYOUT_WIDTH = DESIGN_WIDTH / PIXEL_ART_SCALE;
const LAYOUT_HEIGHT = DESIGN_HEIGHT / PIXEL_ART_SCALE;
const WIDTH = LAYOUT_WIDTH;
const HEIGHT = LAYOUT_HEIGHT;
const TILE = 32;
const DEBUG_WORLD_LAYOUT = false;
const SAVE_KEY = "crystal-oath-save-v1";
const WORLD_W = 96;
const WORLD_H = 64;
const MOVE_DURATION_MS = 155;
const FAST_MOVE_DURATION_MS = 95;
const MOVE_TILES_PER_MS = 1 / MOVE_DURATION_MS;
const FAST_MOVE_TILES_PER_MS = 1 / FAST_MOVE_DURATION_MS;
const BATTLE_ACTION_DELAY_MS = 0;
const BATTLE_TURN_DELAY_MS = 420;
const WORLD_PLAYER_BASE_SPRITE_WIDTH = 33;
const EXPLORE_PLAYER_SPRITE_WIDTH = WORLD_PLAYER_BASE_SPRITE_WIDTH * 2;
const LANDMARK_FOOTPRINT = 3;

type Mode =
  | "title"
  | "world"
  | "town"
  | "dungeon"
  | "dialogue"
  | "menu"
  | "battle"
  | "gameOver"
  | "ending";

type ExploreMode = "world" | "town" | "dungeon";

type DirectionName = "up" | "down" | "left" | "right";

type Terrain = WorldTileId;

type ElementType =
  | "none"
  | "fire"
  | "ice"
  | "lightning"
  | "earth"
  | "wind"
  | "light"
  | "shadow";

type TargetKind = "enemy" | "ally" | "allEnemies" | "allAllies" | "self";

interface Vec {
  x: number;
  y: number;
}

interface ExploreStep {
  mode: ExploreMode;
  from: Vec;
  to: Vec;
  dir: Vec;
}

interface StatusState {
  poison?: number;
  burn?: number;
  bleed?: number;
  weakness?: number;
  charged?: number;
  sleep?: number;
  silence?: number;
  stun?: number;
  guarded?: number;
  ward?: number;
  starveil?: number;
}

interface CharacterState {
  id: "arlen" | "mira" | "kael";
  name: string;
  role: string;
  level: number;
  xp: number;
  nextXp: number;
  hp: number;
  maxHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  luck: number;
  weapon: string;
  armor: string;
  statuses: StatusState;
  charges: Record<string, { current: number; max: number }>;
  spells: string[];
  skillCooldowns: Record<string, number>;
  defending: boolean;
}

interface ItemDef {
  id: string;
  name: string;
  price: number;
  description: string;
  battle: boolean;
  field: boolean;
}

interface SpellDef {
  id: string;
  name: string;
  caster: "mira" | "kael" | "arlen";
  tier: 1 | 2 | 3;
  target: TargetKind;
  element: ElementType;
  power: number;
  kind: "heal" | "damage" | "buff" | "revive";
  price: number;
  minLevel: number;
  description: string;
}

interface PlayerSkillDef {
  id: string;
  name: string;
  users: CharacterState["id"][] | "all";
  target: "enemy" | "ally" | "self";
  cooldown: number;
  description: string;
}

interface GearDef {
  id: string;
  name: string;
  price: number;
  power: number;
  kind: "weapon" | "armor";
  users: CharacterState["id"][];
  description: string;
}

interface EnemyMove {
  name: string;
  kind: "attack" | "damage" | "status" | "buff" | "defend" | "heal" | "charge" | "steal";
  power: number;
  element?: ElementType;
  status?: keyof StatusState;
  target?: "one" | "all";
  intent?: EnemyIntentKind;
}

type EnemyIntentKind = "attack" | "heavyAttack" | "defend" | "poison" | "heal" | "charge" | "flee" | "summon" | "stealGold";

interface EnemyIntent {
  kind: EnemyIntentKind;
  label: string;
  message: string;
  move: EnemyMove;
}

interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  xp: number;
  gold: number;
  element: ElementType;
  weak: ElementType[];
  resist: ElementType[];
  moves: EnemyMove[];
  drops?: { item: string; chance: number }[];
  palette: string[];
  sprite: "blob" | "beast" | "wing" | "knight" | "serpent" | "crown";
  boss?: boolean;
}

interface EnemyState extends EnemyDef {
  uid: string;
  hp: number;
  statuses: StatusState;
  intent?: EnemyIntent;
}

interface LocationDef {
  id: string;
  name: string;
  kind: WorldPoiKind;
  islandId?: IslandId;
  landmarkKind?: WorldLandmarkKind;
  objectId?: WorldObjectId;
  difficultyTier?: number;
  x: number;
  y: number;
  footprint?: number;
  requires?: () => boolean;
  lockedText?: string;
}

interface TownDef {
  id: string;
  name: string;
  palette: string[];
  npcs: { x: number; y: number; lines: string[] }[];
  itemStock: string[];
  weaponStock: string[];
  armorStock: string[];
  spellStock: string[];
  innPrice: number;
  clinicPrice: number;
  arrival?: () => void;
}

interface DungeonDef {
  id: string;
  name: string;
  relic?: "root" | "flame" | "tide" | "gale";
  boss: string;
  palette: {
    floor: number;
    wall: number;
    accent: number;
    chest: number;
    gate: number;
  };
  encounterTable: string[];
  floors: string[][];
  chestRewards: { id: string; item?: string; gear?: string; gold?: number }[];
  puzzleText: string;
  bossIntro: string[];
  rewardText: string[];
}

interface MenuOption {
  label: string | (() => string);
  action: () => void;
  disabled?: () => boolean;
}

interface ActiveMenu {
  title: string;
  options: MenuOption[];
  selected: number;
  cancel: () => void;
  footer?: string | (() => string);
}

interface Dialogue {
  lines: string[];
  index: number;
  done: () => void;
}

interface BattleAction {
  side: "party" | "enemy";
  actorId: string;
  type: "attack" | "skill" | "spell" | "item" | "defend" | "run" | "skip";
  targetIndex?: number;
  skillId?: string;
  spellId?: string;
  itemId?: string;
}

interface BattleAnimation {
  action: BattleAction;
  elapsed: number;
  duration: number;
  impactAt: number;
  resolved: boolean;
  spent?: boolean;
  targetSide?: "party" | "enemy";
  targetActorId?: string;
}

type BattlePhase = "command" | "target" | "skill" | "spell" | "item" | "allyTarget" | "resolving" | "log";

interface InitiativeEntry {
  side: "party" | "enemy";
  actorId: string;
  initiative: number;
}

interface BattleState {
  kind: "random" | "boss";
  enemies: EnemyState[];
  bossId?: string;
  dungeonId?: string;
  background: AssetKey;
  canRun: boolean;
  phase: BattlePhase;
  turnOrder: InitiativeEntry[];
  turnIndex: number;
  current?: InitiativeEntry;
  actions: BattleAction[];
  selected: number;
  pendingAction?: Partial<BattleAction>;
  animation?: BattleAnimation;
  log: string[];
  actionTimer: number;
  victoryAwarded: boolean;
}

interface TravelDestination {
  destinationIslandId: IslandId;
  displayName: string;
  costGold: number;
  requiredUnlockFlag?: "unlockedIsland2" | "unlockedIsland3";
}

type ServiceKind = "inn" | "item" | "arms" | "magic" | "clinic";

interface TownServiceDef {
  kind: ServiceKind;
  label: string;
  x: number;
  y: number;
  color: number;
  accent: number;
}

const TOWN_SERVICES: TownServiceDef[] = [
  { kind: "inn", label: "Inn", x: 4, y: 3, color: 0xd9eeb8, accent: 0x6f8d5b },
  { kind: "item", label: "Items", x: 7, y: 3, color: 0xf7d58b, accent: 0xb57435 },
  { kind: "arms", label: "Arms", x: 10, y: 3, color: 0xd6d9e8, accent: 0x7c8397 },
  { kind: "magic", label: "Magic", x: 13, y: 3, color: 0xc7a9ff, accent: 0x6f53b8 },
  { kind: "clinic", label: "Clinic", x: 16, y: 3, color: 0xffc1d3, accent: 0xb64c6b }
];

const ASSET_PATHS = [
  ["atlas_v3", "world/atlas_v3.png"],
  ["dungeon_atlas", "world/dungeon_atlas.png"],
  ["pier_atlas", "world/pier_atlas.png"],
  ["world_objects", "world/world_objects.png"],
  ["tile_plains", "tiles/world/plains.png"],
  ["tile_forest", "tiles/world/forest.png"],
  ["tile_hills", "tiles/world/hills.png"],
  ["tile_mountain", "tiles/world/mountain.png"],
  ["tile_water_a", "tiles/world/water_a.png"],
  ["tile_water_b", "tiles/world/water_b.png"],
  ["tile_deep_water_a", "tiles/world/deep_water_a.png"],
  ["tile_deep_water_b", "tiles/world/deep_water_b.png"],
  ["tile_sand", "tiles/world/sand.png"],
  ["tile_road", "tiles/world/road.png"],
  ["tile_bridge", "tiles/world/bridge.png"],
  ["marker_town", "tiles/markers/town.png"],
  ["marker_castle", "tiles/markers/castle.png"],
  ["marker_cave", "tiles/markers/cave.png"],
  ["marker_keep", "tiles/markers/keep.png"],
  ["marker_shrine", "tiles/markers/shrine.png"],
  ["marker_tower", "tiles/markers/tower.png"],
  ["marker_port", "tiles/markers/port.png"],
  ["marker_gate", "tiles/markers/starfall_gate.png"],
  ["marker_final_spire", "tiles/markers/eclipse_spire.png"],
  ["town_floor", "tiles/town/town_floor.png"],
  ["town_wall", "tiles/town/town_wall.png"],
  ["town_exit_gate", "tiles/town/town_exit_gate.png"],
  ["town_service_inn", "tiles/town/service_inn.png"],
  ["town_service_items", "tiles/town/service_items.png"],
  ["town_service_arms", "tiles/town/service_arms.png"],
  ["town_service_magic", "tiles/town/service_magic.png"],
  ["town_service_clinic", "tiles/town/service_clinic.png"],
  ["town_prop_table", "tiles/town/prop_table.png"],
  ["town_prop_crate", "tiles/town/prop_crate.png"],
  ["town_prop_barrel", "tiles/town/prop_barrel.png"],
  ["town_prop_lamp", "tiles/town/prop_lamp.png"],
  ["town_prop_rug", "tiles/town/prop_rug.png"],
  ["dungeon_floor_moss", "tiles/dungeons/floor_moss.png"],
  ["dungeon_floor_fire", "tiles/dungeons/floor_fire.png"],
  ["dungeon_floor_tide", "tiles/dungeons/floor_tide.png"],
  ["dungeon_floor_gale", "tiles/dungeons/floor_gale.png"],
  ["dungeon_floor_eclipse", "tiles/dungeons/floor_eclipse.png"],
  ["dungeon_wall_base", "tiles/dungeons/wall_base.png"],
  ["dungeon_gate_closed", "tiles/dungeons/gate_closed.png"],
  ["dungeon_gate_open", "tiles/dungeons/gate_open.png"],
  ["dungeon_stairs", "tiles/dungeons/stairs.png"],
  ["dungeon_exit", "tiles/dungeons/exit.png"],
  ["chest_closed", "tiles/objects/chest_closed.png"],
  ["chest_open", "tiles/objects/chest_open.png"],
  ["switch_floor", "tiles/objects/switch_floor.png"],
  ["boss_relic_seal", "tiles/objects/boss_relic_seal.png"],
  ["class_fighter_sheet", "characters/classes/fighter_normalized.png"],
  ["class_priest_sheet", "characters/classes/priest_normalized.png"],
  ["class_wizard_sheet", "characters/classes/wizard_normalized.png"],
  ["npc_guard", "characters/npc_guard.png"],
  ["npc_merchant", "characters/npc_merchant.png"],
  ["npc_elder", "characters/npc_elder.png"],
  ["npc_villager", "characters/npc_villager.png"],
  ["npc_sage", "characters/npc_sage.png"],
  ["vehicle_boat", "characters/vehicle_boat.png"],
  ["vehicle_skyship", "characters/vehicle_skyship.png"],
  ["battle_arlen_portrait", "portraits/battle_arlen.png"],
  ["battle_mira_portrait", "portraits/battle_mira.png"],
  ["battle_kael_portrait", "portraits/battle_kael.png"],
  ["battle_bg_forest_path", "battle/backgrounds/forest_path.jpeg"],
  ["battle_bg_plains", "battle/backgrounds/plains.jpeg"],
  ["battle_bg_moss_cave", "battle/backgrounds/moss_cave.jpeg"],
  ["battle_bg_ashen_keep", "battle/backgrounds/ashen_keep.jpeg"],
  ["battle_bg_tide_shrine", "battle/backgrounds/tide_shrine.jpeg"],
  ["battle_bg_eclipse_spire", "battle/backgrounds/eclipse_spire.jpeg"],
  ["enemy_slimebud", "enemies/slimebud.png"],
  ["enemy_bristle_rat", "enemies/bristle_rat.png"],
  ["enemy_field_imp", "enemies/field_imp.png"],
  ["enemy_thorn_wisp", "enemies/thorn_wisp.png"],
  ["enemy_mossling", "enemies/mossling.png"],
  ["enemy_venom_moth", "enemies/venom_moth.png"],
  ["enemy_pebble_gnawer", "enemies/pebble_gnawer.png"],
  ["enemy_cave_bat", "enemies/cave_bat.png"],
  ["enemy_iron_beetle", "enemies/iron_beetle.png"],
  ["enemy_cinder_pup", "enemies/cinder_pup.png"],
  ["enemy_ash_sprite", "enemies/ash_sprite.png"],
  ["enemy_coal_knight", "enemies/coal_knight.png"],
  ["enemy_reef_fang", "enemies/reef_fang.png"],
  ["enemy_bubble_eye", "enemies/bubble_eye.png"],
  ["enemy_drowned_husk", "enemies/drowned_husk.png"],
  ["enemy_sky_mite", "enemies/sky_mite.png"],
  ["enemy_gale_harpy", "enemies/gale_harpy.png"],
  ["enemy_glass_roc", "enemies/glass_roc.png"],
  ["enemy_eclipse_shade", "enemies/eclipse_shade.png"],
  ["enemy_crown_guard", "enemies/crown_guard.png"],
  ["enemy_void_serpent", "enemies/void_serpent.png"],
  ["boss_rootbound_troll", "enemies/boss_rootbound_troll.png"],
  ["boss_ember_tyrant", "enemies/boss_ember_tyrant.png"],
  ["boss_tide_oracle", "enemies/boss_tide_oracle.png"],
  ["boss_gale_chimera", "enemies/boss_gale_chimera.png"],
  ["boss_eclipse_crown", "enemies/boss_eclipse_crown.png"],
  ["ui_window_panel", "ui/window_panel_9slice.png"],
  ["ui_cursor_arrow", "ui/cursor_arrow.png"],
  ["ui_cursor_hand", "ui/cursor_hand.png"],
  ["ui_hp_bar", "ui/bar_hp.png"],
  ["ui_mp_bar", "ui/mp_bar.png"],
  ["ui_status_bar_empty", "ui/bar_empty.png"],
  ["ui_button_ok", "ui/button_ok.png"],
  ["ui_button_back", "ui/button_back.png"],
  ["icon_potion", "icons/items/potion.png"],
  ["icon_antidote", "icons/items/antidote.png"],
  ["icon_phoenix_ash", "icons/items/phoenix_ash.png"],
  ["icon_etherleaf", "icons/items/etherleaf.png"],
  ["icon_tent", "icons/items/tent.png"],
  ["icon_smoke_bomb", "icons/items/smoke_bomb.png"],
  ["icon_weapon_blade", "icons/equipment/weapon_blade.png"],
  ["icon_weapon_rod", "icons/equipment/weapon_rod.png"],
  ["icon_armor_mail", "icons/equipment/armor_mail.png"],
  ["icon_armor_cloak", "icons/equipment/armor_cloak.png"],
  ["icon_relic_root", "icons/relics/root_relic.png"],
  ["icon_relic_flame", "icons/relics/flame_relic.png"],
  ["icon_relic_tide", "icons/relics/tide_relic.png"],
  ["icon_relic_gale", "icons/relics/gale_relic.png"],
  ["fx_hit_slash", "effects/hit_slash.png"],
  ["fx_heal", "effects/heal.png"],
  ["fx_fire", "effects/fire.png"],
  ["fx_ice", "effects/ice.png"],
  ["fx_lightning", "effects/lightning.png"],
  ["fx_earth", "effects/earth.png"],
  ["fx_wind", "effects/wind.png"],
  ["fx_light", "effects/light.png"],
  ["fx_shadow", "effects/shadow.png"],
  ["fx_poison", "effects/poison.png"],
  ["fx_sleep", "effects/sleep.png"],
  ["fx_ward", "effects/ward.png"],
  ["fx_relic_restore", "effects/relic_restore.png"],
  ["title_logo", "title/title_logo.png"],
  ["title_four_crystals", "title/four_star_relics.png"]
] as const;

type AssetKey = (typeof ASSET_PATHS)[number][0];

const ASSET_MODULES = import.meta.glob(["../assets/**/*.{png,jpeg,jpg}", "!../assets/characters/arlen_map.png"], {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

const SRC_ASSET_MODULES = import.meta.glob(
  [
    "./assets/**/*.{png,jpeg,jpg}",
    "!./assets/world/source/**/*.{png,jpeg,jpg}",
    "!./assets/world/world_atlas.normalized.png",
    "!./assets/world/tilesets/**/*.{png,jpeg,jpg}"
  ],
  {
    eager: true,
    query: "?url",
    import: "default"
  }
) as Record<string, string>;

const ASSET_V2_MODULES = import.meta.glob(
  [
    "../assets_v2/**/*.{png,jpeg,jpg}",
    "!../assets_v2/characters/arlen_battle.png",
    "!../assets_v2/characters/arlen_map.png",
    "!../assets_v2/characters/kael_battle.png",
    "!../assets_v2/characters/kael_map.png",
    "!../assets_v2/characters/mira_battle.png",
    "!../assets_v2/characters/mira_map.png",
    "!../assets_v2/previews/**/*.{png,jpeg,jpg}",
    "!../assets_v2/source_sheets/**/*.{png,jpeg,jpg}",
    "!../assets_v2/ui/command_window.png",
    "!../assets_v2/ui/target_window.png",
    "!../assets_v2/ui/party_status_window.png",
    "!../assets_v2/ui/message_window.png"
  ],
  {
    eager: true,
    query: "?url",
    import: "default"
  }
) as Record<string, string>;

const ASSET_V2_PATH_OVERRIDES: Partial<Record<AssetKey, string>> = {
  tile_water_a: "tiles/world/water_shallow.png",
  tile_water_b: "tiles/world/water_shallow.png",
  tile_deep_water_a: "tiles/world/water_deep.png",
  tile_deep_water_b: "tiles/world/water_deep.png",
  battle_arlen_portrait: "portraits/arlen.png",
  battle_mira_portrait: "portraits/mira.png",
  battle_kael_portrait: "portraits/kael.png",
  enemy_slimebud: "enemies/common/slimebud.png",
  enemy_bristle_rat: "enemies/common/bristle_rat.png",
  enemy_field_imp: "enemies/common/field_imp.png",
  enemy_thorn_wisp: "enemies/common/thorn_wisp.png",
  enemy_mossling: "enemies/common/mossling.png",
  enemy_venom_moth: "enemies/common/venom_moth.png",
  enemy_pebble_gnawer: "enemies/common/pebble_gnawer.png",
  enemy_cave_bat: "enemies/common/cave_bat.png",
  enemy_iron_beetle: "enemies/common/iron_beetle.png",
  enemy_cinder_pup: "enemies/common/cinder_pup.png",
  enemy_ash_sprite: "enemies/common/ash_sprite.png",
  enemy_coal_knight: "enemies/common/coal_knight.png",
  boss_rootbound_troll: "enemies/bosses/rootbound_troll.png",
  boss_ember_tyrant: "enemies/bosses/ember_tyrant.png",
  boss_tide_oracle: "enemies/bosses/tide_oracle.png",
  boss_gale_chimera: "enemies/bosses/gale_chimera.png",
  boss_eclipse_crown: "enemies/bosses/eclipse_crown.png",
  ui_window_panel: "ui/window_panel.png",
  ui_hp_bar: "ui/hp_bar.png"
};

const EXPLICIT_ASSET_URLS: Partial<Record<AssetKey, string>> = {
  atlas_v3: atlasV3ImageUrl,
  dungeon_atlas: dungeonAtlasImageUrl,
  pier_atlas: pierAtlasImageUrl,
  world_objects: worldObjectsImageUrl
};

const ASSET_URLS = Object.fromEntries(
  ASSET_PATHS.map(([key, path]) => {
    return [
      key,
      EXPLICIT_ASSET_URLS[key] ??
        ASSET_V2_MODULES[`../assets_v2/${ASSET_V2_PATH_OVERRIDES[key] ?? path}`] ??
        ASSET_MODULES[`../assets/${path}`]
    ];
  })
) as Partial<Record<AssetKey, string>>;

const PIER_ATLAS = {
  textureKey: "pier_atlas",
  columns: 4,
  rows: 4,
  tileWidth: 256,
  tileHeight: 256,
  cells: {
    horizontal: { row: 0, col: 0 },
    vertical: { row: 0, col: 1 }
  }
} as const;

interface DungeonThemeTiles {
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

const DUNGEON_FLOOR_TEXTURES: Record<string, AssetKey> = {
  mossCave: "dungeon_floor_moss",
  ashenKeep: "dungeon_floor_fire",
  tideShrine: "dungeon_floor_tide",
  skyglassTower: "dungeon_floor_gale",
  eclipseSpire: "dungeon_floor_eclipse"
};

const DUNGEON_THEME_TILES: Record<string, DungeonThemeTiles> = {
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

const DEFAULT_DUNGEON_THEME_TILES: DungeonThemeTiles = DUNGEON_THEME_TILES.mossCave;

const TOWN_ATLAS_FLOOR_TILES: DungeonTileId[] = [
  DUNGEON_TILE_IDS.plainGrayStoneFloor,
  DUNGEON_TILE_IDS.crackedGrayStoneFloor,
  DUNGEON_TILE_IDS.mossyStoneFloor,
  DUNGEON_TILE_IDS.stoneFloorDebris,
  DUNGEON_TILE_IDS.stoneFloorDrainageCracks
];

const TOWN_ATLAS_WALL_TILES: DungeonTileId[] = [
  DUNGEON_TILE_IDS.grayStoneWall,
  DUNGEON_TILE_IDS.crackedStoneWall,
  DUNGEON_TILE_IDS.mossyStoneWall,
  DUNGEON_TILE_IDS.torchStoneWall
];

const TOWN_SHOP_PAD_TILES: Record<ServiceKind, DungeonTileId> = {
  inn: DUNGEON_TILE_IDS.mossyStoneFloor,
  item: DUNGEON_TILE_IDS.stoneFloorDebris,
  arms: DUNGEON_TILE_IDS.stoneFloorDrainageCracks,
  magic: DUNGEON_TILE_IDS.stoneFloorMagicMarks,
  clinic: DUNGEON_TILE_IDS.plainGrayStoneFloor
};

const LOCATION_TEXTURES: Record<string, AssetKey> = {
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

const TOWN_SERVICE_TEXTURES: Record<ServiceKind, AssetKey> = {
  inn: "town_service_inn",
  item: "town_service_items",
  arms: "town_service_arms",
  magic: "town_service_magic",
  clinic: "town_service_clinic"
};

const TOWN_PROP_TEXTURES = {
  table: "town_prop_table",
  crate: "town_prop_crate",
  barrel: "town_prop_barrel",
  lamp: "town_prop_lamp",
  rug: "town_prop_rug"
} as const satisfies Record<string, AssetKey>;

const CHARACTER_CLASS_TEXTURES: Record<CharacterSpriteClass, AssetKey> = {
  fighter: "class_fighter_sheet",
  priest: "class_priest_sheet",
  wizard: "class_wizard_sheet"
};

const PARTY_CLASS: Record<CharacterState["id"], CharacterSpriteClass> = {
  arlen: "fighter",
  mira: "priest",
  kael: "wizard"
};

const ENEMY_TEXTURES: Record<string, AssetKey> = {
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

const PORTRAIT_TEXTURES: Record<CharacterState["id"], AssetKey> = {
  arlen: "battle_arlen_portrait",
  mira: "battle_mira_portrait",
  kael: "battle_kael_portrait"
};

const NPC_TEXTURES: AssetKey[] = ["npc_guard", "npc_merchant", "npc_elder", "npc_villager", "npc_sage"];

const TILE_FRAME = 16;
const LAYER_WORLD_IMAGE = 1;
const LAYER_OBJECT_IMAGE = 2;
const LAYER_CHARACTER_IMAGE = 3;
const LAYER_BATTLE_IMAGE = 4;
const LAYER_UI_GRAPHICS = 10;
const LAYER_UI_IMAGE = 12;
const LAYER_TEXT = 20;

const ITEMS: Record<string, ItemDef> = {
  potion: {
    id: "potion",
    name: "Potion",
    price: 12,
    description: "Restores 35 HP.",
    battle: true,
    field: true
  },
  antidote: {
    id: "antidote",
    name: "Antidote",
    price: 10,
    description: "Cures poison.",
    battle: true,
    field: true
  },
  phoenixAsh: {
    id: "phoenixAsh",
    name: "Phoenix Ash",
    price: 55,
    description: "Revives an ally with partial HP.",
    battle: true,
    field: true
  },
  etherleaf: {
    id: "etherleaf",
    name: "Etherleaf",
    price: 65,
    description: "Restores one charge to every spell tier.",
    battle: true,
    field: true
  },
  tent: {
    id: "tent",
    name: "Tent",
    price: 90,
    description: "Field rest, partial heal, and save.",
    battle: false,
    field: true
  },
  smokeBomb: {
    id: "smokeBomb",
    name: "Smoke Bomb",
    price: 35,
    description: "Escapes most battles.",
    battle: true,
    field: false
  },
  charteredCompass: {
    id: "charteredCompass",
    name: "Chartered Compass",
    price: 0,
    description: "A harbor charter that opens routes to harsher seas.",
    battle: false,
    field: false
  }
};

const SPELLS: Record<string, SpellDef> = {
  mend: {
    id: "mend",
    name: "Mend",
    caster: "mira",
    tier: 1,
    target: "ally",
    element: "light",
    power: 34,
    kind: "heal",
    price: 45,
    minLevel: 1,
    description: "Heal one ally."
  },
  ward: {
    id: "ward",
    name: "Ward",
    caster: "mira",
    tier: 1,
    target: "ally",
    element: "light",
    power: 3,
    kind: "buff",
    price: 55,
    minLevel: 1,
    description: "Raise defense in battle."
  },
  glow: {
    id: "glow",
    name: "Glow",
    caster: "mira",
    tier: 1,
    target: "enemy",
    element: "light",
    power: 26,
    kind: "damage",
    price: 70,
    minLevel: 2,
    description: "Light damage to one foe."
  },
  mendall: {
    id: "mendall",
    name: "Mendall",
    caster: "mira",
    tier: 2,
    target: "allAllies",
    element: "light",
    power: 30,
    kind: "heal",
    price: 140,
    minLevel: 4,
    description: "Heal the whole party."
  },
  revive: {
    id: "revive",
    name: "Revive",
    caster: "mira",
    tier: 2,
    target: "ally",
    element: "light",
    power: 0,
    kind: "revive",
    price: 190,
    minLevel: 5,
    description: "Revive a fallen ally."
  },
  starveil: {
    id: "starveil",
    name: "Starveil",
    caster: "mira",
    tier: 3,
    target: "allAllies",
    element: "light",
    power: 0,
    kind: "buff",
    price: 300,
    minLevel: 8,
    description: "Reduce party damage for a few rounds."
  },
  spark: {
    id: "spark",
    name: "Spark",
    caster: "kael",
    tier: 1,
    target: "enemy",
    element: "lightning",
    power: 28,
    kind: "damage",
    price: 45,
    minLevel: 1,
    description: "Lightning damage to one foe."
  },
  ember: {
    id: "ember",
    name: "Ember",
    caster: "kael",
    tier: 1,
    target: "enemy",
    element: "fire",
    power: 30,
    kind: "damage",
    price: 50,
    minLevel: 1,
    description: "Fire damage to one foe."
  },
  frost: {
    id: "frost",
    name: "Frost",
    caster: "kael",
    tier: 1,
    target: "enemy",
    element: "ice",
    power: 30,
    kind: "damage",
    price: 70,
    minLevel: 2,
    description: "Ice damage to one foe."
  },
  quakelet: {
    id: "quakelet",
    name: "Quakelet",
    caster: "kael",
    tier: 2,
    target: "allEnemies",
    element: "earth",
    power: 24,
    kind: "damage",
    price: 150,
    minLevel: 4,
    description: "Earth damage to all foes."
  },
  storm: {
    id: "storm",
    name: "Storm",
    caster: "kael",
    tier: 2,
    target: "allEnemies",
    element: "wind",
    power: 29,
    kind: "damage",
    price: 190,
    minLevel: 6,
    description: "Wind damage to all foes."
  },
  nova: {
    id: "nova",
    name: "Nova",
    caster: "kael",
    tier: 3,
    target: "enemy",
    element: "none",
    power: 74,
    kind: "damage",
    price: 330,
    minLevel: 8,
    description: "Heavy non-elemental damage."
  },
  rally: {
    id: "rally",
    name: "Rally",
    caster: "arlen",
    tier: 2,
    target: "allAllies",
    element: "none",
    power: 0,
    kind: "buff",
    price: 0,
    minLevel: 7,
    description: "Raise the party's guard."
  }
};

const PLAYER_SKILLS: Record<string, PlayerSkillDef> = {
  powerStrike: {
    id: "powerStrike",
    name: "Power Strike",
    users: ["arlen"],
    target: "enemy",
    cooldown: 2,
    description: "Heavy weapon damage."
  },
  guardBreak: {
    id: "guardBreak",
    name: "Guard Break",
    users: ["arlen"],
    target: "enemy",
    cooldown: 3,
    description: "Damage and weaken defense."
  },
  quickSlash: {
    id: "quickSlash",
    name: "Quick Slash",
    users: ["arlen"],
    target: "enemy",
    cooldown: 1,
    description: "Fast cut with better crit odds."
  },
  firstAid: {
    id: "firstAid",
    name: "First Aid",
    users: ["mira"],
    target: "ally",
    cooldown: 3,
    description: "Small heal without charges."
  },
  fireSpark: {
    id: "fireSpark",
    name: "Fire Spark",
    users: ["kael"],
    target: "enemy",
    cooldown: 2,
    description: "Fire damage with a burn chance."
  },
  focus: {
    id: "focus",
    name: "Focus",
    users: "all",
    target: "self",
    cooldown: 4,
    description: "Guard and recover a spell charge."
  }
};

const WEAPONS: Record<string, GearDef> = {
  trainingBlade: {
    id: "trainingBlade",
    name: "Training Blade",
    price: 0,
    power: 2,
    kind: "weapon",
    users: ["arlen"],
    description: "A plain Greenhaven sword."
  },
  ironSaber: {
    id: "ironSaber",
    name: "Iron Saber",
    price: 95,
    power: 6,
    kind: "weapon",
    users: ["arlen"],
    description: "Reliable steel edge."
  },
  starbrand: {
    id: "starbrand",
    name: "Starbrand",
    price: 0,
    power: 13,
    kind: "weapon",
    users: ["arlen"],
    description: "A treasure blade set with pale gems."
  },
  willowRod: {
    id: "willowRod",
    name: "Willow Rod",
    price: 0,
    power: 1,
    kind: "weapon",
    users: ["mira", "kael"],
    description: "A light spell focus."
  },
  glassWand: {
    id: "glassWand",
    name: "Glass Wand",
    price: 120,
    power: 4,
    kind: "weapon",
    users: ["mira", "kael"],
    description: "A bright wand for sages."
  },
  emberStaff: {
    id: "emberStaff",
    name: "Ember Staff",
    price: 0,
    power: 8,
    kind: "weapon",
    users: ["kael"],
    description: "Warm even in rain."
  }
};

const ARMORS: Record<string, GearDef> = {
  travelCloth: {
    id: "travelCloth",
    name: "Travel Cloth",
    price: 0,
    power: 1,
    kind: "armor",
    users: ["arlen", "mira", "kael"],
    description: "Simple road clothes."
  },
  ringMail: {
    id: "ringMail",
    name: "Ring Mail",
    price: 90,
    power: 4,
    kind: "armor",
    users: ["arlen"],
    description: "Flexible front-line armor."
  },
  sageMantle: {
    id: "sageMantle",
    name: "Sage Mantle",
    price: 85,
    power: 3,
    kind: "armor",
    users: ["mira", "kael"],
    description: "Light, warded cloth."
  },
  tidePlate: {
    id: "tidePlate",
    name: "Tide Plate",
    price: 0,
    power: 8,
    kind: "armor",
    users: ["arlen"],
    description: "Armor with a wave-like sheen."
  },
  galeCloak: {
    id: "galeCloak",
    name: "Gale Cloak",
    price: 0,
    power: 7,
    kind: "armor",
    users: ["mira", "kael"],
    description: "Moves before the wind does."
  }
};

const GEAR: Record<string, GearDef> = { ...WEAPONS, ...ARMORS };

const ENEMIES: Record<string, EnemyDef> = {
  slimebud: enemy("slimebud", "Slimebud", 22, 7, 1, 3, 9, 7, "earth", ["fire"], [], ["#579e54", "#83d078", "#e7ffe2"], "blob"),
  bristleRat: enemy("bristleRat", "Bristle Rat", 18, 8, 1, 6, 8, 8, "none", ["fire"], [], ["#665044", "#b98f68", "#fff0c9"], "beast"),
  greenWolf: enemy("greenWolf", "Green Wolf", 30, 11, 2, 12, 18, 16, "none", ["fire"], [], ["#31553a", "#84b86f", "#f6efc9"], "beast", [
    { name: "Pounce", kind: "damage", power: 8, status: "bleed", intent: "heavyAttack" }
  ]),
  bandit: enemy("bandit", "Bandit", 34, 12, 3, 8, 20, 24, "none", ["light"], [], ["#3d2a24", "#9c6a3d", "#ffe0a3"], "knight", [
    { name: "Dirty Cut", kind: "damage", power: 5, status: "bleed", intent: "attack" },
    { name: "Snatch Purse", kind: "steal", power: 8, intent: "stealGold" }
  ]),
  reefCrab: enemy("reefCrab", "Reef Crab", 44, 13, 9, 3, 34, 34, "ice", ["lightning", "fire"], ["ice"], ["#25566b", "#e08866", "#fff0bd"], "blob", [
    { name: "Shell Up", kind: "defend", power: 0, intent: "defend" }
  ]),
  pirate: enemy("pirate", "Pirate", 58, 17, 6, 9, 48, 58, "none", ["lightning"], [], ["#252031", "#c05b39", "#f2e3a4"], "knight", [
    { name: "Broadside", kind: "damage", power: 13, target: "all", intent: "heavyAttack" },
    { name: "Cutpurse", kind: "steal", power: 14, intent: "stealGold" }
  ]),
  jungleShaman: enemy("jungleShaman", "Jungle Shaman", 46, 13, 4, 10, 52, 44, "earth", ["fire"], ["earth"], ["#1b4932", "#62b66c", "#f0f6ad"], "crown", [
    { name: "Venom Chant", kind: "status", power: 5, status: "poison", target: "all", intent: "poison" },
    { name: "Moss Mend", kind: "heal", power: 24, intent: "heal" }
  ]),
  ashGolem: enemy("ashGolem", "Ash Golem", 78, 21, 14, 3, 82, 76, "fire", ["ice"], ["fire"], ["#211f22", "#8a6a55", "#ff8f3d"], "knight", [
    { name: "Gather Heat", kind: "charge", power: 10, intent: "charge" },
    { name: "Molten Slam", kind: "damage", power: 18, status: "burn", intent: "heavyAttack" }
  ]),
  seaSerpent: enemy("seaSerpent", "Sea Serpent", 72, 20, 7, 12, 74, 80, "ice", ["lightning"], ["ice"], ["#103c58", "#3ea6c9", "#d8ffff"], "serpent", [
    { name: "Venom Tide", kind: "status", power: 7, status: "poison", intent: "poison" },
    { name: "Coil Charge", kind: "charge", power: 9, intent: "charge" }
  ]),
  fieldImp: enemy("fieldImp", "Field Imp", 24, 9, 2, 7, 12, 11, "shadow", ["light"], ["shadow"], ["#5a3c84", "#b16ee4", "#f7df8a"], "beast", [
    { name: "Drowsy Pinch", kind: "status", power: 4, status: "sleep" }
  ]),
  thornWisp: enemy("thornWisp", "Thorn Wisp", 28, 10, 2, 8, 16, 14, "earth", ["fire"], ["earth"], ["#264d38", "#6bad57", "#d1ffc2"], "wing"),
  mossling: enemy("mossling", "Mossling", 34, 11, 4, 4, 18, 16, "earth", ["fire"], ["earth"], ["#315d35", "#78a95f", "#c9e87a"], "blob"),
  venomMoth: enemy("venomMoth", "Venom Moth", 25, 9, 2, 10, 20, 18, "wind", ["lightning"], ["earth"], ["#3d3358", "#a5dc65", "#f6ffc0"], "wing", [
    { name: "Poison Dust", kind: "status", power: 4, status: "poison", target: "all" }
  ]),
  pebbleGnawer: enemy("pebbleGnawer", "Pebble Gnawer", 32, 12, 5, 4, 22, 18, "earth", ["ice"], ["earth"], ["#574b3c", "#91806a", "#e1d4c1"], "beast"),
  caveBat: enemy("caveBat", "Cave Bat", 24, 10, 2, 12, 20, 17, "wind", ["lightning"], ["earth"], ["#24243d", "#766aa8", "#e2d9ff"], "wing"),
  ironBeetle: enemy("ironBeetle", "Iron Beetle", 38, 13, 7, 3, 25, 22, "earth", ["lightning"], ["earth"], ["#282d35", "#7f8d93", "#d7f3ff"], "knight"),
  cinderPup: enemy("cinderPup", "Cinder Pup", 42, 15, 5, 8, 34, 30, "fire", ["ice"], ["fire"], ["#4b1e18", "#d95832", "#ffce78"], "beast", [
    { name: "Cinder Snap", kind: "damage", power: 9, element: "fire" }
  ]),
  ashSprite: enemy("ashSprite", "Ash Sprite", 36, 13, 4, 11, 36, 34, "fire", ["ice"], ["fire"], ["#312842", "#d56c5c", "#ffd47d"], "wing", [
    { name: "Ash Flicker", kind: "damage", power: 12, element: "fire", target: "all" }
  ]),
  coalKnight: enemy("coalKnight", "Coal Knight", 52, 17, 8, 5, 44, 42, "fire", ["ice"], ["fire"], ["#18151d", "#74504a", "#ff7c3f"], "knight"),
  reefFang: enemy("reefFang", "Reef Fang", 48, 16, 6, 8, 42, 39, "ice", ["lightning"], ["ice"], ["#143b5f", "#3488b8", "#b8f8ff"], "beast"),
  bubbleEye: enemy("bubbleEye", "Bubble Eye", 39, 14, 4, 12, 43, 41, "ice", ["lightning"], ["ice"], ["#123d50", "#5ed2d8", "#f9ffff"], "blob", [
    { name: "Sleep Glare", kind: "status", power: 5, status: "sleep" }
  ]),
  drownedHusk: enemy("drownedHusk", "Drowned Husk", 55, 17, 7, 4, 48, 45, "shadow", ["light", "lightning"], ["ice"], ["#16383d", "#66888a", "#dce9df"], "knight"),
  skyMite: enemy("skyMite", "Sky Mite", 45, 17, 5, 14, 52, 48, "wind", ["lightning"], ["earth"], ["#273857", "#6ec1d9", "#f6ffff"], "wing"),
  galeHarpy: enemy("galeHarpy", "Gale Harpy", 56, 18, 6, 16, 60, 55, "wind", ["lightning"], ["earth"], ["#33415f", "#c59bdc", "#fff3b6"], "wing", [
    { name: "Screech", kind: "status", power: 4, status: "sleep", target: "all" }
  ]),
  glassRoc: enemy("glassRoc", "Glass Roc", 70, 20, 8, 10, 72, 64, "wind", ["lightning"], ["wind"], ["#1b3445", "#8de7ff", "#ffffff"], "wing"),
  eclipseShade: enemy("eclipseShade", "Eclipse Shade", 70, 22, 8, 12, 86, 80, "shadow", ["light"], ["shadow"], ["#161025", "#6d54a8", "#f4e8ff"], "blob", [
    { name: "Night Pulse", kind: "damage", power: 14, element: "shadow", target: "all" }
  ]),
  crownGuard: enemy("crownGuard", "Crown Guard", 88, 24, 12, 8, 94, 88, "shadow", ["light"], ["shadow"], ["#221621", "#8d668d", "#ffd76a"], "knight"),
  voidSerpent: enemy("voidSerpent", "Void Serpent", 82, 25, 9, 14, 104, 92, "shadow", ["light"], ["shadow"], ["#05070d", "#4e437f", "#c5ffe8"], "serpent", [
    { name: "Venom Star", kind: "status", power: 7, status: "poison" },
    { name: "Void Bite", kind: "damage", power: 18, element: "shadow" }
  ]),
  rootboundTroll: boss("rootboundTroll", "Rootbound Troll", 150, 17, 8, 5, 130, 90, "earth", ["fire"], ["earth"], ["#263b25", "#6aa753", "#d9ffae"], "beast", [
    { name: "Root Snare", kind: "status", power: 5, status: "sleep" },
    { name: "Stone Fist", kind: "damage", power: 15, element: "earth" }
  ]),
  emberTyrant: boss("emberTyrant", "Ember Tyrant", 220, 22, 10, 8, 210, 150, "fire", ["ice"], ["fire"], ["#3b1715", "#e45136", "#ffd15d"], "knight", [
    { name: "Flame Wall", kind: "damage", power: 18, element: "fire", target: "all" },
    { name: "Scorching Blade", kind: "damage", power: 22, element: "fire" }
  ]),
  tideOracle: boss("tideOracle", "Tide Oracle", 240, 21, 11, 10, 240, 165, "ice", ["lightning"], ["ice"], ["#0d3e5c", "#43b9d1", "#dbffff"], "crown", [
    { name: "Tideglass", kind: "damage", power: 20, element: "ice", target: "all" },
    { name: "Drowse Tide", kind: "status", power: 5, status: "sleep", target: "all" }
  ]),
  galeChimera: boss("galeChimera", "Gale Chimera", 285, 25, 12, 16, 310, 210, "wind", ["lightning"], ["wind"], ["#29334f", "#79e5dc", "#f8f6a9"], "wing", [
    { name: "Threefold Gale", kind: "damage", power: 21, element: "wind", target: "all" },
    { name: "Raking Horns", kind: "damage", power: 26, element: "none" }
  ]),
  eclipseCrown: boss("eclipseCrown", "Eclipse Crown", 430, 29, 14, 13, 0, 0, "shadow", ["light"], ["shadow"], ["#0a0610", "#543081", "#ffdf6d"], "crown", [
    { name: "Eclipse Edict", kind: "damage", power: 25, element: "shadow", target: "all" },
    { name: "Crownbreak", kind: "damage", power: 30, element: "shadow" },
    { name: "Black Lullaby", kind: "status", power: 6, status: "sleep", target: "all" }
  ])
};

function enemy(
  id: string,
  name: string,
  maxHp: number,
  attack: number,
  defense: number,
  speed: number,
  xp: number,
  gold: number,
  element: ElementType,
  weak: ElementType[],
  resist: ElementType[],
  palette: string[],
  sprite: EnemyDef["sprite"],
  moves: EnemyMove[] = []
): EnemyDef {
  return {
    id,
    name,
    maxHp,
    attack,
    defense,
    speed,
    xp,
    gold,
    element,
    weak,
    resist,
    palette,
    sprite,
    moves: [{ name: "Strike", kind: "attack", power: 0 }, ...moves]
  };
}

function boss(
  id: string,
  name: string,
  maxHp: number,
  attack: number,
  defense: number,
  speed: number,
  xp: number,
  gold: number,
  element: ElementType,
  weak: ElementType[],
  resist: ElementType[],
  palette: string[],
  sprite: EnemyDef["sprite"],
  moves: EnemyMove[]
): EnemyDef {
  return { ...enemy(id, name, maxHp, attack, defense, speed, xp, gold, element, weak, resist, palette, sprite, moves), boss: true };
}

const WORLD_TABLES: Record<string, string[]> = {
  plains: ["slimebud", "greenWolf", "bandit"],
  forest: ["greenWolf", "thornWisp", "venomMoth", "jungleShaman"],
  hills: ["pebbleGnawer", "caveBat", "ironBeetle"],
  sand: ["reefCrab", "pirate", "cinderPup"],
  water: ["reefFang", "reefCrab", "seaSerpent"],
  final: ["ashGolem", "coalKnight", "eclipseShade", "voidSerpent"]
};

class SynthAudio {
  private ctx?: AudioContext;
  private muted = false;
  private timer?: number;
  private step = 0;
  private mode: "title" | "world" | "battle" | "dungeon" | "ending" = "title";

  setMuted(value: boolean) {
    this.muted = value;
  }

  start() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();
    this.timer = window.setInterval(() => this.tickLoop(), 220);
  }

  setMode(mode: SynthAudio["mode"]) {
    this.mode = mode;
  }

  blip(kind: "confirm" | "cancel" | "hit" | "spell" | "victory" | "error") {
    if (this.muted) return;
    this.start();
    const base = {
      confirm: 660,
      cancel: 240,
      hit: 130,
      spell: 880,
      victory: 1040,
      error: 110
    }[kind];
    this.tone(base, kind === "victory" ? 0.16 : 0.07, kind === "hit" ? "square" : "triangle", 0.08);
  }

  private tickLoop() {
    if (this.muted || !this.ctx) return;
    const patterns = {
      title: [392, 0, 494, 0, 587, 523, 494, 0],
      world: [262, 330, 392, 330, 440, 392, 330, 294],
      battle: [196, 247, 294, 349, 294, 247, 220, 247],
      dungeon: [165, 0, 196, 0, 220, 196, 185, 0],
      ending: [392, 523, 659, 784, 659, 523, 494, 587]
    } as const;
    const note = patterns[this.mode][this.step % 8];
    this.step += 1;
    if (note) this.tone(note, 0.12, this.mode === "battle" ? "square" : "sine", 0.025);
  }

  private tone(freq: number, length: number, type: OscillatorType, gainValue: number) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + length);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + length);
  }
}

class CrystalOathScene extends Phaser.Scene {
  private g!: Phaser.GameObjects.Graphics;
  private ui!: Phaser.GameObjects.Graphics;
  private texts: Phaser.GameObjects.Text[] = [];
  private images: Phaser.GameObjects.Image[] = [];
  private mode: Mode = "title";
  private titleOptions = ["New Game", "Load Game", "Controls"];
  private titleSelected = 0;
  private menu?: ActiveMenu;
  private dialogue?: Dialogue;
  private battle?: BattleState;
  private audio = new SynthAudio();
  private generatedWorld?: GeneratedWorld;
  private roadVisualsByKey = new Map<string, WorldRoadVisual>();
  private worldSeed = "title-preview";
  private world: Terrain[][] = [];
  private worldTerrainCacheKey = "world_terrain_cache";
  private worldTerrainCacheSeed = "";
  private party: CharacterState[] = [];
  private inventory: Record<string, number> = {};
  private gearBag: Record<string, number> = {};
  private gold = 0;
  private worldPos: Vec = { x: 10, y: 22 };
  private townPos: Vec = { x: 10, y: 12 };
  private dungeonPos: Vec = { x: 1, y: 1 };
  private visualWorldPos: Vec = { x: 10, y: 22 };
  private visualTownPos: Vec = { x: 10, y: 12 };
  private visualDungeonPos: Vec = { x: 1, y: 1 };
  private currentTown = "dawnford";
  private currentDungeon = "mossCave";
  private currentIslandId: IslandId = "greenhaven";
  private dungeonFloor = 0;
  private previousMode: Mode = "world";
  private pendingTownReturn: Vec = { x: 10, y: 22 };
  private encounterCounter = 10;
  private flags = {
    relics: { root: false, flame: false, tide: false, gale: false },
    boat: false,
    skyship: false,
    gateOpen: false,
    introSeen: false,
    travel: {
      visitedIsland2: false,
      visitedIsland3: false,
      unlockedIsland2: true,
      unlockedIsland3: false
    }
  };
  private openedChests = new Set<string>();
  private discoveredPois = new Set<string>();
  private puzzleFlags = new Set<string>();
  private defeatedBosses = new Set<string>();
  private clearedDungeons = new Set<string>();
  private settings = {
    encounters: true,
    xpMultiplier: 1,
    fastText: false,
    muted: false
  };
  private dirty = true;
  private lastStepFrame = 0;
  private lastMoveDir: Vec = { x: 0, y: 1 };
  private heldDirections: DirectionName[] = [];
  private shiftHeld = false;
  private blockedMoveCooldown = 0;
  private walkAnimElapsed = 0;
  private playerMoving = false;
  private activeStep?: ExploreStep;
  private worldTilesetValidated = false;

  constructor() {
    super("CrystalOathScene");
  }

  preload() {
    for (const [key, url] of Object.entries(ASSET_URLS) as [AssetKey, string | undefined][]) {
      if (url) this.load.image(key, url);
    }
  }

  create() {
    this.g = this.add.graphics();
    this.g.setDepth(0);
    this.ui = this.add.graphics();
    this.ui.setDepth(LAYER_UI_GRAPHICS);
    this.configureRenderResolution();
    this.logActiveWorldTileset();
    this.buildWorldFromSeed(this.worldSeed);
    this.configureTextureFiltering();
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => this.handleKey(event));
    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => this.handleKeyUp(event));
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer));
    this.draw();
  }

  private configureRenderResolution() {
    this.cameras.main.roundPixels = true;
    this.g.setScale(PIXEL_ART_SCALE);
    this.ui.setScale(PIXEL_ART_SCALE);
  }

  private logActiveWorldTileset() {
    if (!import.meta.env.DEV) return;
    console.info(
      [
        "Active world tileset: atlas_v3",
        `Worldgen mode: ${ACTIVE_WORLDGEN_MODE}`,
        "Grid: 8x8",
        "Using empty cells: false",
        "Using classic special tileset: false",
        "Using old 10x10 atlas: false",
        `Atlas v3 source inset: ${ATLAS_V3_SOURCE_INSET}`,
        "Terrain cache postprocess: disabled",
        `Image: ${WORLD_ATLAS.image}`,
        `Manifest: ${WORLD_ATLAS.manifest}`,
        `Manifest entries: ${Object.keys(atlasV3Manifest.tiles ?? {}).length} non-empty tiles`,
        `Object overlay atlas: ${WORLD_OBJECT_ATLAS.image}`,
        `Object overlay entries: ${Object.keys(WORLD_OBJECTS).length}`,
        `Dungeon atlas: ${DUNGEON_ATLAS.image}`,
        `Dungeon atlas source inset: ${DUNGEON_ATLAS_SOURCE_INSET}`,
        `Dungeon atlas entries: ${DUNGEON_TILE_ID_SET.size}`
      ].join("\n")
    );
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta, 50);
    this.updateMovement(dt);
    this.updateBattleFlow(dt);
    if (this.dirty) this.draw();
  }

  private handleKey(event: KeyboardEvent) {
    this.audio.start();
    if (this.isGameControlKey(event)) event.preventDefault();
    this.shiftHeld = event.shiftKey || event.code === "ShiftLeft" || event.code === "ShiftRight";
    const directionName = directionNameForEvent(event);
    if (directionName && this.isExploreMode(this.mode)) {
      this.rememberHeldDirection(directionName);
    }
    if (event.code === "KeyM") {
      this.settings.muted = !this.settings.muted;
      this.audio.setMuted(this.settings.muted);
      this.markDirty();
      return;
    }
    if (event.code === "KeyF") {
      if (this.scale.isFullscreen) this.scale.stopFullscreen();
      else this.scale.startFullscreen();
      return;
    }
    if (event.code === "F9" && this.mode !== "battle") {
      this.openDebugMenu();
      return;
    }

    if (this.mode === "title") this.handleTitle(event);
    else if (this.mode === "dialogue") this.handleDialogue(event);
    else if (this.mode === "menu") this.handleMenu(event);
    else if (this.mode === "battle") this.handleBattle(event);
    else if (this.mode === "gameOver") this.handleGameOver(event);
    else if (this.mode === "ending") this.handleEnding(event);
    else this.handleExplore(event);
  }

  private handleKeyUp(event: KeyboardEvent) {
    if (this.isGameControlKey(event)) event.preventDefault();
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") this.shiftHeld = event.shiftKey;
    const directionName = directionNameForEvent(event);
    if (!directionName) return;
    this.heldDirections = this.heldDirections.filter((dir) => dir !== directionName);
  }

  private isGameControlKey(event: KeyboardEvent): boolean {
    return (
      !!directionNameForEvent(event) ||
      isConfirm(event) ||
      isCancel(event) ||
      event.code === "KeyM" ||
      event.code === "KeyF" ||
      event.code === "F9"
    );
  }

  private rememberHeldDirection(direction: DirectionName) {
    this.heldDirections = this.heldDirections.filter((dir) => dir !== direction);
    this.heldDirections.push(direction);
  }

  private handleTitle(event: KeyboardEvent) {
    if (isUp(event)) this.adjustTitle(-1);
    else if (isDown(event)) this.adjustTitle(1);
    else if (isConfirm(event)) this.confirmTitleSelection();
    this.markDirty();
  }

  private handlePointer(pointer: Phaser.Input.Pointer) {
    this.audio.start();
    const point = this.pointerToLayout(pointer);
    if (this.mode === "title" && this.handleTitlePointer(point)) return;
    this.audio.blip("confirm");
  }

  private pointerToLayout(pointer: Phaser.Input.Pointer): Vec {
    return { x: pointer.x / PIXEL_ART_SCALE, y: pointer.y / PIXEL_ART_SCALE };
  }

  private handleTitlePointer(point: Vec): boolean {
    const optionIndex = this.titleOptions.findIndex((_, idx) => {
      const rowY = 332 + idx * 34;
      return Math.abs(point.x - WIDTH / 2) <= 180 && point.y >= rowY - 8 && point.y <= rowY + 28;
    });
    if (optionIndex < 0) return false;
    this.titleSelected = optionIndex;
    const option = this.titleOptions[this.titleSelected];
    if (option === "Load Game" && !localStorage.getItem(SAVE_KEY)) {
      this.audio.blip("error");
      this.markDirty();
      return true;
    }
    this.confirmTitleSelection();
    this.markDirty();
    return true;
  }

  private confirmTitleSelection() {
    const option = this.titleOptions[this.titleSelected];
    this.audio.blip("confirm");
    if (option === "New Game") this.newGame();
    if (option === "Load Game") {
      if (!this.loadGame()) this.flashMessage("No save found.");
    }
    if (option === "Controls") this.showControls("title");
  }

  private handleGameOver(event: KeyboardEvent) {
    if (isConfirm(event)) {
      if (!this.loadGame()) {
        this.mode = "title";
        this.audio.setMode("title");
      }
      this.markDirty();
    } else if (isCancel(event)) {
      this.mode = "title";
      this.audio.setMode("title");
      this.markDirty();
    }
  }

  private handleEnding(event: KeyboardEvent) {
    if (isConfirm(event) || isCancel(event)) {
      this.mode = "title";
      this.audio.setMode("title");
      this.markDirty();
    }
  }

  private handleDialogue(event: KeyboardEvent) {
    if (!isConfirm(event) && !isCancel(event)) return;
    if (!this.dialogue) return;
    this.audio.blip("confirm");
    if (this.dialogue.index < this.dialogue.lines.length - 1) {
      this.dialogue.index += 1;
    } else {
      const done = this.dialogue.done;
      this.dialogue = undefined;
      done();
    }
    this.markDirty();
  }

  private handleMenu(event: KeyboardEvent) {
    if (!this.menu) return;
    if (isUp(event)) this.adjustMenu(-1);
    else if (isDown(event)) this.adjustMenu(1);
    else if (isCancel(event)) {
      this.audio.blip("cancel");
      this.menu.cancel();
    } else if (isConfirm(event)) {
      const option = this.menu.options[this.menu.selected];
      if (!option || option.disabled?.()) {
        this.audio.blip("error");
      } else {
        this.audio.blip("confirm");
        option.action();
      }
    }
    this.markDirty();
  }

  private handleExplore(event: KeyboardEvent) {
    if (this.activeStep) return;
    if (isCancel(event)) {
      this.clearHeldMovement();
      this.openMainMenu();
      return;
    }
    if (isConfirm(event)) {
      this.interact();
      return;
    }
    const dir = keyDirection(event);
    if (!dir) return;
    this.lastMoveDir = { ...dir };
    this.markDirty();
  }

  private handleBattle(event: KeyboardEvent) {
    if (!this.battle) return;
    if (this.battle.phase === "resolving") return;
    if (this.battle.phase === "log") {
      if (isConfirm(event) || isCancel(event)) {
        this.advanceBattleLog();
      }
      this.markDirty();
      return;
    }
    if (isUp(event)) this.adjustBattleSelection(-1);
    else if (isDown(event)) this.adjustBattleSelection(1);
    else if (isLeft(event)) this.adjustBattleSelection(-1);
    else if (isRight(event)) this.adjustBattleSelection(1);
    else if (isCancel(event)) this.cancelBattleSubmenu();
    else if (isConfirm(event)) this.confirmBattleSelection();
    this.markDirty();
  }

  private buildWorldFromSeed(seed: string) {
    this.generatedWorld = generateWorld({ seed, width: WORLD_W, height: WORLD_H });
    this.worldSeed = this.generatedWorld.seed;
    this.world = this.generatedWorld.tiles;
    this.roadVisualsByKey = new Map(this.generatedWorld.roadVisuals.map((visual) => [`${visual.x},${visual.y}`, visual]));
    this.rebuildWorldTerrainCache();
    console.info(`Crystal Oath world seed: ${this.worldSeed}`);
  }

  private newGame() {
    this.party = [
      this.makeCharacter("arlen", "Arlen", "Vanguard", 42, 9, 7, 5, 4, "trainingBlade", "travelCloth", []),
      this.makeCharacter("mira", "Mira", "White Sage", 30, 4, 4, 6, 7, "willowRod", "travelCloth", ["mend", "ward"]),
      this.makeCharacter("kael", "Kael", "Ember Adept", 26, 3, 3, 7, 5, "willowRod", "travelCloth", ["spark", "ember"])
    ];
    this.inventory = { potion: 5, antidote: 2, tent: 1, phoenixAsh: 0, etherleaf: 0, smokeBomb: 0, charteredCompass: 0 };
    this.gearBag = { trainingBlade: 1, willowRod: 2, travelCloth: 3 };
    this.gold = 80;
    this.buildWorldFromSeed(createWorldSeed());
    this.worldPos = { ...(this.generatedWorld?.startPosition ?? { x: 10, y: 22 }) };
    this.townPos = { x: 10, y: 12 };
    this.dungeonPos = { x: 1, y: 1 };
    this.currentTown = "dawnford";
    this.currentDungeon = "mossCave";
    this.currentIslandId = "greenhaven";
    this.dungeonFloor = 0;
    this.encounterCounter = 10;
    this.flags = { ...this.defaultFlags(), introSeen: true };
    this.openedChests = new Set();
    this.discoveredPois = new Set();
    this.puzzleFlags = new Set();
    this.defeatedBosses = new Set();
    this.clearedDungeons = new Set();
    this.settings.encounters = true;
    this.settings.xpMultiplier = 1;
    this.settings.fastText = false;
    this.clearHeldMovement();
    this.mode = "town";
    this.currentTown = "dawnford";
    this.syncAllVisualPositions();
    this.audio.setMode("world");
    this.dialogue = {
      lines: [
        "Harbor Master: Welcome to Greenhaven, last warm light before the archipelago opens wide.",
        "Mira: Root, Flame, Tide, and Gale are scattered across these islands now.",
        "Kael: A living map, a cursed sea, and a suspicious number of caves. Excellent.",
        "Arlen: We clear Mossy Cave, earn passage, then sail for Coralreach."
      ],
      index: 0,
      done: () => {
        this.mode = "town";
        this.saveGame();
      }
    };
    this.previousMode = "town";
    this.mode = "dialogue";
    this.markDirty();
  }

  private makeCharacter(
    id: CharacterState["id"],
    name: string,
    role: string,
    maxHp: number,
    attack: number,
    defense: number,
    speed: number,
    luck: number,
    weapon: string,
    armor: string,
    spells: string[]
  ): CharacterState {
    const character: CharacterState = {
      id,
      name,
      role,
      level: 1,
      xp: 0,
      nextXp: 42,
      hp: maxHp,
      maxHp,
      baseAttack: attack,
      baseDefense: defense,
      speed,
      luck,
      weapon,
      armor,
      statuses: {},
      charges: {
        "1": { current: id === "arlen" ? 0 : 3, max: id === "arlen" ? 0 : 3 },
        "2": { current: 0, max: 0 },
        "3": { current: 0, max: 0 }
      },
      spells,
      skillCooldowns: {},
      defending: false
    };
    this.refreshCharges(character, true);
    return character;
  }

  private defaultFlags() {
    return {
      relics: { root: false, flame: false, tide: false, gale: false },
      boat: false,
      skyship: false,
      gateOpen: false,
      introSeen: false,
      travel: {
        visitedIsland2: false,
        visitedIsland3: false,
        unlockedIsland2: true,
        unlockedIsland3: false
      }
    };
  }

  private normalizeFlags(raw: Partial<ReturnType<CrystalOathScene["defaultFlags"]>> | undefined) {
    const defaults = this.defaultFlags();
    return {
      ...defaults,
      ...(raw ?? {}),
      relics: { ...defaults.relics, ...(raw?.relics ?? {}) },
      travel: { ...defaults.travel, ...(raw?.travel ?? {}) }
    };
  }

  private normalizeParty(rawParty: CharacterState[]): CharacterState[] {
    if (!rawParty.length) {
      return [
        this.makeCharacter("arlen", "Arlen", "Vanguard", 42, 9, 7, 5, 4, "trainingBlade", "travelCloth", []),
        this.makeCharacter("mira", "Mira", "White Sage", 30, 4, 4, 6, 7, "willowRod", "travelCloth", ["mend", "ward"]),
        this.makeCharacter("kael", "Kael", "Ember Adept", 26, 3, 3, 7, 5, "willowRod", "travelCloth", ["spark", "ember"])
      ];
    }
    return rawParty.map((member) => ({
      ...member,
      statuses: member.statuses ?? {},
      charges: member.charges ?? {
        "1": { current: 0, max: 0 },
        "2": { current: 0, max: 0 },
        "3": { current: 0, max: 0 }
      },
      spells: member.spells ?? [],
      skillCooldowns: member.skillCooldowns ?? {},
      defending: false
    }));
  }

  private locations(): LocationDef[] {
    return (this.generatedWorld?.pois ?? []).map((poi) => ({
      id: poi.id,
      name: poi.name,
      kind: poi.kind,
      islandId: poi.islandId,
      landmarkKind: poi.landmarkKind,
      objectId: poi.objectId,
      difficultyTier: poi.difficultyTier,
      x: poi.x,
      y: poi.y,
      footprint: poi.footprint,
      ...this.locationProgressionRules(poi.id)
    }));
  }

  private locationProgressionRules(id: string): Partial<LocationDef> {
    if (id === "ashenKeep") {
      return {
        requires: () => this.flags.relics.root,
        lockedText: "Ashfang's keep smolders behind root-sealed stone. Clear Greenhaven's cave first."
      };
    }
    if (id === "skyglassTower") {
      return {
        requires: () => this.flags.relics.flame && this.flags.relics.tide,
        lockedText: "Hot wind and tide mist twist together here. Flame and Tide must shine first."
      };
    }
    if (id === "eclipseSpire") {
      return {
        requires: () => this.flags.gateOpen && this.flags.skyship,
        lockedText: "The spire hangs beyond reach. Open Starfall Gate and ride the sky route."
      };
    }
    return {};
  }

  private towns(): Record<string, TownDef> {
    return {
      dawnford: {
        id: "dawnford",
        name: "Greenhaven",
        palette: ["#23314f", "#4b6a9b", "#d9e6ff"],
        innPrice: 18,
        clinicPrice: 35,
        itemStock: ["potion", "antidote", "tent"],
        weaponStock: ["ironSaber"],
        armorStock: ["ringMail", "sageMantle"],
        spellStock: ["glow", "frost"],
        npcs: [
          { x: 5, y: 7, lines: ["Guard: Mossy Cave shifts every season, but its deepest room always hoards trouble."] },
          { x: 14, y: 8, lines: ["Archivist: The map seed is written in the stars. Same seed, same islands."] },
          { x: 9, y: 5, lines: ["Harbor Master: Passage to Coralreach is 10 gold from the dock outside town."] }
        ]
      },
      brinewick: {
        id: "brinewick",
        name: "Coralreach",
        palette: ["#183e5b", "#2f9ac0", "#d2fbff"],
        innPrice: 26,
        clinicPrice: 45,
        itemStock: ["potion", "antidote", "phoenixAsh", "smokeBomb"],
        weaponStock: ["glassWand"],
        armorStock: ["ringMail", "sageMantle"],
        spellStock: ["mendall", "quakelet"],
        arrival: () => {
          if (!this.flags.travel.visitedIsland2) {
            this.flags.travel.visitedIsland2 = true;
            this.say(["Coralreach smells of rain, spice, and old stone. Pirates watch the ruins from the trees."]);
          }
        },
        npcs: [
          { x: 6, y: 7, lines: ["Sailor: Jungle ruins lie inland. Pirates found something there and stopped laughing."] },
          { x: 15, y: 7, lines: ["Fisher: I saw a wreck south of the harbor. It might still have cargo."] },
          { x: 11, y: 4, lines: ["Harbor Master: Ashfang passage is 10 gold when your nerve is ready."] }
        ]
      },
      elderleaf: {
        id: "elderleaf",
        name: "Elderleaf",
        palette: ["#14351f", "#4d8b43", "#d7f2a4"],
        innPrice: 24,
        clinicPrice: 42,
        itemStock: ["potion", "antidote", "etherleaf", "tent"],
        weaponStock: ["glassWand"],
        armorStock: ["sageMantle"],
        spellStock: ["revive", "storm"],
        npcs: [
          { x: 5, y: 8, lines: ["Druid: Poison lingers after battle. Carry antidotes or rest at an inn."] },
          { x: 14, y: 6, lines: ["Scout: Ashfang Keep opened when Rootlight returned. Ice cools proud flame."] },
          { x: 11, y: 10, lines: ["Child: I saw a hidden chest sparkle behind the cave's switch stone."] }
        ]
      },
      sunbarrow: {
        id: "sunbarrow",
        name: "Ashfang Camp",
        palette: ["#6c4c22", "#d29a44", "#fff0ae"],
        innPrice: 32,
        clinicPrice: 55,
        itemStock: ["potion", "phoenixAsh", "etherleaf", "smokeBomb", "tent"],
        weaponStock: ["glassWand"],
        armorStock: ["ringMail", "sageMantle"],
        spellStock: ["starveil", "nova"],
        npcs: [
          { x: 7, y: 7, lines: ["Miner: Ashfang's cliffs move like they are thinking. Stay on the paths."] },
          { x: 13, y: 9, lines: ["Trader: Starveil wins long fights. Nova ends short ones."] },
          { x: 10, y: 5, lines: ["Outrider: Four relics point to Starfall Gate, not the spire itself."] }
        ]
      },
      starfallGate: {
        id: "starfallGate",
        name: "Starfall Gate",
        palette: ["#1b1733", "#7065a8", "#fff4bd"],
        innPrice: 0,
        clinicPrice: 0,
        itemStock: ["potion", "phoenixAsh", "etherleaf", "smokeBomb"],
        weaponStock: [],
        armorStock: [],
        spellStock: [],
        arrival: () => {
          if (this.hasAllRelics() && !this.flags.gateOpen) {
            this.flags.gateOpen = true;
            this.flags.skyship = true;
            this.say([
              "The four Star Relics rise into a single dawn-colored ring.",
              "A sky-vessel of glass and cedar descends without a sound.",
              "Starfall Gate opens. The Eclipse Spire can now be reached."
            ]);
            this.saveGame();
          }
        },
        npcs: [
          { x: 10, y: 6, lines: ["Gatekeeper: Root, Flame, Tide, and Gale must sing together."] },
          { x: 7, y: 9, lines: ["Pilgrim: Past this gate waits the Crown that dimmed the morning."] }
        ]
      }
    };
  }

  private generatedDungeonFloors(dungeonId: string, tier: number, final = false): string[][] {
    return generateDungeonFloors({ seed: this.worldSeed, dungeonId, tier, final });
  }

  private dungeons(): Record<string, DungeonDef> {
    return {
      mossCave: {
        id: "mossCave",
        name: "Mossy Cave",
        relic: "root",
        boss: "rootboundTroll",
        palette: { floor: 0x31543b, wall: 0x18271e, accent: 0x78a95f, chest: 0xc08a3a, gate: 0x6a4328 },
        encounterTable: ["slimebud", "greenWolf", "bandit", "caveBat"],
        floors: this.generatedDungeonFloors("mossCave", 1),
        chestRewards: [
          { id: "mossCave-0", item: "etherleaf" },
          { id: "mossCave-1", gear: "starbrand" },
          { id: "mossCave-2", gold: 80 }
        ],
        puzzleText: "A root switch sinks. Somewhere, old vines release a door.",
        bossIntro: ["Rootbound Troll: Little oathlings. I drank the cave's green star. Come take the thorns."],
        rewardText: ["The Root Relic brightens. Roads under leaf and stone breathe again."]
      },
      ashenKeep: {
        id: "ashenKeep",
        name: "Ashfang Keep",
        relic: "flame",
        boss: "emberTyrant",
        palette: { floor: 0x522a22, wall: 0x1e1213, accent: 0xff6a38, chest: 0xd9a445, gate: 0x7b1d13 },
        encounterTable: ["ashGolem", "cinderPup", "ashSprite", "coalKnight"],
        floors: this.generatedDungeonFloors("ashenKeep", 3),
        chestRewards: [
          { id: "ashenKeep-0", item: "phoenixAsh" },
          { id: "ashenKeep-1", gear: "emberStaff" },
          { id: "ashenKeep-2", gold: 130 }
        ],
        puzzleText: "The furnace lever clanks. A scorched bridge locks into place.",
        bossIntro: ["Ember Tyrant: I am the kept flame and the hungry flame. Kneel, or be kindling."],
        rewardText: ["The Flame Relic burns clear, warming even the shadowed roads."]
      },
      tideShrine: {
        id: "tideShrine",
        name: "Coralreach Ruins",
        relic: "tide",
        boss: "tideOracle",
        palette: { floor: 0x1b5770, wall: 0x0b2234, accent: 0x68d5ec, chest: 0xd8bd68, gate: 0x184968 },
        encounterTable: ["pirate", "jungleShaman", "reefCrab", "drownedHusk"],
        floors: this.generatedDungeonFloors("tideShrine", 2),
        chestRewards: [
          { id: "tideShrine-0", item: "etherleaf" },
          { id: "tideShrine-1", gear: "tidePlate" },
          { id: "tideShrine-2", gold: 160 }
        ],
        puzzleText: "The moon-basin fills. A submerged seal rises into a path.",
        bossIntro: ["Tide Oracle: Every oath is a cup. Let us see whether yours leaks."],
        rewardText: ["The Tide Relic clears. The sea no longer speaks in fear."]
      },
      skyglassTower: {
        id: "skyglassTower",
        name: "Skyglass Tower",
        relic: "gale",
        boss: "galeChimera",
        palette: { floor: 0x485f78, wall: 0x172336, accent: 0xa8f2ff, chest: 0xe2c76f, gate: 0x3a7690 },
        encounterTable: ["skyMite", "galeHarpy", "glassRoc"],
        floors: this.generatedDungeonFloors("skyglassTower", 3),
        chestRewards: [
          { id: "skyglassTower-0", item: "phoenixAsh" },
          { id: "skyglassTower-1", gear: "galeCloak" },
          { id: "skyglassTower-2", gold: 220 }
        ],
        puzzleText: "A lens turns toward the gale. A glass bridge hums into view.",
        bossIntro: ["Gale Chimera: Three throats, one storm. Show me which voice your oath uses."],
        rewardText: ["The Gale Relic flashes. High roads descend from cloud and glass."]
      },
      eclipseSpire: {
        id: "eclipseSpire",
        name: "Eclipse Spire",
        boss: "eclipseCrown",
        palette: { floor: 0x221a35, wall: 0x08070e, accent: 0xb09cff, chest: 0xffdc78, gate: 0x4f2f75 },
        encounterTable: ["eclipseShade", "crownGuard", "voidSerpent"],
        floors: this.generatedDungeonFloors("eclipseSpire", 4, true),
        chestRewards: [
          { id: "eclipseSpire-0", item: "etherleaf" },
          { id: "eclipseSpire-1", item: "phoenixAsh" },
          { id: "eclipseSpire-2", gold: 260 }
        ],
        puzzleText: "The shadow seal accepts the fourfold light. The last stair appears.",
        bossIntro: ["Eclipse Crown: Dawn is a brief mistake. I will make the world consistent."],
        rewardText: ["The Crown cracks. Morning remembers every road in Asterra."]
      }
    };
  }

  private isExploreMode(mode: Mode): mode is ExploreMode {
    return mode === "world" || mode === "town" || mode === "dungeon";
  }

  private clearHeldMovement() {
    this.heldDirections = [];
    this.cancelActiveStep();
  }

  private cancelActiveStep() {
    if (!this.activeStep) return;
    const mode = this.activeStep.mode;
    this.setVisualExplorePos(mode, this.currentExploreTile(mode));
    this.activeStep = undefined;
  }

  private currentHeldDirection(): Vec | undefined {
    const direction = this.heldDirections[this.heldDirections.length - 1];
    if (direction === "up") return { x: 0, y: -1 };
    if (direction === "down") return { x: 0, y: 1 };
    if (direction === "left") return { x: -1, y: 0 };
    if (direction === "right") return { x: 1, y: 0 };
    return undefined;
  }

  private updateMovement(delta: number) {
    this.blockedMoveCooldown = Math.max(0, this.blockedMoveCooldown - delta);
    this.playerMoving = false;
    if (!this.isExploreMode(this.mode)) {
      this.walkAnimElapsed = 0;
      this.activeStep = undefined;
      return;
    }
    if (this.activeStep) {
      this.lastMoveDir = { ...this.activeStep.dir };
      this.playerMoving = true;
      this.walkAnimElapsed += delta;
      this.advanceExploreStep(delta);
      this.markDirty();
      return;
    }
    const dir = this.currentHeldDirection();
    if (!dir) {
      this.walkAnimElapsed = 0;
      return;
    }
    this.lastMoveDir = { ...dir };
    if (!this.beginExploreStep(this.mode, dir)) {
      if (this.blockedMoveCooldown <= 0) {
        this.audio.blip("error");
        this.blockedMoveCooldown = 150;
      }
      this.walkAnimElapsed = 0;
      return;
    }
    this.playerMoving = true;
    this.walkAnimElapsed += delta;
    this.advanceExploreStep(delta);
    this.markDirty();
  }

  private beginExploreStep(mode: ExploreMode, dir: Vec): boolean {
    if (!this.isExploreMode(this.mode)) return false;
    if (this.activeStep) return true;
    const from = this.currentExploreTile(mode);
    if (mode === "town" && dir.y > 0 && this.isTownExitTile(from)) {
      this.exitTownToWorld();
      return true;
    }
    const to = { x: from.x + dir.x, y: from.y + dir.y };
    if (!this.canOccupyExploreTile(mode, to.x, to.y)) return false;
    this.setVisualExplorePos(mode, from);
    this.activeStep = { mode, from, to, dir: { ...dir } };
    return true;
  }

  private advanceExploreStep(delta: number) {
    const step = this.activeStep;
    if (!step || !this.isExploreMode(this.mode) || this.mode !== step.mode) {
      this.activeStep = undefined;
      return;
    }
    const speed = (this.shiftHeld ? FAST_MOVE_TILES_PER_MS : MOVE_TILES_PER_MS) * delta;
    if (speed <= 0) return;
    const pos = this.visualExplorePos(step.mode);
    const remaining = Math.abs(step.to.x - pos.x) + Math.abs(step.to.y - pos.y);
    if (remaining <= speed) {
      this.setVisualExplorePos(step.mode, step.to);
      this.completeExploreStep(step);
      return;
    }
    this.setVisualExplorePos(step.mode, { x: pos.x + step.dir.x * speed, y: pos.y + step.dir.y * speed });
  }

  private currentExploreTile(mode: ExploreMode): Vec {
    if (mode === "world") return { ...this.worldPos };
    if (mode === "town") return { ...this.townPos };
    return { ...this.dungeonPos };
  }

  private setCurrentExploreTile(mode: ExploreMode, tile: Vec) {
    const next = { ...tile };
    if (mode === "world") this.worldPos = next;
    else if (mode === "town") this.townPos = next;
    else this.dungeonPos = next;
  }

  private canOccupyExploreTile(mode: ExploreMode, x: number, y: number): boolean {
    if (mode === "world") {
      if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return false;
      return this.canEnterTerrain(this.world[y][x]) || !!this.locationAt(x, y);
    }
    if (mode === "town") return x >= 1 && x <= 19 && y >= 1 && y <= 13;
    const floor = this.dungeonFloorRows(this.currentDungeon, this.dungeonFloor);
    const tile = floor[y]?.[x] ?? "#";
    return this.isDungeonTileWalkable(this.currentDungeon, tile);
  }

  private dungeonFloorRows(dungeonId = this.currentDungeon, floorIndex = this.dungeonFloor): string[] {
    const dungeon = this.dungeons()[dungeonId];
    if (!dungeon) return [];
    const clampedFloor = Math.max(0, Math.min(floorIndex, dungeon.floors.length - 1));
    return dungeon.floors[clampedFloor] ?? [];
  }

  private isDungeonTileWalkable(dungeonId: string, tile?: string): boolean {
    return !!tile && tile !== "#" && !(tile === "D" && !this.puzzleFlags.has(`${dungeonId}-switch`));
  }

  private findDungeonTilePosition(floor: string[], values: string[]): Vec | undefined {
    for (let y = 0; y < floor.length; y += 1) {
      for (let x = 0; x < floor[y].length; x += 1) {
        if (values.includes(floor[y][x])) return { x, y };
      }
    }
    return undefined;
  }

  private nearestDungeonWalkableTile(dungeonId: string, floor: string[], target: Vec): Vec {
    const width = floor[0]?.length ?? 0;
    const height = floor.length;
    const queue = [target];
    const seen = new Set<string>();
    while (queue.length) {
      const current = queue.shift()!;
      const key = `${current.x},${current.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (current.x >= 0 && current.y >= 0 && current.x < width && current.y < height) {
        const tile = floor[current.y]?.[current.x];
        if (this.isDungeonTileWalkable(dungeonId, tile)) return current;
        queue.push({ x: current.x + 1, y: current.y });
        queue.push({ x: current.x - 1, y: current.y });
        queue.push({ x: current.x, y: current.y + 1 });
        queue.push({ x: current.x, y: current.y - 1 });
      }
    }
    return { x: 1, y: 1 };
  }

  private dungeonMarkerSpawn(dungeonId: string, floorIndex: number, markerTiles: string[], fallback: Vec): Vec {
    const floor = this.dungeonFloorRows(dungeonId, floorIndex);
    const marker = this.findDungeonTilePosition(floor, markerTiles) ?? fallback;
    return this.nearestDungeonWalkableTile(dungeonId, floor, marker);
  }

  private dungeonEntranceSpawn(dungeonId: string): Vec {
    return this.dungeonMarkerSpawn(dungeonId, 0, ["E"], { x: 1, y: 1 });
  }

  private dungeonStairSpawn(dungeonId: string, floorIndex: number): Vec {
    return this.dungeonMarkerSpawn(dungeonId, floorIndex, ["S"], floorIndex === 0 ? { x: 19, y: 12 } : { x: 2, y: 12 });
  }

  private ensureValidDungeonPosition() {
    const dungeon = this.dungeons()[this.currentDungeon];
    if (!dungeon) {
      this.currentDungeon = "mossCave";
      this.dungeonFloor = 0;
      this.dungeonPos = this.dungeonEntranceSpawn(this.currentDungeon);
      return;
    }
    this.dungeonFloor = Math.max(0, Math.min(this.dungeonFloor, dungeon.floors.length - 1));
    if (!this.canOccupyExploreTile("dungeon", this.dungeonPos.x, this.dungeonPos.y)) {
      this.dungeonPos = this.dungeonFloor === 0 ? this.dungeonEntranceSpawn(this.currentDungeon) : this.dungeonStairSpawn(this.currentDungeon, this.dungeonFloor);
    }
  }

  private completeExploreStep(step: ExploreStep) {
    if (!this.isExploreMode(this.mode) || this.mode !== step.mode) {
      this.activeStep = undefined;
      return;
    }
    this.setCurrentExploreTile(step.mode, step.to);
    this.activeStep = undefined;
    this.lastStepFrame += 1;
    this.handleCompletedExploreTile(step.mode, step.to, step.dir);
  }

  private handleCompletedExploreTile(mode: ExploreMode, tile: Vec, dir: Vec) {
    if (!this.isExploreMode(this.mode) || this.mode !== mode) return;
    if (mode === "world") {
      this.applyWalkPoison();
      this.syncCurrentIslandFromWorldPos();
      const loc = this.locationAt(tile.x, tile.y);
      if (loc && (loc.kind === "harbor" || loc.kind === "landmark")) this.interactWorldLocation(loc);
      else if (loc) this.enterLocation(loc);
      else this.maybeEncounter();
      return;
    }
    if (mode === "town") {
      if (dir.y > 0 && this.isTownExitTile(tile)) this.exitTownToWorld();
      return;
    }
    const dungeon = this.dungeons()[this.currentDungeon];
    const floor = dungeon.floors[this.dungeonFloor];
    const dungeonTile = floor[tile.y]?.[tile.x] ?? "#";
    this.applyWalkPoison();
    if (dungeonTile === "E") {
      this.clearHeldMovement();
      this.mode = "world";
      this.syncAllVisualPositions();
      this.audio.setMode("world");
      return;
    }
    if (dungeonTile === "S") {
      this.clearHeldMovement();
      this.dungeonFloor = this.dungeonFloor === 0 ? 1 : 0;
      this.dungeonPos = this.dungeonStairSpawn(this.currentDungeon, this.dungeonFloor);
      this.syncAllVisualPositions();
      return;
    }
    if (dungeonTile === "B") {
      this.startBossBattle(dungeon);
      return;
    }
    if (dungeonTile === "C" || dungeonTile === "K") {
      this.interact();
      return;
    }
    this.maybeDungeonEncounter(dungeon);
  }

  private setVisualExplorePos(mode: ExploreMode, pos: Vec) {
    const next = { ...pos };
    if (mode === "world") this.visualWorldPos = next;
    else if (mode === "town") this.visualTownPos = next;
    else this.visualDungeonPos = next;
  }

  private syncAllVisualPositions() {
    this.activeStep = undefined;
    this.visualWorldPos = { ...this.worldPos };
    this.visualTownPos = { ...this.townPos };
    this.visualDungeonPos = { ...this.dungeonPos };
  }

  private visualExplorePos(mode: ExploreMode): Vec {
    if (mode === "world") return { ...this.visualWorldPos };
    if (mode === "town") return { ...this.visualTownPos };
    return { ...this.visualDungeonPos };
  }

  private isTownExitTile(tile: Vec): boolean {
    return tile.y >= 13 && tile.x >= 9 && tile.x <= 11;
  }

  private exitTownToWorld() {
    this.clearHeldMovement();
    const loc = this.locations().find((candidate) => candidate.id === this.currentTown);
    if (loc) {
      this.worldPos = this.worldReturnTileForLocation(loc);
    }
    this.mode = "world";
    this.syncAllVisualPositions();
    this.audio.setMode("world");
    this.saveGame();
    this.markDirty();
  }

  private interact() {
    if (this.mode === "world") {
      const loc = this.locationAt(this.worldPos.x, this.worldPos.y);
      if (loc) {
        if (loc.kind === "harbor" || loc.kind === "landmark") this.interactWorldLocation(loc);
        else this.enterLocation(loc);
      }
      return;
    }
    if (this.mode === "town") {
      this.interactTown();
      return;
    }
    if (this.mode === "dungeon") {
      this.interactDungeon();
    }
  }

  private worldReturnTileForLocation(loc: LocationDef): Vec {
    const radius = Math.floor(this.locationFootprint(loc) / 2);
    const candidates: Vec[] = [
      { x: loc.x, y: loc.y + radius + 1 },
      { x: loc.x - 1, y: loc.y + radius + 1 },
      { x: loc.x + 1, y: loc.y + radius + 1 },
      { x: loc.x - radius - 1, y: loc.y },
      { x: loc.x + radius + 1, y: loc.y },
      { x: loc.x, y: loc.y - radius - 1 }
    ];
    for (const candidate of candidates) {
      if (this.canOccupyExploreTile("world", candidate.x, candidate.y)) return candidate;
    }
    for (let searchRadius = radius + 1; searchRadius <= radius + 5; searchRadius += 1) {
      for (let y = loc.y - searchRadius; y <= loc.y + searchRadius; y += 1) {
        for (let x = loc.x - searchRadius; x <= loc.x + searchRadius; x += 1) {
          if (Math.abs(x - loc.x) !== searchRadius && Math.abs(y - loc.y) !== searchRadius) continue;
          if (this.canOccupyExploreTile("world", x, y)) return { x, y };
        }
      }
    }
    return { x: loc.x, y: loc.y };
  }

  private interactTown() {
    const town = this.towns()[this.currentTown];
    const p = this.townPos;
    const facing = { x: p.x + this.lastMoveDir.x, y: p.y + this.lastMoveDir.y };
    const facedNpc = town.npcs.find((npc) => npc.x === facing.x && npc.y === facing.y);
    if (facedNpc) {
      this.say(facedNpc.lines);
      return;
    }
    for (const npc of town.npcs) {
      if (Math.abs(npc.x - p.x) + Math.abs(npc.y - p.y) <= 1) {
        this.say(npc.lines);
        return;
      }
    }
    const service = this.serviceAt(facing.x, facing.y) ?? this.serviceAt(p.x, p.y);
    if (service === "inn") this.openInn(town);
    else if (service === "clinic") this.openClinic(town);
    else if (service === "item") this.openShop(`${town.name} Item Shop`, town.itemStock.map((id) => ({ id, type: "item" as const })));
    else if (service === "arms") {
      const stock = [
        ...town.weaponStock.map((id) => ({ id, type: "gear" as const })),
        ...town.armorStock.map((id) => ({ id, type: "gear" as const }))
      ];
      this.openShop(`${town.name} Arms`, stock);
    } else if (service === "magic") this.openMagicShop(town);
    else this.say([`${town.name}: The road waits outside the south gate.`]);
  }

  private interactDungeon() {
    const dungeon = this.dungeons()[this.currentDungeon];
    const tile = dungeon.floors[this.dungeonFloor][this.dungeonPos.y]?.[this.dungeonPos.x];
    if (tile === "K") {
      this.puzzleFlags.add(`${this.currentDungeon}-switch`);
      this.say([dungeon.puzzleText]);
      return;
    }
    if (tile === "C") {
      this.openDungeonChest(dungeon);
      return;
    }
    if (tile === "D" && !this.puzzleFlags.has(`${this.currentDungeon}-switch`)) {
      this.say(["The sealed door will not move. A switch must feed it power."]);
      return;
    }
    this.say([`${dungeon.name}: The air is heavy with old danger.`]);
  }

  private enterLocation(loc: LocationDef) {
    this.clearHeldMovement();
    if (loc.islandId) this.currentIslandId = loc.islandId;
    if (loc.kind === "harbor" || loc.kind === "landmark") {
      this.interactWorldLocation(loc);
      return;
    }
    if (loc.requires && !loc.requires()) {
      this.say([loc.lockedText ?? "A strange force blocks the way."]);
      return;
    }
    if (loc.kind === "gate") {
      this.currentTown = "starfallGate";
      this.townPos = { x: 10, y: 12 };
      this.mode = "town";
      this.syncAllVisualPositions();
      this.audio.setMode("world");
      this.towns().starfallGate.arrival?.();
      this.saveGame();
      return;
    }
    if (loc.kind === "town") {
      this.currentTown = loc.id;
      this.townPos = { x: 10, y: 12 };
      this.mode = "town";
      this.syncAllVisualPositions();
      this.audio.setMode("world");
      this.towns()[loc.id].arrival?.();
      this.saveGame();
      return;
    }
    this.currentDungeon = loc.id;
    this.dungeonFloor = 0;
    this.dungeonPos = this.dungeonEntranceSpawn(this.currentDungeon);
    this.mode = "dungeon";
    this.syncAllVisualPositions();
    this.audio.setMode("dungeon");
    this.encounterCounter = 7;
    this.saveGame();
  }

  private openDungeonChest(dungeon: DungeonDef) {
    const chestIndex = this.countDungeonChestAtCurrentOrNearest(dungeon);
    const reward = dungeon.chestRewards[chestIndex % dungeon.chestRewards.length];
    const chestId = `${dungeon.id}-${this.dungeonFloor}-${this.dungeonPos.x}-${this.dungeonPos.y}-${reward.id}`;
    if (this.openedChests.has(chestId)) {
      this.say(["The chest is empty."]);
      return;
    }
    this.openedChests.add(chestId);
    if (reward.item) {
      this.inventory[reward.item] = (this.inventory[reward.item] ?? 0) + 1;
      this.say([`Found ${ITEMS[reward.item].name}!`]);
    } else if (reward.gear) {
      this.gearBag[reward.gear] = (this.gearBag[reward.gear] ?? 0) + 1;
      this.say([`Found ${GEAR[reward.gear].name}!`]);
    } else if (reward.gold) {
      this.gold += reward.gold;
      this.say([`Found ${reward.gold} gold!`]);
    }
  }

  private countDungeonChestAtCurrentOrNearest(dungeon: DungeonDef): number {
    let count = 0;
    for (let f = 0; f <= this.dungeonFloor; f += 1) {
      const floor = dungeon.floors[f];
      for (let y = 0; y < floor.length; y += 1) {
        for (let x = 0; x < floor[y].length; x += 1) {
          if (floor[y][x] === "C") {
            if (f === this.dungeonFloor && x === this.dungeonPos.x && y === this.dungeonPos.y) return count;
            count += 1;
          }
        }
      }
    }
    return count;
  }

  private locationFootprint(loc: LocationDef): number {
    return loc.footprint ?? LANDMARK_FOOTPRINT;
  }

  private locationContainsTile(loc: LocationDef, x: number, y: number): boolean {
    const radius = Math.floor(this.locationFootprint(loc) / 2);
    return x >= loc.x - radius && x <= loc.x + radius && y >= loc.y - radius && y <= loc.y + radius;
  }

  private locationAt(x: number, y: number): LocationDef | undefined {
    return this.locations().find((loc) => this.locationContainsTile(loc, x, y));
  }

  private canEnterTerrain(terrain: Terrain): boolean {
    return isWorldTileWalkable(terrain);
  }

  private terrainEncounterKey(terrain: Terrain): keyof typeof WORLD_TABLES | undefined {
    if (worldTileHasTag(terrain, "road") || worldTileHasTag(terrain, "bridge")) return undefined;
    return worldTileEncounterFamily(terrain) as keyof typeof WORLD_TABLES | undefined;
  }

  private worldEncounterKeyAt(x: number, y: number): keyof typeof WORLD_TABLES | undefined {
    const terrain = this.world[y]?.[x];
    if (!terrain || this.isRoadAt(x, y)) return undefined;
    const islandId = this.generatedWorld?.islandByTile[y]?.[x] ?? this.currentIslandId;
    const biome = this.generatedWorld?.biomes[y]?.[x];
    if (biome === "forest") return islandId === "coralreach" ? "forest" : "forest";
    if (islandId === "ashfang" && (biome === "darkland" || biome === "lava" || biome === "mountain")) return "final";
    if (islandId === "coralreach" && biome === "desert") return "sand";
    return this.terrainEncounterKey(terrain);
  }

  private isRoadAt(x: number, y: number): boolean {
    return !!this.generatedWorld?.roads.some((road) => road.x === x && road.y === y);
  }

  private syncCurrentIslandFromWorldPos() {
    const island = this.generatedWorld ? getIslandAt(this.generatedWorld, this.worldPos.x, this.worldPos.y) : undefined;
    if (island) this.currentIslandId = island.id;
  }

  private currentIslandName(): string {
    return this.generatedWorld?.islands.find((island) => island.id === this.currentIslandId)?.name ?? "Open Sea";
  }

  private interactWorldLocation(loc: LocationDef) {
    if (loc.islandId) this.currentIslandId = loc.islandId;
    if (loc.kind === "harbor") {
      this.openHarborMenu(loc);
      return;
    }
    if (loc.kind === "landmark") this.discoverLandmark(loc);
  }

  private openHarborMenu(loc: LocationDef) {
    this.rememberMenuReturnMode();
    const options: MenuOption[] = this.getAvailableDestinations(loc.islandId ?? this.currentIslandId).map((destination) => ({
      label: () => {
        const locked = this.isDestinationLocked(destination);
        return `${destination.displayName} - ${destination.costGold}g${locked ? " (locked)" : ""}`;
      },
      action: () => {
        if (this.isDestinationLocked(destination)) {
          this.flashMessage("The Harbor Master needs a proper chart for that route.");
          return;
        }
        this.travelToIsland(destination);
      }
    }));
    options.push({ label: "Leave harbor", action: () => this.closeMenuTo("world") });
    this.openMenu(`${loc.name}`, options, () => this.closeMenuTo("world"), () => `Gold ${this.gold} | Seed ${this.worldSeed}`);
  }

  private getAvailableDestinations(currentIslandId: IslandId): TravelDestination[] {
    if (currentIslandId === "greenhaven") {
      return [{ destinationIslandId: "coralreach", displayName: "Coralreach", costGold: 10, requiredUnlockFlag: "unlockedIsland2" }];
    }
    if (currentIslandId === "coralreach") {
      return [
        { destinationIslandId: "greenhaven", displayName: "Greenhaven", costGold: 10 },
        { destinationIslandId: "ashfang", displayName: "Ashfang Isle", costGold: 10, requiredUnlockFlag: "unlockedIsland3" }
      ];
    }
    return [
      { destinationIslandId: "coralreach", displayName: "Coralreach", costGold: 10 },
      { destinationIslandId: "greenhaven", displayName: "Greenhaven", costGold: 10 }
    ];
  }

  private isDestinationLocked(destination: TravelDestination): boolean {
    if (!destination.requiredUnlockFlag) return false;
    return !this.flags.travel[destination.requiredUnlockFlag];
  }

  private travelToIsland(destination: TravelDestination) {
    if (this.gold < destination.costGold) {
      this.flashMessage(`You need ${destination.costGold} gold for passage.`);
      return;
    }
    this.gold -= destination.costGold;
    this.flags.boat = true;
    if (destination.destinationIslandId === "coralreach") this.flags.travel.visitedIsland2 = true;
    if (destination.destinationIslandId === "ashfang") this.flags.travel.visitedIsland3 = true;
    this.currentIslandId = destination.destinationIslandId;
    this.worldPos = this.arrivalTileForIsland(destination.destinationIslandId);
    this.mode = "world";
    this.menu = undefined;
    this.syncAllVisualPositions();
    this.audio.setMode("world");
    this.saveGame();
    this.say([`You board the boat and sail across the glittering sea to ${destination.displayName}.`], () => {
      this.mode = "world";
      this.audio.setMode("world");
    });
  }

  private arrivalTileForIsland(islandId: IslandId): Vec {
    const island = this.generatedWorld?.islands.find((candidate) => candidate.id === islandId);
    const harbor = island?.harborPosition;
    if (!harbor) return this.generatedWorld?.startPosition ?? { x: 10, y: 22 };
    const candidates = [
      { x: harbor.x, y: harbor.y + 2 },
      { x: harbor.x - 2, y: harbor.y },
      { x: harbor.x + 2, y: harbor.y },
      { x: harbor.x, y: harbor.y - 2 },
      { x: harbor.x, y: harbor.y }
    ];
    return candidates.find((pos) => this.canOccupyExploreTile("world", pos.x, pos.y)) ?? harbor;
  }

  private discoverLandmark(loc: LocationDef) {
    const landmarkKind = loc.landmarkKind ?? "ruins";
    if (this.discoveredPois.has(loc.id)) {
      if (landmarkKind === "secretMerchant") {
        this.openShop(`${loc.name}`, [
          { id: "potion", type: "item" },
          { id: "phoenixAsh", type: "item" },
          { id: "etherleaf", type: "item" },
          { id: "smokeBomb", type: "item" },
          { id: "glassWand", type: "gear" }
        ]);
      }
      return;
    }
    this.discoveredPois.add(loc.id);
    const tier = loc.difficultyTier ?? 1;
    const rewardGold = 10 + tier * 8;
    if (landmarkKind === "shipwreck") {
      this.gold += rewardGold;
      this.saveGame();
      if (Phaser.Math.Between(1, 100) <= 35) {
        this.say([`The shipwreck yields ${rewardGold} gold, but something coils beneath the planks.`], () => this.startRandomBattle(["reefCrab", "seaSerpent"], undefined));
      } else this.say([`You search the shipwreck and recover ${rewardGold} gold.`]);
      return;
    }
    if (landmarkKind === "shrine") {
      for (const member of this.party) if (member.hp > 0) member.hp = Math.min(member.maxHp, member.hp + Math.floor(member.maxHp * 0.4));
      this.saveGame();
      this.say([`${loc.name} glows softly. The party's wounds close.`]);
      return;
    }
    if (landmarkKind === "hiddenChest") {
      this.gold += rewardGold;
      this.inventory.etherleaf = (this.inventory.etherleaf ?? 0) + 1;
      this.saveGame();
      this.say([`A hidden cache snaps open. Found ${rewardGold} gold and Etherleaf.`]);
      return;
    }
    if (landmarkKind === "monsterNest") {
      this.gold += Math.floor(rewardGold / 2);
      this.saveGame();
      this.say([`${loc.name} stirs. Clearing it should make the island safer.`], () => this.startRandomBattle(this.currentIslandId === "ashfang" ? ["ashGolem", "coalKnight"] : ["greenWolf", "bandit"], undefined));
      return;
    }
    if (landmarkKind === "secretMerchant") {
      this.openShop(`${loc.name}`, [
        { id: "potion", type: "item" },
        { id: "phoenixAsh", type: "item" },
        { id: "etherleaf", type: "item" },
        { id: "smokeBomb", type: "item" },
        { id: "glassWand", type: "gear" }
      ]);
      return;
    }
    if (landmarkKind === "resourceNode") {
      this.gearBag.ringMail = (this.gearBag.ringMail ?? 0) + 1;
      this.saveGame();
      this.say([`You mine glittering ore and shape it into usable Ring Mail.`]);
      return;
    }
    if (landmarkKind === "ancientDoor") {
      this.saveGame();
      this.say([this.hasAllRelics() ? "The ancient door hums with fourfold light, pointing toward Starfall Gate." : "The ancient door waits for four relic lights."]);
      return;
    }
    this.gold += rewardGold;
    this.saveGame();
    this.say([`${loc.name} whispers old island lore. Found ${rewardGold} gold among the stones.`]);
  }

  private maybeEncounter() {
    if (!this.settings.encounters) return;
    const tableKey = this.worldEncounterKeyAt(this.worldPos.x, this.worldPos.y);
    if (!tableKey) return;
    this.encounterCounter -= tableKey === "forest" || tableKey === "hills" || tableKey === "final" ? 2 : 1;
    if (this.encounterCounter <= 0) {
      this.encounterCounter = Phaser.Math.Between(7, 15);
      this.startRandomBattle(WORLD_TABLES[tableKey]);
    }
  }

  private maybeDungeonEncounter(dungeon: DungeonDef) {
    if (!this.settings.encounters) return;
    this.encounterCounter -= 1;
    if (this.encounterCounter <= 0) {
      this.encounterCounter = Phaser.Math.Between(6, 12);
      this.startRandomBattle(dungeon.encounterTable, dungeon.id);
    }
  }

  private startRandomBattle(table: string[], dungeonId?: string) {
    const count = Phaser.Math.Between(1, 3);
    const enemies: EnemyState[] = [];
    for (let i = 0; i < count; i += 1) enemies.push(this.cloneEnemy(Phaser.Utils.Array.GetRandom(table)));
    this.beginBattle("random", enemies, true, `${enemies.map((e) => e.name).join(", ")} appeared!`, dungeonId);
  }

  private startBossBattle(dungeon: DungeonDef) {
    if (this.defeatedBosses.has(dungeon.boss)) {
      this.say(["Only quiet remains where the boss once stood."]);
      return;
    }
    this.saveGame();
    this.say(dungeon.bossIntro, () => {
      this.beginBattle("boss", [this.cloneEnemy(dungeon.boss)], false, `${ENEMIES[dungeon.boss].name} blocks the relic!`, dungeon.id, dungeon.boss);
    });
  }

  private cloneEnemy(id: string): EnemyState {
    const def = ENEMIES[id];
    const enemyState: EnemyState = {
      ...def,
      uid: `${id}-${Math.random().toString(36).slice(2)}`,
      hp: def.maxHp,
      statuses: {}
    };
    enemyState.intent = this.planEnemyIntent(enemyState);
    return enemyState;
  }

  private planEnemyIntent(enemy: EnemyState): EnemyIntent {
    const move = Phaser.Utils.Array.GetRandom(enemy.moves);
    const kind = move.intent ?? this.intentKindForMove(move);
    return {
      kind,
      label: this.intentLabel(kind),
      message: this.intentMessage(enemy.name, kind, move),
      move
    };
  }

  private intentKindForMove(move: EnemyMove): EnemyIntentKind {
    if (move.kind === "status" && move.status === "poison") return "poison";
    if (move.kind === "defend") return "defend";
    if (move.kind === "heal") return "heal";
    if (move.kind === "charge") return "charge";
    if (move.kind === "steal") return "stealGold";
    if (move.kind === "damage" && move.power >= 12) return "heavyAttack";
    return "attack";
  }

  private intentLabel(kind: EnemyIntentKind): string {
    return (
      {
        attack: "Attack",
        heavyAttack: "Heavy Attack",
        defend: "Defend",
        poison: "Poison",
        heal: "Heal",
        charge: "Charge",
        flee: "Flee",
        summon: "Summon",
        stealGold: "Steal Gold"
      }[kind] ?? "Attack"
    );
  }

  private intentMessage(enemyName: string, kind: EnemyIntentKind, move: EnemyMove): string {
    if (kind === "heavyAttack") return `${enemyName} is preparing ${move.name}.`;
    if (kind === "defend") return `${enemyName} raises its guard.`;
    if (kind === "poison") return `${enemyName} readies a venom trick.`;
    if (kind === "heal") return `${enemyName} begins a healing chant.`;
    if (kind === "charge") return `${enemyName} gathers power.`;
    if (kind === "stealGold") return `${enemyName} eyes the party's gold.`;
    return `${enemyName} is watching for an opening.`;
  }

  private battleBackgroundFor(dungeonId?: string): AssetKey {
    if (dungeonId === "mossCave") return "battle_bg_moss_cave";
    if (dungeonId === "ashenKeep") return "battle_bg_ashen_keep";
    if (dungeonId === "tideShrine") return "battle_bg_tide_shrine";
    if (dungeonId === "eclipseSpire") return "battle_bg_eclipse_spire";
    if (dungeonId === "skyglassTower") return "battle_bg_plains";
    const terrain = this.world[this.worldPos.y]?.[this.worldPos.x];
    const family = terrain ? worldTileEncounterFamily(terrain) : undefined;
    if (family === "forest") return "battle_bg_forest_path";
    if (family === "sand") return "battle_bg_ashen_keep";
    if (family === "water") return "battle_bg_tide_shrine";
    if (family === "final") return "battle_bg_eclipse_spire";
    return "battle_bg_plains";
  }

  private beginBattle(kind: BattleState["kind"], enemies: EnemyState[], canRun: boolean, intro: string, dungeonId?: string, bossId?: string) {
    this.clearHeldMovement();
    this.syncAllVisualPositions();
    this.party.forEach((c) => (c.defending = false));
    this.battle = {
      kind,
      enemies,
      bossId,
      dungeonId,
      background: this.battleBackgroundFor(dungeonId),
      canRun,
      phase: "resolving",
      turnOrder: [],
      turnIndex: 0,
      actions: [],
      selected: 0,
      log: [intro],
      actionTimer: BATTLE_TURN_DELAY_MS,
      victoryAwarded: false
    };
    this.rollInitiativeCycle();
    this.mode = "battle";
    this.audio.setMode("battle");
    this.markDirty();
  }

  private updateBattleFlow(delta: number) {
    if (!this.battle || this.mode !== "battle") return;
    if (this.battle.animation) {
      this.updateBattleAnimation(delta);
      return;
    }
    if (["command", "target", "spell", "item", "allyTarget"].includes(this.battle.phase)) this.markDirty();
    if (this.battle.phase !== "resolving") return;
    this.battle.actionTimer -= delta;
    if (this.battle.actionTimer <= 0) this.advanceBattleAfterDelay();
    this.markDirty();
  }

  private updateBattleAnimation(delta: number) {
    if (!this.battle?.animation) return;
    const animation = this.battle.animation;
    animation.elapsed += delta;
    if (!animation.resolved && animation.elapsed >= animation.impactAt) {
      animation.resolved = true;
      animation.spent =
        animation.action.side === "party" ? this.resolvePartyAction(animation.action) : this.resolveEnemyAction(animation.action);
      if (!this.battle) return;
    }
    if (animation.elapsed >= animation.duration && this.battle) {
      const spent = animation.spent ?? true;
      this.battle.animation = undefined;
      if (spent) this.finishCurrentTurn(BATTLE_ACTION_DELAY_MS);
      else {
        this.battle.phase = this.currentBattleActor() ? "command" : "resolving";
        this.battle.selected = 0;
      }
    }
    this.markDirty();
  }

  private advanceBattleAfterDelay() {
    if (!this.battle) return;
    if (this.checkBattleEnd()) return;
    this.startNextBattleTurn();
  }

  private rollInitiativeCycle() {
    if (!this.battle) return;
    const entries: InitiativeEntry[] = [
      ...this.party
        .filter((member) => member.hp > 0)
        .map((member) => ({
          side: "party" as const,
          actorId: member.id,
          initiative: member.speed * 10 + Phaser.Math.Between(0, 12) + Math.floor(member.luck / 2)
        })),
      ...this.battle.enemies
        .filter((enemy) => enemy.hp > 0)
        .map((enemy) => ({
          side: "enemy" as const,
          actorId: enemy.uid,
          initiative: enemy.speed * 10 + Phaser.Math.Between(0, 12)
        }))
    ];
    entries.sort((a, b) => b.initiative - a.initiative);
    this.battle.turnOrder = entries;
    this.battle.turnIndex = 0;
  }

  private startNextBattleTurn() {
    if (!this.battle) return;
    if (this.checkBattleEnd()) return;
    let guard = 0;
    while (this.battle && guard < 30) {
      guard += 1;
      if (this.battle.turnIndex >= this.battle.turnOrder.length) this.rollInitiativeCycle();
      const entry = this.battle.turnOrder[this.battle.turnIndex];
      if (!entry) {
        this.rollInitiativeCycle();
        continue;
      }
      this.battle.turnIndex += 1;
      const actor = this.actorForEntry(entry);
      if (!actor || actor.hp <= 0) continue;
      this.battle.current = entry;
      this.battle.pendingAction = undefined;
      this.battle.selected = 0;
      if (entry.side === "party") {
        const member = actor as CharacterState;
        member.defending = false;
        this.tickSkillCooldowns(member);
        this.battle.log = [`${member.name}'s turn.`];
        if (this.applyTurnStartStatuses(member)) {
          this.finishCurrentTurn(BATTLE_ACTION_DELAY_MS);
          return;
        }
        this.battle.phase = "command";
        this.markDirty();
        return;
      }
      const enemy = actor as EnemyState;
      this.battle.log = [`${enemy.name}'s turn.`];
      if (this.applyTurnStartStatuses(enemy)) {
        this.finishCurrentTurn(BATTLE_ACTION_DELAY_MS);
        return;
      }
      this.queueBattleActionAnimation({ side: "enemy", actorId: enemy.uid, type: "attack" });
      return;
    }
    this.checkBattleEnd();
  }

  private actorForEntry(entry: InitiativeEntry): CharacterState | EnemyState | undefined {
    if (entry.side === "party") return this.party.find((member) => member.id === entry.actorId);
    return this.battle?.enemies.find((enemy) => enemy.uid === entry.actorId);
  }

  private currentBattleEntry(): InitiativeEntry | undefined {
    return this.battle?.current;
  }

  private currentBattleActor(): CharacterState | undefined {
    const entry = this.currentBattleEntry();
    if (!entry || entry.side !== "party") return undefined;
    return this.party.find((member) => member.id === entry.actorId);
  }

  private currentBattleEnemy(): EnemyState | undefined {
    const entry = this.currentBattleEntry();
    if (!entry || entry.side !== "enemy") return undefined;
    return this.battle?.enemies.find((enemy) => enemy.uid === entry.actorId);
  }

  private currentBattleActorName(): string {
    const actor = this.currentBattleActor() ?? this.currentBattleEnemy();
    return actor?.name ?? "Next actor";
  }

  private turnPreviewText(): string {
    if (!this.battle) return "-";
    const preview = this.battle.turnOrder
      .slice(this.battle.turnIndex, this.battle.turnIndex + 4)
      .map((entry) => this.actorForEntry(entry))
      .filter((actor): actor is CharacterState | EnemyState => !!actor && actor.hp > 0)
      .map((actor) => actor.name);
    return preview.length ? preview.join(" > ") : "new initiative";
  }

  private battleOptions(): string[] {
    if (!this.battle) return [];
    if (this.battle.phase === "command") return ["Attack", "Skill", "Magic", "Item", "Defend", "Run"];
    if (this.battle.phase === "target") return this.battle.enemies.filter((e) => e.hp > 0).map((e) => `${e.name} ${e.hp}/${e.maxHp}`);
    if (this.battle.phase === "skill") {
      const actor = this.currentBattleActor();
      if (!actor) return [];
      return this.skillsForActor(actor).map((skill) => this.skillOptionLabel(actor, skill));
    }
    if (this.battle.phase === "spell") {
      const actor = this.currentBattleActor();
      if (!actor) return [];
      return actor.spells
        .filter((id) => actor.level >= SPELLS[id].minLevel)
        .map((id) => {
          const spell = SPELLS[id];
          const charge = actor.charges[String(spell.tier)]?.current ?? 0;
          return `${spell.name} T${spell.tier} (${charge})`;
        });
    }
    if (this.battle.phase === "item") {
      return Object.keys(ITEMS)
        .filter((id) => ITEMS[id].battle && (this.inventory[id] ?? 0) > 0)
        .map((id) => `${ITEMS[id].name} x${this.inventory[id]}`);
    }
    if (this.battle.phase === "allyTarget") return this.party.map((c) => `${c.name} ${c.hp}/${c.maxHp}`);
    return [];
  }

  private skillsForActor(actor: CharacterState): PlayerSkillDef[] {
    return Object.values(PLAYER_SKILLS).filter((skill) => skill.users === "all" || skill.users.includes(actor.id));
  }

  private skillOptionLabel(actor: CharacterState, skill: PlayerSkillDef): string {
    const cooldown = actor.skillCooldowns[skill.id] ?? 0;
    return `${skill.name}${cooldown > 0 ? ` (${cooldown})` : ""}`;
  }

  private tickSkillCooldowns(actor: CharacterState) {
    for (const skillId of Object.keys(actor.skillCooldowns)) {
      actor.skillCooldowns[skillId] = Math.max(0, actor.skillCooldowns[skillId] - 1);
    }
  }

  private adjustBattleSelection(delta: number) {
    if (!this.battle) return;
    const options = this.battleOptions();
    if (!options.length) return;
    this.battle.selected = wrap(this.battle.selected + delta, options.length);
    this.audio.blip("confirm");
  }

  private confirmBattleSelection() {
    if (!this.battle) return;
    const actor = this.currentBattleActor();
    if (!actor) return;
    if (this.battle.phase === "command") {
      const command = this.battleOptions()[this.battle.selected];
      if (command === "Attack") {
        this.battle.pendingAction = { side: "party", actorId: actor.id, type: "attack" };
        this.battle.phase = "target";
        this.battle.selected = 0;
      } else if (command === "Skill") {
        const skills = this.skillsForActor(actor);
        if (!skills.length) {
          this.battle.log = [`${actor.name} has no skills.`];
        } else {
          this.battle.phase = "skill";
          this.battle.selected = 0;
        }
      } else if (command === "Magic") {
        if (!actor.spells.length || this.statusActive(actor, "silence")) {
          this.battle.log = [this.statusActive(actor, "silence") ? `${actor.name} is silenced.` : `${actor.name} knows no spells.`];
        } else {
          this.battle.phase = "spell";
          this.battle.selected = 0;
        }
      } else if (command === "Item") {
        if (!Object.keys(ITEMS).some((id) => ITEMS[id].battle && (this.inventory[id] ?? 0) > 0)) {
          this.battle.log = ["No battle items."];
        } else {
          this.battle.phase = "item";
          this.battle.selected = 0;
        }
      } else if (command === "Defend") {
        this.executePlayerAction({ side: "party", actorId: actor.id, type: "defend" });
      } else if (command === "Run") {
        this.executePlayerAction({ side: "party", actorId: actor.id, type: "run" });
      }
      return;
    }
    if (this.battle.phase === "skill") {
      const skills = this.skillsForActor(actor);
      const skill = skills[this.battle.selected];
      if (!skill) return;
      const cooldown = actor.skillCooldowns[skill.id] ?? 0;
      if (cooldown > 0) {
        this.battle.log = [`${skill.name} needs ${cooldown} more turn${cooldown === 1 ? "" : "s"}.`];
        return;
      }
      this.battle.pendingAction = { side: "party", actorId: actor.id, type: "skill", skillId: skill.id };
      if (skill.target === "enemy") {
        this.battle.phase = "target";
        this.battle.selected = 0;
      } else if (skill.target === "ally") {
        this.battle.phase = "allyTarget";
        this.battle.selected = 0;
      } else {
        this.executePlayerAction(this.battle.pendingAction as BattleAction);
      }
      return;
    }
    if (this.battle.phase === "target") {
      const living = this.battle.enemies.filter((e) => e.hp > 0);
      const target = living[this.battle.selected];
      const targetIndex = this.battle.enemies.indexOf(target);
      this.executePlayerAction({ ...(this.battle.pendingAction as BattleAction), targetIndex });
      return;
    }
    if (this.battle.phase === "spell") {
      const spells = actor.spells.filter((id) => actor.level >= SPELLS[id].minLevel);
      const spellId = spells[this.battle.selected];
      if (!spellId) return;
      const spell = SPELLS[spellId];
      const charge = actor.charges[String(spell.tier)];
      if (!charge || charge.current <= 0) {
        this.battle.log = [`No T${spell.tier} charges left.`];
        return;
      }
      this.battle.pendingAction = { side: "party", actorId: actor.id, type: "spell", spellId };
      if (spell.target === "enemy") {
        this.battle.phase = "target";
        this.battle.selected = 0;
      } else if (spell.target === "ally") {
        this.battle.phase = "allyTarget";
        this.battle.selected = 0;
      } else {
        this.executePlayerAction(this.battle.pendingAction as BattleAction);
      }
      return;
    }
    if (this.battle.phase === "item") {
      const itemIds = Object.keys(ITEMS).filter((id) => ITEMS[id].battle && (this.inventory[id] ?? 0) > 0);
      const itemId = itemIds[this.battle.selected];
      if (!itemId) return;
      this.battle.pendingAction = { side: "party", actorId: actor.id, type: "item", itemId };
      if (itemId === "smokeBomb" || itemId === "etherleaf") this.executePlayerAction(this.battle.pendingAction as BattleAction);
      else {
        this.battle.phase = "allyTarget";
        this.battle.selected = 0;
      }
      return;
    }
    if (this.battle.phase === "allyTarget") {
      this.executePlayerAction({ ...(this.battle.pendingAction as BattleAction), targetIndex: this.battle.selected });
    }
  }

  private executePlayerAction(action: BattleAction) {
    if (!this.battle) return;
    this.queueBattleActionAnimation(action);
  }

  private queueBattleActionAnimation(action: BattleAction) {
    if (!this.battle) return;
    const target = this.battleAnimationTarget(action);
    this.battle.phase = "resolving";
    this.battle.pendingAction = undefined;
    this.battle.selected = 0;
    this.battle.actionTimer = 0;
    this.battle.animation = {
      action,
      elapsed: 0,
      duration: 390,
      impactAt: 155,
      resolved: false,
      ...target
    };
    this.markDirty();
  }

  private battleAnimationTarget(action: BattleAction): Pick<BattleAnimation, "targetSide" | "targetActorId"> {
    if (!this.battle) return {};
    if (action.side === "enemy") return {};
    if (action.type === "attack") {
      const target = this.battle.enemies[action.targetIndex ?? -1] ?? this.battle.enemies.find((enemy) => enemy.hp > 0);
      return target ? { targetSide: "enemy", targetActorId: target.uid } : {};
    }
    if (action.type === "skill" && action.skillId) {
      const skill = PLAYER_SKILLS[action.skillId];
      if (skill.target === "enemy") {
        const target = this.battle.enemies[action.targetIndex ?? -1] ?? this.battle.enemies.find((enemy) => enemy.hp > 0);
        return target ? { targetSide: "enemy", targetActorId: target.uid } : {};
      }
      const target = skill.target === "self" ? this.party.find((member) => member.id === action.actorId) : this.party[action.targetIndex ?? 0];
      return target ? { targetSide: "party", targetActorId: target.id } : {};
    }
    if (action.type === "spell" && action.spellId) {
      const spell = SPELLS[action.spellId];
      if (spell.target === "enemy") {
        const target = this.battle.enemies[action.targetIndex ?? -1] ?? this.battle.enemies.find((enemy) => enemy.hp > 0);
        return target ? { targetSide: "enemy", targetActorId: target.uid } : {};
      }
      if (spell.target === "ally" || spell.target === "self") {
        const target = spell.target === "self" ? this.party.find((member) => member.id === action.actorId) : this.party[action.targetIndex ?? 0];
        return target ? { targetSide: "party", targetActorId: target.id } : {};
      }
    }
    if (action.type === "item" && action.itemId && !["smokeBomb", "etherleaf"].includes(action.itemId)) {
      const target = this.party[action.targetIndex ?? 0];
      return target ? { targetSide: "party", targetActorId: target.id } : {};
    }
    return {};
  }

  private cancelBattleSubmenu() {
    if (!this.battle) return;
    if (this.battle.phase === "command") {
      this.audio.blip("cancel");
      return;
    }
    this.battle.phase = "command";
    this.battle.pendingAction = undefined;
    this.battle.selected = 0;
    this.audio.blip("cancel");
  }

  private finishCurrentTurn(delay: number) {
    if (!this.battle) return;
    const actor = this.battle.current ? this.actorForEntry(this.battle.current) : undefined;
    if (actor && actor.hp > 0) this.tickStatus(actor);
    if (this.checkBattleEnd()) return;
    this.battle.pendingAction = undefined;
    this.battle.selected = 0;
    if (delay <= 0) {
      this.advanceBattleAfterDelay();
      this.markDirty();
      return;
    }
    this.battle.phase = "resolving";
    this.battle.actionTimer = delay;
    this.markDirty();
  }

  private resolvePartyAction(action: BattleAction): boolean {
    if (!this.battle) return false;
    const actor = this.party.find((c) => c.id === action.actorId);
    if (!actor || actor.hp <= 0) return true;
    this.battle.log = [];
    if (action.type === "defend") {
      actor.defending = true;
      this.battle.log.push(`${actor.name} defends.`);
      return true;
    }
    if (action.type === "run") {
      if (!this.battle.canRun) {
        this.battle.log.push("There is no escape!");
        return true;
      }
      const chance = 42 + this.partyAverage("speed") * 4 + this.partyAverage("luck") * 2 - this.enemyDanger();
      if (Phaser.Math.Between(1, 100) <= chance) {
        this.battle.log.push("The party escaped!");
        this.finishBattle(false);
      } else this.battle.log.push("Could not escape!");
      return true;
    }
    if (action.type === "attack") {
      const target = this.getLivingEnemy(action.targetIndex);
      if (!target) return false;
      const damage = this.physicalDamage(this.attackPower(actor), this.effectiveEnemyDefense(target), actor.luck);
      target.hp = Math.max(0, target.hp - damage.amount);
      this.battle.log.push(`${actor.name} hits ${target.name} for ${damage.amount}${damage.critical ? " critical" : ""}.`);
      this.audio.blip("hit");
      return true;
    }
    if (action.type === "skill" && action.skillId) {
      return this.usePlayerSkill(actor, action.skillId, action.targetIndex);
    }
    if (action.type === "spell" && action.spellId) {
      return this.castSpell(actor, action.spellId, action.targetIndex);
    }
    if (action.type === "item" && action.itemId) {
      return this.useBattleItem(actor, action.itemId, action.targetIndex);
    }
    return false;
  }

  private resolveEnemyAction(action: BattleAction): boolean {
    if (!this.battle) return false;
    const enemy = this.battle.enemies.find((e) => e.uid === action.actorId);
    if (!enemy || enemy.hp <= 0) return true;
    this.battle.log = [];
    const move = enemy.intent?.move ?? Phaser.Utils.Array.GetRandom(enemy.moves);
    if (enemy.intent?.message) this.battle.log.push(enemy.intent.message);
    enemy.intent = undefined;
    if (move.kind === "defend") {
      enemy.statuses.guarded = 2;
      this.battle.log.push(`${enemy.name} braces behind its guard.`);
      enemy.intent = this.planEnemyIntent(enemy);
      return true;
    }
    if (move.kind === "heal") {
      const allies = this.battle.enemies.filter((candidate) => candidate.hp > 0);
      const target = allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? enemy;
      const amount = Math.min(target.maxHp - target.hp, move.power + Phaser.Math.Between(0, 8));
      target.hp += Math.max(0, amount);
      this.battle.log.push(`${enemy.name}'s ${move.name} restores ${amount} HP to ${target.name}.`);
      enemy.intent = this.planEnemyIntent(enemy);
      return true;
    }
    if (move.kind === "charge") {
      enemy.statuses.guarded = 2;
      enemy.statuses.charged = 2;
      this.battle.log.push(`${enemy.name} gathers power for the next strike.`);
      enemy.intent = this.planEnemyIntent(enemy);
      return true;
    }
    if (move.kind === "steal") {
      const stolen = Math.min(this.gold, move.power + Phaser.Math.Between(0, 8));
      this.gold -= stolen;
      const target = this.randomLivingPartyMember();
      if (target) {
        const chip = Math.max(1, enemy.attack - this.defensePower(target) + 3);
        target.hp = Math.max(0, target.hp - chip);
        this.battle.log.push(`${enemy.name}'s ${move.name} clips ${target.name} for ${chip} and steals ${stolen} gold.`);
      } else this.battle.log.push(`${enemy.name} steals ${stolen} gold.`);
      enemy.intent = this.planEnemyIntent(enemy);
      return true;
    }
    if (move.kind === "status") {
      const targets = move.target === "all" ? this.party.filter((c) => c.hp > 0) : [this.randomLivingPartyMember()].filter(Boolean) as CharacterState[];
      for (const target of targets) {
        if (Phaser.Math.Between(1, 100) <= 58) {
          target.statuses[move.status!] = move.status === "poison" ? 99 : Phaser.Math.Between(2, 4);
          this.battle.log.push(`${enemy.name}'s ${move.name} inflicts ${move.status} on ${target.name}.`);
        } else this.battle.log.push(`${target.name} resists ${move.name}.`);
      }
      enemy.intent = this.planEnemyIntent(enemy);
      return true;
    }
    const targets = move.target === "all" ? this.party.filter((c) => c.hp > 0) : [this.randomLivingPartyMember()].filter(Boolean) as CharacterState[];
    for (const target of targets) {
      const raw = enemy.attack + move.power + (enemy.statuses.charged ? 8 : 0) + Phaser.Math.Between(0, 4);
      let damage = Math.max(1, raw - this.defensePower(target));
      if (target.defending) damage = Math.ceil(damage * 0.45);
      if (target.statuses.guarded) damage = Math.ceil(damage * 0.55);
      if (target.statuses.starveil) damage = Math.ceil(damage * 0.65);
      target.hp = Math.max(0, target.hp - damage);
      this.battle.log.push(`${enemy.name}'s ${move.name} hits ${target.name} for ${damage}.`);
      if (move.status && target.hp > 0 && Phaser.Math.Between(1, 100) <= 40) {
        target.statuses[move.status] = move.status === "poison" ? 99 : 3;
        this.battle.log.push(`${target.name} suffers ${move.status}.`);
      }
      this.audio.blip("hit");
    }
    if (enemy.statuses.charged) delete enemy.statuses.charged;
    enemy.intent = this.planEnemyIntent(enemy);
    return true;
  }

  private usePlayerSkill(actor: CharacterState, skillId: string, targetIndex?: number): boolean {
    if (!this.battle) return false;
    const skill = PLAYER_SKILLS[skillId];
    if (!skill) return false;
    if ((actor.skillCooldowns[skill.id] ?? 0) > 0) {
      this.battle.log.push(`${skill.name} is still cooling down.`);
      return false;
    }
    this.battle.log = [];
    if (skill.id === "powerStrike") {
      const target = this.getLivingEnemy(targetIndex);
      if (!target) return false;
      const damage = this.physicalDamage(this.attackPower(actor) + 12, this.effectiveEnemyDefense(target), actor.luck);
      target.hp = Math.max(0, target.hp - damage.amount);
      this.battle.log.push(`${actor.name} uses Power Strike for ${damage.amount}${damage.critical ? " critical" : ""}.`);
      this.setSkillCooldown(actor, skill);
      this.audio.blip("hit");
      return true;
    }
    if (skill.id === "guardBreak") {
      const target = this.getLivingEnemy(targetIndex);
      if (!target) return false;
      const damage = this.physicalDamage(this.attackPower(actor) + 4, this.effectiveEnemyDefense(target), actor.luck);
      target.hp = Math.max(0, target.hp - damage.amount);
      target.statuses.weakness = 3;
      this.battle.log.push(`${actor.name} cracks ${target.name}'s guard for ${damage.amount}. Weakness takes hold.`);
      this.setSkillCooldown(actor, skill);
      this.audio.blip("hit");
      return true;
    }
    if (skill.id === "quickSlash") {
      const target = this.getLivingEnemy(targetIndex);
      if (!target) return false;
      const damage = this.physicalDamage(this.attackPower(actor) - 1, this.effectiveEnemyDefense(target), actor.luck + 10);
      target.hp = Math.max(0, target.hp - damage.amount);
      this.battle.log.push(`${actor.name} flashes in with Quick Slash for ${damage.amount}${damage.critical ? " critical" : ""}.`);
      this.setSkillCooldown(actor, skill);
      this.audio.blip("hit");
      return true;
    }
    if (skill.id === "fireSpark") {
      const target = this.getLivingEnemy(targetIndex);
      if (!target) return false;
      let amount = 22 + actor.level * 4 + Phaser.Math.Between(0, 7) - Math.floor(target.defense / 2);
      if (target.weak.includes("fire")) amount = Math.floor(amount * 1.45);
      if (target.resist.includes("fire")) amount = Math.floor(amount * 0.55);
      amount = Math.max(3, amount);
      target.hp = Math.max(0, target.hp - amount);
      if (Phaser.Math.Between(1, 100) <= 45) target.statuses.burn = 3;
      this.battle.log.push(`${actor.name} casts Fire Spark. ${target.name} takes ${amount}${target.statuses.burn ? " and burns" : ""}.`);
      this.setSkillCooldown(actor, skill);
      this.audio.blip("spell");
      return true;
    }
    if (skill.id === "firstAid") {
      const target = this.party[targetIndex ?? this.party.indexOf(actor)];
      if (!target || target.hp <= 0) {
        this.battle.log.push("First Aid needs a standing ally.");
        return false;
      }
      const amount = 22 + actor.level * 3;
      target.hp = Math.min(target.maxHp, target.hp + amount);
      delete target.statuses.bleed;
      this.battle.log.push(`${actor.name} uses First Aid. ${target.name} recovers ${amount}.`);
      this.setSkillCooldown(actor, skill);
      this.audio.blip("spell");
      return true;
    }
    if (skill.id === "focus") {
      actor.statuses.guarded = 2;
      for (const tier of ["1", "2", "3"]) {
        const charge = actor.charges[tier];
        if (charge && charge.current < charge.max) {
          charge.current += 1;
          break;
        }
      }
      this.battle.log.push(`${actor.name} focuses, guarding and steadying their magic.`);
      this.setSkillCooldown(actor, skill);
      this.audio.blip("spell");
      return true;
    }
    return false;
  }

  private setSkillCooldown(actor: CharacterState, skill: PlayerSkillDef) {
    actor.skillCooldowns[skill.id] = skill.cooldown;
  }

  private castSpell(actor: CharacterState, spellId: string, targetIndex?: number): boolean {
    if (!this.battle) return false;
    const spell = SPELLS[spellId];
    const charge = actor.charges[String(spell.tier)];
    if (!charge || charge.current <= 0) {
      this.battle.log.push(`${actor.name} lacks a T${spell.tier} charge.`);
      return false;
    }
    if (spell.kind === "heal") {
      const targets = spell.target === "allAllies" ? this.party.filter((c) => c.hp > 0) : [this.party[targetIndex ?? 0]].filter(Boolean);
      if (!targets.some((target) => target.hp > 0)) {
        this.battle.log.push(`${spell.name} needs a standing ally.`);
        return false;
      }
      charge.current -= 1;
      this.audio.blip("spell");
      for (const target of targets) {
        if (target.hp <= 0) continue;
        const amount = spell.power + actor.level * 4 + Phaser.Math.Between(0, 8);
        target.hp = Math.min(target.maxHp, target.hp + amount);
        this.battle.log.push(`${actor.name} casts ${spell.name}. ${target.name} recovers ${amount}.`);
      }
      return true;
    }
    if (spell.kind === "revive") {
      const target = this.party[targetIndex ?? 0];
      if (!target || target.hp > 0) {
        this.battle.log.push(`${spell.name} finds no fallen ally.`);
        return false;
      }
      charge.current -= 1;
      this.audio.blip("spell");
      target.hp = Math.max(1, Math.floor(target.maxHp * 0.35));
      target.statuses = {};
      this.battle.log.push(`${target.name} rises with ${target.hp} HP.`);
      return true;
    }
    if (spell.kind === "buff") {
      const targets = spell.target === "allAllies" ? this.party.filter((c) => c.hp > 0) : [this.party[targetIndex ?? 0]].filter(Boolean);
      if (!targets.some((target) => target.hp > 0)) {
        this.battle.log.push(`${spell.name} needs a standing ally.`);
        return false;
      }
      charge.current -= 1;
      this.audio.blip("spell");
      for (const target of targets) {
        if (spell.id === "starveil") target.statuses.starveil = 4;
        else target.statuses.ward = 4;
      }
      this.battle.log.push(`${actor.name} casts ${spell.name}. A guard of starlight rises.`);
      return true;
    }
    const targets = spell.target === "allEnemies" ? this.battle.enemies.filter((e) => e.hp > 0) : [this.getLivingEnemy(targetIndex)].filter(Boolean) as EnemyState[];
    if (!targets.length) return false;
    charge.current -= 1;
    this.audio.blip("spell");
    for (const target of targets) {
      let amount = spell.power + actor.level * 5 + Phaser.Math.Between(0, 8) - Math.floor(this.effectiveEnemyDefense(target) / 2);
      if (target.weak.includes(spell.element)) amount = Math.floor(amount * 1.45);
      if (target.resist.includes(spell.element)) amount = Math.floor(amount * 0.55);
      if (target.statuses.weakness) amount = Math.floor(amount * 1.2);
      if (target.statuses.guarded) amount = Math.ceil(amount * 0.7);
      amount = Math.max(2, amount);
      target.hp = Math.max(0, target.hp - amount);
      this.battle.log.push(`${actor.name} casts ${spell.name}. ${target.name} takes ${amount}.`);
    }
    return true;
  }

  private useBattleItem(actor: CharacterState, itemId: string, targetIndex?: number): boolean {
    if (!this.battle) return false;
    if ((this.inventory[itemId] ?? 0) <= 0) {
      this.battle.log.push(`No ${ITEMS[itemId]?.name ?? "item"} left.`);
      return false;
    }
    if (itemId === "smokeBomb") {
      if (!this.battle.canRun) {
        this.battle.log.push("Smoke curls, but the boss will not let you flee.");
        return false;
      } else {
        this.inventory[itemId] -= 1;
        this.battle.log.push(`${actor.name} throws a Smoke Bomb. The party escapes.`);
        this.finishBattle(false);
      }
      return true;
    }
    if (itemId === "etherleaf") {
      this.inventory[itemId] -= 1;
      for (const member of this.party) {
        for (const tier of ["1", "2", "3"]) {
          const charge = member.charges[tier];
          if (charge) charge.current = Math.min(charge.max, charge.current + 1);
        }
      }
      this.battle.log.push(`${actor.name} crushes Etherleaf. Spell charges return.`);
      return true;
    }
    const target = this.party[targetIndex ?? 0];
    if (!target) return false;
    if (itemId === "potion") {
      if (target.hp <= 0) {
        this.battle.log.push("Potion needs a standing ally.");
        return false;
      }
      this.inventory[itemId] -= 1;
      const amount = 35;
      target.hp = Math.min(target.maxHp, target.hp + amount);
      this.battle.log.push(`${actor.name} uses Potion. ${target.name} recovers ${amount}.`);
      return true;
    } else if (itemId === "antidote") {
      if (!target.statuses.poison) {
        this.battle.log.push(`${target.name} is not poisoned.`);
        return false;
      }
      this.inventory[itemId] -= 1;
      delete target.statuses.poison;
      this.battle.log.push(`${target.name}'s poison fades.`);
      return true;
    } else if (itemId === "phoenixAsh") {
      if (target.hp > 0) {
        this.battle.log.push(`${target.name} is already standing.`);
        return false;
      }
      this.inventory[itemId] -= 1;
      target.hp = Math.floor(target.maxHp * 0.35);
      target.statuses = {};
      this.battle.log.push(`${target.name} rises from Phoenix Ash.`);
      return true;
    }
    return false;
  }

  private getLivingEnemy(index?: number): EnemyState | undefined {
    if (!this.battle) return undefined;
    let target = typeof index === "number" ? this.battle.enemies[index] : undefined;
    if (!target || target.hp <= 0) {
      target = Phaser.Utils.Array.GetRandom(this.battle.enemies.filter((e) => e.hp > 0));
    }
    return target;
  }

  private allEnemiesDefeated(): boolean {
    return !!this.battle && this.battle.enemies.every((e) => e.hp <= 0);
  }

  private allPartyDefeated(): boolean {
    return this.party.every((c) => c.hp <= 0);
  }

  private randomLivingPartyMember(): CharacterState | undefined {
    return Phaser.Utils.Array.GetRandom(this.party.filter((c) => c.hp > 0));
  }

  private consumeSkipStatus(actor: CharacterState | EnemyState): boolean {
    if (actor.statuses.stun) {
      delete actor.statuses.stun;
      return true;
    }
    if (actor.statuses.sleep) {
      if (Phaser.Math.Between(1, 100) <= 45) delete actor.statuses.sleep;
      else {
        actor.statuses.sleep -= 1;
        if (actor.statuses.sleep <= 0) delete actor.statuses.sleep;
        return true;
      }
    }
    return false;
  }

  private applyTurnStartStatuses(actor: CharacterState | EnemyState): boolean {
    if (!this.battle) return false;
    if (actor.hp > 0 && actor.statuses.poison) {
      const damage = Math.max(1, Math.floor(actor.maxHp * 0.05));
      actor.hp = Math.max(0, actor.hp - damage);
      this.battle.log.push(`${actor.name} suffers ${damage} poison damage.`);
      if (actor.hp <= 0) return true;
    }
    if (actor.hp > 0 && actor.statuses.burn) {
      const damage = Math.max(1, Math.floor(actor.maxHp * 0.04));
      actor.hp = Math.max(0, actor.hp - damage);
      this.battle.log.push(`${actor.name} burns for ${damage}.`);
      if (actor.hp <= 0) return true;
    }
    if (actor.hp > 0 && actor.statuses.bleed) {
      const damage = Math.max(1, Math.floor(actor.maxHp * 0.03));
      actor.hp = Math.max(0, actor.hp - damage);
      this.battle.log.push(`${actor.name} bleeds for ${damage}.`);
      if (actor.hp <= 0) return true;
    }
    if (this.consumeSkipStatus(actor)) {
      this.battle.log.push(`${actor.name} cannot act.`);
      return true;
    }
    return false;
  }

  private checkBattleEnd(): boolean {
    if (!this.battle) return true;
    if (this.allEnemiesDefeated()) {
      this.awardVictory();
      return true;
    }
    if (this.allPartyDefeated()) {
      this.battle.log = ["The party falls beneath the dimming stars..."];
      this.mode = "gameOver";
      this.audio.setMode("title");
      return true;
    }
    return false;
  }

  private tickStatus(actor: CharacterState | EnemyState) {
    for (const key of ["ward", "starveil", "silence", "burn", "bleed", "weakness", "guarded", "charged"] as (keyof StatusState)[]) {
      if (actor.statuses[key]) {
        actor.statuses[key]! -= 1;
        if (actor.statuses[key]! <= 0) delete actor.statuses[key];
      }
    }
  }

  private statusActive(actor: CharacterState | EnemyState, status: keyof StatusState): boolean {
    return !!actor.statuses[status];
  }

  private awardVictory() {
    if (!this.battle || this.battle.victoryAwarded) return;
    const xp = this.battle.enemies.reduce((sum, e) => sum + e.xp, 0) * this.settings.xpMultiplier;
    const gold = this.battle.enemies.reduce((sum, e) => sum + e.gold, 0);
    this.gold += gold;
    this.battle.log.push(`Victory! Gained ${xp} XP and ${gold} gold.`);
    for (const member of this.party) {
      member.xp += xp;
      while (member.level < 12 && member.xp >= member.nextXp) {
        member.xp -= member.nextXp;
        member.level += 1;
        member.nextXp = Math.floor(42 + member.level * member.level * 26);
        member.maxHp += member.id === "arlen" ? 9 : member.id === "mira" ? 6 : 5;
        if (member.hp > 0) member.hp = member.maxHp;
        member.baseAttack += member.id === "arlen" ? 2 : 1;
        member.baseDefense += member.id === "arlen" ? 2 : 1;
        if (member.level % 2 === 0) member.speed += 1;
        if (member.level % 3 === 0) member.luck += 1;
        if (member.id === "arlen" && member.level >= 7 && !member.spells.includes("rally")) member.spells.push("rally");
        this.refreshCharges(member, true);
        this.battle.log.push(`${member.name} reached level ${member.level}!`);
      }
    }
    if (this.battle.kind === "random") {
      const bestEnemy = [...this.battle.enemies].sort((a, b) => b.xp + b.gold - (a.xp + a.gold))[0];
      const dropChance = Phaser.Math.Clamp(20 + Math.floor((bestEnemy?.xp ?? 0) / 10), 20, 38);
      if (Phaser.Math.Between(1, 100) <= dropChance) {
        const loot = bestEnemy && bestEnemy.xp > 60 ? Phaser.Utils.Array.GetRandom(["etherleaf", "phoenixAsh", "smokeBomb"]) : Phaser.Utils.Array.GetRandom(["potion", "antidote", "potion"]);
        this.inventory[loot] = (this.inventory[loot] ?? 0) + 1;
        this.battle.log.push(`Found ${ITEMS[loot].name}.`);
      }
    }
    this.battle.victoryAwarded = true;
    this.battle.phase = "log";
    this.audio.blip("victory");
  }

  private advanceBattleLog() {
    if (!this.battle) return;
    if (this.allEnemiesDefeated() && this.battle.victoryAwarded) {
      this.finishBattle(true);
      return;
    }
    if (this.allPartyDefeated()) {
      this.mode = "gameOver";
      this.audio.setMode("title");
      return;
    }
    this.battle.phase = "resolving";
    this.battle.selected = 0;
    this.battle.actionTimer = BATTLE_TURN_DELAY_MS;
  }

  private finishBattle(won: boolean) {
    if (!this.battle) return;
    const wasBoss = this.battle.kind === "boss";
    const dungeonId = this.battle.dungeonId;
    const bossId = this.battle.bossId;
    this.battle = undefined;
    if (!won) {
      this.mode = dungeonId ? "dungeon" : "world";
      this.syncAllVisualPositions();
      this.audio.setMode(this.mode === "dungeon" ? "dungeon" : "world");
      return;
    }
    if (wasBoss && dungeonId && bossId) {
      const dungeon = this.dungeons()[dungeonId];
      this.defeatedBosses.add(bossId);
      this.clearedDungeons.add(dungeonId);
      if (dungeon.relic) this.flags.relics[dungeon.relic] = true;
      this.mode = "dungeon";
      this.syncAllVisualPositions();
      this.audio.setMode("dungeon");
      const extra: string[] = [];
      if (dungeonId === "mossCave") {
        this.gold += 30;
        extra.push("The cave hoard yields 30 gold for passage.");
      }
      if (dungeonId === "tideShrine") {
        this.inventory.charteredCompass = Math.max(1, this.inventory.charteredCompass ?? 0);
        this.flags.travel.unlockedIsland3 = true;
        extra.push("The boss drops a Chartered Compass. Ashfang routes are now charted.");
      }
      if (dungeon.relic === "gale") {
        this.flags.skyship = true;
        extra.push("The Gale Relic reveals a high road. Visit Starfall Gate with all four relics.");
      }
      if (bossId === "eclipseCrown") {
        this.mode = "ending";
        this.audio.setMode("ending");
        this.saveGame();
        return;
      }
      this.saveGame();
      this.say([...dungeon.rewardText, ...extra], () => {
        this.mode = "dungeon";
        this.audio.setMode("dungeon");
      });
    } else {
      this.mode = dungeonId ? "dungeon" : "world";
      this.syncAllVisualPositions();
      this.audio.setMode(this.mode === "dungeon" ? "dungeon" : "world");
    }
  }

  private physicalDamage(power: number, defense: number, luck: number) {
    const critical = Phaser.Math.Between(1, 100) <= Phaser.Math.Clamp(5 + luck, 5, 15);
    const amount = Math.max(1, power + Phaser.Math.Between(0, 4) - defense);
    return { amount: critical ? Math.floor(amount * 1.75) : amount, critical };
  }

  private attackPower(actor: CharacterState): number {
    return actor.baseAttack + (WEAPONS[actor.weapon]?.power ?? 0);
  }

  private defensePower(actor: CharacterState): number {
    return actor.baseDefense + (ARMORS[actor.armor]?.power ?? 0) + (actor.statuses.ward ? 4 : 0) + (actor.statuses.guarded ? 5 : 0);
  }

  private effectiveEnemyDefense(enemy: EnemyState): number {
    return Math.max(0, enemy.defense + (enemy.statuses.guarded ? 5 : 0) - (enemy.statuses.weakness ? 5 : 0));
  }

  private enemyDanger(): number {
    if (!this.battle) return 0;
    return Math.max(...this.battle.enemies.filter((e) => e.hp > 0).map((e) => e.speed + e.attack / 3), 0);
  }

  private partyAverage(stat: "speed" | "luck"): number {
    const living = this.party.filter((c) => c.hp > 0);
    return living.reduce((sum, c) => sum + c[stat], 0) / Math.max(1, living.length);
  }

  private refreshCharges(member: CharacterState, fill: boolean) {
    const tier1 = member.id === "arlen" ? (member.level >= 7 ? 1 : 0) : 2 + Math.floor(member.level / 2);
    const tier2 = member.level >= 4 ? 1 + Math.floor((member.level - 4) / 3) : 0;
    const tier3 = member.level >= 8 ? 1 + Math.floor((member.level - 8) / 4) : 0;
    const maxes = { "1": tier1, "2": member.id === "arlen" ? (member.level >= 7 ? 1 : 0) : tier2, "3": member.id === "arlen" ? 0 : tier3 };
    for (const tier of ["1", "2", "3"]) {
      const current = member.charges[tier]?.current ?? 0;
      member.charges[tier] = { max: maxes[tier], current: fill ? maxes[tier] : Math.min(current, maxes[tier]) };
    }
  }

  private applyWalkPoison() {
    if (this.lastStepFrame % 4 !== 0) return;
    for (const member of this.party) {
      if (member.hp > 1 && member.statuses.poison) member.hp -= 1;
    }
  }

  private hasAllRelics(): boolean {
    return this.flags.relics.root && this.flags.relics.flame && this.flags.relics.tide && this.flags.relics.gale;
  }

  private rememberMenuReturnMode() {
    if (this.mode !== "menu" && this.mode !== "dialogue") this.previousMode = this.mode;
  }

  private openMainMenu() {
    this.rememberMenuReturnMode();
    this.openMenu(
      "Menu",
      [
        { label: "Status", action: () => this.openStatusMenu() },
        { label: "Items", action: () => this.openItemsMenu() },
        { label: "Magic", action: () => this.openFieldMagicMenu() },
        { label: "Equipment", action: () => this.openEquipmentMenu() },
        {
          label: "Save",
          action: () => {
            this.saveGame();
            this.flashMessage("Game saved.");
          },
          disabled: () => this.previousMode === "dungeon"
        },
        { label: "Settings", action: () => this.openSettingsMenu() },
        { label: "Controls", action: () => this.showControls("menu") },
        {
          label: "Quit to Title",
          action: () => {
            this.menu = undefined;
            this.mode = "title";
            this.audio.setMode("title");
          }
        },
        { label: "Close", action: () => this.closeMenu() }
      ],
      () => this.closeMenu(),
      () => `Gold ${this.gold} | Relics ${this.relicCount()}/4 | Encounters ${this.settings.encounters ? "ON" : "OFF"}`
    );
  }

  private openStatusMenu() {
    this.openMenu(
      "Status",
      (this.party.map((c) => ({
        label: () => `${c.name} Lv${c.level} HP ${c.hp}/${c.maxHp} XP ${c.xp}/${c.nextXp}`,
        action: () => this.say([this.characterSheet(c)], () => this.openStatusMenu())
      })) as MenuOption[]).concat([{ label: "Back", action: () => this.openMainMenu() }]),
      () => this.openMainMenu(),
      "All characters receive XP by default, a forgiving modern convenience."
    );
  }

  private characterSheet(c: CharacterState): string {
    const statuses = Object.keys(c.statuses).length ? Object.keys(c.statuses).join(", ") : "none";
    return `${c.name}, ${c.role}
Level ${c.level}
HP ${c.hp}/${c.maxHp}
Attack ${this.attackPower(c)}  Defense ${this.defensePower(c)}
Speed ${c.speed}  Luck ${c.luck}
Weapon ${WEAPONS[c.weapon].name}
Armor ${ARMORS[c.armor].name}
Statuses: ${statuses}`;
  }

  private openItemsMenu() {
    const options: MenuOption[] = Object.keys(ITEMS)
      .filter((id) => (this.inventory[id] ?? 0) > 0)
      .map((id) => ({
        label: () => `${ITEMS[id].name} x${this.inventory[id]} - ${ITEMS[id].description}`,
        action: () => this.openFieldItemTargets(id)
      }));
    options.push({ label: "Back", action: () => this.openMainMenu() });
    this.openMenu("Items", options, () => this.openMainMenu(), "Potions, antidotes, ash, etherleaf, and tents can be used outside battle.");
  }

  private openFieldItemTargets(itemId: string) {
    const item = ITEMS[itemId];
    if (!item.field) {
      this.flashMessage(item.battle ? "That item is for battle." : `${item.name} is a key item.`);
      return;
    }
    if (itemId === "tent") {
      if (this.previousMode === "town") {
        this.flashMessage("Use tents on the road or in safe dungeon rooms.");
        return;
      }
      this.inventory.tent -= 1;
      for (const c of this.party) {
        if (c.hp > 0) c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * 0.55));
      }
      this.saveGame();
      this.say(["The party rests under a small canvas roof. HP partly restored and game saved."], () => this.openItemsMenu());
      return;
    }
    if (itemId === "etherleaf") {
      this.inventory.etherleaf -= 1;
      for (const c of this.party) {
        for (const tier of ["1", "2", "3"]) c.charges[tier].current = Math.min(c.charges[tier].max, c.charges[tier].current + 1);
      }
      this.say(["Etherleaf restores one charge in every spell tier."], () => this.openItemsMenu());
      return;
    }
    this.openMenu(
      `Use ${item.name}`,
      this.party.map((c, idx) => ({
        label: `${c.name} HP ${c.hp}/${c.maxHp}`,
        action: () => {
          if ((this.inventory[itemId] ?? 0) <= 0) return;
          this.inventory[itemId] -= 1;
          if (itemId === "potion") c.hp = Math.min(c.maxHp, c.hp + 35);
          if (itemId === "antidote") delete c.statuses.poison;
          if (itemId === "phoenixAsh" && c.hp <= 0) {
            c.hp = Math.floor(c.maxHp * 0.35);
            c.statuses = {};
          }
          if (itemId === "phoenixAsh" && c.hp > 0 && idx >= 0) this.flashMessage("Phoenix Ash needs a fallen ally.");
          this.openItemsMenu();
        }
      })).concat([{ label: "Back", action: () => this.openItemsMenu() }]),
      () => this.openItemsMenu()
    );
  }

  private openFieldMagicMenu() {
    const casters = this.party.filter((c) => c.spells.length > 0);
    this.openMenu(
      "Magic",
      casters.map((c) => ({
        label: `${c.name} (${Object.values(c.charges).map((v, i) => `T${i + 1} ${v.current}/${v.max}`).join(" ")})`,
        action: () => this.openFieldSpells(c)
      })).concat([{ label: "Back", action: () => this.openMainMenu() }]),
      () => this.openMainMenu()
    );
  }

  private openFieldSpells(caster: CharacterState) {
    const spells = caster.spells.filter((id) => ["heal", "revive", "buff"].includes(SPELLS[id].kind) && caster.level >= SPELLS[id].minLevel);
    this.openMenu(
      `${caster.name} Magic`,
      (spells.map((id) => ({
        label: () => `${SPELLS[id].name} T${SPELLS[id].tier} (${caster.charges[String(SPELLS[id].tier)].current}) - ${SPELLS[id].description}`,
        action: () => this.openFieldSpellTargets(caster, id),
        disabled: () => caster.charges[String(SPELLS[id].tier)].current <= 0
      })) as MenuOption[]).concat([{ label: "Back", action: () => this.openFieldMagicMenu() }]),
      () => this.openFieldMagicMenu()
    );
  }

  private openFieldSpellTargets(caster: CharacterState, spellId: string) {
    const spell = SPELLS[spellId];
    const charge = caster.charges[String(spell.tier)];
    if (charge.current <= 0) return;
    if (spell.target === "allAllies") {
      charge.current -= 1;
      for (const c of this.party.filter((p) => p.hp > 0)) {
        if (spell.kind === "heal") c.hp = Math.min(c.maxHp, c.hp + spell.power + caster.level * 4);
        if (spell.id === "starveil") c.statuses.starveil = 4;
      }
      this.say([`${caster.name} casts ${spell.name}.`], () => this.openFieldMagicMenu());
      return;
    }
    this.openMenu(
      spell.name,
      this.party.map((target) => ({
        label: `${target.name} HP ${target.hp}/${target.maxHp}`,
        action: () => {
          charge.current -= 1;
          if (spell.kind === "heal" && target.hp > 0) target.hp = Math.min(target.maxHp, target.hp + spell.power + caster.level * 4);
          if (spell.kind === "revive" && target.hp <= 0) {
            target.hp = Math.floor(target.maxHp * 0.35);
            target.statuses = {};
          }
          if (spell.kind === "buff") target.statuses.ward = 4;
          this.openFieldMagicMenu();
        }
      })).concat([{ label: "Back", action: () => this.openFieldSpells(caster) }]),
      () => this.openFieldSpells(caster)
    );
  }

  private openEquipmentMenu() {
    const options: MenuOption[] = [];
    for (const c of this.party) {
      options.push({ label: `${c.name} weapon: ${WEAPONS[c.weapon].name}`, action: () => this.openEquipList(c, "weapon") });
      options.push({ label: `${c.name} armor: ${ARMORS[c.armor].name}`, action: () => this.openEquipList(c, "armor") });
    }
    options.push({ label: "Back", action: () => this.openMainMenu() });
    this.openMenu("Equipment", options, () => this.openMainMenu(), "Bought and treasure gear is kept in the party pack.");
  }

  private openEquipList(member: CharacterState, kind: GearDef["kind"]) {
    const pool = Object.keys(this.gearBag).filter((id) => this.gearBag[id] > 0 && GEAR[id].kind === kind && GEAR[id].users.includes(member.id));
    this.openMenu(
      `${member.name} ${kind}`,
      pool.map((id) => ({
        label: `${GEAR[id].name} +${GEAR[id].power} (${this.gearBag[id]})`,
        action: () => {
          member[kind] = id;
          this.openEquipmentMenu();
        }
      })).concat([{ label: "Back", action: () => this.openEquipmentMenu() }]),
      () => this.openEquipmentMenu()
    );
  }

  private openSettingsMenu() {
    this.openMenu(
      "Settings",
      [
        {
          label: () => `Random Encounters: ${this.settings.encounters ? "ON" : "OFF"}`,
          action: () => {
            this.settings.encounters = !this.settings.encounters;
            this.openSettingsMenu();
          }
        },
        {
          label: () => `XP Multiplier: ${this.settings.xpMultiplier}x`,
          action: () => {
            this.settings.xpMultiplier = this.settings.xpMultiplier === 1 ? 2 : this.settings.xpMultiplier === 2 ? 4 : 1;
            this.openSettingsMenu();
          }
        },
        {
          label: () => `Fast Text: ${this.settings.fastText ? "ON" : "OFF"}`,
          action: () => {
            this.settings.fastText = !this.settings.fastText;
            this.openSettingsMenu();
          }
        },
        {
          label: () => `Mute: ${this.settings.muted ? "ON" : "OFF"}`,
          action: () => {
            this.settings.muted = !this.settings.muted;
            this.audio.setMuted(this.settings.muted);
            this.openSettingsMenu();
          }
        },
        { label: "Back", action: () => this.openMainMenu() }
      ],
      () => this.openMainMenu()
    );
  }

  private openDebugMenu() {
    this.rememberMenuReturnMode();
    this.openMenu(
      "Debug",
      [
        {
          label: "Give 500 gold",
          action: () => {
            this.gold += 500;
            this.openDebugMenu();
          }
        },
        {
          label: "Heal party",
          action: () => {
            this.restoreParty(true);
            this.openDebugMenu();
          }
        },
        {
          label: "Start encounter",
          action: () => this.startRandomBattle(WORLD_TABLES.plains)
        },
        {
          label: "Toggle relics",
          action: () => {
            const all = this.hasAllRelics();
            this.flags.relics = { root: !all, flame: !all, tide: !all, gale: !all };
            this.flags.boat = !all;
            this.flags.skyship = !all;
            this.flags.gateOpen = !all;
            this.flags.travel.unlockedIsland2 = true;
            this.flags.travel.unlockedIsland3 = !all;
            this.openDebugMenu();
          }
        },
        { label: "Back", action: () => this.closeMenu() }
      ],
      () => this.closeMenu(),
      "Hidden F9 menu for testing."
    );
  }

  private openInn(town: TownDef) {
    this.openMenu(
      `${town.name} Inn`,
      [
        {
          label: `Rest and save (${town.innPrice} gold)`,
          action: () => {
            if (this.gold < town.innPrice) {
              this.flashMessage("Not enough gold.");
              return;
            }
            this.gold -= town.innPrice;
            this.restoreParty(true);
            this.saveGame();
            this.say(["The party rests. HP and spell charges restored. Game saved."], () => {
              this.closeMenuTo("town");
            });
          }
        },
        { label: "Leave", action: () => this.closeMenuTo("town") }
      ],
      () => this.closeMenuTo("town")
    );
  }

  private openClinic(town: TownDef) {
    this.openMenu(
      `${town.name} Clinic`,
      this.party.map((c) => ({
        label: `${c.name} ${c.hp > 0 ? "standing" : "fallen"} (${town.clinicPrice} gold)`,
        action: () => {
          if (c.hp > 0) {
            this.flashMessage("They are already standing.");
            return;
          }
          if (this.gold < town.clinicPrice) {
            this.flashMessage("Not enough gold.");
            return;
          }
          this.gold -= town.clinicPrice;
          c.hp = Math.floor(c.maxHp * 0.5);
          c.statuses = {};
          this.openClinic(town);
        }
      })).concat([{ label: "Leave", action: () => this.closeMenuTo("town") }]),
      () => this.closeMenuTo("town")
    );
  }

  private openShop(title: string, stock: { id: string; type: "item" | "gear" }[]) {
    this.openMenu(
      title,
      (stock.map((entry) => ({
        label: () => {
          if (entry.type === "item") return `${ITEMS[entry.id].name} ${ITEMS[entry.id].price}g - ${ITEMS[entry.id].description}`;
          return `${GEAR[entry.id].name} ${GEAR[entry.id].price}g - ${GEAR[entry.id].description}`;
        },
        action: () => {
          const price = entry.type === "item" ? ITEMS[entry.id].price : GEAR[entry.id].price;
          if (this.gold < price) {
            this.flashMessage("Not enough gold.");
            return;
          }
          this.gold -= price;
          if (entry.type === "item") this.inventory[entry.id] = (this.inventory[entry.id] ?? 0) + 1;
          else this.gearBag[entry.id] = (this.gearBag[entry.id] ?? 0) + 1;
          this.openShop(title, stock);
        }
      })) as MenuOption[]).concat([{ label: "Leave", action: () => this.closeMenuTo("town") }]),
      () => this.closeMenuTo("town"),
      () => `Gold ${this.gold}`
    );
  }

  private openMagicShop(town: TownDef) {
    this.openMenu(
      `${town.name} Magic`,
      (town.spellStock.map((id) => ({
        label: () => `${SPELLS[id].name} ${SPELLS[id].price}g - ${SPELLS[id].description}`,
        action: () => {
          const spell = SPELLS[id];
          const learner = this.party.find((c) => c.id === spell.caster);
          if (!learner) return;
          if (learner.spells.includes(id)) {
            this.flashMessage("Already learned.");
            return;
          }
          if (this.gold < spell.price) {
            this.flashMessage("Not enough gold.");
            return;
          }
          this.gold -= spell.price;
          learner.spells.push(id);
          this.openMagicShop(town);
        }
      })) as MenuOption[]).concat([{ label: "Leave", action: () => this.closeMenuTo("town") }]),
      () => this.closeMenuTo("town"),
      () => `Gold ${this.gold}`
    );
  }

  private showControls(returnTo: "title" | "menu") {
    const done = () => {
      if (returnTo === "title") this.mode = "title";
      else this.openMainMenu();
    };
    this.say(
      [
        "Controls: Arrow keys or WASD move and select. Enter, Space, or Z confirms.",
        "Escape or X cancels and opens the menu. Shift moves faster while exploring.",
        "M toggles mute. F toggles fullscreen. F9 opens a hidden debug menu."
      ],
      done
    );
  }

  private restoreParty(fullCharges: boolean) {
    for (const c of this.party) {
      c.hp = c.maxHp;
      delete c.statuses.poison;
      delete c.statuses.sleep;
      if (fullCharges) this.refreshCharges(c, true);
    }
  }

  private say(lines: string[], done?: () => void) {
    this.clearHeldMovement();
    const returnMode = this.mode;
    if (returnMode !== "dialogue" && returnMode !== "menu") this.previousMode = returnMode;
    this.dialogue = {
      lines,
      index: 0,
      done: done ?? (() => {
        this.mode = returnMode === "dialogue" ? this.previousMode : returnMode;
      })
    };
    this.mode = "dialogue";
    this.markDirty();
  }

  private flashMessage(message: string) {
    const returnMode = this.mode;
    this.say([message], () => {
      this.mode = returnMode;
    });
  }

  private openMenu(title: string, options: MenuOption[], cancel: () => void, footer?: string | (() => string)) {
    this.rememberMenuReturnMode();
    this.clearHeldMovement();
    this.menu = { title, options, selected: 0, cancel, footer };
    this.mode = "menu";
    this.markDirty();
  }

  private closeMenu() {
    this.mode = this.menuReturnMode();
    this.menu = undefined;
    this.markDirty();
  }

  private closeMenuTo(mode: Mode) {
    this.mode = mode;
    this.menu = undefined;
    if (mode !== "menu" && mode !== "dialogue") this.previousMode = mode;
    this.markDirty();
  }

  private menuReturnMode(): Mode {
    if (this.previousMode === "menu" || this.previousMode === "dialogue") {
      return this.generatedWorld ? "world" : "title";
    }
    return this.previousMode;
  }

  private adjustMenu(delta: number) {
    if (!this.menu) return;
    const total = this.menu.options.length;
    this.menu.selected = wrap(this.menu.selected + delta, total);
    this.audio.blip("confirm");
  }

  private adjustTitle(delta: number) {
    this.titleSelected = wrap(this.titleSelected + delta, this.titleOptions.length);
    this.audio.blip("confirm");
  }

  private serviceAt(x: number, y: number): ServiceKind | undefined {
    return TOWN_SERVICES.find((z) => Math.abs(z.x - x) + Math.abs(z.y - y) <= 1)?.kind;
  }

  private relicCount(): number {
    return Object.values(this.flags.relics).filter(Boolean).length;
  }

  private saveGame() {
    const payload = {
      party: this.party,
      inventory: this.inventory,
      gearBag: this.gearBag,
      gold: this.gold,
      worldSeed: this.worldSeed,
      currentIslandId: this.currentIslandId,
      worldPos: this.worldPos,
      townPos: this.townPos,
      dungeonPos: this.dungeonPos,
      currentTown: this.currentTown,
      currentDungeon: this.currentDungeon,
      dungeonFloor: this.dungeonFloor,
      flags: this.flags,
      openedChests: [...this.openedChests],
      discoveredPois: [...this.discoveredPois],
      puzzleFlags: [...this.puzzleFlags],
      defeatedBosses: [...this.defeatedBosses],
      clearedDungeons: [...this.clearedDungeons],
      settings: this.settings,
      encounterCounter: this.encounterCounter
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  }

  private loadGame(): boolean {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      this.buildWorldFromSeed(data.worldSeed ?? createWorldSeed());
      this.party = this.normalizeParty(data.party ?? []);
      this.inventory = { potion: 0, antidote: 0, tent: 0, phoenixAsh: 0, etherleaf: 0, smokeBomb: 0, charteredCompass: 0, ...(data.inventory ?? {}) };
      this.gearBag = data.gearBag ?? {};
      this.gold = data.gold ?? 0;
      this.currentIslandId = data.currentIslandId ?? getIslandAt(this.generatedWorld!, data.worldPos?.x ?? 0, data.worldPos?.y ?? 0)?.id ?? "greenhaven";
      this.worldPos = data.worldPos ?? this.generatedWorld?.startPosition ?? { x: 10, y: 22 };
      this.townPos = data.townPos ?? { x: 10, y: 12 };
      this.dungeonPos = data.dungeonPos ?? { x: 1, y: 1 };
      this.currentTown = data.currentTown ?? "dawnford";
      this.currentDungeon = data.currentDungeon ?? "mossCave";
      this.dungeonFloor = data.dungeonFloor ?? 0;
      this.flags = this.normalizeFlags(data.flags);
      this.openedChests = new Set(data.openedChests ?? []);
      this.discoveredPois = new Set(data.discoveredPois ?? data.discoveredPoints ?? []);
      this.puzzleFlags = new Set(data.puzzleFlags ?? []);
      this.defeatedBosses = new Set(data.defeatedBosses ?? []);
      this.clearedDungeons = new Set(data.clearedDungeons ?? []);
      this.settings = { ...this.settings, ...data.settings };
      this.audio.setMuted(this.settings.muted);
      this.encounterCounter = data.encounterCounter ?? 10;
      this.ensureValidDungeonPosition();
      if (!this.canOccupyExploreTile("world", this.worldPos.x, this.worldPos.y)) {
        this.worldPos = { ...(this.generatedWorld?.startPosition ?? { x: 10, y: 22 }) };
      }
      this.syncCurrentIslandFromWorldPos();
      this.mode = "world";
      this.clearHeldMovement();
      this.syncAllVisualPositions();
      this.audio.setMode("world");
      this.markDirty();
      return true;
    } catch {
      return false;
    }
  }

  private draw() {
    this.dirty = false;
    this.clearImages();
    this.g.clear();
    this.ui.clear();
    this.clearText();
    if (this.mode === "title") this.drawTitle();
    else if (this.mode === "world") this.drawWorld();
    else if (this.mode === "town") this.drawTown();
    else if (this.mode === "dungeon") this.drawDungeon();
    else if (this.mode === "dialogue") this.drawDialogue();
    else if (this.mode === "menu") this.drawMenuScreen();
    else if (this.mode === "battle") this.drawBattle();
    else if (this.mode === "gameOver") this.drawGameOver();
    else if (this.mode === "ending") this.drawEnding();
  }

  private clearText() {
    for (const text of this.texts) text.destroy();
    this.texts = [];
  }

  private clearImages() {
    for (const image of this.images) image.destroy();
    this.images = [];
  }

  private text(
    x: number,
    y: number,
    value: string,
    size = 18,
    color = "#ffffff",
    align: "left" | "center" = "left",
    options: { stroke?: string; strokeThickness?: number; wordWrapWidth?: number; fontStyle?: string } = {}
  ) {
    const strokeThickness = options.strokeThickness ?? (size >= 14 ? 2 : 1);
    const scaledSize = size * PIXEL_ART_SCALE;
    const t = this.add.text(x * PIXEL_ART_SCALE, y * PIXEL_ART_SCALE, value, {
      fontFamily: 'Consolas, ui-monospace, "Courier New", monospace',
      fontSize: `${scaledSize}px`,
      fontStyle: options.fontStyle ?? "bold",
      color,
      align,
      lineSpacing: Math.max(2, Math.floor(scaledSize * 0.22)),
      stroke: options.stroke ?? "#050812",
      strokeThickness: strokeThickness * PIXEL_ART_SCALE,
      wordWrap: { width: (options.wordWrapWidth ?? (align === "center" ? WIDTH - 120 : WIDTH - x - 24)) * PIXEL_ART_SCALE }
    });
    t.setResolution(2);
    t.setDepth(LAYER_TEXT);
    t.setPadding(1, 0, 1, 1);
    if (align === "center") t.setOrigin(0.5, 0);
    this.texts.push(t);
    return t;
  }

  private hasTexture(key: AssetKey): boolean {
    return this.textures.exists(key);
  }

  private configureTextureFiltering() {
    for (const [key] of ASSET_PATHS) {
      if (!this.textures.exists(key)) continue;
      const filter = key.startsWith("battle_bg_") ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST;
      this.textures.get(key).setFilter(filter);
    }
  }

  private drawTexture(
    key: AssetKey,
    x: number,
    y: number,
    width: number,
    height: number,
    depth = LAYER_WORLD_IMAGE,
    alpha = 1,
    tint?: number,
    flipX = false,
    flipY = false
  ) {
    const image = this.add.image(x * PIXEL_ART_SCALE, y * PIXEL_ART_SCALE, key);
    image.setOrigin(0, 0);
    image.setDisplaySize(width * PIXEL_ART_SCALE, height * PIXEL_ART_SCALE);
    image.setDepth(depth);
    image.setAlpha(alpha);
    image.setScrollFactor(0);
    image.setFlipX(flipX);
    image.setFlipY(flipY);
    if (tint !== undefined) image.setTint(tint);
    this.images.push(image);
    return image;
  }

  private drawCroppedTexture(
    key: AssetKey,
    x: number,
    y: number,
    cropX: number,
    cropY: number,
    cropWidth: number,
    cropHeight: number,
    displayWidth: number,
    displayHeight: number,
    depth = LAYER_WORLD_IMAGE,
    alpha = 1,
    tint?: number,
    rotation: RoadRotation = 0
  ) {
    const frameKey = `${key}:${cropX},${cropY},${cropWidth},${cropHeight}`;
    const texture = this.textures.get(key);
    if (!texture.has(frameKey)) texture.add(frameKey, 0, cropX, cropY, cropWidth, cropHeight);
    const originX = rotation ? x + displayWidth / 2 : x;
    const originY = rotation ? y + displayHeight / 2 : y;
    const image = this.add.image(originX * PIXEL_ART_SCALE, originY * PIXEL_ART_SCALE, key, frameKey);
    image.setOrigin(rotation ? 0.5 : 0, rotation ? 0.5 : 0);
    image.setDisplaySize(displayWidth * PIXEL_ART_SCALE, displayHeight * PIXEL_ART_SCALE);
    image.setDepth(depth);
    image.setAlpha(alpha);
    image.setScrollFactor(0);
    if (rotation) image.setRotation(Phaser.Math.DegToRad(rotation));
    if (tint !== undefined) image.setTint(tint);
    this.images.push(image);
    return image;
  }

  private drawCharacterSpriteFrame(
    classId: CharacterSpriteClass,
    frameName: CharacterSpriteFrameName,
    bodyCenterX: number,
    feetBaselineY: number,
    displayCellWidth: number,
    depth = LAYER_CHARACTER_IMAGE,
    alpha = 1
  ): boolean {
    const texture = CHARACTER_CLASS_TEXTURES[classId];
    if (!this.hasTexture(texture)) return false;
    const sprite = CHARACTER_SPRITES[classId];
    const frame = sprite.frames[frameName];
    const scale = displayCellWidth / sprite.grid.cellWidth;
    const displayWidth = sprite.grid.cellWidth * scale;
    const displayHeight = sprite.grid.cellHeight * scale;
    const x = bodyCenterX - sprite.anchor.bodyCenterX * scale;
    const y = feetBaselineY - sprite.anchor.feetBaselineY * scale;
    this.drawCroppedTexture(
      texture,
      x,
      y,
      frame.col * sprite.grid.cellWidth,
      frame.row * sprite.grid.cellHeight,
      sprite.grid.cellWidth,
      sprite.grid.cellHeight,
      displayWidth,
      displayHeight,
      depth,
      alpha
    );
    return true;
  }

  private explorationCharacterFrame(stepFrame: number): CharacterSpriteFrameName {
    const suffix = stepFrame % 2 === 0 ? "a" : "b";
    if (this.lastMoveDir.x < 0) return `walk_left_${suffix}` as CharacterSpriteFrameName;
    if (this.lastMoveDir.x > 0) return `walk_right_${suffix}` as CharacterSpriteFrameName;
    if (this.lastMoveDir.y < 0) return `walk_up_${suffix}` as CharacterSpriteFrameName;
    return `walk_down_${suffix}` as CharacterSpriteFrameName;
  }

  private battleCharacterFrame(member: CharacterState): CharacterSpriteFrameName {
    const animation = this.battle?.animation;
    if (animation?.action.side === "party" && animation.action.actorId === member.id) {
      if (animation.action.type === "attack" || animation.action.type === "skill") {
        return animation.elapsed < animation.impactAt * 0.58 ? "attack_windup_left" : "attack_release_left";
      }
      return animation.elapsed < animation.impactAt ? "walk_left_b" : "walk_left_a";
    }
    return "walk_left_a";
  }

  private drawTileTexture(key: AssetKey | undefined, x: number, y: number, depth = LAYER_WORLD_IMAGE, flipX = false, flipY = false): boolean {
    if (!key || !this.hasTexture(key)) return false;
    this.drawTexture(key, x, y, TILE, TILE, depth, 1, undefined, flipX, flipY);
    return true;
  }

  private drawDungeonAtlasTile(tileId: DungeonTileId | undefined, x: number, y: number, depth = LAYER_WORLD_IMAGE, alpha = 1): boolean {
    if (!tileId || !this.hasTexture(DUNGEON_ATLAS.textureKey)) return false;
    const tile = dungeonTileById(tileId);
    if (!tile) return false;
    const rect = dungeonAtlasSourceRectWithInset(tile.source);
    this.drawCroppedTexture(
      DUNGEON_ATLAS.textureKey,
      x,
      y,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      TILE,
      TILE,
      depth,
      alpha
    );
    return true;
  }

  private dungeonThemeTiles(dungeon: DungeonDef): DungeonThemeTiles {
    return DUNGEON_THEME_TILES[dungeon.id] ?? DEFAULT_DUNGEON_THEME_TILES;
  }

  private pickDungeonAtlasTile(ids: DungeonTileId[], dungeon: DungeonDef, tileX: number, tileY: number, salt = 0): DungeonTileId {
    const hash = this.dungeonTileHash(dungeon.id, tileX, tileY, this.dungeonFloor + salt);
    return this.pickWeightedDungeonAtlasTile(ids, hash);
  }

  private pickWeightedDungeonAtlasTile(ids: DungeonTileId[], hash: number): DungeonTileId {
    if (ids.length <= 1) return ids[0];
    const roll = (hash % 1000) / 1000;
    if (roll < 0.72) return ids[0];
    if (roll < 0.88) return ids[1] ?? ids[0];
    if (roll < 0.96) return ids[2] ?? ids[ids.length - 1];
    return ids[3 + ((hash >>> 8) % Math.max(1, ids.length - 3))] ?? ids[ids.length - 1];
  }

  private dungeonTileHash(dungeonId: string, tileX: number, tileY: number, salt: number): number {
    let hash = Math.imul(tileX + 1, 73856093) ^ Math.imul(tileY + 1, 19349663) ^ Math.imul(salt + 1, 83492791);
    for (let i = 0; i < dungeonId.length; i += 1) {
      hash = Math.imul(hash ^ dungeonId.charCodeAt(i), 16777619);
    }
    return hash >>> 0;
  }

  private dungeonAtlasObjectTile(tile: string, dungeon: DungeonDef, tileX: number, tileY: number): DungeonTileId | undefined {
    const theme = this.dungeonThemeTiles(dungeon);
    if (tile === "C") return this.isDungeonChestOpen(dungeon, this.dungeonFloor, tileX, tileY) ? theme.chestOpen : theme.chestClosed;
    if (tile === "K") return theme.switch;
    if (tile === "D") return this.puzzleFlags.has(`${this.currentDungeon}-switch`) ? theme.gateOpen : theme.gateClosed;
    if (tile === "S") return this.dungeonFloor === 0 ? theme.stairsDown : theme.stairsUp;
    if (tile === "E") return theme.exit;
    if (tile === "B") return theme.bossSeal;
    return undefined;
  }

  private drawCursor(x: number, y: number): boolean {
    if (!this.hasTexture("ui_cursor_arrow")) return false;
    this.drawTexture("ui_cursor_arrow", x, y, 16, 16, LAYER_UI_IMAGE);
    return true;
  }

  private drawTitle() {
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 120; i += 1) {
      const x = (i * 73) % WIDTH;
      const y = (i * 41) % HEIGHT;
      const c = i % 3 === 0 ? 0xfff0a8 : i % 3 === 1 ? 0x83d6ff : 0xffffff;
      this.g.fillStyle(c, i % 5 === 0 ? 0.42 : 0.28).fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
    }
    if (this.hasTexture("title_four_crystals")) this.drawTexture("title_four_crystals", WIDTH / 2 - 96, 48, 192, 64, LAYER_WORLD_IMAGE);
    else this.drawPixelCrystal(WIDTH / 2 - 24, 48, 2.4);
    const hasTitleLogo = this.hasTexture("title_logo");
    if (hasTitleLogo) this.drawTexture("title_logo", WIDTH / 2 - 210, 128, 420, 96, LAYER_WORLD_IMAGE);
    else {
      this.text(WIDTH / 2, 178, "CRYSTAL OATH", 44, "#fff2a8", "center");
      this.text(WIDTH / 2, 226, "Dawn of the Four Stars", 24, "#a8ddff", "center");
    }
    this.text(WIDTH / 2, hasTitleLogo ? 268 : 276, "An original turn-based Asterra adventure", 16, "#cbd6ff", "center");
    const hasSave = !!localStorage.getItem(SAVE_KEY);
    this.titleOptions.forEach((option, idx) => {
      const disabled = option === "Load Game" && !hasSave;
      const prefix = idx === this.titleSelected ? ">" : " ";
      this.text(WIDTH / 2, 332 + idx * 34, `${prefix} ${option}`, 22, disabled ? "#657087" : "#ffffff", "center");
    });
    this.text(WIDTH / 2, 474, "Enter/Z confirms. M toggles mute.", 15, "#aab3c8", "center");
  }

  private drawWorld() {
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    const leaderPos = this.visualExplorePos("world");
    const cam = this.cameraFor(leaderPos, WORLD_W, WORLD_H);
    const tileCam = { x: Math.round(cam.x), y: Math.round(cam.y) };
    const startX = Math.max(0, Math.floor(tileCam.x / TILE) - 1);
    const endX = Math.min(WORLD_W - 1, Math.ceil((tileCam.x + WIDTH) / TILE));
    const startY = Math.max(0, Math.floor(tileCam.y / TILE) - 1);
    const endY = Math.min(WORLD_H - 1, Math.ceil((tileCam.y + HEIGHT) / TILE));
    if (!this.drawCachedWorldTerrain(tileCam)) {
      for (let y = startY; y <= endY; y += 1) {
        for (let x = startX; x <= endX; x += 1) {
          this.drawWorldTile(this.world[y][x], x * TILE - tileCam.x, y * TILE - tileCam.y, x, y);
        }
      }
    }
    this.drawWorldOverlays(startX, endX, startY, endY, tileCam);
    for (const loc of this.locations()) {
      const radius = Math.floor(this.locationFootprint(loc) / 2);
      if (loc.x + radius < startX || loc.x - radius > endX || loc.y + radius < startY || loc.y - radius > endY) continue;
      this.drawLocationIcon(loc, (loc.x - radius) * TILE - tileCam.x, (loc.y - radius) * TILE - tileCam.y);
    }
    this.drawLeader(leaderPos.x * TILE - cam.x + 4, leaderPos.y * TILE - cam.y + 3, "world");
    this.drawHud(this.currentIslandName());
    const loc = this.locationAt(this.worldPos.x, this.worldPos.y);
    if (loc) this.drawPrompt(loc.kind === "harbor" ? `Use ${loc.name}` : loc.kind === "landmark" ? `Inspect ${loc.name}` : `Enter ${loc.name}`);
    if (DEBUG_WORLD_LAYOUT) {
      const mapPixelW = this.world[0]?.length ?? 0;
      const mapPixelH = this.world.length;
      this.g.fillStyle(0xffffff, 0.5);
      this.text(16, HEIGHT - 32, `W${mapPixelW}x${mapPixelH}  cam ${tileCam.x},${tileCam.y}  player ${this.worldPos.x},${this.worldPos.y}`, 10, "#aaccff", "left");
    }
  }

  private drawTownFloorTile(px: number, py: number, x: number, y: number) {
    const atlasTile = this.pickWeightedDungeonAtlasTile(TOWN_ATLAS_FLOOR_TILES, this.dungeonTileHash("town-floor", x, y, 0));
    if (this.drawDungeonAtlasTile(atlasTile, px, py)) return;
    if (this.drawTileTexture("town_floor", px, py)) return;
    const base = (x + y) % 2 === 0 ? 0x40506c : 0x384762;
    this.g.fillStyle(base, 1).fillRect(px, py, TILE, TILE);
    this.g.lineStyle(1, 0x263149, 0.55).strokeRect(px, py, TILE, TILE);
    if ((x * 3 + y * 5) % 4 === 0) this.g.fillStyle(0x6f7f9f, 0.18).fillRect(px + 5, py + 6, 5, 4);
    if ((x + y * 2) % 5 === 0) this.g.fillStyle(0x1f2a3e, 0.22).fillRect(px + 22, py + 19, 4, 5);
  }

  private drawTownWallTile(px: number, py: number, x: number, y: number) {
    const atlasTile = this.pickWeightedDungeonAtlasTile(TOWN_ATLAS_WALL_TILES, this.dungeonTileHash("town-wall", x, y, 1));
    if (this.drawDungeonAtlasTile(atlasTile, px, py)) return;
    if (this.drawTileTexture("town_wall", px, py)) return;
    this.g.fillStyle(0x536b94, 1).fillRect(px, py, TILE, TILE);
    this.g.fillStyle(0x344762, 1).fillRect(px, py + TILE - 7, TILE, 7);
    this.g.lineStyle(1, 0x243247, 0.8).strokeRect(px, py, TILE, TILE);
    const brickOffset = (x + y) % 2 === 0 ? 0 : 9;
    this.g.fillStyle(0x6f86ae, 0.32).fillRect(px + 4 + brickOffset, py + 7, 13, 4);
    this.g.fillStyle(0x293850, 0.45).fillRect(px + 2, py + 22, TILE - 4, 2);
  }

  private drawTownRug(x: number, y: number, w: number, h: number, color: number) {
    if (this.hasTexture(TOWN_PROP_TEXTURES.rug)) {
      this.drawTexture(TOWN_PROP_TEXTURES.rug, x, y, w, h + 8, LAYER_OBJECT_IMAGE);
      return;
    }
    this.g.fillStyle(0x172033, 0.4).fillRect(x + 4, y + 5, w, h);
    this.g.fillStyle(color, 1).fillRect(x, y, w, h);
    this.g.fillStyle(0xf4d58f, 0.75).fillRect(x + 8, y + 7, w - 16, 4);
    this.g.fillStyle(0x14213a, 0.28).fillRect(x + 10, y + 15, w - 20, h - 30);
    this.g.lineStyle(2, 0xffefbd, 0.8).strokeRect(x + 4, y + 4, w - 8, h - 8);
  }

  private drawTownLamp(x: number, y: number) {
    if (this.hasTexture(TOWN_PROP_TEXTURES.lamp)) {
      this.drawTexture(TOWN_PROP_TEXTURES.lamp, x - 2, y - 14, 32, 48, LAYER_OBJECT_IMAGE);
      return;
    }
    this.g.fillStyle(0x3b2b24, 1).fillRect(x + 11, y + 14, 6, 18);
    this.g.fillStyle(0xffd56a, 0.32).fillCircle(x + 14, y + 10, 22);
    this.g.fillStyle(0xffdf88, 1).fillRect(x + 7, y + 4, 14, 14);
    this.g.fillStyle(0xffffff, 0.45).fillRect(x + 10, y + 6, 4, 5);
    this.g.lineStyle(2, 0x402a1d, 1).strokeRect(x + 7, y + 4, 14, 14);
  }

  private drawTownCrate(x: number, y: number) {
    if (this.hasTexture(TOWN_PROP_TEXTURES.crate)) {
      this.drawTexture(TOWN_PROP_TEXTURES.crate, x - 5, y - 5, 32, 32, LAYER_OBJECT_IMAGE);
      return;
    }
    this.g.fillStyle(0x8b6038, 1).fillRect(x, y, 22, 22);
    this.g.lineStyle(2, 0x3a2517, 1).strokeRect(x, y, 22, 22);
    this.g.lineStyle(2, 0xc08b4d, 0.85).lineBetween(x + 4, y + 4, x + 18, y + 18);
    this.g.lineStyle(2, 0x4a2f1e, 0.8).lineBetween(x + 18, y + 4, x + 4, y + 18);
  }

  private drawTownBarrel(x: number, y: number) {
    if (this.hasTexture(TOWN_PROP_TEXTURES.barrel)) {
      this.drawTexture(TOWN_PROP_TEXTURES.barrel, x - 4, y - 5, 32, 32, LAYER_OBJECT_IMAGE);
      return;
    }
    this.g.fillStyle(0x6f4b2c, 1).fillEllipse(x + 12, y + 12, 22, 24);
    this.g.fillStyle(0x9b6b3b, 1).fillEllipse(x + 12, y + 8, 19, 7);
    this.g.lineStyle(2, 0x2d1c12, 1).strokeEllipse(x + 12, y + 12, 22, 24);
    this.g.lineStyle(2, 0xc29352, 0.85).lineBetween(x + 3, y + 12, x + 21, y + 12);
  }

  private drawTownTable(x: number, y: number) {
    if (this.hasTexture(TOWN_PROP_TEXTURES.table)) {
      this.drawTexture(TOWN_PROP_TEXTURES.table, x - 17, y - 22, 96, 64, LAYER_OBJECT_IMAGE);
      return;
    }
    this.g.fillStyle(0x3d2a1d, 0.45).fillRect(x + 4, y + 9, 58, 25);
    this.g.fillStyle(0x815637, 1).fillRect(x, y, 62, 24);
    this.g.fillStyle(0xba8150, 1).fillRect(x + 4, y + 4, 54, 5);
    this.g.lineStyle(2, 0x2e1d13, 1).strokeRect(x, y, 62, 24);
    this.g.fillStyle(0x5b3924, 1).fillRect(x + 8, y + 23, 7, 12);
    this.g.fillRect(x + 47, y + 23, 7, 12);
  }

  private drawTownServiceIcon(kind: ServiceKind, cx: number, cy: number, color: number) {
    if (kind === "item" && this.hasTexture("icon_potion")) {
      this.drawTexture("icon_potion", cx - 12, cy - 12, 24, 24, LAYER_OBJECT_IMAGE);
      return;
    }
    if (kind === "arms" && this.hasTexture("icon_weapon_blade")) {
      this.drawTexture("icon_weapon_blade", cx - 12, cy - 12, 24, 24, LAYER_OBJECT_IMAGE);
      return;
    }
    if (kind === "magic" && this.hasTexture("icon_relic_gale")) {
      this.drawTexture("icon_relic_gale", cx - 12, cy - 12, 24, 24, LAYER_OBJECT_IMAGE);
      return;
    }
    this.g.fillStyle(0x101827, 1).fillRect(cx - 14, cy - 14, 28, 28);
    this.g.lineStyle(2, 0xffffff, 0.55).strokeRect(cx - 14, cy - 14, 28, 28);
    this.g.fillStyle(color, 1);
    if (kind === "inn") {
      this.g.fillRect(cx - 11, cy + 1, 22, 8);
      this.g.fillStyle(0xffffff, 1).fillRect(cx - 10, cy - 6, 8, 7);
      this.g.fillStyle(0xfff1a2, 1).fillCircle(cx + 7, cy - 7, 5);
      this.g.fillStyle(0x101827, 1).fillCircle(cx + 10, cy - 9, 5);
    } else if (kind === "clinic") {
      this.g.fillRect(cx - 4, cy - 12, 8, 24);
      this.g.fillRect(cx - 12, cy - 4, 24, 8);
    } else {
      this.g.fillRect(cx - 10, cy - 10, 20, 20);
    }
  }

  private drawTownServicePad(service: TownServiceDef, ox: number, oy: number) {
    const tileId = TOWN_SHOP_PAD_TILES[service.kind];
    const centerX = ox + service.x * TILE + TILE / 2;
    const startX = centerX - TILE * 1.5;
    const startY = oy + service.y * TILE - 2;
    for (let y = 0; y < 2; y += 1) {
      for (let x = 0; x < 3; x += 1) {
        this.drawDungeonAtlasTile(tileId, startX + x * TILE, startY + y * TILE, LAYER_WORLD_IMAGE, 0.97);
      }
    }
  }

  private drawTownService(service: TownServiceDef, ox: number, oy: number) {
    const cx = ox + service.x * TILE + TILE / 2;
    const kioskW = 66;
    const kioskH = 72;
    const kioskX = cx - kioskW / 2;
    const kioskY = oy + service.y * TILE - 31;
    this.drawTownServicePad(service, ox, oy);
    this.g.fillStyle(0x07101f, 0.35).fillEllipse(cx, kioskY + kioskH - 7, kioskW + 10, 15);
    this.g.fillStyle(0x111827, 0.94).fillRect(kioskX, kioskY + 10, kioskW, kioskH - 14);
    this.g.fillStyle(service.color, 0.92).fillRect(kioskX + 5, kioskY + 15, kioskW - 10, kioskH - 24);
    this.g.fillStyle(service.accent, 0.92).fillRect(kioskX + 5, kioskY + kioskH - 26, kioskW - 10, 16);
    this.g.lineStyle(2, 0xfff5c8, 0.72).strokeRect(kioskX + 4, kioskY + 14, kioskW - 8, kioskH - 22);
    this.g.lineStyle(2, 0x07101f, 1).strokeRect(kioskX, kioskY + 10, kioskW, kioskH - 14);

    const serviceTexture = TOWN_SERVICE_TEXTURES[service.kind];
    if (this.hasTexture(serviceTexture)) {
      this.drawTexture(serviceTexture, cx - 31, kioskY, 62, 62, LAYER_OBJECT_IMAGE);
    } else {
      this.drawTownServiceIcon(service.kind, cx, kioskY + 38, service.accent);
    }
  }

  private drawTownDecor(ox: number, oy: number) {
    this.drawTownRug(ox + 7 * TILE, oy + 7 * TILE + 4, TILE * 7, TILE * 2, 0x7f3142);
    this.drawTownTable(ox + 10 * TILE - 16, oy + 10 * TILE - 8);
    this.drawTownCrate(ox + 17 * TILE + 5, oy + 10 * TILE + 2);
    this.drawTownBarrel(ox + 18 * TILE + 5, oy + 11 * TILE);
    this.drawTownCrate(ox + 2 * TILE + 5, oy + 11 * TILE + 2);
    this.drawTownLamp(ox + 2 * TILE + 2, oy + 2 * TILE);
    this.drawTownLamp(ox + 18 * TILE + 2, oy + 2 * TILE);
    this.drawTownLamp(ox + 2 * TILE + 2, oy + 12 * TILE - 4);
    this.drawTownLamp(ox + 18 * TILE + 2, oy + 12 * TILE - 4);
  }

  private drawTownExit(ox: number, oy: number) {
    const x = ox + 9 * TILE;
    const y = oy + 14 * TILE;
    if (this.hasTexture("town_exit_gate")) {
      this.g.fillStyle(0x07101f, 0.75).fillRect(x - 4, y - 6, TILE * 3 + 8, TILE + 8);
      this.drawTexture("town_exit_gate", x, y - 50, TILE * 3, 80, LAYER_OBJECT_IMAGE);
      return;
    }
    this.g.fillStyle(0x07101f, 1).fillRect(x, y - 6, TILE * 3, TILE + 6);
    this.g.fillStyle(0x1d2b44, 1).fillRect(x + 10, y - 2, TILE * 3 - 20, TILE + 2);
    this.g.fillStyle(0xf5d27c, 1).fillRect(x + 4, y - 8, TILE * 3 - 8, 5);
    this.g.lineStyle(2, 0x0b1324, 1).strokeRect(x, y - 6, TILE * 3, TILE + 6);
  }

  private drawTown() {
    const town = this.towns()[this.currentTown];
    const ox = 144;
    const oy = 40;
    const roomW = 21 * TILE;
    const roomH = 15 * TILE;

    this.g.fillStyle(0x14223b, 1).fillRect(0, 0, WIDTH, HEIGHT);
    this.g.fillStyle(0x0a1020, 0.45).fillRect(ox - 18, oy - 18, roomW + 36, roomH + 36);
    for (let y = 0; y < 15; y += 1) {
      for (let x = 0; x < 21; x += 1) {
        const px = ox + x * TILE;
        const py = oy + y * TILE;
        const wall = x === 0 || y === 0 || x === 20 || y === 14;
        if (wall) this.drawTownWallTile(px, py, x, y);
        else this.drawTownFloorTile(px, py, x, y);
      }
    }
    this.g.fillStyle(parseInt(town.palette[2].slice(1), 16), 0.18).fillRect(ox + TILE, oy + TILE, roomW - TILE * 2, 5);
    this.drawTownExit(ox, oy);
    this.drawTownDecor(ox, oy);
    TOWN_SERVICES.forEach((service) => this.drawTownService(service, ox, oy));
    town.npcs.forEach((npc, idx) => this.drawNpc(ox + npc.x * TILE + 6, oy + npc.y * TILE + 5, idx));
    const leaderPos = this.visualExplorePos("town");
    this.drawLeader(ox + leaderPos.x * TILE + 4, oy + leaderPos.y * TILE + 3, "town");
    this.drawHud(town.name);
  }

  private drawDungeon() {
    const dungeon = this.dungeons()[this.currentDungeon];
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    const floor = dungeon.floors[this.dungeonFloor];
    const leaderPos = this.visualExplorePos("dungeon");
    const cam = this.cameraFor(leaderPos, floor[0].length, floor.length);
    const mapScreenX = -cam.x;
    const mapScreenY = -cam.y;
    this.g.fillStyle(0x070d18, 1).fillRect(mapScreenX - 10, mapScreenY - 10, floor[0].length * TILE + 20, floor.length * TILE + 20);
    for (let y = 0; y < floor.length; y += 1) {
      for (let x = 0; x < floor[y].length; x += 1) {
        const sx = x * TILE - cam.x;
        const sy = y * TILE - cam.y;
        if (sx < -TILE || sy < -TILE || sx > WIDTH || sy > HEIGHT) continue;
        this.drawDungeonTile(floor[y][x], sx, sy, dungeon, x, y);
      }
    }
    this.drawLeader(leaderPos.x * TILE - cam.x + 4, leaderPos.y * TILE - cam.y + 3, "dungeon");
    this.drawHud(`${dungeon.name} F${this.dungeonFloor + 1}`);
    this.drawPrompt("Explore / interact");
  }

  private drawBattle() {
    if (!this.battle) return;
    this.drawBattleBackdrop();
    const selectedEnemy = this.selectedBattleEnemy();
    this.battle.enemies.forEach((enemy, idx) => {
      const slot = this.enemyBattleSlot(enemy, idx);
      const targeted = selectedEnemy?.uid === enemy.uid;
      const offset = this.battleActorOffset("enemy", enemy.uid);
      this.drawBattleEnemy(enemy, slot.x + offset.x, slot.y + offset.y, slot.size, targeted);
    });
    this.party.forEach((member, idx) => {
      const slot = this.partyBattleSlot(idx);
      const offset = this.battleActorOffset("party", member.id);
      const active =
        this.currentBattleEntry()?.side === "party" &&
        this.currentBattleEntry()?.actorId === member.id &&
        !this.battle?.animation &&
        this.battle?.phase !== "resolving";
      this.drawPartyBattler(member, slot.x + offset.x, slot.y + offset.y, idx, active);
    });
    this.drawBattleTargetPanel(14, 374, 288, 152);
    this.drawBattleCommandPanel(312, 374, 216, 152);
    this.drawBattleStatusPanel(538, 374, 408, 152);
  }

  private drawBattleBackdrop() {
    const background = this.battle?.background;
    if (background && this.hasTexture(background)) {
      this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
      this.drawTexture(background, 0, 0, WIDTH, HEIGHT, LAYER_WORLD_IMAGE);
      this.g.fillStyle(0x000000, 0.05).fillRect(0, 0, WIDTH, 374);
      this.g.fillStyle(0x06101f, 0.48).fillRect(0, 374, WIDTH, HEIGHT - 374);
      return;
    }
    this.g.fillStyle(0x0a1422, 1).fillRect(0, 0, WIDTH, HEIGHT);
    this.g.fillStyle(0x182b40, 1).fillRect(0, 0, WIDTH, 110);
    this.g.fillStyle(0x233d4b, 1).fillRect(0, 110, WIDTH, 62);
    this.g.fillStyle(0x10251d, 1).fillRect(0, 155, WIDTH, 82);
    for (let i = 0; i < 18; i += 1) {
      const x = (i * 61) % WIDTH;
      const h = 48 + (i % 5) * 17;
      this.g.fillStyle(0x152319, 1).fillRect(x, 105 - (i % 3) * 10, 13, h);
      this.g.fillStyle(i % 2 ? 0x183a25 : 0x214b2e, 1).fillCircle(x + 8, 94 - (i % 3) * 10, 34 + (i % 4) * 5);
      this.g.fillStyle(0x0c1c14, 0.55).fillCircle(x + 24, 118, 24);
    }
    this.g.fillStyle(0x3a5734, 1).fillRect(0, 218, WIDTH, 172);
    this.g.fillStyle(0x667448, 1).fillEllipse(430, 328, 840, 128);
    this.g.fillStyle(0x856f4c, 1).fillEllipse(426, 330, 790, 92);
    this.g.fillStyle(0x4d653c, 0.8).fillRect(0, 356, WIDTH, 34);
    for (let i = 0; i < 72; i += 1) {
      const x = (i * 37) % WIDTH;
      const y = 226 + ((i * 19) % 142);
      const color = i % 3 === 0 ? 0x6c9a55 : i % 3 === 1 ? 0x2d552f : 0xa98b5a;
      this.g.fillStyle(color, 0.55).fillRect(x, y, i % 2 ? 9 : 5, 2);
    }
    this.g.fillStyle(0x000000, 0.28).fillRect(0, 0, WIDTH, HEIGHT);
  }

  private enemyBattleSlot(enemy: EnemyState, idx: number): { x: number; y: number; size: number } {
    if (enemy.boss) return { x: 116, y: 78, size: 178 };
    const slots = [
      { x: 74, y: 100, size: 106 },
      { x: 236, y: 156, size: 106 },
      { x: 92, y: 220, size: 106 }
    ];
    return slots[idx % slots.length];
  }

  private partyBattleSlot(idx: number): { x: number; y: number; size: number } {
    const slots = [
      { x: 678, y: 92, size: 96 },
      { x: 728, y: 170, size: 96 },
      { x: 778, y: 248, size: 96 }
    ];
    return slots[idx % slots.length];
  }

  private battleActorCenter(side: "party" | "enemy", actorId: string): Vec | undefined {
    if (!this.battle) return undefined;
    if (side === "party") {
      const idx = this.party.findIndex((member) => member.id === actorId);
      if (idx < 0) return undefined;
      const slot = this.partyBattleSlot(idx);
      return { x: slot.x + 48, y: slot.y + 42 };
    }
    const enemy = this.battle.enemies.find((candidate) => candidate.uid === actorId);
    if (!enemy) return undefined;
    const slot = this.enemyBattleSlot(enemy, this.battle.enemies.indexOf(enemy));
    return { x: slot.x + slot.size / 2, y: slot.y + slot.size * 0.56 };
  }

  private battleActorOffset(side: "party" | "enemy", actorId: string): Vec {
    const animation = this.battle?.animation;
    if (!animation || animation.action.side !== side || animation.action.actorId !== actorId) return { x: 0, y: 0 };
    const actor = this.battleActorCenter(side, actorId);
    const target =
      animation.targetSide && animation.targetActorId ? this.battleActorCenter(animation.targetSide, animation.targetActorId) : undefined;
    let vx = (target?.x ?? actor?.x ?? 0) - (actor?.x ?? 0);
    let vy = (target?.y ?? actor?.y ?? 0) - (actor?.y ?? 0);
    if (!target || Math.hypot(vx, vy) < 1) {
      vx = side === "party" ? -1 : 1;
      vy = 0;
    }
    const length = Math.max(1, Math.hypot(vx, vy));
    const outward = Phaser.Math.Clamp(animation.elapsed / animation.impactAt, 0, 1);
    const inward = Phaser.Math.Clamp((animation.elapsed - animation.impactAt) / Math.max(1, animation.duration - animation.impactAt), 0, 1);
    const phase = animation.elapsed <= animation.impactAt ? Phaser.Math.Easing.Cubic.Out(outward) : 1 - Phaser.Math.Easing.Cubic.In(inward);
    const distance = side === "party" ? (animation.targetSide ? 44 : 30) : 32;
    return { x: (vx / length) * distance * phase, y: (vy / length) * distance * phase };
  }

  private selectedBattleEnemy(): EnemyState | undefined {
    if (!this.battle || this.battle.phase !== "target") return undefined;
    return this.battle.enemies.filter((enemy) => enemy.hp > 0)[this.battle.selected];
  }

  private drawBattleEnemy(enemy: EnemyState, x: number, y: number, size: number, targeted: boolean) {
    this.drawActorShadow(x + size / 2, y + size - 4, size * 0.82, 15);
    if (enemy.hp > 0 && enemy.intent) {
      this.g.fillStyle(0x07101d, 0.78).fillRect(x - 6, Math.max(6, y - 24), size + 12, 20);
      this.g.lineStyle(1, 0xfff0a8, 0.55).strokeRect(x - 6, Math.max(6, y - 24), size + 12, 20);
      this.text(x, Math.max(8, y - 21), `Intent: ${enemy.intent.label}`, 10, "#fff2a8", "left", { wordWrapWidth: size + 4, strokeThickness: 1 });
    }
    if (targeted) {
      this.g.fillStyle(0xfff0a8, 0.16).fillRect(x - 10, y - 10, size + 20, size + 36);
      this.g.lineStyle(3, 0xfff0a8, 1).strokeRect(x - 10, y - 10, size + 20, size + 36);
    }
    this.drawEnemySprite(enemy, x, y, enemy.boss ? 5 : 4, size);
    this.g.fillStyle(0x07101d, 0.82).fillRect(x - 6, y + size + 2, size + 12, 36);
    this.g.lineStyle(1, 0xffffff, enemy.hp <= 0 ? 0.2 : 0.55).strokeRect(x - 6, y + size + 2, size + 12, 36);
    this.text(x, y + size + 5, enemy.name, 13, enemy.hp <= 0 ? "#7a8190" : "#ffffff", "left", {
      strokeThickness: 2,
      wordWrapWidth: size + 4
    });
    this.drawBar(x, y + size + 25, size, 8, enemy.hp, enemy.maxHp, 0xd95252);
  }

  private drawPartyBattler(member: CharacterState, x: number, y: number, idx: number, active: boolean) {
    const classId = PARTY_CLASS[member.id];
    const frame = this.battleCharacterFrame(member);
    const alpha = member.hp <= 0 ? 0.36 : 1;
    const bodyCenterX = x + 48;
    const feetBaselineY = y + 82;
    this.drawActorShadow(bodyCenterX, feetBaselineY - 4, 88, 16);
    if (active) {
      this.g.fillStyle(0xfff0a8, 0.16).fillEllipse(bodyCenterX, feetBaselineY - 4, 96, 24);
      this.g.lineStyle(3, 0xfff0a8, 0.9).strokeEllipse(bodyCenterX, feetBaselineY - 4, 96, 24);
    }
    if (!this.drawCharacterSpriteFrame(classId, frame, bodyCenterX, feetBaselineY, 250, LAYER_BATTLE_IMAGE, alpha)) {
      const palettes = {
        arlen: [0xf0c18d, 0xc9433f, 0xe9edf7, 0x362a4b],
        mira: [0xf1d0aa, 0xf5f2e8, 0x5fac73, 0x314c33],
        kael: [0xe1b284, 0x1c365d, 0xf0b13e, 0x121827]
      }[member.id];
      this.g.fillStyle(0x050812, alpha).fillRect(x + 12, y + 10, 24, 42);
      this.g.fillStyle(palettes[0], alpha).fillRect(x + 14, y, 18, 18);
      this.g.fillStyle(palettes[1], alpha).fillRect(x + 9, y + 18, 28, 31);
      this.g.fillStyle(palettes[2], alpha).fillRect(x + 16, y + 24, 10, 25);
      this.g.fillStyle(palettes[3], alpha).fillRect(x + 9, y + 49, 9, 12 + (idx % 2));
      this.g.fillRect(x + 28, y + 49, 9, 12 + ((idx + 1) % 2));
      if (member.id === "mira") {
        this.g.lineStyle(3, 0xeaf7ff, alpha).lineBetween(x + 38, y + 14, x + 48, y + 49);
        this.g.fillStyle(0x8ee8ff, alpha).fillCircle(x + 39, y + 13, 5);
      } else if (member.id === "kael") {
        this.g.fillStyle(0xf8d45a, alpha).fillTriangle(x + 34, y + 14, x + 48, y + 20, x + 36, y + 26);
      } else {
        this.g.fillStyle(0xdfe7ee, alpha).fillRect(x + 31, y + 22, 20, 6);
        this.g.fillStyle(0x657081, alpha).fillRect(x + 48, y + 20, 4, 10);
      }
    }
    if (active) this.drawActiveTurnMarker(bodyCenterX, y - 8);
  }

  private drawActiveTurnMarker(cx: number, y: number) {
    const bob = Math.sin(this.time.now / 140) * 3;
    this.ui.fillStyle(0x050812, 0.45).fillTriangle(cx, y + bob + 3, cx - 13, y + bob - 12, cx + 13, y + bob - 12);
    this.ui.fillStyle(0xfff0a8, 1).fillTriangle(cx, y + bob + 1, cx - 10, y + bob - 11, cx + 10, y + bob - 11);
    this.ui.lineStyle(2, 0xffffff, 0.7).strokeTriangle(cx, y + bob + 1, cx - 10, y + bob - 11, cx + 10, y + bob - 11);
  }

  private drawBattleTargetPanel(x: number, y: number, w: number, h: number) {
    if (!this.battle) return;
    this.drawPanel(x, y, w, h);
    const target = this.selectedBattleEnemy();
    this.text(x + 16, y + 12, target ? "Target" : "Battle Log", 17, "#fff2a8");
    this.ui.fillStyle(0xfff0a8, 0.16).fillRect(x + 16, y + 35, w - 32, 1);
    if (target) {
      this.text(x + 16, y + 48, target.name, 18, "#ffffff", "left", { wordWrapWidth: w - 32 });
      this.text(x + 16, y + 74, `Intent: ${target.intent?.label ?? "Unknown"}`, 13, "#fff2a8", "left", { wordWrapWidth: w - 32 });
      const statuses = Object.keys(target.statuses).filter((s) => target.statuses[s as keyof StatusState]).join(" ") || "ok";
      this.text(x + 16, y + 94, `HP ${target.hp}/${target.maxHp}  ${statuses}`, 12, "#dce9ff", "left", { wordWrapWidth: w - 32 });
      this.drawBar(x + 16, y + 122, w - 32, 12, target.hp, target.maxHp, 0xd95252);
    } else {
      this.battle!.log.slice(-4).forEach((line, idx) => {
        const rowY = y + 46 + idx * 22;
        if (idx % 2 === 0) this.ui.fillStyle(0xffffff, 0.035).fillRect(x + 12, rowY - 3, w - 24, 20);
        this.text(x + 18, rowY, line, 13, "#ffffff", "left", { wordWrapWidth: w - 36 });
      });
    }
  }

  private drawBattleCommandPanel(x: number, y: number, w: number, h: number) {
    if (!this.battle) return;
    this.drawPanel(x, y, w, h);
    const actor = this.currentBattleActor();
    if (["command", "target", "skill", "spell", "item", "allyTarget"].includes(this.battle.phase) && actor) {
      const prompt =
        this.battle.phase === "command"
          ? `${actor.name}'s turn`
          : this.battle.phase === "target"
            ? `${actor.name}: choose target`
            : this.battle.phase === "skill"
              ? `${actor.name}: choose skill`
              : this.battle.phase === "spell"
                ? `${actor.name}: choose magic`
                : this.battle.phase === "item"
                  ? `${actor.name}: choose item`
                  : `${actor.name}: choose ally`;
      this.text(x + 16, y + 12, prompt, 14, "#fff2a8", "left", { wordWrapWidth: w - 32 });
      this.ui.fillStyle(0xfff0a8, 0.16).fillRect(x + 16, y + 35, w - 32, 1);
      this.battleOptions().forEach((option, idx) => {
        const selected = idx === this.battle!.selected;
        const rowY = y + 45 + idx * 18;
        if (selected) {
          this.ui.fillStyle(0xfff0a8, 0.16).fillRect(x + 12, rowY - 4, w - 24, 18);
          this.ui.lineStyle(1, 0xfff0a8, 0.72).strokeRect(x + 12, rowY - 4, w - 24, 18);
          this.drawCursor(x + 16, rowY - 1);
        }
        const prefix = selected && !this.hasTexture("ui_cursor_arrow") ? ">" : " ";
        this.text(x + 36, rowY - 3, `${prefix} ${option}`, 12, "#ffffff", "left", { wordWrapWidth: w - 48 });
      });
    } else {
      this.text(x + 16, y + 16, this.battle.phase === "resolving" ? this.currentBattleActorName() : "Continue", 16, "#fff2a8", "left", {
        wordWrapWidth: w - 32
      });
      this.text(x + 16, y + 54, this.battle.phase === "log" ? "Enter continues" : "Resolving...", 14, "#ffffff");
    }
  }

  private drawBattleStatusPanel(x: number, y: number, w: number, h: number) {
    if (!this.battle) return;
    this.drawPanel(x, y, w, h);
    this.text(x + 16, y + 12, `Now: ${this.currentBattleActorName()}`, 15, "#fff2a8", "left", { wordWrapWidth: w - 32 });
    this.ui.fillStyle(0xfff0a8, 0.16).fillRect(x + 16, y + 35, w - 32, 1);
    this.party.forEach((c, idx) => {
      const rowY = y + 43 + idx * 29;
      const active =
        this.currentBattleEntry()?.side === "party" &&
        this.currentBattleEntry()?.actorId === c.id &&
        !this.battle?.animation &&
        this.battle?.phase !== "resolving";
      const statuses = Object.keys(c.statuses).filter((s) => c.statuses[s as keyof StatusState]).join(" ") || "ok";
      if (active) this.ui.fillStyle(0xfff0a8, 0.14).fillRect(x + 10, rowY - 5, w - 20, 26);
      this.text(x + 16, rowY - 1, c.name, 13, c.hp <= 0 ? "#858b98" : "#ffffff", "left", { wordWrapWidth: 80 });
      this.text(x + 96, rowY - 1, `${c.hp}/${c.maxHp}`, 12, "#dce9ff", "left", { wordWrapWidth: 70 });
      this.drawBar(x + 164, rowY + 2, 110, 9, c.hp, c.maxHp, 0x54bb77);
      this.text(x + 286, rowY - 1, `T ${c.charges["1"].current}/${c.charges["2"].current}/${c.charges["3"].current}`, 12, "#c5d2f2", "left", {
        wordWrapWidth: 54
      });
      this.text(x + 338, rowY - 1, statuses, 12, statuses === "ok" ? "#96d7a5" : "#ffd98a", "left", { wordWrapWidth: 52 });
    });
    this.ui.fillStyle(0xffffff, 0.045).fillRect(x + 12, y + h - 28, w - 24, 18);
    this.text(x + 18, y + h - 27, `Next: ${this.turnPreviewText()}`, 12, "#cbd6ff", "left", { wordWrapWidth: w - 36 });
  }

  private drawMenuScreen() {
    if (this.previousMode === "world") this.drawWorld();
    else if (this.previousMode === "town") this.drawTown();
    else if (this.previousMode === "dungeon") this.drawDungeon();
    else this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    if (!this.menu) return;
    this.clearText();
    this.ui.fillStyle(0x02040a, 0.72).fillRect(0, 0, WIDTH, HEIGHT);
    this.drawPanel(155, 58, 650, 430);
    this.text(184, 96, this.menu.title, 24, "#fff2a8");
    const startY = 144;
    this.menu.options.forEach((option, idx) => {
      const disabled = option.disabled?.() ?? false;
      const label = typeof option.label === "function" ? option.label() : option.label;
      const selected = idx === this.menu!.selected;
      if (selected) this.drawCursor(176, startY + idx * 28 + 4);
      const prefix = selected && !this.hasTexture("ui_cursor_arrow") ? ">" : " ";
      this.text(194, startY + idx * 28, `${prefix} ${label}`, 18, disabled ? "#6f7486" : "#ffffff");
    });
    if (this.menu.footer) {
      const footer = typeof this.menu.footer === "function" ? this.menu.footer() : this.menu.footer;
      this.text(184, 454, footer, 14, "#b8c4e0");
    }
  }

  private drawDialogue() {
    if (this.previousMode === "dungeon") this.drawDungeon();
    else if (this.previousMode === "town") this.drawTown();
    else if (this.previousMode === "title") this.drawTitle();
    else this.drawWorld();
    if (!this.dialogue) return;
    this.clearText();
    this.ui.fillStyle(0x02040a, 0.38).fillRect(0, 0, WIDTH, HEIGHT);
    this.drawPanel(56, 324, WIDTH - 112, 184);
    this.text(84, 356, this.dialogue.lines[this.dialogue.index], 20, "#ffffff");
    this.text(WIDTH - 256, 474, "Enter / Z", 14, "#aab3c8");
  }

  private drawGameOver() {
    this.g.fillStyle(0x050407, 1).fillRect(0, 0, WIDTH, HEIGHT);
    this.text(WIDTH / 2, 190, "GAME OVER", 46, "#f07178", "center");
    this.text(WIDTH / 2, 270, "Enter loads your last save. Escape returns to title.", 20, "#ffffff", "center");
  }

  private drawEnding() {
    this.g.fillStyle(0x07111a, 1).fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 80; i += 1) {
      this.g.fillStyle(i % 2 ? 0xffeaa8 : 0x95e7ff, 0.55).fillRect((i * 97) % WIDTH, (i * 53) % HEIGHT, 3, 3);
    }
    this.drawPixelCrystal(WIDTH / 2 - 28, 72, 3);
    this.text(WIDTH / 2, 170, "Asterra Wakes", 40, "#fff2a8", "center");
    this.text(WIDTH / 2, 240, "The Root drinks, the Flame warms, the Tide sings, and the Gale carries dawn.", 20, "#ffffff", "center");
    this.text(WIDTH / 2, 310, "Arlen, Mira, and Kael return their oath to the road, where new stories wait.", 20, "#dce9ff", "center");
    this.text(WIDTH / 2, 430, "Enter returns to title.", 16, "#aab3c8", "center");
  }

  private drawWorldTile(terrain: Terrain, sx: number, sy: number, x: number, y: number) {
    const roadVisual = this.roadVisualAt(x, y);
    const tile = WORLD_TILES[roadVisual?.sourceTileId ?? terrain];
    if (tile && this.hasTexture(WORLD_ATLAS.textureKey)) {
      const rect = this.worldTileSourceRect(tile);
      this.drawCroppedTexture(
        WORLD_ATLAS.textureKey,
        sx,
        sy,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
        TILE,
        TILE,
        LAYER_WORLD_IMAGE,
        1,
        undefined,
        roadVisual?.rotation ?? 0
      );
      return;
    }
    if (tile?.biome === "grassland") this.drawWorldPlainsTile(sx, sy, x, y);
    else if (tile?.biome === "forest" || tile?.biome === "darkland") this.drawWorldForestTile(sx, sy, x, y);
    else if (tile?.biome === "mountain") {
      if (worldTileHasTag(terrain, "blocked") || worldTileHasTag(terrain, "cliff")) this.drawWorldMountainTile(sx, sy, x, y);
      else this.drawWorldHillsTile(sx, sy, x, y);
    } else if (tile?.biome === "water") this.drawWorldWaterTile(worldTileHasTag(terrain, "deep"), sx, sy, x, y);
    else if (tile?.biome === "desert") this.drawWorldSandTile(sx, sy, x, y);
    else this.drawWorldRoadTile(sx, sy, x, y);
    this.drawWorldCoastEdges(terrain, sx, sy, x, y);
  }

  private roadVisualAt(x: number, y: number): WorldRoadVisual | undefined {
    return this.roadVisualsByKey.get(`${x},${y}`);
  }

  private drawWorldOverlays(startX: number, endX: number, startY: number, endY: number, tileCam: Vec) {
    if (!this.generatedWorld) return;
    const inView = (pos: Vec) => pos.x >= startX && pos.x <= endX && pos.y >= startY && pos.y <= endY;
    for (const pos of this.generatedWorld.shallows) {
      if (!inView(pos)) continue;
      const sx = pos.x * TILE - tileCam.x;
      const sy = pos.y * TILE - tileCam.y;
      this.g.fillStyle(0x76e7ff, 0.2).fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
      if ((pos.x + pos.y) % 3 === 0) this.g.lineStyle(1, 0xc9fbff, 0.5).lineBetween(sx + 6, sy + 12, sx + 24, sy + 8);
    }
    for (const route of this.generatedWorld.seaRoutes) {
      route.forEach((pos, idx) => {
        if (!inView(pos) || idx % 3 !== 0) return;
        const sx = pos.x * TILE - tileCam.x;
        const sy = pos.y * TILE - tileCam.y;
        this.g.fillStyle(0xfff0a8, 0.62).fillCircle(sx + TILE / 2, sy + TILE / 2, 3);
      });
    }
    const hasObjectAtlas = this.hasTexture(WORLD_OBJECT_ATLAS.textureKey);
    for (const overlay of this.generatedWorld.objectOverlays) {
      if (!inView(overlay)) continue;
      const displaySize = TILE * overlay.scale;
      const sx = overlay.x * TILE - tileCam.x + TILE / 2 - displaySize / 2;
      const sy = overlay.y * TILE - tileCam.y + TILE / 2 - displaySize / 2;
      this.drawWorldObjectCell(overlay.objectId, sx, sy, displaySize, displaySize, 0.92);
    }
    if (!hasObjectAtlas) {
      for (const reef of this.generatedWorld.reefs) {
        if (!inView(reef)) continue;
        const sx = reef.x * TILE - tileCam.x;
        const sy = reef.y * TILE - tileCam.y;
        this.g.fillStyle(0xd8d0a0, 0.85).fillTriangle(sx + 8, sy + 23, sx + 14, sy + 12, sx + 20, sy + 23);
        this.g.fillStyle(0x6c7c8a, 0.8).fillRect(sx + 19, sy + 19, 6, 4);
      }
    }
    for (const bridge of this.generatedWorld.bridges) {
      if (!inView(bridge)) continue;
      const sx = bridge.x * TILE - tileCam.x;
      const sy = bridge.y * TILE - tileCam.y;
      if (this.drawPierDockTile(bridge, sx, sy)) continue;
      const color = bridge.material === "stone" ? 0xa69b86 : 0x9a6a3d;
      this.g.fillStyle(0x07101d, 0.35).fillRect(sx + 5, sy + 5, TILE - 10, TILE - 10);
      this.g.fillStyle(color, 0.95).fillRect(sx + 7, sy + 12, TILE - 14, 8);
      this.g.lineStyle(1, 0xffefbd, 0.65).lineBetween(sx + 8, sy + 16, sx + TILE - 8, sy + 16);
    }
  }

  private drawWorldObjectCell(objectId: WorldObjectId | undefined, sx: number, sy: number, width: number, height: number, alpha = 1): boolean {
    if (!objectId || !this.hasTexture(WORLD_OBJECT_ATLAS.textureKey)) return false;
    const object = worldObjectById(objectId);
    if (!object) return false;
    this.drawCroppedTexture(
      WORLD_OBJECT_ATLAS.textureKey,
      sx,
      sy,
      object.source.x,
      object.source.y,
      object.source.width,
      object.source.height,
      width,
      height,
      LAYER_OBJECT_IMAGE,
      alpha
    );
    return true;
  }

  private drawPierDockTile(bridge: { orientation: "horizontal" | "vertical"; material: "wood" | "stone" }, sx: number, sy: number): boolean {
    if (!this.hasTexture(PIER_ATLAS.textureKey)) return false;
    const cell = bridge.orientation === "vertical" ? PIER_ATLAS.cells.vertical : PIER_ATLAS.cells.horizontal;
    this.drawCroppedTexture(
      PIER_ATLAS.textureKey,
      sx,
      sy,
      cell.col * PIER_ATLAS.tileWidth,
      cell.row * PIER_ATLAS.tileHeight,
      PIER_ATLAS.tileWidth,
      PIER_ATLAS.tileHeight,
      TILE,
      TILE,
      LAYER_OBJECT_IMAGE,
      1,
      bridge.material === "stone" ? 0xb9b0a1 : undefined
    );
    return true;
  }

  private rebuildWorldTerrainCache() {
    this.worldTerrainCacheSeed = "";
    if (!this.world.length || !this.textures.exists(WORLD_ATLAS.textureKey)) return;
    this.assertWorldTilesetTextureSize();
    const mapWidth = this.world[0].length * TILE;
    const mapHeight = this.world.length * TILE;
    const canvas = document.createElement("canvas");
    canvas.width = mapWidth;
    canvas.height = mapHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Unable to create terrain cache canvas.");
    ctx.imageSmoothingEnabled = false;

    const atlasSource = this.textures.get(WORLD_ATLAS.textureKey).getSourceImage() as CanvasImageSource & { width: number; height: number };
    for (let y = 0; y < this.world.length; y += 1) {
      for (let x = 0; x < this.world[y].length; x += 1) {
        const roadVisual = this.roadVisualAt(x, y);
        const tile = WORLD_TILES[roadVisual?.sourceTileId ?? this.world[y][x]];
        if (!tile) throw new Error(`Cannot render unknown world tile ${this.world[y][x]} at ${x},${y}.`);
        const rect = this.worldTileSourceRect(tile);
        if (roadVisual?.rotation) this.drawRotatedWorldTileToCache(ctx, atlasSource, rect, x * TILE, y * TILE, roadVisual.rotation);
        else ctx.drawImage(atlasSource, rect.x, rect.y, rect.width, rect.height, x * TILE, y * TILE, TILE, TILE);
      }
    }

    if (this.textures.exists(this.worldTerrainCacheKey)) this.textures.remove(this.worldTerrainCacheKey);
    this.textures.addCanvas(this.worldTerrainCacheKey, canvas);
    this.textures.get(this.worldTerrainCacheKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.worldTerrainCacheSeed = this.worldSeed;
    if (import.meta.env.DEV) {
      console.info(`Atlas v3 terrain cache rendered with source inset ${ATLAS_V3_SOURCE_INSET}; post-placement seam blending disabled.`);
    }
  }

  private drawRotatedWorldTileToCache(
    ctx: CanvasRenderingContext2D,
    atlasSource: CanvasImageSource,
    rect: { x: number; y: number; width: number; height: number },
    x: number,
    y: number,
    rotation: RoadRotation
  ) {
    ctx.save();
    ctx.translate(x + TILE / 2, y + TILE / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(atlasSource, rect.x, rect.y, rect.width, rect.height, -TILE / 2, -TILE / 2, TILE, TILE);
    ctx.restore();
  }

  private drawCachedWorldTerrain(tileCam: Vec): boolean {
    if (this.worldTerrainCacheSeed !== this.worldSeed || !this.textures.exists(this.worldTerrainCacheKey)) return false;
    const mapWidth = (this.world[0]?.length ?? 0) * TILE;
    const mapHeight = this.world.length * TILE;
    const cropX = Math.round(Phaser.Math.Clamp(tileCam.x, 0, Math.max(0, mapWidth - WIDTH)));
    const cropY = Math.round(Phaser.Math.Clamp(tileCam.y, 0, Math.max(0, mapHeight - HEIGHT)));
    const cropWidth = Math.min(WIDTH, mapWidth - cropX);
    const cropHeight = Math.min(HEIGHT, mapHeight - cropY);
    if (cropWidth <= 0 || cropHeight <= 0) return false;

    // Use a named sub-frame so setDisplaySize divides by crop size, not full texture size.
    // setCrop alone leaves frame.realWidth at full texture width, causing thumbnail scaling.
    const viewFrameKey = `${this.worldTerrainCacheKey}_view`;
    const texture = this.textures.get(this.worldTerrainCacheKey);
    if (texture.has(viewFrameKey)) texture.remove(viewFrameKey);
    texture.add(viewFrameKey, 0, cropX, cropY, cropWidth, cropHeight);

    const image = this.add.image(0, 0, this.worldTerrainCacheKey, viewFrameKey);
    image.setOrigin(0, 0);
    image.setDisplaySize(cropWidth * PIXEL_ART_SCALE, cropHeight * PIXEL_ART_SCALE);
    image.setDepth(LAYER_WORLD_IMAGE);
    image.setScrollFactor(0);
    this.images.push(image);

    if (DEBUG_WORLD_LAYOUT) {
      const frame = texture.get(viewFrameKey);
      console.debug(
        `[world-terrain-cache] tex=${mapWidth}x${mapHeight} crop=${cropX},${cropY} ${cropWidth}x${cropHeight}`,
        `frame.realWidth=${frame.realWidth} frame.realHeight=${frame.realHeight}`,
        `image.displayWidth=${image.displayWidth} image.displayHeight=${image.displayHeight}`,
        `image.scaleX=${image.scaleX} image.scaleY=${image.scaleY}`,
        `expected display=${cropWidth * PIXEL_ART_SCALE}x${cropHeight * PIXEL_ART_SCALE}`
      );
    }
    return true;
  }

  private worldTileSourceRect(tile: WorldTileDefinition) {
    this.assertWorldTilesetTextureSize();
    this.assertWorldTilesetSourceRect(tile.sourceRect, `World tile ${tile.id}`);
    const rect = atlasV3SourceRectWithInset(tile.sourceRect);
    this.assertWorldTilesetSourceRect(rect, `World tile ${tile.id} inset source rect`);
    return rect;
  }

  private assertWorldTilesetSourceRect(rect: { x: number; y: number; width: number; height: number }, label: string) {
    if (!Number.isInteger(rect.x) || !Number.isInteger(rect.y) || !Number.isInteger(rect.width) || !Number.isInteger(rect.height)) {
      throw new Error(`${label} source rect must use exact integers; got ${rect.x},${rect.y},${rect.width},${rect.height}.`);
    }
    if (rect.x < 0 || rect.y < 0 || rect.width <= 0 || rect.height <= 0) {
      throw new Error(`${label} source rect must be positive and in-bounds; got ${rect.x},${rect.y},${rect.width},${rect.height}.`);
    }
    if (rect.x + rect.width > WORLD_ATLAS.sheetWidth || rect.y + rect.height > WORLD_ATLAS.sheetHeight) {
      throw new Error(`${label} source rect ${rect.x},${rect.y},${rect.width},${rect.height} exceeds atlas_v3 ${WORLD_ATLAS.sheetWidth}x${WORLD_ATLAS.sheetHeight}.`);
    }
  }

  private assertWorldTilesetTextureSize() {
    if (this.worldTilesetValidated) return;
    const source = this.textures.get(WORLD_ATLAS.textureKey).getSourceImage() as { width: number; height: number };
    if (source.width !== WORLD_ATLAS.sheetWidth || source.height !== WORLD_ATLAS.sheetHeight) {
      throw new Error(`atlas_v3 manifest size mismatch: image ${source.width}x${source.height}, manifest ${WORLD_ATLAS.sheetWidth}x${WORLD_ATLAS.sheetHeight}.`);
    }
    if (source.width !== WORLD_ATLAS.columns * WORLD_ATLAS.tileWidth || source.height !== WORLD_ATLAS.rows * WORLD_ATLAS.tileHeight) {
      throw new Error(`atlas_v3 grid mismatch: image ${source.width}x${source.height}, grid ${WORLD_ATLAS.columns}x${WORLD_ATLAS.rows} at ${WORLD_ATLAS.tileWidth}x${WORLD_ATLAS.tileHeight}.`);
    }
    this.worldTilesetValidated = true;
  }

  private worldTerrainAt(x: number, y: number): Terrain | undefined {
    return this.world[y]?.[x];
  }

  private isWaterTerrain(terrain?: Terrain): boolean {
    return worldTileHasTag(terrain, "water");
  }

  private isLandTerrain(terrain?: Terrain): boolean {
    return !!terrain && !this.isWaterTerrain(terrain);
  }

  private drawWorldPlainsTile(sx: number, sy: number, x: number, y: number) {
    const n = seededNoise(x, y, 11);
    this.g.fillStyle(n > 0.55 ? 0x58b347 : 0x4fab43, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(0x78cf5b, 0.5).fillRect(sx + 2, sy + 2, TILE - 4, 3);
    this.g.fillStyle(0x2f7b34, 0.4).fillRect(sx + 1, sy + TILE - 5, TILE - 2, 4);
    for (let i = 0; i < 4; i += 1) {
      const gx = sx + 3 + Math.floor(seededNoise(x + i, y, 21) * 24);
      const gy = sy + 6 + Math.floor(seededNoise(x, y + i, 22) * 18);
      this.g.fillStyle(i % 2 ? 0x84db67 : 0x347e36, 0.72).fillRect(gx, gy, i % 2 ? 8 : 5, 2);
    }
  }

  private drawWorldForestTile(sx: number, sy: number, x: number, y: number) {
    this.g.fillStyle(0x235c32, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(0x153b24, 1).fillRect(sx, sy + 23, TILE, 9);
    for (let i = 0; i < 5; i += 1) {
      const tx = sx + 2 + Math.floor(seededNoise(x + i, y, 31) * 22);
      const ty = sy + 2 + Math.floor(seededNoise(x, y + i, 32) * 17);
      this.g.fillStyle(0x12351f, 1).fillRect(tx + 2, ty + 10, 5, 12);
      this.g.fillStyle(i % 2 ? 0x2f8a3e : 0x1f6f34, 1).fillCircle(tx + 6, ty + 7, 9);
      this.g.fillStyle(0x62b84e, 0.7).fillRect(tx + 4, ty + 2, 6, 3);
    }
    this.g.fillStyle(0x0e2419, 0.45).fillRect(sx, sy + 27, TILE, 5);
  }

  private drawWorldHillsTile(sx: number, sy: number, x: number, y: number) {
    this.g.fillStyle(0x77a44f, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(0x947848, 1).fillEllipse(sx + 12, sy + 20, 28, 16);
    this.g.fillStyle(0xb79a5a, 1).fillEllipse(sx + 20, sy + 16, 22, 13);
    this.g.fillStyle(0x4f6d34, 0.5).fillRect(sx + 1, sy + 25, TILE - 2, 5);
    if (seededNoise(x, y, 41) > 0.45) {
      this.g.lineStyle(2, 0xe6cc80, 0.72).lineBetween(sx + 7, sy + 15, sx + 19, sy + 10);
    }
  }

  private drawWorldMountainTile(sx: number, sy: number, x: number, y: number) {
    this.g.fillStyle(0x5d674f, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(0x3f3c37, 1).fillTriangle(sx + 1, sy + 29, sx + 12, sy + 5, sx + 24, sy + 29);
    this.g.fillStyle(0x5d584e, 1).fillTriangle(sx + 9, sy + 30, sx + 22, sy + 2, sx + 32, sy + 30);
    this.g.fillStyle(0xcfcfbf, 1).fillTriangle(sx + 9, sy + 11, sx + 12, sy + 5, sx + 16, sy + 12);
    this.g.fillStyle(0xf2f2db, 1).fillTriangle(sx + 19, sy + 9, sx + 22, sy + 2, sx + 26, sy + 10);
    this.g.fillStyle(0x2c2b2a, 0.38).fillRect(sx + 2, sy + 27, TILE - 4, 4);
    if (seededNoise(x, y, 44) > 0.62) this.g.fillStyle(0x806f4d, 0.55).fillRect(sx + 5, sy + 24, 7, 3);
  }

  private drawWorldWaterTile(deep: boolean, sx: number, sy: number, x: number, y: number) {
    this.g.fillStyle(deep ? 0x174a9c : 0x237cc5, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(deep ? 0x0d2d68 : 0x155da1, 0.45).fillRect(sx, sy + 23, TILE, 9);
    for (let i = 0; i < 3; i += 1) {
      const wx = sx + 3 + Math.floor(seededNoise(x + i, y, 51) * 20);
      const wy = sy + 5 + i * 8 + Math.floor(seededNoise(x, y + i, 52) * 3);
      this.g.lineStyle(2, deep ? 0x5f8dea : 0x8ee8ff, 0.75).lineBetween(wx, wy, wx + 9, wy - 2);
      this.g.lineStyle(1, deep ? 0x0b244d : 0x0e4f88, 0.45).lineBetween(wx + 3, wy + 4, wx + 14, wy + 3);
    }
  }

  private drawWorldSandTile(sx: number, sy: number, x: number, y: number) {
    const n = seededNoise(x, y, 61);
    this.g.fillStyle(n > 0.5 ? 0xe8cd69 : 0xe1bf59, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(0xffe98a, 0.52).fillRect(sx + 2, sy + 2, TILE - 4, 3);
    this.g.lineStyle(2, 0xb89043, 0.45).lineBetween(sx + 4, sy + 13, sx + 16, sy + 10);
    this.g.lineStyle(2, 0xf7df7a, 0.5).lineBetween(sx + 13, sy + 22, sx + 28, sy + 18);
    if (n > 0.68) this.g.fillStyle(0xb4883d, 0.4).fillRect(sx + 6, sy + 25, 6, 2);
  }

  private drawWorldRoadTile(sx: number, sy: number, x: number, y: number) {
    this.g.fillStyle(0x70a64b, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(0xb69863, 1).fillRect(sx, sy + 9, TILE, 15);
    this.g.fillStyle(0xd2bb82, 0.78).fillRect(sx, sy + 10, TILE, 3);
    this.g.fillStyle(0x7d643f, 0.42).fillRect(sx, sy + 21, TILE, 3);
    if (seededNoise(x, y, 71) > 0.5) this.g.fillStyle(0x5b4a35, 0.5).fillRect(sx + 18, sy + 17, 4, 3);
  }

  private drawWorldCoastEdges(terrain: Terrain, sx: number, sy: number, x: number, y: number) {
    const edges = [
      { dx: -1, dy: 0, side: "left" },
      { dx: 1, dy: 0, side: "right" },
      { dx: 0, dy: -1, side: "top" },
      { dx: 0, dy: 1, side: "bottom" }
    ] as const;
    for (const edge of edges) {
      const neighbor = this.worldTerrainAt(x + edge.dx, y + edge.dy);
      if (this.isLandTerrain(terrain) && this.isWaterTerrain(neighbor)) {
        this.g.fillStyle(0xe8c36b, 1);
        if (edge.side === "left") this.g.fillRect(sx, sy, 4, TILE);
        if (edge.side === "right") this.g.fillRect(sx + TILE - 4, sy, 4, TILE);
        if (edge.side === "top") this.g.fillRect(sx, sy, TILE, 4);
        if (edge.side === "bottom") this.g.fillRect(sx, sy + TILE - 4, TILE, 4);
      }
      if (this.isWaterTerrain(terrain) && this.isLandTerrain(neighbor)) {
        this.g.fillStyle(0x9cf3ff, 0.72);
        if (edge.side === "left") this.g.fillRect(sx, sy, 3, TILE);
        if (edge.side === "right") this.g.fillRect(sx + TILE - 3, sy, 3, TILE);
        if (edge.side === "top") this.g.fillRect(sx, sy, TILE, 3);
        if (edge.side === "bottom") this.g.fillRect(sx, sy + TILE - 3, TILE, 3);
      }
    }
  }

  private dungeonObjectTexture(tile: string, dungeon: DungeonDef, tileX: number, tileY: number): AssetKey | undefined {
    if (tile === "C") return this.isDungeonChestOpen(dungeon, this.dungeonFloor, tileX, tileY) ? "chest_open" : "chest_closed";
    if (tile === "K") return "switch_floor";
    if (tile === "D") return this.puzzleFlags.has(`${this.currentDungeon}-switch`) ? "dungeon_gate_open" : "dungeon_gate_closed";
    if (tile === "S") return "dungeon_stairs";
    if (tile === "E") return "dungeon_exit";
    if (tile === "B") return "boss_relic_seal";
    return undefined;
  }

  private isDungeonChestOpen(dungeon: DungeonDef, floorIndex: number, tileX: number, tileY: number): boolean {
    let count = 0;
    for (let f = 0; f <= floorIndex; f += 1) {
      const floor = dungeon.floors[f];
      for (let y = 0; y < floor.length; y += 1) {
        for (let x = 0; x < floor[y].length; x += 1) {
          if (floor[y][x] !== "C") continue;
          if (f === floorIndex && x === tileX && y === tileY) {
            const reward = dungeon.chestRewards[count % dungeon.chestRewards.length];
            return this.openedChests.has(`${dungeon.id}-${floorIndex}-${tileX}-${tileY}-${reward.id}`);
          }
          count += 1;
        }
      }
    }
    return false;
  }

  private locationTextureForKind(loc: LocationDef): AssetKey | undefined {
    if (loc.kind === "harbor") return "marker_port";
    if (loc.landmarkKind === "shrine") return "marker_shrine";
    if (loc.landmarkKind === "cave") return "marker_cave";
    if (loc.landmarkKind === "ruins" || loc.landmarkKind === "ancientDoor") return "marker_gate";
    if (loc.landmarkKind === "secretMerchant") return "marker_town";
    return undefined;
  }

  private drawDungeonTile(tile: string, sx: number, sy: number, dungeon: DungeonDef, tileX: number, tileY: number) {
    const theme = this.dungeonThemeTiles(dungeon);
    if (tile === "#") {
      if (!this.isDungeonWallEdge(tileX, tileY)) {
        this.g.fillStyle(0x050812, 1).fillRect(sx, sy, TILE, TILE);
        return;
      }
      const wallTile = this.pickDungeonAtlasTile(theme.walls, dungeon, tileX, tileY, 19);
      if (this.drawDungeonAtlasTile(wallTile, sx, sy)) return;
      if (this.drawTileTexture("dungeon_wall_base", sx, sy)) return;
      this.g.fillStyle(dungeon.palette.wall, 1).fillRect(sx, sy, TILE, TILE);
      this.g.fillStyle(dungeon.palette.accent, 0.25).fillRect(sx + 4, sy + 4, 7, 7);
      return;
    }
    const floorTile = this.pickDungeonAtlasTile(theme.floors, dungeon, tileX, tileY, 7);
    const drewFloor =
      this.drawDungeonAtlasTile(floorTile, sx, sy) ||
      this.drawTileTexture(DUNGEON_FLOOR_TEXTURES[dungeon.id] ?? "dungeon_floor_moss", sx, sy);
    if (!drewFloor) {
      this.g.fillStyle(dungeon.palette.floor, 1).fillRect(sx, sy, TILE, TILE);
      this.g.fillStyle(0xffffff, 0.05).fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
    }
    const atlasObjectTile = this.dungeonAtlasObjectTile(tile, dungeon, tileX, tileY);
    if (this.drawDungeonAtlasTile(atlasObjectTile, sx, sy, LAYER_OBJECT_IMAGE)) return;
    const objectKey = this.dungeonObjectTexture(tile, dungeon, tileX, tileY);
    if (this.drawTileTexture(objectKey, sx, sy, LAYER_OBJECT_IMAGE, false, tile === "S")) return;
    if (tile === "C") {
      this.g.fillStyle(dungeon.palette.chest, 1).fillRect(sx + 7, sy + 10, 18, 14);
      this.g.fillStyle(0x3a2111, 1).fillRect(sx + 7, sy + 17, 18, 3);
    }
    if (tile === "K") {
      this.g.fillStyle(dungeon.palette.accent, 1).fillRect(sx + 10, sy + 9, 12, 16);
      this.g.fillStyle(0xffffff, 0.55).fillRect(sx + 14, sy + 6, 4, 7);
    }
    if (tile === "D") {
      const open = this.puzzleFlags.has(`${this.currentDungeon}-switch`);
      this.g.fillStyle(open ? dungeon.palette.floor : dungeon.palette.gate, 1).fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
      if (!open) this.g.fillStyle(0x000000, 0.35).fillRect(sx + 14, sy + 3, 4, TILE - 6);
    }
    if (tile === "S") {
      this.g.fillStyle(dungeon.palette.accent, 1).fillRect(sx + 8, sy + 8, 16, 16);
      this.g.fillStyle(0x050812, 0.5).fillRect(sx + 12, sy + 12, 8, 8);
    }
    if (tile === "E") {
      this.g.fillStyle(0x050812, 0.7).fillRect(sx + 5, sy + 3, 22, 26);
    }
    if (tile === "B") {
      this.g.fillStyle(0xf5e17d, 0.7).fillRect(sx + 9, sy + 7, 14, 18);
    }
  }

  private isDungeonWallEdge(tileX: number, tileY: number): boolean {
    const dungeon = this.dungeons()[this.currentDungeon];
    const floor = dungeon.floors[this.dungeonFloor];
    for (let yy = tileY - 1; yy <= tileY + 1; yy += 1) {
      for (let xx = tileX - 1; xx <= tileX + 1; xx += 1) {
        if (xx === tileX && yy === tileY) continue;
        const neighbor = floor[yy]?.[xx];
        if (neighbor && neighbor !== "#") return true;
      }
    }
    return false;
  }

  private drawLocationIcon(loc: LocationDef, footprintX: number, footprintY: number) {
    const footprint = this.locationFootprint(loc);
    const footprintSize = footprint * TILE;
    const size = this.locationVisualSize(loc, footprintSize);
    const sx = footprintX + footprintSize / 2 - size / 2;
    const sy = footprintY + footprintSize - size - this.locationVisualLift(loc);
    const cx = sx + size / 2;
    const bottom = sy + size - 6;
    this.drawActorShadow(cx, bottom, size * 0.72, Math.max(10, size * 0.16));
    if (this.drawWorldObjectCell(loc.objectId, sx, sy - 2, size, size)) return;
    const locationTexture = LOCATION_TEXTURES[loc.id] ?? this.locationTextureForKind(loc);
    if (locationTexture && this.hasTexture(locationTexture)) {
      this.drawTexture(locationTexture, sx, sy - 2, size, size, LAYER_OBJECT_IMAGE);
      return;
    }
    const u = size / 96;
    if (loc.kind === "harbor") {
      this.g.fillStyle(0x9a6a3d, 1).fillRect(sx + 18 * u, sy + 54 * u, 60 * u, 12 * u);
      this.g.fillStyle(0xe8c36b, 1).fillRect(sx + 24 * u, sy + 42 * u, 48 * u, 18 * u);
      this.g.fillStyle(0x2f8db8, 1).fillTriangle(sx + 34 * u, sy + 42 * u, sx + 50 * u, sy + 18 * u, sx + 66 * u, sy + 42 * u);
      this.g.fillStyle(0xf7f2d0, 1).fillRect(sx + 47 * u, sy + 20 * u, 5 * u, 38 * u);
      return;
    }
    if (loc.kind === "landmark") {
      const color = loc.landmarkKind === "shrine" ? 0x95e7ff : loc.landmarkKind === "monsterNest" ? 0xd96b55 : 0xffdf78;
      this.g.fillStyle(0x1b2430, 1).fillRect(sx + 24 * u, sy + 44 * u, 48 * u, 32 * u);
      this.g.fillStyle(color, 1).fillTriangle(sx + 18 * u, sy + 48 * u, cx, sy + 18 * u, sx + 78 * u, sy + 48 * u);
      this.g.fillStyle(0x07101d, 1).fillRect(cx - 9 * u, sy + 56 * u, 18 * u, 20 * u);
      return;
    }
    if (loc.id === "dawnford" || loc.kind === "town") {
      const roof = loc.id === "brinewick" ? 0x4c9fc7 : loc.id === "sunbarrow" ? 0xf08a2e : 0xd9542e;
      this.g.fillStyle(0x1a2334, 0.55).fillRect(sx + 18 * u, sy + 54 * u, 60 * u, 24 * u);
      this.g.fillStyle(0xf2eee0, 1).fillRect(sx + 26 * u, sy + 42 * u, 44 * u, 34 * u);
      this.g.fillStyle(roof, 1).fillTriangle(sx + 18 * u, sy + 44 * u, cx, sy + 22 * u, sx + 78 * u, sy + 44 * u);
      this.g.fillStyle(0x283044, 1).fillRect(cx - 8 * u, sy + 57 * u, 16 * u, 20 * u);
      this.g.fillStyle(0xffefbd, 1).fillRect(sx + 32 * u, sy + 52 * u, 8 * u, 8 * u);
      this.g.fillRect(sx + 56 * u, sy + 52 * u, 8 * u, 8 * u);
      return;
    }
    if (loc.kind === "gate") {
      this.g.fillStyle(0x4b467a, 1).fillRect(sx + 24 * u, sy + 28 * u, 16 * u, 50 * u);
      this.g.fillRect(sx + 56 * u, sy + 28 * u, 16 * u, 50 * u);
      this.g.fillStyle(0xffdf76, 1).fillCircle(cx, sy + 26 * u, 12 * u);
      this.g.lineStyle(5 * u, 0xd5c8ff, 1).lineBetween(sx + 32 * u, sy + 32 * u, sx + 64 * u, sy + 32 * u);
      return;
    }
    if (loc.id === "mossCave") {
      this.g.fillStyle(0x4a5744, 1).fillTriangle(sx + 12 * u, sy + 78 * u, cx, sy + 20 * u, sx + 84 * u, sy + 78 * u);
      this.g.fillStyle(0x142018, 1).fillRect(cx - 17 * u, sy + 48 * u, 34 * u, 30 * u);
      this.g.fillStyle(0x4aa44d, 1).fillRect(sx + 22 * u, sy + 64 * u, 14 * u, 10 * u);
      return;
    }
    if (loc.id === "ashenKeep") {
      this.g.fillStyle(0x454044, 1).fillRect(sx + 16 * u, sy + 34 * u, 64 * u, 44 * u);
      this.g.fillStyle(0xdf5a2e, 1).fillRect(sx + 28 * u, sy + 20 * u, 12 * u, 22 * u);
      this.g.fillRect(sx + 58 * u, sy + 20 * u, 12 * u, 22 * u);
      this.g.fillStyle(0x111018, 1).fillRect(cx - 10 * u, sy + 56 * u, 20 * u, 22 * u);
      return;
    }
    if (loc.id === "tideShrine") {
      this.g.fillStyle(0xdfe8ef, 1).fillRect(sx + 20 * u, sy + 40 * u, 56 * u, 36 * u);
      this.g.fillStyle(0x4ab3d1, 1).fillTriangle(sx + 14 * u, sy + 42 * u, cx, sy + 18 * u, sx + 82 * u, sy + 42 * u);
      this.g.fillStyle(0x1a5e80, 1).fillRect(sx + 32 * u, sy + 55 * u, 10 * u, 22 * u);
      this.g.fillRect(sx + 56 * u, sy + 55 * u, 10 * u, 22 * u);
      return;
    }
    if (loc.id === "skyglassTower") {
      this.g.fillStyle(0x647081, 1).fillRect(cx - 13 * u, sy + 20 * u, 26 * u, 58 * u);
      this.g.fillStyle(0x98edf7, 1).fillTriangle(cx - 20 * u, sy + 30 * u, cx, sy + 6 * u, cx + 20 * u, sy + 30 * u);
      this.g.fillStyle(0x273548, 1).fillRect(cx - 6 * u, sy + 58 * u, 12 * u, 20 * u);
      return;
    }
    this.g.fillStyle(0x2a1d3d, 1).fillTriangle(sx + 20 * u, sy + 80 * u, cx, sy + 12 * u, sx + 76 * u, sy + 80 * u);
    this.g.fillStyle(0xb388ff, 1).fillRect(cx - 8 * u, sy + 28 * u, 16 * u, 44 * u);
    this.g.fillStyle(0xffdf78, 1).fillRect(cx - 14 * u, sy + 18 * u, 28 * u, 10 * u);
  }

  private locationVisualSize(loc: LocationDef, footprintSize: number): number {
    const byKind: Record<WorldPoiKind, number> = {
      town: 2.45,
      harbor: 1.55,
      dungeon: 2.15,
      gate: 2.2,
      final: 2.35,
      landmark: 1.55
    };
    if (loc.landmarkKind === "shipwreck" || loc.landmarkKind === "secretMerchant") return Math.min(footprintSize, TILE * 1.85);
    if (loc.landmarkKind === "ancientDoor" || loc.landmarkKind === "ruins") return Math.min(footprintSize, TILE * 2);
    return Math.min(footprintSize, TILE * (byKind[loc.kind] ?? 1.75));
  }

  private locationVisualLift(loc: LocationDef): number {
    if (loc.kind === "town" || loc.kind === "final") return 4;
    if (loc.kind === "dungeon" || loc.kind === "gate") return 2;
    return 8;
  }

  private drawActorShadow(x: number, y: number, width = 26, height = 8) {
    this.g.fillStyle(0x050812, 0.34).fillEllipse(x, y, width, height);
  }

  private drawLeader(x: number, y: number, mode?: ExploreMode) {
    const frame = this.playerMoving ? Math.floor(this.walkAnimElapsed / 85) % 2 : 0;
    const spriteCellWidth = EXPLORE_PLAYER_SPRITE_WIDTH;
    const shadowWidth = 36;
    const shadowHeight = 12;
    const ellipseW = 32;
    const ellipseH = 12;
    const bodyOffsetX = 12;
    const bodyOffsetY = 13;
    const bodyCenterX = x + bodyOffsetX;
    const feetBaselineY = y + bodyOffsetY;
    this.drawActorShadow(bodyCenterX, feetBaselineY, shadowWidth, shadowHeight);
    this.g.lineStyle(1, 0xfff0a8, 0.62).strokeEllipse(bodyCenterX, feetBaselineY, ellipseW, ellipseH);
    if (this.drawCharacterSpriteFrame(PARTY_CLASS.arlen, this.explorationCharacterFrame(frame), bodyCenterX, feetBaselineY, spriteCellWidth)) {
      return;
    }
    const scale = 2;
    const fx = bodyCenterX - 11 * scale;
    const fy = feetBaselineY - 37 * scale;
    this.g.fillStyle(0x050812, 1).fillRect(fx + 5 * scale, fy + 3 * scale, 22 * scale, 29 * scale);
    this.g.fillStyle(0x2a213a, 1).fillRect(fx + 7 * scale, fy + scale, 18 * scale, 9 * scale);
    this.g.fillStyle(0xf0c18d, 1).fillRect(fx + 9 * scale, fy + 5 * scale, 14 * scale, 12 * scale);
    this.g.fillStyle(0xb93434, 1).fillRect(fx + 6 * scale, fy + 17 * scale, 22 * scale, 13 * scale);
    this.g.fillStyle(0xf2e9dd, 1).fillRect(fx + 15 * scale, fy + 17 * scale, 7 * scale, 16 * scale);
    this.g.fillStyle(0x1c2238, 1).fillRect(fx + 7 * scale, fy + 30 * scale, 8 * scale, (7 + frame) * scale);
    this.g.fillRect(fx + 20 * scale, fy + 30 * scale, 8 * scale, (7 + (1 - frame)) * scale);
    this.g.fillStyle(0xffffff, 1).fillRect(fx + 11 * scale, fy + 10 * scale, 3 * scale, 3 * scale);
    this.g.fillRect(fx + 19 * scale, fy + 10 * scale, 3 * scale, 3 * scale);
  }

  private drawNpc(x: number, y: number, idx: number) {
    const npcTexture = NPC_TEXTURES[idx % NPC_TEXTURES.length];
    this.drawActorShadow(x + 10, y + 27, 24, 8);
    if (this.hasTexture(npcTexture)) {
      this.drawCroppedTexture(npcTexture, x - 8, y - 7, 0, 0, TILE_FRAME, TILE_FRAME, 34, 34, LAYER_CHARACTER_IMAGE);
      return;
    }
    const colors = [0xffd37d, 0x90e6b0, 0xbda2ff];
    this.g.fillStyle(0xf2bd8f, 1).fillRect(x + 7, y, 10, 9);
    this.g.fillStyle(colors[idx % colors.length], 1).fillRect(x + 5, y + 9, 14, 15);
    this.g.fillStyle(0x2d344f, 1).fillRect(x + 6, y + 24, 5, 5);
    this.g.fillStyle(0x2d344f, 1).fillRect(x + 15, y + 24, 5, 5);
  }

  private drawPortrait(c: CharacterState, x: number, y: number, scale: number) {
    const portraitTexture = PORTRAIT_TEXTURES[c.id];
    if (this.hasTexture(portraitTexture)) {
      this.drawTexture(portraitTexture, x, y, 32 * scale, 40 * scale, LAYER_BATTLE_IMAGE, c.hp <= 0 ? 0.35 : 1);
      return;
    }
    const palettes = {
      arlen: [0xf1c897, 0xb73b36, 0xe9edf7],
      mira: [0xf0d0b0, 0x5ca46f, 0xffffff],
      kael: [0xe1b284, 0xa33c36, 0xffd66b]
    }[c.id];
    this.g.fillStyle(0x0b1020, 1).fillRect(x, y, 22 * scale, 28 * scale);
    this.g.lineStyle(2, 0xffffff, 0.8).strokeRect(x, y, 22 * scale, 28 * scale);
    this.g.fillStyle(palettes[0], 1).fillRect(x + 7 * scale, y + 3 * scale, 8 * scale, 8 * scale);
    this.g.fillStyle(palettes[1], 1).fillRect(x + 5 * scale, y + 11 * scale, 12 * scale, 11 * scale);
    this.g.fillStyle(palettes[2], 1).fillRect(x + 10 * scale, y + 12 * scale, 4 * scale, 11 * scale);
  }

  private drawEnemySprite(enemy: EnemyState, x: number, y: number, s: number, displaySize = 96) {
    const texture = ENEMY_TEXTURES[enemy.id];
    if (texture && this.hasTexture(texture)) {
      this.drawTexture(texture, x, y, displaySize, displaySize, LAYER_BATTLE_IMAGE, enemy.hp <= 0 ? 0.28 : 1, undefined, true);
      return;
    }
    const p = enemy.palette.map((c) => parseInt(c.slice(1), 16));
    const dead = enemy.hp <= 0 ? 0.28 : 1;
    this.g.fillStyle(p[0], dead);
    if (enemy.sprite === "blob") {
      this.g.fillRect(x, y + 34, 20 * s, 10 * s);
      this.g.fillRect(x + 4 * s, y + 18, 12 * s, 16 * s);
      this.g.fillStyle(p[1], dead).fillRect(x + 8 * s, y + 12, 8 * s, 8 * s);
    } else if (enemy.sprite === "wing") {
      this.g.fillTriangle(x, y + 32, x + 10 * s, y + 8, x + 16 * s, y + 36);
      this.g.fillTriangle(x + 20 * s, y + 32, x + 10 * s, y + 8, x + 4 * s, y + 36);
      this.g.fillStyle(p[1], dead).fillRect(x + 8 * s, y + 14, 8 * s, 18 * s);
    } else if (enemy.sprite === "knight") {
      this.g.fillRect(x + 5 * s, y + 8, 12 * s, 26 * s);
      this.g.fillStyle(p[1], dead).fillRect(x + 3 * s, y + 18, 16 * s, 18 * s);
      this.g.fillStyle(p[2], dead).fillRect(x + 8 * s, y + 11, 8 * s, 4 * s);
    } else if (enemy.sprite === "serpent") {
      for (let i = 0; i < 5; i += 1) {
        this.g.fillStyle(p[i % 2], dead).fillRect(x + i * 6 * s, y + (i % 2) * 5 * s + 18, 8 * s, 8 * s);
      }
      this.g.fillStyle(p[2], dead).fillRect(x + 30 * s, y + 12, 10 * s, 10 * s);
    } else if (enemy.sprite === "crown") {
      this.g.fillRect(x + 4 * s, y + 20, 18 * s, 16 * s);
      this.g.fillStyle(p[2], dead);
      this.g.fillTriangle(x + 4 * s, y + 20, x + 8 * s, y + 4, x + 12 * s, y + 20);
      this.g.fillTriangle(x + 11 * s, y + 20, x + 15 * s, y + 2, x + 19 * s, y + 20);
    } else {
      this.g.fillRect(x + 4 * s, y + 12, 16 * s, 22 * s);
      this.g.fillStyle(p[1], dead).fillRect(x, y + 25, 24 * s, 10 * s);
    }
    this.g.fillStyle(0xffffff, dead).fillRect(x + 8 * s, y + 20, 2 * s, 2 * s);
    this.g.fillRect(x + 14 * s, y + 20, 2 * s, 2 * s);
  }

  private drawPixelCrystal(x: number, y: number, scale: number) {
    const colors = [0x87e6ff, 0xfff0a6, 0xa98bff, 0xff9b78];
    colors.forEach((color, i) => {
      const ox = (i - 1.5) * 20 * scale;
      this.g.fillStyle(color, 1);
      this.g.fillTriangle(x + ox + 10 * scale, y, x + ox + 20 * scale, y + 20 * scale, x + ox, y + 20 * scale);
      this.g.fillTriangle(x + ox, y + 20 * scale, x + ox + 20 * scale, y + 20 * scale, x + ox + 10 * scale, y + 42 * scale);
    });
  }

  private drawPanel(x: number, y: number, w: number, h: number) {
    if (this.hasTexture("ui_window_panel")) {
      const c = 12;
      const mid = 24;
      const iw = Math.max(1, w - c * 2);
      const ih = Math.max(1, h - c * 2);
      this.ui.fillStyle(0x020714, 0.58).fillRect(x + 4, y + 5, w, h);
      this.drawCroppedTexture("ui_window_panel", x, y, 0, 0, c, c, c, c, LAYER_UI_IMAGE);
      this.drawCroppedTexture("ui_window_panel", x + c, y, c, 0, mid, c, iw, c, LAYER_UI_IMAGE);
      this.drawCroppedTexture("ui_window_panel", x + w - c, y, c + mid, 0, c, c, c, c, LAYER_UI_IMAGE);
      this.drawCroppedTexture("ui_window_panel", x, y + c, 0, c, c, mid, c, ih, LAYER_UI_IMAGE);
      this.drawCroppedTexture("ui_window_panel", x + c, y + c, c, c, mid, mid, iw, ih, LAYER_UI_IMAGE);
      this.drawCroppedTexture("ui_window_panel", x + w - c, y + c, c + mid, c, c, mid, c, ih, LAYER_UI_IMAGE);
      this.drawCroppedTexture("ui_window_panel", x, y + h - c, 0, c + mid, c, c, c, c, LAYER_UI_IMAGE);
      this.drawCroppedTexture("ui_window_panel", x + c, y + h - c, c, c + mid, mid, c, iw, c, LAYER_UI_IMAGE);
      this.drawCroppedTexture("ui_window_panel", x + w - c, y + h - c, c + mid, c + mid, c, c, c, c, LAYER_UI_IMAGE);
      return;
    }
    this.ui.fillStyle(0x020714, 0.55).fillRect(x + 4, y + 5, w, h);
    this.ui.fillStyle(0x10275a, 0.98).fillRect(x, y, w, h);
    this.ui.fillStyle(0x0b1733, 0.98).fillRect(x + 7, y + 7, w - 14, h - 14);
    this.ui.fillStyle(0x1f56ac, 0.34).fillRect(x + 8, y + 8, w - 16, Math.min(18, h - 16));
    this.ui.lineStyle(3, 0xe8f2ff, 1).strokeRect(x, y, w, h);
    this.ui.lineStyle(1, 0x77a5ff, 0.9).strokeRect(x + 7, y + 7, w - 14, h - 14);
    this.ui.lineStyle(1, 0x031026, 0.85).strokeRect(x + 3, y + 3, w - 6, h - 6);
  }

  private drawBar(x: number, y: number, w: number, h: number, value: number, max: number, color: number) {
    const pct = Phaser.Math.Clamp(value / Math.max(1, max), 0, 1);
    if (this.hasTexture("ui_status_bar_empty") && this.hasTexture("ui_hp_bar")) {
      this.drawTexture("ui_status_bar_empty", x, y, w, h, LAYER_UI_IMAGE);
      const filledWidth = Math.floor(w * pct);
      if (filledWidth > 0) {
        this.drawCroppedTexture("ui_hp_bar", x, y, 0, 0, Math.max(1, Math.floor(64 * pct)), 8, filledWidth, h, LAYER_UI_IMAGE + 1, 1, color);
      }
      this.ui.lineStyle(1, 0xffffff, 0.55).strokeRect(x, y, w, h);
      return;
    }
    this.ui.fillStyle(0x0a0d14, 1).fillRect(x, y, w, h);
    this.ui.fillStyle(color, 1).fillRect(x, y, Math.floor(w * pct), h);
    this.ui.lineStyle(1, 0xffffff, 0.55).strokeRect(x, y, w, h);
  }

  private drawHud(place: string) {
    const travel = this.flags.skyship ? "Skyship" : this.flags.boat ? "Boat" : "On Foot";
    this.drawPanel(12, 10, 286, 56);
    this.text(28, 18, place, 17, "#fff2a8", "left", { wordWrapWidth: 250 });
    this.text(28, 42, `Gold ${this.gold}  Relics ${this.relicCount()}/4  ${travel}`, 12, "#e7efff", "left", { wordWrapWidth: 250 });

    const rightW = 318;
    const rightX = WIDTH - rightW - 12;
    this.drawPanel(rightX, 10, rightW, 56);
    this.text(rightX + 16, 19, `Enc ${this.settings.encounters ? "ON" : "OFF"}  XP ${this.settings.xpMultiplier}x`, 13, "#e7efff", "left", {
      wordWrapWidth: rightW - 32
    });
    const seedText = import.meta.env.DEV ? `Seed ${this.worldSeed}` : `${this.settings.muted ? "Muted" : "Audio"}  Esc Menu`;
    this.text(rightX + 16, 41, seedText, 11, "#c5d2f2", "left", { wordWrapWidth: rightW - 32 });
  }

  private drawPrompt(text: string) {
    const w = 326;
    const h = 42;
    const x = WIDTH - w - 24;
    const y = HEIGHT - h - 18;
    this.drawPanel(x, y, w, h);
    this.text(x + 18, y + 12, text, 16, "#ffffff", "left", { wordWrapWidth: w - 36 });
  }

  private cameraFor(pos: Vec, mapW: number, mapH: number): Vec {
    const mapPixelW = mapW * TILE;
    const mapPixelH = mapH * TILE;
    return {
      x:
        mapPixelW <= WIDTH
          ? -(WIDTH - mapPixelW) / 2
          : Phaser.Math.Clamp(pos.x * TILE - WIDTH / 2 + TILE / 2, 0, mapPixelW - WIDTH),
      y:
        mapPixelH <= HEIGHT
          ? -(HEIGHT - mapPixelH) / 2
          : Phaser.Math.Clamp(pos.y * TILE - HEIGHT / 2 + TILE / 2, 0, mapPixelH - HEIGHT)
    };
  }

  private markDirty() {
    this.dirty = true;
  }
}

function isUp(event: KeyboardEvent) {
  return event.code === "ArrowUp" || event.code === "KeyW" || event.key === "ArrowUp" || event.key.toLowerCase() === "w";
}

function isDown(event: KeyboardEvent) {
  return event.code === "ArrowDown" || event.code === "KeyS" || event.key === "ArrowDown" || event.key.toLowerCase() === "s";
}

function isLeft(event: KeyboardEvent) {
  return event.code === "ArrowLeft" || event.code === "KeyA" || event.key === "ArrowLeft" || event.key.toLowerCase() === "a";
}

function isRight(event: KeyboardEvent) {
  return event.code === "ArrowRight" || event.code === "KeyD" || event.key === "ArrowRight" || event.key.toLowerCase() === "d";
}

function isConfirm(event: KeyboardEvent) {
  return event.code === "Enter" || event.code === "Space" || event.code === "KeyZ" || event.key === "Enter" || event.key === " " || event.key.toLowerCase() === "z";
}

function isCancel(event: KeyboardEvent) {
  return event.code === "Escape" || event.code === "KeyX" || event.key === "Escape" || event.key.toLowerCase() === "x";
}

function directionNameForEvent(event: KeyboardEvent): DirectionName | undefined {
  if (isUp(event)) return "up";
  if (isDown(event)) return "down";
  if (isLeft(event)) return "left";
  if (isRight(event)) return "right";
  return undefined;
}

function keyDirection(event: KeyboardEvent): Vec | undefined {
  if (isUp(event)) return { x: 0, y: -1 };
  if (isDown(event)) return { x: 0, y: 1 };
  if (isLeft(event)) return { x: -1, y: 0 };
  if (isRight(event)) return { x: 1, y: 0 };
  return undefined;
}

function wrap(value: number, length: number) {
  return ((value % length) + length) % length;
}

function seededNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game",
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  backgroundColor: "#050812",
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [CrystalOathScene]
};

new Phaser.Game(config);
