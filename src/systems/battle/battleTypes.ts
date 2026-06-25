import type { AssetKey } from "../../assets/assetTypes";
import type { EnemyState } from "../../data/gameDataTypes";

export interface BattleAction {
  side: "party" | "enemy";
  actorId: string;
  type: "attack" | "skill" | "spell" | "item" | "defend" | "run" | "skip";
  targetIndex?: number;
  targetAll?: boolean;
  skillId?: string;
  spellId?: string;
  itemId?: string;
}

export interface BattleAnimation {
  action: BattleAction;
  elapsed: number;
  duration: number;
  impactAt: number;
  resolved: boolean;
  spent?: boolean;
  targetSide?: "party" | "enemy";
  targetActorId?: string;
}

export type BattleFloatingTextKind = "damage" | "heal" | "status" | "miss";

export interface BattleFloatingText {
  id: string;
  side: "party" | "enemy";
  actorId: string;
  anchorX: number;
  anchorY: number;
  text: string;
  amount: number;
  maxHp: number;
  kind: BattleFloatingTextKind;
  critical?: boolean;
  createdAt: number;
  duration: number;
  jitterX: number;
}

export interface BattleCarouselCardSnapshot {
  key: string;
  side: "party" | "enemy";
  actorId: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BattleCarouselDissolveParticle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  color: number;
  delay: number;
}

export interface BattleCarouselDissolve {
  key: string;
  createdAt: number;
  duration: number;
  particles: BattleCarouselDissolveParticle[];
}

export interface BattleCarouselState {
  lastKey?: string;
  animationStartedAt?: number;
  previousCards?: BattleCarouselCardSnapshot[];
  dissolves?: BattleCarouselDissolve[];
}

export type BattlePhase = "command" | "target" | "skill" | "spell" | "item" | "allyTarget" | "resolving" | "log" | "victory";

export interface BattleLootReward {
  itemId: string;
  name: string;
  quantity: number;
}

export interface BattleLevelUpReward {
  characterId: string;
  name: string;
  oldLevel: number;
  newLevel: number;
  hpGain: number;
  mpGain: number;
  attackGain: number;
  defenseGain: number;
  speedGain: number;
  luckGain: number;
  newSpells: string[];
  chargeLines: string[];
}

export interface BattleVictoryRewards {
  xp: number;
  gold: number;
  loot: BattleLootReward[];
  levelUps: BattleLevelUpReward[];
}

export interface InitiativeEntry {
  side: "party" | "enemy";
  actorId: string;
  initiative: number;
}

export interface BattleState {
  kind: "random" | "boss";
  enemies: EnemyState[];
  bossId?: string;
  dungeonId?: string;
  battleMapId?: string;
  background: AssetKey;
  canRun: boolean;
  phase: BattlePhase;
  turnOrder: InitiativeEntry[];
  turnIndex: number;
  current?: InitiativeEntry;
  actions: BattleAction[];
  selected: number;
  menuReturnSelected?: number;
  pendingAction?: Partial<BattleAction>;
  animation?: BattleAnimation;
  log: string[];
  debugLogVisible?: boolean;
  floatingTexts?: BattleFloatingText[];
  carousel?: BattleCarouselState;
  actionTimer: number;
  victoryPending?: boolean;
  victoryRewards?: BattleVictoryRewards;
  victoryAwarded: boolean;
}
