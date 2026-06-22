# Assets Task Profile

Use this profile for asset import, asset manifests, runtime texture mapping, art fallbacks, and asset validation tasks.

## Asset Roots And Manifests

- Root fallback/Batch 001 assets: `assets/`
- Improved extracted assets: `assets_v2/`
- Active overworld current asset set: `src/assets/world/current/`
- Active common/boss enemy battle art: `src/assets/enemies/`
- Active overworld manifest: `src/assets/world/current/world_asset_manifest.json`
- Active cloud manifest: `src/assets/world/current/clouds/cloud_manifest.json`
- Active dungeon atlas manifest: `src/assets/world/dungeonAtlas.manifest.json`

Runtime loading and lookups:

- `src/assets/assetPaths.ts`
- `src/assets/textureKeys.ts`
- `src/data/worldCurrentAssets.ts`
- `src/data/worldCloudAssets.ts`
- `src/data/characterSprites.ts`
- `src/data/dungeonTiles.ts`

## Core Rules

- Runtime asset resolution is premium-first, backup-second, generated-fallback-last.
- For assets that have been promoted into `src/assets/`, prefer `src/assets` over `assets_v2`/root fallback paths.
- Keep image-first rendering with generated fallback behavior.
- Do not restore deleted generic overworld overlay/POI/route placeholder PNGs.
- Do not run rembg on terrain, the opaque dungeon atlas, opaque battle backgrounds, or alpha character sheets.
- Do not use raw collages or preview sheets as runtime sprites.
- Keep UI text live unless an image is purely decorative/title art.
- Keep battle backgrounds opaque.
- Use nearest-neighbor filtering for pixel sprites, tiles, UI, and icons; battle backgrounds and title art may use linear filtering.

## Relevant Scripts

- `tools/art_import/import_character_sprites.mjs`
- `tools/art_import/import_dungeon_atlas.mjs`
- `tools/art_import/generate_asset_previews.ps1`
- `tools/world_assets/import_premium_world_objects.py`
- `tools/world-object-curator/curate_world_objects.py`
- `tools/world-object-curator/curate_world_objects_relaxed.py`
- `tools/world_assets/import_world_clouds.py`

`tools/world_assets/import_selected_world_assets.py` is a disabled legacy terrain-fill importer. Do not use it to overwrite the current approved object set or recreate generic placeholders.

## Validation

Choose the narrow command for the asset surface changed:

```powershell
npm run build
npm test
powershell -ExecutionPolicy Bypass -File tools\art_import\generate_asset_previews.ps1
node tools\art_import\import_character_sprites.mjs
npm run import:dungeon-atlas
python tools\world_assets\import_premium_world_objects.py
python tools\world-object-curator\curate_world_objects.py --integrate
python tools\world-object-curator\curate_world_objects_relaxed.py --integrate
```

Do not run expensive import, rembg, preview, or curation jobs unless the task requires that pipeline.

## Broader Context

Open `agent_knowledge/art-and-assets.md` for detailed provenance, pipeline history, exact rembg notes, or art-specific durable decisions.
