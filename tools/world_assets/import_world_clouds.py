#!/usr/bin/env python3
"""Import reusable overworld cloud masks into the current world asset set."""

from __future__ import annotations

import argparse
import json
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Any

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = Path(r"D:\Tools\rembg\bg_output_2")
RUNTIME_ROOT = PROJECT_ROOT / "src" / "assets" / "world" / "current"
CLOUD_ROOT = RUNTIME_ROOT / "clouds"
MANIFEST_PATH = CLOUD_ROOT / "cloud_manifest.json"
REPORT_PATH = PROJECT_ROOT / "tmp" / "world-cloud-import-report.md"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


THEME_TINTS: dict[str, dict[str, Any]] = {
    "grassland": {"tint": "#FFFFFF", "alpha": 0.50, "speedMultiplier": 1.0, "tintStrength": 0.12},
    "jungle": {"tint": "#DFFFEA", "alpha": 0.48, "speedMultiplier": 0.90, "tintStrength": 0.42},
    "snow": {"tint": "#E5F7FF", "alpha": 0.52, "speedMultiplier": 0.85, "tintStrength": 0.42},
    "desert": {"tint": "#FFE7B8", "alpha": 0.45, "speedMultiplier": 1.05, "tintStrength": 0.46},
    "swamp": {"tint": "#C8D6B0", "alpha": 0.44, "speedMultiplier": 0.75, "tintStrength": 0.55},
    "volcanic": {"tint": "#A88A78", "alpha": 0.42, "speedMultiplier": 0.80, "tintStrength": 0.58},
    "deadland": {"tint": "#B7A8C8", "alpha": 0.43, "speedMultiplier": 0.80, "tintStrength": 0.54},
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import reusable base cloud overlay assets.")
    parser.add_argument("--source", type=Path, default=SOURCE_ROOT, help="Source folder to scan.")
    parser.add_argument("--output", type=Path, default=CLOUD_ROOT, help="Runtime cloud output folder.")
    parser.add_argument("--manifest", type=Path, default=MANIFEST_PATH, help="Cloud manifest output path.")
    parser.add_argument("--report", type=Path, default=REPORT_PATH, help="Import report path.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing cloud PNGs.")
    args = parser.parse_args()

    source_root = args.source.resolve()
    output_root = args.output.resolve()
    manifest_path = args.manifest.resolve()
    report_path = args.report.resolve()

    output_root.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    source_files = list_source_images(source_root)
    imported: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []

    for index, source_file in enumerate(source_files, start=1):
        try:
            with Image.open(source_file) as image:
                image.load()
                rgba = image.convert("RGBA")
        except Exception as error:  # noqa: BLE001 - report the exact technical import failure.
            skipped.append({"sourceFile": str(source_file), "reason": f"unreadable image: {error}"})
            continue

        prepared, cleanup_method = prepare_cloud_alpha(rgba)
        bbox = prepared.getchannel("A").getbbox()
        if not bbox:
            skipped.append({"sourceFile": str(source_file), "reason": "empty alpha after cleanup"})
            continue

        padded_bbox = pad_bbox(bbox, prepared.size, 12)
        cloud = prepared.crop(padded_bbox)
        filename = f"cloud_base_{index:02d}.png"
        target = output_root / filename
        if args.overwrite or not target.exists():
            cloud.save(target)

        imported.append(
            {
                "id": target.stem,
                "textureKey": f"world_{target.stem}",
                "filename": f"clouds/{filename}",
                "path": f"assets/world/current/clouds/{filename}",
                "sourceFile": relative_source(source_root, source_file),
                "cleanupMethod": cleanup_method,
                "topBand": True,
                "dimensions": {"width": cloud.width, "height": cloud.height},
                "sourceDimensions": {"width": rgba.width, "height": rgba.height},
                "sourceCrop": {
                    "x": padded_bbox[0],
                    "y": padded_bbox[1],
                    "width": padded_bbox[2] - padded_bbox[0],
                    "height": padded_bbox[3] - padded_bbox[1],
                },
                "notes": "Reusable base cloud mask; visible pixels preserved and transparent padding cropped.",
            }
        )

    manifest = {
        "schemaVersion": 2,
        "id": "world_tinted_cloud_overlay_manifest_v1",
        "runtimeRoot": "src/assets/world/current",
        "sourceFolder": str(source_root),
        "fallbackTheme": "grassland",
        "baseClouds": imported,
        "themeCloudPools": {theme: [] for theme in THEME_TINTS},
        "themeTints": THEME_TINTS,
        "islandThemeMap": {
            "greenhaven": "grassland",
            "Greenhaven": "grassland",
            "coralreach": "jungle",
            "Coralreach": "jungle",
            "frostmere": "snow",
            "Frostmere": "snow",
            "highspire": "grassland",
            "Highspire": "grassland",
            "ashfall": "volcanic",
            "Ashfall": "volcanic",
        },
        "semanticThemeMap": {
            "grassland": "grassland",
            "sand_coast": "desert",
            "ice": "snow",
            "mixed_highland": "grassland",
            "minor": "grassland",
        },
        "fallbackRules": [
            "Resolve island or semantic theme to a cloud tint theme.",
            "Use a non-empty themeCloudPools entry when biome-specific cloud art exists.",
            "Use baseClouds when the theme-specific pool is empty or missing.",
            "Use fallbackTheme grassland when the island or theme is unknown.",
            "Disable cloud overlay gracefully if no cloud sprites are available.",
        ],
    }
    write_text_lf(manifest_path, json.dumps(manifest, indent=2) + "\n")
    write_text_lf(report_path, build_report(source_root, output_root, source_files, imported, skipped))

    print(f"Cloud source files scanned: {len(source_files)}")
    print(f"Base clouds imported: {len(imported)}")
    print(f"Skipped: {len(skipped)}")
    print(f"Manifest written: {manifest_path}")
    print(f"Report written: {report_path}")


def list_source_images(source_root: Path) -> list[Path]:
    if not source_root.exists():
        raise SystemExit(f"Cloud source folder does not exist: {source_root}")
    return sorted(
        [
            path
            for path in source_root.rglob("*")
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS and "output" not in {part.lower() for part in path.relative_to(source_root).parts[:-1]}
        ],
        key=lambda path: str(path).lower(),
    )


def prepare_cloud_alpha(image: Image.Image) -> tuple[Image.Image, str]:
    alpha = image.getchannel("A")
    min_alpha, max_alpha = alpha.getextrema()
    if min_alpha < 255 and max_alpha > 0:
        return image, "preserve_existing_alpha"
    return remove_edge_connected_black(image, tolerance=24), "edge_connected_black_flood_tolerance_24"


def remove_edge_connected_black(image: Image.Image, tolerance: int) -> Image.Image:
    rgba = image.copy()
    pixels = rgba.load()
    width, height = rgba.size
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or x < 0 or y < 0 or x >= width or y >= height:
            continue
        seen.add((x, y))
        red, green, blue, alpha = pixels[x, y]
        if alpha == 0 or max(red, green, blue) <= tolerance:
            pixels[x, y] = (red, green, blue, 0)
            queue.append((x + 1, y))
            queue.append((x - 1, y))
            queue.append((x, y + 1))
            queue.append((x, y - 1))
    return rgba


def pad_bbox(bbox: tuple[int, int, int, int], size: tuple[int, int], padding: int) -> tuple[int, int, int, int]:
    left, top, right, bottom = bbox
    width, height = size
    return (max(0, left - padding), max(0, top - padding), min(width, right + padding), min(height, bottom + padding))


def relative_source(source_root: Path, source_file: Path) -> str:
    try:
        return source_file.relative_to(source_root).as_posix()
    except ValueError:
        return str(source_file)


def build_report(source_root: Path, output_root: Path, source_files: list[Path], imported: list[dict[str, Any]], skipped: list[dict[str, str]]) -> str:
    lines = [
        "# World Cloud Import Report",
        "",
        f"Generated: {datetime.now().isoformat(timespec='seconds')}",
        f"Source folder: `{source_root}`",
        f"Runtime cloud folder: `{output_root}`",
        "",
        "## Summary",
        "",
        f"- Source images scanned: {len(source_files)}",
        f"- Reusable base clouds imported: {len(imported)}",
        f"- Skipped for technical reasons: {len(skipped)}",
        "",
        "## Theme Tint Runtime",
        "",
        "- The five imported base cloud PNGs are reused for every island/theme.",
        "- Runtime tinting applies a blended theme color, alpha, and speed multiplier from `cloud_manifest.json`.",
        "- Future biome-specific cloud art can be added to `themeCloudPools`; otherwise the base cloud pool remains the fallback.",
        "",
        "## Imported Clouds",
        "",
        *[
            f"- `{cloud['filename']}` from `{cloud['sourceFile']}` ({cloud['dimensions']['width']}x{cloud['dimensions']['height']}, {cloud['cleanupMethod']})"
            for cloud in imported
        ],
        "",
        "## Skipped",
        "",
    ]
    if skipped:
        lines.extend(f"- `{item['sourceFile']}`: {item['reason']}" for item in skipped)
    else:
        lines.append("- None.")
    lines.extend(
        [
            "",
            "## Rerun Command",
            "",
            "```powershell",
            "python tools\\world_assets\\import_world_clouds.py --overwrite",
            "```",
        ]
    )
    return "\n".join(lines) + "\n"


def write_text_lf(path: Path, text: str) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)


if __name__ == "__main__":
    main()
