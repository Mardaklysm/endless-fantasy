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
const variantState = document.querySelector("#variantState");
const modeSelect = document.querySelector("#modeSelect");
const playerPreviewCount = document.querySelector("#playerPreviewCount");
const enemyPreviewCount = document.querySelector("#enemyPreviewCount");
const toggles = {
  player: document.querySelector("#playerToggle"),
  enemy: document.querySelector("#enemyToggle"),
  boss: document.querySelector("#bossToggle"),
  preview: document.querySelector("#previewToggle")
};

const slotDialog = document.querySelector("#slotDialog");
const slotForm = document.querySelector("#slotForm");
const spriteDialog = document.querySelector("#spriteDialog");
const spriteGrid = document.querySelector("#spriteGrid");
const spriteSearch = document.querySelector("#spriteSearch");

let battleMaps = [];
let battleMap = undefined;
let spriteCatalog = { players: [], enemies: [] };
let spriteFilter = "player";
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
const spriteImages = new Map();
const PLAYER_SLOT_LIMIT = 3;
let assetCacheNonce = Date.now();

init();

async function init() {
  bindEvents();
  await Promise.all([loadBattleMapList(), loadSpriteCatalog()]);
  if (battleMaps.length) await loadBattleMap(battleMaps[0].id);
  requestAnimationFrame(draw);
}

function bindEvents() {
  window.addEventListener("resize", resizeCanvas);
  saveBtn.addEventListener("click", saveBattleMap);
  reloadBtn.addEventListener("click", reloadCurrentEditorState);
  resetViewBtn.addEventListener("click", resetView);
  battleMapSelect.addEventListener("change", () => loadBattleMap(battleMapSelect.value));
  modeSelect.addEventListener("change", enforceModeForVariant);
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
  document.querySelector("#slotCancelBtn").addEventListener("click", cancelSlotDialog);
  document.querySelector("#slotDeleteBtn").addEventListener("click", deleteEditingSlot);
  document.querySelector("#slotSide").addEventListener("change", updateSlotDialogFields);
  document.querySelector("#slotPreviewBtn").addEventListener("click", openSpritePicker);
  document.querySelector("#spriteCancelBtn").addEventListener("click", () => spriteDialog.close());
  document.querySelector("#clearSpriteBtn").addEventListener("click", clearPreviewSprite);
  spriteSearch.addEventListener("input", renderSpriteGrid);
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      spriteFilter = button.dataset.filter;
      renderSpriteGrid();
    });
  });
}

async function loadBattleMapList() {
  battleMaps = await fetchJson("/api/battle-maps");
  battleMapSelect.innerHTML = battleMaps
    .map((entry) => `<option value="${entry.id}">${entry.displayName} [${titleCase(entry.variant)}]${entry.type ? ` (${entry.type})` : ""}</option>`)
    .join("");
}

async function loadSpriteCatalog(refreshAssets = false) {
  if (refreshAssets) {
    assetCacheNonce = Date.now();
    spriteImages.clear();
  }
  spriteCatalog = await fetchJson("/api/battle-sprites");
  await Promise.all([...spriteCatalog.players, ...spriteCatalog.enemies].map(preloadSpriteImage));
}

async function loadBattleMap(id) {
  if (!id) return;
  battleMap = await fetchJson(`/api/battle-maps/${encodeURIComponent(id)}`);
  normalizeBattleMap(battleMap);
  battleMapSelect.value = battleMap.id;
  mapTitle.textContent = `${battleMap.displayName} - ${battleMap.id}`;
  variantState.textContent = `Variant: ${titleCase(battleMap.variant)}`;
  image = await loadImage(assetUrl(battleMap.background.path));
  if (!battleMap.dimensions?.width || !battleMap.dimensions?.height) {
    battleMap.dimensions = { width: image.naturalWidth, height: image.naturalHeight };
  }
  selected = undefined;
  editingSlot = undefined;
  setDirty(false);
  resetView();
  updateVariantControls();
  refreshValidation();
  showStatus("Loaded.");
}

async function reloadCurrentEditorState() {
  await loadSpriteCatalog(true);
  await loadBattleMap(battleMap?.id);
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
  if (event.button !== 0) return;
  if (event.shiftKey) {
    deleteSlotAt(pointer);
    return;
  }
  if (modeSelect.value === "addPlayer") return createSlot("player", pointer);
  if (modeSelect.value === "addEnemy") return createSlot("enemy", pointer);
  if (modeSelect.value === "addBoss") return createSlot("boss", pointer);
  const slotHit = findSlotAt(pointer);
  selected = slotHit ? { type: "slot", ...slotHit } : undefined;
  if (!slotHit) return;
  const slot = slotFor(slotHit.side, slotHit.index);
  drag = { type: "slot", side: slotHit.side, index: slotHit.index, start: pointer, origin: { x: slot.x, y: slot.y }, moved: false };
}

function onPointerMove(event) {
  pointer = screenToImage(event);
  coords.textContent = `x ${Math.round(pointer.x)}, y ${Math.round(pointer.y)}`;
  if (!drag) return;
  if (drag.type === "pan") {
    pan = { x: drag.pan.x + event.clientX - drag.start.x, y: drag.pan.y + event.clientY - drag.start.y };
    return;
  }
  if (drag.type === "slot") {
    const slot = slotFor(drag.side, drag.index);
    slot.x = Math.round(drag.origin.x + pointer.x - drag.start.x);
    slot.y = Math.round(drag.origin.y + pointer.y - drag.start.y);
    drag.moved ||= distance(pointer, drag.start) > 2;
    setDirty(true);
    refreshValidation();
  }
}

function onPointerUp() {
  if (drag?.type === "slot" && !drag.moved) openSlotForm(drag.side, drag.index);
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
  if (side === "boss") {
    if (battleMap.variant !== "boss") return showStatus("Boss slots are only available on boss variants.", true);
    if (battleMap.bossSlot && !confirm("Replace the existing boss slot?")) return;
    battleMap.bossSlot = makeSlot("boss", point, 0);
    selected = { type: "slot", side: "boss", index: 0 };
    setDirty(true);
    refreshValidation();
    showStatus("Boss slot added.");
    openSlotForm("boss", 0);
    return;
  }
  const limit = side === "player" ? PLAYER_SLOT_LIMIT : battleMap.variant === "boss" ? 3 : 4;
  const collection = slotCollection(side);
  if (collection.length >= limit) return showStatus(`${titleCase(side)} slots are limited to ${limit} on this variant.`, true);
  const wasDirty = isDirty;
  const order = collection.reduce((max, slot) => Math.max(max, Number(slot.order) || 0), 0) + 1;
  const slot = makeSlot(side, point, order);
  collection.push(slot);
  selected = { type: "slot", side, index: collection.length - 1 };
  setDirty(true);
  refreshValidation();
  showStatus(`${side} slot added.`);
  openSlotForm(side, collection.length - 1, true, wasDirty);
}

function makeSlot(side, point, order) {
  const slot = {
    id: side === "boss" ? "boss_1" : uniqueId(side, slotCollection(side)),
    x: Math.round(point.x),
    y: Math.round(point.y),
    order,
    facing: side === "player" ? "left" : "right",
    radius: side === "boss" ? 256 : side === "player" ? 138 : 152
  };
  if (side === "enemy") slot.role = "normal";
  if (side === "boss") slot.role = "boss";
  return slot;
}

function openSlotForm(side, index, isNew = false, wasDirty = isDirty) {
  editingSlot = { side, index, isNew, wasDirty };
  const slot = slotFor(side, index);
  document.querySelector("#slotId").value = slot.id;
  document.querySelector("#slotSide").value = side;
  document.querySelector("#slotOrder").value = slot.order ?? index + 1;
  document.querySelector("#slotX").value = Math.round(slot.x);
  document.querySelector("#slotY").value = Math.round(slot.y);
  document.querySelector("#slotFacing").value = slot.facing ?? (side === "player" ? "left" : "right");
  document.querySelector("#slotRadius").value = slot.radius ?? "";
  document.querySelector("#slotRole").value = side === "boss" ? "boss" : side === "enemy" ? slot.role ?? "normal" : "normal";
  document.querySelector("#slotPreviewSprite").value = slot.previewSpriteId ?? "";
  document.querySelector("#slotNotes").value = slot.notes ?? "";
  updateSlotDialogFields();
  slotDialog.showModal();
}

function onSlotFormSubmit(event) {
  event.preventDefault();
  if (!editingSlot) return;
  const oldSlot = slotFor(editingSlot.side, editingSlot.index);
  const side = document.querySelector("#slotSide").value;
  if (!canPlaceSide(side, editingSlot)) return;
  const next = {
    id: document.querySelector("#slotId").value.trim(),
    x: numberFrom("#slotX"),
    y: numberFrom("#slotY"),
    order: numberFrom("#slotOrder"),
    facing: document.querySelector("#slotFacing").value,
    radius: optionalNumberFrom("#slotRadius"),
    previewSpriteId: document.querySelector("#slotPreviewSprite").value.trim(),
    notes: document.querySelector("#slotNotes").value.trim()
  };
  if (side === "enemy") next.role = document.querySelector("#slotRole").value || "normal";
  if (side === "boss") next.role = "boss";
  stripEmpty(next);
  if (!next.id) return showStatus("Slot id is required.", true);
  removeSlot(editingSlot.side, editingSlot.index);
  addSlot(side, next);
  selected = { type: "slot", side, index: side === "boss" ? 0 : slotCollection(side).length - 1 };
  editingSlot = undefined;
  setDirty(true);
  refreshValidation();
  slotDialog.close();
  showStatus(`${oldSlot.id} updated.`);
}

function cancelSlotDialog() {
  if (editingSlot?.isNew) {
    removeSlot(editingSlot.side, editingSlot.index);
    setDirty(editingSlot.wasDirty);
  }
  editingSlot = undefined;
  refreshValidation();
  slotDialog.close();
}

function deleteEditingSlot() {
  if (!editingSlot) return;
  removeSlot(editingSlot.side, editingSlot.index);
  editingSlot = undefined;
  selected = undefined;
  setDirty(true);
  refreshValidation();
  slotDialog.close();
  showStatus("Slot deleted.");
}

function updateSlotDialogFields() {
  const side = document.querySelector("#slotSide").value;
  const isEnemyLike = side === "enemy" || side === "boss";
  const roleSelect = document.querySelector("#slotRole");
  slotDialog.querySelectorAll(".enemyOnly").forEach((el) => (el.style.display = isEnemyLike ? "grid" : "none"));
  roleSelect.disabled = side === "boss";
  if (side === "boss") roleSelect.value = "boss";
}

function openSpritePicker() {
  if (!editingSlot) return;
  spriteFilter = editingSlot.side === "player" ? "player" : editingSlot.side === "boss" ? "boss" : "enemy";
  spriteSearch.value = "";
  renderSpriteGrid();
  spriteDialog.showModal();
}

function renderSpriteGrid() {
  const term = spriteSearch.value.trim().toLowerCase();
  document.querySelectorAll("[data-filter]").forEach((button) => button.classList.toggle("active", button.dataset.filter === spriteFilter));
  const entries = spriteEntriesForFilter()
    .filter((entry) => !term || entry.id.toLowerCase().includes(term) || entry.name.toLowerCase().includes(term))
    .sort((a, b) => Number(b.boss) - Number(a.boss) || a.name.localeCompare(b.name));
  spriteGrid.innerHTML = "";
  for (const entry of entries) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "spriteChoice";
    button.innerHTML = `<span class="spriteThumb"></span><strong>${entry.name}</strong><small>${entry.id}${entry.boss ? " - boss" : entry.role ? ` - ${entry.role}` : ""}</small>`;
    const thumb = button.querySelector(".spriteThumb");
    const img = spriteImages.get(entry.id);
    if (img) drawThumb(thumb, entry, img);
    button.addEventListener("click", () => {
      void assignPreviewSprite(entry.id);
    });
    spriteGrid.append(button);
  }
}

function spriteEntriesForFilter() {
  if (spriteFilter === "player") return spriteCatalog.players;
  if (spriteFilter === "boss") return spriteCatalog.enemies.filter((entry) => entry.boss || entry.role === "large");
  return spriteCatalog.enemies;
}

async function assignPreviewSprite(spriteId) {
  const slot = slotFor(editingSlot.side, editingSlot.index);
  slot.previewSpriteId = spriteId;
  document.querySelector("#slotPreviewSprite").value = spriteId;
  const entry = spriteEntry(spriteId);
  if (entry) await reloadSpriteImage(entry);
  setDirty(true);
  refreshValidation();
  spriteDialog.close();
  showStatus(`Preview sprite set to ${spriteId}.`);
}

function clearPreviewSprite() {
  if (!editingSlot) return;
  const slot = slotFor(editingSlot.side, editingSlot.index);
  delete slot.previewSpriteId;
  document.querySelector("#slotPreviewSprite").value = "";
  setDirty(true);
  refreshValidation();
  spriteDialog.close();
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
      if (toggles.preview.checked) drawPreviewSprites();
      if (toggles.player.checked) battleMap.playerSlots.forEach((slot, index) => drawSlot(slot, "player", index));
      if (toggles.enemy.checked) battleMap.enemySlots.forEach((slot, index) => drawSlot(slot, "enemy", index));
      if (toggles.boss.checked && battleMap.bossSlot) drawSlot(battleMap.bossSlot, "boss", 0);
    }
    ctx.restore();
  }
  requestAnimationFrame(draw);
}

function drawPreviewSprites() {
  const playerLimit = Math.min(PLAYER_SLOT_LIMIT, Number(playerPreviewCount.value) || PLAYER_SLOT_LIMIT);
  const enemyLimit = Math.min(battleMap.variant === "boss" ? 3 : 4, Number(enemyPreviewCount.value) || 4);
  battleMap.playerSlots.slice().sort(byOrderThenId).slice(0, playerLimit).forEach((slot) => drawSpritePreview(slot, "player"));
  battleMap.enemySlots.slice().sort(byOrderThenId).slice(0, enemyLimit).forEach((slot) => drawSpritePreview(slot, "enemy"));
  if (battleMap.variant === "boss" && battleMap.bossSlot) drawSpritePreview(battleMap.bossSlot, "boss");
}

function drawSpritePreview(slot, side) {
  const entry = spriteEntry(slot.previewSpriteId);
  const img = entry ? spriteImages.get(entry.id) : undefined;
  if (!entry || !img) return drawGhost(slot, side);
  const radius = slot.radius ?? defaultRadius(side);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 0.82;
  if (entry.category === "player" && entry.frame) {
    const height = radius * 1.92;
    const width = height * (entry.frame.width / entry.frame.height);
    ctx.drawImage(img, entry.frame.x, entry.frame.y, entry.frame.width, entry.frame.height, slot.x - width / 2, slot.y - height * 0.86, width, height);
  } else {
    const maxSide = radius * (side === "boss" ? 2.05 : 1.55);
    const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
    const width = ratio >= 1 ? maxSide : maxSide * ratio;
    const height = ratio >= 1 ? maxSide / ratio : maxSide;
    ctx.drawImage(img, slot.x - width / 2, slot.y - height * 0.85, width, height);
  }
  ctx.restore();
}

function drawGhost(slot, side) {
  const radius = slot.radius ?? defaultRadius(side);
  ctx.save();
  ctx.fillStyle = side === "player" ? "rgba(129, 232, 255, 0.18)" : side === "boss" ? "rgba(255, 213, 92, 0.18)" : "rgba(255, 186, 99, 0.18)";
  ctx.strokeStyle = side === "player" ? "#81e8ff" : side === "boss" ? "#ffd55c" : "#ffba63";
  ctx.setLineDash([10 / scale, 8 / scale]);
  ctx.lineWidth = 3 / scale;
  ctx.beginPath();
  ctx.ellipse(slot.x, slot.y, radius, radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSlot(slot, side, index) {
  const isSelected = selected?.type === "slot" && selected.side === side && selected.index === index;
  const color = side === "player" ? "#4dd5ff" : side === "boss" ? "#ffd55c" : "#ff7942";
  const fill = side === "player" ? "rgba(77, 213, 255, 0.26)" : side === "boss" ? "rgba(181, 75, 255, 0.23)" : "rgba(255, 121, 66, 0.28)";
  const radius = slot.radius ?? defaultRadius(side);
  ctx.save();
  ctx.lineWidth = (isSelected ? 5 : side === "boss" ? 4 : 2) / scale;
  ctx.strokeStyle = isSelected ? "#ffffff" : color;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(slot.x, slot.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(slot.x, slot.y, (side === "boss" ? 16 : 12) / scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#07101d";
  ctx.lineWidth = 3 / scale;
  ctx.stroke();
  drawFacingArrow(slot.x, slot.y, slot.facing ?? (side === "player" ? "left" : "right"), color);
  drawLabel(side === "boss" ? slot.id : `${slot.id} #${slot.order ?? index + 1}`, slot.x, slot.y - radius - 10 / scale);
  ctx.restore();
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
    ...(battleMap.bossSlot ? [{ side: "boss", index: 0, slot: battleMap.bossSlot }] : []),
    ...battleMap.enemySlots.map((slot, index) => ({ side: "enemy", index, slot })),
    ...battleMap.playerSlots.map((slot, index) => ({ side: "player", index, slot }))
  ];
  for (const candidate of candidates) {
    if (distance(point, candidate.slot) <= Math.max(24 / scale, candidate.slot.radius ?? defaultRadius(candidate.side))) return { side: candidate.side, index: candidate.index };
  }
  return undefined;
}

function deleteSlotAt(point) {
  const hit = findSlotAt(point);
  if (!hit) return false;
  const removed = removeSlot(hit.side, hit.index);
  selected = undefined;
  setDirty(true);
  refreshValidation();
  showStatus(`${removed.id} deleted.`);
  return true;
}

function refreshValidation() {
  if (!battleMap) return;
  const warnings = validateBattleMap();
  validationEl.textContent = warnings.length ? `Variant: ${titleCase(battleMap.variant)}\nWarnings:\n${warnings.map((warning) => `- ${warning}`).join("\n")}` : `Variant: ${titleCase(battleMap.variant)}\nNo validation warnings.`;
  validationEl.classList.toggle("error", warnings.some((warning) => warning.includes("Duplicate") || warning.includes("outside") || warning.includes("missing")));
}

function validateBattleMap() {
  const warnings = [];
  if (!battleMap.background?.path || !battleMap.background?.key) warnings.push("Missing background asset key/path.");
  if (battleMap.playerSlots.length < PLAYER_SLOT_LIMIT) warnings.push(`Fewer than ${PLAYER_SLOT_LIMIT} player slots.`);
  if (battleMap.playerSlots.length > PLAYER_SLOT_LIMIT) warnings.push(`More than ${PLAYER_SLOT_LIMIT} player slots.`);
  if (battleMap.variant === "normal") {
    if (battleMap.bossSlot) warnings.push("Normal variant should not have a boss slot.");
    if (!battleMap.enemySlots.length) warnings.push("Normal variant has no enemy slots.");
    if (battleMap.enemySlots.length > 4) warnings.push("Normal variant supports max 4 enemy slots.");
  } else {
    if (!battleMap.bossSlot) warnings.push("Boss variant is missing bossSlot.");
    if (battleMap.enemySlots.length > 3) warnings.push("Boss variant supports max 3 normal enemy slots.");
  }
  const ids = new Set();
  for (const slot of allSlots()) {
    if (!slot.id) warnings.push("Spawn slot with missing id.");
    else if (ids.has(slot.id)) warnings.push(`Duplicate ID: ${slot.id}`);
    ids.add(slot.id);
    if (!pointInsideImage(slot)) warnings.push(`${slot.id} is outside image bounds.`);
    if (slot.previewSpriteId && !spriteEntry(slot.previewSpriteId)) warnings.push(`${slot.id} references missing preview sprite ${slot.previewSpriteId}.`);
  }
  const slots = allSlots();
  for (let i = 0; i < slots.length; i += 1) {
    for (let j = i + 1; j < slots.length; j += 1) {
      const minSpacing = ((slots[i].radius ?? 120) + (slots[j].radius ?? 120)) * 0.72;
      if (distance(slots[i], slots[j]) < minSpacing) warnings.push(`${slots[i].id} is close to ${slots[j].id}.`);
    }
  }
  return warnings;
}

function allSlots() {
  return [...battleMap.playerSlots, ...battleMap.enemySlots, ...(battleMap.bossSlot ? [battleMap.bossSlot] : [])];
}

function slotCollection(side) {
  if (side === "boss") return battleMap.bossSlot ? [battleMap.bossSlot] : [];
  return side === "player" ? battleMap.playerSlots : battleMap.enemySlots;
}

function slotFor(side, index) {
  return side === "boss" ? battleMap.bossSlot : slotCollection(side)[index];
}

function addSlot(side, slot) {
  if (side === "boss") battleMap.bossSlot = slot;
  else slotCollection(side).push(slot);
}

function removeSlot(side, index) {
  if (side === "boss") {
    const removed = battleMap.bossSlot;
    battleMap.bossSlot = null;
    return removed;
  }
  return slotCollection(side).splice(index, 1)[0];
}

function canPlaceSide(side, current) {
  if (side === "boss") {
    if (battleMap.variant !== "boss") return fail("Normal variants cannot have boss slots.");
    if (battleMap.bossSlot && current.side !== "boss") return fail("This boss variant already has a boss slot.");
    return true;
  }
  const collection = slotCollection(side);
  const limit = side === "player" ? PLAYER_SLOT_LIMIT : battleMap.variant === "boss" ? 3 : 4;
  const sameCollection = current.side === side;
  if (collection.length >= limit && !sameCollection) return fail(`${titleCase(side)} slots are limited to ${limit} on this variant.`);
  return true;
}

function fail(message) {
  showStatus(message, true);
  return false;
}

function normalizeBattleMap(metadata) {
  metadata.baseMapId ??= metadata.id.replace(/_(normal|boss)$/, "");
  metadata.variant ??= metadata.id.endsWith("_boss") ? "boss" : "normal";
  metadata.playerSlots ??= [];
  metadata.enemySlots ??= [];
  metadata.bossSlot ??= null;
}

function updateVariantControls() {
  const bossOption = modeSelect.querySelector('option[value="addBoss"]');
  bossOption.disabled = battleMap?.variant !== "boss";
  playerPreviewCount.max = String(PLAYER_SLOT_LIMIT);
  if (Number(playerPreviewCount.value) > PLAYER_SLOT_LIMIT) playerPreviewCount.value = String(PLAYER_SLOT_LIMIT);
  enemyPreviewCount.max = battleMap?.variant === "boss" ? "3" : "4";
  if (Number(enemyPreviewCount.value) > Number(enemyPreviewCount.max)) enemyPreviewCount.value = enemyPreviewCount.max;
  enforceModeForVariant();
}

function enforceModeForVariant() {
  if (battleMap?.variant !== "boss" && modeSelect.value === "addBoss") {
    modeSelect.value = "select";
    showStatus("Boss slot mode is only enabled for boss variants.", true);
  }
}

function screenToImage(event) {
  return {
    x: (event.offsetX - pan.x) / scale,
    y: (event.offsetY - pan.y) / scale
  };
}

function pointInsideImage(point) {
  return point.x >= 0 && point.x <= battleMap.dimensions.width && point.y >= 0 && point.y <= battleMap.dimensions.height;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function uniqueId(prefix, collection) {
  const used = new Set([...collection.map((item) => item.id), ...(battleMap.bossSlot ? [battleMap.bossSlot.id] : [])]);
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

function defaultRadius(side) {
  return side === "boss" ? 256 : side === "player" ? 138 : 152;
}

function byOrderThenId(a, b) {
  return (a.order ?? 999) - (b.order ?? 999) || a.id.localeCompare(b.id);
}

function spriteEntry(id) {
  return id ? [...spriteCatalog.players, ...spriteCatalog.enemies].find((entry) => entry.id === id) : undefined;
}

async function preloadSpriteImage(entry) {
  if (!entry.assetPath) return;
  try {
    spriteImages.set(entry.id, await loadImage(assetUrl(entry.assetPath)));
  } catch {
    console.warn(`Missing preview sprite asset: ${entry.id}`);
  }
}

async function reloadSpriteImage(entry) {
  if (!entry.assetPath) return;
  spriteImages.set(entry.id, await loadImage(`${assetUrl(entry.assetPath)}&picked=${Date.now()}`));
}

function assetUrl(assetPath) {
  return `/api/asset?path=${encodeURIComponent(assetPath)}&v=${assetCacheNonce}`;
}

function drawThumb(target, entry, img) {
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = 58;
  thumbCanvas.height = 58;
  const thumbCtx = thumbCanvas.getContext("2d");
  thumbCtx.imageSmoothingEnabled = false;
  if (entry.frame) {
    thumbCtx.drawImage(img, entry.frame.x, entry.frame.y, entry.frame.width, entry.frame.height, 3, 0, 52, 58);
  } else {
    const ratio = img.naturalWidth / Math.max(1, img.naturalHeight);
    const width = ratio >= 1 ? 52 : 52 * ratio;
    const height = ratio >= 1 ? 52 / ratio : 52;
    thumbCtx.drawImage(img, (58 - width) / 2, (58 - height) / 2, width, height);
  }
  target.append(thumbCanvas);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function titleCase(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "";
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
