. (Join-Path $PSScriptRoot 'common.ps1')
$nodePath=Find-SpmNode
Import-SpmEnv
Push-Location $SpmRoot
try{Invoke-SpmNpm $nodePath @('test');Invoke-SpmNpm $nodePath @('run','lint');& $nodePath 'scripts\verify-database.js';if($LASTEXITCODE -ne 0){throw 'Database belum terverifikasi.'};Push-Location 'cv_engine';try{& '.venv\Scripts\python.exe' -m pytest -p no:cacheprovider;if($LASTEXITCODE -ne 0){throw 'Tes CV gagal.'}}finally{Pop-Location}}finally{Pop-Location}
