"""
Bulk Operations Router - Import, Sync, and Upload
"""
import asyncio
import concurrent.futures
import json
import logging
import os
import sqlite3
import tempfile
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

# Shared dependencies
from auth_dependencies import require_admin, require_auth, log_action
from database import get_db, get_connection
from models import EmployeeCreate, PayrollRecordCreate
from services import PayrollService, ExcelParser
from employee_parser import DBGenzaiXParser
from salary_parser import SalaryStatementParser
from path_security import validate_upload_filename

router = APIRouter(prefix="/api", tags=["bulk-operations"])


@router.post("/sync-employees")
async def sync_employees(
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_auth)
):
    """Sync/update employees from ChinginGenerator database (requires authentication)"""
    try:
        from migrate_employees import migrate_employees_sync
        success, stats = migrate_employees_sync(db)

        if success:
            log_action(db, current_user, "sync", "employees", "all", f"Synced {stats['total_added']} employees")
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


@router.post("/import-employees")
async def import_employees(
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """
    Dedicated endpoint for importing employees from Excel (DBGenzaiX format).
    Used by EmployeeUploader.tsx (requires admin)
    """
    # Security: Validate and sanitize uploaded filename
    excel_extensions = {'.xlsx', '.xlsm', '.xls'}
    is_valid, error_msg, safe_filename = validate_upload_filename(
        file.filename,
        allowed_extensions=excel_extensions
    )

    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file: {error_msg}"
        )

    file_ext = '.' + safe_filename.rsplit('.', 1)[1].lower() if '.' in safe_filename else ''

    try:
        content = await file.read()

        # Save temp file for parser
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            parser = DBGenzaiXParser()
            employees, stats = parser.parse_employees(tmp_path)
            logging.info(f"/api/import-employees: Parsed {len(employees)} employees. Stats: {stats}")

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
                    employee_type=emp.employee_type,
                    gender=emp.gender,
                    birth_date=emp.birth_date,
                    termination_date=emp.termination_date,
                    nationality=emp.nationality
                )

                existing = service.get_employee(emp.employee_id)
                if existing:
                    service.update_employee(emp.employee_id, emp_data)
                    updated_count += 1
                else:
                    service.create_employee(emp_data)
                    added_count += 1
            
            log_action(db, current_user, "import", "employees", "bulk", f"Imported {added_count} employees")

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
            # Clean up temp file
            import gc
            gc.collect()
            for attempt in range(3):
                try:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                    break
                except PermissionError:
                    import time
                    if attempt < 2:
                        time.sleep(0.5)

    except Exception as e:
        logging.error(f"Import failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def upload_payroll_file(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(require_admin)
):
    """Upload and parse a payroll file (Excel or CSV) with Streaming Log (requires admin)"""
    
    # Security: Pre-validate filename before generator starts
    upload_extensions = {'.xlsx', '.xlsm', '.xls', '.csv'}
    is_valid, error_msg, safe_filename = validate_upload_filename(
        file.filename,
        allowed_extensions=upload_extensions
    )

    if not is_valid:
        async def error_generator():
            yield json.dumps({
                "type": "error",
                "message": f"Security validation failed: {error_msg}"
            }) + "\n"
        return StreamingResponse(error_generator(), media_type="application/x-ndjson")

    original_filename = file.filename
    file_ext = '.' + safe_filename.rsplit('.', 1)[1].lower() if '.' in safe_filename else ''

    MAX_FILE_SIZE = 50 * 1024 * 1024
    try:
        content = await file.read()
    except Exception as e:
        async def error_generator():
            yield json.dumps({
                "type": "error",
                "message": f"Failed to read file: {str(e)}"
            }) + "\n"
        return StreamingResponse(error_generator(), media_type="application/x-ndjson")

    if len(content) > MAX_FILE_SIZE:
        async def error_generator():
            yield json.dumps({
                "type": "error",
                "message": f"File too large (>50MB). Size: {len(content) / 1024 / 1024:.2f}MB"
            }) + "\n"
        return StreamingResponse(error_generator(), media_type="application/x-ndjson")

    async def log_generator():
        # Connect to DB inside generator
        db_conn = get_connection()
        
        try:
            yield json.dumps({"type": "info", "message": f"Upload started: {safe_filename}"}) + "\n"
            yield json.dumps({"type": "info", "message": f"File read successfully ({len(content)} bytes). Detecting type..."}) + "\n"

            loop = asyncio.get_event_loop()
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            keepalive_interval = 5

            # CASE A: Payroll
            if file_ext in ['.xlsm', '.xlsx'] and ('給与' in original_filename or '給料' in original_filename or '明細' in original_filename):
                yield json.dumps({"type": "info", "message": "Detected: Payroll Statement (給与明細)"}) + "\n"
                
                parser = SalaryStatementParser(use_intelligent_mode=True)
                future = loop.run_in_executor(executor, parser.parse, content)

                elapsed = 0
                while not future.done():
                    try:
                        records = await asyncio.wait_for(asyncio.shield(future), timeout=keepalive_interval)
                        break
                    except asyncio.TimeoutError:
                        elapsed += keepalive_interval
                        yield json.dumps({"type": "progress", "message": f"Processing Excel... ({elapsed}s elapsed)"}) + "\n"
                else:
                    records = future.result()

                if records is None: records = []
                yield json.dumps({"type": "info", "message": f"Parsed {len(records)} records. Saving to database..."}) + "\n"

                service = PayrollService(db_conn)
                saved_count = 0
                error_count = 0
                
                cursor = db_conn.cursor()
                cursor.execute("BEGIN")
                try:
                    for i, r in enumerate(records):
                        try:
                            service.create_payroll_record(r)
                            saved_count += 1
                        except Exception:
                            error_count += 1
                        
                        if (i+1) % 50 == 0:
                            yield json.dumps({"type": "progress", "message": f"Saving records [{i+1}/{len(records)}]..."}) + "\n"

                    db_conn.commit()
                    yield json.dumps({
                        "type": "success",
                        "message": f"Successfully saved {saved_count} records.",
                        "stats": {"total": len(records), "saved": saved_count, "errors": error_count}
                    }) + "\n"
                except Exception as e:
                    db_conn.rollback()
                    raise e

            # CASE B: Employee Master
            elif file_ext in ['.xlsx', '.xlsm', '.xls'] and ('社員' in original_filename or 'Employee' in original_filename or '台帳' in original_filename):
                yield json.dumps({"type": "info", "message": "Detected: Employee Master (社員台帳)"}) + "\n"
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
                    tmp.write(content)
                    tmp_path = tmp.name

                try:
                    parser = DBGenzaiXParser()
                    future = loop.run_in_executor(executor, parser.parse_employees, tmp_path)
                    
                    elapsed = 0
                    while not future.done():
                        try:
                            employees, stats = await asyncio.wait_for(asyncio.shield(future), timeout=keepalive_interval)
                            break
                        except asyncio.TimeoutError:
                            elapsed += keepalive_interval
                            yield json.dumps({"type": "progress", "message": f"Parsing employees... ({elapsed}s elapsed)"}) + "\n"
                    else:
                        employees, stats = future.result()

                    yield json.dumps({"type": "info", "message": f"Found {len(employees)} employees."}) + "\n"

                    service = PayrollService(db_conn)
                    imported_count = 0
                    for i, emp in enumerate(employees):
                        emp_data = EmployeeCreate(
                            employee_id=emp.employee_id,
                            name=emp.name,
                            name_kana=emp.name_kana,
                            dispatch_company=emp.dispatch_company or "Unknown",
                            department=emp.department,
                            hourly_rate=emp.hourly_rate,
                            billing_rate=emp.billing_rate,
                            status=emp.status,
                            hire_date=emp.hire_date,
                            employee_type=emp.employee_type,
                            gender=emp.gender,
                            birth_date=emp.birth_date,
                            termination_date=emp.termination_date,
                            nationality=emp.nationality
                        )
                        existing = service.get_employee(emp.employee_id)
                        if existing:
                            service.update_employee(emp.employee_id, emp_data)
                        else:
                            service.create_employee(emp_data)
                        imported_count += 1

                        if (i+1) % 50 == 0:
                            yield json.dumps({"type": "progress", "message": f"Syncing [{i+1}/{len(employees)}]..."}) + "\n"

                    yield json.dumps({"type": "success", "message": f"Imported {imported_count} employees."}) + "\n"

                finally:
                    import gc; gc.collect()
                    if os.path.exists(tmp_path):
                        try: os.unlink(tmp_path)
                        except: pass

            # CASE C: Generic
            else:
                yield json.dumps({"type": "info", "message": "Detected: Generic Excel/CSV"}) + "\n"
                parser = ExcelParser()
                future = loop.run_in_executor(executor, parser.parse, content)
                
                elapsed = 0
                while not future.done():
                    try:
                        records = await asyncio.wait_for(asyncio.shield(future), timeout=keepalive_interval)
                        break
                    except asyncio.TimeoutError:
                        elapsed += keepalive_interval
                        yield json.dumps({"type": "progress", "message": f"Processing... ({elapsed}s elapsed)"}) + "\n"
                else:
                    records = future.result()
                
                if records is None: records = []
                service = PayrollService(db_conn)
                saved_count = 0
                for i, r in enumerate(records):
                    service.create_payroll_record(r)
                    saved_count += 1
                    if (i+1) % 50 == 0: yield json.dumps({"type": "progress", "message": f"Saving {i+1}..."}) + "\n"

                yield json.dumps({"type": "success", "message": f"Saved {saved_count} records."}) + "\n"

            yield json.dumps({"type": "complete", "message": "Processing Finished."}) + "\n"
            executor.shutdown(wait=False)

        except Exception as e:
            yield json.dumps({"type": "error", "message": f"Critical Error: {str(e)}"}) + "\n"
        finally:
            if db_conn: db_conn.close()

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    
    return StreamingResponse(log_generator(), media_type="application/x-ndjson", headers=headers)
