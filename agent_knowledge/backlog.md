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
- Route, river, bridge, and reachability generation is implemented for the preserved generic 10x10 overworld. The classic island generator now handles its own shore rings, paths, clustered forests/mountains, and small POI set separately.
- Consider dynamic loading/code splitting for large JPEG battle backgrounds and large normalized class sheets if bundle size becomes painful.

## Asset Manifest Follow-Up

- Mark Batch 001 progress in `ASSET_MANIFEST.md` if the manifest checklist becomes active project tracking.
- Verify future batches match filename, size, and transparency guidance before wiring.
- `chest_open.png` is wired for opened chest state; keep testing it during dungeon pass-throughs.
- `tile_water_b` and `tile_deep_water_b` are loaded but not animated yet.
- `tile_bridge` exists in `assets_v2` but no bridge/route terrain overlay is implemented yet.
- Reference-only UI window crops in `assets_v2/ui` are intentionally not loaded at runtime because they contain sample text.
- Normalized fighter/priest/wizard class sheets are wired; keep old standalone party map/battle PNGs out of runtime glob loading unless intentionally reintroduced.
- Continue semantic cleanup of the `classic_world_tileset` manifest/catalog over time: rename low-confidence generated entries where useful, add more curated transition/object variants deliberately, and avoid loading the whole extracted pack blindly into worldgen.
- Improve classic island shoreline/autotile selection over time. The current region 7+10-only catalog keeps the map coherent, but better dedicated coast connectors would reduce repeated cliff/shore artifacts.

## Gameplay Gaps

- Save schema has no version/migration strategy.
- Balance needs a full manual playthrough pass.
- Game over/load path should be tested with real defeat state.
- Boss progression should be manually verified end-to-end after any dungeon or flag change.
- Mouse menu support is minimal.
- Fast text setting exists but should be verified for actual text-speed behavior before claiming more.

## Polish Gaps

- Effect PNG sheets are loaded but not rendered yet.
- No animated water/torch/chest sparkle polish yet.
- Battle enemies use PNGs now; future larger boss art still needs overlap checks when progression reaches each boss.
- Battle actions now have short lunge/step movement; future effect-sheet rendering can layer spell/item VFX on top of the timing path.
- Battle backdrops now use v2 region panels; later tuning can reduce bundle weight with dynamic loading/code splitting.
- Town service blocks now use v2 icon signs in one unlabeled five-marker row.
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
