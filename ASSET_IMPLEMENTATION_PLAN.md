# Crystal Oath Asset Implementation Plan

This plan explains how final art should be added later without breaking the current playable game. The generated placeholders stay as the fallback path until each asset family is ready.

## Folder Structure

Use this structure:

```text
assets/
  tiles/
    world/
    markers/
    dungeons/
    objects/
    overlays/
  characters/
  enemies/
  portraits/
  ui/
  icons/
    items/
    equipment/
    relics/
  effects/
  title/
```

Keep all paths lowercase snake_case. Use PNG for most raster art. Battle/background images may use high-resolution opaque JPEG when transparency is not needed. Use transparent backgrounds for sprites, enemies, icons, effects, and markers. Full-screen title backgrounds may be opaque PNG or JPEG.

## Naming Convention

- World tiles: `terrain_name.png`, for example `plains.png`.
- Animated tiles/effects: `name.png` as a horizontal sheet, for example `water_overlay.png` with frames in order.
- Characters: normalized class sheets such as `fighter_normalized.png`, `priest_normalized.png`, and `wizard_normalized.png`.
- Enemies: `enemy_name.png`, for example `bristle_rat.png`; bosses use `boss_name.png`.
- UI: `purpose_variant.png`, for example `window_panel_9slice.png`.
- Icons: semantic item/category names, not shop names.

## Loading Strategy

Current note: the Phaser scene already has a `preload()` image loader. Normal overworld terrain uses `src/world/semantic/semanticMaskTerrainRenderer.ts` to generate a crisp semantic mask background. The renderer uses the `atlas_v3` texture from `src/assets/world/atlas_v3.png`, imported manifest `src/assets/world/atlasV3.manifest.json`, and tile metadata in `src/data/worldTiles.ts` as repeating texture sources for deep water, shallow water, beach, grass, sand, and snow/ice masks. Individual root `assets/tiles/world/*` files are fallback references. Raw/fallback atlas tile draws use `ATLAS_V3_SOURCE_INSET = 3`, but square atlas tiles are debug/fallback rather than the normal terrain presentation. Harbor dock overlays use `src/assets/world/pier_atlas.png`. Generated POI and ocean-detail object overlays use the transparent `src/assets/world/world_objects.png` sheet plus `src/data/worldObjects.ts`. Dungeon/city tiles use the opaque `src/assets/world/dungeon_atlas.png` sheet plus `src/data/dungeonTiles.ts`, cropped with `DUNGEON_ATLAS_SOURCE_INSET = 3`. Runtime must not use full-map blur, huge coastline tile libraries, rendered PNG packages as gameplay truth, random terrain variant spam, or fake road/river graph strokes in normal gameplay.

For future asset families, extend the existing loader incrementally:

1. Add a `preload()` method to `CrystalOathScene`.
2. Load images with stable keys that match the manifest asset IDs.
3. Store loaded asset availability in a helper such as `hasTexture(key)`.
4. In each draw function, prefer image rendering when the texture exists.
5. Fall back to the existing generated placeholder when the image is missing.

Example later shape:

```ts
preload() {
  this.load.image("tile_plains", "assets/tiles/world/plains.png");
}

private drawWorldTile(...) {
  if (this.textures.exists("tile_plains")) {
    this.add.image(...);
    return;
  }
  // existing generated placeholder remains here
}
```

Avoid replacing every `Graphics` draw call at once. Add asset support family by family.

## Fallback Behavior

- Missing tile asset: use current generated `drawWorldTile` or `drawDungeonTile`.
- Missing character asset: use current `drawLeader` or `drawNpc`.
- Missing enemy asset: use current `drawEnemySprite`.
- Missing portrait: use current `drawPortrait`.
- Missing UI asset: use current `drawPanel`, text cursor, and `drawBar`.
- Missing title art: use current generated title crystals, stars, and live text.

This lets the game remain playable after every partial art import.

## Current Code Replacement Targets

| Code Area | Current Function | Future Asset Hook | Risk |
|---|---|---|---|
| World terrain | `createSemanticMaskTerrainTexture`, `drawWorldTile` raw/debug fallback | `src/world/semantic/semanticMaskTerrainRenderer.ts`; `src/assets/world/atlas_v3.png` + `src/assets/world/atlasV3.manifest.json` + `src/data/worldTiles.ts` as texture sources | Active normal path is mask-rendered from semantic fields with atlas texture crops; F6 `rawTiles` shows exact square atlas cells for debugging |
| Harbor docks | `drawPierDockTile` | `src/assets/world/pier_atlas.png` | Low; 4x4 atlas cells are cropped into generated harbor dock markers with generated fallback |
| World object overlays | `drawWorldObjectCell`, `drawLocationIcon`, `drawWorldOverlays` | `src/assets/world/world_objects.png` + `src/assets/world/worldObjectAtlas.manifest.json` + `src/data/worldObjects.ts` | Active path; generated POIs carry object IDs and ocean detail overlays are seed-derived from reef positions; generated marker fallback remains |
| Location markers | `drawLocationIcon` | `assets/tiles/markers/*` | Low; town markers and missing object-overlay assets still use this/fallback path |
| Town floor/services | `drawTownFloorTile`, `drawTownWallTile`, `drawTownServicePad`, and service blocks | `src/assets/world/dungeon_atlas.png` plus existing service marker assets | Active path for floor/wall/shop pads; service icons remain separate image assets with generated fallback |
| Dungeon tiles | `drawDungeonTile` | `src/assets/world/dungeon_atlas.png` + `src/assets/world/dungeonAtlas.manifest.json` + `src/data/dungeonTiles.ts` | Active path for floors, walls, chests, gates, stairs, exits, switches, and boss seals; individual dungeon PNGs remain fallback |
| Player/class sprite sheets | `drawLeader`, `drawCharacterSpriteFrame`, `drawPartyBattler` | `assets_v2/characters/classes/*_normalized.png` plus `src/data/characterSprites.ts` | Medium, requires stable crop/anchor metadata |
| NPC sprites | `drawNpc` | `assets/characters/npc_*.png` | Medium, needs NPC type data or deterministic mapping |
| Battle portraits | `drawPortrait` | `assets/portraits/battle_*.png` | Low, current layout already reserves portrait slots |
| Enemy sprites | `drawEnemySprite` | `assets/enemies/*.png` | Medium, needs size/anchor rules so labels/bars stay aligned |
| Title crystals/logo | `drawPixelCrystal`, `drawTitle` | `assets/title/*` | Low |
| UI panels/bars | `drawPanel`, `drawBar` | `assets/ui/*` | Medium, 9-slice or manual tiling needed |
| Effects | Battle action/spell resolution | `assets/effects/*` | Higher, because current battle has no visual effect timing system |

## Hardcoded Sizes To Respect

- `DESIGN_WIDTH = 1920`, `DESIGN_HEIGHT = 1080`.
- `PIXEL_ART_SCALE = 2`; layout coordinates are derived from the Full HD design size instead of using a low-res canvas.
- `TILE = 32` layout pixels, rendered as 64 physical canvas pixels at the default Full HD target.
- World camera assumes tile-sized map cells.
- Town interior currently uses a 21x15 tile area offset at x=144, y=40.
- Dungeon floors are generated as 22x14 character maps and rendered on the same 32px grid.
- Battle enemies are currently positioned around x=115 + index * 158, y=112 or 174, with text at y + 104 and HP bar at y + 126.
- Party battle portraits start at x=625 and y=84/174/264, with portrait size currently 44x56 display pixels.
- Battle command panels occupy y=360 to roughly y=505; do not add large art there.

## Sprite Sheet Recommendations

### Class Characters

- Current imported source sheets live in `D:\Tools\rembg\bg_output` and already have alpha transparency; do not rerun rembg or chroma-key them.
- Import with `node tools\art_import\import_character_sprites.mjs`.
- Runtime output lives in `assets_v2/characters/classes/`.
- Current normalized size is 5 columns x 2 rows, 704x512 cells, 3520x1024 sheet.
- Layout:
  - Index 0: `attack_windup_left`
  - Index 1: `attack_release_left`
  - Index 2-3: `walk_down_a`, `walk_down_b`
  - Index 4-5: `walk_left_a`, `walk_left_b`
  - Index 6-7: `walk_right_a`, `walk_right_b`
  - Index 8-9: `walk_up_a`, `walk_up_b`
- Renderer must use `src/data/characterSprites.ts` anchor metadata rather than centering the full transparent crop.

### Effects

- Horizontal sheet.
- Use 4 frames for most effects.
- Use 6 frames only for boss death or relic restore.
- Keep most effect frames 32x32. Use 64x64 only for boss/relic effects.

### UI Frame

- Prefer a 48x48 source PNG arranged for 9-slice use.
- Corners: 8px.
- Edges: tile or stretch cleanly.
- Center: opaque dark navy.

## Safe Incremental Replacement Order

1. Add folder structure and loader keys for Phase 1 assets.
2. Replace `drawWorldTile` with atlas/manifest-backed rendering. Done for `atlas_v3`; normal overworld terrain now uses semantic texture generation while raw atlas drawing remains fallback/debug.
3. Add world object overlay atlas rendering for generated dungeons, landmarks, harbors, and ocean detail POIs. Done for `world_objects`; generated marker drawing remains fallback.
4. Replace or extend class sprite rendering through `src/data/characterSprites.ts` and `drawCharacterSpriteFrame`.
5. Replace `drawPanel` and menu cursor with UI assets.
6. Replace normal enemy rendering by adding an enemy-id-to-texture map. Keep generated shapes if missing.
7. Replace dungeon tiles and objects. Done for `dungeon_atlas`; generated/individual PNG fallback remains.
8. Replace location markers by adding location/dungeon id-specific marker selection.
9. Replace battle portraits.
10. Add item/equipment/relic icons to menus and HUD.
11. Add boss sprites.
12. Add title logo and title decoration.
13. Add effects only after battle timing can display short animations without blocking input.

## What Can Stay Generated

- Simple HP/status bars can stay generated for a long time.
- Text rendering should stay live.
- The title starfield can stay generated unless a background artist wants a cleaner full-screen title.
- Basic service labels in town can stay text-based until service icons are ready.
- Debug menu needs no art.

## What Should Be Replaced First

- World terrain tiles: they determine first impression and movement readability.
- Party leader map sprite: always visible.
- UI panel/cursor: always visible and currently very plain.
- First-area enemies and cave enemies: visible in the first 5 minutes.

## What Can Be Recolored Or Shared

- Dungeon floors/walls can share a base with palette changes.
- Settlement markers can share one town/castle base with palette/detail changes.
- Normal enemies can share blob, beast, wing, knight, and serpent bases.
- Magic effects can share shape language by element and tint for enemy moves.
- Equipment icons should be category icons, not unique per weapon/armor.

## Places Where Replacement Is Risky

- Enemy art larger than the current battle bounds may overlap labels or party stats.
- Character map sprites taller than 32 display pixels may overlap nearby tiles and NPCs unless anchor logic changes.
- UI frame art with thick borders may reduce text space in menus and battle logs.
- Animated effects need new timing/state code; adding them too early may make battles feel sluggish.
- Opened chest art requires the renderer to check `openedChests`; the current tile remains visually closed even after looted.

## Verification After Each Asset Batch

Run:

```bash
npm run build
```

Then smoke test:

- Title screen still appears.
- New Game starts and Greenhaven renders.
- Player sprite moves without jitter.
- Menu text remains readable.
- A battle starts and enemy labels/HP bars do not overlap art.
- Dungeon chests, switches, doors, stairs, exits, and boss seals are still recognizable.
