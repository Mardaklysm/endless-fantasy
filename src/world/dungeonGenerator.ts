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
      setTile(map, entrance.x + 1, entrance.y + 1, "E");
      setTile(map, bossRoom.x + Math.floor(bossRoom.w / 2), bossRoom.y + Math.floor(bossRoom.h / 2), "S");
      setTile(map, treasureRoom.x + Math.floor(treasureRoom.w / 2), treasureRoom.y + Math.floor(treasureRoom.h / 2), "C");
      setTile(map, switchRoom.x + Math.floor(switchRoom.w / 2), switchRoom.y + Math.floor(switchRoom.h / 2), "K");
      if (extraTreasureRoom) setTile(map, extraTreasureRoom.x + 1, extraTreasureRoom.y + 1, "C");
    } else {
      setTile(map, entrance.x + 1, entrance.y + entrance.h - 2, "S");
      setTile(map, bossRoom.x + Math.floor(bossRoom.w / 2), bossRoom.y + Math.floor(bossRoom.h / 2), "B");
      setTile(map, treasureRoom.x + Math.floor(treasureRoom.w / 2), treasureRoom.y + Math.floor(treasureRoom.h / 2), "C");
      setTile(map, switchRoom.x + Math.floor(switchRoom.w / 2), switchRoom.y + Math.floor(switchRoom.h / 2), "K");
      const gate = gateNearBoss(map, bossRoom, entrance);
      setTile(map, gate.x, gate.y, "D");
      if (extraTreasureRoom || final) {
        const bonus = extraTreasureRoom ?? switchRoom;
        setTile(map, bonus.x + bonus.w - 2, bonus.y + 1, "C");
      }
    }

    if (validateDungeonMap(map)) return { map, rooms };
  }

  return fallbackDungeon(width, height, floorIndex, final);
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
    setTile(map, 1, 1, "E");
    setTile(map, 16, 2, "C");
    setTile(map, 5, 10, "K");
    setTile(map, 19, 12, "S");
  } else {
    setTile(map, 2, 12, "S");
    setTile(map, 7, 9, "C");
    setTile(map, 12, 7, "D");
    setTile(map, 18, 2, "C");
    setTile(map, 19, 3, "B");
    if (final) setTile(map, 10, 3, "K");
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
  return candidates.find((pos) => map[pos.y]?.[pos.x] === ".") ?? { x: boss.x, y: boss.y + 1 };
}

function validateDungeonMap(map: string[][]): boolean {
  const important = findTiles(map, ["E", "S", "C", "K", "B"]);
  if (important.length < 4) return false;
  const start = important.find((tile) => tile.value === "E") ?? important.find((tile) => tile.value === "S");
  if (!start) return false;
  const reachable = flood(map, start);
  return important.every((tile) => reachable.has(`${tile.x},${tile.y}`));
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

function flood(map: string[][], start: { x: number; y: number }) {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    if (seen.has(key)) continue;
    const tile = map[current.y]?.[current.x] ?? "#";
    if (tile === "#") continue;
    seen.add(key);
    queue.push({ x: current.x + 1, y: current.y });
    queue.push({ x: current.x - 1, y: current.y });
    queue.push({ x: current.x, y: current.y + 1 });
    queue.push({ x: current.x, y: current.y - 1 });
  }
  return seen;
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

function floorToStrings(map: string[][]): string[] {
  return map.map((row) => row.join(""));
}
