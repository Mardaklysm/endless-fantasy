import { SAVE_KEY } from "../../app/config";
import { createWorldSeed, getIslandAt } from "../../world/worldGenerator";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function loadGame(this: CrystalOathSceneContext): boolean {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    this.buildWorldFromSeed(data.worldSeed ?? createWorldSeed());
    this.party = this.normalizeParty(data.party ?? []);
    this.inventory = { potion: 0, antidote: 0, tent: 0, phoenixAsh: 0, etherleaf: 0, smokeBomb: 0, charteredCompass: 0, ...(data.inventory ?? {}) };
    this.gearBag = data.gearBag ?? {};
    this.gold = data.gold ?? 0;
    this.currentIslandId = data.currentIslandId ?? getIslandAt(this.generatedWorld!, data.worldPos?.x ?? 0, data.worldPos?.y ?? 0)?.id ?? "greenhaven";
    this.worldPos = data.worldPos ?? this.generatedWorld?.startPosition ?? { x: 10, y: 22 };
    this.townPos = data.townPos ?? { x: 10, y: 12 };
    this.dungeonPos = data.dungeonPos ?? { x: 1, y: 1 };
    this.currentTown = data.currentTown ?? "dawnford";
    this.currentDungeon = data.currentDungeon ?? "mossCave";
    this.dungeonFloor = data.dungeonFloor ?? 0;
    this.flags = this.normalizeFlags(data.flags);
    this.openedChests = new Set(data.openedChests ?? []);
    this.discoveredPois = new Set(data.discoveredPois ?? data.discoveredPoints ?? []);
    this.visitedLocationIds = new Set(data.visitedLocationIds ?? data.discoveredPois ?? data.discoveredPoints ?? []);
    this.puzzleFlags = new Set(data.puzzleFlags ?? []);
    this.defeatedBosses = new Set(data.defeatedBosses ?? []);
    this.clearedDungeons = new Set(data.clearedDungeons ?? []);
    this.settings = { ...this.settings, ...data.settings };
    this.audio.setMuted(this.settings.muted);
    this.encounterCounter = data.encounterCounter ?? 10;
    this.setWorldTimeTicks(data.worldTimeTicks ?? 0);
    this.ensureValidDungeonPosition();
    if (!this.canOccupyExploreTile("world", this.worldPos.x, this.worldPos.y)) {
      this.worldPos = { ...(this.generatedWorld?.startPosition ?? { x: 10, y: 22 }) };
    }
    this.syncCurrentIslandFromWorldPos();
    this.markCurrentLocationVisited();
    this.mode = "world";
    this.clearHeldMovement();
    this.syncAllVisualPositions();
    this.audio.setMode("world");
    this.markDirty();
    return true;
  } catch {
    return false;
  }
}
