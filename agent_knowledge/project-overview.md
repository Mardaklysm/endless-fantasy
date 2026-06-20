# Project Overview

## Game

- Title: **Crystal Oath: Dawn of the Four Stars**
- Project folder: `D:\Projects\Endless Fantasy`
- Genre: compact retro 2D top-down turn-based fantasy JRPG.
- Setting: Asterra, a legally original fantasy world sustained by four Star Relics: Root, Flame, Tide, and Gale.
- Main party: Arlen, Mira, and Kael.

## Core Loop

The player starts in Greenhaven on a seeded archipelago overworld, explores islands, towns, harbors, landmarks, and procedural dungeons, triggers random encounters on dangerous terrain, wins turn-based battles for XP/gold/items, buys/rests/upgrades in towns, uses harbor travel to reach stronger islands, clears relic dungeons, opens Starfall Gate, then reaches Eclipse Spire for the final boss and ending.

## Target Runtime

- Browser game.
- Phaser 3 rendering/game loop.
- TypeScript source bundled by Vite.
- Local development server at `127.0.0.1:5173`.
- Saves use browser `localStorage` under `crystal-oath-save-v1`.

## High-Level Content Structure

- Islands/towns: Greenhaven, Coralreach, Frostmere/Frostmere Haven, Highspire/Highspire Camp, Starfall Gate.
- Dungeons: Mossy Cave, Coralreach Ruins, Stonefall Keep (`ashenKeep`), Skyglass Tower, Eclipse Spire.
- Systems: title/new/load, seeded archipelago overworld, harbor travel, landmarks/points of interest, towns, procedural dungeons, menu/status/items/magic/equipment/settings, battle, shops, inns, clinics, game over, ending.
- Current art/audio: PNG/JPEG assets are loaded from `assets/`, `assets_v2/`, and checked-in runtime atlases under `src/assets/world/`, with generated code fallbacks still present. Audio remains generated in code.

## Current Development State

The first playable iteration exists. It is implemented mostly in one TypeScript scene (`src/main.ts`) with modular world/dungeon generation under `src/world/`. It has working movement, menus, random/debug encounters, battles with enemy intent and player skills, rewards, leveling, shops, inns, clinics, deterministic procedural dungeon chests/switches/bosses, harbor travel, save/load, synthesized audio, and a title/ending flow.

The project also has a complete art planning pass:

- `ART_STYLE_GUIDE.md`
- `ASSET_MANIFEST.md`
- `ASSET_IMPLEMENTATION_PLAN.md`

The runtime asset-loader pipeline is implemented in `src/main.ts`. Generated art/audio placeholders remain as fallbacks where real assets are missing or not yet accepted.

## Legal And Originality Constraints

- Do not copy Final Fantasy names, logos, sprites, music, story text, enemy designs, maps, UI art, or exact mechanics tables.
- Do not import copyrighted game assets or copyrighted music/sound.
- Keep names, lore, visuals, and implementation original.
- Genre conventions such as top-down exploration, turn-based combat, items, spells, inns, shops, dungeons, bosses, leveling, and save/load are allowed.
