# Island Kernel Lab

Island Kernel Lab is an independent development utility for checking generated Greenhaven island kernel art before any runtime integration work. It does not load Phaser, does not change the current world generator, and should not be treated as game runtime code.

The current Greenhaven natural kernel package format is:

- 15 columns x 15 rows
- 128x128 pixels per cell
- 1920x1920 pixels total
- PNG input plus a sibling or explicit manifest JSON
- Canonical 8-neighbor transition masks from the manifest

Run it from the project root after extracting a package:

```powershell
npm run island:kernel -- --input "tmp\island-kernel-lab\greenhaven_15x15_natural_kernel_v2_package\greenhaven_15x15_natural_kernel_v2.png" --manifest "tmp\island-kernel-lab\greenhaven_15x15_natural_kernel_v2_package\greenhaven_15x15_natural_kernel_v2_manifest.json" --out "tmp/island-kernel-lab/greenhaven-15x15-v2"
```

The tool can auto-detect a sibling `*_manifest.json` next to the PNG. It does not read ZIP files directly; extract the package first.

Generated previews under `tmp/island-kernel-lab/` are disposable artifacts. Magenta checker tiles are intentional diagnostics: they mean the generated shape requested an exact transition mask that the package does not contain. In that case the lab exits nonzero after writing the PNGs, because the kernel is not complete enough for those arbitrary generated island shapes.

The old 9x9, 1152x1152 Greenhaven kernel format remains a legacy fallback for older test images, but new work should use the 15x15 manifest package.
