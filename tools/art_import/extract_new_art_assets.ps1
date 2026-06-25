param(
  [string]$SourceRoot = "D:\Projects\new_artwork",
  [string]$ProjectRoot = "D:\Projects\Endless Fantasy",
  [string]$OutRoot = "D:\Projects\Endless Fantasy\src\assets",
  [string]$SourceArchiveRoot = "D:\Projects\Endless Fantasy\src\assets\source\art_import\source_sheets"
)

$ErrorActionPreference = "Stop"

function Get-Magick {
  $cmd = Get-Command magick -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = "D:\Tools\ImageMagick\magick.exe"
  if (Test-Path $fallback) { return $fallback }
  throw "ImageMagick 'magick' was not found."
}

function Assert-PathInside([string]$Path, [string]$Root, [string]$Label) {
  $full = [IO.Path]::GetFullPath($Path)
  $rootFull = [IO.Path]::GetFullPath($Root).TrimEnd('\') + '\'
  if (!$full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
    throw "$Label path escapes root: $full"
  }
}

function Ensure-Parent([string]$Path) {
  $parent = Split-Path -Parent $Path
  if ($parent -and !(Test-Path $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }
}

function Add-CropArgs($cmdArgs, $crop) {
  if ($crop) {
    $cmdArgs.Add("-crop") | Out-Null
    $cmdArgs.Add(("{0}x{1}+{2}+{3}" -f $crop.w, $crop.h, $crop.x, $crop.y)) | Out-Null
    $cmdArgs.Add("+repage") | Out-Null
  }
}

function Add-TransparencyArgs($cmdArgs, $asset) {
  if ($asset.transparent) {
    $bg = if ($asset.background) { $asset.background } else { "#bbb4aa" }
    $fuzz = if ($asset.fuzzPercent) { $asset.fuzzPercent } else { 8 }
    $cmdArgs.Add("-alpha") | Out-Null
    $cmdArgs.Add("set") | Out-Null
    $cmdArgs.Add("-fuzz") | Out-Null
    $cmdArgs.Add("$fuzz%") | Out-Null
    $cmdArgs.Add("-transparent") | Out-Null
    $cmdArgs.Add($bg) | Out-Null
  }
}

function Add-ResizeArgs($cmdArgs, $asset) {
  if ($asset.resize) {
    $filter = if ($asset.resize.filter) { $asset.resize.filter } else { "Point" }
    $cmdArgs.Add("-filter") | Out-Null
    $cmdArgs.Add($filter) | Out-Null
    $mode = if ($asset.resize.mode) { $asset.resize.mode } else { "fit" }
    if ($mode -eq "exact") {
      $cmdArgs.Add("-resize") | Out-Null
      $cmdArgs.Add(("{0}x{1}!" -f $asset.resize.w, $asset.resize.h)) | Out-Null
    } elseif ($mode -eq "cover") {
      $cmdArgs.Add("-resize") | Out-Null
      $cmdArgs.Add(("{0}x{1}^" -f $asset.resize.w, $asset.resize.h)) | Out-Null
    } else {
      $cmdArgs.Add("-resize") | Out-Null
      $cmdArgs.Add(("{0}x{1}" -f $asset.resize.w, $asset.resize.h)) | Out-Null
    }
  }
}

function Add-PostResizeCropArgs($cmdArgs, $asset) {
  if ($asset.postResizeCrop) {
    $cmdArgs.Add("-crop") | Out-Null
    $cmdArgs.Add(("{0}x{1}+{2}+{3}" -f $asset.postResizeCrop.w, $asset.postResizeCrop.h, $asset.postResizeCrop.x, $asset.postResizeCrop.y)) | Out-Null
    $cmdArgs.Add("+repage") | Out-Null
    if ($asset.postResizeCrop.resizeBack) {
      $filter = if ($asset.postResizeCrop.filter) { $asset.postResizeCrop.filter } else { "Point" }
      $cmdArgs.Add("-filter") | Out-Null
      $cmdArgs.Add($filter) | Out-Null
      $cmdArgs.Add("-resize") | Out-Null
      $cmdArgs.Add(("{0}x{1}!" -f $asset.postResizeCrop.resizeBack.w, $asset.postResizeCrop.resizeBack.h)) | Out-Null
    }
  }
}

function Add-ExtentArgs($cmdArgs, $asset) {
  if ($asset.extent) {
    $background = if ($asset.extent.background) { $asset.extent.background } else { "none" }
    $gravity = if ($asset.extent.gravity) { $asset.extent.gravity } else { "center" }
    $cmdArgs.Add("-gravity") | Out-Null
    $cmdArgs.Add($gravity) | Out-Null
    $cmdArgs.Add("-background") | Out-Null
    $cmdArgs.Add($background) | Out-Null
    $cmdArgs.Add("-extent") | Out-Null
    $cmdArgs.Add(("{0}x{1}" -f $asset.extent.w, $asset.extent.h)) | Out-Null
  }
}

function Convert-Asset($asset, [string]$InputPath, [string]$OutputPath) {
  Ensure-Parent $OutputPath
  $cmdArgs = [System.Collections.Generic.List[string]]::new()
  $cmdArgs.Add($InputPath) | Out-Null
  Add-CropArgs $cmdArgs $asset.crop
  Add-TransparencyArgs $cmdArgs $asset
  if ($asset.trim) {
    $cmdArgs.Add("-trim") | Out-Null
    $cmdArgs.Add("+repage") | Out-Null
  }
  if ($asset.padding) {
    $cmdArgs.Add("-bordercolor") | Out-Null
    $cmdArgs.Add("none") | Out-Null
    $cmdArgs.Add("-border") | Out-Null
    $cmdArgs.Add([string]$asset.padding) | Out-Null
  }
  Add-ResizeArgs $cmdArgs $asset
  Add-PostResizeCropArgs $cmdArgs $asset
  Add-ExtentArgs $cmdArgs $asset
  if ($asset.strip) {
    $cmdArgs.Add("-strip") | Out-Null
  }
  $cmdArgs.Add($OutputPath) | Out-Null
  & $script:Magick @cmdArgs
}

function Convert-SpriteSheet($sheet, [string]$InputPath, [string]$OutputPath, [string]$TempRoot) {
  Ensure-Parent $OutputPath
  $sheetTemp = Join-Path $TempRoot $sheet.id
  if (Test-Path $sheetTemp) { Remove-Item -Path $sheetTemp -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $sheetTemp | Out-Null

  $frameFiles = @()
  for ($i = 0; $i -lt $sheet.frames.Count; $i += 1) {
    $frame = $sheet.frames[$i]
    $frameOut = Join-Path $sheetTemp ("frame_{0:00}.png" -f $i)
    $asset = [PSCustomObject]@{
      crop = $frame
      transparent = $true
      background = $sheet.background
      fuzzPercent = $sheet.fuzzPercent
      trim = $true
      padding = 1
      resize = [PSCustomObject]@{ w = $sheet.frameSize.w; h = $sheet.frameSize.h; mode = "fit"; filter = "Point" }
      extent = [PSCustomObject]@{ w = $sheet.frameSize.w; h = $sheet.frameSize.h; background = "none"; gravity = "center" }
      strip = $true
    }
    Convert-Asset $asset $InputPath $frameOut
    $frameFiles += $frameOut
  }

  $geometry = ("{0}x{1}+0+0" -f $sheet.frameSize.w, $sheet.frameSize.h)
  $tile = ("{0}x{1}" -f $sheet.layout.cols, $sheet.layout.rows)
  & $script:Magick montage @frameFiles -background none -tile $tile -geometry $geometry $OutputPath
}

$script:Magick = Get-Magick

if (!(Test-Path $SourceRoot)) { throw "Source artwork folder not found: $SourceRoot" }
Assert-PathInside $OutRoot $ProjectRoot "Output"

$mapsRoot = Join-Path $ProjectRoot "tools\art_import\crop_maps"
if (!(Test-Path $mapsRoot)) { throw "Crop map folder not found: $mapsRoot" }

$folders = @(
  "tiles\world", "tiles\markers", "tiles\dungeons",
  "objects", "characters", "portraits", "enemies\common", "enemies\bosses",
  "battle\backgrounds", "ui", "icons", "effects"
)
foreach ($folder in $folders) {
  New-Item -ItemType Directory -Force -Path (Join-Path $OutRoot $folder) | Out-Null
}
New-Item -ItemType Directory -Force -Path $SourceArchiveRoot | Out-Null

$tempRoot = Join-Path $OutRoot ".tmp_art_import"
if (Test-Path $tempRoot) { Remove-Item -Path $tempRoot -Recurse -Force }
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$usedSources = New-Object System.Collections.Generic.HashSet[string]
$mapFiles = Get-ChildItem -Path $mapsRoot -Filter "*.json" | Sort-Object Name
foreach ($mapFile in $mapFiles) {
  $map = Get-Content -Raw -Path $mapFile.FullName | ConvertFrom-Json
  if ($map.assets) {
  foreach ($asset in @($map.assets)) {
    $input = Join-Path $SourceRoot $asset.source
    $output = Join-Path $OutRoot $asset.output
    if (!(Test-Path $input)) { throw "Missing source for $($asset.id): $input" }
    Assert-PathInside $input $SourceRoot "Input"
    Assert-PathInside $output $OutRoot "Output"
    [void]$usedSources.Add($asset.source)
    Convert-Asset $asset $input $output
    Write-Host "asset $($asset.id) -> $($asset.output)"
  }
  }
  if ($map.sheets) {
  foreach ($sheet in @($map.sheets)) {
    $input = Join-Path $SourceRoot $sheet.source
    $output = Join-Path $OutRoot $sheet.output
    if (!(Test-Path $input)) { throw "Missing sheet source for $($sheet.id): $input" }
    Assert-PathInside $input $SourceRoot "Input"
    Assert-PathInside $output $OutRoot "Output"
    [void]$usedSources.Add($sheet.source)
    Convert-SpriteSheet $sheet $input $output $tempRoot
    Write-Host "sheet $($sheet.id) -> $($sheet.output)"
  }
  }
}

foreach ($rel in $usedSources) {
  $src = Join-Path $SourceRoot $rel
  $safe = ($rel -replace "[:\\/]+", "_")
  Copy-Item -Path $src -Destination (Join-Path $SourceArchiveRoot $safe) -Force
}

Remove-Item -Path $tempRoot -Recurse -Force
Write-Host "Done. Assets written to $OutRoot"
Write-Host "ImageMagick: $script:Magick"
