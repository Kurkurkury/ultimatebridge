param(
  [string]$ExtensionId,
  [switch]$Chrome,
  [switch]$Edge
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$HostName = 'com.ultimatebridge.host'
$InstallRoot = Join-Path $env:LOCALAPPDATA 'UltimateBridge\NativeHost'
$LauncherPath = Join-Path $InstallRoot 'ultimatebridge-native-host.cmd'
$ManifestPath = Join-Path $InstallRoot 'ultimatebridge-native-host-manifest.json'
$NodeHost = Join-Path $RepoRoot 'native-host\src\host.mjs'
$ArtifactsDir = Join-Path $RepoRoot 'artifacts\install'
$ReportPath = Join-Path $ArtifactsDir 'native-host-install-rehearsal.json'
$ChromeRegistryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$HostName"
$EdgeRegistryPath = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$HostName"

if (-not $Chrome -and -not $Edge) {
  $Chrome = $true
  $Edge = $true
}

if ($ExtensionId -and $ExtensionId -notmatch '^[a-p]{32}$') {
  throw 'ExtensionId must be a 32-character Chrome/Edge extension id using letters a through p.'
}

$ExpectedAllowedOrigin = if ($ExtensionId) { "chrome-extension://$ExtensionId/" } else { 'chrome-extension://__REPLACE_WITH_EXTENSION_ID__/' }
$ExpectedManifest = [ordered]@{
  name = $HostName
  description = 'UltimateBridge native messaging host'
  path = $LauncherPath
  type = 'stdio'
  allowed_origins = @($ExpectedAllowedOrigin)
}

function Get-RegistryDefaultValue($Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }
  try {
    return (Get-Item -LiteralPath $Path).GetValue('')
  } catch {
    return $null
  }
}

function Read-JsonFile($Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }
  try {
    return Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

$ExistingManifest = Read-JsonFile $ManifestPath
$ChromeRegistryValue = if ($Chrome) { Get-RegistryDefaultValue $ChromeRegistryPath } else { $null }
$EdgeRegistryValue = if ($Edge) { Get-RegistryDefaultValue $EdgeRegistryPath } else { $null }

$Checks = @(
  [ordered]@{ name = 'repoRootExists'; ok = Test-Path -LiteralPath $RepoRoot; path = $RepoRoot.Path },
  [ordered]@{ name = 'nodeHostExists'; ok = Test-Path -LiteralPath $NodeHost; path = $NodeHost },
  [ordered]@{ name = 'installRootExists'; ok = Test-Path -LiteralPath $InstallRoot; path = $InstallRoot },
  [ordered]@{ name = 'launcherExists'; ok = Test-Path -LiteralPath $LauncherPath; path = $LauncherPath },
  [ordered]@{ name = 'manifestExists'; ok = Test-Path -LiteralPath $ManifestPath; path = $ManifestPath },
  [ordered]@{ name = 'manifestNameMatches'; ok = [bool]($ExistingManifest -and $ExistingManifest.name -eq $HostName); expected = $HostName; actual = $ExistingManifest.name },
  [ordered]@{ name = 'manifestPathMatches'; ok = [bool]($ExistingManifest -and $ExistingManifest.path -eq $LauncherPath); expected = $LauncherPath; actual = $ExistingManifest.path },
  [ordered]@{ name = 'manifestAllowedOriginMatches'; ok = [bool]($ExistingManifest -and @($ExistingManifest.allowed_origins) -contains $ExpectedAllowedOrigin); expected = $ExpectedAllowedOrigin; actual = @($ExistingManifest.allowed_origins) },
  [ordered]@{ name = 'chromeRegistryValueMatches'; ok = [bool]((-not $Chrome) -or ($ChromeRegistryValue -eq $ManifestPath)); expected = $(if ($Chrome) { $ManifestPath } else { $null }); actual = $ChromeRegistryValue },
  [ordered]@{ name = 'edgeRegistryValueMatches'; ok = [bool]((-not $Edge) -or ($EdgeRegistryValue -eq $ManifestPath)); expected = $(if ($Edge) { $ManifestPath } else { $null }); actual = $EdgeRegistryValue }
)

$Issues = @($Checks | Where-Object { -not $_.ok } | ForEach-Object { $_.name })
$Report = [ordered]@{
  protocol = 'ULTIMATEBRIDGE_NATIVE_HOST_REAL_INSTALL_REHEARSAL_V1'
  mode = 'READ_ONLY_REHEARSAL'
  repoRoot = $RepoRoot.Path
  hostName = $HostName
  extensionId = $(if ($ExtensionId) { $ExtensionId } else { $null })
  expectedAllowedOrigin = $ExpectedAllowedOrigin
  installRoot = $InstallRoot
  launcherPath = $LauncherPath
  manifestPath = $ManifestPath
  chromeRegistryPath = $(if ($Chrome) { $ChromeRegistryPath } else { $null })
  edgeRegistryPath = $(if ($Edge) { $EdgeRegistryPath } else { $null })
  chromeRegistryValue = $ChromeRegistryValue
  edgeRegistryValue = $EdgeRegistryValue
  expectedManifest = $ExpectedManifest
  existingManifest = $ExistingManifest
  checks = $Checks
  status = $(if ($Issues.Count -eq 0) { 'PASS' } else { 'REVIEW_NEEDED' })
  issues = $Issues
  nextRecommendedActions = @(
    'Run npm run install:native-host:plan and review the plan.',
    'Run npm run native-host:extension-id:plan -- -ExtensionId <id> after copying the real browser extension id.',
    'Use explicit -Apply only after manual review if installRoot, manifest, or registry values are missing.',
    'Reload the unpacked browser extension after install changes.'
  )
  safety = @(
    'This rehearsal is read-only.',
    'It does not write registry keys.',
    'It does not write native host manifests.',
    'It does not run SAFE_CHANGE.',
    'It does not send browser or native messages.',
    'It does not upload artifacts or modify GitHub.'
  )
}

New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null
$Report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
$Report | ConvertTo-Json -Depth 10
Write-Host "Native host install rehearsal written: $ReportPath"
