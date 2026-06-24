import type { WorldObjectId } from "./worldObjects";
import type { IslandId, WorldLandmarkKind, WorldPoiKind } from "../world/worldGenerator";

export type ElementType =
  | "none"
  | "fire"
  | "ice"
  | "lightning"
  | "earth"
  | "wind"
  | "light"
  | "shadow";

export type TargetKind = "enemy" | "ally" | "allEnemies" | "allAllies" | "self";

export interface StatusState {
  poison?: number;
  burn?: number;
  bleed?: number;
  weakness?: number;
  charged?: number;
  sleep?: number;
  silence?: number;
  stun?: number;
  guarded?: number;
  ward?: number;
  starveil?: number;
}

export interface CharacterState {
  id: "fighter" | "priest" | "mage";
  name: string;
  role: string;
  level: number;
  xp: number;
  nextXp: number;
  hp: number;
  maxHp: number;
  baseAttack: number;
  baseDefense: number;
  speed: number;
  luck: number;
  weapon: string;
  armor: string;
  statuses: StatusState;
  charges: Record<string, { current: number; max: number }>;
  spells: string[];
  skillCooldowns: Record<string, number>;
  defending: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  price: number;
  description: string;
  battle: boolean;
  field: boolean;
}

export interface SpellDef {
  id: string;
  name: string;
  caster: CharacterState["id"];
  tier: 1 | 2 | 3;
  target: TargetKind;
  element: ElementType;
  power: number;
  kind: "heal" | "damage" | "buff" | "revive";
  price: number;
  minLevel: number;
  description: string;
}

export interface PlayerSkillDef {
  id: string;
  name: string;
  users: CharacterState["id"][] | "all";
  target: "enemy" | "ally" | "self";
  cooldown: number;
  description: string;
}

export interface GearDef {
  id: string;
  name: string;
  price: number;
  power: number;
  kind: "weapon" | "armor";
  users: CharacterState["id"][];
  description: string;
}

export interface EnemyMove {
  name: string;
  kind: "attack" | "damage" | "status" | "buff" | "defend" | "heal" | "charge" | "steal";
  power: number;
  element?: ElementType;
  status?: keyof StatusState;
  target?: "one" | "all";
  intent?: EnemyIntentKind;
}

export type EnemyIntentKind = "attack" | "heavyAttack" | "defend" | "poison" | "heal" | "charge" | "flee" | "summon" | "stealGold";

export interface EnemyIntent {
  kind: EnemyIntentKind;
  label: string;
  message: string;
  move: EnemyMove;
}

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  xp: number;
  gold: number;
  element: ElementType;
  weak: ElementType[];
  resist: ElementType[];
  moves: EnemyMove[];
  drops?: { item: string; chance: number }[];
  palette: string[];
  sprite: "blob" | "beast" | "wing" | "knight" | "serpent" | "crown";
  boss?: boolean;
}

export interface EnemyState extends EnemyDef {
  uid: string;
  hp: number;
  statuses: StatusState;
  intent?: EnemyIntent;
}

export interface LocationDef {
  id: string;
  name: string;
  kind: WorldPoiKind;
  islandId?: IslandId;
  landmarkKind?: WorldLandmarkKind;
  objectId?: WorldObjectId;
  difficultyTier?: number;
  x: number;
  y: number;
  footprint?: number;
  requires?: () => boolean;
  lockedText?: string;
}

export interface TownDef {
  id: string;
  name: string;
  palette: string[];
  npcs: { x: number; y: number; lines: string[] }[];
  itemStock: string[];
  weaponStock: string[];
  armorStock: string[];
  spellStock: string[];
  innPrice: number;
  clinicPrice: number;
  arrival?: () => void;
}

export interface DungeonDef {
  id: string;
  name: string;
  relic?: "root" | "flame" | "tide" | "gale";
  boss: string;
  palette: {
    floor: number;
    wall: number;
    accent: number;
    chest: number;
    gate: number;
  };
  encounterTable: string[];
  floors: string[][];
  chestRewards: { id: string; item?: string; gear?: string; gold?: number }[];
  puzzleText: string;
  bossIntro: string[];
  rewardText: string[];
}

export interface TravelDestination {
  destinationIslandId: IslandId;
  displayName: string;
  costGold: number;
  requiredUnlockFlag?: "unlockedIsland2" | "unlockedIsland3" | "unlockedFrostmere" | "unlockedHighspire" | "unlockedAshfall";
}

export type ServiceKind = "inn" | "item" | "arms" | "magic" | "clinic";

export interface TownServiceDef {
  kind: ServiceKind;
  label: string;
  x: number;
  y: number;
  color: number;
  accent: number;
}
