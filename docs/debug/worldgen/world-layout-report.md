# World Layout Report — Seam Repair Algorithm Fix

Generated: 2026-06-19

## Root Cause of Visible Grid/Raster

The original seam repair algorithm had three problems:

1. **Detection limited to pure near-black** (luminance < 32). Dark water vertical lines and other dark-but-not-black seam artifacts were not detected, so they remained visible.

2. **Detection threshold used for both detection AND clean-sample exclusion.** When the threshold was raised to catch more artifacts, it started excluding valid tile colors (like dark red grass tiles with luminance ~33) from clean interior sampling.

3. **No relative darkness detection.** Seam pixels that are darker than their neighbors but not pure black went unrepaired.

## Fixes Applied

### 1. Dual-threshold system
- **Detection thresholds** (higher, to catch artifacts):
  - `NEAR_BLACK_LUMINANCE_THRESHOLD = 38` — pure black or nearly so
  - `RELATIVE_DARKNESS_THRESHOLD = 26` — pixel is 26 luminance units darker than its OWN tile's clean interior
- **Clean sample exclusion** (lower, to keep valid tile colors):
  - `CLEAN_SAMPLE_MIN_LUMINANCE = 20` — only extremely dark pixels excluded from being clean source samples

### 2. Per-side relative darkness comparison
Each candidate pixel is compared against the luminance of the tile it belongs to (left vs right, top vs bottom), not the average of both. This prevents dark-colored tiles (like dark grass or shadowed areas) from being falsely detected as artifacts.

### 3. Wider sample search
`MAX_EDGE_SAMPLE_INSET` increased from 6 to 8 pixels. Dark water and grass tile edges can extend further in; a wider search finds actual clean interior colors.

### 4. Old seam pixel excluded from color mixing (already correct)
The algorithm has always used only clean interior samples for replacement colors:
```
replacement = mix(cleanSampleFromTileA, cleanSampleFromTileB)
```
The old seam pixel is only read for detection, never included in the output color.

## Algorithm Summary

For each visible seam artifact pixel:
1. **Detect**: Near-black OR significantly darker than own tile's interior
2. **Sample clean**: Search 3-8px inward from seam for valid non-dark pixels
3. **Mix**: Weighted combination of both neighboring tiles' clean samples
4. **Replace**: Completely overwrite the artifact pixel

## New Constants

| Constant | Old Value | New Value |
|----------|-----------|-----------|
| `NEAR_BLACK_LUMINANCE_THRESHOLD` | 32 | 38 |
| `CLEAN_SAMPLE_MIN_LUMINANCE` | (same as above) | 20 |
| `RELATIVE_DARKNESS_THRESHOLD` | (not present) | 26 |
| `MAX_EDGE_SAMPLE_INSET` | 6 | 8 |

## Report Statistics Added

- `oneSidedFallbackCount` — repairs where only one side had a clean sample
- `waterSeamReplacementCount` — repairs on water tile seams
- `sameTileSeamReplacementCount` — repairs where identical tiles meet
- `cleanSampleMinLuminance` — separate threshold documented in report

## Test Coverage

| Test | What it validates |
|------|-------------------|
| `validateOnlyBlackSeamPixelsChange` | Only black seam pixels repaired, non-seam pixels unchanged |
| `validateInteriorSampleReplacement` | Replacement color is weighted mix of both neighbors |
| `validateNoBroadBandModification` | Mask is narrow (seam only, not broad bands) |
| `validateSameTileSeamRepair` | Same-tile seams repaired using both copies |
| `validateDarkTerrainSafety` | Dark interior details not falsely modified |
| `validateDisabledRepairIsNoop` | Disabled repair changes nothing |
| `validateWaterVerticalLineRepair` | **NEW** Dark (non-black) water vertical seams detected and repaired via relative darkness |
| `validateWaterSameTileSeamRepair` | **NEW** Same water tile seam line repaired |
| `validateOldPixelNotUsedAsSource` | **NEW** Repaired color is bright mix of neighbors, not dark mix with old black |
| `validateMaskIsThinLines` | **NEW** Mask contains only thin seam lines, not broad bands |

## atlas_v3 Status

- ✅ Active world terrain source
- ✅ 8×8 grid, 29 non-empty tiles, 35 empty/black cells excluded
- ✅ Classic special tileset not active
- ✅ Old 10×10 atlas not active
- ✅ Black seam repair now catches dark-but-not-black artifacts
- ✅ Clean samples separated from detection thresholds

## Validation

- `npm run build`: ✅ passes
- `npm test`: ✅ passes (10 seam repair tests)
- Debug preview: `docs/debug/worldgen/atlas-v3-world-preview.png`
