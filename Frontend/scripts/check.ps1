. (Join-Path $PSScriptRoot '..\..\Backend\scripts\common.ps1')
$nodePath=Find-SpmNode
Push-Location (Split-Path -Parent $PSScriptRoot)
try {Invoke-SpmNpm $nodePath @('run','check')} finally {Pop-Location}
