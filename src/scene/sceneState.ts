import { WORLD_H, WORLD_W } from "../app/config";
import type { CharacterState, DungeonDef, LocationDef } from "../data/gameDataTypes";
import { perfNow, perfRecordWorldgen } from "../debug/perf";
import { isExploreModeValue, type ExploreMode, type Mode } from "./sceneTypes";
import { generateDungeonFloors } from "../world/dungeonGenerator";
import { createWorldSeed, generateWorld } from "../world/worldGenerator";
import type { CrystalOathSceneContext } from "./sceneContext";
import { loadStoredGameSettings, persistGameSettings, settingsForNewGame } from "../systems/settings/gameSettings";

const STARTING_POI_ID = "starting_grassland_village";

export function buildWorldFromSeed(this: CrystalOathSceneContext, seed: string) {
  const worldgenStartMs = perfNow();
  this.generatedWorld = generateWorld({ seed, width: WORLD_W, height: WORLD_H });
  perfRecordWorldgen(this, perfNow() - worldgenStartMs);
  this.worldSeed = this.generatedWorld.seed;
  this.dungeonCache = undefined;
  this.boatTravel = undefined;
  if (this.worldControlLockReason === "boatTravel") this.worldControlLockReason = undefined;
  this.world = this.generatedWorld.tiles;
  this.roadVisualsByKey = new Map(this.generatedWorld.roadVisuals.map((visual) => [`${visual.x},${visual.y}`, visual]));
  this.worldMinimapCacheSeed = "";
  this.worldMinimapCacheWidth = 0;
  this.worldMinimapCacheHeight = 0;
  this.rebuildWorldTerrainCache();
  this.rebuildWorldRouteOverlayCache();
  console.info(`Crystal Oath world seed: ${this.worldSeed}`);
}

export function newGame(this: CrystalOathSceneContext) {
  this.party = [
    this.makeCharacter("fighter", "Arlen", "Vanguard", 42, 9, 7, 5, 4, "trainingBlade", "travelCloth", []),
    this.makeCharacter("priest", "Mira", "White Sage", 30, 4, 4, 6, 7, "willowRod", "travelCloth", ["mend", "ward"]),
    this.makeCharacter("mage", "Kael", "Ember Adept", 26, 3, 3, 7, 5, "willowRod", "travelCloth", ["spark", "ember"])
  ];
  this.inventory = { potion: 5, antidote: 2, tent: 1, phoenixAsh: 0, etherleaf: 0, smokeBomb: 0, charteredCompass: 0 };
  this.gearBag = { trainingBlade: 1, willowRod: 2, travelCloth: 3 };
  this.gold = 80;
  this.buildWorldFromSeed(createWorldSeed());
  this.setWorldTimeTicks(0);
  this.worldPos = { ...(this.generatedWorld?.startPosition ?? { x: 10, y: 22 }) };
  this.dungeonPos = { x: 1, y: 1 };
  this.currentDungeon = "mossCave";
  this.currentIslandId = "greenhaven";
  this.dungeonFloor = 0;
  this.encounterCounter = 10;
  this.flags = { ...this.defaultFlags(), introSeen: true };
  this.openedChests = new Set();
  this.discoveredPois = new Set();
  this.visitedLocationIds = new Set();
  this.puzzleFlags = new Set();
  this.defeatedBosses = new Set();
  this.clearedDungeons = new Set();
  this.settings = settingsForNewGame(loadStoredGameSettings() ?? this.settings);
  persistGameSettings(this.settings);
  this.clearHeldMovement();
  this.markLocationVisited("dawnford");
  this.enterPoiVisit(STARTING_POI_ID, { mode: "world", locationId: "dawnford" });
  this.audio.setMode("world");
  this.dialogue = {
    lines: [
      "Harbor Master: Welcome to Greenhaven, last warm light before the archipelago opens wide.",
      "Mira: Root, Flame, Tide, and Gale are scattered across these islands now.",
      "Kael: A living map, a cursed sea, and a suspicious number of caves. Excellent.",
      "Arlen: We clear Mossy Cave, earn passage, then sail for Coralreach."
    ],
    index: 0,
    done: () => {
      this.enterPoiVisit(STARTING_POI_ID, { mode: "world", locationId: "dawnford" });
      this.saveGame();
    }
  };
  this.previousMode = "poi";
  this.mode = "dialogue";
  this.markDirty();
}

export function makeCharacter(this: CrystalOathSceneContext, id: CharacterState["id"],
  name: string,
  role: string,
  maxHp: number,
  attack: number,
  defense: number,
  speed: number,
  luck: number,
  weapon: string,
  armor: string,
  spells: string[]): CharacterState {
  const character: CharacterState = {
    id,
    name,
    role,
    level: 1,
    xp: 0,
    nextXp: 42,
    hp: maxHp,
    maxHp,
    mp: startingMaxMp(id, 1),
    maxMp: startingMaxMp(id, 1),
    baseAttack: attack,
    baseDefense: defense,
    speed,
    luck,
    weapon,
    armor,
    statuses: {},
    charges: {
      "1": { current: id === "fighter" ? 0 : 3, max: id === "fighter" ? 0 : 3 },
      "2": { current: 0, max: 0 },
      "3": { current: 0, max: 0 }
    },
    spells,
    skillCooldowns: {},
    defending: false
  };
  this.refreshCharges(character, true);
  return character;
}

export function defaultFlags(this: CrystalOathSceneContext) {
  return {
    relics: { root: false, flame: false, tide: false, gale: false },
    boat: false,
    skyship: false,
    gateOpen: false,
    introSeen: false,
    travel: {
      visitedIsland2: false,
      visitedIsland3: false,
      visitedFrostmere: false,
      visitedHighspire: false,
      visitedAshfall: false,
      unlockedIsland2: true,
      unlockedIsland3: false,
      unlockedFrostmere: false,
      unlockedHighspire: false,
      unlockedAshfall: false
    }
  };
}

export function normalizeFlags(this: CrystalOathSceneContext, raw: Partial<ReturnType<CrystalOathSceneContext["defaultFlags"]>> | undefined) {
  const defaults = this.defaultFlags();
  return {
    ...defaults,
    ...(raw ?? {}),
    relics: { ...defaults.relics, ...(raw?.relics ?? {}) },
    travel: { ...defaults.travel, ...(raw?.travel ?? {}) }
  };
}

export function normalizeParty(this: CrystalOathSceneContext, rawParty: CharacterState[]): CharacterState[] {
  if (!rawParty.length) {
    return [
      this.makeCharacter("fighter", "Arlen", "Vanguard", 42, 9, 7, 5, 4, "trainingBlade", "travelCloth", []),
      this.makeCharacter("priest", "Mira", "White Sage", 30, 4, 4, 6, 7, "willowRod", "travelCloth", ["mend", "ward"]),
      this.makeCharacter("mage", "Kael", "Ember Adept", 26, 3, 3, 7, 5, "willowRod", "travelCloth", ["spark", "ember"])
    ];
  }
  return rawParty.map((member) => {
    const maxMp = member.maxMp ?? startingMaxMp(member.id, member.level ?? 1);
    return {
      ...member,
      mp: Math.min(member.mp ?? maxMp, maxMp),
      maxMp,
      statuses: member.statuses ?? {},
      charges: member.charges ?? {
        "1": { current: 0, max: 0 },
        "2": { current: 0, max: 0 },
        "3": { current: 0, max: 0 }
      },
      spells: member.spells ?? [],
      skillCooldowns: member.skillCooldowns ?? {},
      defending: false
    };
  });
}

function startingMaxMp(id: CharacterState["id"], level: number) {
  if (id === "fighter") return level >= 7 ? 10 + (level - 7) * 2 : 0;
  if (id === "priest") return 16 + level * 2;
  return 22 + level * 2;
}

export function locations(this: CrystalOathSceneContext): LocationDef[] {
  return (this.generatedWorld?.pois ?? []).map((poi) => ({
    id: poi.id,
    name: poi.name,
    kind: poi.kind,
    islandId: poi.islandId,
    landmarkKind: poi.landmarkKind,
    objectId: poi.objectId,
    difficultyTier: poi.difficultyTier,
    x: poi.x,
    y: poi.y,
    footprint: poi.footprint,
    ...this.locationProgressionRules(poi.id)
  }));
}

export function locationProgressionRules(this: CrystalOathSceneContext, id: string): Partial<LocationDef> {
  if (id === "ashenKeep") {
    return {
      requires: () => this.flags.relics.root,
      lockedText: "Stonefall Keep waits behind root-sealed highland stone. Clear Greenhaven's cave first."
    };
  }
  if (id === "skyglassTower") {
    return {
      requires: () => this.flags.relics.flame && this.flags.relics.tide,
      lockedText: "Hot wind and tide mist twist together here. Flame and Tide must shine first."
    };
  }
  if (id === "eclipseSpire") {
    return {
      requires: () => this.flags.gateOpen && this.flags.skyship,
      lockedText: "The spire hangs beyond reach. Open Starfall Gate and ride the sky route."
    };
  }
  return {};
}

export function generatedDungeonFloors(this: CrystalOathSceneContext, dungeonId: string, tier: number, final = false): string[][] {
  return generateDungeonFloors({ seed: this.worldSeed, dungeonId, tier, final });
}

export function dungeons(this: CrystalOathSceneContext): Record<string, DungeonDef> {
  if (this.dungeonCache?.seed === this.worldSeed) return this.dungeonCache.dungeons;
  const dungeons: Record<string, DungeonDef> = {
    mossCave: {
      id: "mossCave",
      name: "Mossy Cave",
      relic: "root",
      boss: "rootboundTroll",
      palette: { floor: 0x31543b, wall: 0x18271e, accent: 0x78a95f, chest: 0xc08a3a, gate: 0x6a4328 },
      encounterTable: ["slimebud", "greenWolf", "bandit", "caveBat"],
      floors: this.generatedDungeonFloors("mossCave", 1),
      chestRewards: [
        { id: "mossCave-0", item: "etherleaf" },
        { id: "mossCave-1", gear: "starbrand" },
        { id: "mossCave-2", gold: 80 }
      ],
      puzzleText: "A root switch sinks. Somewhere, old vines release a door.",
      bossIntro: ["Rootbound Troll: Little oathlings. I drank the cave's green star. Come take the thorns."],
      rewardText: ["The Root Relic brightens. Roads under leaf and stone breathe again."]
    },
    ashenKeep: {
      id: "ashenKeep",
      name: "Stonefall Keep",
      relic: "flame",
      boss: "emberTyrant",
      palette: { floor: 0x522a22, wall: 0x1e1213, accent: 0xff6a38, chest: 0xd9a445, gate: 0x7b1d13 },
      encounterTable: ["ashGolem", "cinderPup", "ashSprite", "coalKnight"],
      floors: this.generatedDungeonFloors("ashenKeep", 3),
      chestRewards: [
        { id: "ashenKeep-0", item: "phoenixAsh" },
        { id: "ashenKeep-1", gear: "emberStaff" },
        { id: "ashenKeep-2", gold: 130 }
      ],
      puzzleText: "The furnace lever clanks. A scorched bridge locks into place.",
      bossIntro: ["Ember Tyrant: I am the kept flame and the hungry flame. Kneel, or be kindling."],
      rewardText: ["The Flame Relic burns clear, warming even the shadowed roads."]
    },
    tideShrine: {
      id: "tideShrine",
      name: "Coralreach Ruins",
      relic: "tide",
      boss: "tideOracle",
      palette: { floor: 0x1b5770, wall: 0x0b2234, accent: 0x68d5ec, chest: 0xd8bd68, gate: 0x184968 },
      encounterTable: ["pirate", "jungleShaman", "reefCrab", "drownedHusk"],
      floors: this.generatedDungeonFloors("tideShrine", 2),
      chestRewards: [
        { id: "tideShrine-0", item: "etherleaf" },
        { id: "tideShrine-1", gear: "tidePlate" },
        { id: "tideShrine-2", gold: 160 }
      ],
      puzzleText: "The moon-basin fills. A submerged seal rises into a path.",
      bossIntro: ["Tide Oracle: Every oath is a cup. Let us see whether yours leaks."],
      rewardText: ["The Tide Relic clears. The sea no longer speaks in fear."]
    },
    skyglassTower: {
      id: "skyglassTower",
      name: "Skyglass Tower",
      relic: "gale",
      boss: "galeChimera",
      palette: { floor: 0x485f78, wall: 0x172336, accent: 0xa8f2ff, chest: 0xe2c76f, gate: 0x3a7690 },
      encounterTable: ["skyMite", "galeHarpy", "glassRoc"],
      floors: this.generatedDungeonFloors("skyglassTower", 3),
      chestRewards: [
        { id: "skyglassTower-0", item: "phoenixAsh" },
        { id: "skyglassTower-1", gear: "galeCloak" },
        { id: "skyglassTower-2", gold: 220 }
      ],
      puzzleText: "A lens turns toward the gale. A glass bridge hums into view.",
      bossIntro: ["Gale Chimera: Three throats, one storm. Show me which voice your oath uses."],
      rewardText: ["The Gale Relic flashes. High roads descend from cloud and glass."]
    },
    eclipseSpire: {
      id: "eclipseSpire",
      name: "Eclipse Spire",
      boss: "eclipseCrown",
      palette: { floor: 0x221a35, wall: 0x08070e, accent: 0xb09cff, chest: 0xffdc78, gate: 0x4f2f75 },
      encounterTable: ["eclipseShade", "crownGuard", "voidSerpent"],
      floors: this.generatedDungeonFloors("eclipseSpire", 4, true),
      chestRewards: [
        { id: "eclipseSpire-0", item: "etherleaf" },
        { id: "eclipseSpire-1", item: "phoenixAsh" },
        { id: "eclipseSpire-2", gold: 260 }
      ],
      puzzleText: "The shadow seal accepts the fourfold light. The last stair appears.",
      bossIntro: ["Eclipse Crown: Dawn is a brief mistake. I will make the world consistent."],
      rewardText: ["The Crown cracks. Morning remembers every road in Asterra."]
    }
  };
  this.dungeonCache = { seed: this.worldSeed, dungeons };
  return dungeons;
}

export function isExploreMode(this: CrystalOathSceneContext, mode: Mode): mode is ExploreMode {
  return isExploreModeValue(mode);
}
