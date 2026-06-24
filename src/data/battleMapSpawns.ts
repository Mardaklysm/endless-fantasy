import { HEIGHT, WIDTH } from "../app/config";
import type { AssetKey } from "../assets/assetTypes";
import type { EnemyState } from "./gameDataTypes";

export type BattleSpawnFacing = "left" | "right" | "up" | "down";
export type BattleEnemySpawnRole = "default" | "front" | "back" | "boss" | "flying" | "large";

export type BattleSpawnShape =
  | { type: "rect"; x: number; y: number; width: number; height: number }
  | { type: "circle"; x: number; y: number; radius: number }
  | { type: "polygon"; points: { x: number; y: number }[] };

export interface BattleSpawnSlot {
  id: string;
  x: number;
  y: number;
  order: number;
  facing: BattleSpawnFacing;
  radius?: number;
  notes?: string;
}

export interface BattleEnemySpawnSlot extends BattleSpawnSlot {
  role?: BattleEnemySpawnRole;
  weight?: number;
}

export interface BattleSpawnZone {
  id: string;
  shape: BattleSpawnShape;
  capacity?: number;
  facing?: BattleSpawnFacing;
  notes?: string;
}

export interface BattleEnemySpawnZone extends BattleSpawnZone {
  role?: BattleEnemySpawnRole;
  weight?: number;
}

export interface BattleMapSpawnMetadata {
  id: string;
  displayName: string;
  type?: string;
  background: {
    key: AssetKey;
    path: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  spawns: {
    playerSlots: BattleSpawnSlot[];
    enemySlots: BattleEnemySpawnSlot[];
    playerZones: BattleSpawnZone[];
    enemyZones: BattleEnemySpawnZone[];
  };
}

export interface ResolvedBattleSpawnSlot {
  id: string;
  x: number;
  y: number;
  size: number;
  facing: BattleSpawnFacing;
  radius: number;
  role?: BattleEnemySpawnRole;
  source: "slot" | "zone" | "fallback";
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
export const battleMapSpawnMetadata = Object.values(battleMapSpawnRegistry).sort((a, b) => a.displayName.localeCompare(b.displayName));

const warnedMessages = new Set<string>();

export function battleMapIdForBackground(background: AssetKey | undefined): string | undefined {
  if (!background) return undefined;
  return battleMapSpawnMetadata.find((metadata) => metadata.background.key === background)?.id;
}

export function battleMapBackgroundKeyForId(id: string | undefined): AssetKey | undefined {
  return id ? battleMapSpawnRegistry[id]?.background.key : undefined;
}

export function resolveBattleSpawnPositions(input: {
  battleMapId?: string;
  background?: AssetKey;
  partyCount: number;
  enemies: EnemyState[];
  seed?: string | number;
  warn?: (message: string) => void;
}): BattleSpawnLayout {
  const battleMap = input.battleMapId ? battleMapSpawnRegistry[input.battleMapId] : battleMapSpawnRegistry[battleMapIdForBackground(input.background) ?? ""];
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

  const playerSlots = resolvePlayerSlots(battleMap, input.partyCount, warn);
  const enemySlots = resolveEnemySlots(battleMap, input.enemies, warn, input.seed);
  const layout = { battleMap, playerSlots, enemySlots, warnings };
  emitWarnings(warnings, input.warn);
  return layout;
}

function normalizeBattleMap(metadata: BattleMapSpawnMetadata): BattleMapSpawnMetadata {
  metadata.spawns ??= { playerSlots: [], enemySlots: [], playerZones: [], enemyZones: [] };
  metadata.spawns.playerSlots ??= [];
  metadata.spawns.enemySlots ??= [];
  metadata.spawns.playerZones ??= [];
  metadata.spawns.enemyZones ??= [];
  return metadata;
}

function resolvePlayerSlots(battleMap: BattleMapSpawnMetadata, partyCount: number, warn: (message: string) => void): ResolvedBattleSpawnSlot[] {
  const used: ResolvedBattleSpawnSlot[] = [];
  const exactSlots = [...battleMap.spawns.playerSlots].sort(byOrderThenId);
  for (const slot of exactSlots) {
    if (used.length >= partyCount) break;
    const resolved = playerSlotFromPoint(battleMap, slot, "slot");
    if (fitsAndDoesNotOverlap(resolved, used)) used.push(resolved);
  }
  if (used.length < partyCount) fillFromZones(battleMap, "player", partyCount, used, warn);
  if (used.length < partyCount) fillWithFallback("player", battleMap, partyCount, used, warn);
  if (!battleMap.spawns.playerSlots.length && !battleMap.spawns.playerZones.length) warn(`${battleMap.id} has no player spawn sources.`);
  return used;
}

function resolveEnemySlots(
  battleMap: BattleMapSpawnMetadata,
  enemies: EnemyState[],
  warn: (message: string) => void,
  seed: string | number | undefined
): ResolvedBattleSpawnSlot[] {
  const used: ResolvedBattleSpawnSlot[] = [];
  const exactSlots = [...battleMap.spawns.enemySlots].sort(byOrderThenId);
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
    const before = used.length;
    fillFromZones(battleMap, "enemy", used.length + 1, used, warn, role, seed);
    if (used.length === before) {
      const fallback = fallbackEnemySlots([enemy])[0];
      if (fallback) used.push(offsetFallback(fallback, used.length, "enemy"));
    }
  }
  if (!battleMap.spawns.enemySlots.length && !battleMap.spawns.enemyZones.length) warn(`${battleMap.id} has no enemy spawn sources.`);
  return used;
}

function fillFromZones(
  battleMap: BattleMapSpawnMetadata,
  side: "player" | "enemy",
  desiredCount: number,
  used: ResolvedBattleSpawnSlot[],
  warn: (message: string) => void,
  role: BattleEnemySpawnRole = "default",
  seed?: string | number
) {
  const zones = side === "player" ? battleMap.spawns.playerZones : battleMap.spawns.enemyZones.filter((zone) => roleMatches(zone.role, role));
  for (const zone of zones) {
    const capacity = Math.max(1, zone.capacity ?? 1);
    for (let i = 0; i < capacity && used.length < desiredCount; i += 1) {
      const point = samplePointInSpawnZone(zone.shape, used.length + i, capacity, seed);
      if (!point || !pointInsideMap(point, battleMap)) continue;
      const source = {
        id: `${zone.id}_${i + 1}`,
        x: point.x,
        y: point.y,
        order: used.length + 1,
        facing: zone.facing ?? (side === "player" ? "left" : "right"),
        radius: side === "player" ? 138 : role === "boss" ? 256 : 152,
        role: side === "enemy" ? role : undefined
      };
      const resolved = side === "player" ? playerSlotFromPoint(battleMap, source, "zone") : enemySlotFromPoint(battleMap, source, undefined, "zone");
      if (fitsAndDoesNotOverlap(resolved, used)) used.push(resolved);
    }
  }
  if (used.length < desiredCount && zones.length) warn(`${battleMap.id} spawn zones could not satisfy all ${side} placements without overlap.`);
}

export function samplePointInSpawnZone(shape: BattleSpawnShape, index = 0, capacity = 1, seed?: string | number): { x: number; y: number } | undefined {
  const jitter = seededJitter(seed, index);
  if (shape.type === "rect") {
    const columns = Math.ceil(Math.sqrt(capacity));
    const rows = Math.ceil(capacity / columns);
    const col = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: shape.x + ((col + 0.5 + jitter.x * 0.24) / columns) * shape.width,
      y: shape.y + ((row + 0.5 + jitter.y * 0.24) / rows) * shape.height
    };
  }
  if (shape.type === "circle") {
    const angle = (index / Math.max(1, capacity)) * Math.PI * 2 + jitter.x * 0.4;
    const radius = shape.radius * (capacity <= 1 ? 0 : 0.58 + jitter.y * 0.12);
    return { x: shape.x + Math.cos(angle) * radius, y: shape.y + Math.sin(angle) * radius };
  }
  return polygonCentroid(shape.points);
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
  const role = slot.role ?? (enemy ? enemyRole(enemy) : "default");
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
    { id: "enemy_fallback_2", x: 236, y: 156, size: 106, facing: "right", radius: 53, role: "default", source: "fallback", metadataX: 236, metadataY: 156 },
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

function pointInsideMap(point: { x: number; y: number }, battleMap: BattleMapSpawnMetadata) {
  return point.x >= 0 && point.x <= battleMap.dimensions.width && point.y >= 0 && point.y <= battleMap.dimensions.height;
}

function enemyRole(enemy: EnemyState): BattleEnemySpawnRole {
  if (enemy.boss) return "boss";
  if (enemy.sprite === "wing") return "flying";
  if (enemy.sprite === "serpent" || enemy.sprite === "crown") return "large";
  return "default";
}

function roleMatches(slotRole: BattleEnemySpawnRole | undefined, desired: BattleEnemySpawnRole) {
  if (!slotRole || slotRole === "default") return desired === "default" || desired === "front" || desired === "back";
  if (slotRole === desired) return true;
  if (desired === "default") return slotRole === "front";
  if (desired === "large") return slotRole === "boss";
  return false;
}

function byOrderThenId(a: { order?: number; id: string }, b: { order?: number; id: string }) {
  return (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id);
}

function polygonCentroid(points: { x: number; y: number }[] | undefined) {
  if (!points?.length) return undefined;
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function seededJitter(seed: string | number | undefined, index: number) {
  const text = `${seed ?? "battle-spawn"}:${index}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  const a = ((hash >>> 8) & 255) / 255 - 0.5;
  const b = ((hash >>> 16) & 255) / 255 - 0.5;
  return { x: a, y: b };
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
