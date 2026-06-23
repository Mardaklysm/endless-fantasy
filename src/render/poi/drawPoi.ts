import { HEIGHT, LAYER_WORLD_IMAGE, WIDTH } from "../../app/config";
import type { PoiMetadata, PoiRectShape, PoiShape } from "../../data/poiMetadata";
import type { Vec } from "../../scene/sceneTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function drawPoiVisit(this: CrystalOathSceneContext) {
  const poi = this.currentPoi();
  if (!poi) {
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    this.text(WIDTH / 2, HEIGHT / 2 - 12, "Missing POI metadata", 22, "#fff2a8", "center");
    return;
  }

  const layout = this.poiRenderLayout(poi);
  this.g.fillStyle(0x000000, 1).fillRect(0, 0, WIDTH, HEIGHT);
  if (this.hasTexture(poi.background.key)) {
    this.drawTexture(poi.background.key, layout.x, layout.y, layout.width, layout.height, LAYER_WORLD_IMAGE);
  } else {
    this.g.fillStyle(0x1f2b18, 1).fillRect(layout.x, layout.y, layout.width, layout.height);
    this.text(WIDTH / 2, HEIGHT / 2 - 12, `Missing asset: ${poi.background.key}`, 18, "#fff2a8", "center");
  }

  if (this.semanticDebugOverlay === "pois") this.drawPoiDebugOverlay(poi);

  const player = this.poiToScreen(this.visualExplorePos("poi"));
  this.drawLeader(player.x - 12, player.y - 13);
  this.drawPoiHud(poi);
  const interaction = this.activePoiInteraction();
  if (interaction) this.drawPrompt(`${interaction.prompt}  Enter`);
}

export function drawPoiHud(this: CrystalOathSceneContext, poi: PoiMetadata) {
  this.drawCompactHudPanel(10, 8, 214, 34, 0.74);
  this.text(18, 13, poi.displayName, 10, "#fff0a6", "left", { wordWrapWidth: 162, strokeThickness: 1 });
  this.text(18, 26, `Gold ${this.gold} | Relics ${this.relicCount()}/4`, 8, "#dfe9ff", "left", {
    wordWrapWidth: 190,
    strokeThickness: 1
  });
}

export function drawPoiDebugOverlay(this: CrystalOathSceneContext, poi: PoiMetadata) {
  const layout = this.poiRenderLayout(poi);
  for (const zone of poi.walkableZones) drawShape.call(this, layout, zone.shape, 0x67e78c, 0.14);
  for (const zone of poi.blockedZones) drawShape.call(this, layout, zone.shape, 0xff405c, 0.24);
  for (const event of poi.eventZones) {
    const color = event.activation === "confirm" ? 0xffd166 : 0x66d9ff;
    drawShape.call(this, layout, event.shape, color, event.activation === "confirm" ? 0.3 : 0.24);
    const labelPos = shapeLabelPoint(event.shape);
    const point = poiLocalToScreen(layout, labelPos);
    this.text(point.x, point.y - 8, event.id, 8, event.activation === "confirm" ? "#fff0a6" : "#d8f7ff", "center", { strokeThickness: 1 });
  }
  const pos = this.visualExplorePos("poi");
  const screen = this.poiToScreen(pos);
  this.worldOverlay.lineStyle(1, 0xffffff, 0.9).strokeCircle(screen.x, screen.y, 5);
  this.text(12, HEIGHT - 58, `POI ${Math.round(pos.x)},${Math.round(pos.y)} | ${poi.id}`, 8, "#ffffff", "left", {
    wordWrapWidth: 360,
    strokeThickness: 1
  });
}

function drawShape(this: CrystalOathSceneContext, layout: { x: number; y: number; scale: number }, shape: PoiShape, color: number, alpha: number) {
  if (shape.type === "rect") {
    this.worldOverlay.fillStyle(color, alpha).fillRect(
      layout.x + shape.x * layout.scale,
      layout.y + shape.y * layout.scale,
      shape.width * layout.scale,
      shape.height * layout.scale
    );
    this.worldOverlay.lineStyle(1, color, Math.min(1, alpha + 0.32)).strokeRect(
      layout.x + shape.x * layout.scale,
      layout.y + shape.y * layout.scale,
      shape.width * layout.scale,
      shape.height * layout.scale
    );
    return;
  }
  if (shape.type === "circle") {
    const point = poiLocalToScreen(layout, shape);
    this.worldOverlay.lineStyle(2, color, Math.min(1, alpha + 0.46)).strokeCircle(point.x, point.y, shape.radius * layout.scale);
    this.worldOverlay.fillStyle(color, Math.min(0.4, alpha)).fillCircle(point.x, point.y, shape.radius * layout.scale);
    return;
  }
  if (shape.points.length === 0) return;
  const first = poiLocalToScreen(layout, shape.points[0]);
  this.worldOverlay.fillStyle(color, alpha);
  this.worldOverlay.beginPath();
  this.worldOverlay.moveTo(first.x, first.y);
  for (const point of shape.points.slice(1)) {
    const screenPoint = poiLocalToScreen(layout, point);
    this.worldOverlay.lineTo(screenPoint.x, screenPoint.y);
  }
  this.worldOverlay.closePath().fillPath();
  this.worldOverlay.lineStyle(1, color, Math.min(1, alpha + 0.32)).strokePath();
}

function shapeLabelPoint(shape: PoiShape): Vec {
  if (shape.type === "circle") return { x: shape.x, y: shape.y };
  if (shape.type === "rect") return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
  const total = shape.points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  return { x: total.x / shape.points.length, y: total.y / shape.points.length };
}

function poiLocalToScreen(layout: { x: number; y: number; scale: number }, point: Vec): Vec {
  return {
    x: layout.x + point.x * layout.scale,
    y: layout.y + point.y * layout.scale
  };
}
