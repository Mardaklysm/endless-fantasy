# Backlog

This backlog is practical project memory, not a full design document. Keep it short and update it when meaningful work is completed or discovered.

## Art Pipeline Next Steps

- Keep Batch 001 assets under root `assets/`; do not nest a second `assets/` folder inside it.
- Consider splitting asset key maps out of `src/main.ts` if future batches add many more files.
- Add a focused 9-slice/tiled UI panel pass for `ui_window_panel` without reducing menu/battle text space.
- Add item/equipment/relic icons to inventory, shops, equipment menus, and HUD when there is a clean layout slot.
- Add vehicle rendering for boat/skyship on the overworld after deciding whether they replace or accompany Arlen.
- Add simple effect rendering only after battle timing can show short animations without slowing commands.
- Replace the generated Dawnford/town interior pass with real town/interior assets after an approved batch exists.
- Replace the procedural overworld terrain/markers with a future verified real asset batch only if it clearly beats the current readability/presentation.
- Replace generated battle party battlers with approved original party stance sprites when available.

## Asset Manifest Follow-Up

- Mark Batch 001 progress in `ASSET_MANIFEST.md` if the manifest checklist becomes active project tracking.
- Verify future batches match filename, size, and transparency guidance before wiring.
- Add the section K town/interior assets from `ASSET_MANIFEST.md`: floor, wall, exit gate, service counters/signs, table, crate, barrel, lamp, and rug.
- `chest_open.png` is wired for opened chest state; keep testing it during dungeon pass-throughs.
- `tile_water_b` and `tile_deep_water_b` are loaded but not animated yet.
- `tile_bridge` is loaded but no bridge/route terrain overlay is implemented yet.
- Batch 001 world tile and marker PNGs are loaded but currently bypassed because the procedural overworld pass reads better.

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
- Battle backdrop is a single generated forest/plains scene; future regions should get original backdrops after the current layout stabilizes.
- Town service blocks now use generated counters/signs and readable live labels; dedicated service art is still needed.
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
- Create the GitHub repository `git@github.com:Mardaklysm/endless-fantasy.git`, add it as `origin`, and push `main`.
