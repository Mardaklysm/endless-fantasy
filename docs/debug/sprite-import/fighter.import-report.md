# Fighter Sprite Import Report

- Source: `D:/Tools/rembg/bg_output/fighter.png`
- Copied source: `assets_v2/source_sheets/class_sprites/fighter.png`
- Normalized sheet: `assets_v2/characters/classes/fighter_normalized.png`
- Source size: 1983x793
- Cell size: 704x512
- Sheet size: 3520x1024
- Anchor: bodyCenterX=352, feetBaselineY=464

## Mapping

| Frame | Source cell | Source bbox | Placement | Source anchor | Notes |
|---|---:|---:|---:|---:|---|
| `attack_windup_left` | r0 c0 i0 | 104,73 293x285 | 236,180 293x285 | 220,357 | First attack pose; character faces left. Alpha bbox touches source cell boundary; verify proportional split. |
| `attack_release_left` | r0 c1 i1 | 397,75 387x283 | 127,182 387x283 | 622,357 | Second attack/release pose; effect extends left. Alpha bbox touches source cell boundary; verify proportional split. |
| `walk_down_a` | r0 c2 i2 | 867,62 238x301 | 219,164 238x301 | 1000,362 | First front-facing walking pose in top row. |
| `walk_down_b` | r0 c3 i3 | 1227,62 238x301 | 217,164 238x301 | 1362,362 | Second front-facing walking pose in top row. |
| `walk_left_a` | r0 c4 i4 | 1609,62 253x301 | 205,164 253x301 | 1756,362 | First side-facing walk pose after down frames; assigned left by sheet order. |
| `walk_left_b` | r1 c0 i5 | 56,429 268x298 | 198,167 268x298 | 210,726 | Second side-facing walk pose; assigned left by sheet order. |
| `walk_right_a` | r1 c1 i6 | 477,425 266x302 | 243,163 266x302 | 586,726 | Next side-facing walk pose; assigned right by sheet order. |
| `walk_right_b` | r1 c2 i7 | 869,428 246x300 | 247,165 246x300 | 974,727 | Final side-facing walk pose; assigned right by sheet order. |
| `walk_up_a` | r1 c3 i8 | 1271,424 238x303 | 258,162 238x303 | 1365,726 | First back-facing/up walking pose. |
| `walk_up_b` | r1 c4 i9 | 1653,425 238x302 | 259,163 238x302 | 1746,726 | Second back-facing/up walking pose. |

## Verification Notes

- The source PNG alpha channel was preserved directly.
- The actual normalized sheet has transparent cells with no labels or grid.
- The debug preview adds labels, cell boxes, a cyan feet-baseline line, and a red anchor cross only for QA.
- Left/right walking labels preserve sheet order because side-facing classification can be visually subtle across the class art.
