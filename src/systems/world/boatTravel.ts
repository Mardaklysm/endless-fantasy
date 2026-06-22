import { LAYER_CHARACTER_IMAGE, MOVE_TILES_PER_MS, PIXEL_ART_SCALE, TILE } from "../../app/config";
import { CHARTER_BOAT_8DIR_TEXTURE_KEY } from "../../assets/assetPaths";
import type { LocationDef, TravelDestination } from "../../data/gameDataTypes";
import type { BoatTravelDirection, BoatTravelState, Vec } from "../../scene/sceneTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";
import {
  findBoatWaterPath as findSharedBoatWaterPath,
  findHarborWaterTile,
  isBoatNavigableTile,
  isBoatStepAllowed,
  simplifyBoatPathToCompassWaypoints,
  validateBoatPath
} from "../../world/semantic/boatNavigation";

const BOAT_TILES_PER_MS = MOVE_TILES_PER_MS * 0.5;
const BOAT_HARBOR_BLEND_TILES = 4;
const MAX_HARBOR_WATER_SEARCH_RADIUS = 16;
const BOAT_FRAME_DISPLAY_SIZE = 64;
const BOAT_SPRITE_Y_OFFSET = -5;
const BOAT_BREATHING_SCALE = 1.008;
const BOAT_BREATHING_HALF_CYCLE_MS = 2200;

export const BOAT_TRAVEL_DIRECTION_FRAMES: Record<BoatTravelDirection, number> = {
  N: 0,
  NE: 1,
  E: 2,
  SE: 3,
  S: 4,
  SW: 5,
  W: 6,
  NW: 7
};

interface PlannedBoatRoute {
  arrivalTile: Vec;
  sourceDockTile: Vec;
  destinationDockTile: Vec;
  sourceWaterTile: Vec;
  destinationWaterTile: Vec;
  rawPath: Vec[];
  rawPathDistances: number[];
  waypoints: Vec[];
  path: Vec[];
  pathDistances: number[];
  routeLength: number;
}

interface RouteWaypoint extends Vec {
  index: number;
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
    departureTile: { ...this.worldPos },
    arrivalTile: route.arrivalTile,
    sourceDockTile: route.sourceDockTile,
    destinationDockTile: route.destinationDockTile,
    sourceWaterTile: route.sourceWaterTile,
    destinationWaterTile: route.destinationWaterTile,
    rawPath: route.rawPath,
    rawPathDistances: route.rawPathDistances,
    waypoints: route.waypoints,
    path: route.path,
    pathDistances: route.pathDistances,
    routeLength: route.routeLength,
    progressTiles: 0,
    nextWorldTimeRouteIndex: 1,
    segmentIndex: 0,
    boatPos: { ...route.path[0] },
    direction: initialBoatDirection(route.path, route.sourceDockTile, route.destinationDockTile)
  };
  this.audio.setMode("world");
  if (import.meta.env.DEV) {
    console.info(
      `Boat charter ${sourceHarbor.name} -> ${destination.displayName}: raw ${route.rawPath.length} cells, ${route.waypoints.length} compass waypoints, ${route.routeLength.toFixed(1)} tiles.`
    );
  }
  this.markDirty();
  return true;
}

export function updateBoatTravel(this: CrystalOathSceneContext, deltaMs: number) {
  const travel = this.boatTravel;
  if (!travel) return;
  try {
    travel.progressTiles = Math.min(travel.routeLength, travel.progressTiles + BOAT_TILES_PER_MS * deltaMs);
    advanceBoatTravelWorldTime.call(this, travel);
    travel.boatPos = boatRoutePointAtDistance(travel, travel.progressTiles);
    travel.direction = boatDirectionFromCurrentSegment(travel, travel.direction);
    if (travel.progressTiles >= travel.routeLength) {
      travel.boatPos = { ...travel.destinationDockTile };
      this.completeBoatTravel();
      return;
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
  this.markLocationVisited(this.locations().find((loc) => loc.kind === "harbor" && loc.islandId === travel.destinationIslandId)?.id);
  this.lastMoveDir = directionToward(travel.arrivalTile, travel.destinationDockTile);
  this.destroyBoatTravelSprite();
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
  this.destroyBoatTravelSprite();
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
  const sourceDockTile = this.harborDockTile(sourceHarbor, sourceWaterTile);
  const destinationDockTile = this.harborDockTile(destinationHarbor, destinationWaterTile);
  const rawPath =
    this.findBoatWaterPath(sourceWaterTile, destinationWaterTile, true) ??
    this.findBoatWaterPath(sourceWaterTile, destinationWaterTile, false);
  if (!rawPath || rawPath.length < 2) return undefined;
  const visualRawPath = extendBoatPathToHarbors(sourceDockTile, rawPath, destinationDockTile);
  const waypoints = this.compactBoatWaypoints(visualRawPath);
  const routePath = waypoints.length >= 2 ? waypoints : visualRawPath;
  const errors = this.validateBoatRoutePath(visualRawPath, routePath);
  if (errors.length) {
    if (import.meta.env.DEV) console.warn(`Rejected unsafe boat route: ${errors.join("; ")}`);
    return undefined;
  }
  const pathDistances = cumulativeDistances(routePath);
  const rawPathDistances = cumulativeDistances(visualRawPath);
  const routeLength = pathDistances[pathDistances.length - 1] ?? 0;
  if (routeLength <= 0) return undefined;
  return {
    arrivalTile: this.arrivalTileForIsland(destination.destinationIslandId),
    sourceDockTile,
    destinationDockTile,
    sourceWaterTile,
    destinationWaterTile,
    rawPath: visualRawPath,
    rawPathDistances,
    waypoints: waypoints.map(({ x, y }) => ({ x, y })),
    path: routePath,
    pathDistances,
    routeLength
  };
}

export function harborWaterTile(this: CrystalOathSceneContext, harbor: LocationDef, toward?: LocationDef): Vec | undefined {
  const world = this.generatedWorld?.semantic;
  if (!world) return undefined;
  return findHarborWaterTile(
    world,
    { x: harbor.x, y: harbor.y, footprint: harbor.footprint, id: harbor.id },
    toward ? { x: toward.x, y: toward.y } : undefined,
    MAX_HARBOR_WATER_SEARCH_RADIUS
  );
}

export function harborDockTile(this: CrystalOathSceneContext, harbor: LocationDef, waterTile: Vec): Vec {
  const world = this.generatedWorld?.semantic;
  if (!world) return waterTile;
  const bounds = this.locationFootprintBounds(harbor);
  const candidates: Vec[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
      const candidate = { x, y };
      if (!isBoatNavigableTile(world, x, y)) continue;
      if (!isLegalBoatSegment(candidate, waterTile)) continue;
      if (!isBoatStepAllowed(world, candidate, waterTile)) continue;
      if (!isBoatStepAllowed(world, waterTile, candidate)) continue;
      candidates.push(candidate);
    }
  }
  return candidates.sort((a, b) => Math.hypot(a.x - waterTile.x, a.y - waterTile.y) - Math.hypot(b.x - waterTile.x, b.y - waterTile.y))[0] ?? waterTile;
}

export function findBoatWaterPath(this: CrystalOathSceneContext, start: Vec, end: Vec, preferOpenWater: boolean): Vec[] | undefined {
  const world = this.generatedWorld?.semantic;
  if (!world) return undefined;
  return findSharedBoatWaterPath(world, start, end, preferOpenWater);
}

export function compactBoatWaypoints(this: CrystalOathSceneContext, rawPath: Vec[]): RouteWaypoint[] {
  const simplified = simplifyBoatPathToCompassWaypoints(rawPath);
  return simplified.map((point) => ({ ...point, index: rawPath.findIndex((candidate) => candidate.x === point.x && candidate.y === point.y) }));
}

export function validateBoatRoutePath(this: CrystalOathSceneContext, rawPath: Vec[], waypoints: Vec[]): string[] {
  const world = this.generatedWorld?.semantic;
  if (!world) return ["No semantic world is available for boat route validation."];
  const errors = validateBoatPath(world, rawPath);
  for (let i = 1; i < waypoints.length; i += 1) {
    if (!isLegalBoatSegment(waypoints[i - 1], waypoints[i])) errors.push(`Waypoint segment ${waypoints[i - 1].x},${waypoints[i - 1].y} -> ${waypoints[i].x},${waypoints[i].y} is not a legal compass segment.`);
  }
  return errors;
}

export function isBoatNavigableWater(this: CrystalOathSceneContext, x: number, y: number): boolean {
  const world = this.generatedWorld?.semantic;
  return !!world && isBoatNavigableTile(world, x, y);
}

export function drawBoatTravel(this: CrystalOathSceneContext, cam: Vec) {
  const travel = this.boatTravel;
  if (!travel) return;
  if (this.semanticDebugOverlay !== "off") this.drawBoatTravelDebug(cam);
  const departurePlayerAlpha = departurePlayerFadeAlpha(travel);
  if (departurePlayerAlpha > 0.01) {
    this.drawLeader(travel.departureTile.x * TILE - cam.x + 4, travel.departureTile.y * TILE - cam.y + 3, departurePlayerAlpha);
  }
  const centerX = travel.boatPos.x * TILE - cam.x + TILE / 2;
  const centerY = travel.boatPos.y * TILE - cam.y + TILE / 2;
  const boatAlpha = boatTravelFadeAlpha(travel);
  this.drawActorShadow(centerX, centerY + 11, 42, 12, 0.34 * boatAlpha);
  if (this.hasTexture(CHARTER_BOAT_8DIR_TEXTURE_KEY)) {
    this.drawBoatTravelSprite(centerX, centerY, BOAT_TRAVEL_DIRECTION_FRAMES[travel.direction], boatAlpha);
  } else {
    this.destroyBoatTravelSprite();
    const x = centerX - 29;
    const y = centerY - 22;
    const eastFacing = directionPointsEast(travel.direction);
    this.g.fillStyle(0x2f1d13, boatAlpha).fillRect(x + 8, y + 18, 42, 11);
    this.g.fillStyle(0x8b5a2b, boatAlpha).fillRect(x + 14, y + 10, 30, 13);
    this.g.fillStyle(0xe8d29c, boatAlpha).fillTriangle(x + 24, y + 5, x + 24, y + 24, eastFacing ? x + 42 : x + 10, y + 22);
  }
  const arrivalPlayerAlpha = arrivalPlayerFadeAlpha(travel);
  if (arrivalPlayerAlpha > 0.01) {
    this.drawLeader(travel.arrivalTile.x * TILE - cam.x + 4, travel.arrivalTile.y * TILE - cam.y + 3, arrivalPlayerAlpha);
  }
}

export function drawBoatTravelSprite(this: CrystalOathSceneContext, centerX: number, centerY: number, frameIndex: number, alpha = 1) {
  let sprite = this.boatTravelSprite;
  if (!sprite || !sprite.active) {
    sprite = this.add.image(centerX * PIXEL_ART_SCALE, (centerY + BOAT_SPRITE_Y_OFFSET) * PIXEL_ART_SCALE, CHARTER_BOAT_8DIR_TEXTURE_KEY, frameIndex);
    sprite.setOrigin(0.5, 0.5);
    sprite.setDisplaySize(BOAT_FRAME_DISPLAY_SIZE * PIXEL_ART_SCALE, BOAT_FRAME_DISPLAY_SIZE * PIXEL_ART_SCALE);
    sprite.setDepth(LAYER_CHARACTER_IMAGE);
    sprite.setScrollFactor(0);
    this.boatTravelSprite = sprite;
    this.boatTravelBreathingTween = this.tweens.add({
      targets: sprite,
      scaleX: sprite.scaleX * BOAT_BREATHING_SCALE,
      scaleY: sprite.scaleY * BOAT_BREATHING_SCALE,
      duration: BOAT_BREATHING_HALF_CYCLE_MS,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1
    });
  }
  sprite.setFrame(frameIndex);
  sprite.setPosition(centerX * PIXEL_ART_SCALE, (centerY + BOAT_SPRITE_Y_OFFSET) * PIXEL_ART_SCALE);
  sprite.setDepth(LAYER_CHARACTER_IMAGE);
  sprite.setAlpha(alpha);
  sprite.setVisible(true);
}

export function destroyBoatTravelSprite(this: CrystalOathSceneContext) {
  if (this.boatTravelSprite) this.tweens.killTweensOf(this.boatTravelSprite);
  this.boatTravelBreathingTween?.stop();
  this.boatTravelBreathingTween = undefined;
  this.boatTravelSprite?.destroy();
  this.boatTravelSprite = undefined;
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

function initialBoatDirection(path: Vec[], sourceWaterTile: Vec, destinationWaterTile: Vec): BoatTravelDirection {
  const from = path[0] ?? sourceWaterTile;
  const to = path[1] ?? destinationWaterTile;
  return boatDirectionFromSegment(from, to, "E");
}

function extendBoatPathToHarbors(sourceDockTile: Vec, rawPath: Vec[], destinationDockTile: Vec): Vec[] {
  const path = rawPath.map((point) => ({ ...point }));
  if (path.length === 0) return path;
  if (!samePoint(sourceDockTile, path[0])) path.unshift({ ...sourceDockTile });
  const last = path[path.length - 1];
  if (!samePoint(destinationDockTile, last)) path.push({ ...destinationDockTile });
  return path;
}

function boatDirectionFromCurrentSegment(travel: BoatTravelState, fallback: BoatTravelDirection): BoatTravelDirection {
  const from = travel.path[travel.segmentIndex] ?? travel.path[0];
  const to = travel.path[travel.segmentIndex + 1] ?? from;
  return boatDirectionFromSegment(from, to, fallback);
}

function boatDirectionFromSegment(from: Vec, to: Vec, fallback: BoatTravelDirection): BoatTravelDirection {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  if (dx > 0 && dy < 0) return "NE";
  if (dx > 0 && dy > 0) return "SE";
  if (dx < 0 && dy > 0) return "SW";
  if (dx < 0 && dy < 0) return "NW";
  if (dx > 0) return "E";
  if (dx < 0) return "W";
  if (dy > 0) return "S";
  if (dy < 0) return "N";
  return fallback;
}

function directionPointsEast(direction: BoatTravelDirection): boolean {
  return direction === "E" || direction === "NE" || direction === "SE";
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
    x: clampLerp(from.x, to.x, t),
    y: clampLerp(from.y, to.y, t)
  };
}

function advanceBoatTravelWorldTime(this: CrystalOathSceneContext, travel: BoatTravelState) {
  while (
    travel.nextWorldTimeRouteIndex < travel.rawPathDistances.length &&
    travel.rawPathDistances[travel.nextWorldTimeRouteIndex] <= travel.progressTiles
  ) {
    this.advanceWorldTimeTick();
    travel.nextWorldTimeRouteIndex += 1;
  }
}

function departurePlayerFadeAlpha(travel: BoatTravelState): number {
  return 1 - clamp01(travel.progressTiles / BOAT_HARBOR_BLEND_TILES);
}

function arrivalPlayerFadeAlpha(travel: BoatTravelState): number {
  const start = Math.max(0, travel.routeLength - BOAT_HARBOR_BLEND_TILES);
  return clamp01((travel.progressTiles - start) / BOAT_HARBOR_BLEND_TILES);
}

function boatTravelFadeAlpha(travel: BoatTravelState): number {
  return Math.min(clamp01(travel.progressTiles / BOAT_HARBOR_BLEND_TILES), 1 - arrivalPlayerFadeAlpha(travel));
}

function cumulativeDistances(path: Vec[]): number[] {
  const distances = [0];
  for (let i = 1; i < path.length; i += 1) {
    distances.push(distances[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y));
  }
  return distances;
}

function isLegalBoatSegment(from: Vec, to: Vec): boolean {
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);
  return (dx !== 0 || dy !== 0) && (dx === 0 || dy === 0 || dx === dy);
}

function samePoint(a: Vec, b: Vec): boolean {
  return a.x === b.x && a.y === b.y;
}

function directionToward(from: Vec, to: Vec): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) return { x: Math.sign(dx), y: 0 };
  if (dy !== 0) return { x: 0, y: Math.sign(dy) };
  return { x: 0, y: 1 };
}

function clampLerp(from: number, to: number, t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return from + (to - from) * clamped;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
