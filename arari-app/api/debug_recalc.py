import sqlite3

DB_PATH = "arari_pro.db"


def debug_recalc():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get one record where employee has rate
    cursor.execute(
        """
        SELECT
            p.id,
            p.employee_id,
            p.period,
            p.work_hours,
            p.billing_amount,
            e.billing_rate
        FROM payroll_records p
        LEFT JOIN employees e ON p.employee_id = e.employee_id
        WHERE e.billing_rate > 0
        LIMIT 1
    """
    )

    row = cursor.fetchone()
    if row:
        print(f"Record ID: {row['id']}")
        print(f"Employee ID: {row['employee_id']}")
        print(f"Period: {row['period']}")
        print(f"Work Hours: {row['work_hours']}")
        print(f"Billing Amount (Current): {row['billing_amount']}")
        print(f"Billing Rate (From Employee): {row['billing_rate']}")

        # Sim calc
        rate = row["billing_rate"]
        hours = row["work_hours"]
        print(f"Calc Base: {hours} * {rate} = {hours * rate}")
    else:
        print("No records found with valid billing rate!")


if __name__ == "__main__":
    debug_recalc()
