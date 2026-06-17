# Testing And Validation

There are no automated gameplay tests yet. Validation is currently a combination of TypeScript/build checks and manual browser smoke testing.

## Build Check

Run from `D:\Projects\Endless Fantasy`:

```powershell
npm run build
```

This runs `tsc && vite build`.

Known warning: Vite may warn that the Phaser bundle chunk is large. That is expected unless the bundling strategy changes.

## Browser Startup Test

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Expected:

- Page title is `Crystal Oath: Dawn of the Four Stars`.
- One 960x540 canvas appears.
- Title screen is visible.
- Browser console has no errors.

## New Game Test

- Select New Game.
- Intro dialogue appears in Dawnford.
- Advance dialogue with Enter/Z.
- Player ends in Dawnford town interior.

## Load/Save Test

- Start a game.
- Open menu with Escape.
- Save where allowed.
- Reload page or return to title.
- Load Game restores progress.
- Test inn save and tent save when relevant.

## Movement And Map Entry Test

- Move with arrow keys/WASD.
- Press one direction and confirm the player visibly walks one tile rather than teleporting.
- Hold a direction and confirm the player continues smoothly tile-by-tile.
- Release the held direction and confirm the player stops cleanly after the current tile step.
- Hold Shift while moving and confirm movement is faster but still interpolated tile movement.
- Confirm there is no snap-forward-then-reset-back behavior during or after a step.
- Confirm the camera follows the interpolated visual position without a visible reset.
- Exit Dawnford through the south gate.
- Confirm pressing south while already standing on Dawnford's south gate exits to the overworld.
- Walk on world terrain.
- Enter a town/location by stepping onto it.
- Confirm town/dungeon/location entry occurs after the tile step completes, not mid-step.
- Confirm random encounters trigger only after completed steps, not mid-step.
- Verify blocked terrain rules when testing boat/skyship flags.
- Confirm collision does not jitter or leave the player visually/logically between tiles.
- Confirm the overworld leader remains readable when standing on a town/location marker.

## Battle Test

- Trigger a random encounter by walking or use F9 debug encounter.
- Confirm the battle UI shows one current actor at a time.
- Confirm the battle view uses enemies on the left, party battlers on the right, lower-left target/log panel, lower-middle command panel, and lower-right party status panel.
- Confirm only the current party member gets a command menu.
- Choose Attack, select an enemy, and verify damage resolves immediately before the next actor acts.
- Confirm enemies act on their own initiative turns without waiting for all party commands.
- Confirm initiative order varies slightly between encounters/cycles while faster actors tend to act earlier.
- Confirm dead enemies are skipped and do not act.
- Verify enemies can damage party on their own turns.
- Confirm command text, HP bars, target highlight, and next-turn preview do not overlap panel borders.
- Verify victory returns to exploration.
- Verify game over appears if party falls; needs manual setup/debug.

## Item And Magic Test

- Use Potion in battle and field.
- Use Antidote on poison if available.
- Use Phoenix Ash on fallen character if available.
- Cast Mend/Ward/Spark/Ember early.
- Verify spell charges decrement and inns restore them.

## Level-Up And Reward Test

- Win encounters.
- Confirm XP/gold reward log.
- Confirm level-up happens when XP threshold is reached.
- Confirm stats/HP update.

## Shop / Inn / Clinic Test

- In a town, interact with item shop, arms shop, magic shop, inn, and clinic.
- Buy at least one item if gold allows.
- Rest at inn and confirm HP/spell charges restore and save occurs.
- Clinic revive requires a fallen party member; needs manual setup/debug.

## Boss / Progression Test

- Enter a dungeon.
- Confirm random encounters occur.
- Open chest.
- Activate switch.
- Pass gate.
- Use stairs.
- Fight boss.
- Confirm boss victory sets relic/story flag and autosaves.
- Confirm progression unlocks later route.

This is longer than a quick smoke test; run when changing dungeon/progression/boss/save behavior.

## No Console Error Check

Use the in-app browser or normal browser devtools after startup and after a battle/menu transition. There should be no uncaught errors.

## Manual Regression Checklist

- Title screen renders.
- New Game starts.
- Menu opens/closes.
- Settings toggle works.
- Random/debug battle starts.
- Battle commands resolve.
- Victory reward works.
- Save/load works.
- Town services work.
- Dungeon object flow works.
- Final/ending flow needs verification after progression changes.

## Known Testing Gaps

- No unit tests.
- No Playwright/browser E2E tests.
- No save-file migration tests.
- No automated balance simulation.
- No automated visual overlap checks for future asset imports.
