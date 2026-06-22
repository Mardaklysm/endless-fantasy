# Task Profiles

Task profiles are compact routing and contract docs for common Endless Fantasy work. They are preferred over broad knowledge docs for normal tasks because they keep Codex focused on the narrow files, durable rules, and validation commands that matter for one task type.

Keep each profile short. Point to canonical source files, scripts, manifests, and validation commands. Do not duplicate large sections from `art-and-assets.md`, `gameplay-systems.md`, `known-decisions-and-rules.md`, or other broad docs; link or route to them when deeper context is truly needed.

Use a task profile with `agent_knowledge/code-map.md`:

1. Read `AGENTS.md`.
2. Read `agent_knowledge/code-map.md`.
3. Read exactly one profile from this folder when one matches the task.
4. Search with `rg`.
5. Open only the source files or doc sections needed for the specific change.

If a profile is missing or too thin for repeated future work, update it after the task reveals durable knowledge.

## Available Profiles

- `worldgen.md`: semantic overworld, roads, rivers, terrain masks, mountains, forests, POIs, and worldgen lab.
- `assets.md`: asset roots, manifests, import scripts, fallback policy, and rembg boundaries.
- `battle.md`: battle flow, initiative, enemy intent, battle rendering, rewards, and smoke tests.
- `ui.md`: title/menu/town/UI rendering, live text, pixel filtering, and readability rules.
- `save-load.md`: localStorage saves, world seed restoration, load normalization, and save-field changes.

## Prompt Pattern

```text
Work in D:\Projects\Endless Fantasy.
Context budget: read AGENTS.md, agent_knowledge/code-map.md, and agent_knowledge/task-profiles/worldgen.md only. Use rg before opening source files. Do not broad-scan the repo.
Task: <specific task>.
Validate with <specific commands>.
Commit and push.
```
