@echo off
chcp 65001 >nul
title Arari PRO - Robust EXE Builder

echo ========================================
   Arari PRO - Robust EXE Builder
echo ========================================
echo.

echo [STEP 1/3] Ensuring next.config.mjs is configured for static export...
findstr /C:"output: 'export'" "arari-app\next.config.mjs" >nul
if %errorlevel% neq 0 (
    echo ERROR: 'output: ^'export^'' not found in arari-app\next.config.mjs.
    echo Please add it to enable static site generation.
    pause
    exit /b 1
)
echo Config OK.
echo.

echo [STEP 2/3] Building Next.js frontend...
cd arari-app
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: npm run build failed.
    pause
    exit /b 1
)
cd ..
echo Frontend build complete. The 'out' directory has been generated.
echo.

echo [STEP 3/3] Building executable with PyInstaller...
pyinstaller --noconfirm --onefile --name ArariPRO \
--add-data "arari-app/out;out" \
--add-data "arari-app/api/templates;api/templates" \
--hidden-import="babel.numbers" \
arari-app/api/main.py

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
