import sys
import os
import sqlite3
from pathlib import Path

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from employee_parser import DBGenzaiXParser, EmployeeRecord
from services import PayrollService
from models import EmployeeCreate
from database import get_connection

def sync_employees_from_master():
    master_file = r"D:\【新】社員台帳(UNS)T　2022.04.05～.xlsm"
    
    if not os.path.exists(master_file):
        print(f"[ERROR] Master file not found at: {master_file}")
        return

    print(f"Starting sync from: {master_file}")
    
    # 1. Parse Employees
    parser = DBGenzaiXParser()
    employees, stats = parser.parse_employees(master_file)
    
    print(f"Parsed {len(employees)} employees.")
    print(f"Stats: {stats}")
    
    if not employees:
        print("[WARNING] No employees found. Aborting sync.")
        return

    # 2. Sync to DB
    conn = get_connection()
    service = PayrollService(conn)
    
    created_count = 0
    updated_count = 0
    errors = 0
    
    try:
        for emp in employees:
            try:
                # Check if exists
                existing = service.get_employee(emp.employee_id)
                
                emp_data = EmployeeCreate(
                    employee_id=emp.employee_id,
                    name=emp.name,
                    name_kana=emp.name_kana,
                    dispatch_company=emp.dispatch_company,
                    department=emp.department,
                    hourly_rate=emp.hourly_rate,
                    billing_rate=emp.billing_rate,
                    status=emp.status,
                    hire_date=emp.hire_date
                )
                
                if existing:
                    # Update
                    service.update_employee(emp.employee_id, emp_data)
                    updated_count += 1
                else:
                    # Create
                    service.create_employee(emp_data)
                    created_count += 1
                    
            except Exception as e:
                print(f"[ERROR] Failed to sync employee {emp.employee_id}: {e}")
                errors += 1
                
        print("\nSync Completed!")
        print(f"Created: {created_count}")
        print(f"Updated: {updated_count}")
        print(f"Errors:  {errors}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    sync_employees_from_master()
