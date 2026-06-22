import type { DungeonDef } from "../../data/gameDataTypes";
import { GEAR } from "../../data/gear";
import { ITEMS } from "../../data/items";
import type { Vec } from "../../scene/sceneTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function dungeonFloorRows(this: CrystalOathSceneContext, dungeonId = this.currentDungeon, floorIndex = this.dungeonFloor): string[] {
  const dungeon = this.dungeons()[dungeonId];
  if (!dungeon) return [];
  const clampedFloor = Math.max(0, Math.min(floorIndex, dungeon.floors.length - 1));
  return dungeon.floors[clampedFloor] ?? [];
}

export function isDungeonTileWalkable(this: CrystalOathSceneContext, dungeonId: string, tile?: string): boolean {
  return !!tile && tile !== "#" && !(tile === "D" && !this.puzzleFlags.has(`${dungeonId}-switch`));
}

export function findDungeonTilePosition(this: CrystalOathSceneContext, floor: string[], values: string[]): Vec | undefined {
  for (let y = 0; y < floor.length; y += 1) {
    for (let x = 0; x < floor[y].length; x += 1) {
      if (values.includes(floor[y][x])) return { x, y };
    }
  }
  return undefined;
}

export function nearestDungeonWalkableTile(this: CrystalOathSceneContext, dungeonId: string, floor: string[], target: Vec): Vec {
  const width = floor[0]?.length ?? 0;
  const height = floor.length;
  const queue = [target];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (current.x >= 0 && current.y >= 0 && current.x < width && current.y < height) {
      const tile = floor[current.y]?.[current.x];
      if (this.isDungeonTileWalkable(dungeonId, tile)) return current;
      queue.push({ x: current.x + 1, y: current.y });
      queue.push({ x: current.x - 1, y: current.y });
      queue.push({ x: current.x, y: current.y + 1 });
      queue.push({ x: current.x, y: current.y - 1 });
    }
  }
  return { x: 1, y: 1 };
}

export function dungeonMarkerSpawn(this: CrystalOathSceneContext, dungeonId: string, floorIndex: number, markerTiles: string[], fallback: Vec): Vec {
  const floor = this.dungeonFloorRows(dungeonId, floorIndex);
  const marker = this.findDungeonTilePosition(floor, markerTiles) ?? fallback;
  return this.nearestDungeonWalkableTile(dungeonId, floor, marker);
}

export function dungeonEntranceSpawn(this: CrystalOathSceneContext, dungeonId: string): Vec {
  return this.dungeonMarkerSpawn(dungeonId, 0, ["E"], { x: 1, y: 1 });
}

export function dungeonStairSpawn(this: CrystalOathSceneContext, dungeonId: string, floorIndex: number): Vec {
  return this.dungeonMarkerSpawn(dungeonId, floorIndex, ["S"], floorIndex === 0 ? { x: 19, y: 12 } : { x: 2, y: 12 });
}

export function ensureValidDungeonPosition(this: CrystalOathSceneContext) {
  const dungeon = this.dungeons()[this.currentDungeon];
  if (!dungeon) {
    this.currentDungeon = "mossCave";
    this.dungeonFloor = 0;
    this.dungeonPos = this.dungeonEntranceSpawn(this.currentDungeon);
    return;
  }
  this.dungeonFloor = Math.max(0, Math.min(this.dungeonFloor, dungeon.floors.length - 1));
  if (!this.canOccupyExploreTile("dungeon", this.dungeonPos.x, this.dungeonPos.y)) {
    this.dungeonPos = this.dungeonFloor === 0 ? this.dungeonEntranceSpawn(this.currentDungeon) : this.dungeonStairSpawn(this.currentDungeon, this.dungeonFloor);
  }
}

export function interactDungeon(this: CrystalOathSceneContext) {
  const dungeon = this.dungeons()[this.currentDungeon];
  const tile = dungeon.floors[this.dungeonFloor][this.dungeonPos.y]?.[this.dungeonPos.x];
  if (tile === "K") {
    this.puzzleFlags.add(`${this.currentDungeon}-switch`);
    this.say([dungeon.puzzleText]);
    return;
  }
  if (tile === "C") {
    this.openDungeonChest(dungeon);
    return;
  }
  if (tile === "D" && !this.puzzleFlags.has(`${this.currentDungeon}-switch`)) {
    this.say(["The sealed door will not move. A switch must feed it power."]);
    return;
  }
  this.say([`${dungeon.name}: The air is heavy with old danger.`]);
}

export function openDungeonChest(this: CrystalOathSceneContext, dungeon: DungeonDef) {
  const chestIndex = this.countDungeonChestAtCurrentOrNearest(dungeon);
  const reward = dungeon.chestRewards[chestIndex % dungeon.chestRewards.length];
  const chestId = `${dungeon.id}-${this.dungeonFloor}-${this.dungeonPos.x}-${this.dungeonPos.y}-${reward.id}`;
  if (this.openedChests.has(chestId)) {
    this.say(["The chest is empty."]);
    return;
  }
  this.openedChests.add(chestId);
  if (reward.item) {
    this.inventory[reward.item] = (this.inventory[reward.item] ?? 0) + 1;
    this.say([`Found ${ITEMS[reward.item].name}!`]);
  } else if (reward.gear) {
    this.gearBag[reward.gear] = (this.gearBag[reward.gear] ?? 0) + 1;
    this.say([`Found ${GEAR[reward.gear].name}!`]);
  } else if (reward.gold) {
    this.gold += reward.gold;
    this.say([`Found ${reward.gold} gold!`]);
  }
}

export function countDungeonChestAtCurrentOrNearest(this: CrystalOathSceneContext, dungeon: DungeonDef): number {
  let count = 0;
  for (let f = 0; f <= this.dungeonFloor; f += 1) {
    const floor = dungeon.floors[f];
    for (let y = 0; y < floor.length; y += 1) {
      for (let x = 0; x < floor[y].length; x += 1) {
        if (floor[y][x] === "C") {
          if (f === this.dungeonFloor && x === this.dungeonPos.x && y === this.dungeonPos.y) return count;
          count += 1;
        }
      }
    }
  }
  return count;
}
