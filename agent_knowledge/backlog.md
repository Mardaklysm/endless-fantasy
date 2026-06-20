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
- Archipelago generation now uses real atlas-v3 road, beach/coast, shallow-water, forest, and volcanic support tiles, pier-atlas dock overlays, and the transparent world-objects atlas for generated dungeons, landmarks, harbors, reefs, wrecks, barrels, whirlpools, and clustered palm/normal tree overlays. Sea route dots remain lightweight generated overlays.
- Overworld terrain selection now uses dominant base tiles with lower-frequency patches and avoids random fixed-direction coast stamps. Future coastline polish should add direction-aware transition placement or new neutral coast tiles, not map-level pixel blending.
- Semantic overworld generation is now active in runtime through `src/world/semantic/`, with `tools/worldgen-lab/` sharing that core for preview PNGs/reports. Future polish should improve Phaser rendering and assets from the semantic layers rather than returning to giant coastline-transition tilesets.
- Semantic overworld collision and overlay rules now separate visual-only, soft-terrain, hard-block, and POI interaction policies. Forests are passable soft terrain for now, while mountains are hard blockers and use theme-aware caps/snow rules. Future polish should tune encounter effects for soft terrain rather than making forests collision walls again.
- Consider dynamic loading/code splitting for large JPEG battle backgrounds and large normalized class sheets if bundle size becomes painful.

## Asset Manifest Follow-Up

- Mark Batch 001 progress in `ASSET_MANIFEST.md` if the manifest checklist becomes active project tracking.
- Verify future batches match filename, size, and transparency guidance before wiring.
- `chest_open.png` is wired for opened chest state; keep testing it during dungeon pass-throughs.
- `tile_water_b` and `tile_deep_water_b` are loaded but not animated yet.
- `tile_bridge` exists in `assets_v2`, but current harbor route/dock visuals use the active `src/assets/world/pier_atlas.png` sheet with generated Graphics fallback.
- Reference-only UI window crops in `assets_v2/ui` are intentionally not loaded at runtime because they contain sample text.
- Normalized fighter/priest/wizard class sheets are wired; keep old standalone party map/battle PNGs out of runtime glob loading unless intentionally reintroduced.
- Dungeon/city tiles are wired through the active `src/assets/world/dungeon_atlas.png` sheet; older individual dungeon PNGs remain fallback only.
- Dungeon/city atlas rendering now uses weighted base/accent selection; future dungeon polish should focus on room dressing and clearer wall/floor transition art rather than adding more evenly random tile variants.
- Keep the archived classic tileset pack out of active runtime unless a future task explicitly reopens that direction. Active terrain should continue to use only non-empty `atlas_v3` cells.
- Before replacing or refactoring runtime island/world rendering with generated Greenhaven kernel art, vet candidate kernels with `npm run island:kernel`; the lab is only a preview tool until a separate integration task is approved.
- Before replacing the active atlas-v3 archipelago generator, iterate in `npm run worldgen:lab` and define final fill/brush/object assets from `worldgen_asset_requirements.md`.

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
