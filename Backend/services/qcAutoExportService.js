import mongoose from "mongoose";
import QcAutoExport from "../models/qcAutoExportModel.js";
import {
  createExportJob,
  getExportJob,
  validateQcExportInput,
} from "./qcExportService.js";

const AUTO_EXPORT_ID = "qc-auto-export";
const EXPORT_INTERVAL_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 3000;

let timer;
let ticking = false;

const publicSchedule = (schedule) => ({
  enabled: Boolean(schedule?.enabled),
  factory: schedule?.factory || "",
  report_id: schedule?.reportId || "",
  from_date: schedule?.fromDate || "",
  to_date: schedule?.toDate || "",
  coil_ids: schedule?.coilIds || "",
  active_job_id: schedule?.activeJobId || null,
  last_job_id: schedule?.lastJobId || null,
  next_run_at: schedule?.nextRunAt || null,
  last_started_at: schedule?.lastStartedAt || null,
  last_completed_at: schedule?.lastCompletedAt || null,
  last_error: schedule?.lastError || null,
});

const ensureDatabase = () => {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error("MongoDB chưa kết nối; không thể quản lý lịch tự động.");
    error.status = 503;
    throw error;
  }
};

const scheduleTick = (delay = POLL_INTERVAL_MS) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    void runAutoExportTick();
  }, Math.max(0, delay));
  timer.unref?.();
};

const runAutoExportTick = async () => {
  if (ticking) return;
  ticking = true;
  try {
    const schedule = await QcAutoExport.findById(AUTO_EXPORT_ID);
    if (!schedule) return;

    if (schedule.activeJobId) {
      const job = getExportJob(schedule.activeJobId);
      if (!job) {
        schedule.activeJobId = null;
        schedule.nextRunAt = schedule.enabled ? new Date() : null;
        await schedule.save();
        if (schedule.enabled) scheduleTick(0);
        return;
      }

      if (job.status === "queued" || job.status === "running") {
        scheduleTick(POLL_INTERVAL_MS);
        return;
      }

      schedule.activeJobId = null;
      schedule.lastCompletedAt = new Date();
      schedule.lastError = job.status === "failed"
        ? job.error
        : job.import_error || null;
      schedule.nextRunAt = schedule.enabled
        ? new Date(Date.now() + EXPORT_INTERVAL_MS)
        : null;
      await schedule.save();
      if (schedule.enabled) scheduleTick(EXPORT_INTERVAL_MS);
      return;
    }

    if (!schedule.enabled) return;
    const waitMs = schedule.nextRunAt
      ? new Date(schedule.nextRunAt).getTime() - Date.now()
      : 0;
    if (waitMs > 0) {
      scheduleTick(waitMs);
      return;
    }

    try {
      const job = await createExportJob({
        factory: schedule.factory,
        reportId: schedule.reportId,
        fromDate: schedule.fromDate,
        toDate: schedule.toDate,
        coilIds: schedule.coilIds,
      });
      schedule.activeJobId = job.job_id;
      schedule.lastJobId = job.job_id;
      schedule.lastStartedAt = new Date();
      schedule.nextRunAt = null;
      schedule.lastError = null;
      await schedule.save();
      scheduleTick(POLL_INTERVAL_MS);
    } catch (error) {
      schedule.lastError = error.message || "Không thể bắt đầu tác vụ tự động.";
      schedule.nextRunAt = new Date(Date.now() + EXPORT_INTERVAL_MS);
      await schedule.save();
      console.error("QC auto export could not start:", error.message);
      scheduleTick(EXPORT_INTERVAL_MS);
    }
  } catch (error) {
    console.error("QC auto export scheduler failed:", error.message);
    scheduleTick(POLL_INTERVAL_MS);
  } finally {
    ticking = false;
  }
};

export const getQcAutoExportStatus = async () => {
  ensureDatabase();
  const schedule = await QcAutoExport.findById(AUTO_EXPORT_ID).lean();
  return publicSchedule(schedule);
};

export const enableQcAutoExport = async (input) => {
  ensureDatabase();
  const filters = validateQcExportInput(input);
  const schedule = await QcAutoExport.findByIdAndUpdate(
    AUTO_EXPORT_ID,
    {
      $set: {
        enabled: true,
        factory: filters.factory,
        reportId: filters.reportId,
        fromDate: filters.fromDate,
        toDate: filters.toDate,
        coilIds: filters.coilIds,
        nextRunAt: new Date(),
        lastError: null,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  scheduleTick(0);
  return publicSchedule(schedule);
};

export const disableQcAutoExport = async () => {
  ensureDatabase();
  const schedule = await QcAutoExport.findByIdAndUpdate(
    AUTO_EXPORT_ID,
    { $set: { enabled: false, nextRunAt: null } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  clearTimeout(timer);
  if (schedule.activeJobId) scheduleTick(0);
  return publicSchedule(schedule);
};

export const initializeQcAutoExport = async () => {
  if (mongoose.connection.readyState !== 1) return;
  const schedule = await QcAutoExport.findById(AUTO_EXPORT_ID).lean();
  if (!schedule?.enabled) return;
  const waitMs = schedule.activeJobId || !schedule.nextRunAt
    ? 0
    : Math.max(0, new Date(schedule.nextRunAt).getTime() - Date.now());
  scheduleTick(waitMs);
};
