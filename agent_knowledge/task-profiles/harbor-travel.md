# Harbor Travel Task Profile

Use this profile for harbor destination menus, boat travel animation/state, route availability, debug harbor routing, and sailing speed behavior.

## Read First

- `agent_knowledge/code-map.md`
- This profile

## Likely Source Files

- `src/systems/world/harborTravel.ts`
- `src/systems/world/boatTravel.ts`
- `src/world/semantic/boatNavigation.ts` only if route/path logic changes
- `src/systems/menu/menuActions.ts` only if menu UI changes
- `src/systems/save/saveGame.ts` and `src/systems/save/loadGame.ts` only if persistence changes
- `src/scene/CrystalOathScene.ts` or `src/scene/sceneState.ts` only if scene-owned state changes
- `src/input/sceneInput.ts` only if debug keys/input changes

## Rules

- Harbor debug routes must use real generated harbor data.
- Debug routes must not be written back into generated world data.
- Preserve current 8-direction / 45-degree boat movement.
- Preserve normal route locks/costs when the debug toggle is off.
- Speed multipliers should affect only boat travel progress unless explicitly asked otherwise.
- Route planning failures should log, disable, or hide safely, not crash.

## Validation

```powershell
npm run build
git diff --check
```

Run `npm test` only if `src/world/semantic` or world generation validation changed.

Use browser smoke only if the user asks or visual arrival/movement behavior changed and cannot be verified by build/static review.
