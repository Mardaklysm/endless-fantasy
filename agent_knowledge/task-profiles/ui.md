# UI Task Profile

Use this profile for title screen, menus, HUD/panels, town service presentation, live text, input display, and readability tasks.

## Main Files

- `src/render/common/renderCore.ts`
- `src/render/common/panels.ts`
- `src/render/title/drawTitle.ts`
- `src/render/menu/drawMenu.ts`
- `src/render/town/drawTown.ts`
- `src/render/battle/drawBattle.ts`
- `src/input/sceneInput.ts`
- `src/input/keyboard.ts`
- `src/systems/menu/menuActions.ts`
- `src/data/towns.ts`

Use `rg` for exact labels, menu options, texture keys, or layout constants before opening additional files.

## Critical Rules

- Runtime UI and gameplay labels should be live Phaser text, not baked into tiny sprites.
- Title screen uses `assets/title/title_screen.png` as full-screen contain-fit art over black backing.
- Title menu remains live text ordered `Continue`, then `New Game`.
- Do not reintroduce title-screen control/help subtitles.
- Greenhaven/town service markers are icon-only in a five-marker row; do not add always-visible service labels back onto markers.
- Town south exit uses gate art only; no persistent floating `Exit` label.
- Keep UI text readable and clear of panel borders.
- Pixel sprites, tiles, UI, and icons use nearest-neighbor texture filtering.
- Battle backgrounds and title art can use linear filtering.
- Canvas CSS uses `image-rendering: auto`; pixel-art crispness comes from texture filtering and integer render scaling.

## Validation

For UI/render code changes:

```powershell
npm run build
```

Smoke-test the changed surface:

- Title screen renders and menu text is readable.
- New Game starts.
- Menus open/close without text overlap.
- Town services remain recognizable without persistent labels.
- Battle command/status text stays inside panels if battle UI changed.

Open `agent_knowledge/art-and-assets.md` only when changing asset pipeline or art provenance. Open `agent_knowledge/gameplay-systems.md` only when UI changes alter gameplay behavior.
