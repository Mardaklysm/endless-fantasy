# Crystal Oath Art Style Guide

## Chosen Direction

Crystal Oath should use clean, readable retro pixel art: bright enough to separate terrain and enemies instantly, but restrained enough that menus and combat text remain the star of the interface. The target is a compact top-down JRPG look with strong silhouettes, clear tile language, and modest animation. Assets should feel handmade and original, not like traced or renamed art from any existing series.

The current game renders a 960x540 Phaser canvas with `pixelArt: true`, a 32px world/dungeon grid, generated 32px tiles, small map actors, 22x28 battle portraits, and large code-drawn battle enemies. Final art should fit those constraints instead of forcing a new renderer.

## Pixel Scale

- Canvas/internal resolution: 960x540.
- Map grid: 32x32 display pixels per tile.
- Recommended source tile size: 16x16 PNG, displayed at 2x.
- Recommended UI/icon source scale: 16x16 or 24x24 PNG, displayed at 1x or 2x depending placement.
- Recommended battle enemy source scale: draw at source size and upscale only if needed. Keep normal enemies around 48x48 source; bosses around 80x80 to 96x96 source.
- Disable smoothing for all pixel assets. Keep hard edges.

## Tile Size

Use 16x16 source tiles designed to scale cleanly to the existing 32x32 grid. Tiles should read as complete terrain at a glance without noisy micro-detail. Variants are allowed only when they improve orientation, such as water animation frames or a few dungeon floor palettes.

## Character Sprite Size

- Map character frames: 16x16 source with transparent background, displayed at 2x inside one 32x32 tile.
- Animation: 4 directions, 2 walk frames per direction plus idle can reuse frame 0.
- Sheet layout: 2 columns x 4 rows, 32x64 source PNG per character sheet.
- Keep the head and torso readable at 16x16. Avoid thin weapons or hair strands that vanish when scaled.

## Enemy Sprite Sizes

- Normal enemies: 48x48 source PNG, transparent background.
- Large normal enemies: 64x64 source PNG when the silhouette needs width, such as Glass Roc or Void Serpent.
- Bosses: 96x96 source PNG, transparent background. Eclipse Crown may use 128x96 if needed, but 96x96 is preferred.
- Enemy sprites should preserve the current battle layout: enemies sit on the left/top area, names below, HP bars below that. Do not exceed roughly 128 display pixels tall for normal enemies or 180 display pixels tall for bosses without changing layout.

## Portrait Size

- Battle/status portraits: 32x40 source PNG, transparent or dark framed background.
- Current code draws 22x28 portraits scaled 2x in battle. A 32x40 replacement leaves enough expression while still fitting the party column.
- Dialogue portraits are optional until the UI supports them. If added later, use 64x64 source portraits.

## UI Frame Style

- Keep the current readable dark-blue panel direction.
- Window fill: near-black navy or deep indigo.
- Border: one bright outer line and one muted inner line.
- Cursor: simple bright triangular arrow or small star marker.
- Bars: clean rectangular HP/status bars, no heavy gradients.
- Text stays as live rendered text for now. Do not bake text into UI art except the title logo.

## Color Palette Guidance

Use limited local palettes with 3-5 colors per asset:

- UI: deep navy, blue-gray border, off-white text accent, pale gold highlights.
- Plains: medium green, lighter grass marks, muted dark green clusters.
- Forest: deeper green body, dark canopy shadow, light moss edge.
- Hills/mountains: warm gray/brown for hills, cool gray for mountains, snow/highlight only at peak.
- Water: blue/cyan for shallow water, deeper navy for deep water.
- Desert: ochre/sand, muted orange shadow, pale highlight.
- Fire dungeon: ember red, dark char, orange accent.
- Water dungeon: teal, deep blue wall, pale cyan accent.
- Wind dungeon: cool slate, glass cyan, pale cloud highlight.
- Final dungeon: dark violet, black-blue, gold/pale purple accent.

Avoid single-hue everything. Each area should have one dominant terrain hue plus one accent hue.

## Shading Rules

- Use one consistent top-left light source.
- Use 1px dark outline or dark edge on important sprites, especially map characters, icons, and enemies.
- Use 1px selective highlights, not pillow shading.
- Avoid dithering unless it improves material readability at small size.
- Tiles should be flatter than enemies so the player and interactables stand out.

## Outline Rules

- Map sprites: dark outline on outer contour, lighter internal contrast only where needed.
- Enemies: strong readable contour; boss outlines can be heavier.
- Tiles: no full black outlines except entrances, chests, gates, and interactables.
- UI: crisp rectangular borders, no ornate frames that consume text space.

## Animation Rules

- Map movement: 2 walk frames per direction is enough.
- Water: 2 or 3 frame loop optional.
- Effects: 4 frame loops preferred, 6 frames maximum.
- Enemy idle animation is optional. If added, use subtle 2 frame bob/blink and keep HP/name positions stable.
- Do not animate UI panels except cursor blink.

## Readability Rules

- The player sprite must always contrast against grass, town floors, dungeon floors, and roads.
- Entrances must be recognizable without text labels.
- Chests, switches, doors, stairs, and boss tiles are gameplay-critical; make them brighter and more iconic than floor detail.
- Normal enemy silhouettes should differ by base shape: blob, beast, winged, armored, serpent.
- Bosses should be unique, larger, and strongly themed.
- Keep transparent padding consistent so sprites do not jitter when swapped.

## What Not To Do

- Do not copy Final Fantasy sprites, enemy designs, UI frames, spell visuals, logos, or names.
- Do not use hyper-detailed 32-color sprites that blur at the current canvas scale.
- Do not create dozens of terrain variants before the core readable set exists.
- Do not bake UI text into images except the logo/title treatment.
- Do not rely on low contrast, subtle outlines, or tiny details for gameplay meaning.
- Do not introduce a new art pipeline that requires the whole game to be rewritten.

## Example Asset Descriptions

- Plains tile: simple green base with 2-3 short grass marks, no border, readable under a red-clad party leader.
- Forest tile: dark green canopy clusters on a green floor, visually denser than plains but not black.
- Dawnford marker: small warm-roof castle/town icon that fills most of a 16x16 source tile and reads as safe.
- Party leader: red-cloaked front-line traveler with pale face, dark hair/helmet shape, clear boots, no thin sword on map sprite.
- Slimebud: round plant-like blob with two bright eyes and leaf nubs; can share blob base with Mossling and Eclipse Shade via palette and silhouette tweaks.
- Rootbound Troll: large hunched beast with root horns and moss shoulder shapes, visibly earth-themed but not copied from existing fantasy game monsters.
