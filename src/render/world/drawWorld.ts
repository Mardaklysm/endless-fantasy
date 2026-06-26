import Phaser from "phaser";
import {
  DEBUG_WORLD_LAYOUT,
  HEIGHT,
  LAYER_OBJECT_IMAGE,
  LAYER_WORLD_IMAGE,
  PIXEL_ART_SCALE,
  TILE,
  WIDTH,
  WORLD_H,
  WORLD_W
} from "../../app/config";
import {
  WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID,
  WORLD_CURRENT_ROUTE_TEXTURE_KEYS,
  WORLD_CURRENT_TERRAIN_TEXTURE_KEYS,
  WORLD_CURRENT_TERRAIN_VARIANT_TEXTURE_KEYS,
  worldCurrentAssetByTextureKey,
  worldCurrentObjectTextureKey
} from "../../data/worldCurrentAssets";
import {
  perfEndWorldRender,
  perfNow,
  perfRecordChunkCreate,
  perfRecordChunkEvictions,
  perfRecordChunkHit,
  perfRecordObjectOverlay,
  perfRecordTextureCache,
  perfStartWorldRender
} from "../../debug/perf";
import type { WorldObjectId } from "../../data/worldObjects";
import { WORLD_TILES, worldTileHasTag } from "../../data/worldTiles";
import type { WorldTileId } from "../../data/worldTiles";
import type { Terrain, Vec } from "../../scene/sceneTypes";
import { createSemanticMaskTerrainTexture, roadRibbonDebugSegments, roadRibbonSampleAt, terrainVariantTextureAlphaAt, terrainVariantWeightsAt } from "../../world/semantic/semanticMaskTerrainRenderer";
import type { SemanticMaskTerrainClass, SemanticMaskTerrainSources, SemanticMaskTerrainVariantSources } from "../../world/semantic/semanticMaskTerrainRenderer";
import { createSemanticRouteOverlayTexture } from "../../world/semantic/semanticRouteRenderer";
import { SEMANTIC_BIOME, SEMANTIC_WATER } from "../../world/semantic/semanticTypes";
import type { GeneratedWorld, WorldRoadVisual } from "../../world/worldGenerator";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

const HORIZONTAL_BRIDGE_Y_OFFSET = -2;
const SEMANTIC_TERRAIN_CHUNK_TILES = 16;
const SEMANTIC_TERRAIN_CHUNK_PADDING_TILES = 2;
const SEMANTIC_TERRAIN_CHUNK_MASK_PIXELS_PER_CELL = 16;
const SEMANTIC_TERRAIN_MAX_CACHED_CHUNKS = 96;

export function drawWorld(this: CrystalOathSceneContext) {
  const perfRenderStartMs = perfStartWorldRender(this);
  this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
  const leaderPos = this.visualExplorePos("world");
  const focusPos = this.boatTravel?.boatPos ?? leaderPos;
  const worldWidth = this.generatedWorld?.width ?? WORLD_W;
  const worldHeight = this.generatedWorld?.height ?? WORLD_H;
  const cam = this.cameraFor(focusPos, worldWidth, worldHeight);
  const tileCam = { x: Math.round(cam.x), y: Math.round(cam.y) };
  const startX = Math.max(0, Math.floor(tileCam.x / TILE) - 1);
  const endX = Math.min(worldWidth - 1, Math.ceil((tileCam.x + WIDTH) / TILE));
  const startY = Math.max(0, Math.floor(tileCam.y / TILE) - 1);
  const endY = Math.min(worldHeight - 1, Math.ceil((tileCam.y + HEIGHT) / TILE));
  const showRawTiles = this.semanticDebugOverlay === "rawTiles";
  if (showRawTiles || !this.generatedWorld) {
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        this.drawWorldTile(this.world[y][x], x * TILE - tileCam.x, y * TILE - tileCam.y, x, y);
      }
    }
  } else if (!this.drawCachedWorldTerrain(tileCam)) {
    throw new Error("Semantic world terrain cache unavailable. Refusing to fall back to full-cell terrain tiles because that breaks organic roads.");
  }
  this.drawCachedWorldRouteOverlay(tileCam);
  this.drawWorldOverlays(startX, endX, startY, endY, tileCam);
  this.drawSemanticDebugOverlay(startX, endX, startY, endY, tileCam);
  for (const loc of this.locations()) {
    const bounds = this.locationFootprintBounds(loc);
    if (bounds.maxX < startX || bounds.minX > endX || bounds.maxY < startY || bounds.minY > endY) continue;
    this.drawLocationIcon(loc, bounds.minX * TILE - tileCam.x, bounds.minY * TILE - tileCam.y);
  }
  if (this.boatTravel) this.drawBoatTravel(cam);
  else this.drawLeader(leaderPos.x * TILE - cam.x + 4, leaderPos.y * TILE - cam.y + 3);
  this.drawOverworldHud();
  this.drawWorldMinimap();
  const loc = this.locationAt(this.worldPos.x, this.worldPos.y) ?? this.facingLocation();
  if (loc && !this.boatTravel) this.drawPrompt(loc.kind === "harbor" ? `Use ${loc.name}` : loc.kind === "landmark" ? `Inspect ${loc.name}` : `Enter ${loc.name}`);
  if (DEBUG_WORLD_LAYOUT) {
    const mapPixelW = this.world[0]?.length ?? 0;
    const mapPixelH = this.world.length;
    this.g.fillStyle(0xffffff, 0.5);
    this.text(16, HEIGHT - 32, `W${mapPixelW}x${mapPixelH}  cam ${tileCam.x},${tileCam.y}  player ${this.worldPos.x},${this.worldPos.y}`, 10, "#aaccff", "left");
  }
  if (this.semanticDebugOverlay !== "off") {
    const cloudState = this.cloudOverlay?.debugState();
    this.text(16, HEIGHT - 66, this.worldTimeDebugText(), 10, "#ffe4b4", "left");
    this.text(
      16,
      HEIGHT - 48,
      `Clouds ${cloudState?.enabled ? "on" : "off"} theme ${cloudState?.themeName ?? "none"} tint ${cloudState?.activeTint ?? "none"} active ${cloudState?.activeCloudId ?? "none"}`,
      10,
      "#cfe8ff",
      "left"
    );
  }
  perfEndWorldRender(this, perfRenderStartMs);
}

export function drawWorldTile(this: CrystalOathSceneContext, terrain: Terrain, sx: number, sy: number, x: number, y: number) {
  const roadVisual = this.roadVisualAt(x, y);
  const tile = WORLD_TILES[roadVisual?.sourceTileId ?? terrain];
  const textureKey = this.currentTerrainTextureForTile(roadVisual?.sourceTileId ?? terrain);
  if (textureKey && this.hasTexture(textureKey)) {
    this.drawTexture(textureKey, sx, sy, TILE, TILE, LAYER_WORLD_IMAGE);
    return;
  }
  if (tile?.biome === "grassland") this.drawWorldPlainsTile(sx, sy, x, y);
  else if (tile?.biome === "forest" || tile?.biome === "darkland") this.drawWorldForestTile(sx, sy, x, y);
  else if (tile?.biome === "mountain") {
    if (worldTileHasTag(terrain, "blocked") || worldTileHasTag(terrain, "cliff")) this.drawWorldMountainTile(sx, sy, x, y);
    else this.drawWorldHillsTile(sx, sy, x, y);
  } else if (tile?.biome === "water") this.drawWorldWaterTile(worldTileHasTag(terrain, "deep"), sx, sy, x, y);
  else if (tile?.biome === "desert") this.drawWorldSandTile(sx, sy, x, y);
  else this.drawWorldRoadTile(sx, sy, x, y);
  this.drawWorldCoastEdges(terrain, sx, sy, x, y);
}

export function currentTerrainTextureForTile(this: CrystalOathSceneContext, tileId: WorldTileId | undefined): string | undefined {
  const tile = tileId ? WORLD_TILES[tileId] : undefined;
  if (!tile) return undefined;
  if (tile.biome === "water") return worldTileHasTag(tileId, "deep") ? WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.deepOcean : WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.shallowWater;
  if (tile.blendGroup === "snow" || tile.blendGroup === "ice") return WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.ice;
  if (tile.blendGroup === "desert") return tileId === "beach_sand" || tileId === "wet_beach_sand" ? WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.beach : WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.sand;
  if (tile.blendGroup === "rock") return undefined;
  if (tile.blendGroup === "lava") return "world_current_terrain_lava_crust";
  if (tile.blendGroup === "dark") return "world_current_terrain_black_ash_ground";
  if (tile.id.includes("road") || tile.id.includes("trail")) return "world_current_terrain_packed_dirt_surface";
  return WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.grassland;
}

export function roadVisualAt(this: CrystalOathSceneContext, x: number, y: number): WorldRoadVisual | undefined {
  return this.roadVisualsByKey.get(`${x},${y}`);
}

export function drawWorldOverlays(this: CrystalOathSceneContext, startX: number, endX: number, startY: number, endY: number, tileCam: Vec) {
  if (!this.generatedWorld) return;
  const perfStartMs = perfNow();
  const overlayGraphics = this.worldOverlay;
  const inView = (pos: Vec, margin = 0) => pos.x >= startX - margin && pos.x <= endX + margin && pos.y >= startY - margin && pos.y <= endY + margin;
  const visibleObjectOverlays = this.generatedWorld.objectOverlays
    .filter((overlay) => inView(overlay, Math.max(2, Math.ceil(overlay.scale / 2) + 1)))
    .sort(
      (a, b) =>
        this.worldOverlayDrawRank(a) - this.worldOverlayDrawRank(b) ||
        a.y + (a.offsetY ?? 0) - (b.y + (b.offsetY ?? 0)) ||
        a.x + (a.offsetX ?? 0) - (b.x + (b.offsetX ?? 0))
    );
  const reefTextureKey = WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID.coral_cluster_blue;
  if (!reefTextureKey || !this.hasTexture(reefTextureKey)) {
    for (const reef of this.generatedWorld.reefs) {
      if (!inView(reef)) continue;
      const sx = reef.x * TILE - tileCam.x;
      const sy = reef.y * TILE - tileCam.y;
      overlayGraphics.fillStyle(0xd8d0a0, 0.85).fillTriangle(sx + 8, sy + 23, sx + 14, sy + 12, sx + 20, sy + 23);
      overlayGraphics.fillStyle(0x6c7c8a, 0.8).fillRect(sx + 19, sy + 19, 6, 4);
    }
  }
  for (const bridge of this.generatedWorld.bridges) {
    if (!inView(bridge)) continue;
    const sx = bridge.x * TILE - tileCam.x;
    const sy = bridge.y * TILE - tileCam.y;
    if (bridge.kind === "roadRiverCrossing") {
      this.drawRiverCrossingTile(bridge, sx, sy);
      continue;
    }
    if (this.drawPierDockTile(bridge, sx, sy)) continue;
    const bridgeSy = bridge.orientation === "horizontal" ? sy + HORIZONTAL_BRIDGE_Y_OFFSET : sy;
    const color = bridge.material === "stone" ? 0xa69b86 : 0x9a6a3d;
    overlayGraphics.fillStyle(0x07101d, 0.35).fillRect(sx + 5, bridgeSy + 5, TILE - 10, TILE - 10);
    overlayGraphics.fillStyle(color, 0.95).fillRect(sx + 7, bridgeSy + 12, TILE - 14, 8);
    overlayGraphics.lineStyle(1, 0xffefbd, 0.65).lineBetween(sx + 8, bridgeSy + 16, sx + TILE - 8, bridgeSy + 16);
  }
  for (const overlay of visibleObjectOverlays) {
    const displaySize = TILE * overlay.scale;
    const sx = (overlay.x + (overlay.offsetX ?? 0)) * TILE - tileCam.x + TILE / 2 - displaySize / 2;
    const sy = (overlay.y + (overlay.offsetY ?? 0)) * TILE - tileCam.y + TILE / 2 - displaySize / 2;
    this.drawWorldObjectCell(overlay.objectId, sx, sy, displaySize, displaySize, overlay.alpha ?? 0.92);
  }
  perfRecordObjectOverlay(this, this.generatedWorld.objectOverlays.length, visibleObjectOverlays.length, perfNow() - perfStartMs);
}

export function worldOverlayDrawRank(this: CrystalOathSceneContext, overlay: { id: string }): number {
  if (overlay.id.startsWith("reef-")) return 0;
  if (overlay.id.startsWith("forest-")) return 1;
  if (overlay.id.startsWith("mountain-")) return 2;
  return 3;
}

export function drawSemanticDebugOverlay(this: CrystalOathSceneContext, startX: number, endX: number, startY: number, endY: number, tileCam: Vec) {
  if (!this.generatedWorld || this.semanticDebugOverlay === "off") return;
  const semantic = this.generatedWorld.semantic;
  const debugGraphics = this.worldOverlay;
  const colorForIsland = (id: number) => {
    const colors = [0x000000, 0x5ee38a, 0xf2c86d, 0xaee8ff, 0xd0a1ff, 0xff8fb3, 0xfff08f, 0x8fffd9, 0xc6ff8f, 0xb1b7ff];
    return colors[id % colors.length];
  };
  if (this.semanticDebugOverlay === "edgeDebug") {
    this.drawSemanticEdgeDebugOverlay(semantic, startX, endX, startY, endY, tileCam);
  }
  if (this.semanticDebugOverlay === "masks") {
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const i = y * semantic.width + x;
        let color = semantic.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW ? 0x54c6dc : 0x114c7e;
        if (semantic.layers.landMask[i]) {
          if (semantic.layers.biome[i] === SEMANTIC_BIOME.BEACH) color = 0xf4d88a;
          else if (semantic.layers.biome[i] === SEMANTIC_BIOME.GRASS) color = 0x65c45d;
          else if (semantic.layers.biome[i] === SEMANTIC_BIOME.SAND) color = 0xd2aa5c;
          else if (semantic.layers.biome[i] === SEMANTIC_BIOME.ICE) color = 0xcdf6ff;
        }
        if (semantic.layers.lakeMap[i] || semantic.layers.riverMap[i]) color = 0x3aa8d8;
        debugGraphics.fillStyle(color, 0.4).fillRect(x * TILE - tileCam.x, y * TILE - tileCam.y, TILE, TILE);
      }
    }
  }
  if (this.semanticDebugOverlay === "terrainVariants") {
    const colors = [0x000000, 0xb8f26d, 0x66ccff, 0xff8a43];
    const samplesPerCell = 4;
    const sampleSize = TILE / samplesPerCell;
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const terrainClass = semanticTerrainDebugClassAt(semantic, x, y);
        if (!terrainClass || terrainClass === "road" || terrainClass === "deepOcean" || terrainClass === "shallowWater" || terrainClass === "freshWater") continue;
        for (let sy = 0; sy < samplesPerCell; sy += 1) {
          for (let sx = 0; sx < samplesPerCell; sx += 1) {
            const sampleX = x + (sx + 0.5) / samplesPerCell;
            const sampleY = y + (sy + 0.5) / samplesPerCell;
            const strongest = terrainVariantWeightsAt(semantic, terrainClass, sampleX, sampleY).sort((a, b) => b.weight - a.weight)[0];
            if (!strongest) continue;
            debugGraphics
              .fillStyle(colors[strongest.variantSlot] ?? 0xff4f55, Math.max(0.08, Math.min(0.62, strongest.weight)))
              .fillRect(x * TILE - tileCam.x + sx * sampleSize, y * TILE - tileCam.y + sy * sampleSize, sampleSize, sampleSize);
          }
        }
      }
    }
  }
  if (this.semanticDebugOverlay === "terrainVariantAlpha") {
    const samplesPerCell = 8;
    const sampleSize = TILE / samplesPerCell;
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const terrainClass = semanticTerrainDebugClassAt(semantic, x, y);
        if (!terrainClass || terrainClass === "road" || terrainClass === "deepOcean" || terrainClass === "shallowWater" || terrainClass === "freshWater") continue;
        for (let sy = 0; sy < samplesPerCell; sy += 1) {
          for (let sx = 0; sx < samplesPerCell; sx += 1) {
            const sampleX = x + (sx + 0.5) / samplesPerCell;
            const sampleY = y + (sy + 0.5) / samplesPerCell;
            let strongest: { slot: 1 | 2 | 3; alpha: number } | undefined;
            for (const slot of [1, 2, 3] as const) {
              const alpha = terrainVariantTextureAlphaAt(semantic, terrainClass, slot, sampleX, sampleY);
              if (!strongest || alpha > strongest.alpha) strongest = { slot, alpha };
            }
            if (!strongest || strongest.alpha <= 0.015) continue;
            debugGraphics
              .fillStyle(terrainVariantAlphaDebugColor(terrainClass, strongest.slot), Math.max(0.08, Math.min(0.78, strongest.alpha)))
              .fillRect(x * TILE - tileCam.x + sx * sampleSize, y * TILE - tileCam.y + sy * sampleSize, sampleSize, sampleSize);
          }
        }
      }
    }
  }
  if (this.semanticDebugOverlay === "roadRibbon") {
    const samplesPerCell = 4;
    const sampleSize = TILE / samplesPerCell;
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const i = y * semantic.width + x;
        if (semantic.layers.roadMap[i]) debugGraphics.fillStyle(0x66ffff, 0.08).fillRect(x * TILE - tileCam.x, y * TILE - tileCam.y, TILE, TILE);
        for (let sy = 0; sy < samplesPerCell; sy += 1) {
          for (let sx = 0; sx < samplesPerCell; sx += 1) {
            const sampleX = x + (sx + 0.5) / samplesPerCell;
            const sampleY = y + (sy + 0.5) / samplesPerCell;
            const road = roadRibbonSampleAt(semantic, sampleX, sampleY);
            const px = x * TILE - tileCam.x + sx * sampleSize;
            const py = y * TILE - tileCam.y + sy * sampleSize;
            if (road.shadowAlpha > 0.02) debugGraphics.fillStyle(0xbb6dff, Math.min(0.42, road.shadowAlpha * 1.8)).fillRect(px, py, sampleSize, sampleSize);
            if (road.edgeAlpha > 0.02) debugGraphics.fillStyle(0xff9f35, Math.min(0.58, road.edgeAlpha * 1.7)).fillRect(px, py, sampleSize, sampleSize);
            if (road.bodyAlpha > 0.02) debugGraphics.fillStyle(0xfff2a8, Math.min(0.72, road.bodyAlpha)).fillRect(px, py, sampleSize, sampleSize);
            if (road.centerAlpha > 0.02) debugGraphics.fillStyle(0xffffff, Math.min(0.78, road.centerAlpha)).fillRect(px, py, sampleSize, sampleSize);
            if (road.crossing && (road.bodyAlpha > 0.02 || road.edgeAlpha > 0.02)) debugGraphics.fillStyle(0xbb6dff, 0.58).fillRect(px, py, sampleSize, sampleSize);
          }
        }
      }
    }
    debugGraphics.lineStyle(1, 0x5fffff, 0.62);
    for (const segment of roadRibbonDebugSegments(semantic)) {
      const minX = Math.min(segment.ax, segment.bx);
      const maxX = Math.max(segment.ax, segment.bx);
      const minY = Math.min(segment.ay, segment.by);
      const maxY = Math.max(segment.ay, segment.by);
      if (maxX < startX - 1 || minX > endX + 1 || maxY < startY - 1 || minY > endY + 1) continue;
      debugGraphics.lineBetween(segment.ax * TILE - tileCam.x, segment.ay * TILE - tileCam.y, segment.bx * TILE - tileCam.x, segment.by * TILE - tileCam.y);
    }
  }
  if (this.semanticDebugOverlay === "distance") {
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const i = y * semantic.width + x;
        const distance = semantic.layers.landMask[i] ? semantic.layers.distanceToWater[i] : semantic.layers.distanceToLand[i];
        const alpha = Math.max(0.12, Math.min(0.48, 0.52 - distance * 0.055));
        const color = semantic.layers.landMask[i] ? (distance <= 1 ? 0xffdc86 : 0x68d271) : semantic.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW ? 0x6febff : 0x145087;
        debugGraphics.fillStyle(color, alpha).fillRect(x * TILE - tileCam.x, y * TILE - tileCam.y, TILE, TILE);
        if (distance <= 5) this.text(x * TILE - tileCam.x + TILE / 2, y * TILE - tileCam.y + 9, `${distance}`, 8, "#ffffff", "center");
      }
    }
  }
  if (this.semanticDebugOverlay === "grid") {
    debugGraphics.lineStyle(1, 0xffffff, 0.12);
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) debugGraphics.strokeRect(x * TILE - tileCam.x, y * TILE - tileCam.y, TILE, TILE);
    }
  }
  if (this.semanticDebugOverlay === "walkability") {
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const i = y * semantic.width + x;
        debugGraphics.fillStyle(semantic.layers.walkability[i] ? 0x64ff8a : 0xff405c, 0.28).fillRect(x * TILE - tileCam.x, y * TILE - tileCam.y, TILE, TILE);
      }
    }
  }
  if (this.semanticDebugOverlay === "policy") {
    const policyColors = {
      visualOnly: 0x6fd6ff,
      softTerrain: 0x56e878,
      hardBlock: 0xff375f,
      poiBlock: 0xffca4f
    } as const;
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const i = y * semantic.width + x;
        const policy = semantic.layers.overlayCollisionPolicy[i];
        if (policy === "visualOnly" && !semantic.layers.roadMap[i] && !semantic.layers.riverMap[i]) continue;
        debugGraphics.fillStyle(policyColors[policy], policy === "visualOnly" ? 0.22 : 0.34).fillRect(x * TILE - tileCam.x, y * TILE - tileCam.y, TILE, TILE);
      }
    }
  }
  if (this.semanticDebugOverlay === "mountains") {
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const i = y * semantic.width + x;
        const score = semantic.layers.mountainCandidateScore[i];
        if (score <= 0.58) continue;
        const alpha = Math.min(0.42, Math.max(0.08, (score - 0.58) * 0.7));
        debugGraphics.fillStyle(0xff7b45, alpha).fillRect(x * TILE - tileCam.x, y * TILE - tileCam.y, TILE, TILE);
      }
    }
    for (const range of semantic.mountainRanges) {
      const color = range.kind === "snow_mountain" ? 0xeaffff : 0x4a2414;
      for (const cell of range.cells) {
        if (cell.x < startX || cell.x > endX || cell.y < startY || cell.y > endY) continue;
        const sx = cell.x * TILE - tileCam.x;
        const sy = cell.y * TILE - tileCam.y;
        debugGraphics.fillStyle(color, range.kind === "snow_mountain" ? 0.36 : 0.3).fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        debugGraphics.lineStyle(2, color, 0.82).strokeRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
      }
      const labelX = Math.round((range.bounds.minX + range.bounds.maxX) / 2);
      const labelY = Math.round(range.bounds.minY);
      if (labelX >= startX && labelX <= endX && labelY >= startY && labelY <= endY) {
        this.text(labelX * TILE - tileCam.x + TILE / 2, labelY * TILE - tileCam.y - 6, `${range.cells.length}`, 9, range.kind === "snow_mountain" ? "#eaffff" : "#ffd0a8", "center");
      }
    }
  }
  if (this.semanticDebugOverlay === "forests") {
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const i = y * semantic.width + x;
        if (!semantic.layers.forestMap[i]) continue;
        debugGraphics.fillStyle(0x20df70, 0.32).fillRect(x * TILE - tileCam.x, y * TILE - tileCam.y, TILE, TILE);
        if (!semantic.layers.walkability[i]) debugGraphics.lineStyle(2, 0xff365c, 0.9).strokeRect(x * TILE - tileCam.x + 4, y * TILE - tileCam.y + 4, TILE - 8, TILE - 8);
      }
    }
  }
  if (this.semanticDebugOverlay === "islands") {
    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        const id = semantic.layers.islandId[y * semantic.width + x];
        if (!id) continue;
        debugGraphics.fillStyle(colorForIsland(id), 0.25).fillRect(x * TILE - tileCam.x, y * TILE - tileCam.y, TILE, TILE);
      }
    }
    for (const island of semantic.islands) {
      if (island.center.x < startX || island.center.x > endX || island.center.y < startY || island.center.y > endY) continue;
      this.text(island.center.x * TILE - tileCam.x, island.center.y * TILE - tileCam.y, `${island.id}:${island.theme}`, 9, "#ffffff", "center");
    }
  }
  if (this.semanticDebugOverlay === "pois") {
    for (const poi of this.generatedWorld.pois) {
      const bounds = this.locationFootprintBounds(poi);
      if (bounds.maxX < startX || bounds.minX > endX || bounds.maxY < startY || bounds.minY > endY) continue;
      const sx = bounds.minX * TILE - tileCam.x;
      const sy = bounds.minY * TILE - tileCam.y;
      debugGraphics.lineStyle(2, 0xff4f8f, 0.85).strokeRect(sx, sy, poi.footprint * TILE, poi.footprint * TILE);
      debugGraphics.lineStyle(1, 0xffd36a, 0.5).strokeCircle(poi.x * TILE - tileCam.x + TILE / 2, poi.y * TILE - tileCam.y + TILE / 2, TILE * 1.5);
      this.text(poi.x * TILE - tileCam.x + TILE / 2, poi.y * TILE - tileCam.y - 8, poi.id, 9, "#fff2a8", "center");
    }
  }
  if (this.semanticDebugOverlay === "roads") {
    for (const edge of semantic.roadGraph.edges) {
      if (!edge.connected) continue;
      debugGraphics.lineStyle(3, 0xffb347, 0.8);
      for (let i = 1; i < edge.path.length; i += 1) {
        const from = edge.path[i - 1];
        const to = edge.path[i];
        if ((from.x < startX || from.x > endX || from.y < startY || from.y > endY) && (to.x < startX || to.x > endX || to.y < startY || to.y > endY)) continue;
        debugGraphics.lineBetween(from.x * TILE - tileCam.x + TILE / 2, from.y * TILE - tileCam.y + TILE / 2, to.x * TILE - tileCam.x + TILE / 2, to.y * TILE - tileCam.y + TILE / 2);
      }
      for (const node of [edge.path[0], edge.path[edge.path.length - 1]]) {
        if (!node || node.x < startX || node.x > endX || node.y < startY || node.y > endY) continue;
        debugGraphics.fillStyle(0xffee91, 0.92).fillCircle(node.x * TILE - tileCam.x + TILE / 2, node.y * TILE - tileCam.y + TILE / 2, 4);
      }
    }
  }
  if (this.semanticDebugOverlay === "rivers") {
    for (const river of semantic.rivers) {
      debugGraphics.lineStyle(4, 0x43d8ff, 0.88);
      for (let i = 1; i < river.path.length; i += 1) {
        const from = river.path[i - 1];
        const to = river.path[i];
        if ((from.x < startX || from.x > endX || from.y < startY || from.y > endY) && (to.x < startX || to.x > endX || to.y < startY || to.y > endY)) continue;
        debugGraphics.lineBetween(from.x * TILE - tileCam.x + TILE / 2, from.y * TILE - tileCam.y + TILE / 2, to.x * TILE - tileCam.x + TILE / 2, to.y * TILE - tileCam.y + TILE / 2);
      }
      if (river.source.x >= startX && river.source.x <= endX && river.source.y >= startY && river.source.y <= endY) {
        debugGraphics.fillStyle(0xc0f9ff, 0.95).fillCircle(river.source.x * TILE - tileCam.x + TILE / 2, river.source.y * TILE - tileCam.y + TILE / 2, 5);
      }
      if (river.mouth.x >= startX && river.mouth.x <= endX && river.mouth.y >= startY && river.mouth.y <= endY) {
        debugGraphics.fillStyle(0x2367ff, 0.95).fillCircle(river.mouth.x * TILE - tileCam.x + TILE / 2, river.mouth.y * TILE - tileCam.y + TILE / 2, 5);
      }
    }
  }
}

function semanticTerrainDebugClassAt(semantic: GeneratedWorld["semantic"], x: number, y: number): SemanticMaskTerrainClass | undefined {
  if (x < 0 || y < 0 || x >= semantic.width || y >= semantic.height) return undefined;
  const i = y * semantic.width + x;
  if (semantic.layers.roadMap[i]) return "road";
  if (semantic.layers.riverMap[i] || semantic.layers.lakeMap[i]) return "freshWater";
  if (!semantic.layers.landMask[i]) return semantic.layers.waterClass[i] === SEMANTIC_WATER.SHALLOW ? "shallowWater" : "deepOcean";
  if (semantic.layers.biome[i] === SEMANTIC_BIOME.BEACH) return "beach";
  if (semantic.layers.biome[i] === SEMANTIC_BIOME.ICE) return "ice";
  if (semantic.layers.biome[i] === SEMANTIC_BIOME.SAND) return semantic.islandIndexToId.get(semantic.layers.islandId[i]) === "ashfall" ? "ash" : "sand";
  return "grassland";
}

function terrainVariantAlphaDebugColor(terrainClass: SemanticMaskTerrainClass, variantSlot: 1 | 2 | 3): number {
  if (terrainClass === "ash") {
    if (variantSlot === 3) return 0xff7a2f;
    if (variantSlot === 2) return 0x9b6141;
    return 0x8c8298;
  }
  if (terrainClass === "ice") return variantSlot === 3 ? 0x7e8791 : 0xbdf6ff;
  if (terrainClass === "sand" || terrainClass === "beach") return variantSlot === 3 ? 0x9b6b45 : 0xffdd91;
  return variantSlot === 2 ? 0x7d8c6e : 0x8cf26a;
}

export function drawSemanticEdgeDebugOverlay(this: CrystalOathSceneContext, semantic: GeneratedWorld["semantic"], startX: number, endX: number, startY: number, endY: number, tileCam: Vec) {
  const directions = [
    { side: "e" as const, dx: 1, dy: 0 },
    { side: "s" as const, dx: 0, dy: 1 }
  ];
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const i = y * semantic.width + x;
      for (const direction of directions) {
        const nx = x + direction.dx;
        const ny = y + direction.dy;
        if (nx < 0 || ny < 0 || nx >= semantic.width || ny >= semantic.height) continue;
        const color = this.semanticEdgeDebugColor(semantic, i, ny * semantic.width + nx);
        if (color === undefined) continue;
        this.drawSemanticEdgeDebugStrip(x, y, direction.side, color, tileCam);
      }
    }
  }
}

export function semanticEdgeDebugColor(this: CrystalOathSceneContext, semantic: GeneratedWorld["semantic"], a: number, b: number): number | undefined {
  const landA = semantic.layers.landMask[a] === 1;
  const landB = semantic.layers.landMask[b] === 1;
  if (landA !== landB) {
    const landBiome = landA ? semantic.layers.biome[a] : semantic.layers.biome[b];
    return this.isSandLikeSemanticBiome(landBiome) ? 0x4eefff : undefined;
  }
  if (!landA || !landB) return undefined;
  const biomeA = semantic.layers.biome[a];
  const biomeB = semantic.layers.biome[b];
  if (biomeA === biomeB) return undefined;
  const sandGrass = (this.isSandLikeSemanticBiome(biomeA) && biomeB === SEMANTIC_BIOME.GRASS) || (this.isSandLikeSemanticBiome(biomeB) && biomeA === SEMANTIC_BIOME.GRASS);
  if (sandGrass) return 0xff4fff;
  const sandIce = (this.isSandLikeSemanticBiome(biomeA) && biomeB === SEMANTIC_BIOME.ICE) || (this.isSandLikeSemanticBiome(biomeB) && biomeA === SEMANTIC_BIOME.ICE);
  if (sandIce) return 0xffffff;
  const grassIce = (biomeA === SEMANTIC_BIOME.GRASS && biomeB === SEMANTIC_BIOME.ICE) || (biomeB === SEMANTIC_BIOME.GRASS && biomeA === SEMANTIC_BIOME.ICE);
  if (grassIce) return 0x5ea7ff;
  return undefined;
}

export function isSandLikeSemanticBiome(this: CrystalOathSceneContext, value: number): boolean {
  return value === SEMANTIC_BIOME.BEACH || value === SEMANTIC_BIOME.SAND;
}

export function drawSemanticEdgeDebugStrip(this: CrystalOathSceneContext, x: number, y: number, side: "e" | "s", color: number, tileCam: Vec) {
  const width = 4;
  const sx = x * TILE - tileCam.x;
  const sy = y * TILE - tileCam.y;
  this.worldOverlay.fillStyle(color, 0.78);
  if (side === "e") this.worldOverlay.fillRect(sx + TILE - width, sy, width, TILE);
  else this.worldOverlay.fillRect(sx, sy + TILE - width, TILE, width);
}

export function drawWorldObjectCell(this: CrystalOathSceneContext, objectId: WorldObjectId | undefined, sx: number, sy: number, width: number, height: number, alpha = 1): boolean {
  const textureKey = worldCurrentObjectTextureKey(objectId);
  if (!textureKey || !this.hasTexture(textureKey)) return false;
  const asset = worldCurrentAssetByTextureKey(textureKey);
  const anchorX = asset?.anchorX ?? 0.5;
  const anchorY = asset?.anchorY ?? 0.92;
  const anchoredX = sx + width / 2 - width * anchorX;
  const anchoredY = sy + height - height * anchorY;
  this.drawTexture(textureKey, anchoredX, anchoredY, width, height, LAYER_OBJECT_IMAGE, alpha);
  return true;
}

export function drawPierDockTile(this: CrystalOathSceneContext, bridge: { orientation: "horizontal" | "vertical"; material: "wood" | "stone" | "ford" }, sx: number, sy: number): boolean {
  const textureKey =
    bridge.material === "stone"
      ? bridge.orientation === "vertical"
        ? WORLD_CURRENT_ROUTE_TEXTURE_KEYS.bridgeVertical
        : WORLD_CURRENT_ROUTE_TEXTURE_KEYS.bridgeHorizontal
      : bridge.orientation === "vertical"
        ? WORLD_CURRENT_ROUTE_TEXTURE_KEYS.dockVertical
        : WORLD_CURRENT_ROUTE_TEXTURE_KEYS.dockHorizontal;
  if (!textureKey || textureKey === "procedural_styled_stroke" || !this.hasTexture(textureKey)) return false;
  const y = bridge.orientation === "horizontal" ? sy + HORIZONTAL_BRIDGE_Y_OFFSET : sy;
  this.drawTexture(textureKey, sx, y, TILE, TILE, LAYER_OBJECT_IMAGE);
  return true;
}

export function drawRiverCrossingTile(this: CrystalOathSceneContext, bridge: { orientation: "horizontal" | "vertical"; material: "wood" | "stone" | "ford" }, sx: number, sy: number) {
  const g = this.worldOverlay;
  const horizontal = bridge.orientation === "horizontal";
  const shadow = bridge.material === "ford" ? 0x5b6f72 : 0x4b2f21;
  const deck = bridge.material === "ford" ? 0xb9a070 : 0xa86f3f;
  const highlight = bridge.material === "ford" ? 0xe4d49a : 0xe1b26f;
  const edge = bridge.material === "ford" ? 0x736441 : 0x6d452b;
  if (horizontal) {
    const y = sy + HORIZONTAL_BRIDGE_Y_OFFSET;
    g.fillStyle(shadow, 0.48).fillRect(sx - 2, y + 12, TILE + 4, 10);
    g.fillStyle(deck, 0.96).fillRect(sx - 1, y + 13, TILE + 2, 7);
    g.fillStyle(edge, 0.84).fillRect(sx - 1, y + 12, TILE + 2, 1).fillRect(sx - 1, y + 20, TILE + 2, 1);
    for (let x = sx + 4; x < sx + TILE; x += 7) g.lineStyle(1, highlight, 0.62).lineBetween(x, y + 13, x - 2, y + 20);
  } else {
    g.fillStyle(shadow, 0.48).fillRect(sx + 12, sy - 2, 10, TILE + 4);
    g.fillStyle(deck, 0.96).fillRect(sx + 13, sy - 1, 7, TILE + 2);
    g.fillStyle(edge, 0.84).fillRect(sx + 12, sy - 1, 1, TILE + 2).fillRect(sx + 20, sy - 1, 1, TILE + 2);
    for (let y = sy + 4; y < sy + TILE; y += 7) g.lineStyle(1, highlight, 0.62).lineBetween(sx + 13, y, sx + 20, y - 2);
  }
}

export function rebuildWorldTerrainCache(this: CrystalOathSceneContext) {
  const perfStartMs = perfNow();
  this.worldTerrainCacheSeed = "";
  if (!this.generatedWorld || !this.world.length) return;
  this.assertCurrentWorldAssetTextures();
  if (this.textures.exists(this.worldTerrainCacheKey)) this.textures.remove(this.worldTerrainCacheKey);
  for (const chunk of this.worldTerrainChunkCache.values()) {
    if (this.textures.exists(chunk.textureKey)) this.textures.remove(chunk.textureKey);
  }
  this.worldTerrainChunkCache.clear();
  this.worldTerrainChunkCacheTick = 0;
  this.worldTerrainCacheSeed = this.worldSeed;
  if (import.meta.env.DEV) {
    console.info(`Semantic mask terrain cache will render lazily in ${SEMANTIC_TERRAIN_CHUNK_TILES}x${SEMANTIC_TERRAIN_CHUNK_TILES} tile chunks; raw square tiles remain debug-only.`);
  }
  perfRecordTextureCache(this, perfNow() - perfStartMs);
}

export function currentSemanticTerrainSources(this: CrystalOathSceneContext): SemanticMaskTerrainSources {
  const sources: SemanticMaskTerrainSources = {};
  for (const terrainClass of Object.keys(WORLD_CURRENT_TERRAIN_TEXTURE_KEYS) as SemanticMaskTerrainClass[]) {
    const textureKey = WORLD_CURRENT_TERRAIN_TEXTURE_KEYS[terrainClass];
    if (!this.textures.exists(textureKey)) continue;
    sources[terrainClass] = this.textures.get(textureKey).getSourceImage() as CanvasImageSource & { width: number; height: number };
  }
  return sources;
}

export function currentSemanticTerrainVariantSources(this: CrystalOathSceneContext): SemanticMaskTerrainVariantSources {
  const sources: SemanticMaskTerrainVariantSources = {};
  for (const [terrainClass, textureKeys] of Object.entries(WORLD_CURRENT_TERRAIN_VARIANT_TEXTURE_KEYS) as [SemanticMaskTerrainClass, string[]][]) {
    const loadedSources = textureKeys
      .filter((textureKey) => this.textures.exists(textureKey))
      .map((textureKey) => this.textures.get(textureKey).getSourceImage() as CanvasImageSource & { width: number; height: number });
    if (loadedSources.length > 0) sources[terrainClass] = loadedSources;
  }
  return sources;
}

export function assertCurrentWorldAssetTextures(this: CrystalOathSceneContext) {
  if (this.currentWorldAssetsValidated) return;
  for (const [terrainClass, textureKey] of Object.entries(WORLD_CURRENT_TERRAIN_TEXTURE_KEYS) as [SemanticMaskTerrainClass, string][]) {
    if (!this.textures.exists(textureKey)) {
      throw new Error(`Current world terrain asset for ${terrainClass} is not loaded: ${textureKey}.`);
    }
    const source = this.textures.get(textureKey).getSourceImage() as { width: number; height: number };
    if (source.width !== 256 || source.height !== 256) {
      throw new Error(`Current world terrain asset ${textureKey} must be 256x256; got ${source.width}x${source.height}.`);
    }
  }
  for (const [terrainClass, textureKeys] of Object.entries(WORLD_CURRENT_TERRAIN_VARIANT_TEXTURE_KEYS) as [SemanticMaskTerrainClass, string[]][]) {
    for (const textureKey of textureKeys) {
      if (!this.textures.exists(textureKey)) continue;
      const source = this.textures.get(textureKey).getSourceImage() as { width: number; height: number };
      if (source.width !== 256 || source.height !== 256) {
        throw new Error(`Current world terrain variant asset ${textureKey} for ${terrainClass} must be 256x256; got ${source.width}x${source.height}.`);
      }
    }
  }
  this.currentWorldAssetsValidated = true;
}

export function rebuildWorldRouteOverlayCache(this: CrystalOathSceneContext) {
  this.worldRouteOverlayCacheSeed = "";
  if (!this.generatedWorld || !this.world.length) return;
  if (this.routeOverlayMode === "hidden" && this.riverOverlayMode === "hidden") return;
  createSemanticRouteOverlayTexture(this, this.generatedWorld.semantic, {
    tileSize: TILE,
    textureKey: this.worldRouteOverlayCacheKey,
    routeOverlayMode: this.routeOverlayMode,
    riverOverlayMode: this.riverOverlayMode
  });
  this.textures.get(this.worldRouteOverlayCacheKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
  this.worldRouteOverlayCacheSeed = this.worldSeed;
  if (import.meta.env.DEV) {
    console.info(`Semantic route overlay cache rendered for diagnostics; roads and river bodies are in the terrain mask.`);
  }
}

export function drawCachedWorldTerrain(this: CrystalOathSceneContext, tileCam: Vec): boolean {
  if (!this.generatedWorld || this.worldTerrainCacheSeed !== this.worldSeed) return false;
  const bounds = worldTerrainChunkBoundsForCamera.call(this, tileCam, 0);
  if (!bounds) return false;

  for (let chunkY = bounds.firstChunkY; chunkY <= bounds.lastChunkY; chunkY += 1) {
    for (let chunkX = bounds.firstChunkX; chunkX <= bounds.lastChunkX; chunkX += 1) {
      const chunk = this.getOrCreateWorldTerrainChunk(chunkX, chunkY);
      if (!chunk) continue;
      const image = this.add.image(
        (chunk.chunkX * TILE - tileCam.x) * PIXEL_ART_SCALE,
        (chunk.chunkY * TILE - tileCam.y) * PIXEL_ART_SCALE,
        chunk.textureKey,
        chunk.frameKey
      );
      image.setOrigin(0, 0);
      image.setDisplaySize(chunk.chunkWidth * TILE * PIXEL_ART_SCALE, chunk.chunkHeight * TILE * PIXEL_ART_SCALE);
      image.setDepth(LAYER_WORLD_IMAGE);
      image.setScrollFactor(0);
      this.images.push(image);
    }
  }
  this.prewarmWorldTerrainChunksAroundCamera(tileCam, 1, 1);
  this.evictWorldTerrainChunks();
  if (DEBUG_WORLD_LAYOUT) {
    console.debug(`[world-terrain-cache] chunked chunks=${bounds.firstChunkX},${bounds.firstChunkY}..${bounds.lastChunkX},${bounds.lastChunkY}`);
  }
  return true;
}

export function prewarmWorldTerrainChunksForCurrentView(this: CrystalOathSceneContext, ring = 1, maxCreated = Number.POSITIVE_INFINITY): number {
  if (!this.generatedWorld || this.worldTerrainCacheSeed !== this.worldSeed) return 0;
  const focusPos = this.boatTravel?.boatPos ?? this.visualExplorePos("world");
  const cam = this.cameraFor(focusPos, this.generatedWorld.width, this.generatedWorld.height);
  return this.prewarmWorldTerrainChunksAroundCamera({ x: Math.round(cam.x), y: Math.round(cam.y) }, ring, maxCreated);
}

export function prewarmWorldTerrainChunksAroundCamera(this: CrystalOathSceneContext, tileCam: Vec, ring = 1, maxCreated = Number.POSITIVE_INFINITY): number {
  if (!this.generatedWorld || this.worldTerrainCacheSeed !== this.worldSeed) return 0;
  const bounds = worldTerrainChunkBoundsForCamera.call(this, tileCam, ring);
  if (!bounds) return 0;
  let created = 0;
  for (let chunkY = bounds.firstChunkY; chunkY <= bounds.lastChunkY; chunkY += 1) {
    for (let chunkX = bounds.firstChunkX; chunkX <= bounds.lastChunkX; chunkX += 1) {
      const cacheKey = `${chunkX},${chunkY}`;
      const cached = this.worldTerrainChunkCache.get(cacheKey);
      if (cached && this.textures.exists(cached.textureKey)) continue;
      if (!this.getOrCreateWorldTerrainChunk(chunkX, chunkY)) continue;
      created += 1;
      if (created >= maxCreated) {
        this.evictWorldTerrainChunks();
        return created;
      }
    }
  }
  if (created > 0) this.evictWorldTerrainChunks();
  return created;
}

function worldTerrainChunkBoundsForCamera(
  this: CrystalOathSceneContext,
  tileCam: Vec,
  ring: number
): { firstChunkX: number; lastChunkX: number; firstChunkY: number; lastChunkY: number } | undefined {
  if (!this.generatedWorld) return undefined;
  const mapWidth = (this.world[0]?.length ?? 0) * TILE;
  const mapHeight = this.world.length * TILE;
  const cropX = Math.round(Phaser.Math.Clamp(tileCam.x, 0, Math.max(0, mapWidth - WIDTH)));
  const cropY = Math.round(Phaser.Math.Clamp(tileCam.y, 0, Math.max(0, mapHeight - HEIGHT)));
  const cropWidth = Math.min(WIDTH, mapWidth - cropX);
  const cropHeight = Math.min(HEIGHT, mapHeight - cropY);
  if (cropWidth <= 0 || cropHeight <= 0) return undefined;
  const chunkPixels = SEMANTIC_TERRAIN_CHUNK_TILES * TILE;
  const maxChunkX = Math.max(0, Math.ceil(this.generatedWorld.width / SEMANTIC_TERRAIN_CHUNK_TILES) - 1);
  const maxChunkY = Math.max(0, Math.ceil(this.generatedWorld.height / SEMANTIC_TERRAIN_CHUNK_TILES) - 1);
  return {
    firstChunkX: Math.max(0, Math.floor(cropX / chunkPixels) - ring),
    lastChunkX: Math.min(maxChunkX, Math.floor((cropX + cropWidth - 1) / chunkPixels) + ring),
    firstChunkY: Math.max(0, Math.floor(cropY / chunkPixels) - ring),
    lastChunkY: Math.min(maxChunkY, Math.floor((cropY + cropHeight - 1) / chunkPixels) + ring)
  };
}

export function getOrCreateWorldTerrainChunk(this: CrystalOathSceneContext, chunkColumn: number, chunkRow: number) {
  if (!this.generatedWorld) return undefined;
  const world = this.generatedWorld.semantic;
  const chunkX = chunkColumn * SEMANTIC_TERRAIN_CHUNK_TILES;
  const chunkY = chunkRow * SEMANTIC_TERRAIN_CHUNK_TILES;
  if (chunkX < 0 || chunkY < 0 || chunkX >= world.width || chunkY >= world.height) return undefined;
  const chunkWidth = Math.min(SEMANTIC_TERRAIN_CHUNK_TILES, world.width - chunkX);
  const chunkHeight = Math.min(SEMANTIC_TERRAIN_CHUNK_TILES, world.height - chunkY);
  const cacheKey = `${chunkColumn},${chunkRow}`;
  const cached = this.worldTerrainChunkCache.get(cacheKey);
  if (cached && this.textures.exists(cached.textureKey)) {
    cached.lastUsed = ++this.worldTerrainChunkCacheTick;
    perfRecordChunkHit(this);
    return cached;
  }

  const perfStartMs = perfNow();
  const areaX = Math.max(0, chunkX - SEMANTIC_TERRAIN_CHUNK_PADDING_TILES);
  const areaY = Math.max(0, chunkY - SEMANTIC_TERRAIN_CHUNK_PADDING_TILES);
  const areaMaxX = Math.min(world.width, chunkX + chunkWidth + SEMANTIC_TERRAIN_CHUNK_PADDING_TILES);
  const areaMaxY = Math.min(world.height, chunkY + chunkHeight + SEMANTIC_TERRAIN_CHUNK_PADDING_TILES);
  const textureKey = `${this.worldTerrainCacheKey}_${chunkColumn}_${chunkRow}`;
  const frameKey = "content";
  createSemanticMaskTerrainTexture(this, world, {
    tileSize: TILE,
    maskPixelsPerCell: SEMANTIC_TERRAIN_CHUNK_MASK_PIXELS_PER_CELL,
    collectStats: false,
    textureKey,
    terrainSources: this.currentSemanticTerrainSources(),
    terrainSourceLabels: WORLD_CURRENT_TERRAIN_TEXTURE_KEYS,
    terrainVariantSources: this.currentSemanticTerrainVariantSources(),
    terrainVariantSourceLabels: WORLD_CURRENT_TERRAIN_VARIANT_TEXTURE_KEYS,
    renderArea: { x: areaX, y: areaY, width: areaMaxX - areaX, height: areaMaxY - areaY }
  });
  const texture = this.textures.get(textureKey);
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  const frameX = (chunkX - areaX) * TILE;
  const frameY = (chunkY - areaY) * TILE;
  if (texture.has(frameKey)) texture.remove(frameKey);
  texture.add(frameKey, 0, frameX, frameY, chunkWidth * TILE, chunkHeight * TILE);
  const chunk = { textureKey, frameKey, chunkX, chunkY, chunkWidth, chunkHeight, lastUsed: ++this.worldTerrainChunkCacheTick };
  this.worldTerrainChunkCache.set(cacheKey, chunk);
  perfRecordChunkCreate(this, cacheKey, perfNow() - perfStartMs);
  return chunk;
}

export function evictWorldTerrainChunks(this: CrystalOathSceneContext) {
  if (this.worldTerrainChunkCache.size <= SEMANTIC_TERRAIN_MAX_CACHED_CHUNKS) return;
  const evictable = [...this.worldTerrainChunkCache.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
  const chunksToEvict = evictable.slice(0, this.worldTerrainChunkCache.size - SEMANTIC_TERRAIN_MAX_CACHED_CHUNKS);
  for (const [key, chunk] of chunksToEvict) {
    if (this.textures.exists(chunk.textureKey)) this.textures.remove(chunk.textureKey);
    this.worldTerrainChunkCache.delete(key);
  }
  perfRecordChunkEvictions(this, chunksToEvict.length);
}

export function drawCachedWorldRouteOverlay(this: CrystalOathSceneContext, tileCam: Vec): boolean {
  if (this.worldRouteOverlayCacheSeed !== this.worldSeed || !this.textures.exists(this.worldRouteOverlayCacheKey)) return false;
  const mapWidth = (this.world[0]?.length ?? 0) * TILE;
  const mapHeight = this.world.length * TILE;
  const cropX = Math.round(Phaser.Math.Clamp(tileCam.x, 0, Math.max(0, mapWidth - WIDTH)));
  const cropY = Math.round(Phaser.Math.Clamp(tileCam.y, 0, Math.max(0, mapHeight - HEIGHT)));
  const cropWidth = Math.min(WIDTH, mapWidth - cropX);
  const cropHeight = Math.min(HEIGHT, mapHeight - cropY);
  if (cropWidth <= 0 || cropHeight <= 0) return false;

  const viewFrameKey = `${this.worldRouteOverlayCacheKey}_view`;
  const texture = this.textures.get(this.worldRouteOverlayCacheKey);
  if (texture.has(viewFrameKey)) texture.remove(viewFrameKey);
  texture.add(viewFrameKey, 0, cropX, cropY, cropWidth, cropHeight);

  const image = this.add.image(0, 0, this.worldRouteOverlayCacheKey, viewFrameKey);
  image.setOrigin(0, 0);
  image.setDisplaySize(cropWidth * PIXEL_ART_SCALE, cropHeight * PIXEL_ART_SCALE);
  image.setDepth(LAYER_WORLD_IMAGE + 0.35);
  image.setScrollFactor(0);
  this.images.push(image);
  return true;
}
