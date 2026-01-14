"""
Tests for Agent Commissions System (仲介手数料)
Tests the commission calculation logic for recruitment agents like Maruyama-san.

Commission Rules:
- Vietnamese employee, no absence/yukyu: ¥10,000
- Vietnamese employee, with absence/yukyu: ¥5,000
- Non-Vietnamese employees: ¥5,000 (always)
"""

import pytest
from datetime import datetime


class TestGetAvailableAgents:
    """Tests for AgentCommissionService.get_available_agents()"""

    def test_returns_list_of_agents(self, db_session):
        """Should return list of configured agents"""
        from agent_commissions import AgentCommissionService

        service = AgentCommissionService(db_session)
        agents = service.get_available_agents()

        assert isinstance(agents, list)
        assert len(agents) >= 1

    def test_agent_has_required_fields(self, db_session):
        """Each agent should have id, name, display_name, target_companies"""
        from agent_commissions import AgentCommissionService

        service = AgentCommissionService(db_session)
        agents = service.get_available_agents()

        for agent in agents:
            assert "id" in agent
            assert "name" in agent
            assert "display_name" in agent or "name" in agent
            assert "target_companies" in agent

    def test_maruyama_agent_exists(self, db_session):
        """Maruyama agent should be configured"""
        from agent_commissions import AgentCommissionService

        service = AgentCommissionService(db_session)
        agents = service.get_available_agents()

        agent_ids = [a["id"] for a in agents]
        assert "maruyama" in agent_ids

    def test_maruyama_targets_kato_mokuzai(self, db_session):
        """Maruyama agent should target 加藤木材"""
        from agent_commissions import AgentCommissionService

        service = AgentCommissionService(db_session)
        agents = service.get_available_agents()

        maruyama = next((a for a in agents if a["id"] == "maruyama"), None)
        assert maruyama is not None
        assert "加藤木材" in maruyama["target_companies"]


class TestCalculateCommission:
    """Tests for commission calculation logic"""

    @pytest.fixture
    def setup_employees_and_payroll(self, db_session):
        """Create test employees and payroll records"""
        cursor = db_session.cursor()

        # Create test employees
        employees = [
            ("VN001", "グエン・タン", "Vietnam", "加藤木材", "active"),
            ("VN002", "ファム・ミン", "Vietnam", "加藤木材", "active"),
            ("VN003", "レ・ホン", "Vietnam", "加藤木材", "active"),
            ("JP001", "田中太郎", "Japan", "加藤木材", "active"),
            ("US001", "John Smith", "American", "加藤木材", "active"),
            ("VN004", "トラン・ビン", "Vietnam", "他社", "active"),  # Different company
        ]

        for emp_id, name, nationality, company, status in employees:
            cursor.execute("""
                INSERT OR REPLACE INTO employees
                (employee_id, name, nationality, dispatch_company, status, hourly_rate, billing_rate)
                VALUES (?, ?, ?, ?, ?, 1000, 1500)
            """, (emp_id, name, nationality, company, status))

        # Create payroll records for 2025年1月
        payroll_records = [
            # Vietnamese - normal (no absence, no paid leave)
            ("VN001", "2025年1月", 0, 0, 20),
            # Vietnamese - reduced (has paid leave)
            ("VN002", "2025年1月", 2, 0, 18),
            # Vietnamese - reduced (has absence)
            ("VN003", "2025年1月", 0, 1, 19),
            # Japanese - always other rate
            ("JP001", "2025年1月", 0, 0, 20),
            # American - always other rate
            ("US001", "2025年1月", 1, 1, 18),
            # Vietnamese at different company
            ("VN004", "2025年1月", 0, 0, 20),
        ]

        for emp_id, period, paid_leave, absence, work_days in payroll_records:
            cursor.execute("""
                INSERT OR REPLACE INTO payroll_records
                (employee_id, period, paid_leave_days, absence_days, work_days,
                 work_hours, gross_salary, billing_amount, total_company_cost, gross_profit, profit_margin)
                VALUES (?, ?, ?, ?, ?, 160, 250000, 300000, 280000, 20000, 6.67)
            """, (emp_id, period, paid_leave, absence, work_days))

        db_session.commit()
        return db_session

    def test_unknown_agent_returns_error(self, db_session):
        """Unknown agent ID should return error"""
        from agent_commissions import AgentCommissionService

        service = AgentCommissionService(db_session)
        result = service.calculate_commission("unknown_agent", "2025年1月")

        assert "error" in result
        assert "unknown" in result["error"].lower() or "Unknown" in result["error"]

    def test_vietnamese_normal_rate(self, setup_employees_and_payroll):
        """Vietnamese employee with no absence/yukyu gets ¥10,000"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        assert "error" not in result
        assert result["agent_id"] == "maruyama"

        # Summary contains counts as integers directly
        summary = result.get("summary", {})
        vietnam_normal_count = summary.get("vietnam_normal", 0)
        assert vietnam_normal_count >= 1

    def test_vietnamese_reduced_rate_with_paid_leave(self, setup_employees_and_payroll):
        """Vietnamese employee with paid leave gets ¥5,000"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        # VN002 has paid_leave_days=2, should be reduced
        summary = result.get("summary", {})
        vietnam_reduced_count = summary.get("vietnam_reduced", 0)
        assert vietnam_reduced_count >= 1

    def test_vietnamese_reduced_rate_with_absence(self, setup_employees_and_payroll):
        """Vietnamese employee with absence gets ¥5,000"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        # VN003 has absence_days=1, should be reduced
        summary = result.get("summary", {})
        vietnam_reduced_count = summary.get("vietnam_reduced", 0)
        assert vietnam_reduced_count >= 1

    def test_non_vietnamese_always_other_rate(self, setup_employees_and_payroll):
        """Non-Vietnamese employees get ¥5,000 regardless of attendance"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        # JP001 and US001 should be in 'other' category
        summary = result.get("summary", {})
        other_count = summary.get("other", 0)
        assert other_count >= 2

    def test_company_filter_override(self, setup_employees_and_payroll):
        """Company filter should override default target companies"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)

        # Filter to different company
        result = service.calculate_commission("maruyama", "2025年1月", company_filter="他社")

        assert "error" not in result
        # Should only include VN004 from 他社

    def test_empty_period_returns_zero(self, db_session):
        """Period with no payroll records should return zero totals"""
        from agent_commissions import AgentCommissionService

        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2030年1月")  # Future period

        assert "error" not in result
        summary = result.get("summary", {})
        total_amount = summary.get("total_amount", 0)
        assert total_amount == 0

    def test_nationality_case_insensitive(self, db_session):
        """Nationality check should be case-insensitive"""
        from agent_commissions import AgentCommissionService

        cursor = db_session.cursor()

        # Create employee with lowercase vietnam
        cursor.execute("""
            INSERT INTO employees
            (employee_id, name, nationality, dispatch_company, status, hourly_rate, billing_rate)
            VALUES ('TEST001', 'Test', 'vietnam', '加藤木材', 'active', 1000, 1500)
        """)

        cursor.execute("""
            INSERT INTO payroll_records
            (employee_id, period, paid_leave_days, absence_days, work_days,
             work_hours, gross_salary, billing_amount, total_company_cost, gross_profit, profit_margin)
            VALUES ('TEST001', '2025年1月', 0, 0, 20, 160, 250000, 300000, 280000, 20000, 6.67)
        """)
        db_session.commit()

        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        # Should be treated as Vietnamese
        summary = result.get("summary", {})
        vietnam_normal_count = summary.get("vietnam_normal", 0)
        assert vietnam_normal_count >= 1

    def test_total_amount_calculation(self, setup_employees_and_payroll):
        """Total amount should be sum of all employee commissions"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        summary = result.get("summary", {})
        rules = result.get("rules", {})

        # Get counts and rates
        vietnam_normal_count = summary.get("vietnam_normal", 0)
        vietnam_reduced_count = summary.get("vietnam_reduced", 0)
        other_count = summary.get("other", 0)

        # Get rates from rules
        normal_rate = rules.get("vietnam_normal_rate", 10000)
        reduced_rate = rules.get("vietnam_reduced_rate", 5000)
        other_rate = rules.get("other_rate", 5000)

        # Calculate expected total
        expected_total = (vietnam_normal_count * normal_rate +
                        vietnam_reduced_count * reduced_rate +
                        other_count * other_rate)

        # Verify total matches
        assert summary.get("total_amount", 0) == expected_total


class TestIsAlreadyRegistered:
    """Tests for checking if commission is already registered"""

    def test_not_registered_returns_false(self, db_session):
        """Should return False if not registered"""
        from agent_commissions import AgentCommissionService

        service = AgentCommissionService(db_session)
        result = service.is_already_registered("maruyama", "2025年1月", "加藤木材")

        assert result is False

    def test_registered_returns_true(self, db_session):
        """Should return True if already registered"""
        from agent_commissions import AgentCommissionService, init_agent_commissions_tables

        init_agent_commissions_tables(db_session)

        cursor = db_session.cursor()
        cursor.execute("""
            INSERT INTO agent_commission_records
            (agent_id, period, dispatch_company, registered_to_costs, calculated_at)
            VALUES ('maruyama', '2025年1月', '加藤木材', 1, datetime('now'))
        """)
        db_session.commit()

        service = AgentCommissionService(db_session)
        result = service.is_already_registered("maruyama", "2025年1月", "加藤木材")

        assert result is True


class TestGetCommissionHistory:
    """Tests for commission history retrieval"""

    def test_empty_history(self, db_session):
        """Should return empty list when no history"""
        from agent_commissions import AgentCommissionService, init_agent_commissions_tables

        init_agent_commissions_tables(db_session)

        service = AgentCommissionService(db_session)
        result = service.get_commission_history()

        assert isinstance(result, list)
        assert len(result) == 0

    def test_filter_by_agent(self, db_session):
        """Should filter history by agent_id"""
        from agent_commissions import AgentCommissionService, init_agent_commissions_tables

        init_agent_commissions_tables(db_session)

        cursor = db_session.cursor()
        cursor.execute("""
            INSERT INTO agent_commission_records
            (agent_id, period, dispatch_company, total_amount, calculated_at)
            VALUES ('maruyama', '2025年1月', '加藤木材', 30000, datetime('now'))
        """)
        cursor.execute("""
            INSERT INTO agent_commission_records
            (agent_id, period, dispatch_company, total_amount, calculated_at)
            VALUES ('other_agent', '2025年1月', '他社', 10000, datetime('now'))
        """)
        db_session.commit()

        service = AgentCommissionService(db_session)
        result = service.get_commission_history(agent_id="maruyama")

        assert len(result) == 1
        assert result[0]["agent_id"] == "maruyama"

    def test_filter_by_period(self, db_session):
        """Should filter history by period"""
        from agent_commissions import AgentCommissionService, init_agent_commissions_tables

        init_agent_commissions_tables(db_session)

        cursor = db_session.cursor()
        cursor.execute("""
            INSERT INTO agent_commission_records
            (agent_id, period, dispatch_company, total_amount, calculated_at)
            VALUES ('maruyama', '2025年1月', '加藤木材', 30000, datetime('now'))
        """)
        cursor.execute("""
            INSERT INTO agent_commission_records
            (agent_id, period, dispatch_company, total_amount, calculated_at)
            VALUES ('maruyama', '2025年2月', '加藤木材', 35000, datetime('now'))
        """)
        db_session.commit()

        service = AgentCommissionService(db_session)
        result = service.get_commission_history(period="2025年1月")

        assert len(result) == 1
        assert result[0]["period"] == "2025年1月"
