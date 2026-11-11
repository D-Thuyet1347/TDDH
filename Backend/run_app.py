import os
import sys
import time
import threading
import webbrowser
import multiprocessing
from pathlib import Path

# Required for PyInstaller Windows support
multiprocessing.freeze_support()

# Set UTF-8 encoding for console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure current directory and Backend are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from config.settings import HOST, PORT
from main import app
import uvicorn
import socket

def find_available_port(preferred_port):
    for port in [preferred_port, 5050, 5001, 8080, 8000]:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('0.0.0.0', port))
                return port
        except OSError:
            continue
    return preferred_port

actual_port = find_available_port(PORT)

def open_browser():
    time.sleep(1.5)
    url = f"http://localhost:{actual_port}"
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[Launcher] Không thể tự động mở trình duyệt: {e}")

def main():
    print("=" * 60)
    print("       HỆ THỐNG THEO DÕI TIẾN ĐỘ ĐƠN HÀNG HRC2")
    print("=" * 60)
    if actual_port != PORT:
        print(f"[!] Cổng {PORT} đang bận, tự động chuyển sang cổng {actual_port}")
    print(f"[*] Ứng dụng đang khởi động trên cổng {actual_port}...")
    print(f"[*] Địa chỉ truy cập: http://localhost:{actual_port}")
    print(f"[*] Trình duyệt web sẽ tự động mở trong giây lát...")
    print(f"[*] (Để tắt ứng dụng, nhấn tổ hợp phím Ctrl + C hoặc đóng cửa sổ này)")
    print("=" * 60 + "\n")

    # Start browser opener in background thread
    threading.Thread(target=open_browser, daemon=True).start()

    # Run uvicorn server
    uvicorn.run(
        app,
        host=HOST,
        port=actual_port,
        log_level="info",
        access_log=False
    )

if __name__ == "__main__":
    main()
