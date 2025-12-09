#!/usr/bin/env python3
"""
Parser for Excel files containing employee data from DBGenzaiX sheet.
Supports both .xls and .xlsm files.
"""

import openpyxl
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import re


@dataclass
class EmployeeRecord:
    """Employee record to import"""
    employee_id: str
    name: str
    name_kana: Optional[str] = None
    hourly_rate: float = 0.0
    billing_rate: float = 0.0
    dispatch_company: Optional[str] = None
    status: str = 'active'
    hire_date: Optional[str] = None
    department: Optional[str] = None
    employee_type: str = 'haken'


class DBGenzaiXParser:
    """Parser for DBGenzaiX sheet containing employee master data"""

    # Column name mappings (case-insensitive, supports multiple names)
    COLUMN_MAPPINGS = {
        'employee_id': ['employee_id', 'emp_id', '社員id', '社員ID', '社員番号', 'empid', '社員№', '社員no', '社員ｎｏ'],
        'name': ['name', '氏名', '名前'],
        'name_kana': ['name_kana', 'kana', 'フリガナ', 'カナ'],
        'hourly_rate': ['hourly_rate', '時給', '時間給', '時給額'],
        'billing_rate': ['billing_rate', '単価', '請求単価', 'billing', '派遣単価', '売上単価', '請求単価(円)', '単価(円)', '支払単価', '時間単価'],
        'dispatch_company': ['dispatch_company', '派遣会社', 'company', 'companies', '派遣先'],
        'status': ['status', 'ステータス', '状態', '稼働状態', '現在'],
        'hire_date': ['hire_date', '入社日', 'hire', '雇用日'],
        'department': ['department', '部署', '所属', '部門', '配属先'],
    }

    # Active statuses (mapped to 'active')
    ACTIVE_STATUSES = ['在籍', '在職中', 'アクティブ', '勤務中', 'active', '在勤']

    # Inactive statuses (mapped to 'inactive')
    INACTIVE_STATUSES = ['退社', '退職', '休職', 'inactive']

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []

    def parse_employees(self, file_path: str) -> Tuple[List[EmployeeRecord], Dict[str, int]]:
        """
        Parse employees from Excel file.

        Args:
            file_path: Path to Excel file (.xls or .xlsm)

        Returns:
            Tuple of (employees list, statistics dict)
        """
        self.errors = []
        self.warnings = []
        employees = []
        stats = {
            'total_rows': 0,
            'employees_found': 0,
            'rows_skipped': 0,
            'errors': 0,
        }

        try:
            # Load workbook
            wb = openpyxl.load_workbook(file_path, data_only=True)

            # Find DBGenzaiX sheet (case-insensitive)
            sheet_name = self._find_sheet(wb, 'DBGenzaiX')
            if not sheet_name:
                self.errors.append("Hoja 'DBGenzaiX' no encontrada en el archivo")
                return employees, stats

            sheet = wb[sheet_name]

            # Detect columns from header row
            col_indices = self._detect_columns(sheet)
            if not col_indices.get('employee_id'):
                self.errors.append("Columna obligatoria 'employee_id' no encontrada")
                return employees, stats

            # Iterate through data rows (skip header which is row 1)
            for row_num in range(2, sheet.max_row + 1):
                stats['total_rows'] += 1

                try:
                    # Get values from row
                    row_data = {}
                    for field, col_idx in col_indices.items():
                        if col_idx:
                            cell_value = sheet.cell(row=row_num, column=col_idx).value
                            row_data[field] = cell_value

                    # Check if employee_id exists (required field)
                    emp_id = str(row_data.get('employee_id', '')).strip()
                    if not emp_id or emp_id == 'None':
                        stats['rows_skipped'] += 1
                        continue

                    # Build employee record
                    emp = EmployeeRecord(
                        employee_id=emp_id,
                        name=str(row_data.get('name', '')).strip() or f"Employee {emp_id}",
                        name_kana=self._clean_value(row_data.get('name_kana')),
                        hourly_rate=self._to_float(row_data.get('hourly_rate')),
                        billing_rate=self._to_float(row_data.get('billing_rate')),
                        dispatch_company=self._clean_value(row_data.get('dispatch_company')),
                        status=self._map_status(row_data.get('status')),
                        hire_date=self._clean_value(row_data.get('hire_date')),
                        department=self._clean_value(row_data.get('department')),
                        employee_type=self._detect_employee_type(row_data.get('billing_rate')),
                    )

                    employees.append(emp)
                    stats['employees_found'] += 1

                except Exception as e:
                    stats['errors'] += 1
                    self.errors.append(f"Fila {row_num}: {str(e)}")

            wb.close()

        except FileNotFoundError:
            self.errors.append(f"Archivo no encontrado: {file_path}")
        except Exception as e:
            self.errors.append(f"Error al leer archivo Excel: {str(e)}")

        return employees, stats

    def _find_sheet(self, workbook, sheet_name: str) -> Optional[str]:
        """Find sheet by name (case-insensitive)"""
        for name in workbook.sheetnames:
            if name.lower() == sheet_name.lower():
                return name
        return None

    def _detect_columns(self, sheet) -> Dict[str, Optional[int]]:
        """
        Detect column indices from header row.
        Returns dict mapping field names to column indices (1-based).
        """
        col_indices = {field: None for field in self.COLUMN_MAPPINGS.keys()}

        # Read header row (row 1)
        for col_idx in range(1, sheet.max_column + 1):
            header = sheet.cell(row=1, column=col_idx).value
            if not header:
                continue

            header_lower = str(header).lower().strip()

            # Try to match this header to a field
            for field, aliases in self.COLUMN_MAPPINGS.items():
                for alias in aliases:
                    if header_lower == alias.lower():
                        col_indices[field] = col_idx
                        break

        return col_indices

    def _map_status(self, status_value) -> str:
        """Map status value to 'active' or 'inactive'"""
        if not status_value:
            return 'active'

        status_str = str(status_value).strip()
        if status_str in self.ACTIVE_STATUSES:
            return 'active'
        elif status_str in self.INACTIVE_STATUSES:
            return 'inactive'
        # Default: if not recognized, assume active
        return 'active'

    def _detect_employee_type(self, billing_rate) -> str:
        """Determine employee type based on billing_rate"""
        rate = self._to_float(billing_rate)
        return 'haken' if rate > 0 else 'ukeoi'

    def _to_float(self, value) -> float:
        """Convert value to float, return 0 if invalid"""
        if value is None or value == '' or str(value).lower() == 'none':
            return 0.0
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def _clean_value(self, value) -> Optional[str]:
        """Clean and validate string value"""
        if value is None or value == '' or str(value).lower() == 'none':
            return None
        cleaned = str(value).strip()
        return cleaned if cleaned else None
