# Hướng Dẫn Triển Khai Bằng Docker (Docker Compose)

Dự án đã được đóng gói hoàn chỉnh bằng Docker với kiến trúc chuẩn:
- **Backend**: Container Python 3.11/Playwright (FastAPI + Chromium + SQLite), cổng `5000`.
- **Frontend**: Container Nginx phục vụ ứng dụng React đã build production, kiêm Reverse Proxy chuyển tiếp `/api/` về Backend, cổng `3000` (ánh xạ cổng 80 của Nginx).
- **Persistent Data**: Thư mục dữ liệu `Backend/data` (chứa `hrc2_database.sqlite`) và `Backend/exports` (các file Excel xuất) được gắn volume trực tiếp ra máy chủ/máy host để không bị mất dữ liệu khi restart hoặc nâng cấp container.

---

## 1. Yêu cầu trước khi chạy
- Máy tính hoặc máy chủ đã cài đặt **Docker** và **Docker Compose** (trên Windows có thể cài [Docker Desktop](https://www.docker.com/products/docker-desktop/)).

---

## 2. Các lệnh khởi chạy

### Khởi động toàn bộ hệ thống (chạy ngầm):
```bash
docker compose up -d --build
```
> Lệnh này sẽ tự động:
> 1. Build container Backend: cài đặt các thư viện Python và Chromium cho Playwright.
> 2. Build container Frontend: biên dịch React sang file tĩnh và nạp vào Nginx.
> 3. Tự động kết nối 2 container qua mạng nội bộ `tddh_network`.

### Xem logs quá trình chạy thời gian thực:
```bash
docker compose logs -f
```
Xem riêng log Backend:
```bash
docker compose logs -f backend
```

### Dừng toàn bộ hệ thống:
```bash
docker compose down
```

### Khởi động lại hệ thống:
```bash
docker compose restart
```

---

## 3. Truy cập ứng dụng
Sau khi khởi động thành công:
- **Giao diện Web (Frontend)**: [http://localhost:3000](http://localhost:3000)
- **API Backend**: [http://localhost:5000](http://localhost:5000)
- **Swagger API Docs**: [http://localhost:5000/docs](http://localhost:5000/docs)

---

## 4. Dữ liệu và Sao lưu (Persistent Volumes)
Dữ liệu được lưu trực tiếp trên ổ đĩa máy host tại:
- `Backend/data/hrc2_database.sqlite`: File cơ sở dữ liệu chính.
- `Backend/exports/`: Các file Excel xuất theo tháng (`Thang_1.xlsx` .. `Thang_12.xlsx`, `Tong_Hop_QC_HRC2.xlsx`).
- `Backend/uploads/`: Các file đính kèm/tải lên.

Khi bạn cập nhật code mới hoặc xóa container (`docker compose down`), toàn bộ dữ liệu trên không bao giờ bị mất.
