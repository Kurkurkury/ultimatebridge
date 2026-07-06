param(
  [ValidateSet('Chrome','Edge','Both')][string]$Browser = 'Both'
)

$ErrorActionPreference = 'Stop'

$targets = @()
if ($Browser -eq 'Edge' -or $Browser -eq 'Both') {
  $targets += 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.ultimatebridge.host'
}
if ($Browser -eq 'Chrome' -or $Browser -eq 'Both') {
  $targets += 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.ultimatebridge.host'
}

foreach ($keyPath in $targets) {
  if (Test-Path $keyPath) {
    Remove-Item -Force -Path $keyPath
    Write-Output "REMOVED=$keyPath"
  } else {
    Write-Output "NOT_FOUND=$keyPath"
  }
}
