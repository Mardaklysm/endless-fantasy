import { HEIGHT, LAYER_OBJECT_IMAGE, TILE, WIDTH } from "../../app/config";
import type { AssetKey } from "../../assets/assetTypes";
import { DUNGEON_FLOOR_TEXTURES } from "../../assets/textureKeys";
import type { DungeonDef } from "../../data/gameDataTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function drawDungeon(this: CrystalOathSceneContext) {
  const dungeon = this.dungeons()[this.currentDungeon];
  if (!dungeon) {
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    this.text(WIDTH / 2, HEIGHT / 2 - 12, `Missing dungeon: ${this.currentDungeon}`, 18, "#fff2a8", "center");
    this.drawHud("Dungeon unavailable");
    return;
  }
  this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
  const floor = dungeon.floors[this.dungeonFloor];
  if (!floor?.length || !floor[0]?.length) {
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    this.text(WIDTH / 2, HEIGHT / 2 - 12, `Missing dungeon floor: ${dungeon.name}`, 18, "#fff2a8", "center");
    this.drawHud("Dungeon unavailable");
    return;
  }
  const leaderPos = this.visualExplorePos("dungeon");
  const cam = this.cameraFor(leaderPos, floor[0].length, floor.length);
  const mapScreenX = -cam.x;
  const mapScreenY = -cam.y;
  this.g.fillStyle(0x070d18, 1).fillRect(mapScreenX - 10, mapScreenY - 10, floor[0].length * TILE + 20, floor.length * TILE + 20);
  for (let y = 0; y < floor.length; y += 1) {
    for (let x = 0; x < floor[y].length; x += 1) {
      const sx = x * TILE - cam.x;
      const sy = y * TILE - cam.y;
      if (sx < -TILE || sy < -TILE || sx > WIDTH || sy > HEIGHT) continue;
      this.drawDungeonTile(floor[y][x], sx, sy, dungeon, x, y);
    }
  }
  this.drawLeader(leaderPos.x * TILE - cam.x + 4, leaderPos.y * TILE - cam.y + 3);
  this.drawHud(`${dungeon.name} F${this.dungeonFloor + 1}`);
  this.drawPrompt("Explore / interact");
}

export function dungeonObjectTexture(this: CrystalOathSceneContext, tile: string, dungeon: DungeonDef, tileX: number, tileY: number): AssetKey | undefined {
  if (tile === "C") return this.isDungeonChestOpen(dungeon, this.dungeonFloor, tileX, tileY) ? "chest_open" : "chest_closed";
  if (tile === "K") return "switch_floor";
  if (tile === "D") return this.puzzleFlags.has(`${this.currentDungeon}-switch`) ? "dungeon_gate_open" : "dungeon_gate_closed";
  if (tile === "S") return "dungeon_stairs";
  if (tile === "E") return "dungeon_exit";
  if (tile === "B") return "boss_relic_seal";
  return undefined;
}

export function isDungeonChestOpen(this: CrystalOathSceneContext, dungeon: DungeonDef, floorIndex: number, tileX: number, tileY: number): boolean {
  let count = 0;
  for (let f = 0; f <= floorIndex; f += 1) {
    const floor = dungeon.floors[f];
    for (let y = 0; y < floor.length; y += 1) {
      for (let x = 0; x < floor[y].length; x += 1) {
        if (floor[y][x] !== "C") continue;
        if (f === floorIndex && x === tileX && y === tileY) {
          const reward = dungeon.chestRewards[count % dungeon.chestRewards.length];
          return this.openedChests.has(`${dungeon.id}-${floorIndex}-${tileX}-${tileY}-${reward.id}`);
        }
        count += 1;
      }
    }
  }
  return false;
}

export function drawDungeonTile(this: CrystalOathSceneContext, tile: string, sx: number, sy: number, dungeon: DungeonDef, tileX: number, tileY: number) {
  if (tile === "#") {
    if (!this.isDungeonWallEdge(tileX, tileY)) {
      this.g.fillStyle(0x050812, 1).fillRect(sx, sy, TILE, TILE);
      return;
    }
    const theme = this.dungeonThemeTiles(dungeon);
    const wallTile = this.pickDungeonAtlasTile(theme.walls, dungeon, tileX, tileY, 19);
    if (this.drawDungeonAtlasTile(wallTile, sx, sy)) return;
    if (this.drawTileTexture("dungeon_wall_base", sx, sy)) return;
    this.g.fillStyle(dungeon.palette.wall, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(dungeon.palette.accent, 0.25).fillRect(sx + 4, sy + 4, 7, 7);
    return;
  }
  const drewFloor =
    this.drawTileTexture(DUNGEON_FLOOR_TEXTURES[dungeon.id] ?? "dungeon_floor_moss", sx, sy);
  if (!drewFloor) {
    this.g.fillStyle(dungeon.palette.floor, 1).fillRect(sx, sy, TILE, TILE);
    this.g.fillStyle(0xffffff, 0.05).fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
  }
  const atlasObjectTile = this.dungeonAtlasObjectTile(tile, dungeon, tileX, tileY);
  if (this.drawDungeonAtlasTile(atlasObjectTile, sx, sy, LAYER_OBJECT_IMAGE)) return;
  const objectKey = this.dungeonObjectTexture(tile, dungeon, tileX, tileY);
  if (this.drawTileTexture(objectKey, sx, sy, LAYER_OBJECT_IMAGE, false, tile === "S")) return;
  if (tile === "C") {
    this.g.fillStyle(dungeon.palette.chest, 1).fillRect(sx + 7, sy + 10, 18, 14);
    this.g.fillStyle(0x3a2111, 1).fillRect(sx + 7, sy + 17, 18, 3);
  }
  if (tile === "K") {
    this.g.fillStyle(dungeon.palette.accent, 1).fillRect(sx + 10, sy + 9, 12, 16);
    this.g.fillStyle(0xffffff, 0.55).fillRect(sx + 14, sy + 6, 4, 7);
  }
  if (tile === "D") {
    const open = this.puzzleFlags.has(`${this.currentDungeon}-switch`);
    this.g.fillStyle(open ? dungeon.palette.floor : dungeon.palette.gate, 1).fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
    if (!open) this.g.fillStyle(0x000000, 0.35).fillRect(sx + 14, sy + 3, 4, TILE - 6);
  }
  if (tile === "S") {
    this.g.fillStyle(dungeon.palette.accent, 1).fillRect(sx + 8, sy + 8, 16, 16);
    this.g.fillStyle(0x050812, 0.5).fillRect(sx + 12, sy + 12, 8, 8);
  }
  if (tile === "E") {
    this.g.fillStyle(0x050812, 0.7).fillRect(sx + 5, sy + 3, 22, 26);
  }
  if (tile === "B") {
    this.g.fillStyle(0xf5e17d, 0.7).fillRect(sx + 9, sy + 7, 14, 18);
  }
}

export function isDungeonWallEdge(this: CrystalOathSceneContext, tileX: number, tileY: number): boolean {
  const dungeon = this.dungeons()[this.currentDungeon];
  const floor = dungeon.floors[this.dungeonFloor];
  for (let yy = tileY - 1; yy <= tileY + 1; yy += 1) {
    for (let xx = tileX - 1; xx <= tileX + 1; xx += 1) {
      if (xx === tileX && yy === tileY) continue;
      const neighbor = floor[yy]?.[xx];
      if (neighbor && neighbor !== "#") return true;
    }
  }
  return false;
}
