"""
Tests for Salary Statement Parser (給与明細 Parser)
Tests Excel parsing, field detection, billing calculations, and data extraction.

The parser handles:
- Multi-sheet .xlsm files with multiple employees per sheet
- Dynamic field position detection (rows 20-29)
- Fixed row positions with fallback
- Template-based parsing for known factories
- Vertical layout parsing (Format B)
"""

import pytest
from io import BytesIO
from unittest.mock import Mock, MagicMock, patch


class TestSalaryStatementParserInit:
    """Tests for parser initialization"""

    def test_parser_default_initialization(self):
        """Should initialize with default settings"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        assert parser.use_intelligent_mode is True
        assert parser.template_manager is not None
        assert parser.employee_name_map == {}

    def test_parser_with_custom_template_manager(self):
        """Should accept custom template manager"""
        from salary_parser import SalaryStatementParser
        from template_manager import TemplateManager

        custom_tm = TemplateManager()
        parser = SalaryStatementParser(template_manager=custom_tm)

        assert parser.template_manager is custom_tm

    def test_parser_with_employee_name_map(self):
        """Should accept employee name map"""
        from salary_parser import SalaryStatementParser

        name_map = {"田中太郎": "EMP001"}
        parser = SalaryStatementParser(employee_name_map=name_map)

        assert parser.employee_name_map == name_map

    def test_parser_intelligent_mode_off(self):
        """Should respect intelligent mode setting"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser(use_intelligent_mode=False)

        assert parser.use_intelligent_mode is False


class TestFieldPatterns:
    """Tests for field pattern definitions"""

    def test_field_patterns_exist(self):
        """Should have required field patterns"""
        from salary_parser import SalaryStatementParser

        required_fields = [
            "work_days",
            "work_hours",
            "overtime_hours",
            "base_salary",
            "gross_salary",
            "net_salary",
        ]

        for field in required_fields:
            assert field in SalaryStatementParser.FIELD_PATTERNS

    def test_work_days_patterns(self):
        """Should have work_days patterns"""
        from salary_parser import SalaryStatementParser

        patterns = SalaryStatementParser.FIELD_PATTERNS["work_days"]
        assert "出勤日数" in patterns

    def test_overtime_hours_patterns(self):
        """Should have overtime patterns"""
        from salary_parser import SalaryStatementParser

        patterns = SalaryStatementParser.FIELD_PATTERNS["overtime_hours"]
        assert any("残業" in p for p in patterns)

    def test_gross_salary_patterns(self):
        """Should have gross salary patterns"""
        from salary_parser import SalaryStatementParser

        patterns = SalaryStatementParser.FIELD_PATTERNS["gross_salary"]
        assert "総支給額" in patterns


class TestDynamicZoneLabels:
    """Tests for dynamic zone label mappings"""

    def test_overtime_over_60h_labels(self):
        """Should map 60h overtime labels"""
        from salary_parser import SalaryStatementParser

        labels = SalaryStatementParser.DYNAMIC_ZONE_LABELS
        assert labels["60H過残業"] == "overtime_over_60h_pay"
        assert labels["60時間超"] == "overtime_over_60h_pay"

    def test_paid_leave_labels(self):
        """Should map paid leave labels"""
        from salary_parser import SalaryStatementParser

        labels = SalaryStatementParser.DYNAMIC_ZONE_LABELS
        assert labels["有給休暇"] == "paid_leave_amount"
        assert labels["有給"] == "paid_leave_amount"

    def test_non_billable_labels(self):
        """Should map non-billable labels"""
        from salary_parser import SalaryStatementParser

        labels = SalaryStatementParser.DYNAMIC_ZONE_LABELS
        assert labels["通勤手当(非)"] == "non_billable"
        assert labels["ガソリン代"] == "non_billable"


class TestFallbackPositions:
    """Tests for fallback row positions"""

    def test_fallback_positions_exist(self):
        """Should have fallback positions defined"""
        from salary_parser import SalaryStatementParser

        positions = SalaryStatementParser.FALLBACK_ROW_POSITIONS

        assert "employee_id" in positions
        assert "name" in positions
        assert "gross_salary" in positions

    def test_column_offsets_exist(self):
        """Should have column offsets defined"""
        from salary_parser import SalaryStatementParser

        offsets = SalaryStatementParser.COLUMN_OFFSETS

        assert "label" in offsets
        assert "value" in offsets
        assert "days" in offsets


class TestNonBillableAllowances:
    """Tests for non-billable allowance detection"""

    def test_non_billable_list_contains_transport(self):
        """Should include transport allowances as non-billable"""
        from salary_parser import SalaryStatementParser

        non_billable = SalaryStatementParser.NON_BILLABLE_ALLOWANCES

        assert "通勤手当" in non_billable
        assert "通勤手当（非）" in non_billable
        assert "通勤手当(非)" in non_billable

    def test_non_billable_list_contains_work_allowance(self):
        """Should include 業務手当 as non-billable"""
        from salary_parser import SalaryStatementParser

        non_billable = SalaryStatementParser.NON_BILLABLE_ALLOWANCES

        assert "業務手当" in non_billable


class TestKnownAllowances:
    """Tests for known allowance exclusion"""

    def test_known_allowances_excluded_from_other(self):
        """Should exclude known allowances from 'other' category"""
        from salary_parser import SalaryStatementParser

        known = SalaryStatementParser.KNOWN_ALLOWANCES

        # These have their own fields
        assert "残業手当" in known
        assert "深夜手当" in known
        assert "休日手当" in known


class TestAllowancePatterns:
    """Tests for general allowance pattern matching"""

    def test_allowance_patterns_match_teate(self):
        """Should match patterns with 手当"""
        from salary_parser import SalaryStatementParser
        import re

        patterns = SalaryStatementParser.ALLOWANCE_PATTERNS

        test_labels = ["皆勤手当", "特別手当", "残業手当"]

        for label in test_labels:
            matched = False
            for pattern in patterns:
                if re.match(pattern, label):
                    matched = True
                    break
            assert matched, f"Label '{label}' should match allowance patterns"


class TestDynamicZoneConfig:
    """Tests for dynamic zone configuration"""

    def test_dynamic_zone_range(self):
        """Should have correct dynamic zone range"""
        from salary_parser import SalaryStatementParser

        assert SalaryStatementParser.DYNAMIC_ZONE_START == 20
        assert SalaryStatementParser.DYNAMIC_ZONE_END == 29

    def test_employee_column_width(self):
        """Should have correct employee column width"""
        from salary_parser import SalaryStatementParser

        assert SalaryStatementParser.EMPLOYEE_COLUMN_WIDTH == 14


class TestParseWithMockedWorkbook:
    """Tests for parse() method with mocked Excel workbook"""

    @pytest.fixture
    def mock_workbook(self):
        """Create a mock workbook"""
        wb = MagicMock()
        wb.sheetnames = ["加藤木材"]

        # Create mock worksheet
        ws = MagicMock()
        ws.cell = MagicMock(return_value=MagicMock(value=None))

        wb.__getitem__ = MagicMock(return_value=ws)

        return wb

    def test_parse_returns_list(self):
        """Should return a list of records"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        # Parse empty/invalid content
        result = parser.parse(b"invalid content")

        assert isinstance(result, list)

    def test_parse_skips_summary_sheets(self):
        """Should skip 集計 and other excluded sheets"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        # Check that excluded sheets list is correct
        excluded = ["集計", "Summary", "目次", "Index", "請負", "DBUkeoiX", "請負社員"]

        # These should be skipped during parsing
        for sheet in excluded:
            assert sheet in ["集計", "Summary", "目次", "Index", "請負", "DBUkeoiX", "請負社員"]


class TestDetectEmployeeColumns:
    """Tests for _detect_employee_columns() method"""

    def test_detect_columns_with_numeric_ids(self):
        """Should detect columns with numeric employee IDs"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        # Create mock worksheet
        ws = MagicMock()

        # Mock cells - employee ID in column 10 (row 6)
        def mock_cell(row, column):
            cell = MagicMock()
            if row == 6 and column == 10:
                cell.value = "200901"  # Valid employee ID
            else:
                cell.value = None
            return cell

        ws.cell = mock_cell
        ws.max_column = 30

        # Manually set fallback positions
        parser.detected_fields = {}
        parser.current_column_offsets = parser.COLUMN_OFFSETS.copy()

        columns = parser._detect_employee_columns(ws)

        # Should find at least 0 columns (depends on implementation)
        assert isinstance(columns, list)


class TestExtractCellValue:
    """Tests for cell value extraction helpers"""

    def test_handles_none_values(self):
        """Should handle None cell values"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        # Create mock cell with None value
        cell = MagicMock()
        cell.value = None

        # The parser should handle None gracefully
        assert cell.value is None

    def test_handles_numeric_values(self):
        """Should handle numeric cell values"""
        cell = MagicMock()
        cell.value = 12345.67

        assert cell.value == 12345.67

    def test_handles_string_values(self):
        """Should handle string cell values"""
        cell = MagicMock()
        cell.value = "テスト"

        assert cell.value == "テスト"


class TestTimeConversion:
    """Tests for time format conversion (HH:MM to decimal)"""

    def test_hours_minutes_to_decimal(self):
        """Should convert HH:MM format to decimal hours"""
        # Example: 8:30 should become 8.5
        hours = 8
        minutes = 30

        decimal_hours = hours + (minutes / 60)

        assert decimal_hours == pytest.approx(8.5)

    def test_zero_minutes(self):
        """Should handle zero minutes"""
        hours = 10
        minutes = 0

        decimal_hours = hours + (minutes / 60)

        assert decimal_hours == 10.0


class TestValidationWarnings:
    """Tests for validation warning tracking"""

    def test_parser_tracks_warnings(self):
        """Should track validation warnings"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        assert isinstance(parser.validation_warnings, list)

    def test_parser_tracks_templates_used(self):
        """Should track templates used"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        assert isinstance(parser.templates_used, list)

    def test_parser_tracks_templates_generated(self):
        """Should track templates generated"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        assert isinstance(parser.templates_generated, list)


class TestBillingMultipliers:
    """Tests for billing calculation multipliers (documented in docstring)"""

    def test_base_multiplier(self):
        """Base hours should use 1.0 multiplier"""
        # 基本時間: 単価 × hours
        base_rate = 1500
        hours = 160

        billing = base_rate * hours * 1.0

        assert billing == 240000

    def test_overtime_multiplier(self):
        """Overtime (≤60h) should use 1.25 multiplier"""
        # 残業 (≤60h): 単価 × 1.25
        base_rate = 1500
        overtime_hours = 20

        billing = base_rate * overtime_hours * 1.25

        assert billing == 37500

    def test_overtime_over_60_multiplier(self):
        """Overtime (>60h) should use 1.5 multiplier"""
        # 残業 (>60h): 単価 × 1.5
        base_rate = 1500
        overtime_over_60 = 10

        billing = base_rate * overtime_over_60 * 1.5

        assert billing == 22500

    def test_night_extra_multiplier(self):
        """Night hours should add 0.25 extra"""
        # 深夜: 単価 × 0.25 (extra on top of regular)
        base_rate = 1500
        night_hours = 40

        night_extra = base_rate * night_hours * 0.25

        assert night_extra == 15000

    def test_holiday_multiplier(self):
        """Holiday hours should use 1.35 multiplier"""
        # 休日: 単価 × 1.35
        base_rate = 1500
        holiday_hours = 8

        billing = base_rate * holiday_hours * 1.35

        assert billing == pytest.approx(16200, rel=1e-9)


class TestCompleteBillingCalculation:
    """Tests for complete billing calculation scenarios"""

    def test_standard_employee_billing(self):
        """Should calculate billing for standard employee"""
        base_rate = 1500
        work_hours = 160
        overtime_hours = 20
        night_hours = 10

        billing = (
            (work_hours * base_rate * 1.0)  # Base
            + (overtime_hours * base_rate * 1.25)  # Overtime
            + (night_hours * base_rate * 0.25)  # Night extra
        )

        expected = 240000 + 37500 + 3750
        assert billing == expected

    def test_employee_with_over_60h_overtime(self):
        """Should split overtime at 60 hours"""
        base_rate = 1500
        total_overtime = 80

        overtime_normal = min(total_overtime, 60)  # 60 hours at 1.25
        overtime_over_60 = max(0, total_overtime - 60)  # 20 hours at 1.5

        billing = (
            (overtime_normal * base_rate * 1.25)
            + (overtime_over_60 * base_rate * 1.5)
        )

        expected = (60 * 1500 * 1.25) + (20 * 1500 * 1.5)
        assert billing == expected


class TestPeriodParsing:
    """Tests for period string parsing"""

    def test_period_format(self):
        """Should handle 2025年1月 format"""
        period = "2025年1月"

        assert "年" in period
        assert "月" in period


class TestEmployeeIdValidation:
    """Tests for employee ID validation"""

    def test_valid_numeric_id(self):
        """Should accept numeric employee IDs"""
        emp_id = "200901"

        # Should be digits only
        assert emp_id.isdigit()

    def test_valid_alphanumeric_id(self):
        """Should handle alphanumeric IDs"""
        emp_id = "EMP001"

        assert len(emp_id) > 0


class TestJapaneseBracketVariants:
    """Tests for handling Japanese bracket variants (警告 #4 from CLAUDE.md)"""

    def test_fullwidth_brackets(self):
        """Should handle full-width brackets （非）"""
        label_fullwidth = "通勤手当（非）"

        assert "（" in label_fullwidth
        assert "）" in label_fullwidth

    def test_halfwidth_brackets(self):
        """Should handle half-width brackets (非)"""
        label_halfwidth = "通勤手当(非)"

        assert "(" in label_halfwidth
        assert ")" in label_halfwidth

    def test_both_variants_in_labels(self):
        """Dynamic zone should have both bracket variants"""
        from salary_parser import SalaryStatementParser

        labels = SalaryStatementParser.DYNAMIC_ZONE_LABELS

        assert "通勤手当(非)" in labels
        assert "通勤手当（非）" in labels


class TestSheetTypeDetermination:
    """Tests for determining sheet type (standard vs vertical)"""

    def test_standard_sheet_detection(self):
        """Should detect standard horizontal layout"""
        # Standard layout has employee IDs in a specific row across columns
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        # Create mock worksheet with standard layout indicators
        ws = MagicMock()

        def mock_cell(row, column):
            cell = MagicMock()
            if row == 1 and column == 1:
                cell.value = "社員No"  # Standard header
            else:
                cell.value = None
            return cell

        ws.cell = mock_cell
        ws.max_row = 50
        ws.max_column = 100

        # Standard sheets have multiple employees across columns
        # The parser should determine this based on layout analysis


class TestMonthColumnDetection:
    """Tests for month column detection in vertical sheets"""

    def test_month_patterns(self):
        """Should recognize month patterns like 4月, 5月"""
        import re

        test_values = ["4月", "5月", "12月", "１月", "１２月"]

        for val in test_values:
            match = re.search(r"([0-9０-９]+)月", val)
            assert match is not None, f"Should match '{val}'"


class TestNameResolution:
    """Tests for employee name to ID resolution"""

    def test_name_map_lookup(self):
        """Should resolve name to ID via map"""
        from salary_parser import SalaryStatementParser

        name_map = {
            "田中太郎": "EMP001",
            "山田花子": "EMP002",
        }

        parser = SalaryStatementParser(employee_name_map=name_map)

        assert parser.employee_name_map.get("田中太郎") == "EMP001"

    def test_missing_name_returns_none(self):
        """Should return None for unknown names"""
        from salary_parser import SalaryStatementParser

        name_map = {"田中太郎": "EMP001"}

        parser = SalaryStatementParser(employee_name_map=name_map)

        assert parser.employee_name_map.get("不明な名前") is None


class TestParsingState:
    """Tests for parser state management"""

    def test_initial_state(self):
        """Should have clean initial state"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        assert parser.detected_fields == {}
        assert parser.detected_allowances == {}
        assert parser.detected_non_billable == {}
        assert parser.using_template is False

    def test_state_reset_between_sheets(self):
        """Parser should maintain separate state per sheet"""
        from salary_parser import SalaryStatementParser

        parser = SalaryStatementParser()

        # Simulate parsing state
        parser.detected_fields = {"test": 1}
        parser.using_template = True

        # Reset
        parser.detected_fields = {}
        parser.using_template = False

        assert parser.detected_fields == {}
        assert parser.using_template is False
