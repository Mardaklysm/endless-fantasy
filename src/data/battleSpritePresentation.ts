import { HEIGHT, WIDTH } from "../app/config";
import { CHARACTER_SPRITES } from "./characterSprites";
import type { CharacterSpriteClass, CharacterSpriteFrameName } from "./characterSprites";
import presentation from "./battleSpritePresentation.json";

export type BattleSpriteSide = "player" | "enemy" | "boss";
export type BattleSpriteRole = "normal" | "front" | "back" | "boss" | "flying" | "large";

export const BATTLE_SPRITE_PRESENTATION = presentation;
export const HERO_BATTLE_TARGET_HEIGHT = 112;

export function battleMapImageToScreenPoint(battleMap: { dimensions: { width: number; height: number } }, x: number, y: number) {
  return {
    x: (x / battleMap.dimensions.width) * WIDTH,
    y: (y / battleMap.dimensions.height) * HEIGHT
  };
}

export function battleMapRadiusToScreen(battleMap: { dimensions: { width: number; height: number } }, radius: number) {
  return radius * ((WIDTH / battleMap.dimensions.width + HEIGHT / battleMap.dimensions.height) / 2);
}

export function battlePlayerSpriteCellWidth(classId?: CharacterSpriteClass, frameName?: CharacterSpriteFrameName) {
  if (!classId || !frameName) return BATTLE_SPRITE_PRESENTATION.player.spriteCellWidth;
  const sprite = CHARACTER_SPRITES[classId];
  const visualHeight = battlePlayerSpriteFrameVisualHeight(classId, frameName);
  if (visualHeight <= 0) return BATTLE_SPRITE_PRESENTATION.player.spriteCellWidth;
  return Math.round((HERO_BATTLE_TARGET_HEIGHT * sprite.grid.cellWidth) / visualHeight);
}

export function battlePlayerSpriteVisualHeight(classId: CharacterSpriteClass, frameName: CharacterSpriteFrameName) {
  const sprite = CHARACTER_SPRITES[classId];
  return Math.round((battlePlayerSpriteFrameVisualHeight(classId, frameName) * battlePlayerSpriteCellWidth(classId, frameName)) / sprite.grid.cellWidth);
}

export function battlePlayerSlotSize() {
  return BATTLE_SPRITE_PRESENTATION.player.slotSize;
}

export function battlePlayerSlotOrigin() {
  return {
    bodyCenterX: BATTLE_SPRITE_PRESENTATION.player.bodyCenterX,
    feetBaselineY: BATTLE_SPRITE_PRESENTATION.player.feetBaselineY
  };
}

export function battleEnemyDisplaySizeForRole(
  battleMap: { dimensions: { width: number; height: number } },
  radius: number,
  role: BattleSpriteRole
) {
  const base = BATTLE_SPRITE_PRESENTATION.enemy.roleDisplaySizes[role] ?? BATTLE_SPRITE_PRESENTATION.enemy.roleDisplaySizes.normal;
  const radiusSize = battleMapRadiusToScreen(battleMap, radius) * BATTLE_SPRITE_PRESENTATION.enemy.radiusToDisplayScale;
  return Math.round(clamp(radiusSize, base * BATTLE_SPRITE_PRESENTATION.enemy.minDisplayScale, base * BATTLE_SPRITE_PRESENTATION.enemy.maxDisplayScale));
}

export function defaultBattleSpriteRadius(side: BattleSpriteSide) {
  if (side === "player") return BATTLE_SPRITE_PRESENTATION.player.defaultRadius;
  if (side === "boss") return BATTLE_SPRITE_PRESENTATION.enemy.bossDefaultRadius;
  return BATTLE_SPRITE_PRESENTATION.enemy.defaultRadius;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function battlePlayerSpriteFrameVisualHeight(classId: CharacterSpriteClass, frameName: CharacterSpriteFrameName) {
  const frame = CHARACTER_SPRITES[classId]?.frames[frameName];
  const bounds = frame?.normalizedPlacement ?? frame?.sourceAlphaBBox;
  return bounds?.height ?? 0;
}
