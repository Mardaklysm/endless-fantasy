# Generated World Debug Report

Worldgen mode: `atlas_v3_tile_world`
Active world tileset: `atlas_v3`
Grid: 8x8
Using empty cells: false
Using classic special tileset: false
Using old 10x10 atlas: false
Seed: `safe-seam-repair-v1`
Map size: 96x64
Validation: valid
Start position: 17,35
Road tiles carved: 0
River count: 0
Bridge count: 0

## POIs

- Dawnford (dawnford, town) at 17,33, footprint 3
- Brinewick (brinewick, town) at 27,42, footprint 3
- Elderleaf (elderleaf, town) at 23,16, footprint 3
- Sunbarrow (sunbarrow, town) at 64,30, footprint 3
- Starfall Gate (starfallGate, gate) at 78,40, footprint 3
- Moss Cave (mossCave, dungeon) at 27,26, footprint 3
- Ashen Keep (ashenKeep, dungeon) at 57,28, footprint 3
- Tide Shrine (tideShrine, dungeon) at 67,46, footprint 3
- Skyglass Tower (skyglassTower, dungeon) at 70,15, footprint 3
- Eclipse Spire (eclipseSpire, final) at 86,11, footprint 3

## Biome Counts

- darkland: 200
- desert: 188
- grassland: 5401
- lava: 3
- mountain: 170
- snow: 90
- water: 92

## Reachability

Reachable POIs: dawnford, brinewick, elderleaf, sunbarrow, starfallGate, mossCave, ashenKeep, tideShrine, skyglassTower, eclipseSpire

## Validation Errors

- none

## Validation Warnings

- none

# Black Seam Repair Report

Mode: `black_seam_repair`
Seed: `safe-seam-repair-v1`
Map size: 96x64
Tile size: 32px
Seam search radius: 4px
Seam target radius: 2px
Corner search radius: 5px
Interior sample inset: 4px
Max fallback inset: 8px
Interior sample jitter: 2px
Near-black threshold: luminance < 38
Relative darkness threshold: 26
replacementMode: deterministic-neighbor-dither
usesOldPixelAsSource: false
Max allowed percent: 12.00%
Safety exceeded: false
Repair applied: true
Runtime fallback used: false
Strict mode: false

The old seam pixel is ONLY a destination mask trigger.
It is NEVER used as a color source.
Replacement pixels are chosen from clean interior samples using deterministic dithering.
No color averaging/blending is performed.

Vertical seam pixels repaired: 235476
Horizontal seam pixels repaired: 232134
Corner pixels repaired: 131762
Water seam pixels repaired: 11458
Same-tile seam pixels repaired: 429844
One-sided fallbacks: 0
Total replaced pixels: 599372
Replaced pixel percent: 9.5268%

Enabled: true
Debug view: false
Max replacement ratio guard: 12.00%

Before image: `docs/debug/worldgen/black-seam-repair-before.png`
After image: `docs/debug/worldgen/black-seam-repair-after.png`
Mask image: `docs/debug/worldgen/black-seam-repair-mask.png`
Diff image: `docs/debug/worldgen/black-seam-repair-diff.png`
Gameplay-style preview: `docs/debug/worldgen/atlas-v3-world-preview.png`

Seed preview: `docs/debug/worldgen/world-preview-seed-safe-seam-repair-v1.png`
