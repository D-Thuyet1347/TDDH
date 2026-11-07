import os
import io
import json
import asyncio
import urllib.parse
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException, Request, Response
from fastapi.responses import FileResponse, StreamingResponse

from config.db import is_db_connected, query_one, query_all, execute_write
from config.settings import EXPORTS_DIR, BACKEND_EXPORTS_DIR
from services.qc_export_service import (
    get_qc_export_availability,
    create_export_job,
    get_export_job,
    get_export_jobs,
    get_export_job_file,
    create_zip_archive,
    QC_REPORT_FILENAME,
)
from services.qc_auto_export_service import (
    get_qc_auto_export_status,
    enable_qc_auto_export,
    disable_qc_auto_export,
)
from services.qc_report_service import (
    import_qc_report,
    get_report_rows,
    get_qc_column_values,
    get_qc_column_values_summary,
    get_report_quality_summary,
    delete_all_qc_reports,
    delete_qc_report,
)
from services.nc_report_service import sync_order_demand_with_qc_data

router = APIRouter()

def json_dumps(data: dict) -> str:
    return json.dumps(data, default=str)

@router.get("/health")
async def get_qc_health():
    connected = is_db_connected()
    return {
        "connected": connected,
        "database": "sqlite" if connected else None,
    }

@router.get("/exports/config")
async def get_export_config():
    return get_qc_export_availability()

@router.get("/exports/auto")
async def get_qc_auto_export_endpoint():
    try:
        schedule = await get_qc_auto_export_status()
        return {"schedule": schedule}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/exports/auto")
async def enable_qc_auto_export_endpoint(request: Request):
    try:
        body = await request.json()
        schedule = await enable_qc_auto_export(body)
        return {"schedule": schedule}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/exports/auto")
async def disable_qc_auto_export_endpoint():
    try:
        schedule = await disable_qc_auto_export()
        return {"schedule": schedule}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/exports")
async def create_qc_export_endpoint(request: Request):
    try:
        body = await request.json()
        job = await create_export_job(body)
        return Response(content=json_dumps({"job": job}), status_code=202, media_type="application/json")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/exports/jobs")
async def list_qc_export_jobs_endpoint():
    return {"jobs": get_export_jobs()}

@router.get("/exports/jobs/{job_id}")
async def get_qc_export_job_endpoint(job_id: str):
    job = get_export_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Không tìm thấy tác vụ xuất Excel.")
    return {"job": job}

@router.get("/exports/jobs/{job_id}/file")
async def download_qc_export_endpoint(job_id: str, file: str | None = None, zip: bool = False):
    job = get_export_job(job_id)

    if zip or file == "all.zip":
        files_to_zip = []
        if job and job.get("files"):
            for f in job["files"]:
                for d in [EXPORTS_DIR, BACKEND_EXPORTS_DIR]:
                    candidate = d / f["name"]
                    if candidate.exists():
                        files_to_zip.append((f["name"], candidate))
                        break

        if not files_to_zip:
            names = [f"{QC_REPORT_FILENAME}.xlsx"] + [f"Thang_{i+1}.xlsx" for i in range(12)]
            for name in names:
                for d in [EXPORTS_DIR, BACKEND_EXPORTS_DIR]:
                    p = d / name
                    if p.exists() and not any(item[0] == name for item in files_to_zip):
                        files_to_zip.append((name, p))

        if not files_to_zip:
            raise HTTPException(status_code=404, detail="Không tìm thấy file để nén.")

        zip_data = create_zip_archive(files_to_zip)
        zip_filename = f"Export_QC_HRC2_{job_id[:8]}.zip"
        return StreamingResponse(
            io.BytesIO(zip_data),
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{zip_filename}"'}
        )

    file_info = get_export_job_file(job_id, file)
    if not file_info:
        fallback_name = file or f"{QC_REPORT_FILENAME}.xlsx"
        for d in [EXPORTS_DIR, BACKEND_EXPORTS_DIR]:
            p = d / fallback_name
            if p.exists():
                file_info = {"filePath": str(p), "filename": fallback_name}
                break

    if not file_info or not Path(file_info["filePath"]).exists():
        raise HTTPException(status_code=404, detail="File xuất không tồn tại hoặc đã hết hạn.")

    fp = Path(file_info["filePath"])
    fn = file_info["filename"]
    return FileResponse(
        path=fp,
        filename=fn,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fn}"'}
    )

@router.get("/exports/files/{file_name}")
async def download_export_file_by_name(file_name: str):
    clean_name = Path(file_name).name
    for d in [EXPORTS_DIR, BACKEND_EXPORTS_DIR]:
        fp = d / clean_name
        if fp.exists():
            return FileResponse(
                path=fp,
                filename=clean_name,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f'attachment; filename="{clean_name}"'}
            )
    raise HTTPException(status_code=404, detail="Không tìm thấy file trong kho lưu trữ.")

@router.get("/dashboard-summary")
async def get_dashboard_summary():
    row_count = query_one("SELECT count(*) as cnt FROM qcrows")
    total_qc = row_count["cnt"] if row_count else 0

    rep_stats = query_one("""
        SELECT count(*) as reports_cnt,
               coalesce(sum(bytes), 0) as total_bytes,
               coalesce(sum(rows_imported), 0) as total_imported
        FROM qcreports
        WHERE report_type != 'order-demand'
    """)
    total_reports = rep_stats["reports_cnt"] if rep_stats else 0
    total_bytes = rep_stats["total_bytes"] if rep_stats else 0

    reports = query_all("SELECT sheets FROM qcreports WHERE report_type != 'order-demand'")
    total_sheets = 0
    for r in reports:
        try:
            s_list = json.loads(r.get("sheets") or "[]")
            total_sheets += len(s_list)
        except Exception:
            pass

    latest_report = query_one("SELECT id, filename, saved_at, rows_imported FROM qcreports WHERE report_type != 'order-demand' ORDER BY saved_at DESC LIMIT 1")

    return {
        "reports": total_reports,
        "rows": total_qc,
        "bytes": total_bytes,
        "sheets": total_sheets,
        "database": "sqlite",
        "totalRows": total_qc,
        "totalReports": total_reports,
        "latestReport": {
            "id": latest_report["id"],
            "filename": latest_report.get("filename"),
            "saved_at": latest_report.get("saved_at"),
            "rows_imported": latest_report.get("rows_imported", 0),
        } if latest_report else None,
    }

@router.get("/jobs")
async def list_jobs():
    export_jobs = get_export_jobs()
    reports = query_all("SELECT id, filename, saved_at FROM qcreports WHERE report_type != 'order-demand' ORDER BY saved_at DESC LIMIT 100")
    exported_ids = {j.get("report_id") for j in export_jobs if j.get("report_id")}
    imported_jobs = [
        {
            "job_id": r["id"],
            "filename": r.get("filename"),
            "status": "completed",
            "created_at": r.get("saved_at"),
        }
        for r in reports if r["id"] not in exported_ids
    ]
    all_jobs = export_jobs + imported_jobs
    all_jobs.sort(key=lambda x: str(x.get("created_at") or ""), reverse=True)
    return all_jobs[:100]

@router.get("/reports")
async def list_reports(limit: int = 20, offset: int = 0, search: str = ""):
    where = "WHERE report_type != 'order-demand'"
    params = []
    if search:
        where += " AND filename LIKE ?"
        params.append(f"%{search}%")

    count_row = query_one(f"SELECT count(*) as cnt FROM qcreports {where}", tuple(params))
    total = count_row["cnt"] if count_row else 0

    select_sql = f"SELECT * FROM qcreports {where} ORDER BY saved_at DESC LIMIT ? OFFSET ?"
    select_params = list(params) + [limit, offset]
    db_rows = query_all(select_sql, tuple(select_params))

    reports = []
    for r in db_rows:
        sheets_data = []
        try:
            sheets_data = json.loads(r.get("sheets") or "[]")
        except Exception:
            pass
        reports.append({
            "job_id": r["id"],
            "filename": r.get("filename"),
            "saved_at": r.get("saved_at"),
            "rows_imported": r.get("rows_imported", 0),
            "bytes": r.get("bytes", 0),
            "sheets": sheets_data,
            "report_type": r.get("report_type", "qc"),
        })
    return {"reports": reports, "total": total, "limit": limit, "offset": offset}

@router.post("/reports")
async def upload_report(file: UploadFile = File(...)):
    try:
        content = await file.read()
        res = import_qc_report(content, file.filename)
        return Response(content=json_dumps({"message": "Đã tải và lưu báo cáo Excel QC.", "report": res}), status_code=201, media_type="application/json")
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/{report_id}/file")
async def download_report_file(report_id: str):
    report = query_one("SELECT filename FROM qcreports WHERE id = ?", (report_id,))
    if not report:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo.")

    fn = report.get("filename", f"{QC_REPORT_FILENAME}.xlsx")
    for d in [EXPORTS_DIR, BACKEND_EXPORTS_DIR]:
        fp = d / fn
        if fp.exists():
            return FileResponse(
                path=fp,
                filename=fn,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": f'attachment; filename="{fn}"'}
            )
    raise HTTPException(status_code=404, detail="Không tìm thấy file trên ổ đĩa máy chủ.")

@router.get("/reports/{report_id}/rows")
async def get_report_rows_endpoint(report_id: str, limit: int = 100, offset: int = 0, search: str = "", sheet: str | None = None):
    try:
        res = await asyncio.to_thread(get_report_rows, report_id, sheet_name=sheet, limit=limit, offset=offset, search=search)
        return res
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/reports/{report_id}/column-values")
async def get_report_column_values_endpoint(report_id: str, column: str | None = None, sheet: str | None = None):
    try:
        if column:
            vals = await asyncio.to_thread(get_qc_column_values, report_id, column, sheet)
            return {"field": column, "values": vals}
        res = await asyncio.to_thread(get_qc_column_values_summary, report_id, sheet)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/{report_id}/quality-summary")
async def get_report_quality_summary_endpoint(report_id: str):
    try:
        res = await asyncio.to_thread(get_report_quality_summary, report_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/reports/all")
@router.delete("/reports/clear-all")
async def delete_all_qc_reports_endpoint():
    try:
        res = delete_all_qc_reports()
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/reports/{report_id}")
async def delete_qc_report_endpoint(report_id: str):
    try:
        res = delete_qc_report(report_id)
        return res
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.api_route("/reports/{report_id}/sync-qc", methods=["GET", "POST", "PUT"])
@router.api_route("/sync-qc", methods=["GET", "POST", "PUT"])
@router.api_route("/sync-nc", methods=["GET", "POST", "PUT"])
async def sync_qc_endpoint(report_id: str | None = None):
    try:
        res = sync_order_demand_with_qc_data(report_id=report_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
