"""
Tests for Additional Costs System (追加コスト)
Tests CRUD operations and aggregation for company-specific costs.

Cost Types:
- transport_bus: 送迎バス
- parking: 駐車場代
- facility: 施設利用費
- equipment: 設備費
- uniform: ユニフォーム
- training: 研修費
- meal: 食事補助
- other: その他
"""

import pytest
from datetime import datetime


class TestCostTypes:
    """Tests for cost type definitions"""

    def test_all_cost_types_defined(self, db_session):
        """All 8 cost types should be defined"""
        from additional_costs import COST_TYPES

        expected_types = [
            "transport_bus", "parking", "facility", "equipment",
            "uniform", "training", "meal", "other"
        ]

        for cost_type in expected_types:
            assert cost_type in COST_TYPES

    def test_cost_types_have_japanese_labels(self, db_session):
        """Each cost type should have a Japanese label"""
        from additional_costs import COST_TYPES

        expected_labels = {
            "transport_bus": "送迎バス",
            "parking": "駐車場代",
            "facility": "施設利用費",
            "equipment": "設備費",
            "uniform": "ユニフォーム",
            "training": "研修費",
            "meal": "食事補助",
            "other": "その他",
        }

        for cost_type, label in expected_labels.items():
            assert COST_TYPES.get(cost_type) == label


class TestCreateCost:
    """Tests for AdditionalCostsService.create_cost()"""

    @pytest.fixture
    def cost_service(self, db_session):
        """Initialize additional costs service"""
        from additional_costs import AdditionalCostsService, init_additional_costs_tables
        init_additional_costs_tables(db_session)
        return AdditionalCostsService(db_session)

    def test_create_cost_with_all_fields(self, cost_service):
        """Should create cost with all fields"""
        result = cost_service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="transport_bus",
            amount=50000.0,
            notes="Weekly shuttle service",
            created_by="admin"
        )

        assert "id" in result
        assert result["dispatch_company"] == "加藤木材"
        assert result["period"] == "2025年1月"
        assert result["cost_type"] == "transport_bus"
        assert result["amount"] == 50000.0
        assert result["notes"] == "Weekly shuttle service"

    def test_create_cost_with_minimal_fields(self, cost_service):
        """Should create cost with only required fields"""
        result = cost_service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="parking",
            amount=10000.0
        )

        assert "id" in result
        assert result["amount"] == 10000.0

    def test_create_cost_with_zero_amount(self, cost_service):
        """Should allow zero amount"""
        result = cost_service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="facility",
            amount=0.0
        )

        assert result["amount"] == 0.0

    def test_create_duplicate_returns_error(self, cost_service):
        """Should return error for duplicate (company, period, cost_type)"""
        # First create
        cost_service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="transport_bus",
            amount=50000.0
        )

        # Duplicate attempt
        result = cost_service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="transport_bus",
            amount=60000.0
        )

        assert "error" in result

    def test_cost_type_label_included(self, cost_service):
        """Response should include cost_type_label"""
        result = cost_service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="transport_bus",
            amount=50000.0
        )

        assert result.get("cost_type_label") == "送迎バス"

    @pytest.mark.parametrize("cost_type", [
        "transport_bus", "parking", "facility", "equipment",
        "uniform", "training", "meal", "other"
    ])
    def test_create_all_cost_types(self, cost_service, cost_type):
        """Should create costs for all 8 types"""
        result = cost_service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type=cost_type,
            amount=10000.0
        )

        assert "id" in result
        assert result["cost_type"] == cost_type


class TestGetCost:
    """Tests for AdditionalCostsService.get_cost()"""

    @pytest.fixture
    def cost_service_with_data(self, db_session):
        """Initialize service and create test data"""
        from additional_costs import AdditionalCostsService, init_additional_costs_tables
        init_additional_costs_tables(db_session)
        service = AdditionalCostsService(db_session)

        # Create a test cost
        created = service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="transport_bus",
            amount=50000.0,
            notes="Test cost"
        )

        return service, created["id"]

    def test_get_existing_cost(self, cost_service_with_data):
        """Should return cost by ID"""
        service, cost_id = cost_service_with_data

        result = service.get_cost(cost_id)

        assert result is not None
        assert result["id"] == cost_id
        assert result["dispatch_company"] == "加藤木材"

    def test_get_nonexistent_cost(self, cost_service_with_data):
        """Should return None for non-existent ID"""
        service, _ = cost_service_with_data

        result = service.get_cost(99999)

        assert result is None


class TestUpdateCost:
    """Tests for AdditionalCostsService.update_cost()"""

    @pytest.fixture
    def cost_service_with_data(self, db_session):
        """Initialize service and create test data"""
        from additional_costs import AdditionalCostsService, init_additional_costs_tables
        init_additional_costs_tables(db_session)
        service = AdditionalCostsService(db_session)

        created = service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="transport_bus",
            amount=50000.0
        )

        return service, created["id"]

    def test_update_amount(self, cost_service_with_data):
        """Should update amount only"""
        service, cost_id = cost_service_with_data

        result = service.update_cost(cost_id, amount=60000.0)

        assert result["amount"] == 60000.0

    def test_update_notes(self, cost_service_with_data):
        """Should update notes only"""
        service, cost_id = cost_service_with_data

        result = service.update_cost(cost_id, notes="Updated notes")

        assert result["notes"] == "Updated notes"

    def test_update_nonexistent_returns_error(self, cost_service_with_data):
        """Should return error for non-existent ID"""
        service, _ = cost_service_with_data

        result = service.update_cost(99999, amount=10000.0)

        assert "error" in result


class TestDeleteCost:
    """Tests for AdditionalCostsService.delete_cost()"""

    @pytest.fixture
    def cost_service_with_data(self, db_session):
        """Initialize service and create test data"""
        from additional_costs import AdditionalCostsService, init_additional_costs_tables
        init_additional_costs_tables(db_session)
        service = AdditionalCostsService(db_session)

        created = service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="transport_bus",
            amount=50000.0
        )

        return service, created["id"]

    def test_delete_existing_cost(self, cost_service_with_data):
        """Should delete and return deleted cost"""
        service, cost_id = cost_service_with_data

        result = service.delete_cost(cost_id)

        assert result["status"] == "deleted"
        assert result["deleted"]["id"] == cost_id

        # Verify deleted
        assert service.get_cost(cost_id) is None

    def test_delete_nonexistent_returns_error(self, cost_service_with_data):
        """Should return error for non-existent ID"""
        service, _ = cost_service_with_data

        result = service.delete_cost(99999)

        assert "error" in result


class TestGetCostsByCompany:
    """Tests for AdditionalCostsService.get_costs_by_company()"""

    @pytest.fixture
    def multi_cost_service(self, db_session):
        """Initialize service with multiple costs"""
        from additional_costs import AdditionalCostsService, init_additional_costs_tables
        init_additional_costs_tables(db_session)
        service = AdditionalCostsService(db_session)

        # Create costs for multiple companies and periods
        costs_data = [
            ("加藤木材", "2025年1月", "transport_bus", 50000),
            ("加藤木材", "2025年1月", "parking", 10000),
            ("加藤木材", "2025年2月", "transport_bus", 55000),
            ("他社", "2025年1月", "transport_bus", 30000),
        ]

        for company, period, cost_type, amount in costs_data:
            service.create_cost(
                dispatch_company=company,
                period=period,
                cost_type=cost_type,
                amount=amount
            )

        return service

    def test_get_costs_for_company(self, multi_cost_service):
        """Should return all costs for a company"""
        result = multi_cost_service.get_costs_by_company("加藤木材")

        assert len(result) == 3
        for cost in result:
            assert cost["dispatch_company"] == "加藤木材"

    def test_get_costs_for_company_and_period(self, multi_cost_service):
        """Should filter by company and period"""
        result = multi_cost_service.get_costs_by_company("加藤木材", period="2025年1月")

        assert len(result) == 2
        for cost in result:
            assert cost["dispatch_company"] == "加藤木材"
            assert cost["period"] == "2025年1月"

    def test_get_costs_empty_company(self, multi_cost_service):
        """Should return empty list for company with no costs"""
        result = multi_cost_service.get_costs_by_company("存在しない会社")

        assert result == []


class TestGetTotalCostsByCompany:
    """Tests for AdditionalCostsService.get_total_costs_by_company()"""

    @pytest.fixture
    def multi_cost_service(self, db_session):
        """Initialize service with multiple costs"""
        from additional_costs import AdditionalCostsService, init_additional_costs_tables
        init_additional_costs_tables(db_session)
        service = AdditionalCostsService(db_session)

        costs_data = [
            ("加藤木材", "2025年1月", "transport_bus", 50000),
            ("加藤木材", "2025年1月", "parking", 10000),
            ("加藤木材", "2025年2月", "transport_bus", 55000),
        ]

        for company, period, cost_type, amount in costs_data:
            service.create_cost(
                dispatch_company=company,
                period=period,
                cost_type=cost_type,
                amount=amount
            )

        return service

    def test_total_all_periods(self, multi_cost_service):
        """Should sum all costs for company across periods"""
        result = multi_cost_service.get_total_costs_by_company("加藤木材")

        # 50000 + 10000 + 55000 = 115000
        assert result == 115000.0

    def test_total_single_period(self, multi_cost_service):
        """Should sum costs for company in specific period"""
        result = multi_cost_service.get_total_costs_by_company("加藤木材", period="2025年1月")

        # 50000 + 10000 = 60000
        assert result == 60000.0

    def test_total_no_costs(self, multi_cost_service):
        """Should return 0 for company with no costs"""
        result = multi_cost_service.get_total_costs_by_company("存在しない会社")

        assert result == 0.0


class TestCopyToPeriod:
    """Tests for AdditionalCostsService.copy_costs_to_period()"""

    @pytest.fixture
    def cost_service_with_source(self, db_session):
        """Initialize service with source period costs"""
        from additional_costs import AdditionalCostsService, init_additional_costs_tables
        init_additional_costs_tables(db_session)
        service = AdditionalCostsService(db_session)

        # Create source costs
        service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="transport_bus",
            amount=50000.0,
            notes="Source cost"
        )
        service.create_cost(
            dispatch_company="加藤木材",
            period="2025年1月",
            cost_type="parking",
            amount=10000.0
        )

        return service

    def test_copy_costs_no_adjustment(self, cost_service_with_source):
        """Should copy costs with no percentage adjustment"""
        result = cost_service_with_source.copy_costs_to_period(
            source_period="2025年1月",
            target_period="2025年2月"
        )

        assert result["copied"] == 2
        assert result["skipped"] == 0

        # Verify amounts are same
        target_costs = cost_service_with_source.get_costs_by_company("加藤木材", "2025年2月")
        assert len(target_costs) == 2

    def test_copy_costs_with_increase(self, cost_service_with_source):
        """Should copy costs with 10% increase"""
        result = cost_service_with_source.copy_costs_to_period(
            source_period="2025年1月",
            target_period="2025年2月",
            adjust_percent=10
        )

        assert result["copied"] == 2

        # Verify amounts increased by 10%
        target_costs = cost_service_with_source.get_costs_by_company("加藤木材", "2025年2月")
        amounts = sorted([c["amount"] for c in target_costs])

        # 50000 * 1.10 = 55000, 10000 * 1.10 = 11000
        # Use approximate comparison for floating point
        assert amounts[0] == pytest.approx(11000.0, rel=1e-6)
        assert amounts[1] == pytest.approx(55000.0, rel=1e-6)

    def test_copy_costs_skips_existing(self, cost_service_with_source):
        """Should skip costs that already exist in target"""
        # First copy
        cost_service_with_source.copy_costs_to_period(
            source_period="2025年1月",
            target_period="2025年2月"
        )

        # Second copy (should skip)
        result = cost_service_with_source.copy_costs_to_period(
            source_period="2025年1月",
            target_period="2025年2月"
        )

        assert result["copied"] == 0
        assert result["skipped"] == 2

    def test_copy_costs_filter_by_company(self, cost_service_with_source):
        """Should only copy costs for specified company"""
        # Add cost for different company
        cost_service_with_source.create_cost(
            dispatch_company="他社",
            period="2025年1月",
            cost_type="transport_bus",
            amount=30000.0
        )

        result = cost_service_with_source.copy_costs_to_period(
            source_period="2025年1月",
            target_period="2025年2月",
            company="加藤木材"
        )

        assert result["copied"] == 2  # Only 加藤木材 costs

        # Verify 他社 not copied
        other_costs = cost_service_with_source.get_costs_by_company("他社", "2025年2月")
        assert len(other_costs) == 0


class TestGetCompaniesWithCosts:
    """Tests for AdditionalCostsService.get_companies_with_costs()"""

    @pytest.fixture
    def multi_company_service(self, db_session):
        """Initialize service with costs for multiple companies"""
        from additional_costs import AdditionalCostsService, init_additional_costs_tables
        init_additional_costs_tables(db_session)
        service = AdditionalCostsService(db_session)

        costs_data = [
            ("加藤木材", "2025年1月", "transport_bus", 50000),
            ("加藤木材", "2025年1月", "parking", 10000),
            ("加藤木材", "2025年1月", "meal", 5000),
            ("他社", "2025年1月", "transport_bus", 30000),
        ]

        for company, period, cost_type, amount in costs_data:
            service.create_cost(
                dispatch_company=company,
                period=period,
                cost_type=cost_type,
                amount=amount
            )

        return service

    def test_returns_summary_by_company(self, multi_company_service):
        """Should return summary for each company"""
        result = multi_company_service.get_companies_with_costs()

        assert len(result) == 2

        # Find 加藤木材
        kato = next((c for c in result if c["dispatch_company"] == "加藤木材"), None)
        assert kato is not None
        assert kato["cost_count"] == 3
        assert kato["total_amount"] == 65000.0

    def test_filter_by_period(self, multi_company_service):
        """Should filter by period"""
        # Add cost in different period
        multi_company_service.create_cost(
            dispatch_company="加藤木材",
            period="2025年2月",
            cost_type="transport_bus",
            amount=55000
        )

        result = multi_company_service.get_companies_with_costs(period="2025年1月")

        # Should only include 2025年1月 costs
        kato = next((c for c in result if c["dispatch_company"] == "加藤木材"), None)
        assert kato["total_amount"] == 65000.0  # Not 120000

    def test_ordered_by_total_amount_desc(self, multi_company_service):
        """Should order by total_amount descending"""
        result = multi_company_service.get_companies_with_costs()

        # 加藤木材 (65000) should be first, 他社 (30000) second
        assert result[0]["dispatch_company"] == "加藤木材"
        assert result[1]["dispatch_company"] == "他社"
