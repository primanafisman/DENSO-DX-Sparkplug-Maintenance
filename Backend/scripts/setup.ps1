. (Join-Path $PSScriptRoot 'common.ps1')
$nodePath=Find-SpmNode
$pythonBase=Find-SpmPython
Push-Location $SpmRoot
try {
    Invoke-SpmNpm $nodePath @('ci','--no-fund')
    $venv=Ensure-SpmPythonVenv $pythonBase
    & $venv -m pip install --no-cache-dir -r 'cv_engine\requirements-dev.lock.txt'
    if($LASTEXITCODE -ne 0){throw 'Instalasi Python gagal.'}
    & $venv -m pip install --no-cache-dir --disable-pip-version-check --timeout 120 -r 'cv_engine\requirements-camera.lock.txt'
    if($LASTEXITCODE -ne 0){throw 'Instalasi alat sertifikat kamera gagal; jalankan setup.cmd kembali.'}
    $envFile=Join-Path $SpmRoot '.env'
    if(-not (Test-Path -LiteralPath $envFile)){
        function New-SpmSecret {$secretBytes=New-Object byte[] 32;[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($secretBytes);return [Convert]::ToBase64String($secretBytes)}
        $modelDir='cv_engine/models/ocr'
        if(-not (Test-Path -LiteralPath (Join-Path $SpmRoot 'cv_engine\models\ocr\PP-OCRv6_rec_small.onnx'))){throw 'Model OCR bundle tidak lengkap. Ekstrak ulang paket transfer lengkap.'}
        $lines=@(('JWT_SECRET='+(New-SpmSecret)),('CV_INTERNAL_TOKEN='+(New-SpmSecret)),'NODE_ENV=development','HOST=127.0.0.1','PORT=8100','CV_URL=http://127.0.0.1:8101','CORS_ORIGINS=http://127.0.0.1:8100','SPM_LAN_ENABLED=1','RUNTIME_DIR=runtime','DB_DIALECT=sqlite','DB_NAME=DX_SPM',('OCR_MODEL_DIR='+$modelDir))
        [System.IO.File]::WriteAllLines($envFile,$lines,[System.Text.UTF8Encoding]::new($false))
        Write-Host 'Konfigurasi lokal dibuat. Secret tidak ditampilkan.'
    }
    Import-SpmEnv
    & $nodePath 'scripts\verify-models.js'
    if($LASTEXITCODE -ne 0){throw 'Model OCR bundle gagal diverifikasi.'}
    if($env:DB_DIALECT -eq 'sqlite'){
        $databaseFile=$env:DB_STORAGE
        if(-not $databaseFile){$databaseFile=Join-Path $env:RUNTIME_DIR 'development.sqlite'}
        if(-not [System.IO.Path]::IsPathRooted($databaseFile)){$databaseFile=Join-Path $SpmRoot $databaseFile}
        if(-not (Test-Path -LiteralPath $databaseFile)){& $nodePath 'scripts\initialize-database.js';if($LASTEXITCODE -ne 0){throw 'Inisialisasi database gagal.'}}
        & (Join-Path $PSScriptRoot 'stop.ps1')
        & $nodePath 'scripts\migrate-database.js'
        if($LASTEXITCODE -ne 0){throw 'Migrasi database gagal; backup dan data lama dipertahankan.'}
        if($env:NODE_ENV -eq 'development'){& $nodePath 'scripts\seed-demo.js';if($LASTEXITCODE -ne 0){throw 'Akun dummy belum siap.'}}
    }
    if($env:SPM_HTTPS_ENABLED -eq '1'){
        & (Join-Path $PSScriptRoot 'setup-camera.ps1') -HttpsPort ([int]$env:SPM_HTTPS_PORT)
    }
    $readyPython=Get-SpmHealthyVenv
    if(-not $readyPython){throw 'Virtualenv belum siap; jalankan setup.cmd kembali.'}
    Save-SpmToolPaths $nodePath $readyPython.BasePath
    Write-Host 'Instalasi selesai. Jalankan start.cmd. Akun dummy lokal ada di runtime/test-access.txt.'
    Write-Host 'Untuk kamera HP dengan bingkai: jalankan setup-camera.cmd sekali dan ikuti docs/deployment/local-camera.md.'
} finally {Pop-Location}
