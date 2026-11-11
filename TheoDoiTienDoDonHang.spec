# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files, collect_submodules
import sys
from pathlib import Path

block_cipher = None

# Collect playwright & uvicorn
playwright_datas = collect_data_files('playwright')
playwright_hidden = collect_submodules('playwright')
uvicorn_hidden = collect_submodules('uvicorn')

added_datas = [
    (r'D:/Tong Hop Code/Theo dõi tiến độ đơn hàng/Frontend/build', 'build'),
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
    [r'D:/Tong Hop Code/Theo dõi tiến độ đơn hàng/Backend/run_app.py'],
    pathex=[r'D:/Tong Hop Code/Theo dõi tiến độ đơn hàng/Backend'],
    binaries=[],
    datas=added_datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
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
    icon=r'D:/Tong Hop Code/Theo dõi tiến độ đơn hàng/Frontend/build/Logo_Hoa_Phat.ico' if Path(r'D:/Tong Hop Code/Theo dõi tiến độ đơn hàng/Frontend/build/Logo_Hoa_Phat.ico').exists() else None,
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
