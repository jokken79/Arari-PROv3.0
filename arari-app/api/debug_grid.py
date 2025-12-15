
import openpyxl
import pandas as pd

template_path = r"d:\Arari-PROv1.0.25.12.11\Arari-PROv1.0\Arari-PRO\arari-app\api\templates\template_format_b.xlsx"
wb = openpyxl.load_workbook(template_path)
ws = wb.active

data = []
for row in range(1, 16):
    r_data = []
    for col in range(1, 16):
        val = ws.cell(row=row, column=col).value
        r_data.append(str(val) if val else "")
    data.append(r_data)

df = pd.DataFrame(data)
print(df.to_csv(index=False))
