import fs from "node:fs";
import path from "node:path";
import { generateWorldLab, serializeWorld } from "./generator.mjs";
import { renderAllPreviews, writePng } from "./renderPreview.mjs";

const DEFAULT_SEED = "test-greenhaven";
const DEFAULT_WIDTH = 192;
const DEFAULT_HEIGHT = 120;
const DEFAULT_SCALE = 6;

main().catch((error) => {
  console.error(`World Generator Lab error: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const seed = options.seed || DEFAULT_SEED;
  const outDir = path.resolve(options.out || path.join("tmp", "worldgen-lab", safeSlug(seed)));
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const scale = options.scale ?? DEFAULT_SCALE;

  fs.mkdirSync(outDir, { recursive: true });

  const world = generateWorldLab({ seed, width, height });
  const previews = renderAllPreviews(world, { scale });
  const outputs = [];

  outputs.push(writeImage(outDir, "semantic_map_debug.png", previews.semanticMap));
  outputs.push(writeImage(outDir, "distance_bands_debug.png", previews.distanceBands));
  outputs.push(writeImage(outDir, "elevation_debug.png", previews.elevation));
  outputs.push(writeImage(outDir, "mountain_mask_debug.png", previews.mountainMask));
  outputs.push(writeImage(outDir, "river_mask_debug.png", previews.riverMask));
  outputs.push(writeImage(outDir, "river_connectivity_debug.png", previews.riverConnectivity));
  outputs.push(writeImage(outDir, "rivers_roads_debug.png", previews.riversRoads));
  outputs.push(writeImage(outDir, "rendered_world_preview.png", previews.renderedWorld));
  outputs.push(writeText(outDir, "semantic_world.json", JSON.stringify(serializeWorld(world), null, 2)));
  outputs.push(writeText(outDir, "worldgen_algorithm_report.md", buildAlgorithmReport(world, options)));
  outputs.push(writeText(outDir, "worldgen_asset_requirements.md", buildAssetRequirementReport()));

  console.log("World Generator Lab");
  console.log(`Seed: ${world.seed}`);
  console.log(`Output directory: ${outDir}`);
  console.log(`Map size: ${world.width}x${world.height} semantic cells`);
  console.log(`Preview scale: ${scale}px per cell`);
  console.log(`Islands: ${world.islandRecords.length}`);
  console.log(`POIs: ${world.poiList.length}`);
  console.log(`Harbors: ${world.harbors.length}`);
  console.log(`Rivers: ${world.rivers.length}`);
  console.log(`Mountains: ${world.mountains.length}`);
  console.log(`Mountain ranges: ${world.mountainRanges.length}`);
  console.log(`Validation: ${world.validation.ok ? "ok" : "errors"}`);
  for (const warning of world.validation.warnings) console.log(`Warning: ${warning}`);
  for (const error of world.validation.errors) console.log(`Error: ${error}`);
  console.log("Generated output files:");
  for (const output of outputs) console.log(`- ${output}`);

  if (!world.validation.ok) process.exitCode = 1;
}

function parseArgs(args) {
  const parsed = {
    seed: "",
    out: "",
    width: undefined,
    height: undefined,
    scale: undefined
  };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) throw new Error(`Unexpected positional argument: ${arg}`);
    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey.trim();
    let value = inlineValue;
    if (value === undefined) {
      i += 1;
      value = args[i];
      if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    }
    switch (key) {
      case "seed":
        parsed.seed = value;
        break;
      case "out":
        parsed.out = value;
        break;
      case "width":
        parsed.width = parsePositiveInteger(value, "--width");
        break;
      case "height":
        parsed.height = parsePositiveInteger(value, "--height");
        break;
      case "scale":
        parsed.scale = parsePositiveInteger(value, "--scale");
        break;
      default:
        throw new Error(`Unknown option: --${key}`);
    }
  }
  return parsed;
}

function writeImage(outDir, fileName, image) {
  const filePath = path.join(outDir, fileName);
  writePng(filePath, image, fs);
  return filePath;
}

function writeText(outDir, fileName, text) {
  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, text, "utf8");
  return filePath;
}

function buildAlgorithmReport(world, options) {
  const warnings = world.validation.warnings.length ? world.validation.warnings.map((warning) => `- ${warning}`).join("\n") : "- none";
  const errors = world.validation.errors.length ? world.validation.errors.map((error) => `- ${error}`).join("\n") : "- none";
  const command = `npm run worldgen:lab -- --seed "${world.seed}" --out "${options.out || path.join("tmp", "worldgen-lab", safeSlug(world.seed))}"`;
  const mountainReport = buildMountainComponentReport(world);
  const riverReport = buildRiverTileReport(world);

  return `# World Generator Lab Algorithm Report

Seed: \`${world.seed}\`
Map size: ${world.width}x${world.height} semantic cells
Renderer: standalone Node + pngjs, no Phaser runtime

## Command

\`\`\`powershell
${command}
\`\`\`

## Summary

World Generator Lab is a standalone PNG/report renderer for the semantic overworld direction. Its generator core is shared with the Phaser runtime through \`src/world/semantic/\`; the lab still keeps filesystem and pngjs preview code outside the game. The reference image is used only as a broad style/layout target: archipelago composition, deep ocean, shallow coastal halos, beach bands, biome interiors, symbolic mountains/forests, roads, rivers, and POIs. The tool does not copy the reference image.

The generated world contains:

- Islands: ${world.islandRecords.length}
- Land cells: ${world.stats.landCells}
- Deep ocean cells: ${world.stats.deepWaterCells}
- Shallow water cells: ${world.stats.shallowWaterCells}
- Beach cells: ${world.stats.beachCells}
- Grass cells: ${world.stats.grassCells}
- Sand/desert cells: ${world.stats.sandCells}
- Ice/snow cells: ${world.stats.iceCells}
- Mountain overlays: ${world.stats.mountainCells}
- Mountain ranges: ${world.mountainRanges.length}
- Forest overlay cells: ${world.stats.forestCells}
- River cells: ${world.stats.riverCells}
- Road cells: ${world.stats.roadCells}
- POIs: ${world.stats.poiCount}
- Harbors/ports: ${world.stats.harborCount}

## A. World Data Model

The lab stores a logical world model separately from its rendered preview. The semantic model includes:

- width, height, seed
- elevation field
- land mask
- island id map and island records
- distance-to-land and distance-to-water fields
- water depth class: deep ocean, shallow coastal water, lake/river overlays
- biome map: grassland, sand/beach/desert, ice/snow
- moisture, temperature, and coldness fields
- ridge/mountain field
- mountain overlay map
- mountain range records
- river overlay map
- forest overlay map
- road overlay map and road graph
- POI list and harbor list
- walkability/logical terrain map

The output \`semantic_world.json\` is the inspectable semantic dump. The PNGs are only views of that data.

## Mountain Component Report

${mountainReport}

## River Tile Report

${riverReport}

## B. Island / Archipelago Generation

The campaign profile defines four major islands: Greenhaven, Coralreach, Frostmere, and Highspire. It also adds seeded minor satellite islands. Each island is built from overlapping ellipse blobs with coast noise. The result is a semantic land mask, not a tile transition problem.

The current prototype supports:

- large islands
- medium islands
- satellite islands
- peninsulas and bays from blob overlap
- irregular coastlines from seeded boundary noise
- ocean channels by spacing island centers and pruning tiny fragments

## C. Coast And Ocean Bands

After land generation, the lab computes distance fields:

- water distance to nearest land
- land distance to nearest water

Those fields classify:

- deep ocean
- shallow coastal water halo
- beach/sand coast band
- inland cells

This creates the desired broad sequence: deep ocean -> shallow water halo -> pale coast -> inland biome. It does not require hundreds of coastline transition tiles.

## D. Biome Generation

The current v1 biome set is exactly:

- grassland
- sand/desert/beach
- ice/snow

Biome assignment uses elevation, moisture, coldness, distance from coast, island-level theme bias, and noise. The beach band is always sand. Ice/snow is favored by cold/high-elevation regions. Desert/sand is favored by low moisture. Grassland fills normal/wet areas. A smoothing pass reduces one-cell speckles.

## E. Elevation And Mountains

Elevation is separate from biome. It combines inland distance, base island height, ridge field, and noise. Mountains are generated as connected semantic massif masks: a few seed peaks are chosen from high ridge/elevation candidates per island, deterministic flood-fill grows each seed into an organic region, a smoothing pass merges close cells, and cleanup removes tiny fragments before collision is written. Snow mountains are chosen when elevation plus coldness is high. Mountain collision uses the accepted mask cells only, not surrounding visual pixels.

## F. Rivers And Lakes

River sources are chosen from high-elevation or cold/ridge areas while avoiding mountain masks and POI footprints. Rivers greedily flow toward lower elevation and coast/lakes with cardinal seeded tie-breaking. Loops are discarded. Surviving rivers remain semantic masks/paths, then render as connected cardinal river shapes filled with the freshwater material. The old styled river stroke renderer and full-square freshwater stamp path are disabled for normal output.

Lakes are optional overlay masks in moist inland basins.

## G. Forests

Forests are overlay clusters. They prefer grassland and higher moisture, avoid mountains, roads, and POIs, and are generated from cluster blobs rather than single-cell random trees everywhere.

## H. Roads

POIs are placed first. Roads are then generated from a graph between settlements, ports, and major POIs on each island. A* pathfinding uses semantic costs:

- grass: cheap
- beach: cheap/medium
- sand: medium
- ice: medium/high
- mountains: very high
- water/lakes: blocked

Roads are semantic paths rendered as styled warm dirt stroke overlays. They do not force terrain tiles, do not rewrite base terrain, and do not require a giant road atlas.

## I. POI Placement

POIs are overlay objects. They do not rewrite terrain. Current placeholder types include:

- towns/villages
- ports/harbors
- caves
- towers
- ice shrines
- desert ruins

Ports prefer beach cells adjacent to shallow water. Towns prefer grass/sand inland cells. Caves prefer high or mountainous areas. Special POIs use the dominant biome of their island.

## J. Rendering Model

The prototype renderer draws in layers:

1. deep ocean base
2. shallow water halo
3. land base color/terrain
4. beach/coast band
5. biome fills
6. lakes
7. asset river tile-mask overlay
8. styled roads/bridges
9. forest overlays
10. mountain range overlays
11. towns/POIs/ports

The current lab art is deliberately procedural: flat colors, light texture noise, simple symbolic mountains/forests, and styled route strokes. The algorithm and semantic separation are the point.

## K. Validation

Validation result: ${world.validation.ok ? "ok" : "errors"}

Warnings:

${warnings}

Errors:

${errors}

## M. Technology Decisions

Should we use tile transitions?

No, not as the core architecture. A small number of fills and brush/edge overlays can help later, but a huge transition tileset should not drive geography.

Should rendered PNGs drive gameplay?

No. Generated PNGs are views of semantic data. Movement, roads, encounters, ports, progression, collision, and POI placement come from the semantic model.

Should we use mask/field rendering?

Yes. The recommended v1 direction is semantic masks and fields for land, coast, water depth, biomes, elevation, rivers, and logical terrain, then stylized rendering from those layers.

Should another generator replace the semantic model?

No. Geography, progression, collision, harbors, roads, rivers, POIs, forests, mountains, and biome identity all come from the semantic model.

Recommended v1 approach:

- semantic archipelago masks and fields
- minimal terrain fills and brush-like edges
- object overlays for mountains, forests, towns, ports, and dungeons
- styled road overlays and connected freshwater river masks
- validation against logical world rules before visual polish

## Known Prototype Limitations

- Roads are grid paths with simple A* costs; future visual smoothing should draw prettier curves over the same graph.
- Rivers are greedy downhill paths; future versions should improve basin selection and add dedicated directional river edge masks or better freshwater material fills.
- Mountain and forest art is procedural placeholder only.
- Biome smoothing is simple and should eventually use connected-region cleanup.
  - This lab preview remains isolated from Phaser-specific rendering even though it shares the runtime-safe semantic generator core.
`;
}

function buildMountainComponentReport(world) {
  const debug = world.mountainDebug ?? {
    componentCount: world.mountainRanges.length,
    componentSizes: world.mountainRanges.map((range) => range.cells.length).sort((a, b) => b - a),
    minComponentSize: 0,
    maxComponentSize: 0,
    averageComponentSize: 0,
    rejectedTinyComponents: 0,
    singletonComponents: 0
  };
  const roadOverlap = countMaskOverlap(world, world.layers.mountainMap, world.layers.roadMap);
  const riverOverlap = countMaskOverlap(world, world.layers.mountainMap, world.layers.riverMap);
  const townOverlap = countPoiFootprintOverlap(world, (poi) => poi.role === "settlement");
  const harborOverlap = countPoiFootprintOverlap(world, (poi) => poi.role === "port");
  const importantPoiOverlap = countPoiFootprintOverlap(world, (poi) => poi.role !== "landmark" || poi.type === "gate" || poi.type === "final");
  const sizes = debug.componentSizes.length ? debug.componentSizes.join(", ") : "none";
  return `- Mountain components: ${debug.componentCount}
- Component sizes: ${sizes}
- Minimum component size: ${debug.minComponentSize}
- Maximum component size: ${debug.maxComponentSize}
- Average component size: ${debug.averageComponentSize}
- Rejected tiny components: ${debug.rejectedTinyComponents}
- Singleton mountain components after cleanup: ${debug.singletonComponents}
- Mountain cells overlapping roads: ${roadOverlap}
- Mountain cells overlapping rivers: ${riverOverlap}
- Mountain cells overlapping town footprints: ${townOverlap}
- Mountain cells overlapping harbor footprints: ${harborOverlap}
- Mountain cells overlapping important POI footprints: ${importantPoiOverlap}`;
}

function buildRiverTileReport(world) {
  const metrics = riverTileMetrics(world);
  return `- River masks/paths: ${world.rivers.length}
- River tile count: ${metrics.riverTileCount}
- River source/end tiles: ${metrics.sourceEndTileCount}
- River corner tiles: ${metrics.cornerTileCount}
- River straight tiles: ${metrics.straightTileCount}
- River junction tiles: ${metrics.junctionTileCount}
- River crossing tiles: ${metrics.crossingTileCount}
- Road/river crossings: ${metrics.roadRiverCrossings}
- Bridges created/used: ${metrics.bridgeTileCount}
- Old programmatic river renderer segments used: 0
- River tiles lacking atlas mapping fallback: 0
- River connectivity masks: ${Object.entries(metrics.connectivityCounts)
    .sort(([a], [b]) => Number.parseInt(a, 16) - Number.parseInt(b, 16))
    .map(([mask, count]) => `${mask}:${count}`)
    .join(", ") || "none"}`;
}

function riverTileMetrics(world) {
  const bridgeKeys = new Set((world.bridgeCandidates ?? []).map((bridge) => `${bridge.x},${bridge.y}`));
  const metrics = {
    riverTileCount: 0,
    sourceEndTileCount: 0,
    cornerTileCount: 0,
    straightTileCount: 0,
    junctionTileCount: 0,
    crossingTileCount: 0,
    roadRiverCrossings: countMaskOverlap(world, world.layers.roadMap, world.layers.riverMap),
    bridgeTileCount: bridgeKeys.size,
    connectivityCounts: {}
  };
  forEachCell(world, (x, y, i) => {
    if (!world.layers.riverMap[i]) return;
    metrics.riverTileCount += 1;
    const mask = riverConnectivityMaskAt(world, x, y);
    const key = mask.toString(16);
    metrics.connectivityCounts[key] = (metrics.connectivityCounts[key] ?? 0) + 1;
    const kind = riverTileKindForMask(mask);
    if (kind === "isolated" || kind === "end") metrics.sourceEndTileCount += 1;
    else if (kind === "corner") metrics.cornerTileCount += 1;
    else if (kind === "straight") metrics.straightTileCount += 1;
    else if (kind === "junction") metrics.junctionTileCount += 1;
    else if (kind === "cross") metrics.crossingTileCount += 1;
  });
  return metrics;
}

function riverConnectivityMaskAt(world, x, y) {
  let mask = 0;
  if (isRiverTile(world, x, y - 1)) mask |= 1;
  if (isRiverTile(world, x + 1, y)) mask |= 2;
  if (isRiverTile(world, x, y + 1)) mask |= 4;
  if (isRiverTile(world, x - 1, y)) mask |= 8;
  return mask;
}

function isRiverTile(world, x, y) {
  return x >= 0 && y >= 0 && x < world.width && y < world.height && world.layers.riverMap[y * world.width + x] === 1;
}

function riverTileKindForMask(mask) {
  const count = bitCount(mask);
  if (count === 0) return "isolated";
  if (count === 1) return "end";
  if (count === 2) return mask === 5 || mask === 10 ? "straight" : "corner";
  if (count === 3) return "junction";
  return "cross";
}

function bitCount(value) {
  let count = 0;
  let working = value;
  while (working > 0) {
    count += working & 1;
    working >>= 1;
  }
  return count;
}

function countMaskOverlap(world, a, b) {
  let count = 0;
  for (let i = 0; i < a.length; i += 1) if (a[i] && b[i]) count += 1;
  return count;
}

function forEachCell(world, fn) {
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) fn(x, y, y * world.width + x);
  }
}

function countPoiFootprintOverlap(world, predicate) {
  let count = 0;
  for (const poi of world.poiList.filter(predicate)) {
    const radius = poi.role === "settlement" || poi.role === "port" ? 1 : 0;
    for (let y = poi.y - radius; y <= poi.y + radius; y += 1) {
      for (let x = poi.x - radius; x <= poi.x + radius; x += 1) {
        if (x < 0 || y < 0 || x >= world.width || y >= world.height) continue;
        if (world.layers.mountainMap[y * world.width + x]) count += 1;
      }
    }
  }
  return count;
}

function buildAssetRequirementReport() {
  return `# Worldgen Asset Requirements

This list supports the semantic-mask world generator direction. It avoids asking for 100 coastline transition tiles.

## 1. Base Terrain / Background Assets

| Asset | Priority | Form | Notes |
| --- | --- | --- | --- |
| Deep ocean texture | required now | tile or procedural brush | Seamless or brushable blue ocean base with subtle texture. |
| Shallow water texture | required now | tile or procedural brush | Lighter coastal halo; should blend softly over deep ocean. |
| Grass fill texture | required now | tile/fill | Readable green interior terrain. |
| Sand/beach fill texture | required now | tile/fill | Used for beaches and desert interiors. |
| Snow/ice fill texture | required now | tile/fill | Used for cold/high regions. |
| River water overlay | required now | asset tile mask | Uses the current freshwater material sheet by river connectivity mask. |
| Lake water overlay | useful soon | brush/stamp | Small lake fills and edge highlights. |

## 2. Edge / Mask Rendering Assets

| Asset | Priority | Form | Notes |
| --- | --- | --- | --- |
| Coastline foam brush | required now | procedural brush or small overlay strip | Drawn along land/water mask edge. |
| Beach edge tint/outline | required now | brush/shader-like overlay | Minimal outline between beach and inland biome. |
| Shallow-water halo brush | required now | mask/field overlay | Follows distance-to-land field. |
| Biome boundary softening brush | useful soon | procedural brush | Softens grass/sand/ice boundaries without transition tiles. |
| River edge highlight | useful soon | tile/mask overlay | Adds readability to narrow rivers without freehand stroke bodies. |

## 3. Overlay Objects

| Asset | Priority | Form | Notes |
| --- | --- | --- | --- |
| Normal forest tree cluster | required now | overlay sprite/stamp | Clustered symbolic forest patch. |
| Dense forest cluster | useful soon | overlay sprite/stamp | Larger/darker patch for mature forests. |
| Snow pine cluster | useful soon | overlay sprite/stamp | Cold-region forest overlay. |
| Mountain icon | required now | overlay sprite | Symbolic side-view-ish map mountain. |
| Snow mountain icon | required now | overlay sprite | Same silhouette with snow cap. |
| Small hill icon | later | overlay sprite | Lower elevation detail. |
| Town | required now | overlay sprite | Settlement marker, not terrain. |
| Castle | useful soon | overlay sprite | Important settlement/stronghold. |
| Port/harbor | required now | overlay sprite | Coastal settlement plus dock. |
| Cave | required now | overlay sprite | Mountain/highland dungeon entrance. |
| Shrine | required now | overlay sprite | Biome-themed POI marker. |
| Ruins | required now | overlay sprite | Desert/ancient POI marker. |
| Tower | required now | overlay sprite | Inland high-visibility POI. |
| Chest/relic | later | overlay sprite | Sparse optional rewards. |
| Bridge | useful soon | overlay sprite | Road/rivers crossing. |
| Dock | useful soon | overlay sprite/stamp | Port detail. |

## 4. Road / Route Overlays

| Asset | Priority | Form | Notes |
| --- | --- | --- | --- |
| Dirt road line style | required now | procedural stroke/brush | Main grassland route. |
| Sandy trail style | useful soon | procedural stroke/brush | Desert/beach variant. |
| Snowy trail style | useful soon | procedural stroke/brush | Ice/snow variant. |
| Bridge overlay | useful soon | overlay sprite | Crosses rivers or narrow water. |
| River tile variants | useful soon | directional tile cells | Dedicated end, straight, corner, junction, and crossing art beyond the freshwater material. |
| Curved road brush | later | brush | Lets paths render smooth curves while logic stays grid/graph based. |

## 5. Debug / Dev Assets

| Asset | Priority | Form | Notes |
| --- | --- | --- | --- |
| Biome color palette | required now | constants | Stable debug colors for grass/sand/ice/beach/water. |
| POI markers | required now | procedural icons | Debug symbols for placement review. |
| Road graph overlay | required now | procedural lines | Shows path graph and connection failures. |
| River graph overlay | required now | debug-only procedural lines | Shows sources, mouths, discarded/final rivers; normal rendering uses asset tiles. |

## Recommendation

Make a small set of fills, masks, symbolic overlay sprites, and directional river tile variants first. Keep coastlines, biome boundaries, roads, and rivers driven by semantic masks/graphs; river bodies should render from asset tiles, with procedural river lines limited to debug views.
`;
}

function parsePositiveInteger(value, name) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) throw new Error(`${name} must be a positive integer, got ${value}.`);
  return numberValue;
}

function safeSlug(value) {
  return String(value).replace(/[^a-z0-9_-]+/gi, "_").slice(0, 80) || "worldgen-lab";
}
