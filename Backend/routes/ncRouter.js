import express from "express";
import multer from "multer";
import {
  createNcRow,
  downloadNcReport,
  deleteNcRow,
  getNcColumnValues,
  getNcRows,
  listNcReports,
  syncNcWithQc,
  updateNcRow,
  uploadNcReport,
} from "../controllers/ncController.js";

const ncRouter = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

ncRouter.get("/reports", listNcReports);
ncRouter.post("/reports", upload.single("file"), uploadNcReport);
ncRouter.get("/reports/:reportId/file", downloadNcReport);
ncRouter.all("/reports/:reportId/sync-qc", syncNcWithQc);
ncRouter.all("/sync-qc", syncNcWithQc);
ncRouter.get(
  "/reports/:reportId/sheets/:sheetName/rows",
  getNcRows
);
ncRouter.get(
  "/reports/:reportId/sheets/:sheetName/column-values",
  getNcColumnValues
);
ncRouter.get(
  "/reports/:reportId/column-values",
  getNcColumnValues
);
ncRouter.post(
  "/reports/:reportId/sheets/:sheetName/rows",
  createNcRow
);
ncRouter.put(
  "/reports/:reportId/sheets/:sheetName/rows/:rowId",
  updateNcRow
);
ncRouter.delete(
  "/reports/:reportId/sheets/:sheetName/rows/:rowId",
  deleteNcRow
);

export default ncRouter;
