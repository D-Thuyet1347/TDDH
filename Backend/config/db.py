import sqlite3
import json
from pathlib import Path
from contextlib import contextmanager
from config.settings import SQLITE_DB_PATH

# Ensure parent directory exists
SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(SQLITE_DB_PATH), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA busy_timeout = 30000;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    return dict(row)

def query_one(sql: str, params: tuple | list = ()) -> dict | None:
    with get_db() as conn:
        cursor = conn.execute(sql, params)
        row = cursor.fetchone()
        return row_to_dict(row)

def query_all(sql: str, params: tuple | list = ()) -> list[dict]:
    with get_db() as conn:
        cursor = conn.execute(sql, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def execute_write(sql: str, params: tuple | list = ()) -> int:
    with get_db() as conn:
        cursor = conn.execute(sql, params)
        return cursor.rowcount

def execute_many(sql: str, params_list: list) -> int:
    with get_db() as conn:
        cursor = conn.executemany(sql, params_list)
        return cursor.rowcount

def init_sqlite_db():
    with get_db() as conn:
        # 1. Users table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT,
                role TEXT DEFAULT 'user',
                full_name TEXT,
                avatar TEXT,
                created_at TEXT,
                updated_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);")

        # 2. QC Reports metadata
        conn.execute("""
            CREATE TABLE IF NOT EXISTS qcreports (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                original_name TEXT,
                report_type TEXT DEFAULT 'qc',
                saved_at TEXT,
                bytes INTEGER DEFAULT 0,
                rows_imported INTEGER DEFAULT 0,
                sheets TEXT,
                created_at TEXT,
                updated_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_qcreports_report_type ON qcreports(report_type);")

        # 3. QC Rows
        conn.execute("""
            CREATE TABLE IF NOT EXISTS qcrows (
                id TEXT PRIMARY KEY,
                report_id TEXT NOT NULL,
                sheet_name TEXT,
                row_number INTEGER,
                order_id TEXT,
                tdc_code TEXT,
                coil_id TEXT,
                slab_id TEXT,
                product TEXT,
                steel_grade TEXT,
                standard TEXT,
                weight REAL,
                values_json TEXT,
                created_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_qcrows_report_id ON qcrows(report_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_qcrows_coil_id ON qcrows(coil_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_qcrows_order_id ON qcrows(order_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_qcrows_tdc_code ON qcrows(tdc_code);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_qcrows_slab_id ON qcrows(slab_id);")

        # 4. NC Reports metadata (Order demand)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS nc_reports (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                original_name TEXT,
                report_type TEXT DEFAULT 'order-demand',
                saved_at TEXT,
                bytes INTEGER DEFAULT 0,
                rows_imported INTEGER DEFAULT 0,
                sheets TEXT,
                created_at TEXT,
                updated_at TEXT
            );
        """)

        # 5. NC Rows (Order demand rows)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS nc_rows (
                id TEXT PRIMARY KEY,
                report_id TEXT NOT NULL,
                sheet_name TEXT,
                row_number INTEGER,
                order_id TEXT,
                values_json TEXT,
                created_at TEXT
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ncrows_report_id ON nc_rows(report_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ncrows_sheet_name ON nc_rows(sheet_name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ncrows_order_id ON nc_rows(order_id);")

        # 6. QC Auto export settings
        conn.execute("""
            CREATE TABLE IF NOT EXISTS qc_auto_export_settings (
                id TEXT PRIMARY KEY,
                settings_json TEXT,
                updated_at TEXT
            );
        """)

    print(f"[SQLite DB] Initialized database at: {SQLITE_DB_PATH}")

def is_db_connected() -> bool:
    try:
        with get_db() as conn:
            conn.execute("SELECT 1;").fetchone()
            return True
    except Exception:
        return False

def ensure_indexes():
    init_sqlite_db()
