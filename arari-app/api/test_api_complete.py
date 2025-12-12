#!/usr/bin/env python3
"""
Arari PRO - Complete API Test Suite
Tests all endpoints and functionality
"""

import requests
import json
import sys
from datetime import datetime

API_BASE = "http://localhost:8000"
PASS = "✅"
FAIL = "❌"
WARN = "⚠️"

results = {
    "passed": 0,
    "failed": 0,
    "warnings": 0
}


def test(name: str, condition: bool, error_msg: str = ""):
    """Test helper function"""
    if condition:
        print(f"{PASS} {name}")
        results["passed"] += 1
    else:
        print(f"{FAIL} {name}: {error_msg}")
        results["failed"] += 1


def warn(name: str, message: str):
    """Warning helper"""
    print(f"{WARN} {name}: {message}")
    results["warnings"] += 1


def run_tests():
    print("=" * 60)
    print("🧪 ARARI PRO - COMPLETE API TEST SUITE")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # ============== Health Check ==============
    print("\n📌 HEALTH CHECK")
    try:
        r = requests.get(f"{API_BASE}/api/health", timeout=5)
        test("Health endpoint returns 200", r.status_code == 200)
        data = r.json()
        test("Health status is healthy", data.get("status") == "healthy")
        test("Version is 2.0.0", data.get("version") == "2.0.0")
    except Exception as e:
        test("Health endpoint accessible", False, str(e))

    # ============== Authentication ==============
    print("\n📌 AUTHENTICATION")
    token = None

    # Test login with correct credentials
    try:
        r = requests.post(
            f"{API_BASE}/api/auth/login",
            json={"username": "Admin", "password": "Admin123"},
            timeout=5
        )
        test("Login returns 200", r.status_code == 200)
        data = r.json()
        test("Login returns token", "token" in data)
        test("Login returns user", "user" in data)
        test("User is admin", data.get("user", {}).get("role") == "admin")
        test("Username is Admin", data.get("user", {}).get("username") == "Admin")
        token = data.get("token")
    except Exception as e:
        test("Login endpoint accessible", False, str(e))

    # Test login with wrong password
    try:
        r = requests.post(
            f"{API_BASE}/api/auth/login",
            json={"username": "Admin", "password": "wrong"},
            timeout=5
        )
        test("Wrong password returns 401", r.status_code == 401)
    except Exception as e:
        test("Login rejects wrong password", False, str(e))

    # Test login with wrong username
    try:
        r = requests.post(
            f"{API_BASE}/api/auth/login",
            json={"username": "nobody", "password": "Admin123"},
            timeout=5
        )
        test("Wrong username returns 401", r.status_code == 401)
    except Exception as e:
        test("Login rejects wrong username", False, str(e))

    # ============== Employees ==============
    print("\n📌 EMPLOYEES")
    try:
        r = requests.get(f"{API_BASE}/api/employees", timeout=5)
        test("Employees list returns 200", r.status_code == 200)
        data = r.json()
        test("Employees returns list", isinstance(data, list))
        if len(data) == 0:
            warn("Employees", "No employees in database (upload Excel to populate)")
    except Exception as e:
        test("Employees endpoint accessible", False, str(e))

    # ============== Payroll ==============
    print("\n📌 PAYROLL")
    try:
        r = requests.get(f"{API_BASE}/api/payroll", timeout=5)
        test("Payroll list returns 200", r.status_code == 200)
        data = r.json()
        test("Payroll returns list", isinstance(data, list))
    except Exception as e:
        test("Payroll endpoint accessible", False, str(e))

    try:
        r = requests.get(f"{API_BASE}/api/payroll/periods", timeout=5)
        test("Payroll periods returns 200", r.status_code == 200)
        data = r.json()
        test("Periods returns list", isinstance(data, list))
    except Exception as e:
        test("Payroll periods accessible", False, str(e))

    # ============== Statistics ==============
    print("\n📌 STATISTICS")
    try:
        r = requests.get(f"{API_BASE}/api/statistics", timeout=5)
        test("Statistics returns 200", r.status_code == 200)
        data = r.json()
        test("Has total_employees", "total_employees" in data)
        test("Has average_margin", "average_margin" in data)
        test("Has profit_trend", "profit_trend" in data)
        test("Has top_companies", "top_companies" in data)
    except Exception as e:
        test("Statistics endpoint accessible", False, str(e))

    try:
        r = requests.get(f"{API_BASE}/api/statistics/companies", timeout=5)
        test("Company stats returns 200", r.status_code == 200)
    except Exception as e:
        test("Company stats accessible", False, str(e))

    try:
        r = requests.get(f"{API_BASE}/api/statistics/trend?months=6", timeout=5)
        test("Trend stats returns 200", r.status_code == 200)
    except Exception as e:
        test("Trend stats accessible", False, str(e))

    # ============== Settings ==============
    print("\n📌 SETTINGS")
    try:
        r = requests.get(f"{API_BASE}/api/settings", timeout=5)
        test("Settings list returns 200", r.status_code == 200)
        data = r.json()
        test("Settings returns list", isinstance(data, list))

        keys = [s.get("key") for s in data]
        test("Has employment_insurance_rate", "employment_insurance_rate" in keys)
        test("Has workers_comp_rate", "workers_comp_rate" in keys)
        test("Has target_margin", "target_margin" in keys)
    except Exception as e:
        test("Settings endpoint accessible", False, str(e))

    # ============== Templates ==============
    print("\n📌 TEMPLATES")
    try:
        r = requests.get(f"{API_BASE}/api/templates", timeout=5)
        test("Templates returns 200", r.status_code == 200)
        data = r.json()
        test("Has templates list", "templates" in data)
        test("Has stats", "stats" in data)
    except Exception as e:
        test("Templates endpoint accessible", False, str(e))

    # ============== Alerts ==============
    print("\n📌 ALERTS")
    try:
        r = requests.get(f"{API_BASE}/api/alerts", timeout=5)
        test("Alerts returns 200", r.status_code == 200)
    except Exception as e:
        test("Alerts endpoint accessible", False, str(e))

    try:
        r = requests.get(f"{API_BASE}/api/alerts/summary", timeout=5)
        test("Alerts summary returns 200", r.status_code == 200)
    except Exception as e:
        test("Alerts summary accessible", False, str(e))

    # ============== Budgets ==============
    print("\n📌 BUDGETS")
    try:
        r = requests.get(f"{API_BASE}/api/budgets", timeout=5)
        test("Budgets returns 200", r.status_code == 200)
    except Exception as e:
        test("Budgets endpoint accessible", False, str(e))

    # ============== Search ==============
    print("\n📌 SEARCH")
    try:
        r = requests.get(f"{API_BASE}/api/search/employees?query=test", timeout=5)
        test("Search employees returns 200", r.status_code == 200)
    except Exception as e:
        test("Search employees accessible", False, str(e))

    try:
        r = requests.get(f"{API_BASE}/api/search/filters", timeout=5)
        test("Search filters returns 200", r.status_code == 200)
    except Exception as e:
        test("Search filters accessible", False, str(e))

    # ============== Validation ==============
    print("\n📌 VALIDATION")
    try:
        r = requests.get(f"{API_BASE}/api/validation", timeout=5)
        test("Validation returns 200", r.status_code == 200)
    except Exception as e:
        test("Validation endpoint accessible", False, str(e))

    # ============== Backup ==============
    print("\n📌 BACKUP")
    try:
        r = requests.get(f"{API_BASE}/api/backups", timeout=5)
        test("Backups list returns 200", r.status_code == 200)
    except Exception as e:
        test("Backups endpoint accessible", False, str(e))

    # ============== ROI ==============
    print("\n📌 ROI ANALYTICS")
    try:
        r = requests.get(f"{API_BASE}/api/roi/summary", timeout=5)
        test("ROI summary returns 200", r.status_code == 200)
    except Exception as e:
        test("ROI endpoint accessible", False, str(e))

    # ============== Reports ==============
    print("\n📌 REPORTS")
    try:
        r = requests.get(f"{API_BASE}/api/reports/history", timeout=5)
        test("Reports history returns 200", r.status_code == 200)
    except Exception as e:
        test("Reports endpoint accessible", False, str(e))

    # ============== Notifications ==============
    print("\n📌 NOTIFICATIONS")
    try:
        r = requests.get(f"{API_BASE}/api/notifications", timeout=5)
        test("Notifications returns 200", r.status_code == 200)
    except Exception as e:
        test("Notifications endpoint accessible", False, str(e))

    try:
        r = requests.get(f"{API_BASE}/api/notifications/count", timeout=5)
        test("Notifications count returns 200", r.status_code == 200)
    except Exception as e:
        test("Notifications count accessible", False, str(e))

    # ============== Cache ==============
    print("\n📌 CACHE")
    try:
        r = requests.get(f"{API_BASE}/api/cache/stats", timeout=5)
        test("Cache stats returns 200", r.status_code == 200)
    except Exception as e:
        test("Cache endpoint accessible", False, str(e))

    # ============== Audit ==============
    print("\n📌 AUDIT")
    try:
        r = requests.get(f"{API_BASE}/api/audit", timeout=5)
        test("Audit logs returns 200", r.status_code == 200)
    except Exception as e:
        test("Audit endpoint accessible", False, str(e))

    try:
        r = requests.get(f"{API_BASE}/api/audit/summary", timeout=5)
        test("Audit summary returns 200", r.status_code == 200)
    except Exception as e:
        test("Audit summary accessible", False, str(e))

    # ============== Summary ==============
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    total = results["passed"] + results["failed"]
    print(f"✅ Passed:   {results['passed']}/{total}")
    print(f"❌ Failed:   {results['failed']}/{total}")
    print(f"⚠️  Warnings: {results['warnings']}")
    print("=" * 60)

    if results["failed"] == 0:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"💥 {results['failed']} TESTS FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())
