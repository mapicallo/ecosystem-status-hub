# Builds a Chrome Web Store / Edge-ready ZIP: dist/ecosystem-status-hub-<version>.zip
# Version is read from manifest.json (single source of truth).

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$ManifestPath = Join-Path $Root "manifest.json"

if (-not (Test-Path $ManifestPath)) {
  Write-Error "manifest.json not found at $ManifestPath"
}

$manifest = Get-Content $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$ver = $manifest.version
if (-not $ver) {
  Write-Error "manifest.json has no version field"
}

$Dist = Join-Path $Root "dist"
$Staging = Join-Path $Dist "staging-$ver"
$ZipName = "ecosystem-status-hub-$ver.zip"
$ZipPath = Join-Path $Dist $ZipName

New-Item -ItemType Directory -Force -Path $Dist | Out-Null
if (Test-Path $Staging) {
  Remove-Item $Staging -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $Staging | Out-Null

$items = @(
  "manifest.json",
  "background.js",
  "data",
  "icons",
  "panel",
  "popup",
  "LICENSE"
)

foreach ($item in $items) {
  $src = Join-Path $Root $item
  if (-not (Test-Path $src)) {
    Write-Warning "Skip missing path: $item"
    continue
  }
  $dest = Join-Path $Staging $item
  Copy-Item $src $dest -Recurse -Force
}

if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

# Zip contents = extension root (manifest.json at archive root)
Get-ChildItem -LiteralPath $Staging | Compress-Archive -DestinationPath $ZipPath -Force

Remove-Item $Staging -Recurse -Force

Write-Host ""
Write-Host "Store package ready:"
Write-Host "  $ZipPath"
Write-Host ""
