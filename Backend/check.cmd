@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check.ps1"
set "spm_command_exit=%errorlevel%"
if not "%spm_command_exit%"=="0" pause
exit /b %spm_command_exit%
