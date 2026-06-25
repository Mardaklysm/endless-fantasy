# New Artwork Inventory

Source root: `D:\Projects\new_artwork`

Extraction output: `D:\Projects\Endless Fantasy\src\assets`

Tools:

- ImageMagick: `D:\tools\ImageMagick\magick.exe`
- rembg path used: `D:\tools\rembg\venv_rembg\Scripts\rembg.exe`
- rembg model used: `birefnet-general`
- rembg command used: `"D:\tools\rembg\venv_rembg\Scripts\rembg.exe" p -m birefnet-general "D:\tools\rembg\bg_input\endless_fantasy" "D:\tools\rembg\bg_output\endless_fantasy"`
- ONNX Runtime providers from the exact rembg venv: `DmlExecutionProvider`, `CPUExecutionProvider`; AMD/Windows acceleration was available through DirectML.
- Do not use NVIDIA/CUDA checks for this project.

No ZIP files were present in `D:\Projects\new_artwork`, so nothing was extracted into `D:\Projects\new_artwork_extracted`.

## Source Images

| File | Size | Contents | Runtime extraction | Difficulty | Background / labels / panels |
|---|---:|---|---|---|---|
| `00_original_collages/a_clean_collage_grid_style_image_composed_of_six_p_10_batch_9.png` | 1448x1086 | Background collage master | Source only | High | Multi-panel collage with borders |
| `00_original_collages/a_clean_flat_neutral_light_gray_beige_background_9_batch_8.png` | 1448x1086 | Boss roster source | Source only; `06_enemies/bosses/boss_roster_master.png` used instead | High | Neutral background, multiple bosses |
| `00_original_collages/a_clean_flat_presentation_of_pixel_art_game_asset_5_batch_4.png` | 1254x1254 | Warrior character master | Source only; organized character sheet used | Medium | Labels and multiple asset types |
| `00_original_collages/a_clean_flat_studio_style_sprite_sheet_tileset_3_batch_2.png` | 1448x1086 | Interior props master source | Source only; `02_props/interior_props_master.png` used | Medium | Neutral sheet background |
| `00_original_collages/a_clean_game_art_sprite_sheet_character_concept_6_batch_5.png` | 1254x1254 | Cleric character master | Source only; organized character sheet used | Medium | Labels and multiple asset types |
| `00_original_collages/a_clean_game_art_sprite_sheet_style_image_on_a_8_batch_7.png` | 1448x1086 | Common monster roster source | Source only; organized monster roster used | Medium | Labels under sprites |
| `00_original_collages/a_clean_game_ui_asset_sheet_on_a_light_gray_tan_ba_4_batch_3.png` | 1448x1086 | UI master source | Source only; `03_ui/battle_ui_master.png` used | Medium | Labels and sample text |
| `00_original_collages/a_clean_pixel_art_sprite_sheet_game_asset_image_7_batch_6.png` | 1254x1254 | Mage character master | Source only; organized character sheet used | Medium | Labels and multiple asset types |
| `00_original_collages/a_high_resolution_pixel_art_game_tileset_sprit_2_batch_1.png` | 1448x1086 | Full world tileset master | Source only; organized tileset used | Medium | Labels and multiple groups |
| `00_original_collages/a_single_image_a_pixel_art_style_game_asset_styl_1.png` | 1448x1086 | Original broad collage | Source only | High | Mixed assets and labels |
| `01_tilesets/coast_river_cliff_sheet.png` | 1448x260 | Coast, river, cliff transition sheet | Source only for this pass | High | Useful future tiles, not needed for current terrain renderer |
| `01_tilesets/location_ancient_gate.png` | 175x185 | Pre-separated ancient gate marker | Source only | Medium | Pre-cut had risk of adjacent remnants; master crop used instead |
| `01_tilesets/location_castle.png` | 200x210 | Pre-separated castle marker | Source only | Medium | Pre-cut had visible remnant risk; master crop used instead |
| `01_tilesets/location_cave.png` | 160x158 | Pre-separated cave marker | Source only | Medium | Pre-cut had visible remnant risk; master crop used instead |
| `01_tilesets/location_dark_spire.png` | 166x240 | Pre-separated dark spire marker | Source only | Medium | Pre-cut had visible remnant risk; master crop used instead |
| `01_tilesets/location_keep.png` | 196x212 | Pre-separated keep marker | Source only | Medium | Pre-cut had visible remnant risk; master crop used instead |
| `01_tilesets/location_markers_sheet.png` | 1448x346 | Marker sheet | Source only | Medium | Labels/panels; full master had cleaner component boxes |
| `01_tilesets/location_port.png` | 150x167 | Pre-separated port marker | Source only | Medium | Pre-cut had visible remnant risk; master crop used instead |
| `01_tilesets/location_shrine.png` | 160x176 | Pre-separated shrine marker | Source only | Medium | Pre-cut had visible remnant risk; master crop used instead |
| `01_tilesets/location_tower.png` | 130x209 | Pre-separated tower marker | Source only | Medium | Pre-cut had visible remnant risk; master crop used instead |
| `01_tilesets/location_town.png` | 147x155 | Pre-separated town marker | Source only | Medium | Pre-cut had visible remnant risk; master crop used instead |
| `01_tilesets/world_terrain_sheet.png` | 1448x520 | Terrain tile sheet | Extracted world terrain and bridge | Medium | Labels excluded by manual crops; terrain kept opaque rectangular |
| `01_tilesets/world_tileset_master.png` | 1448x1086 | Full world tileset plus markers | Extracted clean marker crops | Medium | Labels excluded; neutral background color-keyed for markers |
| `02_props/interior_props_master.png` | 1448x1086 | Removed generated-town interior source | Obsolete; generated town interiors were removed | Medium | Neutral background; no runtime extraction |
| `03_ui/battle_ui_master.png` | 1448x1086 | Battle UI windows, bars, cursors, buttons, icons | Extracted panel source, cursor, bars, buttons, reference windows | Medium | Labels and sample text excluded where possible; sample-window crops are source/reference only in code |
| `04_characters/cleric/battle_sprite.png` | 468x501 | Pre-separated cleric battle sprite | Source only | High | Contains label/background issues; master crop used instead |
| `04_characters/cleric/cleric_master_sheet.png` | 1254x1254 | Cleric/Mira map frames, portrait, battle sprite | Extracted Mira portrait and battle sprite | Medium | Labels avoided by manual crops |
| `04_characters/cleric/map_sprite_sheet.png` | 460x1100 | Cleric/Mira map frame sheet | Extracted `mira_map.png` | Medium | Neutral background; color-key chosen over rembg |
| `04_characters/cleric/portrait.png` | 498x530 | Pre-separated cleric portrait | Source only | Medium | Master crop used for consistent sizing |
| `04_characters/mage/battle_sprite.png` | 513x496 | Pre-separated mage battle sprite | Source only | High | Contains label/background issues; master crop used instead |
| `04_characters/mage/mage_master_sheet.png` | 1254x1254 | Mage/Kael map frames, portrait, battle sprite | Extracted Kael portrait and battle sprite | Medium | Labels avoided by manual crops |
| `04_characters/mage/map_sprite_sheet.png` | 465x1105 | Mage/Kael map frame sheet | Extracted `kael_map.png` | Medium | Neutral background; color-key chosen over rembg |
| `04_characters/mage/portrait.png` | 485x486 | Pre-separated mage portrait | Source only | Medium | Master crop used for consistent sizing |
| `04_characters/warrior/battle_sprite.png` | 550x502 | Pre-separated warrior battle sprite | Source only | High | Label and sword-edge cut risk; master crop used instead |
| `04_characters/warrior/map_sprite_sheet.png` | 465x1095 | Warrior/Arlen map frame sheet | Extracted `arlen_map.png` | Medium | Neutral background; color-key chosen over rembg |
| `04_characters/warrior/portrait.png` | 453x490 | Pre-separated warrior portrait | Source only | Medium | Master crop used for consistent sizing |
| `04_characters/warrior/warrior_master_sheet.png` | 1254x1254 | Warrior/Arlen map frames, portrait, battle sprite | Extracted Arlen portrait and battle sprite | Medium | Labels avoided by manual crops |
| `05_enemies/common/ash_sprite.png` | 100x220 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `05_enemies/common/bristle_rat.png` | 228x176 | Pre-separated enemy | Source only | High | Bad crop/truncation visible; roster crop used |
| `05_enemies/common/cave_bat.png` | 247x255 | Pre-separated enemy | Source only | High | Bad crop/remnant risk; roster crop used |
| `05_enemies/common/cinder_pup.png` | 214x238 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `05_enemies/common/coal_knight.png` | 262x281 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `05_enemies/common/field_imp.png` | 280x195 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `05_enemies/common/iron_beetle.png` | 285x233 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `05_enemies/common/monster_roster_master.png` | 1448x1086 | Twelve common enemies | Extracted first twelve common enemies | Medium | Labels excluded by manual crops; color-key chosen over rembg |
| `05_enemies/common/mossling.png` | 216x250 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `05_enemies/common/pebble_gnawer.png` | 300x245 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `05_enemies/common/slimebud.png` | 151x118 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `05_enemies/common/thorn_wisp.png` | 188x168 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `05_enemies/common/venom_moth.png` | 235x250 | Pre-separated enemy | Source only | High | Pre-cut not trusted; roster crop used |
| `06_enemies/bosses/boss_roster_master.png` | 1448x1086 | Five boss sprites | Extracted all five game boss sprites with original ID mapping | Medium | Neutral background; color-key chosen over rembg |
| `06_enemies/bosses/eclipse_archmage.png` | 519x489 | Pre-separated boss | Source only | Medium | Master crop used for consistent naming/sizing |
| `06_enemies/bosses/infernal_overlord.png` | 575x470 | Pre-separated boss | Source only | Medium | Master crop used for consistent naming/sizing |
| `06_enemies/bosses/storm_chimera.png` | 695x482 | Pre-separated boss | Source only | Medium | Master crop used for consistent naming/sizing |
| `06_enemies/bosses/tide_queen.png` | 394x441 | Pre-separated boss | Source only | Medium | Master crop used for consistent naming/sizing |
| `06_enemies/bosses/verdant_colossus.png` | 410x421 | Pre-separated boss | Source only | Medium | Master crop used for consistent naming/sizing |
| `07_backgrounds/01_forest_path.png` | 475x535 | Forest path battle background | Extracted opaque `forest_path.png` | Low | Full panel; no transparency/rembg |
| `07_backgrounds/02_sunlit_meadow.png` | 474x535 | Plains/meadow battle background | Extracted opaque `plains.png` | Low | Full panel; no transparency/rembg |
| `07_backgrounds/03_mossy_cave.png` | 475x535 | Moss cave battle background | Extracted opaque `moss_cave.png` | Low | Full panel; no transparency/rembg |
| `07_backgrounds/04_fiery_fortress.png` | 475x535 | Ashen keep battle background | Extracted opaque `ashen_keep.png` | Low | Full panel; no transparency/rembg |
| `07_backgrounds/05_water_temple.png` | 474x535 | Tide shrine battle background | Extracted opaque `tide_shrine.png` | Low | Full panel; no transparency/rembg |
| `07_backgrounds/06_eclipse_ruins.png` | 475x535 | Eclipse spire battle background | Extracted opaque `eclipse_spire.png` | Low | Full panel; no transparency/rembg |
| `07_backgrounds/background_collage_master.png` | 1448x1086 | Six-panel battle background collage | Source only | High | Panel borders; separated panels used instead |

## rembg Result Summary

- rembg candidates were generated for characters, portraits, battle sprites, enemies, bosses, markers, and selected UI pieces.
- Town prop/service-sign outputs were removed with the generated-town interior system.
- Color-key was kept for terrain, markers, characters, portraits, battle sprites, enemies, bosses, cursors, buttons, and UI bars because those outputs kept crisper pixel edges and fewer holes/halos.
