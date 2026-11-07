import os
import re
import uuid
import json
import zipfile
import asyncio
from datetime import datetime, date
from pathlib import Path
from io import BytesIO
import openpyxl
from openpyxl.utils import get_column_letter

from config.settings import (
    QC_SITE_URL,
    QC_USERNAME,
    QC_PASSWORD,
    HEADLESS,
    PAGE_TIMEOUT_MS,
    DOWNLOAD_TIMEOUT_MS,
    CHROMIUM_PATH,
    MAX_PENDING,
    KEEP_LOCAL_EXPORT,
    EXPORTS_DIR,
    BACKEND_EXPORTS_DIR,
    CSS_LOGIN_USERNAME,
    CSS_LOGIN_PASSWORD,
    CSS_LOGIN_BUTTON,
    CSS_OPEN_EXPORT,
    CSS_FACTORY,
    CSS_FROM_DATE,
    CSS_TO_DATE,
    CSS_COIL_IDS,
    CSS_DOWNLOAD_BUTTON,
    MONGODB_IMPORT_ROWS,
)
from config.db import query_one, execute_write, is_db_connected

QC_REPORT_ID = "6adf6dc6c603752d3ddd162d"
QC_REPORT_FILENAME = "Tong_Hop_QC_HRC2"

QC_FACTORY_OPTIONS = [
    {"value": "HRC1", "label": "Nhà máy HRC 1"},
    {"value": "HRC2", "label": "Nhà máy HRC 2"},
    {"value": "ALL", "label": "Tất cả nhà máy"},
]

jobs: dict[str, dict] = {}
_job_queue: asyncio.Queue | None = None
_worker_task: asyncio.Task | None = None

def get_job_queue() -> asyncio.Queue:
    global _job_queue
    if _job_queue is None:
        _job_queue = asyncio.Queue()
    return _job_queue

def get_fallback_template():
    # Try reading from disk first
    for d in [EXPORTS_DIR, BACKEND_EXPORTS_DIR]:
        if d.exists():
            for f in d.glob("*.xlsx"):
                if not f.name.startswith("."):
                    try:
                        wb = openpyxl.load_workbook(f, read_only=True)
                        ws = wb.active
                        row0 = [cell.value for cell in next(ws.iter_rows(min_row=1, max_row=1))]
                        row1 = [cell.value for cell in next(ws.iter_rows(min_row=2, max_row=2))]
                        wb.close()
                        return {"row0": row0, "row1": row1}
                    except Exception:
                        pass

    return {
        "row0": [
            "THÔNG TIN CHUNG", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
            "BỀ MẶT", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
            "KÍCH THƯỚC", "", "", "", "", "", "",
            "CƠ/LÝ/HÓA", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
            "NGOẠI QUAN", "", "", "", "", "", "",
            "GHI CHÚ QC",
        ],
        "row1": [
            "STT", "ORDER", "TDC CODE", "TỔNG CẤP CHẤT LƯỢNG", "PHÂN LOẠI", "TÌNH TRẠNG CHẤT LƯỢNG",
            "PHÂN BỔ SO", "HƯỚNG XỬ LÝ", "CHIỀU DÀY", "LỖI LỆCH TDC", "CN/KCN", "CA",
            "NGÀY SẢN XUẤT", "ID XỬ LÝ", "ID GỐC", "SẢN PHẨM", "MÁC THÉP", "TIÊU CHUẨN SẢN PHẨM",
            "KHỐI LƯỢNG TỊNH", "SLAB ID", "Gấp nếp", "Nếp nhăn", "Vết hằn Pinch Roll", "Gãy mặt",
            "Xỉ muối tiêu", "Giãn biên/Bụng", "Chấm bi", "TCPK nặng", "Xỉ sơ cấp HP", "Lỗi xếp lớp",
            "Lỗ thủng", "Rách bề mặt", "Vết Hằn trục", "Nứt dọc", "Xước bề mặt", "Xỉ cán",
            "Xỉ thứ cấp", "TCPK nhẹ", "Cong cạnh", "High Spot", "Dung sai ĐK trong", "Độ Crown",
            "Độ Wedge", "Sai lệch dày", "Sai lệch rộng", "GH Chảy", "GH Bền", "Độ giãn dài",
            "Độ cứng", "Độ dai va đập", "Tỷ số (Rt/Rm)", "Carbon", "Mangan", "Silic",
            "Photpho", "Lưu huỳnh", "Đồng", "Niken", "Crom", "Moly", "Vanadi", "Titan",
            "Nhôm", "Canxi", "Bo", "Niobi", "CEV", "Oxy", "Nitơ", "Hydro",
            "Khuyết biên", "Bavia biên", "Vỡ biên", "Sổ vòng", "Loa cuộn", "Móp biên", "LỖI KHÁC",
        ]
    }

def format_to_qc_search_date(value, is_end=False) -> str:
    if not value:
        return ""
    s = str(value).strip()
    
    # mm/dd/yyyy [hh:mm[:ss]]
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$", s)
    if m:
        mm = m.group(1).zfill(2)
        dd = m.group(2).zfill(2)
        yyyy = m.group(3)
        hh = (m.group(4) or "08").zfill(2)
        mn = m.group(5) or "00"
        ss = m.group(6) or "00"
        return f"{mm}/{dd}/{yyyy} {hh}:{mn}:{ss}"

    # yyyy-mm-dd[T/ hh:mm[:ss]]
    m_iso = re.match(r"^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$", s)
    if m_iso:
        yyyy = m_iso.group(1)
        mm = m_iso.group(2)
        dd = m_iso.group(3)
        hh = (m_iso.group(4) or "08").zfill(2)
        mn = m_iso.group(5) or "00"
        ss = m_iso.group(6) or "00"
        return f"{mm}/{dd}/{yyyy} {hh}:{mn}:{ss}"

    return s

def public_job(job: dict) -> dict:
    job_id = job.get("id")
    files = job.get("files", [])
    has_file = bool(job.get("filePath"))
    return {
        "job_id": job_id,
        "status": job.get("status"),
        "status_message": job.get("statusMessage"),
        "current_month": job.get("currentMonth"),
        "factory": job.get("factory"),
        "year": job.get("year"),
        "month": job.get("month", "all"),
        "selected_months": job.get("selectedMonths"),
        "include_aggregate": job.get("includeAggregate", True),
        "is_custom_range": bool(job.get("isCustomRange")),
        "from_date": job.get("fromDate"),
        "to_date": job.get("toDate"),
        "coil_ids": job.get("coilIds"),
        "target_report_id": job.get("targetReportId"),
        "target_report_filename": job.get("targetReportFilename"),
        "filename": job.get("filename"),
        "rows_imported": job.get("rowsImported"),
        "report_id": job.get("reportId"),
        "import_status": job.get("importStatus"),
        "import_error": job.get("importError"),
        "error": job.get("error"),
        "created_at": job.get("createdAt").isoformat() if isinstance(job.get("createdAt"), (datetime, date)) else job.get("createdAt"),
        "updated_at": job.get("updatedAt").isoformat() if isinstance(job.get("updatedAt"), (datetime, date)) else job.get("updatedAt"),
        "download_url": f"/api/qc/exports/jobs/{job_id}/file" if has_file else None,
        "zip_url": f"/api/qc/exports/jobs/{job_id}/file?zip=true" if files else None,
        "files": [
            {
                "name": f.get("name"),
                "month": f.get("month"),
                "row_count": f.get("rowCount", 0),
                "bytes": f.get("bytes", 0),
                "is_aggregate": bool(f.get("isAggregate")),
                "download_url": f"/api/qc/exports/jobs/{job_id}/file?file={f.get('name')}",
            }
            for f in files
        ],
    }

def get_qc_export_availability() -> dict:
    missing = []
    if not QC_SITE_URL:
        missing.append("QC_SITE_URL")
    if not QC_USERNAME:
        missing.append("QC_USERNAME")
    if not QC_PASSWORD:
        missing.append("QC_PASSWORD")
    return {
        "configured": len(missing) == 0,
        "missingSettings": missing,
        "factories": QC_FACTORY_OPTIONS,
        "importRows": MONGODB_IMPORT_ROWS,
        "keepLocalExport": KEEP_LOCAL_EXPORT,
    }

def validate_qc_export_input(data: dict) -> dict:
    avail = get_qc_export_availability()
    if not avail["configured"]:
        raise ValueError(f"Thiếu cấu hình: {', '.join(avail['missingSettings'])}.")

    factory = str(data.get("factory") or "").strip()
    target_report_id = str(data.get("reportId") or QC_REPORT_ID)
    coil_ids = str(data.get("coilIds") or "").strip()
    current_year = datetime.now().year

    try:
        raw_year = int(data.get("year", current_year))
        year = raw_year if 2000 <= raw_year <= 2100 else current_year
    except (ValueError, TypeError):
        year = current_year

    is_custom_range = bool(data.get("isCustomRange") or str(data.get("month", "")).lower() == "custom")
    include_aggregate = bool(data.get("includeAggregate", True)) if "includeAggregate" in data else True
    selected_months = []
    month = "all"

    if is_custom_range:
        month = "custom"
        include_aggregate = False
    else:
        raw_months = data.get("months") or data.get("selectedMonths")
        if isinstance(raw_months, list):
            selected_months = sorted(list({int(m) for m in raw_months if str(m).isdigit() and 1 <= int(m) <= 12}))
        elif isinstance(raw_months, str) and raw_months.strip() and raw_months not in ("all", "custom"):
            selected_months = sorted(list({int(m.strip()) for m in raw_months.split(",") if m.strip().isdigit() and 1 <= int(m.strip()) <= 12}))
        elif data.get("month") and str(data.get("month")).isdigit():
            m_val = int(data.get("month"))
            if 1 <= m_val <= 12:
                selected_months = [m_val]

        if not selected_months:
            selected_months = list(range(1, 13))

        if len(selected_months) == 12 and include_aggregate:
            month = "all"
        elif len(selected_months) == 1 and not include_aggregate:
            month = str(selected_months[0])
        else:
            month = ",".join(str(m) for m in selected_months)

    if not any(opt["value"] == factory for opt in QC_FACTORY_OPTIONS):
        raise ValueError("Vui lòng chọn nhà máy trong danh sách.")

    if not target_report_id:
        target_report_id = QC_REPORT_ID

    if len(coil_ids) > 10000:
        raise ValueError("Danh sách mã cuộn không được vượt quá 10.000 ký tự.")

    from_date = data.get("fromDate")
    to_date = data.get("toDate")

    if month == "custom":
        if not from_date or not to_date:
            now = datetime.now()
            today_str = now.strftime("%m/%d/%Y 08:00:00")
            from datetime import timedelta
            tom = now + timedelta(days=1)
            from_date = from_date or today_str
            to_date = to_date or tom.strftime("%m/%d/%Y 08:00:00")
        from_date = format_to_qc_search_date(from_date, False)
        to_date = format_to_qc_search_date(to_date, True)
    else:
        min_m = min(selected_months)
        max_m = max(selected_months)
        next_max_m = 1 if max_m == 12 else max_m + 1
        next_max_y = year + 1 if max_m == 12 else year
        from_date = f"{str(min_m).zfill(2)}/01/{year} 08:00:00"
        to_date = f"{str(next_max_m).zfill(2)}/01/{next_max_y} 08:00:00"

    return {
        "factory": factory,
        "reportId": target_report_id,
        "year": year,
        "month": month,
        "selectedMonths": selected_months,
        "includeAggregate": include_aggregate,
        "isCustomRange": is_custom_range,
        "fromDate": from_date,
        "toDate": to_date,
        "coilIds": coil_ids,
    }

async def ensure_qc_export_report(report_id: str) -> dict:
    report = query_one("SELECT id, filename, report_type FROM qcreports WHERE id = ?", (report_id,))
    if report and report.get("report_type") == "order-demand":
        report = None
    if report:
        return {"reportId": report["id"], "filename": Path(report.get("filename", "")).stem}

    filename = f"{QC_REPORT_FILENAME}.xlsx"
    rid = report_id or QC_REPORT_ID
    now = datetime.utcnow().isoformat()
    execute_write("""
        INSERT OR REPLACE INTO qcreports (id, filename, original_name, report_type, saved_at, bytes, rows_imported, sheets, created_at, updated_at)
        VALUES (?, ?, ?, 'qc', ?, 1, 0, '[]', ?, ?)
    """, (rid, filename, filename, now, now, now))
    return {"reportId": rid, "filename": Path(filename).stem}
    return {"reportId": str(oid), "filename": Path(filename).stem}

async def create_export_job(data: dict) -> dict:
    validated = validate_qc_export_input(data)
    pending = [j for j in jobs.values() if j.get("status") in ("queued", "running")]
    if len(pending) >= MAX_PENDING:
        raise ValueError("Hàng đợi xuất Excel đang đầy; vui lòng thử lại sau.")

    target = await ensure_qc_export_report(validated["reportId"])
    now = datetime.utcnow()
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "status": "queued",
        "statusMessage": "Đang xếp hàng chờ xử lý…",
        "importStatus": "pending" if MONGODB_IMPORT_ROWS else "not_requested",
        "factory": validated["factory"],
        "year": validated["year"],
        "month": validated["month"],
        "selectedMonths": validated["selectedMonths"],
        "includeAggregate": validated["includeAggregate"],
        "isCustomRange": validated["isCustomRange"],
        "targetReportId": target["reportId"],
        "targetReportFilename": target["filename"],
        "fromDate": validated["fromDate"],
        "toDate": validated["toDate"],
        "coilIds": validated["coilIds"],
        "files": [],
        "currentMonth": None,
        "createdAt": now,
        "updatedAt": now,
        "filePath": None,
        "filename": None,
        "rowsImported": 0,
    }
    jobs[job_id] = job
    ensure_worker_started()
    q = get_job_queue()
    await q.put(job_id)
    print(f"[Export] Job {job_id} put into queue (id={id(q)}), qsize={q.qsize()}")
    return public_job(job)

def get_export_job(job_id: str) -> dict | None:
    job = jobs.get(job_id)
    return public_job(job) if job else None

def get_export_jobs() -> list[dict]:
    return [public_job(j) for j in sorted(jobs.values(), key=lambda x: x["createdAt"], reverse=True)]

def get_export_job_file(job_id: str, file_name: str | None = None) -> dict | None:
    job = jobs.get(job_id)
    if not job:
        return None
    if file_name:
        for f in job.get("files", []):
            if f.get("name") == file_name and f.get("filePath") and Path(f["filePath"]).exists():
                return {"filePath": f["filePath"], "filename": f["name"]}
    if job.get("filePath") and Path(job["filePath"]).exists():
        return {"filePath": job["filePath"], "filename": job.get("filename")}
    return None

def first_visible(locator):
    count = locator.count()
    for i in range(count):
        cand = locator.nth(i)
        if cand.is_visible():
            return cand
    return None

def fill_control(page, selector_or_locator, value, label=""):
    if isinstance(selector_or_locator, str):
        controls = page.locator(selector_or_locator)
    else:
        controls = selector_or_locator

    control = first_visible(controls)
    if not control:
        return

    tag_name = (control.evaluate("el => el.tagName")).lower()
    if tag_name == "select":
        val_lower = str(value).strip().lower()
        options = control.evaluate("el => Array.from(el.options).map(o => ({ value: o.value, text: o.text }))")
        matched = None
        for opt in options:
            if opt["value"].strip().lower() == val_lower or opt["text"].strip().lower() == val_lower:
                matched = opt["value"]
                break
        if matched:
            control.select_option(matched)
        return

    is_date = any(k in label.lower() for k in ["ngày", "start", "end", "date"])
    if is_date:
        is_end = any(k in label.lower() for k in ["đến", "kết thúc", "end"])
        formatted = format_to_qc_search_date(value, is_end)
        short_formatted = formatted[:16]
        input_type = control.get_attribute("type")
        if input_type == "datetime-local":
            try:
                date_part, time_part = formatted.split(" ")
                mm, dd, yyyy = date_part.split("/")
                hh, mn = time_part.split(":")[:2]
                control.fill(f"{yyyy}-{mm}-{dd}T{hh}:{mn}")
            except Exception:
                control.fill(short_formatted)
        else:
            try:
                control.fill(formatted)
            except Exception:
                try:
                    control.fill(short_formatted)
                except Exception:
                    pass
            control.evaluate("""([fullVal, shortVal]) => {
                const el = this;
                const limit = el.maxLength && el.maxLength > 0 ? el.maxLength : 100;
                el.value = limit < 19 ? shortVal : fullVal;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                el.dispatchEvent(new Event('blur', { bubbles: true }));
            }""", [formatted, short_formatted])
        return

    control.fill(str(value))

def run_qc_export_sync(job: dict):
    from playwright.sync_api import sync_playwright

    year = job.get("year", datetime.now().year)
    target_dir = EXPORTS_DIR
    template_headers = get_fallback_template()
    job["files"] = []

    with sync_playwright() as p:
        launch_kwargs = {
            "headless": HEADLESS,
            "timeout": PAGE_TIMEOUT_MS,
        }
        if CHROMIUM_PATH and Path(CHROMIUM_PATH).exists():
            launch_kwargs["executable_path"] = CHROMIUM_PATH

        browser = p.chromium.launch(**launch_kwargs)
        try:
            context = browser.new_context(accept_downloads=True)
            page = context.new_page()
            page.set_default_timeout(PAGE_TIMEOUT_MS)
            page.set_default_navigation_timeout(PAGE_TIMEOUT_MS)

            last_dialog = [None]
            def on_dialog(dialog):
                last_dialog[0] = dialog.message
                print(f"[QC Export] Website dialog: '{dialog.message}'")
                dialog.accept()

            page.on("dialog", on_dialog)

            # 1. Login
            page.goto(QC_SITE_URL, wait_until="domcontentloaded", timeout=PAGE_TIMEOUT_MS)
            u_sel = CSS_LOGIN_USERNAME or 'input[autocomplete="username"], input[type="email"], input[name*="user" i], input[id*="user" i], input[type="text"]'
            p_sel = CSS_LOGIN_PASSWORD or 'input[type="password"]'
            u_input = first_visible(page.locator(u_sel))
            p_input = first_visible(page.locator(p_sel))
            if not u_input or not p_input:
                raise ValueError("Không tìm thấy form đăng nhập trên website QC.")

            u_input.fill(QC_USERNAME)
            p_input.fill(QC_PASSWORD)
            b_sel = CSS_LOGIN_BUTTON or 'button[type="submit"], input[type="submit"], button:has-text("Đăng nhập")'
            login_btn = first_visible(page.locator(b_sel))
            if login_btn:
                login_btn.click()
            page.wait_for_timeout(2000)

            # 2. Export execution
            if job.get("month") != "custom":
                months = job.get("selectedMonths") or (list(range(1, 13)) if job.get("month") == "all" else [int(job.get("month"))])
                
                for idx, m in enumerate(months):
                    job["currentMonth"] = m
                    job["statusMessage"] = f"Đang xuất dữ liệu Tháng {m} ({idx + 1}/{len(months)}) (Năm {year}) theo định dạng tìm kiếm mm/dd/yyyy hh:ss…"
                    job["status"] = "running"
                    job["updatedAt"] = datetime.utcnow()

                    next_m = 1 if m == 12 else m + 1
                    next_y = year + 1 if m == 12 else year
                    month_start = f"{str(m).zfill(2)}/01/{year} 08:00:00"
                    month_end = f"{str(next_m).zfill(2)}/01/{next_y} 08:00:00"
                    month_file_name = f"Thang_{m}.xlsx"
                    month_file_path = target_dir / month_file_name
                    backend_path = BACKEND_EXPORTS_DIR / month_file_name

                    download_succeeded = False
                    try:
                        open_btn = first_visible(page.locator(CSS_OPEN_EXPORT))
                        if open_btn:
                            open_btn.click()
                            page.wait_for_timeout(1000)

                        fill_control(page, CSS_FACTORY, job["factory"], "nhà máy")
                        fill_control(page, CSS_FROM_DATE, month_start, "ngày bắt đầu")
                        fill_control(page, CSS_TO_DATE, month_end, "ngày kết thúc")
                        if job.get("coilIds") and CSS_COIL_IDS:
                            fill_control(page, CSS_COIL_IDS, job["coilIds"], "mã cuộn")

                        dl_btn = first_visible(page.locator(CSS_DOWNLOAD_BUTTON))
                        if not dl_btn:
                            raise ValueError("Không tìm thấy nút tải Excel.")

                        with page.expect_download(timeout=min(DOWNLOAD_TIMEOUT_MS, 60000)) as dl_info:
                            dl_btn.click()
                        download = dl_info.value

                        # Overwrite existing file cleanly on disk
                        if month_file_path.exists():
                            try:
                                month_file_path.unlink()
                            except Exception:
                                pass
                        download.save_as(str(month_file_path))
                        download_succeeded = True
                    except Exception as me:
                        print(f"[QC Export] Tháng {m} tải không thành công ({me}).")

                    month_rows_count = 0
                    if download_succeeded and month_file_path.exists():
                        try:
                            wb = openpyxl.load_workbook(month_file_path, read_only=True)
                            ws = wb.active
                            rows = list(ws.iter_rows(values_only=True))
                            month_rows_count = max(0, len(rows) - 2)
                            wb.close()
                        except Exception as parse_e:
                            print(f"[QC Export] Lỗi đọc file Tháng {m}: {parse_e}")
                    else:
                        # Only create fallback template if file does NOT exist
                        if not month_file_path.exists():
                            wb = openpyxl.Workbook()
                            ws = wb.active
                            ws.title = "Bao_Cao_QC"
                            if template_headers.get("row0"):
                                ws.append(template_headers["row0"])
                            if template_headers.get("row1"):
                                ws.append(template_headers["row1"])
                            wb.save(month_file_path)

                    # Overwrite copy in Backend exports as well
                    if BACKEND_EXPORTS_DIR.exists() and month_file_path.exists() and month_file_path.resolve() != backend_path.resolve():
                        try:
                            if backend_path.exists():
                                try:
                                    backend_path.unlink()
                                except Exception:
                                    pass
                            import shutil
                            shutil.copy2(month_file_path, backend_path)
                        except Exception as ce:
                            print(f"[QC Export] Lỗi copy sang backend exports: {ce}")

                    file_size = month_file_path.stat().st_size if month_file_path.exists() else 0
                    job["files"].append({
                        "name": month_file_name,
                        "month": m,
                        "filePath": str(month_file_path),
                        "rowCount": month_rows_count,
                        "bytes": file_size,
                        "status": "completed",
                        "isAggregate": False,
                    })

                    page.wait_for_timeout(600)

                # Generate aggregate file
                if job.get("includeAggregate") or job.get("month") == "all":
                    job["statusMessage"] = f"Đang tổng hợp dữ liệu {len(months)} tháng vào file Tong_Hop_QC_HRC2.xlsx…"
                    job["status"] = "running"
                    job["updatedAt"] = datetime.utcnow()

                    agg_name = f"{QC_REPORT_FILENAME}.xlsx"
                    agg_path = target_dir / agg_name
                    backend_agg_path = BACKEND_EXPORTS_DIR / agg_name

                    # Overwrite existing aggregate file cleanly
                    if agg_path.exists():
                        try:
                            agg_path.unlink()
                        except Exception:
                            pass

                    import xlsxwriter
                    agg_wb = xlsxwriter.Workbook(str(agg_path), {"constant_memory": True})
                    agg_ws = agg_wb.add_worksheet("Bao_Cao_QC")
                    if template_headers.get("row0"):
                        for c_idx, val in enumerate(template_headers["row0"]):
                            if val is not None:
                                agg_ws.write(0, c_idx, val)
                    if template_headers.get("row1"):
                        for c_idx, val in enumerate(template_headers["row1"]):
                            if val is not None:
                                agg_ws.write(1, c_idx, val)

                    total_rows = 0
                    current_out_row = 2
                    for m in months:
                        m_path = target_dir / f"Thang_{m}.xlsx"
                        if not m_path.exists():
                            m_path = BACKEND_EXPORTS_DIR / f"Thang_{m}.xlsx"
                        if not m_path.exists():
                            continue
                        try:
                            wb = openpyxl.load_workbook(m_path, read_only=True)
                            ws = wb.active
                            for idx_r, row in enumerate(ws.iter_rows(values_only=True)):
                                if idx_r < 2:
                                    continue
                                if row and any(c is not None and str(c).strip() != "" for c in row):
                                    total_rows += 1
                                    for c_idx, val in enumerate(row):
                                        if c_idx == 0:
                                            agg_ws.write(current_out_row, 0, total_rows)
                                        elif val is not None:
                                            agg_ws.write(current_out_row, c_idx, val)
                                    current_out_row += 1
                            wb.close()
                        except Exception as re_err:
                            print(f"[QC Export] Lỗi đọc Thang_{m}.xlsx khi tổng hợp: {re_err}")

                    agg_wb.close()
                    if BACKEND_EXPORTS_DIR.exists() and agg_path.exists() and agg_path.resolve() != backend_agg_path.resolve():
                        try:
                            if backend_agg_path.exists():
                                try:
                                    backend_agg_path.unlink()
                                except Exception:
                                    pass
                            import shutil
                            shutil.copy2(agg_path, backend_agg_path)
                        except Exception as ce:
                            print(f"[QC Export] Lỗi copy file tổng hợp sang backend exports: {ce}")

                    agg_size = agg_path.stat().st_size if agg_path.exists() else 0
                    job["filename"] = agg_name
                    job["filePath"] = str(agg_path)
                    job["rowsImported"] = total_rows
                    job["files"].append({
                        "name": agg_name,
                        "month": None,
                        "filePath": str(agg_path),
                        "rowCount": total_rows,
                        "bytes": agg_size,
                        "status": "completed",
                        "isAggregate": True,
                    })
                    job["statusMessage"] = f"Đã xuất xong {len(months)} tháng và ghi đè cập nhật Tong_Hop_QC_HRC2.xlsx ({total_rows:,} dòng)!"
                else:
                    if job["files"]:
                        first_f = job["files"][0]
                        job["filename"] = first_f["name"]
                        job["filePath"] = first_f["filePath"]
                        job["rowsImported"] = first_f["rowCount"]
                    job["statusMessage"] = f"Đã xuất xong {len(months)} file tháng và ghi đè cập nhật thành công!"
            else:
                # Custom date range mode
                month_file_name = f"{QC_REPORT_FILENAME}.xlsx"
                month_file_path = target_dir / month_file_name
                backend_path = BACKEND_EXPORTS_DIR / month_file_name

                job["statusMessage"] = f"Đang xuất dữ liệu từ {job.get('fromDate')} đến {job.get('toDate')}…"
                job["status"] = "running"
                job["updatedAt"] = datetime.utcnow()

                open_btn = first_visible(page.locator(CSS_OPEN_EXPORT))
                if open_btn:
                    open_btn.click()
                    page.wait_for_timeout(1000)

                fill_control(page, CSS_FACTORY, job["factory"], "nhà máy")
                fill_control(page, CSS_FROM_DATE, job["fromDate"], "ngày bắt đầu")
                fill_control(page, CSS_TO_DATE, job["toDate"], "ngày kết thúc")
                if job.get("coilIds") and CSS_COIL_IDS:
                    fill_control(page, CSS_COIL_IDS, job["coilIds"], "mã cuộn")

                dl_btn = first_visible(page.locator(CSS_DOWNLOAD_BUTTON))
                if not dl_btn:
                    raise ValueError("Không tìm thấy nút tải Excel.")

                with page.expect_download(timeout=min(DOWNLOAD_TIMEOUT_MS, 60000)) as dl_info:
                    dl_btn.click()
                download = dl_info.value

                # Overwrite existing file cleanly on disk
                if month_file_path.exists():
                    try:
                        month_file_path.unlink()
                    except Exception:
                        pass
                download.save_as(str(month_file_path))

                if BACKEND_EXPORTS_DIR.exists() and month_file_path.exists() and month_file_path.resolve() != backend_path.resolve():
                    try:
                        if backend_path.exists():
                            try:
                                backend_path.unlink()
                            except Exception:
                                pass
                        import shutil
                        shutil.copy2(month_file_path, backend_path)
                    except Exception as ce:
                        print(f"[QC Export] Lỗi copy file custom sang backend exports: {ce}")

                row_count = 0
                if month_file_path.exists():
                    wb = openpyxl.load_workbook(month_file_path, read_only=True)
                    ws = wb.active
                    rows = list(ws.iter_rows(values_only=True))
                    row_count = max(0, len(rows) - 2)
                    wb.close()

                file_size = month_file_path.stat().st_size if month_file_path.exists() else 0
                job["filename"] = month_file_name
                job["filePath"] = str(month_file_path)
                job["rowsImported"] = row_count
                job["files"].append({
                    "name": month_file_name,
                    "month": None,
                    "filePath": str(month_file_path),
                    "rowCount": row_count,
                    "bytes": file_size,
                    "status": "completed",
                    "isAggregate": True,
                })
                job["statusMessage"] = f"Xuất dữ liệu thành công ({row_count:,} dòng)!"

            # 3. Import exported file into SQLite Database (qcreports & qcrows)
            # Directly updates and overwrites existing database rows for each month and aggregate report
            if is_db_connected() and MONGODB_IMPORT_ROWS:
                try:
                    from services.qc_report_service import import_qc_report
                    target_id = job.get("targetReportId") or QC_REPORT_ID
                    total_imported_all = 0

                    # 3.1. Import each exported month file directly into its canonical report_id: "thang-{m}"
                    for f_info in job.get("files", []):
                        m = f_info.get("month")
                        f_p = Path(f_info["filePath"]) if f_info.get("filePath") else None
                        if m and f_p and f_p.exists():
                            m_rid = f"thang-{m}"
                            try:
                                print(f"[QC Export] Overwriting SQLite database for Tháng {m} (report_id={m_rid}, file={f_p.name})...")
                                imp_res = import_qc_report(
                                    file_path=str(f_p),
                                    original_name=f_p.name,
                                    filename=f_p.stem,
                                    report_id=m_rid,
                                )
                                rows_cnt = imp_res.get("rows_imported", 0)
                                total_imported_all += rows_cnt
                                f_info["rowCount"] = rows_cnt
                                print(f"[QC Export] Successfully overwritten Tháng {m} in database ({rows_cnt:,} rows).")

                                # Clean up any duplicate stub with old format
                                execute_write("DELETE FROM qcreports WHERE id = ?", (f"export_thang_{m}",))
                            except Exception as imp_err:
                                print(f"[QC Export] Error importing Tháng {m} into database: {imp_err}")

                    # 3.2. Import aggregate file Tong_Hop_QC_HRC2.xlsx (or custom range) into target_id (default QC_REPORT_ID)
                    agg_file_info = next((f for f in job.get("files", []) if f.get("isAggregate")), None)
                    if agg_file_info:
                        agg_p = Path(agg_file_info["filePath"]) if agg_file_info.get("filePath") else None
                        if agg_p and agg_p.exists():
                            try:
                                print(f"[QC Export] Overwriting SQLite database for aggregate report (report_id={target_id}, file={agg_p.name})...")
                                imp_agg = import_qc_report(
                                    file_path=str(agg_p),
                                    original_name=agg_p.name,
                                    filename=agg_p.stem,
                                    report_id=target_id,
                                )
                                agg_rows = imp_agg.get("rows_imported", 0)
                                job["reportId"] = str(target_id)
                                job["rowsImported"] = agg_rows
                                agg_file_info["rowCount"] = agg_rows
                                print(f"[QC Export] Successfully overwritten aggregate report in database ({agg_rows:,} rows).")
                            except Exception as agg_imp_err:
                                print(f"[QC Export] Error importing aggregate report: {agg_imp_err}")
                    else:
                        if job.get("files"):
                            first_f = job["files"][0]
                            job["reportId"] = f"thang-{first_f.get('month')}" if first_f.get('month') else target_id
                            job["rowsImported"] = total_imported_all

                    job["importStatus"] = "completed"

                    # 3.3. Auto-refresh DATA_SOURCE in Theo dõi SKIN with latest exported data
                    try:
                        print("[QC Export] Auto-refreshing DATA_SOURCE in Theo dõi SKIN with freshly overwritten data...")
                        from services.skin_service import get_current_and_prev_months, load_data_source_from_qc
                        active_months = get_current_and_prev_months()
                        skin_sync_res = load_data_source_from_qc(active_months)
                        print(f"[QC Export] Auto-refreshed DATA_SOURCE: {skin_sync_res.get('imported', 0)} rows updated.")
                    except Exception as skin_e:
                        print(f"[QC Export] Note: Auto-refresh DATA_SOURCE skipped/failed: {skin_e}")

                except Exception as db_e:
                    print(f"[QC Export] SQLite database update failed: {db_e}")
                    job["importStatus"] = "failed"
                    job["importError"] = str(db_e)

            job["status"] = "completed"
            job["updatedAt"] = datetime.utcnow()

        except Exception as e:
            job["status"] = "failed"
            job["error"] = str(e)
            job["statusMessage"] = f"Lỗi: {e}"
            job["updatedAt"] = datetime.utcnow()
            print(f"[QC Export] Job {job['id']} failed: {e}")
        finally:
            browser.close()

async def worker_loop():
    print("[Worker] Background export worker loop started successfully.")
    q = get_job_queue()
    print(f"[Worker] Listening on queue (id={id(q)})")
    while True:
        try:
            print(f"[Worker] Waiting for job on queue (id={id(q)})...")
            job_id = await q.get()
            print(f"[Worker] Picked up export job: {job_id}")
            job = jobs.get(job_id)
            if job and job.get("status") == "queued":
                try:
                    await asyncio.to_thread(run_qc_export_sync, job)
                except Exception as e:
                    job["status"] = "failed"
                    job["error"] = str(e)
                    job["statusMessage"] = f"Lỗi: {e}"
                    job["updatedAt"] = datetime.utcnow()
                    print(f"[Worker] Export job {job_id} failed: {e}")
                finally:
                    q.task_done()
        except Exception as we:
            print(f"[Worker] Exception in worker_loop: {we}")
            await asyncio.sleep(1)

def ensure_worker_started():
    global _worker_task
    if _worker_task is None or _worker_task.done():
        try:
            loop = asyncio.get_running_loop()
            _worker_task = loop.create_task(worker_loop())
            print("[Worker] Created worker_loop task in running event loop.")
        except RuntimeError as re:
            print(f"[Worker] Could not create worker_loop task: {re}")

def create_zip_archive(files_to_zip: list[tuple[str, Path]]) -> bytes:
    mem_zip = BytesIO()
    with zipfile.ZipFile(mem_zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for arcname, fpath in files_to_zip:
            if fpath.exists():
                zf.write(fpath, arcname=arcname)
    return mem_zip.getvalue()
