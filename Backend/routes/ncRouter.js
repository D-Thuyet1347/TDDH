import express from "express";
import multer from "multer";
import {
  createNcRow,
  downloadNcReport,
  deleteNcRow,
  getNcRows,
  listNcReports,
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
ncRouter.get(
  "/reports/:reportId/sheets/:sheetName/rows",
  getNcRows
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
