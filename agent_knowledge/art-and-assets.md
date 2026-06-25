# Art And Assets

## Canonical Roots

Runtime assets live under `src/assets/`. Root-level `assets/` and `assets_v2/` are retired; do not recreate them or add fallback globs back to runtime loading.

Reference-only material lives under `src/assets/source/`. That folder is excluded from `src/assets/assetPaths.ts` runtime preload globs. Keep source sheets, QA contact sheets, UI sample crops with baked text, and other provenance files there.

Current important runtime folders:

- `src/assets/battle/backgrounds/`: opaque 16:9 battle JPEGs.
- `src/assets/characters/`, `src/assets/heroes/`, `src/assets/enemies/`: actor, class sheet, portrait, and enemy art.
- `src/assets/effects/`, `src/assets/icons/`, `src/assets/title/`, `src/assets/ui/`: stable keyed UI/combat/title assets.
- `src/assets/poi/`: authored POI background images.
- `src/assets/tiles/dungeons/` and `src/assets/tiles/objects/`: older individual fallback dungeon/object tiles.
- `src/assets/world/dungeon_tiles/`: active individual dungeon/city tile PNGs. These replaced the old dungeon atlas crop path.
- `src/assets/world/current/terrain/`: approved individual overworld terrain fills.
- `src/assets/world/current/terrain_v1/`: restored individual overworld terrain textures for water, beach/sand, freshwater, and snow/ice. These are allowed runtime files despite the `terrain_v1_atlas_*` names.
- `src/assets/world/current/objects/`, `objects_premium/`, `objects_premium_v2/`, `clouds/`, `boats/`: active overworld object/cloud/boat assets and manifests.

## Runtime Loading

Phaser preloads stable keyed assets through `src/assets/assetPaths.ts`, current-world assets through `src/data/worldCurrentAssets.ts`, cloud assets through `src/data/worldCloudAssets.ts`, character sprites through `src/data/characterSprites.ts`, and dungeon tiles through `src/data/dungeonTiles.ts`.

`src/assets/assetPaths.ts` should resolve from `src/assets` only. Do not add root `assets` or `assets_v2` fallbacks.

## Dungeon Tiles

Dungeon and interior-style tile rendering uses 64 individual PNG files under `src/assets/world/dungeon_tiles/` with texture keys shaped like `dungeon_tile_<id>`.

The manifest is `src/assets/world/dungeonTiles.manifest.json`. It keeps tile IDs, categories, themes, original cell metadata, and the 3-pixel source inset that was baked into the generated PNGs. Runtime code should draw tile images directly and should not crop a dungeon atlas.

The old `src/assets/world/dungeon_atlas.png`, `src/assets/world/dungeonAtlas.manifest.json`, `tools/art_import/import_dungeon_atlas.mjs`, and `npm run import:dungeon-atlas` path are removed.

## Authored POIs And Town Removal

Generated town interiors are removed from runtime. There is no `town` scene mode, generated town renderer, town service marker layout, or `src/assets/tiles/town/` runtime folder.

Settlement/location gameplay should go through authored POIs (`src/data/pois/*.json`, `src/systems/poi/poiVisit.ts`, `src/render/poi/drawPoi.ts`). Shops, inns, churches, and magic-shop stock use POI service profiles in `src/data/poiServiceProfiles.ts`.

The word `town` may still appear as a world/POI category, asset tag, visual label, or historical docs wording. That is separate from the removed generated town-interior gameplay path.

## Import Tools

Reusable scripts live in `tools/art_import/`:

- `scan_new_artwork.ps1`: inventories `D:\Projects\new_artwork`.
- `extract_new_art_assets.ps1`: reads crop maps and writes runtime outputs to `src/assets`, with source copies under `src/assets/source/art_import/source_sheets`.
- `apply_rembg_candidates.ps1`: compares color-key and rembg candidates, with disposable review output under `src/assets/source/art_import/previews/rembg_candidates`.
- `generate_asset_previews.ps1`: writes contact sheets and `QUALITY_REPORT.md` under `src/assets/source/art_import/previews`.
- `import_character_sprites.mjs`: imports normalized fighter/priest/wizard sheets from `D:\Tools\rembg\bg_output`.

Do not use raw collages or preview sheets as runtime sprites. Do not run rembg on terrain, opaque battle backgrounds, or alpha character sheets.

## Validation

For ordinary asset/runtime changes, run:

```powershell
npm run build
npm test
```

Run expensive import, preview, rembg, or curation jobs only when the task explicitly changes that pipeline.
