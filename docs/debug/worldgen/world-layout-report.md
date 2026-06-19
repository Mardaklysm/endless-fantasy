# World Layout Report — Viewport & Scale Fix

Generated: 2026-06-19

## Root Cause

1. **World map too small**: `WORLD_W=64`, `WORLD_H=40`. At 32 layout px tiles (64 display px), the world occupied only ~2× the viewport in each direction, making scrolling range feel cramped and the overworld not feel like a proper world map.

2. **Player overworld sprite too large**: `drawLeader` used `displayCellWidth=132` (layout px) for all modes, making the exploration leader ≈4 tiles wide (264 scene px). For the overworld map, this is far too large — a world-map travel avatar should be ~1 tile or smaller.

3. **POI anchoring**: POIs and terrain both use `tileCam` offset and layout coordinates, and the cached terrain uses the same crop offset. The coordinate systems were aligned; no mismatch found beyond the shared `tileCam` origin.

4. **Black-area / tiny-map**: The render-to-screen pipeline is correct (cache crop → display size fills canvas, camera clamped to map bounds). The "black" symptom was caused by the small world leaving the viewport mostly filled with uniform terrain that could appear empty/dark in some seeds, combined with the huge player obscuring the map.

## Changes

### 1. World Dimensions (src/main.ts + src/world/worldGenerator.ts)

- `WORLD_W`: 64 → **96**
- `WORLD_H`: 40 → **64**
- `DEFAULT_WORLD_WIDTH`: 64 → **96**
- `DEFAULT_WORLD_HEIGHT`: 40 → **64**

New world pixel size: **3072 × 2048 layout px** (was 2048 × 1280)
New tile count: **6144** (was 2560)
Viewport-to-world ratio: **3.2× horizontal, 3.8× vertical** (was 2.1×, 2.4×)

### 2. Player Overworld Scale (src/main.ts drawLeader)

- `displayCellWidth` for world mode: **132 → 33** (¼ of previous)
- World-mode shadow: 48×12 → **18×6**
- World-mode ellipse highlight: 46×12 → **16×6**
- Body offset: (12, 38) → **(4, 14)** for world mode
- Town/dungeon sprites unaffected (still 132 displayCellWidth)
- Fallback figure rendering unchanged in town/dungeon; world fallback preserved

### 3. Debug Overlay (src/main.ts drawWorld)

Added DEV-only status line at bottom-left showing:
- Map dimensions (W×H in tiles)
- Camera scroll position
- Player tile position

### 4. Coordinate Alignment Verified

- Terrain cache: uses `cropX = Clamp(tileCam.x, …)`, `cropY = Clamp(tileCam.y, …)`
- POI rendering: offset by `tileCam`
- Leader rendering: offset by `cam` (≈ tileCam)
- All layers share the same world coordinate origin

## Final Values

| Parameter | Value |
|-----------|-------|
| Canvas size | 1920 × 1080 (Full HD) |
| Layout size | 960 × 540 |
| PIXEL_ART_SCALE | 2 |
| Tile draw size | 32 layout px → 64 display px |
| World tiles | 96 × 64 |
| World pixel size | 3072 × 2048 layout px |
| Viewport (world area) | 960 × 540 layout px (less HUD) |
| Camera scroll range X | 0 … 2112 layout px (66 tiles) |
| Camera scroll range Y | 0 … 1508 layout px (47 tiles) |
| Player overworld displayCellWidth | 33 layout px (~1 tile) |
| Player town/dungeon displayCellWidth | 132 layout px (unchanged) |
| POI footprint | 3 tiles (96 layout px = 192 display px) |

## atlas_v3 Status

- ✅ Active world terrain source
- ✅ 8×8 grid, 29 non-empty tiles, 35 empty/black cells excluded
- ✅ Classic special tileset not active
- ✅ Old 10×10 atlas not active
- ✅ Black seam repair enabled (6.19% pixels repaired on 96×64 map)
- ✅ Empty/black atlas cells not generated into world

## Validation

- `npm run build`: ✅ passes
- `npm test` (worldgen + black seam repair): ✅ passes
- Worldgen debug preview: `docs/debug/worldgen/atlas-v3-world-preview.png`
- Seed-specific preview: `docs/debug/worldgen/world-preview-seed-viewport-fix-qa-v1.png`
