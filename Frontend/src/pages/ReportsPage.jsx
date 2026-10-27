import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Download, FileSpreadsheet, LoaderCircle, Search, TableProperties } from 'lucide-react';
import { getReportFileUrl, getReports } from '../AllAPIs';
import QcLayout from '../components/QcLayout';
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
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#526bb9]">Kho lưu trữ</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1e2944]">Báo cáo Excel</h1>
            <p className="mt-2 text-sm text-slate-500">{nf(total)} báo cáo đã lưu trong MongoDB.</p>
          </div>
          <Link to="/export" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#405bb0] px-4 text-sm font-bold text-white hover:bg-[#344b96]">
            <FileSpreadsheet size={16} /> Tải báo cáo
          </Link>
        </header>

        <div className="rounded-2xl border border-[#e5e9f2] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
            <label className="relative block w-full max-w-md">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                maxLength={100}
                onChange={changeSearch}
                placeholder="Tìm theo tên file…"
                aria-label="Tìm báo cáo theo tên file"
                className="h-10 w-full rounded-lg border border-[#e3e8f2] bg-[#f9fbfe] pl-10 pr-3 text-sm outline-none focus:border-[#7992dc]"
              />
            </label>
            <span className="text-xs text-slate-500">Hiển thị {reports.length} / {nf(total)}</span>
          </div>

          {error && (
            <div role="alert" className="m-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
              <AlertCircle size={17} /> {error}
            </div>
          )}
          {loading ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500">
              <LoaderCircle size={18} className="animate-spin" /> Đang tải báo cáo…
            </div>
          ) : reports.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              {search ? 'Không tìm thấy báo cáo phù hợp.' : 'Chưa có báo cáo. Hãy tải file Excel đầu tiên.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#f8faff] text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Tên file</th>
                    <th className="px-3 py-3">Ngày lưu</th>
                    <th className="px-3 py-3 text-right">Sheet</th>
                    <th className="px-3 py-3 text-right">Dòng</th>
                    <th className="px-3 py-3 text-right">Dung lượng</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reports.map((report) => (
                    <tr key={report.job_id} className="hover:bg-[#f8faff]">
                      <td className="max-w-[280px] px-5 py-4">
                        <p className="truncate font-bold text-slate-700" title={report.filename}>{report.filename}</p>
                        <p className="mt-1 font-mono text-[10px] text-slate-400">{report.job_id}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-slate-500">{vnDateTime(report.saved_at)}</td>
                      <td className="px-3 py-4 text-right tabular-nums text-slate-600">{nf(report.sheets?.length || 0)}</td>
                      <td className="px-3 py-4 text-right font-bold tabular-nums text-slate-700">{nf(report.rows_imported)}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-right text-slate-500">{fileSize(report.bytes)}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link to={`/data?job_id=${encodeURIComponent(report.job_id)}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-[#415cc0] hover:bg-[#eef2ff]">
                            <TableProperties size={14} /> Dữ liệu
                          </Link>
                          <a href={getReportFileUrl(report.job_id)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">
                            <Download size={14} /> Tải file
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <span className="text-xs text-slate-500">Trang {page + 1} / {Math.ceil(total / PAGE_SIZE)}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                  disabled={page === 0}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </QcLayout>
  );
}
