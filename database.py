#!/usr/bin/env python3
"""
粗利 PRO - Database Module
派遣社員の利益率・マージン計算

Connects to ChinginGenerator database to calculate profit margins.
"""

import sqlite3
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

# Database path - looks for chingin_data.db in parent directory or current
DB_PATHS = [
    '../ChinginGenerator-v4-PRO/chingin_data.db',
    '../chingin_data.db',
    './chingin_data.db',
    '/app/data/chingin_data.db'
]

def get_db_path() -> str:
    """Find the database file"""
    for path in DB_PATHS:
        if os.path.exists(path):
            return path
    raise FileNotFoundError("chingin_data.db not found. Please ensure ChinginGenerator database is accessible.")

def get_connection():
    """Get database connection"""
    return sqlite3.connect(get_db_path())

def get_all_haken_employees() -> List[Dict[str, Any]]:
    """Get all haken employees with profit data"""
    with get_connection() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                employee_id,
                name,
                name_kana,
                dispatch_company,
                department,
                hourly_rate,
                billing_rate,
                profit_margin,
                status,
                hire_date
            FROM haken_employees
            WHERE billing_rate > 0 AND hourly_rate > 0
            ORDER BY (billing_rate - hourly_rate) DESC
        ''')

        employees = []
        for row in cursor.fetchall():
            emp = dict(row)
            # Calculate profit per hour
            emp['arari_per_hour'] = (emp['billing_rate'] or 0) - (emp['hourly_rate'] or 0)
            emp['margin_rate'] = ((emp['billing_rate'] - emp['hourly_rate']) / emp['billing_rate'] * 100) if emp['billing_rate'] else 0
            employees.append(emp)

        return employees

def get_profit_by_company() -> List[Dict[str, Any]]:
    """Get profit aggregated by dispatch company (派遣先)"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('''
            SELECT
                dispatch_company,
                COUNT(*) as employee_count,
                AVG(hourly_rate) as avg_hourly_rate,
                AVG(billing_rate) as avg_billing_rate,
                AVG(billing_rate - hourly_rate) as avg_arari,
                SUM(billing_rate - hourly_rate) as total_arari_potential
            FROM haken_employees
            WHERE billing_rate > 0 AND hourly_rate > 0 AND dispatch_company IS NOT NULL
            GROUP BY dispatch_company
            ORDER BY avg_arari DESC
        ''')

        companies = []
        for row in cursor.fetchall():
            company = {
                'dispatch_company': row[0],
                'employee_count': row[1],
                'avg_hourly_rate': row[2] or 0,
                'avg_billing_rate': row[3] or 0,
                'avg_arari': row[4] or 0,
                'total_arari_potential': row[5] or 0
            }
            company['margin_rate'] = (company['avg_arari'] / company['avg_billing_rate'] * 100) if company['avg_billing_rate'] else 0
            companies.append(company)

        return companies

def get_monthly_profit(year: int = None, month: int = None) -> Dict[str, Any]:
    """Calculate monthly profit based on actual worked hours from payroll"""
    if year is None:
        year = datetime.now().year
    if month is None:
        month = datetime.now().month

    period_pattern = f"{year}年{month}月%"

    with get_connection() as conn:
        cursor = conn.cursor()

        # Get worked hours from payroll records
        cursor.execute('''
            SELECT
                p.employee_id,
                p.work_hours,
                p.overtime_hours,
                h.hourly_rate,
                h.billing_rate,
                h.name,
                h.dispatch_company
            FROM payroll_records p
            JOIN haken_employees h ON p.employee_id = h.employee_id
            WHERE p.period LIKE ?
            AND h.billing_rate > 0 AND h.hourly_rate > 0
        ''', (period_pattern,))

        total_arari = 0
        total_hours = 0
        total_billing = 0
        total_cost = 0
        employee_details = []

        for row in cursor.fetchall():
            emp_id, work_hours, ot_hours, hourly_rate, billing_rate, name, company = row

            # Parse hours (could be in H:MM format or decimal)
            try:
                if isinstance(work_hours, str) and ':' in work_hours:
                    h, m = work_hours.split(':')
                    hours = float(h) + float(m)/60
                else:
                    hours = float(work_hours or 0)
            except:
                hours = 0

            try:
                if isinstance(ot_hours, str) and ':' in ot_hours:
                    h, m = ot_hours.split(':')
                    ot = float(h) + float(m)/60
                else:
                    ot = float(ot_hours or 0)
            except:
                ot = 0

            total_work = hours + ot
            billing = total_work * billing_rate
            cost = total_work * hourly_rate
            arari = billing - cost

            total_hours += total_work
            total_billing += billing
            total_cost += cost
            total_arari += arari

            employee_details.append({
                'employee_id': emp_id,
                'name': name,
                'dispatch_company': company,
                'hours': total_work,
                'billing': billing,
                'cost': cost,
                'arari': arari
            })

        return {
            'year': year,
            'month': month,
            'total_hours': total_hours,
            'total_billing': total_billing,
            'total_cost': total_cost,
            'total_arari': total_arari,
            'margin_rate': (total_arari / total_billing * 100) if total_billing else 0,
            'employee_count': len(employee_details),
            'details': sorted(employee_details, key=lambda x: x['arari'], reverse=True)
        }

def get_statistics() -> Dict[str, Any]:
    """Get overall statistics"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # Total employees with valid data
        cursor.execute('''
            SELECT
                COUNT(*) as total,
                AVG(hourly_rate) as avg_jikyuu,
                AVG(billing_rate) as avg_tanka,
                AVG(billing_rate - hourly_rate) as avg_arari,
                SUM(billing_rate - hourly_rate) as total_arari_potential,
                MIN(billing_rate - hourly_rate) as min_arari,
                MAX(billing_rate - hourly_rate) as max_arari
            FROM haken_employees
            WHERE billing_rate > 0 AND hourly_rate > 0
        ''')

        row = cursor.fetchone()

        stats = {
            'total_employees': row[0] or 0,
            'avg_jikyuu': row[1] or 0,
            'avg_tanka': row[2] or 0,
            'avg_arari': row[3] or 0,
            'total_arari_potential': row[4] or 0,
            'min_arari': row[5] or 0,
            'max_arari': row[6] or 0
        }

        stats['avg_margin_rate'] = (stats['avg_arari'] / stats['avg_tanka'] * 100) if stats['avg_tanka'] else 0

        # Count by status
        cursor.execute('''
            SELECT status, COUNT(*)
            FROM haken_employees
            WHERE billing_rate > 0 AND hourly_rate > 0
            GROUP BY status
        ''')
        stats['by_status'] = {row[0]: row[1] for row in cursor.fetchall()}

        # Top 5 most profitable companies
        cursor.execute('''
            SELECT dispatch_company, AVG(billing_rate - hourly_rate) as avg_arari
            FROM haken_employees
            WHERE billing_rate > 0 AND hourly_rate > 0 AND dispatch_company IS NOT NULL
            GROUP BY dispatch_company
            ORDER BY avg_arari DESC
            LIMIT 5
        ''')
        stats['top_companies'] = [{'company': row[0], 'avg_arari': row[1]} for row in cursor.fetchall()]

        return stats

def get_available_periods() -> List[str]:
    """Get list of available periods from payroll records"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT DISTINCT period FROM payroll_records ORDER BY period DESC')
        return [row[0] for row in cursor.fetchall()]

if __name__ == "__main__":
    # Test database connection
    print("Testing database connection...")
    try:
        stats = get_statistics()
        print(f"Total employees: {stats['total_employees']}")
        print(f"Average 粗利: {stats['avg_arari']:,.0f}円/時")
        print(f"Margin rate: {stats['avg_margin_rate']:.1f}%")
        print("Database connection OK!")
    except Exception as e:
        print(f"Error: {e}")
