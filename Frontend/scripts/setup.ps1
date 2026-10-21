. (Join-Path $PSScriptRoot '..\..\Backend\scripts\common.ps1')
$nodePath=Find-SpmNode
$frontendRoot=Split-Path -Parent $PSScriptRoot
Push-Location $frontendRoot
try {
    Invoke-SpmNpm $nodePath @('ci','--no-fund')
    Invoke-SpmNpm $nodePath @('run','check')
    Write-Host 'Frontend terpasang dan build selesai. Jalankan start.cmd di folder utama.'
} finally {Pop-Location}

