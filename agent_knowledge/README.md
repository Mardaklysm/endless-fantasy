# Agent Knowledge

This folder stores durable project knowledge for Endless Fantasy / Crystal Oath. Use it to carry forward stable project facts, workflows, architecture notes, design constraints, and practical backlog items between Codex sessions.

Keep entries concise, accurate, and maintained. Prefer updating an existing relevant file over creating a new one. Replace stale information instead of appending contradictions. Mark uncertainty clearly.

## Context-Budget Startup

Default rule: **read the smallest useful context first**.

At the start of a normal task:

1. Confirm the working directory is `D:\Projects\Endless Fantasy`.
2. Run `git status --short --branch`.
3. Read root `AGENTS.md` only if it is not already loaded by the agent environment.
4. Read `agent_knowledge/code-map.md`.
5. Read exactly one relevant task profile from `agent_knowledge/task-profiles/` when one exists.
6. Use `rg` / search before opening source files.
7. Open narrow source files or line ranges based on `code-map.md`, the task profile, and the search results.

Do **not** read these by default:

- `project-overview.md`
- `project-workflows.md`
- `backlog.md`
- `known-decisions-and-rules.md`
- `art-and-assets.md`
- `gameplay-systems.md`
- `architecture.md`
- `testing-and-validation.md`

Read broader docs only when the task specifically needs them.

If more than 2 knowledge docs or more than 6 source files seem necessary, pause and explain why before expanding context. Do not inspect generated outputs, previews, large asset folders, `dist`, `.vite`, `node_modules`, temporary lab outputs, or other bulky generated files unless the task explicitly requires them.

## Task Profiles

Task profiles are compact routing and contract docs for common task types. Prefer a task profile over broad durable docs for normal work.

Use:

- World generation, terrain, roads, rivers, mountains, forests, or POIs: `task-profiles/worldgen.md`
- Asset import, manifests, art pipeline, or runtime asset mapping: `task-profiles/assets.md`
- Battle flow, initiative, enemy intent, rewards, or battle presentation: `task-profiles/battle.md`
- UI, title, menus, town labels, text rendering, or pixel filtering: `task-profiles/ui.md`
- Save/load, persisted fields, localStorage, or seed restoration: `task-profiles/save-load.md`

If no task profile exists, read `code-map.md`, search narrowly, and open only the smallest source/docs needed.

## When To Read Broader Docs

Read broader docs only for these reasons:

- Architecture, module ownership, source structure, or large refactors: `architecture.md`
- Art pipeline, asset import, asset provenance, or detailed asset rules: `art-and-assets.md`
- Gameplay rules, progression, balance, encounters, or system behavior: `gameplay-systems.md`
- Durable rules, contentious decisions, or conflict resolution: `known-decisions-and-rules.md`
- Validation command changes or manual test coverage changes: `testing-and-validation.md`
- Follow-up tracking or backlog cleanup: `backlog.md`
- Project-wide overview or onboarding: `project-overview.md`
- Process/workflow policy changes: `project-workflows.md`

Do not read these files just because they exist.

## Quick Project Summary

Crystal Oath is a compact browser-playable retro 2D top-down turn-based fantasy RPG built with Phaser 3, TypeScript, and Vite. The runtime is split into domain modules under `src/app/`, `src/scene/`, `src/data/`, `src/assets/`, `src/render/`, `src/systems/`, and `src/world/`, with generated fallback art/audio and localStorage saves.

## Entry Point

- Browser entry: `index.html`
- Vite entry: `src/main.ts`
- Phaser bootstrap: `src/app/createGame.ts`
- Main scene shell: `src/scene/CrystalOathScene.ts`
- Code navigation: `agent_knowledge/code-map.md`
- Task profiles: `agent_knowledge/task-profiles/`
- Styling: `src/style.css`
- Vite config: `vite.config.ts`
- Local dev URL: `http://127.0.0.1:5173`

## Docs To Update After Changes

Update docs only when durable project facts change:

- Update `README.md` when run instructions, controls, high-level gameplay, or known limitations change.
- Update `ART_STYLE_GUIDE.md`, `ASSET_MANIFEST.md`, or `ASSET_IMPLEMENTATION_PLAN.md` when art direction, asset naming, asset scope, or asset-loading strategy changes.
- Update `agent_knowledge/architecture.md` when source structure, major classes/functions, state flow, or build/runtime architecture changes.
- Update `agent_knowledge/code-map.md` when source navigation, module ownership, or common task routing changes.
- Update the relevant `agent_knowledge/task-profiles/` file when a compact task contract changes.
- Update `agent_knowledge/gameplay-systems.md` when gameplay rules, data tables, progression, balance, or save/state behavior changes.
- Update `agent_knowledge/testing-and-validation.md` when validation commands or manual test coverage changes.
- Update `agent_knowledge/known-decisions-and-rules.md` for durable decisions.
- Update `agent_knowledge/character-sprite-import.md` when the character collage import workflow, frame model, manifest, or skill path changes.
- Update `agent_knowledge/backlog.md` for meaningful newly discovered gaps or completed follow-ups.

Do not use `agent_knowledge/` for temporary plans, raw logs, or speculation.

## Prompt Pattern

Future prompts should stay short by naming the profile and validation target:

```text
Work in D:\Projects\Endless Fantasy.

Context budget:
Read AGENTS.md if not already loaded, agent_knowledge/code-map.md, and agent_knowledge/task-profiles/worldgen.md only.
Use rg before opening source files.
Do not broad-scan the repo.
Do not read unrelated docs unless you first explain why.

Task:
<specific task>

Validate:
<specific commands>

Commit and push.
```

## Agent Startup Checklist

- Confirm you are working in `D:\Projects\Endless Fantasy`.
- Run `git status --short --branch` before edits.
- Read `AGENTS.md` only if needed, `agent_knowledge/code-map.md`, and one relevant task profile when available.
- Search first.
- Open only the source/docs needed for the task.
- Keep changes scoped and preserve the playable game.
- Run the smallest relevant validation; for most code changes start with `npm run build`.
- Report files changed, validation run, and any knowledge updates.
