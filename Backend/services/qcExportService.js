import { randomUUID } from "crypto";
import { mkdir, mkdtemp, readFile, rm } from "fs/promises";
import os from "os";
import path from "path";
import { chromium } from "playwright";
import mongoose from "mongoose";
import QcReport from "../models/qcReportModel.js";
import { importQcReport, QC_REPORT_ID } from "./qcReportService.js";
import {
  getMissingQcExportSettings,
  getQcExportConfig,
  QC_FACTORY_OPTIONS,
} from "./qcExportConfig.js";

const jobs = new Map();
let processingQueue = false;

const safeFilename = (filename) =>
  path.basename(filename || "HRC2_QC_Export.xlsx")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .slice(0, 150);

const publicJob = (job) => ({
  job_id: job.id,
  status: job.status,
  factory: job.factory,
  from_date: job.fromDate,
  to_date: job.toDate,
  coil_ids: job.coilIds,
  target_report_id: job.targetReportId,
  target_report_filename: job.targetReportFilename,
  filename: job.filename || null,
  rows_imported: job.rowsImported ?? null,
  report_id: job.reportId || null,
  import_status: job.importStatus,
  import_error: job.importError || null,
  error: job.error || null,
  created_at: job.createdAt,
  updated_at: job.updatedAt,
  download_url: job.filePath ? `/api/qc/exports/jobs/${job.id}/file` : null,
});

const setJobStatus = (job, status, updates = {}) => {
  Object.assign(job, updates, { status, updatedAt: new Date() });
};

const firstVisible = async (locator) => {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  return null;
};

const fillControl = async (page, selector, value, label) => {
  if (!selector) {
    throw new Error(`Chưa cấu hình selector ${label}.`);
  }
  const controls = page.locator(selector);
  const count = await controls.count();
  let control = null;
  let selectControl = null;

  for (let index = 0; index < count; index += 1) {
    const candidate = controls.nth(index);
    const tagName = await candidate.evaluate((element) => element.tagName.toLowerCase());
    if (tagName === "select") {
      selectControl = candidate;
      if (await candidate.isVisible()) {
        control = candidate;
        break;
      }
    } else if (!control && await candidate.isVisible()) {
      control = candidate;
    }
  }

  control ||= selectControl;
  if (!control) {
    throw new Error(`Không tìm thấy trường ${label}; hãy kiểm tra selector CSS tương ứng.`);
  }

  const tagName = await control.evaluate((element) => element.tagName.toLowerCase());
  if (tagName === "select") {
    const options = await control.locator("option").evaluateAll((items) =>
      items.map((option) => ({
        value: option.value,
        label: option.label || option.textContent.trim(),
      }))
    );
    const normalizedValue = value.trim().toLocaleLowerCase();
    const matchingOption = options.find(
      (option) =>
        option.value.trim().toLocaleLowerCase() === normalizedValue ||
        option.label.trim().toLocaleLowerCase() === normalizedValue
    );
    if (!matchingOption) {
      throw new Error(`Không tìm thấy nhà máy "${value}" trong danh sách trên website QC.`);
    }
    if (await control.isVisible()) {
      await control.selectOption(matchingOption.value);
    } else {
      await control.evaluate((select, selectedValue) => {
        select.value = selectedValue;
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }, matchingOption.value);
    }
    return;
  }

  const inputType = tagName === "input" ? await control.getAttribute("type") : null;
  const dateValue = value.slice(0, 10);
  const timeValue = value.slice(11, 16);
  const controlValue = inputType === "datetime-local"
    ? value
    : inputType === "time"
      ? timeValue
      : dateValue;
  await control.fill(controlValue);
};

const findLoginButton = async (page, selector) => {
  if (selector) return firstVisible(page.locator(selector));
  const roleButton = await firstVisible(
    page.getByRole("button", { name: /đăng nhập|login|sign in/i })
  );
  if (roleButton) return roleButton;
  return firstVisible(page.locator('button[type="submit"], input[type="submit"]'));
};

const loginToQcSite = async (page, config) => {
  await page.goto(config.siteUrl, {
    waitUntil: "domcontentloaded",
    timeout: config.pageTimeoutMs,
  });

  const usernameSelector = config.selectors.loginUsername ||
    'input[autocomplete="username"], input[type="email"], input[name*="user" i], input[id*="user" i], input[type="text"]';
  const passwordSelector = config.selectors.loginPassword || 'input[type="password"]';
  const usernameInput = await firstVisible(page.locator(usernameSelector));
  const passwordInput = await firstVisible(page.locator(passwordSelector));

  if (!usernameInput && !passwordInput) {
    throw new Error(
      "Không tìm thấy form đăng nhập trên website QC; hãy cấu hình các CSS_LOGIN_* trong .env."
    );
  }
  if (!usernameInput || !passwordInput) {
    throw new Error(
      "Không tìm thấy đủ trường tài khoản và mật khẩu; hãy kiểm tra CSS_LOGIN_USERNAME và CSS_LOGIN_PASSWORD."
    );
  }

  await usernameInput.fill(config.username);
  await passwordInput.fill(config.password);
  const loginButton = await findLoginButton(page, config.selectors.loginButton);
  if (!loginButton) {
    throw new Error("Không tìm thấy nút đăng nhập; hãy cấu hình CSS_LOGIN_BUTTON trong .env.");
  }
  await loginButton.click();
  await page.waitForTimeout(700);
  if (await passwordInput.isVisible()) {
    throw new Error("Website QC chưa chấp nhận đăng nhập; hãy kiểm tra thông tin tài khoản.");
  }
};

const runQcExport = async (job, config) => {
  if (getMissingQcExportSettings(config).length) {
    throw new Error("Thiếu cấu hình website QC; hãy kiểm tra QC_SITE_URL, QC_USERNAME và QC_PASSWORD trong .env.");
  }
  const siteUrl = new URL(config.siteUrl);
  if (!["http:", "https:"].includes(siteUrl.protocol) || siteUrl.username || siteUrl.password) {
    throw new Error("QC_SITE_URL phải là địa chỉ HTTP(S) hợp lệ và không chứa thông tin đăng nhập.");
  }

  const browser = await chromium.launch({
    headless: config.headless,
    ...(config.chromiumPath ? { executablePath: config.chromiumPath } : {}),
    timeout: config.pageTimeoutMs,
  });

  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(config.pageTimeoutMs);
    page.setDefaultNavigationTimeout(config.pageTimeoutMs);

    await loginToQcSite(page, config);
    if (config.selectors.openExport) {
      const openExport = await firstVisible(page.locator(config.selectors.openExport));
      if (!openExport) {
        throw new Error("Không tìm thấy khu vực xuất Excel; hãy kiểm tra CSS_OPEN_EXPORT.");
      }
      await openExport.click();
    } else if (!(await firstVisible(page.locator(config.selectors.factory)))) {
      const exportLink = await firstVisible(
        page.getByRole("link", { name: /xuất|export/i })
      ) || await firstVisible(page.getByRole("button", { name: /xuất|export/i }));
      if (!exportLink) {
        throw new Error("Không tìm thấy màn hình xuất Excel; hãy cấu hình CSS_OPEN_EXPORT.");
      }
      await exportLink.click();
    }

    await page.locator(config.selectors.factory).first().waitFor({
      state: "attached",
      timeout: config.pageTimeoutMs,
    });
    await fillControl(page, config.selectors.factory, job.factory, "nhà máy");
    await fillControl(page, config.selectors.fromDate, job.fromDate, "ngày bắt đầu");
    await fillControl(page, config.selectors.toDate, job.toDate, "ngày kết thúc");
    if (job.coilIds) {
      if (!config.selectors.coilIds) {
        throw new Error("Mã cuộn đã nhập nhưng chưa cấu hình CSS_COIL_IDS.");
      }
      await fillControl(page, config.selectors.coilIds, job.coilIds, "mã cuộn");
    }

    const downloadButton = await firstVisible(page.locator(config.selectors.downloadButton));
    if (!downloadButton) {
      throw new Error("Không tìm thấy nút tải Excel; hãy kiểm tra CSS_DOWNLOAD_BUTTON.");
    }
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: config.downloadTimeoutMs }),
      downloadButton.click(),
    ]);
    const downloadFailure = await download.failure();
    if (downloadFailure) {
      throw new Error(`Website QC không tạo được file Excel: ${downloadFailure}`);
    }

    const suggestedFilename = safeFilename(download.suggestedFilename());
    const extension = path.extname(suggestedFilename).toLowerCase() === ".xls"
      ? ".xls"
      : ".xlsx";
    job.filename = `${job.targetReportFilename}${extension}`;
    let targetDirectory;
    if (config.keepLocalExport) {
      targetDirectory = path.resolve(process.cwd(), "exports");
      await mkdir(targetDirectory, { recursive: true });
    } else {
      targetDirectory = await mkdtemp(path.join(os.tmpdir(), "hrc2-qc-export-"));
      job.tempDirectory = targetDirectory;
    }
    job.filePath = path.join(targetDirectory, `${job.id}-${job.filename}`);
    await download.saveAs(job.filePath);
    await context.close();
  } finally {
    await browser.close();
  }
};

const removeTemporaryFile = async (job) => {
  if (!job.tempDirectory) return;
  const directory = job.tempDirectory;
  job.filePath = null;
  job.tempDirectory = null;
  await rm(directory, { recursive: true, force: true });
};

const processJob = async (job) => {
  const config = getQcExportConfig();
  setJobStatus(job, "running");

  try {
    let targetReport = await QcReport.findOne({
      _id: job.targetReportId,
      reportType: { $ne: "order-demand" },
    })
      .select("filename")
      .lean();
    if (!targetReport) {
      job.targetReportId = QC_REPORT_ID;
      targetReport = await QcReport.findOne({
        _id: QC_REPORT_ID,
        reportType: { $ne: "order-demand" },
      })
        .select("filename")
        .lean();
    }
    job.targetReportFilename = targetReport?.filename
      ? path.parse(targetReport.filename).name
      : QC_REPORT_FILENAME;

    await runQcExport(job, config);
    if (config.importRows) {
      if (mongoose.connection.readyState !== 1) {
        job.importStatus = "skipped";
        job.importError =
          "File đã xuất nhưng MongoDB chưa kết nối nên dữ liệu chưa được lưu.";
      } else {
        job.importStatus = "running";
        try {
          const report = await importQcReport({
            buffer: await readFile(job.filePath),
            originalName: job.filename,
            filename: job.targetReportFilename,
            reportId: job.targetReportId,
            maxRows: config.maxRows,
          });
          job.reportId = report._id.toString();
          job.rowsImported = report.rowsImported;
          job.importStatus = "completed";
        } catch (error) {
          job.importStatus = "failed";
          job.importError =
            `File đã xuất nhưng không thể lưu dữ liệu vào MongoDB: ${error.message}`;
          console.error(`QC export ${job.id} MongoDB import failed:`, error.message);
        }
      }
    }
    setJobStatus(job, "completed");
  } catch (error) {
    setJobStatus(job, "failed", {
      error: error.message || "Không thể xuất dữ liệu từ website QC.",
    });
    console.error(`QC export ${job.id} failed:`, error.message);
  } finally {
    if (!config.keepLocalExport && job.filePath) {
      const timer = setTimeout(() => {
        removeTemporaryFile(job).catch((error) => {
          console.error(`Unable to remove temporary export ${job.id}:`, error.message);
        });
      }, 30 * 60 * 1000);
      timer.unref();
    }
  }
};

const runQueue = async () => {
  if (processingQueue) return;
  processingQueue = true;
  try {
    const queuedJobs = [...jobs.values()]
      .filter((job) => job.status === "queued")
      .sort((first, second) => first.createdAt - second.createdAt);
    for (const job of queuedJobs) {
      await processJob(job);
    }
  } finally {
    processingQueue = false;
    if ([...jobs.values()].some((job) => job.status === "queued")) {
      void runQueue();
    }
  }
};

export const getQcExportAvailability = () => {
  const missingSettings = getMissingQcExportSettings();
  return {
    configured: missingSettings.length === 0,
    missingSettings,
    factories: QC_FACTORY_OPTIONS,
    importRows: getQcExportConfig().importRows,
    keepLocalExport: getQcExportConfig().keepLocalExport,
  };
};

const ensureQcExportReport = async (requestedReportId) => {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error("MongoDB chưa kết nối; không thể tạo báo cáo QC.");
    error.status = 503;
    throw error;
  }

  let reportId = requestedReportId;
  let report = await QcReport.findById(reportId).select("filename reportType").lean();
  if (report?.reportType === "order-demand") {
    reportId = new mongoose.Types.ObjectId().toString();
    report = null;
  }
  if (report) return { reportId, filename: path.parse(report.filename).name };

  const filename = `${QC_REPORT_FILENAME}.xlsx`;
  report = await QcReport.findByIdAndUpdate(
    reportId,
    {
      $setOnInsert: {
        filename,
        originalName: filename,
        reportType: "qc",
        savedAt: new Date(),
        bytes: 1,
        rowsImported: 0,
        sheets: [],
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  )
    .select("filename reportType")
    .lean();

  if (report.reportType === "order-demand") {
    const error = new Error("Không thể tạo báo cáo QC vì mã báo cáo đang được dùng cho đơn hàng.");
    error.status = 409;
    throw error;
  }
  return { reportId: report._id.toString(), filename: path.parse(report.filename).name };
};

export const createExportJob = async (input) => {
  const config = getQcExportConfig();
  const missingSettings = getMissingQcExportSettings(config);
  if (missingSettings.length) {
    const error = new Error(`Thiếu cấu hình: ${missingSettings.join(", ")}.`);
    error.status = 503;
    throw error;
  }

  const factory = String(input.factory || "").trim();
  const targetReportId = String(input.reportId || QC_REPORT_ID);
  const rawFromDate = String(input.fromDate || "");
  const rawToDate = String(input.toDate || "");
  const coilIds = String(input.coilIds || "").trim();
  if (!QC_FACTORY_OPTIONS.some((option) => option.value === factory)) {
    const error = new Error("Vui lòng chọn nhà máy trong danh sách.");
    error.status = 400;
    throw error;
  }
  if (!mongoose.Types.ObjectId.isValid(targetReportId)) {
    const error = new Error("Vui lòng chọn báo cáo cần ghi đè.");
    error.status = 400;
    throw error;
  }
  const normalizeDateTime = (value, isEnd) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `${value}T${isEnd ? "23:59" : "00:00"}`;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      return value;
    }
    return null;
  };
  const fromDate = normalizeDateTime(rawFromDate, false);
  const toDate = normalizeDateTime(rawToDate, true);
  if (!fromDate || !toDate) {
    const error = new Error("Vui lòng nhập ngày giờ bắt đầu và kết thúc hợp lệ.");
    error.status = 400;
    throw error;
  }
  if (fromDate > toDate) {
    const error = new Error("Thời gian bắt đầu không được sau thời gian kết thúc.");
    error.status = 400;
    throw error;
  }
  if (coilIds.length > 10000) {
    const error = new Error("Danh sách mã cuộn không được vượt quá 10.000 ký tự.");
    error.status = 400;
    throw error;
  }
  const isRealDateTime = (value) => {
    const datePart = value.slice(0, 10);
    const timePart = value.slice(11);
    const date = new Date(`${datePart}T00:00:00Z`);
    const [hours, minutes] = timePart.split(":").map(Number);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === datePart &&
      hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  };
  if (!isRealDateTime(fromDate) || !isRealDateTime(toDate)) {
    const error = new Error("Ngày giờ bắt đầu và kết thúc không hợp lệ.");
    error.status = 400;
    throw error;
  }

  const pendingJobs = [...jobs.values()].filter(
    (job) => job.status === "queued" || job.status === "running"
  ).length;
  if (pendingJobs >= config.maxPending) {
    const error = new Error("Hàng đợi xuất Excel đang đầy; vui lòng thử lại sau.");
    error.status = 429;
    throw error;
  }

  const targetReport = await ensureQcExportReport(targetReportId);
  const now = new Date();
  const job = {
    id: randomUUID(),
    status: "queued",
    importStatus: config.importRows ? "pending" : "not_requested",
    factory,
    targetReportId: targetReport.reportId,
    targetReportFilename: targetReport.filename,
    fromDate,
    toDate,
    coilIds,
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(job.id, job);
  while (jobs.size > 200) {
    const oldestJob = jobs.values().next().value;
    if (oldestJob.status === "queued" || oldestJob.status === "running") break;
    jobs.delete(oldestJob.id);
  }
  void runQueue();
  return publicJob(job);
};

export const getExportJob = (id) => {
  const job = jobs.get(id);
  return job ? publicJob(job) : null;
};

export const getExportJobFile = (id) => {
  const job = jobs.get(id);
  return job?.filePath ? { ...publicJob(job), filePath: job.filePath } : null;
};

export const getExportJobs = () =>
  [...jobs.values()]
    .map(publicJob)
    .sort((first, second) => new Date(second.created_at) - new Date(first.created_at));

export const consumeTemporaryExport = async (id) => {
  const job = jobs.get(id);
  if (job && !getQcExportConfig().keepLocalExport) {
    await removeTemporaryFile(job);
  }
};
