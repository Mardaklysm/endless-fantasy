# Known Pitfalls

## Context Budget

- Do not read broad docs by default.
- Use `agent_knowledge/code-map.md` plus one relevant task profile.
- Use `rg` snippets and exact line ranges before opening files.
- Do not open more than 6 source/docs files without explaining why, unless the user explicitly named the files to edit.
- Use `tools/codex_context/endless_context.py` before broad repo discovery.

## Validation Overreach

- Do not run `npm test` unless worldgen/semantic generation actually changed.
- Do not start Vite or browser smoke unless requested or needed for visual/runtime confirmation.
- Do not treat attempted-but-timed-out tests as passed.
- Use `agent_knowledge/test-matrix.md` to choose the smallest validation.

## Debug Settings

- Defaults must stay off.
- Debug settings must not mutate generated world data.
- Keep debug behavior isolated and easy to remove.

## Assets

- Do not inspect huge image folders unless an asset task requires it.
- Do not commit generated previews, tmp files, worldgen lab outputs, or reports.
- Do not restore retired asset roots or deleted placeholder assets.

## Save/Load

- Preserve old saves through normalization when adding fields.
- Do not assume a separate schema version exists unless one is implemented.

## Git

- Inspect status and diff before commit.
- Stage only intended files.
- Commit and push completed changes per project workflow.
