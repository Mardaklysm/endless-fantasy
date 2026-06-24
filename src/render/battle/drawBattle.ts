import Phaser from "phaser";
import { HEIGHT, LAYER_BATTLE_IMAGE, LAYER_WORLD_IMAGE, WIDTH } from "../../app/config";
import { PARTY_CLASS } from "../../assets/textureKeys";
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
    const labelW = Phaser.Math.Clamp(size + 16, 72, 132);
    const labelX = x + size / 2 - labelW / 2;
    const labelY = Math.max(8, y - 22);
    this.ui.fillStyle(0x07101d, 0.66).fillRect(labelX, labelY, labelW, 16);
    this.ui.lineStyle(1, 0xffd98a, 0.46).strokeRect(labelX, labelY, labelW, 16);
    this.text(labelX + 5, labelY + 2, enemy.intent.label, 9, "#fff0a8", "left", { wordWrapWidth: labelW - 10, strokeThickness: 1 });
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
  this.drawActorShadow(bodyCenterX, feetBaselineY - 4, 74, 14, 0.32 * alpha);
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
  const rowH = 34;
  const w = 246;
  const h = 22 + this.party.length * rowH + 8;
  const x = WIDTH - w - 14;
  const y = 62;
  this.drawBattleHudPanel(x, y, w, h, 0.74);
  this.text(x + 12, y + 6, "Party", 11, "#fff2a8", "left", { strokeThickness: 1 });
  this.party.forEach((member, idx) => {
    const rowY = y + 24 + idx * rowH;
    const active =
      this.currentBattleEntry()?.side === "party" &&
      this.currentBattleEntry()?.actorId === member.id &&
      !this.battle?.animation &&
      this.battle?.phase !== "resolving";
    if (active) {
      this.ui.fillStyle(0xfff0a8, 0.13).fillRect(x + 6, rowY - 2, w - 12, rowH - 2);
      this.ui.lineStyle(1, 0xfff0a8, 0.52).strokeRect(x + 6, rowY - 2, w - 12, rowH - 2);
    }
    this.drawPortrait(member, x + 10, rowY + 2, 0.58);
    this.text(x + 34, rowY, member.name, 10, member.hp <= 0 ? "#858b98" : "#ffffff", "left", { wordWrapWidth: 58, strokeThickness: 1 });
    this.text(x + 92, rowY, `${member.hp}/${member.maxHp}`, 10, "#dce9ff", "left", { wordWrapWidth: 54, strokeThickness: 1 });
    this.drawThinBar(x + 92, rowY + 16, 74, 6, member.hp, member.maxHp, 0x54bb77);
    this.text(x + 174, rowY, `T ${member.charges["1"].current}/${member.charges["2"].current}/${member.charges["3"].current}`, 9, "#c5d2f2", "left", {
      wordWrapWidth: 50,
      strokeThickness: 1
    });
    const statuses = compactStatuses(member.statuses);
    this.text(x + 174, rowY + 14, statuses, 9, statuses === "ok" ? "#96d7a5" : "#ffd98a", "left", { wordWrapWidth: 58, strokeThickness: 1 });
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
  const w = this.battle.phase === "command" ? 190 : 238;
  const h = 34 + options.length * 20 + 10;
  const x = Math.round(WIDTH / 2 - w / 2);
  const y = HEIGHT - h - 14;
  this.drawBattleHudPanel(x, y, w, h, 0.82);
  this.text(x + 14, y + 8, prompt, 11, "#fff2a8", "left", { wordWrapWidth: w - 28, strokeThickness: 1 });
  this.ui.fillStyle(0xfff0a8, 0.18).fillRect(x + 12, y + 28, w - 24, 1);
  options.forEach((option, idx) => {
    const selected = idx === this.battle!.selected;
    const rowY = y + 36 + idx * 20;
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
  const latest = this.battle.log.at(-1) ?? "Continue";
  const w = 430;
  const h = 46;
  const x = Math.round(WIDTH / 2 - w / 2);
  const y = HEIGHT - h - 14;
  this.drawBattleHudPanel(x, y, w, h, 0.78);
  this.text(x + 14, y + 8, latest, 11, "#ffffff", "left", { wordWrapWidth: w - 126, strokeThickness: 1 });
  this.text(x + w - 102, y + 21, "Enter", 10, "#fff2a8", "left", { wordWrapWidth: 84, strokeThickness: 1 });
}

export function drawBattleDebugLogOverlay(this: CrystalOathSceneContext) {
  if (!this.battle?.debugLogVisible) return;
  const lines = this.battle.log.slice(-5);
  const w = 268;
  const h = Math.min(122, 24 + lines.length * 18);
  const x = 12;
  const y = 58;
  this.drawBattleHudPanel(x, y, w, h, 0.48);
  this.text(x + 10, y + 6, "Debug Log", 9, "#fff2a8", "left", { strokeThickness: 1 });
  lines.forEach((line, idx) => {
    this.text(x + 10, y + 24 + idx * 17, line, 9, "#dce9ff", "left", { wordWrapWidth: w - 20, strokeThickness: 1 });
  });
}

export function drawBattleTurnCarousel(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  const state = (this.battle.carousel ??= { dissolves: [] });
  const cards = this.battleCarouselCards();
  if (!cards.length) return;
  const cardW = 96;
  const cardH = 34;
  const gap = 6;
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
  if (this.battle.current) entries.push(this.battle.current);
  for (let i = 0; i < this.battle.turnOrder.length && entries.length < 6; i += 1) {
    const entry = this.battle.turnOrder[(this.battle.turnIndex + i) % this.battle.turnOrder.length];
    if (!entry) continue;
    if (this.battle.current && entry.side === this.battle.current.side && entry.actorId === this.battle.current.actorId) continue;
    entries.push(entry);
  }
  const cards: BattleCarouselCard[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.side}:${entry.actorId}`;
    if (seen.has(key)) continue;
    const actor = this.actorForEntry(entry);
    if (!actor) continue;
    if (entry.side === "enemy" && actor.hp <= 0) continue;
    cards.push({ key, side: entry.side, actorId: entry.actorId, name: actor.name, current: cards.length === 0, down: actor.hp <= 0 });
    seen.add(key);
  }
  return cards;
}

export function drawBattleCarouselCard(this: CrystalOathSceneContext, card: BattleCarouselCard, x: number, y: number, w: number, h: number, alpha: number) {
  const border = card.current ? 0xfff0a8 : card.side === "party" ? 0x81e8ff : 0xff9a62;
  const fill = card.current ? 0x162139 : 0x07101d;
  const finalAlpha = alpha * (card.down ? 0.42 : 1);
  this.ui.fillStyle(fill, 0.78 * finalAlpha).fillRect(x, y, w, h);
  this.ui.lineStyle(card.current ? 2 : 1, border, (card.current ? 0.96 : 0.58) * finalAlpha).strokeRect(x, y, w, h);
  this.ui.fillStyle(border, (card.current ? 0.26 : 0.16) * finalAlpha).fillRect(x + 4, y + 4, 20, h - 8);
  this.text(x + 14, y + 10, card.name.slice(0, 1), 10, card.side === "party" ? "#dff8ff" : "#ffe1cf", "center", { strokeThickness: 1 });
  this.text(x + 30, y + (card.current ? 5 : 9), card.current ? `NOW ${card.name}` : card.name, card.current ? 9 : 10, card.down ? "#7d8491" : "#ffffff", "left", {
    wordWrapWidth: w - 36,
    strokeThickness: 1
  });
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
  this.ui.fillStyle(0x07101d, alpha).fillRect(x, y, w, h);
  this.ui.fillStyle(0xffffff, 0.035).fillRect(x + 2, y + 2, w - 4, Math.max(6, Math.floor(h * 0.32)));
  this.ui.lineStyle(2, 0x6d4f26, 0.86).strokeRect(x, y, w, h);
  this.ui.lineStyle(1, 0xffe0a0, 0.42).strokeRect(x + 2, y + 2, w - 4, h - 4);
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
