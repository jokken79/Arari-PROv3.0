#!/usr/bin/env python3
"""
Script de recálculo de márgenes (粗利) para datos históricos

Este script recalcula todos los campos derivados usando las tasas correctas:
- 雇用保険（会社負担）: 0.95%
- 労災保険: 0.3%
- 有給コスト: usar paid_leave_amount si existe, sino calcular
- billing_amount: calcular automáticamente si es 0

Multipliers for billing:
- 基本時間: 単価 × work_hours
- 残業 (≤60h): 単価 × 1.25
- 残業 (>60h): 単価 × 1.5
- 深夜 (factory): 単価 × 0.25 (extra)
- 休日: 単価 × 1.35

Uso:
    python recalculate_margins.py [--dry-run]

Opciones:
    --dry-run    Mostrar cambios sin aplicarlos
"""

import argparse
import sqlite3
from pathlib import Path

# Tasas de seguro (2025年度)
EMPLOYMENT_INSURANCE_RATE = 0.0090  # 雇用保険（会社負担）0.90% ← 2025年度
WORKERS_COMP_RATE = 0.003  # 労災保険 0.3%

# Billing multipliers
BILLING_MULTIPLIERS = {
    "overtime_normal": 1.25,  # 残業 ≤60h
    "overtime_over_60h": 1.5,  # 残業 >60h
    "night": 0.25,  # 深夜 (extra)
    "holiday": 1.35,  # 休日
}

# Ruta a la base de datos
DB_PATH = Path(__file__).parent / "arari_pro.db"


def calculate_billing_amount(
    work_hours,
    overtime_hours,
    overtime_over_60h,
    night_hours,
    holiday_hours,
    billing_rate,
):
    """
    Calculate billing amount from hours and billing rate

    Args:
        work_hours: Normal work hours
        overtime_hours: Overtime hours (≤60h)
        overtime_over_60h: Overtime hours over 60h
        night_hours: Night shift hours
        holiday_hours: Holiday work hours
        billing_rate: Employee's 単価

    Returns:
        Calculated billing amount
    """
    if billing_rate <= 0:
        return 0

    # 基本時間
    base_billing = work_hours * billing_rate

    # 残業 ≤60h: ×1.25
    overtime_billing = (
        overtime_hours * billing_rate * BILLING_MULTIPLIERS["overtime_normal"]
    )

    # 残業 >60h: ×1.5
    overtime_over_60h_billing = (
        overtime_over_60h * billing_rate * BILLING_MULTIPLIERS["overtime_over_60h"]
    )

    # 深夜: +0.25 extra
    night_billing = night_hours * billing_rate * BILLING_MULTIPLIERS["night"]

    # 休日: ×1.35
    holiday_billing = holiday_hours * billing_rate * BILLING_MULTIPLIERS["holiday"]

    return round(
        base_billing
        + overtime_billing
        + overtime_over_60h_billing
        + night_billing
        + holiday_billing
    )


def recalculate_all_records(dry_run: bool = False):
    """Recalcula todos los registros de nómina con las tasas correctas"""

    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Add new columns if they don't exist (migration)
    new_columns = [
        ("company_workers_comp", "REAL DEFAULT 0"),
        ("paid_leave_amount", "REAL DEFAULT 0"),
        ("night_hours", "REAL DEFAULT 0"),
        ("holiday_hours", "REAL DEFAULT 0"),
        ("overtime_over_60h", "REAL DEFAULT 0"),
        ("night_pay", "REAL DEFAULT 0"),
        ("holiday_pay", "REAL DEFAULT 0"),
        ("overtime_over_60h_pay", "REAL DEFAULT 0"),
    ]

    for col_name, col_type in new_columns:
        try:
            cursor.execute(
                f"ALTER TABLE payroll_records ADD COLUMN {col_name} {col_type}"
            )
            print(f"✅ Columna {col_name} agregada")
        except sqlite3.OperationalError:
            pass  # Column already exists

    # Obtener todos los registros con información del empleado
    cursor.execute(
        """
        SELECT
            p.id,
            p.employee_id,
            p.period,
            p.work_hours,
            p.overtime_hours,
            COALESCE(p.night_hours, 0) as night_hours,
            COALESCE(p.holiday_hours, 0) as holiday_hours,
            COALESCE(p.overtime_over_60h, 0) as overtime_over_60h,
            p.gross_salary,
            p.social_insurance,
            p.billing_amount,
            p.paid_leave_hours,
            COALESCE(p.paid_leave_amount, 0) as paid_leave_amount,
            p.company_social_insurance as old_company_social_insurance,
            p.company_employment_insurance as old_company_employment_insurance,
            COALESCE(p.company_workers_comp, 0) as old_company_workers_comp,
            p.total_company_cost as old_total_company_cost,
            p.gross_profit as old_gross_profit,
            p.profit_margin as old_profit_margin,
            e.hourly_rate,
            e.billing_rate
        FROM payroll_records p
        LEFT JOIN employees e ON p.employee_id = e.employee_id
        ORDER BY p.period, p.employee_id
    """
    )

    records = cursor.fetchall()
    print(f"\n📊 Procesando {len(records)} registros...\n")

    updated_count = 0
    skipped_count = 0
    billing_calculated = 0

    for record in records:
        record_id = record["id"]
        employee_id = record["employee_id"]
        period = record["period"]
        work_hours = record["work_hours"] or 0
        overtime_hours = record["overtime_hours"] or 0
        night_hours = record["night_hours"] or 0
        holiday_hours = record["holiday_hours"] or 0
        overtime_over_60h = record["overtime_over_60h"] or 0
        gross_salary = record["gross_salary"] or 0
        social_insurance = record["social_insurance"] or 0
        billing_amount = record["billing_amount"] or 0
        paid_leave_hours = record["paid_leave_hours"] or 0
        paid_leave_amount = record["paid_leave_amount"] or 0
        hourly_rate = record["hourly_rate"] or 0
        billing_rate = record["billing_rate"] or 0

        # Calculate billing_amount if it's 0 or missing
        if billing_amount == 0 and billing_rate > 0:
            billing_amount = calculate_billing_amount(
                work_hours,
                overtime_hours,
                overtime_over_60h,
                night_hours,
                holiday_hours,
                billing_rate,
            )
            billing_calculated += 1

        if billing_amount == 0:
            skipped_count += 1
            continue

        # Calcular nuevos valores
        # 社会保険（会社負担）= 本人負担と同額
        company_social_insurance = social_insurance

        # 雇用保険（会社負担）= 0.95%
        company_employment_insurance = round(gross_salary * EMPLOYMENT_INSURANCE_RATE)

        # 労災保険 = 0.3%
        company_workers_comp = round(gross_salary * WORKERS_COMP_RATE)

        # ================================================================
        # 有給コスト (Paid Leave Cost) - FOR DISPLAY ONLY
        # ================================================================
        # IMPORTANT: 有給支給 (paid_leave_amount) is ALREADY INCLUDED in gross_salary
        # when it appears in the Excel 支給の部 section.
        #
        # We store paid_leave_amount for display purposes, but do NOT add it
        # again to total_company_cost (that would be double-counting).
        #
        # The formula is:
        #   会社総コスト = 総支給額 + 法定福利費(会社負担)
        #
        # Where 法定福利費(会社負担) = 健康保険(会社) + 厚生年金(会社) + 雇用保険 + 労災保険
        # ================================================================

        # Costo total - DO NOT add paid_leave_cost (already in gross_salary)
        total_company_cost = (
            gross_salary
            + company_social_insurance
            + company_employment_insurance
            + company_workers_comp
            # ❌ NO paid_leave_cost - ya está en gross_salary!
        )

        # Margen bruto
        gross_profit = billing_amount - total_company_cost
        profit_margin = (
            (gross_profit / billing_amount * 100) if billing_amount > 0 else 0
        )

        # Mostrar cambios
        old_profit = record["old_gross_profit"] or 0
        old_margin = record["old_profit_margin"] or 0
        old_billing = record["billing_amount"] or 0

        # Check if there are significant changes
        has_changes = (
            abs(gross_profit - old_profit) > 1
            or abs(profit_margin - old_margin) > 0.1
            or (old_billing == 0 and billing_amount > 0)
        )

        if has_changes:
            print(f"📝 {employee_id} ({period}):")
            if old_billing == 0 and billing_amount > 0:
                print(f"   請求金額: ¥0 → ¥{billing_amount:,.0f} (自動計算)")
            print(
                f"   粗利: ¥{old_profit:,.0f} → ¥{gross_profit:,.0f} (差: ¥{gross_profit - old_profit:,.0f})"
            )
            print(f"   マージン: {old_margin:.1f}% → {profit_margin:.1f}%")
            print(
                f"   [雇用保険: ¥{company_employment_insurance:,}, 労災: ¥{company_workers_comp:,}]"
            )
            print()

            if not dry_run:
                cursor.execute(
                    """
                    UPDATE payroll_records
                    SET company_social_insurance = ?,
                        company_employment_insurance = ?,
                        company_workers_comp = ?,
                        billing_amount = ?,
                        total_company_cost = ?,
                        gross_profit = ?,
                        profit_margin = ?
                    WHERE id = ?
                """,
                    (
                        company_social_insurance,
                        company_employment_insurance,
                        company_workers_comp,
                        billing_amount,
                        total_company_cost,
                        gross_profit,
                        profit_margin,
                        record_id,
                    ),
                )

            updated_count += 1

    if not dry_run:
        conn.commit()

    conn.close()

    print(f"\n{'=' * 50}")
    print("📊 RESUMEN:")
    print(f"   Total registros: {len(records)}")
    print(f"   Actualizados: {updated_count}")
    print(f"   Billing calculado: {billing_calculated}")
    print(f"   Sin billing_rate: {skipped_count}")

    if dry_run:
        print("\n⚠️  MODO DRY-RUN: No se aplicaron cambios")
        print("   Ejecuta sin --dry-run para aplicar los cambios")
    else:
        print("\n✅ Cambios aplicados exitosamente")


def main():
    parser = argparse.ArgumentParser(
        description="Recalcular márgenes de datos históricos"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Mostrar cambios sin aplicarlos"
    )

    args = parser.parse_args()

    print("=" * 50)
    print("🔄 RECÁLCULO DE MÁRGENES (粗利)")
    print("=" * 50)
    print("\nTasas aplicadas (2024年度):")
    print(f"  • 雇用保険（会社負担）: {EMPLOYMENT_INSURANCE_RATE * 100}%")
    print(f"  • 労災保険: {WORKERS_COMP_RATE * 100}%")
    print("  • 社会保険（会社負担）: = 本人負担額")
    print("\nMultiplicadores de billing:")
    print(f"  • 残業 ≤60h: ×{BILLING_MULTIPLIERS['overtime_normal']}")
    print(f"  • 残業 >60h: ×{BILLING_MULTIPLIERS['overtime_over_60h']}")
    print(f"  • 深夜: +{BILLING_MULTIPLIERS['night']} (extra)")
    print(f"  • 休日: ×{BILLING_MULTIPLIERS['holiday']}")

    if args.dry_run:
        print("\n⚠️  MODO DRY-RUN: Solo se mostrarán los cambios")

    recalculate_all_records(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
