"""
Specialized parser for .xlsm salary statement files (給与明細)

VERSIÓN 4.0 - Parser Híbrido (Fijo + Dinámico por Empleado)
============================================================
- Filas 1-19: POSICIÓN FIJA (datos básicos siempre en misma fila)
- Filas 20-29: ESCANEO DINÁMICO POR EMPLEADO (allowances varían)
- Filas 30+: POSICIÓN FIJA (totales y deducciones)

Problema resuelto:
- Empleado A tiene ガソリン代 en fila 20
- Empleado B tiene 60H過残業 en fila 20 y ガソリン代 en fila 21
- Empleado C tiene 皆勤手当 en fila 20, 業務手当 en fila 21, ガソリン代 en fila 22

Solución:
- Para cada empleado, escanear filas 20-29 buscando labels
- Detectar qué tiene cada uno individualmente
- Leer valores según lo que se encuentre

Features:
- Detecta automáticamente cualquier 手当 (allowance) POR EMPLEADO
- Distingue entre billable y non-billable allowances
- Valida consistencia: suma componentes vs 総支給額
- Compatible con sistema de templates (para filas fijas)

Handles complex multi-sheet, multi-employee layout where:
- Each file has multiple sheets (1 summary + company sheets)
- Each company sheet has multiple employees side-by-side
- Each employee occupies ~14 columns

Multipliers for billing calculation:
- 基本時間: 単価 × hours
- 残業 (≤60h): 単価 × 1.25
- 残業 (>60h): 単価 × 1.5
- 深夜 (factory): 単価 × 0.25 (extra on top of regular)
- 休日: 単価 × 1.35
"""

import openpyxl
import re
from typing import List, Optional, Dict, Any, Tuple
from io import BytesIO
from models import PayrollRecordCreate
from template_manager import TemplateManager, TemplateGenerator


class SalaryStatementParser:
    """Parser inteligente para archivos .xlsm de 給与明細"""

    # Each employee occupies this many columns width
    EMPLOYEE_COLUMN_WIDTH = 14

    # ================================================================
    # FIELD MAPPINGS - Busca estos nombres en las celdas del Excel
    # IMPORTANTE: Los patterns deben ser ESPECÍFICOS para evitar confusiones
    # - Para HORAS: usar patterns que NO contengan 手当/代/割増
    # - Para YEN (pagos): usar patterns que SÍ contengan 手当/代/割増 o 給
    #
    # ACTUALIZADO 2025-12-10: Integrado labels comprehensivos de ChinginGenerator
    # ================================================================
    FIELD_PATTERNS = {
        # Time data (時間データ) - SOLO patterns de HORAS, sin 手当/代
        # NOTA: paid_leave_hours NO existe en este Excel - no detectar
        'work_days': ['出勤日数', '労働日数', '日数'],  # Ampliado con variantes
        'paid_leave_days': ['有給日数', '有給'],  # Ampliado
        'absence_days': ['欠勤日数', '欠勤'],  # NUEVO - días de ausencia
        'work_hours': ['労働時間', '実働時'],  # Ampliado
        'overtime_hours': ['残業時間', '所定時間外', '時間外労働'],  # Ampliado
        'night_hours': ['深夜時間', '深夜労働時間'],  # Ampliado
        'holiday_hours': ['休日時間', '休日労働'],  # Ampliado

        # Salary amounts (給与) - Patterns con 手当/代/割増/給
        'base_salary': ['基本給', '基本賃金', '本給', '基　本　給', '給与'],  # Ampliado con espacios japoneses
        'overtime_pay': ['残業手当', '時間外手当', '残業代', '普通残業', '普通残業手当'],  # Ampliado
        'night_pay': ['深夜手当', '深夜割増', '深夜代', '深夜残業', '深夜残業手当'],  # Ampliado
        'holiday_pay': ['休日手当', '休日割増', '休出手当', '休日勤務', '休日勤務手当'],  # Ampliado
        'overtime_over_60h_pay': ['60H過手当', '60時間超手当', '60H超手当'],
        # NOTE: 通勤費 is now ONLY in DYNAMIC_ZONE_LABELS as 'non_billable'
        # This prevents duplicate counting (transport + non_billable)
        'transport_allowance': ['交通費', '通勤手当', 'ガソリン', 'ガソリン代'],  # Ampliado con ガソリン
        'paid_leave_amount': ['有給金額', '有休金額', '有給手当', '有給支給', '有給休暇', '有休手当'],  # Ampliado

        # Deductions (控除) - AMPLIADO significativamente
        'social_insurance': ['社会保険', '社保', '健康保険', '健康保険料'],  # Ampliado
        'welfare_pension': ['厚生年金', '厚生年金保険'],
        'employment_insurance': ['雇用保険', '雇用保険料'],  # Ampliado
        'social_insurance_total': ['社保計', '社会保険計', '社会保険料計'],  # NUEVO - total seguros
        'income_tax': ['所得税', '源泉税', '源泉所得税'],  # Ampliado
        'resident_tax': ['住民税', '市民税'],
        'rent_deduction': ['家賃', '寮費'],  # NUEVO - alquiler
        'utilities': ['水道光熱', '光熱費', '電気代'],  # NUEVO - servicios
        'advance_payment': ['前貸', '前借'],  # NUEVO - adelantos
        'meal_cost': ['弁当', '弁当代', '食事代', '食事'],  # NUEVO - comida
        'year_end_adjustment': ['年調過不足', '年末調整'],  # NUEVO - ajuste anual

        # Totals - AMPLIADO
        'gross_salary': ['総支給額', '支給合計', '総支給', '給与総額', '合　　計', '合計'],
        'net_salary': ['差引支給額', '手取り', '振込額', '差引額', '差引支給'],
        'deduction_total': ['控除合計', '控除計'],  # NUEVO - total deducciones
    }

    # Patterns to detect ANY 手当 (allowance)
    ALLOWANCE_PATTERNS = [
        r'.*手当.*',      # Cualquier cosa con 手当
        r'.*割増.*',      # Cualquier割増 (premium)
        r'.*加算.*',      # Cualquier加算 (addition)
    ]

    # Known allowances to EXCLUDE from "other_allowances" (ya tienen campo propio)
    KNOWN_ALLOWANCES = [
        '残業手当', '時間外手当', '深夜手当', '休日手当', '休出手当',
        '60H過手当', '60時間超手当', '通勤手当', '有給手当',
        '残業代', '深夜代', '深夜割増', '休日割増',
        '通勤費',  # Added - now handled as non_billable in dynamic zone
    ]

    # ================================================================
    # NON-BILLABLE ALLOWANCES (会社負担のみ、派遣先に請求しない)
    # These are paid to employee but NOT billed to client
    # ================================================================
    NON_BILLABLE_ALLOWANCES = [
        '通勤手当',        # Transport allowance
        '通勤手当（非）',   # Transport allowance (non-taxable) - 全角 brackets
        '通勤手当(非)',    # Transport allowance (non-taxable) - 半角 brackets
        '通勤費',          # Transport cost
        '業務手当',        # Work allowance
    ]

    # Fallback row positions (used if intelligent detection fails)
    # ACTUALIZADO 2025-12-09 - Basado en análisis REAL del Excel completo
    FALLBACK_ROW_POSITIONS = {
        'period': 10,            # Período (datetime en row 10)
        'employee_id': 6,        # ID empleado (200901)
        'name': 7,               # Nombre
        'work_days': 11,         # Días trabajados (16) - en columna Days
        'paid_leave_days': 12,   # Días de vacaciones pagadas
        'work_hours': 13,        # Horas de trabajo (128)
        'overtime_hours': 14,    # Horas extra (13)
        'night_hours': 15,       # Horas nocturnas (70)
        'base_salary': 16,       # Salario base (¥172,800)
        'overtime_pay': 17,      # Pago horas extra (¥23,210)
        'night_pay': 18,         # Pago nocturno (¥23,829)
        'gross_salary': 30,      # Salario bruto (¥219,839)
        'social_insurance': 31,  # 健康保険 (¥15,030)
        'welfare_pension': 32,   # 厚生年金 - AGREGADO para cálculo correcto
        'employment_insurance': 33,  # 雇用保険 (¥1,319)
        'income_tax': 34,        # 所得税
        'resident_tax': 35,      # 住民税
        'net_salary': 47,        # 差引支給額 (¥182,677)
        # Campos en zona dinámica (20-29):
        # holiday_hours, overtime_over_60h_pay, transport_allowance, paid_leave_amount
    }

    # Column offsets within an employee block
    # CRITICAL: Este Excel tiene datos en MÚLTIPLES columnas
    # Para employee 1 (base_col=1): C1=marker, C2=category, C3=label, C4=value
    COLUMN_OFFSETS = {
        'period': 8,       # Period está en col 9 (base_col=1, offset=8)
        'employee_id': 9,  # Employee ID está en col 10 (base_col=1, offset=9)
        'name': 9,         # Name también en col 10
        'label': 2,        # Labels en col 3 (base_col=1, offset=2) ← CORREGIDO
        'value': 3,        # VALUES (salarios, horas) en col 4 (base_col=1, offset=3)
        'days': 5,         # DAYS (work_days) en col 6 (base_col=1, offset=5)
        'minutes': 9,      # MINUTES para horas (col 10) - usado para convertir HH:MM a decimal
    }

    # ================================================================
    # ZONA DINÁMICA - Filas donde los allowances varían por empleado
    # ================================================================
    DYNAMIC_ZONE_START = 20  # Primera fila de la zona dinámica
    DYNAMIC_ZONE_END = 29    # Última fila de la zona dinámica

    # Labels que pueden aparecer en la zona dinámica (20-29)
    # ACTUALIZADO 2025-12-10: Integrado labels comprehensivos de ChinginGenerator
    DYNAMIC_ZONE_LABELS = {
        # Overtime over 60h
        '60H過残業': 'overtime_over_60h_pay',
        '60H過': 'overtime_over_60h_pay',
        '60時間超': 'overtime_over_60h_pay',
        '60h超残業': 'overtime_over_60h_pay',

        # Paid leave (有給)
        '有給休暇': 'paid_leave_amount',
        '有給': 'paid_leave_amount',
        '有休': 'paid_leave_amount',
        '有休手当': 'paid_leave_amount',

        # Non-billable (company cost only - 会社負担のみ)
        '通勤手当(非)': 'non_billable',
        '通勤手当（非）': 'non_billable',
        '業務手当': 'non_billable',
        '通勤費': 'non_billable',
        'ガソリン': 'non_billable',  # Gasolina (transporte)
        'ガソリン代': 'non_billable',  # Movido de other_allowance

        # Other billable allowances (手当 - facturables)
        '休業補償': 'other_allowance',
        '皆勤手当': 'other_allowance',
        '皆勤賞': 'other_allowance',  # NUEVO - bonificación asistencia perfecta
        '変則手当': 'other_allowance',
        '土日手当': 'other_allowance',
        '繁忙期手当': 'other_allowance',
        '職務手当': 'other_allowance',
        '役職手当': 'other_allowance',  # NUEVO - allowance por puesto
        '資格手当': 'other_allowance',  # NUEVO - allowance por certificación
        '特別手当': 'other_allowance',  # NUEVO - allowance especial
        '調整手当': 'other_allowance',  # NUEVO - ajuste
        '段取手当': 'other_allowance',
        '交代手当': 'other_allowance',
        '部会賞金': 'other_allowance',
        '半日有給': 'other_allowance',
        '深夜残業': 'other_allowance',  # Treat as other allowance (Deep Night OT)
        '前月給与': 'other_allowance',  # Previous month adjustment

        # Deductions que pueden aparecer en zona dinámica
        '家賃': 'rent_deduction',  # NUEVO - alquiler
        '寮費': 'rent_deduction',  # NUEVO - tarifa dormitorio
        '水道光熱': 'utilities',  # NUEVO - servicios
        '光熱費': 'utilities',
        '電気代': 'utilities',
        '前貸': 'advance_payment',  # NUEVO - adelanto
        '前借': 'advance_payment',
        '弁当': 'meal_deduction',  # NUEVO - deducción comida
        '弁当代': 'meal_deduction',
        '食事代': 'meal_deduction',
        '食事': 'meal_deduction',
        '年調過不足': 'year_end_adjustment',  # NUEVO - ajuste anual
        '年末調整': 'year_end_adjustment',
    }

    def __init__(self, use_intelligent_mode: bool = True, template_manager: Optional[TemplateManager] = None):
        """
        Initialize parser with template support.

        Args:
            use_intelligent_mode: If True, scan Excel for field names dynamically
                                 DEFAULT TRUE - now uses template system
            template_manager: Optional TemplateManager instance for template storage
                            If None, creates one automatically
        """
        self.use_intelligent_mode = use_intelligent_mode
        self.template_manager = template_manager or TemplateManager()
        self.template_generator = TemplateGenerator()

        # Current parsing state
        self.detected_fields: Dict[str, int] = {}  # field_name -> row_number
        self.detected_allowances: Dict[str, int] = {}  # allowance_name -> row_number
        self.detected_non_billable: Dict[str, int] = {}  # non-billable allowances
        self.current_column_offsets: Dict[str, int] = {}  # Current column offsets
        self.validation_warnings: List[str] = []

        # Template tracking
        self.templates_used: List[str] = []  # Factory names where template was used
        self.templates_generated: List[str] = []  # Factory names where template was generated
        self.using_template: bool = False  # Whether current sheet uses a template

    def parse(self, content: bytes) -> List[PayrollRecordCreate]:
        """
        Parse .xlsm file and extract all employee payroll records

        Args:
            content: Binary content of the Excel file

        Returns:
            List of PayrollRecordCreate objects
        """
        try:
            wb = openpyxl.load_workbook(BytesIO(content), data_only=True)
        except Exception as e:
            print(f"[ERROR] Error loading Excel file: {e}")
            return []

        records = []

        print(f"[DEBUG] Starting SalaryStatementParser. Sheets: {wb.sheetnames}")
        
        # Process all sheets except the summary sheet (集計) and Contract (請負)
        for sheet_name in wb.sheetnames:
            if sheet_name in ['集計', 'Summary', '目次', 'Index', '請負']:
                print(f"[DEBUG] Skipping sheet: {sheet_name}")
                continue  # Skip summary/index/contract sheets

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
            print(f"\n[TEMPLATES] Summary:")
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

    def get_parsing_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the parsing operation.

        Returns:
            Dict with parsing statistics
        """
        return {
            'templates_used': self.templates_used.copy(),
            'templates_generated': self.templates_generated.copy(),
            'validation_warnings': len(self.validation_warnings),
            'fields_detected': len(self.detected_fields),
            'allowances_detected': len(self.detected_allowances),
        }

    def _parse_sheet(self, ws, sheet_name: str) -> List[PayrollRecordCreate]:
        """
        Parse a single company sheet using templates or intelligent detection.

        Flow:
        1. Try to load existing template for this factory
        2. If template exists and is valid → Use it
        3. If no template → Use intelligent detection
        4. If intelligent detection succeeds → Save template for future use
        5. If both fail → Use hardcoded fallback positions
        """
        records = []
        self.using_template = False

        # ================================================================
        # STEP 1: Try to load existing template
        # ================================================================
        template = self.template_manager.find_matching_template(sheet_name)

        if template and template.get('detection_confidence', 0) >= 0.5:
            # Use template
            self._apply_template(template)
            self.using_template = True
            self.templates_used.append(sheet_name)
            print(f"  [Sheet '{sheet_name}'] Using saved template "
                  f"(confidence={template.get('detection_confidence', 0):.2f})")
        else:
            # ================================================================
            # STEP 2: No template - use intelligent detection
            # ================================================================
            if self.use_intelligent_mode:
                self._detect_field_positions(ws)

                # Check if detection was successful (found enough fields)
                required_fields = ['gross_salary', 'base_salary', 'work_hours']
                found_required = sum(1 for f in required_fields if f in self.detected_fields)
                detection_confidence = found_required / len(required_fields)

                if detection_confidence >= 0.6:
                    # ================================================================
                    # STEP 3: Detection successful - save template
                    # ================================================================
                    self._save_detected_template(ws, sheet_name, detection_confidence)
                    self.templates_generated.append(sheet_name)
                    print(f"  [Sheet '{sheet_name}'] Generated new template "
                          f"(confidence={detection_confidence:.2f})")
                else:
                    print(f"  [Sheet '{sheet_name}'] Low detection confidence "
                          f"({detection_confidence:.2f}), using fallback")

            # Use default column offsets if not set by template
            if not self.current_column_offsets:
                self.current_column_offsets = self.COLUMN_OFFSETS.copy()

        # ================================================================
        # STEP 4: Detect employee column positions
        # ================================================================
        employee_cols = self._detect_employee_columns(ws)

        if not employee_cols:
            print(f"  [WARNING] No employee IDs found in sheet '{sheet_name}'")
            return records

        mode = "template" if self.using_template else "detection"
        print(f"  [Sheet '{sheet_name}'] {len(employee_cols)} employees, "
              f"{len(self.detected_fields)} fields, "
              f"{len(self.detected_allowances)} allowances, "
              f"mode={mode}")

        # ================================================================
        # STEP 5: Extract data for each employee
        # ================================================================
        for col_idx in employee_cols:
            record = self._extract_employee_data(ws, col_idx, sheet_name)
            if record:
                records.append(record)

        return records

    def _apply_template(self, template: Dict[str, Any]) -> None:
        """
        Apply a saved template to the parser state.

        Args:
            template: Template dict from TemplateManager
        """
        self.detected_fields = template.get('field_positions', {}).copy()
        self.detected_allowances = template.get('detected_allowances', {}).copy()
        self.current_column_offsets = template.get('column_offsets', self.COLUMN_OFFSETS.copy())

        # Handle non-billable allowances
        non_billable_list = template.get('non_billable_allowances', [])
        self.detected_non_billable = {}
        for name in non_billable_list:
            if name in self.detected_allowances:
                self.detected_non_billable[name] = self.detected_allowances[name]

    def _save_detected_template(self, ws, sheet_name: str, confidence: float) -> None:
        """
        Save the current detected positions as a template.

        Args:
            ws: Worksheet being parsed
            sheet_name: Factory/sheet name
            confidence: Detection confidence score
        """
        # Find sample employee ID and period for verification
        sample_emp_id = None
        sample_period = None

        emp_id_row = self.detected_fields.get('employee_id') or self.FALLBACK_ROW_POSITIONS.get('employee_id', 6)
        period_row = self.detected_fields.get('period') or self.FALLBACK_ROW_POSITIONS.get('period', 10)

        for col in range(1, min(50, ws.max_column + 1)):
            # Find employee ID
            if not sample_emp_id:
                cell_value = ws.cell(row=emp_id_row, column=col).value
                if cell_value:
                    emp_str = str(cell_value).strip()
                    if emp_str.isdigit() and len(emp_str) == 6:
                        sample_emp_id = emp_str

            # Find period
            if not sample_period:
                cell_value = ws.cell(row=period_row, column=col).value
                if cell_value:
                    from datetime import datetime
                    if isinstance(cell_value, datetime):
                        sample_period = f"{cell_value.year}年{cell_value.month}月"
                    else:
                        import re
                        match = re.search(r'(\d{4})年(\d{1,2})月', str(cell_value))
                        if match:
                            sample_period = f"{match.group(1)}年{int(match.group(2))}月"

        # Save template
        self.template_manager.save_template(
            factory_identifier=sheet_name,
            field_positions=self.detected_fields.copy(),
            column_offsets=self.current_column_offsets or self.COLUMN_OFFSETS.copy(),
            detected_allowances=self.detected_allowances.copy(),
            non_billable_allowances=list(self.detected_non_billable.keys()),
            employee_column_width=self.EMPLOYEE_COLUMN_WIDTH,
            detection_confidence=confidence,
            sample_employee_id=sample_emp_id,
            sample_period=sample_period,
            notes=f"Auto-generated from Excel parsing"
        )

    def _detect_field_positions(self, ws) -> None:
        """
        Scan worksheet to find row positions of known fields by their labels.
        Also detects any 手当 (allowances) dynamically.
        """
        self.detected_fields = {}
        self.detected_allowances = {}
        self.detected_non_billable = {}

        # Scan first 50 rows, looking at label columns
        # Labels are at base_col + COLUMN_OFFSETS['label'] for each employee block
        # Employee blocks start at: 1, 15, 29, 43, 57, ... (spacing = 14)
        label_offset = self.COLUMN_OFFSETS.get('label', 2)
        label_columns = []
        for block_start in range(1, 100, 14):  # Generate for first ~7 employees
            label_columns.append(block_start + label_offset)  # Column with labels

        for row in range(1, min(50, ws.max_row + 1)):
            for col in label_columns:
                cell_value = ws.cell(row=row, column=col).value
                if not cell_value:
                    continue

                label = str(cell_value).strip()
                # Normalize label by removing ALL spaces (both ASCII and full-width)
                label_normalized = label.replace(' ', '').replace('　', '')

                # DEBUG LOGGING
                try:
                    with open("d:\\Arari-PRO\\debug_headers.log", "a", encoding="utf-8") as f:
                        f.write(f"Line {row} Col {col}: {label} → {label_normalized}\n")
                except:
                    pass

                # Check against known field patterns (using normalized label)
                # IMPORTANTE: Usar matching EXACTO para evitar confusiones
                # Por ejemplo: '残業' no debe matchear '残業手当' (que es YEN, no horas)
                for field_name, patterns in self.FIELD_PATTERNS.items():
                    if field_name not in self.detected_fields:
                        for pattern in patterns:
                            pattern_normalized = pattern.replace(' ', '').replace('　', '')
                            # Usar EXACT MATCH o si el label COMIENZA con el pattern
                            # Esto evita que '残業' matchee '残業手当'
                            if label_normalized == pattern_normalized:
                                self.detected_fields[field_name] = row
                                break
                            # También aceptar si el label empieza con el pattern (para variantes)
                            # Pero SOLO si no contiene indicadores de pago (手当/代/割増/給)
                            elif label_normalized.startswith(pattern_normalized):
                                # Verificar que no sea un campo de pago disfrazado
                                payment_indicators = ['手当', '代', '割増', '給']
                                is_payment_field = any(ind in label_normalized for ind in payment_indicators)
                                # Si estamos buscando horas y el label tiene indicador de pago, ignorar
                                if '_hours' in field_name or '_days' in field_name:
                                    if not is_payment_field:
                                        self.detected_fields[field_name] = row
                                        break
                                else:
                                    self.detected_fields[field_name] = row
                                    break

                # Check for NON-BILLABLE allowances (通勤手当（非）, 業務手当, etc.)
                if label in self.NON_BILLABLE_ALLOWANCES:
                    if label not in self.detected_non_billable:
                        self.detected_non_billable[label] = row

                # Check for ANY 手当 (allowance) - dynamic detection
                elif self._is_allowance(label) and label not in self.KNOWN_ALLOWANCES:
                    if label not in self.detected_allowances:
                        self.detected_allowances[label] = row

    def _is_allowance(self, label: str) -> bool:
        """Check if a label represents an allowance (手当)"""
        for pattern in self.ALLOWANCE_PATTERNS:
            if re.match(pattern, label):
                return True
        return False

    def _normalize_label(self, label: Any) -> str:
        """
        Normaliza un label para comparación consistente.
        Integrado de ChinginGenerator para mejor detección.

        Handles:
        - Full-width spaces (　) and regular spaces
        - Parentheses and their contents
        - Japanese interpunct (・)
        """
        if label is None:
            return ""
        text = str(label)
        # Remover espacios japoneses (全角) y normales
        text = text.replace('\u3000', '').replace(' ', '').replace('　', '')
        # Remover paréntesis y contenido (ej: 通勤手当（非）→ 通勤手当)
        text = re.sub(r'[（(].*?[）)]', '', text)
        # Remover caracteres de formato japonés
        text = text.replace('・', '').replace('･', '')
        return text.strip()

    def _scan_dynamic_zone_for_employee(self, ws, base_col: int) -> Dict[str, Any]:
        """
        Scan rows 20-29 for a specific employee to find their allowances.

        This is the KEY method for v4.0 - it handles the case where different
        employees have different allowances in different rows.

        Args:
            ws: Worksheet
            base_col: Base column for this employee

        Returns:
            Dict with:
                - overtime_over_60h_pay: float
                - paid_leave_amount: float
                - paid_leave_days: float (NEW - extracted from 'days' column)
                - non_billable_total: float
                - non_billable_details: List[str]
                - other_allowances_total: float
                - other_allowances_details: List[str]
        """
        offsets = self.current_column_offsets or self.COLUMN_OFFSETS
        label_col = base_col + offsets.get('label', 1)
        value_col = base_col + offsets.get('value', 3)
        days_col = base_col + offsets.get('days', 5)  # Column for days (有給日数)

        result = {
            'overtime_over_60h_pay': 0.0,
            'paid_leave_amount': 0.0,
            'paid_leave_days': 0.0,  # NEW: 有給日数 from dynamic zone
            'non_billable_total': 0.0,
            'non_billable_details': [],
            'other_allowances_total': 0.0,
            'other_allowances_details': [],
            # Nuevas deducciones del ChinginGenerator
            'rent_deduction': 0.0,
            'utilities': 0.0,
            'advance_payment': 0.0,
            'meal_deduction': 0.0,
            'year_end_adjustment': 0.0,
        }

        # Scan rows 20-29 for this employee
        for row in range(self.DYNAMIC_ZONE_START, self.DYNAMIC_ZONE_END + 1):
            # Get the label in the employee's label column
            label_cell = ws.cell(row=row, column=label_col)
            label = label_cell.value

            if not label:
                continue

            label_str = str(label).strip()

            # Skip if empty or just whitespace
            if not label_str or label_str in ['', '給', '額']:
                continue

            # Get the value (yen amount)
            value = self._get_numeric(ws, row, value_col)

            # Check against known labels
            label_normalized = label_str.replace(' ', '').replace('　', '')

            # Check known labels first
            matched = False
            for known_label, category in self.DYNAMIC_ZONE_LABELS.items():
                if known_label in label_normalized or label_normalized in known_label:
                    matched = True
                    if category == 'overtime_over_60h_pay':
                        result['overtime_over_60h_pay'] += value
                    elif category == 'paid_leave_amount':
                        # Extract BOTH the amount (value) AND the days from this row
                        result['paid_leave_amount'] += value
                        # Get days from 'days' column (same row, different column)
                        days_value = self._get_numeric(ws, row, days_col)
                        if days_value > 0:
                            result['paid_leave_days'] += days_value
                    elif category == 'non_billable':
                        result['non_billable_total'] += value
                        result['non_billable_details'].append(f"{label_str}=¥{value:,.0f}")
                    elif category == 'other_allowance':
                        result['other_allowances_total'] += value
                        result['other_allowances_details'].append(f"{label_str}=¥{value:,.0f}")
                    # NUEVAS categorías del ChinginGenerator (deducciones especiales)
                    elif category == 'rent_deduction':
                        result['rent_deduction'] += value
                    elif category == 'utilities':
                        result['utilities'] += value
                    elif category == 'advance_payment':
                        result['advance_payment'] += value
                    elif category == 'meal_deduction':
                        result['meal_deduction'] += value
                    elif category == 'year_end_adjustment':
                        result['year_end_adjustment'] += value
                    break

            # If not matched but looks like an allowance, add to other_allowances
            if not matched and self._is_allowance(label_str) and value > 0:
                result['other_allowances_total'] += value
                result['other_allowances_details'].append(f"{label_str}=¥{value:,.0f}")

        return result

    def _detect_employee_columns(self, ws) -> List[int]:
        """
        Find column indices where employee blocks start.
        Employee IDs are 6-digit numbers.
        """
        columns = []

        # Use current column offsets (from template or default)
        offsets = self.current_column_offsets or self.COLUMN_OFFSETS

        # Determine which row has employee IDs
        emp_id_row = self.detected_fields.get('employee_id') or self.FALLBACK_ROW_POSITIONS.get('employee_id', 6)

        # Scan for 6-digit numbers
        for col in range(1, ws.max_column + 1):
            cell_value = ws.cell(row=emp_id_row, column=col).value

            if cell_value is None:
                continue

            try:
                emp_id_str = str(cell_value).strip()
                if emp_id_str.isdigit() and len(emp_id_str) == 6:
                    # Found an employee ID - calculate base column
                    base_col = col - offsets.get('employee_id', 9)
                    if base_col > 0 and base_col not in columns:
                        columns.append(base_col)
            except (ValueError, AttributeError):
                continue

        return sorted(columns)

    def _extract_employee_data(self, ws, base_col: int, sheet_name: str) -> Optional[PayrollRecordCreate]:
        """Extract data for one employee using intelligent field detection or template"""
        try:
            # Use current column offsets (from template or default)
            offsets = self.current_column_offsets or self.COLUMN_OFFSETS

            # Get period
            period_row = self.detected_fields.get('period') or self.FALLBACK_ROW_POSITIONS['period']
            period_col = base_col + offsets.get('period', 8)
            period_cell = ws.cell(row=period_row, column=period_col)

            period = self._parse_period(period_cell.value)
            if not period:
                return None

            # Get employee_id
            emp_id_row = self.detected_fields.get('employee_id') or self.FALLBACK_ROW_POSITIONS.get('employee_id', 6)
            emp_id_col = base_col + offsets.get('employee_id', 9)
            emp_id_cell = ws.cell(row=emp_id_row, column=emp_id_col)
            employee_id = str(emp_id_cell.value or '').strip()

            if not employee_id or not employee_id.isdigit():
                return None

            # Extract all standard fields
            # work_days usa columna 'days' (offset 5), no 'value'
            work_days_row = self.detected_fields.get('work_days') or self.FALLBACK_ROW_POSITIONS.get('work_days', 11)
            work_days = self._get_numeric(ws, work_days_row, base_col + offsets.get('days', 5))

            paid_leave_days = self._get_field_value(ws, 'paid_leave_days', base_col)
            # Use _get_hours_with_minutes for hour fields to include minutes (73h 30m -> 73.5)
            work_hours = self._get_hours_with_minutes(ws, 'work_hours', base_col)
            overtime_hours = self._get_hours_with_minutes(ws, 'overtime_hours', base_col)
            night_hours = self._get_hours_with_minutes(ws, 'night_hours', base_col)
            holiday_hours = self._get_hours_with_minutes(ws, 'holiday_hours', base_col)

            # NOTE: overtime_over_60h_pay is in DYNAMIC ZONE
            # overtime_over_60h (hours) is CALCULATED from overtime_hours when > 60
            overtime_over_60h_pay = 0  # Will be set from dynamic zone

            # Calculate overtime_over_60h hours:
            # If overtime_hours > 60, the excess goes to overtime_over_60h
            # Example: 73h overtime → 60h normal overtime + 13h over-60h
            # IMPORTANT: overtime_hours debe ser máximo 60, el resto va a overtime_over_60h
            overtime_over_60h = max(0, overtime_hours - 60) if overtime_hours > 60 else 0
            # Cap overtime_hours at 60 (excess already moved to overtime_over_60h)
            overtime_hours = min(overtime_hours, 60)

            base_salary = self._get_field_value(ws, 'base_salary', base_col)
            overtime_pay = self._get_field_value(ws, 'overtime_pay', base_col)
            night_pay = self._get_field_value(ws, 'night_pay', base_col)
            holiday_pay = self._get_field_value(ws, 'holiday_pay', base_col)
            transport_allowance = self._get_field_value(ws, 'transport_allowance', base_col)

            # NOTE: paid_leave_amount is in DYNAMIC ZONE (有給休暇)
            # It will be set from dynamic zone scanning below
            paid_leave_amount = 0  # Will be set from dynamic zone

            # Extract deductions
            social_insurance = self._get_field_value(ws, 'social_insurance', base_col)
            welfare_pension = self._get_field_value(ws, 'welfare_pension', base_col)
            employment_insurance = self._get_field_value(ws, 'employment_insurance', base_col)
            income_tax = self._get_field_value(ws, 'income_tax', base_col)
            resident_tax = self._get_field_value(ws, 'resident_tax', base_col)

            # Get totals from Excel
            gross_salary_excel = self._get_field_value(ws, 'gross_salary', base_col)
            net_salary = self._get_field_value(ws, 'net_salary', base_col)

            # ================================================================
            # DYNAMIC ZONE SCANNING (Rows 20-29)
            # ================================================================
            # Scan for employee-specific allowances in the dynamic zone
            dynamic_data = self._scan_dynamic_zone_for_employee(ws, base_col)

            # Extract values from dynamic zone
            if 'overtime_over_60h_pay' in dynamic_data:
                overtime_over_60h_pay = dynamic_data['overtime_over_60h_pay']

            if 'paid_leave_amount' in dynamic_data:
                paid_leave_amount = dynamic_data['paid_leave_amount']

            # NEW: Get paid_leave_days from dynamic zone if found
            # (It's in the same row as 有給/有給休暇 but in the 'days' column)
            if dynamic_data.get('paid_leave_days', 0) > 0:
                paid_leave_days = dynamic_data['paid_leave_days']

            other_allowances_total = dynamic_data.get('other_allowances_total', 0)
            non_billable_total = dynamic_data.get('non_billable_total', 0)

            # paid_leave_hours not available in this Excel format
            paid_leave_hours = 0
            
            # Calculate gross_salary from components if Excel value is missing
            gross_salary = gross_salary_excel or (
                base_salary + overtime_pay + night_pay + holiday_pay + 
                overtime_over_60h_pay + paid_leave_amount + other_allowances_total +
                transport_allowance + non_billable_total
            )

            data = {
                'employee_id': employee_id,
                'period': period,

                # Time data
                'work_days': int(work_days),
                'work_hours': work_hours,
                'overtime_hours': overtime_hours,
                'night_hours': night_hours,
                'holiday_hours': holiday_hours,
                'overtime_over_60h': overtime_over_60h,
                'paid_leave_days': paid_leave_days,
                'paid_leave_hours': paid_leave_hours,
                'paid_leave_amount': paid_leave_amount,

                # Salary
                'base_salary': base_salary,
                'overtime_pay': overtime_pay,
                'night_pay': night_pay,
                'holiday_pay': holiday_pay,
                'overtime_over_60h_pay': overtime_over_60h_pay,
                'other_allowances': other_allowances_total,  # Only billable allowances
                'non_billable_allowances': non_billable_total,  # 通勤手当（非）、業務手当等 - company cost only
                'transport_allowance': transport_allowance,
                'gross_salary': gross_salary,

                # Deductions
                'social_insurance': social_insurance,
                'welfare_pension': welfare_pension,
                'employment_insurance': employment_insurance,
                'income_tax': income_tax,
                'resident_tax': resident_tax,
                'other_deductions': 0,
                'net_salary': net_salary,

                # Billing will be calculated by services.py
                'billing_amount': 0,

                # Extra: dispatch company from sheet name
                'dispatch_company': sheet_name,
            }

            return PayrollRecordCreate(**data)

        except Exception as e:
            print(f"  [ERROR] Error extracting data for employee at column {base_col}: {e}")
            return None

    def _get_field_value(self, ws, field_name: str, base_col: int) -> float:
        """Get value for a field, using detected position or fallback"""
        # Try detected position first
        if field_name in self.detected_fields:
            row = self.detected_fields[field_name]
        elif field_name in self.FALLBACK_ROW_POSITIONS:
            row = self.FALLBACK_ROW_POSITIONS[field_name]
        else:
            return 0.0

        # Use current column offsets (from template or default)
        offsets = self.current_column_offsets or self.COLUMN_OFFSETS
        col = base_col + offsets.get('value', 3)
        return self._get_numeric(ws, row, col)

    def _get_hours_with_minutes(self, ws, field_name: str, base_col: int) -> float:
        """Get hours value including minutes (HH:MM -> decimal hours)

        Handles THREE Excel formats:
        1. Separate columns: Hours in 'value' (col 4), Minutes in 'minutes' (col 10)
           Example: 73h in col 4, 30m in col 10 -> 73.5
        2. Single decimal value: Already decimal in 'value' column
           Example: 13.5 in col 4 -> 13.5
        3. Total minutes only: Hours=0, Minutes=total minutes (プレテック format)
           Example: 0h in col 4, 10080m in col 10 -> 168.0 (10080/60)

        Returns: hours as decimal (e.g., 73h 30m -> 73.5)
        """
        # Get the row for this field
        if field_name in self.detected_fields:
            row = self.detected_fields[field_name]
        elif field_name in self.FALLBACK_ROW_POSITIONS:
            row = self.FALLBACK_ROW_POSITIONS[field_name]
        else:
            return 0.0

        offsets = self.current_column_offsets or self.COLUMN_OFFSETS

        # Get hours from 'value' column
        hours_col = base_col + offsets.get('value', 3)
        hours = self._get_numeric(ws, row, hours_col)

        # Check if hours already has decimal (e.g., 13.5)
        # If yes, it's already in decimal format - don't add minutes
        if hours != int(hours):
            # Already decimal (e.g., 13.5), return as-is
            return hours

        # Hours is whole number, check for separate minutes column
        minutes_col = base_col + offsets.get('minutes', 9)
        minutes = self._get_numeric(ws, row, minutes_col)

        # Format 3: Total minutes only (プレテック style)
        # If hours is 0 and minutes is large (>=60), treat minutes as TOTAL minutes
        if hours == 0 and minutes >= 60:
            return minutes / 60.0

        # Format 1: Normal HH:MM format (minutes is 0-59)
        if 0 <= minutes < 60:
            return hours + (minutes / 60.0)

        # Minutes value is invalid (negative), ignore it
        return hours

    def _parse_period(self, value) -> str:
        """Convert period string to standard format (YYYY年M月)"""
        if value is None or value == '':
            return ''

        # Handle datetime objects from Excel
        from datetime import datetime
        if isinstance(value, datetime):
            return f"{value.year}年{value.month}月"

        value_str = str(value)
        match = re.search(r'(\d{4})年(\d{1,2})月', value_str)
        if match:
            year = match.group(1)
            month = match.group(2)
            return f"{year}年{int(month)}月"

        return ''

    def _get_numeric(self, ws, row: int, col: int) -> float:
        """Safely extract numeric value from a cell"""
        try:
            cell = ws.cell(row=row, column=col)
            value = cell.value

            if value is None or value == '':
                return 0.0

            if isinstance(value, (int, float)):
                return float(value)

            value_str = str(value).strip()
            if not value_str:
                return 0.0

            # Remove formatting
            value_str = value_str.replace(',', '').replace('¥', '').replace(' ', '')

            return float(value_str)

        except (ValueError, TypeError, AttributeError):
            return 0.0


# ================================================================
# LEGACY PARSER - Para compatibilidad con formato antiguo
# ================================================================
class SalaryStatementParserLegacy:
    """Parser legacy con posiciones fijas (para compatibilidad)"""

    ROW_POSITIONS = {
        'period': 5,
        'employee_id': 6,
        'name': 7,
        'work_days': 11,
        'paid_leave_days': 12,
        'work_hours': 13,
        'overtime_hours': 14,
        'night_hours': 15,
        'holiday_hours': 16,
        'overtime_over_60h': 17,
        'base_salary': 18,
        'overtime_pay': 19,
        'night_pay': 20,
        'holiday_pay': 21,
        'overtime_over_60h_pay': 22,
        'other_allowances': 23,
        'transport_allowance': 24,
        'paid_leave_amount': 25,
        'social_insurance': 26,
        'employment_insurance': 27,
        'income_tax': 28,
        'resident_tax': 29,
        'gross_salary': 30,
        'net_salary': 31,
    }

    COLUMN_OFFSETS = {
        'period': 2,
        'employee_id': 9,
        'name': 2,
        'value': 0,    # FIXED: Values are in same column as employee_id
    }

    def parse(self, content: bytes) -> List[PayrollRecordCreate]:
        """Use the new intelligent parser but with fallback mode"""
        parser = SalaryStatementParser(use_intelligent_mode=False)
        parser.FALLBACK_ROW_POSITIONS = self.ROW_POSITIONS
        return parser.parse(content)
