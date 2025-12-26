@echo off
chcp 65001 >nul 2>&1
title Arari PRO - Stop Servers

echo.
echo  ========================================
echo       Arari PRO - Detener Servidores
echo  ========================================
echo.

echo  Deteniendo Node.js (Frontend)...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] Node.js detenido
) else (
    echo  [INFO] No habia Node.js activo
)

echo.
echo  Deteniendo Python (Backend)...
taskkill /F /IM python.exe >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] Python detenido
) else (
    echo  [INFO] No habia Python activo
)

echo.
echo  ========================================
echo   Servidores detenidos
echo  ========================================
echo.
pause
