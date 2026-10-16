param([string]$Case)
$ErrorActionPreference='Stop'
$sourceRoot=Split-Path -Parent $PSScriptRoot
$fixture=Join-Path ([System.IO.Path]::GetTempPath()) ('spm-tools-'+[guid]::NewGuid().ToString('N'))
$fixtureRoot=Join-Path $fixture 'Projects\Maintenance\Backend'
$scripts=Join-Path $fixtureRoot 'scripts'
New-Item -ItemType Directory -Path $scripts -Force | Out-Null
foreach($name in @('common.ps1','process-control.ps1','runtime-tools.ps1')){
    $source=Join-Path $sourceRoot ('scripts\'+$name)
    if(Test-Path -LiteralPath $source){Copy-Item -LiteralPath $source -Destination (Join-Path $scripts $name)}
}
$originalPath=$env:PATH
$originalTemp=$env:TEMP;$originalTmp=$env:TMP;$originalNode=$env:NODE_BIN;$originalPython=$env:PYTHON_BIN
$originalCache=$env:npm_config_cache
$env:NODE_BIN='';$env:PYTHON_BIN=''
$script:tools=@{};$script:commands=@{};$script:calls=@()
function Assert-Spm($value,$message){if(-not $value){throw $message}}
function Register-Tool($path,$kind,$version,$base=$null,$exitCode=0){
    New-Item -ItemType Directory -Path (Split-Path -Parent $path) -Force | Out-Null
    [System.IO.File]::WriteAllText($path,'fixture executable; tool boundary is mocked')
    $script:tools[$path]=@{Kind=$kind;Version=$version;Base=$base;ExitCode=$exitCode}
    return $path
}
try{
    . (Join-Path $scripts 'common.ps1')
    # Do not use real PATH executables or copy installed runtimes into fixtures.
    function Get-Command {param($Name,$CommandType,$ErrorAction,[switch]$All) if($script:commands.ContainsKey($Name)){return @($script:commands[$Name])}}
    if($Case -notin @('native-exit','real-python')){
        function Get-SpmToolOutput($path,$arguments){
            $script:calls+=,@($path,$arguments)
            if(-not $script:tools.ContainsKey($path)){return $null}
            $tool=$script:tools[$path]
            if($arguments -contains 'venv'){
                $target=Join-Path $arguments[-1] 'Scripts\python.exe'
                Register-Tool $target 'python' '3.12' $path | Out-Null
                return @{ExitCode=0;Output=''}
            }
            if($tool.Kind -eq 'node'){return @{ExitCode=$tool.ExitCode;Output=$tool.Version}}
            if($tool.Kind -eq 'py'){
                $selected=$tool.Base
                if(-not $script:tools.ContainsKey($selected)){return $null}
                $tool=$script:tools[$selected];$path=$selected
            }
            $parts=$tool.Version -split '\.'
            return @{ExitCode=$tool.ExitCode;Output=(@{major=[int]$parts[0];minor=[int]$parts[1];executable=$path;base=$tool.Base;venv=($path -match '\\.venv\\')}|ConvertTo-Json -Compress)}
        }
    }
    switch($Case){
        'ancestor'{
            $expected=Register-Tool (Join-Path $fixture 'Projects\.tools\node-v22.23.3-win-x64\node.exe') 'node' 'v22.23.3'
            $actual=$null;try{$actual=Find-SpmNode}catch{}
            Assert-Spm ($actual -eq $expected) 'Nested Backend must find compatible Node in an ancestor .tools directory.'
        }
        'persistence'{
            $node=Register-Tool (Join-Path $fixture 'external\node.exe') 'node' 'v22.23.3'
            $python=Register-Tool (Join-Path $fixture 'external\python.exe') 'python' '3.12'
            $env:NODE_BIN=$node;$env:PYTHON_BIN=$python
            Assert-Spm ((Find-SpmNode) -eq $node) 'Explicit Node path must work.'
            Assert-Spm ((Find-SpmPython) -eq $python) 'Explicit Python base must work.'
            Save-SpmToolPaths $node $python
            $env:NODE_BIN='';$env:PYTHON_BIN=''
            Assert-Spm ((Find-SpmNode) -eq $node) 'Cached Node must survive loss of setup environment variables.'
            Assert-Spm ((Find-SpmPython) -eq $python) 'Cached Python base must survive loss of setup environment variables.'
            $saved=Get-Content -LiteralPath (Join-Path $SpmRuntime 'tool-paths.json') -Raw|ConvertFrom-Json
            Assert-Spm ($saved.NodePath -eq $node -and $saved.PythonPath -eq $python) 'Only validated absolute runtime paths must be saved.'
        }
        'cached-node'{
            $node=Register-Tool (Join-Path $fixture 'external\node.exe') 'node' 'v22.23.3'
            [System.IO.File]::WriteAllText((Join-Path $SpmRuntime 'tool-paths.json'),(@{NodePath=$node}|ConvertTo-Json))
            $actual=$null;try{$actual=Find-SpmNode}catch{}
            Assert-Spm ($actual -eq $node) 'A fresh shell must find previously saved Node without the setup environment variable.'
        }
        'stale-cache'{
            [System.IO.File]::WriteAllText((Join-Path $SpmRuntime 'tool-paths.json'),'{broken JSON')
            $node=Register-Tool (Join-Path $fixture 'path\node.exe') 'node' 'v22.12.0'
            $wrong=Register-Tool (Join-Path $fixture 'wrong\node.exe') 'node' 'v22.23.3' $null 7
            $env:NODE_BIN=$wrong;$script:commands['node']=@{Source=$node}
            Assert-Spm ((Find-SpmNode) -eq $node) 'Malformed cache and nonzero version command must fall through to compatible PATH Node.'
            $script:tools[$wrong].ExitCode=0;$script:tools[$wrong].Version='v23.0.0'
            Assert-Spm ((Find-SpmNode) -eq $node) 'Incompatible Node must be skipped.'
        }
        'python-launcher'{
            $wrong=Register-Tool (Join-Path $fixture 'path\python.exe') 'python' '3.13'
            $python=Register-Tool (Join-Path $fixture 'Python312\python.exe') 'python' '3.12'
            $launcher=Register-Tool (Join-Path $fixture 'path\py.exe') 'py' '0.0' $python
            $script:commands['python']=@{Source=$wrong};$script:commands['py']=@{Source=$launcher}
            Assert-Spm ((Find-SpmPython) -eq $python) 'py -3.12 must resolve the real compatible Python executable.'
            Assert-Spm (@($script:calls|Where-Object {$_[0] -eq $launcher -and $_[1][0] -eq '-3.12'}).Count -eq 1) 'Python launcher must explicitly select 3.12.'
        }
        'venv-repair'{
            $python=Register-Tool (Join-Path $fixture 'Python312\python.exe') 'python' '3.12'
            $venv=Register-Tool (Join-Path $fixtureRoot 'cv_engine\.venv\Scripts\python.exe') 'python' '3.12' (Join-Path $fixture 'missing\python.exe') 1
            $env:PYTHON_BIN=$python
            $retained=Join-Path $fixtureRoot 'runtime\keep.sqlite';[System.IO.File]::WriteAllText($retained,'database fixture')
            $resolved=Ensure-SpmPythonVenv (Find-SpmPython)
            Assert-Spm ($resolved -eq $venv) 'Broken copied venv must be repaired using a compatible base.'
            Assert-Spm (@($script:calls|Where-Object {$_[0] -eq $python -and $_[1] -contains 'venv'}).Count -eq 1) 'Repair must invoke base Python -m venv once.'
            Assert-Spm ((Get-Content -LiteralPath $retained -Raw) -eq 'database fixture') 'Venv repair must preserve local data.'
            $script:calls=@();Ensure-SpmPythonVenv $python|Out-Null
            Assert-Spm (@($script:calls|Where-Object {$_[1] -contains 'venv'}).Count -eq 0) 'A healthy venv must be preserved.'
            $env:PYTHON_BIN=''
            Assert-Spm ((Find-SpmPython) -eq $python) 'Healthy venv discovery must return its base interpreter.'
        }
        'native-exit'{
            $tool=Join-Path $fixture 'native tool.cmd'
            [System.IO.File]::WriteAllLines($tool,@('@echo off','echo v22.23.3','exit /b 9'))
            Assert-Spm ($null -eq (Get-SpmNodePath $tool)) 'A native process printing a valid version but exiting nonzero must be rejected.'
            [System.IO.File]::WriteAllLines($tool,@('@echo off','echo v22.23.3','exit /b 0'))
            Assert-Spm ((Get-SpmNodePath $tool) -eq $tool) 'Compatible native executable must be resolved even when its path contains spaces.'
        }
        'forward-path'{
            $node=Register-Tool (Join-Path $fixture 'external\node.exe') 'node' 'v22.23.3'
            $env:NODE_BIN=$node.Replace('\','/')
            Assert-Spm ((Find-SpmNode) -ceq $node) 'Forward-slash NODE_BIN must return the canonical Windows executable path for strict process ownership.'
        }
        'real-python'{
            $actual=Join-Path $sourceRoot 'cv_engine\.venv\Scripts\python.exe'
            if(-not (Test-Path -LiteralPath $actual)){Write-Output 'SKIP real Python: local environment is absent.';return}
            $info=Get-SpmPythonInfo $actual
            Assert-Spm ($null -ne $info -and $info.IsVenv) 'Native Python probe must preserve the Python command string in Windows PowerShell and PowerShell7.'
        }
        default{throw 'Unknown runtime case.'}
    }
    Write-Output ('Runtime case passed: '+$Case)
}finally{
    $env:PATH=$originalPath;$env:TEMP=$originalTemp;$env:TMP=$originalTmp;$env:NODE_BIN=$originalNode;$env:PYTHON_BIN=$originalPython;$env:npm_config_cache=$originalCache
    $resolved=[System.IO.Path]::GetFullPath($fixture)
    if($resolved.StartsWith([System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()),[StringComparison]::OrdinalIgnoreCase)) {Remove-Item -LiteralPath $resolved -Recurse -Force}
}
