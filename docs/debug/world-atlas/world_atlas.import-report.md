# World Atlas Import Report

Source: `C:/Users/Marku/Downloads/master_overworld_tileset_atlas_10x10.png`
Copied source: `src/assets/world/source/master_overworld_tileset_atlas_10x10.png`
Source SHA-256: `4207EB1592727AD045649CD916367D585174EF311B457EDC55BCB3FF2858A3A9`
Source dimensions: 2560x2560
Source color: RGB
Grid size: 10 columns x 10 rows
Tile size: 256x256
Runtime atlas path: `src/assets/world/world_atlas.normalized.png`
Manifest path: `src/data/worldTiles.ts`
Labeled preview: `docs/debug/world-atlas/world_atlas.labeled-preview.png`

## Import Method

The source PNG is already a clean 10x10 square atlas with no gutters, borders, or grid lines. The importer copies it exactly to the runtime atlas path and slices it with integer rectangles only:

```ts
sx = col * tileWidth;
sy = row * tileHeight;
sw = tileWidth;
sh = tileHeight;
```

No proportional slicing, border cleanup, scaling, padding, or edge bleed is applied.

## Row Families

- Row 0: grassland / meadow
- Row 1: woodland / forest
- Row 2: desert / dryland
- Row 3: snow / ice
- Row 4: darkland / swamp / cursed land
- Row 5: water / shore / bridge
- Row 6: mountain / hill / rock / cliff
- Row 7: road / special / extra biomes
- Row 8: transitions / edges / natural blends
- Row 9: roads / rivers / connectors / map utility

## Walkability Summary

- Walkable tiles: 81
- Blocked tiles: 19
- Water-family blocked tiles: 12
- Bridge tiles: 4, all walkable

## Visual Interpretation Deviations

None. Visual inspection matched the requested 10-row interpretation.

## Cells

| ID | Row | Col | Biome | Tags | Walkable | Movement Cost | Source Rect | Notes |
|---|---:|---:|---|---|---:|---:|---|---|
| `bright_grass` | 0 | 0 | grassland | grass, land | true | 1 | 0,0,256,256 |  |
| `medium_grass` | 0 | 1 | grassland | grass, land | true | 1 | 256,0,256,256 |  |
| `dark_grass` | 0 | 2 | grassland | grass, land | true | 1 | 512,0,256,256 |  |
| `flower_meadow` | 0 | 3 | grassland | grass, flowers, land | true | 1 | 768,0,256,256 |  |
| `clover_lush_grass` | 0 | 4 | grassland | grass, lush, land | true | 1 | 1024,0,256,256 |  |
| `trampled_grass` | 0 | 5 | grassland | grass, worn, land | true | 1 | 1280,0,256,256 |  |
| `weeds_grass` | 0 | 6 | grassland | grass, weeds, land | true | 1.1 | 1536,0,256,256 |  |
| `dirt_patch` | 0 | 7 | grassland | dirt, grass, land | true | 1 | 1792,0,256,256 |  |
| `grass_stones` | 0 | 8 | grassland | grass, rocks, land | true | 1.2 | 2048,0,256,256 |  |
| `fertile_field_grass` | 0 | 9 | grassland | grass, field, land | true | 1 | 2304,0,256,256 |  |
| `forest_floor` | 1 | 0 | forest | forest, land | true | 1.4 | 0,256,256,256 |  |
| `dark_forest_floor` | 1 | 1 | forest | forest, dark, land | true | 1.6 | 256,256,256,256 |  |
| `mossy_forest_ground` | 1 | 2 | forest | forest, moss, land | true | 1.4 | 512,256,256,256 |  |
| `dense_leafy_woodland` | 1 | 3 | forest | forest, dense, land | true | 2.1 | 768,256,256,256 |  |
| `bush_hedge` | 1 | 4 | forest | forest, bush, land | true | 1.8 | 1024,256,256,256 |  |
| `tree_covered_green` | 1 | 5 | forest | forest, dense, land | true | 2.2 | 1280,256,256,256 |  |
| `rooty_forest_earth` | 1 | 6 | forest | forest, roots, land | true | 1.7 | 1536,256,256,256 |  |
| `autumn_woodland` | 1 | 7 | forest | forest, autumn, land | true | 1.5 | 1792,256,256,256 |  |
| `enchanted_forest_ground` | 1 | 8 | forest | forest, magic, land | true | 1.5 | 2048,256,256,256 |  |
| `forest_path` | 1 | 9 | forest | forest, road, path, land | true | 0.75 | 2304,256,256,256 |  |
| `bright_sand` | 2 | 0 | desert | sand, desert, land | true | 1.35 | 0,512,256,256 |  |
| `golden_sand` | 2 | 1 | desert | sand, desert, land | true | 1.35 | 256,512,256,256 |  |
| `dune_sand` | 2 | 2 | desert | sand, desert, dune, land | true | 1.55 | 512,512,256,256 |  |
| `rocky_sand` | 2 | 3 | desert | sand, desert, rocks, land | true | 1.65 | 768,512,256,256 |  |
| `cracked_dry_earth` | 2 | 4 | desert | desert, dry, land | true | 1.45 | 1024,512,256,256 |  |
| `reddish_desert_soil` | 2 | 5 | desert | desert, red, land | true | 1.45 | 1280,512,256,256 |  |
| `cactus_scrub` | 2 | 6 | desert | desert, scrub, land | true | 1.8 | 1536,512,256,256 |  |
| `oasis_edge` | 2 | 7 | desert | desert, oasis, shore, land | true | 1.3 | 1792,512,256,256 |  |
| `sandstone_floor` | 2 | 8 | desert | desert, stone, land | true | 1.2 | 2048,512,256,256 |  |
| `desert_path` | 2 | 9 | desert | desert, road, path, land | true | 0.85 | 2304,512,256,256 |  |
| `clean_snow` | 3 | 0 | snow | snow, land | true | 1.45 | 0,768,256,256 |  |
| `packed_snow` | 3 | 1 | snow | snow, packed, land | true | 1.3 | 256,768,256,256 |  |
| `icy_snow` | 3 | 2 | snow | snow, ice, land | true | 1.55 | 512,768,256,256 |  |
| `frozen_ground` | 3 | 3 | snow | snow, frozen, land | true | 1.5 | 768,768,256,256 |  |
| `frosty_sparkle_snow` | 3 | 4 | snow | snow, sparkle, land | true | 1.45 | 1024,768,256,256 |  |
| `snow_rock` | 3 | 5 | snow | snow, rocks, land | true | 1.9 | 1280,768,256,256 |  |
| `frozen_lake_ice` | 3 | 6 | snow | water, ice | false | 99 | 1536,768,256,256 | Blocked ice by current movement rules. |
| `cracked_ice` | 3 | 7 | snow | water, ice, cracked | false | 99 | 1792,768,256,256 | Blocked ice by current movement rules. |
| `glacier_ice` | 3 | 8 | snow | water, ice, glacier | false | 99 | 2048,768,256,256 | Blocked ice by current movement rules. |
| `snowy_path` | 3 | 9 | snow | snow, road, path, land | true | 0.9 | 2304,768,256,256 |  |
| `dark_grassland` | 4 | 0 | darkland | darkland, grass, land | true | 1.5 | 0,1024,256,256 |  |
| `dead_earth` | 4 | 1 | darkland | darkland, dead, land | true | 1.45 | 256,1024,256,256 |  |
| `muddy_swamp` | 4 | 2 | darkland | darkland, swamp, mud, land | true | 1.9 | 512,1024,256,256 |  |
| `boggy_wetland` | 4 | 3 | darkland | darkland, swamp, bog, land | true | 2.1 | 768,1024,256,256 |  |
| `toxic_marsh` | 4 | 4 | darkland | water, toxic, swamp | false | 99 | 1024,1024,256,256 | Blocked toxic water. |
| `ash_ground` | 4 | 5 | darkland | darkland, ash, land | true | 1.55 | 1280,1024,256,256 |  |
| `cursed_purple_soil` | 4 | 6 | darkland | darkland, cursed, land | true | 1.6 | 1536,1024,256,256 |  |
| `blackened_wasteland` | 4 | 7 | darkland | darkland, wasteland, land | true | 1.7 | 1792,1024,256,256 |  |
| `sickly_corrupted_ground` | 4 | 8 | darkland | darkland, corrupt, land | true | 1.8 | 2048,1024,256,256 |  |
| `haunted_dead_forest_floor` | 4 | 9 | darkland | darkland, forest, land | true | 1.9 | 2304,1024,256,256 |  |
| `deep_ocean_water` | 5 | 0 | water | water, ocean, deep | false | 99 | 0,1280,256,256 |  |
| `light_water` | 5 | 1 | water | water | false | 99 | 256,1280,256,256 |  |
| `river_water` | 5 | 2 | water | water, river | false | 99 | 512,1280,256,256 |  |
| `shallow_water` | 5 | 3 | water | water, shallow | false | 99 | 768,1280,256,256 |  |
| `swamp_water` | 5 | 4 | water | water, swamp | false | 99 | 1024,1280,256,256 |  |
| `beach_shore` | 5 | 5 | water | shore, beach, land | true | 1.15 | 1280,1280,256,256 |  |
| `wooden_bridge_horizontal` | 5 | 6 | water | bridge, road, land | true | 0.7 | 1536,1280,256,256 |  |
| `wooden_bridge_vertical` | 5 | 7 | water | bridge, road, land | true | 0.7 | 1792,1280,256,256 |  |
| `stone_bridge_horizontal` | 5 | 8 | water | bridge, road, land | true | 0.65 | 2048,1280,256,256 |  |
| `stone_bridge_vertical` | 5 | 9 | water | bridge, road, land | true | 0.65 | 2304,1280,256,256 |  |
| `rocky_hill_ground` | 6 | 0 | mountain | rock, hill, land | true | 2.1 | 0,1536,256,256 |  |
| `mountain_foothill` | 6 | 1 | mountain | mountain, foothill, land | true | 2.4 | 256,1536,256,256 |  |
| `dark_mountain_ground` | 6 | 2 | mountain | mountain, blocked | false | 99 | 512,1536,256,256 |  |
| `gravel_stone_ground` | 6 | 3 | mountain | rock, gravel, land | true | 1.8 | 768,1536,256,256 |  |
| `cliff_top_rock` | 6 | 4 | mountain | cliff, blocked | false | 99 | 1024,1536,256,256 |  |
| `canyon_stone` | 6 | 5 | mountain | canyon, cliff, blocked | false | 99 | 1280,1536,256,256 |  |
| `mossy_rock` | 6 | 6 | mountain | rock, moss, land | true | 2 | 1536,1536,256,256 |  |
| `volcanic_stone` | 6 | 7 | mountain | lava, volcanic, blocked | false | 99 | 1792,1536,256,256 |  |
| `crystal_rock` | 6 | 8 | mountain | crystal, blocked | false | 99 | 2048,1536,256,256 |  |
| `cave_rock_entrance` | 6 | 9 | mountain | cave, entrance, blocked | false | 99 | 2304,1536,256,256 | Blocked unless a POI trigger overlays it. |
| `dirt_road` | 7 | 0 | road | road, land | true | 0.65 | 0,1792,256,256 |  |
| `worn_path` | 7 | 1 | road | road, path, land | true | 0.75 | 256,1792,256,256 |  |
| `cobblestone_road` | 7 | 2 | road | road, stone, land | true | 0.55 | 512,1792,256,256 |  |
| `ancient_ruin_floor` | 7 | 3 | road | road, ruin, land | true | 0.9 | 768,1792,256,256 |  |
| `lava_cracked_ground` | 7 | 4 | road | lava, blocked | false | 99 | 1024,1792,256,256 |  |
| `tropical_lush_ground` | 7 | 5 | road | grass, tropical, land | true | 1.2 | 1280,1792,256,256 |  |
| `tropical_beach_sand` | 7 | 6 | road | beach, tropical, land | true | 1.15 | 1536,1792,256,256 |  |
| `magical_crystal_field` | 7 | 7 | road | magic, crystal, land | true | 1.6 | 1792,1792,256,256 |  |
| `graveyard_earth` | 7 | 8 | road | darkland, graveyard, land | true | 1.45 | 2048,1792,256,256 |  |
| `mixed_utility_terrain` | 7 | 9 | road | mixed, land | true | 1.3 | 2304,1792,256,256 |  |
| `grass_to_dirt_transition` | 8 | 0 | transition | grass, dirt, transition, land | true | 1.05 | 0,2048,256,256 |  |
| `grass_to_forest_transition` | 8 | 1 | transition | grass, forest, transition, land | true | 1.2 | 256,2048,256,256 |  |
| `grass_to_sand_transition` | 8 | 2 | transition | grass, sand, transition, land | true | 1.15 | 512,2048,256,256 |  |
| `grass_to_snow_transition` | 8 | 3 | transition | grass, snow, transition, land | true | 1.2 | 768,2048,256,256 |  |
| `grass_to_darkland_transition` | 8 | 4 | transition | grass, darkland, transition, land | true | 1.25 | 1024,2048,256,256 |  |
| `beach_to_water_transition` | 8 | 5 | transition | shore, beach, transition, land | true | 1.15 | 1280,2048,256,256 |  |
| `rocky_shore_to_water_transition` | 8 | 6 | transition | shore, rock, transition, land | true | 1.25 | 1536,2048,256,256 |  |
| `riverbank_grass_edge` | 8 | 7 | transition | riverbank, grass, transition, land | true | 1.1 | 1792,2048,256,256 |  |
| `riverbank_dirt_edge` | 8 | 8 | transition | riverbank, dirt, transition, land | true | 1.1 | 2048,2048,256,256 |  |
| `snow_to_ice_transition` | 8 | 9 | transition | snow, ice, transition, land | true | 1.25 | 2304,2048,256,256 |  |
| `dirt_road_horizontal` | 9 | 0 | road | road, connector, horizontal, land | true | 0.6 | 0,2304,256,256 |  |
| `dirt_road_vertical` | 9 | 1 | road | road, connector, vertical, land | true | 0.6 | 256,2304,256,256 |  |
| `dirt_road_corner` | 9 | 2 | road | road, connector, corner, land | true | 0.65 | 512,2304,256,256 |  |
| `dirt_road_t_junction` | 9 | 3 | road | road, connector, junction, land | true | 0.6 | 768,2304,256,256 |  |
| `dirt_road_crossroads` | 9 | 4 | road | road, connector, crossroads, land | true | 0.55 | 1024,2304,256,256 |  |
| `river_straight` | 9 | 5 | water | water, river, connector | false | 99 | 1280,2304,256,256 |  |
| `river_bend` | 9 | 6 | water | water, river, connector | false | 99 | 1536,2304,256,256 |  |
| `river_t_junction` | 9 | 7 | water | water, river, connector, junction | false | 99 | 1792,2304,256,256 |  |
| `shallow_ford_stepping_stones` | 9 | 8 | road | ford, river, road, land | true | 0.9 | 2048,2304,256,256 |  |
| `ruined_stone_entrance_ground` | 9 | 9 | road | ruin, entrance, land | true | 1 | 2304,2304,256,256 |  |
