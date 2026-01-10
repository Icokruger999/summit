@echo off
echo ========================================
echo   Summit Backend Server
echo ========================================
echo.
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0start-server.ps1"
pause

