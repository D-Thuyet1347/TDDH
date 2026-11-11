import json
import uuid
import re
import io
import math
from datetime import datetime, date, timedelta
from io import BytesIO
from collections import defaultdict, Counter
from pathlib import Path
import openpyxl

from config.db import query_one, query_all, execute_write, get_db

SKIN_HRC2_COLUMNS = [
    "HƯỚNG XỬ LÝ_WEB",
    "Loại",
    "Kế hoạch",
    "PO Tháng",
    "PO Xử lý",
    "Material Description_SPM",
    "Khách hàng",
    "Đã chạy",
    "Check Trùng",
    "ID Cuộn Bó",
    "Material Description",
    "Khối lượng",
    "Ngày sản xuất",
    "Ca",
    "Vị trí",
    "Order",
    "Thickness",
    "DVKTKH",
    "Chỉ định Skin",
    "Mục đích sử dụng",
    "Ưu tiên đơn hàng",
    "Lỗi lệch",
    "GHC",
    "% Elongation",
    "Tháng",
]

DATA_SOURCE_COLUMNS = [
    "ORDER",
    "TỔNG CẤP CHẤT LƯỢNG",
    "PHÂN LOẠI",
    "TÌNH TRẠNG CHẤT LƯỢNG",
    "HƯỚNG XỬ LÝ",
    "LỖI LỆCH TDC",
    "NGÀY SẢN XUẤT",
    "ID XỬ LÝ",
    "ID GỐC",
    "KHỐI LƯỢNG TỊNH",
    "GHC",
    "Elongation",
    "Ghi Chú",
]

PO_HSM_COLUMNS = [
    "Tháng",
    "Đợt",
    "Khách hàng",
    "PO_HSM",
    "Tên gọi_HSM",
    "CW",
    "KH_Loại 1",
    "Mục đích sử dụng",
    "KL_Chờ SKIN",
    "KL_Loại 1",
    "Min_CW",
    "Chỉ định đặc biệt",
]

PO_SKIN_COLUMNS = [
    "Tháng",
    "Đợt",
    "Khách hàng",
    "PO_HSM",
    "PO_SPM",
    "Tên gọi_HSM",
    "Tên gọi_SPM",
    "CW",
    "KH_Loại 1",
    "Mục đích sử dụng",
    "PO_NEW",
    "KL_Chờ SKIN",
    "KL_Loại 1",
    "Min_CW",
    "Chỉ định đặc biệt",
]

DATA_MES_COLUMNS = [
    "Line",
    "Plan",
    "ID HRC",
    "Comment",
    "PO",
    "Thickness",
    "Width",
    "Weight",
    "Grade",
    "Status",
    "Location",
    "Weight_2",
]

GET_DATA_COLUMNS = [
    "Line",
    "Yêu cầu đặt biệt",
    "STT",
    "Plan ID",
    "ID Coil",
    "GHC",
    "% Elongation",
    "Tên gọi",
    "PO",
    "Thickness",
    "Width",
    "Weight",
    "Steel grade",
    "Ngày sản xuất",
    "Mục đích sử dụng",
    "CW",
    "Giới hạn cắt (nếu có)",
    "NM ĐỀ XUẤT",
    "P.DVKTKH & P.QLCL",
    "Tống hợp lỗi",
]

CHECK_DATA_SKIN_COLUMNS = [
    "ID HRC_1",
    "Hướng Xử lý_1",
    "Loại_1",
    "Ngày sản xuất_1",
    "ID HRC_2",
    "ID SPM_2",
    "Hướng Xử lý_2",
    "Loại_2",
    "Ngày sản xuất_2",
]

GET_DATA_PO_COLUMNS = [
    "PO",
    "Tháng",
    "Đợt",
    "Khách hàng",
    "PO_HSM",
    "PO_SPM",
    "Tên gọi_HSM",
    "Tên gọi_SPM",
    "CW",
    "KH_Loại 1",
    "Mục đích sử dụng",
]

PIVOT_TABLE_COLUMNS = [
    "ID Cuộn (Yêu cầu)",
    "Yêu cầu đặc biệt (Cuộn)",
    "PO (Yêu cầu)",
    "Yêu cầu đặc biệt (PO)",
    "PO/ID cuộn (Ưu tiên)",
    "Ưu tiên sản xuất",
]

HANG_VOT_COLUMNS = [
    "ID COIL",
    "HƯỚNG XỬ LÝ",
    "LỖI LỆCH TDC",
    "NM ĐỀ XUẤT",
    "DVKTKH & QLCL",
]

KE_HOACH_COLUMNS = [
    "Line",
    "Plan ID",
    "ID Cuộn Bó",
    "Material Description",
    "Ngày sản xuất",
    "Ca",
]

SHEET_REGISTRY = {
    "SKIN_HRC2": {
        "title": "SKIN_HRC2",
        "table": "skin_hrc2_rows",
        "columns": SKIN_HRC2_COLUMNS,
    },
    "DATA_SOURCE": {
        "title": "DATA_SOURCE",
        "table": "skin_data_source_rows",
        "columns": DATA_SOURCE_COLUMNS,
    },
    "PO_HSM": {
        "title": "PO_HSM",
        "table": "skin_po_hsm_rows",
        "columns": PO_HSM_COLUMNS,
    },
    "PO_SKIN": {
        "title": "PO_SKIN",
        "table": "skin_po_skin_rows",
        "columns": PO_SKIN_COLUMNS,
    },
    "DATA_MES": {
        "title": "Data MES",
        "table": "skin_data_mes_rows",
        "columns": DATA_MES_COLUMNS,
    },
    "GET_DATA": {
        "title": "Get Data",
        "table": "skin_get_data_rows",
        "columns": GET_DATA_COLUMNS,
    },
    "CHECK_DATA_SKIN": {
        "title": "Check_data_SKIN",
        "table": "skin_check_data_rows",
        "columns": CHECK_DATA_SKIN_COLUMNS,
    },
    "GET_DATA_PO": {
        "title": "Get_data_PO",
        "table": "skin_get_data_po_rows",
        "columns": GET_DATA_PO_COLUMNS,
    },
    "PIVOT_TABLE": {
        "title": "PivotTable",
        "table": "skin_pivot_table_rows",
        "columns": PIVOT_TABLE_COLUMNS,
    },
    "HANG_VOT": {
        "title": "Hàng Vớt",
        "table": "skin_hang_vot_rows",
        "columns": HANG_VOT_COLUMNS,
    },
    "KE_HOACH": {
        "title": "Kế hoạch",
        "table": "skin_ke_hoach_rows",
        "columns": KE_HOACH_COLUMNS,
    },
}

def normalize_sheet_key(sheet_name: str) -> str:
    s = re.sub(r'[\s_]+', '_', str(sheet_name or '')).strip().upper()
    if s in ("GET_DATA_PO", "GETDATAPO", "GET_DATA_PO_ROWS"):
        return "GET_DATA_PO"
    if s in ("PIVOT_TABLE", "PIVOTTABLE", "PIVOT", "PIVOT_TABLE_ROWS"):
        return "PIVOT_TABLE"
    if s in ("HANG_VOT", "HANGVOT", "HÀNG VỚT", "HANG_VOT_ROWS"):
        return "HANG_VOT"
    if s in ("DATA_MES", "DATAMES"):
        return "DATA_MES"
    if s in ("GET_DATA", "GETDATA"):
        return "GET_DATA"
    if s in ("CHECK_DATA_SKIN", "CHECKDATASKIN", "CHECK_DATA"):
        return "CHECK_DATA_SKIN"
    if s in ("PO_HSM", "POHSM"):
        return "PO_HSM"
    if s in ("PO_SKIN", "POSKIN"):
        return "PO_SKIN"
    if s in ("DATA_SOURCE", "DATASOURCE"):
        return "DATA_SOURCE"
    if s in ("SKIN_HRC2", "SKINHRC2"):
        return "SKIN_HRC2"
    if s in ("KE_HOACH", "KEHOACH", "KẾ HOẠCH", "KẾ_HOẠCH", "SKIN_KE_HOACH_ROWS", "PLAN"):
        return "KE_HOACH"
    return s

def get_sheet_table_name(sheet_name: str) -> str:
    key = normalize_sheet_key(sheet_name)
    if key in SHEET_REGISTRY:
        return SHEET_REGISTRY[key]["table"]
    raise ValueError(f"Sheet '{sheet_name}' không hợp lệ. Các sheet được hỗ trợ: {', '.join(SHEET_REGISTRY.keys())}")

def get_sheet_columns(sheet_name: str) -> list[str]:
    key = normalize_sheet_key(sheet_name)
    if key in SHEET_REGISTRY:
        return SHEET_REGISTRY[key]["columns"]
    return SKIN_HRC2_COLUMNS

def init_skin_tables():
    with get_db() as conn:
        # Standard sheet tables
        tables_to_create = [
            ("skin_hrc2_rows", "idx_skin_hrc2_row_num"),
            ("skin_po_hsm_rows", "idx_skin_po_hsm_row_num"),
            ("skin_po_skin_rows", "idx_skin_po_skin_row_num"),
            ("skin_data_mes_rows", "idx_skin_data_mes_row_num"),
            ("skin_get_data_rows", "idx_skin_get_data_row_num"),
            ("skin_check_data_rows", "idx_skin_check_data_row_num"),
            ("skin_get_data_po_rows", "idx_skin_get_data_po_row_num"),
            ("skin_pivot_table_rows", "idx_skin_pivot_table_row_num"),
            ("skin_hang_vot_rows", "idx_skin_hang_vot_row_num"),
            ("skin_ke_hoach_rows", "idx_skin_ke_hoach_row_num"),
        ]

        for tbl, idx in tables_to_create:
            conn.execute(f"""
                CREATE TABLE IF NOT EXISTS {tbl} (
                    id TEXT PRIMARY KEY,
                    row_number INTEGER,
                    values_json TEXT,
                    created_at TEXT,
                    updated_at TEXT
                );
            """)
            conn.execute(f"CREATE INDEX IF NOT EXISTS {idx} ON {tbl}(row_number);")

        # PivotTable dedicated fast tables
        conn.execute("""
            CREATE TABLE IF NOT EXISTS skin_pivot_coil_req (
                id TEXT PRIMARY KEY,
                coil_id TEXT NOT NULL,
                requirement TEXT,
                updated_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pivot_coil_id ON skin_pivot_coil_req(coil_id);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS skin_pivot_po_req (
                id TEXT PRIMARY KEY,
                po TEXT NOT NULL,
                requirement TEXT,
                updated_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pivot_po ON skin_pivot_po_req(po);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS skin_pivot_priority (
                id TEXT PRIMARY KEY,
                target_id TEXT NOT NULL,
                priority TEXT,
                updated_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pivot_priority_target ON skin_pivot_priority(target_id);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS skin_data_source_rows (
                id TEXT PRIMARY KEY,
                row_number INTEGER,
                order_id TEXT,
                coil_id TEXT,
                month TEXT,
                values_json TEXT,
                created_at TEXT,
                updated_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_skin_ds_row_num ON skin_data_source_rows(row_number);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_skin_ds_month ON skin_data_source_rows(month);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_skin_ds_coil_id ON skin_data_source_rows(coil_id);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS skin_history_snapshots (
                id TEXT PRIMARY KEY,
                sheet_name TEXT,
                action_type TEXT,
                description TEXT,
                state_json TEXT,
                created_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_skin_hist_sheet ON skin_history_snapshots(sheet_name, created_at);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS skin_coil_ghc_cache (
                coil_id TEXT PRIMARY KEY,
                ghc_value REAL,
                raw_json TEXT,
                updated_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_skin_ghc_coil ON skin_coil_ghc_cache(coil_id);")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS skin_settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TEXT
            );
        """)

# Initialize tables immediately
init_skin_tables()

def get_skin_setting(key: str, default: str = "") -> str:
    try:
        r = query_one("SELECT value FROM skin_settings WHERE key = ?", (key,))
        return r["value"] if r and r.get("value") is not None else default
    except Exception:
        return default

def set_skin_setting(key: str, value: str):
    try:
        now = datetime.now().isoformat()
        execute_write("""
            INSERT INTO skin_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        """, (key, value, now))
    except Exception as e:
        print(f"[Skin] Lỗi lưu setting '{key}': {e}")

# ==============================================================================
# UNDO & SNAPSHOT MANAGEMENT (Item 2)
# ==============================================================================
def save_sheet_snapshot(sheet_name: str, action_type: str, description: str):
    """Save full snapshot of a sheet before a mutating operation for undo"""
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    try:
        rows = query_all(f"SELECT * FROM {table} ORDER BY row_number ASC")
        now = datetime.now().isoformat()
        snap_id = str(uuid.uuid4())
        execute_write("""
            INSERT INTO skin_history_snapshots (id, sheet_name, action_type, description, state_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (snap_id, sheet_key, action_type, description, json.dumps(rows, ensure_ascii=False, default=str), now))

        # Keep only the last 10 snapshots per sheet to prevent DB bloating
        all_snaps = query_all("""
            SELECT id FROM skin_history_snapshots
            WHERE sheet_name = ?
            ORDER BY created_at DESC
        """, (sheet_key,))
        if len(all_snaps) > 10:
            to_del = [s["id"] for s in all_snaps[10:]]
            del_ph = ",".join("?" for _ in to_del)
            execute_write(f"DELETE FROM skin_history_snapshots WHERE id IN ({del_ph})", tuple(to_del))
    except Exception as e:
        print(f"Warning: failed to save snapshot for {sheet_name}: {e}")

def undo_sheet_action(sheet_name: str) -> dict:
    """Restore the previous snapshot of a sheet"""
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    last_snap = query_one("""
        SELECT id, action_type, description, state_json, created_at
        FROM skin_history_snapshots
        WHERE sheet_name = ?
        ORDER BY created_at DESC LIMIT 1
    """, (sheet_key,))

    if not last_snap:
        raise ValueError(f"Không có lịch sử thao tác để hoàn tác trên sheet '{sheet_key}'.")

    prev_rows = json.loads(last_snap.get("state_json") or "[]")

    with get_db() as conn:
        conn.execute(f"DELETE FROM {table}")
        if prev_rows:
            if table == "skin_data_source_rows":
                rows_to_insert = [
                    (r["id"], r["row_number"], r.get("order_id", ""), r.get("coil_id", ""), r.get("month", ""), r["values_json"], r.get("created_at"), r.get("updated_at"))
                    for r in prev_rows
                ]
                conn.executemany("""
                    INSERT INTO skin_data_source_rows (id, row_number, order_id, coil_id, month, values_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, rows_to_insert)
            else:
                rows_to_insert = [
                    (r["id"], r["row_number"], r["values_json"], r.get("created_at"), r.get("updated_at"))
                    for r in prev_rows
                ]
                conn.executemany(f"""
                    INSERT INTO {table} (id, row_number, values_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                """, rows_to_insert)

        conn.execute("DELETE FROM skin_history_snapshots WHERE id = ?", (last_snap["id"],))

    return {
        "success": True,
        "sheet_name": sheet_key,
        "action_type": last_snap["action_type"],
        "description": last_snap["description"],
        "restored_rows_count": len(prev_rows),
        "message": f"Đã hoàn tác: {last_snap['description']} (khôi phục {len(prev_rows):,} dòng)."
    }

def get_undo_info(sheet_name: str) -> dict:
    sheet_key = normalize_sheet_key(sheet_name)
    last_snap = query_one("""
        SELECT action_type, description, created_at
        FROM skin_history_snapshots
        WHERE sheet_name = ?
        ORDER BY created_at DESC LIMIT 1
    """, (sheet_key,))
    if last_snap:
        return {"can_undo": True, "description": last_snap["description"], "action_type": last_snap["action_type"]}
    return {"can_undo": False, "description": "", "action_type": ""}

# ==============================================================================
# FORMULA PARSING HELPERS (Items 4, 5, 6)
# ==============================================================================
def parse_thickness_from_desc(desc: any) -> float:
    """
    =VALUE(TEXTAFTER(TEXTBEFORE(LOWER([@[Material Description]]);"x");" ";-1))
    """
    if not desc:
        return 0.0
    s = str(desc).strip().lower()
    if "x" not in s:
        return 0.0
    before_x = s.split("x")[0].strip()
    tokens = before_x.split()
    if not tokens:
        return 0.0
    try:
        t_str = tokens[-1].replace(",", ".")
        return float(t_str)
    except Exception:
        return 0.0

def parse_width_from_desc(desc: any) -> str:
    """
    =MID(K3;FIND("x";K3)+1;IFERROR(FIND(" ";K3;FIND("x";K3))-FIND("x";K3)-1;LEN(K3)))
    """
    if not desc:
        return ""
    s = str(desc).strip()
    idx = s.lower().find("x")
    if idx == -1:
        return ""
    after_x = s[idx+1:].strip()
    tokens = after_x.split()
    return tokens[0] if tokens else ""

def parse_min_cw(cw_val: any) -> float:
    """
    =LET(
        x;TRIM([@CW]);
        xChuanda; SUBSTITUTE(SUBSTITUTE(x;"–";"-");"—";"-");
        kq; IF(LEFT(xChuanda;1)="<"; 0; LET(viTriGach; FIND("-"; xChuanda & "-"); --TRIM(LEFT(xChuanda; viTriGach - 1))))
    )
    """
    if not cw_val:
        return 0.0
    s = str(cw_val).strip().replace("–", "-").replace("—", "-")
    if s.startswith("<"):
        return 0.0
    parts = s.split("-")
    if not parts or not parts[0].strip():
        return 0.0
    try:
        return float(parts[0].strip().replace(",", "."))
    except Exception:
        return 0.0

def calculate_chi_dinh_dac_biet(ten_goi_hsm: any) -> str:
    """
    =IF(AND(VALUE(...)>6; VALUE(...)<=12);"Skin 4";IF(VALUE(...)>12;"Không xử lý";""))
    """
    t = parse_thickness_from_desc(ten_goi_hsm)
    if 6 < t <= 12:
        return "Skin 4"
    elif t > 12:
        return "Không xử lý"
    return ""

# ==============================================================================
# ELONGATION LOOKUP (Bảng tra Độ giãn dài theo Giới hạn chảy & Độ dày Thickness)
# ==============================================================================
ELONGATION_LOOKUP = {
    "200-249": {1.2: 2.6, 1.5: 2.5, 2.0: 2.4, 2.5: 2.3, 3.0: 2.2, 3.5: 2.1, 4.0: 2.0, 4.5: 1.9, 5.0: 1.8, 5.5: 1.7, 6.0: 1.6},
    "250-299": {1.2: 2.4, 1.5: 2.3, 2.0: 2.2, 2.5: 2.1, 3.0: 2.0, 3.5: 1.9, 4.0: 1.8, 4.5: 1.7, 5.0: 1.6, 5.5: 1.5, 6.0: 1.4},
    "300-349": {1.2: 2.2, 1.5: 2.1, 2.0: 2.0, 2.5: 1.9, 3.0: 1.8, 3.5: 1.7, 4.0: 1.6, 4.5: 1.5, 5.0: 1.4, 5.5: 1.3, 6.0: 1.2},
    "350-399": {1.2: 2.0, 1.5: 1.9, 2.0: 1.8, 2.5: 1.7, 3.0: 1.6, 3.5: 1.5, 4.0: 1.4, 4.5: 1.3, 5.0: 1.2, 5.5: 1.1, 6.0: 1.0},
    "400-449": {1.2: 1.8, 1.5: 1.7, 2.0: 1.6, 2.5: 1.5, 3.0: 1.4, 3.5: 1.3, 4.0: 1.2, 4.5: 1.1, 5.0: 1.0, 5.5: 0.9, 6.0: 0.8},
    "450-499": {1.2: 1.8, 1.5: 1.7, 2.0: 1.6, 2.5: 1.5, 3.0: 1.4, 3.5: 1.3, 4.0: 1.2, 4.5: 1.1, 5.0: 1.1, 5.5: 1.0, 6.0: 0.8},
    ">500":    {1.2: 1.7, 1.5: 1.6, 2.0: 1.5, 2.5: 1.4, 3.0: 1.3, 3.5: 1.2, 4.0: 1.1, 4.5: 1.1, 5.0: 0.9, 5.5: 0.8, 6.0: 0.7},
}

def find_thickness_step(t: float) -> float:
    """Quy chuẩn độ dày tấm về các mốc chuẩn trong bảng tra (1.2 .. 6.0)"""
    if t <= 1.2:
        return 1.2
    elif t <= 1.5:
        return 1.5
    elif t <= 2.0:
        return 2.0
    elif t <= 2.5:
        return 2.5
    elif t <= 3.0:
        return 3.0
    elif t <= 3.5:
        return 3.5
    elif t <= 4.0:
        return 4.0
    elif t <= 4.5:
        return 4.5
    elif t <= 5.0:
        return 5.0
    elif t <= 5.5:
        return 5.5
    else:
        return 6.0

def get_row_thickness(vals: dict) -> float:
    """Trích xuất độ dày thực tế từ SẢN PHẨM (e.g. '2.95x1219'), Thickness, hoặc Material Description"""
    sp = str(vals.get("SẢN PHẨM") or vals.get("Sản phẩm") or "").strip()
    if sp and "x" in sp.lower():
        t = parse_thickness_from_desc(sp)
        if t > 0:
            return t
    cd = vals.get("Thickness") or vals.get("CHIỀU DÀY") or vals.get("Chiều dày")
    if cd:
        try:
            val = float(str(cd).replace(",", ".").strip())
            if val > 0:
                return val
        except Exception:
            pass
    md = str(vals.get("Material Description") or vals.get("Tên gọi") or "").strip()
    if md and "x" in md.lower():
        t = parse_thickness_from_desc(md)
        if t > 0:
            return t
    return 0.0

def calculate_elongation(ghc_val: any, thickness_val: any) -> str:
    """
    Tra cứu Elongation dựa trên Giới hạn chảy (GHC) và Độ dày (Thickness) theo bảng excel chuẩn.
    Trả về chuỗi số (e.g. '2.6', '1.8') hoặc rỗng nếu chưa đủ dữ liệu.
    """
    if ghc_val is None or str(ghc_val).strip() in ("", "-", "None", "0", "-1.0"):
        return ""
    try:
        ghc = float(str(ghc_val).replace(",", ".").strip())
    except (ValueError, TypeError):
        return ""
    if ghc <= 0:
        return ""

    if thickness_val is None or str(thickness_val).strip() in ("", "-", "None", "0"):
        return ""
    try:
        t = float(str(thickness_val).replace(",", ".").strip())
    except (ValueError, TypeError):
        return ""
    if t <= 0:
        return ""

    # Xác định khoảng Giới hạn chảy
    if ghc < 250:
        group_key = "200-249"
    elif ghc < 300:
        group_key = "250-299"
    elif ghc < 350:
        group_key = "300-349"
    elif ghc < 400:
        group_key = "350-399"
    elif ghc < 450:
        group_key = "400-449"
    elif ghc < 500:
        group_key = "450-499"
    else:
        group_key = ">500"

    t_step = find_thickness_step(t)
    elongation = ELONGATION_LOOKUP[group_key].get(t_step)
    if elongation is not None:
        return str(elongation)
    return ""

def replace_id(coil_id: any) -> str:
    """Office Script replaceId(id): id.substring(0, 1) + 'A0' + id.substring(3)"""
    val = str(coil_id or "").strip()
    if len(val) < 3:
        return val
    return val[0] + "A0" + val[3:]

def resolve_ghc_from_candidates(candidates: list[str], cache: dict[str, float]) -> float | None:
    """
    Tra cứu GHC trong cache cho danh sách candidate IDs (ID GỐC, ID XỬ LÝ, replace_id...):
    Ưu tiên tuyệt đối bất kỳ candidate nào có ghc_value > 0 (giá trị thực nghiệm đo đạc hợp lệ).
    """
    for cid in candidates:
        if not cid:
            continue
        c_clean = str(cid).strip()
        val = cache.get(c_clean)
        if val is not None and val > 0:
            return float(val)
        rep = replace_id(c_clean)
        if rep and rep != c_clean:
            rep_val = cache.get(rep)
            if rep_val is not None and rep_val > 0:
                return float(rep_val)
    return None

def find_val(row_dict: dict, candidate_names: list[str]) -> str | float | None:
    """Smart lookup in dictionary ignoring case, whitespace and accents"""
    for cand in candidate_names:
        if cand in row_dict and row_dict[cand] is not None:
            return row_dict[cand]

    # Normalized lookup
    norm_dict = {re.sub(r'[\s_]+', '', str(k).strip().lower()): v for k, v in row_dict.items() if v is not None}
    for cand in candidate_names:
        cand_key = re.sub(r'[\s_]+', '', cand.strip().lower())
        if cand_key in norm_dict:
            return norm_dict[cand_key]
    return ""

def extract_month(date_val: any, fallback_str: str = "") -> int | None:
    """Extract integer month (1..12) from date or string"""
    if isinstance(date_val, (datetime, date)):
        return date_val.month

    s = str(date_val or "").strip()
    # Try YYYY-MM-DD or DD/MM/YYYY
    m1 = re.search(r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', s)
    if m1:
        try:
            return int(m1.group(2))
        except ValueError:
            pass

    m2 = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', s)
    if m2:
        try:
            return int(m2.group(2))
        except ValueError:
            pass

    # Check fallback string (e.g. sheet_name 'Thang_11' or 'T10')
    m3 = re.search(r'(?:thang|t)[_\s-]*(\d{1,2})', fallback_str.lower())
    if m3:
        try:
            val = int(m3.group(1))
            if 1 <= val <= 12:
                return val
        except ValueError:
            pass

    return None

def get_current_and_prev_months() -> list[int]:
    """Return [current_month, prev_month] as integers (1..12)"""
    now = datetime.now()
    cur = now.month
    prev = 12 if cur == 1 else cur - 1
    return [cur, prev]

def load_data_source_from_qc(months: list[int] | None = None) -> dict:
    """
    Query qcrows table from 'Dữ liệu' page for the requested months (default: current month and previous month).
    Sorted strictly by month (chronological order) and within each month in exact QC export order (row_number ASC),
    without filtering out any handling direction (takes all SKIN, SKIN_CUST, SKIN_RCL_AGAIN, CXL, FINAL, etc.),
    merges all original fields from qcrows, maps to DATA_SOURCE columns, and stores in skin_data_source_rows.
    """
    if not months:
        months = get_current_and_prev_months()

    allowed_months = sorted(list({int(m) for m in months if str(m).isdigit() and 1 <= int(m) <= 12}))
    now_iso = datetime.now().isoformat()

    # Load cached GHC values so we preserve them
    ghc_cache_rows = query_all("SELECT coil_id, ghc_value FROM skin_coil_ghc_cache")
    ghc_cache = {r["coil_id"]: r["ghc_value"] for r in ghc_cache_rows if r.get("coil_id")}

    matching_rows = []
    seen_coils = set()

    for m in allowed_months:
        rep_id = f"thang-{m}"
        month_rows = query_all("""
            SELECT id, report_id, sheet_name, row_number, order_id, coil_id, values_json 
            FROM qcrows 
            WHERE report_id = ?
            ORDER BY row_number ASC
        """, (rep_id,))

        if not month_rows:
            # Fallback to master report '6adf6dc6c603752d3ddd162d' for month m
            master_rows = query_all("""
                SELECT id, report_id, sheet_name, row_number, order_id, coil_id, values_json 
                FROM qcrows 
                WHERE report_id = '6adf6dc6c603752d3ddd162d'
                ORDER BY row_number ASC
            """)
            filtered_m = []
            for mr in master_rows:
                try:
                    v_temp = json.loads(mr.get("values_json") or "{}")
                except Exception:
                    v_temp = {}
                ngay_sx_temp = find_val(v_temp, ["NGÀY SẢN XUẤT", "Ngày sản xuất", "Ngay san xuat", "NGAY_SAN_XUAT", "Ngày SX", "Ngày"])
                if extract_month(ngay_sx_temp, fallback_str=mr.get("sheet_name") or "") == m:
                    filtered_m.append(mr)
            month_rows = filtered_m

        for r in month_rows:
            try:
                vals = json.loads(r.get("values_json") or "{}")
            except Exception:
                vals = {}

            ngay_sx = find_val(vals, ["NGÀY SẢN XUẤT", "Ngày sản xuất", "Ngay san xuat", "NGAY_SAN_XUAT", "Ngày SX", "Ngày"])
            row_month = m

            # Extract standard values
            huong_xu_ly = str(find_val(vals, ["HƯỚNG XỬ LÝ", "HƯỚNG XỬ LÝ_WEB", "Huong xu ly", "HUONG_XU_LY"]) or "").strip()
            order_val = find_val(vals, ["ORDER", "Order", "order", "Hợp đồng", "PO"]) or r.get("order_id") or ""
            cap_cl = find_val(vals, ["TỔNG CẤP CHẤT LƯỢNG", "Tổng cấp chất lượng", "Tong cap chat luong", "CẤP CHẤT LƯỢNG", "CAP_CHAT_LUONG"]) or ""
            phan_loai = find_val(vals, ["PHÂN LOẠI", "Phân loại", "Phan loai", "Phân loại chất lượng"]) or ""
            tinh_trang_cl = find_val(vals, ["TÌNH TRẠNG CHẤT LƯỢNG", "Tình trạng chất lượng", "Tinh trang chat luong", "TÌNH TRẠNG"]) or ""
            loi_lech = find_val(vals, ["LỖI LỆCH TDC", "Lỗi lệch TDC", "Lỗi lệch", "Loi lech TDC", "LỖI LỆCH"]) or ""
            id_xu_ly = find_val(vals, ["ID XỬ LÝ", "ID Xử lý", "Id xu ly", "ID_XU_LY", "Mã cuộn xử lý"]) or ""
            id_goc = find_val(vals, ["ID GỐC", "ID Gốc", "Id goc", "ID_GOC", "Mã cuộn gốc", "Mã cuộn"]) or r.get("coil_id") or ""
            khoi_luong = find_val(vals, ["KHỐI LƯỢNG TỊNH", "Khối lượng tịnh", "Khối lượng", "Khoi luong tinh", "NET_WEIGHT", "Weight"]) or ""
            ghi_chu = find_val(vals, ["col_77", "Ghi Chú", "Ghi chú", "Ghi chu", "GHI CHÚ", "GHI CHÚ QC", "Ghi chú xử lý"]) or vals.get("col_77") or ""
            loai_cl = cap_cl or phan_loai

            # Dedup key by coil and month
            coil_key = str(id_xu_ly or id_goc or order_val).strip()
            dedup_key = (coil_key, row_month)
            if coil_key and dedup_key in seen_coils:
                continue
            if coil_key:
                seen_coils.add(dedup_key)

            # Merge all original fields from vals plus standardized target columns
            c_goc = str(id_goc).strip()
            c_xl = str(id_xu_ly).strip()
            candidates = [c for c in [c_goc, c_xl, replace_id(c_goc), replace_id(c_xl)] if c]
            ghc_num = resolve_ghc_from_candidates(candidates, ghc_cache)
            ghc_str = str(round(float(ghc_num), 3)) if ghc_num is not None and ghc_num > 0 else "-"
            mapped_dict = dict(vals)
            t_row = get_row_thickness(vals)
            el_val = calculate_elongation(ghc_num, t_row) if ghc_num is not None and ghc_num > 0 else ""
            mapped_dict.update({
                "ORDER": order_val,
                "TỔNG CẤP CHẤT LƯỢNG": cap_cl,
                "PHÂN LOẠI": phan_loai,
                "Loại": loai_cl,
                "TÌNH TRẠNG CHẤT LƯỢNG": tinh_trang_cl,
                "HƯỚNG XỬ LÝ": huong_xu_ly,
                "LỖI LỆCH TDC": loi_lech,
                "NGÀY SẢN XUẤT": ngay_sx,
                "ID XỬ LÝ": id_xu_ly,
                "ID GỐC": id_goc,
                "KHỐI LƯỢNG TỊNH": khoi_luong,
                "GHC": ghc_str,
                "Elongation": el_val,
                "Ghi Chú": ghi_chu,
                "col_77": ghi_chu,
            })

            matching_rows.append((
                str(uuid.uuid4()),
                len(matching_rows) + 1,
                str(order_val),
                str(id_xu_ly or id_goc),
                str(row_month or ""),
                json.dumps(mapped_dict, ensure_ascii=False, default=str),
                now_iso,
                now_iso,
            ))

    if not matching_rows:
        return {
            "success": False,
            "rows_loaded": 0,
            "message": f"Chưa có dữ liệu từ trang Dữ liệu cho các tháng {', '.join(str(m) for m in allowed_months)}. Dữ liệu DATA_SOURCE hiện tại vẫn được giữ nguyên an toàn."
        }

    # Clear and insert into skin_data_source_rows in batch
    with get_db() as conn:
        conn.execute("DELETE FROM skin_data_source_rows")
        conn.executemany("""
            INSERT INTO skin_data_source_rows (id, row_number, order_id, coil_id, month, values_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, matching_rows)

    # Tự động tính toán cập nhật lại công thức cho sheet SKIN_HRC2 nếu đã có dòng
    try:
        recalculate_skin_hrc2()
    except Exception as re_e:
        print(f"[Skin] Không thể tự động tính lại công thức SKIN_HRC2: {re_e}")

    return {
        "success": True,
        "rows_loaded": len(matching_rows),
        "months_filtered": list(allowed_months),
        "message": f"Đã lấy thành công toàn bộ {len(matching_rows):,} dòng dữ liệu sắp xếp theo tháng: {', '.join(str(m) for m in allowed_months)}."
    }

def get_sheet_rows(sheet_name: str, limit: int = 100, offset: int = 0, search: str = "") -> dict:
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    columns = get_sheet_columns(sheet_key)

    where = "WHERE 1=1"
    params = []
    if search:
        tokens = [t.strip() for t in re.split(r'[\s,;]+', search) if t.strip()]
        if tokens:
            # Tối ưu hóa cực nhanh cho skin_data_source_rows sử dụng index coil_id
            if table == "skin_data_source_rows":
                coil_tokens = [t for t in tokens if len(t) >= 4 and t.isalnum()]
                if coil_tokens:
                    ph = ",".join("?" for _ in coil_tokens)
                    where += f" AND (coil_id IN ({ph}) OR order_id IN ({ph}))"
                    params.extend(coil_tokens)
                    params.extend(coil_tokens)
                else:
                    token_clauses = ["values_json LIKE ?" for _ in tokens]
                    where += f" AND ({' OR '.join(token_clauses)})"
                    params.extend([f"%{t}%" for t in tokens])
            else:
                token_clauses = ["values_json LIKE ?" for _ in tokens]
                where += f" AND ({' OR '.join(token_clauses)})"
                params.extend([f"%{t}%" for t in tokens])

    # Tối ưu truy vấn: Nếu lấy toàn bộ (limit >= 10000) và offset == 0, không cần chạy SELECT count(*) tốn tài nguyên
    if limit >= 10000 and offset == 0:
        sql = f"SELECT id, row_number, values_json FROM {table} {where} ORDER BY row_number ASC LIMIT ?"
        db_rows = query_all(sql, tuple(params + [limit]))
        total = len(db_rows)
    else:
        count_res = query_one(f"SELECT count(*) as total FROM {table} {where}", tuple(params))
        total = count_res["total"] if count_res else 0
        sql = f"SELECT id, row_number, values_json FROM {table} {where} ORDER BY row_number ASC LIMIT ? OFFSET ?"
        db_rows = query_all(sql, tuple(params + [limit, offset]))

    rows = []
    loads = json.loads
    for r in db_rows:
        try:
            val_dict = loads(r.get("values_json") or "{}")
        except Exception:
            val_dict = {}
        rows.append({
            "id": r["id"],
            "row_number": r["row_number"],
            "values": val_dict,
        })

    return {
        "sheet_name": sheet_name,
        "sheet_key": sheet_key,
        "columns": columns,
        "total": total,
        "limit": limit,
        "offset": offset,
        "rows": rows,
    }

def add_sheet_row(sheet_name: str, values: dict = None) -> dict:
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    columns = get_sheet_columns(sheet_key)

    save_sheet_snapshot(sheet_key, "ADD_ROW", f"Thêm 1 dòng vào sheet {sheet_key}")

    values = values or {col: "" for col in columns}
    max_row = query_one(f"SELECT MAX(row_number) as m FROM {table}")
    new_row_num = ((max_row["m"] or 0) + 1) if max_row else 1
    new_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    with get_db() as conn:
        if table == "skin_data_source_rows":
            order_id = str(values.get("ORDER") or "")
            coil_id = str(values.get("ID XỬ LÝ") or values.get("ID GỐC") or "")
            conn.execute("""
                INSERT INTO skin_data_source_rows (id, row_number, order_id, coil_id, month, values_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (new_id, new_row_num, order_id, coil_id, "", json.dumps(values, ensure_ascii=False, default=str), now, now))
        else:
            conn.execute(f"""
                INSERT INTO {table} (id, row_number, values_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, (new_id, new_row_num, json.dumps(values, ensure_ascii=False, default=str), now, now))

    return {
        "id": new_id,
        "row_number": new_row_num,
        "values": values,
        "sheet_name": sheet_name,
    }

def add_sheet_rows_batch(sheet_name: str, count: int = 1, values: dict | None = None) -> dict:
    """
    Thêm nhiều dòng 1 lúc vào sheet, giới hạn tối đa 1.000 dòng 1 lần.
    """
    count = max(1, min(1000, int(count or 1)))
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    columns = get_sheet_columns(sheet_key)

    save_sheet_snapshot(sheet_key, "ADD_BATCH", f"Thêm {count} dòng vào sheet {sheet_key}")

    base_values = values or {col: "" for col in columns}
    now = datetime.now().isoformat()

    with get_db() as conn:
        cur = conn.cursor()
        max_row = cur.execute(f"SELECT MAX(row_number) as m FROM {table}").fetchone()
        start_row_num = ((max_row[0] or 0) + 1) if max_row and max_row[0] is not None else 1

        rows_to_insert = []
        if table == "skin_data_source_rows":
            order_id = str(base_values.get("ORDER") or "")
            coil_id = str(base_values.get("ID XỬ LÝ") or base_values.get("ID GỐC") or "")
            json_str = json.dumps(base_values, ensure_ascii=False, default=str)
            for i in range(count):
                rows_to_insert.append((
                    str(uuid.uuid4()),
                    start_row_num + i,
                    order_id,
                    coil_id,
                    "",
                    json_str,
                    now,
                    now,
                ))
            cur.executemany("""
                INSERT INTO skin_data_source_rows (id, row_number, order_id, coil_id, month, values_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, rows_to_insert)
        else:
            json_str = json.dumps(base_values, ensure_ascii=False, default=str)
            for i in range(count):
                rows_to_insert.append((
                    str(uuid.uuid4()),
                    start_row_num + i,
                    json_str,
                    now,
                    now,
                ))
            cur.executemany(f"""
                INSERT INTO {table} (id, row_number, values_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, rows_to_insert)

    return {
        "success": True,
        "count": count,
        "sheet_name": sheet_name,
        "start_row_number": start_row_num,
        "end_row_number": start_row_num + count - 1,
    }

def transfer_data_source_to_skin(row_ids: list[str]) -> dict:
    """
    Chuyển/Thêm các dòng đã chọn từ DATA_SOURCE sang SKIN_HRC2.
    Giới hạn tối đa 15.000 dòng 1 lần.
    """
    if not row_ids:
        raise ValueError("Chưa chọn dòng nào để thêm vào SKIN_HRC2.")

    save_sheet_snapshot("SKIN_HRC2", "TRANSFER_DS", f"Chuyển {len(row_ids)} cuộn từ DATA_SOURCE sang SKIN_HRC2")

    # Giới hạn tối đa 15.000 dòng
    target_ids = list(row_ids)[:15000]
    placeholders = ",".join("?" for _ in target_ids)

    with get_db() as conn:
        cur = conn.cursor()

        # Lấy dữ liệu các dòng được chọn từ DATA_SOURCE
        db_rows = cur.execute(
            f"SELECT id, values_json FROM skin_data_source_rows WHERE id IN ({placeholders}) ORDER BY row_number ASC",
            target_ids
        ).fetchall()

        if not db_rows:
            raise ValueError("Không tìm thấy dòng nào hợp lệ từ DATA_SOURCE.")

        # Lấy danh sách các ID Cuộn Bó đã tồn tại trong SKIN_HRC2 để check trùng
        existing_rows = cur.execute("SELECT values_json FROM skin_hrc2_rows").fetchall()
        existing_coils = set()
        for er in existing_rows:
            try:
                v = json.loads(er[0] or "{}")
                c_id = str(v.get("ID Cuộn Bó") or "").strip()
                if c_id:
                    existing_coils.add(c_id)
            except Exception:
                pass

        max_row = cur.execute("SELECT MAX(row_number) as m FROM skin_hrc2_rows").fetchone()
        start_row_num = ((max_row[0] or 0) + 1) if max_row and max_row[0] is not None else 1

        now = datetime.now().isoformat()
        rows_to_insert = []

        for idx, r in enumerate(db_rows):
            try:
                ds_val = json.loads(r[1] or "{}")
            except Exception:
                ds_val = {}

            order = str(ds_val.get("ORDER") or "").strip()
            coil_id = str(ds_val.get("ID GỐC") or ds_val.get("ID XỬ LÝ") or "").strip()
            po_xuly = str(ds_val.get("ID XỬ LÝ") or "").strip()
            huong_xu_ly = str(ds_val.get("HƯỚNG XỬ LÝ") or "").strip()
            khoi_luong = ds_val.get("KHỐI LƯỢNG TỊNH") or ""
            ngay_sx = ds_val.get("NGÀY SẢN XUẤT") or ""
            loi_lech = ds_val.get("LỖI LỆCH TDC") or ""
            cap_cl = str(ds_val.get("TỔNG CẤP CHẤT LƯỢNG") or ds_val.get("PHÂN LOẠI") or ds_val.get("Loại") or "").strip()
            phan_loai = cap_cl

            # Lấy GHC và % Elongation từ DATA_SOURCE
            ghc_val = str(ds_val.get("GHC") if ds_val.get("GHC") is not None else "").strip()
            el_val = str(ds_val.get("% Elongation") or ds_val.get("Elongation") or "").strip()
            if not el_val and ghc_val:
                t_row = get_row_thickness(ds_val)
                if t_row > 0:
                    el_val = calculate_elongation(ghc_val, t_row)

            m_val = extract_month(ngay_sx)
            thang_str = f"Tháng {m_val}" if m_val else ""

            check_trung = "Trùng" if coil_id and (coil_id in existing_coils) else ""
            if coil_id:
                existing_coils.add(coil_id)

            skin_row_val = {
                "HƯỚNG XỬ LÝ_WEB": huong_xu_ly,
                "Loại": cap_cl,
                "Kế hoạch": "",
                "PO Tháng": "",
                "PO Xử lý": po_xuly,
                "Material Description_SPM": "",
                "Khách hàng": "",
                "Đã chạy": "",
                "Check Trùng": check_trung,
                "ID Cuộn Bó": coil_id,
                "Material Description": "",
                "Khối lượng": khoi_luong,
                "Ngày sản xuất": ngay_sx,
                "Ca": "",
                "Vị trí": "",
                "Order": order,
                "Thickness": "",
                "DVKTKH": "",
                "Chỉ định Skin": "",
                "Mục đích sử dụng": "",
                "Ưu tiên đơn hàng": "",
                "Lỗi lệch": loi_lech,
                "GHC": ghc_val,
                "% Elongation": el_val,
                "Tháng": thang_str,
            }

            rows_to_insert.append((
                str(uuid.uuid4()),
                start_row_num + idx,
                json.dumps(skin_row_val, ensure_ascii=False, default=str),
                now,
                now,
            ))

        cur.executemany("""
            INSERT INTO skin_hrc2_rows (id, row_number, values_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, rows_to_insert)

    return {
        "success": True,
        "count": len(rows_to_insert),
        "message": f"Đã chuyển thành công {len(rows_to_insert)} dòng vào sheet SKIN_HRC2!",
    }

def delete_sheet_rows_batch(sheet_name: str, row_ids: list[str]) -> dict:
    """
    Xóa nhiều dòng 1 lúc khỏi sheet (tối đa 1000 dòng).
    """
    if not row_ids:
        return {"success": True, "count": 0}

    sheet_key = normalize_sheet_key(sheet_name)
    save_sheet_snapshot(sheet_key, "DELETE_BATCH", f"Xóa {len(row_ids)} dòng khỏi sheet {sheet_key}")

    target_ids = list(row_ids)[:1000]
    table = get_sheet_table_name(sheet_key)
    placeholders = ",".join("?" for _ in target_ids)

    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(f"DELETE FROM {table} WHERE id IN ({placeholders})", target_ids)
        deleted_count = cur.rowcount

    return {
        "success": True,
        "count": deleted_count,
        "message": f"Đã xóa {deleted_count} dòng thành công!",
    }

def import_paste_rows(sheet_name: str, rows_data: list[dict]) -> dict:
    """
    Nhận danh sách dữ liệu paste từ Excel/bảng (tối đa 15.000 dòng cho SKIN_HRC2) và chèn vào sheet.
    Tự động chuẩn hóa, kiểm tra ràng buộc trùng PO (cho PO_HSM & PO_SKIN) hoặc trùng ID Cuộn Bó (SKIN_HRC2),
    và tự động chạy tính toán công thức liên quan.
    """
    if not rows_data:
        raise ValueError("Chưa có dữ liệu dòng nào để thêm.")

    sheet_key = normalize_sheet_key(sheet_name)
    max_limit = 15000 if sheet_key in ("SKIN_HRC2", "HANG_VOT", "GET_DATA_PO") else 1000
    capped_rows = rows_data[:max_limit]
    table = get_sheet_table_name(sheet_key)
    columns = get_sheet_columns(sheet_key)
    now = datetime.now().isoformat()

    save_sheet_snapshot(sheet_key, "PASTE_ROWS", f"Dán {len(capped_rows)} dòng vào sheet {sheet_key}")

    with get_db() as conn:
        cur = conn.cursor()
        max_row = cur.execute(f"SELECT MAX(row_number) as m FROM {table}").fetchone()
        start_row_num = ((max_row[0] or 0) + 1) if max_row and max_row[0] is not None else 1

        # Ràng buộc kiểm tra trùng PO cho PO_HSM và PO_SKIN (Item 3)
        existing_po_map = {} # po -> row_id
        if sheet_key in ("PO_HSM", "PO_SKIN"):
            po_col_primary = "PO_HSM" if sheet_key == "PO_HSM" else "PO_SPM"
            for er in cur.execute(f"SELECT id, values_json FROM {table}").fetchall():
                try:
                    v = json.loads(er[1] or "{}")
                    p_val = str(v.get(po_col_primary) or (v.get("PO_HSM") if sheet_key == "PO_SKIN" else "") or "").strip()
                    if p_val:
                        existing_po_map[p_val] = er[0]
                except Exception:
                    pass

        existing_coils = set()
        if sheet_key == "SKIN_HRC2":
            for er in cur.execute("SELECT values_json FROM skin_hrc2_rows").fetchall():
                try:
                    v = json.loads(er[0] or "{}")
                    cid = str(v.get("ID Cuộn Bó") or "").strip()
                    if cid:
                        existing_coils.add(cid)
                except Exception:
                    pass

        # Tra cứu sẵn cho GET_DATA_PO nếu cần
        by_po_hsm_get = {}
        by_po_spm_get = {}
        if sheet_key == "GET_DATA_PO":
            try:
                by_po_hsm_get, by_po_spm_get = build_demand_lookup_index()
            except Exception:
                pass

        rows_to_insert = []
        rows_to_update = [] # (values_json, updated_at, id)

        for i, item in enumerate(capped_rows):
            val_dict = {col: str(item.get(col) if item.get(col) is not None else "").strip() for col in columns}

            # Tự động gán và tra cứu cho GET_DATA_PO
            if sheet_key == "GET_DATA_PO":
                raw_po = val_dict.get("PO") or item.get("PO")
                if not raw_po and len(item) == 1:
                    raw_po = list(item.values())[0]
                po_clean = clean_po_str(raw_po)
                if po_clean:
                    val_dict["PO"] = po_clean
                    matched = by_po_spm_get.get(po_clean) or by_po_hsm_get.get(po_clean)
                    if matched:
                        for k in ["Tháng", "Đợt", "Khách hàng", "PO_HSM", "PO_SPM", "Tên gọi_HSM", "Tên gọi_SPM", "CW", "KH_Loại 1", "Mục đích sử dụng"]:
                            if not val_dict.get(k):
                                val_dict[k] = matched.get(k, "")
                    else:
                        if not val_dict.get("Khách hàng"):
                            val_dict["Khách hàng"] = "Không tìm thấy PO"

            # Ràng buộc trùng PO (Item 3)
            if sheet_key in ("PO_HSM", "PO_SKIN"):
                po_val = str(val_dict.get("PO_HSM") if sheet_key == "PO_HSM" else (val_dict.get("PO_SPM") or val_dict.get("PO_HSM")) or "").strip()
                if po_val and po_val in existing_po_map:
                    target_row_id = existing_po_map[po_val]
                    rows_to_update.append((json.dumps(val_dict, ensure_ascii=False, default=str), now, target_row_id))
                    continue

                if po_val:
                    existing_po_map[po_val] = True # Mark seen

            if sheet_key == "SKIN_HRC2":
                coil_id = str(val_dict.get("ID Cuộn Bó") or "").strip()
                ngay_sx = val_dict.get("Ngày sản xuất") or ""
                m_val = extract_month(ngay_sx)
                if m_val and not val_dict.get("Tháng"):
                    val_dict["Tháng"] = f"Tháng {m_val}"

                if coil_id:
                    if coil_id in existing_coils:
                        val_dict["Check Trùng"] = "TRUE"
                    else:
                        existing_coils.add(coil_id)

                json_str = json.dumps(val_dict, ensure_ascii=False, default=str)
                rows_to_insert.append((
                    str(uuid.uuid4()),
                    start_row_num + len(rows_to_insert),
                    json_str,
                    now,
                    now,
                ))
            elif table == "skin_data_source_rows":
                order_id = str(val_dict.get("ORDER") or "")
                coil_id = str(val_dict.get("ID XỬ LÝ") or val_dict.get("ID GỐC") or "")
                json_str = json.dumps(val_dict, ensure_ascii=False, default=str)
                rows_to_insert.append((
                    str(uuid.uuid4()),
                    start_row_num + len(rows_to_insert),
                    order_id,
                    coil_id,
                    "",
                    json_str,
                    now,
                    now,
                ))
            else:
                json_str = json.dumps(val_dict, ensure_ascii=False, default=str)
                rows_to_insert.append((
                    str(uuid.uuid4()),
                    start_row_num + len(rows_to_insert),
                    json_str,
                    now,
                    now,
                ))

        if rows_to_update:
            cur.executemany(f"UPDATE {table} SET values_json = ?, updated_at = ? WHERE id = ?", rows_to_update)

        if rows_to_insert:
            if table == "skin_data_source_rows":
                cur.executemany("""
                    INSERT INTO skin_data_source_rows (id, row_number, order_id, coil_id, month, values_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, rows_to_insert)
            else:
                cur.executemany(f"""
                    INSERT INTO {table} (id, row_number, values_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                """, rows_to_insert)

    # Chạy tính toán tự động
    if sheet_key == "SKIN_HRC2":
        try: recalculate_skin_hrc2()
        except Exception: pass
    elif sheet_key in ("PO_HSM", "PO_SKIN"):
        try: recalculate_po_sheet(sheet_key)
        except Exception: pass
    elif sheet_key == "GET_DATA_PO":
        try: recalculate_get_data_po()
        except Exception: pass
    elif sheet_key == "PIVOT_TABLE":
        try:
            with get_db() as conn:
                for row in query_all("SELECT values_json FROM skin_pivot_table_rows"):
                    try:
                        v = json.loads(row.get("values_json") or "{}")
                    except Exception:
                        continue
                    cid = str(v.get("ID Cuộn (Yêu cầu)") or "").strip()
                    creq = str(v.get("Yêu cầu đặc biệt (Cuộn)") or "").strip()
                    if cid and creq:
                        conn.execute("INSERT OR REPLACE INTO skin_pivot_coil_req (id, coil_id, requirement, updated_at) VALUES (?, ?, ?, ?)", (str(uuid.uuid4()), cid, creq, now))
                    po = str(v.get("PO (Yêu cầu)") or "").strip()
                    preq = str(v.get("Yêu cầu đặc biệt (PO)") or "").strip()
                    if po and preq:
                        conn.execute("INSERT OR REPLACE INTO skin_pivot_po_req (id, po, requirement, updated_at) VALUES (?, ?, ?, ?)", (str(uuid.uuid4()), po, preq, now))
                    target = str(v.get("PO/ID cuộn (Ưu tiên)") or "").strip()
                    prio = str(v.get("Ưu tiên sản xuất") or "").strip()
                    if target and prio:
                        conn.execute("INSERT OR REPLACE INTO skin_pivot_priority (id, target_id, priority, updated_at) VALUES (?, ?, ?, ?)", (str(uuid.uuid4()), target, prio, now))
        except Exception: pass

    msg = f"Đã thêm thành công {len(rows_to_insert)} dòng"
    if rows_to_update:
        msg += f" và cập nhật {len(rows_to_update)} dòng trùng PO"
    msg += f" vào sheet {sheet_name}!"

    return {
        "success": True,
        "count": len(rows_to_insert),
        "updated_count": len(rows_to_update),
        "message": msg,
    }

def paste_column_data(sheet_name: str, column_name: str, column_values: list[str]) -> dict:
    """
    Dán dữ liệu theo từng cột (như user yêu cầu cho sheet PO_HSM).
    Cập nhật giá trị của cột column_name cho từng dòng từ row 1..N.
    Nếu số dòng hiện có ít hơn số giá trị dán vào, tự động tạo thêm các dòng mới!
    """
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    columns = get_sheet_columns(sheet_key)
    if column_name not in columns:
        raise ValueError(f"Cột '{column_name}' không tồn tại trong sheet '{sheet_name}'.")

    capped_values = [str(v if v is not None else '').strip() for v in column_values[:1000]]
    if not capped_values:
        return {"success": True, "count": 0}

    now = datetime.now().isoformat()

    with get_db() as conn:
        cur = conn.cursor()
        existing_rows = cur.execute(f"SELECT id, row_number, values_json FROM {table} ORDER BY row_number ASC").fetchall()

        # Update existing rows
        for idx in range(min(len(existing_rows), len(capped_values))):
            row_id = existing_rows[idx][0]
            try:
                cur_dict = json.loads(existing_rows[idx][2] or "{}")
            except Exception:
                cur_dict = {}
            cur_dict[column_name] = capped_values[idx]
            cur.execute(f"UPDATE {table} SET values_json = ?, updated_at = ? WHERE id = ?", (json.dumps(cur_dict, ensure_ascii=False, default=str), now, row_id))

        # If more values than existing rows, insert new rows
        if len(capped_values) > len(existing_rows):
            start_row = len(existing_rows) + 1
            new_rows_to_insert = []
            for j in range(len(existing_rows), len(capped_values)):
                new_dict = {col: "" for col in columns}
                new_dict[column_name] = capped_values[j]
                if table == "skin_data_source_rows":
                    new_rows_to_insert.append((
                        str(uuid.uuid4()),
                        start_row + (j - len(existing_rows)),
                        "",
                        "",
                        "",
                        json.dumps(new_dict, ensure_ascii=False, default=str),
                        now,
                        now,
                    ))
                else:
                    new_rows_to_insert.append((
                        str(uuid.uuid4()),
                        start_row + (j - len(existing_rows)),
                        json.dumps(new_dict, ensure_ascii=False, default=str),
                        now,
                        now,
                    ))

            if table == "skin_data_source_rows":
                cur.executemany(f"INSERT INTO {table} (id, row_number, order_id, coil_id, month, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", new_rows_to_insert)
            else:
                cur.executemany(f"INSERT INTO {table} (id, row_number, values_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", new_rows_to_insert)

    return {
        "success": True,
        "sheet_name": sheet_name,
        "column_name": column_name,
        "count": len(capped_values),
        "message": f"Đã dán thành công {len(capped_values)} giá trị vào cột '{column_name}'.",
    }

def copy_po_hsm_to_skin() -> dict:
    """
    Sao chép dữ liệu từ sheet PO_HSM sang PO_SKIN cho các cột chung:
    Tháng, Đợt, Khách hàng, PO_HSM, Tên gọi_HSM, CW, KH_Loại 1, Mục đích sử dụng, KL_Chờ SKIN, KL_Loại 1, Min_CW, Chỉ định đặc biệt
    """
    now = datetime.now().isoformat()
    with get_db() as conn:
        cur = conn.cursor()
        hsm_rows = cur.execute("SELECT values_json FROM skin_po_hsm_rows ORDER BY row_number ASC").fetchall()
        if not hsm_rows:
            raise ValueError("Sheet PO_HSM hiện chưa có dữ liệu để sao chép.")

        save_sheet_snapshot("PO_SKIN", "COPY_HSM", f"Sao chép {len(hsm_rows)} dòng từ PO_HSM sang PO_SKIN")

        max_row = cur.execute("SELECT MAX(row_number) as m FROM skin_po_skin_rows").fetchone()
        start_row = ((max_row[0] or 0) + 1) if max_row and max_row[0] is not None else 1

        rows_to_insert = []
        for i, r in enumerate(hsm_rows):
            try:
                v = json.loads(r[0] or "{}")
            except Exception:
                v = {}

            skin_val = {col: "" for col in PO_SKIN_COLUMNS}
            for col in PO_HSM_COLUMNS:
                if col in skin_val and col in v:
                    skin_val[col] = v[col]

            rows_to_insert.append((
                str(uuid.uuid4()),
                start_row + i,
                json.dumps(skin_val, ensure_ascii=False, default=str),
                now,
                now,
            ))

        cur.executemany("""
            INSERT INTO skin_po_skin_rows (id, row_number, values_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, rows_to_insert)

    # Chạy tính toán tự động và gán PO_NEW cho PO_SKIN
    try: recalculate_po_sheet("PO_SKIN")
    except Exception: pass
    try: auto_link_po_new_in_po_skin()
    except Exception: pass

    return {
        "success": True,
        "count": len(rows_to_insert),
        "message": f"Đã sao chép thành công {len(rows_to_insert)} dòng từ PO_HSM sang PO_SKIN!",
    }

def sync_check_data_skin() -> dict:
    """
    Tự động tổng hợp dữ liệu cho sheet Check_data_SKIN:
    Nhóm 1: Hàng chờ Skin chưa có trên sheet SKIN_HRC2
            - Lấy từ DATA_SOURCE có HƯỚNG XỬ LÝ là SKIN hoặc SKIN_CUST
            - ID (ID GỐC hoặc ID XỬ LÝ) chưa tồn tại trong ID Cuộn Bó của sheet SKIN_HRC2
    Nhóm 2: Hàng Skin chờ chạy lại or chờ đánh giá chất lượng
            - Lấy từ DATA_SOURCE có HƯỚNG XỬ LÝ chứa SKIN_RCL_AGAIN hoặc tương tự
    Ghép 2 nhóm vào bảng Check_data_SKIN
    """
    save_sheet_snapshot("CHECK_DATA_SKIN", "SYNC_CHECK", "Tổng hợp đối chiếu Check Data từ DATA_SOURCE và SKIN_HRC2")

    with get_db() as conn:
        cur = conn.cursor()

        # 1. Lấy toàn bộ ID Cuộn Bó đã có trong sheet SKIN_HRC2
        hrc2_rows = cur.execute("SELECT values_json FROM skin_hrc2_rows").fetchall()
        existing_coils = set()
        for r in hrc2_rows:
            try:
                v = json.loads(r[0] or "{}")
                cid = str(v.get("ID Cuộn Bó") or "").strip()
                if cid:
                    existing_coils.add(cid)
            except Exception:
                pass

        # 2. Lấy toàn bộ dòng từ DATA_SOURCE
        ds_rows = cur.execute("SELECT values_json FROM skin_data_source_rows ORDER BY row_number ASC").fetchall()

        group1 = [] # Chờ Skin chưa có trên SKIN_HRC2
        group2 = [] # Chờ chạy lại hoặc đánh giá chất lượng

        for r in ds_rows:
            try:
                v = json.loads(r[0] or "{}")
            except Exception:
                continue

            huong_xu_ly = str(v.get("HƯỚNG XỬ LÝ") or "").strip().upper()
            id_goc = str(v.get("ID GỐC") or "").strip()
            id_xuly = str(v.get("ID XỬ LÝ") or "").strip()
            coil_id = id_goc or id_xuly
            phan_loai = str(v.get("TỔNG CẤP CHẤT LƯỢNG") or v.get("PHÂN LOẠI") or v.get("Loại") or "").strip()
            ngay_sx = str(v.get("NGÀY SẢN XUẤT") or "").strip()

            # Nhóm 1: Hướng xử lý SKIN hoặc SKIN_CUST và chưa có trên sheet SKIN_HRC2
            if huong_xu_ly in ("SKIN", "SKIN_CUST"):
                if coil_id and (coil_id not in existing_coils):
                    group1.append({
                        "ID HRC_1": coil_id,
                        "Hướng Xử lý_1": huong_xu_ly,
                        "Loại_1": phan_loai,
                        "Ngày sản xuất_1": ngay_sx,
                    })

            # Nhóm 2: Hàng Skin chờ chạy lại or chờ đánh giá chất lượng
            if "CXL" in huong_xu_ly or "SKIN_RCL_AGAIN" in huong_xu_ly or "SKIN_RCL" in huong_xu_ly or "RCL_AGAIN" in huong_xu_ly or "RCL" in huong_xu_ly:
                group2.append({
                    "ID HRC_2": coil_id,
                    "ID SPM_2": id_xuly,
                    "Hướng Xử lý_2": huong_xu_ly,
                    "Loại_2": phan_loai,
                    "Ngày sản xuất_2": ngay_sx,
                })

        # Ghép 2 nhóm theo chỉ số dòng song song
        max_len = max(len(group1), len(group2))
        merged_rows = []
        now = datetime.now().isoformat()

        for i in range(max_len):
            g1 = group1[i] if i < len(group1) else {}
            g2 = group2[i] if i < len(group2) else {}

            row_val = {
                "ID HRC_1": g1.get("ID HRC_1", ""),
                "Hướng Xử lý_1": g1.get("Hướng Xử lý_1", ""),
                "Loại_1": g1.get("Loại_1", ""),
                "Ngày sản xuất_1": g1.get("Ngày sản xuất_1", ""),
                "ID HRC_2": g2.get("ID HRC_2", ""),
                "ID SPM_2": g2.get("ID SPM_2", ""),
                "Hướng Xử lý_2": g2.get("Hướng Xử lý_2", ""),
                "Loại_2": g2.get("Loại_2", ""),
                "Ngày sản xuất_2": g2.get("Ngày sản xuất_2", ""),
            }

            merged_rows.append((
                str(uuid.uuid4()),
                i + 1,
                json.dumps(row_val, ensure_ascii=False, default=str),
                now,
                now,
            ))

        # Lưu vào skin_check_data_rows
        cur.execute("DELETE FROM skin_check_data_rows")
        if merged_rows:
            cur.executemany("""
                INSERT INTO skin_check_data_rows (id, row_number, values_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, merged_rows)

    return {
        "success": True,
        "group1_count": len(group1),
        "group2_count": len(group2),
        "total_rows": len(merged_rows),
        "message": f"Đã tổng hợp {len(group1):,} cuộn chờ Skin chưa có trên SKIN_HRC2 và {len(group2):,} cuộn chờ chạy lại/CL.",
    }

def update_sheet_row(sheet_name: str, row_id: str, values: dict) -> dict:
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    existing = query_one(f"SELECT * FROM {table} WHERE id = ?", (row_id,))
    if not existing:
        raise ValueError(f"Không tìm thấy dòng {row_id}")

    save_sheet_snapshot(sheet_key, "UPDATE_ROW", f"Cập nhật dòng {existing['row_number']} sheet {sheet_key}")

    try:
        cur_vals = json.loads(existing.get("values_json") or "{}")
    except Exception:
        cur_vals = {}

    cur_vals.update(values)
    now = datetime.now().isoformat()

    with get_db() as conn:
        if table == "skin_data_source_rows":
            order_id = str(cur_vals.get("ORDER") or "")
            coil_id = str(cur_vals.get("ID XỬ LÝ") or cur_vals.get("ID GỐC") or "")
            conn.execute("""
                UPDATE skin_data_source_rows
                SET values_json = ?, order_id = ?, coil_id = ?, updated_at = ?
                WHERE id = ?
            """, (json.dumps(cur_vals, ensure_ascii=False, default=str), order_id, coil_id, now, row_id))
        else:
            conn.execute(f"""
                UPDATE {table}
                SET values_json = ?, updated_at = ?
                WHERE id = ?
            """, (json.dumps(cur_vals, ensure_ascii=False, default=str), now, row_id))

    return {
        "id": row_id,
        "row_number": existing["row_number"],
        "values": cur_vals,
        "sheet_name": sheet_name,
    }

def delete_sheet_row(sheet_name: str, row_id: str) -> bool:
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    save_sheet_snapshot(sheet_key, "DELETE_ROW", f"Xóa 1 dòng khỏi sheet {sheet_key}")
    with get_db() as conn:
        cur = conn.execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))
        return cur.rowcount > 0

def clear_sheet(sheet_name: str) -> bool:
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    save_sheet_snapshot(sheet_key, "CLEAR_SHEET", f"Xóa toàn bộ sheet {sheet_key}")
    with get_db() as conn:
        conn.execute(f"DELETE FROM {table}")
        if sheet_key.upper() == "PIVOT_TABLE":
            conn.execute("DELETE FROM skin_pivot_coil_req")
            conn.execute("DELETE FROM skin_pivot_po_req")
            conn.execute("DELETE FROM skin_pivot_priority")
        return True

# ==============================================================================
# TỰ ĐỘNG GÁN PO_NEW CHO PO_SKIN (Item 3)
# ==============================================================================
def auto_link_po_new_in_po_skin() -> dict:
    """
    Ràng buộc PO_SKIN:
    Các PO ở tháng trước có 'Khách hàng' và 'Tên gọi_HSM' trùng với tháng sau
    thì tự động sẽ thêm PO đó vào 'PO_NEW' của tháng trước tại vị trí tương ứng.
    """
    db_rows = query_all("SELECT id, row_number, values_json FROM skin_po_skin_rows ORDER BY row_number ASC")
    if not db_rows:
        return {"success": True, "linked_count": 0}

    parsed_rows = []
    for r in db_rows:
        try:
            v = json.loads(r["values_json"] or "{}")
        except Exception:
            v = {}
        parsed_rows.append({"id": r["id"], "row_number": r["row_number"], "vals": v})

    def get_month_num(m_str):
        if not m_str:
            return None
        m = re.search(r'\b(\d{1,2})\b', str(m_str))
        if m:
            val = int(m.group(1))
            if 1 <= val <= 12:
                return val
        return None

    # Map: (khach_hang_norm, ten_hsm_norm) -> list of (month_num, po_candidate)
    future_po_map = {}
    for item in parsed_rows:
        v = item["vals"]
        kh = str(v.get("Khách hàng") or "").strip().lower()
        ten_hsm = str(v.get("Tên gọi_HSM") or "").strip().lower()
        m_num = get_month_num(v.get("Tháng"))
        po = str(v.get("PO_SPM") or v.get("PO_HSM") or "").strip()
        if kh and ten_hsm and m_num and po:
            key = (kh, ten_hsm)
            if key not in future_po_map:
                future_po_map[key] = []
            future_po_map[key].append((m_num, po))

    linked_count = 0
    updated_rows = []
    now = datetime.now().isoformat()

    for item in parsed_rows:
        v = item["vals"]
        kh = str(v.get("Khách hàng") or "").strip().lower()
        ten_hsm = str(v.get("Tên gọi_HSM") or "").strip().lower()
        m_num = get_month_num(v.get("Tháng"))
        key = (kh, ten_hsm)

        if key in future_po_map and m_num:
            candidates = [p for (m, p) in future_po_map[key] if m > m_num]
            if not candidates and m_num == 12:
                candidates = [p for (m, p) in future_po_map[key] if m == 1]

            if candidates:
                chosen_po = candidates[0]
                if v.get("PO_NEW") != chosen_po:
                    v["PO_NEW"] = chosen_po
                    linked_count += 1
                    updated_rows.append((json.dumps(v, ensure_ascii=False, default=str), now, item["id"]))

    if updated_rows:
        with get_db() as conn:
            conn.executemany("UPDATE skin_po_skin_rows SET values_json = ?, updated_at = ? WHERE id = ?", updated_rows)

    return {
        "success": True,
        "linked_count": linked_count,
        "message": f"Đã tự động gán {linked_count} PO_NEW từ tháng sau vào tháng trước tương ứng!"
    }

# ==============================================================================
# TÍNH TOÁN CÔNG THỨC CHO PO_HSM VÀ PO_SKIN (Item 6)
# ==============================================================================
def recalculate_po_sheet(sheet_name: str) -> dict:
    """
    Tính toán công thức cho sheet PO_HSM hoặc PO_SKIN:
    - Chỉ định đặc biệt: =IF(AND(VALUE(...)>6; VALUE(...)<=12);"Skin 4";IF(VALUE(...)>12;"Không xử lý";""))
    - Min_CW: =LET(x;TRIM([@CW]); ...)
    - KL_Loại 1: =SUMIFS(DATA_SOURCE!$J:$J; DATA_SOURCE!$A:$A; [@PO_HSM]; DATA_SOURCE!$B:$B; "LOAI_1")/1000
    - KL_Chờ SKIN: =SUMIFS(DATA_SOURCE!$J:$J; DATA_SOURCE!$A:$A; [@PO_HSM]; DATA_SOURCE!$E:$E; "SKIN")/1000
    """
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)

    # 1. Tính tổng KL Loại 1 và KL Chờ Skin từ DATA_SOURCE theo ORDER
    ds_rows = query_all("SELECT values_json FROM skin_data_source_rows")
    sum_loai1 = {}
    sum_skin = {}
    for r in ds_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        order = str(v.get("ORDER") or "").strip()
        if not order:
            continue
        cap_cl = str(v.get("TỔNG CẤP CHẤT LƯỢNG") or "").strip().upper()
        huong = str(v.get("HƯỚNG XỬ LÝ") or "").strip().upper()
        try:
            wt = float(str(v.get("KHỐI LƯỢNG TỊNH") or 0).replace(",", "."))
        except Exception:
            wt = 0.0

        if "LOAI_1" in cap_cl or "LOẠI 1" in cap_cl or "LOAI 1" in cap_cl:
            sum_loai1[order] = sum_loai1.get(order, 0.0) + wt
        if huong == "SKIN":
            sum_skin[order] = sum_skin.get(order, 0.0) + wt

    # 2. Đọc và tính toán các dòng trong sheet
    po_rows = query_all(f"SELECT id, values_json FROM {table} ORDER BY row_number ASC")
    if po_rows:
        save_sheet_snapshot(sheet_key, "RECALCULATE", f"Tính lại công thức {sheet_key}")
    updated_records = []
    now = datetime.now().isoformat()

    for r in po_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}

        ten_hsm = str(v.get("Tên gọi_HSM") or "").strip()
        cd = calculate_chi_dinh_dac_biet(ten_hsm)
        if cd or not v.get("Chỉ định đặc biệt"):
            v["Chỉ định đặc biệt"] = cd

        cw = str(v.get("CW") or "").strip()
        min_cw = parse_min_cw(cw)
        v["Min_CW"] = str(int(min_cw)) if min_cw == int(min_cw) else str(min_cw)

        po_hsm = str(v.get("PO_HSM") or "").strip()
        if po_hsm:
            kl_l1 = round(sum_loai1.get(po_hsm, 0.0) / 1000.0, 2)
            v["KL_Loại 1"] = str(kl_l1) if kl_l1 > 0 else "0"
            kl_sk = round(sum_skin.get(po_hsm, 0.0) / 1000.0, 2)
            v["KL_Chờ SKIN"] = str(kl_sk) if kl_sk > 0 else "0"

        updated_records.append((json.dumps(v, ensure_ascii=False, default=str), now, r["id"]))

    if updated_records:
        with get_db() as conn:
            conn.executemany(f"UPDATE {table} SET values_json = ?, updated_at = ? WHERE id = ?", updated_records)

    # Nếu là PO_SKIN, tự động chạy liên kết PO_NEW
    if sheet_key == "PO_SKIN":
        try:
            auto_link_po_new_in_po_skin()
        except Exception:
            pass

    return {
        "success": True,
        "count": len(updated_records),
        "message": f"Đã cập nhật công thức cho {len(updated_records):,} dòng trên sheet {sheet_key}!",
    }

# ==============================================================================
# TÍNH TOÁN TOÀN BỘ CÔNG THỨC CHO SKIN_HRC2 (Item 5)
# ==============================================================================
def recalculate_skin_hrc2() -> dict:
    """
    Tính toán các cột công thức cho sheet SKIN_HRC2:
    - HƯỚNG XỬ LÝ_WEB & Loại: XLOOKUP từ DATA_SOURCE theo ID Cuộn Bó
    - PO Xử lý: =LET(Ord;[@Order]; MapPO;IFERROR(LET(NewPO;XLOOKUP(Ord;PO_SPM[PO_HSM];PO_SPM[PO_NEW];"";0);IF(NewPO<>"";NewPO;XLOOKUP(Ord;PO_SPM[PO_HSM];PO_SPM[PO_SPM];"";0)));""); IF(OR(LEFT(Ord;3)="205";LEFT(Ord;3)="206");Ord;IF(MapPO="";Ord;MapPO)))
    - PO Tháng: =LET(ThangPO;XLOOKUP([@[PO Xử lý]];PO_SPM[PO_SPM];PO_SPM[Tháng];"";0); IF(OR(LEFT([@[PO Xử lý]];3)="205";LEFT([@[PO Xử lý]];3)="206"); IF(ThangPO="";""; IF(ThangPO<DATE(YEAR(TODAY());MONTH(TODAY());1);"Tạo PO tháng "&MONTH(TODAY());ThangPO)); "Chạy"))
    - Material Description_SPM: =XLOOKUP([@[PO Xử lý]];PO_SPM[PO_SPM];PO_SPM[Tên gọi_SPM];"";0)
    - Khách hàng: =XLOOKUP([@[PO Xử lý]];PO_HSM[PO_HSM];PO_HSM[Khách hàng];XLOOKUP([@[PO Xử lý]];PO_SPM[PO_SPM];PO_SPM[Khách hàng];"Không tìm thấy PO";0;-1);0;-1)
    - Check Trùng: =IF(COUNTIF(J:J;[@[ID Cuộn Bó]])>1;"TRUE";"FALSE")
    - Thickness: =VALUE(TEXTAFTER(TEXTBEFORE(LOWER([@[Material Description]]);"x");" ";-1))
    - DVKTKH: =MID(K3;FIND("x";K3)+1;IFERROR(FIND(" ";K3;FIND("x";K3))-FIND("x";K3)-1;LEN(K3)))
    - Chỉ định Skin: =XLOOKUP([@[PO Xử lý]];PO_HSM[PO_HSM];PO_HSM[Chỉ định đặc biệt];XLOOKUP([@[PO Xử lý]];PO_SPM[PO_SPM];PO_SPM[Chỉ định đặc biệt];"Không tìm thấy PO";0;-1);0;-1)
    - Ưu tiên đơn hàng: XLOOKUP priority từ PivotTable
    - Tháng: =MONTH(Ngày sản xuất)
    """
    # 1. Tra cứu DATA_SOURCE
    ds_rows = query_all("SELECT values_json FROM skin_data_source_rows")
    ds_by_coil = {}
    for r in ds_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        huong = str(v.get("HƯỚNG XỬ LÝ") or "").strip()
        loai = str(v.get("TỔNG CẤP CHẤT LƯỢNG") or v.get("PHÂN LOẠI") or v.get("Loại") or "").strip()
        c1 = str(v.get("ID GỐC") or "").strip()
        c2 = str(v.get("ID XỬ LÝ") or "").strip()
        ghc = str(v.get("GHC") if v.get("GHC") is not None else "").strip()
        el = str(v.get("% Elongation") or v.get("Elongation") if (v.get("% Elongation") or v.get("Elongation")) is not None else "").strip()
        if not el and ghc and ghc not in ("", "-", "0"):
            t_row = get_row_thickness(v)
            if t_row > 0:
                el = calculate_elongation(ghc, t_row)

        rec = {"huong": huong, "loai": loai, "ghc": ghc, "elongation": el}
        if c1:
            ds_by_coil[c1] = rec
            ds_by_coil[replace_id(c1)] = rec
        if c2:
            ds_by_coil[c2] = rec
            ds_by_coil[replace_id(c2)] = rec

    # 2. Tra cứu PO_HSM
    po_hsm_rows = query_all("SELECT values_json FROM skin_po_hsm_rows")
    po_hsm_map = {}
    for r in po_hsm_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        po = str(v.get("PO_HSM") or "").strip()
        if po:
            po_hsm_map[po] = {
                "khach_hang": str(v.get("Khách hàng") or "").strip(),
                "chi_dinh": str(v.get("Chỉ định đặc biệt") or "").strip(),
            }

    # 3. Tra cứu PO_SKIN
    po_skin_rows = query_all("SELECT values_json FROM skin_po_skin_rows")
    po_skin_by_hsm = {}
    po_skin_by_spm = {}
    for r in po_skin_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        po_hsm = str(v.get("PO_HSM") or "").strip()
        po_spm = str(v.get("PO_SPM") or "").strip()
        po_new = str(v.get("PO_NEW") or "").strip()
        ten_spm = str(v.get("Tên gọi_SPM") or "").strip()
        kh = str(v.get("Khách hàng") or "").strip()
        cd = str(v.get("Chỉ định đặc biệt") or "").strip()
        thang = str(v.get("Tháng") or "").strip()

        if po_hsm:
            po_skin_by_hsm[po_hsm] = {"po_new": po_new, "po_spm": po_spm}
        if po_spm:
            po_skin_by_spm[po_spm] = {
                "thang": thang,
                "ten_spm": ten_spm,
                "khach_hang": kh,
                "chi_dinh": cd,
            }

    # 4. Đếm số lần xuất hiện ID Cuộn Bó để tính Check Trùng
    hrc2_rows = query_all("SELECT id, values_json FROM skin_hrc2_rows ORDER BY row_number ASC")
    if hrc2_rows:
        save_sheet_snapshot("SKIN_HRC2", "RECALCULATE", "Tính lại công thức SKIN_HRC2")
    coil_counts = Counter()
    for r in hrc2_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        cid = str(v.get("ID Cuộn Bó") or "").strip()
        if cid:
            coil_counts[cid] += 1

    # 4b. Tra cứu PivotTable: Yêu cầu đặc biệt & Ưu tiên đơn hàng
    pivot_coil_req_map = {}
    pivot_po_req_map = {}
    pivot_priority_map = {}
    try:
        for pcr in query_all("SELECT coil_id, requirement FROM skin_pivot_coil_req WHERE coil_id != ''"):
            c_val = str(pcr.get("coil_id") or "").strip()
            if c_val:
                pivot_coil_req_map[c_val] = str(pcr.get("requirement") or "").strip()
                pivot_coil_req_map[replace_id(c_val)] = str(pcr.get("requirement") or "").strip()

        for ppr in query_all("SELECT po, requirement FROM skin_pivot_po_req WHERE po != ''"):
            p_val = clean_po_str(ppr.get("po"))
            if p_val:
                pivot_po_req_map[p_val] = str(ppr.get("requirement") or "").strip()

        for prio_r in query_all("SELECT target_id, priority FROM skin_pivot_priority WHERE target_id != ''"):
            t_val = str(prio_r.get("target_id") or "").strip()
            if t_val:
                pivot_priority_map[t_val] = str(prio_r.get("priority") or "").strip()
                pivot_priority_map[clean_po_str(t_val)] = str(prio_r.get("priority") or "").strip()
    except Exception as e_piv:
        print(f"[Skin] Không thể load PivotTable cache: {e_piv}")

    # 5. Duyệt và tính toán toàn bộ dòng SKIN_HRC2
    cur_month = datetime.now().month
    updated_records = []
    now = datetime.now().isoformat()

    for r in hrc2_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}

        coil_id = str(v.get("ID Cuộn Bó") or "").strip()
        order = str(v.get("Order") or "").strip()
        mat_desc = str(v.get("Material Description") or "").strip()
        ngay_sx = str(v.get("Ngày sản xuất") or "").strip()

        # HƯỚNG XỬ LÝ_WEB & Loại
        src = ds_by_coil.get(coil_id) or ds_by_coil.get(replace_id(coil_id)) or {}
        if src.get("huong"):
            v["HƯỚNG XỬ LÝ_WEB"] = src["huong"]
        if src.get("loai"):
            v["Loại"] = src["loai"]

        # Check Trùng
        if coil_id and coil_counts[coil_id] > 1:
            v["Check Trùng"] = "TRUE"
        else:
            v["Check Trùng"] = "FALSE"

        # Thickness
        thk = parse_thickness_from_desc(mat_desc)
        if thk > 0:
            v["Thickness"] = str(thk)

        # GHC & % Elongation từ DATA_SOURCE theo ID Cuộn Bó
        src = ds_by_coil.get(coil_id) or ds_by_coil.get(replace_id(coil_id)) or {}
        ghc_from_ds = src.get("ghc") or ""
        el_from_ds = src.get("elongation") or ""

        if ghc_from_ds:
            v["GHC"] = ghc_from_ds
        elif not v.get("GHC"):
            v["GHC"] = ""

        if el_from_ds:
            v["% Elongation"] = el_from_ds
        elif v.get("GHC") and v.get("Thickness"):
            v["% Elongation"] = calculate_elongation(v["GHC"], v["Thickness"])
        elif not v.get("% Elongation"):
            v["% Elongation"] = ""

        # DVKTKH
        width_str = parse_width_from_desc(mat_desc)
        if width_str:
            v["DVKTKH"] = width_str

        # Tháng
        m_val = extract_month(ngay_sx)
        if m_val:
            v["Tháng"] = f"Tháng {m_val}"

        # PO Xử lý
        if order.startswith("205") or order.startswith("206"):
            po_xuly = order
        else:
            map_info = po_skin_by_hsm.get(order, {})
            new_po = map_info.get("po_new") or ""
            spm_po = map_info.get("po_spm") or ""
            map_po = new_po if new_po else spm_po
            po_xuly = map_po if map_po else order
        v["PO Xử lý"] = po_xuly

        # PO Tháng
        if po_xuly.startswith("205") or po_xuly.startswith("206"):
            spm_info = po_skin_by_spm.get(po_xuly, {})
            thang_po = spm_info.get("thang", "")
            if not thang_po:
                v["PO Tháng"] = ""
            else:
                m_po = extract_month(thang_po)
                if m_po and m_po < cur_month:
                    v["PO Tháng"] = f"Tạo PO tháng {cur_month}"
                else:
                    v["PO Tháng"] = str(thang_po)
        else:
            v["PO Tháng"] = "Chạy"

        # Material Description_SPM
        v["Material Description_SPM"] = po_skin_by_spm.get(po_xuly, {}).get("ten_spm", "")

        # Khách hàng
        kh_hsm = po_hsm_map.get(po_xuly, {}).get("khach_hang")
        kh_spm = po_skin_by_spm.get(po_xuly, {}).get("khach_hang")
        v["Khách hàng"] = kh_hsm if kh_hsm else (kh_spm if kh_spm else "Không tìm thấy PO")

        # Chỉ định Skin (Ưu tiên: PivotTable theo ID cuộn -> PivotTable theo PO -> PO_HSM / PO_SKIN)
        cd_pivot_coil = pivot_coil_req_map.get(coil_id) or pivot_coil_req_map.get(replace_id(coil_id))
        cd_pivot_po = pivot_po_req_map.get(clean_po_str(po_xuly)) or pivot_po_req_map.get(clean_po_str(order))
        cd_hsm = po_hsm_map.get(po_xuly, {}).get("chi_dinh")
        cd_spm = po_skin_by_spm.get(po_xuly, {}).get("chi_dinh")
        v["Chỉ định Skin"] = cd_pivot_coil if cd_pivot_coil else (cd_pivot_po if cd_pivot_po else (cd_hsm if cd_hsm else (cd_spm if cd_spm else "")))

        # Ưu tiên đơn hàng (Tra cứu PivotTable theo PO xử lý, ID cuộn hoặc Order)
        prio = (
            pivot_priority_map.get(clean_po_str(po_xuly))
            or pivot_priority_map.get(coil_id)
            or pivot_priority_map.get(clean_po_str(order))
            or ""
        )
        if prio:
            v["Ưu tiên đơn hàng"] = prio

        updated_records.append((json.dumps(v, ensure_ascii=False, default=str), now, r["id"]))

    if updated_records:
        with get_db() as conn:
            conn.executemany("UPDATE skin_hrc2_rows SET values_json = ?, updated_at = ? WHERE id = ?", updated_records)

    return {
        "success": True,
        "count": len(updated_records),
        "message": f"Đã tính toán thành công công thức cho toàn bộ {len(updated_records):,} dòng của sheet SKIN_HRC2!",
    }

# ==============================================================================
# XUẤT DỮ LIỆU GET DATA THEO LOGIC SCRIPT (Item 4)
# ==============================================================================
def generate_get_data_rows(selected_plans: list[str] | None = None) -> dict:
    """
    Sinh dữ liệu cho sheet 'Get Data' theo logic Office Script:
    1. Lấy dữ liệu từ DATA_MES (Line, Plan, ID HRC, Comment, PO, Thickness, Width, Weight, Grade)
    2. Lọc theo selected_plans (nếu có)
    3. Sắp xếp theo Plan tăng dần, Width giảm dần
    4. Tính STT (bắt đầu từ 1, tăng khi plan đổi hoặc |width - prev_width| >= 15)
    5. Tra cứu DATA_SOURCE cho 'Ngày sản xuất' và 'Tống hợp lỗi' (huongXuLy || ghiChu - đã bỏ phần lỗi lệch)
    6. Tra cứu PO_HSM / PO_SKIN:
       - PO 202, 204, 105: tra cứu PO_HSM lấy Mục đích sử dụng, CW, Min_CW
       - PO 205, 206: tra cứu PO_SKIN (PO_SPM) lấy Mục đích sử dụng, CW, Min_CW
    7. Tính 'Giới hạn cắt (nếu có)':
       - Min_CW == 0: 'Không yêu cầu'
       - Ngược lại: denominator = Thickness * Width * 7.85 / 1000
         cut = max(0, (Weight - Min_CW * 1000) / denominator - 30)
         cutLimit = f"Cắt Max {cut:.2f} m (Nếu có lỗi)"
    8. Ghi vào skin_get_data_rows và lưu snapshot hoàn tác.
    """
    mes_db_rows = query_all("SELECT values_json FROM skin_data_mes_rows ORDER BY row_number ASC")
    if not mes_db_rows:
        raise ValueError("Sheet DATA_MES hiện chưa có dữ liệu để xử lý.")

    selected_set = set(str(p).strip() for p in (selected_plans or []) if str(p).strip())
    mes_rows = []
    for r in mes_db_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        plan = str(v.get("Plan") or "").strip()
        if not plan:
            continue
        if selected_set and plan not in selected_set:
            continue

        try: thk = float(str(v.get("Thickness") or 0).replace(",", "."))
        except Exception: thk = 0.0
        try: w = float(str(v.get("Width") or 0).replace(",", "."))
        except Exception: w = 0.0
        try: wt = float(str(v.get("Weight") or 0).replace(",", "."))
        except Exception: wt = 0.0

        mes_rows.append({
            "line": str(v.get("Line") or "").strip(),
            "plan": plan,
            "id": str(v.get("ID HRC") or "").strip(),
            "comment": str(v.get("Comment") or "").strip(),
            "po": str(v.get("PO") or "").strip(),
            "thickness": thk,
            "width": w,
            "weight": wt,
            "grade": str(v.get("Grade") or "").strip(),
        })

    if not mes_rows:
        raise ValueError("Không tìm thấy dòng nào phù hợp trong DATA_MES theo các Plan đã chọn.")

    # Sắp xếp: Plan tăng dần, Width giảm dần
    def plan_sort_key(item):
        p = item["plan"]
        try:
            return (0, float(p), -item["width"])
        except Exception:
            return (1, p, -item["width"])

    mes_rows.sort(key=plan_sort_key)

    # Tính STT
    processed_rows = []
    prev_plan = ""
    prev_group_width = 0.0
    prev_stt = 0

    for i, row in enumerate(mes_rows):
        new_plan = (i == 0 or row["plan"] != prev_plan)
        new_group = new_plan or (abs(row["width"] - prev_group_width) >= 15.0)

        if new_plan:
            stt = 1
        elif new_group:
            stt = prev_stt + 1
        else:
            stt = prev_stt

        group_width = row["width"] if new_group else prev_group_width

        processed_rows.append({
            **row,
            "stt": stt
        })
        prev_plan = row["plan"]
        prev_group_width = group_width
        prev_stt = stt

    # Tra cứu DATA_SOURCE
    ds_db_rows = query_all("SELECT values_json FROM skin_data_source_rows")
    source_map = {}
    for r in ds_db_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        c1 = str(v.get("ID GỐC") or "").strip()
        c2 = str(v.get("ID XỬ LÝ") or "").strip()
        record = {
            "huongXuLy": str(v.get("HƯỚNG XỬ LÝ") or "").strip(),
            "loiLechTDC": str(v.get("LỖI LỆCH TDC") or "").strip(),
            "ngaySanXuat": str(v.get("NGÀY SẢN XUẤT") or "").strip(),
            "ghiChu": str(v.get("Ghi Chú") or "").strip(),
            "ghc": str(v.get("GHC") if v.get("GHC") is not None else "").strip(),
            "elongation": str(v.get("Elongation") or v.get("% Elongation") or "").strip(),
        }
        if c1:
            source_map[c1] = record
            source_map[replace_id(c1)] = record
        if c2:
            source_map[c2] = record
            source_map[replace_id(c2)] = record

    # Tra cứu PO_HSM
    po_hsm_db = query_all("SELECT values_json FROM skin_po_hsm_rows")
    po_hsm_md_map = {}
    po_hsm_cw_map = {}
    po_hsm_min_cw_map = {}
    for r in po_hsm_db:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        po = str(v.get("PO_HSM") or "").strip()
        if po:
            po_clean = clean_po_str(po)
            md_val = str(v.get("Mục đích sử dụng") or "").strip()
            cw_val = str(v.get("CW") or "").strip()
            po_hsm_md_map[po] = md_val
            po_hsm_md_map[po_clean] = md_val
            po_hsm_cw_map[po] = cw_val
            po_hsm_cw_map[po_clean] = cw_val
            try:
                min_v = float(str(v.get("Min_CW") or 0).replace(",", "."))
            except Exception:
                min_v = parse_min_cw(v.get("CW"))
            po_hsm_min_cw_map[po] = min_v
            po_hsm_min_cw_map[po_clean] = min_v

    # Tra cứu PO_SKIN
    po_skin_db = query_all("SELECT values_json FROM skin_po_skin_rows")
    po_spm_md_map = {}
    po_spm_cw_map = {}
    po_spm_min_cw_map = {}
    for r in po_skin_db:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        po = str(v.get("PO_SPM") or v.get("PO_HSM") or "").strip()
        if po:
            po_clean = clean_po_str(po)
            md_val = str(v.get("Mục đích sử dụng") or "").strip()
            cw_val = str(v.get("CW") or "").strip()
            po_spm_md_map[po] = md_val
            po_spm_md_map[po_clean] = md_val
            po_spm_cw_map[po] = cw_val
            po_spm_cw_map[po_clean] = cw_val
            try:
                min_v = float(str(v.get("Min_CW") or 0).replace(",", "."))
            except Exception:
                min_v = parse_min_cw(v.get("CW"))
            po_spm_min_cw_map[po] = min_v
            po_spm_min_cw_map[po_clean] = min_v

    # Tra cứu Nhu cầu tổng hợp (Demand Index: by_po_hsm, by_po_spm)
    by_po_hsm, by_po_spm = build_demand_lookup_index()

    # Tra cứu GET_DATA_PO (bảng PO mở rộng)
    get_data_po_db = query_all("SELECT values_json FROM skin_get_data_po_rows")
    get_data_po_map = {}
    for r in get_data_po_db:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        po_raw = str(v.get("PO") or "").strip()
        if po_raw:
            po_c = clean_po_str(po_raw)
            get_data_po_map[po_raw] = v
            get_data_po_map[po_c] = v

    # Coil lookup fallback từ skin_hrc2_rows để tìm PO khi PO trong MES bị lệch
    hrc2_po_map = {}
    try:
        hrc2_db = query_all("SELECT values_json FROM skin_hrc2_rows")
        for r in hrc2_db:
            try:
                v = json.loads(r.get("values_json") or "{}")
            except Exception:
                v = {}
            cid = str(v.get("Mã cuộn") or "").strip()
            po_xl = str(v.get("PO Xử lý") or v.get("Order") or "").strip()
            if cid and po_xl:
                hrc2_po_map[cid] = po_xl
                hrc2_po_map[replace_id(cid)] = po_xl
    except Exception:
        pass

    # Tra cứu PivotTable: Yêu cầu đặc biệt
    pivot_coil_req_map = {}
    pivot_po_req_map = {}
    try:
        for pcr in query_all("SELECT coil_id, requirement FROM skin_pivot_coil_req WHERE coil_id != ''"):
            c_val = str(pcr.get("coil_id") or "").strip()
            if c_val:
                pivot_coil_req_map[c_val] = str(pcr.get("requirement") or "").strip()
                pivot_coil_req_map[replace_id(c_val)] = str(pcr.get("requirement") or "").strip()

        for ppr in query_all("SELECT po, requirement FROM skin_pivot_po_req WHERE po != ''"):
            p_val = clean_po_str(ppr.get("po"))
            if p_val:
                pivot_po_req_map[p_val] = str(ppr.get("requirement") or "").strip()
    except Exception as e_piv:
        print(f"[GetData] Không thể load PivotTable cache: {e_piv}")

    # Tra cứu HÀNG VỚT
    hang_vot_db = query_all("SELECT values_json FROM skin_hang_vot_rows")
    hang_vot_map = {}
    for r in hang_vot_db:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        cid = str(v.get("ID COIL") or v.get("ID Cuộn") or v.get("ID") or "").strip()
        if cid:
            hv_rec = {
                "nm_de_xuat": str(v.get("NM ĐỀ XUẤT") or "").strip(),
                "dvktkh_qlcl": str(v.get("DVKTKH & QLCL") or v.get("P.DVKTKH & P.QLCL") or "").strip(),
            }
            hang_vot_map[cid] = hv_rec
            hang_vot_map[replace_id(cid)] = hv_rec

    # Sinh các dòng Get Data
    output_rows = []
    now = datetime.now().isoformat()

    for row in processed_rows:
        coil_id = row["id"]
        coil_id2 = replace_id(coil_id)
        po = row["po"]
        prefix = po[:3]

        src = source_map.get(coil_id) or source_map.get(coil_id2) or {}
        prod_date = src.get("ngaySanXuat", "")
        # Tổng hợp lỗi: Đã bỏ phần lỗi lệch (loiLechTDC), chỉ giữ Hướng xử lý và Ghi chú
        error_parts = [src.get("huongXuLy"), src.get("ghiChu")]
        tong_hop_loi = " || ".join(p for p in error_parts if p)

        # Tra cứu Yêu cầu đặc biệt từ PivotTable (theo ID cuộn hoặc theo PO)
        ycdb = (
            pivot_coil_req_map.get(coil_id)
            or pivot_coil_req_map.get(coil_id2)
            or pivot_po_req_map.get(clean_po_str(po))
            or ""
        )

        # Tra cứu Hàng Vớt
        hv = hang_vot_map.get(coil_id) or hang_vot_map.get(coil_id2) or {}
        nm_de_xuat = hv.get("nm_de_xuat", "")
        dvktkh_qlcl = hv.get("dvktkh_qlcl", "")

        # Tra cứu GHC và % Elongation từ DATA_SOURCE với điều kiện PO = 20600 (hoặc bắt đầu bằng 20600)
        po_str = str(po).strip()
        if po_str.startswith("20600") or po_str == "20600":
            ghc_val = src.get("ghc", "")
            el_val = src.get("elongation", "")
        else:
            ghc_val = ""
            el_val = ""

        po_clean = clean_po_str(po)
        fallback_po = hrc2_po_map.get(coil_id) or hrc2_po_map.get(coil_id2) or ""
        fallback_po_clean = clean_po_str(fallback_po) if fallback_po else ""

        # Multi-source lookup cho Mục đích sử dụng:
        md = (
            po_hsm_md_map.get(po)
            or po_hsm_md_map.get(po_clean)
            or po_spm_md_map.get(po)
            or po_spm_md_map.get(po_clean)
            or by_po_hsm.get(po, {}).get("Mục đích sử dụng")
            or by_po_hsm.get(po_clean, {}).get("Mục đích sử dụng")
            or by_po_spm.get(po, {}).get("Mục đích sử dụng")
            or by_po_spm.get(po_clean, {}).get("Mục đích sử dụng")
            or get_data_po_map.get(po, {}).get("Mục đích sử dụng")
            or get_data_po_map.get(po_clean, {}).get("Mục đích sử dụng")
            or (po_hsm_md_map.get(fallback_po) if fallback_po else "")
            or (po_hsm_md_map.get(fallback_po_clean) if fallback_po_clean else "")
            or (po_spm_md_map.get(fallback_po) if fallback_po else "")
            or (po_spm_md_map.get(fallback_po_clean) if fallback_po_clean else "")
            or ""
        )

        # Multi-source lookup cho CW (Khối lượng yêu cầu):
        cw = (
            po_hsm_cw_map.get(po)
            or po_hsm_cw_map.get(po_clean)
            or po_spm_cw_map.get(po)
            or po_spm_cw_map.get(po_clean)
            or by_po_hsm.get(po, {}).get("CW")
            or by_po_hsm.get(po_clean, {}).get("CW")
            or by_po_spm.get(po, {}).get("CW")
            or by_po_spm.get(po_clean, {}).get("CW")
            or get_data_po_map.get(po, {}).get("CW")
            or get_data_po_map.get(po_clean, {}).get("CW")
            or (po_hsm_cw_map.get(fallback_po) if fallback_po else "")
            or (po_hsm_cw_map.get(fallback_po_clean) if fallback_po_clean else "")
            or (po_spm_cw_map.get(fallback_po) if fallback_po else "")
            or (po_spm_cw_map.get(fallback_po_clean) if fallback_po_clean else "")
            or ""
        )

        # Min CW:
        min_cw = (
            po_hsm_min_cw_map.get(po)
            or po_hsm_min_cw_map.get(po_clean)
            or po_spm_min_cw_map.get(po)
            or po_spm_min_cw_map.get(po_clean)
            or parse_min_cw(cw)
        )

        if min_cw <= 0:
            cut_limit = "Không yêu cầu"
        else:
            denom = row["thickness"] * row["width"] * 7.85 / 1000.0
            if denom > 0:
                cut_val = max(0.0, (row["weight"] - min_cw * 1000.0) / denom - 30.0)
                cut_limit = f"Cắt Max {cut_val:.2f} m (Nếu có lỗi)"
            else:
                cut_limit = "Không yêu cầu"

        row_dict = {
            "Line": row["line"],
            "Yêu cầu đặt biệt": ycdb,
            "STT": row["stt"],
            "Plan ID": row["plan"],
            "ID Coil": coil_id,
            "GHC": ghc_val,
            "% Elongation": el_val,
            "Tên gọi": row["comment"],
            "PO": po,
            "Thickness": round(float(row["thickness"]), 2) if row["thickness"] is not None else "",
            "Width": round(float(row["width"]), 2) if row["width"] is not None else "",
            "Weight": row["weight"],
            "Steel grade": row["grade"],
            "Ngày sản xuất": prod_date,
            "Mục đích sử dụng": md,
            "CW": cw,
            "Giới hạn cắt (nếu có)": cut_limit,
            "NM ĐỀ XUẤT": nm_de_xuat,
            "P.DVKTKH & P.QLCL": dvktkh_qlcl,
            "Tống hợp lỗi": tong_hop_loi,
        }

        output_rows.append((
            str(uuid.uuid4()),
            len(output_rows) + 1,
            json.dumps(row_dict, ensure_ascii=False, default=str),
            now,
            now,
        ))

    save_sheet_snapshot("GET_DATA", "GENERATE", f"Xuất {len(output_rows):,} dòng Get Data từ DATA_MES")

    with get_db() as conn:
        conn.execute("DELETE FROM skin_get_data_rows")
        if output_rows:
            conn.executemany("""
                INSERT INTO skin_get_data_rows (id, row_number, values_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, output_rows)

    return {
        "success": True,
        "count": len(output_rows),
        "message": f"Đã xuất thành công {len(output_rows):,} dòng dữ liệu vào sheet Get Data theo logic script!",
    }

def export_get_data_excel() -> bytes:
    """
    Xuất dữ liệu sheet Get Data ra file Excel chuẩn format number và date dd/mm/yyyy.
    Các cột số (STT, GHC, % Elongation, Thickness, Width, Weight...) được lưu đúng kiểu Number trong Excel,
    không bị lưu dưới dạng Text (không có tam giác xanh cảnh báo text number).
    """
    rows = query_all("SELECT row_number, values_json FROM skin_get_data_rows ORDER BY row_number ASC")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Get Data"

    ws.append(GET_DATA_COLUMNS)

    header_fill = openpyxl.styles.PatternFill(start_color="107C41", end_color="107C41", fill_type="solid")
    header_font = openpyxl.styles.Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    for col_num in range(1, len(GET_DATA_COLUMNS) + 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = openpyxl.styles.Alignment(horizontal="center", vertical="center")

    # Bản đồ định dạng số cho các cột dữ liệu định lượng
    NUMBER_FORMATS = {
        "STT": ("int", "0"),
        "GHC": ("float_3", "0.000"),
        "% Elongation": ("float_1", "0.0"),
        "Thickness": ("float_2", "0.00"),
        "Width": ("float_2", "0.00"),
        "Weight": ("float_0", "#,##0"),
    }

    for r_idx, r in enumerate(rows, start=2):
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}

        # Bỏ phần lỗi lệch khỏi Tống hợp lỗi nếu còn sót
        thl = str(v.get("Tống hợp lỗi") or "").strip()
        if " || " in thl:
            parts = [p.strip() for p in thl.split(" || ")]
            if len(parts) == 3 and any(k in parts[1] for k in ["Lệch", ":C", "TDC"]):
                v["Tống hợp lỗi"] = " || ".join([p for p in [parts[0], parts[2]] if p])
            elif len(parts) == 2 and any(k in parts[1] for k in ["(Lệch", ":C"]):
                v["Tống hợp lỗi"] = parts[0]

        for c_idx, col_name in enumerate(GET_DATA_COLUMNS, start=1):
            val = v.get(col_name)
            cell = ws.cell(row=r_idx, column=c_idx)

            if val is None or str(val).strip() in ("", "-", "—", "None"):
                cell.value = str(val) if val in ("-", "—") else ""
                cell.alignment = openpyxl.styles.Alignment(horizontal="center", vertical="center")
                continue

            # 1. Cột dạng ngày: Ngày sản xuất
            if col_name == "Ngày sản xuất":
                dt_obj = None
                s_date = str(val).strip()
                for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
                    try:
                        dt_obj = datetime.strptime(s_date, fmt).date()
                        break
                    except ValueError:
                        pass
                if dt_obj:
                    cell.value = dt_obj
                    cell.number_format = "dd/mm/yyyy"
                else:
                    cell.value = s_date
                cell.alignment = openpyxl.styles.Alignment(horizontal="center", vertical="center")
                continue

            # 2. Cột dạng số: STT, GHC, % Elongation, Thickness, Width, Weight
            if col_name in NUMBER_FORMATS:
                num_type, num_fmt = NUMBER_FORMATS[col_name]
                s_val = str(val).strip().replace(",", ".")
                try:
                    if num_type == "int":
                        num_val = int(round(float(s_val)))
                    elif num_type == "float_2":
                        num_val = round(float(s_val), 2)
                    elif num_type == "float_1":
                        num_val = round(float(s_val), 1)
                    elif num_type == "float_0":
                        num_val = round(float(s_val), 0)
                    else:
                        num_val = round(float(s_val), 3)
                    cell.value = num_val
                    cell.number_format = num_fmt
                    cell.alignment = openpyxl.styles.Alignment(horizontal="right", vertical="center")
                    continue
                except (ValueError, TypeError):
                    pass

            # 3. Cột CW (nếu là số đơn thì lưu dạng số, nếu là dải '18-22' thì lưu dạng text)
            if col_name == "CW":
                s_cw = str(val).strip().replace(",", ".")
                try:
                    num_cw = float(s_cw)
                    cell.value = num_cw
                    cell.number_format = "#,##0.0"
                    cell.alignment = openpyxl.styles.Alignment(horizontal="right", vertical="center")
                    continue
                except (ValueError, TypeError):
                    pass

            # 4. Các cột định danh & văn bản (giữ nguyên chuỗi để không mất số 0 đầu)
            cell.value = str(val)
            if col_name in ("ID Coil", "Plan ID", "PO", "Line", "Steel grade"):
                cell.alignment = openpyxl.styles.Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = openpyxl.styles.Alignment(horizontal="left", vertical="center")

    # Tự động canh độ rộng cột cho đẹp mắt, không bị hiện ###
    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            val_str = str(cell.value or "")
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(min(max_len + 3, 50), 12)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def import_data_source_from_excel(buffer: bytes, original_name: str) -> dict:
    """Import directly from uploaded Excel file into DATA_SOURCE with SKIN filter"""
    wb = openpyxl.load_workbook(BytesIO(buffer), data_only=True)
    all_rows = []
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        raw_rows = list(ws.iter_rows(values_only=True))
        if len(raw_rows) < 2:
            continue
        header = [str(c).strip() if c is not None else f"col_{j}" for j, c in enumerate(raw_rows[0])]
        for row_idx, r in enumerate(raw_rows[1:], start=2):
            if r and any(c is not None and str(c).strip() != "" for c in r):
                row_dict = {}
                for j, cell_val in enumerate(r):
                    col_name = header[j] if j < len(header) else f"col_{j}"
                    row_dict[col_name] = cell_val

                # Filter SKIN & SKIN_CUST
                huong_xu_ly = str(find_val(row_dict, ["HƯỚNG XỬ LÝ", "HƯỚNG XỬ LÝ_WEB", "Huong xu ly"]) or "").strip().upper()
                if huong_xu_ly not in ("SKIN", "SKIN_CUST"):
                    continue

                mapped = {col: find_val(row_dict, [col]) for col in DATA_SOURCE_COLUMNS}
                mapped["HƯỚNG XỬ LÝ"] = huong_xu_ly
                all_rows.append(mapped)

    wb.close()
    if not all_rows:
        raise ValueError("Không tìm thấy dòng nào có HƯỚNG XỬ LÝ là SKIN hoặc SKIN_CUST trong file Excel.")

    now_iso = datetime.now().isoformat()
    rows_to_insert = []
    for i, item in enumerate(all_rows, start=1):
        order_id = str(item.get("ORDER") or "")
        coil_id = str(item.get("ID XỬ LÝ") or item.get("ID GỐC") or "")
        month_val = str(extract_month(item.get("NGÀY SẢN XUẤT")) or "")
        rows_to_insert.append((
            str(uuid.uuid4()),
            i,
            order_id,
            coil_id,
            month_val,
            json.dumps(item, ensure_ascii=False, default=str),
            now_iso,
            now_iso,
        ))

    with get_db() as conn:
        conn.execute("DELETE FROM skin_data_source_rows")
        conn.executemany("""
            INSERT INTO skin_data_source_rows (id, row_number, order_id, coil_id, month, values_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, rows_to_insert)

    return {
        "success": True,
        "rows_imported": len(rows_to_insert),
        "message": f"Đã nạp thành công {len(rows_to_insert):,} dòng SKIN & SKIN_CUST từ file '{original_name}'."
    }

# ==============================================================================
# SHEET 1: GET_DATA_PO (Thu thập dữ liệu PO Skin & PO HSM theo công thức)
# ==============================================================================
def clean_po_str(val: any) -> str:
    s = str(val or "").strip()
    s = s.replace("(Lấy tồn kho)", "").replace("Lấy tồn kho", "")
    s = s.replace(" ", "").replace("\xa0", "").replace("'", "")
    if s.endswith(".0"):
        s = s[:-2]
    return s

def transform_ten_goi_spm(ten_hsm: str) -> str:
    s = str(ten_hsm or "").strip()
    if s.startswith("Thép cuộn cán nóng"):
        return "Thép HRC HSPM" + s[len("Thép cuộn cán nóng"):]
    elif s.startswith("Thép HRC"):
        return "Thép HRC HSPM" + s[len("Thép HRC"):]
    return s

def ensure_nc_data_seeded():
    """Tự động nạp dữ liệu từ THEO DÕI ĐƠN HÀNG NM.HRC2.xlsx vào nc_rows nếu bảng trống"""
    from config.db import query_one, get_db
    from config.settings import APP_DIR, BASE_DIR, UPLOADS_DIR
    import uuid
    import openpyxl

    cnt_row = query_one("SELECT count(*) as cnt FROM nc_rows")
    if cnt_row and cnt_row.get("cnt", 0) > 0:
        return

    candidates = [
        BASE_DIR.parent / "Frontend" / "THEO DÕI ĐƠN HÀNG NM.HRC2.xlsx",
        APP_DIR / "THEO DÕI ĐƠN HÀNG NM.HRC2.xlsx",
        BASE_DIR / "THEO DÕI ĐƠN HÀNG NM.HRC2.xlsx",
        UPLOADS_DIR / "THEO DÕI ĐƠN HÀNG NM.HRC2.xlsx",
        Path.home() / "Downloads" / "THEO DÕI ĐƠN HÀNG NM.HRC2.xlsx",
        Path(r"D:\OneDrive - hoaphat.com.vn\Theo dõi đơn hàng\THEO DÕI ĐƠN HÀNG NM.HRC2.xlsx"),
        Path(r"D:\OneDrive - hoaphat.com.vn\Documents\Theo dõi đơn hàng\THEO DÕI ĐƠN HÀNG NM.HRC2.xlsx"),
        Path(r"D:\OneDrive - hoaphat.com.vn\NM.HRC2\THEO DÕI ĐƠN HÀNG NM.HRC2.xlsx"),
    ]
    target_file = None
    for p in candidates:
        if p.exists() and p.stat().st_size > 0:
            target_file = p
            break

    if not target_file:
        return

    try:
        wb = openpyxl.load_workbook(target_file, read_only=True, data_only=True)
        if "Nhu cầu đơn hàng HRC" not in wb.sheetnames:
            wb.close()
            return
        ws = wb["Nhu cầu đơn hàng HRC"]
        rows_iter = ws.iter_rows(values_only=True)
        raw_header = next(rows_iter, None)
        if not raw_header:
            wb.close()
            return
        header = [str(h).strip() if h is not None else f"col_{idx}" for idx, h in enumerate(raw_header)]

        all_insert = []
        now_iso = datetime.now().isoformat()
        target_id = "7adf6dc6c603752d3ddd162e"

        for row_idx, row in enumerate(rows_iter, start=2):
            if not row or not any(c is not None and str(c).strip() != "" for c in row):
                continue
            clean_dict = {}
            for col_idx, cell_val in enumerate(row):
                col_name = header[col_idx] if col_idx < len(header) else f"col_{col_idx}"
                clean_dict[col_name] = cell_val

            all_insert.append((
                str(uuid.uuid4()),
                target_id,
                "Nhu cầu đơn hàng HRC",
                row_idx,
                str(clean_dict.get("PO") or "").strip(),
                json.dumps(clean_dict, ensure_ascii=False, default=str),
                now_iso
            ))
        wb.close()

        if all_insert:
            with get_db() as conn:
                conn.execute("DELETE FROM nc_rows WHERE sheet_name = 'Nhu cầu đơn hàng HRC'")
                conn.executemany("""
                    INSERT INTO nc_rows (id, report_id, sheet_name, row_number, order_id, values_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, all_insert)
            print(f"[SkinService] Đã tự động nạp {len(all_insert)} dòng Nhu cầu đơn hàng HRC từ {target_file.name}")
    except Exception as e:
        print(f"[SkinService] Lỗi tự động nạp nc_rows: {e}")

def build_demand_lookup_index() -> tuple[dict, dict]:
    """
    Tạo index tra cứu PO từ:
    1. Table nc_rows (Nhu cầu đơn hàng HRC)
    2. Table skin_po_skin_rows & skin_po_hsm_rows
    3. Dự phòng từ skin_hrc2_rows & qcrows
    Trả về: (by_po_hsm, by_po_spm)
    """
    ensure_nc_data_seeded()

    by_po_hsm = {}
    by_po_spm = {}

    # 1. Tra cứu từ nc_rows (file Nhu cầu đơn hàng HRC)
    nc_data = query_all("SELECT values_json FROM nc_rows")
    for r in nc_data:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        thang = str(find_val(v, ["Tháng", "Tháng ", "THÁNG", "col_1", "Thang"]) or "").strip()
        dot = str(find_val(v, ["Đợt", "đợt", "ĐỢT", "col_2", "Dot"]) or "").strip()
        kh = str(find_val(v, ["Khách hàng", "KHÁCH HÀNG", "col_3", "Khach hang"]) or "").strip()
        cw = str(find_val(v, ["CW", "col_5"]) or "").strip()

        p1 = clean_po_str(find_val(v, ["PO", "PO_HSM", "PO HSM", "col_6"]))
        p2 = clean_po_str(find_val(v, ["xx", "PO_SPM", "PO SPM", "PO Xử lý", "col_7"]))

        ten_hsm = str(find_val(v, ["Tên gọi_HSM", "Tên gọi", "col_11", "Tên sản phẩm"]) or "").strip()
        kh_l1 = str(find_val(v, ["KH_Loại 1", "KL_1D", "col_18", "col_19"]) or "").strip()
        muc_dich = str(find_val(v, ["Mục đích sử dụng", "Cột5", "Cột3", "col_30", "col_34"]) or "").strip()

        po_hsm = ""
        po_spm = ""
        if p1.startswith("206"):
            po_spm = p1
            po_hsm = p2
        elif p2.startswith("206"):
            po_spm = p2
            po_hsm = p1
        elif p1.startswith("204"):
            po_hsm = p1
            po_spm = p2
        else:
            po_hsm = p1
            po_spm = p2

        rec = {
            "Tháng": thang,
            "Đợt": dot,
            "Khách hàng": kh,
            "CW": cw,
            "PO_HSM": po_hsm,
            "PO_SPM": po_spm,
            "Tên gọi_HSM": ten_hsm,
            "Tên gọi_SPM": transform_ten_goi_spm(ten_hsm),
            "KH_Loại 1": kh_l1,
            "Mục đích sử dụng": muc_dich,
        }

        if po_hsm:
            by_po_hsm[po_hsm] = rec
        if po_spm:
            by_po_spm[po_spm] = rec
        if p1:
            by_po_hsm[p1] = rec
            if p1.startswith("206"):
                by_po_spm[p1] = rec
        if p2:
            by_po_hsm[p2] = rec
            if p2.startswith("206"):
                by_po_spm[p2] = rec

    # 2. Bổ sung từ skin_po_skin_rows
    skin_data = query_all("SELECT values_json FROM skin_po_skin_rows")
    for r in skin_data:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        p_hsm = clean_po_str(v.get("PO_HSM"))
        p_spm = clean_po_str(v.get("PO_SPM"))
        p_new = clean_po_str(v.get("PO_NEW"))
        ten_hsm = str(v.get("Tên gọi_HSM") or "").strip()
        ten_spm = str(v.get("Tên gọi_SPM") or "").strip() or transform_ten_goi_spm(ten_hsm)
        rec = {
            "Tháng": str(v.get("Tháng") or "").strip(),
            "Đợt": str(v.get("Đợt") or "").strip(),
            "Khách hàng": str(v.get("Khách hàng") or "").strip(),
            "CW": str(v.get("CW") or "").strip(),
            "PO_HSM": p_hsm,
            "PO_SPM": p_spm or p_new,
            "Tên gọi_HSM": ten_hsm,
            "Tên gọi_SPM": ten_spm,
            "KH_Loại 1": str(v.get("KH_Loại 1") or "").strip(),
            "Mục đích sử dụng": str(v.get("Mục đích sử dụng") or "").strip(),
        }
        if p_hsm and p_hsm not in by_po_hsm:
            by_po_hsm[p_hsm] = rec
        if p_spm and p_spm not in by_po_spm:
            by_po_spm[p_spm] = rec
        if p_new and p_new not in by_po_spm:
            by_po_spm[p_new] = rec

    # 3. Bổ sung từ skin_po_hsm_rows
    hsm_data = query_all("SELECT values_json FROM skin_po_hsm_rows")
    for r in hsm_data:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        p_hsm = clean_po_str(v.get("PO_HSM"))
        ten_hsm = str(v.get("Tên gọi_HSM") or "").strip()
        rec = {
            "Tháng": str(v.get("Tháng") or "").strip(),
            "Đợt": str(v.get("Đợt") or "").strip(),
            "Khách hàng": str(v.get("Khách hàng") or "").strip(),
            "CW": str(v.get("CW") or "").strip(),
            "PO_HSM": p_hsm,
            "PO_SPM": "",
            "Tên gọi_HSM": ten_hsm,
            "Tên gọi_SPM": transform_ten_goi_spm(ten_hsm),
            "KH_Loại 1": str(v.get("KH_Loại 1") or "").strip(),
            "Mục đích sử dụng": str(v.get("Mục đích sử dụng") or "").strip(),
        }
        if p_hsm and p_hsm not in by_po_hsm:
            by_po_hsm[p_hsm] = rec

    # 4. Bổ sung dự phòng từ skin_hrc2_rows
    try:
        hrc2_sample = query_all("SELECT values_json FROM skin_hrc2_rows")
        for r in hrc2_sample:
            try:
                v = json.loads(r.get("values_json") or "{}")
            except Exception:
                continue
            p_xl = clean_po_str(v.get("PO Xử lý") or v.get("Order"))
            if p_xl and p_xl not in by_po_hsm and p_xl not in by_po_spm:
                mat = str(v.get("Material Description") or "").strip()
                kh = str(v.get("Khách hàng") or "").strip()
                if kh == "Không tìm thấy PO": kh = ""
                by_po_hsm[p_xl] = {
                    "Tháng": str(v.get("Tháng") or "").strip(),
                    "Đợt": "",
                    "Khách hàng": kh,
                    "CW": "",
                    "PO_HSM": p_xl,
                    "PO_SPM": "",
                    "Tên gọi_HSM": mat,
                    "Tên gọi_SPM": transform_ten_goi_spm(mat),
                    "KH_Loại 1": "",
                    "Mục đích sử dụng": str(v.get("Mục đích sử dụng") or "").strip(),
                }
    except Exception:
        pass

    return by_po_hsm, by_po_spm

def collect_get_data_po(po_list: list[str], po_type: str = "skin", clear_first: bool = False) -> dict:
    """
    Thu thập và tra cứu dữ liệu cho danh sách PO:
    - po_type: "skin" (Điền PO Skin vào đây) hoặc "hsm" (Điền PO HSM vào đây)
    - Tra cứu theo logic Excel VSTACK(CHOOSECOLS(src, 7), CHOOSECOLS(src, 8))
    - Tự động thay thế tiền tố Tên gọi_SPM theo đúng công thức
    """
    if not po_list:
        raise ValueError("Chưa có danh sách PO nào để thu thập.")

    by_po_hsm, by_po_spm = build_demand_lookup_index()
    now_iso = datetime.now().isoformat()
    is_skin = (str(po_type).lower().strip() in ("skin", "po_skin", "po skin"))

    save_sheet_snapshot("GET_DATA_PO", "COLLECT_PO", f"Thu thập dữ liệu cho {len(po_list)} PO ({'PO Skin' if is_skin else 'PO HSM'})")

    with get_db() as conn:
        cur = conn.cursor()
        if clear_first:
            cur.execute("DELETE FROM skin_get_data_po_rows")
            start_row_num = 1
        else:
            max_row = cur.execute("SELECT MAX(row_number) as m FROM skin_get_data_po_rows").fetchone()
            start_row_num = ((max_row[0] or 0) + 1) if max_row and max_row[0] is not None else 1

        rows_to_insert = []
        found_count = 0

        for idx, raw_po in enumerate(po_list):
            po_clean = clean_po_str(raw_po)
            if not po_clean:
                continue

            if is_skin:
                matched = by_po_spm.get(po_clean) or by_po_hsm.get(po_clean)
            else:
                matched = by_po_hsm.get(po_clean) or by_po_spm.get(po_clean)

            if matched:
                found_count += 1
                row_val = {
                    "PO": po_clean,
                    "Tháng": matched.get("Tháng", ""),
                    "Đợt": matched.get("Đợt", ""),
                    "Khách hàng": matched.get("Khách hàng", ""),
                    "PO_HSM": matched.get("PO_HSM", "") or (po_clean if not is_skin else ""),
                    "PO_SPM": matched.get("PO_SPM", "") or (po_clean if is_skin else ""),
                    "Tên gọi_HSM": matched.get("Tên gọi_HSM", ""),
                    "Tên gọi_SPM": matched.get("Tên gọi_SPM", "") if is_skin else (matched.get("Tên gọi_SPM", "") or ""),
                    "CW": matched.get("CW", ""),
                    "KH_Loại 1": matched.get("KH_Loại 1", ""),
                    "Mục đích sử dụng": matched.get("Mục đích sử dụng", ""),
                }
            else:
                row_val = {
                    "PO": po_clean,
                    "Tháng": "",
                    "Đợt": "",
                    "Khách hàng": "Không tìm thấy PO",
                    "PO_HSM": po_clean if not is_skin else "",
                    "PO_SPM": po_clean if is_skin else "",
                    "Tên gọi_HSM": "",
                    "Tên gọi_SPM": "",
                    "CW": "",
                    "KH_Loại 1": "",
                    "Mục đích sử dụng": "",
                }

            rows_to_insert.append((
                str(uuid.uuid4()),
                start_row_num + len(rows_to_insert),
                json.dumps(row_val, ensure_ascii=False, default=str),
                now_iso,
                now_iso,
            ))

        if rows_to_insert:
            cur.executemany("""
                INSERT INTO skin_get_data_po_rows (id, row_number, values_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, rows_to_insert)

    return {
        "success": True,
        "total_requested": len(po_list),
        "total_inserted": len(rows_to_insert),
        "found_count": found_count,
        "message": f"Đã thu thập thành công {len(rows_to_insert):,} PO (Tìm thấy {found_count:,} PO có dữ liệu nhu cầu đơn hàng)!"
    }

def recalculate_get_data_po() -> dict:
    """Truy xuất cập nhật lại toàn bộ dữ liệu cho các PO hiện có trong sheet Get_data_PO"""
    existing_rows = query_all("SELECT id, values_json FROM skin_get_data_po_rows ORDER BY row_number ASC")
    if not existing_rows:
        return {"success": True, "count": 0, "message": "Sheet Get_data_PO hiện chưa có dòng nào."}

    by_po_hsm, by_po_spm = build_demand_lookup_index()
    updated_records = []
    now_iso = datetime.now().isoformat()
    updated_count = 0

    for r in existing_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        po_clean = clean_po_str(v.get("PO"))
        if not po_clean:
            continue

        matched = by_po_spm.get(po_clean) or by_po_hsm.get(po_clean)
        if matched:
            v.update({
                "PO": po_clean,
                "Tháng": matched.get("Tháng", ""),
                "Đợt": matched.get("Đợt", ""),
                "Khách hàng": matched.get("Khách hàng", ""),
                "PO_HSM": matched.get("PO_HSM", ""),
                "PO_SPM": matched.get("PO_SPM", ""),
                "Tên gọi_HSM": matched.get("Tên gọi_HSM", ""),
                "Tên gọi_SPM": matched.get("Tên gọi_SPM", ""),
                "CW": matched.get("CW", ""),
                "KH_Loại 1": matched.get("KH_Loại 1", ""),
                "Mục đích sử dụng": matched.get("Mục đích sử dụng", ""),
            })
            updated_count += 1
            updated_records.append((json.dumps(v, ensure_ascii=False, default=str), now_iso, r["id"]))
        else:
            if not v.get("Khách hàng") or v.get("Khách hàng") == "":
                v["Khách hàng"] = "Không tìm thấy PO"
                updated_records.append((json.dumps(v, ensure_ascii=False, default=str), now_iso, r["id"]))

    if updated_records:
        with get_db() as conn:
            conn.executemany("UPDATE skin_get_data_po_rows SET values_json = ?, updated_at = ? WHERE id = ?", updated_records)

    return {
        "success": True,
        "count": updated_count,
        "message": f"Đã cập nhật lại thông tin cho {updated_count:,} dòng trong Get_data_PO!"
    }

def sync_all_demand_to_get_data_po(clear_first: bool = True) -> dict:
    """Nạp toàn bộ danh sách PO từ bảng Nhu cầu đơn hàng HRC vào sheet Get_data_PO"""
    ensure_nc_data_seeded()
    rows = query_all("SELECT values_json FROM nc_rows ORDER BY row_number ASC")
    if not rows:
        return {"success": False, "message": "Không tìm thấy dữ liệu trong bảng Nhu cầu đơn hàng HRC."}

    seen = set()
    ordered_pos = []
    for r in rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        p1 = clean_po_str(v.get("PO") or v.get("PO_HSM") or v.get("PO Xử lý"))
        p2 = clean_po_str(v.get("xx") or v.get("PO_SPM"))
        if p1 and p1 not in seen:
            seen.add(p1)
            ordered_pos.append(p1)
        if p2 and p2 not in seen:
            seen.add(p2)
            ordered_pos.append(p2)

    res = collect_get_data_po(ordered_pos, po_type="skin", clear_first=clear_first)
    res["message"] = f"Đã nạp thành công {res.get('total_inserted', 0):,} PO từ file Nhu cầu đơn hàng HRC (Khớp dữ liệu {res.get('found_count', 0):,} PO)!"
    return res


# ==============================================================================
# SHEET 2: PIVOT_TABLE (Quản lý 3 bảng Yêu cầu đặc biệt & Ưu tiên sản xuất)
# ==============================================================================
def get_pivot_data() -> dict:
    """Lấy dữ liệu cả 3 bảng của PivotTable"""
    coil_reqs = query_all("SELECT id, coil_id, requirement, updated_at FROM skin_pivot_coil_req ORDER BY updated_at DESC")
    po_reqs = query_all("SELECT id, po, requirement, updated_at FROM skin_pivot_po_req ORDER BY updated_at DESC")
    priorities = query_all("SELECT id, target_id, priority, updated_at FROM skin_pivot_priority ORDER BY updated_at DESC")

    return {
        "success": True,
        "coil_reqs": coil_reqs,
        "po_reqs": po_reqs,
        "priorities": priorities,
    }

def save_pivot_block(block_type: str, items: list[dict], clear_first: bool = False) -> dict:
    """
    Lưu dữ liệu dán vào từng khối của PivotTable:
    - block_type: 'coil' (ID Cuộn + Yêu cầu đặc biệt)
                  'po' (PO + Yêu cầu đặc biệt)
                  'priority' (PO/ID cuộn + Ưu tiên sản xuất)
    - items: list of dicts
    """
    if not items:
        raise ValueError("Chưa có dữ liệu nào để lưu.")

    now_iso = datetime.now().isoformat()
    inserted_count = 0

    save_sheet_snapshot("PIVOT_TABLE", f"PASTE_{block_type.upper()}", f"Dán {len(items)} dòng vào bảng {block_type}")

    with get_db() as conn:
        cur = conn.cursor()

        if block_type == "coil":
            if clear_first:
                cur.execute("DELETE FROM skin_pivot_coil_req")
            to_insert = []
            for it in items:
                cid = str(it.get("coil_id") or it.get("ID Cuộn") or it.get("ID Cuộn (Yêu cầu)") or it.get("id") or "").strip()
                req = str(it.get("requirement") or it.get("Yêu cầu đặc biệt") or it.get("Yêu cầu đặc biệt (Cuộn)") or "").strip()
                if cid:
                    to_insert.append((str(uuid.uuid4()), cid, req, now_iso))
            if to_insert:
                cur.executemany("INSERT INTO skin_pivot_coil_req (id, coil_id, requirement, updated_at) VALUES (?, ?, ?, ?)", to_insert)
                inserted_count = len(to_insert)

        elif block_type == "po":
            if clear_first:
                cur.execute("DELETE FROM skin_pivot_po_req")
            to_insert = []
            for it in items:
                po_val = clean_po_str(it.get("po") or it.get("PO") or it.get("PO (Yêu cầu)"))
                req = str(it.get("requirement") or it.get("Yêu cầu đặc biệt") or it.get("Yêu cầu đặc biệt (PO)") or "").strip()
                if po_val:
                    to_insert.append((str(uuid.uuid4()), po_val, req, now_iso))
            if to_insert:
                cur.executemany("INSERT INTO skin_pivot_po_req (id, po, requirement, updated_at) VALUES (?, ?, ?, ?)", to_insert)
                inserted_count = len(to_insert)

        elif block_type == "priority":
            if clear_first:
                cur.execute("DELETE FROM skin_pivot_priority")
            to_insert = []
            for it in items:
                tgt = str(it.get("target_id") or it.get("PO/ID cuộn") or it.get("PO/ID cuộn (Ưu tiên)") or it.get("PO") or "").strip()
                prio = str(it.get("priority") or it.get("Ưu tiên sản xuất") or it.get("Ưu tiên") or "").strip()
                if tgt:
                    to_insert.append((str(uuid.uuid4()), tgt, prio, now_iso))
            if to_insert:
                cur.executemany("INSERT INTO skin_pivot_priority (id, target_id, priority, updated_at) VALUES (?, ?, ?, ?)", to_insert)
                inserted_count = len(to_insert)

        # Đồng bộ vào skin_pivot_table_rows để xem dạng bảng tổng hợp
        sync_pivot_sheet_rows(cur)

    # Tự động tính toán lại công thức SKIN_HRC2 để nhận diện ngay Chỉ định Skin & Ưu tiên đơn hàng
    try:
        recalculate_skin_hrc2()
    except Exception as re_e:
        print(f"[Skin] Lỗi tính lại SKIN_HRC2 sau khi update PivotTable: {re_e}")

    return {
        "success": True,
        "block_type": block_type,
        "count": inserted_count,
        "message": f"Đã lưu thành công {inserted_count:,} dòng vào bảng {block_type} và đồng bộ với SKIN_HRC2!"
    }

def sync_pivot_sheet_rows(cur):
    """Đồng bộ 3 bảng nhỏ vào bảng skin_pivot_table_rows để hiển thị dạng bảng tính 6 cột"""
    coils = cur.execute("SELECT coil_id, requirement FROM skin_pivot_coil_req ORDER BY updated_at DESC").fetchall()
    pos = cur.execute("SELECT po, requirement FROM skin_pivot_po_req ORDER BY updated_at DESC").fetchall()
    prios = cur.execute("SELECT target_id, priority FROM skin_pivot_priority ORDER BY updated_at DESC").fetchall()

    max_len = max(len(coils), len(pos), len(prios), 0)
    cur.execute("DELETE FROM skin_pivot_table_rows")
    if max_len == 0:
        return

    now_iso = datetime.now().isoformat()
    rows_to_insert = []
    for idx in range(max_len):
        c_item = coils[idx] if idx < len(coils) else ("", "")
        p_item = pos[idx] if idx < len(pos) else ("", "")
        pr_item = prios[idx] if idx < len(prios) else ("", "")

        row_val = {
            "ID Cuộn (Yêu cầu)": c_item[0],
            "Yêu cầu đặc biệt (Cuộn)": c_item[1],
            "PO (Yêu cầu)": p_item[0],
            "Yêu cầu đặc biệt (PO)": p_item[1],
            "PO/ID cuộn (Ưu tiên)": pr_item[0],
            "Ưu tiên sản xuất": pr_item[1],
        }
        rows_to_insert.append((
            str(uuid.uuid4()),
            idx + 1,
            json.dumps(row_val, ensure_ascii=False, default=str),
            now_iso,
            now_iso,
        ))

    cur.executemany("""
        INSERT INTO skin_pivot_table_rows (id, row_number, values_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    """, rows_to_insert)


# ==============================================================================
# SHEET 3: HANG_VOT (Tự động lọc dữ liệu COUNTA(r) > 0 từ Xác nhận chuyển loại)
# ==============================================================================
def _get_data_source_and_mes_maps() -> tuple[dict, dict]:
    import sqlite3
    ds_map = {}
    mes_map = {}
    try:
        with get_db() as conn:
            conn.row_factory = sqlite3.Row
            ds_rows = conn.execute("SELECT coil_id, values_json FROM skin_data_source_rows").fetchall()
            for r in ds_rows:
                cid = str(r["coil_id"] or "").strip()
                if not cid:
                    continue
                try:
                    v = json.loads(r["values_json"] or "{}")
                except Exception:
                    v = {}
                cl = v.get("TỔNG CẤP CHẤT LƯỢNG") or v.get("Loại") or v.get("PHÂN LOẠI") or ""
                hxl = v.get("HƯỚNG XỬ LÝ") or ""
                nsx = v.get("NGÀY SẢN XUẤT") or ""
                ds_map[cid] = {
                    "chat_luong": cl,
                    "huong_xu_ly": hxl,
                    "ngay_sx": nsx,
                }

            mes_rows = conn.execute("SELECT values_json FROM skin_data_mes_rows").fetchall()
            for r in mes_rows:
                try:
                    v = json.loads(r["values_json"] or "{}")
                except Exception:
                    v = {}
                cid = str(v.get("ID Cuộn Bó") or v.get("ID Cuộn") or v.get("ID") or "").strip()
                if cid:
                    mes_map[cid] = v.get("Kế hoạch") or ""
    except Exception as e_map:
        print(f"[HangVot] Lỗi nạp cache DATA_SOURCE/DATA_MES: {e_map}")
    return ds_map, mes_map

def import_hang_vot_rows(rows_data: list[dict], clear_first: bool = False) -> dict:
    """
    Dán / Nạp dữ liệu vào sheet Hàng Vớt.
    Chỉ lấy đúng 5 cột tương ứng từ cột A đến E:
    1. ID COIL (Cột A)
    2. HƯỚNG XỬ LÝ (Cột B)
    3. LỖI LỆCH TDC (Cột C)
    4. NM ĐỀ XUẤT (Cột D)
    5. DVKTKH & QLCL (Cột E)
    Tự động lọc bỏ các dòng trống: FILTER(Data; BYROW(Data; LAMBDA(r; COUNTA(r)>0)))
    """
    if not rows_data:
        raise ValueError("Chưa có dữ liệu nào để thêm.")

    now_iso = datetime.now().isoformat()
    valid_rows = []

    for r in rows_data:
        id_coil = str(find_val(r, ["ID COIL", "ID Cuộn", "ID CUỘN", "ID", "Mã cuộn", "col_0", "col_1"]) or "").strip()
        huong_xu_ly = str(find_val(r, ["HƯỚNG XỬ LÝ", "Hướng xử lý", "HƯỚNG XỬ LÝ_WEB", "col_1"]) or "").strip()
        loi_lech_tdc = str(find_val(r, ["LỖI LỆCH TDC", "Lỗi lệch TDC", "Lỗi lệch", "LỖI LỆCH", "col_2"]) or "").strip()
        nm_de_xuat = str(find_val(r, ["NM ĐỀ XUẤT", "NM đề xuất", "col_3"]) or "").strip()
        dvktkh_qlcl = str(find_val(r, ["DVKTKH & QLCL", "DVKTKH", "QLCL", "P.DVKTKH", "col_4"]) or "").strip()

        if not id_coil:
            vals = list(r.values())
            if len(vals) >= 1: id_coil = str(vals[0] or "").strip()
            if len(vals) >= 2: huong_xu_ly = str(vals[1] or "").strip()
            if len(vals) >= 3: loi_lech_tdc = str(vals[2] or "").strip()
            if len(vals) >= 4: nm_de_xuat = str(vals[3] or "").strip()
            if len(vals) >= 5: dvktkh_qlcl = str(vals[4] or "").strip()

        if not id_coil or id_coil.upper() in ("ID COIL", "ID CUỘN", "STT"):
            continue

        valid_rows.append({
            "ID COIL": id_coil,
            "HƯỚNG XỬ LÝ": huong_xu_ly,
            "LỖI LỆCH TDC": loi_lech_tdc,
            "NM ĐỀ XUẤT": nm_de_xuat,
            "DVKTKH & QLCL": dvktkh_qlcl,
        })

    if not valid_rows:
        raise ValueError("Tất cả các dòng dữ liệu đều trống hoặc không có ID COIL hợp lệ.")

    save_sheet_snapshot("HANG_VOT", "IMPORT_ROWS", f"Nạp {len(valid_rows)} dòng vào sheet Hàng Vớt")

    with get_db() as conn:
        cur = conn.cursor()
        if clear_first:
            cur.execute("DELETE FROM skin_hang_vot_rows")
            start_row_num = 1
        else:
            max_row = cur.execute("SELECT MAX(row_number) as m FROM skin_hang_vot_rows").fetchone()
            start_row_num = ((max_row[0] or 0) + 1) if max_row and max_row[0] is not None else 1

        to_insert = []
        for idx, vr in enumerate(valid_rows):
            to_insert.append((
                str(uuid.uuid4()),
                start_row_num + idx,
                json.dumps(vr, ensure_ascii=False, default=str),
                now_iso,
                now_iso,
            ))

        cur.executemany("""
            INSERT INTO skin_hang_vot_rows (id, row_number, values_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        """, to_insert)

    return {
        "success": True,
        "count": len(to_insert),
        "message": f"Đã nạp thành công {len(to_insert):,} dòng dữ liệu Hàng Vớt (Cột A-E)!"
    }


def import_hang_vot_excel(buffer: bytes | None = None, original_name: str = "", file_path: Path | str | None = None) -> dict:
    """
    Đọc file Excel 'Xác nhận chuyển loại XCTT_NM.HRC2.xlsx',
    lấy đúng sheet 'TỔNG HỢP ID SKIN',
    trích xuất đúng 5 cột tương ứng từ cột A đến E:
    1. ID COIL (Cột A)
    2. HƯỚNG XỬ LÝ (Cột B)
    3. LỖI LỆCH TDC (Cột C)
    4. NM ĐỀ XUẤT (Cột D)
    5. DVKTKH & QLCL (Cột E)
    Lọc bỏ dòng trống: COUNTA(r[:5]) > 0.
    """
    from config.settings import UPLOADS_DIR
    if buffer:
        try:
            saved_cache_path = UPLOADS_DIR / "Xac_nhan_chuyen_loai_XCTT_NM.HRC2.xlsx"
            saved_cache_path.write_bytes(buffer)
        except Exception as e_save:
            print(f"[HangVot] Không thể lưu file cache: {e_save}")
        excel_src = BytesIO(buffer)
    elif file_path:
        excel_src = str(file_path)
    else:
        raise ValueError("Không có dữ liệu file để đọc.")

    wb = openpyxl.load_workbook(excel_src, read_only=True, data_only=True)
    target_sheet = None

    # Tìm sheet 'TỔNG HỢP ID SKIN'
    for name in wb.sheetnames:
        norm = name.strip().upper()
        if "TỔNG HỢP ID SKIN" in norm or "TONG HOP ID SKIN" in norm or "ID SKIN" in norm:
            target_sheet = wb[name]
            break

    if not target_sheet:
        target_sheet = wb.active

    formatted_rows = []
    for idx, r in enumerate(target_sheet.iter_rows(values_only=True)):
        if not r or not any(c is not None and str(c).strip() != "" for c in r[:5]):
            continue
        first_cell = str(r[0] or "").strip()
        if not first_cell or first_cell.upper() in ("ID COIL", "ID CUỘN", "STT"):
            continue

        formatted_rows.append({
            "ID COIL": first_cell,
            "HƯỚNG XỬ LÝ": str(r[1] or "").strip() if len(r) > 1 and r[1] is not None else "",
            "LỖI LỆCH TDC": str(r[2] or "").strip() if len(r) > 2 and r[2] is not None else "",
            "NM ĐỀ XUẤT": str(r[3] or "").strip() if len(r) > 3 and r[3] is not None else "",
            "DVKTKH & QLCL": str(r[4] or "").strip() if len(r) > 4 and r[4] is not None else "",
        })

    wb.close()

    if not formatted_rows:
        raise ValueError("Không tìm thấy dòng dữ liệu ID COIL nào hợp lệ trong sheet TỔNG HỢP ID SKIN.")

    return import_hang_vot_rows(formatted_rows, clear_first=True)


HANG_VOT_SHAREPOINT_URL = "https://hoaphatcomvn-my.sharepoint.com/:x:/g/personal/nguyenvanthuc5_hoaphat_com_vn/IQDPX3Im9eftR4SWQZ2Ztyg3Ae4j-SCH9wqr9kjOEnd-2Sk"
HANG_VOT_SHAREPOINT_FORMULA = "=LET(Data; 'https://hoaphatcomvn-my.sharepoint.com/:x:/g/personal/nguyenvanthuc5_hoaphat_com_vn/IQDPX3Im9eftR4SWQZ2Ztyg3Ae4j-SCH9wqr9kjOEnd-2Sk'!$A$1:$E$10000; FILTER(Data; BYROW(Data;LAMBDA(r;COUNTA(r)>0))))"


def sync_hang_vot_data(custom_path: str | None = None) -> dict:
    """
    Chạy nút bấm để tự động lấy dữ liệu cho sheet Hàng Vớt:
    1. Ưu tiên tải trực tiếp file mới nhất từ link SharePoint qua Playwright:
       https://hoaphatcomvn-my.sharepoint.com/:x:/g/personal/nguyenvanthuc5_hoaphat_com_vn/IQDPX3Im9eftR4SWQZ2Ztyg3Ae4j-SCH9wqr9kjOEnd-2Sk?download=1
    2. Nếu không có mạng hoặc tải không thành công, tìm file cache cục bộ hoặc file tại custom_path.
    3. Đọc dữ liệu từ sheet 'TỔNG HỢP ID SKIN' từ cột A-E và nạp vào sheet Hàng Vớt.
    """
    from config.settings import UPLOADS_DIR, APP_DIR, BASE_DIR
    import os

    if custom_path:
        custom_path_str = str(custom_path).strip().strip('"').strip("'")
        if custom_path_str:
            set_skin_setting("hang_vot_source_path", custom_path_str)

    target_file = UPLOADS_DIR / "Xac_nhan_chuyen_loai_XCTT_NM.HRC2.xlsx"

    # 1. Thử tải trực tiếp file mới nhất từ link SharePoint
    download_success = False
    try:
        from playwright.sync_api import sync_playwright
        download_url = f"{HANG_VOT_SHAREPOINT_URL}?download=1"
        with sync_playwright() as p:
            launch_kwargs = {"headless": True, "timeout": 30000}
            try:
                browser = p.chromium.launch(**{**launch_kwargs, "channel": "msedge"})
            except Exception:
                try:
                    browser = p.chromium.launch(**{**launch_kwargs, "channel": "chrome"})
                except Exception:
                    browser = p.chromium.launch(**launch_kwargs)

            context = browser.new_context(accept_downloads=True)
            page = context.new_page()
            with page.expect_download(timeout=30000) as download_info:
                try:
                    page.goto(download_url)
                except Exception:
                    pass
            dl = download_info.value
            UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
            dl.save_as(str(target_file))
            browser.close()
            if target_file.exists() and target_file.stat().st_size > 0:
                download_success = True
    except Exception as e_dl:
        print(f"[HangVot] Tải trực tiếp SharePoint không thành công ({e_dl}), tìm file trên máy...")

    # 2. Nếu không tải trực tiếp được, tìm các vị trí file cục bộ
    found_file = None
    if target_file.exists() and target_file.stat().st_size > 0:
        found_file = target_file
    else:
        saved_path_str = get_skin_setting("hang_vot_source_path", "")
        candidates = []
        if saved_path_str:
            candidates.append(Path(saved_path_str))

        user_home = Path.home()
        candidates.extend([
            user_home / "Downloads" / "Xác nhận chuyển loại XCTT_NM.HRC2.xlsx",
            Path(r"D:\OneDrive - hoaphat.com.vn\NM.HRC2\Xác nhận chuyển loại XCTT_NM.HRC2.xlsx"),
            Path(r"D:\OneDrive - hoaphat.com.vn\Documents\NM.HRC2\Xác nhận chuyển loại XCTT_NM.HRC2.xlsx"),
            Path(r"D:\OneDrive - hoaphat.com.vn\Xác nhận chuyển loại XCTT_NM.HRC2.xlsx"),
            Path(r"E:\Xác nhận chuyển loại XCTT_NM.HRC2.xlsx"),
            BASE_DIR / "uploads" / "Xac_nhan_chuyen_loai_XCTT_NM.HRC2.xlsx",
        ])

        for p in candidates:
            try:
                if p and p.exists() and p.is_file() and p.stat().st_size > 0:
                    found_file = p
                    break
            except Exception:
                continue

    if not found_file:
        return {
            "success": False,
            "need_file": True,
            "sharepoint_url": HANG_VOT_SHAREPOINT_URL,
            "formula": HANG_VOT_SHAREPOINT_FORMULA,
            "message": "Chưa tìm thấy file 'Xác nhận chuyển loại XCTT_NM.HRC2.xlsx'. Bạn có thể mở link SharePoint để tải về hoặc chọn file nạp vào hệ thống."
        }

    res = import_hang_vot_excel(file_path=found_file, original_name=found_file.name)
    set_skin_setting("hang_vot_source_path", str(found_file))

    src_label = "SharePoint trực tiếp" if download_success else f"file '{found_file.name}'"
    return {
        "success": True,
        "count": res.get("count", 0),
        "file_name": found_file.name,
        "file_path": str(found_file),
        "message": f"Đã lấy thành công {res.get('count', 0):,} dòng Hàng Vớt (cột A-E) từ {src_label}!"
    }

def get_skin_stats() -> dict:
    stats = {}
    for key, info in SHEET_REGISTRY.items():
        tbl = info["table"]
        try:
            c = query_one(f"SELECT count(*) as cnt FROM {tbl}")
            stats[f"{key.lower()}_count"] = c["cnt"] if c else 0
        except Exception:
            stats[f"{key.lower()}_count"] = 0

    # Month distribution in DATA_SOURCE
    months_dist = query_all("""
        SELECT month, count(*) as count 
        FROM skin_data_source_rows 
        WHERE month != '' 
        GROUP BY month 
        ORDER BY cast(month as integer) ASC
    """)

    stats["months_distribution"] = months_dist
    stats["current_month"] = datetime.now().month
    stats["prev_month"] = 12 if datetime.now().month == 1 else datetime.now().month - 1
    return stats

# ==============================================================================
# LẤY GIỚI HẠN CHẢY (GHC / YieldPoint) TỪ DASHBOARD QC
# ==============================================================================
def scrape_yield_point_batches(coil_ids: list[str], batch_size: int = 300) -> dict[str, float]:
    """
    Kết nối website Dashboard QC (https://quality.hoaphatdungquat.vn/qlcl) qua Playwright:
    1. Đăng nhập 1 lần duy nhất bằng QC_USERNAME & QC_PASSWORD.
    2. Dùng context.request (APIRequestContext) gửi trực tiếp form HTTP POST đến trang /qlcl.
       Không cần render DOM hay tải tài nguyên giao diện, tối ưu băng thông & CPU,
       không làm ảnh hưởng hay nghẽn server web QC.
    3. Trích xuất TABLE_DATA['YieldPoint'] -> DetailCounts -> giá trị số GHC.
    """
    from playwright.sync_api import sync_playwright
    from config.settings import QC_SITE_URL, QC_USERNAME, QC_PASSWORD, CHROMIUM_PATH

    if not QC_USERNAME or not QC_PASSWORD:
        raise ValueError("Chưa cấu hình tài khoản QC (QC_USERNAME, QC_PASSWORD) trong hệ thống.")

    unique_coils = list(dict.fromkeys(str(cid).strip() for cid in coil_ids if str(cid).strip()))
    if not unique_coils:
        return {}

    yield_point_results: dict[str, float] = {}

    with sync_playwright() as p:
        launch_kwargs = {"headless": True, "timeout": 60000}
        if CHROMIUM_PATH and Path(CHROMIUM_PATH).exists():
            launch_kwargs["executable_path"] = CHROMIUM_PATH
        try:
            browser = p.chromium.launch(**launch_kwargs)
        except Exception as e_launch:
            # Fallback to system Microsoft Edge (preinstalled on Windows 10/11) or Chrome
            try:
                browser = p.chromium.launch(**{**launch_kwargs, "channel": "msedge"})
            except Exception:
                try:
                    browser = p.chromium.launch(**{**launch_kwargs, "channel": "chrome"})
                except Exception:
                    raise e_launch
        try:
            context = browser.new_context(ignore_https_errors=True)
            page = context.new_page()
            page.set_default_timeout(60000)
            page.goto(QC_SITE_URL, wait_until="domcontentloaded", timeout=60000)

            # Đăng nhập
            u_sel = 'input[autocomplete="username"], input[type="email"], input[name*="user" i], input[id*="user" i], input[type="text"]'
            p_sel = 'input[type="password"]'
            b_sel = 'button[type="submit"], input[type="submit"], button:has-text("Đăng nhập")'

            u_input = page.locator(u_sel).first
            p_input = page.locator(p_sel).first
            u_input.fill(QC_USERNAME)
            p_input.fill(QC_PASSWORD)
            page.locator(b_sel).first.click()
            page.wait_for_timeout(2500)

            # Gửi từng batch qua context.request (HTTP POST thuần túy)
            api_req = context.request
            for i in range(0, len(unique_coils), batch_size):
                batch = unique_coils[i:i + batch_size]
                coils_str = ", ".join(batch)
                try:
                    resp = api_req.post(
                        QC_SITE_URL,
                        form={
                            'factory': 'ALL',
                            'grade': 'ALL',
                            'Ca': 'ALL',
                            'start_date': '',
                            'end_date': '',
                            'coil_ids': coils_str,
                            'order_ids': ''
                        },
                        timeout=45000
                    )
                    if resp.status == 200:
                        html = resp.text()
                        match = re.search(r'TABLE_DATA\[["\']YieldPoint["\']\]\s*=\s*(\[.*?\]);', html, re.DOTALL)
                        batch_found = set()
                        if match:
                            try:
                                yp_list = json.loads(match.group(1))
                                for item in yp_list:
                                    coil = str(item.get("Cuộn") or item.get("ID") or item.get("CoilID") or "").strip()
                                    counts = item.get("DetailCounts") or {}
                                    val = None
                                    for prop in ["YieldPoint", "GHC", "GH Chảy", "Value"]:
                                        if item.get(prop) is not None:
                                            try:
                                                val = round(float(str(item.get(prop)).replace(',', '.')), 3)
                                                break
                                            except (ValueError, TypeError):
                                                pass
                                    if val is None and isinstance(counts, dict):
                                        for v in counts.values():
                                            if isinstance(v, (int, float)):
                                                val = round(float(v), 3)
                                                break
                                            elif str(v).replace('.', '', 1).replace('-', '', 1).isdigit():
                                                val = round(float(v), 3)
                                                break
                                    if coil and val is not None:
                                        yield_point_results[coil] = val
                                        batch_found.add(coil)
                                        rep_c = replace_id(coil)
                                        if rep_c:
                                            yield_point_results[rep_c] = val
                                            batch_found.add(rep_c)
                            except Exception as pe:
                                print(f"[GHC Scrape] Lỗi parse JSON: {pe}")

                        # Cuộn nào web không có YieldPoint thì gán -1.0 để cache lại, tránh quét lặp vô ích
                        for b_coil in batch:
                            if b_coil not in batch_found:
                                yield_point_results[b_coil] = -1.0
                except Exception as be:
                    print(f"[GHC Scrape] Lỗi batch {i // batch_size + 1}: {be}")
        finally:
            browser.close()

    return yield_point_results

def fetch_and_update_ghc_for_data_source(row_ids: list[str] | None = None, only_missing: bool = True) -> dict:
    """
    Cập nhật cột GHC (Giới hạn chảy) cho sheet DATA_SOURCE:
    1. Lọc các dòng cần lấy (toàn bộ hoặc theo row_ids đã tick chọn).
    2. Hỗ trợ đa dạng mã cuộn (ID GỐC, ID XỬ LÝ, replace_id) giải quyết triệt để lỗi không lấy được giá trị.
    3. Ưu tiên tra cứu từ cache SQLite skin_coil_ghc_cache (tiết kiệm 100% tài nguyên).
    4. Chỉ những cuộn chưa có trong cache mới gọi web QC theo từng batch.
    5. Lưu kết quả mới vào cache và cập nhật vào skin_data_source_rows.
    6. Tự động lưu snapshot để có thể Hoàn tác (Undo).
    """
    # 1. Lấy danh sách dòng cần cập nhật
    if row_ids:
        placeholders = ",".join(["?"] * len(row_ids))
        target_rows = query_all(
            f"SELECT id, values_json FROM skin_data_source_rows WHERE id IN ({placeholders}) ORDER BY row_number ASC",
            tuple(row_ids)
        )
    else:
        target_rows = query_all("SELECT id, values_json FROM skin_data_source_rows ORDER BY row_number ASC")

    if not target_rows:
        return {"success": True, "updated_count": 0, "message": "Không có dòng nào trong DATA_SOURCE để lấy GHC."}

    # 2. Lấy toàn bộ cache GHC hiện có
    cache_rows = query_all("SELECT coil_id, ghc_value FROM skin_coil_ghc_cache")
    ghc_cache = {r["coil_id"]: r["ghc_value"] for r in cache_rows if r.get("coil_id")}

    # 3. Lọc các dòng theo only_missing và gom các candidate mã cuộn
    rows_to_process = []
    coils_to_scrape_set = set()
    resolved_from_cache = {}

    for r in target_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}

        current_ghc = str(v.get("GHC") or "").strip()
        # Nếu only_missing=True: chỉ xử lý dòng chưa có GHC hoặc đang là "-", "-1.0", "-1"
        if only_missing and current_ghc and current_ghc not in ("-", "-1.0", "-1"):
            continue

        c_goc = str(v.get("ID GỐC") or "").strip()
        c_xl = str(v.get("ID XỬ LÝ") or "").strip()
        candidates = [c for c in [c_goc, c_xl, replace_id(c_goc), replace_id(c_xl)] if c]
        if not candidates:
            continue

        val = resolve_ghc_from_candidates(candidates, ghc_cache)
        if val is not None and val > 0:
            resolved_from_cache[r["id"]] = val
            rows_to_process.append((r["id"], v, candidates))
        else:
            rows_to_process.append((r["id"], v, candidates))
            target_to_scrape = next((c for c in [c_goc, replace_id(c_goc), replace_id(c_xl), c_xl] if c), None)
            if target_to_scrape:
                coils_to_scrape_set.add(target_to_scrape)

    if not rows_to_process:
        return {
            "success": True,
            "updated_count": 0,
            "message": "Tất cả các dòng được chọn đều đã có giá trị GHC đầy đủ."
        }

    web_hits = 0
    web_results = {}
    coils_to_scrape = list(coils_to_scrape_set)

    # 4. Quét web QC cho các cuộn chưa có GHC > 0 trong cache
    if coils_to_scrape:
        web_results = scrape_yield_point_batches(coils_to_scrape, batch_size=300)
        web_hits = sum(1 for v in web_results.values() if v > 0)
        now_str = datetime.now().isoformat()

        # Lưu ngay vào bảng cache
        cache_inserts = []
        for coil, val in web_results.items():
            cache_inserts.append((coil, val, json.dumps({"ghc": val}), now_str))
            ghc_cache[coil] = val
            rep_c = replace_id(coil)
            if rep_c and rep_c != coil:
                cache_inserts.append((rep_c, val, json.dumps({"ghc": val}), now_str))
                ghc_cache[rep_c] = val

        if cache_inserts:
            with get_db() as conn:
                conn.executemany("""
                    INSERT INTO skin_coil_ghc_cache (coil_id, ghc_value, raw_json, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(coil_id) DO UPDATE SET ghc_value = excluded.ghc_value, updated_at = excluded.updated_at
                """, cache_inserts)

    # 5. Cập nhật vào skin_data_source_rows
    updated_records = []
    now = datetime.now().isoformat()
    updated_rows_count = 0
    cache_hits = len(resolved_from_cache)

    for row_id, v, candidates in rows_to_process:
        val = resolved_from_cache.get(row_id)
        if val is None:
            val = resolve_ghc_from_candidates(candidates, ghc_cache)

        if val is not None and val > 0:
            v["GHC"] = str(round(float(val), 3))
            t_row = get_row_thickness(v)
            v["Elongation"] = calculate_elongation(val, t_row)
            updated_records.append((json.dumps(v, ensure_ascii=False, default=str), now, row_id))
            updated_rows_count += 1
        elif not only_missing or str(v.get("GHC") or "").strip() in ("-1.0", "-1"):
            v["GHC"] = "-"
            v["Elongation"] = ""
            updated_records.append((json.dumps(v, ensure_ascii=False, default=str), now, row_id))
            updated_rows_count += 1

    if updated_records:
        save_sheet_snapshot("DATA_SOURCE", "UPDATE_GHC", f"Cập nhật GHC cho {updated_rows_count} dòng")
        with get_db() as conn:
            conn.executemany(
                "UPDATE skin_data_source_rows SET values_json = ?, updated_at = ? WHERE id = ?",
                updated_records
            )

    return {
        "success": True,
        "updated_count": updated_rows_count,
        "from_cache": cache_hits,
        "from_web": web_hits,
        "total_requested": len(rows_to_process),
        "message": f"Đã cập nhật GHC cho {updated_rows_count:,} dòng ({cache_hits:,} từ bộ nhớ cache, {web_hits:,} cuộn mới từ web QC)!"
    }


# ==============================================================================
# QUẢN LÝ KẾ HOẠCH SẢN XUẤT SKIN (Skin Pass Mill 2 & 4 Scheduling)
# ==============================================================================

def generate_skin_ke_hoach(
    skin2_target: int = 50,
    skin4_target: int = 50,
    update_source: bool = True,
    today_date_str: str | None = None
) -> dict:
    """
    Thực hiện lập kế hoạch sản xuất cho 2 dây chuyền Skin Pass Mill 2 và 4 theo logic Office Script:
    1. Đọc dữ liệu từ sheet SKIN_HRC2 (skin_hrc2_rows)
    2. Lọc các cuộn đủ điều kiện:
       - 'Kế hoạch' còn trống
       - 'Đã chạy' còn trống
       - 'PO Tháng' không bắt đầu bằng 'tạo po'
       - 'Chỉ định Skin' không phải 'không xử lý'
       - 'Ngày sản xuất' hợp lệ:
         * Có Ưu tiên đơn hàng: dateKey < priorityCutoffKey (2 ngày trước ngày xét)
         * Không có ưu tiên: dateKey < yesterdayKey (1 ngày trước ngày xét)
       - Ca: bắt đầu bằng '1' -> 1, '2' -> 2, còn lại 99
    3. Sắp xếp: Ưu tiên đơn hàng asc -> Ngày sản xuất asc -> Ca asc -> Thứ tự ban đầu
    4. Gom nhóm theo ca (Shift Group): (ưu tiên, ngày, ca)
    5. Phân bổ cân đối số lượng cuộn cho Skin 2 và Skin 4:
       - Tôn trọng chỉ định cứng (SKIN2, SKIN4)
       - Phân bổ cuộn linh hoạt (BOTH) sắp xếp theo chiều dày tăng dần
    6. Tạo các Plan chuẩn (PL#2_0001, PL#4_0001...) theo target
       - Phần dư cho vào Plan lỗi (PL#2ERROR_01, PL#4ERROR_01)
    7. Ghép cặp đôi Plan (PL#2_xxxx và PL#4_xxxx cách nhau dòng trống)
    8. Lưu dữ liệu vào skin_ke_hoach_rows, cập nhật cột 'Kế hoạch' trong skin_hrc2_rows
    9. Tạo snapshot hoàn tác cho cả Kế hoạch và SKIN_HRC2
    """
    from functools import cmp_to_key

    # Chuẩn hóa target
    s2_target = max(40, int(skin2_target or 50))
    s4_target = max(40, int(skin4_target or 50))

    # Xác định ngày tham chiếu
    if today_date_str:
        try:
            today_dt = datetime.strptime(today_date_str.strip(), "%Y-%m-%d")
        except Exception:
            try:
                today_dt = datetime.strptime(today_date_str.strip(), "%d/%m/%Y")
            except Exception:
                today_dt = datetime.now()
    else:
        today_dt = datetime.now()

    def normalize_txt(v):
        return re.sub(r'\s+', ' ', str(v or '').replace('\u00A0', ' ')).strip().lower()

    def is_empty_val(v):
        return normalize_txt(v) == ''

    def to_float_val(v):
        if isinstance(v, (int, float)):
            return float(v) if math.isfinite(v) else float('nan')
        t = str(v or '').strip().replace(',', '.')
        if not t:
            return float('nan')
        try:
            n = float(t)
            return n if math.isfinite(n) else float('nan')
        except Exception:
            return float('nan')

    def parse_priority_val(v):
        if is_empty_val(v):
            return None
        n = to_float_val(v)
        return n if math.isfinite(n) else None

    def parse_date_val(v):
        if isinstance(v, (int, float)) and math.isfinite(v) and v > 20000:
            epoch = datetime(1899, 12, 30)
            return epoch + timedelta(days=v)
        t = str(v or '').strip()
        if not t:
            return None
        m1 = re.match(r'^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})', t)
        if m1:
            try:
                return datetime(int(m1.group(1)), int(m1.group(2)), int(m1.group(3)))
            except Exception:
                return None
        m2 = re.match(r'^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})', t)
        if m2:
            try:
                return datetime(int(m2.group(3)), int(m2.group(2)), int(m2.group(1)))
            except Exception:
                return None
        return None

    def dt_to_key(dt: datetime) -> int:
        return dt.year * 10000 + dt.month * 100 + dt.day

    def get_shift_priority(v):
        t = normalize_txt(v)
        if t.startswith('1'):
            return 1
        if t.startswith('2'):
            return 2
        return 99

    def get_allowed_skin(v):
        t = normalize_txt(v)
        if t == 'không xử lý':
            return 'NONE'
        if re.match(r'^skin\s*2$', t):
            return 'SKIN2'
        if re.match(r'^skin\s*4$', t):
            return 'SKIN4'
        return 'BOTH'

    yesterday_dt = today_dt - timedelta(days=1)
    yesterday_key = dt_to_key(yesterday_dt)
    priority_cutoff_dt = today_dt - timedelta(days=2)
    priority_cutoff_key = dt_to_key(priority_cutoff_dt)

    raw_hrc2_rows = query_all("SELECT id, row_number, values_json FROM skin_hrc2_rows ORDER BY row_number ASC")
    if not raw_hrc2_rows:
        raise ValueError("Sheet SKIN_HRC2 hiện không có dữ liệu để chạy kế hoạch.")

    eligible_coils = []
    source_hrc2_map = {}

    for idx, r in enumerate(raw_hrc2_rows):
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        row_id = r["id"]
        source_hrc2_map[row_id] = v

        if not is_empty_val(v.get("Kế hoạch")):
            continue
        if not is_empty_val(v.get("Đã chạy")):
            continue
        po_thang = normalize_txt(v.get("PO Tháng"))
        if po_thang.startswith("tạo po"):
            continue
        chi_dinh = normalize_txt(v.get("Chỉ định Skin"))
        allowed = get_allowed_skin(chi_dinh)
        if allowed == "NONE":
            continue

        ngay_sx = parse_date_val(v.get("Ngày sản xuất"))
        if not ngay_sx:
            continue
        date_key = dt_to_key(ngay_sx)

        uu_tien = parse_priority_val(v.get("Ưu tiên đơn hàng"))
        if uu_tien is not None:
            if date_key >= priority_cutoff_key:
                continue
        else:
            if date_key >= yesterday_key:
                continue

        thick = to_float_val(v.get("Thickness"))
        ca = str(v.get("Ca") or "").strip()
        shift_prio = get_shift_priority(ca)

        eligible_coils.append({
            "row_id": row_id,
            "source_index": idx,
            "idCuonBo": str(v.get("ID Cuộn Bó") or "").strip(),
            "materialDescription": str(v.get("Material Description") or "").strip(),
            "ngaySX": ngay_sx,
            "dateKey": date_key,
            "ca": ca,
            "shiftPriority": shift_prio,
            "thickness": thick,
            "chiDinhSkin": chi_dinh,
            "allowedSkin": allowed,
            "uuTienDonHang": uu_tien,
        })

    if not eligible_coils:
        raise ValueError("Không tìm thấy cuộn nào đủ điều kiện để lập kế hoạch Skin.")

    def sort_coils_key(c):
        has_prio = 0 if c["uuTienDonHang"] is not None else 1
        prio_val = c["uuTienDonHang"] if c["uuTienDonHang"] is not None else 0
        return (has_prio, prio_val, c["dateKey"], c["shiftPriority"], c["source_index"])

    eligible_coils.sort(key=sort_coils_key)

    # Gom nhóm theo ca (ShiftGroup)
    shift_groups = []
    current_group = None
    for coil in eligible_coils:
        p_key = coil["uuTienDonHang"] if coil["uuTienDonHang"] is not None else -1
        if (
            not current_group or
            current_group["priority_key"] != p_key or
            current_group["date_key"] != coil["dateKey"] or
            current_group["shift_priority"] != coil["shiftPriority"] or
            normalize_txt(current_group["ca"]) != normalize_txt(coil["ca"])
        ):
            current_group = {
                "priority_key": p_key,
                "date_key": coil["dateKey"],
                "shift_priority": coil["shiftPriority"],
                "ca": coil["ca"],
                "coils": []
            }
            shift_groups.append(current_group)
        current_group["coils"].append(coil)

    # Phân bổ Skin 2 & Skin 4 cho từng ShiftGroup
    def assign_shift_group(group):
        coils = group["coils"]
        total = len(coils)
        if total == 0:
            return
        desired_skin2 = total // 2
        desired_skin4 = total - desired_skin2

        hard_skin2 = [c for c in coils if c["allowedSkin"] == "SKIN2"]
        hard_skin4 = [c for c in coils if c["allowedSkin"] == "SKIN4"]
        flexible = [c for c in coils if c["allowedSkin"] == "BOTH"]

        for c in hard_skin2:
            c["assignedSkin"] = "SKIN2"
        for c in hard_skin4:
            c["assignedSkin"] = "SKIN4"

        need_skin2 = max(0, desired_skin2 - len(hard_skin2))
        need_skin4 = max(0, desired_skin4 - len(hard_skin4))

        if len(hard_skin2) > desired_skin2:
            need_skin2 = 0
            need_skin4 = len(flexible)
        if len(hard_skin4) > desired_skin4:
            need_skin4 = 0
            need_skin2 = len(flexible)

        flex_count = len(flexible)
        if need_skin2 + need_skin4 > flex_count:
            deficit2 = max(0, desired_skin2 - len(hard_skin2))
            deficit4 = max(0, desired_skin4 - len(hard_skin4))
            if deficit2 >= deficit4:
                need_skin2 = min(flex_count, deficit2)
                need_skin4 = flex_count - need_skin2
            else:
                need_skin4 = min(flex_count, deficit4)
                need_skin2 = flex_count - need_skin4

        if need_skin2 + need_skin4 < flex_count:
            remaining = flex_count - need_skin2 - need_skin4
            need_skin4 += remaining

        def flex_sort_key(c):
            th = c["thickness"]
            is_valid = 0 if (isinstance(th, (int, float)) and math.isfinite(th)) else 1
            val = th if is_valid == 0 else 0
            return (is_valid, val, c["source_index"])

        flexible.sort(key=flex_sort_key)
        for i, c in enumerate(flexible):
            c["assignedSkin"] = "SKIN2" if i < need_skin2 else "SKIN4"

    normal_coils2 = []
    normal_coils4 = []

    for g in shift_groups:
        assign_shift_group(g)
        for c in g["coils"]:
            if c.get("assignedSkin") == "SKIN2":
                normal_coils2.append(c)
            elif c.get("assignedSkin") == "SKIN4":
                normal_coils4.append(c)

    normal_coils2.sort(key=sort_coils_key)
    normal_coils4.sort(key=sort_coils_key)

    normal_plans2 = []
    s2_idx = 0
    s2_num = 1
    while len(normal_coils2) - s2_idx >= s2_target:
        normal_plans2.append({
            "id": f"PL#2_{s2_num:04d}",
            "skin": "SKIN2",
            "coils": normal_coils2[s2_idx : s2_idx + s2_target],
            "isError": False,
        })
        s2_idx += s2_target
        s2_num += 1
    error_coils2 = normal_coils2[s2_idx:]

    normal_plans4 = []
    s4_idx = 0
    s4_num = 1
    while len(normal_coils4) - s4_idx >= s4_target:
        normal_plans4.append({
            "id": f"PL#4_{s4_num:04d}",
            "skin": "SKIN4",
            "coils": normal_coils4[s4_idx : s4_idx + s4_target],
            "isError": False,
        })
        s4_idx += s4_target
        s4_num += 1
    error_coils4 = normal_coils4[s4_idx:]

    error_coils2.sort(key=sort_coils_key)
    error_coils4.sort(key=sort_coils_key)

    error_plans2 = []
    error_plans4 = []
    if error_coils2:
        error_plans2.append({
            "id": "PL#2ERROR_01",
            "skin": "SKIN2",
            "coils": error_coils2,
            "isError": True,
        })
    if error_coils4:
        error_plans4.append({
            "id": "PL#4ERROR_01",
            "skin": "SKIN4",
            "coils": error_coils4,
            "isError": True,
        })

    # Ghép đôi Plan theo số thứ tự (PL#2_xxxx và PL#4_xxxx)
    max_normal_pairs = max(len(normal_plans2), len(normal_plans4))
    normal_pairs = []
    for i in range(max_normal_pairs):
        p2_item = normal_plans2[i] if i < len(normal_plans2) else None
        p4_item = normal_plans4[i] if i < len(normal_plans4) else None
        pair_num = i + 1
        normal_pairs.append({
            "pair_number": pair_num,
            "plan2": p2_item,
            "plan4": p4_item,
        })

    max_error_pairs = max(len(error_plans2), len(error_plans4))
    error_pairs = []
    for i in range(max_error_pairs):
        ep2 = error_plans2[i] if i < len(error_plans2) else None
        ep4 = error_plans4[i] if i < len(error_plans4) else None
        error_pairs.append({
            "pair_number": f"ERR_{i+1}",
            "plan2": ep2,
            "plan4": ep4,
        })

    # Tạo output rows cho sheet Kế hoạch (bảng bên trái Cols A-F)
    # Cột: Line, Plan ID, ID Cuộn Bó, Material Description, Ngày sản xuất, Ca
    output_rows = []
    now_iso = datetime.now().isoformat()
    coil_to_plan_map = {}

    def add_plan_coils(plan):
        if not plan:
            return
        line_label = "Skin Pass Mill 2" if plan["skin"] == "SKIN2" else "Skin Pass Mill 4"
        for coil in plan["coils"]:
            coil_id = coil["idCuonBo"]
            coil_to_plan_map[coil["row_id"]] = plan["id"]
            d_formatted = coil["ngaySX"].strftime("%d/%m/%Y")
            output_rows.append({
                "Line": line_label,
                "Plan ID": plan["id"],
                "ID Cuộn Bó": coil_id,
                "Material Description": coil["materialDescription"],
                "Ngày sản xuất": d_formatted,
                "Ca": coil["ca"],
            })

    for pair in normal_pairs:
        if pair["plan2"]:
            add_plan_coils(pair["plan2"])
        if pair["plan4"]:
            add_plan_coils(pair["plan4"])
        # Dòng trống phân cách cặp Plan
        output_rows.append({
            "Line": "",
            "Plan ID": "",
            "ID Cuộn Bó": "",
            "Material Description": "",
            "Ngày sản xuất": "",
            "Ca": "",
        })

    for epair in error_pairs:
        if epair["plan2"]:
            add_plan_coils(epair["plan2"])
        if epair["plan4"]:
            add_plan_coils(epair["plan4"])
        output_rows.append({
            "Line": "",
            "Plan ID": "",
            "ID Cuộn Bó": "",
            "Material Description": "",
            "Ngày sản xuất": "",
            "Ca": "",
        })

    # Xóa dòng trống cuối cùng nếu có
    if output_rows and not output_rows[-1]["ID Cuộn Bó"]:
        output_rows.pop()

    # Lưu snapshot hoàn tác cho sheet KE_HOACH
    save_sheet_snapshot("KE_HOACH", "GENERATE_PLAN", f"Chạy Kế hoạch Skin (Target S2={s2_target}, S4={s4_target})")

    # Lưu vào skin_ke_hoach_rows (không ghi đè vào SKIN_HRC2)
    with get_db() as conn:
        conn.execute("DELETE FROM skin_ke_hoach_rows")
        db_inserts = []
        for row_num, row_data in enumerate(output_rows, start=1):
            db_inserts.append((
                str(uuid.uuid4()),
                row_num,
                json.dumps(row_data, ensure_ascii=False),
                now_iso,
                now_iso,
            ))
        if db_inserts:
            conn.executemany("""
                INSERT INTO skin_ke_hoach_rows (id, row_number, values_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
            """, db_inserts)

    # Xây dựng cấu trúc Matrix (4 cột: 1.Skin 2, 2.Skin 2, 1.Skin 4, 2.Skin 4)
    # 1.Skin 2: 50 cuộn của Plan 1 Skin 2
    # 2.Skin 2: 50 cuộn của Plan 2 Skin 2
    # 1.Skin 4: 50 cuộn của Plan 1 Skin 4
    # 2.Skin 4: 50 cuộn của Plan 2 Skin 4
    # Hàng 1 (màu vàng): TEXTJOIN khoảng cách " " của toàn bộ 50 cuộn
    matrix_data = build_skin_matrix_from_plans(output_rows)
    matrix_pairs = matrix_data.get("matrix_pairs", [])

    total_scheduled = len(coil_to_plan_map)
    total_plans = len(normal_plans2) + len(normal_plans4) + len(error_plans2) + len(error_plans4)

    return {
        "success": True,
        "message": f"Đã lập kế hoạch thành công cho {total_scheduled:,} cuộn chia thành {total_plans} Plan ({len(normal_plans2)} Skin 2, {len(normal_plans4)} Skin 4)!",
        "total_scheduled": total_scheduled,
        "total_plans": total_plans,
        "skin2_plans_count": len(normal_plans2),
        "skin4_plans_count": len(normal_plans4),
        "error_skin2_coils": len(error_coils2),
        "error_skin4_coils": len(error_coils4),
        "matrix_pairs": matrix_pairs,
        "plans_list": matrix_data.get("plans_list", []),
    }


def build_skin_matrix_from_plans(rows_data: list) -> dict:
    """
    Trích xuất dữ liệu ma trận 4 cột chuẩn theo hình ảnh:
    - 1.Skin 2: Đầy đủ cuộn của Plan 1 Skin 2 (e.g. 50 cuộn)
    - 2.Skin 2: Đầy đủ cuộn của Plan 2 Skin 2 (e.g. 50 cuộn)
    - 1.Skin 4: Đầy đủ cuộn của Plan 1 Skin 4 (e.g. 50 cuộn)
    - 2.Skin 4: Đầy đủ cuộn của Plan 2 Skin 4 (e.g. 50 cuộn)
    - Hàng 1 màu vàng: TEXTJOIN(" ", TRUE, coils) nối toàn bộ 50 cuộn bằng dấu cách ' '
    - Cột H (checkboxes) & Cột I (Plan ID): Danh sách các Plan ID theo thứ tự xen kẽ
    """
    plans_dict = {}
    plans_order = []

    for r in rows_data:
        if isinstance(r, dict) and "values_json" not in r:
            pid = str(r.get("Plan ID") or "").strip()
            cid = str(r.get("ID Cuộn Bó") or "").strip()
            line = str(r.get("Line") or "").strip()
        else:
            try:
                raw_json = r.get("values_json") if isinstance(r, dict) else r["values_json"]
                v = json.loads(raw_json or "{}")
            except Exception:
                continue
            pid = str(v.get("Plan ID") or "").strip()
            cid = str(v.get("ID Cuộn Bó") or "").strip()
            line = str(v.get("Line") or "").strip()

        if not pid or not cid:
            continue
        if pid not in plans_dict:
            skin_type = "SKIN2" if "2" in line or "#2" in pid else "SKIN4"
            plans_dict[pid] = {
                "id": pid,
                "skin": skin_type,
                "line": line,
                "coils": [],
            }
            plans_order.append(pid)
        plans_dict[pid]["coils"].append(cid)

    skin2_plans = [plans_dict[pid] for pid in plans_order if plans_dict[pid]["skin"] == "SKIN2"]
    skin4_plans = [plans_dict[pid] for pid in plans_order if plans_dict[pid]["skin"] == "SKIN4"]

    # Danh sách Plan xen kẽ cho cột H & I: PL#2_0001, PL#4_0001, PL#2_0002, PL#4_0002...
    interleaved_plans = []
    max_p_count = max(len(skin2_plans), len(skin4_plans), 0)
    for p_idx in range(max_p_count):
        if p_idx < len(skin2_plans):
            p2 = skin2_plans[p_idx]
            interleaved_plans.append({
                "id": p2["id"],
                "skin": "SKIN2",
                "count": len(p2["coils"]),
                "coils": p2["coils"],
            })
        if p_idx < len(skin4_plans):
            p4 = skin4_plans[p_idx]
            interleaved_plans.append({
                "id": p4["id"],
                "skin": "SKIN4",
                "count": len(p4["coils"]),
                "coils": p4["coils"],
            })

    # Xây dựng các Bộ ma trận (Mỗi bộ gồm 2 Plan Skin 2 và 2 Plan Skin 4)
    # Bộ 1: Plan 1,2 của Skin 2 và Plan 1,2 của Skin 4
    # Bộ 2: Plan 3,4 của Skin 2 và Plan 3,4 của Skin 4...
    matrix_pairs = []
    num_sets = max(math.ceil(len(skin2_plans) / 2), math.ceil(len(skin4_plans) / 2), 1)

    for s_idx in range(num_sets):
        s1_2_idx = 2 * s_idx
        s2_2_idx = 2 * s_idx + 1
        s1_4_idx = 2 * s_idx
        s2_4_idx = 2 * s_idx + 1

        p1_2 = skin2_plans[s1_2_idx] if s1_2_idx < len(skin2_plans) else None
        p2_2 = skin2_plans[s2_2_idx] if s2_2_idx < len(skin2_plans) else None
        p1_4 = skin4_plans[s1_4_idx] if s1_4_idx < len(skin4_plans) else None
        p2_4 = skin4_plans[s2_4_idx] if s2_4_idx < len(skin4_plans) else None

        c1_2 = p1_2["coils"] if p1_2 else []
        c2_2 = p2_2["coils"] if p2_2 else []
        c1_4 = p1_4["coils"] if p1_4 else []
        c2_4 = p2_4["coils"] if p2_4 else []

        id1_2 = p1_2["id"] if p1_2 else ""
        id2_2 = p2_2["id"] if p2_2 else ""
        id1_4 = p1_4["id"] if p1_4 else ""
        id2_4 = p2_4["id"] if p2_4 else ""

        # Hàng 1 (Vàng): TEXTJOIN(" ", TRUE, coils) với khoảng cách " "
        top_row = {
            "s1_2": " ".join(c1_2),
            "s2_2": " ".join(c2_2),
            "s1_4": " ".join(c1_4),
            "s2_4": " ".join(c2_4),
        }

        # Các hàng cuộn (tối đa 50 cuộn mỗi Plan)
        max_len = max(len(c1_2), len(c2_2), len(c1_4), len(c2_4), 0)
        grid_rows = []
        for r_idx in range(max_len):
            grid_rows.append({
                "row_num": r_idx + 1,
                "s1_2": c1_2[r_idx] if r_idx < len(c1_2) else "",
                "s2_2": c2_2[r_idx] if r_idx < len(c2_2) else "",
                "s1_4": c1_4[r_idx] if r_idx < len(c1_4) else "",
                "s2_4": c2_4[r_idx] if r_idx < len(c2_4) else "",
            })

        selected_plan_ids = [x for x in [id1_2, id1_4, id2_2, id2_4] if x]
        pair_title = f"Bộ {s_idx + 1}: {id1_2 or '—'}, {id2_2 or '—'} | {id1_4 or '—'}, {id2_4 or '—'}"

        matrix_pairs.append({
            "pair_number": s_idx + 1,
            "pair_title": pair_title,
            "skin2_p1_id": id1_2,
            "skin2_p2_id": id2_2,
            "skin4_p1_id": id1_4,
            "skin4_p2_id": id2_4,
            "skin2_plan_id": id1_2,
            "skin4_plan_id": id1_4,
            "skin2_coils_count": len(c1_2) + len(c2_2),
            "skin4_coils_count": len(c1_4) + len(c2_4),
            "skin2_coils": c1_2,
            "skin2_p2_coils": c2_2,
            "skin4_coils": c1_4,
            "skin4_p2_coils": c2_4,
            "top_row": top_row,
            "grid_rows": grid_rows,
            "selected_plan_ids": selected_plan_ids,
        })

    return {
        "success": True,
        "matrix_pairs": matrix_pairs,
        "plans_list": interleaved_plans,
    }


def get_skin_ke_hoach_matrix() -> dict:
    """
    Trích xuất dữ liệu ma trận 4 cột (1.Skin 2, 2.Skin 2, 1.Skin 4, 2.Skin 4) từ skin_ke_hoach_rows hiện tại.
    """
    rows = query_all("SELECT values_json FROM skin_ke_hoach_rows ORDER BY row_number ASC")
    if not rows:
        return {"success": True, "matrix_pairs": [], "plans_list": []}
    return build_skin_matrix_from_plans(rows)


def export_skin_ke_hoach_excel(skin2_target: int = 50, skin4_target: int = 50) -> io.BytesIO:
    """
    Xuất file Excel cho sheet 'Kế hoạch' chuẩn định dạng 100% như hình ảnh:
    - Hàng 1: A1: Skin Pass Mill 2 | B1: [target, vàng] | C1: Skin Pass Mill 4 | D1: [target, vàng]
    - Bảng bên trái (A2:F...): Line, Plan ID, ID Cuộn Bó, Material Description, Ngày sản xuất, Ca
    - Bảng ma trận bên phải (H:M):
      * Cột H: Ô tick chọn [x]
      * Cột I: Danh sách Plan ID (PL#2_0001, PL#4_0001, PL#2_0002, PL#4_0002...)
      * Hàng 1 (Vàng):
        - J1: =TEXTJOIN(" ", TRUE, J3:J52)
        - K1: =TEXTJOIN(" ", TRUE, K3:K52)
        - L1: =TEXTJOIN(" ", TRUE, L3:L52)
        - M1: =TEXTJOIN(" ", TRUE, M3:M52)
      * Hàng 2:
        - J2: 1.Skin 2 (Xanh)
        - K2: 2.Skin 2 (Xanh)
        - L2: 1.Skin 4 (Hồng)
        - M2: 2.Skin 4 (Hồng)
      * Hàng 3 đến 52:
        - Cột J: 50 cuộn của Plan 1 Skin 2
        - Cột K: 50 cuộn của Plan 2 Skin 2
        - Cột L: 50 cuộn của Plan 1 Skin 4
        - Cột M: 50 cuộn của Plan 2 Skin 4
    """
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Kế hoạch"

    # Font và màu
    font_bold = Font(name="Calibri", size=11, bold=True)
    font_normal = Font(name="Calibri", size=11)
    font_header_white = Font(name="Calibri", size=11, bold=True, color="FFFFFF")

    fill_yellow = PatternFill(start_color="FFFF00", end_color="FFFF00", fill_type="solid")
    fill_blue = PatternFill(start_color="00A2E8", end_color="00A2E8", fill_type="solid")
    fill_pink = PatternFill(start_color="FF7597", end_color="FF7597", fill_type="solid")
    fill_gray_header = PatternFill(start_color="F2F2F2", end_color="F2F2F2", fill_type="solid")

    thin_border = Border(
        left=Side(style='thin', color='D9D9D9'),
        right=Side(style='thin', color='D9D9D9'),
        top=Side(style='thin', color='D9D9D9'),
        bottom=Side(style='thin', color='D9D9D9')
    )

    # 1. Hàng cấu hình
    ws["A1"] = "Skin Pass Mill 2"
    ws["A1"].font = font_bold
    ws["B1"] = skin2_target
    ws["B1"].font = font_bold
    ws["B1"].fill = fill_yellow
    ws["B1"].alignment = Alignment(horizontal="center", vertical="center")

    ws["C1"] = "Skin Pass Mill 4"
    ws["C1"].font = font_bold
    ws["D1"] = skin4_target
    ws["D1"].font = font_bold
    ws["D1"].fill = fill_yellow
    ws["D1"].alignment = Alignment(horizontal="center", vertical="center")

    # 2. Header bảng bên trái
    headers_left = ["Line", "Plan ID", "ID Cuộn Bó", "Material Description", "Ngày sản xuất", "Ca"]
    for col_idx, h_name in enumerate(headers_left, start=1):
        cell = ws.cell(row=2, column=col_idx, value=h_name)
        cell.font = font_bold
        cell.fill = fill_gray_header
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = thin_border

    # Đọc dữ liệu từ skin_ke_hoach_rows
    rows = query_all("SELECT values_json FROM skin_ke_hoach_rows ORDER BY row_number ASC")
    for r_idx, r in enumerate(rows, start=3):
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        for col_idx, h_name in enumerate(headers_left, start=1):
            val = v.get(h_name, "")
            cell = ws.cell(row=r_idx, column=col_idx, value=val)
            cell.font = font_normal
            cell.border = thin_border
            if h_name in ("Line", "Plan ID", "ID Cuộn Bó", "Ca"):
                cell.alignment = Alignment(horizontal="center", vertical="center")

    # 3. Bảng ma trận bên phải (H:M)
    matrix_data = get_skin_ke_hoach_matrix()
    matrix_pairs = matrix_data.get("matrix_pairs", [])
    plans_list = matrix_data.get("plans_list", [])

    # Điền cột H (checkbox) và cột I (Plan ID) bắt đầu từ hàng 3
    first_set_selected = []
    if matrix_pairs:
        first_set_selected = matrix_pairs[0].get("selected_plan_ids", [])

    for p_idx, p_item in enumerate(plans_list, start=3):
        pid = p_item["id"]
        is_chk = pid in first_set_selected
        cell_h = ws.cell(row=p_idx, column=8, value="☑" if is_chk else "")
        cell_h.font = font_bold
        cell_h.alignment = Alignment(horizontal="center", vertical="center")
        cell_h.border = thin_border

        cell_i = ws.cell(row=p_idx, column=9, value=pid)
        cell_i.font = font_bold
        cell_i.alignment = Alignment(horizontal="center", vertical="center")
        cell_i.border = thin_border

    # Headers bảng ma trận J..M
    c_j = ws.cell(row=2, column=10, value="1.Skin 2")
    c_j.font = font_header_white; c_j.fill = fill_blue; c_j.alignment = Alignment(horizontal="center", vertical="center"); c_j.border = thin_border

    c_k = ws.cell(row=2, column=11, value="2.Skin 2")
    c_k.font = font_header_white; c_k.fill = fill_blue; c_k.alignment = Alignment(horizontal="center", vertical="center"); c_k.border = thin_border

    c_l = ws.cell(row=2, column=12, value="1.Skin 4")
    c_l.font = font_header_white; c_l.fill = fill_pink; c_l.alignment = Alignment(horizontal="center", vertical="center"); c_l.border = thin_border

    c_m = ws.cell(row=2, column=13, value="2.Skin 4")
    c_m.font = font_header_white; c_m.fill = fill_pink; c_m.alignment = Alignment(horizontal="center", vertical="center"); c_m.border = thin_border

    # Hàng 1 (Vàng): Công thức Excel chuẩn =TEXTJOIN(" ", TRUE, ...)
    first_pair = matrix_pairs[0] if matrix_pairs else {}
    s2_max = max(len(first_pair.get("skin2_coils", [])), skin2_target or 50)
    s4_max = max(len(first_pair.get("skin4_coils", [])), skin4_target or 50)
    ws.cell(row=1, column=10, value=f'=TEXTJOIN(" ", TRUE, J3:J{2 + s2_max})')
    ws.cell(row=1, column=11, value=f'=TEXTJOIN(" ", TRUE, K3:K{2 + s2_max})')
    ws.cell(row=1, column=12, value=f'=TEXTJOIN(" ", TRUE, L3:L{2 + s4_max})')
    ws.cell(row=1, column=13, value=f'=TEXTJOIN(" ", TRUE, M3:M{2 + s4_max})')

    for c_idx in [10, 11, 12, 13]:
        top_cell = ws.cell(row=1, column=c_idx)
        top_cell.font = font_bold
        top_cell.fill = fill_yellow
        top_cell.alignment = Alignment(horizontal="center", vertical="center")
        top_cell.border = thin_border

    # Điền 50 cuộn vào các hàng 3 đến 52 của cặp ma trận đầu tiên
    if matrix_pairs:
        first_pair = matrix_pairs[0]
        for r_idx, grid_r in enumerate(first_pair.get("grid_rows", []), start=3):
            for c_idx, key in [(10, "s1_2"), (11, "s2_2"), (12, "s1_4"), (13, "s2_4")]:
                c_val = ws.cell(row=r_idx, column=c_idx, value=grid_r.get(key, ""))
                c_val.font = font_normal
                c_val.alignment = Alignment(horizontal="center", vertical="center")
                c_val.border = thin_border

    # Điều chỉnh độ rộng cột
    ws.column_dimensions["A"].width = 18
    ws.column_dimensions["B"].width = 15
    ws.column_dimensions["C"].width = 16
    ws.column_dimensions["D"].width = 30
    ws.column_dimensions["E"].width = 15
    ws.column_dimensions["F"].width = 10
    ws.column_dimensions["G"].width = 3
    ws.column_dimensions["H"].width = 4
    ws.column_dimensions["I"].width = 14
    ws.column_dimensions["J"].width = 16
    ws.column_dimensions["K"].width = 16
    ws.column_dimensions["L"].width = 16
    ws.column_dimensions["M"].width = 16

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def get_skin_hrc2_coils_by_ke_hoach(ke_hoach_query: str = "", limit: int = 1000) -> dict:
    """
    Tra cứu danh sách ID cuộn bó đã lập kế hoạch theo ngày (dd/mm), giới hạn 1000 cuộn:
    - Tìm kiếm theo ngày trong cột Kế hoạch (e.g. '09/11', '09-11', '2026-11-09', v.v.)
    - Trả về danh sách mã cuộn, số lượng (tối đa 1000 cuộn)
    - Trả về danh sách tất cả các ngày đã lập có trong hệ thống kèm số lượng cuộn
    """
    rows = query_all("SELECT id, row_number, values_json FROM skin_hrc2_rows ORDER BY row_number ASC")

    distinct_dates = {}
    matched_coils = []

    q_norm = ke_hoach_query.strip().lower()

    for r in rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        kh = str(v.get("Kế hoạch") or "").strip()
        cid = str(v.get("ID Cuộn Bó") or "").strip()

        if kh:
            distinct_dates[kh] = distinct_dates.get(kh, 0) + 1

        if cid:
            is_match = False
            if q_norm:
                kh_norm = kh.lower()
                if kh_norm == q_norm or q_norm in kh_norm or kh_norm in q_norm:
                    is_match = True
            else:
                # Nếu không lọc theo ngày cụ thể, lấy các cuộn đã có kế hoạch
                if kh:
                    is_match = True

            if is_match and len(matched_coils) < limit:
                matched_coils.append({
                    "id": cid,
                    "row_number": r.get("row_number"),
                    "ke_hoach": kh,
                    "material": str(v.get("Material Description") or "").strip(),
                    "ngay_sx": str(v.get("Ngày sản xuất") or "").strip(),
                    "ca": str(v.get("Ca") or "").strip(),
                })

    # Sắp xếp danh sách ngày
    sorted_distinct = [
        {"date": k, "count": distinct_dates[k]}
        for k in sorted(distinct_dates.keys())
    ]

    return {
        "success": True,
        "query": ke_hoach_query,
        "total_matched": len(matched_coils),
        "limit": limit,
        "coils": matched_coils,
        "coil_ids": [c["id"] for c in matched_coils],
        "coil_ids_text": "\n".join(c["id"] for c in matched_coils),
        "coil_ids_textjoin": " ".join(c["id"] for c in matched_coils),
        "distinct_dates": [k for k in sorted(distinct_dates.keys())],
        "distinct_details": sorted_distinct,
    }


def normalize_ke_hoach_value(val: any) -> str:
    """
    Chuẩn hóa giá trị Kế hoạch:
    - Nếu là ngày (d/m, dd/mm, d-m, dd-mm, yyyy-mm-dd...): Chuẩn hóa sang định dạng dd/mm
    - Nếu là chữ/ký tự bất kỳ (ghi chú, trạng thái, KH1, ...): Giữ nguyên văn bản
    """
    if val is None:
        return ""
    text = str(val).strip()
    if not text:
        return ""

    # Kiểm tra nếu là dạng ngày: d/m, dd/mm, d-m, dd-mm, d.m, dd.mm (có thể có năm)
    m = re.match(r"^(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.]\d{2,4})?$", text)
    if m:
        try:
            day = int(m.group(1))
            month = int(m.group(2))
            if 1 <= day <= 31 and 1 <= month <= 12:
                return f"{day:02d}/{month:02d}"
        except Exception:
            pass

    # Ngược lại cho phép nhập chữ ký tự bất kỳ
    return text


def assign_skin_hrc2_ke_hoach_batch(coil_ids: list[str], ke_hoach_val: str = "", limit: int = 1000) -> dict:
    """
    Gán Kế hoạch cho danh sách mã cuộn trong sheet SKIN_HRC2 (tối đa 1000 cuộn):
    - Có thể nhập chữ ký tự bất kỳ, hoặc nếu là ngày thì tự động định dạng dd/mm
    - Tự động nhảy ngày/chữ vào cột 'Kế hoạch' của các cuộn tương ứng
    - Chuẩn hóa mã cuộn (bỏ khoảng cách thừa, so khớp không phân biệt hoa thường)
    """
    if not coil_ids:
        raise ValueError("Chưa cung cấp danh sách mã cuộn cần gán.")

    val_clean = normalize_ke_hoach_value(ke_hoach_val)
    
    # Chuẩn hóa target_ids (loại bỏ dấu cách, chữ hoa)
    target_ids = {}
    for c in coil_ids:
        raw = str(c or "").strip()
        if raw:
            norm = raw.replace(" ", "").upper()
            target_ids[norm] = raw
            if len(target_ids) >= limit:
                break

    rows = query_all("SELECT id, row_number, values_json FROM skin_hrc2_rows ORDER BY row_number ASC")
    now_iso = datetime.now().isoformat()

    updated_items = []
    matched_ids = []
    for r in rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            continue
        cid_raw = str(v.get("ID Cuộn Bó") or v.get("ID Coil") or v.get("ID Cuộn") or v.get("ID HRC") or "").strip()
        cid_norm = cid_raw.replace(" ", "").upper()
        if cid_norm and cid_norm in target_ids:
            v["Kế hoạch"] = val_clean
            updated_items.append((
                json.dumps(v, ensure_ascii=False, default=str),
                now_iso,
                r["id"]
            ))
            matched_ids.append(cid_raw)

    if not updated_items:
        raise ValueError(f"Không tìm thấy cuộn nào khớp trong {len(target_ids)} mã cuộn được cung cấp trong sheet SKIN_HRC2.")

    action_desc = f"Gán Kế hoạch '{val_clean}' cho {len(updated_items)} cuộn" if val_clean else f"Xóa Kế hoạch của {len(updated_items)} cuộn"
    save_sheet_snapshot("SKIN_HRC2", "ASSIGN_KE_HOACH", action_desc)

    with get_db() as conn:
        conn.executemany("""
            UPDATE skin_hrc2_rows
            SET values_json = ?, updated_at = ?
            WHERE id = ?
        """, updated_items)

    return {
        "success": True,
        "ke_hoach": val_clean,
        "assigned_count": len(updated_items),
        "updated_count": len(updated_items),
        "matched_coil_ids": matched_ids,
        "message": f"Đã gán ngày Kế hoạch '{val_clean}' thành công cho {len(updated_items):,} cuộn trong sheet SKIN_HRC2!" if val_clean else f"Đã xóa Kế hoạch của {len(updated_items):,} cuộn!",
    }



