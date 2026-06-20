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
- river overlay map
- forest overlay map
- road overlay map and road graph
- POI list and harbor list
- walkability/logical terrain map

The output \`semantic_world.json\` is the inspectable semantic dump. The PNGs are only views of that data.

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

Elevation is separate from biome. It combines inland distance, base island height, ridge field, and noise. Mountains are symbolic overlay objects placed on high ridge/elevation cells, not base terrain tiles. Snow mountains are chosen when elevation plus coldness is high.

## F. Rivers And Lakes

River sources are chosen from high-elevation or cold/ridge areas. Rivers greedily flow toward lower elevation and coast/lakes with seeded tie-breaking. Loops are discarded. Surviving rivers are thin blue overlays, not terrain transition tiles.

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

Roads are thin overlays. They do not force terrain tiles or rewrite base terrain.

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
6. lakes/rivers
7. forest overlays
8. mountain overlays
9. roads/bridges
10. towns/POIs/ports

The current art is deliberately placeholder/procedural: flat colors, light texture noise, simple symbolic mountains/forests, and line overlays. The algorithm and semantic separation are the point.

## K. Validation

Validation result: ${world.validation.ok ? "ok" : "errors"}

Warnings:

${warnings}

Errors:

${errors}

## M. Technology Decisions

Should we use tile transitions?

No, not as the core architecture. A small number of fills and brush/edge overlays can help later, but a huge transition tileset should not drive geography.

Should we use full island stamps?

No. Full stamps can be useful as debug references or handcrafted set pieces, but not as the main world generator. They do not give enough semantic control for movement, roads, encounters, ports, or progression.

Should we use mask/field rendering?

Yes. The recommended v1 direction is semantic masks and fields for land, coast, water depth, biomes, elevation, rivers, and logical terrain, then stylized rendering from those layers.

Should we use WFC?

Not for main geography. WFC can be considered later for small local decoration patches or micro-detail, after the semantic map is already generated.

Recommended v1 approach:

- semantic archipelago masks and fields
- minimal terrain fills and brush-like edges
- object overlays for mountains, forests, towns, ports, and dungeons
- road and river overlays
- validation against logical world rules before visual polish

## Known Prototype Limitations

- Roads are grid paths with simple A* costs; future visual smoothing should draw prettier curves over the same graph.
- Rivers are greedy downhill paths; future versions should improve basin selection and merging.
- Mountain and forest art is procedural placeholder only.
- Biome smoothing is simple and should eventually use connected-region cleanup.
- This lab is not wired into Phaser runtime and should remain isolated until the design is accepted.
`;
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
| River water overlay | required now | stroke/brush | Thin blue route overlay; not a full terrain tile set. |
| Lake water overlay | useful soon | brush/stamp | Small lake fills and edge highlights. |

## 2. Edge / Mask Rendering Assets

| Asset | Priority | Form | Notes |
| --- | --- | --- | --- |
| Coastline foam brush | required now | procedural brush or small overlay strip | Drawn along land/water mask edge. |
| Beach edge tint/outline | required now | brush/shader-like overlay | Minimal outline between beach and inland biome. |
| Shallow-water halo brush | required now | mask/field overlay | Follows distance-to-land field. |
| Biome boundary softening brush | useful soon | procedural brush | Softens grass/sand/ice boundaries without transition tiles. |
| River edge highlight | useful soon | stroke brush | Adds readability to thin rivers. |

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
| Bridge | useful soon | overlay sprite/stroke cap | Road/rivers crossing. |
| Dock | useful soon | overlay sprite/stamp | Port detail. |

## 4. Road / Route Overlays

| Asset | Priority | Form | Notes |
| --- | --- | --- | --- |
| Dirt road line style | required now | procedural stroke/brush | Main grassland route. |
| Sandy trail style | useful soon | procedural stroke/brush | Desert/beach variant. |
| Snowy trail style | useful soon | procedural stroke/brush | Ice/snow variant. |
| Bridge overlay | useful soon | overlay sprite/stroke | Crosses rivers or narrow water. |
| Curved road brush | later | brush | Lets paths render smooth curves while logic stays grid/graph based. |

## 5. Debug / Dev Assets

| Asset | Priority | Form | Notes |
| --- | --- | --- | --- |
| Biome color palette | required now | constants | Stable debug colors for grass/sand/ice/beach/water. |
| POI markers | required now | procedural icons | Debug symbols for placement review. |
| Road graph overlay | required now | procedural lines | Shows path graph and connection failures. |
| River graph overlay | required now | procedural lines | Shows sources, mouths, discarded/final rivers. |

## Recommendation

Make a small set of fills, brushes, and symbolic overlay sprites first. Keep coastlines, biome boundaries, roads, and rivers mask/stroke-driven. Only add targeted tile pieces later if a specific repeated visual problem survives the mask-rendering approach.
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
