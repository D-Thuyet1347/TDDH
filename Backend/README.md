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

Trang Frontend `/export` cho chọn nhà máy trong danh sách QC, chọn ngày giờ bằng bộ chọn lịch và nhập danh sách mã cuộn tùy chọn. Khi nhấn bắt đầu, Backend tạo trước metadata báo cáo QC trong database `hrc2_qc` nếu chưa có rồi xếp tác vụ vào hàng đợi; khi xuất xong, file và dữ liệu được ghi vào báo cáo đích đó. Backend đăng nhập bằng `QC_USERNAME`/`QC_PASSWORD`, thao tác các trường CSS cấu hình và chờ website tải Excel. Frontend theo dõi trạng thái tác vụ và cho phép tải file. Các giá trị nhà máy phải nằm trong danh sách Backend cung cấp; Backend sẽ chọn đúng option tương ứng trên website QC.

Các selector đăng nhập có thể để trống để dùng bộ chọn form phổ biến. Selector mở form xuất mặc định là `button[onclick="openExportModal()"]` và form xuất là `#exportExcelModal`; selector nhà máy mặc định là `#expFactory`, còn selector ngày giờ và nút tải mặc định theo form QC hiện tại. Nếu form thay đổi, cập nhật `CSS_EXPORT_FORM`. Nếu selector ngày bắt đầu/kết thúc không khớp, Backend tự tìm các trường ngày theo `id`, `name`, placeholder, nhãn liên kết hoặc kiểu input ngày trong form xuất; nếu chỉ có đúng hai trường ngày không có nhãn phân biệt, Backend dùng thứ tự hiển thị. Có thể đặt `CSS_FROM_DATE` và `CSS_TO_DATE` để chỉ định selector chính xác. Nếu `CSS_FACTORY` không còn khớp, Backend tự tìm `<select>` trong form xuất có đủ các option nhà máy; trường `<select>` có thể bị ẩn sau bộ chọn tùy chỉnh. Thay các selector bằng selector thực tế nếu HTML của website thay đổi. `CSS_COIL_IDS` có thể để trống nếu không dùng bộ lọc mã cuộn.

Trang xuất QC cho chọn báo cáo đích đã lưu; khi xuất thành công, workbook và các dòng dữ liệu của đúng báo cáo được chọn sẽ bị thay thế trong một transaction. File tải xuống dùng tên báo cáo đích. Tải Excel thủ công tiếp tục cập nhật báo cáo mặc định `_id=6adf6dc6c603752d3ddd162d` với tên `Tong_Hop_QC_HRC2.xlsx`. `KEEP_LOCAL_EXPORT=true` giữ file tải từ QC dưới thư mục `Backend/exports`; nếu tắt, file tạm được xóa sau khi tải hoặc sau 30 phút.

Nút **Bật Auto** lưu bộ lọc vào MongoDB và bắt đầu xuất ngay trên Backend; các lần tiếp theo chạy sau mỗi 5 phút kể từ khi tác vụ trước hoàn tất để tránh xuất chồng. Lịch vẫn chạy khi đóng trang và được khôi phục khi Backend khởi động lại. Nút **Tắt Auto** ngăn các lần xuất mới; tác vụ đang chạy sẽ hoàn tất. Mỗi lần nhập tự động ghi đè báo cáo đích theo bộ lọc đã lưu.

## API Dashboard QC

| Method | Route | Mô tả |
| --- | --- | --- |
| `GET` | `/api/qc/health` | Kiểm tra kết nối MongoDB |
| `GET` | `/api/qc/exports/config` | Trạng thái cấu hình export; không trả credential |
| `POST` | `/api/qc/exports` | Tạo tác vụ export; trả HTTP `202` và `job` |
| `GET` | `/api/qc/exports/auto` | Đọc trạng thái lịch xuất QC tự động |
| `PUT` | `/api/qc/exports/auto` | Lưu bộ lọc và bật lịch xuất QC tự động |
| `DELETE` | `/api/qc/exports/auto` | Tắt các lần xuất tự động tiếp theo |
| `GET` | `/api/qc/exports/jobs/:jobId` | Đọc trạng thái tác vụ |
| `GET` | `/api/qc/exports/jobs/:jobId/file` | Tải file đã xuất |
| `GET` | `/api/qc/dashboard-summary` | Tổng số báo cáo, dòng Excel, sheet và dung lượng |
| `GET` | `/api/qc/reports?limit=20&offset=0&search=` | Danh sách báo cáo có phân trang/tìm tên file |
| `POST` | `/api/qc/reports` | Tải file Excel báo cáo QC qua multipart field `file` |
| `GET` | `/api/qc/reports/:reportId/rows?sheet=&limit=50&offset=0` | Đọc dữ liệu theo báo cáo/sheet |
| `GET` | `/api/qc/reports/:reportId/quality-summary` | Tổng hợp phân loại toàn file, theo ngày và ID GỐC theo hướng xử lý SKIN/SKIN_CUST |
| `GET` | `/api/qc/reports/:reportId/file` | Tải lại file Excel gốc |
| `GET` | `/api/nc/reports?limit=100&offset=0&search=` | Danh sách báo cáo nhu cầu đơn hàng |
| `POST` | `/api/nc/reports` | Nhập workbook nhu cầu qua multipart field `file` |
| `GET` | `/api/nc/reports/:reportId/file` | Tải workbook `Tong_Hop_Don_Hang_HRC2.xlsx` |
| `GET` | `/api/nc/reports/:reportId/sheets/:sheetName/rows?search=&filters=&limit=50&offset=0` | Tìm kiếm/lọc dòng trong database dùng chung `hrc2_qc` |
| `POST` | `/api/nc/reports/:reportId/sheets/:sheetName/rows` | Thêm dòng nhu cầu với body `{ "values": { "tên cột": "giá trị" } }` |
| `PUT` | `/api/nc/reports/:reportId/sheets/:sheetName/rows/:rowId` | Cập nhật một dòng nhu cầu |
| `DELETE` | `/api/nc/reports/:reportId/sheets/:sheetName/rows/:rowId` | Xóa một dòng nhu cầu |

Frontend hiển thị danh sách sheet trong trang dữ liệu; mỗi sheet mở được thành trang riêng tại `/sheets/:sheetName`. Sheet **Nhu cầu đơn hàng HRC** có trang tra cứu chuyên biệt tại `/orders`, với lọc từng cột, tìm kiếm toàn sheet, sao chép nhanh một đơn hàng thành dòng mới và phân trang được xử lý ở Backend. Tham số `filters` là JSON object có tên cột làm key và chuỗi tìm kiếm làm value; tối đa 50 cột lọc trong một yêu cầu.

Yêu cầu tạo tác vụ export:

```json
{
  "factory": "HRC2",
  "fromDate": "2026-10-01T00:00",
  "toDate": "2026-10-26T23:59",
  "coilIds": ""
}
```

Thời gian được nhập theo giờ địa phương của máy chạy trình duyệt. Mặc định giao diện chọn từ ngày đầu tháng hiện tại lúc 08:00 đến ngày hiện tại lúc 08:00; người dùng có thể chỉnh trước khi xuất. Website QC nhận cả giờ nếu trường ngày của website hỗ trợ `datetime-local`; với trường chỉ nhận ngày, Backend gửi phần ngày như trước.

Chỉ nhận `.xlsx` và `.xls` cho file tải lên trực tiếp; giới hạn file tải lên 20 MB và 100.000 dòng dữ liệu mặc định (`MONGODB_MAX_ROWS` để điều chỉnh). Trang tải file cho chọn loại `qc` hoặc `order-demand`. Cả báo cáo QC và nhu cầu đơn hàng dùng chung database `hrc2_qc`: QC lưu qua `/api/qc`, còn đơn hàng lưu qua `/api/nc` trong collection `Tong_Hop_Don_Hang_HRC2`; metadata đơn hàng ở collection `Tong_Hop_Don_Hang_HRC2_Reports`, workbook ở GridFS bucket `ncworkbooks`. Workbook đầu ra `Tong_Hop_Don_Hang_HRC2.xlsx` có thể tải qua `/api/nc/reports/:reportId/file`. Backend tạo collection và index khi khởi động có kết nối MongoDB; metadata, workbook và các dòng đơn hàng cũ trong database `TDDHHRC2` được chuyển sang database dùng chung khi truy cập báo cáo/dữ liệu.
