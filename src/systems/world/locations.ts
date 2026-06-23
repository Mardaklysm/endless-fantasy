import Phaser from "phaser";
import { WORLD_TABLES } from "../../data/battleTables";
import type { LocationDef } from "../../data/gameDataTypes";
import { isWorldTileWalkable, worldTileEncounterFamily, worldTileHasTag } from "../../data/worldTiles";
import type { Terrain } from "../../scene/sceneTypes";
import { getIslandAt } from "../../world/worldGenerator";
import type { IslandTheme } from "../../world/worldGenerator";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function canEnterTerrain(this: CrystalOathSceneContext, terrain: Terrain): boolean {
  return isWorldTileWalkable(terrain);
}

export function terrainEncounterKey(this: CrystalOathSceneContext, terrain: Terrain): keyof typeof WORLD_TABLES | undefined {
  if (worldTileHasTag(terrain, "road") || worldTileHasTag(terrain, "bridge")) return undefined;
  return worldTileEncounterFamily(terrain) as keyof typeof WORLD_TABLES | undefined;
}

export function worldEncounterKeyAt(this: CrystalOathSceneContext, x: number, y: number): keyof typeof WORLD_TABLES | undefined {
  const terrain = this.world[y]?.[x];
  if (!terrain || this.isRoadAt(x, y)) return undefined;
  const islandId = this.generatedWorld?.islandByTile[y]?.[x] ?? this.currentIslandId;
  const biome = this.generatedWorld?.biomes[y]?.[x];
  if (biome === "forest") return islandId === "coralreach" ? "forest" : "forest";
  if ((islandId === "highspire" || islandId === "ashfall") && (biome === "darkland" || biome === "lava" || biome === "mountain")) return "final";
  if (islandId === "frostmere" && (biome === "snow" || biome === "mountain")) return "hills";
  if (islandId === "coralreach" && biome === "desert") return "sand";
  return this.terrainEncounterKey(terrain);
}

export function isRoadAt(this: CrystalOathSceneContext, x: number, y: number): boolean {
  return !!this.generatedWorld?.roads.some((road) => road.x === x && road.y === y);
}

export function syncCurrentIslandFromWorldPos(this: CrystalOathSceneContext) {
  const island = this.generatedWorld ? getIslandAt(this.generatedWorld, this.worldPos.x, this.worldPos.y) : undefined;
  if (island) this.currentIslandId = island.id;
}

export function currentIslandName(this: CrystalOathSceneContext): string {
  return this.generatedWorld?.islands.find((island) => island.id === this.currentIslandId)?.name ?? "Open Sea";
}

export function currentIslandTheme(this: CrystalOathSceneContext): IslandTheme | undefined {
  return this.generatedWorld?.islands.find((island) => island.id === this.currentIslandId)?.theme;
}

export function interactWorldLocation(this: CrystalOathSceneContext, loc: LocationDef) {
  if (loc.islandId) this.currentIslandId = loc.islandId;
  if (this.markLocationVisited(loc.id)) this.saveGame();
  if (loc.kind === "harbor") {
    this.openHarborMenu(loc);
    return;
  }
  if (loc.kind === "landmark") this.discoverLandmark(loc);
}

export function markLocationVisited(this: CrystalOathSceneContext, locationId: string | undefined): boolean {
  if (!locationId || this.visitedLocationIds.has(locationId)) return false;
  this.visitedLocationIds.add(locationId);
  this.markDirty();
  return true;
}

export function isLocationVisited(this: CrystalOathSceneContext, locationId: string | undefined): boolean {
  return !!locationId && this.visitedLocationIds.has(locationId);
}

export function markCurrentLocationVisited(this: CrystalOathSceneContext): boolean {
  const current = this.locationAt(this.worldPos.x, this.worldPos.y) ?? this.locations().find((loc) => loc.id === this.currentTown || loc.id === this.currentDungeon);
  return this.markLocationVisited(current?.id);
}

export function discoverLandmark(this: CrystalOathSceneContext, loc: LocationDef) {
  const landmarkKind = loc.landmarkKind ?? "ruins";
  if (this.discoveredPois.has(loc.id)) {
    if (landmarkKind === "secretMerchant") {
      this.openShop(`${loc.name}`, [
        { id: "potion", type: "item" },
        { id: "phoenixAsh", type: "item" },
        { id: "etherleaf", type: "item" },
        { id: "smokeBomb", type: "item" },
        { id: "glassWand", type: "gear" }
      ]);
    }
    return;
  }
  this.discoveredPois.add(loc.id);
  const tier = loc.difficultyTier ?? 1;
  const rewardGold = 10 + tier * 8;
  if (landmarkKind === "shipwreck") {
    this.gold += rewardGold;
    this.saveGame();
    if (Phaser.Math.Between(1, 100) <= 35) {
      this.say([`The shipwreck yields ${rewardGold} gold, but something coils beneath the planks.`], () => this.startRandomBattle(["reefCrab", "seaSerpent"], undefined));
    } else this.say([`You search the shipwreck and recover ${rewardGold} gold.`]);
    return;
  }
  if (landmarkKind === "shrine") {
    for (const member of this.party) if (member.hp > 0) member.hp = Math.min(member.maxHp, member.hp + Math.floor(member.maxHp * 0.4));
    this.saveGame();
    this.say([`${loc.name} glows softly. The party's wounds close.`]);
    return;
  }
  if (landmarkKind === "hiddenChest") {
    this.gold += rewardGold;
    this.inventory.etherleaf = (this.inventory.etherleaf ?? 0) + 1;
    this.saveGame();
    this.say([`A hidden cache snaps open. Found ${rewardGold} gold and Etherleaf.`]);
    return;
  }
  if (landmarkKind === "monsterNest") {
    this.gold += Math.floor(rewardGold / 2);
    this.saveGame();
    this.say([`${loc.name} stirs. Clearing it should make the island safer.`], () => this.startRandomBattle(this.currentIslandId === "highspire" || this.currentIslandId === "ashfall" ? ["ashGolem", "coalKnight"] : ["greenWolf", "bandit"], undefined));
    return;
  }
  if (landmarkKind === "secretMerchant") {
    this.openShop(`${loc.name}`, [
      { id: "potion", type: "item" },
      { id: "phoenixAsh", type: "item" },
      { id: "etherleaf", type: "item" },
      { id: "smokeBomb", type: "item" },
      { id: "glassWand", type: "gear" }
    ]);
    return;
  }
  if (landmarkKind === "resourceNode") {
    this.gearBag.ringMail = (this.gearBag.ringMail ?? 0) + 1;
    this.saveGame();
    this.say([`You mine glittering ore and shape it into usable Ring Mail.`]);
    return;
  }
  if (landmarkKind === "ancientDoor") {
    this.saveGame();
    this.say([this.hasAllRelics() ? "The ancient door hums with fourfold light, pointing toward Starfall Gate." : "The ancient door waits for four relic lights."]);
    return;
  }
  this.gold += rewardGold;
  this.saveGame();
  this.say([`${loc.name} whispers old island lore. Found ${rewardGold} gold among the stones.`]);
}
