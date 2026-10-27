import express from "express";
import multer from "multer";
import {
  downloadReport,
  downloadQcExport,
  createQcExport,
  getExportAvailability,
  getQcExportJob,
  getDashboardSummary,
  listQcExportJobs,
  getQcHealth,
  getReportRows,
  listJobs,
  listReports,
  uploadReport,
} from "../controllers/qcController.js";

const qcRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

qcRouter.get("/health", getQcHealth);
qcRouter.get("/exports/config", getExportAvailability);
qcRouter.post("/exports", createQcExport);
qcRouter.get("/exports/jobs", listQcExportJobs);
qcRouter.get("/exports/jobs/:jobId", getQcExportJob);
qcRouter.get("/exports/jobs/:jobId/file", downloadQcExport);
qcRouter.get("/dashboard-summary", getDashboardSummary);
qcRouter.get("/jobs", listJobs);
qcRouter.get("/reports", listReports);
qcRouter.post("/reports", upload.single("file"), uploadReport);
qcRouter.get("/reports/:reportId/file", downloadReport);
qcRouter.get("/reports/:reportId/rows", getReportRows);

export default qcRouter;
