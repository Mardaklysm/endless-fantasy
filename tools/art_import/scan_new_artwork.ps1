param(
  [string]$SourceRoot = "D:\Projects\new_artwork",
  [string]$ExtractRoot = "D:\Projects\new_artwork_extracted"
)

$ErrorActionPreference = "Stop"

function Get-Magick {
  $cmd = Get-Command magick -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = "D:\Tools\ImageMagick\magick.exe"
  if (Test-Path $fallback) { return $fallback }
  throw "ImageMagick 'magick' was not found."
}

$magick = Get-Magick

if (!(Test-Path $SourceRoot)) {
  throw "Source artwork folder not found: $SourceRoot"
}

New-Item -ItemType Directory -Force -Path $ExtractRoot | Out-Null

$zipFiles = Get-ChildItem -Path $SourceRoot -Recurse -File | Where-Object { $_.Extension -ieq ".zip" }
foreach ($zip in $zipFiles) {
  $safeName = [IO.Path]::GetFileNameWithoutExtension($zip.Name)
  $target = Join-Path $ExtractRoot $safeName
  if (!(Test-Path $target)) {
    New-Item -ItemType Directory -Force -Path $target | Out-Null
    Expand-Archive -Path $zip.FullName -DestinationPath $target -Force
  }
}

$pngFiles = Get-ChildItem -Path $SourceRoot -Recurse -File | Where-Object { $_.Extension -ieq ".png" } | Sort-Object FullName
$rows = foreach ($file in $pngFiles) {
  $dim = & $magick identify -format "%w`t%h`t%[channels]" $file.FullName
  $parts = $dim -split "`t"
  [PSCustomObject]@{
    File = $file.FullName.Substring($SourceRoot.Length + 1)
    Width = [int]$parts[0]
    Height = [int]$parts[1]
    Channels = $parts[2]
    Bytes = $file.Length
  }
}

$rows | Format-Table -AutoSize

Write-Host ""
Write-Host "PNG count: $($pngFiles.Count)"
Write-Host "ZIP count: $($zipFiles.Count)"
Write-Host "ImageMagick: $magick"
if ($zipFiles.Count -gt 0) {
  Write-Host "ZIPs extracted under: $ExtractRoot"
} else {
  Write-Host "No ZIP files found; extraction folder was not populated."
}
