# Atlas v3 Source Inset Report

Atlas source path: `D:/Projects/new_artwork/atlas_v3.jpeg`
Runtime atlas path: `src/assets/world/atlas_v3.png`
Tile grid: 8x8
Tile source size: 128x128
Source inset used: 3

## Final Source Rect Formula

- sx = tile.source.x + 3
- sy = tile.source.y + 3
- sw = tile.source.width - 6
- sh = tile.source.height - 6

The inset source rectangle is drawn into the full 32x32 destination tile. Empty atlas cells are not rendered because generated worlds only reference non-empty tile IDs.

## Runtime Consistency

- Runtime cache uses inset: yes, `CrystalOathScene.rebuildWorldTerrainCache` calls the shared inset source-rect helper.
- Fallback draw uses inset: yes, `drawWorldTile` uses the same `worldTileSourceRect` helper.
- Debug preview uses inset: yes, `tools/worldgen/write_worldgen_debug.mjs` calls `atlasV3SourceRectWithInset`.
- terrainBlending runtime postprocess is disabled: yes, the old map-level post-placement repair module has been removed from active runtime source.
- Neighboring tile pixels are mixed after placement: no.

## Output

Worldgen seed: `atlas-v3-source-inset-v1`
Source-inset preview: `docs/debug/worldgen/atlas-v3-source-inset-preview.png`
Gameplay-style preview: `docs/debug/worldgen/atlas-v3-world-preview.png`
Seed preview: `docs/debug/worldgen/world-preview-seed-atlas-v3-source-inset-v1.png`
