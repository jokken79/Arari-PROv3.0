"""
粗利 PRO v2.0 - Backend API
FastAPI + SQLite backend for profit management system
"""

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uvicorn
import tempfile
import os

from database import init_db, get_db
from models import Employee, PayrollRecord, EmployeeCreate, PayrollRecordCreate
from services import PayrollService, ExcelParser
from salary_parser import SalaryStatementParser
from employee_parser import DBGenzaiXParser
from template_manager import TemplateManager, create_template_from_excel
from typing import List, Optional
import sqlite3
from datetime import datetime
from io import BytesIO
from pathlib import Path
from fastapi.responses import Response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database
    init_db()
    print("[OK] Database initialized")
    yield
    # Shutdown
    print("[SHUTDOWN] Closing application...")

app = FastAPI(
    title="粗利 PRO API",
    description="利益管理システム - Backend API",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware for React frontend
# Allow all frontend instances (ports 4000-4009 for multi-instance setup)
# CORS middleware - Allow dynamic localhost ports for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
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
    company: Optional[str] = None,
    employee_type: Optional[str] = None
):
    """Get all employees with optional filtering by search, company, and employee_type"""
    service = PayrollService(db)
    return service.get_employees(search=search, company=company, employee_type=employee_type)

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
    result = service.create_payroll_record(record)
    db.commit()  # Explicit commit after single record creation
    return result

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

# ============== Sync Employees ==============

@app.post("/api/sync-employees")
async def sync_employees(db: sqlite3.Connection = Depends(get_db)):
    """Sync/update employees from ChinginGenerator database"""
    try:
        from migrate_employees import migrate_employees_sync
        success, stats = migrate_employees_sync(db)

        if success:
            return {
                "success": True,
                "message": f"Sincronización completada: {stats['total_added']} empleados importados/actualizados",
                "stats": stats
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Error en sincronización: {stats.get('error', 'Error desconocido')}"
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# ============== Import Employees Endpoint ==============

@app.post("/api/import-employees")
async def import_employees(
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db)
):
    """
    Dedicated endpoint for importing employees from Excel (DBGenzaiX format).
    Used by EmployeeUploader.tsx
    """
    allowed_extensions = ['.xlsx', '.xlsm', '.xls']
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    try:
        content = await file.read()
        
        # Save temp file for parser
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
            
        try:
            parser = DBGenzaiXParser()
            employees, stats = parser.parse_employees(tmp_path)
            print(f"[INFO] /api/import-employees: Parsed {len(employees)} employees. Stats: {stats}")
            
            service = PayrollService(db)
            added_count = 0
            updated_count = 0
            
            for emp in employees:
                emp_data = EmployeeCreate(
                    employee_id=emp.employee_id,
                    name=emp.name,
                    name_kana=emp.name_kana,
                    dispatch_company=emp.dispatch_company if emp.dispatch_company else "Unknown",
                    department=emp.department,
                    hourly_rate=emp.hourly_rate,
                    billing_rate=emp.billing_rate,
                    status=emp.status,
                    hire_date=emp.hire_date,
                    # NEW FIELDS - 2025-12-11
                    employee_type=emp.employee_type,
                    gender=emp.gender,
                    birth_date=emp.birth_date,
                    termination_date=emp.termination_date,
                )
                
                existing = service.get_employee(emp.employee_id)
                if existing:
                    service.update_employee(emp.employee_id, emp_data)
                    updated_count += 1
                else:
                    service.create_employee(emp_data)
                    added_count += 1
            
            return {
                "status": "success",
                "message": f"Successfully imported {len(employees)} employees",
                "employees_added": added_count,
                "employees_updated": updated_count,
                "employees_skipped": stats['rows_skipped'],
                "total_employees": len(employees),
                "errors": parser.errors
            }
            
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
                
    except Exception as e:
        print(f"[ERROR] Import failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_payroll_file(
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db)
):
    """Upload and parse a payroll file (Excel or CSV) with Streaming Log"""
    from fastapi.responses import StreamingResponse
    import json
    import os
    import tempfile
    from fastapi.concurrency import run_in_threadpool

    async def log_generator():
        try:
            yield json.dumps({"type": "info", "message": f"Upload started: {file.filename}"}) + "\n"

            # Validate file type
            allowed_extensions = ['.xlsx', '.xlsm', '.xls', '.csv']
            file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''

            if file_ext not in allowed_extensions:
                yield json.dumps({
                    "type": "error", 
                    "message": f"Invalid extension. Allowed: {', '.join(allowed_extensions)}"
                }) + "\n"
                return

            # Validate file size (max 50MB)
            MAX_FILE_SIZE = 50 * 1024 * 1024 
            content = await file.read()
            
            if len(content) > MAX_FILE_SIZE:
                 yield json.dumps({
                    "type": "error", 
                    "message": f"File too large (>50MB). Size: {len(content) / 1024 / 1024:.2f}MB"
                }) + "\n"
                 return

            yield json.dumps({"type": "info", "message": "File read successfully. Detecting type..."}) + "\n"

            # ---------------------------------------------------------
            # CASE A: Payroll File (給与明細)
            # ---------------------------------------------------------
            if file_ext in ['.xlsm', '.xlsx'] and ('給与' in file.filename or '給料' in file.filename or '明細' in file.filename):
                yield json.dumps({"type": "info", "message": "Detected: Payroll Statement (給与明細)"}) + "\n"
                yield json.dumps({"type": "progress", "message": "Parsing Excel file (this may take a moment)..."}) + "\n"
                
                parser = SalaryStatementParser(use_intelligent_mode=True)
                records = await run_in_threadpool(parser.parse, content)
                
                yield json.dumps({"type": "info", "message": f"Parsed {len(records)} records. Saving to database..."}) + "\n"
                
                service = PayrollService(db)
                saved_count = 0
                error_count = 0
                
                # Batch save or single transaction? Using single transaction for speed/consistency
                cursor = db.cursor()
                cursor.execute("BEGIN TRANSACTION")
                try:
                    total = len(records)
                    for i, record_data in enumerate(records):
                        try:
                            service.create_payroll_record(record_data)
                            saved_count += 1
                        except Exception as e:
                            error_count += 1
                        
                        # Report progress every 50 records
                        if (i+1) % 50 == 0:
                             yield json.dumps({
                                 "type": "progress", 
                                 "message": f"Saving records [{i+1}/{total}]...",
                                 "current": i+1,
                                 "total": total
                             }) + "\n"

                    db.commit()
                    yield json.dumps({
                        "type": "success",
                        "message": f"Successfully saved {saved_count} records.",
                        "stats": {"total": total, "saved": saved_count, "errors": error_count}
                    }) + "\n"
                    
                except Exception as e:
                    db.rollback()
                    yield json.dumps({"type": "error", "message": f"Database Error: {str(e)}"}) + "\n"
                    raise e

            # ---------------------------------------------------------
            # CASE B: Employee Master File (社員台帳)
            # ---------------------------------------------------------
            elif file_ext in ['.xlsx', '.xlsm', '.xls'] and ('社員' in file.filename or 'Employee' in file.filename or '台帳' in file.filename):
                yield json.dumps({"type": "info", "message": "Detected: Employee Master (社員台帳)"}) + "\n"
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
                    tmp.write(content)
                    tmp_path = tmp.name
                
                try:
                    parser = DBGenzaiXParser()
                    yield json.dumps({"type": "progress", "message": "Parsing Employees..."}) + "\n"
                    
                    employees, stats = await run_in_threadpool(parser.parse_employees, tmp_path)
                    yield json.dumps({"type": "info", "message": f"Found {len(employees)} employees."}) + "\n"

                    service = PayrollService(db)
                    imported_count = 0
                    total = len(employees)
                    
                    for i, emp in enumerate(employees):
                        # Convert/Upsert logic...
                        emp_data = EmployeeCreate(
                            employee_id=emp.employee_id,
                            name=emp.name,
                            name_kana=emp.name_kana,
                            dispatch_company=emp.dispatch_company if emp.dispatch_company else "Unknown",
                            department=emp.department,
                            hourly_rate=emp.hourly_rate,
                            billing_rate=emp.billing_rate,
                            status=emp.status,
                            hire_date=emp.hire_date,
                            employee_type=emp.employee_type,
                            gender=emp.gender,
                            birth_date=emp.birth_date,
                            termination_date=emp.termination_date,
                        )
                        existing = service.get_employee(emp.employee_id)
                        if existing:
                            service.update_employee(emp.employee_id, emp_data)
                        else:
                            service.create_employee(emp_data)
                        
                        imported_count += 1
                        
                        if (i+1) % 50 == 0:
                             yield json.dumps({
                                 "type": "progress", 
                                 "message": f"Syncing employees [{i+1}/{total}]...",
                                 "current": i+1,
                                 "total": total
                             }) + "\n"
                    
                    yield json.dumps({
                        "type": "success",
                        "message": f"Imported {imported_count} employees.",
                        "stats": {"total": total, "imported": imported_count}
                    }) + "\n"

                finally:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)

            else:
                 # Fallback (Generic)
                 yield json.dumps({"type": "info", "message": "Detected: Generic Excel/CSV"}) + "\n"
                 parser = ExcelParser()
                 records = await run_in_threadpool(parser.parse, content)
                 
                 service = PayrollService(db)
                 saved_count = 0
                 # Simple save loop
                 for i, r in enumerate(records):
                     service.create_payroll_record(r)
                     saved_count += 1
                     if (i+1) % 50 == 0:
                         yield json.dumps({"type": "progress", "message": f"Saving {i+1}..."}) + "\n"
                 
                 yield json.dumps({
                        "type": "success",
                        "message": f"Saved {saved_count} records.",
                        "stats": {"saved": saved_count}
                    }) + "\n"

            # Final Completion Signal
            yield json.dumps({"type": "complete", "message": "Processing Finished."}) + "\n"

        except Exception as e:
            yield json.dumps({"type": "error", "message": f"Critical Error: {str(e)}"}) + "\n"

    return StreamingResponse(log_generator(), media_type="application/x-ndjson")

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

@app.get("/api/export/all")
async def export_all_data(
    format: str = "excel",
    db: sqlite3.Connection = Depends(get_db)
):
    """Export all data (employees + payroll) as Excel"""
    from datetime import datetime
    service = PayrollService(db)
    employees = service.get_employees()
    payroll = service.get_payroll_records()

    if format == "excel":
        import openpyxl
        from io import BytesIO

        wb = openpyxl.Workbook()

        # Employees sheet
        ws_emp = wb.active
        ws_emp.title = "従業員一覧"
        if employees:
            # Headers
            headers = list(employees[0].keys())
            for col, header in enumerate(headers, 1):
                ws_emp.cell(row=1, column=col, value=header)
            # Data
            for row, emp in enumerate(employees, 2):
                for col, key in enumerate(headers, 1):
                    ws_emp.cell(row=row, column=col, value=emp.get(key))

        # Payroll sheet
        ws_pay = wb.create_sheet("給与明細")
        if payroll:
            headers = list(payroll[0].keys())
            for col, header in enumerate(headers, 1):
                ws_pay.cell(row=1, column=col, value=header)
            for row, record in enumerate(payroll, 2):
                for col, key in enumerate(headers, 1):
                    ws_pay.cell(row=row, column=col, value=record.get(key))

        # Save to bytes
        output = BytesIO()
        wb.save(output)
        output.seek(0)

        filename = f"arari_pro_export_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return Response(
            content=output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    return {"employees": employees, "payroll": payroll}


# ---------------------------------------------------------
# Wage Ledger Export (賃金台帳)
# ---------------------------------------------------------
class WageLedgerRequest(BaseModel):
    template_name: str  # 'format_b' or 'format_c'
    year: int
    target: str         # 'single' or 'all_in_company'
    employee_id: Optional[str] = None
    company_name: Optional[str] = None

@app.post("/api/export/wage-ledger")
async def export_wage_ledger(
    request: WageLedgerRequest,
    db: sqlite3.Connection = Depends(get_db)
):
    from api.export_service import WageLedgerExportService
    from fastapi.responses import FileResponse
    from starlette.background import BackgroundTask
    
    # Path to templates
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
    
    export_service = WageLedgerExportService(TEMPLATE_DIR)
    payroll_service = PayrollService(db)
    
    try:
        if request.target == 'single':
            if not request.employee_id:
                raise HTTPException(status_code=400, detail="Employee ID required for single export")
            
            # Fetch employee as dict (handling object or dict return)
            emp_obj = payroll_service.get_employee(request.employee_id)
            if not emp_obj:
                 raise HTTPException(status_code=404, detail="Employee not found")
            
            # Convert to dict for export service
            employee = emp_obj.__dict__ if hasattr(emp_obj, '__dict__') else emp_obj

            records = payroll_service.get_payroll_by_employee_year(request.employee_id, request.year)
            
            file_path = await run_in_threadpool(
                export_service.generate_ledger, 
                employee, records, request.template_name, request.year
            )
            
            filename = f"賃金台帳_{employee['name']}_{request.year}.xlsx"
            return FileResponse(
                path=file_path, 
                filename=filename, 
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                background=BackgroundTask(lambda: os.unlink(file_path)) 
            )

        elif request.target == 'all_in_company':
            if not request.company_name:
                raise HTTPException(status_code=400, detail="Company Name required for batch export")
            
            # 1. Get all employees in company
            all_employees = payroll_service.get_employees(company=request.company_name)
            
            export_requests = []
            
            for emp in all_employees:
                emp_dict = emp.__dict__ if hasattr(emp, '__dict__') else emp
                records = payroll_service.get_payroll_by_employee_year(emp_dict['employee_id'], request.year)
                
                export_requests.append({
                    "employee": emp_dict,
                    "records": records,
                    "template": request.template_name
                })
            
            if not export_requests:
                raise HTTPException(status_code=404, detail=f"No employees found for company: {request.company_name}")

            zip_path = await run_in_threadpool(
                export_service.create_batch_zip,
                export_requests, request.year
            )
            
            filename = f"賃金台帳_{request.company_name}_{request.year}.zip"
            return FileResponse(
                path=zip_path,
                filename=filename,
                media_type='application/zip',
                background=BackgroundTask(lambda: os.unlink(zip_path))
            )
            
        else:
             raise HTTPException(status_code=400, detail="Invalid target specified")

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sync-from-folder")
async def sync_from_folder(
    payload: dict,
    db: sqlite3.Connection = Depends(get_db)
):
    """Sync all .xlsm files from a folder path (Streaming Log)"""
    from pathlib import Path
    import os
    import json
    from fastapi.responses import StreamingResponse

    folder_path = payload.get("folder_path", "").strip()

    if not folder_path:
        raise HTTPException(status_code=400, detail="folder_path is required")

    # Normalize path for Windows
    folder_path = folder_path.replace("/", "\\")
    path = Path(folder_path)

    if not path.exists():
        raise HTTPException(status_code=400, detail=f"Folder not found: {folder_path}")

    if not path.is_dir():
        raise HTTPException(status_code=400, detail=f"Path is not a directory: {folder_path}")

    async def log_generator():
        # Setup initial state
        yield json.dumps({"type": "info", "message": f"Scanning folder: {folder_path}..."}) + "\n"
        
        xlsm_files = list(path.glob("*.xlsm"))
        
        if not xlsm_files:
             yield json.dumps({
                 "type": "error", 
                 "message": f"No .xlsm files found in {folder_path}",
                 "files_found": 0
             }) + "\n"
             return

        yield json.dumps({
            "type": "info", 
            "message": f"Found {len(xlsm_files)} .xlsm files. Starting process...",
            "files_found": len(xlsm_files)
        }) + "\n"

        service = PayrollService(db)
        total_saved = 0
        total_errors = 0
        files_processed = 0

        for i, file_path in enumerate(xlsm_files):
            filename = file_path.name
            try:
                yield json.dumps({
                    "type": "progress", 
                    "message": f"[{i+1}/{len(xlsm_files)}] Processing: {filename}...",
                    "current": i+1,
                    "total": len(xlsm_files),
                    "filename": filename
                }) + "\n"

                # Read file content
                with open(file_path, "rb") as f:
                    file_content = f.read()

                # Detect file type and parse
                lower_name = filename.lower()
                if "給" in lower_name or "給与" in lower_name or "給料" in lower_name:
                    parser = SalaryStatementParser(use_intelligent_mode=True)
                    payroll_records = parser.parse(file_content)
                else:
                    parser = ExcelParser()
                    payroll_records = parser.parse(file_content)

                # Insert records
                cursor = db.cursor()
                cursor.execute("BEGIN TRANSACTION")
                file_saved_count = 0
                
                try:
                    for record_data in payroll_records:
                        try:
                            service.create_payroll_record(record_data)
                            file_saved_count += 1
                            total_saved += 1
                        except Exception:
                            # total_errors += 1 # Don't count individual record errors as file errors
                            # raise # Let's try to save valid records 
                            pass # Skip bad records but keep others from same file? 
                            # Reverting to original logic: if one fails, transaction rollback?
                            # Original logic was: raise Exception to rollback file. 
                            # Let's keep it robust: rollback whole file if critical error, 
                            # OR better: skip bad records but save good ones?
                            # For safety/consistency let's skip bad ones but commit good ones.
                            pass

                    db.commit()
                    files_processed += 1
                    
                    yield json.dumps({
                        "type": "success", 
                        "message": f"  -> Success: Saved {file_saved_count} records.",
                        "file_saved": file_saved_count
                    }) + "\n"

                except Exception as db_err:
                    db.rollback()
                    raise db_err

            except Exception as e:
                total_errors += 1
                yield json.dumps({
                    "type": "error", 
                    "message": f"  -> Error processing {filename}: {str(e)}"
                }) + "\n"
        
        # Summary
        yield json.dumps({
            "type": "complete",
            "message": f"\n--- SYNC COMPLETED ---\nFiles Processed: {files_processed}\nTotal Records Saved: {total_saved}\nErrors: {total_errors}",
            "stats": {
                "files_processed": files_processed,
                "total_saved": total_saved,
                "total_errors": total_errors
            }
        }) + "\n"

    return StreamingResponse(log_generator(), media_type="application/x-ndjson")


# NOTE: Duplicate endpoint removed - using /api/import-employees defined at line ~216

# ============== SETTINGS ==============

@app.get("/api/settings")
async def get_settings(db: sqlite3.Connection = Depends(get_db)):
    """Get all system settings"""
    service = PayrollService(db)
    return service.get_all_settings()

@app.get("/api/settings/{key}")
async def get_setting(key: str, db: sqlite3.Connection = Depends(get_db)):
    """Get a single setting by key"""
    service = PayrollService(db)
    value = service.get_setting(key)
    if value is None:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    return {"key": key, "value": value}

@app.put("/api/settings/{key}")
async def update_setting(
    key: str,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db)
):
    """Update a setting"""
    service = PayrollService(db)
    value = payload.get("value")
    description = payload.get("description")

    if value is None:
        raise HTTPException(status_code=400, detail="'value' is required")

    service.update_setting(key, str(value), description)
    return {"key": key, "value": value, "status": "updated"}

@app.get("/api/settings/rates/insurance")
async def get_insurance_rates(db: sqlite3.Connection = Depends(get_db)):
    """Get current insurance rates"""
    service = PayrollService(db)
    return service.get_insurance_rates()


@app.get("/api/settings/ignored-companies")
async def get_ignored_companies(db: sqlite3.Connection = Depends(get_db)):
    """Get list of ignored companies"""
    service = PayrollService(db)
    return service.get_ignored_companies()

@app.post("/api/companies/{company_name}/toggle")
async def toggle_company_status(
    company_name: str,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db)
):
    """Toggle company active status"""
    service = PayrollService(db)
    active = payload.get("active", True)
    
    # Decode double-encoded URL component if needed or handle raw string
    # FastAPI handles URL decoding for path params automatically
    
    service.set_company_active(company_name, active)
    return {"status": "success", "company": company_name, "active": active}


# ============== TEMPLATES ==============

@app.get("/api/templates")
async def list_templates(include_inactive: bool = False):
    """List all factory templates"""
    template_manager = TemplateManager()
    templates = template_manager.list_templates(include_inactive=include_inactive)
    stats = template_manager.get_template_stats()
    return {
        "templates": templates,
        "stats": stats
    }

@app.get("/api/templates/{factory_id}")
async def get_template(factory_id: str):
    """Get a specific template by factory identifier"""
    template_manager = TemplateManager()
    template = template_manager.load_template(factory_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template not found: {factory_id}")
    return template

@app.put("/api/templates/{factory_id}")
async def update_template(factory_id: str, payload: dict):
    """Update a template's field positions or settings"""
    template_manager = TemplateManager()

    # Load existing template
    existing = template_manager.load_template(factory_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Template not found: {factory_id}")

    # Merge updates
    field_positions = payload.get('field_positions', existing.get('field_positions', {}))
    column_offsets = payload.get('column_offsets', existing.get('column_offsets', {}))
    detected_allowances = payload.get('detected_allowances', existing.get('detected_allowances', {}))
    non_billable_allowances = payload.get('non_billable_allowances', existing.get('non_billable_allowances', []))
    template_name = payload.get('template_name', existing.get('template_name'))
    notes = payload.get('notes', existing.get('notes'))

    success = template_manager.save_template(
        factory_identifier=factory_id,
        field_positions=field_positions,
        column_offsets=column_offsets,
        detected_allowances=detected_allowances,
        non_billable_allowances=non_billable_allowances,
        template_name=template_name,
        notes=notes,
        detection_confidence=existing.get('detection_confidence', 0.0),
        sample_employee_id=existing.get('sample_employee_id'),
        sample_period=existing.get('sample_period'),
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to update template")

    return {"status": "success", "message": f"Template '{factory_id}' updated"}

@app.delete("/api/templates/{factory_id}")
async def delete_template(factory_id: str, hard_delete: bool = False):
    """Delete (or deactivate) a template"""
    template_manager = TemplateManager()
    success = template_manager.delete_template(factory_id, hard_delete=hard_delete)

    if not success:
        raise HTTPException(status_code=404, detail=f"Template not found: {factory_id}")

    action = "deleted" if hard_delete else "deactivated"
    return {"status": "success", "message": f"Template '{factory_id}' {action}"}

@app.post("/api/templates/analyze")
async def analyze_excel_for_templates(file: UploadFile = File(...)):
    """
    Analyze an Excel file and generate templates for all sheets.
    Does NOT import payroll data - only creates templates.
    """
    # Validate file type
    allowed_extensions = ['.xlsx', '.xlsm', '.xls']
    file_ext = '.' + file.filename.split('.')[-1].lower() if '.' in file.filename else ''

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    try:
        content = await file.read()
        template_manager = TemplateManager()

        results = create_template_from_excel(content, template_manager)

        return {
            "status": "success",
            "filename": file.filename,
            "templates_created": results['templates_created'],
            "templates_failed": results['templates_failed'],
            "errors": results['errors'][:10] if results['errors'] else None
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error analyzing file: {str(e)}")

@app.post("/api/templates/create")
async def create_template_manually(payload: dict):
    """Create a new template manually (for custom factory formats)"""
    template_manager = TemplateManager()

    factory_identifier = payload.get('factory_identifier')
    if not factory_identifier:
        raise HTTPException(status_code=400, detail="'factory_identifier' is required")

    field_positions = payload.get('field_positions', {})
    if not field_positions:
        raise HTTPException(status_code=400, detail="'field_positions' is required")

    success = template_manager.save_template(
        factory_identifier=factory_identifier,
        field_positions=field_positions,
        column_offsets=payload.get('column_offsets', {
            'label': 1,
            'value': 3,
            'days': 5,
            'period': 8,
            'employee_id': 9,
        }),
        detected_allowances=payload.get('detected_allowances', {}),
        non_billable_allowances=payload.get('non_billable_allowances', []),
        employee_column_width=payload.get('employee_column_width', 14),
        detection_confidence=1.0,  # Manual = full confidence
        template_name=payload.get('template_name', factory_identifier),
        notes=payload.get('notes', 'Manually created template'),
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to create template")

    return {"status": "success", "message": f"Template '{factory_identifier}' created"}

# ============== AUTH ENDPOINTS ==============

from auth import AuthService, validate_token, has_permission
from fastapi import Header

@app.post("/api/auth/login")
async def login(payload: dict, db: sqlite3.Connection = Depends(get_db)):
    """Login and get token"""
    username = payload.get("username")
    password = payload.get("password")

    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")

    service = AuthService(db)
    result = service.login(username, password)

    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if "error" in result:
        raise HTTPException(status_code=403, detail=result["error"])

    return result

@app.post("/api/auth/logout")
async def logout(
    authorization: str = Header(None),
    db: sqlite3.Connection = Depends(get_db)
):
    """Logout and revoke token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")

    token = authorization.replace("Bearer ", "")
    service = AuthService(db)

    if service.logout(token):
        return {"message": "Logged out successfully"}
    return {"message": "Token not found or already revoked"}

@app.get("/api/auth/me")
async def get_current_user_info(
    authorization: str = Header(None),
    db: sqlite3.Connection = Depends(get_db)
):
    """Get current user info"""
    if not authorization:
        raise HTTPException(status_code=401, detail="No token provided")

    token = authorization.replace("Bearer ", "")
    user = validate_token(db, token)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user

@app.get("/api/users")
async def get_users(db: sqlite3.Connection = Depends(get_db)):
    """Get all users"""
    service = AuthService(db)
    return service.get_users()

@app.post("/api/users")
async def create_user(payload: dict, db: sqlite3.Connection = Depends(get_db)):
    """Create new user"""
    service = AuthService(db)
    result = service.create_user(
        username=payload.get("username"),
        password=payload.get("password"),
        role=payload.get("role", "viewer"),
        full_name=payload.get("full_name"),
        email=payload.get("email")
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result

# ============== ALERTS ENDPOINTS ==============

from alerts import AlertService

@app.get("/api/alerts")
async def get_alerts(
    severity: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get alerts with optional filtering"""
    service = AlertService(db)
    return service.get_alerts(severity=severity, is_resolved=is_resolved, period=period)

@app.get("/api/alerts/summary")
async def get_alerts_summary(db: sqlite3.Connection = Depends(get_db)):
    """Get alerts summary by severity"""
    service = AlertService(db)
    return service.get_alert_summary()

@app.post("/api/alerts/scan")
async def scan_for_alerts(
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Scan data and generate alerts"""
    service = AlertService(db)
    return service.scan_for_alerts(period=period)

@app.put("/api/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: int,
    payload: dict = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Resolve an alert"""
    service = AlertService(db)
    payload = payload or {}
    success = service.resolve_alert(
        alert_id,
        resolved_by=payload.get("resolved_by"),
        notes=payload.get("notes")
    )
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"status": "resolved"}

@app.get("/api/alerts/thresholds")
async def get_alert_thresholds(db: sqlite3.Connection = Depends(get_db)):
    """Get alert thresholds"""
    service = AlertService(db)
    return service.get_thresholds()

@app.put("/api/alerts/thresholds/{key}")
async def update_alert_threshold(
    key: str,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db)
):
    """Update alert threshold"""
    service = AlertService(db)
    value = payload.get("value")
    if value is None:
        raise HTTPException(status_code=400, detail="Value required")
    service.update_threshold(key, float(value))
    return {"status": "updated", "key": key, "value": value}

# ============== AUDIT ENDPOINTS ==============

from audit import AuditService

@app.get("/api/audit")
async def get_audit_logs(
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    limit: int = 100,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get audit logs"""
    service = AuditService(db)
    return service.get_logs(user_id=user_id, action=action, entity_type=entity_type, limit=limit)

@app.get("/api/audit/summary")
async def get_audit_summary(
    days: int = 7,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get audit summary"""
    service = AuditService(db)
    return service.get_summary(days=days)

@app.get("/api/audit/entity/{entity_type}/{entity_id}")
async def get_entity_history(
    entity_type: str,
    entity_id: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get history for a specific entity"""
    service = AuditService(db)
    return service.get_entity_history(entity_type, entity_id)

# ============== REPORTS ENDPOINTS ==============

from reports import ReportService
from fastapi.responses import Response

@app.get("/api/reports/monthly/{period}")
async def get_monthly_report_data(period: str, db: sqlite3.Connection = Depends(get_db)):
    """Get monthly report data"""
    service = ReportService(db)
    return service.get_monthly_report_data(period)

@app.get("/api/reports/employee/{employee_id}")
async def get_employee_report_data(
    employee_id: str,
    months: int = 6,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get employee report data"""
    service = ReportService(db)
    return service.get_employee_report_data(employee_id, months)

@app.get("/api/reports/company/{company}")
async def get_company_report_data(company: str, db: sqlite3.Connection = Depends(get_db)):
    """Get company report data"""
    service = ReportService(db)
    return service.get_company_report_data(company)

@app.get("/api/reports/download/{report_type}")
async def download_report(
    report_type: str,
    period: Optional[str] = None,
    employee_id: Optional[str] = None,
    company: Optional[str] = None,
    format: str = "excel",
    db: sqlite3.Connection = Depends(get_db)
):
    """Download report as Excel"""
    service = ReportService(db)

    # Get report data
    if report_type == "monthly" and period:
        data = service.get_monthly_report_data(period)
    elif report_type == "employee" and employee_id:
        data = service.get_employee_report_data(employee_id)
    elif report_type == "company" and company:
        data = service.get_company_report_data(company)
    else:
        raise HTTPException(status_code=400, detail="Invalid report parameters")

    if format == "excel":
        excel_bytes = service.generate_excel_report(report_type, data)
        filename = f"{report_type}_{period or employee_id or company}_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    return data

@app.get("/api/reports/history")
async def get_report_history(limit: int = 50, db: sqlite3.Connection = Depends(get_db)):
    """Get history of generated reports"""
    service = ReportService(db)
    return service.get_report_history(limit)

# ============== BUDGET ENDPOINTS ==============

from budget import BudgetService

@app.get("/api/budgets")
async def get_budgets(
    period: Optional[str] = None,
    entity_type: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get all budgets"""
    service = BudgetService(db)
    return service.get_budgets(period=period, entity_type=entity_type)

@app.post("/api/budgets")
async def create_budget(payload: dict, db: sqlite3.Connection = Depends(get_db)):
    """Create a new budget"""
    service = BudgetService(db)
    result = service.create_budget(
        period=payload.get("period"),
        entity_type=payload.get("entity_type", "total"),
        entity_id=payload.get("entity_id"),
        budget_revenue=payload.get("budget_revenue", 0),
        budget_cost=payload.get("budget_cost", 0),
        budget_profit=payload.get("budget_profit"),
        budget_margin=payload.get("budget_margin"),
        notes=payload.get("notes"),
        created_by=payload.get("created_by")
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result

@app.get("/api/budgets/compare/{period}")
async def compare_budget_vs_actual(
    period: str,
    entity_type: str = "total",
    entity_id: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Compare budget vs actual"""
    service = BudgetService(db)
    result = service.compare_budget_vs_actual(period, entity_type, entity_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result

@app.get("/api/budgets/summary")
async def get_budget_summary(year: Optional[int] = None, db: sqlite3.Connection = Depends(get_db)):
    """Get budget summary for a year"""
    service = BudgetService(db)
    return service.get_budget_summary(year)

@app.delete("/api/budgets/{budget_id}")
async def delete_budget(budget_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Delete a budget"""
    service = BudgetService(db)
    result = service.delete_budget(budget_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result

# ============== NOTIFICATIONS ENDPOINTS ==============

from notifications import NotificationService

@app.get("/api/notifications")
async def get_notifications(
    user_id: Optional[int] = None,
    unread_only: bool = False,
    limit: int = 50,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get notifications"""
    service = NotificationService(db)
    return service.get_notifications(user_id=user_id, unread_only=unread_only, limit=limit)

@app.get("/api/notifications/count")
async def get_unread_count(user_id: Optional[int] = None, db: sqlite3.Connection = Depends(get_db)):
    """Get unread notification count"""
    service = NotificationService(db)
    return {"unread_count": service.get_unread_count(user_id)}

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Mark notification as read"""
    service = NotificationService(db)
    if service.mark_as_read(notification_id):
        return {"status": "marked_as_read"}
    raise HTTPException(status_code=404, detail="Notification not found")

@app.put("/api/notifications/read-all")
async def mark_all_read(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Mark all notifications as read"""
    service = NotificationService(db)
    count = service.mark_all_read(user_id)
    return {"marked_count": count}

@app.get("/api/notifications/preferences/{user_id}")
async def get_notification_preferences(user_id: int, db: sqlite3.Connection = Depends(get_db)):
    """Get notification preferences"""
    service = NotificationService(db)
    return service.get_preferences(user_id)

@app.put("/api/notifications/preferences/{user_id}")
async def update_notification_preferences(
    user_id: int,
    payload: dict,
    db: sqlite3.Connection = Depends(get_db)
):
    """Update notification preferences"""
    service = NotificationService(db)
    return service.update_preferences(user_id, **payload)

# ============== SEARCH ENDPOINTS ==============

from search import SearchService

@app.get("/api/search/employees")
async def search_employees_get(
    q: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 50,
    db: sqlite3.Connection = Depends(get_db)
):
    """Advanced employee search"""
    service = SearchService(db)
    return service.search_employees(
        query=q, sort_by=sort_by, sort_order=sort_order,
        page=page, page_size=page_size
    )

@app.post("/api/search/employees")
async def search_employees_post(
    payload: dict,
    db: sqlite3.Connection = Depends(get_db)
):
    """Advanced employee search with filters"""
    service = SearchService(db)
    return service.search_employees(
        query=payload.get("query"),
        filters=payload.get("filters"),
        sort_by=payload.get("sort_by"),
        sort_order=payload.get("sort_order", "asc"),
        page=payload.get("page", 1),
        page_size=payload.get("page_size", 50)
    )

@app.get("/api/search/payroll")
async def search_payroll_records(
    q: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_order: str = "asc",
    page: int = 1,
    page_size: int = 50,
    db: sqlite3.Connection = Depends(get_db)
):
    """Advanced payroll search"""
    service = SearchService(db)
    return service.search_payroll(
        query=q, sort_by=sort_by, sort_order=sort_order,
        page=page, page_size=page_size
    )

@app.get("/api/search/anomalies")
async def find_anomalies(period: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """Find data anomalies"""
    service = SearchService(db)
    return service.find_anomalies(period)

@app.get("/api/search/suggestions")
async def get_suggestions(q: str, field: str = "all", db: sqlite3.Connection = Depends(get_db)):
    """Get search suggestions"""
    service = SearchService(db)
    return service.get_search_suggestions(q, field)

@app.get("/api/search/filters")
async def get_filter_options(db: sqlite3.Connection = Depends(get_db)):
    """Get available filter options"""
    service = SearchService(db)
    return service.get_filter_options()

# ============== VALIDATION ENDPOINTS ==============

from validation import ValidationService

@app.get("/api/validation")
async def validate_all_data(db: sqlite3.Connection = Depends(get_db)):
    """Run full data validation"""
    service = ValidationService(db)
    return service.validate_all()

@app.get("/api/validation/employees")
async def validate_employees_data(db: sqlite3.Connection = Depends(get_db)):
    """Validate employee data"""
    service = ValidationService(db)
    service.validate_employees()
    return service.get_summary()

@app.get("/api/validation/payroll")
async def validate_payroll_data(db: sqlite3.Connection = Depends(get_db)):
    """Validate payroll data"""
    service = ValidationService(db)
    service.validate_payroll()
    return service.get_summary()

@app.post("/api/validation/fix")
async def auto_fix_issues(
    payload: dict = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Auto-fix certain data issues"""
    service = ValidationService(db)
    fix_types = payload.get("fix_types") if payload else None
    return service.auto_fix(fix_types)

# ============== BACKUP ENDPOINTS ==============

from backup import BackupService

@app.get("/api/backups")
async def list_backups():
    """List all backups"""
    service = BackupService()
    return service.list_backups()

@app.post("/api/backups")
async def create_backup(payload: dict = None):
    """Create a new backup"""
    service = BackupService()
    description = payload.get("description") if payload else None
    result = service.create_backup(description)

    if "error" in result:
        raise HTTPException(status_code=500, detail=result["error"])

    return result

@app.get("/api/backups/stats")
async def get_backup_stats():
    """Get backup statistics"""
    service = BackupService()
    return service.get_backup_stats()

@app.post("/api/backups/{filename}/restore")
async def restore_backup(filename: str):
    """Restore from backup"""
    service = BackupService()
    result = service.restore_backup(filename)

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return result

@app.get("/api/backups/{filename}/verify")
async def verify_backup(filename: str):
    """Verify backup integrity"""
    service = BackupService()
    return service.verify_backup(filename)

@app.delete("/api/backups/{filename}")
async def delete_backup_file(filename: str):
    """Delete a backup"""
    service = BackupService()
    result = service.delete_backup(filename)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result

# ============== ROI ENDPOINTS ==============

from roi import ROIService

@app.get("/api/roi/clients")
async def get_client_roi(
    company: Optional[str] = None,
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get ROI by client"""
    service = ROIService(db)
    return service.calculate_client_roi(company, period)

@app.get("/api/roi/employees")
async def get_employee_roi(
    employee_id: Optional[str] = None,
    period: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db)
):
    """Get ROI by employee"""
    service = ROIService(db)
    return service.calculate_employee_roi(employee_id, period)

@app.get("/api/roi/summary")
async def get_roi_summary(period: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """Get ROI summary"""
    service = ROIService(db)
    return service.get_roi_summary(period)

@app.get("/api/roi/trend")
async def get_roi_trend(months: int = 6, db: sqlite3.Connection = Depends(get_db)):
    """Get ROI trend"""
    service = ROIService(db)
    return service.get_roi_trend(months)

@app.get("/api/roi/recommendations")
async def get_roi_recommendations(period: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """Get ROI improvement recommendations"""
    service = ROIService(db)
    return service.get_recommendations(period)

@app.get("/api/roi/compare")
async def compare_roi_periods(
    period1: str,
    period2: str,
    db: sqlite3.Connection = Depends(get_db)
):
    """Compare ROI between two periods"""
    service = ROIService(db)
    return service.compare_periods(period1, period2)

# ============== CACHE ENDPOINTS ==============

from cache import CacheService

@app.get("/api/cache/stats")
async def get_cache_stats(db: sqlite3.Connection = Depends(get_db)):
    """Get cache statistics"""
    service = CacheService(db)
    return {
        "memory": service.get_stats(),
        "persistent": service.get_persistent_stats()
    }

@app.post("/api/cache/clear")
async def clear_cache(payload: dict = None, db: sqlite3.Connection = Depends(get_db)):
    """Clear cache"""
    service = CacheService(db)
    pattern = payload.get("pattern") if payload else None
    memory_cleared = service.clear(pattern)
    persistent_cleared = service.clear_persistent(pattern)
    return {
        "memory_cleared": memory_cleared,
        "persistent_cleared": persistent_cleared
    }

# ============== Run Server ==============


# ============== RESET DATA ==============

@app.delete("/api/reset-db")
async def reset_database(
    db: sqlite3.Connection = Depends(get_db),
    target: str = "all"
):
    """
    Delete data from the database based on the target.
    - `payroll`: Deletes only payroll records.
    - `employees`: Deletes employees and their associated payroll records.
    - `all`: Deletes all data (default).
    """
    if target not in ["payroll", "employees", "all"]:
        raise HTTPException(status_code=400, detail="El parámetro 'target' no es válido. Los valores permitidos son 'payroll', 'employees', 'all'.")

    try:
        cursor = db.cursor()
        
        if target == "payroll":
            cursor.execute("DELETE FROM payroll_records")
            message = "Todos los registros de nómina han sido eliminados."
        elif target == "employees":
            cursor.execute("DELETE FROM payroll_records")
            cursor.execute("DELETE FROM employees")
            message = "Todos los empleados y sus registros de nómina han sido eliminados."
        elif target == "all":
            cursor.execute("DELETE FROM payroll_records")
            cursor.execute("DELETE FROM employees")
            message = "Todos los datos han sido eliminados."

        db.commit()
        
        return {"status": "success", "message": message}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete data: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
