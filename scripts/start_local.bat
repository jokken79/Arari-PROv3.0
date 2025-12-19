@echo off
chcp 65001 >nul
title 粗利 PRO v2.0 (Powered by Morfeo)

echo ========================================
echo    粗利 PRO v2.0 - Startup
echo ========================================
echo.
echo    This project is managed by Morfeo Task Runner
echo.

:: Ask for custom ports if needed
echo Press Enter to use default ports (from granate.json)
echo Or type specific port numbers below.
echo.

set /p BACKEND_PORT="Enter Backend Port (default 8000): "
set /p FRONTEND_PORT="Enter Frontend Port (default 3000): "

:: Set env var to signal Morfeo to look at env vars if user typed something
if not "%BACKEND_PORT%"=="" set CUSTOM_PORTS=true
if not "%FRONTEND_PORT%"=="" set CUSTOM_PORTS=true

:: Run Morfeo
cd /d "%~dp0\..\arari-app"
python morfeo.py start

pause
