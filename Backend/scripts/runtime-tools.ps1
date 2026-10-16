# Local runtime discovery; this cache is private to the installed workspace.
function Get-SpmToolOutput($path,$arguments) {
    try {
        $output=& $path @arguments 2>$null
        $exitCode=$LASTEXITCODE
        return @{ExitCode=$exitCode;Output=($output -join "`n").Trim()}
    } catch {return $null}
}
function Get-SpmNodePath($candidate) {
    if(-not $candidate -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)){return $null}
    $resolved=(Resolve-Path -LiteralPath $candidate).ProviderPath
    $result=Get-SpmToolOutput $resolved @('--version')
    if($result -and $result.ExitCode -eq 0 -and $result.Output -match '^v22\.(\d+)\.\d+$' -and [int]$Matches[1] -ge 12){return $resolved}
    return $null
}
function Get-SpmSavedToolPaths {
    $file=Join-Path $SpmRuntime 'tool-paths.json'
    if(Test-Path -LiteralPath $file -PathType Leaf){try{return (Get-Content -LiteralPath $file -Raw | ConvertFrom-Json)}catch{}}
    return $null
}
function Find-SpmNode {
    $saved=Get-SpmSavedToolPaths
    $candidates=@($env:NODE_BIN)
    if($saved.NodePath -is [string] -and [System.IO.Path]::IsPathRooted($saved.NodePath)){$candidates+=$saved.NodePath}
    $candidates+=Join-Path $SpmRuntime 'tools\node-v22.23.3-win-x64\node.exe'
    $ancestor=$SpmRoot
    for($level=0;$level -lt 6 -and $ancestor;$level++){
        $candidates+=Join-Path $ancestor '.tools\node-v22.23.3-win-x64\node.exe'
        $ancestor=Split-Path -Parent $ancestor
    }
    $candidates+=@(Get-Command node -CommandType Application -All -ErrorAction SilentlyContinue | ForEach-Object {$_.Source})
    foreach($candidate in $candidates){$resolved=Get-SpmNodePath $candidate;if($resolved){return $resolved}}
    throw 'Node >=22.12 <23 belum tersedia. Instal Node22 beserta npm atau isi NODE_BIN dengan path node.exe.'
}
function Get-SpmPythonInfo($candidate,$prefixArguments=@()) {
    if(-not $candidate -or -not (Test-Path -LiteralPath $candidate -PathType Leaf)){return $null}
    $resolved=(Resolve-Path -LiteralPath $candidate).ProviderPath
    # Single quoted Python keys survive legacy Windows PowerShell native argument passing.
    $code="import json,sys; print(json.dumps({'major':sys.version_info.major,'minor':sys.version_info.minor,'executable':sys.executable,'base':sys._base_executable,'venv':sys.prefix!=sys.base_prefix}))"
    $result=Get-SpmToolOutput $resolved (@($prefixArguments)+@('-c',$code))
    if(-not $result -or $result.ExitCode -ne 0){return $null}
    try {
        $info=$result.Output | ConvertFrom-Json
        if($info.major -ne 3 -or $info.minor -ne 12 -or -not [System.IO.Path]::IsPathRooted($info.executable) -or -not (Test-Path -LiteralPath $info.executable -PathType Leaf)){return $null}
        $base=$info.base;if(-not $base){$base=$info.executable}
        if(-not [System.IO.Path]::IsPathRooted($base)){return $null}
        if(Test-Path -LiteralPath $base -PathType Leaf){$base=(Resolve-Path -LiteralPath $base).ProviderPath}
        return [pscustomobject]@{Path=(Resolve-Path -LiteralPath $info.executable).ProviderPath;BasePath=$base;IsVenv=[bool]$info.venv}
    } catch {return $null}
}
function Get-SpmHealthyVenv {
    $venv=Join-Path $SpmRoot 'cv_engine\.venv\Scripts\python.exe'
    $info=Get-SpmPythonInfo $venv
    if(-not $info -or -not $info.IsVenv -or -not (Get-SpmPythonInfo $info.BasePath)){return $null}
    $pip=Get-SpmToolOutput $venv @('-m','pip','--version')
    if(-not $pip -or $pip.ExitCode -ne 0){return $null}
    return $info
}
function Find-SpmPython {
    $explicit=Get-SpmPythonInfo $env:PYTHON_BIN
    if($explicit){$base=Get-SpmPythonInfo $explicit.BasePath;if($base){return $base.Path}}
    $venv=Get-SpmHealthyVenv
    if($venv){return (Get-SpmPythonInfo $venv.BasePath).Path}
    $saved=Get-SpmSavedToolPaths
    if($saved.PythonPath -is [string] -and [System.IO.Path]::IsPathRooted($saved.PythonPath)){
        $cached=Get-SpmPythonInfo $saved.PythonPath
        if($cached -and -not $cached.IsVenv){return $cached.Path}
    }
    foreach($command in @(Get-Command py -CommandType Application -All -ErrorAction SilentlyContinue)){
        $selected=Get-SpmPythonInfo $command.Source @('-3.12')
        if($selected){$base=Get-SpmPythonInfo $selected.BasePath;if($base){return $base.Path}}
    }
    foreach($name in @('python','python3.12','python3')){
        foreach($command in @(Get-Command $name -CommandType Application -All -ErrorAction SilentlyContinue)){
            $info=Get-SpmPythonInfo $command.Source
            if($info){$base=Get-SpmPythonInfo $info.BasePath;if($base){return $base.Path}}
        }
    }
    throw 'Python3.12 belum tersedia. Instal Python3.12 atau isi PYTHON_BIN dengan path interpreter dasar python.exe.'
}
function Ensure-SpmPythonVenv($basePath) {
    $healthy=Get-SpmHealthyVenv
    if($healthy){return $healthy.Path}
    $base=Get-SpmPythonInfo $basePath
    if(-not $base -or $base.IsVenv){throw 'Interpreter dasar Python3.12 belum siap; periksa PYTHON_BIN.'}
    # Rebuild launchers/config in place: retain packages and all project data.
    $result=Get-SpmToolOutput $base.Path @('-m','venv',(Join-Path $SpmRoot 'cv_engine\.venv'))
    if(-not $result -or $result.ExitCode -ne 0){throw 'Virtualenv gagal dibuat/diperbaiki. Periksa Python3.12 dan jalankan setup.cmd kembali.'}
    $healthy=Get-SpmHealthyVenv
    if(-not $healthy){throw 'Virtualenv Python3.12/pip belum siap setelah perbaikan.'}
    return $healthy.Path
}
function Save-SpmToolPaths($nodePath,$pythonPath) {
    $node=Get-SpmNodePath $nodePath
    $python=Get-SpmPythonInfo $pythonPath
    if(-not $node -or -not $python -or $python.IsVenv){throw 'Path runtime lokal belum valid.'}
    $content=@{NodePath=$node;PythonPath=$python.Path}|ConvertTo-Json
    [System.IO.File]::WriteAllText((Join-Path $SpmRuntime 'tool-paths.json'),$content,[System.Text.UTF8Encoding]::new($false))
}
