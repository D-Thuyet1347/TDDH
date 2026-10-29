import mongoose from "mongoose";

const qcAutoExportSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "qc-auto-export" },
    enabled: { type: Boolean, default: false },
    factory: { type: String, default: "" },
    reportId: { type: String, default: "" },
    fromDate: { type: String, default: "" },
    toDate: { type: String, default: "" },
    coilIds: { type: String, default: "" },
    activeJobId: { type: String, default: null },
    lastJobId: { type: String, default: null },
    nextRunAt: { type: Date, default: null },
    lastStartedAt: { type: Date, default: null },
    lastCompletedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
  },
  { timestamps: true, versionKey: false, collection: "qc_auto_export_settings" }
);

export default mongoose.models.QcAutoExport ||
  mongoose.model("QcAutoExport", qcAutoExportSchema);
