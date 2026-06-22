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

This runs `tools/worldgen/test_worldgen.mjs`. It validates the active semantic runtime world generator and lightweight asset prerequisites:

- active world, object, and dungeon atlases exist at the expected 1024x1024 PNG sizes
- required runtime terrain/object IDs exist for water, beach, grass, sand, snow, mountains, forests, and harbors
- raw deep/shallow water tiles block walking while beach is walkable
- same seed reproduces the same generated semantic world
- different seeds produce different generated worlds
- the campaign profile produces exactly four major islands: Greenhaven, Coralreach, Frostmere, and Highspire
- Greenhaven starter island exists and the start position is walkable, on Greenhaven, and not on top of a POI
- at least one settlement exists on Greenhaven
- each major island has a harbor/travel point adjacent to shallow water
- semantic validation has no errors
- beach cells buffer land from water
- generated POIs never spawn on blocked water; their 2x2/3x3 body footprints are blocked `poiBlock` cells with adjacent walkable approach tiles
- required settlement-to-port/dungeon/gate/final road graph edges connect
- runtime roads, rivers, one visual-only mountain sprite per semantic mountain cell, and one soft-terrain tree sprite per semantic forest cell exist
- overlay collision policies tag semantic mountain mask cells as `hardBlock`, mountain sprites as `visualOnly`, forests as `softTerrain`, and all POI footprint cells as `poiBlock`
- forests remain walkable, while semantic mountain mask cells remain blocked
- mountain ranges exist as connected semantic components, flat mountain mask cells belong to ranges, components meet their island minimum size, singleton mountain components are cleaned to zero, and Greenhaven/Coralreach do not receive snow mountains
- mountain shape validation warns on overly rectangle-filled clusters
- roads are walkable and not overlapped by mountain/forest overlays or POI body footprints
- roads remain mostly one semantic tile wide; validation warns when the road mask develops dense 2x2 blocks
- random bridge decoration is disabled by default; every visible bridge/ford overlay must correspond to a validated road-river crossing cell in `riverCrossingMap`, and normal road masks must not paint over unbridged river water
- the semantic compatibility tile grid uses exactly one canonical tile ID each for deep water, shallow water, beach, grassland, sand/desert, and ice/snow while `TERRAIN_VARIANT_MODE` is off
- the semantic mask terrain renderer plan reports the expected texture dimensions, mask resolution, class samples, boundary samples, and does not mutate the generated world
- the semantic mask terrain renderer uses manifest texture source IDs for deep water, shallow water, freshwater, packed-dirt roads, beach, grassland, sand/desert, and ice/snow; normal runtime mountain visuals come from object sprites
- the semantic route renderer plan reports hidden normal road/river overlays, and debug mode can expose road/river diagnostics

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

For the active current overworld selected terrain fills, do not use the legacy terrain-only importer because it is disabled and does not represent the full current object set:

```powershell
python tools\world_assets\import_selected_world_assets.py
```

If terrain fills need a future refresh, create a new safe import path or update the manifest intentionally, then verify `src/assets/world/current/world_asset_manifest.json` and `src/assets/world/current/terrain/*.png`. Do not restore generic overlay/POI/route placeholder PNGs. Approved terrain fills must remain 256x256 PNGs and must not include baked roads, rivers, coasts, forests, mountains, or POIs.

For the active current overworld object set, run after changing `D:\new_items`, `D:\Tools\rembg\bg_input`, approval decisions, or object role mappings:

```powershell
python tools\world-object-curator\curate_world_objects.py --integrate
```

Check `D:\new_items\output\world_objects_v2_approved_contactsheet.png`, `world_objects_v2_alpha_preview.png`, `world_objects_v2_fit_preview.png`, and `world_objects_v2_background_method_contactsheet.png`. Runtime copies should exist only under `src/assets/world/current/objects/` and every integrated object must be `qualityFlag: "approved"` in `world_asset_manifest.json`.

For the additive relaxed recovery pass, run:

```powershell
python tools\world-object-curator\curate_world_objects_relaxed.py --integrate
```

Check `D:\new_items\output_relaxed\world_objects_v2_game_ready_contactsheet.png`, `world_objects_v2_touchup_needed_contactsheet.png`, `world_objects_v2_alpha_preview.png`, `world_objects_v2_fit_preview.png`, and `world_objects_v2_runtime_mapping.json`. Only `game_ready` objects should be copied into runtime; `touchup_needed` objects must stay external. Compact settlements, cities, harbor towns, forts, castles, monasteries, academies, and similar miniature location compositions are valid POI sprites if readable and clean.

For the active `dungeon_atlas` dungeon/city tile atlas, run after changing `D:\Projects\new_artwork\dungeon_atlas.jpeg` or the classification rules:

```powershell
npm run import:dungeon-atlas
```

Check `src/assets/world/dungeon_atlas.png`, `src/assets/world/dungeonAtlas.manifest.json`, and `docs/debug/dungeon-atlas/dungeon-atlas-import-report.md`. The current importer uses ImageMagick resize only and keeps the sheet opaque. Do not run rembg or transparency removal on this atlas.

For the reset semantic overworld direction, use World Generator Lab:

```powershell
npm run worldgen:lab -- --seed test-greenhaven --out tmp/worldgen-lab/test-greenhaven
```

Check `semantic_map_debug.png`, `distance_bands_debug.png`, `elevation_debug.png`, `mountain_mask_debug.png`, `mountain_collision_debug.png`, `forest_mask_debug.png`, `poi_footprints_debug.png`, `passability_debug.png`, `river_mask_debug.png`, `river_connectivity_debug.png`, `rivers_roads_debug.png`, `rendered_world_preview.png`, `semantic_world.json`, `worldgen_algorithm_report.md`, and `worldgen_asset_requirements.md`. These are disposable outputs under `tmp/worldgen-lab/` and are not runtime assets.

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
- Intro dialogue appears in Greenhaven.
- Advance dialogue with Enter/Z.
- Player ends in Greenhaven town interior.
- Greenhaven should show atlas-backed stone floors/walls and shop pads, plus service signs, lamps, table/rug, crates/barrels, and exit gate.

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
- Exit Greenhaven through the south gate.
- Confirm pressing south while already standing on Greenhaven's south gate exits to the overworld.
- Confirm the overworld is mostly ocean with four major islands plus minor islands, beach/coast edges, shallow-water/route overlays, road and river overlays, harbor markers, landmark markers, and transparent object overlays for dungeons/landmarks/ocean details.
- Walk on world terrain.
- Confirm the player can walk through normal tree/forest overlays for now, but cannot walk through POI building/body footprints.
- Confirm mountains still block movement.
- Enter a town/location by stepping onto it.
- Confirm town/dungeon/location entry occurs after the tile step completes, not mid-step.
- Confirm random encounters trigger only after completed steps, not mid-step.
- Verify blocked terrain rules when testing boat/skyship flags.
- Confirm movement stops with the leader's feet/shadow on each tile center, not at the tile's bottom edge.
- Confirm collision does not jitter or leave the player visually/logically between tiles.
- Confirm the overworld leader remains readable when standing on a town/location marker.
- Confirm current selected terrain fills render for deep water, shallow water, freshwater, packed-dirt roads, beach, grassland, sand, and snow/ice; no old atlas art or magenta backgrounds should appear.
- Confirm water blocks movement while generated roads suppress encounters and harbors enable boat travel.
- Confirm normal overworld terrain is mask-rendered from semantic fields using current selected material PNGs, with crisp coastlines and biome boundaries rather than hard square tile edges or full-map blur.
- Confirm normal gameplay roads and river/lake bodies are semantic terrain masks from the current packed-dirt and freshwater materials. F6 road/river graph strokes, dots, source/mouth markers, and route diagnostics must stay debug-only.
- Use F6 semantic debug overlays to inspect edge debug, raw square tiles, semantic masks, distance bands, walkability, overlay policy, mountain candidates/accepted cells, forest soft-terrain cells, island themes, POI clearance, roads, and rivers. `edgeDebug` draws water/beach edges cyan, sand/grass edges magenta, sand/ice edges white, and grass/ice edges blue.
- At Greenhaven Harbor, confirm Coralreach costs 10 gold, deducts gold, moves the player to Coralreach harbor, and can return by harbor.
- Confirm new games produce different world seeds and load restores the same saved world.

## Battle Test

- Trigger a random encounter by walking or use F9 debug encounter.
- Confirm the battle UI shows one current actor at a time.
- Confirm enemies show intent before the player acts.
- Confirm the battle view uses enemies on the left, party battlers on the right, lower-left target/log panel, lower-middle command panel, and lower-right party status panel.
- Confirm only the current party member gets a command menu.
- Choose Skill and verify skill cooldown labels/actions are available.
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
- Use skills such as Power Strike, First Aid, Fire Spark, and Focus.
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
- Confirm dungeon layout is room-and-corridor procedural and deterministic for a seed.
- Confirm dungeon floors, walls, chests, switches, gates, stairs, exits, and boss seals render from the active `dungeon_atlas`.
- Confirm random encounters occur.
- Open chest.
- Activate switch.
- Pass gate.
- Use stairs.
- Fight boss.
- Confirm boss victory sets relic/story/cleared-dungeon flags and autosaves.
- Confirm Coralreach boss awards Chartered Compass/unlocks Frostmere and Highspire routes.

This is longer than a quick smoke test; run when changing dungeon/progression/boss/save behavior.

## No Console Error Check

Use the in-app browser or normal browser devtools after startup and after a battle/menu transition. There should be no uncaught errors.

## Manual Regression Checklist

- Title screen renders.
- New Game starts.
- Menu opens/closes.
- Settings toggle works.
- Random/debug battle starts.
- Battle intent and Skill command work.
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
