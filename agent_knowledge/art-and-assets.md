# Art And Assets

## Current Art Approach

Asset Batch 001 is integrated under `assets/`. Phaser preloads the PNG files through manifest-style texture keys in `src/main.ts`.

Rendering is image-first and fallback-second where the loaded asset meets readability needs. Dungeon tiles/objects, town/dungeon Arlen/NPC sheets, battle portraits, enemy sprites, title logo/crystals, cursor, and HP bars use PNG textures when available. The generated Phaser `Graphics` art remains as fallback if a texture is missing.

The current overworld terrain and location markers intentionally use original procedural rendering instead of Batch 001 PNGs. The first world tile/marker images were too weak for the requested classic JRPG presentation. Keep those PNGs loaded for future comparison/replacement, but do not switch them back on without a visual pass.

Battle now uses an original generated forest/plains backdrop, procedural party battlers on the right, larger enemy presentation on the left, and classic lower JRPG panels. Enemy PNGs and battle portraits remain in use; procedural shapes fill the backdrop, party-side battlers, and panel framing.

Phaser text still renders all UI text. Audio is still synthesized in code. No external fonts, music files, sound files, or third-party asset packs are loaded.

## Current Sizes

- Canvas/internal resolution: 960x540.
- Display tile grid: 32x32.
- Recommended future source tiles: 16x16 scaled 2x.
- Current map sprites fit within a 32x32 tile.
- Recommended map character source frames: 16x16.
- Recommended battle portraits: 32x40 source.
- Recommended normal enemy sprites: 48x48 source.
- Recommended boss sprites: 96x96 source.

See `ART_STYLE_GUIDE.md` for style and size details.

## Integrated Asset Batch 001

Source batch:

- `crystal_oath_assets_batch_001/assets`
- `crystal_oath_assets_batch_001/GENERATED_ASSET_BATCH_001_REPORT.md`

Integrated destination:

- `assets/`

Rendered now:

- World terrain: original procedural plains, forest, hills, mountain, water/deep water, sand, road, and coast edges.
- Location markers: original procedural Dawnford castle, towns, cave, keep, shrine, tower, Starfall Gate, and Eclipse Spire.
- Dungeon tiles/objects: themed floors, wall, closed/open gate, stairs, exit, closed/open chest, switch, boss relic seal.
- Characters: Arlen map sheet and deterministic reusable NPC sheets in town/dungeon; a clearer generated Arlen world-map sprite is used on the overworld so the player stands out on markers and terrain.
- Battle: all current enemy IDs map to enemy PNGs; Arlen/Mira/Kael battle portraits render near the party side; generated party battlers provide readable right-side combat silhouettes.
- UI/title: cursor arrow, HP/empty bars, title logo, and four-star title decoration.
- Town/interior presentation: generated readable floor/wall tiles, service counters, live-text signs, props, lamps, rug, and clear south exit.

Loaded but not broadly displayed yet:

- `tile_water_b`, `tile_deep_water_b`, and `tile_bridge`.
- Batch 001 world terrain and marker PNGs are loaded but visually bypassed by the stronger procedural overworld renderer.
- Vehicle sprites: `vehicle_boat`, `vehicle_skyship`.
- Item/equipment/relic icons.
- Effect sheets.
- `ui_window_panel`; generated panel drawing remains active because 9-slice integration needs a focused readability pass.

## Town And Interior Asset Gap

Dawnford now has an intentional generated town/interior pass so it no longer relies on tiny placeholder service squares. This pass should remain as fallback until real town art exists.

Future asset batches should add the town/interior files now listed in `ASSET_MANIFEST.md` section K:

- `town_floor.png`, `town_wall.png`, `town_exit_gate.png`
- `service_inn.png`, `service_items.png`, `service_arms.png`, `service_magic.png`, `service_clinic.png`
- `prop_table.png`, `prop_crate.png`, `prop_barrel.png`, `prop_lamp.png`, `prop_rug.png`

Keep service labels as live readable text. Do not bake gameplay-critical labels into small sprites.

## Real-Asset Approach

Continue following `ASSET_IMPLEMENTATION_PLAN.md`:

- Add assets incrementally.
- Load textures with stable keys.
- Prefer image rendering when a texture exists.
- Keep generated fallback rendering when missing.

Do not require all assets at once.

## Proposed Asset Folder Structure

```text
assets/
  tiles/
    world/
    markers/
    dungeons/
    objects/
    overlays/
  characters/
  enemies/
  portraits/
  ui/
  icons/
    items/
    equipment/
    relics/
  effects/
  title/
```

This folder exists and should stay at the project root. Do not create `assets/assets/...`.

## Naming Conventions

- Lowercase snake_case filenames.
- PNG format.
- Transparent backgrounds for sprites/enemies/icons/effects/markers.
- Full-screen title backgrounds may be opaque.
- Asset IDs and filenames should match `ASSET_MANIFEST.md`.

## Tint And Recolor Strategy

- Reuse one dungeon wall/floor base where possible and tint per dungeon theme.
- Reuse settlement marker forms with palette/detail differences.
- Reuse normal enemy base forms: blob, beast, wing, knight, serpent.
- Reuse equipment category icons instead of unique icons for each item.
- Reuse magic effects by element instead of one animation per spell.

## Readability-First Rule

Readable gameplay beats decoration:

- Terrain types must be distinguishable instantly.
- Interactables must stand out.
- Player sprite must contrast against all backgrounds.
- Enemy silhouettes must be clear.
- UI text must stay highly readable.
- Service labels must be readable at normal gameplay zoom.
- Do not thicken UI borders or enlarge enemy art in ways that crowd text.

## References

- `ART_STYLE_GUIDE.md`: chosen visual direction, pixel scale, palette, shading, outline, animation, readability rules.
- `ASSET_MANIFEST.md`: exact required/optional asset checklist with filenames, sizes, priorities, and replacement targets.
- `ASSET_IMPLEMENTATION_PLAN.md`: asset folder structure, loading strategy, fallback behavior, and safe replacement order.

## What Future Agents Should Not Do With Art

- Do not copy copyrighted sprites, UI, music, logos, spell visuals, enemy designs, or maps.
- Do not add external asset packs or dependencies without explicit approval.
- Do not remove generated fallback art until replacement assets are implemented and verified.
- Do not remove generated fallback art just because a first-pass PNG exists.
- Do not create a huge number of variants before Phase 1 readability assets exist.
- Do not bake UI text into images except for title/logo artwork.
- Do not switch to a hyper-detailed style that conflicts with the current 32px tile grid.
