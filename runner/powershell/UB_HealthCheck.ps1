$health = [ordered]@{
  protocol = 'ULTIMATEBRIDGE_HEALTH_V1'
  ok = $true
  computerName = $env:COMPUTERNAME
  userName = $env:USERNAME
  pwsh = $PSVersionTable.PSVersion.ToString()
  time = (Get-Date).ToString('o')
}

$health | ConvertTo-Json -Depth 5
