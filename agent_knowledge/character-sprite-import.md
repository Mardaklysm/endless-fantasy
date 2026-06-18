# Character Sprite Import

Character sprite collage import is a known Endless Fantasy workflow. Use the local Codex skill before future imports:

```text
C:\Users\Marku\.codex\skills\endless-fantasy-character-sprite-import\SKILL.md
```

The current implementation source of truth is:

- Import script: `tools/art_import/import_character_sprites.mjs`
- Runtime sheets: `assets_v2/characters/classes/*_normalized.png`
- Source copies: `assets_v2/source_sheets/class_sprites/*.png`
- Manifest/metadata: `src/data/characterSprites.ts`
- Debug previews/reports: `docs/debug/sprite-import/`
- Runtime renderer: `src/main.ts`, especially `drawCharacterSpriteFrame`, `drawLeader`, and `drawPartyBattler`

Canonical model:

- Input is a 5 columns x 2 rows alpha PNG character collage.
- Do not run rembg, remove backgrounds, or chroma-key black when alpha already exists.
- Copy source files into the repo; do not mutate originals.
- Normalize to equal transparent cells with fixed body anchor and feet baseline.
- Current imported class sheets use 704x512 cells in 3520x1024 PNG sheets.

Canonical frame order:

1. `attack_windup_left`
2. `attack_release_left`
3. `walk_down_a`
4. `walk_down_b`
5. `walk_left_a`
6. `walk_left_b`
7. `walk_right_a`
8. `walk_right_b`
9. `walk_up_a`
10. `walk_up_b`

Game integration rules:

- Use the manifest for crop rectangles and anchor metadata.
- Exploration uses two-frame walking loops and A-frame idle for the last facing direction.
- Battle idle faces left with `walk_left_a`.
- Battle attacks use `attack_windup_left` then `attack_release_left`.
- Keep old tiny class sprites out of runtime mappings unless intentionally reintroduced.
- Validate with `node tools\art_import\import_character_sprites.mjs`, `npm run build`, and a browser smoke test when runtime integration changes.
