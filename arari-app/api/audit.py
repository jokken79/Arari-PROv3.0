"""
AuditAgent - Audit Logging System
Tracks all changes to data for compliance and debugging
"""

import json
import sqlite3
from datetime import datetime
from typing import Any, Dict, List


class AuditAction:
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    UPLOAD = "UPLOAD"
    EXPORT = "EXPORT"
    SETTINGS = "SETTINGS"
    ALERT_RESOLVED = "ALERT_RESOLVED"
    PASSWORD_CHANGE = "PASSWORD_CHANGE"
    ROLE_CHANGE = "ROLE_CHANGE"


class AuditEntity:
    EMPLOYEE = "employee"
    PAYROLL = "payroll"
    USER = "user"
    SETTINGS = "settings"
    TEMPLATE = "template"
    ALERT = "alert"
    REPORT = "report"
    FILE = "file"


def init_audit_tables(conn: sqlite3.Connection):
    """Initialize audit tables"""
    cursor = conn.cursor()

    # Main audit log table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            username TEXT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            changes JSON,
            old_values JSON,
            new_values JSON,
            ip_address TEXT,
            user_agent TEXT,
            details TEXT,
            session_id TEXT
        )
    """
    )

    # Create indexes for common queries
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp
        ON audit_log(timestamp DESC)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_user
        ON audit_log(user_id, timestamp DESC)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_entity
        ON audit_log(entity_type, entity_id)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_audit_action
        ON audit_log(action, timestamp DESC)
    """
    )

    conn.commit()


class AuditService:
    """Service for audit logging"""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cursor = conn.cursor()

    def log(
        self,
        action: str,
        entity_type: str,
        entity_id: str = None,
        user_id: int = None,
        username: str = None,
        old_values: Dict = None,
        new_values: Dict = None,
        changes: Dict = None,
        details: str = None,
        ip_address: str = None,
        user_agent: str = None,
        session_id: str = None,
    ) -> int:
        """Log an audit event"""

        # Calculate changes if old and new values provided
        if old_values and new_values and not changes:
            changes = self._calculate_changes(old_values, new_values)

        self.cursor.execute(
            """
            INSERT INTO audit_log (
                user_id, username, action, entity_type, entity_id,
                changes, old_values, new_values, ip_address, user_agent,
                details, session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
            (
                user_id,
                username,
                action,
                entity_type,
                entity_id,
                json.dumps(changes) if changes else None,
                json.dumps(old_values) if old_values else None,
                json.dumps(new_values) if new_values else None,
                ip_address,
                user_agent,
                details,
                session_id,
            ),
        )
        self.conn.commit()

        return self.cursor.lastrowid

    def _calculate_changes(self, old: Dict, new: Dict) -> Dict:
        """Calculate what changed between old and new values"""
        changes = {}

        all_keys = set(old.keys()) | set(new.keys())
        for key in all_keys:
            old_val = old.get(key)
            new_val = new.get(key)

            if old_val != new_val:
                changes[key] = {"from": old_val, "to": new_val}

        return changes

    def log_create(
        self,
        entity_type: str,
        entity_id: str,
        new_values: Dict,
        user_id: int = None,
        username: str = None,
        **kwargs,
    ) -> int:
        """Log a CREATE event"""
        return self.log(
            action=AuditAction.CREATE,
            entity_type=entity_type,
            entity_id=entity_id,
            new_values=new_values,
            user_id=user_id,
            username=username,
            details=f"Created {entity_type}: {entity_id}",
            **kwargs,
        )

    def log_update(
        self,
        entity_type: str,
        entity_id: str,
        old_values: Dict,
        new_values: Dict,
        user_id: int = None,
        username: str = None,
        **kwargs,
    ) -> int:
        """Log an UPDATE event"""
        return self.log(
            action=AuditAction.UPDATE,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            new_values=new_values,
            user_id=user_id,
            username=username,
            details=f"Updated {entity_type}: {entity_id}",
            **kwargs,
        )

    def log_delete(
        self,
        entity_type: str,
        entity_id: str,
        old_values: Dict = None,
        user_id: int = None,
        username: str = None,
        **kwargs,
    ) -> int:
        """Log a DELETE event"""
        return self.log(
            action=AuditAction.DELETE,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values,
            user_id=user_id,
            username=username,
            details=f"Deleted {entity_type}: {entity_id}",
            **kwargs,
        )

    def log_login(
        self,
        user_id: int,
        username: str,
        success: bool = True,
        ip_address: str = None,
        **kwargs,
    ) -> int:
        """Log a login event"""
        return self.log(
            action=AuditAction.LOGIN,
            entity_type=AuditEntity.USER,
            entity_id=str(user_id),
            user_id=user_id,
            username=username,
            ip_address=ip_address,
            details=f"Login {'successful' if success else 'failed'} for {username}",
            **kwargs,
        )

    def log_logout(self, user_id: int, username: str, **kwargs) -> int:
        """Log a logout event"""
        return self.log(
            action=AuditAction.LOGOUT,
            entity_type=AuditEntity.USER,
            entity_id=str(user_id),
            user_id=user_id,
            username=username,
            details=f"Logout for {username}",
            **kwargs,
        )

    def log_upload(
        self,
        filename: str,
        records_count: int,
        user_id: int = None,
        username: str = None,
        **kwargs,
    ) -> int:
        """Log a file upload event"""
        return self.log(
            action=AuditAction.UPLOAD,
            entity_type=AuditEntity.FILE,
            entity_id=filename,
            user_id=user_id,
            username=username,
            new_values={"filename": filename, "records": records_count},
            details=f"Uploaded file: {filename} ({records_count} records)",
            **kwargs,
        )

    def log_export(
        self,
        export_type: str,
        format: str = None,
        period: str = None,
        user_id: int = None,
        username: str = None,
        **kwargs,
    ) -> int:
        """Log an export event"""
        return self.log(
            action=AuditAction.EXPORT,
            entity_type=AuditEntity.REPORT,
            entity_id=export_type,
            user_id=user_id,
            username=username,
            new_values={"type": export_type, "format": format, "period": period},
            details=f"Exported {export_type} as {format or 'JSON'}",
            **kwargs,
        )

    def get_logs(
        self,
        user_id: int = None,
        action: str = None,
        entity_type: str = None,
        entity_id: str = None,
        from_date: str = None,
        to_date: str = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[Dict[str, Any]]:
        """Query audit logs with filters"""
        query = "SELECT * FROM audit_log WHERE 1=1"
        params = []

        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)

        if action:
            query += " AND action = ?"
            params.append(action)

        if entity_type:
            query += " AND entity_type = ?"
            params.append(entity_type)

        if entity_id:
            query += " AND entity_id = ?"
            params.append(entity_id)

        if from_date:
            query += " AND timestamp >= ?"
            params.append(from_date)

        if to_date:
            query += " AND timestamp <= ?"
            params.append(to_date)

        query += f" ORDER BY timestamp DESC LIMIT {limit} OFFSET {offset}"

        self.cursor.execute(query, params)
        columns = [desc[0] for desc in self.cursor.description]

        results = []
        for row in self.cursor.fetchall():
            log_entry = dict(zip(columns, row))

            # Parse JSON fields
            for json_field in ["changes", "old_values", "new_values"]:
                if log_entry.get(json_field):
                    try:
                        log_entry[json_field] = json.loads(log_entry[json_field])
                    except:
                        pass

            results.append(log_entry)

        return results

    def get_entity_history(
        self, entity_type: str, entity_id: str, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get full history of changes for an entity"""
        return self.get_logs(entity_type=entity_type, entity_id=entity_id, limit=limit)

    def get_user_activity(
        self, user_id: int, days: int = 30, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent activity for a user"""
        from_date = (datetime.now() - timedelta(days=days)).isoformat()
        return self.get_logs(user_id=user_id, from_date=from_date, limit=limit)

    def get_summary(self, days: int = 7) -> Dict[str, Any]:
        """Get audit summary for dashboard"""
        from_date = (datetime.now() - timedelta(days=days)).isoformat()

        # Count by action
        self.cursor.execute(
            """
            SELECT action, COUNT(*) as count
            FROM audit_log
            WHERE timestamp >= ?
            GROUP BY action
            ORDER BY count DESC
        """,
            (from_date,),
        )

        by_action = {row[0]: row[1] for row in self.cursor.fetchall()}

        # Count by entity type
        self.cursor.execute(
            """
            SELECT entity_type, COUNT(*) as count
            FROM audit_log
            WHERE timestamp >= ?
            GROUP BY entity_type
            ORDER BY count DESC
        """,
            (from_date,),
        )

        by_entity = {row[0]: row[1] for row in self.cursor.fetchall()}

        # Count by user
        self.cursor.execute(
            """
            SELECT username, COUNT(*) as count
            FROM audit_log
            WHERE timestamp >= ? AND username IS NOT NULL
            GROUP BY username
            ORDER BY count DESC
            LIMIT 10
        """,
            (from_date,),
        )

        by_user = {row[0]: row[1] for row in self.cursor.fetchall()}

        # Total count
        self.cursor.execute(
            """
            SELECT COUNT(*) FROM audit_log WHERE timestamp >= ?
        """,
            (from_date,),
        )
        total = self.cursor.fetchone()[0]

        return {
            "total_events": total,
            "by_action": by_action,
            "by_entity": by_entity,
            "by_user": by_user,
            "period_days": days,
        }

    def cleanup_old_logs(self, days: int = 365) -> int:
        """Delete logs older than N days"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()

        self.cursor.execute(
            """
            DELETE FROM audit_log WHERE timestamp < ?
        """,
            (cutoff,),
        )
        self.conn.commit()

        return self.cursor.rowcount


# Import timedelta for get_user_activity
from datetime import timedelta
