"""
Script para recalcular paid_leave_days en todos los registros de nomina.

Formula:
1. daily_work_hours = work_hours / work_days
2. paid_leave_hours = paid_leave_amount / hourly_rate
3. paid_leave_days = paid_leave_hours / daily_work_hours

Ejecutar: python recalculate_paid_leave_days.py
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "arari_pro.db"


def recalculate_paid_leave_days():
    """Recalcular paid_leave_days para todos los registros con paid_leave_amount > 0"""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Obtener todos los registros con paid_leave_amount > 0
    cursor.execute(
        """
        SELECT
            pr.id,
            pr.employee_id,
            pr.period,
            pr.work_days,
            pr.work_hours,
            pr.paid_leave_amount,
            pr.paid_leave_hours,
            pr.paid_leave_days as current_days,
            e.hourly_rate
        FROM payroll_records pr
        JOIN employees e ON pr.employee_id = e.employee_id
        WHERE pr.paid_leave_amount > 0 OR pr.paid_leave_hours > 0
    """
    )

    records = cursor.fetchall()
    print(f"Found {len(records)} records with paid leave")

    updated = 0
    errors = 0

    for record in records:
        try:
            record_id = record["id"]
            work_days = record["work_days"] or 0
            work_hours = record["work_hours"] or 0
            paid_leave_amount = record["paid_leave_amount"] or 0
            paid_leave_hours_db = record["paid_leave_hours"] or 0
            current_days = record["current_days"] or 0
            hourly_rate = record["hourly_rate"] or 0

            # Calcular daily_work_hours
            if work_days > 0 and work_hours > 0:
                daily_work_hours = work_hours / work_days
            else:
                daily_work_hours = 8.0  # Default

            # Calcular paid_leave_hours desde amount
            if paid_leave_amount > 0 and hourly_rate > 0:
                calculated_hours = paid_leave_amount / hourly_rate
            elif paid_leave_hours_db > 0:
                calculated_hours = paid_leave_hours_db
            else:
                calculated_hours = 0

            # Calcular paid_leave_days
            if calculated_hours > 0 and daily_work_hours > 0:
                calculated_days = calculated_hours / daily_work_hours
            else:
                calculated_days = 0

            # Solo actualizar si el valor es diferente
            if abs(calculated_days - current_days) > 0.01:
                cursor.execute(
                    """
                    UPDATE payroll_records
                    SET paid_leave_days = ?,
                        paid_leave_hours = ?
                    WHERE id = ?
                """,
                    (round(calculated_days, 2), round(calculated_hours, 2), record_id),
                )
                updated += 1

        except Exception:
            errors += 1

    conn.commit()
    conn.close()

    print("")
    print("Result:")
    print(f"  - Total records: {len(records)}")
    print(f"  - Updated: {updated}")
    print(f"  - Errors: {errors}")
    print(f"  - No changes: {len(records) - updated - errors}")

    return updated


def show_summary():
    """Mostrar resumen despues del recalculo"""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.cursor()

    # Total por mes
    cursor.execute(
        """
        SELECT
            period,
            COUNT(*) as count,
            SUM(paid_leave_amount) as total_amount,
            SUM(paid_leave_days) as total_days,
            SUM(paid_leave_hours) as total_hours
        FROM payroll_records
        WHERE paid_leave_amount > 0
        GROUP BY period
        ORDER BY period
    """
    )

    print("")
    print("Paid Leave Summary by period:")
    print("-" * 80)

    grand_total_amount = 0
    grand_total_days = 0

    for row in cursor.fetchall():
        period, count, total_amount, total_days, total_hours = row
        total_amount = total_amount or 0
        total_days = total_days or 0
        total_hours = total_hours or 0
        grand_total_amount += total_amount
        grand_total_days += total_days
        # ASCII only output
        print(
            f"{period}: {count} records, {total_amount:,.0f} yen, {total_days:.1f} days"
        )

    print("-" * 80)
    print(f"TOTAL: {grand_total_amount:,.0f} yen, {grand_total_days:.1f} days")

    conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Paid Leave Days Recalculation")
    print("=" * 60)
    print("")
    print("Formula:")
    print("  daily_hours = work_hours / work_days")
    print("  leave_hours = paid_leave_amount / hourly_rate")
    print("  leave_days = leave_hours / daily_hours")
    print("")

    updated = recalculate_paid_leave_days()

    if updated > 0:
        show_summary()

    print("")
    print("Done! Refresh the page to see the updated chart.")
