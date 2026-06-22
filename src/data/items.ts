import type { ItemDef } from "./gameDataTypes";

export const ITEMS: Record<string, ItemDef> = {
  potion: {
    id: "potion",
    name: "Potion",
    price: 12,
    description: "Restores 35 HP.",
    battle: true,
    field: true
  },
  antidote: {
    id: "antidote",
    name: "Antidote",
    price: 10,
    description: "Cures poison.",
    battle: true,
    field: true
  },
  phoenixAsh: {
    id: "phoenixAsh",
    name: "Phoenix Ash",
    price: 55,
    description: "Revives an ally with partial HP.",
    battle: true,
    field: true
  },
  etherleaf: {
    id: "etherleaf",
    name: "Etherleaf",
    price: 65,
    description: "Restores one charge to every spell tier.",
    battle: true,
    field: true
  },
  tent: {
    id: "tent",
    name: "Tent",
    price: 90,
    description: "Field rest, partial heal, and save.",
    battle: false,
    field: true
  },
  smokeBomb: {
    id: "smokeBomb",
    name: "Smoke Bomb",
    price: 35,
    description: "Escapes most battles.",
    battle: true,
    field: false
  },
  charteredCompass: {
    id: "charteredCompass",
    name: "Chartered Compass",
    price: 0,
    description: "A harbor charter that opens routes to harsher seas.",
    battle: false,
    field: false
  }
};
