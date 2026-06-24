import Phaser from "phaser";
import { HEIGHT, LAYER_BATTLE_IMAGE, LAYER_UI_IMAGE, LAYER_WORLD_IMAGE, WIDTH } from "../../app/config";
import { ENEMY_TEXTURES, PARTY_CLASS, PORTRAIT_TEXTURES } from "../../assets/textureKeys";
import {
  battlePlayerSlotOrigin,
  battlePlayerSlotSize,
  battlePlayerSpriteCellWidth
} from "../../data/battleSpritePresentation";
import { resolveBattleSpawnPositions } from "../../data/battleMapSpawns";
import type { BattleSpawnFacing } from "../../data/battleMapSpawns";
import type { CharacterState, EnemyState, StatusState } from "../../data/gameDataTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";
import type { Vec } from "../../scene/sceneTypes";
import type { BattleCarouselCardSnapshot, BattleCarouselDissolveParticle, InitiativeEntry } from "../../systems/battle/battleTypes";

type BattleCarouselCard = {
  key: string;
  side: "party" | "enemy";
  actorId: string;
  name: string;
  current: boolean;
  down: boolean;
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

export function drawBattle(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  this.drawBattleBackdrop();
  const selectedEnemy = this.selectedBattleEnemy();
  this.battle.enemies.forEach((enemy, idx) => {
    const slot = this.enemyBattleSlot(enemy, idx);
    const targeted = selectedEnemy?.uid === enemy.uid;
    const offset = this.battleActorOffset("enemy", enemy.uid);
    this.drawBattleEnemy(enemy, slot.x + offset.x, slot.y + offset.y, slot.size, targeted);
  });
  this.party.forEach((member, idx) => {
    const slot = this.partyBattleSlot(idx);
    const offset = this.battleActorOffset("party", member.id);
    const active =
      this.currentBattleEntry()?.side === "party" &&
      this.currentBattleEntry()?.actorId === member.id &&
      !this.battle?.animation &&
      this.battle?.phase !== "resolving";
    this.drawPartyBattler(member, slot.x + offset.x, slot.y + offset.y, idx, active, slot.facing);
  });
  this.drawBattleFloatingTexts();
  this.drawBattleTurnCarousel();
  this.drawBattlePartyStatusHud();
  this.drawBattleCommandMenu();
  this.drawBattleLogPrompt();
  this.drawBattleDebugLogOverlay();
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
    return { x: slot.x + origin.bodyCenterX, y: slot.y + origin.feetBaselineY - 50 };
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

export function selectedBattleEnemy(this: CrystalOathSceneContext): EnemyState | undefined {
  if (!this.battle || this.battle.phase !== "target") return undefined;
  return this.battle.enemies.filter((enemy) => enemy.hp > 0)[this.battle.selected];
}

export function drawBattleEnemy(this: CrystalOathSceneContext, enemy: EnemyState, x: number, y: number, size: number, targeted: boolean) {
  const alive = enemy.hp > 0;
  this.drawActorShadow(x + size / 2, y + size - 3, size * 0.76, Math.max(10, size * 0.13), alive ? 0.3 : 0.14);
  if (alive && enemy.intent) {
    const labelY = Math.max(12, y - 16);
    const labelX = x + size / 2;
    drawDiamond.call(this, labelX - 22, labelY + 6, 4, 0.78);
    this.text(labelX - 12, labelY, enemy.intent.label, 8, "#fff0a8", "left", {
      wordWrapWidth: Phaser.Math.Clamp(size + 12, 64, 110),
      stroke: "#050812",
      strokeThickness: 2
    });
  }
  if (targeted) {
    this.ui.fillStyle(0xfff0a8, 0.13).fillEllipse(x + size / 2, y + size - 2, size * 0.92, Math.max(20, size * 0.22));
    this.ui.lineStyle(2, 0xfff0a8, 0.95).strokeRect(x - 6, y - 6, size + 12, size + 12);
  }
  this.drawEnemySprite(enemy, x, y, enemy.boss ? 5 : 4, size);
  if (targeted) {
    this.text(x + size / 2, y + size + 4, enemy.name, 10, "#fff2a8", "center", { wordWrapWidth: Math.max(86, size + 28), strokeThickness: 2 });
  }
}

export function drawPartyBattler(
  this: CrystalOathSceneContext,
  member: CharacterState,
  x: number,
  y: number,
  idx: number,
  active: boolean,
  facing: BattleSpawnFacing = "left"
) {
  const classId = PARTY_CLASS[member.id];
  const frame = this.battleCharacterFrame(member, facing);
  const alpha = member.hp <= 0 ? 0.36 : 1;
  const origin = battlePlayerSlotOrigin();
  const bodyCenterX = x + origin.bodyCenterX;
  const feetBaselineY = y + origin.feetBaselineY;
  this.drawActorShadow(bodyCenterX, feetBaselineY - 4, Math.round(battlePlayerSpriteCellWidth() * 0.46), 14, 0.32 * alpha);
  if (active) {
    this.ui.fillStyle(0xfff0a8, 0.16).fillEllipse(bodyCenterX, feetBaselineY - 4, 82, 20);
    this.ui.lineStyle(2, 0xfff0a8, 0.88).strokeEllipse(bodyCenterX, feetBaselineY - 4, 82, 20);
  }
  if (!this.drawCharacterSpriteFrame(classId, frame, bodyCenterX, feetBaselineY, battlePlayerSpriteCellWidth(), LAYER_BATTLE_IMAGE, alpha)) {
    const palettes = {
      arlen: [0xf0c18d, 0xc9433f, 0xe9edf7, 0x362a4b],
      mira: [0xf1d0aa, 0xf5f2e8, 0x5fac73, 0x314c33],
      kael: [0xe1b284, 0x1c365d, 0xf0b13e, 0x121827]
    }[member.id];
    this.g.fillStyle(0x050812, alpha).fillRect(x + 14, y + 16, 22, 38);
    this.g.fillStyle(palettes[0], alpha).fillRect(x + 16, y + 8, 16, 16);
    this.g.fillStyle(palettes[1], alpha).fillRect(x + 11, y + 24, 26, 29);
    this.g.fillStyle(palettes[2], alpha).fillRect(x + 17, y + 30, 9, 22);
    this.g.fillStyle(palettes[3], alpha).fillRect(x + 11, y + 53, 8, 10 + (idx % 2));
    this.g.fillRect(x + 28, y + 53, 8, 10 + ((idx + 1) % 2));
  }
  if (active) this.drawActiveTurnMarker(bodyCenterX, y + 10);
}

export function drawActiveTurnMarker(this: CrystalOathSceneContext, cx: number, y: number) {
  const bob = Math.sin(this.time.now / 140) * 3;
  this.ui.fillStyle(0x050812, 0.45).fillTriangle(cx, y + bob + 3, cx - 10, y + bob - 9, cx + 10, y + bob - 9);
  this.ui.fillStyle(0xfff0a8, 1).fillTriangle(cx, y + bob + 1, cx - 8, y + bob - 8, cx + 8, y + bob - 8);
  this.ui.lineStyle(1, 0xffffff, 0.7).strokeTriangle(cx, y + bob + 1, cx - 8, y + bob - 8, cx + 8, y + bob - 8);
}

export function drawBattlePartyStatusHud(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  const rowH = 54;
  const w = 208;
  const h = 16 + this.party.length * rowH + 8;
  const x = WIDTH - w - 10;
  const y = 18;
  this.drawBattleHudPanel(x, y, w, h, 0.78);
  this.party.forEach((member, idx) => {
    const rowY = y + 12 + idx * rowH;
    const active =
      this.currentBattleEntry()?.side === "party" &&
      this.currentBattleEntry()?.actorId === member.id &&
      !this.battle?.animation &&
      this.battle?.phase !== "resolving";
    const down = member.hp <= 0;
    if (idx > 0) this.ui.fillStyle(0xffe0a0, 0.18).fillRect(x + 8, rowY - 3, w - 16, 1);
    this.ui.fillStyle(active ? 0x182238 : 0x060d18, active ? 0.58 : 0.22).fillRect(x + 6, rowY - 4, w - 12, rowH - 5);
    if (active) {
      this.ui.lineStyle(1, BATTLE_UI.goldBright, 0.62).strokeRect(x + 6, rowY - 4, w - 12, rowH - 5);
    }
    drawPartyCardPortrait.call(this, member, x + 12, rowY + 4, 30, 38);
    this.text(x + 50, rowY + 3, member.name, 10, down ? "#858b98" : "#ffffff", "left", { wordWrapWidth: 76, strokeThickness: 1 });
    this.text(x + w - 56, rowY + 4, `${member.hp}/${member.maxHp}`, 9, down ? "#858b98" : "#dce9ff", "left", {
      wordWrapWidth: 50,
      strokeThickness: 1
    });
    this.text(x + 50, rowY + 21, "HP", 8, down ? "#777f91" : "#89f39d", "left", { strokeThickness: 1 });
    this.drawThinBar(x + 72, rowY + 24, 78, 6, member.hp, member.maxHp, BATTLE_UI.hp);
    drawSpellSlotRow.call(this, member, x + 50, rowY + 37, 116);
    const statuses = compactStatuses(member.statuses);
    drawStatusBadge.call(this, statuses, x + w - 34, rowY + 24, 24, 18, down);
  });
}

export function drawBattleCommandMenu(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  const actor = this.currentBattleActor();
  if (!["command", "target", "skill", "spell", "item", "allyTarget"].includes(this.battle.phase) || !actor) return;
  const options = this.battleOptions();
  if (!options.length) return;
  const prompt =
    this.battle.phase === "command"
      ? actor.name
      : this.battle.phase === "target"
        ? "Target"
        : this.battle.phase === "skill"
          ? "Skill"
          : this.battle.phase === "spell"
            ? "Magic"
            : this.battle.phase === "item"
              ? "Item"
              : "Ally";

  if (this.battle.phase === "command") {
    drawBattleCommandGrid.call(this, actor.name, options);
    return;
  }

  const rowH = 20;
  const w = 286;
  const h = 38 + options.length * rowH + 10;
  const x = Math.round(WIDTH / 2 - w / 2);
  const y = HEIGHT - h - 14;
  this.drawBattleHudPanel(x, y, w, h, 0.86);
  drawPanelTitle.call(this, x, y + 8, w, prompt);
  options.forEach((option, idx) => {
    const selected = idx === this.battle!.selected;
    const rowY = y + 36 + idx * rowH;
    if (selected) {
      this.ui.fillStyle(0xfff0a8, 0.16).fillRect(x + 8, rowY - 3, w - 16, 18);
      this.ui.lineStyle(1, 0xfff0a8, 0.7).strokeRect(x + 8, rowY - 3, w - 16, 18);
      this.drawCursor(x + 12, rowY - 1);
    }
    const prefix = selected && !this.hasTexture("ui_cursor_arrow") ? ">" : "";
    this.text(x + 34, rowY - 3, `${prefix}${option}`, 10, "#ffffff", "left", { wordWrapWidth: w - 44, strokeThickness: 1 });
  });
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
  const cardW = 58;
  const cardH = 46;
  const gap = 8;
  const totalW = cards.length * cardW + (cards.length - 1) * gap;
  const startX = Math.round(WIDTH / 2 - totalW / 2);
  const y = 10;
  const now = this.time.now;
  const key = cards.map((card) => card.key).join("|");
  const previous = state.previousCards ?? [];
  if (state.lastKey !== key) {
    state.animationStartedAt = now;
    for (const old of previous) {
      if (old.side !== "enemy" || cards.some((card) => card.key === old.key)) continue;
      state.dissolves ??= [];
      state.dissolves.push({ key: old.key, createdAt: now, duration: 420, particles: makeCardDissolveParticles(old) });
    }
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
  drawCarouselPortrait.call(this, card, x + 6, y + 6, w - 12, h - 12, finalAlpha);
  if (card.current) {
    this.ui.fillStyle(BATTLE_UI.goldBright, 0.96 * finalAlpha).fillRect(x + w - 24, y - 10, 30, 12);
    this.ui.lineStyle(1, BATTLE_UI.shadow, 0.7 * finalAlpha).strokeRect(x + w - 24, y - 10, 30, 12);
    this.text(x + w - 9, y - 9, "NOW", 8, "#241906", "center", { wordWrapWidth: 28, strokeThickness: 0 });
    this.ui.fillStyle(BATTLE_UI.goldBright, 0.94 * finalAlpha).fillTriangle(x + w / 2, y + h + 7, x + w / 2 - 7, y + h - 1, x + w / 2 + 7, y + h - 1);
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
    const center = this.battleActorCenter(entry.side, entry.actorId);
    if (!center) return true;
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

function drawBattleCommandGrid(this: CrystalOathSceneContext, actorName: string, options: string[]) {
  const w = 334;
  const h = 136;
  const x = Math.round(WIDTH / 2 - w / 2);
  const y = HEIGHT - h - 14;
  const optionW = 142;
  const optionH = 26;
  const colGap = 14;
  const rowGap = 7;
  const startX = x + 20;
  const startY = y + 42;

  this.drawBattleHudPanel(x, y, w, h, 0.88);
  drawPanelTitle.call(this, x, y + 9, w, actorName);

  options.forEach((option, idx) => {
    const selected = idx === this.battle!.selected;
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const optionX = startX + col * (optionW + colGap);
    const optionY = startY + row * (optionH + rowGap);
    this.ui.fillStyle(selected ? BATTLE_UI.panelWarm : 0x050b15, selected ? 0.82 : 0.58).fillRect(optionX, optionY, optionW, optionH);
    this.ui.lineStyle(1, selected ? BATTLE_UI.goldBright : 0x526071, selected ? 0.88 : 0.5).strokeRect(optionX, optionY, optionW, optionH);
    if (selected) {
      this.ui.fillStyle(BATTLE_UI.goldBright, 0.13).fillRect(optionX + 2, optionY + 2, optionW - 4, optionH - 4);
      this.drawCursor(optionX - 18, optionY + 5);
    }
    drawCommandIcon.call(this, COMMAND_ICONS[option], optionX + 15, optionY + 13, selected);
    this.text(optionX + 40, optionY + 5, option, 10, selected ? "#fff7c7" : BATTLE_UI.text, "left", {
      wordWrapWidth: optionW - 48,
      strokeThickness: 1
    });
  });
}

function drawPanelTitle(this: CrystalOathSceneContext, x: number, y: number, w: number, title: string) {
  const cy = y + 7;
  this.text(x + w / 2, y, title, 11, "#fff2a8", "center", { wordWrapWidth: w - 70, strokeThickness: 1 });
  this.ui.fillStyle(BATTLE_UI.goldBright, 0.55).fillRect(x + 58, cy, Math.max(20, w / 2 - 96), 1);
  this.ui.fillRect(x + w / 2 + 42, cy, Math.max(20, w / 2 - 100), 1);
  drawDiamond.call(this, x + 78, cy, 5, 0.86);
  drawDiamond.call(this, x + w - 78, cy, 5, 0.86);
}

function drawPartyCardPortrait(this: CrystalOathSceneContext, member: CharacterState, x: number, y: number, w: number, h: number) {
  const alpha = member.hp <= 0 ? 0.42 : 1;
  const texture = PORTRAIT_TEXTURES[member.id];
  this.ui.fillStyle(0x030711, 0.92).fillRect(x, y, w, h);
  if (texture && this.hasTexture(texture)) {
    this.drawTexture(texture, x, y, w, h, LAYER_UI_IMAGE, alpha);
  } else {
    const palettes = {
      arlen: [0xf1c07f, 0xd8c7a2, 0x7a3b24],
      mira: [0xdfe4ef, 0x8364bc, 0xc9d2ff],
      kael: [0xd18a45, 0x244d88, 0xe9edf7]
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
      this.drawTexture(texture, x, y, w, h, LAYER_UI_IMAGE, alpha);
      return;
    }
  } else {
    const enemy = this.battle?.enemies.find((candidate) => candidate.uid === card.actorId);
    const texture = enemy ? ENEMY_TEXTURES[enemy.id] : undefined;
    if (texture && this.hasTexture(texture)) {
      this.drawTexture(texture, x, y, w, h, LAYER_UI_IMAGE, alpha);
      return;
    }
  }
  this.text(x + w / 2, y + h / 2 - 5, card.name.slice(0, 1), 12, card.side === "party" ? "#dff8ff" : "#ffe1cf", "center", {
    strokeThickness: 1
  });
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

function drawDiamond(this: CrystalOathSceneContext, cx: number, cy: number, size: number, alpha: number) {
  this.ui.fillStyle(BATTLE_UI.goldBright, alpha).fillTriangle(cx, cy - size, cx - size, cy, cx + size, cy);
  this.ui.fillTriangle(cx, cy + size, cx - size, cy, cx + size, cy);
  this.ui.lineStyle(1, BATTLE_UI.shadow, 0.48).strokeTriangle(cx, cy - size, cx - size, cy, cx + size, cy);
  this.ui.strokeTriangle(cx, cy + size, cx - size, cy, cx + size, cy);
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
