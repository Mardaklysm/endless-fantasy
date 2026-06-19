# Art And Assets

## Current Art Approach

The game now has two asset roots:

- `assets/`: Batch 001 and older verified fallback assets.
- `assets_v2/`: improved SNES-style assets extracted from `D:\Projects\new_artwork`.

Phaser preloads stable texture keys from `src/main.ts`. The loader prefers `assets_v2` for mapped keys and falls back to `assets/` when a v2 file is missing. Do not delete generated `Graphics` fallback rendering; missing or rejected assets must still leave the game playable.

`assets_v2/source_sheets/` stores provenance copies of source sheets used by the importer. `assets_v2/previews/` stores contact sheets and quality reports. Runtime glob loading intentionally excludes `assets_v2/source_sheets/`, `assets_v2/previews/`, and the reference-only UI window crops with baked sample text.

## V2 Import Pipeline

Reusable scripts live in `tools/art_import/`:

- `scan_new_artwork.ps1`: inventories `D:\Projects\new_artwork`.
- `extract_new_art_assets.ps1`: reads JSON crop maps and extracts final PNGs to `assets_v2`.
- `apply_rembg_candidates.ps1`: compares color-key and rembg outputs, promoting only approved rembg results.
- `generate_asset_previews.ps1`: creates contact sheets and `assets_v2/previews/QUALITY_REPORT.md`.
- `import_character_sprites.mjs`: imports `D:\Tools\rembg\bg_output\fighter.png`, `priest.png`, and `wizard.png` without running rembg, splits them as 5x2 alpha PNG sheets, normalizes fixed cells/anchors, writes `src/data/characterSprites.ts`, and creates debug previews/reports in `docs/debug/sprite-import/`.
- `import_world_atlas.mjs`: legacy importer for the older final PNG source `C:\Users\Marku\Downloads\master_overworld_tileset_atlas_10x10.png`. It can still recreate `src/assets/world/world_atlas.normalized.png` and debug atlas outputs, but that 10x10 generated atlas is no longer active runtime terrain.
- `import_classic_world_tileset.mjs`: imports the complex classic sheet `C:\Users\Marku\Downloads\57105.png`. The PNG has an RGBA color type but no meaningful alpha, so the importer removes only exact `#00B100` pixels, writes `src/assets/world/tilesets/classic_world_tileset.cleaned.png`, `classicWorldTileset.manifest.json`, extracted tile/object/landmark PNGs, and debug reports/contact sheets in `docs/debug/world-tileset-import/`.

Manual crop maps live in `tools/art_import/crop_maps/`. The active overworld no longer uses the old crop-map/JPEG normalization path or the legacy 10x10 atlas.

The source folder `D:\Projects\new_artwork` contained 63 PNGs and no ZIPs. No extraction into `D:\Projects\new_artwork_extracted` was needed.

## rembg Use

Use the local rembg install:

```powershell
& "D:\tools\rembg\venv_rembg\Scripts\rembg.exe" p -m birefnet-general "D:\tools\rembg\bg_input\endless_fantasy" "D:\tools\rembg\bg_output\endless_fantasy"
```

The exact venv reported ONNX Runtime providers `DmlExecutionProvider` and `CPUExecutionProvider`, so the local AMD/Windows acceleration path is DirectML. Do not add NVIDIA, CUDA, or `nvidia-smi` assumptions to this project.

Default model is `birefnet-general`. Fallback order, only when needed, is `birefnet-massive`, `u2net`, `isnet-general-use`, then `u2netp` only for small icon cleanup.

In the current pass, 73 rembg candidates were generated. rembg was promoted only for `prop_crate.png`, `prop_barrel.png`, `prop_lamp.png`, and `prop_rug.png`. Color-key output stayed cleaner for characters, portraits, battle sprites, enemies, bosses, markers, service signs, cursors, buttons, and UI bars.

## Wired V2 Assets

Rendered now from `assets_v2`:

- Overworld terrain: generated worlds render from the active classic sheet `src/assets/world/tilesets/classic_world_tileset.cleaned.png` through `src/data/worldTiles.ts` and the curated catalog in `src/world/classicWorldTileCatalog.ts`.
- Location markers: town, castle, cave, keep, shrine, tower, port, gate, eclipse spire.
- Town/interior: stone floor/walls, exit gate, service signs, table/rug, crate, barrel, lamps.
- Characters: Arlen/Mira/Kael portraits; fighter/priest/wizard normalized class sheets drive Arlen/Mira/Kael battle sprites, and the fighter sheet drives the visible exploration leader.
- Common enemies: first twelve enemy IDs use cleaned roster crops.
- Bosses: all five boss IDs use cleaned boss roster crops.
- Battle backgrounds: forest path, plains, moss cave, ashen keep, tide shrine, eclipse spire.
- UI: compact window panel skin, cursor, HP/MP/empty bars, buttons. Runtime text remains live Phaser text.

Still fallback or older assets:

- Later-region normal enemies not present in the new common roster: reef fang, bubble eye, drowned husk, sky mite, gale harpy, glass roc, eclipse shade, crown guard, void serpent.
- Dungeon tiles/objects, vehicles, inventory/equipment/relic icons, title art, and effects still use Batch 001 or generated fallbacks.
- `command_window.png`, `target_window.png`, `party_status_window.png`, and `message_window.png` are reference/source-only because they include sample text or baked layout.

Legacy/reference world atlas:

- `src/assets/world/world_atlas.normalized.png` may remain in the repository as an archived/generated atlas asset, but `src/main.ts` excludes it from active eager loading and runtime gameplay should not use it unless a future task intentionally reactivates it.

## Current Sizes

- Canvas/backing render target: 1920x1080 by default.
- Layout grid: 960x540-equivalent coordinates derived from the Full HD design size with `PIXEL_ART_SCALE = 2`.
- Display tile grid: 32x32 layout pixels, rendered as 64x64 canvas pixels at the default Full HD target.
- Active classic world tileset: 832x1072 source/cleaned PNG, 52x67 cells at a 16px base grid, 12 manually verified major groups, 1885 deduplicated 16x16 tile crops, and 122 object/landmark component crops. Runtime worldgen uses only the curated subset in `src/world/classicWorldTileCatalog.ts`.
- Legacy world atlas: 10 columns x 10 rows, 256x256 cells, 2560x2560 opaque PNG. It is not active gameplay terrain.
- V2 town tiles: 32x32 opaque PNGs.
- Class character sheets: 5 columns x 2 rows, 704x512 cells, 3520x1024 sheet size, transparent PNG. Manifest anchor is bodyCenterX=352 and feetBaselineY=464.
- V2 portraits: 32x40 transparent PNGs.
- V2 normal enemies: 96x96 transparent PNGs.
- V2 bosses: 192x192 transparent PNGs.
- V2 battle backgrounds: 2752x1536 opaque JPEGs, rendered full-canvas at 16:9.

## Current Runtime Presentation Notes

- Dawnford/town service markers render as one clean horizontal row of five image-only icons. Do not add always-visible text labels such as Items/Arms/Magic/Clinic back onto those markers.
- The town south exit uses the gate art only; there is no floating "Exit" label or persistent bottom-right interaction hint in normal town exploration.
- Overworld locations render as larger 3x3-ish landmarks with matching entry footprints. Keep terrain tiles small/repeating, but landmarks should remain visually important.
- Active overworld slicing uses exact manifest source rectangles from the classic manifest: `source.x`, `source.y`, `source.width`, and `source.height`. Do not reintroduce 10x10 row/column assumptions, proportional slicing, JPEG cleanup, gutters, edge bleed, or debug-grid art for runtime terrain.
- Battle backgrounds are full 16:9 opaque JPEG images and are assigned linear texture filtering. Pixel sprites, tiles, UI, and icons remain nearest-neighbor filtered. The canvas itself uses `image-rendering: auto` so high-resolution artwork is not globally pixelated.
- Battle party presentation uses the normalized fighter/priest/wizard class sheets only on the battlefield; redundant small head portraits/icons and old standalone party battle PNGs are intentionally not drawn there.

## Real-Asset Rules

- Use `assets_v2` only for clean, game-ready outputs, not raw collages.
- Do not wire assets with labels, beige sheet backgrounds, adjacent fragments, huge padding, or cut-off neighbors.
- Keep service labels and UI text live unless an image is purely decorative/title art.
- Keep battle backgrounds opaque.
- Keep terrain tiles rectangular and opaque; do not run rembg on terrain.
- For `classic_world_tileset`, preserve pixel edges by removing only exact `#00B100` matte pixels. Do not use fuzzy green removal unless a future source analysis proves it is necessary.
- Do not rerun rembg or chroma-key the fighter/priest/wizard source sheets; their existing alpha channel is the source of truth.
- Prefer nearest-neighbor scaling for tiles, icons, sprites, and enemies.
- Review `assets_v2/previews/*.png` and `assets_v2/previews/QUALITY_REPORT.md` before expanding runtime mappings.

## References

- `tools/art_import/NEW_ARTWORK_INVENTORY.md`: source image inventory and extraction decisions.
- `assets_v2/previews/QUALITY_REPORT.md`: contact sheet QA notes and rembg promotion summary.
- `ART_STYLE_GUIDE.md`: chosen visual direction, pixel scale, palette, shading, outline, animation, readability rules.
- `ASSET_MANIFEST.md`: exact required/optional asset checklist with filenames, sizes, priorities, and replacement targets.
- `ASSET_IMPLEMENTATION_PLAN.md`: asset folder structure, loading strategy, fallback behavior, and safe replacement order.

## What Future Agents Should Not Do With Art

- Do not copy copyrighted sprites, UI, music, logos, spell visuals, enemy designs, or maps.
- Do not add external asset packs or dependencies without explicit approval.
- Do not remove generated fallback art until replacement assets are implemented and verified.
- Do not bake UI text into images except for title/logo artwork.
- Do not switch to a hyper-detailed style that conflicts with the current 32px tile grid.
- Do not use source collages directly as sprites/tiles unless they are explicitly intended as full-screen/background art.
