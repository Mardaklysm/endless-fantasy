# Battle Task Profile

Use this profile for battle flow, enemy intent, initiative, commands, rewards, status timing, and battle presentation tasks.

## Main Files

- `src/systems/battle/battleFlow.ts`
- `src/systems/battle/battleActions.ts`
- `src/systems/battle/battleState.ts`
- `src/systems/battle/battleTypes.ts`
- `src/render/battle/drawBattle.ts`
- `src/data/enemies.ts`
- `src/data/playerSkills.ts`
- `src/data/spells.ts`
- `src/data/items.ts`
- `src/data/battleTables.ts`

Use `rg` for specific commands, status names, enemy IDs, or UI text before opening more files.

## Critical Rules

- Battles use individual initiative turns.
- Do not reintroduce all-party queued rounds.
- Only the current party member gets a command menu.
- Enemy intent is planned and visible before enemies act.
- Enemies render on the left; party battlers render on the right.
- Party battlers face left from the right side; enemy battlers face right from the left side.
- Battle presentation uses lower target/log, command, and party status panels.
- Fallen party members still receive victory XP and level-up stat gains, but level-up must not revive them or raise HP above 0.

## Validation

For battle logic changes:

```powershell
npm run build
```

Smoke-test with a random encounter or F9 debug encounter:

- Confirm one actor acts at a time.
- Confirm enemy intent is visible before enemy turns.
- Confirm Attack, Skill, Magic, Item, Defend, and Run still route correctly.
- Confirm victory returns to exploration and rewards resolve.
- For boss/progression changes, test a boss or debug path as well.

Open `agent_knowledge/gameplay-systems.md` only when changing broader gameplay rules, progression, balance, or status timing contracts.
