"""
粗利 PRO v2.0 - Backend API
FastAPI + SQLite backend for profit management system
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
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
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4321",
    "http://127.0.0.1:4321",
]

# Add all 10 frontend instance ports (4000-4009)
for port in range(4000, 4010):
    allowed_origins.extend([
        f"http://localhost:{port}",
        f"http://127.0.0.1:{port}",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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

    # Validate file size (max 50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB in bytes

    try:
        # Read file content
        content = await file.read()

        # Check file size after reading
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: 50MB. Your file: {len(content) / 1024 / 1024:.2f}MB"
            )

        # Detect file type and use appropriate parser
        # Use specialized SalaryStatementParser for .xlsm salary statement files
        template_stats = None
        if file_ext == '.xlsm' and ('給与明細' in file.filename or '給料明細' in file.filename):
            parser = SalaryStatementParser(use_intelligent_mode=True)
            records = parser.parse(content)
            template_stats = parser.get_parsing_stats()
        else:
            # Use existing ExcelParser for simple CSV/XLSX files
            parser = ExcelParser()
            records = parser.parse(content, file_ext)

        # Save to database with transaction support
        # All records are saved in a single transaction - if any fails, all rollback
        service = PayrollService(db)
        saved_count = 0
        skipped = []  # Employees not found in database
        errors = []   # Other errors

        # Optimize N+1 queries: Load all employees once and create lookup map
        all_employees = service.get_employees()
        employee_map = {emp['employee_id']: emp for emp in all_employees}

        # Start explicit transaction
        cursor = db.cursor()
        cursor.execute("BEGIN TRANSACTION")

        try:
            for record in records:
                try:
                    # Check if employee exists using pre-loaded map (O(1) lookup)
                    employee = employee_map.get(record.employee_id)
                    if not employee:
                        skipped.append({
                            'employee_id': record.employee_id,
                            'period': record.period,
                            'reason': 'Employee not found in database'
                        })
                        continue

                    service.create_payroll_record(record)
                    saved_count += 1

                except sqlite3.IntegrityError as e:
                    # Duplicate record with same (employee_id, period) - this is OK
                    # INSERT OR REPLACE in services.py handles this
                    if 'UNIQUE constraint failed' in str(e):
                        saved_count += 1  # Count as saved (replaced)
                    else:
                        errors.append({
                            'employee_id': record.employee_id,
                            'period': record.period,
                            'error': str(e)
                        })
                        # Rollback on integrity errors (other than duplicate)
                        db.rollback()
                        raise

                except Exception as e:
                    errors.append({
                        'employee_id': record.employee_id,
                        'period': record.period,
                        'error': str(e)
                    })
                    # Rollback on any unexpected error
                    db.rollback()
                    raise

            # If we got here, all records processed successfully - commit transaction
            db.commit()

        except Exception as e:
            # Rollback already happened in inner catch, but ensure it's done
            try:
                db.rollback()
            except:
                pass
            # Re-raise to outer handler
            raise

        response = {
            "success": True,
            "filename": file.filename,
            "total_records": len(records),
            "saved_records": saved_count,
            "skipped_count": len(skipped),
            "error_count": len(errors),
            "skipped_details": skipped[:10] if skipped else None,  # First 10 skipped
            "errors": [e['error'] for e in errors[:10]] if errors else None  # First 10 error messages
        }

        # Add template stats if available
        if template_stats:
            response["template_stats"] = template_stats

        return response

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

@app.post("/api/sync-from-folder")
async def sync_from_folder(
    payload: dict,
    db: sqlite3.Connection = Depends(get_db)
):
    """Sync all .xlsm files from a folder path"""
    from pathlib import Path
    import os

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

    # Find all .xlsm files
    xlsm_files = list(path.glob("*.xlsm"))

    if not xlsm_files:
        return JSONResponse({
            "status": "error",
            "message": f"No .xlsm files found in {folder_path}",
            "files_found": 0,
            "files_processed": 0,
            "total_records": 0
        })

    # Process each file
    service = PayrollService(db)
    total_saved = 0
    total_skipped = 0
    total_errors = 0
    files_processed = 0

    for file_path in xlsm_files:
        try:
            # Read file content
            with open(file_path, "rb") as f:
                file_content = f.read()

            # Detect file type and parse
            filename = file_path.name.lower()

            # Try to parse with salary statement parser if it looks like salary data
            if "給" in filename or "給与" in filename or "給料" in filename:
                parser = SalaryStatementParser(use_intelligent_mode=True)
                payroll_records = parser.parse(file_content)
            else:
                parser = ExcelParser()
                payroll_records = parser.parse(file_content)

            # Insert records with transaction per file
            cursor = db.cursor()
            cursor.execute("BEGIN TRANSACTION")
            try:
                for record_data in payroll_records:
                    try:
                        service.create_payroll_record(record_data)
                        total_saved += 1
                    except Exception:
                        total_errors += 1
                        raise  # Rollback this file

                db.commit()  # Commit this file's records
                files_processed += 1
            except:
                db.rollback()
                # File failed, but continue with next file

        except Exception as e:
            total_errors += 1

    return JSONResponse({
        "status": "success",
        "message": f"Processed {files_processed} files from {folder_path}",
        "files_found": len(xlsm_files),
        "files_processed": files_processed,
        "total_records_saved": total_saved,
        "total_records_skipped": total_skipped,
        "total_errors": total_errors
    })


# ============== EMPLOYEE IMPORT ==============

@app.post("/api/import-employees")
async def import_employees(
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db)
):
    """Import employees from Excel file with DBGenzaiX sheet"""

    try:
        # Validate file extension
        filename = file.filename or ""
        ext = filename.split('.')[-1].lower()
        if ext not in ['xls', 'xlsm']:
            raise HTTPException(status_code=400, detail="Solo se aceptan archivos .xls o .xlsm")

        # Save file temporarily
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            contents = await file.read()
            tmp.write(contents)
            tmp_path = tmp.name

        try:
            # Parse employees from Excel
            parser = DBGenzaiXParser()
            employees, stats = parser.parse_employees(tmp_path)

            if parser.errors:
                return JSONResponse(
                    status_code=400,
                    content={
                        "status": "error",
                        "message": parser.errors[0],
                        "errors": parser.errors
                    }
                )

            # Insert/update employees in database
            cursor = db.cursor()
            added = 0
            updated = 0

            for emp in employees:
                try:
                    # Check if employee already exists
                    cursor.execute(
                        "SELECT id FROM employees WHERE employee_id = ?",
                        (emp.employee_id,)
                    )
                    existing = cursor.fetchone()

                    # Insert or replace
                    cursor.execute("""
                        INSERT OR REPLACE INTO employees
                        (employee_id, name, name_kana, dispatch_company, department,
                         hourly_rate, billing_rate, status, hire_date, employee_type, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                    """, (
                        emp.employee_id, emp.name, emp.name_kana, emp.dispatch_company, emp.department,
                        emp.hourly_rate, emp.billing_rate, emp.status, emp.hire_date, emp.employee_type
                    ))

                    if existing:
                        updated += 1
                    else:
                        added += 1
                except Exception as e:
                    print(f"Error inserting employee {emp.employee_id}: {e}")

            db.commit()

            # Get total employees count
            cursor.execute("SELECT COUNT(*) FROM employees")
            total_count = cursor.fetchone()[0]

            return JSONResponse(
                status_code=200,
                content={
                    "status": "success",
                    "employees_added": added,
                    "employees_updated": updated,
                    "employees_skipped": stats['rows_skipped'],
                    "total_employees": total_count,
                    "message": f"Importación completada: {added} nuevos, {updated} actualizados"
                }
            )

        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": f"Error al importar empleados: {str(e)}",
                "errors": [str(e)]
            }
        )

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

# ============== Run Server ==============


# ============== RESET DATA ==============

@app.delete("/api/reset-db")
async def reset_database(db: sqlite3.Connection = Depends(get_db)):
    """Delete ALL data (employees and payroll records)"""
    try:
        cursor = db.cursor()
        
        # Delete data in correct order
        cursor.execute("DELETE FROM payroll_records")
        cursor.execute("DELETE FROM employees")
        
        db.commit()
        
        return {"status": "success", "message": "All data has been deleted"}
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
