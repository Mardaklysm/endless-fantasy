import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const SOURCE_ROOT = "D:/Tools/rembg/bg_output";
const SOURCE_COPY_DIR = path.join(PROJECT_ROOT, "assets_v2", "source_sheets", "class_sprites");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "assets_v2", "characters", "classes");
const REPORT_DIR = path.join(PROJECT_ROOT, "docs", "debug", "sprite-import");
const DATA_OUTPUT = path.join(PROJECT_ROOT, "src", "data", "characterSprites.ts");

const COLUMNS = 5;
const ROWS = 2;
const DEFAULT_CELL_SIZE = 512;
const CELL_MARGIN = 48;
const ALPHA_THRESHOLD = 8;

const CLASSES = [
  { id: "fighter", source: "fighter.png", textureKey: "class_fighter_sheet" },
  { id: "priest", source: "priest.png", textureKey: "class_priest_sheet" },
  { id: "wizard", source: "wizard.png", textureKey: "class_wizard_sheet" }
];

const FRAME_LAYOUT = [
  { name: "attack_windup_left", row: 0, col: 0, index: 0, rationale: "First attack pose; character faces left." },
  { name: "attack_release_left", row: 0, col: 1, index: 1, rationale: "Second attack/release pose; effect extends left." },
  { name: "walk_down_a", row: 0, col: 2, index: 2, rationale: "First front-facing walking pose in top row." },
  { name: "walk_down_b", row: 0, col: 3, index: 3, rationale: "Second front-facing walking pose in top row." },
  { name: "walk_left_a", row: 0, col: 4, index: 4, rationale: "First side-facing walk pose after down frames; assigned left by sheet order." },
  { name: "walk_left_b", row: 1, col: 0, index: 5, rationale: "Second side-facing walk pose; assigned left by sheet order." },
  { name: "walk_right_a", row: 1, col: 1, index: 6, rationale: "Next side-facing walk pose; assigned right by sheet order." },
  { name: "walk_right_b", row: 1, col: 2, index: 7, rationale: "Final side-facing walk pose; assigned right by sheet order." },
  { name: "walk_up_a", row: 1, col: 3, index: 8, rationale: "First back-facing/up walking pose." },
  { name: "walk_up_b", row: 1, col: 4, index: 9, rationale: "Second back-facing/up walking pose." }
];

function main() {
  ensureDir(SOURCE_COPY_DIR);
  ensureDir(OUTPUT_DIR);
  ensureDir(REPORT_DIR);
  ensureDir(path.dirname(DATA_OUTPUT));

  const prepared = CLASSES.map((entry) => prepareClass(entry));
  const dimensions = chooseOutputDimensions(prepared);

  const manifest = {};
  for (const classData of prepared) {
    const result = normalizeClass(classData, dimensions);
    manifest[classData.id] = result.manifestEntry;
    writePng(path.join(OUTPUT_DIR, `${classData.id}_normalized.png`), result.sheet);
    writePng(path.join(REPORT_DIR, `${classData.id}.debug.png`), result.debugPreview);
    fs.writeFileSync(path.join(REPORT_DIR, `${classData.id}.import-report.md`), result.report, "utf8");
  }

  fs.writeFileSync(path.join(REPORT_DIR, "character-sprites.import-report.json"), JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(DATA_OUTPUT, buildTypeScriptManifest(manifest), "utf8");

  console.log(`Imported ${CLASSES.length} class sprite sheets.`);
  console.log(`Normalized sheets: ${relative(OUTPUT_DIR)}`);
  console.log(`Manifest: ${relative(DATA_OUTPUT)}`);
  console.log(`Cell size: ${dimensions.cellWidth}x${dimensions.cellHeight}`);
}

function prepareClass(entry) {
  const sourcePath = path.join(SOURCE_ROOT, entry.source);
  const copiedPath = path.join(SOURCE_COPY_DIR, entry.source);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing source sprite sheet: ${sourcePath}`);
  fs.copyFileSync(sourcePath, copiedPath);

  const image = readPng(sourcePath);
  const frames = FRAME_LAYOUT.map((layout) => {
    const rect = sourceCellRect(image.width, image.height, layout.col, layout.row);
    const bbox = alphaBBox(image, rect);
    const warnings = [];
    if (!bbox) warnings.push("No alpha pixels detected in source cell.");
    if (bbox) {
      if (bbox.x <= rect.x || bbox.y <= rect.y || bbox.x + bbox.width >= rect.x + rect.width || bbox.y + bbox.height >= rect.y + rect.height) {
        warnings.push("Alpha bbox touches source cell boundary; verify proportional split.");
      }
    }
    const bodyAnchorX = bbox ? detectBodyAnchorX(image, bbox) : rect.x + rect.width / 2;
    return {
      ...layout,
      sourceRect: rect,
      sourceAlphaBBox: bbox,
      sourceBodyAnchorX: Math.round(bodyAnchorX * 100) / 100,
      sourceFeetBaselineY: bbox ? bbox.y + bbox.height - 1 : rect.y + rect.height - 1,
      warnings
    };
  });

  return {
    ...entry,
    sourcePath,
    copiedPath,
    image,
    frames
  };
}

function chooseOutputDimensions(classes) {
  let maxLeft = DEFAULT_CELL_SIZE / 2 - CELL_MARGIN;
  let maxRight = DEFAULT_CELL_SIZE / 2 - CELL_MARGIN;
  let maxHeight = DEFAULT_CELL_SIZE - CELL_MARGIN * 2;

  for (const classData of classes) {
    for (const frame of classData.frames) {
      const bbox = frame.sourceAlphaBBox;
      if (!bbox) continue;
      const anchorInBBox = frame.sourceBodyAnchorX - bbox.x;
      maxLeft = Math.max(maxLeft, anchorInBBox);
      maxRight = Math.max(maxRight, bbox.width - anchorInBBox);
      maxHeight = Math.max(maxHeight, bbox.height);
    }
  }

  const requiredWidth = Math.ceil(Math.max(DEFAULT_CELL_SIZE, (Math.max(maxLeft, maxRight) + CELL_MARGIN) * 2));
  const requiredHeight = Math.ceil(Math.max(DEFAULT_CELL_SIZE, maxHeight + CELL_MARGIN * 2));
  return {
    cellWidth: nextMultipleOf64(requiredWidth),
    cellHeight: nextMultipleOf64(requiredHeight)
  };
}

function normalizeClass(classData, dimensions) {
  const { cellWidth, cellHeight } = dimensions;
  const bodyCenterX = Math.floor(cellWidth / 2);
  const feetBaselineY = cellHeight - CELL_MARGIN;
  const sheet = makeImage(cellWidth * COLUMNS, cellHeight * ROWS);
  const debugPreview = makeImage(sheet.width, sheet.height, [14, 17, 29, 255]);
  drawChecker(debugPreview, 32, [18, 23, 37, 255], [10, 14, 24, 255]);

  const frameManifest = {};

  for (const frame of classData.frames) {
    const bbox = frame.sourceAlphaBBox;
    const destCellX = frame.col * cellWidth;
    const destCellY = frame.row * cellHeight;
    const frameWarnings = [...frame.warnings];
    let placement = { x: destCellX, y: destCellY, width: 0, height: 0 };

    if (bbox) {
      const anchorInBBox = frame.sourceBodyAnchorX - bbox.x;
      const destX = Math.round(destCellX + bodyCenterX - anchorInBBox);
      const destY = Math.round(destCellY + feetBaselineY - bbox.height + 1);
      placement = { x: destX - destCellX, y: destY - destCellY, width: bbox.width, height: bbox.height };
      if (placement.x < 0 || placement.y < 0 || placement.x + placement.width > cellWidth || placement.y + placement.height > cellHeight) {
        frameWarnings.push("Normalized placement would clip; increase cell size or adjust anchor detection.");
      }
      blit(classData.image, sheet, bbox, destX, destY);
      blitComposite(classData.image, debugPreview, bbox, destX, destY);
    }

    drawRect(debugPreview, destCellX, destCellY, cellWidth - 1, cellHeight - 1, [255, 230, 128, 255]);
    drawLine(debugPreview, destCellX, destCellY + feetBaselineY, destCellX + cellWidth - 1, destCellY + feetBaselineY, [96, 216, 255, 255]);
    drawCross(debugPreview, destCellX + bodyCenterX, destCellY + feetBaselineY, 12, [255, 96, 128, 255]);
    drawText(debugPreview, `${frame.index} ${frame.name}`, destCellX + 12, destCellY + 12, [255, 248, 214, 255], 2);
    drawText(debugPreview, `${placement.x},${placement.y} ${placement.width}x${placement.height}`, destCellX + 12, destCellY + 34, [178, 220, 255, 255], 2);

    frameManifest[frame.name] = {
      row: frame.row,
      col: frame.col,
      index: frame.index,
      sourceIndex: frame.index,
      sourceRow: frame.row,
      sourceCol: frame.col,
      sourceRect: frame.sourceRect,
      sourceAlphaBBox: frame.sourceAlphaBBox,
      normalizedPlacement: placement,
      sourceAnchor: {
        bodyCenterX: frame.sourceBodyAnchorX,
        feetBaselineY: frame.sourceFeetBaselineY
      },
      rationale: frame.rationale,
      warnings: frameWarnings
    };
  }

  const manifestEntry = {
    image: `assets_v2/characters/classes/${classData.id}_normalized.png`,
    textureKey: classData.textureKey,
    source: {
      originalFile: normalizeSlash(classData.sourcePath),
      copiedFile: normalizeSlash(relative(classData.copiedPath)),
      sheetWidth: classData.image.width,
      sheetHeight: classData.image.height,
      sourceColumns: COLUMNS,
      sourceRows: ROWS,
      splitMethod: "rounded proportional 5x2 cell boundaries from the source sheet dimensions"
    },
    grid: {
      columns: COLUMNS,
      rows: ROWS,
      cellWidth,
      cellHeight,
      sheetWidth: cellWidth * COLUMNS,
      sheetHeight: cellHeight * ROWS
    },
    anchor: {
      bodyCenterX,
      feetBaselineY
    },
    frameOrder: FRAME_LAYOUT.map((frame) => frame.name),
    frames: frameManifest,
    notes: [
      "Source alpha channel was used as-is; no rembg, background removal, or chroma key was run.",
      "All frames share a fixed normalized body center and feet baseline.",
      "Attack frames use lower-body alpha median anchors so weapon/effect pixels do not pull the body anchor.",
      "Side left/right categories preserve the source sheet order."
    ]
  };

  return {
    sheet,
    debugPreview,
    manifestEntry,
    report: buildMarkdownReport(classData.id, manifestEntry)
  };
}

function buildMarkdownReport(classId, entry) {
  const lines = [];
  lines.push(`# ${titleCase(classId)} Sprite Import Report`);
  lines.push("");
  lines.push(`- Source: \`${entry.source.originalFile}\``);
  lines.push(`- Copied source: \`${entry.source.copiedFile}\``);
  lines.push(`- Normalized sheet: \`${entry.image}\``);
  lines.push(`- Source size: ${entry.source.sheetWidth}x${entry.source.sheetHeight}`);
  lines.push(`- Cell size: ${entry.grid.cellWidth}x${entry.grid.cellHeight}`);
  lines.push(`- Sheet size: ${entry.grid.sheetWidth}x${entry.grid.sheetHeight}`);
  lines.push(`- Anchor: bodyCenterX=${entry.anchor.bodyCenterX}, feetBaselineY=${entry.anchor.feetBaselineY}`);
  lines.push("");
  lines.push("## Mapping");
  lines.push("");
  lines.push("| Frame | Source cell | Source bbox | Placement | Source anchor | Notes |");
  lines.push("|---|---:|---:|---:|---:|---|");
  for (const frameName of entry.frameOrder) {
    const frame = entry.frames[frameName];
    const bbox = frame.sourceAlphaBBox
      ? `${frame.sourceAlphaBBox.x},${frame.sourceAlphaBBox.y} ${frame.sourceAlphaBBox.width}x${frame.sourceAlphaBBox.height}`
      : "none";
    const placement = `${frame.normalizedPlacement.x},${frame.normalizedPlacement.y} ${frame.normalizedPlacement.width}x${frame.normalizedPlacement.height}`;
    const sourceCell = `r${frame.sourceRow} c${frame.sourceCol} i${frame.sourceIndex}`;
    const sourceAnchor = `${frame.sourceAnchor.bodyCenterX},${frame.sourceAnchor.feetBaselineY}`;
    const notes = [frame.rationale, ...frame.warnings].join(" ");
    lines.push(`| \`${frameName}\` | ${sourceCell} | ${bbox} | ${placement} | ${sourceAnchor} | ${notes} |`);
  }
  lines.push("");
  lines.push("## Verification Notes");
  lines.push("");
  lines.push("- The source PNG alpha channel was preserved directly.");
  lines.push("- The actual normalized sheet has transparent cells with no labels or grid.");
  lines.push("- The debug preview adds labels, cell boxes, a cyan feet-baseline line, and a red anchor cross only for QA.");
  lines.push("- Left/right walking labels preserve sheet order because side-facing classification can be visually subtle across the class art.");
  lines.push("");
  return lines.join("\n");
}

function buildTypeScriptManifest(manifest) {
  return `// Generated by tools/art_import/import_character_sprites.mjs. Do not hand-edit frame measurements.\n` +
    `export const CHARACTER_SPRITES = ${JSON.stringify(manifest, null, 2)} as const;\n\n` +
    `export type CharacterSpriteClass = keyof typeof CHARACTER_SPRITES;\n` +
    `export type CharacterSpriteFrameName = keyof typeof CHARACTER_SPRITES["fighter"]["frames"];\n`;
}

function sourceCellRect(width, height, col, row) {
  const x0 = Math.round((col * width) / COLUMNS);
  const x1 = Math.round(((col + 1) * width) / COLUMNS);
  const y0 = Math.round((row * height) / ROWS);
  const y1 = Math.round(((row + 1) * height) / ROWS);
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function alphaBBox(image, rect) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      if (alphaAt(image, x, y) <= ALPHA_THRESHOLD) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return undefined;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function detectBodyAnchorX(image, bbox) {
  const startY = bbox.y + Math.floor(bbox.height * 0.35);
  const values = [];
  for (let y = startY; y < bbox.y + bbox.height; y += 1) {
    for (let x = bbox.x; x < bbox.x + bbox.width; x += 1) {
      if (alphaAt(image, x, y) > ALPHA_THRESHOLD) values.push(x);
    }
  }
  if (!values.length) return bbox.x + bbox.width / 2;
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

function alphaAt(image, x, y) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return 0;
  return image.data[(y * image.width + x) * 4 + 3];
}

function blit(source, dest, rect, destX, destY) {
  for (let y = 0; y < rect.height; y += 1) {
    const sy = rect.y + y;
    const dy = destY + y;
    if (dy < 0 || dy >= dest.height || sy < 0 || sy >= source.height) continue;
    for (let x = 0; x < rect.width; x += 1) {
      const sx = rect.x + x;
      const dx = destX + x;
      if (dx < 0 || dx >= dest.width || sx < 0 || sx >= source.width) continue;
      const si = (sy * source.width + sx) * 4;
      const di = (dy * dest.width + dx) * 4;
      dest.data[di] = source.data[si];
      dest.data[di + 1] = source.data[si + 1];
      dest.data[di + 2] = source.data[si + 2];
      dest.data[di + 3] = source.data[si + 3];
    }
  }
}

function blitComposite(source, dest, rect, destX, destY) {
  for (let y = 0; y < rect.height; y += 1) {
    const sy = rect.y + y;
    const dy = destY + y;
    if (dy < 0 || dy >= dest.height || sy < 0 || sy >= source.height) continue;
    for (let x = 0; x < rect.width; x += 1) {
      const sx = rect.x + x;
      const dx = destX + x;
      if (dx < 0 || dx >= dest.width || sx < 0 || sx >= source.width) continue;
      const si = (sy * source.width + sx) * 4;
      const alpha = source.data[si + 3] / 255;
      if (alpha <= 0) continue;
      const di = (dy * dest.width + dx) * 4;
      const inverse = 1 - alpha;
      dest.data[di] = Math.round(source.data[si] * alpha + dest.data[di] * inverse);
      dest.data[di + 1] = Math.round(source.data[si + 1] * alpha + dest.data[di + 1] * inverse);
      dest.data[di + 2] = Math.round(source.data[si + 2] * alpha + dest.data[di + 2] * inverse);
      dest.data[di + 3] = Math.max(dest.data[di + 3], source.data[si + 3]);
    }
  }
}

function drawChecker(image, size, a, b) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      setPixel(image, x, y, Math.floor(x / size + y / size) % 2 === 0 ? a : b);
    }
  }
}

function drawRect(image, x, y, width, height, color) {
  drawLine(image, x, y, x + width, y, color);
  drawLine(image, x, y + height, x + width, y + height, color);
  drawLine(image, x, y, x, y + height, color);
  drawLine(image, x + width, y, x + width, y + height, color);
}

function drawLine(image, x0, y0, x1, y1, color) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    setPixel(image, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function drawCross(image, x, y, radius, color) {
  drawLine(image, x - radius, y, x + radius, y, color);
  drawLine(image, x, y - radius, x, y + radius, color);
}

function drawText(image, text, x, y, color, scale = 1) {
  let cursorX = x;
  for (const char of text.toUpperCase()) {
    if (char === "\n") {
      cursorX = x;
      y += 8 * scale;
      continue;
    }
    const glyph = FONT[char] ?? FONT["?"];
    for (let row = 0; row < glyph.length; row += 1) {
      for (let col = 0; col < glyph[row].length; col += 1) {
        if (glyph[row][col] !== "1") continue;
        for (let yy = 0; yy < scale; yy += 1) {
          for (let xx = 0; xx < scale; xx += 1) {
            setPixel(image, cursorX + col * scale + xx, y + row * scale + yy, color);
          }
        }
      }
    }
    cursorX += 6 * scale;
  }
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = (y * image.width + x) * 4;
  image.data[i] = color[0];
  image.data[i + 1] = color[1];
  image.data[i + 2] = color[2];
  image.data[i + 3] = color[3];
}

function makeImage(width, height, fill = [0, 0, 0, 0]) {
  const data = Buffer.alloc(width * height * 4);
  if (fill[3] !== 0 || fill[0] !== 0 || fill[1] !== 0 || fill[2] !== 0) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fill[0];
      data[i + 1] = fill[1];
      data[i + 2] = fill[2];
      data[i + 3] = fill[3];
    }
  }
  return { width, height, data };
}

function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) throw new Error(`Not a PNG: ${filePath}`);
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Unsupported PNG format in ${filePath}; expected 8-bit RGBA, got bitDepth=${bitDepth}, colorType=${colorType}`);
  }
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const data = unfilterRgba(inflated, width, height);
  return { width, height, data };
}

function unfilterRgba(raw, width, height) {
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(width * height * bpp);
  let input = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[input++];
    const rowStart = y * stride;
    const prevRowStart = rowStart - stride;
    for (let x = 0; x < stride; x += 1) {
      const rawValue = raw[input++];
      const left = x >= bpp ? out[rowStart + x - bpp] : 0;
      const up = y > 0 ? out[prevRowStart + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[prevRowStart + x - bpp] : 0;
      let value = rawValue;
      if (filter === 1) value = rawValue + left;
      else if (filter === 2) value = rawValue + up;
      else if (filter === 3) value = rawValue + Math.floor((left + up) / 2);
      else if (filter === 4) value = rawValue + paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter type: ${filter}`);
      out[rowStart + x] = value & 0xff;
    }
  }
  return out;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function writePng(filePath, image) {
  ensureDir(path.dirname(filePath));
  const rowBytes = image.width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const dest = y * (rowBytes + 1);
    raw[dest] = 0;
    image.data.copy(raw, dest + 1, y * rowBytes, y * rowBytes + rowBytes);
  }
  const chunks = [
    pngChunk("IHDR", ihdr(image.width, image.height)),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0))
  ];
  fs.writeFileSync(filePath, Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), ...chunks]));
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

let CRC_TABLE;
function crc32(buffer) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function nextMultipleOf64(value) {
  return Math.ceil(value / 64) * 64;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function relative(targetPath) {
  return normalizeSlash(path.relative(PROJECT_ROOT, targetPath));
}

function normalizeSlash(value) {
  return value.replace(/\\/g, "/");
}

function titleCase(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

const FONT = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "?": ["11110", "00001", "00001", "00110", "00100", "00000", "00100"],
  "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
};

main();
