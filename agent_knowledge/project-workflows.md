# Project Workflows

## How To Start Working

1. Confirm the working directory is `D:\Projects\Endless Fantasy`.
2. Read `AGENTS.md` and `agent_knowledge/README.md`.
3. Read the task-relevant knowledge files.
4. Run `git status --short --branch`.
5. Inspect current source/docs before editing.
6. Keep changes small and preserve the playable game.

## Inspect Current Behavior

Use source and docs first:

```powershell
Get-Content agent_knowledge\code-map.md
rg -n "export const ENEMIES|export const SPELLS|drawWorldTile|drawEnemySprite|saveGame|loadGame|class CrystalOathScene|travelToIsland|maybeEncounter" src
```

Useful files:

- `agent_knowledge/code-map.md`: shortest route to the right source file by task type.
- `src/main.ts`: Vite entry only.
- `src/app/createGame.ts`: Phaser bootstrap/config.
- `src/scene/CrystalOathScene.ts`: scene-owned state fields and prototype module registration.
- `src/data/`: static gameplay data tables and shared data types.
- `src/assets/`: asset path/glob and texture-key maps.
- `src/render/`: surface-specific rendering.
- `src/systems/`: movement, world interaction/travel/encounters, battle, menu, save, audio behavior.
- `README.md`: run instructions and manual checklist.
- `ART_STYLE_GUIDE.md`, `ASSET_MANIFEST.md`, `ASSET_IMPLEMENTATION_PLAN.md`: art planning and future asset pipeline.

## Run The Game Locally

Install dependencies if needed:

```powershell
npm install
```

Start dev server:

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Vite is configured to bind to `127.0.0.1` and port `5173`.

## Validate Changes

For docs-only changes:

- Check paths and links manually.
- Run `npm run build` if the task asks to confirm the game remains healthy.

For code changes:

```powershell
npm run build
```

Then browser-smoke-test the changed surface when visual/gameplay behavior changed:

- Title screen renders.
- New Game starts.
- Movement/menu works.
- Battle starts and resolves.
- No browser console errors.

There are no automated gameplay tests yet.

## Add Features Safely

- Prefer data-driven additions in existing tables where possible.
- Preserve current controls and save/load compatibility unless the user explicitly approves a reset.
- Keep changes within the relevant domain module from `agent_knowledge/code-map.md`; `src/main.ts` should remain a tiny bootstrap entry.
- If adding or changing save data, update `saveGame`, `loadGame`, manual test notes, and knowledge docs.
- If changing battle, test at least one random encounter and one boss or debug encounter path.
- If changing maps/dungeons, test entry/exit, collisions, chests/switches, and encounters.

## Add Or Extend Assets

Follow `ASSET_IMPLEMENTATION_PLAN.md`.

Batch 001 is already integrated under root `assets/` with Phaser preload keys in `src/assets/assetPaths.ts` and `src/assets/textureKeys.ts`. For future batches:

- Copy files into the existing `assets/` structure without creating `assets/assets/...`.
- Add or update manifest-style texture keys in the asset map.
- Use image-first fallback rendering.
- Keep generated placeholders until the replacement path is verified.
- For class character sheets, use `tools/art_import/import_character_sprites.mjs`; it copies the alpha PNG sources, normalizes 5x2 sheets, writes `src/data/characterSprites.ts`, and produces debug reports.
- The active overworld runtime asset set is manifest-driven under `src/assets/world/current/`; do not rebuild it from the legacy terrain-only importer during cleanup work. `tools\world_assets\import_selected_world_assets.py` is disabled so it cannot overwrite approved objects or recreate generic overlay/POI/route placeholder assumptions.
- For the current overworld object set, use `python tools\world-object-curator\curate_world_objects.py --integrate`; it preserves approved decisions from `D:\new_items\output`, additively checks raw candidates from `D:\Tools\rembg\bg_input`, writes approved transparent objects to `D:\new_items\output\approved_objects`, and integrates only approved PNGs into `src/assets/world/current/objects/`.
- For the opaque dungeon/city tile sheet, use `npm run import:dungeon-atlas`; it imports `D:\Projects\new_artwork\dungeon_atlas.jpeg`, writes `src/assets/world/dungeon_atlas.png`, updates `dungeonAtlas.manifest.json`, and emits a debug report.
- Prefer one family at a time: UI panel pass, icon/menu pass, vehicle pass, effects pass, then polish animation.

Generated placeholders must remain as fallbacks until replacement assets are integrated and verified.

## Update Docs And Backlog

Update durable docs when a task changes project facts:

- Architecture changes: `architecture.md`
- Gameplay/system/balance changes: `gameplay-systems.md`
- Art pipeline/scope changes: `art-and-assets.md` plus root art docs
- Validation changes: `testing-and-validation.md`
- Durable decisions/rules: `known-decisions-and-rules.md`
- Follow-up work: `backlog.md`

Do not add raw logs or temporary plans to `agent_knowledge/`.

## Git / Commit Expectations

Endless Fantasy is initialized as a local Git repository on default branch `main`.

The GitHub remote is:

```text
origin -> github.com:Mardaklysm/endless-fantasy.git
```

- Every completed code, docs, or asset change must be committed and pushed before the task is considered done.
- Do not assume automatic deploy or release behavior.
- Do not commit `node_modules/`, `dist/`, `.vite/`, logs, or local browser storage.
- Inspect status/diff before committing.
- If a code change and knowledge update belong together, commit and push both.
