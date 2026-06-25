# Render Modules

Rendering is split by surface:

- `common/`: immediate-mode helpers, transient images, panels, bars, actor/portrait/enemy fallback drawing.
- `title/`: title screen rendering.
- `world/`: overworld draw loop, semantic terrain cache, debug overlays, and location icons.
- `poi/`, `dungeon/`, `battle/`, `menu/`: surface-specific draw code.

These modules are prototype methods for `CrystalOathScene`; keep them focused on drawing and avoid adding gameplay rules here.
