import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Download, FileSpreadsheet, LoaderCircle, Search, TableProperties } from 'lucide-react';
import { getReportFileUrl, getReports } from '../AllAPIs';
import QcLayout from '../components/QcLayout';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table } from '../components/ui/table';
import { fileSize, nf, vnDateTime } from '../utils/ultils';

const PAGE_SIZE = 20;

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const loadReports = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await getReports({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          search,
          signal: controller.signal,
        });
        setReports(result.reports);
        setTotal(result.total);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadReports();
    return () => controller.abort();
  }, [page, search]);

  const changeSearch = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };

  return (
    <QcLayout>
      <div className="space-y-6 sm:space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
              <FileSpreadsheet size={14} className="text-indigo-600" /> Quản lý tài liệu
            </div>
            <h1 className="text-[clamp(28px,3vw,36px)] font-extrabold leading-tight tracking-tight text-slate-900">
              Kho báo cáo
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {nf(total)} báo cáo QC đã được lập chỉ mục và lưu an toàn trong MongoDB Atlas.
            </p>
          </div>
          <Button asChild className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-blue-500">
            <Link to="/export">
              <FileSpreadsheet size={16} /> Tải báo cáo mới
            </Link>
          </Button>
        </header>

        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <label className="relative block w-full max-w-md">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                maxLength={100}
                onChange={changeSearch}
                placeholder="Tìm theo tên file báo cáo…"
                aria-label="Tìm báo cáo theo tên file"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white"
              />
            </label>
            <span className="text-xs font-semibold text-slate-500">
              Hiển thị <span className="text-slate-900">{reports.length}</span> / {nf(total)} báo cáo
            </span>
          </div>

          {error && (
            <Alert variant="destructive" className="m-4 flex items-center gap-2 p-4 text-xs font-semibold">
              <AlertCircle size={18} /> {error}
            </Alert>
          )}

          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <LoaderCircle size={18} className="animate-spin text-indigo-600" /> Đang tải danh sách báo cáo…
            </div>
          ) : reports.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileSpreadsheet size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                {search ? 'Không tìm thấy báo cáo phù hợp.' : 'Chưa có báo cáo. Hãy tải file Excel đầu tiên.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table wrapperClassName="contents" className="w-full min-w-[720px] text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Tên file</th>
                    <th className="px-3 py-3.5">Ngày lưu</th>
                    <th className="px-3 py-3.5 text-right">Sheet</th>
                    <th className="px-3 py-3.5 text-right">Dòng</th>
                    <th className="px-3 py-3.5 text-right">Dung lượng</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((report) => (
                    <tr key={report.job_id} className="transition-colors hover:bg-slate-50/80">
                      <td className="max-w-[280px] px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
                            <FileSpreadsheet size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-800" title={report.filename}>
                              {report.filename}
                            </p>
                            <p className="mt-0.5 font-mono text-[10px] text-slate-400">{report.job_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 font-medium text-slate-500">
                        {vnDateTime(report.saved_at)}
                      </td>
                      <td className="px-3 py-4 text-right font-semibold tabular-nums text-slate-600">
                        {nf(report.sheets?.length || 0)}
                      </td>
                      <td className="px-3 py-4 text-right font-bold tabular-nums text-slate-800">
                        {nf(report.rows_imported)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right font-medium text-slate-500">
                        {fileSize(report.bytes)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to={`/data?job_id=${encodeURIComponent(report.job_id)}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                          >
                            <TableProperties size={14} /> Dữ liệu
                          </Link>
                          <a
                            href={getReportFileUrl(report.job_id)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Download size={14} /> Tải file
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {!loading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500">
                Trang <span className="text-slate-900">{page + 1}</span> / {Math.ceil(total / PAGE_SIZE)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                  disabled={page === 0}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40"
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-40"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </QcLayout>
  );
}
