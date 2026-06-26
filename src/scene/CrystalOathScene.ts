import Phaser from "phaser";
import type {
  ActiveMenu,
  BoatTravelState,
  Dialogue,
  ExploreStep,
  Mode,
  Terrain,
  Vec,
  DirectionName,
  WorldControlLockReason
} from "./sceneTypes";
import type { BattleState } from "../systems/battle/battleTypes";
import type { CharacterState, DungeonDef } from "../data/gameDataTypes";
import type { GeneratedWorld, IslandId, WorldRoadVisual } from "../world/worldGenerator";
import type { SemanticRouteOverlayMode } from "../world/semantic/semanticRouteRenderer";
import { SynthAudio } from "../systems/audio/synthAudio";
import { OverworldCloudOverlay } from "../world/cloudOverlay";
import { createDefaultGameSettings, type GameSettings } from "../systems/settings/gameSettings";

import * as sceneLifecycle from "./sceneLifecycle";
import * as sceneInput from "../input/sceneInput";
import * as sceneState from "./sceneState";
import * as dungeonMovement from "../systems/movement/dungeonMovement";
import * as exploreMovement from "../systems/movement/exploreMovement";
import * as locationEntry from "../systems/movement/locationEntry";
import * as battleFlow from "../systems/battle/battleFlow";
import * as battleActions from "../systems/battle/battleActions";
import * as battleState from "../systems/battle/battleState";
import * as menuActions from "../systems/menu/menuActions";
import * as encounters from "../systems/world/encounters";
import type { WorldDayPhaseId } from "../systems/world/dayNight";
import { WORLD_TIME_TICKS_PER_FULL_DAY } from "../systems/world/dayNight";
import * as dayNight from "../systems/world/dayNight";
import * as boatTravel from "../systems/world/boatTravel";
import * as harborTravel from "../systems/world/harborTravel";
import * as locations from "../systems/world/locations";
import * as poiVisit from "../systems/poi/poiVisit";
import type { PoiVisitReturn } from "../systems/poi/poiVisit";
import * as saveGame from "../systems/save/saveGame";
import * as loadGame from "../systems/save/loadGame";
import * as renderCore from "../render/common/renderCore";
import * as drawTitle from "../render/title/drawTitle";
import * as drawWorld from "../render/world/drawWorld";
import * as drawWorldTerrain from "../render/world/drawWorldTerrain";
import * as drawPoi from "../render/poi/drawPoi";
import * as drawDungeon from "../render/dungeon/drawDungeon";
import * as drawBattle from "../render/battle/drawBattle";
import * as drawMenu from "../render/menu/drawMenu";
import * as drawLocationIcon from "../render/world/drawLocationIcon";
import * as drawActors from "../render/common/drawActors";
import * as panels from "../render/common/panels";

type SceneModuleMethods<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? K : never]: T[K] extends (...args: never[]) => unknown
    ? OmitThisParameter<T[K]>
    : never;
};

export interface CrystalOathScene
  extends SceneModuleMethods<typeof sceneLifecycle>,
    SceneModuleMethods<typeof sceneInput>,
    SceneModuleMethods<typeof sceneState>,
    SceneModuleMethods<typeof dungeonMovement>,
    SceneModuleMethods<typeof exploreMovement>,
    SceneModuleMethods<typeof locationEntry>,
    SceneModuleMethods<typeof battleFlow>,
    SceneModuleMethods<typeof battleActions>,
    SceneModuleMethods<typeof battleState>,
    SceneModuleMethods<typeof menuActions>,
    SceneModuleMethods<typeof encounters>,
    SceneModuleMethods<typeof dayNight>,
    SceneModuleMethods<typeof boatTravel>,
    SceneModuleMethods<typeof harborTravel>,
    SceneModuleMethods<typeof locations>,
    SceneModuleMethods<typeof poiVisit>,
    SceneModuleMethods<typeof saveGame>,
    SceneModuleMethods<typeof loadGame>,
    SceneModuleMethods<typeof renderCore>,
    SceneModuleMethods<typeof drawTitle>,
    SceneModuleMethods<typeof drawWorld>,
    SceneModuleMethods<typeof drawWorldTerrain>,
    SceneModuleMethods<typeof drawPoi>,
    SceneModuleMethods<typeof drawDungeon>,
    SceneModuleMethods<typeof drawBattle>,
    SceneModuleMethods<typeof drawMenu>,
    SceneModuleMethods<typeof drawLocationIcon>,
    SceneModuleMethods<typeof drawActors>,
    SceneModuleMethods<typeof panels> {}

export class CrystalOathScene extends Phaser.Scene {
  g!: Phaser.GameObjects.Graphics;
  worldOverlay!: Phaser.GameObjects.Graphics;
  worldLightingOverlay?: Phaser.GameObjects.Rectangle;
  ui!: Phaser.GameObjects.Graphics;
  cloudOverlay?: OverworldCloudOverlay;
  texts: Phaser.GameObjects.Text[] = [];
  images: Phaser.GameObjects.GameObject[] = [];
  mode: Mode = "title";
  titleOptions = ["Continue", "New Game"];
  titleSelected = 0;
  menu?: ActiveMenu;
  dialogue?: Dialogue;
  battle?: BattleState;
  boatTravel?: BoatTravelState;
  boatTravelSprite?: Phaser.GameObjects.Image;
  boatTravelBreathingTween?: Phaser.Tweens.Tween;
  worldControlLockReason?: WorldControlLockReason;
  audio = new SynthAudio();
  generatedWorld?: GeneratedWorld;
  roadVisualsByKey = new Map<string, WorldRoadVisual>();
  dungeonCache?: { seed: string; dungeons: Record<string, DungeonDef> };
  semanticDebugOverlay: "off" | "edgeDebug" | "rawTiles" | "masks" | "terrainVariants" | "terrainVariantAlpha" | "roadRibbon" | "distance" | "grid" | "walkability" | "policy" | "mountains" | "forests" | "islands" | "pois" | "roads" | "rivers" = "off";
  worldSeed = "title-preview";
  world: Terrain[][] = [];
  worldTerrainCacheKey = "world_terrain_cache";
  worldTerrainCacheSeed = "";
  worldTerrainChunkCache = new Map<
    string,
    {
      textureKey: string;
      frameKey: string;
      chunkX: number;
      chunkY: number;
      chunkWidth: number;
      chunkHeight: number;
      lastUsed: number;
    }
  >();
  worldTerrainChunkCacheTick = 0;
  worldRouteOverlayCacheKey = "world_route_overlay_cache";
  worldRouteOverlayCacheSeed = "";
  worldMinimapCacheKey = "world_minimap_cache";
  worldMinimapCacheSeed = "";
  worldMinimapCacheWidth = 0;
  worldMinimapCacheHeight = 0;
  routeOverlayMode: SemanticRouteOverlayMode = "hidden";
  riverOverlayMode: SemanticRouteOverlayMode = "hidden";
  cloudOverlayEnabled = true;
  ticksPerFullDay = WORLD_TIME_TICKS_PER_FULL_DAY;
  worldTimeTicks = 0;
  currentDayPhase: WorldDayPhaseId = "dawn";
  currentDayPhaseProgress = 0;
  worldLightingVisual = { red: 95, green: 127, blue: 208, alpha: 0.18 };
  worldLightingTween?: Phaser.Tweens.Tween;
  party: CharacterState[] = [];
  inventory: Record<string, number> = {};
  gearBag: Record<string, number> = {};
  gold = 0;
  worldPos: Vec = { x: 10, y: 22 };
  poiPos: Vec = { x: 1440, y: 1115 };
  dungeonPos: Vec = { x: 1, y: 1 };
  visualWorldPos: Vec = { x: 10, y: 22 };
  visualPoiPos: Vec = { x: 1440, y: 1115 };
  visualDungeonPos: Vec = { x: 1, y: 1 };
  currentPoiId = "starting_grassland_village";
  currentDungeon = "mossCave";
  currentIslandId: IslandId = "greenhaven";
  dungeonFloor = 0;
  previousMode: Mode = "world";
  poiReturn?: PoiVisitReturn;
  suppressedPoiExitIds = new Set<string>();
  encounterCounter = 10;
  flags = {
    relics: { root: false, flame: false, tide: false, gale: false },
    boat: false,
    skyship: false,
    gateOpen: false,
    introSeen: false,
    travel: {
      visitedIsland2: false,
      visitedIsland3: false,
      visitedFrostmere: false,
      visitedHighspire: false,
      visitedAshfall: false,
      unlockedIsland2: true,
      unlockedIsland3: false,
      unlockedFrostmere: false,
      unlockedHighspire: false,
      unlockedAshfall: false
    }
  };
  openedChests = new Set<string>();
  discoveredPois = new Set<string>();
  visitedLocationIds = new Set<string>();
  puzzleFlags = new Set<string>();
  defeatedBosses = new Set<string>();
  clearedDungeons = new Set<string>();
  settings: GameSettings = createDefaultGameSettings();
  dirty = true;
  lastStepFrame = 0;
  lastMoveDir: Vec = { x: 0, y: 1 };
  heldDirections: DirectionName[] = [];
  shiftHeld = false;
  blockedMoveCooldown = 0;
  walkAnimElapsed = 0;
  playerMoving = false;
  activeStep?: ExploreStep;
  currentWorldAssetsValidated = false;

  constructor() {
    super("CrystalOathScene");
  }
}

Object.assign(
  CrystalOathScene.prototype,
  sceneLifecycle,
  sceneInput,
  sceneState,
  dungeonMovement,
  exploreMovement,
  locationEntry,
  battleFlow,
  battleActions,
  battleState,
  menuActions,
  encounters,
  dayNight,
  boatTravel,
  harborTravel,
  locations,
  poiVisit,
  saveGame,
  loadGame,
  renderCore,
  drawTitle,
  drawWorld,
  drawWorldTerrain,
  drawPoi,
  drawDungeon,
  drawBattle,
  drawMenu,
  drawLocationIcon,
  drawActors,
  panels
);
