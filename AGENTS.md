# Endless Fantasy Agent Startup

This is the Endless Fantasy project, currently home to the browser JRPG **Crystal Oath: Dawn of the Four Stars**.

Codex-maintained durable project knowledge lives in:

```text
agent_knowledge/
```

At the start of every task:

1. Read this `AGENTS.md`.
2. Read `agent_knowledge/README.md`.
3. Follow the reading order and task routing in that README.
4. Read the relevant knowledge files before editing code, docs, or assets.
5. Inspect current source/docs when needed; do not rely only on memory.

Project rules:

- The game is legally original. It may be genre-inspired by classic top-down turn-based JRPGs, but do not copy Final Fantasy names, mechanics tables, sprites, logos, music, story text, maps, enemy designs, or UI art.
- Preserve playability. Do not leave the local browser game broken after edits.
- Do not break `npm run dev` / local Vite startup at `127.0.0.1:5173`.
- Do not add external art, music, sound, font, or sprite dependencies without explicit user approval.
- Prefer small incremental changes that fit the current Phaser/TypeScript/Vite architecture.
- Keep generated/code fallback art and audio until real replacement assets are implemented and verified.
- Keep UI text readable and the art style compact, clean, and original.
- Update `agent_knowledge/` when a task reveals durable project knowledge future agents should know.
- Update `agent_knowledge/backlog.md` and `agent_knowledge/known-decisions-and-rules.md` when meaningful decisions, gaps, or follow-up work change.
- Do not use `agent_knowledge/` for temporary plans, raw logs, or speculation. Mark uncertainty clearly.
- Validate after edits using the smallest check that covers the change; for most code changes start with `npm run build`.

Current commit/deploy policy:

- Every completed code, docs, or asset change must be committed and pushed to the configured remote before the task is considered done.
- Use focused commit messages that describe the actual Endless Fantasy change.
- Do not assume automatic deploy or publishing behavior beyond pushing git changes.
- Do not commit generated build output, `node_modules`, or `dist`.
