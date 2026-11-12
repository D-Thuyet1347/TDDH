"""Export all tables from the SQLite database to a multi-sheet Excel workbook."""
import sqlite3
from datetime import datetime
from pathlib import Path
import sys

import openpyxl

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config.settings import SQLITE_DB_PATH, BACKEND_EXPORTS_DIR


def _sanitize_excel_value(val):
    """Ensure cell values are valid for Excel/openpyxl and within Excel's 32,767 char limit."""
    if val is None:
        return ""
    if isinstance(val, bytes):
        val = val.decode("utf-8", errors="replace")
    if isinstance(val, str):
        # Strip illegal XML control characters (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F)
        cleaned = "".join(
            ch for ch in val
            if ch in ("\t", "\n", "\r") or ord(ch) >= 32
        )
        if len(cleaned) > 32767:
            return cleaned[:32764] + "..."
        return cleaned
    return val


def export_all_tables_to_excel(output_path: Path | None = None) -> Path:
    """Export every user table in SQLite_DB_PATH into a separate Excel sheet."""
    BACKEND_EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    if output_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = BACKEND_EXPORTS_DIR / f"database_all_tables_{timestamp}.xlsx"

    conn = sqlite3.connect(str(SQLITE_DB_PATH), timeout=30.0)
    try:
        tables = [
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            ).fetchall()
        ]

        wb = openpyxl.Workbook(write_only=True)
        summary_ws = wb.create_sheet(title="Database_Summary")
        summary_ws.append(["STT", "Tên bảng (Table Name)", "Số dòng (Row Count)", "Số cột (Column Count)", "Danh sách cột (Columns)"])

        table_meta = []
        for idx, table_name in enumerate(tables, start=1):
            cols_info = conn.execute(f'PRAGMA table_info("{table_name}")').fetchall()
            col_names = [c[1] for c in cols_info]
            row_count = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
            table_meta.append((table_name, col_names, row_count))
            summary_ws.append([idx, table_name, row_count, len(col_names), ", ".join(col_names)])

        for table_name, col_names, _ in table_meta:
            sheet_title = table_name[:31]
            ws = wb.create_sheet(title=sheet_title)
            ws.append(col_names)

            cursor = conn.execute(f'SELECT * FROM "{table_name}"')
            while True:
                batch = cursor.fetchmany(5000)
                if not batch:
                    break
                for row in batch:
                    ws.append([_sanitize_excel_value(v) for v in row])

        wb.save(str(output_path))
        return output_path
    finally:
        conn.close()


if __name__ == "__main__":
    out_file = export_all_tables_to_excel()
    print(f"Exported all database tables to: {out_file}")
