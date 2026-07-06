param(
  [Parameter(Mandatory=$true)][string]$TaskName,
  [string]$RequestId = 'AUTO',
  [string]$RunRoot = $env:ULTIMATEBRIDGE_RUN_ROOT
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($RunRoot)) {
  $RunRoot = Join-Path $env:TEMP 'ultimatebridge\runs'
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$safeTask = ($TaskName -replace '[^A-Za-z0-9_.-]', '_')
$jobId = "${stamp}_${safeTask}_${RequestId}"
$runFolder = Join-Path $RunRoot $jobId

New-Item -ItemType Directory -Force -Path $runFolder | Out-Null

$state = [ordered]@{
  protocol = 'ULTIMATEBRIDGE_TASK_STATE_V1'
  requestId = $RequestId
  jobId = $jobId
  taskName = $TaskName
  runFolder = $runFolder
  startedAt = (Get-Date).ToString('o')
}

$state | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -Path (Join-Path $runFolder 'task-state.json')

Write-Output "ULTIMATEBRIDGE_BEGIN_TASK_OK=$true"
Write-Output "ULTIMATEBRIDGE_JOB_ID=$jobId"
Write-Output "ULTIMATEBRIDGE_RUN_FOLDER=$runFolder"
