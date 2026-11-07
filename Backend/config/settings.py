import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file from Backend_Python or Backend
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

EXPORTS_DIR = BASE_DIR / "exports"
UPLOADS_DIR = BASE_DIR / "uploads"
DATA_DIR = BASE_DIR / "data"
SQLITE_DB_PATH = DATA_DIR / "hrc2_database.sqlite"
BACKEND_EXPORTS_DIR = EXPORTS_DIR

EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

