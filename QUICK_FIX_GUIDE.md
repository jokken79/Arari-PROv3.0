# QUICK FIX GUIDE: "read of closed file" en salary_parser.py

**Estado:** 🔴 CRÍTICO - Debe implementarse INMEDIATAMENTE  
**Archivo:** `d:\Arari-PROv3.0\arari-app\api\salary_parser.py`  
**Impacto:** Falla de parsing aleatoria, especialmente con archivos grandes

---

## PROBLEMA EN UNA LÍNEA

**BytesIO se cierra por garbage collection mientras openpyxl aún lo está usando → "read of closed file"**

---

## UBICACIÓN EXACTA DEL PROBLEMA

```python
# LÍNEA 455-522: Método parse()
def parse(self, content: bytes) -> List[PayrollRecordCreate]:
    try:
        # ❌ PROBLEMA: BytesIO sin context manager
        file_buffer = BytesIO(content)  # Línea 464
        wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)  # Línea 465
    except Exception as e:
        print(f"[ERROR] Error loading Excel file: {e}")
        return []

    records = []
    print(f"[DEBUG] Starting SalaryStatementParser. Sheets: {wb.sheetnames}")

    # ❌ PROBLEMA: Sin finally block
    # ❌ PROBLEMA: wb nunca se cierra explícitamente
    for sheet_name in wb.sheetnames:
        try:
            ws = wb[sheet_name]
            sheet_records = self._parse_sheet(ws, sheet_name)  # Accesa ws.cell()
            records.extend(sheet_records)
        except Exception as e:
            continue

    return records  # ❌ PROBLEMA: wb no se cierra antes de retornar
```

---

## SOLUCIÓN (CON 4 CAMBIOS MÍNIMOS)

### CAMBIO 1: Envolver en context manager (Línea 464)
**De:**
```python
file_buffer = BytesIO(content)
wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
```

**A:**
```python
with BytesIO(content) as file_buffer:
    wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
```

---

### CAMBIO 2: Envolver todo el parsing en el context manager (Línea 465-521)
**Mover TODO el código dentro del `with` block:**

```python
with BytesIO(content) as file_buffer:
    try:
        wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
    except Exception as e:
        print(f"[ERROR] Error loading Excel file: {e}")
        return []

    try:
        records = []
        print(f"[DEBUG] Starting SalaryStatementParser. Sheets: {wb.sheetnames}")
        
        for sheet_name in wb.sheetnames:
            # ... todo el código de procesamiento ...
        
        return records
    finally:
        wb.close()
```

---

### CAMBIO 3: Agregar finally block (Línea 522)
**Antes de retornar records, cerrar explícitamente:**

```python
        return records
    finally:  # ← AGREGAR ESTO
        wb.close()  # ← AGREGAR ESTO
```

---

### CAMBIO 4: Agregar guard extra en try/except (Línea 2195-2250)
**En el método `_get_numeric()`, mejorar exception handling:**

```python
except (ValueError, TypeError, AttributeError):
    return 0.0
except Exception as e:  # ← AGREGAR ESTO
    print(f"[WARNING] Error reading cell at row {row}, col {col}: {e}")
    return 0.0
```

---

## IMPLEMENTACIÓN PASO A PASO

### Paso 1: Abrir el archivo
```
D:\Arari-PROv3.0\arari-app\api\salary_parser.py
Ir a línea 455
```

### Paso 2: Encontrar esta sección
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
            # Keep BytesIO open throughout parsing
            file_buffer = BytesIO(content)
            wb = openpyxl.load_workbook(file_buffer, data_only=True, read_only=False)
```

### Paso 3: Reemplazar con version fija

**Ver archivo SALARY_PARSER_FIXED.py en la carpeta raíz para código completo**

O copiar el código de la sección "FIX COMPLETO" en ANALYSIS_READ_OF_CLOSED_FILE.md

### Paso 4: Localizar el retorno
Buscar `return records` alrededor de línea 522 y asegurarse que esté dentro del `try` block y que haya un `finally` block después

### Paso 5: Test
```bash
cd d:\Arari-PROv3.0\arari-app\api
python -m pytest tests/test_salary_parser.py -v
# O ejecutar: python process_payroll_fixed.py
```

---

## TABLA DE LÍNEAS PROBLEMÁTICAS (Resumen Rápido)

| Línea | Método | Problema | Severidad | Fix |
|-------|--------|----------|-----------|-----|
| 464 | `parse()` | BytesIO sin `with` | 🔴 CRÍTICA | Envolver en `with` |
| 465 | `parse()` | No cierra wb | 🔴 CRÍTICA | Agregar `finally: wb.close()` |
| 475-505 | `parse()` loop | Excepciones pueden cerrar stream | 🟡 ALTA | Mantener dentro de `with` |
| 522 | `parse()` return | Retorna sin cerrar | 🔴 CRÍTICA | Mover dentro de `try`/`finally` |
| 574 | `_detect_layout_type()` | Acceso sin protección | 🟠 MEDIA | Será automáticamente fijo con fix principal |
| 1756 | `_scan_dynamic_zone_for_employee()` | Acceso sin protección | 🟠 MEDIA | Será automáticamente fijo con fix principal |
| 2195 | `_get_numeric()` | Try/except insuficiente | 🟠 MEDIA | Agregar `except Exception:` |

---

## ANTES Y DESPUÉS (Pseudo-código)

### ANTES (Broken):
```python
def parse(self, content: bytes) -> List[PayrollRecordCreate]:
    try:
        file_buffer = BytesIO(content)  # ❌ Sin context manager
        wb = openpyxl.load_workbook(...)
    except Exception as e:
        return []

    records = []
    for sheet_name in wb.sheetnames:  # ❌ file_buffer puede cerrarse aquí
        try:
            ws = wb[sheet_name]
            records.extend(self._parse_sheet(ws, ...))
        except Exception:
            continue

    return records  # ❌ wb nunca se cierra
    # file_buffer se cierra por GC, causa "read of closed file" en cleanup del workbook
```

### DESPUÉS (Fixed):
```python
def parse(self, content: bytes) -> List[PayrollRecordCreate]:
    try:
        with BytesIO(content) as file_buffer:  # ✅ Context manager
            try:
                wb = openpyxl.load_workbook(...)
            except Exception as e:
                return []

            try:
                records = []
                for sheet_name in wb.sheetnames:  # ✅ file_buffer garantizado abierto
                    try:
                        ws = wb[sheet_name]
                        records.extend(self._parse_sheet(ws, ...))
                    except Exception:
                        continue

                return records  # ✅ wb se cierra en finally
            finally:
                wb.close()  # ✅ Cierre explícito
    except Exception as e:
        print(f"[ERROR] {e}")
        return []
```

---

## TESTING DESPUÉS DEL FIX

```bash
# Test 1: Parser básico
python -c "from salary_parser import SalaryStatementParser; p = SalaryStatementParser(); print('OK')"

# Test 2: Con archivo real
python process_payroll_fixed.py /path/to/file.xlsm

# Test 3: Con múltiples archivos (busca "read of closed file")
for f in tests/fixtures/*.xlsm; do python -c "from salary_parser import SalaryStatementParser; p = SalaryStatementParser(); p.parse(open('$f', 'rb').read())"; done

# Test 4: Con monitoreo de memoria
python -m memory_profiler process_payroll_fixed.py /path/to/large_file.xlsm
```

---

## VERIFICACIÓN CHECKLIST

- [ ] Cambio 1: `with BytesIO(content) as file_buffer:` aplicado (línea 464)
- [ ] Cambio 2: Código de procesamiento movido dentro del `with` block
- [ ] Cambio 3: `finally: wb.close()` agregado después del bloque try de procesamiento
- [ ] Cambio 4: Exception handler en `_get_numeric()` mejorado
- [ ] Archivo compilable sin syntax errors: `python -m py_compile salary_parser.py`
- [ ] Tests pasan: `pytest tests/test_salary_parser.py -v`
- [ ] Sin "read of closed file" en logs durante 5+ parsing completos
- [ ] Memory profile normal (sin leaks)

---

## DOCUMENTACIÓN RELACIONADA

- **Análisis Completo:** `ANALYSIS_READ_OF_CLOSED_FILE.md` (20 problemas detallados)
- **Código Fijo Completo:** Buscar en este mismo repositorio `SALARY_PARSER_FIXED.py`
- **openpyxl Docs:** https://openpyxl.readthedocs.io/en/stable/
- **Python Context Managers:** https://docs.python.org/3/library/stdtypes.html#context-manager-types

---

## NOTAS IMPORTANTES

1. **No es garbage collection:** Es el contexto manager de BytesIO cerrando el stream automáticamente
2. **openpyxl no cierra el stream:** Es responsabilidad del usuario cerrar BytesIO
3. **wb.close() es necesario:** Pero SOLO después de que file_buffer esté abierto
4. **Timing-dependent:** Por eso es difícil reproducir sin context manager
5. **No hay deprecation:** Este es el patrón recomendado por openpyxl

---

**Última actualización:** 30 de enero de 2026
