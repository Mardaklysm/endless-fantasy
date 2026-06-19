import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const SOURCE_ATLAS = "D:/Projects/new_artwork/dungeon_atlas.jpeg";
const RUNTIME_ATLAS = path.join(PROJECT_ROOT, "src", "assets", "world", "dungeon_atlas.png");
const MANIFEST_PATH = path.join(PROJECT_ROOT, "src", "assets", "world", "dungeonAtlas.manifest.json");
const DEBUG_DIR = path.join(PROJECT_ROOT, "docs", "debug", "dungeon-atlas");
const REPORT_PATH = path.join(DEBUG_DIR, "dungeon-atlas-import-report.md");

const COLUMNS = 8;
const ROWS = 8;
const RUNTIME_SIZE = 1024;
const TILE_SIZE = RUNTIME_SIZE / COLUMNS;

const CELL_ROWS = [
  [
    tile("plain_gray_stone_floor", "floor", "medieval", ["floor", "stone", "town"], "Plain gray stone floor."),
    tile("cracked_gray_stone_floor", "floor", "medieval", ["floor", "stone", "cracked"], "Cracked gray stone floor."),
    tile("mossy_stone_floor", "floor", "medieval", ["floor", "stone", "moss"], "Mossy stone floor."),
    tile("dark_worn_stone_floor", "floor", "medieval", ["floor", "stone", "dark"], "Dark worn stone floor."),
    tile("stone_floor_debris", "floor", "medieval", ["floor", "stone", "debris"], "Stone floor with small debris."),
    tile("stone_floor_drainage_cracks", "floor", "medieval", ["floor", "stone", "drain", "cracked"], "Stone floor with drainage cracks."),
    tile("stone_floor_magic_marks", "floor", "medieval", ["floor", "stone", "magic"], "Stone floor with magic markings."),
    tile("stone_floor_shadow", "floor", "medieval", ["floor", "stone", "shadow"], "Dark shadowed stone floor.")
  ],
  [
    tile("gray_stone_wall", "wall", "medieval", ["wall", "stone"], "Gray stone wall."),
    tile("cracked_stone_wall", "wall", "medieval", ["wall", "stone", "cracked"], "Cracked stone wall."),
    tile("mossy_stone_wall", "wall", "medieval", ["wall", "stone", "moss"], "Mossy stone wall."),
    tile("dark_stone_wall", "wall", "medieval", ["wall", "stone", "dark"], "Dark stone wall."),
    tile("torch_stone_wall", "wall", "medieval", ["wall", "stone", "torch"], "Stone wall with torch."),
    tile("iron_bar_wall", "wall", "medieval", ["wall", "bars", "blocked"], "Iron bar wall."),
    tile("broken_stone_rubble_wall", "wall", "medieval", ["wall", "rubble", "blocked"], "Broken stone rubble wall."),
    tile("heavy_stone_pillar", "wall", "medieval", ["wall", "pillar", "blocked"], "Heavy stone pillar.")
  ],
  [
    tile("dirt_cave_floor", "floor", "cave", ["floor", "cave", "dirt"], "Dirt cave floor."),
    tile("rocky_cave_floor", "floor", "cave", ["floor", "cave", "rock"], "Rocky cave floor."),
    tile("mossy_cave_floor", "floor", "cave", ["floor", "cave", "moss"], "Mossy cave floor."),
    tile("damp_cave_floor", "floor", "cave", ["floor", "cave", "water"], "Damp cave floor."),
    tile("cave_floor_pebbles", "floor", "cave", ["floor", "cave", "pebbles"], "Cave floor with pebbles."),
    tile("cave_floor_roots", "floor", "cave", ["floor", "cave", "roots"], "Cave floor with roots."),
    tile("glowing_mushroom_cave_floor", "floor", "cave", ["floor", "cave", "mushrooms"], "Glowing mushroom cave floor."),
    tile("cave_floor_shadow", "floor", "cave", ["floor", "cave", "shadow"], "Shadowed cave floor.")
  ],
  [
    tile("rough_cave_wall", "wall", "cave", ["wall", "cave"], "Rough cave wall."),
    tile("dark_cave_wall", "wall", "cave", ["wall", "cave", "dark"], "Dark cave wall."),
    tile("mossy_cave_wall", "wall", "cave", ["wall", "cave", "moss"], "Mossy cave wall."),
    tile("wet_cave_wall", "wall", "cave", ["wall", "cave", "water"], "Wet cave wall."),
    tile("root_cave_wall", "wall", "cave", ["wall", "cave", "roots"], "Root-covered cave wall."),
    tile("crystal_cave_wall", "wall", "cave", ["wall", "cave", "crystal"], "Crystal cave wall."),
    tile("cave_rubble_blocker", "wall", "cave", ["wall", "cave", "rubble", "blocked"], "Cave rubble blocker."),
    tile("cave_entrance_exit", "exit", "cave", ["exit", "cave", "doorway"], "Cave entrance or exit.")
  ],
  [
    tile("pale_ice_floor", "floor", "ice", ["floor", "ice"], "Pale ice floor."),
    tile("cracked_ice_floor", "floor", "ice", ["floor", "ice", "cracked"], "Cracked ice floor."),
    tile("frosty_stone_floor", "floor", "ice", ["floor", "ice", "stone"], "Frosted stone floor."),
    tile("snowy_ice_floor", "floor", "ice", ["floor", "ice", "snow"], "Snowy ice floor."),
    tile("slippery_blue_ice_floor", "floor", "ice", ["floor", "ice", "blue"], "Slippery blue ice floor."),
    tile("frozen_crack_ice_floor", "floor", "ice", ["floor", "ice", "cracked"], "Frozen cracked ice floor."),
    tile("snow_drift_ice_floor", "floor", "ice", ["floor", "ice", "snowdrift"], "Snow drift ice floor."),
    tile("ice_floor_shadow", "floor", "ice", ["floor", "ice", "shadow"], "Shadowed ice floor.")
  ],
  [
    tile("ice_wall_block", "wall", "ice", ["wall", "ice"], "Ice wall block."),
    tile("cracked_ice_wall", "wall", "ice", ["wall", "ice", "cracked"], "Cracked ice wall."),
    tile("frosted_stone_wall", "wall", "ice", ["wall", "ice", "stone"], "Frosted stone wall."),
    tile("dark_blue_ice_wall", "wall", "ice", ["wall", "ice", "dark"], "Dark blue ice wall."),
    tile("frozen_crystal_wall", "wall", "ice", ["wall", "ice", "crystal"], "Frozen crystal wall."),
    tile("snow_covered_wall", "wall", "ice", ["wall", "ice", "snow"], "Snow-covered ice wall."),
    tile("ice_pillar_blocker", "wall", "ice", ["wall", "ice", "pillar", "blocked"], "Ice pillar blocker."),
    tile("frozen_doorway_exit", "exit", "ice", ["exit", "ice", "doorway"], "Frozen doorway exit.")
  ],
  [
    tile("closed_treasure_chest_tile", "object", "object", ["object", "chest", "closed"], "Closed treasure chest tile."),
    tile("open_treasure_chest_tile", "object", "object", ["object", "chest", "open"], "Open treasure chest tile."),
    tile("locked_iron_gate_closed", "gate", "object", ["object", "gate", "closed", "blocked"], "Locked iron gate closed."),
    tile("open_iron_gate", "gate", "object", ["object", "gate", "open"], "Open iron gate."),
    tile("stairway_down", "stairs", "object", ["object", "stairs", "down"], "Stairway down."),
    tile("stairway_up", "stairs", "object", ["object", "stairs", "up"], "Stairway up."),
    tile("floor_switch_pressure_plate", "object", "object", ["object", "switch"], "Floor switch pressure plate."),
    tile("glowing_boss_relic_seal", "seal", "object", ["object", "boss", "seal"], "Glowing boss relic seal.")
  ],
  [
    tile("lava_cracked_stone_floor", "floor", "volcanic", ["floor", "lava", "stone"], "Lava-cracked stone floor."),
    tile("volcanic_stone_wall", "wall", "volcanic", ["wall", "lava", "stone"], "Volcanic stone wall."),
    tile("cursed_purple_stone_floor", "floor", "cursed", ["floor", "cursed", "purple"], "Cursed purple stone floor."),
    tile("cursed_purple_wall", "wall", "cursed", ["wall", "cursed", "purple"], "Cursed purple wall."),
    tile("ancient_ruin_floor", "floor", "ruin", ["floor", "ruin", "stone"], "Ancient ruin floor."),
    tile("ancient_ruin_wall", "wall", "ruin", ["wall", "ruin", "stone"], "Ancient ruin wall."),
    tile("magic_portal_exit", "exit", "cursed", ["exit", "portal", "magic"], "Magic portal exit."),
    tile("ornate_boss_door_gate", "gate", "medieval", ["object", "boss", "gate", "door"], "Ornate boss door gate.")
  ]
];

function tile(id, category, theme, tags, notes) {
  return { id, category, theme, tags, notes };
}

function main() {
  ensureDir(path.dirname(RUNTIME_ATLAS));
  ensureDir(DEBUG_DIR);
  if (!fs.existsSync(SOURCE_ATLAS)) throw new Error(`Missing dungeon atlas source: ${SOURCE_ATLAS}`);
  assertGrid();
  convertJpegToPng(SOURCE_ATLAS, RUNTIME_ATLAS);
  const cells = buildCells();
  const manifest = {
    schemaVersion: 1,
    id: "dungeon_atlas",
    generatedBy: "tools/art_import/import_dungeon_atlas.mjs",
    sourceImage: SOURCE_ATLAS,
    sourceSha256: fileHash(SOURCE_ATLAS),
    runtimeImage: "src/assets/world/dungeon_atlas.png",
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
    sourceInset: 3,
    cells,
    tiles: Object.fromEntries(cells.map((cell) => [cell.id, cell]))
  };

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  fs.writeFileSync(REPORT_PATH, buildReport(cells), "utf8");

  console.log(`Imported dungeon_atlas ${RUNTIME_SIZE}x${RUNTIME_SIZE}.`);
  console.log(`Runtime atlas: ${relative(RUNTIME_ATLAS)}`);
  console.log(`Manifest: ${relative(MANIFEST_PATH)}`);
  console.log(`Cells: ${cells.length}; grid ${COLUMNS}x${ROWS}; tile size ${TILE_SIZE}x${TILE_SIZE}`);
}

function assertGrid() {
  if (CELL_ROWS.length !== ROWS) throw new Error(`Dungeon atlas classification has ${CELL_ROWS.length} rows; expected ${ROWS}.`);
  for (let row = 0; row < ROWS; row += 1) {
    if (CELL_ROWS[row].length !== COLUMNS) throw new Error(`Dungeon atlas row ${row} has ${CELL_ROWS[row].length} cells; expected ${COLUMNS}.`);
  }
}

function buildCells() {
  const cells = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const entry = CELL_ROWS[row][col];
      cells.push({
        row,
        col,
        source: {
          x: col * TILE_SIZE,
          y: row * TILE_SIZE,
          width: TILE_SIZE,
          height: TILE_SIZE
        },
        ...entry
      });
    }
  }
  return cells;
}

function convertJpegToPng(source, output) {
  execFileSync(
    "magick",
    [
      source,
      "-resize",
      `${RUNTIME_SIZE}x${RUNTIME_SIZE}!`,
      "-alpha",
      "off",
      output
    ],
    { stdio: "pipe" }
  );
}

function buildReport(cells) {
  const byTheme = new Map();
  for (const cell of cells) {
    byTheme.set(cell.theme, (byTheme.get(cell.theme) ?? 0) + 1);
  }
  const cellRows = cells
    .map((cell) => `- ${cell.row},${cell.col}: ${cell.id} (${cell.category}/${cell.theme}) - ${cell.notes}`)
    .join("\n");
  const themeRows = [...byTheme.entries()].map(([theme, count]) => `- ${theme}: ${count}`).join("\n");
  return `# Dungeon Atlas Import Report

- Source: \`${SOURCE_ATLAS}\`
- Source SHA-256: \`${fileHash(SOURCE_ATLAS)}\`
- Runtime PNG: \`${relative(RUNTIME_ATLAS)}\`
- Manifest: \`${relative(MANIFEST_PATH)}\`
- Grid: ${COLUMNS}x${ROWS}, ${TILE_SIZE}x${TILE_SIZE}px cells
- Background handling: opaque rectangular terrain/interior atlas; no rembg, no color-key transparency
- Runtime note: source cells are cropped inward by 3px when rendered to avoid visible generator grid seams.

## Theme Counts

${themeRows}

## Cells

${cellRows}
`;
}

function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").toUpperCase();
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function relative(filePath) {
  return path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
}

main();
