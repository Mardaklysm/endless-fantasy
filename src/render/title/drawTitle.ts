import {
  HEIGHT,
  LAYER_WORLD_IMAGE,
  SAVE_KEY,
  TITLE_MENU_ROW_HEIGHT,
  TITLE_MENU_START_Y,
  WIDTH
} from "../../app/config";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function drawTitle(this: CrystalOathSceneContext) {
  this.g.fillStyle(0x000000, 1).fillRect(0, 0, WIDTH, HEIGHT);
  const hasTitleScreen = this.hasTexture("title_screen");
  if (hasTitleScreen) this.drawContainedTexture("title_screen", 0, 0, WIDTH, HEIGHT, LAYER_WORLD_IMAGE);
  else {
    this.g.fillStyle(0x050812, 1).fillRect(0, 0, WIDTH, HEIGHT);
    for (let i = 0; i < 120; i += 1) {
      const x = (i * 73) % WIDTH;
      const y = (i * 41) % HEIGHT;
      const c = i % 3 === 0 ? 0xfff0a8 : i % 3 === 1 ? 0x83d6ff : 0xffffff;
      this.g.fillStyle(c, i % 5 === 0 ? 0.42 : 0.28).fillRect(x, y, i % 5 === 0 ? 3 : 2, i % 5 === 0 ? 3 : 2);
    }
    if (this.hasTexture("title_four_crystals")) this.drawTexture("title_four_crystals", WIDTH / 2 - 96, 48, 192, 64, LAYER_WORLD_IMAGE);
    else this.drawPixelCrystal(WIDTH / 2 - 24, 48, 2.4);
    const hasTitleLogo = this.hasTexture("title_logo");
    if (hasTitleLogo) this.drawTexture("title_logo", WIDTH / 2 - 210, 128, 420, 96, LAYER_WORLD_IMAGE);
    else {
      this.text(WIDTH / 2, 178, "CRYSTAL OATH", 44, "#fff2a8", "center");
      this.text(WIDTH / 2, 226, "Dawn of the Four Stars", 24, "#a8ddff", "center");
    }
  }
  const hasSave = !!localStorage.getItem(SAVE_KEY);
  this.titleOptions.forEach((option, idx) => {
    const disabled = option === "Continue" && !hasSave;
    const prefix = idx === this.titleSelected ? ">" : " ";
    this
      .text(WIDTH / 2, TITLE_MENU_START_Y + idx * TITLE_MENU_ROW_HEIGHT, `${prefix} ${option}`, 22, disabled ? "#8a91a2" : "#ffffff", "center")
      .setStroke("#02040a", 5)
      .setShadow(0, 2, "#02040a", 4, true, true);
  });
}
