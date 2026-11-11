@echo off
chcp 65001 >nul
echo ========================================================
echo   DANG NEN THU MUC THANH FILE ZIP DE MANG SANG MAY KHAC...
echo ========================================================
powershell -Command "Compress-Archive -Path 'TheoDoiTienDoDonHang' -DestinationPath 'TheoDoiTienDoDonHang_Portable.zip' -Force"
echo.
echo HOAN TAT! File zip da duoc tao: TheoDoiTienDoDonHang_Portable.zip
pause
