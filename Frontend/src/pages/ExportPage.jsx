import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Download, FileSpreadsheet, LoaderCircle,
  MonitorDown, Power, PowerOff, Upload,
} from 'lucide-react';
import {
  disableQcAutoExport,
  enableQcAutoExport,
  getQcExportAvailability,
  getQcAutoExportStatus,
  getQcExportFileUrl,
  getQcExportJob,
  getReports,
  uploadOrderDemandReport,
  startQcExport,
  uploadReport,
} from '../AllAPIs';
import QcLayout from '../components/QcLayout';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { fileSize, nf, vnDateTime } from '../utils/ultils';

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const toLocalDateTimeValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T08:00`;
const getDefaultExportDateRange = () => {
  const now = new Date();
  return {
    fromDate: toLocalDateTimeValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    toDate: toLocalDateTimeValue(now),
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
  return (
    <section className={`rounded-2xl border p-5 transition-all ${
      job.status === 'failed' ? 'border-rose-200 bg-rose-50/70' : 'border-indigo-100 bg-indigo-50/40'
    }`} aria-live="polite">
      <div className="flex items-start gap-3.5">
        {active ? (
          <LoaderCircle size={20} className="mt-0.5 shrink-0 animate-spin text-indigo-600" />
        ) : completed ? (
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">
            {job.status === 'queued' && 'Đang chờ xuất dữ liệu…'}
            {job.status === 'running' && 'Đang đăng nhập và tải dữ liệu từ website QC…'}
            {completed && 'Xuất dữ liệu thành công'}
            {job.status === 'failed' && 'Không thể hoàn thành tác vụ xuất'}
          </p>
          {job.filename && <p className="mt-1 break-all text-xs font-semibold text-slate-700">{job.filename}</p>}
          {job.error && <p className="mt-1 text-xs font-semibold text-rose-700">{job.error}</p>}
          {completed && job.import_error && (
            <p className="mt-1 text-xs font-medium text-amber-700">{job.import_error}</p>
          )}
          {completed && job.report_id && (
            <p className="mt-1 text-xs text-slate-600">
              Đã lưu {job.rows_imported?.toLocaleString('vi-VN') || 0} dòng vào MongoDB.
            </p>
          )}
          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            {hasFile && (
              <Button asChild size="sm" className="h-9 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-bold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500">
                <a href={getQcExportFileUrl(job.job_id)}>
                  <Download size={15} /> Tải file Excel
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
  const [reports, setReports] = useState([]);
  const [targetReportId, setTargetReportId] = useState(DEFAULT_REPORT_ID);
  const [fromDate, setFromDate] = useState(() => getDefaultExportDateRange().fromDate);
  const [toDate, setToDate] = useState(() => getDefaultExportDateRange().toDate);
  const [coilIds, setCoilIds] = useState('');
  const [availability, setAvailability] = useState(null);
  const [autoSchedule, setAutoSchedule] = useState(null);
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingAutoSchedule, setUpdatingAutoSchedule] = useState(false);
  const [loadingAutoSchedule, setLoadingAutoSchedule] = useState(true);
  const lastAutoJobId = useRef(null);
  const factoryOptions = availability?.factories?.length
    ? availability.factories
    : DEFAULT_FACTORY_OPTIONS;

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
        setReports(qcReports);
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
        if (!controller.signal.aborted) setLoadingReports(false);
      });
    getQcAutoExportStatus(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setAutoSchedule(result.schedule);
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
        const result = await startQcExport({
          factory,
          fromDate,
          toDate,
          coilIds,
          reportId: targetReportId,
        });
        setJob(result.job);
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
                  <label className="sm:col-span-2">
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
                      Từ ngày <span className="font-normal text-slate-400">(đầu tháng, 08:00)</span>
                    </span>
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
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">
                      Đến ngày <span className="font-normal text-slate-400">(hôm nay, 08:00)</span>
                    </span>
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

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-bold text-slate-700">Mã cuộn (không bắt buộc)</span>
                    <Textarea
                      rows={3}
                      maxLength={10000}
                      disabled={autoSchedule?.enabled}
                      value={coilIds}
                      onChange={(event) => setCoilIds(event.target.value)}
                      placeholder="Nhập một hoặc nhiều mã cuộn theo định dạng website yêu cầu…"
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
                  ? 'File xuất tự động đồng bộ vào MongoDB Atlas khi kết nối khả dụng.'
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
                        !fromDate || !toDate || !targetReportId
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
