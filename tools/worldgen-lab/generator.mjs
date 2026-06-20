export const BIOME = {
  WATER: 0,
  GRASS: 1,
  SAND: 2,
  ICE: 3,
  BEACH: 4
};

export const WATER = {
  NONE: 0,
  DEEP: 1,
  SHALLOW: 2,
  RIVER: 3,
  LAKE: 4
};

export const BIOME_NAMES = {
  [BIOME.WATER]: "water",
  [BIOME.GRASS]: "grassland",
  [BIOME.SAND]: "sand",
  [BIOME.ICE]: "ice",
  [BIOME.BEACH]: "beach"
};

const LAND_THRESHOLD = 0.08;
const SHALLOW_BAND = 7;
const BEACH_BAND = 2;
const INF = 1_000_000;

export function generateWorldLab(options = {}) {
  const seed = options.seed ?? "worldgen-lab";
  const width = options.width ?? 192;
  const height = options.height ?? 120;
  const rng = createSeededRng(seed);

  const islandSpecs = createIslandSpecs(width, height, rng);
  const fields = createBaseFields(width, height, seed, islandSpecs);
  let landMask = fields.landMask;
  landMask = smoothLand(landMask, width, height, 2);
  landMask = pruneLand(landMask, width, height, 18);
  const components = labelIslands(landMask, width, height);
  const islandId = components.idMap;
  const islandRecords = buildIslandRecords(components.components, islandSpecs, width, height);
  const distanceToLand = computeDistanceToMask(landMask, width, height, true);
  const distanceToWater = computeDistanceToMask(landMask, width, height, false);
  const waterClass = classifyWater(landMask, distanceToLand, width, height);
  const { moisture, temperature, coldness } = createClimateFields(width, height, seed, landMask, distanceToWater, islandId, islandRecords);
  const ridge = createRidgeField(width, height, seed, landMask, distanceToWater, islandId, islandRecords);
  const elevation = finalizeElevation(width, height, seed, landMask, distanceToWater, fields.baseElevation, ridge);
  const biome = classifyBiomes(width, height, landMask, distanceToWater, islandId, islandRecords, elevation, moisture, coldness);
  const mountainMap = new Uint8Array(width * height);
  const mountains = placeMountains(width, height, seed, landMask, distanceToWater, elevation, ridge, coldness, mountainMap);
  const lakeMap = new Uint8Array(width * height);
  const lakes = placeLakes(width, height, seed, landMask, distanceToWater, elevation, moisture, biome, lakeMap);
  const riverMap = new Uint8Array(width * height);
  const rivers = traceRivers(width, height, seed, landMask, waterClass, lakeMap, distanceToWater, elevation, coldness, ridge, riverMap);
  const { poiList, harbors } = placePois(width, height, seed, landMask, waterClass, distanceToWater, islandId, islandRecords, biome, elevation, mountainMap, lakeMap);
  const roadMap = new Uint8Array(width * height);
  const roadGraph = buildRoadGraph(width, height, islandId, islandRecords, biome, waterClass, mountainMap, lakeMap, poiList, harbors, roadMap);
  const forestMap = placeForests(width, height, seed, landMask, biome, moisture, mountainMap, roadMap, poiList);
  const walkability = buildWalkability(width, height, landMask, waterClass, lakeMap, mountainMap);
  const validation = validateWorld({
    width,
    height,
    landMask,
    islandRecords,
    waterClass,
    distanceToWater,
    biome,
    mountainMap,
    forestMap,
    roadMap,
    riverMap,
    rivers,
    poiList,
    harbors,
    roadGraph
  });

  return {
    seed,
    width,
    height,
    islandSpecs,
    islandRecords,
    layers: {
      elevation,
      landMask,
      islandId,
      distanceToLand,
      distanceToWater,
      waterClass,
      biome,
      moisture,
      temperature,
      coldness,
      ridge,
      mountainMap,
      lakeMap,
      riverMap,
      forestMap,
      roadMap,
      walkability
    },
    mountains,
    lakes,
    rivers,
    poiList,
    harbors,
    roadGraph,
    validation,
    stats: summarizeWorld(width, height, landMask, waterClass, biome, mountainMap, forestMap, roadMap, riverMap, poiList, harbors)
  };
}

function createIslandSpecs(width, height, rng) {
  const anchors = rng.shuffle([
    [0.25, 0.25],
    [0.68, 0.27],
    [0.28, 0.70],
    [0.70, 0.66]
  ]);
  const largeCount = rng.int(2, 4);
  const specs = [];

  for (let i = 0; i < largeCount; i += 1) {
    const [ax, ay] = anchors[i];
    const radiusX = rng.float(18, 29);
    const radiusY = rng.float(13, 22);
    specs.push(createIslandSpec({
      id: i + 1,
      size: "large",
      centerX: clamp(Math.round(ax * width + rng.float(-8, 8)), 22, width - 22),
      centerY: clamp(Math.round(ay * height + rng.float(-6, 6)), 18, height - 18),
      radiusX,
      radiusY,
      rng,
      themeBias: chooseThemeBias(rng, i)
    }));
  }

  const smallCount = rng.int(4, 8);
  let attempts = 0;
  while (specs.length < largeCount + smallCount && attempts < 200) {
    attempts += 1;
    const radiusX = rng.float(5, 12);
    const radiusY = rng.float(4, 10);
    const centerX = rng.int(12, width - 12);
    const centerY = rng.int(12, height - 12);
    const tooClose = specs.some((spec) => {
      const dx = (centerX - spec.centerX) / (radiusX + spec.radiusX + 8);
      const dy = (centerY - spec.centerY) / (radiusY + spec.radiusY + 6);
      return dx * dx + dy * dy < 0.48;
    });
    if (tooClose) continue;
    specs.push(createIslandSpec({
      id: specs.length + 1,
      size: radiusX > 8 ? "medium" : "small",
      centerX,
      centerY,
      radiusX,
      radiusY,
      rng,
      themeBias: chooseThemeBias(rng, specs.length)
    }));
  }

  return specs;
}

function createIslandSpec({ id, size, centerX, centerY, radiusX, radiusY, rng, themeBias }) {
  const blobCount = size === "large" ? rng.int(7, 11) : rng.int(3, 6);
  const blobs = [{ x: centerX, y: centerY, rx: radiusX, ry: radiusY, weight: 1 }];
  for (let i = 1; i < blobCount; i += 1) {
    const angle = rng.float(0, Math.PI * 2);
    const dist = rng.float(0.2, 0.9);
    blobs.push({
      x: centerX + Math.cos(angle) * radiusX * dist,
      y: centerY + Math.sin(angle) * radiusY * dist,
      rx: radiusX * rng.float(0.38, 0.78),
      ry: radiusY * rng.float(0.38, 0.78),
      weight: rng.float(0.55, 0.95)
    });
  }
  const ridgeCount = size === "large" ? rng.int(1, 3) : rng.int(0, 1);
  const ridges = [];
  for (let i = 0; i < ridgeCount; i += 1) {
    const angle = rng.float(-0.9, 0.9) + (rng.chance(0.5) ? Math.PI / 2 : 0);
    const length = Math.min(radiusX, radiusY) * rng.float(1.4, 2.2);
    ridges.push({
      x1: centerX - Math.cos(angle) * length,
      y1: centerY - Math.sin(angle) * length,
      x2: centerX + Math.cos(angle) * length,
      y2: centerY + Math.sin(angle) * length,
      width: rng.float(2.8, 5.5),
      strength: rng.float(0.5, 1.0)
    });
  }
  return {
    id,
    size,
    centerX,
    centerY,
    radiusX,
    radiusY,
    blobs,
    ridges,
    dryBias: themeBias.dry,
    coldBias: themeBias.cold,
    mountainBias: themeBias.mountain,
    forestBias: themeBias.forest
  };
}

function chooseThemeBias(rng, index) {
  const presets = [
    { dry: -0.08, cold: 0.22, mountain: 0.22, forest: 0.08 },
    { dry: 0.16, cold: -0.08, mountain: 0.12, forest: -0.04 },
    { dry: -0.14, cold: -0.04, mountain: 0.04, forest: 0.24 },
    { dry: 0.04, cold: 0.08, mountain: 0.18, forest: 0.04 }
  ];
  const preset = presets[index % presets.length];
  return {
    dry: preset.dry + rng.float(-0.08, 0.08),
    cold: preset.cold + rng.float(-0.08, 0.08),
    mountain: preset.mountain + rng.float(-0.08, 0.08),
    forest: preset.forest + rng.float(-0.08, 0.08)
  };
}

function createBaseFields(width, height, seed, islandSpecs) {
  const landMask = new Uint8Array(width * height);
  const baseElevation = new Float32Array(width * height);

  forEachCell(width, height, (x, y, i) => {
    let value = -0.45;
    let elevation = 0;
    for (const spec of islandSpecs) {
      let islandValue = -1;
      for (const blob of spec.blobs) {
        const dx = (x - blob.x) / blob.rx;
        const dy = (y - blob.y) / blob.ry;
        const blobValue = (1 - dx * dx - dy * dy) * blob.weight;
        islandValue = Math.max(islandValue, blobValue);
      }
      const boundaryNoise = (fbm(`${seed}:coast:${spec.id}`, x / 18, y / 18, 4) - 0.5) * 0.36;
      const channelBias = channelBiasFromOtherIslands(spec, islandSpecs, x, y);
      value = Math.max(value, islandValue + boundaryNoise - channelBias);
      elevation = Math.max(elevation, islandValue);
    }
    baseElevation[i] = clamp01((elevation + 0.15) / 1.15);
    landMask[i] = value > LAND_THRESHOLD ? 1 : 0;
  });

  return { landMask, baseElevation };
}

function channelBiasFromOtherIslands(spec, islandSpecs, x, y) {
  let bias = 0;
  for (const other of islandSpecs) {
    if (other === spec) continue;
    const dx = x - other.centerX;
    const dy = y - other.centerY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < Math.max(other.radiusX, other.radiusY) * 0.85) bias += 0.12;
  }
  return bias;
}

function smoothLand(mask, width, height, passes) {
  let current = mask;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(current);
    forEachCell(width, height, (x, y, i) => {
      const neighbors = countNeighbors(current, width, height, x, y);
      if (current[i] && neighbors <= 2) next[i] = 0;
      if (!current[i] && neighbors >= 6) next[i] = 1;
    });
    current = next;
  }
  return current;
}

function pruneLand(mask, width, height, minSize) {
  const labeled = labelIslands(mask, width, height);
  const keep = new Set(labeled.components.filter((component) => component.cells.length >= minSize).map((component) => component.id));
  const result = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 1) {
    if (keep.has(labeled.idMap[i])) result[i] = 1;
  }
  return result;
}

function labelIslands(mask, width, height) {
  const idMap = new Int16Array(width * height);
  const components = [];
  let id = 0;

  forEachCell(width, height, (x, y, i) => {
    if (!mask[i] || idMap[i]) return;
    id += 1;
    const queue = [{ x, y }];
    const cells = [];
    idMap[i] = id;
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      const ci = index(width, cell.x, cell.y);
      cells.push(ci);
      for (const next of cardinalNeighbors(cell.x, cell.y)) {
        if (!inBounds(width, height, next.x, next.y)) continue;
        const ni = index(width, next.x, next.y);
        if (!mask[ni] || idMap[ni]) continue;
        idMap[ni] = id;
        queue.push(next);
      }
    }
    components.push(buildComponentRecord(id, cells, width));
  });

  components.sort((a, b) => b.cells.length - a.cells.length);
  return { idMap, components };
}

function buildComponentRecord(id, cells, width) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumY = 0;
  for (const i of cells) {
    const x = i % width;
    const y = Math.floor(i / width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    sumX += x;
    sumY += y;
  }
  return {
    id,
    cells,
    area: cells.length,
    minX,
    minY,
    maxX,
    maxY,
    centerX: sumX / cells.length,
    centerY: sumY / cells.length
  };
}

function buildIslandRecords(components, specs, width, height) {
  return components.map((component, order) => {
    let nearest = specs[0];
    let best = Infinity;
    for (const spec of specs) {
      const dx = component.centerX - spec.centerX;
      const dy = component.centerY - spec.centerY;
      const d = dx * dx + dy * dy;
      if (d < best) {
        nearest = spec;
        best = d;
      }
    }
    return {
      id: component.id,
      order,
      area: component.area,
      size: component.area > width * height * 0.025 ? "major" : component.area > 90 ? "medium" : "small",
      bounds: { minX: component.minX, minY: component.minY, maxX: component.maxX, maxY: component.maxY },
      center: { x: component.centerX, y: component.centerY },
      dryBias: nearest?.dryBias ?? 0,
      coldBias: nearest?.coldBias ?? 0,
      mountainBias: nearest?.mountainBias ?? 0,
      forestBias: nearest?.forestBias ?? 0,
      normalizedX: component.centerX / width,
      normalizedY: component.centerY / height
    };
  });
}

function computeDistanceToMask(mask, width, height, targetValue) {
  const distances = new Int16Array(width * height);
  distances.fill(INF);
  const queue = [];
  forEachCell(width, height, (x, y, i) => {
    if (Boolean(mask[i]) === targetValue) {
      distances[i] = 0;
      queue.push({ x, y });
    }
  });

  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head];
    const d = distances[index(width, cell.x, cell.y)];
    for (const next of cardinalNeighbors(cell.x, cell.y)) {
      if (!inBounds(width, height, next.x, next.y)) continue;
      const ni = index(width, next.x, next.y);
      if (distances[ni] <= d + 1) continue;
      distances[ni] = d + 1;
      queue.push(next);
    }
  }
  return distances;
}

function classifyWater(landMask, distanceToLand, width, height) {
  const waterClass = new Uint8Array(width * height);
  forEachCell(width, height, (_x, _y, i) => {
    if (landMask[i]) {
      waterClass[i] = WATER.NONE;
    } else {
      waterClass[i] = distanceToLand[i] <= SHALLOW_BAND ? WATER.SHALLOW : WATER.DEEP;
    }
  });
  return waterClass;
}

function createClimateFields(width, height, seed, landMask, distanceToWater, islandId, islandRecords) {
  const moisture = new Float32Array(width * height);
  const temperature = new Float32Array(width * height);
  const coldness = new Float32Array(width * height);
  const islandById = new Map(islandRecords.map((record) => [record.id, record]));

  forEachCell(width, height, (x, y, i) => {
    const island = islandById.get(islandId[i]);
    const wetNoise = fbm(`${seed}:moisture`, x / 34, y / 34, 4);
    const tempNoise = fbm(`${seed}:temperature`, x / 42, y / 42, 3);
    const coastMoisture = landMask[i] ? clamp01(1 - distanceToWater[i] / 32) * 0.14 : 0;
    moisture[i] = clamp01(wetNoise * 0.72 + coastMoisture + (island?.forestBias ?? 0) - (island?.dryBias ?? 0) * 0.35);
    const northCold = 1 - y / Math.max(1, height - 1);
    coldness[i] = clamp01(northCold * 0.42 + tempNoise * 0.28 + (island?.coldBias ?? 0));
    temperature[i] = clamp01(1 - coldness[i]);
  });

  return { moisture, temperature, coldness };
}

function createRidgeField(width, height, seed, landMask, distanceToWater, islandId, islandRecords) {
  const ridge = new Float32Array(width * height);
  const islandsById = new Map(islandRecords.map((record) => [record.id, record]));
  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i]) return;
    const island = islandsById.get(islandId[i]);
    let value = 0;
    const islandScale = island ? Math.max(7, Math.sqrt(island.area) / 5) : 8;
    const angle = fbm(`${seed}:ridge-angle:${islandId[i]}`, island?.center.x ?? 0, island?.center.y ?? 0, 2) * Math.PI;
    const cx = island?.center.x ?? x;
    const cy = island?.center.y ?? y;
    const distanceFromAxis = Math.abs(Math.sin(angle) * (x - cx) - Math.cos(angle) * (y - cy));
    value = Math.max(value, Math.exp(-(distanceFromAxis * distanceFromAxis) / (2 * islandScale * islandScale)));
    value *= clamp01(distanceToWater[i] / 7);
    value += fbm(`${seed}:ridge-noise`, x / 12, y / 12, 3) * 0.22;
    value += island?.mountainBias ?? 0;
    ridge[i] = clamp01(value);
  });
  return ridge;
}

function finalizeElevation(width, height, seed, landMask, distanceToWater, baseElevation, ridge) {
  const elevation = new Float32Array(width * height);
  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i]) {
      elevation[i] = 0;
      return;
    }
    const inland = clamp01(distanceToWater[i] / 18);
    const noise = fbm(`${seed}:elevation`, x / 24, y / 24, 4);
    elevation[i] = clamp01(baseElevation[i] * 0.38 + inland * 0.36 + ridge[i] * 0.34 + noise * 0.18);
  });
  return elevation;
}

function classifyBiomes(width, height, landMask, distanceToWater, islandId, islandRecords, elevation, moisture, coldness) {
  const biome = new Uint8Array(width * height);
  const islandsById = new Map(islandRecords.map((record) => [record.id, record]));

  forEachCell(width, height, (_x, _y, i) => {
    if (!landMask[i]) {
      biome[i] = BIOME.WATER;
      return;
    }
    if (distanceToWater[i] <= BEACH_BAND) {
      biome[i] = BIOME.BEACH;
      return;
    }
    const island = islandsById.get(islandId[i]);
    const dryness = clamp01(1 - moisture[i] + (island?.dryBias ?? 0) * 0.72);
    const coldScore = coldness[i] + elevation[i] * 0.28;
    if (coldScore > 0.62 && elevation[i] > 0.30) biome[i] = BIOME.ICE;
    else if (dryness > 0.78 || (dryness > 0.66 && elevation[i] < 0.48 && moisture[i] < 0.42)) biome[i] = BIOME.SAND;
    else biome[i] = BIOME.GRASS;
  });

  return smoothBiomes(biome, landMask, distanceToWater, islandId, width, height, 2);
}

function smoothBiomes(biome, landMask, distanceToWater, islandId, width, height, passes) {
  let current = biome;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(current);
    forEachCell(width, height, (x, y, i) => {
      if (!landMask[i] || distanceToWater[i] <= BEACH_BAND) return;
      const counts = new Map();
      for (let yy = y - 1; yy <= y + 1; yy += 1) {
        for (let xx = x - 1; xx <= x + 1; xx += 1) {
          if (!inBounds(width, height, xx, yy)) continue;
          const ni = index(width, xx, yy);
          if (!landMask[ni] || islandId[ni] !== islandId[i] || distanceToWater[ni] <= BEACH_BAND) continue;
          counts.set(current[ni], (counts.get(current[ni]) ?? 0) + 1);
        }
      }
      let bestBiome = current[i];
      let bestCount = 0;
      for (const [candidate, count] of counts.entries()) {
        if (count > bestCount) {
          bestBiome = candidate;
          bestCount = count;
        }
      }
      if (bestCount >= 5) next[i] = bestBiome;
    });
    current = next;
  }
  return current;
}

function placeMountains(width, height, seed, landMask, distanceToWater, elevation, ridge, coldness, mountainMap) {
  const candidates = [];
  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i] || distanceToWater[i] <= 3) return;
    const score = elevation[i] * 0.62 + ridge[i] * 0.58 + fbm(`${seed}:mountain-candidate`, x / 7, y / 7, 2) * 0.14;
    if (score > 0.82) candidates.push({ x, y, i, score });
  });
  candidates.sort((a, b) => b.score - a.score);
  const mountains = [];
  const minDistance = 6;
  for (const candidate of candidates) {
    if (mountains.some((mountain) => squaredDistance(candidate, mountain) < minDistance * minDistance)) continue;
    mountainMap[candidate.i] = 1;
    mountains.push({
      x: candidate.x,
      y: candidate.y,
      kind: coldness[candidate.i] + elevation[candidate.i] > 1.05 ? "snow_mountain" : "mountain",
      elevation: round(elevation[candidate.i]),
      ridge: round(ridge[candidate.i])
    });
  }
  return mountains;
}

function placeLakes(width, height, seed, landMask, distanceToWater, elevation, moisture, biome, lakeMap) {
  const candidates = [];
  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i] || distanceToWater[i] < 7) return;
    if (biome[i] === BIOME.BEACH) return;
    const score = moisture[i] * 0.45 + (1 - Math.abs(elevation[i] - 0.45)) * 0.35 + fbm(`${seed}:lake`, x / 18, y / 18, 3) * 0.22;
    if (score > 0.72) candidates.push({ x, y, i, score });
  });
  candidates.sort((a, b) => b.score - a.score);
  const lakes = [];
  for (const candidate of candidates.slice(0, 5)) {
    if (lakes.some((lake) => squaredDistance(candidate, lake) < 13 * 13)) continue;
    const radius = 2;
    const cells = [];
    for (let y = candidate.y - radius; y <= candidate.y + radius; y += 1) {
      for (let x = candidate.x - radius; x <= candidate.x + radius; x += 1) {
        if (!inBounds(width, height, x, y)) continue;
        const i = index(width, x, y);
        if (!landMask[i]) continue;
        const d = Math.sqrt((x - candidate.x) ** 2 + (y - candidate.y) ** 2);
        if (d <= radius + 0.25) {
          lakeMap[i] = 1;
          cells.push({ x, y });
        }
      }
    }
    lakes.push({ x: candidate.x, y: candidate.y, radius, cells });
  }
  return lakes;
}

function traceRivers(width, height, seed, landMask, waterClass, lakeMap, distanceToWater, elevation, coldness, ridge, riverMap) {
  const candidates = [];
  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i] || distanceToWater[i] < 8 || lakeMap[i]) return;
    const score = elevation[i] * 0.52 + ridge[i] * 0.25 + coldness[i] * 0.16 + fbm(`${seed}:river-source`, x / 9, y / 9, 2) * 0.16;
    if (score > 0.74) candidates.push({ x, y, i, score });
  });
  candidates.sort((a, b) => b.score - a.score);
  const rivers = [];

  for (const source of candidates) {
    if (rivers.length >= 8) break;
    if (rivers.some((river) => river.path.some((cell) => squaredDistance(cell, source) < 9 * 9))) continue;
    const path = traceRiverPath(width, height, seed, source, landMask, waterClass, lakeMap, distanceToWater, elevation, riverMap, rivers.length);
    if (path.length < 8) continue;
    const end = path[path.length - 1];
    const endIndex = index(width, end.x, end.y);
    if (waterClass[endIndex] === WATER.NONE && !lakeMap[endIndex] && distanceToWater[endIndex] > 1) continue;
    for (const cell of path) riverMap[index(width, cell.x, cell.y)] = 1;
    rivers.push({ id: rivers.length + 1, source: { x: source.x, y: source.y }, mouth: end, path });
  }
  return rivers;
}

function traceRiverPath(width, height, seed, source, landMask, waterClass, lakeMap, distanceToWater, elevation, riverMap, riverIndex) {
  const path = [];
  const seen = new Set();
  let current = { x: source.x, y: source.y };
  for (let step = 0; step < 240; step += 1) {
    const key = `${current.x},${current.y}`;
    if (seen.has(key)) return [];
    seen.add(key);
    path.push(current);
    const i = index(width, current.x, current.y);
    if (step > 0 && (!landMask[i] || waterClass[i] !== WATER.NONE || lakeMap[i] || distanceToWater[i] <= 0)) return path;
    if (step > 0 && riverMap[i]) return path;

    const neighbors = eightNeighbors(current.x, current.y)
      .filter((next) => inBounds(width, height, next.x, next.y))
      .map((next) => {
        const ni = index(width, next.x, next.y);
        const downhill = elevation[ni] - elevation[i];
        const waterPull = distanceToWater[ni] * 0.018;
        const noise = hashNoise(`${seed}:river:${riverIndex}`, next.x, next.y) * 0.045;
        const diagonalPenalty = next.x !== current.x && next.y !== current.y ? 0.018 : 0;
        return { ...next, ni, cost: downhill + waterPull + noise + diagonalPenalty };
      })
      .sort((a, b) => a.cost - b.cost);
    if (!neighbors.length) return [];
    current = { x: neighbors[0].x, y: neighbors[0].y };
  }
  return [];
}

function placePois(width, height, seed, landMask, waterClass, distanceToWater, islandId, islandRecords, biome, elevation, mountainMap, lakeMap) {
  const rng = createSeededRng(`${seed}:pois`);
  const poiList = [];
  const harbors = [];
  const occupied = new Set();

  for (const island of islandRecords) {
    if (island.area < 35) continue;
    const cells = cellsForIsland(islandId, island.id);
    const harbor = chooseBestCell(cells, width, (i) => {
      const x = i % width;
      const y = Math.floor(i / width);
      if (distanceToWater[i] > 2 || biome[i] !== BIOME.BEACH) return -Infinity;
      if (!hasAdjacentWater(width, waterClass, x, y, WATER.SHALLOW)) return -Infinity;
      return 1 - Math.abs(x / width - 0.5) * 0.18 + hashNoise(`${seed}:harbor`, x, y) * 0.18;
    });
    if (harbor) {
      addPoi(poiList, harbors, occupied, {
        type: "port",
        name: `Port ${poiList.length + 1}`,
        x: harbor.x,
        y: harbor.y,
        islandId: island.id,
        role: "harbor"
      });
    }

    const town = chooseBestCell(cells, width, (i) => {
      if (distanceToWater[i] < 5 || mountainMap[i] || lakeMap[i]) return -Infinity;
      if (![BIOME.GRASS, BIOME.SAND].includes(biome[i])) return -Infinity;
      const x = i % width;
      const y = Math.floor(i / width);
      return (biome[i] === BIOME.GRASS ? 0.25 : 0.08) + centerScore(x, y, island.center.x, island.center.y, island.area) + hashNoise(`${seed}:town`, x, y) * 0.2;
    });
    if (town) {
      addPoi(poiList, harbors, occupied, {
        type: island.size === "major" ? "town" : "village",
        name: `Settlement ${poiList.length + 1}`,
        x: town.x,
        y: town.y,
        islandId: island.id,
        role: "settlement"
      });
    }

    if (island.size === "major" || rng.chance(0.45)) {
      const cave = chooseBestCell(cells, width, (i) => {
        if (distanceToWater[i] < 4 || lakeMap[i]) return -Infinity;
        const x = i % width;
        const y = Math.floor(i / width);
        return elevation[i] * 0.58 + (mountainMap[i] ? 0.28 : 0) + hashNoise(`${seed}:cave`, x, y) * 0.14;
      });
      if (cave) {
        addPoi(poiList, harbors, occupied, {
          type: "cave",
          name: `Cave ${poiList.length + 1}`,
          x: cave.x,
          y: cave.y,
          islandId: island.id,
          role: "dungeon"
        });
      }
    }

    const specialType = chooseIslandSpecialType(cells, biome, width);
    if (island.size === "major" || rng.chance(0.5)) {
      const special = chooseBestCell(cells, width, (i) => {
        if (distanceToWater[i] < 5 || lakeMap[i] || mountainMap[i]) return -Infinity;
        const x = i % width;
        const y = Math.floor(i / width);
        const biomeMatch = (
          (specialType === "ice_shrine" && biome[i] === BIOME.ICE) ||
          (specialType === "desert_ruin" && biome[i] === BIOME.SAND) ||
          (specialType === "tower" && [BIOME.GRASS, BIOME.SAND].includes(biome[i]))
        ) ? 0.45 : 0;
        return biomeMatch + elevation[i] * 0.12 + hashNoise(`${seed}:special`, x, y) * 0.22;
      });
      if (special) {
        addPoi(poiList, harbors, occupied, {
          type: specialType,
          name: titleCase(specialType.replace("_", " ")),
          x: special.x,
          y: special.y,
          islandId: island.id,
          role: "major_poi"
        });
      }
    }
  }

  return { poiList, harbors };

  function addPoi(pois, ports, occupiedSet, poi) {
    const key = `${poi.x},${poi.y}`;
    if (occupiedSet.has(key)) return;
    if ([...occupiedSet].some((item) => {
      const [x, y] = item.split(",").map(Number);
      return (x - poi.x) ** 2 + (y - poi.y) ** 2 < 16;
    })) return;
    occupiedSet.add(key);
    pois.push({ id: `poi_${pois.length + 1}`, ...poi });
    if (poi.type === "port") ports.push(pois[pois.length - 1]);
  }
}

function chooseIslandSpecialType(cells, biome, width) {
  let ice = 0;
  let sand = 0;
  let grass = 0;
  for (const i of cells) {
    if (biome[i] === BIOME.ICE) ice += 1;
    if (biome[i] === BIOME.SAND) sand += 1;
    if (biome[i] === BIOME.GRASS) grass += 1;
  }
  if (ice > Math.max(sand, grass) * 0.35) return "ice_shrine";
  if (sand > grass * 0.45) return "desert_ruin";
  return "tower";
}

function buildRoadGraph(width, height, islandId, islandRecords, biome, waterClass, mountainMap, lakeMap, poiList, harbors, roadMap) {
  const edges = [];
  const poiByIsland = groupBy(poiList, (poi) => poi.islandId);

  for (const island of islandRecords) {
    const pois = poiByIsland.get(island.id) ?? [];
    if (pois.length < 2) continue;
    const settlements = pois.filter((poi) => ["town", "village"].includes(poi.type));
    const roots = settlements.length ? settlements : [pois[0]];
    for (const root of roots) {
      const targets = pois.filter((poi) => poi !== root && poi.type !== "port").slice(0, 3);
      const port = harbors.find((harbor) => harbor.islandId === island.id);
      if (port) targets.unshift(port);
      for (const target of uniqueBy(targets, (poi) => poi.id)) {
        const path = findRoadPath(width, height, islandId, island.id, biome, waterClass, mountainMap, lakeMap, root, target);
        if (!path.length) {
          edges.push({ from: root.id, to: target.id, connected: false, length: 0 });
          continue;
        }
        for (const cell of path) roadMap[index(width, cell.x, cell.y)] = 1;
        edges.push({ from: root.id, to: target.id, connected: true, length: path.length, path });
      }
    }
  }
  return { edges };
}

function findRoadPath(width, height, islandId, targetIslandId, biome, waterClass, mountainMap, lakeMap, start, goal) {
  const startKey = `${start.x},${start.y}`;
  const goalKey = `${goal.x},${goal.y}`;
  const open = [{ x: start.x, y: start.y, f: 0, g: 0 }];
  const cameFrom = new Map();
  const best = new Map([[startKey, 0]]);

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift();
    const key = `${current.x},${current.y}`;
    if (key === goalKey) return reconstructPath(cameFrom, current);
    for (const next of cardinalNeighbors(current.x, current.y)) {
      if (!inBounds(width, height, next.x, next.y)) continue;
      const ni = index(width, next.x, next.y);
      if (islandId[ni] !== targetIslandId) continue;
      if (waterClass[ni] !== WATER.NONE || lakeMap[ni]) continue;
      const cost = roadCost(biome[ni], mountainMap[ni]);
      if (!Number.isFinite(cost)) continue;
      const nextG = current.g + cost;
      const nextKey = `${next.x},${next.y}`;
      if (best.has(nextKey) && best.get(nextKey) <= nextG) continue;
      best.set(nextKey, nextG);
      cameFrom.set(nextKey, current);
      open.push({
        x: next.x,
        y: next.y,
        g: nextG,
        f: nextG + Math.abs(goal.x - next.x) + Math.abs(goal.y - next.y)
      });
    }
  }
  return [];
}

function roadCost(biome, mountain) {
  if (mountain) return 18;
  if (biome === BIOME.GRASS) return 1;
  if (biome === BIOME.BEACH) return 1.35;
  if (biome === BIOME.SAND) return 1.55;
  if (biome === BIOME.ICE) return 2.0;
  return Infinity;
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  let key = `${current.x},${current.y}`;
  while (cameFrom.has(key)) {
    current = cameFrom.get(key);
    path.push(current);
    key = `${current.x},${current.y}`;
  }
  return path.reverse();
}

function placeForests(width, height, seed, landMask, biome, moisture, mountainMap, roadMap, poiList) {
  const forestMap = new Uint8Array(width * height);
  const occupied = new Set(poiList.map((poi) => `${poi.x},${poi.y}`));
  const rng = createSeededRng(`${seed}:forests`);
  const clusters = [];
  for (let i = 0; i < 42; i += 1) {
    const x = rng.int(8, width - 8);
    const y = rng.int(8, height - 8);
    const idx = index(width, x, y);
    if (!landMask[idx] || biome[idx] !== BIOME.GRASS || moisture[idx] < 0.36) continue;
    clusters.push({ x, y, rx: rng.float(3, 9), ry: rng.float(2, 7), strength: rng.float(0.52, 1.0) });
  }

  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i] || biome[i] !== BIOME.GRASS || mountainMap[i] || roadMap[i] || occupied.has(`${x},${y}`)) return;
    let value = 0;
    for (const cluster of clusters) {
      const dx = (x - cluster.x) / cluster.rx;
      const dy = (y - cluster.y) / cluster.ry;
      value = Math.max(value, (1 - dx * dx - dy * dy) * cluster.strength);
    }
    const noise = fbm(`${seed}:forest-edge`, x / 5, y / 5, 2);
    if (value + (moisture[i] - 0.38) * 0.45 + noise * 0.18 > 0.30) forestMap[i] = 1;
  });

  for (let i = 0; i < forestMap.length; i += 1) {
    if (roadMap[i]) forestMap[i] = 0;
  }
  return forestMap;
}

function buildWalkability(width, height, landMask, waterClass, lakeMap, mountainMap) {
  const walkability = new Uint8Array(width * height);
  forEachCell(width, height, (_x, _y, i) => {
    walkability[i] = landMask[i] && waterClass[i] === WATER.NONE && !lakeMap[i] && !mountainMap[i] ? 1 : 0;
  });
  return walkability;
}

function validateWorld(world) {
  const warnings = [];
  const errors = [];
  const landCount = countValues(world.landMask, 1);
  const shallowCount = countValues(world.waterClass, WATER.SHALLOW);
  const beachCount = countValues(world.biome, BIOME.BEACH);
  const majorIslands = world.islandRecords.filter((island) => island.area >= 80);

  if (landCount === 0) errors.push("No land was generated.");
  if (majorIslands.length < 2) warnings.push(`Only ${majorIslands.length} island(s) above the major/minor threshold were generated.`);
  if (shallowCount === 0) errors.push("No shallow coastal water was generated.");
  if (beachCount === 0) errors.push("No beach band was generated.");
  if (countValues(world.mountainMap, 1) > landCount * 0.08) warnings.push("Mountain overlays cover more than 8% of land.");
  if (world.rivers.some((river) => hasDuplicateCells(river.path))) errors.push("A river path contains a loop.");
  if (world.rivers.length === 0) warnings.push("No rivers survived validation.");
  if (world.poiList.length < 4) warnings.push("Few POIs were placed.");

  for (const poi of world.poiList) {
    const i = index(world.width, poi.x, poi.y);
    if (!world.landMask[i] && poi.type !== "port") errors.push(`POI ${poi.id} is not on land.`);
    if (poi.type === "port" && !hasAdjacentWater(world.width, world.waterClass, poi.x, poi.y, WATER.SHALLOW)) {
      errors.push(`Port ${poi.id} is not adjacent to shallow water.`);
    }
  }

  for (const edge of world.roadGraph.edges) {
    if (!edge.connected) warnings.push(`Road edge ${edge.from} -> ${edge.to} could not be connected.`);
  }

  forEachCell(world.width, world.height, (_x, _y, i) => {
    if (world.forestMap[i] && world.roadMap[i]) errors.push("Forest overlaps a road.");
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

function summarizeWorld(width, height, landMask, waterClass, biome, mountainMap, forestMap, roadMap, riverMap, poiList, harbors) {
  return {
    width,
    height,
    cells: width * height,
    landCells: countValues(landMask, 1),
    deepWaterCells: countValues(waterClass, WATER.DEEP),
    shallowWaterCells: countValues(waterClass, WATER.SHALLOW),
    beachCells: countValues(biome, BIOME.BEACH),
    grassCells: countValues(biome, BIOME.GRASS),
    sandCells: countValues(biome, BIOME.SAND),
    iceCells: countValues(biome, BIOME.ICE),
    mountainCells: countValues(mountainMap, 1),
    forestCells: countValues(forestMap, 1),
    roadCells: countValues(roadMap, 1),
    riverCells: countValues(riverMap, 1),
    poiCount: poiList.length,
    harborCount: harbors.length
  };
}

export function serializeWorld(world) {
  const row = (array, mapper = (value) => value) => {
    const rows = [];
    for (let y = 0; y < world.height; y += 1) {
      const values = [];
      for (let x = 0; x < world.width; x += 1) values.push(mapper(array[index(world.width, x, y)]));
      rows.push(values);
    }
    return rows;
  };

  return {
    seed: world.seed,
    width: world.width,
    height: world.height,
    islandRecords: world.islandRecords.map(({ id, order, area, size, bounds, center }) => ({ id, order, area, size, bounds, center })),
    stats: world.stats,
    validation: world.validation,
    poiList: world.poiList,
    harbors: world.harbors,
    mountains: world.mountains,
    lakes: world.lakes.map((lake) => ({ x: lake.x, y: lake.y, radius: lake.radius })),
    rivers: world.rivers.map((river) => ({ id: river.id, source: river.source, mouth: river.mouth, length: river.path.length })),
    roadGraph: {
      edges: world.roadGraph.edges.map((edge) => ({ from: edge.from, to: edge.to, connected: edge.connected, length: edge.length }))
    },
    layers: {
      landMask: row(world.layers.landMask),
      islandId: row(world.layers.islandId),
      waterClass: row(world.layers.waterClass),
      biome: row(world.layers.biome, (value) => BIOME_NAMES[value] ?? String(value)),
      distanceToLand: row(world.layers.distanceToLand),
      distanceToWater: row(world.layers.distanceToWater),
      elevation: row(world.layers.elevation, round),
      moisture: row(world.layers.moisture, round),
      coldness: row(world.layers.coldness, round),
      ridge: row(world.layers.ridge, round),
      mountainMap: row(world.layers.mountainMap),
      riverMap: row(world.layers.riverMap),
      forestMap: row(world.layers.forestMap),
      roadMap: row(world.layers.roadMap),
      walkability: row(world.layers.walkability)
    }
  };
}

function cellsForIsland(islandId, id) {
  const cells = [];
  for (let i = 0; i < islandId.length; i += 1) {
    if (islandId[i] === id) cells.push(i);
  }
  return cells;
}

function chooseBestCell(cells, width, scoreFn) {
  let best = null;
  let bestScore = -Infinity;
  for (const i of cells) {
    const score = scoreFn(i);
    if (score > bestScore) {
      bestScore = score;
      best = { x: i % width, y: Math.floor(i / width), i, score };
    }
  }
  return Number.isFinite(bestScore) ? best : null;
}

function centerScore(x, y, cx, cy, area) {
  const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  return Math.max(0, 1 - distance / Math.max(8, Math.sqrt(area))) * 0.32;
}

function hasAdjacentWater(width, waterClass, x, y, value) {
  for (const next of cardinalNeighbors(x, y)) {
    const height = Math.floor(waterClass.length / width);
    if (!inBounds(width, height, next.x, next.y)) continue;
    const i = index(width, next.x, next.y);
    if (waterClass[i] === value) return true;
  }
  return false;
}

function hasDuplicateCells(path) {
  const seen = new Set();
  for (const cell of path) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function countValues(array, value) {
  let count = 0;
  for (const item of array) if (item === value) count += 1;
  return count;
}

function groupBy(values, keyFn) {
  const result = new Map();
  for (const value of values) {
    const key = keyFn(value);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(value);
  }
  return result;
}

function uniqueBy(values, keyFn) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = keyFn(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function countNeighbors(mask, width, height, x, y) {
  let count = 0;
  for (let yy = y - 1; yy <= y + 1; yy += 1) {
    for (let xx = x - 1; xx <= x + 1; xx += 1) {
      if (xx === x && yy === y) continue;
      if (inBounds(width, height, xx, yy) && mask[index(width, xx, yy)]) count += 1;
    }
  }
  return count;
}

function forEachCell(width, height, fn) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) fn(x, y, index(width, x, y));
  }
}

function index(width, x, y) {
  return y * width + x;
}

function inBounds(width, height, x, y) {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function cardinalNeighbors(x, y) {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y }
  ];
}

function eightNeighbors(x, y) {
  return [
    { x: x - 1, y: y - 1 },
    { x, y: y - 1 },
    { x: x + 1, y: y - 1 },
    { x: x + 1, y },
    { x: x + 1, y: y + 1 },
    { x, y: y + 1 },
    { x: x - 1, y: y + 1 },
    { x: x - 1, y }
  ];
}

function squaredDistance(a, b) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function titleCase(value) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function createSeededRng(seed) {
  let state = hashString(seed) >>> 0;
  const next = () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    float(min, max) {
      return min + next() * (max - min);
    },
    chance(probability) {
      return next() < probability;
    },
    shuffle(values) {
      const result = [...values];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
  };
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashNoise(seed, x, y, z = 0) {
  let h = hashString(seed);
  h ^= Math.imul(Math.floor(x) + 0x9e3779b9, 0x85ebca6b);
  h ^= Math.imul(Math.floor(y) + 0xc2b2ae35, 0x27d4eb2f);
  h ^= Math.imul(Math.floor(z) + 0x165667b1, 0x9e3779b1);
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;
}

function fbm(seed, x, y, octaves = 3, lacunarity = 2.04) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let total = 0;
  for (let octave = 0; octave < octaves; octave += 1) {
    value += valueNoise(seed, x * frequency, y * frequency, octave) * amplitude;
    total += amplitude;
    amplitude *= 0.52;
    frequency *= lacunarity;
  }
  return total === 0 ? 0 : value / total;
}

function valueNoise(seed, x, y, octave) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hashNoise(seed, x0, y0, octave);
  const b = hashNoise(seed, x1, y0, octave);
  const c = hashNoise(seed, x0, y1, octave);
  const d = hashNoise(seed, x1, y1, octave);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
