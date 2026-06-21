# Known Decisions And Rules

## Durable Project Decisions

- The project is a browser game built with Phaser 3, TypeScript, and Vite.
- The current main implementation lives in `src/main.ts`.
- Every completed code, docs, or asset change must be committed and pushed to the configured remote before the task is considered done.
- The default Phaser backing canvas is 1920x1080. The scene keeps 960x540-equivalent layout coordinates derived from `DESIGN_WIDTH / PIXEL_ART_SCALE` and renders them at 2x into the Full HD canvas.
- Canvas CSS uses `image-rendering: auto`; pixel-art crispness comes from nearest-neighbor texture filtering on sprites/tiles/UI plus integer render scaling, while battle backgrounds use linear filtering.
- The tile grid is 32x32 display pixels.
- The first playable game is intentionally compact, roughly 30-60 minutes when tuned.
- Asset Batch 001 lives under root `assets/` and is loaded by Phaser from `src/main.ts`.
- Improved extracted art lives under root `assets_v2/` and is preferred over `assets/` for mapped texture keys.
- Fighter/priest/wizard class sprite sheets are imported from `D:\Tools\rembg\bg_output` by copying the alpha PNG sources into `assets_v2/source_sheets/class_sprites/`, normalizing to 5x2 transparent sheets in `assets_v2/characters/classes/`, and writing frame/anchor metadata to `src/data/characterSprites.ts`.
- The active overworld art set is `src/assets/world/current/` plus `src/assets/world/current/world_asset_manifest.json`. It contains 37 approved individual 256x256 terrain fills imported from `D:\atlas\output\approved_materials`, premium approved object sprites in `src/assets/world/current/objects_premium/` imported from `D:\Tools\rembg\bg_output`, the original strict approved backup object sprites from `D:\new_items\output\approved_objects`, and additive relaxed backup game-ready object sprites from `D:\new_items\output_relaxed\game_ready_objects`. Runtime object resolution is premium-first, backup-second, generated-fallback-last. User-deleted generic overlay/POI/route placeholder PNGs should stay deleted. Old overworld terrain/object/dock atlases are not runtime sources.
- The active overworld cloud layer is visual-only and manifest-driven from `src/assets/world/current/clouds/cloud_manifest.json`. The current five `cloud_base_*` masks imported from `D:\Tools\rembg\bg_output_2` are reused for every island, with runtime theme tint/alpha/speed transitions. Future biome cloud pools may override the base masks only when they contain assets. Clouds must not affect collision, world generation, or gameplay RNG.
- The standalone `D:\atlas` terrain material extraction workflow uses `tools/terrain-material-extractor/extract_terrain_materials.py` and exports only approved individual 256x256 PNG material fills under `D:\atlas\output\approved_materials`. It must not force all 64 semantic slots into production. Rejected or missing slots belong in reports/debug crops until regenerated.
- The standalone `D:\atlas` approved material pack is promoted into runtime only with care; the legacy `tools/world_assets/import_selected_world_assets.py` terrain-fill importer is disabled and must not recreate generic overlay/POI/route placeholders or overwrite the current approved object set. Missing semantic material ideas or rejected cells are not failures and should stay out of runtime until approved.
- The standalone overworld object pack is curated through `tools/world-object-curator/curate_world_objects.py --integrate`. It scans `D:\new_items` and additively scans raw candidates in `D:\Tools\rembg\bg_input`, preserves existing approvals, compares cleanup methods for raw candidates, exports only `qualityFlag: "approved"` transparent PNGs, and integrates them into `src/assets/world/current/objects/`. Needs-manual-cleanup or rejected objects must not be copied into runtime.
- Additional overworld object recovery uses `tools/world-object-curator/curate_world_objects_relaxed.py --integrate`. It scans `D:\Tools\rembg\bg_input_2`, `D:\Tools\rembg\bg_output_2`, and `D:\Tools\rembg\bg_output`, separates `game_ready` from `touchup_needed`, integrates only game-ready objects, and leaves touchup candidates external for manual cleanup.
- The active dungeon/city tile layer uses `src/assets/world/dungeon_atlas.png` and `src/assets/world/dungeonAtlas.manifest.json`. The source is `D:\Projects\new_artwork\dungeon_atlas.jpeg`, imported to an opaque PNG by `tools/art_import/import_dungeon_atlas.mjs`.
- World Generator Lab is a standalone PNG/report utility under `tools/worldgen-lab/` for previewing the semantic overworld direction. It now imports the runtime-safe generator core from `src/world/semantic/`, while pngjs/filesystem preview rendering remains outside Phaser.
- The active overworld direction uses semantic masks/fields first and visual rendering second: archipelago land masks, distance-driven shallow water/beaches, grass/sand/ice biome fields, separate elevation/ridge fields, and overlay objects/graphs for mountains, forests, rivers, roads, settlements, and POIs. The semantic model is the only core world architecture.
- Normal Phaser overworld terrain is mask-rendered by `src/world/semantic/semanticMaskTerrainRenderer.ts`. It renders deep ocean, shallow water, freshwater rivers/lakes, packed-dirt roads, beach, grass, sand, and ice/snow from semantic masks, using current selected PNG materials as repeating texture sources and small pixel-step boundary accents. The semantic grid remains the source of truth for movement, collision, encounters, harbors, roads, POIs, and island metadata. Forests, mountain ranges, POIs, bridges/docks, player, clouds, and UI remain separate layers above the mask background.
- `SEMANTIC_BASE_TILE_PALETTE` maps normal base terrain to `deep_water`, `shallow_water`, `beach_sand`, `medium_grass`, `bright_sand`, and `clean_snow`, with `TERRAIN_VARIANT_MODE = "off"`. Terrain variant art should return as sparse overlays or controlled patches later, not random per-cell base replacement.
- Do not reintroduce overworld atlas-cell lookup, runtime map-level seam blending for stamped atlas tiles, direction-specific transition tile stamping, or random terrain-variant spam. The accepted direction is semantic mask rendering with selected individual material PNGs and crisp code-drawn mask boundaries. Rendered PNG packages are views of semantic data, not gameplay truth.
- New overworlds are seeded and generated by `src/world/semantic/semanticGenerator.ts` through the `src/world/worldGenerator.ts` compatibility facade in `semantic_campaign_archipelago_world` mode. New Game creates a fresh seed; Save/Load persists and rebuilds from `worldSeed`.
- Raw water, lava, volcanoes, and blocked mountain tiles are not walkable. Generated overworld edges should remain deep-water ocean, and land should not touch the outer border. Do not reintroduce boat/skyship terrain overrides for raw water; harbor travel teleports between generated harbor positions.
- The active overworld is an ocean archipelago with four profile-controlled major islands: Greenhaven, Coralreach, Frostmere, and Highspire, plus seeded minor islands. The generator tracks semantic island metadata, tile maps, towns, harbors, dungeons, landmarks, mountain ranges, roads, rivers, shallow-water terrain, sea routes, reefs/details, dock/bridge markers, and road-river bridge candidates.
- Roads and rivers are semantic graph/mask data, and normal rendering consumes those masks inside `semanticMaskTerrainRenderer.ts`. `semanticRouteRenderer.ts` is debug-only for graph diagnostics. Do not reintroduce smooth route strokes, blue river tubes, bezier river bodies, gradients, rounded caps, full-square freshwater stamps, connected river overlay textures, or separate normal road/river canvas overlays as gameplay rendering.
- Approved terrain material fills support road and river rendering through `world_current_terrain_packed_dirt_surface` and `world_current_terrain_freshwater`. Future improvements should add better mask accents or semantic shaping rather than returning to square atlas stamping or procedural road/river tubes.
- Overlay collision policy is explicit: `visualOnly` and `softTerrain` overlays are walkable, `hardBlock` overlays block movement, and `poiBlock` marks interaction/building cells for the current POI system. Normal tree/forest overlays are `softTerrain` and passable for now. Mountains and snow mountains are `hardBlock`. Unbridged inland river cells are `hardBlock`; road-river bridge candidates remain walkable.
- Mountain placement is semantic-mask-first, ridge/elevation-derived, and massif-based. The generator uses high ridge/elevation candidates for preliminary POI guidance, then reselects final connected mountain masks after POIs, rivers, and roads are known so mountain cells stay away from towns, ports, roads, lakes, rivers, and important POI footprints. `mountainCap` is a soft per-island massif cell budget used by generation planning; smoothing may slightly exceed it when preserving organic connected landforms. Cleanup removes components below island minimum size and must leave zero singleton mountain components. Runtime visuals draw one dense deterministic mountain overlay per accepted semantic mountain cell and choose one mountain asset for the whole massif, so a range does not mix rock piles, cliff sprites, and mountain ridge sprites. Collision remains on the accepted semantic mask cells. Greenhaven/Coralreach get restrained normal massifs and no snow mountains; Frostmere supports large snow mountain fields on ice/snow; Highspire has the strongest mountain identity, with large ridge/massif regions. Minor islands should avoid mountain spam and never get snow mountains unless a future explicit ice minor theme is added.
- `world_current_object_premium_island_fortress` is not a normal land, fortification, settlement, city, or harbor POI variant. If it is reused, reserve it for an explicit ocean/deep-sea placement role.
- Roads, beaches/coasts, shallow water, freshwater, forests/jungle, mountains, volcanic accents, docks/bridges, and POIs are semantic renderer concerns. Current overlay/POI/route roles should map to approved current object sprites when available or to procedural renderer fallbacks; do not restore the deleted generic placeholder icon set. Road-river crossings are semantic bridge candidates and render visible bridge/crossing stamps above terrain-mask roads/rivers.
- Clouds are also an overlay concern: keep them above world visuals and below UI, subtle around 50% opacity, and active only in overworld mode.
- Approved object overlays may replace forest, mountain, POI, resource, prop, and dock placeholders when the object clearly matches a semantic role. POI and object drawing should honor current manifest scale/anchor metadata for approved sprites. Cool approved but unmapped objects stay in the manifest as available only; do not randomly stamp them onto the map without a semantic generation role.
- Compact villages, towns, city districts, harbor towns, castle towns, forts, fortresses, monasteries, academies, guild halls, and similar miniature settlement compositions are valid and desired overworld POI sprites when visually strong. Do not reject them merely because they contain multiple buildings, tiny roads/plazas, walls, docks, courtyards, or compact ground/water bases; that exclusion rule applies to terrain material fills, not settlement POI objects.
- Generated non-volcanic overworld land should use `medium_grass` as the dominant base tile with lower-frequency clustered patches. Do not return to per-tile random grass selection.
- Do not randomly stamp fixed-orientation coast, wet beach, or foam tiles (`wet_beach_sand`, `grass_sand_coast`, `sand_water_edge`, `sand_water_corner`, `cove_coast`, `foamy_shallow_water`) in world generation unless direction-aware placement is implemented. Use the single bright `beach_sand` tile and simple shallow water for now.
- World generation must preserve a beach/sand buffer between land and water. Normal grass, forest, roads, town bases, temple bases, tent bases, and other generated location terrain must not directly touch water; harbors/docks/bridges and explicit water features are the coastline exceptions.
- Normal overworld POIs are overlays on existing valid terrain, not terrain painters. Do not reintroduce rectangular POI footprint stamping under chests, tents, towns, dungeons, temples, signs, resources, merchants, or ruins.
- Generated roads should connect to approach tiles outside POI footprints, not carve through landmark/town/dungeon centers. Keep road records synchronized with actual semantic road paths after any start-position or footprint cleanup. The old strict cardinal N/E/S/W road tile visual masks remain useful only for raw/debug/fallback contexts; normal gameplay uses the semantic terrain mask road class.
- Raw/debug/fallback road tile IDs are semantic compatibility only. Normal gameplay route endings are handled by the semantic terrain mask and bridge overlays.
- Palm groves and normal tree groves should be clustered/zone-based and spatially separated, not tile-by-tile checkerboards. Use current manifest overlay mappings and replace placeholders with approved sprites when available.
- Adjacent normal woodland terrain tiles should not mix `light_forest` and `dense_forest` inside the same connected patch. Choose woodland terrain style per connected patch/zone instead of per tile.
- Overworld POI footprints are interaction/collision affordances, not visual size. Keep object overlays scaled inside their footprint so landmarks are readable without covering too many terrain tiles.
- Dungeon and town atlas floors/walls should use weighted base/accent selection. Small dungeon maps should be centered in the viewport, dungeon `#` filler should render as void unless it borders carved playable space, and dungeon entry/stair travel should spawn from generated `E`/`S` markers instead of fixed coordinates.
- Current art rendering is image-first with generated fallback behavior.
- The active overworld uses the `semantic_campaign_archipelago_world` generator plus separate POI/landmark/harbor marker rendering. It does not use removed landmark/object overlay experiments, extracted tile pools, or generated 10x10 tile IDs.
- Greenhaven/town interiors use cleaned v2 floor, wall, exit, service sign, and prop PNGs. Service markers are icon-only in a five-marker row; do not add always-visible labels back onto the markers.
- Battle presentation uses v2 opaque 16:9 JPEG backdrops, v2 enemies/bosses, normalized fighter/priest/wizard party battlers, and lower target/command/status panels. Redundant small party head portraits and standalone party battle PNGs are intentionally not drawn on the battlefield.
- Title presentation uses `assets/title/title_screen.png` as a full-screen image, drawn with aspect-preserving contain fit over a black background. Keep the title menu as live text ordered `Continue`, then `New Game`, and do not reintroduce title-screen control/help subtitles.
- The local rembg environment for this project is `D:\tools\rembg\venv_rembg\Scripts\rembg.exe` with `birefnet-general`; available ONNX Runtime providers were `DmlExecutionProvider` and `CPUExecutionProvider`. Do not add NVIDIA/CUDA assumptions.
- Audio is generated in code.
- Save data uses browser `localStorage` under `crystal-oath-save-v1`.
- Keyboard is the primary input; mouse support is minimal.
- Input helpers accept both `KeyboardEvent.code` and `KeyboardEvent.key` for movement/confirm/cancel compatibility.
- Exploration movement is tile-center based: accepted input moves from one tile center to the next, and releasing input finishes the active step before stopping.
- Exploration collision uses the destination tile center, not the full sprite rectangle. Tile effects commit only when the destination tile center is reached.
- Exploration rendering uses persistent visual tile coordinates during the active step. Do not let render code fall back to stale logical coordinates mid-move.
- Nested menu flows must preserve the original non-menu return mode; settings/status/item/equipment backs should not overwrite it with `menu` or `dialogue`.
- Overworld locations use larger 3x3-ish visual and trigger footprints so landmarks read as important instead of one-tile icons.
- Battle uses individual initiative turns. The game does not use all-party action queue rounds. Enemy intent is planned/displayed before enemies act, and the player command list includes Skill alongside Attack, Magic, Item, Defend, and Run.
- Battle sides should face each other: party battlers face left from the right side, and enemy battlers on the left face right toward the party.
- Fallen party members still receive victory XP and level-up stat gains, but level-up must not revive them or raise HP above 0.

## Legal Originality Rules

- Do not copy Final Fantasy names, sprites, logos, music, spell visuals, maps, story text, enemy designs, UI art, or exact mechanics tables.
- Do not add copyrighted assets.
- Do not use external asset packs unless explicitly approved and legally safe.
- Genre inspiration from classic turn-based top-down JRPGs is allowed.
- Character/place/enemy/spell/item names should remain original to Asterra/Crystal Oath.

## Style And Readability Rules

- Prefer clean readable retro pixel art.
- Use strong silhouettes and limited palettes.
- Terrain separation matters more than texture detail.
- UI text readability matters more than decoration.
- Use readable live text for service labels and gameplay instructions; do not bake critical labels into tiny sprites.
- The current UI font strategy favors a clean monospace stack over noisy small pixel text.
- Avoid hyper-detailed art that fights the 32px grid.
- Keep the palette pleasant and not dominated by one hue.

## Generated Fallback Rule

Do not remove generated placeholder art/audio until equivalent real assets are loaded, shown, and verified. Asset integration should be image-first and fallback-safe.

The current generated art fallback is still required for missing textures and for systems not yet fully converted, including generated UI panels and future effect gaps.

## Scope Rules

- Keep scope compact.
- Prefer fewer reusable assets over many tiny variants.
- Prefer small incremental changes over rewrites.
- Do not expand gameplay when the task is documentation/art planning.
- Do not add dependencies without a clear need and user approval.
- Do not reintroduce instant visual tile snapping or all-party queued battle rounds.
- Do not re-enable weak first-pass world terrain/marker PNGs as the primary overworld renderer. Keep the v2 pass or a future visually verified replacement.
- Do not run terrain tiles, opaque battle backgrounds, source sheets, or full collages through rembg.
- For current overworld materials, use approved individual PNGs and manifest metadata. Do not use JPEG for production terrain fills, and do not bake roads/rivers/coasts/mountains/forests/POIs into base materials. Rembg remains okay for ordinary single-object cutouts when needed.
- For the `dungeon_atlas` sheet, do not use rembg, chroma-keying, or transparency removal. It is an opaque terrain/interior atlas and runtime handles source-grid seams with `DUNGEON_ATLAS_SOURCE_INSET = 3`.

## Current Content Rules

- Party has exactly three current playable characters: Arlen, Mira, Kael.
- Current level cap is 12.
- Current core progression is Greenhaven/Mossy Cave -> Coralreach/Coralreach Ruins -> Frostmere/Skyglass and Highspire/Stonefall -> Starfall Gate -> Eclipse Spire. Coralreach boss unlocks Frostmere and Highspire routes with the Chartered Compass.
- Towns and dungeons listed in `project-overview.md` are the current content structure.
- XP multiplier and encounter toggle are intentional quality-of-life settings.

## Validation Rules

- Run `npm run build` after code/config changes.
- For visual/gameplay changes, also smoke-test in browser.
- Docs-only changes can be validated by reading/checking files, but running build is acceptable when confirming the game remains untouched.

## Unknowns / Needs Verification

- Automated coverage currently includes the world-generation simulation test (`npm test`) plus build validation. There are still no unit tests or browser E2E tests.
- Saves are normalized for newly added travel/discovery/skill fields, but there is still no explicit versioned save schema.
- The first asset loader is implemented in `src/main.ts`; future work may split it into modules if the file grows further.
- Balance has not had a full documented playthrough pass.
