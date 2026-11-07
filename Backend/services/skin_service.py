import json
import uuid
import re
from datetime import datetime, date
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
}

def normalize_sheet_key(sheet_name: str) -> str:
    s = re.sub(r'[\s_]+', '_', str(sheet_name or '')).strip().upper()
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

# Initialize tables immediately
init_skin_tables()

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
    Query qcrows table from 'Dữ liệu' page for the requested 2 months (default: current month and previous month).
    Loads ALL records/values from monthly reports (e.g. thang-10, thang-11) and master report (6adf6dc6c603752d3ddd162d),
    without filtering out any handling direction (takes all SKIN, SKIN_CUST, SKIN_RCL_AGAIN, CXL, FINAL, etc.),
    merges all original fields from qcrows, maps to DATA_SOURCE columns, and stores in skin_data_source_rows.
    """
    if not months:
        months = get_current_and_prev_months()

    allowed_months = set(int(m) for m in months if str(m).isdigit())
    now_iso = datetime.now().isoformat()

    # Query rows from monthly reports and master report for the allowed months
    report_filter = [f"thang-{m}" for m in allowed_months]
    report_filter.append("6adf6dc6c603752d3ddd162d")
    placeholders = ",".join(["?"] * len(report_filter))

    # Load cached GHC values so we preserve them
    ghc_cache_rows = query_all("SELECT coil_id, ghc_value FROM skin_coil_ghc_cache")
    ghc_cache = {r["coil_id"]: r["ghc_value"] for r in ghc_cache_rows if r.get("coil_id")}

    # Priority: 6adf6dc6c603752d3ddd162d first so latest update of a coil is read first
    qc_rows = query_all(f"""
        SELECT id, report_id, sheet_name, row_number, order_id, coil_id, values_json 
        FROM qcrows 
        WHERE report_id IN ({placeholders})
        ORDER BY CASE WHEN report_id = '6adf6dc6c603752d3ddd162d' THEN 0 ELSE 1 END, id ASC
    """, tuple(report_filter))

    matching_rows = []
    seen_coils = set()

    for r in qc_rows:
        try:
            vals = json.loads(r.get("values_json") or "{}")
        except Exception:
            vals = {}

        rep = str(r.get("report_id") or "")
        ngay_sx = find_val(vals, ["NGÀY SẢN XUẤT", "Ngày sản xuất", "Ngay san xuat", "NGAY_SAN_XUAT", "Ngày SX", "Ngày"])

        # Check month: if report is 'thang-X', month is X. Otherwise extract from date/sheet
        if rep.startswith("thang-"):
            try:
                row_month = int(rep.replace("thang-", ""))
            except Exception:
                row_month = extract_month(ngay_sx, fallback_str=r.get("sheet_name") or "")
        else:
            row_month = extract_month(ngay_sx, fallback_str=r.get("sheet_name") or "")

        if row_month and row_month not in allowed_months:
            continue

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
        ghi_chu = find_val(vals, ["Ghi Chú", "Ghi chú", "Ghi chu", "GHI CHÚ", "GHI CHÚ QC", "Ghi chú xử lý"]) or ""

        # Dedup key by coil and month
        coil_key = str(id_xu_ly or id_goc or order_val).strip()
        dedup_key = (coil_key, row_month)
        if coil_key and dedup_key in seen_coils:
            continue
        if coil_key:
            seen_coils.add(dedup_key)

        # Merge all original fields from vals plus standardized target columns
        ghc_val = ghc_cache.get(str(id_xu_ly).strip()) or ghc_cache.get(str(id_goc).strip()) or ""
        mapped_dict = dict(vals)
        t_row = get_row_thickness(vals)
        el_val = calculate_elongation(ghc_val, t_row)
        mapped_dict.update({
            "ORDER": order_val,
            "TỔNG CẤP CHẤT LƯỢNG": cap_cl,
            "PHÂN LOẠI": phan_loai,
            "TÌNH TRẠNG CHẤT LƯỢNG": tinh_trang_cl,
            "HƯỚNG XỬ LÝ": huong_xu_ly,
            "LỖI LỆCH TDC": loi_lech,
            "NGÀY SẢN XUẤT": ngay_sx,
            "ID XỬ LÝ": id_xu_ly,
            "ID GỐC": id_goc,
            "KHỐI LƯỢNG TỊNH": khoi_luong,
            "GHC": str(ghc_val) if ghc_val != "" and ghc_val is not None else "",
            "Elongation": el_val,
            "Ghi Chú": ghi_chu,
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

    # Clear and insert into skin_data_source_rows in batch
    with get_db() as conn:
        conn.execute("DELETE FROM skin_data_source_rows")
        if matching_rows:
            conn.executemany("""
                INSERT INTO skin_data_source_rows (id, row_number, order_id, coil_id, month, values_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, matching_rows)

    return {
        "success": True,
        "rows_loaded": len(matching_rows),
        "months_filtered": list(allowed_months),
        "message": f"Đã lấy thành công toàn bộ {len(matching_rows):,} dòng dữ liệu cho các tháng: {', '.join(str(m) for m in sorted(allowed_months))}."
    }

def get_sheet_rows(sheet_name: str, limit: int = 100, offset: int = 0, search: str = "") -> dict:
    sheet_key = normalize_sheet_key(sheet_name)
    table = get_sheet_table_name(sheet_key)
    columns = get_sheet_columns(sheet_key)

    where = "WHERE 1=1"
    params = []
    if search:
        where += " AND values_json LIKE ?"
        params.append(f"%{search}%")

    count_res = query_one(f"SELECT count(*) as total FROM {table} {where}", tuple(params))
    total = count_res["total"] if count_res else 0

    # Nếu là CHECK_DATA_SKIN và chưa có dữ liệu, tự động chạy sync_check_data_skin
    if sheet_key == "CHECK_DATA_SKIN" and total == 0 and not search:
        try:
            sync_check_data_skin()
            count_res = query_one(f"SELECT count(*) as total FROM {table} {where}", tuple(params))
            total = count_res["total"] if count_res else 0
        except Exception:
            pass

    sql = f"SELECT id, row_number, values_json, created_at, updated_at FROM {table} {where} ORDER BY row_number ASC LIMIT ? OFFSET ?"
    db_rows = query_all(sql, tuple(params + [limit, offset]))

    rows = []
    for r in db_rows:
        try:
            val_dict = json.loads(r.get("values_json") or "{}")
        except Exception:
            val_dict = {}
        rows.append({
            "id": r["id"],
            "row_number": r["row_number"],
            "values": val_dict,
            "created_at": r.get("created_at"),
            "updated_at": r.get("updated_at"),
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
    Giới hạn tối đa 1.000 dòng 1 lần.
    """
    if not row_ids:
        raise ValueError("Chưa chọn dòng nào để thêm vào SKIN_HRC2.")

    save_sheet_snapshot("SKIN_HRC2", "TRANSFER_DS", f"Chuyển {len(row_ids)} cuộn từ DATA_SOURCE sang SKIN_HRC2")

    # Giới hạn tối đa 1000 dòng
    target_ids = list(row_ids)[:1000]
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
            phan_loai = ds_val.get("PHÂN LOẠI") or ""

            m_val = extract_month(ngay_sx)
            thang_str = f"Tháng {m_val}" if m_val else ""

            check_trung = "Trùng" if coil_id and (coil_id in existing_coils) else ""
            if coil_id:
                existing_coils.add(coil_id)

            skin_row_val = {
                "HƯỚNG XỬ LÝ_WEB": huong_xu_ly,
                "Loại": phan_loai,
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
    Nhận danh sách dữ liệu paste từ Excel/bảng (tối đa 1.000 dòng) và chèn vào sheet.
    Tự động chuẩn hóa, kiểm tra ràng buộc trùng PO (cho PO_HSM & PO_SKIN) hoặc trùng ID Cuộn Bó (SKIN_HRC2),
    và tự động chạy tính toán công thức liên quan.
    """
    if not rows_data:
        raise ValueError("Chưa có dữ liệu dòng nào để thêm.")

    sheet_key = normalize_sheet_key(sheet_name)
    capped_rows = rows_data[:1000]
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

        rows_to_insert = []
        rows_to_update = [] # (values_json, updated_at, id)

        for i, item in enumerate(capped_rows):
            val_dict = {col: str(item.get(col) if item.get(col) is not None else "").strip() for col in columns}

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
            phan_loai = str(v.get("PHÂN LOẠI") or "").strip()
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
            if "SKIN_RCL_AGAIN" in huong_xu_ly or "SKIN_RCL" in huong_xu_ly or "RCL_AGAIN" in huong_xu_ly or "RCL" in huong_xu_ly:
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
        loai = str(v.get("PHÂN LOẠI") or "").strip()
        c1 = str(v.get("ID GỐC") or "").strip()
        c2 = str(v.get("ID XỬ LÝ") or "").strip()
        rec = {"huong": huong, "loai": loai}
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

        # Chỉ định Skin
        cd_hsm = po_hsm_map.get(po_xuly, {}).get("chi_dinh")
        cd_spm = po_skin_by_spm.get(po_xuly, {}).get("chi_dinh")
        v["Chỉ định Skin"] = cd_hsm if cd_hsm else (cd_spm if cd_spm else "")

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
    5. Tra cứu DATA_SOURCE cho 'Ngày sản xuất' và 'Tống hợp lỗi' (huongXuLy || loiLechTDC || ghiChu)
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
            po_hsm_md_map[po] = str(v.get("Mục đích sử dụng") or "").strip()
            po_hsm_cw_map[po] = str(v.get("CW") or "").strip()
            try:
                po_hsm_min_cw_map[po] = float(str(v.get("Min_CW") or 0).replace(",", "."))
            except Exception:
                po_hsm_min_cw_map[po] = parse_min_cw(v.get("CW"))

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
            po_spm_md_map[po] = str(v.get("Mục đích sử dụng") or "").strip()
            po_spm_cw_map[po] = str(v.get("CW") or "").strip()
            try:
                po_spm_min_cw_map[po] = float(str(v.get("Min_CW") or 0).replace(",", "."))
            except Exception:
                po_spm_min_cw_map[po] = parse_min_cw(v.get("CW"))

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
        error_parts = [src.get("huongXuLy"), src.get("loiLechTDC"), src.get("ghiChu")]
        tong_hop_loi = " || ".join(p for p in error_parts if p)

        if prefix in ("202", "204", "105"):
            md = po_hsm_md_map.get(po, "")
            cw = po_hsm_cw_map.get(po, "")
            min_cw = po_hsm_min_cw_map.get(po, 0.0)
        elif prefix in ("205", "206"):
            md = po_spm_md_map.get(po, "")
            cw = po_spm_cw_map.get(po, "")
            min_cw = po_spm_min_cw_map.get(po, 0.0)
        else:
            md = ""
            cw = ""
            min_cw = 0.0

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
            "Yêu cầu đặt biệt": "",
            "STT": row["stt"],
            "Plan ID": row["plan"],
            "ID Coil": coil_id,
            "Tên gọi": row["comment"],
            "PO": po,
            "Thickness": row["thickness"],
            "Width": row["width"],
            "Weight": row["weight"],
            "Steel grade": row["grade"],
            "Ngày sản xuất": prod_date,
            "Mục đích sử dụng": md,
            "CW": cw,
            "Giới hạn cắt (nếu có)": cut_limit,
            "NM ĐỀ XUẤT": "",
            "P.DVKTKH & P.QLCL": "",
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
    Xuất dữ liệu sheet Get Data ra file Excel chuẩn format dd/mm/yyyy.
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

    date_col_idx = GET_DATA_COLUMNS.index("Ngày sản xuất") + 1

    for r in rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}
        row_vals = [v.get(col, "") for col in GET_DATA_COLUMNS]
        ws.append(row_vals)
        cur_row = ws.max_row
        cell_date = ws.cell(row=cur_row, column=date_col_idx)
        cell_date.number_format = "dd/mm/yyyy"

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
        browser = p.chromium.launch(**launch_kwargs)
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
                        match = re.search(r"TABLE_DATA\['YieldPoint'\]\s*=\s*(\[.*?\]);", html, re.DOTALL)
                        batch_found = set()
                        if match:
                            try:
                                yp_list = json.loads(match.group(1))
                                for item in yp_list:
                                    coil = str(item.get("Cuộn") or "").strip()
                                    counts = item.get("DetailCounts") or {}
                                    val = None
                                    if isinstance(counts, dict):
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
    2. Nếu only_missing=True thì chỉ lấy các dòng chưa có GHC.
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

    # 2. Lọc các dòng theo only_missing và gom mã cuộn
    rows_to_process = []
    needed_coils = set()

    for r in target_rows:
        try:
            v = json.loads(r.get("values_json") or "{}")
        except Exception:
            v = {}

        current_ghc = str(v.get("GHC") or "").strip()
        if only_missing and current_ghc and current_ghc != "-":
            continue

        cid = str(v.get("ID XỬ LÝ") or v.get("ID GỐC") or "").strip()
        if cid:
            rows_to_process.append((r["id"], v, cid))
            needed_coils.add(cid)

    if not rows_to_process:
        return {
            "success": True,
            "updated_count": 0,
            "message": "Tất cả các dòng được chọn đều đã có giá trị GHC đầy đủ."
        }

    # 3. Tra cứu cache trước
    cache_rows = query_all("SELECT coil_id, ghc_value FROM skin_coil_ghc_cache")
    ghc_cache = {r["coil_id"]: r["ghc_value"] for r in cache_rows if r.get("coil_id")}

    cache_hits = 0
    coils_to_scrape = []
    resolved_ghc: dict[str, float] = {}

    for cid in needed_coils:
        if cid in ghc_cache and ghc_cache[cid] is not None:
            resolved_ghc[cid] = ghc_cache[cid]
            cache_hits += 1
        else:
            coils_to_scrape.append(cid)

    web_hits = 0
    # 4. Quét web QC cho các cuộn chưa có trong cache
    if coils_to_scrape:
        web_results = scrape_yield_point_batches(coils_to_scrape, batch_size=300)
        web_hits = len(web_results)
        now_str = datetime.now().isoformat()

        # Lưu ngay vào bảng cache
        cache_inserts = []
        for coil, val in web_results.items():
            resolved_ghc[coil] = val
            cache_inserts.append((coil, val, json.dumps({"ghc": val}), now_str))

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

    for row_id, v, cid in rows_to_process:
        val = resolved_ghc.get(cid)
        if val is not None:
            v["GHC"] = str(val) if val > 0 else "-"
            t_row = get_row_thickness(v)
            v["Elongation"] = calculate_elongation(val, t_row)
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


