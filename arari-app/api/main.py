import subprocess
import threading
import time
import json
import logging
import os
import sqlite3
import sys
import tempfile
import webbrowser
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from database import get_db, init_db

# Import modular routers
from routers import (
    employees_router,
    payroll_router,
    statistics_router,
    settings_router,
    reset_router,
    additional_costs_router,
    companies_router,
    auth_router,
    alerts_router,
    reports_router,
    audit_router,
    budget_router,
    notifications_router,
    search_router,
    validation_router,
    backup_router,
    roi_router,
    cache_router,
    two_fa_router,
    bulk_operations_router,
)

load_dotenv()

frontend_process = None

def start_frontend_in_thread(app_dir: Path, port: int):
    global frontend_process

    frontend_path = app_dir # The bundled arari-app directory
    node_exe = None
    npm_exe = None

    if sys.platform == "win32":
        # PyInstaller on Windows might bundle node.exe and npm.cmd
        if getattr(sys, 'frozen', False):
            # When running as a PyInstaller bundle, sys._MEIPASS is the temp folder
            possible_node_paths = [
                Path(sys._MEIPASS) / "node" / "node.exe",
                Path(sys._MEIPASS) / "node.exe",
            ]
            possible_npm_paths = [
                Path(sys._MEIPASS) / "node" / "npm.cmd",
                Path(sys._MEIPASS) / "npm.cmd",
            ]

            for p in possible_node_paths:
                if p.exists():
                    node_exe = p
                    break
            for p in possible_npm_paths:
                if p.exists():
                    npm_exe = p
                    break

            if not node_exe or not npm_exe:
                logging.error(f"Node.js or npm not found in bundle at {sys._MEIPASS}. Node found: {node_exe}, NPM found: {npm_exe}")
                logging.error("Trying system default npm/node. Ensure Node.js is installed on the target system.")
                node_exe = None # Fallback to system PATH
                npm_exe = None # Fallback to system PATH
            else:
                logging.info(f"Found bundled Node.js: {node_exe} and NPM: {npm_exe}")


    # Command to start Next.js development server
    npm_command = [str(npm_exe)] if npm_exe else ["npm"]
    command = npm_command + ["run", "dev"] # We want 'next dev' behavior

    env = os.environ.copy()
    # Need to set NEXT_PUBLIC_API_URL here for the frontend at runtime
    # When bundled, the backend is on 127.0.0.1:8000
    env["NEXT_PUBLIC_API_URL"] = f"http://127.0.0.1:{port}"
    env["BROWSER"] = "none" # Prevent Next.js from opening browser

    # Run in the 'arari-app' directory
    logging.info(f"Starting Next.js frontend with command: {' '.join(command)} in {frontend_path}")
    logging.info(f"Frontend API URL set to: {env['NEXT_PUBLIC_API_URL']}")

    try:
        # Use shell=True for windows if npm.cmd is found as it's a batch file,
        # or if falling back to system npm which might be a global shell command.
        frontend_process = subprocess.Popen(
            command,
            cwd=frontend_path,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1, # Line-buffered output
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0 # For Windows to allow graceful termination
        )

        # Read stdout/stderr in separate threads to avoid deadlocks
        def log_stream(stream, log_func):
            for line in iter(stream.readline, ''):
                log_func(f"[Frontend] {line.strip()}")
            stream.close()

        threading.Thread(target=log_stream, args=(frontend_process.stdout, logging.info)).start()
        threading.Thread(target=log_stream, args=(frontend_process.stderr, logging.error)).start()

        logging.info(f"Frontend process started with PID: {frontend_process.pid}")
        # Give frontend some time to start up
        time.sleep(5)

    except FileNotFoundError:
        logging.error("Failed to start frontend: npm/node command not found. Please ensure Node.js and npm are installed and in PATH, or correctly bundled.")
    except Exception as e:
        logging.error(f"Unhandled error starting frontend: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    init_db()
    logging.info("Database initialized successfully")

    # Configure logging
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(log_dir / "arari_pro.log"),
            logging.StreamHandler()
        ]
    )
    logging.info("Application startup complete.")

    # Start frontend if running as bundled app
    if getattr(sys, 'frozen', False):
        logging.info("Running as PyInstaller bundled app. Starting Next.js frontend...")
        bundled_app_path = Path(sys._MEIPASS) / "arari-app"

        # Ensure node_modules exist, if not, attempt npm install
        if not (bundled_app_path / "node_modules").exists():
            logging.warning(f"node_modules not found in bundled arari-app at {bundled_app_path}. Attempting npm install...")
            try:
                npm_exe = None
                if sys.platform == "win32":
                    possible_npm_paths = [
                        Path(sys._MEIPASS) / "node" / "npm.cmd",
                        Path(sys._MEIPASS) / "npm.cmd",
                    ]
                    for p in possible_npm_paths:
                        if p.exists():
                            npm_exe = p
                            break

                npm_command = [str(npm_exe)] if npm_exe else ["npm"]

                logging.info(f"Running npm install with command: {' '.join(npm_command + ['install', '--force'])} in {bundled_app_path}")
                subprocess.run(
                    npm_command + ["install", "--force"],
                    cwd=bundled_app_path,
                    check=True,
                    capture_output=True,
                    text=True,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == "win32" else 0
                )
                logging.info("npm install completed in bundled app.")
            except subprocess.CalledProcessError as e:
                logging.error(f"npm install failed in bundled app: {e.stdout}\n{e.stderr}")
                raise RuntimeError("Failed to install frontend dependencies in bundled app.")
            except Exception as e:
                logging.error(f"Error during npm install fallback: {e}")
                raise RuntimeError(f"Failed to install frontend dependencies: {e}")


        frontend_port = 3000 # Default Next.js port
        # Start frontend in a separate thread
        threading.Thread(target=start_frontend_in_thread, args=(bundled_app_path, frontend_port)).start()

        logging.info(f"Frontend started (or attempting to start) on port {frontend_port}")

        # Give frontend some time to fully initialize
        time.sleep(10)
        webbrowser.open(f"http://127.0.0.1:{frontend_port}")
    else:
        logging.info("Running in development/unfrozen environment. Frontend should be started separately.")

    yield
    # Shutdown
    if frontend_process:
        logging.info(f"Terminating frontend process (PID: {frontend_process.pid})...")
        if sys.platform == "win32":
            # For Windows, use taskkill for a more robust termination of process group
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(frontend_process.pid)], check=True)
            except subprocess.CalledProcessError as e:
                logging.error(f"Error during taskkill: {e}")
        else:
            frontend_process.terminate()
        frontend_process.wait(timeout=10) # Give it some time to terminate
        if frontend_process.poll() is None:
            logging.warning("Frontend process did not terminate gracefully, killing it.")
            frontend_process.kill()
        logging.info("Frontend process terminated.")

    logging.info("Application shutdown complete")

app = FastAPI(
    title="粗利 PRO API",
    description="利益管理システム - Backend API",
    version="3.0.0",
    lifespan=lifespan
)

# CORS middleware for React frontend
# Allow dynamic localhost ports for development + production FRONTEND_URL
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
cors_origins = []

# Add production frontend URL if configured
if FRONTEND_URL:
    cors_origins.append(FRONTEND_URL)
    # Also allow without trailing slash
    if FRONTEND_URL.endswith("/"):
        cors_origins.append(FRONTEND_URL.rstrip("/"))
    else:
        cors_origins.append(FRONTEND_URL + "/")
    logging.info(f"[CORS] Production frontend URL: {FRONTEND_URL}")

# For development and Vercel preview deployments
# Regex allows: localhost, LAN IPs, and only arari-* Vercel deployments (security fix)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else [],
    allow_origin_regex=r"(http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?|https://arari[a-z0-9-]*\.vercel\.app)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Allow client to read response headers
    max_age=3600,  # Cache preflight requests for 1 hour
)

# ============== Include Modular Routers ==============
app.include_router(employees_router)
app.include_router(payroll_router)
app.include_router(statistics_router)
app.include_router(settings_router)
app.include_router(reset_router)
app.include_router(additional_costs_router)
app.include_router(companies_router)
app.include_router(auth_router)
app.include_router(alerts_router)
app.include_router(reports_router)
app.include_router(audit_router)
app.include_router(budget_router)
app.include_router(notifications_router)
app.include_router(search_router)
app.include_router(validation_router)
app.include_router(backup_router)
app.include_router(roi_router)
app.include_router(cache_router)
app.include_router(two_fa_router)
app.include_router(bulk_operations_router)

# ============== Health Check ==============

@app.get("/api/health")
async def health_check(db: sqlite3.Connection = Depends(get_db)):
    """
    Health check endpoint for monitoring and uptime verification.

    Returns:
    - status: "healthy" or "degraded"
    - version: API version
    - timestamp: Current server time
    - database: Database connectivity status
    - environment: "development" or "production"
    """
    start_time = time.time()

    try:
        # Check database connectivity
        cursor = db.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    elapsed_ms = (time.time() - start_time) * 1000

    # Determine environment
    environment = "production" if os.environ.get("FRONTEND_URL") else "development"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "version": "3.0.0",
        "timestamp": datetime.now().isoformat(),
        "database": db_status,
        "environment": environment,
        "response_time_ms": round(elapsed_ms, 2),
        "api_endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "openapi": "/openapi.json"
        }
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
