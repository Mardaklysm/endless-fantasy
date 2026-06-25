import type { PoiServiceProfile } from "./gameDataTypes";

export const POI_SERVICE_PROFILES: Record<string, PoiServiceProfile> = {
  dawnford: {
    id: "dawnford",
    name: "Greenhaven",
    innPrice: 18,
    clinicPrice: 35,
    itemStock: ["potion", "antidote", "tent"],
    weaponStock: ["ironSaber"],
    armorStock: ["ringMail", "sageMantle"],
    spellStock: ["glow", "frost"]
  },
  brinewick: {
    id: "brinewick",
    name: "Coralreach",
    innPrice: 26,
    clinicPrice: 45,
    itemStock: ["potion", "antidote", "phoenixAsh", "smokeBomb"],
    weaponStock: ["glassWand"],
    armorStock: ["ringMail", "sageMantle"],
    spellStock: ["mendall", "quakelet"]
  },
  elderleaf: {
    id: "elderleaf",
    name: "Elderleaf",
    innPrice: 24,
    clinicPrice: 42,
    itemStock: ["potion", "antidote", "etherleaf", "tent"],
    weaponStock: ["glassWand"],
    armorStock: ["sageMantle"],
    spellStock: ["revive", "storm"]
  },
  sunbarrow: {
    id: "sunbarrow",
    name: "Highspire Camp",
    innPrice: 32,
    clinicPrice: 55,
    itemStock: ["potion", "phoenixAsh", "etherleaf", "smokeBomb", "tent"],
    weaponStock: ["glassWand"],
    armorStock: ["ringMail", "sageMantle"],
    spellStock: ["starveil", "nova"]
  },
  starfallGate: {
    id: "starfallGate",
    name: "Starfall Gate",
    innPrice: 0,
    clinicPrice: 0,
    itemStock: ["potion", "phoenixAsh", "etherleaf", "smokeBomb"],
    weaponStock: [],
    armorStock: [],
    spellStock: []
  }
};

export function poiServiceProfileById(id: string | undefined): PoiServiceProfile | undefined {
  return id ? POI_SERVICE_PROFILES[id] : undefined;
}
