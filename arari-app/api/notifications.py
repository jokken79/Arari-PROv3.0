"""
NotificationAgent - Notification System
Email and in-app notifications for 粗利 PRO
"""

import os
import smtplib
import sqlite3
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List


def init_notification_tables(conn: sqlite3.Connection):
    """Initialize notification tables"""
    cursor = conn.cursor()

    # Notifications table (in-app)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            notification_type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT,
            link TEXT,
            priority TEXT DEFAULT 'normal',
            is_read INTEGER DEFAULT 0,
            read_at TEXT,
            expires_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Email queue table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS email_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            to_email TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            html_body TEXT,
            status TEXT DEFAULT 'pending',
            attempts INTEGER DEFAULT 0,
            last_attempt TEXT,
            error_message TEXT,
            sent_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Notification preferences table
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS notification_preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            email_alerts INTEGER DEFAULT 1,
            email_reports INTEGER DEFAULT 1,
            email_digest TEXT DEFAULT 'daily',
            in_app_alerts INTEGER DEFAULT 1,
            alert_low_margin INTEGER DEFAULT 1,
            alert_budget_exceeded INTEGER DEFAULT 1,
            alert_data_issues INTEGER DEFAULT 1,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    # Create indexes
    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_notifications_user
        ON notifications(user_id, is_read)
    """
    )

    cursor.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_email_queue_status
        ON email_queue(status)
    """
    )

    conn.commit()


class NotificationService:
    """Service for managing notifications"""

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cursor = conn.cursor()

        # Email configuration from environment
        self.smtp_host = os.environ.get("SMTP_HOST", "localhost")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER", "")
        self.smtp_password = os.environ.get("SMTP_PASSWORD", "")
        self.from_email = os.environ.get("FROM_EMAIL", "noreply@arari-pro.local")

    # ==================== In-App Notifications ====================

    def create_notification(
        self,
        title: str,
        message: str,
        notification_type: str = "info",
        user_id: int = None,
        link: str = None,
        priority: str = "normal",
        expires_days: int = 30,
    ) -> int:
        """Create an in-app notification"""
        expires_at = (
            (datetime.now() + timedelta(days=expires_days)).isoformat()
            if expires_days
            else None
        )

        self.cursor.execute(
            """
            INSERT INTO notifications (user_id, notification_type, title, message, link, priority, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (user_id, notification_type, title, message, link, priority, expires_at),
        )
        self.conn.commit()

        return self.cursor.lastrowid

    def get_notifications(
        self, user_id: int = None, unread_only: bool = False, limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get notifications for a user"""
        query = "SELECT * FROM notifications WHERE 1=1"
        params = []

        if user_id:
            query += " AND (user_id = ? OR user_id IS NULL)"
            params.append(user_id)

        if unread_only:
            query += " AND is_read = 0"

        # Filter expired
        query += " AND (expires_at IS NULL OR expires_at > ?)"
        params.append(datetime.now().isoformat())

        query += " ORDER BY priority DESC, created_at DESC LIMIT ?"
        params.append(limit)

        self.cursor.execute(query, params)
        columns = [desc[0] for desc in self.cursor.description]

        return [dict(zip(columns, row)) for row in self.cursor.fetchall()]

    def mark_as_read(self, notification_id: int) -> bool:
        """Mark a notification as read"""
        self.cursor.execute(
            """
            UPDATE notifications SET is_read = 1, read_at = ?
            WHERE id = ?
        """,
            (datetime.now().isoformat(), notification_id),
        )
        self.conn.commit()
        return self.cursor.rowcount > 0

    def mark_all_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        self.cursor.execute(
            """
            UPDATE notifications SET is_read = 1, read_at = ?
            WHERE user_id = ? AND is_read = 0
        """,
            (datetime.now().isoformat(), user_id),
        )
        self.conn.commit()
        return self.cursor.rowcount

    def delete_notification(self, notification_id: int) -> bool:
        """Delete a notification"""
        self.cursor.execute(
            "DELETE FROM notifications WHERE id = ?", (notification_id,)
        )
        self.conn.commit()
        return self.cursor.rowcount > 0

    def get_unread_count(self, user_id: int = None) -> int:
        """Get count of unread notifications"""
        query = "SELECT COUNT(*) FROM notifications WHERE is_read = 0"
        params = []

        if user_id:
            query += " AND (user_id = ? OR user_id IS NULL)"
            params.append(user_id)

        query += " AND (expires_at IS NULL OR expires_at > ?)"
        params.append(datetime.now().isoformat())

        self.cursor.execute(query, params)
        return self.cursor.fetchone()[0]

    def cleanup_old_notifications(self, days: int = 90) -> int:
        """Delete old notifications"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()

        self.cursor.execute(
            """
            DELETE FROM notifications
            WHERE created_at < ? OR (expires_at IS NOT NULL AND expires_at < ?)
        """,
            (cutoff, datetime.now().isoformat()),
        )
        self.conn.commit()

        return self.cursor.rowcount

    # ==================== Email Notifications ====================

    def queue_email(
        self, to_email: str, subject: str, body: str, html_body: str = None
    ) -> int:
        """Add email to queue"""
        self.cursor.execute(
            """
            INSERT INTO email_queue (to_email, subject, body, html_body)
            VALUES (?, ?, ?, ?)
        """,
            (to_email, subject, body, html_body),
        )
        self.conn.commit()

        return self.cursor.lastrowid

    def send_email(
        self, to_email: str, subject: str, body: str, html_body: str = None
    ) -> Dict[str, Any]:
        """Send email immediately"""
        if not self.smtp_user:
            return {"error": "Email not configured (SMTP_USER not set)"}

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email

            # Plain text version
            msg.attach(MIMEText(body, "plain"))

            # HTML version if provided
            if html_body:
                msg.attach(MIMEText(html_body, "html"))

            # Send
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, to_email, msg.as_string())

            return {"success": True, "message": f"Email sent to {to_email}"}

        except Exception as e:
            return {"error": str(e)}

    def process_email_queue(self, batch_size: int = 10) -> Dict[str, Any]:
        """Process pending emails in queue"""
        self.cursor.execute(
            """
            SELECT id, to_email, subject, body, html_body, attempts
            FROM email_queue
            WHERE status = 'pending' AND attempts < 3
            ORDER BY created_at
            LIMIT ?
        """,
            (batch_size,),
        )

        emails = self.cursor.fetchall()
        sent = 0
        failed = 0

        for email in emails:
            email_id, to_email, subject, body, html_body, attempts = email

            result = self.send_email(to_email, subject, body, html_body)

            if result.get("success"):
                self.cursor.execute(
                    """
                    UPDATE email_queue SET status = 'sent', sent_at = ?, last_attempt = ?
                    WHERE id = ?
                """,
                    (datetime.now().isoformat(), datetime.now().isoformat(), email_id),
                )
                sent += 1
            else:
                new_status = "failed" if attempts >= 2 else "pending"
                self.cursor.execute(
                    """
                    UPDATE email_queue SET status = ?, attempts = attempts + 1,
                    last_attempt = ?, error_message = ?
                    WHERE id = ?
                """,
                    (
                        new_status,
                        datetime.now().isoformat(),
                        result.get("error"),
                        email_id,
                    ),
                )
                failed += 1

        self.conn.commit()

        return {"processed": len(emails), "sent": sent, "failed": failed}

    def get_email_queue_status(self) -> Dict[str, Any]:
        """Get email queue statistics"""
        self.cursor.execute(
            """
            SELECT status, COUNT(*) as count
            FROM email_queue
            GROUP BY status
        """
        )

        stats = {row[0]: row[1] for row in self.cursor.fetchall()}

        return {
            "pending": stats.get("pending", 0),
            "sent": stats.get("sent", 0),
            "failed": stats.get("failed", 0),
            "total": sum(stats.values()),
        }

    # ==================== Notification Preferences ====================

    def get_preferences(self, user_id: int) -> Dict[str, Any]:
        """Get notification preferences for a user"""
        self.cursor.execute(
            """
            SELECT * FROM notification_preferences WHERE user_id = ?
        """,
            (user_id,),
        )

        row = self.cursor.fetchone()
        if not row:
            # Return defaults
            return {
                "user_id": user_id,
                "email_alerts": True,
                "email_reports": True,
                "email_digest": "daily",
                "in_app_alerts": True,
                "alert_low_margin": True,
                "alert_budget_exceeded": True,
                "alert_data_issues": True,
            }

        columns = [desc[0] for desc in self.cursor.description]
        prefs = dict(zip(columns, row))

        # Convert integers to booleans
        for key in [
            "email_alerts",
            "email_reports",
            "in_app_alerts",
            "alert_low_margin",
            "alert_budget_exceeded",
            "alert_data_issues",
        ]:
            if key in prefs:
                prefs[key] = bool(prefs[key])

        return prefs

    def update_preferences(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """Update notification preferences"""
        allowed_fields = [
            "email_alerts",
            "email_reports",
            "email_digest",
            "in_app_alerts",
            "alert_low_margin",
            "alert_budget_exceeded",
            "alert_data_issues",
        ]

        updates = {k: v for k, v in kwargs.items() if k in allowed_fields}

        if not updates:
            return {"error": "No valid fields to update"}

        # Convert booleans to integers for SQLite
        for key in updates:
            if isinstance(updates[key], bool):
                updates[key] = 1 if updates[key] else 0

        # Upsert
        fields = list(updates.keys())
        placeholders = ", ".join(["?"] * len(fields))
        update_clause = ", ".join(f"{f} = excluded.{f}" for f in fields)

        self.cursor.execute(
            f"""
            INSERT INTO notification_preferences (user_id, {", ".join(fields)})
            VALUES (?, {placeholders})
            ON CONFLICT(user_id) DO UPDATE SET {update_clause}, updated_at = CURRENT_TIMESTAMP
        """,
            [user_id] + list(updates.values()),
        )
        self.conn.commit()

        return {"status": "updated", "user_id": user_id}

    # ==================== Alert Notifications ====================

    def notify_low_margin(
        self, employee_id: str, employee_name: str, margin: float, period: str
    ) -> None:
        """Create notification for low margin"""
        self.create_notification(
            title=f"マージン警告: {employee_name}",
            message=f"{employee_name} ({employee_id}) のマージンが {margin:.1f}% です（{period}）。目標: 15%",
            notification_type="alert",
            priority="high",
            link=f"/employees/{employee_id}",
        )

    def notify_budget_exceeded(self, period: str, variance: float) -> None:
        """Create notification for budget exceeded"""
        self.create_notification(
            title=f"予算超過: {period}",
            message=f"{period} の実績が予算を ¥{abs(variance):,.0f} {'下回り' if variance < 0 else '上回り'}ました。",
            notification_type="alert",
            priority="high" if variance < 0 else "normal",
            link=f"/reports?period={period}",
        )

    def notify_data_issue(self, issue_type: str, details: str) -> None:
        """Create notification for data issues"""
        self.create_notification(
            title=f"データ問題: {issue_type}",
            message=details,
            notification_type="warning",
            priority="normal",
            link="/validate",
        )

    def notify_report_ready(
        self, report_type: str, period: str = None, download_link: str = None
    ) -> None:
        """Create notification for report ready"""
        self.create_notification(
            title=f"レポート完了: {report_type}",
            message=f"{report_type} レポートが生成されました"
            + (f" ({period})" if period else ""),
            notification_type="info",
            priority="normal",
            link=download_link,
        )
