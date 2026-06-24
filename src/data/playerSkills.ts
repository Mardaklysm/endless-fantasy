import type { PlayerSkillDef } from "./gameDataTypes";

export const PLAYER_SKILLS: Record<string, PlayerSkillDef> = {
  powerStrike: {
    id: "powerStrike",
    name: "Power Strike",
    users: ["fighter"],
    target: "enemy",
    cooldown: 2,
    description: "Heavy weapon damage."
  },
  guardBreak: {
    id: "guardBreak",
    name: "Guard Break",
    users: ["fighter"],
    target: "enemy",
    cooldown: 3,
    description: "Damage and weaken defense."
  },
  quickSlash: {
    id: "quickSlash",
    name: "Quick Slash",
    users: ["fighter"],
    target: "enemy",
    cooldown: 1,
    description: "Fast cut with better crit odds."
  },
  firstAid: {
    id: "firstAid",
    name: "First Aid",
    users: ["priest"],
    target: "ally",
    cooldown: 3,
    description: "Small heal without charges."
  },
  fireSpark: {
    id: "fireSpark",
    name: "Fire Spark",
    users: ["mage"],
    target: "enemy",
    cooldown: 2,
    description: "Fire damage with a burn chance."
  },
  focus: {
    id: "focus",
    name: "Focus",
    users: "all",
    target: "self",
    cooldown: 4,
    description: "Guard and recover a spell charge."
  }
};
