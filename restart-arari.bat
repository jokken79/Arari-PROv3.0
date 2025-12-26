@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title Arari PRO - Quick Restart

echo.
echo  ========================================
echo       Arari PRO - Reinicio Rapido
echo  ========================================
echo.

REM Verificar si existe archivo de ultimo puerto
if exist "%~dp0.last-port" (
    set /p LAST_PORT=<"%~dp0.last-port"
    echo  Usando ultimo puerto: !LAST_PORT!
    echo.
    call "%~dp0start-arari.bat" !LAST_PORT!
) else (
    echo  No hay configuracion previa.
    echo  Ejecutando configuracion inicial...
    echo.
    call "%~dp0start-arari.bat"
)
