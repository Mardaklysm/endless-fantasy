import { HEIGHT, LAYER_UI_IMAGE, WIDTH } from "../../app/config";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function drawMenuScreen(this: CrystalOathSceneContext) {
  this.drawBaseSceneForMode(this.previousMode);
  if (!this.menu) return;
  this.clearOverlayChrome();
  this.ui.fillStyle(0x02040a, 0.68).fillRect(0, 0, WIDTH, HEIGHT);
  const labels = this.menu.options.map((option) => (typeof option.label === "function" ? option.label() : option.label));
  const longestLabel = labels.reduce((max, label) => Math.max(max, label.length), this.menu.title.length);
  const dialogW = Math.min(580, Math.max(340, longestLabel * 8 + 104));
  const rowH = 28;
  const footerH = this.menu.footer ? 42 : 20;
  const dialogH = Math.min(HEIGHT - 70, Math.max(148, 78 + this.menu.options.length * rowH + footerH));
  const x = Math.round(WIDTH / 2 - dialogW / 2);
  const y = Math.round(HEIGHT / 2 - dialogH / 2);
  this.drawFantasyDialogFrame(x, y, dialogW, dialogH, { variant: "standard" });
  this.text(x + dialogW / 2, y + 22, this.menu.title, 18, "#ffd98a", "center", {
    wordWrapWidth: dialogW - 46,
    stroke: "#040712",
    strokeThickness: 2
  });
  this.drawFantasyDialogDivider(x + dialogW / 2 - 58, y + 51, 116, "mini", 0.58);
  const startY = y + 66;
  const optionX = x + 26;
  const optionW = dialogW - 52;
  this.menu.options.forEach((option, idx) => {
    const disabled = option.disabled?.() ?? false;
    const label = labels[idx];
    const selected = idx === this.menu!.selected;
    const optionY = startY + idx * rowH;
    this.drawFantasyDialogOption(optionX, optionY, optionW, 24, selected, { disabled });
    this.text(optionX + 13, optionY + 4, label, 14, disabled ? "#7c8497" : selected ? "#fff4c8" : "#ffffff", "left", {
      wordWrapWidth: optionW - 26,
      stroke: "#030712",
      strokeThickness: 1
    });
  });
  if (this.menu.footer) {
    const footer = typeof this.menu.footer === "function" ? this.menu.footer() : this.menu.footer;
    this.text(x + dialogW / 2, y + dialogH - 29, footer, 11, "#bdc8df", "center", {
      wordWrapWidth: dialogW - 58,
      strokeThickness: 1
    });
  }
}

export function drawDialogue(this: CrystalOathSceneContext) {
  this.drawBaseSceneForMode(this.previousMode);
  if (!this.dialogue) return;
  this.clearOverlayChrome();
  this.ui.fillStyle(0x02040a, 0.38).fillRect(0, 0, WIDTH, HEIGHT);
  const x = 70;
  const y = 334;
  const w = WIDTH - 140;
  const h = 146;
  this.drawFantasyDialogFrame(x, y, w, h, { variant: "standard" });
  this.text(x + 28, y + 30, this.dialogue.lines[this.dialogue.index], 18, "#ffffff", "left", {
    wordWrapWidth: w - 60,
    stroke: "#030712",
    strokeThickness: 2
  });
  this.drawFantasyDialogDivider(x + w - 178, y + h - 31, 78, "mini", 0.58);
  this.text(x + w - 90, y + h - 37, "Enter / Z", 12, "#bdc8df", "center", { strokeThickness: 1 });
}

export function drawGameOver(this: CrystalOathSceneContext) {
  this.g.fillStyle(0x050407, 1).fillRect(0, 0, WIDTH, HEIGHT);
  this.text(WIDTH / 2, 190, "GAME OVER", 46, "#f07178", "center");
  this.text(WIDTH / 2, 270, "Enter loads your last save. Escape returns to title.", 20, "#ffffff", "center");
}

export function drawEnding(this: CrystalOathSceneContext) {
  this.g.fillStyle(0x07111a, 1).fillRect(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 80; i += 1) {
    this.g.fillStyle(i % 2 ? 0xffeaa8 : 0x95e7ff, 0.55).fillRect((i * 97) % WIDTH, (i * 53) % HEIGHT, 3, 3);
  }
  this.drawPixelCrystal(WIDTH / 2 - 28, 72, 3);
  this.text(WIDTH / 2, 170, "Asterra Wakes", 40, "#fff2a8", "center");
  this.text(WIDTH / 2, 240, "The Root drinks, the Flame warms, the Tide sings, and the Gale carries dawn.", 20, "#ffffff", "center");
  this.text(WIDTH / 2, 310, "Arlen, Mira, and Kael return their oath to the road, where new stories wait.", 20, "#dce9ff", "center");
  this.text(WIDTH / 2, 430, "Enter returns to title.", 16, "#aab3c8", "center");
}

export function clearOverlayChrome(this: CrystalOathSceneContext) {
  this.clearText();
  this.ui.clear();
  const keptImages: typeof this.images = [];
  for (const image of this.images) {
    const depth = "depth" in image ? Number((image as { depth?: number }).depth ?? 0) : 0;
    if (depth >= LAYER_UI_IMAGE) image.destroy();
    else keptImages.push(image);
  }
  this.images = keptImages;
}
