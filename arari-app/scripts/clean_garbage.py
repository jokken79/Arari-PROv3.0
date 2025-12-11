
import sqlite3
import os

DB_PATH = "api/arari_pro.db"

def clean_garbage_records():
    if not os.path.exists(DB_PATH):
        print("Database not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Delete records with invalid IDs
    invalid_ids = ['0', '000000', '', None]
    
    # Also delete where ID is NOT composed of digits or is just '0'
    print("Deleting invalid payroll records (ID=0, empty)...")
    
    try:
        cursor.execute("DELETE FROM payroll_records WHERE employee_id IN ('0', '000000', '') OR employee_id IS NULL")
        deleted_payroll = cursor.rowcount
        print(f"Deleted {deleted_payroll} bad payroll records.")
        
        cursor.execute("DELETE FROM employees WHERE employee_id IN ('0', '000000', '') OR employee_id IS NULL")
        deleted_employees = cursor.rowcount
        print(f"Deleted {deleted_employees} bad employee records.")
        
        conn.commit()
        print("Cleanup complete.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    if os.path.exists("arari-app"):
        os.chdir("arari-app")
    clean_garbage_records()
