
import urllib.request

url = "http://localhost:8765/api/upload"
file_path = "Employee_List.xlsx"
boundary = "---------------------------1234567890123456789012345678"

with open(file_path, "rb") as f:
    file_content = f.read()

# Build multipart/form-data body manually
body = (
    f"--{boundary}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="{file_path}"\r\n'
    "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n"
    "\r\n"
).encode("utf-8") + file_content + (
    f"\r\n--{boundary}--\r\n"
).encode("utf-8")

req = urllib.request.Request(url, data=body)
req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

try:
    print(f"Uploading {file_path}...")
    with urllib.request.urlopen(req) as response:
        print(f"Status Code: {response.status}")
        print(f"Response: {response.read().decode()}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code}")
    print(f"Response: {e.read().decode()}")
except Exception as e:
    print(f"Error: {e}")
