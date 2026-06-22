# Backlog

This backlog is practical project memory, not a full design document. Keep it short and update it when meaningful work is completed or discovered.

## Art Pipeline Next Steps

- Keep Batch 001 assets under root `assets/`; do not nest a second `assets/` folder inside it.
- Consider splitting the v2 asset import scripts into shared helpers if more batches arrive.
- Improve UI panel skinning further only if it preserves current live text space and readability. Exploration HUD and battle panels now have compact layouts, but the v2 panel art still has strong decorative lines that may deserve a future dedicated HUD frame.
- Add item/equipment/relic icons to inventory, shops, equipment menus, and HUD when there is a clean layout slot.
- Add vehicle rendering for boat/skyship on the overworld after deciding whether they replace or accompany Arlen.
- Add simple effect rendering only after battle timing can show short animations without slowing commands.
- Add v2-quality art for later-region normal enemies not covered by the first twelve common roster crops.
- Archipelago generation now uses selected current terrain fills plus premium-first current-folder object sprites for many generated settlements, cities, dungeons, landmarks, harbors, resources, forests, mountains, props, and harbor docks. Road-river crossings render as dirt-road traversal points rather than visible bridge-object stamps. `src/assets/world/current/objects_premium/` is primary, while `src/assets/world/current/objects/` remains backup. Sea route dots remain lightweight generated overlays.
- Overworld terrain selection now uses dominant base tiles with lower-frequency patches and avoids random fixed-direction coast stamps. Future coastline polish should add direction-aware transition placement or new neutral coast tiles, not map-level pixel blending.
- Semantic overworld generation is now active in runtime through `src/world/semantic/`, with `tools/worldgen-lab/` sharing that core for preview PNGs/reports. Future polish should improve Phaser rendering and assets from the semantic layers rather than returning to giant coastline-transition tilesets.
- Runtime overworld terrain now uses a crisp semantic mask-rendered background with selected individual material PNGs as texture sources for deep water, shallow water, beach, grass, sand, and ice/snow. Future polish should tune the mask boundary styling or add minimal brush-style overlay assets, not return to square tile terrain plus tiny edge strips, random variant spam, full-map blur, or hundreds of coastline transition tiles.
- Road semantic paths render in normal gameplay through the semantic terrain mask as narrow packed-dirt strips; inspect graph nodes/source/mouth diagnostics through F6 debug modes. River bodies render from one-tile semantic centerlines through the current freshwater material as narrow connected paths, not full-square atlas stamps or dilated blobs. Unbridged rivers block walking, while road-river crossing candidates remain walkable and visually read as dirt-road crossings. Future river polish should add dedicated directional river edge masks or better material fills, not blue stroke/tube rendering.
- Overworld cloud flavor is now wired through `src/assets/world/current/clouds/cloud_manifest.json` with five reusable `cloud_base_*` masks from `D:\Tools\rembg\bg_output_2` and runtime theme tinting. Add true jungle, snow, desert, swamp, volcanic, or deadland cloud/mist/ash pools later only if tinting is not enough.
- Semantic overworld collision and overlay rules now separate visual-only, soft-terrain, hard-block, and POI body policies. Forests are passable soft terrain for now and render one normal tree sprite per semantic forest cell after tiny fragments are cleaned out. POI bodies are blocked 2x2/3x3 footprints with walkable edge approaches. Unbridged rivers and connected mountain masks are hard blockers, and road-river crossing candidates remain walkable. Mountain ranges use theme-aware seed caps/snow rules, clean up tiny fragments to zero singletons, and render one normal unscaled visual-only mountain sprite on every semantic mountain mask cell. Future polish should tune encounter effects for soft terrain rather than making forests collision walls again.
- Consider dynamic loading/code splitting for large JPEG battle backgrounds and large normalized class sheets if bundle size becomes painful.

## Asset Manifest Follow-Up

- Mark Batch 001 progress in `ASSET_MANIFEST.md` if the manifest checklist becomes active project tracking.
- Verify future batches match filename, size, and transparency guidance before wiring.
- `chest_open.png` is wired for opened chest state; keep testing it during dungeon pass-throughs.
- `tile_water_b` and `tile_deep_water_b` are loaded but not animated yet.
- Harbor dock visuals are current-manifest objects. Road-river crossing candidates are semantic records for walkability only; avoid reintroducing visible bridge spam unless a future approved bridge pass clearly improves on road crossings.
- Reference-only UI window crops in `assets_v2/ui` are intentionally not loaded at runtime because they contain sample text.
- Normalized fighter/priest/wizard class sheets are wired; keep standalone party map/battle PNGs out of runtime glob loading unless intentionally reintroduced.
- Dungeon/city tiles are wired through the active `src/assets/world/dungeon_atlas.png` sheet; individual dungeon PNGs remain fallback only.
- Dungeon/city atlas rendering now uses weighted base/accent selection; future dungeon polish should focus on room dressing and clearer wall/floor transition art rather than adding more evenly random tile variants.
- Before replacing any remaining generated fallback visuals, iterate in `npm run worldgen:lab` and define final fill/brush/object assets from `worldgen_asset_requirements.md`. Premium assets from `D:\Tools\rembg\bg_output` are imported by `tools/world_assets/import_premium_world_objects.py`; do not promote rejected or needs-manual-cleanup object candidates from older curation outputs into runtime.
- Review and regenerate missing entries from `D:\atlas\output\terrain_materials_v2_missing_materials.md` before considering the external terrain material pack complete. Do not promote rejected/debug crops into runtime assets; only approved `approved_materials/*.png` should be candidates for future renderer experiments.
- If replacing `terrain_v1` water/sand/snow later, compare in-game screenshots against the restored atlas v3 look first; the newer current material fills were kept as v2 but are not the active choice for those semantic terrain classes.
- Review `D:\new_items\output\world_objects_v2_missing_or_weak_categories.md` and `D:\new_items\output_relaxed\world_objects_v2_touchup_needed_metadata.json` before the next object pass; remaining useful targets include shipwreck fragments, vertical stone bridge stamps, true snowy pine clusters, a dedicated Starfall Gate object, and manual cleanup of caption-damaged shrine/ruin/signpost candidates. Harbor-town and settlement variants are now much stronger after the relaxed pass.

## Gameplay Gaps

- Save schema has no version/migration strategy.
- The scene refactor preserves the existing scene-owned state model with prototype-bound domain modules. Future cleanup can replace the broad `CrystalOathSceneContext & Record<string, any>` helper type with narrower typed contexts when behavior is otherwise stable.
- Balance needs a full manual playthrough pass.
- Archipelago travel economy and early dungeon rewards need a manual tuning pass after several real playthroughs.
- Coralreach/Frostmere/Highspire progression is implemented through the semantic world profile, but final relic ordering, route unlock pacing, and island encounter balance need end-to-end verification.
- Game over/load path should be tested with real defeat state.
- Boss progression should be manually verified end-to-end after any dungeon or flag change.
- Mouse menu support is minimal.
- Fast text setting exists but should be verified for actual text-speed behavior before claiming more.

## Polish Gaps

- Effect PNG sheets are loaded but not rendered yet.
- No animated water/torch/chest sparkle polish yet.
- Sea route dots still use simple overlay graphics; shallow water, docks, generated POI markers, and ocean details now have atlas-backed art. Runtime POI apron tint squares were removed; future plaza/clearing polish needs real terrain/detail art rather than translucent debug-like rectangles.
- Battle enemies use PNGs now; future larger boss art still needs overlap checks when progression reaches each boss.
- Battle actions now have short lunge/step movement; future effect-sheet rendering can layer spell/item VFX on top of the timing path.
- Battle backdrops now use v2 region panels; later tuning can reduce bundle weight with dynamic loading/code splitting.
- Town service blocks now use v2 icon signs in one unlabeled five-marker row, with atlas-backed shop pads from `dungeon_atlas`.
- Title screen now uses full-screen image art. Future title polish should preserve live menu text, aspect-preserving letterboxing, and the simplified `Continue` / `New Game` title menu.
- Audio is simple oscillator loops; no composed music assets are planned unless approved.

## Testing Gaps

- No automated unit tests.
- No browser E2E tests.
- No automated save/load regression.
- No automated visual overlap/screenshot comparison.
- No automated balance simulation.

## Documentation Follow-Up

- Update gameplay docs when mechanics, data tables, progression flags, or balancing change.
- Update art docs when the real asset pipeline starts.
- Keep committing and pushing completed changes to `origin/main`.
