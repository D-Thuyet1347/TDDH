import os
import sys
from pathlib import Path
from dotenv import load_dotenv

if getattr(sys, "frozen", False):
    # Running in a PyInstaller bundle
    BASE_DIR = Path(getattr(sys, "_MEIPASS", Path(sys.executable).parent))
    APP_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent.parent
    APP_DIR = BASE_DIR

# Load .env file from APP_DIR or BASE_DIR
env_path = APP_DIR / ".env"
if not env_path.exists():
    env_path = BASE_DIR / ".env"
if not env_path.exists():
    env_path = BASE_DIR.parent / "Backend" / ".env"

load_dotenv(env_path)

PORT = int(os.getenv("PORT", "5000"))
HOST = os.getenv("HOST", "0.0.0.0")
JWT_SECRET = os.getenv("JWT_SECRET", "Theo doi don hang")

MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DB = os.getenv("MONGODB_DB", "hrc2_qc")
MONGODB_IMPORT_ROWS = os.getenv("MONGODB_IMPORT_ROWS", "true").lower() == "true"
MONGODB_BATCH_SIZE = int(os.getenv("MONGODB_BATCH_SIZE", "500"))
MONGODB_MAX_ROWS = int(os.getenv("MONGODB_MAX_ROWS", "0"))
MONGODB_TIMEOUT_MS = int(os.getenv("MONGODB_TIMEOUT_MS", "12000"))

QC_SITE_URL = os.getenv("QC_SITE_URL", "https://quality.hoaphatdungquat.vn/qlcl")
QC_USERNAME = os.getenv("QC_USERNAME", "")
QC_PASSWORD = os.getenv("QC_PASSWORD", "")

HEADLESS = os.getenv("HEADLESS", "true").lower() != "false"
PAGE_TIMEOUT_MS = int(os.getenv("PAGE_TIMEOUT_MS", "120000"))
DOWNLOAD_TIMEOUT_MS = int(os.getenv("DOWNLOAD_TIMEOUT_MS", "120000"))
CHROMIUM_PATH = os.getenv("CHROMIUM_PATH", "")
MAX_PENDING = int(os.getenv("MAX_PENDING", "30"))
KEEP_LOCAL_EXPORT = os.getenv("KEEP_LOCAL_EXPORT", "true").lower() == "true"

CSS_LOGIN_USERNAME = os.getenv("CSS_LOGIN_USERNAME", "")
CSS_LOGIN_PASSWORD = os.getenv("CSS_LOGIN_PASSWORD", "")
CSS_LOGIN_BUTTON = os.getenv("CSS_LOGIN_BUTTON", "")
CSS_OPEN_EXPORT = os.getenv(
    "CSS_OPEN_EXPORT",
    'button[onclick="openExportModal()"], button[onclick*="Export"], #btnExport, [data-target="#exportExcelModal"]',
)
CSS_FACTORY = os.getenv("CSS_FACTORY", "#expFactory")
CSS_FROM_DATE = os.getenv("CSS_FROM_DATE", "#expStartDate")
CSS_TO_DATE = os.getenv("CSS_TO_DATE", "#expEndDate")
CSS_COIL_IDS = os.getenv("CSS_COIL_IDS", "#expCoilIds")
CSS_DOWNLOAD_BUTTON = os.getenv("CSS_DOWNLOAD_BUTTON", 'button[onclick="executeExportExcel()"]')

# User data directories (stored alongside the .exe in APP_DIR)
EXPORTS_DIR = APP_DIR / "exports"
UPLOADS_DIR = APP_DIR / "uploads"
DATA_DIR = APP_DIR / "data"
SQLITE_DB_PATH = DATA_DIR / "hrc2_database.sqlite"
BACKEND_EXPORTS_DIR = EXPORTS_DIR

# Tự động nhận diện Chromium bundled nếu chưa cấu hình CHROMIUM_PATH
if not CHROMIUM_PATH:
    bundled_shell = APP_DIR / "browsers" / "chrome-headless-shell-win64" / "chrome-headless-shell.exe"
    if bundled_shell.exists():
        CHROMIUM_PATH = str(bundled_shell)
    else:
        bundled_chrome = APP_DIR / "browsers" / "chromium" / "chrome.exe"
        if bundled_chrome.exists():
            CHROMIUM_PATH = str(bundled_chrome)

EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

# If running frozen and SQLite database doesn't exist in APP_DIR, seed from bundle
if getattr(sys, "frozen", False) and not SQLITE_DB_PATH.exists():
    bundled_db = BASE_DIR / "data" / "hrc2_database.sqlite"
    if bundled_db.exists():
        import shutil
        try:
            shutil.copy2(bundled_db, SQLITE_DB_PATH)
        except Exception as e:
            print(f"[Settings] Error copying initial DB: {e}")

