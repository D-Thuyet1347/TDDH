import mongoose from "mongoose";
import QcReport from "../models/qcReportModel.js";
import QcRow from "../models/qcRowModel.js";
import { importQcReport } from "../services/qcReportService.js";
import {
  consumeTemporaryExport,
  createExportJob,
  getExportJob,
  getExportJobFile,
  getExportJobs,
  getQcExportAvailability,
} from "../services/qcExportService.js";

const MAX_REPORTS_PER_PAGE = 100;
const MAX_ROWS_PER_PAGE = 200;
const MAX_IMPORTED_ROWS = 100000;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const reportResponse = (report) => ({
  job_id: report._id.toString(),
  filename: report.filename,
  saved_at: report.savedAt,
  rows_imported: report.rowsImported,
  bytes: report.bytes,
  sheets: report.sheets,
  report_type: report.reportType || "qc",
});

export const uploadReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn file Excel." });
    }

    let report;
    try {
      report = await importQcReport({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        maxRows: Number.parseInt(process.env.MONGODB_MAX_ROWS || `${MAX_IMPORTED_ROWS}`, 10),
      });
    } catch (error) {
      const status = error.message.startsWith("File vượt quá giới hạn") ? 413 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(201).json({
      message: "Đã tải và lưu báo cáo Excel QC.",
      report: reportResponse(report),
    });
  } catch (error) {
    return next(error);
  }
};

export const listReports = async (req, res, next) => {
  try {
    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
      MAX_REPORTS_PER_PAGE
    );
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const search = String(req.query.search || "").trim().slice(0, 100);
    const filter = { reportType: { $ne: "order-demand" } };
    if (search) {
      filter.filename = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    const [reports, total] = await Promise.all([
      QcReport.find(filter)
        .sort({ savedAt: -1 })
        .skip(offset)
        .limit(limit)
        .select("filename savedAt rowsImported bytes sheets reportType")
        .lean(),
      QcReport.countDocuments(filter),
    ]);

    return res.json({
      reports: reports.map(reportResponse),
      total,
      limit,
      offset,
    });
  } catch (error) {
    return next(error);
  }
};

export const getReportRows = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    if (!isValidId(reportId)) {
      return res.status(400).json({ message: "Mã báo cáo không hợp lệ." });
    }

    const report = await QcReport.findById(reportId)
      .select("sheets reportType")
      .lean();
    if (!report) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo." });
    }
    if (report.reportType === "order-demand") {
      return res.status(404).json({ message: "Không tìm thấy báo cáo QC." });
    }

    const limit = Math.min(
      Math.max(Number.parseInt(req.query.limit, 10) || 50, 1),
      MAX_ROWS_PER_PAGE
    );
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    const sheet = String(req.query.sheet || "");
    const filter = { reportId: report._id };

    if (sheet) {
      if (!report.sheets.some((item) => item.name === sheet)) {
        return res.status(400).json({ message: "Sheet không thuộc báo cáo này." });
      }
      filter.sheetName = sheet;
    }

    const [rows, total] = await Promise.all([
      QcRow.find(filter)
        .sort({ sheetName: 1, rowNumber: 1 })
        .skip(offset)
        .limit(limit)
        .select("sheetName rowNumber values")
        .lean(),
      QcRow.countDocuments(filter),
    ]);

    return res.json({
      sheets: report.sheets,
      rows,
      total,
      limit,
      offset,
    });
  } catch (error) {
    return next(error);
  }
};

export const downloadReport = async (req, res, next) => {
  try {
    if (!isValidId(req.params.reportId)) {
      return res.status(400).json({ message: "Mã báo cáo không hợp lệ." });
    }

    const report = await QcReport.findById(req.params.reportId)
      .select("+workbook filename reportType")
      .exec();
    if (!report) {
      return res.status(404).json({ message: "Không tìm thấy file báo cáo." });
    }
    if (report.reportType === "order-demand") {
      return res.status(404).json({ message: "Không tìm thấy file báo cáo QC." });
    }

    let workbookBucket;
    if (report.workbookId) {
      workbookBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "qcworkbooks",
      });
      const workbookFile = await workbookBucket.find({ _id: report.workbookId }).next();
      if (!workbookFile) {
        return res.status(404).json({ message: "Không tìm thấy file Excel gốc." });
      }
    }
    if (!workbookBucket && !report.workbook) {
      return res.status(404).json({ message: "Không tìm thấy file Excel gốc." });
    }

    const encodedFilename = encodeURIComponent(report.filename);
    const contentType = report.filename.toLowerCase().endsWith(".xls")
      ? "application/vnd.ms-excel"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report"; filename*=UTF-8''${encodedFilename}`
    );
    if (workbookBucket) {
      const stream = workbookBucket.openDownloadStream(report.workbookId);
      stream.on("error", next);
      return stream.pipe(res);
    }
    return res.send(Buffer.from(report.workbook));
  } catch (error) {
    return next(error);
  }
};

export const getDashboardSummary = async (req, res, next) => {
  try {
    const [reports, totals] = await Promise.all([
      QcReport.countDocuments({ reportType: { $ne: "order-demand" } }),
      QcReport.aggregate([
        { $match: { reportType: { $ne: "order-demand" } } },
        {
          $group: {
            _id: null,
            rows: { $sum: "$rowsImported" },
            bytes: { $sum: "$bytes" },
            sheets: { $sum: { $size: "$sheets" } },
          },
        },
      ]),
    ]);

    return res.json({
      reports,
      rows: totals[0]?.rows || 0,
      bytes: totals[0]?.bytes || 0,
      sheets: totals[0]?.sheets || 0,
      database: mongoose.connection.name,
    });
  } catch (error) {
    return next(error);
  }
};

export const listJobs = async (req, res, next) => {
  try {
    const [reports, exportJobs] = await Promise.all([
      QcReport.find({ reportType: { $ne: "order-demand" } })
      .sort({ savedAt: -1 })
      .limit(100)
      .select("filename savedAt")
      .lean(),
      getExportJobs(),
    ]);
    const exportedReportIds = new Set(
      exportJobs.map((job) => job.report_id).filter(Boolean)
    );
    const importedJobs = reports
      .filter((report) => !exportedReportIds.has(report._id.toString()))
      .map((report) => ({
        job_id: report._id.toString(),
        filename: report.filename,
        status: "completed",
        created_at: report.savedAt,
      }));

    return res.json(
      [...exportJobs, ...importedJobs]
        .sort((first, second) => new Date(second.created_at) - new Date(first.created_at))
        .slice(0, 100)
    );
  } catch (error) {
    return next(error);
  }
};

export const getQcHealth = (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  return res.status(connected ? 200 : 503).json({
    connected,
    database: connected ? mongoose.connection.name : null,
  });
};

export const getExportAvailability = (req, res) =>
  res.json(getQcExportAvailability());

export const createQcExport = async (req, res) => {
  try {
    const job = await createExportJob(req.body || {});
    return res.status(202).json({ job });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Không thể tạo tác vụ xuất Excel.",
    });
  }
};

export const getQcExportJob = (req, res) => {
  const job = getExportJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: "Không tìm thấy tác vụ xuất Excel." });
  }
  return res.json({ job });
};

export const listQcExportJobs = (req, res) =>
  res.json({ jobs: getExportJobs() });

export const downloadQcExport = async (req, res, next) => {
  const job = getExportJobFile(req.params.jobId);
  if (!job) {
    const currentJob = getExportJob(req.params.jobId);
    return res.status(currentJob ? 409 : 404).json({
      message: currentJob
        ? "File chưa sẵn sàng để tải."
        : "Không tìm thấy tác vụ xuất Excel.",
    });
  }

  return res.download(job.filePath, job.filename, async (error) => {
    if (error && !res.headersSent) return next(error);
    if (!error) await consumeTemporaryExport(req.params.jobId);
  });
};
