import os
import sys
import zipfile
import time
from pathlib import Path

def main():
    root_dir = Path(__file__).resolve().parent
    source_dir = root_dir / "dist" / "TheoDoiTienDoDonHang"
    output_zip = root_dir / "TheoDoiTienDoDonHang_Portable.zip"

    if not source_dir.exists():
        print(f"[!] Lỗi: Không tìm thấy thư mục {source_dir}")
        sys.exit(1)

    print("=" * 60)
    print("  ĐANG TIẾN HÀNH ĐÓNG GÓI TOÀN BỘ ỨNG DỤNG THÀNH FILE .ZIP")
    print("=" * 60)
    print(f"[*] Thư mục nguồn: {source_dir}")
    print(f"[*] File xuất ra:  {output_zip}")
    print("[*] Đang nén các tệp và cơ sở dữ liệu...")

    start_time = time.time()
    total_files = sum(len(files) for _, _, files in os.walk(source_dir))
    processed = 0

    with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(source_dir.parent)
                zipf.write(file_path, arcname)
                processed += 1
                if processed % 100 == 0 or processed == total_files:
                    percent = (processed / total_files) * 100
                    print(f"    -> Đã nén: {processed}/{total_files} file ({percent:.1f}%)")

    elapsed = time.time() - start_time
    zip_size_mb = output_zip.stat().st_size / (1024 * 1024)

    print("=" * 60)
    print("  ĐÓNG GÓI THÀNH CÔNG!")
    print(f"[*] File nén: {output_zip}")
    print(f"[*] Dung lượng file zip: {zip_size_mb:.1f} MB")
    print(f"[*] Thời gian nén: {elapsed:.1f} giây")
    print("=" * 60)

if __name__ == "__main__":
    main()
