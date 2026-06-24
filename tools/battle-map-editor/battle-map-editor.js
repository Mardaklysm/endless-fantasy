const canvas = document.querySelector("#editorCanvas");
const ctx = canvas.getContext("2d");
const battleMapSelect = document.querySelector("#battleMapSelect");
const saveBtn = document.querySelector("#saveBtn");
const reloadBtn = document.querySelector("#reloadBtn");
const resetViewBtn = document.querySelector("#resetViewBtn");
const dirtyState = document.querySelector("#dirtyState");
const coords = document.querySelector("#coords");
const statusEl = document.querySelector("#status");
const validationEl = document.querySelector("#validation");
const mapTitle = document.querySelector("#mapTitle");
const modeSelect = document.querySelector("#modeSelect");
const playerPreviewCount = document.querySelector("#playerPreviewCount");
const enemyPreviewCount = document.querySelector("#enemyPreviewCount");
const toggles = {
  player: document.querySelector("#playerToggle"),
  enemy: document.querySelector("#enemyToggle"),
  zones: document.querySelector("#zonesToggle"),
  preview: document.querySelector("#previewToggle")
};

const slotDialog = document.querySelector("#slotDialog");
const slotForm = document.querySelector("#slotForm");
const zoneDialog = document.querySelector("#zoneDialog");
const zoneForm = document.querySelector("#zoneForm");

let battleMaps = [];
let battleMap = undefined;
let image = undefined;
let scale = 1;
let pan = { x: 0, y: 0 };
let pointer = { x: 0, y: 0 };
let isDirty = false;
let drag = undefined;
let spaceHeld = false;
let canvasCssSize = { width: 0, height: 0 };
let selected = undefined;
let editingSlot = undefined;
let editingZone = undefined;

init();

async function init() {
  bindEvents();
  await loadBattleMapList();
  if (battleMaps.length) await loadBattleMap(battleMaps[0].id);
  requestAnimationFrame(draw);
}

function bindEvents() {
  window.addEventListener("resize", resizeCanvas);
  saveBtn.addEventListener("click", saveBattleMap);
  reloadBtn.addEventListener("click", () => loadBattleMap(battleMap?.id));
  resetViewBtn.addEventListener("click", resetView);
  battleMapSelect.addEventListener("change", () => loadBattleMap(battleMapSelect.value));
  Object.values(toggles).forEach((toggle) => toggle.addEventListener("change", refreshValidation));
  playerPreviewCount.addEventListener("change", refreshValidation);
  enemyPreviewCount.addEventListener("change", refreshValidation);
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
  slotForm.addEventListener("submit", onSlotFormSubmit);
  zoneForm.addEventListener("submit", onZoneFormSubmit);
  document.querySelector("#slotCancelBtn").addEventListener("click", cancelSlotDialog);
  document.querySelector("#zoneCancelBtn").addEventListener("click", cancelZoneDialog);
  document.querySelector("#slotDeleteBtn").addEventListener("click", deleteEditingSlot);
  document.querySelector("#zoneDeleteBtn").addEventListener("click", deleteEditingZone);
  document.querySelector("#slotSide").addEventListener("change", updateDialogEnemyFields);
  document.querySelector("#zoneSide").addEventListener("change", updateDialogEnemyFields);
}

async function loadBattleMapList() {
  battleMaps = await fetchJson("/api/battle-maps");
  battleMapSelect.innerHTML = battleMaps.map((entry) => `<option value="${entry.id}">${entry.displayName}${entry.type ? ` (${entry.type})` : ""}</option>`).join("");
}

async function loadBattleMap(id) {
  if (!id) return;
  battleMap = await fetchJson(`/api/battle-maps/${encodeURIComponent(id)}`);
  normalizeBattleMap(battleMap);
  battleMapSelect.value = battleMap.id;
  mapTitle.textContent = `${battleMap.displayName} - ${battleMap.id}`;
  image = await loadImage(`/api/asset?path=${encodeURIComponent(battleMap.background.path)}`);
  if (!battleMap.dimensions?.width || !battleMap.dimensions?.height) {
    battleMap.dimensions = { width: image.naturalWidth, height: image.naturalHeight };
  }
  selected = undefined;
  setDirty(false);
  resetView();
  refreshValidation();
  showStatus("Loaded.");
}

async function saveBattleMap() {
  try {
    const response = await fetch(`/api/battle-maps/${encodeURIComponent(battleMap.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(battleMap)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? "Save failed.");
    setDirty(false);
    showStatus(`Saved.\nBackup: ${payload.backup}`);
  } catch (error) {
    showStatus(serverConnectionMessage(error), true);
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
  if (!battleMap) return;
  canvas.setPointerCapture(event.pointerId);
  pointer = screenToImage(event);
  if (event.button === 1 || (event.button === 0 && spaceHeld)) {
    drag = { type: "pan", start: { x: event.clientX, y: event.clientY }, pan: { ...pan } };
    return;
  }
  if (event.button === 2) {
    if (event.shiftKey) return deleteZoneAt(pointer);
    if (modeSelect.value === "drawPlayerZone" || modeSelect.value === "drawEnemyZone") {
      drag = { type: "zoneRect", side: modeSelect.value === "drawPlayerZone" ? "player" : "enemy", start: pointer, current: pointer };
      return;
    }
    const zoneHit = findZoneAt(pointer);
    if (zoneHit) openZoneForm(zoneHit.side, zoneHit.index);
    return;
  }
  if (event.button !== 0) return;
  if (event.shiftKey) {
    if (!deleteSlotAt(pointer)) deleteZoneAt(pointer);
    return;
  }
  if (modeSelect.value === "addPlayer") {
    createSlot("player", pointer);
    return;
  }
  if (modeSelect.value === "addEnemy") {
    createSlot("enemy", pointer);
    return;
  }
  const slotHit = findSlotAt(pointer);
  if (slotHit) {
    selected = { type: "slot", ...slotHit };
    const slot = slotCollection(slotHit.side)[slotHit.index];
    drag = { type: "slot", side: slotHit.side, index: slotHit.index, start: pointer, origin: { x: slot.x, y: slot.y }, moved: false };
    return;
  }
  const zoneHit = findZoneAt(pointer);
  selected = zoneHit ? { type: "zone", ...zoneHit } : undefined;
  if (zoneHit) openZoneForm(zoneHit.side, zoneHit.index);
}

function onPointerMove(event) {
  pointer = screenToImage(event);
  coords.textContent = `x ${Math.round(pointer.x)}, y ${Math.round(pointer.y)}`;
  if (!drag) return;
  if (drag.type === "pan") {
    pan = { x: drag.pan.x + event.clientX - drag.start.x, y: drag.pan.y + event.clientY - drag.start.y };
  } else if (drag.type === "zoneRect") {
    drag.current = pointer;
  } else if (drag.type === "slot") {
    const slot = slotCollection(drag.side)[drag.index];
    slot.x = Math.round(drag.origin.x + pointer.x - drag.start.x);
    slot.y = Math.round(drag.origin.y + pointer.y - drag.start.y);
    drag.moved ||= distance(pointer, drag.start) > 2;
    setDirty(true);
    refreshValidation();
  }
}

function onPointerUp() {
  if (drag?.type === "zoneRect") {
    const rect = normalizeRect(drag.start, drag.current);
    if (rect.width > 4 && rect.height > 4) createZone(drag.side, rect);
  } else if (drag?.type === "slot" && !drag.moved) {
    openSlotForm(drag.side, drag.index);
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
  if (event.key === "Escape") {
    drag = undefined;
    selected = undefined;
    event.preventDefault();
  }
}

function createSlot(side, point) {
  const collection = slotCollection(side);
  const wasDirty = isDirty;
  const order = collection.reduce((max, slot) => Math.max(max, Number(slot.order) || 0), 0) + 1;
  const slot = {
    id: uniqueId(side === "player" ? "player" : "enemy", collection),
    x: Math.round(point.x),
    y: Math.round(point.y),
    order,
    facing: side === "player" ? "left" : "right",
    radius: side === "player" ? 138 : 152
  };
  if (side === "enemy") {
    slot.role = "default";
    slot.weight = 1;
  }
  collection.push(slot);
  selected = { type: "slot", side, index: collection.length - 1 };
  setDirty(true);
  refreshValidation();
  showStatus(`${side} slot added.`);
  openSlotForm(side, collection.length - 1, true, wasDirty);
}

function createZone(side, rect) {
  const collection = zoneCollection(side);
  const wasDirty = isDirty;
  const zone = {
    id: uniqueId(`${side}_zone`, collection),
    shape: { type: "rect", ...roundRect(rect) },
    capacity: side === "player" ? 4 : 3,
    facing: side === "player" ? "left" : "right",
    notes: ""
  };
  if (side === "enemy") {
    zone.role = "default";
    zone.weight = 1;
  }
  collection.push(zone);
  selected = { type: "zone", side, index: collection.length - 1 };
  setDirty(true);
  refreshValidation();
  showStatus(`${side} zone added.`);
  openZoneForm(side, collection.length - 1, true, wasDirty);
}

function openSlotForm(side, index, isNew = false, wasDirty = isDirty) {
  editingSlot = { side, index, isNew, wasDirty };
  const slot = slotCollection(side)[index];
  document.querySelector("#slotId").value = slot.id;
  document.querySelector("#slotSide").value = side;
  document.querySelector("#slotOrder").value = slot.order ?? index + 1;
  document.querySelector("#slotX").value = Math.round(slot.x);
  document.querySelector("#slotY").value = Math.round(slot.y);
  document.querySelector("#slotFacing").value = slot.facing ?? (side === "player" ? "left" : "right");
  document.querySelector("#slotRadius").value = slot.radius ?? "";
  document.querySelector("#slotRole").value = side === "enemy" ? slot.role ?? "default" : "";
  document.querySelector("#slotWeight").value = side === "enemy" ? slot.weight ?? "" : "";
  document.querySelector("#slotNotes").value = slot.notes ?? "";
  updateDialogEnemyFields();
  slotDialog.showModal();
}

function onSlotFormSubmit(event) {
  event.preventDefault();
  if (!editingSlot) return;
  const oldCollection = slotCollection(editingSlot.side);
  const oldSlot = oldCollection[editingSlot.index];
  const side = document.querySelector("#slotSide").value;
  const next = {
    id: document.querySelector("#slotId").value.trim(),
    x: numberFrom("#slotX"),
    y: numberFrom("#slotY"),
    order: numberFrom("#slotOrder"),
    facing: document.querySelector("#slotFacing").value,
    radius: optionalNumberFrom("#slotRadius"),
    notes: document.querySelector("#slotNotes").value.trim()
  };
  if (side === "enemy") {
    next.role = document.querySelector("#slotRole").value || "default";
    next.weight = optionalNumberFrom("#slotWeight");
  }
  stripEmpty(next);
  if (!next.id) return showStatus("Slot id is required.", true);
  oldCollection.splice(editingSlot.index, 1);
  const newCollection = slotCollection(side);
  newCollection.push(next);
  selected = { type: "slot", side, index: newCollection.length - 1 };
  editingSlot = undefined;
  setDirty(true);
  refreshValidation();
  slotDialog.close();
  showStatus(`${oldSlot.id} updated.`);
}

function cancelSlotDialog() {
  if (editingSlot?.isNew) {
    slotCollection(editingSlot.side).splice(editingSlot.index, 1);
    setDirty(editingSlot.wasDirty);
  }
  editingSlot = undefined;
  refreshValidation();
  slotDialog.close();
}

function deleteEditingSlot() {
  if (!editingSlot) return;
  slotCollection(editingSlot.side).splice(editingSlot.index, 1);
  editingSlot = undefined;
  selected = undefined;
  setDirty(true);
  refreshValidation();
  slotDialog.close();
  showStatus("Slot deleted.");
}

function openZoneForm(side, index, isNew = false, wasDirty = isDirty) {
  editingZone = { side, index, isNew, wasDirty };
  const zone = zoneCollection(side)[index];
  document.querySelector("#zoneId").value = zone.id;
  document.querySelector("#zoneSide").value = side;
  document.querySelector("#zoneShape").value = shapeSummary(zone.shape);
  document.querySelector("#zoneCapacity").value = zone.capacity ?? "";
  document.querySelector("#zoneFacing").value = zone.facing ?? "";
  document.querySelector("#zoneRole").value = side === "enemy" ? zone.role ?? "default" : "";
  document.querySelector("#zoneWeight").value = side === "enemy" ? zone.weight ?? "" : "";
  document.querySelector("#zoneNotes").value = zone.notes ?? "";
  updateDialogEnemyFields();
  zoneDialog.showModal();
}

function onZoneFormSubmit(event) {
  event.preventDefault();
  if (!editingZone) return;
  const oldCollection = zoneCollection(editingZone.side);
  const oldZone = oldCollection[editingZone.index];
  const side = document.querySelector("#zoneSide").value;
  const next = {
    ...structuredClone(oldZone),
    id: document.querySelector("#zoneId").value.trim(),
    capacity: optionalNumberFrom("#zoneCapacity"),
    facing: document.querySelector("#zoneFacing").value,
    notes: document.querySelector("#zoneNotes").value.trim()
  };
  if (side === "enemy") {
    next.role = document.querySelector("#zoneRole").value || "default";
    next.weight = optionalNumberFrom("#zoneWeight");
  } else {
    delete next.role;
    delete next.weight;
  }
  stripEmpty(next);
  if (!next.id) return showStatus("Zone id is required.", true);
  oldCollection.splice(editingZone.index, 1);
  const newCollection = zoneCollection(side);
  newCollection.push(next);
  selected = { type: "zone", side, index: newCollection.length - 1 };
  editingZone = undefined;
  setDirty(true);
  refreshValidation();
  zoneDialog.close();
  showStatus(`${oldZone.id} updated.`);
}

function cancelZoneDialog() {
  if (editingZone?.isNew) {
    zoneCollection(editingZone.side).splice(editingZone.index, 1);
    setDirty(editingZone.wasDirty);
  }
  editingZone = undefined;
  refreshValidation();
  zoneDialog.close();
}

function deleteEditingZone() {
  if (!editingZone) return;
  zoneCollection(editingZone.side).splice(editingZone.index, 1);
  editingZone = undefined;
  selected = undefined;
  setDirty(true);
  refreshValidation();
  zoneDialog.close();
  showStatus("Zone deleted.");
}

function updateDialogEnemyFields() {
  const slotSide = document.querySelector("#slotSide").value;
  const zoneSide = document.querySelector("#zoneSide").value;
  slotDialog.querySelectorAll(".enemyOnly").forEach((el) => (el.style.display = slotSide === "enemy" ? "grid" : "none"));
  zoneDialog.querySelectorAll(".enemyOnly").forEach((el) => (el.style.display = zoneSide === "enemy" ? "grid" : "none"));
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
    if (battleMap) {
      if (toggles.zones.checked) drawZones();
      if (toggles.preview.checked) drawPreview();
      if (toggles.player.checked) battleMap.spawns.playerSlots.forEach((slot, index) => drawSlot(slot, "player", index));
      if (toggles.enemy.checked) battleMap.spawns.enemySlots.forEach((slot, index) => drawSlot(slot, "enemy", index));
      if (drag?.type === "zoneRect") drawShape({ type: "rect", ...normalizeRect(drag.start, drag.current) }, "rgba(255, 255, 255, 0.18)", "#ffffff");
    }
    ctx.restore();
  }
  requestAnimationFrame(draw);
}

function drawZones() {
  battleMap.spawns.playerZones.forEach((zone, index) => drawZone(zone, "player", index));
  battleMap.spawns.enemyZones.forEach((zone, index) => drawZone(zone, "enemy", index));
}

function drawZone(zone, side, index) {
  const isSelected = selected?.type === "zone" && selected.side === side && selected.index === index;
  const fill = side === "player" ? "rgba(77, 213, 255, 0.18)" : "rgba(255, 121, 66, 0.18)";
  const stroke = isSelected ? "#fff0a6" : side === "player" ? "#4dd5ff" : "#ff7942";
  drawShape(zone.shape, fill, stroke);
  const center = shapeCenter(zone.shape);
  drawLabel(`${zone.id}${zone.capacity ? ` x${zone.capacity}` : ""}`, center.x, center.y);
}

function drawSlot(slot, side, index) {
  const isSelected = selected?.type === "slot" && selected.side === side && selected.index === index;
  const color = side === "player" ? "#4dd5ff" : "#ff7942";
  const fill = side === "player" ? "rgba(77, 213, 255, 0.28)" : "rgba(255, 121, 66, 0.3)";
  const radius = slot.radius ?? (side === "player" ? 138 : 152);
  ctx.save();
  ctx.lineWidth = (isSelected ? 5 : 2) / scale;
  ctx.strokeStyle = isSelected ? "#fff0a6" : color;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(slot.x, slot.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(slot.x, slot.y, 12 / scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#07101d";
  ctx.lineWidth = 3 / scale;
  ctx.stroke();
  drawFacingArrow(slot.x, slot.y, slot.facing ?? (side === "player" ? "left" : "right"), color);
  drawLabel(`${slot.id} #${slot.order ?? index + 1}`, slot.x, slot.y - radius - 10 / scale);
  ctx.restore();
}

function drawPreview() {
  previewSlots("player", Number(playerPreviewCount.value) || 4).forEach((point, index) => drawPreviewMarker(point, "player", index));
  previewSlots("enemy", Number(enemyPreviewCount.value) || 4).forEach((point, index) => drawPreviewMarker(point, "enemy", index));
}

function previewSlots(side, count) {
  const slots = [...slotCollection(side)].sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id));
  const points = slots.slice(0, count).map((slot) => ({ x: slot.x, y: slot.y, radius: slot.radius ?? (side === "player" ? 138 : 152) }));
  const zones = zoneCollection(side);
  for (const zone of zones) {
    const capacity = Math.max(1, zone.capacity ?? 1);
    for (let i = 0; i < capacity && points.length < count; i += 1) {
      const point = sampleZone(zone.shape, i, capacity);
      if (point) points.push({ ...point, radius: side === "player" ? 138 : 152 });
    }
  }
  return points;
}

function drawPreviewMarker(point, side, index) {
  ctx.save();
  ctx.fillStyle = side === "player" ? "rgba(129, 232, 255, 0.18)" : "rgba(255, 186, 99, 0.18)";
  ctx.strokeStyle = side === "player" ? "#81e8ff" : "#ffba63";
  ctx.setLineDash([10 / scale, 8 / scale]);
  ctx.lineWidth = 3 / scale;
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, point.radius, point.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawLabel(`${side[0].toUpperCase()}${index + 1}`, point.x, point.y + 5 / scale);
  ctx.restore();
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
    if (!shape.points?.length) return;
    ctx.moveTo(shape.points[0].x, shape.points[0].y);
    for (const point of shape.points.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
}

function drawFacingArrow(x, y, facing, color) {
  const length = 34 / scale;
  const head = 9 / scale;
  const dir = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[facing] ?? [0, 0];
  const end = { x: x + dir[0] * length, y: y + dir[1] * length };
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3 / scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(end.x, end.y, head, 0, Math.PI * 2);
  ctx.fill();
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

function findSlotAt(point) {
  const candidates = [
    ...battleMap.spawns.enemySlots.map((slot, index) => ({ side: "enemy", index, slot })),
    ...battleMap.spawns.playerSlots.map((slot, index) => ({ side: "player", index, slot }))
  ];
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i];
    if (distance(point, candidate.slot) <= Math.max(24 / scale, candidate.slot.radius ?? 120)) return { side: candidate.side, index: candidate.index };
  }
  return undefined;
}

function findZoneAt(point) {
  const candidates = [
    ...battleMap.spawns.enemyZones.map((zone, index) => ({ side: "enemy", index, zone })),
    ...battleMap.spawns.playerZones.map((zone, index) => ({ side: "player", index, zone }))
  ];
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i];
    if (pointInShape(point, candidate.zone.shape)) return { side: candidate.side, index: candidate.index };
  }
  return undefined;
}

function deleteSlotAt(point) {
  const hit = findSlotAt(point);
  if (!hit) return false;
  const [removed] = slotCollection(hit.side).splice(hit.index, 1);
  selected = undefined;
  setDirty(true);
  refreshValidation();
  showStatus(`${removed.id} deleted.`);
  return true;
}

function deleteZoneAt(point) {
  const hit = findZoneAt(point);
  if (!hit) return false;
  const [removed] = zoneCollection(hit.side).splice(hit.index, 1);
  selected = undefined;
  setDirty(true);
  refreshValidation();
  showStatus(`${removed.id} deleted.`);
  return true;
}

function refreshValidation() {
  if (!battleMap) return;
  const warnings = validateBattleMap();
  validationEl.textContent = warnings.length ? `Warnings:\n${warnings.map((warning) => `- ${warning}`).join("\n")}` : "No validation warnings.";
  validationEl.classList.toggle("error", warnings.some((warning) => warning.includes("Duplicate") || warning.includes("outside")));
}

function validateBattleMap() {
  const warnings = [];
  if (!battleMap.background?.path || !battleMap.background?.key) warnings.push("Missing background asset key/path.");
  if (!battleMap.spawns.playerSlots.length && !battleMap.spawns.playerZones.length) warnings.push("Battle map has no player spawn source.");
  if (!battleMap.spawns.enemySlots.length && !battleMap.spawns.enemyZones.length) warnings.push("Battle map has no enemy spawn source.");
  if (!battleMap.spawns.playerSlots.length) warnings.push("playerSlots is empty.");
  if (!battleMap.spawns.enemySlots.length) warnings.push("enemySlots is empty.");
  const ids = new Set();
  for (const item of allSpawnItems()) {
    if (!item.value.id) warnings.push("Spawn item with missing id.");
    else if (ids.has(item.value.id)) warnings.push(`Duplicate ID: ${item.value.id}`);
    ids.add(item.value.id);
  }
  for (const slot of [...battleMap.spawns.playerSlots, ...battleMap.spawns.enemySlots]) {
    if (!pointInsideImage(slot)) warnings.push(`${slot.id} is outside image bounds.`);
  }
  for (const zone of [...battleMap.spawns.playerZones, ...battleMap.spawns.enemyZones]) {
    if (!shapeInsideImage(zone.shape)) warnings.push(`${zone.id} extends outside image bounds.`);
  }
  const slots = [...battleMap.spawns.playerSlots, ...battleMap.spawns.enemySlots];
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const minSpacing = ((slots[i].radius ?? 120) + (slots[j].radius ?? 120)) * 0.72;
      if (distance(slots[i], slots[j]) < minSpacing) warnings.push(`${slots[i].id} is close to ${slots[j].id}.`);
    }
  }
  return warnings;
}

function allSpawnItems() {
  return [
    ...battleMap.spawns.playerSlots.map((value) => ({ value })),
    ...battleMap.spawns.enemySlots.map((value) => ({ value })),
    ...battleMap.spawns.playerZones.map((value) => ({ value })),
    ...battleMap.spawns.enemyZones.map((value) => ({ value }))
  ];
}

function slotCollection(side) {
  return side === "player" ? battleMap.spawns.playerSlots : battleMap.spawns.enemySlots;
}

function zoneCollection(side) {
  return side === "player" ? battleMap.spawns.playerZones : battleMap.spawns.enemyZones;
}

function normalizeBattleMap(metadata) {
  metadata.spawns ??= {};
  metadata.spawns.playerSlots ??= [];
  metadata.spawns.enemySlots ??= [];
  metadata.spawns.playerZones ??= [];
  metadata.spawns.enemyZones ??= [];
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

function shapeSummary(shape) {
  if (shape.type === "rect") return `rect x${Math.round(shape.x)} y${Math.round(shape.y)} w${Math.round(shape.width)} h${Math.round(shape.height)}`;
  if (shape.type === "circle") return `circle x${Math.round(shape.x)} y${Math.round(shape.y)} r${Math.round(shape.radius)}`;
  return `polygon ${shape.points?.length ?? 0} points`;
}

function sampleZone(shape, index, capacity) {
  if (shape.type === "rect") {
    const columns = Math.ceil(Math.sqrt(capacity));
    const rows = Math.ceil(capacity / columns);
    return {
      x: shape.x + (((index % columns) + 0.5) / columns) * shape.width,
      y: shape.y + ((Math.floor(index / columns) + 0.5) / rows) * shape.height
    };
  }
  if (shape.type === "circle") {
    const angle = (index / Math.max(1, capacity)) * Math.PI * 2;
    return { x: shape.x + Math.cos(angle) * shape.radius * 0.55, y: shape.y + Math.sin(angle) * shape.radius * 0.55 };
  }
  return shapeCenter(shape);
}

function pointInsideImage(point) {
  return point.x >= 0 && point.x <= battleMap.dimensions.width && point.y >= 0 && point.y <= battleMap.dimensions.height;
}

function shapeInsideImage(shape) {
  if (shape.type === "rect") return pointInsideImage(shape) && pointInsideImage({ x: shape.x + shape.width, y: shape.y + shape.height });
  if (shape.type === "circle") {
    return pointInsideImage({ x: shape.x - shape.radius, y: shape.y - shape.radius }) && pointInsideImage({ x: shape.x + shape.radius, y: shape.y + shape.radius });
  }
  return shape.points.every(pointInsideImage);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function uniqueId(prefix, collection) {
  const used = new Set(collection.map((item) => item.id));
  let index = 1;
  let id = `${prefix}_${index}`;
  while (used.has(id)) id = `${prefix}_${++index}`;
  return id;
}

function numberFrom(selector) {
  return Math.round(Number(document.querySelector(selector).value));
}

function optionalNumberFrom(selector) {
  const value = document.querySelector(selector).value;
  return value === "" ? undefined : Number(value);
}

function stripEmpty(object) {
  for (const key of Object.keys(object)) {
    if (object[key] === "" || object[key] === undefined) delete object[key];
  }
  return object;
}

function setDirty(value) {
  isDirty = value;
  dirtyState.textContent = value ? "unsaved" : "clean";
  dirtyState.classList.toggle("dirty", value);
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
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

function serverConnectionMessage(error) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Could not reach the Battle Map Spawn Editor server. Keep this tab open, run BATTLE_MAP_EDITOR.bat again, then press Save.";
  }
  return error instanceof Error ? error.message : String(error);
}
