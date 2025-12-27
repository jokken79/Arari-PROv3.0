"""
ReportAgent - Report Generation System
Generates PDF and Excel reports for 粗利 PRO
"""

import json
import sqlite3
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List

from database import USE_POSTGRES

# Note: For PDF generation, you'll need to install: pip install reportlab
# For Excel: openpyxl is already installed


def _q(query: str) -> str:
    """Convert SQLite query to PostgreSQL if needed (? -> %s)"""
    if USE_POSTGRES:
        return query.replace("?", "%s")
    return query


def _get_row_value(row, key: str, index: int, default=None):
    """Extract value from row - handles both dict (PostgreSQL) and tuple (SQLite)"""
    if row is None:
        return default
    if isinstance(row, dict):
        return row.get(key, default)
    return row[index] if len(row) > index else default


def init_reports_tables(conn: sqlite3.Connection):
    """Initialize reports tables"""
    cursor = conn.cursor()

    # Generated reports table (for tracking/caching)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS generated_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_type TEXT NOT NULL,
            report_name TEXT NOT NULL,
            period TEXT,
            entity_type TEXT,
            entity_id TEXT,
            format TEXT NOT NULL,
            file_path TEXT,
            file_size INTEGER,
            generated_by TEXT,
            parameters JSON,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Report templates table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS report_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            template_name TEXT UNIQUE NOT NULL,
            report_type TEXT NOT NULL,
            description TEXT,
            default_params JSON,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    conn.commit()


class ReportService:
    """Service for generating reports"""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cursor = conn.cursor()

    def get_monthly_report_data(self, period: str) -> Dict[str, Any]:
        """Get data for monthly profit report"""

        # Summary statistics
        self.cursor.execute(
            _q("""
            SELECT
                COUNT(*) as employee_count,
                SUM(billing_amount) as total_revenue,
                SUM(total_company_cost) as total_cost,
                SUM(gross_profit) as total_profit,
                AVG(profit_margin) as avg_margin,
                SUM(work_hours) as total_work_hours,
                SUM(overtime_hours) as total_overtime,
                SUM(overtime_over_60h) as total_overtime_60h,
                SUM(night_hours) as total_night_hours,
                SUM(holiday_hours) as total_holiday_hours
            FROM payroll_records
            WHERE period = ?
        """),
            (period,),
        )

        row = self.cursor.fetchone()
        summary = {
            "employee_count": _get_row_value(row, "employee_count", 0, 0),
            "total_revenue": _get_row_value(row, "total_revenue", 1, 0),
            "total_cost": _get_row_value(row, "total_cost", 2, 0),
            "total_profit": _get_row_value(row, "total_profit", 3, 0),
            "avg_margin": _get_row_value(row, "avg_margin", 4, 0),
            "total_work_hours": _get_row_value(row, "total_work_hours", 5, 0),
            "total_overtime": _get_row_value(row, "total_overtime", 6, 0),
            "total_overtime_60h": _get_row_value(row, "total_overtime_60h", 7, 0),
            "total_night_hours": _get_row_value(row, "total_night_hours", 8, 0),
            "total_holiday_hours": _get_row_value(row, "total_holiday_hours", 9, 0),
        }

        # By company breakdown
        self.cursor.execute(
            _q("""
            SELECT
                e.dispatch_company,
                COUNT(*) as employee_count,
                SUM(p.billing_amount) as revenue,
                SUM(p.total_company_cost) as cost,
                SUM(p.gross_profit) as profit,
                AVG(p.profit_margin) as avg_margin
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE p.period = ?
            GROUP BY e.dispatch_company
            ORDER BY profit DESC
        """),
            (period,),
        )

        by_company = []
        for row in self.cursor.fetchall():
            by_company.append(
                {
                    "company": _get_row_value(row, "dispatch_company", 0),
                    "employee_count": _get_row_value(row, "employee_count", 1, 0),
                    "revenue": _get_row_value(row, "revenue", 2, 0),
                    "cost": _get_row_value(row, "cost", 3, 0),
                    "profit": _get_row_value(row, "profit", 4, 0),
                    "margin": _get_row_value(row, "avg_margin", 5, 0),
                }
            )

        # Top/Bottom performers
        self.cursor.execute(
            _q("""
            SELECT
                p.employee_id, e.name, e.dispatch_company,
                p.billing_amount, p.total_company_cost, p.gross_profit, p.profit_margin
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE p.period = ?
            ORDER BY p.profit_margin DESC
            LIMIT 5
        """),
            (period,),
        )

        top_performers = []
        for row in self.cursor.fetchall():
            top_performers.append(
                {
                    "employee_id": _get_row_value(row, "employee_id", 0),
                    "name": _get_row_value(row, "name", 1),
                    "company": _get_row_value(row, "dispatch_company", 2),
                    "revenue": _get_row_value(row, "billing_amount", 3, 0),
                    "cost": _get_row_value(row, "total_company_cost", 4, 0),
                    "profit": _get_row_value(row, "gross_profit", 5, 0),
                    "margin": _get_row_value(row, "profit_margin", 6, 0),
                }
            )

        self.cursor.execute(
            _q("""
            SELECT
                p.employee_id, e.name, e.dispatch_company,
                p.billing_amount, p.total_company_cost, p.gross_profit, p.profit_margin
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE p.period = ?
            ORDER BY p.profit_margin ASC
            LIMIT 5
        """),
            (period,),
        )

        bottom_performers = []
        for row in self.cursor.fetchall():
            bottom_performers.append(
                {
                    "employee_id": _get_row_value(row, "employee_id", 0),
                    "name": _get_row_value(row, "name", 1),
                    "company": _get_row_value(row, "dispatch_company", 2),
                    "revenue": _get_row_value(row, "billing_amount", 3, 0),
                    "cost": _get_row_value(row, "total_company_cost", 4, 0),
                    "profit": _get_row_value(row, "gross_profit", 5, 0),
                    "margin": _get_row_value(row, "profit_margin", 6, 0),
                }
            )

        return {
            "period": period,
            "generated_at": datetime.now().isoformat(),
            "summary": summary,
            "by_company": by_company,
            "top_performers": top_performers,
            "bottom_performers": bottom_performers,
        }

    def get_employee_report_data(
        self, employee_id: str, months: int = 6
    ) -> Dict[str, Any]:
        """Get data for employee detail report"""

        # Employee info
        self.cursor.execute(
            _q("""
            SELECT employee_id, name, name_kana, dispatch_company,
                   hourly_rate, billing_rate, status, hire_date
            FROM employees WHERE employee_id = ?
        """),
            (employee_id,),
        )

        emp_row = self.cursor.fetchone()
        if not emp_row:
            return {"error": "Employee not found"}

        employee = {
            "employee_id": _get_row_value(emp_row, "employee_id", 0),
            "name": _get_row_value(emp_row, "name", 1),
            "name_kana": _get_row_value(emp_row, "name_kana", 2),
            "company": _get_row_value(emp_row, "dispatch_company", 3),
            "hourly_rate": _get_row_value(emp_row, "hourly_rate", 4),
            "billing_rate": _get_row_value(emp_row, "billing_rate", 5),
            "status": _get_row_value(emp_row, "status", 6),
            "hire_date": _get_row_value(emp_row, "hire_date", 7),
        }

        # Historical payroll data
        self.cursor.execute(
            _q("""
            SELECT period, work_hours, overtime_hours, overtime_over_60h,
                   night_hours, holiday_hours, gross_salary, billing_amount,
                   total_company_cost, gross_profit, profit_margin,
                   paid_leave_days, paid_leave_amount
            FROM payroll_records
            WHERE employee_id = ?
            ORDER BY period DESC
            LIMIT ?
        """),
            (employee_id, months),
        )

        history = []
        for row in self.cursor.fetchall():
            history.append(
                {
                    "period": _get_row_value(row, "period", 0),
                    "work_hours": _get_row_value(row, "work_hours", 1, 0),
                    "overtime_hours": _get_row_value(row, "overtime_hours", 2, 0),
                    "overtime_over_60h": _get_row_value(row, "overtime_over_60h", 3, 0),
                    "night_hours": _get_row_value(row, "night_hours", 4, 0),
                    "holiday_hours": _get_row_value(row, "holiday_hours", 5, 0),
                    "gross_salary": _get_row_value(row, "gross_salary", 6, 0),
                    "billing_amount": _get_row_value(row, "billing_amount", 7, 0),
                    "cost": _get_row_value(row, "total_company_cost", 8, 0),
                    "profit": _get_row_value(row, "gross_profit", 9, 0),
                    "margin": _get_row_value(row, "profit_margin", 10, 0),
                    "paid_leave_days": _get_row_value(row, "paid_leave_days", 11, 0),
                    "paid_leave_amount": _get_row_value(row, "paid_leave_amount", 12, 0),
                }
            )

        # Calculate averages
        if history:
            avg_margin = sum(h["margin"] or 0 for h in history) / len(history)
            avg_profit = sum(h["profit"] or 0 for h in history) / len(history)
            total_profit = sum(h["profit"] or 0 for h in history)
        else:
            avg_margin = 0
            avg_profit = 0
            total_profit = 0

        return {
            "employee": employee,
            "history": history,
            "summary": {
                "periods_count": len(history),
                "avg_margin": avg_margin,
                "avg_profit": avg_profit,
                "total_profit": total_profit,
            },
            "generated_at": datetime.now().isoformat(),
        }

    def get_company_report_data(self, company: str) -> Dict[str, Any]:
        """Get data for company/client report"""

        # Employees in this company
        self.cursor.execute(
            _q("""
            SELECT employee_id, name, hourly_rate, billing_rate, status
            FROM employees
            WHERE dispatch_company = ?
        """),
            (company,),
        )

        employees = []
        for row in self.cursor.fetchall():
            employees.append(
                {
                    "employee_id": _get_row_value(row, "employee_id", 0),
                    "name": _get_row_value(row, "name", 1),
                    "hourly_rate": _get_row_value(row, "hourly_rate", 2, 0),
                    "billing_rate": _get_row_value(row, "billing_rate", 3, 0),
                    "status": _get_row_value(row, "status", 4),
                }
            )

        # Monthly aggregates
        self.cursor.execute(
            _q("""
            SELECT
                p.period,
                COUNT(*) as employee_count,
                SUM(p.billing_amount) as revenue,
                SUM(p.total_company_cost) as cost,
                SUM(p.gross_profit) as profit,
                AVG(p.profit_margin) as avg_margin
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE e.dispatch_company = ?
            GROUP BY p.period
            ORDER BY p.period DESC
            LIMIT 12
        """),
            (company,),
        )

        monthly_data = []
        for row in self.cursor.fetchall():
            monthly_data.append(
                {
                    "period": _get_row_value(row, "period", 0),
                    "employee_count": _get_row_value(row, "employee_count", 1, 0),
                    "revenue": _get_row_value(row, "revenue", 2, 0),
                    "cost": _get_row_value(row, "cost", 3, 0),
                    "profit": _get_row_value(row, "profit", 4, 0),
                    "margin": _get_row_value(row, "avg_margin", 5, 0),
                }
            )

        # Overall summary
        self.cursor.execute(
            _q("""
            SELECT
                SUM(p.billing_amount) as total_revenue,
                SUM(p.total_company_cost) as total_cost,
                SUM(p.gross_profit) as total_profit,
                AVG(p.profit_margin) as avg_margin
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE e.dispatch_company = ?
        """),
            (company,),
        )

        totals = self.cursor.fetchone()

        return {
            "company": company,
            "employees": employees,
            "employee_count": len(employees),
            "monthly_data": monthly_data,
            "totals": {
                "revenue": _get_row_value(totals, "total_revenue", 0, 0),
                "cost": _get_row_value(totals, "total_cost", 1, 0),
                "profit": _get_row_value(totals, "total_profit", 2, 0),
                "avg_margin": _get_row_value(totals, "avg_margin", 3, 0),
            },
            "generated_at": datetime.now().isoformat(),
        }

    def generate_excel_report(self, report_type: str, data: Dict[str, Any]) -> bytes:
        """Generate Excel report from data"""
        try:
            from openpyxl import Workbook
            from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
            from openpyxl.utils import get_column_letter
        except ImportError:
            raise ImportError("openpyxl is required for Excel generation")

        wb = Workbook()
        ws = wb.active

        # Styling
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(
            start_color="4472C4", end_color="4472C4", fill_type="solid"
        )
        border = Border(
            left=Side(style="thin"),
            right=Side(style="thin"),
            top=Side(style="thin"),
            bottom=Side(style="thin"),
        )

        if report_type == "monthly":
            ws.title = f"月次レポート_{data.get('period', '')}"
            self._write_monthly_excel(ws, data, header_font, header_fill, border)

        elif report_type == "employee":
            emp = data.get("employee", {})
            ws.title = f"従業員_{emp.get('employee_id', '')}"
            self._write_employee_excel(ws, data, header_font, header_fill, border)

        elif report_type == "company":
            ws.title = f"派遣先_{data.get('company', '')[:20]}"
            self._write_company_excel(ws, data, header_font, header_fill, border)

        # Save to bytes
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        return output.getvalue()

    def _write_monthly_excel(self, ws, data, header_font, header_fill, border):
        """Write monthly report to Excel worksheet"""
        summary = data.get("summary", {})

        # Title
        ws["A1"] = f"月次粗利レポート - {data.get('period', '')}"
        ws["A1"].font = Font(bold=True, size=14)
        ws.merge_cells("A1:F1")

        # Summary section
        ws["A3"] = "サマリー"
        ws["A3"].font = Font(bold=True)

        ws["A4"] = "従業員数"
        ws["B4"] = summary.get("employee_count", 0)
        ws["A5"] = "売上合計"
        ws["B5"] = f"¥{summary.get('total_revenue', 0):,.0f}"
        ws["A6"] = "コスト合計"
        ws["B6"] = f"¥{summary.get('total_cost', 0):,.0f}"
        ws["A7"] = "粗利合計"
        ws["B7"] = f"¥{summary.get('total_profit', 0):,.0f}"
        ws["A8"] = "平均マージン"
        ws["B8"] = f"{summary.get('avg_margin', 0):.1f}%"

        # By company section
        ws["A10"] = "派遣先別"
        ws["A10"].font = Font(bold=True)

        headers = ["派遣先", "従業員数", "売上", "コスト", "粗利", "マージン"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=11, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border

        for row_idx, company in enumerate(data.get("by_company", []), 12):
            ws.cell(row=row_idx, column=1, value=company.get("company", "")).border = (
                border
            )
            ws.cell(
                row=row_idx, column=2, value=company.get("employee_count", 0)
            ).border = border
            ws.cell(
                row=row_idx, column=3, value=f"¥{company.get('revenue', 0):,.0f}"
            ).border = border
            ws.cell(
                row=row_idx, column=4, value=f"¥{company.get('cost', 0):,.0f}"
            ).border = border
            ws.cell(
                row=row_idx, column=5, value=f"¥{company.get('profit', 0):,.0f}"
            ).border = border
            ws.cell(
                row=row_idx, column=6, value=f"{company.get('margin', 0):.1f}%"
            ).border = border

        # Adjust column widths
        for col in range(1, 7):
            ws.column_dimensions[get_column_letter(col)].width = 15

    def _write_employee_excel(self, ws, data, header_font, header_fill, border):
        """Write employee report to Excel worksheet"""
        from openpyxl.utils import get_column_letter

        emp = data.get("employee", {})

        # Title
        ws["A1"] = f"従業員レポート - {emp.get('name', '')}"
        ws["A1"].font = Font(bold=True, size=14)

        # Employee info
        ws["A3"] = "従業員情報"
        ws["A3"].font = Font(bold=True)

        ws["A4"] = "ID"
        ws["B4"] = emp.get("employee_id", "")
        ws["A5"] = "名前"
        ws["B5"] = emp.get("name", "")
        ws["A6"] = "派遣先"
        ws["B6"] = emp.get("company", "")
        ws["A7"] = "時給"
        ws["B7"] = f"¥{emp.get('hourly_rate', 0):,.0f}"
        ws["A8"] = "単価"
        ws["B8"] = f"¥{emp.get('billing_rate', 0):,.0f}"

        # History section
        ws["A10"] = "履歴"
        ws["A10"].font = Font(bold=True)

        headers = [
            "期間",
            "労働時間",
            "残業",
            "深夜",
            "売上",
            "コスト",
            "粗利",
            "マージン",
        ]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=11, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border

        for row_idx, h in enumerate(data.get("history", []), 12):
            ws.cell(row=row_idx, column=1, value=h.get("period", "")).border = border
            ws.cell(
                row=row_idx, column=2, value=f"{h.get('work_hours', 0):.1f}h"
            ).border = border
            ws.cell(
                row=row_idx, column=3, value=f"{h.get('overtime_hours', 0):.1f}h"
            ).border = border
            ws.cell(
                row=row_idx, column=4, value=f"{h.get('night_hours', 0):.1f}h"
            ).border = border
            ws.cell(
                row=row_idx, column=5, value=f"¥{h.get('billing_amount', 0):,.0f}"
            ).border = border
            ws.cell(row=row_idx, column=6, value=f"¥{h.get('cost', 0):,.0f}").border = (
                border
            )
            ws.cell(
                row=row_idx, column=7, value=f"¥{h.get('profit', 0):,.0f}"
            ).border = border
            ws.cell(
                row=row_idx, column=8, value=f"{h.get('margin', 0):.1f}%"
            ).border = border

        for col in range(1, 9):
            ws.column_dimensions[get_column_letter(col)].width = 12

    def _write_company_excel(self, ws, data, header_font, header_fill, border):
        """Write company report to Excel worksheet"""
        from openpyxl.utils import get_column_letter

        # Title
        ws["A1"] = f"派遣先レポート - {data.get('company', '')}"
        ws["A1"].font = Font(bold=True, size=14)

        totals = data.get("totals", {})

        # Summary
        ws["A3"] = "サマリー"
        ws["A3"].font = Font(bold=True)

        ws["A4"] = "従業員数"
        ws["B4"] = data.get("employee_count", 0)
        ws["A5"] = "売上合計"
        ws["B5"] = f"¥{totals.get('revenue', 0):,.0f}"
        ws["A6"] = "粗利合計"
        ws["B6"] = f"¥{totals.get('profit', 0):,.0f}"
        ws["A7"] = "平均マージン"
        ws["B7"] = f"{totals.get('avg_margin', 0):.1f}%"

        # Monthly data
        ws["A9"] = "月次推移"
        ws["A9"].font = Font(bold=True)

        headers = ["期間", "従業員数", "売上", "コスト", "粗利", "マージン"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=10, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border

        for row_idx, m in enumerate(data.get("monthly_data", []), 11):
            ws.cell(row=row_idx, column=1, value=m.get("period", "")).border = border
            ws.cell(row=row_idx, column=2, value=m.get("employee_count", 0)).border = (
                border
            )
            ws.cell(
                row=row_idx, column=3, value=f"¥{m.get('revenue', 0):,.0f}"
            ).border = border
            ws.cell(row=row_idx, column=4, value=f"¥{m.get('cost', 0):,.0f}").border = (
                border
            )
            ws.cell(
                row=row_idx, column=5, value=f"¥{m.get('profit', 0):,.0f}"
            ).border = border
            ws.cell(
                row=row_idx, column=6, value=f"{m.get('margin', 0):.1f}%"
            ).border = border

        for col in range(1, 7):
            ws.column_dimensions[get_column_letter(col)].width = 15

    def log_report_generation(
        self,
        report_type: str,
        format: str,
        period: str = None,
        entity_type: str = None,
        entity_id: str = None,
        generated_by: str = None,
        file_size: int = None,
        params: Dict = None,
    ) -> int:
        """Log a generated report"""
        report_name = f"{report_type}_{period or 'all'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        self.cursor.execute(
            _q("""
            INSERT INTO generated_reports (
                report_type, report_name, period, entity_type, entity_id,
                format, generated_by, file_size, parameters
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """),
            (
                report_type,
                report_name,
                period,
                entity_type,
                entity_id,
                format,
                generated_by,
                file_size,
                json.dumps(params) if params else None,
            ),
        )
        self.conn.commit()

        return self.cursor.lastrowid

    def get_report_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get history of generated reports"""
        self.cursor.execute(
            _q("""
            SELECT id, report_type, report_name, period, format,
                   generated_by, file_size, created_at
            FROM generated_reports
            ORDER BY created_at DESC
            LIMIT ?
        """),
            (limit,),
        )

        return [
            {
                "id": _get_row_value(row, "id", 0),
                "type": _get_row_value(row, "report_type", 1),
                "name": _get_row_value(row, "report_name", 2),
                "period": _get_row_value(row, "period", 3),
                "format": _get_row_value(row, "format", 4),
                "generated_by": _get_row_value(row, "generated_by", 5),
                "file_size": _get_row_value(row, "file_size", 6),
                "created_at": _get_row_value(row, "created_at", 7),
            }
            for row in self.cursor.fetchall()
        ]
