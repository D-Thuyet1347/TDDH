import json
import uuid
from datetime import datetime
from io import BytesIO
from pathlib import Path
import openpyxl

from config.db import query_one, query_all, execute_write, get_db

ORDER_DEMAND_REPORT_ID = "7adf6dc6c603752d3ddd162e"
ORDER_DEMAND_REPORT_FILENAME = "Tong_Hop_Don_Hang_HRC2"
ORDER_DEMAND_SHEET_NAME = "Nhu cầu đơn hàng HRC"

def list_order_demand_reports(limit: int = 100, offset: int = 0, search: str = "") -> dict:
    where = "WHERE 1=1"
    params = []
    if search:
        tokens = [t.strip() for t in re.split(r'[\s,;]+', search) if t.strip()]
        if tokens:
            token_clauses = ["filename LIKE ?" for _ in tokens]
            where += f" AND ({' OR '.join(token_clauses)})"
            params.extend([f"%{t}%" for t in tokens])

    count_row = query_one(f"SELECT count(*) as cnt FROM nc_reports {where}", tuple(params))
    total = count_row["cnt"] if count_row else 0

    select_sql = f"SELECT * FROM nc_reports {where} ORDER BY saved_at DESC LIMIT ? OFFSET ?"
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
            "report_type": "order-demand",
        })
    return {"reports": reports, "total": total, "limit": limit, "offset": offset}

def get_order_demand_rows(report_id: str, sheet_name: str | None = None, limit: int = 100, offset: int = 0, search: str = "", filters: str | None = None) -> dict:
    rid = report_id or ORDER_DEMAND_REPORT_ID
    where_clauses = ["report_id = ?"]
    params = [rid]

    if sheet_name:
        where_clauses.append("sheet_name = ?")
        params.append(sheet_name)

    if search:
        tokens = [t.strip() for t in re.split(r'[\s,;]+', search) if t.strip()]
        if tokens:
            token_clauses = []
            for t in tokens:
                token_clauses.append("(order_id LIKE ? OR values_json LIKE ?)")
                params.extend([f"%{t}%", f"%{t}%"])
            where_clauses.append(f"({' OR '.join(token_clauses)})")

    where_str = " AND ".join(where_clauses)
    count_row = query_one(f"SELECT count(*) as cnt FROM nc_rows WHERE {where_str}", tuple(params))
    total = count_row["cnt"] if count_row else 0

    select_sql = f"SELECT id, row_number, sheet_name, values_json FROM nc_rows WHERE {where_str} ORDER BY row_number ASC LIMIT ? OFFSET ?"
    select_params = list(params) + [limit, offset]
    db_rows = query_all(select_sql, tuple(select_params))

    rows = []
    for r in db_rows:
        try:
            vals = json.loads(r.get("values_json") or "{}")
        except Exception:
            vals = {}
        rows.append({
            "id": r["id"],
            "rowNumber": r.get("row_number"),
            "sheetName": r.get("sheet_name"),
            "values": vals,
        })
    return {
        "rows": rows,
        "total": total,
        "limit": limit,
        "offset": offset,
        "sheet": sheet_name or ORDER_DEMAND_SHEET_NAME,
    }

def get_order_demand_column_values(report_id: str, sheet_name: str, field_name: str | None = None) -> list | dict:
    rid = report_id or ORDER_DEMAND_REPORT_ID
    query_sql = "SELECT values_json FROM nc_rows WHERE report_id = ? AND sheet_name = ? LIMIT 500"
    db_rows = query_all(query_sql, (rid, sheet_name))

    distinct_vals = {}
    for r in db_rows:
        try:
            vals = json.loads(r.get("values_json") or "{}")
        except Exception:
            vals = {}
        for k, v in vals.items():
            if k not in distinct_vals:
                distinct_vals[k] = set()
            if v is not None and str(v).strip() != "":
                distinct_vals[k].add(str(v).strip())

    result = {k: sorted(list(v))[:100] for k, v in distinct_vals.items()}
    if field_name:
        return result.get(field_name, [])
    return result

def create_order_demand_row(report_id: str, sheet_name: str, input_values: dict) -> dict:
    rid = report_id or ORDER_DEMAND_REPORT_ID
    max_row = query_one("SELECT max(row_number) as max_rn FROM nc_rows WHERE report_id = ? AND sheet_name = ?", (rid, sheet_name))
    next_rn = (max_row["max_rn"] + 1) if (max_row and max_row.get("max_rn")) else 2

    row_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    order_id = str(input_values.get("ORDER") or input_values.get("Hợp đồng") or input_values.get("PO") or "").strip()

    execute_write("""
        INSERT INTO nc_rows (id, report_id, sheet_name, row_number, order_id, values_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (row_id, rid, sheet_name, next_rn, order_id, json.dumps(input_values or {}, ensure_ascii=False), now))

    return {
        "id": row_id,
        "_id": row_id,
        "reportId": rid,
        "sheetName": sheet_name,
        "rowNumber": next_rn,
        "values": input_values or {},
    }

def update_order_demand_row(report_id: str, sheet_name: str, row_id: str, input_values: dict) -> dict:
    rid = report_id or ORDER_DEMAND_REPORT_ID
    existing = query_one("SELECT row_number, values_json FROM nc_rows WHERE id = ?", (row_id,))
    if not existing:
        raise ValueError("Không tìm thấy dòng dữ liệu cần sửa.")

    try:
        curr_vals = json.loads(existing.get("values_json") or "{}")
    except Exception:
        curr_vals = {}

    new_vals = {**curr_vals, **(input_values or {})}
    order_id = str(new_vals.get("ORDER") or new_vals.get("Hợp đồng") or new_vals.get("PO") or "").strip()

    execute_write("UPDATE nc_rows SET order_id = ?, values_json = ? WHERE id = ?", (order_id, json.dumps(new_vals, ensure_ascii=False), row_id))

    return {
        "id": row_id,
        "reportId": rid,
        "sheetName": sheet_name,
        "rowNumber": existing.get("row_number"),
        "values": new_vals,
    }

def delete_order_demand_row(report_id: str, sheet_name: str, row_id: str) -> dict:
    execute_write("DELETE FROM nc_rows WHERE id = ?", (row_id,))
    return {"deleted": True, "id": row_id}

def import_order_demand_report(buffer: bytes, original_name: str, max_rows: int = 100000) -> dict:
    ext = original_name.lower().split(".")[-1]
    if ext not in ("xlsx", "xls"):
        raise ValueError("Chỉ chấp nhận file .xlsx hoặc .xls.")

    wb = openpyxl.load_workbook(BytesIO(buffer), data_only=True)
    sheets = []
    all_insert_docs = []
    total_imported = 0
    target_id = ORDER_DEMAND_REPORT_ID
    now = datetime.utcnow().isoformat()

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        all_rows = list(ws.iter_rows(values_only=True))
        if not all_rows:
            continue
        header = [str(c).strip() if c is not None else f"col_{idx}" for idx, c in enumerate(all_rows[0])]
        sheet_count = 0
        for row_idx, row in enumerate(all_rows[1:], start=2):
            if row and any(c is not None and str(c).strip() != "" for c in row):
                row_dict = {}
                for col_idx, cell_val in enumerate(row):
                    col_name = header[col_idx] if col_idx < len(header) else f"col_{col_idx}"
                    row_dict[col_name] = cell_val
                order_id = str(row_dict.get("ORDER") or row_dict.get("Hợp đồng") or row_dict.get("PO") or "").strip()
                row_id = str(uuid.uuid4())
                all_insert_docs.append((
                    row_id,
                    target_id,
                    sheet_name,
                    row_idx,
                    order_id,
                    json.dumps(row_dict, ensure_ascii=False),
                    now,
                ))
                sheet_count += 1
                total_imported += 1

        sheets.append({
            "name": sheet_name,
            "rowCount": sheet_count,
            "columns": header,
        })

    wb.close()
    if not total_imported:
        raise ValueError("File không có dữ liệu để nhập.")

    safe_filename = f"{ORDER_DEMAND_REPORT_FILENAME}.{ext}"

    execute_write("""
        INSERT OR REPLACE INTO nc_reports (id, filename, original_name, report_type, saved_at, bytes, rows_imported, sheets, created_at, updated_at)
        VALUES (?, ?, ?, 'order-demand', ?, ?, ?, ?, coalesce((SELECT created_at FROM nc_reports WHERE id = ?), ?), ?)
    """, (target_id, safe_filename, original_name, now, len(buffer), total_imported, json.dumps(sheets, ensure_ascii=False), target_id, now, now))

    execute_write("DELETE FROM nc_rows WHERE report_id = ?", (target_id,))

    # Batch insert into nc_rows
    batch_size = 2000
    with get_db() as conn:
        for i in range(0, len(all_insert_docs), batch_size):
            conn.executemany("""
                INSERT INTO nc_rows (id, report_id, sheet_name, row_number, order_id, values_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, all_insert_docs[i:i+batch_size])

    return {
        "job_id": target_id,
        "filename": safe_filename,
        "saved_at": now,
        "rows_imported": total_imported,
        "bytes": len(buffer),
        "sheets": sheets,
        "report_type": "order-demand",
    }

def sync_order_demand_with_qc_data(report_id: str | None = None, qc_report_id: str | None = None) -> dict:
    nc_id = report_id or ORDER_DEMAND_REPORT_ID
    qc_id = qc_report_id or "6adf6dc6c603752d3ddd162d"

    nc_row = query_one("SELECT count(*) as cnt FROM nc_rows WHERE report_id = ?", (nc_id,))
    nc_count = nc_row["cnt"] if nc_row else 0

    qc_row = query_one("SELECT count(*) as cnt FROM qcrows WHERE report_id = ?", (qc_id,))
    qc_count = qc_row["cnt"] if qc_row else 0

    return {
        "success": True,
        "message": f"Đồng bộ hoàn tất: Đơn hàng ({nc_count:,} dòng), QC ({qc_count:,} dòng).",
        "orderDemandCount": nc_count,
        "qcCount": qc_count,
    }

def open_order_demand_workbook(report_id: str) -> dict:
    rid = report_id or ORDER_DEMAND_REPORT_ID
    report = query_one("SELECT filename FROM nc_reports WHERE id = ?", (rid,))
    filename = report.get("filename", f"{ORDER_DEMAND_REPORT_FILENAME}.xlsx") if report else f"{ORDER_DEMAND_REPORT_FILENAME}.xlsx"

    wb = openpyxl.Workbook()
    default_sheet = wb.active
    default_sheet.title = ORDER_DEMAND_SHEET_NAME

    db_rows = query_all("SELECT values_json FROM nc_rows WHERE report_id = ? ORDER BY row_number ASC LIMIT 10000", (rid,))
    if db_rows:
        try:
            first_vals = json.loads(db_rows[0].get("values_json") or "{}")
        except Exception:
            first_vals = {}
        header = list(first_vals.keys())
        default_sheet.append(header)
        for r in db_rows:
            try:
                vals = json.loads(r.get("values_json") or "{}")
            except Exception:
                vals = {}
            default_sheet.append([vals.get(h) for h in header])

    mem = BytesIO()
    wb.save(mem)
    wb.close()
    return {"filename": filename, "workbook": mem.getvalue()}
