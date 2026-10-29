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
  getQcHealth,
  getReportQualitySummary,
  getReportRows,
  listJobs,
  listReports,
  uploadReport,
} from "../controllers/qcController.js";

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

export default qcRouter;
