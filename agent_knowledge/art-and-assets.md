# Art And Assets

## Current Art Approach

The game now has two asset roots:

- `assets/`: Batch 001 and verified fallback assets.
- `assets_v2/`: improved SNES-style assets extracted from `D:\Projects\new_artwork`.

Phaser preloads stable texture keys from `src/main.ts`. The loader prefers `assets_v2` for mapped keys and falls back to `assets/` when a v2 file is missing. Do not delete generated `Graphics` fallback rendering; missing or rejected assets must still leave the game playable.

`assets_v2/source_sheets/` stores provenance copies of source sheets used by the importer. `assets_v2/previews/` stores contact sheets and quality reports. Runtime glob loading intentionally excludes `assets_v2/source_sheets/`, `assets_v2/previews/`, and the reference-only UI window crops with baked sample text.

## V2 Import Pipeline

Reusable scripts live in `tools/art_import/`:

- `scan_new_artwork.ps1`: inventories `D:\Projects\new_artwork`.
- `extract_new_art_assets.ps1`: reads JSON crop maps and extracts final PNGs to `assets_v2`.
- `apply_rembg_candidates.ps1`: compares color-key and rembg outputs, promoting only approved rembg results. Its comparison outputs are disposable and ignored.
- `generate_asset_previews.ps1`: creates contact sheets and `assets_v2/previews/QUALITY_REPORT.md`.
- `import_character_sprites.mjs`: imports `D:\Tools\rembg\bg_output\fighter.png`, `priest.png`, and `wizard.png` without running rembg, splits them as 5x2 alpha PNG sheets, normalizes fixed cells/anchors, writes `src/data/characterSprites.ts`, and creates debug previews/reports in `docs/debug/sprite-import/`.
- `import_dungeon_atlas.mjs`: imports `D:\Projects\new_artwork\dungeon_atlas.jpeg`, resizes it to the 1024x1024 opaque runtime PNG at `src/assets/world/dungeon_atlas.png`, writes all 64 dungeon/city cells to `src/assets/world/dungeonAtlas.manifest.json`, and creates `docs/debug/dungeon-atlas/dungeon-atlas-import-report.md`.
- `tools/terrain-material-extractor/extract_terrain_materials.py`: standalone Pillow tool for `D:\atlas` terrain-material candidate atlases. It builds an approved-subset external pack under `D:\atlas\output`, exporting only approved individual 256x256 PNG fills to `approved_materials/`, plus approved metadata, rejected/missing reports, debug crops, and a zip. It intentionally does not force a complete 8x8 runtime atlas; any dense atlas it emits is a preview only.
- `tools/world_assets/import_selected_world_assets.py`: disabled legacy terrain-fill importer for the approved external pack from `D:\atlas\output\approved_materials`. It must not be used to recreate generic overlay/POI/route placeholder icons or overwrite the current approved object set.
- `tools/world-object-curator/curate_world_objects.py`: standalone Pillow tool for `D:\new_items` plus additive raw sources in `D:\Tools\rembg\bg_input`. It preserves existing approvals, tries black/white/sampled-edge background cleanup for raw candidates, exports only approved transparent object PNGs under `D:\new_items\output\approved_objects`, writes metadata/rejected/background-method reports and previews, and can integrate approved objects into `src/assets/world/current/objects/` with `--integrate`.
- `tools/world-object-curator/curate_world_objects_relaxed.py`: additive relaxed recovery pass for `D:\Tools\rembg\bg_input_2`, `D:\Tools\rembg\bg_output_2`, and `D:\Tools\rembg\bg_output`. It writes `D:\new_items\output_relaxed`, separates `game_ready` from `touchup_needed`, and integrates only game-ready additions. Compact villages, towns, city districts, harbor towns, castle towns, forts, monasteries, academies, and similar settlement compositions are valid overworld POI sprites when they look good; do not reject them merely for being miniature settlements.
- `tools/world_assets/import_premium_world_objects.py`: premium approved-object importer for `D:\Tools\rembg\bg_output`. It slices technically valid premium atlas sheets, copies individual transparent PNGs into `src/assets/world/current/objects_premium/`, updates `world_asset_manifest.json`, and wires premium-first role mappings. It is not a strict rejection/curation pass; preserve pixels/alpha and keep `src/assets/world/current/objects/` as backup.
- `tools/world_assets/import_world_clouds.py`: overworld cloud importer for `D:\Tools\rembg\bg_output_2`. It imports the current happy grassland cloud PNGs as reusable `cloud_base_*` masks into `src/assets/world/current/clouds/`, writes `cloud_manifest.json`, and defines runtime theme tint/alpha/speed settings for island-specific mood without requiring separate cloud images.

Independent art preview tools:

- `tools/worldgen-lab/worldgenLab.mjs` runs through `npm run worldgen:lab -- --seed <seed> --out <dir>`. It is a standalone PNG/report renderer for the active semantic overworld core under `src/world/semantic/`; pngjs/filesystem preview code stays out of Phaser runtime.

Manual crop maps live in `tools/art_import/crop_maps/`. Active overworld base terrain uses selected individual PNG fills from `src/assets/world/current/terrain/`; old overworld atlas-cell lookup is deprecated and removed from normal runtime.

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

- Overworld terrain support: generated worlds use `src/assets/world/current/world_asset_manifest.json` and selected individual PNG fills under `src/assets/world/current/terrain/` for semantic mask texture sources. Normal gameplay uses `src/world/semantic/semanticMaskTerrainRenderer.ts` to render deep water, shallow water, freshwater rivers/lakes, packed-dirt roads, beach, grass, sand, and ice/snow as crisp semantic masks filled with approved materials. Mountain cells do not use a normal-runtime terrain/massif fill; they render with object sprites. `src/data/worldTiles.ts` is now semantic compatibility metadata only; it keeps tile IDs, walkability, movement cost, encounter family, and tags without atlas source rectangles.
- Route diagnostics: `src/world/semantic/semanticRouteRenderer.ts` is debug-only. Normal gameplay roads render through the terrain mask from `world_current_terrain_packed_dirt_surface`, not transparent procedural route strokes.
- River diagnostics: F6 river graph strokes are diagnostics only. Normal gameplay rivers/lakes render through the terrain mask from `world_current_terrain_freshwater`; do not reintroduce full-square freshwater stamps, blue tube strokes, curves, gradients, rounded-cap river bodies, or connected river overlay textures.
- Harbor docks and bridges: generated harbor dock/bridge markers and road-river bridge candidates map to existing current object PNGs where a clean approved object exists; roads and rivers underneath remain semantic terrain masks.
- World object overlays: generated dungeons, harbors, landmarks, ocean details, forests, mountain ranges, resources, and props use manifest mappings in `src/data/worldCurrentAssets.ts`. Premium transparent object PNGs live under `src/assets/world/current/objects_premium/` and are resolved first; curated transparent backup objects live under `src/assets/world/current/objects/`. The old generic overlay/POI/route icon folders were intentionally removed and should not be restored for runtime. Current POI sprites render with manifest scale/anchor metadata so settlements, harbors, castles, and towers sit inside blocked 2x2/3x3 footprints as actual landmarks instead of generic centered squares. Forests render one normal unscaled tree sprite per semantic forest cell, and mountain ranges render one normal unscaled visual-only mountain sprite per semantic mountain mask cell. Do not use gray terrain rectangles, debug-like transparent squares, sparse scaled ridge anchors, or deleted old atlases for normal runtime mountains/forests.
- Cloud overlay: overworld mode and world-backed menus/dialogues use `src/world/cloudOverlay.ts` plus `src/data/worldCloudAssets.ts` to render slow, semi-transparent screen-space clouds in the top band above world visuals and below UI. Current source art is five reusable base cloud masks from `src/assets/world/current/clouds/`; jungle, snow, desert, swamp, volcanic, and deadland flavor comes from runtime tint/alpha/speed settings without affecting generation or collision.
- Dungeon/city tiles: procedural dungeons and town/city interiors render from `src/assets/world/dungeon_atlas.png` through `src/assets/world/dungeonAtlas.manifest.json` and `src/data/dungeonTiles.ts`. Runtime crops cells inward with `DUNGEON_ATLAS_SOURCE_INSET = 3`. The atlas is opaque and covers medieval stone, cave, ice, ruin, volcanic, cursed, chest, gate, stair, switch, portal, and boss-seal cells. Town floors/walls, dungeon floors/walls, and shop pads use this sheet with weighted base/accent selection, while service/shop signs remain separate image assets.
- Location markers: town, castle, cave, keep, shrine, tower, port, gate, eclipse spire.
- Town/interior: stone floor/walls, exit gate, service signs, table/rug, crate, barrel, lamps.
- Characters: Arlen/Mira/Kael portraits; fighter/priest/wizard normalized class sheets drive Arlen/Mira/Kael battle sprites, and the fighter sheet drives the visible exploration leader.
- Common enemies: first twelve enemy IDs use cleaned roster crops.
- Bosses: all five boss IDs use cleaned boss roster crops.
- Battle backgrounds: forest path, plains, moss cave, ashen keep, tide shrine, eclipse spire.
- UI: compact window panel skin, cursor, HP/MP/empty bars, buttons. Runtime text remains live Phaser text.
- Title: `assets/title/title_screen.png` is the active full-screen title background. It is rendered contain-fit into the 16:9 layout with a black backing so any aspect mismatch letterboxes instead of cropping or stretching. The title menu remains live text.

Fallback assets:

- Later-region normal enemies not present in the new common roster: reef fang, bubble eye, drowned husk, sky mite, gale harpy, glass roc, eclipse shade, crown guard, void serpent.
- Vehicles, inventory/equipment/relic icons, and effects still use Batch 001 or generated fallbacks.
- `command_window.png`, `target_window.png`, `party_status_window.png`, and `message_window.png` are reference/source-only because they include sample text or baked layout.

Removed experimental world assets and old overworld atlas tools should not be restored. The active overworld asset set is `src/assets/world/current/` plus `world_asset_manifest.json`, all driven by semantic world data.

## Current Sizes

- Canvas/backing render target: 1920x1080 by default.
- Layout grid: 960x540-equivalent coordinates derived from the Full HD design size with `PIXEL_ART_SCALE = 2`.
- Display tile grid: 32x32 layout pixels, rendered as 64x64 canvas pixels at the default Full HD target.
- Active current overworld materials: 37 approved 256x256 PNG terrain fills in `src/assets/world/current/terrain/`, selected from `D:\atlas\output\approved_materials`.
- Active premium overworld objects: approved transparent PNG object sprites in `src/assets/world/current/objects_premium/`, imported from `D:\Tools\rembg\bg_output`. Most are preserved 512x512 atlas cells. Runtime mappings prefer this folder before any backup object mapping.
- Active backup overworld objects: approved 256x256 transparent PNG object sprites in `src/assets/world/current/objects/`, selected from the strict `D:\new_items` pass and additive relaxed recovery under `D:\new_items\output_relaxed`. The relaxed pass adds game-ready settlement/city/harbor/castle POIs while keeping touchup-needed sprites outside runtime.
- Active overworld clouds: 5 transparent high-resolution `cloud_base_*` PNG masks in `src/assets/world/current/clouds/`, imported from `D:\Tools\rembg\bg_output_2`, with tint metadata in `cloud_manifest.json`. They render at reduced scale and around 50% alpha, drifting slowly across only the upper screen band.
- Active current overworld placeholders: no manifest placeholder image records are currently required, but generated fallback drawing remains available for missing textures/roles. Do not restore deleted generic placeholder PNGs for runtime.
- Active dungeon atlas: source `D:\Projects\new_artwork\dungeon_atlas.jpeg`, runtime `src/assets/world/dungeon_atlas.png`, 1024x1024 opaque PNG, 8 columns x 8 rows, 128x128 logical cells, 64 dungeon/city cells.
- World Generator Lab default preview model: 192x120 semantic cells rendered at 6px per cell to disposable PNGs under `tmp/worldgen-lab/`.
- V2 town tiles: 32x32 opaque PNGs.
- Class character sheets: 5 columns x 2 rows, 704x512 cells, 3520x1024 sheet size, transparent PNG. Manifest anchor is bodyCenterX=352 and feetBaselineY=464.
- V2 portraits: 32x40 transparent PNGs.
- V2 normal enemies: 96x96 transparent PNGs.
- V2 bosses: 192x192 transparent PNGs.
- V2 battle backgrounds: 2752x1536 opaque JPEGs, rendered full-canvas at 16:9.
- Active title screen: `assets/title/title_screen.png`, 1672x941 PNG, rendered full-screen with aspect-preserving contain fit.

## Current Runtime Presentation Notes

- Greenhaven/town service markers render as one clean horizontal row of five image-only icons. Do not add always-visible text labels such as Items/Arms/Magic/Clinic back onto those markers.
- The town south exit uses the gate art only; there is no floating "Exit" label or persistent bottom-right interaction hint in normal town exploration.
- Overworld locations render as larger 2x2+ landmarks with matching blocked body footprints and adjacent activation/approach cells. Keep terrain tiles small/repeating, but landmarks should remain visually important.
- Active overworld material rendering starts from `world_asset_manifest.json` texture keys. Water, beach/sand, freshwater, and snow/ice currently use restored atlas v3 cell extracts under `src/assets/world/current/terrain_v1/` after the newer material fills looked worse in-game; the newer `src/assets/world/current/terrain/` pack remains available as v2. There is no old 8x8 overworld atlas slicing path in normal runtime, and F6 `rawTiles` uses manifest-selected individual material PNGs for debug fallback.
- Active overworld object rendering also starts from `world_asset_manifest.json` texture keys. Premium object sprites are individual transparent PNGs under `current/objects_premium/` and win over curated backup objects under `current/objects/`; dense atlas previews remain debug-only and must not become runtime sources of truth.
- Active overworld cloud rendering starts from `current/clouds/cloud_manifest.json`. The overlay is visual-only, remains active through world-backed dialogs/menus, and may be toggled with F7 for debugging; cloud texture selection and tint transitions must not consume gameplay RNG or alter semantic world generation.
- Active dungeon/city slicing starts from exact 8x8 atlas math from `dungeonAtlas.manifest.json`, then applies the shared source inset: `sx = tile.source.x + 3`, `sy = tile.source.y + 3`, `sw = tile.source.width - 6`, `sh = tile.source.height - 6`. Do not run rembg or chroma-key this opaque atlas.
- The title screen uses `title_screen` as the full-screen image, with black letterboxing if the source ratio does not exactly match the 16:9 canvas. Its title menu is `Continue` first and `New Game` second, with no title subtitle or controls/help line.
- Dungeons and town interiors should not pick all floor/wall atlas variants evenly. Keep one dominant base tile per theme and use sparse accents. Small dungeon maps should be centered, and unused dungeon filler should render as void unless adjacent to carved rooms/corridors.
- Generated overworld terrain should avoid using fixed-orientation coast/foam cells as random stamps. Normal gameplay uses semantic mask rendering with selected individual material PNGs and code-rendered pixel boundary accents for shallow water, beach, coast foam/tint, and grass/sand/ice boundaries. Do not return to square atlas tiles plus tiny edge strips as the normal terrain solution, random variant spam, direction-specific transition tile stamping, or global smoothing.
- External terrain material packs from `D:\atlas\output` are source-of-truth individual PNG fills only after visual approval. Missing semantic material ideas are acceptable; roads, rivers, riverbanks, and coastlines are semantic mask-renderer concerns, while forests, mountain ridges, towns, rocks, and landmarks remain overlay concerns. Do not bake those features into generic base materials.
- For overworld POI/object packs, compact settlement compositions are desired assets, not terrain mistakes. Villages, towns, city blocks, harbor districts, forts, castles, religious compounds, academies, and market clusters may include internal roads, plazas, rooftops, walls, docks, and small bases when those details form one coherent POI icon. Apply the “no miniature map chunks” rule to terrain materials, not to settlement POI sprites.
- The active overworld direction starts from semantic masks/fields: archipelago land masks, shallow-water halos, beach bands, grass/sand/ice biomes, elevation/ridges, packed-dirt road masks, freshwater river/lake masks, forest/mountain range object overlays, and POI placement. Do not return to designing a huge transition tileset as the core architecture.
- Roads, rivers, beaches/coasts, shallow water, forests/jungle, mountains, and POIs are semantic renderer/overlay concerns. The selected terrain fills are material sources, not precomposed map chunks. Generated fallback art still remains for missing textures and for lightweight non-atlas overlays such as sea route dots and optional ocean details.
- Generated POIs carry optional `objectId` values, ocean object overlays are seed-derived from reef/detail positions, and palm/normal tree groves use current manifest overlay mappings. `drawLocationIcon` and `drawWorldOverlays` prefer current-folder sprites, then fall back to marker textures or generated Graphics. Runtime POI apron/footprint tint squares are disabled; POI footprint coloring belongs in F6/lab debug output only.
- Do not implement runtime map-level seam blending for stamped overworld atlas tile placements; that path is retired. Normal gameplay should come from semantic masks using selected individual PNG materials, not from stamped square atlas tiles.
- F6 road and river graph strokes/dots are semantic debug information, not finished map art. Keep debug nodes, source/mouth markers, rejected routes, and pathfinding diagnostics out of normal gameplay. Normal gameplay should show road and river bodies through semantic terrain masks.
- `world_current_object_premium_island_fortress` should not be placed as a normal land, settlement, fortification, city, or harbor POI variant. It can return only through an explicit ocean/deep-sea placement role.
- Flowers, clover, rocks, dune ripples, scrub, dark grass patches, and other terrain-detail variants should become sparse decoration overlays or controlled larger patches later. They should not be random base tile replacements every few cells in normal gameplay.
- Battle backgrounds are full 16:9 opaque JPEG images and are assigned linear texture filtering. Pixel sprites, tiles, UI, and icons remain nearest-neighbor filtered. The canvas itself uses `image-rendering: auto` so high-resolution artwork is not globally pixelated.
- Battle party presentation uses the normalized fighter/priest/wizard class sheets only on the battlefield; redundant small head portraits/icons and standalone party battle PNGs are intentionally not drawn there.

## Real-Asset Rules

- Use `assets_v2` only for clean, game-ready outputs, not raw collages.
- Do not wire assets with labels, beige sheet backgrounds, adjacent fragments, huge padding, or cut-off neighbors.
- Keep service labels and UI text live unless an image is purely decorative/title art.
- Keep battle backgrounds opaque.
- Keep terrain tiles rectangular and opaque; do not run rembg on terrain.
- For `dungeon_atlas`, all current cells are classified opaque dungeon/city tiles. Do not use rembg, global transparency removal, or object-layer assumptions on this sheet.
- For overworld current materials, use approved individual PNG files and manifest metadata. Do not use JPEG for production terrain fills, do not bake roads/rivers/coasts/mountains/forests/POIs into base fills, and do not add atlas-cell lookups back to runtime.
- Do not rerun rembg or chroma-key the fighter/priest/wizard source sheets; their existing alpha channel is the source of truth.
- Prefer nearest-neighbor scaling for tiles, icons, sprites, and enemies.
- Review `assets_v2/previews/*.png` and `assets_v2/previews/QUALITY_REPORT.md` before expanding runtime mappings.

## Archipelago Replacement Prompt References

These prompts remain as reference if future art needs another replacement pass. The current runtime uses approved individual material PNGs plus explicit overlay/POI/route sprites; do not generate a giant runtime transition atlas. Keep outputs opaque rectangular PNGs for base fills and transparent PNGs for overlay sprites, no labels, no UI text, no copyrighted references, top-down JRPG perspective, and compatible with the current 32px display tile grid.

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
