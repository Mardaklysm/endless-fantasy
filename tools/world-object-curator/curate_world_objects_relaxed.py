from __future__ import annotations

import argparse
import importlib.util
import json
import math
import shutil
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


PROJECT_ROOT = Path(__file__).resolve().parents[2]
STRICT_CURATOR_PATH = Path(__file__).with_name("curate_world_objects.py")
DEFAULT_SOURCE_ROOTS = [
    Path(r"D:\Tools\rembg\bg_input_2"),
    Path(r"D:\Tools\rembg\bg_output_2"),
    Path(r"D:\Tools\rembg\bg_output"),
]
DEFAULT_OUTPUT_ROOT = Path(r"D:\new_items\output_relaxed")
RUNTIME_ROOT = PROJECT_ROOT / "src" / "assets" / "world" / "current"
RUNTIME_OBJECT_ROOT = RUNTIME_ROOT / "objects"
MANIFEST_PATH = RUNTIME_ROOT / "world_asset_manifest.json"
CANVAS_SIZE = 256
RELAXED_SOURCE = "world_objects_v2_relaxed"


spec = importlib.util.spec_from_file_location("strict_world_object_curator", STRICT_CURATOR_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load strict curator helpers from {STRICT_CURATOR_PATH}")
strict = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = strict
spec.loader.exec_module(strict)


def choice(
    object_id: str,
    source_file: str,
    row: int,
    col: int,
    category: str,
    subcategory: str,
    placement_layer: str,
    intended_use: str,
    rationale: str,
    tags: list[str],
    role: str,
    bucket: str = "game_ready",
    cleanup_notes: str = "Clean enough for runtime after alpha-preserving normalization.",
    anchor_y: float = 0.92,
    footprint_width: int = 1,
    footprint_height: int = 1,
    recommended_scale: float = 0.92,
    duplicate_group: str | None = None,
) -> dict[str, Any]:
    return {
        "id": object_id,
        "filename": f"{object_id}.png",
        "qualityBucket": bucket,
        "sourceFile": source_file,
        "sourceRow": row,
        "sourceCol": col,
        "category": category,
        "subcategory": subcategory,
        "placementLayer": placement_layer,
        "intendedUse": intended_use,
        "visualRationale": rationale,
        "cleanupNotes": cleanup_notes,
        "manualCleanupNeeded": bucket == "touchup_needed",
        "tags": tags,
        "duplicateGroup": duplicate_group or object_id.rsplit("_", 1)[0],
        "integrationRole": role,
        "integrationStatus": "integrated" if bucket == "game_ready" else "manual_cleanup_only",
        "anchorX": 0.5,
        "anchorY": anchor_y,
        "footprintWidth": footprint_width,
        "footprintHeight": footprint_height,
        "recommendedScale": recommended_scale,
        "notes": "Relaxed pass: compact settlement/POI compositions are valid overworld objects when they look good.",
    }


DUNGEON_NEW = "Create_an_overworld_object_atlas_202606211605 (4).png"
SETTLEMENT_A = "Create_an_overworld_object_atlas_202606211605 (2).png"
SETTLEMENT_B = "Create_an_overworld_object_atlas_202606211605 (6).png"
SETTLEMENT_C = "Create_an_overworld_object_atlas_202606211605 (5).png"
MAGIC_NEW = "Create_an_overworld_object_atlas_202606211605.png"
CAPTIONED_DUNGEON = "Create_an_overworld_object_atlas_202606211605 (3).png"


DEFAULT_CHOICES: list[dict[str, Any]] = [
    choice("village_hamlet_straw_01", SETTLEMENT_A, 1, 1, "village_poi", "hamlet", "settlement_poi", "small rural hamlet POI", "Compact hut cluster reads clearly as a small overworld settlement.", ["settlement", "village", "hamlet"], "poi:town"),
    choice("village_round_huts_01", SETTLEMENT_A, 1, 2, "village_poi", "round_hut_village", "settlement_poi", "round-hut village POI", "The circular hut layout is distinct from the existing tavern marker and keeps a coherent settlement silhouette.", ["settlement", "village"], "poi:town"),
    choice("village_farming_01", SETTLEMENT_A, 1, 3, "village_poi", "farming_village", "settlement_poi", "farming village or Greenhaven-style settlement", "Buildings, fields, and paths are part of one compact POI icon rather than a repeating terrain tile.", ["settlement", "village", "farm"], "location:dawnford"),
    choice("outpost_watchtower_farm_01", SETTLEMENT_A, 1, 4, "fort_poi", "watchtower_outpost", "fortification_poi", "frontier outpost or watch station", "Small tower, fence, and supplies make a readable military/travel outpost.", ["outpost", "watchtower", "settlement"], "available:outpost"),
    choice("village_fishing_docks_01", SETTLEMENT_A, 1, 5, "harbor_poi", "fishing_village", "harbor_poi", "small fishing village POI", "The docks and water patch form a compact harbor identity, useful for port-side map POIs.", ["settlement", "harbor", "fishing"], "poi:harbor"),
    choice("town_walled_green_01", SETTLEMENT_A, 1, 6, "town_poi", "walled_town_green", "settlement_poi", "small walled town POI", "Clean enclosed town silhouette with enough internal detail to read at overworld scale.", ["settlement", "town", "walled"], "poi:town"),
    choice("village_swamp_stilt_01", SETTLEMENT_A, 1, 7, "village_poi", "swamp_stilt_village", "settlement_poi", "swamp or marsh village POI", "Stilt houses and dark water read as a biome-specific settlement icon.", ["settlement", "swamp", "village"], "available:swamp_town"),
    choice("village_snowy_01", SETTLEMENT_A, 1, 8, "village_poi", "snowy_village", "settlement_poi", "snowy village POI", "Snowy roofs and compact footprint make a good Frostmere settlement variant.", ["settlement", "snow", "village"], "available:snow_town"),
    choice("town_market_colorful_01", SETTLEMENT_A, 2, 1, "town_poi", "market_town", "settlement_poi", "market town POI", "Colorful awnings make this a lively town marker and a stronger generic town icon than a single building.", ["settlement", "town", "market"], "poi:town"),
    choice("town_stone_gray_01", SETTLEMENT_A, 2, 2, "town_poi", "stone_town", "settlement_poi", "stone town POI", "Dense gray buildings read as a cooler urban settlement variant.", ["settlement", "town", "stone"], "available:stone_town"),
    choice("town_desert_oasis_01", SETTLEMENT_A, 2, 4, "town_poi", "desert_town", "settlement_poi", "desert town POI", "Warm walls, palms, and oasis detail make a useful biome-specific settlement.", ["settlement", "desert", "town"], "available:desert_town"),
    choice("village_mountain_01", SETTLEMENT_A, 2, 5, "village_poi", "mountain_village", "settlement_poi", "mountain village POI", "Mountain-backed village gives Highspire a compact settlement option.", ["settlement", "mountain", "village"], "available:mountain_town"),
    choice("village_forest_lodge_01", SETTLEMENT_A, 2, 6, "village_poi", "forest_village", "settlement_poi", "forest lodge village POI", "Cabins embedded in trees are coherent as a forest-settlement POI.", ["settlement", "forest", "village"], "available:forest_town"),
    choice("town_ruined_green_01", SETTLEMENT_A, 2, 7, "ruin", "ruined_town", "poi", "ruined settlement POI", "Broken walls and greenery form a compact ruin location, not a terrain swatch.", ["ruins", "settlement", "overgrown"], "poi:ruins"),
    choice("city_rowhouses_01", SETTLEMENT_A, 2, 8, "city_poi", "rowhouse_city", "city_poi", "urban city district POI", "Multi-building block reads as a city icon at overworld scale.", ["settlement", "city", "district"], "available:city"),
    choice("city_dense_red_roofs_01", SETTLEMENT_A, 3, 1, "city_poi", "dense_red_roof_city", "city_poi", "dense city POI", "Strong red-roof massing gives a readable capital/city marker.", ["settlement", "city", "dense"], "available:city"),
    choice("town_walled_gate_01", SETTLEMENT_A, 3, 2, "town_poi", "walled_gate_town", "settlement_poi", "walled town with gate POI", "Gate and walls create a clear fortified settlement silhouette.", ["settlement", "walled", "town"], "available:walled_town"),
    choice("castle_town_round_01", SETTLEMENT_A, 3, 3, "castle_poi", "round_castle_town", "fortification_poi", "castle town POI", "Round wall and dense houses make a good fortified town variant.", ["settlement", "castle", "walled"], "available:castle_town"),
    choice("castle_town_fortified_01", SETTLEMENT_A, 3, 4, "castle_poi", "fortified_castle_town", "fortification_poi", "primary castle/keep settlement POI", "Large fortified settlement is a better Ashen Keep world marker than a single generic castle.", ["settlement", "castle", "fortress"], "location:ashenKeep"),
    choice("city_capital_blue_01", SETTLEMENT_A, 3, 5, "city_poi", "capital_blue_roofs", "city_poi", "capital city POI", "Blue roofs and dense layout make it distinct from villages and forts.", ["settlement", "city", "capital"], "available:capital"),
    choice("city_holy_cathedral_01", SETTLEMENT_A, 3, 6, "religious_compound_poi", "holy_city_cathedral", "city_poi", "holy city or shrine-city POI", "Cathedral skyline makes a strong religious settlement marker.", ["settlement", "holy", "cathedral"], "location:tideShrine"),
    choice("city_port_01", SETTLEMENT_A, 3, 7, "harbor_poi", "port_city", "harbor_poi", "large port city POI", "Ships and waterfront buildings make this a strong harbor/city variant.", ["settlement", "harbor", "city"], "poi:harbor"),
    choice("town_snowy_walled_01", SETTLEMENT_A, 3, 8, "town_poi", "snowy_walled_town", "settlement_poi", "snowy walled town POI", "Snow-covered settlement reads cleanly and expands the winter POI set.", ["settlement", "snow", "walled"], "available:snow_town"),
    choice("fort_wooden_palisade_01", SETTLEMENT_A, 4, 1, "fort_poi", "wooden_palisade_fort", "fortification_poi", "wooden fort POI", "Palisade footprint is compact and useful for military/outpost roles.", ["fort", "wood", "palisade"], "available:fort"),
    choice("fort_stone_bailey_01", SETTLEMENT_A, 4, 2, "fort_poi", "stone_bailey_fort", "fortification_poi", "stone bailey fort POI", "Stone gate and internal yard are valid fort details for a single POI.", ["fort", "stone"], "available:fort"),
    choice("fort_wooden_outpost_01", SETTLEMENT_A, 4, 3, "fort_poi", "wooden_outpost", "fortification_poi", "wooden outpost POI", "Enclosed huts and fence give a distinct rustic fort variant.", ["fort", "outpost", "wood"], "available:fort"),
    choice("gatehouse_wood_stone_01", SETTLEMENT_A, 4, 4, "fort_poi", "wood_stone_gatehouse", "fortification_poi", "gatehouse or checkpoint POI", "Gatehouse reads well as route infrastructure or a small fortification.", ["gatehouse", "checkpoint"], "available:gatehouse"),
    choice("fortress_gate_gray_01", SETTLEMENT_A, 4, 5, "fort_poi", "gray_fortress_gate", "fortification_poi", "gray fortress gate POI", "Clean fortress silhouette and gate make it useful for military landmarks.", ["fortress", "gate"], "available:fortress"),
    choice("fortress_wall_gray_01", SETTLEMENT_A, 4, 6, "fort_poi", "gray_wall_fortress", "fortification_poi", "gray fortress wall POI", "Wall block is compact enough to serve as a fortress/keep icon.", ["fortress", "wall"], "available:fortress"),
    choice("fortress_large_gray_01", SETTLEMENT_A, 4, 7, "fort_poi", "large_gray_fortress", "fortification_poi", "large fortress POI", "Big readable castle mass fills a major-fortress role.", ["fortress", "castle"], "available:fortress"),
    choice("mountain_rock_cluster_large_01", SETTLEMENT_A, 4, 8, "natural_mountain", "rock_cluster_large", "mountain_overlay", "large mountain/rock overlay", "Large rock cluster is clean and can support mountain POI dressing.", ["mountain", "rock"], "available:mountain"),
    choice("keep_square_gray_01", SETTLEMENT_A, 5, 1, "castle_poi", "square_keep", "fortification_poi", "square keep POI", "Compact keep gives a smaller castle option.", ["castle", "keep"], "available:castle"),
    choice("castle_hill_green_01", SETTLEMENT_A, 5, 2, "castle_poi", "hill_castle", "fortification_poi", "hilltop castle POI", "Hill base is part of the landmark silhouette and reads naturally on overworld terrain.", ["castle", "hill"], "available:castle"),
    choice("castle_red_roof_01", SETTLEMENT_A, 5, 3, "castle_poi", "red_roof_castle", "fortification_poi", "red-roof castle POI", "Classic castle silhouette with clear roof color variant.", ["castle", "red_roof"], "available:castle"),
    choice("castle_dark_spires_01", SETTLEMENT_A, 5, 4, "castle_poi", "dark_spire_castle", "fortification_poi", "dark castle POI", "Dark spires create a strong enemy-fortress variant.", ["castle", "dark"], "available:dark_castle"),
    choice("castle_white_spires_01", SETTLEMENT_A, 5, 5, "castle_poi", "white_spire_castle", "fortification_poi", "white castle POI", "Bright castle gives a heroic/royal settlement variant.", ["castle", "white"], "available:castle"),
    choice("palace_gold_01", SETTLEMENT_A, 5, 6, "castle_poi", "golden_palace", "city_poi", "golden palace POI", "Gold domes are distinct enough for a capital or desert palace.", ["palace", "city", "gold"], "available:palace"),
    choice("castle_ice_01", SETTLEMENT_A, 5, 7, "castle_poi", "ice_castle", "fortification_poi", "ice castle POI", "Ice architecture gives a clean Frostmere/frozen-city landmark.", ["castle", "ice", "snow"], "available:ice_castle"),
    choice("dock_wooden_boats_01", SETTLEMENT_A, 6, 1, "dock", "wooden_dock_boats", "harbor_poi", "small dock with boats POI", "Standalone dock and boats are useful harbor infrastructure.", ["dock", "boat", "harbor"], "available:dock"),
    choice("dock_harbor_town_01", SETTLEMENT_A, 6, 2, "harbor_poi", "dock_harbor_town", "harbor_poi", "dockside harbor POI", "Water and dock are part of a compact harbor object, not base terrain.", ["dock", "harbor", "settlement"], "available:harbor"),
    choice("dockyard_blue_roofs_01", SETTLEMENT_A, 6, 3, "harbor_poi", "dockyard_blue_roofs", "harbor_poi", "dockyard district POI", "Buildings and piers make a reusable dockyard/port district.", ["dockyard", "harbor"], "available:dockyard"),
    choice("shipyard_workshop_01", SETTLEMENT_A, 6, 4, "harbor_poi", "shipyard_workshop", "harbor_poi", "shipyard POI", "Boat shed and pier details make the asset useful as harbor industry.", ["shipyard", "harbor"], "available:shipyard"),
    choice("warehouse_blue_roof_01", SETTLEMENT_A, 6, 5, "commercial_poi", "warehouse", "poi", "warehouse or dock storehouse POI", "Large warehouse has a clean footprint and works as infrastructure.", ["warehouse", "building"], "available:warehouse"),
    choice("lighthouse_red_01", SETTLEMENT_A, 6, 6, "harbor_poi", "lighthouse_red", "harbor_poi", "lighthouse POI variant", "Bright lighthouse reads immediately as a port/harbor marker.", ["lighthouse", "harbor"], "available:lighthouse"),
    choice("dock_crane_01", SETTLEMENT_A, 6, 7, "travel_infrastructure", "dock_crane", "harbor_poi", "dock crane POI", "Crane and pier are a strong port-industrial object.", ["dock", "crane", "harbor"], "available:dockyard"),
    choice("sea_gate_fortress_01", SETTLEMENT_A, 6, 8, "fort_poi", "sea_gate_fortress", "fortification_poi", "sea gate fortress POI", "Gate and wall composition can mark a fortified port entrance.", ["fortress", "gate", "harbor"], "available:sea_gate"),
    choice("dock_wooden_small_02", SETTLEMENT_A, 7, 1, "dock", "wooden_dock", "infrastructure", "wooden dock stamp", "Clean simple dock can support route/harbor overlays.", ["dock", "route"], "route:dockHorizontal"),
    choice("bridge_stone_horizontal_01", SETTLEMENT_A, 7, 2, "bridge", "stone_bridge_horizontal", "infrastructure", "horizontal stone bridge route stamp", "Standalone stone bridge is a direct upgrade over the placeholder bridge art.", ["bridge", "stone", "route"], "route:bridgeHorizontal"),
    choice("bridge_stone_arch_01", SETTLEMENT_A, 7, 3, "bridge", "stone_arch_bridge", "infrastructure", "arched stone bridge POI/route stamp", "Curved stone bridge gives a second bridge option for route crossings.", ["bridge", "stone", "route"], "available:bridge"),
    choice("gate_wood_wall_01", SETTLEMENT_A, 7, 4, "fort_poi", "wood_wall_gate", "fortification_poi", "wooden wall gate POI", "Gate is clean and works as route checkpoint or fort marker.", ["gate", "wood"], "available:gatehouse"),
    choice("city_gate_arch_01", SETTLEMENT_A, 7, 5, "fort_poi", "city_gate_arch", "fortification_poi", "city gate POI", "Stone arch gate reads well as a walled-city entrance.", ["gate", "city"], "available:gatehouse"),
    choice("inn_tavern_market_01", SETTLEMENT_A, 7, 7, "commercial_poi", "inn_tavern_market", "settlement_poi", "inn/tavern landmark POI", "Large tavern/market building is useful as a town landmark.", ["inn", "tavern", "commercial"], "available:inn"),
    choice("merchant_caravan_02", SETTLEMENT_A, 7, 8, "merchant_object", "merchant_caravan", "poi", "merchant caravan POI", "Wagons and tents read as a traveling merchant object.", ["merchant", "caravan"], "available:merchant"),
    choice("inn_tavern_large_01", SETTLEMENT_A, 8, 1, "commercial_poi", "large_inn", "settlement_poi", "large inn/tavern POI", "Readable facade with sign makes a strong settlement service marker.", ["inn", "tavern"], "available:inn"),
    choice("guild_hall_grand_01", SETTLEMENT_A, 8, 3, "commercial_poi", "guild_hall", "settlement_poi", "guild hall POI", "Grand facade reads as a civic/commercial destination.", ["guild", "building"], "available:guild"),
    choice("arena_colosseum_02", SETTLEMENT_A, 8, 4, "special_building_poi", "arena", "city_poi", "arena or colosseum POI", "Circular arena is highly readable and useful as a major city landmark.", ["arena", "city"], "available:arena"),
    choice("academy_civic_blue_01", SETTLEMENT_A, 8, 5, "special_building_poi", "academy_blue", "city_poi", "academy/civic campus POI", "Building plus courtyard reads as a school or civic compound.", ["academy", "city"], "available:academy"),
    choice("villa_park_green_01", SETTLEMENT_A, 8, 6, "settlement_poi", "villa_park", "settlement_poi", "villa or park compound POI", "The compact grounds are part of the POI silhouette and useful for a peaceful estate.", ["villa", "park"], "available:villa"),
    choice("academy_magic_purple_01", SETTLEMENT_A, 8, 7, "special_building_poi", "magic_academy", "city_poi", "magic academy POI", "Purple towers give an excellent magical civic landmark.", ["academy", "magic"], "location:skyglassTower"),
    choice("shrine_fountain_plaza_01", SETTLEMENT_A, 8, 8, "religious_compound_poi", "fountain_shrine", "poi", "fountain shrine compound POI", "Statues and fountain form a clean holy/plaza landmark.", ["shrine", "fountain"], "available:shrine"),
    choice("village_agricultural_silos_01", SETTLEMENT_B, 1, 3, "village_poi", "agricultural_village", "settlement_poi", "agricultural village variant", "Silos and field make a meaningfully different farming settlement.", ["settlement", "farm", "silos"], "available:village"),
    choice("village_swamp_boardwalk_01", SETTLEMENT_B, 1, 7, "village_poi", "swamp_boardwalk_village", "settlement_poi", "swamp boardwalk village variant", "Boardwalks and huts add a second usable swamp settlement.", ["settlement", "swamp"], "available:swamp_town"),
    choice("city_blue_roof_district_01", SETTLEMENT_B, 2, 8, "city_poi", "blue_roof_city_district", "city_poi", "blue-roof city district variant", "Bright roof rhythm reads as a clean city district.", ["settlement", "city"], "available:city"),
    choice("city_grand_blue_01", SETTLEMENT_B, 3, 5, "city_poi", "grand_blue_city", "city_poi", "grand blue city POI", "Grand domed city is distinct enough to keep as a capital variant.", ["settlement", "city", "capital"], "available:capital"),
    choice("city_holy_gold_01", SETTLEMENT_B, 3, 6, "religious_compound_poi", "holy_gold_city", "city_poi", "gold holy city POI", "Gold and white towers provide another strong religious/capital style.", ["settlement", "holy", "gold"], "available:holy_city"),
    choice("city_ice_blue_01", SETTLEMENT_B, 3, 8, "city_poi", "ice_city", "city_poi", "ice city POI", "Blue ice architecture is a clear snowy-region city/capital marker.", ["settlement", "ice", "city"], "available:ice_city"),
    choice("fortress_stone_compound_01", SETTLEMENT_B, 4, 4, "fort_poi", "stone_compound_fort", "fortification_poi", "stone fort compound variant", "Multiple walls and inner yard create a useful large fortification POI.", ["fort", "compound"], "available:fort"),
    choice("castle_mountain_keep_01", SETTLEMENT_B, 4, 8, "castle_poi", "mountain_keep", "fortification_poi", "mountain keep POI", "Castle embedded in rocks is a good mountain fortress landmark.", ["castle", "mountain"], "available:mountain_castle"),
    choice("castle_cliff_red_01", SETTLEMENT_B, 5, 2, "castle_poi", "cliff_castle_red", "fortification_poi", "cliff castle variant", "Hill/cliff base is part of the single castle POI silhouette.", ["castle", "cliff"], "available:castle"),
    choice("ice_palace_wall_01", SETTLEMENT_B, 5, 7, "castle_poi", "ice_palace_wall", "fortification_poi", "ice palace fortress variant", "Large ice wall is a distinct frozen palace/fortress option.", ["castle", "ice"], "available:ice_castle"),
    choice("dock_wooden_t_shape_01", SETTLEMENT_B, 6, 1, "dock", "wooden_t_dock", "infrastructure", "T-shaped dock route/harbor stamp", "Clean T dock is a better vertical dock candidate than the placeholder.", ["dock", "route", "harbor"], "route:dockVertical"),
    choice("lighthouse_beacon_01", SETTLEMENT_B, 6, 6, "harbor_poi", "lighthouse_beacon", "harbor_poi", "beacon lighthouse variant", "Strong beam silhouette makes this a useful port landmark.", ["lighthouse", "beacon"], "available:lighthouse"),
    choice("tavern_with_sign_01", SETTLEMENT_B, 8, 1, "commercial_poi", "tavern_with_sign", "settlement_poi", "tavern/inn building variant", "Warm facade and sign silhouette read as a service building.", ["tavern", "inn"], "available:inn"),
    choice("blacksmith_shop_01", SETTLEMENT_B, 8, 2, "commercial_poi", "blacksmith_shop", "settlement_poi", "blacksmith shop variant", "Forge chimney and lit doorway make a strong commercial POI.", ["blacksmith", "shop"], "available:blacksmith"),
    choice("city_hall_blue_roof_01", SETTLEMENT_B, 8, 3, "special_building_poi", "city_hall", "city_poi", "city hall or guild POI", "Large formal facade is useful as a civic city building.", ["city", "civic"], "available:guild"),
    choice("academy_violet_01", SETTLEMENT_B, 8, 7, "special_building_poi", "violet_academy", "city_poi", "violet academy variant", "Distinct purple roof makes a good magic school or special city marker.", ["academy", "magic"], "available:academy"),
    choice("memorial_park_statue_01", SETTLEMENT_B, 8, 8, "religious_compound_poi", "memorial_park", "poi", "memorial park or shrine POI", "Statue plaza reads cleanly as a special landmark.", ["memorial", "statue"], "available:shrine"),
    choice("monastery_compound_01", SETTLEMENT_C, 8, 5, "religious_compound_poi", "monastery_compound", "city_poi", "monastery compound POI", "Enclosed monastery/campus composition is clean and useful for religious roles.", ["monastery", "religious"], "available:monastery"),
    choice("academy_blue_grand_01", SETTLEMENT_C, 8, 7, "special_building_poi", "grand_blue_academy", "city_poi", "grand academy POI", "Blue domes and courtyard provide a strong school/civic landmark.", ["academy", "city"], "available:academy"),
    choice("cave_entrance_crystal_blue_02", DUNGEON_NEW, 1, 7, "dungeon_entrance", "crystal_cave", "dungeon_entrance", "crystal cave entrance variant", "Clean crystal cave gives an extra dungeon entrance with a strong fantasy silhouette.", ["cave", "crystal", "dungeon"], "available:cave"),
    choice("dungeon_gate_rune_blue_01", DUNGEON_NEW, 2, 5, "dungeon_entrance", "rune_gate", "dungeon_entrance", "rune dungeon gate", "Rune door is clean and useful for sealed dungeon entrances.", ["gate", "rune", "dungeon"], "available:dungeon_gate"),
    choice("temple_ruin_columns_01", DUNGEON_NEW, 3, 1, "ruin", "temple_columns_ruin", "poi", "temple column ruin POI", "Broken columns are readable and useful as a compact ruin icon.", ["ruins", "temple"], "available:ruins"),
    choice("graveyard_cluster_02", DUNGEON_NEW, 5, 1, "ruin", "graveyard_cluster", "poi", "graveyard POI", "The grass footprint is part of the graveyard POI and is acceptable for a landmark object.", ["graveyard", "ruins"], "available:graveyard"),
    choice("tombstone_haunted_purple_01", DUNGEON_NEW, 5, 6, "ruin", "haunted_tombstone", "poi", "haunted grave landmark", "Purple aura and tombstone read clearly as a haunted POI.", ["graveyard", "haunted"], "available:graveyard"),
    choice("rune_crystal_keyhole_01", DUNGEON_NEW, 6, 8, "quest_device", "crystal_keyhole", "quest_marker", "quest keyhole marker", "Clean glowing keyhole works as a quest lock or gate marker.", ["quest", "keyhole", "crystal"], "available:quest_device", anchor_y=0.86),
    choice("portal_violet_large_02", DUNGEON_NEW, 7, 1, "magical", "violet_portal", "quest_marker", "large portal variant", "Portal has clean alpha and strong overworld readability.", ["portal", "magic"], "available:portal", anchor_y=0.86),
    choice("portal_dark_pink_01", DUNGEON_NEW, 8, 1, "magical", "dark_pink_portal", "quest_marker", "dark portal variant", "Dark portal gives a more ominous gate/final marker option.", ["portal", "dark"], "available:portal", anchor_y=0.86),
    choice("final_shrine_light_01", DUNGEON_NEW, 8, 6, "endgame_landmark", "light_shrine", "quest_marker", "final/light shrine landmark", "Bright shrine is a high-value major objective marker.", ["shrine", "light", "final"], "available:final", anchor_y=0.86),
    choice(
        "signpost_directional_02",
        SETTLEMENT_B,
        7,
        6,
        "travel_infrastructure",
        "directional_signpost",
        "infrastructure",
        "directional signpost candidate",
        "Great shape for route signage, but the sign text should be manually cleaned or simplified before runtime use.",
        ["signpost", "route", "touchup"],
        "manual:signpost",
        bucket="touchup_needed",
        cleanup_notes="Small readable sign text remains; clean or repaint sign boards before runtime use.",
    ),
    choice(
        "dungeon_stair_caption_touchup_01",
        CAPTIONED_DUNGEON,
        2,
        3,
        "dungeon_entrance",
        "stone_stair",
        "dungeon_entrance",
        "caption-damaged dungeon stair candidate",
        "Useful dungeon entrance silhouette, but the source has caption remnants around the bottom edge.",
        ["dungeon", "stairs", "touchup"],
        "manual:dungeon",
        bucket="touchup_needed",
        cleanup_notes="Erase caption remnants and inspect lower edge alpha.",
    ),
    choice(
        "ruin_conservatory_touchup_01",
        CAPTIONED_DUNGEON,
        3,
        7,
        "ruin",
        "overgrown_ruin",
        "poi",
        "overgrown ruin candidate",
        "Strong jungle ruin composition, but the caption remnant needs manual erasing.",
        ["ruins", "jungle", "touchup"],
        "manual:ruins",
        bucket="touchup_needed",
        cleanup_notes="Remove small caption text and check the bottom edge.",
    ),
    choice(
        "small_shrine_touchup_01",
        CAPTIONED_DUNGEON,
        4,
        1,
        "religious_compound_poi",
        "small_shrine",
        "poi",
        "small shrine candidate",
        "Nice small shrine sprite, but the lower caption artifacts make it manual-cleanup only for now.",
        ["shrine", "touchup"],
        "manual:shrine",
        bucket="touchup_needed",
        cleanup_notes="Remove caption remnants near the bottom.",
    ),
    choice(
        "hilltop_shrine_touchup_01",
        CAPTIONED_DUNGEON,
        4,
        4,
        "religious_compound_poi",
        "hilltop_shrine",
        "poi",
        "hilltop shrine candidate",
        "Cool shrine-on-hill silhouette; needs small text/edge cleanup before runtime.",
        ["shrine", "hill", "touchup"],
        "manual:shrine",
        bucket="touchup_needed",
        cleanup_notes="Caption remnants and hill edge should be cleaned manually.",
    ),
    choice(
        "temple_building_touchup_01",
        CAPTIONED_DUNGEON,
        4,
        6,
        "religious_compound_poi",
        "temple_building",
        "poi",
        "temple building candidate",
        "Good temple silhouette, but caption residue is visible below the building.",
        ["temple", "touchup"],
        "manual:temple",
        bucket="touchup_needed",
        cleanup_notes="Erase caption remnants under the sprite.",
    ),
]


POI_MAPPINGS = {
    "town": "town_market_colorful_01",
    "harbor": "city_port_01",
    "cave": "cave_entrance_rock_01",
    "shrine": "city_holy_cathedral_01",
    "ruins": "town_ruined_green_01",
    "tower": "academy_magic_purple_01",
    "gate": "arcane_portal_purple_01",
    "final": "dark_spire_tower_01",
    "treasure": "treasure_chest_gold_01",
    "resource": "crystal_cluster_rainbow_01",
    "merchant": "merchant_stall_red_01",
    "monsterNest": "monster_egg_clutch_01",
}

LOCATION_MAPPINGS = {
    "dawnford": "village_farming_01",
    "brinewick": "city_port_01",
    "ashenKeep": "castle_town_fortified_01",
    "tideShrine": "city_holy_cathedral_01",
    "skyglassTower": "academy_magic_purple_01",
    "starfallGate": "arcane_portal_purple_01",
    "eclipseSpire": "dark_spire_tower_01",
}

ROUTE_MAPPINGS = {
    "dockHorizontal": "dock_wooden_small_02",
    "dockVertical": "dock_wooden_t_shape_01",
    "bridgeHorizontal": "bridge_stone_horizontal_01",
    "bridgeVertical": "bridge_stone_arch_01",
}

OBJECT_MAPPINGS = {
    "harbor_signpost": "city_port_01",
    "travel_flag_marker": "gatehouse_wood_stone_01",
    "mossy_cave_entrance": "cave_entrance_crystal_blue_02",
    "jungle_ruins_stairs": "town_ruined_green_01",
    "small_broken_ruins": "temple_ruin_columns_01",
    "glowing_magic_shrine": "academy_magic_purple_01",
    "cursed_fortress_gate": "gate_dark_fortress_01",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Relaxed curated recovery pass for overworld object sprites.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--source", action="append", type=Path, default=None, help="Source folder; can be supplied multiple times.")
    parser.add_argument("--integrate", action="store_true", help="Copy game-ready objects into the runtime manifest additively.")
    parser.add_argument("--reset-decisions", action="store_true", help="Overwrite the relaxed decisions file with script defaults.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_root: Path = args.output
    source_roots = args.source or DEFAULT_SOURCE_ROOTS
    ensure_folders(output_root)

    source_images, candidates, warnings = strict.scan_candidates(source_roots, output_root)
    decisions_path = output_root / "world_objects_v2_relaxed_decisions.json"
    decisions = load_or_write_decisions(decisions_path, args.reset_decisions)
    choice_by_key = {(entry["sourceFile"], entry["sourceRow"], entry["sourceCol"]): entry for entry in decisions["choices"]}

    source_count = len(source_images)
    variants_generated = 0
    metadata: list[dict[str, Any]] = []
    game_ready_entries: list[dict[str, Any]] = []
    touchup_entries: list[dict[str, Any]] = []
    rejected_entries: list[dict[str, Any]] = []
    method_reports: list[dict[str, Any]] = []
    method_samples: list[dict[str, Any]] = []

    approved_roots = {
        "game_ready": output_root / "game_ready_objects",
        "touchup_needed": output_root / "touchup_needed_objects",
    }
    rejected_root = output_root / "rejected_objects"
    for path in [*approved_roots.values(), rejected_root, output_root / "background_method_candidates"]:
        clear_folder(path)

    selected_keys = set(choice_by_key)
    existing_runtime_names = runtime_object_names()
    for candidate in candidates:
        candidate_image = strict.extract_candidate_image(candidate)
        variants = strict.background_variants_for_candidate(candidate_image, candidate)
        variants_generated += len(variants)
        best_variant = max(variants, key=lambda variant: variant.score)
        key = (candidate.source.path.name, candidate.row, candidate.col)
        decision = choice_by_key.get(key)
        method_reports.append(build_background_method_report(candidate, variants, best_variant, decision))
        if decision:
            selected = select_variant_for_decision(variants, decision)
            normalized, bbox = strict.normalize_approved_object(selected.image, decision)
            entry = build_metadata_entry(candidate, decision, variants, selected, normalized, bbox)
            if entry["filename"] in existing_runtime_names and not is_existing_relaxed_asset(entry["id"]):
                entry["filename"] = unique_relaxed_filename(entry["id"], existing_runtime_names)
                entry["notes"] += " Filename was adjusted to avoid overwriting an existing runtime asset."
            bucket = entry["qualityBucket"]
            output_path = approved_roots[bucket] / entry["filename"]
            normalized.save(output_path)
            metadata.append(entry)
            if bucket == "game_ready":
                game_ready_entries.append(entry)
            else:
                touchup_entries.append(entry)
            if len(method_samples) < 80:
                method_samples.append({"candidate": candidate, "variants": variants, "decision": decision})
            continue

        rejected = build_rejected_entry(candidate, selected_keys)
        rejected_entries.append(rejected)
        if len(rejected_entries) <= 240:
            thumb = candidate_image.convert("RGBA").resize((128, 128), Image.Resampling.NEAREST)
            thumb.save(rejected_root / f"{candidate.source.index:02d}_r{candidate.row or 0}c{candidate.col or 0}_{safe_stem(candidate.source.path.stem)}.png")

    write_json(output_root / "world_objects_v2_relaxed_metadata.json", metadata)
    write_json(output_root / "world_objects_v2_game_ready_metadata.json", game_ready_entries)
    write_json(output_root / "world_objects_v2_touchup_needed_metadata.json", touchup_entries)
    write_json(output_root / "world_objects_v2_rejected_report.json", rejected_entries)
    write_json(output_root / "world_objects_v2_background_methods_report.json", method_reports)

    make_contact_sheet(game_ready_entries, approved_roots["game_ready"], output_root / "world_objects_v2_game_ready_contactsheet.png", "game_ready")
    make_contact_sheet(touchup_entries, approved_roots["touchup_needed"], output_root / "world_objects_v2_touchup_needed_contactsheet.png", "touchup_needed")
    make_rejected_contactsheet(rejected_entries[:240], rejected_root, output_root / "world_objects_v2_rejected_contactsheet.png")
    make_background_method_contactsheet(method_samples, output_root / "world_objects_v2_background_method_contactsheet.png")
    save_background_method_samples(method_samples[:30], output_root / "background_method_candidates")
    make_fit_preview(game_ready_entries, touchup_entries, approved_roots, output_root / "world_objects_v2_fit_preview.png")
    make_alpha_preview(game_ready_entries, touchup_entries, approved_roots, output_root / "world_objects_v2_alpha_preview.png")

    runtime_mapping = build_runtime_mapping(game_ready_entries, touchup_entries)
    integration_result: dict[str, Any] | None = None
    if args.integrate:
        integration_result = integrate_runtime_objects(game_ready_entries, approved_roots["game_ready"], runtime_mapping)
        runtime_mapping["integrationResult"] = integration_result
    write_json(output_root / "world_objects_v2_runtime_mapping.json", runtime_mapping)

    write_readme(output_root / "README.md", source_roots, source_count, len(candidates), len(game_ready_entries), len(touchup_entries), len(rejected_entries))
    write_relaxed_report(
        output_root / "world_objects_v2_relaxed_report.md",
        source_roots,
        source_count,
        len(candidates),
        variants_generated,
        game_ready_entries,
        touchup_entries,
        rejected_entries,
        method_reports,
        integration_result,
    )
    write_integration_report(output_root / "world_objects_v2_integration_report.md", game_ready_entries, touchup_entries, runtime_mapping, integration_result)
    make_pack_zip(output_root)

    for warning in warnings:
        print(f"WARNING: {warning}")
    print(f"Source images found: {source_count}")
    print(f"Candidates inspected: {len(candidates)}")
    print(f"Cleanup variants generated: {variants_generated}")
    print(f"Game-ready additions: {len(game_ready_entries)}")
    print(f"Touchup-needed additions: {len(touchup_entries)}")
    print(f"Rejected/not selected: {len(rejected_entries)}")
    print(f"Output: {output_root}")
    if integration_result:
        print(f"Integrated runtime objects: {integration_result['integratedObjectCount']}")


def ensure_folders(output_root: Path) -> None:
    output_root.mkdir(parents=True, exist_ok=True)


def load_or_write_decisions(path: Path, reset: bool) -> dict[str, Any]:
    default = {
        "schemaVersion": 1,
        "selectionStandard": "relaxed curated pass; compact settlements/cities/harbors/castles are valid POI objects when visually strong",
        "notes": [
            "Edit this file to change buckets or runtime roles, then rerun the relaxed curator.",
            "Rows and columns are 1-indexed source atlas cells.",
            "This file is additive to the strict world_objects_v2 pack and does not replace the earlier approved set.",
        ],
        "choices": DEFAULT_CHOICES,
    }
    if reset or not path.exists():
        write_json(path, default)
        return default
    decisions = json.loads(path.read_text(encoding="utf-8"))
    existing_ids = {entry["id"] for entry in decisions.get("choices", [])}
    additions = [entry for entry in DEFAULT_CHOICES if entry["id"] not in existing_ids]
    if additions:
        decisions.setdefault("choices", []).extend(additions)
        decisions.setdefault("notes", []).append("New default relaxed choices were merged additively.")
        write_json(path, decisions)
    return decisions


def select_variant_for_decision(variants: list[Any], decision: dict[str, Any]) -> Any:
    requested = decision.get("selectedCleanupMethod")
    if requested:
        for variant in variants:
            if variant.method == requested:
                return variant
    alpha_variants = [variant for variant in variants if variant.method.startswith("alpha_preserved")]
    if alpha_variants:
        return max(alpha_variants, key=lambda variant: variant.score)
    return max(variants, key=lambda variant: variant.score)


def build_metadata_entry(
    candidate: Any,
    decision: dict[str, Any],
    variants: list[Any],
    variant: Any,
    normalized: Image.Image,
    bbox: dict[str, int],
) -> dict[str, Any]:
    source_bbox = strict.alpha_bbox(variant.image)
    edge_touch = strict.bbox_touches_edge(source_bbox, variant.image.size) if source_bbox else False
    bucket = decision["qualityBucket"]
    scores = score_for_bucket(bucket, edge_touch)
    return {
        "id": decision["id"],
        "filename": decision["filename"],
        "qualityBucket": bucket,
        "category": decision["category"],
        "subcategory": decision["subcategory"],
        "sourceFile": candidate.source.path.name,
        "sourceFolder": str(candidate.source.source_root),
        "sourceRow": candidate.row,
        "sourceCol": candidate.col,
        "sourceType": candidate.source_type,
        "selectedCleanupMethod": variant.method,
        "methodsAttempted": [item.method for item in variants],
        "originalSize": {"width": candidate.original_size[0], "height": candidate.original_size[1]},
        "outputSize": {"width": normalized.width, "height": normalized.height},
        "boundingBox": bbox,
        "sourceBoundingBox": strict.bbox_to_dict(source_bbox),
        "anchorX": decision["anchorX"],
        "anchorY": decision["anchorY"],
        "footprintWidth": decision["footprintWidth"],
        "footprintHeight": decision["footprintHeight"],
        "recommendedScale": decision["recommendedScale"],
        "placementLayer": decision["placementLayer"],
        "tags": decision["tags"],
        "intendedUse": decision["intendedUse"],
        "visualRationale": decision["visualRationale"],
        "cleanupNotes": decision["cleanupNotes"],
        "manualCleanupNeeded": decision["manualCleanupNeeded"],
        "integrationRole": decision["integrationRole"],
        "integrationStatus": decision["integrationStatus"],
        "duplicateGroup": decision["duplicateGroup"],
        "scores": scores,
        "qualityFlag": "approved" if bucket == "game_ready" else "touchup_needed",
        "backgroundQuality": "clean transparent PNG" if bucket == "game_ready" else "minor cleanup issue retained for manual pass",
        "edgeQuality": "clean" if not edge_touch and bucket == "game_ready" else "review recommended",
        "styleQuality": "fits compact SNES/PS1-era overworld POI/object style",
        "mapFitQuality": "valid as an overlay/POI object for semantic-mask terrain",
        "notes": decision["notes"],
    }


def score_for_bucket(bucket: str, edge_touch: bool) -> dict[str, int]:
    if bucket == "game_ready":
        return {
            "overallScore": 90 if edge_touch else 93,
            "styleScore": 91,
            "silhouetteScore": 90,
            "alphaScore": 88 if edge_touch else 94,
            "mapFitScore": 90,
            "readability32Score": 82,
            "uniquenessScore": 86,
            "coolnessScore": 90,
        }
    return {
        "overallScore": 78,
        "styleScore": 84,
        "silhouetteScore": 82,
        "alphaScore": 68,
        "mapFitScore": 78,
        "readability32Score": 72,
        "uniquenessScore": 82,
        "coolnessScore": 84,
    }


def build_background_method_report(candidate: Any, variants: list[Any], best_variant: Any, decision: dict[str, Any] | None) -> dict[str, Any]:
    selected = select_variant_for_decision(variants, decision) if decision else best_variant
    bucket = decision["qualityBucket"] if decision else "rejected"
    return {
        "sourceFile": candidate.source.path.name,
        "sourceFolder": str(candidate.source.source_root),
        "sourceRow": candidate.row,
        "sourceCol": candidate.col,
        "sourceType": candidate.source_type,
        "methodsAttempted": [variant.method for variant in variants],
        "bestMethod": selected.method,
        "bestMethodReason": selected.reason,
        "rejectedMethods": [
            {"method": variant.method, "reason": "lower alpha/border score than selected method"}
            for variant in variants
            if variant.method != selected.method
        ],
        "alphaScore": min(100, max(0, selected.score)),
        "edgeScore": min(100, max(0, selected.score - 2)),
        "haloScore": min(100, max(0, selected.score - 4)),
        "cleanupBucket": bucket,
        "notes": "Selected by visual relaxed decision file; settlements are accepted as POI objects when compact and readable."
        if decision
        else "Not chosen for this additive relaxed pack, usually because it was duplicate, lower priority, or not as useful as selected variants.",
    }


def build_rejected_entry(candidate: Any, selected_keys: set[tuple[str, int | None, int | None]]) -> dict[str, Any]:
    source_name = candidate.source.path.name
    reason = "too_similar"
    notes = "Not selected for the additive relaxed pack; existing strict/runtime assets or selected relaxed variants cover this role better."
    if source_name.endswith(".jpeg") or candidate.source.source_root.name == "bg_input_2":
        reason = "duplicate_of_better_chosen"
        notes = "Raw source counterpart was reviewed through its alpha-cleaned bg_output_2 variant where available."
    return {
        "sourceFile": source_name,
        "sourceFolder": str(candidate.source.source_root),
        "sourceRow": candidate.row,
        "sourceCol": candidate.col,
        "reason": reason,
        "notes": notes,
    }


def make_contact_sheet(entries: list[dict[str, Any]], root: Path, path: Path, title: str) -> None:
    if not entries:
        Image.new("RGB", (512, 128), (30, 30, 34)).save(path)
        return
    groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entry in sorted(entries, key=lambda item: (item["category"], item["id"])):
        groups[entry["category"]].append(entry)

    tile = 112
    label_h = 38
    cols = 6
    sections: list[Image.Image] = []
    font, small = load_fonts()
    for category, items in groups.items():
        rows = math.ceil(len(items) / cols)
        section = Image.new("RGB", (cols * tile, rows * (tile + label_h) + 28), (27, 27, 31))
        draw = ImageDraw.Draw(section)
        draw.text((6, 6), f"{title}: {category}", fill=(255, 255, 255), font=font)
        for index, entry in enumerate(items):
            x = (index % cols) * tile
            y = 28 + (index // cols) * (tile + label_h)
            image = Image.open(root / entry["filename"]).convert("RGBA")
            preview = checkerboard((tile, tile), 14)
            preview.alpha_composite(image.resize((tile, tile), Image.Resampling.NEAREST))
            section.paste(preview.convert("RGB"), (x, y))
            draw.text((x + 3, y + tile + 2), entry["id"][:22], fill=(235, 235, 235), font=small)
            if entry["qualityBucket"] == "touchup_needed":
                draw.text((x + 3, y + tile + 18), "touchup", fill=(255, 205, 112), font=small)
        sections.append(section)
    stitch_vertical(sections, path)


def make_rejected_contactsheet(entries: list[dict[str, Any]], root: Path, path: Path) -> None:
    files = sorted(root.glob("*.png"))
    if not files:
        Image.new("RGB", (512, 128), (30, 30, 34)).save(path)
        return
    tile = 96
    label_h = 28
    cols = 8
    rows = math.ceil(len(files) / cols)
    sheet = Image.new("RGB", (cols * tile, rows * (tile + label_h)), (28, 28, 32))
    draw = ImageDraw.Draw(sheet)
    _, small = load_fonts()
    for index, file in enumerate(files):
        x = (index % cols) * tile
        y = (index // cols) * (tile + label_h)
        image = Image.open(file).convert("RGBA").resize((tile, tile), Image.Resampling.NEAREST)
        bg = checkerboard((tile, tile), 12)
        bg.alpha_composite(image)
        sheet.paste(bg.convert("RGB"), (x, y))
        reason = entries[index]["reason"] if index < len(entries) else "not_selected"
        draw.text((x + 2, y + tile + 2), reason[:18], fill=(255, 185, 185), font=small)
    sheet.save(path)


def make_background_method_contactsheet(samples: list[dict[str, Any]], path: Path) -> None:
    if not samples:
        Image.new("RGB", (512, 128), (30, 30, 34)).save(path)
        return
    tile = 96
    label_h = 34
    max_methods = 4
    rows = len(samples)
    sheet = Image.new("RGB", ((max_methods + 1) * tile, rows * (tile + label_h)), (28, 28, 32))
    draw = ImageDraw.Draw(sheet)
    _, small = load_fonts()
    for row, sample in enumerate(samples):
        candidate = sample["candidate"]
        variants = sample["variants"][:max_methods]
        y = row * (tile + label_h)
        draw.text((2, y + 2), f"{candidate.source.path.name[:18]} r{candidate.row}c{candidate.col}", fill=(255, 255, 255), font=small)
        for col, variant in enumerate(variants):
            x = col * tile
            bg = checkerboard((tile, tile), 12)
            bg.alpha_composite(variant.image.resize((tile, tile), Image.Resampling.NEAREST))
            sheet.paste(bg.convert("RGB"), (x, y + label_h))
            draw.text((x + 2, y + 16), variant.method[:18], fill=(210, 230, 255), font=small)
    sheet.save(path)


def save_background_method_samples(samples: list[dict[str, Any]], root: Path) -> None:
    clear_folder(root)
    for sample in samples:
        candidate = sample["candidate"]
        sample_dir = root / f"{safe_stem(candidate.source.path.stem)}_r{candidate.row}c{candidate.col}"
        sample_dir.mkdir(parents=True, exist_ok=True)
        for variant in sample["variants"][:6]:
            variant.image.save(sample_dir / f"{variant.method}.png")


def make_fit_preview(
    game_ready_entries: list[dict[str, Any]],
    touchup_entries: list[dict[str, Any]],
    roots: dict[str, Path],
    path: Path,
) -> None:
    entries = game_ready_entries + touchup_entries
    backgrounds = load_preview_backgrounds()
    make_matrix_preview(entries, roots, backgrounds, path, label="fit")


def make_alpha_preview(
    game_ready_entries: list[dict[str, Any]],
    touchup_entries: list[dict[str, Any]],
    roots: dict[str, Path],
    path: Path,
) -> None:
    entries = game_ready_entries + touchup_entries
    backgrounds = [
        ("checker", checkerboard((128, 128), 16)),
        ("black", Image.new("RGBA", (128, 128), (0, 0, 0, 255))),
        ("white", Image.new("RGBA", (128, 128), (255, 255, 255, 255))),
        ("grass", fallback_background("grass", (128, 128))),
    ]
    make_matrix_preview(entries, roots, backgrounds, path, label="alpha")


def make_matrix_preview(entries: list[dict[str, Any]], roots: dict[str, Path], backgrounds: list[tuple[str, Image.Image]], path: Path, label: str) -> None:
    if not entries:
        Image.new("RGB", (512, 128), (30, 30, 34)).save(path)
        return
    cell = 128
    label_w = 220
    max_rows = len(entries)
    sheet = Image.new("RGB", (label_w + len(backgrounds) * cell, max_rows * cell), (28, 28, 32))
    draw = ImageDraw.Draw(sheet)
    _, small = load_fonts()
    for row, entry in enumerate(entries):
        y = row * cell
        draw.text((6, y + 6), entry["id"][:30], fill=(255, 255, 255), font=small)
        draw.text((6, y + 22), entry["qualityBucket"], fill=(255, 220, 120) if entry["qualityBucket"] == "touchup_needed" else (140, 255, 170), font=small)
        root = roots[entry["qualityBucket"]]
        sprite = Image.open(root / entry["filename"]).convert("RGBA").resize((cell, cell), Image.Resampling.NEAREST)
        for col, (_, bg) in enumerate(backgrounds):
            canvas = bg.copy().resize((cell, cell), Image.Resampling.NEAREST)
            canvas.alpha_composite(sprite)
            sheet.paste(canvas.convert("RGB"), (label_w + col * cell, y))
    sheet.save(path)


def build_runtime_mapping(game_ready: list[dict[str, Any]], touchup: list[dict[str, Any]]) -> dict[str, Any]:
    game_ready_ids = {entry["id"] for entry in game_ready}
    texture_by_id = {entry["id"]: texture_key_for(entry["id"]) for entry in game_ready}

    def mapped(mapping: dict[str, str]) -> dict[str, str]:
        return {key: texture_by_id[value] for key, value in mapping.items() if value in game_ready_ids}

    used_ids = set(POI_MAPPINGS.values()) | set(LOCATION_MAPPINGS.values()) | set(ROUTE_MAPPINGS.values()) | set(OBJECT_MAPPINGS.values())
    variants: dict[str, list[str]] = defaultdict(list)
    for entry in game_ready:
        role = variant_role(entry)
        if role:
            variants[role].append(texture_key_for(entry["id"]))

    touchup_by_role: dict[str, list[str]] = defaultdict(list)
    for entry in touchup:
        touchup_by_role[entry["integrationRole"]].append(entry["id"])

    return {
        "source": RELAXED_SOURCE,
        "gameReadyIntegrated": [entry["id"] for entry in game_ready],
        "poiMappings": mapped(POI_MAPPINGS),
        "locationIdMappings": mapped(LOCATION_MAPPINGS),
        "objectMappings": mapped(OBJECT_MAPPINGS),
        "routeMappings": mapped(ROUTE_MAPPINGS),
        "settlementVariantsByRole": {key: sorted(value) for key, value in sorted(variants.items())},
        "availableButUnmapped": sorted(entry["id"] for entry in game_ready if entry["id"] not in used_ids),
        "touchupCandidatesByRole": {key: sorted(value) for key, value in sorted(touchup_by_role.items())},
        "placeholdersReplaced": [
            "town/location POI mappings now use compact settlement sprites",
            "harbor/location POI mappings now use compact harbor-town sprites",
            "horizontal bridge route placeholder replaced with relaxed stone bridge object",
            "vertical dock route placeholder replaced with relaxed T-dock object",
        ],
        "placeholdersStillMissing": [
            "vertical stone bridge stamp remains placeholder",
            "shipwreck/broken mast water overlay remains placeholder",
            "true snowy pine forest cluster remains placeholder",
            "dedicated Starfall Gate sprite remains mapped to the existing clean portal until better art appears",
        ],
    }


def variant_role(entry: dict[str, Any]) -> str | None:
    category = entry["category"]
    subcategory = entry["subcategory"]
    if category in {"village_poi", "town_poi", "settlement_poi"}:
        return "settlement"
    if category == "city_poi":
        return "city"
    if category == "harbor_poi":
        return "harbor"
    if category in {"castle_poi", "fort_poi"}:
        return "fortification"
    if category == "religious_compound_poi":
        return "religious"
    if "academy" in subcategory:
        return "academy"
    return None


def integrate_runtime_objects(entries: list[dict[str, Any]], ready_root: Path, runtime_mapping: dict[str, Any]) -> dict[str, Any]:
    RUNTIME_OBJECT_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    old_relaxed_assets = [asset for asset in manifest["assets"] if asset.get("source") == RELAXED_SOURCE]
    for asset in old_relaxed_assets:
        filename = asset.get("filename", "")
        if filename.startswith("objects/"):
            path = RUNTIME_OBJECT_ROOT / Path(filename).name
            if path.exists():
                path.unlink()

    manifest["assets"] = [asset for asset in manifest["assets"] if asset.get("source") != RELAXED_SOURCE]

    for entry in entries:
        destination = RUNTIME_OBJECT_ROOT / entry["filename"]
        if destination.exists() and not any(asset.get("source") == RELAXED_SOURCE and asset.get("filename") == f"objects/{entry['filename']}" for asset in old_relaxed_assets):
            raise RuntimeError(f"Refusing to overwrite existing non-relaxed runtime object: {destination}")
        shutil.copy2(ready_root / entry["filename"], destination)

    manifest["assets"] = sorted(manifest["assets"] + [manifest_asset_for(entry) for entry in entries], key=lambda item: item["filename"])
    world_object_count = sum(1 for asset in manifest["assets"] if asset.get("assetKind") == "world object")
    manifest.setdefault("sourcePack", {})
    manifest["sourcePack"]["approvedWorldObjectCount"] = world_object_count
    manifest["sourcePack"]["relaxedObjectsFolder"] = str(DEFAULT_OUTPUT_ROOT / "game_ready_objects")
    manifest["sourcePack"]["relaxedTouchupObjectsFolder"] = str(DEFAULT_OUTPUT_ROOT / "touchup_needed_objects")
    manifest["sourcePack"]["relaxedObjectsMetadata"] = str(DEFAULT_OUTPUT_ROOT / "world_objects_v2_relaxed_metadata.json")
    manifest["sourcePack"]["relaxedGameReadyObjectCount"] = len(entries)
    manifest["sourcePack"]["relaxedTouchupObjectCount"] = sum(len(values) for values in runtime_mapping["touchupCandidatesByRole"].values())
    manifest["sourcePack"]["objectSelectionStandard"] = (
        "strict approved set plus relaxed additive recovery; compact settlements/cities/harbors/castles are valid POI objects, "
        "touchup-needed assets remain outside runtime"
    )

    for key, value in runtime_mapping["poiMappings"].items():
        manifest["poiMappings"][key] = value
    for key, value in runtime_mapping["locationIdMappings"].items():
        manifest["locationIdMappings"][key] = value
    for key, value in runtime_mapping["objectMappings"].items():
        manifest["objectMappings"][key] = value
    for key, value in runtime_mapping["routeMappings"].items():
        manifest["routeMappings"][key] = value
    manifest["poiVariantMappings"] = runtime_mapping["settlementVariantsByRole"]
    manifest["missingRuntimeRoles"] = [
        {
            "role": "settlement/city/harbor/castle POI sprites",
            "status": "expanded_with_relaxed_game_ready_assets",
            "notes": "Compact settlement, city, castle, and harbor compositions from the relaxed pass are valid POI objects and now drive key town/harbor/location mappings.",
        },
        {
            "role": "forest/tree overlay sprites",
            "status": "partially_replaced",
            "notes": "Strict approved broadleaf, jungle, pine, and autumn forest patches remain active. A true snow-covered pine cluster is still missing.",
        },
        {
            "role": "road/river/bridge art stamps",
            "status": "procedural_or_partially_replaced",
            "notes": "Roads and rivers remain procedural styled strokes. Relaxed game-ready dock and horizontal bridge objects replace more route placeholders; vertical stone bridge remains missing.",
        },
        {
            "role": "shipwreck and dedicated Starfall Gate sprites",
            "status": "placeholder_or_existing_mapping",
            "notes": "Shipwreck remains placeholder. Starfall Gate remains mapped to the existing clean portal until a stronger dedicated gate is curated.",
        },
    ]

    write_json(MANIFEST_PATH, manifest)
    return {
        "manifestPath": str(MANIFEST_PATH),
        "runtimeObjectFolder": str(RUNTIME_OBJECT_ROOT),
        "integratedObjectCount": len(entries),
        "worldObjectCountAfterIntegration": world_object_count,
        "poiRolesReplaced": sorted(runtime_mapping["poiMappings"].keys()),
        "locationRolesReplaced": sorted(runtime_mapping["locationIdMappings"].keys()),
        "routeRolesReplaced": sorted(runtime_mapping["routeMappings"].keys()),
        "placeholdersStillMissing": runtime_mapping["placeholdersStillMissing"],
    }


def manifest_asset_for(entry: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": entry["id"],
        "textureKey": texture_key_for(entry["id"]),
        "sourceFilename": entry["sourceFile"],
        "sourceSemanticId": entry["id"],
        "newCanonicalFilename": f"objects/{entry['filename']}",
        "filename": f"objects/{entry['filename']}",
        "category": entry["category"],
        "subcategory": entry["subcategory"],
        "semanticRole": entry["integrationRole"],
        "intendedRuntimeUsage": entry["intendedUse"],
        "assetKind": "world object",
        "dimensions": entry["outputSize"],
        "transparencyStatus": "alpha",
        "magentaKeyRemovalNeeded": False,
        "scaleCropPadNeeded": "none",
        "placeholder": False,
        "qualityFlag": "approved",
        "qualityBucket": "game_ready",
        "selectedSourceFile": entry["sourceFile"],
        "selectedSourceRow": entry["sourceRow"],
        "selectedSourceCol": entry["sourceCol"],
        "visualRationale": entry["visualRationale"],
        "backgroundRemovalMethod": entry["selectedCleanupMethod"],
        "anchorX": entry["anchorX"],
        "anchorY": entry["anchorY"],
        "footprintWidth": entry["footprintWidth"],
        "footprintHeight": entry["footprintHeight"],
        "recommendedScale": entry["recommendedScale"],
        "placementLayer": entry["placementLayer"],
        "tags": entry["tags"],
        "source": RELAXED_SOURCE,
        "integrationRole": entry["integrationRole"],
        "integrationStatus": "integrated",
        "notes": entry["notes"],
    }


def write_readme(path: Path, source_roots: list[Path], source_count: int, candidate_count: int, ready_count: int, touchup_count: int, rejected_count: int) -> None:
    lines = [
        "# Relaxed World Object Recovery Pack",
        "",
        "This additive pack recovers useful overworld objects from the second rembg/source pass.",
        "",
        "- `game_ready_objects/` contains transparent 256x256 PNGs safe for runtime integration.",
        "- `touchup_needed_objects/` contains chosen, useful objects that need manual cleanup before runtime use.",
        "- Compact settlements, cities, villages, harbors, castles, forts, and districts are valid POI sprites.",
        "- Roads, rivers, and base terrain are still renderer/terrain concerns; route stamps here are only overlay objects.",
        "",
        "Sources scanned:",
        *[f"- `{root}`" for root in source_roots],
        "",
        f"Source images: {source_count}",
        f"Candidate cells/images inspected: {candidate_count}",
        f"Game-ready additions: {ready_count}",
        f"Touchup-needed additions: {touchup_count}",
        f"Rejected/not selected: {rejected_count}",
        "",
        "Rerun:",
        "",
        "```powershell",
        "python tools\\world-object-curator\\curate_world_objects_relaxed.py --integrate",
        "```",
    ]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_relaxed_report(
    path: Path,
    source_roots: list[Path],
    source_count: int,
    candidate_count: int,
    variants_generated: int,
    game_ready: list[dict[str, Any]],
    touchup: list[dict[str, Any]],
    rejected: list[dict[str, Any]],
    method_reports: list[dict[str, Any]],
    integration_result: dict[str, Any] | None,
) -> None:
    category_counts = Counter(entry["category"] for entry in game_ready)
    touchup_counts = Counter(entry["category"] for entry in touchup)
    method_counts = Counter(report["bestMethod"] for report in method_reports if report["cleanupBucket"] != "rejected")
    settlement_ready = settlement_entries(game_ready)
    settlement_touchup = settlement_entries(touchup)
    lines = [
        "# Relaxed World Objects V2 Report",
        "",
        "## Source Folders Scanned",
        *[f"- `{root}`" for root in source_roots],
        "",
        "## Counts",
        f"- Source images found: {source_count}",
        f"- Candidate cells/images inspected: {candidate_count}",
        f"- Cleanup variants generated: {variants_generated}",
        f"- Game-ready objects: {len(game_ready)}",
        f"- Touchup-needed objects: {len(touchup)}",
        f"- Rejected/not selected: {len(rejected)}",
        "",
        "## Settlement Policy Correction",
        "Compact villages, towns, city districts, harbors, castle towns, forts, monasteries, academies, and similar POI compositions were treated as valid overworld POI sprites. They were not rejected for containing internal plazas, walls, docks, roads, or compact ground bases when those details formed one coherent icon.",
        "",
        "## Settlement Section",
        f"- Settlement/city/town/castle/harbor candidates promoted to game_ready: {len(settlement_ready)}",
        f"- Settlement/city/town/castle/harbor candidates promoted to touchup_needed: {len(settlement_touchup)}",
        f"- Settlement/city/town/castle/harbor candidates rejected/not selected: {settlement_rejected_count(rejected)}",
        "",
        "### Game-Ready Settlement POIs",
        *[f"- `{entry['id']}` ({entry['category']}): {entry['intendedUse']}" for entry in settlement_ready],
        "",
        "### Touchup Settlement POIs",
        *[f"- `{entry['id']}`: {entry['cleanupNotes']}" for entry in settlement_touchup],
        "",
        "## Major Categories Recovered",
        *[f"- {category}: {count}" for category, count in sorted(category_counts.items())],
        "",
        "## Touchup Categories",
        *[f"- {category}: {count}" for category, count in sorted(touchup_counts.items())],
        "",
        "## Best-Performing Background Methods",
        *[f"- {method}: {count}" for method, count in sorted(method_counts.items())],
        "",
        "## Categories Still Weak",
        "- Vertical stone bridge stamp remains missing.",
        "- Shipwreck/broken mast water overlay still needs stronger art.",
        "- True snow-covered pine forest cluster remains missing.",
        "- Dedicated Starfall Gate object remains missing; current clean portal stays active.",
        "",
        "## Integration Summary",
    ]
    if integration_result:
        lines.extend(
            [
                f"- Integrated runtime objects: {integration_result['integratedObjectCount']}",
                f"- Runtime object folder: `{integration_result['runtimeObjectFolder']}`",
                f"- Manifest: `{integration_result['manifestPath']}`",
                f"- POI roles updated: {', '.join(integration_result['poiRolesReplaced'])}",
                f"- Location roles updated: {', '.join(integration_result['locationRolesReplaced'])}",
                f"- Route roles updated: {', '.join(integration_result['routeRolesReplaced'])}",
            ]
        )
    else:
        lines.append("- Integration was not requested for this run.")
    lines.extend(
        [
            "",
            "## Commands To Rerun",
            "```powershell",
            "python tools\\world-object-curator\\curate_world_objects_relaxed.py --integrate",
            "npm test",
            "npm run build",
            "npm run worldgen:lab -- --seed test-settlement-pois --out tmp/worldgen-lab/test-settlement-pois",
            "```",
        ]
    )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_integration_report(
    path: Path,
    game_ready: list[dict[str, Any]],
    touchup: list[dict[str, Any]],
    runtime_mapping: dict[str, Any],
    integration_result: dict[str, Any] | None,
) -> None:
    settlement_ready = settlement_entries(game_ready)
    settlement_touchup = settlement_entries(touchup)
    lines = [
        "# Relaxed World Object Integration Report",
        "",
        f"- Game-ready count: {len(game_ready)}",
        f"- Touchup-needed count: {len(touchup)}",
        f"- Integrated count: {integration_result['integratedObjectCount'] if integration_result else 0}",
        "",
        "## Settlement Runtime Correction",
        f"- Settlement/city/town/castle/harbor game-ready: {len(settlement_ready)}",
        f"- Settlement/city/town/castle/harbor touchup-needed: {len(settlement_touchup)}",
        f"- POI roles replaced by settlement/city/town assets: {', '.join(sorted(runtime_mapping['poiMappings'].keys()))}",
        f"- Location roles replaced by settlement/city/town assets: {', '.join(sorted(runtime_mapping['locationIdMappings'].keys()))}",
        "",
        "## Settlement Variants Available Per Role",
    ]
    for role, values in runtime_mapping["settlementVariantsByRole"].items():
        lines.append(f"- {role}: {len(values)}")
    lines.extend(
        [
            "",
            "## Placeholder Roles Still Missing",
            *[f"- {item}" for item in runtime_mapping["placeholdersStillMissing"]],
            "",
            "## Manual Cleanup Candidates By Role",
        ]
    )
    for role, values in runtime_mapping["touchupCandidatesByRole"].items():
        lines.append(f"- {role}: {', '.join(values)}")
    lines.extend(
        [
            "",
            "## Approved But Not Active-Mapped",
            *[f"- {item}" for item in runtime_mapping["availableButUnmapped"]],
            "",
            "## Commands Run",
            "- `python tools\\world-object-curator\\curate_world_objects_relaxed.py --integrate`",
            "",
            "## Tests Run",
            "- Pending in this report until validation commands complete.",
        ]
    )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def make_pack_zip(output_root: Path) -> None:
    zip_path = output_root / "world_objects_v2_relaxed_pack.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for folder_name in ["game_ready_objects", "touchup_needed_objects"]:
            for path in sorted((output_root / folder_name).glob("*.png")):
                archive.write(path, f"{folder_name}/{path.name}")
        for filename in [
            "world_objects_v2_relaxed_metadata.json",
            "world_objects_v2_game_ready_metadata.json",
            "world_objects_v2_touchup_needed_metadata.json",
            "world_objects_v2_rejected_report.json",
            "world_objects_v2_background_methods_report.json",
            "world_objects_v2_relaxed_report.md",
            "world_objects_v2_integration_report.md",
            "world_objects_v2_runtime_mapping.json",
            "README.md",
        ]:
            path = output_root / filename
            if path.exists():
                archive.write(path, filename)


def settlement_entries(entries: list[dict[str, Any]]) -> list[dict[str, Any]]:
    settlement_categories = {
        "settlement_poi",
        "village_poi",
        "town_poi",
        "city_poi",
        "harbor_poi",
        "castle_poi",
        "fort_poi",
        "religious_compound_poi",
        "commercial_poi",
        "special_building_poi",
    }
    return [entry for entry in entries if entry["category"] in settlement_categories]


def settlement_rejected_count(rejected: list[dict[str, Any]]) -> int:
    return sum(1 for entry in rejected if entry["sourceFile"] in {SETTLEMENT_A, SETTLEMENT_B, SETTLEMENT_C})


def runtime_object_names() -> set[str]:
    if not RUNTIME_OBJECT_ROOT.exists():
        return set()
    return {path.name for path in RUNTIME_OBJECT_ROOT.glob("*.png")}


def is_existing_relaxed_asset(object_id: str) -> bool:
    if not MANIFEST_PATH.exists():
        return False
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return any(asset.get("id") == object_id and asset.get("source") == RELAXED_SOURCE for asset in manifest.get("assets", []))


def unique_relaxed_filename(object_id: str, existing_names: set[str]) -> str:
    index = 2
    while True:
        candidate = f"{object_id}_relaxed_{index:02d}.png"
        if candidate not in existing_names:
            existing_names.add(candidate)
            return candidate
        index += 1


def texture_key_for(object_id: str) -> str:
    return f"world_current_object_{object_id}"


def safe_stem(text: str) -> str:
    return "".join(char.lower() if char.isalnum() else "_" for char in text).strip("_")[:80]


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def clear_folder(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)
    for item in path.iterdir():
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()


def load_fonts() -> tuple[ImageFont.ImageFont, ImageFont.ImageFont]:
    try:
        return ImageFont.truetype("arial.ttf", 14), ImageFont.truetype("arial.ttf", 10)
    except Exception:
        font = ImageFont.load_default()
        return font, font


def checkerboard(size: tuple[int, int], square: int = 16) -> Image.Image:
    image = Image.new("RGBA", size, (42, 42, 46, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], square):
        for x in range(0, size[0], square):
            if ((x // square) + (y // square)) % 2 == 0:
                draw.rectangle([x, y, x + square - 1, y + square - 1], fill=(70, 72, 78, 255))
    return image


def stitch_vertical(sections: list[Image.Image], path: Path) -> None:
    if not sections:
        Image.new("RGB", (512, 128), (30, 30, 34)).save(path)
        return
    width = max(section.width for section in sections)
    height = sum(section.height for section in sections)
    output = Image.new("RGB", (width, height), (24, 24, 28))
    y = 0
    for section in sections:
        output.paste(section, (0, y))
        y += section.height
    output.save(path)


def load_preview_backgrounds() -> list[tuple[str, Image.Image]]:
    names = [
        ("grass", "terrain_grassland.png"),
        ("sand", "terrain_beach_sand.png"),
        ("snow", "terrain_snow.png"),
        ("stone", "terrain_mountain_stone.png"),
        ("swamp", "terrain_swamp_mud.png"),
        ("volcanic", "terrain_volcanic_ash.png"),
        ("water", "terrain_shallow_water.png"),
    ]
    root = RUNTIME_ROOT / "terrain"
    backgrounds: list[tuple[str, Image.Image]] = []
    for name, filename in names:
        path = root / filename
        if path.exists():
            backgrounds.append((name, Image.open(path).convert("RGBA").resize((128, 128), Image.Resampling.NEAREST)))
        else:
            backgrounds.append((name, fallback_background(name, (128, 128))))
    return backgrounds


def fallback_background(name: str, size: tuple[int, int]) -> Image.Image:
    colors = {
        "grass": (74, 160, 67, 255),
        "sand": (224, 191, 89, 255),
        "snow": (236, 246, 247, 255),
        "stone": (112, 112, 116, 255),
        "swamp": (66, 96, 58, 255),
        "volcanic": (52, 46, 47, 255),
        "water": (68, 167, 210, 255),
    }
    return Image.new("RGBA", size, colors.get(name, (90, 90, 90, 255)))


if __name__ == "__main__":
    main()
