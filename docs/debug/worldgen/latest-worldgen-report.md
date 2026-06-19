# Generated World Debug Report

Worldgen mode: `atlas_v3_tile_world`
Active world tileset: `atlas_v3`
Grid: 8x8
Using empty cells: false
Using classic special tileset: false
Using old 10x10 atlas: false
Seed: `dither-seam-repair-v1`
Map size: 96x64
Validation: valid
Start position: 17,35
Road tiles carved: 0
River count: 0
Bridge count: 0

## POIs

- Dawnford (dawnford, town) at 17,33, footprint 3
- Brinewick (brinewick, town) at 26,44, footprint 3
- Elderleaf (elderleaf, town) at 23,16, footprint 3
- Sunbarrow (sunbarrow, town) at 63,30, footprint 3
- Starfall Gate (starfallGate, gate) at 78,40, footprint 3
- Moss Cave (mossCave, dungeon) at 33,30, footprint 3
- Ashen Keep (ashenKeep, dungeon) at 56,28, footprint 3
- Tide Shrine (tideShrine, dungeon) at 67,45, footprint 3
- Skyglass Tower (skyglassTower, dungeon) at 68,14, footprint 3
- Eclipse Spire (eclipseSpire, final) at 85,12, footprint 3

## Biome Counts

- darkland: 155
- desert: 190
- grassland: 5470
- lava: 2
- mountain: 175
- snow: 83
- water: 69

## Reachability

Reachable POIs: dawnford, brinewick, elderleaf, sunbarrow, starfallGate, mossCave, ashenKeep, tideShrine, skyglassTower, eclipseSpire

## Validation Errors

- none

## Validation Warnings

- none

# Black Seam Repair Report

Mode: `black_seam_repair`
Seed: `dither-seam-repair-v1`
Map size: 96x64
Tile size: 32px
Seam search radius: 4px
Seam target radius: 3px
Corner search radius: 5px
Interior sample inset: 4px
Max fallback inset: 8px
Interior sample jitter: 2px
Near-black threshold: luminance < 38
Relative darkness threshold: 20
replacementMode: deterministic-neighbor-dither
usesOldPixelAsSource: false

The old seam pixel is ONLY a destination mask trigger.
It is NEVER used as a color source.
Replacement pixels are chosen from clean interior samples using deterministic dithering.
No color averaging/blending is performed.

Vertical seam pixels repaired: 278331
Horizontal seam pixels repaired: 272930
Corner pixels repaired: 132975
Water seam pixels repaired: 9122
Same-tile seam pixels repaired: 507469
One-sided fallbacks: 0
Total replaced pixels: 684236
Replaced pixel percent: 10.8756%

Enabled: true
Debug view: false
Max replacement ratio guard: 12.00%

Before image: `docs/debug/worldgen/black-seam-repair-before.png`
After image: `docs/debug/worldgen/black-seam-repair-after.png`
Mask image: `docs/debug/worldgen/black-seam-repair-mask.png`
Diff image: `docs/debug/worldgen/black-seam-repair-diff.png`
Gameplay-style preview: `docs/debug/worldgen/atlas-v3-world-preview.png`

Seed preview: `docs/debug/worldgen/world-preview-seed-dither-seam-repair-v1.png`
