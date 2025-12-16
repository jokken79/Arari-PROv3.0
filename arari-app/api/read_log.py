
try:
    with open("debug_costs.log", "r", encoding="utf-16") as f:
        print(f.read())
except Exception as e:
    print(f"UTF-16 failed, trying utf-8: {e}")
    try:
        with open("debug_costs.log", "r", encoding="utf-8") as f:
            print(f.read())
    except Exception as e2:
        print(f"UTF-8 failed too: {e2}")
