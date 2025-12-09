import sqlite3

conn = sqlite3.connect('arari_pro.db')
cursor = conn.cursor()

# Get table names
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
print('Tables:', tables)

# Get payroll count
cursor.execute('SELECT COUNT(*) FROM payroll_records')
total = cursor.fetchone()[0]
print(f'\nTotal payroll records: {total}')

# Get periods
cursor.execute('SELECT DISTINCT period FROM payroll_records ORDER BY period DESC')
periods = [row[0] for row in cursor.fetchall()]
print(f'\nPeriods: {periods}')

# Get records per period
cursor.execute('SELECT period, COUNT(*) FROM payroll_records GROUP BY period ORDER BY period DESC')
print('\nRecords per period:')
for row in cursor.fetchall():
    print(f'  {row[0]}: {row[1]} records')

conn.close()
