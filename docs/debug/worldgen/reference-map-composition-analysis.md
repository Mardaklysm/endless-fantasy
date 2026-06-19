# Reference Map Composition Analysis

Reference image: `C:/Users/Marku/Downloads/ctworldmap1000ad.png`

This image is used only as design guidance. It is not imported, bundled, or rendered as runtime game art.

## Composition Lessons

- The world reads as several organic islands in a dark ocean, not as rectangular biome fields.
- Coastlines are irregular and noisy, with small bays, peninsulas, and occasional satellite islands.
- A lighter shallow-water halo surrounds land, then a sandy/rocky shore ring separates grass from water.
- Grass is the main interior base layer. Variation appears in broad patches rather than checkerboard noise.
- Forests form coherent blobs and bands. Individual tree marks mostly appear around cluster edges and clearings.
- Mountains appear inland as grouped ranges with bases and top/details composed together.
- Settlements are sparse and intentional. They sit in clearings or along roads, not randomly scattered.
- Paths connect important locations with slightly wandering routes. They avoid water unless a dock/bridge/stair feature is deliberately placed.
- Large towns, castles, caves, and docks should be overlays with meaningful footprint/anchor behavior, not squeezed into one base terrain tile.
- The visual hierarchy is ocean -> shallow water -> shore -> grass -> clustered overlays -> POIs/paths.

## Classic Mode Implications

- `classicIsland` should stay specialized to the grassland/island subset of the classic sheet.
- Active assets should come from macro regions 7 and 10 only for this pass.
- The mode should use a small POI set: `player_start`, `start_village`, `forest_village`, `mountain_cave`, `castle_or_keep`, `port_or_dock`, and optional `shrine_or_landmark`.
- The old ten-location relic progression layout is not part of this mode.
- The full extracted classic pool is too broad for active generation and remains excluded.
