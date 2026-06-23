import Phaser from "phaser";
import {
  HEIGHT,
  LAYER_CHARACTER_IMAGE,
  LAYER_TEXT,
  LAYER_UI_GRAPHICS,
  LAYER_UI_IMAGE,
  LAYER_WORLD_IMAGE,
  PIXEL_ART_SCALE,
  TILE,
  WIDTH,
  WORLD_H,
  WORLD_W
} from "../../app/config";
import { ASSET_PATHS, CHARTER_BOAT_8DIR_TEXTURE_KEY } from "../../assets/assetPaths";
import type { AssetKey } from "../../assets/assetTypes";
import { CHARACTER_CLASS_TEXTURES, DEFAULT_DUNGEON_THEME_TILES, DUNGEON_THEME_TILES } from "../../assets/textureKeys";
import type { DungeonThemeTiles } from "../../assets/textureKeys";
import { CHARACTER_SPRITES } from "../../data/characterSprites";
import type { CharacterSpriteClass, CharacterSpriteFrameName } from "../../data/characterSprites";
import { DUNGEON_ATLAS, dungeonAtlasSourceRectWithInset, dungeonTileById } from "../../data/dungeonTiles";
import type { DungeonTileId } from "../../data/dungeonTiles";
import type { CharacterState, DungeonDef } from "../../data/gameDataTypes";
import { WORLD_CLOUD_ASSETS } from "../../data/worldCloudAssets";
import { WORLD_CURRENT_ASSETS } from "../../data/worldCurrentAssets";
import type { RoadRotation } from "../../world/worldGenerator";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function draw(this: CrystalOathSceneContext) {
  this.dirty = false;
  this.clearImages();
  this.g.clear();
  this.worldOverlay.clear();
  this.ui.clear();
  this.clearText();
  this.syncWorldLightingLayer();
  if (this.mode === "title") this.drawTitle();
  else if (this.mode === "world") this.drawWorld();
  else if (this.mode === "town") this.drawTown();
  else if (this.mode === "poi") this.drawPoiVisit();
  else if (this.mode === "dungeon") this.drawDungeon();
  else if (this.mode === "dialogue") this.drawDialogue();
  else if (this.mode === "menu") this.drawMenuScreen();
  else if (this.mode === "battle") this.drawBattle();
  else if (this.mode === "gameOver") this.drawGameOver();
  else if (this.mode === "ending") this.drawEnding();
  this.updateCloudOverlay(0);
}

export function clearText(this: CrystalOathSceneContext) {
  for (const text of this.texts) text.destroy();
  this.texts = [];
}

export function clearImages(this: CrystalOathSceneContext) {
  for (const image of this.images) image.destroy();
  this.images = [];
}

export function text(this: CrystalOathSceneContext, x: number,
  y: number,
  value: string,
  size = 18,
  color = "#ffffff",
  align: "left" | "center" = "left",
  options: { stroke?: string; strokeThickness?: number; wordWrapWidth?: number; fontStyle?: string } = {}) {
  const strokeThickness = options.strokeThickness ?? (size >= 14 ? 2 : 1);
  const scaledSize = size * PIXEL_ART_SCALE;
  const t = this.add.text(x * PIXEL_ART_SCALE, y * PIXEL_ART_SCALE, value, {
    fontFamily: 'Consolas, ui-monospace, "Courier New", monospace',
    fontSize: `${scaledSize}px`,
    fontStyle: options.fontStyle ?? "bold",
    color,
    align,
    lineSpacing: Math.max(2, Math.floor(scaledSize * 0.22)),
    stroke: options.stroke ?? "#050812",
    strokeThickness: strokeThickness * PIXEL_ART_SCALE,
    wordWrap: { width: (options.wordWrapWidth ?? (align === "center" ? WIDTH - 120 : WIDTH - x - 24)) * PIXEL_ART_SCALE }
  });
  t.setResolution(2);
  t.setDepth(LAYER_TEXT);
  t.setPadding(1, 0, 1, 1);
  if (align === "center") t.setOrigin(0.5, 0);
  this.texts.push(t);
  return t;
}

export function hasTexture(this: CrystalOathSceneContext, key: AssetKey): boolean {
  return this.textures.exists(key);
}

export function configureTextureFiltering(this: CrystalOathSceneContext) {
  for (const [key] of ASSET_PATHS) {
    if (!this.textures.exists(key)) continue;
    const filter = key.startsWith("battle_bg_") || key === "title_screen" ? Phaser.Textures.FilterMode.LINEAR : Phaser.Textures.FilterMode.NEAREST;
    this.textures.get(key).setFilter(filter);
  }
  for (const asset of WORLD_CURRENT_ASSETS) {
    if (this.textures.exists(asset.textureKey)) this.textures.get(asset.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  for (const cloud of WORLD_CLOUD_ASSETS) {
    if (this.textures.exists(cloud.textureKey)) this.textures.get(cloud.textureKey).setFilter(Phaser.Textures.FilterMode.LINEAR);
  }
  if (this.textures.exists(CHARTER_BOAT_8DIR_TEXTURE_KEY)) {
    this.textures.get(CHARTER_BOAT_8DIR_TEXTURE_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}

export function updateCloudOverlay(this: CrystalOathSceneContext, deltaMs: number) {
  const active = this.shouldWorldCloudOverlayBeActive();
  const focusPos = active ? this.boatTravel?.boatPos ?? this.visualExplorePos("world") : undefined;
  const worldWidth = this.generatedWorld?.width ?? this.world[0]?.length ?? WORLD_W;
  const worldHeight = this.generatedWorld?.height ?? this.world.length ?? WORLD_H;
  const cameraScroll = focusPos ? this.cameraFor(focusPos, worldWidth, worldHeight) : { x: 0, y: 0 };
  this.cloudOverlay?.update(deltaMs, {
    active,
    enabled: this.cloudOverlayEnabled,
    worldSeed: this.worldSeed,
    islandId: this.currentIslandId,
    islandName: this.currentIslandName(),
    islandTheme: this.currentIslandTheme(),
    viewportWidth: WIDTH,
    viewportHeight: HEIGHT,
    pixelScale: PIXEL_ART_SCALE,
    depth: LAYER_UI_GRAPHICS - 1,
    cameraScrollX: cameraScroll.x,
    cameraScrollY: cameraScroll.y
  });
}

export function shouldWorldCloudOverlayBeActive(this: CrystalOathSceneContext): boolean {
  if (this.mode === "world") return true;
  return (this.mode === "dialogue" || this.mode === "menu") && this.previousMode === "world";
}

export function drawTexture(this: CrystalOathSceneContext, key: AssetKey,
  x: number,
  y: number,
  width: number,
  height: number,
  depth = LAYER_WORLD_IMAGE,
  alpha = 1,
  tint?: number,
  flipX = false,
  flipY = false) {
  const image = this.add.image(x * PIXEL_ART_SCALE, y * PIXEL_ART_SCALE, key);
  image.setOrigin(0, 0);
  image.setDisplaySize(width * PIXEL_ART_SCALE, height * PIXEL_ART_SCALE);
  image.setDepth(depth);
  image.setAlpha(alpha);
  image.setScrollFactor(0);
  image.setFlipX(flipX);
  image.setFlipY(flipY);
  if (tint !== undefined) image.setTint(tint);
  this.images.push(image);
  return image;
}

export function drawContainedTexture(this: CrystalOathSceneContext, key: AssetKey,
  x: number,
  y: number,
  width: number,
  height: number,
  depth = LAYER_WORLD_IMAGE,
  alpha = 1) {
  const source = this.textures.get(key).getSourceImage() as { width?: number; height?: number } | undefined;
  const sourceWidth = source?.width ?? 0;
  const sourceHeight = source?.height ?? 0;
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return this.drawTexture(key, x, y, width, height, depth, alpha);
  }
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const displayWidth = sourceWidth * scale;
  const displayHeight = sourceHeight * scale;
  return this.drawTexture(
    key,
    x + (width - displayWidth) / 2,
    y + (height - displayHeight) / 2,
    displayWidth,
    displayHeight,
    depth,
    alpha
  );
}

export function drawCroppedTexture(this: CrystalOathSceneContext, key: AssetKey,
  x: number,
  y: number,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  displayWidth: number,
  displayHeight: number,
  depth = LAYER_WORLD_IMAGE,
  alpha = 1,
  tint?: number,
  rotation: RoadRotation = 0) {
  const frameKey = `${key}:${cropX},${cropY},${cropWidth},${cropHeight}`;
  const texture = this.textures.get(key);
  if (!texture.has(frameKey)) texture.add(frameKey, 0, cropX, cropY, cropWidth, cropHeight);
  const originX = rotation ? x + displayWidth / 2 : x;
  const originY = rotation ? y + displayHeight / 2 : y;
  const image = this.add.image(originX * PIXEL_ART_SCALE, originY * PIXEL_ART_SCALE, key, frameKey);
  image.setOrigin(rotation ? 0.5 : 0, rotation ? 0.5 : 0);
  image.setDisplaySize(displayWidth * PIXEL_ART_SCALE, displayHeight * PIXEL_ART_SCALE);
  image.setDepth(depth);
  image.setAlpha(alpha);
  image.setScrollFactor(0);
  if (rotation) image.setRotation(Phaser.Math.DegToRad(rotation));
  if (tint !== undefined) image.setTint(tint);
  this.images.push(image);
  return image;
}

export function drawCharacterSpriteFrame(this: CrystalOathSceneContext, classId: CharacterSpriteClass,
  frameName: CharacterSpriteFrameName,
  bodyCenterX: number,
  feetBaselineY: number,
  displayCellWidth: number,
  depth = LAYER_CHARACTER_IMAGE,
  alpha = 1): boolean {
  const texture = CHARACTER_CLASS_TEXTURES[classId];
  if (!this.hasTexture(texture)) return false;
  const sprite = CHARACTER_SPRITES[classId];
  const frame = sprite.frames[frameName];
  const scale = displayCellWidth / sprite.grid.cellWidth;
  const displayWidth = sprite.grid.cellWidth * scale;
  const displayHeight = sprite.grid.cellHeight * scale;
  const x = bodyCenterX - sprite.anchor.bodyCenterX * scale;
  const y = feetBaselineY - sprite.anchor.feetBaselineY * scale;
  this.drawCroppedTexture(
    texture,
    x,
    y,
    frame.col * sprite.grid.cellWidth,
    frame.row * sprite.grid.cellHeight,
    sprite.grid.cellWidth,
    sprite.grid.cellHeight,
    displayWidth,
    displayHeight,
    depth,
    alpha
  );
  return true;
}

export function explorationCharacterFrame(this: CrystalOathSceneContext, stepFrame: number): CharacterSpriteFrameName {
  const suffix = stepFrame % 2 === 0 ? "a" : "b";
  if (this.lastMoveDir.x < 0) return `walk_left_${suffix}` as CharacterSpriteFrameName;
  if (this.lastMoveDir.x > 0) return `walk_right_${suffix}` as CharacterSpriteFrameName;
  if (this.lastMoveDir.y < 0) return `walk_up_${suffix}` as CharacterSpriteFrameName;
  return `walk_down_${suffix}` as CharacterSpriteFrameName;
}

export function battleCharacterFrame(this: CrystalOathSceneContext, member: CharacterState): CharacterSpriteFrameName {
  const animation = this.battle?.animation;
  if (animation?.action.side === "party" && animation.action.actorId === member.id) {
    if (animation.action.type === "attack" || animation.action.type === "skill") {
      return animation.elapsed < animation.impactAt * 0.58 ? "attack_windup_left" : "attack_release_left";
    }
    return animation.elapsed < animation.impactAt ? "walk_left_b" : "walk_left_a";
  }
  return "walk_left_a";
}

export function drawTileTexture(this: CrystalOathSceneContext, key: AssetKey | undefined, x: number, y: number, depth = LAYER_WORLD_IMAGE, flipX = false, flipY = false): boolean {
  if (!key || !this.hasTexture(key)) return false;
  this.drawTexture(key, x, y, TILE, TILE, depth, 1, undefined, flipX, flipY);
  return true;
}

export function drawDungeonAtlasTile(this: CrystalOathSceneContext, tileId: DungeonTileId | undefined, x: number, y: number, depth = LAYER_WORLD_IMAGE, alpha = 1): boolean {
  if (!tileId || !this.hasTexture(DUNGEON_ATLAS.textureKey)) return false;
  const tile = dungeonTileById(tileId);
  if (!tile) return false;
  const rect = dungeonAtlasSourceRectWithInset(tile.source);
  this.drawCroppedTexture(
    DUNGEON_ATLAS.textureKey,
    x,
    y,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    TILE,
    TILE,
    depth,
    alpha
  );
  return true;
}

export function dungeonThemeTiles(this: CrystalOathSceneContext, dungeon: DungeonDef): DungeonThemeTiles {
  return DUNGEON_THEME_TILES[dungeon.id] ?? DEFAULT_DUNGEON_THEME_TILES;
}

export function pickDungeonAtlasTile(this: CrystalOathSceneContext, ids: DungeonTileId[], dungeon: DungeonDef, tileX: number, tileY: number, salt = 0): DungeonTileId {
  const hash = this.dungeonTileHash(dungeon.id, tileX, tileY, this.dungeonFloor + salt);
  return this.pickWeightedDungeonAtlasTile(ids, hash);
}

export function pickWeightedDungeonAtlasTile(this: CrystalOathSceneContext, ids: DungeonTileId[], hash: number): DungeonTileId {
  if (ids.length <= 1) return ids[0];
  const roll = (hash % 1000) / 1000;
  if (roll < 0.72) return ids[0];
  if (roll < 0.88) return ids[1] ?? ids[0];
  if (roll < 0.96) return ids[2] ?? ids[ids.length - 1];
  return ids[3 + ((hash >>> 8) % Math.max(1, ids.length - 3))] ?? ids[ids.length - 1];
}

export function dungeonTileHash(this: CrystalOathSceneContext, dungeonId: string, tileX: number, tileY: number, salt: number): number {
  let hash = Math.imul(tileX + 1, 73856093) ^ Math.imul(tileY + 1, 19349663) ^ Math.imul(salt + 1, 83492791);
  for (let i = 0; i < dungeonId.length; i += 1) {
    hash = Math.imul(hash ^ dungeonId.charCodeAt(i), 16777619);
  }
  return hash >>> 0;
}

export function dungeonAtlasObjectTile(this: CrystalOathSceneContext, tile: string, dungeon: DungeonDef, tileX: number, tileY: number): DungeonTileId | undefined {
  const theme = this.dungeonThemeTiles(dungeon);
  if (tile === "C") return this.isDungeonChestOpen(dungeon, this.dungeonFloor, tileX, tileY) ? theme.chestOpen : theme.chestClosed;
  if (tile === "K") return theme.switch;
  if (tile === "D") return this.puzzleFlags.has(`${this.currentDungeon}-switch`) ? theme.gateOpen : theme.gateClosed;
  if (tile === "S") return this.dungeonFloor === 0 ? theme.stairsDown : theme.stairsUp;
  if (tile === "E") return theme.exit;
  if (tile === "B") return theme.bossSeal;
  return undefined;
}

export function drawCursor(this: CrystalOathSceneContext, x: number, y: number): boolean {
  if (!this.hasTexture("ui_cursor_arrow")) return false;
  this.drawTexture("ui_cursor_arrow", x, y, 16, 16, LAYER_UI_IMAGE);
  return true;
}
