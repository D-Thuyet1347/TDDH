import mongoose from "mongoose";
import XLSX from "xlsx";
import QcReport from "../models/qcReportModel.js";
import QcRow from "../models/qcRowModel.js";
import { initializeNcModel } from "../models/ncModel.js";
import { initializeNcReportModel } from "../models/ncReportModel.js";

export const ORDER_DEMAND_REPORT_ID = "7adf6dc6c603752d3ddd162e";
export const ORDER_DEMAND_REPORT_FILENAME = "Tong_Hop_Don_Hang_HRC2";
export const ORDER_DEMAND_SHEET_NAME = "Nhu cầu đơn hàng HRC";

const MAX_ROWS_PER_PAGE = 200;
const MAX_REPORTS_PER_PAGE = 100;
const MAX_SHEET_FILTERS = 50;
const MAX_FILTER_LENGTH = 100;
const MAX_CELL_LENGTH = 20000;
const GRIDFS_BUCKET_NAME = "ncworkbooks";
const GRIDFS_THRESHOLD = 12 * 1024 * 1024;
const MIGRATION_COLLECTION = "orderDemandMigrations";

const getNcModel = () => initializeNcModel();
const getNcReportModel = () => initializeNcReportModel();
const getWorkbookBucket = () =>
  new mongoose.mongo.GridFSBucket(getNcModel().db.db, { bucketName: GRIDFS_BUCKET_NAME });

const reportResponse = (report) => ({
  job_id: report._id.toString(),
  filename: report.filename,
  saved_at: report.savedAt,
  rows_imported: report.rowsImported,
  bytes: report.bytes,
  sheets: report.sheets,
  report_type: "order-demand",
});

const makeError = (message, status) => Object.assign(new Error(message), { status });
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const cellContainsExpression = (column, value) => ({
  $expr: {
    $anyElementTrue: {
      $map: {
        input: { $objectToArray: { $ifNull: ["$values", {}] } },
        as: "cell",
        in: {
          $and: [
            { $eq: ["$$cell.k", column] },
            {
              $regexMatch: {
                input: {
                  $convert: {
                    input: "$$cell.v",
                    to: "string",
                    onError: "",
                    onNull: "",
                  },
                },
                regex: escapeRegex(value),
                options: "i",
              },
            },
          ],
        },
      },
    },
  },
});

const saveWorkbook = async (buffer, filename) => {
  const uploadStream = getWorkbookBucket().openUploadStream(filename);
  await new Promise((resolve, reject) => {
    uploadStream.once("error", reject);
    uploadStream.once("finish", resolve);
    uploadStream.end(buffer);
  });
  return uploadStream.id;
};

const removeWorkbook = async (workbookId) => {
  if (workbookId) await getWorkbookBucket().delete(workbookId);
};

const copyLegacyWorkbook = async (report) => {
  if (report.workbook) return { workbook: report.workbook };
  if (!report.workbookId) return {};

  const legacyBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "qcworkbooks",
  });
  const source = legacyBucket.openDownloadStream(report.workbookId);
  const upload = getWorkbookBucket().openUploadStream(report.filename);
  await new Promise((resolve, reject) => {
    source.once("error", reject);
    upload.once("error", reject);
    upload.once("finish", resolve);
    source.pipe(upload);
  });
  return { workbookId: upload.id };
};

const migrateLegacyOrderDemandReport = async (reportId) => {
  const NcReport = getNcReportModel();
  if (await NcReport.exists({ _id: reportId })) return;

  const legacyReport = await QcReport.findOne({
    _id: reportId,
    reportType: "order-demand",
  }).select("+workbook").lean();
  if (!legacyReport) return;

  const workbook = await copyLegacyWorkbook(legacyReport);
  const metadata = { ...legacyReport };
  delete metadata.__v;
  delete metadata.createdAt;
  delete metadata.updatedAt;
  delete metadata.workbook;
  delete metadata.workbookId;
  try {
    await NcReport.updateOne(
      { _id: reportId },
      { $setOnInsert: { ...metadata, ...workbook } },
      { upsert: true }
    );
  } catch (error) {
    if (workbook.workbookId) {
      try {
        await removeWorkbook(workbook.workbookId);
      } catch (cleanupError) {
        console.error("Unable to remove incomplete migrated workbook:", cleanupError.message);
      }
    }
    throw error;
  }
};

const getReportAndSheet = async (reportId, sheetName) => {
  if (!isValidId(reportId)) throw makeError("Mã báo cáo không hợp lệ.", 400);
  await migrateLegacyOrderDemandReport(reportId);
  const report = await getNcReportModel().findById(reportId);
  if (!report) throw makeError("Không tìm thấy báo cáo nhu cầu đơn hàng.", 404);
  const sheet = report.sheets.find((item) => item.name === sheetName);
  if (!sheet || sheetName !== ORDER_DEMAND_SHEET_NAME) {
    throw makeError("Báo cáo không có sheet nhu cầu đơn hàng này.", 404);
  }
  return { report, sheet };
};

export const migrateLegacyOrderDemandRows = async (reportId) => {
  const NcRow = getNcModel();
  await NcRow.createIndexes();
  const reportObjectId = new mongoose.Types.ObjectId(reportId);
  const migrationCollection = NcRow.db.collection(MIGRATION_COLLECTION);
  if (await migrationCollection.findOne({ _id: reportObjectId }, { projection: { _id: 1 } })) {
    return;
  }

  const filter = {
    reportId: reportObjectId,
    sheetName: ORDER_DEMAND_SHEET_NAME,
  };
  const legacySources = [
    QcRow.collection,
    mongoose.connection.db.collection("TDDHHRC2"),
    mongoose.connection.useDb("TDDHHRC2", { useCache: true })
      .collection("Tong_Hop_Don_Hang_HRC2"),
  ];
  let operations = [];

  const flush = async () => {
    if (!operations.length) return;
    await NcRow.bulkWrite(operations, { ordered: false });
    operations = [];
  };

  for (const source of legacySources) {
    const cursor = source.find(filter, {
      projection: { reportId: 1, sheetName: 1, rowNumber: 1, values: 1 },
    });
    for await (const row of cursor) {
      operations.push({
        updateOne: {
          filter: {
            reportId: reportObjectId,
            sheetName: row.sheetName,
            rowNumber: row.rowNumber,
          },
          update: { $setOnInsert: row },
          upsert: true,
        },
      });
      if (operations.length >= 500) await flush();
    }
  }
  await flush();
  await migrationCollection.updateOne(
    { _id: reportObjectId },
    { $setOnInsert: { migratedAt: new Date() } },
    { upsert: true }
  );
};

export const listOrderDemandReports = async ({ limit = 100, offset = 0, search = "" } = {}) => {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), MAX_REPORTS_PER_PAGE);
  const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const searchText = String(search).trim().slice(0, 100);
  const legacyReports = await QcReport.find({ reportType: "order-demand" })
    .select("_id")
    .lean();
  for (const report of legacyReports) {
    await migrateLegacyOrderDemandReport(report._id.toString());
  }
  const query = {};
  if (searchText) {
    query.filename = { $regex: escapeRegex(searchText), $options: "i" };
  }
  const NcReport = getNcReportModel();

  const [reports, total] = await Promise.all([
    NcReport.find(query)
      .sort({ savedAt: -1 })
      .skip(safeOffset)
      .limit(safeLimit)
      .select("filename savedAt rowsImported bytes sheets reportType")
      .lean(),
    NcReport.countDocuments(query),
  ]);
  return {
    reports: reports.map(reportResponse),
    total,
    limit: safeLimit,
    offset: safeOffset,
  };
};

export const importOrderDemandReport = async ({
  buffer,
  originalName,
  maxRows = Number.parseInt(process.env.MONGODB_MAX_ROWS || "100000", 10),
  batchSize = Math.max(Number.parseInt(process.env.MONGODB_BATCH_SIZE, 10) || 500, 1),
}) => {
  const extension = originalName.toLowerCase().split(".").pop();
  if (!["xlsx", "xls"].includes(extension)) {
    throw makeError("Chỉ chấp nhận file .xlsx hoặc .xls.", 400);
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw makeError("File Excel không hợp lệ hoặc bị lỗi.", 400);
  }
  const worksheet = workbook.Sheets[ORDER_DEMAND_SHEET_NAME];
  if (!worksheet) {
    throw makeError(`File không có sheet "${ORDER_DEMAND_SHEET_NAME}".`, 400);
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, {
    defval: null,
    raw: false,
    blankrows: true,
  })
    .map((values, index) => ({ values, rowNumber: index + 2 }))
    .filter(({ values }) =>
      Object.values(values).some((value) => value !== null && value !== "")
    );
  if (!rows.length) throw makeError("Sheet nhu cầu đơn hàng không có dòng dữ liệu.", 400);
  if (maxRows > 0 && rows.length > maxRows) {
    throw makeError(
      `File vượt quá giới hạn ${maxRows.toLocaleString("vi-VN")} dòng dữ liệu.`,
      413
    );
  }

  const orderWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(orderWorkbook, worksheet, ORDER_DEMAND_SHEET_NAME);
  const reportBuffer = XLSX.write(orderWorkbook, { bookType: "xlsx", type: "buffer" });
  const filename = `${ORDER_DEMAND_REPORT_FILENAME}.xlsx`;
  const columns = Object.keys(rows[0].values);
  const sheets = [{ name: ORDER_DEMAND_SHEET_NAME, rowCount: rows.length, columns }];
  const reportId = new mongoose.Types.ObjectId(ORDER_DEMAND_REPORT_ID);
  const NcRow = getNcModel();
  await NcRow.createIndexes();

  const NcReport = getNcReportModel();
  const previousReport = await NcReport.findById(reportId).select("workbookId").lean();
  const workbookId = reportBuffer.length > GRIDFS_THRESHOLD
    ? await saveWorkbook(reportBuffer, filename)
    : null;
  let session;

  try {
    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await NcReport.findByIdAndUpdate(
        reportId,
        {
          $set: {
            filename,
            originalName: originalName.replace(/[\\/:*?"<>|]/g, "_").slice(0, 180),
            savedAt: new Date(),
            bytes: reportBuffer.length,
            rowsImported: rows.length,
            sheets,
            reportType: "order-demand",
            ...(workbookId ? { workbookId } : { workbook: reportBuffer }),
          },
          $unset: workbookId ? { workbook: 1 } : { workbookId: 1 },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session,
        }
      );

      await NcRow.deleteMany({ reportId }).session(session);
      for (let start = 0; start < rows.length; start += batchSize) {
        const batch = rows.slice(start, start + batchSize).map((row) => ({
          ...row,
          reportId,
          sheetName: ORDER_DEMAND_SHEET_NAME,
        }));
        await NcRow.insertMany(batch, { ordered: true, session });
      }
      await NcRow.db.collection(MIGRATION_COLLECTION).updateOne(
        { _id: reportId },
        { $set: { migratedAt: new Date() } },
        { upsert: true, session }
      );
    });
  } catch (error) {
    if (workbookId) {
      try {
        await removeWorkbook(workbookId);
      } catch (cleanupError) {
        console.error("Unable to remove incomplete order-demand workbook:", cleanupError.message);
      }
    }
    throw error;
  } finally {
    if (session) await session.endSession();
  }

  if (previousReport?.workbookId) {
    try {
      await removeWorkbook(previousReport.workbookId);
    } catch (cleanupError) {
      console.error("Unable to remove replaced order-demand workbook:", cleanupError.message);
    }
  }

  const report = await NcReport.findById(reportId).select("filename savedAt rowsImported bytes sheets reportType").lean();
  return reportResponse(report);
};

export const getOrderDemandWorkbook = async (reportId) => {
  if (!isValidId(reportId)) throw makeError("Mã báo cáo không hợp lệ.", 400);
  await migrateLegacyOrderDemandReport(reportId);
  const report = await getNcReportModel().findById(reportId)
    .select("+workbook filename workbookId")
    .lean();
  if (!report) throw makeError("Không tìm thấy báo cáo nhu cầu đơn hàng.", 404);
  return report;
};

export const openOrderDemandWorkbook = async (reportId) => {
  const report = await getOrderDemandWorkbook(reportId);
  if (report.workbookId) {
    const bucket = getWorkbookBucket();
    const file = await bucket.find({ _id: report.workbookId }).next();
    if (!file) throw makeError("Không tìm thấy file Excel nhu cầu đơn hàng.", 404);
    return {
      filename: report.filename,
      workbook: bucket.openDownloadStream(report.workbookId),
    };
  }
  if (!report.workbook) throw makeError("Không tìm thấy file Excel nhu cầu đơn hàng.", 404);
  return { filename: report.filename, workbook: Buffer.from(report.workbook) };
};

export const getOrderDemandRows = async ({
  reportId,
  sheetName,
  search = "",
  filters = {},
  limit = 50,
  offset = 0,
}) => {
  const { report, sheet } = await getReportAndSheet(reportId, sheetName);
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), MAX_ROWS_PER_PAGE);
  const safeOffset = Math.max(Number.parseInt(offset, 10) || 0, 0);
  const searchText = String(search).trim().slice(0, MAX_FILTER_LENGTH);
  let parsedFilters = filters;
  if (typeof filters === "string") {
    try {
      parsedFilters = JSON.parse(filters);
    } catch {
      throw makeError("Bộ lọc cột không hợp lệ.", 400);
    }
  }
  if (!parsedFilters || typeof parsedFilters !== "object" || Array.isArray(parsedFilters)) {
    throw makeError("Bộ lọc cột không hợp lệ.", 400);
  }
  if (Object.keys(parsedFilters).length > MAX_SHEET_FILTERS) {
    throw makeError("Chỉ được lọc tối đa 50 cột cùng lúc.", 400);
  }

  const filterEntries = Object.entries(parsedFilters)
    .filter(([, value]) => String(value ?? "").trim());
  const validColumns = new Set(sheet.columns);
  if (filterEntries.some(([column]) => !validColumns.has(column))) {
    throw makeError("Bộ lọc có cột không thuộc sheet.", 400);
  }
  const conditions = filterEntries.map(([column, value]) =>
    cellContainsExpression(column, String(value).trim().slice(0, MAX_FILTER_LENGTH))
  );
  if (searchText) {
    conditions.push({
      $or: sheet.columns.map((column) => cellContainsExpression(column, searchText)),
    });
  }
  const query = { reportId: report._id, sheetName };
  if (conditions.length) query.$and = conditions;

  await migrateLegacyOrderDemandRows(report._id.toString());
  const NcRow = getNcModel();
  const [rows, total] = await Promise.all([
    NcRow.find(query)
      .sort({ rowNumber: 1 })
      .skip(safeOffset)
      .limit(safeLimit)
      .select("sheetName rowNumber values")
      .lean(),
    NcRow.countDocuments(query),
  ]);
  return {
    sheet: { name: sheet.name, rowCount: sheet.rowCount, columns: sheet.columns },
    rows,
    total,
    limit: safeLimit,
    offset: safeOffset,
  };
};

const validateValues = (input, columns, requirePopulated) => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw makeError("Dữ liệu dòng không hợp lệ.", 400);
  }
  if (Object.keys(input).some((column) => !columns.includes(column))) {
    throw makeError("Dữ liệu chứa cột không thuộc sheet.", 400);
  }
  for (const [column, value] of Object.entries(input)) {
    if (
      value !== null &&
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      throw makeError(`Giá trị cột "${column}" không hợp lệ.`, 400);
    }
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw makeError(`Giá trị cột "${column}" không hợp lệ.`, 400);
    }
    if (typeof value === "string" && value.length > MAX_CELL_LENGTH) {
      throw makeError(`Giá trị cột "${column}" vượt quá giới hạn ký tự.`, 400);
    }
  }
  if (
    requirePopulated &&
    !Object.values(input).some((value) => value !== null && String(value).trim() !== "")
  ) {
    throw makeError("Vui lòng nhập ít nhất một thông tin cho dòng.", 400);
  }
  return input;
};

export const createOrderDemandRow = async ({ reportId, sheetName, input }) => {
  const { report, sheet } = await getReportAndSheet(reportId, sheetName);
  const values = validateValues(input, sheet.columns, true);
  await migrateLegacyOrderDemandRows(reportId);
  const NcRow = getNcModel();
  const lastRow = await NcRow.findOne({ reportId: report._id, sheetName })
    .sort({ rowNumber: -1 })
    .select("rowNumber")
    .lean();
  const rowNumber = Math.max(lastRow?.rowNumber || 1, 1) + 1;
  const [row] = await NcRow.create([{
    reportId: report._id,
    sheetName,
    rowNumber,
    values,
  }]);

  sheet.rowCount += 1;
  report.rowsImported += 1;
  await report.save();
  return row;
};

export const updateOrderDemandRow = async ({ reportId, sheetName, rowId, input }) => {
  if (!isValidId(rowId)) throw makeError("Mã dòng không hợp lệ.", 400);
  const { report, sheet } = await getReportAndSheet(reportId, sheetName);
  const values = validateValues(input, sheet.columns, false);
  await migrateLegacyOrderDemandRows(reportId);
  const row = await getNcModel().findOneAndUpdate(
    { _id: rowId, reportId: report._id, sheetName },
    { $set: { values } },
    { new: true, runValidators: true }
  ).lean();
  if (!row) throw makeError("Không tìm thấy dòng nhu cầu đơn hàng.", 404);
  return row;
};

export const deleteOrderDemandRow = async ({ reportId, sheetName, rowId }) => {
  if (!isValidId(rowId)) throw makeError("Mã dòng không hợp lệ.", 400);
  const { report, sheet } = await getReportAndSheet(reportId, sheetName);
  await migrateLegacyOrderDemandRows(reportId);
  const row = await getNcModel().findOneAndDelete({
    _id: rowId,
    reportId: report._id,
    sheetName,
  });
  if (!row) throw makeError("Không tìm thấy dòng nhu cầu đơn hàng.", 404);
  sheet.rowCount = Math.max(0, sheet.rowCount - 1);
  report.rowsImported = Math.max(0, report.rowsImported - 1);
  await report.save();
  return { deleted: true };
};
