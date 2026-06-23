type PerfPhaseName = "enterOverworld";

interface PerfPhase {
  name: PerfPhaseName;
  source: string;
  startMs: number;
  worldgenMs: number;
  textureCacheMs: number;
  minimapMs: number;
  objectMs: number;
  firstRenderMs: number;
  chunkCreates: number;
  chunkCreateMs: number;
  chunkHits: number;
  chunkMisses: number;
  evictions: number;
  maxChunkMs: number;
  maxChunkKey: string;
  logged: boolean;
}

interface PerfState {
  enabled: boolean;
  preloadStartMs: number;
  preloadAssetsMs: number;
  createStartMs: number;
  startupWorldgenMs: number;
  startupTextureCacheMs: number;
  startupSaveLoadMs: number;
  startupLogged: boolean;
  phase?: PerfPhase;
  frameStartMs: number;
  frameChunkCreateMs: number;
  frameChunkCreates: number;
  frameChunkKey: string;
  frameMinimapMs: number;
  frameObjectMs: number;
  totalChunkCreates: number;
  totalChunkCreateMs: number;
  totalChunkHits: number;
  totalChunkMisses: number;
  totalEvictions: number;
  totalMinimapRebuilds: number;
  totalMinimapMs: number;
  totalObjectMs: number;
  totalObjectPasses: number;
  lastSummaryMs: number;
}

const PERF_STORAGE_KEY = "crystal_oath_perf";
const SUMMARY_INTERVAL_MS = 5000;
const states = new WeakMap<object, PerfState>();

export function perfNow(): number {
  return performance.now();
}

export function perfEnabled(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    const query = new URLSearchParams(window.location.search);
    if (query.has("perf")) return query.get("perf") !== "0";
    return localStorage.getItem(PERF_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function perfAutoMode(): string {
  if (!perfEnabled()) return "";
  try {
    return new URLSearchParams(window.location.search).get("perfAuto") ?? "";
  } catch {
    return "";
  }
}

export function perfStartPreload(scene: object): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.preloadStartMs = perfNow();
}

export function perfEndPreload(scene: object): void {
  const state = getPerfState(scene);
  if (!state.enabled || state.preloadStartMs <= 0) return;
  state.preloadAssetsMs = perfNow() - state.preloadStartMs;
}

export function perfStartCreate(scene: object): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.createStartMs = perfNow();
}

export function perfEndCreate(scene: object): void {
  const state = getPerfState(scene);
  if (!state.enabled || state.startupLogged) return;
  const now = perfNow();
  const sceneMs = state.createStartMs > 0 ? now - state.createStartMs : 0;
  const totalMs = state.preloadStartMs > 0 ? now - state.preloadStartMs : sceneMs;
  console.info(
    `[perf] startup assets=${fmt(state.preloadAssetsMs)}ms scene=${fmt(sceneMs)}ms saveLoad=${fmt(state.startupSaveLoadMs)}ms worldgen=${fmt(
      state.startupWorldgenMs
    )}ms textureCache=${fmt(state.startupTextureCacheMs)}ms total=${fmt(totalMs)}ms`
  );
  state.startupLogged = true;
  state.lastSummaryMs = now;
}

export function perfRecordWorldgen(scene: object, ms: number): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  if (state.phase) state.phase.worldgenMs += ms;
  else state.startupWorldgenMs += ms;
}

export function perfRecordTextureCache(scene: object, ms: number): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  if (state.phase) state.phase.textureCacheMs += ms;
  else state.startupTextureCacheMs += ms;
}

export function perfRecordSaveLoad(scene: object, ms: number): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.startupSaveLoadMs += ms;
}

export function perfStartEnterOverworld(scene: object, source: string): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.phase = {
    name: "enterOverworld",
    source,
    startMs: perfNow(),
    worldgenMs: 0,
    textureCacheMs: 0,
    minimapMs: 0,
    objectMs: 0,
    firstRenderMs: 0,
    chunkCreates: 0,
    chunkCreateMs: 0,
    chunkHits: 0,
    chunkMisses: 0,
    evictions: 0,
    maxChunkMs: 0,
    maxChunkKey: "",
    logged: false
  };
}

export function perfStartFrame(scene: object): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.frameStartMs = perfNow();
  state.frameChunkCreateMs = 0;
  state.frameChunkCreates = 0;
  state.frameChunkKey = "";
  state.frameMinimapMs = 0;
  state.frameObjectMs = 0;
}

export function perfEndFrame(scene: object, deltaMs: number, cacheSize: number): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  const now = perfNow();
  const workMs = state.frameStartMs > 0 ? now - state.frameStartMs : 0;
  const threshold = deltaMs >= 100 || workMs >= 100 ? 100 : deltaMs >= 50 || workMs >= 50 ? 50 : 0;
  if (threshold > 0) {
    const reason =
      state.frameChunkCreates > 0
        ? `chunkCreate chunk=${state.frameChunkKey || "unknown"} time=${fmt(state.frameChunkCreateMs)}ms`
        : state.frameMinimapMs > 0
          ? `minimap time=${fmt(state.frameMinimapMs)}ms`
          : state.frameObjectMs > 0
            ? `objects time=${fmt(state.frameObjectMs)}ms`
            : "frameWork";
    console.info(
      `[perf] spike dt=${fmt(deltaMs)}ms work=${fmt(workMs)}ms reason=${reason} cache=${cacheSize} hits=${state.totalChunkHits} misses=${state.totalChunkMisses}`
    );
  }
  if (now - state.lastSummaryMs >= SUMMARY_INTERVAL_MS) {
    console.info(
      `[perf] overworld chunks=${state.totalChunkCreates} create=${fmt(state.totalChunkCreateMs)}ms hits=${state.totalChunkHits} misses=${state.totalChunkMisses} evict=${state.totalEvictions} minimap=${state.totalMinimapRebuilds}/${fmt(state.totalMinimapMs)}ms objects=${state.totalObjectPasses}/${fmt(state.totalObjectMs)}ms cache=${cacheSize}`
    );
    state.lastSummaryMs = now;
  }
}

export function perfStartWorldRender(scene: object): number {
  const state = getPerfState(scene);
  return state.enabled ? perfNow() : 0;
}

export function perfEndWorldRender(scene: object, startMs: number): void {
  const state = getPerfState(scene);
  if (!state.enabled || !state.phase || state.phase.name !== "enterOverworld" || state.phase.logged) return;
  state.phase.firstRenderMs += startMs > 0 ? perfNow() - startMs : 0;
  const phase = state.phase;
  const totalMs = perfNow() - phase.startMs;
  console.info(
    `[perf] enterOverworld source=${phase.source} worldgen=${fmt(phase.worldgenMs)}ms chunks=${fmt(phase.chunkCreateMs)}ms chunkCreates=${phase.chunkCreates} hits=${phase.chunkHits} misses=${phase.chunkMisses} evict=${phase.evictions} minimap=${fmt(phase.minimapMs)}ms objects=${fmt(phase.objectMs)}ms firstRender=${fmt(phase.firstRenderMs)}ms textureCache=${fmt(phase.textureCacheMs)}ms total=${fmt(totalMs)}ms`
  );
  phase.logged = true;
  state.phase = undefined;
}

export function perfRecordChunkHit(scene: object): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.totalChunkHits += 1;
  if (state.phase) state.phase.chunkHits += 1;
}

export function perfRecordChunkCreate(scene: object, key: string, ms: number): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.totalChunkMisses += 1;
  state.totalChunkCreates += 1;
  state.totalChunkCreateMs += ms;
  state.frameChunkCreates += 1;
  state.frameChunkCreateMs += ms;
  state.frameChunkKey = key;
  if (state.phase) {
    state.phase.chunkMisses += 1;
    state.phase.chunkCreates += 1;
    state.phase.chunkCreateMs += ms;
    if (ms > state.phase.maxChunkMs) {
      state.phase.maxChunkMs = ms;
      state.phase.maxChunkKey = key;
    }
  }
}

export function perfRecordChunkEvictions(scene: object, count: number): void {
  if (count <= 0) return;
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.totalEvictions += count;
  if (state.phase) state.phase.evictions += count;
}

export function perfRecordMinimap(scene: object, ms: number): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.totalMinimapRebuilds += 1;
  state.totalMinimapMs += ms;
  state.frameMinimapMs += ms;
  if (state.phase) state.phase.minimapMs += ms;
}

export function perfRecordObjectOverlay(scene: object, total: number, visible: number, ms: number): void {
  const state = getPerfState(scene);
  if (!state.enabled) return;
  state.totalObjectPasses += 1;
  state.totalObjectMs += ms;
  state.frameObjectMs += ms;
  if (state.phase) state.phase.objectMs += ms;
  if (ms >= 10) console.info(`[perf] objects total=${total} visible=${visible} time=${fmt(ms)}ms`);
}

function getPerfState(scene: object): PerfState {
  const existing = states.get(scene);
  if (existing) return existing;
  const state: PerfState = {
    enabled: perfEnabled(),
    preloadStartMs: 0,
    preloadAssetsMs: 0,
    createStartMs: 0,
    startupWorldgenMs: 0,
    startupTextureCacheMs: 0,
    startupSaveLoadMs: 0,
    startupLogged: false,
    frameStartMs: 0,
    frameChunkCreateMs: 0,
    frameChunkCreates: 0,
    frameChunkKey: "",
    frameMinimapMs: 0,
    frameObjectMs: 0,
    totalChunkCreates: 0,
    totalChunkCreateMs: 0,
    totalChunkHits: 0,
    totalChunkMisses: 0,
    totalEvictions: 0,
    totalMinimapRebuilds: 0,
    totalMinimapMs: 0,
    totalObjectMs: 0,
    totalObjectPasses: 0,
    lastSummaryMs: 0
  };
  states.set(scene, state);
  return state;
}

function fmt(value: number): string {
  return Math.round(value).toString();
}
