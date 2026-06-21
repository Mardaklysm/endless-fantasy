# Terrain Material Extractor

Builds an approved-subset terrain material pack from generated 8x8 candidate atlases.

```powershell
python tools\terrain-material-extractor\extract_terrain_materials.py --source-dir D:\atlas --output-dir D:\atlas\output
```

The editable `terrain_materials_v2_selection.json` in the output folder records approved and rejected semantic slots. Only entries marked `qualityFlag: "approved"` are exported to `approved_materials/` and included in the zip. Rejected slots are reported as missing future regeneration needs, not production assets.

The optional generated approved atlas is only a dense preview artifact and does not imply a fixed runtime atlas.
