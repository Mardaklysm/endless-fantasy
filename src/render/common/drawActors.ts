import { EXPLORE_PLAYER_SPRITE_WIDTH, LAYER_BATTLE_IMAGE, LAYER_CHARACTER_IMAGE, TILE_FRAME } from "../../app/config";
import { ENEMY_TEXTURES, NPC_TEXTURES, PARTY_CLASS, PORTRAIT_TEXTURES } from "../../assets/textureKeys";
import type { CharacterState, EnemyState } from "../../data/gameDataTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function drawActorShadow(this: CrystalOathSceneContext, x: number, y: number, width = 26, height = 8) {
  this.g.fillStyle(0x050812, 0.34).fillEllipse(x, y, width, height);
}

export function drawLeader(this: CrystalOathSceneContext, x: number, y: number) {
  const frame = this.playerMoving ? Math.floor(this.walkAnimElapsed / 85) % 2 : 0;
  const spriteCellWidth = EXPLORE_PLAYER_SPRITE_WIDTH;
  const shadowWidth = 36;
  const shadowHeight = 12;
  const ellipseW = 32;
  const ellipseH = 12;
  const bodyOffsetX = 12;
  const bodyOffsetY = 13;
  const bodyCenterX = x + bodyOffsetX;
  const feetBaselineY = y + bodyOffsetY;
  this.drawActorShadow(bodyCenterX, feetBaselineY, shadowWidth, shadowHeight);
  this.g.lineStyle(1, 0xfff0a8, 0.62).strokeEllipse(bodyCenterX, feetBaselineY, ellipseW, ellipseH);
  if (this.drawCharacterSpriteFrame(PARTY_CLASS.arlen, this.explorationCharacterFrame(frame), bodyCenterX, feetBaselineY, spriteCellWidth)) {
    return;
  }
  const scale = 2;
  const fx = bodyCenterX - 11 * scale;
  const fy = feetBaselineY - 37 * scale;
  this.g.fillStyle(0x050812, 1).fillRect(fx + 5 * scale, fy + 3 * scale, 22 * scale, 29 * scale);
  this.g.fillStyle(0x2a213a, 1).fillRect(fx + 7 * scale, fy + scale, 18 * scale, 9 * scale);
  this.g.fillStyle(0xf0c18d, 1).fillRect(fx + 9 * scale, fy + 5 * scale, 14 * scale, 12 * scale);
  this.g.fillStyle(0xb93434, 1).fillRect(fx + 6 * scale, fy + 17 * scale, 22 * scale, 13 * scale);
  this.g.fillStyle(0xf2e9dd, 1).fillRect(fx + 15 * scale, fy + 17 * scale, 7 * scale, 16 * scale);
  this.g.fillStyle(0x1c2238, 1).fillRect(fx + 7 * scale, fy + 30 * scale, 8 * scale, (7 + frame) * scale);
  this.g.fillRect(fx + 20 * scale, fy + 30 * scale, 8 * scale, (7 + (1 - frame)) * scale);
  this.g.fillStyle(0xffffff, 1).fillRect(fx + 11 * scale, fy + 10 * scale, 3 * scale, 3 * scale);
  this.g.fillRect(fx + 19 * scale, fy + 10 * scale, 3 * scale, 3 * scale);
}

export function drawNpc(this: CrystalOathSceneContext, x: number, y: number, idx: number) {
  const npcTexture = NPC_TEXTURES[idx % NPC_TEXTURES.length];
  this.drawActorShadow(x + 10, y + 27, 24, 8);
  if (this.hasTexture(npcTexture)) {
    this.drawCroppedTexture(npcTexture, x - 8, y - 7, 0, 0, TILE_FRAME, TILE_FRAME, 34, 34, LAYER_CHARACTER_IMAGE);
    return;
  }
  const colors = [0xffd37d, 0x90e6b0, 0xbda2ff];
  this.g.fillStyle(0xf2bd8f, 1).fillRect(x + 7, y, 10, 9);
  this.g.fillStyle(colors[idx % colors.length], 1).fillRect(x + 5, y + 9, 14, 15);
  this.g.fillStyle(0x2d344f, 1).fillRect(x + 6, y + 24, 5, 5);
  this.g.fillStyle(0x2d344f, 1).fillRect(x + 15, y + 24, 5, 5);
}

export function drawPortrait(this: CrystalOathSceneContext, c: CharacterState, x: number, y: number, scale: number) {
  const portraitTexture = PORTRAIT_TEXTURES[c.id];
  if (this.hasTexture(portraitTexture)) {
    this.drawTexture(portraitTexture, x, y, 32 * scale, 40 * scale, LAYER_BATTLE_IMAGE, c.hp <= 0 ? 0.35 : 1);
    return;
  }
  const palettes = {
    arlen: [0xf1c897, 0xb73b36, 0xe9edf7],
    mira: [0xf0d0b0, 0x5ca46f, 0xffffff],
    kael: [0xe1b284, 0xa33c36, 0xffd66b]
  }[c.id];
  this.g.fillStyle(0x0b1020, 1).fillRect(x, y, 22 * scale, 28 * scale);
  this.g.lineStyle(2, 0xffffff, 0.8).strokeRect(x, y, 22 * scale, 28 * scale);
  this.g.fillStyle(palettes[0], 1).fillRect(x + 7 * scale, y + 3 * scale, 8 * scale, 8 * scale);
  this.g.fillStyle(palettes[1], 1).fillRect(x + 5 * scale, y + 11 * scale, 12 * scale, 11 * scale);
  this.g.fillStyle(palettes[2], 1).fillRect(x + 10 * scale, y + 12 * scale, 4 * scale, 11 * scale);
}

export function drawEnemySprite(this: CrystalOathSceneContext, enemy: EnemyState, x: number, y: number, s: number, displaySize = 96) {
  const texture = ENEMY_TEXTURES[enemy.id];
  if (texture && this.hasTexture(texture)) {
    this.drawTexture(texture, x, y, displaySize, displaySize, LAYER_BATTLE_IMAGE, enemy.hp <= 0 ? 0.28 : 1, undefined, true);
    return;
  }
  const p = enemy.palette.map((c) => parseInt(c.slice(1), 16));
  const dead = enemy.hp <= 0 ? 0.28 : 1;
  this.g.fillStyle(p[0], dead);
  if (enemy.sprite === "blob") {
    this.g.fillRect(x, y + 34, 20 * s, 10 * s);
    this.g.fillRect(x + 4 * s, y + 18, 12 * s, 16 * s);
    this.g.fillStyle(p[1], dead).fillRect(x + 8 * s, y + 12, 8 * s, 8 * s);
  } else if (enemy.sprite === "wing") {
    this.g.fillTriangle(x, y + 32, x + 10 * s, y + 8, x + 16 * s, y + 36);
    this.g.fillTriangle(x + 20 * s, y + 32, x + 10 * s, y + 8, x + 4 * s, y + 36);
    this.g.fillStyle(p[1], dead).fillRect(x + 8 * s, y + 14, 8 * s, 18 * s);
  } else if (enemy.sprite === "knight") {
    this.g.fillRect(x + 5 * s, y + 8, 12 * s, 26 * s);
    this.g.fillStyle(p[1], dead).fillRect(x + 3 * s, y + 18, 16 * s, 18 * s);
    this.g.fillStyle(p[2], dead).fillRect(x + 8 * s, y + 11, 8 * s, 4 * s);
  } else if (enemy.sprite === "serpent") {
    for (let i = 0; i < 5; i += 1) {
      this.g.fillStyle(p[i % 2], dead).fillRect(x + i * 6 * s, y + (i % 2) * 5 * s + 18, 8 * s, 8 * s);
    }
    this.g.fillStyle(p[2], dead).fillRect(x + 30 * s, y + 12, 10 * s, 10 * s);
  } else if (enemy.sprite === "crown") {
    this.g.fillRect(x + 4 * s, y + 20, 18 * s, 16 * s);
    this.g.fillStyle(p[2], dead);
    this.g.fillTriangle(x + 4 * s, y + 20, x + 8 * s, y + 4, x + 12 * s, y + 20);
    this.g.fillTriangle(x + 11 * s, y + 20, x + 15 * s, y + 2, x + 19 * s, y + 20);
  } else {
    this.g.fillRect(x + 4 * s, y + 12, 16 * s, 22 * s);
    this.g.fillStyle(p[1], dead).fillRect(x, y + 25, 24 * s, 10 * s);
  }
  this.g.fillStyle(0xffffff, dead).fillRect(x + 8 * s, y + 20, 2 * s, 2 * s);
  this.g.fillRect(x + 14 * s, y + 20, 2 * s, 2 * s);
}

export function drawPixelCrystal(this: CrystalOathSceneContext, x: number, y: number, scale: number) {
  const colors = [0x87e6ff, 0xfff0a6, 0xa98bff, 0xff9b78];
  colors.forEach((color, i) => {
    const ox = (i - 1.5) * 20 * scale;
    this.g.fillStyle(color, 1);
    this.g.fillTriangle(x + ox + 10 * scale, y, x + ox + 20 * scale, y + 20 * scale, x + ox, y + 20 * scale);
    this.g.fillTriangle(x + ox, y + 20 * scale, x + ox + 20 * scale, y + 20 * scale, x + ox + 10 * scale, y + 42 * scale);
  });
}
