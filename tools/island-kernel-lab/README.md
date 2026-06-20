# Island Kernel Lab

Island Kernel Lab is an independent development utility for checking generated Greenhaven island kernel art before any runtime integration work. It does not load Phaser, does not change the current world generator, and should not be treated as game runtime code.

The current official Greenhaven kernel format is:

- 9 columns x 9 rows
- 128x128 pixels per cell
- 1152x1152 pixels total
- PNG input

Run it from the project root:

```powershell
npm run island:kernel -- --input "D:\island_kernel_greenhaven_v1_1152.png" --out "tmp/island-kernel-lab/greenhaven"
```

Use `--resize` for square generated sources such as 2048x2048 PNGs that need normalization to 1152x1152 before slicing.

Generated previews under `tmp/island-kernel-lab/` are disposable artifacts. The lab validates that a generated kernel can be reused as semantic tiles for clean single-island, large-island, and archipelago previews before any future Phaser renderer or worldgen changes are considered.
