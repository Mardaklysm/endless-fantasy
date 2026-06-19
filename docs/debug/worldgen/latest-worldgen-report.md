# Generated World Debug Report

Worldgen mode: `atlas_v3_tile_world`
Active world tileset: `atlas_v3`
Grid: 8x8
Using empty cells: false
Using classic special tileset: false
Using old 10x10 atlas: false
Seed: `seam-repair-v2`
Map size: 96x64
Validation: valid
Start position: 17,35
Road tiles carved: 0
River count: 0
Bridge count: 0

## POIs

- Dawnford (dawnford, town) at 17,33, footprint 3
- Brinewick (brinewick, town) at 27,44, footprint 3
- Elderleaf (elderleaf, town) at 23,16, footprint 3
- Sunbarrow (sunbarrow, town) at 63,30, footprint 3
- Starfall Gate (starfallGate, gate) at 78,40, footprint 3
- Moss Cave (mossCave, dungeon) at 32,22, footprint 3
- Ashen Keep (ashenKeep, dungeon) at 55,29, footprint 3
- Tide Shrine (tideShrine, dungeon) at 68,47, footprint 3
- Skyglass Tower (skyglassTower, dungeon) at 68,13, footprint 3
- Eclipse Spire (eclipseSpire, final) at 86,14, footprint 3

## Biome Counts

- darkland: 144
- desert: 226
- grassland: 5454
- lava: 3
- mountain: 161
- snow: 86
- water: 70

## Reachability

Reachable POIs: dawnford, brinewick, elderleaf, sunbarrow, starfallGate, mossCave, ashenKeep, tideShrine, skyglassTower, eclipseSpire

## Validation Errors

- none

## Validation Warnings

- none

# Black Seam Repair Report

Mode: `black_seam_repair`
Seed: `seam-repair-v2`
Map size: 96x64
Tile size: 32px
Seam search radius: 4px
seamSearchWidth: 9px
seamWriteWidth: 9px
Intersection search radius: 5px
Near-black threshold: luminance < 38
Clean sample min luminance: 20
Relative darkness threshold: 26
minEdgeSampleInset: 3px
maxEdgeSampleInset: 8px
replacementMode: clean-neighbor-dual-mix
Pixels inspected: 4217049
Pixels replaced: 455664
replacedPixelCount: 455664
Replacement percentage: 7.2426%
replacedPixelPercent: 7.2426%
Vertical seam pixels repaired: 270588
Horizontal seam pixels repaired: 266086
Corner pixels repaired: 157660
Water seam pixels repaired: 11752
Same-tile seam pixels repaired: 495148
One-sided fallbacks: 0

The old seam pixel is only used for candidate detection and never as a color source.
Replacement colors are always mixed from clean interior samples of neighboring tiles.

Enabled: true
Debug view: false
Max replacement ratio guard: 12.00%

Before image: `docs/debug/worldgen/black-seam-repair-before.png`
After image: `docs/debug/worldgen/black-seam-repair-after.png`
Mask image: `docs/debug/worldgen/black-seam-repair-mask.png`
Diff image: `docs/debug/worldgen/black-seam-repair-diff.png`
Gameplay-style preview: `docs/debug/worldgen/atlas-v3-world-preview.png`

Seed preview: `docs/debug/worldgen/world-preview-seed-seam-repair-v2.png`
