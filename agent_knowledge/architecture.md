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
      worldTiles.ts
    world/
      worldGenerator.ts
    main.ts
    style.css
    vite-env.d.ts
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
- Imported world tile manifest from `src/data/worldTiles.ts` for the active `atlas_v3` overworld atlas, 8x8 source rectangles, shared source-edge inset, empty-cell exclusion, tile IDs, walkability, movement cost, encounter family, and tags.
- `src/world/worldGenerator.ts`: seeded deterministic `atlas_v3_tile_world` generation, grass/desert/snow/dark/water/rock/lava patch placement, POI placement, reachability validation, and debug-report formatting. It does not generate roads, rivers, bridges, classic POI objects, or old 10x10 tile IDs.
- `SynthAudio`: WebAudio helper for generated music loops and sound effects.
- `CrystalOathScene`: main Phaser scene containing game state, input handling, map movement, battles, menus, save/load, and rendering.
- Dungeon generation helpers: `makeDungeonFloors`, `blankDungeon`, `carveRect`, `carveLine`, `setTile`, `floorToStrings`.
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

Fighter/priest/wizard class sprites are normalized 5x2 transparent sheets in `assets_v2/characters/classes/`. Runtime rendering selects fixed manifest cells and positions each crop by manifest `bodyCenterX` and `feetBaselineY`, so walk and attack frames share a stable body anchor. The old Arlen/Mira/Kael tiny map/battle PNGs are excluded from the runtime asset glob.

Overworld rendering uses the active `atlas_v3` tileset at `src/assets/world/atlas_v3.png` plus the imported manifest `src/assets/world/atlasV3.manifest.json`. `drawWorldTile` and the terrain cache crop valid 8x8 atlas cell rectangles inward with `ATLAS_V3_SOURCE_INSET = 3` via `atlasV3SourceRectWithInset`, then draw the clean interior into the full 32 layout pixel destination tile, scaled to 64 canvas pixels by the Full HD render scale. Black/empty atlas cells are not tile IDs and must not be generated or drawn. The classic special tileset and old generated 10x10 atlas are not active runtime terrain.

Generated overworld terrain is cached as a Phaser canvas texture when a world seed/layout is built. The cache draws each placed atlas tile with the same inset source rectangle used by the fallback visible-tile path. There is no runtime post-placement seam repair, same-tile softening, water seam blend, intersection/corner softening, or mutation of cached map pixels with neighboring terrain colors. Collision, walkability, POIs, and tile IDs remain unchanged.

Render resolution is split into clear constants: `DESIGN_WIDTH = 1920`, `DESIGN_HEIGHT = 1080`, `PIXEL_ART_SCALE = 2`, `LAYOUT_WIDTH = DESIGN_WIDTH / PIXEL_ART_SCALE`, and `LAYOUT_HEIGHT = DESIGN_HEIGHT / PIXEL_ART_SCALE`. Graphics commands, Phaser images, and live text are scaled by `PIXEL_ART_SCALE` when rendered, so existing 960x540-style layout coordinates fill a true 1920x1080 canvas. Pointer input maps from canvas coordinates back to layout coordinates by dividing by `PIXEL_ART_SCALE`.

Texture filtering is per asset family: battle backgrounds use linear filtering and the canvas CSS uses `image-rendering: auto`; sprites, tiles, UI, icons, enemies, and class sheets use nearest-neighbor texture filtering.

New games call the seeded world generator. The generated world includes the tile grid, POI coordinates, start position, entry triggers, and validation result; roads, rivers, and bridges are intentionally empty for the current minimal atlas pass. `CrystalOathScene.locations()` adapts generated POIs back into the existing town/dungeon/gate/final entry behavior and keeps progression locks in code.

Battle rendering is split into helper sections:

- `drawBattleBackdrop`: original scenic forest/plains backdrop.
- `drawBattleEnemy` / `enemyBattleSlot`: enemies on the left with shadows, HP bars, and target highlight.
- `drawPartyBattler`: original procedural party battlers on the right.
- `drawBattleTargetPanel`: lower-left target/log panel.
- `drawBattleCommandPanel`: lower-middle command panel for the current party actor.
- `drawBattleStatusPanel`: lower-right party status and next-turn preview.

Party battlers use the class sheets: Arlen -> fighter, Mira -> priest, Kael -> wizard. Battle idle uses `walk_left_a`; party attacks swap through `attack_windup_left` and `attack_release_left` during the existing lunge animation.

## Input Approach

Keyboard events are registered in `create()`:

- Arrow keys/WASD: move/select.
- Enter/Space/Z: confirm.
- Escape/X: cancel/menu.
- Shift: faster exploration movement.
- M: mute toggle.
- F: fullscreen.
- F9: hidden debug menu outside battle.

Exploration movement is tile-anchor based using persistent visual positions: `visualWorldPos`, `visualTownPos`, and `visualDungeonPos`. Direction keydown records held direction, keyup releases it, and update-time movement interpolates one accepted step from the current tile center to the adjacent tile center. Releasing input finishes the active step and stops centered on the destination tile instead of leaving the player between tiles.

Important movement rule: renderers read the persistent visual tile positions during the active step, but gameplay tile positions (`worldPos`, `townPos`, `dungeonPos`) commit only when the destination tile is reached. Collision checks the requested destination tile/feet anchor with `canOccupyExploreTile`, not a rectangle around the full sprite. Encounters, exits, dungeon objects, and location entry fire only after completed tile steps.

Mouse support is minimal and mainly starts audio/click blips.

## Save/Load Approach

`saveGame()` serializes party, inventory, gear, gold, world seed, positions, current town/dungeon, story flags, opened chests, puzzle flags, defeated bosses, settings, and encounter counter to `localStorage`.

`loadGame()` reads `crystal-oath-save-v1`, rebuilds the generated overworld from the saved `worldSeed`, restores state, returns to `world`, and marks the scene dirty. Save schema migration is not implemented yet; older saves without `worldSeed` receive a new generated world.

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
- Town interior uses a 21x15 tile area offset at x=144, y=40.
- Dungeon floors are 22x14 character maps.
- Battle layout uses enemies on the left, party battlers on the right, and three lower panels for target/log, command, and party status.
- Battle flow uses initiative entries for individual actor turns; do not rebuild the old all-party action queue.

## Known Architecture Risks

- `src/main.ts` is large and combines data, state management, rendering, audio, and gameplay. Future refactors should be incremental and test after each extraction.
- Asset maps now live in `src/main.ts`; they may deserve a small module if future batches grow the file further.
- Battle actions have a short timed animation state with temporary render offsets for lunges/steps before returning to home positions. Damage/heal/item math remains in the existing battle resolvers.
- Save data has no versioned migration layer yet.
