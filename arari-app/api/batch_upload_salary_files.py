#!/usr/bin/env python3
"""
Batch upload salary statement files (給料明細) from D:\\給料明細\
Uploads all .xlsm files to the backend API
"""

import io
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict, List
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

# Configuration
SALARY_DIR = Path("D:/給料明細")
BACKEND_URL = "http://localhost:8000"
UPLOAD_ENDPOINT = f"{BACKEND_URL}/api/upload"


class BatchUploader:
    def __init__(self):
        self.results = {
            "total_files": 0,
            "successful": 0,
            "failed": 0,
            "total_records_saved": 0,
            "total_records_skipped": 0,
            "total_errors": 0,
            "files": [],
        }

    def get_salary_files(self) -> List[Path]:
        """Get all .xlsm files from salary directory"""
        if not SALARY_DIR.exists():
            print(f"ERROR: Directory not found: {SALARY_DIR}")
            return []

        files = sorted(SALARY_DIR.glob("*.xlsm"))
        print(f"\nFound {len(files)} salary statement files to upload")
        for f in files:
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"  - {f.name} ({size_mb:.2f} MB)")

        return files

    def upload_file(self, file_path: Path) -> Dict[str, Any]:
        """Upload a single file to backend"""
        print(f"\n{'='*70}")
        print(f"Uploading: {file_path.name}")
        print(f"{'='*70}")

        try:
            with open(file_path, "rb") as f:
                file_data = f.read()

            print(f"  Sending to {UPLOAD_ENDPOINT}...")
            start_time = time.time()

            # Use multipart form data encoding
            boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
            body = io.BytesIO()
            body.write(f"--{boundary}\r\n".encode())
            body.write(
                f'Content-Disposition: form-data; name="file"; filename="{file_path.name}"\r\n'.encode()
            )
            body.write(
                b"Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n"
            )
            body.write(file_data)
            body.write(f"\r\n--{boundary}--\r\n".encode())

            req = Request(
                UPLOAD_ENDPOINT,
                data=body.getvalue(),
                headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            )

            elapsed_start = time.time()
            response = urlopen(req, timeout=120)
            elapsed = time.time() - elapsed_start

            response_data = response.read().decode("utf-8")
            data = json.loads(response_data)

            print(f"  Status: [SUCCESS] ({elapsed:.1f}s)")
            print(f"  Saved Records: {data.get('saved_records', 0)}")
            print(f"  Skipped: {data.get('skipped_count', 0)}")
            print(f"  Errors: {data.get('error_count', 0)}")

            return {
                "file": file_path.name,
                "status": "success",
                "saved": data.get("saved_records", 0),
                "skipped": data.get("skipped_count", 0),
                "errors": data.get("error_count", 0),
                "response": data,
            }

        except HTTPError as e:
            error_msg = e.read().decode("utf-8") if e.fp else str(e)
            print(f"  Status: [FAILED] ({e.code})")
            print(f"  Error: {error_msg[:200]}")

            return {
                "file": file_path.name,
                "status": "error",
                "error": f"HTTP {e.code}",
                "details": error_msg,
            }
        except URLError as e:
            print("  Status: [ERROR] Connection failed")
            print(f"  Error: {str(e)}")

            return {
                "file": file_path.name,
                "status": "error",
                "error": f"Connection error: {str(e)}",
            }
        except Exception as e:
            print("  Status: [EXCEPTION]")
            print(f"  Error: {str(e)}")

            return {"file": file_path.name, "status": "error", "error": str(e)}

    def run(self):
        """Run batch upload"""
        print("\n" + "=" * 70)
        print("BATCH UPLOAD: Salary Statement Files (給料明細)")
        print("=" * 70)

        # Get all files
        files = self.get_salary_files()
        if not files:
            print("\nNo files to upload")
            return False

        self.results["total_files"] = len(files)

        # Upload each file
        for file_path in files:
            result = self.upload_file(file_path)
            self.results["files"].append(result)

            if result["status"] == "success":
                self.results["successful"] += 1
                self.results["total_records_saved"] += result.get("saved", 0)
                self.results["total_records_skipped"] += result.get("skipped", 0)
                self.results["total_errors"] += result.get("errors", 0)
            else:
                self.results["failed"] += 1

            # Small delay between uploads to avoid overwhelming the server
            time.sleep(1)

        # Print summary
        self.print_summary()
        return self.results["failed"] == 0

    def print_summary(self):
        """Print upload summary"""
        print("\n" + "=" * 70)
        print("UPLOAD SUMMARY")
        print("=" * 70)
        print("\nFiles:")
        print(f"  Total: {self.results['total_files']}")
        print(f"  Successful: {self.results['successful']}")
        print(f"  Failed: {self.results['failed']}")

        print("\nRecords:")
        print(f"  Total Saved: {self.results['total_records_saved']:,}")
        print(f"  Total Skipped: {self.results['total_records_skipped']:,}")
        print(f"  Total Errors: {self.results['total_errors']:,}")

        print("\nDetails per file:")
        for file_result in self.results["files"]:
            status_icon = "OK" if file_result["status"] == "success" else "FAIL"
            print(f"  {status_icon} {file_result['file']}")
            if file_result["status"] == "success":
                print(
                    f"    - Saved: {file_result.get('saved', 0)}, Skipped: {file_result.get('skipped', 0)}, Errors: {file_result.get('errors', 0)}"
                )
            else:
                print(f"    - Error: {file_result.get('error', 'Unknown')}")

        print("\n" + "=" * 70)
        if self.results["failed"] == 0:
            print("[SUCCESS] ALL FILES UPLOADED SUCCESSFULLY")
        else:
            print(f"[ERROR] {self.results['failed']} file(s) failed to upload")
        print("=" * 70 + "\n")


def check_backend_availability():
    """Check if backend API is running"""
    try:
        response = urlopen(f"{BACKEND_URL}/api/health", timeout=5)
        if response.status == 200:
            print(f"[OK] Backend API is running ({BACKEND_URL})")
            return True
    except Exception as e:
        print(f"[ERROR] Backend API is not available: {e}")
        print(f"  Make sure the backend is running at {BACKEND_URL}")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("Batch Upload Salary Statement Files")
    print("=" * 70)

    # Check backend
    if not check_backend_availability():
        print("\nPlease start the backend API first:")
        print("  cd d:\\Arari-PRO\\arari-app\\api")
        print("  python main.py")
        sys.exit(1)

    # Run batch upload
    uploader = BatchUploader()
    success = uploader.run()

    sys.exit(0 if success else 1)
