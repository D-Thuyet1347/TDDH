import mongoose from "mongoose";

const qcRowSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QcReport",
      required: true,
    },
    sheetName: { type: String, required: true },
    rowNumber: { type: Number, required: true },
    values: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { versionKey: false }
);

qcRowSchema.index({ reportId: 1, sheetName: 1, rowNumber: 1 });

export default mongoose.models.QcRow || mongoose.model("QcRow", qcRowSchema);
