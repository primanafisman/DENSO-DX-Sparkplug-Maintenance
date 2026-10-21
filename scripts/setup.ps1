$ErrorActionPreference='Stop'
$applicationRoot=Split-Path -Parent $PSScriptRoot
& (Join-Path $applicationRoot 'Backend\scripts\setup.ps1')
& (Join-Path $applicationRoot 'Frontend\scripts\setup.ps1')
Write-Host 'Instalasi aplikasi selesai. Jalankan start.cmd di folder utama.'
