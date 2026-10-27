import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, Download, FileSpreadsheet, Filter, LoaderCircle, Search } from 'lucide-react';
import { getReportFileUrl, getReportRows, getReports } from '../AllAPIs';
import QcLayout from '../components/QcLayout';
import { nf, vnDateTime } from '../utils/ultils';

const PAGE_SIZE = 50;
const LOAD_MORE_THRESHOLD = 240;
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
  const navigate = useNavigate();
  const { sheetName: routeSheet = '' } = useParams();
  const requestedId = searchParams.get('job_id') || '';
  const [reports, setReports] = useState([]);
  const [reportId, setReportId] = useState(requestedId);
  const [sheet, setSheet] = useState(routeSheet);
  const [sheets, setSheets] = useState([]);
  const [columnHeaders, setColumnHeaders] = useState(null);
  const [hasGroupedHeaders, setHasGroupedHeaders] = useState(false);
  const [headerRowsCount, setHeaderRowsCount] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [filterDraft, setFilterDraft] = useState('');
  const [activeFilterColumn, setActiveFilterColumn] = useState('');
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const tableScrollRef = useRef(null);
  const nextOffsetRef = useRef(0);
  const queryVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const activeFilterCount = Object.values(filters).filter((value) => value.trim()).length;

  useEffect(() => {
    setSheet(routeSheet);
    setSearch('');
    setFilters({});
    setFilterDraft('');
    setActiveFilterColumn('');
    setColumnHeaders(null);
    setHasGroupedHeaders(false);
    setHeaderRowsCount(0);
  }, [routeSheet]);

  useEffect(() => {
    if (requestedId && requestedId !== reportId) {
      setReportId(requestedId);
      setSheet(routeSheet);
      setSearch('');
      setFilters({});
      setFilterDraft('');
      setActiveFilterColumn('');
      setColumnHeaders(null);
      setHasGroupedHeaders(false);
      setHeaderRowsCount(0);
    }
  }, [requestedId, reportId, routeSheet]);

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
    const queryVersion = queryVersionRef.current + 1;
    queryVersionRef.current = queryVersion;
    nextOffsetRef.current = 0;
    loadingMoreRef.current = false;
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
    setLoadingMore(false);
    setRows([]);
    setTotal(0);
    setColumnHeaders(null);
    setHasGroupedHeaders(false);
    setHeaderRowsCount(0);

    if (!reportId) {
      setLoadingRows(false);
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
          limit: PAGE_SIZE + 1,
          offset: 0,
          signal: controller.signal,
        });
        if (queryVersionRef.current !== queryVersion) return;
        const groupedHeaderRows = result.rows.filter(isQcColumnHeader);
        setColumnHeaders(groupedHeaderRows[0]?.values || null);
        setHasGroupedHeaders(groupedHeaderRows.length > 0);
        setHeaderRowsCount(groupedHeaderRows.length);
        const firstPageRows = result.rows
          .filter((row) => !isQcColumnHeader(row))
          .slice(0, PAGE_SIZE);
        setRows(firstPageRows);
        nextOffsetRef.current = firstPageRows.length + groupedHeaderRows.length;
        setTotal(result.total);
        setSheets(result.sheets);
      } catch (loadError) {
        if (!controller.signal.aborted && queryVersionRef.current === queryVersion) {
          setError(loadError.message);
        }
      } finally {
        if (!controller.signal.aborted && queryVersionRef.current === queryVersion) {
          setLoadingRows(false);
        }
      }
    };
    loadRows();
    return () => controller.abort();
  }, [reportId, sheet]);

  const loadMoreRows = async () => {
    if (
      !reportId ||
      loadingRows ||
      loadingMoreRef.current ||
      rows.length >= visibleTotal
    ) return;

    const queryVersion = queryVersionRef.current;
    const offset = nextOffsetRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await getReportRows({
        reportId,
        sheet,
        limit: PAGE_SIZE,
        offset,
      });
      if (queryVersionRef.current !== queryVersion) return;
      const newRows = result.rows.filter((row) => !isQcColumnHeader(row));
      setRows((currentRows) => [...currentRows, ...newRows]);
      nextOffsetRef.current += result.rows.length;
      setTotal(result.total);
      setSheets(result.sheets);
    } catch (loadError) {
      if (queryVersionRef.current === queryVersion) setError(loadError.message);
    } finally {
      if (queryVersionRef.current === queryVersion) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  };

  const handleTableScroll = (event) => {
    const element = event.currentTarget;
    if (element.scrollHeight - element.scrollTop - element.clientHeight <= LOAD_MORE_THRESHOLD) {
      void loadMoreRows();
    }
  };

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
    return rows.filter((row) => {
      const values = row.values || {};
      const matchesSearch = !query || Object.values(values).some((value) =>
        String(value ?? '').toLocaleLowerCase('vi-VN').includes(query)
      );
      return matchesSearch && Object.entries(filters).every(([column, filter]) =>
        String(values[column] ?? '').toLocaleLowerCase('vi-VN')
          .includes(filter.trim().toLocaleLowerCase('vi-VN'))
      );
    });
  }, [rows, search, filters]);

  const selectReport = (event) => {
    const nextId = event.target.value;
    setReportId(nextId);
    setSearchParams(nextId ? { job_id: nextId } : {});
    setSheet(routeSheet);
    setSearch('');
    setFilters({});
    setFilterDraft('');
    setActiveFilterColumn('');
    setColumnHeaders(null);
    setHasGroupedHeaders(false);
    setHeaderRowsCount(0);
  };

  const toggleColumnFilter = (column) => {
    if (activeFilterColumn === column) {
      setActiveFilterColumn('');
      return;
    }
    setFilterDraft(filters[column] || '');
    setActiveFilterColumn(column);
  };

  const applyColumnFilter = (column) => {
    const value = filterDraft.trim();
    setFilters((current) => {
      const next = { ...current };
      if (value) next[column] = value;
      else delete next[column];
      return next;
    });
    setActiveFilterColumn('');
  };

  const clearColumnFilter = (column) => {
    setFilters((current) => {
      const next = { ...current };
      delete next[column];
      return next;
    });
    setFilterDraft('');
    setActiveFilterColumn('');
  };

  const selectSheet = (event) => {
    const nextSheet = event.target.value;
    const query = reportId ? `?job_id=${encodeURIComponent(reportId)}` : '';
    if (nextSheet === 'Nhu cầu đơn hàng HRC') {
      navigate(`/orders${query}`);
      return;
    }
    navigate(nextSheet
      ? `/sheets/${encodeURIComponent(nextSheet)}${query}`
      : `/data${query}`);
  };

  return (
    <QcLayout>
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#526bb9]">Tra cứu dữ liệu</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1e2944]">{routeSheet || 'Dữ liệu Excel'}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {routeSheet ? `Dữ liệu sheet ${routeSheet} trong báo cáo đã nhập.` : 'Xem các dòng đã nhập theo báo cáo và sheet.'}
            </p>
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
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Tìm trong dữ liệu đã tải</span>
              <Search size={15} className="pointer-events-none absolute bottom-3 left-3 text-slate-400" />
              <input
                value={search}
                maxLength={100}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm trong các dòng đã tải…"
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#7992dc]"
              />
            </label>
          </div>
          {activeFilterCount > 0 && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setFilters({});
                  setFilterDraft('');
                  setActiveFilterColumn('');
                }}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#405bb0] hover:bg-blue-50"
              >
                Xóa {activeFilterCount} bộ lọc
              </button>
            </div>
          )}
          {selectedReport && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="flex items-center gap-2"><FileSpreadsheet size={15} className="text-emerald-600" />{selectedReport.filename}</span>
              <span>{vnDateTime(selectedReport.saved_at)} · {nf(visibleTotal)} dòng{sheet ? ` · ${sheet}` : ''}</span>
            </div>
          )}
        </section>

        {sheets.length > 0 && (
          <nav aria-label="Các sheet trong báo cáo" className="rounded-2xl border border-[#e5e9f2] bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-slate-700">Các sheet trong báo cáo</h2>
              <Link
                to={`/data${reportId ? `?job_id=${encodeURIComponent(reportId)}` : ''}`}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                  !routeSheet ? 'bg-[#405bb0] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả sheet
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {sheets.map((item) => (
                <Link
                  key={item.name}
                  to={`${item.name === 'Nhu cầu đơn hàng HRC' ? '/orders' : `/sheets/${encodeURIComponent(item.name)}`}${reportId ? `?job_id=${encodeURIComponent(reportId)}` : ''}`}
                  aria-current={routeSheet === item.name ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
                    routeSheet === item.name
                      ? 'border-[#405bb0] bg-[#eef3ff] text-[#405bb0]'
                      : 'border-slate-200 text-slate-600 hover:border-[#cbd5eb] hover:bg-[#f8faff]'
                  }`}
                >
                  {item.name}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {nf(item.rowCount)}
                  </span>
                </Link>
              ))}
            </div>
          </nav>
        )}

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
            {routeSheet ? 'Sheet này không có dòng dữ liệu.' : 'Báo cáo này không có dòng dữ liệu.'}
          </div>
        ) : rows.length > 0 ? (
          <section className="overflow-hidden rounded-2xl border border-[#e5e9f2] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-xs text-slate-500 sm:px-5">
              <span>Đang hiển thị {filteredRows.length.toLocaleString('vi-VN')} / {visibleTotal.toLocaleString('vi-VN')} dòng</span>
            </div>
            <div
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="max-h-[75vh] overflow-auto"
            >
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-[#f8faff] text-[11px] font-bold text-slate-600">
                  <tr>
                    {!hasGroupedHeaders && (
                      <th className="whitespace-nowrap px-3 py-3">Sheet / dòng</th>
                    )}
                    {columns.map((column) => (
                      <th
                        key={column}
                        className={`relative min-w-36 whitespace-nowrap px-3 py-3 text-center align-middle ${
                          QC_COLUMN_GROUPS[columnGroups[column]] || 'bg-[#f8faff] text-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{String(columnHeaders?.[column] || column)}</span>
                          <button
                            type="button"
                            aria-label={`Mở bộ lọc cột ${String(columnHeaders?.[column] || column)}`}
                            aria-expanded={activeFilterColumn === column}
                            title={filters[column] ? `Đang lọc: ${filters[column]}` : `Lọc ${String(columnHeaders?.[column] || column)}`}
                            onClick={() => toggleColumnFilter(column)}
                            className={`shrink-0 rounded p-1 transition hover:bg-black/10 ${
                              filters[column] ? 'text-[#263f94]' : 'text-slate-500'
                            }`}
                          >
                            <Filter size={13} />
                          </button>
                        </div>
                        {activeFilterColumn === column && (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              applyColumnFilter(column);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="absolute left-0 top-full z-30 w-60 rounded-lg border border-slate-200 bg-white p-3 text-left font-normal text-slate-700 shadow-xl"
                          >
                            <label className="flex flex-col text-xs font-bold text-slate-700">
                              Lọc cột: {String(columnHeaders?.[column] || column)}
                              <input
                                autoFocus
                                type="search"
                                maxLength={100}
                                aria-label={`Giá trị lọc cho cột ${String(columnHeaders?.[column] || column)}`}
                                value={filterDraft}
                                onChange={(event) => setFilterDraft(event.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Escape') setActiveFilterColumn('');
                                }}
                                placeholder="Nhập nội dung cần tìm…"
                                className="mt-2 h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm font-normal outline-none focus:border-[#7992dc]"
                              />
                            </label>
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => clearColumnFilter(column)}
                                className="rounded-md px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                              >
                                Xóa lọc
                              </button>
                              <button
                                type="submit"
                                className="rounded-md bg-[#405bb0] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#334a98]"
                              >
                                Áp dụng
                              </button>
                            </div>
                          </form>
                        )}
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
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-xs text-slate-500">
                  <LoaderCircle size={15} className="animate-spin" /> Đang tải thêm dòng…
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </QcLayout>
  );
}
