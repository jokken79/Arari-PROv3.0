import sqlite3
import os

DB_PATH = "api/arari_pro.db"

if not os.path.exists(DB_PATH):
    print(f"ERROR: Database file {DB_PATH} not found!")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

try:
    print("--- Database Verification ---")
    
    # Check Employees
    cursor.execute("SELECT COUNT(*) FROM employees")
    emp_count = cursor.fetchone()[0]
    print(f"Total Employees: {emp_count}")
    
    # Check Payroll Records
    cursor.execute("SELECT COUNT(*), MIN(period), MAX(period) FROM payroll_records")
    pay_stats = cursor.fetchone()
    print(f"Total Payroll Records: {pay_stats[0]}")
    print(f"Period Range: {pay_stats[1]} to {pay_stats[2]}")
    
    if pay_stats[0] > 0:
        cursor.execute("SELECT period, COUNT(*) FROM payroll_records GROUP BY period ORDER BY period DESC LIMIT 5")
        print("\nRecent Periods:")
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]} records")

except Exception as e:
    print(f"Error querying database: {e}")
finally:
    conn.close()
