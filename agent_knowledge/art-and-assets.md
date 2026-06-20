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
- `import_atlas_v3.mjs`: imports `D:\Projects\new_artwork\atlas_v3.jpeg`, normalizes it to the 1024x1024 runtime PNG at `src/assets/world/atlas_v3.png`, writes all 64 atlas cell classifications to `src/assets/world/atlasV3.manifest.json`, and creates `docs/debug/world-atlas-v3/atlas-v3-labeled.png` plus `atlas-v3-import-report.md`.
- `import_world_objects.mjs`: imports `D:\Projects\new_artwork\world_objects_atlas.jpeg`, resizes it to the 1024x1024 transparent runtime PNG at `src/assets/world/world_objects.png`, writes all 64 object overlay cells to `src/assets/world/worldObjectAtlas.manifest.json`, and creates `docs/debug/world-objects/world-objects-import-report.md`.
- `import_dungeon_atlas.mjs`: imports `D:\Projects\new_artwork\dungeon_atlas.jpeg`, resizes it to the 1024x1024 opaque runtime PNG at `src/assets/world/dungeon_atlas.png`, writes all 64 dungeon/city cells to `src/assets/world/dungeonAtlas.manifest.json`, and creates `docs/debug/dungeon-atlas/dungeon-atlas-import-report.md`.
- `import_world_atlas.mjs`: legacy importer for the older final PNG source `C:\Users\Marku\Downloads\master_overworld_tileset_atlas_10x10.png`. It can still recreate `src/assets/world/world_atlas.normalized.png` and debug atlas outputs, but that 10x10 generated atlas is no longer active runtime terrain.
- `import_classic_world_tileset.mjs`: archived importer for the complex classic sheet `C:\Users\Marku\Downloads\57105.png`. The classic sheet is not active runtime terrain.

Independent art preview tools:

- `tools/island-kernel-lab/islandKernelLab.mjs` runs through `npm run island:kernel -- --input <png>`. It is a standalone PNG slicing/composition lab for generated Greenhaven island kernels and is not part of Phaser runtime, current worldgen, or the active map renderer.

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

- Overworld terrain: generated worlds render from `src/assets/world/atlas_v3.png` through `src/assets/world/atlasV3.manifest.json` and `src/data/worldTiles.ts`. The active grid is 8x8 with 64 classified terrain cells, including grass, beaches/coasts, shallow/deep water, forests/jungle, roads, mountains, darkland, and lava/volcanic tiles. Valid tile draws use `ATLAS_V3_SOURCE_INSET = 3`, cropping dirty source-cell edges while drawing the clean interior into the full destination tile.
- Harbor docks: generated harbor dock/bridge markers render from `src/assets/world/pier_atlas.png`, a 1024x1024 4x4 sheet normalized from `D:\Projects\new_artwork\pier_atlas.jpeg`. The runtime currently uses horizontal and vertical pier cells, with generated Graphics fallback if the texture is missing.
- World object overlays: generated dungeons, harbors, landmarks, ocean details, and grouped palm/normal tree overlays can render from `src/assets/world/world_objects.png` through `src/assets/world/worldObjectAtlas.manifest.json` and `src/data/worldObjects.ts`. The source is a magenta-matte JPG from `D:\Projects\new_artwork\world_objects_atlas.jpeg`; the importer uses ImageMagick edge flood-fill transparency, not global color removal, so purple portals/crystals/gems remain intact.
- Dungeon/city tiles: procedural dungeons and town/city interiors render from `src/assets/world/dungeon_atlas.png` through `src/assets/world/dungeonAtlas.manifest.json` and `src/data/dungeonTiles.ts`. Runtime crops cells inward with `DUNGEON_ATLAS_SOURCE_INSET = 3`. The atlas is opaque and covers medieval stone, cave, ice, ruin, volcanic, cursed, chest, gate, stair, switch, portal, and boss-seal cells. Town floors/walls, dungeon floors/walls, and shop pads use this sheet with weighted base/accent selection, while service/shop signs remain separate image assets.
- Location markers: town, castle, cave, keep, shrine, tower, port, gate, eclipse spire.
- Town/interior: stone floor/walls, exit gate, service signs, table/rug, crate, barrel, lamps.
- Characters: Arlen/Mira/Kael portraits; fighter/priest/wizard normalized class sheets drive Arlen/Mira/Kael battle sprites, and the fighter sheet drives the visible exploration leader.
- Common enemies: first twelve enemy IDs use cleaned roster crops.
- Bosses: all five boss IDs use cleaned boss roster crops.
- Battle backgrounds: forest path, plains, moss cave, ashen keep, tide shrine, eclipse spire.
- UI: compact window panel skin, cursor, HP/MP/empty bars, buttons. Runtime text remains live Phaser text.

Still fallback or older assets:

- Later-region normal enemies not present in the new common roster: reef fang, bubble eye, drowned husk, sky mite, gale harpy, glass roc, eclipse shade, crown guard, void serpent.
- Vehicles, inventory/equipment/relic icons, title art, and effects still use Batch 001 or generated fallbacks.
- `command_window.png`, `target_window.png`, `party_status_window.png`, and `message_window.png` are reference/source-only because they include sample text or baked layout.

Legacy/reference world atlas:

- `src/assets/world/world_atlas.normalized.png` may remain in the repository as an archived/generated atlas asset, but `src/main.ts` excludes it from active eager loading and runtime gameplay should not use it unless a future task intentionally reactivates it.
- `src/assets/world/tilesets/classic_world_tileset.cleaned.png`, `classicWorldTileset.manifest.json`, extracted classic crops, and classic debug contact sheets may remain as archived assets/tool outputs, but active gameplay must not import them.

## Current Sizes

- Canvas/backing render target: 1920x1080 by default.
- Layout grid: 960x540-equivalent coordinates derived from the Full HD design size with `PIXEL_ART_SCALE = 2`.
- Display tile grid: 32x32 layout pixels, rendered as 64x64 canvas pixels at the default Full HD target.
- Active `atlas_v3` world atlas: source `D:\Projects\new_artwork\atlas_v3.jpeg`, runtime `src/assets/world/atlas_v3.png`, 1024x1024 PNG, 8 columns x 8 rows, 128x128 logical cells, 64 non-empty terrain cells, and no active empty cells.
- Active pier atlas: source `D:\Projects\new_artwork\pier_atlas.jpeg`, runtime `src/assets/world/pier_atlas.png`, 1024x1024 PNG, 4 columns x 4 rows, 256x256 logical cells.
- Active world object atlas: source `D:\Projects\new_artwork\world_objects_atlas.jpeg`, runtime `src/assets/world/world_objects.png`, 1024x1024 transparent PNG, 8 columns x 8 rows, 128x128 logical cells, 64 overlay object cells.
- Active dungeon atlas: source `D:\Projects\new_artwork\dungeon_atlas.jpeg`, runtime `src/assets/world/dungeon_atlas.png`, 1024x1024 opaque PNG, 8 columns x 8 rows, 128x128 logical cells, 64 dungeon/city cells.
- Greenhaven island kernel lab format: source PNGs are 1152x1152, 9 columns x 9 rows, 128x128 logical cells. Generated lab previews under `tmp/island-kernel-lab/` are disposable and should not be committed.
- Legacy world atlas: 10 columns x 10 rows, 256x256 cells, 2560x2560 opaque PNG. It is not active gameplay terrain.
- V2 town tiles: 32x32 opaque PNGs.
- Class character sheets: 5 columns x 2 rows, 704x512 cells, 3520x1024 sheet size, transparent PNG. Manifest anchor is bodyCenterX=352 and feetBaselineY=464.
- V2 portraits: 32x40 transparent PNGs.
- V2 normal enemies: 96x96 transparent PNGs.
- V2 bosses: 192x192 transparent PNGs.
- V2 battle backgrounds: 2752x1536 opaque JPEGs, rendered full-canvas at 16:9.

## Current Runtime Presentation Notes

- Greenhaven/town service markers render as one clean horizontal row of five image-only icons. Do not add always-visible text labels such as Items/Arms/Magic/Clinic back onto those markers.
- The town south exit uses the gate art only; there is no floating "Exit" label or persistent bottom-right interaction hint in normal town exploration.
- Overworld locations render as larger 3x3-ish landmarks with matching entry footprints. Keep terrain tiles small/repeating, but landmarks should remain visually important.
- Active overworld slicing starts from exact 8x8 atlas math from `atlasV3.manifest.json`, then applies the shared source inset: `sx = tile.source.x + 3`, `sy = tile.source.y + 3`, `sw = tile.source.width - 6`, `sh = tile.source.height - 6`. Do not reintroduce classic special tiles, old 10x10 assumptions, chroma-keying, global black transparency, or debug-grid art for runtime terrain.
- The `atlas_v3` `road_vertical` source cell is visually dirty because its art has a small side connector. Straight north-south generated roads should use rotated `road_horizontal` art until a clean vertical source tile replaces it.
- The `atlas_v3` `road_dead_end_e` source cell is the accepted clean dead-end cap. Use it for all generated one-connector road visuals and rotate it rather than using other dead-end-looking cells.
- Active dungeon/city slicing starts from exact 8x8 atlas math from `dungeonAtlas.manifest.json`, then applies the shared source inset: `sx = tile.source.x + 3`, `sy = tile.source.y + 3`, `sw = tile.source.width - 6`, `sh = tile.source.height - 6`. Do not run rembg or chroma-key this opaque atlas.
- Dungeons and town interiors should not pick all floor/wall atlas variants evenly. Keep one dominant base tile per theme and use sparse accents. Small dungeon maps should be centered, and unused dungeon filler should render as void unless adjacent to carved rooms/corridors.
- Generated overworld terrain should avoid using fixed-orientation coast/foam cells as random stamps. Keep the single bright `beach_sand` tile as the hard land/water buffer and simple shallow water unless a future task implements direction-aware coast tile selection.
- Roads, beaches/coasts, shallow water, forests/jungle, and volcanic support now have real atlas cells. Generated fallback art still remains for missing textures and for lightweight non-atlas overlays such as sea route dots and optional ocean details.
- Generated POIs carry optional `objectId` values, ocean object overlays are seed-derived from reef/detail positions, and palm/normal tree groves use `world_objects` overlays instead of palm-looking terrain tiles. `drawLocationIcon` and `drawWorldOverlays` prefer `world_objects` for those objects, then fall back to older marker textures or generated Graphics.
- Do not implement runtime map-level seam blending for `atlas_v3`. Runtime and debug previews should crop valid source cells inward and must not mutate cached map pixels by mixing water/grass or other neighboring terrain colors after placement.
- Battle backgrounds are full 16:9 opaque JPEG images and are assigned linear texture filtering. Pixel sprites, tiles, UI, and icons remain nearest-neighbor filtered. The canvas itself uses `image-rendering: auto` so high-resolution artwork is not globally pixelated.
- Battle party presentation uses the normalized fighter/priest/wizard class sheets only on the battlefield; redundant small head portraits/icons and old standalone party battle PNGs are intentionally not drawn there.

## Real-Asset Rules

- Use `assets_v2` only for clean, game-ready outputs, not raw collages.
- Do not wire assets with labels, beige sheet backgrounds, adjacent fragments, huge padding, or cut-off neighbors.
- Keep service labels and UI text live unless an image is purely decorative/title art.
- Keep battle backgrounds opaque.
- Keep terrain tiles rectangular and opaque; do not run rembg on terrain.
- For `atlas_v3`, all current cells are classified terrain. Do not chroma-key the atlas or treat black as transparency if a future source sheet reintroduces black margins.
- For `dungeon_atlas`, all current cells are classified opaque dungeon/city tiles. Do not use rembg, global transparency removal, or object-layer assumptions on this sheet.
- For `world_objects`, do not use global magenta removal on the whole sheet. The current importer removes only the connected edge matte with ImageMagick flood-fill so interior purple object pixels survive. Rembg can be compared for ordinary single-object cutouts, but this sheet should stay deterministic unless a future transparent PNG source replaces it.
- Do not rerun rembg or chroma-key the fighter/priest/wizard source sheets; their existing alpha channel is the source of truth.
- Prefer nearest-neighbor scaling for tiles, icons, sprites, and enemies.
- Review `assets_v2/previews/*.png` and `assets_v2/previews/QUALITY_REPORT.md` before expanding runtime mappings.

## Archipelago Replacement Prompt References

These older prompts remain as reference if future art needs another replacement pass. The current runtime already has an atlas-backed archipelago terrain sheet and a separate pier atlas. Keep outputs opaque rectangular PNGs, no labels, no UI text, no copyrighted references, top-down JRPG perspective, and compatible with the current 32px display tile grid.

Road/path prompt:

```text
Create an original top-down 16-bit fantasy JRPG road and footpath terrain tileset. Opaque PNG, clean 4x4 grid, 128x128 pixels per cell, no text, no labels, no characters, no buildings. Tiles must be seamless and readable when downsampled to 32x32. Include dirt road straight north-south, straight east-west, four corners, four T-junctions, crossroads, two dead ends, trampled grass path variant, and small pebble/grass edge variants. Palette should fit lush green islands, warm sand beaches, dark volcanic ground, and existing compact pixel-art terrain. Use crisp pixel-art shapes, restrained outlines, and natural irregular edges.
```

Beach/coast prompt:

```text
Create an original top-down 16-bit fantasy JRPG island beach and coastline terrain tileset. Opaque PNG, clean 6x4 grid, 128x128 pixels per cell, no text, no labels, no people, no buildings. Tiles must be seamless and readable when downsampled to 32x32. Include grass-to-sand transitions, sand-only beach variations, sand-to-shallow-water edges for north/south/east/west, inner and outer beach corners, small coves, shell/stone details, and a few darker wet-sand edge variants. Coastlines should look irregular and natural, not square, with soft foam hints and compact readable shapes.
```

Dock/bridge prompt:

```text
Create an original top-down 16-bit fantasy JRPG wooden dock and small bridge terrain tileset. Opaque PNG, clean 4x4 grid, 128x128 pixels per cell, no text, no labels, no characters, no ships. Tiles must be seamless and readable when downsampled to 32x32. Include horizontal dock, vertical dock, dock end caps, T-shaped pier, corner pier, short wooden bridge north-south, short wooden bridge east-west, bridge ends connecting to sand/grass, rope posts, and subtle plank variations. Style should match a compact fantasy island overworld, with warm wood, simple shadows, and no modern elements.
```

Shallow water/reef/shipwreck prompt:

```text
Create an original top-down 16-bit fantasy JRPG ocean detail terrain tileset for an island archipelago. Opaque PNG, clean 6x4 grid, 128x128 pixels per cell, no text, no labels, no characters. Tiles must be seamless and readable when downsampled to 32x32. Include shallow turquoise water variations, foam rings near coast, coral reef patches, jagged dark sea rocks, small wave sparkle details, floating driftwood, and two small shipwreck fragments that fit in one tile each. Keep the palette compatible with deep blue ocean, sandy beaches, and lush green islands. Details should be decorative and readable without cluttering the map.
```

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
