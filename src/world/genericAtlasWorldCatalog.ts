export const GENERIC_WORLD_ATLAS = {
  id: "generic10x10_world_atlas",
  textureKey: "world_atlas_10x10",
  image: "src/assets/world/world_atlas.normalized.png",
  sourceCopy: "src/assets/world/source/master_overworld_tileset_atlas_10x10.png",
  columns: 10,
  rows: 10,
  tileWidth: 256,
  tileHeight: 256,
  sheetWidth: 2560,
  sheetHeight: 2560,
} as const;

export type GenericWorldBiome =
  | "grassland"
  | "forest"
  | "desert"
  | "snow"
  | "darkland"
  | "water"
  | "mountain"
  | "road"
  | "transition";

export type GenericWorldEncounterFamily =
  | "plains"
  | "forest"
  | "hills"
  | "sand"
  | "water"
  | "final"
  | "road";

export interface GenericSourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GenericWorldTileDefinition<TId extends string = string> {
  id: TId;
  displayName: string;
  row: number;
  col: number;
  rowFamily: string;
  biome: GenericWorldBiome;
  encounterFamily: GenericWorldEncounterFamily;
  walkable: boolean;
  movementCost: number;
  tags: readonly string[];
  sourceRect: GenericSourceRect;
  textureKey: typeof GENERIC_WORLD_ATLAS.textureKey;
  atlasId: typeof GENERIC_WORLD_ATLAS.id;
  notes?: string;
}

type GenericTileSeed = Omit<
  GenericWorldTileDefinition,
  "displayName" | "row" | "col" | "rowFamily" | "sourceRect" | "textureKey" | "atlasId"
>;

const ROWS: { family: string; tiles: GenericTileSeed[] }[] = [
  {
    family: "grassland / meadow",
    tiles: [
      tile("bright_grass", "grassland", "plains", true, 1, ["grass", "land"]),
      tile("medium_grass", "grassland", "plains", true, 1, ["grass", "land"]),
      tile("dark_grass", "grassland", "plains", true, 1, ["grass", "land"]),
      tile("flower_meadow", "grassland", "plains", true, 1, ["grass", "flowers", "land"]),
      tile("clover_lush_grass", "grassland", "plains", true, 1, ["grass", "lush", "land"]),
      tile("trampled_grass", "grassland", "plains", true, 1, ["grass", "worn", "land"]),
      tile("weeds_grass", "grassland", "plains", true, 1.1, ["grass", "weeds", "land"]),
      tile("dirt_patch", "grassland", "plains", true, 1, ["dirt", "grass", "land"]),
      tile("grass_stones", "grassland", "plains", true, 1.2, ["grass", "rocks", "land"]),
      tile("fertile_field_grass", "grassland", "plains", true, 1, ["grass", "field", "land"]),
    ],
  },
  {
    family: "woodland / forest",
    tiles: [
      tile("forest_floor", "forest", "forest", true, 1.4, ["forest", "land"]),
      tile("dark_forest_floor", "forest", "forest", true, 1.6, ["forest", "dark", "land"]),
      tile("mossy_forest_ground", "forest", "forest", true, 1.4, ["forest", "moss", "land"]),
      tile("dense_leafy_woodland", "forest", "forest", true, 2.1, ["forest", "dense", "land"]),
      tile("bush_hedge", "forest", "forest", true, 1.8, ["forest", "bush", "land"]),
      tile("tree_covered_green", "forest", "forest", true, 2.2, ["forest", "dense", "land"]),
      tile("rooty_forest_earth", "forest", "forest", true, 1.7, ["forest", "roots", "land"]),
      tile("autumn_woodland", "forest", "forest", true, 1.5, ["forest", "autumn", "land"]),
      tile("enchanted_forest_ground", "forest", "forest", true, 1.5, ["forest", "magic", "land"]),
      tile("forest_path", "forest", "road", true, 0.75, ["forest", "road", "path", "land"]),
    ],
  },
  {
    family: "desert / dryland",
    tiles: [
      tile("bright_sand", "desert", "sand", true, 1.35, ["sand", "desert", "land"]),
      tile("golden_sand", "desert", "sand", true, 1.35, ["sand", "desert", "land"]),
      tile("dune_sand", "desert", "sand", true, 1.55, ["sand", "desert", "dune", "land"]),
      tile("rocky_sand", "desert", "sand", true, 1.65, ["sand", "desert", "rocks", "land"]),
      tile("cracked_dry_earth", "desert", "sand", true, 1.45, ["desert", "dry", "land"]),
      tile("reddish_desert_soil", "desert", "sand", true, 1.45, ["desert", "red", "land"]),
      tile("cactus_scrub", "desert", "sand", true, 1.8, ["desert", "scrub", "land"]),
      tile("oasis_edge", "desert", "sand", true, 1.3, ["desert", "oasis", "shore", "land"]),
      tile("sandstone_floor", "desert", "sand", true, 1.2, ["desert", "stone", "land"]),
      tile("desert_path", "desert", "road", true, 0.85, ["desert", "road", "path", "land"]),
    ],
  },
  {
    family: "snow / ice",
    tiles: [
      tile("clean_snow", "snow", "hills", true, 1.45, ["snow", "land"]),
      tile("packed_snow", "snow", "hills", true, 1.3, ["snow", "packed", "land"]),
      tile("icy_snow", "snow", "hills", true, 1.55, ["snow", "ice", "land"]),
      tile("frozen_ground", "snow", "hills", true, 1.5, ["snow", "frozen", "land"]),
      tile("frosty_sparkle_snow", "snow", "hills", true, 1.45, ["snow", "sparkle", "land"]),
      tile("snow_rock", "snow", "hills", true, 1.9, ["snow", "rocks", "land"]),
      tile("frozen_lake_ice", "snow", "water", false, 99, ["water", "ice"]),
      tile("cracked_ice", "snow", "water", false, 99, ["water", "ice", "cracked"]),
      tile("glacier_ice", "snow", "water", false, 99, ["water", "ice", "glacier"]),
      tile("snowy_path", "snow", "road", true, 0.9, ["snow", "road", "path", "land"]),
    ],
  },
  {
    family: "darkland / swamp / cursed land",
    tiles: [
      tile("dark_grassland", "darkland", "final", true, 1.5, ["darkland", "grass", "land"]),
      tile("dead_earth", "darkland", "final", true, 1.45, ["darkland", "dead", "land"]),
      tile("muddy_swamp", "darkland", "final", true, 1.9, ["darkland", "swamp", "mud", "land"]),
      tile("boggy_wetland", "darkland", "final", true, 2.1, ["darkland", "swamp", "bog", "land"]),
      tile("toxic_marsh", "darkland", "water", false, 99, ["water", "toxic", "swamp"]),
      tile("ash_ground", "darkland", "final", true, 1.55, ["darkland", "ash", "land"]),
      tile("cursed_purple_soil", "darkland", "final", true, 1.6, ["darkland", "cursed", "land"]),
      tile("blackened_wasteland", "darkland", "final", true, 1.7, ["darkland", "wasteland", "land"]),
      tile("sickly_corrupted_ground", "darkland", "final", true, 1.8, ["darkland", "corrupt", "land"]),
      tile("haunted_dead_forest_floor", "darkland", "final", true, 1.9, ["darkland", "forest", "land"]),
    ],
  },
  {
    family: "water / shore / bridge",
    tiles: [
      tile("deep_ocean_water", "water", "water", false, 99, ["water", "ocean", "deep"]),
      tile("light_water", "water", "water", false, 99, ["water"]),
      tile("river_water", "water", "water", false, 99, ["water", "river"]),
      tile("shallow_water", "water", "water", false, 99, ["water", "shallow"]),
      tile("swamp_water", "water", "water", false, 99, ["water", "swamp"]),
      tile("beach_shore", "water", "road", true, 1.15, ["shore", "beach", "land"]),
      tile("wooden_bridge_horizontal", "water", "road", true, 0.7, ["bridge", "road", "land", "wood"]),
      tile("wooden_bridge_vertical", "water", "road", true, 0.7, ["bridge", "road", "land", "wood"]),
      tile("stone_bridge_horizontal", "water", "road", true, 0.65, ["bridge", "road", "land", "stone"]),
      tile("stone_bridge_vertical", "water", "road", true, 0.65, ["bridge", "road", "land", "stone"]),
    ],
  },
  {
    family: "mountain / hill / rock / cliff",
    tiles: [
      tile("rocky_hill_ground", "mountain", "hills", true, 2.1, ["rock", "hill", "land"]),
      tile("mountain_foothill", "mountain", "hills", true, 2.4, ["mountain", "foothill", "land"]),
      tile("dark_mountain_ground", "mountain", "hills", false, 99, ["mountain", "blocked"]),
      tile("gravel_stone_ground", "mountain", "hills", true, 1.8, ["rock", "gravel", "land"]),
      tile("cliff_top_rock", "mountain", "hills", false, 99, ["cliff", "blocked"]),
      tile("canyon_stone", "mountain", "hills", false, 99, ["canyon", "cliff", "blocked"]),
      tile("mossy_rock", "mountain", "hills", true, 2, ["rock", "moss", "land"]),
      tile("volcanic_stone", "mountain", "final", false, 99, ["lava", "volcanic", "blocked"]),
      tile("crystal_rock", "mountain", "hills", false, 99, ["crystal", "blocked"]),
      tile("cave_rock_entrance", "mountain", "hills", false, 99, ["cave", "entrance", "blocked"]),
    ],
  },
  {
    family: "road / special / extra biomes",
    tiles: [
      tile("dirt_road", "road", "road", true, 0.65, ["road", "land"]),
      tile("worn_path", "road", "road", true, 0.75, ["road", "path", "land"]),
      tile("cobblestone_road", "road", "road", true, 0.55, ["road", "stone", "land"]),
      tile("ancient_ruin_floor", "road", "road", true, 0.9, ["road", "ruin", "land"]),
      tile("lava_cracked_ground", "road", "final", false, 99, ["lava", "blocked"]),
      tile("tropical_lush_ground", "road", "plains", true, 1.2, ["grass", "tropical", "land"]),
      tile("tropical_beach_sand", "road", "sand", true, 1.15, ["beach", "tropical", "land"]),
      tile("magical_crystal_field", "road", "final", true, 1.6, ["magic", "crystal", "land"]),
      tile("graveyard_earth", "road", "final", true, 1.45, ["darkland", "graveyard", "land"]),
      tile("mixed_utility_terrain", "road", "road", true, 1.3, ["mixed", "land"]),
    ],
  },
  {
    family: "transitions / edges / natural blends",
    tiles: [
      tile("grass_to_dirt_transition", "transition", "plains", true, 1.05, ["grass", "dirt", "transition", "land"]),
      tile("grass_to_forest_transition", "transition", "forest", true, 1.2, ["grass", "forest", "transition", "land"]),
      tile("grass_to_sand_transition", "transition", "sand", true, 1.15, ["grass", "sand", "transition", "land"]),
      tile("grass_to_snow_transition", "transition", "hills", true, 1.2, ["grass", "snow", "transition", "land"]),
      tile("grass_to_darkland_transition", "transition", "final", true, 1.25, ["grass", "darkland", "transition", "land"]),
      tile("beach_to_water_transition", "transition", "water", true, 1.15, ["shore", "beach", "transition", "land"]),
      tile("rocky_shore_to_water_transition", "transition", "water", true, 1.25, ["shore", "rock", "transition", "land"]),
      tile("riverbank_grass_edge", "transition", "plains", true, 1.1, ["riverbank", "grass", "transition", "land"]),
      tile("riverbank_dirt_edge", "transition", "plains", true, 1.1, ["riverbank", "dirt", "transition", "land"]),
      tile("snow_to_ice_transition", "transition", "hills", true, 1.25, ["snow", "ice", "transition", "land"]),
    ],
  },
  {
    family: "roads / rivers / connectors / map utility",
    tiles: [
      tile("dirt_road_horizontal", "road", "road", true, 0.6, ["road", "connector", "horizontal", "land"]),
      tile("dirt_road_vertical", "road", "road", true, 0.6, ["road", "connector", "vertical", "land"]),
      tile("dirt_road_corner", "road", "road", true, 0.65, ["road", "connector", "corner", "land"]),
      tile("dirt_road_t_junction", "road", "road", true, 0.6, ["road", "connector", "junction", "land"]),
      tile("dirt_road_crossroads", "road", "road", true, 0.55, ["road", "connector", "crossroads", "land"]),
      tile("river_straight", "water", "water", false, 99, ["water", "river", "connector"]),
      tile("river_bend", "water", "water", false, 99, ["water", "river", "connector"]),
      tile("river_t_junction", "water", "water", false, 99, ["water", "river", "connector", "junction"]),
      tile("shallow_ford_stepping_stones", "road", "road", true, 0.9, ["ford", "river", "road", "land"]),
      tile("ruined_stone_entrance_ground", "road", "road", true, 1, ["ruin", "entrance", "land"]),
    ],
  },
];

function tile(
  id: string,
  biome: GenericWorldBiome,
  encounterFamily: GenericWorldEncounterFamily,
  walkable: boolean,
  movementCost: number,
  tags: readonly string[],
  notes?: string,
): GenericTileSeed {
  return { id, biome, encounterFamily, walkable, movementCost, tags, notes };
}

function displayName(id: string): string {
  return id
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export const GENERIC_WORLD_TILE_DEFINITIONS = ROWS.flatMap((row, rowIndex) =>
  row.tiles.map((definition, col): GenericWorldTileDefinition => ({
    ...definition,
    id: definition.id,
    displayName: displayName(definition.id),
    row: rowIndex,
    col,
    rowFamily: row.family,
    sourceRect: {
      x: col * GENERIC_WORLD_ATLAS.tileWidth,
      y: rowIndex * GENERIC_WORLD_ATLAS.tileHeight,
      width: GENERIC_WORLD_ATLAS.tileWidth,
      height: GENERIC_WORLD_ATLAS.tileHeight,
    },
    textureKey: GENERIC_WORLD_ATLAS.textureKey,
    atlasId: GENERIC_WORLD_ATLAS.id,
  })),
) as readonly GenericWorldTileDefinition[];

export type GenericWorldTileId = (typeof GENERIC_WORLD_TILE_DEFINITIONS)[number]["id"];

export const GENERIC_WORLD_TILES = Object.fromEntries(
  GENERIC_WORLD_TILE_DEFINITIONS.map((tileDefinition) => [tileDefinition.id, tileDefinition]),
) as Record<GenericWorldTileId, GenericWorldTileDefinition<GenericWorldTileId>>;

export const GENERIC_WORLD_TILE_IDS = {
  grassFallback: "bright_grass",
  desertFallback: "bright_sand",
  deepWater: "deep_ocean_water",
  lightWater: "light_water",
  shallowWater: "shallow_water",
  riverWater: "river_water",
  mainRoad: "dirt_road",
  wornRoad: "worn_path",
  crossroads: "dirt_road_crossroads",
  townGround: "cobblestone_road",
  ruinGround: "ancient_ruin_floor",
  forestPath: "forest_path",
  desertPath: "desert_path",
  snowPath: "snowy_path",
  mountainPath: "gravel_stone_ground",
  darklandPath: "dead_earth",
  stoneBridgeHorizontal: "stone_bridge_horizontal",
  stoneBridgeVertical: "stone_bridge_vertical",
  woodBridgeHorizontal: "wooden_bridge_horizontal",
  woodBridgeVertical: "wooden_bridge_vertical",
} as const satisfies Record<string, GenericWorldTileId>;

export function genericIsWorldTileWalkable(tileId?: GenericWorldTileId): boolean {
  if (!tileId) return false;
  return GENERIC_WORLD_TILES[tileId]?.walkable ?? false;
}

export function genericWorldTileMovementCost(tileId?: GenericWorldTileId): number {
  if (!tileId) return 99;
  return GENERIC_WORLD_TILES[tileId]?.movementCost ?? 99;
}

export function genericWorldTileHasTag(tileId: GenericWorldTileId | undefined, tag: string): boolean {
  if (!tileId) return false;
  return GENERIC_WORLD_TILES[tileId]?.tags.includes(tag) ?? false;
}

export function genericWorldTileEncounterFamily(tileId?: GenericWorldTileId): GenericWorldEncounterFamily | undefined {
  if (!tileId) return undefined;
  const family = GENERIC_WORLD_TILES[tileId]?.encounterFamily;
  return family === "road" ? undefined : family;
}

export function genericWorldTileIdsMatching(
  predicate: (tile: GenericWorldTileDefinition<GenericWorldTileId>) => boolean,
): GenericWorldTileId[] {
  return GENERIC_WORLD_TILE_DEFINITIONS.filter((tileDefinition) =>
    predicate(tileDefinition as GenericWorldTileDefinition<GenericWorldTileId>),
  ).map((tileDefinition) => tileDefinition.id as GenericWorldTileId);
}
