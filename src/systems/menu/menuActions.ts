import { WORLD_TABLES } from "../../data/battleTables";
import type { CharacterState, GearDef, ServiceKind, TownDef } from "../../data/gameDataTypes";
import { ARMORS, GEAR, WEAPONS } from "../../data/gear";
import { ITEMS } from "../../data/items";
import { SPELLS } from "../../data/spells";
import { TOWN_SERVICES } from "../../data/towns";
import type { MenuOption, Mode } from "../../scene/sceneTypes";
import { wrap } from "../world/worldMath";
import type { CrystalOathSceneContext } from "../../scene/sceneContext";

export function rememberMenuReturnMode(this: CrystalOathSceneContext) {
  if (this.mode !== "menu" && this.mode !== "dialogue") this.previousMode = this.mode;
}

export function openMainMenu(this: CrystalOathSceneContext) {
  this.rememberMenuReturnMode();
  this.openMenu(
    "Menu",
    [
      { label: "Status", action: () => this.openStatusMenu() },
      { label: "Items", action: () => this.openItemsMenu() },
      { label: "Magic", action: () => this.openFieldMagicMenu() },
      { label: "Equipment", action: () => this.openEquipmentMenu() },
      {
        label: "Save",
        action: () => {
          this.saveGame();
          this.flashMessage("Game saved.");
        },
        disabled: () => this.previousMode === "dungeon"
      },
      { label: "Settings", action: () => this.openSettingsMenu() },
      { label: "Controls", action: () => this.showControls("menu") },
      {
        label: "Quit to Title",
        action: () => {
          this.menu = undefined;
          this.mode = "title";
          this.audio.setMode("title");
        }
      },
      { label: "Close", action: () => this.closeMenu() }
    ],
    () => this.closeMenu(),
    () => `Gold ${this.gold} | Relics ${this.relicCount()}/4 | Encounters ${this.settings.encounters ? "ON" : "OFF"}`
  );
}

export function openStatusMenu(this: CrystalOathSceneContext) {
  this.openMenu(
    "Status",
    (this.party.map((c) => ({
      label: () => `${c.name} Lv${c.level} HP ${c.hp}/${c.maxHp} XP ${c.xp}/${c.nextXp}`,
      action: () => this.say([this.characterSheet(c)], () => this.openStatusMenu())
    })) as MenuOption[]).concat([{ label: "Back", action: () => this.openMainMenu() }]),
    () => this.openMainMenu(),
    "All characters receive XP by default, a forgiving modern convenience."
  );
}

export function characterSheet(this: CrystalOathSceneContext, c: CharacterState): string {
  const statuses = Object.keys(c.statuses).length ? Object.keys(c.statuses).join(", ") : "none";
  return `${c.name}, ${c.role}
Level ${c.level}
HP ${c.hp}/${c.maxHp}
Attack ${this.attackPower(c)}  Defense ${this.defensePower(c)}
Speed ${c.speed}  Luck ${c.luck}
Weapon ${WEAPONS[c.weapon].name}
Armor ${ARMORS[c.armor].name}
Statuses: ${statuses}`;
}

export function openItemsMenu(this: CrystalOathSceneContext) {
  const options: MenuOption[] = Object.keys(ITEMS)
    .filter((id) => (this.inventory[id] ?? 0) > 0)
    .map((id) => ({
      label: () => `${ITEMS[id].name} x${this.inventory[id]} - ${ITEMS[id].description}`,
      action: () => this.openFieldItemTargets(id)
    }));
  options.push({ label: "Back", action: () => this.openMainMenu() });
  this.openMenu("Items", options, () => this.openMainMenu(), "Potions, antidotes, ash, etherleaf, and tents can be used outside battle.");
}

export function openFieldItemTargets(this: CrystalOathSceneContext, itemId: string) {
  const item = ITEMS[itemId];
  if (!item.field) {
    this.flashMessage(item.battle ? "That item is for battle." : `${item.name} is a key item.`);
    return;
  }
  if (itemId === "tent") {
    if (this.previousMode === "town") {
      this.flashMessage("Use tents on the road or in safe dungeon rooms.");
      return;
    }
    this.inventory.tent -= 1;
    for (const c of this.party) {
      if (c.hp > 0) c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * 0.55));
    }
    this.saveGame();
    this.say(["The party rests under a small canvas roof. HP partly restored and game saved."], () => this.openItemsMenu());
    return;
  }
  if (itemId === "etherleaf") {
    this.inventory.etherleaf -= 1;
    for (const c of this.party) {
      for (const tier of ["1", "2", "3"]) c.charges[tier].current = Math.min(c.charges[tier].max, c.charges[tier].current + 1);
    }
    this.say(["Etherleaf restores one charge in every spell tier."], () => this.openItemsMenu());
    return;
  }
  this.openMenu(
    `Use ${item.name}`,
    this.party.map((c, idx) => ({
      label: `${c.name} HP ${c.hp}/${c.maxHp}`,
      action: () => {
        if ((this.inventory[itemId] ?? 0) <= 0) return;
        this.inventory[itemId] -= 1;
        if (itemId === "potion") c.hp = Math.min(c.maxHp, c.hp + 35);
        if (itemId === "antidote") delete c.statuses.poison;
        if (itemId === "phoenixAsh" && c.hp <= 0) {
          c.hp = Math.floor(c.maxHp * 0.35);
          c.statuses = {};
        }
        if (itemId === "phoenixAsh" && c.hp > 0 && idx >= 0) this.flashMessage("Phoenix Ash needs a fallen ally.");
        this.openItemsMenu();
      }
    })).concat([{ label: "Back", action: () => this.openItemsMenu() }]),
    () => this.openItemsMenu()
  );
}

export function openFieldMagicMenu(this: CrystalOathSceneContext) {
  const casters = this.party.filter((c) => c.spells.length > 0);
  this.openMenu(
    "Magic",
    casters.map((c) => ({
      label: `${c.name} (${Object.values(c.charges).map((v, i) => `T${i + 1} ${v.current}/${v.max}`).join(" ")})`,
      action: () => this.openFieldSpells(c)
    })).concat([{ label: "Back", action: () => this.openMainMenu() }]),
    () => this.openMainMenu()
  );
}

export function openFieldSpells(this: CrystalOathSceneContext, caster: CharacterState) {
  const spells = caster.spells.filter((id) => ["heal", "revive", "buff"].includes(SPELLS[id].kind) && caster.level >= SPELLS[id].minLevel);
  this.openMenu(
    `${caster.name} Magic`,
    (spells.map((id) => ({
      label: () => `${SPELLS[id].name} T${SPELLS[id].tier} (${caster.charges[String(SPELLS[id].tier)].current}) - ${SPELLS[id].description}`,
      action: () => this.openFieldSpellTargets(caster, id),
      disabled: () => caster.charges[String(SPELLS[id].tier)].current <= 0
    })) as MenuOption[]).concat([{ label: "Back", action: () => this.openFieldMagicMenu() }]),
    () => this.openFieldMagicMenu()
  );
}

export function openFieldSpellTargets(this: CrystalOathSceneContext, caster: CharacterState, spellId: string) {
  const spell = SPELLS[spellId];
  const charge = caster.charges[String(spell.tier)];
  if (charge.current <= 0) return;
  if (spell.target === "allAllies") {
    charge.current -= 1;
    for (const c of this.party.filter((p) => p.hp > 0)) {
      if (spell.kind === "heal") c.hp = Math.min(c.maxHp, c.hp + spell.power + caster.level * 4);
      if (spell.id === "starveil") c.statuses.starveil = 4;
    }
    this.say([`${caster.name} casts ${spell.name}.`], () => this.openFieldMagicMenu());
    return;
  }
  this.openMenu(
    spell.name,
    this.party.map((target) => ({
      label: `${target.name} HP ${target.hp}/${target.maxHp}`,
      action: () => {
        charge.current -= 1;
        if (spell.kind === "heal" && target.hp > 0) target.hp = Math.min(target.maxHp, target.hp + spell.power + caster.level * 4);
        if (spell.kind === "revive" && target.hp <= 0) {
          target.hp = Math.floor(target.maxHp * 0.35);
          target.statuses = {};
        }
        if (spell.kind === "buff") target.statuses.ward = 4;
        this.openFieldMagicMenu();
      }
    })).concat([{ label: "Back", action: () => this.openFieldSpells(caster) }]),
    () => this.openFieldSpells(caster)
  );
}

export function openEquipmentMenu(this: CrystalOathSceneContext) {
  const options: MenuOption[] = [];
  for (const c of this.party) {
    options.push({ label: `${c.name} weapon: ${WEAPONS[c.weapon].name}`, action: () => this.openEquipList(c, "weapon") });
    options.push({ label: `${c.name} armor: ${ARMORS[c.armor].name}`, action: () => this.openEquipList(c, "armor") });
  }
  options.push({ label: "Back", action: () => this.openMainMenu() });
  this.openMenu("Equipment", options, () => this.openMainMenu(), "Bought and treasure gear is kept in the party pack.");
}

export function openEquipList(this: CrystalOathSceneContext, member: CharacterState, kind: GearDef["kind"]) {
  const pool = Object.keys(this.gearBag).filter((id) => this.gearBag[id] > 0 && GEAR[id].kind === kind && GEAR[id].users.includes(member.id));
  this.openMenu(
    `${member.name} ${kind}`,
    pool.map((id) => ({
      label: `${GEAR[id].name} +${GEAR[id].power} (${this.gearBag[id]})`,
      action: () => {
        member[kind] = id;
        this.openEquipmentMenu();
      }
    })).concat([{ label: "Back", action: () => this.openEquipmentMenu() }]),
    () => this.openEquipmentMenu()
  );
}

export function openSettingsMenu(this: CrystalOathSceneContext) {
  this.openMenu(
    "Settings",
    [
      {
        label: () => `Random Encounters: ${this.settings.encounters ? "ON" : "OFF"}`,
        action: () => {
          this.settings.encounters = !this.settings.encounters;
          this.openSettingsMenu();
        }
      },
      {
        label: () => `XP Multiplier: ${this.settings.xpMultiplier}x`,
        action: () => {
          this.settings.xpMultiplier = this.settings.xpMultiplier === 1 ? 2 : this.settings.xpMultiplier === 2 ? 4 : 1;
          this.openSettingsMenu();
        }
      },
      {
        label: () => `Fast Text: ${this.settings.fastText ? "ON" : "OFF"}`,
        action: () => {
          this.settings.fastText = !this.settings.fastText;
          this.openSettingsMenu();
        }
      },
      {
        label: () => `Mute: ${this.settings.muted ? "ON" : "OFF"}`,
        action: () => {
          this.settings.muted = !this.settings.muted;
          this.audio.setMuted(this.settings.muted);
          this.openSettingsMenu();
        }
      },
      { label: "Back", action: () => this.openMainMenu() }
    ],
    () => this.openMainMenu()
  );
}

export function openDebugMenu(this: CrystalOathSceneContext) {
  this.rememberMenuReturnMode();
  this.openMenu(
    "Debug",
    [
      {
        label: "Give 500 gold",
        action: () => {
          this.gold += 500;
          this.openDebugMenu();
        }
      },
      {
        label: "Heal party",
        action: () => {
          this.restoreParty(true);
          this.openDebugMenu();
        }
      },
      {
        label: "Start encounter",
        action: () => this.startRandomBattle(WORLD_TABLES.plains)
      },
      {
        label: () => `Semantic overlay: ${this.semanticDebugOverlay}`,
        action: () => {
          this.cycleSemanticDebugOverlay();
          this.openDebugMenu();
        }
      },
      {
        label: "Toggle relics",
        action: () => {
          const all = this.hasAllRelics();
          this.flags.relics = { root: !all, flame: !all, tide: !all, gale: !all };
          this.flags.boat = !all;
          this.flags.skyship = !all;
          this.flags.gateOpen = !all;
          this.flags.travel.unlockedIsland2 = true;
          this.flags.travel.unlockedIsland3 = !all;
          this.flags.travel.unlockedFrostmere = !all;
          this.flags.travel.unlockedHighspire = !all;
          this.openDebugMenu();
        }
      },
      { label: "Back", action: () => this.closeMenu() }
    ],
    () => this.closeMenu(),
    "Hidden F9 menu for testing."
  );
}

export function openInn(this: CrystalOathSceneContext, town: TownDef) {
  this.openMenu(
    `${town.name} Inn`,
    [
      {
        label: `Rest and save (${town.innPrice} gold)`,
        action: () => {
          if (this.gold < town.innPrice) {
            this.flashMessage("Not enough gold.");
            return;
          }
          this.gold -= town.innPrice;
          this.restoreParty(true);
          this.saveGame();
          this.say(["The party rests. HP and spell charges restored. Game saved."], () => {
            this.closeMenuTo("town");
          });
        }
      },
      { label: "Leave", action: () => this.closeMenuTo("town") }
    ],
    () => this.closeMenuTo("town")
  );
}

export function openClinic(this: CrystalOathSceneContext, town: TownDef) {
  this.openMenu(
    `${town.name} Clinic`,
    this.party.map((c) => ({
      label: `${c.name} ${c.hp > 0 ? "standing" : "fallen"} (${town.clinicPrice} gold)`,
      action: () => {
        if (c.hp > 0) {
          this.flashMessage("They are already standing.");
          return;
        }
        if (this.gold < town.clinicPrice) {
          this.flashMessage("Not enough gold.");
          return;
        }
        this.gold -= town.clinicPrice;
        c.hp = Math.floor(c.maxHp * 0.5);
        c.statuses = {};
        this.openClinic(town);
      }
    })).concat([{ label: "Leave", action: () => this.closeMenuTo("town") }]),
    () => this.closeMenuTo("town")
  );
}

export function openShop(this: CrystalOathSceneContext, title: string, stock: { id: string; type: "item" | "gear" }[]) {
  this.openMenu(
    title,
    (stock.map((entry) => ({
      label: () => {
        if (entry.type === "item") return `${ITEMS[entry.id].name} ${ITEMS[entry.id].price}g - ${ITEMS[entry.id].description}`;
        return `${GEAR[entry.id].name} ${GEAR[entry.id].price}g - ${GEAR[entry.id].description}`;
      },
      action: () => {
        const price = entry.type === "item" ? ITEMS[entry.id].price : GEAR[entry.id].price;
        if (this.gold < price) {
          this.flashMessage("Not enough gold.");
          return;
        }
        this.gold -= price;
        if (entry.type === "item") this.inventory[entry.id] = (this.inventory[entry.id] ?? 0) + 1;
        else this.gearBag[entry.id] = (this.gearBag[entry.id] ?? 0) + 1;
        this.openShop(title, stock);
      }
    })) as MenuOption[]).concat([{ label: "Leave", action: () => this.closeMenuTo("town") }]),
    () => this.closeMenuTo("town"),
    () => `Gold ${this.gold}`
  );
}

export function openMagicShop(this: CrystalOathSceneContext, town: TownDef) {
  this.openMenu(
    `${town.name} Magic`,
    (town.spellStock.map((id) => ({
      label: () => `${SPELLS[id].name} ${SPELLS[id].price}g - ${SPELLS[id].description}`,
      action: () => {
        const spell = SPELLS[id];
        const learner = this.party.find((c) => c.id === spell.caster);
        if (!learner) return;
        if (learner.spells.includes(id)) {
          this.flashMessage("Already learned.");
          return;
        }
        if (this.gold < spell.price) {
          this.flashMessage("Not enough gold.");
          return;
        }
        this.gold -= spell.price;
        learner.spells.push(id);
        this.openMagicShop(town);
      }
    })) as MenuOption[]).concat([{ label: "Leave", action: () => this.closeMenuTo("town") }]),
    () => this.closeMenuTo("town"),
    () => `Gold ${this.gold}`
  );
}

export function showControls(this: CrystalOathSceneContext, returnTo: "title" | "menu") {
  const done = () => {
    if (returnTo === "title") this.mode = "title";
    else this.openMainMenu();
  };
  this.say(
    [
      "Controls: Arrow keys or WASD move and select. Enter, Space, or Z confirms.",
      "Escape or X cancels and opens the menu. Shift moves faster while exploring.",
      "M toggles mute. F toggles fullscreen. F6 cycles semantic overlays. F9 opens a hidden debug menu."
    ],
    done
  );
}

export function restoreParty(this: CrystalOathSceneContext, fullCharges: boolean) {
  for (const c of this.party) {
    c.hp = c.maxHp;
    delete c.statuses.poison;
    delete c.statuses.sleep;
    if (fullCharges) this.refreshCharges(c, true);
  }
}

export function say(this: CrystalOathSceneContext, lines: string[], done?: () => void) {
  this.clearHeldMovement();
  const returnMode = this.mode;
  if (returnMode !== "dialogue" && returnMode !== "menu") this.previousMode = returnMode;
  this.dialogue = {
    lines,
    index: 0,
    done: done ?? (() => {
      this.mode = returnMode === "dialogue" ? this.previousMode : returnMode;
    })
  };
  this.mode = "dialogue";
  this.markDirty();
}

export function flashMessage(this: CrystalOathSceneContext, message: string) {
  const returnMode = this.mode;
  this.say([message], () => {
    this.mode = returnMode;
  });
}

export function openMenu(this: CrystalOathSceneContext, title: string, options: MenuOption[], cancel: () => void, footer?: string | (() => string)) {
  this.rememberMenuReturnMode();
  this.clearHeldMovement();
  this.menu = { title, options, selected: 0, cancel, footer };
  this.mode = "menu";
  this.markDirty();
}

export function closeMenu(this: CrystalOathSceneContext) {
  this.mode = this.menuReturnMode();
  this.menu = undefined;
  this.markDirty();
}

export function closeMenuTo(this: CrystalOathSceneContext, mode: Mode) {
  this.mode = mode;
  this.menu = undefined;
  if (mode !== "menu" && mode !== "dialogue") this.previousMode = mode;
  this.markDirty();
}

export function menuReturnMode(this: CrystalOathSceneContext): Mode {
  if (this.previousMode === "menu" || this.previousMode === "dialogue") {
    return this.generatedWorld ? "world" : "title";
  }
  return this.previousMode;
}

export function adjustMenu(this: CrystalOathSceneContext, delta: number) {
  if (!this.menu) return;
  const total = this.menu.options.length;
  this.menu.selected = wrap(this.menu.selected + delta, total);
  this.audio.blip("confirm");
}

export function adjustTitle(this: CrystalOathSceneContext, delta: number) {
  this.titleSelected = wrap(this.titleSelected + delta, this.titleOptions.length);
  this.audio.blip("confirm");
}

export function serviceAt(this: CrystalOathSceneContext, x: number, y: number): ServiceKind | undefined {
  return TOWN_SERVICES.find((z) => Math.abs(z.x - x) + Math.abs(z.y - y) <= 1)?.kind;
}

export function relicCount(this: CrystalOathSceneContext): number {
  return Object.values(this.flags.relics).filter(Boolean).length;
}
