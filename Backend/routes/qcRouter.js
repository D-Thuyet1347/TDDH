import express from "express";
import multer from "multer";
import {
  downloadReport,
  downloadQcExport,
  createQcExport,
  disableQcAutoExportJob,
  enableQcAutoExportJob,
  getExportAvailability,
  getQcAutoExport,
  getQcExportJob,
  getDashboardSummary,
  listQcExportJobs,
  getQcColumnValues,
  getQcHealth,
  getReportQualitySummary,
  getReportRows,
  listJobs,
  listReports,
  uploadReport,
} from "../controllers/qcController.js";
import { syncNcWithQc } from "../controllers/ncController.js";

const qcRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

qcRouter.get("/health", getQcHealth);
qcRouter.get("/exports/config", getExportAvailability);
qcRouter.get("/exports/auto", getQcAutoExport);
qcRouter.put("/exports/auto", enableQcAutoExportJob);
qcRouter.delete("/exports/auto", disableQcAutoExportJob);
qcRouter.post("/exports", createQcExport);
qcRouter.get("/exports/jobs", listQcExportJobs);
qcRouter.get("/exports/jobs/:jobId", getQcExportJob);
qcRouter.get("/exports/jobs/:jobId/file", downloadQcExport);
qcRouter.get("/dashboard-summary", getDashboardSummary);
qcRouter.get("/jobs", listJobs);
qcRouter.get("/reports", listReports);
qcRouter.post("/reports", upload.single("file"), uploadReport);
qcRouter.get("/reports/:reportId/file", downloadReport);
qcRouter.get("/reports/:reportId/quality-summary", getReportQualitySummary);
qcRouter.get("/reports/:reportId/rows", getReportRows);
qcRouter.get("/reports/:reportId/column-values", getQcColumnValues);

// Đồng bộ QC & Nhu cầu đơn hàng (hỗ trợ cả qua qcRouter)
qcRouter.all("/reports/:reportId/sync-qc", syncNcWithQc);
qcRouter.all("/sync-qc", syncNcWithQc);
qcRouter.all("/sync-nc", syncNcWithQc);

export default qcRouter;
