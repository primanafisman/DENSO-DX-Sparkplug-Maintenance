param([int]$HttpsPort=8443)
. (Join-Path $PSScriptRoot 'common.ps1')
Import-SpmEnv
if($env:NODE_ENV -ne 'development'){throw 'Setup kamera ini untuk development lokal.'}
if($HttpsPort -lt 1 -or $HttpsPort -gt 65535 -or $HttpsPort -in @([int]$env:PORT,([uri]$env:CV_URL).Port)){throw 'Port HTTPS harus berbeda dari API HTTP/CV.'}
$pythonPath=Join-Path $SpmRoot 'cv_engine\.venv\Scripts\python.exe'
if(-not (Test-Path -LiteralPath $pythonPath)){throw 'Jalankan setup.cmd terlebih dahulu.'}
& $pythonPath -m pip install --no-cache-dir --disable-pip-version-check --timeout 120 -r (Join-Path $SpmRoot 'cv_engine\requirements-camera.lock.txt')
if($LASTEXITCODE -ne 0){throw 'Instalasi alat sertifikat gagal. Cek koneksi lalu jalankan setup-camera.cmd kembali.'}
$tlsDirectory=Join-Path $SpmRuntime 'tls'
New-Item -ItemType Directory -Path $tlsDirectory -Force | Out-Null
# Keep private signing keys readable only by this Windows account and SYSTEM.
$accountSid=[Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $tlsDirectory '/inheritance:r' '/grant:r' ('*'+$accountSid+':(OI)(CI)F') '*S-1-5-18:(OI)(CI)F' | Out-Null
if($LASTEXITCODE -ne 0){throw 'Izin folder sertifikat tidak dapat dibatasi.'}
$addresses=@(Get-SpmLanAddresses)
$arguments=@((Join-Path $PSScriptRoot 'generate-camera-certificate.py'),'--directory',$tlsDirectory)
foreach($address in $addresses){$arguments+=@('--ip',$address)}
& $pythonPath @arguments
if($LASTEXITCODE -ne 0){throw 'Pembuatan sertifikat gagal. CA lama tidak diganti otomatis.'}
$cameraOrigins=@(('https://127.0.0.1:'+$HttpsPort),('https://localhost:'+$HttpsPort))+@($addresses | ForEach-Object {'https://'+$_+':'+$HttpsPort})
$origins=((@($env:CORS_ORIGINS -split ',')+$cameraOrigins) | Where-Object {$_} | Sort-Object -Unique) -join ','
Set-SpmEnvValues @{SPM_LAN_ENABLED='1';SPM_HTTPS_ENABLED='1';SPM_HTTPS_PORT=[string]$HttpsPort;SPM_TLS_CERT='runtime/tls/server-cert.pem';SPM_TLS_KEY='runtime/tls/server-key.pem';SPM_TLS_CA='runtime/tls/ca-cert.pem';CORS_ORIGINS=$origins}
Write-Host 'Sertifikat siap. Layanan yang sedang berjalan tetap berjalan; restart dengan stop.cmd lalu start.cmd saat siap.'
Write-Host 'Jalankan setup-lan.cmd sebagai administrator untuk izin port HTTPS pada jaringan Private.'
Write-Host 'Pasang HANYA runtime/tls/camera-ca.cer pada HP lalu aktifkan kepercayaan sertifikat. Jangan salin file key.'
foreach($address in $addresses){Write-Host ('Alamat kamera HP: https://'+$address+':'+$HttpsPort+'/')}
if(-not $addresses.Count){Write-Host 'Belum ada IP LAN aktif. Sambungkan Wi-Fi lalu jalankan setup-camera.cmd kembali.'}
Write-Host 'Petunjuk lengkap: docs/deployment/local-camera.md'
