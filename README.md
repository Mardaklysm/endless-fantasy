# Crystal Oath: Dawn of the Four Stars

An original retro 2D top-down turn-based fantasy RPG set in Asterra. Three travelers begin on Greenhaven, cross a seeded island archipelago by harbor boat, restore four Star Relics, and confront the Eclipse Crown.

## Technology Choice

This project uses Phaser 3 with TypeScript and Vite. Phaser handles the browser game loop, canvas rendering, keyboard input, scaling, and pixel-art presentation cleanly, while TypeScript keeps the RPG data tables and battle state safer to evolve. Vite provides a small local dev/build workflow.

Runtime art assets live under `src/assets/` and are loaded by Phaser at startup. Source/reference-only material lives under `src/assets/source/` and is excluded from runtime preloading. The game renders a crisp semantic mask overworld background using individual PNG terrain fills, PNG/JPEG world object overlays, individual dungeon tile images, authored POI scenes, markers, battle backgrounds, portraits, enemies, title screen art, UI, effects, icons, and normalized fighter/priest/wizard class sprite sheets. Code-generated fallback art remains in place so the game stays playable if an image is missing or fails to load.

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
- F6: cycle semantic world debug overlays, including edge debug, raw square tiles, semantic masks, distance bands, walkability, overlay policy, mountain candidates, forests, island themes, POIs, roads, and rivers
- F9: hidden debug menu for testing

## Saving

The game saves to `localStorage`. You can save from the menu on the overworld, at POI inns, with tents, and through autosaves when entering major locations and after boss progress.

## Gameplay Summary

- Three-character party: Arlen, Mira, and Kael
- Seeded semantic archipelago overworld using generated land/water masks, island IDs, coast bands, grass/sand/ice biomes, walkability, overlay collision policy, road/river data, and POIs. Normal gameplay renders a crisp mask-based terrain background from the semantic fields, using individual PNG terrain fills with pixel-step coast and biome boundary accents. Objects stay separate, while road/river graph strokes are debug-only until they have proper art.
- Individual dungeon tile PNGs under `src/assets/world/dungeon_tiles/` for medieval stone, cave, ice, ruin, volcanic, cursed, chest, gate, switch, stair, and boss-seal tiles
- Four major themed islands: Greenhaven, Coralreach, Frostmere, and Highspire, with deterministic world seeds and harbor travel between charted routes
- Procedural room-and-corridor dungeons derived from the world seed and dungeon id
- Turn-based battles with Attack, Skill, Magic, Item, Defend, and Run commands
- Individual initiative turns, visible enemy intents, cooldown skills, status effects, elemental weaknesses, boss fights, XP/gold, drops, level-ups, equipment, authored POI shops, inns, churches, and magic shops
- Quality-of-life settings for encounter toggle, XP multiplier, fast text, mute, and debug testing

## Credits

All code, art, and audio are procedurally generated or created inside this project. No external assets.

## Known Limitations

- The game is intentionally compact and built for a 30-60 minute browser playthrough.
- Mouse menu support is minimal; keyboard is the primary input.
- The production bundle is large because Phaser is bundled into the app.

## Manual Test Checklist

- Title screen appears and New Game starts in Greenhaven.
- Intro dialogue advances with Enter/Z.
- Player moves smoothly with keyboard, starts inside the authored Greenhaven POI, and can return to the ocean-based archipelago overworld.
- Normal overworld terrain is mask-rendered, not square atlas tiles; coast and biome boundaries should read as pixel-crisp organic masks rather than a hard tile grid. F6 `rawTiles` shows the square atlas debug view, and F6 `roads` / `rivers` show the semantic graph lines.
- Menu opens with Escape and Settings can toggle encounters and XP multiplier.
- Random or debug encounters enter battle.
- Battle shows one current actor at a time, enemy intent, and the Skill command; party actions resolve immediately and enemies act on initiative turns.
- Magic and items consume resources and affect valid targets.
- POI inn restores HP/spell charges and saves.
- POI shops can buy items, gear, and spells.
- Dungeons are procedurally generated and contain rooms, corridors, chests, a switch gate, stairs, random encounters, and bosses.
- Harbor travel deducts gold correctly and can return between charted islands.
- Boss victory sets relic flags, cleared dungeon state, and later travel/progression rewards.
- Save/load restores party, inventory, generated world seed, current island, position, settings, flags, discovered POIs, cleared dungeons, and opened chests.
