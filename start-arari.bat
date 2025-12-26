@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title Arari PRO - Server Launcher

echo.
echo  ========================================
echo       Arari PRO - Server Launcher
echo  ========================================
echo.

REM Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python no encontrado
    pause
    exit /b 1
)
echo  [OK] Python encontrado

REM Verificar Node
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js no encontrado
    pause
    exit /b 1
)
echo  [OK] Node.js encontrado

echo.

REM Obtener puerto
if "%~1"=="" (
    echo  Ejemplos:
    echo    877 = Backend:8877, Frontend:3877
    echo    999 = Backend:8999, Frontend:3999
    echo    000 = Backend:8000, Frontend:3000
    echo.
    set /p PORT_SUFFIX="  Ingresa 3 digitos: "
) else (
    set PORT_SUFFIX=%~1
)

REM Default si esta vacio
if "!PORT_SUFFIX!"=="" set PORT_SUFFIX=000

REM Calcular puertos
set BACKEND_PORT=8!PORT_SUFFIX!
set FRONTEND_PORT=3!PORT_SUFFIX!

echo.
echo  Backend:  localhost:!BACKEND_PORT!
echo  Frontend: localhost:!FRONTEND_PORT!
echo.

REM Crear .env.local para frontend
echo NEXT_PUBLIC_API_URL=http://localhost:!BACKEND_PORT!> "%~dp0arari-app\.env.local"
echo NEXT_PUBLIC_API_PORT=!BACKEND_PORT!>> "%~dp0arari-app\.env.local"
echo NEXT_PUBLIC_FRONTEND_PORT=!FRONTEND_PORT!>> "%~dp0arari-app\.env.local"
echo NEXT_PUBLIC_ENABLE_AUTH=true>> "%~dp0arari-app\.env.local"
echo  [OK] Frontend .env.local creado

REM Crear .env para backend
echo BACKEND_PORT=!BACKEND_PORT!> "%~dp0arari-app\api\.env"
echo FRONTEND_PORT=!FRONTEND_PORT!>> "%~dp0arari-app\api\.env"
echo FRONTEND_URL=http://localhost:!FRONTEND_PORT!>> "%~dp0arari-app\api\.env"
echo.>> "%~dp0arari-app\api\.env"
echo # Admin credentials (change in production!)>> "%~dp0arari-app\api\.env"
echo ADMIN_USERNAME=admin>> "%~dp0arari-app\api\.env"
echo ADMIN_PASSWORD=admin123>> "%~dp0arari-app\api\.env"
echo ADMIN_EMAIL=admin@arari-pro.local>> "%~dp0arari-app\api\.env"
echo  [OK] Backend .env creado

REM Guardar puerto para restart
echo !PORT_SUFFIX!> "%~dp0.last-port"

echo.
echo  Iniciando servidores...
echo.

REM Iniciar Backend
start "Arari Backend :!BACKEND_PORT!" cmd /k "cd /d "%~dp0arari-app\api" && python -m uvicorn main:app --reload --port !BACKEND_PORT! --host 0.0.0.0"

REM Esperar un poco
ping -n 4 127.0.0.1 >nul

REM Iniciar Frontend (0.0.0.0 permite acceso desde red local)
start "Arari Frontend :!FRONTEND_PORT!" cmd /k "cd /d "%~dp0arari-app" && npm run dev -- -p !FRONTEND_PORT! -H 0.0.0.0"

echo.
echo  ========================================
echo   Servidores iniciados!
echo  ========================================
echo.
echo   Backend:  http://localhost:!BACKEND_PORT!
echo   Frontend: http://localhost:!FRONTEND_PORT!
echo   Upload:   http://localhost:!FRONTEND_PORT!/upload
echo.
echo   Para detener: stop-arari.bat
echo.
echo  ========================================
echo.

REM Esperar que cargue
ping -n 8 127.0.0.1 >nul

REM Abrir navegador
start http://localhost:!FRONTEND_PORT!

echo  Navegador abierto. Esta ventana se puede cerrar.
echo.
pause
