# Known Decisions And Rules

## Durable Project Decisions

- The project is a browser game built with Phaser 3, TypeScript, and Vite.
- The current main implementation lives in `src/main.ts`.
- The canvas is 960x540 with Phaser `pixelArt: true`.
- The tile grid is 32x32 display pixels.
- The first playable game is intentionally compact, roughly 30-60 minutes when tuned.
- Asset Batch 001 lives under root `assets/` and is loaded by Phaser from `src/main.ts`.
- Current art rendering is image-first with generated fallback behavior.
- Batch 001 world terrain/marker PNGs remain loaded, but the active overworld uses stronger original procedural terrain, coastlines, roads, location markers, and a generated leader sprite until better real assets exist.
- Dawnford/town interiors currently use generated readable floor, wall, service counter, sign, prop, and exit art until dedicated town assets exist.
- Battle presentation uses an original generated scenic backdrop, enemies on the left, generated party battlers on the right, and lower target/command/status panels.
- Audio is generated in code.
- Save data uses browser `localStorage` under `crystal-oath-save-v1`.
- Keyboard is the primary input; mouse support is minimal.
- Input helpers accept both `KeyboardEvent.code` and `KeyboardEvent.key` for movement/confirm/cancel compatibility.
- Exploration movement is grid-logical but visually smooth; tile effects commit only after a completed tile step.
- Exploration rendering uses persistent visual tile coordinates during movement. Do not let render code fall back to logical coordinates while a step is still in progress.
- Battle uses individual initiative turns. The game does not use all-party action queue rounds.

## Legal Originality Rules

- Do not copy Final Fantasy names, sprites, logos, music, spell visuals, maps, story text, enemy designs, UI art, or exact mechanics tables.
- Do not add copyrighted assets.
- Do not use external asset packs unless explicitly approved and legally safe.
- Genre inspiration from classic turn-based top-down JRPGs is allowed.
- Character/place/enemy/spell/item names should remain original to Asterra/Crystal Oath.

## Style And Readability Rules

- Prefer clean readable retro pixel art.
- Use strong silhouettes and limited palettes.
- Terrain separation matters more than texture detail.
- UI text readability matters more than decoration.
- Use readable live text for service labels and gameplay instructions; do not bake critical labels into tiny sprites.
- The current UI font strategy favors a clean monospace stack over noisy small pixel text.
- Avoid hyper-detailed art that fights the 32px grid.
- Keep the palette pleasant and not dominated by one hue.

## Generated Fallback Rule

Do not remove generated placeholder art/audio until equivalent real assets are loaded, shown, and verified. Asset integration should be image-first and fallback-safe.

The current generated art fallback is still required for missing textures and for systems not yet fully converted, including generated UI panels and future effect gaps.

## Scope Rules

- Keep scope compact.
- Prefer fewer reusable assets over many tiny variants.
- Prefer small incremental changes over rewrites.
- Do not expand gameplay when the task is documentation/art planning.
- Do not add dependencies without a clear need and user approval.
- Do not reintroduce instant visual tile snapping or all-party queued battle rounds.
- Do not re-enable weak first-pass world terrain/marker PNGs as the primary overworld renderer unless a future batch is visually verified to be better than the procedural pass.

## Current Content Rules

- Party has exactly three current playable characters: Arlen, Mira, Kael.
- Current level cap is 12.
- Current core progression is Root -> Flame/Tide/Gale -> Starfall Gate -> Eclipse Spire.
- Towns and dungeons listed in `project-overview.md` are the current content structure.
- XP multiplier and encounter toggle are intentional quality-of-life settings.

## Validation Rules

- Run `npm run build` after code/config changes.
- For visual/gameplay changes, also smoke-test in browser.
- Docs-only changes can be validated by reading/checking files, but running build is acceptable when confirming the game remains untouched.

## Unknowns / Needs Verification

- No formal commit/push policy exists yet.
- No automated tests exist yet.
- Save migration requirements are not defined.
- The first asset loader is implemented in `src/main.ts`; future work may split it into modules if the file grows further.
- Balance has not had a full documented playthrough pass.
