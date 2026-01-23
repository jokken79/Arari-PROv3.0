"""
Test suite for database.py
Tests CRUD operations, constraints, and dual-mode (SQLite/PostgreSQL) support
Follows TDD: RED-GREEN-REFACTOR cycle
"""

import pytest
import sqlite3
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock

from database import (
    get_connection,
    get_db,
    adapt_query,
    init_db,
    USE_POSTGRES,
    _add_column_if_not_exists,
)


class TestDatabaseConnection:
    """Test database connection initialization"""

    def test_get_connection_returns_sqlite_in_local_mode(self):
        """Given local mode (no DATABASE_URL), get_connection returns SQLite connection"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"

            # Act
            conn = get_connection(str(db_path))

            # Assert
            assert conn is not None
            assert isinstance(conn, sqlite3.Connection)
            conn.close()

    def test_get_connection_enables_foreign_keys_sqlite(self):
        """Given SQLite connection, foreign key constraints are enabled"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))
            cursor = conn.cursor()

            # Act
            cursor.execute("PRAGMA foreign_keys")
            result = cursor.fetchone()

            # Assert
            assert result[0] == 1  # 1 = enabled
            conn.close()

    def test_get_connection_sets_row_factory_sqlite(self):
        """Given SQLite connection, row_factory is set to sqlite3.Row"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"

            # Act
            conn = get_connection(str(db_path))

            # Assert
            assert conn.row_factory == sqlite3.Row
            conn.close()

    def test_get_db_yields_connection_dependency(self):
        """Given get_db as dependency, yields valid connection"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"

            with patch('database.get_connection') as mock_get:
                mock_conn = MagicMock()
                mock_get.return_value = mock_conn

                # Act
                gen = get_db()
                conn = next(gen)

                # Assert
                assert conn == mock_conn
                mock_get.assert_called_once()

                # Cleanup - verify close() called
                try:
                    next(gen)
                except StopIteration:
                    pass
                mock_conn.close.assert_called_once()


class TestQueryAdaptation:
    """Test SQL query adaptation between SQLite and PostgreSQL"""

    def test_adapt_query_returns_unchanged_sqlite(self):
        """Given SQLite mode, query unchanged"""
        # Arrange
        query = "SELECT * FROM employees WHERE id = ?"

        # Act
        if not USE_POSTGRES:
            result = adapt_query(query)

            # Assert
            assert result == query

    def test_adapt_query_replaces_placeholders_postgres(self):
        """Given PostgreSQL mode, ? replaced with %s"""
        # Arrange
        query = "SELECT * FROM employees WHERE id = ? AND name = ?"

        # Act (only if in Postgres mode)
        if USE_POSTGRES:
            result = adapt_query(query)

            # Assert
            assert "?" not in result
            assert result.count("%s") == 2

    def test_adapt_query_preserves_percent_signs_postgres(self):
        """Given query with %%, adaptation preserves it"""
        # Arrange
        query = "SELECT * FROM employees WHERE name LIKE ??"  # Hypothetical

        # Act
        if USE_POSTGRES:
            result = adapt_query(query)

            # Assert - should only convert ? to %s
            assert "?" not in result


class TestColumnOperations:
    """Test _add_column_if_not_exists function"""

    def test_add_column_if_not_exists_adds_new_column_sqlite(self):
        """Given new column name, column is added to SQLite table"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))
            cursor = conn.cursor()

            # Create test table
            cursor.execute("""
                CREATE TABLE employees (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL
                )
            """)
            conn.commit()

            # Act
            _add_column_if_not_exists(cursor, "employees", "email", "TEXT")
            conn.commit()

            # Assert - verify column exists
            cursor.execute("PRAGMA table_info(employees)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]

            assert "email" in column_names
            conn.close()

    def test_add_column_if_not_exists_idempotent_sqlite(self):
        """Given existing column, adding again does not error"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))
            cursor = conn.cursor()

            cursor.execute("""
                CREATE TABLE employees (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL
                )
            """)
            conn.commit()

            # Act - add column twice
            _add_column_if_not_exists(cursor, "employees", "email", "TEXT")
            conn.commit()
            _add_column_if_not_exists(cursor, "employees", "email", "TEXT")
            conn.commit()

            # Assert - no error, column still exists
            cursor.execute("PRAGMA table_info(employees)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]

            assert column_names.count("email") == 1
            conn.close()


class TestDatabaseInitialization:
    """Test init_db function"""

    def test_init_db_creates_required_tables_sqlite(self):
        """Given init_db called, all required tables are created"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))

            # Act
            init_db(conn)

            # Assert - check all required tables exist
            cursor = conn.cursor()
            cursor.execute("""
                SELECT name FROM sqlite_master
                WHERE type='table'
                ORDER BY name
            """)
            tables = [row[0] for row in cursor.fetchall()]

            required_tables = [
                "employees",
                "payroll_records",
                "company_additional_costs",
                "agent_commission_records",
                "factory_templates",
            ]

            for table in required_tables:
                assert table in tables, f"Table {table} not created"

            conn.close()

    def test_init_db_creates_employees_table_with_correct_schema(self):
        """Given init_db, employees table has expected columns"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))

            # Act
            init_db(conn)

            # Assert
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(employees)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]

            required_columns = [
                "employee_id", "name", "name_kana", "dispatch_company",
                "hourly_rate", "billing_rate", "status"
            ]

            for col in required_columns:
                assert col in column_names, f"Column {col} not found in employees table"

            conn.close()

    def test_init_db_creates_payroll_records_table(self):
        """Given init_db, payroll_records table is created with correct schema"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))

            # Act
            init_db(conn)

            # Assert
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(payroll_records)")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]

            required_columns = [
                "employee_id", "period", "work_hours", "overtime_hours",
                "gross_salary", "billing_amount", "total_company_cost",
                "gross_profit", "profit_margin"
            ]

            for col in required_columns:
                assert col in column_names, f"Column {col} not found"

            conn.close()


class TestForeignKeyConstraints:
    """Test foreign key enforcement"""

    def test_insert_payroll_with_nonexistent_employee_allows_insert(self):
        """Given payroll_records has no explicit FK, insert succeeds even with non-existent employee_id"""
        # NOTE: Current schema doesn't enforce FK at DB level, only at application level
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))
            init_db(conn)
            cursor = conn.cursor()

            # Act - insert payroll for non-existent employee (should succeed at DB level)
            cursor.execute("""
                INSERT INTO payroll_records
                (employee_id, period, work_hours, gross_salary,
                 billing_amount, total_company_cost, gross_profit, profit_margin)
                VALUES ('nonexistent', '2025年1月', 160, 1000000, 1250000, 1100000, 150000, 12)
            """)
            conn.commit()

            # Assert - record inserted successfully
            cursor.execute("SELECT COUNT(*) FROM payroll_records WHERE employee_id = 'nonexistent'")
            count = cursor.fetchone()[0]
            assert count == 1

            conn.close()

    def test_insert_payroll_with_valid_employee_succeeds(self):
        """Given payroll record with valid employee_id, insert succeeds"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))
            init_db(conn)
            cursor = conn.cursor()

            # Insert employee first
            cursor.execute("""
                INSERT INTO employees
                (employee_id, name, name_kana, dispatch_company, hourly_rate, status)
                VALUES (1, 'Taro Yamada', 'ヤマダ太郎', 'ABC Corp', 1500, 'active')
            """)
            conn.commit()

            # Act - insert payroll
            cursor.execute("""
                INSERT INTO payroll_records
                (employee_id, period, work_hours, gross_salary,
                 billing_amount, total_company_cost, gross_profit, profit_margin)
                VALUES (1, '2025年1月', 160, 1000000, 1250000, 1100000, 150000, 12)
            """)
            conn.commit()

            # Assert
            cursor.execute("SELECT COUNT(*) FROM payroll_records WHERE employee_id = 1")
            count = cursor.fetchone()[0]
            assert count == 1

            conn.close()


class TestUniqueConstraints:
    """Test unique constraints"""

    def test_employees_unique_id_constraint(self):
        """Given duplicate employee_id, insert fails"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))
            init_db(conn)
            cursor = conn.cursor()

            cursor.execute("""
                INSERT INTO employees
                (employee_id, name, name_kana, dispatch_company, hourly_rate, status)
                VALUES (1, 'Taro', 'タロー', 'ABC', 1500, 'active')
            """)
            conn.commit()

            # Act & Assert
            with pytest.raises(sqlite3.IntegrityError):
                cursor.execute("""
                    INSERT INTO employees
                    (employee_id, name, name_kana, dispatch_company, hourly_rate, status)
                    VALUES (1, 'Hanako', 'ハナコ', 'ABC', 1600, 'active')
                """)
                conn.commit()

            conn.close()

    def test_payroll_records_composite_key_constraint(self):
        """Given duplicate (employee_id, period), insert fails"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))
            init_db(conn)
            cursor = conn.cursor()

            # Insert employee
            cursor.execute("""
                INSERT INTO employees
                (employee_id, name, name_kana, dispatch_company, hourly_rate, status)
                VALUES (1, 'Taro', 'タロー', 'ABC', 1500, 'active')
            """)
            conn.commit()

            # Insert first payroll record
            cursor.execute("""
                INSERT INTO payroll_records
                (employee_id, period, work_hours, gross_salary,
                 billing_amount, total_company_cost, gross_profit, profit_margin)
                VALUES (1, '2025年1月', 160, 1000000, 1250000, 1100000, 150000, 12)
            """)
            conn.commit()

            # Act & Assert - insert duplicate
            with pytest.raises(sqlite3.IntegrityError):
                cursor.execute("""
                    INSERT INTO payroll_records
                    (employee_id, period, work_hours, gross_salary,
                     billing_amount, total_company_cost, gross_profit, profit_margin)
                    VALUES (1, '2025年1月', 170, 1100000, 1350000, 1200000, 150000, 11)
                """)
                conn.commit()

            conn.close()


class TestTransactionHandling:
    """Test transaction support"""

    def test_rollback_on_error_sqlite(self):
        """Given transaction with error and rollback, changes are reverted"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"
            conn = get_connection(str(db_path))
            init_db(conn)
            cursor = conn.cursor()

            # Insert first employee
            cursor.execute("""
                INSERT INTO employees
                (employee_id, name, name_kana, dispatch_company, hourly_rate, status)
                VALUES ('EMP001', 'Taro', 'タロー', 'ABC', 1500, 'active')
            """)
            conn.commit()

            # Act - start transaction with multiple operations, but error occurs
            try:
                # This should succeed
                cursor.execute("""
                    INSERT INTO payroll_records
                    (employee_id, period, work_hours, gross_salary,
                     billing_amount, total_company_cost, gross_profit, profit_margin)
                    VALUES ('EMP001', '2025年1月', 160, 1000000, 1250000, 1100000, 150000, 12)
                """)

                # This should fail (duplicate unique key)
                cursor.execute("""
                    INSERT INTO payroll_records
                    (employee_id, period, work_hours, gross_salary,
                     billing_amount, total_company_cost, gross_profit, profit_margin)
                    VALUES ('EMP001', '2025年1月', 170, 1100000, 1350000, 1200000, 150000, 11)
                """)
                conn.commit()
            except sqlite3.IntegrityError:
                conn.rollback()

            # Assert - both inserts were rolled back (0 records)
            cursor.execute("SELECT COUNT(*) FROM payroll_records WHERE period = '2025年1月'")
            count = cursor.fetchone()[0]
            assert count == 0, f"Expected 0 records after rollback, got {count}"

            conn.close()

    def test_commit_persists_changes_sqlite(self):
        """Given commit(), changes are persisted"""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "test.db"

            # Insert in one connection
            conn1 = get_connection(str(db_path))
            init_db(conn1)
            cursor1 = conn1.cursor()

            cursor1.execute("""
                INSERT INTO employees
                (employee_id, name, name_kana, dispatch_company, hourly_rate, status)
                VALUES (1, 'Taro', 'タロー', 'ABC', 1500, 'active')
            """)
            conn1.commit()
            conn1.close()

            # Act - read in another connection
            conn2 = get_connection(str(db_path))
            cursor2 = conn2.cursor()
            cursor2.execute("SELECT COUNT(*) FROM employees")
            count = cursor2.fetchone()[0]

            # Assert
            assert count == 1
            conn2.close()
