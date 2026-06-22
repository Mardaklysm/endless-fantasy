import { HEIGHT, WIDTH } from "../../app/config";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function drawMenuScreen(this: CrystalOathSceneContext) {
  if (this.previousMode === "world") this.drawWorld();
  else if (this.previousMode === "town") this.drawTown();
  else if (this.previousMode === "dungeon") this.drawDungeon();
  else this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
  if (!this.menu) return;
  this.clearText();
  this.ui.fillStyle(0x02040a, 0.72).fillRect(0, 0, WIDTH, HEIGHT);
  this.drawPanel(155, 58, 650, 430);
  this.text(184, 96, this.menu.title, 24, "#fff2a8");
  const startY = 144;
  this.menu.options.forEach((option, idx) => {
    const disabled = option.disabled?.() ?? false;
    const label = typeof option.label === "function" ? option.label() : option.label;
    const selected = idx === this.menu!.selected;
    if (selected) this.drawCursor(176, startY + idx * 28 + 4);
    const prefix = selected && !this.hasTexture("ui_cursor_arrow") ? ">" : " ";
    this.text(194, startY + idx * 28, `${prefix} ${label}`, 18, disabled ? "#6f7486" : "#ffffff");
  });
  if (this.menu.footer) {
    const footer = typeof this.menu.footer === "function" ? this.menu.footer() : this.menu.footer;
    this.text(184, 454, footer, 14, "#b8c4e0");
  }
}

export function drawDialogue(this: CrystalOathSceneContext) {
  if (this.previousMode === "dungeon") this.drawDungeon();
  else if (this.previousMode === "town") this.drawTown();
  else if (this.previousMode === "title") this.drawTitle();
  else this.drawWorld();
  if (!this.dialogue) return;
  this.clearText();
  this.ui.fillStyle(0x02040a, 0.38).fillRect(0, 0, WIDTH, HEIGHT);
  this.drawPanel(56, 324, WIDTH - 112, 184);
  this.text(84, 356, this.dialogue.lines[this.dialogue.index], 20, "#ffffff");
  this.text(WIDTH - 256, 474, "Enter / Z", 14, "#aab3c8");
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
