import dungeonAtlasImageUrl from "./world/dungeon_atlas.png";
import type { AssetKey } from "./assetTypes";

export const ASSET_PATHS = [
  ["dungeon_atlas", "world/dungeon_atlas.png"],
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
  ["hero_fighter_sprite", "heroes/sprite_hero_fighter.png"],
  ["hero_priest_sprite", "heroes/sprite_hero_priest.png"],
  ["hero_mage_sprite", "heroes/sprite_hero_mage.png"],
  ["npc_guard", "characters/npc_guard.png"],
  ["npc_merchant", "characters/npc_merchant.png"],
  ["npc_elder", "characters/npc_elder.png"],
  ["npc_villager", "characters/npc_villager.png"],
  ["npc_sage", "characters/npc_sage.png"],
  ["vehicle_boat", "characters/vehicle_boat.png"],
  ["vehicle_skyship", "characters/vehicle_skyship.png"],
  ["hero_fighter_portrait", "heroes/portrait_hero_fighter.png"],
  ["hero_priest_portrait", "heroes/portrait_hero_priest.png"],
  ["hero_mage_portrait", "heroes/portrait_hero_mage.png"],
  ["battle_bg_forest_path", "battle/backgrounds/forest_path.jpeg"],
  ["battle_bg_plains", "battle/backgrounds/plains.jpeg"],
  ["battle_bg_moss_cave", "battle/backgrounds/moss_cave.jpeg"],
  ["battle_bg_ashen_keep", "battle/backgrounds/ashen_keep.jpeg"],
  ["battle_bg_tide_shrine", "battle/backgrounds/tide_shrine.jpeg"],
  ["battle_bg_eclipse_spire", "battle/backgrounds/eclipse_spire.jpeg"],
  ["enemy_slimebud", "enemies/common/slimebud.png"],
  ["enemy_bristle_rat", "enemies/common/bristle_rat.png"],
  ["enemy_field_imp", "enemies/common/field_imp.png"],
  ["enemy_thorn_wisp", "enemies/common/thorn_wisp.png"],
  ["enemy_mossling", "enemies/common/mossling.png"],
  ["enemy_venom_moth", "enemies/common/venom_moth.png"],
  ["enemy_pebble_gnawer", "enemies/common/pebble_gnawer.png"],
  ["enemy_cave_bat", "enemies/common/cave_bat.png"],
  ["enemy_iron_beetle", "enemies/common/iron_beetle.png"],
  ["enemy_cinder_pup", "enemies/common/cinder_pup.png"],
  ["enemy_ash_sprite", "enemies/common/ash_sprite.png"],
  ["enemy_coal_knight", "enemies/common/coal_knight.png"],
  ["enemy_reef_fang", "enemies/reef_fang.png"],
  ["enemy_bubble_eye", "enemies/bubble_eye.png"],
  ["enemy_drowned_husk", "enemies/drowned_husk.png"],
  ["enemy_sky_mite", "enemies/sky_mite.png"],
  ["enemy_gale_harpy", "enemies/gale_harpy.png"],
  ["enemy_glass_roc", "enemies/glass_roc.png"],
  ["enemy_eclipse_shade", "enemies/eclipse_shade.png"],
  ["enemy_crown_guard", "enemies/crown_guard.png"],
  ["enemy_void_serpent", "enemies/void_serpent.png"],
  ["boss_rootbound_troll", "enemies/bosses/rootbound_troll.png"],
  ["boss_ember_tyrant", "enemies/bosses/ember_tyrant.png"],
  ["boss_tide_oracle", "enemies/bosses/tide_oracle.png"],
  ["boss_gale_chimera", "enemies/bosses/gale_chimera.png"],
  ["boss_eclipse_crown", "enemies/bosses/eclipse_crown.png"],
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
  ["title_screen", "title/title_screen.png"],
  ["title_logo", "title/title_logo.png"],
  ["title_four_crystals", "title/four_star_relics.png"],
  ["poi_starting_grassland_village", "poi/starting_grassland_village.jpeg"]
] as const;

export const ASSET_MODULES = import.meta.glob("../../assets/**/*.{png,jpeg,jpg}", {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

export const SRC_ASSET_MODULES = import.meta.glob(
  [
    "./**/*.{png,jpeg,jpg}",
    "!./world/source/**/*.{png,jpeg,jpg}"
  ],
  {
    eager: true,
    query: "?url",
    import: "default"
  }
) as Record<string, string>;

export const WORLD_CURRENT_ASSET_MODULES = import.meta.glob("./world/current/**/*.png", {
  eager: true,
  query: "?url",
  import: "default"
}) as Record<string, string>;

export const CHARTER_BOAT_8DIR_TEXTURE_KEY = "charter_boat_8dir";
export const CHARTER_BOAT_8DIR_FILENAME = "boats/charter_boat_8dir.png";
export const CHARTER_BOAT_8DIR_FRAME_WIDTH = 512;
export const CHARTER_BOAT_8DIR_FRAME_HEIGHT = 512;

export const ASSET_V2_MODULES = import.meta.glob(
  [
    "../../assets_v2/**/*.{png,jpeg,jpg}",
    "!../../assets_v2/previews/**/*.{png,jpeg,jpg}",
    "!../../assets_v2/source_sheets/**/*.{png,jpeg,jpg}",
    "!../../assets_v2/ui/command_window.png",
    "!../../assets_v2/ui/target_window.png",
    "!../../assets_v2/ui/party_status_window.png",
    "!../../assets_v2/ui/message_window.png"
  ],
  {
    eager: true,
    query: "?url",
    import: "default"
  }
) as Record<string, string>;

export const ASSET_V2_PATH_OVERRIDES: Partial<Record<AssetKey, string>> = {
  tile_water_a: "tiles/world/water_shallow.png",
  tile_water_b: "tiles/world/water_shallow.png",
  tile_deep_water_a: "tiles/world/water_deep.png",
  tile_deep_water_b: "tiles/world/water_deep.png",
  ui_window_panel: "ui/window_panel.png",
  ui_hp_bar: "ui/hp_bar.png"
};

export const EXPLICIT_ASSET_URLS: Partial<Record<AssetKey, string>> = {
  dungeon_atlas: dungeonAtlasImageUrl
};

export const ASSET_URLS = Object.fromEntries(
  ASSET_PATHS.map(([key, path]) => {
    return [
      key,
        EXPLICIT_ASSET_URLS[key] ??
        SRC_ASSET_MODULES[`./${path}`] ??
        ASSET_V2_MODULES[`../../assets_v2/${ASSET_V2_PATH_OVERRIDES[key] ?? path}`] ??
        ASSET_MODULES[`../../assets/${path}`]
    ];
  })
) as Partial<Record<AssetKey, string>>;
