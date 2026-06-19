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
