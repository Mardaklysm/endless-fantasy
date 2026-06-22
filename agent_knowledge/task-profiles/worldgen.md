# Worldgen Task Profile

Use this profile for semantic overworld generation, terrain masks, roads, rivers, mountains, forests, harbors, POIs, and worldgen lab tasks.

## Source Of Truth

The semantic world under `src/world/semantic/` is gameplay truth. Rendering consumes semantic masks, fields, graph data, and POI metadata.

## Main Files

- `src/world/semantic/semanticGenerator.ts`
- `src/world/semantic/semanticTypes.ts`
- `src/world/semantic/semanticProfiles.ts`
- `src/world/semantic/semanticMaskTerrainRenderer.ts`
- `src/world/semantic/semanticValidation.ts`
- `src/world/worldGenerator.ts`
- `src/render/world/drawWorld.ts`
- `src/render/world/drawLocationIcon.ts`

Use `rg` before opening additional files.

## Critical Rules

- Semantic masks/fields first, rendering second.
- Do not resurrect the old atlas renderer.
- Do not reintroduce random terrain-variant spam.
- Rivers render through the semantic terrain mask in `semanticMaskTerrainRenderer.ts`; roads render afterward in that renderer as a packed-dirt mask overlay, not as base terrain.
- `semanticRouteRenderer.ts` is debug-only.
- Roads and rivers are semantic graph/mask data.
- Validated road-river crossings are explicit bridge/ford candidates.
- Random bridge decoration is off by default.
- Mountains are semantic hard-block masks plus visual-only sprites.
- Forests are soft terrain and passable for now.
- POIs are blocked footprints with walkable approaches.
- Normal POIs are overlays; eligible land POIs may add tiny data-driven sub-tile local ground masks under the POI base before normal mask transitions. These masks stay inside the exact POI footprint, should remain low/compact base patches that only peek out from under the sprite, and are sampled at renderer mask resolution; never use full bounding-box fills, tile-only platforms, padding, radius blobs, falloff, random spreading, late overlays, or per-sample edge noise.
- Preserve the beach/sand buffer between land and water.

## Validation

```powershell
npm test
npm run build
```

Optional lab preview for visual algorithm checks:

```powershell
npm run worldgen:lab -- --seed test-greenhaven --out tmp/worldgen-lab/test-greenhaven
```

Do not inspect or commit generated lab outputs unless the task explicitly requires them.

## Context Rule

For worldgen tasks, read this profile plus `agent_knowledge/code-map.md` first. Do not read all art/gameplay docs unless the task specifically needs deeper art pipeline, gameplay progression, or durable decision context.
