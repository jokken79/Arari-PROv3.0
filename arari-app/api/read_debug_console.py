
def read_filtered():
    content = ""
    try:
        with open("debug_console.txt", "r", encoding="utf-16") as f:
            content = f.read()
    except:
        with open("debug_console.txt", "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
    for line in content.splitlines():
        if any(x in line for x in ["Header", "Row", "Sheet", "Found", "Analysing", "Sample"]):
            print(line)

read_filtered()
