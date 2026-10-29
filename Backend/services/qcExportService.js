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

const normalizeFieldText = (value) =>
  value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();

const getDateFieldDetails = async (control) => control.evaluate((element) => {
  const labels = [...(element.labels || [])].map((label) => label.textContent || "");
  let parent = element.parentElement;
  while (parent && parent !== element.form) {
    const parentLabels = [...parent.querySelectorAll("label")];
    if (parentLabels.length) {
      if (parentLabels.length === 1) labels.push(parentLabels[0].textContent || "");
      break;
    }
    parent = parent.parentElement;
  }

  const attributes = [
    element.id,
    element.name,
    element.className,
    element.getAttribute("placeholder"),
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    ...[...element.attributes]
      .filter((attribute) => attribute.name.startsWith("data-"))
      .map((attribute) => attribute.value),
  ];
  return {
    type: (element.getAttribute("type") || "text").toLowerCase(),
    text: [...attributes, ...labels].filter(Boolean).join(" "),
  };
});

const getDateFieldDirection = (text) => {
  const normalized = normalizeFieldText(text);
  const isStart = /\b(start|from|begin|since)\b|ngay bat dau|tu ngay/.test(normalized);
  const isEnd = /\b(end|to|until|finish|through)\b|ket thuc|den ngay/.test(normalized);
  return { isStart, isEnd };
};

const waitForDateControl = async (
  page,
  selector,
  exportFormSelector,
  direction,
  label,
  timeoutMs
) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (selector) {
      const configuredControl = await firstVisible(page.locator(selector));
      if (configuredControl) return configuredControl;
    }

    const form = page.locator(exportFormSelector || "body");
    const inputs = form.locator("input");
    const candidates = [];
    for (let index = 0; index < await inputs.count(); index += 1) {
      const control = inputs.nth(index);
      if (!(await control.isVisible())) continue;
      const details = await getDateFieldDetails(control);
      const fieldDirection = getDateFieldDirection(details.text);
      const isDateInput = ["date", "datetime-local", "datetime"].includes(details.type);
      const mentionsDate = /\b(date|time|datepicker|datetime)\b|ngay|thoi gian/.test(
        normalizeFieldText(details.text)
      );
      if (isDateInput || mentionsDate || fieldDirection.isStart || fieldDirection.isEnd) {
        candidates.push({ control, ...fieldDirection });
      }
    }

    const matchingCandidates = candidates.filter((candidate) =>
      direction === "start"
        ? candidate.isStart && !candidate.isEnd
        : candidate.isEnd && !candidate.isStart
    );
    if (matchingCandidates.length === 1) return matchingCandidates[0].control;

    if (
      matchingCandidates.length === 0 &&
      candidates.length === 2 &&
      candidates.every((candidate) => !candidate.isStart && !candidate.isEnd)
    ) {
      return candidates[direction === "start" ? 0 : 1].control;
    }

    await page.waitForTimeout(Math.min(100, deadline - Date.now()));
  }
  throw new Error(
    `Không tìm thấy trường ${label} trong form xuất. Selector hiện tại: "${selector || "(chưa cấu hình)"}"; ` +
    "hãy cấu hình CSS_FROM_DATE/CSS_TO_DATE hoặc kiểm tra nhãn trường ngày trên website QC."
  );
};

const isQcFactorySelect = async (control) => {
  const tagName = await control.evaluate((element) => element.tagName.toLowerCase());
  if (tagName !== "select") return false;

  const options = await control.locator("option").evaluateAll((items) =>
    items.map((option) => ({
      value: option.value.trim().toLocaleLowerCase(),
      label: (option.label || option.textContent).trim().toLocaleLowerCase(),
    }))
  );
  return QC_FACTORY_OPTIONS.every(({ value, label }) =>
    options.some(
      (option) =>
        option.value === value.toLocaleLowerCase() ||
        option.label === label.toLocaleLowerCase()
    )
  );
};

const waitForFactoryControl = async (page, selector, exportFormSelector, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  const configuredControls = page.locator(selector);
  const exportFormControls = page.locator(`${exportFormSelector} select`);

  while (Date.now() < deadline) {
    const configuredCount = await configuredControls.count();
    for (let index = 0; index < configuredCount; index += 1) {
      const control = configuredControls.nth(index);
      if (await isQcFactorySelect(control)) return control;
      if (
        await control.evaluate((element) => element.tagName.toLowerCase()) !== "select" &&
        await control.isVisible()
      ) {
        return control;
      }
    }

    const formControlCount = await exportFormControls.count();
    for (let index = 0; index < formControlCount; index += 1) {
      const control = exportFormControls.nth(index);
      if (await isQcFactorySelect(control)) return control;
    }
    await page.waitForTimeout(Math.min(100, deadline - Date.now()));
  }

  throw new Error(
    `Không tìm thấy trường nhà máy trong form xuất; hãy kiểm tra CSS_FACTORY (hiện tại: ${selector}).`
  );
};

const fillControl = async (page, selector, value, label) => {
  if (!selector) {
    throw new Error(`Chưa cấu hình selector ${label}.`);
  }
  const controls = typeof selector === "string" ? page.locator(selector) : selector;
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
  await Promise.race([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {}),
    passwordInput.waitFor({ state: "hidden", timeout: 15000 }).catch(() => {}),
    page.waitForTimeout(2000),
  ]);
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(600);
  if (await passwordInput.isVisible()) {
    throw new Error("Website QC chưa chấp nhận đăng nhập; hãy kiểm tra thông tin tài khoản.");
  }
};

const waitForOpenExportAndOpenModal = async (page, selectors, timeoutMs = 25000) => {
  const deadline = Date.now() + Math.min(timeoutMs, 25000);

  const exportFormIsVisible = async () => {
    if (selectors.exportForm) {
      const exportForm = page.locator(selectors.exportForm);
      if (await firstVisible(exportForm)) return true;
    }
    if (selectors.factory) {
      const factoryControl = page.locator(selectors.factory);
      if (await firstVisible(factoryControl)) return true;
    }
    if (selectors.fromDate) {
      const fromDateControl = page.locator(selectors.fromDate);
      if (await firstVisible(fromDateControl)) return true;
    }
    if (selectors.exportForm) {
      const dateInputs = page.locator(
        `${selectors.exportForm} input[type="date"], ${selectors.exportForm} input[type="datetime-local"]`
      );
      if (await firstVisible(dateInputs)) return true;
    }
    return false;
  };

  if (await exportFormIsVisible()) return;

  const candidateSelectors = [
    selectors.openExport,
    'button[onclick*="openExportModal"]',
    'button[onclick*="openExport"]',
    'a[onclick*="openExportModal"]',
    'a[onclick*="openExport"]',
    'button[onclick*="Export"]',
    'button[onclick*="export"]',
    'a[onclick*="Export"]',
    'a[onclick*="export"]',
    '[data-target="#exportExcelModal"]',
    '[data-bs-target="#exportExcelModal"]',
    '[data-target*="Export"]',
    '[data-bs-target*="Export"]',
    '#btnExport',
    '#btnOpenExport',
    '#btn-export',
    '.btn-export',
    'button.btn-export',
    'a.btn-export',
  ].filter(Boolean);

  while (Date.now() < deadline) {
    if (await exportFormIsVisible()) return;

    for (const sel of candidateSelectors) {
      try {
        const btn = await firstVisible(page.locator(sel));
        if (btn) {
          await btn.click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(600);
          if (await exportFormIsVisible()) return;
        }
      } catch {}
    }

    try {
      const textBtn =
        (await firstVisible(page.getByRole("button", { name: /xuất excel|xuat excel|xuất dữ liệu|xuất|export/i }))) ||
        (await firstVisible(page.getByRole("link", { name: /xuất excel|xuat excel|xuất dữ liệu|export/i }))) ||
        (await firstVisible(page.locator('button:has-text("Xuất Excel"), a:has-text("Xuất Excel"), button:has-text("Export"), a:has-text("Export")')));

      if (textBtn) {
        await textBtn.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(600);
        if (await exportFormIsVisible()) return;
      }
    } catch {}

    await page.waitForTimeout(300);
  }

  if (await exportFormIsVisible()) return;

  throw new Error("Không tìm thấy khu vực xuất Excel; hãy kiểm tra CSS_OPEN_EXPORT.");
};

const runQcExport = async (job, config) => {
  if (getMissingQcExportSettings(config).length) {
    throw new Error("Thiếu cấu hình website QC; hãy kiểm tra QC_SITE_URL, QC_USERNAME và QC_PASSWORD trong .env.");
  }
  const configuredSelectors = config.selectors || {};
  const getSelector = (name, fallback = "") =>
    typeof configuredSelectors[name] === "string" && configuredSelectors[name].trim()
      ? configuredSelectors[name].trim()
      : fallback;
  const selectors = {
    loginUsername: getSelector("loginUsername"),
    loginPassword: getSelector("loginPassword"),
    loginButton: getSelector("loginButton"),
    openExport: getSelector("openExport", 'button[onclick="openExportModal()"]'),
    exportForm: getSelector("exportForm", "#exportExcelModal"),
    factory: getSelector("factory", "#expFactory"),
    fromDate: getSelector("fromDate", "#expStartDate"),
    toDate: getSelector("toDate", "#expEndDate"),
    coilIds: getSelector("coilIds"),
    downloadButton: getSelector(
      "downloadButton",
      'button[onclick="executeExportExcel()"]'
    ),
  };
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

    await loginToQcSite(page, { ...config, selectors });
    await waitForOpenExportAndOpenModal(page, selectors, config.pageTimeoutMs);
    const exportFormIsVisible = async () => {
      const exportForm = page.locator(selectors.exportForm);
      return (await firstVisible(exportForm)) ||
        (await firstVisible(exportForm.locator(
          'input[type="date"], input[type="datetime-local"]'
        )));
    };

    if (false && selectors.openExport) {
      if (!(await exportFormIsVisible())) {
        const openExport = await firstVisible(page.locator(selectors.openExport));
        if (!openExport) {
          throw new Error("Không tìm thấy khu vực xuất Excel; hãy kiểm tra CSS_OPEN_EXPORT.");
        }
        await openExport.click();
      }
    } else if (false && !(await exportFormIsVisible())) {
      const exportLink = await firstVisible(
        page.getByRole("link", { name: /xuất|export/i })
      ) || await firstVisible(page.getByRole("button", { name: /xuất|export/i }));
      if (!exportLink) {
        throw new Error("Không tìm thấy màn hình xuất Excel; hãy cấu hình CSS_OPEN_EXPORT.");
      }
      await exportLink.click();
    }

    const factoryControl = await waitForFactoryControl(
      page,
      selectors.factory,
      selectors.exportForm,
      config.pageTimeoutMs
    );
    const fromDateControl = await waitForDateControl(
      page,
      selectors.fromDate,
      selectors.exportForm,
      "start",
      "ngày bắt đầu",
      config.pageTimeoutMs
    );
    const toDateControl = await waitForDateControl(
      page,
      selectors.toDate,
      selectors.exportForm,
      "end",
      "ngày kết thúc",
      config.pageTimeoutMs
    );
    await fillControl(page, factoryControl, job.factory, "nhà máy");
    await fillControl(page, fromDateControl, job.fromDate, "ngày bắt đầu");
    await fillControl(page, toDateControl, job.toDate, "ngày kết thúc");
    if (job.coilIds) {
      if (!selectors.coilIds) {
        throw new Error("Mã cuộn đã nhập nhưng chưa cấu hình CSS_COIL_IDS.");
      }
      await fillControl(page, selectors.coilIds, job.coilIds, "mã cuộn");
    }

    const downloadButton = await firstVisible(page.locator(selectors.downloadButton));
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

export const validateQcExportInput = (input) => {
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
  return { factory, reportId: targetReportId, fromDate, toDate, coilIds };
};

export const createExportJob = async (input) => {
  const { factory, reportId, fromDate, toDate, coilIds } =
    validateQcExportInput(input);
  const config = getQcExportConfig();
  const pendingJobs = [...jobs.values()].filter(
    (job) => job.status === "queued" || job.status === "running"
  ).length;
  if (pendingJobs >= config.maxPending) {
    const error = new Error("Hàng đợi xuất Excel đang đầy; vui lòng thử lại sau.");
    error.status = 429;
    throw error;
  }

  const targetReport = await ensureQcExportReport(reportId);
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
