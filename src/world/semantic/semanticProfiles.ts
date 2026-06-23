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
      zone: { x: 0.08, y: 0.31, width: 0.26, height: 0.34 },
      radius: { x: 22, y: 19 },
      sizeBias: 1,
      dryBias: -0.14,
      coldBias: -0.08,
      mountainBias: -0.06,
      forestBias: 0.26,
      overlayRules: {
        mountainCap: 46,
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
        { id: "greenhavenShrine", name: "Rootspring Shrine", type: "shrine", role: "dungeon", nearForest: true },
        { id: "oldwoodRuins", name: "Oldwood Ruins", type: "ruins", role: "dungeon", nearForest: true },
        { id: "meadowwatch", name: "Meadowwatch Tower", type: "tower", role: "landmark", preferredBiome: "grass" }
      ]
    },
    {
      id: "coralreach",
      name: "Coralreach",
      role: "coastal_trade",
      theme: "sand_coast",
      zone: { x: 0.37, y: 0.59, width: 0.24, height: 0.28 },
      radius: { x: 24, y: 17 },
      sizeBias: 1,
      dryBias: 0.36,
      coldBias: -0.12,
      mountainBias: 0.04,
      forestBias: -0.04,
      overlayRules: {
        mountainCap: 50,
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
        { id: "sunkenArchCave", name: "Sunken Arch Cave", type: "cave", role: "dungeon", preferredBiome: "sand" },
        { id: "mirageTower", name: "Mirage Tower", type: "tower", role: "dungeon", preferredBiome: "sand" },
        { id: "coralreachWreck", name: "Moonreef Wreck", type: "treasure", role: "landmark" }
      ]
    },
    {
      id: "frostmere",
      name: "Frostveil",
      role: "snow_shrine",
      theme: "ice",
      zone: { x: 0.08, y: 0.05, width: 0.29, height: 0.25 },
      radius: { x: 23, y: 16 },
      sizeBias: 0.96,
      dryBias: -0.08,
      coldBias: 0.64,
      mountainBias: 0.18,
      forestBias: 0.04,
      overlayRules: {
        mountainCap: 175,
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
        { id: "elderleaf", name: "Frostveil Haven", type: "village", role: "settlement", preferredBiome: "ice" },
        { id: "frostmereHarbor", name: "Frostveil Harbor", type: "port", role: "port", preferredBiome: "beach" },
        { id: "skyglassTower", name: "Skyglass Tower", type: "tower", role: "dungeon", nearMountains: true },
        { id: "frostCave", name: "Frostbite Cave", type: "cave", role: "dungeon", preferredBiome: "ice", nearMountains: true },
        { id: "frostmereShrine", name: "Icebound Shrine", type: "shrine", role: "dungeon", preferredBiome: "ice" },
        { id: "iceboundKeep", name: "Icebound Keep", type: "ruins", role: "landmark", preferredBiome: "ice", nearMountains: true }
      ]
    },
    {
      id: "highspire",
      name: "Highspire",
      role: "mountain_ruins",
      theme: "mixed_highland",
      zone: { x: 0.61, y: 0.08, width: 0.27, height: 0.31 },
      radius: { x: 24, y: 22 },
      sizeBias: 1.06,
      dryBias: 0.04,
      coldBias: 0.22,
      mountainBias: 0.36,
      forestBias: 0.02,
      overlayRules: {
        mountainCap: 245,
        allowSnowMountains: true,
        mountainSpacing: 4,
        forestDensity: 0.34,
        forestPoiClearance: 2,
        forestRoadClearance: 1
      },
      road: ROAD_PROFILES.highspireAlpine,
      requiredHarbors: 1,
      allowRoads: true,
      allowRivers: true,
      requiredPois: [
        { id: "sunbarrow", name: "Highspire Camp", type: "town", role: "settlement", preferredBiome: "grass" },
        { id: "highspireHarbor", name: "Highspire Harbor", type: "port", role: "port", preferredBiome: "beach" },
        { id: "stonefallKeep", name: "Stonefall Keep", type: "ruins", role: "dungeon", nearMountains: true },
        { id: "cloudbreakMine", name: "Cloudbreak Mine", type: "cave", role: "dungeon", nearMountains: true },
        { id: "skyreachTower", name: "Skyreach Tower", type: "tower", role: "dungeon", nearMountains: true },
        { id: "starfallGate", name: "Starfall Gate", type: "gate", role: "gate", nearMountains: true }
      ]
    },
    {
      id: "ashfall",
      name: "Ashfall",
      role: "volcanic_ash",
      theme: "ashfall",
      zone: { x: 0.69, y: 0.58, width: 0.24, height: 0.31 },
      radius: { x: 22, y: 20 },
      sizeBias: 0.98,
      dryBias: 0.64,
      coldBias: -0.2,
      mountainBias: 0.34,
      forestBias: -0.5,
      overlayRules: {
        mountainCap: 205,
        allowSnowMountains: false,
        mountainSpacing: 5,
        forestDensity: 0,
        forestPoiClearance: 3,
        forestRoadClearance: 2
      },
      road: ROAD_PROFILES.ashfallAsh,
      requiredHarbors: 1,
      allowRoads: true,
      allowRivers: false,
      requiredPois: [
        { id: "cinderhold", name: "Cinderhold", type: "town", role: "settlement", preferredBiome: "sand" },
        { id: "ashfallHarbor", name: "Ashfall Harbor", type: "port", role: "port", preferredBiome: "beach" },
        { id: "ashenKeep", name: "Ashen Keep", type: "ruins", role: "dungeon", preferredBiome: "sand", nearMountains: true },
        { id: "emberVault", name: "Ember Vault", type: "cave", role: "dungeon", preferredBiome: "sand", nearMountains: true },
        { id: "volcanicFortress", name: "Volcanic Fortress", type: "tower", role: "dungeon", preferredBiome: "sand", nearMountains: true },
        { id: "obsidianGate", name: "Obsidian Gate", type: "gate", role: "gate", preferredBiome: "sand", nearMountains: true },
        { id: "eclipseSpire", name: "Eclipse Spire", type: "final", role: "final", preferredBiome: "sand", nearMountains: true }
      ]
    }
  ]
};
