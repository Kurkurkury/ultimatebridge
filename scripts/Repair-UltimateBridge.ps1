param(
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ArtifactsDir = Join-Path $RepoRoot 'artifacts\repair'
$PlanPath = Join-Path $ArtifactsDir 'repair-plan.json'

$Checks = @(
  [ordered]@{ name = 'package.json'; path = Join-Path $RepoRoot 'package.json'; exists = Test-Path (Join-Path $RepoRoot 'package.json') },
  [ordered]@{ name = 'extension manifest'; path = Join-Path $RepoRoot 'extension\manifest.json'; exists = Test-Path (Join-Path $RepoRoot 'extension\manifest.json') },
  [ordered]@{ name = 'native host'; path = Join-Path $RepoRoot 'native-host\src\host.mjs'; exists = Test-Path (Join-Path $RepoRoot 'native-host\src\host.mjs') },
  [ordered]@{ name = 'verify local'; path = Join-Path $RepoRoot 'scripts\verify-local.mjs'; exists = Test-Path (Join-Path $RepoRoot 'scripts\verify-local.mjs') },
  [ordered]@{ name = 'diagnose local'; path = Join-Path $RepoRoot 'scripts\diagnose-local.mjs'; exists = Test-Path (Join-Path $RepoRoot 'scripts\diagnose-local.mjs') }
)

$Plan = [ordered]@{
  protocol = 'ULTIMATEBRIDGE_REPAIR_PLAN_V1'
  mode = $(if ($Apply) { 'APPLY' } else { 'PLAN_ONLY' })
  repoRoot = $RepoRoot.Path
  checks = $Checks
  recommendedActions = @(
    'Run npm run diagnose:local',
    'Run npm run verify:local',
    'Reload unpacked extension from extension folder',
    'Review artifacts/local-diagnostics/latest.md',
    'Review artifacts/local-verification/latest.md',
    'Run npm run install:native-host:plan before any native host registry apply'
  )
  safety = @(
    'Repair script is plan-only by default.',
    'Apply mode only runs npm install when package-lock.json exists and node_modules is missing.',
    'No browser send, SAFE_CHANGE apply, rollback, upload, git push, or merge is performed.'
  )
}

New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null
$Plan | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $PlanPath -Encoding UTF8

if ($Apply) {
  $PackageLock = Join-Path $RepoRoot 'package-lock.json'
  $NodeModules = Join-Path $RepoRoot 'node_modules'
  if ((Test-Path -LiteralPath $PackageLock) -and -not (Test-Path -LiteralPath $NodeModules)) {
    Push-Location $RepoRoot
    try {
      npm install
    } finally {
      Pop-Location
    }
  }
}

$Plan | ConvertTo-Json -Depth 8
Write-Host "Repair plan written: $PlanPath"
if (-not $Apply) {
  Write-Host 'PLAN_ONLY: no repair action was applied. Re-run with -Apply only after manual review.'
}
