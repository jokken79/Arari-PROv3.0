@echo off
chcp 65001 >nul
title Arari PRO - Robust EXE Builder

echo ========================================
   Arari PRO - Robust EXE Builder
echo ========================================
echo.

cd /d "%~dp0\.."
echo [STEP 1/1] Building executable with PyInstaller...
python -m PyInstaller --noconfirm --onefile --name ArariPRO --console --add-data "arari-app;arari-app" --hidden-import="babel.numbers" arari-app/api/main.py

if %errorlevel% neq 0 (
    echo ERROR: PyInstaller build failed.
    pause
    exit /b 1
)

echo.
echo ========================================
   BUILD SUCCESSFUL
echo ========================================
echo The executable is located in the 'dist' folder.
echo.

pause
