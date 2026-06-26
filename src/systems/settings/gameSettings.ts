export type SailingSpeedMultiplier = 1 | 2 | 3 | 4;

export interface GameSettings {
  encounters: boolean;
  xpMultiplier: 1 | 2 | 4;
  fastText: boolean;
  muted: boolean;
  debug: {
    allHarborRoutes: boolean;
    sailingSpeedMultiplier: SailingSpeedMultiplier;
  };
}

const SETTINGS_STORAGE_KEY = "crystal-oath-settings-v1";

export const SAILING_SPEED_MULTIPLIERS: readonly SailingSpeedMultiplier[] = [1, 2, 3, 4];

export function createDefaultGameSettings(): GameSettings {
  return {
    encounters: true,
    xpMultiplier: 1,
    fastText: false,
    muted: false,
    debug: {
      allHarborRoutes: false,
      sailingSpeedMultiplier: 1
    }
  };
}

export function settingsForNewGame(current: GameSettings): GameSettings {
  return normalizeGameSettings(
    {
      ...current,
      encounters: true,
      xpMultiplier: 1,
      fastText: false
    },
    createDefaultGameSettings()
  );
}

export function mergeGameSettings(...sources: unknown[]): GameSettings {
  let settings = createDefaultGameSettings();
  for (const source of sources) settings = normalizeGameSettings(source, settings);
  return settings;
}

export function normalizeGameSettings(raw: unknown, fallback: GameSettings = createDefaultGameSettings()): GameSettings {
  const value = isRecord(raw) ? raw : {};
  const debug = isRecord(value.debug) ? value.debug : {};
  return {
    encounters: booleanOr(value.encounters, fallback.encounters),
    xpMultiplier: normalizeXpMultiplier(value.xpMultiplier, fallback.xpMultiplier),
    fastText: booleanOr(value.fastText, fallback.fastText),
    muted: booleanOr(value.muted, fallback.muted),
    debug: {
      allHarborRoutes: booleanOr(debug.allHarborRoutes, fallback.debug.allHarborRoutes),
      sailingSpeedMultiplier: normalizeSailingSpeedMultiplier(debug.sailingSpeedMultiplier, fallback.debug.sailingSpeedMultiplier)
    }
  };
}

export function loadStoredGameSettings(): GameSettings | undefined {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? normalizeGameSettings(JSON.parse(raw)) : undefined;
  } catch (error) {
    console.warn("Unable to load stored game settings.", error);
    return undefined;
  }
}

export function persistGameSettings(settings: GameSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalizeGameSettings(settings)));
  } catch (error) {
    console.warn("Unable to persist game settings.", error);
  }
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeXpMultiplier(value: unknown, fallback: GameSettings["xpMultiplier"]): GameSettings["xpMultiplier"] {
  return value === 1 || value === 2 || value === 4 ? value : fallback;
}

function normalizeSailingSpeedMultiplier(value: unknown, fallback: SailingSpeedMultiplier): SailingSpeedMultiplier {
  return value === 1 || value === 2 || value === 3 || value === 4 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
