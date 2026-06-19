export const WORLD_ATLAS = {
  textureKey: "world_atlas",
  image: "src/assets/world/world_atlas.normalized.png",
  sourceCopy: "src/assets/world/source/master_overworld_tileset_atlas_10x10.png",
  columns: 10,
  rows: 10,
  tileWidth: 256,
  tileHeight: 256,
  sheetWidth: 2560,
  sheetHeight: 2560
} as const;

export type WorldBiome =
  | "grassland"
  | "forest"
  | "desert"
  | "snow"
  | "darkland"
  | "water"
  | "mountain"
  | "road"
  | "transition";

export type WorldEncounterFamily = "plains" | "forest" | "hills" | "sand" | "water" | "final" | "road";

export interface WorldTileDefinition {
  id: WorldTileId;
  row: number;
  col: number;
  biome: WorldBiome;
  encounterFamily: WorldEncounterFamily;
  walkable: boolean;
  movementCost: number;
  tags: readonly string[];
  notes?: string;
}

export const WORLD_TILE_DEFINITIONS = [
  {
    "id": "bright_grass",
    "row": 0,
    "col": 0,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1,
    "tags": [
      "grass",
      "land"
    ]
  },
  {
    "id": "medium_grass",
    "row": 0,
    "col": 1,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1,
    "tags": [
      "grass",
      "land"
    ]
  },
  {
    "id": "dark_grass",
    "row": 0,
    "col": 2,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1,
    "tags": [
      "grass",
      "land"
    ]
  },
  {
    "id": "flower_meadow",
    "row": 0,
    "col": 3,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1,
    "tags": [
      "grass",
      "flowers",
      "land"
    ]
  },
  {
    "id": "clover_lush_grass",
    "row": 0,
    "col": 4,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1,
    "tags": [
      "grass",
      "lush",
      "land"
    ]
  },
  {
    "id": "trampled_grass",
    "row": 0,
    "col": 5,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1,
    "tags": [
      "grass",
      "worn",
      "land"
    ]
  },
  {
    "id": "weeds_grass",
    "row": 0,
    "col": 6,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1.1,
    "tags": [
      "grass",
      "weeds",
      "land"
    ]
  },
  {
    "id": "dirt_patch",
    "row": 0,
    "col": 7,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1,
    "tags": [
      "dirt",
      "grass",
      "land"
    ]
  },
  {
    "id": "grass_stones",
    "row": 0,
    "col": 8,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1.2,
    "tags": [
      "grass",
      "rocks",
      "land"
    ]
  },
  {
    "id": "fertile_field_grass",
    "row": 0,
    "col": 9,
    "biome": "grassland",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1,
    "tags": [
      "grass",
      "field",
      "land"
    ]
  },
  {
    "id": "forest_floor",
    "row": 1,
    "col": 0,
    "biome": "forest",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 1.4,
    "tags": [
      "forest",
      "land"
    ]
  },
  {
    "id": "dark_forest_floor",
    "row": 1,
    "col": 1,
    "biome": "forest",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 1.6,
    "tags": [
      "forest",
      "dark",
      "land"
    ]
  },
  {
    "id": "mossy_forest_ground",
    "row": 1,
    "col": 2,
    "biome": "forest",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 1.4,
    "tags": [
      "forest",
      "moss",
      "land"
    ]
  },
  {
    "id": "dense_leafy_woodland",
    "row": 1,
    "col": 3,
    "biome": "forest",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 2.1,
    "tags": [
      "forest",
      "dense",
      "land"
    ]
  },
  {
    "id": "bush_hedge",
    "row": 1,
    "col": 4,
    "biome": "forest",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 1.8,
    "tags": [
      "forest",
      "bush",
      "land"
    ]
  },
  {
    "id": "tree_covered_green",
    "row": 1,
    "col": 5,
    "biome": "forest",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 2.2,
    "tags": [
      "forest",
      "dense",
      "land"
    ]
  },
  {
    "id": "rooty_forest_earth",
    "row": 1,
    "col": 6,
    "biome": "forest",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 1.7,
    "tags": [
      "forest",
      "roots",
      "land"
    ]
  },
  {
    "id": "autumn_woodland",
    "row": 1,
    "col": 7,
    "biome": "forest",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 1.5,
    "tags": [
      "forest",
      "autumn",
      "land"
    ]
  },
  {
    "id": "enchanted_forest_ground",
    "row": 1,
    "col": 8,
    "biome": "forest",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 1.5,
    "tags": [
      "forest",
      "magic",
      "land"
    ]
  },
  {
    "id": "forest_path",
    "row": 1,
    "col": 9,
    "biome": "forest",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.75,
    "tags": [
      "forest",
      "road",
      "path",
      "land"
    ]
  },
  {
    "id": "bright_sand",
    "row": 2,
    "col": 0,
    "biome": "desert",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.35,
    "tags": [
      "sand",
      "desert",
      "land"
    ]
  },
  {
    "id": "golden_sand",
    "row": 2,
    "col": 1,
    "biome": "desert",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.35,
    "tags": [
      "sand",
      "desert",
      "land"
    ]
  },
  {
    "id": "dune_sand",
    "row": 2,
    "col": 2,
    "biome": "desert",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.55,
    "tags": [
      "sand",
      "desert",
      "dune",
      "land"
    ]
  },
  {
    "id": "rocky_sand",
    "row": 2,
    "col": 3,
    "biome": "desert",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.65,
    "tags": [
      "sand",
      "desert",
      "rocks",
      "land"
    ]
  },
  {
    "id": "cracked_dry_earth",
    "row": 2,
    "col": 4,
    "biome": "desert",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.45,
    "tags": [
      "desert",
      "dry",
      "land"
    ]
  },
  {
    "id": "reddish_desert_soil",
    "row": 2,
    "col": 5,
    "biome": "desert",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.45,
    "tags": [
      "desert",
      "red",
      "land"
    ]
  },
  {
    "id": "cactus_scrub",
    "row": 2,
    "col": 6,
    "biome": "desert",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.8,
    "tags": [
      "desert",
      "scrub",
      "land"
    ]
  },
  {
    "id": "oasis_edge",
    "row": 2,
    "col": 7,
    "biome": "desert",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.3,
    "tags": [
      "desert",
      "oasis",
      "shore",
      "land"
    ]
  },
  {
    "id": "sandstone_floor",
    "row": 2,
    "col": 8,
    "biome": "desert",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.2,
    "tags": [
      "desert",
      "stone",
      "land"
    ]
  },
  {
    "id": "desert_path",
    "row": 2,
    "col": 9,
    "biome": "desert",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.85,
    "tags": [
      "desert",
      "road",
      "path",
      "land"
    ]
  },
  {
    "id": "clean_snow",
    "row": 3,
    "col": 0,
    "biome": "snow",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 1.45,
    "tags": [
      "snow",
      "land"
    ]
  },
  {
    "id": "packed_snow",
    "row": 3,
    "col": 1,
    "biome": "snow",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 1.3,
    "tags": [
      "snow",
      "packed",
      "land"
    ]
  },
  {
    "id": "icy_snow",
    "row": 3,
    "col": 2,
    "biome": "snow",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 1.55,
    "tags": [
      "snow",
      "ice",
      "land"
    ]
  },
  {
    "id": "frozen_ground",
    "row": 3,
    "col": 3,
    "biome": "snow",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 1.5,
    "tags": [
      "snow",
      "frozen",
      "land"
    ]
  },
  {
    "id": "frosty_sparkle_snow",
    "row": 3,
    "col": 4,
    "biome": "snow",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 1.45,
    "tags": [
      "snow",
      "sparkle",
      "land"
    ]
  },
  {
    "id": "snow_rock",
    "row": 3,
    "col": 5,
    "biome": "snow",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 1.9,
    "tags": [
      "snow",
      "rocks",
      "land"
    ]
  },
  {
    "id": "frozen_lake_ice",
    "row": 3,
    "col": 6,
    "biome": "snow",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "ice"
    ],
    "notes": "Blocked ice by current movement rules."
  },
  {
    "id": "cracked_ice",
    "row": 3,
    "col": 7,
    "biome": "snow",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "ice",
      "cracked"
    ],
    "notes": "Blocked ice by current movement rules."
  },
  {
    "id": "glacier_ice",
    "row": 3,
    "col": 8,
    "biome": "snow",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "ice",
      "glacier"
    ],
    "notes": "Blocked ice by current movement rules."
  },
  {
    "id": "snowy_path",
    "row": 3,
    "col": 9,
    "biome": "snow",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.9,
    "tags": [
      "snow",
      "road",
      "path",
      "land"
    ]
  },
  {
    "id": "dark_grassland",
    "row": 4,
    "col": 0,
    "biome": "darkland",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.5,
    "tags": [
      "darkland",
      "grass",
      "land"
    ]
  },
  {
    "id": "dead_earth",
    "row": 4,
    "col": 1,
    "biome": "darkland",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.45,
    "tags": [
      "darkland",
      "dead",
      "land"
    ]
  },
  {
    "id": "muddy_swamp",
    "row": 4,
    "col": 2,
    "biome": "darkland",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.9,
    "tags": [
      "darkland",
      "swamp",
      "mud",
      "land"
    ]
  },
  {
    "id": "boggy_wetland",
    "row": 4,
    "col": 3,
    "biome": "darkland",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 2.1,
    "tags": [
      "darkland",
      "swamp",
      "bog",
      "land"
    ]
  },
  {
    "id": "toxic_marsh",
    "row": 4,
    "col": 4,
    "biome": "darkland",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "toxic",
      "swamp"
    ],
    "notes": "Blocked toxic water."
  },
  {
    "id": "ash_ground",
    "row": 4,
    "col": 5,
    "biome": "darkland",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.55,
    "tags": [
      "darkland",
      "ash",
      "land"
    ]
  },
  {
    "id": "cursed_purple_soil",
    "row": 4,
    "col": 6,
    "biome": "darkland",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.6,
    "tags": [
      "darkland",
      "cursed",
      "land"
    ]
  },
  {
    "id": "blackened_wasteland",
    "row": 4,
    "col": 7,
    "biome": "darkland",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.7,
    "tags": [
      "darkland",
      "wasteland",
      "land"
    ]
  },
  {
    "id": "sickly_corrupted_ground",
    "row": 4,
    "col": 8,
    "biome": "darkland",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.8,
    "tags": [
      "darkland",
      "corrupt",
      "land"
    ]
  },
  {
    "id": "haunted_dead_forest_floor",
    "row": 4,
    "col": 9,
    "biome": "darkland",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.9,
    "tags": [
      "darkland",
      "forest",
      "land"
    ]
  },
  {
    "id": "deep_ocean_water",
    "row": 5,
    "col": 0,
    "biome": "water",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "ocean",
      "deep"
    ]
  },
  {
    "id": "light_water",
    "row": 5,
    "col": 1,
    "biome": "water",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water"
    ]
  },
  {
    "id": "river_water",
    "row": 5,
    "col": 2,
    "biome": "water",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "river"
    ]
  },
  {
    "id": "shallow_water",
    "row": 5,
    "col": 3,
    "biome": "water",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "shallow"
    ]
  },
  {
    "id": "swamp_water",
    "row": 5,
    "col": 4,
    "biome": "water",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "swamp"
    ]
  },
  {
    "id": "beach_shore",
    "row": 5,
    "col": 5,
    "biome": "water",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 1.15,
    "tags": [
      "shore",
      "beach",
      "land"
    ]
  },
  {
    "id": "wooden_bridge_horizontal",
    "row": 5,
    "col": 6,
    "biome": "water",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.7,
    "tags": [
      "bridge",
      "road",
      "land"
    ]
  },
  {
    "id": "wooden_bridge_vertical",
    "row": 5,
    "col": 7,
    "biome": "water",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.7,
    "tags": [
      "bridge",
      "road",
      "land"
    ]
  },
  {
    "id": "stone_bridge_horizontal",
    "row": 5,
    "col": 8,
    "biome": "water",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.65,
    "tags": [
      "bridge",
      "road",
      "land"
    ]
  },
  {
    "id": "stone_bridge_vertical",
    "row": 5,
    "col": 9,
    "biome": "water",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.65,
    "tags": [
      "bridge",
      "road",
      "land"
    ]
  },
  {
    "id": "rocky_hill_ground",
    "row": 6,
    "col": 0,
    "biome": "mountain",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 2.1,
    "tags": [
      "rock",
      "hill",
      "land"
    ]
  },
  {
    "id": "mountain_foothill",
    "row": 6,
    "col": 1,
    "biome": "mountain",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 2.4,
    "tags": [
      "mountain",
      "foothill",
      "land"
    ]
  },
  {
    "id": "dark_mountain_ground",
    "row": 6,
    "col": 2,
    "biome": "mountain",
    "encounterFamily": "hills",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "mountain",
      "blocked"
    ]
  },
  {
    "id": "gravel_stone_ground",
    "row": 6,
    "col": 3,
    "biome": "mountain",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 1.8,
    "tags": [
      "rock",
      "gravel",
      "land"
    ]
  },
  {
    "id": "cliff_top_rock",
    "row": 6,
    "col": 4,
    "biome": "mountain",
    "encounterFamily": "hills",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "cliff",
      "blocked"
    ]
  },
  {
    "id": "canyon_stone",
    "row": 6,
    "col": 5,
    "biome": "mountain",
    "encounterFamily": "hills",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "canyon",
      "cliff",
      "blocked"
    ]
  },
  {
    "id": "mossy_rock",
    "row": 6,
    "col": 6,
    "biome": "mountain",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 2,
    "tags": [
      "rock",
      "moss",
      "land"
    ]
  },
  {
    "id": "volcanic_stone",
    "row": 6,
    "col": 7,
    "biome": "mountain",
    "encounterFamily": "final",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "lava",
      "volcanic",
      "blocked"
    ]
  },
  {
    "id": "crystal_rock",
    "row": 6,
    "col": 8,
    "biome": "mountain",
    "encounterFamily": "hills",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "crystal",
      "blocked"
    ]
  },
  {
    "id": "cave_rock_entrance",
    "row": 6,
    "col": 9,
    "biome": "mountain",
    "encounterFamily": "hills",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "cave",
      "entrance",
      "blocked"
    ],
    "notes": "Blocked unless a POI trigger overlays it."
  },
  {
    "id": "dirt_road",
    "row": 7,
    "col": 0,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.65,
    "tags": [
      "road",
      "land"
    ]
  },
  {
    "id": "worn_path",
    "row": 7,
    "col": 1,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.75,
    "tags": [
      "road",
      "path",
      "land"
    ]
  },
  {
    "id": "cobblestone_road",
    "row": 7,
    "col": 2,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.55,
    "tags": [
      "road",
      "stone",
      "land"
    ]
  },
  {
    "id": "ancient_ruin_floor",
    "row": 7,
    "col": 3,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.9,
    "tags": [
      "road",
      "ruin",
      "land"
    ]
  },
  {
    "id": "lava_cracked_ground",
    "row": 7,
    "col": 4,
    "biome": "road",
    "encounterFamily": "final",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "lava",
      "blocked"
    ]
  },
  {
    "id": "tropical_lush_ground",
    "row": 7,
    "col": 5,
    "biome": "road",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1.2,
    "tags": [
      "grass",
      "tropical",
      "land"
    ]
  },
  {
    "id": "tropical_beach_sand",
    "row": 7,
    "col": 6,
    "biome": "road",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.15,
    "tags": [
      "beach",
      "tropical",
      "land"
    ]
  },
  {
    "id": "magical_crystal_field",
    "row": 7,
    "col": 7,
    "biome": "road",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.6,
    "tags": [
      "magic",
      "crystal",
      "land"
    ]
  },
  {
    "id": "graveyard_earth",
    "row": 7,
    "col": 8,
    "biome": "road",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.45,
    "tags": [
      "darkland",
      "graveyard",
      "land"
    ]
  },
  {
    "id": "mixed_utility_terrain",
    "row": 7,
    "col": 9,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 1.3,
    "tags": [
      "mixed",
      "land"
    ]
  },
  {
    "id": "grass_to_dirt_transition",
    "row": 8,
    "col": 0,
    "biome": "transition",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1.05,
    "tags": [
      "grass",
      "dirt",
      "transition",
      "land"
    ]
  },
  {
    "id": "grass_to_forest_transition",
    "row": 8,
    "col": 1,
    "biome": "transition",
    "encounterFamily": "forest",
    "walkable": true,
    "movementCost": 1.2,
    "tags": [
      "grass",
      "forest",
      "transition",
      "land"
    ]
  },
  {
    "id": "grass_to_sand_transition",
    "row": 8,
    "col": 2,
    "biome": "transition",
    "encounterFamily": "sand",
    "walkable": true,
    "movementCost": 1.15,
    "tags": [
      "grass",
      "sand",
      "transition",
      "land"
    ]
  },
  {
    "id": "grass_to_snow_transition",
    "row": 8,
    "col": 3,
    "biome": "transition",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 1.2,
    "tags": [
      "grass",
      "snow",
      "transition",
      "land"
    ]
  },
  {
    "id": "grass_to_darkland_transition",
    "row": 8,
    "col": 4,
    "biome": "transition",
    "encounterFamily": "final",
    "walkable": true,
    "movementCost": 1.25,
    "tags": [
      "grass",
      "darkland",
      "transition",
      "land"
    ]
  },
  {
    "id": "beach_to_water_transition",
    "row": 8,
    "col": 5,
    "biome": "transition",
    "encounterFamily": "water",
    "walkable": true,
    "movementCost": 1.15,
    "tags": [
      "shore",
      "beach",
      "transition",
      "land"
    ]
  },
  {
    "id": "rocky_shore_to_water_transition",
    "row": 8,
    "col": 6,
    "biome": "transition",
    "encounterFamily": "water",
    "walkable": true,
    "movementCost": 1.25,
    "tags": [
      "shore",
      "rock",
      "transition",
      "land"
    ]
  },
  {
    "id": "riverbank_grass_edge",
    "row": 8,
    "col": 7,
    "biome": "transition",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1.1,
    "tags": [
      "riverbank",
      "grass",
      "transition",
      "land"
    ]
  },
  {
    "id": "riverbank_dirt_edge",
    "row": 8,
    "col": 8,
    "biome": "transition",
    "encounterFamily": "plains",
    "walkable": true,
    "movementCost": 1.1,
    "tags": [
      "riverbank",
      "dirt",
      "transition",
      "land"
    ]
  },
  {
    "id": "snow_to_ice_transition",
    "row": 8,
    "col": 9,
    "biome": "transition",
    "encounterFamily": "hills",
    "walkable": true,
    "movementCost": 1.25,
    "tags": [
      "snow",
      "ice",
      "transition",
      "land"
    ]
  },
  {
    "id": "dirt_road_horizontal",
    "row": 9,
    "col": 0,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.6,
    "tags": [
      "road",
      "connector",
      "horizontal",
      "land"
    ]
  },
  {
    "id": "dirt_road_vertical",
    "row": 9,
    "col": 1,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.6,
    "tags": [
      "road",
      "connector",
      "vertical",
      "land"
    ]
  },
  {
    "id": "dirt_road_corner",
    "row": 9,
    "col": 2,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.65,
    "tags": [
      "road",
      "connector",
      "corner",
      "land"
    ]
  },
  {
    "id": "dirt_road_t_junction",
    "row": 9,
    "col": 3,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.6,
    "tags": [
      "road",
      "connector",
      "junction",
      "land"
    ]
  },
  {
    "id": "dirt_road_crossroads",
    "row": 9,
    "col": 4,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.55,
    "tags": [
      "road",
      "connector",
      "crossroads",
      "land"
    ]
  },
  {
    "id": "river_straight",
    "row": 9,
    "col": 5,
    "biome": "water",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "river",
      "connector"
    ]
  },
  {
    "id": "river_bend",
    "row": 9,
    "col": 6,
    "biome": "water",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "river",
      "connector"
    ]
  },
  {
    "id": "river_t_junction",
    "row": 9,
    "col": 7,
    "biome": "water",
    "encounterFamily": "water",
    "walkable": false,
    "movementCost": 99,
    "tags": [
      "water",
      "river",
      "connector",
      "junction"
    ]
  },
  {
    "id": "shallow_ford_stepping_stones",
    "row": 9,
    "col": 8,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 0.9,
    "tags": [
      "ford",
      "river",
      "road",
      "land"
    ]
  },
  {
    "id": "ruined_stone_entrance_ground",
    "row": 9,
    "col": 9,
    "biome": "road",
    "encounterFamily": "road",
    "walkable": true,
    "movementCost": 1,
    "tags": [
      "ruin",
      "entrance",
      "land"
    ]
  }
] as const;

export type WorldTileId = (typeof WORLD_TILE_DEFINITIONS)[number]["id"];

export const WORLD_TILES = Object.fromEntries(
  WORLD_TILE_DEFINITIONS.map((tile) => [tile.id, tile])
) as unknown as Record<WorldTileId, WorldTileDefinition>;

export function getWorldTileDefinition(tileId: WorldTileId): WorldTileDefinition {
  return WORLD_TILES[tileId];
}

export function isWorldTileWalkable(tileId: WorldTileId): boolean {
  return WORLD_TILES[tileId]?.walkable ?? false;
}

export function worldTileMovementCost(tileId: WorldTileId): number {
  return WORLD_TILES[tileId]?.movementCost ?? 99;
}

export function worldTileHasTag(tileId: WorldTileId | undefined, tag: string): boolean {
  return !!tileId && !!WORLD_TILES[tileId]?.tags.includes(tag);
}

export function worldTileEncounterFamily(tileId: WorldTileId): WorldEncounterFamily | undefined {
  const family = WORLD_TILES[tileId]?.encounterFamily;
  return family === "road" ? undefined : family;
}

export function worldTileIdsMatching(predicate: (tile: WorldTileDefinition) => boolean): WorldTileId[] {
  return WORLD_TILE_DEFINITIONS.filter((tile) => predicate(tile)).map((tile) => tile.id);
}
