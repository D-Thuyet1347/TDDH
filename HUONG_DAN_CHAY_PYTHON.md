# HƯỚNG DẪN KHỞI ĐỘNG VÀ SỬ DỤNG BACKEND PYTHON (SQLITE)

Toàn bộ hệ thống Backend đã được chuyển đổi hoàn toàn sang **Python (FastAPI + Playwright + SQLite + Openpyxl)**:
- **Cơ sở dữ liệu**: Đã chuyển sang **SQLite cục bộ** (`Backend/data/hrc2_database.sqlite`) tích hợp sẵn trong Python.
  - **Dễ sử dụng 100%**: Không cần cài đặt thêm bất kỳ phần mềm server hay cấu hình port nào.
  - **Miễn phí 100%**: Hoàn toàn miễn phí, độc lập.
  - **Lưu trữ dữ liệu KHÔNG GIỚI HẠN**: Không bị giới hạn 512MB như MongoDB Atlas đám mây; dung lượng lưu trữ tương đương toàn bộ dung lượng ổ cứng của bạn (hỗ trợ file CSDL lên tới 281 Terabyte).
  - **Tốc độ cực nhanh**: Đọc ghi trực tiếp trên ổ đĩa SSD/HDD với chế độ WAL (Write-Ahead Logging), tối ưu đa luồng.
  - **Bảo toàn dữ liệu**: Toàn bộ hơn 207.000 dòng dữ liệu cũ từ MongoDB Atlas đã được tự động di chuyển nguyên vẹn sang SQLite!

---

## 1. Cấu trúc thư mục `Backend`

```
Backend/
├── data/
│   └── hrc2_database.sqlite        # Tệp CSDL SQLite chính (chứa toàn bộ dữ liệu người dùng, báo cáo QC, đơn hàng)
├── run.py                          # Script khởi động uvicorn server
├── main.py                         # App FastAPI chính, middleware CORS, static mounts, lifespan
├── requirements.txt                # Thư viện phụ thuộc
├── config/
│   ├── settings.py                 # Đọc cấu hình .env, selector website QC, đường dẫn file
│   └── db.py                       # Quản lý kết nối SQLite thread-safe, tạo bảng & index tự động
├── routers/
│   ├── qc_router.py                # Toàn bộ API /api/qc/* (xuất file, import, dashboard, thống kê)
│   ├── nc_router.py                # Toàn bộ API /api/nc/* (báo cáo nhu cầu, sheets, sync)
│   └── user_router.py              # Toàn bộ API /api/user/* (đăng nhập, danh sách, CRUD user)
├── services/
│   ├── qc_export_service.py        # Crawler Playwright tự động, logic ca 8:00 AM -> 8:00 AM, xuất 12 file tháng + file tổng hợp Tong_Hop_QC_HRC2.xlsx, zip
│   ├── qc_auto_export_service.py   # Quản lý tác vụ chạy nền định kỳ tự động xuất theo lịch
│   ├── qc_report_service.py        # Đọc/ghi báo cáo QC từ Excel, import SQLite, tra cứu cuộn
│   └── nc_report_service.py        # Xử lý báo cáo nhu cầu đơn hàng, phân tích sheet, đồng bộ dữ liệu
├── exports/                        # Thư mục lưu trữ các file Excel xuất từ QC
└── uploads/                        # Thư mục lưu trữ file người dùng tải lên
```

---

## 2. Cách khởi động Backend Python

### Cách 1: Click chạy file Batch (Khuyên dùng trên Windows)
- Bấm đúp vào file:
  `start_python_backend.bat`
- Server sẽ chạy tại: `http://localhost:5000`

### Cách 2: Chạy lệnh Terminal / PowerShell
```powershell
cd Backend
python run.py
```

### Cách 3: Chạy bằng file PowerShell
```powershell
.\start_python_backend.ps1
```

---

## 3. Các tính năng cốt lõi đã hoàn thiện trên Python + SQLite

1. **Chu kỳ xuất ca 8:00 AM -> 8:00 AM**:
   - Khi xuất tháng (ví dụ Tháng 10): từ `10/01/2026 08:00:00` đến `11/01/2026 08:00:00`.
   - Khi chọn tùy chỉnh (Custom range): hỗ trợ định dạng `mm/dd/yyyy hh:mm:ss`.

2. **Xuất 12 file tháng và 1 file tổng hợp**:
   - Tự động tạo `Thang_1.xlsx` đến `Thang_12.xlsx`.
   - Tự động gộp dữ liệu các tháng vào `Tong_Hop_QC_HRC2.xlsx` (đánh lại số thứ tự `STT` liên tục).
   - Tải lẻ từng file hoặc tải toàn bộ dạng `.zip` qua URL `?zip=true`.

3. **Cơ sở dữ liệu SQLite cục bộ không giới hạn**:
   - Lưu trữ trực tiếp tại `Backend/data/hrc2_database.sqlite`.
   - Đã tạo các chỉ mục (INDEX) trên `report_id`, `coil_id`, `order_id`, `tdc_code` giúp tra cứu ngay lập tức.
   - Hoàn toàn độc lập với internet, không phụ thuộc vào server ngoại mạng.

4. **Tương thích 100% với Frontend React**:
   - Tất cả các endpoint `/api/qc/*`, `/api/nc/*`, `/api/user/*`, `/uploads/*`, `/exports/*` hoạt động chuẩn xác theo schema của React Frontend.
