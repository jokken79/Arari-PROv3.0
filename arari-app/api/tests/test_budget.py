"""
Tests for Budget Management System
Tests CRUD operations, budget vs actual comparisons, and budget copying.
"""

import pytest
from datetime import datetime


class TestInitBudgetTables:
    """Tests for budget table initialization"""

    def test_creates_budgets_table(self, db_session):
        """Should create budgets table"""
        from budget import init_budget_tables

        init_budget_tables(db_session)

        cursor = db_session.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='budgets'"
        )
        assert cursor.fetchone() is not None

    def test_creates_budget_history_table(self, db_session):
        """Should create budget_history table"""
        from budget import init_budget_tables

        init_budget_tables(db_session)

        cursor = db_session.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='budget_history'"
        )
        assert cursor.fetchone() is not None

    def test_creates_indexes(self, db_session):
        """Should create required indexes"""
        from budget import init_budget_tables

        init_budget_tables(db_session)

        cursor = db_session.cursor()
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_budgets%'"
        )
        indexes = cursor.fetchall()
        assert len(indexes) >= 2  # period and entity indexes


class TestCreateBudget:
    """Tests for BudgetService.create_budget()"""

    @pytest.fixture
    def budget_service(self, db_session):
        from budget import init_budget_tables, BudgetService

        init_budget_tables(db_session)
        return BudgetService(db_session)

    def test_create_budget_basic(self, budget_service):
        """Should create a basic budget"""
        result = budget_service.create_budget(
            period="2025年1月",
            budget_revenue=1000000,
            budget_cost=800000,
        )

        assert "id" in result
        assert result["period"] == "2025年1月"
        assert result["budget_revenue"] == 1000000
        assert result["budget_cost"] == 800000

    def test_create_budget_calculates_profit(self, budget_service):
        """Should auto-calculate profit if not provided"""
        result = budget_service.create_budget(
            period="2025年1月",
            budget_revenue=1000000,
            budget_cost=800000,
        )

        assert result["budget_profit"] == 200000  # 1000000 - 800000

    def test_create_budget_calculates_margin(self, budget_service):
        """Should auto-calculate margin if not provided"""
        result = budget_service.create_budget(
            period="2025年1月",
            budget_revenue=1000000,
            budget_cost=800000,
        )

        assert result["budget_margin"] == 20.0  # (200000 / 1000000) * 100

    def test_create_budget_with_entity(self, budget_service):
        """Should create budget for specific entity"""
        result = budget_service.create_budget(
            period="2025年1月",
            entity_type="company",
            entity_id="加藤木材",
            budget_revenue=500000,
            budget_cost=400000,
        )

        assert result["entity_type"] == "company"
        assert result["entity_id"] == "加藤木材"

    def test_create_budget_duplicate_returns_error(self, budget_service):
        """Should return error for duplicate budget (same period/entity)"""
        # Create first budget with explicit entity_type
        budget_service.create_budget(
            period="2025年1月",
            entity_type="company",
            entity_id="加藤木材",
            budget_revenue=1000000,
            budget_cost=800000,
        )

        # Try to create duplicate with same period/entity_type/entity_id
        result = budget_service.create_budget(
            period="2025年1月",
            entity_type="company",
            entity_id="加藤木材",
            budget_revenue=500000,
            budget_cost=400000,
        )

        assert "error" in result

    def test_create_budget_zero_revenue_no_margin(self, budget_service):
        """Should handle zero revenue gracefully"""
        result = budget_service.create_budget(
            period="2025年1月",
            budget_revenue=0,
            budget_cost=0,
        )

        assert result["budget_margin"] is None or result["budget_margin"] == 0


class TestGetBudget:
    """Tests for BudgetService.get_budget()"""

    @pytest.fixture
    def budget_service_with_data(self, db_session):
        from budget import init_budget_tables, BudgetService

        init_budget_tables(db_session)
        service = BudgetService(db_session)

        # Create test budgets
        service.create_budget(
            period="2025年1月",
            entity_type="total",
            budget_revenue=1000000,
            budget_cost=800000,
        )
        service.create_budget(
            period="2025年1月",
            entity_type="company",
            entity_id="加藤木材",
            budget_revenue=500000,
            budget_cost=400000,
        )

        return service

    def test_get_budget_total(self, budget_service_with_data):
        """Should get total budget"""
        result = budget_service_with_data.get_budget("2025年1月")

        assert result is not None
        assert result["budget_revenue"] == 1000000

    def test_get_budget_company(self, budget_service_with_data):
        """Should get company-specific budget"""
        result = budget_service_with_data.get_budget(
            "2025年1月", entity_type="company", entity_id="加藤木材"
        )

        assert result is not None
        assert result["budget_revenue"] == 500000

    def test_get_budget_not_found(self, budget_service_with_data):
        """Should return None for non-existent budget"""
        result = budget_service_with_data.get_budget("2030年1月")

        assert result is None


class TestUpdateBudget:
    """Tests for BudgetService.update_budget()"""

    @pytest.fixture
    def budget_service_with_budget(self, db_session):
        from budget import init_budget_tables, BudgetService

        init_budget_tables(db_session)
        service = BudgetService(db_session)

        result = service.create_budget(
            period="2025年1月",
            budget_revenue=1000000,
            budget_cost=800000,
        )

        return service, result["id"]

    def test_update_budget_revenue(self, budget_service_with_budget):
        """Should update budget revenue"""
        service, budget_id = budget_service_with_budget

        result = service.update_budget(budget_id, budget_revenue=1500000)

        assert result["status"] == "updated"

        updated = service.get_budget("2025年1月")
        assert updated["budget_revenue"] == 1500000

    def test_update_budget_logs_history(self, budget_service_with_budget):
        """Should log changes to history"""
        service, budget_id = budget_service_with_budget

        service.update_budget(budget_id, budget_revenue=1500000, changed_by="admin")

        cursor = service.conn.cursor()
        cursor.execute("SELECT * FROM budget_history WHERE budget_id = ?", (budget_id,))
        history = cursor.fetchall()

        assert len(history) >= 1

    def test_update_budget_not_found(self, budget_service_with_budget):
        """Should return error for non-existent budget"""
        service, _ = budget_service_with_budget

        result = service.update_budget(9999, budget_revenue=1500000)

        assert "error" in result

    def test_update_budget_no_valid_fields(self, budget_service_with_budget):
        """Should return error when no valid fields"""
        service, budget_id = budget_service_with_budget

        result = service.update_budget(budget_id, invalid_field=123)

        assert "error" in result


class TestCompareBudgetVsActual:
    """Tests for budget vs actual comparison"""

    @pytest.fixture
    def budget_service_with_payroll(self, db_session):
        from budget import init_budget_tables, BudgetService

        init_budget_tables(db_session)
        cursor = db_session.cursor()

        # Create employee
        cursor.execute("""
            INSERT INTO employees (employee_id, name, dispatch_company, status, hourly_rate, billing_rate)
            VALUES ('EMP001', 'Test Employee', '加藤木材', 'active', 1000, 1500)
        """)

        # Create payroll record
        cursor.execute("""
            INSERT INTO payroll_records
            (employee_id, period, billing_amount, total_company_cost, gross_profit, profit_margin,
             work_hours, gross_salary)
            VALUES ('EMP001', '2025年1月', 300000, 250000, 50000, 16.67, 160, 200000)
        """)

        db_session.commit()

        service = BudgetService(db_session)

        # Create budget
        service.create_budget(
            period="2025年1月",
            entity_type="total",
            budget_revenue=350000,
            budget_cost=280000,
            budget_profit=70000,
            budget_margin=20.0,
        )

        return service

    def test_compare_returns_budget_and_actual(self, budget_service_with_payroll):
        """Should return both budget and actual data"""
        result = budget_service_with_payroll.compare_budget_vs_actual("2025年1月")

        assert "budget" in result
        assert "actual" in result
        assert result["budget"]["revenue"] == 350000
        assert result["actual"]["revenue"] == 300000

    def test_compare_calculates_variance(self, budget_service_with_payroll):
        """Should calculate variance correctly"""
        result = budget_service_with_payroll.compare_budget_vs_actual("2025年1月")

        assert "variance" in result
        assert result["variance"]["revenue"] == -50000  # 300000 - 350000
        assert result["variance"]["profit"] == -20000  # 50000 - 70000

    def test_compare_calculates_variance_pct(self, budget_service_with_payroll):
        """Should calculate variance percentage"""
        result = budget_service_with_payroll.compare_budget_vs_actual("2025年1月")

        assert "variance_pct" in result
        # -50000 / 350000 * 100 = -14.29%
        assert result["variance_pct"]["revenue"] == pytest.approx(-14.29, rel=0.01)

    def test_compare_determines_status(self, budget_service_with_payroll):
        """Should determine over_budget or on_track status"""
        result = budget_service_with_payroll.compare_budget_vs_actual("2025年1月")

        # Actual profit (50000) < Budget profit (70000)
        assert result["status"] == "over_budget"

    def test_compare_no_budget_returns_error(self, budget_service_with_payroll):
        """Should return error if no budget exists"""
        result = budget_service_with_payroll.compare_budget_vs_actual("2030年1月")

        assert "error" in result

    def test_compare_no_actual_data(self, budget_service_with_payroll):
        """Should handle missing actual data"""
        # Create budget for future period with no payroll
        budget_service_with_payroll.create_budget(
            period="2030年1月",
            budget_revenue=1000000,
            budget_cost=800000,
        )

        result = budget_service_with_payroll.compare_budget_vs_actual("2030年1月")

        assert result["actual"] is None
        assert "message" in result


class TestDeleteBudget:
    """Tests for BudgetService.delete_budget()"""

    @pytest.fixture
    def budget_service_with_budget(self, db_session):
        from budget import init_budget_tables, BudgetService

        init_budget_tables(db_session)
        service = BudgetService(db_session)

        result = service.create_budget(
            period="2025年1月",
            budget_revenue=1000000,
            budget_cost=800000,
        )

        return service, result["id"]

    def test_delete_budget_success(self, budget_service_with_budget):
        """Should delete budget successfully"""
        service, budget_id = budget_service_with_budget

        result = service.delete_budget(budget_id)

        assert result["status"] == "deleted"

    def test_delete_budget_removes_from_db(self, budget_service_with_budget):
        """Should remove budget from database"""
        service, budget_id = budget_service_with_budget

        service.delete_budget(budget_id)

        assert service.get_budget("2025年1月") is None

    def test_delete_budget_not_found(self, budget_service_with_budget):
        """Should return error for non-existent budget"""
        service, _ = budget_service_with_budget

        result = service.delete_budget(9999)

        assert "error" in result


class TestCopyBudgetToPeriod:
    """Tests for BudgetService.copy_budget_to_period()"""

    @pytest.fixture
    def budget_service_with_multiple(self, db_session):
        from budget import init_budget_tables, BudgetService

        init_budget_tables(db_session)
        service = BudgetService(db_session)

        # Create multiple budgets for source period
        service.create_budget(
            period="2025年1月",
            entity_type="total",
            budget_revenue=1000000,
            budget_cost=800000,
        )
        service.create_budget(
            period="2025年1月",
            entity_type="company",
            entity_id="加藤木材",
            budget_revenue=500000,
            budget_cost=400000,
        )

        return service

    def test_copy_budget_basic(self, budget_service_with_multiple):
        """Should copy budgets to new period"""
        result = budget_service_with_multiple.copy_budget_to_period(
            "2025年1月", "2025年2月"
        )

        assert result["budgets_copied"] == 2
        assert result["source_period"] == "2025年1月"
        assert result["target_period"] == "2025年2月"

    def test_copy_budget_with_adjustment(self, budget_service_with_multiple):
        """Should apply percentage adjustment when copying"""
        budget_service_with_multiple.copy_budget_to_period(
            "2025年1月", "2025年2月", adjustment_pct=10
        )

        new_budget = budget_service_with_multiple.get_budget("2025年2月")

        # 1000000 * 1.10 = 1100000
        assert new_budget["budget_revenue"] == 1100000

    def test_copy_budget_preserves_entity_types(self, budget_service_with_multiple):
        """Should preserve entity types when copying"""
        budget_service_with_multiple.copy_budget_to_period("2025年1月", "2025年2月")

        company_budget = budget_service_with_multiple.get_budget(
            "2025年2月", entity_type="company", entity_id="加藤木材"
        )

        assert company_budget is not None
        assert company_budget["entity_type"] == "company"


class TestGetBudgets:
    """Tests for BudgetService.get_budgets()"""

    @pytest.fixture
    def budget_service_with_multiple(self, db_session):
        from budget import init_budget_tables, BudgetService

        init_budget_tables(db_session)
        service = BudgetService(db_session)

        service.create_budget(period="2025年1月", budget_revenue=1000000, budget_cost=800000)
        service.create_budget(period="2025年2月", budget_revenue=1100000, budget_cost=850000)
        service.create_budget(
            period="2025年1月",
            entity_type="company",
            entity_id="加藤木材",
            budget_revenue=500000,
            budget_cost=400000,
        )

        return service

    def test_get_all_budgets(self, budget_service_with_multiple):
        """Should return all budgets"""
        result = budget_service_with_multiple.get_budgets()

        assert len(result) == 3

    def test_get_budgets_filter_by_period(self, budget_service_with_multiple):
        """Should filter by period"""
        result = budget_service_with_multiple.get_budgets(period="2025年1月")

        assert len(result) == 2  # total + company for January

    def test_get_budgets_filter_by_entity_type(self, budget_service_with_multiple):
        """Should filter by entity type"""
        result = budget_service_with_multiple.get_budgets(entity_type="company")

        assert len(result) == 1
        assert result[0]["entity_id"] == "加藤木材"


class TestGetBudgetSummary:
    """Tests for BudgetService.get_budget_summary()"""

    @pytest.fixture
    def budget_service_with_year_data(self, db_session):
        from budget import init_budget_tables, BudgetService

        init_budget_tables(db_session)
        cursor = db_session.cursor()

        # Create employees and payroll
        cursor.execute("""
            INSERT INTO employees (employee_id, name, dispatch_company, status, hourly_rate, billing_rate)
            VALUES ('EMP001', 'Test', '加藤木材', 'active', 1000, 1500)
        """)

        for month in ["1月", "2月"]:
            cursor.execute("""
                INSERT INTO payroll_records
                (employee_id, period, billing_amount, total_company_cost, gross_profit, profit_margin,
                 work_hours, gross_salary)
                VALUES ('EMP001', ?, 300000, 250000, 50000, 16.67, 160, 200000)
            """, (f"2025年{month}",))

        db_session.commit()

        service = BudgetService(db_session)

        # Create budgets
        service.create_budget(
            period="2025年1月", budget_revenue=350000, budget_cost=280000, budget_profit=70000
        )
        service.create_budget(
            period="2025年2月", budget_revenue=350000, budget_cost=280000, budget_profit=70000
        )

        return service

    def test_summary_returns_year_totals(self, budget_service_with_year_data):
        """Should return yearly totals"""
        result = budget_service_with_year_data.get_budget_summary(2025)

        assert result["year"] == 2025
        assert result["total_budget_profit"] == 140000  # 70000 * 2
        assert result["total_actual_profit"] == 100000  # 50000 * 2

    def test_summary_calculates_total_variance(self, budget_service_with_year_data):
        """Should calculate total variance"""
        result = budget_service_with_year_data.get_budget_summary(2025)

        # 100000 - 140000 = -40000
        assert result["total_variance"] == -40000

    def test_summary_determines_overall_status(self, budget_service_with_year_data):
        """Should determine overall status"""
        result = budget_service_with_year_data.get_budget_summary(2025)

        assert result["overall_status"] == "over_budget"
