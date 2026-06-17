# Project Overview

## Game

- Title: **Crystal Oath: Dawn of the Four Stars**
- Project folder: `D:\Projects\Endless Fantasy`
- Genre: compact retro 2D top-down turn-based fantasy JRPG.
- Setting: Asterra, a legally original fantasy world sustained by four Star Relics: Root, Flame, Tide, and Gale.
- Main party: Arlen, Mira, and Kael.

## Core Loop

The player starts in Dawnford, explores tile-based towns/world/dungeons, triggers random encounters on dangerous terrain, wins turn-based battles for XP/gold/items, buys/rests/upgrades in towns, clears four relic dungeons, opens Starfall Gate, then reaches Eclipse Spire for the final boss and ending.

## Target Runtime

- Browser game.
- Phaser 3 rendering/game loop.
- TypeScript source bundled by Vite.
- Local development server at `127.0.0.1:5173`.
- Saves use browser `localStorage` under `crystal-oath-save-v1`.

## High-Level Content Structure

- Towns: Dawnford, Brinewick, Elderleaf, Sunbarrow, Starfall Gate.
- Dungeons: Moss Cave, Ashen Keep, Tide Shrine, Skyglass Tower, Eclipse Spire.
- Systems: title/new/load, overworld, towns, dungeons, menu/status/items/magic/equipment/settings, battle, shops, inns, clinics, game over, ending.
- Current art/audio: generated in code; no external art/music files are loaded.

## Current Development State

The first playable iteration exists. It is implemented mostly in one TypeScript scene (`src/main.ts`). It has working movement, menus, random/debug encounters, battles, rewards, leveling, shops, inns, clinics, dungeon chests/switches/bosses, save/load, synthesized audio, and a title/ending flow.

The project also has a complete art planning pass:

- `ART_STYLE_GUIDE.md`
- `ASSET_MANIFEST.md`
- `ASSET_IMPLEMENTATION_PLAN.md`

No real asset-loader pipeline is implemented yet. The generated art/audio placeholders are still the runtime source of visuals and sound.

## Legal And Originality Constraints

- Do not copy Final Fantasy names, logos, sprites, music, story text, enemy designs, maps, UI art, or exact mechanics tables.
- Do not import copyrighted game assets or copyrighted music/sound.
- Keep names, lore, visuals, and implementation original.
- Genre conventions such as top-down exploration, turn-based combat, items, spells, inns, shops, dungeons, bosses, leveling, and save/load are allowed.
