# World Layout Report — Runtime Terrain Alignment Fix

Generated: 2026-06-19

## Actual Root Cause (Runtime Bug)

The terrain cache was rendering as a small thumbnail (~600×285 scene pixels) instead of filling the 1920×1080 canvas because of a Phaser 3 `setCrop` + `setDisplaySize` interaction.

### Technical Detail

In `drawCachedWorldTerrain`, the original code:
```ts
image.setCrop(cropX, cropY, cropWidth, cropHeight);  // e.g. crop 960×540
image.setDisplaySize(cropWidth * 2, cropHeight * 2); // e.g. 1920×1080
```

**Problem**: `setCrop` modifies the frame's UV coordinates, but `frame.realWidth` remains the FULL texture width (3072 for 96-tile world). `setDisplaySize(1920, 1080)` computes:
- `scaleX = 1920 / 3072 = 0.625` (should be 2.0)
- `scaleY = 1080 / 2048 = 0.527` (should be 2.0)

Result: the visible 960×540 crop rendered at 960×0.625 = **600** pixels wide and 540×0.527 = **285** pixels tall — a tiny thumbnail.

Meanwhile, POIs and player use `drawTexture`/`drawCroppedTexture` which multiply layout coordinates by `PIXEL_ART_SCALE=2`, placing them at full-screen positions. This made POIs/landmarks float in black space detached from the tiny terrain rectangle.

### Fix Applied

Instead of using `setCrop` (which keeps the full-texture `realWidth`), create a named **sub-frame** from the viewport crop region:

```ts
const viewFrameKey = `${this.worldTerrainCacheKey}_view`;
const texture = this.textures.get(this.worldTerrainCacheKey);
if (texture.has(viewFrameKey)) texture.remove(viewFrameKey);
texture.add(viewFrameKey, 0, cropX, cropY, cropWidth, cropHeight);
const image = this.add.image(0, 0, this.worldTerrainCacheKey, viewFrameKey);
image.setDisplaySize(cropWidth * PIXEL_ART_SCALE, cropHeight * PIXEL_ART_SCALE);
```

Now `frame.realWidth = cropWidth` (960), so `setDisplaySize(1920, 1080)` gives `scaleX = 1920/960 = 2.0` ✓.

### Coordinate Alignment

With this fix, all world layers share one consistent coordinate system:

| Layer | Transform | Example: world tile at (17,33) |
|-------|-----------|-------------------------------|
| Terrain cache | Frame origin (cropX,cropY) in texture → image at (0,0) at 2× scale | Scene pos: (17×32−80)×2 = (464×2) = 928 |
| POIs | Layout coords × 2, offset by `tileCam` | Scene pos: ((17−r)×32−80)×2 → aligned |
| Player | Layout coords × 2, offset by `cam` | Scene pos: (17×32−80+4)×2 → aligned |

### Other Changes

- Added `DEBUG_WORLD_LAYOUT = false` constant to gate debug overlay text
- Added runtime debug logging behind the same flag (prints frame dimensions, scale)
- Debug overlay text no longer visible in normal gameplay

## Final Values

| Parameter | Value |
|-----------|-------|
| Canvas size | 1920 × 1080 (Full HD) |
| Layout size | 960 × 540 |
| PIXEL_ART_SCALE | 2 |
| Tile draw size | 32 layout px → 64 display px |
| World tiles | 96 × 64 |
| World pixel size | 3072 × 2048 layout px |
| Terrain cache texture | 3072 × 2048 px |
| Viewport frame | 960 × 540 sub-frame, displayed at 1920 × 1080 |
| Frame scale | scaleX=2.0, scaleY=2.0 |
| Player overworld displayCellWidth | 33 layout px (~1 tile) |
| POI footprint | 3 tiles (96 layout px = 192 display px) |

## atlas_v3 Status

- ✅ Active world terrain source
- ✅ 8×8 grid, 29 non-empty tiles, 35 empty/black cells excluded
- ✅ Classic special tileset not active
- ✅ Old 10×10 atlas not active
- ✅ Black seam repair enabled

## Validation

- `npm run build`: ✅ passes
- `npm test` (worldgen + black seam repair): ✅ passes
- `DEBUG_WORLD_LAYOUT = true` logs confirm frame.realWidth = cropWidth, scale = 2.0
