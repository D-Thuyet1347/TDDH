import mongoose from "mongoose";
import XLSX from "xlsx";
import QcReport from "../models/qcReportModel.js";
import QcRow from "../models/qcRowModel.js";

export const QC_REPORT_ID = "6adf6dc6c603752d3ddd162d";
export const QC_REPORT_FILENAME = "Tong_Hop_QC_HRC2";

const getPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const importQcReport = async ({
  buffer,
  originalName,
  filename = QC_REPORT_FILENAME,
  reportId = QC_REPORT_ID,
  maxRows = Number.parseInt(process.env.MONGODB_MAX_ROWS || "25000", 10),
  batchSize = getPositiveInteger(process.env.MONGODB_BATCH_SIZE, 500),
}) => {
  const extension = originalName.toLowerCase().split(".").pop();
  if (!["xlsx", "xls"].includes(extension)) {
    throw new Error("Chỉ chấp nhận file .xlsx hoặc .xls.");
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch {
    throw new Error("File Excel không hợp lệ hoặc bị lỗi.");
  }

  const sheets = [];
  const sheetRows = [];
  let rowsImported = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
      raw: false,
      blankrows: true,
    });
    const populatedRows = rows
      .map((values, index) => ({ values, rowNumber: index + 2 }))
      .filter(({ values }) =>
        Object.values(values).some((value) => value !== null && value !== "")
      );

    if (!populatedRows.length) continue;

    rowsImported += populatedRows.length;
    if (maxRows > 0 && rowsImported > maxRows) {
      throw new Error(
        `File vượt quá giới hạn ${maxRows.toLocaleString("vi-VN")} dòng dữ liệu.`
      );
    }

    sheets.push({
      name: sheetName,
      rowCount: populatedRows.length,
      columns: Object.keys(populatedRows[0].values),
    });
    sheetRows.push({ name: sheetName, rows: populatedRows });
  }

  if (!rowsImported) {
    throw new Error("File không có dòng dữ liệu để nhập.");
  }

  const safeOriginalName = originalName
    .replace(/[\\/:*?"<>|]/g, "_")
    .slice(0, 180);
  const safeFilename = `${filename}.${extension}`;
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    throw new Error("Mã báo cáo không hợp lệ.");
  }
  const targetReportId = new mongoose.Types.ObjectId(reportId);
  const session = await mongoose.startSession();
  let report;
  try {
    await session.withTransaction(async () => {
      report = await QcReport.findByIdAndUpdate(
        targetReportId,
        {
          $set: {
            filename: safeFilename,
            originalName: safeOriginalName,
            savedAt: new Date(),
            bytes: buffer.length,
            rowsImported,
            sheets,
            workbook: buffer,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          session,
        }
      );

      await QcRow.deleteMany({ reportId: targetReportId }).session(session);
      for (const sheet of sheetRows) {
        for (let start = 0; start < sheet.rows.length; start += batchSize) {
          const batch = sheet.rows.slice(start, start + batchSize).map((row) => ({
            ...row,
            reportId: targetReportId,
            sheetName: sheet.name,
          }));
          await QcRow.insertMany(batch, { ordered: true, session });
        }
      }
    });
  } finally {
    await session.endSession();
  }

  return report;
};
