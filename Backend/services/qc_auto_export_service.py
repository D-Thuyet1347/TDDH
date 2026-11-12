import asyncio
import json
from datetime import datetime, timedelta
from config.db import query_one, execute_write, is_db_connected
from services.qc_export_service import create_export_job, get_export_job, validate_qc_export_input

AUTO_EXPORT_ID = "qc-auto-export"
EXPORT_INTERVAL_SECONDS = 5 * 60

_scheduler_task: asyncio.Task | None = None

def load_settings() -> dict:
    row = query_one("SELECT settings_json FROM qc_auto_export_settings WHERE id = ?", (AUTO_EXPORT_ID,))
    if row and row.get("settings_json"):
        try:
            return json.loads(row["settings_json"])
        except Exception:
            pass
    return {}

def save_settings(data: dict):
    now = datetime.utcnow().isoformat()
    execute_write("""
        INSERT OR REPLACE INTO qc_auto_export_settings (id, settings_json, updated_at)
        VALUES (?, ?, ?)
    """, (AUTO_EXPORT_ID, json.dumps(data, ensure_ascii=False), now))

def public_schedule(doc: dict | None) -> dict:
    cur_month = datetime.now().month
    if not doc:
        return {
            "enabled": False,
            "factory": "",
            "report_id": "",
            "year": datetime.now().year,
            "month": str(cur_month),
            "selected_months": [cur_month],
            "include_aggregate": True,
            "is_custom_range": False,
            "export_time": "08:00",
            "from_date": "",
            "to_date": "",
            "coil_ids": "",
            "active_job_id": None,
            "last_job_id": None,
            "next_run_at": None,
            "last_started_at": None,
            "last_completed_at": None,
            "last_error": None,
        }

    next_run = doc.get("nextRunAt")
    if isinstance(next_run, datetime):
        next_run = next_run.isoformat()

    last_started = doc.get("lastStartedAt")
    if isinstance(last_started, datetime):
        last_started = last_started.isoformat()

    last_completed = doc.get("lastCompletedAt")
    if isinstance(last_completed, datetime):
        last_completed = last_completed.isoformat()

    return {
        "enabled": bool(doc.get("enabled")),
        "factory": doc.get("factory", ""),
        "report_id": doc.get("reportId", ""),
        "year": doc.get("year", datetime.now().year),
        "month": doc.get("month", str(cur_month)),
        "selected_months": doc.get("selectedMonths") or [cur_month],
        "include_aggregate": doc.get("includeAggregate", True),
        "is_custom_range": bool(doc.get("isCustomRange")),
        "export_time": doc.get("exportTime", "08:00"),
        "from_date": doc.get("fromDate", ""),
        "to_date": doc.get("toDate", ""),
        "coil_ids": doc.get("coilIds", ""),
        "active_job_id": doc.get("activeJobId"),
        "last_job_id": doc.get("lastJobId"),
        "next_run_at": next_run,
        "last_started_at": last_started,
        "last_completed_at": last_completed,
        "last_error": doc.get("lastError"),
    }

async def get_qc_auto_export_status() -> dict:
    doc = load_settings()
    return public_schedule(doc)

async def enable_qc_auto_export(data: dict) -> dict:
    filters = validate_qc_export_input(data)
    now = datetime.utcnow().isoformat()
    doc = load_settings()
    doc.update({
        "enabled": True,
        "factory": filters["factory"],
        "reportId": filters["reportId"],
        "year": filters["year"],
        "month": filters["month"],
        "selectedMonths": filters["selectedMonths"],
        "includeAggregate": filters["includeAggregate"],
        "isCustomRange": filters["isCustomRange"],
        "fromDate": filters["fromDate"],
        "toDate": filters["toDate"],
        "coilIds": filters["coilIds"],
        "nextRunAt": now,
        "lastError": None,
    })
    save_settings(doc)
    return public_schedule(doc)

async def disable_qc_auto_export() -> dict:
    doc = load_settings()
    doc.update({"enabled": False, "nextRunAt": None})
    save_settings(doc)
    return public_schedule(doc)

async def auto_export_scheduler_loop():
    while True:
        try:
            await asyncio.sleep(3)
            doc = load_settings()
            if not doc:
                continue

            active_job_id = doc.get("activeJobId")
            if active_job_id:
                job = get_export_job(active_job_id)
                if not job:
                    doc["activeJobId"] = None
                    doc["nextRunAt"] = datetime.utcnow().isoformat()
                    save_settings(doc)
                    continue

                if job.get("status") in ("queued", "running"):
                    continue

                # Finished active job
                last_err = job.get("error") or job.get("import_error")
                next_run = (datetime.utcnow() + timedelta(seconds=EXPORT_INTERVAL_SECONDS)).isoformat() if doc.get("enabled") else None
                doc["activeJobId"] = None
                doc["lastCompletedAt"] = datetime.utcnow().isoformat()
                doc["lastError"] = last_err
                doc["nextRunAt"] = next_run
                save_settings(doc)
                continue

            if not doc.get("enabled"):
                continue

            next_run_at_str = doc.get("nextRunAt")
            if next_run_at_str:
                try:
                    next_run_at = datetime.fromisoformat(next_run_at_str)
                    if datetime.utcnow() < next_run_at:
                        continue
                except Exception:
                    pass

            # Start export job
            try:
                job = await create_export_job({
                    "factory": doc.get("factory"),
                    "reportId": doc.get("reportId"),
                    "year": doc.get("year", datetime.now().year),
                    "month": doc.get("month", "all"),
                    "selectedMonths": doc.get("selectedMonths"),
                    "includeAggregate": doc.get("includeAggregate", True),
                    "isCustomRange": doc.get("isCustomRange", False),
                    "exportTime": doc.get("exportTime", "08:00"),
                    "fromDate": doc.get("fromDate"),
                    "toDate": doc.get("toDate"),
                    "coilIds": doc.get("coilIds"),
                })
                job_id = job.get("job_id")
                doc["activeJobId"] = job_id
                doc["lastJobId"] = job_id
                doc["lastStartedAt"] = datetime.utcnow().isoformat()
                doc["nextRunAt"] = None
                doc["lastError"] = None
                save_settings(doc)
            except Exception as trigger_err:
                doc["lastError"] = str(trigger_err)
                doc["nextRunAt"] = (datetime.utcnow() + timedelta(seconds=EXPORT_INTERVAL_SECONDS)).isoformat()
                save_settings(doc)

        except Exception as loop_err:
            print(f"[QC Auto Export Scheduler] error: {loop_err}")
            await asyncio.sleep(5)

def start_auto_export_scheduler():
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        try:
            loop = asyncio.get_running_loop()
            _scheduler_task = loop.create_task(auto_export_scheduler_loop())
        except RuntimeError:
            pass
