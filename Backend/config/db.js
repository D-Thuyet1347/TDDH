import mongoose from "mongoose";

const getMongoErrorCodes = (error) => {
  const codes = new Set();
  if (error.code) codes.add(error.code);
  for (const server of error.reason?.servers?.values?.() || []) {
    const serverError = server.error;
    if (serverError?.code) codes.add(serverError.code);
    if (serverError?.cause?.code) codes.add(serverError.cause.code);
  }
  return [...codes];
};

export const connectDB = async () => {
  const mongoRequired = process.env.MONGO_REQUIRED_ON_START !== "false";
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      if (!mongoRequired) {
        console.warn("MongoDB URI is not configured; starting without MongoDB.");
        return false;
      }
      throw new Error("MONGODB_URI chưa được cấu hình");
    }
    if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
      throw new Error(
        "MONGODB_URI phải bắt đầu bằng mongodb:// hoặc mongodb+srv://"
      );
    }

    const timeout = Number.parseInt(process.env.MONGODB_TIMEOUT_MS || "30000", 10);

    await mongoose.connect(uri, {
      dbName: "hrc2_qc",
      serverSelectionTimeoutMS: Number.isInteger(timeout) && timeout > 0 ? timeout : 30000,
      connectTimeoutMS: Number.isInteger(timeout) && timeout > 0 ? timeout : 30000,
      
      // Secure TLS configuration for Atlas
      tls: true,
      ssl: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      retryWrites: true,
      retryReads: true
    });

    console.log("✅ DB connected");
    return true;
  } catch (error) {
    const codes = getMongoErrorCodes(error);
    console.error(
      `MongoDB connection error (${error.name}${codes.length ? `: ${codes.join(", ")}` : ""}):`,
      error.message
    );
    
    if (codes.some((code) => code.startsWith("ERR_SSL") || code.startsWith("CERT_"))) {
      console.error(
        "\n🔐 TLS ERROR — Check these:\n" +
        "  1. IP added to Atlas Network Access ✅\n" +
        "  2. MONGODB_URI copied fresh from Atlas Connect button\n" +
        "  3. No VPN/proxy intercepting TLS connection\n" +
        "  4. Node.js version ≥ 18 (supports TLS 1.2+)\n" +
        "  ❌ Do NOT disable certificate validation — it breaks security & Atlas connection"
      );
    } else if (error.name === "MongooseServerSelectionError") {
      console.error(
        "\n🌐 Connection selection failed — Check:\n" +
        "  1. Atlas → Network Access → Add your current public IP\n" +
        "  2. DNS works: run `nslookup cluster0.xxxxx.mongodb.net`\n" +
        "  3. Outbound port 27017 open (some VN ISPs block it)\n" +
        "  4. Try mobile hotspot to rule out network filtering"
      );
    }

    if (!mongoRequired) {
      console.warn(
        "\n⚠️ Starting WITHOUT MongoDB — database routes disabled.\n" +
        "   Fix IP/URI above and restart to enable full functionality."
      );
      return false;
    }
    throw error;
  }
};