import type { GearDef } from "./gameDataTypes";

export const WEAPONS: Record<string, GearDef> = {
  trainingBlade: {
    id: "trainingBlade",
    name: "Training Blade",
    price: 0,
    power: 2,
    kind: "weapon",
    users: ["fighter"],
    description: "A plain Greenhaven sword."
  },
  ironSaber: {
    id: "ironSaber",
    name: "Iron Saber",
    price: 95,
    power: 6,
    kind: "weapon",
    users: ["fighter"],
    description: "Reliable steel edge."
  },
  starbrand: {
    id: "starbrand",
    name: "Starbrand",
    price: 0,
    power: 13,
    kind: "weapon",
    users: ["fighter"],
    description: "A treasure blade set with pale gems."
  },
  willowRod: {
    id: "willowRod",
    name: "Willow Rod",
    price: 0,
    power: 1,
    kind: "weapon",
    users: ["priest", "mage"],
    description: "A light spell focus."
  },
  glassWand: {
    id: "glassWand",
    name: "Glass Wand",
    price: 120,
    power: 4,
    kind: "weapon",
    users: ["priest", "mage"],
    description: "A bright wand for sages."
  },
  emberStaff: {
    id: "emberStaff",
    name: "Ember Staff",
    price: 0,
    power: 8,
    kind: "weapon",
    users: ["mage"],
    description: "Warm even in rain."
  }
};

export const ARMORS: Record<string, GearDef> = {
  travelCloth: {
    id: "travelCloth",
    name: "Travel Cloth",
    price: 0,
    power: 1,
    kind: "armor",
    users: ["fighter", "priest", "mage"],
    description: "Simple road clothes."
  },
  ringMail: {
    id: "ringMail",
    name: "Ring Mail",
    price: 90,
    power: 4,
    kind: "armor",
    users: ["fighter"],
    description: "Flexible front-line armor."
  },
  sageMantle: {
    id: "sageMantle",
    name: "Sage Mantle",
    price: 85,
    power: 3,
    kind: "armor",
    users: ["priest", "mage"],
    description: "Light, warded cloth."
  },
  tidePlate: {
    id: "tidePlate",
    name: "Tide Plate",
    price: 0,
    power: 8,
    kind: "armor",
    users: ["fighter"],
    description: "Armor with a wave-like sheen."
  },
  galeCloak: {
    id: "galeCloak",
    name: "Gale Cloak",
    price: 0,
    power: 7,
    kind: "armor",
    users: ["priest", "mage"],
    description: "Moves before the wind does."
  }
};

export const GEAR: Record<string, GearDef> = { ...WEAPONS, ...ARMORS };
