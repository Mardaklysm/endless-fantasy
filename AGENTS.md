# Endless Fantasy Agent Startup

This is the Endless Fantasy project, currently home to the browser JRPG **Crystal Oath: Dawn of the Four Stars**.

Codex-maintained durable project knowledge lives in:

```text
agent_knowledge/
```

## Context-Budget Rule

Use the minimal context startup from `agent_knowledge/README.md`.

At the start of a normal task:

1. Confirm the working directory is `D:\Projects\Endless Fantasy`.
2. Run `git status --short --branch`.
3. Read `agent_knowledge/code-map.md`.
4. Read exactly one relevant task profile from `agent_knowledge/task-profiles/` when one exists.
5. Use `rg` / search before opening source files.
6. Inspect only the narrow source files or line ranges needed for the task.

Do **not** read broad docs by default. In particular, do not open `project-overview.md`, `project-workflows.md`, `known-decisions-and-rules.md`, `art-and-assets.md`, `gameplay-systems.md`, `architecture.md`, `testing-and-validation.md`, or `backlog.md` unless the task specifically requires them.

If more than 2 knowledge docs or more than 6 source files seem necessary, pause and explain why before expanding context.

## Project Rules

- The game is legally original. It may be genre-inspired by classic top-down turn-based JRPGs, but do not copy Final Fantasy names, mechanics tables, sprites, logos, music, story text, maps, enemy designs, or UI art.
- Preserve playability. Do not leave the local browser game broken after edits.
- Do not break `npm run dev` / local Vite startup at `127.0.0.1:5173`.
- Do not add external art, music, sound, font, or sprite dependencies without explicit user approval.
- Prefer small incremental changes that fit the current Phaser/TypeScript/Vite architecture.
- Keep generated/code fallback art and audio until real replacement assets are implemented and verified.
- Keep UI text readable and the art style compact, clean, and original.
- Update `agent_knowledge/` only when a task reveals durable project knowledge future agents should know.
- Do not use `agent_knowledge/` for temporary plans, raw logs, or speculation. Mark uncertainty clearly.
- Validate after edits using the smallest check that covers the change; for most code changes start with `npm run build`.

## Current Commit Policy

- Every completed code, docs, or asset change must be committed and pushed to the configured remote before the task is considered done.
- Use focused commit messages that describe the actual Endless Fantasy change.
- Do not assume automatic deploy or publishing behavior beyond pushing git changes.
- Do not commit generated build output, `node_modules`, `.vite`, `dist`, logs, or temporary lab output.
