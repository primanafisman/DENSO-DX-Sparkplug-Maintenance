param([string]$LaunchId)
. (Join-Path $PSScriptRoot 'common.ps1')
$ownershipFile=Join-Path $SpmRuntime 'processes.json'
if(Test-Path -LiteralPath $ownershipFile){$ownership=Get-Content -LiteralPath $ownershipFile -Raw | ConvertFrom-Json
    if($ownership.Root -ne $SpmRoot){throw 'Catatan proses bukan milik folder ini.'}
    if($LaunchId -and $ownership.LaunchId -ne $LaunchId){return}
    $ownership=Add-SpmWorkerBasePath $ownership $SpmRoot
    $owned=@(Select-SpmOwnedProcesses $ownership (Get-SpmProcessSnapshot) $SpmRoot)
    foreach($item in $owned){
        $process=Get-Process -Id $item.Id -ErrorAction SilentlyContinue
        if($process -and $process.Path -eq $item.Path -and (Test-SpmSameStartTime $process.StartTime $item.Started)){Stop-Process -Id $item.Id -ErrorAction Stop}
    }
    Remove-Item -LiteralPath $ownershipFile
}
Write-Host 'Proses milik Sparkplug Maintenance dihentikan.'
