# Atlas V3 Import Report

Source path: `D:/Projects/new_artwork/atlas_v3.jpeg`
Source SHA-256: `F5BB2712DC1650E766AD68372A286F769A251D018508A3E3AFA7BD80884EBF46`
Source dimensions: 1024x1024
Runtime atlas path: `src/assets/world/atlas_v3.png`
Manifest path: `src/assets/world/atlasV3.manifest.json`
Labeled atlas: `docs/debug/world-atlas-v3/atlas-v3-labeled.png`

## Grid

- Grid size: 8x8
- Logical cells: 64
- Tile size: 128x128
- Source rectangle formula: `sx = col * tileWidth; sy = row * tileHeight; sw = tileWidth; sh = tileHeight`

## Empty Cell Detection

- Near-black luminance threshold: 20
- Near-black max-channel threshold: 34
- Empty ratio threshold: > 90%
- Non-empty tiles: 29
- Empty cells: 35

Black/empty cells are unused atlas slots. They are not transparency and are ignored by worldgen.

## Terrain Groups

- Groups used: dark, desert, grass, ice, lava, rock, snow, water
- Blend groups are map-rendering metadata only. They do not change source atlas pixels, source rectangles, walkability, or collision.

## Walkability Summary

- Walkable non-empty tiles: 25
- Blocked non-empty tiles: 4
- Blocked water tiles: 1
- Blocked mountain/volcano/lava tiles: 3

## Classified Cells

- Row 0, col 0: bright_grass (grassland/grassland; blend grass; walkable; tags: grass, land, base)
- Row 0, col 1: medium_grass (grassland/grassland; blend grass; walkable; tags: grass, land, base)
- Row 0, col 2: dark_grass (grassland/grassland; blend grass; walkable; tags: grass, land, dark)
- Row 0, col 3: flower_meadow_grass (grassland/grassland; blend grass; walkable; tags: grass, flowers, land)
- Row 0, col 4: lush_clover_grass (grassland/grassland; blend grass; walkable; tags: grass, clover, lush, land)
- Row 0, col 5: weeds_grass (grassland/grassland; blend grass; walkable; tags: grass, weeds, land)
- Row 0, col 6: trampled_grass (grassland/grassland; blend grass; walkable; tags: grass, trampled, land)
- Row 0, col 7: grass_stones (grassland/grassland; blend grass; walkable; tags: grass, stones, land)
- Row 1, col 0: empty (100.0% near-black)
- Row 1, col 1: empty (100.0% near-black)
- Row 1, col 2: empty (100.0% near-black)
- Row 1, col 3: empty (100.0% near-black)
- Row 1, col 4: empty (100.0% near-black)
- Row 1, col 5: empty (100.0% near-black)
- Row 1, col 6: empty (100.0% near-black)
- Row 1, col 7: empty (100.0% near-black)
- Row 2, col 0: bright_sand (desert/dryland; blend desert; walkable; tags: sand, desert, land)
- Row 2, col 1: dune_sand (desert/dryland; blend desert; walkable; tags: sand, desert, dune, land)
- Row 2, col 2: rocky_sand (desert/dryland; blend desert; walkable; tags: sand, desert, rocks, land)
- Row 2, col 3: cracked_dry_earth (desert/dryland; blend desert; walkable; tags: dry, cracked, desert, land)
- Row 2, col 4: reddish_desert_soil (desert/dryland; blend desert; walkable; tags: desert, red, rocks, land)
- Row 2, col 5: cactus_sand (desert/dryland; blend desert; walkable; tags: desert, cactus, sand, land)
- Row 2, col 6: desert_scrub (desert/dryland; blend desert; walkable; tags: desert, scrub, land)
- Row 2, col 7: empty (100.0% near-black)
- Row 3, col 0: clean_snow (snow/snow; blend snow; walkable; tags: snow, land)
- Row 3, col 1: packed_snow (snow/snow; blend snow; walkable; tags: snow, packed, land)
- Row 3, col 2: icy_snow (snow/snow; blend snow; walkable; tags: snow, ice, land)
- Row 3, col 3: snow_rocks (snow/snow; blend snow; walkable; tags: snow, rocks, land)
- Row 3, col 4: frozen_lake_ice (snow/ice; blend ice; walkable; tags: ice, frozen, land)
- Row 3, col 5: cracked_ice (snow/ice; blend ice; walkable; tags: ice, cracked, frozen, land)
- Row 3, col 6: empty (100.0% near-black)
- Row 3, col 7: empty (100.0% near-black)
- Row 4, col 0: empty (100.0% near-black)
- Row 4, col 1: empty (100.0% near-black)
- Row 4, col 2: empty (100.0% near-black)
- Row 4, col 3: dead_cracked_earth (darkland/cursed; blend dark; walkable; tags: darkland, dead, cracked, land)
- Row 4, col 4: ash_black_ground (darkland/cursed; blend dark; walkable; tags: darkland, ash, blackened, land)
- Row 4, col 5: cursed_purple_ground (darkland/cursed; blend dark; walkable; tags: darkland, cursed, purple, land)
- Row 4, col 6: empty (100.0% near-black)
- Row 4, col 7: empty (100.0% near-black)
- Row 5, col 0: deep_water (water/water; blend water; blocked; tags: water, deep, blocked)
- Row 5, col 1: empty (100.0% near-black)
- Row 5, col 2: empty (100.0% near-black)
- Row 5, col 3: empty (100.0% near-black)
- Row 5, col 4: empty (100.0% near-black)
- Row 5, col 5: empty (100.0% near-black)
- Row 5, col 6: empty (100.0% near-black)
- Row 5, col 7: empty (100.0% near-black)
- Row 6, col 0: rocky_mountain_ground (mountain/rock; blend rock; blocked; tags: mountain, rock, blocked)
- Row 6, col 1: gravel_stone_ground (mountain/rock; blend rock; walkable; tags: rock, gravel, stone, land)
- Row 6, col 2: empty (100.0% near-black)
- Row 6, col 3: empty (100.0% near-black)
- Row 6, col 4: volcano_mound (mountain/volcano; blend lava; blocked; tags: volcano, lava, blocked)
- Row 6, col 5: empty (100.0% near-black)
- Row 6, col 6: empty (100.0% near-black)
- Row 6, col 7: empty (100.0% near-black)
- Row 7, col 0: lava_cracked_ground (lava/lava; blend lava; blocked; tags: lava, blocked)
- Row 7, col 1: empty (100.0% near-black)
- Row 7, col 2: empty (100.0% near-black)
- Row 7, col 3: empty (100.0% near-black)
- Row 7, col 4: empty (100.0% near-black)
- Row 7, col 5: empty (100.0% near-black)
- Row 7, col 6: empty (100.0% near-black)
- Row 7, col 7: empty (100.0% near-black)
