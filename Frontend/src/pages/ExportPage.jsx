import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, Archive, CheckCircle2, Clock, Download, FileSpreadsheet, LoaderCircle,
  MonitorDown, Power, PowerOff, Upload,
} from 'lucide-react';
import {
  disableQcAutoExport,
  enableQcAutoExport,
  getQcExportAvailability,
  getQcAutoExportStatus,
  getQcExportFileUrl,
  getQcExportJob,
  getQcExportJobs,
  getReports,
  uploadOrderDemandReport,
  startQcExport,
  uploadReport,
} from '../APIs';
import QcLayout from '../components/QcLayout';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { fileSize, vnDateTime } from '../utils/ultils';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const toLocalDateTimeValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 16);
  }
  let d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) {
    const m = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (m) {
      d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]), Number(m[4] || 8), Number(m[5] || 0));
    }
  }
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hasTime = value instanceof Date || (typeof value === 'string' && value.includes(':'));
  const hh = String(hasTime ? d.getHours() : 8).padStart(2, '0');
  const min = String(hasTime ? d.getMinutes() : 0).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

const getDefaultExportDateRange = () => {
  const now = new Date();
  const yesterday8AM = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 8, 0, 0);
  const today8AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  return {
    fromDate: toLocalDateTimeValue(yesterday8AM),
    toDate: toLocalDateTimeValue(today8AM),
  };
};

const DEFAULT_REPORT_ID = '6adf6dc6c603752d3ddd162d';
const DEFAULT_FACTORY_OPTIONS = [
  { value: 'HRC1', label: 'Nhà máy HRC 1' },
  { value: 'HRC2', label: 'Nhà máy HRC 2' },
  { value: 'ALL', label: 'Tất cả nhà máy' },
];

function ExportJobStatus({ job }) {
  if (!job) return null;
  const active = job.status === 'queued' || job.status === 'running';
  const completed = job.status === 'completed';
  const hasFile = Boolean(job.download_url);
  const files = job.files || [];
  const currentMonth = job.current_month;
  const selectedMonths = job.selected_months || (job.month === 'all' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : []);
  const totalMonths = selectedMonths.length || (job.month === 'all' ? 12 : 1);
  const currentMonthIndex = currentMonth && selectedMonths.length
    ? Math.max(1, selectedMonths.indexOf(currentMonth) + 1)
    : (currentMonth || 1);
  const isMultiple = files.length > 1 || job.month === 'all' || selectedMonths.length > 1;

  return (
    <section className={`rounded-2xl border p-5 transition-all ${
      job.status === 'failed' ? 'border-rose-200 bg-rose-50/70' : 'border-indigo-100 bg-indigo-50/40'
    }`} aria-live="polite">
      <div className="flex items-start gap-3.5">
        {active ? (
          <LoaderCircle size={22} className="mt-0.5 shrink-0 animate-spin text-indigo-600" />
        ) : completed ? (
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle size={22} className="mt-0.5 shrink-0 text-rose-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">
            {job.status === 'queued' && (job.status_message || 'Đang chờ xuất dữ liệu…')}
            {job.status === 'running' && (job.status_message || (currentMonth ? `Đang xuất dữ liệu Tháng ${currentMonth} (${currentMonthIndex}/${totalMonths})…` : 'Đang đăng nhập và tải dữ liệu từ website QC…'))}
            {completed && (job.status_message || (isMultiple ? 'Xuất các file đã chọn và hoàn tất lưu trữ thành công!' : 'Xuất dữ liệu thành công!'))}
            {job.status === 'failed' && 'Không thể hoàn thành tác vụ xuất'}
          </p>

          {active && currentMonth && isMultiple && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Tiến độ xuất: Tháng {currentMonth} ({currentMonthIndex}/{totalMonths})</span>
                <span>{Math.round((currentMonthIndex / totalMonths) * 100)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round((currentMonthIndex / totalMonths) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {job.filename && <p className="mt-1 break-all text-xs font-semibold text-slate-700">{job.filename}</p>}
          {job.error && <p className="mt-1 text-xs font-semibold text-rose-700">{job.error}</p>}
          {completed && job.import_error && (
            <p className="mt-1 text-xs font-medium text-amber-700">{job.import_error}</p>
          )}
          {completed && job.report_id && (
            <p className="mt-1 text-xs text-slate-600">
              Đã lưu tổng cộng {job.rows_imported?.toLocaleString('vi-VN') || 0} dòng vào MongoDB ({isMultiple ? (job.filename || 'Tong_Hop_QC_HRC2.xlsx') : (job.filename || 'Dữ liệu báo cáo')}).
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            {hasFile && (
              <Button asChild size="sm" className="h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-bold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500">
                <a href={job.download_url}>
                  <Download size={15} /> Tải {isMultiple ? (job.filename || 'Tong_Hop_QC_HRC2.xlsx') : (job.filename || 'file Excel')}
                </a>
              </Button>
            )}
            {hasFile && isMultiple && files.length > 1 && (
              <Button asChild size="sm" variant="outline" className="h-9 rounded-xl border-indigo-200 bg-white px-3.5 text-xs font-bold text-indigo-700 shadow-xs hover:bg-indigo-50">
                <a href={getQcExportFileUrl(job.job_id, null, true)}>
                  <Archive size={15} /> Tải trọn bộ {files.length} file (.ZIP)
                </a>
              </Button>
            )}
            {completed && job.report_id && (
              <Link
                to={`/data?job_id=${encodeURIComponent(job.report_id)}`}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-indigo-600 shadow-xs transition hover:bg-slate-50"
              >
                Xem dữ liệu đã nhập
              </Link>
            )}
          </div>

          {files.length > 0 && (
            <div className="mt-5 border-t border-indigo-100/80 pt-4">
              <p className="text-xs font-bold text-slate-800 mb-2.5">
                {isMultiple ? `Kho lưu trữ file (${files.length} file):` : `File đã lưu trữ (${files.length} file):`}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {files.map((f) => (
                  <div
                    key={f.name}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                      f.is_aggregate
                        ? 'border-emerald-300 bg-emerald-50/80 font-bold text-emerald-950 sm:col-span-2'
                        : 'border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          f.is_aggregate ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {f.is_aggregate ? 'Tổng hợp 12T' : f.month ? `Tháng ${f.month}` : 'Báo cáo'}
                        </span>
                        <span className="truncate font-semibold text-slate-800" title={f.name}>
                          {f.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{f.row_count?.toLocaleString('vi-VN') || 0} dòng</span>
                        <span>•</span>
                        <span>{fileSize(f.bytes)}</span>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="ghost" className="h-8 px-2 text-indigo-600 hover:bg-indigo-100/70 hover:text-indigo-800">
                      <a href={f.download_url} title={`Tải ${f.name}`}>
                        <Download size={14} />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ExportPage() {
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const [mode, setMode] = useState('web');
  const [file, setFile] = useState(null);
  const [uploadReportType, setUploadReportType] = useState('qc');
  const [factory, setFactory] = useState('');
  const [targetReportId, setTargetReportId] = useState(DEFAULT_REPORT_ID);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedMonths, setSelectedMonths] = useState([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const [includeAggregate, setIncludeAggregate] = useState(true);
  const [exportTime, setExportTime] = useState('08:00');
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [fromDate, setFromDate] = useState(() => getDefaultExportDateRange().fromDate);
  const [toDate, setToDate] = useState(() => getDefaultExportDateRange().toDate);
  const [coilIds, setCoilIds] = useState('');
  const [availability, setAvailability] = useState(null);
  const [autoSchedule, setAutoSchedule] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingAutoSchedule, setUpdatingAutoSchedule] = useState(false);
  const [loadingAutoSchedule, setLoadingAutoSchedule] = useState(true);
  const lastAutoJobId = useRef(null);
  const factoryOptions = availability?.factories?.length
    ? availability.factories
    : DEFAULT_FACTORY_OPTIONS;

  // Restore running or latest export job on page load/mount
  useEffect(() => {
    let isCancelled = false;
    const restoreRunningJob = async () => {
      try {
        const res = await getQcExportJobs();
        if (isCancelled || !res?.jobs?.length) return;
        const active = res.jobs.find((j) => j.status === 'queued' || j.status === 'running');
        if (active) {
          setJob(active);
          localStorage.setItem('qc_active_export_job_id', active.job_id);
          return;
        }

        const savedId = localStorage.getItem('qc_active_export_job_id');
        if (savedId) {
          const matched = res.jobs.find((j) => j.job_id === savedId);
          if (matched) {
            setJob(matched);
            return;
          }
        }

        if (res.jobs[0]) {
          setJob(res.jobs[0]);
        }
      } catch (err) {
        // Silently ignore
      }
    };
    restoreRunningJob();
    return () => {
      isCancelled = true;
    };
  }, []);

  const toggleMonth = (m) => {
    setSelectedMonths((prev) => {
      const exists = prev.includes(m);
      if (exists) {
        return prev.filter((item) => item !== m);
      }
      return [...prev, m].sort((a, b) => a - b);
    });
  };

  const selectAll = () => {
    setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    setIncludeAggregate(true);
  };

  const deselectAll = () => {
    setSelectedMonths([]);
    setIncludeAggregate(false);
  };

  const selectCurrentMonth = () => {
    const curMonth = new Date().getMonth() + 1;
    setSelectedMonths([curMonth]);
  };

  const allSelected = selectedMonths.length === 12 && includeAggregate;

  const toggleSelectAll = () => {
    if (allSelected) {
      deselectAll();
    } else {
      selectAll();
    }
  };

  const handleYearChange = (newYear) => {
    setYear(newYear);
    if (!isCustomRange && selectedMonths.length) {
      const now = new Date();
      const minM = Math.min(...selectedMonths);
      const maxM = Math.max(...selectedMonths);
      const nextMaxM = maxM === 12 ? 1 : maxM + 1;
      const nextMaxY = maxM === 12 ? newYear + 1 : newYear;
      const [h, min] = (exportTime || '08:00').split(':').map(Number);
      const start = new Date(newYear, minM - 1, 1, h || 8, min || 0, 0);
      const isCurrentMonthMax = newYear === now.getFullYear() && maxM === now.getMonth() + 1;
      const end = isCurrentMonthMax
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 8, min || 0, 0)
        : new Date(nextMaxY, nextMaxM - 1, 1, h || 8, min || 0, 0);
      setFromDate(toLocalDateTimeValue(start));
      setToDate(toLocalDateTimeValue(end));
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getQcExportAvailability(controller.signal),
      getReports({ limit: 100, offset: 0, signal: controller.signal }),
    ])
      .then(([config, reportResult]) => {
        setAvailability(config);
        const qcReports = reportResult.reports.filter(
          (report) => (report.report_type || 'qc') === 'qc'
        );
        setTargetReportId((currentId) => (
          qcReports.some((report) => report.job_id === currentId)
            ? currentId
            : qcReports.find((report) => report.job_id === DEFAULT_REPORT_ID)?.job_id
              || qcReports[0]?.job_id
              || DEFAULT_REPORT_ID
        ));
        setFactory((currentFactory) => (
          (config.factories || DEFAULT_FACTORY_OPTIONS)
            .some((option) => option.value === currentFactory)
            ? currentFactory
            : (config.factories || DEFAULT_FACTORY_OPTIONS)
              .find((option) => option.value === 'HRC2')?.value || ''
        ));
      })
      .catch((configError) => {
        if (!controller.signal.aborted) setError(configError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingConfig(false);
      });
    getQcAutoExportStatus(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          const schedule = result.schedule;
          setAutoSchedule(schedule);
          if (schedule?.selected_months?.length) {
            setSelectedMonths(schedule.selected_months);
          } else if (schedule?.month && schedule.month !== 'all' && schedule.month !== 'custom') {
            const m = Number(schedule.month);
            if (!isNaN(m)) setSelectedMonths([m]);
          }
          if (schedule?.include_aggregate !== undefined) {
            setIncludeAggregate(Boolean(schedule.include_aggregate));
          }
          if (schedule?.is_custom_range !== undefined) {
            setIsCustomRange(Boolean(schedule.is_custom_range));
          } else if (schedule?.month === 'custom') {
            setIsCustomRange(true);
          }
          if (schedule?.export_time) setExportTime(schedule.export_time);
          if (schedule?.year) setYear(schedule.year);
          if (schedule?.from_date) setFromDate(schedule.from_date);
          if (schedule?.to_date) setToDate(schedule.to_date);
        }
      })
      .catch((scheduleError) => {
        if (!controller.signal.aborted) setError(scheduleError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAutoSchedule(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!autoSchedule?.enabled) return undefined;
    const controller = new AbortController();
    let timer;
    const pollAutoSchedule = async () => {
      try {
        const result = await getQcAutoExportStatus(controller.signal);
        if (controller.signal.aborted) return;
        const schedule = result.schedule;
        setAutoSchedule(schedule);
        const jobId = schedule.active_job_id;
        if (jobId && jobId !== lastAutoJobId.current) {
          const jobResult = await getQcExportJob(jobId, controller.signal);
          if (controller.signal.aborted) return;
          lastAutoJobId.current = jobId;
          setJob(jobResult.job);
        }
        timer = setTimeout(pollAutoSchedule, 300);
      } catch (pollError) {
        if (!controller.signal.aborted) {
          setError(pollError.message);
          timer = setTimeout(pollAutoSchedule, 300);
        }
      }
    };
    timer = setTimeout(pollAutoSchedule, 1000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [autoSchedule?.enabled]);

  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'running')) return undefined;
    const controller = new AbortController();
    let timer;
    const pollJob = async () => {
      try {
        const result = await getQcExportJob(job.job_id, controller.signal);
        if (controller.signal.aborted) return;
        setJob(result.job);
        if (result.job.status === 'queued' || result.job.status === 'running') {
          timer = setTimeout(pollJob, 1500);
        }
      } catch (pollError) {
        if (!controller.signal.aborted) {
          setError(pollError.message);
          timer = setTimeout(pollJob, 3000);
        }
      }
    };
    timer = setTimeout(pollJob, 700);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [job]);

  const hasAutoDownloaded = useRef(false);
  useEffect(() => {
    if (job?.status === 'completed' && job?.download_url && !hasAutoDownloaded.current) {
      hasAutoDownloaded.current = true;
      const a = document.createElement('a');
      a.href = job.download_url;
      a.download = job.filename || 'Bao_Cao_QC.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (job?.status !== 'completed') {
      hasAutoDownloaded.current = false;
    }
  }, [job?.status, job?.download_url, job?.filename]);

  const selectFile = (event) => {
    const selected = event.target.files?.[0] || null;
    setError('');
    if (!selected) {
      setFile(null);
      return;
    }
    if (!/\.(xlsx|xls)$/i.test(selected.name)) {
      setError('Vui lòng chọn file có định dạng .xlsx hoặc .xls.');
      setFile(null);
      event.target.value = '';
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError('File vượt quá giới hạn 20 MB.');
      setFile(null);
      event.target.value = '';
      return;
    }
    setFile(selected);
  };

  const toggleAutoExport = async () => {
    if (updatingAutoSchedule) return;
    setUpdatingAutoSchedule(true);
    setError('');
    try {
      const result = autoSchedule?.enabled
        ? await disableQcAutoExport()
        : await enableQcAutoExport({
          factory,
          year,
          month: isCustomRange ? 'custom' : (selectedMonths.length === 12 && includeAggregate ? 'all' : selectedMonths.join(',')),
          months: selectedMonths,
          includeAggregate,
          isCustomRange,
          fromDate,
          toDate,
          coilIds,
          reportId: targetReportId,
        });
      setAutoSchedule(result.schedule);
    } catch (scheduleError) {
      setError(scheduleError.message);
    } finally {
      setUpdatingAutoSchedule(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setJob(null);
    try {
      if (mode === 'web') {
        if (!isCustomRange && selectedMonths.length === 0 && !includeAggregate) {
          setError('Vui lòng tick chọn ít nhất 1 file tháng hoặc file tổng hợp để xuất.');
          setSubmitting(false);
          return;
        }

        const result = await startQcExport({
          factory,
          year,
          month: isCustomRange ? 'custom' : (selectedMonths.length === 12 && includeAggregate ? 'all' : selectedMonths.join(',')),
          months: selectedMonths,
          includeAggregate,
          isCustomRange,
          exportTime,
          fromDate,
          toDate,
          coilIds,
          reportId: targetReportId,
        });
        setJob(result.job);
        if (result.job?.job_id) {
          localStorage.setItem('qc_active_export_job_id', result.job.job_id);
        }
      } else {
        if (!file) {
          setError('Vui lòng chọn file Excel cần tải lên.');
          return;
        }
        const result = uploadReportType === 'order-demand'
          ? await uploadOrderDemandReport(file)
          : await uploadReport(file);
        const destination = uploadReportType === 'order-demand' ? '/orders' : '/data';
        navigate(`${destination}?job_id=${encodeURIComponent(result.report.job_id)}`, {
          state: { message: result.message },
        });
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <QcLayout>
      <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
        <header>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
            <Upload size={14} className="text-indigo-600" /> Nhập và xuất dữ liệu
          </div>
          <h1 className="text-[clamp(28px,3vw,36px)] font-extrabold leading-tight tracking-tight text-slate-900">
            Tạo & Xuất báo cáo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Xuất trực tiếp từ website QC hoặc tải file Excel có sẵn để lưu và tra cứu.
          </p>
        </header>

        {/* Tab switch */}
        <div className="flex flex-wrap gap-2.5" role="tablist" aria-label="Nguồn dữ liệu Excel">
          <Button
            type="button"
            variant={mode === 'web' ? 'default' : 'outline'}
            size="sm"
            role="tab"
            aria-selected={mode === 'web'}
            onClick={() => { setMode('web'); setError(''); if (!autoSchedule?.enabled) setJob(null); }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              mode === 'web'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/20'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MonitorDown size={16} /> Xuất từ website QC
          </Button>
          <Button
            type="button"
            variant={mode === 'upload' ? 'default' : 'outline'}
            size="sm"
            role="tab"
            aria-selected={mode === 'upload'}
            onClick={() => { setMode('upload'); setError(''); if (!autoSchedule?.enabled) setJob(null); }}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              mode === 'upload'
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/20'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Upload size={16} /> Tải file có sẵn
          </Button>
        </div>

        <Card asChild className="rounded-2xl border-slate-200/80 bg-white p-6 shadow-card sm:p-8">
          <form onSubmit={submit} className="space-y-6">
            {mode === 'web' ? (
              <>
                {!loadingConfig && availability && !availability.configured && (
                  <Alert variant="warning" className="flex items-start gap-2.5 p-4 text-xs font-semibold">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>Cần cấu hình các biến Backend: {availability.missingSettings.join(', ')}.</span>
                  </Alert>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">Nhà máy xuất dữ liệu</span>
                    <Select
                      required
                      disabled={loadingConfig || availability?.configured === false || autoSchedule?.enabled}
                      value={factory}
                      onChange={(event) => setFactory(event.target.value)}
                      className="h-10 w-full"
                    >
                      {!factory && <option value="" disabled>Chọn nhà máy</option>}
                      {factoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </Select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">
                      Năm xuất dữ liệu
                    </span>
                    <Select
                      required
                      disabled={autoSchedule?.enabled}
                      value={year}
                      onChange={(event) => handleYearChange(Number(event.target.value))}
                      className="h-10 w-full"
                    >
                      {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                        <option key={y} value={y}>Năm {y}</option>
                      ))}
                    </Select>
                  </label>

                  {/* Danh sách file cần cài đặt & xuất (Tick chọn) */}
                  <div className="sm:col-span-2 space-y-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <FileSpreadsheet size={17} className="text-indigo-600" />
                          Cài đặt danh sách file xuất / lưu trữ
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Tick chọn các file tháng hoặc file tổng hợp cần hệ thống xuất và đồng bộ. Dữ liệu mới sẽ tự động ghi đè và cập nhật vào các file có sẵn.
                        </p>
                      </div>

                      {/* Chuyển đổi giữa Chế độ tick chọn file vs Tùy chọn khoảng ngày (Logic cũ) */}
                      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs cursor-pointer select-none hover:border-indigo-300">
                        <Checkbox
                          checked={isCustomRange}
                          onChange={(e) => setIsCustomRange(e.target.checked)}
                          disabled={autoSchedule?.enabled}
                        />
                        <span>Tùy chọn khoảng ngày tìm kiếm (Logic cũ)</span>
                      </label>
                    </div>

                    {!isCustomRange ? (
                      <div className="space-y-3 pt-1">
                        {/* Thanh công cụ chọn nhanh */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/90 pb-3">
                          <label className="flex items-center gap-2.5 text-xs font-bold text-slate-900 cursor-pointer select-none">
                            <Checkbox
                              checked={allSelected}
                              onChange={toggleSelectAll}
                              disabled={autoSchedule?.enabled}
                              className="h-4 w-4"
                            />
                            <span>Chọn tất cả (12 tháng + File tổng hợp - 13 file)</span>
                          </label>

                          <div className="flex items-center gap-1.5 text-xs">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={selectAll}
                              disabled={autoSchedule?.enabled}
                              className="h-7 px-2.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50"
                            >
                              Chọn tất cả
                            </Button>
                            <span className="text-slate-300">|</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={selectCurrentMonth}
                              disabled={autoSchedule?.enabled}
                              className="h-7 px-2.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              Tháng hiện tại (T{new Date().getMonth() + 1})
                            </Button>
                            <span className="text-slate-300">|</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={deselectAll}
                              disabled={autoSchedule?.enabled}
                              className="h-7 px-2.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
                            >
                              Bỏ chọn hết
                            </Button>
                          </div>
                        </div>

                        {/* Cài đặt giờ lấy dữ liệu cho các file tháng */}
                        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gradient-to-r from-indigo-50/80 via-white to-indigo-50/60 border border-indigo-200/80 rounded-2xl shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                              <Clock size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">
                                  Khung giờ lấy dữ liệu mỗi tháng:
                                </span>
                                <span className="inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-xs font-extrabold text-indigo-800">
                                  {exportTime}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-500 font-normal">
                                Các tháng trước: từ <strong>01 tháng này ({exportTime})</strong> đến <strong>01 tháng sau ({exportTime})</strong>. Tháng hiện tại: từ <strong>01.{String(new Date().getMonth() + 1).padStart(2, '0')} ({exportTime})</strong> đến <strong>hôm nay ({String(new Date().getDate()).padStart(2, '0')}.{String(new Date().getMonth() + 1).padStart(2, '0')}) lúc {exportTime}</strong>.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="time"
                              value={exportTime}
                              onChange={(e) => setExportTime(e.target.value || '08:00')}
                              disabled={autoSchedule?.enabled}
                              className="h-9 w-28 text-xs font-mono font-bold text-indigo-700 bg-white border-indigo-200 focus:border-indigo-500 rounded-xl"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setExportTime('08:00')}
                              disabled={autoSchedule?.enabled}
                              className={`h-9 px-2.5 text-xs font-bold rounded-xl transition-all ${
                                exportTime === '08:00'
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                  : 'text-indigo-700 border-indigo-200 hover:bg-indigo-50 bg-white'
                              }`}
                            >
                              08:00 AM (Chuẩn ca QC)
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setExportTime('07:00')}
                              disabled={autoSchedule?.enabled}
                              className={`h-9 px-2.5 text-xs font-semibold rounded-xl transition-all ${
                                exportTime === '07:00'
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                  : 'text-slate-600 border-slate-200 hover:bg-slate-50 bg-white'
                              }`}
                            >
                              07:00 AM
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setExportTime('00:00')}
                              disabled={autoSchedule?.enabled}
                              className={`h-9 px-2.5 text-xs font-semibold rounded-xl transition-all ${
                                exportTime === '00:00'
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                  : 'text-slate-600 border-slate-200 hover:bg-slate-50 bg-white'
                              }`}
                            >
                              00:00
                            </Button>
                          </div>
                        </div>

                        {/* Danh sách 12 file tháng */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                            const isChecked = selectedMonths.includes(m);
                            const nowDate = new Date();
                            const isCurrent = year === nowDate.getFullYear() && m === nowDate.getMonth() + 1;
                            const todayDay = nowDate.getDate();
                            const nextM = m === 12 ? 1 : m + 1;
                            const nextY = m === 12 ? year + 1 : year;
                            return (
                              <label
                                key={m}
                                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? isCurrent
                                      ? 'border-amber-400 bg-amber-50/80 font-bold text-amber-950 shadow-2xs ring-1 ring-amber-400/30'
                                      : 'border-indigo-400 bg-indigo-50/80 font-bold text-indigo-950 shadow-2xs ring-1 ring-indigo-400/30'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50/80'
                                } ${autoSchedule?.enabled ? 'cursor-not-allowed opacity-60' : ''}`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onChange={() => toggleMonth(m)}
                                  disabled={autoSchedule?.enabled}
                                  className="shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="block truncate font-bold">
                                      Tháng {m}
                                      {isCurrent && (
                                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-200/90 px-1.5 py-0.2 rounded ml-1.5">
                                          Hiện tại
                                        </span>
                                      )}
                                    </span>
                                    <span className="block text-[10px] text-slate-400 font-normal">Thang_{m}.xlsx</span>
                                  </div>
                                  <span className={`block text-[10px] font-mono mt-0.5 ${isCurrent ? 'text-amber-800 font-bold' : 'text-indigo-600 font-medium'}`}>
                                    {isCurrent
                                      ? `01.${String(m).padStart(2, '0')} → ${String(todayDay).padStart(2, '0')}.${String(m).padStart(2, '0')} (${exportTime})`
                                      : `01.${String(m).padStart(2, '0')} → 01.${String(nextM).padStart(2, '0')}${m === 12 ? `.${nextY}` : ''} (${exportTime})`
                                    }
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        {/* Checkbox file tổng hợp Tong_Hop_QC_HRC2.xlsx */}
                        <label
                          className={`flex items-start gap-3 rounded-xl border p-3 text-xs cursor-pointer select-none transition-all ${
                            includeAggregate
                              ? 'border-emerald-400 bg-emerald-50/90 font-semibold text-emerald-950 shadow-2xs ring-1 ring-emerald-400/30'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-slate-50/80'
                          } ${autoSchedule?.enabled ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          <Checkbox
                            checked={includeAggregate}
                            onChange={(e) => setIncludeAggregate(e.target.checked)}
                            disabled={autoSchedule?.enabled}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-emerald-900">
                                Tạo file tổng hợp Tong_Hop_QC_HRC2.xlsx
                              </span>
                              <span className="rounded bg-emerald-200/80 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                Gộp {selectedMonths.length} tháng đã tick
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-600 font-normal leading-relaxed">
                              Hệ thống sẽ tự động ghép toàn bộ dữ liệu của {selectedMonths.length} tháng đã chọn và đánh lại STT tăng dần liên tục vào 1 file tổng hợp duy nhất.
                            </p>
                          </div>
                        </label>

                        {/* Tóm tắt số lượng file */}
                        <div className="flex flex-wrap items-center justify-between rounded-xl bg-indigo-50/50 px-3.5 py-2.5 text-xs text-indigo-950 border border-indigo-100">
                          <span className="font-medium">
                            Đã cài đặt: <strong>{selectedMonths.length}</strong> file tháng {includeAggregate ? '+ 1 file tổng hợp' : ''} = <strong>{selectedMonths.length + (includeAggregate ? 1 : 0)} file</strong> sẽ được lưu trữ.
                          </span>
                          <span className="font-mono text-[11px] font-bold text-indigo-700">Năm {year}</span>
                        </div>
                      </div>
                    ) : (
                      /* Chế độ tùy chọn khoảng ngày (Logic cũ) */
                      <div className="space-y-3 pt-1">
                        <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-700">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <p className="font-semibold text-slate-800">
                              Chế độ tìm kiếm tùy chọn khoảng ngày (Logic cũ):
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={autoSchedule?.enabled}
                              onClick={() => {
                                const range = getDefaultExportDateRange();
                                setFromDate(range.fromDate);
                                setToDate(range.toDate);
                              }}
                              className="h-7 px-2.5 text-[11px] font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                            >
                              Đặt lại: 8:00 AM hôm qua → 8:00 AM hôm nay
                            </Button>
                          </div>
                          <p className="text-slate-500 mb-3 leading-relaxed">
                            Mặc định thiết lập từ <strong>8:00 AM hôm qua</strong> đến <strong>8:00 AM hôm nay</strong> (chuẩn ca làm việc 24h QC đã hoàn thành <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-indigo-700">mm/dd/yyyy hh:ss</code>) và xuất ra file <strong>Tong_Hop_QC_HRC2.xlsx</strong>.
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label>
                              <span className="mb-1 block text-xs font-bold text-slate-700">Từ ngày</span>
                              <Input
                                required
                                disabled={autoSchedule?.enabled}
                                type="datetime-local"
                                step="60"
                                value={fromDate}
                                max={toDate}
                                onChange={(event) => setFromDate(event.target.value)}
                                className="h-10 w-full"
                              />
                            </label>
                            <label>
                              <span className="mb-1 block text-xs font-bold text-slate-700">Đến ngày</span>
                              <Input
                                required
                                disabled={autoSchedule?.enabled}
                                type="datetime-local"
                                step="60"
                                value={toDate}
                                min={fromDate}
                                onChange={(event) => setToDate(event.target.value)}
                                className="h-10 w-full"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">Mã cuộn (không bắt buộc)</span>
                    <Textarea
                      rows={2}
                      maxLength={10000}
                      disabled={autoSchedule?.enabled}
                      value={coilIds}
                      onChange={(event) => setCoilIds(event.target.value)}
                      placeholder="Nhập một hoặc nhiều mã cuộn nếu cần lọc riêng…"
                      className="w-full"
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Tải file Excel có sẵn</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Chọn loại báo cáo cần lưu. Dữ liệu đã có của loại báo cáo đó sẽ được thay thế an toàn.
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-700">Loại báo cáo</span>
                  <Select
                    value={uploadReportType}
                    onChange={(event) => setUploadReportType(event.target.value)}
                    disabled={submitting}
                    className="h-10 w-full"
                  >
                    <option value="qc">Báo cáo QC HRC2</option>
                    <option value="order-demand">Theo dõi đơn hàng HRC2</option>
                  </Select>
                  <span className="mt-1.5 block text-[11px] leading-5 text-slate-400">
                    {uploadReportType === 'order-demand'
                      ? 'File cần sheet “Nhu cầu đơn hàng HRC”. Dữ liệu đơn hàng lưu trong collection Tong_Hop_Don_Hang_HRC2 cùng database hrc2_qc.'
                      : 'Nhập dữ liệu tự động từ tất cả sheet của file Excel QC.'}
                  </span>
                </label>

                {/* Dropzone */}
                <label
                  htmlFor="excel-file"
                  className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-9 text-center transition-all hover:border-indigo-400 hover:bg-indigo-50/20"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100 shadow-xs">
                    <FileSpreadsheet size={26} />
                  </span>
                  <span className="mt-4 text-sm font-bold text-slate-800">
                    {file ? file.name : 'Chọn file Excel để tải lên'}
                  </span>
                  <span className="mt-1.5 text-xs text-slate-400">
                    {file ? `${fileSize(file.size)} · Excel Document` : 'Định dạng .xlsx hoặc .xls · Dung lượng tối đa 20 MB'}
                  </span>
                  <Input
                    ref={inputRef}
                    id="excel-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={selectFile}
                    className="sr-only"
                  />
                </label>
              </>
            )}

            {error && (
              <Alert variant="destructive" className="flex items-start gap-2.5 p-4 text-xs font-semibold">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </Alert>
            )}

            {(mode === 'web' || autoSchedule?.enabled) && <ExportJobStatus job={job} />}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="flex items-center gap-2 text-xs text-slate-500">
                <FileSpreadsheet size={16} className="text-emerald-600" />
                {mode === 'web' && availability?.importRows
                  ? 'File xuất sẽ trực tiếp ghi đè lên các file tháng có sẵn và cập nhật đồng bộ vào hệ thống dữ liệu.'
                  : 'Thông tin được xử lý an toàn tại tầng Backend.'}
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                {(mode === 'web' || autoSchedule?.enabled) && (
                  <Button
                    type="button"
                    variant={autoSchedule?.enabled ? 'destructive' : 'outline'}
                    disabled={loadingAutoSchedule || updatingAutoSchedule || (
                      !autoSchedule?.enabled && (
                        loadingConfig || availability?.configured === false || !factory ||
                        !year || !targetReportId || !fromDate || !toDate
                      )
                    )}
                    onClick={toggleAutoExport}
                    aria-pressed={Boolean(autoSchedule?.enabled)}
                  >
                    {autoSchedule?.enabled ? <PowerOff size={16} /> : <Power size={16} />}
                    {updatingAutoSchedule
                      ? 'Đang cập nhật…'
                      : autoSchedule?.enabled
                        ? 'Tắt Auto'
                        : 'Bật Auto'}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={submitting || (mode === 'web' && (
                    loadingConfig || availability?.configured === false || !factory ||
                    !fromDate || !toDate ||
                    autoSchedule?.enabled
                  ))}
                  className="inline-flex h-10 items-center gap-2"
                >
                  {submitting ? 'Đang gửi yêu cầu…' : mode === 'web' ? 'Bắt đầu xuất dữ liệu' : 'Tải lên và lưu báo cáo'}
                </Button>
              </div>
            </div>

            {autoSchedule?.enabled && (
              <Alert variant="warning" className="space-y-1 rounded-2xl p-4 text-xs">
                <p className="font-semibold">
                  Chế độ Auto đang hoạt động: Hệ thống tự động lặp lại sau mỗi 5 phút kể từ khi tác vụ trước hoàn tất.
                </p>
                {autoSchedule.next_run_at && (
                  <p className="text-slate-600">Lần xuất tiếp theo: {vnDateTime(autoSchedule.next_run_at)}.</p>
                )}
                {autoSchedule.last_error && (
                  <p className="text-rose-700 font-semibold">Lỗi lần chạy gần nhất: {autoSchedule.last_error}</p>
                )}
              </Alert>
            )}
          </form>
        </Card>

        <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-xs font-medium text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <p>
            Tác vụ chạy ngầm trên máy chủ. Thời gian xử lý phụ thuộc vào website QC và khoảng ngày được chọn.
            {job?.status === 'completed' && ` Hoàn tất lúc ${vnDateTime(job.updated_at)}.`}
          </p>
        </div>

        <div>
          <Link to="/reports" className="inline-flex text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
            ← Xem kho báo cáo đã lưu
          </Link>
        </div>
      </div>
    </QcLayout>
  );
}
