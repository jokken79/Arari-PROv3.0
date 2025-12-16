"""
SearchAgent - Advanced Search System
Full-text and filtered search for 粗利 PRO
"""

import sqlite3
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class SearchFilter:
    field: str
    operator: str  # eq, ne, gt, gte, lt, lte, like, in, between
    value: Any
    value2: Any = None  # For 'between' operator


class SearchService:
    """Service for advanced search"""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cursor = conn.cursor()

    def search_employees(
        self,
        query: str = None,
        filters: List[Dict] = None,
        sort_by: str = None,
        sort_order: str = "asc",
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """Advanced employee search"""
        sql = """
            SELECT e.*,
                   (SELECT AVG(profit_margin) FROM payroll_records WHERE employee_id = e.employee_id) as avg_margin,
                   (SELECT COUNT(*) FROM payroll_records WHERE employee_id = e.employee_id) as record_count
            FROM employees e
            WHERE 1=1
        """
        params = []

        # Text search
        if query:
            sql += """
                AND (
                    e.employee_id LIKE ? OR
                    e.name LIKE ? OR
                    e.name_kana LIKE ? OR
                    e.dispatch_company LIKE ?
                )
            """
            search_term = f"%{query}%"
            params.extend([search_term] * 4)

        # Apply filters
        if filters:
            for f in filters:
                field = f.get("field")
                operator = f.get("operator", "eq")
                value = f.get("value")
                value2 = f.get("value2")

                # Validate field name (prevent SQL injection)
                allowed_fields = [
                    "employee_id",
                    "name",
                    "dispatch_company",
                    "status",
                    "hourly_rate",
                    "billing_rate",
                    "hire_date",
                ]
                if field not in allowed_fields:
                    continue

                if operator == "eq":
                    sql += f" AND e.{field} = ?"
                    params.append(value)
                elif operator == "ne":
                    sql += f" AND e.{field} != ?"
                    params.append(value)
                elif operator == "gt":
                    sql += f" AND e.{field} > ?"
                    params.append(value)
                elif operator == "gte":
                    sql += f" AND e.{field} >= ?"
                    params.append(value)
                elif operator == "lt":
                    sql += f" AND e.{field} < ?"
                    params.append(value)
                elif operator == "lte":
                    sql += f" AND e.{field} <= ?"
                    params.append(value)
                elif operator == "like":
                    sql += f" AND e.{field} LIKE ?"
                    params.append(f"%{value}%")
                elif operator == "in" and isinstance(value, list):
                    placeholders = ",".join(["?"] * len(value))
                    sql += f" AND e.{field} IN ({placeholders})"
                    params.extend(value)
                elif operator == "between" and value2 is not None:
                    sql += f" AND e.{field} BETWEEN ? AND ?"
                    params.extend([value, value2])

        # Get total count before pagination
        count_sql = f"SELECT COUNT(*) FROM ({sql})"
        self.cursor.execute(count_sql, params)
        total_count = self.cursor.fetchone()[0]

        # Sorting
        sort_fields = {
            "employee_id": "e.employee_id",
            "name": "e.name",
            "company": "e.dispatch_company",
            "hourly_rate": "e.hourly_rate",
            "billing_rate": "e.billing_rate",
            "margin": "avg_margin",
            "status": "e.status",
        }

        if sort_by and sort_by in sort_fields:
            order = "DESC" if sort_order.lower() == "desc" else "ASC"
            sql += f" ORDER BY {sort_fields[sort_by]} {order}"
        else:
            sql += " ORDER BY e.employee_id"

        # Pagination - Use parameterized queries to prevent SQL injection
        # Validate bounds to prevent DoS via huge LIMIT values
        page = max(1, min(page, 10000))  # Cap page at 10000
        page_size = max(1, min(page_size, 500))  # Cap page_size at 500
        offset = (page - 1) * page_size
        sql += " LIMIT ? OFFSET ?"
        params.extend([page_size, offset])

        self.cursor.execute(sql, params)
        columns = [desc[0] for desc in self.cursor.description]
        results = [dict(zip(columns, row)) for row in self.cursor.fetchall()]

        return {
            "results": results,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size,
        }

    def search_payroll(
        self,
        query: str = None,
        filters: List[Dict] = None,
        sort_by: str = None,
        sort_order: str = "asc",
        page: int = 1,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """Advanced payroll search"""
        sql = """
            SELECT p.*, e.name as employee_name, e.dispatch_company
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE 1=1
        """
        params = []

        # Text search
        if query:
            sql += """
                AND (
                    p.employee_id LIKE ? OR
                    e.name LIKE ? OR
                    p.period LIKE ?
                )
            """
            search_term = f"%{query}%"
            params.extend([search_term] * 3)

        # Apply filters
        if filters:
            for f in filters:
                field = f.get("field")
                operator = f.get("operator", "eq")
                value = f.get("value")
                value2 = f.get("value2")

                # Validate and map field names
                field_map = {
                    "period": "p.period",
                    "employee_id": "p.employee_id",
                    "company": "e.dispatch_company",
                    "margin": "p.profit_margin",
                    "profit": "p.gross_profit",
                    "revenue": "p.billing_amount",
                    "cost": "p.total_company_cost",
                    "work_hours": "p.work_hours",
                    "overtime": "p.overtime_hours",
                }

                if field not in field_map:
                    continue

                db_field = field_map[field]

                if operator == "eq":
                    sql += f" AND {db_field} = ?"
                    params.append(value)
                elif operator == "ne":
                    sql += f" AND {db_field} != ?"
                    params.append(value)
                elif operator == "gt":
                    sql += f" AND {db_field} > ?"
                    params.append(value)
                elif operator == "gte":
                    sql += f" AND {db_field} >= ?"
                    params.append(value)
                elif operator == "lt":
                    sql += f" AND {db_field} < ?"
                    params.append(value)
                elif operator == "lte":
                    sql += f" AND {db_field} <= ?"
                    params.append(value)
                elif operator == "like":
                    sql += f" AND {db_field} LIKE ?"
                    params.append(f"%{value}%")
                elif operator == "in" and isinstance(value, list):
                    placeholders = ",".join(["?"] * len(value))
                    sql += f" AND {db_field} IN ({placeholders})"
                    params.extend(value)
                elif operator == "between" and value2 is not None:
                    sql += f" AND {db_field} BETWEEN ? AND ?"
                    params.extend([value, value2])

        # Get total count
        count_sql = f"SELECT COUNT(*) FROM ({sql})"
        self.cursor.execute(count_sql, params)
        total_count = self.cursor.fetchone()[0]

        # Sorting
        sort_fields = {
            "period": "p.period",
            "employee": "e.name",
            "company": "e.dispatch_company",
            "margin": "p.profit_margin",
            "profit": "p.gross_profit",
            "revenue": "p.billing_amount",
        }

        if sort_by and sort_by in sort_fields:
            order = "DESC" if sort_order.lower() == "desc" else "ASC"
            sql += f" ORDER BY {sort_fields[sort_by]} {order}"
        else:
            sql += " ORDER BY p.period DESC, p.employee_id"

        # Pagination - Use parameterized queries to prevent SQL injection
        # Validate bounds to prevent DoS via huge LIMIT values
        page = max(1, min(page, 10000))  # Cap page at 10000
        page_size = max(1, min(page_size, 500))  # Cap page_size at 500
        offset = (page - 1) * page_size
        sql += " LIMIT ? OFFSET ?"
        params.extend([page_size, offset])

        self.cursor.execute(sql, params)
        columns = [desc[0] for desc in self.cursor.description]
        results = [dict(zip(columns, row)) for row in self.cursor.fetchall()]

        return {
            "results": results,
            "total": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size,
        }

    def search_by_margin_range(
        self, min_margin: float = None, max_margin: float = None, period: str = None
    ) -> List[Dict[str, Any]]:
        """Find employees by margin range"""
        sql = """
            SELECT p.*, e.name, e.dispatch_company
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE 1=1
        """
        params = []

        if min_margin is not None:
            sql += " AND p.profit_margin >= ?"
            params.append(min_margin)

        if max_margin is not None:
            sql += " AND p.profit_margin <= ?"
            params.append(max_margin)

        if period:
            sql += " AND p.period = ?"
            params.append(period)

        sql += " ORDER BY p.profit_margin ASC"

        self.cursor.execute(sql, params)
        columns = [desc[0] for desc in self.cursor.description]

        return [dict(zip(columns, row)) for row in self.cursor.fetchall()]

    def find_anomalies(self, period: str = None) -> Dict[str, Any]:
        """Find data anomalies"""
        anomalies = {
            "negative_margin": [],
            "high_margin": [],
            "excessive_hours": [],
            "missing_billing": [],
            "zero_salary": [],
        }

        base_where = "WHERE 1=1"
        params = []
        if period:
            base_where += " AND p.period = ?"
            params.append(period)

        # Negative margin
        self.cursor.execute(
            f"""
            SELECT p.employee_id, p.period, p.profit_margin, e.name
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            {base_where} AND p.profit_margin < 0
        """,
            params,
        )
        anomalies["negative_margin"] = [
            {"employee_id": r[0], "period": r[1], "margin": r[2], "name": r[3]}
            for r in self.cursor.fetchall()
        ]

        # High margin (>40%)
        self.cursor.execute(
            f"""
            SELECT p.employee_id, p.period, p.profit_margin, e.name
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            {base_where} AND p.profit_margin > 40
        """,
            params,
        )
        anomalies["high_margin"] = [
            {"employee_id": r[0], "period": r[1], "margin": r[2], "name": r[3]}
            for r in self.cursor.fetchall()
        ]

        # Excessive hours (>250)
        self.cursor.execute(
            f"""
            SELECT p.employee_id, p.period, p.work_hours, e.name
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            {base_where} AND p.work_hours > 250
        """,
            params,
        )
        anomalies["excessive_hours"] = [
            {"employee_id": r[0], "period": r[1], "hours": r[2], "name": r[3]}
            for r in self.cursor.fetchall()
        ]

        # Missing billing
        self.cursor.execute(
            f"""
            SELECT p.employee_id, p.period, p.billing_amount, e.name
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            {base_where} AND (p.billing_amount IS NULL OR p.billing_amount = 0)
            AND p.work_hours > 0
        """,
            params,
        )
        anomalies["missing_billing"] = [
            {"employee_id": r[0], "period": r[1], "billing": r[2], "name": r[3]}
            for r in self.cursor.fetchall()
        ]

        # Zero salary with hours
        self.cursor.execute(
            f"""
            SELECT p.employee_id, p.period, p.gross_salary, e.name
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            {base_where} AND (p.gross_salary IS NULL OR p.gross_salary = 0)
            AND p.work_hours > 0
        """,
            params,
        )
        anomalies["zero_salary"] = [
            {"employee_id": r[0], "period": r[1], "salary": r[2], "name": r[3]}
            for r in self.cursor.fetchall()
        ]

        # Count totals
        total_anomalies = sum(len(v) for v in anomalies.values())

        return {
            "anomalies": anomalies,
            "total_count": total_anomalies,
            "period": period,
        }

    def get_search_suggestions(
        self, query: str, field: str = "all", limit: int = 10
    ) -> List[str]:
        """Get search suggestions based on existing data"""
        suggestions = set()

        if not query or len(query) < 2:
            return []

        search_term = f"%{query}%"

        if field in ["all", "employee"]:
            self.cursor.execute(
                """
                SELECT DISTINCT name FROM employees WHERE name LIKE ? LIMIT ?
            """,
                (search_term, limit),
            )
            suggestions.update(r[0] for r in self.cursor.fetchall())

        if field in ["all", "company"]:
            self.cursor.execute(
                """
                SELECT DISTINCT dispatch_company FROM employees WHERE dispatch_company LIKE ? LIMIT ?
            """,
                (search_term, limit),
            )
            suggestions.update(r[0] for r in self.cursor.fetchall())

        if field in ["all", "id"]:
            self.cursor.execute(
                """
                SELECT DISTINCT employee_id FROM employees WHERE employee_id LIKE ? LIMIT ?
            """,
                (search_term, limit),
            )
            suggestions.update(r[0] for r in self.cursor.fetchall())

        return sorted(list(suggestions))[:limit]

    def get_filter_options(self) -> Dict[str, Any]:
        """Get available filter options"""

        # Companies
        self.cursor.execute(
            "SELECT DISTINCT dispatch_company FROM employees ORDER BY dispatch_company"
        )
        companies = [r[0] for r in self.cursor.fetchall()]

        # Periods
        self.cursor.execute(
            "SELECT DISTINCT period FROM payroll_records ORDER BY period DESC"
        )
        periods = [r[0] for r in self.cursor.fetchall()]

        # Statuses
        self.cursor.execute("SELECT DISTINCT status FROM employees")
        statuses = [r[0] for r in self.cursor.fetchall()]

        # Margin ranges
        self.cursor.execute(
            """
            SELECT MIN(profit_margin), MAX(profit_margin), AVG(profit_margin)
            FROM payroll_records WHERE profit_margin IS NOT NULL
        """
        )
        margin_stats = self.cursor.fetchone()

        return {
            "companies": companies,
            "periods": periods,
            "statuses": statuses,
            "margin_range": {
                "min": margin_stats[0],
                "max": margin_stats[1],
                "avg": margin_stats[2],
            },
        }
