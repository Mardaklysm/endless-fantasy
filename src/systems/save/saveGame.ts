import { SAVE_KEY } from "../../app/config";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function saveGame(this: CrystalOathSceneContext) {
  const payload = {
    party: this.party,
    inventory: this.inventory,
    gearBag: this.gearBag,
    gold: this.gold,
    worldSeed: this.worldSeed,
    currentIslandId: this.currentIslandId,
    worldPos: this.worldPos,
    townPos: this.townPos,
    dungeonPos: this.dungeonPos,
    currentTown: this.currentTown,
    currentDungeon: this.currentDungeon,
    dungeonFloor: this.dungeonFloor,
    flags: this.flags,
    openedChests: [...this.openedChests],
    discoveredPois: [...this.discoveredPois],
    puzzleFlags: [...this.puzzleFlags],
    defeatedBosses: [...this.defeatedBosses],
    clearedDungeons: [...this.clearedDungeons],
    settings: this.settings,
    encounterCounter: this.encounterCounter
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
}
