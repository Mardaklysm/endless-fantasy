# Agent Knowledge

This folder stores Codex-maintained durable project knowledge for Endless Fantasy / Crystal Oath. Use it to carry forward stable project facts, workflows, architecture notes, design constraints, and practical backlog items between sessions.

Keep entries concise, accurate, and maintained. Prefer updating an existing relevant file over creating a new one. Replace stale information instead of appending contradictions, and mark uncertainty clearly.

## Required Reading Order

At the start of every task:

1. `AGENTS.md`
2. `agent_knowledge/README.md`
3. `agent_knowledge/project-overview.md`
4. `agent_knowledge/project-workflows.md`
5. The task-relevant files below:
   - Code architecture, navigation, or refactors: `architecture.md`, then `code-map.md`
   - Gameplay/balance/content: `gameplay-systems.md`
   - Art/assets/UI visuals: `art-and-assets.md`, plus root `ART_STYLE_GUIDE.md`, `ASSET_MANIFEST.md`, and `ASSET_IMPLEMENTATION_PLAN.md`
   - Character sprite collage imports: `character-sprite-import.md`, plus the local Codex skill `C:\Users\Marku\.codex\skills\endless-fantasy-character-sprite-import\SKILL.md`
   - Testing/build/browser checks: `testing-and-validation.md`
   - Durable rules and product decisions: `known-decisions-and-rules.md`
   - Follow-up work and scope control: `backlog.md`

## Quick Project Summary

Crystal Oath is a compact browser-playable retro 2D top-down turn-based fantasy RPG built with Phaser 3, TypeScript, and Vite. The runtime is split into domain modules under `src/app/`, `src/scene/`, `src/data/`, `src/assets/`, `src/render/`, and `src/systems/`, with generated code art/audio fallbacks and localStorage saves.

## Entry Point

- Browser entry: `index.html`
- Vite entry: `src/main.ts`
- Phaser bootstrap: `src/app/createGame.ts`
- Main scene shell: `src/scene/CrystalOathScene.ts`
- Code navigation: `agent_knowledge/code-map.md`
- Styling: `src/style.css`
- Vite config: `vite.config.ts`
- Local dev URL: `http://127.0.0.1:5173`

## Docs To Update After Changes

- Update `README.md` when run instructions, controls, high-level gameplay, or known limitations change.
- Update `ART_STYLE_GUIDE.md`, `ASSET_MANIFEST.md`, or `ASSET_IMPLEMENTATION_PLAN.md` when art direction, asset naming, asset scope, or asset-loading strategy changes.
- Update `agent_knowledge/architecture.md` when source structure, major classes/functions, state flow, or build/runtime architecture changes.
- Update `agent_knowledge/code-map.md` when source navigation, module ownership, or common task routing changes.
- Update `agent_knowledge/gameplay-systems.md` when gameplay rules, data tables, progression, balance, or save/state behavior changes.
- Update `agent_knowledge/testing-and-validation.md` when validation commands or manual test coverage changes.
- Update `agent_knowledge/known-decisions-and-rules.md` for durable decisions.
- Update `agent_knowledge/character-sprite-import.md` when the character collage import workflow, frame model, manifest, or skill path changes.
- Update `agent_knowledge/backlog.md` for meaningful newly discovered gaps or completed follow-ups.

## Agent Startup Checklist

- Confirm you are working in `D:\Projects\Endless Fantasy`.
- Run `git status --short --branch` before edits.
- Read the relevant knowledge files and current source/docs for the task.
- Keep changes scoped and preserve the playable game.
- Run the smallest relevant validation, usually `npm run build`.
- Report files changed, validation run, and any knowledge updates.
