# Classic Island Worldgen Report

Worldgen mode: `classicIsland`
Seed: `reference-pass`
Map size: 64x40
Validation: valid
Player start: 16,25
Land/water: 34.8% land, 65.2% water
Shore tiles: 161
Forest clusters: 7
Mountain clusters: 2
POIs: 6
Path length: 136
Satellite islands: 1
Using full 1885 classic pool directly: false
Legacy ten POI layout: false

## Classic POIs

- Start Village (start_village, town) entry 16,23, object classic_region_village_small_blue_01
- Forest Village (forest_village, town) entry 43,25, object classic_region_village_small_red_01
- Mountain Cave (mountain_cave, dungeon) entry 35,12, object classic_region_cave_mountain_entrance_01
- Castle Keep (castle_or_keep, town) entry 29,18, object classic_region_castle_or_town_01
- Harbor Dock (port_or_dock, town) entry 51,21, object classic_region_dock_or_port_01
- Old Shrine (shrine_or_landmark, dungeon) entry 20,13, object classic_region_special_landmark_02

## Biome Counts

- forest: 305
- grassland: 224
- road: 201
- shore: 161
- water: 1669

## Selected 7+10 Asset Counts

- terrain.grassBase: 6
- terrain.grassVariants: 6
- terrain.path: 6
- terrain.shore: 8
- terrain.shallowWater: 6
- terrain.deepWater: 6
- terrain.mountainBase: 6
- terrain.forestGround: 6
- overlays.forestClusters: 6
- overlays.smallTreeClusters: 4
- overlays.mountainTops: 3
- overlays.mountainDetails: 3
- overlays.villagePieces: 2
- overlays.stairsOrDocks: 2
- overlays.decorativeLandmarks: 2
- overlays.villageSmall: 2
- overlays.villageLarge: 2
- overlays.castleOrTown: 2
- overlays.caveOrMountainEntrance: 1
- overlays.dockOrPort: 1
- overlays.specialLandmark: 2

## Reachability

Reachable POIs: start_village, forest_village, mountain_cave, castle_or_keep, port_or_dock, shrine_or_landmark

## Validation Errors

- none

## Validation Warnings

- Classic island generated very few mountain tiles.

Preview: `docs/debug/worldgen/world-preview-seed-reference-pass.png`
Mode asset preview: `docs/debug/worldgen/classic-island-preview.png`
