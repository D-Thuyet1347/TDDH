import mongoose from "mongoose";
import { initializeNcModel } from "./ncModel.js";

const ncReportSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    reportType: {
      type: String,
      enum: ["order-demand"],
      default: "order-demand",
    },
    savedAt: { type: Date, default: Date.now, index: true },
    bytes: { type: Number, required: true, min: 1 },
    rowsImported: { type: Number, required: true, min: 0 },
    sheets: {
      type: [
        {
          name: { type: String, required: true },
          rowCount: { type: Number, required: true },
          columns: { type: [String], default: [] },
        },
      ],
      default: [],
    },
    workbook: { type: Buffer, select: false },
    workbookId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true, collection: "Tong_Hop_Don_Hang_HRC2_Reports" }
);

let ncReportModel;

export const initializeNcReportModel = () => {
  initializeNcModel();
  const connection = mongoose.connection;
  ncReportModel = connection.models.NcReport ||
    connection.model("NcReport", ncReportSchema);
  return ncReportModel;
};

export { ncReportModel as default };
