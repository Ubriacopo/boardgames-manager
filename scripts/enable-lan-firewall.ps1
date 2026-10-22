#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

# Limit access to the development port from directly connected subnets.
# Include Public because Windows may classify a trusted home Wi-Fi as Public.
$ruleName = 'Kallboard-Dev-LAN-TCP-4200'
Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -Name $ruleName -DisplayName 'Kallboard development (LAN TCP 4200)' `
    -Direction Inbound -Action Allow -Enabled True -Protocol TCP -LocalPort 4200 `
    -RemoteAddress LocalSubnet -Profile Any | Out-Null
Write-Host 'Allowed inbound TCP 4200 from local subnets.'
