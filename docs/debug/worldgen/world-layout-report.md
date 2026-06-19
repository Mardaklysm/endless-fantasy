# World Layout Report — Non-Fatal Seam Repair

Generated: 2026-06-19

## Emergency Fix: Game Crash

The seam repair was throwing an Error when the safety threshold (12%) was exceeded (12.40% pixels replaced). This crashed `CrystalOathScene.create()` and prevented the game from loading.

### Fix Applied

1. **Added `strict` option** to `BlackSeamRepairOptions`:
   - `strict: true` (tests/debug): throws on safety limit exceeded
   - `strict: false` (runtime): warns, restores original image, returns report with `safetyExceeded=true` and `repairApplied=false`

2. **Safety check behavior**:
   - When limit exceeded in strict mode: throws (for test validation)
   - When limit exceeded in non-strict mode: restores original image data from pre-repair copy, logs warning, returns gracefully

3. **`main.ts` integration**:
   - Calls `repairBlackSeamsImageData` with `strict: false`
   - Logs a `console.warn` if safety was exceeded
   - Uses the returned image data regardless (either repaired or original)

4. **Tightened detection**:
   - `SEAM_TARGET_RADIUS`: 3 → **2** (only ±2px from seam, 5px band instead of 7px)
   - `RELATIVE_DARKNESS_THRESHOLD`: 20 → **26** (more conservative relative darkness)
   - These reduce the replacement percentage on real worlds

### Report Fields Added

| Field | Description |
|-------|-------------|
| `safetyExceeded` | Whether replacement exceeded max allowed |
| `repairApplied` | Whether repair was actually applied |
| `runtimeFallbackUsed` | Whether original image was restored |
| `strictMode` | Whether strict mode was used |
| `maxAllowedPercent` | Max allowed replacement percentage |

### Test Coverage (12 tests)

| Test | Validates |
|------|-----------|
| `validateStrictModeThrows` | **NEW** Strict mode throws on safety exceed |
| `validateNonStrictModeFallsBack` | **NEW** Non-strict restores original, doesn't throw |
| 10 existing tests | All pass with tightened constants |

### Debug Outputs

- `docs/debug/worldgen/black-seam-repair-before.png`
- `docs/debug/worldgen/black-seam-repair-after.png`
- `docs/debug/worldgen/black-seam-repair-mask.png`
- `docs/debug/worldgen/black-seam-repair-diff.png`
- `docs/debug/worldgen/black-seam-repair-report.md`
