import Phaser from "phaser";
import type { CharacterState, EnemyState, PlayerSkillDef } from "../../data/gameDataTypes";
import { ITEMS } from "../../data/items";
import { PLAYER_SKILLS } from "../../data/playerSkills";
import { SPELLS } from "../../data/spells";
import type { BattleAction, BattleAnimation, BattleFloatingTextKind } from "./battleTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

let floatingTextId = 0;

export function queueBattleFloatingText(
  this: CrystalOathSceneContext,
  side: "party" | "enemy",
  actorId: string,
  amount: number,
  maxHp: number,
  kind: BattleFloatingTextKind,
  options: { critical?: boolean; text?: string } = {}
) {
  if (!this.battle) return;
  const sign = kind === "heal" ? "+" : kind === "damage" ? "-" : "";
  const numeric = Math.abs(amount);
  const anchor = this.battleActorCenter(side, actorId) ?? { x: 0, y: 0 };
  this.battle.floatingTexts ??= [];
  this.battle.floatingTexts.push({
    id: `float_${++floatingTextId}`,
    side,
    actorId,
    anchorX: anchor.x,
    anchorY: anchor.y,
    amount,
    maxHp,
    kind,
    critical: options.critical,
    text: options.text ?? `${sign}${numeric}`,
    createdAt: this.time.now,
    duration: options.critical ? 980 : 820,
    jitterX: Phaser.Math.Between(-8, 8)
  });
}

export function remainingBattleFloatingTextMs(this: CrystalOathSceneContext) {
  if (!this.battle?.floatingTexts?.length) return 0;
  const now = this.time.now;
  let remaining = 0;
  this.battle.floatingTexts = this.battle.floatingTexts.filter((entry) => {
    const entryRemaining = entry.duration - (now - entry.createdAt);
    if (entryRemaining <= 0) return false;
    remaining = Math.max(remaining, entryRemaining);
    return true;
  });
  return remaining;
}

export function cleanupBattleFloatingTexts(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  this.battle.floatingTexts = [];
}

export function confirmBattleSelection(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  const actor = this.currentBattleActor();
  if (!actor) return;
  if (this.battle.phase === "command") {
    const command = this.battleOptions()[this.battle.selected];
    if (command === "Attack") {
      this.battle.pendingAction = { side: "party", actorId: actor.id, type: "attack" };
      this.battle.phase = "target";
      this.battle.selected = 0;
    } else if (command === "Skill") {
      const skills = this.skillsForActor(actor);
      if (!skills.length) {
        this.battle.log = [`${actor.name} has no skills.`];
      } else {
        this.battle.phase = "skill";
        this.battle.selected = 0;
      }
    } else if (command === "Magic") {
      if (!actor.spells.length || this.statusActive(actor, "silence")) {
        this.battle.log = [this.statusActive(actor, "silence") ? `${actor.name} is silenced.` : `${actor.name} knows no spells.`];
      } else {
        this.battle.phase = "spell";
        this.battle.selected = 0;
      }
    } else if (command === "Item") {
      if (!Object.keys(ITEMS).some((id) => ITEMS[id].battle && (this.inventory[id] ?? 0) > 0)) {
        this.battle.log = ["No battle items."];
      } else {
        this.battle.phase = "item";
        this.battle.selected = 0;
      }
    } else if (command === "Defend") {
      this.executePlayerAction({ side: "party", actorId: actor.id, type: "defend" });
    } else if (command === "Run") {
      this.executePlayerAction({ side: "party", actorId: actor.id, type: "run" });
    }
    return;
  }
  if (this.battle.phase === "skill") {
    const skills = this.skillsForActor(actor);
    const skill = skills[this.battle.selected];
    if (!skill) return;
    const cooldown = actor.skillCooldowns[skill.id] ?? 0;
    if (cooldown > 0) {
      this.battle.log = [`${skill.name} needs ${cooldown} more turn${cooldown === 1 ? "" : "s"}.`];
      return;
    }
    this.battle.pendingAction = { side: "party", actorId: actor.id, type: "skill", skillId: skill.id };
    if (skill.target === "enemy") {
      this.battle.phase = "target";
      this.battle.selected = 0;
    } else if (skill.target === "ally") {
      this.battle.phase = "allyTarget";
      this.battle.selected = 0;
    } else {
      this.executePlayerAction(this.battle.pendingAction as BattleAction);
    }
    return;
  }
  if (this.battle.phase === "target") {
    const living = this.battle.enemies.filter((e) => e.hp > 0);
    const target = living[this.battle.selected];
    const targetIndex = this.battle.enemies.indexOf(target);
    this.executePlayerAction({ ...(this.battle.pendingAction as BattleAction), targetIndex });
    return;
  }
  if (this.battle.phase === "spell") {
    const spells = actor.spells.filter((id) => actor.level >= SPELLS[id].minLevel);
    const spellId = spells[this.battle.selected];
    if (!spellId) return;
    const spell = SPELLS[spellId];
    const charge = actor.charges[String(spell.tier)];
    if (!charge || charge.current <= 0) {
      this.battle.log = [`No T${spell.tier} charges left.`];
      return;
    }
    this.battle.pendingAction = { side: "party", actorId: actor.id, type: "spell", spellId };
    if (spell.target === "enemy") {
      this.battle.phase = "target";
      this.battle.selected = 0;
    } else if (spell.target === "ally") {
      this.battle.phase = "allyTarget";
      this.battle.selected = 0;
    } else {
      this.executePlayerAction(this.battle.pendingAction as BattleAction);
    }
    return;
  }
  if (this.battle.phase === "item") {
    const itemIds = Object.keys(ITEMS).filter((id) => ITEMS[id].battle && (this.inventory[id] ?? 0) > 0);
    const itemId = itemIds[this.battle.selected];
    if (!itemId) return;
    this.battle.pendingAction = { side: "party", actorId: actor.id, type: "item", itemId };
    if (itemId === "smokeBomb" || itemId === "etherleaf") this.executePlayerAction(this.battle.pendingAction as BattleAction);
    else {
      this.battle.phase = "allyTarget";
      this.battle.selected = 0;
    }
    return;
  }
  if (this.battle.phase === "allyTarget") {
    this.executePlayerAction({ ...(this.battle.pendingAction as BattleAction), targetIndex: this.battle.selected });
  }
}

export function executePlayerAction(this: CrystalOathSceneContext, action: BattleAction) {
  if (!this.battle) return;
  this.queueBattleActionAnimation(action);
}

export function queueBattleActionAnimation(this: CrystalOathSceneContext, action: BattleAction) {
  if (!this.battle) return;
  const target = this.battleAnimationTarget(action);
  this.battle.phase = "resolving";
  this.battle.pendingAction = undefined;
  this.battle.selected = 0;
  this.battle.actionTimer = 0;
  this.battle.animation = {
    action,
    elapsed: 0,
    duration: 390,
    impactAt: 155,
    resolved: false,
    ...target
  };
  this.markDirty();
}

export function battleAnimationTarget(this: CrystalOathSceneContext, action: BattleAction): Pick<BattleAnimation, "targetSide" | "targetActorId"> {
  if (!this.battle) return {};
  if (action.side === "enemy") return {};
  if (action.type === "attack") {
    const target = this.battle.enemies[action.targetIndex ?? -1] ?? this.battle.enemies.find((enemy) => enemy.hp > 0);
    return target ? { targetSide: "enemy", targetActorId: target.uid } : {};
  }
  if (action.type === "skill" && action.skillId) {
    const skill = PLAYER_SKILLS[action.skillId];
    if (skill.target === "enemy") {
      const target = this.battle.enemies[action.targetIndex ?? -1] ?? this.battle.enemies.find((enemy) => enemy.hp > 0);
      return target ? { targetSide: "enemy", targetActorId: target.uid } : {};
    }
    const target = skill.target === "self" ? this.party.find((member) => member.id === action.actorId) : this.party[action.targetIndex ?? 0];
    return target ? { targetSide: "party", targetActorId: target.id } : {};
  }
  if (action.type === "spell" && action.spellId) {
    const spell = SPELLS[action.spellId];
    if (spell.target === "enemy") {
      const target = this.battle.enemies[action.targetIndex ?? -1] ?? this.battle.enemies.find((enemy) => enemy.hp > 0);
      return target ? { targetSide: "enemy", targetActorId: target.uid } : {};
    }
    if (spell.target === "ally" || spell.target === "self") {
      const target = spell.target === "self" ? this.party.find((member) => member.id === action.actorId) : this.party[action.targetIndex ?? 0];
      return target ? { targetSide: "party", targetActorId: target.id } : {};
    }
  }
  if (action.type === "item" && action.itemId && !["smokeBomb", "etherleaf"].includes(action.itemId)) {
    const target = this.party[action.targetIndex ?? 0];
    return target ? { targetSide: "party", targetActorId: target.id } : {};
  }
  return {};
}

export function cancelBattleSubmenu(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  if (this.battle.phase === "command") {
    this.audio.blip("cancel");
    return;
  }
  this.battle.phase = "command";
  this.battle.pendingAction = undefined;
  this.battle.selected = 0;
  this.audio.blip("cancel");
}

export function finishCurrentTurn(this: CrystalOathSceneContext, delay: number) {
  if (!this.battle) return;
  const actor = this.battle.current ? this.actorForEntry(this.battle.current) : undefined;
  if (actor && actor.hp > 0) this.tickStatus(actor);
  if (this.checkBattleEnd()) return;
  this.battle.pendingAction = undefined;
  this.battle.selected = 0;
  if (delay <= 0) {
    this.advanceBattleAfterDelay();
    this.markDirty();
    return;
  }
  this.battle.phase = "resolving";
  this.battle.actionTimer = delay;
  this.markDirty();
}

export function resolvePartyAction(this: CrystalOathSceneContext, action: BattleAction): boolean {
  if (!this.battle) return false;
  const actor = this.party.find((c) => c.id === action.actorId);
  if (!actor || actor.hp <= 0) return true;
  this.battle.log = [];
  if (action.type === "defend") {
    actor.defending = true;
    this.battle.log.push(`${actor.name} defends.`);
    return true;
  }
  if (action.type === "run") {
    if (!this.battle.canRun) {
      this.battle.log.push("There is no escape!");
      return true;
    }
    const chance = 42 + this.partyAverage("speed") * 4 + this.partyAverage("luck") * 2 - this.enemyDanger();
    if (Phaser.Math.Between(1, 100) <= chance) {
      this.battle.log.push("The party escaped!");
      this.finishBattle(false);
    } else this.battle.log.push("Could not escape!");
    return true;
  }
  if (action.type === "attack") {
    const target = this.getLivingEnemy(action.targetIndex);
    if (!target) return false;
    const damage = this.physicalDamage(this.attackPower(actor), this.effectiveEnemyDefense(target), actor.luck);
    target.hp = Math.max(0, target.hp - damage.amount);
    this.queueBattleFloatingText("enemy", target.uid, -damage.amount, target.maxHp, "damage", { critical: damage.critical });
    this.battle.log.push(`${actor.name} hits ${target.name} for ${damage.amount}${damage.critical ? " critical" : ""}.`);
    this.audio.blip("hit");
    return true;
  }
  if (action.type === "skill" && action.skillId) {
    return this.usePlayerSkill(actor, action.skillId, action.targetIndex);
  }
  if (action.type === "spell" && action.spellId) {
    return this.castSpell(actor, action.spellId, action.targetIndex);
  }
  if (action.type === "item" && action.itemId) {
    return this.useBattleItem(actor, action.itemId, action.targetIndex);
  }
  return false;
}

export function resolveEnemyAction(this: CrystalOathSceneContext, action: BattleAction): boolean {
  if (!this.battle) return false;
  const enemy = this.battle.enemies.find((e) => e.uid === action.actorId);
  if (!enemy || enemy.hp <= 0) return true;
  this.battle.log = [];
  const move = enemy.intent?.move ?? Phaser.Utils.Array.GetRandom(enemy.moves);
  if (enemy.intent?.message) this.battle.log.push(enemy.intent.message);
  enemy.intent = undefined;
  if (move.kind === "defend") {
    enemy.statuses.guarded = 2;
    this.battle.log.push(`${enemy.name} braces behind its guard.`);
    enemy.intent = this.planEnemyIntent(enemy);
    return true;
  }
  if (move.kind === "heal") {
    const allies = this.battle.enemies.filter((candidate) => candidate.hp > 0);
    const target = allies.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] ?? enemy;
    const amount = Math.min(target.maxHp - target.hp, move.power + Phaser.Math.Between(0, 8));
    target.hp += Math.max(0, amount);
    if (amount > 0) this.queueBattleFloatingText("enemy", target.uid, amount, target.maxHp, "heal");
    this.battle.log.push(`${enemy.name}'s ${move.name} restores ${amount} HP to ${target.name}.`);
    enemy.intent = this.planEnemyIntent(enemy);
    return true;
  }
  if (move.kind === "charge") {
    enemy.statuses.guarded = 2;
    enemy.statuses.charged = 2;
    this.battle.log.push(`${enemy.name} gathers power for the next strike.`);
    enemy.intent = this.planEnemyIntent(enemy);
    return true;
  }
  if (move.kind === "steal") {
    const stolen = Math.min(this.gold, move.power + Phaser.Math.Between(0, 8));
    this.gold -= stolen;
    const target = this.randomLivingPartyMember();
    if (target) {
      const chip = Math.max(1, enemy.attack - this.defensePower(target) + 3);
      target.hp = Math.max(0, target.hp - chip);
      this.queueBattleFloatingText("party", target.id, -chip, target.maxHp, "damage");
      this.battle.log.push(`${enemy.name}'s ${move.name} clips ${target.name} for ${chip} and steals ${stolen} gold.`);
    } else this.battle.log.push(`${enemy.name} steals ${stolen} gold.`);
    enemy.intent = this.planEnemyIntent(enemy);
    return true;
  }
  if (move.kind === "status") {
    const targets = move.target === "all" ? this.party.filter((c) => c.hp > 0) : [this.randomLivingPartyMember()].filter(Boolean) as CharacterState[];
    for (const target of targets) {
      if (Phaser.Math.Between(1, 100) <= 58) {
        target.statuses[move.status!] = move.status === "poison" ? 99 : Phaser.Math.Between(2, 4);
        this.battle.log.push(`${enemy.name}'s ${move.name} inflicts ${move.status} on ${target.name}.`);
      } else this.battle.log.push(`${target.name} resists ${move.name}.`);
    }
    enemy.intent = this.planEnemyIntent(enemy);
    return true;
  }
  const targets = move.target === "all" ? this.party.filter((c) => c.hp > 0) : [this.randomLivingPartyMember()].filter(Boolean) as CharacterState[];
  for (const target of targets) {
    const raw = enemy.attack + move.power + (enemy.statuses.charged ? 8 : 0) + Phaser.Math.Between(0, 4);
    let damage = Math.max(1, raw - this.defensePower(target));
    if (target.defending) damage = Math.ceil(damage * 0.45);
    if (target.statuses.guarded) damage = Math.ceil(damage * 0.55);
    if (target.statuses.starveil) damage = Math.ceil(damage * 0.65);
    target.hp = Math.max(0, target.hp - damage);
    this.queueBattleFloatingText("party", target.id, -damage, target.maxHp, "damage");
    this.battle.log.push(`${enemy.name}'s ${move.name} hits ${target.name} for ${damage}.`);
    if (move.status && target.hp > 0 && Phaser.Math.Between(1, 100) <= 40) {
      target.statuses[move.status] = move.status === "poison" ? 99 : 3;
      this.battle.log.push(`${target.name} suffers ${move.status}.`);
    }
    this.audio.blip("hit");
  }
  if (enemy.statuses.charged) delete enemy.statuses.charged;
  enemy.intent = this.planEnemyIntent(enemy);
  return true;
}

export function usePlayerSkill(this: CrystalOathSceneContext, actor: CharacterState, skillId: string, targetIndex?: number): boolean {
  if (!this.battle) return false;
  const skill = PLAYER_SKILLS[skillId];
  if (!skill) return false;
  if ((actor.skillCooldowns[skill.id] ?? 0) > 0) {
    this.battle.log.push(`${skill.name} is still cooling down.`);
    return false;
  }
  this.battle.log = [];
  if (skill.id === "powerStrike") {
    const target = this.getLivingEnemy(targetIndex);
    if (!target) return false;
    const damage = this.physicalDamage(this.attackPower(actor) + 12, this.effectiveEnemyDefense(target), actor.luck);
    target.hp = Math.max(0, target.hp - damage.amount);
    this.queueBattleFloatingText("enemy", target.uid, -damage.amount, target.maxHp, "damage", { critical: damage.critical });
    this.battle.log.push(`${actor.name} uses Power Strike for ${damage.amount}${damage.critical ? " critical" : ""}.`);
    this.setSkillCooldown(actor, skill);
    this.audio.blip("hit");
    return true;
  }
  if (skill.id === "guardBreak") {
    const target = this.getLivingEnemy(targetIndex);
    if (!target) return false;
    const damage = this.physicalDamage(this.attackPower(actor) + 4, this.effectiveEnemyDefense(target), actor.luck);
    target.hp = Math.max(0, target.hp - damage.amount);
    this.queueBattleFloatingText("enemy", target.uid, -damage.amount, target.maxHp, "damage", { critical: damage.critical });
    target.statuses.weakness = 3;
    this.battle.log.push(`${actor.name} cracks ${target.name}'s guard for ${damage.amount}. Weakness takes hold.`);
    this.setSkillCooldown(actor, skill);
    this.audio.blip("hit");
    return true;
  }
  if (skill.id === "quickSlash") {
    const target = this.getLivingEnemy(targetIndex);
    if (!target) return false;
    const damage = this.physicalDamage(this.attackPower(actor) - 1, this.effectiveEnemyDefense(target), actor.luck + 10);
    target.hp = Math.max(0, target.hp - damage.amount);
    this.queueBattleFloatingText("enemy", target.uid, -damage.amount, target.maxHp, "damage", { critical: damage.critical });
    this.battle.log.push(`${actor.name} flashes in with Quick Slash for ${damage.amount}${damage.critical ? " critical" : ""}.`);
    this.setSkillCooldown(actor, skill);
    this.audio.blip("hit");
    return true;
  }
  if (skill.id === "fireSpark") {
    const target = this.getLivingEnemy(targetIndex);
    if (!target) return false;
    let amount = 22 + actor.level * 4 + Phaser.Math.Between(0, 7) - Math.floor(target.defense / 2);
    if (target.weak.includes("fire")) amount = Math.floor(amount * 1.45);
    if (target.resist.includes("fire")) amount = Math.floor(amount * 0.55);
    amount = Math.max(3, amount);
    target.hp = Math.max(0, target.hp - amount);
    this.queueBattleFloatingText("enemy", target.uid, -amount, target.maxHp, "damage");
    if (Phaser.Math.Between(1, 100) <= 45) target.statuses.burn = 3;
    this.battle.log.push(`${actor.name} casts Fire Spark. ${target.name} takes ${amount}${target.statuses.burn ? " and burns" : ""}.`);
    this.setSkillCooldown(actor, skill);
    this.audio.blip("spell");
    return true;
  }
  if (skill.id === "firstAid") {
    const target = this.party[targetIndex ?? this.party.indexOf(actor)];
    if (!target || target.hp <= 0) {
      this.battle.log.push("First Aid needs a standing ally.");
      return false;
    }
    const amount = 22 + actor.level * 3;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    const recovered = target.hp - before;
    if (recovered > 0) this.queueBattleFloatingText("party", target.id, recovered, target.maxHp, "heal");
    delete target.statuses.bleed;
    this.battle.log.push(`${actor.name} uses First Aid. ${target.name} recovers ${amount}.`);
    this.setSkillCooldown(actor, skill);
    this.audio.blip("spell");
    return true;
  }
  if (skill.id === "focus") {
    actor.statuses.guarded = 2;
    for (const tier of ["1", "2", "3"]) {
      const charge = actor.charges[tier];
      if (charge && charge.current < charge.max) {
        charge.current += 1;
        break;
      }
    }
    this.battle.log.push(`${actor.name} focuses, guarding and steadying their magic.`);
    this.setSkillCooldown(actor, skill);
    this.audio.blip("spell");
    return true;
  }
  return false;
}

export function setSkillCooldown(this: CrystalOathSceneContext, actor: CharacterState, skill: PlayerSkillDef) {
  actor.skillCooldowns[skill.id] = skill.cooldown;
}

export function castSpell(this: CrystalOathSceneContext, actor: CharacterState, spellId: string, targetIndex?: number): boolean {
  if (!this.battle) return false;
  const spell = SPELLS[spellId];
  const charge = actor.charges[String(spell.tier)];
  if (!charge || charge.current <= 0) {
    this.battle.log.push(`${actor.name} lacks a T${spell.tier} charge.`);
    return false;
  }
  if (spell.kind === "heal") {
    const targets = spell.target === "allAllies" ? this.party.filter((c) => c.hp > 0) : [this.party[targetIndex ?? 0]].filter(Boolean);
    if (!targets.some((target) => target.hp > 0)) {
      this.battle.log.push(`${spell.name} needs a standing ally.`);
      return false;
    }
    charge.current -= 1;
    this.audio.blip("spell");
    for (const target of targets) {
      if (target.hp <= 0) continue;
      const amount = spell.power + actor.level * 4 + Phaser.Math.Between(0, 8);
      const before = target.hp;
      target.hp = Math.min(target.maxHp, target.hp + amount);
      const recovered = target.hp - before;
      if (recovered > 0) this.queueBattleFloatingText("party", target.id, recovered, target.maxHp, "heal");
      this.battle.log.push(`${actor.name} casts ${spell.name}. ${target.name} recovers ${amount}.`);
    }
    return true;
  }
  if (spell.kind === "revive") {
    const target = this.party[targetIndex ?? 0];
    if (!target || target.hp > 0) {
      this.battle.log.push(`${spell.name} finds no fallen ally.`);
      return false;
    }
    charge.current -= 1;
    this.audio.blip("spell");
    target.hp = Math.max(1, Math.floor(target.maxHp * 0.35));
    target.statuses = {};
    this.queueBattleFloatingText("party", target.id, target.hp, target.maxHp, "heal", { text: `+${target.hp}` });
    this.battle.log.push(`${target.name} rises with ${target.hp} HP.`);
    return true;
  }
  if (spell.kind === "buff") {
    const targets = spell.target === "allAllies" ? this.party.filter((c) => c.hp > 0) : [this.party[targetIndex ?? 0]].filter(Boolean);
    if (!targets.some((target) => target.hp > 0)) {
      this.battle.log.push(`${spell.name} needs a standing ally.`);
      return false;
    }
    charge.current -= 1;
    this.audio.blip("spell");
    for (const target of targets) {
      if (spell.id === "starveil") target.statuses.starveil = 4;
      else target.statuses.ward = 4;
    }
    this.battle.log.push(`${actor.name} casts ${spell.name}. A guard of starlight rises.`);
    return true;
  }
  const targets = spell.target === "allEnemies" ? this.battle.enemies.filter((e) => e.hp > 0) : [this.getLivingEnemy(targetIndex)].filter(Boolean) as EnemyState[];
  if (!targets.length) return false;
  charge.current -= 1;
  this.audio.blip("spell");
  for (const target of targets) {
    let amount = spell.power + actor.level * 5 + Phaser.Math.Between(0, 8) - Math.floor(this.effectiveEnemyDefense(target) / 2);
    if (target.weak.includes(spell.element)) amount = Math.floor(amount * 1.45);
    if (target.resist.includes(spell.element)) amount = Math.floor(amount * 0.55);
    if (target.statuses.weakness) amount = Math.floor(amount * 1.2);
    if (target.statuses.guarded) amount = Math.ceil(amount * 0.7);
    amount = Math.max(2, amount);
    target.hp = Math.max(0, target.hp - amount);
    this.queueBattleFloatingText("enemy", target.uid, -amount, target.maxHp, "damage");
    this.battle.log.push(`${actor.name} casts ${spell.name}. ${target.name} takes ${amount}.`);
  }
  return true;
}

export function useBattleItem(this: CrystalOathSceneContext, actor: CharacterState, itemId: string, targetIndex?: number): boolean {
  if (!this.battle) return false;
  if ((this.inventory[itemId] ?? 0) <= 0) {
    this.battle.log.push(`No ${ITEMS[itemId]?.name ?? "item"} left.`);
    return false;
  }
  if (itemId === "smokeBomb") {
    if (!this.battle.canRun) {
      this.battle.log.push("Smoke curls, but the boss will not let you flee.");
      return false;
    } else {
      this.inventory[itemId] -= 1;
      this.battle.log.push(`${actor.name} throws a Smoke Bomb. The party escapes.`);
      this.finishBattle(false);
    }
    return true;
  }
  if (itemId === "etherleaf") {
    this.inventory[itemId] -= 1;
    for (const member of this.party) {
      for (const tier of ["1", "2", "3"]) {
        const charge = member.charges[tier];
        if (charge) charge.current = Math.min(charge.max, charge.current + 1);
      }
    }
    this.battle.log.push(`${actor.name} crushes Etherleaf. Spell charges return.`);
    return true;
  }
  const target = this.party[targetIndex ?? 0];
  if (!target) return false;
  if (itemId === "potion") {
    if (target.hp <= 0) {
      this.battle.log.push("Potion needs a standing ally.");
      return false;
    }
    this.inventory[itemId] -= 1;
    const amount = 35;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    const recovered = target.hp - before;
    if (recovered > 0) this.queueBattleFloatingText("party", target.id, recovered, target.maxHp, "heal");
    this.battle.log.push(`${actor.name} uses Potion. ${target.name} recovers ${amount}.`);
    return true;
  } else if (itemId === "antidote") {
    if (!target.statuses.poison) {
      this.battle.log.push(`${target.name} is not poisoned.`);
      return false;
    }
    this.inventory[itemId] -= 1;
    delete target.statuses.poison;
    this.battle.log.push(`${target.name}'s poison fades.`);
    return true;
  } else if (itemId === "phoenixAsh") {
    if (target.hp > 0) {
      this.battle.log.push(`${target.name} is already standing.`);
      return false;
    }
    this.inventory[itemId] -= 1;
    target.hp = Math.floor(target.maxHp * 0.35);
    target.statuses = {};
    this.queueBattleFloatingText("party", target.id, target.hp, target.maxHp, "heal", { text: `+${target.hp}` });
    this.battle.log.push(`${target.name} rises from Phoenix Ash.`);
    return true;
  }
  return false;
}

export function getLivingEnemy(this: CrystalOathSceneContext, index?: number): EnemyState | undefined {
  if (!this.battle) return undefined;
  let target = typeof index === "number" ? this.battle.enemies[index] : undefined;
  if (!target || target.hp <= 0) {
    target = Phaser.Utils.Array.GetRandom(this.battle.enemies.filter((e) => e.hp > 0));
  }
  return target;
}
