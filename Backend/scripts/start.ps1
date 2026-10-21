. (Join-Path $PSScriptRoot 'common.ps1')
$nodePath=Find-SpmNode
Import-SpmEnv
$pythonPath=Join-Path $SpmRoot 'cv_engine\.venv\Scripts\python.exe'
if(-not (Test-Path -LiteralPath $pythonPath)){throw 'Jalankan setup.cmd terlebih dahulu.'}
Push-Location $SpmRoot
try{& $nodePath 'scripts\verify-models.js';if($LASTEXITCODE -ne 0){throw 'Model bundle belum siap; jalankan setup.cmd.'}}
finally{Pop-Location}
$apiPort=[int]$env:PORT
$cvUri=[uri]$env:CV_URL
if($cvUri.Host -notin @('127.0.0.1','localhost') -or $cvUri.Scheme -ne 'http'){throw 'Launcher lokal memerlukan CV_URL HTTP loopback.'}
$workerPort=$cvUri.Port
if($apiPort -eq $workerPort){throw 'Port API dan CV harus berbeda.'}
$servicePorts=@($apiPort,$workerPort)
if($env:SPM_HTTPS_ENABLED -eq '1'){
    $httpsPort=[int]$env:SPM_HTTPS_PORT
    if($httpsPort -lt 1 -or $httpsPort -gt 65535 -or $httpsPort -in $servicePorts){throw 'Port HTTPS harus valid dan berbeda dari API HTTP/CV.'}
    $servicePorts+=$httpsPort
    foreach($name in @('SPM_TLS_CERT','SPM_TLS_KEY','SPM_TLS_CA')){
        $certificatePath=[Environment]::GetEnvironmentVariable($name,'Process')
        if(-not $certificatePath){throw 'Konfigurasi sertifikat belum lengkap; jalankan setup-camera.cmd.'}
        if(-not [System.IO.Path]::IsPathRooted($certificatePath)){$certificatePath=Join-Path $SpmRoot $certificatePath}
        if(-not (Test-Path -LiteralPath $certificatePath -PathType Leaf)){throw 'Sertifikat kamera belum tersedia; jalankan setup-camera.cmd.'}
    }
}
$apiUrl='http://127.0.0.1:'+$apiPort
$ownershipFile=Join-Path $SpmRuntime 'processes.json'
$configHash=(Get-SpmConfigHash (Join-Path $SpmRoot '.env'))+':'+$env:HOST+':'+$env:CORS_ORIGINS+':'+(Get-SpmApplicationHash $SpmRoot)
if($env:SPM_HTTPS_ENABLED -eq '1'){
    $certificatePath=$env:SPM_TLS_CERT
    if(-not [System.IO.Path]::IsPathRooted($certificatePath)){$certificatePath=Join-Path $SpmRoot $certificatePath}
    $configHash+=':'+(Get-SpmConfigHash $certificatePath)
}
$listeners=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -in $servicePorts})
if($listeners.Count){
    if(-not (Test-Path -LiteralPath $ownershipFile)){throw 'Port sedang dipakai proses lain. Periksa pemiliknya; tidak dihentikan otomatis.'}
    $previous=Get-Content -LiteralPath $ownershipFile -Raw | ConvertFrom-Json
    $previous=Add-SpmWorkerBasePath $previous $SpmRoot
    $owned=@(Select-SpmOwnedProcesses $previous (Get-SpmProcessSnapshot) $SpmRoot)
    $ownedIds=@($owned.Id)
    if(@($listeners | Where-Object {$_.OwningProcess -notin $ownedIds}).Count){throw 'Port sedang dipakai proses yang bukan milik proyek. Tidak dihentikan otomatis.'}
    $reuse=$false
    if($previous.ConfigHash -eq $configHash){
        try{$ready=Invoke-RestMethod -Uri ($apiUrl+'/ready') -TimeoutSec 3;$reuse=[bool]$ready.data.ocr_ready}catch{}
        if($env:SPM_HTTPS_ENABLED -eq '1' -and -not @($listeners | Where-Object {$_.LocalPort -eq $httpsPort -and $_.OwningProcess -eq $previous.ApiPid}).Count){$reuse=$false}
    }
    if($reuse){Write-Host ('Server sudah siap: '+$apiUrl+'/');Write-Host 'Akun dummy: runtime/test-access.txt. Gunakan stop.cmd untuk berhenti.';return}
    & (Join-Path $PSScriptRoot 'stop.ps1')
    for($attempt=0;$attempt -lt 20;$attempt++){
        $remaining=@(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object {$_.LocalPort -in $servicePorts})
        if(-not $remaining.Count){break}
        Start-Sleep -Milliseconds 250
    }
    if($remaining.Count){throw 'Port proyek belum bebas setelah stop. Periksa runtime logs.'}
    # Let a pre-generation legacy controller finish its finally block.
    Start-Sleep -Seconds 2
}
$env:PYTHONDONTWRITEBYTECODE='1'
$workerBasePath=& $pythonPath -c 'import sys; print(sys._base_executable)'
if($LASTEXITCODE -ne 0){throw 'Python environment belum siap; jalankan setup.cmd.'}
$launchId=[guid]::NewGuid().ToString()
$worker=$null;$api=$null
$ownership=$null
Push-Location $SpmRoot
try {
    $worker=Start-Process -FilePath $pythonPath -ArgumentList @('-m','uvicorn','src.api.main:app_factory','--factory','--host','127.0.0.1','--port',"$workerPort",'--workers','1') -WorkingDirectory (Join-Path $SpmRoot 'cv_engine') -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $SpmRuntime 'cv.stdout.log') -RedirectStandardError (Join-Path $SpmRuntime 'cv.stderr.log')
    $ownership=[PSCustomObject]@{WorkerPid=$worker.Id;WorkerStarted=$worker.StartTime.ToUniversalTime().ToString('o');WorkerPath=$pythonPath;WorkerBasePath=$workerBasePath;ApiPid=$null;ApiStarted=$null;ApiPath=$nodePath;Root=$SpmRoot;LaunchId=$launchId;ConfigHash=$configHash}
    $ownership | ConvertTo-Json | Set-Content -LiteralPath $ownershipFile -Encoding UTF8
    $ready=$false
    Write-Host 'Mengaktifkan OCR lokal. Tunggu sampai model siap.'
    for($attempt=0;$attempt -lt 120;$attempt++){
        try{$health=Invoke-RestMethod -Uri ($env:CV_URL+'/internal/v1/health') -Headers @{'X-Internal-Token'=$env:CV_INTERNAL_TOKEN} -TimeoutSec 2;if(Test-SpmCvReady $health){$ready=$true;break}}catch{}
        if($worker.HasExited){throw 'Worker gagal; periksa runtime/cv.stderr.log.'}
        Start-Sleep -Milliseconds 500
    }
    if(-not $ready){throw 'OCR belum siap; periksa model bundle dan runtime/cv.stderr.log.'}
    $api=Start-Process -FilePath $nodePath -ArgumentList @('src/server.js') -WorkingDirectory $SpmRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $SpmRuntime 'api.stdout.log') -RedirectStandardError (Join-Path $SpmRuntime 'api.stderr.log')
    $ownership.ApiPid=$api.Id;$ownership.ApiStarted=$api.StartTime.ToUniversalTime().ToString('o')
    $ownership | ConvertTo-Json | Set-Content -LiteralPath $ownershipFile -Encoding UTF8
    $publicReady=$false
    for($attempt=0;$attempt -lt 60;$attempt++){
        try{$health=Invoke-RestMethod -Uri ($apiUrl+'/ready') -TimeoutSec 2;if($health.data.ocr_ready){$publicReady=$true;break}}catch{}
        if($api.HasExited){throw 'API gagal; periksa runtime/api.stderr.log.'}
        Start-Sleep -Milliseconds 500
    }
    if(-not $publicReady){throw 'API belum siap; periksa runtime/api.stderr.log.'}
    Write-Host ('Siap. Buka '+$apiUrl+'/')
    $lanUrls=@($script:SpmLanAddresses | ForEach-Object {'http://'+$_+':'+$apiPort+'/'})
    if($env:SPM_HTTPS_ENABLED -eq '1'){
        $cameraUrls=@($script:SpmLanAddresses | ForEach-Object {'https://'+$_+':'+$httpsPort+'/'})
        $lanUrls=$cameraUrls+$lanUrls
        foreach($url in $cameraUrls){Write-Host ('Kamera dengan bingkai: '+$url)}
        Write-Host 'Jika HTTPS belum dipercaya HP, ikuti docs/deployment/local-camera.md.'
    }
    $lanUrls | Set-Content -LiteralPath (Join-Path $SpmRuntime 'lan-access.txt') -Encoding UTF8
    foreach($url in $lanUrls){Write-Host ('HP pada Wi-Fi yang sama: '+$url)}
    Write-Host 'ID/password dummy: runtime/test-access.txt.'
    Write-Host 'Biarkan terminal terbuka. Ctrl+C atau stop.cmd menghentikan layanan proyek ini.'
    while(-not $api.HasExited -and -not $worker.HasExited){Start-Sleep -Seconds 1}
} finally {
    if($ownership){& (Join-Path $PSScriptRoot 'stop.ps1') -LaunchId $launchId}
    Pop-Location
}

