import mongoose from "mongoose";

const qcReportSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
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
    workbook: { type: Buffer, required: true, select: false },
  },
  { timestamps: true }
);

export default mongoose.models.QcReport ||
  mongoose.model("QcReport", qcReportSchema);
