@echo off
chcp 65001 >nul
title Arari PRO - Docker Manager

echo.
echo ========================================
echo    Arari PRO - Docker Manager
echo ========================================
echo.

REM Verificar Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker no encontrado
    echo Instala Docker Desktop: https://docker.com
    pause
    exit /b 1
)
echo [OK] Docker encontrado
echo.

echo    1. Iniciar aplicacion
echo    2. Detener aplicacion
echo    3. Reconstruir e iniciar
echo    4. Ver logs
echo.
set /p choice="Selecciona opcion (1-4): "

cd /d "%~dp0\..\docker"

if "%choice%"=="1" (
    echo.
    echo Iniciando contenedores...
    docker-compose up -d
    echo.
    echo [OK] Aplicacion iniciada
    echo Frontend: http://localhost:3000
    echo Backend:  http://localhost:8000
) else if "%choice%"=="2" (
    echo.
    echo Deteniendo contenedores...
    docker-compose down
    echo [OK] Aplicacion detenida
) else if "%choice%"=="3" (
    echo.
    echo Reconstruyendo...
    REM Cargar NEXT_PUBLIC_API_URL desde .env
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if "%%a"=="NEXT_PUBLIC_API_URL" set NEXT_PUBLIC_API_URL_VALUE=%%b
    )
    if not defined NEXT_PUBLIC_API_URL_VALUE (
        echo [ERROR] NEXT_PUBLIC_API_URL no encontrado en .env
        pause
        exit /b 1
    )
    docker-compose build --build-arg NEXT_PUBLIC_API_URL="%NEXT_PUBLIC_API_URL_VALUE%"
    docker-compose up -d
    echo [OK] Aplicacion reconstruida e iniciada
) else if "%choice%"=="4" (
    echo.
    echo Mostrando logs (Ctrl+C para salir)...
    docker-compose logs -f
) else (
    echo [ERROR] Opcion no valida
)

echo.
pause
