# Classic World Tileset Source Analysis

Source path: `C:/Users/Marku/Downloads/57105.png`
Copied source: `src/assets/world/tilesets/classic_world_tileset.source.png`
Dimensions: 832x1072
File format: PNG, RGBA, 8-bit/channel
Alpha channel present: true
Meaningful alpha transparency present: false
Background mode chosen: chroma-key
Detected chroma-key color: `#00B100`
Exact chroma-key pixels: 331264 (37.141%)
Chosen base tile size: 16x16
Major groups: 12
Connected components after transparency cleanup: 1945

## Alpha And Chroma Key

The PNG uses an RGBA color type, but alpha analysis found 0 non-opaque pixels and 0 fully transparent pixels. The importer therefore treats the exact dominant border color `#00B100` as transparent. No fuzzy green tolerance is used.

## Tile Size Candidates

| Candidate | Width divides | Height divides | Grid | Remainder |
|---:|---|---|---:|---:|
| 8px | yes | yes | 104x134 | 0,0 |
| 16px | yes | yes | 52x67 | 0,0 |
| 24px | no | no | 34x44 | 16,16 |
| 32px | yes | no | 26x33 | 0,16 |
| 48px | no | no | 17x22 | 16,16 |
| 64px | yes | no | 13x16 | 0,48 |

## Major Groups

The 12 rectangles below were visually verified against the sheet and cover 560640 of 560640 non-background pixels.

| ID | Name | Source Rect | Biome | Content |
|---|---|---:|---|---|
| `volcanic_landforms` | Volcanic Landforms | 16,16,256,240 | volcano | mixed |
| `lava_forest_terrain_grid` | Lava Forest Terrain Grid | 16,256,256,272 | volcano | grid |
| `arctic_landforms` | Arctic Landforms | 288,16,256,240 | snow | mixed |
| `arctic_terrain_grid` | Arctic Terrain Grid | 288,256,256,272 | snow | grid |
| `red_roof_city_landmarks` | Red Roof City Landmarks | 560,16,256,224 | city | irregular |
| `lake_coast_city_terrain` | Lake Coast City Terrain | 560,240,256,288 | water | grid |
| `red_blue_town_landmarks` | Red And Blue Town Landmarks | 16,544,256,192 | city | irregular |
| `west_coast_forest_terrain` | West Coast Forest Terrain | 16,736,256,320 | grassland | grid |
| `special_landmarks_misc` | Special Landmarks And Miscellany | 288,544,256,192 | special | mixed |
| `east_coast_forest_terrain` | East Coast Forest Terrain | 288,736,256,320 | grassland | grid |
| `dark_castles_ruins_objects` | Dark Castles Ruins And Objects | 560,544,256,224 | darkland | mixed |
| `darkland_volcano_terrain` | Darkland Volcano Terrain | 560,768,256,288 | darkland | grid |

## Dominant Colors

| Color | Pixels | Percent |
|---|---:|---:|
| `#00B100 / rgba(0,177,0,255)` | 331264 | 37.141% |
| `#408040 / rgba(64,128,64,255)` | 15994 | 1.793% |
| `#488840 / rgba(72,136,64,255)` | 14314 | 1.605% |
| `#101820 / rgba(16,24,32,255)` | 13965 | 1.566% |
| `#D0D0C8 / rgba(208,208,200,255)` | 13915 | 1.56% |
| `#C0C0C8 / rgba(192,192,200,255)` | 11347 | 1.272% |
| `#306848 / rgba(48,104,72,255)` | 10810 | 1.212% |
| `#382020 / rgba(56,32,32,255)` | 10684 | 1.198% |
| `#387048 / rgba(56,112,72,255)` | 9617 | 1.078% |
| `#382828 / rgba(56,40,40,255)` | 9181 | 1.029% |
| `#686058 / rgba(104,96,88,255)` | 8710 | 0.977% |
| `#B08868 / rgba(176,136,104,255)` | 7975 | 0.894% |
| `#609040 / rgba(96,144,64,255)` | 7305 | 0.819% |
| `#482828 / rgba(72,40,40,255)` | 6698 | 0.751% |
| `#C0B0A0 / rgba(192,176,160,255)` | 6279 | 0.704% |

## Warnings

- PNG has an RGBA color type, but every alpha value is 255; exact chroma-key removal is required.
- The matte is #00B100, not #00FF00; importer removes only that exact RGB value.

## Notes

- The repeated grid is 52 columns x 67 rows at 16px.
- Some regions contain large connected landmass art; those are also represented as object crops, while individual 16px cells are deduplicated as terrain/city/connector tiles.
- Runtime gameplay does not load this tileset yet.
