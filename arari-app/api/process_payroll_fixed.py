r"""
Process all payroll Excel files from D:\給料明細
FIXED VERSION: Adds db.commit() to persist records
"""

import sqlite3
import sys
from pathlib import Path

from salary_parser import SalaryStatementParser
from services import PayrollService

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Set folder path
folder_path = r"D:\給料明細"
path = Path(folder_path)

# Find all .xlsm files
xlsm_files = sorted(list(path.glob("*.xlsm")))
xlsm_files = [f for f in xlsm_files if not f.name.startswith("~$")]  # Skip temp files

print(f"Procesando {len(xlsm_files)} archivos .xlsm...")
print("=" * 80)

# Connect to database
db = sqlite3.connect("arari_pro.db")
db.row_factory = sqlite3.Row

service = PayrollService(db)
total_saved = 0
files_processed = 0

for idx, file_path in enumerate(xlsm_files, 1):
    try:
        print(f"\n[{idx}/{len(xlsm_files)}] Procesando: {file_path.name}")

        # Read file
        with open(file_path, "rb") as f:
            file_content = f.read()

        # Parse
        parser = SalaryStatementParser()
        payroll_records = parser.parse(file_content)

        print(f"  [OK] Encontrados {len(payroll_records)} registros")

        # Save to database
        saved_count = 0
        for record_data in payroll_records:
            try:
                service.create_payroll_record(record_data)
                saved_count += 1
            except Exception as e:
                # Skip old employees not in current master
                if "not found" not in str(e):
                    print(f"    [WARNING] Error guardando registro: {e}")

        # CRITICAL FIX: Commit after each file
        db.commit()

        print(f"  [OK] Guardados {saved_count} registros (COMMITTED)")
        total_saved += saved_count
        files_processed += 1

    except Exception as e:
        print(f"  [ERROR] {e}")
        db.rollback()  # Rollback on error

# Final commit (just in case)
db.commit()
db.close()

print("\n" + "=" * 80)
print("PROCESO COMPLETADO")
print(f"   Archivos procesados: {files_processed}/{len(xlsm_files)}")
print(f"   Total registros guardados: {total_saved}")
print("   COMMITTED a la base de datos")
print("=" * 80)

# Verify final count
db_verify = sqlite3.connect("arari_pro.db")
cursor = db_verify.cursor()
cursor.execute("SELECT COUNT(*) FROM payroll_records")
final_count = cursor.fetchone()[0]
db_verify.close()

print(f"\n[VERIFICACION] Registros en DB: {final_count}")
if final_count == total_saved:
    print("[SUCCESS] Todos los registros fueron guardados correctamente!")
else:
    print(f"[WARNING] Discrepancia: guardados={total_saved}, en DB={final_count}")
