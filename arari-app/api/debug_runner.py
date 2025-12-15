import sys
import traceback
from verify_name_lookup import verify

if __name__ == "__main__":
    with open("error.log", "w", encoding="utf-8") as f:
        sys.stderr = f
        try:
            verify()
        except:
             traceback.print_exc(file=f)
