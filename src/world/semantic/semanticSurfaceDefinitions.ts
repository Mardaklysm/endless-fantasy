import type { Rgb, SurfaceColorProfile, SurfaceDefinition, SurfaceRole, SurfaceTransitionClass } from "./semanticTypes.ts";
import type { SemanticMaskTerrainClass } from "./semanticMaskTerrainRenderer.ts";

// ---------------------------------------------------------------------------
// Surface Definitions
// ---------------------------------------------------------------------------
// Every terrain class gets a metadata-driven SurfaceDefinition. Transition
// and blending code inspects roles / transitionClass / profiles — never the
// texture asset, filename, or visual-material name.
// ---------------------------------------------------------------------------

const WATER_ROLES: SurfaceRole[] = ["water"];
const LAND_ROLES: SurfaceRole[] = ["land"];
const SHORELINE_ROLES: SurfaceRole[] = ["land", "shoreline-capable"];
const ROUTE_ROLES: SurfaceRole[] = ["route"];
const CLIFF_ROLES: SurfaceRole[] = ["land", "cliff"];
const LAND_LOOSE_ROLES: SurfaceRole[] = ["land", "shoreline-capable"];

export const SURFACE_DEFINITIONS: Record<SemanticMaskTerrainClass, SurfaceDefinition> = {
  deepOcean: {
    id: "deepOcean",
    roles: ["water", "deep"],
    transitionClass: "liquid",
    colors: { fill: [12, 54, 92], edge: [12, 54, 92], shallowEdge: [93, 196, 213], foam: [234, 251, 237] },
    allowVariants: false
  },
  shallowWater: {
    id: "shallowWater",
    roles: ["water", "shallow"],
    transitionClass: "liquid",
    colors: {
      fill: [52, 149, 179],
      edge: [52, 149, 179],
      shallowEdge: [93, 196, 213],
      foam: [234, 251, 237],
      wetBlend: [178, 146, 86]
    },
    allowVariants: false
  },
  freshWater: {
    id: "freshWater",
    roles: ["water", "fresh"],
    transitionClass: "liquid",
    colors: { fill: [54, 147, 183], edge: [54, 147, 183], shallowEdge: [93, 196, 213], foam: [234, 251, 237] },
    allowVariants: false
  },
  road: {
    id: "road",
    roles: ["route"],
    transitionClass: "route",
    colors: { fill: [214, 169, 103], edge: [159, 120, 67] },
    allowVariants: false,
    transitionProfile: { noiseStrength: 0.08, edgeSoftness: 0.12 }
  },
  beach: {
    id: "beach",
    roles: ["land", "shoreline-capable"],
    transitionClass: "loose",
    colors: {
      fill: [202, 158, 87],
      edge: [202, 158, 87],
      wetBlend: [178, 146, 86],
      foam: [234, 251, 237]
    },
    allowVariants: true,
    variantMaxAlpha: 0.7,
    shorelineProfile: {
      foamWidth: 1,
      wetBlendWidth: 2,
      noiseStrength: 0.08,
      accentColors: { foam: [234, 251, 237], wetBlend: [178, 146, 86], shallowEdge: [93, 196, 213] }
    }
  },
  grassland: {
    id: "grassland",
    roles: ["land"],
    transitionClass: "organic",
    colors: { fill: [70, 138, 58], edge: [70, 138, 58], wetBlend: [178, 146, 86] },
    allowVariants: true,
    variantMaxAlpha: 0.68,
    transitionProfile: { noiseStrength: 0.12, edgeSoftness: 0.16 }
  },
  sand: {
    id: "sand",
    roles: ["land", "shoreline-capable"],
    transitionClass: "loose",
    colors: {
      fill: [167, 129, 66],
      edge: [167, 129, 66],
      wetBlend: [178, 146, 86],
      foam: [234, 251, 237]
    },
    allowVariants: true,
    variantMaxAlpha: 0.7,
    shorelineProfile: {
      foamWidth: 1,
      wetBlendWidth: 2,
      noiseStrength: 0.08,
      accentColors: { foam: [234, 251, 237], wetBlend: [178, 146, 86], shallowEdge: [93, 196, 213] }
    }
  },
  ash: {
    id: "ash",
    roles: ["land", "shoreline-capable"],
    transitionClass: "loose",
    colors: {
      fill: [68, 62, 56],
      edge: [68, 62, 56],
      wetBlend: [178, 146, 86],
      foam: [234, 251, 237]
    },
    allowVariants: true,
    variantMaxAlpha: 0.82,
    shorelineProfile: {
      foamWidth: 1,
      wetBlendWidth: 2,
      noiseStrength: 0.08,
      accentColors: { foam: [234, 251, 237], wetBlend: [178, 146, 86], shallowEdge: [93, 196, 213] }
    }
  },
  ice: {
    id: "ice",
    roles: ["land", "snow"],
    transitionClass: "solid",
    colors: { fill: [134, 190, 207], edge: [134, 190, 207], accent: [231, 251, 252], wetBlend: [231, 251, 252] },
    allowVariants: true,
    variantMaxAlpha: 0.76,
    transitionProfile: { noiseStrength: 0.1, edgeSoftness: 0.14 }
  }
};

// ---------------------------------------------------------------------------
// Query helpers — these are the ONLY way transition code inspects surface
// identity. They work purely on metadata, never on texture assets.
// ---------------------------------------------------------------------------

export function surfaceDefinitionFor(id: string): SurfaceDefinition | undefined {
  return SURFACE_DEFINITIONS[id as SemanticMaskTerrainClass];
}

export function surfaceHasRole(id: string | number, role: SurfaceRole): boolean {
  const className = typeof id === "number" ? classNameForNumericId(id) : id;
  const def = surfaceDefinitionFor(className);
  return def?.roles.includes(role) ?? false;
}

export function surfaceTransitionClass(id: string | number): SurfaceTransitionClass | undefined {
  const className = typeof id === "number" ? classNameForNumericId(id) : id;
  return surfaceDefinitionFor(className)?.transitionClass;
}

export function surfaceColors(id: string | number): SurfaceColorProfile | undefined {
  const className = typeof id === "number" ? classNameForNumericId(id) : id;
  return surfaceDefinitionFor(className)?.colors;
}

export function surfaceVariantMaxAlpha(id: string | number): number {
  const className = typeof id === "number" ? classNameForNumericId(id) : id;
  return surfaceDefinitionFor(className)?.variantMaxAlpha ?? 0.68;
}

export function surfaceAllowsVariants(id: string | number): boolean {
  const className = typeof id === "number" ? classNameForNumericId(id) : id;
  return surfaceDefinitionFor(className)?.allowVariants ?? true;
}

export function surfaceShorelineProfile(id: string | number): SurfaceDefinition["shorelineProfile"] | undefined {
  const className = typeof id === "number" ? classNameForNumericId(id) : id;
  return surfaceDefinitionFor(className)?.shorelineProfile;
}

export function surfaceHasShorelineProfile(id: string | number): boolean {
  return !!surfaceShorelineProfile(id);
}

// ---------------------------------------------------------------------------
// Boundary classification — metadata-driven, never inspects texture assets.
// ---------------------------------------------------------------------------

export type MetadataBoundaryKind =
  | "waterDeepShallow"
  | "waterShoreline"
  | "waterLand"
  | "routeBoundary"
  | "genericLand";

export interface MetadataBoundary {
  kind: MetadataBoundaryKind;
  waterSide?: string;
  landSide?: string;
  waterIsDeep?: boolean;
}

const TERRAIN_CLASS_NAMES = ["deepOcean", "shallowWater", "freshWater", "road", "beach", "grassland", "sand", "ash", "ice"] as const;

function classNameForNumericId(value: number): SemanticMaskTerrainClass {
  return TERRAIN_CLASS_NAMES[value] ?? "deepOcean";
}

/**
 * Classify a boundary between two terrain classes using ONLY surface-definition
 * metadata (roles, transitionClass). Never inspects texture assets, filenames,
 * or visual-material names.
 */
export function classifyBoundary(a: string | number, b: string | number): MetadataBoundary | undefined {
  if (a === b) return undefined;
  const classA = typeof a === "number" ? classNameForNumericId(a) : a;
  const classB = typeof b === "number" ? classNameForNumericId(b) : b;
  const defA = surfaceDefinitionFor(classA);
  const defB = surfaceDefinitionFor(classB);
  if (!defA || !defB) return undefined;

  const aIsWater = defA.roles.includes("water");
  const bIsWater = defB.roles.includes("water");
  const aIsRoute = defA.transitionClass === "route";
  const bIsRoute = defB.transitionClass === "route";

  // Route boundary: road vs anything non-route
  if (aIsRoute !== bIsRoute) {
    return {
      kind: "routeBoundary",
      landSide: aIsRoute ? classB : classA
    };
  }

  // Water ↔ land boundaries
  if (aIsWater !== bIsWater) {
    const waterClass = aIsWater ? classA : classB;
    const landClass = aIsWater ? classB : classA;
    const landDef = aIsWater ? defB : defA;
    const waterIsDeep = (aIsWater ? defA : defB).roles.includes("deep");

    // Water ↔ shoreline-capable land → shoreline
    if (landDef.roles.includes("shoreline-capable")) {
      return {
        kind: "waterShoreline",
        waterSide: waterClass,
        landSide: landClass,
        waterIsDeep
      };
    }

    // Water ↔ non-shoreline land → generic water-land boundary
    return {
      kind: "waterLand",
      waterSide: waterClass,
      landSide: landClass,
      waterIsDeep
    };
  }

  // Water sub-type boundaries (both water, different sub-types).
  // freshWater flowing into deep/shallow ocean is a continuous water body —
  // only deep↔shallow creates a visible transition.
  if (aIsWater && bIsWater) {
    if ((defA.roles.includes("deep") && defB.roles.includes("shallow")) ||
        (defB.roles.includes("deep") && defA.roles.includes("shallow"))) {
      return { kind: "waterDeepShallow", waterSide: defA.roles.includes("shallow") ? classA : classB };
    }
  }

  // Generic land-land boundary
  return { kind: "genericLand" };
}
