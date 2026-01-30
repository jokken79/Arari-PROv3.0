# ANÁLISIS COMPLETO: "read of closed file" en salary_parser.py

**Fecha de Análisis:** 30 de enero de 2026  
**Archivo:** `d:\Arari-PROv3.0\arari-app\api\salary_parser.py`  
**Línea Critical:** 463-522 (método `parse()`)

---

## RESUMEN EJECUTIVO

El problema **"read of closed file"** ocurre porque:

1. **Línea 464-465:** Se abre un `BytesIO` y se carga el workbook
2. **Línea 465:** `openpyxl.load_workbook()` **acepta el stream pero continúa usándolo internamente**
3. **Línea 475-505:** Se accede a `ws.cell()` para leer datos
4. **PROBLEMA CRÍTICO:** El `BytesIO` se cierra automáticamente cuando se recolecta basura (garbage collection) o se pierde la referencia
5. **Línea 522:** Se retornan los `records`, pero en ese momento el workbook aún necesita acceder al stream

---

## LISTA DE PROBLEMAS ENCONTRADOS

### 🔴 PROBLEMA 1: BytesIO NO TIENE CONTEXT MANAGER (Línea 464)
**Línea exacta:** 464  
**Código:**
```python
file_buffer = BytesIO(content)
wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
```

**Problema:**
- `BytesIO` se crea sin estar dentro de un `with` statement
- No hay garantía de que permanezca abierto durante toda la ejecución
- Si se llama a `gc.collect()` o hay presión de memoria, el stream se cierra

**Fix:**
```python
with BytesIO(content) as file_buffer:
    wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
    records = []
    # ... todo el código de procesamiento ...
    return records
```

---

### 🔴 PROBLEMA 2: openpyxl REQUIERE STREAM ABIERTO (Línea 465)
**Línea exacta:** 465  
**Código:**
```python
wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
```

**Problema:**
- `openpyxl.load_workbook()` con `data_only=True` necesita acceder a los datos crudos del ZIP (Excel es ZIP)
- Mantiene una referencia lazy (perezosa) al stream
- **Cuando se accede a `ws.cell()` DESPUÉS, intenta leer del stream**
- Si el stream fue cerrado, ocurre: **"read of closed file"**

**Evidencia:**
- Las líneas 574, 637, 650, 662, 681, 806-807, 831, 868, 1088, 1185-1200, 1361, 1445, etc. acceden a `ws.cell()`
- Todos estos accesos ocurren **DESPUÉS** de que el BytesIO fue creado
- Si el BytesIO se cierra entre línea 465 y cualquiera de estas líneas → ERROR

---

### 🔴 PROBLEMA 3: NO HAY finally BLOCK (Línea 463-522)
**Línea exacta:** 463-522  
**Código:**
```python
try:
    # Keep BytesIO open throughout parsing
    file_buffer = BytesIO(content)
    wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
except Exception as e:
    print(f"[ERROR] Error loading Excel file: {e}")
    return []

records = []

print(f"[DEBUG] Starting SalaryStatementParser. Sheets: {wb.sheetnames}")

for sheet_name in wb.sheetnames:
    # ... procesamiento ...
    try:
        # ... más código ...
    except Exception as e:
        # ...
        continue

# ... más código ...

return records
```

**Problema:**
- No hay `finally` block para cerrar explícitamente el workbook
- No hay `wb.close()` al final
- No hay cierre del `file_buffer`
- Si ocurre una excepción, los recursos no se liberan ordenadamente

**Fix:**
```python
try:
    with BytesIO(content) as file_buffer:
        wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
        try:
            # ... todo el procesamiento ...
        finally:
            if wb:
                wb.close()
except Exception as e:
    print(f"[ERROR] Error loading Excel file: {e}")
    return []
```

---

### 🟡 PROBLEMA 4: Excepciones Pueden Cerrar BytesIO (Línea 475-505)
**Líneas exactas:** 475-505  
**Código:**
```python
for sheet_name in wb.sheetnames:
    if sheet_name in ["集計", "Summary", "目次", "Index", "請負", "DBUkeoiX", "請負社員"]:
        print(f"[DEBUG] Skipping sheet: {sheet_name}")
        continue

    try:
        print(f"[DEBUG] Processing sheet: {sheet_name}")
        ws = wb[sheet_name]
        sheet_records = self._parse_sheet(ws, sheet_name)  # ← Acceso a cells
        print(f"[DEBUG] Sheet '{sheet_name}' yielded {len(sheet_records)} records")
        records.extend(sheet_records)
    except Exception as e:
        print(f"[WARNING] Error parsing sheet '{sheet_name}': {e}")
        import traceback
        traceback.print_exc()
        continue
```

**Problema:**
- `self._parse_sheet(ws, sheet_name)` accede a muchas celdas (ws.cell())
- Si ocurre una excepción durante el parsing, el exception handler solo hace `print()` y `continue`
- En ese momento, si Python hace garbage collection de `file_buffer`, el stream se cierra
- Las próximas iteraciones del loop intentan acceder a `ws` → **"read of closed file"**

**Evidencia de acceso a cells en _parse_sheet():**
- Línea 1625-1755: `self._scan_dynamic_zone_for_employee()` accede a células
- Línea 1834-1876: `self._extract_employee_data()` accede a células
- Línea 1088, 1185, 1200, 1361, 1445, 1578, 1586, 1632: Múltiples accesos en métodos auxiliares

---

### 🔴 PROBLEMA 5: NO SE CIERRA WORKBOOK EXPLÍCITAMENTE (Línea 522)
**Línea exacta:** 522  
**Código:**
```python
return records
```

**Problema:**
- El método simplemente retorna `records` sin cerrar `wb`
- `wb` sigue abierto, holding una referencia a `file_buffer`
- Cuando la función retorna y `wb` se sale del scope, Python intenta limpiarlo
- **En ese momento intenta leer del stream para cerrar correctamente**
- Si el stream fue cerrado por GC → **"read of closed file"**

**Fix requerido:**
```python
try:
    with BytesIO(content) as file_buffer:
        wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
        try:
            records = []
            # ... procesamiento ...
            return records
        finally:
            wb.close()  # ← CRITICAL
except Exception as e:
    print(f"[ERROR] Error loading Excel file: {e}")
    return []
```

---

### 🟠 PROBLEMA 6: _parse_sheet() También Necesita Protección (Línea 730-770)
**Línea exacta:** 730-770  
**Código:**
```python
def _parse_sheet(self, ws, sheet_name: str) -> List[PayrollRecordCreate]:
    """
    Parse a single company sheet, dispatching to correct parser.
    """
    # 1. Detect layout type
    layout_type = self._detect_layout_type(ws)
    print(f"[DEBUG] Sheet '{sheet_name}' detected layout: {layout_type}")

    if layout_type == "kintaihyo":
        return self._parse_kintaihyo_sheet(ws, sheet_name)
    elif layout_type == "vertical":
        return self._parse_vertical_sheet(ws, sheet_name)
    else:
        return self._parse_standard_sheet(ws, sheet_name)
```

**Problema:**
- `_detect_layout_type()` accede a `ws.cell()` (línea 574)
- Si eso causa una excepción y el workbook no está protegido, el stream se cierra
- Las llamadas subsecuentes a `_parse_kintaihyo_sheet()`, etc. fallarán

---

### 🟠 PROBLEMA 7: _detect_layout_type() Accede Células Sin Protección (Línea 574)
**Línea exacta:** 574  
**Código:**
```python
def _detect_layout_type(self, ws) -> str:
    # ...
    col_a_values = []
    for r in range(1, 60):
        val = ws.cell(row=r, column=1).value  # ← Acceso a cell
        if val:
            col_a_values.append(str(val).strip().replace(" ", "").replace("　", ""))
    # ...
```

**Problema:**
- Accede directamente a `ws.cell()` sin try/except
- Si el stream se cerró, esto falla con "read of closed file"
- No hay recuperación posible

---

### 🟠 PROBLEMA 8: _is_kintaihyo_block_start() Múltiples Accesos (Línea 637-690)
**Línea exacta:** 637-690  
**Código:**
```python
def _is_kintaihyo_block_start(self, ws, row: int, col: int) -> bool:
    try:
        # Row+0: Should be text (name)
        val_row0 = ws.cell(row=row, column=col).value          # Línea 637
        # Row+1: Should be Employee ID
        val_row1 = ws.cell(row=row + 1, column=col).value      # Línea 650
        # Row+2: Should be Japanese name
        val_row2 = ws.cell(row=row + 2, column=col).value      # Línea 662
        # Row+3: Should be base rate
        val_row3 = ws.cell(row=row + 3, column=col).value      # Línea 681
        # ...
    except Exception:
        return False
```

**Problema:**
- Múltiples accesos a `ws.cell()` sin buffer de recuperación
- Si el stream se cierra entre línea 637 y 681, el try/except solo retorna False
- Pero el workbook sigue intentando recuperarse
- Potencial para leak de recursos

---

### 🔴 PROBLEMA 9: _parse_vertical_sheet() Acceso de Células (Línea 806-876)
**Línea exacta:** 806-876  
**Código:**
```python
def _parse_vertical_sheet(self, ws, sheet_name: str) -> List[PayrollRecordCreate]:
    # ...
    for r in range(1, 60):
        val1 = str(ws.cell(row=r, column=1).value or "").strip()    # Línea 806
        val2 = str(ws.cell(row=r, column=2).value or "").strip()    # Línea 807
        label = (val1 + val2).replace(" ", "").replace("　", "")
        # ...
        for c in range(1, 30):
            val = str(ws.cell(row=r, column=c).value or "").strip()  # Línea 831
            # ...
    # ...
    for r in range(1, 15):
        for c in range(1, 20):
            val = str(ws.cell(row=r, column=c).value or "").strip()  # Línea 868
            # ...
```

**Problema:**
- Loops anidados con acceso frecuente a `ws.cell()`
- Sin try/except protegiendo cada acceso
- Si el stream se cierra durante cualquiera de estos loops → fallo

---

### 🔴 PROBLEMA 10: _parse_kintaihyo_sheet() Sin Protección de Stream (Línea 1088-1090)
**Línea exacta:** 1088-1090  
**Código:**
```python
def _detect_kintaihyo_period(self, ws) -> Optional[str]:
    # ...
    for row in range(1, 16):
        for col in range(1, 41):
            cell_value = ws.cell(row=row, column=col).value  # Línea 1088
            # ...
```

**Problema:**
- Doble loop con acceso a `ws.cell()`
- Sin protección contra stream cerrado
- Criticidad: **ALTA** (método llamado por _parse_kintaihyo_sheet)

---

### 🟠 PROBLEMA 11: detect_kintaihyo_blocks() Scan Sin Protección (Línea 1145-1180)
**Línea exacta:** 1145-1180  
**Código:**
```python
def detect_kintaihyo_blocks(self, ws) -> List[tuple]:
    blocks = []
    found_positions = set()

    max_row = min(500, ws.max_row)
    max_col = min(50, ws.max_column)

    for row in range(1, max_row - 7):
        for col in range(1, max_col + 1):
            pos_key = (row // 8, col)
            if pos_key in found_positions:
                continue

            if self._is_kintaihyo_block_start(ws, row, col):  # ← Acceso
                blocks.append((row, col))
                found_positions.add(pos_key)

    return blocks
```

**Problema:**
- Loop masivo (hasta 500 * 50 = 25,000 iteraciones)
- Cada iteración llama a `_is_kintaihyo_block_start()` que accede a células
- Si stream se cierra durante este loop → FALLO CASCADA

---

### 🔴 PROBLEMA 12: _extract_kintaihyo_worker() Múltiples Accesos (Línea 1185-1200)
**Línea exacta:** 1185-1200  
**Código:**
```python
def extract_kintaihyo_worker(self, ws, start_row: int, col: int, period: str, sheet_name: str) -> Optional[PayrollRecordCreate]:
    try:
        name_en = str(ws.cell(row=start_row, column=col).value or "").strip()          # Línea 1185
        emp_id_raw = ws.cell(row=start_row + 1, column=col).value                      # Línea 1188
        name_jp = str(ws.cell(row=start_row + 2, column=col).value or "").strip()      # Línea 1196
        rate_raw = ws.cell(row=start_row + 3, column=col).value                        # Línea 1200
        # ...
    except Exception as e:
        print(f"[KintaihyoParser] Error extracting worker...")
        return None
```

**Problema:**
- Accesos secuenciales a `ws.cell()`
- Try/except captura errores pero no recupera el stream
- Si stream se cerró → "read of closed file" propagado

---

### 🔴 PROBLEMA 13: _extract_kintaihyo_daily_hours() (Línea 1280-1320)
**Línea exacta:** 1280-1320  
**Código:**
```python
def _extract_kintaihyo_daily_hours(self, ws, row: int, start_col: int) -> Dict[str, Any]:
    # ...
    for col_offset in range(1, 35):
        col = start_col + col_offset
        if col > ws.max_column:
            break

        cell_value = ws.cell(row=row, column=col).value  # ← Acceso
        if cell_value is None:
            continue
        # ...
```

**Problema:**
- Loop sobre columnas accediendo a `ws.cell()`
- Sin protección de stream

---

### 🔴 PROBLEMA 14: _extract_kintaihyo_payments() (Línea 1361-1445)
**Línea exacta:** 1361-1445  
**Código:**
```python
def _extract_kintaihyo_payments(self, ws, start_row: int, col: int) -> Dict[str, Any]:
    # ...
    for row_offset in range(4):
        current_row = start_row + row_offset
        for col_offset in range(-5, 40):
            current_col = col + col_offset
            if current_col < 1 or current_col > ws.max_column:
                continue

            cell_value = ws.cell(row=current_row, column=current_col).value  # Línea 1445
            # ...
```

**Problema:**
- Loop masivo (4 * 45 = 180 iteraciones) de acceso a `ws.cell()`
- Sin buffer de protección

---

### 🔴 PROBLEMA 15: _detect_field_positions() (Línea 1625-1755)
**Línea exacta:** 1625-1755  
**Código:**
```python
def _detect_field_positions(self, ws) -> None:
    # ...
    for row in range(1, min(50, ws.max_row + 1)):
        for col in label_columns:
            cell_value = ws.cell(row=row, column=col).value  # ← Acceso
            # ...
```

**Problema:**
- Acceso de células sin protección
- Método llamado durante template generation/detection

---

### 🔴 PROBLEMA 16: _scan_dynamic_zone_for_employee() (Línea 1755-1800)
**Línea exacta:** 1755-1800  
**Código:**
```python
def _scan_dynamic_zone_for_employee(self, ws, base_col: int) -> Dict[str, Any]:
    # ...
    for row in range(self.DYNAMIC_ZONE_START, self.DYNAMIC_ZONE_END + 1):
        label_cell = ws.cell(row=row, column=label_col)  # Línea 1755
        label = label_cell.value
        # ...
        value = self._get_numeric(ws, row, value_col)  # ← Acceso a ws.cell()
        # ...
```

**Problema:**
- Acceso directo a `ws.cell()` sin try/except
- Método crítico llamado en loop para cada empleado

---

### 🔴 PROBLEMA 17: _detect_employee_columns() (Línea 1834-1845)
**Línea exacta:** 1834-1845  
**Código:**
```python
def _detect_employee_columns(self, ws) -> List[int]:
    # ...
    for col in range(1, ws.max_column + 1):
        cell_value = ws.cell(row=emp_id_row, column=col).value  # Línea 1834
        # ...
```

**Problema:**
- Loop sobre todas las columnas sin protección
- Crítico para identificar empleados

---

### 🔴 PROBLEMA 18: _extract_employee_data() (Línea 1865-1920)
**Línea exacta:** 1865-1920  
**Código:**
```python
def _extract_employee_data(self, ws, base_col: int, sheet_name: str) -> Optional[PayrollRecordCreate]:
    try:
        # ...
        period_cell = ws.cell(row=period_row, column=period_col)  # Línea 1865
        period = self._parse_period(period_cell.value)
        
        emp_id_cell = ws.cell(row=emp_id_row, column=emp_id_col)  # Línea 1876
        # ...
    except Exception as e:
        print(f"[ERROR] Error extracting data for employee...")
        return None
```

**Problema:**
- Try/except captura el error pero si es "read of closed file", propaga igualmente

---

### 🟠 PROBLEMA 19: _get_hours_with_minutes() (Línea 2130-2160)
**Línea exacta:** 2130-2160  
**Código:**
```python
def _get_hours_with_minutes(self, ws, field_name: str, base_col: int) -> float:
    # ...
    hours_col = base_col + offsets.get("value", 3)
    cell = ws.cell(row=row, column=hours_col)  # Línea 2131
    raw_value = cell.value
    # ...
    minutes_col = base_col + offsets.get("minutes", 9)
    minutes = self._get_numeric(ws, row, minutes_col)  # ← Acceso a ws.cell()
    # ...
```

**Problema:**
- Acceso a `ws.cell()` sin try/except
- Método llamado para cada empleado y cada campo de horas

---

### 🟠 PROBLEMA 20: _get_numeric() (Línea 2195-2250)
**Línea exacta:** 2195-2250  
**Código:**
```python
def _get_numeric(self, ws, row: int, col: int) -> float:
    try:
        cell = ws.cell(row=row, column=col)  # Línea 2197
        value = cell.value
        # ...
    except (ValueError, TypeError, AttributeError):
        return 0.0
```

**Problema:**
- Try/except captura ValueError/TypeError pero NO "read of closed file"
- Esta excepción sigue propagándose hacia arriba

---

## RESUMEN DE CRITICIDAD

| # | Línea | Método | Criticidad | Descripción |
|---|-------|--------|-----------|------------|
| 1 | 464 | `parse()` | 🔴 CRÍTICA | BytesIO sin context manager |
| 2 | 465 | `parse()` | 🔴 CRÍTICA | openpyxl mantiene referencia lazy al stream |
| 3 | 463-522 | `parse()` | 🔴 CRÍTICA | Sin finally block / sin wb.close() |
| 4 | 475-505 | `parse()` loop | 🟡 ALTA | Excepciones pueden cerrar stream |
| 5 | 522 | `parse()` return | 🔴 CRÍTICA | No cierra workbook antes de retornar |
| 6 | 730-770 | `_parse_sheet()` | 🟠 ALTA | Sin protección de stream en dispatch |
| 7 | 574 | `_detect_layout_type()` | 🟠 ALTA | Acceso directo a ws.cell() |
| 8 | 637-690 | `_is_kintaihyo_block_start()` | 🟠 ALTA | 4 accesos a ws.cell() secuenciales |
| 9 | 806-876 | `_parse_vertical_sheet()` | 🔴 CRÍTICA | Múltiples loops de ws.cell() sin protección |
| 10 | 1088 | `_detect_kintaihyo_period()` | 🔴 CRÍTICA | Doble loop de ws.cell() |
| 11 | 1145 | `detect_kintaihyo_blocks()` | 🔴 CRÍTICA | Loop masivo (25k iteraciones) |
| 12 | 1185-1200 | `extract_kintaihyo_worker()` | 🔴 CRÍTICA | Múltiples accesos a ws.cell() |
| 13 | 1280-1320 | `_extract_kintaihyo_daily_hours()` | 🟠 ALTA | Loop de ws.cell() sin protección |
| 14 | 1361-1445 | `_extract_kintaihyo_payments()` | 🟠 ALTA | Loop masivo (180 iteraciones) de ws.cell() |
| 15 | 1625-1755 | `_detect_field_positions()` | 🟠 ALTA | Acceso de células sin protección |
| 16 | 1755-1800 | `_scan_dynamic_zone_for_employee()` | 🔴 CRÍTICA | Acceso directo a ws.cell() |
| 17 | 1834 | `_detect_employee_columns()` | 🟠 ALTA | Loop sobre todas las columnas |
| 18 | 1865-1920 | `_extract_employee_data()` | 🔴 CRÍTICA | Try/except no captura "read of closed file" |
| 19 | 2130-2160 | `_get_hours_with_minutes()` | 🟠 ALTA | Acceso a ws.cell() sin try/except |
| 20 | 2195 | `_get_numeric()` | 🟠 ALTA | Try/except no captura "read of closed file" |

---

## RAÍZ CAUSA PRINCIPAL

**La raíz causa es la falta de un context manager de nivel superior que mantenga el BytesIO y el Workbook abiertos durante TODA la ejecución del parsing.**

### Flujo de Error Típico:

1. **Línea 464:** `file_buffer = BytesIO(content)` - BytesIO creado
2. **Línea 465:** `wb = openpyxl.load_workbook(file_buffer, ...)` - Workbook creado
3. **Líneas 475-505:** Se itera sobre sheets y se llama a `_parse_sheet()`
4. **En algún punto:** Python garbage collector recoge referencias no usadas
5. **Si `file_buffer` sale del scope o se pierde:** Se cierra automáticamente
6. **Próximo acceso a `ws.cell()`:** **"read of closed file"** 🔴

---

## RECOMENDACIONES DE FIX

### FIX COMPLETO (Opción 1: Context Manager)

**Archivo:** `d:\Arari-PROv3.0\arari-app\api\salary_parser.py`  
**Método:** `parse()` líneas 455-522

```python
def parse(self, content: bytes) -> List[PayrollRecordCreate]:
    """
    Parse .xlsm file and extract all employee payroll records

    Args:
        content: Binary content of the Excel file

    Returns:
        List of PayrollRecordCreate objects
    """
    try:
        # CAMBIO: Context manager para garantizar cierre seguro
        with BytesIO(content) as file_buffer:
            try:
                wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
            except Exception as e:
                print(f"[ERROR] Error loading Excel file: {e}")
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
                # CAMBIO: Cerrar explícitamente el workbook
                if wb:
                    wb.close()

    except Exception as e:
        print(f"[ERROR] Unexpected error in parse(): {e}")
        import traceback
        traceback.print_exc()
        return []
```

---

### FIX ADICIONALES (Opcionales pero Recomendados)

#### 1. Proteger _get_numeric() contra "read of closed file"

**Línea:** 2195-2250

```python
def _get_numeric(self, ws, row: int, col: int) -> float:
    """
    Safely extract numeric value from a cell.
    """
    try:
        cell = ws.cell(row=row, column=col)
        value = cell.value

        if value is None or value == "":
            return 0.0

        # ... resto del código sin cambios ...

    except (ValueError, TypeError, AttributeError):
        return 0.0
    except Exception as e:
        # CAMBIO: Capturar "read of closed file" y otros errores
        print(f"[WARNING] Error reading cell at row {row}, col {col}: {e}")
        return 0.0
```

---

#### 2. Agregar guard a métodos críticos

**Métodos afectados:**
- `_detect_field_positions()` (línea 1625)
- `_scan_dynamic_zone_for_employee()` (línea 1750)
- `_detect_employee_columns()` (línea 1825)
- `_extract_employee_data()` (línea 1860)

**Patrón de fix:**

```python
def _method_name(self, ws, ...):
    """..."""
    try:
        # ... lógica original ...
    except (ValueError, TypeError, AttributeError):
        # Errores de datos/formato
        return default_value
    except Exception as e:
        # Capturar "read of closed file" y otros errores inesperados
        print(f"[ERROR] Unexpected error in _method_name(): {e}")
        return default_value
```

---

## SEVERIDAD GENERAL

**Nivel de Severidad:** 🔴 **CRÍTICA**

- **Impacto:** El programa falla con "read of closed file" de forma impredecible
- **Frecuencia:** Ocurre aleatoriamente dependiendo de garbage collection timing
- **Reproducibilidad:** Difícil de reproducir (timing-dependent)
- **Solución:** Implementar context managers + close() explícito

---

## CHECKLIST DE VERIFICACIÓN

- [ ] Línea 464-465: Usar `with BytesIO()` context manager
- [ ] Línea 505: Agregar `finally: wb.close()`
- [ ] Línea 522: Retorno ocurre dentro del context manager
- [ ] Línea 2195: Mejorar try/except en `_get_numeric()`
- [ ] Línea 1625-1900: Agregar guards a métodos críticos
- [ ] Test: Ejecutar parser con 5+ archivos grandes diferentes
- [ ] Test: Monitorear para "read of closed file" durante 1+ semana
- [ ] Documentation: Actualizar docstrings sobre resource management

---

**Fin del análisis**
