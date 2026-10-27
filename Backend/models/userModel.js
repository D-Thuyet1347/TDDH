import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 32,
      unique: true,
      sparse: true,
    },
    email: { type: String, trim: true, unique: true, sparse: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin", "manager", "employee"], default: "user" },
    verificationCode: { type: String, default: null },
    verificationCodeExpires: { type: Date, default: null },
    isEmailVerified: { type: Boolean, default: false }
  },
  { timestamps: true, autoIndex: false }
);

const userModel = mongoose.models.User || mongoose.model("User", userSchema);

export const ensureUserIndexes = async () => {
  const indexes = await userModel.collection.indexes();
  for (const index of indexes) {
    const isAccountIndex = index.unique &&
      ((index.key.username === 1 && !index.sparse) ||
        (index.key.email === 1 && !index.sparse));
    if (isAccountIndex) {
      await userModel.collection.dropIndex(index.name);
    }
  }

  await userModel.collection.createIndex(
    { username: 1 },
    { unique: true, sparse: true, name: "username_1" }
  );
  await userModel.collection.createIndex(
    { email: 1 },
    { unique: true, sparse: true, name: "email_1" }
  );
};

export default userModel;