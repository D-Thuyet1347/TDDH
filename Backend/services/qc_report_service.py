import json
import re
import unicodedata
import uuid
from datetime import datetime
from io import BytesIO
import openpyxl

from config.db import query_one, query_all, execute_write, execute_many, get_db
from config.settings import MONGODB_MAX_ROWS

QC_REPORT_ID = "6adf6dc6c603752d3ddd162d"
QC_REPORT_FILENAME = "Tong_Hop_QC_HRC2"

def import_qc_report(buffer: bytes | None = None, original_name: str = "Bao_Cao_QC.xlsx", filename: str = QC_REPORT_FILENAME, report_id: str = QC_REPORT_ID, file_path: str | None = None, max_rows: int = 500000) -> dict:
    ext = original_name.lower().split(".")[-1]
    if ext not in ("xlsx", "xls"):
        raise ValueError("Chỉ chấp nhận file .xlsx hoặc .xls.")

    file_size = 0
    temp_file_to_clean = None
    try:
        if file_path:
            from pathlib import Path
            fp = Path(file_path)
            if not fp.exists():
                raise ValueError(f"Không tìm thấy file: {file_path}")
            file_size = fp.stat().st_size
            wb = openpyxl.load_workbook(fp, read_only=True, data_only=True)
        elif buffer:
            file_size = len(buffer)
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp_file:
                tmp_file.write(buffer)
                temp_file_to_clean = tmp_file.name
            wb = openpyxl.load_workbook(temp_file_to_clean, read_only=True, data_only=True)
        else:
            raise ValueError("Cần cung cấp buffer hoặc file_path.")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"File Excel không hợp lệ hoặc bị lỗi: {e}")

    sheets = []
    total_imported = 0
    rid = report_id or QC_REPORT_ID
    now = datetime.utcnow().isoformat()

    # Delete existing rows for this report first
    execute_write("DELETE FROM qcrows WHERE report_id = ?", (rid,))

    batch = []
    batch_size = 3000

    with get_db() as conn:
        try:
            conn.execute("PRAGMA synchronous = NORMAL")
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA temp_store = MEMORY")
            conn.execute("PRAGMA cache_size = 20000")
        except Exception:
            pass
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows_iter = ws.iter_rows(values_only=True)

            r0 = None
            r1 = None
            try:
                r0 = next(rows_iter, None)
                r1 = next(rows_iter, None)
            except Exception:
                pass

            if not r0:
                continue

            header_cells = r0
            data_start_idx = 1
            first_data_row = r1

            if r1:
                r0_count = sum(1 for c in r0 if c is not None and str(c).strip() != "")
                r1_count = sum(1 for c in r1 if c is not None and str(c).strip() != "")
                r1_str = " ".join(str(c).upper() for c in r1 if c is not None)
                if r1_count > r0_count or any(k in r1_str for k in ["ORDER", "STT", "TDC", "CHẤT LƯỢNG", "HƯỚNG XỬ LÝ"]):
                    header_cells = r1
                    data_start_idx = 2
                    first_data_row = next(rows_iter, None)

            header = [str(c).strip() if c is not None and str(c).strip() != "" else f"col_{idx}" for idx, c in enumerate(header_cells)]
            header_len = len(header)
            sheet_row_count = 0

            def process_row(row_tuple, r_num):
                nonlocal total_imported, sheet_row_count
                if not row_tuple or not any(c is not None and str(c).strip() != "" for c in row_tuple):
                    return
                row_dict = {}
                order_id = ""
                tdc_code = ""
                coil_id = ""
                slab_id = ""
                product = ""
                steel_grade = ""
                standard = ""
                weight = None

                for col_idx, cell_val in enumerate(row_tuple):
                    col_name = header[col_idx] if col_idx < header_len else f"col_{col_idx}"
                    row_dict[col_name] = cell_val
                    if cell_val is None:
                        continue
                    k_lower = col_name.lower().strip()
                    v_str = str(cell_val).strip()
                    if "order" in k_lower and not order_id:
                        order_id = v_str
                    elif "tdc" in k_lower and not tdc_code:
                        tdc_code = v_str
                    elif ("mã cuộn" in k_lower or "coil" in k_lower or "id xử lý" in k_lower or "id gốc" in k_lower) and not coil_id and v_str:
                        coil_id = v_str
                    elif "slab" in k_lower and not slab_id:
                        slab_id = v_str
                    elif "sản phẩm" in k_lower and not product:
                        product = v_str
                    elif "mác thép" in k_lower and not steel_grade:
                        steel_grade = v_str
                    elif "tiêu chuẩn" in k_lower and not standard:
                        standard = v_str
                    elif "khối lượng" in k_lower and weight is None:
                        try:
                            weight = float(str(cell_val).replace(",", ""))
                        except Exception:
                            pass

                row_id = str(uuid.uuid4())
                batch.append((
                    row_id,
                    rid,
                    sheet_name,
                    r_num,
                    order_id,
                    tdc_code,
                    coil_id,
                    slab_id,
                    product,
                    steel_grade,
                    standard,
                    weight,
                    json.dumps(row_dict, ensure_ascii=False),
                    now,
                ))
                total_imported += 1
                sheet_row_count += 1

                if len(batch) >= batch_size:
                    conn.executemany("""
                        INSERT INTO qcrows (id, report_id, sheet_name, row_number, order_id, tdc_code, coil_id, slab_id, product, steel_grade, standard, weight, values_json, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, batch)
                    batch.clear()

            curr_r_num = data_start_idx + 1
            if first_data_row:
                process_row(first_data_row, curr_r_num)
                curr_r_num += 1

            for row in rows_iter:
                process_row(row, curr_r_num)
                curr_r_num += 1

            sheets.append({
                "name": sheet_name,
                "rowCount": sheet_row_count,
                "columns": header,
            })

        if batch:
            conn.executemany("""
                INSERT INTO qcrows (id, report_id, sheet_name, row_number, order_id, tdc_code, coil_id, slab_id, product, steel_grade, standard, weight, values_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, batch)
            batch.clear()

    wb.close()
    if temp_file_to_clean:
        try:
            import os
            os.remove(temp_file_to_clean)
        except Exception:
            pass

    if not total_imported:
        raise ValueError("File không có dòng dữ liệu để nhập.")

    safe_filename = f"{filename}.{ext}" if not filename.endswith(f".{ext}") else filename

    execute_write("""
        INSERT OR REPLACE INTO qcreports (id, filename, original_name, report_type, saved_at, bytes, rows_imported, sheets, created_at, updated_at)
        VALUES (?, ?, ?, 'qc', ?, ?, ?, ?, coalesce((SELECT created_at FROM qcreports WHERE id = ?), ?), ?)
    """, (rid, safe_filename, original_name, now, file_size, total_imported, json.dumps(sheets, ensure_ascii=False), rid, now, now))

    return {
        "_id": rid,
        "job_id": rid,
        "filename": safe_filename,
        "saved_at": now,
        "rows_imported": total_imported,
        "bytes": file_size,
        "sheets": sheets,
        "report_type": "qc",
    }

def get_report_rows(report_id: str, sheet_name: str | None = None, limit: int = 100, offset: int = 0, search: str = "") -> dict:
    report = query_one("SELECT * FROM qcreports WHERE id = ?", (report_id,))
    if not report:
        raise ValueError("Không tìm thấy báo cáo.")

    params = [report_id]
    where_clauses = ["report_id = ?"]

    if sheet_name:
        where_clauses.append("sheet_name = ?")
        params.append(sheet_name)

    if search:
        tokens = [t.strip() for t in re.split(r'[\s,;]+', search) if t.strip()]
        if tokens:
            token_clauses = []
            for t in tokens:
                token_clauses.append("(order_id LIKE ? OR coil_id LIKE ? OR tdc_code LIKE ?)")
                params.extend([f"%{t}%", f"%{t}%", f"%{t}%"])
            where_clauses.append(f"({' OR '.join(token_clauses)})")

    where_str = " AND ".join(where_clauses)
    count_row = query_one(f"SELECT count(*) as total FROM qcrows WHERE {where_str}", tuple(params))
    total = count_row["total"] if count_row else 0

    select_sql = f"SELECT id, row_number, sheet_name, values_json FROM qcrows WHERE {where_str} ORDER BY row_number ASC LIMIT ? OFFSET ?"
    select_params = list(params) + [limit, offset]
    db_rows = query_all(select_sql, tuple(select_params))

    rows = []
    for r in db_rows:
        try:
            val_dict = json.loads(r.get("values_json") or "{}")
        except Exception:
            val_dict = {}
        rows.append({
            "id": r["id"],
            "_id": r["id"],
            "rowNumber": r["row_number"],
            "sheetName": r["sheet_name"],
            "values": val_dict,
        })

    sheets_list = []
    try:
        sheets_list = json.loads(report.get("sheets") or "[]")
    except Exception:
        pass

    return {
        "rows": rows,
        "total": total,
        "limit": limit,
        "offset": offset,
        "sheet": sheet_name or (sheets_list[0]["name"] if sheets_list else ""),
        "sheets": sheets_list,
    }

def normalize_vietnamese_text(value: any) -> str:
    if not value:
        return ""
    s = unicodedata.normalize("NFD", str(value))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().upper()

def get_qc_column_values(report_id: str, field_name: str, sheet_name: str | None = None) -> list:
    params = [f"$.{field_name}", report_id]
    where_sql = "report_id = ?"
    if sheet_name:
        where_sql += " AND sheet_name = ?"
        params.append(sheet_name)

    sql = f"""
        SELECT DISTINCT json_extract(values_json, ?) as val
        FROM qcrows
        WHERE {where_sql} AND val IS NOT NULL AND val != ''
        LIMIT 50000
    """
    rows = query_all(sql, tuple(params))
    return [r["val"] for r in rows if r.get("val") is not None]

_quality_summary_cache: dict[str, dict] = {}
_column_values_cache: dict[str, dict] = {}

def invalidate_quality_summary_cache(report_id: str | None = None):
    if report_id:
        _quality_summary_cache.pop(report_id, None)
        _column_values_cache.pop(report_id, None)
    else:
        _quality_summary_cache.clear()
        _column_values_cache.clear()

def get_qc_column_values_summary(report_id: str, sheet_name: str | None = None) -> dict:
    cache_key = f"{report_id}:{sheet_name or ''}"
    if cache_key in _column_values_cache:
        return _column_values_cache[cache_key]

    sql = "SELECT values_json FROM qcrows WHERE report_id = ?"
    params = [report_id]
    if sheet_name:
        sql += " AND sheet_name = ?"
        params.append(sheet_name)
    sql += " LIMIT 2000"

    rows = query_all(sql, tuple(params))
    columns = {}
    total_rows = len(rows)

    for r in rows:
        try:
            vals = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue

        for col, raw in vals.items():
            s_val = "" if raw is None else str(raw).strip()
            is_blank = not s_val or s_val in ("—", "-")

            if col not in columns:
                columns[col] = {"counts": {}, "blanks": 0, "total": 0}
            columns[col]["total"] += 1
            if is_blank:
                columns[col]["blanks"] += 1
            else:
                # Full unconstrained distinct counts
                columns[col]["counts"][s_val] = columns[col]["counts"].get(s_val, 0) + 1

    res = {
        "totalRows": total_rows,
        "columns": columns,
    }
    _column_values_cache[cache_key] = res
    return res

def get_report_quality_summary(report_id: str) -> dict:
    if report_id in _quality_summary_cache:
        return _quality_summary_cache[report_id]

    report = query_one("SELECT * FROM qcreports WHERE id = ?", (report_id,))
    if not report:
        raise ValueError("Không tìm thấy báo cáo.")

    # 1. Check if already persisted in database
    if report.get("quality_summary_json"):
        try:
            cached_res = json.loads(report["quality_summary_json"])
            if cached_res and isinstance(cached_res, dict) and "counts" in cached_res:
                _quality_summary_cache[report_id] = cached_res
                return cached_res
        except Exception:
            pass

    # 2. Compute streaming directly using quoted json_extract for ultra-fast execution (~1.5s for 170k rows)
    counts = {
        "Loại 1 || PRIME": 0,
        "Loại 1 || NON_PRIME": 0,
        "Loại 2 || SCRAP": 0,
        "Loại rỗng —": 0,
    }
    daily_map = {}
    ids = {
        "SKIN": set(),
        "SKIN_CUST": set(),
        "CXL": set(),
        "SKIN_RCL_AGAIN": set(),
    }
    total_data_rows = 0

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT 
                json_extract(values_json, '$."TỔNG CẤP CHẤT LƯỢNG"'),
                json_extract(values_json, '$."PHÂN LOẠI"'),
                json_extract(values_json, '$."HƯỚNG XỬ LÝ"'),
                json_extract(values_json, '$."ID GỐC"'),
                json_extract(values_json, '$."ID XỬ LÝ"'),
                json_extract(values_json, '$."NGÀY SẢN XUẤT"')
            FROM qcrows
            WHERE report_id = ?
        ''', (report_id,))

        for tq_raw, cl_raw, h_raw, id_goc, id_xuly, dt_raw in cursor:
            total_data_rows += 1
            tq = str(tq_raw or '').strip().upper().replace("_", " ")
            cl = str(cl_raw or '').strip().upper()
            h = str(h_raw or '').strip().upper()
            sid = str(id_goc or id_xuly or '').strip()
            dt = str(dt_raw or '').strip()

            if sid and h:
                h_clean = re.sub(r"[\s\-]+", "_", h)
                if "SKIN_RCL_AGAIN" in h_clean:
                    ids["SKIN_RCL_AGAIN"].add(sid)
                elif "SKIN_CUST" in h_clean:
                    ids["SKIN_CUST"].add(sid)
                elif "SKIN" in h_clean:
                    ids["SKIN"].add(sid)
                elif "CXL" in h_clean:
                    ids["CXL"].add(sid)

            if not tq or not cl or tq in ("—", "-"):
                classification = "Loại rỗng —"
            elif ("LOAI 1" in tq or tq == "1") and "NON" in cl:
                classification = "Loại 1 || NON_PRIME"
            elif ("LOAI 1" in tq or tq == "1") and "PRIME" in cl:
                classification = "Loại 1 || PRIME"
            elif ("LOAI 2" in tq or tq == "2") and "SCRAP" in cl:
                classification = "Loại 2 || SCRAP"
            else:
                classification = "Loại rỗng —"

            counts[classification] += 1

            if dt:
                if dt not in daily_map:
                    daily_map[dt] = {
                        "date": dt,
                        "totalRows": 0,
                        "counts": {
                            "Loại 1 || PRIME": 0,
                            "Loại 1 || NON_PRIME": 0,
                            "Loại 2 || SCRAP": 0,
                            "Loại rỗng —": 0,
                        }
                    }
                daily_map[dt]["totalRows"] += 1
                daily_map[dt]["counts"][classification] += 1

    daily_list = list(daily_map.values())
    res = {
        "counts": counts,
        "daily": daily_list,
        "ids": {
            "SKIN": sorted(list(ids["SKIN"])),
            "SKIN_CUST": sorted(list(ids["SKIN_CUST"])),
            "CXL": sorted(list(ids["CXL"])),
            "SKIN_RCL_AGAIN": sorted(list(ids["SKIN_RCL_AGAIN"])),
        },
        "totalRows": total_data_rows,
    }

    # Persist in DB and memory cache
    try:
        execute_write(
            "UPDATE qcreports SET quality_summary_json = ? WHERE id = ?",
            (json.dumps(res, ensure_ascii=False), report_id)
        )
    except Exception:
        pass

    _quality_summary_cache[report_id] = res
    return res

def delete_all_qc_reports() -> dict:
    invalidate_quality_summary_cache()
    with get_db() as conn:
        deleted_rows = conn.execute("DELETE FROM qcrows").rowcount
        deleted_reports = conn.execute("DELETE FROM qcreports WHERE report_type != 'order-demand'").rowcount
        try:
            conn.execute("DELETE FROM qc_export_jobs")
        except Exception:
            pass

    return {
        "success": True,
        "message": f"Đã xóa toàn bộ {deleted_reports} báo cáo QC và {deleted_rows} dòng dữ liệu.",
        "deleted_reports": deleted_reports,
        "deleted_rows": deleted_rows,
    }

def delete_qc_report(report_id: str) -> dict:
    with get_db() as conn:
        rep = conn.execute(
            "SELECT id, filename FROM qcreports WHERE id = ? AND report_type != 'order-demand'",
            (report_id,)
        ).fetchone()
        if not rep:
            raise ValueError("Không tìm thấy báo cáo QC cần xóa.")

        del_rows = conn.execute("DELETE FROM qcrows WHERE report_id = ?", (report_id,)).rowcount
        conn.execute("DELETE FROM qcreports WHERE id = ?", (report_id,))

    return {
        "success": True,
        "message": f"Đã xóa báo cáo '{rep[1]}' và {del_rows} dòng dữ liệu liên quan.",
        "report_id": report_id,
        "deleted_rows": del_rows,
    }
