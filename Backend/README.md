# Backend API

## Cấu hình và chạy

1. Sao chép `.env.example` thành `.env` trên máy chạy Backend và điền các giá trị riêng tại đó. Với MongoDB Atlas, dùng connection string lấy từ Atlas, mã hóa URL cho username/password nếu có ký tự đặc biệt, và thêm IP máy chạy ứng dụng vào **Network Access**. Không commit `.env`.
2. Cài dependencies, tải Chromium cho Playwright và chạy Backend:

```bash
npm install
npx playwright install chromium
npm start
```

Backend chỉ bind loopback theo mặc định. `HOST` và `PORT` trong `.env` quyết định địa chỉ thực tế. Khi bind ra địa chỉ không-loopback, phải cấu hình cả `APP_USER` và `APP_PASSWORD`; các API được bảo vệ bằng HTTP Basic Auth. Thông tin QC và MongoDB chỉ được đọc trên Backend, không chuyển xuống React.

Trong lúc phát triển, dùng `npm run dev` để tự khởi động lại khi file thay đổi. Mặc định Backend không khởi động nếu MongoDB không kết nối được. Chỉ đặt `MONGO_REQUIRED_ON_START=false` khi chủ động chạy các chức năng không dùng database; các API lưu/đọc dữ liệu vẫn cần MongoDB. Nếu gặp lỗi TLS, kiểm tra URI đúng cluster, Network Access và firewall/proxy của mạng đang dùng; không tắt xác thực chứng chỉ TLS.

Backend mặc định dùng cổng `5000`, khớp với địa chỉ API mặc định của Frontend. Nếu đổi cổng Backend, đặt `REACT_APP_API_URL` trong `Frontend/.env` trỏ đến địa chỉ mới, ví dụ `http://localhost:8080`. Sau khi đổi `.env` của Frontend, khởi động lại `npm start` để React nạp cấu hình mới.

## Tài khoản người dùng

Đăng ký và đăng nhập bằng tên đăng nhập cùng mật khẩu; không yêu cầu email. Tên đăng nhập được chuẩn hóa không phân biệt chữ hoa/thường, dài 3–32 ký tự. Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt. Tài khoản đăng ký mới luôn có quyền `user`; không nhận quyền từ dữ liệu gửi lên trình duyệt. Khôi phục mật khẩu qua email hiện chưa được bật; người dùng đã đăng nhập vẫn có thể đổi mật khẩu.

## Xuất từ website QC

Trang Frontend `/export` cho chọn nhà máy trong danh sách QC, chọn ngày giờ bằng bộ chọn lịch và nhập danh sách mã cuộn tùy chọn. Backend tạo tác vụ xếp hàng, đăng nhập bằng `QC_USERNAME`/`QC_PASSWORD`, thao tác các trường CSS cấu hình và chờ website tải Excel. Frontend theo dõi trạng thái tác vụ và cho phép tải file. Các giá trị nhà máy phải nằm trong danh sách Backend cung cấp; Backend sẽ chọn đúng option tương ứng trên website QC.

Các selector đăng nhập có thể để trống để dùng bộ chọn form phổ biến. Selector mở form xuất mặc định là `button[onclick="openExportModal()"]`; các selector nhà máy, ngày giờ và nút tải mặc định theo form QC hiện tại. Thay chúng bằng selector thực tế nếu HTML của website thay đổi. `CSS_COIL_IDS` có thể để trống nếu không dùng bộ lọc mã cuộn.

Trang xuất QC cho chọn báo cáo đích đã lưu; khi xuất thành công, workbook và các dòng dữ liệu của đúng báo cáo được chọn sẽ bị thay thế trong một transaction. File tải xuống dùng tên báo cáo đích. Tải Excel thủ công tiếp tục cập nhật báo cáo mặc định `_id=6adf6dc6c603752d3ddd162d` với tên `Tong_Hop_QC_HRC2.xlsx`. `KEEP_LOCAL_EXPORT=true` giữ file tải từ QC dưới thư mục `Backend/exports`; nếu tắt, file tạm được xóa sau khi tải hoặc sau 30 phút.

## API Dashboard QC

| Method | Route | Mô tả |
| --- | --- | --- |
| `GET` | `/api/qc/health` | Kiểm tra kết nối MongoDB |
| `GET` | `/api/qc/exports/config` | Trạng thái cấu hình export; không trả credential |
| `POST` | `/api/qc/exports` | Tạo tác vụ export; trả HTTP `202` và `job` |
| `GET` | `/api/qc/exports/jobs/:jobId` | Đọc trạng thái tác vụ |
| `GET` | `/api/qc/exports/jobs/:jobId/file` | Tải file đã xuất |
| `GET` | `/api/qc/dashboard-summary` | Tổng số báo cáo, dòng Excel, sheet và dung lượng |
| `GET` | `/api/qc/reports?limit=20&offset=0&search=` | Danh sách báo cáo có phân trang/tìm tên file |
| `POST` | `/api/qc/reports` | Tải Excel có sẵn qua multipart field `file` |
| `GET` | `/api/qc/reports/:reportId/rows?sheet=&limit=50&offset=0` | Đọc dữ liệu theo báo cáo/sheet |
| `GET` | `/api/qc/reports/:reportId/file` | Tải lại file Excel gốc |

Yêu cầu tạo tác vụ export:

```json
{
  "factory": "HRC2",
  "fromDate": "2026-10-01T00:00",
  "toDate": "2026-10-26T23:59",
  "coilIds": ""
}
```

Thời gian được nhập theo giờ địa phương của máy chạy trình duyệt. Mặc định giao diện chọn từ 00:00 đến 23:59 trong ngày hiện tại. Website QC nhận cả giờ nếu trường ngày của website hỗ trợ `datetime-local`; với trường chỉ nhận ngày, Backend gửi phần ngày như trước.

Chỉ nhận `.xlsx` và `.xls` cho file tải lên trực tiếp; giới hạn file tải lên 10 MB. Dữ liệu được đọc từ tất cả sheet có nội dung, với dòng đầu tiên là tiêu đề. Metadata/file gốc lưu trong `qcreports`, các dòng dữ liệu lưu trong `qcrows`.
