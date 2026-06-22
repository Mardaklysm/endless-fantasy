import {
  HEIGHT,
  LAYER_OBJECT_IMAGE,
  LAYER_WORLD_IMAGE,
  TILE,
  WIDTH
} from "../../app/config";
import {
  TOWN_ATLAS_FLOOR_TILES,
  TOWN_ATLAS_WALL_TILES,
  TOWN_PROP_TEXTURES,
  TOWN_SERVICE_TEXTURES,
  TOWN_SHOP_PAD_TILES
} from "../../assets/textureKeys";
import type { ServiceKind, TownServiceDef } from "../../data/gameDataTypes";
import { TOWN_SERVICES } from "../../data/towns";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function drawTownFloorTile(this: CrystalOathSceneContext, px: number, py: number, x: number, y: number) {
  const atlasTile = this.pickWeightedDungeonAtlasTile(TOWN_ATLAS_FLOOR_TILES, this.dungeonTileHash("town-floor", x, y, 0));
  if (this.drawDungeonAtlasTile(atlasTile, px, py)) return;
  if (this.drawTileTexture("town_floor", px, py)) return;
  const base = (x + y) % 2 === 0 ? 0x40506c : 0x384762;
  this.g.fillStyle(base, 1).fillRect(px, py, TILE, TILE);
  this.g.lineStyle(1, 0x263149, 0.55).strokeRect(px, py, TILE, TILE);
  if ((x * 3 + y * 5) % 4 === 0) this.g.fillStyle(0x6f7f9f, 0.18).fillRect(px + 5, py + 6, 5, 4);
  if ((x + y * 2) % 5 === 0) this.g.fillStyle(0x1f2a3e, 0.22).fillRect(px + 22, py + 19, 4, 5);
}

export function drawTownWallTile(this: CrystalOathSceneContext, px: number, py: number, x: number, y: number) {
  const atlasTile = this.pickWeightedDungeonAtlasTile(TOWN_ATLAS_WALL_TILES, this.dungeonTileHash("town-wall", x, y, 1));
  if (this.drawDungeonAtlasTile(atlasTile, px, py)) return;
  if (this.drawTileTexture("town_wall", px, py)) return;
  this.g.fillStyle(0x536b94, 1).fillRect(px, py, TILE, TILE);
  this.g.fillStyle(0x344762, 1).fillRect(px, py + TILE - 7, TILE, 7);
  this.g.lineStyle(1, 0x243247, 0.8).strokeRect(px, py, TILE, TILE);
  const brickOffset = (x + y) % 2 === 0 ? 0 : 9;
  this.g.fillStyle(0x6f86ae, 0.32).fillRect(px + 4 + brickOffset, py + 7, 13, 4);
  this.g.fillStyle(0x293850, 0.45).fillRect(px + 2, py + 22, TILE - 4, 2);
}

export function drawTownRug(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number, color: number) {
  if (this.hasTexture(TOWN_PROP_TEXTURES.rug)) {
    this.drawTexture(TOWN_PROP_TEXTURES.rug, x, y, w, h + 8, LAYER_OBJECT_IMAGE);
    return;
  }
  this.g.fillStyle(0x172033, 0.4).fillRect(x + 4, y + 5, w, h);
  this.g.fillStyle(color, 1).fillRect(x, y, w, h);
  this.g.fillStyle(0xf4d58f, 0.75).fillRect(x + 8, y + 7, w - 16, 4);
  this.g.fillStyle(0x14213a, 0.28).fillRect(x + 10, y + 15, w - 20, h - 30);
  this.g.lineStyle(2, 0xffefbd, 0.8).strokeRect(x + 4, y + 4, w - 8, h - 8);
}

export function drawTownLamp(this: CrystalOathSceneContext, x: number, y: number) {
  if (this.hasTexture(TOWN_PROP_TEXTURES.lamp)) {
    this.drawTexture(TOWN_PROP_TEXTURES.lamp, x - 2, y - 14, 32, 48, LAYER_OBJECT_IMAGE);
    return;
  }
  this.g.fillStyle(0x3b2b24, 1).fillRect(x + 11, y + 14, 6, 18);
  this.g.fillStyle(0xffd56a, 0.32).fillCircle(x + 14, y + 10, 22);
  this.g.fillStyle(0xffdf88, 1).fillRect(x + 7, y + 4, 14, 14);
  this.g.fillStyle(0xffffff, 0.45).fillRect(x + 10, y + 6, 4, 5);
  this.g.lineStyle(2, 0x402a1d, 1).strokeRect(x + 7, y + 4, 14, 14);
}

export function drawTownCrate(this: CrystalOathSceneContext, x: number, y: number) {
  if (this.hasTexture(TOWN_PROP_TEXTURES.crate)) {
    this.drawTexture(TOWN_PROP_TEXTURES.crate, x - 5, y - 5, 32, 32, LAYER_OBJECT_IMAGE);
    return;
  }
  this.g.fillStyle(0x8b6038, 1).fillRect(x, y, 22, 22);
  this.g.lineStyle(2, 0x3a2517, 1).strokeRect(x, y, 22, 22);
  this.g.lineStyle(2, 0xc08b4d, 0.85).lineBetween(x + 4, y + 4, x + 18, y + 18);
  this.g.lineStyle(2, 0x4a2f1e, 0.8).lineBetween(x + 18, y + 4, x + 4, y + 18);
}

export function drawTownBarrel(this: CrystalOathSceneContext, x: number, y: number) {
  if (this.hasTexture(TOWN_PROP_TEXTURES.barrel)) {
    this.drawTexture(TOWN_PROP_TEXTURES.barrel, x - 4, y - 5, 32, 32, LAYER_OBJECT_IMAGE);
    return;
  }
  this.g.fillStyle(0x6f4b2c, 1).fillEllipse(x + 12, y + 12, 22, 24);
  this.g.fillStyle(0x9b6b3b, 1).fillEllipse(x + 12, y + 8, 19, 7);
  this.g.lineStyle(2, 0x2d1c12, 1).strokeEllipse(x + 12, y + 12, 22, 24);
  this.g.lineStyle(2, 0xc29352, 0.85).lineBetween(x + 3, y + 12, x + 21, y + 12);
}

export function drawTownTable(this: CrystalOathSceneContext, x: number, y: number) {
  if (this.hasTexture(TOWN_PROP_TEXTURES.table)) {
    this.drawTexture(TOWN_PROP_TEXTURES.table, x - 17, y - 22, 96, 64, LAYER_OBJECT_IMAGE);
    return;
  }
  this.g.fillStyle(0x3d2a1d, 0.45).fillRect(x + 4, y + 9, 58, 25);
  this.g.fillStyle(0x815637, 1).fillRect(x, y, 62, 24);
  this.g.fillStyle(0xba8150, 1).fillRect(x + 4, y + 4, 54, 5);
  this.g.lineStyle(2, 0x2e1d13, 1).strokeRect(x, y, 62, 24);
  this.g.fillStyle(0x5b3924, 1).fillRect(x + 8, y + 23, 7, 12);
  this.g.fillRect(x + 47, y + 23, 7, 12);
}

export function drawTownServiceIcon(this: CrystalOathSceneContext, kind: ServiceKind, cx: number, cy: number, color: number) {
  if (kind === "item" && this.hasTexture("icon_potion")) {
    this.drawTexture("icon_potion", cx - 12, cy - 12, 24, 24, LAYER_OBJECT_IMAGE);
    return;
  }
  if (kind === "arms" && this.hasTexture("icon_weapon_blade")) {
    this.drawTexture("icon_weapon_blade", cx - 12, cy - 12, 24, 24, LAYER_OBJECT_IMAGE);
    return;
  }
  if (kind === "magic" && this.hasTexture("icon_relic_gale")) {
    this.drawTexture("icon_relic_gale", cx - 12, cy - 12, 24, 24, LAYER_OBJECT_IMAGE);
    return;
  }
  this.g.fillStyle(0x101827, 1).fillRect(cx - 14, cy - 14, 28, 28);
  this.g.lineStyle(2, 0xffffff, 0.55).strokeRect(cx - 14, cy - 14, 28, 28);
  this.g.fillStyle(color, 1);
  if (kind === "inn") {
    this.g.fillRect(cx - 11, cy + 1, 22, 8);
    this.g.fillStyle(0xffffff, 1).fillRect(cx - 10, cy - 6, 8, 7);
    this.g.fillStyle(0xfff1a2, 1).fillCircle(cx + 7, cy - 7, 5);
    this.g.fillStyle(0x101827, 1).fillCircle(cx + 10, cy - 9, 5);
  } else if (kind === "clinic") {
    this.g.fillRect(cx - 4, cy - 12, 8, 24);
    this.g.fillRect(cx - 12, cy - 4, 24, 8);
  } else {
    this.g.fillRect(cx - 10, cy - 10, 20, 20);
  }
}

export function drawTownServicePad(this: CrystalOathSceneContext, service: TownServiceDef, ox: number, oy: number) {
  const tileId = TOWN_SHOP_PAD_TILES[service.kind];
  const centerX = ox + service.x * TILE + TILE / 2;
  const startX = centerX - TILE * 1.5;
  const startY = oy + service.y * TILE - 2;
  for (let y = 0; y < 2; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      this.drawDungeonAtlasTile(tileId, startX + x * TILE, startY + y * TILE, LAYER_WORLD_IMAGE, 0.97);
    }
  }
}

export function drawTownService(this: CrystalOathSceneContext, service: TownServiceDef, ox: number, oy: number) {
  const cx = ox + service.x * TILE + TILE / 2;
  const kioskW = 66;
  const kioskH = 72;
  const kioskX = cx - kioskW / 2;
  const kioskY = oy + service.y * TILE - 31;
  this.drawTownServicePad(service, ox, oy);
  this.g.fillStyle(0x07101f, 0.35).fillEllipse(cx, kioskY + kioskH - 7, kioskW + 10, 15);
  this.g.fillStyle(0x111827, 0.94).fillRect(kioskX, kioskY + 10, kioskW, kioskH - 14);
  this.g.fillStyle(service.color, 0.92).fillRect(kioskX + 5, kioskY + 15, kioskW - 10, kioskH - 24);
  this.g.fillStyle(service.accent, 0.92).fillRect(kioskX + 5, kioskY + kioskH - 26, kioskW - 10, 16);
  this.g.lineStyle(2, 0xfff5c8, 0.72).strokeRect(kioskX + 4, kioskY + 14, kioskW - 8, kioskH - 22);
  this.g.lineStyle(2, 0x07101f, 1).strokeRect(kioskX, kioskY + 10, kioskW, kioskH - 14);

  const serviceTexture = TOWN_SERVICE_TEXTURES[service.kind];
  if (this.hasTexture(serviceTexture)) {
    this.drawTexture(serviceTexture, cx - 31, kioskY, 62, 62, LAYER_OBJECT_IMAGE);
  } else {
    this.drawTownServiceIcon(service.kind, cx, kioskY + 38, service.accent);
  }
}

export function drawTownDecor(this: CrystalOathSceneContext, ox: number, oy: number) {
  this.drawTownRug(ox + 7 * TILE, oy + 7 * TILE + 4, TILE * 7, TILE * 2, 0x7f3142);
  this.drawTownTable(ox + 10 * TILE - 16, oy + 10 * TILE - 8);
  this.drawTownCrate(ox + 17 * TILE + 5, oy + 10 * TILE + 2);
  this.drawTownBarrel(ox + 18 * TILE + 5, oy + 11 * TILE);
  this.drawTownCrate(ox + 2 * TILE + 5, oy + 11 * TILE + 2);
  this.drawTownLamp(ox + 2 * TILE + 2, oy + 2 * TILE);
  this.drawTownLamp(ox + 18 * TILE + 2, oy + 2 * TILE);
  this.drawTownLamp(ox + 2 * TILE + 2, oy + 12 * TILE - 4);
  this.drawTownLamp(ox + 18 * TILE + 2, oy + 12 * TILE - 4);
}

export function drawTownExit(this: CrystalOathSceneContext, ox: number, oy: number) {
  const x = ox + 9 * TILE;
  const y = oy + 14 * TILE;
  if (this.hasTexture("town_exit_gate")) {
    this.g.fillStyle(0x07101f, 0.75).fillRect(x - 4, y - 6, TILE * 3 + 8, TILE + 8);
    this.drawTexture("town_exit_gate", x, y - 50, TILE * 3, 80, LAYER_OBJECT_IMAGE);
    return;
  }
  this.g.fillStyle(0x07101f, 1).fillRect(x, y - 6, TILE * 3, TILE + 6);
  this.g.fillStyle(0x1d2b44, 1).fillRect(x + 10, y - 2, TILE * 3 - 20, TILE + 2);
  this.g.fillStyle(0xf5d27c, 1).fillRect(x + 4, y - 8, TILE * 3 - 8, 5);
  this.g.lineStyle(2, 0x0b1324, 1).strokeRect(x, y - 6, TILE * 3, TILE + 6);
}

export function drawTown(this: CrystalOathSceneContext) {
  const town = this.towns()[this.currentTown];
  const ox = 144;
  const oy = 40;
  const roomW = 21 * TILE;
  const roomH = 15 * TILE;

  this.g.fillStyle(0x14223b, 1).fillRect(0, 0, WIDTH, HEIGHT);
  this.g.fillStyle(0x0a1020, 0.45).fillRect(ox - 18, oy - 18, roomW + 36, roomH + 36);
  for (let y = 0; y < 15; y += 1) {
    for (let x = 0; x < 21; x += 1) {
      const px = ox + x * TILE;
      const py = oy + y * TILE;
      const wall = x === 0 || y === 0 || x === 20 || y === 14;
      if (wall) this.drawTownWallTile(px, py, x, y);
      else this.drawTownFloorTile(px, py, x, y);
    }
  }
  this.g.fillStyle(parseInt(town.palette[2].slice(1), 16), 0.18).fillRect(ox + TILE, oy + TILE, roomW - TILE * 2, 5);
  this.drawTownExit(ox, oy);
  this.drawTownDecor(ox, oy);
  TOWN_SERVICES.forEach((service) => this.drawTownService(service, ox, oy));
  town.npcs.forEach((npc, idx) => this.drawNpc(ox + npc.x * TILE + 6, oy + npc.y * TILE + 5, idx));
  const leaderPos = this.visualExplorePos("town");
  this.drawLeader(ox + leaderPos.x * TILE + 4, oy + leaderPos.y * TILE + 3);
  this.drawHud(town.name);
}
