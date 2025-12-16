import os
import sqlite3

DB_PATH = "arari_pro.db"


def reset_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Delete all data from main tables
        cursor.execute("DELETE FROM payroll_records")
        print("✅ Payroll records deleted.")

        cursor.execute("DELETE FROM employees")
        print("✅ Employees deleted.")

        # Optional: Reset settings or keep them? Keeping settings is usually better.
        # cursor.execute("DELETE FROM settings")

        conn.commit()
        conn.close()
        print("\n🎉 Database cleared successfully! Ready for fresh upload.")

    except Exception as e:
        print(f"❌ Error clearing database: {e}")


if __name__ == "__main__":
    reset_db()
