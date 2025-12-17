"""
AlertAgent - Alert & Notification System
Monitors data for anomalies and threshold violations
"""

import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional


class AlertSeverity(Enum):
    CRITICAL = "critical"  # Immediate action required
    WARNING = "warning"  # Attention needed
    INFO = "info"  # Informational


class AlertType(Enum):
    LOW_MARGIN = "low_margin"
    NEGATIVE_MARGIN = "negative_margin"
    EXCESSIVE_HOURS = "excessive_hours"
    MARGIN_DROP = "margin_drop"
    MISSING_DATA = "missing_data"
    ANOMALY = "anomaly"
    BUDGET_EXCEEDED = "budget_exceeded"
    CLIENT_UNDERPERFORMING = "client_underperforming"


@dataclass
class Alert:
    id: int
    alert_type: str
    severity: str
    title: str
    message: str
    entity_type: str  # 'employee', 'company', 'period'
    entity_id: str
    period: str
    value: float
    threshold: float
    is_resolved: bool
    resolved_at: Optional[str]
    created_at: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "alert_type": self.alert_type,
            "severity": self.severity,
            "title": self.title,
            "message": self.message,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "period": self.period,
            "value": self.value,
            "threshold": self.threshold,
            "is_resolved": self.is_resolved,
            "resolved_at": self.resolved_at,
            "created_at": self.created_at,
        }


# Default thresholds (configurable via settings)
DEFAULT_THRESHOLDS = {
    "margin_critical": 10.0,  # < 10% = critical
    "margin_warning": 15.0,  # < 15% = warning (target for 製造派遣)
    "margin_negative": 0.0,  # < 0% = critical (losing money)
    "hours_warning": 200,  # > 200h/month = warning
    "hours_critical": 250,  # > 250h/month = critical
    "overtime_warning": 60,  # > 60h overtime = warning
    "margin_change_warning": 5.0,  # ±5% change vs previous = warning
    "client_margin_warning": 12.0,  # Client avg margin < 12% = warning
}


def init_alerts_tables(conn: sqlite3.Connection):
    """Initialize alerts tables"""
    cursor = conn.cursor()

    # Alerts table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            period TEXT,
            value REAL,
            threshold REAL,
            is_resolved INTEGER DEFAULT 0,
            resolved_at TEXT,
            resolved_by TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Alert thresholds table (configurable per company/period)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS alert_thresholds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            threshold_key TEXT UNIQUE NOT NULL,
            value REAL NOT NULL,
            description TEXT,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Insert default thresholds
    for key, value in DEFAULT_THRESHOLDS.items():
        cursor.execute(
            """
            INSERT OR IGNORE INTO alert_thresholds (threshold_key, value, description)
            VALUES (?, ?, ?)
        """,
            (key, value, f"Default threshold for {key}"),
        )

    # Create indexes
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_alerts_severity
        ON alerts(severity, is_resolved)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_alerts_entity
        ON alerts(entity_type, entity_id)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_alerts_period
        ON alerts(period)
    """
    )

    conn.commit()


class AlertService:
    """Service for managing alerts"""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cursor = conn.cursor()
        self.thresholds = self._load_thresholds()

    def _load_thresholds(self) -> Dict[str, float]:
        """Load thresholds from database"""
        try:
            self.cursor.execute("SELECT threshold_key, value FROM alert_thresholds")
            return {row[0]: row[1] for row in self.cursor.fetchall()}
        except (sqlite3.Error, sqlite3.OperationalError):
            return DEFAULT_THRESHOLDS.copy()

    def update_threshold(self, key: str, value: float, description: str = None) -> bool:
        """Update a threshold value"""
        try:
            self.cursor.execute(
                """
                INSERT OR REPLACE INTO alert_thresholds (threshold_key, value, description, updated_at)
                VALUES (?, ?, COALESCE(?, (SELECT description FROM alert_thresholds WHERE threshold_key = ?)), CURRENT_TIMESTAMP)
            """,
                (key, value, description, key),
            )
            self.conn.commit()
            self.thresholds[key] = value
            return True
        except Exception as e:
            print(f"Error updating threshold: {e}")
            return False

    def create_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        message: str,
        entity_type: str,
        entity_id: str,
        period: str = None,
        value: float = None,
        threshold: float = None,
    ) -> int:
        """Create a new alert"""

        # Check if similar alert already exists and is not resolved
        self.cursor.execute(
            """
            SELECT id FROM alerts
            WHERE alert_type = ? AND entity_type = ? AND entity_id = ?
            AND period = ? AND is_resolved = 0
        """,
            (alert_type.value, entity_type, entity_id, period),
        )

        existing = self.cursor.fetchone()
        if existing:
            # Update existing alert instead of creating duplicate
            self.cursor.execute(
                """
                UPDATE alerts SET value = ?, threshold = ?, message = ?, created_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """,
                (value, threshold, message, existing[0]),
            )
            self.conn.commit()
            return existing[0]

        self.cursor.execute(
            """
            INSERT INTO alerts (alert_type, severity, title, message, entity_type, entity_id, period, value, threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                alert_type.value,
                severity.value,
                title,
                message,
                entity_type,
                entity_id,
                period,
                value,
                threshold,
            ),
        )
        self.conn.commit()

        return self.cursor.lastrowid

    def resolve_alert(
        self, alert_id: int, resolved_by: str = None, notes: str = None
    ) -> bool:
        """Mark an alert as resolved"""
        self.cursor.execute(
            """
            UPDATE alerts SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP,
            resolved_by = ?, notes = ?
            WHERE id = ?
        """,
            (resolved_by, notes, alert_id),
        )
        self.conn.commit()
        return self.cursor.rowcount > 0

    def get_alerts(
        self,
        severity: str = None,
        is_resolved: bool = None,
        entity_type: str = None,
        period: str = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Get alerts with optional filtering"""
        query = "SELECT * FROM alerts WHERE 1=1"
        params = []

        if severity:
            query += " AND severity = ?"
            params.append(severity)

        if is_resolved is not None:
            query += " AND is_resolved = ?"
            params.append(1 if is_resolved else 0)

        if entity_type:
            query += " AND entity_type = ?"
            params.append(entity_type)

        if period:
            query += " AND period = ?"
            params.append(period)

        query += " ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, created_at DESC"
        query += f" LIMIT {limit}"

        self.cursor.execute(query, params)
        columns = [desc[0] for desc in self.cursor.description]

        return [dict(zip(columns, row)) for row in self.cursor.fetchall()]

    def get_alert_summary(self) -> Dict[str, Any]:
        """Get summary of alerts by severity"""
        self.cursor.execute(
            """
            SELECT severity, COUNT(*) as count
            FROM alerts WHERE is_resolved = 0
            GROUP BY severity
        """
        )

        summary = {"critical": 0, "warning": 0, "info": 0, "total": 0}
        for row in self.cursor.fetchall():
            summary[row[0]] = row[1]
            summary["total"] += row[1]

        return summary

    def scan_for_alerts(self, period: str = None) -> Dict[str, Any]:
        """Scan payroll data and generate alerts"""
        alerts_created = 0

        # Build query
        query = """
            SELECT
                p.employee_id, p.period, p.profit_margin, p.work_hours,
                p.overtime_hours, p.gross_profit, p.billing_amount,
                e.name, e.dispatch_company
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
        """
        params = []

        if period:
            query += " WHERE p.period = ?"
            params.append(period)

        self.cursor.execute(query, params)
        records = self.cursor.fetchall()

        for record in records:
            (
                emp_id,
                rec_period,
                margin,
                work_hours,
                overtime,
                profit,
                billing,
                name,
                company,
            ) = record

            # Check negative margin (CRITICAL)
            if margin is not None and margin < self.thresholds.get(
                "margin_negative", 0
            ):
                self.create_alert(
                    AlertType.NEGATIVE_MARGIN,
                    AlertSeverity.CRITICAL,
                    f"Margen negativo: {name}",
                    f"Empleado {emp_id} ({name}) tiene margen {margin:.1f}% en {rec_period}. Perdiendo dinero.",
                    "employee",
                    emp_id,
                    rec_period,
                    margin,
                    0.0,
                )
                alerts_created += 1

            # Check critical low margin
            elif margin is not None and margin < self.thresholds.get(
                "margin_critical", 10
            ):
                self.create_alert(
                    AlertType.LOW_MARGIN,
                    AlertSeverity.CRITICAL,
                    f"Margen muy bajo: {name}",
                    f"Empleado {emp_id} ({name}) tiene margen {margin:.1f}% (objetivo: 15%) en {rec_period}",
                    "employee",
                    emp_id,
                    rec_period,
                    margin,
                    self.thresholds["margin_critical"],
                )
                alerts_created += 1

            # Check warning low margin
            elif margin is not None and margin < self.thresholds.get(
                "margin_warning", 15
            ):
                self.create_alert(
                    AlertType.LOW_MARGIN,
                    AlertSeverity.WARNING,
                    f"Margen bajo: {name}",
                    f"Empleado {emp_id} ({name}) tiene margen {margin:.1f}% (objetivo: 15%) en {rec_period}",
                    "employee",
                    emp_id,
                    rec_period,
                    margin,
                    self.thresholds["margin_warning"],
                )
                alerts_created += 1

            # Check excessive hours
            if work_hours and work_hours > self.thresholds.get("hours_critical", 250):
                self.create_alert(
                    AlertType.EXCESSIVE_HOURS,
                    AlertSeverity.CRITICAL,
                    f"Horas excesivas: {name}",
                    f"Empleado {emp_id} ({name}) trabajó {work_hours:.1f}h en {rec_period} (límite: 250h)",
                    "employee",
                    emp_id,
                    rec_period,
                    work_hours,
                    self.thresholds["hours_critical"],
                )
                alerts_created += 1
            elif work_hours and work_hours > self.thresholds.get("hours_warning", 200):
                self.create_alert(
                    AlertType.EXCESSIVE_HOURS,
                    AlertSeverity.WARNING,
                    f"Muchas horas: {name}",
                    f"Empleado {emp_id} ({name}) trabajó {work_hours:.1f}h en {rec_period}",
                    "employee",
                    emp_id,
                    rec_period,
                    work_hours,
                    self.thresholds["hours_warning"],
                )
                alerts_created += 1

        # Check client-level margins
        self.cursor.execute(
            """
            SELECT e.dispatch_company, AVG(p.profit_margin) as avg_margin
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE p.period = ?
            GROUP BY e.dispatch_company
            HAVING avg_margin < ?
        """,
            (period, self.thresholds.get("client_margin_warning", 12)),
        )

        for row in self.cursor.fetchall():
            company, avg_margin = row
            self.create_alert(
                AlertType.CLIENT_UNDERPERFORMING,
                AlertSeverity.WARNING,
                f"Cliente poco rentable: {company}",
                f"El cliente {company} tiene margen promedio de {avg_margin:.1f}% (objetivo: 15%)",
                "company",
                company,
                period,
                avg_margin,
                self.thresholds["client_margin_warning"],
            )
            alerts_created += 1

        return {
            "alerts_created": alerts_created,
            "period_scanned": period,
            "records_analyzed": len(records),
        }

    def auto_resolve_stale_alerts(self, days: int = 30) -> int:
        """Auto-resolve alerts older than N days"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()

        self.cursor.execute(
            """
            UPDATE alerts SET is_resolved = 1, resolved_at = CURRENT_TIMESTAMP,
            notes = 'Auto-resolved (stale)'
            WHERE is_resolved = 0 AND created_at < ?
        """,
            (cutoff,),
        )
        self.conn.commit()

        return self.cursor.rowcount

    def delete_alert(self, alert_id: int) -> bool:
        """Delete an alert"""
        self.cursor.execute("DELETE FROM alerts WHERE id = ?", (alert_id,))
        self.conn.commit()
        return self.cursor.rowcount > 0

    def get_thresholds(self) -> Dict[str, float]:
        """Get all current thresholds"""
        return self.thresholds.copy()
