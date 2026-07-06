$ErrorActionPreference = 'Stop'

$files = Get-ChildItem -Path 'runner/powershell' -Filter '*.ps1' -Recurse

foreach ($file in $files) {
  $tokens = $null
  $errors = $null
  [System.Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$tokens, [ref]$errors) | Out-Null

  if ($errors -and $errors.Count -gt 0) {
    Write-Error "PowerShell parse failed: $($file.FullName): $($errors[0].Message)"
  }

  Write-Output "powershell ok: $($file.FullName)"
}
