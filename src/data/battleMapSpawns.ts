import { HEIGHT, WIDTH } from "../app/config";
import type { AssetKey } from "../assets/assetTypes";
import type { EnemyState } from "./gameDataTypes";

export type BattleSpawnFacing = "left" | "right" | "up" | "down";
export type BattleMapVariant = "normal" | "boss";
export type BattleEnemySpawnRole = "normal" | "front" | "back" | "boss" | "flying" | "large";

export interface BattleSpawnSlot {
  id: string;
  x: number;
  y: number;
  order: number;
  facing: BattleSpawnFacing;
  radius?: number;
  previewSpriteId?: string;
  notes?: string;
}

export interface BattleEnemySpawnSlot extends BattleSpawnSlot {
  role?: BattleEnemySpawnRole;
}

export interface BattleMapSpawnMetadata {
  id: string;
  baseMapId: string;
  displayName: string;
  type?: string;
  variant: BattleMapVariant;
  background: {
    key: AssetKey;
    path: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  playerSlots: BattleSpawnSlot[];
  enemySlots: BattleEnemySpawnSlot[];
  bossSlot: BattleEnemySpawnSlot | null;
}

export interface ResolvedBattleSpawnSlot {
  id: string;
  x: number;
  y: number;
  size: number;
  facing: BattleSpawnFacing;
  radius: number;
  role?: BattleEnemySpawnRole;
  source: "slot" | "fallback";
  metadataX: number;
  metadataY: number;
}

export interface BattleSpawnLayout {
  battleMap?: BattleMapSpawnMetadata;
  playerSlots: ResolvedBattleSpawnSlot[];
  enemySlots: ResolvedBattleSpawnSlot[];
  warnings: string[];
}

const modules = import.meta.glob("./battle-maps/*.json", { eager: true, import: "default" }) as Record<string, BattleMapSpawnMetadata>;

export const battleMapSpawnRegistry = Object.fromEntries(Object.values(modules).map((metadata) => [metadata.id, normalizeBattleMap(metadata)]));
export const battleMapSpawnMetadata = Object.values(battleMapSpawnRegistry).sort(
  (a, b) => a.displayName.localeCompare(b.displayName) || a.variant.localeCompare(b.variant)
);

const warnedMessages = new Set<string>();

export function battleMapIdForBackground(background: AssetKey | undefined, variant: BattleMapVariant = "normal"): string | undefined {
  if (!background) return undefined;
  return battleMapSpawnMetadata.find((metadata) => metadata.background.key === background && metadata.variant === variant)?.id;
}

export function battleMapBackgroundKeyForId(id: string | undefined): AssetKey | undefined {
  return id ? battleMapSpawnRegistry[id]?.background.key : undefined;
}

export function resolveBattleMapVariant(baseMapId: string | undefined, variant: BattleMapVariant): BattleMapSpawnMetadata | undefined {
  if (!baseMapId) return undefined;
  return (
    battleMapSpawnMetadata.find((metadata) => metadata.baseMapId === baseMapId && metadata.variant === variant) ??
    battleMapSpawnMetadata.find((metadata) => metadata.baseMapId === baseMapId)
  );
}

export function isBossEncounter(enemies: EnemyState[], kind?: "random" | "boss", bossId?: string): boolean {
  return kind === "boss" || !!bossId || enemies.some((enemy) => !!enemy.boss);
}

export function resolveBattleSpawnPositions(input: {
  battleMapId?: string;
  background?: AssetKey;
  partyCount: number;
  enemies: EnemyState[];
  encounterKind?: "normal" | "boss";
  warn?: (message: string) => void;
}): BattleSpawnLayout {
  const desiredVariant = input.encounterKind ?? (input.enemies.some((enemy) => enemy.boss) ? "boss" : "normal");
  const battleMap = input.battleMapId
    ? battleMapSpawnRegistry[input.battleMapId]
    : battleMapSpawnRegistry[battleMapIdForBackground(input.background, desiredVariant) ?? ""];
  const warnings: string[] = [];
  const warn = (message: string) => warnings.push(message);
  if (!battleMap) {
    warn(`No battle spawn metadata found for ${input.battleMapId ?? input.background ?? "unknown battle map"}; using fixed fallback slots.`);
    const layout = {
      playerSlots: fallbackPlayerSlots(input.partyCount),
      enemySlots: fallbackEnemySlots(input.enemies),
      warnings
    };
    emitWarnings(warnings, input.warn);
    return layout;
  }

  if (battleMap.variant !== desiredVariant) warn(`${battleMap.id} is a ${battleMap.variant} map used for a ${desiredVariant} encounter.`);
  const playerSlots = resolvePlayerSlots(battleMap, input.partyCount, warn);
  const enemySlots = battleMap.variant === "boss" || desiredVariant === "boss"
    ? resolveBossEnemySlots(battleMap, input.enemies, warn)
    : resolveNormalEnemySlots(battleMap, input.enemies, warn);
  const layout = { battleMap, playerSlots, enemySlots, warnings };
  emitWarnings(warnings, input.warn);
  return layout;
}

function normalizeBattleMap(metadata: BattleMapSpawnMetadata): BattleMapSpawnMetadata {
  metadata.baseMapId ??= metadata.id.replace(/_(normal|boss)$/, "");
  metadata.variant ??= metadata.id.endsWith("_boss") ? "boss" : "normal";
  metadata.playerSlots ??= [];
  metadata.enemySlots ??= [];
  metadata.bossSlot ??= null;
  return metadata;
}

function resolvePlayerSlots(battleMap: BattleMapSpawnMetadata, partyCount: number, warn: (message: string) => void): ResolvedBattleSpawnSlot[] {
  const used: ResolvedBattleSpawnSlot[] = [];
  const exactSlots = [...battleMap.playerSlots].sort(byOrderThenId);
  for (const slot of exactSlots) {
    if (used.length >= partyCount) break;
    const resolved = playerSlotFromPoint(battleMap, slot, "slot");
    if (fitsAndDoesNotOverlap(resolved, used)) used.push(resolved);
  }
  if (used.length < partyCount) fillWithFallback("player", battleMap, partyCount, used, warn);
  if (!battleMap.playerSlots.length) warn(`${battleMap.id} has no player spawn sources.`);
  return used;
}

function resolveNormalEnemySlots(
  battleMap: BattleMapSpawnMetadata,
  enemies: EnemyState[],
  warn: (message: string) => void
): ResolvedBattleSpawnSlot[] {
  const used: ResolvedBattleSpawnSlot[] = [];
  const allowedEnemies = enemies.slice(0, 4);
  if (enemies.length > 4) warn(`${battleMap.id} normal layout supports 4 enemies; ${enemies.length} were provided.`);
  const exactSlots = [...battleMap.enemySlots].sort(byOrderThenId).slice(0, 4);
  resolveEnemiesIntoSlots(battleMap, allowedEnemies, exactSlots, used);
  if (!battleMap.enemySlots.length) warn(`${battleMap.id} has no enemy spawn sources.`);
  return used;
}

function resolveBossEnemySlots(
  battleMap: BattleMapSpawnMetadata,
  enemies: EnemyState[],
  warn: (message: string) => void
): ResolvedBattleSpawnSlot[] {
  const used: ResolvedBattleSpawnSlot[] = [];
  const bossIndex = enemies.findIndex((enemy) => enemy.boss);
  const boss = bossIndex >= 0 ? enemies[bossIndex] : enemies[0];
  const minions = enemies.filter((enemy, index) => index !== bossIndex && !enemy.boss).slice(0, 3);
  if (enemies.filter((enemy) => !enemy.boss).length > 3) warn(`${battleMap.id} boss layout supports 3 non-boss enemies.`);
  if (boss && battleMap.bossSlot) {
    used.push(enemySlotFromPoint(battleMap, battleMap.bossSlot, boss, "slot"));
  } else if (boss) {
    warn(`${battleMap.id} is missing a bossSlot; using the first enemy slot or fallback.`);
    const fallbackBossSlot = battleMap.enemySlots[0];
    used.push(fallbackBossSlot ? enemySlotFromPoint(battleMap, { ...fallbackBossSlot, role: "boss", radius: 256 }, boss, "slot") : fallbackEnemySlots([boss])[0]);
  }
  resolveEnemiesIntoSlots(battleMap, minions, [...battleMap.enemySlots].sort(byOrderThenId).slice(0, 3), used);
  if (!battleMap.bossSlot) warn(`${battleMap.id} has no bossSlot.`);
  return used;
}

function resolveEnemiesIntoSlots(
  battleMap: BattleMapSpawnMetadata,
  enemies: EnemyState[],
  exactSlots: BattleEnemySpawnSlot[],
  used: ResolvedBattleSpawnSlot[]
) {
  const claimed = new Set<string>();
  for (const enemy of enemies) {
    const role = enemyRole(enemy);
    const slot = exactSlots.find((candidate) => !claimed.has(candidate.id) && roleMatches(candidate.role, role));
    const fallbackSlot = exactSlots.find((candidate) => !claimed.has(candidate.id));
    const chosen = slot ?? fallbackSlot;
    if (chosen) {
      const resolved = enemySlotFromPoint(battleMap, chosen, enemy, "slot");
      if (fitsAndDoesNotOverlap(resolved, used) || !exactSlots.some((candidate) => !claimed.has(candidate.id) && candidate.id !== chosen.id)) {
        used.push(resolved);
        claimed.add(chosen.id);
        continue;
      }
    }
    const fallback = fallbackEnemySlots([enemy])[0];
    if (fallback) used.push(offsetFallback(fallback, used.length, "enemy"));
  }
}

function fillWithFallback(
  side: "player" | "enemy",
  battleMap: BattleMapSpawnMetadata,
  desiredCount: number,
  used: ResolvedBattleSpawnSlot[],
  warn: (message: string) => void
) {
  warn(`${battleMap.id} needed ${side} fallback positions.`);
  const fallback = side === "player" ? fallbackPlayerSlots(desiredCount) : fallbackEnemySlots([]);
  while (used.length < desiredCount) used.push(offsetFallback(fallback[used.length % fallback.length], used.length, side));
}

function playerSlotFromPoint(
  battleMap: BattleMapSpawnMetadata,
  slot: BattleSpawnSlot,
  source: ResolvedBattleSpawnSlot["source"]
): ResolvedBattleSpawnSlot {
  const point = imageToScreenPoint(battleMap, slot.x, slot.y);
  return {
    id: slot.id,
    x: point.x - 48,
    y: point.y - 82,
    size: 96,
    facing: slot.facing ?? "left",
    radius: screenRadius(battleMap, slot.radius ?? 138),
    source,
    metadataX: slot.x,
    metadataY: slot.y
  };
}

function enemySlotFromPoint(
  battleMap: BattleMapSpawnMetadata,
  slot: BattleEnemySpawnSlot,
  enemy: EnemyState | undefined,
  source: ResolvedBattleSpawnSlot["source"]
): ResolvedBattleSpawnSlot {
  const role = slot.role ?? (enemy ? enemyRole(enemy) : "normal");
  const baseSize = role === "boss" || enemy?.boss ? 178 : role === "large" ? 138 : 106;
  const size = Math.round(clamp(screenRadius(battleMap, slot.radius ?? (role === "boss" ? 256 : 152)) * 2, baseSize * 0.85, baseSize * 1.25));
  const point = imageToScreenPoint(battleMap, slot.x, slot.y);
  return {
    id: slot.id,
    x: point.x - size / 2,
    y: point.y - size + 4,
    size,
    facing: slot.facing ?? "right",
    radius: size / 2,
    role,
    source,
    metadataX: slot.x,
    metadataY: slot.y
  };
}

function imageToScreenPoint(battleMap: BattleMapSpawnMetadata, x: number, y: number) {
  return {
    x: (x / battleMap.dimensions.width) * WIDTH,
    y: (y / battleMap.dimensions.height) * HEIGHT
  };
}

function screenRadius(battleMap: BattleMapSpawnMetadata, radius: number) {
  return radius * ((WIDTH / battleMap.dimensions.width + HEIGHT / battleMap.dimensions.height) / 2);
}

function fallbackPlayerSlots(count: number): ResolvedBattleSpawnSlot[] {
  const slots = [
    { x: 678, y: 92 },
    { x: 728, y: 170 },
    { x: 778, y: 248 },
    { x: 698, y: 286 }
  ];
  return slots.slice(0, Math.max(1, count)).map((slot, index) => ({
    id: `player_fallback_${index + 1}`,
    x: slot.x,
    y: slot.y,
    size: 96,
    facing: "left",
    radius: 48,
    source: "fallback",
    metadataX: slot.x,
    metadataY: slot.y
  }));
}

function fallbackEnemySlots(enemies: EnemyState[]): ResolvedBattleSpawnSlot[] {
  if (enemies.length === 1 && enemies[0]?.boss) {
    return [{ id: "enemy_fallback_boss", x: 116, y: 78, size: 178, facing: "right", radius: 89, role: "boss", source: "fallback", metadataX: 116, metadataY: 78 }];
  }
  return [
    { id: "enemy_fallback_1", x: 74, y: 100, size: 106, facing: "right", radius: 53, role: "front", source: "fallback", metadataX: 74, metadataY: 100 },
    { id: "enemy_fallback_2", x: 236, y: 156, size: 106, facing: "right", radius: 53, role: "normal", source: "fallback", metadataX: 236, metadataY: 156 },
    { id: "enemy_fallback_3", x: 92, y: 220, size: 106, facing: "right", radius: 53, role: "back", source: "fallback", metadataX: 92, metadataY: 220 }
  ];
}

function offsetFallback(slot: ResolvedBattleSpawnSlot, index: number, side: "player" | "enemy"): ResolvedBattleSpawnSlot {
  const offset = Math.floor(index / 3) * (side === "player" ? 28 : 24);
  return { ...slot, id: `${slot.id}_${index + 1}`, x: slot.x + offset, y: slot.y + offset };
}

function fitsAndDoesNotOverlap(slot: ResolvedBattleSpawnSlot, used: ResolvedBattleSpawnSlot[]) {
  const center = slotCenter(slot);
  if (center.x < 0 || center.x > WIDTH || center.y < 0 || center.y > HEIGHT) return false;
  return used.every((other) => {
    const otherCenter = slotCenter(other);
    return Math.hypot(center.x - otherCenter.x, center.y - otherCenter.y) >= Math.min(slot.radius + other.radius, 78);
  });
}

function slotCenter(slot: ResolvedBattleSpawnSlot) {
  return { x: slot.x + slot.size / 2, y: slot.y + slot.size * 0.72 };
}

function enemyRole(enemy: EnemyState): BattleEnemySpawnRole {
  if (enemy.boss) return "boss";
  if (enemy.sprite === "wing") return "flying";
  if (enemy.sprite === "serpent" || enemy.sprite === "crown") return "large";
  return "normal";
}

function roleMatches(slotRole: BattleEnemySpawnRole | undefined, desired: BattleEnemySpawnRole) {
  if (!slotRole || slotRole === "normal") return desired === "normal" || desired === "front" || desired === "back";
  if (slotRole === desired) return true;
  if (desired === "normal") return slotRole === "front";
  if (desired === "large") return slotRole === "boss";
  return false;
}

function byOrderThenId(a: { order?: number; id: string }, b: { order?: number; id: string }) {
  return (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id);
}

function emitWarnings(warnings: string[], customWarn: ((message: string) => void) | undefined) {
  for (const warning of warnings) {
    customWarn?.(warning);
    const key = `battle-spawn:${warning}`;
    if (warnedMessages.has(key)) continue;
    warnedMessages.add(key);
    if (typeof console !== "undefined") console.warn(warning);
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
