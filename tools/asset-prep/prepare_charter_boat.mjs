import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const EXPECTED_SOURCE = {
  width: 2752,
  height: 1536,
  cropX: 0,
  cropY: 52,
  cropWidth: 2752,
  cropHeight: 1376
};

const OUTPUT = {
  width: 2048,
  height: 1024,
  columns: 4,
  rows: 2,
  frameWidth: 512,
  frameHeight: 512
};

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? path.resolve("src/assets/world/current/boats/charter_boat_8dir.png");

if (!inputPath) {
  console.error("Usage: node tools/asset-prep/prepare_charter_boat.mjs <source.png> [output.png]");
  process.exit(1);
}

const source = PNG.sync.read(fs.readFileSync(inputPath));
const crop = source.width === EXPECTED_SOURCE.width && source.height === EXPECTED_SOURCE.height
  ? { ...EXPECTED_SOURCE }
  : proportionalCrop(source);

const sheet = new PNG({ width: OUTPUT.width, height: OUTPUT.height });

for (let y = 0; y < OUTPUT.height; y += 1) {
  for (let x = 0; x < OUTPUT.width; x += 1) {
    const sx = crop.cropX + Math.min(crop.cropWidth - 1, Math.floor(((x + 0.5) * crop.cropWidth) / OUTPUT.width));
    const sy = crop.cropY + Math.min(crop.cropHeight - 1, Math.floor(((y + 0.5) * crop.cropHeight) / OUTPUT.height));
    const sourceIndex = ((sy * source.width) + sx) * 4;
    const targetIndex = ((y * OUTPUT.width) + x) * 4;
    sheet.data[targetIndex] = source.data[sourceIndex];
    sheet.data[targetIndex + 1] = source.data[sourceIndex + 1];
    sheet.data[targetIndex + 2] = source.data[sourceIndex + 2];
    sheet.data[targetIndex + 3] = source.data[sourceIndex + 3];
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, PNG.sync.write(sheet));

const sourceAlphaBounds = alphaBounds(source, 0, 0, source.width, source.height);
const outputAlphaBounds = alphaBounds(sheet, 0, 0, sheet.width, sheet.height);
const frameBounds = DIRECTIONS.map((direction, index) => {
  const col = index % OUTPUT.columns;
  const row = Math.floor(index / OUTPUT.columns);
  return {
    direction,
    frame: index,
    bounds: alphaBounds(sheet, col * OUTPUT.frameWidth, row * OUTPUT.frameHeight, OUTPUT.frameWidth, OUTPUT.frameHeight)
  };
});

console.log(JSON.stringify({
  input: path.resolve(inputPath),
  output: path.resolve(outputPath),
  source: { width: source.width, height: source.height, alphaBounds: sourceAlphaBounds },
  crop,
  runtimeSheet: OUTPUT,
  outputAlphaBounds,
  frameBounds
}, null, 2));

function proportionalCrop(png) {
  const scaleY = png.height / EXPECTED_SOURCE.height;
  const cropY = Math.max(0, Math.round(EXPECTED_SOURCE.cropY * scaleY));
  const cropHeight = Math.min(png.height - cropY, Math.round(EXPECTED_SOURCE.cropHeight * scaleY));
  return {
    width: png.width,
    height: png.height,
    cropX: 0,
    cropY,
    cropWidth: png.width,
    cropHeight
  };
}

function alphaBounds(png, startX, startY, width, height) {
  let minX = startX + width;
  let minY = startY + height;
  let maxX = -1;
  let maxY = -1;
  let opaquePixels = 0;
  for (let y = startY; y < startY + height; y += 1) {
    for (let x = startX; x < startX + width; x += 1) {
      const alpha = png.data[((y * png.width) + x) * 4 + 3];
      if (alpha === 0) continue;
      opaquePixels += 1;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (opaquePixels === 0) return { opaquePixels: 0 };
  return { opaquePixels, minX, minY, maxX, maxY };
}
