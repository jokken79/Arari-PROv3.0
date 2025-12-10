#!/usr/bin/env python
"""
Direct test of salary parser to diagnose why it returns 0 records
"""
import sys
sys.path.insert(0, r"d:\Arari-PROv1.0\Arari-PRO\arari-app\api")

from salary_parser import SalaryStatementParser

file_path = r"D:\給料明細\Kyuryo\給与明細(派遣社員)2025.1(0217支給).xlsm"

print(f"Testing parser with file: {file_path}")
print("=" * 80)

with open(file_path, 'rb') as f:
    content = f.read()
    print(f"File size: {len(content)} bytes")

parser = SalaryStatementParser(use_intelligent_mode=True)
print("Parser instance created")

print("\nCalling parser.parse()...")
sys.stdout.flush()

try:
    records = parser.parse(content)
    sys.stdout.flush()
except Exception as e:
    print(f"\n*** EXCEPTION during parsing: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print(f"\n{'='*80}")
print(f"RESULT: {len(records)} records returned")
print(f"{'='*80}")
sys.stdout.flush()

if len(records) > 0:
    print(f"\nFirst record sample:")
    print(f"  Employee ID: {records[0].employee_id}")
    print(f"  Period: {records[0].period}")
    print(f"  Work Hours: {records[0].work_hours}")
    sys.stdout.flush()
else:
    print("\nNO RECORDS - Check debug output above for sheet names and detection info")
    sys.stdout.flush()
    
# Get parsing stats
stats = parser.get_parsing_stats()
print(f"\nParsing Stats:")
for key, value in stats.items():
    print(f"  {key}: {value}")
sys.stdout.flush()
