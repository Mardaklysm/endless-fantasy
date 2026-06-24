import { createServer } from "node:http";
import { createReadStream, existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const editorMode = process.argv.includes("--battle-map") ? "battle" : "poi";
const editorRoot = path.join(__dirname, editorMode === "battle" ? "battle-map-editor" : "poi-editor");
const editorIndex = editorMode === "battle" ? "/battle-map-editor.html" : "/index.html";
const poiDir = path.join(repoRoot, "src", "data", "pois");
const battleMapDir = path.join(repoRoot, "src", "data", "battle-maps");
const assetPathsFile = path.join(repoRoot, "src", "assets", "assetPaths.ts");
const textureKeysFile = path.join(repoRoot, "src", "assets", "textureKeys.ts");
const enemiesFile = path.join(repoRoot, "src", "data", "enemies.ts");
const host = "127.0.0.1";
const startPort = Number((editorMode === "battle" ? process.env.BATTLE_MAP_EDITOR_PORT : process.env.POI_EDITOR_PORT) ?? 5188);

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".gif", "image/gif"]
]);

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${host}`);
    if (url.pathname === "/api/pois" && req.method === "GET") return sendJson(res, await listPois());
    if (url.pathname.startsWith("/api/pois/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/pois/".length));
      if (req.method === "GET") return sendJson(res, await readPoi(id));
      if (req.method === "PUT") return savePoi(req, res, id);
    }
    if (url.pathname === "/api/battle-maps" && req.method === "GET") return sendJson(res, await listBattleMaps());
    if (url.pathname === "/api/battle-sprites" && req.method === "GET") return sendJson(res, await listBattleSprites());
    if (url.pathname.startsWith("/api/battle-maps/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/battle-maps/".length));
      if (req.method === "GET") return sendJson(res, await readBattleMap(id));
      if (req.method === "PUT") return saveBattleMap(req, res, id);
    }
    if (url.pathname === "/api/asset" && req.method === "GET") return serveAsset(res, url.searchParams.get("path") ?? "");
    if (req.method !== "GET") return sendText(res, 405, "Method not allowed");
    return serveStatic(res, url.pathname === "/" ? editorIndex : url.pathname);
  } catch (error) {
    console.error(error);
    return sendJson(res, { error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

listenOnAvailablePort(startPort);

function listenOnAvailablePort(port) {
  server.once("error", (error) => {
    if (error?.code === "EADDRINUSE" && port < startPort + 20) return listenOnAvailablePort(port + 1);
    console.error(error);
    process.exit(1);
  });
  server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    console.log(`${editorMode === "battle" ? "Battle Map Spawn Editor" : "POI editor"} running at ${url}`);
    openBrowser(url);
  });
}

async function listPois() {
  await fs.mkdir(poiDir, { recursive: true });
  const entries = await fs.readdir(poiDir, { withFileTypes: true });
  const pois = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const poi = JSON.parse(await fs.readFile(path.join(poiDir, entry.name), "utf8"));
    pois.push({ id: poi.id, displayName: poi.displayName, type: poi.type });
  }
  return pois.sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));
}

async function readPoi(id) {
  const file = poiFileForId(id);
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function savePoi(req, res, id) {
  const body = await readRequestBody(req);
  const poi = JSON.parse(body);
  normalizePoi(poi);
  validatePoi(id, poi);
  const file = poiFileForId(id);
  const backup = `${file}.bak`;
  try {
    await fs.copyFile(file, backup);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await fs.writeFile(file, `${JSON.stringify(poi, null, 2)}\n`, "utf8");
  return sendJson(res, { ok: true, backup: path.relative(repoRoot, backup).replaceAll("\\", "/") });
}

function validatePoi(id, poi) {
  if (!poi || typeof poi !== "object") throw new Error("POI metadata must be an object.");
  if (poi.id !== id) throw new Error("POI id must match the URL id.");
  if (!poi.displayName || !poi.type) throw new Error("POI metadata needs displayName and type.");
  if (!poi.background?.path || !poi.background?.key) throw new Error("POI metadata needs a background key/path.");
  for (const key of ["walkableZones", "blockedZones", "eventZones"]) {
    if (!Array.isArray(poi[key])) throw new Error(`${key} must be an array.`);
  }
  for (const zone of [...poi.walkableZones, ...poi.blockedZones]) validateZone(zone);
  for (const event of poi.eventZones) {
    validateZone(event);
    if (!event.label || !event.prompt || !event.activation) throw new Error(`Event ${event.id ?? "(missing id)"} needs label, prompt, and activation.`);
    if (!event.action?.kind) throw new Error(`Event ${event.id} needs an action kind.`);
  }
}

function normalizePoi(poi) {
  poi.walkableZones ??= [];
  poi.blockedZones ??= [];
  poi.eventZones ??= [];
}

async function listBattleMaps() {
  await fs.mkdir(battleMapDir, { recursive: true });
  const entries = await fs.readdir(battleMapDir, { withFileTypes: true });
  const battleMaps = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const metadata = JSON.parse(await fs.readFile(path.join(battleMapDir, entry.name), "utf8"));
    battleMaps.push({
      id: metadata.id,
      baseMapId: metadata.baseMapId,
      displayName: metadata.displayName,
      type: metadata.type,
      variant: metadata.variant,
      background: metadata.background
    });
  }
  return battleMaps.sort((a, b) => a.displayName.localeCompare(b.displayName) || variantSort(a.variant) - variantSort(b.variant) || a.id.localeCompare(b.id));
}

async function readBattleMap(id) {
  const file = battleMapFileForId(id);
  const metadata = JSON.parse(await fs.readFile(file, "utf8"));
  normalizeBattleMap(metadata);
  return metadata;
}

async function saveBattleMap(req, res, id) {
  const body = await readRequestBody(req);
  const metadata = JSON.parse(body);
  normalizeBattleMap(metadata);
  validateBattleMap(id, metadata);
  const file = battleMapFileForId(id);
  const backup = `${file}.bak`;
  try {
    await fs.copyFile(file, backup);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await fs.writeFile(file, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return sendJson(res, { ok: true, backup: path.relative(repoRoot, backup).replaceAll("\\", "/") });
}

function normalizeBattleMap(metadata) {
  metadata.baseMapId ??= metadata.id?.replace(/_(normal|boss)$/, "");
  metadata.variant ??= metadata.id?.endsWith("_boss") ? "boss" : "normal";
  metadata.playerSlots ??= [];
  metadata.enemySlots ??= [];
  metadata.bossSlot ??= null;
}

function validateBattleMap(id, metadata) {
  if (!metadata || typeof metadata !== "object") throw new Error("Battle map metadata must be an object.");
  if (metadata.id !== id) throw new Error("Battle map id must match the URL id.");
  if (!metadata.displayName) throw new Error("Battle map metadata needs displayName.");
  if (!metadata.baseMapId) throw new Error("Battle map metadata needs baseMapId.");
  if (!["normal", "boss"].includes(metadata.variant)) throw new Error("Battle map metadata needs variant normal or boss.");
  if (!metadata.background?.path || !metadata.background?.key) throw new Error("Battle map metadata needs a background key/path.");
  if (!metadata.dimensions || !Number.isFinite(metadata.dimensions.width) || !Number.isFinite(metadata.dimensions.height)) {
    throw new Error("Battle map metadata needs finite dimensions.");
  }
  if (metadata.dimensions.width <= 0 || metadata.dimensions.height <= 0) throw new Error("Battle map dimensions must be positive.");
  if (!Array.isArray(metadata.playerSlots)) throw new Error("playerSlots must be an array.");
  if (!Array.isArray(metadata.enemySlots)) throw new Error("enemySlots must be an array.");
  if (metadata.variant === "normal" && metadata.bossSlot) throw new Error("Normal battle map variants cannot include bossSlot.");
  if (metadata.bossSlot !== null && typeof metadata.bossSlot !== "object") throw new Error("bossSlot must be null or an object.");
  const idSet = new Set();
  for (const slot of metadata.playerSlots) validateSpawnSlot(slot, idSet);
  for (const slot of metadata.enemySlots) validateSpawnSlot(slot, idSet);
  if (metadata.bossSlot) validateSpawnSlot(metadata.bossSlot, idSet);
}

function validateSpawnSlot(slot, idSet) {
  if (!slot?.id) throw new Error("Every spawn slot needs an id.");
  if (idSet.has(slot.id)) throw new Error(`Duplicate spawn id: ${slot.id}`);
  idSet.add(slot.id);
  for (const key of ["x", "y", "order"]) validateFinite(slot[key], `Slot ${slot.id}.${key}`);
  if (!["left", "right", "up", "down"].includes(slot.facing)) throw new Error(`Slot ${slot.id} needs a valid facing.`);
  if (slot.radius !== undefined) validateFinite(slot.radius, `Slot ${slot.id}.radius`);
  if (slot.role !== undefined && !["normal", "front", "back", "boss", "flying", "large"].includes(slot.role)) throw new Error(`Slot ${slot.id} has invalid role.`);
  if (slot.previewSpriteId !== undefined && typeof slot.previewSpriteId !== "string") throw new Error(`Slot ${slot.id}.previewSpriteId must be a string.`);
}

function validateZone(zone) {
  if (!zone?.id) throw new Error("Every zone needs an id.");
  validateShape(zone.shape, zone.id);
}

async function listBattleSprites() {
  const [assetPathsSource, textureKeysSource, enemiesSource] = await Promise.all([
    fs.readFile(assetPathsFile, "utf8"),
    fs.readFile(textureKeysFile, "utf8"),
    fs.readFile(enemiesFile, "utf8")
  ]);
  const assetPaths = parseAssetPaths(assetPathsSource);
  const classTextures = parseRecordObject(textureKeysSource, "CHARACTER_CLASS_TEXTURES");
  const partyClasses = parseRecordObject(textureKeysSource, "PARTY_CLASS");
  const enemyTextures = parseRecordObject(textureKeysSource, "ENEMY_TEXTURES");
  const enemies = parseEnemies(enemiesSource);
  const players = Object.entries(partyClasses).map(([id, classId]) => ({
    id,
    name: characterName(id),
    category: "player",
    classId,
    assetKey: classTextures[classId],
    assetPath: resolveAssetPath(assetPaths.get(classTextures[classId]) ?? ""),
    frame: { x: 2816, y: 0, width: 704, height: 512 },
    anchor: { bodyCenterX: 352, feetBaselineY: 464 }
  }));
  const enemyEntries = Object.entries(enemies)
    .filter(([id]) => enemyTextures[id])
    .map(([id, enemy]) => ({
      id,
      name: enemy.name,
      category: "enemy",
      boss: enemy.boss,
      role: enemy.boss ? "boss" : enemy.sprite === "wing" ? "flying" : enemy.sprite === "serpent" || enemy.sprite === "crown" ? "large" : "normal",
      assetKey: enemyTextures[id],
      assetPath: resolveAssetPath(assetPaths.get(enemyTextures[id]) ?? "")
    }));
  return { players, enemies: enemyEntries };
}

function parseAssetPaths(source) {
  const paths = new Map();
  for (const match of source.matchAll(/\["([^"]+)",\s*"([^"]+)"\]/g)) paths.set(match[1], match[2]);
  return paths;
}

function parseRecordObject(source, name) {
  const match = source.match(new RegExp(`export const ${name}[^=]*= \\{([\\s\\S]*?)\\};`));
  if (!match) return {};
  return Object.fromEntries([...match[1].matchAll(/([A-Za-z0-9_]+):\s*"([^"]+)"/g)].map((entry) => [entry[1], entry[2]]));
}

function parseEnemies(source) {
  const enemies = {};
  for (const line of source.split(/\r?\n/)) {
    const header = line.match(/^\s*([A-Za-z0-9_]+):\s*(enemy|boss)\("([^"]+)",\s*"([^"]+)"/);
    if (!header) continue;
    const sprite = line.match(/\],\s*"([^"]+)"(?:,\s*\[|\))/)?.[1] ?? "normal";
    enemies[header[1]] = { id: header[3], name: header[4], boss: header[2] === "boss", sprite };
  }
  return enemies;
}

function resolveAssetPath(assetPath) {
  if (!assetPath) return "";
  const candidates = [
    path.join("assets_v2", assetPath),
    path.join("src", "assets", assetPath),
    path.join("assets", assetPath)
  ];
  for (const candidate of candidates) {
    if (pathIsFile(path.join(repoRoot, candidate))) return candidate.replaceAll("\\", "/");
  }
  return assetPath;
}

function pathIsFile(file) {
  return existsSync(file);
}

function characterName(id) {
  return { fighter: "Arlen", priest: "Mira", mage: "Kael" }[id] ?? id;
}

function variantSort(variant) {
  return variant === "normal" ? 0 : variant === "boss" ? 1 : 2;
}

function validateShape(shape, id) {
  if (!shape?.type) throw new Error(`Zone ${id} needs a shape type.`);
  if (shape.type === "polygon") {
    if (!Array.isArray(shape.points) || shape.points.length < 3) throw new Error(`Polygon ${id} needs at least 3 points.`);
    for (const point of shape.points) validateNumberPair(point, `Polygon ${id}`);
    return;
  }
  if (shape.type === "rect") {
    for (const key of ["x", "y", "width", "height"]) validateFinite(shape[key], `Rect ${id}.${key}`);
    if (shape.width <= 0 || shape.height <= 0) throw new Error(`Rect ${id} must have positive width/height.`);
    return;
  }
  if (shape.type === "circle") {
    for (const key of ["x", "y", "radius"]) validateFinite(shape[key], `Circle ${id}.${key}`);
    if (shape.radius <= 0) throw new Error(`Circle ${id} must have positive radius.`);
    return;
  }
  throw new Error(`Unsupported shape type for ${id}: ${shape.type}`);
}

function validateNumberPair(point, label) {
  validateFinite(point?.x, `${label}.x`);
  validateFinite(point?.y, `${label}.y`);
}

function validateFinite(value, label) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
}

async function serveStatic(res, rawPathname) {
  const pathname = decodeURIComponent(rawPathname);
  const file = safeResolve(editorRoot, pathname.replace(/^\/+/, ""));
  const stat = await fs.stat(file).catch(() => undefined);
  if (!stat?.isFile()) return sendText(res, 404, "Not found");
  return streamFile(res, file);
}

async function serveAsset(res, assetPath) {
  if (!assetPath || path.isAbsolute(assetPath) || assetPath.includes("..")) return sendText(res, 400, "Invalid asset path");
  const file = safeResolve(repoRoot, assetPath);
  const stat = await fs.stat(file).catch(() => undefined);
  if (!stat?.isFile()) return sendText(res, 404, "Asset not found");
  return streamFile(res, file);
}

function streamFile(res, file) {
  res.writeHead(200, {
    "Content-Type": mimeTypes.get(path.extname(file).toLowerCase()) ?? "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(file).pipe(res);
}

function safeResolve(root, subpath) {
  const file = path.resolve(root, subpath);
  const relative = path.relative(root, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Path escapes editor root.");
  return file;
}

function poiFileForId(id) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid POI id.");
  return path.join(poiDir, `${id}.json`);
}

function battleMapFileForId(id) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error("Invalid battle map id.");
  return path.join(battleMapDir, `${id}.json`);
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, payload, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
  res.end(text);
}

function openBrowser(url) {
  if (process.env.POI_EDITOR_NO_OPEN === "1" || process.env.BATTLE_MAP_EDITOR_NO_OPEN === "1" || process.env.EDITOR_NO_OPEN === "1") return;
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}
