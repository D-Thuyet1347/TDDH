import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import uvicorn
from config.settings import HOST, PORT

def free_port_if_in_use(port: int):
    """If port is occupied by another process on Windows, give clear guidance or terminate stale process."""
    if sys.platform == "win32":
        try:
            import subprocess
            out = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True, text=True, errors='ignore')
            lines = [line.strip() for line in out.strip().splitlines() if f":{port}" in line and "LISTENING" in line]
            cur_pid = os.getpid()
            for line in lines:
                parts = line.split()
                if len(parts) >= 5:
                    pid = int(parts[-1])
                    if pid != cur_pid and pid > 0:
                        print(f"[Port Check] Port {port} đang bị chiếm bởi PID {pid}. Đang giải phóng port...")
                        subprocess.run(f"taskkill /F /PID {pid}", shell=True, capture_output=True)
        except Exception:
            pass

if __name__ == "__main__":
    is_prod = bool(os.environ.get("RENDER") or os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("PORT"))
    reload_mode = not is_prod and os.environ.get("RELOAD", "true").lower() in ("true", "1")

    if not is_prod:
        free_port_if_in_use(PORT)

    print(f"[Python Server] Starting on http://{HOST}:{PORT} (reload={reload_mode})")
    uvicorn.run("main:app", host=HOST, port=PORT, reload=reload_mode)
