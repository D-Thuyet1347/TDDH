import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Copy,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  RotateCcw,
  Search,
  TableProperties,
} from 'lucide-react';
import { getReportColumnValues, getReportFileUrl, getReportQualitySummary, getReportRows, getReports } from '../AllAPIs';
import QcLayout from '../components/QcLayout';
import ExcelFilterDropdown from '../components/ExcelFilterDropdown';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table } from '../components/ui/table';
import { nf, vnDateTime } from '../utils/ultils';

const PAGE_SIZE = 30000;
const ROW_HEIGHT = 41;
const OVERSCAN = 25;
const LOAD_MORE_THRESHOLD = 240;
const QUALITY_CLASSIFICATIONS = [
  { key: 'Loại 1 || PRIME', label: 'Loại 1 || PRIME' },
  { key: 'Loại 1 || NON_PRIME', label: 'Loại 1 || NON_PRIME' },
  { key: 'Loại 2 || SCRAP', label: 'Loại 2 || SCRAP' },
  { key: 'Loại rỗng —', label: 'Loại rỗng —' },
];
const SKIN_HANDLING_TYPES = [
  { key: 'SKIN', label: 'SKIN' },
  { key: 'SKIN_CUST', label: 'SKIN_CUST' },
];
const QC_COLUMN_GROUPS = {
  'THÔNG TIN CHUNG': 'bg-indigo-50/90 text-indigo-900 border-indigo-100',
  'BỀ MẶT': 'bg-rose-50/90 text-rose-900 border-rose-100',
  'KÍCH THƯỚC': 'bg-blue-50/90 text-blue-900 border-blue-100',
  'CƠ/LÝ/HÓA': 'bg-emerald-50/90 text-emerald-900 border-emerald-100',
  'NGOẠI QUAN': 'bg-purple-50/90 text-purple-900 border-purple-100',
  'GHI CHÚ QC': 'bg-amber-100/90 text-amber-900 border-amber-200',
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
  const [qualitySummary, setQualitySummary] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [columnValues, setColumnValues] = useState({});
  const [sortState, setSortState] = useState(null); // { column: string, direction: 'asc' | 'desc' }
  const [customLimit, setCustomLimit] = useState(PAGE_SIZE);
  const [limitInput, setLimitInput] = useState(String(PAGE_SIZE));
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const tableScrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const nextOffsetRef = useRef(0);
  const queryVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const updateViewport = () => {
      if (tableScrollRef.current) {
        setViewportHeight(tableScrollRef.current.clientHeight || 600);
      }
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((val) => {
      if (Array.isArray(val)) return val.length > 0;
      return Boolean(String(val ?? '').trim());
    }).length,
    [filters]
  );

  const copyHandlingIds = async (type) => {
    const ids = qualitySummary?.ids?.[type] || [];
    if (!ids.length) {
      setCopyMessage(`Không có ID GỐC cho ${type}.`);
      return;
    }

    try {
      await navigator.clipboard.writeText(ids.join('\n'));
      setCopyMessage(`Đã sao chép ${nf(ids.length)} ID GỐC của ${type}.`);
    } catch (copyError) {
      setCopyMessage(`Không thể sao chép ID: ${copyError.message}`);
    }
  };

  useEffect(() => {
    setSheet(routeSheet);
    setSearch('');
    setFilters({});
    setSortState(null);
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
      setSortState(null);
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
    setQualitySummary(null);
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
        getReportQualitySummary({ reportId, signal: controller.signal })
          .then((summary) => {
            if (queryVersionRef.current === queryVersion) {
              setQualitySummary(summary);
            }
          })
          .catch((summaryError) => {
            if (!controller.signal.aborted && queryVersionRef.current === queryVersion) {
              setError(summaryError.message);
            }
          });
        const result = await getReportRows({
          reportId,
          sheet,
          limit: customLimit,
          offset: 0,
          signal: controller.signal,
        });
        if (queryVersionRef.current !== queryVersion) return;
        const groupedHeaderRows = result.rows.filter(isQcColumnHeader);
        if (groupedHeaderRows.length > 0) {
          setColumnHeaders(groupedHeaderRows[0]?.values || null);
          setHasGroupedHeaders(true);
          setHeaderRowsCount(groupedHeaderRows.length);
        }
        const dataRows = result.rows.filter((row) => !isQcColumnHeader(row));
        setRows(dataRows);
        nextOffsetRef.current = dataRows.length + (groupedHeaderRows.length || 0);
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
  }, [reportId, sheet, customLimit]);

  const handleApplyLimit = (val) => {
    const raw = val !== undefined ? val : limitInput;
    const num = Math.min(200000, Math.max(1, Number.parseInt(raw, 10) || 30000));
    setCustomLimit(num);
    setLimitInput(String(num));
  };

  useEffect(() => {
    if (!reportId) {
      setColumnValues({});
      return undefined;
    }
    const controller = new AbortController();
    getReportColumnValues({ reportId, sheet, signal: controller.signal })
      .then((res) => {
        if (res?.columns) {
          setColumnValues(res.columns);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('Lỗi tải danh sách giá trị bộ lọc:', err.message);
        }
      });
    return () => controller.abort();
  }, [reportId, sheet]);

  const loadAllRows = async () => {
    if (!reportId || loadingRows || loadingMoreRef.current) return;
    const queryVersion = queryVersionRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const targetLimit = Math.max(PAGE_SIZE, visibleTotal || 0, customLimit);
      setCustomLimit(targetLimit);
      setLimitInput(String(targetLimit));
      const result = await getReportRows({
        reportId,
        sheet,
        search,
        filters,
        limit: targetLimit,
        offset: 0,
      });
      if (queryVersionRef.current !== queryVersion) return;
      const groupedHeaderRows = result.rows.filter(isQcColumnHeader);
      if (groupedHeaderRows.length > 0) {
        setColumnHeaders(groupedHeaderRows[0]?.values || null);
        setHasGroupedHeaders(true);
        setHeaderRowsCount(groupedHeaderRows.length);
      }
      const dataRows = result.rows.filter((row) => !isQcColumnHeader(row));
      setRows(dataRows);
      nextOffsetRef.current = dataRows.length + (groupedHeaderRows.length || 0);
      setTotal(result.total);
    } catch (loadError) {
      if (queryVersionRef.current === queryVersion) setError(loadError.message);
    } finally {
      if (queryVersionRef.current === queryVersion) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  };

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
        search,
        filters,
        limit: customLimit || PAGE_SIZE,
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
    setScrollTop(element.scrollTop);
    if (
      rows.length < visibleTotal &&
      element.scrollHeight - element.scrollTop - element.clientHeight <= LOAD_MORE_THRESHOLD
    ) {
      void loadMoreRows();
    }
  };

  const selectedReport = reports.find((report) => report.job_id === reportId);
  const columns = useMemo(() => {
    const fromRows = rows.flatMap((row) => Object.keys(row.values || {}));
    const fromColumnValues = Object.keys(columnValues || {});
    return [...new Set([...fromRows, ...fromColumnValues])];
  }, [rows, columnValues]);
  const columnGroups = useMemo(() => {
    let currentGroup = '';
    return columns.reduce((groups, column) => {
      if (QC_COLUMN_GROUPS[column]) currentGroup = column;
      groups[column] = currentGroup;
      return groups;
    }, {});
  }, [columns]);
  const visibleTotal = Math.max(0, total - headerRowsCount);

  // Excel-style filter handlers
  const handleApplyFilter = (columnKey, selectedValues) => {
    setFilters((current) => {
      const next = { ...current };
      if (!selectedValues || (Array.isArray(selectedValues) && selectedValues.length === 0)) {
        delete next[columnKey];
      } else {
        next[columnKey] = selectedValues;
      }
      return next;
    });
  };

  const handleClearFilter = (columnKey) => {
    setFilters((current) => {
      const next = { ...current };
      delete next[columnKey];
      return next;
    });
  };

  const handleSort = (columnKey, direction) => {
    setSortState({ column: columnKey, direction });
  };

  // Filtered and sorted rows
  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    const result = rows.filter((row) => {
      const values = row.values || {};
      const matchesSearch = !query || Object.values(values).some((value) =>
        String(value ?? '').toLocaleLowerCase('vi-VN').includes(query)
      );

      const matchesFilters = Object.entries(filters).every(([column, filter]) => {
        if (!filter) return true;
        const cellRaw = values[column];
        const cellStr = cellRaw === null || cellRaw === undefined ? '' : String(cellRaw).trim();

        if (Array.isArray(filter)) {
          if (filter.length === 0) return true;
          if (filter.includes('__NO_MATCH__')) return false;

          return filter.some((f) => {
            if (f === '__BLANK__' || f === '' || f === '(Trống)') {
              return !cellStr || cellStr === '—' || cellStr === '-';
            }
            return cellStr.toLocaleLowerCase('vi-VN') === String(f).trim().toLocaleLowerCase('vi-VN');
          });
        }

        return cellStr.toLocaleLowerCase('vi-VN').includes(String(filter).trim().toLocaleLowerCase('vi-VN'));
      });

      return matchesSearch && matchesFilters;
    });

    if (sortState?.column) {
      const { column, direction } = sortState;
      result.sort((a, b) => {
        const valA = a.values?.[column];
        const valB = b.values?.[column];
        const strA = valA === null || valA === undefined ? '' : String(valA).trim();
        const strB = valB === null || valB === undefined ? '' : String(valB).trim();
        const numA = Number(strA);
        const numB = Number(strB);
        let cmp = 0;
        if (!Number.isNaN(numA) && !Number.isNaN(numB) && strA !== '' && strB !== '') {
          cmp = numA - numB;
        } else {
          cmp = strA.localeCompare(strB, 'vi-VN', { numeric: true, sensitivity: 'base' });
        }
        return direction === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  }, [rows, search, filters, sortState]);

  const totalFilteredCount = filteredRows.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / ROW_HEIGHT) + 2 * OVERSCAN;
  const endIndex = Math.min(totalFilteredCount, startIndex + visibleCount);

  const visibleRows = useMemo(() => {
    if (totalFilteredCount <= 120) return filteredRows;
    return filteredRows.slice(startIndex, endIndex);
  }, [filteredRows, startIndex, endIndex, totalFilteredCount]);

  const topSpacerHeight = totalFilteredCount <= 120 ? 0 : startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = totalFilteredCount <= 120 ? 0 : Math.max(0, (totalFilteredCount - endIndex) * ROW_HEIGHT);

  const selectReport = (event) => {
    const nextId = event.target.value;
    setReportId(nextId);
    setSearchParams(nextId ? { job_id: nextId } : {});
    setSheet(routeSheet);
    setSearch('');
    setFilters({});
    setSortState(null);
    setColumnHeaders(null);
    setHasGroupedHeaders(false);
    setHeaderRowsCount(0);
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
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
              <TableProperties size={14} className="text-indigo-600" /> Không gian dữ liệu Excel QC
            </div>
            <h1 className="text-[clamp(28px,3vw,36px)] font-extrabold leading-tight tracking-tight text-slate-900">
              {routeSheet || 'Dữ liệu Excel'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {routeSheet ? `Dữ liệu sheet ${routeSheet} trong báo cáo đã nhập.` : 'Xem và lọc chi tiết các dòng dữ liệu Excel.'}
            </p>
          </div>
          {selectedReport && (
            <Button asChild variant="outline" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50">
              <a href={getReportFileUrl(selectedReport.job_id)}>
                <Download size={15} /> Tải file gốc
              </a>
            </Button>
          )}
        </header>

        {location.state?.message && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-xs font-semibold text-emerald-800">
            {location.state.message}
          </div>
        )}

        {/* Filter controls */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-[minmax(0,1.8fr)_minmax(150px,1fr)_minmax(180px,1fr)_minmax(210px,1.2fr)]">
            <label className="min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Báo cáo</span>
              <Select
                value={reportId}
                onChange={selectReport}
                disabled={loadingReports || reports.length === 0}
                className="h-10 w-full"
              >
                <option value="">{loadingReports ? 'Đang tải báo cáo…' : 'Chọn báo cáo'}</option>
                {reports.map((report) => (
                  <option key={report.job_id} value={report.job_id}>{report.filename}</option>
                ))}
              </Select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Sheet dữ liệu</span>
              <Select
                value={sheet}
                onChange={selectSheet}
                disabled={!reportId || loadingRows}
                className="h-10 w-full"
              >
                <option value="">Tất cả sheet</option>
                {sheets.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              </Select>
            </label>
            <label className="relative">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Tìm kiếm nhanh</span>
              <Search size={15} className="pointer-events-none absolute bottom-3 left-3 text-slate-400" />
              <Input
                value={search}
                maxLength={100}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm trong dữ liệu…"
                className="h-10 w-full pl-9 pr-3 text-xs"
              />
            </label>
            <label>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Giới hạn đọc dữ liệu</span>
                <div className="flex items-center gap-1">
                  {[5000, 10000, 30000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyLimit(preset)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                        customLimit === preset
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={200000}
                  step={1000}
                  value={limitInput}
                  onChange={(event) => setLimitInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleApplyLimit();
                  }}
                  placeholder="VD: 30000"
                  className="h-10 w-full text-xs font-semibold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyLimit()}
                  disabled={loadingRows || Number(limitInput) === customLimit}
                  className="h-10 shrink-0 rounded-xl border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  Áp dụng
                </Button>
              </div>
            </label>
          </div>

          {activeFilterCount > 0 && (
            <div className="mt-3.5 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilters({})}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border-indigo-200 bg-indigo-50/70 px-3.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100/80"
              >
                <RotateCcw size={13} />
                Xóa {activeFilterCount} bộ lọc
              </Button>
            </div>
          )}

          {selectedReport && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-2 text-slate-600 font-semibold">
                <FileSpreadsheet size={15} className="text-emerald-600" />
                {selectedReport.filename}
              </span>
              <span>{vnDateTime(selectedReport.saved_at)} · {nf(visibleTotal)} dòng{sheet ? ` · ${sheet}` : ''}</span>
            </div>
          )}
        </Card>

        {error && (
          <Alert variant="destructive" className="flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold">
            <AlertCircle size={18} /> {error}
          </Alert>
        )}

        {/* Quality classification summary */}
        {!loadingRows && qualitySummary && (
          <>
            <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-900">TỔNG CẤP CHẤT LƯỢNG</p>
                  <p className="mt-0.5 text-xs text-slate-500">Phân loại trên toàn bộ file</p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Tổng dữ liệu: <strong className="text-slate-900">{nf(qualitySummary.totalRows)}</strong> dòng
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {QUALITY_CLASSIFICATIONS.map(({ key, label }) => (
                  <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">
                      {nf(qualitySummary.counts[key] || 0)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-indigo-600">
                      {qualitySummary.totalRows
                        ? ((qualitySummary.counts[key] / qualitySummary.totalRows) * 100)
                          .toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '0,00'}%
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
              <div className="mb-4">
                <p className="text-sm font-bold text-slate-900">SAO CHÉP ID GỐC THEO HƯỚNG XỬ LÝ</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Lọc theo hướng xử lý; mỗi ID được sao chép một lần, mỗi dòng một ID.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {SKIN_HANDLING_TYPES.map(({ key, label }) => (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    onClick={() => void copyHandlingIds(key)}
                    disabled={!qualitySummary.ids?.[key]?.length}
                    className="inline-flex h-10 items-center gap-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy size={15} />
                    Sao chép ID GỐC {label} ({nf(qualitySummary.ids?.[key]?.length || 0)})
                  </Button>
                ))}
              </div>
              {copyMessage && (
                <p role="status" className="mt-3 text-xs font-semibold text-emerald-700">{copyMessage}</p>
              )}
            </Card>
          </>
        )}

        {/* Data Table */}
        {!loadingReports && reports.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <FileSpreadsheet className="mx-auto mb-3 text-slate-300" size={32} />
            <p className="text-sm font-semibold text-slate-600">Chưa có dữ liệu Excel.</p>
            <Link to="/export" className="mt-3 inline-flex text-xs font-bold text-indigo-600 hover:underline">
              Tải file Excel lên ngay →
            </Link>
          </div>
        ) : loadingRows ? (
          <div className="flex min-h-56 items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <LoaderCircle size={18} className="animate-spin text-indigo-600" /> Đang tải dữ liệu…
          </div>
        ) : rows.length === 0 && !error ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-xs font-medium text-slate-500">
            {routeSheet ? 'Sheet này không có dòng dữ liệu.' : 'Báo cáo này không có dòng dữ liệu.'}
          </div>
        ) : rows.length > 0 ? (
          <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 text-xs font-semibold text-slate-500 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Đang hiển thị <strong className="text-slate-900">{filteredRows.length.toLocaleString('vi-VN')}</strong> / {visibleTotal.toLocaleString('vi-VN')} dòng
                </span>
                {rows.length < visibleTotal && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadAllRows}
                    disabled={loadingMore || loadingRows}
                    className="h-7 rounded-lg border-indigo-200 bg-indigo-50/80 px-2.5 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    {loadingMore ? 'Đang tải…' : `Tải tất cả ${visibleTotal.toLocaleString('vi-VN')} dòng`}
                  </Button>
                )}
              </div>
              {sortState?.column && (
                <span className="text-[11px] font-medium text-indigo-600">
                  Đang sắp xếp: {columnHeaders?.[sortState.column] || sortState.column} ({sortState.direction === 'asc' ? 'A → Z' : 'Z → A'})
                </span>
              )}
            </div>

            <div
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="max-h-[75vh] overflow-auto"
            >
              <Table wrapperClassName="contents" className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="sticky top-0 z-20 shadow-xs">
                  <tr>
                    {!hasGroupedHeaders && (
                      <th className="whitespace-nowrap px-3 py-3 border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                        Sheet / dòng
                      </th>
                    )}
                    {columns.map((column) => (
                      <th
                        key={column}
                        className={`border-b border-r border-slate-200/80 min-w-36 whitespace-nowrap px-3 py-3 text-center align-middle font-bold ${
                          QC_COLUMN_GROUPS[columnGroups[column]] || 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="leading-4">{String(columnHeaders?.[column] || column)}</span>
                          <ExcelFilterDropdown
                            columnKey={column}
                            title={String(columnHeaders?.[column] || column)}
                            rows={rows}
                            allColumnValues={columnValues[column] || (columnHeaders?.[column] ? columnValues[columnHeaders[column]] : undefined)}
                            activeFilter={filters[column]}
                            sortState={sortState}
                            onApplyFilter={handleApplyFilter}
                            onClearFilter={handleClearFilter}
                            onSort={handleSort}
                          />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topSpacerHeight > 0 && (
                    <tr style={{ height: `${topSpacerHeight}px` }}>
                      <td colSpan={columns.length + (hasGroupedHeaders ? 0 : 1)} className="p-0 border-0" />
                    </tr>
                  )}
                  {visibleRows.map((row) => (
                    <tr key={row._id} className="transition-colors hover:bg-indigo-50/30">
                      {!hasGroupedHeaders && (
                        <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-500 border-r border-slate-100">
                          {row.sheetName} · {row.rowNumber}
                        </td>
                      )}
                      {columns.map((column) => (
                        <td key={column} className="max-w-64 px-3 py-2.5 text-slate-800 border-r border-slate-100">
                          <span className="block truncate" title={String(row.values?.[column] ?? '—')}>
                            {String(row.values?.[column] ?? '—')}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  {bottomSpacerHeight > 0 && (
                    <tr style={{ height: `${bottomSpacerHeight}px` }}>
                      <td colSpan={columns.length + (hasGroupedHeaders ? 0 : 1)} className="p-0 border-0" />
                    </tr>
                  )}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + (hasGroupedHeaders ? 0 : 1)} className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                        Không tìm thấy dòng phù hợp với bộ lọc đã chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
              {loadingMore && (
                <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-3.5 text-xs font-semibold text-slate-500 bg-slate-50/50">
                  <LoaderCircle size={16} className="animate-spin text-indigo-600" /> Đang tải thêm dòng…
                </div>
              )}
            </div>
          </Card>
        ) : null}
      </div>
    </QcLayout>
  );
}
