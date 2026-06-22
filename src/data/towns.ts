import type { TownServiceDef } from "./gameDataTypes";

export const TOWN_SERVICES: TownServiceDef[] = [
  { kind: "inn", label: "Inn", x: 4, y: 3, color: 0xd9eeb8, accent: 0x6f8d5b },
  { kind: "item", label: "Items", x: 7, y: 3, color: 0xf7d58b, accent: 0xb57435 },
  { kind: "arms", label: "Arms", x: 10, y: 3, color: 0xd6d9e8, accent: 0x7c8397 },
  { kind: "magic", label: "Magic", x: 13, y: 3, color: 0xc7a9ff, accent: 0x6f53b8 },
  { kind: "clinic", label: "Clinic", x: 16, y: 3, color: 0xffc1d3, accent: 0xb64c6b }
];
