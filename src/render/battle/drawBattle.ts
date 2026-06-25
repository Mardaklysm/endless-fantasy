import Phaser from "phaser";
import { HEIGHT, LAYER_BATTLE_IMAGE, LAYER_UI_IMAGE, LAYER_WORLD_IMAGE, PIXEL_ART_SCALE, WIDTH } from "../../app/config";
import { ENEMY_TEXTURES, PARTY_CLASS, PORTRAIT_TEXTURES } from "../../assets/textureKeys";
import {
  HERO_BATTLE_TARGET_HEIGHT,
  battlePlayerSlotOrigin,
  battlePlayerSlotSize,
  battlePlayerSpriteCellWidth,
  battlePlayerSpriteVisualHeight
} from "../../data/battleSpritePresentation";
import { resolveBattleSpawnPositions } from "../../data/battleMapSpawns";
import type { BattleSpawnFacing } from "../../data/battleMapSpawns";
import type { CharacterState, EnemyState, StatusState } from "../../data/gameDataTypes";
import { ITEMS } from "../../data/items";
import { SPELLS } from "../../data/spells";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";
import type { Vec } from "../../scene/sceneTypes";
import type {
  BattleCarouselCardSnapshot,
  BattleCarouselDissolveParticle,
  BattleEnemyDeathDissolve,
  BattleLevelUpReward,
  BattleVictoryRewards,
  InitiativeEntry
} from "../../systems/battle/battleTypes";

type BattleCarouselCard = {
  key: string;
  side: "party" | "enemy";
  actorId: string;
  name: string;
  current: boolean;
  down: boolean;
};

type BattleActorVisualFeedback = {
  offset: Vec;
  flashAlpha: number;
  tint?: number;
};

const BATTLE_UI = {
  shadow: 0x01040c,
  panel: 0x07101d,
  panelInner: 0x0b1525,
  panelWarm: 0x151722,
  gold: 0xb78a45,
  goldBright: 0xffe0a0,
  text: "#ffffff",
  mutedText: "#8e98aa",
  hp: 0x5be17a,
  mp: 0x1fb7ff,
  slotReady: 0x7fc8ff,
  slotSpent: 0x1b2638
};

const COMMAND_ICONS: Record<string, "attack" | "skill" | "magic" | "item" | "defend" | "run"> = {
  Attack: "attack",
  Skill: "skill",
  Magic: "magic",
  Item: "item",
  Defend: "defend",
  Run: "run"
};

const BATTLE_COMMANDS = ["Attack", "Magic", "Skill", "Item", "Defend", "Run"];

export function drawBattle(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  this.drawBattleBackdrop();
  if (this.battle.phase === "victory") {
    this.drawBattleVictoryDialog();
    return;
  }
  const selectedEnemy = this.selectedBattleEnemy();
  const selectedAlly = this.selectedBattleAlly();
  const targetingEnemies = this.battle.phase === "target";
  const targetingAllies = this.battle.phase === "allyTarget";
  const targetingAll = !!this.battle.pendingAction?.targetAll;
  this.battle.enemies.forEach((enemy, idx) => {
    const deathDissolve = this.battleEnemyDeathDissolve(enemy.uid);
    if (enemy.hp <= 0 && !deathDissolve) return;
    const slot = this.enemyBattleSlot(enemy, idx);
    if (deathDissolve) {
      const progress = Phaser.Math.Clamp((this.time.now - deathDissolve.createdAt) / deathDissolve.duration, 0, 1);
      const fadeAlpha = Math.max(0, 1 - progress * 1.35);
      if (fadeAlpha > 0.04) {
        this.drawActorShadow(slot.x + slot.size / 2, slot.y + slot.size - 3, slot.size * 0.76, Math.max(10, slot.size * 0.13), 0.22 * fadeAlpha);
        this.drawEnemySprite(enemy, slot.x, slot.y, enemy.boss ? 5 : 4, slot.size, fadeAlpha, progress < 0.22 ? 0xff4a4a : undefined);
      }
      this.drawBattleEnemyDeathDissolve(deathDissolve);
      return;
    }
    const targeted = targetingEnemies && targetingAll ? enemy.hp > 0 : selectedEnemy?.uid === enemy.uid;
    const offset = this.battleActorOffset("enemy", enemy.uid);
    const feedback = this.battleActorVisualFeedback("enemy", enemy.uid);
    this.drawBattleEnemy(enemy, slot.x + offset.x + feedback.offset.x, slot.y + offset.y + feedback.offset.y, slot.size, targeted, feedback);
  });
  this.party.forEach((member, idx) => {
    const slot = this.partyBattleSlot(idx);
    const offset = this.battleActorOffset("party", member.id);
    const feedback = this.battleActorVisualFeedback("party", member.id);
    const active =
      this.currentBattleEntry()?.side === "party" &&
      this.currentBattleEntry()?.actorId === member.id;
    const targeted = targetingAllies && targetingAll ? member.hp > 0 : selectedAlly?.id === member.id;
    this.drawPartyBattler(member, slot.x + offset.x + feedback.offset.x, slot.y + offset.y + feedback.offset.y, idx, active, slot.facing, targeted, feedback);
  });
  this.drawBattleFloatingTexts();
  this.drawBattleTurnCarousel();
  this.drawBattlePartyStatusHud();
  this.drawBattleCommandMenu();
  this.drawBattleLogPrompt();
  this.drawBattleDebugLogOverlay();
  this.drawBattleVictoryDialog();
}

export function drawBattleBackdrop(this: CrystalOathSceneContext) {
  const background = this.battle?.background;
  if (background && this.hasTexture(background)) {
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    this.drawTexture(background, 0, 0, WIDTH, HEIGHT, LAYER_WORLD_IMAGE);
    this.g.fillStyle(0x000000, 0.08).fillRect(0, 0, WIDTH, 42);
    this.g.fillStyle(0x000000, 0.08).fillRect(0, HEIGHT - 34, WIDTH, 34);
    return;
  }
  this.g.fillStyle(0x0a1422, 1).fillRect(0, 0, WIDTH, HEIGHT);
  this.g.fillStyle(0x182b40, 1).fillRect(0, 0, WIDTH, 110);
  this.g.fillStyle(0x233d4b, 1).fillRect(0, 110, 960, 62);
  this.g.fillStyle(0x10251d, 1).fillRect(0, 155, 960, 82);
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 61) % WIDTH;
    const h = 48 + (i % 5) * 17;
    this.g.fillStyle(0x152319, 1).fillRect(x, 105 - (i % 3) * 10, 13, h);
    this.g.fillStyle(i % 2 ? 0x183a25 : 0x214b2e, 1).fillCircle(x + 8, 94 - (i % 3) * 10, 34 + (i % 4) * 5);
    this.g.fillStyle(0x0c1c14, 0.55).fillCircle(x + 24, 118, 24);
  }
  this.g.fillStyle(0x3a5734, 1).fillRect(0, 218, WIDTH, 172);
  this.g.fillStyle(0x667448, 1).fillEllipse(430, 328, 840, 128);
  this.g.fillStyle(0x856f4c, 1).fillEllipse(426, 330, 790, 92);
  this.g.fillStyle(0x4d653c, 0.8).fillRect(0, 356, WIDTH, 34);
  this.g.fillStyle(0x000000, 0.18).fillRect(0, 0, WIDTH, HEIGHT);
}

export function enemyBattleSlot(this: CrystalOathSceneContext, enemy: EnemyState, idx: number): { x: number; y: number; size: number; facing?: BattleSpawnFacing } {
  const layout = this.currentBattleSpawnLayout();
  return layout.enemySlots[idx] ?? (enemy.boss ? { x: 130, y: 98, size: 150, facing: "right" } : { x: 86, y: 116, size: 88, facing: "right" });
}

export function partyBattleSlot(this: CrystalOathSceneContext, idx: number): { x: number; y: number; size: number; facing?: BattleSpawnFacing } {
  const layout = this.currentBattleSpawnLayout();
  const origin = battlePlayerSlotOrigin();
  return layout.playerSlots[idx] ?? { x: 678 - origin.bodyCenterX, y: 152 - origin.feetBaselineY, size: battlePlayerSlotSize(), facing: "left" };
}

export function currentBattleSpawnLayout(this: CrystalOathSceneContext) {
  return resolveBattleSpawnPositions({
    battleMapId: this.battle?.battleMapId,
    background: this.battle?.background,
    partyCount: this.party.length,
    enemies: this.battle?.enemies ?? [],
    encounterKind: this.battle?.kind === "boss" ? "boss" : "normal"
  });
}

export function battleActorCenter(this: CrystalOathSceneContext, side: "party" | "enemy", actorId: string): Vec | undefined {
  if (!this.battle) return undefined;
  if (side === "party") {
    const idx = this.party.findIndex((member) => member.id === actorId);
    if (idx < 0) return undefined;
    const slot = this.partyBattleSlot(idx);
    const origin = battlePlayerSlotOrigin();
    return { x: slot.x + origin.bodyCenterX, y: slot.y + origin.feetBaselineY - Math.round(HERO_BATTLE_TARGET_HEIGHT * 0.58) };
  }
  const enemy = this.battle.enemies.find((candidate) => candidate.uid === actorId);
  if (!enemy) return undefined;
  const slot = this.enemyBattleSlot(enemy, this.battle.enemies.indexOf(enemy));
  return { x: slot.x + slot.size / 2, y: slot.y + slot.size * 0.52 };
}

export function battleActorOffset(this: CrystalOathSceneContext, side: "party" | "enemy", actorId: string): Vec {
  const animation = this.battle?.animation;
  if (!animation || animation.action.side !== side || animation.action.actorId !== actorId) return { x: 0, y: 0 };
  const actor = this.battleActorCenter(side, actorId);
  const target =
    animation.targetSide && animation.targetActorId ? this.battleActorCenter(animation.targetSide, animation.targetActorId) : undefined;
  let vx = (target?.x ?? actor?.x ?? 0) - (actor?.x ?? 0);
  let vy = (target?.y ?? actor?.y ?? 0) - (actor?.y ?? 0);
  if (!target || Math.hypot(vx, vy) < 1) {
    vx = side === "party" ? -1 : 1;
    vy = 0;
  }
  const length = Math.max(1, Math.hypot(vx, vy));
  const outward = Phaser.Math.Clamp(animation.elapsed / animation.impactAt, 0, 1);
  const inward = Phaser.Math.Clamp((animation.elapsed - animation.impactAt) / Math.max(1, animation.duration - animation.impactAt), 0, 1);
  const phase = animation.elapsed <= animation.impactAt ? Phaser.Math.Easing.Cubic.Out(outward) : 1 - Phaser.Math.Easing.Cubic.In(inward);
  const distance = side === "party" ? (animation.targetSide ? 44 : 30) : 32;
  return { x: (vx / length) * distance * phase, y: (vy / length) * distance * phase };
}

export function battleActorVisualFeedback(this: CrystalOathSceneContext, side: "party" | "enemy", actorId: string): BattleActorVisualFeedback {
  if (!this.battle?.hitReactions?.length) return { offset: { x: 0, y: 0 }, flashAlpha: 0 };
  const now = this.time.now;
  let active = this.battle.hitReactions.find((entry) => entry.side === side && entry.actorId === actorId);
  this.battle.hitReactions = this.battle.hitReactions.filter((entry) => now - entry.createdAt < entry.duration);
  if (!active || now - active.createdAt >= active.duration) return { offset: { x: 0, y: 0 }, flashAlpha: 0 };
  const progress = Phaser.Math.Clamp((now - active.createdAt) / active.duration, 0, 1);
  const recoilPhase = Math.sin(progress * Math.PI);
  const flashPulse = 0.74 + 0.26 * Math.sin(progress * Math.PI * 8);
  const flashAlpha = Phaser.Math.Clamp((1 - progress) * flashPulse, 0, 1);
  return {
    offset: { x: active.recoilX * recoilPhase, y: active.recoilY * recoilPhase },
    flashAlpha,
    tint: flashAlpha > 0.12 ? 0xff3f3f : undefined
  };
}

export function battleEnemyDeathDissolve(this: CrystalOathSceneContext, enemyUid: string): BattleEnemyDeathDissolve | undefined {
  if (!this.battle?.enemyDeathDissolves?.length) return undefined;
  const now = this.time.now;
  let active = this.battle.enemyDeathDissolves.find((entry) => entry.enemyUid === enemyUid);
  this.battle.enemyDeathDissolves = this.battle.enemyDeathDissolves.filter((entry) => now - entry.createdAt < entry.duration);
  if (!active || now - active.createdAt >= active.duration) return undefined;
  return active;
}

export function selectedBattleEnemy(this: CrystalOathSceneContext): EnemyState | undefined {
  if (!this.battle || this.battle.phase !== "target") return undefined;
  if (this.battle.pendingAction?.targetAll) return undefined;
  return this.battle.enemies.filter((enemy) => enemy.hp > 0)[this.battle.selected];
}

export function selectedBattleAlly(this: CrystalOathSceneContext): CharacterState | undefined {
  if (!this.battle || this.battle.phase !== "allyTarget") return undefined;
  if (this.battle.pendingAction?.targetAll) return undefined;
  return this.party[this.battle.selected] ?? this.party[0];
}

export function drawBattleEnemy(
  this: CrystalOathSceneContext,
  enemy: EnemyState,
  x: number,
  y: number,
  size: number,
  targeted: boolean,
  feedback: BattleActorVisualFeedback = { offset: { x: 0, y: 0 }, flashAlpha: 0 }
) {
  const alive = enemy.hp > 0;
  this.drawActorShadow(x + size / 2, y + size - 3, size * 0.76, Math.max(10, size * 0.13), alive ? 0.3 : 0.14);
  this.drawEnemySprite(enemy, x, y, enemy.boss ? 5 : 4, size, alive ? 1 : 0.28, feedback.tint);
  if (targeted) {
    this.drawBattleTargetArrow(x + size / 2, y - 11);
    this.text(x + size / 2, y + size + 4, enemy.name, 10, "#fff2a8", "center", { wordWrapWidth: Math.max(86, size + 28), strokeThickness: 2 });
  }
}

export function drawBattleEnemyDeathDissolve(this: CrystalOathSceneContext, dissolve: BattleEnemyDeathDissolve) {
  const elapsed = this.time.now - dissolve.createdAt;
  dissolve.particles.forEach((particle) => {
    const particleElapsed = elapsed - particle.delay;
    if (particleElapsed <= 0) return;
    const duration = Math.max(1, dissolve.duration - particle.delay);
    const progress = Phaser.Math.Clamp(particleElapsed / duration, 0, 1);
    const alpha = (1 - progress) * 0.94;
    if (alpha <= 0) return;
    const drift = Phaser.Math.Easing.Cubic.Out(progress);
    const x = particle.x + particle.vx * drift;
    const y = particle.y + particle.vy * drift + progress * progress * 14;
    const size = Math.max(1, particle.size * (1 - progress * 0.42));
    this.ui.fillStyle(particle.color, alpha).fillRect(x, y, size, size);
  });
}

export function drawPartyBattler(
  this: CrystalOathSceneContext,
  member: CharacterState,
  x: number,
  y: number,
  idx: number,
  active: boolean,
  facing: BattleSpawnFacing = "left",
  targeted = false,
  feedback: BattleActorVisualFeedback = { offset: { x: 0, y: 0 }, flashAlpha: 0 }
) {
  const classId = PARTY_CLASS[member.id];
  const frame = this.battleCharacterFrame(member, facing);
  const alpha = member.hp <= 0 ? 0.36 : 1;
  const origin = battlePlayerSlotOrigin();
  const bodyCenterX = x + origin.bodyCenterX;
  const feetBaselineY = y + origin.feetBaselineY;
  const displayCellWidth = battlePlayerSpriteCellWidth(classId, frame);
  const visualHeight = battlePlayerSpriteVisualHeight(classId, frame);
  const ringW = Math.round(visualHeight * 0.86);
  const ringH = Math.max(20, Math.round(visualHeight * 0.2));
  this.drawActorShadow(bodyCenterX, feetBaselineY - 4, Math.round(ringW * 0.92), Math.max(14, Math.round(ringH * 0.62)), 0.32 * alpha);
  if (active) {
    this.drawActiveBattleFloorCircle(bodyCenterX, feetBaselineY - 4, ringW, ringH);
  }
  if (!this.drawCharacterSpriteFrame(classId, frame, bodyCenterX, feetBaselineY, displayCellWidth, LAYER_BATTLE_IMAGE, alpha, feedback.tint)) {
    const palettes = {
      fighter: [0xf0c18d, 0xc9433f, 0xe9edf7, 0x362a4b],
      priest: [0xf1d0aa, 0xf5f2e8, 0x5fac73, 0x314c33],
      mage: [0xe1b284, 0x1c365d, 0xf0b13e, 0x121827]
    }[member.id];
    this.g.fillStyle(0x050812, alpha).fillRect(x + 14, y + 16, 22, 38);
    this.g.fillStyle(palettes[0], alpha).fillRect(x + 16, y + 8, 16, 16);
    this.g.fillStyle(palettes[1], alpha).fillRect(x + 11, y + 24, 26, 29);
    this.g.fillStyle(palettes[2], alpha).fillRect(x + 17, y + 30, 9, 22);
    this.g.fillStyle(palettes[3], alpha).fillRect(x + 11, y + 53, 8, 10 + (idx % 2));
    this.g.fillRect(x + 28, y + 53, 8, 10 + ((idx + 1) % 2));
    if (feedback.flashAlpha > 0) {
      this.g.fillStyle(0xff3030, feedback.flashAlpha * 0.36).fillRect(bodyCenterX - displayCellWidth / 2, feetBaselineY - visualHeight, displayCellWidth, visualHeight);
    }
  }
  if (targeted) this.drawBattleTargetArrow(bodyCenterX, feetBaselineY - visualHeight - 8);
}

export function drawActiveBattleFloorCircle(this: CrystalOathSceneContext, cx: number, cy: number, width: number, height: number) {
  const ring = this.add.graphics();
  ring.setDepth(LAYER_BATTLE_IMAGE - 0.5);
  ring.setScale(PIXEL_ART_SCALE);
  ring.fillStyle(0xfff0a8, 0.2).fillEllipse(cx, cy, width, height);
  ring.lineStyle(2, 0xfff0a8, 0.95).strokeEllipse(cx, cy, width, height);
  this.images.push(ring);
}

export function drawBattleTargetArrow(this: CrystalOathSceneContext, cx: number, y: number) {
  const bob = Math.sin(this.time.now / 140) * 3;
  this.ui.fillStyle(0x050812, 0.45).fillTriangle(cx, y + bob + 3, cx - 10, y + bob - 9, cx + 10, y + bob - 9);
  this.ui.fillStyle(0xfff0a8, 1).fillTriangle(cx, y + bob + 1, cx - 8, y + bob - 8, cx + 8, y + bob - 8);
  this.ui.lineStyle(1, 0xffffff, 0.7).strokeTriangle(cx, y + bob + 1, cx - 8, y + bob - 8, cx + 8, y + bob - 8);
}

export function drawBattlePartyStatusHud(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  const rowH = 35;
  const w = 254;
  const h = 12 + this.party.length * rowH + 8;
  const x = WIDTH - w - 12;
  const y = 14;
  drawBattlePartyStatusPanel.call(this, x, y, w, h);
  this.party.forEach((member, idx) => {
    const rowY = y + 10 + idx * rowH;
    const active =
      this.currentBattleEntry()?.side === "party" &&
      this.currentBattleEntry()?.actorId === member.id &&
      !this.battle?.animation &&
      this.battle?.phase !== "resolving";
    const down = member.hp <= 0;
    const statuses = compactStatuses(member.statuses);
    if (idx > 0) this.ui.fillStyle(0xffe0a0, 0.14).fillRect(x + 12, rowY - 2, w - 24, 1);
    this.ui.fillStyle(active ? BATTLE_UI.panelWarm : 0x060d18, active ? 0.76 : 0.12).fillRect(x + 8, rowY - 3, w - 16, rowH - 4);
    if (active) {
      this.ui.lineStyle(1, BATTLE_UI.goldBright, 0.9).strokeRect(x + 8, rowY - 3, w - 16, rowH - 4);
      this.ui.fillStyle(BATTLE_UI.goldBright, 0.12).fillRect(x + 10, rowY - 1, w - 20, rowH - 8);
    }
    this.text(x + 24, rowY + 1, member.name, 10, down ? "#858b98" : "#ffffff", "left", { wordWrapWidth: 78, strokeThickness: 1 });
    if (down) {
      this.text(x + 92, rowY + 1, "Fallen", 7, "#9aa3b2", "left", { wordWrapWidth: 48, strokeThickness: 1 });
    } else if (statuses !== "ok") {
      this.text(x + 92, rowY + 1, statuses.toUpperCase(), 7, "#ffd69b", "left", { wordWrapWidth: 48, strokeThickness: 1 });
    }
    this.text(x + 24, rowY + 18, "HP", 7, down ? "#777f91" : "#89f39d", "left", { strokeThickness: 1 });
    this.drawThinBar(x + 43, rowY + 21, 58, 5, member.hp, member.maxHp, BATTLE_UI.hp);
    this.text(x + 106, rowY + 17, `${member.hp}/${member.maxHp}`, 7, down ? "#858b98" : "#dce9ff", "left", {
      wordWrapWidth: 42,
      strokeThickness: 1
    });
    this.text(x + 154, rowY + 18, "MP", 7, down ? "#777f91" : "#65c8ff", "left", { strokeThickness: 1 });
    this.drawThinBar(x + 174, rowY + 21, 38, 5, member.mp, member.maxMp, BATTLE_UI.mp);
    this.text(x + 218, rowY + 17, `${member.mp}`, 7, down ? "#858b98" : "#dce9ff", "left", {
      wordWrapWidth: 22,
      strokeThickness: 1
    });
  });
}

export function drawBattleCommandMenu(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  const actor = this.currentBattleActor();
  if (!["command", "target", "skill", "spell", "item", "allyTarget"].includes(this.battle.phase) || !actor) return;
  drawBattleCommandBar.call(this, actor.name);
  const submenu = battleSubmenuForActivePath.call(this, actor);
  if (submenu) drawBattleSubmenuPanel.call(this, submenu.title, submenu.options, submenu.selected);
}

export function drawBattleLogPrompt(this: CrystalOathSceneContext) {
  if (!this.battle || this.battle.phase !== "log") return;
  const lines = this.battle.log.slice(-3);
  const w = 198;
  const h = 26 + lines.length * 16;
  const x = 8;
  const y = 8;
  this.drawBattleHudPanel(x, y, w, h, 0.66);
  this.text(x + 10, y + 6, "Battle Log", 8, "#fff2a8", "left", { strokeThickness: 1 });
  lines.forEach((line, idx) => {
    this.text(x + 10, y + 22 + idx * 15, line, 9, "#dce9ff", "left", { wordWrapWidth: w - 20, strokeThickness: 1 });
  });
}

export function drawBattleDebugLogOverlay(this: CrystalOathSceneContext) {
  if (!this.battle?.debugLogVisible) return;
  const lines = this.battle.log.slice(-5);
  const w = 190;
  const h = Math.min(118, 22 + lines.length * 16);
  const x = 8;
  const y = 8;
  this.drawBattleHudPanel(x, y, w, h, 0.5);
  this.text(x + 10, y + 6, "Debug Log", 8, "#fff2a8", "left", { strokeThickness: 1 });
  lines.forEach((line, idx) => {
    this.text(x + 10, y + 22 + idx * 15, line, 8, "#dce9ff", "left", { wordWrapWidth: w - 20, strokeThickness: 1 });
  });
}

export function drawBattleTurnCarousel(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  const state = (this.battle.carousel ??= { dissolves: [] });
  const cards = this.battleCarouselCards();
  if (!cards.length) return;
  const cardW = 40;
  const cardH = 50;
  const gap = 7;
  const totalW = cards.length * cardW + (cards.length - 1) * gap;
  const startX = Math.round(WIDTH / 2 - totalW / 2);
  const y = 8;
  const now = this.time.now;
  const key = cards.map((card) => card.key).join("|");
  const previous = state.previousCards ?? [];
  if (state.lastKey !== key) {
    state.animationStartedAt = now;
    state.dissolves = [];
    state.lastKey = key;
  }
  const progress = Phaser.Math.Clamp((now - (state.animationStartedAt ?? now)) / 240, 0, 1);
  const ease = Phaser.Math.Easing.Cubic.Out(progress);
  const snapshots: BattleCarouselCardSnapshot[] = [];
  cards.forEach((card, idx) => {
    const targetX = startX + idx * (cardW + gap);
    const old = previous.find((candidate) => candidate.key === card.key);
    const x = old ? Phaser.Math.Linear(old.x, targetX, ease) : targetX + (1 - ease) * 18;
    const alpha = old ? 1 : Phaser.Math.Clamp(ease + 0.2, 0.2, 1);
    this.drawBattleCarouselCard(card, x, y, cardW, cardH, alpha);
    snapshots.push({ key: card.key, side: card.side, actorId: card.actorId, name: card.name, x: targetX, y, w: cardW, h: cardH });
  });
  this.drawBattleCarouselDissolves();
  state.previousCards = snapshots;
}

export function battleCarouselCards(this: CrystalOathSceneContext): BattleCarouselCard[] {
  if (!this.battle) return [];
  const entries: InitiativeEntry[] = [];
  for (let i = 0; i < this.battle.turnOrder.length && entries.length < 5; i += 1) {
    const entry = this.battle.turnOrder[(this.battle.turnIndex + i) % this.battle.turnOrder.length];
    if (!entry) continue;
    if (this.battle.current && entry.side === this.battle.current.side && entry.actorId === this.battle.current.actorId) continue;
    entries.push(entry);
  }
  if (this.battle.current) entries.push(this.battle.current);
  const cards: BattleCarouselCard[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.side}:${entry.actorId}`;
    if (seen.has(key)) continue;
    const actor = this.actorForEntry(entry);
    if (!actor) continue;
    if (entry.side === "enemy" && actor.hp <= 0) continue;
    const current = !!this.battle.current && entry.side === this.battle.current.side && entry.actorId === this.battle.current.actorId;
    cards.push({ key, side: entry.side, actorId: entry.actorId, name: actor.name, current, down: actor.hp <= 0 });
    seen.add(key);
  }
  return cards;
}

export function drawBattleCarouselCard(this: CrystalOathSceneContext, card: BattleCarouselCard, x: number, y: number, w: number, h: number, alpha: number) {
  const border = card.current ? BATTLE_UI.goldBright : BATTLE_UI.gold;
  const fill = card.current ? 0x162139 : 0x07101d;
  const finalAlpha = alpha * (card.down ? 0.42 : 1);
  this.ui.fillStyle(BATTLE_UI.shadow, 0.5 * finalAlpha).fillRect(x + 2, y + 2, w, h);
  this.ui.fillStyle(fill, 0.84 * finalAlpha).fillRect(x, y, w, h);
  this.ui.fillStyle(0xffffff, 0.04 * finalAlpha).fillRect(x + 2, y + 2, w - 4, Math.floor(h * 0.38));
  this.ui.lineStyle(card.current ? 2 : 1, border, (card.current ? 1 : 0.78) * finalAlpha).strokeRect(x, y, w, h);
  this.ui.lineStyle(1, BATTLE_UI.goldBright, (card.current ? 0.64 : 0.3) * finalAlpha).strokeRect(x + 2, y + 2, w - 4, h - 4);
  drawCarouselPortrait.call(this, card, x + 5, y + 6, 30, 38, finalAlpha);
  if (card.current) {
    this.ui.fillStyle(BATTLE_UI.goldBright, 0.94 * finalAlpha).fillTriangle(x + w / 2, y + h + 6, x + w / 2 - 6, y + h - 1, x + w / 2 + 6, y + h - 1);
  }
}

export function drawBattleCarouselDissolves(this: CrystalOathSceneContext) {
  if (!this.battle?.carousel?.dissolves?.length) return;
  const now = this.time.now;
  this.battle.carousel.dissolves = this.battle.carousel.dissolves.filter((dissolve) => {
    const elapsed = now - dissolve.createdAt;
    if (elapsed > dissolve.duration) return false;
    for (const particle of dissolve.particles) {
      const local = Phaser.Math.Clamp((elapsed - particle.delay) / Math.max(1, dissolve.duration - particle.delay), 0, 1);
      if (local <= 0) continue;
      const ease = Phaser.Math.Easing.Quadratic.Out(local);
      this.ui.fillStyle(particle.color, (1 - local) * 0.82).fillRect(
        particle.x + particle.vx * ease,
        particle.y + particle.vy * ease,
        particle.size,
        particle.size
      );
    }
    return true;
  });
}

export function drawBattleFloatingTexts(this: CrystalOathSceneContext) {
  if (!this.battle?.floatingTexts?.length) return;
  const now = this.time.now;
  this.battle.floatingTexts = this.battle.floatingTexts.filter((entry) => {
    const elapsed = now - entry.createdAt;
    if (elapsed > entry.duration) return false;
    const progress = Phaser.Math.Clamp(elapsed / entry.duration, 0, 1);
    const center = this.battleActorCenter(entry.side, entry.actorId) ?? { x: entry.anchorX, y: entry.anchorY };
    const impact = Phaser.Math.Clamp(Math.abs(entry.amount) / Math.max(1, entry.maxHp), 0.03, 1);
    const visualScale = Phaser.Math.Linear(0.85, 2.2, Math.sqrt(impact)) * (entry.critical ? 1.16 : 1);
    const pop = 1 + Math.sin(Math.min(1, progress * 2.3) * Math.PI) * 0.18;
    const fontSize = Phaser.Math.Clamp(Math.round(18 * visualScale * pop), 13, 44);
    const x = center.x + entry.jitterX;
    const y = center.y - 18 - progress * 42;
    const color = entry.kind === "heal" ? "#72f59b" : entry.kind === "damage" ? (entry.critical ? "#fff0a8" : "#ff6767") : "#fff2a8";
    const text = this.text(x, y, entry.critical && entry.kind === "damage" ? `CRIT ${entry.text}` : entry.text, fontSize, color, "center", {
      stroke: "#050812",
      strokeThickness: 3
    });
    text.setAlpha(Phaser.Math.Clamp(1 - Math.max(0, progress - 0.62) / 0.38, 0, 1));
    return true;
  });
}

export function drawBattleVictoryDialog(this: CrystalOathSceneContext) {
  if (!this.battle || this.battle.phase !== "victory") return;
  const rewards = this.battle.victoryRewards;
  const levelUps = rewards?.levelUps ?? [];
  const hasLevelUps = levelUps.length > 0;
  const w = hasLevelUps ? 900 : 700;
  const h = hasLevelUps ? 296 : 230;
  const x = Math.round(WIDTH / 2 - w / 2);
  const y = Math.round(HEIGHT / 2 - h / 2);
  const safePadX = hasLevelUps ? 48 : 64;
  const safePadTop = hasLevelUps ? 30 : 34;
  const safePadBottom = hasLevelUps ? 30 : 38;
  const safeX = x + safePadX;
  const safeY = y + safePadTop;
  const safeW = w - safePadX * 2;
  const safeBottom = y + h - safePadBottom;
  const centerX = safeX + safeW / 2;
  this.ui.fillStyle(0x000000, 0.42).fillRect(0, 0, WIDTH, HEIGHT);
  this.drawFantasyDialogFrame(x, y, w, h, { variant: "fancyResult", showCrest: true, alpha: 0.98 });
  const resultGraphics = createBattleResultGraphics.call(this);
  this.text(centerX, safeY, "Victory!", 34, "#ffd98a", "center", {
    wordWrapWidth: safeW,
    stroke: "#050812",
    strokeThickness: 4
  });
  this.drawFantasyDialogDivider(centerX - 112, safeY + 39, 224, "short", 0.78);
  this.text(centerX, safeY + 52, "The party stands triumphant.", 12, "#ffffff", "center", {
    wordWrapWidth: safeW,
    stroke: "#050812",
    strokeThickness: 2
  });

  const rewardsTitleY = hasLevelUps ? safeY + 78 : safeY + 80;
  const cardY = rewardsTitleY + 19;
  this.text(centerX, rewardsTitleY, "Rewards", 12, "#ffd98a", "center", {
    wordWrapWidth: safeW,
    stroke: "#050812",
    strokeThickness: 2
  });
  const cardGap = hasLevelUps ? 20 : 16;
  const cardW = hasLevelUps ? 176 : 156;
  const rewardsX = safeX + Math.round((safeW - cardW * 3 - cardGap * 2) / 2);
  drawVictoryRewardCard.call(
    this,
    resultGraphics,
    rewardsX,
    cardY,
    cardW,
    "ui_battle_result_icon_exp",
    "EXP",
    rewards ? String(rewards.xp) : "Tallying"
  );
  drawVictoryRewardCard.call(
    this,
    resultGraphics,
    rewardsX + cardW + cardGap,
    cardY,
    cardW,
    "ui_battle_result_icon_gold",
    "Gold",
    rewards ? String(rewards.gold) : "Tallying"
  );
  const loot = lootDisplay(rewards);
  drawVictoryRewardCard.call(
    this,
    resultGraphics,
    rewardsX + (cardW + cardGap) * 2,
    cardY,
    cardW,
    "ui_battle_result_icon_potion",
    "Loot",
    loot.text,
    loot.muted
  );

  if (hasLevelUps) {
    const visibleLevelUps = levelUps.slice(0, 3);
    const levelCardH = 62;
    const levelCardY = safeBottom - levelCardH;
    const sectionY = levelCardY - 25;
    resultGraphics.fillStyle(0xc69a4b, 0.46).fillRect(centerX - 128, sectionY + 15, 256, 1);
    this.text(centerX, sectionY, "Level Up", 12, "#ffd98a", "center", {
      wordWrapWidth: safeW,
      stroke: "#050812",
      strokeThickness: 2
    });
    const levelGap = 22;
    const levelCardW = visibleLevelUps.length === 1 ? 360 : visibleLevelUps.length === 2 ? 300 : 248;
    const totalLevelW = visibleLevelUps.length * levelCardW + Math.max(0, visibleLevelUps.length - 1) * levelGap;
    const levelStartX = safeX + Math.round((safeW - totalLevelW) / 2);
    visibleLevelUps.forEach((level, idx) => {
      drawVictoryLevelUpCard.call(this, resultGraphics, level, levelStartX + idx * (levelCardW + levelGap), levelCardY, levelCardW, levelCardH);
    });
  }
}

function createBattleResultGraphics(this: CrystalOathSceneContext) {
  const graphics = this.add.graphics();
  graphics.setDepth(LAYER_UI_IMAGE + 2);
  graphics.setScale(PIXEL_ART_SCALE);
  graphics.setScrollFactor(0);
  this.images.push(graphics);
  return graphics;
}

function lootDisplay(rewards: BattleVictoryRewards | undefined) {
  if (!rewards) return { text: "Tallying", muted: false };
  if (!rewards.loot.length) return { text: "None", muted: true };
  if (rewards.loot.length === 1) return { text: `${rewards.loot[0].name} x${rewards.loot[0].quantity}`, muted: false };
  const totalQuantity = rewards.loot.reduce((sum, item) => sum + item.quantity, 0);
  return { text: `${totalQuantity} items`, muted: false };
}

function drawVictoryRewardCard(
  this: CrystalOathSceneContext,
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  iconKey: string,
  title: string,
  value: string,
  muted = false
) {
  const cardH = 44;
  graphics.fillStyle(0x030711, 0.48).fillRect(x + 2, y + 3, w, cardH);
  graphics.fillStyle(0x071225, 0.9).fillRect(x, y, w, cardH);
  graphics.fillStyle(0xffffff, 0.055).fillRect(x + 3, y + 3, w - 6, 12);
  graphics.lineStyle(1, BATTLE_UI.goldBright, 0.82).strokeRect(x, y, w, cardH);
  graphics.lineStyle(1, BATTLE_UI.gold, 0.28).strokeRect(x + 4, y + 4, w - 8, cardH - 8);
  this.drawFantasyDialogIcon(iconKey, x + 16, y + 11, 24, muted ? 0.42 : 1);
  this.text(x + 52, y + 8, title, 8, "#ffd98a", "left", {
    wordWrapWidth: w - 64,
    stroke: "#050812",
    strokeThickness: 1
  });
  this.text(x + 52, y + 23, value, 12, muted ? "#8794aa" : "#fff4c8", "left", {
    wordWrapWidth: w - 64,
    stroke: "#050812",
    strokeThickness: 2
  });
}

function drawVictoryLevelUpCard(
  this: CrystalOathSceneContext,
  graphics: Phaser.GameObjects.Graphics,
  level: BattleLevelUpReward,
  x: number,
  y: number,
  w: number,
  h: number
) {
  graphics.fillStyle(0x030711, 0.5).fillRect(x + 2, y + 3, w, h);
  graphics.fillStyle(0x071225, 0.92).fillRect(x, y, w, h);
  graphics.fillStyle(0xffffff, 0.06).fillRect(x + 2, y + 2, w - 4, 13);
  graphics.lineStyle(1, BATTLE_UI.goldBright, 0.84).strokeRect(x, y, w, h);
  graphics.lineStyle(1, BATTLE_UI.gold, 0.34).strokeRect(x + 3, y + 3, w - 6, h - 6);
  const portraitX = x + 10;
  const portraitY = y + 10;
  const portraitSize = 42;
  const portraitInset = 2;
  graphics.fillStyle(0x020714, 0.96).fillRect(portraitX - 2, portraitY - 2, portraitSize + 4, portraitSize + 4);
  graphics.lineStyle(1, BATTLE_UI.goldBright, 0.8).strokeRect(portraitX - 2, portraitY - 2, portraitSize + 4, portraitSize + 4);
  const member = this.party.find((candidate) => candidate.id === level.characterId);
  if (member) {
    const texture = PORTRAIT_TEXTURES[member.id];
    if (texture && this.hasTexture(texture)) {
      this.drawContainedTexture(
        texture,
        portraitX + portraitInset,
        portraitY + portraitInset,
        portraitSize - portraitInset * 2,
        portraitSize - portraitInset * 2,
        LAYER_UI_IMAGE + 4,
        1
      );
    } else {
      drawVictoryPortraitFallback.call(
        this,
        graphics,
        member,
        portraitX + portraitInset,
        portraitY + portraitInset,
        portraitSize - portraitInset * 2,
        portraitSize - portraitInset * 2
      );
    }
  } else {
    graphics.fillStyle(0x0b1525, 1).fillRect(
      portraitX + portraitInset,
      portraitY + portraitInset,
      portraitSize - portraitInset * 2,
      portraitSize - portraitInset * 2
    );
  }
  this.text(x + 66, y + 13, level.name, 11, "#ffd98a", "left", {
    wordWrapWidth: 56,
    stroke: "#050812",
    strokeThickness: 2
  });
  this.text(x + 66, y + 33, `Lv. ${level.newLevel}`, 9, "#ffffff", "left", { wordWrapWidth: 54, strokeThickness: 1 });

  const stats = [
    ["ui_battle_result_icon_hp", "HP", level.hpGain],
    ["ui_battle_result_icon_mp", "MP", level.mpGain],
    ["ui_battle_result_icon_atk", "ATK", level.attackGain],
    ["ui_battle_result_icon_def", "DEF", level.defenseGain],
    ["ui_battle_result_icon_spd", "SPD", level.speedGain]
  ] as const;
  const gains = stats.filter(([, , gain]) => !!gain);
  const statStartX = x + 124;
  gains.forEach(([iconKey, label, gain], idx) => {
    if (!gain) return;
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    drawVictoryStatChip.call(this, graphics, statStartX + col * 42, y + 13 + row * 19, iconKey, `+${gain} ${label}`);
  });
}

function drawVictoryPortraitFallback(
  this: CrystalOathSceneContext,
  graphics: Phaser.GameObjects.Graphics,
  member: CharacterState,
  x: number,
  y: number,
  w: number,
  h: number
) {
  graphics.fillStyle(0x0b1525, 1).fillRect(x, y, w, h);
  const colors = {
    fighter: [0xf1c07f, 0xd8c7a2, 0x7a3b24],
    priest: [0xdfe4ef, 0x8364bc, 0xc9d2ff],
    mage: [0xd18a45, 0x244d88, 0xe9edf7]
  }[member.id];
  graphics.fillStyle(colors[0], 1).fillRect(x + 13, y + 7, 14, 14);
  graphics.fillStyle(colors[1], 1).fillRect(x + 9, y + 21, 22, 17);
  graphics.fillStyle(colors[2], 1).fillRect(x + 16, y + 24, 8, 14);
}

function drawVictoryStatChip(
  this: CrystalOathSceneContext,
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  iconKey: string,
  label: string
) {
  const chipW = 39;
  const chipH = 15;
  graphics.fillStyle(0x030711, 0.62).fillRect(x - 2, y - 1, chipW, chipH);
  graphics.lineStyle(1, BATTLE_UI.gold, 0.2).strokeRect(x - 2, y - 1, chipW, chipH);
  this.drawFantasyDialogIcon(iconKey, x, y + 1, 10);
  this.text(x + 12, y + 1, label, 7, "#eff7ff", "left", { wordWrapWidth: chipW - 13, strokeThickness: 1 });
}

export function drawThinBar(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number, value: number, max: number, color: number) {
  this.ui.fillStyle(0x030712, 0.86).fillRect(x, y, w, h);
  this.ui.lineStyle(1, 0xffe0a0, 0.28).strokeRect(x, y, w, h);
  const fillW = Math.max(0, Math.floor((w - 2) * Phaser.Math.Clamp(value / Math.max(1, max), 0, 1)));
  this.ui.fillStyle(color, 0.92).fillRect(x + 1, y + 1, fillW, h - 2);
}

export function drawBattleHudPanel(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number, alpha = 0.76) {
  this.ui.fillStyle(BATTLE_UI.shadow, 0.44).fillRect(x + 3, y + 3, w, h);
  this.ui.fillStyle(BATTLE_UI.panel, alpha).fillRect(x, y, w, h);
  this.ui.fillStyle(BATTLE_UI.panelInner, Math.min(0.62, alpha + 0.06)).fillRect(x + 3, y + 3, w - 6, h - 6);
  this.ui.fillStyle(0xffffff, 0.035).fillRect(x + 4, y + 4, w - 8, Math.max(8, Math.floor(h * 0.28)));
  this.ui.lineStyle(2, BATTLE_UI.shadow, 0.72).strokeRect(x - 1, y - 1, w + 2, h + 2);
  this.ui.lineStyle(1, BATTLE_UI.gold, 0.96).strokeRect(x, y, w, h);
  this.ui.lineStyle(1, BATTLE_UI.goldBright, 0.42).strokeRect(x + 3, y + 3, w - 6, h - 6);
  this.ui.fillStyle(BATTLE_UI.gold, 0.92).fillRect(x + 5, y + 5, 3, 3);
  this.ui.fillRect(x + w - 8, y + 5, 3, 3);
  this.ui.fillRect(x + 5, y + h - 8, 3, 3);
  this.ui.fillRect(x + w - 8, y + h - 8, 3, 3);
}

function drawBattlePartyStatusPanel(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number) {
  this.ui.fillStyle(BATTLE_UI.shadow, 0.42).fillRect(x + 3, y + 3, w, h);
  this.ui.fillStyle(BATTLE_UI.panel, 0.8).fillRect(x, y, w, h);
  this.ui.fillStyle(BATTLE_UI.panelInner, 0.58).fillRect(x + 3, y + 3, w - 6, h - 6);
  this.ui.fillStyle(0xffffff, 0.035).fillRect(x + 4, y + 4, w - 8, 30);
  this.ui.lineStyle(2, BATTLE_UI.shadow, 0.72).strokeRect(x - 1, y - 1, w + 2, h + 2);
  this.ui.lineStyle(1, BATTLE_UI.gold, 0.96).strokeRect(x, y, w, h);
  this.ui.fillStyle(BATTLE_UI.gold, 0.92).fillRect(x + 5, y + 5, 3, 3);
  this.ui.fillRect(x + w - 8, y + 5, 3, 3);
  this.ui.fillRect(x + 5, y + h - 8, 3, 3);
  this.ui.fillRect(x + w - 8, y + h - 8, 3, 3);
}

function battleCommandBarLayout() {
  const optionW = 74;
  const h = 36;
  const w = optionW * BATTLE_COMMANDS.length + 10;
  return { x: 70, y: HEIGHT - h - 5, w, h, optionW };
}

function drawBattleCommandBar(this: CrystalOathSceneContext, actorName: string) {
  const layout = battleCommandBarLayout();
  const selectedIndex = rootCommandIndex(this.battle?.phase, this.battle?.pendingAction?.type, this.battle?.selected ?? 0);
  this.drawBattleHudPanel(layout.x, layout.y, layout.w, layout.h, 0.82);
  this.text(layout.x + 10, layout.y - 13, actorName, 8, "#fff2a8", "left", { wordWrapWidth: 120, strokeThickness: 1 });
  BATTLE_COMMANDS.forEach((option, idx) => {
    const selected = idx === selectedIndex;
    const optionX = layout.x + 5 + idx * layout.optionW;
    const optionY = layout.y + 5;
    this.ui.fillStyle(selected ? BATTLE_UI.panelWarm : 0x050b15, selected ? 0.82 : 0.56).fillRect(optionX, optionY, layout.optionW - 2, 26);
    this.ui.lineStyle(1, selected ? BATTLE_UI.goldBright : 0x526071, selected ? 0.9 : 0.42).strokeRect(optionX, optionY, layout.optionW - 2, 26);
    if (selected) {
      this.ui.fillStyle(BATTLE_UI.goldBright, 0.12).fillRect(optionX + 2, optionY + 2, layout.optionW - 6, 22);
    }
    drawCommandIcon.call(this, COMMAND_ICONS[option], optionX + 16, optionY + 13, selected);
    this.text(optionX + 31, optionY + 6, option, 8, selected ? "#fff7c7" : BATTLE_UI.text, "left", {
      wordWrapWidth: layout.optionW - 36,
      strokeThickness: 1
    });
  });
}

function battleSubmenuForActivePath(this: CrystalOathSceneContext, actor: CharacterState) {
  if (!this.battle) return undefined;
  const source = this.battle.phase === "target" || this.battle.phase === "allyTarget" ? this.battle.pendingAction?.type : this.battle.phase;
  const selected = this.battle.phase === "target" || this.battle.phase === "allyTarget" ? this.battle.menuReturnSelected ?? 0 : this.battle.selected;
  if (source === "spell") {
    return {
      title: "Magic",
      selected,
      options: actor.spells
        .filter((id) => actor.level >= SPELLS[id].minLevel)
        .map((id) => ({ label: SPELLS[id].name, meta: `MP ${this.battleSpellMpCost(id)}`, icon: COMMAND_ICONS.Magic }))
    };
  }
  if (source === "skill") {
    return {
      title: "Skill",
      selected,
      options: this.skillsForActor(actor).map((skill) => ({
        label: skill.name,
        meta: (actor.skillCooldowns[skill.id] ?? 0) > 0 ? `${actor.skillCooldowns[skill.id]}` : "",
        icon: COMMAND_ICONS.Skill
      }))
    };
  }
  if (source === "item") {
    return {
      title: "Item",
      selected,
      options: Object.keys(ITEMS)
        .filter((id) => ITEMS[id].battle && (this.inventory[id] ?? 0) > 0)
        .map((id) => ({ label: ITEMS[id].name, meta: `x${this.inventory[id]}`, icon: COMMAND_ICONS.Item }))
    };
  }
  return undefined;
}

function drawBattleSubmenuPanel(
  this: CrystalOathSceneContext,
  title: string,
  options: { label: string; meta: string; icon: (typeof COMMAND_ICONS)[string] }[],
  selectedIndex: number
) {
  if (!options.length) return;
  const root = battleCommandBarLayout();
  const rowH = 26;
  const w = 170;
  const h = 24 + options.length * rowH + 8;
  const x = root.x + root.w + 28;
  const y = HEIGHT - h - 5;
  this.drawBattleHudPanel(x, y, w, h, 0.84);
  this.text(x + 12, y + 7, title, 8, "#fff2a8", "left", { wordWrapWidth: 70, strokeThickness: 1 });
  options.forEach((option, idx) => {
    const selected = idx === selectedIndex;
    const rowY = y + 24 + idx * rowH;
    if (idx > 0) this.ui.fillStyle(0xffe0a0, 0.13).fillRect(x + 9, rowY - 2, w - 18, 1);
    this.ui.fillStyle(selected ? BATTLE_UI.panelWarm : 0x050b15, selected ? 0.76 : 0.35).fillRect(x + 7, rowY, w - 14, 22);
    if (selected) {
      this.ui.lineStyle(1, BATTLE_UI.goldBright, 0.86).strokeRect(x + 7, rowY, w - 14, 22);
    }
    drawCommandIcon.call(this, option.icon, x + 31, rowY + 11, selected);
    this.text(x + 46, rowY + 5, option.label, 8, selected ? "#fff7c7" : "#ffffff", "left", {
      wordWrapWidth: 76,
      strokeThickness: 1
    });
    this.text(x + w - 50, rowY + 5, option.meta, 7, "#7fd5ff", "left", {
      wordWrapWidth: 45,
      strokeThickness: 1
    });
  });
}

function rootCommandIndex(phase: string | undefined, pendingType: string | undefined, selected: number) {
  if (phase === "command") return selected;
  const command = phase === "target" || phase === "allyTarget" ? pendingType : phase;
  if (command === "spell") return BATTLE_COMMANDS.indexOf("Magic");
  if (command === "skill") return BATTLE_COMMANDS.indexOf("Skill");
  if (command === "item") return BATTLE_COMMANDS.indexOf("Item");
  return BATTLE_COMMANDS.indexOf("Attack");
}

function drawPartyCardPortrait(this: CrystalOathSceneContext, member: CharacterState, x: number, y: number, w: number, h: number) {
  const alpha = member.hp <= 0 ? 0.42 : 1;
  const texture = PORTRAIT_TEXTURES[member.id];
  this.ui.fillStyle(0x030711, 0.92).fillRect(x, y, w, h);
  if (texture && this.hasTexture(texture)) {
    this.drawCoveredTexture(texture, x, y, w, h, LAYER_UI_IMAGE, alpha);
  } else {
    const palettes = {
      fighter: [0xf1c07f, 0xd8c7a2, 0x7a3b24],
      priest: [0xdfe4ef, 0x8364bc, 0xc9d2ff],
      mage: [0xd18a45, 0x244d88, 0xe9edf7]
    }[member.id];
    this.ui.fillStyle(palettes[0], alpha).fillRect(x + 9, y + 5, 12, 12);
    this.ui.fillStyle(palettes[1], alpha).fillRect(x + 6, y + 17, 18, 16);
    this.ui.fillStyle(palettes[2], alpha).fillRect(x + 11, y + 19, 8, 16);
  }
  this.ui.lineStyle(1, BATTLE_UI.gold, 0.72).strokeRect(x, y, w, h);
}

function drawCarouselPortrait(this: CrystalOathSceneContext, card: BattleCarouselCard, x: number, y: number, w: number, h: number, alpha: number) {
  this.ui.fillStyle(0x030711, 0.88 * alpha).fillRect(x, y, w, h);
  if (card.side === "party") {
    const member = this.party.find((candidate) => candidate.id === card.actorId);
    const texture = member ? PORTRAIT_TEXTURES[member.id] : undefined;
    if (texture && this.hasTexture(texture)) {
      this.drawCoveredTexture(texture, x, y, w, h, LAYER_UI_IMAGE, alpha);
      return;
    }
  } else {
    const enemy = this.battle?.enemies.find((candidate) => candidate.uid === card.actorId);
    const texture = enemy ? ENEMY_TEXTURES[enemy.id] : undefined;
    if (texture && this.hasTexture(texture)) {
      this.drawContainedTexture(texture, x, y, w, h, LAYER_UI_IMAGE, alpha);
      return;
    }
    if (enemy) {
      drawEnemyPortraitFallback.call(this, enemy, x, y, w, h, alpha);
      return;
    }
  }
  this.text(x + w / 2, y + h / 2 - 5, card.name.slice(0, 1), 12, card.side === "party" ? "#dff8ff" : "#ffe1cf", "center", {
    strokeThickness: 1
  });
}

function drawEnemyPortraitFallback(this: CrystalOathSceneContext, enemy: EnemyState, x: number, y: number, w: number, h: number, alpha: number) {
  const p = enemy.palette.map((color) => parseInt(color.slice(1), 16));
  const cx = x + w / 2;
  const baseY = y + h - 8;
  this.ui.fillStyle(0x050812, 0.34 * alpha).fillEllipse(cx, baseY + 1, w * 0.68, 8);
  this.ui.fillStyle(p[0], 0.96 * alpha);
  if (enemy.sprite === "blob") {
    this.ui.fillEllipse(cx, baseY - 11, w * 0.58, h * 0.34);
    this.ui.fillStyle(p[1], alpha).fillEllipse(cx + 4, baseY - 19, w * 0.38, h * 0.26);
  } else if (enemy.sprite === "wing") {
    this.ui.fillTriangle(cx - 2, baseY - 24, cx - 17, baseY - 4, cx + 3, baseY - 8);
    this.ui.fillTriangle(cx + 2, baseY - 24, cx + 17, baseY - 4, cx - 3, baseY - 8);
    this.ui.fillStyle(p[1], alpha).fillEllipse(cx, baseY - 14, w * 0.28, h * 0.36);
  } else if (enemy.sprite === "serpent") {
    for (let i = 0; i < 4; i += 1) {
      this.ui.fillStyle(p[i % 2], alpha).fillEllipse(cx - 12 + i * 8, baseY - 11 - (i % 2) * 3, 10, 9);
    }
    this.ui.fillStyle(p[2], alpha).fillEllipse(cx + 18, baseY - 18, 13, 12);
  } else {
    this.ui.fillRoundedRect(cx - 11, baseY - 29, 22, 29, 4);
    this.ui.fillStyle(p[1], alpha).fillEllipse(cx, baseY - 12, w * 0.64, h * 0.3);
  }
  this.ui.fillStyle(0xffffff, alpha).fillRect(cx - 5, baseY - 17, 2, 2);
  this.ui.fillRect(cx + 4, baseY - 17, 2, 2);
}

function drawSpellSlotRow(this: CrystalOathSceneContext, member: CharacterState, x: number, y: number, w: number) {
  const tiers = ["1", "2", "3"];
  const groupW = Math.floor(w / tiers.length);
  tiers.forEach((tier, idx) => {
    const charge = member.charges[tier];
    const max = Math.max(0, charge?.max ?? 0);
    const current = Phaser.Math.Clamp(charge?.current ?? 0, 0, Math.max(0, max));
    const groupX = x + idx * groupW;
    const color = member.hp <= 0 ? "#727a88" : "#a7d7ff";
    this.text(groupX, y - 1, `T${tier}`, 7, color, "left", { strokeThickness: 1 });
    if (max <= 0) {
      this.text(groupX + 15, y - 1, "-", 7, "#727a88", "left", { strokeThickness: 1 });
      return;
    }
    if (max > 4) {
      this.text(groupX + 15, y - 1, `${current}/${max}`, 7, color, "left", { wordWrapWidth: groupW - 15, strokeThickness: 1 });
      return;
    }
    for (let pip = 0; pip < max; pip += 1) {
      const pipX = groupX + 16 + pip * 6;
      this.ui.fillStyle(pip < current ? BATTLE_UI.slotReady : BATTLE_UI.slotSpent, pip < current ? 0.92 : 0.78).fillRect(pipX, y + 1, 4, 6);
      this.ui.lineStyle(1, BATTLE_UI.goldBright, pip < current ? 0.42 : 0.18).strokeRect(pipX, y + 1, 4, 6);
    }
  });
}

function drawStatusBadge(this: CrystalOathSceneContext, statuses: string, x: number, y: number, w: number, h: number, down: boolean) {
  const active = statuses !== "ok";
  const label = down ? "KO" : active ? statuses.slice(0, 3).toUpperCase() : "OK";
  const fill = down ? 0x2a2f3a : active ? 0x4a2631 : 0x173222;
  const stroke = down ? 0x7e8797 : active ? 0xff8f6b : 0x82f0a0;
  this.ui.fillStyle(fill, 0.88).fillRect(x, y, w, h);
  this.ui.lineStyle(1, stroke, 0.72).strokeRect(x, y, w, h);
  this.text(x + w / 2, y + 4, label, 7, down ? "#9aa3b2" : active ? "#ffd69b" : "#a9f5b9", "center", {
    wordWrapWidth: w - 2,
    strokeThickness: 1
  });
}

function drawCommandIcon(this: CrystalOathSceneContext, kind: (typeof COMMAND_ICONS)[string] | undefined, x: number, y: number, selected: boolean) {
  const main = selected ? BATTLE_UI.goldBright : 0xaebbd0;
  const accent = selected ? 0xffffff : 0x6fa4ff;
  this.ui.lineStyle(2, main, 0.95);
  this.ui.fillStyle(main, 0.9);
  if (kind === "attack") {
    this.ui.lineBetween(x - 7, y + 7, x + 7, y - 7);
    this.ui.fillRect(x - 8, y + 5, 6, 2);
    this.ui.fillRect(x - 5, y + 2, 2, 6);
  } else if (kind === "skill") {
    this.ui.lineBetween(x, y - 8, x, y + 8);
    this.ui.lineBetween(x - 8, y, x + 8, y);
    this.ui.lineBetween(x - 6, y - 6, x + 6, y + 6);
    this.ui.lineBetween(x + 6, y - 6, x - 6, y + 6);
  } else if (kind === "magic") {
    this.ui.fillStyle(0x5ebdff, 0.92).fillCircle(x, y + 3, 5);
    this.ui.fillTriangle(x, y - 8, x - 6, y + 3, x + 6, y + 3);
  } else if (kind === "item") {
    this.ui.fillStyle(0x7ee38b, 0.9).fillRect(x - 5, y - 3, 10, 10);
    this.ui.fillStyle(accent, 0.9).fillRect(x - 3, y - 8, 6, 5);
    this.ui.lineStyle(1, main, 0.9).strokeRect(x - 5, y - 3, 10, 10);
  } else if (kind === "defend") {
    this.ui.fillStyle(0x9db7d7, 0.92).fillTriangle(x, y + 9, x - 7, y - 3, x + 7, y - 3);
    this.ui.fillRect(x - 7, y - 7, 14, 6);
    this.ui.lineStyle(1, main, 0.95).strokeRect(x - 7, y - 7, 14, 6);
  } else if (kind === "run") {
    this.ui.fillStyle(0xc59655, 0.92).fillRect(x - 6, y - 2, 10, 8);
    this.ui.fillRect(x - 2, y + 5, 10, 4);
    this.ui.fillStyle(0x342312, 0.88).fillRect(x - 7, y + 7, 16, 2);
  }
}

function compactStatuses(statuses: StatusState) {
  const active = Object.keys(statuses).filter((status) => statuses[status as keyof StatusState]);
  if (!active.length) return "ok";
  return active.slice(0, 2).join(" ");
}

function makeCardDissolveParticles(card: BattleCarouselCardSnapshot): BattleCarouselDissolveParticle[] {
  const particles: BattleCarouselDissolveParticle[] = [];
  for (let py = 0; py < card.h; py += 6) {
    for (let px = 0; px < card.w; px += 6) {
      if ((px + py) % 12 !== 0 && Phaser.Math.Between(0, 100) < 28) continue;
      particles.push({
        x: card.x + px,
        y: card.y + py,
        size: Phaser.Math.Between(3, 6),
        vx: Phaser.Math.Between(-18, 18),
        vy: Phaser.Math.Between(-12, 18),
        color: Phaser.Math.Between(0, 100) < 46 ? 0xff9a62 : 0xfff0a8,
        delay: Phaser.Math.Between(0, 120)
      });
    }
  }
  return particles;
}
