@echo off
chcp 65001 >nul
title Arari PRO Docker Manager

echo ========================================
echo    Arari PRO - Docker Manager
echo ========================================
echo.
echo    1. Start Application
echo    2. Stop Application
echo    3. Rebuild and Start Application
echo.
set /p choice="Enter your choice (1, 2, or 3): "

if "%choice%"=="1" (
    docker-compose up -d
) else if "%choice%"=="2" (
    docker-compose down
) else if "%choice%"=="3" (
    docker-compose up --build -d
) else (
    echo Invalid choice.
)

pause
