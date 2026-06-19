export type WorldgenMode = "generic10x10" | "classicIsland";

export const DEFAULT_WORLDGEN_MODE: WorldgenMode = "classicIsland";

export function parseWorldgenMode(value: string | null | undefined): WorldgenMode | undefined {
  if (value === "generic" || value === "generic10x10" || value === "atlas10x10") return "generic10x10";
  if (value === "classic" || value === "classicIsland" || value === "classic-island") return "classicIsland";
  return undefined;
}

export function resolveWorldgenMode(search = globalThis.location?.search ?? ""): WorldgenMode {
  const params = new URLSearchParams(search);
  return parseWorldgenMode(params.get("worldgen")) ?? DEFAULT_WORLDGEN_MODE;
}
