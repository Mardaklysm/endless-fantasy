import { HEIGHT, LAYER_WORLD_IMAGE, WIDTH } from "../../app/config";
import type { PoiMetadata, PoiRectZone } from "../../data/poiMetadata";
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
  const drawRect = (zone: PoiRectZone, color: number, alpha: number) => {
    this.worldOverlay.fillStyle(color, alpha).fillRect(
      layout.x + zone.x * layout.scale,
      layout.y + zone.y * layout.scale,
      zone.width * layout.scale,
      zone.height * layout.scale
    );
    this.worldOverlay.lineStyle(1, color, Math.min(1, alpha + 0.32)).strokeRect(
      layout.x + zone.x * layout.scale,
      layout.y + zone.y * layout.scale,
      zone.width * layout.scale,
      zone.height * layout.scale
    );
  };

  for (const zone of poi.collision.walkableZones) drawRect(zone, 0x67e78c, 0.14);
  for (const zone of poi.collision.solidZones) drawRect(zone, 0xff405c, 0.24);
  for (const exit of poi.exits) drawRect(exit, 0xffd166, 0.3);
  for (const interaction of poi.interactions) {
    if (interaction.shape.kind === "circle") {
      const point = poiLocalToScreen(layout, interaction.shape);
      this.worldOverlay.lineStyle(2, 0x66d9ff, 0.78).strokeCircle(point.x, point.y, interaction.shape.radius * layout.scale);
      this.worldOverlay.fillStyle(0x66d9ff, 0.85).fillCircle(point.x, point.y, 3);
      this.text(point.x, point.y - 18, interaction.id, 8, "#d8f7ff", "center", { strokeThickness: 1 });
    } else {
      drawRect(
        {
          id: interaction.id,
          x: interaction.shape.x,
          y: interaction.shape.y,
          width: interaction.shape.width,
          height: interaction.shape.height
        },
        0x66d9ff,
        0.24
      );
    }
  }
  const pos = this.visualExplorePos("poi");
  const screen = this.poiToScreen(pos);
  this.worldOverlay.lineStyle(1, 0xffffff, 0.9).strokeCircle(screen.x, screen.y, 5);
  this.text(12, HEIGHT - 58, `POI ${Math.round(pos.x)},${Math.round(pos.y)} | ${poi.id}`, 8, "#ffffff", "left", {
    wordWrapWidth: 360,
    strokeThickness: 1
  });
}

function poiLocalToScreen(layout: { x: number; y: number; scale: number }, point: Vec): Vec {
  return {
    x: layout.x + point.x * layout.scale,
    y: layout.y + point.y * layout.scale
  };
}
