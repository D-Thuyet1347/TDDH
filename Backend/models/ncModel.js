import mongoose from "mongoose";

const ORDER_DEMAND_COLLECTION = "Tong_Hop_Don_Hang_HRC2";

const orderDemandRowSchema = new mongoose.Schema(
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

orderDemandRowSchema.index(
  { reportId: 1, sheetName: 1, rowNumber: 1 },
  { unique: true }
);

export let ncModel;

export const initializeNcModel = () => {
  const connection = mongoose.connection;
  ncModel = connection.models.NcRow ||
    connection.model("NcRow", orderDemandRowSchema, ORDER_DEMAND_COLLECTION);
  return ncModel;
};

export { ncModel as default };
