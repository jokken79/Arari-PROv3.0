import urllib.request
import urllib.parse
import os
import glob
import mimetypes

# Search for the payroll files
base_path = r"D:/"
pattern = "給与明細(派遣社員)*.xlsm"
files = glob.glob(os.path.join(base_path, pattern))
url = "http://localhost:8765/api/upload"

if not files:
    print("No payroll files found matching pattern.")
    files = [r"D:\給料明細\Kyuryo\給与明細(派遣社員)2025.1(0217支給).xlsm"]

print(f"Found {len(files)} files.")

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'

for file_path in files[:1]: # Try just one first
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} (not found)")
        continue

    print(f"Uploading {file_path} to {url}...")
    
    data = []
    data.append(f'--{boundary}'.encode())
    data.append(f'Content-Disposition: form-data; name="file"; filename="{os.path.basename(file_path)}"'.encode())
    data.append('Content-Type: application/vnd.ms-excel.sheet.macroEnabled.12'.encode())
    data.append(b'')
    
    try:
        with open(file_path, 'rb') as f:
            data.append(f.read())
            
        data.append(f'--{boundary}--'.encode())
        data.append(b'')
        
        body = b'\r\n'.join(data)
        headers = {'Content-Type': f'multipart/form-data; boundary={boundary}', 'Content-Length': str(len(body))}
        
        req = urllib.request.Request(url, body, headers)
        with urllib.request.urlopen(req, timeout=300) as response:
            print(f"Status Code: {response.getcode()}")
            print("Response:", response.read().decode('utf-8'))
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"An error occurred: {e}")
