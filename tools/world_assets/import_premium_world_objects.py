#!/usr/bin/env python3
"""Import approved premium overworld objects into the current manifest.

This importer is intentionally permissive: D:\Tools\rembg\bg_output is treated
as an approved premium source for this pass. It performs technical validation,
slices known atlas sheet layouts, preserves pixels/alpha, and wires premium
assets as preferred runtime mappings without deleting the backup object folder.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = Path(r"D:\Tools\rembg\bg_output")
RUNTIME_ROOT = PROJECT_ROOT / "src" / "assets" / "world" / "current"
PREMIUM_ROOT = RUNTIME_ROOT / "objects_premium"
MANIFEST_PATH = RUNTIME_ROOT / "world_asset_manifest.json"
DEFAULT_REPORT_PATH = PROJECT_ROOT / "tmp" / "premium-world-object-import-report.md"
DEFAULT_METADATA_PATH = PROJECT_ROOT / "tmp" / "premium-world-object-metadata.json"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


SHEET_CELL_IDS: dict[str, list[list[str]]] = {
    "Create_an_overworld_object_atlas_202606211934 (2).png": [
        ["cave_rock_entrance", "mine_wood_entrance", "temple_cave_entrance", "stone_dungeon_gate"],
        ["ruin_columns", "ruin_arch_blocks", "desert_ruin_house", "snow_cave_entrance"],
        ["small_temple", "grand_temple", "rune_obelisk", "graveyard_cluster"],
        ["rune_pedestal_blue", "locked_stone_chest", "portal_stone_swirl", "light_beacon_pillar"],
    ],
    "Create_an_overworld_object_atlas_202606211958.png": [
        ["forest_deciduous_cluster", "forest_dense_broadleaf", "forest_pine_cluster", "forest_autumn_cluster"],
        ["jungle_palm_cluster", "swamp_dead_tree_cluster", "dead_tree_pair", "dead_scrub_cluster"],
        ["cactus_desert_cluster", "desert_rock_arch", "mushroom_grove_colorful", "crystal_cluster_prismatic"],
        ["ancient_tree_giant", "waterfall_cliff", "hot_spring_pool", "ice_crystal_spring"],
    ],
    "Create_an_overworld_object_atlas_202606212003 (3).png": [
        ["berry_bush_cluster", "herb_flower_patch", "ore_vein_rock", "crystal_cluster_large"],
        ["treasure_chest_gold", "treasure_chest_locked", "buried_treasure_mound", "rune_cube"],
        ["thorn_bramble_patch", "campfire_stone", "mushroom_cluster_poison", "dark_pit_chasm"],
        ["rune_tablet", "lever_metal", "magic_lock", "gem_obelisk"],
    ],
    "Create_an_overworld_object_atlas_202606212003 (6).png": [
        ["dock_short_horizontal", "wooden_bridge_horizontal", "stone_bridge_arch", "stepping_stones_cluster"],
        ["dock_short_vertical", "dock_long_horizontal", "dock_pier_t_shape", "dock_crane"],
        ["rowboat", "sailboat", "barge_boat", "ship_anchor_marker"],
        ["signpost_blank", "lantern_post", "gate_barrier", "market_stall_wood"],
    ],
    "Create_an_overworld_object_atlas_202606212015 (2).png": [
        ["snow_village", "snow_castle", "desert_town_market", "desert_oasis_town"],
        ["swamp_village_stilts", "swamp_village_shrine", "jungle_treehouse_village", "jungle_temple_village"],
        ["volcanic_fortress", "dark_castle", "haunted_ruined_village", "deadland_village"],
        ["ice_temple", "desert_ruins_city", "jungle_ruin_city", "lava_dark_gate"],
    ],
    "Create_an_overworld_object_atlas_202606212015.png": [
        ["adventurer_camp", "bandit_camp_palisade", "monster_lair_bone", "fort_gatehouse"],
        ["animal_burrow_cave", "gold_mine_entrance", "rune_circle_green", "demon_altar"],
        ["bone_battlefield", "ruined_watchtower", "arena_pit", "siege_weapons"],
        ["sealed_gate_chained", "dark_rune_obelisk", "magic_circle_purple", "dark_castle_gate"],
    ],
    "Create_an_overworld_object_atlas_202606212021 (1).png": [
        ["green_hills", "green_mountain_ridge", "mossy_cliff_plateau", "pine_mountain_ridge"],
        ["snow_hills", "snow_mountain_ridge", "ice_columns", "ice_spires"],
        ["dark_mountain_ridge", "volcano_crater", "obsidian_crags", "ash_mountain"],
        ["red_rock_cluster", "boulder_pile", "stone_arch_natural", "highspire_mountain"],
    ],
    "Create_an_overworld_object_atlas_202606212023 (2).png": [
        ["hamlet_straw_huts", "village_plain_houses", "farming_village_silos", "palisade_village"],
        ["market_town_tents", "stone_village_gray", "monastery_village", "forest_lodge_village"],
        ["dock_village_small", "desert_village_oasis", "snowy_village_houses", "swamp_stilt_huts"],
        ["castle_town_keep", "walled_town_square", "church_town", "wizard_tower_village"],
    ],
    "Create_an_overworld_object_atlas_202606212036.png": [
        ["green_castle", "forest_house", "snow_castle_large", "ice_palace"],
        ["desert_fort", "desert_town_palms", "red_rock_fortress", "haunted_black_fort"],
        ["swamp_ruin_village", "jungle_pyramid", "island_fortress", "shipwreck_ruin"],
        ["volcano_fortress", "black_mountain_gate", "crystal_castle", "dark_haunted_castle"],
    ],
}


BACKUP_TEXTURE_REPLACEMENTS = {
    "world_current_object_cave_entrance_crystal_blue_02": "world_current_object_cave_entrance_rock_01",
    "world_current_object_gate_wood_wall_01": "world_current_object_city_gate_arch_01",
    "world_current_object_gatehouse_wood_stone_01": "world_current_object_city_gate_arch_01",
    "world_current_object_inn_tavern_market_01": "world_current_object_town_tavern_01",
    "world_current_object_iron_gate_locked_01": "world_current_object_gate_dark_fortress_01",
    "world_current_object_lighthouse_beacon_01": "world_current_object_lighthouse_red_01",
}


PREMIUM_ROUTE_BASES = {
    "dockHorizontal": "dock_short_horizontal",
    "dockVertical": "dock_short_vertical",
    "bridgeHorizontal": "wooden_bridge_horizontal",
    "bridgeVertical": "stone_bridge_arch",
}

PREMIUM_POI_BASES = {
    "town": "market_town_tents",
    "harbor": "dock_village_small",
    "cave": "cave_rock_entrance",
    "shrine": "grand_temple",
    "ruins": "ruin_columns",
    "tower": "wizard_tower_village",
    "gate": "portal_stone_swirl",
    "final": "dark_haunted_castle",
    "treasure": "treasure_chest_gold",
    "resource": "crystal_cluster_prismatic",
    "merchant": "market_stall_wood",
    "monsterNest": "monster_lair_bone",
}

PREMIUM_LOCATION_BASES = {
    "dawnford": "farming_village_silos",
    "brinewick": "dock_village_small",
    "mossCave": "cave_rock_entrance",
    "ashenKeep": "volcanic_fortress",
    "tideShrine": "grand_temple",
    "skyglassTower": "wizard_tower_village",
    "starfallGate": "portal_stone_swirl",
    "eclipseSpire": "dark_haunted_castle",
}

PREMIUM_OBJECT_BASES = {
    "mossy_cave_entrance": "cave_rock_entrance",
    "bandit_hideout_door": "bandit_camp_palisade",
    "jungle_ruins_stairs": "jungle_pyramid",
    "pirate_grotto_entrance": "cave_rock_entrance",
    "volcanic_temple_entrance": "volcano_fortress",
    "cursed_fortress_gate": "dark_castle_gate",
    "ancient_sealed_door": "sealed_gate_chained",
    "dark_boss_portal": "magic_circle_purple",
    "small_broken_ruins": "ruin_columns",
    "ruined_archway": "ruin_arch_blocks",
    "cracked_stone_obelisk": "rune_obelisk",
    "mossy_statue": "small_temple",
    "jungle_idol_shrine": "jungle_temple_village",
    "glowing_magic_shrine": "rune_pedestal_blue",
    "ancient_standing_stones": "rune_tablet",
    "grave_marker_cluster": "graveyard_cluster",
    "closed_treasure_chest": "treasure_chest_locked",
    "open_treasure_chest": "treasure_chest_gold",
    "stone_guardian_cache": "locked_stone_chest",
    "ore_node": "ore_vein_rock",
    "herb_bush": "herb_flower_patch",
    "fishing_spot": "hot_spring_pool",
    "octopus_cache": "buried_treasure_mound",
    "coral_cluster_blue": "crystal_cluster_large",
    "jeweled_magic_cache": "treasure_chest_gold",
    "mossy_locked_cache": "treasure_chest_locked",
    "shipwreck_debris": "shipwreck_ruin",
    "broken_mast": "shipwreck_ruin",
    "floating_treasure_barrel": "treasure_chest_locked",
    "whirlpool_swirl": "portal_stone_swirl",
    "harbor_signpost": "signpost_blank",
    "wooden_rowboat": "rowboat",
    "mooring_post_rope": "dock_short_vertical",
    "anchor": "ship_anchor_marker",
    "dock_lantern_post": "lantern_post",
    "fishing_nets_stack": "dock_crane",
    "travel_flag_marker": "signpost_blank",
    "coastal_market_stall": "market_stall_wood",
    "monster_nest": "monster_lair_bone",
    "campfire_cookpot": "campfire_stone",
    "secret_merchant_tent": "market_town_tents",
    "locked_iron_gate": "dark_castle_gate",
    "ancient_key_pedestal": "rune_pedestal_blue",
    "discovery_sparkle": "gem_obelisk",
    "smoke_plume": "campfire_stone",
    "quest_notice_board": "signpost_blank",
    "broadleaf_tree": "forest_deciduous_cluster",
    "dark_pine_tree": "forest_pine_cluster",
    "palm_tree": "jungle_palm_cluster",
    "dense_jungle_bush": "jungle_palm_cluster",
    "thorn_bramble": "thorn_bramble_patch",
    "fallen_log": "swamp_dead_tree_cluster",
    "giant_mushroom_cluster": "mushroom_grove_colorful",
    "vines_over_stone": "jungle_pyramid",
    "gray_boulder_pile": "boulder_pile",
    "rocky_hill_object": "mossy_cliff_plateau",
    "small_mountain_peak": "green_mountain_ridge",
    "snowy_mountain_peak": "snow_mountain_ridge",
    "volcano_cone": "volcano_crater",
    "lava_vent_rocks": "volcano_crater",
    "black_ash_rock_cluster": "obsidian_crags",
    "cursed_purple_crystal_cluster": "gem_obelisk",
}

PREMIUM_VARIANT_BASES = {
    "academy": ["wizard_tower_village", "monastery_village", "church_town"],
    "city": ["market_town_tents", "desert_ruins_city", "jungle_ruin_city", "castle_town_keep", "walled_town_square", "crystal_castle"],
    "fortification": [
        "green_castle",
        "snow_castle",
        "snow_castle_large",
        "desert_fort",
        "red_rock_fortress",
        "volcanic_fortress",
        "dark_castle",
        "haunted_black_fort",
        "island_fortress",
        "black_mountain_gate",
        "dark_haunted_castle",
    ],
    "harbor": ["dock_village_small", "desert_oasis_town", "swamp_village_stilts", "island_fortress"],
    "religious": ["small_temple", "grand_temple", "monastery_village", "church_town", "ice_temple", "jungle_temple_village"],
    "settlement": [
        "hamlet_straw_huts",
        "village_plain_houses",
        "farming_village_silos",
        "palisade_village",
        "market_town_tents",
        "stone_village_gray",
        "forest_lodge_village",
        "desert_village_oasis",
        "snowy_village_houses",
        "swamp_stilt_huts",
        "snow_village",
        "desert_town_market",
        "swamp_village_stilts",
        "jungle_treehouse_village",
        "haunted_ruined_village",
        "deadland_village",
    ],
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import premium overworld object assets.")
    parser.add_argument("--source", type=Path, default=SOURCE_ROOT, help="Source folder to scan.")
    parser.add_argument("--output", type=Path, default=PREMIUM_ROOT, help="Runtime premium object folder.")
    parser.add_argument("--manifest", type=Path, default=MANIFEST_PATH, help="World asset manifest to update.")
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT_PATH, help="Markdown import report path.")
    parser.add_argument("--metadata", type=Path, default=DEFAULT_METADATA_PATH, help="Imported premium metadata JSON path.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing premium files.")
    args = parser.parse_args()

    source_root = args.source.resolve()
    output_root = args.output.resolve()
    manifest_path = args.manifest.resolve()
    report_path = args.report.resolve()
    metadata_path = args.metadata.resolve()

    output_root.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)

    source_files = list_source_images(source_root)
    imported: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    sheet_stats: list[dict[str, Any]] = []
    used_ids: set[str] = set()
    id_by_base: dict[str, str] = {}

    for source_file in source_files:
        try:
            with Image.open(source_file) as image:
                image.load()
                rgba = image.convert("RGBA")
        except Exception as error:  # noqa: BLE001 - importer report should capture exact technical failure.
            skipped.append(skip_record(source_root, source_file, "unreadable_image", str(error)))
            continue

        if not sane_dimensions(rgba.size):
            skipped.append(skip_record(source_root, source_file, "insane_dimensions", f"{rgba.width}x{rgba.height}"))
            continue

        layout = detect_layout(source_file, rgba)
        sheet_stats.append(
            {
                "sourceFile": source_file.name,
                "sourceType": layout["sourceType"],
                "grid": f"{layout['rows']}x{layout['cols']}",
                "cellSize": layout["cellSize"],
                "originalSize": f"{rgba.width}x{rgba.height}",
            }
        )
        for cell in iter_cells(source_root, source_file, rgba, layout):
            cell_image = cell["image"]
            bbox = alpha_bbox(cell_image)
            if bbox is None:
                skipped.append({**cell["source"], "reason": "empty_cell", "notes": "Cell has no visible alpha content."})
                continue
            if bbox_area(bbox) < 128:
                skipped.append({**cell["source"], "reason": "nearly_empty_cell", "notes": "Cell visible content is too small for a runtime object."})
                continue

            base_id = cell["semanticBaseId"]
            object_id = make_unique_id(f"premium_{base_id}", used_ids)
            used_ids.add(object_id)
            id_by_base[base_id] = object_id
            filename = f"{object_id}.png"
            target = output_root / filename

            if target.exists() and not args.overwrite:
                with Image.open(target) as existing:
                    existing.load()
                    output_size = existing.size
                    output_bbox = alpha_bbox(existing.convert("RGBA"))
            else:
                cell_image.save(target)
                output_size = cell_image.size
                output_bbox = bbox

            category = classify(base_id)
            record = build_asset_record(
                source_root=source_root,
                source_file=source_file,
                object_id=object_id,
                base_id=base_id,
                filename=filename,
                source=cell["source"],
                category=category,
                original_size=cell_image.size,
                output_size=output_size,
                bbox=output_bbox or bbox,
                alpha=has_alpha(cell_image),
            )
            imported.append(record)

    manifest, removed_missing, replaced_refs = update_manifest(manifest_path, imported, id_by_base)
    mark_integration_status(imported, manifest)
    manifest["assets"] = [asset if not asset.get("premium") else next((updated for updated in imported if updated["id"] == asset["id"]), asset) for asset in manifest["assets"]]
    write_text_lf(manifest_path, json.dumps(manifest, indent=2) + "\n")

    write_text_lf(metadata_path, json.dumps(imported, indent=2) + "\n")
    write_text_lf(
        report_path,
        build_report(
            source_root=source_root,
            output_root=output_root,
            source_files=source_files,
            imported=imported,
            skipped=skipped,
            sheet_stats=sheet_stats,
            manifest=manifest,
            removed_missing=removed_missing,
            replaced_refs=replaced_refs,
            metadata_path=metadata_path,
        ),
    )

    print(f"Premium source files scanned: {len(source_files)}")
    print(f"Premium objects imported/recorded: {len(imported)}")
    print(f"Skipped for technical reasons: {len(skipped)}")
    print(f"Runtime premium folder: {output_root}")
    print(f"Manifest updated: {manifest_path}")
    print(f"Report written: {report_path}")


def list_source_images(source_root: Path) -> list[Path]:
    if not source_root.exists():
        raise SystemExit(f"Premium source folder does not exist: {source_root}")
    files: list[Path] = []
    for path in source_root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        relative_parts = {part.lower() for part in path.relative_to(source_root).parts[:-1]}
        if "output" in relative_parts:
            continue
        files.append(path)
    return sorted(files, key=lambda item: str(item).lower())


def sane_dimensions(size: tuple[int, int]) -> bool:
    width, height = size
    return 16 <= width <= 4096 and 16 <= height <= 4096


def detect_layout(source_file: Path, image: Image.Image) -> dict[str, Any]:
    known = SHEET_CELL_IDS.get(source_file.name)
    if known:
        rows = len(known)
        cols = len(known[0])
        return {
            "sourceType": f"{image.width}x{image.height}_{rows}x{cols}_atlas",
            "rows": rows,
            "cols": cols,
            "cellSize": image.width // cols,
            "cellIds": known,
        }

    if image.width == image.height == 1024:
        return {"sourceType": "1024x1024_4x4_atlas", "rows": 4, "cols": 4, "cellSize": 256, "cellIds": None}
    if image.width == image.height == 2048:
        return {"sourceType": "2048x2048_8x8_atlas", "rows": 8, "cols": 8, "cellSize": 256, "cellIds": None}
    return {"sourceType": "individual_object_image", "rows": 1, "cols": 1, "cellSize": min(image.width, image.height), "cellIds": None}


def iter_cells(source_root: Path, source_file: Path, image: Image.Image, layout: dict[str, Any]) -> list[dict[str, Any]]:
    cells: list[dict[str, Any]] = []
    rows = int(layout["rows"])
    cols = int(layout["cols"])
    cell_ids = layout.get("cellIds")
    cell_width = image.width // cols
    cell_height = image.height // rows
    source_type = str(layout["sourceType"])
    for row in range(rows):
        for col in range(cols):
            crop = image.crop((col * cell_width, row * cell_height, (col + 1) * cell_width, (row + 1) * cell_height))
            if cell_ids:
                base_id = cell_ids[row][col]
            elif rows == 1 and cols == 1:
                base_id = slugify(source_file.stem)
            else:
                base_id = f"{slugify(source_file.stem)}_r{row + 1:02d}_c{col + 1:02d}"
            cells.append(
                {
                    "image": crop,
                    "semanticBaseId": base_id,
                    "source": {
                        "sourceFile": relative_source(source_root, source_file),
                        "sourceFolder": str(source_root),
                        "sourceRow": row + 1 if rows > 1 else None,
                        "sourceCol": col + 1 if cols > 1 else None,
                        "sourceType": source_type,
                    },
                }
            )
    return cells


def build_asset_record(
    *,
    source_root: Path,
    source_file: Path,
    object_id: str,
    base_id: str,
    filename: str,
    source: dict[str, Any],
    category: dict[str, Any],
    original_size: tuple[int, int],
    output_size: tuple[int, int],
    bbox: tuple[int, int, int, int],
    alpha: bool,
) -> dict[str, Any]:
    relative_filename = f"objects_premium/{filename}"
    footprint = category["footprint"]
    return {
        "id": object_id,
        "textureKey": f"world_current_object_{object_id}",
        "sourceFilename": relative_source(source_root, source_file),
        "sourceSemanticId": base_id,
        "newCanonicalFilename": relative_filename,
        "filename": relative_filename,
        "category": category["category"],
        "subcategory": category["subcategory"],
        "semanticRole": category["semanticRole"],
        "intendedRuntimeUsage": category["intendedRuntimeUsage"],
        "assetKind": "world object",
        "dimensions": {"width": output_size[0], "height": output_size[1]},
        "transparencyStatus": "alpha" if alpha else "opaque",
        "magentaKeyRemovalNeeded": False,
        "scaleCropPadNeeded": "none",
        "placeholder": False,
        "qualityFlag": "approved",
        "selectedSourceFile": relative_source(source_root, source_file),
        "selectedSourceRow": source["sourceRow"],
        "selectedSourceCol": source["sourceCol"],
        "visualRationale": "Approved premium object art imported from D:\\Tools\\rembg\\bg_output without a strict rejection pass.",
        "backgroundRemovalMethod": "source_alpha_preserved" if alpha else "opaque_source_preserved",
        "anchorX": 0.5,
        "anchorY": category["anchorY"],
        "footprintWidth": footprint[0],
        "footprintHeight": footprint[1],
        "recommendedScale": category["recommendedScale"],
        "placementLayer": category["placementLayer"],
        "tags": sorted(set(category["tags"] + ["premium"])),
        "source": "premium_bg_output",
        "premium": True,
        "integrationRole": category["integrationRole"],
        "integrationStatus": "availableButUnmapped",
        "notes": "Premium pass preserves the source cell/object as-is except atlas slicing; backup objects remain fallback assets.",
        "sourceFolder": str(source_root),
        "sourceType": source["sourceType"],
        "originalSize": {"width": original_size[0], "height": original_size[1]},
        "outputSize": {"width": output_size[0], "height": output_size[1]},
        "boundingBox": {"x": bbox[0], "y": bbox[1], "width": bbox[2] - bbox[0], "height": bbox[3] - bbox[1]},
    }


def classify(base_id: str) -> dict[str, Any]:
    tokens = set(base_id.split("_"))
    tags = list(tokens)
    if tokens & {"forest", "jungle", "swamp", "tree", "dead", "cactus", "mushroom", "bramble"}:
        category = "natural_forest" if "forest" in tokens or "tree" in tokens else "natural_landmark"
        if "jungle" in tokens:
            category = "natural_jungle"
        elif "swamp" in tokens:
            category = "natural_swamp"
        return role(category, base_id, "forest_overlay" if category in {"natural_forest", "natural_jungle", "natural_swamp"} else "terrain_overlay", "biome overlay sprite", 0.9, (2, 2))
    if tokens & {"mountain", "hills", "cliff", "rock", "boulder", "crags", "volcano", "obsidian", "ash", "spires", "columns"}:
        category = "natural_mountain"
        if tokens & {"volcano", "obsidian", "ash"}:
            category = "natural_volcanic"
        elif "snow" in tokens or "ice" in tokens:
            category = "natural_snow_mountain"
        return role(category, base_id, "mountain_overlay", "mountain or ridge overlay sprite", 0.92, (2, 2))
    if tokens & {"dock", "bridge", "boat", "ship", "rowboat", "sailboat", "barge", "anchor", "lantern", "signpost", "barrier", "stall"}:
        layer = "water_overlay" if tokens & {"boat", "ship", "rowboat", "sailboat", "barge", "anchor"} else "infrastructure"
        category = "travel_infrastructure"
        if "dock" in tokens:
            category = "dock"
        elif "bridge" in tokens:
            category = "bridge"
        return role(category, base_id, layer, "route, harbor, or infrastructure overlay", 0.85, (1, 1))
    if tokens & {"village", "town", "city", "castle", "fort", "fortress", "palace", "monastery", "church", "wizard", "temple", "house"}:
        if tokens & {"castle", "fort", "fortress", "palace"}:
            category = "castle_poi"
            layer = "fortification_poi"
        elif tokens & {"dock", "port", "harbor"}:
            category = "harbor_poi"
            layer = "harbor_poi"
        elif tokens & {"temple", "monastery", "church"}:
            category = "religious_compound_poi"
            layer = "poi"
        else:
            category = "settlement_poi"
            layer = "settlement_poi"
        return role(category, base_id, layer, "settlement or landmark POI sprite", 0.86, (3, 3))
    if tokens & {"cave", "mine", "burrow", "dungeon"}:
        return role("dungeon_entrance", base_id, "dungeon_entrance", "dungeon entrance POI sprite", 0.88, (2, 2))
    if tokens & {"ruin", "obelisk", "rune", "portal", "gate", "circle", "pedestal", "altar", "beacon", "tablet", "lock"}:
        return role("magical", base_id, "quest_marker", "magical landmark or quest marker sprite", 0.84, (2, 2))
    if tokens & {"chest", "treasure", "ore", "crystal", "herb", "berry", "gem"}:
        category = "resource_node" if tokens & {"ore", "crystal", "herb", "berry", "gem"} else "quest_device"
        return role(category, base_id, "resource" if category == "resource_node" else "quest_marker", "resource or treasure overlay sprite", 0.82, (1, 1))
    if tokens & {"camp", "lair", "battlefield", "arena", "siege", "pit"}:
        return role("hazard", base_id, "hazard", "danger or hostile POI overlay", 0.86, (2, 2))
    return role("misc_utility", base_id, "terrain_overlay", "available premium overworld object", 0.84, (1, 1))


def role(category: str, base_id: str, placement_layer: str, usage: str, scale: float, footprint: tuple[int, int]) -> dict[str, Any]:
    return {
        "category": category,
        "subcategory": base_id,
        "semanticRole": base_id.replace("_", " "),
        "intendedRuntimeUsage": usage,
        "placementLayer": placement_layer,
        "recommendedScale": scale,
        "anchorY": 0.95 if footprint != (1, 1) else 0.88,
        "footprint": footprint,
        "tags": [category, placement_layer, *base_id.split("_")],
        "integrationRole": f"premium:{placement_layer}:{base_id}",
    }


def update_manifest(manifest_path: Path, premium_assets: list[dict[str, Any]], id_by_base: dict[str, str]) -> tuple[dict[str, Any], list[str], list[dict[str, str]]]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    runtime_root = PROJECT_ROOT / manifest["runtimeRoot"]
    assets = [
        asset
        for asset in manifest["assets"]
        if asset.get("source") != "premium_bg_output" and not str(asset.get("filename", "")).startswith("objects_premium/")
    ]

    removed_missing: list[str] = []
    kept_assets: list[dict[str, Any]] = []
    for asset in assets:
        filename = str(asset.get("filename", ""))
        if filename.startswith("objects/") and not (runtime_root / filename).exists():
            removed_missing.append(filename)
            continue
        kept_assets.append(asset)
    assets = kept_assets

    existing_texture_keys = {asset["textureKey"] for asset in assets}
    replacements = {old: new for old, new in BACKUP_TEXTURE_REPLACEMENTS.items() if new in existing_texture_keys}
    replaced_refs = replace_manifest_refs(manifest, replacements)

    premium_texture_keys = {asset["textureKey"] for asset in premium_assets}
    manifest["assets"] = assets + premium_assets
    manifest.setdefault("sourcePack", {})
    source_pack = manifest["sourcePack"]
    source_pack["approvedWorldObjectCount"] = sum(1 for asset in manifest["assets"] if asset.get("assetKind") == "world object")
    source_pack["backupWorldObjectCount"] = sum(
        1
        for asset in manifest["assets"]
        if asset.get("assetKind") == "world object" and not asset.get("premium") and str(asset.get("filename", "")).startswith("objects/")
    )
    source_pack["premiumSourceFolder"] = str(SOURCE_ROOT)
    source_pack["premiumRuntimeFolder"] = "src/assets/world/current/objects_premium"
    source_pack["premiumWorldObjectCount"] = len(premium_assets)
    source_pack["objectSelectionStandard"] = (
        "strict/relaxed curated backup assets plus approved premium bg_output pass; premium objects are preferred, "
        "backup objects remain fallback, and deleted backup PNGs stay removed"
    )

    manifest["premiumRouteMappings"] = build_texture_map(PREMIUM_ROUTE_BASES, id_by_base)
    manifest["premiumPoiMappings"] = build_texture_map(PREMIUM_POI_BASES, id_by_base)
    manifest["premiumLocationIdMappings"] = build_texture_map(PREMIUM_LOCATION_BASES, id_by_base)
    manifest["premiumObjectMappings"] = build_texture_map(PREMIUM_OBJECT_BASES, id_by_base)
    manifest["premiumPoiVariantMappings"] = build_variant_map(PREMIUM_VARIANT_BASES, id_by_base)

    note = {
        "role": "premium object layer",
        "status": "active_premium_first",
        "notes": "Premium transparent objects from objects_premium are preferred for matching object, POI, route, and overlay roles; src/assets/world/current/objects remains backup/fallback.",
    }
    manifest["missingRuntimeRoles"] = [entry for entry in manifest.get("missingRuntimeRoles", []) if entry.get("role") != note["role"]]
    manifest["missingRuntimeRoles"].insert(0, note)

    all_texture_keys = {asset["textureKey"] for asset in manifest["assets"]}
    for map_name in ["premiumRouteMappings", "premiumPoiMappings", "premiumLocationIdMappings", "premiumObjectMappings"]:
        manifest[map_name] = {key: value for key, value in manifest[map_name].items() if value in all_texture_keys and value in premium_texture_keys}
    for role_name, values in list(manifest["premiumPoiVariantMappings"].items()):
        manifest["premiumPoiVariantMappings"][role_name] = [value for value in values if value in all_texture_keys and value in premium_texture_keys]

    return manifest, removed_missing, replaced_refs


def replace_manifest_refs(value: Any, replacements: dict[str, str], path: str = "$") -> list[dict[str, str]]:
    replaced: list[dict[str, str]] = []
    if isinstance(value, dict):
        for key, child in list(value.items()):
            if isinstance(child, str) and child in replacements:
                value[key] = replacements[child]
                replaced.append({"path": f"{path}.{key}", "old": child, "new": replacements[child]})
            else:
                replaced.extend(replace_manifest_refs(child, replacements, f"{path}.{key}"))
    elif isinstance(value, list):
        seen: set[str] = set()
        new_items: list[Any] = []
        changed = False
        for index, child in enumerate(value):
            if isinstance(child, str) and child in replacements:
                child = replacements[child]
                replaced.append({"path": f"{path}[{index}]", "old": value[index], "new": child})
                changed = True
            else:
                replaced.extend(replace_manifest_refs(child, replacements, f"{path}[{index}]"))
            if isinstance(child, str):
                if child in seen:
                    changed = True
                    continue
                seen.add(child)
            new_items.append(child)
        if changed:
            value[:] = new_items
    return replaced


def build_texture_map(source: dict[str, str], id_by_base: dict[str, str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for role_name, base_id in source.items():
        object_id = id_by_base.get(base_id)
        if object_id:
            result[role_name] = f"world_current_object_{object_id}"
    return result


def build_variant_map(source: dict[str, list[str]], id_by_base: dict[str, str]) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for role_name, base_ids in source.items():
        values = []
        for base_id in base_ids:
            object_id = id_by_base.get(base_id)
            if object_id:
                values.append(f"world_current_object_{object_id}")
        if values:
            result[role_name] = values
    return result


def mark_integration_status(premium_assets: list[dict[str, Any]], manifest: dict[str, Any]) -> None:
    mapped = set()
    for key in ["premiumRouteMappings", "premiumPoiMappings", "premiumLocationIdMappings", "premiumObjectMappings"]:
        mapped.update(manifest.get(key, {}).values())
    for values in manifest.get("premiumPoiVariantMappings", {}).values():
        mapped.update(values)
    for asset in premium_assets:
        asset["integrationStatus"] = "mapped" if asset["textureKey"] in mapped else "availableButUnmapped"


def build_report(
    *,
    source_root: Path,
    output_root: Path,
    source_files: list[Path],
    imported: list[dict[str, Any]],
    skipped: list[dict[str, Any]],
    sheet_stats: list[dict[str, Any]],
    manifest: dict[str, Any],
    removed_missing: list[str],
    replaced_refs: list[dict[str, str]],
    metadata_path: Path,
) -> str:
    mapped = [asset for asset in imported if asset.get("integrationStatus") == "mapped"]
    unmapped = [asset for asset in imported if asset.get("integrationStatus") == "availableButUnmapped"]
    category_counts = Counter(asset["category"] for asset in imported)
    source_type_counts = Counter(item["sourceType"] for item in sheet_stats)
    backup_mapping_count = count_backup_mappings(manifest)
    placeholder_count = sum(1 for asset in manifest["assets"] if asset.get("placeholder"))
    lines = [
        "# Premium World Object Import Report",
        "",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        f"Premium source folder scanned: `{source_root}`",
        f"Runtime premium output folder: `{output_root}`",
        f"Manifest: `{MANIFEST_PATH}`",
        f"Metadata: `{metadata_path}`",
        "",
        "## Summary",
        "",
        f"- Source files scanned: {len(source_files)}",
        f"- Detected atlas sheets: {sum(1 for item in sheet_stats if 'atlas' in item['sourceType'])}",
        f"- Detected individual sprites: {sum(1 for item in sheet_stats if 'individual' in item['sourceType'])}",
        f"- Premium objects imported/recorded: {len(imported)}",
        f"- Skipped for technical reasons: {len(skipped)}",
        f"- Mapped to runtime roles: {len(mapped)}",
        f"- Available but unmapped: {len(unmapped)}",
        f"- Backup manifest mappings still using `src/assets/world/current/objects`: {backup_mapping_count}",
        f"- Manifest placeholders still used: {placeholder_count}",
        f"- Missing backup manifest records removed: {len(removed_missing)}",
        "",
        "## Source Type Counts",
        "",
        *[f"- {source_type}: {count}" for source_type, count in sorted(source_type_counts.items())],
        "",
        "## Imported Categories",
        "",
        *[f"- {category}: {count}" for category, count in sorted(category_counts.items())],
        "",
        "## Runtime Mappings",
        "",
        f"- Premium route mappings: {len(manifest.get('premiumRouteMappings', {}))}",
        f"- Premium POI mappings: {len(manifest.get('premiumPoiMappings', {}))}",
        f"- Premium location-id mappings: {len(manifest.get('premiumLocationIdMappings', {}))}",
        f"- Premium object-id mappings: {len(manifest.get('premiumObjectMappings', {}))}",
        f"- Premium POI variant roles: {len(manifest.get('premiumPoiVariantMappings', {}))}",
        "",
        "## Deleted Backup References Respected",
        "",
    ]
    if removed_missing:
        lines.extend(f"- Removed stale manifest asset record: `{filename}`" for filename in removed_missing)
    else:
        lines.append("- No missing backup object records were found.")
    if replaced_refs:
        lines.append("")
        lines.append("Replaced stale backup texture references:")
        lines.extend(f"- `{item['path']}`: `{item['old']}` -> `{item['new']}`" for item in replaced_refs)
    lines.extend(
        [
            "",
            "## Available But Unmapped",
            "",
        ]
    )
    lines.extend(f"- `{asset['id']}` ({asset['category']})" for asset in unmapped[:80])
    if len(unmapped) > 80:
        lines.append(f"- ...and {len(unmapped) - 80} more")
    lines.extend(
        [
            "",
            "## Technical Skips",
            "",
        ]
    )
    if skipped:
        lines.extend(f"- `{item.get('sourceFile')}` r{item.get('sourceRow')} c{item.get('sourceCol')}: {item.get('reason')} - {item.get('notes')}" for item in skipped[:80])
        if len(skipped) > 80:
            lines.append(f"- ...and {len(skipped) - 80} more")
    else:
        lines.append("- None.")
    lines.extend(
        [
            "",
            "## Rerun Command",
            "",
            "```powershell",
            "python tools\\world_assets\\import_premium_world_objects.py",
            "```",
            "",
            "## Validation Commands",
            "",
            "Run after import:",
            "",
            "```powershell",
            "npm test",
            "npm run build",
            "npm run worldgen:lab -- --seed test-premium-objects --out tmp/worldgen-lab/test-premium-objects",
            "```",
        ]
    )
    return "\n".join(lines) + "\n"


def count_backup_mappings(manifest: dict[str, Any]) -> int:
    texture_to_asset = {asset["textureKey"]: asset for asset in manifest["assets"]}
    count = 0
    map_names = ["routeMappings", "poiMappings", "locationIdMappings", "objectMappings"]
    for map_name in map_names:
        for texture_key in manifest.get(map_name, {}).values():
            asset = texture_to_asset.get(texture_key)
            if asset and str(asset.get("filename", "")).startswith("objects/"):
                count += 1
    for values in manifest.get("poiVariantMappings", {}).values():
        for texture_key in values:
            asset = texture_to_asset.get(texture_key)
            if asset and str(asset.get("filename", "")).startswith("objects/"):
                count += 1
    return count


def has_alpha(image: Image.Image) -> bool:
    if image.mode != "RGBA":
        return False
    extrema = image.getchannel("A").getextrema()
    return extrema[0] < 255


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int] | None:
    if image.mode != "RGBA":
        return image.getbbox()
    return image.getchannel("A").getbbox()


def bbox_area(bbox: tuple[int, int, int, int]) -> int:
    return max(0, bbox[2] - bbox[0]) * max(0, bbox[3] - bbox[1])


def make_unique_id(base: str, used: set[str]) -> str:
    candidate = slugify(base)
    if candidate not in used:
        return candidate
    index = 2
    while f"{candidate}_{index:02d}" in used:
        index += 1
    return f"{candidate}_{index:02d}"


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "premium_object"


def relative_source(source_root: Path, source_file: Path) -> str:
    try:
        return source_file.relative_to(source_root).as_posix()
    except ValueError:
        return str(source_file)


def skip_record(source_root: Path, source_file: Path, reason: str, notes: str) -> dict[str, Any]:
    return {
        "sourceFile": relative_source(source_root, source_file),
        "sourceFolder": str(source_root),
        "sourceRow": None,
        "sourceCol": None,
        "reason": reason,
        "notes": notes,
    }


def write_text_lf(path: Path, text: str) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


if __name__ == "__main__":
    main()
