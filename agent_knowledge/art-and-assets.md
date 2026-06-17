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

Manual crop maps live in `tools/art_import/crop_maps/`. The world tile crop map includes `postResizeCrop` cleanup to remove source-sheet border pixels after resizing. Keep this when regenerating terrain, or the overworld will look grid/debug-like.

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

- Overworld terrain: plains, forest, hills, mountain, shallow/deep water, sand, road.
- Location markers: town, castle, cave, keep, shrine, tower, port, gate, eclipse spire.
- Town/interior: stone floor/walls, exit gate, service signs, table/rug, crate, barrel, lamps.
- Characters: Arlen/Mira/Kael portraits and battle sprites; Arlen map sprite is used for world/town/dungeon leader rendering.
- Common enemies: first twelve enemy IDs use cleaned roster crops.
- Bosses: all five boss IDs use cleaned boss roster crops.
- Battle backgrounds: forest path, plains, moss cave, ashen keep, tide shrine, eclipse spire.
- UI: compact window panel skin, cursor, HP/MP/empty bars, buttons. Runtime text remains live Phaser text.

Still fallback or older assets:

- Later-region normal enemies not present in the new common roster: reef fang, bubble eye, drowned husk, sky mite, gale harpy, glass roc, eclipse shade, crown guard, void serpent.
- Dungeon tiles/objects, vehicles, inventory/equipment/relic icons, title art, and effects still use Batch 001 or generated fallbacks.
- `command_window.png`, `target_window.png`, `party_status_window.png`, and `message_window.png` are reference/source-only because they include sample text or baked layout.

## Current Sizes

- Canvas/internal resolution: 960x540.
- Display tile grid: 32x32.
- V2 world and town tiles: 32x32 opaque PNGs.
- V2 map character sheets: 16x16 frames arranged as 2 columns x 4 rows.
- V2 portraits: 32x40 transparent PNGs.
- V2 normal enemies: 96x96 transparent PNGs.
- V2 bosses: 192x192 transparent PNGs.
- V2 battle backgrounds: 960x390 opaque PNGs.

## Real-Asset Rules

- Use `assets_v2` only for clean, game-ready outputs, not raw collages.
- Do not wire assets with labels, beige sheet backgrounds, adjacent fragments, huge padding, or cut-off neighbors.
- Keep service labels and UI text live unless an image is purely decorative/title art.
- Keep battle backgrounds opaque.
- Keep terrain tiles rectangular and opaque; do not run rembg on terrain.
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
