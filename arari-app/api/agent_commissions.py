"""
Agent Commissions Service - 仲介手数料管理
Calculates agent commissions based on employee nationality and attendance.

Main use case: 丸山さん commission for 加藤木材
- Vietnamese employees without absence/yukyu: ¥10,000
- Vietnamese employees with absence/yukyu: ¥5,000
- Other nationalities: ¥5,000 (always)
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


def _get_first_col(row):
    """Extract first column value from a database row"""
    if row is None:
        return None
    if isinstance(row, dict):
        return list(row.values())[0] if row else None
    return row[0]


# Predefined agent configurations
AGENT_CONFIGS = {
    "maruyama": {
        "name": "丸山さん",
        "display_name": "丸山さん (加藤木材)",
        "target_companies": ["加藤木材"],  # Matches companies containing this
        "rules": {
            "Vietnam": {
                "normal": 10000,  # No absence, no yukyu
                "reduced": 5000,  # Has absence or yukyu
            },
            "default": {
                "normal": 5000,  # Other nationalities - always this rate
                "reduced": 5000,
            },
        },
    }
}


def init_agent_commissions_tables(conn) -> None:
    """Initialize tables for agent commission tracking"""
    cursor = conn.cursor()

    # Table to store commission calculation history
    if USE_POSTGRES:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_commission_records (
                id SERIAL PRIMARY KEY,
                agent_id TEXT NOT NULL,
                period TEXT NOT NULL,
                dispatch_company TEXT NOT NULL,
                total_employees INTEGER DEFAULT 0,
                vietnam_normal INTEGER DEFAULT 0,
                vietnam_reduced INTEGER DEFAULT 0,
                other_count INTEGER DEFAULT 0,
                total_amount REAL DEFAULT 0,
                breakdown TEXT,
                notes TEXT,
                calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                registered_to_costs INTEGER DEFAULT 0,
                cost_id INTEGER,
                UNIQUE(agent_id, period, dispatch_company)
            )
        """)
    else:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agent_commission_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id TEXT NOT NULL,
                period TEXT NOT NULL,
                dispatch_company TEXT NOT NULL,
                total_employees INTEGER DEFAULT 0,
                vietnam_normal INTEGER DEFAULT 0,
                vietnam_reduced INTEGER DEFAULT 0,
                other_count INTEGER DEFAULT 0,
                total_amount REAL DEFAULT 0,
                breakdown TEXT,
                notes TEXT,
                calculated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                registered_to_costs INTEGER DEFAULT 0,
                cost_id INTEGER,
                UNIQUE(agent_id, period, dispatch_company)
            )
        """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_agent_commissions_period
        ON agent_commission_records(period)
    """)

    conn.commit()
    print("[OK] Agent commissions tables initialized")


class AgentCommissionService:
    """Service for calculating and managing agent commissions"""

    def __init__(self, db):
        self.db = db

    def get_available_agents(self) -> List[Dict[str, Any]]:
        """Get list of configured agents"""
        return [
            {
                "id": agent_id,
                "name": config["name"],
                "display_name": config["display_name"],
                "target_companies": config["target_companies"],
            }
            for agent_id, config in AGENT_CONFIGS.items()
        ]

    def calculate_commission(
        self,
        agent_id: str,
        period: str,
        company_filter: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculate commission for an agent for a given period.

        Returns detailed breakdown of employees and amounts.
        """
        if agent_id not in AGENT_CONFIGS:
            return {"error": f"Unknown agent: {agent_id}"}

        config = AGENT_CONFIGS[agent_id]
        cursor = self.db.cursor()

        # Build company filter
        company_conditions = []
        for target in config["target_companies"]:
            company_conditions.append(f"e.dispatch_company LIKE '%{target}%'")

        if company_filter:
            company_conditions = [f"e.dispatch_company LIKE '%{company_filter}%'"]

        company_where = " OR ".join(company_conditions)

        # Query employees with payroll data for the period
        query = _q(f"""
            SELECT
                e.employee_id,
                e.name,
                e.nationality,
                e.dispatch_company,
                COALESCE(p.paid_leave_days, 0) as paid_leave_days,
                COALESCE(p.absence_days, 0) as absence_days,
                COALESCE(p.work_days, 0) as work_days
            FROM employees e
            LEFT JOIN payroll_records p ON e.employee_id = p.employee_id AND p.period = ?
            WHERE ({company_where})
            AND e.status = 'active'
            AND p.employee_id IS NOT NULL
            ORDER BY e.dispatch_company, e.nationality, e.name
        """)

        cursor.execute(query, (period,))
        rows = cursor.fetchall()

        # Process results
        results_by_company: Dict[str, Dict] = {}
        employee_details: List[Dict] = []

        for row in rows:
            if isinstance(row, dict):
                emp_id = row.get("employee_id")
                name = row.get("name")
                nationality = row.get("nationality")
                company = row.get("dispatch_company")
                paid_leave = row.get("paid_leave_days", 0) or 0
                absence = row.get("absence_days", 0) or 0
                work_days = row.get("work_days", 0) or 0
            else:
                emp_id, name, nationality, company, paid_leave, absence, work_days = row
                paid_leave = paid_leave or 0
                absence = absence or 0
                work_days = work_days or 0

            # Determine if employee has reduced rate condition
            has_absence_or_yukyu = (paid_leave > 0) or (absence > 0)

            # Determine rate based on nationality
            is_vietnamese = nationality and nationality.lower() == "vietnam"

            if is_vietnamese:
                if has_absence_or_yukyu:
                    rate = config["rules"]["Vietnam"]["reduced"]
                    category = "vietnam_reduced"
                else:
                    rate = config["rules"]["Vietnam"]["normal"]
                    category = "vietnam_normal"
            else:
                rate = config["rules"]["default"]["normal"]
                category = "other"

            # Initialize company in results
            if company not in results_by_company:
                results_by_company[company] = {
                    "company": company,
                    "vietnam_normal": {"count": 0, "amount": 0, "employees": []},
                    "vietnam_reduced": {"count": 0, "amount": 0, "employees": []},
                    "other": {"count": 0, "amount": 0, "employees": []},
                    "total_employees": 0,
                    "total_amount": 0,
                }

            # Add employee to category
            employee_info = {
                "employee_id": emp_id,
                "name": name,
                "nationality": nationality or "不明",
                "paid_leave_days": paid_leave,
                "absence_days": absence,
                "work_days": work_days,
                "rate": rate,
                "category": category,
            }

            results_by_company[company][category]["count"] += 1
            results_by_company[company][category]["amount"] += rate
            results_by_company[company][category]["employees"].append(employee_info)
            results_by_company[company]["total_employees"] += 1
            results_by_company[company]["total_amount"] += rate

            employee_details.append({
                **employee_info,
                "company": company,
            })

        # Calculate grand total
        grand_total = sum(c["total_amount"] for c in results_by_company.values())
        total_employees = sum(c["total_employees"] for c in results_by_company.values())

        return {
            "agent_id": agent_id,
            "agent_name": config["name"],
            "period": period,
            "companies": list(results_by_company.values()),
            "employees": employee_details,
            "summary": {
                "total_employees": total_employees,
                "vietnam_normal": sum(c["vietnam_normal"]["count"] for c in results_by_company.values()),
                "vietnam_reduced": sum(c["vietnam_reduced"]["count"] for c in results_by_company.values()),
                "other": sum(c["other"]["count"] for c in results_by_company.values()),
                "total_amount": grand_total,
            },
            "rules": {
                "vietnam_normal_rate": config["rules"]["Vietnam"]["normal"],
                "vietnam_reduced_rate": config["rules"]["Vietnam"]["reduced"],
                "other_rate": config["rules"]["default"]["normal"],
            },
        }

    def register_to_additional_costs(
        self,
        agent_id: str,
        period: str,
        company: str,
        amount: float,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Register calculated commission to additional_costs table.
        Creates a cost entry and records it in commission history.
        """
        from additional_costs import AdditionalCostsService

        cursor = self.db.cursor()
        cost_service = AdditionalCostsService(self.db)

        # Create the additional cost entry
        config = AGENT_CONFIGS.get(agent_id, {})
        agent_name = config.get("name", agent_id)

        result = cost_service.create_cost(
            dispatch_company=company,
            period=period,
            cost_type="other",  # Agent commission is "other" type
            amount=amount,
            notes=notes or f"{agent_name} 仲介手数料",
            created_by="system",
        )

        if "error" in result:
            return result

        cost_id = result.get("id")

        # Record in commission history
        try:
            cursor.execute(
                _q("""
                INSERT OR REPLACE INTO agent_commission_records
                (agent_id, period, dispatch_company, total_amount, registered_to_costs, cost_id, calculated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?)
            """),
                (agent_id, period, company, amount, cost_id, datetime.now().isoformat()),
            )
            self.db.commit()
        except Exception as e:
            print(f"Warning: Could not record commission history: {e}")

        return {
            "status": "registered",
            "cost_id": cost_id,
            "agent_id": agent_id,
            "period": period,
            "company": company,
            "amount": amount,
        }

    def get_commission_history(
        self,
        agent_id: Optional[str] = None,
        period: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get history of registered commissions"""
        cursor = self.db.cursor()

        query = "SELECT * FROM agent_commission_records WHERE 1=1"
        params = []

        if agent_id:
            query += " AND agent_id = ?"
            params.append(agent_id)
        if period:
            query += " AND period = ?"
            params.append(period)

        query += " ORDER BY calculated_at DESC"

        cursor.execute(_q(query), tuple(params))

        results = []
        keys = [
            "id", "agent_id", "period", "dispatch_company", "total_employees",
            "vietnam_normal", "vietnam_reduced", "other_count", "total_amount",
            "breakdown", "notes", "calculated_at", "registered_to_costs", "cost_id"
        ]

        for row in cursor.fetchall():
            if isinstance(row, dict):
                results.append(dict(row))
            else:
                results.append({keys[i]: row[i] for i in range(len(keys))})

        return results

    def is_already_registered(self, agent_id: str, period: str, company: str) -> bool:
        """Check if commission is already registered for this agent/period/company"""
        cursor = self.db.cursor()
        cursor.execute(
            _q("""
            SELECT registered_to_costs FROM agent_commission_records
            WHERE agent_id = ? AND period = ? AND dispatch_company = ?
        """),
            (agent_id, period, company),
        )
        row = cursor.fetchone()
        if row:
            val = row.get("registered_to_costs") if isinstance(row, dict) else row[0]
            return val == 1
        return False
