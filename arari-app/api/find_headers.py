
import openpyxl

template_path = r"d:\Arari-PROv1.0.25.12.11\Arari-PROv1.0\Arari-PRO\arari-app\api\templates\template_format_b.xlsx"
wb = openpyxl.load_workbook(template_path)
ws = wb.active

targets = ["氏", "名", "所", "属", "雇", "入", "生", "年", "性", "別"]

print("Scanning for headers...")
for row in range(1, 6):
    for col in range(1, 20):
        val = str(ws.cell(row=row, column=col).value or "").replace(" ", "").replace("　", "")
        if any(t in val for t in targets) and len(val) > 1:
            print(f"Found '{val}' at Row {row}, Col {col}")
