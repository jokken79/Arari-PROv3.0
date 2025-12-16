"""
BudgetAgent - Budget Management System
Track budgets vs actual performance
"""

import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional


def init_budget_tables(conn: sqlite3.Connection):
    """Initialize budget tables"""
    cursor = conn.cursor()

    # Budgets table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            budget_revenue REAL DEFAULT 0,
            budget_cost REAL DEFAULT 0,
            budget_profit REAL DEFAULT 0,
            budget_margin REAL DEFAULT 0,
            notes TEXT,
            created_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(period, entity_type, entity_id)
        )
    """
    )

    # Budget history for tracking changes
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS budget_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            budget_id INTEGER NOT NULL,
            field_changed TEXT NOT NULL,
            old_value REAL,
            new_value REAL,
            changed_by TEXT,
            changed_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (budget_id) REFERENCES budgets(id)
        )
    """
    )

    # Create indexes
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_budgets_period
        ON budgets(period)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_budgets_entity
        ON budgets(entity_type, entity_id)
    """
    )

    conn.commit()


class BudgetService:
    """Service for budget management"""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cursor = conn.cursor()

    def create_budget(
        self,
        period: str,
        entity_type: str = "total",
        entity_id: str = None,
        budget_revenue: float = 0,
        budget_cost: float = 0,
        budget_profit: float = None,
        budget_margin: float = None,
        notes: str = None,
        created_by: str = None,
    ) -> Dict[str, Any]:
        """Create a new budget"""

        # Calculate profit if not provided
        if budget_profit is None:
            budget_profit = budget_revenue - budget_cost

        # Calculate margin if not provided
        if budget_margin is None and budget_revenue > 0:
            budget_margin = (budget_profit / budget_revenue) * 100

        try:
            self.cursor.execute(
                """
                INSERT INTO budgets (
                    period, entity_type, entity_id, budget_revenue,
                    budget_cost, budget_profit, budget_margin, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    period,
                    entity_type,
                    entity_id,
                    budget_revenue,
                    budget_cost,
                    budget_profit,
                    budget_margin,
                    notes,
                    created_by,
                ),
            )
            self.conn.commit()

            return {
                "id": self.cursor.lastrowid,
                "period": period,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "budget_revenue": budget_revenue,
                "budget_cost": budget_cost,
                "budget_profit": budget_profit,
                "budget_margin": budget_margin,
            }

        except sqlite3.IntegrityError:
            return {"error": "Budget already exists for this period/entity"}

    def update_budget(self, budget_id: int, **kwargs) -> Dict[str, Any]:
        """Update a budget"""
        allowed_fields = [
            "budget_revenue",
            "budget_cost",
            "budget_profit",
            "budget_margin",
            "notes",
        ]
        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

        if not updates:
            return {"error": "No valid fields to update"}

        # Get current values for history
        self.cursor.execute("SELECT * FROM budgets WHERE id = ?", (budget_id,))
        current = self.cursor.fetchone()
        if not current:
            return {"error": "Budget not found"}

        columns = [desc[0] for desc in self.cursor.description]
        current_dict = dict(zip(columns, current))

        # Log changes
        changed_by = kwargs.get("changed_by")
        for field, new_value in updates.items():
            old_value = current_dict.get(field)
            if old_value != new_value:
                self.cursor.execute(
                    """
                    INSERT INTO budget_history (budget_id, field_changed, old_value, new_value, changed_by)
                    VALUES (?, ?, ?, ?, ?)
                """,
                    (budget_id, field, old_value, new_value, changed_by),
                )

        # Update budget
        set_clause = ", ".join(f"{k} = ?" for k in updates.keys())
        values = list(updates.values()) + [budget_id]

        self.cursor.execute(
            f"""
            UPDATE budgets SET {set_clause}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """,
            values,
        )
        self.conn.commit()

        return {"status": "updated", "budget_id": budget_id}

    def get_budget(
        self, period: str, entity_type: str = "total", entity_id: str = None
    ) -> Optional[Dict[str, Any]]:
        """Get budget for a specific period/entity"""
        self.cursor.execute(
            """
            SELECT * FROM budgets
            WHERE period = ? AND entity_type = ? AND (entity_id = ? OR (entity_id IS NULL AND ? IS NULL))
        """,
            (period, entity_type, entity_id, entity_id),
        )

        row = self.cursor.fetchone()
        if not row:
            return None

        columns = [desc[0] for desc in self.cursor.description]
        return dict(zip(columns, row))

    def get_budgets(
        self, period: str = None, entity_type: str = None
    ) -> List[Dict[str, Any]]:
        """Get all budgets with optional filtering"""
        query = "SELECT * FROM budgets WHERE 1=1"
        params = []

        if period:
            query += " AND period = ?"
            params.append(period)

        if entity_type:
            query += " AND entity_type = ?"
            params.append(entity_type)

        query += " ORDER BY period DESC, entity_type"

        self.cursor.execute(query, params)
        columns = [desc[0] for desc in self.cursor.description]

        return [dict(zip(columns, row)) for row in self.cursor.fetchall()]

    def compare_budget_vs_actual(
        self, period: str, entity_type: str = "total", entity_id: str = None
    ) -> Dict[str, Any]:
        """Compare budget vs actual performance"""

        # Get budget
        budget = self.get_budget(period, entity_type, entity_id)
        if not budget:
            return {"error": "No budget found for this period/entity"}

        # Get actual data
        if entity_type == "total":
            self.cursor.execute(
                """
                SELECT
                    SUM(billing_amount) as actual_revenue,
                    SUM(total_company_cost) as actual_cost,
                    SUM(gross_profit) as actual_profit,
                    AVG(profit_margin) as actual_margin
                FROM payroll_records
                WHERE period = ?
            """,
                (period,),
            )
        elif entity_type == "company":
            self.cursor.execute(
                """
                SELECT
                    SUM(p.billing_amount) as actual_revenue,
                    SUM(p.total_company_cost) as actual_cost,
                    SUM(p.gross_profit) as actual_profit,
                    AVG(p.profit_margin) as actual_margin
                FROM payroll_records p
                JOIN employees e ON p.employee_id = e.employee_id
                WHERE p.period = ? AND e.dispatch_company = ?
            """,
                (period, entity_id),
            )
        elif entity_type == "employee":
            self.cursor.execute(
                """
                SELECT
                    billing_amount as actual_revenue,
                    total_company_cost as actual_cost,
                    gross_profit as actual_profit,
                    profit_margin as actual_margin
                FROM payroll_records
                WHERE period = ? AND employee_id = ?
            """,
                (period, entity_id),
            )
        else:
            return {"error": f"Unknown entity_type: {entity_type}"}

        actual = self.cursor.fetchone()
        if not actual or actual[0] is None:
            return {
                "budget": budget,
                "actual": None,
                "variance": None,
                "message": "No actual data found for this period",
            }

        actual_revenue, actual_cost, actual_profit, actual_margin = actual

        # Calculate variances
        variance_revenue = actual_revenue - budget["budget_revenue"]
        variance_cost = actual_cost - budget["budget_cost"]
        variance_profit = actual_profit - budget["budget_profit"]
        variance_margin = (
            actual_margin - budget["budget_margin"] if actual_margin else None
        )

        # Calculate percentages
        pct_revenue = (
            (variance_revenue / budget["budget_revenue"] * 100)
            if budget["budget_revenue"]
            else None
        )
        pct_cost = (
            (variance_cost / budget["budget_cost"] * 100)
            if budget["budget_cost"]
            else None
        )
        pct_profit = (
            (variance_profit / budget["budget_profit"] * 100)
            if budget["budget_profit"]
            else None
        )

        return {
            "period": period,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "budget": {
                "revenue": budget["budget_revenue"],
                "cost": budget["budget_cost"],
                "profit": budget["budget_profit"],
                "margin": budget["budget_margin"],
            },
            "actual": {
                "revenue": actual_revenue,
                "cost": actual_cost,
                "profit": actual_profit,
                "margin": actual_margin,
            },
            "variance": {
                "revenue": variance_revenue,
                "cost": variance_cost,
                "profit": variance_profit,
                "margin": variance_margin,
            },
            "variance_pct": {
                "revenue": pct_revenue,
                "cost": pct_cost,
                "profit": pct_profit,
            },
            "status": "over_budget" if variance_profit < 0 else "on_track",
        }

    def get_budget_summary(self, year: int = None) -> Dict[str, Any]:
        """Get budget summary for a year"""
        if year is None:
            year = datetime.now().year

        # Get all periods for the year
        self.cursor.execute(
            """
            SELECT DISTINCT period FROM budgets
            WHERE period LIKE ?
            ORDER BY period
        """,
            (f"{year}年%",),
        )

        periods = [row[0] for row in self.cursor.fetchall()]

        comparisons = []
        total_budget_profit = 0
        total_actual_profit = 0

        for period in periods:
            comparison = self.compare_budget_vs_actual(period)
            if "error" not in comparison and comparison.get("actual"):
                comparisons.append(comparison)
                total_budget_profit += comparison["budget"]["profit"]
                total_actual_profit += comparison["actual"]["profit"]

        return {
            "year": year,
            "periods_count": len(periods),
            "comparisons_count": len(comparisons),
            "total_budget_profit": total_budget_profit,
            "total_actual_profit": total_actual_profit,
            "total_variance": total_actual_profit - total_budget_profit,
            "overall_status": (
                "over_budget"
                if total_actual_profit < total_budget_profit
                else "on_track"
            ),
            "comparisons": comparisons,
        }

    def delete_budget(self, budget_id: int) -> Dict[str, Any]:
        """Delete a budget"""
        # Delete history first
        self.cursor.execute(
            "DELETE FROM budget_history WHERE budget_id = ?", (budget_id,)
        )
        self.cursor.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))
        self.conn.commit()

        if self.cursor.rowcount == 0:
            return {"error": "Budget not found"}

        return {"status": "deleted"}

    def copy_budget_to_period(
        self, source_period: str, target_period: str, adjustment_pct: float = 0
    ) -> Dict[str, Any]:
        """Copy budgets from one period to another with optional adjustment"""
        self.cursor.execute(
            """
            SELECT entity_type, entity_id, budget_revenue, budget_cost,
                   budget_profit, budget_margin, notes
            FROM budgets WHERE period = ?
        """,
            (source_period,),
        )

        copied = 0
        for row in self.cursor.fetchall():
            entity_type, entity_id, revenue, cost, profit, margin, notes = row

            # Apply adjustment
            if adjustment_pct != 0:
                multiplier = 1 + (adjustment_pct / 100)
                revenue *= multiplier
                cost *= multiplier
                profit = revenue - cost
                if revenue > 0:
                    margin = (profit / revenue) * 100

            result = self.create_budget(
                period=target_period,
                entity_type=entity_type,
                entity_id=entity_id,
                budget_revenue=revenue,
                budget_cost=cost,
                budget_profit=profit,
                budget_margin=margin,
                notes=f"Copied from {source_period}"
                + (f" with {adjustment_pct}% adjustment" if adjustment_pct else ""),
            )

            if "id" in result:
                copied += 1

        return {
            "source_period": source_period,
            "target_period": target_period,
            "budgets_copied": copied,
            "adjustment_pct": adjustment_pct,
        }
