#!/usr/bin/env python3
"""
粗利 PRO - Application Launcher
派遣社員利益管理システム

Starts the web server and opens browser automatically.
"""

import subprocess
import sys
import time
import webbrowser
import os

PORT = 8990
URL = f"http://localhost:{PORT}"

def main():
    print("=" * 50)
    print("  粗利 PRO - 派遣社員利益管理システム")
    print("  Profit Margin Management System v1.0")
    print("=" * 50)
    print()

    # Check database
    from database import get_db_path
    try:
        db_path = get_db_path()
        print(f"[OK] データベース発見: {db_path}")
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        print("\nChinginGenerator-v4-PRO のデータベースが必要です。")
        print("chingin_data.db を同じディレクトリか親ディレクトリに配置してください。")
        input("\nEnterキーで終了...")
        sys.exit(1)

    print(f"[OK] サーバー起動中... ポート {PORT}")
    print(f"[OK] ブラウザで開く: {URL}")
    print()
    print("終了するには Ctrl+C を押してください")
    print("-" * 50)

    # Open browser after short delay
    def open_browser():
        time.sleep(1.5)
        webbrowser.open(URL)

    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    # Start uvicorn
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=False)

if __name__ == "__main__":
    main()
