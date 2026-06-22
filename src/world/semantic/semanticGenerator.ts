import { createSeededRng, fbm, hashNoise, type SeededRng } from "../seededRng.ts";
import { CAMPAIGN_WORLD_PROFILE } from "./semanticProfiles.ts";
import {
  SEMANTIC_BIOME,
  SEMANTIC_WATER,
  type IslandOverlayRules,
  type IslandProfile,
  type IslandRole,
  type IslandTheme,
  type OverlayCollisionPolicy,
  type RequiredPoiSpec,
  type SemanticIslandId,
  type SemanticIslandRecord,
  type SemanticBridgeCandidate,
  type SemanticLake,
  type SemanticMountain,
  type SemanticMountainDebug,
  type SemanticMountainRange,
  type SemanticPoi,
  type SemanticRiver,
  type SemanticRoadEdge,
  type SemanticVec,
  type SemanticWorld,
  type WorldProfile
} from "./semanticTypes.ts";
import { validateSemanticWorld } from "./semanticValidation.ts";

const LAND_THRESHOLD = 0.08;
const SHALLOW_BAND = 5;
const BEACH_BAND = 1;
const INF = 30_000;

export const ENABLE_RIVER_CROSSINGS = true;
export const ENABLE_RANDOM_BRIDGE_DECORATION = false;

interface IslandSpec {
  id: SemanticIslandId;
  name: string;
  role: IslandRole;
  theme: IslandTheme;
  major: boolean;
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  blobs: { x: number; y: number; rx: number; ry: number; weight: number }[];
  dryBias: number;
  coldBias: number;
  mountainBias: number;
  forestBias: number;
  overlayRules: IslandOverlayRules;
  requiredPois: RequiredPoiSpec[];
  requiredHarbors: number;
  allowRoads: boolean;
  allowRivers: boolean;
  profile?: IslandProfile;
}

interface ComponentSeed {
  spec: IslandSpec;
  cells: number[];
}

interface MountainCandidate extends SemanticVec {
  i: number;
  islandNumber: number;
  score: number;
  kind: SemanticMountain["kind"];
  elevation: number;
  ridge: number;
  ridgeSupport: number;
}

interface MountainMassifPlan {
  maxRegions: number;
  minSize: number;
  targetSize: number;
  maxSize: number;
  seedSpacing: number;
  seedThreshold: number;
  growThreshold: number;
  growElevationFloor: number;
  ridgeSeedThreshold: number;
  ridgeGrowThreshold: number;
}

export function generateSemanticWorld(options: {
  seed: string;
  profile?: WorldProfile;
  width: number;
  height: number;
}): SemanticWorld {
  const profile = options.profile ?? CAMPAIGN_WORLD_PROFILE;
  const seed = options.seed;
  const width = options.width;
  const height = options.height;
  const rng = createSeededRng(seed);
  const islandSpecs = createIslandSpecs(width, height, profile, rng);
  const { landMask, islandId, islandIndexToId, islands } = createLandAndIslands(width, height, seed, islandSpecs);
  const distanceToLand = computeDistanceToMask(landMask, width, height, true);
  const distanceToWater = computeDistanceToMask(landMask, width, height, false);
  const waterClass = classifyWater(landMask, distanceToLand, width, height);
  const { moisture, temperature, coldness } = createClimateFields(width, height, seed, landMask, distanceToWater, islandId, islands);
  const ridge = createRidgeField(width, height, seed, landMask, distanceToWater, islandId, islands);
  const elevation = finalizeElevation(width, height, seed, landMask, distanceToWater, ridge);
  const biome = classifyBiomes(width, height, landMask, distanceToWater, islandId, islands, elevation, moisture, coldness);
  const mountainMap = new Uint8Array(width * height);
  const mountainCandidateScore = new Float32Array(width * height);
  let { mountains, mountainRanges, mountainDebug } = placeMountains(width, height, seed, landMask, distanceToWater, islandId, islands, biome, elevation, ridge, coldness, mountainCandidateScore, mountainMap);
  const lakeMap = new Uint8Array(width * height);
  const lakes = placeLakes(width, height, seed, landMask, distanceToWater, elevation, moisture, biome, mountainMap, lakeMap);
  const riverMap = new Uint8Array(width * height);
  const { poiList, harbors } = placePois(width, height, seed, islands, islandId, landMask, waterClass, distanceToWater, biome, elevation, moisture, mountainMap, lakeMap);
  ({ mountains, mountainRanges, mountainDebug } = placeMountains(width, height, seed, landMask, distanceToWater, islandId, islands, biome, elevation, ridge, coldness, mountainCandidateScore, mountainMap, lakeMap, poiList));
  const rivers = traceRivers(width, height, seed, landMask, waterClass, lakeMap, distanceToWater, islandId, islands, elevation, coldness, ridge, mountainMap, poiList, riverMap);
  const roadMap = new Uint8Array(width * height);
  const roadGraph = buildRoadGraph(width, height, seed, landMask, islandId, islands, biome, waterClass, lakeMap, riverMap, distanceToWater, mountainMap, poiList, harbors, roadMap);
  clearPoiFootprintRoadCells(width, height, roadMap, poiList);
  ({ mountains, mountainRanges, mountainDebug } = placeMountains(width, height, seed, landMask, distanceToWater, islandId, islands, biome, elevation, ridge, coldness, mountainCandidateScore, mountainMap, combineBlockMaps(lakeMap, riverMap, roadMap), poiList));
  const riverCrossingMap = new Uint8Array(width * height);
  const bridgeCandidates = detectBridgeCandidates(width, height, islandId, islands, landMask, waterClass, lakeMap, riverMap, roadMap, distanceToWater, mountainMap, riverCrossingMap);
  const forestMap = placeForests(width, height, seed, landMask, islandId, islands, biome, moisture, mountainMap, waterClass, lakeMap, riverMap, roadMap, poiList);
  const overlayCollisionPolicy = buildOverlayCollisionPolicy(width, height, mountainMap, forestMap, roadMap, riverMap, bridgeCandidates, poiList);
  const walkability = buildWalkability(width, height, landMask, waterClass, lakeMap, mountainMap, riverMap, bridgeCandidates, poiList);
  const layers = {
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
    mountainCandidateScore,
    mountainMap,
    lakeMap,
    riverMap,
    riverCrossingMap,
    forestMap,
    roadMap,
    overlayCollisionPolicy,
    walkability
  };
  const stats = summarizeWorld(landMask, waterClass, biome, mountainMap, forestMap, roadMap, riverMap);
  const world: SemanticWorld = {
    seed,
    width,
    height,
    profile,
    islands,
    islandIndexToId,
    layers,
    mountains,
    mountainRanges,
    mountainDebug,
    lakes,
    rivers,
    bridgeCandidates,
    poiList,
    harbors,
    roadGraph,
    stats,
    validation: { ok: true, errors: [], warnings: [] }
  };
  world.validation = validateSemanticWorld(world);
  return world;
}

function createIslandSpecs(width: number, height: number, profile: WorldProfile, rng: SeededRng): IslandSpec[] {
  const specs: IslandSpec[] = [];
  for (const island of profile.majorIslands) {
    const centerX = clamp(Math.round((island.zone.x + island.zone.width * rng.float(0.38, 0.62)) * width), 10, width - 11);
    const centerY = clamp(Math.round((island.zone.y + island.zone.height * rng.float(0.38, 0.62)) * height), 8, height - 9);
    specs.push(createIslandSpec({
      id: island.id,
      name: island.name,
      role: island.role,
      theme: island.theme,
      major: true,
      centerX,
      centerY,
      radiusX: island.radius.x * island.sizeBias * rng.float(0.9, 1.12),
      radiusY: island.radius.y * island.sizeBias * rng.float(0.9, 1.12),
      dryBias: island.dryBias,
      coldBias: island.coldBias,
      mountainBias: island.mountainBias,
      forestBias: island.forestBias,
      overlayRules: island.overlayRules,
      requiredPois: island.requiredPois,
      requiredHarbors: island.requiredHarbors,
      allowRoads: island.allowRoads,
      allowRivers: island.allowRivers,
      profile: island,
      rng
    }));
  }

  const minorCount = rng.int(profile.minorIslandCount.min, profile.minorIslandCount.max);
  let attempts = 0;
  while (specs.filter((spec) => !spec.major).length < minorCount && attempts < 250) {
    attempts += 1;
    const radiusX = rng.float(3.2, 6.8);
    const radiusY = rng.float(2.8, 5.8);
    const centerX = rng.int(8, width - 9);
    const centerY = rng.int(7, height - 8);
    const tooClose = specs.some((spec) => {
      const dx = (centerX - spec.centerX) / (radiusX + spec.radiusX + (spec.major ? 7 : 4));
      const dy = (centerY - spec.centerY) / (radiusY + spec.radiusY + (spec.major ? 5 : 3));
      return dx * dx + dy * dy < 0.9;
    });
    if (tooClose) continue;
    const minorIndex = specs.filter((spec) => !spec.major).length + 1;
    const role = rng.pick(profile.minorRoles);
    specs.push(createIslandSpec({
      id: `minor_${minorIndex}`,
      name: minorIslandName(role, minorIndex),
      role,
      theme: "minor",
      major: false,
      centerX,
      centerY,
      radiusX,
      radiusY,
      dryBias: role === "treasure" ? 0.18 : 0,
      coldBias: role === "shrine" ? 0.18 : -0.04,
      mountainBias: role === "cave" ? 0.22 : 0.02,
      forestBias: role === "resource" ? 0.14 : 0.02,
      overlayRules: minorOverlayRules(role),
      requiredPois: minorPoisForRole(role, minorIndex),
      requiredHarbors: role === "harbor" ? 1 : 0,
      allowRoads: false,
      allowRivers: false,
      rng
    }));
  }
  return specs;
}

function createIslandSpec(input: Omit<IslandSpec, "blobs"> & { rng: SeededRng }): IslandSpec {
  const blobCount = input.major ? input.rng.int(6, 10) : input.rng.int(3, 5);
  const blobs = [{ x: input.centerX, y: input.centerY, rx: input.radiusX, ry: input.radiusY, weight: 1 }];
  for (let i = 1; i < blobCount; i += 1) {
    const angle = input.rng.float(0, Math.PI * 2);
    const dist = input.rng.float(0.2, 0.92);
    blobs.push({
      x: input.centerX + Math.cos(angle) * input.radiusX * dist,
      y: input.centerY + Math.sin(angle) * input.radiusY * dist,
      rx: input.radiusX * input.rng.float(0.36, 0.78),
      ry: input.radiusY * input.rng.float(0.36, 0.78),
      weight: input.rng.float(0.55, 0.98)
    });
  }
  const { rng: _rng, ...spec } = input;
  return { ...spec, blobs };
}

function createLandAndIslands(width: number, height: number, seed: string, specs: IslandSpec[]) {
  let landMask: Uint8Array = new Uint8Array(width * height);
  let islandId: Int16Array = new Int16Array(width * height);

  forEachCell(width, height, (x, y, i) => {
    let bestValue = -Infinity;
    let bestIndex = 0;
    for (let s = 0; s < specs.length; s += 1) {
      const spec = specs[s];
      let value = -1;
      for (const blob of spec.blobs) {
        const dx = (x - blob.x) / blob.rx;
        const dy = (y - blob.y) / blob.ry;
        value = Math.max(value, (1 - dx * dx - dy * dy) * blob.weight);
      }
      const boundaryNoise = (fbm(`${seed}:semantic-coast:${spec.id}`, x / 8.5, y / 8.5, 4) - 0.5) * (spec.major ? 0.28 : 0.22);
      value += boundaryNoise;
      value -= channelBias(spec, specs, x, y);
      if (value > bestValue) {
        bestValue = value;
        bestIndex = s + 1;
      }
    }
    if (bestValue > LAND_THRESHOLD && x > 2 && y > 2 && x < width - 3 && y < height - 3) {
      landMask[i] = 1;
      islandId[i] = bestIndex;
    }
  });

  ({ landMask, islandId } = smoothAssignedLand(width, height, landMask, islandId, 2));
  ({ landMask, islandId } = pruneAssignedLand(width, height, landMask, islandId, specs));
  ensureMajorIslandFallbacks(width, height, specs, landMask, islandId);

  const islandIndexToId = new Map<number, SemanticIslandId>();
  specs.forEach((spec, index) => islandIndexToId.set(index + 1, spec.id));
  const islands = buildIslandRecords(width, islandId, specs);
  return { landMask, islandId, islandIndexToId, islands };
}

function smoothAssignedLand(width: number, height: number, landMask: Uint8Array, islandId: Int16Array, passes: number): { landMask: Uint8Array; islandId: Int16Array } {
  let currentLand = landMask;
  let currentIds = islandId;
  for (let pass = 0; pass < passes; pass += 1) {
    const nextLand = new Uint8Array(currentLand);
    const nextIds = new Int16Array(currentIds);
    forEachCell(width, height, (x, y, i) => {
      const counts = new Map<number, number>();
      for (let yy = y - 1; yy <= y + 1; yy += 1) {
        for (let xx = x - 1; xx <= x + 1; xx += 1) {
          if (xx === x && yy === y) continue;
          if (!inBounds(width, height, xx, yy)) continue;
          const id = currentIds[index(width, xx, yy)];
          if (id > 0) counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
      const sameNeighbors = currentIds[i] > 0 ? counts.get(currentIds[i]) ?? 0 : 0;
      if (currentLand[i] && sameNeighbors <= 1) {
        nextLand[i] = 0;
        nextIds[i] = 0;
      } else if (!currentLand[i]) {
        let bestId = 0;
        let bestCount = 0;
        for (const [id, count] of counts.entries()) {
          if (count > bestCount) {
            bestId = id;
            bestCount = count;
          }
        }
        if (bestCount >= 6) {
          nextLand[i] = 1;
          nextIds[i] = bestId;
        }
      }
    });
    currentLand = nextLand;
    currentIds = nextIds;
  }
  return { landMask: currentLand, islandId: currentIds };
}

function pruneAssignedLand(width: number, height: number, landMask: Uint8Array, islandId: Int16Array, specs: IslandSpec[]): { landMask: Uint8Array; islandId: Int16Array } {
  const components = componentSeeds(width, height, landMask, islandId, specs);
  const keep = new Set<number>();
  for (const component of components) {
    const minimum = component.spec.major ? 160 : 16;
    if (component.cells.length >= minimum) {
      for (const cell of component.cells) keep.add(cell);
    }
  }
  const nextLand = new Uint8Array(landMask.length);
  const nextIds = new Int16Array(islandId.length);
  for (const cell of keep) {
    nextLand[cell] = 1;
    nextIds[cell] = islandId[cell];
  }
  return { landMask: nextLand, islandId: nextIds };
}

function componentSeeds(width: number, height: number, landMask: Uint8Array, islandId: Int16Array, specs: IslandSpec[]): ComponentSeed[] {
  const seen = new Uint8Array(landMask.length);
  const components: ComponentSeed[] = [];
  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i] || seen[i]) return;
    const id = islandId[i];
    const spec = specs[id - 1];
    const cells: number[] = [];
    const queue = [{ x, y }];
    seen[i] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      const ci = index(width, cell.x, cell.y);
      cells.push(ci);
      for (const next of cardinalNeighbors(cell.x, cell.y)) {
        if (!inBounds(width, height, next.x, next.y)) continue;
        const ni = index(width, next.x, next.y);
        if (!landMask[ni] || seen[ni] || islandId[ni] !== id) continue;
        seen[ni] = 1;
        queue.push(next);
      }
    }
    components.push({ spec, cells });
  });
  return components;
}

function ensureMajorIslandFallbacks(width: number, height: number, specs: IslandSpec[], landMask: Uint8Array, islandId: Int16Array) {
  specs.forEach((spec, specIndex) => {
    if (!spec.major) return;
    let count = 0;
    for (let i = 0; i < islandId.length; i += 1) if (islandId[i] === specIndex + 1) count += 1;
    if (count >= 130) return;
    for (let y = Math.floor(spec.centerY - spec.radiusY); y <= Math.ceil(spec.centerY + spec.radiusY); y += 1) {
      for (let x = Math.floor(spec.centerX - spec.radiusX); x <= Math.ceil(spec.centerX + spec.radiusX); x += 1) {
        if (!inBounds(width, height, x, y)) continue;
        const dx = (x - spec.centerX) / Math.max(1, spec.radiusX * 0.78);
        const dy = (y - spec.centerY) / Math.max(1, spec.radiusY * 0.78);
        if (dx * dx + dy * dy > 1) continue;
        const i = index(width, x, y);
        landMask[i] = 1;
        islandId[i] = specIndex + 1;
      }
    }
  });
}

function buildIslandRecords(width: number, islandId: Int16Array, specs: IslandSpec[]): SemanticIslandRecord[] {
  return specs
    .map((spec, specIndex) => {
      const idNumber = specIndex + 1;
      let area = 0;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let sumX = 0;
      let sumY = 0;
      for (let i = 0; i < islandId.length; i += 1) {
        if (islandId[i] !== idNumber) continue;
        const x = i % width;
        const y = Math.floor(i / width);
        area += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        sumX += x;
        sumY += y;
      }
      return {
        id: spec.id,
        name: spec.name,
        role: spec.role,
        theme: spec.theme,
        order: specIndex,
        major: spec.major,
        area,
        bounds: {
          minX: Number.isFinite(minX) ? minX : Math.round(spec.centerX),
          minY: Number.isFinite(minY) ? minY : Math.round(spec.centerY),
          maxX: Number.isFinite(maxX) ? maxX : Math.round(spec.centerX),
          maxY: Number.isFinite(maxY) ? maxY : Math.round(spec.centerY)
        },
        center: area ? { x: sumX / area, y: sumY / area } : { x: spec.centerX, y: spec.centerY },
        profile: spec.profile,
        dryBias: spec.dryBias,
        coldBias: spec.coldBias,
        mountainBias: spec.mountainBias,
        forestBias: spec.forestBias,
        overlayRules: spec.overlayRules,
        requiredPois: spec.requiredPois,
        requiredHarbors: spec.requiredHarbors,
        allowRoads: spec.allowRoads,
        allowRivers: spec.allowRivers
      };
    })
    .filter((island) => island.area > 0);
}

function computeDistanceToMask(mask: Uint8Array, width: number, height: number, targetValue: boolean): Int16Array {
  const distances = new Int16Array(width * height);
  distances.fill(INF);
  const queue: SemanticVec[] = [];
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

function classifyWater(landMask: Uint8Array, distanceToLand: Int16Array, width: number, height: number): Uint8Array {
  const waterClass = new Uint8Array(width * height);
  forEachCell(width, height, (_x, _y, i) => {
    waterClass[i] = landMask[i] ? SEMANTIC_WATER.NONE : distanceToLand[i] <= SHALLOW_BAND ? SEMANTIC_WATER.SHALLOW : SEMANTIC_WATER.DEEP;
  });
  return waterClass;
}

function createClimateFields(
  width: number,
  height: number,
  seed: string,
  landMask: Uint8Array,
  distanceToWater: Int16Array,
  islandId: Int16Array,
  islands: SemanticIslandRecord[]
) {
  const moisture = new Float32Array(width * height);
  const temperature = new Float32Array(width * height);
  const coldness = new Float32Array(width * height);
  const islandByOrder = new Map(islands.map((island) => [island.order + 1, island]));
  forEachCell(width, height, (x, y, i) => {
    const island = islandByOrder.get(islandId[i]);
    const wetNoise = fbm(`${seed}:semantic-moisture`, x / 20, y / 20, 4);
    const tempNoise = fbm(`${seed}:semantic-temperature`, x / 26, y / 26, 3);
    const coastMoisture = landMask[i] ? clamp01(1 - distanceToWater[i] / 18) * 0.14 : 0;
    moisture[i] = clamp01(wetNoise * 0.72 + coastMoisture + (island?.forestBias ?? 0) - (island?.dryBias ?? 0) * 0.35);
    const northCold = 1 - y / Math.max(1, height - 1);
    coldness[i] = clamp01(northCold * 0.22 + tempNoise * 0.22 + (island?.coldBias ?? 0));
    temperature[i] = clamp01(1 - coldness[i]);
  });
  return { moisture, temperature, coldness };
}

function createRidgeField(
  width: number,
  height: number,
  seed: string,
  landMask: Uint8Array,
  distanceToWater: Int16Array,
  islandId: Int16Array,
  islands: SemanticIslandRecord[]
) {
  const ridge = new Float32Array(width * height);
  const islandByOrder = new Map(islands.map((island) => [island.order + 1, island]));
  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i]) return;
    const island = islandByOrder.get(islandId[i]);
    const angle = fbm(`${seed}:semantic-ridge-angle:${islandId[i]}`, island?.center.x ?? 0, island?.center.y ?? 0, 2) * Math.PI;
    const distanceFromAxis = Math.abs(Math.sin(angle) * (x - (island?.center.x ?? x)) - Math.cos(angle) * (y - (island?.center.y ?? y)));
    const islandScale = island ? Math.max(3.5, Math.sqrt(island.area) / 5.5) : 4;
    let value = Math.exp(-(distanceFromAxis * distanceFromAxis) / (2 * islandScale * islandScale));
    value *= clamp01(distanceToWater[i] / 5);
    value += fbm(`${seed}:semantic-ridge-noise`, x / 8, y / 8, 3) * 0.2;
    value += island?.mountainBias ?? 0;
    ridge[i] = clamp01(value);
  });
  return ridge;
}

function finalizeElevation(width: number, height: number, seed: string, landMask: Uint8Array, distanceToWater: Int16Array, ridge: Float32Array) {
  const elevation = new Float32Array(width * height);
  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i]) return;
    const inland = clamp01(distanceToWater[i] / 11);
    const noise = fbm(`${seed}:semantic-elevation`, x / 15, y / 15, 4);
    elevation[i] = clamp01(inland * 0.46 + ridge[i] * 0.34 + noise * 0.22);
  });
  return elevation;
}

function classifyBiomes(
  width: number,
  height: number,
  landMask: Uint8Array,
  distanceToWater: Int16Array,
  islandId: Int16Array,
  islands: SemanticIslandRecord[],
  elevation: Float32Array,
  moisture: Float32Array,
  coldness: Float32Array
) {
  const biome = new Uint8Array(width * height);
  const islandByOrder = new Map(islands.map((island) => [island.order + 1, island]));
  forEachCell(width, height, (_x, _y, i) => {
    if (!landMask[i]) {
      biome[i] = SEMANTIC_BIOME.WATER;
      return;
    }
    if (distanceToWater[i] <= BEACH_BAND) {
      biome[i] = SEMANTIC_BIOME.BEACH;
      return;
    }
    const island = islandByOrder.get(islandId[i]);
    const dryness = clamp01(1 - moisture[i] + (island?.dryBias ?? 0) * 0.72);
    const coldScore = coldness[i] + elevation[i] * 0.28;
    const iceThreshold = island?.theme === "ice" ? 0.44 : 0.62;
    const sandThreshold = island?.theme === "sand_coast" ? 0.58 : 0.78;
    if (coldScore > iceThreshold && elevation[i] > 0.18) biome[i] = SEMANTIC_BIOME.ICE;
    else if (dryness > sandThreshold || (dryness > sandThreshold - 0.1 && elevation[i] < 0.48 && moisture[i] < 0.45)) biome[i] = SEMANTIC_BIOME.SAND;
    else biome[i] = SEMANTIC_BIOME.GRASS;
  });
  return smoothBiomes(biome, landMask, distanceToWater, islandId, width, height, 2);
}

function smoothBiomes(
  biome: Uint8Array,
  landMask: Uint8Array,
  distanceToWater: Int16Array,
  islandId: Int16Array,
  width: number,
  height: number,
  passes: number
) {
  let current = biome;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = new Uint8Array(current);
    forEachCell(width, height, (x, y, i) => {
      if (!landMask[i] || distanceToWater[i] <= BEACH_BAND) return;
      const counts = new Map<number, number>();
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

function placeMountains(
  width: number,
  height: number,
  seed: string,
  landMask: Uint8Array,
  distanceToWater: Int16Array,
  islandId: Int16Array,
  islands: SemanticIslandRecord[],
  biome: Uint8Array,
  elevation: Float32Array,
  ridge: Float32Array,
  coldness: Float32Array,
  mountainCandidateScore: Float32Array,
  mountainMap: Uint8Array,
  blockedMap?: Uint8Array,
  poiList?: SemanticPoi[]
): { mountains: SemanticMountain[]; mountainRanges: SemanticMountainRange[]; mountainDebug: SemanticMountainDebug } {
  mountainMap.fill(0);
  mountainCandidateScore.fill(0);
  const islandByOrder = new Map(islands.map((island) => [island.order + 1, island]));
  const candidatesByIsland = new Map<number, MountainCandidate[]>();
  const candidateByIndex = new Map<number, MountainCandidate>();
  forEachCell(width, height, (x, y, i) => {
    const island = islandByOrder.get(islandId[i]);
    if (!landMask[i] || !island || distanceToWater[i] <= 2) return;
    const ridgeSupport = nearbyRidgeSupport(width, height, ridge, x, y, 2);
    const score =
      elevation[i] * 0.58 +
      ridge[i] * 0.62 +
      ridgeSupport * 0.025 +
      island.mountainBias * 0.22 +
      fbm(`${seed}:semantic-mountain`, x / 5, y / 5, 2) * 0.1;
    mountainCandidateScore[i] = Math.max(0, score);
    if (blockedMap?.[i]) return;
    if (poiList?.some((poi) => squaredDistance({ x, y }, poi) < mountainPoiClearanceRadius(poi) ** 2)) return;
    if (biome[i] === SEMANTIC_BIOME.BEACH) return;
    const plan = mountainMassifPlan(island);
    if (score < plan.growThreshold) return;
    if (ridge[i] < plan.ridgeGrowThreshold && elevation[i] < plan.growElevationFloor) return;
    if (ridgeSupport < (island.major ? 1 : 0)) return;
    if (island.id === "greenhaven" && elevation[i] < 0.58) return;
    if (island.id === "coralreach" && elevation[i] < 0.56) return;
    if (plan.maxRegions <= 0) return;
    const candidate: MountainCandidate = {
      x,
      y,
      i,
      islandNumber: island.order + 1,
      score,
      kind: mountainKindForCell(island, i, biome, elevation, coldness),
      elevation: elevation[i],
      ridge: ridge[i],
      ridgeSupport
    };
    const islandCandidates = candidatesByIsland.get(island.order + 1) ?? [];
    islandCandidates.push(candidate);
    candidateByIndex.set(i, candidate);
    candidatesByIsland.set(island.order + 1, islandCandidates);
  });

  const rawMask = new Uint8Array(width * height);
  let rejectedTinyComponents = 0;
  for (const [islandNumber, candidates] of candidatesByIsland.entries()) {
    const island = islandByOrder.get(islandNumber);
    if (!island) continue;
    const plan = mountainMassifPlan(island);
    if (plan.maxRegions <= 0) continue;
    const seeds = [...candidates]
      .filter((candidate) => candidate.score >= plan.seedThreshold && candidate.ridge >= plan.ridgeSeedThreshold && candidate.ridgeSupport >= (island.major ? 2 : 1))
      .sort((a, b) => mountainSeedSort(seed, island, a, b));
    const claimed = new Set<number>();
    const selectedSeeds: MountainCandidate[] = [];
    for (const seedCandidate of seeds) {
      if (selectedSeeds.length >= plan.maxRegions) break;
      if (claimed.has(seedCandidate.i) || rawMask[seedCandidate.i]) continue;
      if (selectedSeeds.some((existing) => squaredDistance(existing, seedCandidate) < plan.seedSpacing * plan.seedSpacing)) continue;
      const remainingBudget = Math.max(0, island.overlayRules.mountainCap - claimed.size);
      if (remainingBudget < plan.minSize) break;
      const targetSize = Math.min(remainingBudget, mountainMassifTargetSize(seed, island, selectedSeeds.length, plan, seedCandidate));
      const grown = growMountainMassif(width, height, seed, islandNumber, seedCandidate, targetSize, plan, candidateByIndex, claimed);
      if (grown.length < plan.minSize) {
        if (grown.length > 0) rejectedTinyComponents += 1;
        continue;
      }
      selectedSeeds.push(seedCandidate);
      for (const candidate of grown) {
        rawMask[candidate.i] = 1;
        claimed.add(candidate.i);
      }
    }
    shapeMountainMask(width, height, seed, islandNumber, island, plan, rawMask, candidateByIndex);
  }

  const mountains: SemanticMountain[] = [];
  const mountainRanges: SemanticMountainRange[] = [];
  const components = mountainMaskComponents(width, height, rawMask, candidateByIndex).sort((a, b) => {
    const islandDelta = a.islandNumber - b.islandNumber;
    if (islandDelta) return islandDelta;
    return b.cells.length - a.cells.length || a.cells[0].y - b.cells[0].y || a.cells[0].x - b.cells[0].x;
  });
  const acceptedComponentSizes: number[] = [];
  const rangeIndexByIsland = new Map<number, number>();

  for (const component of components) {
    const islandNumber = component.islandNumber;
    const island = islandByOrder.get(islandNumber);
    if (!island) continue;
    const plan = mountainMassifPlan(island);
    if (component.cells.length < plan.minSize) {
      rejectedTinyComponents += 1;
      continue;
    }
    const nextRangeIndex = rangeIndexByIsland.get(islandNumber) ?? 1;
    rangeIndexByIsland.set(islandNumber, nextRangeIndex + 1);
    const rangeId = `${island.id}-range-${nextRangeIndex}`;
    const sorted = [...component.cells].sort((a, b) => a.y - b.y || a.x - b.x);
    const cells = sorted.map(({ x, y }) => ({ x, y }));
    const bounds = boundsForCells(cells);
    const range: SemanticMountainRange = {
      id: rangeId,
      islandId: island.id,
      kind: mountainRangeKind(sorted),
      cells,
      collisionCells: cells.map((cell) => ({ ...cell })),
      bounds
    };
    mountainRanges.push(range);
    acceptedComponentSizes.push(cells.length);
    for (const candidate of sorted) {
      mountainMap[candidate.i] = 1;
      mountains.push({
        x: candidate.x,
        y: candidate.y,
        islandId: island.id,
        rangeId,
        kind: candidate.kind,
        elevation: round(candidate.elevation),
        ridge: round(candidate.ridge),
        score: round(candidate.score)
      });
    }
  }
  const mountainDebug = buildMountainDebug(acceptedComponentSizes, rejectedTinyComponents);
  return { mountains, mountainRanges, mountainDebug };
}

function mountainMassifPlan(island: SemanticIslandRecord): MountainMassifPlan {
  const cellBudget = Math.max(0, island.overlayRules.mountainCap);
  const maxRegions = mountainMassifCount(island, cellBudget);
  const totalTarget = Math.min(cellBudget, Math.round(island.area * mountainCoverageRatio(island)));
  const targetSize = maxRegions > 0 ? Math.round(totalTarget / maxRegions) : 0;
  const minSize = mountainMinimumComponentSize(island);
  const maxSize = mountainMaximumComponentSize(island);
  return {
    maxRegions,
    minSize,
    targetSize: maxRegions > 0 && cellBudget >= minSize ? clamp(targetSize, minSize, Math.min(maxSize, cellBudget)) : 0,
    maxSize,
    seedSpacing: Math.max(island.overlayRules.mountainSpacing, Math.round(Math.sqrt(island.area) / (island.major ? 2.8 : 2.2))),
    seedThreshold: mountainThreshold(island),
    growThreshold: mountainGrowThreshold(island),
    growElevationFloor: mountainGrowElevationFloor(island),
    ridgeSeedThreshold: island.theme === "mixed_highland" || island.theme === "ice" ? 0.52 : 0.58,
    ridgeGrowThreshold: island.theme === "mixed_highland" || island.theme === "ice" ? 0.42 : 0.48
  };
}

function mountainMassifCount(island: SemanticIslandRecord, cellBudget: number): number {
  const minSize = mountainMinimumComponentSize(island);
  if (cellBudget < minSize) return 0;
  const budgetRegions = Math.max(1, Math.floor(cellBudget / minSize));
  if (island.id === "highspire") return Math.min(budgetRegions, Math.max(2, Math.round(Math.sqrt(island.area) / 10)));
  if (island.id === "frostmere") return Math.min(budgetRegions, Math.max(1, Math.round(Math.sqrt(island.area) / 11)));
  if (island.id === "greenhaven" || island.id === "coralreach") return Math.min(1, budgetRegions);
  if (!island.major && (island.role === "cave" || island.role === "resource")) return Math.min(1, budgetRegions);
  return 0;
}

function mountainCoverageRatio(island: SemanticIslandRecord): number {
  if (island.id === "highspire") return 0.32;
  if (island.id === "frostmere") return 0.38;
  if (island.id === "coralreach") return 0.045;
  if (island.id === "greenhaven") return 0.032;
  if (!island.major && island.role === "cave") return 0.2;
  if (!island.major && island.role === "resource") return 0.16;
  return 0;
}

function mountainMinimumComponentSize(island: SemanticIslandRecord): number {
  if (island.id === "highspire") return 24;
  if (island.id === "frostmere") return 18;
  if (island.id === "greenhaven" || island.id === "coralreach") return 8;
  return island.major ? 14 : 8;
}

function mountainMaximumComponentSize(island: SemanticIslandRecord): number {
  if (island.id === "highspire") return 140;
  if (island.id === "frostmere") return 110;
  if (island.id === "coralreach") return 30;
  if (island.id === "greenhaven") return 26;
  return island.major ? 80 : 18;
}

function mountainMassifTargetSize(seed: string, island: SemanticIslandRecord, indexValue: number, plan: MountainMassifPlan, candidate: MountainCandidate): number {
  const roll = hashNoise(`${seed}:semantic-mountain-massif-size:${island.id}:${indexValue}`, candidate.x, candidate.y);
  return clamp(Math.round(plan.targetSize * (0.82 + roll * 0.38)), plan.minSize, plan.maxSize);
}

function mountainSeedSort(seed: string, island: SemanticIslandRecord, a: MountainCandidate, b: MountainCandidate): number {
  const islandCenterBias = (candidate: MountainCandidate) => centerScore(candidate.x, candidate.y, island.center.x, island.center.y, island.area) * 0.16;
  const scoreA = a.score + a.ridge * 0.1 + a.elevation * 0.08 + islandCenterBias(a) + hashNoise(`${seed}:semantic-mountain-seed-sort:${island.id}`, a.x, a.y) * 0.035;
  const scoreB = b.score + b.ridge * 0.1 + b.elevation * 0.08 + islandCenterBias(b) + hashNoise(`${seed}:semantic-mountain-seed-sort:${island.id}`, b.x, b.y) * 0.035;
  return scoreB - scoreA;
}

function growMountainMassif(
  width: number,
  height: number,
  seed: string,
  islandNumber: number,
  seedCandidate: MountainCandidate,
  targetSize: number,
  plan: MountainMassifPlan,
  candidateByIndex: Map<number, MountainCandidate>,
  claimed: Set<number>
): MountainCandidate[] {
  const selected = new Map<number, MountainCandidate>();
  const frontier = new Map<number, MountainCandidate>();
  const addFrontier = (candidate: MountainCandidate) => {
    for (const next of cardinalNeighbors(candidate.x, candidate.y)) {
      if (!inBounds(width, height, next.x, next.y)) continue;
      const ni = index(width, next.x, next.y);
      if (selected.has(ni) || frontier.has(ni) || claimed.has(ni)) continue;
      const nextCandidate = candidateByIndex.get(ni);
      if (!nextCandidate || nextCandidate.i !== ni || nextCandidate.islandNumber !== islandNumber) continue;
      if (nextCandidate.score < plan.growThreshold || (nextCandidate.ridge < plan.ridgeGrowThreshold && nextCandidate.elevation < plan.growElevationFloor)) continue;
      if (nextCandidate.kind !== seedCandidate.kind && seedCandidate.kind === "snow_mountain" && nextCandidate.kind !== "snow_mountain") continue;
      frontier.set(ni, nextCandidate);
    }
  };

  selected.set(seedCandidate.i, seedCandidate);
  addFrontier(seedCandidate);
  while (selected.size < targetSize && frontier.size > 0) {
    let best: MountainCandidate | undefined;
    let bestScore = -Infinity;
    for (const candidate of frontier.values()) {
      const priority = mountainGrowthPriority(width, height, seed, islandNumber, seedCandidate, candidate, selected, targetSize);
      if (priority > bestScore) {
        best = candidate;
        bestScore = priority;
      }
    }
    if (!best) break;
    frontier.delete(best.i);
    selected.set(best.i, best);
    addFrontier(best);
  }
  return [...selected.values()];
}

function mountainGrowthPriority(
  width: number,
  height: number,
  seed: string,
  islandNumber: number,
  seedCandidate: MountainCandidate,
  candidate: MountainCandidate,
  selected: Map<number, MountainCandidate>,
  targetSize: number
): number {
  const adjacent = cardinalMountainNeighborCount(width, height, selected, candidate.x, candidate.y);
  const distance = Math.hypot(candidate.x - seedCandidate.x, candidate.y - seedCandidate.y);
  const radius = Math.sqrt(targetSize / Math.PI) * 1.45;
  const distancePenalty = Math.max(0, distance - radius) * 0.09;
  const sameKind = candidate.kind === seedCandidate.kind ? 0.05 : -0.05;
  const jitter = hashNoise(`${seed}:semantic-mountain-grow:${islandNumber}:${seedCandidate.x},${seedCandidate.y}`, candidate.x, candidate.y) * 0.09;
  return candidate.score * 0.72 + candidate.ridge * 0.28 + candidate.elevation * 0.18 + adjacent * 0.18 + sameKind + jitter - distancePenalty;
}

function shapeMountainMask(
  width: number,
  height: number,
  seed: string,
  islandNumber: number,
  island: SemanticIslandRecord,
  plan: MountainMassifPlan,
  mask: Uint8Array,
  candidateByIndex: Map<number, MountainCandidate>
) {
  const additions: number[] = [];
  for (const candidate of candidateByIndex.values()) {
    if (mask[candidate.i] || candidate.i < 0) continue;
    if (candidate.islandNumber !== islandNumber) continue;
    const neighbors = maskNeighborCount(width, height, mask, candidate.x, candidate.y);
    if (neighbors < 2) continue;
    const noise = hashNoise(`${seed}:semantic-mountain-smooth:${island.id}`, candidate.x, candidate.y);
    if (candidate.score + noise * 0.08 >= plan.growThreshold + 0.02 && candidate.ridge >= plan.ridgeGrowThreshold - 0.04) additions.push(candidate.i);
  }
  for (const i of additions) mask[i] = 1;

  const removals: number[] = [];
  for (const candidate of candidateByIndex.values()) {
    if (!mask[candidate.i]) continue;
    if (candidate.islandNumber !== islandNumber) continue;
    const neighbors = maskNeighborCount(width, height, mask, candidate.x, candidate.y);
    if (neighbors === 0) {
      removals.push(candidate.i);
      continue;
    }
    const noise = hashNoise(`${seed}:semantic-mountain-prune:${island.id}`, candidate.x, candidate.y);
    if (neighbors === 1 && candidate.score < plan.seedThreshold && noise < 0.36) removals.push(candidate.i);
  }
  for (const i of removals) mask[i] = 0;
  roughenMountainMask(width, height, seed, islandNumber, island, plan, mask, candidateByIndex);
  notchRectangularMountainComponents(width, height, seed, islandNumber, island, plan, mask, candidateByIndex);
}

function roughenMountainMask(
  width: number,
  height: number,
  seed: string,
  islandNumber: number,
  island: SemanticIslandRecord,
  plan: MountainMassifPlan,
  mask: Uint8Array,
  candidateByIndex: Map<number, MountainCandidate>
) {
  const removals: number[] = [];
  for (const candidate of candidateByIndex.values()) {
    if (!mask[candidate.i] || candidate.islandNumber !== islandNumber) continue;
    const neighbors = maskNeighborCount(width, height, mask, candidate.x, candidate.y);
    const diagonalNeighbors = diagonalMaskNeighborCount(width, height, mask, candidate.x, candidate.y);
    const noise = hashNoise(`${seed}:semantic-mountain-roughen:${island.id}`, candidate.x, candidate.y);
    if (neighbors <= 1 && noise < 0.42) {
      removals.push(candidate.i);
      continue;
    }
    if (neighbors === 2 && diagonalNeighbors <= 2 && candidate.score < plan.seedThreshold + 0.05 && noise < 0.2) removals.push(candidate.i);
    if (neighbors === 3 && candidate.score < plan.seedThreshold - 0.01 && noise < 0.07) removals.push(candidate.i);
    if (neighbors === 4 && diagonalNeighbors >= 4 && candidate.score < plan.seedThreshold + 0.02 && noise < 0.025) removals.push(candidate.i);
  }
  for (const i of removals) mask[i] = 0;
}

function notchRectangularMountainComponents(
  width: number,
  height: number,
  seed: string,
  islandNumber: number,
  island: SemanticIslandRecord,
  plan: MountainMassifPlan,
  mask: Uint8Array,
  candidateByIndex: Map<number, MountainCandidate>
) {
  const components = mountainMaskComponents(width, height, mask, candidateByIndex).filter((component) => component.islandNumber === islandNumber);
  for (const component of components) {
    if (component.cells.length <= plan.minSize + 1) continue;
    const bounds = boundsForCells(component.cells);
    const rectArea = (bounds.maxX - bounds.minX + 1) * (bounds.maxY - bounds.minY + 1);
    if (rectArea < 10 || component.cells.length / rectArea < 0.84) continue;
    const maxRemovals = Math.min(component.cells.length - plan.minSize, Math.max(1, Math.ceil(component.cells.length * 0.18)));
    const edgeCells = component.cells
      .filter((cell) => {
        const neighbors = maskNeighborCount(width, height, mask, cell.x, cell.y);
        const onBounds = cell.x === bounds.minX || cell.x === bounds.maxX || cell.y === bounds.minY || cell.y === bounds.maxY;
        return onBounds && neighbors <= 3;
      })
      .sort((a, b) => hashNoise(`${seed}:semantic-mountain-notch:${island.id}`, a.x, a.y) - hashNoise(`${seed}:semantic-mountain-notch:${island.id}`, b.x, b.y));
    let removed = 0;
    for (const cell of edgeCells) {
      if (removed >= maxRemovals) break;
      mask[cell.i] = 0;
      if (componentCellsRemainConnected(width, height, mask, component.cells)) removed += 1;
      else mask[cell.i] = 1;
    }
  }
}

function componentCellsRemainConnected(width: number, height: number, mask: Uint8Array, cells: MountainCandidate[]): boolean {
  const remaining = cells.filter((cell) => mask[cell.i]);
  if (remaining.length <= 1) return true;
  const remainingKeys = new Set(remaining.map((cell) => posKey(cell)));
  const seen = new Set<string>();
  const queue: SemanticVec[] = [{ x: remaining[0].x, y: remaining[0].y }];
  seen.add(posKey(queue[0]));
  for (let head = 0; head < queue.length; head += 1) {
    const cell = queue[head];
    for (const next of cardinalNeighbors(cell.x, cell.y)) {
      if (!inBounds(width, height, next.x, next.y)) continue;
      const key = posKey(next);
      if (!remainingKeys.has(key) || seen.has(key) || !mask[index(width, next.x, next.y)]) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen.size === remaining.length;
}

function mountainMaskComponents(width: number, height: number, mask: Uint8Array, candidateByIndex: Map<number, MountainCandidate>): { islandNumber: number; cells: MountainCandidate[] }[] {
  const seen = new Uint8Array(mask.length);
  const components: { islandNumber: number; cells: MountainCandidate[] }[] = [];
  forEachCell(width, height, (x, y, i) => {
    if (!mask[i] || seen[i]) return;
    const start = candidateByIndex.get(i);
    if (!start) return;
    const queue = [{ x, y }];
    const cells: MountainCandidate[] = [];
    seen[i] = 1;
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      const ci = index(width, cell.x, cell.y);
      const candidate = candidateByIndex.get(ci);
      if (candidate) cells.push(candidate);
      for (const next of cardinalNeighbors(cell.x, cell.y)) {
        if (!inBounds(width, height, next.x, next.y)) continue;
        const ni = index(width, next.x, next.y);
        if (!mask[ni] || seen[ni]) continue;
        const nextCandidate = candidateByIndex.get(ni);
        if (!nextCandidate || nextCandidate.islandNumber !== start.islandNumber) continue;
        seen[ni] = 1;
        queue.push(next);
      }
    }
    if (cells.length) components.push({ islandNumber: start.islandNumber, cells });
  });
  return components;
}

function cardinalMountainNeighborCount(width: number, height: number, selected: Map<number, MountainCandidate>, x: number, y: number): number {
  let count = 0;
  for (const next of cardinalNeighbors(x, y)) {
    if (inBounds(width, height, next.x, next.y) && selected.has(index(width, next.x, next.y))) count += 1;
  }
  return count;
}

function maskNeighborCount(width: number, height: number, mask: Uint8Array, x: number, y: number): number {
  let count = 0;
  for (const next of cardinalNeighbors(x, y)) {
    if (inBounds(width, height, next.x, next.y) && mask[index(width, next.x, next.y)]) count += 1;
  }
  return count;
}

function diagonalMaskNeighborCount(width: number, height: number, mask: Uint8Array, x: number, y: number): number {
  let count = 0;
  for (const next of [
    { x: x - 1, y: y - 1 },
    { x: x + 1, y: y - 1 },
    { x: x + 1, y: y + 1 },
    { x: x - 1, y: y + 1 }
  ]) {
    if (inBounds(width, height, next.x, next.y) && mask[index(width, next.x, next.y)]) count += 1;
  }
  return count;
}

function mountainRangeKind(cells: MountainCandidate[]): SemanticMountain["kind"] {
  const snowCount = cells.filter((cell) => cell.kind === "snow_mountain").length;
  return snowCount >= cells.length / 2 ? "snow_mountain" : "mountain";
}

function buildMountainDebug(componentSizes: number[], rejectedTinyComponents: number): SemanticMountainDebug {
  const sizes = [...componentSizes].sort((a, b) => b - a);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  return {
    componentCount: sizes.length,
    componentSizes: sizes,
    minComponentSize: sizes.length ? Math.min(...sizes) : 0,
    maxComponentSize: sizes.length ? Math.max(...sizes) : 0,
    averageComponentSize: sizes.length ? round(total / sizes.length) : 0,
    rejectedTinyComponents,
    singletonComponents: sizes.filter((size) => size === 1).length
  };
}

function boundsForCells(cells: SemanticVec[]): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const cell of cells) {
    minX = Math.min(minX, cell.x);
    minY = Math.min(minY, cell.y);
    maxX = Math.max(maxX, cell.x);
    maxY = Math.max(maxY, cell.y);
  }
  return { minX, minY, maxX, maxY };
}

function placeLakes(
  width: number,
  height: number,
  seed: string,
  landMask: Uint8Array,
  distanceToWater: Int16Array,
  elevation: Float32Array,
  moisture: Float32Array,
  biome: Uint8Array,
  mountainMap: Uint8Array,
  lakeMap: Uint8Array
): SemanticLake[] {
  const candidates: { x: number; y: number; i: number; score: number }[] = [];
  forEachCell(width, height, (x, y, i) => {
    if (!landMask[i] || distanceToWater[i] < 6 || mountainMap[i]) return;
    if (biome[i] === SEMANTIC_BIOME.BEACH) return;
    const score = moisture[i] * 0.45 + (1 - Math.abs(elevation[i] - 0.45)) * 0.35 + fbm(`${seed}:semantic-lake`, x / 12, y / 12, 3) * 0.22;
    if (score > 0.78) candidates.push({ x, y, i, score });
  });
  candidates.sort((a, b) => b.score - a.score);
  const lakes: SemanticLake[] = [];
  for (const candidate of candidates.slice(0, 4)) {
    if (lakes.some((lake) => squaredDistance(candidate, lake) < 12 * 12)) continue;
    const radius = 1;
    const cells: SemanticVec[] = [];
    for (let y = candidate.y - radius; y <= candidate.y + radius; y += 1) {
      for (let x = candidate.x - radius; x <= candidate.x + radius; x += 1) {
        if (!inBounds(width, height, x, y)) continue;
        const i = index(width, x, y);
        if (!landMask[i] || mountainMap[i]) continue;
        if (Math.hypot(x - candidate.x, y - candidate.y) <= radius + 0.25) {
          lakeMap[i] = 1;
          cells.push({ x, y });
        }
      }
    }
    if (cells.length) lakes.push({ x: candidate.x, y: candidate.y, radius, cells });
  }
  return lakes;
}

function traceRivers(
  width: number,
  height: number,
  seed: string,
  landMask: Uint8Array,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  distanceToWater: Int16Array,
  islandId: Int16Array,
  islands: SemanticIslandRecord[],
  elevation: Float32Array,
  coldness: Float32Array,
  ridge: Float32Array,
  mountainMap: Uint8Array,
  poiList: SemanticPoi[],
  riverMap: Uint8Array
): SemanticRiver[] {
  const islandByOrder = new Map(islands.map((island) => [island.order + 1, island]));
  const poiBlocked = new Set<string>();
  for (const poi of poiList) {
    reserveSemanticPoiFootprint(poiBlocked, poi, poi.role === "settlement" || poi.role === "port" ? 2 : 1);
  }
  const candidates: { x: number; y: number; i: number; score: number }[] = [];
  forEachCell(width, height, (x, y, i) => {
    const island = islandByOrder.get(islandId[i]);
    if (!landMask[i] || !island?.allowRivers || distanceToWater[i] < 6 || lakeMap[i] || mountainMap[i] || poiBlocked.has(posKey({ x, y }))) return;
    const score = elevation[i] * 0.54 + ridge[i] * 0.24 + coldness[i] * 0.12 + fbm(`${seed}:semantic-river-source`, x / 7, y / 7, 2) * 0.16;
    if (score > 0.72) candidates.push({ x, y, i, score });
  });
  candidates.sort((a, b) => b.score - a.score);
  const rivers: SemanticRiver[] = [];
  for (const source of candidates) {
    if (rivers.length >= 8) break;
    if (rivers.some((river) => river.path.some((cell) => squaredDistance(cell, source) < 7 * 7))) continue;
    const sourceIsland = islandByOrder.get(islandId[source.i]);
    if (!sourceIsland) continue;
    const path = traceRiverPath(width, height, seed, source, landMask, waterClass, lakeMap, distanceToWater, islandId, islandId[source.i], elevation, mountainMap, poiBlocked, riverMap, rivers.length);
    if (path.length < 6) continue;
    const end = path[path.length - 1];
    const endIndex = index(width, end.x, end.y);
    if (waterClass[endIndex] === SEMANTIC_WATER.NONE && !lakeMap[endIndex] && distanceToWater[endIndex] > 1) continue;
    writeRiverCenterline(width, path, riverMap);
    rivers.push({ id: `river_${rivers.length + 1}`, islandId: sourceIsland.id, source: { x: source.x, y: source.y }, mouth: end, path });
  }
  return rivers;
}

function writeRiverCenterline(
  width: number,
  path: SemanticVec[],
  riverMap: Uint8Array
) {
  for (const cell of path) riverMap[index(width, cell.x, cell.y)] = 1;
}

function traceRiverPath(
  width: number,
  height: number,
  seed: string,
  source: SemanticVec,
  landMask: Uint8Array,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  distanceToWater: Int16Array,
  islandId: Int16Array,
  sourceIslandNumber: number,
  elevation: Float32Array,
  mountainMap: Uint8Array,
  poiBlocked: Set<string>,
  riverMap: Uint8Array,
  riverIndex: number
) {
  const path: SemanticVec[] = [];
  const seen = new Set<string>();
  let current = { x: source.x, y: source.y };
  let previous: SemanticVec | undefined;
  let straightRun = 0;
  for (let step = 0; step < 160; step += 1) {
    const key = posKey(current);
    if (seen.has(key)) return [];
    seen.add(key);
    path.push(current);
    const i = index(width, current.x, current.y);
    if (step > 0 && (!landMask[i] || waterClass[i] !== SEMANTIC_WATER.NONE || lakeMap[i] || distanceToWater[i] <= 0)) return path;
    if (step > 0 && riverMap[i]) return path;
    const currentDirection = previous ? { x: current.x - previous.x, y: current.y - previous.y } : undefined;
    const neighbors = cardinalNeighbors(current.x, current.y)
      .filter((next) => inBounds(width, height, next.x, next.y))
      .map((next) => {
        const ni = index(width, next.x, next.y);
        if (waterClass[ni] === SEMANTIC_WATER.NONE && (mountainMap[ni] || poiBlocked.has(posKey(next)))) return { ...next, cost: Infinity };
        const nextKey = posKey(next);
        if (seen.has(nextKey)) return { ...next, cost: Infinity };
        const joinsExistingRiver = riverMap[ni] > 0;
        if (!joinsExistingRiver && hasAdjacentRiverCell(width, height, riverMap, next.x, next.y)) return { ...next, cost: Infinity };
        const islandPenalty = islandId[ni] !== sourceIslandNumber && waterClass[ni] === SEMANTIC_WATER.NONE ? 5 : 0;
        const downhill = elevation[ni] - elevation[i];
        const waterPull = distanceToWater[ni] * 0.025;
        const noise = hashNoise(`${seed}:semantic-river:${riverIndex}`, next.x, next.y) * 0.045;
        const meander = fbm(`${seed}:semantic-river-meander:${riverIndex}`, next.x / 5, next.y / 5, 2) * 0.075;
        const direction = { x: next.x - current.x, y: next.y - current.y };
        const reversePenalty = currentDirection && direction.x === -currentDirection.x && direction.y === -currentDirection.y ? 3.5 : 0;
        const keepsDirection = currentDirection && direction.x === currentDirection.x && direction.y === currentDirection.y;
        const longStraightPenalty = keepsDirection ? Math.min(0.22, Math.max(0, straightRun - 3) * 0.035) : 0;
        const turnPenalty = currentDirection && !keepsDirection ? (straightRun >= 4 ? -0.04 : 0.13) : -0.035;
        return { ...next, cost: downhill + waterPull + noise + meander + islandPenalty + reversePenalty + turnPenalty + longStraightPenalty };
      })
      .filter((next) => Number.isFinite(next.cost))
      .sort((a, b) => a.cost - b.cost);
    if (!neighbors.length) return [];
    const nextDirection = { x: neighbors[0].x - current.x, y: neighbors[0].y - current.y };
    const currentDirectionBeforeStep = previous ? { x: current.x - previous.x, y: current.y - previous.y } : undefined;
    straightRun = currentDirectionBeforeStep && nextDirection.x === currentDirectionBeforeStep.x && nextDirection.y === currentDirectionBeforeStep.y ? straightRun + 1 : 1;
    previous = current;
    current = { x: neighbors[0].x, y: neighbors[0].y };
  }
  return [];
}

function hasAdjacentRiverCell(width: number, height: number, riverMap: Uint8Array, x: number, y: number): boolean {
  return cardinalNeighbors(x, y).some((next) => inBounds(width, height, next.x, next.y) && riverMap[index(width, next.x, next.y)] > 0);
}

function placePois(
  width: number,
  height: number,
  seed: string,
  islands: SemanticIslandRecord[],
  islandId: Int16Array,
  landMask: Uint8Array,
  waterClass: Uint8Array,
  distanceToWater: Int16Array,
  biome: Uint8Array,
  elevation: Float32Array,
  moisture: Float32Array,
  mountainMap: Uint8Array,
  lakeMap: Uint8Array
) {
  const poiList: SemanticPoi[] = [];
  const harbors: SemanticPoi[] = [];
  const occupied = new Set<string>();
  for (const island of islands) {
    const cells = cellsForIsland(islandId, island.order + 1);
    const required = [...island.requiredPois];
    if (!required.some((poi) => poi.role === "port") && island.requiredHarbors > 0) {
      required.unshift({ id: `${island.id}Harbor`, name: `${island.name} Harbor`, type: "port", role: "port", preferredBiome: "beach" });
    }
    for (const spec of required) {
      const candidate = chooseBestCell(cells, width, (i) =>
        poiScore(width, height, seed, island, spec, i, landMask, waterClass, distanceToWater, biome, elevation, moisture, mountainMap, lakeMap, occupied)
      );
      if (!candidate) continue;
      const poi: SemanticPoi = {
        id: spec.id,
        name: spec.name,
        type: spec.type,
        role: spec.role,
        islandId: island.id,
        x: candidate.x,
        y: candidate.y,
        difficultyTier: island.major ? island.order + 1 : 1
      };
      reservePoiFootprint(occupied, spec, poi.x, poi.y, poiReservePadding(spec));
      poiList.push(poi);
      if (poi.type === "port") harbors.push(poi);
    }
  }
  return { poiList, harbors };
}

function poiScore(
  width: number,
  height: number,
  seed: string,
  island: SemanticIslandRecord,
  spec: RequiredPoiSpec,
  i: number,
  landMask: Uint8Array,
  waterClass: Uint8Array,
  distanceToWater: Int16Array,
  biome: Uint8Array,
  elevation: Float32Array,
  moisture: Float32Array,
  mountainMap: Uint8Array,
  lakeMap: Uint8Array,
  occupied: Set<string>
) {
  const x = i % width;
  const y = Math.floor(i / width);
  if (!landMask[i] || lakeMap[i] || occupied.has(posKey({ x, y }))) return -Infinity;
  if (tooCloseToOccupied(occupied, x, y, spec.role === "port" ? 3 : 5)) return -Infinity;
  if (!isPoiFootprintValid(width, height, spec, x, y, landMask, waterClass, distanceToWater, mountainMap, lakeMap, occupied)) return -Infinity;
  if (spec.role === "port") {
    const waterTiles = countPortFootprintWaterTiles(width, height, spec, x, y, waterClass);
    if (waterTiles < PORT_MIN_SHALLOW_WATER_TILES) return -Infinity;
    if (!poiFootprintCells(spec, x, y).some((cell) => {
      const cellIndex = index(width, cell.x, cell.y);
      return biome[cellIndex] === SEMANTIC_BIOME.BEACH && distanceToWater[cellIndex] <= 1 && hasAdjacentWater(width, height, waterClass, cell.x, cell.y, SEMANTIC_WATER.SHALLOW);
    })) {
      return -Infinity;
    }
    return 1 + waterTiles * 0.08 + edgeFacingScore(x, y, island.center.x, island.center.y) + hashNoise(`${seed}:semantic-poi:${spec.id}`, x, y) * 0.18;
  }
  if (distanceToWater[i] < 3 || mountainMap[i]) return -Infinity;
  const preferred = spec.preferredBiome ? preferredBiomeScore(spec.preferredBiome, biome[i]) : 0.1;
  if (preferred < 0 && spec.role === "settlement") return -Infinity;
  const mountainScore = spec.nearMountains ? nearbyCount(width, height, mountainMap, x, y, 6) * 0.13 + elevation[i] * 0.25 : 0;
  const forestScore = spec.nearForest ? moisture[i] * 0.35 : 0;
  const center = centerScore(x, y, island.center.x, island.center.y, island.area);
  const specialSpacing = spec.role === "gate" || spec.role === "final" ? Math.hypot(x - island.center.x, y - island.center.y) / Math.max(10, Math.sqrt(island.area)) : 0;
  return preferred + center + mountainScore + forestScore + specialSpacing + hashNoise(`${seed}:semantic-poi:${spec.id}`, x, y) * 0.22;
}

function isPoiFootprintValid(
  width: number,
  height: number,
  spec: RequiredPoiSpec,
  x: number,
  y: number,
  landMask: Uint8Array,
  waterClass: Uint8Array,
  distanceToWater: Int16Array,
  mountainMap: Uint8Array,
  lakeMap: Uint8Array,
  occupied: Set<string>
): boolean {
  for (const cell of poiFootprintCells(spec, x, y)) {
    if (!inBounds(width, height, cell.x, cell.y)) return false;
    const cellIndex = index(width, cell.x, cell.y);
    if (spec.role === "port") {
      const isShallowWater = !landMask[cellIndex] && waterClass[cellIndex] === SEMANTIC_WATER.SHALLOW;
      const isLand = landMask[cellIndex] && waterClass[cellIndex] === SEMANTIC_WATER.NONE;
      if ((!isLand && !isShallowWater) || lakeMap[cellIndex] || mountainMap[cellIndex]) return false;
    } else if (!landMask[cellIndex] || waterClass[cellIndex] !== SEMANTIC_WATER.NONE || lakeMap[cellIndex] || mountainMap[cellIndex]) return false;
    if (occupied.has(posKey(cell))) return false;
    if (spec.role !== "port" && distanceToWater[cellIndex] < 2) return false;
  }
  return true;
}

function buildRoadGraph(
  width: number,
  height: number,
  seed: string,
  landMask: Uint8Array,
  islandId: Int16Array,
  islands: SemanticIslandRecord[],
  biome: Uint8Array,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  riverMap: Uint8Array,
  distanceToWater: Int16Array,
  mountainMap: Uint8Array,
  poiList: SemanticPoi[],
  harbors: SemanticPoi[],
  roadMap: Uint8Array
) {
  const edges: SemanticRoadEdge[] = [];
  const roadBlocked = semanticPoiFootprintKeySet(poiList);
  for (const island of islands) {
    if (!island.allowRoads) continue;
    const pois = poiList.filter((poi) => poi.islandId === island.id);
    if (pois.length < 2) continue;
    const roots = pois.filter((poi) => poi.role === "settlement");
    const root = roots[0] ?? pois[0];
    const targets = uniqueBy(
      [...harbors.filter((poi) => poi.islandId === island.id), ...pois.filter((poi) => poi !== root && poi.role !== "landmark").slice(0, 4)],
      (poi) => poi.id
    );
    for (const target of targets) {
      const start = chooseRoadApproachCell(width, height, landMask, islandId, island.order + 1, waterClass, lakeMap, riverMap, mountainMap, root, target, roadBlocked) ?? root;
      const goal = chooseRoadApproachCell(width, height, landMask, islandId, island.order + 1, waterClass, lakeMap, riverMap, mountainMap, target, root, roadBlocked) ?? target;
      const path = findRoadPath(width, height, seed, landMask, islandId, island.order + 1, biome, waterClass, lakeMap, riverMap, distanceToWater, mountainMap, start, goal, roadBlocked);
      if (!path.length) {
        edges.push({ from: root.id, to: target.id, connected: false, length: 0, path: [] });
        continue;
      }
      for (const cell of path) roadMap[index(width, cell.x, cell.y)] = 1;
      edges.push({ from: root.id, to: target.id, connected: true, length: path.length, path });
    }
  }
  return { edges };
}

function clearPoiFootprintRoadCells(width: number, height: number, roadMap: Uint8Array, poiList: SemanticPoi[]) {
  for (const poi of poiList) {
    for (const cell of semanticPoiFootprintCells(poi)) {
      if (!inBounds(width, height, cell.x, cell.y)) continue;
      roadMap[index(width, cell.x, cell.y)] = 0;
    }
  }
}

function chooseRoadApproachCell(
  width: number,
  height: number,
  landMask: Uint8Array,
  islandId: Int16Array,
  targetIslandNumber: number,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  riverMap: Uint8Array,
  mountainMap: Uint8Array,
  poi: SemanticPoi,
  other: SemanticVec,
  blocked: Set<string>
): SemanticVec | undefined {
  const footprintKeys = new Set(semanticPoiFootprintCells(poi).map(posKey));
  const candidates = new Map<string, SemanticVec>();
  for (const cell of semanticPoiFootprintCells(poi)) {
    for (const next of cardinalNeighbors(cell.x, cell.y)) {
      const key = posKey(next);
      if (footprintKeys.has(key) || candidates.has(key) || blocked.has(key)) continue;
      if (!inBounds(width, height, next.x, next.y)) continue;
      const ni = index(width, next.x, next.y);
      if (islandId[ni] !== targetIslandNumber) continue;
      if (!landMask[ni] || waterClass[ni] !== SEMANTIC_WATER.NONE || lakeMap[ni] || riverMap[ni] || mountainMap[ni]) continue;
      candidates.set(key, next);
    }
  }
  return [...candidates.values()].sort((a, b) => roadApproachScore(a, poi, other) - roadApproachScore(b, poi, other))[0];
}

function roadApproachScore(candidate: SemanticVec, poi: SemanticPoi, other: SemanticVec): number {
  const towardOther = Math.abs(candidate.x - other.x) + Math.abs(candidate.y - other.y);
  const centerDistance = Math.abs(candidate.x - poi.x) + Math.abs(candidate.y - poi.y);
  return towardOther + centerDistance * 0.08;
}

function findRoadPath(
  width: number,
  height: number,
  seed: string,
  landMask: Uint8Array,
  islandId: Int16Array,
  targetIslandNumber: number,
  biome: Uint8Array,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  riverMap: Uint8Array,
  distanceToWater: Int16Array,
  mountainMap: Uint8Array,
  start: SemanticVec,
  goal: SemanticVec,
  blocked?: Set<string>
) {
  const startKey = posKey(start);
  const goalKey = posKey(goal);
  const open: { x: number; y: number; f: number; g: number }[] = [{ x: start.x, y: start.y, f: 0, g: 0 }];
  const cameFrom = new Map<string, SemanticVec>();
  const best = new Map<string, number>([[startKey, 0]]);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const key = `${current.x},${current.y}`;
    if (key === goalKey) return reconstructPath(cameFrom, current);
    for (const next of cardinalNeighbors(current.x, current.y)) {
      if (!inBounds(width, height, next.x, next.y)) continue;
      const ni = index(width, next.x, next.y);
      if (islandId[ni] !== targetIslandNumber) continue;
      const nextKey = posKey(next);
      if (blocked?.has(nextKey) && nextKey !== goalKey) continue;
      if (!isRoadStepAllowed(width, height, landMask, islandId, targetIslandNumber, waterClass, lakeMap, riverMap, distanceToWater, mountainMap, current, next)) continue;
      const cost = roadCost(width, seed, biome[ni], mountainMap[ni], current, next, cameFrom.get(key), riverMap[ni]);
      if (!Number.isFinite(cost)) continue;
      const nextG = current.g + cost;
      if (best.has(nextKey) && best.get(nextKey)! <= nextG) continue;
      best.set(nextKey, nextG);
      cameFrom.set(nextKey, { x: current.x, y: current.y });
      open.push({ x: next.x, y: next.y, g: nextG, f: nextG + Math.abs(goal.x - next.x) + Math.abs(goal.y - next.y) });
    }
  }
  return [];
}

function detectBridgeCandidates(
  width: number,
  height: number,
  islandId: Int16Array,
  islands: SemanticIslandRecord[],
  landMask: Uint8Array,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  riverMap: Uint8Array,
  roadMap: Uint8Array,
  distanceToWater: Int16Array,
  mountainMap: Uint8Array,
  riverCrossingMap: Uint8Array
): SemanticBridgeCandidate[] {
  riverCrossingMap.fill(0);
  if (!ENABLE_RIVER_CROSSINGS) return [];
  const islandByOrder = new Map(islands.map((island) => [island.order + 1, island]));
  const candidates: SemanticBridgeCandidate[] = [];
  forEachCell(width, height, (x, y, i) => {
    if (!roadMap[i] || !riverMap[i]) return;
    const island = islandByOrder.get(islandId[i]);
    if (!island) return;
    const crossing = riverCrossingOrientationAt(width, height, riverMap, x, y);
    if (!crossing) return;
    if (!isPotentialRiverCrossing(width, height, landMask, islandId, islandId[i], waterClass, lakeMap, riverMap, distanceToWater, mountainMap, x, y, crossing)) return;
    if (!hasRoadContinuationForCrossing(width, height, roadMap, x, y, crossing)) return;
    riverCrossingMap[i] = 1;
    candidates.push({
      id: `bridge_${candidates.length + 1}`,
      islandId: island.id,
      x,
      y,
      orientation: crossing,
      kind: "road_river",
      crossingType: island.theme === "sand_coast" ? "ford" : "bridge"
    });
  });
  return candidates;
}

function placeForests(
  width: number,
  height: number,
  seed: string,
  landMask: Uint8Array,
  islandId: Int16Array,
  islands: SemanticIslandRecord[],
  biome: Uint8Array,
  moisture: Float32Array,
  mountainMap: Uint8Array,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  riverMap: Uint8Array,
  roadMap: Uint8Array,
  poiList: SemanticPoi[]
) {
  const forestMap = new Uint8Array(width * height);
  const occupied = new Set<string>();
  const islandByOrder = new Map(islands.map((island) => [island.order + 1, island]));
  for (const poi of poiList) {
    const island = islands.find((candidate) => candidate.id === poi.islandId);
    reserveSemanticPoiFootprint(occupied, poi, island?.overlayRules.forestPoiClearance ?? 2);
  }
  const roadReserved = new Set<string>();
  forEachCell(width, height, (x, y, i) => {
    if (!roadMap[i]) return;
    const island = islandByOrder.get(islandId[i]);
    reservePoi(roadReserved, { x, y }, island?.overlayRules.forestRoadClearance ?? 1);
  });
  const rng = createSeededRng(`${seed}:semantic-forests`);
  const clusters: { x: number; y: number; rx: number; ry: number; strength: number }[] = [];
  for (const island of islands) {
    const targetClusters = Math.max(0, Math.min(9, Math.round((Math.sqrt(island.area) * island.overlayRules.forestDensity) / 2.2)));
    const cells = cellsForIsland(islandId, island.order + 1).filter((i) => {
      const x = i % width;
      const y = Math.floor(i / width);
      return (
        forestBiomeAllowed(island, biome[i]) &&
        moisture[i] > forestMoistureThreshold(island) &&
        !mountainMap[i] &&
        !hasNearbyWaterFeature(width, height, waterClass, lakeMap, riverMap, x, y, 1) &&
        !occupied.has(posKey({ x, y })) &&
        !roadReserved.has(posKey({ x, y }))
      );
    });
    if (!cells.length || targetClusters <= 0) continue;
    for (let count = 0; count < targetClusters; count += 1) {
      const i = cells[rng.int(0, cells.length - 1)];
      const x = i % width;
      const y = Math.floor(i / width);
      clusters.push({
        x,
        y,
        rx: rng.float(island.major ? 2.4 : 1.6, island.major ? 5.3 : 3.4),
        ry: rng.float(island.major ? 2.0 : 1.4, island.major ? 4.6 : 3.0),
        strength: rng.float(0.48, 0.9) * island.overlayRules.forestDensity
      });
    }
  }
  forEachCell(width, height, (x, y, i) => {
    const island = islandByOrder.get(islandId[i]);
    if (
      !landMask[i] ||
      !island ||
      !forestBiomeAllowed(island, biome[i]) ||
      mountainMap[i] ||
      hasNearbyWaterFeature(width, height, waterClass, lakeMap, riverMap, x, y, 1) ||
      roadMap[i] ||
      occupied.has(posKey({ x, y })) ||
      roadReserved.has(posKey({ x, y }))
    ) return;
    let value = 0;
    for (const cluster of clusters) {
      const dx = (x - cluster.x) / cluster.rx;
      const dy = (y - cluster.y) / cluster.ry;
      value = Math.max(value, (1 - dx * dx - dy * dy) * cluster.strength);
    }
    const noise = fbm(`${seed}:semantic-forest-edge`, x / 4, y / 4, 2);
    if (value + (moisture[i] - forestMoistureThreshold(island)) * 0.32 + noise * 0.12 > 0.34) forestMap[i] = 1;
  });
  removeTinyForestComponents(width, height, forestMap, 6);
  return forestMap;
}

function hasNearbyWaterFeature(
  width: number,
  height: number,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  riverMap: Uint8Array,
  x: number,
  y: number,
  radius: number
): boolean {
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(width, height, nx, ny)) continue;
      const i = index(width, nx, ny);
      if (waterClass[i] !== SEMANTIC_WATER.NONE || lakeMap[i] || riverMap[i]) return true;
    }
  }
  return false;
}

function removeTinyForestComponents(width: number, height: number, forestMap: Uint8Array, minSize: number) {
  const seen = new Set<number>();
  forEachCell(width, height, (x, y, i) => {
    if (!forestMap[i] || seen.has(i)) return;
    const component: SemanticVec[] = [];
    const queue: SemanticVec[] = [{ x, y }];
    seen.add(i);
    for (let head = 0; head < queue.length; head += 1) {
      const cell = queue[head];
      component.push(cell);
      for (const next of cardinalNeighbors(cell.x, cell.y)) {
        if (!inBounds(width, height, next.x, next.y)) continue;
        const ni = index(width, next.x, next.y);
        if (!forestMap[ni] || seen.has(ni)) continue;
        seen.add(ni);
        queue.push(next);
      }
    }
    if (component.length >= minSize) return;
    for (const cell of component) forestMap[index(width, cell.x, cell.y)] = 0;
  });
}

function buildWalkability(
  width: number,
  height: number,
  landMask: Uint8Array,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  mountainMap: Uint8Array,
  riverMap: Uint8Array,
  bridgeCandidates: SemanticBridgeCandidate[],
  poiList: SemanticPoi[]
) {
  const walkability = new Uint8Array(width * height);
  const bridgeKeys = bridgeCandidateKeySet(bridgeCandidates);
  forEachCell(width, height, (x, y, i) => {
    const isBridgeCrossing = bridgeKeys.has(posKey({ x, y }));
    walkability[i] = landMask[i] && waterClass[i] === SEMANTIC_WATER.NONE && !lakeMap[i] && !mountainMap[i] && (!riverMap[i] || isBridgeCrossing) ? 1 : 0;
  });
  for (const poi of poiList) {
    for (const cell of semanticPoiFootprintCells(poi)) {
      if (!inBounds(width, height, cell.x, cell.y)) continue;
      walkability[index(width, cell.x, cell.y)] = 0;
    }
  }
  return walkability;
}

function buildOverlayCollisionPolicy(
  width: number,
  height: number,
  mountainMap: Uint8Array,
  forestMap: Uint8Array,
  roadMap: Uint8Array,
  riverMap: Uint8Array,
  bridgeCandidates: SemanticBridgeCandidate[],
  poiList: SemanticPoi[]
): OverlayCollisionPolicy[] {
  const policy: OverlayCollisionPolicy[] = Array.from({ length: width * height }, () => "visualOnly");
  const bridgeKeys = bridgeCandidateKeySet(bridgeCandidates);
  forEachCell(width, height, (x, y, i) => {
    if (forestMap[i]) policy[i] = "softTerrain";
    if (roadMap[i]) policy[i] = "visualOnly";
    if (riverMap[i]) policy[i] = "hardBlock";
    if (bridgeKeys.has(posKey({ x, y }))) policy[i] = "visualOnly";
    if (mountainMap[i]) policy[i] = "hardBlock";
  });
  for (const poi of poiList) {
    for (const cell of semanticPoiFootprintCells(poi)) {
      if (!inBounds(width, height, cell.x, cell.y)) continue;
      policy[index(width, cell.x, cell.y)] = "poiBlock";
    }
  }
  return policy;
}

function bridgeCandidateKeySet(bridgeCandidates: SemanticBridgeCandidate[]): Set<string> {
  return new Set(bridgeCandidates.map((bridge) => posKey(bridge)));
}

function summarizeWorld(landMask: Uint8Array, waterClass: Uint8Array, biome: Uint8Array, mountainMap: Uint8Array, forestMap: Uint8Array, roadMap: Uint8Array, riverMap: Uint8Array) {
  return {
    landCells: countValues(landMask, 1),
    deepWaterCells: countValues(waterClass, SEMANTIC_WATER.DEEP),
    shallowWaterCells: countValues(waterClass, SEMANTIC_WATER.SHALLOW),
    beachCells: countValues(biome, SEMANTIC_BIOME.BEACH),
    grassCells: countValues(biome, SEMANTIC_BIOME.GRASS),
    sandCells: countValues(biome, SEMANTIC_BIOME.SAND),
    iceCells: countValues(biome, SEMANTIC_BIOME.ICE),
    mountainCells: countValues(mountainMap, 1),
    forestCells: countValues(forestMap, 1),
    roadCells: countValues(roadMap, 1),
    riverCells: countValues(riverMap, 1)
  };
}

function channelBias(spec: IslandSpec, specs: IslandSpec[], x: number, y: number): number {
  let bias = 0;
  for (const other of specs) {
    if (other === spec) continue;
    const d = Math.hypot(x - other.centerX, y - other.centerY);
    if (d < Math.max(other.radiusX, other.radiusY) * 0.92) bias += other.major && spec.major ? 0.18 : 0.08;
  }
  return bias;
}

function minorIslandName(role: IslandRole, indexValue: number): string {
  const names: Record<string, string> = {
    harbor: "Waymark Cay",
    treasure: "Glimmer Key",
    shrine: "Quiet Shrine Isle",
    cave: "Hollowcap Isle",
    resource: "Oreleaf Atoll"
  };
  return `${names[role] ?? "Minor Isle"} ${indexValue}`;
}

function minorOverlayRules(role: IslandRole): IslandOverlayRules {
  return {
    mountainCap: role === "cave" || role === "resource" ? 14 : 0,
    allowSnowMountains: false,
    mountainSpacing: 6,
    forestDensity: role === "resource" ? 0.28 : role === "shrine" ? 0.16 : 0.08,
    forestPoiClearance: 2,
    forestRoadClearance: 1
  };
}

function minorPoisForRole(role: IslandRole, minorIndex: number): RequiredPoiSpec[] {
  if (role === "harbor") return [{ id: `minor${minorIndex}Harbor`, name: "Waymark Harbor", type: "port", role: "port", preferredBiome: "beach" }];
  if (role === "cave") return [{ id: `minor${minorIndex}Cave`, name: "Saltwind Cave", type: "cave", role: "landmark", nearMountains: true }];
  if (role === "shrine") return [{ id: `minor${minorIndex}Shrine`, name: "Tideglass Shrine", type: "shrine", role: "landmark" }];
  if (role === "resource") return [{ id: `minor${minorIndex}Resource`, name: "Oreleaf Cache", type: "resource", role: "landmark" }];
  return [{ id: `minor${minorIndex}Treasure`, name: "Hidden Cache", type: "treasure", role: "landmark" }];
}

function mountainThreshold(island: SemanticIslandRecord): number {
  if (island.id === "greenhaven") return 0.94;
  if (island.id === "coralreach") return 0.9;
  if (island.id === "frostmere") return 0.7;
  if (island.id === "highspire") return 0.68;
  return island.role === "cave" ? 0.84 : 0.92;
}

function mountainGrowThreshold(island: SemanticIslandRecord): number {
  if (island.id === "greenhaven") return 0.78;
  if (island.id === "coralreach") return 0.74;
  if (island.id === "frostmere") return 0.58;
  if (island.id === "highspire") return 0.56;
  return island.role === "cave" || island.role === "resource" ? 0.72 : 0.86;
}

function mountainGrowElevationFloor(island: SemanticIslandRecord): number {
  if (island.id === "greenhaven") return 0.58;
  if (island.id === "coralreach") return 0.56;
  if (island.id === "frostmere") return 0.32;
  if (island.id === "highspire") return 0.38;
  return island.major ? 0.48 : 0.42;
}

function mountainKindForCell(
  island: SemanticIslandRecord,
  i: number,
  biome: Uint8Array,
  elevation: Float32Array,
  coldness: Float32Array
): SemanticMountain["kind"] {
  if (!island.overlayRules.allowSnowMountains) return "mountain";
  const isColdPeak = biome[i] === SEMANTIC_BIOME.ICE && coldness[i] + elevation[i] > (island.id === "highspire" ? 0.9 : 0.78);
  return isColdPeak ? "snow_mountain" : "mountain";
}

function nearbyRidgeSupport(width: number, height: number, ridge: Float32Array, x: number, y: number, radius: number): number {
  let count = 0;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(width, height, xx, yy) || (xx === x && yy === y)) continue;
      if (Math.hypot(xx - x, yy - y) <= radius && ridge[index(width, xx, yy)] > 0.55) count += 1;
    }
  }
  return count;
}

function mountainPoiClearanceRadius(poi: SemanticPoi): number {
  if (poi.role === "settlement" || poi.role === "port") return 3;
  if (poi.role === "dungeon") return 1.5;
  return 2;
}

function forestBiomeAllowed(island: SemanticIslandRecord, biome: number): boolean {
  if (island.id === "frostmere") return biome === SEMANTIC_BIOME.ICE;
  if (island.id === "coralreach") return biome === SEMANTIC_BIOME.GRASS;
  if (island.id === "highspire") return biome === SEMANTIC_BIOME.GRASS || biome === SEMANTIC_BIOME.ICE;
  return biome === SEMANTIC_BIOME.GRASS;
}

function forestMoistureThreshold(island: SemanticIslandRecord): number {
  if (island.id === "frostmere") return 0.24;
  if (island.id === "coralreach") return 0.48;
  if (island.id === "greenhaven") return 0.34;
  return 0.38;
}

function preferredBiomeScore(preferred: "grass" | "sand" | "ice" | "beach", value: number): number {
  if (preferred === "grass") return value === SEMANTIC_BIOME.GRASS ? 0.48 : value === SEMANTIC_BIOME.BEACH ? -0.1 : 0.04;
  if (preferred === "sand") return value === SEMANTIC_BIOME.SAND || value === SEMANTIC_BIOME.BEACH ? 0.42 : value === SEMANTIC_BIOME.GRASS ? 0.12 : -0.05;
  if (preferred === "ice") return value === SEMANTIC_BIOME.ICE ? 0.48 : value === SEMANTIC_BIOME.GRASS ? 0.08 : -0.08;
  return value === SEMANTIC_BIOME.BEACH ? 0.6 : -0.2;
}

function edgeFacingScore(x: number, y: number, cx: number, cy: number): number {
  return Math.min(0.25, Math.hypot(x - cx, y - cy) * 0.015);
}

function centerScore(x: number, y: number, cx: number, cy: number, area: number): number {
  const distance = Math.hypot(x - cx, y - cy);
  return Math.max(0, 1 - distance / Math.max(5, Math.sqrt(area))) * 0.32;
}

function nearbyCount(width: number, height: number, map: Uint8Array, x: number, y: number, radius: number): number {
  let count = 0;
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (!inBounds(width, height, xx, yy)) continue;
      if (Math.hypot(xx - x, yy - y) <= radius && map[index(width, xx, yy)]) count += 1;
    }
  }
  return count;
}

function reservePoi(occupied: Set<string>, poi: SemanticVec, radius: number) {
  for (let y = poi.y - radius; y <= poi.y + radius; y += 1) {
    for (let x = poi.x - radius; x <= poi.x + radius; x += 1) occupied.add(`${x},${y}`);
  }
}

function poiFootprintCells(spec: RequiredPoiSpec, x: number, y: number): SemanticVec[] {
  return footprintCells(x, y, poiFootprintSizeForSpec(spec));
}

function semanticPoiFootprintCells(poi: SemanticPoi): SemanticVec[] {
  return footprintCells(poi.x, poi.y, poiFootprintSizeForPoi(poi));
}

function semanticPoiFootprintKeySet(pois: SemanticPoi[]): Set<string> {
  const keys = new Set<string>();
  for (const poi of pois) {
    for (const cell of semanticPoiFootprintCells(poi)) keys.add(posKey(cell));
  }
  return keys;
}

const PORT_FOOTPRINT_SIZE = 3;
const PORT_MIN_SHALLOW_WATER_TILES = 3;

function footprintCells(x: number, y: number, size: number): SemanticVec[] {
  const offset = Math.floor((size - 1) / 2);
  const minX = x - offset;
  const minY = y - offset;
  const cells: SemanticVec[] = [];
  for (let yy = minY; yy < minY + size; yy += 1) {
    for (let xx = minX; xx < minX + size; xx += 1) cells.push({ x: xx, y: yy });
  }
  return cells;
}

function poiFootprintSizeForSpec(spec: RequiredPoiSpec): number {
  if (spec.role === "port") return PORT_FOOTPRINT_SIZE;
  if (spec.role === "settlement" || spec.role === "final") return 3;
  return 2;
}

function poiFootprintSizeForPoi(poi: SemanticPoi): number {
  if (poi.role === "port") return PORT_FOOTPRINT_SIZE;
  if (poi.role === "settlement" || poi.role === "final") return 3;
  return 2;
}

function countPortFootprintWaterTiles(width: number, height: number, spec: RequiredPoiSpec, x: number, y: number, waterClass: Uint8Array): number {
  let waterTiles = 0;
  for (const cell of poiFootprintCells(spec, x, y)) {
    if (!inBounds(width, height, cell.x, cell.y)) continue;
    if (waterClass[index(width, cell.x, cell.y)] === SEMANTIC_WATER.SHALLOW) waterTiles += 1;
  }
  return waterTiles;
}

function reservePoiFootprint(occupied: Set<string>, spec: RequiredPoiSpec, x: number, y: number, padding: number) {
  const cells = poiFootprintCells(spec, x, y);
  for (const cell of cells) {
    for (let yy = cell.y - padding; yy <= cell.y + padding; yy += 1) {
      for (let xx = cell.x - padding; xx <= cell.x + padding; xx += 1) occupied.add(`${xx},${yy}`);
    }
  }
}

function reserveSemanticPoiFootprint(occupied: Set<string>, poi: SemanticPoi, padding: number) {
  for (const cell of semanticPoiFootprintCells(poi)) {
    for (let yy = cell.y - padding; yy <= cell.y + padding; yy += 1) {
      for (let xx = cell.x - padding; xx <= cell.x + padding; xx += 1) occupied.add(`${xx},${yy}`);
    }
  }
}

function poiReservePadding(spec: RequiredPoiSpec): number {
  return spec.role === "port" ? 1 : 2;
}

function tooCloseToOccupied(occupied: Set<string>, x: number, y: number, radius: number): boolean {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) if (occupied.has(`${xx},${yy}`)) return true;
  }
  return false;
}

function isRoadStepAllowed(
  width: number,
  height: number,
  landMask: Uint8Array,
  islandId: Int16Array,
  targetIslandNumber: number,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  riverMap: Uint8Array,
  distanceToWater: Int16Array,
  mountainMap: Uint8Array,
  current: SemanticVec,
  next: SemanticVec
): boolean {
  const ni = index(width, next.x, next.y);
  const ci = index(width, current.x, current.y);
  if (!landMask[ni] || waterClass[ni] !== SEMANTIC_WATER.NONE || lakeMap[ni] || mountainMap[ni]) return false;
  if (!riverMap[ni] && !riverMap[ci]) return true;
  const direction = { x: next.x - current.x, y: next.y - current.y };
  const crossingCell = riverMap[ni] ? next : current;
  const crossingIndex = index(width, crossingCell.x, crossingCell.y);
  if (islandId[crossingIndex] !== targetIslandNumber) return false;
  const orientation = riverCrossingOrientationAt(width, height, riverMap, crossingCell.x, crossingCell.y);
  if (!orientation) return false;
  if (!isPotentialRiverCrossing(width, height, landMask, islandId, targetIslandNumber, waterClass, lakeMap, riverMap, distanceToWater, mountainMap, crossingCell.x, crossingCell.y, orientation)) return false;
  return crossingMoveMatchesOrientation(direction, orientation);
}

function riverCrossingOrientationAt(width: number, height: number, riverMap: Uint8Array, x: number, y: number): "horizontal" | "vertical" | undefined {
  if (!inBounds(width, height, x, y) || !riverMap[index(width, x, y)]) return undefined;
  const north = isRiverCell(width, height, riverMap, x, y - 1);
  const east = isRiverCell(width, height, riverMap, x + 1, y);
  const south = isRiverCell(width, height, riverMap, x, y + 1);
  const west = isRiverCell(width, height, riverMap, x - 1, y);
  if (north && south && !east && !west) return "horizontal";
  if (east && west && !north && !south) return "vertical";
  return undefined;
}

function isPotentialRiverCrossing(
  width: number,
  height: number,
  landMask: Uint8Array,
  islandId: Int16Array,
  targetIslandNumber: number,
  waterClass: Uint8Array,
  lakeMap: Uint8Array,
  riverMap: Uint8Array,
  distanceToWater: Int16Array,
  mountainMap: Uint8Array,
  x: number,
  y: number,
  orientation: "horizontal" | "vertical"
): boolean {
  const i = index(width, x, y);
  if (!landMask[i] || waterClass[i] !== SEMANTIC_WATER.NONE || lakeMap[i] || !riverMap[i] || mountainMap[i]) return false;
  if (distanceToWater[i] <= 1) return false;
  if (hasDiagonalRiverNeighbor(width, height, riverMap, x, y)) return false;
  const sides = crossingContinuationCells(x, y, orientation);
  return sides.every((cell) => {
    if (!inBounds(width, height, cell.x, cell.y)) return false;
    const ci = index(width, cell.x, cell.y);
    return (
      islandId[ci] === targetIslandNumber &&
      landMask[ci] === 1 &&
      waterClass[ci] === SEMANTIC_WATER.NONE &&
      lakeMap[ci] === 0 &&
      riverMap[ci] === 0 &&
      mountainMap[ci] === 0
    );
  });
}

function hasRoadContinuationForCrossing(width: number, height: number, roadMap: Uint8Array, x: number, y: number, orientation: "horizontal" | "vertical"): boolean {
  return crossingContinuationCells(x, y, orientation).every((cell) => inBounds(width, height, cell.x, cell.y) && roadMap[index(width, cell.x, cell.y)] === 1);
}

function crossingContinuationCells(x: number, y: number, orientation: "horizontal" | "vertical"): SemanticVec[] {
  return orientation === "horizontal" ? [{ x: x - 1, y }, { x: x + 1, y }] : [{ x, y: y - 1 }, { x, y: y + 1 }];
}

function crossingMoveMatchesOrientation(direction: SemanticVec, orientation: "horizontal" | "vertical"): boolean {
  return orientation === "horizontal" ? direction.y === 0 && Math.abs(direction.x) === 1 : direction.x === 0 && Math.abs(direction.y) === 1;
}

function isRiverCell(width: number, height: number, riverMap: Uint8Array, x: number, y: number): boolean {
  return inBounds(width, height, x, y) && riverMap[index(width, x, y)] === 1;
}

function hasDiagonalRiverNeighbor(width: number, height: number, riverMap: Uint8Array, x: number, y: number): boolean {
  for (const diagonal of [
    { x: x - 1, y: y - 1 },
    { x: x + 1, y: y - 1 },
    { x: x + 1, y: y + 1 },
    { x: x - 1, y: y + 1 }
  ]) {
    if (isRiverCell(width, height, riverMap, diagonal.x, diagonal.y)) return true;
  }
  return false;
}

function roadCost(width: number, seed: string, biome: number, mountain: number, current: SemanticVec, next: SemanticVec, previous: SemanticVec | undefined, river: number): number {
  if (mountain) return Infinity;
  let base = Infinity;
  if (biome === SEMANTIC_BIOME.GRASS) base = 1;
  else if (biome === SEMANTIC_BIOME.BEACH) base = 1.35;
  else if (biome === SEMANTIC_BIOME.SAND) base = 1.55;
  else if (biome === SEMANTIC_BIOME.ICE) base = 2.0;
  if (!Number.isFinite(base)) return Infinity;
  const noise = hashNoise(`${seed}:semantic-road-cost`, next.x, next.y) * 0.34;
  const lowFrequencyNoise = fbm(`${seed}:semantic-road-meander`, next.x / 7, next.y / 7, 2) * 0.22;
  const direction = { x: next.x - current.x, y: next.y - current.y };
  const previousDirection = previous ? { x: current.x - previous.x, y: current.y - previous.y } : undefined;
  const turnPenalty = previousDirection && (previousDirection.x !== direction.x || previousDirection.y !== direction.y) ? 0.08 : 0;
  const riverPenalty = river ? 5.5 : 0;
  const islandColumnBias = Math.abs(((next.x * 17 + next.y * 7) % Math.max(5, Math.floor(width / 4))) - width / 8) * 0.002;
  return base + noise + lowFrequencyNoise + turnPenalty + islandColumnBias + riverPenalty;
}

function reconstructPath(cameFrom: Map<string, SemanticVec>, current: SemanticVec) {
  const path = [current];
  let key = posKey(current);
  while (cameFrom.has(key)) {
    current = cameFrom.get(key)!;
    path.push(current);
    key = posKey(current);
  }
  return path.reverse();
}

function cellsForIsland(islandId: Int16Array, id: number): number[] {
  const cells: number[] = [];
  for (let i = 0; i < islandId.length; i += 1) if (islandId[i] === id) cells.push(i);
  return cells;
}

function chooseBestCell(cells: number[], width: number, scoreFn: (i: number) => number) {
  let best: { x: number; y: number; i: number; score: number } | undefined;
  let bestScore = -Infinity;
  for (const i of cells) {
    const score = scoreFn(i);
    if (score > bestScore) {
      bestScore = score;
      best = { x: i % width, y: Math.floor(i / width), i, score };
    }
  }
  return Number.isFinite(bestScore) ? best : undefined;
}

function hasAdjacentWater(width: number, height: number, waterClass: Uint8Array, x: number, y: number, value: number): boolean {
  for (const next of cardinalNeighbors(x, y)) {
    if (!inBounds(width, height, next.x, next.y)) continue;
    if (waterClass[index(width, next.x, next.y)] === value) return true;
  }
  return false;
}

function uniqueBy<T>(values: T[], keyFn: (value: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const value of values) {
    const key = keyFn(value);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function countValues(array: Uint8Array, value: number): number {
  let count = 0;
  for (const item of array) if (item === value) count += 1;
  return count;
}

function combineBlockMaps(...maps: Uint8Array[]): Uint8Array {
  const combined = new Uint8Array(maps[0]?.length ?? 0);
  for (const map of maps) {
    for (let i = 0; i < map.length; i += 1) if (map[i]) combined[i] = 1;
  }
  return combined;
}

function forEachCell(width: number, height: number, fn: (x: number, y: number, i: number) => void) {
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) fn(x, y, index(width, x, y));
}

function index(width: number, x: number, y: number): number {
  return y * width + x;
}

function inBounds(width: number, height: number, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function cardinalNeighbors(x: number, y: number): SemanticVec[] {
  return [
    { x, y: y - 1 },
    { x: x + 1, y },
    { x, y: y + 1 },
    { x: x - 1, y }
  ];
}

function posKey(pos: SemanticVec): string {
  return `${pos.x},${pos.y}`;
}

function squaredDistance(a: SemanticVec, b: SemanticVec): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
