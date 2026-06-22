# Code Map

Use this map to jump to the right source before reading broad code.

## Runtime Entry

- Browser entry: `index.html`
- Vite entry: `src/main.ts`
- Phaser game config/bootstrap: `src/app/createGame.ts`
- Global resolution, canvas, tile, save key, movement timing, battle timing, and layer/depth constants: `src/app/config.ts`
- Main Phaser scene state shell: `src/scene/CrystalOathScene.ts`
- Prototype mixin context type: `src/scene/sceneContext.ts`; method surface is declared in `src/scene/CrystalOathScene.ts`
- Scene lifecycle and preload/create/update glue: `src/scene/sceneLifecycle.ts`

## Data And Types

- Shared scene/input types: `src/scene/sceneTypes.ts`
- Gameplay data types: `src/data/gameDataTypes.ts`
- Battle state/action types: `src/systems/battle/battleTypes.ts`
- Items: `src/data/items.ts`
- Spells: `src/data/spells.ts`
- Weapons/armor/gear merge: `src/data/gear.ts`
- Enemies and boss definitions: `src/data/enemies.ts`
- Player skill definitions: `src/data/playerSkills.ts`
- Encounter table IDs: `src/data/battleTables.ts`
- Town service marker layout: `src/data/towns.ts`

## Assets

- Root `assets/`, `assets_v2/`, and `src/assets/world/` asset path/glob resolution: `src/assets/assetPaths.ts`
- Texture-key lookup maps for locations, enemies, portraits, party classes, towns, and dungeon atlas themes: `src/assets/textureKeys.ts`
- Active current overworld asset manifest helpers: `src/data/worldCurrentAssets.ts`
- Cloud manifest helpers: `src/data/worldCloudAssets.ts`
- Character class sprite manifest: `src/data/characterSprites.ts`
- Dungeon atlas manifest helpers and `DUNGEON_ATLAS_SOURCE_INSET`: `src/data/dungeonTiles.ts`

## World And Exploration

- Semantic world generation: `src/world/semantic/semanticGenerator.ts`
- Semantic profile and island rules: `src/world/semantic/semanticProfiles.ts`
- Semantic world validation: `src/world/semantic/semanticValidation.ts`
- Shared harbor boat navigability/pathfinding rules: `src/world/semantic/boatNavigation.ts`
- Phaser-facing generated world facade: `src/world/worldGenerator.ts`
- Normal overworld mask terrain renderer: `src/world/semantic/semanticMaskTerrainRenderer.ts`
- Debug-only road/river graph renderer: `src/world/semantic/semanticRouteRenderer.ts`
- Tile-step movement, visual/logical position syncing, and collision checks: `src/systems/movement/exploreMovement.ts`
- Dungeon movement helpers, floor markers, stairs, and chests: `src/systems/movement/dungeonMovement.ts`
- Town/world/dungeon entry and location footprint helpers: `src/systems/movement/locationEntry.ts`
- World location interactions, terrain encounter keys, and island naming/theme helpers: `src/systems/world/locations.ts`
- Harbor destination menu and island travel: `src/systems/world/harborTravel.ts`
- Smooth charter boat cutscene state, sprites, route movement, and boat-time ticks: `src/systems/world/boatTravel.ts`
- Random and dungeon encounter triggers: `src/systems/world/encounters.ts`
- Keyboard helpers: `src/input/keyboard.ts`
- Scene key/pointer dispatch: `src/input/sceneInput.ts`

## Rendering

- Common immediate-mode render helpers, transient images, text, cropped image draws, texture filtering, and cloud update: `src/render/common/renderCore.ts`
- Panels, bars, HUD, prompt, camera math, dirty flag: `src/render/common/panels.ts`
- Actor, portrait, enemy, and crystal fallback drawing: `src/render/common/drawActors.ts`
- Title screen: `src/render/title/drawTitle.ts`
- Overworld main draw loop, semantic terrain cache, overlays, and F6 debug overlays: `src/render/world/drawWorld.ts`
- Overworld raw/fallback terrain tile drawing: `src/render/world/drawWorldTerrain.ts`
- Overworld POI/location icons and manifest scaling/lift rules: `src/render/world/drawLocationIcon.ts`
- Town rendering and service/prop fallback drawing: `src/render/town/drawTown.ts`
- Dungeon rendering, atlas object tiles, chests, gates, stairs, boss seals, and void filler: `src/render/dungeon/drawDungeon.ts`
- Battle backdrop, enemy/party battlers, target/command/status panels: `src/render/battle/drawBattle.ts`
- Menu/dialogue/game-over/ending rendering: `src/render/menu/drawMenu.ts`

## Battle, Menu, Save, Audio

- Battle setup, enemy intent, initiative, turn flow, and battle background selection: `src/systems/battle/battleFlow.ts`
- Player/enemy action resolution, skills, spells, battle items, and animation queueing: `src/systems/battle/battleActions.ts`
- Battle end checks, status ticking, victory rewards, damage math, and party stat helpers: `src/systems/battle/battleState.ts`
- Menus, shops, field items/magic, equipment, settings, debug menu, dialogue helpers: `src/systems/menu/menuActions.ts`
- Save serialization: `src/systems/save/saveGame.ts`
- Load normalization/restoration: `src/systems/save/loadGame.ts`
- Generated WebAudio synth loops/effects: `src/systems/audio/synthAudio.ts`

## Common Task Routing

- Adding or tuning items/spells/gear/enemies/skills: read `src/data/*` first, then battle/menu files only if behavior changes.
- Changing battle flow or rewards: read `src/systems/battle/*` and `src/render/battle/drawBattle.ts`.
- Changing overworld geography, mountains, forests, roads, rivers, or POIs: read `src/world/semantic/*`, `src/world/worldGenerator.ts`, then `src/render/world/*`.
- Changing movement/collision: read `src/systems/movement/exploreMovement.ts`.
- Changing location entry/town exits/POI footprints: read `src/systems/movement/locationEntry.ts`.
- Changing harbor travel/island arrival: read `src/systems/world/harborTravel.ts`, `src/systems/world/boatTravel.ts`, and `src/world/semantic/boatNavigation.ts`.
- Changing random encounter triggers or terrain encounter keys: read `src/systems/world/encounters.ts` and `src/systems/world/locations.ts`.
- Changing towns: read `src/render/town/drawTown.ts`, `src/data/towns.ts`, and town definitions in `src/scene/sceneState.ts`.
- Changing dungeons: read `src/world/dungeonGenerator.ts`, dungeon definitions in `src/scene/sceneState.ts`, `src/data/dungeonTiles.ts`, and `src/render/dungeon/drawDungeon.ts`.
- Changing save/load: read `src/systems/save/saveGame.ts`, `src/systems/save/loadGame.ts`, and the relevant state fields in `src/scene/CrystalOathScene.ts`.
- Changing asset loading or texture keys: read `src/assets/assetPaths.ts`, `src/assets/textureKeys.ts`, and any active manifest helper under `src/data/`.
- Changing audio: read `src/systems/audio/synthAudio.ts`.
- Changing debug tools: read F6/F7/F9 handling in `src/input/sceneInput.ts`, world debug rendering in `src/render/world/drawWorld.ts`, and debug menu actions in `src/systems/menu/menuActions.ts`.
