# Crystal Oath Asset Manifest

This manifest covers the art needed by the current playable implementation. It intentionally favors reusable sheets, palette swaps, and a small number of strong silhouettes over hundreds of one-off variants.

## Current Code Constraints

- Canvas/backing render target is 1920x1080 by default.
- The game keeps a 960x540-equivalent layout grid derived from `DESIGN_WIDTH / PIXEL_ART_SCALE`; render output is scaled to Full HD with `PIXEL_ART_SCALE = 2`.
- Tile grid is 32x32 layout pixels, displayed as crisp 64x64 pixels at the Full HD render target.
- Recommended source tiles are 16x16 PNG displayed at 4x on the Full HD render target.
- Overworld map is 64x40 tiles.
- Normal overworld terrain now uses `src/world/semantic/semanticTerrainRenderer.ts` to generate a crisp semantic background texture from water/land/biome masks. The fixed-grid 8x8 atlas `src/assets/world/atlas_v3.png` plus `src/assets/world/atlasV3.manifest.json` remains active for raw-tile debug rendering, fallback drawing, semantic tile metadata, and selected helper visuals. The current atlas has 64 usable terrain cells; empty black cells are no longer part of the active sheet.
- Atlas source-cell edge cleanup is handled by drawing valid `atlas_v3` tiles with `ATLAS_V3_SOURCE_INSET = 3`: the source rect is cropped inward, then drawn into the full destination tile. Runtime must not blend or mutate placed-map pixels with neighboring terrain colors.
- Generated overworld POIs and ocean details can render a second object layer from `src/assets/world/world_objects.png` plus `worldObjectAtlas.manifest.json`. The object atlas is transparent PNG output from a magenta-matte source sheet and should not replace base terrain.
- Active dungeon/city terrain now uses the fixed-grid 8x8 atlas `src/assets/world/dungeon_atlas.png` plus `src/assets/world/dungeonAtlas.manifest.json` and `src/data/dungeonTiles.ts`. Runtime draws it with `DUNGEON_ATLAS_SOURCE_INSET = 3`; the atlas is opaque rectangular art and must not be run through rembg.
- Dungeon floors are 22x14 tiles.
- Current drawing functions to refine later: `drawWorldTile`, `drawDungeonTile`, `drawLocationIcon`, `drawTown`, `drawLeader`, `drawCharacterSpriteFrame`, `drawNpc`, `drawPortrait`, `drawEnemySprite`, `drawPixelCrystal`, `drawPanel`, and `drawBar` in `src/main.ts`.
- Phaser preloads the current PNG/JPEG assets in `src/main.ts`. All generated placeholders should remain as fallback paths for missing textures and unfinished asset families.
- Format target: PNG with transparency unless noted. Use lowercase snake_case filenames.

Priority scale: P1 readability-critical, P2 core gameplay polish, P3 boss/story identity, P4 optional polish.

## A. Core Tiles

Note: the individual `assets/tiles/world/*` entries below remain fallback/legacy targets. The active generated overworld renders from `atlas_v3` only:

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| atlas_v3 | src/assets/world/atlas_v3.png + atlasV3.manifest.json | World terrain atlas | 1024x1024 sheet, 8x8 grid, 128px cells | Required | P1 | Raw-tile debug/fallback terrain and semantic tile metadata | No | Runtime uses exact 8x8 cell rectangles for raw/fallback draws. Normal terrain presentation comes from the semantic terrain renderer. All 64 cells are classified as terrain. POIs render from separate marker/object art. | `drawWorldTile(tileId)`, F6 raw tiles |
| pier_atlas | src/assets/world/pier_atlas.png | Harbor/dock atlas | 1024x1024 sheet, 4x4 grid, 256px cells | Required | P2 | Generated harbor dock overlays | Partial | Runtime currently uses horizontal and vertical pier cells for harbor dock/bridge markers, with generated fallback if missing. | `drawPierDockTile` |
| world_objects | src/assets/world/world_objects.png + worldObjectAtlas.manifest.json | World object overlay atlas | 1024x1024 sheet, 8x8 grid, 128px cells | Required | P2 | Generated dungeons, landmarks, harbors, ocean details | No | Transparent object layer imported from `D:\Projects\new_artwork\world_objects_atlas.jpeg` using edge flood-fill matte removal. Contains cave/ruin/dungeon entrances, chests, shrines, wrecks, coral, harbor signs, trees, rocks, volcanoes, and crystals. | `drawWorldObjectCell`, `drawLocationIcon`, `drawWorldOverlays` |
| dungeon_atlas | src/assets/world/dungeon_atlas.png + dungeonAtlas.manifest.json | Dungeon/city tile atlas | 1024x1024 sheet, 8x8 grid, 128px cells | Required | P1 | Procedural dungeons, town/city floors/walls, shop pads | No | Opaque atlas imported from `D:\Projects\new_artwork\dungeon_atlas.jpeg`. Contains medieval stone, cave, ice, volcanic, cursed, ruin, chest, gate, stairs, switch, portal, and boss-seal cells. | `drawDungeonTile`, `drawTownFloorTile`, `drawTownWallTile`, `drawTownServicePad` |

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| tile_plains | assets/tiles/world/plains.png | World tile | 16x16 | Required | P1 | Plains terrain | Yes | Medium green base, light grass marks, low noise. | `drawWorldTile("plains")` |
| tile_forest | assets/tiles/world/forest.png | World tile | 16x16 | Required | P1 | Forest terrain | Yes | Dense dark canopy clusters; must read as higher danger than plains. | `drawWorldTile("forest")` |
| tile_hills | assets/tiles/world/hills.png | World tile | 16x16 | Required | P1 | Hills terrain | Yes | Rounded warm-brown hill shape, walkable but tougher. | `drawWorldTile("hills")` |
| tile_mountain | assets/tiles/world/mountain.png | World tile | 16x16 | Required | P1 | Blocking terrain | Yes | Sharp cool-gray peak; obvious blocker. | `drawWorldTile("mountain")` |
| tile_water_a | assets/tiles/world/water_a.png | World tile | 16x16 | Required | P1 | Shallow water | Yes | Blue water frame 1; readable waves. | `drawWorldTile("water")` |
| tile_water_b | assets/tiles/world/water_b.png | World tile | 16x16 | Optional | P4 | Water animation | Yes | Second water frame. | Future animated tile loader |
| tile_deep_water_a | assets/tiles/world/deep_water_a.png | World tile | 16x16 | Required | P1 | Deep water | Yes | Darker/navy water; distinct from shallow water. | `drawWorldTile("deepWater")` |
| tile_deep_water_b | assets/tiles/world/deep_water_b.png | World tile | 16x16 | Optional | P4 | Deep water animation | Yes | Second deep water frame. | Future animated tile loader |
| tile_sand | assets/tiles/world/sand.png | World tile | 16x16 | Required | P1 | Desert/Sunbarrow region | Yes | Ochre sand with sparse marks, not too bright. | `drawWorldTile("sand")` |
| tile_road | assets/tiles/world/road.png | World tile | 16x16 | Required | P1 | Roads/locations | Yes | Warm path, reads as safe route. | `drawWorldTile("road")` |
| tile_bridge | assets/tiles/world/bridge.png | World tile | 16x16 | Optional | P2 | Legacy/fallback water crossings | Partial | Wooden/stone bridge over water; active harbor dock visuals now use `src/assets/world/pier_atlas.png`. | Future route/bridge overlay |
| marker_town | assets/tiles/markers/town.png | Map marker | 16x16 | Required | P2 | Dawnford, Brinewick, Elderleaf, Sunbarrow | Yes | Safe settlement icon; can palette swap per town. | `drawLocationIcon(kind: "town")` |
| marker_castle | assets/tiles/markers/castle.png | Map marker | 16x16 | Required | P2 | Dawnford identity | Partial | Castle/town variant for Dawnford. | `drawLocationIcon`, location-specific later |
| marker_cave | assets/tiles/markers/cave.png | Map marker | 16x16 | Required | P2 | Moss Cave | Yes | Dark opening in stone/moss. | `drawLocationIcon(kind: "dungeon")` |
| marker_keep | assets/tiles/markers/keep.png | Map marker | 16x16 | Required | P2 | Ashen Keep | Yes | Small fortress silhouette; warm ember accent. | `drawLocationIcon`, dungeon id variant |
| marker_shrine | assets/tiles/markers/shrine.png | Map marker | 16x16 | Required | P2 | Tide Shrine | Yes | Pillars/roof; blue accent. | `drawLocationIcon`, dungeon id variant |
| marker_tower | assets/tiles/markers/tower.png | Map marker | 16x16 | Required | P2 | Skyglass Tower | Yes | Tall thin tower; cyan glass top. | `drawLocationIcon`, dungeon id variant |
| marker_port | assets/tiles/markers/port.png | Map marker | 16x16 | Optional | P3 | Brinewick/boat unlock | Yes | Dock/anchor icon if port identity gets separate marker. | Future location marker variant |
| marker_gate | assets/tiles/markers/starfall_gate.png | Map marker | 16x16 | Required | P3 | Starfall Gate | Partial | Ancient gate/star arch; bright gold accent. | `drawLocationIcon(kind: "gate")` |
| marker_final_spire | assets/tiles/markers/eclipse_spire.png | Map marker | 16x16 | Required | P3 | Eclipse Spire | No | Dark spire with violet/gold crown accent. | `drawLocationIcon(kind: "final")` |

Note: the individual dungeon tile rows below are retained as fallback/legacy asset targets. Active dungeon and city/interior tile rendering now prefers `dungeon_atlas`.

| dungeon_floor_moss | assets/tiles/dungeons/floor_moss.png | Dungeon floor | 16x16 | Required | P1 | Moss Cave | Yes | Stone/soil with moss accent. | `drawDungeonTile(".")`, Moss palette |
| dungeon_floor_fire | assets/tiles/dungeons/floor_fire.png | Dungeon floor | 16x16 | Required | P2 | Ashen Keep | Yes | Dark charred stone, small ember cracks. | `drawDungeonTile(".")`, Ashen palette |
| dungeon_floor_tide | assets/tiles/dungeons/floor_tide.png | Dungeon floor | 16x16 | Required | P2 | Tide Shrine | Yes | Wet teal stone, light edge. | `drawDungeonTile(".")`, Tide palette |
| dungeon_floor_gale | assets/tiles/dungeons/floor_gale.png | Dungeon floor | 16x16 | Required | P2 | Skyglass Tower | Yes | Slate/glass stone, cyan highlight. | `drawDungeonTile(".")`, Gale palette |
| dungeon_floor_eclipse | assets/tiles/dungeons/floor_eclipse.png | Dungeon floor | 16x16 | Required | P3 | Eclipse Spire | Yes | Dark violet floor, faint star flecks. | `drawDungeonTile(".")`, Eclipse palette |
| dungeon_wall_base | assets/tiles/dungeons/wall_base.png | Dungeon wall | 16x16 | Required | P1 | Blocking dungeon tiles | Yes | Solid wall form; tint per dungeon. | `drawDungeonTile("#")` |
| dungeon_gate_closed | assets/tiles/dungeons/gate_closed.png | Dungeon object | 16x16 | Required | P2 | Puzzle gate | Yes | Closed door/gate, clearly blocked. | `drawDungeonTile("D")` |
| dungeon_gate_open | assets/tiles/dungeons/gate_open.png | Dungeon object | 16x16 | Required | P2 | Open puzzle gate | Yes | Open/passable gate; should not look blocked. | `drawDungeonTile("D")` with flag |
| dungeon_stairs | assets/tiles/dungeons/stairs.png | Dungeon object | 16x16 | Required | P2 | Floor transitions | Yes | Down/up stairs; reads instantly at 2x. | `drawDungeonTile("S")` |
| dungeon_exit | assets/tiles/dungeons/exit.png | Dungeon object | 16x16 | Required | P2 | Dungeon exit | Yes | Dark doorway/exit, distinct from wall. | `drawDungeonTile("E")` |
| chest_closed | assets/tiles/objects/chest_closed.png | Object tile | 16x16 | Required | P2 | Treasure chests | Partial | Warm chest with bright lock. | `drawDungeonTile("C")` |
| chest_open | assets/tiles/objects/chest_open.png | Object tile | 16x16 | Required | P2 | Opened chests after loader supports state art | Partial | Same chest opened. | Future opened chest render |
| switch_floor | assets/tiles/objects/switch_floor.png | Object tile | 16x16 | Required | P2 | Dungeon switch | Yes | Pedestal/switch; bright enough to find. | `drawDungeonTile("K")` |
| boss_relic_seal | assets/tiles/objects/boss_relic_seal.png | Object tile | 16x16 | Required | P3 | Boss tile/relic marker | Yes | Glowing seal/star pillar. | `drawDungeonTile("B")` |

## B. Player And NPC Sprites

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| class_fighter_sheet | assets_v2/characters/classes/fighter_normalized.png | Class sheet | 3520x1024 sheet, 704x512 frames | Required | P1 | Arlen/fighter exploration leader and battle sprite | No | 5x2 normalized alpha sheet with fixed anchor/baseline metadata. | `drawLeader`, `drawPartyBattler` |
| class_priest_sheet | assets_v2/characters/classes/priest_normalized.png | Class sheet | 3520x1024 sheet, 704x512 frames | Required | P1 | Mira/priest battle sprite | No | 5x2 normalized alpha sheet with fixed anchor/baseline metadata. | `drawPartyBattler` |
| class_wizard_sheet | assets_v2/characters/classes/wizard_normalized.png | Class sheet | 3520x1024 sheet, 704x512 frames | Required | P1 | Kael/wizard battle sprite | No | 5x2 normalized alpha sheet with fixed anchor/baseline metadata. | `drawPartyBattler` |
| npc_guard | assets/characters/npc_guard.png | NPC sheet | 32x64 sheet | Required | P2 | Dawnford guard/scout | Yes | Reusable armored town NPC. | `drawNpc`, town NPC id variant |
| npc_merchant | assets/characters/npc_merchant.png | NPC sheet | 32x64 sheet | Required | P2 | Shops/trader/harbormaster | Yes | Reusable apron/hat merchant. | `drawNpc`, town NPC id variant |
| npc_elder | assets/characters/npc_elder.png | NPC sheet | 32x64 sheet | Required | P2 | King, druid, gatekeeper | Yes | Robed elder/quest giver. | `drawNpc`, town NPC id variant |
| npc_villager | assets/characters/npc_villager.png | NPC sheet | 32x64 sheet | Required | P2 | Generic townsfolk | Yes | Simple civilian. | `drawNpc`, town NPC id variant |
| npc_sage | assets/characters/npc_sage.png | NPC sheet | 32x64 sheet | Optional | P3 | Magic/Starfall hints | Yes | Robed sage variant. | Future NPC variant |
| vehicle_boat | assets/characters/vehicle_boat.png | Vehicle sprite | 16x16 | Required | P3 | Boat unlock/overworld status | Yes | Small skiff icon; can display instead of leader on water later. | Future world player render |
| vehicle_skyship | assets/characters/vehicle_skyship.png | Vehicle sprite | 24x16 | Required | P3 | Skyship unlock/final route | Partial | Tiny glass/cedar flying craft; fits 32px tile. | Future world player render |

## C. Battle Character Assets

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| battle_arlen_portrait | assets/portraits/battle_arlen.png | Battle portrait | 32x40 | Required | P2 | Battle party column | No | Strong vanguard face/torso, red cloak. | `drawPortrait(arlen)` |
| battle_mira_portrait | assets/portraits/battle_mira.png | Battle portrait | 32x40 | Required | P2 | Battle party column | No | Kind healer, pale/green/white. | `drawPortrait(mira)` |
| battle_kael_portrait | assets/portraits/battle_kael.png | Battle portrait | 32x40 | Required | P2 | Battle party column | No | Ember mage, angular hair/hood. | `drawPortrait(kael)` |
| class_attack_frames | assets_v2/characters/classes/*_normalized.png | Battle attack frames | 5x2 sheet cells 0-1 | Required | P1 | Party attack windup/release | No | Uses `attack_windup_left` then `attack_release_left` from `src/data/characterSprites.ts`. | `drawPartyBattler` |
| battle_down_overlay | assets/effects/status_down.png | Status overlay | 16x16 | Optional | P4 | Fallen character indicator | Yes | Small dim/cross/star marker if needed. | Future portrait overlay |

## D. Enemy Sprites

Normal enemies can share base forms: blob, beast, wing, knight, serpent. Bosses should be unique.

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| enemy_slimebud | assets/enemies/slimebud.png | Enemy blob | 48x48 | Required | P1 | Plains | Shares blob | Plant slime with leaf nubs. | `drawEnemySprite`, `ENEMIES.slimebud` |
| enemy_bristle_rat | assets/enemies/bristle_rat.png | Enemy beast | 48x48 | Required | P1 | Plains | Shares beast | Low rodent body, bristles, tan/brown. | `ENEMIES.bristleRat` |
| enemy_field_imp | assets/enemies/field_imp.png | Enemy beast | 48x48 | Required | P1 | Plains | Shares beast | Small mischievous imp, purple/shadow accent. | `ENEMIES.fieldImp` |
| enemy_thorn_wisp | assets/enemies/thorn_wisp.png | Enemy wing | 48x48 | Required | P1 | Forest | Shares wing | Floating thorn/light shape, green glow. | `ENEMIES.thornWisp` |
| enemy_mossling | assets/enemies/mossling.png | Enemy blob | 48x48 | Required | P1 | Forest | Shares blob | Stockier moss blob, leafy top. | `ENEMIES.mossling` |
| enemy_venom_moth | assets/enemies/venom_moth.png | Enemy wing | 48x48 | Required | P1 | Forest | Shares wing | Moth silhouette, poison green wings. | `ENEMIES.venomMoth` |
| enemy_pebble_gnawer | assets/enemies/pebble_gnawer.png | Enemy beast | 48x48 | Required | P1 | Cave/Moss Cave | Shares beast | Stone-toothed burrower. | `ENEMIES.pebbleGnawer` |
| enemy_cave_bat | assets/enemies/cave_bat.png | Enemy wing | 48x48 | Required | P1 | Cave/Moss Cave | Shares wing | Bat with wide wings, dark purple. | `ENEMIES.caveBat` |
| enemy_iron_beetle | assets/enemies/iron_beetle.png | Enemy knight | 48x48 | Required | P1 | Cave/Moss Cave | Shares knight/shell | Armored beetle, metallic shell. | `ENEMIES.ironBeetle` |
| enemy_cinder_pup | assets/enemies/cinder_pup.png | Enemy beast | 48x48 | Required | P2 | Ashen Keep | Shares beast | Fire hound, ember paws. | `ENEMIES.cinderPup` |
| enemy_ash_sprite | assets/enemies/ash_sprite.png | Enemy wing | 48x48 | Required | P2 | Ashen Keep | Shares wing | Floating flame/ash spirit. | `ENEMIES.ashSprite` |
| enemy_coal_knight | assets/enemies/coal_knight.png | Enemy knight | 48x48 | Required | P2 | Ashen Keep | Shares knight | Charcoal armor, orange cracks. | `ENEMIES.coalKnight` |
| enemy_reef_fang | assets/enemies/reef_fang.png | Enemy beast | 48x48 | Required | P2 | Tide Shrine | Shares beast | Aquatic fang creature, blue/coral. | `ENEMIES.reefFang` |
| enemy_bubble_eye | assets/enemies/bubble_eye.png | Enemy blob | 48x48 | Required | P2 | Tide Shrine | Shares blob | Floating eye bubble, watery outline. | `ENEMIES.bubbleEye` |
| enemy_drowned_husk | assets/enemies/drowned_husk.png | Enemy knight | 48x48 | Required | P2 | Tide Shrine | Shares knight | Waterlogged undead armor. | `ENEMIES.drownedHusk` |
| enemy_sky_mite | assets/enemies/sky_mite.png | Enemy wing | 48x48 | Required | P2 | Skyglass Tower | Shares wing | Tiny sky insect, cyan wings. | `ENEMIES.skyMite` |
| enemy_gale_harpy | assets/enemies/gale_harpy.png | Enemy wing | 64x64 | Required | P2 | Skyglass Tower | Shares wing | Humanoid bird silhouette, readable claws. | `ENEMIES.galeHarpy` |
| enemy_glass_roc | assets/enemies/glass_roc.png | Enemy wing | 64x64 | Required | P2 | Skyglass Tower | Shares wing | Large crystal bird, pale cyan highlights. | `ENEMIES.glassRoc` |
| enemy_eclipse_shade | assets/enemies/eclipse_shade.png | Enemy blob | 48x48 | Required | P3 | Eclipse Spire | Shares blob | Shadow mass with pale eyes. | `ENEMIES.eclipseShade` |
| enemy_crown_guard | assets/enemies/crown_guard.png | Enemy knight | 64x64 | Required | P3 | Eclipse Spire | Shares knight | Tall royal shadow guard, gold accent. | `ENEMIES.crownGuard` |
| enemy_void_serpent | assets/enemies/void_serpent.png | Enemy serpent | 64x64 | Required | P3 | Eclipse Spire | Shares serpent | Coiling void snake, bright eye. | `ENEMIES.voidSerpent` |
| boss_rootbound_troll | assets/enemies/boss_rootbound_troll.png | Boss | 96x96 | Required | P3 | Moss Cave boss | No | Hunched troll with root horns/moss arms. | `ENEMIES.rootboundTroll` |
| boss_ember_tyrant | assets/enemies/boss_ember_tyrant.png | Boss | 96x96 | Required | P3 | Ashen Keep boss | No | Crowned flame knight/tyrant, not generic knight. | `ENEMIES.emberTyrant` |
| boss_tide_oracle | assets/enemies/boss_tide_oracle.png | Boss | 96x96 | Required | P3 | Tide Shrine boss | No | Masked oracle with tide halo. | `ENEMIES.tideOracle` |
| boss_gale_chimera | assets/enemies/boss_gale_chimera.png | Boss | 96x96 | Required | P3 | Skyglass Tower boss | No | Three-part aerial beast, broad wings. | `ENEMIES.galeChimera` |
| boss_eclipse_crown | assets/enemies/boss_eclipse_crown.png | Boss | 96x96 or 128x96 | Required | P3 | Final boss | No | Floating crown/shadow body, iconic final silhouette. | `ENEMIES.eclipseCrown` |

## E. UI Assets

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| ui_window_panel | assets/ui/window_panel_9slice.png | UI frame | 48x48 9-slice | Required | P1 | Menus, HUD, dialogue, battle panels | Partial | Dark navy fill, crisp border; preserve text contrast. | `drawPanel` |
| ui_cursor_arrow | assets/ui/cursor_arrow.png | UI cursor | 8x8 | Required | P1 | Menus/battle command selector | Yes | Simple bright arrow/star; no animation required. | Text cursor `>` |
| ui_hp_bar | assets/ui/bar_hp.png | UI bar | 64x8 | Required | P2 | Party/enemy HP bars | Yes | Could be 9-slice/fill cap. | `drawBar` |
| ui_status_bar_empty | assets/ui/bar_empty.png | UI bar | 64x8 | Required | P2 | Bar background | Yes | Dark backing and border. | `drawBar` |
| ui_gold_icon | assets/ui/icon_gold.png | UI icon | 16x16 | Optional | P3 | Gold display/shop menus | Yes | Coin/star coin. | Future HUD/shop text enhancement |
| ui_item_icon | assets/ui/icon_item.png | UI icon | 16x16 | Optional | P3 | Generic inventory marker | Yes | Small pack/bottle. | Future menu enhancement |
| ui_save_icon | assets/ui/icon_save.png | UI icon | 16x16 | Optional | P4 | Save menu/load slot | Yes | Simple star-seal/book. | Future menu enhancement |
| ui_title_frame | assets/ui/title_frame.png | UI decoration | 320x64 | Optional | P3 | Title logo support | Partial | Minimal decorative underline/frame, not ornate. | `drawTitle` |
| ui_victory_frame | assets/ui/victory_frame.png | UI decoration | 320x96 | Optional | P4 | Ending/victory screens | Partial | Small celebratory border. | `drawEnding`/battle victory future |

## F. Item And Equipment Icons

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| icon_potion | assets/icons/items/potion.png | Item icon | 16x16 | Required | P2 | Potion | Yes | Red/green bottle. | `ITEMS.potion`, future item menu |
| icon_antidote | assets/icons/items/antidote.png | Item icon | 16x16 | Required | P2 | Antidote | Yes | Leaf vial, poison-cure read. | `ITEMS.antidote` |
| icon_phoenix_ash | assets/icons/items/phoenix_ash.png | Item icon | 16x16 | Required | P2 | Phoenix Ash | Partial | Small ash jar with warm spark. | `ITEMS.phoenixAsh` |
| icon_etherleaf | assets/icons/items/etherleaf.png | Item icon | 16x16 | Required | P2 | Etherleaf | Yes | Blue-green magic leaf. | `ITEMS.etherleaf` |
| icon_tent | assets/icons/items/tent.png | Item icon | 16x16 | Required | P2 | Tent | Yes | Tiny camp tent. | `ITEMS.tent` |
| icon_smoke_bomb | assets/icons/items/smoke_bomb.png | Item icon | 16x16 | Required | P2 | Smoke Bomb | Yes | Dark sphere with smoke curl. | `ITEMS.smokeBomb` |
| icon_weapon_blade | assets/icons/equipment/weapon_blade.png | Equipment icon | 16x16 | Required | P2 | Training Blade, Iron Saber, Starbrand | Yes | Category icon, not unique per blade. | `WEAPONS.*` menus |
| icon_weapon_rod | assets/icons/equipment/weapon_rod.png | Equipment icon | 16x16 | Required | P2 | Willow Rod, Glass Wand, Ember Staff | Yes | Staff/rod category. | `WEAPONS.*` menus |
| icon_armor_mail | assets/icons/equipment/armor_mail.png | Equipment icon | 16x16 | Required | P2 | Ring Mail, Tide Plate | Yes | Armor category. | `ARMORS.*` menus |
| icon_armor_cloak | assets/icons/equipment/armor_cloak.png | Equipment icon | 16x16 | Required | P2 | Travel Cloth, Sage Mantle, Gale Cloak | Yes | Cloth/cloak category. | `ARMORS.*` menus |
| icon_key_switch | assets/icons/key_switch.png | Key/puzzle icon | 16x16 | Optional | P3 | Puzzle message or future inventory | Yes | Small switch/key sigil. | Future UI |
| icon_relic_root | assets/icons/relics/root_relic.png | Relic icon | 16x16 | Required | P3 | Root flag/story/status | No | Green root star. | Relic HUD future |
| icon_relic_flame | assets/icons/relics/flame_relic.png | Relic icon | 16x16 | Required | P3 | Flame flag/story/status | No | Orange flame star. | Relic HUD future |
| icon_relic_tide | assets/icons/relics/tide_relic.png | Relic icon | 16x16 | Required | P3 | Tide flag/story/status | No | Blue tide star. | Relic HUD future |
| icon_relic_gale | assets/icons/relics/gale_relic.png | Relic icon | 16x16 | Required | P3 | Gale flag/story/status | No | Cyan wind star. | Relic HUD future |

## G. Magic And Effect Assets

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| fx_hit_slash | assets/effects/hit_slash.png | Effect sheet | 4 frames, 32x32 each | Required | P2 | Attack hit | Yes | White/yellow slash flash. | Battle action feedback future |
| fx_heal | assets/effects/heal.png | Effect sheet | 4 frames, 32x32 each | Required | P2 | Mend/Mendall/Revive | Yes | Rising light motes. | `SPELLS.mend`, `mendall`, `revive` |
| fx_fire | assets/effects/fire.png | Effect sheet | 4 frames, 32x32 each | Required | P2 | Ember/fire moves | Yes | Small flame burst. | `SPELLS.ember`, fire enemy moves |
| fx_ice | assets/effects/ice.png | Effect sheet | 4 frames, 32x32 each | Required | P2 | Frost/tide moves | Yes | Ice shards, cyan. | `SPELLS.frost`, ice moves |
| fx_lightning | assets/effects/lightning.png | Effect sheet | 4 frames, 32x32 each | Required | P2 | Spark/lightning weakness | Yes | Jagged bolt. | `SPELLS.spark` |
| fx_earth | assets/effects/earth.png | Effect sheet | 4 frames, 32x32 each | Required | P2 | Quakelet/earth moves | Yes | Ground crack/rock pop. | `SPELLS.quakelet` |
| fx_wind | assets/effects/wind.png | Effect sheet | 4 frames, 32x32 each | Required | P2 | Storm/gale moves | Yes | Curved gust arcs. | `SPELLS.storm` |
| fx_light | assets/effects/light.png | Effect sheet | 4 frames, 32x32 each | Required | P2 | Glow/Star Relic effects | Yes | Starburst, white/gold. | `SPELLS.glow` |
| fx_shadow | assets/effects/shadow.png | Effect sheet | 4 frames, 32x32 each | Required | P3 | Shadow/Eclipse moves | Yes | Dark violet pulse. | Final enemies/boss |
| fx_poison | assets/effects/poison.png | Effect sheet | 4 frames, 24x24 each | Required | P2 | Poison status | Yes | Green bubbles/dust. | Status feedback future |
| fx_sleep | assets/effects/sleep.png | Effect sheet | 4 frames, 24x24 each | Required | P2 | Sleep status | Yes | Small floating moons/stars. | Status feedback future |
| fx_ward | assets/effects/ward.png | Effect sheet | 4 frames, 32x32 each | Required | P2 | Ward/Starveil/Defend | Yes | Shield ring, pale blue/gold. | `SPELLS.ward`, `starveil`, defend |
| fx_boss_death | assets/effects/boss_death.png | Effect sheet | 6 frames, 64x64 each | Optional | P4 | Boss defeat | Partial | Large dissolve/star crack. | Boss victory future |
| fx_relic_restore | assets/effects/relic_restore.png | Effect sheet | 6 frames, 64x64 each | Required | P3 | Relic restored messages | Partial | Four-star flare style. | Boss victory/relic future |

## H. Portraits And Dialogue

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| portrait_arlen | assets/portraits/dialogue_arlen.png | Dialogue portrait | 64x64 | Optional | P3 | Story/dialogue if UI adds portraits | No | Determined front-line traveler. | Future dialogue UI |
| portrait_mira | assets/portraits/dialogue_mira.png | Dialogue portrait | 64x64 | Optional | P3 | Story/dialogue if UI adds portraits | No | Calm healer/protector. | Future dialogue UI |
| portrait_kael | assets/portraits/dialogue_kael.png | Dialogue portrait | 64x64 | Optional | P3 | Story/dialogue if UI adds portraits | No | Curious ember mage. | Future dialogue UI |
| portrait_king_rovan | assets/portraits/dialogue_king_rovan.png | Dialogue portrait | 64x64 | Optional | P3 | Dawnford intro | No | Quest-giver elder/king. | Future dialogue UI |
| portrait_generic_npc | assets/portraits/dialogue_generic_npc.png | Dialogue portrait | 64x64 | Optional | P4 | Generic hints | Yes | One reusable villager portrait. | Future dialogue UI |

## I. Title And Branding

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| title_logo | assets/title/title_logo.png | Logo | 420x96 | Required | P3 | Title screen | No | Original readable pixel logo; no franchise mimicry. | `drawTitle` text logo |
| title_stars_bg | assets/title/title_stars_bg.png | Background | 1920x1080, 16:9 | Optional | P3 | Title screen | Partial | Sparse starfield similar to current, less noisy. | `drawTitle` star loop |
| title_four_crystals | assets/title/four_star_relics.png | Title decoration | 192x64 | Required | P3 | Title/ending/relic motif | Partial | Four original crystal/star shapes. | `drawPixelCrystal` |
| title_selector | assets/title/title_selector.png | Selector | 16x16 | Optional | P4 | Start/load selector | Yes | Reuse UI cursor if desired. | Title cursor text |

## J. Map Polish Assets

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| polish_water_overlay | assets/tiles/overlays/water_overlay.png | Overlay sheet | 3 frames, 16x16 each | Optional | P4 | Animated water | Yes | Use only if not using water tile frame swaps. | Future tile animation |
| polish_chest_sparkle | assets/effects/chest_sparkle.png | Effect sheet | 4 frames, 16x16 each | Optional | P4 | Unopened chest hint | Yes | Subtle sparkle; do not overuse. | Future chest render |
| polish_town_smoke | assets/effects/town_smoke.png | Effect sheet | 4 frames, 16x16 each | Optional | P4 | Town markers/interiors | Yes | Tiny chimney smoke. | Future location polish |
| polish_dungeon_torch | assets/effects/dungeon_torch.png | Effect sheet | 4 frames, 16x16 each | Optional | P4 | Dungeon walls/entrances | Yes | Small flame/cyan variant per dungeon. | Future dungeon overlay |

## K. Town And Interior Assets

The current Dawnford/town screen uses generated readable counters, signs, props, walls, floors, and exits. That generated pass is a fallback-quality visual improvement, not the final town asset set. Add these real assets in a future batch before polishing more town content.

| Asset ID | Filename | Category | Size | Req | Priority | Used In | Tint/Recolor | Artist Notes | Replacement Target |
|---|---|---:|---:|---|---|---|---|---|---|
| town_floor | assets/tiles/town/town_floor.png | Town tile | 16x16 | Required | P1 | Town/interior floor | Yes | Warm readable stone/wood floor; avoid low-contrast empty fields. | `drawTownFloorTile` |
| town_wall | assets/tiles/town/town_wall.png | Town tile | 16x16 | Required | P1 | Town/interior walls | Yes | Clear wall blocks/bricks; must separate room bounds from floor. | `drawTownWallTile` |
| town_exit_gate | assets/tiles/town/town_exit_gate.png | Town object | 32x32 or 48x32 | Required | P1 | South town exit | Partial | Bright doorway/gate; must read as the exit immediately. | `drawTownExit` |
| service_inn | assets/tiles/town/service_inn.png | Service object | 48x48 or 64x48 | Required | P1 | Inn service marker | Partial | Counter/kiosk plus bed/moon motif; leave text as live UI. | `drawTownService("inn")` |
| service_items | assets/tiles/town/service_items.png | Service object | 48x48 or 64x48 | Required | P1 | Item shop marker | Partial | Counter/kiosk plus potion/bag motif; leave text as live UI. | `drawTownService("item")` |
| service_arms | assets/tiles/town/service_arms.png | Service object | 48x48 or 64x48 | Required | P1 | Arms shop marker | Partial | Counter/kiosk plus sword/shield motif; leave text as live UI. | `drawTownService("arms")` |
| service_magic | assets/tiles/town/service_magic.png | Service object | 48x48 or 64x48 | Required | P1 | Magic shop marker | Partial | Counter/kiosk plus star/book motif; leave text as live UI. | `drawTownService("magic")` |
| service_clinic | assets/tiles/town/service_clinic.png | Service object | 48x48 or 64x48 | Required | P1 | Clinic marker | Partial | Counter/kiosk plus heal/cross/sun motif; leave text as live UI. | `drawTownService("clinic")` |
| prop_table | assets/tiles/town/prop_table.png | Town prop | 16x16 or 32x16 | Optional | P2 | Town decor | Yes | Simple table/counter shape, readable at 2x. | `drawTownDecor` |
| prop_crate | assets/tiles/town/prop_crate.png | Town prop | 16x16 | Optional | P2 | Town decor | Yes | Crate with clear edges; avoid cluttering paths. | `drawTownDecor` |
| prop_barrel | assets/tiles/town/prop_barrel.png | Town prop | 16x16 | Optional | P2 | Town decor | Yes | Barrel with strong rim and highlight. | `drawTownDecor` |
| prop_lamp | assets/tiles/town/prop_lamp.png | Town prop | 16x16 | Optional | P2 | Town decor | Yes | Warm lamp/torch glow, subtle and nonblocking. | `drawTownLamp` |
| prop_rug | assets/tiles/town/prop_rug.png | Town prop | 32x48 or tileable 16x16 | Optional | P2 | Town decor | Yes | Muted rug/path highlight; must not hide actors. | `drawTownRug` |

## Reuse And Tint Strategy

- Use one 16x16 tile base for dungeon floors and walls, then palette/tint for Moss, Ashen, Tide, Gale, and Eclipse.
- Use one closed/open chest pair everywhere.
- Use one switch and gate pair everywhere, tinted per dungeon if needed.
- Use five normal enemy base forms: blob, beast, wing, knight, serpent. Recolor and edit silhouettes for the 21 normal enemies.
- Use category icons for weapons and armor instead of one icon per item.
- Use one window frame and one cursor across the entire game.
- Use shared magic effect forms by element, not one animation per spell.

## Working Checklist

### Phase 1: Readability-Critical Assets

- [ ] `assets/tiles/world/plains.png`
- [ ] `assets/tiles/world/forest.png`
- [ ] `assets/tiles/world/hills.png`
- [ ] `assets/tiles/world/mountain.png`
- [ ] `assets/tiles/world/water_a.png`
- [ ] `assets/tiles/world/deep_water_a.png`
- [ ] `assets/tiles/world/sand.png`
- [ ] `assets/tiles/world/road.png`
- [x] `assets_v2/characters/classes/fighter_normalized.png`
- [x] `assets_v2/characters/classes/priest_normalized.png`
- [x] `assets_v2/characters/classes/wizard_normalized.png`
- [ ] `assets/ui/window_panel_9slice.png`
- [ ] `assets/ui/cursor_arrow.png`
- [ ] Normal enemy base set: blob, beast, wing, knight, serpent
- [ ] First area enemies: Slimebud, Bristle Rat, Field Imp, Pebble Gnawer, Cave Bat, Iron Beetle

### Phase 2: Core Gameplay Polish

- [ ] Town/castle/cave/keep/shrine/tower/gate/final markers
- [ ] Real town/interior floor, wall, exit, service, and prop assets from section K
- [ ] Dungeon floor/wall tiles
- [ ] Chests, doors/gates, stairs, switches, exit, boss seal
- [ ] Item and category equipment icons
- [ ] Element spell effect sheets
- [ ] Battle character portraits

### Phase 3: Boss And Story Identity

- [ ] Rootbound Troll
- [ ] Ember Tyrant
- [ ] Tide Oracle
- [ ] Gale Chimera
- [ ] Eclipse Crown
- [ ] Four relic icons
- [ ] Arlen, Mira, Kael dialogue portraits
- [ ] King Rovan portrait
- [ ] Title logo and four relic decoration

### Phase 4: Optional Polish

- [ ] Extra water animation frame
- [ ] Extra tile variants only where readability improves
- [ ] Chest sparkle
- [ ] Town smoke
- [ ] Dungeon torch
- [ ] Extra NPC variants
- [ ] Boss death and relic restore animation polish
