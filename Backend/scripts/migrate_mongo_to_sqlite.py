import json
import sys
from pathlib import Path
from datetime import datetime

# Add Backend to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from pymongo import MongoClient
from bson import ObjectId
from config.settings import MONGODB_URI, MONGODB_DB, SQLITE_DB_PATH
from config.db import init_sqlite_db, get_db

def to_iso(val):
    if isinstance(val, (datetime, )):
        return val.isoformat()
    return str(val) if val is not None else None

def serialize_doc(doc):
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [serialize_doc(i) for i in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, datetime):
        return doc.isoformat()
    return doc

def run_migration():
    print(f"[Migration] Starting MongoDB Atlas -> SQLite migration...")
    print(f"[Migration] SQLite target: {SQLITE_DB_PATH}")
    init_sqlite_db()

    client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=10000)
    mongo_db = client[MONGODB_DB]

    with get_db() as conn:
        # 1. Users
        users = list(mongo_db["users"].find())
        print(f"[Migration] Migrating {len(users)} users...")
        for u in users:
            uid = str(u["_id"])
            conn.execute("""
                INSERT OR REPLACE INTO users (id, username, password, email, role, full_name, avatar, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                uid,
                u.get("username", ""),
                u.get("password", ""),
                u.get("email"),
                u.get("role", "user"),
                u.get("fullName") or u.get("name"),
                u.get("avatar"),
                to_iso(u.get("createdAt")),
                to_iso(u.get("updatedAt")),
            ))
        print(f"[Migration] Users migrated successfully.")

        # 2. QC Reports
        reports = list(mongo_db["qcreports"].find())
        print(f"[Migration] Migrating {len(reports)} QC reports...")
        for r in reports:
            rid = str(r["_id"])
            sheets_data = serialize_doc(r.get("sheets", []))
            conn.execute("""
                INSERT OR REPLACE INTO qcreports (id, filename, original_name, report_type, saved_at, bytes, rows_imported, sheets, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rid,
                r.get("filename", ""),
                r.get("originalName", r.get("filename", "")),
                r.get("reportType", "qc"),
                to_iso(r.get("savedAt")),
                r.get("bytes", 0),
                r.get("rowsImported", 0),
                json.dumps(sheets_data, ensure_ascii=False),
                to_iso(r.get("createdAt")),
                to_iso(r.get("updatedAt")),
            ))
        print(f"[Migration] QC reports migrated.")

        # 3. QC Auto export settings
        settings = mongo_db["qc_auto_export_settings"].find_one({"_id": "qc-auto-export"})
        if settings:
            sid = str(settings["_id"])
            settings_clean = serialize_doc(settings)
            conn.execute("""
                INSERT OR REPLACE INTO qc_auto_export_settings (id, settings_json, updated_at)
                VALUES (?, ?, ?)
            """, (
                sid,
                json.dumps(settings_clean, ensure_ascii=False),
                to_iso(settings.get("updatedAt") or datetime.utcnow()),
            ))
            print(f"[Migration] QC auto export settings migrated.")

        # 4. NC Reports (Order Demand)
        nc_reports = list(mongo_db["Tong_Hop_Don_Hang_HRC2_Reports"].find())
        print(f"[Migration] Migrating {len(nc_reports)} NC reports...")
        for nr in nc_reports:
            nrid = str(nr["_id"])
            sheets_data = serialize_doc(nr.get("sheets", []))
            conn.execute("""
                INSERT OR REPLACE INTO nc_reports (id, filename, original_name, report_type, saved_at, bytes, rows_imported, sheets, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                nrid,
                nr.get("filename", ""),
                nr.get("originalName", nr.get("filename", "")),
                nr.get("reportType", "order-demand"),
                to_iso(nr.get("savedAt")),
                nr.get("bytes", 0),
                nr.get("rowsImported", 0),
                json.dumps(sheets_data, ensure_ascii=False),
                to_iso(nr.get("createdAt")),
                to_iso(nr.get("updatedAt")),
            ))
        print(f"[Migration] NC reports migrated.")

        # 5. NC Rows (Order demand rows)
        nc_count = mongo_db["Tong_Hop_Don_Hang_HRC2"].count_documents({})
        print(f"[Migration] Migrating {nc_count} NC rows in batches...")
        batch = []
        batch_size = 2000
        cur = mongo_db["Tong_Hop_Don_Hang_HRC2"].find({}, {"_id": 1, "reportId": 1, "sheetName": 1, "rowNumber": 1, "values": 1, "createdAt": 1})
        migrated_nc = 0
        for doc in cur:
            row_id = str(doc["_id"])
            report_id = str(doc.get("reportId", ""))
            sheet_name = doc.get("sheetName", "")
            row_number = doc.get("rowNumber", 0)
            values = doc.get("values", {})
            order_id = str(values.get("ORDER") or values.get("Hợp đồng") or values.get("PO") or "").strip()
            batch.append((
                row_id,
                report_id,
                sheet_name,
                row_number,
                order_id,
                json.dumps(values, ensure_ascii=False),
                to_iso(doc.get("createdAt")),
            ))
            if len(batch) >= batch_size:
                conn.executemany("""
                    INSERT OR REPLACE INTO nc_rows (id, report_id, sheet_name, row_number, order_id, values_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, batch)
                migrated_nc += len(batch)
                print(f"[Migration] NC rows migrated: {migrated_nc}/{nc_count}")
                batch = []
        if batch:
            conn.executemany("""
                INSERT OR REPLACE INTO nc_rows (id, report_id, sheet_name, row_number, order_id, values_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, batch)
            migrated_nc += len(batch)
            print(f"[Migration] NC rows finished: {migrated_nc}/{nc_count}")

        # 6. QC Rows
        qc_count = mongo_db["qcrows"].count_documents({})
        print(f"[Migration] Migrating {qc_count} QC rows in batches...")
        batch = []
        cur_qc = mongo_db["qcrows"].find({}, {"_id": 1, "reportId": 1, "sheetName": 1, "rowNumber": 1, "values": 1, "createdAt": 1})
        migrated_qc = 0
        for doc in cur_qc:
            row_id = str(doc["_id"])
            report_id = str(doc.get("reportId", ""))
            sheet_name = doc.get("sheetName", "")
            row_number = doc.get("rowNumber", 0)
            vals = doc.get("values", {})
            
            # Helper to extract key by pattern
            order_id = ""
            tdc_code = ""
            coil_id = ""
            slab_id = ""
            product = ""
            steel_grade = ""
            standard = ""
            weight = None

            for k, v in vals.items():
                if v is None:
                    continue
                k_lower = str(k).lower().strip()
                v_str = str(v).strip()
                if "order" in k_lower and not order_id:
                    order_id = v_str
                elif "tdc" in k_lower and not tdc_code:
                    tdc_code = v_str
                elif ("mã cuộn" in k_lower or "coil" in k_lower or "id xử lý" in k_lower or "id gốc" in k_lower) and not coil_id:
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
                        weight = float(str(v).replace(",", ""))
                    except Exception:
                        pass

            batch.append((
                row_id,
                report_id,
                sheet_name,
                row_number,
                order_id,
                tdc_code,
                coil_id,
                slab_id,
                product,
                steel_grade,
                standard,
                weight,
                json.dumps(vals, ensure_ascii=False),
                to_iso(doc.get("createdAt")),
            ))
            if len(batch) >= batch_size:
                conn.executemany("""
                    INSERT OR REPLACE INTO qcrows (id, report_id, sheet_name, row_number, order_id, tdc_code, coil_id, slab_id, product, steel_grade, standard, weight, values_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, batch)
                migrated_qc += len(batch)
                print(f"[Migration] QC rows migrated: {migrated_qc}/{qc_count}")
                batch = []
        if batch:
            conn.executemany("""
                INSERT OR REPLACE INTO qcrows (id, report_id, sheet_name, row_number, order_id, tdc_code, coil_id, slab_id, product, steel_grade, standard, weight, values_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, batch)
            migrated_qc += len(batch)
            print(f"[Migration] QC rows finished: {migrated_qc}/{qc_count}")

    print(f"[Migration] ALL DATA MIGRATED SUCCESSFULLY TO SQLITE!")

if __name__ == "__main__":
    run_migration()
