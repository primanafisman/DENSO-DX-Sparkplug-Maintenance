. (Join-Path $PSScriptRoot 'common.ps1')
$principal=[Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Klik kanan setup-lan.cmd > Run as administrator sekali untuk izin firewall LAN.'}
$nodePath=Find-SpmNode
Import-SpmEnv
if($env:NODE_ENV -ne 'development' -or $env:SPM_LAN_ENABLED -ne '1'){throw 'Izin ini hanya untuk uji lokal development dengan SPM_LAN_ENABLED=1.'}
$ports=@([int]$env:PORT)
if($env:SPM_HTTPS_ENABLED -eq '1'){$ports+=[int]$env:SPM_HTTPS_PORT}
foreach($port in $ports){
    $name='SparkplugMaintenance-LocalTest-'+$port
    $existing=Get-NetFirewallRule -Name $name -ErrorAction SilentlyContinue
    if($existing){
        $application=$existing | Get-NetFirewallApplicationFilter
        $portFilter=$existing | Get-NetFirewallPortFilter
        $addressFilter=$existing | Get-NetFirewallAddressFilter
        if($existing.Direction -ne 'Inbound' -or $existing.Action -ne 'Allow' -or $existing.Profile -ne 'Private' -or $existing.Enabled -ne 'True' -or $application.Program -ne $nodePath -or $portFilter.Protocol -notin @('TCP','6') -or [string]$portFilter.LocalPort -ne [string]$port -or [string]$addressFilter.RemoteAddress -ne 'LocalSubnet'){throw ('Aturan existing berbeda; tinjau manual: '+$name)}
        Write-Host ('Izin LAN sudah sesuai untuk port '+$port)
        continue
    }
    New-NetFirewallRule -Name $name -DisplayName ('Sparkplug Maintenance - local subnet test '+$port) -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -RemoteAddress LocalSubnet -Program $nodePath -Profile Private | Out-Null
}
Write-Host 'Izin TCP API HTTP dan HTTPS yang diaktifkan tersedia untuk subnet lokal. Port mesin Python tidak dibuka.'

Write-Host 'Gunakan profil Private pada Wi-Fi uji milik Anda. Aturan blok Public yang sudah ada tetap berlaku.'
