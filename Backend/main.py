import sys
import asyncio
from pathlib import Path
from contextlib import asynccontextmanager

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from config.settings import PORT, HOST, UPLOADS_DIR, EXPORTS_DIR, BACKEND_EXPORTS_DIR
from config.db import is_db_connected, ensure_indexes
from services.qc_auto_export_service import start_auto_export_scheduler
from services.qc_export_service import ensure_worker_started
from services.qc_report_service import get_qc_column_values
from services.nc_report_service import sync_order_demand_with_qc_data

from routers.qc_router import router as qc_router
from routers.nc_router import router as nc_router
from routers.user_router import router as user_router
from routers.skin_router import router as skin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[SERVER Python] Starting FastAPI server...")
    if is_db_connected():
        print("[DB] Connected to SQLite local database.")
        ensure_indexes()
        start_auto_export_scheduler()
    else:
        print("[DB] Warning: SQLite database not initialized.")
    ensure_worker_started()
    yield
    # Shutdown
    print("[SERVER Python] Stopping FastAPI server...")

app = FastAPI(
    title="HRC2 QC & Order Tracking API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(user_router, prefix="/api/user", tags=["User"])
app.include_router(qc_router, prefix="/api/qc", tags=["QC"])
app.include_router(nc_router, prefix="/api/nc", tags=["Order Demand"])
app.include_router(skin_router, prefix="/api/skin", tags=["Skin Tracking"])

# Direct compatibility aliases
@app.api_route("/api/sync-qc", methods=["GET", "POST", "PUT"])
@app.api_route("/api/sync-nc", methods=["GET", "POST", "PUT"])
@app.api_route("/api/reports/{report_id}/sync-qc", methods=["GET", "POST", "PUT"])
async def root_sync_qc(report_id: str | None = None):
    return sync_order_demand_with_qc_data(report_id=report_id)

@app.get("/api/reports/{report_id}/column-values")
async def root_column_values(report_id: str, column: str, sheet: str | None = None):
    vals = get_qc_column_values(report_id, column, sheet)
    return {"field": column, "values": vals}

# Static file mounts
# Root uploads
upload_dir = Path("uploads")
if not upload_dir.exists():
    upload_dir = Path(__file__).resolve().parent / "uploads"
upload_dir.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")
app.mount("/images", StaticFiles(directory=str(upload_dir)), name="images")
app.mount("/exports", StaticFiles(directory=str(EXPORTS_DIR)), name="exports")

# Frontend Static & SPA Routing
from fastapi.responses import FileResponse
from fastapi import HTTPException

frontend_build_candidates = [
    Path(__file__).resolve().parent.parent / "Frontend" / "build",
    Path(__file__).resolve().parent / "build",
    Path.cwd() / "Frontend" / "build",
    Path.cwd() / "build",
]
frontend_dir = None
for candidate in frontend_build_candidates:
    if candidate.exists() and (candidate / "index.html").exists():
        frontend_dir = candidate
        break

if frontend_dir:
    static_folder = frontend_dir / "static"
    if static_folder.exists():
        app.mount("/static", StaticFiles(directory=str(static_folder)), name="frontend_static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if any(full_path.startswith(prefix) for prefix in ["api", "docs", "openapi.json", "uploads", "exports", "images"]):
            raise HTTPException(status_code=404, detail="Not Found")
        file_path = frontend_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dir / "index.html")
else:
    @app.get("/")
    async def root():
        return {"status": "online", "message": "API Server Python is running..."}
