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
- `import_atlas_v3.mjs`: imports `D:\Projects\new_artwork\atlas_v3.jpeg`, converts it once to `src/assets/world/atlas_v3.png`, detects mostly-black empty cells, writes `src/assets/world/atlasV3.manifest.json`, and creates `docs/debug/world-atlas-v3/atlas-v3-labeled.png` plus `atlas-v3-import-report.md`.
- `import_world_atlas.mjs`: legacy importer for the older final PNG source `C:\Users\Marku\Downloads\master_overworld_tileset_atlas_10x10.png`. It can still recreate `src/assets/world/world_atlas.normalized.png` and debug atlas outputs, but that 10x10 generated atlas is no longer active runtime terrain.
- `import_classic_world_tileset.mjs`: archived importer for the complex classic sheet `C:\Users\Marku\Downloads\57105.png`. The classic sheet is not active runtime terrain.

Manual crop maps live in `tools/art_import/crop_maps/`. The active overworld uses only the fixed 8x8 `atlas_v3` path, not the old crop-map/JPEG normalization path, the legacy 10x10 atlas, or the classic special sheet.

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

- Overworld terrain: generated worlds render from `src/assets/world/atlas_v3.png` through `src/assets/world/atlasV3.manifest.json` and `src/data/worldTiles.ts`. The active grid is 8x8 with 29 non-empty tiles and 35 empty black slots that worldgen ignores.
- Overworld polish: after the generated tile map is rendered into a cache, `src/world/terrainBlending.ts` repairs only near-black seam pixels using pixels sampled from neighboring tile interiors. This is a runtime/cache pass only; it must not modify or crop `atlas_v3.png`, and it must not broadly blend terrain textures.
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
- `src/assets/world/tilesets/classic_world_tileset.cleaned.png`, `classicWorldTileset.manifest.json`, extracted classic crops, and classic debug contact sheets may remain as archived assets/tool outputs, but active gameplay must not import them.

## Current Sizes

- Canvas/backing render target: 1920x1080 by default.
- Layout grid: 960x540-equivalent coordinates derived from the Full HD design size with `PIXEL_ART_SCALE = 2`.
- Display tile grid: 32x32 layout pixels, rendered as 64x64 canvas pixels at the default Full HD target.
- Active `atlas_v3` world atlas: source `D:\Projects\new_artwork\atlas_v3.jpeg`, runtime `src/assets/world/atlas_v3.png`, 1024x1024 PNG, 8 columns x 8 rows, 128x128 logical cells, 29 non-empty tiles, and 35 mostly-black empty cells.
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
- Active overworld slicing uses exact 8x8 atlas math from `atlasV3.manifest.json`: `sx = col * tileWidth`, `sy = row * tileHeight`, `sw = tileWidth`, `sh = tileHeight`. Do not reintroduce classic special tiles, old 10x10 assumptions, roads/beaches/bridges, chroma-keying, global black transparency, or debug-grid art for runtime terrain.
- Do not implement atlas-level seam healing for `atlas_v3`. Any seam cleanup belongs to the cached map-level black seam repair pass after tile placement. That pass must search only 3..6 display pixels inward for clean local source pixels, synthesize replacements from both adjacent sides, replace only near-black pixels inside narrow expected seam/corner areas, and leave all non-black tile artwork unchanged.
- Battle backgrounds are full 16:9 opaque JPEG images and are assigned linear texture filtering. Pixel sprites, tiles, UI, and icons remain nearest-neighbor filtered. The canvas itself uses `image-rendering: auto` so high-resolution artwork is not globally pixelated.
- Battle party presentation uses the normalized fighter/priest/wizard class sheets only on the battlefield; redundant small head portraits/icons and old standalone party battle PNGs are intentionally not drawn there.

## Real-Asset Rules

- Use `assets_v2` only for clean, game-ready outputs, not raw collages.
- Do not wire assets with labels, beige sheet backgrounds, adjacent fragments, huge padding, or cut-off neighbors.
- Keep service labels and UI text live unless an image is purely decorative/title art.
- Keep battle backgrounds opaque.
- Keep terrain tiles rectangular and opaque; do not run rembg on terrain.
- For `atlas_v3`, black cells mean unused slots. Do not treat black as transparency, do not chroma-key the atlas, and do not select empty cells in worldgen.
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
