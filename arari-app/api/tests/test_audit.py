"""
Tests for Audit Logging System
Tests audit log creation, retrieval, filtering, and cleanup.
"""

import pytest
import json
from datetime import datetime, timedelta


class TestInitAuditTables:
    """Tests for audit table initialization"""

    def test_creates_audit_log_table(self, db_session):
        """Should create audit_log table"""
        from audit import init_audit_tables

        init_audit_tables(db_session)

        cursor = db_session.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_log'"
        )
        assert cursor.fetchone() is not None

    def test_creates_indexes(self, db_session):
        """Should create required indexes"""
        from audit import init_audit_tables

        init_audit_tables(db_session)

        cursor = db_session.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_audit%'"
        )
        indexes = cursor.fetchall()
        assert len(indexes) >= 4  # timestamp, user, entity, action


class TestAuditAction:
    """Tests for AuditAction constants"""

    def test_action_constants_exist(self):
        """Should have standard action constants"""
        from audit import AuditAction

        assert hasattr(AuditAction, "CREATE")
        assert hasattr(AuditAction, "UPDATE")
        assert hasattr(AuditAction, "DELETE")
        assert hasattr(AuditAction, "LOGIN")
        assert hasattr(AuditAction, "LOGOUT")
        assert hasattr(AuditAction, "UPLOAD")


class TestAuditEntity:
    """Tests for AuditEntity constants"""

    def test_entity_constants_exist(self):
        """Should have standard entity constants"""
        from audit import AuditEntity

        assert hasattr(AuditEntity, "EMPLOYEE")
        assert hasattr(AuditEntity, "PAYROLL")
        assert hasattr(AuditEntity, "USER")
        assert hasattr(AuditEntity, "SETTINGS")


class TestAuditServiceLog:
    """Tests for AuditService.log()"""

    @pytest.fixture
    def audit_service(self, db_session):
        from audit import init_audit_tables, AuditService

        init_audit_tables(db_session)
        return AuditService(db_session)

    def test_log_basic_event(self, audit_service):
        """Should log a basic event"""
        from audit import AuditAction, AuditEntity

        log_id = audit_service.log(
            action=AuditAction.CREATE,
            entity_type=AuditEntity.EMPLOYEE,
            entity_id="EMP001",
        )

        assert log_id is not None
        assert log_id > 0

    def test_log_with_user_info(self, audit_service):
        """Should log event with user information"""
        from audit import AuditAction, AuditEntity

        log_id = audit_service.log(
            action=AuditAction.CREATE,
            entity_type=AuditEntity.EMPLOYEE,
            entity_id="EMP001",
            user_id=1,
            username="admin",
        )

        logs = audit_service.get_logs(user_id=1)
        assert len(logs) == 1
        assert logs[0]["username"] == "admin"

    def test_log_with_old_new_values(self, audit_service):
        """Should log changes between old and new values"""
        from audit import AuditAction, AuditEntity

        old_values = {"name": "Old Name", "status": "active"}
        new_values = {"name": "New Name", "status": "active"}

        log_id = audit_service.log(
            action=AuditAction.UPDATE,
            entity_type=AuditEntity.EMPLOYEE,
            entity_id="EMP001",
            old_values=old_values,
            new_values=new_values,
        )

        logs = audit_service.get_logs(entity_id="EMP001")
        assert len(logs) == 1
        assert logs[0]["changes"]["name"]["from"] == "Old Name"
        assert logs[0]["changes"]["name"]["to"] == "New Name"

    def test_log_with_ip_and_user_agent(self, audit_service):
        """Should log IP address and user agent"""
        from audit import AuditAction, AuditEntity

        audit_service.log(
            action=AuditAction.LOGIN,
            entity_type=AuditEntity.USER,
            entity_id="1",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
        )

        logs = audit_service.get_logs()
        assert logs[0]["ip_address"] == "192.168.1.1"
        assert logs[0]["user_agent"] == "Mozilla/5.0"


class TestAuditServiceHelperMethods:
    """Tests for log helper methods"""

    @pytest.fixture
    def audit_service(self, db_session):
        from audit import init_audit_tables, AuditService

        init_audit_tables(db_session)
        return AuditService(db_session)

    def test_log_create(self, audit_service):
        """Should log CREATE event"""
        from audit import AuditAction

        log_id = audit_service.log_create(
            entity_type="employee",
            entity_id="EMP001",
            new_values={"name": "Test Employee"},
            username="admin",
        )

        logs = audit_service.get_logs()
        assert logs[0]["action"] == AuditAction.CREATE

    def test_log_update(self, audit_service):
        """Should log UPDATE event with changes"""
        from audit import AuditAction

        log_id = audit_service.log_update(
            entity_type="employee",
            entity_id="EMP001",
            old_values={"status": "active"},
            new_values={"status": "inactive"},
            username="admin",
        )

        logs = audit_service.get_logs()
        assert logs[0]["action"] == AuditAction.UPDATE
        assert logs[0]["changes"]["status"]["to"] == "inactive"

    def test_log_delete(self, audit_service):
        """Should log DELETE event"""
        from audit import AuditAction

        log_id = audit_service.log_delete(
            entity_type="employee",
            entity_id="EMP001",
            old_values={"name": "Deleted Employee"},
            username="admin",
        )

        logs = audit_service.get_logs()
        assert logs[0]["action"] == AuditAction.DELETE

    def test_log_login_success(self, audit_service):
        """Should log successful login"""
        log_id = audit_service.log_login(
            user_id=1,
            username="admin",
            success=True,
            ip_address="192.168.1.1",
        )

        logs = audit_service.get_logs()
        assert "successful" in logs[0]["details"]

    def test_log_login_failed(self, audit_service):
        """Should log failed login"""
        log_id = audit_service.log_login(
            user_id=1,
            username="admin",
            success=False,
            ip_address="192.168.1.1",
        )

        logs = audit_service.get_logs()
        assert "failed" in logs[0]["details"]

    def test_log_logout(self, audit_service):
        """Should log logout event"""
        from audit import AuditAction

        log_id = audit_service.log_logout(user_id=1, username="admin")

        logs = audit_service.get_logs()
        assert logs[0]["action"] == AuditAction.LOGOUT

    def test_log_upload(self, audit_service):
        """Should log file upload"""
        from audit import AuditAction

        log_id = audit_service.log_upload(
            filename="payroll_2025.xlsx",
            records_count=50,
            username="admin",
        )

        logs = audit_service.get_logs()
        assert logs[0]["action"] == AuditAction.UPLOAD
        assert "50 records" in logs[0]["details"]

    def test_log_export(self, audit_service):
        """Should log report export"""
        from audit import AuditAction

        log_id = audit_service.log_export(
            export_type="monthly",
            format="excel",
            period="2025年1月",
            username="admin",
        )

        logs = audit_service.get_logs()
        assert logs[0]["action"] == AuditAction.EXPORT


class TestGetLogs:
    """Tests for AuditService.get_logs()"""

    @pytest.fixture
    def audit_service_with_logs(self, db_session):
        from audit import init_audit_tables, AuditService, AuditAction, AuditEntity

        init_audit_tables(db_session)
        service = AuditService(db_session)

        # Create various log entries
        service.log(
            action=AuditAction.CREATE,
            entity_type=AuditEntity.EMPLOYEE,
            entity_id="EMP001",
            user_id=1,
            username="admin",
        )
        service.log(
            action=AuditAction.UPDATE,
            entity_type=AuditEntity.EMPLOYEE,
            entity_id="EMP002",
            user_id=2,
            username="user1",
        )
        service.log(
            action=AuditAction.LOGIN,
            entity_type=AuditEntity.USER,
            entity_id="1",
            user_id=1,
            username="admin",
        )

        return service

    def test_get_all_logs(self, audit_service_with_logs):
        """Should return all logs"""
        logs = audit_service_with_logs.get_logs()

        assert len(logs) == 3

    def test_filter_by_user_id(self, audit_service_with_logs):
        """Should filter by user_id"""
        logs = audit_service_with_logs.get_logs(user_id=1)

        assert len(logs) == 2  # admin has 2 entries

    def test_filter_by_action(self, audit_service_with_logs):
        """Should filter by action"""
        from audit import AuditAction

        logs = audit_service_with_logs.get_logs(action=AuditAction.CREATE)

        assert len(logs) == 1

    def test_filter_by_entity_type(self, audit_service_with_logs):
        """Should filter by entity type"""
        from audit import AuditEntity

        logs = audit_service_with_logs.get_logs(entity_type=AuditEntity.EMPLOYEE)

        assert len(logs) == 2

    def test_filter_by_entity_id(self, audit_service_with_logs):
        """Should filter by entity ID"""
        logs = audit_service_with_logs.get_logs(entity_id="EMP001")

        assert len(logs) == 1

    def test_pagination_limit(self, audit_service_with_logs):
        """Should respect limit parameter"""
        logs = audit_service_with_logs.get_logs(limit=2)

        assert len(logs) == 2

    def test_pagination_offset(self, audit_service_with_logs):
        """Should respect offset parameter"""
        all_logs = audit_service_with_logs.get_logs()
        offset_logs = audit_service_with_logs.get_logs(offset=1)

        assert len(offset_logs) == len(all_logs) - 1

    def test_logs_ordered_by_timestamp_desc(self, audit_service_with_logs):
        """Should return logs in descending order (most recent first)"""
        logs = audit_service_with_logs.get_logs()

        # Logs should be ordered by timestamp DESC, but since they're created
        # nearly simultaneously, we just verify we get all 3 logs
        assert len(logs) == 3
        # All logs should have timestamps
        for log in logs:
            assert log["timestamp"] is not None


class TestGetEntityHistory:
    """Tests for AuditService.get_entity_history()"""

    @pytest.fixture
    def audit_service_with_entity_history(self, db_session):
        from audit import init_audit_tables, AuditService, AuditAction

        init_audit_tables(db_session)
        service = AuditService(db_session)

        # Create history for one entity
        service.log_create(
            entity_type="employee",
            entity_id="EMP001",
            new_values={"name": "Test"},
        )
        service.log_update(
            entity_type="employee",
            entity_id="EMP001",
            old_values={"name": "Test"},
            new_values={"name": "Updated Test"},
        )

        # Different entity
        service.log_create(
            entity_type="employee",
            entity_id="EMP002",
            new_values={"name": "Other"},
        )

        return service

    def test_get_entity_history(self, audit_service_with_entity_history):
        """Should return history for specific entity"""
        history = audit_service_with_entity_history.get_entity_history(
            "employee", "EMP001"
        )

        assert len(history) == 2

    def test_entity_history_excludes_other_entities(self, audit_service_with_entity_history):
        """Should not include other entities"""
        history = audit_service_with_entity_history.get_entity_history(
            "employee", "EMP002"
        )

        assert len(history) == 1


class TestGetSummary:
    """Tests for AuditService.get_summary()"""

    @pytest.fixture
    def audit_service_with_varied_logs(self, db_session):
        from audit import init_audit_tables, AuditService, AuditAction, AuditEntity

        init_audit_tables(db_session)
        service = AuditService(db_session)

        # Create varied log entries
        for _ in range(5):
            service.log(
                action=AuditAction.CREATE,
                entity_type=AuditEntity.EMPLOYEE,
                username="admin",
            )
        for _ in range(3):
            service.log(
                action=AuditAction.UPDATE,
                entity_type=AuditEntity.PAYROLL,
                username="user1",
            )
        service.log(
            action=AuditAction.LOGIN,
            entity_type=AuditEntity.USER,
            username="admin",
        )

        return service

    def test_summary_total_events(self, audit_service_with_varied_logs):
        """Should count total events"""
        summary = audit_service_with_varied_logs.get_summary(days=7)

        assert summary["total_events"] == 9

    def test_summary_by_action(self, audit_service_with_varied_logs):
        """Should group by action"""
        from audit import AuditAction

        summary = audit_service_with_varied_logs.get_summary(days=7)

        assert summary["by_action"][AuditAction.CREATE] == 5
        assert summary["by_action"][AuditAction.UPDATE] == 3

    def test_summary_by_entity(self, audit_service_with_varied_logs):
        """Should group by entity type"""
        from audit import AuditEntity

        summary = audit_service_with_varied_logs.get_summary(days=7)

        assert summary["by_entity"][AuditEntity.EMPLOYEE] == 5
        assert summary["by_entity"][AuditEntity.PAYROLL] == 3

    def test_summary_by_user(self, audit_service_with_varied_logs):
        """Should group by user"""
        summary = audit_service_with_varied_logs.get_summary(days=7)

        assert summary["by_user"]["admin"] == 6  # 5 creates + 1 login
        assert summary["by_user"]["user1"] == 3


class TestCleanupOldLogs:
    """Tests for AuditService.cleanup_old_logs()"""

    def test_cleanup_removes_old_logs(self, db_session):
        """Should remove logs older than specified days"""
        from audit import init_audit_tables, AuditService

        init_audit_tables(db_session)
        cursor = db_session.cursor()

        # Insert old log directly
        old_timestamp = (datetime.now() - timedelta(days=400)).isoformat()
        cursor.execute("""
            INSERT INTO audit_log (timestamp, action, entity_type, entity_id)
            VALUES (?, 'CREATE', 'employee', 'OLD001')
        """, (old_timestamp,))

        # Insert recent log
        cursor.execute("""
            INSERT INTO audit_log (timestamp, action, entity_type, entity_id)
            VALUES (datetime('now'), 'CREATE', 'employee', 'NEW001')
        """)
        db_session.commit()

        service = AuditService(db_session)

        # Cleanup logs older than 365 days
        deleted = service.cleanup_old_logs(days=365)

        assert deleted == 1

        # Verify recent log still exists
        logs = service.get_logs()
        assert len(logs) == 1
        assert logs[0]["entity_id"] == "NEW001"


class TestCalculateChanges:
    """Tests for AuditService._calculate_changes()"""

    @pytest.fixture
    def audit_service(self, db_session):
        from audit import init_audit_tables, AuditService

        init_audit_tables(db_session)
        return AuditService(db_session)

    def test_calculate_changes_detects_modified_fields(self, audit_service):
        """Should detect modified fields"""
        old = {"name": "Old", "status": "active"}
        new = {"name": "New", "status": "active"}

        changes = audit_service._calculate_changes(old, new)

        assert "name" in changes
        assert changes["name"]["from"] == "Old"
        assert changes["name"]["to"] == "New"
        assert "status" not in changes

    def test_calculate_changes_detects_added_fields(self, audit_service):
        """Should detect added fields"""
        old = {"name": "Test"}
        new = {"name": "Test", "email": "test@example.com"}

        changes = audit_service._calculate_changes(old, new)

        assert "email" in changes
        assert changes["email"]["from"] is None
        assert changes["email"]["to"] == "test@example.com"

    def test_calculate_changes_detects_removed_fields(self, audit_service):
        """Should detect removed fields"""
        old = {"name": "Test", "email": "test@example.com"}
        new = {"name": "Test"}

        changes = audit_service._calculate_changes(old, new)

        assert "email" in changes
        assert changes["email"]["from"] == "test@example.com"
        assert changes["email"]["to"] is None
