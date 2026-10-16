$ErrorActionPreference='Stop'
$SpmRoot=Split-Path -Parent $PSScriptRoot
$SpmRuntime=Join-Path $SpmRoot 'runtime'
New-Item -ItemType Directory -Path $SpmRuntime -Force | Out-Null
$SpmTemp=Join-Path $SpmRuntime 'temp'
New-Item -ItemType Directory -Path $SpmTemp -Force | Out-Null
$env:TEMP=$SpmTemp; $env:TMP=$SpmTemp
$env:npm_config_cache=Join-Path $SpmRuntime 'npm-cache'
. (Join-Path $PSScriptRoot 'process-control.ps1')
. (Join-Path $PSScriptRoot 'runtime-tools.ps1')
function Import-SpmEnv {
    $envFile=Join-Path $SpmRoot '.env'
    if (-not (Test-Path -LiteralPath $envFile)) {throw 'Jalankan setup.cmd terlebih dahulu.'}
    foreach ($line in [System.IO.File]::ReadAllLines($envFile)) {if($line -match '^([A-Z][A-Z0-9_]*)=(.*)$') {[Environment]::SetEnvironmentVariable($Matches[1],$Matches[2],'Process')}}
    if(-not $env:OCR_MODEL_DIR){$env:OCR_MODEL_DIR=Join-Path $SpmRoot 'cv_engine\models\ocr'}
    elseif(-not [System.IO.Path]::IsPathRooted($env:OCR_MODEL_DIR)){$env:OCR_MODEL_DIR=Join-Path $SpmRoot $env:OCR_MODEL_DIR}
    $script:SpmLanAddresses=@()
    if($env:SPM_LAN_ENABLED -eq '1' -and $env:NODE_ENV -eq 'development'){
        $script:SpmLanAddresses=@(Get-SpmLanAddresses)
        $env:HOST='0.0.0.0'
        $env:CORS_ORIGINS=Get-SpmLocalOrigins $env:CORS_ORIGINS $script:SpmLanAddresses $env:PORT
    }
    if($env:SPM_HTTPS_ENABLED -eq '1'){
        if(-not $env:SPM_HTTPS_PORT){$env:SPM_HTTPS_PORT='8443'}
        $secureOrigins=@(('https://127.0.0.1:'+$env:SPM_HTTPS_PORT),('https://localhost:'+$env:SPM_HTTPS_PORT))+@($script:SpmLanAddresses | ForEach-Object {'https://'+$_+':'+$env:SPM_HTTPS_PORT})
        $env:CORS_ORIGINS=((@($env:CORS_ORIGINS -split ',')+$secureOrigins) | Where-Object {$_} | Sort-Object -Unique) -join ','
    }
}
function Get-SpmLanAddresses {
    return @(Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object {$_.IPv4DefaultGateway} | ForEach-Object {$_.IPv4Address.IPAddress} | Where-Object {$_ -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'} | Sort-Object -Unique)
}
function Set-SpmEnvValues($values) {
    $envFile=Join-Path $SpmRoot '.env'
    $lines=@([System.IO.File]::ReadAllLines($envFile))
    foreach($name in $values.Keys){
        $found=$false
        $lines=@(foreach($line in $lines){if($line -match ('^'+[regex]::Escape($name)+'=')){$found=$true;$name+'='+$values[$name]}else{$line}})
        if(-not $found){$lines+=($name+'='+$values[$name])}
    }
    [System.IO.File]::WriteAllLines($envFile,$lines,[System.Text.UTF8Encoding]::new($false))
}
function Invoke-SpmNpm($nodePath,$arguments) {
    $env:PATH=(Split-Path -Parent $nodePath)+';'+$env:PATH
    & $nodePath (Join-Path (Split-Path -Parent $nodePath) 'node_modules\npm\bin\npm-cli.js') @arguments
    if ($LASTEXITCODE -ne 0) {throw 'Langkah npm gagal; lihat pesan di atas.'}
}
