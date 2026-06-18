# Wizard Sprite Import Report

- Source: `D:/Tools/rembg/bg_output/wizard.png`
- Copied source: `assets_v2/source_sheets/class_sprites/wizard.png`
- Normalized sheet: `assets_v2/characters/classes/wizard_normalized.png`
- Source size: 1983x793
- Cell size: 704x512
- Sheet size: 3520x1024
- Anchor: bodyCenterX=352, feetBaselineY=464

## Mapping

| Frame | Source cell | Source bbox | Placement | Source anchor | Notes |
|---|---:|---:|---:|---:|---|
| `attack_windup_left` | r0 c0 i0 | 92,74 305x265 | 156,200 305x265 | 288,338 | First attack pose; character faces left. Alpha bbox touches source cell boundary; verify proportional split. |
| `attack_release_left` | r0 c1 i1 | 397,75 396x264 | 54,201 396x264 | 695,338 | Second attack/release pose; effect extends left. Alpha bbox touches source cell boundary; verify proportional split. |
| `walk_down_a` | r0 c2 i2 | 793,65 315x274 | 132,191 315x274 | 1013,338 | First front-facing walking pose in top row. Alpha bbox touches source cell boundary; verify proportional split. |
| `walk_down_b` | r0 c3 i3 | 1253,68 173x277 | 267,188 173x277 | 1338,344 | Second front-facing walking pose in top row. |
| `walk_left_a` | r0 c4 i4 | 1624,68 184x275 | 258,190 184x275 | 1718,342 | First side-facing walk pose after down frames; assigned left by sheet order. |
| `walk_left_b` | r1 c0 i5 | 186,433 185x267 | 259,198 185x267 | 279,699 | Second side-facing walk pose; assigned left by sheet order. |
| `walk_right_a` | r1 c1 i6 | 552,424 173x276 | 266,189 173x276 | 638,699 | Next side-facing walk pose; assigned right by sheet order. |
| `walk_right_b` | r1 c2 i7 | 909,424 172x276 | 266,189 172x276 | 995,699 | Final side-facing walk pose; assigned right by sheet order. |
| `walk_up_a` | r1 c3 i8 | 1263,413 161x288 | 270,177 161x288 | 1345,700 | First back-facing/up walking pose. |
| `walk_up_b` | r1 c4 i9 | 1625,414 163x286 | 269,179 163x286 | 1708,699 | Second back-facing/up walking pose. |

## Verification Notes

- The source PNG alpha channel was preserved directly.
- The actual normalized sheet has transparent cells with no labels or grid.
- The debug preview adds labels, cell boxes, a cyan feet-baseline line, and a red anchor cross only for QA.
- Left/right walking labels preserve sheet order because side-facing classification can be visually subtle across the class art.
