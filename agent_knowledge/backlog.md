# Backlog

This backlog is practical project memory, not a full design document. Keep it short and update it when meaningful work is completed or discovered.

## Art Pipeline Next Steps

- Keep Batch 001 assets under root `assets/`; do not nest a second `assets/` folder inside it.
- Consider splitting asset key maps out of `src/main.ts` if future batches add many more files.
- Consider splitting the v2 asset import scripts into shared helpers if more batches arrive.
- Improve UI panel skinning further only if it preserves current live text space and readability. Exploration HUD and battle panels now have compact layouts, but the v2 panel art still has strong decorative lines that may deserve a future dedicated HUD frame.
- Add item/equipment/relic icons to inventory, shops, equipment menus, and HUD when there is a clean layout slot.
- Add vehicle rendering for boat/skyship on the overworld after deciding whether they replace or accompany Arlen.
- Add simple effect rendering only after battle timing can show short animations without slowing commands.
- Add v2-quality art for later-region normal enemies not covered by the first twelve common roster crops.
- Archipelago generation now uses selected current terrain fills plus approved current-folder object sprites for many generated settlements, cities, dungeons, landmarks, harbors, resources, forests, mountains, props, docks, and horizontal bridge stamps. Explicit placeholders remain for weak/missing roles such as shipwreck debris, vertical stone bridges, true snowy pine clusters, and a dedicated Starfall Gate sprite. Sea route dots remain lightweight generated overlays.
- Overworld terrain selection now uses dominant base tiles with lower-frequency patches and avoids random fixed-direction coast stamps. Future coastline polish should add direction-aware transition placement or new neutral coast tiles, not map-level pixel blending.
- Semantic overworld generation is now active in runtime through `src/world/semantic/`, with `tools/worldgen-lab/` sharing that core for preview PNGs/reports. Future polish should improve Phaser rendering and assets from the semantic layers rather than returning to giant coastline-transition tilesets.
- Runtime overworld terrain now uses a crisp semantic mask-rendered background with selected individual material PNGs as texture sources for deep water, shallow water, beach, grass, sand, and ice/snow. Future polish should tune the mask boundary styling or add minimal brush-style overlay assets, not return to square tile terrain plus tiny edge strips, random variant spam, full-map blur, or hundreds of coastline transition tiles.
- Road and river semantic paths now render in normal gameplay through styled procedural stroke overlays; inspect graph nodes/source/mouth diagnostics through F6 debug modes. Future route polish should tune the stroke brush, add small bridge stamps, or smooth path curves rather than creating giant road/river atlases.
- Semantic overworld collision and overlay rules now separate visual-only, soft-terrain, hard-block, and POI interaction policies. Forests are passable soft terrain for now, while mountain ranges are hard blockers and use theme-aware caps/snow rules. Future polish should tune encounter effects for soft terrain rather than making forests collision walls again.
- Consider dynamic loading/code splitting for large JPEG battle backgrounds and large normalized class sheets if bundle size becomes painful.

## Asset Manifest Follow-Up

- Mark Batch 001 progress in `ASSET_MANIFEST.md` if the manifest checklist becomes active project tracking.
- Verify future batches match filename, size, and transparency guidance before wiring.
- `chest_open.png` is wired for opened chest state; keep testing it during dungeon pass-throughs.
- `tile_water_b` and `tile_deep_water_b` are loaded but not animated yet.
- `tile_bridge` exists in `assets_v2`, but current harbor route/dock visuals use explicit placeholder sprites in `src/assets/world/current/routes/`. Road-river bridge candidates are semantic records for now; add approved overlay bridge stamps later if the styled road-over-river treatment is not enough.
- Reference-only UI window crops in `assets_v2/ui` are intentionally not loaded at runtime because they contain sample text.
- Normalized fighter/priest/wizard class sheets are wired; keep standalone party map/battle PNGs out of runtime glob loading unless intentionally reintroduced.
- Dungeon/city tiles are wired through the active `src/assets/world/dungeon_atlas.png` sheet; individual dungeon PNGs remain fallback only.
- Dungeon/city atlas rendering now uses weighted base/accent selection; future dungeon polish should focus on room dressing and clearer wall/floor transition art rather than adding more evenly random tile variants.
- Before replacing the remaining current overworld placeholders, iterate in `npm run worldgen:lab` and define final fill/brush/object assets from `worldgen_asset_requirements.md`. Do not promote rejected or needs-manual-cleanup object candidates into runtime.
- Review and regenerate missing entries from `D:\atlas\output\terrain_materials_v2_missing_materials.md` before considering the external terrain material pack complete. Do not promote rejected/debug crops into runtime assets; only approved `approved_materials/*.png` should be candidates for future renderer experiments.
- Review `D:\new_items\output\world_objects_v2_missing_or_weak_categories.md` and `D:\new_items\output_relaxed\world_objects_v2_touchup_needed_metadata.json` before the next object pass; remaining useful targets include shipwreck fragments, vertical stone bridge stamps, true snowy pine clusters, a dedicated Starfall Gate object, and manual cleanup of caption-damaged shrine/ruin/signpost candidates. Harbor-town and settlement variants are now much stronger after the relaxed pass.

## Gameplay Gaps

- Save schema has no version/migration strategy.
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
- Sea route dots still use simple overlay graphics; shallow water, docks, generated POI markers, and ocean details now have atlas-backed art.
- Battle enemies use PNGs now; future larger boss art still needs overlap checks when progression reaches each boss.
- Battle actions now have short lunge/step movement; future effect-sheet rendering can layer spell/item VFX on top of the timing path.
- Battle backdrops now use v2 region panels; later tuning can reduce bundle weight with dynamic loading/code splitting.
- Town service blocks now use v2 icon signs in one unlabeled five-marker row, with atlas-backed shop pads from `dungeon_atlas`.
- Title logo and four-star decoration render; title background remains generated.
- Audio is simple oscillator loops; no composed music assets are planned unless approved.

## Testing Gaps

- No automated unit tests.
- No browser E2E tests.
- No automated save/load regression.
- No automated visual overlap/screenshot comparison.
- No automated balance simulation.

## Documentation Follow-Up

- Update architecture docs if `src/main.ts` is split into modules.
- Update gameplay docs when mechanics, data tables, progression flags, or balancing change.
- Update art docs when the real asset pipeline starts.
- Keep committing and pushing completed changes to `origin/main`.
