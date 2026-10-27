import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AlertCircle, Download, FileSpreadsheet, LoaderCircle, Search } from 'lucide-react';
import { getReportFileUrl, getReportRows, getReports } from '../AllAPIs';
import QcLayout from '../components/QcLayout';
import { nf, vnDateTime } from '../utils/ultils';

const PAGE_SIZE = 50;
const QC_COLUMN_GROUPS = {
  'THÔNG TIN CHUNG': 'bg-[#dbeafe] text-slate-700',
  'BỀ MẶT': 'bg-[#ffe4e6] text-slate-700',
  'KÍCH THƯỚC': 'bg-[#dbeafe] text-slate-700',
  'CƠ/LÝ/HÓA': 'bg-[#d1fae5] text-slate-700',
  'NGOẠI QUAN': 'bg-[#ede9fe] text-slate-700',
  'GHI CHÚ QC': 'bg-[#f59e0b] text-white',
};

const isQcColumnHeader = (row) =>
  row.rowNumber === 2 &&
  Object.keys(row.values || {}).some((column) => QC_COLUMN_GROUPS[column]);

export default function DataPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const requestedId = searchParams.get('job_id') || '';
  const [reports, setReports] = useState([]);
  const [reportId, setReportId] = useState(requestedId);
  const [sheet, setSheet] = useState('');
  const [sheets, setSheets] = useState([]);
  const [columnHeaders, setColumnHeaders] = useState(null);
  const [hasGroupedHeaders, setHasGroupedHeaders] = useState(false);
  const [headerRowsCount, setHeaderRowsCount] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (requestedId && requestedId !== reportId) {
      setReportId(requestedId);
      setSheet('');
      setOffset(0);
      setColumnHeaders(null);
      setHasGroupedHeaders(false);
      setHeaderRowsCount(0);
    }
  }, [requestedId, reportId]);

  useEffect(() => {
    const controller = new AbortController();
    getReports({ limit: 100, signal: controller.signal })
      .then((result) => {
        setReports(result.reports);
        if (!requestedId && result.reports.length) setReportId(result.reports[0].job_id);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingReports(false);
      });
    return () => controller.abort();
  }, [requestedId]);

  useEffect(() => {
    if (!reportId) {
      setRows([]);
      setTotal(0);
      return undefined;
    }

    const controller = new AbortController();
    const loadRows = async () => {
      setLoadingRows(true);
      setError('');
      try {
        const result = await getReportRows({
          reportId,
          sheet,
          limit: PAGE_SIZE + (offset === 0 ? 1 : 0),
          offset: offset + (offset > 0 && hasGroupedHeaders ? headerRowsCount : 0),
          signal: controller.signal,
        });
        const groupedHeaderRows = result.rows.filter(isQcColumnHeader);
        if (offset === 0) {
          setColumnHeaders(groupedHeaderRows[0]?.values || null);
          setHasGroupedHeaders(groupedHeaderRows.length > 0);
          setHeaderRowsCount(groupedHeaderRows.length);
        }
        setRows(
          result.rows
            .filter((row) => !isQcColumnHeader(row))
            .slice(0, PAGE_SIZE)
        );
        setTotal(result.total);
        setSheets(result.sheets);
      } catch (loadError) {
        if (!controller.signal.aborted) setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setLoadingRows(false);
      }
    };
    loadRows();
    return () => controller.abort();
  }, [reportId, sheet, offset, hasGroupedHeaders, headerRowsCount]);

  const selectedReport = reports.find((report) => report.job_id === reportId);
  const columns = useMemo(
    () => [...new Set(rows.flatMap((row) => Object.keys(row.values || {})))],
    [rows]
  );
  const columnGroups = useMemo(() => {
    let currentGroup = '';
    return columns.reduce((groups, column) => {
      if (QC_COLUMN_GROUPS[column]) currentGroup = column;
      groups[column] = currentGroup;
      return groups;
    }, {});
  }, [columns]);
  const visibleTotal = Math.max(0, total - headerRowsCount);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    if (!query) return rows;
    return rows.filter((row) =>
      Object.values(row.values || {}).some((value) =>
        String(value ?? '').toLocaleLowerCase('vi-VN').includes(query)
      )
    );
  }, [rows, search]);

  const selectReport = (event) => {
    const nextId = event.target.value;
    setReportId(nextId);
    setSearchParams(nextId ? { job_id: nextId } : {});
    setSheet('');
    setOffset(0);
    setSearch('');
    setColumnHeaders(null);
    setHasGroupedHeaders(false);
    setHeaderRowsCount(0);
  };

  const selectSheet = (event) => {
    setSheet(event.target.value);
    setOffset(0);
    setSearch('');
    setColumnHeaders(null);
    setHasGroupedHeaders(false);
    setHeaderRowsCount(0);
  };

  return (
    <QcLayout>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#526bb9]">Tra cứu dữ liệu</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1e2944]">Dữ liệu Excel</h1>
            <p className="mt-2 text-sm text-slate-500">Xem các dòng đã nhập theo báo cáo và sheet.</p>
          </div>
          {selectedReport && (
            <a
              href={getReportFileUrl(selectedReport.job_id)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#dce4f5] bg-white px-4 text-sm font-bold text-[#405bb0] hover:bg-[#f4f7ff]"
            >
              <Download size={16} /> Tải file gốc
            </a>
          )}
        </header>

        {location.state?.message && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {location.state.message}
          </div>
        )}

        <section className="rounded-2xl border border-[#e5e9f2] bg-white p-4 shadow-sm sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)_minmax(200px,1fr)]">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Báo cáo</span>
              <select
                value={reportId}
                onChange={selectReport}
                disabled={loadingReports || reports.length === 0}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#7992dc]"
              >
                <option value="">{loadingReports ? 'Đang tải báo cáo…' : 'Chọn báo cáo'}</option>
                {reports.map((report) => (
                  <option key={report.job_id} value={report.job_id}>{report.filename}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Sheet</span>
              <select
                value={sheet}
                onChange={selectSheet}
                disabled={!reportId || loadingRows}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#7992dc]"
              >
                <option value="">Tất cả sheet</option>
                {sheets.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
            </label>
            <label className="relative">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Tìm trên trang hiện tại</span>
              <Search size={15} className="pointer-events-none absolute bottom-3 left-3 text-slate-400" />
              <input
                value={search}
                maxLength={100}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm trong 50 dòng…"
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#7992dc]"
              />
            </label>
          </div>
          {selectedReport && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="flex items-center gap-2"><FileSpreadsheet size={15} className="text-emerald-600" />{selectedReport.filename}</span>
              <span>{vnDateTime(selectedReport.saved_at)} · {nf(visibleTotal)} dòng{sheet ? ` · ${sheet}` : ''}</span>
            </div>
          )}
        </section>

        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle size={17} /> {error}
          </div>
        )}

        {!loadingReports && reports.length === 0 ? (
          <div className="rounded-2xl border border-[#e5e9f2] bg-white px-6 py-14 text-center">
            <FileSpreadsheet className="mx-auto mb-3 text-slate-300" size={30} />
            <p className="text-sm text-slate-500">Chưa có dữ liệu Excel.</p>
            <Link to="/export" className="mt-4 inline-flex text-sm font-bold text-[#405bb0] hover:underline">Tải file Excel lên</Link>
          </div>
        ) : loadingRows ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500">
            <LoaderCircle size={18} className="animate-spin" /> Đang tải dữ liệu…
          </div>
        ) : rows.length === 0 && !error ? (
          <div className="rounded-2xl border border-[#e5e9f2] bg-white px-6 py-14 text-center text-sm text-slate-500">
            Báo cáo này không có dòng dữ liệu.
          </div>
        ) : rows.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-[#e5e9f2] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">
              <span>{filteredRows.length} dòng đang hiển thị</span>
              <span>Trang {Math.floor(offset / PAGE_SIZE) + 1} / {Math.max(1, Math.ceil(visibleTotal / PAGE_SIZE))}</span>
            </div>
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-[#f8faff] text-[11px] font-bold text-slate-600">
                  <tr>
                    {!hasGroupedHeaders && (
                      <th className="whitespace-nowrap px-3 py-3">Sheet / dòng</th>
                    )}
                    {columns.map((column) => (
                      <th
                        key={column}
                        className={`min-w-36 whitespace-nowrap px-3 py-3 text-center align-middle ${
                          QC_COLUMN_GROUPS[columnGroups[column]] || 'bg-[#f8faff] text-slate-600'
                        }`}
                      >
                        {String(columnHeaders?.[column] || column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row._id} className="hover:bg-[#f8faff]">
                      {!hasGroupedHeaders && (
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-500">
                          {row.sheetName} · {row.rowNumber}
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={column} className="max-w-64 px-3 py-3 text-slate-700">{String(row.values?.[column] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr><td colSpan={columns.length + (hasGroupedHeaders ? 0 : 1)} className="px-4 py-8 text-center text-slate-500">Không tìm thấy dòng phù hợp trên trang này.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setOffset((current) => Math.max(current - PAGE_SIZE, 0))}
                disabled={offset === 0 || loadingRows}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setOffset((current) => current + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= visibleTotal || loadingRows}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </QcLayout>
  );
}
