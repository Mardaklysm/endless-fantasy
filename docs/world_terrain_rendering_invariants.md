# World Terrain Rendering Invariants

Semantic world generation is gameplay truth. Walkability, biomes, roads, rivers, lakes, POIs, harbors, overlays, encounters, and island layout come from semantic data.

Terrain fills are visual. The renderer may make the terrain prettier, but it must not change gameplay truth.

Variant terrain is texture splatting, never tile replacement. Grass, sand, snow, ash, beach, biome-specific materials, and future terrain variants must blend through alpha masks sampled at sub-tile resolution.

Every normal gameplay terrain material boundary needs a sub-tile transition mask. This includes base biome to variant, variant to base biome, variant to variant, and special biome material boundaries.

Ashfall is covered by the same invariant. Ash, cinder, cracked rock, scorched earth, lava crust, and Ashfall beach/sand inland edges must render through material splat transitions. Lava/crust patches need a scorch/cinder/ash transition ring before they fade into base ash; cinder/rock and scorched patches need dusty ash breakup instead of square outlines.

Random per-tile variant spam is forbidden.

Hard rectangular terrain material patches are a blocking regression. Hard edges are only acceptable for debug overlays, UI/minimap/debug views, deliberate road ribbons/strokes, and intentionally discrete object sprites such as forests, mountains, POIs, and bridges. A fix that only covers Greenhaven/grassland while Ashfall or another biome-specific material remains hard-edged is incomplete.

Worldgen tests must include at least one Ashfall seed and must validate all terrain material/variant layers, not only grassland or snow road cases.

Roads are not terrain variants. They are readable visual ribbons generated from semantic road graph and mask data. Road placement, connectivity, POI approaches, harbor connections, and bridge candidates are gameplay truth.

Road visuals must never be hard tile replacements. They need clear silhouettes, rounded caps and joins, and controlled sub-tile antialias/edge treatment while preserving the underlying biome material at the fringe.

Roads should not broadly dissolve into surrounding terrain. Broad road-to-terrain smearing is a regression.

Hard square road edges are a blocking regression.

Long ugly 45-degree visual road strokes are a regression unless explicitly intended for a straight engineered road.
