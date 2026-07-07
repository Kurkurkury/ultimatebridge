param(
  [string]$ExtensionId
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$ExtensionDir = Join-Path $RepoRoot 'extension'
$ManifestPath = Join-Path $ExtensionDir 'manifest.json'
$ArtifactsDir = Join-Path $RepoRoot 'artifacts\browser'
$JsonPath = Join-Path $ArtifactsDir 'extension-load-reload-checklist.json'
$MarkdownPath = Join-Path $ArtifactsDir 'extension-load-reload-checklist.md'

if ($ExtensionId -and $ExtensionId -notmatch '^[a-p]{32}$') {
  throw 'ExtensionId must be a 32-character Chrome/Edge extension id using letters a through p.'
}

$Manifest = if (Test-Path -LiteralPath $ManifestPath) {
  Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
} else {
  $null
}

$Checklist = [ordered]@{
  protocol = 'ULTIMATEBRIDGE_EXTENSION_LOAD_RELOAD_CHECKLIST_V1'
  mode = 'GUIDE_ONLY'
  repoRoot = $RepoRoot.Path
  extensionDir = $ExtensionDir
  manifestPath = $ManifestPath
  extensionId = $(if ($ExtensionId) { $ExtensionId } else { $null })
  manifestExists = Test-Path -LiteralPath $ManifestPath
  manifestName = $Manifest.name
  manifestVersion = $Manifest.manifest_version
  chromeUrl = 'chrome://extensions'
  edgeUrl = 'edge://extensions'
  steps = @(
    'Open Chrome or Edge extensions page.',
    'Enable Developer mode.',
    'Click Load unpacked.',
    'Select the repository extension directory.',
    'Copy the generated extension id from the browser.',
    'Run npm run native-host:extension-id:plan -- -ExtensionId <id>.',
    'Run npm run native-host:install:rehearsal -- -ExtensionId <id>.',
    'Open the extension popup.',
    'Click Show browser/native diagnostics.',
    'Click Copy browser/native diagnostics if a report is needed.',
    'Use Run native read-only smoke only when intentionally testing the real native host.'
  )
  reloadSteps = @(
    'After code or manifest changes, return to the browser extensions page.',
    'Click Reload on the unpacked UltimateBridge extension.',
    'Open the popup again.',
    'Run Show browser/native diagnostics.',
    'Confirm the extension id did not change unless the extension was loaded from a different folder.'
  )
  safety = @(
    'This checklist script is guide-only.',
    'It does not load the browser extension automatically.',
    'It does not write browser profile settings.',
    'It does not install or modify the native host.',
    'It does not write registry keys.',
    'It does not send browser or native messages.',
    'It does not run SAFE_CHANGE.'
  )
  recommendedCommands = @(
    'npm run diagnose:local',
    'npm run native-host:extension-id:plan -- -ExtensionId <id>',
    'npm run native-host:install:rehearsal -- -ExtensionId <id>',
    'npm run verify:local'
  )
}

New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null
$Checklist | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $JsonPath -Encoding UTF8

$Markdown = @(
  '# UltimateBridge Extension Load / Reload Checklist',
  '',
  "protocol=$($Checklist.protocol)",
  "mode=$($Checklist.mode)",
  "extensionDir=$ExtensionDir",
  "manifestPath=$ManifestPath",
  "manifestExists=$($Checklist.manifestExists)",
  "extensionId=$($Checklist.extensionId)",
  '',
  '## Load steps',
  ''
) + ($Checklist.steps | ForEach-Object { "- $_" }) + @(
  '',
  '## Reload steps',
  ''
) + ($Checklist.reloadSteps | ForEach-Object { "- $_" }) + @(
  '',
  '## Safety',
  ''
) + ($Checklist.safety | ForEach-Object { "- $_" }) + @(
  '',
  '## Recommended commands',
  ''
) + ($Checklist.recommendedCommands | ForEach-Object { "- $_" }) + @('')

$Markdown -join "`n" | Set-Content -LiteralPath $MarkdownPath -Encoding UTF8

$Checklist | ConvertTo-Json -Depth 8
Write-Host "Extension checklist written: $JsonPath"
Write-Host "Extension checklist written: $MarkdownPath"
