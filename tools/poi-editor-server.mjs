import { createServer } from "node:http";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const editorRoot = path.join(__dirname, "poi-editor");
const poiDir = path.join(repoRoot, "src", "data", "pois");
const host = "127.0.0.1";
const startPort = Number(process.env.POI_EDITOR_PORT ?? 5188);

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
    if (url.pathname === "/api/asset" && req.method === "GET") return serveAsset(res, url.searchParams.get("path") ?? "");
    if (req.method !== "GET") return sendText(res, 405, "Method not allowed");
    return serveStatic(res, url.pathname === "/" ? "/index.html" : url.pathname);
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
    console.log(`POI editor running at ${url}`);
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

function validateZone(zone) {
  if (!zone?.id) throw new Error("Every zone needs an id.");
  validateShape(zone.shape, zone.id);
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
  if (process.env.POI_EDITOR_NO_OPEN === "1") return;
  const command = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.unref();
}
