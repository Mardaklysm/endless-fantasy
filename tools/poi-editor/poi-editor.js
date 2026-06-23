const canvas = document.querySelector("#editorCanvas");
const ctx = canvas.getContext("2d");
const poiSelect = document.querySelector("#poiSelect");
const saveBtn = document.querySelector("#saveBtn");
const reloadBtn = document.querySelector("#reloadBtn");
const resetViewBtn = document.querySelector("#resetViewBtn");
const dirtyState = document.querySelector("#dirtyState");
const coords = document.querySelector("#coords");
const statusEl = document.querySelector("#status");
const poiTitle = document.querySelector("#poiTitle");
const drawLayer = document.querySelector("#drawLayer");
const toggles = {
  walkable: document.querySelector("#walkableToggle"),
  blocked: document.querySelector("#blockedToggle"),
  events: document.querySelector("#eventsToggle")
};
const eventDialog = document.querySelector("#eventDialog");
const eventForm = document.querySelector("#eventForm");

const presets = {
  church: { id: "church", label: "Church", prompt: "Visit Church?", activation: "interact", actionKind: "openChurch", actionId: "", townId: "dawnford" },
  weapons: { id: "weapons", label: "Weapons", prompt: "Enter Weapons?", activation: "interact", actionKind: "openShop", actionId: "weapons", townId: "dawnford" },
  armor: { id: "armor", label: "Armor", prompt: "Enter Armor?", activation: "interact", actionKind: "openShop", actionId: "armor", townId: "dawnford" },
  items: { id: "items", label: "Items", prompt: "Browse Items?", activation: "interact", actionKind: "openShop", actionId: "items", townId: "dawnford" },
  inn: { id: "inn", label: "Inn", prompt: "Enter Inn?", activation: "interact", actionKind: "openInn", actionId: "", townId: "dawnford" },
  exit: { id: "exit_path", label: "Exit", prompt: "Leave this area?", activation: "confirm", actionKind: "exitPoi", actionId: "", townId: "" }
};

let pois = [];
let poi = undefined;
let image = undefined;
let scale = 1;
let pan = { x: 0, y: 0 };
let pointer = { x: 0, y: 0 };
let drawing = [];
let isDirty = false;
let drag = undefined;
let pendingEvent = undefined;
let editingEventIndex = -1;
let spaceHeld = false;
let canvasCssSize = { width: 0, height: 0 };

init();

async function init() {
  bindEvents();
  await loadPoiList();
  if (pois.length) await loadPoi(pois[0].id);
  requestAnimationFrame(draw);
}

function bindEvents() {
  window.addEventListener("resize", resizeCanvas);
  saveBtn.addEventListener("click", savePoi);
  reloadBtn.addEventListener("click", () => loadPoi(poi?.id));
  resetViewBtn.addEventListener("click", resetView);
  poiSelect.addEventListener("change", () => loadPoi(poiSelect.value));
  for (const toggle of Object.values(toggles)) toggle.addEventListener("change", markCleanDrawOnly);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") spaceHeld = false;
  });
  window.addEventListener("beforeunload", (event) => {
    if (!isDirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
  eventForm.addEventListener("submit", onEventFormSubmit);
  document.querySelector("#eventCancelBtn").addEventListener("click", () => {
    pendingEvent = undefined;
    editingEventIndex = -1;
    eventDialog.close();
  });
  document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset)));
}

async function loadPoiList() {
  pois = await fetchJson("/api/pois");
  poiSelect.innerHTML = pois.map((entry) => `<option value="${entry.id}">${entry.displayName} (${entry.type})</option>`).join("");
}

async function loadPoi(id) {
  if (!id) return;
  poi = await fetchJson(`/api/pois/${encodeURIComponent(id)}`);
  normalizePoi(poi);
  poiSelect.value = poi.id;
  poiTitle.textContent = `${poi.displayName} - ${poi.id}`;
  image = await loadImage(`/api/asset?path=${encodeURIComponent(poi.background.path)}`);
  drawing = [];
  setDirty(false);
  resetView();
  showStatus("Loaded.");
}

async function savePoi() {
  try {
    const response = await fetch(`/api/pois/${encodeURIComponent(poi.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(poi)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Save failed.");
    setDirty(false);
    showStatus(`Saved.\nBackup: ${payload.backup}`);
  } catch (error) {
    showStatus(saveErrorMessage(error), true);
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  if (canvasCssSize.width === width && canvasCssSize.height === height) return;
  canvasCssSize = { width, height };
  canvas.width = Math.max(1, Math.floor(width * window.devicePixelRatio));
  canvas.height = Math.max(1, Math.floor(height * window.devicePixelRatio));
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function resetView() {
  resizeCanvas();
  if (!image) return;
  const rect = canvas.getBoundingClientRect();
  scale = Math.min(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
  pan = {
    x: Math.floor((rect.width - image.naturalWidth * scale) / 2),
    y: Math.floor((rect.height - image.naturalHeight * scale) / 2)
  };
}

function onPointerDown(event) {
  if (!poi) return;
  canvas.setPointerCapture(event.pointerId);
  pointer = screenToImage(event);
  if (event.button === 1 || (event.button === 0 && spaceHeld)) {
    drag = { type: "pan", start: { x: event.clientX, y: event.clientY }, pan: { ...pan } };
    return;
  }
  if (event.button === 2) {
    if (event.shiftKey) {
      deleteEventAt(pointer);
      return;
    }
    const eventIndex = findEventIndex(pointer);
    if (eventIndex >= 0) {
      openEventForm(poi.eventZones[eventIndex], eventIndex);
      return;
    }
    drag = { type: "eventRect", start: pointer, current: pointer };
    return;
  }
  if (event.button !== 0) return;
  if (event.shiftKey) {
    deleteZoneAt(pointer);
    return;
  }
  addPolygonPoint(pointer);
}

function onPointerMove(event) {
  pointer = screenToImage(event);
  coords.textContent = `x ${Math.round(pointer.x)}, y ${Math.round(pointer.y)}`;
  if (!drag) return;
  if (drag.type === "pan") {
    pan = { x: drag.pan.x + event.clientX - drag.start.x, y: drag.pan.y + event.clientY - drag.start.y };
  } else if (drag.type === "eventRect") {
    drag.current = pointer;
  }
}

function onPointerUp(event) {
  if (drag?.type === "eventRect") {
    const rect = normalizeRect(drag.start, drag.current);
    if (rect.width > 4 && rect.height > 4) {
      pendingEvent = {
        id: uniqueId("event", poi.eventZones),
        type: "event",
        label: "Event",
        prompt: "Activate event?",
        shape: { type: "rect", ...roundRect(rect) },
        activation: "interact",
        action: { kind: "openDialog", lines: ["TODO: Configure this event."] }
      };
      openEventForm(pendingEvent, -1);
    }
  }
  drag = undefined;
}

function onWheel(event) {
  event.preventDefault();
  if (!image) return;
  const before = screenToImage(event);
  const zoom = event.deltaY < 0 ? 1.12 : 0.89;
  scale = clamp(scale * zoom, 0.08, 8);
  pan.x = event.offsetX - before.x * scale;
  pan.y = event.offsetY - before.y * scale;
}

function onKeyDown(event) {
  if (event.code === "Space") {
    spaceHeld = true;
    event.preventDefault();
  }
  if (event.key === "Escape" && drawing.length) {
    drawing = [];
    event.preventDefault();
  }
  if (event.key === "Enter" && drawing.length >= 3) {
    closePolygon();
    event.preventDefault();
  }
}

function addPolygonPoint(point) {
  const rounded = roundPoint(point);
  if (drawing.length >= 3 && distance(rounded, drawing[0]) <= 12) {
    closePolygon();
    return;
  }
  drawing.push(rounded);
}

function closePolygon() {
  if (drawing.length < 3) return;
  const collection = drawLayer.value === "blocked" ? poi.blockedZones : poi.walkableZones;
  collection.push({
    id: uniqueId(drawLayer.value === "blocked" ? "blocked" : "walkable", collection),
    shape: { type: "polygon", points: drawing.map((point) => ({ ...point })) }
  });
  drawing = [];
  setDirty(true);
}

function deleteZoneAt(point) {
  const collections = drawLayer.value === "blocked" ? [poi.blockedZones, poi.walkableZones] : [poi.walkableZones, poi.blockedZones];
  for (const collection of collections) {
    const index = findZoneIndex(collection, point);
    if (index >= 0) {
      collection.splice(index, 1);
      setDirty(true);
      showStatus("Zone deleted.");
      return;
    }
  }
}

function deleteEventAt(point) {
  const index = findEventIndex(point);
  if (index >= 0) {
    poi.eventZones.splice(index, 1);
    setDirty(true);
    showStatus("Event deleted.");
  }
}

function openEventForm(eventZone, index) {
  editingEventIndex = index;
  pendingEvent = structuredClone(eventZone);
  document.querySelector("#eventId").value = pendingEvent.id;
  document.querySelector("#eventLabel").value = pendingEvent.label;
  document.querySelector("#eventPrompt").value = pendingEvent.prompt;
  document.querySelector("#eventActivation").value = pendingEvent.activation;
  document.querySelector("#eventActionKind").value = pendingEvent.action.kind;
  document.querySelector("#eventActionId").value = actionIdFor(pendingEvent.action);
  document.querySelector("#eventTownId").value = pendingEvent.action.townId ?? "";
  eventDialog.showModal();
}

function onEventFormSubmit(event) {
  event.preventDefault();
  if (!pendingEvent) return;
  const action = actionFromForm();
  pendingEvent = {
    ...pendingEvent,
    id: document.querySelector("#eventId").value.trim(),
    label: document.querySelector("#eventLabel").value.trim(),
    prompt: document.querySelector("#eventPrompt").value.trim(),
    activation: document.querySelector("#eventActivation").value,
    type: document.querySelector("#eventActivation").value === "confirm" ? "exit" : pendingEvent.type,
    action
  };
  if (!pendingEvent.id || !pendingEvent.action.kind) return showStatus("Event id and action kind are required.", true);
  if (editingEventIndex >= 0) poi.eventZones.splice(editingEventIndex, 1, pendingEvent);
  else poi.eventZones.push(pendingEvent);
  pendingEvent = undefined;
  editingEventIndex = -1;
  setDirty(true);
  eventDialog.close();
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  document.querySelector("#eventId").value = preset.id;
  document.querySelector("#eventLabel").value = preset.label;
  document.querySelector("#eventPrompt").value = preset.prompt;
  document.querySelector("#eventActivation").value = preset.activation;
  document.querySelector("#eventActionKind").value = preset.actionKind;
  document.querySelector("#eventActionId").value = preset.actionId;
  document.querySelector("#eventTownId").value = preset.townId;
}

function actionFromForm() {
  const kind = document.querySelector("#eventActionKind").value;
  const actionId = document.querySelector("#eventActionId").value.trim();
  const townId = document.querySelector("#eventTownId").value.trim();
  if (kind === "openShop") return withoutEmpty({ kind, shopId: actionId || "items", townId });
  if (kind === "openInn" || kind === "openChurch") return withoutEmpty({ kind, townId });
  if (kind === "exitPoi") return { kind, destination: { kind: "returnToOverworld" } };
  if (kind === "triggerEvent") return { kind, eventId: actionId || "todo_event" };
  if (kind === "inspect") return { kind, lines: [actionId || "TODO: Configure inspection text."] };
  return { kind: "openDialog", lines: [actionId || "TODO: Configure dialog text."] };
}

function actionIdFor(action) {
  if (action.kind === "openShop") return action.shopId ?? "";
  if (action.kind === "triggerEvent") return action.eventId ?? "";
  if (action.kind === "openDialog" || action.kind === "inspect") return action.lines?.[0] ?? "";
  return "";
}

function draw() {
  resizeCanvas();
  ctx.clearRect(0, 0, canvasCssSize.width, canvasCssSize.height);
  if (image) {
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, 0, 0);
    if (poi) {
      if (toggles.walkable.checked) poi.walkableZones.forEach((zone) => drawShape(zone.shape, "rgba(73, 220, 108, 0.28)", "#49dc6c"));
      if (toggles.blocked.checked) poi.blockedZones.forEach((zone) => drawShape(zone.shape, "rgba(255, 64, 92, 0.32)", "#ff405c"));
      if (toggles.events.checked) {
        poi.eventZones.forEach((event) => {
          drawShape(event.shape, event.activation === "confirm" ? "rgba(255, 209, 102, 0.34)" : "rgba(74, 183, 255, 0.32)", event.activation === "confirm" ? "#ffd166" : "#4ab7ff");
          const point = shapeCenter(event.shape);
          drawLabel(event.id, point.x, point.y);
        });
      }
      if (drawing.length) drawDraftPolygon();
      if (drag?.type === "eventRect") drawShape({ type: "rect", ...normalizeRect(drag.start, drag.current) }, "rgba(255, 255, 255, 0.18)", "#ffffff");
    }
    ctx.restore();
  }
  requestAnimationFrame(draw);
}

function drawShape(shape, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2 / scale;
  ctx.beginPath();
  if (shape.type === "rect") {
    ctx.rect(shape.x, shape.y, shape.width, shape.height);
  } else if (shape.type === "circle") {
    ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
  } else {
    if (!shape.points.length) return;
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    for (const point of shape.points.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
}

function drawDraftPolygon() {
  ctx.strokeStyle = drawLayer.value === "blocked" ? "#ff8b9a" : "#b9ffc7";
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2 / scale;
  ctx.beginPath();
  ctx.moveTo(drawing[0].x, drawing[0].y);
  for (const point of drawing.slice(1)) ctx.lineTo(point.x, point.y);
  ctx.lineTo(pointer.x, pointer.y);
  ctx.stroke();
  for (const point of drawing) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5 / scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawLabel(text, x, y) {
  ctx.save();
  ctx.font = `${12 / scale}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.lineWidth = 4 / scale;
  ctx.strokeStyle = "#07101d";
  ctx.fillStyle = "#ffffff";
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

function findEventIndex(point) {
  for (let i = poi.eventZones.length - 1; i >= 0; i--) {
    if (pointInShape(point, poi.eventZones[i].shape)) return i;
  }
  return -1;
}

function findZoneIndex(collection, point) {
  for (let i = collection.length - 1; i >= 0; i--) {
    if (pointInShape(point, collection[i].shape)) return i;
  }
  return -1;
}

function pointInShape(point, shape) {
  if (shape.type === "rect") return point.x >= shape.x && point.x <= shape.x + shape.width && point.y >= shape.y && point.y <= shape.y + shape.height;
  if (shape.type === "circle") return distance(point, shape) <= shape.radius;
  let inside = false;
  for (let i = 0, j = shape.points.length - 1; i < shape.points.length; j = i++) {
    const a = shape.points[i];
    const b = shape.points[j];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function shapeCenter(shape) {
  if (shape.type === "rect") return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
  if (shape.type === "circle") return { x: shape.x, y: shape.y };
  const sum = shape.points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / shape.points.length, y: sum.y / shape.points.length };
}

function screenToImage(event) {
  return {
    x: (event.offsetX - pan.x) / scale,
    y: (event.offsetY - pan.y) / scale
  };
}

function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function roundRect(rect) {
  return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
}

function roundPoint(point) {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function uniqueId(prefix, collection) {
  const used = new Set(collection.map((item) => item.id));
  let index = collection.length + 1;
  let id = `${prefix}_${index}`;
  while (used.has(id)) id = `${prefix}_${++index}`;
  return id;
}

function setDirty(value) {
  isDirty = value;
  dirtyState.textContent = value ? "unsaved" : "clean";
  dirtyState.classList.toggle("dirty", value);
}

function markCleanDrawOnly() {}

function normalizePoi(poi) {
  poi.walkableZones ??= [];
  poi.blockedZones ??= [];
  poi.eventZones ??= [];
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function withoutEmpty(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== ""));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

async function fetchJson(url) {
  try {
    const response = await fetch(url);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? `Request failed: ${url}`);
    return payload;
  } catch (error) {
    throw new Error(serverConnectionMessage(error));
  }
}

function saveErrorMessage(error) {
  return serverConnectionMessage(error);
}

function serverConnectionMessage(error) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Could not reach the POI editor server. Keep this tab open, run POI_EDITOR.bat again, then press Save.";
  }
  return error instanceof Error ? error.message : String(error);
}
