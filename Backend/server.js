import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { timingSafeEqual } from "crypto";
import mongoose from "mongoose";
import "dotenv/config";
import { connectDB } from "./config/db.js";
import { ensureUserIndexes } from "./models/userModel.js";
import { initializeNcModel } from "./models/ncModel.js";
import { initializeNcReportModel } from "./models/ncReportModel.js";
import { initializeQcAutoExport } from "./services/qcAutoExportService.js";

// Import routers
import userRouter from "./routes/userRouter.js";
import qcRouter from "./routes/qcRouter.js";
import ncRouter from "./routes/ncRouter.js";
import { syncNcWithQc } from "./controllers/ncController.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "5000", 10);
const host = process.env.HOST || "127.0.0.1";
const appUser = process.env.APP_USER || "";
const appPassword = process.env.APP_PASSWORD || "";
const loopbackHost = host === "localhost" || host === "::1" || host.startsWith("127.");

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT phải là số từ 1 đến 65535.");
}
if (Boolean(appUser) !== Boolean(appPassword)) {
  throw new Error("APP_USER và APP_PASSWORD phải được cấu hình cùng lúc.");
}
if (!loopbackHost && (!appUser || !appPassword)) {
  throw new Error("APP_USER và APP_PASSWORD là bắt buộc khi HOST không phải loopback.");
}

// ===================== MIDDLEWARE =====================
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
if (appUser && appPassword) {
  const expected = Buffer.from(`${appUser}:${appPassword}`);
  app.use("/api", (req, res, next) => {
    if (req.method === "OPTIONS") return next();
    const authorization = req.headers.authorization || "";
    const suppliedText = authorization.startsWith("Basic ")
      ? Buffer.from(authorization.slice(6), "base64").toString("utf8")
      : "";
    const supplied = Buffer.from(suppliedText);
    const matches = supplied.length === expected.length &&
      timingSafeEqual(supplied, expected);
    if (matches) return next();
    res.setHeader("WWW-Authenticate", 'Basic realm="HRC2 QC"');
    return res.status(401).json({ message: "Yêu cầu đăng nhập." });
  });
}

// ===================== TẠO THƯ MỤC UPLOADS =====================
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ===================== STATIC FILES =====================
// Cho phép truy cập ảnh qua 2 đường dẫn
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/images", express.static(path.join(process.cwd(), "uploads")));

// ===================== ROUTES =====================
app.use("/api/user", userRouter);
app.use("/api/qc", qcRouter);
app.use("/api/nc", ncRouter);
app.all("/api/sync-qc", syncNcWithQc);
app.all("/api/nc/reports/:reportId/sync-qc", syncNcWithQc);
app.all("/api/qc/reports/:reportId/sync-qc", syncNcWithQc);
app.all("/api/reports/:reportId/sync-qc", syncNcWithQc);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "File Excel không được vượt quá 20 MB."
      : "Không thể nhận file Excel trong yêu cầu này.";
    return res.status(status).json({ message });
  }
  console.error("API request error:", error.message);
  return res.status(500).json({ message: "Lỗi máy chủ khi xử lý yêu cầu." });
});

// ===================== HEALTH CHECK =====================
app.get("/", (req, res) => {
  res.send("API Server is running...");
});

// ===================== START SERVER =====================
const startServer = async () => {
  const isDatabaseConnected = await connectDB();
  if (isDatabaseConnected) {
    await ensureUserIndexes();
    await initializeNcModel().createIndexes();
    await initializeNcReportModel().createIndexes();
    await initializeQcAutoExport();
  }
  const server = app.listen(port, host, () => {
    console.log(`Server started on http://${host}:${port}`);
  });
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Không thể khởi động Backend: cổng ${port} trên ${host} đang được sử dụng. Hãy tắt Backend cũ hoặc đổi PORT trong .env.`
      );
    } else {
      console.error("Unable to start server:", error.message);
    }

    void mongoose.disconnect().then(
      () => {
        process.exitCode = 1;
      },
      (disconnectError) => {
        console.error("Unable to close MongoDB connection:", disconnectError.message);
        process.exitCode = 1;
      }
    );
  });
};

startServer().catch((error) => {
  console.error("Unable to start server:", error.message);
  process.exitCode = 1;
});