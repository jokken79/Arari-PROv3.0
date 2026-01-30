"""
SALARY_PARSER_FIXED.py - Versión corregida del método parse()

Este archivo contiene SOLO las líneas 455-530 del salary_parser.py original,
pero con TODOS los fixes aplicados para resolver el problema "read of closed file"

CAMBIOS REALIZADOS:
1. Línea 464: Envolver BytesIO en context manager (with statement)
2. Línea 465+: Mover todo el código dentro del with block
3. Línea ~510: Agregar finally block con wb.close()
4. Línea ~522: return statements dentro de try/finally

INSTRUCCIONES DE APLICACIÓN:
1. Abrir: d:\Arari-PROv3.0\arari-app\api\salary_parser.py
2. Ir a: Línea 455 (método parse)
3. Seleccionar: Líneas 455-530 completas
4. Reemplazar con: El código abajo

---
"""

def parse(self, content: bytes) -> List[PayrollRecordCreate]:
    """
    Parse .xlsm file and extract all employee payroll records

    Args:
        content: Binary content of the Excel file

    Returns:
        List of PayrollRecordCreate objects
    """
    try:
        # FIXED: Envolver BytesIO en context manager para garantizar cierre automático
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
                # FIXED: Cerrar explícitamente el workbook antes de salir del context manager
                # Esto es CRÍTICO - sin esto, openpyxl intenta acceder al stream cerrado
                if wb:
                    try:
                        wb.close()
                    except Exception as e:
                        print(f"[DEBUG] Error closing workbook: {e}")

    except Exception as e:
        print(f"[ERROR] Unexpected error in parse(): {e}")
        import traceback
        traceback.print_exc()
        return []

# ============================================================================
# EXPLICACIÓN DE LOS CAMBIOS
# ============================================================================
#
# PROBLEMA ORIGINAL:
#   - Línea 464: file_buffer = BytesIO(content)
#   - Línea 465: wb = openpyxl.load_workbook(file_buffer, ...)
#   - Sin context manager, el BytesIO se cierra por garbage collection
#   - Cuando openpyxl intenta leer del stream → "read of closed file"
#
# SOLUCIÓN:
#   1. Envolver en `with BytesIO(content) as file_buffer:`
#      - Garantiza que file_buffer permanezca abierto
#   
#   2. Mover TODO el código de procesamiento dentro del `with` block
#      - Líneas 466-527 ahora están dentro del context manager
#   
#   3. Agregar `finally: wb.close()`
#      - Cierra el workbook ANTES de que se cierre el BytesIO
#      - Previene que openpyxl intente leer del stream cerrado
#      - El finally garantiza que se ejecuta incluso si hay excepciones
#   
#   4. Mantener try/except anidados
#      - Primer try: Cargar workbook
#      - Segundo try: Procesar sheets
#      - finally: Cerrar workbook
#      - Outer try: Capturar errores inesperados
#
# FLUJO DE EJECUCIÓN DESPUÉS DEL FIX:
#   1. Abrir file_buffer con context manager ✓
#   2. Cargar workbook (dentro del context manager) ✓
#   3. Procesar sheets (dentro del context manager) ✓
#   4. Cerrar workbook en finally (ANTES de cerrar file_buffer) ✓
#   5. Salir del context manager (file_buffer se cierra aquí, pero ya no es necesario) ✓
#   6. Retornar records ✓
#
# PRUEBAS DESPUÉS DEL FIX:
#   - No debe haber "read of closed file"
#   - Parser debe completar para todos los tipos de archivos
#   - Memory usage debe ser normal (no hay leaks)
#
# ============================================================================
