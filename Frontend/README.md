# 🌟 Beauty Spa App (React)

Ứng dụng quản lý & đặt lịch dịch vụ làm đẹp, bao gồm hệ thống Backend (Node.js + MongoDB) và Frontend (ReactJS + Tailwind CSS).

Dự án: Xây dựng hệ thống quản lý chuỗi beauty spa tích hợp AI tư vấn trực tuyến & đặt lịch hẹn trải nghiệm dịch vụ - Dự án của nhóm sinh viên Đỗ Cao Thắng

## 👥 Với các thành viên:
```
| STT | Họ và Tên         | Mã Số Sinh Viên   | Vai Trò Trong Dự Án              |
|-----|-------------------|-------------------|----------------------------------|
| 1   | Đỗ Cao Thắng      | 123456789         | Trưởng nhóm, Backend, tài liệu   |
| 2   | Huỳnh Hồng Sơn    | 987654321         | Frontend, tài liệu               |
| 3   | Lê Ngọc Thanh Nam | 112233445         | Frontend, tài liệu               |
| 4   | Võ Duy Thuyết     | 556677889         | Frontend, tài liệu               |
| 5   | Trần Văn Tín      | 998877665         | Backend, tài liệu                |



```
# 🖥️ Backend (Node.js + Express + MongoDB)
```bash
# Cài đặt thư viện
npm install
# Khởi chạy server
npm run server
# Một số thư mục cấu trúc Backend
📁 Cấu trúc backend/
├── ⚙️ config/              # Cấu hình hệ thống
│   └── 🗄️ db.js            # Kết nối MongoDB
├── 📂 controllers/         # Xử lý nghiệp vụ
│   ├── 📦 productController.js
│   ├── 👤 userController.js
│   └── 🛒 cartController.js
├── 📂 models/              # Mô hình MongoDB
│   ├── 📦 product.js
│   ├── 👤 user.js
│   └── 🛒 cart.js
├── 📂 routes/              # Định tuyến API
│   ├── 📦 productRoutes.js
│   ├── 👤 userRoutes.js
│   └── 🛒 cartRoutes.js
├── 🛡️ middleware/          # Middleware xác thực, lỗi,...
├── 🛠️ utils/               # Hàm tiện ích dùng chung
├── 📤 uploads/             # Lưu file người dùng upload
├── 🧪 .env                 # Biến môi trường
├── 🚀 server.js            # Điểm khởi động chính
├── 📄 package.json
└── 📘 README.md

```
## 🚀 Frontend (ReactJS + Tailwind CSS).
```bash
# 📦 Cài đặt các thư viện phụ thuộc (dùng nếu gặp xung đột phiên bản)
npm install --legacy-peer-deps
npm install --force

# 🚀 Khởi chạy ứng dụng
npm start
# Một số thư mục Frontend
📁 Cấu trúc thư mục frontend
📁src/
├── 📁 APIs/                # Gọi API backend
│   └── 🧾 ProductsApi.js, ServiceAPI.js, UserAPI.js, ...
├── 📁 components/          # UI tái sử dụng
│   ├── 📁 ComponentManagement/  # Quản lý: Blog, Booking, Brand, Category,...
│   ├── 🔝 BackToTop.js
│   ├── 📄 Footer.js
│   ├── 🧭 Header.js
│   ├── 🖼️ Hero.js
│   ├── 💬 Mess.jsx
│   ├── 👤 ProfileTab.jsx
│   ├── 💄 ServiceDetail.jsx
│   ├── 🔍 Search.jsx
│   ├── 🛍️ OneProduct.jsx
│   └── 💆 OneService.jsx
├── 📁 context/             # Context API quản lý trạng thái
│   └── 🧠 AuthContext.js
├── 📁 pages/               # Các trang chính
│   ├── 🏠 Home.jsx
│   ├── 💇 ServicePage.jsx / 💄 ServiceDetailPage.jsx
│   ├── 🛍️ ProductPage.jsx / 📦 ProductDetailsPage.jsx
│   ├── 📝 SignUpPage.jsx / 🔐 SignInPage.jsx / ❓ ForgotPassword.jsx
│   ├── 🛒 Cart.jsx / 💳 Payment.jsx / ✅ OrderConfirmation.jsx
│   ├── 🎟️ MyVouchers.jsx / 🏷️ SuperVouchers.jsx
│   ├── 📅 BookServicePage.jsx / 👤 Profile.jsx
│   ├── 📰 BlogPage.jsx / 📞 Contacts.jsx / 📄 About.jsx
│   ├── 👔 Manager.jsx / 🛠️ Admin.jsx
│   └── 🚫 Page404.jsx
├── 📁 utils/               # Hàm tiện ích chung
├── 🚀 index.js             # Điểm khởi động React
├── 🧠 App.js               # Root App + định tuyến
├── 🌐 i18n.js              # Đa ngôn ngữ (i18n)
├── 🌀 tailwind.config.js   # Cấu hình Tailwind

