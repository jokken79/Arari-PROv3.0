"""
Specialized parser for .xlsm salary statement files (給与明細)

VERSIÓN 3.0 - Parser con Templates
===================================
- Sistema híbrido: Templates guardados + Detección dinámica
- Primera vez: Detecta campos por nombre y guarda template
- Siguientes veces: Usa template guardado para mayor velocidad
- Fallback: Si template falla, vuelve a detección dinámica

Features:
- Busca campos por nombre (no posiciones fijas)
- Detecta automáticamente cualquier 手当 (allowance)
- Valida consistencia: suma componentes vs 総支給額
- Guarda templates por fábrica (派遣先)

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
    # ================================================================
    FIELD_PATTERNS = {
        # Time data (時間データ)
        'work_days': ['出勤日数', '出勤日', '勤務日数', '労働日数'],
        'paid_leave_days': ['有給日数', '有休日数', '有給休暇日数'],
        'work_hours': ['労働時間', '勤務時間', '所定時間', '基本時間', '総労働時間', '出勤時間', '就業時間', '実働時間', '実働'],
        'overtime_hours': ['残業時間', '時間外', '残業', '普通残業', '早出残業', '所定外', '所定時間外労働'],
        'night_hours': ['深夜時間', '深夜', '深夜労働', '深夜時間労働'],
        'holiday_hours': ['休日時間', '休日出勤', '休出時間', '法定休日', '公休出勤'],
        'overtime_over_60h': ['60H過', '60時間超', '60h超', '60H超残業'],

        # Salary amounts (給与)
        'base_salary': ['基本給', '基本賃金', '本給'],
        'overtime_pay': ['残業代', '残業手当', '時間外手当'],
        'night_pay': ['深夜手当', '深夜割増', '深夜代'],
        'holiday_pay': ['休日手当', '休日割増', '休出手当'],
        'overtime_over_60h_pay': ['60H過手当', '60時間超手当', '60H超手当'],
        'transport_allowance': ['通勤費', '交通費', '通勤手当'],
        'paid_leave_amount': ['有給金額', '有休金額', '有給手当', '有給支給'],

        # Deductions (控除)
        'social_insurance': ['社会保険', '社保', '健康保険'],
        'employment_insurance': ['雇用保険'],
        'income_tax': ['所得税', '源泉税'],
        'resident_tax': ['住民税', '市民税'],

        # Totals
        'gross_salary': ['総支給額', '支給合計', '総支給', '給与総額'],
        'net_salary': ['差引支給額', '手取り', '振込額', '差引額'],
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
    ]

    # ================================================================
    # NON-BILLABLE ALLOWANCES (会社負担のみ、派遣先に請求しない)
    # These are paid to employee but NOT billed to client
    # ================================================================
    NON_BILLABLE_ALLOWANCES = [
        '通勤手当',        # Transport allowance
        '通勤手当（非）',   # Transport allowance (non-taxable)
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
        'base_salary': 16,       # Salario base (¥172,800) ← CORREGIDO
        'overtime_pay': 17,      # Pago horas extra (¥23,210) ← CORREGIDO
        'night_pay': 18,         # Pago nocturno (¥23,829) ← CORREGIDO
        'gross_salary': 30,      # Salario bruto (¥219,839)
        'social_insurance': 31,  # Seguro social (¥15,030)
        'employment_insurance': 33,  # Seguro empleo (¥1,319) ← CORREGIDO
        'net_salary': 47,        # Salario neto (¥182,677) ← CORREGIDO
        # Campos que NO existen en este Excel:
        # holiday_hours, overtime_over_60h, holiday_pay, overtime_over_60h_pay
        # transport_allowance, paid_leave_amount, income_tax, resident_tax
    }

    # Column offsets within an employee block
    # CRITICAL: Este Excel tiene datos en MÚLTIPLES columnas
    COLUMN_OFFSETS = {
        'period': 8,       # Period está en col 9 (base_col=1, offset=8)
        'employee_id': 9,  # Employee ID está en col 10 (base_col=1, offset=9)
        'name': 9,         # Name también en col 10
        'label': 1,        # Labels en col 2 (base_col=1, offset=1)
        'value': 3,        # VALUES (salarios, horas) en col 4 (base_col=1, offset=3)
        'days': 5,         # DAYS (work_days) en col 6 (base_col=1, offset=5) ← NUEVO
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

        # Process all sheets except the summary sheet (集計)
        for sheet_name in wb.sheetnames:
            if sheet_name in ['集計', 'Summary', '目次', 'Index']:
                continue  # Skip summary/index sheets

            try:
                ws = wb[sheet_name]
                sheet_records = self._parse_sheet(ws, sheet_name)
                records.extend(sheet_records)
            except Exception as e:
                print(f"[WARNING] Error parsing sheet '{sheet_name}': {e}")
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

        # Scan first 50 rows, looking at label columns (1, 2, 15, 16, etc.)
        label_columns = [1, 2, 15, 16, 29, 30]  # Common label column positions

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
                for field_name, patterns in self.FIELD_PATTERNS.items():
                    if field_name not in self.detected_fields:
                        for pattern in patterns:
                            pattern_normalized = pattern.replace(' ', '').replace('　', '')
                            if pattern_normalized in label_normalized or label_normalized in pattern_normalized:
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
            work_hours = self._get_field_value(ws, 'work_hours', base_col)
            overtime_hours = self._get_field_value(ws, 'overtime_hours', base_col)
            night_hours = self._get_field_value(ws, 'night_hours', base_col)
            holiday_hours = self._get_field_value(ws, 'holiday_hours', base_col)
            overtime_over_60h = self._get_field_value(ws, 'overtime_over_60h', base_col)

            base_salary = self._get_field_value(ws, 'base_salary', base_col)
            overtime_pay = self._get_field_value(ws, 'overtime_pay', base_col)
            night_pay = self._get_field_value(ws, 'night_pay', base_col)
            holiday_pay = self._get_field_value(ws, 'holiday_pay', base_col)
            overtime_over_60h_pay = self._get_field_value(ws, 'overtime_over_60h_pay', base_col)
            transport_allowance = self._get_field_value(ws, 'transport_allowance', base_col)
            paid_leave_amount = self._get_field_value(ws, 'paid_leave_amount', base_col)

            # Extract deductions
            social_insurance = self._get_field_value(ws, 'social_insurance', base_col)
            employment_insurance = self._get_field_value(ws, 'employment_insurance', base_col)
            income_tax = self._get_field_value(ws, 'income_tax', base_col)
            resident_tax = self._get_field_value(ws, 'resident_tax', base_col)

            # Get totals from Excel
            gross_salary_excel = self._get_field_value(ws, 'gross_salary', base_col)
            net_salary = self._get_field_value(ws, 'net_salary', base_col)

            # ================================================================
            # DYNAMIC ALLOWANCE DETECTION - Sum all detected 手当
            # ================================================================
            other_allowances_total = 0
            detected_allowance_details = []

            for allowance_name, row in self.detected_allowances.items():
                value = self._get_numeric(ws, row, base_col + offsets.get('value', 3))
                if value > 0:
                    other_allowances_total += value
                    detected_allowance_details.append(f"{allowance_name}=¥{value:,.0f}")

            if detected_allowance_details:
                print(f"    [Allowances] {employee_id}: {', '.join(detected_allowance_details)}")

            # ================================================================
            # NON-BILLABLE ALLOWANCES (通勤手当（非）, 業務手当, etc.)
            # These are costs for company but NOT billed to 派遣先
            # ================================================================
            non_billable_total = 0
            non_billable_details = []

            for allowance_name, row in self.detected_non_billable.items():
                value = self._get_numeric(ws, row, base_col + offsets.get('value', 3))
                if value > 0:
                    non_billable_total += value
                    non_billable_details.append(f"{allowance_name}=¥{value:,.0f}")

            if non_billable_details:
                print(f"    [Non-billable] {employee_id}: {', '.join(non_billable_details)} (company cost only)")

            # ================================================================
            # CALCULATE GROSS SALARY (with fallback)
            # Includes ALL allowances (both billable and non-billable)
            # ================================================================
            calculated_gross = (
                base_salary +
                overtime_pay +
                night_pay +
                holiday_pay +
                overtime_over_60h_pay +
                transport_allowance +
                paid_leave_amount +
                other_allowances_total +
                non_billable_total  # 通勤手当（非）, 業務手当, etc.
            )

            # Use Excel's gross_salary if available, otherwise use calculated
            if gross_salary_excel > 0:
                gross_salary = gross_salary_excel
            else:
                gross_salary = calculated_gross

            # ================================================================
            # VALIDATION: Compare calculated vs Excel total
            # ================================================================
            if gross_salary_excel > 0 and calculated_gross > 0:
                difference = abs(gross_salary_excel - calculated_gross)
                tolerance = gross_salary_excel * 0.02  # 2% tolerance

                if difference > tolerance and difference > 1000:  # More than 2% or ¥1000
                    warning = (
                        f"{employee_id} ({period}): "
                        f"総支給額 mismatch! Excel=¥{gross_salary_excel:,.0f}, "
                        f"Calculated=¥{calculated_gross:,.0f}, "
                        f"Diff=¥{difference:,.0f}"
                    )
                    self.validation_warnings.append(warning)

            # Calculate paid_leave_hours from days
            paid_leave_hours = paid_leave_days * 8 if paid_leave_days > 0 else 0

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
                'other_allowances': other_allowances_total + non_billable_total,  # Includes non-billable
                'transport_allowance': transport_allowance,
                'gross_salary': gross_salary,

                # Deductions
                'social_insurance': social_insurance,
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
