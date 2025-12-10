import urllib.request
import urllib.parse
import os
import mimetypes

file_path = r"D:\【新】社員台帳(UNS)T　2022.04.05～.xlsm"
url = "http://localhost:8765/api/import-employees"

if not os.path.exists(file_path):
    print(f"Error: File not found at {file_path}")
    exit(1)

print(f"Uploading {file_path} to {url}...")

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
data = []
data.append(f'--{boundary}'.encode())
data.append(f'Content-Disposition: form-data; name="file"; filename="{os.path.basename(file_path)}"'.encode())
data.append('Content-Type: application/vnd.ms-excel.sheet.macroEnabled.12'.encode())
data.append(b'')
with open(file_path, 'rb') as f:
    data.append(f.read())
data.append(f'--{boundary}--'.encode())
data.append(b'')

body = b'\r\n'.join(data)
headers = {'Content-Type': f'multipart/form-data; boundary={boundary}', 'Content-Length': str(len(body))}

try:
    req = urllib.request.Request(url, body, headers)
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.getcode()}")
        print("Response:", response.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(e.read().decode('utf-8'))
except Exception as e:
    print(f"An error occurred: {e}")
