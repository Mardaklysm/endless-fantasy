# World Terrain Rendering Invariants

Semantic world generation is gameplay truth. Walkability, biomes, roads, rivers, lakes, POIs, harbors, overlays, encounters, and island layout come from semantic data.

Terrain fills are visual. The renderer may make the terrain prettier, but it must not change gameplay truth.

Variant terrain is texture splatting, never tile replacement. Grass, sand, snow, ash, beach, and future terrain variants must blend through alpha masks sampled at sub-tile resolution.

Every normal gameplay terrain material boundary needs a sub-tile transition mask. This includes base biome to variant, variant to base biome, and variant to variant boundaries.

Random per-tile variant spam is forbidden.

Hard tile edges in terrain variants are a blocking regression. Hard edges are only acceptable for debug overlays, UI/minimap/debug views, and intentionally discrete object sprites such as forests, mountains, POIs, and bridges.

Roads are semantic graph and mask data, but normal gameplay renders them as terrain splats. Road placement, connectivity, POI approaches, harbor connections, and bridge candidates are gameplay truth.

Road visuals must never be hard tile replacements. All road edges need sub-tile transition masks, and roads must preserve the underlying biome material at their fringe.

Hard square road edges are a blocking regression.
