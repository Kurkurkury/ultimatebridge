param(
  [Parameter(Mandatory = $true)]
  [string]$ExtensionId,
  [switch]$Apply,
  [string]$PlanPath
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ArtifactsDir = Join-Path $RepoRoot 'artifacts\install'
$DefaultPlanPath = Join-Path $ArtifactsDir 'native-host-extension-id-plan.json'
$OutputPlanPath = if ($PlanPath) { $PlanPath } else { $DefaultPlanPath }
$InstallRoot = Join-Path $env:LOCALAPPDATA 'UltimateBridge\NativeHost'
$ManifestPath = Join-Path $InstallRoot 'ultimatebridge-native-host-manifest.json'
$HostName = 'com.ultimatebridge.host'
$LauncherPath = Join-Path $InstallRoot 'ultimatebridge-native-host.cmd'
$AllowedOrigin = "chrome-extension://$ExtensionId/"

if ($ExtensionId -notmatch '^[a-p]{32}$') {
  throw 'ExtensionId must be a 32-character Chrome/Edge extension id using letters a through p.'
}

$Manifest = [ordered]@{
  name = $HostName
  description = 'UltimateBridge native messaging host'
  path = $LauncherPath
  type = 'stdio'
  allowed_origins = @($AllowedOrigin)
}

$Plan = [ordered]@{
  protocol = 'ULTIMATEBRIDGE_NATIVE_HOST_EXTENSION_ID_PLAN_V1'
  mode = $(if ($Apply) { 'APPLY' } else { 'PLAN_ONLY' })
  repoRoot = $RepoRoot.Path
  extensionId = $ExtensionId
  allowedOrigin = $AllowedOrigin
  manifestPath = $ManifestPath
  manifest = $Manifest
  safety = @(
    'Default mode writes only this plan artifact.',
    'Use -Apply only after confirming the unpacked extension id in the browser.',
    'Apply mode updates only the native host manifest file when the install directory exists.',
    'This does not write registry keys, submit browser messages, run SAFE_CHANGE, upload artifacts, or modify GitHub.'
  )
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $OutputPlanPath) | Out-Null
$Plan | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPlanPath -Encoding UTF8

if ($Apply) {
  if (-not (Test-Path -LiteralPath $InstallRoot)) {
    throw "Install root missing. Run scripts/Install-NativeHost.ps1 -Apply only after reviewing the install plan: $InstallRoot"
  }
  $Manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
}

$Plan | ConvertTo-Json -Depth 8
Write-Host "Extension id plan written: $OutputPlanPath"
if (-not $Apply) {
  Write-Host 'PLAN_ONLY: native host manifest was not changed. Re-run with -Apply only after manual review.'
}
