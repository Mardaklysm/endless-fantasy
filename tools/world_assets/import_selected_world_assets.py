from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = Path(r"D:\atlas\output")
APPROVED_ROOT = SOURCE_ROOT / "approved_materials"
APPROVED_METADATA = SOURCE_ROOT / "terrain_materials_v2_approved_metadata.json"
RUNTIME_ROOT = PROJECT_ROOT / "src" / "assets" / "world" / "current"
MANIFEST_PATH = RUNTIME_ROOT / "world_asset_manifest.json"

CANONICAL_TERRAIN_NAMES = {
    "deep_ocean_water": ("terrain_deep_ocean", "deepOcean", "deep ocean base fill"),
    "clear_shallow_coastal_water": ("terrain_shallow_water", "shallowWater", "shallow water base fill"),
    "pale_beach_sand": ("terrain_beach_sand", "beach", "beach/coast sand base fill"),
    "bright_open_starter_grass": ("terrain_grassland", "grassland", "starter grassland base fill"),
    "flat_desert_sand": ("terrain_desert_sand", "sand", "desert sand base fill"),
    "clean_white_snow": ("terrain_snow", "ice", "snow/ice base fill"),
    "clear_freshwater_surface": ("terrain_freshwater", "freshwater", "river and lake material reference"),
}

SEMANTIC_TERRAIN = {
    "deepOcean": "world_current_terrain_deep_ocean",
    "shallowWater": "world_current_terrain_shallow_water",
    "beach": "world_current_terrain_beach_sand",
    "grassland": "world_current_terrain_grassland",
    "sand": "world_current_terrain_desert_sand",
    "ice": "world_current_terrain_snow",
}

ROUTE_MAPPINGS = {
    "dockHorizontal": "world_current_object_dock_wooden_small_02",
    "dockVertical": "world_current_object_dock_wooden_t_shape_01",
    "bridgeHorizontal": "world_current_object_bridge_stone_horizontal_01",
    "bridgeVertical": "world_current_object_bridge_stone_arch_01",
    "riverRendering": "asset_tile_mask_freshwater",
    "riverFreshwater": "world_current_terrain_freshwater",
    "roadRendering": "procedural_styled_stroke",
}

POI_MAPPINGS = {
    "town": "world_current_object_town_market_colorful_01",
    "harbor": "world_current_object_city_port_01",
    "cave": "world_current_object_cave_entrance_rock_01",
    "shrine": "world_current_object_city_holy_cathedral_01",
    "ruins": "world_current_object_town_ruined_green_01",
    "tower": "world_current_object_academy_magic_purple_01",
    "gate": "world_current_object_arcane_portal_purple_01",
    "final": "world_current_object_dark_spire_tower_01",
    "treasure": "world_current_object_treasure_chest_gold_01",
    "resource": "world_current_object_crystal_cluster_rainbow_01",
    "merchant": "world_current_object_merchant_stall_red_01",
    "monsterNest": "world_current_object_monster_egg_clutch_01",
}

LOCATION_ID_MAPPINGS = {
    "dawnford": "world_current_object_town_market_colorful_01",
    "brinewick": "world_current_object_city_port_01",
    "mossCave": "world_current_object_cave_entrance_rock_01",
    "ashenKeep": "world_current_object_town_ruined_green_01",
    "tideShrine": "world_current_object_city_holy_cathedral_01",
    "skyglassTower": "world_current_object_academy_magic_purple_01",
    "starfallGate": "world_current_object_arcane_portal_purple_01",
    "eclipseSpire": "world_current_object_dark_spire_tower_01",
}

OBJECT_MAPPINGS = {
    "mossy_cave_entrance": "world_current_object_cave_entrance_rock_01",
    "bandit_hideout_door": "world_current_object_cave_entrance_rock_01",
    "jungle_ruins_stairs": "world_current_object_town_ruined_green_01",
    "pirate_grotto_entrance": "world_current_object_cave_entrance_rock_01",
    "volcanic_temple_entrance": "world_current_object_town_ruined_green_01",
    "cursed_fortress_gate": "world_current_object_town_ruined_green_01",
    "ancient_sealed_door": "world_current_object_arcane_portal_purple_01",
    "dark_boss_portal": "world_current_object_dark_spire_tower_01",
    "small_broken_ruins": "world_current_object_town_ruined_green_01",
    "ruined_archway": "world_current_object_town_ruined_green_01",
    "cracked_stone_obelisk": "world_current_object_city_holy_cathedral_01",
    "mossy_statue": "world_current_object_city_holy_cathedral_01",
    "jungle_idol_shrine": "world_current_object_city_holy_cathedral_01",
    "glowing_magic_shrine": "world_current_object_city_holy_cathedral_01",
    "ancient_standing_stones": "world_current_object_city_holy_cathedral_01",
    "grave_marker_cluster": "world_current_object_town_ruined_green_01",
    "closed_treasure_chest": "world_current_object_treasure_chest_gold_01",
    "open_treasure_chest": "world_current_object_treasure_chest_gold_01",
    "stone_guardian_cache": "world_current_object_treasure_chest_gold_01",
    "supply_crates": "world_current_object_treasure_chest_gold_01",
    "barrel_stack": "world_current_object_treasure_chest_gold_01",
    "ore_node": "world_current_object_crystal_cluster_rainbow_01",
    "herb_bush": "world_current_object_deciduous_forest_patch_large_01",
    "fishing_spot": "world_current_object_shell_cluster_01",
    "octopus_cache": "world_current_object_treasure_chest_gold_01",
    "coral_cluster_blue": "world_current_object_shell_cluster_01",
    "jeweled_magic_cache": "world_current_object_treasure_chest_gold_01",
    "mossy_locked_cache": "world_current_object_treasure_chest_gold_01",
    "shipwreck_debris": "world_current_object_boat_sail_01",
    "broken_mast": "world_current_object_boat_sail_01",
    "floating_treasure_barrel": "world_current_object_treasure_chest_gold_01",
    "whirlpool_swirl": "world_current_object_shell_cluster_01",
    "harbor_signpost": "world_current_object_city_port_01",
    "wooden_rowboat": "world_current_object_city_port_01",
    "mooring_post_rope": "world_current_object_dock_wooden_t_shape_01",
    "anchor": "world_current_object_city_port_01",
    "dock_lantern_post": "world_current_object_city_port_01",
    "fishing_nets_stack": "world_current_object_city_port_01",
    "travel_flag_marker": "world_current_object_city_port_01",
    "coastal_market_stall": "world_current_object_merchant_stall_red_01",
    "monster_nest": "world_current_object_monster_egg_clutch_01",
    "campfire_cookpot": "world_current_object_merchant_stall_red_01",
    "secret_merchant_tent": "world_current_object_merchant_stall_red_01",
    "locked_iron_gate": "world_current_object_arcane_portal_purple_01",
    "ancient_key_pedestal": "world_current_object_city_holy_cathedral_01",
    "discovery_sparkle": "world_current_object_city_holy_cathedral_01",
    "smoke_plume": "world_current_object_town_ruined_green_01",
    "quest_notice_board": "world_current_object_town_market_colorful_01",
    "broadleaf_tree": "world_current_object_deciduous_forest_patch_large_01",
    "dark_pine_tree": "world_current_object_pine_forest_cluster_dark_01",
    "palm_tree": "world_current_object_deciduous_forest_patch_large_01",
    "dense_jungle_bush": "world_current_object_jungle_forest_patch_01",
    "thorn_bramble": "world_current_object_jungle_forest_patch_01",
    "fallen_log": "world_current_object_dead_tree_cluster_01",
    "giant_mushroom_cluster": "world_current_object_jungle_forest_patch_01",
    "vines_over_stone": "world_current_object_jungle_forest_patch_01",
    "gray_boulder_pile": "world_current_object_mountain_ridge_gray_01",
    "rocky_hill_object": "world_current_object_mountain_ridge_gray_01",
    "small_mountain_peak": "world_current_object_mountain_ridge_gray_01",
    "snowy_mountain_peak": "world_current_object_snow_mountain_ridge_01",
    "volcano_cone": "world_current_object_volcanic_crater_glowing_01",
    "lava_vent_rocks": "world_current_object_volcanic_crater_glowing_01",
    "black_ash_rock_cluster": "world_current_object_volcanic_crater_glowing_01",
    "cursed_purple_crystal_cluster": "world_current_object_dark_spire_tower_01",
}

PLACEHOLDERS: list[tuple[str, str, str, str]] = []


def main() -> None:
    raise SystemExit(
        "This legacy terrain-only importer is disabled for the current manifest-driven world asset set. "
        "It would overwrite approved object assets and could recreate deleted placeholder-era assumptions."
    )
    if not APPROVED_ROOT.exists():
        raise SystemExit(f"Missing approved material folder: {APPROVED_ROOT}")
    if not APPROVED_METADATA.exists():
        raise SystemExit(f"Missing approved metadata: {APPROVED_METADATA}")

    selected_metadata = json.loads(APPROVED_METADATA.read_text(encoding="utf-8"))
    reset_runtime_root()
    assets: list[dict[str, Any]] = []

    for entry in selected_metadata:
        selected_id = entry["id"]
        canonical_id, semantic_role, runtime_use = CANONICAL_TERRAIN_NAMES.get(
            selected_id,
            (f"terrain_{selected_id}", selected_id, "approved terrain fill variant"),
        )
        source = APPROVED_ROOT / entry["filename"]
        relative_path = Path("terrain") / f"{canonical_id}.png"
        target = RUNTIME_ROOT / relative_path
        normalize_png(source, target)
        dimensions, transparency_status = inspect_png(target)
        assets.append(
            {
                "id": canonical_id,
                "textureKey": f"world_current_{canonical_id}",
                "sourceFilename": entry["filename"],
                "sourceSemanticId": selected_id,
                "newCanonicalFilename": relative_path.as_posix(),
                "filename": relative_path.as_posix(),
                "category": entry["category"],
                "semanticRole": semantic_role,
                "intendedRuntimeUsage": runtime_use,
                "assetKind": "terrain fill",
                "dimensions": dimensions,
                "transparencyStatus": transparency_status,
                "magentaKeyRemovalNeeded": False,
                "scaleCropPadNeeded": "none",
                "placeholder": False,
                "qualityFlag": "approved",
                "selectedSourceFile": entry.get("selectedSourceFile"),
                "selectedSourceRow": entry.get("selectedSourceRow"),
                "selectedSourceCol": entry.get("selectedSourceCol"),
                "visualRationale": entry.get("visualRationale"),
                "notes": entry.get("notes"),
            }
        )

    for folder, placeholder_id, category, usage in PLACEHOLDERS:
        relative_path = Path(folder) / f"{placeholder_id}.png"
        target = RUNTIME_ROOT / relative_path
        draw_placeholder(target, placeholder_id)
        dimensions, transparency_status = inspect_png(target)
        assets.append(
            {
                "id": placeholder_id,
                "textureKey": f"world_current_{placeholder_id}",
                "sourceFilename": "generated_placeholder",
                "sourceSemanticId": None,
                "newCanonicalFilename": relative_path.as_posix(),
                "filename": relative_path.as_posix(),
                "category": category,
                "semanticRole": placeholder_id.replace("_", " "),
                "intendedRuntimeUsage": usage,
                "assetKind": asset_kind_for_folder(folder),
                "dimensions": dimensions,
                "transparencyStatus": transparency_status,
                "magentaKeyRemovalNeeded": False,
                "scaleCropPadNeeded": "none",
                "placeholder": True,
                "qualityFlag": "placeholder",
                "selectedSourceFile": None,
                "selectedSourceRow": None,
                "selectedSourceCol": None,
                "visualRationale": "Generated in-repo placeholder because the curated selected pack contains terrain fills only.",
                "notes": "Replace with approved selected art when available. This avoids falling back to deprecated atlas art.",
            }
        )

    manifest = {
        "schemaVersion": 1,
        "id": "world_current_selected_asset_set_v1",
        "runtimeRoot": "src/assets/world/current",
        "sourcePack": {
            "approvedMaterialsFolder": str(APPROVED_ROOT),
            "approvedMetadata": str(APPROVED_METADATA),
            "approvedTerrainMaterialCount": len(selected_metadata),
            "selectionStandard": "approved-subset-only; missing art is preferred to bad art",
        },
        "rendererContract": {
            "semanticWorldGenerationIsGameplayTruth": True,
            "baseTerrainUsesSemanticMaskFills": True,
            "roadsRiversCoastsMountainsForestsPoisAreOverlays": True,
            "randomBaseTerrainVariantSpam": False,
            "giantTransitionTilesets": False,
        },
        "semanticTerrain": SEMANTIC_TERRAIN,
        "routeMappings": ROUTE_MAPPINGS,
        "poiMappings": POI_MAPPINGS,
        "locationIdMappings": LOCATION_ID_MAPPINGS,
        "objectMappings": OBJECT_MAPPINGS,
        "deprecatedRuntimeSources": [
            "src/assets/world/atlas_v3.png",
            "src/assets/world/atlasV3.manifest.json",
            "src/assets/world/world_objects.png",
            "src/assets/world/worldObjectAtlas.manifest.json",
            "src/assets/world/pier_atlas.png",
        ],
        "missingRuntimeRoles": [
            {
                "role": "forest/tree overlay sprites",
                "status": "placeholder",
                "notes": "The curated 37 selected assets did not include transparent forest sprites.",
            },
            {
                "role": "mountain and snow mountain overlay sprites",
                "status": "placeholder",
                "notes": "The curated 37 selected assets did not include transparent mountain sprites.",
            },
            {
                "role": "POI sprites",
                "status": "placeholder",
                "notes": "Town, port, cave, shrine, ruins, tower, gate, final, treasure, resource, merchant, and shipwreck icons are generated placeholders.",
            },
            {
                "role": "road/river/bridge art stamps",
                "status": "river_asset_tiles_plus_placeholders",
                "notes": "Rivers render from the freshwater material through semantic tile masks. Roads stay procedural styled strokes. Dock/bridge sprites use explicit current-folder placeholders.",
            },
        ],
        "assets": sorted(assets, key=lambda item: item["filename"]),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(assets)} current world assets to {RUNTIME_ROOT}")
    print(f"Wrote manifest to {MANIFEST_PATH}")


def reset_runtime_root() -> None:
    if RUNTIME_ROOT.exists():
        shutil.rmtree(RUNTIME_ROOT)
    for folder in ["terrain", "overlays", "pois", "routes", "ui-debug"]:
        (RUNTIME_ROOT / folder).mkdir(parents=True, exist_ok=True)


def normalize_png(source: Path, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        if image.size != (256, 256):
            image = image.resize((256, 256), Image.Resampling.NEAREST)
        image.save(target, "PNG")


def inspect_png(path: Path) -> tuple[dict[str, int], str]:
    with Image.open(path) as image:
        alpha = image.getchannel("A") if "A" in image.getbands() else None
        transparency = "alpha" if alpha and alpha.getextrema()[0] < 255 else "opaque"
        return {"width": image.width, "height": image.height}, transparency


def draw_placeholder(target: Path, placeholder_id: str) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    if placeholder_id.startswith("overlay_tree"):
        draw_trees(draw, dense=False, snow=False)
    elif placeholder_id.startswith("overlay_dense"):
        draw_trees(draw, dense=True, snow=False)
    elif placeholder_id.startswith("overlay_snow"):
        draw_trees(draw, dense=True, snow=True)
    elif "snow_mountain" in placeholder_id:
        draw_mountain(draw, snow=True)
    elif "mountain" in placeholder_id:
        draw_mountain(draw, snow=False)
    elif "reef" in placeholder_id:
        draw_reef(draw)
    elif "volcanic" in placeholder_id:
        draw_volcano(draw)
    elif "dock" in placeholder_id or "bridge" in placeholder_id:
        draw_route(draw, vertical="vertical" in placeholder_id, stone="bridge" in placeholder_id)
    elif "town" in placeholder_id:
        draw_house(draw, roof=(188, 70, 44, 255))
    elif "port" in placeholder_id:
        draw_port(draw)
    elif "cave" in placeholder_id:
        draw_cave(draw)
    elif "shrine" in placeholder_id:
        draw_shrine(draw)
    elif "ruins" in placeholder_id:
        draw_ruins(draw)
    elif "tower" in placeholder_id:
        draw_tower(draw)
    elif "gate" in placeholder_id:
        draw_gate(draw)
    elif "final" in placeholder_id:
        draw_final(draw)
    elif "treasure" in placeholder_id:
        draw_chest(draw)
    elif "resource" in placeholder_id:
        draw_resource(draw)
    elif "merchant" in placeholder_id:
        draw_tent(draw)
    elif "monster" in placeholder_id:
        draw_nest(draw)
    elif "shipwreck" in placeholder_id:
        draw_shipwreck(draw)
    else:
        draw_house(draw, roof=(160, 120, 80, 255))
    image.save(target, "PNG")


def draw_trees(draw: ImageDraw.ImageDraw, dense: bool, snow: bool) -> None:
    trunks = [(88, 138), (128, 126), (168, 140), (110, 166), (150, 168)]
    if dense:
        trunks += [(68, 166), (190, 166), (128, 184)]
    for x, y in trunks:
        draw.rectangle([x - 6, y, x + 6, y + 38], fill=(93, 61, 35, 255))
        leaf = (45, 108, 54, 255) if not snow else (72, 116, 95, 255)
        hi = (90, 156, 73, 255) if not snow else (229, 246, 242, 255)
        draw.polygon([(x, y - 56), (x - 32, y + 8), (x + 32, y + 8)], fill=leaf)
        draw.polygon([(x, y - 34), (x - 26, y + 24), (x + 26, y + 24)], fill=leaf)
        if snow:
            draw.line([(x - 18, y - 18), (x + 12, y - 18)], fill=hi, width=6)
        else:
            draw.rectangle([x - 15, y - 6, x + 12, y + 0], fill=hi)


def draw_mountain(draw: ImageDraw.ImageDraw, snow: bool) -> None:
    base = (103, 96, 89, 255)
    dark = (58, 55, 55, 255)
    snow_color = (239, 249, 250, 255)
    draw.polygon([(34, 214), (118, 46), (212, 214)], fill=dark)
    draw.polygon([(66, 214), (128, 68), (224, 214)], fill=base)
    draw.polygon([(118, 46), (92, 98), (128, 82), (148, 118)], fill=snow_color if snow else (151, 143, 132, 255))
    if snow:
        draw.rectangle([78, 170, 194, 184], fill=(211, 234, 234, 255))


def draw_route(draw: ImageDraw.ImageDraw, vertical: bool, stone: bool) -> None:
    base = (175, 164, 145, 255) if stone else (144, 93, 52, 255)
    light = (228, 211, 169, 255) if stone else (221, 170, 94, 255)
    if vertical:
        draw.rectangle([96, 20, 160, 236], fill=(23, 26, 31, 120))
        draw.rectangle([108, 16, 148, 240], fill=base)
        for y in range(36, 232, 34):
            draw.rectangle([108, y, 148, y + 6], fill=light)
    else:
        draw.rectangle([20, 96, 236, 160], fill=(23, 26, 31, 120))
        draw.rectangle([16, 108, 240, 148], fill=base)
        for x in range(36, 232, 34):
            draw.rectangle([x, 108, x + 6, 148], fill=light)


def draw_house(draw: ImageDraw.ImageDraw, roof: tuple[int, int, int, int]) -> None:
    draw.rectangle([70, 104, 186, 202], fill=(238, 224, 190, 255))
    draw.polygon([(54, 112), (128, 48), (202, 112)], fill=roof)
    draw.rectangle([114, 150, 142, 202], fill=(44, 48, 60, 255))
    draw.rectangle([84, 130, 108, 154], fill=(248, 222, 129, 255))
    draw.rectangle([150, 130, 174, 154], fill=(248, 222, 129, 255))


def draw_port(draw: ImageDraw.ImageDraw) -> None:
    draw_house(draw, (57, 135, 176, 255))
    draw.rectangle([48, 204, 208, 224], fill=(139, 87, 49, 255))
    draw.polygon([(105, 206), (130, 154), (156, 206)], fill=(238, 246, 230, 255))


def draw_cave(draw: ImageDraw.ImageDraw) -> None:
    draw.polygon([(42, 210), (128, 54), (216, 210)], fill=(88, 90, 82, 255))
    draw.rectangle([88, 136, 168, 210], fill=(18, 25, 24, 255))
    draw.rectangle([66, 184, 94, 204], fill=(67, 132, 67, 255))


def draw_shrine(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([72, 106, 184, 204], fill=(213, 222, 225, 255))
    draw.polygon([(56, 110), (128, 48), (200, 110)], fill=(79, 178, 202, 255))
    draw.rectangle([114, 140, 142, 204], fill=(34, 88, 111, 255))


def draw_ruins(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([54, 130, 82, 206], fill=(104, 100, 94, 255))
    draw.rectangle([174, 116, 202, 206], fill=(104, 100, 94, 255))
    draw.rectangle([76, 96, 184, 124], fill=(126, 119, 107, 255))
    draw.rectangle([98, 154, 158, 206], fill=(35, 32, 34, 255))


def draw_tower(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([96, 60, 160, 210], fill=(103, 114, 128, 255))
    draw.polygon([(80, 70), (128, 24), (176, 70)], fill=(129, 229, 238, 255))
    draw.rectangle([116, 160, 140, 210], fill=(38, 50, 65, 255))


def draw_gate(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([58, 66, 94, 210], fill=(80, 73, 121, 255))
    draw.rectangle([162, 66, 198, 210], fill=(80, 73, 121, 255))
    draw.rectangle([82, 88, 174, 110], fill=(214, 200, 255, 255))
    draw.ellipse([100, 30, 156, 86], fill=(255, 224, 118, 255))


def draw_final(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse([62, 62, 194, 194], fill=(63, 42, 106, 230))
    draw.ellipse([92, 92, 164, 164], fill=(22, 16, 40, 255))
    draw.rectangle([122, 26, 134, 230], fill=(207, 149, 255, 255))
    draw.rectangle([26, 122, 230, 134], fill=(207, 149, 255, 255))


def draw_chest(draw: ImageDraw.ImageDraw) -> None:
    draw.rectangle([62, 100, 194, 190], fill=(125, 77, 36, 255))
    draw.rectangle([62, 122, 194, 146], fill=(74, 45, 28, 255))
    draw.rectangle([112, 120, 144, 160], fill=(236, 198, 85, 255))


def draw_resource(draw: ImageDraw.ImageDraw) -> None:
    draw.polygon([(66, 204), (98, 104), (132, 204)], fill=(85, 86, 92, 255))
    draw.polygon([(118, 204), (158, 76), (206, 204)], fill=(112, 115, 121, 255))
    draw.rectangle([134, 132, 164, 150], fill=(137, 220, 232, 255))


def draw_tent(draw: ImageDraw.ImageDraw) -> None:
    draw.polygon([(46, 206), (128, 66), (210, 206)], fill=(219, 126, 70, 255))
    draw.polygon([(96, 206), (128, 96), (162, 206)], fill=(245, 191, 101, 255))
    draw.rectangle([116, 162, 140, 206], fill=(54, 45, 42, 255))


def draw_nest(draw: ImageDraw.ImageDraw) -> None:
    draw.ellipse([46, 94, 210, 210], fill=(111, 75, 52, 255))
    draw.ellipse([76, 118, 180, 188], fill=(50, 35, 31, 255))
    draw.rectangle([92, 82, 108, 122], fill=(166, 115, 72, 255))
    draw.rectangle([150, 76, 166, 122], fill=(166, 115, 72, 255))


def draw_shipwreck(draw: ImageDraw.ImageDraw) -> None:
    draw.polygon([(54, 178), (176, 144), (214, 172), (190, 202), (80, 210)], fill=(105, 70, 47, 255))
    draw.rectangle([122, 74, 134, 166], fill=(88, 60, 43, 255))
    draw.polygon([(134, 82), (184, 116), (134, 134)], fill=(214, 203, 172, 255))


def draw_reef(draw: ImageDraw.ImageDraw) -> None:
    draw.polygon([(74, 196), (112, 96), (148, 196)], fill=(225, 203, 126, 255))
    draw.rectangle([154, 140, 184, 196], fill=(96, 125, 139, 255))
    draw.rectangle([98, 154, 126, 196], fill=(80, 184, 192, 255))


def draw_volcano(draw: ImageDraw.ImageDraw) -> None:
    draw.polygon([(42, 214), (118, 76), (214, 214)], fill=(65, 56, 54, 255))
    draw.polygon([(94, 118), (122, 78), (152, 118)], fill=(230, 91, 45, 255))
    draw.rectangle([110, 176, 146, 214], fill=(230, 91, 45, 255))


def asset_kind_for_folder(folder: str) -> str:
    if folder == "overlays":
        return "overlay sprite"
    if folder == "pois":
        return "POI sprite"
    if folder == "routes":
        return "route/river asset"
    return "debug-only"


if __name__ == "__main__":
    main()
