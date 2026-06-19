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
