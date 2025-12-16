import os
import sqlite3

DB_PATH = "arari_pro.db"


def check_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("=== DATA INTEGRITY CHECK ===")

    # 1. Check Employees with Billing Rate
    cursor.execute("SELECT COUNT(*) FROM employees WHERE billing_rate > 0")
    emp_with_rate = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM employees")
    total_emp = cursor.fetchone()[0]
    print(f"Employees with Billing Rate > 0: {emp_with_rate} / {total_emp}")

    # 2. Check Payroll Records with Billing Amount
    cursor.execute("SELECT COUNT(*) FROM payroll_records WHERE billing_amount > 0")
    pay_with_bill = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM payroll_records")
    total_pay = cursor.fetchone()[0]
    print(f"Payroll Records with Billing Amount > 0: {pay_with_bill} / {total_pay}")

    # 3. Check specific period stats (2025年9月 from screenshot)
    period = "2025年9月"
    cursor.execute("SELECT COUNT(*) FROM payroll_records WHERE period = ?", (period,))
    sept_count = cursor.fetchone()[0]
    print(f"Records in {period}: {sept_count}")

    if sept_count > 0:
        cursor.execute(
            "SELECT SUM(billing_amount), SUM(total_company_cost), SUM(gross_profit) FROM payroll_records WHERE period = ?",
            (period,),
        )
        sums = cursor.fetchone()
        print(
            f"Stats for {period}: Revenue={sums[0]}, Cost={sums[1]}, Profit={sums[2]}"
        )

    # 4. Sample check
    print("\nSample Employee (First found):")
    cursor.execute("SELECT employee_id, name, billing_rate FROM employees LIMIT 1")
    emp = dict(cursor.fetchone())
    print(emp)

    print("\nSample Payroll Record (First found):")
    cursor.execute(
        "SELECT employee_id, period, billing_amount, gross_profit FROM payroll_records LIMIT 1"
    )
    pay = dict(cursor.fetchone())
    print(pay)

    conn.close()


if __name__ == "__main__":
    check_db()
