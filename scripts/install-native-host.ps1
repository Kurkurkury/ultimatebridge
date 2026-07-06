param(
  [Parameter(Mandatory=$true)][string]$ExtensionId,
  [ValidateSet('Chrome','Edge')][string]$Browser = 'Edge'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$manifestPath = Join-Path $repoRoot 'config\com.ultimatebridge.host.generated.json'
$wrapperPath = Join-Path $repoRoot 'scripts\native-host-wrapper.cmd'

$manifest = [ordered]@{
  name = 'com.ultimatebridge.host'
  description = 'UltimateBridge Native Host'
  path = $wrapperPath
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
}

$manifest | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 -Path $manifestPath

if ($Browser -eq 'Edge') {
  $keyPath = 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.ultimatebridge.host'
} else {
  $keyPath = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.ultimatebridge.host'
}

New-Item -Force -Path $keyPath | Out-Null
Set-ItemProperty -Path $keyPath -Name '(default)' -Value $manifestPath

Write-Output "ULTIMATEBRIDGE_NATIVE_HOST_INSTALLED=$true"
Write-Output "BROWSER=$Browser"
Write-Output "MANIFEST=$manifestPath"
Write-Output "WRAPPER=$wrapperPath"
