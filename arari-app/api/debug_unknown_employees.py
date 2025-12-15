
from database import get_connection
import sqlite3

def analyze_companies_costs():
    conn = get_connection()
    cursor = conn.cursor()
    
    with open("debug_result.txt", "w", encoding="utf-8") as f:
        f.write("--- SCHEMA: employees ---\n")
        cursor.execute("PRAGMA table_info(employees)")
        cols = cursor.fetchall()
        col_names = [c[1] for c in cols]
        
        target_col = "dispatch_company" if "dispatch_company" in col_names else "company_id"
        f.write(f"Targeting: {target_col}\n")

        f.write(f"\n--- Cost per Company ({target_col}) ---\n")
        try:
            query = f"""
                SELECT e.{target_col}, SUM(p.gross_salary) as total_cost, COUNT(DISTINCT p.employee_id)
                FROM payroll_records p
                JOIN employees e ON p.employee_id = e.employee_id
                GROUP BY e.{target_col}
                ORDER BY total_cost DESC
            """
            cursor.execute(query)
            results = cursor.fetchall()
            
            for r in results:
                company_name = f"'{r[0]}'" if r[0] else "NULL/EMPTY"
                f.write(f"Company: {company_name} -> Cost: {r[1]:,.0f} (Emps: {r[2]})\n")
                
        except Exception as e:
            f.write(f"Query failed: {e}\n")

    conn.close()

if __name__ == "__main__":
    analyze_companies_costs()
