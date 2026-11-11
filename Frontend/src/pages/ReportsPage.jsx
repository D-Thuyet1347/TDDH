import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Download, FileSpreadsheet, LoaderCircle, Search, TableProperties, Trash2 } from 'lucide-react';
import { getReportFileUrl, getReports, deleteAllQcReports, deleteQcReport } from '../APIs';
import QcLayout from '../components/QcLayout';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { successToast, errorToast } from '../utils/toast';
import { fileSize, nf, vnDateTime } from '../utils/ultils';

const PAGE_SIZE = 20;

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Delete states
  const [openDeleteAll, setOpenDeleteAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deletingSingle, setDeletingSingle] = useState(false);

  const loadReports = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const result = await getReports({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        search,
        signal,
      });
      setReports(result.reports);
      setTotal(result.total);
    } catch (loadError) {
      if (!signal?.aborted) setError(loadError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const controller = new AbortController();
    loadReports(controller.signal);
    return () => controller.abort();
  }, [loadReports]);

  const changeSearch = (event) => {
    setSearch(event.target.value);
    setPage(0);
  };

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const res = await deleteAllQcReports();
      successToast(res?.message || 'Đã xóa toàn bộ dữ liệu kho báo cáo thành công.');
      setOpenDeleteAll(false);
      setReports([]);
      setTotal(0);
      setPage(0);
    } catch (err) {
      errorToast(err.message || 'Không thể xóa dữ liệu kho báo cáo.');
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDeleteSingle = async () => {
    if (!reportToDelete) return;
    setDeletingSingle(true);
    try {
      const res = await deleteQcReport(reportToDelete.job_id);
      successToast(res?.message || `Đã xóa báo cáo ${reportToDelete.filename}.`);
      setReportToDelete(null);
      loadReports();
    } catch (err) {
      errorToast(err.message || 'Không thể xóa báo cáo.');
    } finally {
      setDeletingSingle(false);
    }
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
              {nf(total)} báo cáo QC đã được lập chỉ mục và lưu trữ an toàn.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {total > 0 && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setOpenDeleteAll(true)}
                disabled={deletingAll || loading}
                className="h-10 rounded-xl bg-rose-600 text-white shadow-md shadow-rose-600/20 hover:bg-rose-700"
              >
                <Trash2 size={16} /> Xóa toàn bộ dữ liệu
              </Button>
            )}
            <Button asChild className="h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-blue-500">
              <Link to="/export">
                <FileSpreadsheet size={16} /> Tải báo cáo mới
              </Link>
            </Button>
          </div>
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
                {search ? 'Không tìm thấy báo cáo phù hợp.' : 'Chưa có báo cáo nào trong kho lưu trữ.'}
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
                          <button
                            type="button"
                            onClick={() => setReportToDelete(report)}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                            title="Xóa báo cáo này"
                          >
                            <Trash2 size={14} />
                          </button>
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

        {/* Modal xác nhận xóa toàn bộ dữ liệu */}
        <Dialog open={openDeleteAll} onOpenChange={setOpenDeleteAll}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <DialogTitle className="text-center text-lg font-bold text-slate-900">
                Xác nhận xóa toàn bộ kho báo cáo?
              </DialogTitle>
            </DialogHeader>
            <div className="text-center text-xs text-slate-600 space-y-2 py-2">
              <p>
                Hành động này sẽ xóa vĩnh viễn <strong className="text-rose-600">{nf(total)} báo cáo QC</strong> và <strong className="text-rose-600">toàn bộ dòng dữ liệu</strong> liên quan khỏi cơ sở dữ liệu.
              </p>
              <p className="font-semibold text-slate-700">
                Thao tác này không thể hoàn tác! Bạn có chắc chắn muốn xóa?
              </p>
            </div>
            <DialogFooter className="mt-4 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={deletingAll}
                onClick={() => setOpenDeleteAll(false)}
                className="rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deletingAll}
                onClick={handleDeleteAll}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deletingAll ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin mr-1.5" /> Đang xóa…
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-1.5" /> Xác nhận xóa tất cả
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal xác nhận xóa 1 báo cáo */}
        <Dialog open={Boolean(reportToDelete)} onOpenChange={(open) => !open && setReportToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Trash2 size={24} />
              </div>
              <DialogTitle className="text-center text-lg font-bold text-slate-900">
                Xác nhận xóa báo cáo?
              </DialogTitle>
            </DialogHeader>
            <div className="text-center text-xs text-slate-600 space-y-1 py-2">
              <p>
                Bạn có chắc chắn muốn xóa báo cáo <strong className="text-slate-900">{reportToDelete?.filename}</strong>?
              </p>
              <p className="text-slate-500">
                Gồm {nf(reportToDelete?.rows_imported || 0)} dòng dữ liệu. Thao tác này không thể hoàn tác.
              </p>
            </div>
            <DialogFooter className="mt-4 flex gap-2 sm:justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={deletingSingle}
                onClick={() => setReportToDelete(null)}
                className="rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deletingSingle}
                onClick={handleDeleteSingle}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deletingSingle ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin mr-1.5" /> Đang xóa…
                  </>
                ) : (
                  'Xác nhận xóa'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </QcLayout>
  );
}
