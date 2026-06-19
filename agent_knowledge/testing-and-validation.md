# Testing And Validation

Validation is currently a combination of TypeScript/build checks, a world-generation simulation test, and manual browser smoke testing.

## Build Check

Run from `D:\Projects\Endless Fantasy`:

```powershell
npm run build
```

This runs `tsc && vite build`.

Known warning: Vite may warn that the Phaser bundle chunk is large. That is expected unless the bundling strategy changes.

## World Generation Test

Run from `D:\Projects\Endless Fantasy`:

```powershell
npm test
```

This runs `tools/worldgen/test_worldgen.mjs`. It validates the active `atlas_v3` terrain path, generates deterministic worlds, and asserts:

- runtime atlas `src/assets/world/atlas_v3.png` exists and is a 1024x1024 PNG
- active runtime metadata points to `atlas_v3`
- the atlas is an 8x8 grid with 128x128 square source cells
- the manifest has 29 non-empty tiles and 35 mostly-black empty cells
- empty atlas cells are not tile IDs and are not present in worldgen pools
- every non-empty source rectangle uses exact 8x8 grid math and stays inside bounds
- `ATLAS_V3_SOURCE_INSET` remains within each 128x128 source cell and is easy to test with values 1 through 4
- inset source rectangle calculation is covered with an explicit inset-2 sample and with the active runtime inset
- runtime cache rendering, fallback visible-tile drawing, and debug previews all use the same shared inset source-rect helper
- runtime source no longer imports or calls the removed map-level seam repair module
- runtime source files do not actively reference the failed classic tileset, `classicIsland`, old 10x10 atlas, or classic object renderer
- start tile is walkable grass
- required POIs are reachable and not on blocked/water terrain
- water tiles are not walkable
- blocked mountain, volcano, and lava tiles are not walkable
- generated worlds contain no roads, rivers, bridges, or empty-cell references
- same seed reproduces the same world
- different seeds produce different tile grids

To write a human-readable generation report and PNG minimap preview:

```powershell
npm run debug:worldgen -- optional-seed
```

Outputs:

- `docs/debug/worldgen/latest-worldgen-report.md`
- `docs/debug/worldgen/atlas-v3-source-inset-report.md`
- `docs/debug/worldgen/atlas-v3-source-inset-preview.png`
- `docs/debug/worldgen/atlas-v3-world-preview.png`
- `docs/debug/worldgen/world-preview-seed-<seed>.png`

The source-inset report should confirm the runtime cache, fallback draw path, and debug preview all use `ATLAS_V3_SOURCE_INSET`, and that map-level terrain blending/neighbor-pixel mutation is disabled.

## Asset Import Validation

After changing `tools/art_import/`, crop maps, or files under `assets_v2/`, regenerate previews:

```powershell
powershell -ExecutionPolicy Bypass -File tools\art_import\generate_asset_previews.ps1
```

Check:

- `assets_v2/previews/world_tiles_preview.png` has no source-sheet border/grid pixels.
- `assets_v2/previews/markers_preview.png` has transparent markers without adjacent fragments.
- `assets_v2/previews/town_props_preview.png` has clean service signs/props.
- `assets_v2/previews/characters_preview.png`, `portraits_preview.png`, `enemies_preview.png`, and `bosses_preview.png` have transparent backgrounds and no cut-off neighboring sprites.
- `assets_v2/previews/battle_backgrounds_preview.png`, if regenerated, should show the opaque 16:9 JPEG battle backgrounds without cropping artifacts.
- `assets_v2/previews/QUALITY_REPORT.md` documents rembg/color-key choices.

For fighter/priest/wizard class sheets, run:

```powershell
node tools\art_import\import_character_sprites.mjs
```

Check `assets_v2/characters/classes/*_normalized.png`, `src/data/characterSprites.ts`, and `docs/debug/sprite-import/*.debug.png` / `*.import-report.md`. The normalized runtime sheets should be transparent 5x2 sheets with identical 704x512 cells; debug previews are the only files with labels, grid boxes, anchor crosses, and baseline lines.

For the active `atlas_v3` overworld atlas, run after changing `D:\Projects\new_artwork\atlas_v3.jpeg` or the importer/classification rules:

```powershell
npm run import:atlas-v3
```

Check `src/assets/world/atlas_v3.png`, `src/assets/world/atlasV3.manifest.json`, `docs/debug/world-atlas-v3/atlas-v3-labeled.png`, and `docs/debug/world-atlas-v3/atlas-v3-import-report.md`. Black/near-black cells are unused slots only; do not chroma-key black or classify empty slots as gameplay tiles.

For the legacy 10x10 overworld atlas, run only if intentionally regenerating that archived asset:

```powershell
node tools\art_import\import_world_atlas.mjs
```

Check `src/assets/world/world_atlas.normalized.png` and `docs/debug/world-atlas/world_atlas.labeled-preview.png` / `world_atlas.import-report.md`. This should not replace the active `atlas_v3` runtime path without a deliberate follow-up task.

For the archived classic world tileset pack, run only if intentionally inspecting archived assets:

```powershell
node tools\art_import\import_classic_world_tileset.mjs
node tools\art_import\test_classic_world_tileset.mjs
```

Check `src/assets/world/tilesets/classic_world_tileset.cleaned.png`, `src/assets/world/tilesets/classicWorldTileset.manifest.json`, `src/assets/world/tilesets/classic/extracted/`, and `docs/debug/world-tileset-import/`. The cleaned PNG should remove only exact `#00B100` matte pixels; the debug contact sheets and group-detection image are review outputs only and are not runtime assets. This classic pack is not active gameplay terrain.

For rembg-related regeneration, use `D:\tools\rembg\venv_rembg\Scripts\rembg.exe` with `birefnet-general`. The expected AMD/Windows provider path is DirectML (`DmlExecutionProvider`). Do not add NVIDIA-specific checks.

## Browser Startup Test

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Expected:

- Page title is `Crystal Oath: Dawn of the Four Stars`.
- One canvas appears with a 1920x1080 backing size, fitted to the browser viewport at 16:9.
- Title screen is visible.
- Browser console has no errors.

## New Game Test

- Select New Game.
- Intro dialogue appears in Dawnford.
- Advance dialogue with Enter/Z.
- Player ends in Dawnford town interior.
- Dawnford should show v2 stone floors/walls, service signs, lamps, table/rug, crates/barrels, and exit gate.

## Load/Save Test

- Start a game.
- Open menu with Escape.
- Save where allowed.
- Reload page or return to title.
- Load Game restores progress.
- Test inn save and tent save when relevant.

## Movement And Map Entry Test

- Move with arrow keys/WASD.
- Press one direction and confirm the player visibly walks one tile rather than teleporting.
- Hold a direction and confirm the player continues smoothly tile-by-tile.
- Release the held direction and confirm the player stops cleanly after the current tile step.
- Hold Shift while moving and confirm movement is faster but still interpolated tile movement.
- Confirm there is no snap-forward-then-reset-back behavior during or after a step.
- Confirm the camera follows the interpolated visual position without a visible reset.
- Exit Dawnford through the south gate.
- Confirm pressing south while already standing on Dawnford's south gate exits to the overworld.
- Walk on world terrain.
- Enter a town/location by stepping onto it.
- Confirm town/dungeon/location entry occurs after the tile step completes, not mid-step.
- Confirm random encounters trigger only after completed steps, not mid-step.
- Verify blocked terrain rules when testing boat/skyship flags.
- Confirm collision does not jitter or leave the player visually/logically between tiles.
- Confirm the overworld leader remains readable when standing on a town/location marker.
- Confirm `atlas_v3` terrain shows no unused black cells; dark seams can come from actual atlas cell edge pixels and should not be debug grid overlays.
- Confirm water blocks movement, and current worlds do not generate roads, rivers, beaches, or bridges.
- Confirm new games produce different world seeds and load restores the same saved world.

## Battle Test

- Trigger a random encounter by walking or use F9 debug encounter.
- Confirm the battle UI shows one current actor at a time.
- Confirm the battle view uses enemies on the left, party battlers on the right, lower-left target/log panel, lower-middle command panel, and lower-right party status panel.
- Confirm only the current party member gets a command menu.
- Choose Attack, select an enemy, and verify damage resolves immediately before the next actor acts.
- Confirm enemies act on their own initiative turns without waiting for all party commands.
- Confirm initiative order varies slightly between encounters/cycles while faster actors tend to act earlier.
- Confirm dead enemies are skipped and do not act.
- Verify enemies can damage party on their own turns.
- Confirm command text, HP bars, target highlight, and next-turn preview do not overlap panel borders.
- Confirm the third enemy slot stays above the lower battle panels.
- Verify victory returns to exploration.
- Verify game over appears if party falls; needs manual setup/debug.

## Item And Magic Test

- Use Potion in battle and field.
- Use Antidote on poison if available.
- Use Phoenix Ash on fallen character if available.
- Cast Mend/Ward/Spark/Ember early.
- Verify spell charges decrement and inns restore them.

## Level-Up And Reward Test

- Win encounters.
- Confirm XP/gold reward log.
- Confirm level-up happens when XP threshold is reached.
- Confirm stats/HP update.

## Shop / Inn / Clinic Test

- In a town, interact with item shop, arms shop, magic shop, inn, and clinic.
- Buy at least one item if gold allows.
- Rest at inn and confirm HP/spell charges restore and save occurs.
- Clinic revive requires a fallen party member; needs manual setup/debug.

## Boss / Progression Test

- Enter a dungeon.
- Confirm random encounters occur.
- Open chest.
- Activate switch.
- Pass gate.
- Use stairs.
- Fight boss.
- Confirm boss victory sets relic/story flag and autosaves.
- Confirm progression unlocks later route.

This is longer than a quick smoke test; run when changing dungeon/progression/boss/save behavior.

## No Console Error Check

Use the in-app browser or normal browser devtools after startup and after a battle/menu transition. There should be no uncaught errors.

## Manual Regression Checklist

- Title screen renders.
- New Game starts.
- Menu opens/closes.
- Settings toggle works.
- Random/debug battle starts.
- Battle commands resolve.
- Victory reward works.
- Save/load works.
- Town services work.
- Dungeon object flow works.
- Final/ending flow needs verification after progression changes.

## Known Testing Gaps

- No unit tests.
- No Playwright/browser E2E tests.
- No save-file migration tests.
- No automated balance simulation.
- No automated visual overlap checks for future asset imports.
