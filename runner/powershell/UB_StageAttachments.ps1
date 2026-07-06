param(
  [Parameter(Mandatory=$true)][string]$RunFolder,
  [Parameter(Mandatory=$true)][string[]]$Paths,
  [string]$JobId = ''
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($JobId)) {
  $JobId = Split-Path -Leaf $RunFolder
}

$items = @()

foreach ($p in $Paths) {
  if (-not (Test-Path -LiteralPath $p)) { continue }
  $item = Get-Item -LiteralPath $p
  if ($item.Length -eq 0) { continue }

  $hash = Get-FileHash -Algorithm SHA256 -LiteralPath $p
  $items += [ordered]@{
    path = $item.FullName
    kind = 'file'
    size = [int64]$item.Length
    sha256 = $hash.Hash.ToLowerInvariant()
    upload = $true
    reason = 'staged_artifact'
  }
}

$manifest = [ordered]@{
  protocol = 'ULTIMATEBRIDGE_ATTACHMENT_MANIFEST_V1'
  jobId = $JobId
  items = $items
}

$manifestPath = Join-Path $RunFolder 'attachment-manifest.json'
$manifest | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -Path $manifestPath

Write-Output "ULTIMATEBRIDGE_ATTACHMENT_MANIFEST=$manifestPath"
Write-Output "ULTIMATEBRIDGE_ATTACHMENT_COUNT=$($items.Count)"
