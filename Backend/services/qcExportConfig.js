const getBoolean = (value, fallback) => {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
};

const getPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getSelector = (name, fallback = "") => {
  const value = process.env[name]?.trim() || fallback;
  if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  if (value.length > 1 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
};

export const QC_FACTORY_OPTIONS = [
  { value: "HRC1", label: "Nhà máy HRC 1" },
  { value: "HRC2", label: "Nhà máy HRC 2" },
  { value: "ALL", label: "Tất cả nhà máy" },
];

export const getQcExportConfig = () => ({
  siteUrl: process.env.QC_SITE_URL?.trim() || "",
  username: process.env.QC_USERNAME || "",
  password: process.env.QC_PASSWORD || "",
  headless: getBoolean(process.env.HEADLESS, true),
  pageTimeoutMs: getPositiveInteger(process.env.PAGE_TIMEOUT_MS, 60000),
  downloadTimeoutMs: getPositiveInteger(process.env.DOWNLOAD_TIMEOUT_MS, 180000),
  chromiumPath: process.env.CHROMIUM_PATH?.trim() || "",
  maxPending: getPositiveInteger(process.env.MAX_PENDING, 30),
  keepLocalExport: getBoolean(process.env.KEEP_LOCAL_EXPORT, true),
  importRows: getBoolean(process.env.MONGODB_IMPORT_ROWS, true),
  maxRows: Number.parseInt(process.env.MONGODB_MAX_ROWS || "0", 10),
  selectors: {
    loginUsername: getSelector("CSS_LOGIN_USERNAME"),
    loginPassword: getSelector("CSS_LOGIN_PASSWORD"),
    loginButton: getSelector("CSS_LOGIN_BUTTON"),
    openExport: getSelector("CSS_OPEN_EXPORT", 'button[onclick="openExportModal()"]'),
    factory: getSelector("CSS_FACTORY", "#expFactory"),
    fromDate: getSelector("CSS_FROM_DATE", "#expStartDate"),
    toDate: getSelector("CSS_TO_DATE", "#expEndDate"),
    coilIds: getSelector("CSS_COIL_IDS", "#expCoilIds"),
    downloadButton: getSelector(
      "CSS_DOWNLOAD_BUTTON",
      'button[onclick="executeExportExcel()"]'
    ),
  },
});

export const getMissingQcExportSettings = (config = getQcExportConfig()) =>
  [
    ["QC_SITE_URL", config.siteUrl],
    ["QC_USERNAME", config.username],
    ["QC_PASSWORD", config.password],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
