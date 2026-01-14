"""
Tests for Agent Commissions System (仲介手数料)
Tests the commission calculation logic for recruitment agents like Maruyama-san.

Commission Rules (Updated 2026-01):
- Vietnamese employees with (absence + yukyu) <= 5 days: ¥10,000
- Vietnamese employees with (absence + yukyu) >= 6 days: ¥5,000
- Non-Vietnamese employees: ¥5,000 (always)
- Monthly cap: Maximum ¥300,000 per month (if total exceeds, pay only ¥300,000)
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
    """Tests for commission calculation logic with new threshold rules"""

    @pytest.fixture
    def setup_employees_and_payroll(self, db_session):
        """Create test employees and payroll records for new rules"""
        cursor = db_session.cursor()

        # Create test employees
        employees = [
            # Vietnamese employees for testing threshold (5 days rule)
            ("VN001", "グエン・タン", "Vietnam", "加藤木材", "active"),   # 0 days -> normal
            ("VN002", "ファム・ミン", "Vietnam", "加藤木材", "active"),   # 2 days -> normal
            ("VN003", "レ・ホン", "Vietnam", "加藤木材", "active"),       # 5 days -> normal (edge case)
            ("VN004", "トラン・ビン", "Vietnam", "加藤木材", "active"),   # 6 days -> reduced (edge case)
            ("VN005", "ホアン・ドゥック", "Vietnam", "加藤木材", "active"), # 10 days -> reduced
            # Non-Vietnamese
            ("JP001", "田中太郎", "Japan", "加藤木材", "active"),
            ("US001", "John Smith", "American", "加藤木材", "active"),
            # Different company
            ("VN006", "グエン・ヴァン", "Vietnam", "他社", "active"),
        ]

        for emp_id, name, nationality, company, status in employees:
            cursor.execute("""
                INSERT OR REPLACE INTO employees
                (employee_id, name, nationality, dispatch_company, status, hourly_rate, billing_rate)
                VALUES (?, ?, ?, ?, ?, 1000, 1500)
            """, (emp_id, name, nationality, company, status))

        # Create payroll records for 2025年1月
        # Format: (emp_id, period, paid_leave, absence, work_days)
        payroll_records = [
            # Vietnamese - testing threshold rule (absence + yukyu)
            ("VN001", "2025年1月", 0, 0, 20),   # 0 days total -> normal ¥10,000
            ("VN002", "2025年1月", 2, 0, 18),   # 2 days total -> normal ¥10,000
            ("VN003", "2025年1月", 3, 2, 15),   # 5 days total -> normal ¥10,000 (edge: <= 5)
            ("VN004", "2025年1月", 3, 3, 14),   # 6 days total -> reduced ¥5,000 (edge: >= 6)
            ("VN005", "2025年1月", 5, 5, 10),   # 10 days total -> reduced ¥5,000
            # Japanese - always other rate
            ("JP001", "2025年1月", 0, 0, 20),
            # American - always other rate
            ("US001", "2025年1月", 1, 1, 18),
            # Vietnamese at different company
            ("VN006", "2025年1月", 0, 0, 20),
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

    def test_vietnamese_normal_rate_zero_days(self, setup_employees_and_payroll):
        """Vietnamese with 0 absence+yukyu days gets ¥10,000"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        assert "error" not in result
        # VN001 has 0 days -> should be in vietnam_normal
        employees = result.get("employees", [])
        vn001 = next((e for e in employees if e["employee_id"] == "VN001"), None)
        assert vn001 is not None
        assert vn001["category"] == "vietnam_normal"
        assert vn001["rate"] == 10000

    def test_vietnamese_normal_rate_under_threshold(self, setup_employees_and_payroll):
        """Vietnamese with (absence+yukyu) <= 5 days gets ¥10,000"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        employees = result.get("employees", [])

        # VN002: 2 days total -> normal
        vn002 = next((e for e in employees if e["employee_id"] == "VN002"), None)
        assert vn002 is not None
        assert vn002["category"] == "vietnam_normal"
        assert vn002["rate"] == 10000

        # VN003: 5 days total (edge case) -> normal
        vn003 = next((e for e in employees if e["employee_id"] == "VN003"), None)
        assert vn003 is not None
        assert vn003["category"] == "vietnam_normal"
        assert vn003["rate"] == 10000

    def test_vietnamese_reduced_rate_at_threshold(self, setup_employees_and_payroll):
        """Vietnamese with (absence+yukyu) = 6 days gets ¥5,000"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        employees = result.get("employees", [])

        # VN004: 6 days total (edge case) -> reduced
        vn004 = next((e for e in employees if e["employee_id"] == "VN004"), None)
        assert vn004 is not None
        assert vn004["category"] == "vietnam_reduced"
        assert vn004["rate"] == 5000

    def test_vietnamese_reduced_rate_over_threshold(self, setup_employees_and_payroll):
        """Vietnamese with (absence+yukyu) > 6 days gets ¥5,000"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        employees = result.get("employees", [])

        # VN005: 10 days total -> reduced
        vn005 = next((e for e in employees if e["employee_id"] == "VN005"), None)
        assert vn005 is not None
        assert vn005["category"] == "vietnam_reduced"
        assert vn005["rate"] == 5000

    def test_non_vietnamese_always_other_rate(self, setup_employees_and_payroll):
        """Non-Vietnamese employees get ¥5,000 regardless of attendance"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        employees = result.get("employees", [])

        # JP001 should be 'other'
        jp001 = next((e for e in employees if e["employee_id"] == "JP001"), None)
        assert jp001 is not None
        assert jp001["category"] == "other"
        assert jp001["rate"] == 5000

        # US001 should be 'other'
        us001 = next((e for e in employees if e["employee_id"] == "US001"), None)
        assert us001 is not None
        assert us001["category"] == "other"
        assert us001["rate"] == 5000

    def test_company_filter_override(self, setup_employees_and_payroll):
        """Company filter should override default target companies"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)

        # Filter to different company
        result = service.calculate_commission("maruyama", "2025年1月", company_filter="他社")

        assert "error" not in result
        # Should only include VN006 from 他社
        employees = result.get("employees", [])
        assert len(employees) == 1
        assert employees[0]["employee_id"] == "VN006"

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

        employees = result.get("employees", [])
        test001 = next((e for e in employees if e["employee_id"] == "TEST001"), None)
        assert test001 is not None
        assert test001["category"] == "vietnam_normal"

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

    def test_summary_counts_correct(self, setup_employees_and_payroll):
        """Summary should have correct counts for each category"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        summary = result.get("summary", {})

        # Based on fixture:
        # VN001, VN002, VN003 -> vietnam_normal (3)
        # VN004, VN005 -> vietnam_reduced (2)
        # JP001, US001 -> other (2)
        assert summary.get("vietnam_normal", 0) == 3
        assert summary.get("vietnam_reduced", 0) == 2
        assert summary.get("other", 0) == 2
        assert summary.get("total_employees", 0) == 7

    def test_rules_include_threshold_days(self, setup_employees_and_payroll):
        """Rules should include threshold_days configuration"""
        from agent_commissions import AgentCommissionService

        db_session = setup_employees_and_payroll
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        rules = result.get("rules", {})
        assert "threshold_days" in rules
        assert rules["threshold_days"] == 5


class TestMonthlyCap:
    """Tests for monthly cap of ¥300,000"""

    @pytest.fixture
    def setup_many_employees(self, db_session):
        """Create many employees to exceed monthly cap"""
        cursor = db_session.cursor()

        # Create 35 Vietnamese employees (35 * ¥10,000 = ¥350,000 > cap)
        for i in range(35):
            emp_id = f"VN{i:03d}"
            cursor.execute("""
                INSERT OR REPLACE INTO employees
                (employee_id, name, nationality, dispatch_company, status, hourly_rate, billing_rate)
                VALUES (?, ?, 'Vietnam', '加藤木材', 'active', 1000, 1500)
            """, (emp_id, f"Employee {i}"))

            cursor.execute("""
                INSERT OR REPLACE INTO payroll_records
                (employee_id, period, paid_leave_days, absence_days, work_days,
                 work_hours, gross_salary, billing_amount, total_company_cost, gross_profit, profit_margin)
                VALUES (?, '2025年1月', 0, 0, 20, 160, 250000, 300000, 280000, 20000, 6.67)
            """, (emp_id,))

        db_session.commit()
        return db_session

    def test_monthly_cap_applied_when_exceeded(self, setup_many_employees):
        """Final amount should be capped at ¥300,000 when exceeded"""
        from agent_commissions import AgentCommissionService

        db_session = setup_many_employees
        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        summary = result.get("summary", {})

        # total_amount should be 35 * 10000 = 350000
        assert summary.get("total_amount", 0) == 350000
        # final_amount should be capped at 300000
        assert summary.get("final_amount", 0) == 300000
        # is_capped should be True
        assert summary.get("is_capped", False) is True
        # monthly_cap should be shown
        assert summary.get("monthly_cap") == 300000

    def test_monthly_cap_not_applied_when_under(self, db_session):
        """Final amount should equal total when under cap"""
        from agent_commissions import AgentCommissionService

        cursor = db_session.cursor()

        # Create 5 Vietnamese employees (5 * ¥10,000 = ¥50,000 < cap)
        for i in range(5):
            emp_id = f"VN{i:03d}"
            cursor.execute("""
                INSERT OR REPLACE INTO employees
                (employee_id, name, nationality, dispatch_company, status, hourly_rate, billing_rate)
                VALUES (?, ?, 'Vietnam', '加藤木材', 'active', 1000, 1500)
            """, (emp_id, f"Employee {i}"))

            cursor.execute("""
                INSERT OR REPLACE INTO payroll_records
                (employee_id, period, paid_leave_days, absence_days, work_days,
                 work_hours, gross_salary, billing_amount, total_company_cost, gross_profit, profit_margin)
                VALUES (?, '2025年1月', 0, 0, 20, 160, 250000, 300000, 280000, 20000, 6.67)
            """, (emp_id,))

        db_session.commit()

        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        summary = result.get("summary", {})

        # total_amount and final_amount should be equal (50000)
        assert summary.get("total_amount", 0) == 50000
        assert summary.get("final_amount", 0) == 50000
        # is_capped should be False
        assert summary.get("is_capped", True) is False

    def test_monthly_cap_at_exact_boundary(self, db_session):
        """Test when total equals exactly ¥300,000"""
        from agent_commissions import AgentCommissionService

        cursor = db_session.cursor()

        # Create 30 Vietnamese employees (30 * ¥10,000 = ¥300,000 = cap)
        for i in range(30):
            emp_id = f"VN{i:03d}"
            cursor.execute("""
                INSERT OR REPLACE INTO employees
                (employee_id, name, nationality, dispatch_company, status, hourly_rate, billing_rate)
                VALUES (?, ?, 'Vietnam', '加藤木材', 'active', 1000, 1500)
            """, (emp_id, f"Employee {i}"))

            cursor.execute("""
                INSERT OR REPLACE INTO payroll_records
                (employee_id, period, paid_leave_days, absence_days, work_days,
                 work_hours, gross_salary, billing_amount, total_company_cost, gross_profit, profit_margin)
                VALUES (?, '2025年1月', 0, 0, 20, 160, 250000, 300000, 280000, 20000, 6.67)
            """, (emp_id,))

        db_session.commit()

        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        summary = result.get("summary", {})

        # At exact cap, is_capped should be False (not > cap)
        assert summary.get("total_amount", 0) == 300000
        assert summary.get("final_amount", 0) == 300000
        assert summary.get("is_capped", True) is False

    def test_rules_include_monthly_cap(self, db_session):
        """Rules should include monthly_cap configuration"""
        from agent_commissions import AgentCommissionService

        service = AgentCommissionService(db_session)
        result = service.calculate_commission("maruyama", "2025年1月")

        rules = result.get("rules", {})
        assert "monthly_cap" in rules
        assert rules["monthly_cap"] == 300000


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
