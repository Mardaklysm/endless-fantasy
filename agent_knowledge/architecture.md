# Architecture

## Current File And Folder Structure

```text
D:\Projects\Endless Fantasy\
  AGENTS.md
  README.md
  ART_STYLE_GUIDE.md
  ASSET_MANIFEST.md
  ASSET_IMPLEMENTATION_PLAN.md
  agent_knowledge/
  assets/
    characters/
    effects/
    enemies/
    icons/
    portraits/
    tiles/
    title/
    ui/
  index.html
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  src/
    data/
      characterSprites.ts
      dungeonTiles.ts
      worldObjects.ts
      worldTiles.ts
    world/
      dungeonGenerator.ts
      seededRng.ts
      worldGenerator.ts
      semantic/
        semanticGenerator.ts
        semanticMaskTerrainRenderer.ts
        semanticProfiles.ts
        semanticTypes.ts
        semanticValidation.ts
    main.ts
    style.css
    vite-env.d.ts
  tools/
    worldgen-lab/
      worldgenLab.mjs
      generator.mjs
      renderPreview.mjs
      README.md
```

Ignored/generated folders:

- `node_modules/`
- `dist/`
- `.vite/`

## Runtime Stack

- Phaser 3 (`phaser` dependency) for game loop, canvas rendering, keyboard input, 16:9 scale fitting, and per-texture pixel-art filtering.
- Phaser preload/image textures for PNG/JPEG assets in root `assets/` and `assets_v2/`.
- TypeScript for source.
- Vite for development server and production build.
- Browser `localStorage` for saves.
- WebAudio oscillators for generated blips and loop patterns.

## Entry Points

- `index.html` mounts `<div id="game"></div>` and loads `/src/main.ts`.
- `src/style.css` centers the game canvas, sets dark background, and enables pixelated rendering.
- `src/main.ts` creates `new Phaser.Game(config)`.
- Default Phaser backing canvas size is 1920x1080. The browser display is fitted to the available viewport by Phaser `Scale.FIT`.

## Main Source Units

`src/main.ts` currently contains most logic:

- Data/interface types for modes, terrain, characters, enemies, items, spells, gear, menus, dialogue, and battles.
- Asset texture key/path maps and renderer lookup maps for terrain, locations, dungeons, enemies, portraits, and NPCs.
- Data tables: `ITEMS`, `SPELLS`, `WEAPONS`, `ARMORS`, `ENEMIES`, `WORLD_TABLES`.
- Imported class sprite manifest from `src/data/characterSprites.ts` for fighter/priest/wizard frame rectangles, anchors, and source metadata.
- Imported world tile manifest from `src/data/worldTiles.ts` for the active `atlas_v3` overworld atlas, 8x8 source rectangles, shared source-edge inset, tile IDs, walkability, movement cost, encounter family, and tags. The current atlas has 64 classified terrain cells.
- Imported world object overlay manifest from `src/data/worldObjects.ts` for the active `world_objects` atlas, 8x8 source rectangles, object IDs, categories, tags, and source metadata.
- Imported dungeon/city tile manifest from `src/data/dungeonTiles.ts` for the active `dungeon_atlas`, 8x8 source rectangles, shared source-edge inset, tile IDs, categories, themes, and tags. The current atlas has 64 classified dungeon/city cells.
- `src/world/seededRng.ts`: deterministic RNG/hash/noise helpers shared by map and dungeon generation.
- `src/world/semantic/`: runtime-safe semantic overworld generator and renderer helpers. `semanticProfiles.ts` defines the campaign profile with four major islands (Greenhaven, Coralreach, Frostmere, Highspire) plus seeded minor islands and per-island overlay rules. `semanticGenerator.ts` builds land/water masks, island IDs, coast distance bands, grass/sand/ice biomes, elevation/ridges, rivers, passable forests, theme-capped mountain ranges, POIs, harbors, road graph, road-river bridge candidates, overlay collision policies, and walkability. `semanticMaskTerrainRenderer.ts` generates the normal Phaser terrain background as a crisp mask-rendered texture using atlas terrain crops as repeating texture sources. `semanticRouteRenderer.ts` generates transparent styled road/river stroke overlays from semantic paths. `semanticValidation.ts` validates starter spawn, major islands, harbors, POIs, beach buffers, roads, rivers, mountain caps/ranges/snow rules, forest passability, and overlay separation.
- `src/world/worldGenerator.ts`: compatibility facade adapting `SemanticWorld` into the existing Phaser-facing `GeneratedWorld` contract: atlas tile grid, biome grid, island records, POIs, harbor travel points, road visual masks, river paths, pier/bridge overlays, road-river bridge candidates, object overlays with collision policies, sea route dots, start position, and validation. This keeps `src/main.ts` gameplay systems working while the geography source is semantic.
- `src/world/dungeonGenerator.ts`: deterministic room-and-corridor dungeon floor generation from `worldSeed + dungeonId + tier`, including entrance/stairs, chests, switch/gate, and boss placement.
- `tools/worldgen-lab/`: standalone Node/pngjs preview/report tool for the semantic overworld direction. It imports the runtime-safe core from `src/world/semantic/`, but keeps pngjs/filesystem rendering outside Phaser.
- `SynthAudio`: WebAudio helper for generated music loops and sound effects.
- `CrystalOathScene`: main Phaser scene containing game state, input handling, map movement, battles, menus, save/load, and rendering.
- Input helpers: `isUp`, `isDown`, `isLeft`, `isRight`, `isConfirm`, `isCancel`, `keyDirection`.
- Phaser config at bottom of file.

## Game States

The `Mode` union currently includes:

- `title`
- `world`
- `town`
- `dungeon`
- `dialogue`
- `menu`
- `battle`
- `gameOver`
- `ending`

State transitions are managed inside `CrystalOathScene`.

## Rendering Approach

Rendering is layered Phaser `Graphics`, Phaser image textures, and live Phaser text. `preload()` loads Batch 001 PNGs from root `assets/` and newer PNG/JPEG files from `assets_v2/` through manifest-style texture keys. Draw paths are image-first and fallback-second where the first batch is strong enough; weak first-pass world terrain/markers are currently superseded by original procedural world art while the PNGs remain loaded.

Key draw functions:

- `drawTitle`
- `drawWorld`
- `drawTown`
- `drawDungeon`
- `drawBattle`
- `drawMenuScreen`
- `drawDialogue`
- `drawWorldTile`
- `drawDungeonTile`
- `drawLocationIcon`
- `drawLeader`
- `drawCharacterSpriteFrame`
- `drawNpc`
- `drawPortrait`
- `drawEnemySprite`
- `drawPixelCrystal`
- `drawPanel`
- `drawBar`

The renderer uses a dirty flag and redraws the full canvas on state/input changes. Smooth movement and battle action timers can also mark the scene dirty during `update()` so animation/timed flow redraws between input events.

The scene keeps generated fallback drawing for missing textures. It also tracks transient Phaser image objects and destroys/recreates them on each redraw so image assets fit the existing immediate redraw model. Cropped texture rendering must use the requested display size directly; do not rescale cropped frames by the full source-sheet dimensions.

Fighter/priest/wizard class sprites are normalized 5x2 transparent sheets in `assets_v2/characters/classes/`. Runtime rendering selects fixed manifest cells and positions each crop by manifest `bodyCenterX` and `feetBaselineY`, so walk and attack frames share a stable body anchor. The tiny Arlen/Mira/Kael map/battle PNGs are excluded from the runtime asset glob.

Normal overworld base terrain uses `src/world/semantic/semanticMaskTerrainRenderer.ts`, not square atlas tile placement. It creates a Phaser canvas texture sized to `world.width * TILE` by `world.height * TILE`, classifies the semantic fields into a finer mask grid, fills deep ocean, shallow water, beach, grass, sand, and ice masks with repeated atlas texture crops, and draws pixel-step coast/biome boundary accents. It does not blur the whole map and does not depend on a large coastline tile library. Collision, encounters, POIs, harbors, roads, rivers, and island metadata still come from the semantic grid, not from rendered pixels.

Styled road and river overlays use `src/world/semantic/semanticRouteRenderer.ts`, not road/river tile atlases. Runtime builds a transparent full-world canvas texture from semantic road graph paths and river paths, draws rivers first, then roads on top for temporary bridge crossings, and caches/crops that texture in `drawWorld()` between terrain and object overlays. Normal route mode uses styled strokes with outlines, muted fills, deterministic jitter, and dirt speckles; F6 `roads`/`rivers` remain explicit debug overlays with nodes/source/mouth markers.

The active `atlas_v3` tileset at `src/assets/world/atlas_v3.png` plus `src/assets/world/atlasV3.manifest.json` supplies the normal mask renderer's texture crops and remains available for raw tile debug/fallback. `drawWorldTile` crops valid 8x8 atlas cell rectangles inward with `ATLAS_V3_SOURCE_INSET = 3` via `atlasV3SourceRectWithInset`, then draws the clean interior into the full 32 layout pixel destination tile when F6 `rawTiles` is active or the mask cache is unavailable. All 64 atlas cells are classified terrain IDs. Removed special tilesets and generated 10x10 atlases are not active runtime terrain.

Dungeon and city/town rendering uses the active `dungeon_atlas` sheet at `src/assets/world/dungeon_atlas.png` plus `src/assets/world/dungeonAtlas.manifest.json`. `drawDungeonTile`, `drawTownFloorTile`, `drawTownWallTile`, and `drawTownServicePad` crop 8x8 atlas cells inward with `DUNGEON_ATLAS_SOURCE_INSET = 3` via `dungeonAtlasSourceRectWithInset`. Dungeons and towns use weighted atlas picks: one base floor/wall tile dominates, with sparse accent variants. Dungeon maps smaller than the viewport are centered, and unused `#` filler not adjacent to a carved room/corridor renders as dark void instead of wall wallpaper.

Generated overworld base terrain is cached from semantic masks when a world seed/layout is built. The cache renders at final world pixel size with `imageSmoothingEnabled = false`; the internal mask grid uses 16 samples per semantic cell at the default 32px tile size, so boundaries can be diagonal/rounded while staying pixel-crisp. `TERRAIN_VARIANT_MODE` is currently `"off"` for the compatibility tile grid; later sparse detail should be overlays or controlled patches, not random base tile replacement. Collision, walkability, POIs, and tile IDs remain unchanged. POI interaction footprints stay larger than their drawn overlays; `drawLocationIcon` scales the visual object inside the footprint so caves, chests, shrines, and harbors do not cover whole island chunks.

Render resolution is split into clear constants: `DESIGN_WIDTH = 1920`, `DESIGN_HEIGHT = 1080`, `PIXEL_ART_SCALE = 2`, `LAYOUT_WIDTH = DESIGN_WIDTH / PIXEL_ART_SCALE`, and `LAYOUT_HEIGHT = DESIGN_HEIGHT / PIXEL_ART_SCALE`. Graphics commands, Phaser images, and live text are scaled by `PIXEL_ART_SCALE` when rendered, so existing 960x540-style layout coordinates fill a true 1920x1080 canvas. Pointer input maps from canvas coordinates back to layout coordinates by dividing by `PIXEL_ART_SCALE`.

Texture filtering is per asset family: battle backgrounds use linear filtering and the canvas CSS uses `image-rendering: auto`; sprites, tiles, UI, icons, enemies, and class sheets use nearest-neighbor texture filtering.

New games call the semantic campaign generator through `generateWorld()`. The generated world includes the tile grid, island IDs per tile, island records, POI coordinates and object IDs, seed-derived ocean object overlays, mountain range/forest overlays with collision policies, start position, harbor docks, shallow-water coordinates, sea routes, road visual masks, river paths, road-river bridge candidates, entry triggers, semantic layers, and validation result. `CrystalOathScene.locations()` adapts generated POIs back into town/dungeon/gate/final entry behavior and also exposes harbor/landmark overworld interactions.

Seed-derived `world_objects` ocean overlays, forests, mountain range cells, pier-atlas dock/bridge cells, POIs, player, and UI are separate layers above the mask terrain background and styled route overlay. Road and river graph data remains in the semantic world and normal gameplay renders it through the styled stroke cache; F6 `roads` and F6 `rivers` show graph diagnostics only. `drawLocationIcon` prefers POI `objectId` values from `world_objects`, then falls back to marker textures or generated art.

F6 semantic debug cycling includes normal/off, edge debug, raw square tiles, semantic masks, distance bands, walkability, overlay policy, mountain candidates/accepted range cells, forest soft-terrain cells, island themes, POI IDs/clearance, roads, and rivers. Edge debug draws water/beach edges cyan, sand/grass edges magenta, sand/ice edges white, and grass/ice edges blue.

Battle rendering is split into helper sections:

- `drawBattleBackdrop`: original scenic forest/plains backdrop.
- `drawBattleEnemy` / `enemyBattleSlot`: enemies on the left with shadows, HP bars, target highlight, and visible intent labels.
- `drawPartyBattler`: original procedural party battlers on the right.
- `drawBattleTargetPanel`: lower-left target/log panel.
- `drawBattleCommandPanel`: lower-middle command panel for the current party actor.
- `drawBattleStatusPanel`: lower-right party status and next-turn preview.

Party battlers use the class sheets: Arlen -> fighter, Mira -> priest, Kael -> wizard. Battle idle uses `walk_left_a`; party attacks and skills swap through `attack_windup_left` and `attack_release_left` during the existing lunge animation.

## Input Approach

Keyboard events are registered in `create()`:

- Arrow keys/WASD: move/select.
- Enter/Space/Z: confirm.
- Escape/X: cancel/menu.
- Shift: faster exploration movement.
- M: mute toggle.
- F: fullscreen.
- F9: hidden debug menu outside battle.

Exploration movement is tile-center based using persistent visual positions: `visualWorldPos`, `visualTownPos`, and `visualDungeonPos`. Direction keydown records held direction, keyup releases it, and update-time movement interpolates one accepted step from the current tile center to the adjacent tile center. Releasing input finishes the active step and stops with the leader's feet/shadow anchored on the destination tile center instead of leaving the player between tiles.

Important movement rule: renderers read the persistent visual tile positions during the active step, but gameplay tile positions (`worldPos`, `townPos`, `dungeonPos`) commit only when the destination tile center is reached. Collision checks the requested destination tile center with `canOccupyExploreTile`, not a rectangle around the full sprite. Encounters, exits, dungeon objects, and location entry fire only after completed tile steps.

Mouse support is minimal and mainly starts audio/click blips.

## Save/Load Approach

`saveGame()` serializes party, inventory, gear, gold, world seed, current island id, positions, current town/dungeon, story/travel flags, discovered POIs, opened chests, puzzle flags, defeated bosses, cleared dungeons, settings, and encounter counter to `localStorage`.

`loadGame()` reads `crystal-oath-save-v1`, rebuilds the generated overworld from the saved `worldSeed`, normalizes earlier saves with missing travel/discovery/skill fields, snaps invalid dungeon positions back to the generated entrance/stair marker for that dungeon floor, restores state, returns to `world`, and marks the scene dirty. There is still no explicit numeric schema version.

## Audio Approach

`SynthAudio` uses WebAudio oscillators:

- Loop patterns for title/world/battle/dungeon/ending.
- Blips for confirm, cancel, hit, spell, victory, and error.
- Mute is a setting and can be toggled with `M`.

No external audio files are used.

## Asset Placeholder Approach

Current visuals use PNG assets where Batch 001 has been wired, with generated code fallbacks still present. Do not remove generated placeholders until each replacement path is loaded, shown, and verified.

## Hardcoded Constants To Respect

- `DESIGN_WIDTH = 1920`
- `DESIGN_HEIGHT = 1080`
- `PIXEL_ART_SCALE = 2`
- `LAYOUT_WIDTH = 960` derived from the Full HD design width
- `LAYOUT_HEIGHT = 540` derived from the Full HD design height
- `TILE = 32`
- `SAVE_KEY = "crystal-oath-save-v1"`
- `WORLD_W = 96`
- `WORLD_H = 64`
- `ATLAS_V3_SOURCE_INSET = 3` crops away dirty source-cell edge pixels before drawing valid atlas tiles into full destination cells.
- `DUNGEON_ATLAS_SOURCE_INSET = 3` crops away dirty source-cell edge pixels before drawing valid dungeon/city atlas tiles into full destination cells.
- Town interior uses a 21x15 tile area offset at x=144, y=40.
- Dungeon floors are 22x14 character maps.
- Battle layout uses enemies on the left, party battlers on the right, and three lower panels for target/log, command, and party status.
- Battle flow uses initiative entries for individual actor turns; do not rebuild the removed all-party action queue.

## Known Architecture Risks

- `src/main.ts` is large and combines data, state management, rendering, audio, and gameplay. Future refactors should be incremental and test after each extraction.
- Asset maps now live in `src/main.ts`; they may deserve a small module if future batches grow the file further.
- Battle actions have a short timed animation state with temporary render offsets for lunges/steps before returning to home positions. Damage/heal/item math remains in the existing battle resolvers.
- Save data has no versioned migration layer yet.
