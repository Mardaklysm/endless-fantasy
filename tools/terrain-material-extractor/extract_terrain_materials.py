#!/usr/bin/env python3
"""Build an approved-subset terrain material pack from generated 8x8 atlases.

The generated atlases are only candidate sources. The production pack contains
only approved individual PNG material files plus metadata; missing semantic
slots are reported as future regeneration needs, not failures.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import textwrap
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


GRID_SIZE = 8
MATERIAL_SIZE = 256
INPUT_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
OUTPUT_DIR_NAME = "output"
REJECT_REASONS = {
    "visible_seams",
    "too_noisy",
    "too_object_like",
    "not_pure_material",
    "baked_transition",
    "baked_road_or_river",
    "poor_style_match",
    "jpeg_artifacts",
    "duplicate_of_better_tile",
    "not_needed_now",
}


@dataclass(frozen=True)
class MaterialSlot:
    id: str
    category: str
    row: int
    col: int
    intended_use: str


@dataclass(frozen=True)
class SourceSheet:
    path: Path
    label: str
    width: int
    height: int
    cell_width: int
    cell_height: int
    warning: str | None


SEMANTIC_ROWS: list[tuple[str, list[tuple[str, str]]]] = [
    (
        "grass_green_land",
        [
            ("bright_open_starter_grass", "Open starter-island grass fill for readable low-danger land masks."),
            ("medium_natural_grass", "Dominant normal overworld grass fill for semantic land masks."),
            ("lush_dense_grass", "Richer grass patch material for controlled lush-biome variation."),
            ("dark_forest_floor_grass", "Dark grassy base under forest overlays without baked trees or trunks."),
            ("dry_yellow_green_grass", "Dry yellow-green grass for warm or late-summer land patches."),
            ("soft_meadow_grass", "Soft meadow fill with light organic detail for gentle plains patches."),
            ("mossy_green_ground", "Mossy green ground for caves, ruins, and damp highland patches."),
            ("highland_grass_stone_flecks", "Highland grass with small stone flecks for upland terrain masks."),
        ],
    ),
    (
        "sand_dry_land",
        [
            ("pale_beach_sand", "Pale beach sand fill used inside mask-rendered coast and beach bands."),
            ("warm_dry_beach_sand", "Warmer dry beach sand fill for sunlit coast and island interiors."),
            ("wet_compact_sand", "Compact damp sand fill; coast shape is still renderer-driven."),
            ("coral_white_tropical_sand", "Bright tropical sand fill for coral or southern island beaches."),
            ("wind_swept_dune_sand", "Dune-textured sand for larger desert masks, not cliff or ridge sprites."),
            ("flat_desert_sand", "Plain desert fill for broad masks and low-clutter dry regions."),
            ("red_desert_sand", "Red desert fill for warm canyon or badland biomes."),
            ("cracked_dry_clay", "Cracked clay fill for arid flats and dry lakebed-style patches."),
        ],
    ),
    (
        "dirt_path_fill",
        [
            ("natural_brown_dirt", "General brown dirt fill for exposed ground and procedural patches."),
            ("packed_dirt_surface", "Packed dirt fill for plazas or route-adjacent ground, without baked borders."),
            ("light_dusty_dirt_surface", "Light dusty dirt fill for dry paths and neutral exposed soil."),
            ("dark_forest_dirt_surface", "Dark dirt fill for forest interiors below separate tree overlays."),
            ("sandy_trail_surface", "Sandy trail fill material; route shape remains a procedural overlay."),
            ("worn_grass_dirt_surface", "Mixed grass and dirt wear fill for controlled trampled patches."),
            ("dry_scrub_ground", "Dry scrubby ground fill without standalone bush or cactus-like shapes."),
            ("fertile_dark_soil", "Fertile dark soil fill for garden, farm, or rich-earth patches."),
        ],
    ),
    (
        "stone_mountain_ground",
        [
            ("fine_gravel_ground", "Fine gravel fill for rocky paths and stone-biome variation."),
            ("small_pebble_ground", "Small pebble fill for beaches, riverbeds, or rocky patches."),
            ("grey_stone_ground", "Grey irregular stone ground, not wall or brick geometry."),
            ("brown_stone_ground", "Brown irregular stone ground for warm rocky terrain."),
            ("slate_stone_ground", "Slate stone fill for cool highlands and ruins."),
            ("mountain_scree_ground", "Loose scree ground fill; mountain peaks remain object overlays."),
            ("highspire_alpine_stone_ground", "Alpine stone ground for Highspire-style highlands."),
            ("dark_cave_stone_ground", "Dark cave stone floor fill, separate from cave walls or borders."),
        ],
    ),
    (
        "snow_ice",
        [
            ("clean_white_snow", "Clean snow fill for Frostmere-style snow masks."),
            ("wind_swept_snow", "Wind-swept snow fill for exposed ice-region variation."),
            ("packed_snow", "Packed snow fill for traveled snowfields and town-adjacent snowy ground."),
            ("snow_over_dirt", "Mixed snow and dirt fill for thawing or transitional ground."),
            ("rocky_snow_texture", "Snow with subtle grit for rocky snowy patches."),
            ("clear_blue_ice", "Clear blue ice fill for frozen lakes or slick dungeon surfaces."),
            ("cracked_ice", "Cracked ice fill for dangerous or brittle frozen surfaces."),
            ("blue_white_glacier_surface", "Blue-white glacier fill for strong ice-biome identity."),
        ],
    ),
    (
        "swamp_jungle_deadland",
        [
            ("wet_jungle_floor", "Wet jungle ground fill; large plants remain overlays."),
            ("dark_forest_floor", "Dark forest floor fill without baked roots or edge foliage."),
            ("swamp_mud", "Swamp mud fill for bog masks, without pond or shore geometry."),
            ("muddy_grass", "Muddy grass fill for damp mixed terrain patches."),
            ("algae_green_bog_surface", "Algae bog fill for swamp masks and pooled ground materials."),
            ("dead_leaves_ground", "Dead leaf litter fill for autumn, deadwood, or cursed forest patches."),
            ("dry_deadland_dirt", "Dry cracked deadland fill for barren regions."),
            ("haunted_purple_mire_ground", "Purple mire fill for cursed wetland or magical terrain."),
        ],
    ),
    (
        "volcanic_ash",
        [
            ("warm_ash_ground", "Warm ash fill for volcanic land masks."),
            ("black_ash_ground", "Black ash fill for scorched volcanic ground."),
            ("dark_basalt_ground", "Dark basalt stone fill without volcano or cliff sprites."),
            ("obsidian_volcanic_ground", "Dark obsidian-like rock fill for volcanic regions."),
            ("scorched_dirt", "Scorched dirt fill with ember hints but no crater object focus."),
            ("ember_cracked_ground", "Cracked ember ground fill for hot volcanic terrain."),
            ("lava_crust", "Lava crust fill with dark plates over visible heat seams."),
            ("glowing_magma_surface", "High-energy magma surface fill for hazardous lava masks."),
        ],
    ),
    (
        "water_special_surface",
        [
            ("deep_ocean_water", "Deep ocean fill for base sea masks."),
            ("normal_ocean_water", "Normal ocean fill for lighter open water and near-route sea."),
            ("clear_shallow_coastal_water", "Clear shallow water fill; coastlines remain mask-rendered."),
            ("turquoise_tropical_water", "Bright tropical water fill for warm shallow regions."),
            ("reef_blue_water", "Reef-blue water fill; reef objects remain overlays."),
            ("clear_freshwater_surface", "Freshwater fill suitable for renderer-driven rivers and lakes."),
            ("icy_blue_water_surface", "Icy water fill for cold-region water masks."),
            ("dark_magical_water_surface", "Dark magical water fill for cursed or special regions."),
        ],
    ),
]


def build_material_slots() -> list[MaterialSlot]:
    slots: list[MaterialSlot] = []
    for row_index, (category, entries) in enumerate(SEMANTIC_ROWS, start=1):
        for col_index, (material_id, intended_use) in enumerate(entries, start=1):
            slots.append(MaterialSlot(material_id, category, row_index, col_index, intended_use))
    return slots


MATERIAL_SLOTS = build_material_slots()
SLOT_BY_ID = {slot.id: slot for slot in MATERIAL_SLOTS}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build an approved-subset terrain material pack.")
    parser.add_argument("--source-dir", type=Path, default=Path(r"D:\atlas"), help="Folder containing candidate atlas images.")
    parser.add_argument("--output-dir", type=Path, default=Path(r"D:\atlas\output"), help="Folder to write the material pack.")
    parser.add_argument(
        "--selection",
        type=Path,
        default=None,
        help="Editable approval selection JSON. Defaults to <output-dir>/terrain_materials_v2_selection.json.",
    )
    parser.add_argument("--no-approved-atlas", action="store_true", help="Skip the optional dense approved-material atlas preview.")
    parser.add_argument(
        "--force-template-selection",
        action="store_true",
        help="Overwrite the selection JSON with an all-rejected template for manual review resets.",
    )
    return parser.parse_args()


def load_font(size: int) -> ImageFont.ImageFont:
    for name in ("arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    position: tuple[int, int],
    text: str,
    font: ImageFont.ImageFont,
    fill: tuple[int, int, int],
    width: int,
) -> None:
    x, y = position
    line_height = font.size + 2 if hasattr(font, "size") else 12
    for line in textwrap.wrap(text, width=width):
        draw.text((x, y), line, font=font, fill=fill)
        y += line_height


def scan_source_sheets(source_dir: Path, output_dir: Path) -> tuple[list[SourceSheet], list[str], list[str]]:
    sources: list[SourceSheet] = []
    skipped: list[str] = []
    warnings: list[str] = []

    for path in sorted(source_dir.iterdir()):
        if not path.is_file() or path.suffix.lower() not in INPUT_EXTENSIONS:
            continue
        try:
            path.relative_to(output_dir)
            continue
        except ValueError:
            pass

        warning = None
        if path.suffix.lower() in {".jpg", ".jpeg"}:
            warning = "JPEG/JPG source; inspect for compression seams before production use."
            warnings.append(f"{path.name}: {warning}")

        try:
            with Image.open(path) as image:
                width, height = image.size
        except OSError as exc:
            skipped.append(f"{path.name}: could not open image ({exc})")
            continue

        if width != height:
            skipped.append(f"{path.name}: skipped because it is not square ({width}x{height}).")
            continue
        if width % GRID_SIZE != 0:
            skipped.append(f"{path.name}: skipped because {width} cannot be divided cleanly into {GRID_SIZE} cells.")
            continue
        if width != 2048:
            warnings.append(
                f"{path.name}: accepted non-2048 square source ({width}x{height}); selected cells will be nearest-neighbor resized.",
            )

        sources.append(SourceSheet(path, f"S{len(sources) + 1:02d}", width, height, width // GRID_SIZE, height // GRID_SIZE, warning))

    return sources, skipped, warnings


def template_selection(first_source: SourceSheet) -> dict[str, Any]:
    return {
        "schema": "terrain_materials_v2_approval_selection",
        "rowColumnBase": "1-based",
        "selectionCriteria": [
            "Approve only pure full-surface materials that improve the current semantic-mask renderer.",
            "Do not approve baked roads, rivers, coasts, cliffs, object sprites, borders, or cells with visible 3x3 seams.",
        ],
        "selections": {
            slot.id: {
                "selectedSourceFile": first_source.path.name,
                "selectedSourceRow": slot.row,
                "selectedSourceCol": slot.col,
                "qualityFlag": "rejected",
                "rejectReasons": ["not_needed_now"],
                "visualRationale": "Template rejection; manual visual review is still required.",
                "notes": "Generated because no approval selection file existed.",
            }
            for slot in MATERIAL_SLOTS
        },
    }


def load_or_create_selection(selection_path: Path, sources: list[SourceSheet], force_template: bool) -> dict[str, Any]:
    if force_template or not selection_path.exists():
        if not sources:
            raise RuntimeError("No valid source sheets were found; cannot create a selection file.")
        selection_path.parent.mkdir(parents=True, exist_ok=True)
        data = template_selection(sources[0])
        selection_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
        return data

    data = json.loads(selection_path.read_text(encoding="utf-8"))
    if "selections" in data:
        return data
    raise RuntimeError("Selection JSON must contain a top-level 'selections' object.")


def validate_selection(selection_data: dict[str, Any], sources: list[SourceSheet]) -> dict[str, Any]:
    selections = selection_data.get("selections", {})
    missing = [slot.id for slot in MATERIAL_SLOTS if slot.id not in selections]
    unknown = [key for key in selections if key not in SLOT_BY_ID]
    if missing:
        raise RuntimeError(f"Selection file is missing {len(missing)} material ids: {', '.join(missing[:8])}")
    if unknown:
        raise RuntimeError(f"Selection file contains unknown material ids: {', '.join(unknown[:8])}")

    source_names = {source.path.name for source in sources}
    for material_id, selection in selections.items():
        source_file = selection.get("selectedSourceFile")
        if source_file not in source_names:
            raise RuntimeError(f"{material_id}: selectedSourceFile {source_file!r} is not a valid scanned source.")
        source_row = int(selection.get("selectedSourceRow", 0))
        source_col = int(selection.get("selectedSourceCol", 0))
        if not (1 <= source_row <= GRID_SIZE and 1 <= source_col <= GRID_SIZE):
            raise RuntimeError(f"{material_id}: source row/col must be between 1 and {GRID_SIZE}.")
        quality = selection.get("qualityFlag")
        if quality not in {"approved", "rejected"}:
            raise RuntimeError(f"{material_id}: qualityFlag must be 'approved' or 'rejected'.")
        reasons = selection.get("rejectReasons", [])
        if quality == "rejected":
            if not reasons:
                raise RuntimeError(f"{material_id}: rejected entries must include rejectReasons.")
            bad_reasons = [reason for reason in reasons if reason not in REJECT_REASONS]
            if bad_reasons:
                raise RuntimeError(f"{material_id}: invalid rejectReasons {bad_reasons}; use {sorted(REJECT_REASONS)}.")

    return selections


def crop_source_cell(source: SourceSheet, row: int, col: int) -> Image.Image:
    with Image.open(source.path) as image:
        rgb = image.convert("RGB")
        left = (col - 1) * source.cell_width
        top = (row - 1) * source.cell_height
        cell = rgb.crop((left, top, left + source.cell_width, top + source.cell_height))
    if cell.size != (MATERIAL_SIZE, MATERIAL_SIZE):
        cell = cell.resize((MATERIAL_SIZE, MATERIAL_SIZE), Image.Resampling.NEAREST)
    return cell


def reset_output_dirs(output_dir: Path) -> tuple[Path, Path]:
    approved_dir = output_dir / "approved_materials"
    rejected_dir = output_dir / "rejected_candidates"
    for directory in (approved_dir, rejected_dir):
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True, exist_ok=True)
    return approved_dir, rejected_dir


def write_material_outputs(
    output_dir: Path,
    sources: list[SourceSheet],
    selections: dict[str, Any],
    make_atlas: bool,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], Path | None]:
    approved_dir, rejected_dir = reset_output_dirs(output_dir)
    source_by_name = {source.path.name: source for source in sources}
    source_label_by_name = {source.path.name: source.label for source in sources}

    approved_entries: list[dict[str, Any]] = []
    rejected_entries: list[dict[str, Any]] = []

    for slot in MATERIAL_SLOTS:
        selection = selections[slot.id]
        source = source_by_name[selection["selectedSourceFile"]]
        source_row = int(selection["selectedSourceRow"])
        source_col = int(selection["selectedSourceCol"])
        filename = f"{slot.id}.png"
        cell = crop_source_cell(source, source_row, source_col)

        if selection["qualityFlag"] == "approved":
            cell.save(approved_dir / filename)
            approved_entries.append(
                {
                    "id": slot.id,
                    "filename": filename,
                    "category": slot.category,
                    "selectedSourceFile": source.path.name,
                    "selectedSourceRow": source_row,
                    "selectedSourceCol": source_col,
                    "intendedUse": slot.intended_use,
                    "visualRationale": selection.get("visualRationale", ""),
                    "qualityFlag": "approved",
                    "notes": selection.get("notes", ""),
                },
            )
        else:
            debug_name = f"{slot.id}__{source_label_by_name[source.path.name]}_r{source_row}_c{source_col}.png"
            cell.save(rejected_dir / debug_name)
            candidate_cells = selection.get("candidateCells") or [
                {
                    "sourceFile": source.path.name,
                    "sourceLabel": source_label_by_name[source.path.name],
                    "sourceRow": source_row,
                    "sourceCol": source_col,
                    "rejectReasons": selection.get("rejectReasons", []),
                    "visualRationale": selection.get("visualRationale", ""),
                    "notes": selection.get("notes", ""),
                    "debugCrop": f"rejected_candidates/{debug_name}",
                },
            ]
            rejected_entries.append(
                {
                    "id": slot.id,
                    "category": slot.category,
                    "expectedSourceRow": slot.row,
                    "expectedSourceCol": slot.col,
                    "intendedUse": slot.intended_use,
                    "status": "missing_from_approved_pack",
                    "candidateCells": candidate_cells,
                },
            )

    atlas_path = make_dense_approved_atlas(output_dir, approved_entries) if make_atlas else None
    if atlas_path:
        for index, entry in enumerate(approved_entries):
            entry["approvedAtlasRow"] = index // GRID_SIZE + 1
            entry["approvedAtlasCol"] = index % GRID_SIZE + 1

    return approved_entries, rejected_entries, atlas_path


def make_dense_approved_atlas(output_dir: Path, approved_entries: list[dict[str, Any]]) -> Path | None:
    if not approved_entries:
        return None
    cols = min(GRID_SIZE, len(approved_entries))
    rows = math.ceil(len(approved_entries) / cols)
    atlas = Image.new("RGB", (cols * MATERIAL_SIZE, rows * MATERIAL_SIZE), "black")
    approved_dir = output_dir / "approved_materials"
    for index, entry in enumerate(approved_entries):
        with Image.open(approved_dir / entry["filename"]) as image:
            cell = image.convert("RGB")
        x = (index % cols) * MATERIAL_SIZE
        y = (index // cols) * MATERIAL_SIZE
        atlas.paste(cell, (x, y))
    path = output_dir / "terrain_materials_v2_approved_atlas.png"
    atlas.save(path)
    return path


def make_approved_contact_sheet(output_dir: Path, approved_entries: list[dict[str, Any]]) -> None:
    if not approved_entries:
        return
    thumb = 128
    label_h = 44
    cols = min(GRID_SIZE, len(approved_entries))
    rows = math.ceil(len(approved_entries) / cols)
    font = load_font(10)
    small = load_font(9)
    sheet = Image.new("RGB", (cols * thumb, rows * (thumb + label_h)), "white")
    draw = ImageDraw.Draw(sheet)
    approved_dir = output_dir / "approved_materials"
    for index, entry in enumerate(approved_entries):
        x = (index % cols) * thumb
        y = (index // cols) * (thumb + label_h)
        with Image.open(approved_dir / entry["filename"]) as image:
            preview = image.convert("RGB").resize((thumb, thumb), Image.Resampling.NEAREST)
        sheet.paste(preview, (x, y))
        draw.rectangle([x, y, x + thumb - 1, y + thumb - 1], outline=(35, 150, 60), width=3)
        draw.text((x + 4, y + thumb + 2), "approved", font=small, fill=(30, 100, 40))
        draw_wrapped(draw, (x + 4, y + thumb + 15), entry["id"], font, (20, 20, 20), 18)
    sheet.save(output_dir / "terrain_materials_v2_approved_contactsheet.png")


def write_metadata(output_dir: Path, approved_entries: list[dict[str, Any]]) -> None:
    (output_dir / "terrain_materials_v2_approved_metadata.json").write_text(
        json.dumps(approved_entries, indent=2) + "\n",
        encoding="utf-8",
    )


def write_rejected_report(
    output_dir: Path,
    sources: list[SourceSheet],
    skipped: list[str],
    warnings: list[str],
    approved_entries: list[dict[str, Any]],
    rejected_entries: list[dict[str, Any]],
) -> None:
    used_sources: dict[str, int] = {}
    for entry in approved_entries:
        used_sources[entry["selectedSourceFile"]] = used_sources.get(entry["selectedSourceFile"], 0) + 1

    report = {
        "schema": "terrain_materials_v2_rejected_report",
        "summary": {
            "validSourceCount": len(sources),
            "approvedMaterialCount": len(approved_entries),
            "missingMaterialCount": len(rejected_entries),
            "approvedSourceUsage": used_sources,
        },
        "warnings": warnings,
        "skippedSourceImages": skipped,
        "validSources": [
            {
                "label": source.label,
                "filename": source.path.name,
                "width": source.width,
                "height": source.height,
                "cellWidth": source.cell_width,
                "cellHeight": source.cell_height,
                "warning": source.warning,
            }
            for source in sources
        ],
        "rejectedSlots": rejected_entries,
    }
    (output_dir / "terrain_materials_v2_rejected_report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def write_missing_materials(output_dir: Path, rejected_entries: list[dict[str, Any]]) -> None:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for entry in rejected_entries:
        grouped.setdefault(entry["category"], []).append(entry)

    lines = [
        "# Missing Terrain Materials",
        "",
        "Missing slots are not failures. They are useful material ideas that did not meet the approved-pack quality bar yet.",
        "",
        "The current renderer needs clean base fills. Roads, rivers, riverbanks, coastlines, forests, mountain ridges, towns, rocks, and landmarks should remain renderer or overlay concerns.",
        "",
    ]
    for category in [category for category, _ in SEMANTIC_ROWS]:
        entries = grouped.get(category, [])
        if not entries:
            continue
        lines.append(f"## {category}")
        lines.append("")
        for entry in entries:
            reasons = sorted({reason for cell in entry["candidateCells"] for reason in cell.get("rejectReasons", [])})
            reason_text = ", ".join(reasons) if reasons else "not_needed_now"
            lines.append(f"- `{entry['id']}`: {reason_text}. {entry['intendedUse']}")
        lines.append("")
    (output_dir / "terrain_materials_v2_missing_materials.md").write_text("\n".join(lines), encoding="utf-8")


def write_readme(output_dir: Path, atlas_path: Path | None) -> Path:
    atlas_line = (
        "`terrain_materials_v2_approved_atlas.png` is a dense preview only; packed positions are recorded in metadata and do not imply a fixed runtime atlas."
        if atlas_path
        else "No approved atlas preview was generated."
    )
    readme = f"""# Terrain Materials V2 Approved Pack

This pack contains only approved source-of-truth terrain material PNGs for Crystal Oath / Endless Fantasy terrain experimentation.

- `approved_materials/` contains only near-production-quality 256x256 PNG material swatches.
- `terrain_materials_v2_approved_metadata.json` describes the approved files and their candidate-atlas provenance.
- `terrain_materials_v2_rejected_report.json` records semantic slots and candidate cells that were rejected or left missing.
- `terrain_materials_v2_missing_materials.md` lists useful material ideas to regenerate later.
- {atlas_line}
- Use PNG for production. Do not use JPEG as a runtime terrain material source because compression can create visible seams.
- Roads, rivers, riverbanks, coasts, mountains, forests, landmarks, buildings, and rocks are renderer or overlay concerns, not baked base materials.

Rerun command:

```powershell
python tools\\terrain-material-extractor\\extract_terrain_materials.py --source-dir D:\\atlas --output-dir D:\\atlas\\output
```
"""
    path = output_dir / "README.md"
    path.write_text(readme, encoding="utf-8")
    return path


def write_pack_zip(output_dir: Path) -> Path:
    pack_path = output_dir / "terrain_materials_v2_pack.zip"
    with zipfile.ZipFile(pack_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for material_path in sorted((output_dir / "approved_materials").glob("*.png")):
            archive.write(material_path, f"approved_materials/{material_path.name}")
        archive.write(output_dir / "terrain_materials_v2_approved_metadata.json", "terrain_materials_v2_approved_metadata.json")
        archive.write(output_dir / "terrain_materials_v2_rejected_report.json", "terrain_materials_v2_rejected_report.json")
        archive.write(output_dir / "terrain_materials_v2_missing_materials.md", "terrain_materials_v2_missing_materials.md")
        archive.write(output_dir / "README.md", "README.md")
    return pack_path


def main() -> None:
    args = parse_args()
    output_dir = args.output_dir
    selection_path = args.selection or output_dir / "terrain_materials_v2_selection.json"

    output_dir.mkdir(parents=True, exist_ok=True)
    sources, skipped, warnings = scan_source_sheets(args.source_dir, output_dir)
    if not sources:
        raise RuntimeError("No valid candidate atlas images found.")

    selection_data = load_or_create_selection(selection_path, sources, args.force_template_selection)
    selections = validate_selection(selection_data, sources)

    if selection_path != output_dir / "terrain_materials_v2_selection.json":
        shutil.copyfile(selection_path, output_dir / "terrain_materials_v2_selection.json")

    approved_entries, rejected_entries, atlas_path = write_material_outputs(
        output_dir,
        sources,
        selections,
        make_atlas=not args.no_approved_atlas,
    )
    write_metadata(output_dir, approved_entries)
    write_rejected_report(output_dir, sources, skipped, warnings, approved_entries, rejected_entries)
    write_missing_materials(output_dir, rejected_entries)
    make_approved_contact_sheet(output_dir, approved_entries)
    write_readme(output_dir, atlas_path)
    pack_path = write_pack_zip(output_dir)

    print(f"Scanned valid sources: {len(sources)}")
    print(f"Approved materials written: {len(approved_entries)}")
    print(f"Missing/rejected semantic slots: {len(rejected_entries)}")
    print(f"Output folder: {output_dir}")
    print(f"Pack zip: {pack_path}")


if __name__ == "__main__":
    main()
