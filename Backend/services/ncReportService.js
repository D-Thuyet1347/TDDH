import mongoose from "mongoose";
import XLSX from "xlsx";
import QcReport from "../models/qcReportModel.js";
import QcRow from "../models/qcRowModel.js";
import { initializeNcModel } from "../models/ncModel.js";
import { initializeNcReportModel } from "../models/ncReportModel.js";

export const ORDER_DEMAND_REPORT_ID = "7adf6dc6c603752d3ddd162e";
export const ORDER_DEMAND_REPORT_FILENAME = "Tong_Hop_Don_Hang_HRC2";
export const ORDER_DEMAND_SHEET_NAME = "Nhu cầu đơn hàng HRC";

export const ORDER_DEMAND_COLUMN_DEFINITIONS = [
  { field: "nhu_cau", title: "Nhu cầu" },
  { field: "thang", title: "Tháng" },
  { field: "dot", title: "Đợt" },
  { field: "khach_hang", title: "Khách hàng" },
  { field: "thoi_gian_giao_hang", title: "Thời gian giao hàng" },
  { field: "cw", title: "CW" },
  { field: "po", title: "PO" },
  { field: "xx", title: "xx" },
  { field: "tdc_code", title: "TDC Code" },
  { field: "tdc", title: "TDC" },
  { field: "yeu_cau_dac_biet_skin_skin", title: "Yêu cầu đặc biệt Skin/Skin" },
  { field: "ten_goi", title: "Tên gọi" },
  { field: "ycdb", title: "YCĐB" },
  { field: "txw", title: "TxW" },
  { field: "mac_thep", title: "Mác thép" },
  { field: "t", title: "T" },
  { field: "w", title: "W" },
  { field: "kl_1c", title: "KL_1C" },
  { field: "kl_1d", title: "KL_1D" },
  { field: "thua_thieu_so_voi_zbc04b", title: "Thừa thiếu so với ZBC04B" },
  { field: "loai_1", title: "Loại 1" },
  { field: "loai_2", title: "Loại 2" },
  { field: "cho_xu_ly", title: "Chờ xử lý" },
  { field: "cho_skin", title: "Chờ skin" },
  { field: "tong_sl_sx_kcs", title: "Tổng SL sx KCS" },
  { field: "ke_hoach_can", title: "Kế hoạch cán" },
  { field: "tinh_trang", title: "Tình trạng" },
  { field: "ton_phoi", title: "Tồn phôi" },
  {
    field: "phoi_tam_6_12m_ty_le_1a_hoac_loai_1ab_sau_skin_ty_le_1b_sau_skin",
    title: "Phôi tấm 6-12m · Tỷ lệ 1A hoặc loại 1AB sau skin · Tỷ lệ 1B sau skin",
  },
  { field: "quy_cach_phoi_tam", title: "Quy cách phôi tấm" },
  { field: "ket_qua_can", title: "Kết quả cán" },
  { field: "ma_khach_hang", title: "Mã khách hàng" },
  { field: "day_muc_tieu", title: "Dày mục tiêu" },
];
export const ORDER_DEMAND_COLUMNS = ORDER_DEMAND_COLUMN_DEFINITIONS.map(({ field }) => field);

const MAX_ROWS_PER_PAGE = 30000;
const MAX_REPORTS_PER_PAGE = 100;
const MAX_SHEET_FILTERS = 50;
const MAX_FILTER_LENGTH = 100;
const MAX_CELL_LENGTH = 20000;
const GRIDFS_BUCKET_NAME = "ncworkbooks";
const GRIDFS_THRESHOLD = 12 * 1024 * 1024;
const MIGRATION_COLLECTION = "orderDemandMigrations";
const ORDER_DEMAND_COLUMNS_VERSION = 2;
const columnDefinitionByTitle = new Map(
  ORDER_DEMAND_COLUMN_DEFINITIONS.map((definition) => [definition.title, definition])
);
const columnDefinitionByField = new Map(
  ORDER_DEMAND_COLUMN_DEFINITIONS.map((definition) => [definition.field, definition])
);

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
  sheets: report.sheets?.map((sheet) => ({
    ...sheet,
    columns: sheet.columns.map(getFieldForColumn),
  })),
  report_type: "order-demand",
});

const makeError = (message, status) => Object.assign(new Error(message), { status });
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toSnakeCase = (value) => value
  .toLowerCase()
  .replace(/đ/g, "d")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "_")
  .replace(/^_+|_+$/g, "") || "column";
const getFieldForColumn = (column) =>
  columnDefinitionByTitle.get(column)?.field ||
  (columnDefinitionByField.has(column) ? column : toSnakeCase(column));
const normalizeOrderDemandValues = (values) => {
  const normalized = {};
  for (const [column, value] of Object.entries(values || {})) {
    const field = getFieldForColumn(column);
    if (Object.prototype.hasOwnProperty.call(normalized, field) && normalized[field] !== value) {
      throw makeError(`Không thể chuyển đổi dữ liệu do trùng field "${field}".`, 500);
    }
    normalized[field] = value;
  }
  return normalized;
};

const cellContainsExpression = (column, value) => {
  if (value === '__NO_MATCH__') {
    return { _id: null };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return {};
    const hasBlank = value.includes('__BLANK__') || value.includes('') || value.includes(null);
    const nonBlank = value.filter(
      (v) => v !== '__BLANK__' && v !== '' && v !== null && v !== undefined
    );
    const orList = [];
    if (nonBlank.length > 0) {
      orList.push({
        $expr: {
          $anyElementTrue: {
            $map: {
              input: { $objectToArray: { $ifNull: ["$values", {}] } },
              as: "cell",
              in: {
                $and: [
                  { $eq: ["$$cell.k", column] },
                  {
                    $in: [
                      {
                        $convert: {
                          input: "$$cell.v",
                          to: "string",
                          onError: "",
                          onNull: "",
                        },
                      },
                      nonBlank.map((v) => String(v).slice(0, MAX_FILTER_LENGTH)),
                    ],
                  },
                ],
              },
            },
          },
        },
      });
    }
    if (hasBlank) {
      orList.push({
        $expr: {
          $not: {
            $anyElementTrue: {
              $map: {
                input: { $objectToArray: { $ifNull: ["$values", {}] } },
                as: "cell",
                in: {
                  $and: [
                    { $eq: ["$$cell.k", column] },
                    {
                      $ne: [
                        {
                          $trim: {
                            input: {
                              $convert: {
                                input: "$$cell.v",
                                to: "string",
                                onError: "",
                                onNull: "",
                              },
                            },
                          },
                        },
                        "",
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      });
    }
    return orList.length === 1 ? orList[0] : { $or: orList };
  }
  return cellContainsSingleExpression(column, value);
};
const cellContainsSingleExpression = (column, value) => ({
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
  await migrateLegacyOrderDemandRows(reportId);
  return { report, sheet: await ensureOrderDemandColumns(report) };
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

const ensureOrderDemandColumns = async (report) => {
  const sheet = report.sheets.find((item) => item.name === ORDER_DEMAND_SHEET_NAME);
  if (!sheet) return undefined;

  const columns = [...new Set([
    ...ORDER_DEMAND_COLUMNS,
    ...sheet.columns
      .map(getFieldForColumn)
      .filter((column) => !ORDER_DEMAND_COLUMNS.includes(column)),
  ])];
  const columnsChanged = columns.length !== sheet.columns.length ||
    columns.some((column, index) => column !== sheet.columns[index]);
  const NcRow = getNcModel();
  const migrationCollection = NcRow.db.collection(MIGRATION_COLLECTION);
  const migration = await migrationCollection.findOne(
    { _id: report._id },
    { projection: { columnsVersion: 1 } }
  );

  if (migration?.columnsVersion !== ORDER_DEMAND_COLUMNS_VERSION) {
    const cursor = NcRow.find({
      reportId: report._id,
      sheetName: ORDER_DEMAND_SHEET_NAME,
    })
    .select("values")
      .lean()
      .cursor();
    let operations = [];
    for await (const row of cursor) {
      const values = {
        ...Object.fromEntries(ORDER_DEMAND_COLUMNS.map((column) => [column, ""])),
        ...normalizeOrderDemandValues(row.values),
      };
      operations.push({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: { values } },
        },
      });
      if (operations.length >= 500) {
        await NcRow.bulkWrite(operations, { ordered: true });
        operations = [];
      }
    }
    if (operations.length) await NcRow.bulkWrite(operations, { ordered: true });

    if (columnsChanged) {
      sheet.columns = columns;
      await report.save();
    }
    await migrationCollection.updateOne(
      { _id: report._id },
      { $set: { columnsVersion: ORDER_DEMAND_COLUMNS_VERSION } },
      { upsert: true }
    );
  } else if (columnsChanged) {
    sheet.columns = columns;
    await report.save();
  }

  return sheet;
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

  const sourceColumns = Object.keys(rows[0].values);
  const sourceFields = new Set(sourceColumns.map(getFieldForColumn));
  const columns = [...new Set([
    ...ORDER_DEMAND_COLUMNS,
    ...sourceFields,
  ])];
  const generatedColumns = ORDER_DEMAND_COLUMN_DEFINITIONS
    .filter(({ field }) => !sourceFields.has(field))
    .map(({ title }) => title);
  if (generatedColumns.length) {
    XLSX.utils.sheet_add_aoa(worksheet, [generatedColumns], {
      origin: { r: 0, c: sourceColumns.length },
    });
  }
  const importedRows = rows.map((row) => ({
    ...row,
    values: {
      ...Object.fromEntries(columns.map((column) => [column, ""])),
      ...normalizeOrderDemandValues(row.values),
    },
  }));
  const orderWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(orderWorkbook, worksheet, ORDER_DEMAND_SHEET_NAME);
  const reportBuffer = XLSX.write(orderWorkbook, { bookType: "xlsx", type: "buffer" });
  const filename = `${ORDER_DEMAND_REPORT_FILENAME}.xlsx`;
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
      for (let start = 0; start < importedRows.length; start += batchSize) {
        const batch = importedRows.slice(start, start + batchSize).map((row) => ({
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
    .filter(([, value]) => (Array.isArray(value) ? value.length > 0 : String(value ?? "").trim()));
  const validColumns = new Set(sheet.columns);
  if (filterEntries.some(([column]) => !validColumns.has(column))) {
    throw makeError("Bộ lọc có cột không thuộc sheet.", 400);
  }
  const conditions = filterEntries.map(([column, value]) =>
    cellContainsExpression(column, Array.isArray(value) ? value : String(value).trim().slice(0, MAX_FILTER_LENGTH))
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

export const getOrderDemandColumnValues = async ({ reportId, sheetName }) => {
  const { report, sheet } = await getReportAndSheet(reportId, sheetName);
  await migrateLegacyOrderDemandRows(report._id.toString());
  const NcRow = getNcModel();

  const rows = await NcRow.find({
    reportId: report._id,
    sheetName: sheet.name,
  })
    .limit(30000)
    .select("values")
    .lean();

  const columns = {};
  for (const col of sheet.columns) {
    columns[col] = { counts: {}, blanks: 0, total: 0 };
  }

  for (const row of rows) {
    const vals = row.values || {};
    for (const [col, raw] of Object.entries(vals)) {
      if (!columns[col]) {
        columns[col] = { counts: {}, blanks: 0, total: 0 };
      }
      columns[col].total += 1;
      const str = raw === null || raw === undefined ? "" : String(raw).trim();
      if (!str || str === "—" || str === "-") {
        columns[col].blanks += 1;
      } else {
        columns[col].counts[str] = (columns[col].counts[str] || 0) + 1;
      }
    }
  }

  return {
    totalRows: rows.length,
    columns,
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

export const syncOrderDemandWithQcData = async ({ reportId, qcReportId } = {}) => {
  const NcReport = getNcReportModel();
  const NcRow = getNcModel();

  let targetReportId = reportId;
  let orderReport = null;

  if (targetReportId && targetReportId !== "default" && isValidId(targetReportId)) {
    await migrateLegacyOrderDemandReport(targetReportId);
    orderReport = await NcReport.findById(targetReportId);
  }
  if (!orderReport && isValidId(ORDER_DEMAND_REPORT_ID)) {
    await migrateLegacyOrderDemandReport(ORDER_DEMAND_REPORT_ID);
    orderReport = await NcReport.findById(ORDER_DEMAND_REPORT_ID);
  }
  if (!orderReport) {
    orderReport = await NcReport.findOne({ reportType: "order-demand" }).sort({ savedAt: -1 });
  }
  if (!orderReport) {
    orderReport = await NcReport.findOne().sort({ savedAt: -1 });
  }
  if (!orderReport) {
    const legacy = await QcReport.findOne({ reportType: "order-demand" }).sort({ savedAt: -1 });
    if (legacy) {
      await migrateLegacyOrderDemandReport(legacy._id.toString());
      orderReport = await NcReport.findById(legacy._id);
    }
  }
  if (!orderReport) {
    const rowSample = await NcRow.findOne({ sheetName: ORDER_DEMAND_SHEET_NAME }).lean();
    if (rowSample?.reportId) {
      targetReportId = rowSample.reportId;
      orderReport = { _id: rowSample.reportId, filename: ORDER_DEMAND_REPORT_FILENAME, save: async () => {} };
    }
  }

  if (!orderReport) {
    throw makeError("Chưa tìm thấy Báo cáo Nhu cầu đơn hàng trong hệ thống. Vui lòng tải file Excel nhu cầu đơn hàng trước.", 404);
  }
  targetReportId = orderReport._id;

  let qcReport = null;
  if (qcReportId && isValidId(qcReportId)) {
    qcReport = await QcReport.findById(qcReportId);
  }
  if (!qcReport && isValidId("6adf6dc6c603752d3ddd162d")) {
    qcReport = await QcReport.findById("6adf6dc6c603752d3ddd162d");
  }
  if (!qcReport) {
    qcReport = await QcReport.findOne({ reportType: { $ne: "order-demand" } }).sort({ savedAt: -1 });
  }
  if (!qcReport) {
    qcReport = await QcReport.findOne().sort({ savedAt: -1 });
  }
  if (!qcReport) {
    const qcRowSample = await QcRow.findOne().lean();
    if (qcRowSample?.reportId) {
      qcReport = { _id: qcRowSample.reportId, filename: "Báo cáo QC", savedAt: new Date() };
    }
  }
  if (!qcReport) {
    throw makeError("Chưa tìm thấy dữ liệu Excel QC nào trong hệ thống. Vui lòng tải file Excel QC trước khi đồng nhất.", 404);
  }

  const headerRows = await QcRow.find({
    reportId: qcReport._id,
    rowNumber: { $in: [1, 2] },
  }).lean();

  const normalizeHeader = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .trim()
      .toUpperCase();

  const sheetColumnMap = new Map();

  for (const hRow of headerRows) {
    const existing = sheetColumnMap.get(hRow.sheetName) || {};
    const entries = Object.entries(hRow.values || {});

    for (const [key, rawLabel] of entries) {
      const label = normalizeHeader(rawLabel);
      if (!label) continue;

      if (!existing.poCol) {
        if (
          label === "PO" ||
          label === "SO PO" ||
          label === "MA PO" ||
          label === "SO DON HANG" ||
          label === "DON HANG" ||
          label === "PO NO" ||
          label.startsWith("PO ") ||
          label.startsWith("SO PO")
        ) {
          existing.poCol = key;
        }
      }

      if (!existing.xxCol) {
        if (
          label === "XX" ||
          label === "ITEM" ||
          label === "LINE" ||
          label === "SO DONG" ||
          label === "MUC"
        ) {
          existing.xxCol = key;
        }
      }

      if (!existing.weightCol) {
        if (
          label.includes("KHOI LUONG TINH") ||
          label.includes("KL TINH") ||
          label === "NET WEIGHT" ||
          label.includes("TRONG LUONG TINH") ||
          label === "NET_WEIGHT" ||
          label.includes("KHOI LUONG") ||
          label.includes("TRONG LUONG") ||
          label === "KL" ||
          label === "WEIGHT"
        ) {
          existing.weightCol = key;
        }
      }

      if (!existing.totalQualityCol) {
        if (label.includes("TONG CAP CHAT LUONG") || label.includes("CAP CHAT LUONG")) {
          existing.totalQualityCol = key;
        }
      }

      if (!existing.qualityCol) {
        if (label.includes("PHAN LOAI")) {
          existing.qualityCol = key;
        }
      }

      if (!existing.handlingCol) {
        if (label.includes("HUONG XU LY") || label.includes("XU LY")) {
          existing.handlingCol = key;
        }
      }

      if (!existing.statusCol) {
        if (label.includes("TINH TRANG")) {
          existing.statusCol = key;
        }
      }
    }

    sheetColumnMap.set(hRow.sheetName, existing);
  }

  const parseWeight = (raw) => {
    if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
    if (!raw) return 0;
    const clean = String(raw).replace(/\s+/g, "").replace(/kg/i, "").replace(/,/g, "");
    const num = parseFloat(clean);
    return Number.isFinite(num) ? num : 0;
  };

  const cleanPo = (val) => {
    if (val === null || val === undefined) return "";
    return String(val)
      .trim()
      .toUpperCase()
      .replace(/^PO[:\s_-]*/i, "")
      .trim();
  };

  const cleanXx = (val) => {
    if (val === null || val === undefined) return "";
    const s = String(val).trim().toUpperCase();
    const num = parseInt(s, 10);
    return Number.isNaN(num) ? s : String(num);
  };

  const classifyCoil = (totalQuality, quality, handling, status) => {
    const norm = (s) => String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toUpperCase()
      .trim();

    const tq = norm(totalQuality);
    const q = norm(quality);
    const h = norm(handling);
    const st = norm(status);

    if (h.includes("SKIN") || st.includes("SKIN") || q.includes("SKIN")) {
      return "cho_skin";
    }

    if (
      tq.includes("CHO XU LY") || tq.includes("CXL") || tq.includes("PENDING") ||
      q.includes("CHO XU LY") || q.includes("CXL") ||
      h.includes("CHO XU LY") || h.includes("CXL") ||
      st.includes("CHO XU LY") || st.includes("CXL")
    ) {
      return "cho_xu_ly";
    }

    if (
      tq.includes("LOAI 2") || tq === "2" || tq.includes("L2") ||
      q.includes("LOAI 2") || q.includes("SCRAP")
    ) {
      return "loai_2";
    }

    if (
      tq.includes("LOAI 1") || tq === "1" || tq.includes("L1") ||
      q.includes("PRIME") || q.includes("LOAI 1")
    ) {
      return "loai_1";
    }

    return "loai_1";
  };

  const poAndXxMap = new Map();
  const poOnlyMap = new Map();

  let totalCoilsScanned = 0;

  const qcCursor = QcRow.find({
    reportId: qcReport._id,
    rowNumber: { $gt: 2 },
  }).lean().cursor();

  for await (const row of qcCursor) {
    totalCoilsScanned += 1;
    const sheetCols = sheetColumnMap.get(row.sheetName) || {};
    const values = row.values || {};

    const rawPo = sheetCols.poCol ? values[sheetCols.poCol] : (values.PO || values.po || values["Số PO"] || values["SỐ PO"]);
    if (!rawPo) continue;

    const rawXx = sheetCols.xxCol ? values[sheetCols.xxCol] : (values.XX || values.xx);
    const rawWeight = sheetCols.weightCol
      ? values[sheetCols.weightCol]
      : (values["KHỐI LƯỢNG TỊNH"] || values["Khối lượng tịnh"] || values["Khối lượng"] || values["KHỐI LƯỢNG"] || values.khoi_luong_tinh || values.kl_tinh || values.weight);
    const weight = parseWeight(rawWeight);

    const bucket = classifyCoil(
      sheetCols.totalQualityCol ? values[sheetCols.totalQualityCol] : values.tong_cap_chat_luong,
      sheetCols.qualityCol ? values[sheetCols.qualityCol] : values.phan_loai,
      sheetCols.handlingCol ? values[sheetCols.handlingCol] : values.huong_xu_ly,
      sheetCols.statusCol ? values[sheetCols.statusCol] : values.tinh_trang
    );

    let basePo = cleanPo(rawPo);
    let baseXx = cleanXx(rawXx);

    if (!baseXx && typeof rawPo === "string") {
      const parts = rawPo.trim().split(/[\/\s_-]+/);
      if (parts.length >= 2 && parts[0].length >= 3) {
        basePo = cleanPo(parts[0]);
        baseXx = cleanXx(parts[1]);
      }
    }

    const addToBucket = (map, key) => {
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, { loai_1: 0, loai_2: 0, cho_xu_ly: 0, cho_skin: 0, count: 0 });
      }
      const record = map.get(key);
      record[bucket] += weight;
      record.count += 1;
    };

    if (basePo) {
      if (baseXx) {
        addToBucket(poAndXxMap, `${basePo}___${baseXx}`);
      }
      addToBucket(poOnlyMap, basePo);
    }
  }

  await migrateLegacyOrderDemandRows(targetReportId.toString());
  const orderRows = await NcRow.find({
    reportId: targetReportId,
    sheetName: ORDER_DEMAND_SHEET_NAME,
  }).lean();

  let matchedCount = 0;
  let totalLoai1 = 0;
  let totalLoai2 = 0;
  let totalChoXuLy = 0;
  let totalChoSkin = 0;

  const bulkOps = [];

  for (const row of orderRows) {
    const values = row.values || {};
    const orderPo = cleanPo(values.po || values.PO || values["Số PO"] || values["PO"]);
    const orderXx = cleanXx(values.xx || values.XX || values["xx"]);

    let matchedData = null;
    if (orderPo && orderXx && poAndXxMap.has(`${orderPo}___${orderXx}`)) {
      matchedData = poAndXxMap.get(`${orderPo}___${orderXx}`);
    } else if (orderPo && poOnlyMap.has(orderPo)) {
      matchedData = poOnlyMap.get(orderPo);
    }

    if (matchedData) {
      matchedCount += 1;
      const l1 = Math.round(matchedData.loai_1 * 100) / 100;
      const l2 = Math.round(matchedData.loai_2 * 100) / 100;
      const cxl = Math.round(matchedData.cho_xu_ly * 100) / 100;
      const cskin = Math.round(matchedData.cho_skin * 100) / 100;
      const tongKcs = Math.round((l1 + l2 + cxl + cskin) * 100) / 100;

      totalLoai1 += l1;
      totalLoai2 += l2;
      totalChoXuLy += cxl;
      totalChoSkin += cskin;

      const targetDemand = parseWeight(values.kl_1c || values.kl_1d || values["KL_1C"] || values["KL_1D"]);
      const thuaThieu = targetDemand > 0 ? Math.round((tongKcs - targetDemand) * 100) / 100 : null;

      const updatedValues = {
        ...values,
        loai_1: l1,
        loai_2: l2,
        cho_xu_ly: cxl,
        cho_skin: cskin,
        tong_sl_sx_kcs: tongKcs,
        ...(thuaThieu !== null ? { thua_thieu_so_voi_zbc04b: thuaThieu } : {}),
      };

      bulkOps.push({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: { values: updatedValues } },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    await NcRow.bulkWrite(bulkOps, { ordered: false });
  }

  orderReport.savedAt = new Date();
  await orderReport.save();

  return {
    success: true,
    message: `Đã đồng nhất thành công ${matchedCount} / ${orderRows.length} dòng nhu cầu đơn hàng từ dữ liệu Excel QC (${qcReport.filename}).`,
    stats: {
      totalOrderRows: orderRows.length,
      matchedRows: matchedCount,
      unmatchedRows: orderRows.length - matchedCount,
      totalQcCoilsScanned: totalCoilsScanned,
      totalLoai1: Math.round(totalLoai1 * 100) / 100,
      totalLoai2: Math.round(totalLoai2 * 100) / 100,
      totalChoXuLy: Math.round(totalChoXuLy * 100) / 100,
      totalChoSkin: Math.round(totalChoSkin * 100) / 100,
      qcReportFilename: qcReport.filename,
      qcReportSavedAt: qcReport.savedAt,
    },
  };
};
