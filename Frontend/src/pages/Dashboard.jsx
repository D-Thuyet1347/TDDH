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
const SUCCESS_CLASS = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
const ERROR_CLASS = 'bg-rose-50 text-rose-700 ring-rose-200';
const WORKING_CLASS = 'bg-amber-50 text-amber-700 ring-amber-200';

function getJobStatus(status) {
  if (COMPLETE_STATUSES.has(status)) return { label: 'Hoàn thành', color: SUCCESS_CLASS, icon: CheckCircle2 };
  if (status === 'mongo_pending') return { label: 'Chờ lưu Atlas', color: WORKING_CLASS, icon: Clock3 };
  if (status === 'mongo_running' || status === 'mongo_queued') return { label: 'Đang lưu Atlas', color: WORKING_CLASS, icon: LoaderCircle };
  if (ACTIVE_STATUSES.has(status)) return { label: 'Đang xử lý', color: 'bg-blue-50 text-blue-700 ring-blue-200', icon: LoaderCircle };
  if (FAILURE_STATUSES.has(status)) return { label: 'Thất bại', color: ERROR_CLASS, icon: CircleAlert };
  return { label: status || 'Không xác định', color: 'bg-slate-100 text-slate-600 ring-slate-200', icon: Clock3 };
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
    <Card className="group min-w-0 rounded-2xl border-slate-200/80 p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium leading-5 text-slate-500">{label}</span>
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 text-[clamp(28px,2.5vw,36px)] font-bold tracking-tight text-slate-900" aria-live="polite">
        {loading ? <span className="inline-block h-9 w-24 animate-pulse rounded-lg bg-slate-100" /> : value}
      </div>
      <p className="mt-2 min-h-[18px] text-xs font-medium text-slate-400">{description}</p>
    </Card>
  );
}

function SectionHeading({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100/80 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon size={18} /></span>
        <div className="min-w-0">
          <h2 className="!m-0 text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
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
    return <div className="flex min-h-[230px] items-center justify-center gap-2 text-[13px] text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Đang tải báo cáo…</div>;
  }
  if (error && reports.length === 0) {
    return <div className="px-6 py-10 text-center text-[13px] text-rose-600">Không thể đọc danh sách báo cáo từ Atlas.</div>;
  }
  if (!filtered.length) {
    return <div className="px-6 py-12 text-center"><Files className="mx-auto mb-3 text-slate-300" size={28} /><p className="text-[13px] text-slate-500">{search ? 'Không có báo cáo phù hợp với tìm kiếm.' : 'Chưa có báo cáo được lưu trên MongoDB Atlas.'}</p></div>;
  }
  return (
    <div className="w-full overflow-x-auto">
      <Table wrapperClassName="contents" className="w-full min-w-[570px] border-collapse text-left text-[12px]">
        <thead className="bg-[#f8faff] text-[11px] font-bold text-slate-500">
          <tr>
            <th className="px-5 py-3 font-bold sm:px-6">Tên file Excel</th>
            <th className="px-3 py-3 font-bold">Ngày lưu</th>
            <th className="px-3 py-3 text-right font-bold">Dòng dữ liệu</th>
            <th className="px-5 py-3 text-right font-bold sm:px-6">Chi tiết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filtered.map((report) => (
            <tr key={report.job_id} className="transition hover:bg-[#f8faff]">
              <td className="max-w-[230px] px-5 py-3.5 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-emerald-50 text-emerald-600"><FileSpreadsheet size={17} /></span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-700" title={report.filename || report.job_id}>{report.filename || report.job_id}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">{report.job_id?.slice(0, 12)}…</p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-3.5 text-slate-500">{vnDateTime(report.saved_at)}</td>
              <td className="px-3 py-3.5 text-right font-bold tabular-nums text-slate-700">{nf(report.rows_imported)}</td>
              <td className="px-5 py-3.5 text-right sm:px-6">
                <Link to={`/data?job_id=${encodeURIComponent(report.job_id)}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-bold text-[#415cc0] transition hover:bg-[#eef2ff]">Xem <ChevronRight size={14} /></Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function JobList({ jobs, loading }) {
  if (loading && !jobs.length) return <div className="flex items-center justify-center gap-2 px-6 py-10 text-[12px] text-slate-500"><LoaderCircle size={16} className="animate-spin" /> Đang tải tác vụ…</div>;
  if (!jobs.length) return <p className="px-6 py-9 text-center text-[12px] text-slate-400">Chưa có tác vụ xuất Excel.</p>;
  return (
    <div className="divide-y divide-slate-100">
      {jobs.slice(0, 5).map(job => (
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 sm:px-6" key={job.job_id}>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-bold text-slate-700" title={job.filename || job.job_id}>{job.filename || `Job ${job.job_id?.slice(0, 10)}…`}</p>
            <p className="mt-1 text-[10px] text-slate-400">{vnDateTime(job.created_at)}</p>
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
    { label: 'Dung lượng lưu trữ', value: summary ? fileSize(summary.bytes) : '—', description: 'File Excel gốc · MongoDB', icon: HardDrive, iconClass: 'bg-orange-50 text-orange-600', dependsOn: 'summary' },
    { label: 'Sheet đã nhập', value: summary ? nf(summary.sheets) : '—', description: 'Tổng số sheet có dữ liệu', icon: Files, iconClass: 'bg-sky-50 text-sky-600', dependsOn: 'summary' },
  ];

  return (
    <QcLayout>
    <div className="min-w-0  space-y-6 font-sans text-slate-800 sm:space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-700">
            <LayoutDashboard size={5} /> Trung tâm vận hành
          </div>
          <h1 className="text-[clamp(28px,3vw,36px)] font-bold leading-tight tracking-tight text-slate-950">Tổng quan</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">Tổng hợp báo cáo, dữ liệu và tình trạng hệ thống QC.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={reload}
          disabled={refreshing}
          className="inline-flex h-10 items-center gap-2 rounded-xl border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> Làm mới
        </Button>
      </header>

      <section className="relative overflow-hidden rounded-[28px] bg-[#101b34] p-6 text-white shadow-[0_24px_65px_rgba(15,23,42,0.18)] sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-36 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute bottom-[-170px] right-[28%] h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-blue-100">
              <ShieldCheck size={13} /> QUALITY CONTROL · HRC2
            </span>
            <h2 className="!mb-0 !mt-4 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">Dữ liệu chất lượng,<br className="hidden sm:block" /> rõ ràng trong từng quyết định.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Quản lý báo cáo QC, theo dõi dữ liệu theo sheet và lưu trữ an toàn trong một không gian tập trung.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild variant="secondary" className="h-10 rounded-xl bg-white px-4 text-xs font-semibold text-slate-900 hover:bg-blue-50">
                <Link to="/export"><ArrowDownToLine size={15} /> Nhập báo cáo <ArrowRight size={14} /></Link>
              </Button>
              <Button asChild variant="outline" className="h-10 rounded-xl border-white/20 bg-white/[0.04] px-4 text-xs font-semibold text-white hover:bg-white/10">
                <Link to="/data">Mở dữ liệu <TableProperties size={15} /></Link>
              </Button>
            </div>
          </div>
          <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs font-medium text-slate-300">MongoDB Atlas</span>
              {mongoOk ? <Wifi size={17} className="text-emerald-300" /> : <WifiOff size={17} className="text-rose-300" />}
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-white">
              <span className={`h-2 w-2 rounded-full ${mongoOk ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              {mongoOk ? 'Đang kết nối' : health === null && refreshing ? 'Đang kiểm tra' : 'Chưa kết nối'}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Database · {health?.database || summary?.database || '—'}</p>
          </div>
        </div>
      </section>

      {/* Lỗi nào xảy ra thì chỉ báo phần tương ứng, các phần khác vẫn hoạt động */}
      {Object.keys(errors).length > 0 && (
        <Alert variant="destructive" className="flex items-start gap-3 rounded-xl px-4 py-3 text-[12px]">
          <CircleAlert size={17} className="mt-0.5 shrink-0" />
          <div><strong>Không tải được một phần dữ liệu:</strong> {Object.values(errors).join(' · ')}</div>
        </Alert>
      )}

      <section aria-label="Thống kê tổng quan" className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map(metric => <StatCard key={metric.label} {...metric} loading={loading && !errors[metric.dependsOn]} />)}
      </section>

      <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(295px,1fr)]">
        <Card className="min-w-0 overflow-hidden rounded-[20px] border-[#e5e9f2] shadow-[0_5px_24px_rgba(24,40,80,0.045)]">
          <SectionHeading
            icon={FileSpreadsheet}
            title="Báo cáo Excel gần đây"
            subtitle="6 báo cáo mới nhất đã lưu trong MongoDB"
            action={<Link to="/reports" className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-extrabold text-[#4867bd] hover:underline">Xem tất cả <ArrowRight size={14} /></Link>}
          />
          <div className="px-5 py-3 sm:px-6">
            <label className="relative block max-w-[360px]" htmlFor="dashboard-search">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                id="dashboard-search"
                value={search}
                maxLength={80}
                onChange={event => setSearch(event.target.value)}
                placeholder="Tìm tên báo cáo, Job ID…"
                className="h-10 w-full rounded-xl border border-[#e3e8f2] bg-[#f9fbfe] pl-10 pr-3 text-[12px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#7992dc] focus:ring-[3px] focus:ring-[#5978d81c]"
              />
            </label>
          </div>
          <ReportTable reports={reports} loading={loading} error={errors.reports} search={search} />
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden rounded-[20px] border-[#e5e9f2] shadow-[0_5px_24px_rgba(24,40,80,0.045)]">
            <SectionHeading icon={Server} title="Tình trạng hệ thống" subtitle="Theo dõi kết nối và đồng bộ" />
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f7faff] px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5"><Database className="shrink-0 text-[#5773c4]" size={18} /><span className="text-[12px] font-semibold text-slate-600">MongoDB Atlas</span></div>
                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-extrabold ${mongoOk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${mongoOk ? 'bg-emerald-500' : 'bg-rose-500'}`} />{mongoOk ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f7faff] px-3.5 py-3">
                <div className="flex min-w-0 items-center gap-2.5"><Activity className="shrink-0 text-[#5773c4]" size={18} /><span className="text-[12px] font-semibold text-slate-600">Tác vụ đang chạy</span></div>
                <strong className="text-[13px] tabular-nums text-slate-800">{errors.jobs ? '—' : nf(activeJobs)}</strong>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">Các chỉ số là số báo cáo và dòng Excel đã lưu, không phải tỷ lệ chất lượng sản phẩm.</p>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-[20px] border-[#e5e9f2] shadow-[0_5px_24px_rgba(24,40,80,0.045)]">
            <SectionHeading icon={TrendingUp} title="Tình trạng nhập dữ liệu" subtitle={`Tổng hợp ${nf(sampleTotal)} báo cáo gần nhất`} />
            <div className="px-5 pb-5 pt-4 sm:px-6">
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${completedJobs} hoàn thành, ${activeJobs} đang xử lý, ${failedJobs} lỗi hoặc chờ lưu trên ${sampleTotal} tác vụ gần nhất`}>
                <div className="bg-emerald-500 transition-all" style={{ width: `${completePercent}%` }} />
                <div className="bg-blue-500 transition-all" style={{ width: `${activePercent}%` }} />
                <div className="bg-amber-500 transition-all" style={{ width: `${failedPercent}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { value: completedJobs, label: 'Hoàn thành', color: 'text-emerald-600' },
                  { value: activeJobs, label: 'Đang xử lý', color: 'text-blue-600' },
                  { value: failedJobs, label: 'Lỗi / chờ lưu', color: 'text-amber-600' },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <strong className={`block text-[20px] font-extrabold tabular-nums ${item.color}`}>{errors.jobs ? '—' : nf(item.value)}</strong>
                    <span className="mt-1 block text-[10px] text-slate-500">{item.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-slate-400">Thống kê trên tối đa 100 báo cáo nhập gần nhất, không phải toàn bộ lịch sử.</p>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(295px,1fr)]">
        <div className="overflow-hidden rounded-[20px] border border-[#e5e9f2] bg-white shadow-[0_5px_24px_rgba(24,40,80,0.045)]">
          <SectionHeading icon={Clock3} title="Báo cáo nhập gần đây" subtitle="Các file Excel đã được lưu thành công" action={<Link to="/export" className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#4867bd] hover:underline">Tải Excel <ArrowRight size={14} /></Link>} />
          {errors.jobs ? <p className="px-6 py-8 text-center text-[12px] text-rose-600">Không thể tải danh sách tác vụ.</p> : <JobList jobs={jobs} loading={loading} />}
        </div>
        <div className="overflow-hidden rounded-[20px] border border-[#e5e9f2] bg-white p-5 shadow-[0_5px_24px_rgba(24,40,80,0.045)] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3ff] text-[#4c63ba]"><Cloud size={19} /></span>
            <div><h2 className="!m-0 text-[15px] font-extrabold text-slate-800">Truy cập nhanh</h2><p className="mt-1 text-[11px] text-slate-400">Các khu vực thường sử dụng</p></div>
          </div>
          <div className="mt-5 space-y-2">
            {[
              { to: '/export', text: 'Xuất Excel HRC2', icon: ArrowDownToLine },
              { to: '/reports', text: 'Kho báo cáo đã lưu', icon: Files },
              { to: '/data', text: 'Đọc dữ liệu chi tiết', icon: TableProperties },
            ].map(({ to, text, icon: Icon }) => (
              <Link key={to} to={to} className="group flex items-center justify-between rounded-xl border border-[#e8edf7] bg-[#fbfcff] px-3.5 py-3 text-[12px] font-bold text-slate-700 transition hover:border-[#bdcbed] hover:bg-[#f0f5ff]">
                <span className="flex items-center gap-2.5 text-slate-700"><Icon size={16} className="text-[#536eba]" />{text}</span>
                <ChevronRight size={16} className="text-slate-400 transition group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
        <span>HRC2 QC Data Center · Chỉ sử dụng dữ liệu được phép truy cập</span>
        <span>{lastUpdated ? `Cập nhật: ${vnDateTime(lastUpdated.toISOString())}` : 'Đang đồng bộ dữ liệu…'}</span>
      </footer>
    </div>
    </QcLayout>
  );
}
