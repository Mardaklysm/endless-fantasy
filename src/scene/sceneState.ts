import { WORLD_H, WORLD_W } from "../app/config";
import type { CharacterState, DungeonDef, LocationDef, TownDef } from "../data/gameDataTypes";
import { perfNow, perfRecordWorldgen } from "../debug/perf";
import { isExploreModeValue, type ExploreMode, type Mode } from "./sceneTypes";
import { generateDungeonFloors } from "../world/dungeonGenerator";
import { createWorldSeed, generateWorld } from "../world/worldGenerator";
import type { CrystalOathSceneContext } from "./sceneContext";

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
    this.makeCharacter("arlen", "Arlen", "Vanguard", 42, 9, 7, 5, 4, "trainingBlade", "travelCloth", []),
    this.makeCharacter("mira", "Mira", "White Sage", 30, 4, 4, 6, 7, "willowRod", "travelCloth", ["mend", "ward"]),
    this.makeCharacter("kael", "Kael", "Ember Adept", 26, 3, 3, 7, 5, "willowRod", "travelCloth", ["spark", "ember"])
  ];
  this.inventory = { potion: 5, antidote: 2, tent: 1, phoenixAsh: 0, etherleaf: 0, smokeBomb: 0, charteredCompass: 0 };
  this.gearBag = { trainingBlade: 1, willowRod: 2, travelCloth: 3 };
  this.gold = 80;
  this.buildWorldFromSeed(createWorldSeed());
  this.setWorldTimeTicks(0);
  this.worldPos = { ...(this.generatedWorld?.startPosition ?? { x: 10, y: 22 }) };
  this.townPos = { x: 10, y: 12 };
  this.dungeonPos = { x: 1, y: 1 };
  this.currentTown = "dawnford";
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
  this.settings.encounters = true;
  this.settings.xpMultiplier = 1;
  this.settings.fastText = false;
  this.clearHeldMovement();
  this.currentTown = "dawnford";
  this.markLocationVisited(this.currentTown);
  this.enterPoiVisit("starting_grassland_village", { mode: "world", locationId: this.currentTown });
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
      this.mode = "poi";
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
    baseAttack: attack,
    baseDefense: defense,
    speed,
    luck,
    weapon,
    armor,
    statuses: {},
    charges: {
      "1": { current: id === "arlen" ? 0 : 3, max: id === "arlen" ? 0 : 3 },
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
      this.makeCharacter("arlen", "Arlen", "Vanguard", 42, 9, 7, 5, 4, "trainingBlade", "travelCloth", []),
      this.makeCharacter("mira", "Mira", "White Sage", 30, 4, 4, 6, 7, "willowRod", "travelCloth", ["mend", "ward"]),
      this.makeCharacter("kael", "Kael", "Ember Adept", 26, 3, 3, 7, 5, "willowRod", "travelCloth", ["spark", "ember"])
    ];
  }
  return rawParty.map((member) => ({
    ...member,
    statuses: member.statuses ?? {},
    charges: member.charges ?? {
      "1": { current: 0, max: 0 },
      "2": { current: 0, max: 0 },
      "3": { current: 0, max: 0 }
    },
    spells: member.spells ?? [],
    skillCooldowns: member.skillCooldowns ?? {},
    defending: false
  }));
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

export function towns(this: CrystalOathSceneContext): Record<string, TownDef> {
  return {
    dawnford: {
      id: "dawnford",
      name: "Greenhaven",
      palette: ["#23314f", "#4b6a9b", "#d9e6ff"],
      innPrice: 18,
      clinicPrice: 35,
      itemStock: ["potion", "antidote", "tent"],
      weaponStock: ["ironSaber"],
      armorStock: ["ringMail", "sageMantle"],
      spellStock: ["glow", "frost"],
      npcs: [
        { x: 5, y: 7, lines: ["Guard: Mossy Cave shifts every season, but its deepest room always hoards trouble."] },
        { x: 14, y: 8, lines: ["Archivist: The map seed is written in the stars. Same seed, same islands."] },
        { x: 9, y: 5, lines: ["Harbor Master: Passage to Coralreach is 10 gold from the dock outside town."] }
      ]
    },
    brinewick: {
      id: "brinewick",
      name: "Coralreach",
      palette: ["#183e5b", "#2f9ac0", "#d2fbff"],
      innPrice: 26,
      clinicPrice: 45,
      itemStock: ["potion", "antidote", "phoenixAsh", "smokeBomb"],
      weaponStock: ["glassWand"],
      armorStock: ["ringMail", "sageMantle"],
      spellStock: ["mendall", "quakelet"],
      arrival: () => {
        if (!this.flags.travel.visitedIsland2) {
          this.flags.travel.visitedIsland2 = true;
          this.say(["Coralreach smells of rain, spice, and old stone. Pirates watch the ruins from the trees."]);
        }
      },
      npcs: [
        { x: 6, y: 7, lines: ["Sailor: Jungle ruins lie inland. Pirates found something there and stopped laughing."] },
        { x: 15, y: 7, lines: ["Fisher: I saw a wreck south of the harbor. It might still have cargo."] },
        { x: 11, y: 4, lines: ["Harbor Master: Frostmere and Highspire passages open once your charts are worthy."] }
      ]
    },
    elderleaf: {
      id: "elderleaf",
      name: "Elderleaf",
      palette: ["#14351f", "#4d8b43", "#d7f2a4"],
      innPrice: 24,
      clinicPrice: 42,
      itemStock: ["potion", "antidote", "etherleaf", "tent"],
      weaponStock: ["glassWand"],
      armorStock: ["sageMantle"],
      spellStock: ["revive", "storm"],
      npcs: [
        { x: 5, y: 8, lines: ["Druid: Poison lingers after battle. Carry antidotes or rest at an inn."] },
        { x: 14, y: 6, lines: ["Scout: Stonefall Keep opened when Rootlight returned. Ice cools proud flame."] },
        { x: 11, y: 10, lines: ["Child: I saw a hidden chest sparkle behind the cave's switch stone."] }
      ]
    },
    sunbarrow: {
      id: "sunbarrow",
      name: "Highspire Camp",
      palette: ["#6c4c22", "#d29a44", "#fff0ae"],
      innPrice: 32,
      clinicPrice: 55,
      itemStock: ["potion", "phoenixAsh", "etherleaf", "smokeBomb", "tent"],
      weaponStock: ["glassWand"],
      armorStock: ["ringMail", "sageMantle"],
      spellStock: ["starveil", "nova"],
      npcs: [
        { x: 7, y: 7, lines: ["Miner: Highspire's cliffs move like they are thinking. Stay on the paths."] },
        { x: 13, y: 9, lines: ["Trader: Starveil wins long fights. Nova ends short ones."] },
        { x: 10, y: 5, lines: ["Outrider: Four relics point to Starfall Gate, not the spire itself."] }
      ]
    },
    starfallGate: {
      id: "starfallGate",
      name: "Starfall Gate",
      palette: ["#1b1733", "#7065a8", "#fff4bd"],
      innPrice: 0,
      clinicPrice: 0,
      itemStock: ["potion", "phoenixAsh", "etherleaf", "smokeBomb"],
      weaponStock: [],
      armorStock: [],
      spellStock: [],
      arrival: () => {
        if (this.hasAllRelics() && !this.flags.gateOpen) {
          this.flags.gateOpen = true;
          this.flags.skyship = true;
          this.say([
            "The four Star Relics rise into a single dawn-colored ring.",
            "A sky-vessel of glass and cedar descends without a sound.",
            "Starfall Gate opens. The Eclipse Spire can now be reached."
          ]);
          this.saveGame();
        }
      },
      npcs: [
        { x: 10, y: 6, lines: ["Gatekeeper: Root, Flame, Tide, and Gale must sing together."] },
        { x: 7, y: 9, lines: ["Pilgrim: Past this gate waits the Crown that dimmed the morning."] }
      ]
    }
  };
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
