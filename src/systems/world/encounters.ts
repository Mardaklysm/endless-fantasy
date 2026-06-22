import Phaser from "phaser";
import { WORLD_TABLES } from "../../data/battleTables";
import type { DungeonDef } from "../../data/gameDataTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function maybeEncounter(this: CrystalOathSceneContext) {
  if (!this.settings.encounters) return;
  const tableKey = this.worldEncounterKeyAt(this.worldPos.x, this.worldPos.y);
  if (!tableKey) return;
  this.encounterCounter -= tableKey === "forest" || tableKey === "hills" || tableKey === "final" ? 2 : 1;
  if (this.encounterCounter <= 0) {
    this.encounterCounter = Phaser.Math.Between(7, 15);
    this.startRandomBattle(WORLD_TABLES[tableKey]);
  }
}

export function maybeDungeonEncounter(this: CrystalOathSceneContext, dungeon: DungeonDef) {
  if (!this.settings.encounters) return;
  this.encounterCounter -= 1;
  if (this.encounterCounter <= 0) {
    this.encounterCounter = Phaser.Math.Between(6, 12);
    this.startRandomBattle(dungeon.encounterTable, dungeon.id);
  }
}
