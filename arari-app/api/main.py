"""
粗利 PRO v2.0 - Backend API
FastAPI + SQLite backend for profit management system
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn

from database import init_db, get_db
from models import Employee, PayrollRecord, EmployeeCreate, PayrollRecordCreate
from services import PayrollService, ExcelParser
from typing import List, Optional
import sqlite3

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    init_db()
    print("✅ Database initialized")
    yield
    # Shutdown
    print("👋 Shutting down...")

app = FastAPI(
    title="粗利 PRO API",
    description="利益管理システム - Backend API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== Health Check ==============

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "2.0.0"}

# ============== Employees ==============

@app.get("/api/employees", response_model=List[Employee])
async def get_employees(
    db: sqlite3.Connection = Depends(get_db),
    search: Optional[str] = None,
    company: Optional[str] = None
):
    """Get all employees with optional filtering"""
    service = PayrollService(db)
    return service.get_employees(search=search, company=company)

@app.get("/api/employees/{employee_id}", response_model=Employee)
async def get_employee(employee_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Get a single employee by ID"""
    service = PayrollService(db)
    employee = service.get_employee(employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@app.post("/api/employees", response_model=Employee)
async def create_employee(employee: EmployeeCreate, db: sqlite3.Connection = Depends(get_db)):
    """Create a new employee"""
    service = PayrollService(db)
    return service.create_employee(employee)

@app.put("/api/employees/{employee_id}", response_model=Employee)
async def update_employee(
    employee_id: str,
    employee: EmployeeCreate,
    db: sqlite3.Connection = Depends(get_db)
):
    """Update an existing employee"""
    service = PayrollService(db)
    updated = service.update_employee(employee_id, employee)
    if not updated:
        raise HTTPException(status_code=404, detail="Employee not found")
    return updated

@app.delete("/api/employees/{employee_id}")
async def delete_employee(employee_id: str, db: sqlite3.Connection = Depends(get_db)):
    """Delete an employee"""
    service = PayrollService(db)
    if not service.delete_employee(employee_id):
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}

# ============== Payroll Records ==============

@app.get("/api/payroll", response_model=List[PayrollRecord])
async def get_payroll_records(
    db: sqlite3.Connection = Depends(get_db),
    period: Optional[str] = None,
    employee_id: Optional[str] = None
):
    """Get all payroll records with optional filtering"""
    service = PayrollService(db)
    return service.get_payroll_records(period=period, employee_id=employee_id)

@app.get("/api/payroll/periods")
async def get_available_periods(db: sqlite3.Connection = Depends(get_db)):
    """Get list of available periods"""
    service = PayrollService(db)
    return service.get_available_periods()

@app.post("/api/payroll", response_model=PayrollRecord)
async def create_payroll_record(
    record: PayrollRecordCreate,
    db: sqlite3.Connection = Depends(get_db)
):
    """Create a new payroll record"""
    service = PayrollService(db)
    return service.create_payroll_record(record)

# ============== Statistics ==============

@app.get("/api/statistics")
async def get_statistics(
    db: sqlite3.Connection = Depends(get_db),
    period: Optional[str] = None
):
    """Get dashboard statistics"""
    service = PayrollService(db)
    return service.get_statistics(period=period)

@app.get("/api/statistics/monthly")
async def get_monthly_statistics(
    db: sqlite3.Connection = Depends(get_db),
    year: Optional[int] = None,
    month: Optional[int] = None
):
    """Get monthly statistics"""
    service = PayrollService(db)
    return service.get_monthly_statistics(year=year, month=month)

@app.get("/api/statistics/companies")
async def get_company_statistics(db: sqlite3.Connection = Depends(get_db)):
    """Get statistics by company"""
    service = PayrollService(db)
    return service.get_company_statistics()

@app.get("/api/statistics/trend")
async def get_profit_trend(
    db: sqlite3.Connection = Depends(get_db),
    months: int = 6
):
    """Get profit trend for last N months"""
    service = PayrollService(db)
    return service.get_profit_trend(months=months)

# ============== File Upload ==============

@app.post("/api/upload")
async def upload_payroll_file(
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db)
):
    """Upload and parse a payroll file (Excel or CSV)"""
    # Validate file type
    allowed_extensions = ['.xlsx', '.xlsm', '.xls', '.csv']
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    try:
        # Read file content
        content = await file.read()

        # Parse file
        parser = ExcelParser()
        records = parser.parse(content, file_ext)

        # Save to database
        service = PayrollService(db)
        saved_count = 0
        errors = []

        for record in records:
            try:
                service.create_payroll_record(record)
                saved_count += 1
            except Exception as e:
                errors.append(str(e))

        return {
            "success": True,
            "filename": file.filename,
            "total_records": len(records),
            "saved_records": saved_count,
            "errors": errors[:5] if errors else None  # Return first 5 errors only
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")

# ============== Export ==============

@app.get("/api/export/employees")
async def export_employees(db: sqlite3.Connection = Depends(get_db)):
    """Export all employees as JSON"""
    service = PayrollService(db)
    return service.get_employees()

@app.get("/api/export/payroll")
async def export_payroll(
    db: sqlite3.Connection = Depends(get_db),
    period: Optional[str] = None
):
    """Export payroll records as JSON"""
    service = PayrollService(db)
    return service.get_payroll_records(period=period)

# ============== Run Server ==============

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
