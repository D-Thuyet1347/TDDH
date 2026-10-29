import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowDownToLine, ArrowRight, CheckCircle2, ChevronRight,
  CircleAlert, Clock3, Cloud, Database, FileSpreadsheet, Files,
  HardDrive, LayoutDashboard, LoaderCircle, RefreshCw, Search,
  Server, ShieldCheck, TableProperties, TrendingUp, Wifi, WifiOff,
} from 'lucide-react';
import {
  getDashboardSummary,
  getJobs,
  getMongoStatus,
  getReports,
} from '../AllAPIs';
import QcLayout from '../components/QcLayout';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table } from '../components/ui/table';
import { fileSize, nf, vnDateTime } from '../utils/ultils';

// Giữ nguyên trạng thái Job theo Backend HRC2 v6.4.
const ACTIVE_STATUSES = new Set(['queued', 'running', 'mongo_queued', 'mongo_running']);
const FAILURE_STATUSES = new Set(['failed', 'mongo_pending']);
const COMPLETE_STATUSES = new Set(['completed']);
const SUCCESS_CLASS = 'bg-emerald-50 text-emerald-700 ring-emerald-200/80';
const ERROR_CLASS = 'bg-rose-50 text-rose-700 ring-rose-200/80';
const WORKING_CLASS = 'bg-amber-50 text-amber-700 ring-amber-200/80';

function getJobStatus(status) {
  if (COMPLETE_STATUSES.has(status)) return { label: 'Hoàn thành', color: SUCCESS_CLASS, icon: CheckCircle2 };
  if (status === 'mongo_pending') return { label: 'Chờ lưu Atlas', color: WORKING_CLASS, icon: Clock3 };
  if (status === 'mongo_running' || status === 'mongo_queued') return { label: 'Đang lưu Atlas', color: WORKING_CLASS, icon: LoaderCircle };
  if (ACTIVE_STATUSES.has(status)) return { label: 'Đang xử lý', color: 'bg-indigo-50 text-indigo-700 ring-indigo-200/80', icon: LoaderCircle };
  if (FAILURE_STATUSES.has(status)) return { label: 'Thất bại', color: ERROR_CLASS, icon: CircleAlert };
  return { label: status || 'Không xác định', color: 'bg-slate-100 text-slate-600 ring-slate-200/80', icon: Clock3 };
}

function StatusPill({ status }) {
  const data = getJobStatus(status);
  const Icon = data.icon;
  return (
    <Badge className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-0 px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${data.color}`}>
      <Icon size={12} className={ACTIVE_STATUSES.has(status) ? 'animate-spin' : ''} aria-hidden="true" />
      {data.label}
    </Badge>
  );
}

function StatCard({ icon: Icon, label, value, description, iconClass, loading }) {
  return (
    <Card className="group relative min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-card-hover sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-semibold leading-5 text-slate-500">{label}</span>
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-black/5 shadow-xs transition-transform duration-300 group-hover:scale-110 ${iconClass}`}>
          <Icon size={20} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 text-[clamp(28px,2.5vw,36px)] font-extrabold tracking-tight text-slate-900" aria-live="polite">
        {loading ? <span className="inline-block h-9 w-24 animate-pulse rounded-lg bg-slate-100" /> : value}
      </div>
      <p className="mt-2 min-h-[18px] text-xs font-medium text-slate-400">{description}</p>
    </Card>
  );
}

function SectionHeading({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100 shadow-xs">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="!m-0 text-sm font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function ReportTable({ reports, loading, error, search }) {
  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('vi-VN');
    return q ? reports.filter(item => `${item.filename || ''} ${item.job_id || ''}`.toLocaleLowerCase('vi-VN').includes(q)) : reports;
  }, [reports, search]);

  if (loading && reports.length === 0) {
    return <div className="flex min-h-[230px] items-center justify-center gap-2 text-[13px] text-slate-500"><LoaderCircle className="animate-spin text-indigo-600" size={18} /> Đang tải báo cáo…</div>;
  }
  if (error && reports.length === 0) {
    return <div className="px-6 py-10 text-center text-[13px] text-rose-600 font-medium">Không thể đọc danh sách báo cáo từ Atlas.</div>;
  }
  if (!filtered.length) {
    return (
      <div className="px-6 py-12 text-center">
        <Files className="mx-auto mb-3 text-slate-300" size={28} />
        <p className="text-[13px] font-medium text-slate-500">
          {search ? 'Không có báo cáo phù hợp với tìm kiếm.' : 'Chưa có báo cáo được lưu trên MongoDB Atlas.'}
        </p>
      </div>
    );
  }
  return (
    <div className="w-full overflow-x-auto">
      <Table wrapperClassName="contents" className="w-full min-w-[570px] border-collapse text-left text-[12px]">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          <tr>
            <th className="px-5 py-3 font-semibold sm:px-6">Tên file Excel</th>
            <th className="px-3 py-3 font-semibold">Ngày lưu</th>
            <th className="px-3 py-3 text-right font-semibold">Dòng dữ liệu</th>
            <th className="px-5 py-3 text-right font-semibold sm:px-6">Chi tiết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filtered.map((report) => (
            <tr key={report.job_id} className="transition-colors hover:bg-slate-50/80">
              <td className="max-w-[230px] px-5 py-3.5 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
                    <FileSpreadsheet size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800" title={report.filename || report.job_id}>
                      {report.filename || report.job_id}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">{report.job_id?.slice(0, 12)}…</p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-3.5 font-medium text-slate-500">{vnDateTime(report.saved_at)}</td>
              <td className="px-3 py-3.5 text-right font-bold tabular-nums text-slate-800">{nf(report.rows_imported)}</td>
              <td className="px-5 py-3.5 text-right sm:px-6">
                <Link
                  to={`/data?job_id=${encodeURIComponent(report.job_id)}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                >
                  Xem <ChevronRight size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function JobList({ jobs, loading }) {
  if (loading && !jobs.length) {
    return <div className="flex items-center justify-center gap-2 px-6 py-10 text-[12px] text-slate-500"><LoaderCircle size={16} className="animate-spin text-indigo-600" /> Đang tải tác vụ…</div>;
  }
  if (!jobs.length) {
    return <p className="px-6 py-9 text-center text-[12px] font-medium text-slate-400">Chưa có tác vụ xuất Excel.</p>;
  }
  return (
    <div className="divide-y divide-slate-100">
      {jobs.slice(0, 5).map(job => (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/60 sm:px-6" key={job.job_id}>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-slate-800" title={job.filename || job.job_id}>
              {job.filename || `Job ${job.job_id?.slice(0, 10)}…`}
            </p>
            <p className="mt-1 text-[10px] font-medium text-slate-400">{vnDateTime(job.created_at)}</p>
          </div>
          <StatusPill status={job.status} />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [reports, setReports] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [health, setHealth] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    async function fetchDashboard() {
      setRefreshing(true);
      const results = await Promise.allSettled([
        getDashboardSummary(signal),
        getReports({ limit: 6, signal }),
        getJobs(signal),
        getMongoStatus(signal),
      ]);
      if (signal.aborted) return;
      const [summaryResult, reportsResult, jobsResult, healthResult] = results;
      const nextErrors = {};
      if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value);
      else nextErrors.summary = summaryResult.reason?.message || 'Không tải được thống kê';
      if (reportsResult.status === 'fulfilled') setReports(reportsResult.value.reports || []);
      else nextErrors.reports = reportsResult.reason?.message || 'Không tải được báo cáo';
      if (jobsResult.status === 'fulfilled') setJobs(jobsResult.value || []);
      else nextErrors.jobs = jobsResult.reason?.message || 'Không tải được tác vụ';
      if (healthResult.status === 'fulfilled') setHealth(healthResult.value);
      else { setHealth(null); nextErrors.mongo = healthResult.reason?.message || 'Không kiểm tra được MongoDB'; }
      setErrors(nextErrors);
      setLastUpdated(new Date());
      setLoading(false);
      setRefreshing(false);
    }
    fetchDashboard();
    return () => controller.abort();
  }, [revision]);

  const activeJobs = useMemo(() => jobs.filter(job => ACTIVE_STATUSES.has(job.status)).length, [jobs]);
  const completedJobs = useMemo(() => jobs.filter(job => COMPLETE_STATUSES.has(job.status)).length, [jobs]);
  const failedJobs = useMemo(() => jobs.filter(job => FAILURE_STATUSES.has(job.status)).length, [jobs]);
  const sampleTotal = jobs.length;
  const completePercent = sampleTotal ? Math.round((completedJobs / sampleTotal) * 100) : 0;
  const activePercent = sampleTotal ? Math.round((activeJobs / sampleTotal) * 100) : 0;
  const failedPercent = sampleTotal ? Math.round((failedJobs / sampleTotal) * 100) : 0;
  const mongoOk = health?.connected === true;

  const metrics = [
    { label: 'Báo cáo đã lưu', value: summary ? nf(summary.reports) : '—', description: 'MongoDB · QC', icon: FileSpreadsheet, iconClass: 'bg-indigo-50 text-indigo-600', dependsOn: 'summary' },
    { label: 'Dòng dữ liệu Excel', value: summary ? nf(summary.rows) : '—', description: 'Tất cả sheet đã nhập', icon: TableProperties, iconClass: 'bg-emerald-50 text-emerald-600', dependsOn: 'summary' },
    { label: 'Dung lượng lưu trữ', value: summary ? fileSize(summary.bytes) : '—', description: 'File Excel gốc · MongoDB', icon: HardDrive, iconClass: 'bg-amber-50 text-amber-600', dependsOn: 'summary' },
    { label: 'Sheet đã nhập', value: summary ? nf(summary.sheets) : '—', description: 'Tổng số sheet có dữ liệu', icon: Files, iconClass: 'bg-sky-50 text-sky-600', dependsOn: 'summary' },
  ];

  return (
    <QcLayout>
      <div className="min-w-0 space-y-6 sm:space-y-8">
        {/* Header bar */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
              <LayoutDashboard size={14} className="text-indigo-600" /> Trung tâm vận hành
            </div>
            <h1 className="text-[clamp(28px,3vw,36px)] font-extrabold leading-tight tracking-tight text-slate-900">
              Tổng quan
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Tổng hợp báo cáo chất lượng, tiến độ đồng bộ và tình trạng hệ thống QC.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={reload}
            disabled={refreshing}
            className="inline-flex h-10 items-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-indigo-600' : 'text-slate-500'} /> Làm mới
          </Button>
        </header>

        {/* Hero banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#0f172a] to-[#1e1b4b] p-7 text-white shadow-[0_24px_65px_rgba(15,23,42,0.18)] sm:p-10 border border-slate-800/80">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-36 h-96 w-96 rounded-full bg-indigo-500/25 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[-170px] right-[28%] h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
          
          <div className="relative flex flex-wrap items-end justify-between gap-8">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-1.5 text-[10px] font-bold tracking-[0.14em] text-indigo-200 backdrop-blur-sm">
                <ShieldCheck size={14} className="text-indigo-400" /> QUALITY CONTROL · HRC2
              </span>
              <h2 className="!mb-0 !mt-4 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                Dữ liệu chất lượng,<br className="hidden sm:block" /> rõ ràng trong từng quyết định.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Quản lý báo cáo QC, theo dõi tiến độ đơn hàng theo sheet và đồng bộ an toàn dữ liệu trên một nền tảng tập trung.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild className="h-11 rounded-xl bg-white px-5 text-xs font-bold text-slate-950 shadow-md hover:bg-slate-100 hover:text-slate-900">
                  <Link to="/export">
                    <ArrowDownToLine size={16} /> Nhập báo cáo <ArrowRight size={15} />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-xl border-white/20 bg-white/[0.06] px-5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/15 hover:text-white">
                  <Link to="/data">
                    Mở dữ liệu <TableProperties size={15} />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="min-w-[230px] rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-md shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-slate-300">MongoDB Atlas</span>
                {mongoOk ? <Wifi size={17} className="text-emerald-400" /> : <WifiOff size={17} className="text-rose-400" />}
              </div>
              <div className="mt-3 flex items-center gap-2.5 text-sm font-bold text-white">
                <span className={`h-2.5 w-2.5 rounded-full ${mongoOk ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]'}`} />
                {mongoOk ? 'Đang kết nối' : health === null && refreshing ? 'Đang kiểm tra' : 'Chưa kết nối'}
              </div>
              <p className="mt-2 font-mono text-[11px] text-slate-400">Database · {health?.database || summary?.database || '—'}</p>
            </div>
          </div>
        </section>

        {/* Error notification banner */}
        {Object.keys(errors).length > 0 && (
          <Alert variant="destructive" className="flex items-start gap-3 rounded-2xl px-5 py-4 text-xs font-medium">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <div><strong>Không tải được một phần dữ liệu:</strong> {Object.values(errors).join(' · ')}</div>
          </Alert>
        )}

        {/* Metric Cards */}
        <section aria-label="Thống kê tổng quan" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          {metrics.map(metric => <StatCard key={metric.label} {...metric} loading={loading && !errors[metric.dependsOn]} />)}
        </section>

        {/* Recent reports & System health */}
        <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(310px,1fr)]">
          <Card className="min-w-0 overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-card">
            <SectionHeading
              icon={FileSpreadsheet}
              title="Báo cáo Excel gần đây"
              subtitle="6 báo cáo mới nhất đã lưu trong MongoDB"
              action={
                <Link to="/reports" className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Xem tất cả <ArrowRight size={14} />
                </Link>
              }
            />
            <div className="px-5 py-3 sm:px-6">
              <label className="relative block max-w-[360px]" htmlFor="dashboard-search">
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="dashboard-search"
                  value={search}
                  maxLength={80}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Tìm tên báo cáo, Job ID…"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white"
                />
              </label>
            </div>
            <ReportTable reports={reports} loading={loading} error={errors.reports} search={search} />
          </Card>

          <div className="space-y-5">
            <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-card">
              <SectionHeading icon={Server} title="Tình trạng hệ thống" subtitle="Theo dõi kết nối và đồng bộ" />
              <div className="space-y-3.5 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-4 py-3 border border-slate-100">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Database className="shrink-0 text-indigo-600" size={18} />
                    <span className="text-xs font-bold text-slate-700">MongoDB Atlas</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${mongoOk ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${mongoOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />{mongoOk ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-4 py-3 border border-slate-100">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Activity className="shrink-0 text-indigo-600" size={18} />
                    <span className="text-xs font-bold text-slate-700">Tác vụ đang chạy</span>
                  </div>
                  <strong className="text-sm font-extrabold tabular-nums text-slate-800">{errors.jobs ? '—' : nf(activeJobs)}</strong>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">Các chỉ số là số báo cáo và dòng Excel đã lưu, không phải tỷ lệ chất lượng sản phẩm.</p>
              </div>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-card">
              <SectionHeading icon={TrendingUp} title="Tình trạng nhập dữ liệu" subtitle={`Tổng hợp ${nf(sampleTotal)} báo cáo gần nhất`} />
              <div className="px-5 pb-5 pt-4 sm:px-6">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${completedJobs} hoàn thành, ${activeJobs} đang xử lý, ${failedJobs} lỗi hoặc chờ lưu trên ${sampleTotal} tác vụ gần nhất`}>
                  <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${completePercent}%` }} />
                  <div className="bg-indigo-500 transition-all duration-500" style={{ width: `${activePercent}%` }} />
                  <div className="bg-amber-500 transition-all duration-500" style={{ width: `${failedPercent}%` }} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { value: completedJobs, label: 'Hoàn thành', color: 'text-emerald-600' },
                    { value: activeJobs, label: 'Đang xử lý', color: 'text-indigo-600' },
                    { value: failedJobs, label: 'Lỗi / chờ lưu', color: 'text-amber-600' },
                  ].map(item => (
                    <div key={item.label} className="text-center">
                      <strong className={`block text-xl font-extrabold tabular-nums ${item.color}`}>{errors.jobs ? '—' : nf(item.value)}</strong>
                      <span className="mt-1 block text-[11px] font-semibold text-slate-500">{item.label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[10px] text-slate-400">Thống kê trên tối đa 100 báo cáo nhập gần nhất, không phải toàn bộ lịch sử.</p>
              </div>
            </Card>
          </div>
        </section>

        {/* Bottom row */}
        <section className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(310px,1fr)]">
          <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white shadow-card">
            <SectionHeading
              icon={Clock3}
              title="Báo cáo nhập gần đây"
              subtitle="Các file Excel đã được lưu thành công"
              action={
                <Link to="/export" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline">
                  Tải Excel <ArrowRight size={14} />
                </Link>
              }
            />
            {errors.jobs ? <p className="px-6 py-8 text-center text-xs font-semibold text-rose-600">Không thể tải danh sách tác vụ.</p> : <JobList jobs={jobs} loading={loading} />}
          </Card>

          <Card className="overflow-hidden rounded-2xl border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100 shadow-xs">
                <Cloud size={19} />
              </span>
              <div>
                <h2 className="!m-0 text-sm font-bold text-slate-900">Truy cập nhanh</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-400">Các khu vực thường sử dụng</p>
              </div>
            </div>
            <div className="mt-5 space-y-2.5">
              {[
                { to: '/export', text: 'Xuất Excel HRC2', icon: ArrowDownToLine },
                { to: '/reports', text: 'Kho báo cáo đã lưu', icon: Files },
                { to: '/orders', text: 'Nhu cầu đơn hàng HRC', icon: ShieldCheck },
                { to: '/data', text: 'Đọc dữ liệu chi tiết', icon: TableProperties },
              ].map(({ to, text, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon size={16} className="text-indigo-600 transition group-hover:scale-110" />
                    {text}
                  </span>
                  <ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
                </Link>
              ))}
            </div>
          </Card>
        </section>

        {/* Footer */}
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-5 text-[11px] font-medium text-slate-400">
          <span>HRC2 QC Data Center · Hệ thống quản lý và giám sát tiến độ chất lượng</span>
          <span>{lastUpdated ? `Cập nhật: ${vnDateTime(lastUpdated.toISOString())}` : 'Đang đồng bộ dữ liệu…'}</span>
        </footer>
      </div>
    </QcLayout>
  );
}
