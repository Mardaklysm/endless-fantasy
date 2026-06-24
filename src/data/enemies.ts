import type { ElementType, EnemyDef, EnemyMove } from "./gameDataTypes";

export const ENEMIES: Record<string, EnemyDef> = {
  slimebud: enemy("slimebud", "Slimebud", 22, 7, 1, 3, 9, 7, "earth", ["fire"], [], ["#579e54", "#83d078", "#e7ffe2"], "blob"),
  bristleRat: enemy("bristleRat", "Bristle Rat", 18, 8, 1, 6, 8, 8, "none", ["fire"], [], ["#665044", "#b98f68", "#fff0c9"], "beast"),
  greenWolf: enemy("greenWolf", "Green Wolf", 30, 11, 2, 12, 18, 16, "none", ["fire"], [], ["#31553a", "#84b86f", "#f6efc9"], "beast", [
    { name: "Pounce", kind: "damage", power: 8, status: "bleed", intent: "heavyAttack" }
  ]),
  bandit: enemy("bandit", "Bandit", 34, 12, 3, 8, 20, 24, "none", ["light"], [], ["#3d2a24", "#9c6a3d", "#ffe0a3"], "knight", [
    { name: "Dirty Cut", kind: "damage", power: 5, status: "bleed", intent: "attack" },
    { name: "Snatch Purse", kind: "steal", power: 8, intent: "stealGold" }
  ]),
  reefCrab: enemy("reefCrab", "Reef Crab", 44, 13, 9, 3, 34, 34, "ice", ["lightning", "fire"], ["ice"], ["#25566b", "#e08866", "#fff0bd"], "blob", [
    { name: "Shell Up", kind: "defend", power: 0, intent: "defend" }
  ]),
  pirate: enemy("pirate", "Pirate", 58, 17, 6, 9, 48, 58, "none", ["lightning"], [], ["#252031", "#c05b39", "#f2e3a4"], "knight", [
    { name: "Broadside", kind: "damage", power: 13, target: "all", intent: "heavyAttack" },
    { name: "Cutpurse", kind: "steal", power: 14, intent: "stealGold" }
  ]),
  jungleShaman: enemy("jungleShaman", "Jungle Shaman", 46, 13, 4, 10, 52, 44, "earth", ["fire"], ["earth"], ["#1b4932", "#62b66c", "#f0f6ad"], "crown", [
    { name: "Venom Chant", kind: "status", power: 5, status: "poison", target: "all", intent: "poison" },
    { name: "Moss Mend", kind: "heal", power: 24, intent: "heal" }
  ]),
  ashGolem: enemy("ashGolem", "Ash Golem", 78, 21, 14, 3, 82, 76, "fire", ["ice"], ["fire"], ["#211f22", "#8a6a55", "#ff8f3d"], "knight", [
    { name: "Gather Heat", kind: "charge", power: 10, intent: "charge" },
    { name: "Molten Slam", kind: "damage", power: 18, status: "burn", intent: "heavyAttack" }
  ]),
  seaSerpent: enemy("seaSerpent", "Sea Serpent", 72, 20, 7, 12, 74, 80, "ice", ["lightning"], ["ice"], ["#103c58", "#3ea6c9", "#d8ffff"], "serpent", [
    { name: "Venom Tide", kind: "status", power: 7, status: "poison", intent: "poison" },
    { name: "Coil Charge", kind: "charge", power: 9, intent: "charge" }
  ]),
  fieldImp: enemy("fieldImp", "Field Imp", 24, 9, 2, 7, 12, 11, "shadow", ["light"], ["shadow"], ["#5a3c84", "#b16ee4", "#f7df8a"], "beast", [
    { name: "Drowsy Pinch", kind: "status", power: 4, status: "sleep" }
  ]),
  thornWisp: enemy("thornWisp", "Thorn Wisp", 28, 10, 2, 8, 16, 14, "earth", ["fire"], ["earth"], ["#264d38", "#6bad57", "#d1ffc2"], "wing"),
  mossling: enemy("mossling", "Mossling", 34, 11, 4, 4, 18, 16, "earth", ["fire"], ["earth"], ["#315d35", "#78a95f", "#c9e87a"], "blob"),
  venomMoth: enemy("venomMoth", "Venom Moth", 25, 9, 2, 10, 20, 18, "wind", ["lightning"], ["earth"], ["#3d3358", "#a5dc65", "#f6ffc0"], "wing", [
    { name: "Poison Dust", kind: "status", power: 4, status: "poison", target: "all" }
  ]),
  pebbleGnawer: enemy("pebbleGnawer", "Pebble Gnawer", 32, 12, 5, 4, 22, 18, "earth", ["ice"], ["earth"], ["#574b3c", "#91806a", "#e1d4c1"], "beast"),
  caveBat: enemy("caveBat", "Cave Bat", 24, 10, 2, 12, 20, 17, "wind", ["lightning"], ["earth"], ["#24243d", "#766aa8", "#e2d9ff"], "wing"),
  ironBeetle: enemy("ironBeetle", "Iron Beetle", 38, 13, 7, 3, 25, 22, "earth", ["lightning"], ["earth"], ["#282d35", "#7f8d93", "#d7f3ff"], "knight"),
  cinderPup: enemy("cinderPup", "Cinder Pup", 42, 15, 5, 8, 34, 30, "fire", ["ice"], ["fire"], ["#4b1e18", "#d95832", "#ffce78"], "beast", [
    { name: "Cinder Snap", kind: "damage", power: 9, element: "fire" }
  ]),
  ashSprite: enemy("ashSprite", "Ash Sprite", 36, 13, 4, 11, 36, 34, "fire", ["ice"], ["fire"], ["#312842", "#d56c5c", "#ffd47d"], "wing", [
    { name: "Ash Flicker", kind: "damage", power: 12, element: "fire", target: "all" }
  ]),
  coalKnight: enemy("coalKnight", "Coal Knight", 52, 17, 8, 5, 44, 42, "fire", ["ice"], ["fire"], ["#18151d", "#74504a", "#ff7c3f"], "knight"),
  reefFang: enemy("reefFang", "Reef Fang", 48, 16, 6, 8, 42, 39, "ice", ["lightning"], ["ice"], ["#143b5f", "#3488b8", "#b8f8ff"], "beast"),
  bubbleEye: enemy("bubbleEye", "Bubble Eye", 39, 14, 4, 12, 43, 41, "ice", ["lightning"], ["ice"], ["#123d50", "#5ed2d8", "#f9ffff"], "blob", [
    { name: "Sleep Glare", kind: "status", power: 5, status: "sleep" }
  ]),
  drownedHusk: enemy("drownedHusk", "Drowned Husk", 55, 17, 7, 4, 48, 45, "shadow", ["light", "lightning"], ["ice"], ["#16383d", "#66888a", "#dce9df"], "knight"),
  skyMite: enemy("skyMite", "Sky Mite", 45, 17, 5, 14, 52, 48, "wind", ["lightning"], ["earth"], ["#273857", "#6ec1d9", "#f6ffff"], "wing"),
  galeHarpy: enemy("galeHarpy", "Gale Harpy", 56, 18, 6, 16, 60, 55, "wind", ["lightning"], ["earth"], ["#33415f", "#c59bdc", "#fff3b6"], "wing", [
    { name: "Screech", kind: "status", power: 4, status: "sleep", target: "all" }
  ]),
  glassRoc: enemy("glassRoc", "Glass Roc", 70, 20, 8, 10, 72, 64, "wind", ["lightning"], ["wind"], ["#1b3445", "#8de7ff", "#ffffff"], "wing"),
  eclipseShade: enemy("eclipseShade", "Eclipse Shade", 70, 22, 8, 12, 86, 80, "shadow", ["light"], ["shadow"], ["#161025", "#6d54a8", "#f4e8ff"], "blob", [
    { name: "Night Pulse", kind: "damage", power: 14, element: "shadow", target: "all" }
  ]),
  crownGuard: enemy("crownGuard", "Crown Guard", 88, 24, 12, 8, 94, 88, "shadow", ["light"], ["shadow"], ["#221621", "#8d668d", "#ffd76a"], "knight"),
  voidSerpent: enemy("voidSerpent", "Void Serpent", 82, 25, 9, 14, 104, 92, "shadow", ["light"], ["shadow"], ["#05070d", "#4e437f", "#c5ffe8"], "serpent", [
    { name: "Venom Star", kind: "status", power: 7, status: "poison" },
    { name: "Void Bite", kind: "damage", power: 18, element: "shadow" }
  ]),
  rootboundTroll: boss("rootboundTroll", "Rootbound Troll", 150, 17, 8, 5, 130, 90, "earth", ["fire"], ["earth"], ["#263b25", "#6aa753", "#d9ffae"], "beast", [
    { name: "Root Snare", kind: "status", power: 5, status: "sleep" },
    { name: "Stone Fist", kind: "damage", power: 15, element: "earth" }
  ]),
  emberTyrant: boss("emberTyrant", "Ember Tyrant", 220, 22, 10, 8, 210, 150, "fire", ["ice"], ["fire"], ["#3b1715", "#e45136", "#ffd15d"], "knight", [
    { name: "Flame Wall", kind: "damage", power: 18, element: "fire", target: "all" },
    { name: "Scorching Blade", kind: "damage", power: 22, element: "fire" }
  ]),
  tideOracle: boss("tideOracle", "Tide Oracle", 240, 21, 11, 10, 240, 165, "ice", ["lightning"], ["ice"], ["#0d3e5c", "#43b9d1", "#dbffff"], "crown", [
    { name: "Tideglass", kind: "damage", power: 20, element: "ice", target: "all" },
    { name: "Drowse Tide", kind: "status", power: 5, status: "sleep", target: "all" }
  ]),
  galeChimera: boss("galeChimera", "Gale Chimera", 285, 25, 12, 16, 310, 210, "wind", ["lightning"], ["wind"], ["#29334f", "#79e5dc", "#f8f6a9"], "wing", [
    { name: "Threefold Gale", kind: "damage", power: 21, element: "wind", target: "all" },
    { name: "Raking Horns", kind: "damage", power: 26, element: "none" }
  ]),
  eclipseCrown: boss("eclipseCrown", "Eclipse Crown", 430, 29, 14, 13, 0, 0, "shadow", ["light"], ["shadow"], ["#0a0610", "#543081", "#ffdf6d"], "crown", [
    { name: "Eclipse Edict", kind: "damage", power: 25, element: "shadow", target: "all" },
    { name: "Crownbreak", kind: "damage", power: 30, element: "shadow" },
    { name: "Black Lullaby", kind: "status", power: 6, status: "sleep", target: "all" }
  ])
};

export function enemy(
  id: string,
  name: string,
  maxHp: number,
  attack: number,
  defense: number,
  speed: number,
  xp: number,
  gold: number,
  element: ElementType,
  weak: ElementType[],
  resist: ElementType[],
  palette: string[],
  sprite: EnemyDef["sprite"],
  moves: EnemyMove[] = []
): EnemyDef {
  return {
    id,
    name,
    maxHp,
    attack,
    defense,
    speed,
    level: inferredEnemyLevel(maxHp, xp),
    xp,
    gold,
    element,
    weak,
    resist,
    palette,
    sprite,
    moves: [{ name: "Strike", kind: "attack", power: 0 }, ...moves]
  };
}

export function boss(
  id: string,
  name: string,
  maxHp: number,
  attack: number,
  defense: number,
  speed: number,
  xp: number,
  gold: number,
  element: ElementType,
  weak: ElementType[],
  resist: ElementType[],
  palette: string[],
  sprite: EnemyDef["sprite"],
  moves: EnemyMove[]
): EnemyDef {
  return { ...enemy(id, name, maxHp, attack, defense, speed, xp, gold, element, weak, resist, palette, sprite, moves), level: inferredEnemyLevel(maxHp, xp, true), boss: true };
}

function inferredEnemyLevel(maxHp: number, xp: number, boss = false) {
  const pressure = Math.max(xp, Math.floor(maxHp * 0.75));
  const level = Math.max(1, Math.ceil(pressure / 28));
  return boss ? Math.max(3, level + 1) : level;
}
