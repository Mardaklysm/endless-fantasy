# World Layout Report — Dither-Pick Seam Repair

Generated: 2026-06-19

## Algorithm Replacement

The previous seam repair algorithm used color averaging (lerp/blend) to mix clean neighbor colors. This created visible gradient bands and sometimes mixed old black seam pixels into results.

The new algorithm uses **deterministic dithering** instead of color blending:

1. **Detect** artifact pixels in a narrow band (±3px around tile boundaries)
2. **Sample** one clean pixel from each neighboring tile's interior (4px inset, with ±2px jitter)
3. **Dither-pick**: use a seeded hash of (x, y, seed) to choose either the left or right clean sample
4. **Write** the chosen clean color to the destination pixel

The old seam pixel is **never** a color source — it is only a detection trigger.

## Key Principles

- **No color averaging/lerp** — pixels are assigned clean neighbor colors directly
- **Narrow band** — only ±3px around tile boundaries are modified
- **Local sampling** — clean samples from 4px inside each tile, fallback to 8px max
- **Deterministic** — same seed produces same dither pattern (no randomness at runtime)
- **Per-side detection** — artifact compared against own tile's interior, not average
- **Same-tile supported** — repeated tile seams still repaired from both interior copies

## Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `SEAM_SEARCH_RADIUS` | 4 | Band inspected around seam |
| `SEAM_TARGET_RADIUS` | 3 | Band actually repaired |
| `CORNER_SEARCH_RADIUS` | 5 | Corner intersection square |
| `INTERIOR_SAMPLE_INSET` | 4 | Clean sample distance from seam |
| `MAX_FALLBACK_INSET` | 8 | Max depth for fallback sampling |
| `INTERIOR_SAMPLE_JITTER` | 2 | ±2px deterministic jitter |
| `NEAR_BLACK_LUMINANCE_THRESHOLD` | 38 | Artifact detection (pure dark) |
| `CLEAN_SAMPLE_MIN_LUMINANCE` | 18 | Minimum luminance for a valid clean sample |
| `RELATIVE_DARKNESS_THRESHOLD` | 20 | Darker than neighbors = artifact |

## Dither-Pick Model

```
For each seam pixel at (x, y) with offset dx from seam center:
  h = hash01(x, y, seed)
  threshold = 0.3 + 0.4 * (dx + 3) / 6  // 0.3..0.7
  if h < threshold: use right/bottom color
  else: use left/top color
```

This creates a natural-looking mixed seam at the pixel level without any color averaging.

## Test Coverage (10 tests)

| Test | Validates |
|------|-----------|
| `validateOnlyBlackSeamPixelsChange` | Only black seam pixels repaired |
| `validateInteriorSampleReplacement` | Repaired pixels are clean neighbor colors, not black |
| `validateNoBroadBandModification` | No broad band changes |
| `validateSameTileSeamRepair` | Same-tile seams repaired |
| `validateDarkTerrainSafety` | Dark details preserved |
| `validateDisabledRepairIsNoop` | Disabled = no change |
| `validateWaterVerticalLineRepair` | Water seams detected/repaired |
| `validateWaterSameTileSeamRepair` | Same-tile water seams |
| `validateOldPixelNotUsedAsSource` | Old black never in result |
| `validateMaskIsThinLines` | Mask is thin seam lines only |

## Debug Outputs

- `docs/debug/worldgen/black-seam-repair-before.png`
- `docs/debug/worldgen/black-seam-repair-after.png`
- `docs/debug/worldgen/black-seam-repair-mask.png`
- `docs/debug/worldgen/black-seam-repair-diff.png`
- `docs/debug/worldgen/black-seam-repair-report.md`
