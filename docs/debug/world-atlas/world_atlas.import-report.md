# World Atlas Import Report

Source: `C:/Users/Marku/Downloads/redo_this_please_2K_202606182233.jpeg`
Copied source: `assets_v2/source_sheets/world_atlas/redo_this_please_2k_202606182233.jpeg`
Source dimensions: 2048x2048
Source color: JPEG RGB converted through Windows imaging
Detected source grid: 10 columns x 10 rows
Runtime grid: 10 columns x 8 rows
Normalized tile size: 206x206
Normalized atlas: `assets_v2/world/world_atlas_normalized.png`
Debug preview: `docs/debug/world-atlas/world_atlas.debug.png`

## Separator Detection

The source is a square 10x10 JPEG atlas with separator/border lines. Dark separator lines were detected near the expected grid boundaries and excluded from each runtime tile before nearest-neighbor normalization.

The game uses the requested 10x8 logical terrain model. Source rows 0, 1, 2, 3, 4, 5, 7, 9 were selected for runtime rows 0-7; duplicate/detail rows not in that list are kept only in the copied source/debug provenance.

Column boundaries:

- 0: expected 0, separator 0-0, avg 8.2
- 1: expected 204.7, separator 203-204, avg 15.3
- 2: expected 409.4, separator 409-409, avg 12.3
- 3: expected 614.1, separator 613-613, avg 9.7
- 4: expected 818.8, separator 818-819, avg 8.6
- 5: expected 1023.5, separator 1023-1024, avg 7.8
- 6: expected 1228.2, separator 1228-1229, avg 10.4
- 7: expected 1432.9, separator 1433-1434, avg 10
- 8: expected 1637.6, separator 1638-1639, avg 6.5
- 9: expected 1842.3, separator 1843-1844, avg 11
- 10: expected 2047, separator 2047-2047, avg 8.7

Row boundaries:

- 0: expected 0, separator 0-0, avg 3.2
- 1: expected 204.7, separator 205-206, avg 5.9
- 2: expected 409.4, separator 410-411, avg 4.9
- 3: expected 614.1, separator 616-617, avg 26.8
- 4: expected 818.8, separator 819-820, avg 10
- 5: expected 1023.5, separator 1023-1025, avg 5.4
- 6: expected 1228.2, separator 1227-1228, avg 8.8
- 7: expected 1432.9, separator 1432-1432, avg 8
- 8: expected 1637.6, separator 1635-1636, avg 4.2
- 9: expected 1842.3, separator 1839-1840, avg 9.2
- 10: expected 2047, separator 2047-2047, avg 18

Source crop widths: 202-204
Source crop heights: 201-206

## Cells

| Runtime Row | Source Row | Col | Tile ID | Source Rect | Normalized Rect |
|---:|---:|---:|---|---|---|
| 0 | 0 | 0 | `bright_grass` | 1,1,202,204 | 0,0,206,206 |
| 0 | 0 | 1 | `medium_grass` | 205,1,204,204 | 206,0,206,206 |
| 0 | 0 | 2 | `dark_grass` | 410,1,203,204 | 412,0,206,206 |
| 0 | 0 | 3 | `flower_meadow` | 614,1,204,204 | 618,0,206,206 |
| 0 | 0 | 4 | `clover_lush_grass` | 820,1,203,204 | 824,0,206,206 |
| 0 | 0 | 5 | `trampled_grass` | 1025,1,203,204 | 1030,0,206,206 |
| 0 | 0 | 6 | `weeds_grass` | 1230,1,203,204 | 1236,0,206,206 |
| 0 | 0 | 7 | `dirt_patch` | 1435,1,203,204 | 1442,0,206,206 |
| 0 | 0 | 8 | `grass_stones` | 1640,1,203,204 | 1648,0,206,206 |
| 0 | 0 | 9 | `yellow_flower_grass` | 1845,1,202,204 | 1854,0,206,206 |
| 1 | 1 | 0 | `forest_floor` | 1,207,202,203 | 0,206,206,206 |
| 1 | 1 | 1 | `dark_forest_floor` | 205,207,204,203 | 206,206,206,206 |
| 1 | 1 | 2 | `mossy_forest_ground` | 410,207,203,203 | 412,206,206,206 |
| 1 | 1 | 3 | `dense_leafy_woodland` | 614,207,204,203 | 618,206,206,206 |
| 1 | 1 | 4 | `bush_hedge` | 820,207,203,203 | 824,206,206,206 |
| 1 | 1 | 5 | `tree_covered_green` | 1025,207,203,203 | 1030,206,206,206 |
| 1 | 1 | 6 | `rooty_forest_earth` | 1230,207,203,203 | 1236,206,206,206 |
| 1 | 1 | 7 | `autumn_woodland` | 1435,207,203,203 | 1442,206,206,206 |
| 1 | 1 | 8 | `enchanted_forest_ground` | 1640,207,203,203 | 1648,206,206,206 |
| 1 | 1 | 9 | `forest_path` | 1845,207,202,203 | 1854,206,206,206 |
| 2 | 2 | 0 | `bright_sand` | 1,412,202,204 | 0,412,206,206 |
| 2 | 2 | 1 | `golden_sand` | 205,412,204,204 | 206,412,206,206 |
| 2 | 2 | 2 | `dune_sand` | 410,412,203,204 | 412,412,206,206 |
| 2 | 2 | 3 | `rocky_sand` | 614,412,204,204 | 618,412,206,206 |
| 2 | 2 | 4 | `cracked_dry_earth` | 820,412,203,204 | 824,412,206,206 |
| 2 | 2 | 5 | `reddish_desert_soil` | 1025,412,203,204 | 1030,412,206,206 |
| 2 | 2 | 6 | `cactus_scrub` | 1230,412,203,204 | 1236,412,206,206 |
| 2 | 2 | 7 | `oasis` | 1435,412,203,204 | 1442,412,206,206 |
| 2 | 2 | 8 | `sandstone_floor` | 1640,412,203,204 | 1648,412,206,206 |
| 2 | 2 | 9 | `desert_scrub_path` | 1845,412,202,204 | 1854,412,206,206 |
| 3 | 3 | 0 | `clean_snow` | 1,618,202,201 | 0,618,206,206 |
| 3 | 3 | 1 | `packed_snow` | 205,618,204,201 | 206,618,206,206 |
| 3 | 3 | 2 | `icy_snow` | 410,618,203,201 | 412,618,206,206 |
| 3 | 3 | 3 | `frozen_ground` | 614,618,204,201 | 618,618,206,206 |
| 3 | 3 | 4 | `frosty_sparkle_snow` | 820,618,203,201 | 824,618,206,206 |
| 3 | 3 | 5 | `snow_rock` | 1025,618,203,201 | 1030,618,206,206 |
| 3 | 3 | 6 | `frozen_lake_ice` | 1230,618,203,201 | 1236,618,206,206 |
| 3 | 3 | 7 | `cracked_ice` | 1435,618,203,201 | 1442,618,206,206 |
| 3 | 3 | 8 | `glacier_ice` | 1640,618,203,201 | 1648,618,206,206 |
| 3 | 3 | 9 | `snowy_path` | 1845,618,202,201 | 1854,618,206,206 |
| 4 | 4 | 0 | `darkland_grass` | 1,821,202,202 | 0,824,206,206 |
| 4 | 4 | 1 | `dead_earth` | 205,821,204,202 | 206,824,206,206 |
| 4 | 4 | 2 | `muddy_swamp` | 410,821,203,202 | 412,824,206,206 |
| 4 | 4 | 3 | `boggy_wetland` | 614,821,204,202 | 618,824,206,206 |
| 4 | 4 | 4 | `toxic_marsh` | 820,821,203,202 | 824,824,206,206 |
| 4 | 4 | 5 | `ash_ground` | 1025,821,203,202 | 1030,824,206,206 |
| 4 | 4 | 6 | `cursed_purple_soil` | 1230,821,203,202 | 1236,824,206,206 |
| 4 | 4 | 7 | `blackened_wasteland` | 1435,821,203,202 | 1442,824,206,206 |
| 4 | 4 | 8 | `sickly_corrupted_ground` | 1640,821,203,202 | 1648,824,206,206 |
| 4 | 4 | 9 | `haunted_dead_forest_floor` | 1845,821,202,202 | 1854,824,206,206 |
| 5 | 5 | 0 | `deep_ocean_water` | 1,1026,202,201 | 0,1030,206,206 |
| 5 | 5 | 1 | `light_water` | 205,1026,204,201 | 206,1030,206,206 |
| 5 | 5 | 2 | `river_water` | 410,1026,203,201 | 412,1030,206,206 |
| 5 | 5 | 3 | `shallow_water` | 614,1026,204,201 | 618,1030,206,206 |
| 5 | 5 | 4 | `swamp_water` | 820,1026,203,201 | 824,1030,206,206 |
| 5 | 5 | 5 | `beach_shore` | 1025,1026,203,201 | 1030,1030,206,206 |
| 5 | 5 | 6 | `wooden_bridge_horizontal` | 1230,1026,203,201 | 1236,1030,206,206 |
| 5 | 5 | 7 | `wooden_bridge_vertical` | 1435,1026,203,201 | 1442,1030,206,206 |
| 5 | 5 | 8 | `stone_bridge_horizontal` | 1640,1026,203,201 | 1648,1030,206,206 |
| 5 | 5 | 9 | `stone_bridge_vertical` | 1845,1026,202,201 | 1854,1030,206,206 |
| 6 | 7 | 0 | `rocky_hill_ground` | 1,1433,202,202 | 0,1236,206,206 |
| 6 | 7 | 1 | `mountain_foothill` | 205,1433,204,202 | 206,1236,206,206 |
| 6 | 7 | 2 | `dark_mountain_ground` | 410,1433,203,202 | 412,1236,206,206 |
| 6 | 7 | 3 | `gravel_stone_ground` | 614,1433,204,202 | 618,1236,206,206 |
| 6 | 7 | 4 | `cliff_top_rock` | 820,1433,203,202 | 824,1236,206,206 |
| 6 | 7 | 5 | `canyon_stone` | 1025,1433,203,202 | 1030,1236,206,206 |
| 6 | 7 | 6 | `mossy_rock` | 1230,1433,203,202 | 1236,1236,206,206 |
| 6 | 7 | 7 | `volcanic_stone` | 1435,1433,203,202 | 1442,1236,206,206 |
| 6 | 7 | 8 | `crystal_rock` | 1640,1433,203,202 | 1648,1236,206,206 |
| 6 | 7 | 9 | `cave_rock` | 1845,1433,202,202 | 1854,1236,206,206 |
| 7 | 9 | 0 | `dirt_road` | 1,1841,202,206 | 0,1442,206,206 |
| 7 | 9 | 1 | `worn_path` | 205,1841,204,206 | 206,1442,206,206 |
| 7 | 9 | 2 | `cobblestone_road` | 410,1841,203,206 | 412,1442,206,206 |
| 7 | 9 | 3 | `ancient_ruin_floor` | 614,1841,204,206 | 618,1442,206,206 |
| 7 | 9 | 4 | `lava_cracked_ground` | 820,1841,203,206 | 824,1442,206,206 |
| 7 | 9 | 5 | `tropical_lush_ground` | 1025,1841,203,206 | 1030,1442,206,206 |
| 7 | 9 | 6 | `tropical_beach_sand` | 1230,1841,203,206 | 1236,1442,206,206 |
| 7 | 9 | 7 | `magical_crystal_field` | 1435,1841,203,206 | 1442,1442,206,206 |
| 7 | 9 | 8 | `graveyard_earth` | 1640,1841,203,206 | 1648,1442,206,206 |
| 7 | 9 | 9 | `mixed_utility_terrain` | 1845,1841,202,206 | 1854,1442,206,206 |
