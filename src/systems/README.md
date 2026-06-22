# Systems Modules

Scene behavior is split by domain:

- `movement/`: exploration movement, collision checks, location activation, harbor travel, and encounter triggers.
- `battle/`: battle setup, initiative flow, player/enemy actions, rewards, and battle state helpers.
- `menu/`: menus, shops, field item/magic, settings, debug menu, and dialogue helpers.
- `save/`: localStorage save and load logic.
- `audio/`: generated WebAudio synth loops and effects.

The modules preserve the existing scene-state model; this is organization, not a new engine layer.
