"""
Business logic services for 粗利 PRO
"""

import sqlite3
from typing import List, Optional, Dict, Any
from models import (
    Employee, EmployeeCreate,
    PayrollRecord, PayrollRecordCreate
)
import io
import csv

class PayrollService:
    """Service class for payroll and employee operations"""

    def __init__(self, db: sqlite3.Connection):
        self.db = db
        self.db.row_factory = sqlite3.Row

    # ============== Employee Operations ==============

    def get_employees(self, search: Optional[str] = None, company: Optional[str] = None, employee_type: Optional[str] = None) -> List[Dict]:
        """Get all employees with optional filtering by search, company, and employee_type"""
        cursor = self.db.cursor()

        query = """
            SELECT e.*,
                   (e.billing_rate - e.hourly_rate) as profit_per_hour,
                   CASE WHEN e.billing_rate > 0
                        THEN ((e.billing_rate - e.hourly_rate) / e.billing_rate * 100)
                        ELSE 0 END as margin_rate
            FROM employees e
            WHERE 1=1
        """
        params = []

        if search:
            query += " AND (e.employee_id LIKE ? OR e.name LIKE ? OR e.name_kana LIKE ?)"
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])

        if company:
            query += " AND e.dispatch_company = ?"
            params.append(company)

        if employee_type:
            query += " AND e.employee_type = ?"
            params.append(employee_type)

        query += " ORDER BY e.employee_id"

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def get_employee(self, employee_id: str) -> Optional[Dict]:
        """Get a single employee by ID"""
        cursor = self.db.cursor()
        cursor.execute("""
            SELECT e.*,
                   (e.billing_rate - e.hourly_rate) as profit_per_hour,
                   CASE WHEN e.billing_rate > 0
                        THEN ((e.billing_rate - e.hourly_rate) / e.billing_rate * 100)
                        ELSE 0 END as margin_rate
            FROM employees e
            WHERE e.employee_id = ?
        """, (employee_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

    def create_employee(self, employee: EmployeeCreate) -> Dict:
        """Create a new employee"""
        cursor = self.db.cursor()
        cursor.execute("""
            INSERT INTO employees (employee_id, name, name_kana, dispatch_company, department, hourly_rate, billing_rate, status, hire_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            employee.employee_id,
            employee.name,
            employee.name_kana,
            employee.dispatch_company,
            employee.department,
            employee.hourly_rate,
            employee.billing_rate,
            employee.status,
            employee.hire_date
        ))
        self.db.commit()
        return self.get_employee(employee.employee_id)

    def update_employee(self, employee_id: str, employee: EmployeeCreate) -> Optional[Dict]:
        """Update an existing employee"""
        cursor = self.db.cursor()
        cursor.execute("""
            UPDATE employees
            SET name = ?, name_kana = ?, dispatch_company = ?, department = ?,
                hourly_rate = ?, billing_rate = ?, status = ?, hire_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE employee_id = ?
        """, (
            employee.name,
            employee.name_kana,
            employee.dispatch_company,
            employee.department,
            employee.hourly_rate,
            employee.billing_rate,
            employee.status,
            employee.hire_date,
            employee_id
        ))
        self.db.commit()
        return self.get_employee(employee_id) if cursor.rowcount > 0 else None

    def delete_employee(self, employee_id: str) -> bool:
        """Delete an employee"""
        cursor = self.db.cursor()
        cursor.execute("DELETE FROM employees WHERE employee_id = ?", (employee_id,))
        self.db.commit()
        return cursor.rowcount > 0

    # ============== Payroll Operations ==============

    def get_payroll_records(self, period: Optional[str] = None, employee_id: Optional[str] = None) -> List[Dict]:
        """Get payroll records with optional filtering"""
        cursor = self.db.cursor()

        query = """
            SELECT p.*, e.name as employee_name, e.dispatch_company
            FROM payroll_records p
            LEFT JOIN employees e ON p.employee_id = e.employee_id
            WHERE 1=1
        """
        params = []

        if period:
            query += " AND p.period = ?"
            params.append(period)

        if employee_id:
            query += " AND p.employee_id = ?"
            params.append(employee_id)

        query += " ORDER BY p.period DESC, p.employee_id"

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def get_available_periods(self) -> List[str]:
        """Get list of available periods"""
        cursor = self.db.cursor()
        cursor.execute("""
            SELECT DISTINCT period FROM payroll_records ORDER BY period DESC
        """)
        return [row['period'] for row in cursor.fetchall()]

    # Insurance rates (2024年度) - configurable constants
    EMPLOYMENT_INSURANCE_RATE = 0.0095  # 雇用保険（会社負担）0.95%
    WORKERS_COMP_RATE = 0.003  # 労災保険 0.3% (派遣業の場合、業種により0.25%~0.88%)

    def create_payroll_record(self, record: PayrollRecordCreate) -> Dict:
        """Create a new payroll record with calculated fields"""
        # Get employee info for calculations
        employee = self.get_employee(record.employee_id)
        if not employee:
            raise ValueError(f"Employee {record.employee_id} not found")

        hourly_rate = employee['hourly_rate']

        # Calculate company costs
        # 社会保険（会社負担）= 本人負担と同額 (労使折半)
        company_social_insurance = record.company_social_insurance or record.social_insurance

        # 雇用保険（会社負担）= 0.95% of gross salary (2024年度)
        company_employment_insurance = record.company_employment_insurance or round(record.gross_salary * self.EMPLOYMENT_INSURANCE_RATE)

        # 労災保険（会社負担100%）= 0.3% of gross salary (派遣業)
        company_workers_comp = getattr(record, 'company_workers_comp', None) or round(record.gross_salary * self.WORKERS_COMP_RATE)

        # 有給コスト = paid leave hours × hourly rate
        paid_leave_cost = record.paid_leave_hours * hourly_rate

        # NOTE: transport_allowance is already included in gross_salary (総支給額)
        # DO NOT add it again to avoid double counting
        # gross_salary = base_salary + overtime_pay + transport_allowance + other_allowances

        total_company_cost = record.total_company_cost or (
            record.gross_salary +
            company_social_insurance +
            company_employment_insurance +
            company_workers_comp +  # 労災保険追加
            paid_leave_cost
            # transport_cost removed - already in gross_salary
        )

        # Calculate profit
        gross_profit = record.gross_profit or (record.billing_amount - total_company_cost)
        profit_margin = record.profit_margin or (
            (gross_profit / record.billing_amount * 100) if record.billing_amount > 0 else 0
        )

        cursor = self.db.cursor()

        # Use INSERT OR REPLACE to handle updates for same employee+period
        cursor.execute("""
            INSERT OR REPLACE INTO payroll_records (
                employee_id, period, work_days, work_hours, overtime_hours,
                paid_leave_hours, paid_leave_days, base_salary, overtime_pay,
                transport_allowance, other_allowances, gross_salary,
                social_insurance, employment_insurance, income_tax, resident_tax,
                other_deductions, net_salary, billing_amount, company_social_insurance,
                company_employment_insurance, company_workers_comp, total_company_cost, gross_profit, profit_margin
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            record.employee_id, record.period, record.work_days, record.work_hours,
            record.overtime_hours, record.paid_leave_hours, record.paid_leave_days,
            record.base_salary, record.overtime_pay, record.transport_allowance,
            record.other_allowances, record.gross_salary, record.social_insurance,
            record.employment_insurance, record.income_tax, record.resident_tax,
            record.other_deductions, record.net_salary, record.billing_amount,
            company_social_insurance, company_employment_insurance, company_workers_comp,
            total_company_cost, gross_profit, profit_margin
        ))

        self.db.commit()

        # Return the created record
        cursor.execute("""
            SELECT p.*, e.name as employee_name, e.dispatch_company
            FROM payroll_records p
            LEFT JOIN employees e ON p.employee_id = e.employee_id
            WHERE p.employee_id = ? AND p.period = ?
        """, (record.employee_id, record.period))

        return dict(cursor.fetchone())

    # ============== Statistics ==============

    def get_statistics(self, period: Optional[str] = None) -> Dict:
        """Get dashboard statistics"""
        cursor = self.db.cursor()

        # Get latest period if not specified
        if not period:
            cursor.execute("SELECT MAX(period) FROM payroll_records")
            result = cursor.fetchone()
            period = result[0] if result else None

        if not period:
            return self._empty_statistics()

        # Basic counts
        cursor.execute("SELECT COUNT(*) FROM employees")
        total_employees = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM employees WHERE status = 'active'")
        active_employees = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(DISTINCT dispatch_company) FROM employees")
        total_companies = cursor.fetchone()[0]

        # Period statistics
        cursor.execute("""
            SELECT
                AVG(gross_profit) as average_profit,
                AVG(profit_margin) as average_margin,
                SUM(billing_amount) as total_revenue,
                SUM(total_company_cost) as total_cost,
                SUM(gross_profit) as total_profit
            FROM payroll_records
            WHERE period = ?
        """, (period,))
        stats = cursor.fetchone()

        # Profit trend (last 6 periods)
        cursor.execute("""
            SELECT
                period,
                SUM(billing_amount) as revenue,
                SUM(total_company_cost) as cost,
                SUM(gross_profit) as profit,
                AVG(profit_margin) as margin
            FROM payroll_records
            GROUP BY period
            ORDER BY period DESC
            LIMIT 6
        """)
        profit_trend = [dict(row) for row in cursor.fetchall()][::-1]  # Reverse for chronological order

        # Profit distribution
        profit_distribution = self._calculate_profit_distribution(period)

        # Top companies
        cursor.execute("""
            SELECT
                e.dispatch_company as company_name,
                COUNT(DISTINCT e.employee_id) as employee_count,
                AVG(e.hourly_rate) as average_hourly_rate,
                AVG(e.billing_rate) as average_billing_rate,
                AVG(e.billing_rate - e.hourly_rate) as average_profit,
                AVG((e.billing_rate - e.hourly_rate) / e.billing_rate * 100) as average_margin,
                SUM(p.gross_profit) as total_monthly_profit
            FROM employees e
            LEFT JOIN payroll_records p ON e.employee_id = p.employee_id AND p.period = ?
            GROUP BY e.dispatch_company
            ORDER BY total_monthly_profit DESC
            LIMIT 5
        """, (period,))
        top_companies = [dict(row) for row in cursor.fetchall()]

        # Recent payrolls
        cursor.execute("""
            SELECT p.*, e.name as employee_name, e.dispatch_company
            FROM payroll_records p
            LEFT JOIN employees e ON p.employee_id = e.employee_id
            WHERE p.period = ?
            ORDER BY p.gross_profit DESC
            LIMIT 10
        """, (period,))
        recent_payrolls = [dict(row) for row in cursor.fetchall()]

        return {
            "total_employees": total_employees,
            "active_employees": active_employees,
            "total_companies": total_companies,
            "average_profit": stats['average_profit'] or 0,
            "average_margin": stats['average_margin'] or 0,
            "total_monthly_revenue": stats['total_revenue'] or 0,
            "total_monthly_cost": stats['total_cost'] or 0,
            "total_monthly_profit": stats['total_profit'] or 0,
            "profit_trend": profit_trend,
            "profit_distribution": profit_distribution,
            "top_companies": top_companies,
            "recent_payrolls": recent_payrolls,
            "current_period": period
        }

    def _calculate_profit_distribution(self, period: str) -> List[Dict]:
        """Calculate profit distribution for a period"""
        cursor = self.db.cursor()

        ranges = [
            ("~¥30,000", -999999999, 30000),
            ("¥30,000~50,000", 30000, 50000),
            ("¥50,000~70,000", 50000, 70000),
            ("¥70,000~100,000", 70000, 100000),
            ("¥100,000~", 100000, 999999999),
        ]

        cursor.execute("SELECT COUNT(*) FROM payroll_records WHERE period = ?", (period,))
        total = cursor.fetchone()[0]

        distribution = []
        for range_name, min_val, max_val in ranges:
            cursor.execute("""
                SELECT COUNT(*) FROM payroll_records
                WHERE period = ? AND gross_profit >= ? AND gross_profit < ?
            """, (period, min_val, max_val))
            count = cursor.fetchone()[0]
            percentage = (count / total * 100) if total > 0 else 0
            distribution.append({
                "range": range_name,
                "count": count,
                "percentage": round(percentage, 1)
            })

        return distribution

    def _empty_statistics(self) -> Dict:
        """Return empty statistics"""
        return {
            "total_employees": 0,
            "active_employees": 0,
            "total_companies": 0,
            "average_profit": 0,
            "average_margin": 0,
            "total_monthly_revenue": 0,
            "total_monthly_cost": 0,
            "total_monthly_profit": 0,
            "profit_trend": [],
            "profit_distribution": [],
            "top_companies": [],
            "recent_payrolls": [],
            "current_period": None
        }

    def get_monthly_statistics(self, year: Optional[int] = None, month: Optional[int] = None) -> List[Dict]:
        """Get monthly statistics"""
        cursor = self.db.cursor()

        query = """
            SELECT
                period,
                COUNT(DISTINCT employee_id) as total_employees,
                SUM(billing_amount) as total_revenue,
                SUM(total_company_cost) as total_cost,
                SUM(gross_profit) as total_profit,
                AVG(profit_margin) as average_margin,
                SUM(company_social_insurance) as total_social_insurance,
                SUM(paid_leave_hours * (SELECT hourly_rate FROM employees WHERE employees.employee_id = payroll_records.employee_id)) as total_paid_leave_cost
            FROM payroll_records
        """

        if year and month:
            period = f"{year}年{month}月"
            query += f" WHERE period = '{period}'"

        query += " GROUP BY period ORDER BY period DESC"

        cursor.execute(query)
        return [dict(row) for row in cursor.fetchall()]

    def get_company_statistics(self) -> List[Dict]:
        """Get statistics by company"""
        cursor = self.db.cursor()

        # Get latest period
        cursor.execute("SELECT MAX(period) FROM payroll_records")
        period = cursor.fetchone()[0]

        cursor.execute("""
            SELECT
                e.dispatch_company as company_name,
                COUNT(DISTINCT e.employee_id) as employee_count,
                AVG(e.hourly_rate) as average_hourly_rate,
                AVG(e.billing_rate) as average_billing_rate,
                AVG(e.billing_rate - e.hourly_rate) as average_profit,
                AVG((e.billing_rate - e.hourly_rate) / e.billing_rate * 100) as average_margin,
                COALESCE(SUM(p.gross_profit), 0) as total_monthly_profit,
                COALESCE(SUM(p.billing_amount), 0) as total_monthly_revenue
            FROM employees e
            LEFT JOIN payroll_records p ON e.employee_id = p.employee_id AND p.period = ?
            GROUP BY e.dispatch_company
            ORDER BY total_monthly_profit DESC
        """, (period,))

        return [dict(row) for row in cursor.fetchall()]

    def get_profit_trend(self, months: int = 6) -> List[Dict]:
        """Get profit trend for last N months"""
        cursor = self.db.cursor()
        cursor.execute("""
            SELECT
                period,
                SUM(billing_amount) as revenue,
                SUM(total_company_cost) as cost,
                SUM(gross_profit) as profit,
                AVG(profit_margin) as margin
            FROM payroll_records
            GROUP BY period
            ORDER BY period DESC
            LIMIT ?
        """, (months,))
        return [dict(row) for row in cursor.fetchall()][::-1]


class ExcelParser:
    """Parser for Excel and CSV payroll files"""

    # Column mappings (Japanese -> internal)
    COLUMN_MAPPINGS = {
        '社員番号': 'employee_id',
        '従業員番号': 'employee_id',
        'ID': 'employee_id',
        '対象期間': 'period',
        '期間': 'period',
        '月': 'period',
        '出勤日数': 'work_days',
        '労働時間': 'work_hours',
        '勤務時間': 'work_hours',
        '残業時間': 'overtime_hours',
        '有給時間': 'paid_leave_hours',
        '有給日数': 'paid_leave_days',
        '基本給': 'base_salary',
        '残業代': 'overtime_pay',
        '通勤費': 'transport_allowance',
        '交通費': 'transport_allowance',
        'その他手当': 'other_allowances',
        '総支給額': 'gross_salary',
        '社会保険料': 'social_insurance',
        '社会保険': 'social_insurance',
        '雇用保険料': 'employment_insurance',
        '雇用保険': 'employment_insurance',
        '所得税': 'income_tax',
        '住民税': 'resident_tax',
        'その他控除': 'other_deductions',
        '差引支給額': 'net_salary',
        '手取り': 'net_salary',
        '請求金額': 'billing_amount',
        '請求額': 'billing_amount',
        '売上': 'billing_amount',
    }

    def parse(self, content: bytes, file_ext: str) -> List[PayrollRecordCreate]:
        """Parse file content and return list of PayrollRecordCreate objects"""
        if file_ext == '.csv':
            return self._parse_csv(content)
        elif file_ext in ['.xlsx', '.xlsm', '.xls']:
            return self._parse_excel(content)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

    def _parse_csv(self, content: bytes) -> List[PayrollRecordCreate]:
        """Parse CSV content"""
        records = []

        # Try different encodings
        for encoding in ['utf-8', 'shift_jis', 'cp932']:
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Could not decode file with supported encodings")

        reader = csv.DictReader(io.StringIO(text))

        for row in reader:
            record = self._map_row_to_record(row)
            if record:
                records.append(record)

        return records

    def _parse_excel(self, content: bytes) -> List[PayrollRecordCreate]:
        """Parse Excel content"""
        try:
            import openpyxl
            from io import BytesIO

            wb = openpyxl.load_workbook(BytesIO(content), data_only=True)
            ws = wb.active

            # Get header row
            headers = [cell.value for cell in ws[1]]
            records = []

            for row in ws.iter_rows(min_row=2, values_only=True):
                row_dict = dict(zip(headers, row))
                record = self._map_row_to_record(row_dict)
                if record:
                    records.append(record)

            return records

        except ImportError:
            raise ValueError("openpyxl is required to parse Excel files. Install with: pip install openpyxl")

    def _map_row_to_record(self, row: dict) -> Optional[PayrollRecordCreate]:
        """Map a row dictionary to PayrollRecordCreate"""
        mapped = {}

        for jp_col, value in row.items():
            if jp_col and value is not None:
                internal_col = self.COLUMN_MAPPINGS.get(str(jp_col).strip())
                if internal_col:
                    mapped[internal_col] = self._convert_value(value, internal_col)

        # Validate required fields
        if not mapped.get('employee_id') or not mapped.get('period'):
            return None

        # Set defaults for missing fields
        defaults = {
            'work_days': 0,
            'work_hours': 0,
            'overtime_hours': 0,
            'paid_leave_hours': 0,
            'paid_leave_days': 0,
            'base_salary': 0,
            'overtime_pay': 0,
            'transport_allowance': 0,
            'other_allowances': 0,
            'gross_salary': 0,
            'social_insurance': 0,
            'employment_insurance': 0,
            'income_tax': 0,
            'resident_tax': 0,
            'other_deductions': 0,
            'net_salary': 0,
            'billing_amount': 0,
        }

        for key, default_value in defaults.items():
            if key not in mapped:
                mapped[key] = default_value

        return PayrollRecordCreate(**mapped)

    def _convert_value(self, value: Any, field: str) -> Any:
        """Convert value to appropriate type"""
        if value is None:
            return None

        if field in ['employee_id', 'period']:
            return str(value).strip()

        # Numeric fields
        try:
            if isinstance(value, str):
                # Remove currency symbols and commas
                value = value.replace('¥', '').replace(',', '').replace(' ', '').strip()
            return float(value)
        except (ValueError, TypeError):
            return 0
