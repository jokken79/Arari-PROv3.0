@echo off
chcp 65001 >nul
title Arari PRO - EXE Builder

echo ========================================
echo    Arari PRO - EXE Builder
echo ========================================
echo.

cd /d "%~dp0\.."

REM Verificar PyInstaller
python -m PyInstaller --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PyInstaller no encontrado
    echo Instalando: pip install pyinstaller
    pip install pyinstaller
)

echo [STEP 1/1] Building executable with PyInstaller...
python -m PyInstaller --noconfirm --onefile --name ArariPRO --console --add-data "arari-app;arari-app" --hidden-import="babel.numbers" arari-app/api/main.py

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] PyInstaller build failed.
    pause
    exit /b 1
)

echo.
echo ========================================
echo    BUILD SUCCESSFUL
echo ========================================
echo.
echo El ejecutable esta en la carpeta 'dist'
echo.

pause
