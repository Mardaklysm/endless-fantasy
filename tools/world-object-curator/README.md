# World Object Curator

Curates approved transparent overworld object sprites from generated atlas sheets in `D:\new_items`, plus additive raw/background-removal candidates in `D:\Tools\rembg\bg_input`.

The tool is deliberately strict: it exports only entries listed in the editable approval file and leaves rejected or missing categories in reports. Existing approvals are preserved, and raw-source defaults are merged additively when missing. Individual PNGs are the source of truth; any dense atlas generated here is preview-only.

## Relaxed Recovery Pass

Use the relaxed pass when reviewing later rembg/source folders for additional useful objects:

```powershell
python tools\world-object-curator\curate_world_objects_relaxed.py --integrate
```

This pass scans `D:\Tools\rembg\bg_input_2`, `D:\Tools\rembg\bg_output_2`, and `D:\Tools\rembg\bg_output`, writes additive outputs under `D:\new_items\output_relaxed`, and integrates only `game_ready` objects into `src\assets\world\current\objects`. `touchup_needed` objects stay external for manual cleanup.

Important policy distinction: compact settlements are valid POI sprites. Do not reject villages, towns, city districts, harbor towns, castle towns, forts, monasteries, academies, or similar miniature settlement compositions merely because they include multiple buildings, walls, plazas, docks, or a compact ground/water base. That rule only applies to base terrain materials, not overworld POI objects.

## Run

```powershell
python tools\world-object-curator\curate_world_objects.py --integrate
```

If Pillow is missing:

```powershell
python -m pip install -r tools\world-object-curator\requirements.txt
```

## Editable Decisions

The first run writes:

```text
D:\new_items\output\world_objects_v2_approval_decisions.json
```

Future runs preserve and use that file, so manual visual approvals can be edited without changing the script. Delete or rename that file only when you intentionally want to reset to the script's default curated selections.

## Outputs

Primary curation outputs live under:

```text
D:\new_items\output
```

Runtime copies live under:

```text
src\assets\world\current\objects
```

The game manifest is updated at:

```text
src\assets\world\current\world_asset_manifest.json
```

Roads remain procedural renderer overlays. Rivers render from semantic asset tile masks using the freshwater material. Approved bridge, dock, marker, POI, forest, mountain, resource, and prop sprites are transparent object overlays only.

The raw-source pass compares exact black/white keys, edge-connected black/white flood fills, sampled edge-color flood fills, and existing alpha. Approved raw additions record their selected cleanup method in metadata, and `world_objects_v2_background_method_contactsheet.png` shows the method comparison for review.
