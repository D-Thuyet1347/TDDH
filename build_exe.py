import os
import sys
import shutil
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "Backend"
FRONTEND_BUILD_DIR = ROOT_DIR / "Frontend" / "build"
ICON_PATH = FRONTEND_BUILD_DIR / "Logo_Hoa_Phat.ico"

spec_content = f"""# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files, collect_submodules
import sys
from pathlib import Path

block_cipher = None

# Collect playwright & uvicorn
playwright_datas = collect_data_files('playwright')
playwright_hidden = collect_submodules('playwright')
uvicorn_hidden = collect_submodules('uvicorn')

added_datas = [
    (r'{str(FRONTEND_BUILD_DIR).replace(os.sep, "/")}', 'build'),
] + playwright_datas

hidden_imports = list(set(
    playwright_hidden + 
    uvicorn_hidden + [
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespans',
        'uvicorn.lifespans.on',
        'fastapi',
        'starlette',
        'pydantic',
        'sqlite3',
        'openpyxl',
        'xlsxwriter',
        'dotenv',
        'bcrypt',
        'jwt',
        'multipart',
        'config',
        'config.settings',
        'config.db',
        'routers.qc_router',
        'routers.nc_router',
        'routers.user_router',
        'routers.skin_router',
        'services.qc_export_service',
        'services.qc_auto_export_service',
        'services.qc_report_service',
        'services.nc_report_service',
        'services.skin_service',
        'services.user_service',
    ]
))

a = Analysis(
    [r'{str(BACKEND_DIR / "run_app.py").replace(os.sep, "/")}'],
    pathex=[r'{str(BACKEND_DIR).replace(os.sep, "/")}'],
    binaries=[],
    datas=added_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={{}},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'scipy', 'numpy.testing', 'IPython', 'pytest'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='TheoDoiTienDoDonHang',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=r'{str(ICON_PATH).replace(os.sep, "/")}' if Path(r'{str(ICON_PATH).replace(os.sep, "/")}').exists() else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='TheoDoiTienDoDonHang',
)
"""

def main():
    print("=== BẮT ĐẦU ĐÓNG GÓI ỨNG DỤNG THEO DÕI TIẾN ĐỘ ĐƠN HÀNG (.EXE) ===")
    
    spec_file = ROOT_DIR / "TheoDoiTienDoDonHang.spec"
    with open(spec_file, "w", encoding="utf-8") as f:
        f.write(spec_content)
    print(f"[*] Đã tạo file cấu hình PyInstaller: {spec_file.name}")

    # Chạy PyInstaller
    cmd = [sys.executable, "-m", "PyInstaller", "--noconfirm", str(spec_file)]
    print(f"[*] Đang thực thi lệnh build: {' '.join(cmd)}")
    
    res = subprocess.run(cmd, cwd=str(ROOT_DIR))
    if res.returncode != 0:
        print("[!] Đóng gói thất bại.")
        sys.exit(res.returncode)

    dist_app_dir = ROOT_DIR / "dist" / "TheoDoiTienDoDonHang"
    print(f"[*] Đóng gói thành công vào thư mục: {dist_app_dir}")

    # Copy / Link database
    dist_data_dir = dist_app_dir / "data"
    dist_data_dir.mkdir(parents=True, exist_ok=True)
    
    src_db = BACKEND_DIR / "data" / "hrc2_database.sqlite"
    dst_db = dist_data_dir / "hrc2_database.sqlite"
    
    if src_db.exists():
        print(f"[*] Đang sao chép cơ sở dữ liệu mới nhất ({src_db.stat().st_size / (1024*1024):.1f} MB)...")
        shutil.copy2(src_db, dst_db)
        print("[*] Đã sao chép cơ sở dữ liệu thành công.")

    # Tạo thư mục exports và uploads
    (dist_app_dir / "exports").mkdir(parents=True, exist_ok=True)
    (dist_app_dir / "uploads").mkdir(parents=True, exist_ok=True)

    # Copy .env
    src_env = BACKEND_DIR / ".env"
    if src_env.exists():
        shutil.copy2(src_env, dist_app_dir / ".env")
        print("[*] Đã sao chép file .env")

    # Tự động sao chép Chromium headless shell để xuất QC chạy được 100% trên mọi máy khác
    local_app_data = os.getenv("LOCALAPPDATA", "")
    if local_app_data:
        shell_src = Path(local_app_data) / "ms-playwright" / "chromium_headless_shell-1248" / "chrome-headless-shell-win64"
        if shell_src.exists():
            shell_dst = dist_app_dir / "browsers" / "chrome-headless-shell-win64"
            if not shell_dst.exists():
                print(f"[*] Đang sao chép Chromium Headless Shell sang bản build ({shell_src.name})...")
                shutil.copytree(shell_src, shell_dst)
                print("[*] Đã sao chép Chromium Headless Shell thành công (Đảm bảo xuất file QC mượt mà trên mọi máy)!")

    # Tạo file batch khởi động tiện lợi Chay_Ung_Dung.bat
    bat_content = """@echo off
title He Thong Theo Doi Tien Do Don Hang HRC2
cd /d "%~dp0"
start TheoDoiTienDoDonHang.exe
exit
"""
    bat_file = dist_app_dir / "Chay_Ung_Dung.bat"
    with open(bat_file, "w", encoding="utf-8") as f:
        f.write(bat_content)

    # Tạo file hướng dẫn người dùng
    readme_dist = dist_app_dir / "HUONG_DAN_SU_DUNG.txt"
    readme_text = """===============================================================
       HỆ THỐNG THEO DÕI TIẾN ĐỘ ĐƠN HÀNG HRC2 (BẢN PORTABLE)
===============================================================

CÁCH SỬ DỤNG TRÊN MÁY TÍNH KHÁC:
1. Sao chép toàn bộ thư mục này ("TheoDoiTienDoDonHang") sang máy tính khác
   (qua USB, Zalo, Google Drive, hoặc mạng LAN).
2. Nhấp đúp vào file "TheoDoiTienDoDonHang.exe" hoặc "Chay_Ung_Dung.bat".
3. Trình duyệt web (Edge/Chrome) sẽ tự động mở trang web: http://localhost:5000.
4. Mọi dữ liệu đơn hàng và file xuất Excel sẽ được lưu tự động trong các thư mục:
   - "data/hrc2_database.sqlite": Cơ sở dữ liệu chính
   - "exports/": Thư mục chứa các file Excel xuất báo cáo
   - "uploads/": Thư mục chứa file tải lên

LƯU Ý:
- KHÔNG CẦN cài đặt Python, Node.js hay bất kỳ phần mềm nào khác.
- Đã tích hợp sẵn trình duyệt Microsoft Edge có sẵn trên Windows 10/11.
===============================================================
"""
    with open(readme_dist, "w", encoding="utf-8") as f:
        f.write(readme_text)

    print("\n" + "=" * 60)
    print(" HOÀN TẤT ĐÓNG GÓI!")
    print(f" Thư mục ứng dụng đã sẵn sàng tại: {dist_app_dir}")
    print(" Người dùng chỉ cần sao chép thư mục này sang máy khác là chạy ngay.")
    print("=" * 60)

if __name__ == "__main__":
    main()
