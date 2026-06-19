# Crystal Oath: Dawn of the Four Stars

An original retro 2D top-down turn-based fantasy RPG set in Asterra. Three travelers from Dawnford restore four Star Relics, unlock old travel routes, and confront the Eclipse Crown.

## Technology Choice

This project uses Phaser 3 with TypeScript and Vite. Phaser handles the browser game loop, canvas rendering, keyboard input, scaling, and pixel-art presentation cleanly, while TypeScript keeps the RPG data tables and battle state safer to evolve. Vite provides a small local dev/build workflow.

Final/generated-first art assets now live under `assets/` and `assets_v2/` and are loaded by Phaser at startup. The game renders PNG/JPEG assets for dungeon tiles/objects, town props, overworld markers, battle backgrounds, portraits, enemies, title decoration/logo, UI cursors, HP bars, and normalized fighter/priest/wizard class sprite sheets. Code-generated fallback art remains in place so the game stays playable if an image is missing or fails to load.

No external sound, fonts, maps, music, asset packs, or copyrighted material are used. Audio is still synthesized in code.

## How To Run

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Open the printed local URL, usually:

```text
http://127.0.0.1:5173
```

Create a production build:

```bash
npm run build
```

Run the world-generation validation:

```bash
npm test
```

## Controls

- Arrow keys or WASD: move and menu selection
- Enter, Space, or Z: confirm
- Escape or X: cancel or open menu
- Shift: move faster while exploring
- M: mute
- F: fullscreen
- F9: hidden debug menu for testing

## Saving

The game saves to `localStorage`. You can save from the menu on the overworld or in towns, at inns, with tents, and through autosaves when entering major locations and after boss progress.

## Gameplay Summary

- Three-character party: Arlen, Mira, and Kael
- Seeded procedural overworld with classic tileset terrain, towns, dungeons, roads, rivers, bridges, and random encounters
- Five dungeons: Moss Cave, Ashen Keep, Tide Shrine, Skyglass Tower, and Eclipse Spire
- Turn-based battles with Attack, Magic, Item, Defend, and Run commands
- Individual initiative turns, status effects, elemental weaknesses, boss fights, XP/gold, level-ups, equipment, shops, inns, clinics, and magic shops
- Quality-of-life settings for encounter toggle, XP multiplier, fast text, mute, and debug testing

## Credits

All code, art, and audio are procedurally generated or created inside this project. No external assets.

## Known Limitations

- The game is intentionally compact and built for a 30-60 minute browser playthrough.
- Mouse menu support is minimal; keyboard is the primary input.
- The production bundle is large because Phaser is bundled into the app.

## Manual Test Checklist

- Title screen appears and New Game starts in Dawnford.
- Intro dialogue advances with Enter/Z.
- Player moves smoothly with keyboard and can exit town through the south gate.
- Menu opens with Escape and Settings can toggle encounters and XP multiplier.
- Random or debug encounters enter battle.
- Battle shows one current actor at a time; party actions resolve immediately and enemies act on initiative turns.
- Magic and items consume resources and affect valid targets.
- Inn restores HP/spell charges and saves.
- Shops can buy items, gear, and spells.
- Dungeons contain chests, a switch gate, stairs, random encounters, and bosses.
- Boss victory sets relic flags and unlocks later travel/progression.
- Save/load restores party, inventory, generated world seed, position, settings, flags, and opened chests.
