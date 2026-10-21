@echo off
if not exist "%~dp0Frontend\dist\index.html" (
  echo Frontend belum dibangun. Jalankan setup.cmd di folder utama terlebih dahulu.
  exit /b 1
)
call "%~dp0Backend\start.cmd"
exit /b %errorlevel%
