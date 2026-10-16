. (Join-Path $PSScriptRoot 'common.ps1')
if(-not $env:SONAR_HOST_URL -or -not $env:SONAR_TOKEN){throw 'Authorized SONAR_HOST_URL and SONAR_TOKEN are required; no scan was sent.'}
$scanner=Get-Command sonar-scanner -ErrorAction SilentlyContinue
if(-not $scanner){throw 'Install the approved company Sonar scanner. No scan was sent.'}
Push-Location $SpmRoot
try{& $scanner.Source;if($LASTEXITCODE -ne 0){throw 'Sonar scan failed.'};Write-Host 'Scanner completed; verify the returned company quality gate separately.'}finally{Pop-Location}
