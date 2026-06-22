import Phaser from "phaser";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "./config";
import { CrystalOathScene } from "../scene/CrystalOathScene";

export function createGameConfig(parent = "game"): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    backgroundColor: "#050812",
    pixelArt: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [CrystalOathScene]
  };
}

export function createGame(parent = "game") {
  return new Phaser.Game(createGameConfig(parent));
}
