# Resolve ownership from executable + creation time, then verified descendants.
function Get-SpmConfigHash($filename) {
    $algorithm=[Security.Cryptography.SHA256]::Create()
    try{return [BitConverter]::ToString($algorithm.ComputeHash([System.IO.File]::ReadAllBytes($filename))).Replace('-','')}
    finally{$algorithm.Dispose()}
}
function Test-SpmCvReady($health) {
    return ($health.status -eq 'up' -and $health.ocr.packages_present -and $health.ocr.weights_present -and $health.ocr.initialized)
}
function Get-SpmLocalOrigins($configured,$addresses,$port) {
    $origins=@($configured -split ',')+@(('http://127.0.0.1:'+$port),('http://localhost:'+$port))+@($addresses | ForEach-Object {'http://'+$_+':'+$port})
    return ($origins | Where-Object {$_} | Sort-Object -Unique) -join ','
}
function Get-SpmStartUtcTicks($timestamp) {
    # PowerShell 7 JSON readers may produce DateTime; Windows PowerShell retains
    # the ISO string. Compare the exact instant, never formatted/localized text.
    if($timestamp -is [datetimeoffset]){return $timestamp.UtcDateTime.Ticks}
    if($timestamp -is [datetime]){return $timestamp.ToUniversalTime().Ticks}
    if($timestamp -isnot [string] -or $timestamp -notmatch '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})$'){return $null}
    $parsed=[datetimeoffset]::MinValue
    if([datetimeoffset]::TryParse($timestamp,[Globalization.CultureInfo]::InvariantCulture,[Globalization.DateTimeStyles]::None,[ref]$parsed)){return $parsed.UtcDateTime.Ticks}
    return $null
}
function Test-SpmSameStartTime($actual,$expected) {
    $actualTicks=Get-SpmStartUtcTicks $actual
    $expectedTicks=Get-SpmStartUtcTicks $expected
    return ($null -ne $actualTicks -and $null -ne $expectedTicks -and $actualTicks -eq $expectedTicks)
}
function Select-SpmOwnedProcesses($ownership,$snapshot,$root) {
    if($ownership.Root -ne $root){return @()}
    $selected=@{}
    $order=0
    foreach($kind in @('Worker','Api')){
        $ownedId=$ownership.($kind+'Pid')
        foreach($item in $snapshot){
            if($ownedId -and $item.Id -eq $ownedId -and $item.Path -eq $ownership.($kind+'Path') -and (Test-SpmSameStartTime $item.Started $ownership.($kind+'Started'))){
                $selected[[int]$item.Id]=[pscustomobject]@{Id=$item.Id;Path=$item.Path;Started=$item.Started;Depth=0;Order=$order}
            }
        }
        $order++
    }
    $allowed=@($ownership.WorkerPath,$ownership.WorkerBasePath,$ownership.ApiPath) | Where-Object {$_}
    for($level=0;$level -lt 32;$level++){
        $added=$false
        foreach($item in $snapshot){
            if($selected.ContainsKey([int]$item.Id) -or -not $selected.ContainsKey([int]$item.ParentId) -or $item.Path -notin $allowed){continue}
            $parent=$selected[[int]$item.ParentId]
            if([datetime]$item.Started -lt [datetime]$parent.Started){continue}
            $selected[[int]$item.Id]=[pscustomobject]@{Id=$item.Id;Path=$item.Path;Started=$item.Started;Depth=($parent.Depth+1);Order=$parent.Order}
            $added=$true
        }
        if(-not $added){break}
    }
    return @($selected.Values | Sort-Object @{Expression='Depth';Descending=$true},Order)
}
function Get-SpmProcessSnapshot {
    $parents=@{}
    Get-CimInstance -ClassName Win32_Process | ForEach-Object {$parents[[int]$_.ProcessId]=[int]$_.ParentProcessId}
    foreach($process in Get-Process){
        try {
            if($process.Path -and $parents.ContainsKey($process.Id)){
                [pscustomobject]@{Id=$process.Id;ParentId=$parents[$process.Id];Path=$process.Path;Started=$process.StartTime.ToUniversalTime().ToString('o')}
            }
        } catch { }
    }
}
function Add-SpmWorkerBasePath($ownership,$root) {
    # Support older records whose venv redirector did not record its child.
    $expected=Join-Path $root 'cv_engine\.venv\Scripts\python.exe'
    if($ownership.Root -eq $root -and $ownership.WorkerPath -eq $expected -and (Test-Path -LiteralPath $expected)){
        $basePath=& $expected -c 'import sys; print(sys._base_executable)'
        if($LASTEXITCODE -eq 0){$ownership | Add-Member -NotePropertyName WorkerBasePath -NotePropertyValue $basePath -Force}
    }
    return $ownership
}
function Get-SpmApplicationHash($backendRoot) {
    $parts=New-Object System.Collections.Generic.List[string]
    foreach($directory in @('src','cv_engine\src')) {
        $source=Join-Path $backendRoot $directory
        if(Test-Path -LiteralPath $source){foreach($file in @(Get-ChildItem -LiteralPath $source -File -Recurse | Where-Object {$_.Extension -in @('.js','.py')} | Sort-Object FullName)){$parts.Add($file.FullName.Substring($backendRoot.Length)+':'+(Get-SpmConfigHash $file.FullName))}}
    }
    foreach($relative in @('package-lock.json','docs\governance\ocr-artifacts.json','..\Frontend\dist\index.html')){$file=Join-Path $backendRoot $relative;if(Test-Path -LiteralPath $file){$parts.Add($relative+':'+(Get-SpmConfigHash $file))}}
    $algorithm=[Security.Cryptography.SHA256]::Create()
    try{return [BitConverter]::ToString($algorithm.ComputeHash([Text.Encoding]::UTF8.GetBytes(($parts -join "`n")))).Replace('-','')}
    finally{$algorithm.Dispose()}
}
