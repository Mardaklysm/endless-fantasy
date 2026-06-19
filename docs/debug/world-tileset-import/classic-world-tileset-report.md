# Classic World Tileset Import Report

Source: `C:/Users/Marku/Downloads/57105.png`
Copied source: `src/assets/world/tilesets/classic_world_tileset.source.png`
Cleaned source: `src/assets/world/tilesets/classic_world_tileset.cleaned.png`
Manifest: `src/assets/world/tilesets/classicWorldTileset.manifest.json`
Importer: `tools/art_import/import_classic_world_tileset.mjs`

## Totals

- Groups: 12
- Unique 16x16 terrain/city/connector tiles: 1885
- Object crops: 85
- Landmark/POI crops: 37
- Low-confidence assets: 556
- Non-empty 16x16 source cells represented through tile occurrences: 2774

## Group Names

- `volcanic_landforms`: Volcanic Landforms (volcano)
- `lava_forest_terrain_grid`: Lava Forest Terrain Grid (volcano)
- `arctic_landforms`: Arctic Landforms (snow)
- `arctic_terrain_grid`: Arctic Terrain Grid (snow)
- `red_roof_city_landmarks`: Red Roof City Landmarks (city)
- `lake_coast_city_terrain`: Lake Coast City Terrain (water)
- `red_blue_town_landmarks`: Red And Blue Town Landmarks (city)
- `west_coast_forest_terrain`: West Coast Forest Terrain (grassland)
- `special_landmarks_misc`: Special Landmarks And Miscellany (special)
- `east_coast_forest_terrain`: East Coast Forest Terrain (grassland)
- `dark_castles_ruins_objects`: Dark Castles Ruins And Objects (darkland)
- `darkland_volcano_terrain`: Darkland Volcano Terrain (darkland)

## Debug Outputs

- Group detection: `docs/debug/world-tileset-import/group-detection.png`
- Terrain tile contact sheet: `docs/debug/world-tileset-import/terrain-tiles-contact-sheet.png`
- Objects contact sheet: `docs/debug/world-tileset-import/objects-contact-sheet.png`
- Landmarks contact sheet: `docs/debug/world-tileset-import/landmarks-contact-sheet.png`
- Source analysis: `docs/debug/world-tileset-import/source-analysis.md`

## Extraction Strategy

- The source file is copied unchanged for provenance.
- A cleaned PNG is created by turning only exact `#00B100` pixels transparent.
- 16x16 non-empty source cells are deduplicated by image hash and written to `src/assets/world/tilesets/classic/extracted/tiles`.
- Connected components of at least 64 pixels are tightly cropped into object or landmark PNGs.
- Very small disconnected details remain represented by their 16x16 tile entries.
- This pack is intentionally not wired into the active Phaser overworld renderer yet.

## Worldgen Metadata

Each tile/object has a biome, walkability class, placement rules, repeat/spacing hints, tags, and neighbor-logic hints for roads, rivers, shores, walls, cliffs, and connectors. Water and lava are blocked; bridges/roads/city entries are walkable or POI-entry candidates.

## Low-Confidence Assets

- `volcano_volcano_mixed_tile_001`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_002`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_003`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_004`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_005`: volcanic_landforms, volcano, terrain_tile
- `volcano_small_detail_tile_001`: volcanic_landforms, volcano, terrain_tile
- `arctic_snow_mixed_tile_001`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_002`: arctic_landforms, snow, terrain_tile
- `volcano_volcano_mixed_tile_006`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_007`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_008`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_009`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_010`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_011`: volcanic_landforms, volcano, terrain_tile
- `arctic_snow_mixed_tile_003`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_004`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_005`: arctic_landforms, snow, terrain_tile
- `volcano_volcano_mixed_tile_012`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_013`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_014`: volcanic_landforms, volcano, terrain_tile
- `volcano_small_detail_tile_002`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_015`: volcanic_landforms, volcano, terrain_tile
- `arctic_snow_mixed_tile_006`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_007`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_008`: arctic_landforms, snow, terrain_tile
- `volcano_volcano_mixed_tile_016`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_017`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_018`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_019`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_020`: volcanic_landforms, volcano, terrain_tile
- `arctic_snow_mixed_tile_009`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_010`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_011`: arctic_landforms, snow, terrain_tile
- `volcano_volcano_mixed_tile_021`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_022`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_023`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_024`: volcanic_landforms, volcano, terrain_tile
- `volcano_small_detail_tile_003`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_025`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_026`: volcanic_landforms, volcano, terrain_tile
- `volcano_small_detail_tile_004`: volcanic_landforms, volcano, terrain_tile
- `arctic_small_detail_tile_001`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_012`: arctic_landforms, snow, terrain_tile
- `volcano_small_detail_tile_005`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_027`: volcanic_landforms, volcano, terrain_tile
- `volcano_small_detail_tile_006`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_028`: volcanic_landforms, volcano, terrain_tile
- `volcano_small_detail_tile_007`: volcanic_landforms, volcano, terrain_tile
- `arctic_snow_mixed_tile_013`: arctic_landforms, snow, terrain_tile
- `volcano_volcano_mixed_tile_029`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_030`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_031`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_032`: volcanic_landforms, volcano, terrain_tile
- `volcano_small_detail_tile_008`: volcanic_landforms, volcano, terrain_tile
- `arctic_small_detail_tile_002`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_014`: arctic_landforms, snow, terrain_tile
- `volcano_volcano_mixed_tile_033`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_034`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_035`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_036`: volcanic_landforms, volcano, terrain_tile
- `arctic_small_detail_tile_003`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_015`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_016`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_017`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_018`: arctic_landforms, snow, terrain_tile
- `arctic_small_detail_tile_004`: arctic_landforms, snow, terrain_tile
- `arctic_small_detail_tile_005`: arctic_landforms, snow, terrain_tile
- `volcano_small_detail_tile_009`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_037`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_038`: volcanic_landforms, volcano, terrain_tile
- `volcano_small_detail_tile_010`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_039`: volcanic_landforms, volcano, terrain_tile
- `volcano_volcano_mixed_tile_040`: volcanic_landforms, volcano, terrain_tile
- `arctic_snow_mixed_tile_019`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_020`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_021`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_022`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_023`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_024`: arctic_landforms, snow, terrain_tile
- `arctic_snow_mixed_tile_025`: arctic_landforms, snow, terrain_tile
- ... 476 more low-confidence entries; see the manifest for the full list.

## Manual Correction Workflow

1. Edit `src/assets/world/tilesets/classicWorldTileset.manifest.json` for semantic naming, biome, placement, or walkability corrections.
2. If source rectangles or extraction rules need to change, edit `tools/art_import/import_classic_world_tileset.mjs`.
3. Rerun `npm run import:classic-world-tileset`.
4. Rerun `npm run test:classic-world-tileset` and `npm test`.

## Suggested Human Review

- Confirm legal/provenance rights before wiring this classic-style sheet into the playable game.
- Review low-confidence entries whose names are intentionally conservative.
- Decide later which subset should become procedural terrain pools versus POI overlays.
