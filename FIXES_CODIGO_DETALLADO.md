# FIXES ESPECÍFICOS Y CÓDIGO DETALLADO
**Fecha:** 30 de enero de 2026  
**Estado:** Listo para Implementación  

---

## 📝 LISTA DE ARCHIVOS A MODIFICAR

1. **salary_parser.py** - 6 secciones críticas
2. **main.py** - 3 secciones críticas  
3. **services.py** - 1 sección importante

Total de cambios: ~150 líneas de código nuevas/modificadas

---

## 🔴 FIX #1: salary_parser.py - parse() METHOD (CRÍTICA)

### Ubicación: Líneas 450-522

### Problema
```python
# ❌ ACTUAL (INCORRECTO)
def parse(self, content: bytes) -> List[PayrollRecordCreate]:
    try:
        # Keep BytesIO open throughout parsing
        file_buffer = BytesIO(content)
        wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
    except Exception as e:
        print(f"[ERROR] Error loading Excel file: {e}")
        return []

    records = []

    print(f"[DEBUG] Starting SalaryStatementParser. Sheets: {wb.sheetnames}")

    # Process all sheets except the summary sheet (集計) and Contract (請負)
    for sheet_name in wb.sheetnames:
        # Skip only summary and index sheets.
        if sheet_name in ["集計", "Summary", "目次", "Index", "請負", "DBUkeoiX", "請負社員"]:
            print(f"[DEBUG] Skipping sheet: {sheet_name}")
            continue

        try:
            print(f"[DEBUG] Processing sheet: {sheet_name}")
            ws = wb[sheet_name]
            sheet_records = self._parse_sheet(ws, sheet_name)
            print(f"[DEBUG] Sheet '{sheet_name}' yielded {len(sheet_records)} records")
            records.extend(sheet_records)
        except Exception as e:
            print(f"[WARNING] Error parsing sheet '{sheet_name}': {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"[OK] Parsed {len(records)} employee records from Excel")

    # Show template usage summary
    if self.templates_used or self.templates_generated:
        print("\n[TEMPLATES] Summary:")
        if self.templates_used:
            print(f"   Used existing templates: {', '.join(self.templates_used)}")
        if self.templates_generated:
            print(f"   Generated new templates: {', '.join(self.templates_generated)}")

    # Show validation warnings
    if self.validation_warnings:
        print(f"\n[WARNING] VALIDATION WARNINGS ({len(self.validation_warnings)}):")
        for warning in self.validation_warnings[:10]:  # Show first 10
            print(f"   {warning}")

    return records
```

### Solución
```python
# ✅ CORREGIDO
def parse(self, content: bytes) -> List[PayrollRecordCreate]:
    """
    Parse .xlsm file and extract all employee payroll records
    
    FIX: Use context manager for BytesIO to prevent "read of closed file"
    """
    try:
        # Use context manager to ensure BytesIO is open throughout parsing
        with BytesIO(content) as file_buffer:
            try:
                wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
            except Exception as e:
                print(f"[ERROR] Error loading Excel file: {e}")
                import traceback
                traceback.print_exc()
                return []

            try:
                records = []
                
                print(f"[DEBUG] Starting SalaryStatementParser. Sheets: {wb.sheetnames}")

                # Process all sheets except the summary sheet (集計) and Contract (請負)
                for sheet_name in wb.sheetnames:
                    # Skip only summary and index sheets. '請負' (Ukeoi) is now ALLOWED.
                    if sheet_name in [
                        "集計",
                        "Summary",
                        "目次",
                        "Index",
                        "請負",
                        "DBUkeoiX",
                        "請負社員",
                    ]:
                        print(f"[DEBUG] Skipping sheet: {sheet_name}")
                        continue

                    try:
                        print(f"[DEBUG] Processing sheet: {sheet_name}")
                        ws = wb[sheet_name]
                        sheet_records = self._parse_sheet(ws, sheet_name)
                        print(
                            f"[DEBUG] Sheet '{sheet_name}' yielded {len(sheet_records)} records"
                        )
                        records.extend(sheet_records)
                    except Exception as e:
                        print(f"[WARNING] Error parsing sheet '{sheet_name}': {e}")
                        import traceback
                        traceback.print_exc()
                        continue

                print(f"[OK] Parsed {len(records)} employee records from Excel")

                # Show template usage summary
                if self.templates_used or self.templates_generated:
                    print("\n[TEMPLATES] Summary:")
                    if self.templates_used:
                        print(f"   Used existing templates: {', '.join(self.templates_used)}")
                    if self.templates_generated:
                        print(
                            f"   Generated new templates: {', '.join(self.templates_generated)}"
                        )

                # Show validation warnings
                if self.validation_warnings:
                    print(f"\n[WARNING] VALIDATION WARNINGS ({len(self.validation_warnings)}):")
                    for warning in self.validation_warnings[:10]:  # Show first 10
                        print(f"   {warning}")

                return records
            finally:
                # Explicitly close workbook to release stream references
                if wb:
                    try:
                        wb.close()
                        print(f"[DEBUG] Workbook closed successfully")
                    except Exception as e:
                        print(f"[WARNING] Error closing workbook: {e}")
    except Exception as e:
        print(f"[ERROR] Critical error in parse(): {e}")
        import traceback
        traceback.print_exc()
        return []
```

### Cambios Específicos
1. Envuelve `file_buffer = BytesIO(content)` en `with` statement
2. Mueve TODO el código de procesamiento DENTRO del `with` block
3. Agrega `finally` block para cerrar explícitamente el workbook
4. Agrega logging del cierre

---

## 🟠 FIX #2: salary_parser.py - _extract_employee_data() METHOD (IMPORTANTE)

### Ubicación: Líneas 1851-1945

### Problema
```python
# ❌ ACTUAL - Sin logging de por qué se rechaza cada registro
def _extract_employee_data(self, ws, base_col: int, sheet_name: str) -> Optional[PayrollRecordCreate]:
    try:
        # ... validaciones ...
        if not period:
            return None  # ← Sin logging
        
        if not employee_id or not employee_id.isdigit():
            return None  # ← Sin logging
        
        if int(employee_id) == 0:
            return None  # ← Sin logging
```

### Solución - Agregar después de línea 1851 y antes de `try`:
```python
def _extract_employee_data(self, ws, base_col: int, sheet_name: str) -> Optional[PayrollRecordCreate]:
    """Extract data for one employee using intelligent field detection or template
    
    FIX: Added detailed logging for each validation failure to diagnose parsing issues
    """
    try:
        # Use current column offsets (from template or default)
        offsets = self.current_column_offsets or self.COLUMN_OFFSETS

        # Get period
        period_row = (
            self.detected_fields.get("period")
            or self.FALLBACK_ROW_POSITIONS["period"]
        )
        period_col = base_col + offsets.get("period", 8)
        period_cell = ws.cell(row=period_row, column=period_col)

        period = self._parse_period(period_cell.value)
        if not period:
            print(f"[WARNING] Sheet '{sheet_name}' Col {base_col}: Period could not be parsed (value: {period_cell.value})")
            return None

        # Get employee_id
        emp_id_row = self.detected_fields.get(
            "employee_id"
        ) or self.FALLBACK_ROW_POSITIONS.get("employee_id", 6)
        emp_id_col = base_col + offsets.get("employee_id", 9)
        emp_id_cell = ws.cell(row=emp_id_row, column=emp_id_col)
        employee_id = str(emp_id_cell.value or "").strip()

        if not employee_id:
            print(f"[WARNING] Sheet '{sheet_name}' Col {base_col}: Employee ID is empty")
            return None

        if not employee_id.isdigit():
            print(f"[WARNING] Sheet '{sheet_name}' Col {base_col}: Employee ID '{employee_id}' is not numeric")
            return None

        # Filter out invalid employee IDs (0, 000000)
        if int(employee_id) == 0:
            print(f"[WARNING] Sheet '{sheet_name}' Col {base_col}: Employee ID is 0 (invalid)")
            return None

        # Extract all standard fields
        # ... rest of the method unchanged ...
        
        return record
        
    except Exception as e:
        print(f"[ERROR] Sheet '{sheet_name}' Col {base_col}: Exception during extraction: {str(e)}")
        import traceback
        traceback.print_exc()
        return None
```

---

## 🟠 FIX #3: main.py - upload_payroll_file() executor handling (IMPORTANTE)

### Ubicación: Líneas 573-595

### Problema
```python
# ❌ ACTUAL - Excepciones no se capturan del executor
future = loop.run_in_executor(executor, parser.parse, content)

elapsed = 0
while not future.done():
    try:
        records = await asyncio.wait_for(asyncio.shield(future), timeout=keepalive_interval)
        break
    except asyncio.TimeoutError:
        elapsed += keepalive_interval
        yield json.dumps({
            "type": "progress",
            "message": f"Processing Excel... ({elapsed}s elapsed)"
        }) + "\n"
else:
    records = future.result()  # ← Si lanza excepción, no se captura

if records is None:
    records = []
```

### Solución
```python
parser = SalaryStatementParser(use_intelligent_mode=True)

# Run parser in thread with keepalive messages to prevent timeout
future = loop.run_in_executor(executor, parser.parse, content)

elapsed = 0
records = None
parse_error = None

try:
    while not future.done():
        try:
            # Wait up to keepalive_interval seconds for result
            records = await asyncio.wait_for(asyncio.shield(future), timeout=keepalive_interval)
            break
        except asyncio.TimeoutError:
            # Not done yet, yield keepalive message immediately
            elapsed += keepalive_interval
            yield json.dumps({
                "type": "progress",
                "message": f"Processing Excel... ({elapsed}s elapsed)"
            }) + "\n"
    else:
        # Future completed between checks
        try:
            records = future.result()
        except Exception as e:
            parse_error = e
            print(f"[ERROR] Parser raised exception: {str(e)}")
            import traceback
            traceback.print_exc()
except Exception as e:
    parse_error = e
    print(f"[ERROR] Executor error: {str(e)}")
    import traceback
    traceback.print_exc()

# Handle parse errors
if parse_error:
    yield json.dumps({
        "type": "error",
        "message": f"Failed to parse Excel file: {str(parse_error)}"
    }) + "\n"
    return

if records is None:
    records = []
```

---

## 🟡 FIX #4: main.py - Record validation and insert (IMPORTANTE)

### Ubicación: Líneas 598-635

### Problema
```python
# ❌ ACTUAL
yield json.dumps({"type": "info", "message": f"Parsed {len(records)} records. Saving to database..."}) + "\n"

service = PayrollService(db)
saved_count = 0
error_count = 0

cursor.execute("BEGIN")
try:
    total = len(records)
    for i, record_data in enumerate(records):
        try:
            service.create_payroll_record(record_data)
            saved_count += 1
        except Exception:  # ← Sin logging
            error_count += 1

    db.commit()
    yield json.dumps({
        "type": "success",
        "message": f"Successfully saved {saved_count} records.",
        "stats": {"total": total, "saved": saved_count, "errors": error_count}
    }) + "\n"
```

### Solución
```python
# Validate that we have records to process
if not records:
    yield json.dumps({
        "type": "warning",
        "message": "Parser found 0 records. Check that the file has the correct format and data."
    }) + "\n"
    return

yield json.dumps({
    "type": "info",
    "message": f"Parsed {len(records)} records from Excel. Validating records..."
}) + "\n"

# Pre-validate records
invalid_count = 0
valid_records = []
for i, rec in enumerate(records):
    # Check for basic validity
    if not hasattr(rec, 'employee_id') or not rec.employee_id:
        print(f"[WARNING] Record {i}: Missing employee_id")
        invalid_count += 1
        continue
    
    if not hasattr(rec, 'period') or not rec.period:
        print(f"[WARNING] Record {i} (EmpID: {rec.employee_id}): Missing period")
        invalid_count += 1
        continue
    
    if not hasattr(rec, 'gross_salary') or rec.gross_salary == 0:
        print(f"[WARNING] Record {i} (EmpID: {rec.employee_id}, Period: {rec.period}): gross_salary is 0 or missing")
        invalid_count += 1
        continue
    
    valid_records.append(rec)

if invalid_count > 0:
    yield json.dumps({
        "type": "info",
        "message": f"Filtered out {invalid_count} invalid records. Processing {len(valid_records)} valid records."
    }) + "\n"

if not valid_records:
    yield json.dumps({
        "type": "error",
        "message": "No valid records found after validation. Unable to save."
    }) + "\n"
    return

yield json.dumps({
    "type": "progress",
    "message": "Saving records to database..."
}) + "\n"

service = PayrollService(db)
saved_count = 0
error_count = 0

cursor.execute("BEGIN")
try:
    total = len(valid_records)
    for i, record_data in enumerate(valid_records):
        try:
            service.create_payroll_record(record_data)
            saved_count += 1
        except Exception as e:
            error_count += 1
            print(f"[ERROR] Failed to insert record {i} (EmpID: {record_data.employee_id}, Period: {record_data.period}): {str(e)}")
            import traceback
            traceback.print_exc()

        # Report progress every 50 records
        if (i+1) % 50 == 0:
            yield json.dumps({
                "type": "progress",
                "message": f"Saving records [{i+1}/{total}]...",
                "current": i+1,
                "total": total
            }) + "\n"

    db.commit()
    
    # VERIFICATION: Count records in database after commit
    cursor.execute(
        "SELECT COUNT(*) FROM payroll_records WHERE period = ?",
        (valid_records[0].period,)
    )
    verification_count = cursor.fetchone()[0]
    
    yield json.dumps({
        "type": "success",
        "message": f"Successfully saved {saved_count} records (database verification: {verification_count} records found for period {valid_records[0].period}).",
        "stats": {
            "total": total,
            "saved": saved_count,
            "errors": error_count,
            "verified": verification_count,
            "invalid_filtered": invalid_count
        }
    }) + "\n"

except Exception as e:
    db.rollback()
    yield json.dumps({
        "type": "error",
        "message": f"Database Error during insert: {str(e)}"
    }) + "\n"
    print(f"[ERROR] Database error: {str(e)}")
    import traceback
    traceback.print_exc()
    raise e
```

---

## 🟡 FIX #5: salary_parser.py - _parse_sheet() logging (IMPORTANTE)

### Ubicación: Líneas 730-770

### Problema
```python
# ❌ ACTUAL - Excepciones durante layout detection no se registran bien
def _parse_sheet(self, ws, sheet_name: str) -> List[PayrollRecordCreate]:
    """
    Parse a single company sheet, dispatching to correct parser.
    """
    layout_type = self._detect_layout_type(ws)
    print(f"[DEBUG] Sheet '{sheet_name}' detected layout: {layout_type}")

    if layout_type == "kintaihyo":
        return self._parse_kintaihyo_sheet(ws, sheet_name)
    elif layout_type == "vertical":
        return self._parse_vertical_sheet(ws, sheet_name)
    else:
        return self._parse_standard_sheet(ws, sheet_name)
```

### Solución
```python
def _parse_sheet(self, ws, sheet_name: str) -> List[PayrollRecordCreate]:
    """
    Parse a single company sheet, dispatching to correct parser.
    
    FIX: Added detailed error handling and logging for each parsing stage
    """
    try:
        layout_type = self._detect_layout_type(ws)
        print(f"[DEBUG] Sheet '{sheet_name}' detected layout: {layout_type}")
    except Exception as e:
        print(f"[ERROR] Failed to detect layout for sheet '{sheet_name}': {str(e)}")
        import traceback
        traceback.print_exc()
        return []

    try:
        if layout_type == "kintaihyo":
            print(f"[DEBUG] Parsing sheet '{sheet_name}' using Kintaihyo parser...")
            records = self._parse_kintaihyo_sheet(ws, sheet_name)
        elif layout_type == "vertical":
            print(f"[DEBUG] Parsing sheet '{sheet_name}' using Vertical parser...")
            records = self._parse_vertical_sheet(ws, sheet_name)
        else:
            print(f"[DEBUG] Parsing sheet '{sheet_name}' using Standard parser...")
            records = self._parse_standard_sheet(ws, sheet_name)
        
        print(f"[OK] Sheet '{sheet_name}' ({layout_type}): Successfully parsed {len(records)} records")
        return records
    except Exception as e:
        print(f"[ERROR] Failed to parse sheet '{sheet_name}' with layout '{layout_type}': {str(e)}")
        import traceback
        traceback.print_exc()
        return []
```

---

## 🟡 FIX #6: salary_parser.py - Protección de cell access (IMPORTANTE)

### Ubicación: Línea 574 en _detect_layout_type()

### Problema
```python
# ❌ ACTUAL - Sin protección contra "read of closed file"
def _detect_layout_type(self, ws) -> str:
    col_a_values = []
    for r in range(1, 60):
        val = ws.cell(row=r, column=1).value  # ← Puede fallar aquí
        if val:
            col_a_values.append(str(val).strip().replace(" ", "").replace("　", ""))
```

### Solución
```python
def _detect_layout_type(self, ws) -> str:
    """
    Detect whether the sheet uses Standard, Vertical, or Kintaihyo layout.
    
    FIX: Added try/except for cell access to handle "read of closed file" errors
    """
    col_a_values = []
    for r in range(1, 60):
        try:
            val = ws.cell(row=r, column=1).value
            if val:
                col_a_values.append(str(val).strip().replace(" ", "").replace("　", ""))
        except Exception as e:
            print(f"[WARNING] Could not read cell at row {r}, column 1: {str(e)}")
            # If we can't read cells, might indicate stream is closed
            # Continue trying other rows
            continue

    vertical_indicators = [
        "基本給",
        "残業手当",
        "総支給額",
        "差引支給額",
        "労働日数",
        "労働時間",
        "時間外労働",
    ]

    matches = sum(
        1 for ind in vertical_indicators if any(ind in val for val in col_a_values)
    )

    if matches >= 3:
        return "vertical"

    # Check for Kintaihyo format first (highest priority)
    if self._detect_kintaihyo_format(ws):
        return "kintaihyo"

    return "standard"
```

---

## 🟡 FIX #7: services.py - Mejor logging en create_payroll_record() (MENOR)

### Ubicación: Líneas 441-450

### Problema
```python
# ⚠️ ACTUAL - Validación silenciosa
def create_payroll_record(self, record: PayrollRecordCreate) -> Dict:
    """Create a new payroll record with calculated fields"""
    employee = self.get_employee(record.employee_id)
    if not employee:
        raise ValueError(f"Employee {record.employee_id} not found")
```

### Solución
```python
def create_payroll_record(self, record: PayrollRecordCreate) -> Dict:
    """Create a new payroll record with calculated fields
    
    FIX: Added detailed logging for employee validation failures
    """
    employee = self.get_employee(record.employee_id)
    if not employee:
        print(f"[WARNING] create_payroll_record(): Employee {record.employee_id} not found in database for period {record.period}")
        print(f"          Available records for period {record.period}: {self.get_payroll_records_for_period(record.period)}")
        raise ValueError(f"Employee {record.employee_id} not found in database")
    
    # ... rest of method unchanged ...
```

---

## 📊 RESUMEN DE CAMBIOS

### salary_parser.py
- **Línea 450-522:** Envolver en context manager + finally block (Fix #1)
- **Línea 574:** Agregar try/except para cell access (Fix #6)
- **Línea 730-770:** Agregar try/except y logging en _parse_sheet (Fix #5)
- **Línea 1851-1945:** Agregar logging detallado en _extract_employee_data (Fix #2)

**Total líneas:** ~50 líneas nuevas/modificadas

### main.py
- **Línea 573-595:** Mejorar manejo de excepciones del executor (Fix #3)
- **Línea 598-635:** Agregar validación de records y verification (Fix #4)

**Total líneas:** ~80 líneas nuevas/modificadas

### services.py
- **Línea 441-450:** Agregar logging en create_payroll_record (Fix #7)

**Total líneas:** ~5 líneas nuevas/modificadas

---

## ✅ ORDEN DE IMPLEMENTACIÓN

1. Fix #1 (salary_parser.py: parse method) - **CRITICAL**
2. Fix #2 (salary_parser.py: _extract_employee_data) - **CRITICAL**
3. Fix #3 (main.py: executor handling) - **CRITICAL**
4. Fix #4 (main.py: validation + verification) - **CRITICAL**
5. Fix #5 (salary_parser.py: _parse_sheet logging) - **IMPORTANT**
6. Fix #6 (salary_parser.py: cell access protection) - **IMPORTANT**
7. Fix #7 (services.py: logging) - **MINOR**

---

## 🧪 TESTING DESPUÉS DE FIXES

Después de implementar los fixes, ejecutar:

```python
# Test 1: Upload un archivo pequeño y verificar:
# - ¿Se parsea correctamente?
# - ¿Aparecen logs detallados?
# - ¿Se insertan registros en BD?

# Test 2: Upload un archivo con datos inválidos
# - ¿Se reportan errores específicos?
# - ¿El usuario ve mensajes de validación?

# Test 3: Upload un archivo corrupto
# - ¿Se captura la excepción?
# - ¿El usuario recibe un error claro?

# Test 4: Verificar logs
# - ¿Aparecen en stdout del servidor?
# - ¿Son detallados y útiles?
```

