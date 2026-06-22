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

export function allEnemiesDefeated(this: CrystalOathSceneContext): boolean {
  return !!this.battle && this.battle.enemies.every((e) => e.hp <= 0);
}

export function allPartyDefeated(this: CrystalOathSceneContext): boolean {
  return this.party.every((c) => c.hp <= 0);
}

export function randomLivingPartyMember(this: CrystalOathSceneContext): CharacterState | undefined {
  return Phaser.Utils.Array.GetRandom(this.party.filter((c) => c.hp > 0));
}

export function consumeSkipStatus(this: CrystalOathSceneContext, actor: CharacterState | EnemyState): boolean {
  if (actor.statuses.stun) {
    delete actor.statuses.stun;
    return true;
  }
  if (actor.statuses.sleep) {
    if (Phaser.Math.Between(1, 100) <= 45) delete actor.statuses.sleep;
    else {
      actor.statuses.sleep -= 1;
      if (actor.statuses.sleep <= 0) delete actor.statuses.sleep;
      return true;
    }
  }
  return false;
}

export function applyTurnStartStatuses(this: CrystalOathSceneContext, actor: CharacterState | EnemyState): boolean {
  if (!this.battle) return false;
  if (actor.hp > 0 && actor.statuses.poison) {
    const damage = Math.max(1, Math.floor(actor.maxHp * 0.05));
    actor.hp = Math.max(0, actor.hp - damage);
    this.battle.log.push(`${actor.name} suffers ${damage} poison damage.`);
    if (actor.hp <= 0) return true;
  }
  if (actor.hp > 0 && actor.statuses.burn) {
    const damage = Math.max(1, Math.floor(actor.maxHp * 0.04));
    actor.hp = Math.max(0, actor.hp - damage);
    this.battle.log.push(`${actor.name} burns for ${damage}.`);
    if (actor.hp <= 0) return true;
  }
  if (actor.hp > 0 && actor.statuses.bleed) {
    const damage = Math.max(1, Math.floor(actor.maxHp * 0.03));
    actor.hp = Math.max(0, actor.hp - damage);
    this.battle.log.push(`${actor.name} bleeds for ${damage}.`);
    if (actor.hp <= 0) return true;
  }
  if (this.consumeSkipStatus(actor)) {
    this.battle.log.push(`${actor.name} cannot act.`);
    return true;
  }
  return false;
}

export function checkBattleEnd(this: CrystalOathSceneContext): boolean {
  if (!this.battle) return true;
  if (this.allEnemiesDefeated()) {
    this.awardVictory();
    return true;
  }
  if (this.allPartyDefeated()) {
    this.battle.log = ["The party falls beneath the dimming stars..."];
    this.mode = "gameOver";
    this.audio.setMode("title");
    return true;
  }
  return false;
}

export function tickStatus(this: CrystalOathSceneContext, actor: CharacterState | EnemyState) {
  for (const key of ["ward", "starveil", "silence", "burn", "bleed", "weakness", "guarded", "charged"] as (keyof StatusState)[]) {
    if (actor.statuses[key]) {
      actor.statuses[key]! -= 1;
      if (actor.statuses[key]! <= 0) delete actor.statuses[key];
    }
  }
}

export function statusActive(this: CrystalOathSceneContext, actor: CharacterState | EnemyState, status: keyof StatusState): boolean {
  return !!actor.statuses[status];
}

export function awardVictory(this: CrystalOathSceneContext) {
  if (!this.battle || this.battle.victoryAwarded) return;
  const xp = this.battle.enemies.reduce((sum, e) => sum + e.xp, 0) * this.settings.xpMultiplier;
  const gold = this.battle.enemies.reduce((sum, e) => sum + e.gold, 0);
  this.gold += gold;
  this.battle.log.push(`Victory! Gained ${xp} XP and ${gold} gold.`);
  for (const member of this.party) {
    member.xp += xp;
    while (member.level < 12 && member.xp >= member.nextXp) {
      member.xp -= member.nextXp;
      member.level += 1;
      member.nextXp = Math.floor(42 + member.level * member.level * 26);
      member.maxHp += member.id === "arlen" ? 9 : member.id === "mira" ? 6 : 5;
      if (member.hp > 0) member.hp = member.maxHp;
      member.baseAttack += member.id === "arlen" ? 2 : 1;
      member.baseDefense += member.id === "arlen" ? 2 : 1;
      if (member.level % 2 === 0) member.speed += 1;
      if (member.level % 3 === 0) member.luck += 1;
      if (member.id === "arlen" && member.level >= 7 && !member.spells.includes("rally")) member.spells.push("rally");
      this.refreshCharges(member, true);
      this.battle.log.push(`${member.name} reached level ${member.level}!`);
    }
  }
  if (this.battle.kind === "random") {
    const bestEnemy = [...this.battle.enemies].sort((a, b) => b.xp + b.gold - (a.xp + a.gold))[0];
    const dropChance = Phaser.Math.Clamp(20 + Math.floor((bestEnemy?.xp ?? 0) / 10), 20, 38);
    if (Phaser.Math.Between(1, 100) <= dropChance) {
      const loot = bestEnemy && bestEnemy.xp > 60 ? Phaser.Utils.Array.GetRandom(["etherleaf", "phoenixAsh", "smokeBomb"]) : Phaser.Utils.Array.GetRandom(["potion", "antidote", "potion"]);
      this.inventory[loot] = (this.inventory[loot] ?? 0) + 1;
      this.battle.log.push(`Found ${ITEMS[loot].name}.`);
    }
  }
  this.battle.victoryAwarded = true;
  this.battle.phase = "log";
  this.audio.blip("victory");
}

export function advanceBattleLog(this: CrystalOathSceneContext) {
  if (!this.battle) return;
  if (this.allEnemiesDefeated() && this.battle.victoryAwarded) {
    this.finishBattle(true);
    return;
  }
  if (this.allPartyDefeated()) {
    this.mode = "gameOver";
    this.audio.setMode("title");
    return;
  }
  this.battle.phase = "resolving";
  this.battle.selected = 0;
  this.battle.actionTimer = BATTLE_TURN_DELAY_MS;
}

export function finishBattle(this: CrystalOathSceneContext, won: boolean) {
  if (!this.battle) return;
  const wasBoss = this.battle.kind === "boss";
  const dungeonId = this.battle.dungeonId;
  const bossId = this.battle.bossId;
  this.battle = undefined;
  if (!won) {
    this.mode = dungeonId ? "dungeon" : "world";
    this.syncAllVisualPositions();
    this.audio.setMode(this.mode === "dungeon" ? "dungeon" : "world");
    return;
  }
  if (wasBoss && dungeonId && bossId) {
    const dungeon = this.dungeons()[dungeonId];
    this.defeatedBosses.add(bossId);
    this.clearedDungeons.add(dungeonId);
    if (dungeon.relic) this.flags.relics[dungeon.relic] = true;
    this.mode = "dungeon";
    this.syncAllVisualPositions();
    this.audio.setMode("dungeon");
    const extra: string[] = [];
    if (dungeonId === "mossCave") {
      this.gold += 30;
      extra.push("The cave hoard yields 30 gold for passage.");
    }
    if (dungeonId === "tideShrine") {
      this.inventory.charteredCompass = Math.max(1, this.inventory.charteredCompass ?? 0);
      this.flags.travel.unlockedIsland3 = true;
      this.flags.travel.unlockedFrostmere = true;
      this.flags.travel.unlockedHighspire = true;
      extra.push("The boss drops a Chartered Compass. Frostmere and Highspire routes are now charted.");
    }
    if (dungeon.relic === "gale") {
      this.flags.skyship = true;
      extra.push("The Gale Relic reveals a high road. Visit Starfall Gate with all four relics.");
    }
    if (bossId === "eclipseCrown") {
      this.mode = "ending";
      this.audio.setMode("ending");
      this.saveGame();
      return;
    }
    this.saveGame();
    this.say([...dungeon.rewardText, ...extra], () => {
      this.mode = "dungeon";
      this.audio.setMode("dungeon");
    });
  } else {
    this.mode = dungeonId ? "dungeon" : "world";
    this.syncAllVisualPositions();
    this.audio.setMode(this.mode === "dungeon" ? "dungeon" : "world");
  }
}

export function physicalDamage(this: CrystalOathSceneContext, power: number, defense: number, luck: number) {
  const critical = Phaser.Math.Between(1, 100) <= Phaser.Math.Clamp(5 + luck, 5, 15);
  const amount = Math.max(1, power + Phaser.Math.Between(0, 4) - defense);
  return { amount: critical ? Math.floor(amount * 1.75) : amount, critical };
}

export function attackPower(this: CrystalOathSceneContext, actor: CharacterState): number {
  return actor.baseAttack + (WEAPONS[actor.weapon]?.power ?? 0);
}

export function defensePower(this: CrystalOathSceneContext, actor: CharacterState): number {
  return actor.baseDefense + (ARMORS[actor.armor]?.power ?? 0) + (actor.statuses.ward ? 4 : 0) + (actor.statuses.guarded ? 5 : 0);
}

export function effectiveEnemyDefense(this: CrystalOathSceneContext, enemy: EnemyState): number {
  return Math.max(0, enemy.defense + (enemy.statuses.guarded ? 5 : 0) - (enemy.statuses.weakness ? 5 : 0));
}

export function enemyDanger(this: CrystalOathSceneContext): number {
  if (!this.battle) return 0;
  return Math.max(...this.battle.enemies.filter((e) => e.hp > 0).map((e) => e.speed + e.attack / 3), 0);
}

export function partyAverage(this: CrystalOathSceneContext, stat: "speed" | "luck"): number {
  const living = this.party.filter((c) => c.hp > 0);
  return living.reduce((sum, c) => sum + c[stat], 0) / Math.max(1, living.length);
}

export function refreshCharges(this: CrystalOathSceneContext, member: CharacterState, fill: boolean) {
  const tier1 = member.id === "arlen" ? (member.level >= 7 ? 1 : 0) : 2 + Math.floor(member.level / 2);
  const tier2 = member.level >= 4 ? 1 + Math.floor((member.level - 4) / 3) : 0;
  const tier3 = member.level >= 8 ? 1 + Math.floor((member.level - 8) / 4) : 0;
  const maxes = { "1": tier1, "2": member.id === "arlen" ? (member.level >= 7 ? 1 : 0) : tier2, "3": member.id === "arlen" ? 0 : tier3 };
  for (const tier of ["1", "2", "3"]) {
    const current = member.charges[tier]?.current ?? 0;
    member.charges[tier] = { max: maxes[tier], current: fill ? maxes[tier] : Math.min(current, maxes[tier]) };
  }
}

export function applyWalkPoison(this: CrystalOathSceneContext) {
  if (this.lastStepFrame % 4 !== 0) return;
  for (const member of this.party) {
    if (member.hp > 1 && member.statuses.poison) member.hp -= 1;
  }
}

export function hasAllRelics(this: CrystalOathSceneContext): boolean {
  return this.flags.relics.root && this.flags.relics.flame && this.flags.relics.tide && this.flags.relics.gale;
}
