import type { WorldProfile } from "./semanticTypes.ts";
import { ROAD_PROFILES } from "./semanticRoadProfiles.ts";

export const CAMPAIGN_WORLD_PROFILE: WorldProfile = {
  id: "crystal_oath_campaign_v1",
  name: "Crystal Oath Campaign Archipelago",
  startingIslandId: "greenhaven",
  minorIslandCount: { min: 3, max: 6 },
  minorRoles: ["harbor", "treasure", "shrine", "cave", "resource"],
  majorIslands: [
    {
      id: "greenhaven",
      name: "Greenhaven",
      role: "starter",
      theme: "grassland",
      zone: { x: 0.12, y: 0.24, width: 0.28, height: 0.44 },
      radius: { x: 13, y: 11 },
      sizeBias: 1,
      dryBias: -0.14,
      coldBias: -0.08,
      mountainBias: -0.06,
      forestBias: 0.26,
      overlayRules: {
        mountainCap: 20,
        allowSnowMountains: false,
        mountainSpacing: 8,
        forestDensity: 0.62,
        forestPoiClearance: 3,
        forestRoadClearance: 1
      },
      road: ROAD_PROFILES.greenhavenDirt,
      requiredHarbors: 1,
      allowRoads: true,
      allowRivers: true,
      requiredPois: [
        { id: "dawnford", name: "Greenhaven", type: "town", role: "settlement", preferredBiome: "grass" },
        { id: "greenhavenHarbor", name: "Greenhaven Harbor", type: "port", role: "port", preferredBiome: "beach" },
        { id: "mossCave", name: "Mossy Cave", type: "cave", role: "dungeon", nearMountains: true },
        { id: "greenhavenShrine", name: "Rootspring Shrine", type: "shrine", role: "landmark", nearForest: true }
      ]
    },
    {
      id: "coralreach",
      name: "Coralreach",
      role: "coastal_trade",
      theme: "sand_coast",
      zone: { x: 0.44, y: 0.48, width: 0.26, height: 0.34 },
      radius: { x: 14, y: 10 },
      sizeBias: 0.94,
      dryBias: 0.24,
      coldBias: -0.12,
      mountainBias: 0.04,
      forestBias: -0.04,
      overlayRules: {
        mountainCap: 24,
        allowSnowMountains: false,
        mountainSpacing: 7,
        forestDensity: 0.22,
        forestPoiClearance: 2,
        forestRoadClearance: 1
      },
      road: ROAD_PROFILES.coralreachSand,
      requiredHarbors: 1,
      allowRoads: true,
      allowRivers: true,
      requiredPois: [
        { id: "brinewick", name: "Coralreach", type: "town", role: "settlement", preferredBiome: "sand" },
        { id: "coralreachHarbor", name: "Coralreach Harbor", type: "port", role: "port", preferredBiome: "beach" },
        { id: "tideShrine", name: "Coralreach Ruins", type: "shrine", role: "dungeon", preferredBiome: "sand" },
        { id: "coralreachWreck", name: "Moonreef Wreck", type: "treasure", role: "landmark" }
      ]
    },
    {
      id: "frostmere",
      name: "Frostmere",
      role: "snow_shrine",
      theme: "ice",
      zone: { x: 0.10, y: 0.06, width: 0.34, height: 0.24 },
      radius: { x: 13, y: 9 },
      sizeBias: 0.88,
      dryBias: -0.04,
      coldBias: 0.46,
      mountainBias: 0.18,
      forestBias: 0.04,
      overlayRules: {
        mountainCap: 96,
        allowSnowMountains: true,
        mountainSpacing: 4,
        forestDensity: 0.3,
        forestPoiClearance: 2,
        forestRoadClearance: 1
      },
      road: ROAD_PROFILES.frostmereSnow,
      requiredHarbors: 1,
      allowRoads: true,
      allowRivers: true,
      requiredPois: [
        { id: "elderleaf", name: "Frostmere Haven", type: "village", role: "settlement", preferredBiome: "ice" },
        { id: "frostmereHarbor", name: "Frostmere Harbor", type: "port", role: "port", preferredBiome: "beach" },
        { id: "skyglassTower", name: "Skyglass Tower", type: "tower", role: "dungeon", nearMountains: true },
        { id: "frostmereShrine", name: "Icebound Shrine", type: "shrine", role: "landmark", preferredBiome: "ice" }
      ]
    },
    {
      id: "highspire",
      name: "Highspire",
      role: "mountain_ruins",
      theme: "mixed_highland",
      zone: { x: 0.64, y: 0.14, width: 0.26, height: 0.48 },
      radius: { x: 14, y: 13 },
      sizeBias: 1.06,
      dryBias: 0.04,
      coldBias: 0.14,
      mountainBias: 0.36,
      forestBias: 0.02,
      overlayRules: {
        mountainCap: 150,
        allowSnowMountains: true,
        mountainSpacing: 4,
        forestDensity: 0.34,
        forestPoiClearance: 2,
        forestRoadClearance: 1
      },
      road: ROAD_PROFILES.highspireAsh,
      requiredHarbors: 1,
      allowRoads: true,
      allowRivers: true,
      requiredPois: [
        { id: "sunbarrow", name: "Highspire Camp", type: "town", role: "settlement", preferredBiome: "grass" },
        { id: "highspireHarbor", name: "Highspire Harbor", type: "port", role: "port", preferredBiome: "beach" },
        { id: "ashenKeep", name: "Stonefall Keep", type: "ruins", role: "dungeon", nearMountains: true },
        { id: "starfallGate", name: "Starfall Gate", type: "gate", role: "gate", nearMountains: true },
        { id: "eclipseSpire", name: "Eclipse Spire", type: "final", role: "final", nearMountains: true }
      ]
    }
  ]
};
