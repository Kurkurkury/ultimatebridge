param(
  [Parameter(Mandatory=$true)][string]$RunFolder,
  [string]$RequestId = 'AUTO',
  [string]$JobId = '',
  [ValidateSet('OK','WARN','ERROR','BLOCKED','TIMEOUT')][string]$Status = 'OK',
  [int]$ExitCode = 0,
  [bool]$TimedOut = $false,
  [int]$TimeoutSeconds = 300,
  [string]$Summary = ''
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($JobId)) {
  $JobId = Split-Path -Leaf $RunFolder
}

$report = [ordered]@{
  protocol = 'ULTIMATEBRIDGE_RUNNER_REPORT_V1'
  requestId = $RequestId
  jobId = $JobId
  status = $Status
  exitCode = $ExitCode
  timedOut = $TimedOut
  timeoutSeconds = $TimeoutSeconds
  runFolder = $RunFolder
  summary = $Summary
  emittedAt = (Get-Date).ToString('o')
  attachments = @()
}

$path = Join-Path $RunFolder 'ultimatebridge-runner-report.json'
$report | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -Path $path

Write-Output "ULTIMATEBRIDGE_REPORT_PATH=$path"
Write-Output "ULTIMATEBRIDGE_STATUS=$Status"
