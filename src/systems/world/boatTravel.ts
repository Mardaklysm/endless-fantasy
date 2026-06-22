import { LAYER_CHARACTER_IMAGE, MOVE_TILES_PER_MS, TILE } from "../../app/config";
import type { LocationDef, TravelDestination } from "../../data/gameDataTypes";
import { worldTileHasTag } from "../../data/worldTiles";
import type { BoatTravelState, Vec } from "../../scene/sceneTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";
import { SEMANTIC_WATER } from "../../world/semantic/semanticTypes";

const BOAT_TILES_PER_MS = MOVE_TILES_PER_MS * 0.5;
const DEPARTURE_PAUSE_MS = 280;
const ARRIVAL_PAUSE_MS = 340;
const MAX_HARBOR_WATER_SEARCH_RADIUS = 10;
const ROUTE_SAMPLE_STEP_TILES = 0.18;
const BOAT_DISPLAY_W = 58;
const BOAT_DISPLAY_H = 38;

const WATER_DIRS = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 }
];

interface PlannedBoatRoute {
  arrivalTile: Vec;
  sourceWaterTile: Vec;
  destinationWaterTile: Vec;
  rawPath: Vec[];
  waypoints: Vec[];
  path: Vec[];
  pathDistances: number[];
  routeLength: number;
}

interface RouteWaypoint extends Vec {
  index: number;
}

interface SearchNode {
  x: number;
  y: number;
  dir: number;
  key: number;
  g: number;
  f: number;
  parent?: number;
}

export function beginBoatTravel(this: CrystalOathSceneContext, sourceHarbor: LocationDef, destination: TravelDestination): boolean {
  if (this.boatTravel || this.worldControlLockReason === "boatTravel") return false;
  if (this.gold < destination.costGold) {
    this.flashMessage(`You need ${destination.costGold} gold for passage.`);
    return false;
  }
  const destinationHarbor = this.locations().find((loc) => loc.kind === "harbor" && loc.islandId === destination.destinationIslandId);
  if (!destinationHarbor) {
    this.flashMessage("The Harbor Master cannot find a safe destination harbor.");
    return false;
  }
  const route = this.planBoatRoute(sourceHarbor, destinationHarbor, destination);
  if (!route) {
    this.flashMessage("The Harbor Master cannot chart a safe water route right now.");
    return false;
  }

  const previousBoatFlag = this.flags.boat;
  this.gold -= destination.costGold;
  this.flags.boat = true;
  this.menu = undefined;
  this.mode = "world";
  this.previousMode = "world";
  this.clearHeldMovement();
  this.worldControlLockReason = "boatTravel";
  this.boatTravel = {
    sourceIslandId: sourceHarbor.islandId ?? this.currentIslandId,
    destinationIslandId: destination.destinationIslandId,
    destinationName: destination.displayName,
    costGold: destination.costGold,
    previousBoatFlag,
    arrivalTile: route.arrivalTile,
    sourceWaterTile: route.sourceWaterTile,
    destinationWaterTile: route.destinationWaterTile,
    rawPath: route.rawPath,
    waypoints: route.waypoints,
    path: route.path,
    pathDistances: route.pathDistances,
    routeLength: route.routeLength,
    progressTiles: 0,
    segmentIndex: 0,
    boatPos: { ...route.path[0] },
    facing: route.destinationWaterTile.x >= route.sourceWaterTile.x ? "right" : "left",
    phase: "departing",
    phaseElapsedMs: 0
  };
  this.audio.setMode("world");
  if (import.meta.env.DEV) {
    console.info(
      `Boat charter ${sourceHarbor.name} -> ${destination.displayName}: raw ${route.rawPath.length} cells, ${route.waypoints.length} waypoints, ${route.path.length} samples, ${route.routeLength.toFixed(1)} tiles.`
    );
  }
  this.markDirty();
  return true;
}

export function updateBoatTravel(this: CrystalOathSceneContext, deltaMs: number) {
  const travel = this.boatTravel;
  if (!travel) return;
  try {
    travel.phaseElapsedMs += deltaMs;
    if (travel.phase === "departing") {
      if (travel.phaseElapsedMs >= DEPARTURE_PAUSE_MS) {
        travel.phase = "sailing";
        travel.phaseElapsedMs = 0;
      }
      this.markDirty();
      return;
    }
    if (travel.phase === "arriving") {
      if (travel.phaseElapsedMs >= ARRIVAL_PAUSE_MS) this.completeBoatTravel();
      else this.markDirty();
      return;
    }

    travel.progressTiles = Math.min(travel.routeLength, travel.progressTiles + BOAT_TILES_PER_MS * deltaMs);
    const previous = travel.boatPos;
    travel.boatPos = boatRoutePointAtDistance(travel, travel.progressTiles);
    const dx = travel.boatPos.x - previous.x;
    if (Math.abs(dx) > 0.01) travel.facing = dx > 0 ? "right" : "left";
    if (travel.progressTiles >= travel.routeLength) {
      travel.boatPos = { ...travel.destinationWaterTile };
      travel.phase = "arriving";
      travel.phaseElapsedMs = 0;
    }
    this.markDirty();
  } catch (error) {
    console.error("Boat travel interrupted; restoring player control.", error);
    this.abortBoatTravel(true);
  }
}

export function completeBoatTravel(this: CrystalOathSceneContext) {
  const travel = this.boatTravel;
  if (!travel) return;
  this.flags.boat = true;
  if (travel.destinationIslandId === "coralreach") this.flags.travel.visitedIsland2 = true;
  if (travel.destinationIslandId === "frostmere") this.flags.travel.visitedFrostmere = true;
  if (travel.destinationIslandId === "highspire") {
    this.flags.travel.visitedIsland3 = true;
    this.flags.travel.visitedHighspire = true;
  }
  this.currentIslandId = travel.destinationIslandId;
  this.worldPos = { ...travel.arrivalTile };
  this.lastMoveDir = directionToward(travel.arrivalTile, travel.destinationWaterTile);
  this.boatTravel = undefined;
  this.worldControlLockReason = undefined;
  this.mode = "world";
  this.previousMode = "world";
  this.menu = undefined;
  this.syncAllVisualPositions();
  this.audio.setMode("world");
  this.saveGame();
  this.markDirty();
}

export function abortBoatTravel(this: CrystalOathSceneContext, refund = false) {
  const travel = this.boatTravel;
  if (travel) {
    if (refund) {
      this.gold += travel.costGold;
      this.flags.boat = travel.previousBoatFlag;
    }
  }
  this.boatTravel = undefined;
  this.worldControlLockReason = undefined;
  this.menu = undefined;
  this.mode = "world";
  this.previousMode = "world";
  this.clearHeldMovement();
  this.syncAllVisualPositions();
  this.audio.setMode("world");
  this.markDirty();
}

export function planBoatRoute(this: CrystalOathSceneContext, sourceHarbor: LocationDef, destinationHarbor: LocationDef, destination: TravelDestination): PlannedBoatRoute | undefined {
  const sourceWaterTile = this.harborWaterTile(sourceHarbor, destinationHarbor);
  const destinationWaterTile = this.harborWaterTile(destinationHarbor, sourceHarbor);
  if (!sourceWaterTile || !destinationWaterTile) return undefined;
  const rawPath =
    this.findBoatWaterPath(sourceWaterTile, destinationWaterTile, true) ??
    this.findBoatWaterPath(sourceWaterTile, destinationWaterTile, false);
  if (!rawPath || rawPath.length < 2) return undefined;
  const waypoints = this.compactBoatWaypoints(rawPath);
  const path = this.smoothBoatRoute(rawPath, waypoints);
  const routePath = path.length >= 2 ? path : sampleRawBoatPath(rawPath, 0, rawPath.length - 1);
  const pathDistances = cumulativeDistances(routePath);
  const routeLength = pathDistances[pathDistances.length - 1] ?? 0;
  if (routeLength <= 0) return undefined;
  return {
    arrivalTile: this.arrivalTileForIsland(destination.destinationIslandId),
    sourceWaterTile,
    destinationWaterTile,
    rawPath,
    waypoints: waypoints.map(({ x, y }) => ({ x, y })),
    path: routePath,
    pathDistances,
    routeLength
  };
}

export function harborWaterTile(this: CrystalOathSceneContext, harbor: LocationDef, toward?: LocationDef): Vec | undefined {
  const bounds = this.locationFootprintBounds(harbor);
  const target = toward ? { x: toward.x, y: toward.y } : { x: harbor.x, y: harbor.y };
  let best: { pos: Vec; score: number } | undefined;
  for (let radius = 1; radius <= MAX_HARBOR_WATER_SEARCH_RADIUS; radius += 1) {
    for (let y = bounds.minY - radius; y <= bounds.maxY + radius; y += 1) {
      for (let x = bounds.minX - radius; x <= bounds.maxX + radius; x += 1) {
        const outside = x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY;
        if (!outside) continue;
        const distanceFromFootprint = distanceToBounds(x, y, bounds);
        if (distanceFromFootprint !== radius) continue;
        if (!this.isBoatNavigableWater(x, y)) continue;
        const coastBias = Math.max(0, 3 - this.boatDistanceToLand(x, y)) * 0.18;
        const targetBias = Math.hypot(x - target.x, y - target.y) * 0.01;
        const score = radius + coastBias + targetBias;
        if (!best || score < best.score) best = { pos: { x, y }, score };
      }
    }
    if (best) return best.pos;
  }
  return undefined;
}

export function findBoatWaterPath(this: CrystalOathSceneContext, start: Vec, end: Vec, preferOpenWater: boolean): Vec[] | undefined {
  const world = this.generatedWorld;
  if (!world) return undefined;
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
    if (current.x === end.x && current.y === end.y) return reconstructBoatPath(nodes, current.key);
    const knownBest = bestCosts.get(current.key);
    if (knownBest !== undefined && current.g > knownBest + 0.001) continue;
    for (let dir = 0; dir < WATER_DIRS.length; dir += 1) {
      const step = WATER_DIRS[dir];
      const nx = current.x + step.x;
      const ny = current.y + step.y;
      if (!this.isBoatNavigableWater(nx, ny)) continue;
      if (step.x !== 0 && step.y !== 0 && (!this.isBoatNavigableWater(current.x + step.x, current.y) || !this.isBoatNavigableWater(current.x, current.y + step.y))) continue;
      const moveCost = step.x !== 0 && step.y !== 0 ? Math.SQRT2 : 1;
      const coastCost = preferOpenWater ? boatCoastPenalty(this.boatDistanceToLand(nx, ny)) : 0;
      const shallowCost = this.isBoatShallowWater(nx, ny) ? 0.22 : 0;
      const turnCost = current.dir >= 0 ? boatTurnPenalty(WATER_DIRS[current.dir], step) : 0;
      const nextG = current.g + moveCost + coastCost + shallowCost + turnCost;
      const nextKey = boatNodeKey(world.width, nx, ny, dir);
      const best = bestCosts.get(nextKey);
      if (best !== undefined && nextG >= best) continue;
      const next: SearchNode = {
        x: nx,
        y: ny,
        dir,
        key: nextKey,
        g: nextG,
        f: nextG + heuristicDistance({ x: nx, y: ny }, end) * 0.98,
        parent: current.key
      };
      nodes.set(nextKey, next);
      bestCosts.set(nextKey, nextG);
      open.push(next);
    }
  }
  return undefined;
}

export function compactBoatWaypoints(this: CrystalOathSceneContext, rawPath: Vec[]): RouteWaypoint[] {
  if (rawPath.length <= 2) return rawPath.map((point, index) => ({ ...point, index }));
  const waypoints: RouteWaypoint[] = [{ ...rawPath[0], index: 0 }];
  let previousDir = normalizedGridDirection(rawPath[0], rawPath[1]);
  let lastWaypoint = rawPath[0];
  for (let i = 1; i < rawPath.length - 1; i += 1) {
    const dir = normalizedGridDirection(rawPath[i], rawPath[i + 1]);
    const distanceSinceWaypoint = Math.hypot(rawPath[i].x - lastWaypoint.x, rawPath[i].y - lastWaypoint.y);
    if (dir.x !== previousDir.x || dir.y !== previousDir.y || distanceSinceWaypoint >= 6) {
      waypoints.push({ ...rawPath[i], index: i });
      lastWaypoint = rawPath[i];
      previousDir = dir;
    }
  }
  waypoints.push({ ...rawPath[rawPath.length - 1], index: rawPath.length - 1 });
  return waypoints;
}

export function smoothBoatRoute(this: CrystalOathSceneContext, rawPath: Vec[], waypoints: RouteWaypoint[]): Vec[] {
  if (waypoints.length < 3) return sampleRawBoatPath(rawPath, 0, rawPath.length - 1);
  const samples: Vec[] = [{ x: rawPath[0].x, y: rawPath[0].y }];
  for (let i = 0; i < waypoints.length - 1; i += 1) {
    const p0 = waypoints[Math.max(0, i - 1)];
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const p3 = waypoints[Math.min(waypoints.length - 1, i + 2)];
    const curved = sampleCatmullRomSegment(p0, p1, p2, p3);
    if (curved.every((point) => this.isSafeBoatRoutePoint(point))) appendRouteSamples(samples, curved.slice(1));
    else appendRouteSamples(samples, sampleRawBoatPath(rawPath, p1.index, p2.index).slice(1));
  }
  return dedupeRouteSamples(samples);
}

export function isSafeBoatRoutePoint(this: CrystalOathSceneContext, point: Vec): boolean {
  return this.isBoatNavigableWater(Math.round(point.x), Math.round(point.y));
}

export function isBoatNavigableWater(this: CrystalOathSceneContext, x: number, y: number): boolean {
  const world = this.generatedWorld;
  if (!world || x < 0 || y < 0 || x >= world.width || y >= world.height) return false;
  const semantic = world.semantic;
  if (semantic) {
    const i = y * world.width + x;
    if (semantic.layers.landMask[i] !== 0) return false;
    const water = semantic.layers.waterClass[i];
    return water === SEMANTIC_WATER.DEEP || water === SEMANTIC_WATER.SHALLOW;
  }
  const tile = world.tiles[y]?.[x];
  return worldTileHasTag(tile, "water");
}

export function isBoatShallowWater(this: CrystalOathSceneContext, x: number, y: number): boolean {
  const world = this.generatedWorld;
  if (!world || !world.semantic || x < 0 || y < 0 || x >= world.width || y >= world.height) return false;
  return world.semantic.layers.waterClass[y * world.width + x] === SEMANTIC_WATER.SHALLOW;
}

export function boatDistanceToLand(this: CrystalOathSceneContext, x: number, y: number): number {
  const world = this.generatedWorld;
  if (!world || !world.semantic || x < 0 || y < 0 || x >= world.width || y >= world.height) return 0;
  return world.semantic.layers.distanceToLand[y * world.width + x] ?? 0;
}

export function drawBoatTravel(this: CrystalOathSceneContext, cam: Vec) {
  const travel = this.boatTravel;
  if (!travel) return;
  if (this.semanticDebugOverlay !== "off") this.drawBoatTravelDebug(cam);
  const centerX = travel.boatPos.x * TILE - cam.x + TILE / 2;
  const centerY = travel.boatPos.y * TILE - cam.y + TILE / 2;
  this.drawActorShadow(centerX, centerY + 11, 42, 12);
  const x = centerX - BOAT_DISPLAY_W / 2;
  const y = centerY - BOAT_DISPLAY_H / 2 - 3;
  if (this.hasTexture("vehicle_boat")) {
    this.drawTexture("vehicle_boat", x, y, BOAT_DISPLAY_W, BOAT_DISPLAY_H, LAYER_CHARACTER_IMAGE, 1, undefined, travel.facing === "right");
    return;
  }
  this.g.fillStyle(0x2f1d13, 1).fillRect(x + 8, y + 18, BOAT_DISPLAY_W - 16, 11);
  this.g.fillStyle(0x8b5a2b, 1).fillRect(x + 14, y + 10, BOAT_DISPLAY_W - 28, 13);
  this.g.fillStyle(0xe8d29c, 1).fillTriangle(x + 24, y + 5, x + 24, y + 24, travel.facing === "right" ? x + 42 : x + 10, y + 22);
}

export function drawBoatTravelDebug(this: CrystalOathSceneContext, cam: Vec) {
  const travel = this.boatTravel;
  if (!travel) return;
  this.g.lineStyle(1, 0x80e8ff, 0.55);
  for (let i = 1; i < travel.path.length; i += 1) {
    const a = travel.path[i - 1];
    const b = travel.path[i];
    this.g.lineBetween(a.x * TILE - cam.x + TILE / 2, a.y * TILE - cam.y + TILE / 2, b.x * TILE - cam.x + TILE / 2, b.y * TILE - cam.y + TILE / 2);
  }
  this.g.fillStyle(0xffe28a, 0.9);
  for (const point of travel.waypoints) this.g.fillCircle(point.x * TILE - cam.x + TILE / 2, point.y * TILE - cam.y + TILE / 2, 3);
}

function boatRoutePointAtDistance(travel: BoatTravelState, distance: number): Vec {
  while (travel.segmentIndex < travel.pathDistances.length - 2 && travel.pathDistances[travel.segmentIndex + 1] < distance) {
    travel.segmentIndex += 1;
  }
  const from = travel.path[travel.segmentIndex] ?? travel.path[0];
  const to = travel.path[travel.segmentIndex + 1] ?? from;
  const startDistance = travel.pathDistances[travel.segmentIndex] ?? 0;
  const endDistance = travel.pathDistances[travel.segmentIndex + 1] ?? startDistance;
  const t = endDistance <= startDistance ? 0 : (distance - startDistance) / (endDistance - startDistance);
  return {
    x: PhaserClampLerp(from.x, to.x, t),
    y: PhaserClampLerp(from.y, to.y, t)
  };
}

function sampleCatmullRomSegment(p0: Vec, p1: Vec, p2: Vec, p3: Vec): Vec[] {
  const distance = Math.max(1, Math.hypot(p2.x - p1.x, p2.y - p1.y));
  const steps = Math.max(2, Math.ceil(distance / ROUTE_SAMPLE_STEP_TILES));
  const samples: Vec[] = [{ x: p1.x, y: p1.y }];
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const tt = t * t;
    const ttt = tt * t;
    samples.push({
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * tt + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * ttt),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * tt + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * ttt)
    });
  }
  return samples;
}

function sampleRawBoatPath(rawPath: Vec[], fromIndex: number, toIndex: number): Vec[] {
  const samples: Vec[] = [{ ...rawPath[fromIndex] }];
  for (let i = fromIndex; i < toIndex; i += 1) {
    const from = rawPath[i];
    const to = rawPath[i + 1];
    const distance = Math.max(0.01, Math.hypot(to.x - from.x, to.y - from.y));
    const steps = Math.max(1, Math.ceil(distance / ROUTE_SAMPLE_STEP_TILES));
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      samples.push({ x: PhaserClampLerp(from.x, to.x, t), y: PhaserClampLerp(from.y, to.y, t) });
    }
  }
  return dedupeRouteSamples(samples);
}

function appendRouteSamples(target: Vec[], samples: Vec[]) {
  for (const sample of samples) {
    const last = target[target.length - 1];
    if (!last || Math.hypot(sample.x - last.x, sample.y - last.y) > 0.04) target.push(sample);
  }
}

function dedupeRouteSamples(samples: Vec[]): Vec[] {
  const deduped: Vec[] = [];
  appendRouteSamples(deduped, samples);
  return deduped;
}

function cumulativeDistances(path: Vec[]): number[] {
  const distances = [0];
  for (let i = 1; i < path.length; i += 1) {
    distances.push(distances[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  }
  return distances;
}

function reconstructBoatPath(nodes: Map<number, SearchNode>, endKey: number): Vec[] {
  const path: Vec[] = [];
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

function heuristicDistance(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function boatCoastPenalty(distanceToLand: number): number {
  if (distanceToLand <= 1) return 3.2;
  if (distanceToLand === 2) return 1.15;
  if (distanceToLand === 3) return 0.35;
  return 0;
}

function boatTurnPenalty(previous: Vec, next: Vec): number {
  const previousLength = Math.hypot(previous.x, previous.y);
  const nextLength = Math.hypot(next.x, next.y);
  if (previousLength <= 0 || nextLength <= 0) return 0;
  const cosine = (previous.x * next.x + previous.y * next.y) / (previousLength * nextLength);
  return (1 - cosine) * 1.05;
}

function normalizedGridDirection(from: Vec, to: Vec): Vec {
  return { x: Math.sign(to.x - from.x), y: Math.sign(to.y - from.y) };
}

function directionToward(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return { x: Math.sign(dx), y: 0 };
  if (dy !== 0) return { x: 0, y: Math.sign(dy) };
  return { x: 0, y: 1 };
}

function distanceToBounds(x: number, y: number, bounds: { minX: number; maxX: number; minY: number; maxY: number }): number {
  const dx = x < bounds.minX ? bounds.minX - x : x > bounds.maxX ? x - bounds.maxX : 0;
  const dy = y < bounds.minY ? bounds.minY - y : y > bounds.maxY ? y - bounds.maxY : 0;
  return Math.max(dx, dy);
}

function PhaserClampLerp(from: number, to: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return from + (to - from) * clamped;
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

  private bubbleUp(index: number) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].f <= this.items[index].f) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  private sinkDown(index: number) {
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
