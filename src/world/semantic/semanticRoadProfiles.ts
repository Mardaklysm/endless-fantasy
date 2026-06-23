import type { IslandRoadProfile, IslandRole, IslandTheme } from "./semanticTypes.ts";

export const DEFAULT_ROAD_PROFILE: IslandRoadProfile = {
  profileId: "classic-dirt",
  generation: {
    mainRoutePriority: "harbor-to-settlement",
    optionalPoiBranchLimit: 1,
    loopChance: 0.12,
    branchChance: 0.82,
    routeWander: 1,
    straightRunSoftening: 1,
    junctionPatchScale: 1,
    endpointApronScale: 1
  },
  visual: {
    centerColor: "#d6a967",
    edgeColor: "#9f7843",
    lightNoiseColor: "#f0c783",
    darkNoiseColor: "#776754",
    terrainFleckColor: "#5c8b40",
    alpha: 0.96,
    widthScale: 1,
    edgeBreakup: 0.62,
    centerContinuity: 1,
    pebbleNoise: 0.035,
    endpointPatchStyle: "dirt-apron",
    bridgeApproachStyle: "dirt-taper"
  }
};

export const ROAD_PROFILES = {
  greenhavenDirt: DEFAULT_ROAD_PROFILE,
  coralreachSand: {
    profileId: "sun-bleached-sandy-trail",
    generation: {
      mainRoutePriority: "harbor-to-settlement",
      optionalPoiBranchLimit: 1,
      loopChance: 0.08,
      branchChance: 0.74,
      routeWander: 0.92,
      straightRunSoftening: 0.9,
      junctionPatchScale: 0.9,
      endpointApronScale: 1.12
    },
    visual: {
      centerColor: "#dec27e",
      edgeColor: "#b99255",
      lightNoiseColor: "#f2d99a",
      darkNoiseColor: "#9f7d4d",
      terrainFleckColor: "#c2ad6e",
      alpha: 0.9,
      widthScale: 0.96,
      edgeBreakup: 0.58,
      centerContinuity: 1.04,
      pebbleNoise: 0.048,
      endpointPatchStyle: "sandy-landing",
      bridgeApproachStyle: "sand-taper"
    }
  },
  frostmereSnow: {
    profileId: "trampled-snow-slush",
    generation: {
      mainRoutePriority: "harbor-to-settlement",
      optionalPoiBranchLimit: 1,
      loopChance: 0.04,
      branchChance: 0.58,
      routeWander: 0.82,
      straightRunSoftening: 0.78,
      junctionPatchScale: 0.82,
      endpointApronScale: 0.92
    },
    visual: {
      centerColor: "#b9c9cc",
      edgeColor: "#7f999f",
      lightNoiseColor: "#e7f2f1",
      darkNoiseColor: "#66777d",
      terrainFleckColor: "#d8e6e8",
      alpha: 0.88,
      widthScale: 0.92,
      edgeBreakup: 0.7,
      centerContinuity: 0.98,
      pebbleNoise: 0.028,
      endpointPatchStyle: "snow-pack",
      bridgeApproachStyle: "snow-taper"
    }
  },
  highspireAsh: {
    profileId: "volcanic-ash-gravel",
    generation: {
      mainRoutePriority: "harbor-to-settlement",
      optionalPoiBranchLimit: 1,
      loopChance: 0.05,
      branchChance: 0.6,
      routeWander: 0.76,
      straightRunSoftening: 0.72,
      junctionPatchScale: 0.82,
      endpointApronScale: 0.86
    },
    visual: {
      centerColor: "#5f5b53",
      edgeColor: "#3f3b36",
      lightNoiseColor: "#827667",
      darkNoiseColor: "#2c2b2a",
      terrainFleckColor: "#7b4b38",
      alpha: 0.9,
      widthScale: 0.94,
      edgeBreakup: 0.66,
      centerContinuity: 1,
      pebbleNoise: 0.052,
      endpointPatchStyle: "ash-worn",
      bridgeApproachStyle: "ash-taper"
    }
  },
  minorCoastal: {
    profileId: "minor-coastal-footpath",
    generation: {
      mainRoutePriority: "poi-network",
      optionalPoiBranchLimit: 0,
      loopChance: 0,
      branchChance: 0.35,
      routeWander: 0.72,
      straightRunSoftening: 0.72,
      junctionPatchScale: 0.72,
      endpointApronScale: 0.82
    },
    visual: {
      centerColor: "#d9bd7e",
      edgeColor: "#ae8b55",
      lightNoiseColor: "#f1d69b",
      darkNoiseColor: "#88704d",
      terrainFleckColor: "#bca265",
      alpha: 0.86,
      widthScale: 0.86,
      edgeBreakup: 0.72,
      centerContinuity: 0.94,
      pebbleNoise: 0.044,
      endpointPatchStyle: "sandy-landing",
      bridgeApproachStyle: "sand-taper"
    }
  },
  minorGravel: {
    profileId: "minor-gravel-track",
    generation: {
      mainRoutePriority: "poi-network",
      optionalPoiBranchLimit: 0,
      loopChance: 0,
      branchChance: 0.32,
      routeWander: 0.68,
      straightRunSoftening: 0.7,
      junctionPatchScale: 0.68,
      endpointApronScale: 0.76
    },
    visual: {
      centerColor: "#a99468",
      edgeColor: "#74664e",
      lightNoiseColor: "#c5b485",
      darkNoiseColor: "#514b43",
      terrainFleckColor: "#66764c",
      alpha: 0.86,
      widthScale: 0.84,
      edgeBreakup: 0.72,
      centerContinuity: 0.92,
      pebbleNoise: 0.05,
      endpointPatchStyle: "gravel",
      bridgeApproachStyle: "gravel-taper"
    }
  }
} as const satisfies Record<string, IslandRoadProfile>;

export function roadProfileForMinorIsland(role: IslandRole, theme: IslandTheme): IslandRoadProfile {
  if (role === "harbor" || role === "treasure" || theme === "sand_coast") return ROAD_PROFILES.minorCoastal;
  return ROAD_PROFILES.minorGravel;
}
