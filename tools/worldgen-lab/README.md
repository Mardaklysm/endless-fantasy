# World Generator Lab

World Generator Lab is an isolated development utility for previewing the semantic overworld generator. Its PNG/report renderer stays outside Phaser, but the generator core now lives in `src/world/semantic/` and is shared with the active game runtime.

The lab starts with semantic map generation:

- land/water masks
- island ids
- coast distance bands
- biome fields
- elevation and ridge fields
- river, forest, mountain, road, and POI overlays
- walkability/logical terrain

Rendering is a second step. The current preview uses procedural placeholder colors, strokes, and symbolic icons so the algorithm can be evaluated before final art exists.

Run from the project root:

```powershell
npm run worldgen:lab -- --seed test-greenhaven --out tmp/worldgen-lab/test-greenhaven
```

Optional arguments:

- `--width <cells>` default `192`
- `--height <cells>` default `120`
- `--scale <pixels>` default `6`

Outputs:

- `semantic_map_debug.png`
- `distance_bands_debug.png`
- `elevation_debug.png`
- `rivers_roads_debug.png`
- `rendered_world_preview.png`
- `semantic_world.json`
- `worldgen_algorithm_report.md`
- `worldgen_asset_requirements.md`

The design goal is semantic masks/fields first, stylized rendering second, and minimal art requirements last. Do not use this lab as a reason to build a huge coastline transition tileset.
