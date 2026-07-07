param(
  [switch]$RunDiagnostics
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$PackageJson = Join-Path $RepoRoot 'package.json'
$ExtensionManifest = Join-Path $RepoRoot 'extension\manifest.json'
$NativeHost = Join-Path $RepoRoot 'native-host\src\host.mjs'
$Popup = Join-Path $RepoRoot 'extension\src\popup\popup.html'

function Test-PathItem($Label, $Path) {
  [pscustomobject]@{
    label = $Label
    path = $Path
    exists = Test-Path -LiteralPath $Path
  }
}

$Checks = @(
  (Test-PathItem 'package.json' $PackageJson),
  (Test-PathItem 'extension manifest' $ExtensionManifest),
  (Test-PathItem 'native host' $NativeHost),
  (Test-PathItem 'popup' $Popup)
)

$Node = Get-Command node -ErrorAction SilentlyContinue
$Npm = Get-Command npm -ErrorAction SilentlyContinue
$Pwsh = Get-Command pwsh -ErrorAction SilentlyContinue

$Status = [pscustomobject]@{
  protocol = 'ULTIMATEBRIDGE_LAUNCHER_PLAN_V1'
  repoRoot = $RepoRoot.Path
  nodeAvailable = [bool]$Node
  npmAvailable = [bool]$Npm
  pwshAvailable = [bool]$Pwsh
  requiredFiles = $Checks
  recommendedCommands = @(
    'npm run diagnose:local',
    'npm run verify:local',
    'npm run install:native-host:plan',
    'Load unpacked extension from extension folder in Chrome or Edge'
  )
  safety = @(
    'Launcher does not install or apply changes automatically.',
    'Native host install requires explicit Install-NativeHost.ps1 -Apply.',
    'Browser send/apply remains manual gated.'
  )
}

$Status | ConvertTo-Json -Depth 6

if ($RunDiagnostics) {
  Push-Location $RepoRoot
  try {
    npm run diagnose:local
  } finally {
    Pop-Location
  }
}

if (-not $Node -or -not $Npm -or -not $Pwsh -or ($Checks | Where-Object { -not $_.exists })) {
  exit 1
}
