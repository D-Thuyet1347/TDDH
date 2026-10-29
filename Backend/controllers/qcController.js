import mongoose from "mongoose";
import QcReport from "../models/qcReportModel.js";
import QcRow from "../models/qcRowModel.js";
import { importQcReport } from "../services/qcReportService.js";
import {
  disableQcAutoExport,
  enableQcAutoExport,
  getQcAutoExportStatus,
} from "../services/qcAutoExportService.js";
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
const QC_COLUMN_GROUPS = [
  "THÔNG TIN CHUNG",
  "BỀ MẶT",
  "KÍCH THƯỚC",
  "CƠ/LÝ/HÓA",
  "NGOẠI QUAN",
  "GHI CHÚ QC",
];
const normalizeHeader = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleUpperCase("vi-VN");
const QUALITY_CLASSIFICATIONS = [
  {
    key: "Loại 1 || PRIME",
    categoryPattern: "^(loại|loai)[_\\s-]*1$",
    qualityPattern: "^prime$",
  },
  {
    key: "Loại 1 || NON_PRIME",
    categoryPattern: "^(loại|loai)[_\\s-]*1$",
    qualityPattern: "^non[_\\s-]*prime$",
  },
  {
    key: "Loại 2 || SCRAP",
    categoryPattern: "^(loại|loai)[_\\s-]*2$",
    qualityPattern: "^scrap$",
  },
  { key: "Loại rỗng —", empty: true },
];
const SKIN_HANDLING_TYPES = ["SKIN", "SKIN_CUST"];

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

export const getReportQualitySummary = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    if (!isValidId(reportId)) {
      return res.status(400).json({ message: "Mã báo cáo không hợp lệ." });
    }

    const report = await QcReport.findById(reportId)
      .select("reportType rowsImported")
      .lean();
    if (!report) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo." });
    }
    if (report.reportType === "order-demand") {
      return res.status(404).json({ message: "Không tìm thấy báo cáo QC." });
    }

    const headerRows = await QcRow.find({
      reportId: report._id,
      rowNumber: 2,
    })
      .select("sheetName values")
      .lean();
    const sheetColumns = headerRows
      .map((row) => {
        const columns = Object.entries(row.values || {});
        const findColumn = (header) => columns.find(([, label]) =>
          normalizeHeader(label) === normalizeHeader(header)
        )?.[0];
        const totalQualityColumn = columns.find(([, label]) =>
          normalizeHeader(label) === "TONG CAP CHAT LUONG"
        )?.[0];
        const classificationColumn = columns.find(([, label]) =>
          normalizeHeader(label) === "PHAN LOAI"
        )?.[0];

        return totalQualityColumn && classificationColumn
          ? {
            sheetName: row.sheetName,
            totalQualityColumn,
            classificationColumn,
            dateColumn: findColumn("NGÀY SẢN XUẤT"),
            handlingColumn: findColumn("HƯỚNG XỬ LÝ"),
            idColumn: findColumn("ID GỐC"),
          }
          : null;
      })
      .filter(Boolean);
    const groupedHeaderCount = headerRows.filter((row) =>
      Object.keys(row.values || {}).some((column) =>
        QC_COLUMN_GROUPS.includes(column)
      )
    ).length;
    const counts = Object.fromEntries(
      QUALITY_CLASSIFICATIONS.map(({ key }) => [key, 0])
    );
    const getColumnValue = (columnName) => ({
      $let: {
        vars: {
          column: {
            $arrayElemAt: [
              {
                $filter: {
                  input: { $objectToArray: { $ifNull: ["$values", {}] } },
                  as: "field",
                  cond: { $eq: ["$$field.k", { $literal: columnName }] },
                },
              },
              0,
            ],
          },
        },
        in: "$$column.v",
      },
    });
    const getTrimmedColumnValue = (columnName) => ({
      $trim: {
        input: {
          $convert: {
            input: columnName ? getColumnValue(columnName) : null,
            to: "string",
            onError: "",
            onNull: "",
          },
        },
      },
    });
    const daily = [];
    const ids = { SKIN: new Set(), SKIN_CUST: new Set() };
    const summaries = await Promise.all(
      sheetColumns.map(({
        sheetName,
        totalQualityColumn,
        classificationColumn,
        dateColumn,
        handlingColumn,
        idColumn,
      }) =>
        QcRow.aggregate([
          {
            $match: {
              reportId: report._id,
              sheetName,
              rowNumber: { $gt: 2 },
            },
          },
          {
            $project: {
              totalQuality: getTrimmedColumnValue(totalQualityColumn),
              quality: getTrimmedColumnValue(classificationColumn),
              date: getTrimmedColumnValue(dateColumn),
              handling: {
                $toUpper: getTrimmedColumnValue(handlingColumn),
              },
              sourceId: getTrimmedColumnValue(idColumn),
            },
          },
          {
            $project: {
              date: 1,
              handling: 1,
              sourceId: 1,
              classification: {
                $switch: {
                  branches: QUALITY_CLASSIFICATIONS.map(({
                    key,
                    categoryPattern,
                    qualityPattern,
                    empty,
                  }) => ({
                    case: empty
                      ? {
                        $and: [
                          { $regexMatch: { input: "$totalQuality", regex: "^$|^[-—–]$", options: "i" } },
                          { $regexMatch: { input: "$quality", regex: "^$|^[-—–]$", options: "i" } },
                        ],
                      }
                      : {
                        $and: [
                          {
                            $regexMatch: {
                              input: "$totalQuality",
                              regex: categoryPattern,
                              options: "i",
                            },
                          },
                          {
                            $regexMatch: {
                              input: "$quality",
                              regex: qualityPattern,
                              options: "i",
                            },
                          },
                        ],
                      },
                    then: key,
                  })),
                  default: null,
                },
              },
            },
          },
          {
            $facet: {
              counts: [
                { $match: { classification: { $ne: null } } },
                { $group: { _id: "$classification", count: { $sum: 1 } } },
              ],
              daily: [
                { $match: { date: { $ne: "" } } },
                {
                  $group: {
                    _id: "$date",
                    totalRows: { $sum: 1 },
                    ...Object.fromEntries(
                      QUALITY_CLASSIFICATIONS.map(({ key }, index) => [
                        `count${index}`,
                        { $sum: { $cond: [{ $eq: ["$classification", key] }, 1, 0] } },
                      ])
                    ),
                  },
                },
              ],
              ids: [
                {
                  $match: {
                    handling: { $in: SKIN_HANDLING_TYPES },
                    sourceId: { $ne: "" },
                  },
                },
                { $group: { _id: "$handling", values: { $addToSet: "$sourceId" } } },
              ],
            },
          },
        ])
      )
    );
    summaries.flat().forEach((result) => {
      result.counts.forEach(({ _id, count }) => {
        counts[_id] += count;
      });
      result.daily.forEach((item) => {
        const day = daily.find((entry) => entry.date === item._id);
        const dayCounts = QUALITY_CLASSIFICATIONS.map((_, index) => item[`count${index}`]);
        if (day) {
          day.totalRows += item.totalRows;
          dayCounts.forEach((count, index) => {
            day.counts[QUALITY_CLASSIFICATIONS[index].key] += count;
          });
        } else {
          daily.push({
            date: item._id,
            totalRows: item.totalRows,
            counts: Object.fromEntries(
              QUALITY_CLASSIFICATIONS.map(({ key }, index) => [key, dayCounts[index]])
            ),
          });
        }
      });
      result.ids.forEach(({ _id, values }) => {
        values.forEach((value) => ids[_id].add(value));
      });
    });
    const parseDate = (value) => {
      const parts = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
      if (parts) return new Date(`${parts[3]}-${parts[2]}-${parts[1]}`).getTime();
      const timestamp = Date.parse(value);
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };
    daily.sort((a, b) => parseDate(a.date) - parseDate(b.date) || a.date.localeCompare(b.date));

    return res.json({
      counts,
      daily,
      ids: Object.fromEntries(
        Object.entries(ids).map(([type, values]) => [type, [...values].sort()])
      ),
      totalRows: Math.max(0, report.rowsImported - groupedHeaderCount),
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

export const getQcAutoExport = async (req, res) => {
  try {
    const schedule = await getQcAutoExportStatus();
    return res.json({ schedule });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Không thể đọc lịch xuất QC tự động.",
    });
  }
};

export const enableQcAutoExportJob = async (req, res) => {
  try {
    const schedule = await enableQcAutoExport(req.body || {});
    return res.json({ schedule });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Không thể bật lịch xuất QC tự động.",
    });
  }
};

export const disableQcAutoExportJob = async (req, res) => {
  try {
    const schedule = await disableQcAutoExport();
    return res.json({ schedule });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: error.message || "Không thể tắt lịch xuất QC tự động.",
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
