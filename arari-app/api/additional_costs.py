"""
Additional Costs Service - Company-specific additional costs management
Tracks costs like transport buses (送迎バス) per company per period

These costs are subtracted from company profit calculations.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

# Check if using PostgreSQL
try:
    from database import USE_POSTGRES
except ImportError:
    USE_POSTGRES = False


def _q(query: str) -> str:
    """Convert SQLite ? placeholders to PostgreSQL %s if needed"""
    if USE_POSTGRES:
        return query.replace("?", "%s")
    return query


# Predefined cost types with Japanese labels
COST_TYPES = {
    "transport_bus": "送迎バス",
    "parking": "駐車場代",
    "facility": "施設利用費",
    "equipment": "設備費",
    "uniform": "ユニフォーム",
    "training": "研修費",
    "meal": "食事補助",
    "other": "その他",
}


def init_additional_costs_tables(conn) -> None:
    """Initialize the additional costs table"""
    cursor = conn.cursor()

    # Create main table
    if USE_POSTGRES:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS company_additional_costs (
                id SERIAL PRIMARY KEY,
                dispatch_company TEXT NOT NULL,
                period TEXT NOT NULL,
                cost_type TEXT NOT NULL,
                amount REAL NOT NULL DEFAULT 0,
                notes TEXT,
                created_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(dispatch_company, period, cost_type)
            )
        """)
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS company_additional_costs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dispatch_company TEXT NOT NULL,
                period TEXT NOT NULL,
                cost_type TEXT NOT NULL,
                amount REAL NOT NULL DEFAULT 0,
                notes TEXT,
                created_by TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(dispatch_company, period, cost_type)
            )
        """)

    # Create index for fast lookups
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_additional_costs_company_period
        ON company_additional_costs(dispatch_company, period)
    """)

    conn.commit()
    print("[OK] Additional costs table initialized")


class AdditionalCostsService:
    """Service for managing company-specific additional costs"""

    def __init__(self, db):
        self.db = db

    def _row_to_dict(self, row, keys: List[str]) -> Dict[str, Any]:
        """Convert a database row to dictionary"""
        if row is None:
            return {}
        if isinstance(row, dict):
            return dict(row)
        return {keys[i]: row[i] for i in range(len(keys))}

    def create_cost(
        self,
        dispatch_company: str,
        period: str,
        cost_type: str,
        amount: float,
        notes: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Create a new additional cost entry"""
        cursor = self.db.cursor()
        now = datetime.now().isoformat()

        try:
            if USE_POSTGRES:
                # Use RETURNING clause for atomic ID retrieval in PostgreSQL
                cursor.execute(
                    """
                    INSERT INTO company_additional_costs
                    (dispatch_company, period, cost_type, amount, notes, created_by, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """,
                    (dispatch_company, period, cost_type, amount, notes, created_by, now, now),
                )
                result = cursor.fetchone()
                cost_id = result["id"] if isinstance(result, dict) else result[0]
            else:
                cursor.execute(
                    """
                    INSERT INTO company_additional_costs
                    (dispatch_company, period, cost_type, amount, notes, created_by, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                    (dispatch_company, period, cost_type, amount, notes, created_by, now, now),
                )
                cursor.execute("SELECT last_insert_rowid()")
                cost_id = cursor.fetchone()[0]

            self.db.commit()

            return {
                "id": cost_id,
                "dispatch_company": dispatch_company,
                "period": period,
                "cost_type": cost_type,
                "cost_type_label": COST_TYPES.get(cost_type, cost_type),
                "amount": amount,
                "notes": notes,
                "created_by": created_by,
                "created_at": now,
                "updated_at": now,
            }
        except Exception as e:
            if "UNIQUE constraint" in str(e) or "duplicate key" in str(e).lower():
                return {"error": "この企業・期間・コストタイプの組み合わせは既に存在します"}
            raise e

    def update_cost(self, cost_id: int, **kwargs) -> Dict[str, Any]:
        """Update an existing cost entry"""
        cursor = self.db.cursor()

        # Build update query dynamically
        updates = []
        values = []
        for key in ["cost_type", "amount", "notes"]:
            if key in kwargs and kwargs[key] is not None:
                updates.append(f"{key} = ?")
                values.append(kwargs[key])

        if not updates:
            return {"error": "No fields to update"}

        updates.append("updated_at = ?")
        values.append(datetime.now().isoformat())
        values.append(cost_id)

        cursor.execute(
            _q(f"""
            UPDATE company_additional_costs
            SET {', '.join(updates)}
            WHERE id = ?
        """),
            tuple(values),
        )
        self.db.commit()

        if cursor.rowcount == 0:
            return {"error": "Cost not found"}

        return self.get_cost(cost_id)

    def delete_cost(self, cost_id: int) -> Dict[str, Any]:
        """Delete a cost entry"""
        cursor = self.db.cursor()

        # Get the cost first for return value
        cost = self.get_cost(cost_id)
        if not cost:
            return {"error": "Cost not found"}

        cursor.execute(
            _q("DELETE FROM company_additional_costs WHERE id = ?"),
            (cost_id,),
        )
        self.db.commit()

        return {"status": "deleted", "deleted": cost}

    def get_cost(self, cost_id: int) -> Optional[Dict[str, Any]]:
        """Get a single cost by ID"""
        cursor = self.db.cursor()
        cursor.execute(
            _q("SELECT * FROM company_additional_costs WHERE id = ?"),
            (cost_id,),
        )
        row = cursor.fetchone()

        if not row:
            return None

        keys = [
            "id", "dispatch_company", "period", "cost_type", "amount",
            "notes", "created_by", "created_at", "updated_at"
        ]
        result = self._row_to_dict(row, keys)
        result["cost_type_label"] = COST_TYPES.get(result.get("cost_type", ""), result.get("cost_type", ""))
        return result

    def get_costs_by_company(
        self, company: str, period: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all costs for a specific company"""
        cursor = self.db.cursor()

        if period:
            cursor.execute(
                _q("""
                SELECT * FROM company_additional_costs
                WHERE dispatch_company = ? AND period = ?
                ORDER BY period DESC, cost_type
            """),
                (company, period),
            )
        else:
            cursor.execute(
                _q("""
                SELECT * FROM company_additional_costs
                WHERE dispatch_company = ?
                ORDER BY period DESC, cost_type
            """),
                (company,),
            )

        keys = [
            "id", "dispatch_company", "period", "cost_type", "amount",
            "notes", "created_by", "created_at", "updated_at"
        ]
        results = []
        for row in cursor.fetchall():
            item = self._row_to_dict(row, keys)
            item["cost_type_label"] = COST_TYPES.get(item.get("cost_type", ""), item.get("cost_type", ""))
            results.append(item)
        return results

    def get_costs_by_period(self, period: str) -> List[Dict[str, Any]]:
        """Get all costs for a specific period"""
        cursor = self.db.cursor()
        cursor.execute(
            _q("""
            SELECT * FROM company_additional_costs
            WHERE period = ?
            ORDER BY dispatch_company, cost_type
        """),
            (period,),
        )

        keys = [
            "id", "dispatch_company", "period", "cost_type", "amount",
            "notes", "created_by", "created_at", "updated_at"
        ]
        results = []
        for row in cursor.fetchall():
            item = self._row_to_dict(row, keys)
            item["cost_type_label"] = COST_TYPES.get(item.get("cost_type", ""), item.get("cost_type", ""))
            results.append(item)
        return results

    def get_total_costs_by_company(
        self, company: str, period: Optional[str] = None
    ) -> float:
        """Get total additional costs for a company (optionally for a specific period)"""
        cursor = self.db.cursor()

        if period:
            cursor.execute(
                _q("""
                SELECT COALESCE(SUM(amount), 0) as total
                FROM company_additional_costs
                WHERE dispatch_company = ? AND period = ?
            """),
                (company, period),
            )
        else:
            cursor.execute(
                _q("""
                SELECT COALESCE(SUM(amount), 0) as total
                FROM company_additional_costs
                WHERE dispatch_company = ?
            """),
                (company,),
            )

        row = cursor.fetchone()
        if row is None:
            return 0.0
        if isinstance(row, dict):
            return float(row.get("total", 0) or 0)
        return float(row[0] or 0)

    def get_all_costs(
        self,
        company: Optional[str] = None,
        period: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get all costs with optional filtering"""
        cursor = self.db.cursor()

        query = "SELECT * FROM company_additional_costs WHERE 1=1"
        params = []

        if company:
            query += " AND dispatch_company = ?"
            params.append(company)
        if period:
            query += " AND period = ?"
            params.append(period)

        query += " ORDER BY period DESC, dispatch_company, cost_type"

        cursor.execute(_q(query), tuple(params))

        keys = [
            "id", "dispatch_company", "period", "cost_type", "amount",
            "notes", "created_by", "created_at", "updated_at"
        ]
        results = []
        for row in cursor.fetchall():
            item = self._row_to_dict(row, keys)
            item["cost_type_label"] = COST_TYPES.get(item.get("cost_type", ""), item.get("cost_type", ""))
            results.append(item)
        return results

    def get_companies_with_costs(self, period: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get summary of costs grouped by company"""
        cursor = self.db.cursor()

        if period:
            cursor.execute(
                _q("""
                SELECT
                    dispatch_company,
                    COUNT(*) as cost_count,
                    SUM(amount) as total_amount
                FROM company_additional_costs
                WHERE period = ?
                GROUP BY dispatch_company
                ORDER BY total_amount DESC
            """),
                (period,),
            )
        else:
            cursor.execute(
                _q("""
                SELECT
                    dispatch_company,
                    COUNT(*) as cost_count,
                    SUM(amount) as total_amount
                FROM company_additional_costs
                GROUP BY dispatch_company
                ORDER BY total_amount DESC
            """)
            )

        results = []
        for row in cursor.fetchall():
            if isinstance(row, dict):
                results.append(dict(row))
            else:
                results.append({
                    "dispatch_company": row[0],
                    "cost_count": row[1],
                    "total_amount": row[2],
                })
        return results

    def copy_costs_to_period(
        self,
        source_period: str,
        target_period: str,
        company: Optional[str] = None,
        adjust_percent: float = 0,
    ) -> Dict[str, Any]:
        """Copy costs from one period to another with optional adjustment"""
        cursor = self.db.cursor()

        # Get source costs
        if company:
            cursor.execute(
                _q("""
                SELECT dispatch_company, cost_type, amount, notes
                FROM company_additional_costs
                WHERE period = ? AND dispatch_company = ?
            """),
                (source_period, company),
            )
        else:
            cursor.execute(
                _q("""
                SELECT dispatch_company, cost_type, amount, notes
                FROM company_additional_costs
                WHERE period = ?
            """),
                (source_period,),
            )

        rows = cursor.fetchall()
        copied = 0
        skipped = 0
        multiplier = 1 + (adjust_percent / 100)

        for row in rows:
            if isinstance(row, dict):
                dispatch_company = row["dispatch_company"]
                cost_type = row["cost_type"]
                amount = row["amount"]
                notes = row.get("notes", "")
            else:
                dispatch_company, cost_type, amount, notes = row

            adjusted_amount = amount * multiplier

            try:
                cursor.execute(
                    _q("""
                    INSERT INTO company_additional_costs
                    (dispatch_company, period, cost_type, amount, notes, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """),
                    (
                        dispatch_company,
                        target_period,
                        cost_type,
                        adjusted_amount,
                        notes,
                        datetime.now().isoformat(),
                        datetime.now().isoformat(),
                    ),
                )
                copied += 1
            except Exception:
                skipped += 1

        self.db.commit()

        return {
            "source_period": source_period,
            "target_period": target_period,
            "copied": copied,
            "skipped": skipped,
            "adjustment_percent": adjust_percent,
        }
