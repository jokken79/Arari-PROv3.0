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

cd /d "%~dp0"

if "%choice%"=="3" (
    :: Load NEXT_PUBLIC_API_URL from .env file
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="NEXT_PUBLIC_API_URL" set NEXT_PUBLIC_API_URL_VALUE=%%b
    )
    if not defined NEXT_PUBLIC_API_URL_VALUE (
        echo ERROR: NEXT_PUBLIC_API_URL not found in .env.
        pause
        exit /b 1
    )
    docker-compose build --build-arg NEXT_PUBLIC_API_URL="%NEXT_PUBLIC_API_URL_VALUE%"
    docker-compose up -d
) else if "%choice%"=="1" (
    docker-compose up -d
) else if "%choice%"=="2" (
    docker-compose down
) else (
    echo Invalid choice.
)

pause
