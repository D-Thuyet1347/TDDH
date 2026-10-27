import {
  createOrderDemandRow,
  deleteOrderDemandRow,
  getOrderDemandRows,
  importOrderDemandReport,
  listOrderDemandReports,
  openOrderDemandWorkbook,
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
    return res.status(201).json({
      message: "Đã tạo và lưu Tong_Hop_Don_Hang_HRC2.xlsx.",
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
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report.xlsx"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    if (Buffer.isBuffer(workbook)) return res.send(workbook);
    workbook.on("error", next);
    return workbook.pipe(res);
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
