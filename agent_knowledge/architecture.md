# Architecture

Crystal Oath is a Phaser 3 + TypeScript + Vite browser RPG. The runtime is now split by domain so future work can read the smallest relevant slice instead of scanning a monolithic scene file.

For quick navigation by task type, read `agent_knowledge/code-map.md`.

## Current Source Structure

```text
src/
  main.ts                         # Vite entry; imports CSS and creates the game
  style.css
  app/
    config.ts                     # resolution, tile, save key, timing, layer constants
    createGame.ts                 # Phaser.Game config/bootstrap
  scene/
    CrystalOathScene.ts           # scene-owned state fields and prototype module registration
    sceneContext.ts               # shared scene helper context type
    sceneGlobals.ts               # barrel for extracted scene helper imports
    sceneLifecycle.ts             # preload/create/update and renderer resolution setup
    sceneState.ts                 # new game, flags, party creation, locations, towns, dungeons
    sceneTypes.ts                 # mode/input/menu/dialogue/vector types
  input/
    keyboard.ts                   # keyboard predicate/direction helpers
    sceneInput.ts                 # key/pointer dispatch for title/menu/dialogue/explore/battle
  data/
    gameDataTypes.ts
    items.ts
    spells.ts
    gear.ts
    enemies.ts
    playerSkills.ts
    battleTables.ts
    towns.ts
    characterSprites.ts
    dungeonTiles.ts
    worldTiles.ts
    worldCurrentAssets.ts
    worldCloudAssets.ts
    worldObjects.ts
  assets/
    assetPaths.ts                 # root assets/assets_v2/src asset glob and URL resolution
    assetTypes.ts
    textureKeys.ts                # texture-key maps for gameplay renderers
    world/
      current/
      dungeon_atlas.png
      dungeonAtlas.manifest.json
  render/
    common/
      renderCore.ts               # immediate draw loop helpers, text/images, texture filtering
      panels.ts                   # panels, bars, HUD, camera, dirty flag
      drawActors.ts               # actor/portrait/enemy/crystal fallback drawing
    title/drawTitle.ts
    world/
      drawWorld.ts                # overworld draw loop, semantic cache, overlays, F6 debug
      drawWorldTerrain.ts         # raw/fallback terrain tile drawing
      drawLocationIcon.ts         # POI/location icon rendering
    town/drawTown.ts
    dungeon/drawDungeon.ts
    battle/drawBattle.ts
    menu/drawMenu.ts
  systems/
    audio/synthAudio.ts
    battle/
      battleTypes.ts
      battleFlow.ts
      battleActions.ts
      battleState.ts
    menu/menuActions.ts
    movement/exploreMovement.ts
    save/
      saveGame.ts
      loadGame.ts
    world/worldMath.ts
  world/
    cloudOverlay.ts
    dungeonGenerator.ts
    seededRng.ts
    worldGenerator.ts
    semantic/
      semanticGenerator.ts
      semanticMaskTerrainRenderer.ts
      semanticProfiles.ts
      semanticRouteRenderer.ts
      semanticTypes.ts
      semanticValidation.ts
```

## Runtime Stack

- Phaser 3 handles the game loop, canvas rendering, keyboard/pointer input, scale fitting, texture filtering, and fullscreen.
- Vite builds and serves the browser entry.
- TypeScript compiles the game code.
- Browser `localStorage` stores saves under `crystal-oath-save-v1`.
- WebAudio oscillator loops/effects are generated in `src/systems/audio/synthAudio.ts`.
- No external art, sound, music, font, or sprite dependencies are used.

## Entry Points

- `index.html` mounts `<div id="game"></div>` and loads `/src/main.ts`.
- `src/main.ts` imports `src/style.css` and calls `createGame()`.
- `src/app/createGame.ts` creates the Phaser config with a 1920x1080 backing canvas, `Phaser.Scale.FIT`, and `CrystalOathScene`.
- `src/app/config.ts` owns the global constants:
  - `DESIGN_WIDTH = 1920`
  - `DESIGN_HEIGHT = 1080`
  - `PIXEL_ART_SCALE = 2`
  - `LAYOUT_WIDTH = 960`
  - `LAYOUT_HEIGHT = 540`
  - `TILE = 32`
  - `SAVE_KEY = "crystal-oath-save-v1"`
  - `WORLD_W = 96`
  - `WORLD_H = 64`

Pointer coordinates still map back to layout coordinates by dividing by `PIXEL_ART_SCALE`.

## Scene Organization

`src/scene/CrystalOathScene.ts` owns Phaser scene state: graphics layers, transient text/image arrays, mode/menu/dialogue/battle state, generated world state, party/inventory/gold, positions, flags, discovered POIs, opened chests, settings, movement state, and cache keys.

The scene class is intentionally a state shell. Runtime methods are attached from focused modules with `Object.assign(CrystalOathScene.prototype, ...)`. This preserves the existing Phaser scene-state model while moving behavior into domain files. The current helper context is broad (`CrystalOathSceneContext & Record<string, any>`) so the refactor could preserve behavior mechanically; future cleanup can narrow contexts after behavior is stable.

## Data

Static gameplay tables moved out of the scene:

- `src/data/items.ts`
- `src/data/spells.ts`
- `src/data/gear.ts`
- `src/data/enemies.ts`
- `src/data/playerSkills.ts`
- `src/data/battleTables.ts`
- `src/data/towns.ts`

World, cloud, object, character sprite, and dungeon atlas manifest helpers remain in their specialized `src/data/*` files.

Town and dungeon definitions still live in `src/scene/sceneState.ts` because they close over current scene flags, generated dungeon floors, and arrival callbacks. If they grow, extract factory functions that accept explicit context instead of moving hidden scene dependencies into static data tables.

## Assets

Asset loading is split into:

- `src/assets/assetPaths.ts`: root `assets/`, `assets_v2/`, and `src/assets/world/` glob URL resolution.
- `src/assets/textureKeys.ts`: stable texture-key maps for locations, town services/props, party classes, enemies, portraits, dungeon atlas themes, and town/dungeon atlas picks.
- `src/scene/sceneLifecycle.ts`: Phaser preload loop for resolved URLs, current world assets, and cloud assets.

Rules retained:

- `assets_v2` overrides root `assets/` when a mapped v2 asset exists.
- `src/assets/world/current/` manifest behavior remains active.
- Generated fallback art remains available for missing textures.
- Deleted generic placeholder PNGs should not be restored.
- Dungeon/city atlas crops preserve `DUNGEON_ATLAS_SOURCE_INSET = 3`.

## World Generation

Semantic overworld generation remains under `src/world/semantic/`.

- `semanticGenerator.ts` builds land/water masks, island IDs, shallow water, beaches, biomes, elevation/ridges, roads, rivers, road-river crossing candidates, forests, mountain masks, POI footprints, overlay collision policy, harbors, and walkability.
- `worldGenerator.ts` adapts semantic output into the Phaser-facing `GeneratedWorld` contract.
- `semanticMaskTerrainRenderer.ts` creates the normal gameplay overworld terrain texture from semantic masks and selected current material PNGs.
- `semanticRouteRenderer.ts` is debug-only for road/river graph diagnostics.
- `semanticValidation.ts` validates starter spawn, islands, harbors, POIs, roads, rivers, forests, mountains, and renderer assumptions.

Normal gameplay collision and encounters use semantic world data, not rendered pixels.

## Rendering

Rendering is immediate-mode Phaser graphics/images/live text, split by surface:

- Common rendering: `src/render/common/renderCore.ts`, `panels.ts`, `drawActors.ts`
- Title: `src/render/title/drawTitle.ts`
- World: `src/render/world/drawWorld.ts`, `drawWorldTerrain.ts`, `drawLocationIcon.ts`
- Town: `src/render/town/drawTown.ts`
- Dungeon: `src/render/dungeon/drawDungeon.ts`
- Battle: `src/render/battle/drawBattle.ts`
- Menu/dialogue/game over/ending: `src/render/menu/drawMenu.ts`

Important rendering invariants:

- UI text remains live Phaser text.
- Battle backgrounds use linear texture filtering; pixel sprites/tiles/UI/icons use nearest filtering.
- Normal overworld terrain uses semantic mask rendering, not normal-runtime atlas tile stamping.
- Roads/rivers/lakes render through terrain masks; F6 road/river graph strokes are debug-only.
- Forests remain passable soft-terrain overlays.
- Mountains render as one normal unscaled visual-only mountain sprite per accepted semantic mountain cell; collision remains semantic.
- Runtime POI apron/footprint debug squares stay disabled in normal gameplay.
- Dungeon and town floors/walls use weighted base/accent atlas picks, not even random checkerboarding.
- Dungeon unused `#` filler renders as void unless adjacent to carved floor/corridor.

## Input And Movement

- `src/input/keyboard.ts` owns keyboard predicate and direction helpers.
- `src/input/sceneInput.ts` dispatches key/pointer input by current mode and handles debug toggles.
- `src/systems/movement/exploreMovement.ts` owns tile-step movement, held direction state, collision checks, visual/logical position syncing, town/dungeon/world interactions, location entry, harbor travel, and encounter triggers.

Movement invariants:

- Movement is tile-center based.
- Gameplay tile positions commit only after the visual step completes.
- Collision checks the destination tile center.
- Location entry and random encounters trigger after completed steps.
- World collision uses semantic walkability.

## Battle

Battle logic is split into:

- `battleFlow.ts`: random/boss battle setup, enemy intent, initiative cycles, turn advancement, battle background selection.
- `battleActions.ts`: command selection, player/enemy action resolution, skills, spells, items, animation queueing.
- `battleState.ts`: status ticks, battle end checks, rewards, damage math, party/enemy helper state.
- `battleTypes.ts`: battle state/action/initiative types.

Battle rendering is in `src/render/battle/drawBattle.ts`.

Rules retained:

- Individual initiative turns remain active.
- The game does not use all-party queued rounds.
- Enemy intent remains visible before enemy turns.
- Skill command remains present.
- Party battlers stay on the right facing left; enemies stay on the left facing right.
- Fallen party members still receive victory XP and level-up stat gains without being revived.

## Menu, Save, Audio

- `src/systems/menu/menuActions.ts`: main/status/items/magic/equipment/settings/debug menus, shops, inns, clinics, dialogue helpers.
- `src/systems/save/saveGame.ts`: localStorage serialization.
- `src/systems/save/loadGame.ts`: save normalization, world rebuild, position restoration, and scene state restoration.
- `src/systems/audio/synthAudio.ts`: generated oscillator loops and blips plus mute state.

Save behavior remains under the existing key and schema shape. There is still no explicit numeric schema version.

## Validation

For code changes, run:

```powershell
npm test
npm run build
```

For this architecture split, both commands passed after extraction.

## Known Architecture Risks

- Extracted scene methods currently share a broad scene context type for mechanical compatibility. Future refactors can narrow those contexts by domain.
- Town and dungeon definitions still live in scene state because they depend on flags and callbacks.
- Automated coverage is still mostly worldgen validation plus TypeScript/build. Browser smoke testing remains important for rendering and input changes.
- Existing large pre-refactor source files such as `src/world/semantic/semanticGenerator.ts` and generated/manifests are still large; they were outside this scene-decomposition pass.
