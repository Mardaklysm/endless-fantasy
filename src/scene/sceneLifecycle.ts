import Phaser from "phaser";
import { LAYER_UI_GRAPHICS, LAYER_WORLD_IMAGE, PIXEL_ART_SCALE } from "../app/config";
import {
  ASSET_URLS,
  CHARTER_BOAT_8DIR_FILENAME,
  CHARTER_BOAT_8DIR_FRAME_HEIGHT,
  CHARTER_BOAT_8DIR_FRAME_WIDTH,
  CHARTER_BOAT_8DIR_TEXTURE_KEY,
  DUNGEON_TILE_ASSET_MODULES,
  WORLD_CURRENT_ASSET_MODULES
} from "../assets/assetPaths";
import type { AssetKey } from "../assets/assetTypes";
import { DUNGEON_TILESET, DUNGEON_TILE_ASSETS, DUNGEON_TILE_ID_SET } from "../data/dungeonTiles";
import { WORLD_CLOUD_ASSETS, WORLD_CLOUD_MANIFEST } from "../data/worldCloudAssets";
import { WORLD_CURRENT_ASSET_MANIFEST, WORLD_CURRENT_ASSETS, WORLD_CURRENT_TERRAIN_TEXTURE_KEYS } from "../data/worldCurrentAssets";
import { perfAutoMode, perfEndCreate, perfEndFrame, perfEndPreload, perfStartCreate, perfStartFrame, perfStartPreload } from "../debug/perf";
import { OverworldCloudOverlay } from "../world/cloudOverlay";
import { ACTIVE_WORLDGEN_MODE } from "../world/worldGenerator";
import type { CrystalOathSceneContext } from "./sceneContext";

export function preload(this: CrystalOathSceneContext) {
  perfStartPreload(this);
  this.load.once(Phaser.Loader.Events.COMPLETE, () => perfEndPreload(this));
  for (const [key, url] of Object.entries(ASSET_URLS) as [AssetKey, string | undefined][]) {
    if (url) this.load.image(key, url);
  }
  for (const asset of WORLD_CURRENT_ASSETS) {
    const url = WORLD_CURRENT_ASSET_MODULES[`./world/current/${asset.filename}`];
    if (url) this.load.image(asset.textureKey, url);
    else console.warn(`Missing current world asset module for ${asset.filename}`);
  }
  for (const tile of DUNGEON_TILE_ASSETS) {
    const url = DUNGEON_TILE_ASSET_MODULES[`./world/${tile.filename}`];
    if (url) this.load.image(tile.textureKey, url);
    else console.warn(`Missing dungeon tile asset module for ${tile.filename}`);
  }
  for (const cloud of WORLD_CLOUD_ASSETS) {
    const url = WORLD_CURRENT_ASSET_MODULES[`./world/current/${cloud.filename}`];
    if (url) this.load.image(cloud.textureKey, url);
    else console.warn(`Missing current world cloud asset module for ${cloud.filename}`);
  }
  const charterBoatUrl = WORLD_CURRENT_ASSET_MODULES[`./world/current/${CHARTER_BOAT_8DIR_FILENAME}`];
  if (charterBoatUrl) {
    this.load.spritesheet(CHARTER_BOAT_8DIR_TEXTURE_KEY, charterBoatUrl, {
      frameWidth: CHARTER_BOAT_8DIR_FRAME_WIDTH,
      frameHeight: CHARTER_BOAT_8DIR_FRAME_HEIGHT
    });
  } else {
    console.warn(`Missing charter boat spritesheet module for ${CHARTER_BOAT_8DIR_FILENAME}`);
  }
}

export function create(this: CrystalOathSceneContext) {
  perfStartCreate(this);
  this.g = this.add.graphics();
  this.g.setDepth(0);
  this.worldOverlay = this.add.graphics();
  this.worldOverlay.setDepth(LAYER_WORLD_IMAGE + 0.5);
  this.ui = this.add.graphics();
  this.ui.setDepth(LAYER_UI_GRAPHICS);
  this.createWorldLightingLayer();
  this.cloudOverlay = new OverworldCloudOverlay(this);
  this.configureRenderResolution();
  this.logActiveWorldTileset();
  this.configureTextureFiltering();
  this.input.keyboard?.on("keydown", (event: KeyboardEvent) => this.handleKey(event));
  this.input.keyboard?.on("keyup", (event: KeyboardEvent) => this.handleKeyUp(event));
  this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.handlePointer(pointer));
  this.draw();
  perfEndCreate(this);
  schedulePerfAutoRun.call(this);
}

export function configureRenderResolution(this: CrystalOathSceneContext) {
  this.cameras.main.roundPixels = true;
  this.g.setScale(PIXEL_ART_SCALE);
  this.worldOverlay.setScale(PIXEL_ART_SCALE);
  this.ui.setScale(PIXEL_ART_SCALE);
}

export function logActiveWorldTileset(this: CrystalOathSceneContext) {
  if (!import.meta.env.DEV) return;
  const terrainAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.assetKind === "terrain fill");
  const worldObjectAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.assetKind === "world object");
  const premiumWorldObjectAssets = worldObjectAssets.filter((asset) => asset.premium);
  const placeholderAssets = WORLD_CURRENT_ASSETS.filter((asset) => asset.placeholder);
  console.info(
    [
      "Active world art set: current selected asset manifest",
      `Worldgen mode: ${ACTIVE_WORLDGEN_MODE}`,
      `Manifest: ${WORLD_CURRENT_ASSET_MANIFEST.runtimeRoot}/world_asset_manifest.json`,
      `Approved terrain fills: ${terrainAssets.length}`,
      `Premium world objects: ${premiumWorldObjectAssets.length}`,
      `Backup world objects: ${worldObjectAssets.length - premiumWorldObjectAssets.length}`,
      `Cloud overlay fallback theme: ${WORLD_CLOUD_MANIFEST.fallbackTheme} (${WORLD_CLOUD_ASSETS.length} loaded base cloud assets)`,
      `Temporary current-folder placeholders: ${placeholderAssets.length}`,
      "World object resolution: premium objects_premium_v2 first, objects_premium second, backup objects third, generated fallback last",
      `Deep ocean: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.deepOcean}`,
      `Shallow water: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.shallowWater}`,
      `Beach: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.beach}`,
      `Grassland: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.grassland}`,
      `Sand: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.sand}`,
      `Ice/snow: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.ice}`,
      `Freshwater terrain: ${WORLD_CURRENT_TERRAIN_TEXTURE_KEYS.freshWater}`,
      "Deprecated overworld atlases active: false",
      "Random base terrain variants active: false",
      "Roads, rivers, and lakes render through the semantic terrain mask; mountain sprites, forests, and POIs remain overlays",
      `Dungeon tile folder: ${DUNGEON_TILESET.runtimeFolder}`,
      `Dungeon tile source inset baked into PNGs: ${DUNGEON_TILESET.sourceInsetAppliedToRuntimeTiles}`,
      `Dungeon tile entries: ${DUNGEON_TILE_ID_SET.size}`
    ].join("\n")
  );
}

export function update(this: CrystalOathSceneContext, _time: number, delta: number) {
  perfStartFrame(this);
  const dt = Math.min(delta, 50);
  this.updateBoatTravel(dt);
  this.updateMovement(dt);
  this.updateBattleFlow(dt);
  this.ensureActiveSceneFrame();
  if (this.dirty) this.draw();
  this.updateCloudOverlay(dt);
  perfEndFrame(this, delta, this.worldTerrainChunkCache.size);
}

function schedulePerfAutoRun(this: CrystalOathSceneContext) {
  const autoMode = perfAutoMode();
  if (autoMode !== "townExit" && autoMode !== "chunkSweep") return;
  this.time.delayedCall(100, () => {
    this.newGame();
    if (this.dialogue?.done) {
      const done = this.dialogue.done;
      this.dialogue = undefined;
      done();
    }
    this.leavePoiVisit();
    if (autoMode === "chunkSweep") runPerfChunkSweep.call(this);
  });
}

function runPerfChunkSweep(this: CrystalOathSceneContext) {
  const start = { ...this.worldPos };
  let step = 0;
  this.time.addEvent({
    delay: 300,
    repeat: 14,
    callback: () => {
      if (!this.generatedWorld || this.mode !== "world") return;
      const next = {
        x: Phaser.Math.Clamp(start.x + step * 8, 0, this.generatedWorld.width - 1),
        y: Phaser.Math.Clamp(start.y + Math.floor(step / 4) * 4, 0, this.generatedWorld.height - 1)
      };
      this.worldPos = next;
      this.visualWorldPos = { ...next };
      this.markDirty();
      step += 1;
    }
  });
}
