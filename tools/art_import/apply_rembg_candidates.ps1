param(
  [string]$SourceRoot = "D:\Projects\new_artwork",
  [string]$ProjectRoot = "D:\Projects\Endless Fantasy",
  [string]$OutRoot = "D:\Projects\Endless Fantasy\assets_v2",
  [string]$Rembg = "D:\tools\rembg\venv_rembg\Scripts\rembg.exe",
  [string]$RembgPython = "D:\tools\rembg\venv_rembg\Scripts\python.exe",
  [string]$RembgInput = "D:\tools\rembg\bg_input\endless_fantasy",
  [string]$RembgOutput = "D:\tools\rembg\bg_output\endless_fantasy",
  [string[]]$Models = @("birefnet-general"),
  [switch]$SmokeOnly,
  [switch]$AllowCpu
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

function Safe-Name([string]$Value) {
  return ($Value -replace "[^A-Za-z0-9_.-]+", "_")
}

function Add-ResizeArgs($cmdArgs, $asset) {
  if ($asset.resize) {
    $filter = if ($asset.resize.filter) { $asset.resize.filter } else { "Point" }
    $mode = if ($asset.resize.mode) { $asset.resize.mode } else { "fit" }
    $cmdArgs.Add("-filter") | Out-Null
    $cmdArgs.Add($filter) | Out-Null
    $cmdArgs.Add("-resize") | Out-Null
    if ($mode -eq "exact") {
      $cmdArgs.Add(("{0}x{1}!" -f $asset.resize.w, $asset.resize.h)) | Out-Null
    } elseif ($mode -eq "cover") {
      $cmdArgs.Add(("{0}x{1}^" -f $asset.resize.w, $asset.resize.h)) | Out-Null
    } else {
      $cmdArgs.Add(("{0}x{1}" -f $asset.resize.w, $asset.resize.h)) | Out-Null
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

function PostProcess-Rembg([string]$InputPath, [string]$OutputPath, $asset) {
  Ensure-Parent $OutputPath
  $cmdArgs = [System.Collections.Generic.List[string]]::new()
  $cmdArgs.Add($InputPath) | Out-Null
  $cmdArgs.Add("-alpha") | Out-Null
  $cmdArgs.Add("set") | Out-Null
  $cmdArgs.Add("-trim") | Out-Null
  $cmdArgs.Add("+repage") | Out-Null
  if ($asset.padding) {
    $pad = [int]$asset.padding
    if ($pad -gt 0) {
      $cmdArgs.Add("-bordercolor") | Out-Null
      $cmdArgs.Add("none") | Out-Null
      $cmdArgs.Add("-border") | Out-Null
      $cmdArgs.Add([string]$pad) | Out-Null
    }
  }
  Add-ResizeArgs $cmdArgs $asset
  Add-ExtentArgs $cmdArgs $asset
  $cmdArgs.Add("-strip") | Out-Null
  $cmdArgs.Add($OutputPath) | Out-Null
  & $script:Magick @cmdArgs
}

function Make-RawCrop([string]$InputPath, [string]$OutputPath, $crop) {
  Ensure-Parent $OutputPath
  $cmdArgs = [System.Collections.Generic.List[string]]::new()
  $cmdArgs.Add($InputPath) | Out-Null
  if ($crop) {
    $cmdArgs.Add("-crop") | Out-Null
    $cmdArgs.Add(("{0}x{1}+{2}+{3}" -f $crop.w, $crop.h, $crop.x, $crop.y)) | Out-Null
    $cmdArgs.Add("+repage") | Out-Null
  }
  $cmdArgs.Add("-strip") | Out-Null
  $cmdArgs.Add($OutputPath) | Out-Null
  & $script:Magick @cmdArgs
}

function Get-OnnxProviders([string]$PythonPath) {
  if (!(Test-Path $PythonPath)) { throw "rembg Python not found: $PythonPath" }
  $output = & $PythonPath -c "import onnxruntime as ort; print('|'.join(ort.get_available_providers()))"
  if ($LASTEXITCODE -ne 0) { throw "Could not inspect ONNX Runtime providers with $PythonPath" }
  return @($output -split "\|" | Where-Object { $_ })
}

function Test-AccelerationAvailable([string[]]$Providers) {
  return ($Providers -contains "DmlExecutionProvider") -or ($Providers -contains "ROCMExecutionProvider")
}

function Invoke-RembgModel([string]$Model, [string]$InputPath, [string]$OutputPath) {
  Write-Host "rembg command: `"$Rembg`" p -m $Model `"$InputPath`" `"$OutputPath`""
  & $Rembg p -m $Model $InputPath $OutputPath
  if ($LASTEXITCODE -ne 0) { throw "rembg failed for model $Model" }
}

function Invoke-SmokeTest($Jobs, $SheetJobs, [string]$Model, [string[]]$Providers) {
  $smokeIn = "D:\tools\rembg\bg_input\endless_fantasy_smoke"
  $smokeOut = "D:\tools\rembg\bg_output\endless_fantasy_smoke"
  Assert-PathInside $smokeIn "D:\tools\rembg\bg_input" "rembg smoke input"
  Assert-PathInside $smokeOut "D:\tools\rembg\bg_output" "rembg smoke output"
  New-Item -ItemType Directory -Force -Path $smokeIn | Out-Null
  New-Item -ItemType Directory -Force -Path $smokeOut | Out-Null
  Get-ChildItem -Path $smokeIn -File | Remove-Item -Force
  Get-ChildItem -Path $smokeOut -File | Remove-Item -Force

  $selected = @()
  $selected += $Jobs | Where-Object { $_.asset.output -like "characters/*battle.png" } | Select-Object -First 1
  $selected += $Jobs | Where-Object { $_.asset.output -like "enemies/common/*" } | Select-Object -First 1
  $selected += $Jobs | Where-Object { $_.asset.output -like "tiles/town/prop_*" } | Select-Object -First 1
  $selected = @($selected | Where-Object { $_ } | Select-Object -First 3)
  if ($selected.Count -eq 0 -and $SheetJobs.Count -gt 0) {
    $selected += $SheetJobs | Select-Object -First 1
  }
  if ($selected.Count -eq 0) { throw "No smoke-test crops were available." }

  foreach ($job in $selected) {
    Copy-Item -Path $job.raw -Destination (Join-Path $smokeIn $job.safe) -Force
  }

  $accelText = "no"
  if (Test-AccelerationAvailable $Providers) { $accelText = "yes" }
  Write-Host "AMD/Windows acceleration providers available: $accelText"
  Write-Host "Running rembg smoke test on $($selected.Count) crops with model $Model..."
  Invoke-RembgModel $Model $smokeIn $smokeOut

  foreach ($job in $selected) {
    $out = Join-Path $smokeOut $job.safe
    if (!(Test-Path $out)) { throw "Smoke test missing output: $out" }
    $alpha = & $script:Magick identify -format "%[channels]" $out
    if ($alpha -notmatch "a") { throw "Smoke test output has no alpha channel: $out" }
  }
  Write-Host "Smoke test passed: outputs exist and include alpha."
}

$allowedModels = @("birefnet-general", "birefnet-massive", "u2net", "isnet-general-use", "u2netp")
foreach ($model in $Models) {
  if ($allowedModels -notcontains $model) {
    throw "Unsupported rembg model '$model'. Allowed: $($allowedModels -join ', ')"
  }
}

if (!(Test-Path $Rembg)) { throw "rembg not found: $Rembg" }
if (!(Test-Path $SourceRoot)) { throw "Source artwork folder not found: $SourceRoot" }

Assert-PathInside $OutRoot $ProjectRoot "Output"
Assert-PathInside $RembgInput "D:\tools\rembg\bg_input" "rembg input"
Assert-PathInside $RembgOutput "D:\tools\rembg\bg_output" "rembg output"

$script:Magick = Get-Magick
$providers = Get-OnnxProviders $RembgPython
Write-Host "ONNX Runtime providers from exact rembg venv: $($providers -join ', ')"
if (Test-AccelerationAvailable $providers) {
  Write-Host "DirectML/ROCm acceleration appears available for this AMD/Windows rembg environment."
} elseif (!$AllowCpu) {
  throw "Only CPU ONNX Runtime provider appears available. Full rembg batch was not run. Pass -AllowCpu only if CPU processing is explicitly approved."
} else {
  Write-Warning "Only CPU ONNX Runtime provider appears available; continuing because -AllowCpu was supplied."
}

$amdTools = @("amd-smi", "rocm-smi", "rocminfo") | ForEach-Object {
  $cmd = Get-Command $_ -ErrorAction SilentlyContinue
  if ($cmd) { $cmd.Source }
}
if ($amdTools.Count -gt 0) {
  Write-Host "AMD monitor tools found: $($amdTools -join ', ')"
} else {
  Write-Host "No AMD command-line monitor found on PATH; provider availability is the local acceleration check."
}

$candidateRoot = Join-Path $OutRoot "previews\rembg_candidates"
New-Item -ItemType Directory -Force -Path $RembgInput | Out-Null
New-Item -ItemType Directory -Force -Path $RembgOutput | Out-Null
New-Item -ItemType Directory -Force -Path $candidateRoot | Out-Null

Get-ChildItem -Path $RembgInput -File | Remove-Item -Force
Get-ChildItem -Path $RembgOutput -File | Remove-Item -Force
if (Test-Path $candidateRoot) {
  Get-ChildItem -Path $candidateRoot -Recurse -File | Remove-Item -Force
}

$jobs = @()
$sheetJobs = @()
$mapsRoot = Join-Path $ProjectRoot "tools\art_import\crop_maps"
foreach ($mapFile in (Get-ChildItem -Path $mapsRoot -Filter "*.json" | Sort-Object Name)) {
  $map = Get-Content -Raw -Path $mapFile.FullName | ConvertFrom-Json
  foreach ($asset in @($map.assets)) {
    if (!$asset -or !$asset.transparent) { continue }
    $input = Join-Path $SourceRoot $asset.source
    if (!(Test-Path $input)) { throw "Missing rembg source for $($asset.id): $input" }
    $safe = Safe-Name($asset.output)
    $raw = Join-Path $RembgInput $safe
    Make-RawCrop $input $raw $asset.crop
    $jobs += [PSCustomObject]@{ id = $asset.id; asset = $asset; raw = $raw; safe = $safe }
  }
  foreach ($sheet in @($map.sheets)) {
    if (!$sheet) { continue }
    $input = Join-Path $SourceRoot $sheet.source
    if (!(Test-Path $input)) { throw "Missing rembg sheet source for $($sheet.id): $input" }
    for ($i = 0; $i -lt $sheet.frames.Count; $i += 1) {
      $safe = Safe-Name(("{0}_frame_{1:00}.png" -f $sheet.output, $i))
      $raw = Join-Path $RembgInput $safe
      Make-RawCrop $input $raw $sheet.frames[$i]
      $sheetJobs += [PSCustomObject]@{ sheet = $sheet; index = $i; raw = $raw; safe = $safe }
    }
  }
}

Invoke-SmokeTest $jobs $sheetJobs $Models[0] $providers
if ($SmokeOnly) {
  Write-Host "SmokeOnly supplied; full rembg batch was not run."
  exit 0
}

foreach ($model in $Models) {
  Get-ChildItem -Path $RembgOutput -File | Remove-Item -Force
  Write-Host "Running rembg model '$model' on $($jobs.Count + $sheetJobs.Count) crops..."
  Invoke-RembgModel $model $RembgInput $RembgOutput

foreach ($job in $jobs) {
  $asset = $job.asset
  $final = Join-Path $OutRoot $asset.output
  $candidateBase = Join-Path $candidateRoot ([IO.Path]::ChangeExtension($asset.output, $null))
  $colorkey = $candidateBase + "_colorkey.png"
  $rembgCandidate = $candidateBase + "_rembg_" + $model + ".png"
  Ensure-Parent $colorkey
  if (Test-Path $final) { Copy-Item -Path $final -Destination $colorkey -Force }
  $rembgRaw = Join-Path $RembgOutput $job.safe
  if (!(Test-Path $rembgRaw)) { throw "Missing rembg output for $($job.id): $rembgRaw" }
  PostProcess-Rembg $rembgRaw $rembgCandidate $asset
  $promote = $false
  if ($asset.useRembgFinal -is [bool]) { $promote = $asset.useRembgFinal -and $model -eq $Models[0] }
  elseif ($asset.useRembgFinal) { $promote = [string]$asset.useRembgFinal -eq $model }
  if ($promote) {
    Copy-Item -Path $rembgCandidate -Destination $final -Force
    Write-Host "promoted rembg $model $($asset.id) -> $($asset.output)"
  } else {
    Write-Host "candidate $model $($asset.id)"
  }
}

$sheetsByOutput = $sheetJobs | Group-Object { $_.sheet.output }
foreach ($group in $sheetsByOutput) {
  $sheet = $group.Group[0].sheet
  $final = Join-Path $OutRoot $sheet.output
  $candidateBase = Join-Path $candidateRoot ([IO.Path]::ChangeExtension($sheet.output, $null))
  $colorkey = $candidateBase + "_colorkey.png"
  $rembgCandidate = $candidateBase + "_rembg_" + $model + ".png"
  Ensure-Parent $colorkey
  if (Test-Path $final) { Copy-Item -Path $final -Destination $colorkey -Force }

  $sheetTemp = Join-Path $candidateRoot (Safe-Name($sheet.id) + "_frames")
  if (Test-Path $sheetTemp) { Remove-Item -Path $sheetTemp -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $sheetTemp | Out-Null
  $frameFiles = @()
  foreach ($job in ($group.Group | Sort-Object index)) {
    $asset = [PSCustomObject]@{
      padding = 1
      resize = [PSCustomObject]@{ w = $sheet.frameSize.w; h = $sheet.frameSize.h; mode = "fit"; filter = "Point" }
      extent = [PSCustomObject]@{ w = $sheet.frameSize.w; h = $sheet.frameSize.h; background = "none"; gravity = "center" }
    }
    $frameOut = Join-Path $sheetTemp ("frame_{0:00}.png" -f $job.index)
    PostProcess-Rembg (Join-Path $RembgOutput $job.safe) $frameOut $asset
    $frameFiles += $frameOut
  }
  Ensure-Parent $rembgCandidate
  $geometry = ("{0}x{1}+0+0" -f $sheet.frameSize.w, $sheet.frameSize.h)
  $tile = ("{0}x{1}" -f $sheet.layout.cols, $sheet.layout.rows)
  & $script:Magick montage @frameFiles -background none -tile $tile -geometry $geometry $rembgCandidate
  $promote = $false
  if ($sheet.useRembgFinal -is [bool]) { $promote = $sheet.useRembgFinal -and $model -eq $Models[0] }
  elseif ($sheet.useRembgFinal) { $promote = [string]$sheet.useRembgFinal -eq $model }
  if ($promote) {
    Copy-Item -Path $rembgCandidate -Destination $final -Force
    Write-Host "promoted rembg $model sheet $($sheet.id) -> $($sheet.output)"
  } else {
    Write-Host "sheet candidate $model $($sheet.id)"
  }
}
}

Write-Host "rembg candidates written under $candidateRoot"
Write-Host "rembg default model: $($Models[0])"
Write-Host "fallback models supported: birefnet-massive, u2net, isnet-general-use, u2netp"
Write-Host "last rembg command pattern: `"$Rembg`" p -m $($Models[-1]) `"$RembgInput`" `"$RembgOutput`""
