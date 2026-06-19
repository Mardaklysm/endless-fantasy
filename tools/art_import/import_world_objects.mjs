import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const SOURCE_PATH = "D:\\Projects\\new_artwork\\world_objects_atlas.jpeg";
const RUNTIME_PATH = path.join(PROJECT_ROOT, "src", "assets", "world", "world_objects.png");
const MANIFEST_PATH = path.join(PROJECT_ROOT, "src", "assets", "world", "worldObjectAtlas.manifest.json");
const DEBUG_DIR = path.join(PROJECT_ROOT, "docs", "debug", "world-objects");
const REPORT_PATH = path.join(DEBUG_DIR, "world-objects-import-report.md");

const COLUMNS = 8;
const ROWS = 8;
const RUNTIME_SIZE = 1024;
const TILE_SIZE = RUNTIME_SIZE / COLUMNS;
const EDGE_BACKGROUND_SAMPLE = "#F34CE1";
const FUZZ_PERCENT = 18;

const OBJECT_ROWS = [
  [
    object("mossy_cave_entrance", "dungeonEntrance", ["dungeon", "cave", "entrance"], "Mossy cave entrance."),
    object("bandit_hideout_door", "dungeonEntrance", ["dungeon", "door", "hideout"], "Bandit hideout door."),
    object("jungle_ruins_stairs", "dungeonEntrance", ["dungeon", "ruins", "stairs"], "Jungle ruins stair entrance."),
    object("pirate_grotto_entrance", "dungeonEntrance", ["dungeon", "cave", "pirate"], "Pirate grotto entrance."),
    object("volcanic_temple_entrance", "dungeonEntrance", ["dungeon", "volcanic", "temple"], "Volcanic temple entrance."),
    object("cursed_fortress_gate", "dungeonEntrance", ["dungeon", "gate", "cursed"], "Cursed fortress gate."),
    object("ancient_sealed_door", "dungeonEntrance", ["dungeon", "door", "sealed"], "Ancient sealed stone door."),
    object("dark_boss_portal", "dungeonEntrance", ["dungeon", "portal", "boss"], "Dark boss portal.")
  ],
  [
    object("small_broken_ruins", "landmark", ["ruins", "stone"], "Small broken stone ruins."),
    object("ruined_archway", "landmark", ["ruins", "arch"], "Ruined archway."),
    object("cracked_stone_obelisk", "landmark", ["obelisk", "stone"], "Cracked stone obelisk."),
    object("mossy_statue", "landmark", ["statue", "moss"], "Mossy statue."),
    object("jungle_idol_shrine", "landmark", ["shrine", "jungle", "idol"], "Jungle idol shrine."),
    object("glowing_magic_shrine", "landmark", ["shrine", "magic"], "Glowing magic shrine."),
    object("ancient_standing_stones", "landmark", ["stones", "ancient"], "Ancient standing stones."),
    object("grave_marker_cluster", "landmark", ["grave", "stones"], "Small grave marker cluster.")
  ],
  [
    object("closed_treasure_chest", "treasure", ["chest", "closed"], "Closed wooden treasure chest."),
    object("open_treasure_chest", "treasure", ["chest", "open", "gold"], "Open treasure chest with gold."),
    object("stone_guardian_cache", "treasure", ["chest", "guardian", "stone"], "Stone guardian cache."),
    object("supply_crates", "prop", ["crate", "supplies"], "Supply crates."),
    object("barrel_stack", "prop", ["barrel", "supplies"], "Barrel stack."),
    object("ore_node", "resource", ["ore", "resource"], "Ore resource node."),
    object("herb_bush", "resource", ["herb", "bush"], "Herb gathering bush."),
    object("fishing_spot", "resource", ["fishing", "water"], "Fishing spot marker.")
  ],
  [
    object("octopus_cache", "treasure", ["chest", "sea", "monster"], "Octopus sea cache."),
    object("coral_cluster_blue", "waterOverlay", ["coral", "reef", "water"], "Blue and purple coral cluster."),
    object("jeweled_magic_cache", "treasure", ["chest", "magic", "gems"], "Jeweled magic cache."),
    object("mossy_locked_cache", "treasure", ["chest", "moss", "locked"], "Mossy locked cache."),
    object("shipwreck_debris", "waterOverlay", ["shipwreck", "water"], "Small shipwreck debris."),
    object("broken_mast", "waterOverlay", ["shipwreck", "mast", "water"], "Broken mast sticking from water."),
    object("floating_treasure_barrel", "waterOverlay", ["barrel", "water"], "Floating treasure barrel."),
    object("whirlpool_swirl", "waterOverlay", ["whirlpool", "water"], "Whirlpool swirl.")
  ],
  [
    object("harbor_signpost", "harbor", ["harbor", "sign"], "Harbor signpost."),
    object("wooden_rowboat", "harbor", ["boat", "harbor"], "Small wooden rowboat."),
    object("mooring_post_rope", "harbor", ["dock", "rope"], "Mooring post with rope."),
    object("anchor", "harbor", ["anchor", "harbor"], "Anchor."),
    object("dock_lantern_post", "harbor", ["lantern", "dock"], "Dock lantern post."),
    object("fishing_nets_stack", "harbor", ["nets", "barrels"], "Stacked fishing nets and barrels."),
    object("travel_flag_marker", "harbor", ["flag", "travel"], "Travel flag marker."),
    object("coastal_market_stall", "merchant", ["merchant", "market"], "Small coastal market stall.")
  ],
  [
    object("monster_nest", "encounter", ["monster", "nest"], "Monster nest."),
    object("campfire_cookpot", "camp", ["campfire", "camp"], "Campfire campsite with cookpot."),
    object("secret_merchant_tent", "merchant", ["merchant", "tent"], "Secret merchant tent."),
    object("locked_iron_gate", "landmark", ["gate", "locked"], "Locked iron gate."),
    object("ancient_key_pedestal", "landmark", ["key", "pedestal"], "Ancient key pedestal."),
    object("discovery_sparkle", "effect", ["sparkle", "discovery"], "Glowing discovery sparkle marker."),
    object("smoke_plume", "effect", ["smoke"], "Smoke plume marker."),
    object("quest_notice_board", "prop", ["notice", "board"], "Quest notice board.")
  ],
  [
    object("broadleaf_tree", "nature", ["tree", "forest"], "Centered broadleaf tree."),
    object("dark_pine_tree", "nature", ["tree", "pine"], "Centered dark pine tree."),
    object("palm_tree", "nature", ["tree", "palm"], "Centered palm tree."),
    object("dense_jungle_bush", "nature", ["jungle", "bush"], "Dense jungle bush."),
    object("thorn_bramble", "nature", ["thorn", "bramble"], "Thorn bramble."),
    object("fallen_log", "nature", ["log"], "Fallen log."),
    object("giant_mushroom_cluster", "nature", ["mushroom"], "Giant mushroom cluster."),
    object("vines_over_stone", "nature", ["vines", "stone"], "Vines over stone.")
  ],
  [
    object("gray_boulder_pile", "rock", ["rock", "boulder"], "Centered gray boulder pile."),
    object("rocky_hill_object", "rock", ["rock", "hill"], "Centered rocky hill object."),
    object("small_mountain_peak", "rock", ["mountain"], "Centered small mountain peak."),
    object("snowy_mountain_peak", "rock", ["mountain", "snow"], "Centered snowy mountain peak."),
    object("volcano_cone", "volcanic", ["volcano"], "Centered volcano cone."),
    object("lava_vent_rocks", "volcanic", ["lava", "vent"], "Lava vent rocks."),
    object("black_ash_rock_cluster", "volcanic", ["ash", "rock"], "Black ash rock cluster."),
    object("cursed_purple_crystal_cluster", "crystal", ["crystal", "cursed"], "Cursed purple crystal cluster.")
  ]
];

fs.mkdirSync(path.dirname(RUNTIME_PATH), { recursive: true });
fs.mkdirSync(DEBUG_DIR, { recursive: true });

if (!fs.existsSync(SOURCE_PATH)) {
  throw new Error(`Source object atlas missing: ${SOURCE_PATH}`);
}

convertAtlasToTransparentPng();
writeManifestAndReport();

console.log(`Imported world object atlas to ${path.relative(PROJECT_ROOT, RUNTIME_PATH)}`);
console.log(`Wrote manifest to ${path.relative(PROJECT_ROOT, MANIFEST_PATH)}`);
console.log(`Wrote report to ${path.relative(PROJECT_ROOT, REPORT_PATH)}`);

function object(id, category, tags, notes) {
  return { id, category, tags, notes };
}

function convertAtlasToTransparentPng() {
  execFileSync(
    "magick",
    [
      SOURCE_PATH,
      "-resize",
      `${RUNTIME_SIZE}x${RUNTIME_SIZE}!`,
      "-alpha",
      "set",
      "-bordercolor",
      EDGE_BACKGROUND_SAMPLE,
      "-border",
      "1",
      "-fuzz",
      `${FUZZ_PERCENT}%`,
      "-fill",
      "none",
      "-draw",
      "color 0,0 floodfill",
      "-shave",
      "1x1",
      RUNTIME_PATH
    ],
    { stdio: "pipe" }
  );
}

function writeManifestAndReport() {
  const cells = [];
  const objects = {};
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const source = { x: col * TILE_SIZE, y: row * TILE_SIZE, width: TILE_SIZE, height: TILE_SIZE };
      const entry = { row, col, source, ...OBJECT_ROWS[row][col] };
      cells.push(entry);
      objects[entry.id] = entry;
    }
  }

  const manifest = {
    schemaVersion: 1,
    id: "world_objects",
    sourceImage: SOURCE_PATH,
    runtimeImage: "src/assets/world/world_objects.png",
    columns: COLUMNS,
    rows: ROWS,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    image: {
      width: RUNTIME_SIZE,
      height: RUNTIME_SIZE,
      runtimeFormat: "png",
      sourceFormat: "jpeg"
    },
    backgroundRemoval: {
      method: "resize-then-edge-floodfill",
      tool: "ImageMagick",
      sampledBackground: EDGE_BACKGROUND_SAMPLE,
      fuzzPercent: FUZZ_PERCENT,
      reason: "The source is a full object sheet on a magenta JPG matte. Edge flood-fill removes the connected matte while preserving interior purple portal, crystal, and gem pixels."
    },
    cells,
    objects
  };

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  const rows = cells.map((cell) => `- ${cell.row},${cell.col}: ${cell.id} (${cell.category}) - ${cell.notes}`).join("\n");
  fs.writeFileSync(
    REPORT_PATH,
    `# World Objects Atlas Import Report

- Source: \`${SOURCE_PATH}\`
- Runtime PNG: \`src/assets/world/world_objects.png\`
- Manifest: \`src/assets/world/worldObjectAtlas.manifest.json\`
- Grid: ${COLUMNS}x${ROWS}, ${TILE_SIZE}x${TILE_SIZE}px cells
- Background removal: ImageMagick edge flood-fill from the outer magenta matte, fuzz ${FUZZ_PERCENT}%
- Note: this intentionally avoids global magenta removal so purple portal, crystal, and gem objects remain intact.

## Objects

${rows}
`
  );
}
