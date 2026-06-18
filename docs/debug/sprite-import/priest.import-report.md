# Priest Sprite Import Report

- Source: `D:/Tools/rembg/bg_output/priest.png`
- Copied source: `assets_v2/source_sheets/class_sprites/priest.png`
- Normalized sheet: `assets_v2/characters/classes/priest_normalized.png`
- Source size: 1983x793
- Cell size: 704x512
- Sheet size: 3520x1024
- Anchor: bodyCenterX=352, feetBaselineY=464

## Mapping

| Frame | Source cell | Source bbox | Placement | Source anchor | Notes |
|---|---:|---:|---:|---:|---|
| `attack_windup_left` | r0 c0 i0 | 126,87 219x259 | 224,206 219x259 | 254,345 | First attack pose; character faces left. |
| `attack_release_left` | r0 c1 i1 | 426,113 358x236 | 82,229 358x236 | 696,348 | Second attack/release pose; effect extends left. |
| `walk_down_a` | r0 c2 i2 | 911,96 169x254 | 258,211 169x254 | 1005,349 | First front-facing walking pose in top row. |
| `walk_down_b` | r0 c3 i3 | 1273,99 161x251 | 264,214 161x251 | 1361,349 | Second front-facing walking pose in top row. |
| `walk_left_a` | r0 c4 i4 | 1673,96 162x253 | 259,212 162x253 | 1766,348 | First side-facing walk pose after down frames; assigned left by sheet order. |
| `walk_left_b` | r1 c0 i5 | 165,421 155x255 | 267,210 155x255 | 250,675 | Second side-facing walk pose; assigned left by sheet order. |
| `walk_right_a` | r1 c1 i6 | 572,428 160x247 | 262,218 160x247 | 662,674 | Next side-facing walk pose; assigned right by sheet order. |
| `walk_right_b` | r1 c2 i7 | 927,426 160x252 | 264,213 160x252 | 1015,677 | Final side-facing walk pose; assigned right by sheet order. |
| `walk_up_a` | r1 c3 i8 | 1290,417 158x262 | 279,203 158x262 | 1363,678 | First back-facing/up walking pose. |
| `walk_up_b` | r1 c4 i9 | 1666,414 159x266 | 277,199 159x266 | 1741,679 | Second back-facing/up walking pose. |

## Verification Notes

- The source PNG alpha channel was preserved directly.
- The actual normalized sheet has transparent cells with no labels or grid.
- The debug preview adds labels, cell boxes, a cyan feet-baseline line, and a red anchor cross only for QA.
- Left/right walking labels preserve sheet order because side-facing classification can be visually subtle across the class art.
