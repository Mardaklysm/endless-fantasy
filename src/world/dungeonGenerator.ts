import { createSeededRng, type SeededRng } from "./seededRng.ts";

export interface DungeonGenerationOptions {
  seed: string;
  dungeonId: string;
  tier: number;
  final?: boolean;
  width?: number;
  height?: number;
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DungeonConnectivityValidation {
  ok: boolean;
  errors: string[];
}

export function generateDungeonFloors(options: DungeonGenerationOptions): string[][] {
  const width = options.width ?? 22;
  const height = options.height ?? 14;
  const rng = createSeededRng(`${options.seed}:dungeon:${options.dungeonId}:tier:${options.tier}`);
  const floor0 = generateDungeonFloor(width, height, rng.fork("floor0"), 0, options.final ?? false);
  const floor1 = generateDungeonFloor(width, height, rng.fork("floor1"), 1, options.final ?? false);
  return [floorToStrings(floor0.map), floorToStrings(floor1.map)];
}

function generateDungeonFloor(width: number, height: number, rng: SeededRng, floorIndex: number, final: boolean) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const map = blankDungeon(width, height);
    const rooms = placeRooms(width, height, rng.fork(`rooms-${attempt}`));
    if (rooms.length < 6) continue;
    connectRooms(map, rooms);
    for (const room of rooms) carveRect(map, room.x, room.y, room.w, room.h);

    const entrance = nearestRoom(rooms, { x: 1, y: floorIndex === 0 ? 1 : height - 2 });
    const bossRoom = farthestRoom(rooms, centerOf(entrance));
    const treasureRoom = distantSideRoom(rooms, entrance, bossRoom);
    const switchRoom = rooms.find((room) => room !== entrance && room !== bossRoom && room !== treasureRoom) ?? treasureRoom;
    const extraTreasureRoom = rooms.find((room) => room !== entrance && room !== bossRoom && room !== treasureRoom && room !== switchRoom);

    if (floorIndex === 0) {
      placeMarkerTile(map, entrance.x + 1, entrance.y + 1, "E");
      placeMarkerTile(map, bossRoom.x + Math.floor(bossRoom.w / 2), bossRoom.y + Math.floor(bossRoom.h / 2), "S");
      placeMarkerTile(map, treasureRoom.x + Math.floor(treasureRoom.w / 2), treasureRoom.y + Math.floor(treasureRoom.h / 2), "C");
      placeMarkerTile(map, switchRoom.x + Math.floor(switchRoom.w / 2), switchRoom.y + Math.floor(switchRoom.h / 2), "K");
      if (extraTreasureRoom) placeMarkerTile(map, extraTreasureRoom.x + 1, extraTreasureRoom.y + 1, "C");
    } else {
      placeMarkerTile(map, entrance.x + 1, entrance.y + entrance.h - 2, "S");
      placeMarkerTile(map, bossRoom.x + Math.floor(bossRoom.w / 2), bossRoom.y + Math.floor(bossRoom.h / 2), "B");
      placeMarkerTile(map, treasureRoom.x + Math.floor(treasureRoom.w / 2), treasureRoom.y + Math.floor(treasureRoom.h / 2), "C");
      placeMarkerTile(map, switchRoom.x + Math.floor(switchRoom.w / 2), switchRoom.y + Math.floor(switchRoom.h / 2), "K");
      const gate = gateNearBoss(map, bossRoom, entrance);
      setTile(map, gate.x, gate.y, "D");
      if (extraTreasureRoom || final) {
        const bonus = extraTreasureRoom ?? switchRoom;
        placeMarkerTile(map, bonus.x + bonus.w - 2, bonus.y + 1, "C");
      }
    }

    repairDungeonConnectivity(map);
    if (validateDungeonMap(map)) return { map, rooms };
  }

  const fallback = fallbackDungeon(width, height, floorIndex, final);
  repairDungeonConnectivity(fallback.map);
  return fallback;
}

export function validateDungeonFloorsConnectivity(floors: string[][]): DungeonConnectivityValidation {
  const errors: string[] = [];
  for (let floorIndex = 0; floorIndex < floors.length; floorIndex += 1) {
    const result = validateDungeonFloorConnectivity(floors[floorIndex], floorIndex);
    errors.push(...result.errors.map((error) => `F${floorIndex + 1}: ${error}`));
  }
  return { ok: errors.length === 0, errors };
}

export function validateDungeonFloorConnectivity(floor: string[], floorIndex = 0): DungeonConnectivityValidation {
  return validateDungeonMapRows(floor, floorIndex);
}

function placeRooms(width: number, height: number, rng: SeededRng): Room[] {
  const rooms: Room[] = [];
  const target = rng.int(7, 9);
  for (let attempt = 0; attempt < 80 && rooms.length < target; attempt += 1) {
    const w = rng.int(4, 7);
    const h = rng.int(3, 5);
    const room = {
      x: rng.int(1, Math.max(1, width - w - 2)),
      y: rng.int(1, Math.max(1, height - h - 2)),
      w,
      h
    };
    if (rooms.some((other) => roomsOverlap(room, other, 1))) continue;
    rooms.push(room);
  }
  return rooms.sort((a, b) => centerOf(a).x - centerOf(b).x || centerOf(a).y - centerOf(b).y);
}

function connectRooms(map: string[][], rooms: Room[]) {
  for (let i = 1; i < rooms.length; i += 1) {
    const from = centerOf(rooms[i - 1]);
    const to = centerOf(rooms[i]);
    if (i % 2 === 0) {
      carveLine(map, from.x, from.y, to.x, from.y);
      carveLine(map, to.x, from.y, to.x, to.y);
    } else {
      carveLine(map, from.x, from.y, from.x, to.y);
      carveLine(map, from.x, to.y, to.x, to.y);
    }
  }
}

function fallbackDungeon(width: number, height: number, floorIndex: number, final: boolean) {
  const map = blankDungeon(width, height);
  carveRect(map, 1, 1, 8, 5);
  carveRect(map, 11, 1, 9, 5);
  carveRect(map, 4, 8, 16, 5);
  carveLine(map, 8, 3, 11, 3);
  carveLine(map, 6, 5, 6, 10);
  if (floorIndex === 0) {
    placeMarkerTile(map, 1, 1, "E");
    placeMarkerTile(map, 16, 2, "C");
    placeMarkerTile(map, 5, 10, "K");
    placeMarkerTile(map, 19, 12, "S");
  } else {
    placeMarkerTile(map, 2, 12, "S");
    placeMarkerTile(map, 7, 9, "C");
    setTile(map, 12, 7, "D");
    placeMarkerTile(map, 18, 2, "C");
    placeMarkerTile(map, 19, 3, "B");
    if (final) placeMarkerTile(map, 10, 3, "K");
  }
  return { map, rooms: [] };
}

function gateNearBoss(map: string[][], bossRoom: Room, entrance: Room) {
  const boss = centerOf(bossRoom);
  const start = centerOf(entrance);
  const dx = Math.sign(start.x - boss.x);
  const dy = Math.sign(start.y - boss.y);
  const candidates = [
    { x: boss.x + dx, y: boss.y },
    { x: boss.x, y: boss.y + dy },
    { x: boss.x - dx, y: boss.y },
    { x: boss.x, y: boss.y - dy }
  ];
  return candidates.find((pos) => map[pos.y]?.[pos.x] === ".") ?? nearestPlainFloorTile(map, boss) ?? { x: boss.x, y: boss.y + 1 };
}

function repairDungeonConnectivity(map: string[][]) {
  ensureSealedDoorsHaveSwitch(map);
  const start = dungeonStartTile(map);
  if (!start) return;
  connectTargets(map, start, findTiles(map, ["K"]), true);
  connectTargets(map, start, findTiles(map, ["E", "S", "C", "K", "B"]), false);
}

function ensureSealedDoorsHaveSwitch(map: string[][]) {
  if (findTiles(map, ["D"]).length === 0 || findTiles(map, ["K"]).length > 0) return;
  const start = dungeonStartTile(map);
  const anchor = start ? { x: start.x + 2, y: start.y } : { x: 1, y: 1 };
  placeMarkerTile(map, anchor.x, anchor.y, "K");
}

function validateDungeonMap(map: string[][]): boolean {
  return validateDungeonMapRows(floorToStrings(map)).ok;
}

function validateDungeonMapRows(rows: string[], floorIndex = 0): DungeonConnectivityValidation {
  const map = rows.map((row) => [...row]);
  const errors: string[] = [];
  const important = findTiles(map, ["E", "S", "C", "K", "B"]);
  const start = dungeonStartTile(map);
  const requiredMarkers =
    floorIndex === 0
      ? [
          { values: ["E"], label: "entrance" },
          { values: ["S"], label: "stairs" },
          { values: ["C"], label: "chest" }
        ]
      : [
          { values: ["S"], label: "stairs" },
          { values: ["B"], label: "boss" },
          { values: ["C"], label: "chest" }
        ];
  for (const marker of requiredMarkers) {
    if (findTiles(map, marker.values).length === 0) errors.push(`Missing required ${marker.label} tile.`);
  }
  if (!start) errors.push(`Missing ${floorIndex === 0 ? "entrance" : "stair"} start tile.`);
  if (important.length < 4) errors.push(`Expected at least 4 important dungeon tiles, got ${important.length}.`);
  if (!start) return { ok: false, errors };

  const switches = findTiles(map, ["K"]);
  if (findTiles(map, ["D"]).length > 0 && switches.length === 0) errors.push("Sealed door exists without a reachable switch.");

  const closedReachable = flood(map, start, true);
  for (const tile of switches) {
    if (!closedReachable.has(posKey(tile))) errors.push(`Switch at ${tile.x},${tile.y} is not reachable before sealed doors open.`);
  }

  const openReachable = flood(map, start, false);
  for (const tile of important) {
    if (!openReachable.has(posKey(tile))) errors.push(`Important tile ${tile.value} at ${tile.x},${tile.y} is not reachable after puzzle doors open.`);
  }
  return { ok: errors.length === 0, errors };
}

function findTiles(map: string[][], values: string[]) {
  const result: { x: number; y: number; value: string }[] = [];
  for (let y = 0; y < map.length; y += 1) {
    for (let x = 0; x < map[y].length; x += 1) {
      if (values.includes(map[y][x])) result.push({ x, y, value: map[y][x] });
    }
  }
  return result;
}

function dungeonStartTile(map: string[][]) {
  return findTiles(map, ["E"])[0] ?? findTiles(map, ["S"])[0];
}

function connectTargets(map: string[][], start: { x: number; y: number }, targets: { x: number; y: number }[], closedDoorsBlock: boolean) {
  for (const target of targets) {
    const reachable = flood(map, start, closedDoorsBlock);
    if (reachable.has(posKey(target))) continue;
    const path = carvePathToTarget(map, start, target, closedDoorsBlock);
    for (const point of path) {
      if (map[point.y]?.[point.x] === "#") map[point.y][point.x] = ".";
    }
  }
}

function carvePathToTarget(map: string[][], start: { x: number; y: number }, target: { x: number; y: number }, closedDoorsBlock: boolean) {
  const height = map.length;
  const width = map[0]?.length ?? 0;
  const startKey = posKey(start);
  const targetKey = posKey(target);
  const costs = new Map<string, number>([[startKey, 0]]);
  const cameFrom = new Map<string, string>();
  const open = [start];
  while (open.length) {
    open.sort((a, b) => (costs.get(posKey(a)) ?? Infinity) - (costs.get(posKey(b)) ?? Infinity) || distance(a, target) - distance(b, target));
    const current = open.shift()!;
    const currentKey = posKey(current);
    if (currentKey === targetKey) break;
    for (const next of cardinalNeighbors(current)) {
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
      const tile = map[next.y]?.[next.x] ?? "#";
      const stepCost = dungeonCarveCost(tile, closedDoorsBlock);
      if (!Number.isFinite(stepCost)) continue;
      const nextKey = posKey(next);
      const nextCost = (costs.get(currentKey) ?? Infinity) + stepCost;
      if (nextCost >= (costs.get(nextKey) ?? Infinity)) continue;
      costs.set(nextKey, nextCost);
      cameFrom.set(nextKey, currentKey);
      if (!open.some((point) => point.x === next.x && point.y === next.y)) open.push(next);
    }
  }
  if (!costs.has(targetKey)) return [];
  const path = [target];
  let cursor = targetKey;
  while (cursor !== startKey) {
    const previous = cameFrom.get(cursor);
    if (!previous) return [];
    const [x, y] = previous.split(",").map(Number);
    path.push({ x, y });
    cursor = previous;
  }
  path.reverse();
  return path;
}

function dungeonCarveCost(tile: string, closedDoorsBlock: boolean): number {
  if (tile === "D" && closedDoorsBlock) return Infinity;
  return tile === "#" ? 8 : 1;
}

function flood(map: string[][], start: { x: number; y: number }, closedDoorsBlock = false) {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    const key = posKey(current);
    if (seen.has(key)) continue;
    const tile = map[current.y]?.[current.x] ?? "#";
    if (tile === "#" || (closedDoorsBlock && tile === "D")) continue;
    seen.add(key);
    queue.push(...cardinalNeighbors(current));
  }
  return seen;
}

function cardinalNeighbors(point: { x: number; y: number }) {
  return [
    { x: point.x + 1, y: point.y },
    { x: point.x - 1, y: point.y },
    { x: point.x, y: point.y + 1 },
    { x: point.x, y: point.y - 1 }
  ];
}

function posKey(point: { x: number; y: number }) {
  return `${point.x},${point.y}`;
}

function nearestRoom(rooms: Room[], point: { x: number; y: number }) {
  return [...rooms].sort((a, b) => distance(centerOf(a), point) - distance(centerOf(b), point))[0];
}

function farthestRoom(rooms: Room[], point: { x: number; y: number }) {
  return [...rooms].sort((a, b) => distance(centerOf(b), point) - distance(centerOf(a), point))[0];
}

function distantSideRoom(rooms: Room[], entrance: Room, bossRoom: Room) {
  const entranceCenter = centerOf(entrance);
  const bossCenter = centerOf(bossRoom);
  return (
    [...rooms]
      .filter((room) => room !== entrance && room !== bossRoom)
      .sort((a, b) => {
        const scoreA = distance(centerOf(a), entranceCenter) - distance(centerOf(a), bossCenter) * 0.25;
        const scoreB = distance(centerOf(b), entranceCenter) - distance(centerOf(b), bossCenter) * 0.25;
        return scoreB - scoreA;
      })[0] ?? bossRoom
  );
}

function roomsOverlap(a: Room, b: Room, padding: number): boolean {
  return a.x - padding < b.x + b.w && a.x + a.w + padding > b.x && a.y - padding < b.y + b.h && a.y + a.h + padding > b.y;
}

function centerOf(room: Room) {
  return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function blankDungeon(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => "#"));
}

function carveRect(map: string[][], x: number, y: number, w: number, h: number) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) setTile(map, xx, yy, ".");
  }
}

function carveLine(map: string[][], x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.sign(x2 - x1);
  const dy = Math.sign(y2 - y1);
  let x = x1;
  let y = y1;
  setTile(map, x, y, ".");
  while (x !== x2 || y !== y2) {
    if (x !== x2) x += dx;
    if (y !== y2) y += dy;
    setTile(map, x, y, ".");
  }
}

function setTile(map: string[][], x: number, y: number, value: string) {
  if (map[y]?.[x] !== undefined) map[y][x] = value;
}

function placeMarkerTile(map: string[][], x: number, y: number, value: string) {
  const current = map[y]?.[x];
  if (current === "." || current === "#") {
    setTile(map, x, y, value);
    return;
  }
  const fallback = nearestPlainFloorTile(map, { x, y });
  if (fallback) setTile(map, fallback.x, fallback.y, value);
}

function nearestPlainFloorTile(map: string[][], target: { x: number; y: number }) {
  const height = map.length;
  const width = map[0]?.length ?? 0;
  const queue = [target];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = posKey(current);
    if (seen.has(key)) continue;
    seen.add(key);
    if (current.x < 0 || current.y < 0 || current.x >= width || current.y >= height) continue;
    if (map[current.y]?.[current.x] === ".") return current;
    queue.push(...cardinalNeighbors(current));
  }
  return undefined;
}

function floorToStrings(map: string[][]): string[] {
  return map.map((row) => row.join(""));
}
