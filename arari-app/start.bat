@echo off
chcp 65001 >nul
title 粗利 PRO v2.0

echo ========================================
echo    粗利 PRO v2.0 - Starting...
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo [ERROR] Please run this script from the arari-app directory
    pause
    exit /b 1
)

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not in PATH
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

:: Install backend dependencies if needed
if not exist "api\__pycache__" (
    echo [INFO] Installing backend dependencies...
    pip install -r api\requirements.txt
)

:: Install frontend dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies...
    call npm install
)

echo.
echo [INFO] Starting Backend (FastAPI) on port 8000...
start "Arari Backend" cmd /k "cd api && python main.py"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo [INFO] Starting Frontend (Next.js) on port 3000...
start "Arari Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo    粗利 PRO v2.0 is starting!
echo ========================================
echo.
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:8000
echo    API Docs:  http://localhost:8000/docs
echo.
echo    Close the terminal windows to stop.
echo ========================================
echo.

:: Open browser after a short delay
timeout /t 5 /nobreak >nul
start http://localhost:3000

pause
