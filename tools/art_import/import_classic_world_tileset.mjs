import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const SOURCE_IMAGE = "C:/Users/Marku/Downloads/57105.png";
const TILESET_ID = "classic_world_tileset";
const ASSET_DIR = path.join(PROJECT_ROOT, "src", "assets", "world", "tilesets");
const SOURCE_COPY_PATH = path.join(ASSET_DIR, "classic_world_tileset.source.png");
const CLEANED_PATH = path.join(ASSET_DIR, "classic_world_tileset.cleaned.png");
const MANIFEST_PATH = path.join(ASSET_DIR, "classicWorldTileset.manifest.json");
const EXTRACT_ROOT = path.join(ASSET_DIR, "classic", "extracted");
const TILE_OUTPUT_DIR = path.join(EXTRACT_ROOT, "tiles");
const OBJECT_OUTPUT_DIR = path.join(EXTRACT_ROOT, "objects");
const LANDMARK_OUTPUT_DIR = path.join(EXTRACT_ROOT, "landmarks");
const DEBUG_DIR = path.join(PROJECT_ROOT, "docs", "debug", "world-tileset-import");

const BASE_TILE_SIZE = 16;
const COMPONENT_MIN_PIXELS = 64;
const COMPONENT_MIN_SIZE = 8;
const TRANSPARENT_ALPHA = 0;
const OPAQUE_ALPHA = 255;

const GROUPS = [
  group(
    "volcanic_landforms",
    "Volcanic Landforms",
    "volcano",
    { x: 16, y: 16, width: 256, height: 240 },
    "Volcanoes, craters, lava-adjacent peaks, caves, and round marker tiles.",
    "Large volcanic and mountain POIs, dangerous barriers, lava-region decoration.",
    "mixed",
    "volcano",
    "volcano"
  ),
  group(
    "lava_forest_terrain_grid",
    "Lava Forest Terrain Grid",
    "volcano",
    { x: 16, y: 256, width: 256, height: 272 },
    "Grid-aligned forests, cliffs, lava, desert-like rough ground, and crater terrain.",
    "Repeatable dangerous terrain tiles and volcanic biome transitions.",
    "grid",
    "lava_forest",
    "lava"
  ),
  group(
    "arctic_landforms",
    "Arctic Landforms",
    "snow",
    { x: 288, y: 16, width: 256, height: 240 },
    "Snow forests, ice rocks, white mountains, dark castle, and frozen landmark pieces.",
    "Snow biome barriers, ice-region POIs, and cold-region decorations.",
    "mixed",
    "arctic",
    "snow"
  ),
  group(
    "arctic_terrain_grid",
    "Arctic Terrain Grid",
    "snow",
    { x: 288, y: 256, width: 256, height: 272 },
    "Frozen lake, snow cliffs, snowy forest, ice floes, and patterned ice tiles.",
    "Repeatable snow/ice terrain and frozen-region connectors.",
    "grid",
    "arctic_terrain",
    "snow"
  ),
  group(
    "red_roof_city_landmarks",
    "Red Roof City Landmarks",
    "city",
    { x: 560, y: 16, width: 256, height: 224 },
    "Red-roof castles, towns, walls, stairs, towers, mountains, and forest clusters.",
    "Town/castle POIs, roads, city walls, and settlement decorations.",
    "irregular",
    "red_roof_city",
    "city"
  ),
  group(
    "lake_coast_city_terrain",
    "Lake Coast City Terrain",
    "water",
    { x: 560, y: 240, width: 256, height: 288 },
    "Lake/island terrain, coast edges, forest blocks, roads, ruins, and water patches.",
    "Coastal and lake terrain, shoreline transitions, and settlement-adjacent terrain.",
    "grid",
    "lake_coast",
    "coast"
  ),
  group(
    "red_blue_town_landmarks",
    "Red And Blue Town Landmarks",
    "city",
    { x: 16, y: 544, width: 256, height: 192 },
    "Alternate red-roof and blue-roof settlements, stairways, forests, and mountain pieces.",
    "Alternate town/castle POIs and settlement connectors.",
    "irregular",
    "red_blue_town",
    "city"
  ),
  group(
    "west_coast_forest_terrain",
    "West Coast Forest Terrain",
    "grassland",
    { x: 16, y: 736, width: 256, height: 320 },
    "Large lake, forest edges, coast, mountain foothills, bridges, and ruin-like structures.",
    "Grass/coast terrain blocks and reachable overworld landmass layouts.",
    "grid",
    "west_coast",
    "coast"
  ),
  group(
    "special_landmarks_misc",
    "Special Landmarks And Miscellany",
    "special",
    { x: 288, y: 544, width: 256, height: 192 },
    "Gray city ruin, roads, small shrines, towers, forest clusters, and isolated castles.",
    "Special POIs, connector roads, road-side decorations, and rare structures.",
    "mixed",
    "special_landmark",
    "special"
  ),
  group(
    "east_coast_forest_terrain",
    "East Coast Forest Terrain",
    "grassland",
    { x: 288, y: 736, width: 256, height: 320 },
    "Alternate lake/coast landmass with forest clusters, paths, bridges, and water edges.",
    "Alternate grass/coast terrain blocks and worldgen landmass templates.",
    "grid",
    "east_coast",
    "coast"
  ),
  group(
    "dark_castles_ruins_objects",
    "Dark Castles Ruins And Objects",
    "darkland",
    { x: 560, y: 544, width: 256, height: 224 },
    "Dark castles, ruins, tower pieces, gray mountains, black roads, and modular dark tiles.",
    "Late-game POIs, darkland structures, blocked barriers, and dark terrain connectors.",
    "mixed",
    "dark_castle",
    "darkland"
  ),
  group(
    "darkland_volcano_terrain",
    "Darkland Volcano Terrain",
    "darkland",
    { x: 560, y: 768, width: 256, height: 288 },
    "Dark lake/crater, caves, ruined paths, lava/dark ground, cliffs, and black terrain.",
    "Darkland terrain, dangerous barriers, cave POIs, and late-game terrain transitions.",
    "grid",
    "darkland_volcano",
    "darkland"
  )
];

function main() {
  ensureDir(ASSET_DIR);
  ensureDir(DEBUG_DIR);
  ensureDir(EXTRACT_ROOT);
  safeCleanDir(TILE_OUTPUT_DIR);
  safeCleanDir(OBJECT_OUTPUT_DIR);
  safeCleanDir(LANDMARK_OUTPUT_DIR);
  ensureDir(TILE_OUTPUT_DIR);
  ensureDir(OBJECT_OUTPUT_DIR);
  ensureDir(LANDMARK_OUTPUT_DIR);

  if (!fs.existsSync(SOURCE_IMAGE)) throw new Error(`Missing source tileset: ${SOURCE_IMAGE}`);

  const source = readPng(SOURCE_IMAGE);
  const sourceHash = fileHash(SOURCE_IMAGE);
  const analysis = analyzeSource(source);
  fs.copyFileSync(SOURCE_IMAGE, SOURCE_COPY_PATH);

  const cleaned = cleanSource(source, analysis);
  writePng(CLEANED_PATH, cleaned);

  const groupCoverage = verifyGroupCoverage(cleaned);
  const components = findComponents(cleaned);
  const tiles = extractUniqueTiles(cleaned);
  const objects = extractObjects(cleaned, components);

  for (const tile of tiles) {
    writePng(path.join(TILE_OUTPUT_DIR, `${tile.id}.png`), cropImage(cleaned, tile.source));
  }
  for (const object of objects) {
    const outDir = object.kind === "landmark" || object.kind === "poi" ? LANDMARK_OUTPUT_DIR : OBJECT_OUTPUT_DIR;
    writePng(path.join(outDir, `${object.id}.png`), cropImage(cleaned, object.source));
  }

  const manifest = buildManifest(source, sourceHash, analysis, groupCoverage, components, tiles, objects);
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const groupPreviewPath = path.join(DEBUG_DIR, "group-detection.png");
  const terrainContactPath = path.join(DEBUG_DIR, "terrain-tiles-contact-sheet.png");
  const objectContactPath = path.join(DEBUG_DIR, "objects-contact-sheet.png");
  const landmarkContactPath = path.join(DEBUG_DIR, "landmarks-contact-sheet.png");
  writePng(groupPreviewPath, buildGroupDetectionPreview(source));
  writePng(terrainContactPath, buildContactSheet(cleaned, tiles, "Terrain Tiles", 28));
  writePng(objectContactPath, buildContactSheet(cleaned, objects.filter((asset) => asset.kind !== "landmark" && asset.kind !== "poi"), "Objects", 16));
  writePng(landmarkContactPath, buildContactSheet(cleaned, objects.filter((asset) => asset.kind === "landmark" || asset.kind === "poi"), "Landmarks", 10));

  fs.writeFileSync(path.join(DEBUG_DIR, "source-analysis.md"), buildSourceAnalysisReport(source, analysis, groupCoverage, components), "utf8");
  fs.writeFileSync(
    path.join(DEBUG_DIR, "classic-world-tileset-report.md"),
    buildImportReport(manifest, {
      groupPreviewPath,
      terrainContactPath,
      objectContactPath,
      landmarkContactPath,
      lowConfidenceAssets: [...tiles, ...objects].filter((asset) => asset.confidence === "low")
    }),
    "utf8"
  );

  console.log(`Imported ${TILESET_ID} from ${SOURCE_IMAGE}`);
  console.log(`Source dimensions: ${source.width}x${source.height}; color: ${source.sourceColorType}; background mode: ${analysis.backgroundMode}`);
  console.log(`Cleaned source: ${relative(CLEANED_PATH)}`);
  console.log(`Manifest: ${relative(MANIFEST_PATH)}`);
  console.log(`Groups: ${GROUPS.length}; terrain tiles: ${tiles.length}; objects/landmarks: ${objects.length}`);
}

function group(id, displayName, biome, sourceRect, description, likelyUse, contentType, assetPrefix, themeHint) {
  return {
    id,
    displayName,
    biome,
    sourceRect,
    description,
    likelyUse,
    contentType,
    assetPrefix,
    themeHint
  };
}

function analyzeSource(source) {
  const pixelCount = source.width * source.height;
  let alphaNonOpaque = 0;
  let alphaZero = 0;
  let alphaMin = OPAQUE_ALPHA;
  let alphaMax = TRANSPARENT_ALPHA;
  const colors = new Map();
  const borderColors = new Map();

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const color = pixelAt(source, x, y);
      if (color[3] !== OPAQUE_ALPHA) alphaNonOpaque += 1;
      if (color[3] === TRANSPARENT_ALPHA) alphaZero += 1;
      alphaMin = Math.min(alphaMin, color[3]);
      alphaMax = Math.max(alphaMax, color[3]);
      increment(colors, rgbaKey(color));
      if (x === 0 || y === 0 || x === source.width - 1 || y === source.height - 1) increment(borderColors, rgbaKey(color));
    }
  }

  const hasAlphaChannel = source.sourceColorType === "RGBA";
  const hasMeaningfulAlpha = alphaNonOpaque > 0;
  const dominantColor = topEntries(colors, 1)[0];
  const dominantBorderColor = topEntries(borderColors, 1)[0];
  const chroma = parseRgbaKey(dominantBorderColor.key);
  const transparentColor = hasMeaningfulAlpha ? undefined : chroma;
  const exactChromaPixels = hasMeaningfulAlpha ? 0 : countExactRgb(source, chroma);
  const tileCandidates = [8, 16, 24, 32, 48, 64].map((size) => ({
    size,
    dividesWidth: source.width % size === 0,
    dividesHeight: source.height % size === 0,
    columns: Math.floor(source.width / size),
    rows: Math.floor(source.height / size),
    remainder: { width: source.width % size, height: source.height % size }
  }));

  return {
    hasAlphaChannel,
    hasMeaningfulAlpha,
    alphaNonOpaque,
    alphaZero,
    alphaMin,
    alphaMax,
    dominantColor,
    dominantBorderColor,
    backgroundMode: hasMeaningfulAlpha ? "alpha" : "chroma-key",
    transparentColor,
    transparentColorHex: hasMeaningfulAlpha ? undefined : rgbHex(chroma),
    exactChromaPixels,
    exactChromaPercent: roundPercent(exactChromaPixels, pixelCount),
    topColors: topEntries(colors, 15),
    topBorderColors: topEntries(borderColors, 8),
    tileCandidates,
    chosenTileSize: BASE_TILE_SIZE,
    warnings: [
      hasAlphaChannel && !hasMeaningfulAlpha
        ? "PNG has an RGBA color type, but every alpha value is 255; exact chroma-key removal is required."
        : undefined,
      !hasMeaningfulAlpha && !sameRgb(chroma, [0, 255, 0])
        ? `The matte is ${rgbHex(chroma)}, not #00FF00; importer removes only that exact RGB value.`
        : undefined,
      source.width % BASE_TILE_SIZE !== 0 || source.height % BASE_TILE_SIZE !== 0
        ? `Chosen ${BASE_TILE_SIZE}px tile size does not divide source dimensions.`
        : undefined
    ].filter(Boolean)
  };
}

function cleanSource(source, analysis) {
  const output = cloneImage(source);
  if (analysis.backgroundMode === "alpha") return output;
  const key = analysis.transparentColor;
  for (let i = 0; i < output.data.length; i += 4) {
    if (output.data[i] === key[0] && output.data[i + 1] === key[1] && output.data[i + 2] === key[2]) {
      output.data[i + 3] = TRANSPARENT_ALPHA;
    }
  }
  return output;
}

function verifyGroupCoverage(image) {
  let opaquePixels = 0;
  let coveredPixels = 0;
  const uncoveredSamples = [];
  const uncoveredBounds = { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY };

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (!isOpaqueAt(image, x, y)) continue;
      opaquePixels += 1;
      if (groupForRect({ x, y, width: 1, height: 1 })) {
        coveredPixels += 1;
      } else {
        if (uncoveredSamples.length < 20) uncoveredSamples.push({ x, y });
        uncoveredBounds.minX = Math.min(uncoveredBounds.minX, x);
        uncoveredBounds.minY = Math.min(uncoveredBounds.minY, y);
        uncoveredBounds.maxX = Math.max(uncoveredBounds.maxX, x);
        uncoveredBounds.maxY = Math.max(uncoveredBounds.maxY, y);
      }
    }
  }

  return {
    opaquePixels,
    coveredPixels,
    uncoveredPixels: opaquePixels - coveredPixels,
    uncoveredSamples,
    uncoveredBounds: Number.isFinite(uncoveredBounds.minX) ? uncoveredBounds : undefined
  };
}

function extractUniqueTiles(image) {
  const byHash = new Map();
  const gridColumns = image.width / BASE_TILE_SIZE;
  const gridRows = image.height / BASE_TILE_SIZE;
  if (!Number.isInteger(gridColumns) || !Number.isInteger(gridRows)) {
    throw new Error(`Source dimensions ${image.width}x${image.height} are not divisible by ${BASE_TILE_SIZE}.`);
  }

  let sourceCellCount = 0;
  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridColumns; col += 1) {
      const source = { x: col * BASE_TILE_SIZE, y: row * BASE_TILE_SIZE, width: BASE_TILE_SIZE, height: BASE_TILE_SIZE };
      const opaquePixels = countOpaque(image, source);
      if (!opaquePixels) continue;
      sourceCellCount += 1;
      const crop = cropImage(image, source);
      const hash = crypto.createHash("sha1").update(crop.data).digest("hex");
      const group = groupForRect(source) ?? GROUPS[0];
      const occurrence = { ...source, row, col, opaquePixels };
      if (!byHash.has(hash)) {
        byHash.set(hash, {
          hash,
          group,
          source,
          sourceGrid: { row, col },
          occurrences: [occurrence],
          opaquePixels
        });
      } else {
        byHash.get(hash).occurrences.push(occurrence);
      }
    }
  }

  const tileEntries = [];
  const counters = new Map();
  for (const item of byHash.values()) {
    const theme = inferThemeForRect(image, item.source, item.group);
    const sequence = nextCounter(counters, `${item.group.id}_${theme.id}`);
    const id = snake(`${item.group.assetPrefix}_${theme.id}_tile_${sequence.toString().padStart(3, "0")}`);
    const kind = tileKindForGroup(item.group, theme);
    const walkability = walkabilityFor(kind, item.group, theme);
    tileEntries.push({
      id,
      displayName: `${titleCaseWords(item.group.assetPrefix)} ${titleCaseWords(theme.id)} Tile ${sequence.toString().padStart(3, "0")}`,
      kind,
      group: item.group.id,
      biome: theme.biome,
      source: {
        image: path.basename(CLEANED_PATH),
        ...item.source
      },
      sourceGrid: item.sourceGrid,
      sourceOccurrences: item.occurrences.map((occurrence) => ({
        x: occurrence.x,
        y: occurrence.y,
        row: occurrence.row,
        col: occurrence.col
      })),
      repeatCount: item.occurrences.length,
      anchor: { x: 0.5, y: 1.0 },
      walkability,
      movementCost: movementCostFor(walkability, theme),
      placement: placementFor(theme),
      worldgen: {
        weight: worldgenWeightFor(item.occurrences.length, theme),
        tags: unique(["tile", "grid", item.group.id, item.group.themeHint, theme.id, ...theme.tags]),
        compatibleWith: compatibleBiomesFor(theme),
        canRepeat: true,
        canRotate: false,
        canMirror: false,
        connects: connectionMetadataFor(theme),
        requiresNeighborLogic: theme.tags.some((tag) => ["road", "river", "shore", "cliff", "wall", "connector"].includes(tag))
      },
      confidence: confidenceForTile(item.group, theme, item.opaquePixels),
      notes: item.occurrences.length > 1 ? `Deduplicated from ${item.occurrences.length} identical 16x16 source cells.` : ""
    });
  }

  tileEntries.sort((a, b) => a.source.y - b.source.y || a.source.x - b.source.x || a.id.localeCompare(b.id));
  tileEntries.analysis = { sourceCellCount };
  return tileEntries;
}

function extractObjects(image, components) {
  const filtered = components.filter(
    (component) =>
      component.pixelCount >= COMPONENT_MIN_PIXELS &&
      (component.width >= COMPONENT_MIN_SIZE || component.height >= COMPONENT_MIN_SIZE)
  );
  const counters = new Map();
  const objects = [];

  for (const component of filtered) {
    const source = { x: component.x, y: component.y, width: component.width, height: component.height };
    const group = groupForRect(source) ?? GROUPS[0];
    const theme = inferThemeForRect(image, source, group);
    const kind = objectKindFor(component, group, theme);
    const sequence = nextCounter(counters, `${group.id}_${kind}_${theme.id}`);
    const id = snake(`${group.assetPrefix}_${theme.id}_${kind}_${sequence.toString().padStart(3, "0")}`);
    const walkability = objectWalkabilityFor(kind, group, theme);
    const tags = unique(["object", kind, group.id, group.themeHint, theme.id, ...theme.tags]);
    if (component.width >= 128 || component.height >= 128) tags.push("large_region");
    if (group.contentType === "grid" && component.width >= 128 && component.height >= 128) tags.push("terrain_region");

    objects.push({
      id,
      displayName: `${titleCaseWords(group.assetPrefix)} ${titleCaseWords(theme.id)} ${titleCaseWords(kind)} ${sequence.toString().padStart(3, "0")}`,
      kind,
      group: group.id,
      biome: theme.biome,
      source: {
        image: path.basename(CLEANED_PATH),
        ...source
      },
      anchor: { x: 0.5, y: 1.0 },
      footprint: {
        widthTiles: Math.ceil(component.width / BASE_TILE_SIZE),
        heightTiles: Math.ceil(component.height / BASE_TILE_SIZE)
      },
      walkability,
      placement: {
        allowedOn: allowedTerrainFor(group, theme),
        avoidOn: avoidTerrainFor(theme),
        minSpacing: kind === "landmark" || kind === "poi" ? 8 : 2,
        canRepeat: kind !== "poi",
        canRotate: false,
        canMirror: false,
        entryTileOffset: kind === "poi" || kind === "landmark" ? { x: Math.floor(component.width / BASE_TILE_SIZE / 2), y: Math.max(0, Math.ceil(component.height / BASE_TILE_SIZE) - 1) } : undefined
      },
      worldgen: {
        weight: kind === "landmark" || kind === "poi" ? 0.25 : 0.75,
        tags,
        minSpacing: kind === "landmark" || kind === "poi" ? 8 : 2,
        unique: false,
        requiresNeighborLogic: theme.tags.some((tag) => ["road", "river", "shore", "wall", "connector"].includes(tag))
      },
      component: {
        pixelCount: component.pixelCount,
        bounds: source
      },
      confidence: confidenceForObject(component, group, theme),
      notes: objectNotes(component, group)
    });
  }

  objects.sort((a, b) => a.source.y - b.source.y || a.source.x - b.source.x || a.id.localeCompare(b.id));
  return objects;
}

function buildManifest(source, sourceHash, analysis, groupCoverage, components, tiles, objects) {
  const groupMap = {};
  for (const entry of GROUPS) {
    groupMap[entry.id] = {
      displayName: entry.displayName,
      biome: entry.biome,
      sourceRect: entry.sourceRect,
      description: entry.description,
      likelyUse: entry.likelyUse,
      contains: entry.contentType === "grid" ? "grid tiles with some irregular connected regions" : entry.contentType === "irregular" ? "irregular objects and modular city pieces" : "grid tiles and irregular objects"
    };
  }

  return {
    schemaVersion: 1,
    id: TILESET_ID,
    sourceImage: relative(CLEANED_PATH),
    originalSource: SOURCE_IMAGE,
    copiedSource: relative(SOURCE_COPY_PATH),
    generatedBy: relative(__filename),
    image: {
      width: source.width,
      height: source.height,
      sourceColorType: source.sourceColorType,
      hasAlpha: analysis.hasAlphaChannel,
      hasMeaningfulAlpha: analysis.hasMeaningfulAlpha,
      backgroundMode: analysis.backgroundMode,
      transparentColor: analysis.transparentColorHex,
      exactTransparentPixelCount: analysis.exactChromaPixels,
      sourceSha256: sourceHash
    },
    baseGrid: {
      detectedTileSizes: analysis.tileCandidates.filter((candidate) => candidate.dividesWidth && candidate.dividesHeight).map((candidate) => candidate.size),
      checkedTileSizes: analysis.tileCandidates,
      chosenTileSize: BASE_TILE_SIZE,
      columns: source.width / BASE_TILE_SIZE,
      rows: source.height / BASE_TILE_SIZE,
      notes: "The sheet dimensions are exactly 52x67 cells at 16px. Larger 32px chunks exist visually but the sheet height is not divisible by 32."
    },
    groups: groupMap,
    analysis: {
      totalOpaquePixels: groupCoverage.opaquePixels,
      groupedOpaquePixels: groupCoverage.coveredPixels,
      ungroupedOpaquePixels: groupCoverage.uncoveredPixels,
      connectedComponents: components.length,
      connectedComponentsRepresentedAsObjects: objects.length,
      nonEmptySourceCells16: tiles.analysis?.sourceCellCount ?? undefined,
      uniqueExtractedTiles16: tiles.length,
      warnings: analysis.warnings
    },
    tiles: Object.fromEntries(
      tiles.map((tile) => [
        tile.id,
        {
          displayName: tile.displayName,
          kind: tile.kind,
          group: tile.group,
          biome: tile.biome,
          source: tile.source,
          sourceGrid: tile.sourceGrid,
          sourceOccurrences: tile.sourceOccurrences,
          repeatCount: tile.repeatCount,
          anchor: tile.anchor,
          walkability: tile.walkability,
          movementCost: tile.movementCost,
          placement: tile.placement,
          worldgen: tile.worldgen,
          confidence: tile.confidence,
          notes: tile.notes
        }
      ])
    ),
    objects: Object.fromEntries(
      objects.map((object) => [
        object.id,
        {
          displayName: object.displayName,
          kind: object.kind,
          group: object.group,
          biome: object.biome,
          source: object.source,
          anchor: object.anchor,
          footprint: object.footprint,
          walkability: object.walkability,
          placement: stripUndefined(object.placement),
          worldgen: object.worldgen,
          component: object.component,
          confidence: object.confidence,
          notes: object.notes
        }
      ])
    )
  };
}

function buildSourceAnalysisReport(source, analysis, groupCoverage, components) {
  const candidateRows = analysis.tileCandidates
    .map(
      (candidate) =>
        `| ${candidate.size}px | ${candidate.dividesWidth ? "yes" : "no"} | ${candidate.dividesHeight ? "yes" : "no"} | ${candidate.columns}x${candidate.rows} | ${candidate.remainder.width},${candidate.remainder.height} |`
    )
    .join("\n");
  const groupRows = GROUPS.map(
    (entry) =>
      `| \`${entry.id}\` | ${entry.displayName} | ${entry.sourceRect.x},${entry.sourceRect.y},${entry.sourceRect.width},${entry.sourceRect.height} | ${entry.biome} | ${entry.contentType} |`
  ).join("\n");
  const colorRows = analysis.topColors
    .map((entry) => `| \`${rgbaToHexText(entry.key)}\` | ${entry.count} | ${entry.percent}% |`)
    .join("\n");

  return `# Classic World Tileset Source Analysis

Source path: \`${SOURCE_IMAGE}\`
Copied source: \`${relative(SOURCE_COPY_PATH)}\`
Dimensions: ${source.width}x${source.height}
File format: PNG, ${source.sourceColorType}, 8-bit/channel
Alpha channel present: ${analysis.hasAlphaChannel}
Meaningful alpha transparency present: ${analysis.hasMeaningfulAlpha}
Background mode chosen: ${analysis.backgroundMode}
Detected chroma-key color: \`${analysis.transparentColorHex ?? "n/a"}\`
Exact chroma-key pixels: ${analysis.exactChromaPixels} (${analysis.exactChromaPercent}%)
Chosen base tile size: ${BASE_TILE_SIZE}x${BASE_TILE_SIZE}
Major groups: ${GROUPS.length}
Connected components after transparency cleanup: ${components.length}

## Alpha And Chroma Key

The PNG uses an RGBA color type, but alpha analysis found ${analysis.alphaNonOpaque} non-opaque pixels and ${analysis.alphaZero} fully transparent pixels. The importer therefore treats the exact dominant border color \`${analysis.transparentColorHex}\` as transparent. No fuzzy green tolerance is used.

## Tile Size Candidates

| Candidate | Width divides | Height divides | Grid | Remainder |
|---:|---|---|---:|---:|
${candidateRows}

## Major Groups

The 12 rectangles below were visually verified against the sheet and cover ${groupCoverage.coveredPixels} of ${groupCoverage.opaquePixels} non-background pixels.

| ID | Name | Source Rect | Biome | Content |
|---|---|---:|---|---|
${groupRows}

## Dominant Colors

| Color | Pixels | Percent |
|---|---:|---:|
${colorRows}

## Warnings

${analysis.warnings.length ? analysis.warnings.map((warning) => `- ${warning}`).join("\n") : "- None."}

## Notes

- The repeated grid is 52 columns x 67 rows at 16px.
- Some regions contain large connected landmass art; those are also represented as object crops, while individual 16px cells are deduplicated as terrain/city/connector tiles.
- Runtime gameplay does not load this tileset yet.
`;
}

function buildImportReport(manifest, paths) {
  const tileCount = Object.keys(manifest.tiles).length;
  const objectValues = Object.values(manifest.objects);
  const landmarkCount = objectValues.filter((asset) => asset.kind === "landmark" || asset.kind === "poi").length;
  const objectCount = objectValues.length - landmarkCount;
  const lowConfidence = paths.lowConfidenceAssets;
  const groupList = Object.entries(manifest.groups)
    .map(([id, entry]) => `- \`${id}\`: ${entry.displayName} (${entry.biome})`)
    .join("\n");
  const lowConfidenceList = lowConfidence
    .slice(0, 80)
    .map((asset) => `- \`${asset.id}\`: ${asset.group}, ${asset.biome}, ${asset.kind}`)
    .join("\n");

  return `# Classic World Tileset Import Report

Source: \`${SOURCE_IMAGE}\`
Copied source: \`${manifest.copiedSource}\`
Cleaned source: \`${manifest.sourceImage}\`
Manifest: \`${relative(MANIFEST_PATH)}\`
Importer: \`${relative(__filename)}\`

## Totals

- Groups: ${Object.keys(manifest.groups).length}
- Unique 16x16 terrain/city/connector tiles: ${tileCount}
- Object crops: ${objectCount}
- Landmark/POI crops: ${landmarkCount}
- Low-confidence assets: ${lowConfidence.length}
- Non-empty 16x16 source cells represented through tile occurrences: ${manifest.analysis.nonEmptySourceCells16}

## Group Names

${groupList}

## Debug Outputs

- Group detection: \`${relative(paths.groupPreviewPath)}\`
- Terrain tile contact sheet: \`${relative(paths.terrainContactPath)}\`
- Objects contact sheet: \`${relative(paths.objectContactPath)}\`
- Landmarks contact sheet: \`${relative(paths.landmarkContactPath)}\`
- Source analysis: \`${relative(path.join(DEBUG_DIR, "source-analysis.md"))}\`

## Extraction Strategy

- The source file is copied unchanged for provenance.
- A cleaned PNG is created by turning only exact \`${manifest.image.transparentColor}\` pixels transparent.
- 16x16 non-empty source cells are deduplicated by image hash and written to \`${relative(TILE_OUTPUT_DIR)}\`.
- Connected components of at least ${COMPONENT_MIN_PIXELS} pixels are tightly cropped into object or landmark PNGs.
- Very small disconnected details remain represented by their 16x16 tile entries.
- This pack is intentionally not wired into the active Phaser overworld renderer yet.

## Worldgen Metadata

Each tile/object has a biome, walkability class, placement rules, repeat/spacing hints, tags, and neighbor-logic hints for roads, rivers, shores, walls, cliffs, and connectors. Water and lava are blocked; bridges/roads/city entries are walkable or POI-entry candidates.

## Low-Confidence Assets

${lowConfidence.length ? lowConfidenceList + (lowConfidence.length > 80 ? `\n- ... ${lowConfidence.length - 80} more low-confidence entries; see the manifest for the full list.` : "") : "- None."}

## Manual Correction Workflow

1. Edit \`${relative(MANIFEST_PATH)}\` for semantic naming, biome, placement, or walkability corrections.
2. If source rectangles or extraction rules need to change, edit \`${relative(__filename)}\`.
3. Rerun \`npm run import:classic-world-tileset\`.
4. Rerun \`npm run test:classic-world-tileset\` and \`npm test\`.

## Suggested Human Review

- Confirm legal/provenance rights before wiring this classic-style sheet into the playable game.
- Review low-confidence entries whose names are intentionally conservative.
- Decide later which subset should become procedural terrain pools versus POI overlays.
`;
}

function buildGroupDetectionPreview(source) {
  const preview = cloneImage(source);
  const colors = [
    [255, 96, 96, 255],
    [255, 176, 64, 255],
    [255, 240, 96, 255],
    [128, 232, 96, 255],
    [80, 216, 184, 255],
    [96, 192, 255, 255],
    [160, 144, 255, 255],
    [232, 128, 255, 255],
    [255, 128, 184, 255],
    [224, 224, 224, 255],
    [128, 128, 128, 255],
    [96, 255, 128, 255]
  ];
  GROUPS.forEach((entry, index) => {
    const color = colors[index % colors.length];
    drawRect(preview, entry.sourceRect.x, entry.sourceRect.y, entry.sourceRect.width - 1, entry.sourceRect.height - 1, color);
    drawRect(preview, entry.sourceRect.x + 1, entry.sourceRect.y + 1, entry.sourceRect.width - 3, entry.sourceRect.height - 3, color);
    drawFilledRect(preview, entry.sourceRect.x, Math.max(0, entry.sourceRect.y - 12), Math.min(entry.sourceRect.width, 152), 11, [0, 0, 0, 190]);
    drawText(preview, `${index + 1}:${entry.id}`, entry.sourceRect.x + 2, Math.max(1, entry.sourceRect.y - 10), color, 1);
  });
  return preview;
}

function buildContactSheet(source, assets, title, columns) {
  const labelHeight = 18;
  const margin = 8;
  const scale = 2;
  const thumbWidth = 64;
  const thumbHeight = 64;
  const cellWidth = thumbWidth + margin;
  const cellHeight = thumbHeight + labelHeight + margin;
  const rows = Math.max(1, Math.ceil(assets.length / columns));
  const width = columns * cellWidth + margin;
  const height = rows * cellHeight + margin + 24;
  const sheet = makeImage(width, height, [20, 24, 32, 255]);
  drawText(sheet, `${title} ${assets.length}`, margin, 8, [255, 245, 205, 255], 1);

  assets.forEach((asset, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + col * cellWidth;
    const y = margin + 24 + row * cellHeight;
    drawCheckerRect(sheet, x, y, thumbWidth, thumbHeight, 8, [36, 42, 54, 255], [28, 34, 46, 255]);
    blitScaledFit(source, sheet, asset.source, x, y, thumbWidth, thumbHeight, scale);
    drawRect(sheet, x, y, thumbWidth - 1, thumbHeight - 1, [96, 128, 176, 255]);
    drawText(sheet, shortAssetLabel(asset, index), x, y + thumbHeight + 3, asset.confidence === "low" ? [255, 160, 128, 255] : [194, 220, 255, 255], 1);
  });

  return sheet;
}

function shortAssetLabel(asset, index) {
  const suffix = asset.id.split("_").slice(-2).join("_");
  return `${index.toString().padStart(3, "0")} ${suffix}`.slice(0, 14);
}

function inferThemeForRect(image, rect, group) {
  const stats = colorStats(image, rect);
  const total = Math.max(1, stats.total);
  const ratios = {
    water: stats.blue / total,
    green: stats.green / total,
    white: stats.white / total,
    red: stats.red / total,
    orange: stats.orange / total,
    dark: stats.dark / total,
    gray: stats.gray / total,
    tan: stats.tan / total,
    purple: stats.purple / total
  };

  if (group.biome === "city" && ratios.red > 0.08) return theme("red_roof_city", "city", ["city", "roof", "poi"]);
  if (group.biome === "city" && ratios.blue > 0.1) return theme("blue_roof_city", "city", ["city", "roof", "poi"]);
  if (group.biome === "city") return theme("settlement", "city", ["city", "poi"]);
  if (group.id.includes("dark") && ratios.dark > 0.35) return theme("darkland", "darkland", ["darkland", "blocked"]);
  if (ratios.blue > 0.35) return theme(group.id.includes("arctic") ? "ice_water" : "water", "water", ["water"]);
  if (ratios.orange > 0.12 || ratios.red > 0.2 && group.biome === "volcano") return theme("lava", "volcano", ["lava", "blocked"]);
  if (ratios.white > 0.35) return theme("snow_ice", "snow", ["snow", "ice"]);
  if (ratios.gray > 0.45) return theme(group.id.includes("dark") ? "dark_stone" : "stone", group.biome === "special" ? "ruin" : "mountain", ["stone", "mountain"]);
  if (ratios.tan > 0.35) return theme("sand_or_path", group.biome === "water" ? "coast" : "desert", ["sand", "path"]);
  if (ratios.green > 0.35) return theme(group.id.includes("forest") || group.id.includes("coast") ? "forest_grass" : "grass", group.biome === "special" ? "grassland" : group.biome, ["grass", "forest"]);
  if (ratios.purple > 0.1) return theme("corrupted_magic", "darkland", ["magic", "corrupt"]);
  if (stats.total < BASE_TILE_SIZE * BASE_TILE_SIZE * 0.2) return theme("small_detail", group.biome, ["detail"]);
  return theme(`${group.themeHint}_mixed`, group.biome, ["mixed"]);
}

function theme(id, biome, tags) {
  return { id, biome, tags };
}

function colorStats(image, rect) {
  const stats = { total: 0, water: 0, blue: 0, green: 0, white: 0, red: 0, orange: 0, dark: 0, gray: 0, tan: 0, purple: 0 };
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (!isOpaqueAt(image, x, y)) continue;
      const [r, g, b] = pixelAt(image, x, y);
      stats.total += 1;
      if (b > r + 24 && b > g + 8) stats.blue += 1;
      if (g > r + 8 && g >= b) stats.green += 1;
      if (r > 196 && g > 196 && b > 184) stats.white += 1;
      if (r > 128 && r > g + 24 && r > b + 24) stats.red += 1;
      if (r > 144 && g > 72 && g < 176 && b < 112) stats.orange += 1;
      if (r < 64 && g < 72 && b < 80) stats.dark += 1;
      if (Math.abs(r - g) < 22 && Math.abs(g - b) < 22 && r > 80 && r < 224) stats.gray += 1;
      if (r > 112 && g > 88 && b < 96 && Math.abs(r - g) < 96) stats.tan += 1;
      if (r > 96 && b > 96 && g < 96) stats.purple += 1;
    }
  }
  return stats;
}

function tileKindForGroup(group, themeData) {
  if (group.biome === "city") return "city_piece";
  if (themeData.tags.some((tag) => ["road", "river", "shore", "wall", "connector"].includes(tag))) return "autotile_piece";
  if (group.contentType === "irregular") return "autotile_piece";
  return "terrain_tile";
}

function objectKindFor(component, group, themeData) {
  const large = component.width >= 64 || component.height >= 64;
  if (group.biome === "city" && large) return "poi";
  if ((group.id.includes("castle") || group.id.includes("landmark") || group.id.includes("volcanic") || group.id.includes("arctic")) && large) return "landmark";
  if (themeData.tags.includes("detail") || component.width < 24 && component.height < 24) return "decoration";
  return large ? "landmark" : "object";
}

function walkabilityFor(kind, group, themeData) {
  if (themeData.tags.includes("water")) return "water";
  if (themeData.tags.includes("lava")) return "blocked";
  if (themeData.tags.includes("blocked") && group.biome !== "darkland") return "blocked";
  if (kind === "city_piece") return "poi_entry";
  if (themeData.tags.includes("stone") && group.biome === "mountain") return "blocked";
  return "walkable";
}

function objectWalkabilityFor(kind, group, themeData) {
  if (themeData.tags.includes("water")) return "water";
  if (themeData.tags.includes("lava") || themeData.tags.includes("blocked")) return "blocked";
  if (kind === "poi" || kind === "landmark") return "poi_entry";
  if (kind === "decoration") return "decorative_overlay";
  if (group.biome === "city") return "poi_entry";
  return "decorative_overlay";
}

function movementCostFor(walkability, themeData) {
  if (walkability === "water" || walkability === "blocked") return 99;
  if (themeData.tags.includes("path") || themeData.tags.includes("city")) return 0.8;
  if (themeData.tags.includes("forest")) return 1.4;
  if (themeData.tags.includes("snow") || themeData.tags.includes("ice")) return 1.5;
  if (themeData.tags.includes("stone") || themeData.tags.includes("mountain")) return 2;
  return 1;
}

function placementFor(themeData) {
  return {
    allowedOn: compatibleBiomesFor(themeData),
    avoidOn: avoidTerrainFor(themeData),
    minSpacing: 0,
    canRepeat: true,
    canRotate: false,
    canMirror: false
  };
}

function compatibleBiomesFor(themeData) {
  if (themeData.tags.includes("water")) return ["water", "coast"];
  if (themeData.tags.includes("lava")) return ["volcano", "darkland"];
  if (themeData.tags.includes("snow") || themeData.tags.includes("ice")) return ["snow"];
  if (themeData.tags.includes("city")) return ["grassland", "coast", "road"];
  if (themeData.tags.includes("forest")) return ["grassland", "forest"];
  if (themeData.tags.includes("stone") || themeData.tags.includes("mountain")) return ["mountain", "hills", "darkland"];
  return [themeData.biome];
}

function allowedTerrainFor(group, themeData) {
  if (group.biome === "city") return ["grassland", "coast", "road"];
  return compatibleBiomesFor(themeData);
}

function avoidTerrainFor(themeData) {
  if (themeData.tags.includes("water")) return ["lava"];
  if (themeData.tags.includes("lava")) return ["water"];
  if (themeData.tags.includes("city")) return ["water", "lava", "mountain"];
  return ["water", "lava"];
}

function connectionMetadataFor(themeData) {
  if (themeData.tags.includes("water")) return { type: "water_or_river", requiresNeighborLogic: true };
  if (themeData.tags.includes("path")) return { type: "road_or_path", requiresNeighborLogic: true };
  if (themeData.tags.includes("stone")) return { type: "cliff_or_wall", requiresNeighborLogic: true };
  return {};
}

function confidenceForTile(group, themeData, opaquePixels) {
  if (themeData.tags.includes("mixed") || themeData.tags.includes("detail")) return "low";
  if (group.contentType === "irregular" || opaquePixels < 48) return "medium";
  return "medium";
}

function confidenceForObject(component, group, themeData) {
  if (themeData.tags.includes("mixed") || component.pixelCount < 96) return "low";
  if (group.contentType === "mixed") return "medium";
  return "medium";
}

function objectNotes(component, group) {
  const notes = [];
  if (component.width >= 128 || component.height >= 128) notes.push("Large connected region; review before placing as a single POI.");
  if (group.contentType === "grid" && (component.width >= 128 || component.height >= 128)) notes.push("Grid terrain also represented by 16x16 tile entries.");
  return notes.join(" ");
}

function worldgenWeightFor(repeatCount, themeData) {
  if (themeData.tags.includes("water") || themeData.tags.includes("grass") || themeData.tags.includes("forest")) return Math.max(1, Math.min(5, Math.round(repeatCount / 10)));
  if (themeData.tags.includes("lava") || themeData.tags.includes("city")) return 0.5;
  return 1;
}

function findComponents(image) {
  const seen = new Uint8Array(image.width * image.height);
  const queue = new Int32Array(image.width * image.height);
  const components = [];
  const dirs = [1, 0, -1, 0, 0, 1, 0, -1];

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const start = y * image.width + x;
      if (seen[start] || !isOpaqueAt(image, x, y)) continue;
      let head = 0;
      let tail = 0;
      let pixelCount = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      seen[start] = 1;
      queue[tail++] = start;

      while (head < tail) {
        const current = queue[head++];
        const cx = current % image.width;
        const cy = Math.floor(current / image.width);
        pixelCount += 1;
        minX = Math.min(minX, cx);
        minY = Math.min(minY, cy);
        maxX = Math.max(maxX, cx);
        maxY = Math.max(maxY, cy);

        for (let i = 0; i < dirs.length; i += 2) {
          const nx = cx + dirs[i];
          const ny = cy + dirs[i + 1];
          if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
          const ni = ny * image.width + nx;
          if (seen[ni] || !isOpaqueAt(image, nx, ny)) continue;
          seen[ni] = 1;
          queue[tail++] = ni;
        }
      }

      components.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, pixelCount });
    }
  }

  components.sort((a, b) => b.pixelCount - a.pixelCount);
  return components;
}

function groupForRect(rect) {
  let best;
  let bestArea = 0;
  for (const groupEntry of GROUPS) {
    const area = intersectionArea(rect, groupEntry.sourceRect);
    if (area > bestArea) {
      bestArea = area;
      best = groupEntry;
    }
  }
  return best;
}

function intersectionArea(a, b) {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  if (x1 <= x0 || y1 <= y0) return 0;
  return (x1 - x0) * (y1 - y0);
}

function countOpaque(image, rect) {
  let count = 0;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (isOpaqueAt(image, x, y)) count += 1;
    }
  }
  return count;
}

function cropImage(image, rect) {
  const output = makeImage(rect.width, rect.height);
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const sx = rect.x + x;
      const sy = rect.y + y;
      if (sx < 0 || sy < 0 || sx >= image.width || sy >= image.height) continue;
      copyPixel(image, output, sx, sy, x, y);
    }
  }
  return output;
}

function blitScaledFit(source, dest, rect, destX, destY, maxWidth, maxHeight, preferredScale) {
  const scale = Math.max(0.05, Math.min(preferredScale, maxWidth / rect.width, maxHeight / rect.height));
  const drawnWidth = Math.max(1, Math.floor(rect.width * scale));
  const drawnHeight = Math.max(1, Math.floor(rect.height * scale));
  const offsetX = destX + Math.floor((maxWidth - drawnWidth) / 2);
  const offsetY = destY + Math.floor((maxHeight - drawnHeight) / 2);
  for (let y = 0; y < drawnHeight; y += 1) {
    const sy = rect.y + Math.min(rect.height - 1, Math.floor(y / scale));
    for (let x = 0; x < drawnWidth; x += 1) {
      const sx = rect.x + Math.min(rect.width - 1, Math.floor(x / scale));
      const color = pixelAt(source, sx, sy);
      if (!color[3]) continue;
      setPixel(dest, offsetX + x, offsetY + y, color);
    }
  }
}

function copyPixel(source, dest, sx, sy, dx, dy) {
  const si = (sy * source.width + sx) * 4;
  const di = (dy * dest.width + dx) * 4;
  dest.data[di] = source.data[si];
  dest.data[di + 1] = source.data[si + 1];
  dest.data[di + 2] = source.data[si + 2];
  dest.data[di + 3] = source.data[si + 3];
}

function isOpaqueAt(image, x, y) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return false;
  return image.data[(y * image.width + x) * 4 + 3] > 0;
}

function pixelAt(image, x, y) {
  const i = (y * image.width + x) * 4;
  return [image.data[i], image.data[i + 1], image.data[i + 2], image.data[i + 3]];
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = (y * image.width + x) * 4;
  image.data[i] = color[0];
  image.data[i + 1] = color[1];
  image.data[i + 2] = color[2];
  image.data[i + 3] = color[3];
}

function makeImage(width, height, fill = [0, 0, 0, 0]) {
  const data = Buffer.alloc(width * height * 4);
  if (fill.some((value) => value !== 0)) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = fill[3];
    }
  }
  return { width, height, data, sourceColorType: "RGBA" };
}

function cloneImage(image) {
  return { width: image.width, height: image.height, sourceColorType: image.sourceColorType, data: Buffer.from(image.data) };
}

function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error(`Not a PNG: ${filePath}`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  const sourceBpp = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bitDepth !== 8 || !sourceBpp) {
    throw new Error(`Unsupported PNG format in ${filePath}; expected 8-bit RGB/RGBA, got bitDepth=${bitDepth}, colorType=${colorType}.`);
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const raw = unfilter(inflated, width, height, sourceBpp);
  const rgba = makeImage(width, height, [0, 0, 0, 255]);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    rgba.data[pixel * 4] = raw[pixel * sourceBpp];
    rgba.data[pixel * 4 + 1] = raw[pixel * sourceBpp + 1];
    rgba.data[pixel * 4 + 2] = raw[pixel * sourceBpp + 2];
    rgba.data[pixel * 4 + 3] = sourceBpp === 4 ? raw[pixel * sourceBpp + 3] : 255;
  }
  return { ...rgba, sourceColorType: colorType === 6 ? "RGBA" : "RGB", bitDepth, colorType };
}

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * bpp);
  let input = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[input++];
    const rowStart = y * stride;
    const prevRowStart = rowStart - stride;
    for (let x = 0; x < stride; x += 1) {
      const rawValue = raw[input++];
      const left = x >= bpp ? out[rowStart + x - bpp] : 0;
      const up = y > 0 ? out[prevRowStart + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[prevRowStart + x - bpp] : 0;
      let value = rawValue;
      if (filter === 1) value = rawValue + left;
      else if (filter === 2) value = rawValue + up;
      else if (filter === 3) value = rawValue + Math.floor((left + up) / 2);
      else if (filter === 4) value = rawValue + paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter type: ${filter}`);
      out[rowStart + x] = value & 0xff;
    }
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function writePng(filePath, image) {
  ensureDir(path.dirname(filePath));
  const rowBytes = image.width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const dest = y * (rowBytes + 1);
    raw[dest] = 0;
    image.data.copy(raw, dest + 1, y * rowBytes, y * rowBytes + rowBytes);
  }
  const chunks = [
    pngChunk("IHDR", ihdr(image.width, image.height)),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ];
  fs.writeFileSync(filePath, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), ...chunks]));
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

let CRC_TABLE;
function crc32(buffer) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function drawCheckerRect(image, x, y, width, height, size, a, b) {
  for (let yy = 0; yy < height; yy += 1) {
    for (let xx = 0; xx < width; xx += 1) {
      setPixel(image, x + xx, y + yy, Math.floor(xx / size + yy / size) % 2 === 0 ? a : b);
    }
  }
}

function drawFilledRect(image, x, y, width, height, color) {
  for (let yy = 0; yy < height; yy += 1) {
    for (let xx = 0; xx < width; xx += 1) setPixel(image, x + xx, y + yy, color);
  }
}

function drawRect(image, x, y, width, height, color) {
  drawLine(image, x, y, x + width, y, color);
  drawLine(image, x, y + height, x + width, y + height, color);
  drawLine(image, x, y, x, y + height, color);
  drawLine(image, x + width, y, x + width, y + height, color);
}

function drawLine(image, x0, y0, x1, y1, color) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPixel(image, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function drawText(image, text, x, y, color, scale = 1) {
  let cursorX = x;
  for (const char of text.toUpperCase()) {
    if (char === "\n") {
      cursorX = x;
      y += 8 * scale;
      continue;
    }
    const glyph = FONT[char] ?? FONT["?"];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] !== "1") continue;
        for (let yy = 0; yy < scale; yy += 1) {
          for (let xx = 0; xx < scale; xx += 1) {
            setPixel(image, cursorX + col * scale + xx, y + row * scale + yy, color);
          }
        }
      }
    }
    cursorX += 6 * scale;
  }
}

function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topEntries(map, count) {
  const total = [...map.values()].reduce((sum, value) => sum + value, 0);
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([key, value]) => ({ key, count: value, percent: roundPercent(value, total) }));
}

function rgbaKey(color) {
  return `${color[0]},${color[1]},${color[2]},${color[3]}`;
}

function parseRgbaKey(key) {
  return key.split(",").map((value) => Number.parseInt(value, 10));
}

function countExactRgb(image, rgb) {
  let count = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    if (image.data[i] === rgb[0] && image.data[i + 1] === rgb[1] && image.data[i + 2] === rgb[2]) count += 1;
  }
  return count;
}

function roundPercent(value, total) {
  return total ? Math.round((value / total) * 100000) / 1000 : 0;
}

function sameRgb(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function rgbHex(rgb) {
  return `#${rgb.slice(0, 3).map((value) => value.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function rgbaToHexText(key) {
  const color = parseRgbaKey(key);
  return `${rgbHex(color)} / rgba(${color.join(",")})`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function nextCounter(counters, key) {
  const next = (counters.get(key) ?? 0) + 1;
  counters.set(key, next);
  return next;
}

function stripUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

function snake(value) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function titleCaseWords(value) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function safeCleanDir(dir) {
  const resolved = path.resolve(dir);
  const root = path.resolve(PROJECT_ROOT);
  if (!resolved.startsWith(root + path.sep)) throw new Error(`Refusing to clean outside project root: ${resolved}`);
  if (!resolved.includes(`${path.sep}src${path.sep}assets${path.sep}world${path.sep}tilesets${path.sep}classic${path.sep}extracted${path.sep}`)) {
    throw new Error(`Refusing to clean unexpected output directory: ${resolved}`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function relative(targetPath) {
  return normalizeSlash(path.relative(PROJECT_ROOT, targetPath));
}

function normalizeSlash(value) {
  return value.replace(/\\/g, "/");
}

const FONT = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "?": ["11110", "00001", "00001", "00110", "00100", "00000", "00100"],
  "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
};

main();
