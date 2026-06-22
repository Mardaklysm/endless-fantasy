# Project Workflows

## How To Start Working

Use the context-budget startup from `agent_knowledge/README.md`:

1. Confirm the working directory is `D:\Projects\Endless Fantasy`.
2. Run `git status --short --branch`.
3. Read `AGENTS.md`.
4. Read `agent_knowledge/code-map.md`.
5. Read one relevant `agent_knowledge/task-profiles/` doc when one exists.
6. Search first with `rg`, then open specific files or line ranges.
7. Expand to broader knowledge docs only with a task-specific reason.

Normal tasks should start from `code-map.md` and a compact task profile, not from broad project overview docs. If more than 2 knowledge docs or more than 6 source files seem necessary, pause and explain why before expanding context.

## Inspect Current Behavior

Use source and docs in this order:

```powershell
Get-Content agent_knowledge\code-map.md
Get-Content agent_knowledge\task-profiles\<profile>.md
rg -n "<specific symbol, file name, texture key, or behavior>" src agent_knowledge
```

Useful routing files:

- `agent_knowledge/code-map.md`: shortest route to source files by task type.
- `agent_knowledge/task-profiles/`: compact task contracts for common work.
- `src/app/createGame.ts`: Phaser bootstrap/config.
- `src/scene/CrystalOathScene.ts`: scene-owned state fields and prototype module registration.
- `src/data/`: static gameplay data tables and shared data types.
- `src/assets/`: asset path/glob and texture-key maps.
- `src/render/`: surface-specific rendering.
- `src/systems/`: movement, world interaction/travel/encounters, battle, menu, save, audio behavior.
- `src/world/`: semantic world generation and dungeon generation.

Avoid generated outputs, previews, large asset folders, `dist`, `.vite`, `node_modules`, and temporary lab outputs unless the task explicitly requires them.

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

- Check paths and links with focused search.
- Run `git diff --check`.
- `npm run build` is optional unless code/config changed or the task asks for it.

For code changes:

```powershell
npm run build
```

Run narrower validation when a task profile calls for it. For example, worldgen changes usually need:

```powershell
npm test
npm run build
```

Then browser-smoke-test the changed surface when visual/gameplay behavior changed:

- Title screen renders.
- New Game starts.
- Movement/menu works.
- Battle starts and resolves.
- No browser console errors.

## Add Features Safely

- Start from `agent_knowledge/code-map.md` and the relevant task profile.
- Prefer data-driven additions in existing tables where possible.
- Preserve current controls and save/load compatibility unless the user explicitly approves a reset.
- Keep changes within the relevant domain module from `code-map.md`; `src/main.ts` should remain a tiny bootstrap entry.
- If adding or changing save data, update save serialization, load normalization, task-profile/docs notes, and validation notes.
- If changing battle, test at least one random encounter and one boss or debug encounter path.
- If changing maps/dungeons, test entry/exit, collisions, chests/switches, and encounters.

## Add Or Extend Assets

For normal asset work, start with `agent_knowledge/task-profiles/assets.md`. Open `agent_knowledge/art-and-assets.md`, root art docs, or import scripts only when the task needs detailed pipeline history or implementation specifics.

Current high-level rules:

- Copy files into the existing asset structure without creating `assets/assets/...`.
- Add or update manifest-style texture keys in the asset map.
- Use image-first fallback rendering.
- Keep generated placeholders until the replacement path is verified.
- Do not restore deleted generic overworld placeholder PNGs.
- Do not run rembg on terrain, dungeon atlas, opaque battle backgrounds, or alpha character sheets.

Generated placeholders must remain as fallbacks until replacement assets are integrated and verified.

## Update Docs And Backlog

Update durable docs only when a task changes durable project facts:

- Architecture changes: `architecture.md`
- Common task routing changes: `code-map.md` or a relevant task profile
- Gameplay/system/balance changes: `gameplay-systems.md`
- Art pipeline/scope changes: `art-and-assets.md` plus root art docs when needed
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
- Do not commit `node_modules/`, `dist/`, `.vite/`, logs, local browser storage, generated previews, or temporary lab outputs.
- Inspect status/diff before committing.
- If a code change and knowledge update belong together, commit and push both.
