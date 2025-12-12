@echo off
chcp 65001 >nul
title 粗利 PRO v2.0

echo ========================================
echo    粗利 PRO v2.0 - Starting...
echo ========================================
echo.

:: Puertos estándar del proyecto
set BACKEND_PORT=8000
set FRONTEND_PORT=3000

echo [CONFIG] Backend Port:  %BACKEND_PORT%
echo [CONFIG] Frontend Port: %FRONTEND_PORT%
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
echo [INFO] Starting Backend (FastAPI) on port %BACKEND_PORT%...
start "Arari Backend" cmd /k "cd api && python -m uvicorn main:app --reload --host 0.0.0.0 --port %BACKEND_PORT%"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo [INFO] Starting Frontend (Next.js) on port %FRONTEND_PORT%...
start "Arari Frontend" cmd /k "set PORT=%FRONTEND_PORT%&& set NEXT_PUBLIC_API_URL=http://localhost:%BACKEND_PORT%&& npm run dev"

echo.
echo ========================================
echo    粗利 PRO v2.0 is starting!
echo ========================================
echo.
echo    Frontend:  http://localhost:%FRONTEND_PORT%
echo    Backend:   http://localhost:%BACKEND_PORT%
echo    API Docs:  http://localhost:%BACKEND_PORT%/docs
echo.
echo    Close the terminal windows to stop.
echo ========================================
echo.

:: Open browser after a short delay
timeout /t 5 /nobreak >nul
start http://localhost:%FRONTEND_PORT%

pause
