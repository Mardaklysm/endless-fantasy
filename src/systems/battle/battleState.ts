import Phaser from "phaser";
import { BATTLE_TURN_DELAY_MS } from "../../app/config";
import type { CharacterState, EnemyState, StatusState } from "../../data/gameDataTypes";
import { ARMORS, WEAPONS } from "../../data/gear";
import { ITEMS } from "../../data/items";
import { SPELLS } from "../../data/spells";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";
import type { BattleLevelUpReward, BattleLootReward } from "./battleTypes";

const POTION_DROP_CHANCE = 10;
const RARE_DROP_CHANCE = 1;
const RARE_LOOT_ITEM_ID = "etherleaf";

function queueStatusDamageFloat(this: CrystalOathSceneContext, actor: CharacterState | EnemyState, damage: number) {
  if (!this.battle) return;
  const enemy = this.battle.enemies.find((candidate) => candidate === actor);
  if (enemy) this.queueBattleFloatingText("enemy", enemy.uid, -damage, enemy.maxHp, "damage");
  else this.queueBattleFloatingText("party", (actor as CharacterState).id, -damage, actor.maxHp, "damage");
}

export function allEnemiesDefeated(this: CrystalOathSceneContext): boolean {
  return !!this.battle && this.battle.enemies.every((e) => e.hp <= 0);
}

export function allPartyDefeated(this: CrystalOathSceneContext): boolean {
  return this.party.every((c) => c.hp <= 0);
}

export function randomLivingPartyMember(this: CrystalOathSceneContext): CharacterState | undefined {
  return Phaser.Utils.Array.GetRandom(this.party.filter((c) => c.hp > 0));
}

export function consumeSkipStatus(this: CrystalOathSceneContext, actor: CharacterState | EnemyState): boolean {
  if (actor.statuses.stun) {
    delete actor.statuses.stun;
    return true;
  }
  if (actor.statuses.sleep) {
    if (Phaser.Math.Between(1, 100) <= 45) delete actor.statuses.sleep;
    else {
      actor.statuses.sleep -= 1;
      if (actor.statuses.sleep <= 0) delete actor.statuses.sleep;
      return true;
    }
  }
  return false;
}

export function applyTurnStartStatuses(this: CrystalOathSceneContext, actor: CharacterState | EnemyState): boolean {
  if (!this.battle) return false;
  if (actor.hp > 0 && actor.statuses.poison) {
    const damage = Math.max(1, Math.floor(actor.maxHp * 0.05));
    actor.hp = Math.max(0, actor.hp - damage);
    queueStatusDamageFloat.call(this, actor, damage);
    this.battle.log.push(`${actor.name} suffers ${damage} poison damage.`);
    if (actor.hp <= 0) return true;
  }
  if (actor.hp > 0 && actor.statuses.burn) {
    const damage = Math.max(1, Math.floor(actor.maxHp * 0.04));
    actor.hp = Math.max(0, actor.hp - damage);
    queueStatusDamageFloat.call(this, actor, damage);
    this.battle.log.push(`${actor.name} burns for ${damage}.`);
    if (actor.hp <= 0) return true;
  }
  if (actor.hp > 0 && actor.statuses.bleed) {
    const damage = Math.max(1, Math.floor(actor.maxHp * 0.03));
    actor.hp = Math.max(0, actor.hp - damage);
    queueStatusDamageFloat.call(this, actor, damage);
    this.battle.log.push(`${actor.name} bleeds for ${damage}.`);
    if (actor.hp <= 0) return true;
  }
  if (this.consumeSkipStatus(actor)) {
    this.battle.log.push(`${actor.name} cannot act.`);
    return true;
  }
  return false;
}

export function checkBattleEnd(this: CrystalOathSceneContext): boolean {
  if (!this.battle) return true;
  if (this.allEnemiesDefeated()) {
    if (!this.battle.victoryAwarded) {
      if (this.battle.victoryPending) {
        const remaining = this.remainingBattleFloatingTextMs();
        if (remaining > 0) {
          this.battle.actionTimer = remaining;
          return true;
        }
        this.awardVictory();
      } else {
        this.beginVictorySequence();
      }
    }
    return true;
  }
  if (this.allPartyDefeated()) {
    this.battle.log = ["The party falls beneath the dimming stars..."];
    this.mode = "gameOver";
    this.audio.setMode("title");
    return true;
  }
  return false;
}

export function beginVictorySequence(this: CrystalOathSceneContext) {
  if (!this.battle || this.battle.victoryAwarded || this.battle.victoryPending) return;
  this.battle.victoryPending = true;
  this.battle.current = undefined;
  this.battle.pendingAction = undefined;
  this.battle.animation = undefined;
  this.battle.selected = 0;
  if (this.battle.carousel) this.battle.carousel.dissolves = [];
  const remaining = this.remainingBattleFloatingTextMs();
  if (remaining > 0) {
    this.battle.phase = "resolving";
    this.battle.actionTimer = remaining;
    this.markDirty();
    return;
  }
  this.awardVictory();
}

export function tickStatus(this: CrystalOathSceneContext, actor: CharacterState | EnemyState) {
  for (const key of ["ward", "starveil", "silence", "burn", "bleed", "weakness", "guarded", "charged"] as (keyof StatusState)[]) {
    if (actor.statuses[key]) {
      actor.statuses[key]! -= 1;
      if (actor.statuses[key]! <= 0) delete actor.statuses[key];
    }
  }
}

export function statusActive(this: CrystalOathSceneContext, actor: CharacterState | EnemyState, status: keyof StatusState): boolean {
  return !!actor.statuses[status];
}

export function awardVictory(this: CrystalOathSceneContext) {
  if (!this.battle || this.battle.victoryAwarded) return;
  this.cleanupBattleFloatingTexts();
  const defeatedEnemies = this.battle.enemies.filter((enemy) => enemy.hp <= 0);
  const xp = Math.max(0, Math.round(defeatedEnemies.reduce((sum, e) => sum + e.xp, 0) * this.settings.xpMultiplier));
  const gold = defeatedEnemies.reduce((sum, enemy) => sum + rollGoldForEnemy.call(this, enemy), 0);
  const loot = rollVictoryLoot.call(this, defeatedEnemies);
  this.gold += gold;
  for (const item of loot) {
    this.inventory[item.itemId] = (this.inventory[item.itemId] ?? 0) + item.quantity;
  }
  this.battle.log.push(`Victory! Gained ${xp} XP and ${gold} gold.`);
  const levelUps = applyVictoryXp.call(this, xp);
  this.battle.victoryRewards = { xp, gold, loot, levelUps };
  this.battle.victoryPending = false;
  if (this.battle.carousel) this.battle.carousel.dissolves = [];
  this.battle.victoryAwarded = true;
  this.battle.phase = "victory";
  this.audio.blip("victory");
  this.markDirty();
}

function applyVictoryXp(this: CrystalOathSceneContext, xp: number): BattleLevelUpReward[] {
  const levelUps: BattleLevelUpReward[] = [];
  for (const member of this.party) {
    const before = {
      level: member.level,
      maxHp: member.maxHp,
      maxMp: member.maxMp,
      attack: member.baseAttack,
      defense: member.baseDefense,
      speed: member.speed,
      luck: member.luck,
      spells: [...member.spells],
      chargeMaxes: chargeMaxes(member)
    };
    member.xp += xp;
    while (member.level < 12 && member.xp >= member.nextXp) {
      member.xp -= member.nextXp;
      member.level += 1;
      member.nextXp = Math.floor(42 + member.level * member.level * 26);
      member.maxHp += member.id === "fighter" ? 9 : member.id === "priest" ? 6 : 5;
      if (member.hp > 0) member.hp = member.maxHp;
      member.baseAttack += member.id === "fighter" ? 2 : 1;
      member.baseDefense += member.id === "fighter" ? 2 : 1;
      if (member.level % 2 === 0) member.speed += 1;
      if (member.level % 3 === 0) member.luck += 1;
      if (member.id === "fighter" && member.level >= 7 && !member.spells.includes("rally")) member.spells.push("rally");
      this.refreshCharges(member, true);
    }
    if (member.level > before.level) {
      const newSpells = member.spells.filter((spellId) => !before.spells.includes(spellId)).map((spellId) => SPELLS[spellId]?.name ?? spellId);
      levelUps.push({
        characterId: member.id,
        name: member.name,
        oldLevel: before.level,
        newLevel: member.level,
        hpGain: member.maxHp - before.maxHp,
        mpGain: member.maxMp - before.maxMp,
        attackGain: member.baseAttack - before.attack,
        defenseGain: member.baseDefense - before.defense,
        speedGain: member.speed - before.speed,
        luckGain: member.luck - before.luck,
        newSpells,
        chargeLines: chargeDeltaLines(before.chargeMaxes, chargeMaxes(member))
      });
    }
  }
  return levelUps;
}

function rollVictoryLoot(this: CrystalOathSceneContext, enemies: EnemyState[]): BattleLootReward[] {
  const rewards = new Map<string, BattleLootReward>();
  for (const enemy of enemies) {
    if (Phaser.Math.Between(1, 100) <= POTION_DROP_CHANCE) addLootReward(rewards, "potion");
    if (Phaser.Math.Between(1, 100) <= RARE_DROP_CHANCE) addLootReward(rewards, RARE_LOOT_ITEM_ID);
  }
  return [...rewards.values()];
}

function addLootReward(rewards: Map<string, BattleLootReward>, itemId: string) {
  const existing = rewards.get(itemId);
  if (existing) {
    existing.quantity += 1;
    return;
  }
  rewards.set(itemId, {
    itemId,
    name: ITEMS[itemId]?.name ?? itemId,
    quantity: 1
  });
}

function rollGoldForEnemy(this: CrystalOathSceneContext, enemy: EnemyState) {
  const level = Math.max(1, Math.floor(enemy.level ?? 1));
  const min = level * 3;
  const max = level * 7 + 1;
  const multiplier = enemy.boss ? 3 : 1;
  return Phaser.Math.Between(min, max) * multiplier;
}

function chargeMaxes(member: CharacterState) {
  return {
    "1": member.charges["1"]?.max ?? 0,
    "2": member.charges["2"]?.max ?? 0,
    "3": member.charges["3"]?.max ?? 0
  };
}

function chargeDeltaLines(before: Record<string, number>, after: Record<string, number>) {
  const lines: string[] = [];
  for (const tier of ["1", "2", "3"]) {
    if ((after[tier] ?? 0) > (before[tier] ?? 0)) lines.push(`T${tier} slots ${before[tier] ?? 0}->${after[tier]}`);
  }
  return lines;
}

export function advanceBattleLog(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  if (this.battle.phase === "victory") {
    this.finishBattle(true);
    return;
  }
  if (this.allEnemiesDefeated() && this.battle.victoryAwarded) {
    this.finishBattle(true);
    return;
  }
  if (this.allPartyDefeated()) {
    this.mode = "gameOver";
    this.audio.setMode("title");
    return;
  }
  this.battle.phase = "resolving";
  this.battle.selected = 0;
  this.battle.actionTimer = BATTLE_TURN_DELAY_MS;
}

export function finishBattle(this: CrystalOathSceneContext, won: boolean) {
  if (!this.battle) return;
  const wasBoss = this.battle.kind === "boss";
  const dungeonId = this.battle.dungeonId;
  const bossId = this.battle.bossId;
  const refreshPostBattleLayers = () => {
    this.updateCloudOverlay(0);
    this.markDirty();
  };
  this.cleanupBattleFloatingTexts();
  if (this.battle.carousel) this.battle.carousel.dissolves = [];
  this.battle = undefined;
  if (!won) {
    this.mode = dungeonId ? "dungeon" : "world";
    this.syncAllVisualPositions();
    this.audio.setMode(this.mode === "dungeon" ? "dungeon" : "world");
    refreshPostBattleLayers();
    return;
  }
  if (wasBoss && dungeonId && bossId) {
    const dungeon = this.dungeons()[dungeonId];
    this.defeatedBosses.add(bossId);
    this.clearedDungeons.add(dungeonId);
    if (dungeon.relic) this.flags.relics[dungeon.relic] = true;
    this.mode = "dungeon";
    this.syncAllVisualPositions();
    this.audio.setMode("dungeon");
    const extra: string[] = [];
    if (dungeonId === "mossCave") {
      this.gold += 30;
      extra.push("The cave hoard yields 30 gold for passage.");
    }
    if (dungeonId === "tideShrine") {
      this.inventory.charteredCompass = Math.max(1, this.inventory.charteredCompass ?? 0);
      this.flags.travel.unlockedIsland3 = true;
      this.flags.travel.unlockedFrostmere = true;
      this.flags.travel.unlockedHighspire = true;
      this.flags.travel.unlockedAshfall = true;
      extra.push("The boss drops a Chartered Compass. Frostmere, Highspire, and Ashfall routes are now charted.");
    }
    if (dungeon.relic === "gale") {
      this.flags.skyship = true;
      extra.push("The Gale Relic reveals a high road. Visit Starfall Gate with all four relics.");
    }
    if (bossId === "eclipseCrown") {
      this.mode = "ending";
      this.audio.setMode("ending");
      this.saveGame();
      refreshPostBattleLayers();
      return;
    }
    this.saveGame();
    refreshPostBattleLayers();
    this.say([...dungeon.rewardText, ...extra], () => {
      this.mode = "dungeon";
      this.audio.setMode("dungeon");
      refreshPostBattleLayers();
    });
  } else {
    this.mode = dungeonId ? "dungeon" : "world";
    this.syncAllVisualPositions();
    this.audio.setMode(this.mode === "dungeon" ? "dungeon" : "world");
    refreshPostBattleLayers();
  }
}

export function physicalDamage(this: CrystalOathSceneContext, power: number, defense: number, luck: number) {
  const critical = Phaser.Math.Between(1, 100) <= Phaser.Math.Clamp(5 + luck, 5, 15);
  const amount = Math.max(1, power + Phaser.Math.Between(0, 4) - defense);
  return { amount: critical ? Math.floor(amount * 1.75) : amount, critical };
}

export function attackPower(this: CrystalOathSceneContext, actor: CharacterState): number {
  return actor.baseAttack + (WEAPONS[actor.weapon]?.power ?? 0);
}

export function defensePower(this: CrystalOathSceneContext, actor: CharacterState): number {
  return actor.baseDefense + (ARMORS[actor.armor]?.power ?? 0) + (actor.statuses.ward ? 4 : 0) + (actor.statuses.guarded ? 5 : 0);
}

export function effectiveEnemyDefense(this: CrystalOathSceneContext, enemy: EnemyState): number {
  return Math.max(0, enemy.defense + (enemy.statuses.guarded ? 5 : 0) - (enemy.statuses.weakness ? 5 : 0));
}

export function enemyDanger(this: CrystalOathSceneContext): number {
  if (!this.battle) return 0;
  return Math.max(...this.battle.enemies.filter((e) => e.hp > 0).map((e) => e.speed + e.attack / 3), 0);
}

export function partyAverage(this: CrystalOathSceneContext, stat: "speed" | "luck"): number {
  const living = this.party.filter((c) => c.hp > 0);
  return living.reduce((sum, c) => sum + c[stat], 0) / Math.max(1, living.length);
}

export function refreshCharges(this: CrystalOathSceneContext, member: CharacterState, fill: boolean) {
  const tier1 = member.id === "fighter" ? (member.level >= 7 ? 1 : 0) : 2 + Math.floor(member.level / 2);
  const tier2 = member.level >= 4 ? 1 + Math.floor((member.level - 4) / 3) : 0;
  const tier3 = member.level >= 8 ? 1 + Math.floor((member.level - 8) / 4) : 0;
  const maxes = { "1": tier1, "2": member.id === "fighter" ? (member.level >= 7 ? 1 : 0) : tier2, "3": member.id === "fighter" ? 0 : tier3 };
  for (const tier of ["1", "2", "3"]) {
    const current = member.charges[tier]?.current ?? 0;
    member.charges[tier] = { max: maxes[tier], current: fill ? maxes[tier] : Math.min(current, maxes[tier]) };
  }
  const currentMp = member.mp ?? 0;
  member.maxMp = battleMaxMpFor(member);
  member.mp = fill ? member.maxMp : Math.min(currentMp, member.maxMp);
}

export function battleSpellMpCost(this: CrystalOathSceneContext, spellId: string) {
  const spell = SPELLS[spellId];
  if (!spell) return 0;
  return spell.tier * 4 + (spell.target === "allAllies" || spell.target === "allEnemies" ? 2 : 0);
}

function battleMaxMpFor(member: CharacterState) {
  if (member.id === "fighter") return member.level >= 7 ? 10 + (member.level - 7) * 2 : 0;
  if (member.id === "priest") return 16 + member.level * 2;
  return 22 + member.level * 2;
}

export function applyWalkPoison(this: CrystalOathSceneContext) {
  if (this.lastStepFrame % 4 !== 0) return;
  for (const member of this.party) {
    if (member.hp > 1 && member.statuses.poison) member.hp -= 1;
  }
}

export function hasAllRelics(this: CrystalOathSceneContext): boolean {
  return this.flags.relics.root && this.flags.relics.flame && this.flags.relics.tide && this.flags.relics.gale;
}
