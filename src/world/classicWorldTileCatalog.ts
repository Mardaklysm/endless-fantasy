import classicWorldTilesetManifest from "../assets/world/tilesets/classicWorldTileset.manifest.json" with { type: "json" };

export type ClassicWorldBiome = "grassland" | "forest" | "desert" | "snow" | "darkland" | "water" | "mountain" | "road";
export type ClassicWorldEncounterFamily = "plains" | "forest" | "hills" | "sand" | "water" | "road" | "final";
export type ClassicManifestKind = "terrain_tile" | "autotile_piece" | "city_piece" | "object" | "landmark" | "poi" | "decoration";

export interface ClassicSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ClassicManifestSource extends ClassicSourceRect {
  image?: string;
}

interface ClassicManifestTile {
  displayName?: string;
  kind: ClassicManifestKind;
  group: string;
  biome: string;
  source: ClassicManifestSource;
  walkability?: string;
  movementCost?: number;
  confidence?: "low" | "medium" | "high";
  worldgen?: {
    tags?: string[];
  };
}

interface ClassicManifestObject extends ClassicManifestTile {
  anchor?: { x: number; y: number };
  footprint?: { widthTiles?: number; heightTiles?: number };
}

interface ClassicWorldTilesetManifest {
  id: string;
  sourceImage: string;
  image: {
    width: number;
    height: number;
    backgroundMode: string;
    transparentColor: string;
  };
  baseGrid: {
    chosenTileSize: number;
    columns: number;
    rows: number;
  };
  groups: Record<string, unknown>;
  tiles: Record<string, ClassicManifestTile>;
  objects: Record<string, ClassicManifestObject>;
}

export interface ClassicWorldTerrainDefinition<TId extends string = string> {
  id: TId;
  displayName: string;
  manifestId: string;
  manifestKind: ClassicManifestKind;
  group: string;
  biome: ClassicWorldBiome;
  encounterFamily: ClassicWorldEncounterFamily;
  walkable: boolean;
  movementCost: number;
  tags: string[];
  sourceRect: ClassicSourceRect;
  confidence: "low" | "medium" | "high";
  notes?: string;
}

export interface ClassicWorldObjectDefinition<TId extends string = string> {
  id: TId;
  displayName: string;
  manifestId: string;
  kind: "object" | "landmark" | "poi" | "decoration";
  group: string;
  biome: string;
  sourceRect: ClassicSourceRect;
  anchor: { x: number; y: number };
  footprint: { widthTiles: number; heightTiles: number };
  walkability: string;
  tags: string[];
  confidence: "low" | "medium" | "high";
  notes?: string;
}

export const CLASSIC_WORLD_TILESET_ID = "classic_world_tileset";
export const CLASSIC_WORLD_TILESET_TEXTURE_KEY = "classic_world_tileset";
export const CLASSIC_WORLD_TILESET_IMAGE = "src/assets/world/tilesets/classic_world_tileset.cleaned.png";
export const CLASSIC_WORLD_TILESET_MANIFEST_PATH = "src/assets/world/tilesets/classicWorldTileset.manifest.json";

export const CLASSIC_WORLD_TILESET_MANIFEST = classicWorldTilesetManifest as ClassicWorldTilesetManifest;

type TerrainOverride<TId extends string> = Omit<ClassicWorldTerrainDefinition<TId>, "manifestId" | "manifestKind" | "group" | "sourceRect" | "confidence"> & {
  source: string;
};

type ObjectOverride<TId extends string> = Omit<
  ClassicWorldObjectDefinition<TId>,
  "manifestId" | "kind" | "group" | "biome" | "sourceRect" | "walkability" | "tags" | "confidence"
> & {
  source: string;
  kind?: ClassicWorldObjectDefinition["kind"];
  tags?: string[];
};

function sourceRect(source: ClassicManifestSource): ClassicSourceRect {
  return { x: source.x, y: source.y, width: source.width, height: source.height };
}

function assertRectInsideImage(rect: ClassicSourceRect, label: string) {
  const { width, height } = CLASSIC_WORLD_TILESET_MANIFEST.image;
  if (!Number.isInteger(rect.x) || !Number.isInteger(rect.y) || !Number.isInteger(rect.width) || !Number.isInteger(rect.height)) {
    throw new Error(`${label} must use integer source rectangles.`);
  }
  if (rect.width <= 0 || rect.height <= 0) throw new Error(`${label} has a non-positive source rectangle.`);
  if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > width || rect.y + rect.height > height) {
    throw new Error(`${label} source rectangle ${rect.x},${rect.y},${rect.width},${rect.height} exceeds classic tileset ${width}x${height}.`);
  }
}

function uniq(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function terrain<const TId extends string>(override: TerrainOverride<TId>): ClassicWorldTerrainDefinition<TId> {
  const manifestTile = CLASSIC_WORLD_TILESET_MANIFEST.tiles[override.source];
  if (!manifestTile) throw new Error(`Classic world catalog references missing tile manifest entry: ${override.source}`);
  const rect = sourceRect(manifestTile.source);
  assertRectInsideImage(rect, override.source);
  return {
    id: override.id,
    displayName: override.displayName,
    manifestId: override.source,
    manifestKind: manifestTile.kind,
    group: manifestTile.group,
    biome: override.biome,
    encounterFamily: override.encounterFamily,
    walkable: override.walkable,
    movementCost: override.movementCost,
    tags: uniq(["classic", manifestTile.group, ...(manifestTile.worldgen?.tags ?? []), ...override.tags]),
    sourceRect: rect,
    confidence: manifestTile.confidence ?? "medium",
    notes: override.notes
  };
}

function object<const TId extends string>(override: ObjectOverride<TId>): ClassicWorldObjectDefinition<TId> {
  const manifestObject = CLASSIC_WORLD_TILESET_MANIFEST.objects[override.source];
  if (!manifestObject) throw new Error(`Classic world catalog references missing object manifest entry: ${override.source}`);
  const rect = sourceRect(manifestObject.source);
  assertRectInsideImage(rect, override.source);
  return {
    id: override.id,
    displayName: override.displayName,
    manifestId: override.source,
    kind: override.kind ?? (manifestObject.kind as ClassicWorldObjectDefinition["kind"]),
    group: manifestObject.group,
    biome: manifestObject.biome,
    sourceRect: rect,
    anchor: override.anchor,
    footprint: override.footprint,
    walkability: manifestObject.walkability ?? "poi_entry",
    tags: uniq(["classic", manifestObject.group, ...(manifestObject.worldgen?.tags ?? []), ...(override.tags ?? [])]),
    confidence: manifestObject.confidence ?? "medium",
    notes: override.notes
  };
}

export const CLASSIC_WORLD_TILE_DEFINITIONS = [
  terrain({ id: "classic_grass_plain_01", displayName: "Classic Grass Plain 01", source: "west_coast_forest_grass_tile_052", biome: "grassland", encounterFamily: "plains", walkable: true, movementCost: 1, tags: ["grass", "land", "base"] }),
  terrain({ id: "classic_grass_plain_02", displayName: "Classic Grass Plain 02", source: "west_coast_forest_grass_tile_053", biome: "grassland", encounterFamily: "plains", walkable: true, movementCost: 1, tags: ["grass", "land", "base"] }),
  terrain({ id: "classic_grass_plain_03", displayName: "Classic Grass Plain 03", source: "west_coast_forest_grass_tile_054", biome: "grassland", encounterFamily: "plains", walkable: true, movementCost: 1.05, tags: ["grass", "land", "base"] }),
  terrain({ id: "classic_grass_plain_04", displayName: "Classic Grass Plain 04", source: "west_coast_forest_grass_tile_061", biome: "grassland", encounterFamily: "plains", walkable: true, movementCost: 1, tags: ["grass", "land", "base"] }),
  terrain({ id: "classic_grass_plain_05", displayName: "Classic Grass Plain 05", source: "west_coast_forest_grass_tile_062", biome: "grassland", encounterFamily: "plains", walkable: true, movementCost: 1, tags: ["grass", "land", "base"] }),
  terrain({ id: "classic_grass_plain_06", displayName: "Classic Grass Plain 06", source: "west_coast_forest_grass_tile_063", biome: "grassland", encounterFamily: "plains", walkable: true, movementCost: 1, tags: ["grass", "land", "base"] }),
  terrain({ id: "classic_grass_plain_07", displayName: "Classic Grass Plain 07", source: "west_coast_forest_grass_tile_074", biome: "grassland", encounterFamily: "plains", walkable: true, movementCost: 1, tags: ["grass", "land", "base"] }),
  terrain({ id: "classic_grass_plain_08", displayName: "Classic Grass Plain 08", source: "west_coast_forest_grass_tile_075", biome: "grassland", encounterFamily: "plains", walkable: true, movementCost: 1, tags: ["grass", "land", "base"] }),

  terrain({ id: "classic_forest_floor_01", displayName: "Classic Forest Floor 01", source: "west_coast_forest_grass_tile_048", biome: "forest", encounterFamily: "forest", walkable: true, movementCost: 1.25, tags: ["forest", "grass", "land", "base"] }),
  terrain({ id: "classic_forest_floor_02", displayName: "Classic Forest Floor 02", source: "west_coast_forest_grass_tile_049", biome: "forest", encounterFamily: "forest", walkable: true, movementCost: 1.25, tags: ["forest", "grass", "land", "base"] }),
  terrain({ id: "classic_forest_floor_03", displayName: "Classic Forest Floor 03", source: "west_coast_forest_grass_tile_050", biome: "forest", encounterFamily: "forest", walkable: true, movementCost: 1.25, tags: ["forest", "grass", "land", "base"] }),
  terrain({ id: "classic_forest_floor_04", displayName: "Classic Forest Floor 04", source: "west_coast_forest_grass_tile_055", biome: "forest", encounterFamily: "forest", walkable: true, movementCost: 1.3, tags: ["forest", "grass", "land", "base"] }),
  terrain({ id: "classic_forest_floor_05", displayName: "Classic Forest Floor 05", source: "west_coast_forest_grass_tile_056", biome: "forest", encounterFamily: "forest", walkable: true, movementCost: 1.3, tags: ["forest", "grass", "land", "base"] }),
  terrain({ id: "classic_forest_floor_06", displayName: "Classic Forest Floor 06", source: "west_coast_forest_grass_tile_057", biome: "forest", encounterFamily: "forest", walkable: true, movementCost: 1.3, tags: ["forest", "grass", "land", "base"] }),
  terrain({ id: "classic_dark_forest_01", displayName: "Classic Dark Forest 01", source: "lava_forest_forest_grass_tile_014", biome: "forest", encounterFamily: "forest", walkable: true, movementCost: 1.35, tags: ["forest", "dark_forest", "land"] }),
  terrain({ id: "classic_dark_forest_02", displayName: "Classic Dark Forest 02", source: "lava_forest_forest_grass_tile_015", biome: "forest", encounterFamily: "forest", walkable: true, movementCost: 1.4, tags: ["forest", "dark_forest", "land"] }),
  terrain({ id: "classic_dark_forest_03", displayName: "Classic Dark Forest 03", source: "lava_forest_forest_grass_tile_016", biome: "forest", encounterFamily: "forest", walkable: true, movementCost: 1.35, tags: ["forest", "dark_forest", "land"] }),

  terrain({ id: "classic_dryland_01", displayName: "Classic Dryland 01", source: "lava_forest_lava_tile_012", biome: "desert", encounterFamily: "sand", walkable: true, movementCost: 1.15, tags: ["desert", "dryland", "sand", "land"], notes: "Importer labeled this as lava, but the selected cell is opaque dry earth used as desert terrain." }),
  terrain({ id: "classic_dryland_02", displayName: "Classic Dryland 02", source: "lava_forest_lava_tile_017", biome: "desert", encounterFamily: "sand", walkable: true, movementCost: 1.2, tags: ["desert", "dryland", "sand", "land"] }),
  terrain({ id: "classic_dryland_03", displayName: "Classic Dryland 03", source: "lava_forest_lava_tile_018", biome: "desert", encounterFamily: "sand", walkable: true, movementCost: 1.2, tags: ["desert", "dryland", "sand", "land"] }),
  terrain({ id: "classic_dryland_04", displayName: "Classic Dryland 04", source: "lava_forest_lava_tile_026", biome: "desert", encounterFamily: "sand", walkable: true, movementCost: 1.2, tags: ["desert", "dryland", "sand", "land"] }),
  terrain({ id: "classic_dryland_05", displayName: "Classic Dryland 05", source: "west_coast_lava_tile_066", biome: "desert", encounterFamily: "sand", walkable: true, movementCost: 1.25, tags: ["desert", "dryland", "sand", "land"] }),

  terrain({ id: "classic_snowfield_01", displayName: "Classic Snowfield 01", source: "arctic_terrain_snow_ice_tile_003", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.25, tags: ["snow", "ice", "land", "base"] }),
  terrain({ id: "classic_snowfield_02", displayName: "Classic Snowfield 02", source: "arctic_terrain_snow_ice_tile_004", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.25, tags: ["snow", "ice", "land", "base"] }),
  terrain({ id: "classic_snowfield_03", displayName: "Classic Snowfield 03", source: "arctic_terrain_snow_ice_tile_005", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.25, tags: ["snow", "ice", "land", "base"] }),
  terrain({ id: "classic_snowfield_04", displayName: "Classic Snowfield 04", source: "arctic_terrain_snow_ice_tile_008", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.3, tags: ["snow", "ice", "land", "base"] }),
  terrain({ id: "classic_snowfield_05", displayName: "Classic Snowfield 05", source: "arctic_terrain_snow_ice_tile_009", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.3, tags: ["snow", "ice", "land", "base"] }),
  terrain({ id: "classic_snowfield_06", displayName: "Classic Snowfield 06", source: "arctic_terrain_snow_ice_tile_037", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.3, tags: ["snow", "ice", "land", "base"] }),
  terrain({ id: "classic_snowfield_07", displayName: "Classic Snowfield 07", source: "arctic_terrain_snow_ice_tile_038", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.3, tags: ["snow", "ice", "land", "base"] }),
  terrain({ id: "classic_snowfield_08", displayName: "Classic Snowfield 08", source: "arctic_terrain_snow_ice_tile_039", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.3, tags: ["snow", "ice", "land", "base"] }),
  terrain({ id: "classic_snowfield_09", displayName: "Classic Snowfield 09", source: "arctic_terrain_snow_ice_tile_040", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.3, tags: ["snow", "ice", "land", "base"] }),
  terrain({ id: "classic_ice_01", displayName: "Classic Ice 01", source: "arctic_terrain_snow_ice_tile_020", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.4, tags: ["snow", "ice", "land"] }),
  terrain({ id: "classic_ice_02", displayName: "Classic Ice 02", source: "arctic_terrain_snow_ice_tile_021", biome: "snow", encounterFamily: "hills", walkable: true, movementCost: 1.4, tags: ["snow", "ice", "land"] }),

  terrain({ id: "classic_water_deep_01", displayName: "Classic Deep Water 01", source: "lake_coast_coast_mixed_tile_023", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "deep", "blocked"] }),
  terrain({ id: "classic_water_deep_02", displayName: "Classic Deep Water 02", source: "lake_coast_coast_mixed_tile_033", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "deep", "blocked"] }),
  terrain({ id: "classic_water_lake_01", displayName: "Classic Lake Water 01", source: "lake_coast_forest_grass_tile_011", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "lake", "blocked"] }),
  terrain({ id: "classic_water_lake_02", displayName: "Classic Lake Water 02", source: "lake_coast_forest_grass_tile_012", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "lake", "blocked"] }),
  terrain({ id: "classic_water_shallow_01", displayName: "Classic Shallow Water 01", source: "lake_coast_forest_grass_tile_016", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "shallow", "blocked"] }),
  terrain({ id: "classic_water_shallow_02", displayName: "Classic Shallow Water 02", source: "lake_coast_forest_grass_tile_017", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "shallow", "blocked"] }),
  terrain({ id: "classic_river_water_01", displayName: "Classic River Water 01", source: "lake_coast_forest_grass_tile_054", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "river", "blocked"] }),
  terrain({ id: "classic_river_water_02", displayName: "Classic River Water 02", source: "lake_coast_forest_grass_tile_055", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "river", "blocked"] }),
  terrain({ id: "classic_water_coast_01", displayName: "Classic Coast Water 01", source: "lake_coast_coast_mixed_tile_043", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "coast", "shore", "blocked"] }),
  terrain({ id: "classic_water_coast_02", displayName: "Classic Coast Water 02", source: "lake_coast_coast_mixed_tile_049", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "coast", "shore", "blocked"] }),
  terrain({ id: "classic_water_coast_03", displayName: "Classic Coast Water 03", source: "lake_coast_forest_grass_tile_080", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "coast", "blocked"] }),
  terrain({ id: "classic_water_coast_04", displayName: "Classic Coast Water 04", source: "lake_coast_forest_grass_tile_083", biome: "water", encounterFamily: "water", walkable: false, movementCost: 99, tags: ["water", "coast", "blocked"] }),

  terrain({ id: "classic_road_main_01", displayName: "Classic Road Main 01", source: "lake_coast_coast_mixed_tile_038", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.65, tags: ["road", "path", "land"] }),
  terrain({ id: "classic_road_main_02", displayName: "Classic Road Main 02", source: "lake_coast_coast_mixed_tile_065", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.7, tags: ["road", "path", "land"] }),
  terrain({ id: "classic_road_corner_01", displayName: "Classic Road Corner 01", source: "lake_coast_coast_mixed_tile_037", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.75, tags: ["road", "path", "corner", "land"] }),
  terrain({ id: "classic_road_corner_02", displayName: "Classic Road Corner 02", source: "lake_coast_coast_mixed_tile_039", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.75, tags: ["road", "path", "corner", "land"] }),
  terrain({ id: "classic_road_crossroads_01", displayName: "Classic Road Crossroads 01", source: "lake_coast_coast_mixed_tile_047", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.6, tags: ["road", "path", "crossroads", "land"] }),
  terrain({ id: "classic_road_worn_01", displayName: "Classic Worn Road 01", source: "lake_coast_coast_mixed_tile_083", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.8, tags: ["road", "path", "worn", "land"] }),
  terrain({ id: "classic_bridge_stone_horizontal", displayName: "Classic Stone Bridge Horizontal", source: "lake_coast_coast_mixed_tile_038", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.6, tags: ["bridge", "road", "horizontal", "land"] }),
  terrain({ id: "classic_bridge_stone_vertical", displayName: "Classic Stone Bridge Vertical", source: "lake_coast_coast_mixed_tile_038", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.6, tags: ["bridge", "road", "vertical", "land"] }),
  terrain({ id: "classic_bridge_wood_horizontal", displayName: "Classic Wood Bridge Horizontal", source: "lake_coast_coast_mixed_tile_083", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.7, tags: ["bridge", "road", "horizontal", "wood", "land"] }),
  terrain({ id: "classic_bridge_wood_vertical", displayName: "Classic Wood Bridge Vertical", source: "lake_coast_coast_mixed_tile_083", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.7, tags: ["bridge", "road", "vertical", "wood", "land"] }),
  terrain({ id: "classic_poi_town_ground", displayName: "Classic Town POI Ground", source: "lake_coast_coast_mixed_tile_038", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.6, tags: ["road", "poi", "town", "land"] }),
  terrain({ id: "classic_poi_ruin_ground", displayName: "Classic Ruin POI Ground", source: "special_landmark_stone_tile_003", biome: "road", encounterFamily: "road", walkable: true, movementCost: 0.85, tags: ["road", "poi", "ruin", "land"] }),

  terrain({ id: "classic_mountain_gray_01", displayName: "Classic Gray Mountain 01", source: "arctic_terrain_stone_tile_007", biome: "mountain", encounterFamily: "hills", walkable: false, movementCost: 99, tags: ["mountain", "stone", "blocked", "cliff"] }),
  terrain({ id: "classic_mountain_gray_02", displayName: "Classic Gray Mountain 02", source: "arctic_terrain_stone_tile_008", biome: "mountain", encounterFamily: "hills", walkable: false, movementCost: 99, tags: ["mountain", "stone", "blocked", "cliff"] }),
  terrain({ id: "classic_mountain_gray_03", displayName: "Classic Gray Mountain 03", source: "arctic_terrain_stone_tile_009", biome: "mountain", encounterFamily: "hills", walkable: false, movementCost: 99, tags: ["mountain", "stone", "blocked", "cliff"] }),
  terrain({ id: "classic_mountain_gray_04", displayName: "Classic Gray Mountain 04", source: "arctic_terrain_stone_tile_011", biome: "mountain", encounterFamily: "hills", walkable: false, movementCost: 99, tags: ["mountain", "stone", "blocked", "cliff"] }),
  terrain({ id: "classic_mountain_gray_05", displayName: "Classic Gray Mountain 05", source: "arctic_terrain_stone_tile_014", biome: "mountain", encounterFamily: "hills", walkable: false, movementCost: 99, tags: ["mountain", "stone", "blocked", "cliff"] }),
  terrain({ id: "classic_mountain_gray_06", displayName: "Classic Gray Mountain 06", source: "arctic_terrain_stone_tile_018", biome: "mountain", encounterFamily: "hills", walkable: false, movementCost: 99, tags: ["mountain", "stone", "blocked", "cliff"] }),

  terrain({ id: "classic_darkland_01", displayName: "Classic Darkland 01", source: "darkland_volcano_darkland_tile_001", biome: "darkland", encounterFamily: "final", walkable: true, movementCost: 1.45, tags: ["darkland", "land", "base"] }),
  terrain({ id: "classic_darkland_02", displayName: "Classic Darkland 02", source: "darkland_volcano_darkland_tile_002", biome: "darkland", encounterFamily: "final", walkable: true, movementCost: 1.45, tags: ["darkland", "land", "base"] }),
  terrain({ id: "classic_darkland_03", displayName: "Classic Darkland 03", source: "darkland_volcano_darkland_tile_003", biome: "darkland", encounterFamily: "final", walkable: true, movementCost: 1.45, tags: ["darkland", "land", "base"] }),
  terrain({ id: "classic_darkland_04", displayName: "Classic Darkland 04", source: "darkland_volcano_darkland_tile_004", biome: "darkland", encounterFamily: "final", walkable: true, movementCost: 1.45, tags: ["darkland", "land", "base"] }),
  terrain({ id: "classic_darkland_05", displayName: "Classic Darkland 05", source: "darkland_volcano_darkland_tile_044", biome: "darkland", encounterFamily: "final", walkable: true, movementCost: 1.5, tags: ["darkland", "land", "base"] }),
  terrain({ id: "classic_darkland_06", displayName: "Classic Darkland 06", source: "darkland_volcano_darkland_tile_045", biome: "darkland", encounterFamily: "final", walkable: true, movementCost: 1.5, tags: ["darkland", "land", "base"] }),
  terrain({ id: "classic_darkland_07", displayName: "Classic Darkland 07", source: "darkland_volcano_darkland_tile_046", biome: "darkland", encounterFamily: "final", walkable: true, movementCost: 1.5, tags: ["darkland", "land", "base"] }),
  terrain({ id: "classic_darkland_08", displayName: "Classic Darkland 08", source: "darkland_volcano_darkland_tile_047", biome: "darkland", encounterFamily: "final", walkable: true, movementCost: 1.5, tags: ["darkland", "land", "base"] }),
  terrain({ id: "classic_lava_blocked_01", displayName: "Classic Lava Blocked 01", source: "volcano_lava_tile_030", biome: "darkland", encounterFamily: "final", walkable: false, movementCost: 99, tags: ["lava", "blocked", "danger"] }),
  terrain({ id: "classic_lava_blocked_02", displayName: "Classic Lava Blocked 02", source: "lava_forest_lava_tile_042", biome: "darkland", encounterFamily: "final", walkable: false, movementCost: 99, tags: ["lava", "blocked", "danger"] })
] as const;

export type ClassicWorldTileId = (typeof CLASSIC_WORLD_TILE_DEFINITIONS)[number]["id"];

export const CLASSIC_WORLD_TILE_IDS = {
  grassFallback: "classic_grass_plain_01",
  desertFallback: "classic_dryland_01",
  deepWater: "classic_water_deep_01",
  lightWater: "classic_water_lake_01",
  shallowWater: "classic_water_shallow_01",
  riverWater: "classic_river_water_01",
  mainRoad: "classic_road_main_01",
  wornRoad: "classic_road_worn_01",
  crossroads: "classic_road_crossroads_01",
  townGround: "classic_poi_town_ground",
  ruinGround: "classic_poi_ruin_ground",
  forestPath: "classic_road_corner_01",
  desertPath: "classic_road_main_02",
  snowPath: "classic_road_worn_01",
  mountainPath: "classic_poi_ruin_ground",
  darklandPath: "classic_road_worn_01",
  stoneBridgeHorizontal: "classic_bridge_stone_horizontal",
  stoneBridgeVertical: "classic_bridge_stone_vertical",
  woodBridgeHorizontal: "classic_bridge_wood_horizontal",
  woodBridgeVertical: "classic_bridge_wood_vertical"
} as const satisfies Record<string, ClassicWorldTileId>;

export const CLASSIC_LOCATION_OBJECTS = {
  dawnford: object({
    id: "classic_poi_dawnford",
    displayName: "Dawnford Classic Town",
    source: "red_roof_city_settlement_poi_002",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["town", "city", "poi"]
  }),
  brinewick: object({
    id: "classic_poi_brinewick",
    displayName: "Brinewick Classic Port Town",
    source: "red_blue_town_settlement_poi_001",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["town", "port", "poi"]
  }),
  elderleaf: object({
    id: "classic_poi_elderleaf",
    displayName: "Elderleaf Classic Forest Town",
    source: "red_roof_city_settlement_poi_003",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["town", "forest", "poi"]
  }),
  sunbarrow: object({
    id: "classic_poi_sunbarrow",
    displayName: "Sunbarrow Classic Town",
    source: "red_blue_town_red_roof_city_poi_002",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["town", "dryland", "poi"]
  }),
  starfallGate: object({
    id: "classic_poi_starfall_gate",
    displayName: "Starfall Gate Classic Ruin",
    source: "special_landmark_stone_landmark_001",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["gate", "ruin", "poi"]
  }),
  mossCave: object({
    id: "classic_poi_moss_cave",
    displayName: "Moss Cave Classic Landmark",
    source: "special_landmark_grass_landmark_001",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["cave", "forest", "poi"]
  }),
  ashenKeep: object({
    id: "classic_poi_ashen_keep",
    displayName: "Ashen Keep Classic Volcano",
    source: "volcano_grass_landmark_001",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["keep", "volcano", "poi"]
  }),
  tideShrine: object({
    id: "classic_poi_tide_shrine",
    displayName: "Tide Shrine Classic Landmark",
    source: "red_blue_town_red_roof_city_poi_002",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["shrine", "water", "poi"]
  }),
  skyglassTower: object({
    id: "classic_poi_skyglass_tower",
    displayName: "Skyglass Tower Classic Arctic Landmark",
    source: "arctic_terrain_stone_landmark_001",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["tower", "snow", "poi"],
    notes: "Large arctic landmark retained as a POI overlay, not repeated terrain."
  }),
  eclipseSpire: object({
    id: "classic_poi_eclipse_spire",
    displayName: "Eclipse Spire Classic Dark Castle",
    source: "dark_castle_darkland_landmark_001",
    anchor: { x: 0.5, y: 1 },
    footprint: { widthTiles: 3, heightTiles: 3 },
    tags: ["final", "darkland", "castle", "poi"]
  })
} as const;

export type ClassicLocationId = keyof typeof CLASSIC_LOCATION_OBJECTS;

export function classicLocationObjectFor(locationId: string): ClassicWorldObjectDefinition | undefined {
  return CLASSIC_LOCATION_OBJECTS[locationId as ClassicLocationId];
}
