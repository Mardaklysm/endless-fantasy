import type { GearDef } from "./gameDataTypes";

export const WEAPONS: Record<string, GearDef> = {
  trainingBlade: {
    id: "trainingBlade",
    name: "Training Blade",
    price: 0,
    power: 2,
    kind: "weapon",
    users: ["arlen"],
    description: "A plain Greenhaven sword."
  },
  ironSaber: {
    id: "ironSaber",
    name: "Iron Saber",
    price: 95,
    power: 6,
    kind: "weapon",
    users: ["arlen"],
    description: "Reliable steel edge."
  },
  starbrand: {
    id: "starbrand",
    name: "Starbrand",
    price: 0,
    power: 13,
    kind: "weapon",
    users: ["arlen"],
    description: "A treasure blade set with pale gems."
  },
  willowRod: {
    id: "willowRod",
    name: "Willow Rod",
    price: 0,
    power: 1,
    kind: "weapon",
    users: ["mira", "kael"],
    description: "A light spell focus."
  },
  glassWand: {
    id: "glassWand",
    name: "Glass Wand",
    price: 120,
    power: 4,
    kind: "weapon",
    users: ["mira", "kael"],
    description: "A bright wand for sages."
  },
  emberStaff: {
    id: "emberStaff",
    name: "Ember Staff",
    price: 0,
    power: 8,
    kind: "weapon",
    users: ["kael"],
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
    users: ["arlen", "mira", "kael"],
    description: "Simple road clothes."
  },
  ringMail: {
    id: "ringMail",
    name: "Ring Mail",
    price: 90,
    power: 4,
    kind: "armor",
    users: ["arlen"],
    description: "Flexible front-line armor."
  },
  sageMantle: {
    id: "sageMantle",
    name: "Sage Mantle",
    price: 85,
    power: 3,
    kind: "armor",
    users: ["mira", "kael"],
    description: "Light, warded cloth."
  },
  tidePlate: {
    id: "tidePlate",
    name: "Tide Plate",
    price: 0,
    power: 8,
    kind: "armor",
    users: ["arlen"],
    description: "Armor with a wave-like sheen."
  },
  galeCloak: {
    id: "galeCloak",
    name: "Gale Cloak",
    price: 0,
    power: 7,
    kind: "armor",
    users: ["mira", "kael"],
    description: "Moves before the wind does."
  }
};

export const GEAR: Record<string, GearDef> = { ...WEAPONS, ...ARMORS };
