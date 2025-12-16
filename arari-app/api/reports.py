"""
ReportAgent - Report Generation System
Generates PDF and Excel reports for 粗利 PRO
"""

import json
import sqlite3
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List

# Note: For PDF generation, you'll need to install: pip install reportlab
# For Excel: openpyxl is already installed


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
            """
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
        """,
            (period,),
        )

        row = self.cursor.fetchone()
        summary = {
            "employee_count": row[0] or 0,
            "total_revenue": row[1] or 0,
            "total_cost": row[2] or 0,
            "total_profit": row[3] or 0,
            "avg_margin": row[4] or 0,
            "total_work_hours": row[5] or 0,
            "total_overtime": row[6] or 0,
            "total_overtime_60h": row[7] or 0,
            "total_night_hours": row[8] or 0,
            "total_holiday_hours": row[9] or 0,
        }

        # By company breakdown
        self.cursor.execute(
            """
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
        """,
            (period,),
        )

        by_company = []
        for row in self.cursor.fetchall():
            by_company.append(
                {
                    "company": row[0],
                    "employee_count": row[1],
                    "revenue": row[2] or 0,
                    "cost": row[3] or 0,
                    "profit": row[4] or 0,
                    "margin": row[5] or 0,
                }
            )

        # Top/Bottom performers
        self.cursor.execute(
            """
            SELECT
                p.employee_id, e.name, e.dispatch_company,
                p.billing_amount, p.total_company_cost, p.gross_profit, p.profit_margin
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE p.period = ?
            ORDER BY p.profit_margin DESC
            LIMIT 5
        """,
            (period,),
        )

        top_performers = []
        for row in self.cursor.fetchall():
            top_performers.append(
                {
                    "employee_id": row[0],
                    "name": row[1],
                    "company": row[2],
                    "revenue": row[3] or 0,
                    "cost": row[4] or 0,
                    "profit": row[5] or 0,
                    "margin": row[6] or 0,
                }
            )

        self.cursor.execute(
            """
            SELECT
                p.employee_id, e.name, e.dispatch_company,
                p.billing_amount, p.total_company_cost, p.gross_profit, p.profit_margin
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE p.period = ?
            ORDER BY p.profit_margin ASC
            LIMIT 5
        """,
            (period,),
        )

        bottom_performers = []
        for row in self.cursor.fetchall():
            bottom_performers.append(
                {
                    "employee_id": row[0],
                    "name": row[1],
                    "company": row[2],
                    "revenue": row[3] or 0,
                    "cost": row[4] or 0,
                    "profit": row[5] or 0,
                    "margin": row[6] or 0,
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
            """
            SELECT employee_id, name, name_kana, dispatch_company,
                   hourly_rate, billing_rate, status, hire_date
            FROM employees WHERE employee_id = ?
        """,
            (employee_id,),
        )

        emp_row = self.cursor.fetchone()
        if not emp_row:
            return {"error": "Employee not found"}

        employee = {
            "employee_id": emp_row[0],
            "name": emp_row[1],
            "name_kana": emp_row[2],
            "company": emp_row[3],
            "hourly_rate": emp_row[4],
            "billing_rate": emp_row[5],
            "status": emp_row[6],
            "hire_date": emp_row[7],
        }

        # Historical payroll data
        self.cursor.execute(
            """
            SELECT period, work_hours, overtime_hours, overtime_over_60h,
                   night_hours, holiday_hours, gross_salary, billing_amount,
                   total_company_cost, gross_profit, profit_margin,
                   paid_leave_days, paid_leave_amount
            FROM payroll_records
            WHERE employee_id = ?
            ORDER BY period DESC
            LIMIT ?
        """,
            (employee_id, months),
        )

        history = []
        for row in self.cursor.fetchall():
            history.append(
                {
                    "period": row[0],
                    "work_hours": row[1],
                    "overtime_hours": row[2],
                    "overtime_over_60h": row[3],
                    "night_hours": row[4],
                    "holiday_hours": row[5],
                    "gross_salary": row[6],
                    "billing_amount": row[7],
                    "cost": row[8],
                    "profit": row[9],
                    "margin": row[10],
                    "paid_leave_days": row[11],
                    "paid_leave_amount": row[12],
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
            """
            SELECT employee_id, name, hourly_rate, billing_rate, status
            FROM employees
            WHERE dispatch_company = ?
        """,
            (company,),
        )

        employees = []
        for row in self.cursor.fetchall():
            employees.append(
                {
                    "employee_id": row[0],
                    "name": row[1],
                    "hourly_rate": row[2],
                    "billing_rate": row[3],
                    "status": row[4],
                }
            )

        # Monthly aggregates
        self.cursor.execute(
            """
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
        """,
            (company,),
        )

        monthly_data = []
        for row in self.cursor.fetchall():
            monthly_data.append(
                {
                    "period": row[0],
                    "employee_count": row[1],
                    "revenue": row[2] or 0,
                    "cost": row[3] or 0,
                    "profit": row[4] or 0,
                    "margin": row[5] or 0,
                }
            )

        # Overall summary
        self.cursor.execute(
            """
            SELECT
                SUM(p.billing_amount) as total_revenue,
                SUM(p.total_company_cost) as total_cost,
                SUM(p.gross_profit) as total_profit,
                AVG(p.profit_margin) as avg_margin
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE e.dispatch_company = ?
        """,
            (company,),
        )

        totals = self.cursor.fetchone()

        return {
            "company": company,
            "employees": employees,
            "employee_count": len(employees),
            "monthly_data": monthly_data,
            "totals": {
                "revenue": totals[0] or 0,
                "cost": totals[1] or 0,
                "profit": totals[2] or 0,
                "avg_margin": totals[3] or 0,
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
            """
            INSERT INTO generated_reports (
                report_type, report_name, period, entity_type, entity_id,
                format, generated_by, file_size, parameters
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
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
            """
            SELECT id, report_type, report_name, period, format,
                   generated_by, file_size, created_at
            FROM generated_reports
            ORDER BY created_at DESC
            LIMIT ?
        """,
            (limit,),
        )

        return [
            {
                "id": row[0],
                "type": row[1],
                "name": row[2],
                "period": row[3],
                "format": row[4],
                "generated_by": row[5],
                "file_size": row[6],
                "created_at": row[7],
            }
            for row in self.cursor.fetchall()
        ]
