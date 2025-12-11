
import sys
import os

# Add current directory to path to find models
sys.path.append(os.getcwd())

from salary_parser import SalaryStatementParser

def verify_fix():
    print("Testing SalaryStatementParser.get_parsing_stats()...")
    try:
        parser = SalaryStatementParser(use_intelligent_mode=True)
        stats = parser.get_parsing_stats()
        print(f"SUCCESS: get_parsing_stats() returned: {stats}")
    except AttributeError as e:
        print(f"FAIL: AttributeError caught: {e}")
    except Exception as e:
        print(f"FAIL: Unexpected error: {e}")

if __name__ == "__main__":
    verify_fix()
