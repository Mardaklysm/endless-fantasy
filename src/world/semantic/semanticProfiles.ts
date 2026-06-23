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
      identity: {
        summary: "Classic lush starter grassland with friendly roads, forest pockets, rivers, and gentle adventure POIs.",
        biomeTargets: {
          primary: ["grassland", "forest", "river"],
          secondary: ["beach", "hills", "small mountains"],
          avoid: ["ash", "volcanic", "heavy snow"]
        },
        contentTargets: {
          settlementCount: 1,
          harborCount: 1,
          majorDungeonCount: 3,
          minorLandmarkRange: { min: 2, max: 4 }
        },
        preferredAssetTags: ["starter-village", "harbor", "grass-cave", "forest-shrine", "old-ruin"]
      },
      zone: { x: 0.12, y: 0.24, width: 0.28, height: 0.44 },
      radius: { x: 23, y: 19 },
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
        { id: "greenhavenShrine", name: "Rootspring Shrine", type: "shrine", role: "dungeon", nearForest: true },
        { id: "oldwoodRuins", name: "Oldwood Ruins", type: "ruins", role: "dungeon", nearForest: true }
      ]
    },
    {
      id: "coralreach",
      name: "Coralreach",
      role: "coastal_trade",
      theme: "sand_coast",
      identity: {
        summary: "Sun-bleached tropical coast with sandy trails, ruins, wrecks, docks, palms, and lagoon-adventure POIs.",
        biomeTargets: {
          primary: ["sand", "beach", "coastal shallows"],
          secondary: ["tropical grass", "palms", "ruins"],
          avoid: ["snow", "dense starter grass dominance", "volcanic ash"]
        },
        contentTargets: {
          settlementCount: 1,
          harborCount: 1,
          majorDungeonCount: 3,
          minorLandmarkRange: { min: 2, max: 5 }
        },
        preferredAssetTags: ["coastal-town", "harbor", "sandy-ruin", "temple", "shipwreck"]
      },
      zone: { x: 0.44, y: 0.48, width: 0.26, height: 0.34 },
      radius: { x: 24, y: 17 },
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
        { id: "sunkenTemple", name: "Sunken Temple", type: "ruins", role: "dungeon", preferredBiome: "sand" },
        { id: "saltboneCave", name: "Saltbone Cave", type: "cave", role: "dungeon", preferredBiome: "sand", nearMountains: true },
        { id: "coralreachWreck", name: "Moonreef Wreck", type: "treasure", role: "landmark" }
      ]
    },
    {
      id: "frostmere",
      name: "Frostmere",
      role: "snow_shrine",
      theme: "ice",
      identity: {
        summary: "Frostveil identity: a mostly snow and ice island with rocky snow mountains, sparse pines, and frozen ruins.",
        biomeTargets: {
          primary: ["snow", "ice", "rocky snow"],
          secondary: ["pine pockets", "frozen water", "coastal thaw"],
          avoid: ["large grass interiors", "sand interiors", "volcanic ash"]
        },
        contentTargets: {
          settlementCount: 1,
          harborCount: 1,
          majorDungeonCount: 3,
          minorLandmarkRange: { min: 1, max: 4 }
        },
        preferredAssetTags: ["snow-village", "snow-harbor", "ice-cave", "frozen-ruin", "snow-tower"]
      },
      zone: { x: 0.10, y: 0.06, width: 0.34, height: 0.24 },
      radius: { x: 23, y: 16 },
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
        { id: "frostbiteCave", name: "Frostbite Cave", type: "cave", role: "dungeon", preferredBiome: "ice", nearMountains: true },
        { id: "frozenReliquary", name: "Frozen Reliquary", type: "ruins", role: "dungeon", preferredBiome: "ice" },
        { id: "frostmereShrine", name: "Icebound Shrine", type: "shrine", role: "landmark", preferredBiome: "ice" }
      ]
    },
    {
      id: "highspire",
      name: "Highspire",
      role: "mountain_ruins",
      theme: "mixed_highland",
      identity: {
        summary: "Rugged alpine highland with grass, rock, mountain ridges, snow at elevation, and ancient peak landmarks.",
        biomeTargets: {
          primary: ["highland grass", "rock", "mountains"],
          secondary: ["snowcaps", "alpine forest", "ruins"],
          avoid: ["pure snow island identity", "friendly lowland dominance", "dead volcanic ash"]
        },
        contentTargets: {
          settlementCount: 1,
          harborCount: 1,
          majorDungeonCount: 3,
          minorLandmarkRange: { min: 2, max: 4 }
        },
        preferredAssetTags: ["alpine-camp", "mountain-harbor", "keep", "mine", "tower", "sealed-gate"]
      },
      zone: { x: 0.64, y: 0.14, width: 0.26, height: 0.48 },
      radius: { x: 24, y: 23 },
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
        { id: "highspireMine", name: "Highspire Mine", type: "cave", role: "dungeon", nearMountains: true },
        { id: "windscarTower", name: "Windscar Tower", type: "tower", role: "dungeon", nearMountains: true },
        { id: "starfallGate", name: "Starfall Gate", type: "gate", role: "gate", nearMountains: true },
        { id: "eclipseSpire", name: "Eclipse Spire", type: "final", role: "final", nearMountains: true }
      ]
    },
    {
      id: "ashfall",
      name: "Ashfall",
      role: "mountain_ruins",
      theme: "ashfall",
      identity: {
        summary: "Dead volcanic ash island with black gravel, scorched ground, basalt ridges, lava-lit ruins, and hostile fortress POIs.",
        biomeTargets: {
          primary: ["ash", "basalt", "volcanic rock"],
          secondary: ["dead coast", "lava-lit ruins", "black gravel"],
          avoid: ["normal grass", "snow", "friendly meadow"]
        },
        contentTargets: {
          settlementCount: 1,
          harborCount: 1,
          majorDungeonCount: 3,
          minorLandmarkRange: { min: 1, max: 3 }
        },
        preferredAssetTags: ["deadland-village", "volcanic-fortress", "dark-castle", "demon-altar", "lava-gate"]
      },
      zone: { x: 0.70, y: 0.66, width: 0.22, height: 0.27 },
      radius: { x: 22, y: 18 },
      sizeBias: 1,
      dryBias: 0.62,
      coldBias: -0.3,
      mountainBias: 0.34,
      forestBias: -0.3,
      overlayRules: {
        mountainCap: 120,
        allowSnowMountains: false,
        mountainSpacing: 5,
        forestDensity: 0.04,
        forestPoiClearance: 2,
        forestRoadClearance: 1
      },
      road: ROAD_PROFILES.highspireAsh,
      requiredHarbors: 1,
      allowRoads: true,
      allowRivers: false,
      requiredPois: [
        { id: "ashfallOutpost", name: "Ashfall Outpost", type: "town", role: "settlement", preferredBiome: "sand" },
        { id: "ashfallHarbor", name: "Ashfall Harbor", type: "port", role: "port", preferredBiome: "beach" },
        { id: "cinderVault", name: "Cinder Vault", type: "ruins", role: "dungeon", preferredBiome: "sand", nearMountains: true },
        { id: "obsidianMine", name: "Obsidian Mine", type: "cave", role: "dungeon", preferredBiome: "sand", nearMountains: true },
        { id: "demonAltar", name: "Demon Altar", type: "shrine", role: "dungeon", preferredBiome: "sand" },
        { id: "emberGate", name: "Ember Gate", type: "gate", role: "gate", nearMountains: true }
      ]
    }
  ]
};
