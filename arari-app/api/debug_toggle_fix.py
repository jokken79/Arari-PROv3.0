import os
import sys

# Add current directory to path so we can import modules
sys.path.append(os.getcwd())

from database import get_connection
from services import PayrollService


def test_toggle():
    print("Initialize DB...")
    conn = get_connection()
    service = PayrollService(conn)

    # 1. List all companies
    print("\n--- Current Companies ---")
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT dispatch_company FROM employees")
    companies = [r[0] for r in cursor.fetchall()]
    print(f"Companies found: {companies}")

    target_company = "Unknown"
    if target_company not in companies:
        if companies:
            target_company = companies[0]  # Pick first available if Unknown not found
            print(f"Warning: 'Unknown' not found. Using '{target_company}' instead.")
        else:
            print("Error: No companies found in DB.")
            return

    # 2. Get Statistics BEFORE
    print("\n--- Stats BEFORE Deactivation ---")
    # Using '2024年12月' or similar period if possible, or None for latest?
    # get_statistics uses specific period or NONE.
    # Let's find a valid period.
    cursor.execute(
        "SELECT DISTINCT period FROM payroll_records ORDER BY period DESC LIMIT 1"
    )
    row = cursor.fetchone()
    period = row[0] if row else None
    print(f"Using period: {period}")

    stats_before = service.get_statistics(period)
    print(
        f"Total Profit: {stats_before['total_monthly_profit'] if stats_before else 'None'}"
    )

    # Check if target company has profit in this period
    cursor.execute(
        """
        SELECT SUM(gross_profit) FROM payroll_records p
        JOIN employees e ON p.employee_id = e.employee_id
        WHERE p.period = ? AND e.dispatch_company = ?
    """,
        (period, target_company),
    )
    target_profit = cursor.fetchone()[0] or 0
    print(f"Target '{target_company}' Profit: {target_profit}")

    # 3. Deactivate
    print(f"\n--- Deactivating '{target_company}' ---")
    # Ensure it's active first
    service.set_company_active(target_company, True)
    service.set_company_active(target_company, False)

    # 4. Get Statistics AFTER
    print("\n--- Stats AFTER Deactivation ---")
    stats_after = service.get_statistics(period)
    print(
        f"Total Profit: {stats_after['total_monthly_profit'] if stats_after else 'None'}"
    )

    # 5. Verify Difference
    diff = (stats_before["total_monthly_profit"] or 0) - (
        stats_after["total_monthly_profit"] or 0
    )
    print(f"\nDifference (Before - After): {diff}")

    # The difference should equal the target profit (or close to it)
    if abs(diff - target_profit) < 1.0:
        print("✅ SUCCESS: Stats updated correctly.")
    else:
        print(
            f"❌ FAILURE: Stats mismatch. Expected difference ~{target_profit}, got {diff}"
        )

    # 6. Reactivate
    print(f"\n--- Reactivating '{target_company}' ---")
    service.set_company_active(target_company, True)

    conn.close()


if __name__ == "__main__":
    try:
        test_toggle()
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback

        traceback.print_exc()
