import type Phaser from "phaser";
import { hashNoise } from "../seededRng.ts";
import type { SemanticVec, SemanticWorld } from "./semanticTypes.ts";

export type SemanticRouteOverlayMode = "hidden" | "styled" | "debug";

export interface SemanticRouteRenderOptions {
  tileSize: number;
  textureKey?: string;
  routeOverlayMode?: SemanticRouteOverlayMode;
  riverOverlayMode?: SemanticRouteOverlayMode;
}

export interface SemanticRouteRenderPlan {
  width: number;
  height: number;
  tileSize: number;
  routeOverlayMode: SemanticRouteOverlayMode;
  riverOverlayMode: SemanticRouteOverlayMode;
  styledRoadPathCount: number;
  styledRiverPathCount: number;
  roadCellCount: number;
  riverCellCount: number;
  bridgeCandidateCount: number;
  debugMarkersVisible: boolean;
}

const ROAD_STYLE = {
  outlineWidth: 11,
  innerWidth: 7,
  outline: "rgba(103, 71, 37, 0.78)",
  dirt: "rgba(196, 146, 78, 0.88)",
  lightDust: "rgba(232, 190, 116, 0.38)",
  darkSpeckle: "rgba(91, 63, 35, 0.42)"
} as const;

const RIVER_STYLE = {
  bankWidth: 14,
  shadowWidth: 11,
  waterWidth: 8,
  centerWidth: 3,
  shineWidth: 1.4,
  bank: "rgba(30, 76, 77, 0.34)",
  shadow: "rgba(12, 48, 84, 0.54)",
  water: "rgba(44, 128, 169, 0.88)",
  center: "rgba(87, 174, 202, 0.58)",
  shine: "rgba(215, 249, 252, 0.48)",
  sourcePool: "rgba(151, 223, 218, 0.28)",
  mouthPool: "rgba(67, 158, 183, 0.34)",
  darkFleck: "rgba(11, 68, 104, 0.34)",
  brightFleck: "rgba(185, 237, 242, 0.36)"
} as const;

export function createSemanticRouteOverlayTexture(scene: Phaser.Scene, world: SemanticWorld, options: SemanticRouteRenderOptions): string {
  const textureKey = options.textureKey ?? `semantic-route-overlay-${world.seed}`;
  const canvas = createSemanticRouteOverlayCanvas(world, options);
  if (scene.textures.exists(textureKey)) scene.textures.remove(textureKey);
  scene.textures.addCanvas(textureKey, canvas);
  return textureKey;
}

export function createSemanticRouteOverlayCanvas(world: SemanticWorld, options: SemanticRouteRenderOptions): HTMLCanvasElement {
  const plan = describeSemanticRouteRenderPlan(world, options);
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to create semantic route overlay canvas.");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, plan.width, plan.height);

  if (plan.riverOverlayMode === "styled") drawStyledRivers(ctx, world, plan.tileSize);
  else if (plan.riverOverlayMode === "debug") drawDebugRivers(ctx, world, plan.tileSize);

  if (plan.routeOverlayMode === "styled") drawStyledRoads(ctx, world, plan.tileSize);
  else if (plan.routeOverlayMode === "debug") drawDebugRoads(ctx, world, plan.tileSize);

  return canvas;
}

export function describeSemanticRouteRenderPlan(world: SemanticWorld, options: SemanticRouteRenderOptions): SemanticRouteRenderPlan {
  const tileSize = Math.max(1, Math.floor(options.tileSize));
  const routeOverlayMode = options.routeOverlayMode ?? "styled";
  const riverOverlayMode = options.riverOverlayMode ?? "styled";
  return {
    width: world.width * tileSize,
    height: world.height * tileSize,
    tileSize,
    routeOverlayMode,
    riverOverlayMode,
    styledRoadPathCount: routeOverlayMode === "styled" ? world.roadGraph.edges.filter((edge) => edge.connected && edge.path.length > 1).length : 0,
    styledRiverPathCount: riverOverlayMode === "styled" ? world.rivers.filter((river) => river.path.length > 1).length : 0,
    roadCellCount: countValues(world.layers.roadMap, 1),
    riverCellCount: countValues(world.layers.riverMap, 1),
    bridgeCandidateCount: world.bridgeCandidates.length,
    debugMarkersVisible: routeOverlayMode === "debug" || riverOverlayMode === "debug"
  };
}

function drawStyledRoads(ctx: CanvasRenderingContext2D, world: SemanticWorld, tileSize: number) {
  const paths = world.roadGraph.edges.filter((edge) => edge.connected && edge.path.length > 1).map((edge) => edge.path);
  const pointPaths = paths.map((path, index) => jitteredPathPoints(world.seed, `road:${index}`, path, tileSize, 1.15));
  for (const path of pointPaths) drawStrokePoints(ctx, path, ROAD_STYLE.outlineWidth, ROAD_STYLE.outline);
  for (const path of pointPaths) drawStrokePoints(ctx, path, ROAD_STYLE.innerWidth, ROAD_STYLE.dirt);
  drawRoadTexture(ctx, world, tileSize);
}

function drawStyledRivers(ctx: CanvasRenderingContext2D, world: SemanticWorld, tileSize: number) {
  const rivers = world.rivers.filter((river) => river.path.length > 1);
  const pointPaths = rivers.map((river, index) => jitteredPathPoints(world.seed, `river:${index}`, river.path, tileSize, 0.9));
  for (const river of rivers) {
    drawRiverPool(ctx, river.source, tileSize, tileSize * 0.24, RIVER_STYLE.sourcePool);
    drawRiverPool(ctx, river.mouth, tileSize, tileSize * 0.36, RIVER_STYLE.mouthPool);
  }
  for (const path of pointPaths) drawCurvedStrokePoints(ctx, path, RIVER_STYLE.bankWidth, RIVER_STYLE.bank);
  for (const path of pointPaths) drawCurvedStrokePoints(ctx, path, RIVER_STYLE.shadowWidth, RIVER_STYLE.shadow);
  for (const path of pointPaths) drawCurvedStrokePoints(ctx, path, RIVER_STYLE.waterWidth, RIVER_STYLE.water);
  drawRiverTexture(ctx, world, tileSize);
  for (const path of pointPaths) drawCurvedStrokePoints(ctx, path, RIVER_STYLE.centerWidth, RIVER_STYLE.center);
  for (const path of pointPaths) drawRiverShine(ctx, path, RIVER_STYLE.shineWidth, RIVER_STYLE.shine);
}

function drawDebugRoads(ctx: CanvasRenderingContext2D, world: SemanticWorld, tileSize: number) {
  for (const edge of world.roadGraph.edges) {
    if (!edge.connected) continue;
    drawStrokePath(ctx, edge.path, tileSize, 3, "rgba(255, 179, 71, 0.9)");
    for (const cell of edge.path) drawDebugDot(ctx, cell, tileSize, "rgba(255, 236, 145, 0.95)");
  }
}

function drawDebugRivers(ctx: CanvasRenderingContext2D, world: SemanticWorld, tileSize: number) {
  for (const river of world.rivers) {
    drawStrokePath(ctx, river.path, tileSize, 4, "rgba(67, 216, 255, 0.9)");
    drawDebugDot(ctx, river.source, tileSize, "rgba(192, 249, 255, 0.95)");
    drawDebugDot(ctx, river.mouth, tileSize, "rgba(35, 103, 255, 0.95)");
  }
}

function drawStrokePath(ctx: CanvasRenderingContext2D, path: SemanticVec[], tileSize: number, width: number, color: string) {
  if (path.length < 2) return;
  drawStrokePoints(ctx, path.map((cell) => cellCenter(cell, tileSize)), width, color);
}

function drawStrokePoints(ctx: CanvasRenderingContext2D, points: SemanticVec[], width: number, color: string) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  const start = points[0];
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  ctx.restore();
}

function drawCurvedStrokePoints(ctx: CanvasRenderingContext2D, points: SemanticVec[], width: number, color: string) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.beginPath();
  const start = points[0];
  ctx.moveTo(start.x, start.y);
  if (points.length === 2) {
    const end = points[1];
    ctx.lineTo(end.x, end.y);
  } else {
    for (let i = 1; i < points.length - 1; i += 1) {
      const current = points[i];
      const next = points[i + 1];
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
    }
    const end = points[points.length - 1];
    ctx.lineTo(end.x, end.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawRiverShine(ctx: CanvasRenderingContext2D, points: SemanticVec[], width: number, color: string) {
  if (points.length < 4) return;
  const shinePoints = points.map((point, index) => ({ x: point.x - (index % 2 === 0 ? 1 : 0), y: point.y - 1 }));
  drawCurvedStrokePoints(ctx, shinePoints.slice(1, Math.max(2, shinePoints.length - 1)), width, color);
}

function jitteredPathPoints(seed: string, salt: string, path: SemanticVec[], tileSize: number, amplitude: number): SemanticVec[] {
  return path.map((cell, index) => {
    const center = cellCenter(cell, tileSize);
    if (index === 0 || index === path.length - 1) return center;
    const jitterX = (hashNoise(`${seed}:${salt}:jitter-x`, cell.x, cell.y) - 0.5) * amplitude * 2;
    const jitterY = (hashNoise(`${seed}:${salt}:jitter-y`, cell.x, cell.y) - 0.5) * amplitude * 2;
    return { x: center.x + jitterX, y: center.y + jitterY };
  });
}

function drawRoadTexture(ctx: CanvasRenderingContext2D, world: SemanticWorld, tileSize: number) {
  ctx.save();
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = y * world.width + x;
      if (!world.layers.roadMap[i]) continue;
      const speckleCount = 1 + Math.floor(hashNoise(`${world.seed}:road-speckle-count`, x, y) * 3);
      for (let dot = 0; dot < speckleCount; dot += 1) {
        const roll = hashNoise(`${world.seed}:road-speckle:${dot}`, x, y);
        if (roll < 0.25) continue;
        const px = x * tileSize + Math.floor(tileSize * (0.24 + hashNoise(`${world.seed}:road-speckle-x:${dot}`, x, y) * 0.52));
        const py = y * tileSize + Math.floor(tileSize * (0.24 + hashNoise(`${world.seed}:road-speckle-y:${dot}`, x, y) * 0.52));
        const size = roll > 0.82 ? 2 : 1;
        ctx.fillStyle = roll > 0.58 ? ROAD_STYLE.darkSpeckle : ROAD_STYLE.lightDust;
        ctx.fillRect(px, py, size, size);
      }
    }
  }
  ctx.restore();
}

function drawRiverTexture(ctx: CanvasRenderingContext2D, world: SemanticWorld, tileSize: number) {
  ctx.save();
  for (let y = 0; y < world.height; y += 1) {
    for (let x = 0; x < world.width; x += 1) {
      const i = y * world.width + x;
      if (!world.layers.riverMap[i]) continue;
      const fleckCount = 1 + Math.floor(hashNoise(`${world.seed}:river-fleck-count`, x, y) * 2);
      for (let fleck = 0; fleck < fleckCount; fleck += 1) {
        const roll = hashNoise(`${world.seed}:river-fleck:${fleck}`, x, y);
        if (roll < 0.34) continue;
        const px = x * tileSize + Math.floor(tileSize * (0.24 + hashNoise(`${world.seed}:river-fleck-x:${fleck}`, x, y) * 0.52));
        const py = y * tileSize + Math.floor(tileSize * (0.24 + hashNoise(`${world.seed}:river-fleck-y:${fleck}`, x, y) * 0.52));
        const size = roll > 0.86 ? 2 : 1;
        ctx.fillStyle = roll > 0.62 ? RIVER_STYLE.brightFleck : RIVER_STYLE.darkFleck;
        ctx.fillRect(px, py, size, 1);
      }
    }
  }
  ctx.restore();
}

function drawRiverPool(ctx: CanvasRenderingContext2D, cell: SemanticVec, tileSize: number, radius: number, color: string) {
  const center = cellCenter(cell, tileSize);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDebugDot(ctx: CanvasRenderingContext2D, cell: SemanticVec, tileSize: number, color: string) {
  const center = cellCenter(cell, tileSize);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, Math.max(2, tileSize * 0.16), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function cellCenter(cell: SemanticVec, tileSize: number): SemanticVec {
  return { x: cell.x * tileSize + tileSize / 2, y: cell.y * tileSize + tileSize / 2 };
}

function countValues(array: Uint8Array, value: number): number {
  let count = 0;
  for (const item of array) if (item === value) count += 1;
  return count;
}
