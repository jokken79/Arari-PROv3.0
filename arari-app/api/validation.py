"""
ValidationAgent - Data Validation System
Validates data integrity and business rules
"""

import sqlite3
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class ValidationSeverity(Enum):
    ERROR = "error"      # Must be fixed
    WARNING = "warning"  # Should be reviewed
    INFO = "info"        # Informational


@dataclass
class ValidationResult:
    severity: str
    category: str
    entity_type: str
    entity_id: str
    field: str
    message: str
    current_value: Any
    expected: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "severity": self.severity,
            "category": self.category,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "field": self.field,
            "message": self.message,
            "current_value": self.current_value,
            "expected": self.expected
        }


class ValidationService:
    """Service for data validation"""

    # Validation rules
    EMPLOYEE_RULES = {
        "billing_rate": {"min": 0, "max": 10000, "required": True},
        "hourly_rate": {"min": 0, "max": 10000, "required": True},
        "billing_gt_hourly": True,  # billing_rate should be > hourly_rate
    }

    PAYROLL_RULES = {
        "work_hours": {"min": 0, "max": 400},
        "overtime_hours": {"min": 0, "max": 100},
        "night_hours": {"min": 0, "max": 200},
        "holiday_hours": {"min": 0, "max": 100},
        "profit_margin": {"min": -50, "max": 80},  # Allow some range
        "gross_salary": {"min": 0},
        "billing_amount": {"min": 0},
    }

    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn
        self.cursor = conn.cursor()
        self.results: List[ValidationResult] = []

    def validate_all(self) -> Dict[str, Any]:
        """Run all validations"""
        self.results = []

        self.validate_employees()
        self.validate_payroll()
        self.validate_calculations()
        self.validate_relationships()

        return self.get_summary()

    def validate_employees(self) -> List[ValidationResult]:
        """Validate employee records"""

        self.cursor.execute("""
            SELECT employee_id, name, hourly_rate, billing_rate, status
            FROM employees
        """)

        for row in self.cursor.fetchall():
            emp_id, name, hourly_rate, billing_rate, status = row

            # Check billing_rate
            if billing_rate is None or billing_rate <= 0:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.ERROR.value,
                    category="missing_data",
                    entity_type="employee",
                    entity_id=emp_id,
                    field="billing_rate",
                    message=f"単価が設定されていません: {name}",
                    current_value=billing_rate,
                    expected="> 0"
                ))
            elif billing_rate > 10000:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.WARNING.value,
                    category="anomaly",
                    entity_type="employee",
                    entity_id=emp_id,
                    field="billing_rate",
                    message=f"単価が異常に高い: {name}",
                    current_value=billing_rate,
                    expected="< 10000"
                ))

            # Check hourly_rate
            if hourly_rate is None or hourly_rate <= 0:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.ERROR.value,
                    category="missing_data",
                    entity_type="employee",
                    entity_id=emp_id,
                    field="hourly_rate",
                    message=f"時給が設定されていません: {name}",
                    current_value=hourly_rate,
                    expected="> 0"
                ))

            # Check billing > hourly (should earn margin)
            if hourly_rate and billing_rate and hourly_rate >= billing_rate:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.WARNING.value,
                    category="business_rule",
                    entity_type="employee",
                    entity_id=emp_id,
                    field="rates",
                    message=f"時給が単価以上: {name} (時給¥{hourly_rate} >= 単価¥{billing_rate})",
                    current_value=f"hourly={hourly_rate}, billing={billing_rate}",
                    expected="billing_rate > hourly_rate"
                ))

            # Check status
            if status not in ['active', 'inactive']:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.INFO.value,
                    category="data_quality",
                    entity_type="employee",
                    entity_id=emp_id,
                    field="status",
                    message=f"不明なステータス: {name}",
                    current_value=status,
                    expected="active or inactive"
                ))

        return [r for r in self.results if r.entity_type == "employee"]

    def validate_payroll(self) -> List[ValidationResult]:
        """Validate payroll records"""

        self.cursor.execute("""
            SELECT
                p.employee_id, p.period, p.work_hours, p.overtime_hours,
                p.overtime_over_60h, p.night_hours, p.holiday_hours,
                p.gross_salary, p.billing_amount, p.profit_margin,
                p.total_company_cost, p.gross_profit,
                e.name
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
        """)

        for row in self.cursor.fetchall():
            (emp_id, period, work_hours, overtime, overtime_60h,
             night_hours, holiday_hours, gross_salary, billing,
             margin, cost, profit, name) = row

            entity_id = f"{emp_id}/{period}"

            # Check work hours
            if work_hours and work_hours > 400:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.ERROR.value,
                    category="anomaly",
                    entity_type="payroll",
                    entity_id=entity_id,
                    field="work_hours",
                    message=f"労働時間が異常: {name} - {work_hours}h in {period}",
                    current_value=work_hours,
                    expected="<= 400"
                ))

            # Check overtime
            total_overtime = (overtime or 0) + (overtime_60h or 0)
            if total_overtime > 100:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.WARNING.value,
                    category="anomaly",
                    entity_type="payroll",
                    entity_id=entity_id,
                    field="overtime",
                    message=f"残業時間が多い: {name} - {total_overtime}h in {period}",
                    current_value=total_overtime,
                    expected="<= 100"
                ))

            # Check negative margin
            if margin is not None and margin < 0:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.ERROR.value,
                    category="business_rule",
                    entity_type="payroll",
                    entity_id=entity_id,
                    field="profit_margin",
                    message=f"マージンが負: {name} - {margin:.1f}% in {period}",
                    current_value=margin,
                    expected=">= 0"
                ))

            # Check unusually high margin (might indicate error)
            if margin is not None and margin > 50:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.WARNING.value,
                    category="anomaly",
                    entity_type="payroll",
                    entity_id=entity_id,
                    field="profit_margin",
                    message=f"マージンが異常に高い: {name} - {margin:.1f}% in {period}",
                    current_value=margin,
                    expected="<= 50%"
                ))

            # Check gross_salary
            if gross_salary is None or gross_salary <= 0:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.ERROR.value,
                    category="missing_data",
                    entity_type="payroll",
                    entity_id=entity_id,
                    field="gross_salary",
                    message=f"総支給額がない: {name} in {period}",
                    current_value=gross_salary,
                    expected="> 0"
                ))

            # Check billing_amount
            if billing is None or billing <= 0:
                self.results.append(ValidationResult(
                    severity=ValidationSeverity.ERROR.value,
                    category="missing_data",
                    entity_type="payroll",
                    entity_id=entity_id,
                    field="billing_amount",
                    message=f"請求金額がない: {name} in {period}",
                    current_value=billing,
                    expected="> 0"
                ))

        return [r for r in self.results if r.entity_type == "payroll"]

    def validate_calculations(self) -> List[ValidationResult]:
        """Validate that calculations are correct"""

        self.cursor.execute("""
            SELECT
                p.employee_id, p.period, p.billing_amount, p.total_company_cost,
                p.gross_profit, p.profit_margin, e.name
            FROM payroll_records p
            JOIN employees e ON p.employee_id = e.employee_id
            WHERE p.billing_amount > 0
        """)

        for row in self.cursor.fetchall():
            emp_id, period, billing, cost, profit, margin, name = row
            entity_id = f"{emp_id}/{period}"

            if billing and cost:
                # Check profit calculation
                expected_profit = billing - cost
                if profit and abs(profit - expected_profit) > 1:  # Allow ¥1 rounding
                    self.results.append(ValidationResult(
                        severity=ValidationSeverity.WARNING.value,
                        category="calculation",
                        entity_type="payroll",
                        entity_id=entity_id,
                        field="gross_profit",
                        message=f"粗利計算が不一致: {name} in {period}",
                        current_value=profit,
                        expected=f"{expected_profit:.0f} (billing - cost)"
                    ))

                # Check margin calculation
                expected_margin = (expected_profit / billing) * 100 if billing > 0 else 0
                if margin and abs(margin - expected_margin) > 0.1:  # Allow 0.1% difference
                    self.results.append(ValidationResult(
                        severity=ValidationSeverity.WARNING.value,
                        category="calculation",
                        entity_type="payroll",
                        entity_id=entity_id,
                        field="profit_margin",
                        message=f"マージン計算が不一致: {name} in {period}",
                        current_value=margin,
                        expected=f"{expected_margin:.1f}%"
                    ))

        return [r for r in self.results if r.category == "calculation"]

    def validate_relationships(self) -> List[ValidationResult]:
        """Validate foreign key relationships"""

        # Check for payroll records without matching employee
        self.cursor.execute("""
            SELECT p.employee_id, p.period
            FROM payroll_records p
            LEFT JOIN employees e ON p.employee_id = e.employee_id
            WHERE e.employee_id IS NULL
        """)

        for row in self.cursor.fetchall():
            emp_id, period = row
            self.results.append(ValidationResult(
                severity=ValidationSeverity.ERROR.value,
                category="relationship",
                entity_type="payroll",
                entity_id=f"{emp_id}/{period}",
                field="employee_id",
                message=f"従業員マスターに存在しない: {emp_id}",
                current_value=emp_id,
                expected="Valid employee_id"
            ))

        # Check for duplicate records
        self.cursor.execute("""
            SELECT employee_id, period, COUNT(*) as cnt
            FROM payroll_records
            GROUP BY employee_id, period
            HAVING cnt > 1
        """)

        for row in self.cursor.fetchall():
            emp_id, period, count = row
            self.results.append(ValidationResult(
                severity=ValidationSeverity.ERROR.value,
                category="relationship",
                entity_type="payroll",
                entity_id=f"{emp_id}/{period}",
                field="uniqueness",
                message=f"重複レコード: {emp_id} in {period} ({count} records)",
                current_value=count,
                expected="1"
            ))

        return [r for r in self.results if r.category == "relationship"]

    def get_summary(self) -> Dict[str, Any]:
        """Get validation summary"""
        errors = [r for r in self.results if r.severity == "error"]
        warnings = [r for r in self.results if r.severity == "warning"]
        info = [r for r in self.results if r.severity == "info"]

        # Group by category
        by_category = {}
        for r in self.results:
            if r.category not in by_category:
                by_category[r.category] = 0
            by_category[r.category] += 1

        return {
            "total_issues": len(self.results),
            "errors": len(errors),
            "warnings": len(warnings),
            "info": len(info),
            "by_category": by_category,
            "issues": [r.to_dict() for r in self.results],
            "errors_list": [r.to_dict() for r in errors],
            "warnings_list": [r.to_dict() for r in warnings],
            "info_list": [r.to_dict() for r in info]
        }

    def auto_fix(self, fix_types: List[str] = None) -> Dict[str, Any]:
        """Attempt to auto-fix certain issues"""
        fixed = 0
        failed = 0

        # For now, just recalculate margins
        if not fix_types or "calculations" in fix_types:
            self.cursor.execute("""
                UPDATE payroll_records
                SET gross_profit = billing_amount - total_company_cost,
                    profit_margin = CASE
                        WHEN billing_amount > 0
                        THEN ((billing_amount - total_company_cost) / billing_amount) * 100
                        ELSE 0
                    END
                WHERE billing_amount > 0 AND total_company_cost > 0
            """)
            fixed += self.cursor.rowcount
            self.conn.commit()

        return {
            "fixed": fixed,
            "failed": failed,
            "message": f"Fixed {fixed} records"
        }
