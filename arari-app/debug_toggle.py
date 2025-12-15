from api.database import get_db, init_db
from api.services import PayrollService
from api.main import toggle_company_status, get_ignored_companies
import asyncio

async def test_toggle():
    # Initialize DB (creates file if not exists)
    init_db()
    
    # Get DB connection
    db_gen = get_db()
    db = next(db_gen)
    
    service = PayrollService(db)
    
    # 1. Check initial state
    print("Initial ignored:", service.get_ignored_companies())
    
    # 2. Deactivate "Unknown"
    company = "Unknown"
    print(f"Deactivating {company}...")
    service.set_company_active(company, False)
    
    # 3. Check state
    ignored = service.get_ignored_companies()
    print("Ignored after deactivate:", ignored)
    
    if company in ignored:
        print("SUCCESS: Company is ignored")
    else:
        print("FAILURE: Company is NOT ignored")
        
    # 4. Reactivate
    print(f"Reactivating {company}...")
    service.set_company_active(company, True)
    
    # 5. Check state
    ignored = service.get_ignored_companies()
    print("Ignored after reactivate:", ignored)
    
    if company not in ignored:
        print("SUCCESS: Company is active again")
    else:
        print("FAILURE: Company is still ignored")

if __name__ == "__main__":
    import sys
    import os
    # Add api directory to path so imports work
    sys.path.append(os.path.join(os.getcwd(), 'api'))
    
    asyncio.run(test_toggle())
