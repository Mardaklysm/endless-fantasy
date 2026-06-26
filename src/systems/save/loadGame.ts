import { SAVE_KEY } from "../../app/config";
import { perfNow, perfRecordSaveLoad } from "../../debug/perf";
import { createWorldSeed, getIslandAt } from "../../world/worldGenerator";
import type { CharacterState } from "../../data/gameDataTypes";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";
import { loadStoredGameSettings, mergeGameSettings, persistGameSettings } from "../settings/gameSettings";

const LEGACY_HERO_IDS: Partial<Record<string, CharacterState["id"]>> = {
  arlen: "fighter",
  mira: "priest",
  kael: "mage"
};

export function loadGame(this: CrystalOathSceneContext): boolean {
  const saveLoadStartMs = perfNow();
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    perfRecordSaveLoad(this, perfNow() - saveLoadStartMs);
    return false;
  }
  try {
    const data = JSON.parse(raw);
    perfRecordSaveLoad(this, perfNow() - saveLoadStartMs);
    this.buildWorldFromSeed(data.worldSeed ?? createWorldSeed());
    this.party = this.normalizeParty(migrateLegacyPartyIds(data.party ?? []));
    this.inventory = { potion: 0, antidote: 0, tent: 0, phoenixAsh: 0, etherleaf: 0, smokeBomb: 0, charteredCompass: 0, ...(data.inventory ?? {}) };
    this.gearBag = data.gearBag ?? {};
    this.gold = data.gold ?? 0;
    this.currentIslandId = data.currentIslandId ?? getIslandAt(this.generatedWorld!, data.worldPos?.x ?? 0, data.worldPos?.y ?? 0)?.id ?? "greenhaven";
    this.worldPos = data.worldPos ?? this.generatedWorld?.startPosition ?? { x: 10, y: 22 };
    this.dungeonPos = data.dungeonPos ?? { x: 1, y: 1 };
    this.currentDungeon = data.currentDungeon ?? "mossCave";
    this.dungeonFloor = data.dungeonFloor ?? 0;
    this.flags = this.normalizeFlags(data.flags);
    this.openedChests = new Set(data.openedChests ?? []);
    this.discoveredPois = new Set(data.discoveredPois ?? data.discoveredPoints ?? []);
    this.visitedLocationIds = new Set(data.visitedLocationIds ?? data.discoveredPois ?? data.discoveredPoints ?? []);
    this.puzzleFlags = new Set(data.puzzleFlags ?? []);
    this.defeatedBosses = new Set(data.defeatedBosses ?? []);
    this.clearedDungeons = new Set(data.clearedDungeons ?? []);
    this.settings = mergeGameSettings(data.settings, loadStoredGameSettings());
    this.audio.setMuted(this.settings.muted);
    persistGameSettings(this.settings);
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
    this.prewarmWorldTerrainChunksForCurrentView(1);
    this.audio.setMode("world");
    this.markDirty();
    return true;
  } catch {
    perfRecordSaveLoad(this, perfNow() - saveLoadStartMs);
    return false;
  }
}

function migrateLegacyPartyIds(rawParty: CharacterState[]): CharacterState[] {
  return rawParty.map((member) => ({
    ...member,
    id: LEGACY_HERO_IDS[member.id] ?? member.id
  }));
}
