import json
import os
import sys
import subprocess
import time
import socket
import webbrowser
from pathlib import Path

# --- COLORS ---
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log(msg, type="INFO"):
    if type == "INFO":
        print(f"{Colors.BLUE}[INFO] {msg}{Colors.ENDC}")
    elif type == "SUCCESS":
        print(f"{Colors.GREEN}[SUCCESS] {msg}{Colors.ENDC}")
    elif type == "WARN":
        print(f"{Colors.WARNING}[WARN] {msg}{Colors.ENDC}")
    elif type == "ERROR":
        print(f"{Colors.FAIL}[ERROR] {msg}{Colors.ENDC}")
    else:
        print(msg)

# --- GRANATE LOADER ---
def load_granate():
    try:
        with open("granate.json", "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        log("granate.json not found! Using defaults.", "WARN")
        return {
            "project": {"name": "Unknown"},
            "network": {"backend_port": 8000, "frontend_port": 3000},
            "paths": {"backend": "./api", "frontend": "./"}
        }

config = load_granate()

# --- UTILS ---
def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def check_dependencies():
    log("Checking dependencies...", "INFO")
    
    # Check Python
    if subprocess.call("python --version", shell=True, stdout=subprocess.DEVNULL) != 0:
        log("Python not found!", "ERROR")
        return False
        
    # Check Node
    if subprocess.call("node --version", shell=True, stdout=subprocess.DEVNULL) != 0:
        log("Node.js not found!", "ERROR")
        return False
        
    # Check Backend Deps
    backend_path = Path(config["paths"]["backend"])
    if not (backend_path / "__pycache__").exists():
        log("Installing Backend dependencies...", "INFO")
        subprocess.check_call(config["scripts"]["install_backend"], shell=True)
        
    # Check Frontend Deps
    frontend_path = Path(config["paths"]["frontend"])
    if not (frontend_path / "node_modules").exists():
        log("Installing Frontend dependencies...", "INFO")
        subprocess.check_call(config["scripts"]["install_frontend"], shell=True)
        
    return True

# --- COMMANDS ---

def doctor():
    print(f"\n{Colors.BOLD}=== MORFEO DOCTOR ==={Colors.ENDC}")
    print(f"Project: {config['project']['name']} v{config['project']['version']}")
    
    # Check Ports
    b_port = config["network"]["backend_port"]
    f_port = config["network"]["frontend_port"]
    
    if is_port_in_use(b_port):
        log(f"Backend Port {b_port} is BUSY", "WARN")
    else:
        log(f"Backend Port {b_port} is FREE", "SUCCESS")
        
    if is_port_in_use(f_port):
        log(f"Frontend Port {f_port} is BUSY", "WARN")
    else:
        log(f"Frontend Port {f_port} is FREE", "SUCCESS")
        
    # Check Paths
    if Path(config["paths"]["backend"]).exists():
        log("Backend directory found", "SUCCESS")
    else:
        log("Backend directory MISSING", "ERROR")

    print(f"{Colors.BOLD}===================={Colors.ENDC}\n")

def start():
    if not check_dependencies():
        return

    b_port = config["network"]["backend_port"]
    f_port = config["network"]["frontend_port"]
    host = config["network"]["host"]
    
    print(f"\n{Colors.HEADER}=== MORFEO: WAKING UP THE SYSTEM ==={Colors.ENDC}")
    
    # Allow override via args (simple version)
    # Ideally use argparse, but keeping it simple for integration with start.bat logic
    if "CUSTOM_PORTS" in os.environ:
        b_port = int(os.environ.get("BACKEND_PORT", b_port))
        f_port = int(os.environ.get("FRONTEND_PORT", f_port))
        
    log(f"Target: Backend={b_port}, Frontend={f_port}", "INFO")

    # Start Backend
    backend_cmd = f"cd {config['paths']['backend']} && set FRONTEND_PORT={f_port}&& python -m uvicorn {config['paths']['backend_entry']} --reload --host {host} --port {b_port}"
    subprocess.Popen(f'start "Arari Backend (Morfeo)" cmd /k "{backend_cmd}"', shell=True)
    log("Backend process launched", "SUCCESS")
    
    time.sleep(2)
    
    # Start Frontend
    frontend_cmd = f"set PORT={f_port}&& set NEXT_PUBLIC_API_URL=http://localhost:{b_port}&& npm run dev"
    subprocess.Popen(f'start "Arari Frontend (Morfeo)" cmd /k "{frontend_cmd}"', shell=True)
    log("Frontend process launched", "SUCCESS")
    
    print(f"\n{Colors.BOLD}System is running!{Colors.ENDC}")
    print(f"Frontend: http://localhost:{f_port}")
    print(f"Backend:  http://localhost:{b_port}")
    
    time.sleep(3)
    webbrowser.open(f"http://localhost:{f_port}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python morfeo.py [start|doctor]")
        return
        
    command = sys.argv[1]
    
    if command == "start":
        start()
    elif command == "doctor":
        doctor()
    else:
        log(f"Unknown command: {command}", "ERROR")

if __name__ == "__main__":
    main()
