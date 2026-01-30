#!/usr/bin/env python3
"""
Corregir todos los imports relativos en los módulos de api/
Fix all relative imports in api/ modules
"""

import os
import re
from pathlib import Path

api_dir = Path(r"d:\Arari-PROv3.0\arari-app\api")
modules_to_fix = [
    'additional_costs', 'agent_commissions', 'alerts', 'audit', 'auth',
    'auth_dependencies', 'backup', 'budget', 'cache', 'database',
    'database_config', 'employee_parser', 'employee_rates', 'export_service',
    'find_headers', 'japanese_format', 'models', 'notifications', 'path_security',
    'process_payroll_fixed', 'recalculate_margins', 'recalculate_paid_leave_days',
    'reports', 'roi', 'salary_parser', 'search', 'services',
    'template_manager', 'totp_service', 'validation'
]

# Mapping de imports relativos a imports con api.
import_map = {
    pattern: f"from api.{pattern}" 
    for pattern in modules_to_fix
}

def fix_imports_in_file(file_path):
    """Corregir imports en un archivo"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes = 0
    
    # Reemplazar imports relativos
    for module in modules_to_fix:
        # Pattern: from module import ...
        pattern = f"from {module} import"
        if pattern in content:
            replacement = f"from api.{module} import"
            content = content.replace(pattern, replacement)
            changes += 1
            print(f"  Fijo: {pattern} -> {replacement}")
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    print("Corrigiendo imports en módulos api/")
    print("="*60)
    
    # Encontrar todos los archivos .py en api/
    py_files = list(api_dir.glob("*.py"))
    py_files = [f for f in py_files if f.name != "main.py"]  # main.py ya está hecho
    
    total = len(py_files)
    fixed = 0
    
    for file in py_files:
        print(f"\nProcesando: {file.name}")
        if fix_imports_in_file(file):
            fixed += 1
    
    print("\n" + "="*60)
    print(f"Archivos procesados: {total}")
    print(f"Archivos modificados: {fixed}")
    print("="*60)

if __name__ == "__main__":
    main()
