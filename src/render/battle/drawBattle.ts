import Phaser from "phaser";
import {
  DESIGN_WIDTH,
  DESIGN_HEIGHT,
  ASPECT_RATIO,
  PIXEL_ART_SCALE,
  LAYOUT_WIDTH,
  LAYOUT_HEIGHT,
  WIDTH,
  HEIGHT,
  TILE,
  TITLE_MENU_START_Y,
  TITLE_MENU_ROW_HEIGHT,
  DEBUG_WORLD_LAYOUT,
  SAVE_KEY,
  WORLD_W,
  WORLD_H,
  MOVE_DURATION_MS,
  FAST_MOVE_DURATION_MS,
  MOVE_TILES_PER_MS,
  FAST_MOVE_TILES_PER_MS,
  BATTLE_ACTION_DELAY_MS,
  BATTLE_TURN_DELAY_MS,
  WORLD_PLAYER_BASE_SPRITE_WIDTH,
  EXPLORE_PLAYER_SPRITE_WIDTH,
  LANDMARK_FOOTPRINT,
  TILE_FRAME,
  LAYER_WORLD_IMAGE,
  LAYER_OBJECT_IMAGE,
  LAYER_CHARACTER_IMAGE,
  LAYER_BATTLE_IMAGE,
  LAYER_UI_GRAPHICS,
  LAYER_UI_IMAGE,
  LAYER_TEXT,
  ASSET_PATHS,
  ASSET_URLS,
  WORLD_CURRENT_ASSET_MODULES,
  WORLD_CURRENT_ASSETS,
  WORLD_CLOUD_ASSETS,
  WORLD_CLOUD_MANIFEST,
  WORLD_CURRENT_ASSET_MANIFEST,
  WORLD_CURRENT_OBJECT_TEXTURE_KEY_BY_ID,
  WORLD_CURRENT_ROUTE_TEXTURE_KEYS,
  WORLD_CURRENT_TERRAIN_TEXTURE_KEYS,
  worldCurrentAssetByTextureKey,
  worldCurrentObjectTextureKey,
  worldCurrentPoiTextureKeyFor,
  DUNGEON_ATLAS,
  DUNGEON_ATLAS_SOURCE_INSET,
  DUNGEON_TILE_ID_SET,
  DUNGEON_TILE_IDS,
  dungeonAtlasSourceRectWithInset,
  dungeonTileById,
  DUNGEON_FLOOR_TEXTURES,
  DUNGEON_THEME_TILES,
  DEFAULT_DUNGEON_THEME_TILES,
  TOWN_ATLAS_FLOOR_TILES,
  TOWN_ATLAS_WALL_TILES,
  TOWN_SHOP_PAD_TILES,
  LOCATION_TEXTURES,
  TOWN_SERVICE_TEXTURES,
  TOWN_PROP_TEXTURES,
  CHARACTER_CLASS_TEXTURES,
  PARTY_CLASS,
  ENEMY_TEXTURES,
  PORTRAIT_TEXTURES,
  NPC_TEXTURES,
  TOWN_SERVICES,
  ITEMS,
  SPELLS,
  PLAYER_SKILLS,
  WEAPONS,
  ARMORS,
  GEAR,
  ENEMIES,
  WORLD_TABLES,
  CHARACTER_SPRITES,
  generateDungeonFloors,
  createSemanticMaskTerrainTexture,
  createSemanticRouteOverlayTexture,
  SEMANTIC_BIOME,
  SEMANTIC_WATER,
  hashNoise,
  ACTIVE_WORLDGEN_MODE,
  createWorldSeed,
  generateWorld,
  getIslandAt,
  isWorldPositionWalkable,
  WORLD_TILES,
  isWorldTileWalkable,
  worldTileEncounterFamily,
  worldTileHasTag,
  isUp,
  isDown,
  isLeft,
  isRight,
  isConfirm,
  isCancel,
  directionNameForEvent,
  keyDirection,
  wrap,
  seededNoise,
  OverworldCloudOverlay,
  type AssetKey,
  type Mode,
  type ExploreMode,
  type DirectionName,
  type Terrain,
  type Vec,
  type ExploreStep,
  type MenuOption,
  type ActiveMenu,
  type Dialogue,
  type ElementType,
  type TargetKind,
  type StatusState,
  type CharacterState,
  type ItemDef,
  type SpellDef,
  type PlayerSkillDef,
  type GearDef,
  type EnemyMove,
  type EnemyIntentKind,
  type EnemyIntent,
  type EnemyDef,
  type EnemyState,
  type LocationDef,
  type TownDef,
  type DungeonDef,
  type TravelDestination,
  type ServiceKind,
  type TownServiceDef,
  type BattleAction,
  type BattleAnimation,
  type BattlePhase,
  type InitiativeEntry,
  type BattleState,
  type DungeonThemeTiles,
  type WorldCurrentAssetRecord,
  type WorldObjectId,
  type WorldTileId,
  type GeneratedWorld,
  type IslandId,
  type IslandTheme,
  type RoadRotation,
  type WorldRoadVisual,
  type WorldLandmarkKind,
  type WorldPoiKind,
  type SemanticMaskTerrainClass,
  type SemanticMaskTerrainSources,
  type SemanticRouteOverlayMode,
  type CharacterSpriteClass,
  type CharacterSpriteFrameName,
  type DungeonTileId
} from "../../scene/sceneGlobals";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function drawBattle(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  this.drawBattleBackdrop();
  const selectedEnemy = this.selectedBattleEnemy();
  this.battle.enemies.forEach((enemy, idx) => {
    const slot = this.enemyBattleSlot(enemy, idx);
    const targeted = selectedEnemy?.uid === enemy.uid;
    const offset = this.battleActorOffset("enemy", enemy.uid);
    this.drawBattleEnemy(enemy, slot.x + offset.x, slot.y + offset.y, slot.size, targeted);
  });
  this.party.forEach((member, idx) => {
    const slot = this.partyBattleSlot(idx);
    const offset = this.battleActorOffset("party", member.id);
    const active =
      this.currentBattleEntry()?.side === "party" &&
      this.currentBattleEntry()?.actorId === member.id &&
      !this.battle?.animation &&
      this.battle?.phase !== "resolving";
    this.drawPartyBattler(member, slot.x + offset.x, slot.y + offset.y, idx, active);
  });
  this.drawBattleTargetPanel(14, 374, 288, 152);
  this.drawBattleCommandPanel(312, 374, 216, 152);
  this.drawBattleStatusPanel(538, 374, 408, 152);
}

export function drawBattleBackdrop(this: CrystalOathSceneContext) {
  const background = this.battle?.background;
  if (background && this.hasTexture(background)) {
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    this.drawTexture(background, 0, 0, WIDTH, HEIGHT, LAYER_WORLD_IMAGE);
    this.g.fillStyle(0x000000, 0.05).fillRect(0, 0, WIDTH, 374);
    this.g.fillStyle(0x06101f, 0.48).fillRect(0, 374, WIDTH, HEIGHT - 374);
    return;
  }
  this.g.fillStyle(0x0a1422, 1).fillRect(0, 0, WIDTH, HEIGHT);
  this.g.fillStyle(0x182b40, 1).fillRect(0, 0, WIDTH, 110);
  this.g.fillStyle(0x233d4b, 1).fillRect(0, 110, WIDTH, 62);
  this.g.fillStyle(0x10251d, 1).fillRect(0, 155, WIDTH, 82);
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 61) % WIDTH;
    const h = 48 + (i % 5) * 17;
    this.g.fillStyle(0x152319, 1).fillRect(x, 105 - (i % 3) * 10, 13, h);
    this.g.fillStyle(i % 2 ? 0x183a25 : 0x214b2e, 1).fillCircle(x + 8, 94 - (i % 3) * 10, 34 + (i % 4) * 5);
    this.g.fillStyle(0x0c1c14, 0.55).fillCircle(x + 24, 118, 24);
  }
  this.g.fillStyle(0x3a5734, 1).fillRect(0, 218, WIDTH, 172);
  this.g.fillStyle(0x667448, 1).fillEllipse(430, 328, 840, 128);
  this.g.fillStyle(0x856f4c, 1).fillEllipse(426, 330, 790, 92);
  this.g.fillStyle(0x4d653c, 0.8).fillRect(0, 356, WIDTH, 34);
  for (let i = 0; i < 72; i += 1) {
    const x = (i * 37) % WIDTH;
    const y = 226 + ((i * 19) % 142);
    const color = i % 3 === 0 ? 0x6c9a55 : i % 3 === 1 ? 0x2d552f : 0xa98b5a;
    this.g.fillStyle(color, 0.55).fillRect(x, y, i % 2 ? 9 : 5, 2);
  }
  this.g.fillStyle(0x000000, 0.28).fillRect(0, 0, WIDTH, HEIGHT);
}

export function enemyBattleSlot(this: CrystalOathSceneContext, enemy: EnemyState, idx: number): { x: number; y: number; size: number } {
  if (enemy.boss) return { x: 116, y: 78, size: 178 };
  const slots = [
    { x: 74, y: 100, size: 106 },
    { x: 236, y: 156, size: 106 },
    { x: 92, y: 220, size: 106 }
  ];
  return slots[idx % slots.length];
}

export function partyBattleSlot(this: CrystalOathSceneContext, idx: number): { x: number; y: number; size: number } {
  const slots = [
    { x: 678, y: 92, size: 96 },
    { x: 728, y: 170, size: 96 },
    { x: 778, y: 248, size: 96 }
  ];
  return slots[idx % slots.length];
}

export function battleActorCenter(this: CrystalOathSceneContext, side: "party" | "enemy", actorId: string): Vec | undefined {
  if (!this.battle) return undefined;
  if (side === "party") {
    const idx = this.party.findIndex((member) => member.id === actorId);
    if (idx < 0) return undefined;
    const slot = this.partyBattleSlot(idx);
    return { x: slot.x + 48, y: slot.y + 42 };
  }
  const enemy = this.battle.enemies.find((candidate) => candidate.uid === actorId);
  if (!enemy) return undefined;
  const slot = this.enemyBattleSlot(enemy, this.battle.enemies.indexOf(enemy));
  return { x: slot.x + slot.size / 2, y: slot.y + slot.size * 0.56 };
}

export function battleActorOffset(this: CrystalOathSceneContext, side: "party" | "enemy", actorId: string): Vec {
  const animation = this.battle?.animation;
  if (!animation || animation.action.side !== side || animation.action.actorId !== actorId) return { x: 0, y: 0 };
  const actor = this.battleActorCenter(side, actorId);
  const target =
    animation.targetSide && animation.targetActorId ? this.battleActorCenter(animation.targetSide, animation.targetActorId) : undefined;
  let vx = (target?.x ?? actor?.x ?? 0) - (actor?.x ?? 0);
  let vy = (target?.y ?? actor?.y ?? 0) - (actor?.y ?? 0);
  if (!target || Math.hypot(vx, vy) < 1) {
    vx = side === "party" ? -1 : 1;
    vy = 0;
  }
  const length = Math.max(1, Math.hypot(vx, vy));
  const outward = Phaser.Math.Clamp(animation.elapsed / animation.impactAt, 0, 1);
  const inward = Phaser.Math.Clamp((animation.elapsed - animation.impactAt) / Math.max(1, animation.duration - animation.impactAt), 0, 1);
  const phase = animation.elapsed <= animation.impactAt ? Phaser.Math.Easing.Cubic.Out(outward) : 1 - Phaser.Math.Easing.Cubic.In(inward);
  const distance = side === "party" ? (animation.targetSide ? 44 : 30) : 32;
  return { x: (vx / length) * distance * phase, y: (vy / length) * distance * phase };
}

export function selectedBattleEnemy(this: CrystalOathSceneContext): EnemyState | undefined {
  if (!this.battle || this.battle.phase !== "target") return undefined;
  return this.battle.enemies.filter((enemy) => enemy.hp > 0)[this.battle.selected];
}

export function drawBattleEnemy(this: CrystalOathSceneContext, enemy: EnemyState, x: number, y: number, size: number, targeted: boolean) {
  this.drawActorShadow(x + size / 2, y + size - 4, size * 0.82, 15);
  if (enemy.hp > 0 && enemy.intent) {
    this.g.fillStyle(0x07101d, 0.78).fillRect(x - 6, Math.max(6, y - 24), size + 12, 20);
    this.g.lineStyle(1, 0xfff0a8, 0.55).strokeRect(x - 6, Math.max(6, y - 24), size + 12, 20);
    this.text(x, Math.max(8, y - 21), `Intent: ${enemy.intent.label}`, 10, "#fff2a8", "left", { wordWrapWidth: size + 4, strokeThickness: 1 });
  }
  if (targeted) {
    this.g.fillStyle(0xfff0a8, 0.16).fillRect(x - 10, y - 10, size + 20, size + 36);
    this.g.lineStyle(3, 0xfff0a8, 1).strokeRect(x - 10, y - 10, size + 20, size + 36);
  }
  this.drawEnemySprite(enemy, x, y, enemy.boss ? 5 : 4, size);
  this.g.fillStyle(0x07101d, 0.82).fillRect(x - 6, y + size + 2, size + 12, 36);
  this.g.lineStyle(1, 0xffffff, enemy.hp <= 0 ? 0.2 : 0.55).strokeRect(x - 6, y + size + 2, size + 12, 36);
  this.text(x, y + size + 5, enemy.name, 13, enemy.hp <= 0 ? "#7a8190" : "#ffffff", "left", {
    strokeThickness: 2,
    wordWrapWidth: size + 4
  });
  this.drawBar(x, y + size + 25, size, 8, enemy.hp, enemy.maxHp, 0xd95252);
}

export function drawPartyBattler(this: CrystalOathSceneContext, member: CharacterState, x: number, y: number, idx: number, active: boolean) {
  const classId = PARTY_CLASS[member.id];
  const frame = this.battleCharacterFrame(member);
  const alpha = member.hp <= 0 ? 0.36 : 1;
  const bodyCenterX = x + 48;
  const feetBaselineY = y + 82;
  this.drawActorShadow(bodyCenterX, feetBaselineY - 4, 88, 16);
  if (active) {
    this.g.fillStyle(0xfff0a8, 0.16).fillEllipse(bodyCenterX, feetBaselineY - 4, 96, 24);
    this.g.lineStyle(3, 0xfff0a8, 0.9).strokeEllipse(bodyCenterX, feetBaselineY - 4, 96, 24);
  }
  if (!this.drawCharacterSpriteFrame(classId, frame, bodyCenterX, feetBaselineY, 250, LAYER_BATTLE_IMAGE, alpha)) {
    const palettes = {
      arlen: [0xf0c18d, 0xc9433f, 0xe9edf7, 0x362a4b],
      mira: [0xf1d0aa, 0xf5f2e8, 0x5fac73, 0x314c33],
      kael: [0xe1b284, 0x1c365d, 0xf0b13e, 0x121827]
    }[member.id];
    this.g.fillStyle(0x050812, alpha).fillRect(x + 12, y + 10, 24, 42);
    this.g.fillStyle(palettes[0], alpha).fillRect(x + 14, y, 18, 18);
    this.g.fillStyle(palettes[1], alpha).fillRect(x + 9, y + 18, 28, 31);
    this.g.fillStyle(palettes[2], alpha).fillRect(x + 16, y + 24, 10, 25);
    this.g.fillStyle(palettes[3], alpha).fillRect(x + 9, y + 49, 9, 12 + (idx % 2));
    this.g.fillRect(x + 28, y + 49, 9, 12 + ((idx + 1) % 2));
    if (member.id === "mira") {
      this.g.lineStyle(3, 0xeaf7ff, alpha).lineBetween(x + 38, y + 14, x + 48, y + 49);
      this.g.fillStyle(0x8ee8ff, alpha).fillCircle(x + 39, y + 13, 5);
    } else if (member.id === "kael") {
      this.g.fillStyle(0xf8d45a, alpha).fillTriangle(x + 34, y + 14, x + 48, y + 20, x + 36, y + 26);
    } else {
      this.g.fillStyle(0xdfe7ee, alpha).fillRect(x + 31, y + 22, 20, 6);
      this.g.fillStyle(0x657081, alpha).fillRect(x + 48, y + 20, 4, 10);
    }
  }
  if (active) this.drawActiveTurnMarker(bodyCenterX, y - 8);
}

export function drawActiveTurnMarker(this: CrystalOathSceneContext, cx: number, y: number) {
  const bob = Math.sin(this.time.now / 140) * 3;
  this.ui.fillStyle(0x050812, 0.45).fillTriangle(cx, y + bob + 3, cx - 13, y + bob - 12, cx + 13, y + bob - 12);
  this.ui.fillStyle(0xfff0a8, 1).fillTriangle(cx, y + bob + 1, cx - 10, y + bob - 11, cx + 10, y + bob - 11);
  this.ui.lineStyle(2, 0xffffff, 0.7).strokeTriangle(cx, y + bob + 1, cx - 10, y + bob - 11, cx + 10, y + bob - 11);
}

export function drawBattleTargetPanel(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number) {
  if (!this.battle) return;
  this.drawPanel(x, y, w, h);
  const target = this.selectedBattleEnemy();
  this.text(x + 16, y + 12, target ? "Target" : "Battle Log", 17, "#fff2a8");
  this.ui.fillStyle(0xfff0a8, 0.16).fillRect(x + 16, y + 35, w - 32, 1);
  if (target) {
    this.text(x + 16, y + 48, target.name, 18, "#ffffff", "left", { wordWrapWidth: w - 32 });
    this.text(x + 16, y + 74, `Intent: ${target.intent?.label ?? "Unknown"}`, 13, "#fff2a8", "left", { wordWrapWidth: w - 32 });
    const statuses = Object.keys(target.statuses).filter((s) => target.statuses[s as keyof StatusState]).join(" ") || "ok";
    this.text(x + 16, y + 94, `HP ${target.hp}/${target.maxHp}  ${statuses}`, 12, "#dce9ff", "left", { wordWrapWidth: w - 32 });
    this.drawBar(x + 16, y + 122, w - 32, 12, target.hp, target.maxHp, 0xd95252);
  } else {
    this.battle!.log.slice(-4).forEach((line, idx) => {
      const rowY = y + 46 + idx * 22;
      if (idx % 2 === 0) this.ui.fillStyle(0xffffff, 0.035).fillRect(x + 12, rowY - 3, w - 24, 20);
      this.text(x + 18, rowY, line, 13, "#ffffff", "left", { wordWrapWidth: w - 36 });
    });
  }
}

export function drawBattleCommandPanel(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number) {
  if (!this.battle) return;
  this.drawPanel(x, y, w, h);
  const actor = this.currentBattleActor();
  if (["command", "target", "skill", "spell", "item", "allyTarget"].includes(this.battle.phase) && actor) {
    const prompt =
      this.battle.phase === "command"
        ? `${actor.name}'s turn`
        : this.battle.phase === "target"
          ? `${actor.name}: choose target`
          : this.battle.phase === "skill"
            ? `${actor.name}: choose skill`
            : this.battle.phase === "spell"
              ? `${actor.name}: choose magic`
              : this.battle.phase === "item"
                ? `${actor.name}: choose item`
                : `${actor.name}: choose ally`;
    this.text(x + 16, y + 12, prompt, 14, "#fff2a8", "left", { wordWrapWidth: w - 32 });
    this.ui.fillStyle(0xfff0a8, 0.16).fillRect(x + 16, y + 35, w - 32, 1);
    this.battleOptions().forEach((option, idx) => {
      const selected = idx === this.battle!.selected;
      const rowY = y + 45 + idx * 18;
      if (selected) {
        this.ui.fillStyle(0xfff0a8, 0.16).fillRect(x + 12, rowY - 4, w - 24, 18);
        this.ui.lineStyle(1, 0xfff0a8, 0.72).strokeRect(x + 12, rowY - 4, w - 24, 18);
        this.drawCursor(x + 16, rowY - 1);
      }
      const prefix = selected && !this.hasTexture("ui_cursor_arrow") ? ">" : " ";
      this.text(x + 36, rowY - 3, `${prefix} ${option}`, 12, "#ffffff", "left", { wordWrapWidth: w - 48 });
    });
  } else {
    this.text(x + 16, y + 16, this.battle.phase === "resolving" ? this.currentBattleActorName() : "Continue", 16, "#fff2a8", "left", {
      wordWrapWidth: w - 32
    });
    this.text(x + 16, y + 54, this.battle.phase === "log" ? "Enter continues" : "Resolving...", 14, "#ffffff");
  }
}

export function drawBattleStatusPanel(this: CrystalOathSceneContext, x: number, y: number, w: number, h: number) {
  if (!this.battle) return;
  this.drawPanel(x, y, w, h);
  this.text(x + 16, y + 12, `Now: ${this.currentBattleActorName()}`, 15, "#fff2a8", "left", { wordWrapWidth: w - 32 });
  this.ui.fillStyle(0xfff0a8, 0.16).fillRect(x + 16, y + 35, w - 32, 1);
  this.party.forEach((c, idx) => {
    const rowY = y + 43 + idx * 29;
    const active =
      this.currentBattleEntry()?.side === "party" &&
      this.currentBattleEntry()?.actorId === c.id &&
      !this.battle?.animation &&
      this.battle?.phase !== "resolving";
    const statuses = Object.keys(c.statuses).filter((s) => c.statuses[s as keyof StatusState]).join(" ") || "ok";
    if (active) this.ui.fillStyle(0xfff0a8, 0.14).fillRect(x + 10, rowY - 5, w - 20, 26);
    this.text(x + 16, rowY - 1, c.name, 13, c.hp <= 0 ? "#858b98" : "#ffffff", "left", { wordWrapWidth: 80 });
    this.text(x + 96, rowY - 1, `${c.hp}/${c.maxHp}`, 12, "#dce9ff", "left", { wordWrapWidth: 70 });
    this.drawBar(x + 164, rowY + 2, 110, 9, c.hp, c.maxHp, 0x54bb77);
    this.text(x + 286, rowY - 1, `T ${c.charges["1"].current}/${c.charges["2"].current}/${c.charges["3"].current}`, 12, "#c5d2f2", "left", {
      wordWrapWidth: 54
    });
    this.text(x + 338, rowY - 1, statuses, 12, statuses === "ok" ? "#96d7a5" : "#ffd98a", "left", { wordWrapWidth: 52 });
  });
  this.ui.fillStyle(0xffffff, 0.045).fillRect(x + 12, y + h - 28, w - 24, 18);
  this.text(x + 18, y + h - 27, `Next: ${this.turnPreviewText()}`, 12, "#cbd6ff", "left", { wordWrapWidth: w - 36 });
}
