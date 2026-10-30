import {
  createOrderDemandRow,
  deleteOrderDemandRow,
  getOrderDemandColumnValues,
  getOrderDemandRows,
  importOrderDemandReport,
  listOrderDemandReports,
  openOrderDemandWorkbook,
  ORDER_DEMAND_SHEET_NAME,
  syncOrderDemandWithQcData,
  updateOrderDemandRow,
} from "../services/ncReportService.js";

const handleError = (error, res, next) => {
  if (error.status) {
    return res.status(error.status).json({ message: error.message });
  }
  return next(error);
};

export const uploadNcReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn file Excel." });
    }
    const report = await importOrderDemandReport({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      maxRows: Number.parseInt(process.env.MONGODB_MAX_ROWS || "100000", 10),
    });
    const sheetCount = report.sheets?.length || 1;
    const sheetNames = report.sheets?.map((s) => `${s.name} (${s.rowCount.toLocaleString("vi-VN")} dòng)`).join(", ");
    return res.status(201).json({
      message: `Đã đọc và tạo bảng thành công ${report.rows_imported.toLocaleString("vi-VN")} dòng trên ${sheetCount} sheet: ${sheetNames}.`,
      report,
    });
  } catch (error) {
    return handleError(error, res, next);
  }
};

export const listNcReports = async (req, res, next) => {
  try {
    const result = await listOrderDemandReports({
      limit: req.query.limit,
      offset: req.query.offset,
      search: req.query.search,
    });
    return res.json(result);
  } catch (error) {
    return handleError(error, res, next);
  }
};

export const downloadNcReport = async (req, res, next) => {
  try {
    const { filename, workbook } = await openOrderDemandWorkbook(req.params.reportId);
    if (!workbook || (Buffer.isBuffer(workbook) && !workbook.length)) {
      return res.status(404).json({ message: "Không tìm thấy nội dung file Excel." });
    }
    const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
    const asciiFilename = cleanFilename.replace(/[^\x20-\x7E]/g, "_");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`
    );
    if (Buffer.isBuffer(workbook)) {
      res.setHeader("Content-Length", workbook.length);
      return res.end(workbook);
    }
    if (workbook.pipe) {
      workbook.on("error", next);
      return workbook.pipe(res);
    }
    const buf = Buffer.from(workbook);
    res.setHeader("Content-Length", buf.length);
    return res.end(buf);
  } catch (error) {
    return handleError(error, res, next);
  }
};

export const getNcRows = async (req, res, next) => {
  try {
    const result = await getOrderDemandRows({
      reportId: req.params.reportId,
      sheetName: req.params.sheetName,
      search: req.query.search,
      filters: req.query.filters,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return res.json(result);
  } catch (error) {
    return handleError(error, res, next);
  }
};

export const getNcColumnValues = async (req, res, next) => {
  try {
    const result = await getOrderDemandColumnValues({
      reportId: req.params.reportId,
      sheetName: req.params.sheetName || req.query.sheetName || ORDER_DEMAND_SHEET_NAME,
    });
    return res.json(result);
  } catch (error) {
    return handleError(error, res, next);
  }
};

export const createNcRow = async (req, res, next) => {
  try {
    const row = await createOrderDemandRow({
      reportId: req.params.reportId,
      sheetName: req.params.sheetName,
      input: req.body?.values,
    });
    return res.status(201).json({ message: "Đã thêm dòng nhu cầu đơn hàng.", row });
  } catch (error) {
    return handleError(error, res, next);
  }
};

export const updateNcRow = async (req, res, next) => {
  try {
    const row = await updateOrderDemandRow({
      reportId: req.params.reportId,
      sheetName: req.params.sheetName,
      rowId: req.params.rowId,
      input: req.body?.values,
    });
    return res.json({ message: "Đã cập nhật dòng nhu cầu đơn hàng.", row });
  } catch (error) {
    return handleError(error, res, next);
  }
};

export const deleteNcRow = async (req, res, next) => {
  try {
    const result = await deleteOrderDemandRow({
      reportId: req.params.reportId,
      sheetName: req.params.sheetName,
      rowId: req.params.rowId,
    });
    return res.json({ message: "Đã xóa dòng nhu cầu đơn hàng.", ...result });
  } catch (error) {
    return handleError(error, res, next);
  }
};

export const syncNcWithQc = async (req, res, next) => {
  try {
    const reportId = req.params.reportId || req.body?.reportId || req.query?.reportId;
    const qcReportId = req.body?.qcReportId || req.query?.qcReportId;
    const result = await syncOrderDemandWithQcData({
      reportId,
      qcReportId,
    });
    return res.json(result);
  } catch (error) {
    return handleError(error, res, next);
  }
};
