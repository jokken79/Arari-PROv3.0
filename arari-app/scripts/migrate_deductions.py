
import sqlite3
import os

DB_PATH = "api/arari_pro.db"

def migrate_db():
    print(f"Checking database at {DB_PATH}...")
    
    if not os.path.exists(DB_PATH):
        print("Database not found!")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # New columns to add
    new_columns = [
        ("rent_deduction", "REAL DEFAULT 0"),
        ("utilities_deduction", "REAL DEFAULT 0"), 
        ("meal_deduction", "REAL DEFAULT 0"),
        ("advance_payment", "REAL DEFAULT 0"),
        ("year_end_adjustment", "REAL DEFAULT 0")
    ]
    
    try:
        # Get existing columns
        cursor.execute("PRAGMA table_info(payroll_records)")
        existing_cols = [row[1] for row in cursor.fetchall()]
        
        for col_name, col_type in new_columns:
            if col_name not in existing_cols:
                print(f"Adding column {col_name}...")
                cursor.execute(f"ALTER TABLE payroll_records ADD COLUMN {col_name} {col_type}")
            else:
                print(f"Column {col_name} already exists.")
                
        conn.commit()
        print("Migration completed successfully.")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    # Change directory to arari-app if needed
    if os.path.exists("arari-app"):
        os.chdir("arari-app")
    
    migrate_db()
