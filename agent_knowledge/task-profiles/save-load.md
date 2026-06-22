# Save/Load Task Profile

Use this profile for save serialization, load normalization, persisted fields, localStorage behavior, and world seed restoration tasks.

## Main Files

- `src/app/config.ts`
- `src/systems/save/saveGame.ts`
- `src/systems/save/loadGame.ts`
- `src/scene/CrystalOathScene.ts`
- `src/scene/sceneState.ts`
- `src/systems/menu/menuActions.ts`
- `src/input/sceneInput.ts`
- `src/render/title/drawTitle.ts`

Use `rg` for the field name or save/load call site before opening additional files.

## Current Contract

- Saves use browser `localStorage`.
- Save key: `crystal-oath-save-v1` from `src/app/config.ts`.
- Saved `worldSeed` is used to regenerate the same semantic world on load.
- New Game creates a fresh seed; Load Game rebuilds from saved seed.
- There is no explicit versioned save schema yet.
- Older saves are normalized for missing world seed, travel flags, discovered POIs, cleared dungeons, inventory defaults, and skill cooldowns.

## If Adding Fields

- Update `saveGame`.
- Update `loadGame` normalization/restoration.
- Check related scene state defaults in `CrystalOathScene.ts` or `sceneState.ts`.
- Update docs or this profile when the persisted contract changes.
- Add manual test notes when the change needs a specific save/load regression path.

## Validation

For save/load code changes:

```powershell
npm run build
```

Manual smoke test:

- Start or load a game.
- Save from menu, inn, tent, or relevant autosave path.
- Reload page or return to title.
- Load Game restores position, mode-relevant progress, inventory/party state, and the same generated world from the saved seed.

Open `agent_knowledge/gameplay-systems.md` when changing gameplay state semantics. Open `agent_knowledge/known-decisions-and-rules.md` when deciding whether to introduce schema versioning or compatibility-breaking behavior.
