import { generateSemanticWorld } from "../../src/world/semantic/semanticGenerator.ts";
import { CAMPAIGN_WORLD_PROFILE } from "../../src/world/semantic/semanticProfiles.ts";
import { SEMANTIC_BIOME, SEMANTIC_WATER } from "../../src/world/semantic/semanticTypes.ts";
import { DEFAULT_WORLD_HEIGHT, DEFAULT_WORLD_WIDTH, generateWorld } from "../../src/world/worldGenerator.ts";

export const BIOME = SEMANTIC_BIOME;
export const WATER = SEMANTIC_WATER;
export { DEFAULT_WORLD_HEIGHT, DEFAULT_WORLD_WIDTH };

export const BIOME_NAMES = {
  [BIOME.WATER]: "water",
  [BIOME.GRASS]: "grassland",
  [BIOME.SAND]: "sand",
  [BIOME.ICE]: "ice",
  [BIOME.BEACH]: "beach"
};

export function generateWorldLab(options = {}) {
  const seed = options.seed ?? "worldgen-lab";
  const width = options.width ?? DEFAULT_WORLD_WIDTH;
  const height = options.height ?? DEFAULT_WORLD_HEIGHT;
  const runtimeWorld = generateWorld({ seed, width, height, maxAttempts: 1 });
  return adaptSemanticForLab(runtimeWorld.semantic ?? generateSemanticWorld({ seed, width, height, profile: CAMPAIGN_WORLD_PROFILE }), runtimeWorld);
}

export function serializeWorld(world) {
  const row = (array, mapper = (value) => value) => {
    const rows = [];
    for (let y = 0; y < world.height; y += 1) {
      const values = [];
      for (let x = 0; x < world.width; x += 1) values.push(mapper(array[y * world.width + x]));
      rows.push(values);
    }
    return rows;
  };

  return {
    seed: world.seed,
    width: world.width,
    height: world.height,
    profile: { id: world.profile.id, name: world.profile.name, startingIslandId: world.profile.startingIslandId },
    islandRecords: world.islandRecords.map(({ id, name, order, area, role, theme, major, bounds, center }) => ({ id, name, order, area, role, theme, major, bounds, center })),
    stats: world.stats,
    validation: world.validation,
    poiList: world.poiList,
    harbors: world.harbors,
    boatRoutes: world.boatRoutes,
    mountains: world.mountains,
    mountainRanges: world.mountainRanges,
    mountainDebug: world.mountainDebug,
    lakes: world.lakes.map((lake) => ({ x: lake.x, y: lake.y, radius: lake.radius })),
    rivers: world.rivers.map((river) => ({ id: river.id, islandId: river.islandId, source: river.source, mouth: river.mouth, length: river.path.length })),
    bridgeCandidates: world.bridgeCandidates,
    objectOverlays: world.objectOverlays ?? [],
    roadGraph: {
      edges: world.roadGraph.edges.map((edge) => ({ from: edge.from, to: edge.to, connected: edge.connected, length: edge.length }))
    },
    layers: {
      landMask: row(world.layers.landMask),
      islandId: row(world.layers.islandId),
      waterClass: row(world.layers.waterClass),
      biome: row(world.layers.biome, (value) => BIOME_NAMES[value] ?? String(value)),
      terrainVariant: row(world.layers.terrainVariant),
      terrainPatchStrength: row(world.layers.terrainPatchStrength, round),
      distanceToLand: row(world.layers.distanceToLand),
      distanceToWater: row(world.layers.distanceToWater),
      elevation: row(world.layers.elevation, round),
      moisture: row(world.layers.moisture, round),
      coldness: row(world.layers.coldness, round),
      ridge: row(world.layers.ridge, round),
      mountainCandidateScore: row(world.layers.mountainCandidateScore, round),
      mountainMap: row(world.layers.mountainMap),
      lakeMap: row(world.layers.lakeMap),
      riverMap: row(world.layers.riverMap),
      riverCrossingMap: row(world.layers.riverCrossingMap),
      reservedBoatRouteMap: row(world.layers.reservedBoatRouteMap),
      forestMap: row(world.layers.forestMap),
      roadMap: row(world.layers.roadMap),
      overlayCollisionPolicy: row(world.layers.overlayCollisionPolicy),
      walkability: row(world.layers.walkability)
    }
  };
}

function adaptSemanticForLab(world, runtimeWorld) {
  return {
    ...world,
    objectOverlays: runtimeWorld?.objectOverlays ?? [],
    islandRecords: world.islands,
    validation: {
      ok: world.validation.ok,
      errors: world.validation.errors,
      warnings: world.validation.warnings
    },
    stats: {
      ...world.stats,
      cells: world.width * world.height,
      poiCount: world.poiList.length,
      harborCount: world.harbors.length
    }
  };
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
