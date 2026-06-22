import type { AssetKey } from "../../assets/assetTypes";
import type { EnemyState } from "../../data/gameDataTypes";

export interface BattleAction {
  side: "party" | "enemy";
  actorId: string;
  type: "attack" | "skill" | "spell" | "item" | "defend" | "run" | "skip";
  targetIndex?: number;
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

export type BattlePhase = "command" | "target" | "skill" | "spell" | "item" | "allyTarget" | "resolving" | "log";

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
  background: AssetKey;
  canRun: boolean;
  phase: BattlePhase;
  turnOrder: InitiativeEntry[];
  turnIndex: number;
  current?: InitiativeEntry;
  actions: BattleAction[];
  selected: number;
  pendingAction?: Partial<BattleAction>;
  animation?: BattleAnimation;
  log: string[];
  actionTimer: number;
  victoryAwarded: boolean;
}
