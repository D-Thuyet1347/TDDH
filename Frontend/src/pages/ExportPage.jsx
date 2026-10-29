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
import { fileSize, vnDateTime } from '../utils/ultils';

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
    <section className={`rounded-xl border p-4 ${
      job.status === 'failed' ? 'border-rose-200 bg-rose-50' : 'border-[#dce4f5] bg-[#f8faff]'
    }`} aria-live="polite">
      <div className="flex items-start gap-3">
        {active ? (
          <LoaderCircle size={19} className="mt-0.5 shrink-0 animate-spin text-[#405bb0]" />
        ) : completed ? (
          <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle size={19} className="mt-0.5 shrink-0 text-rose-600" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">
            {job.status === 'queued' && 'Đang chờ xuất dữ liệu…'}
            {job.status === 'running' && 'Đang đăng nhập và tải dữ liệu từ website QC…'}
            {completed && 'Xuất dữ liệu thành công'}
            {job.status === 'failed' && 'Không thể hoàn thành tác vụ xuất'}
          </p>
          {job.filename && <p className="mt-1 break-all text-xs text-slate-600">{job.filename}</p>}
          {job.error && <p className="mt-1 text-xs text-rose-700">{job.error}</p>}
          {completed && job.import_error && (
            <p className="mt-1 text-xs text-amber-700">{job.import_error}</p>
          )}
          {completed && job.report_id && (
            <p className="mt-1 text-xs text-slate-600">
              Đã lưu {job.rows_imported?.toLocaleString('vi-VN') || 0} dòng vào MongoDB.
            </p>
          )}
          {hasFile && (
            <Button asChild variant="outline" size="sm" className="mt-3">
              <a href={getQcExportFileUrl(job.job_id)}><Download size={15} /> Tải file Excel</a>
            </Button>
          )}
          {completed && job.report_id && (
            <Link
              to={`/data?job_id=${encodeURIComponent(job.report_id)}`}
              className="ml-2 mt-3 inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold text-[#405bb0] hover:bg-white"
            >
              Xem dữ liệu đã nhập
            </Link>
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
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-xs font-semibold text-blue-700">Nhập và xuất dữ liệu</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Tạo báo cáo</h1>
          <p className="mt-2 text-sm text-slate-500">Xuất trực tiếp từ website QC hoặc tải file Excel có sẵn để lưu và tra cứu.</p>
        </header>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Nguồn dữ liệu Excel">
          <Button
            type="button"
            variant={mode === 'web' ? 'default' : 'outline'}
            size="sm"
            role="tab"
            aria-selected={mode === 'web'}
            onClick={() => { setMode('web'); setError(''); if (!autoSchedule?.enabled) setJob(null); }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold ${
              mode === 'web' ? 'bg-[#405bb0] text-white' : 'border border-slate-200 bg-white text-slate-600'
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
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold ${
              mode === 'upload' ? 'bg-[#405bb0] text-white' : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            <Upload size={16} /> Tải file có sẵn
          </Button>
        </div>

        <Card asChild className="rounded-2xl border-slate-200/80 p-5 sm:p-7">
        <form onSubmit={submit} className="space-y-5">
          {mode === 'web' ? (
            <>
              {/* <div>
                <h2 className="text-lg font-extrabold text-slate-800">Điều kiện xuất</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Backend đăng nhập website bằng thông tin trong `.env`. Tài khoản và mật khẩu không được gửi xuống trình duyệt.
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-700">
                  Báo cáo bạn chọn sẽ bị thay toàn bộ dữ liệu khi tác vụ xuất hoàn tất.
                </p>
              </div> */}

              {!loadingConfig && availability && !availability.configured && (
                <Alert variant="warning" className="flex items-start gap-2 px-3 py-2.5 text-sm">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>Cần cấu hình các biến Backend: {availability.missingSettings.join(', ')}.</span>
                </Alert>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="sm:col-span-3">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Nhà máy xuất dữ liệu</span>
                  <Select
                    required
                    disabled={loadingConfig || availability?.configured === false || autoSchedule?.enabled}
                    value={factory}
                    onChange={(event) => setFactory(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#7992dc]"
                  >
                    {!factory && <option value="" disabled>Chọn nhà máy</option>}
                    {factoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Select>
                </label>
                <label className="sm:col-span-3 hidden">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Báo cáo cần ghi đè</span>
                  <Select
                    disabled={loadingReports || autoSchedule?.enabled}
                    value={targetReportId}
                    onChange={(event) => setTargetReportId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#7992dc] disabled:bg-slate-50"
                  >
                    {loadingReports && <option value="">Đang tải danh sách báo cáo…</option>}
                    {!loadingReports && reports.length === 0 && (
                      <option value="">Chưa có báo cáo để ghi đè</option>
                    )}
                    {reports.map((report) => (
                      <option key={report.job_id} value={report.job_id}>
                        {report.filename} · {report.rows_imported?.toLocaleString('vi-VN') || 0} dòng · {vnDateTime(report.saved_at)}
                      </option>
                    ))}
                  </Select>
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Từ ngày <span className="font-normal text-slate-500">(đầu tháng, 08:00)</span>
                  </span>
                  <Input
                    required
                    disabled={autoSchedule?.enabled}
                    type="datetime-local"
                    step="60"
                    value={fromDate}
                    max={toDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#7992dc]"
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    Đến ngày <span className="font-normal text-slate-500">(hôm nay, 08:00)</span>
                  </span>
                  <Input
                    required
                    disabled={autoSchedule?.enabled}
                    type="datetime-local"
                    step="60"
                    value={toDate}
                    min={fromDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#7992dc]"
                  />
                </label>
                <div className="hidden sm:block" />
                <label className="sm:col-span-3">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">Mã cuộn (không bắt buộc)</span>
                  <Textarea
                    rows={3}
                    maxLength={10000}
                    disabled={autoSchedule?.enabled}
                    value={coilIds}
                    onChange={(event) => setCoilIds(event.target.value)}
                    placeholder="Nhập một hoặc nhiều mã cuộn theo định dạng website yêu cầu…"
                    className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#7992dc]"
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">Tải file Excel có sẵn</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Chọn loại báo cáo cần lưu. Dữ liệu đã có của loại báo cáo đó sẽ được thay thế.
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-600">Loại báo cáo</span>
                <Select
                  value={uploadReportType}
                  onChange={(event) => setUploadReportType(event.target.value)}
                  disabled={submitting}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#7992dc]"
                >
                  <option value="qc">Báo cáo QC HRC2</option>
                  <option value="order-demand">Theo dõi đơn hàng HRC2</option>
                </Select>
                <span className="mt-1 block text-xs text-slate-500">
                  {uploadReportType === 'order-demand'
                    ? 'File cần sheet “Nhu cầu đơn hàng HRC”. Dữ liệu đơn hàng lưu trong collection Tong_Hop_Don_Hang_HRC2 cùng database hrc2_qc với báo cáo QC; file kết quả là Tong_Hop_Don_Hang_HRC2.xlsx. Bạn vẫn có thể chọn loại QC để nhập hoặc xuất báo cáo QC.'
                    : 'Nhập dữ liệu từ tất cả sheet của file Excel.'}
                </span>
              </label>
              <label
                htmlFor="excel-file"
                className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#cbd5eb] bg-[#f9fbff] px-5 py-8 text-center transition hover:border-[#8298da] hover:bg-[#f3f6ff]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf0ff] text-[#4c63ba]">
                  <FileSpreadsheet size={22} />
                </span>
                <span className="mt-4 text-sm font-bold text-slate-700">{file ? file.name : 'Chọn file Excel để tải lên'}</span>
                <span className="mt-2 text-xs text-slate-500">
                  {file ? `${fileSize(file.size)} · Excel` : 'Định dạng .xlsx hoặc .xls · Tối đa 20 MB'}
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
            <Alert variant="destructive" className="flex items-start gap-2 px-3 py-2.5 text-sm">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </Alert>
          )}

          {(mode === 'web' || autoSchedule?.enabled) && <ExportJobStatus job={job} />}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <FileSpreadsheet size={16} className="text-emerald-600" />
              {mode === 'web' && availability?.importRows
                ? 'File xuất có thể tải xuống; hệ thống sẽ nhập dữ liệu vào MongoDB khi kết nối khả dụng.'
                : 'Thông tin đăng nhập chỉ được sử dụng ở Backend.'}
            </p>
            <div className="flex flex-wrap items-center gap-2">
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
                    ? 'Đang cập nhật Auto…'
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
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#405bb0] px-4 text-sm font-bold text-white transition hover:bg-[#344b96] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Đang gửi yêu cầu…' : mode === 'web' ? 'Bắt đầu xuất dữ liệu' : 'Tải lên và lưu báo cáo'}
              </Button>
            </div>
          </div>
          {autoSchedule?.enabled && (
            <Alert variant="warning" className="space-y-1 text-sm">
              <p>
                Auto đang bật trên Backend. Hệ thống xuất ngay và tiếp tục lặp lại sau mỗi 5 phút kể từ khi tác vụ trước hoàn tất, kể cả khi đóng trang. Mỗi lần chạy sẽ ghi đè báo cáo đích bằng bộ lọc đã lưu.
              </p>
              {autoSchedule.next_run_at && (
                <p className="text-xs">Lần xuất tiếp theo: {vnDateTime(autoSchedule.next_run_at)}.</p>
              )}
              {autoSchedule.last_error && (
                <p className="text-xs text-rose-700">Lỗi lần chạy gần nhất: {autoSchedule.last_error}</p>
              )}
              <p className="text-xs">Tắt Auto sẽ ngăn các lần xuất tiếp theo; tác vụ đang chạy sẽ hoàn tất trước.</p>
            </Alert>
          )}
          {mode === 'web' && !autoSchedule?.enabled && (
            <p className="text-xs text-amber-700">
              Mỗi lần chạy Auto sẽ ghi đè báo cáo đích đã chọn. Tắt Auto sẽ ngăn các lần xuất tiếp theo.
            </p>
          )}
        </form>
        </Card>

        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p>
            Tác vụ chạy trên Backend bằng trình duyệt ẩn. Thời gian chờ phụ thuộc vào website và khoảng ngày được chọn.
            {job?.status === 'completed' && ` Hoàn tất lúc ${vnDateTime(job.updated_at)}.`}
          </p>
        </div>

        <Link to="/reports" className="inline-flex text-sm font-bold text-[#405bb0] hover:underline">
          Xem kho báo cáo đã lưu
        </Link>
      </div>
    </QcLayout>
  );
}
