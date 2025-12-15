
import os
import subprocess
import re

def kill_server():
    try:
        # Try reading as utf-16 (powershell default)
        try:
            with open("pid.txt", "r", encoding="utf-16") as f:
                content = f.read()
        except:
            with open("pid.txt", "r", encoding="utf-8") as f:
                content = f.read()
                
        print("Content:", content)
        
        # Parse PIDs
        # Line format: TCP 0.0.0.0:8765 0.0.0.0:0 LISTENING 1234
        pids = set()
        for line in content.splitlines():
            line = line.strip()
            if not line: continue
            parts = line.split()
            if len(parts) > 0:
                pid = parts[-1]
                if pid.isdigit():
                    pids.add(pid)
                    
        if not pids:
            print("No PIDs found.")
            return

        for pid in pids:
            print(f"Killing PID: {pid}")
            os.system(f"taskkill /F /PID {pid}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    kill_server()
