import Phaser from "phaser";
import { BATTLE_ACTION_DELAY_MS, BATTLE_TURN_DELAY_MS } from "../../app/config";
import type { AssetKey } from "../../assets/assetTypes";
import { ENEMIES } from "../../data/enemies";
import type {
  CharacterState,
  DungeonDef,
  EnemyIntent,
  EnemyIntentKind,
  EnemyMove,
  EnemyState,
  PlayerSkillDef
} from "../../data/gameDataTypes";
import { battleMapBackgroundKeyForId, isBossEncounter, resolveBattleMapVariant } from "../../data/battleMapSpawns";
import { ITEMS } from "../../data/items";
import { PLAYER_SKILLS } from "../../data/playerSkills";
import { SPELLS } from "../../data/spells";
import { worldTileEncounterFamily } from "../../data/worldTiles";
import type { BattleState, InitiativeEntry } from "./battleTypes";
import { wrap } from "../world/worldMath";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function startRandomBattle(this: CrystalOathSceneContext, table: string[], dungeonId?: string) {
  const count = Phaser.Math.Between(1, 3);
  const enemies: EnemyState[] = [];
  for (let i = 0; i < count; i += 1) enemies.push(this.cloneEnemy(Phaser.Utils.Array.GetRandom(table)));
  this.beginBattle("random", enemies, true, `${enemies.map((e) => e.name).join(", ")} appeared!`, dungeonId);
}

export function startBossBattle(this: CrystalOathSceneContext, dungeon: DungeonDef) {
  if (this.defeatedBosses.has(dungeon.boss)) {
    this.say(["Only quiet remains where the boss once stood."]);
    return;
  }
  this.saveGame();
  this.say(dungeon.bossIntro, () => {
    this.beginBattle("boss", [this.cloneEnemy(dungeon.boss)], false, `${ENEMIES[dungeon.boss].name} blocks the relic!`, dungeon.id, dungeon.boss);
  });
}

export function cloneEnemy(this: CrystalOathSceneContext, id: string): EnemyState {
  const def = ENEMIES[id];
  const enemyState: EnemyState = {
    ...def,
    uid: `${id}-${Math.random().toString(36).slice(2)}`,
    hp: def.maxHp,
    statuses: {}
  };
  enemyState.intent = this.planEnemyIntent(enemyState);
  return enemyState;
}

export function planEnemyIntent(this: CrystalOathSceneContext, enemy: EnemyState): EnemyIntent {
  const move = Phaser.Utils.Array.GetRandom(enemy.moves);
  const kind = move.intent ?? this.intentKindForMove(move);
  return {
    kind,
    label: this.intentLabel(kind),
    message: this.intentMessage(enemy.name, kind, move),
    move
  };
}

export function intentKindForMove(this: CrystalOathSceneContext, move: EnemyMove): EnemyIntentKind {
  if (move.kind === "status" && move.status === "poison") return "poison";
  if (move.kind === "defend") return "defend";
  if (move.kind === "heal") return "heal";
  if (move.kind === "charge") return "charge";
  if (move.kind === "steal") return "stealGold";
  if (move.kind === "damage" && move.power >= 12) return "heavyAttack";
  return "attack";
}

export function intentLabel(this: CrystalOathSceneContext, kind: EnemyIntentKind): string {
  return (
    {
      attack: "Attack",
      heavyAttack: "Heavy Attack",
      defend: "Defend",
      poison: "Poison",
      heal: "Heal",
      charge: "Charge",
      flee: "Flee",
      summon: "Summon",
      stealGold: "Steal Gold"
    }[kind] ?? "Attack"
  );
}

export function intentMessage(this: CrystalOathSceneContext, enemyName: string, kind: EnemyIntentKind, move: EnemyMove): string {
  if (kind === "heavyAttack") return `${enemyName} is preparing ${move.name}.`;
  if (kind === "defend") return `${enemyName} raises its guard.`;
  if (kind === "poison") return `${enemyName} readies a venom trick.`;
  if (kind === "heal") return `${enemyName} begins a healing chant.`;
  if (kind === "charge") return `${enemyName} gathers power.`;
  if (kind === "stealGold") return `${enemyName} eyes the party's gold.`;
  return `${enemyName} is watching for an opening.`;
}

export function battleBackgroundFor(this: CrystalOathSceneContext, dungeonId?: string): AssetKey {
  return battleMapBackgroundKeyForId(this.battleMapIdFor(dungeonId, "normal")) ?? "battle_bg_plains";
}

export function battleMapBaseIdFor(this: CrystalOathSceneContext, dungeonId?: string): string {
  if (dungeonId === "mossCave") return "moss_cave";
  if (dungeonId === "ashenKeep") return "ashen_keep";
  if (dungeonId === "tideShrine") return "tide_shrine";
  if (dungeonId === "eclipseSpire") return "eclipse_spire";
  if (dungeonId === "skyglassTower") return "sunlit_plains";
  const terrain = this.world[this.worldPos.y]?.[this.worldPos.x];
  const family = terrain ? worldTileEncounterFamily(terrain) : undefined;
  if (family === "forest") return "forest_path";
  if (family === "sand") return "ashen_keep";
  if (family === "water") return "tide_shrine";
  if (family === "final") return "eclipse_spire";
  return "sunlit_plains";
}

export function battleMapIdFor(this: CrystalOathSceneContext, dungeonId?: string, variant: "normal" | "boss" = "normal"): string {
  return resolveBattleMapVariant(this.battleMapBaseIdFor(dungeonId), variant)?.id ?? "sunlit_plains_normal";
}

export function beginBattle(this: CrystalOathSceneContext, kind: BattleState["kind"], enemies: EnemyState[], canRun: boolean, intro: string, dungeonId?: string, bossId?: string) {
  this.clearHeldMovement();
  this.syncAllVisualPositions();
  this.party.forEach((c) => (c.defending = false));
  const encounterKind = isBossEncounter(enemies, kind, bossId) ? "boss" : "normal";
  const battleMapId = this.battleMapIdFor(dungeonId, encounterKind);
  this.battle = {
    kind,
    enemies,
    bossId,
    dungeonId,
    battleMapId,
    background: battleMapBackgroundKeyForId(battleMapId) ?? this.battleBackgroundFor(dungeonId),
    canRun,
    phase: "resolving",
    turnOrder: [],
    turnIndex: 0,
    actions: [],
    selected: 0,
    log: [intro],
    debugLogVisible: false,
    floatingTexts: [],
    hitReactions: [],
    enemyDeathDissolves: [],
    carousel: { dissolves: [] },
    actionTimer: BATTLE_TURN_DELAY_MS,
    victoryAwarded: false
  };
  this.rollInitiativeCycle();
  this.mode = "battle";
  this.audio.setMode("battle");
  this.markDirty();
}

export function updateBattleFlow(this: CrystalOathSceneContext, delta: number) {
  if (!this.battle || this.mode !== "battle") return;
  if (this.battle.animation) {
    this.updateBattleAnimation(delta);
    return;
  }
  if (["command", "target", "skill", "spell", "item", "allyTarget"].includes(this.battle.phase)) this.markDirty();
  if (this.battle.phase !== "resolving") return;
  this.battle.actionTimer -= delta;
  if (this.battle.actionTimer <= 0) this.advanceBattleAfterDelay();
  this.markDirty();
}

export function updateBattleAnimation(this: CrystalOathSceneContext, delta: number) {
  if (!this.battle?.animation) return;
  const animation = this.battle.animation;
  animation.elapsed += delta;
  if (!animation.resolved && animation.elapsed >= animation.impactAt) {
    animation.resolved = true;
    animation.spent =
      animation.action.side === "party" ? this.resolvePartyAction(animation.action) : this.resolveEnemyAction(animation.action);
    if (!this.battle) return;
  }
  if (animation.elapsed >= animation.duration && this.battle) {
    const spent = animation.spent ?? true;
    this.battle.animation = undefined;
    if (spent) this.finishCurrentTurn(BATTLE_ACTION_DELAY_MS);
    else {
      this.battle.phase = this.currentBattleActor() ? "command" : "resolving";
      this.battle.selected = 0;
    }
  }
  this.markDirty();
}

export function advanceBattleAfterDelay(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  if (this.checkBattleEnd()) return;
  this.startNextBattleTurn();
}

export function rollInitiativeCycle(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  const entries: InitiativeEntry[] = [
    ...this.party
      .filter((member) => member.hp > 0)
      .map((member) => ({
        side: "party" as const,
        actorId: member.id,
        initiative: member.speed * 10 + Phaser.Math.Between(0, 12) + Math.floor(member.luck / 2)
      })),
    ...this.battle.enemies
      .filter((enemy) => enemy.hp > 0)
      .map((enemy) => ({
        side: "enemy" as const,
        actorId: enemy.uid,
        initiative: enemy.speed * 10 + Phaser.Math.Between(0, 12)
      }))
  ];
  entries.sort((a, b) => b.initiative - a.initiative);
  this.battle.turnOrder = entries;
  this.battle.turnIndex = 0;
}

export function startNextBattleTurn(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  if (this.checkBattleEnd()) return;
  let guard = 0;
  while (this.battle && guard < 30) {
    guard += 1;
    if (this.battle.turnIndex >= this.battle.turnOrder.length) this.rollInitiativeCycle();
    const entry = this.battle.turnOrder[this.battle.turnIndex];
    if (!entry) {
      this.rollInitiativeCycle();
      continue;
    }
    this.battle.turnIndex += 1;
    const actor = this.actorForEntry(entry);
    if (!actor || actor.hp <= 0) continue;
    this.battle.current = entry;
    this.battle.pendingAction = undefined;
    this.battle.selected = 0;
    if (entry.side === "party") {
      const member = actor as CharacterState;
      member.defending = false;
      this.tickSkillCooldowns(member);
      this.battle.log = [`${member.name}'s turn.`];
      if (this.applyTurnStartStatuses(member)) {
        this.finishCurrentTurn(BATTLE_ACTION_DELAY_MS);
        return;
      }
      this.battle.phase = "command";
      this.markDirty();
      return;
    }
    const enemy = actor as EnemyState;
    this.battle.log = [`${enemy.name}'s turn.`];
    if (this.applyTurnStartStatuses(enemy)) {
      this.finishCurrentTurn(BATTLE_ACTION_DELAY_MS);
      return;
    }
    this.queueBattleActionAnimation({ side: "enemy", actorId: enemy.uid, type: "attack" });
    return;
  }
  this.checkBattleEnd();
}

export function actorForEntry(this: CrystalOathSceneContext, entry: InitiativeEntry): CharacterState | EnemyState | undefined {
  if (entry.side === "party") return this.party.find((member) => member.id === entry.actorId);
  return this.battle?.enemies.find((enemy) => enemy.uid === entry.actorId);
}

export function currentBattleEntry(this: CrystalOathSceneContext): InitiativeEntry | undefined {
  return this.battle?.current;
}

export function currentBattleActor(this: CrystalOathSceneContext): CharacterState | undefined {
  const entry = this.currentBattleEntry();
  if (!entry || entry.side !== "party") return undefined;
  return this.party.find((member) => member.id === entry.actorId);
}

export function currentBattleEnemy(this: CrystalOathSceneContext): EnemyState | undefined {
  const entry = this.currentBattleEntry();
  if (!entry || entry.side !== "enemy") return undefined;
  return this.battle?.enemies.find((enemy) => enemy.uid === entry.actorId);
}

export function currentBattleActorName(this: CrystalOathSceneContext): string {
  const actor = this.currentBattleActor() ?? this.currentBattleEnemy();
  return actor?.name ?? "Next actor";
}

export function turnPreviewText(this: CrystalOathSceneContext): string {
  if (!this.battle) return "-";
  const preview = this.battle.turnOrder
    .slice(this.battle.turnIndex, this.battle.turnIndex + 4)
    .map((entry) => this.actorForEntry(entry))
    .filter((actor): actor is CharacterState | EnemyState => !!actor && actor.hp > 0)
    .map((actor) => actor.name);
  return preview.length ? preview.join(" > ") : "new initiative";
}

export function battleOptions(this: CrystalOathSceneContext): string[] {
  if (!this.battle) return [];
  if (this.battle.phase === "command") return ["Attack", "Magic", "Skill", "Item", "Defend", "Run"];
  if (this.battle.phase === "target") return this.battle.enemies.filter((e) => e.hp > 0).map((e) => `${e.name} ${e.hp}/${e.maxHp}`);
  if (this.battle.phase === "skill") {
    const actor = this.currentBattleActor();
    if (!actor) return [];
    return this.skillsForActor(actor).map((skill) => this.skillOptionLabel(actor, skill));
  }
  if (this.battle.phase === "spell") {
    const actor = this.currentBattleActor();
    if (!actor) return [];
    return actor.spells
      .filter((id) => actor.level >= SPELLS[id].minLevel)
      .map((id) => {
        const spell = SPELLS[id];
        return `${spell.name} MP ${this.battleSpellMpCost(id)}`;
      });
  }
  if (this.battle.phase === "item") {
    return Object.keys(ITEMS)
      .filter((id) => ITEMS[id].battle && (this.inventory[id] ?? 0) > 0)
      .map((id) => `${ITEMS[id].name} x${this.inventory[id]}`);
  }
  if (this.battle.phase === "allyTarget") return this.party.map((c) => `${c.name} ${c.hp}/${c.maxHp}`);
  return [];
}

export function skillsForActor(this: CrystalOathSceneContext, actor: CharacterState): PlayerSkillDef[] {
  return Object.values(PLAYER_SKILLS).filter((skill) => skill.users === "all" || skill.users.includes(actor.id));
}

export function skillOptionLabel(this: CrystalOathSceneContext, actor: CharacterState, skill: PlayerSkillDef): string {
  const cooldown = actor.skillCooldowns[skill.id] ?? 0;
  return `${skill.name}${cooldown > 0 ? ` (${cooldown})` : ""}`;
}

export function tickSkillCooldowns(this: CrystalOathSceneContext, actor: CharacterState) {
  for (const skillId of Object.keys(actor.skillCooldowns)) {
    actor.skillCooldowns[skillId] = Math.max(0, actor.skillCooldowns[skillId] - 1);
  }
}

type BattleSelectionMove = number | "up" | "down" | "left" | "right";

export function adjustBattleSelection(this: CrystalOathSceneContext, move: BattleSelectionMove) {
  if (!this.battle) return;
  const options = this.battleOptions();
  if (!options.length) return;
  if (typeof move === "number") {
    this.battle.selected = wrap(this.battle.selected + move, options.length);
    this.audio.blip("confirm");
    return;
  }
  if (this.battle.phase === "command") {
    const columns = options.length;
    const rows = Math.ceil(options.length / columns);
    const row = Math.floor(this.battle.selected / columns);
    const col = this.battle.selected % columns;
    if (move === "up" || move === "down") {
      const nextRow = wrap(row + (move === "down" ? 1 : -1), rows);
      this.battle.selected = Math.min(options.length - 1, nextRow * columns + col);
    } else {
      const rowStart = row * columns;
      const rowCount = Math.min(columns, options.length - rowStart);
      this.battle.selected = rowStart + wrap(col + (move === "right" ? 1 : -1), rowCount);
    }
    this.audio.blip("confirm");
    return;
  }
  if ((this.battle.phase === "target" || this.battle.phase === "allyTarget") && (move === "left" || move === "right")) {
    if (this.battle.phase === "target" && adjustEnemyTargetSelection.call(this, move)) {
      this.audio.blip("confirm");
      return;
    }
    if (this.battle.phase === "allyTarget" && adjustAllyTargetSelection.call(this, move)) {
      this.audio.blip("confirm");
      return;
    }
    const step = move === "right" ? 1 : -1;
    this.battle.selected = wrap(this.battle.selected + step, options.length);
  } else {
    this.battle.selected = wrap(this.battle.selected + (move === "down" || move === "right" ? 1 : -1), options.length);
  }
  this.audio.blip("confirm");
}

function canPendingActionTargetAll(this: CrystalOathSceneContext): boolean {
  if (!this.battle?.pendingAction) return false;
  const action = this.battle.pendingAction;
  if (this.battle.phase === "target") {
    if (action.type === "spell" && action.spellId) {
      const spell = SPELLS[action.spellId];
      return spell?.caster === "mage" && spell.kind === "damage";
    }
    if (action.type === "skill" && action.skillId) return action.skillId === "fireSpark";
  }
  if (this.battle.phase === "allyTarget") {
    if (action.type === "spell" && action.spellId) {
      const spell = SPELLS[action.spellId];
      return spell?.caster === "priest" && spell.kind === "heal";
    }
    if (action.type === "skill" && action.skillId) return action.skillId === "firstAid";
  }
  return false;
}

function adjustEnemyTargetSelection(this: CrystalOathSceneContext, move: "left" | "right"): boolean {
  if (!this.battle) return false;
  const orderedTargets = enemyTargetsByDistance.call(this);
  if (!orderedTargets.length) return false;
  const currentOrderIndex = this.battle.pendingAction?.targetAll
    ? move === "left"
      ? -1
      : orderedTargets.length
    : Math.max(
        0,
        orderedTargets.findIndex((target) => target.livingIndex === this.battle?.selected)
      );

  if (move === "left") {
    if (this.battle.pendingAction?.targetAll) return true;
    if (currentOrderIndex >= orderedTargets.length - 1) {
      if (canPendingActionTargetAll.call(this)) {
        this.battle.pendingAction = { ...this.battle.pendingAction, targetAll: true };
      } else {
        this.battle.selected = orderedTargets[orderedTargets.length - 1].livingIndex;
      }
      return true;
    }
    this.battle.pendingAction = { ...this.battle.pendingAction, targetAll: false };
    this.battle.selected = orderedTargets[currentOrderIndex + 1].livingIndex;
    return true;
  }

  this.battle.pendingAction = { ...this.battle.pendingAction, targetAll: false };
  const nextOrderIndex = Math.max(0, currentOrderIndex - 1);
  this.battle.selected = orderedTargets[nextOrderIndex].livingIndex;
  return true;
}

function adjustAllyTargetSelection(this: CrystalOathSceneContext, move: "left" | "right"): boolean {
  if (!this.battle) return false;
  const targetIndexes = validAllyTargetIndexes.call(this);
  if (!targetIndexes.length) return false;
  const currentTargetIndex = this.battle.pendingAction?.targetAll
    ? move === "right"
      ? -1
      : targetIndexes.length
    : Math.max(0, targetIndexes.indexOf(this.battle.selected));

  if (move === "right") {
    if (this.battle.pendingAction?.targetAll) return true;
    if (currentTargetIndex >= targetIndexes.length - 1) {
      if (canPendingActionTargetAll.call(this)) {
        this.battle.pendingAction = { ...this.battle.pendingAction, targetAll: true };
      } else {
        this.battle.selected = targetIndexes[targetIndexes.length - 1];
      }
      return true;
    }
    this.battle.pendingAction = { ...this.battle.pendingAction, targetAll: false };
    this.battle.selected = targetIndexes[currentTargetIndex + 1];
    return true;
  }

  this.battle.pendingAction = { ...this.battle.pendingAction, targetAll: false };
  const nextTargetIndex = Math.max(0, currentTargetIndex - 1);
  this.battle.selected = targetIndexes[nextTargetIndex];
  return true;
}

function enemyTargetsByDistance(this: CrystalOathSceneContext): Array<{ livingIndex: number; distance: number }> {
  if (!this.battle) return [];
  const actor = this.currentBattleActor();
  const actorIndex = actor ? this.party.findIndex((member) => member.id === actor.id) : -1;
  const actorSlot = this.partyBattleSlot(Math.max(0, actorIndex));
  const actorCenter = { x: actorSlot.x + actorSlot.size / 2, y: actorSlot.y + actorSlot.size / 2 };
  return this.battle.enemies
    .map((enemy, enemyIndex) => ({ enemy, enemyIndex }))
    .filter(({ enemy }) => enemy.hp > 0)
    .map(({ enemy, enemyIndex }, livingIndex) => {
      const slot = this.enemyBattleSlot(enemy, enemyIndex);
      const enemyCenter = { x: slot.x + slot.size / 2, y: slot.y + slot.size / 2 };
      return { livingIndex, distance: Math.hypot(enemyCenter.x - actorCenter.x, enemyCenter.y - actorCenter.y) };
    })
    .sort((a, b) => a.distance - b.distance || a.livingIndex - b.livingIndex);
}

function validAllyTargetIndexes(this: CrystalOathSceneContext): number[] {
  if (!this.battle) return [];
  const action = this.battle.pendingAction;
  if (action?.type === "spell" && action.spellId) {
    const spell = SPELLS[action.spellId];
    if (spell?.caster === "priest" && spell.kind === "heal") return standingPartyIndexes.call(this);
  }
  if (action?.type === "skill" && action.skillId === "firstAid") {
    return standingPartyIndexes.call(this);
  }
  return this.party.map((_, index) => index);
}

function standingPartyIndexes(this: CrystalOathSceneContext): number[] {
  return this.party
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => member.hp > 0)
    .map(({ index }) => index);
}
