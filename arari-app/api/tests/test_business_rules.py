import unittest
from unittest.mock import MagicMock
import sys
import os
import sqlite3

# Add api directory to path so we can import modules from parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services import PayrollService
from models import PayrollRecordCreate, EmployeeCreate

class TestBusinessRules(unittest.TestCase):
    """
    Tests for Arari PRO Business Rules:
    1. Billing Logic: Pass-through allowances vs Company cost
    2. Gross Salary Logic: Inclusion of all payments
    """

    def setUp(self):
        # Use real in-memory DB for service to allow SQL execution
        self.conn = sqlite3.connect(':memory:')
        self.conn.row_factory = sqlite3.Row
        self.init_test_db()

        self.service = PayrollService(self.conn)

        # Base employee for testing
        self.employee = {
            'employee_id': '123456',
            'billing_rate': 2000, # ¥2,000/hour
            'hourly_rate': 1500   # ¥1,500/hour
        }

        # Insert test employee using EmployeeCreate Pydantic model
        emp_create = EmployeeCreate(
            employee_id='123456',
            name='Test User',
            dispatch_company='Test Co',
            department='Dept',
            hourly_rate=1500,
            billing_rate=2000,
            status='active',
            hire_date='2024-01-01',
            name_kana='Test'
        )
        self.service.create_employee(emp_create)

    def tearDown(self):
        self.conn.close()

    def init_test_db(self):
        cursor = self.conn.cursor()

        # Create employees table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                name_kana TEXT,
                dispatch_company TEXT NOT NULL,
                department TEXT,
                hourly_rate REAL NOT NULL DEFAULT 0,
                billing_rate REAL NOT NULL DEFAULT 0,
                status TEXT DEFAULT 'active',
                hire_date TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create payroll_records table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS payroll_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id TEXT NOT NULL,
                period TEXT NOT NULL,
                work_days INTEGER DEFAULT 0,
                work_hours REAL DEFAULT 0,
                overtime_hours REAL DEFAULT 0,
                night_hours REAL DEFAULT 0,
                holiday_hours REAL DEFAULT 0,
                overtime_over_60h REAL DEFAULT 0,
                paid_leave_hours REAL DEFAULT 0,
                paid_leave_days REAL DEFAULT 0,
                paid_leave_amount REAL DEFAULT 0,
                base_salary REAL DEFAULT 0,
                overtime_pay REAL DEFAULT 0,
                night_pay REAL DEFAULT 0,
                holiday_pay REAL DEFAULT 0,
                overtime_over_60h_pay REAL DEFAULT 0,
                transport_allowance REAL DEFAULT 0,
                other_allowances REAL DEFAULT 0,
                non_billable_allowances REAL DEFAULT 0,
                gross_salary REAL DEFAULT 0,
                social_insurance REAL DEFAULT 0,
                welfare_pension REAL DEFAULT 0,
                employment_insurance REAL DEFAULT 0,
                income_tax REAL DEFAULT 0,
                resident_tax REAL DEFAULT 0,
                other_deductions REAL DEFAULT 0,
                net_salary REAL DEFAULT 0,
                billing_amount REAL DEFAULT 0,
                company_social_insurance REAL DEFAULT 0,
                company_employment_insurance REAL DEFAULT 0,
                company_workers_comp REAL DEFAULT 0,
                total_company_cost REAL DEFAULT 0,
                gross_profit REAL DEFAULT 0,
                profit_margin REAL DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
                UNIQUE(employee_id, period)
            )
        """)

        # Create settings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                description TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Insert default settings
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('employment_insurance_rate', '0.0090')")
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('workers_comp_rate', '0.003')")

        self.conn.commit()

    # ================================================================
    # BILLING LOGIC TESTS (Facturación al Cliente)
    # ================================================================

    def test_billing_standard_hours(self):
        """Test basic billing: Hours * Rate"""
        record = PayrollRecordCreate(
            employee_id='123456',
            period='2025年1月',
            work_hours=100,
            overtime_hours=10,
            billing_amount=0 # Let system calculate
        )

        # Expected:
        # Base: 100 * 2000 = 200,000
        # OT: 10 * 2000 * 1.25 = 25,000
        # Total: 225,000

        amount = self.service.calculate_billing_amount(record, self.employee)
        self.assertEqual(amount, 225000)

    def test_billing_excludes_non_billable_items(self):
        """
        CRITICAL RULE:
        Transport Allowance (通勤手当) and Work Allowance (業務手当/Non-billable)
        must NOT be billed to the client.
        """
        record = PayrollRecordCreate(
            employee_id='123456',
            period='2025年1月',
            work_hours=100,
            transport_allowance=15000,      # Should be excluded
            non_billable_allowances=5000,   # Should be excluded (Work Allowance)
            other_allowances=0
        )

        # Expected: Only Base Hours (100 * 2000) = 200,000
        amount = self.service.calculate_billing_amount(record, self.employee)
        self.assertEqual(amount, 200000)

    def test_billing_excludes_paid_leave(self):
        """
        CRITICAL RULE:
        Paid Leave (有給休暇) is a company cost, NOT billed to client.
        """
        record = PayrollRecordCreate(
            employee_id='123456',
            period='2025年1月',
            work_hours=100,
            paid_leave_amount=10000,        # Should be excluded
            other_allowances=0
        )

        # Expected: Only Base Hours (100 * 2000) = 200,000
        amount = self.service.calculate_billing_amount(record, self.employee)
        self.assertEqual(amount, 200000)

    def test_billing_includes_pass_through_allowances(self):
        """
        CRITICAL RULE:
        Other Allowances (e.g. Deep Night OT/深夜残業, Perfect Attendance/皆勤手当)
        MUST be billed to the client (Pass-through).
        """
        record = PayrollRecordCreate(
            employee_id='123456',
            period='2025年1月',
            work_hours=100,
            other_allowances=5000 # e.g., Deep Night OT (深夜残業)
        )

        # Expected:
        # Base: 200,000
        # Other: 5,000 (Pass-through)
        # Total: 205,000
        amount = self.service.calculate_billing_amount(record, self.employee)
        self.assertEqual(amount, 205000)

    def test_billing_complex_mix(self):
        """Verify complex scenario with mixed billable/non-billable items"""
        record = PayrollRecordCreate(
            employee_id='123456',
            period='2025年1月',
            work_hours=100,                 # Billable
            other_allowances=2000,          # Billable (e.g. Deep Night OT)
            transport_allowance=10000,      # Non-Billable
            paid_leave_amount=15000,        # Non-Billable
            non_billable_allowances=5000    # Non-Billable
        )

        # Expected:
        # Base: 200,000
        # Other: 2,000
        # Total: 202,000 (Ignored 30,000 of non-billables)
        amount = self.service.calculate_billing_amount(record, self.employee)
        self.assertEqual(amount, 202000)

    # ================================================================
    # GROSS SALARY LOGIC TESTS (Pago al Empleado)
    # ================================================================

    def test_company_cost_calculation(self):
        """
        Verify Company Cost = Gross Salary + Legal Welfare + (NO double counting)
        """
        # Scenario:
        # Gross Salary = 250,000 (Includes: Base 200k + Transport 20k + Paid Leave 30k)
        record = PayrollRecordCreate(
            employee_id='123456',
            period='2025年1月',
            gross_salary=250000,
            social_insurance=15000,
            welfare_pension=30000,
            paid_leave_amount=30000,  # Already in gross
            transport_allowance=20000 # Already in gross
        )

        # Execute (using real Service with in-memory DB)
        result = self.service.create_payroll_record(record)

        # Verify
        # Company Social Ins = Employee Social Ins (15,000) + Welfare Pension (30,000) = 45,000
        expected_company_social = 15000 + 30000
        self.assertEqual(result['company_social_insurance'], expected_company_social)

        # Company Employment Ins = 0.90% of 250,000 = 2,250
        self.assertEqual(result['company_employment_insurance'], 2250)

        # Workers Comp = 0.3% of 250,000 = 750
        self.assertEqual(result['company_workers_comp'], 750)

        # Total Company Cost = Gross (250,000) + Social (45,000) + Emp (2,250) + WC (750)
        # = 298,000
        # CRITICAL: Must NOT add paid_leave_amount again (it's in 250,000)
        expected_total_cost = 250000 + 45000 + 2250 + 750
        self.assertEqual(result['total_company_cost'], expected_total_cost)

if __name__ == '__main__':
    unittest.main()
