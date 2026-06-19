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
