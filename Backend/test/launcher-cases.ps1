$ErrorActionPreference='Stop'
. (Join-Path (Split-Path -Parent $PSScriptRoot) 'scripts/process-control.ps1')
function Assert-Spm($value,$message) {if(-not $value){throw $message}}
Assert-Spm (-not (Test-SpmCvReady @{status='up';ocr=@{packages_present=$true;weights_present=$false;initialized=$false}})) 'A live worker without weights must not be ready.'
Assert-Spm (-not (Test-SpmCvReady @{status='up';ocr=@{packages_present=$true;weights_present=$true;initialized=$false}})) 'OCR initialization must finish.'
Assert-Spm (Test-SpmCvReady @{status='up';ocr=@{packages_present=$true;weights_present=$true;initialized=$true}}) 'Initialized offline OCR is ready.'
$origins=Get-SpmLocalOrigins 'http://127.0.0.1:8100' @('192.168.8.157') 8100
Assert-Spm (($origins -split ',').Count -eq 3) 'LAN and localhost must be distinct allowed origins.'
Assert-Spm ($origins -notmatch '\s') 'PowerShell concatenation must not join two URLs into one origin.'
$root='D:\fixture\Sparkplug Maintenance'
$ownership=@{Root=$root;WorkerPid=10;WorkerPath='D:\fixture\venv\python.exe';WorkerStarted='2026-10-14T08:00:00Z';WorkerBasePath='C:\runtime\python.exe';ApiPid=20;ApiPath='D:\runtime\node.exe';ApiStarted='2026-10-14T08:00:01Z'}
$snapshot=@(
 @{Id=10;ParentId=1;Path='D:\fixture\venv\python.exe';Started='2026-10-14T08:00:00Z'},
 @{Id=11;ParentId=10;Path='C:\runtime\python.exe';Started='2026-10-14T08:00:00.1Z'},
 @{Id=12;ParentId=10;Path='C:\other\unrelated.exe';Started='2026-10-14T08:00:00.2Z'},
 @{Id=20;ParentId=1;Path='D:\runtime\node.exe';Started='2026-10-14T08:00:01Z'},
 @{Id=99;ParentId=1;Path='C:\runtime\python.exe';Started='2026-10-14T08:00:02Z'}
)
$owned=@(Select-SpmOwnedProcesses $ownership $snapshot $root)
Assert-Spm (($owned.Id -join ',') -eq '11,10,20') 'Stop must include the venv child first, exclude unrelated processes.'
$decodedOwnership=$ownership | ConvertTo-Json | ConvertFrom-Json
$decodedOwned=@(Select-SpmOwnedProcesses $decodedOwnership $snapshot $root)
Assert-Spm (($decodedOwned.Id -join ',') -eq '11,10,20') 'JSON ownership timestamps must match in Windows PowerShell and PowerShell 7.'
$exactStarted='2026-10-15T01:48:11.9004790Z'
Assert-Spm (Test-SpmSameStartTime $exactStarted ([datetime]$exactStarted)) 'DateTime timestamps must retain exact UTC creation ticks.'
Assert-Spm (Test-SpmSameStartTime $exactStarted ([datetimeoffset]'2026-10-15T08:48:11.9004790+07:00')) 'Equivalent offset timestamps identify the same UTC instant.'
Assert-Spm (-not (Test-SpmSameStartTime $exactStarted '2026-10-15T01:48:11.9004791Z')) 'A one-tick mismatch cannot authorize stopping a process.'
Assert-Spm (-not (Test-SpmSameStartTime 'invalid' 'invalid')) 'Invalid matching text is never process identity.'
Assert-Spm (-not (Test-SpmSameStartTime $null $null)) 'Missing timestamps are never process identity.'
$reused=@{}+$ownership;$reused.WorkerStarted='2026-10-13T08:00:00Z'
$safe=@(Select-SpmOwnedProcesses $reused $snapshot $root)
Assert-Spm (($safe.Id -join ',') -eq '20') 'A reused parent PID cannot authorize killing a child.'
Assert-Spm (@(Select-SpmOwnedProcesses $ownership $snapshot 'D:\another-project').Count -eq 0) 'Another project cannot claim these processes.'
$hashFixture=[System.IO.Path]::GetTempFileName()
try {
    [System.IO.File]::WriteAllBytes($hashFixture,[System.Text.Encoding]::UTF8.GetBytes('abc'))
    Assert-Spm ((Get-SpmConfigHash $hashFixture) -eq 'BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD') 'Configuration hashing must work without optional PowerShell hash modules.'
} finally {[System.IO.File]::Delete($hashFixture)}
Write-Output 'Launcher readiness and ownership cases passed.'
$sourceFixture=Join-Path ([System.IO.Path]::GetTempPath()) ('spm-source-hash-'+[guid]::NewGuid())
try {
    $fixtureSource=Join-Path $sourceFixture 'Backend\src'
    New-Item -ItemType Directory -Path $fixtureSource -Force | Out-Null
    $fixtureBackend=Split-Path -Parent $fixtureSource
    $fixtureFile=Join-Path $fixtureSource 'app.js'
    [IO.File]::WriteAllText($fixtureFile,'old source')
    $first=Get-SpmApplicationHash $fixtureBackend
    [IO.File]::WriteAllText($fixtureFile,'new source')
    Assert-Spm ((Get-SpmApplicationHash $fixtureBackend) -ne $first) 'Source changes must invalidate startup reuse.'
} finally {
    $resolved=[IO.Path]::GetFullPath($sourceFixture)
    if($resolved.StartsWith([IO.Path]::GetTempPath(),[StringComparison]::OrdinalIgnoreCase)){Remove-Item -LiteralPath $resolved -Recurse -Force}
}
