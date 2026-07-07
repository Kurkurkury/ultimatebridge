param(
  [switch]$Apply,
  [switch]$Edge,
  [switch]$Chrome
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$HostName = 'com.ultimatebridge.host'
$InstallRoot = Join-Path $env:LOCALAPPDATA 'UltimateBridge\NativeHost'
$LauncherPath = Join-Path $InstallRoot 'ultimatebridge-native-host.cmd'
$ManifestPath = Join-Path $InstallRoot 'ultimatebridge-native-host-manifest.json'
$NodeHost = Join-Path $RepoRoot 'native-host\src\host.mjs'
$ArtifactsDir = Join-Path $RepoRoot 'artifacts\install'
$PlanPath = Join-Path $ArtifactsDir 'native-host-install-plan.json'
$ChromeRegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
$EdgeRegistryPath = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"

if (-not $Chrome -and -not $Edge) {
  $Chrome = $true
  $Edge = $true
}

$Manifest = [ordered]@{
  name = $HostName
  description = 'UltimateBridge native messaging host'
  path = $LauncherPath
  type = 'stdio'
  allowed_origins = @(
    'chrome-extension://__REPLACE_WITH_EXTENSION_ID__/'
  )
}

$Plan = [ordered]@{
  protocol = 'ULTIMATEBRIDGE_NATIVE_HOST_INSTALL_PLAN_V1'
  mode = $(if ($Apply) { 'APPLY' } else { 'PLAN_ONLY' })
  repoRoot = $RepoRoot.Path
  hostName = $HostName
  nodeHost = $NodeHost
  installRoot = $InstallRoot
  launcherPath = $LauncherPath
  manifestPath = $ManifestPath
  chromeRegistryPath = $(if ($Chrome) { $ChromeRegistryPath } else { $null })
  edgeRegistryPath = $(if ($Edge) { $EdgeRegistryPath } else { $null })
  requiresExtensionIdReplacement = $true
  safety = @(
    'Default mode writes only the install plan artifact.',
    'Use -Apply only after reviewing this plan.',
    'Replace __REPLACE_WITH_EXTENSION_ID__ with the real unpacked extension id before relying on browser native messaging.',
    'This does not send browser messages or run SAFE_CHANGE.'
  )
  manifest = $Manifest
}

New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null
$Plan | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $PlanPath -Encoding UTF8

if ($Apply) {
  if (-not (Test-Path -LiteralPath $NodeHost)) {
    throw "Native host script missing: $NodeHost"
  }
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
  "@echo off`r`nnode `"$NodeHost`"`r`n" | Set-Content -LiteralPath $LauncherPath -Encoding ASCII
  $Manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8
  if ($Chrome) {
    New-Item -Path $ChromeRegistryPath -Force | Out-Null
    Set-ItemProperty -Path $ChromeRegistryPath -Name '(default)' -Value $ManifestPath
  }
  if ($Edge) {
    New-Item -Path $EdgeRegistryPath -Force | Out-Null
    Set-ItemProperty -Path $EdgeRegistryPath -Name '(default)' -Value $ManifestPath
  }
}

$Plan | ConvertTo-Json -Depth 8
Write-Host "Install plan written: $PlanPath"
if (-not $Apply) {
  Write-Host 'PLAN_ONLY: no registry or install files were changed. Re-run with -Apply only after manual review.'
}
