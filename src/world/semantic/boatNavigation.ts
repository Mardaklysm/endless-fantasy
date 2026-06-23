import { SEMANTIC_WATER, type MajorIslandId, type SemanticPoi, type SemanticVec } from "./semanticTypes.ts";

export const REQUIRED_MAJOR_HARBOR_ROUTE_PAIRS: readonly (readonly [MajorIslandId, MajorIslandId])[] = [
  ["greenhaven", "coralreach"],
  ["greenhaven", "frostmere"],
  ["greenhaven", "highspire"],
  ["greenhaven", "ashfall"],
  ["coralreach", "frostmere"],
  ["coralreach", "highspire"],
  ["coralreach", "ashfall"],
  ["frostmere", "highspire"],
  ["frostmere", "ashfall"],
  ["highspire", "ashfall"]
];

export const BOAT_NAV_DIRECTIONS: readonly SemanticVec[] = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 }
];

export interface BoatNavigationWorld {
  width: number;
  height: number;
  layers: {
    landMask: Uint8Array;
    waterClass: Uint8Array;
    distanceToLand?: Int16Array;
    lakeMap?: Uint8Array;
    riverMap?: Uint8Array;
  };
}

export interface BoatHarborPoint extends SemanticVec {
  footprint?: number;
  id?: string;
}

interface SearchNode extends SemanticVec {
  dir: number;
  key: number;
  g: number;
  f: number;
  parent?: number;
}

export function isBoatNavigableTile(world: BoatNavigationWorld, x: number, y: number): boolean {
  if (!inBounds(world, x, y)) return false;
  const i = index(world.width, x, y);
  if (world.layers.landMask[i] !== 0) return false;
  if (world.layers.lakeMap?.[i] || world.layers.riverMap?.[i]) return false;
  const water = world.layers.waterClass[i];
  return water === SEMANTIC_WATER.DEEP || water === SEMANTIC_WATER.SHALLOW;
}

export function isBoatStepAllowed(world: BoatNavigationWorld, from: SemanticVec, to: SemanticVec): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return false;
  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;
  if (!isBoatNavigableTile(world, to.x, to.y)) return false;
  if (dx !== 0 && dy !== 0) {
    if (!isBoatNavigableTile(world, from.x + dx, from.y)) return false;
    if (!isBoatNavigableTile(world, from.x, from.y + dy)) return false;
  }
  return true;
}

export function findBoatWaterPath(world: BoatNavigationWorld, start: SemanticVec, end: SemanticVec, preferOpenWater = true): SemanticVec[] | undefined {
  if (!isBoatNavigableTile(world, start.x, start.y) || !isBoatNavigableTile(world, end.x, end.y)) return undefined;
  const startKey = boatNodeKey(world.width, start.x, start.y, -1);
  const open = new BoatPriorityQueue();
  const nodes = new Map<number, SearchNode>();
  const bestCosts = new Map<number, number>();
  const first: SearchNode = {
    x: start.x,
    y: start.y,
    dir: -1,
    key: startKey,
    g: 0,
    f: heuristicDistance(start, end)
  };
  open.push(first);
  nodes.set(startKey, first);
  bestCosts.set(startKey, 0);

  while (open.length > 0) {
    const current = open.pop()!;
    if (current.x === end.x && current.y === end.y) return reconstructPath(nodes, current.key);
    const knownBest = bestCosts.get(current.key);
    if (knownBest !== undefined && current.g > knownBest + 0.001) continue;
    for (let dir = 0; dir < BOAT_NAV_DIRECTIONS.length; dir += 1) {
      const step = BOAT_NAV_DIRECTIONS[dir];
      const next = { x: current.x + step.x, y: current.y + step.y };
      if (!isBoatStepAllowed(world, current, next)) continue;
      const moveCost = step.x !== 0 && step.y !== 0 ? Math.SQRT2 : 1;
      const distanceToLand = world.layers.distanceToLand?.[index(world.width, next.x, next.y)] ?? 0;
      const coastCost = preferOpenWater ? boatCoastPenalty(distanceToLand) : 0;
      const shallowCost = world.layers.waterClass[index(world.width, next.x, next.y)] === SEMANTIC_WATER.SHALLOW ? 0.22 : 0;
      const turnCost = current.dir >= 0 ? boatTurnPenalty(BOAT_NAV_DIRECTIONS[current.dir], step) : 0;
      const nextG = current.g + moveCost + coastCost + shallowCost + turnCost;
      const nextKey = boatNodeKey(world.width, next.x, next.y, dir);
      const best = bestCosts.get(nextKey);
      if (best !== undefined && nextG >= best) continue;
      const node: SearchNode = {
        ...next,
        dir,
        key: nextKey,
        g: nextG,
        f: nextG + heuristicDistance(next, end) * 0.98,
        parent: current.key
      };
      nodes.set(nextKey, node);
      bestCosts.set(nextKey, nextG);
      open.push(node);
    }
  }
  return undefined;
}

export function findHarborWaterTile(world: BoatNavigationWorld, harbor: BoatHarborPoint, toward?: SemanticVec, maxRadius = 12): SemanticVec | undefined {
  const bounds = footprintBounds(harbor);
  const target = toward ?? harbor;
  let best: { pos: SemanticVec; score: number } | undefined;
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let y = bounds.minY - radius; y <= bounds.maxY + radius; y += 1) {
      for (let x = bounds.minX - radius; x <= bounds.maxX + radius; x += 1) {
        const outside = x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY;
        if (!outside) continue;
        if (distanceToBounds(x, y, bounds) !== radius) continue;
        if (!isBoatNavigableTile(world, x, y)) continue;
        const distanceToLand = world.layers.distanceToLand?.[index(world.width, x, y)] ?? 0;
        const coastBias = Math.max(0, 3 - distanceToLand) * 0.18;
        const targetBias = Math.hypot(x - target.x, y - target.y) * 0.01;
        const score = radius + coastBias + targetBias;
        if (!best || score < best.score) best = { pos: { x, y }, score };
      }
    }
    if (best) return best.pos;
  }
  return undefined;
}

export function simplifyBoatPathToCompassWaypoints(path: readonly SemanticVec[]): SemanticVec[] {
  if (path.length <= 2) return path.map((point) => ({ ...point }));
  const waypoints: SemanticVec[] = [{ ...path[0] }];
  let previousDir = normalizedGridDirection(path[0], path[1]);
  for (let i = 1; i < path.length - 1; i += 1) {
    const dir = normalizedGridDirection(path[i], path[i + 1]);
    if (dir.x !== previousDir.x || dir.y !== previousDir.y) {
      waypoints.push({ ...path[i] });
      previousDir = dir;
    }
  }
  waypoints.push({ ...path[path.length - 1] });
  return waypoints;
}

export function isLegalBoatCompassSegment(from: SemanticVec, to: SemanticVec): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  if (dx === 0 && dy === 0) return false;
  return dx === 0 || dy === 0 || dx === dy;
}

export function validateBoatPath(world: BoatNavigationWorld, path: readonly SemanticVec[]): string[] {
  const errors: string[] = [];
  if (path.length < 2) return ["Boat path has fewer than 2 points."];
  for (let i = 0; i < path.length; i += 1) {
    const point = path[i];
    if (!isBoatNavigableTile(world, point.x, point.y)) errors.push(`Boat path touches non-navigable tile at ${point.x},${point.y}.`);
    if (i === 0) continue;
    const previous = path[i - 1];
    if (!isLegalBoatCompassSegment(previous, point)) errors.push(`Boat path segment ${previous.x},${previous.y} -> ${point.x},${point.y} is not 8-directional.`);
    const step = normalizedGridDirection(previous, point);
    const steps = Math.max(Math.abs(point.x - previous.x), Math.abs(point.y - previous.y));
    for (let s = 1; s <= steps; s += 1) {
      const from = { x: previous.x + step.x * (s - 1), y: previous.y + step.y * (s - 1) };
      const to = { x: previous.x + step.x * s, y: previous.y + step.y * s };
      if (!isBoatStepAllowed(world, from, to)) errors.push(`Boat path step ${from.x},${from.y} -> ${to.x},${to.y} cuts blocked water.`);
    }
  }
  return errors;
}

export function harborPointFromPoi(poi: SemanticPoi): BoatHarborPoint {
  return { x: poi.x, y: poi.y, id: poi.id, footprint: poi.role === "port" || poi.role === "settlement" || poi.role === "final" ? 3 : 2 };
}

function reconstructPath(nodes: Map<number, SearchNode>, endKey: number): SemanticVec[] {
  const path: SemanticVec[] = [];
  let key: number | undefined = endKey;
  while (key !== undefined) {
    const node = nodes.get(key);
    if (!node) break;
    path.push({ x: node.x, y: node.y });
    key = node.parent;
  }
  return path.reverse();
}

function boatNodeKey(width: number, x: number, y: number, dir: number): number {
  return ((y * width + x) * 9) + dir + 1;
}

function boatCoastPenalty(distanceToLand: number): number {
  if (distanceToLand <= 1) return 3.2;
  if (distanceToLand === 2) return 1.15;
  if (distanceToLand === 3) return 0.35;
  return 0;
}

function boatTurnPenalty(previous: SemanticVec, next: SemanticVec): number {
  const previousLength = Math.hypot(previous.x, previous.y);
  const nextLength = Math.hypot(next.x, next.y);
  if (previousLength <= 0 || nextLength <= 0) return 0;
  const cosine = (previous.x * next.x + previous.y * next.y) / (previousLength * nextLength);
  return (1 - cosine) * 1.05;
}

function heuristicDistance(a: SemanticVec, b: SemanticVec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalizedGridDirection(from: SemanticVec, to: SemanticVec): SemanticVec {
  return { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) };
}

function footprintBounds(point: BoatHarborPoint): { minX: number; maxX: number; minY: number; maxY: number } {
  const footprint = point.footprint ?? 1;
  const offset = Math.floor((footprint - 1) / 2);
  const minX = point.x - offset;
  const minY = point.y - offset;
  return { minX, minY, maxX: minX + footprint - 1, maxY: minY + footprint - 1 };
}

function distanceToBounds(x: number, y: number, bounds: { minX: number; maxX: number; minY: number; maxY: number }): number {
  const dx = x < bounds.minX ? bounds.minX - x : x > bounds.maxX ? x - bounds.maxX : 0;
  const dy = y < bounds.minY ? bounds.minY - y : y > bounds.maxY ? y - bounds.maxY : 0;
  return Math.max(dx, dy);
}

function inBounds(world: BoatNavigationWorld, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < world.width && y < world.height;
}

function index(width: number, x: number, y: number): number {
  return y * width + x;
}

class BoatPriorityQueue {
  private items: SearchNode[] = [];

  get length() {
    return this.items.length;
  }

  push(node: SearchNode) {
    this.items.push(node);
    this.bubbleUp(this.items.length - 1);
  }

  pop(): SearchNode | undefined {
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return first;
  }

  private bubbleUp(indexValue: number) {
    let index = indexValue;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].f <= this.items[index].f) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  private sinkDown(indexValue: number) {
    let index = indexValue;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.items.length && this.items[left].f < this.items[smallest].f) smallest = left;
      if (right < this.items.length && this.items[right].f < this.items[smallest].f) smallest = right;
      if (smallest === index) break;
      [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
      index = smallest;
    }
  }
}
